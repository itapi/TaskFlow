<?php
require_once __DIR__ . '/../core/BaseAPI.php';
require_once __DIR__ . '/../core/APIResponse.php';

// Get the sub-path (e.g., magisk-module from /api/upload/magisk-module)
$fullPath = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$pathSegments = explode('/', trim($fullPath, '/'));
$uploadIndex = array_search('upload', $pathSegments);
$uploadType = $pathSegments[$uploadIndex + 1] ?? '';

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'POST':
        handleUpload($uploadType);
        break;
    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Method not allowed']);
}

function handleUpload($uploadType) {
    try {
        switch ($uploadType) {
            case 'magisk-module':
                uploadMagiskModule();
                break;
            case 'xposed-module':
                uploadXposedModule();
                break;
            case 'required-app':
                uploadRequiredApp();
                break;
            default:
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Invalid upload type']);
                return;
        }
    } catch (Exception $e) {
        error_log("Upload error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Server error occurred']);
    }
}

function uploadMagiskModule() {
    $conn = getDBConnection();
    
    if (!$conn) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Database connection failed']);
        return;
    }
    
    // Get JSON input for base64 upload
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['file_data']) || !isset($input['file_name'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'No file data provided']);
        closeDBConnection($conn);
        return;
    }
    
    // Extract file info from input
    $fileName = $input['file_name'];
    $fileSize = $input['file_size'] ?? 0;
    $fileType = $input['file_type'] ?? 'application/zip';
    $base64Data = $input['file_data'];
    $customPath = $input['upload_path'] ?? null; // Optional custom upload path
    
    // Validate base64 data
    if (strpos($base64Data, 'data:') === 0) {
        $base64Data = substr($base64Data, strpos($base64Data, ',') + 1);
    }
    
    $fileData = base64_decode($base64Data);
    if ($fileData === false) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid base64 data']);
        closeDBConnection($conn);
        return;
    }
    
    // Create temporary file for processing
    $tempFile = tempnam(sys_get_temp_dir(), 'magisk_upload_');
    if (file_put_contents($tempFile, $fileData) === false) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to create temporary file']);
        closeDBConnection($conn);
        return;
    }
    
    // Create file object for compatibility with existing validation
    $file = [
        'name' => $fileName,
        'size' => $fileSize,
        'type' => $fileType,
        'tmp_name' => $tempFile
    ];
    
    // Validate file type
    $allowedTypes = ['application/zip', 'application/x-zip-compressed'];
    $fileInfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($fileInfo, $file['tmp_name']);
    finfo_close($fileInfo);
    
    if (!in_array($mimeType, $allowedTypes) && !str_ends_with(strtolower($file['name']), '.zip')) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Only ZIP files are allowed']);
        closeDBConnection($conn);
        return;
    }
    
    // Validate file size (50MB max)
    $maxSize = 50 * 1024 * 1024; // 50MB in bytes
    if ($file['size'] > $maxSize) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'File size exceeds 50MB limit']);
        closeDBConnection($conn);
        return;
    }
    
    try {
        // Extract and parse module.prop from ZIP
        $moduleData = extractModulePropertiesFromZip($file['tmp_name']);
        
        if (!$moduleData) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Invalid Magisk module - module.prop not found or invalid']);
            closeDBConnection($conn);
            return;
        }
        
        // Determine upload directory - use custom path if provided, otherwise default
        $uploadDir = $customPath ? validateAndSanitizePath($customPath) : '../uploads/magisk-modules/';

        if (!$uploadDir) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Invalid upload path provided']);
            closeDBConnection($conn);
            return;
        }

        // Create uploads directory if it doesn't exist
        if (!is_dir($uploadDir)) {
            if (!mkdir($uploadDir, 0755, true)) {
                http_response_code(500);
                echo json_encode(['success' => false, 'error' => 'Failed to create upload directory']);
                closeDBConnection($conn);
                return;
            }
        }
        
        // Generate unique filename using module ID
        $fileExtension = pathinfo($file['name'], PATHINFO_EXTENSION);
        $fileName = $moduleData['id'] . '_v' . $moduleData['version'] . '.' . $fileExtension;
        $filePath = $uploadDir . $fileName;
        
        // Move temporary file to final location
        if (!rename($file['tmp_name'], $filePath)) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Failed to save file']);
            if (file_exists($file['tmp_name'])) {
                unlink($file['tmp_name']);
            }
            closeDBConnection($conn);
            return;
        }
        
        // Check if module already exists
        $stmt = $conn->prepare("SELECT id FROM magisk_modules WHERE module_name = ?");
        $stmt->bind_param("s", $moduleData['id']);
        $stmt->execute();
        $result = $stmt->get_result();
        $existingModule = $result->fetch_assoc();
        
        if ($existingModule) {
            // Update existing module
            $stmt = $conn->prepare("
                UPDATE magisk_modules 
                SET version = ?, download_url = ?, description = ?, updated_at = CURRENT_TIMESTAMP 
                WHERE module_name = ?
            ");
            $downloadUrl = generateDownloadUrl($uploadDir, $fileName);
            $stmt->bind_param("ssss", 
                $moduleData['version'],
                $downloadUrl,
                $moduleData['description'],
                $moduleData['id']
            );
            $stmt->execute();
            $moduleId = $existingModule['id'];
            $action = 'updated';
        } else {
            // Insert new module
            $stmt = $conn->prepare("
                INSERT INTO magisk_modules (
                    module_name, 
                    version, 
                    download_url, 
                    client_level_id, 
                    description,
                    created_at
                ) VALUES (?, ?, ?, 1, ?, CURRENT_TIMESTAMP)
            ");
            $downloadUrl = generateDownloadUrl($uploadDir, $fileName);
            $stmt->bind_param("ssss", 
                $moduleData['id'],
                $moduleData['version'],
                $downloadUrl,
                $moduleData['description']
            );
            $stmt->execute();
            $moduleId = $conn->insert_id;
            $action = 'created';
        }
        
        echo json_encode([
            'success' => true,
            'message' => "Magisk module {$action} successfully",
            'module_id' => $moduleId,
            'module_data' => $moduleData,
            'action' => $action
        ]);
        
    } catch (Exception $e) {
        // Cleanup files on error
        if (isset($filePath) && file_exists($filePath)) {
            unlink($filePath);
        }
        if (isset($file['tmp_name']) && file_exists($file['tmp_name'])) {
            unlink($file['tmp_name']);
        }
        
        error_log("Upload error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Upload processing failed: ' . $e->getMessage()]);
    } finally {
        closeDBConnection($conn);
    }
}

function uploadXposedModule() {
    // Similar logic to Magisk modules but for APK files
    
    if (!isset($_FILES['xposed_module']) || $_FILES['xposed_module']['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'No file uploaded or upload error']);
        return;
    }
    
    $file = $_FILES['xposed_module'];
    
    // Validate APK file
    if (!str_ends_with(strtolower($file['name']), '.apk')) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Only APK files are allowed']);
        return;
    }
    
    // Implementation similar to Magisk module upload...
    echo json_encode(['success' => true, 'message' => 'Xposed module upload functionality to be implemented']);
}

function uploadRequiredApp() {
    // Similar logic to Xposed modules
    echo json_encode(['success' => true, 'message' => 'Required app upload functionality to be implemented']);
}

function extractModulePropertiesFromZip($zipPath) {
    $zip = new ZipArchive();
    $result = $zip->open($zipPath);
    
    if ($result !== TRUE) {
        return false;
    }
    
    // Look for module.prop in the root of the ZIP
    $modulePropContent = $zip->getFromName('module.prop');
    
    if ($modulePropContent === false) {
        // Try looking in subdirectories (sometimes modules are packaged with a folder)
        for ($i = 0; $i < $zip->numFiles; $i++) {
            $fileName = $zip->getNameIndex($i);
            if (basename($fileName) === 'module.prop') {
                $modulePropContent = $zip->getFromIndex($i);
                break;
            }
        }
    }
    
    $zip->close();
    
    if ($modulePropContent === false) {
        return false;
    }
    
    return parseModuleProperties($modulePropContent);
}

function parseModuleProperties($content) {
    $properties = [
        'id' => '',
        'name' => '',
        'version' => '',
        'versionCode' => '',
        'author' => '',
        'description' => ''
    ];
    
    $lines = explode("\n", $content);
    
    foreach ($lines as $line) {
        $line = trim($line);
        
        // Skip empty lines and comments
        if (empty($line) || $line[0] === '#') {
            continue;
        }
        
        // Parse key=value pairs
        if (strpos($line, '=') !== false) {
            list($key, $value) = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value);
            
            if (array_key_exists($key, $properties)) {
                $properties[$key] = $value;
            }
        }
    }
    
    // Validate required fields
    if (empty($properties['id']) || empty($properties['name'])) {
        return false;
    }
    
    // Use name as fallback for missing description
    if (empty($properties['description'])) {
        $properties['description'] = $properties['name'];
    }
    
    return $properties;
}

