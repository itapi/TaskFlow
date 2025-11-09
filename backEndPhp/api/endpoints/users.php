<?php
require_once __DIR__ . '/../../dbconfig.php';
require_once __DIR__ . '/../core/auth_middleware.php';

$method = $_SERVER['REQUEST_METHOD'];
$conn = getDBConnection();

if (!$conn) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database connection failed']);
    exit;
}

$user = authenticateUser();

switch ($method) {
    case 'GET':
        handleGet($conn, $user);
        break;
    case 'POST':
        handlePost($conn, $user);
        break;
    case 'PUT':
        handlePut($conn, $user);
        break;
    case 'DELETE':
        handleDelete($conn, $user);
        break;
    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Method not allowed']);
}

closeDBConnection($conn);

// GET - Get all users or single user
function handleGet($conn, $user) {
    $userId = $_GET['id'] ?? null;

    if ($userId) {
        // Get single user
        $stmt = $conn->prepare("
            SELECT id, username, email, full_name, role, avatar_url, created_at, last_login, is_active
            FROM users
            WHERE id = ?
        ");
        $stmt->bind_param("i", $userId);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($row = $result->fetch_assoc()) {
            echo json_encode(['success' => true, 'data' => $row]);
        } else {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'User not found']);
        }
    } else {
        // Get all users
        $stmt = $conn->prepare("
            SELECT id, username, email, full_name, role, avatar_url, created_at, last_login, is_active
            FROM users
            ORDER BY full_name ASC
        ");
        $stmt->execute();
        $result = $stmt->get_result();
        $users = $result->fetch_all(MYSQLI_ASSOC);

        echo json_encode(['success' => true, 'data' => $users]);
    }
}

// POST - Create new user (admin only)
function handlePost($conn, $user) {
    if ($user['role'] !== 'admin') {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Admin access required']);
        return;
    }

    $data = json_decode(file_get_contents('php://input'), true);

    $username = $data['username'] ?? null;
    $email = $data['email'] ?? null;
    $password = $data['password'] ?? null;
    $fullName = $data['full_name'] ?? null;
    $role = $data['role'] ?? 'member';

    if (!$username || !$email || !$password || !$fullName) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Username, email, password, and full name are required']);
        return;
    }

    // Hash password
    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

    $stmt = $conn->prepare("
        INSERT INTO users (username, email, password, full_name, role)
        VALUES (?, ?, ?, ?, ?)
    ");
    $stmt->bind_param("sssss", $username, $email, $hashedPassword, $fullName, $role);

    if ($stmt->execute()) {
        $userId = $conn->insert_id;

        echo json_encode([
            'success' => true,
            'data' => [
                'id' => $userId,
                'username' => $username,
                'email' => $email,
                'full_name' => $fullName,
                'role' => $role
            ]
        ]);
    } else {
        if ($conn->errno === 1062) { // Duplicate entry
            http_response_code(409);
            echo json_encode(['success' => false, 'error' => 'Username or email already exists']);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Failed to create user']);
        }
    }
}

// PUT - Update user
function handlePut($conn, $user) {
    $data = json_decode(file_get_contents('php://input'), true);
    $userId = $data['id'] ?? null;

    if (!$userId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'User ID is required']);
        return;
    }

    // Only admins can update other users, users can update themselves
    if ($user['role'] !== 'admin' && $user['id'] != $userId) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Unauthorized']);
        return;
    }

    $updates = [];
    $types = "";
    $params = [];

    if (isset($data['username'])) {
        $updates[] = "username = ?";
        $types .= "s";
        $params[] = $data['username'];
    }
    if (isset($data['email'])) {
        $updates[] = "email = ?";
        $types .= "s";
        $params[] = $data['email'];
    }
    if (isset($data['full_name'])) {
        $updates[] = "full_name = ?";
        $types .= "s";
        $params[] = $data['full_name'];
    }
    if (isset($data['avatar_url'])) {
        $updates[] = "avatar_url = ?";
        $types .= "s";
        $params[] = $data['avatar_url'];
    }
    if (isset($data['password'])) {
        $updates[] = "password = ?";
        $types .= "s";
        $params[] = password_hash($data['password'], PASSWORD_DEFAULT);
    }

    // Only admins can update role and is_active
    if ($user['role'] === 'admin') {
        if (isset($data['role'])) {
            $updates[] = "role = ?";
            $types .= "s";
            $params[] = $data['role'];
        }
        if (isset($data['is_active'])) {
            $updates[] = "is_active = ?";
            $types .= "i";
            $params[] = $data['is_active'];
        }
    }

    if (empty($updates)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'No fields to update']);
        return;
    }

    $sql = "UPDATE users SET " . implode(", ", $updates) . " WHERE id = ?";
    $types .= "i";
    $params[] = $userId;

    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$params);

    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'User updated successfully']);
    } else {
        if ($conn->errno === 1062) {
            http_response_code(409);
            echo json_encode(['success' => false, 'error' => 'Username or email already exists']);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Failed to update user']);
        }
    }
}

// DELETE - Delete user (admin only)
function handleDelete($conn, $user) {
    if ($user['role'] !== 'admin') {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Admin access required']);
        return;
    }

    $userId = $_GET['id'] ?? null;

    if (!$userId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'User ID is required']);
        return;
    }

    // Prevent deleting self
    if ($user['id'] == $userId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Cannot delete your own account']);
        return;
    }

    $stmt = $conn->prepare("DELETE FROM users WHERE id = ?");
    $stmt->bind_param("i", $userId);

    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'User deleted successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to delete user']);
    }
}
?>
