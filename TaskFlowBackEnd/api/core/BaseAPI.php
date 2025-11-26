<?php
// Try multiple possible paths for dbconfig.php
$dbConfigPaths = [
    dirname(__DIR__, 2) . '/dbconfig.php',  // Original path
    dirname(__DIR__) . '/dbconfig.php',     // One level up
    __DIR__ . '/../../dbconfig.php',        // Relative path
    $_SERVER['DOCUMENT_ROOT'] . '/iFilterDashboard/dbconfig.php', // Absolute path
];

$dbConfigLoaded = false;
foreach ($dbConfigPaths as $path) {
    if (file_exists($path)) {
        require_once $path;
        $dbConfigLoaded = true;
        break;
    }
}

if (!$dbConfigLoaded) {
    die(json_encode(['error' => 'dbconfig.php not found. Paths tried: ' . implode(', ', $dbConfigPaths)]));
}

abstract class BaseAPI {
    protected $conn;
    protected $table;
    protected $primaryKey;
    
    public function __construct($table, $primaryKey = 'id') {
        $this->conn = getDBConnection();
        $this->table = $table;
        $this->primaryKey = $primaryKey;
        
        if (!$this->conn) {
            $this->sendError('Database connection failed', 500);
        }
        
        $this->setHeaders();
    }
    
    private function setHeaders() {
        header('Content-Type: application/json');
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization');
        
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            exit(0);
        }
    }
    
    public function handleRequest() {
        $method = $_SERVER['REQUEST_METHOD'];
        $pathInfo = $_SERVER['PATH_INFO'] ?? '';
        $segments = array_values(array_filter(explode('/', $pathInfo)));
        
        switch ($method) {
            case 'GET':
                if (empty($segments)) {
                    $this->getAll();
                } else {
                    $this->getById($segments[0]);
                }
                break;
            case 'POST':
                $this->create();
                break;
            case 'PUT':
                if (!empty($segments)) {
                    $this->update($segments[0]);
                } else {
                    $this->sendError('ID required for update', 400);
                }
                break;
            case 'DELETE':
                if (!empty($segments)) {
                    $this->delete($segments[0]);
                } else {
                    $this->sendError('ID required for delete', 400);
                }
                break;
            default:
                $this->sendError('Method not allowed', 405);
        }
    }
    
    protected function getAll($conditions = '', $params = []) {
        try {
            $sql = "SELECT * FROM {$this->table}";
            if ($conditions) {
                $sql .= " WHERE " . $conditions;
            }
            $sql .= " ORDER BY {$this->primaryKey} DESC";
            
            $stmt = $this->conn->prepare($sql);
            if (!empty($params)) {
                $stmt->execute($params);
            } else {
                $stmt->execute();
            }
            
            $results = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
            $this->sendSuccess(['data' => $results, 'count' => count($results)]);
        } catch (Exception $e) {
            $this->sendError('Failed to fetch records: ' . $e->getMessage(), 500);
        }
    }
    
    protected function getById($id) {
        try {
            $stmt = $this->conn->prepare("SELECT * FROM {$this->table} WHERE {$this->primaryKey} = ?");
            $stmt->bind_param("s", $id);
            $stmt->execute();
            
            $result = $stmt->get_result()->fetch_assoc();
            if ($result) {
                $this->sendSuccess(['data' => $result]);
            } else {
                $this->sendError('Record not found', 404);
            }
        } catch (Exception $e) {
            $this->sendError('Failed to fetch record: ' . $e->getMessage(), 500);
        }
    }
    
    protected function create() {
        $input = $this->getJsonInput();
        if (!$input) {
            $this->sendError('Invalid JSON input', 400);
        }
        
        try {
            $fields = array_keys($input);
            $placeholders = str_repeat('?,', count($fields) - 1) . '?';
            
            $sql = "INSERT INTO {$this->table} (" . implode(',', $fields) . ") VALUES ($placeholders)";
            $stmt = $this->conn->prepare($sql);
            
            $types = str_repeat('s', count($input));
            $stmt->bind_param($types, ...array_values($input));
            
            if ($stmt->execute()) {
                $newId = $this->conn->insert_id;
                $this->sendSuccess([
                    'message' => 'Record created successfully',
                    'id' => $newId,
                    'data' => $input
                ], 201);
            } else {
                $this->sendError('Failed to create record', 500);
            }
        } catch (Exception $e) {
            $this->sendError('Failed to create record: ' . $e->getMessage(), 500);
        }
    }
    
    protected function update($id) {
        $input = $this->getJsonInput();
        if (!$input) {
            $this->sendError('Invalid JSON input', 400);
        }
        
        try {
            $fields = array_keys($input);
            $setClause = implode(' = ?, ', $fields) . ' = ?';
            
            $sql = "UPDATE {$this->table} SET $setClause WHERE {$this->primaryKey} = ?";
            $stmt = $this->conn->prepare($sql);
            
            $values = array_values($input);
            $values[] = $id;
            $types = str_repeat('s', count($values));
            
            $stmt->bind_param($types, ...$values);
            
            if ($stmt->execute()) {
                if ($stmt->affected_rows > 0) {
                    $this->sendSuccess([
                        'message' => 'Record updated successfully',
                        'id' => $id,
                        'data' => $input
                    ]);
                } else {
                    $this->sendError('Record not found or no changes made', 404);
                }
            } else {
                $this->sendError('Failed to update record', 500);
            }
        } catch (Exception $e) {
            $this->sendError('Failed to update record: ' . $e->getMessage(), 500);
        }
    }
    
    protected function delete($id) {
        try {
            $stmt = $this->conn->prepare("DELETE FROM {$this->table} WHERE {$this->primaryKey} = ?");
            $stmt->bind_param("s", $id);
            
            if ($stmt->execute()) {
                if ($stmt->affected_rows > 0) {
                    $this->sendSuccess([
                        'message' => 'Record deleted successfully',
                        'id' => $id
                    ]);
                } else {
                    $this->sendError('Record not found', 404);
                }
            } else {
                $this->sendError('Failed to delete record', 500);
            }
        } catch (Exception $e) {
            $this->sendError('Failed to delete record: ' . $e->getMessage(), 500);
        }
    }
    
    protected function getJsonInput() {
        $input = json_decode(file_get_contents('php://input'), true);
        return $input;
    }
    
    protected function sendSuccess($data, $statusCode = 200) {
        http_response_code($statusCode);
        echo json_encode(['success' => true] + $data);
        exit;
    }
    
    protected function sendError($message, $statusCode = 400) {
        http_response_code($statusCode);
        echo json_encode(['success' => false, 'error' => $message]);
        exit;
    }
    
    public function __destruct() {
        if ($this->conn) {
            closeDBConnection($this->conn);
        }
    }
}
?>