function formatFileSize($bytes) {
    if ($bytes === 0) return '0 Bytes';
    $k = 1024;
    $sizes = ['Bytes', 'KB', 'MB', 'GB'];
    $i = floor(log($bytes) / log($k));
    return round($bytes / pow($k, $i), 2) . ' ' . $sizes[$i];
}

function validateAndSanitizePath($path) {
    // Remove any potential directory traversal attempts beyond allowed directories
    $path = str_replace(['../', '..\\', './'], '', $path);

    // Define allowed base directories
    $allowedBases = ['../uploads/', '../iFilter/'];
    $isValidBase = false;

    // Check if path starts with any allowed base, or prepare it to
    foreach ($allowedBases as $base) {
        if (str_starts_with($path, $base)) {
            $isValidBase = true;
            break;
        }
    }

    // If no valid base found, determine appropriate base based on path content
    if (!$isValidBase) {
        if (str_starts_with($path, 'iFilter/') || str_contains($path, 'iFilter')) {
            $path = '../iFilter/' . ltrim(str_replace('iFilter/', '', $path), '/');
        } else {
            $path = '../uploads/' . ltrim($path, '/');
        }
    }

    // Ensure path ends with slash
    if (!str_ends_with($path, '/')) {
        $path .= '/';
    }

    // Validate that path contains only safe characters
    if (!preg_match('/^[a-zA-Z0-9\/\-_.]+$/', $path)) {
        return false;
    }

    // Final security check - ensure we're only in allowed directories
    if (!str_starts_with($path, '../uploads/') && !str_starts_with($path, '../iFilter/')) {
        return false;
    }

    return $path;
}

function generateDownloadUrl($uploadDir, $fileName) {
    // Convert physical path to URL path
    $webPath = str_replace('../', '/', $uploadDir);

    // Handle different base directories appropriately
    if (str_contains($uploadDir, '../iFilter/')) {
        // For iFilter directory, use /iFilter as web path
        if (!str_starts_with($webPath, '/iFilter/')) {
            $webPath = '/iFilter' . $webPath;
        }
    } else {
        // For uploads directory, use /iFilterDashboard as web path
        if (!str_starts_with($webPath, '/iFilterDashboard/')) {
            $webPath = '/iFilterDashboard' . $webPath;
        }
    }

    return $webPath . $fileName;
}

// Note: Using existing magisk_modules table structure
?>