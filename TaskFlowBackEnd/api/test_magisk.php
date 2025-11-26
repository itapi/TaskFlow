<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

try {
    require_once __DIR__ . '/core/BaseAPI.php';
    
    // Test database connection
    $conn = getDBConnection();
    
    if (!$conn) {
        throw new Exception('Failed to connect to database');
    }
    
    // Check if magisk_modules table exists
    $result = $conn->query("SHOW TABLES LIKE 'magisk_modules'");
    $tableExists = $result->num_rows > 0;
    
    if (!$tableExists) {
        // Create the table
        $sql = "CREATE TABLE magisk_modules (
            id INT AUTO_INCREMENT PRIMARY KEY,
            original_name VARCHAR(255) NOT NULL,
            file_name VARCHAR(255) NOT NULL,
            file_path VARCHAR(500) NOT NULL,
            file_size BIGINT NOT NULL,
            mime_type VARCHAR(100) NOT NULL,
            status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
            uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_status (status),
            INDEX idx_uploaded_at (uploaded_at)
        )";
        
        if (!$conn->query($sql)) {
            throw new Exception('Failed to create magisk_modules table: ' . $conn->error);
        }
    }
    
    // Test a simple select
    $result = $conn->query("SELECT COUNT(*) as count FROM magisk_modules");
    $moduleCount = $result->fetch_assoc()['count'];
    
    echo json_encode([
        'success' => true,
        'message' => 'Magisk modules setup successful!',
        'table_existed' => $tableExists,
        'module_count' => $moduleCount,
        'mysql_version' => $conn->server_info
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'current_dir' => __DIR__
    ]);
}
?>