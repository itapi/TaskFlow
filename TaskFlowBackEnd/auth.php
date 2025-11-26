<?php
require_once 'dbconfig.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

class AuthController {
    private $conn;
    private $secretKey = 'TaskFlow_Secret_Key_2025'; // In production, use environment variable

    public function __construct() {
        $this->conn = getDBConnection();
        if (!$this->conn) {
            $this->sendError('Database connection failed', 500);
        }
    }

    public function handleRequest() {
        $method = $_SERVER['REQUEST_METHOD'];

        if ($method === 'GET') {
            $action = $_GET['action'] ?? '';
        } else {
            $input = json_decode(file_get_contents('php://input'), true);
            $action = $input['action'] ?? '';
        }

        switch ($action) {
            case 'login':
                $this->login();
                break;
            case 'logout':
                $this->logout();
                break;
            case 'profile':
                $this->getProfile();
                break;
            default:
                $this->sendError('Invalid action', 400);
        }
    }

    private function login() {
        $input = json_decode(file_get_contents('php://input'), true);

        $username = $input['username'] ?? '';
        $password = $input['password'] ?? '';

        if (empty($username) || empty($password)) {
            $this->sendError('Username and password are required', 400);
        }

        // Prepare statement to prevent SQL injection
        $stmt = $this->conn->prepare("SELECT id, username, email, password, full_name, role, avatar_url, is_active FROM users WHERE username = ? OR email = ?");
        $stmt->bind_param("ss", $username, $username);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows === 0) {
            $this->sendError('Invalid username or password', 401);
        }

        $user = $result->fetch_assoc();

        // Check if user is active
        if (!$user['is_active']) {
            $this->sendError('Account is deactivated', 403);
        }

        // Verify password
        if (!password_verify($password, $user['password'])) {
            $this->sendError('Invalid userssname or password', 401);
        }

        // Generate JWT token
        $token = $this->generateToken($user);

        // Update last login time
        $updateStmt = $this->conn->prepare("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?");
        $updateStmt->bind_param("i", $user['id']);
        $updateStmt->execute();

        // Return success response
        $this->sendSuccess([
            'message' => 'Login successful',
            'token' => $token,
            'user' => [
                'id' => $user['id'],
                'username' => $user['username'],
                'email' => $user['email'],
                'full_name' => $user['full_name'],
                'role' => $user['role'],
                'avatar_url' => $user['avatar_url']
            ]
        ]);
    }

    private function logout() {
        // In a more complex system, you might blacklist the token
        $this->sendSuccess(['message' => 'Logout successful']);
    }

    private function getProfile() {
        $token = $this->getTokenFromHeader();
        if (!$token) {
            $this->sendError('Access token required', 401);
        }

        $userData = $this->verifyToken($token);
        if (!$userData) {
            $this->sendError('Invalid or expired token', 401);
        }

        // Get fresh user data from database
        $stmt = $this->conn->prepare("SELECT id, username, email, full_name, role, avatar_url, created_at FROM users WHERE id = ?");
        $stmt->bind_param("i", $userData['id']);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows === 0) {
            $this->sendError('User not found', 404);
        }

        $user = $result->fetch_assoc();
        $this->sendSuccess(['user' => $user]);
    }

    private function generateToken($user) {
        $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
        $payload = json_encode([
            'id' => $user['id'],
            'username' => $user['username'],
            'email' => $user['email'],
            'full_name' => $user['full_name'],
            'role' => $user['role'],
            'avatar_url' => $user['avatar_url'] ?? null,
            'exp' => time() + (7 * 24 * 60 * 60) // 7 days expiration
        ]);

        $headerEncoded = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
        $payloadEncoded = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($payload));

        $signature = hash_hmac('sha256', $headerEncoded . "." . $payloadEncoded, $this->secretKey, true);
        $signatureEncoded = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));

        return $headerEncoded . "." . $payloadEncoded . "." . $signatureEncoded;
    }

    private function verifyToken($token) {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return false;
        }

        $header = base64_decode(str_replace(['-', '_'], ['+', '/'], $parts[0]));
        $payload = base64_decode(str_replace(['-', '_'], ['+', '/'], $parts[1]));
        $signature = base64_decode(str_replace(['-', '_'], ['+', '/'], $parts[2]));

        $expectedSignature = hash_hmac('sha256', $parts[0] . "." . $parts[1], $this->secretKey, true);

        if (!hash_equals($signature, $expectedSignature)) {
            return false;
        }

        $payloadData = json_decode($payload, true);
        if (!$payloadData || $payloadData['exp'] < time()) {
            return false;
        }

        return $payloadData;
    }

    private function getTokenFromHeader() {
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';

        if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            return $matches[1];
        }

        return null;
    }

    private function sendSuccess($data) {
        echo json_encode(['success' => true] + $data);
        exit;
    }

    private function sendError($message, $code = 400) {
        http_response_code($code);
        echo json_encode(['success' => false, 'error' => $message]);
        exit;
    }

    public function __destruct() {
        if ($this->conn) {
            closeDBConnection($this->conn);
        }
    }
}

// Handle the request
$auth = new AuthController();
$auth->handleRequest();
?>