<?php
// dbconfig.php - Database configuration and connection handling

// Load configuration from environment variables or a separate configuration file
// This prevents hardcoding credentials in your code
function getDatabaseConfig() {
    // In a production environment, use environment variables or a secure config file
    // outside the web root
    return [
        'server' => getenv('DB_SERVER') ?: 'localhost',
        'username' => getenv('DB_USERNAME') ?: 'u435853548_tasks',
        'password' => getenv('DB_PASSWORD') ?: 'Tasks12345!@',
        'database' => getenv('DB_NAME') ?: 'u435853548_tasks'
    ];
}

/**
 * Create and return a database connection
 * 
 * @return mysqli|null Database connection or null on failure
 */
function getDBConnection() {
    $conn = null;
    $config = getDatabaseConfig();
    
    try {
        // Create connection with error reporting
        $conn = new mysqli(
            $config['server'], 
            $config['username'], 
            $config['password'], 
            $config['database']
        );
        
        // Check connection
        if ($conn->connect_error) {
            throw new Exception("Connection failed: " . $conn->connect_error);
        }
        
        // Set charset to handle special characters properly
        $conn->set_charset("utf8mb4");
        
        return $conn;
        
    } catch (Exception $e) {
        // Log error (in a production environment, you'd want to log this to a file)
        error_log("Database Connection Error: " . $e->getMessage());
        
        // Return null to indicate failure
        return null;
    }
}

/**
 * Safely close the database connection
 * 
 * @param mysqli $conn Database connection to close
 */
function closeDBConnection($conn) {
    if ($conn instanceof mysqli) {
        $conn->close();
    }
}
?>