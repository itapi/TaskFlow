<?php
require_once __DIR__ . '/../core/BaseAPI.php';
require_once __DIR__ . '/../core/APIResponse.php';

// Get the sub-path (e.g., magisk-modules from /api/uploads/magisk-modules)
$fullPath = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$pathSegments = explode('/', trim($fullPath, '/'));
$uploadsIndex = array_search('uploads', $pathSegments);
$uploadType = $pathSegments[$uploadsIndex + 1] ?? '';

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        getUploads($uploadType);
        break;
    case 'DELETE':
        deleteUpload($uploadType);
        break;
    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Method not allowed']);
}

function getUploads($uploadType) {
    try {
        switch ($uploadType) {
            case 'magisk-modules':
                getMagiskModules();
                break;
            case 'xposed-modules':
                getXposedModules();
                break;
            case 'required-apps':
                getRequiredApps();
                break;
            default:
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Invalid upload type']);
                return;
        }
    } catch (Exception $e) {
        error_log("Get uploads error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Server error occurred']);
    }
}

function getMagiskModules() {
    $conn = getDBConnection();
    
    if (!$conn) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Database connection failed']);
        return;
    }
    
    try {
        $stmt = $conn->prepare("
            SELECT 
                id,
                module_name,
                version,
                download_url,
                client_level_id,
                description,
                created_at,
                updated_at,
                reboot_required,
                is_active
            FROM magisk_modules 
            ORDER BY created_at DESC
        ");
        
        $stmt->execute();
        $result = $stmt->get_result();
        $modules = $result->fetch_all(MYSQLI_ASSOC);
        
        // Format the data for frontend
        $formattedModules = array_map(function($module) {
            return [
                'id' => $module['id'],
                'name' => $module['module_name'] . ' v' . $module['version'],
                'size' => 'N/A', // File size not stored in this table structure
                'status' => $module['is_active'] ? 'approved' : 'pending',
                'date' => formatDate($module['created_at']),
                'updated_date' => formatDate($module['updated_at']),
                'download_url' => $module['download_url'],
                'description' => $module['description'],
                'reboot_required' => $module['reboot_required']
            ];
        }, $modules);
        
        echo json_encode([
            'success' => true,
            'modules' => $formattedModules,
            'total' => count($formattedModules)
        ]);
        
    } catch (Exception $e) {
        error_log("Database error in getMagiskModules: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'success' => false, 
            'error' => 'Database error occurred: ' . $e->getMessage(),
            'debug' => [
                'function' => 'getMagiskModules',
                'trace' => $e->getTraceAsString()
            ]
        ]);
    } finally {
        closeDBConnection($conn);
    }
}

function getXposedModules() {
    // Placeholder for Xposed modules
    echo json_encode([
        'success' => true,
        'modules' => [],
        'total' => 0,
        'message' => 'Xposed modules functionality to be implemented'
    ]);
}

function getRequiredApps() {
    // Placeholder for Required apps
    echo json_encode([
        'success' => true,
        'modules' => [],
        'total' => 0,
        'message' => 'Required apps functionality to be implemented'
    ]);
}

function deleteUpload($uploadType) {
    $input = json_decode(file_get_contents('php://input'), true);
    $id = $input['id'] ?? null;
    
    if (!$id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'ID is required']);
        return;
    }
    
    switch ($uploadType) {
        case 'magisk-modules':
            deleteMagiskModule($id);
            break;
        default:
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Invalid upload type']);
            return;
    }
}

function deleteMagiskModule($id) {
    $conn = getDBConnection();
    
    if (!$conn) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Database connection failed']);
        return;
    }
    
    try {
        // First get the download URL (to delete the file)
        $stmt = $conn->prepare("SELECT download_url FROM magisk_modules WHERE id = ?");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $result = $stmt->get_result();
        $module = $result->fetch_assoc();
        
        if (!$module) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Module not found']);
            return;
        }
        
        // Delete from database
        $stmt = $conn->prepare("DELETE FROM magisk_modules WHERE id = ?");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        
        // Delete file if exists (convert URL to file path)
        if ($module['download_url']) {
            $filePath = '../uploads/magisk-modules/' . basename($module['download_url']);
            if (file_exists($filePath)) {
                unlink($filePath);
            }
        }
        
        echo json_encode([
            'success' => true,
            'message' => 'Module deleted successfully'
        ]);
        
    } catch (Exception $e) {
        error_log("Database error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Database error occurred']);
    } finally {
        closeDBConnection($conn);
    }
}

function formatFileSize($bytes) {
    if ($bytes === 0) return '0 Bytes';
    $k = 1024;
    $sizes = ['Bytes', 'KB', 'MB', 'GB'];
    $i = floor(log($bytes) / log($k));
    return round($bytes / pow($k, $i), 2) . ' ' . $sizes[$i];
}

function formatDate($dateString) {
    if (!$dateString) return 'N/A';
    try {
        $date = new DateTime($dateString);
        return $date->format('d/m/Y H:i');
    } catch (Exception $e) {
        error_log("formatDate error for '$dateString': " . $e->getMessage());
        return 'Invalid Date';
    }
}
?>