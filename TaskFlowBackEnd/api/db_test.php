<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

try {
    // Try to find and load dbconfig.php
    $dbConfigPaths = [
        '../dbconfig.php',
        '../../dbconfig.php',
        dirname(__DIR__) . '/dbconfig.php',
        $_SERVER['DOCUMENT_ROOT'] . '/iFilterDashboard/dbconfig.php',
        $_SERVER['DOCUMENT_ROOT'] . '/dbconfig.php'
    ];
    
    $configPath = null;
    foreach ($dbConfigPaths as $path) {
        if (file_exists($path)) {
            $configPath = $path;
            break;
        }
    }
    
    if (!$configPath) {
        throw new Exception('dbconfig.php not found in any of these locations: ' . implode(', ', $dbConfigPaths));
    }
    
    require_once $configPath;
    
    // Test database connection
    $conn = getDBConnection();
    
    if (!$conn) {
        throw new Exception('Failed to connect to database');
    }
    
    // Test a simple query
    $result = $conn->query("SELECT COUNT(*) as count FROM users");
    $userCount = $result->fetch_assoc()['count'];
    
    echo json_encode([
        'success' => true,
        'message' => 'Database connection successful!',
        'config_path' => $configPath,
        'user_count' => $userCount,
        'mysql_version' => $conn->server_info
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'tried_paths' => $dbConfigPaths ?? [],
        'current_dir' => __DIR__
    ]);
}
?>