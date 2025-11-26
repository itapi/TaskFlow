<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

try {
    require_once __DIR__ . '/core/BaseAPI.php';
    
    // Simulate the uploads endpoint behavior
    $conn = getDBConnection();
    
    if (!$conn) {
        throw new Exception('Database connection failed');
    }
    
    // Test the exact query from getMagiskModules
    $stmt = $conn->prepare("
        SELECT 
            id,
            original_name,
            file_name,
            file_size,
            status,
            uploaded_at,
            updated_at
        FROM magisk_modules 
        ORDER BY uploaded_at DESC
    ");
    
    if (!$stmt) {
        throw new Exception('Prepare failed: ' . $conn->error);
    }
    
    $stmt->execute();
    $result = $stmt->get_result();
    $modules = $result->fetch_all(MYSQLI_ASSOC);
    
    // Format the data like the real function
    $formattedModules = array_map(function($module) {
        return [
            'id' => $module['id'],
            'name' => $module['original_name'],
            'size' => formatFileSize($module['file_size']),
            'status' => $module['status'],
            'date' => formatDate($module['uploaded_at']),
            'updated_date' => formatDate($module['updated_at'] ?? $module['uploaded_at'])
        ];
    }, $modules);
    
    echo json_encode([
        'success' => true,
        'modules' => $formattedModules,
        'total' => count($formattedModules),
        'raw_modules' => $modules // Include raw data for debugging
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
} finally {
    if (isset($conn)) {
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
    $date = new DateTime($dateString);
    return $date->format('d/m/Y H:i');
}
?>