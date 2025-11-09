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

// Get authenticated user
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

// GET - Get all projects or single project
function handleGet($conn, $user) {
    $projectId = $_GET['id'] ?? null;

    if ($projectId) {
        // Get single project with stats
        $stmt = $conn->prepare("
            SELECT p.*,
                   u.full_name as owner_name,
                   COUNT(DISTINCT t.id) as total_tasks,
                   COUNT(DISTINCT CASE WHEN t.status = 'done' THEN t.id END) as completed_tasks,
                   COUNT(DISTINCT CASE WHEN t.status = 'in_progress' THEN t.id END) as in_progress_tasks,
                   COUNT(DISTINCT pm.user_id) as member_count
            FROM projects p
            LEFT JOIN users u ON p.owner_id = u.id
            LEFT JOIN tasks t ON p.id = t.project_id
            LEFT JOIN project_members pm ON p.id = pm.project_id
            WHERE p.id = ? AND p.is_archived = FALSE
            GROUP BY p.id
        ");
        $stmt->bind_param("i", $projectId);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($row = $result->fetch_assoc()) {
            // Get project members
            $membersStmt = $conn->prepare("
                SELECT u.id, u.full_name, u.email, u.avatar_url, pm.role
                FROM project_members pm
                JOIN users u ON pm.user_id = u.id
                WHERE pm.project_id = ?
            ");
            $membersStmt->bind_param("i", $projectId);
            $membersStmt->execute();
            $membersResult = $membersStmt->get_result();
            $row['members'] = $membersResult->fetch_all(MYSQLI_ASSOC);

            echo json_encode(['success' => true, 'data' => $row]);
        } else {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Project not found']);
        }
    } else {
        // Get all projects
        $stmt = $conn->prepare("
            SELECT p.*,
                   u.full_name as owner_name,
                   COUNT(DISTINCT t.id) as total_tasks,
                   COUNT(DISTINCT CASE WHEN t.status = 'done' THEN t.id END) as completed_tasks
            FROM projects p
            LEFT JOIN users u ON p.owner_id = u.id
            LEFT JOIN tasks t ON p.id = t.project_id
            WHERE p.is_archived = FALSE
            GROUP BY p.id
            ORDER BY p.created_at DESC
        ");
        $stmt->execute();
        $result = $stmt->get_result();
        $projects = $result->fetch_all(MYSQLI_ASSOC);

        echo json_encode(['success' => true, 'data' => $projects]);
    }
}

// POST - Create new project
function handlePost($conn, $user) {
    $data = json_decode(file_get_contents('php://input'), true);

    $name = $data['name'] ?? null;
    $description = $data['description'] ?? '';
    $color = $data['color'] ?? '#3B82F6';

    if (!$name) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Project name is required']);
        return;
    }

    $stmt = $conn->prepare("
        INSERT INTO projects (name, description, color, owner_id)
        VALUES (?, ?, ?, ?)
    ");
    $stmt->bind_param("sssi", $name, $description, $color, $user['id']);

    if ($stmt->execute()) {
        $projectId = $conn->insert_id;

        // Add creator as project owner
        $memberStmt = $conn->prepare("
            INSERT INTO project_members (project_id, user_id, role)
            VALUES (?, ?, 'owner')
        ");
        $memberStmt->bind_param("ii", $projectId, $user['id']);
        $memberStmt->execute();

        echo json_encode([
            'success' => true,
            'data' => [
                'id' => $projectId,
                'name' => $name,
                'description' => $description,
                'color' => $color
            ]
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to create project']);
    }
}

// PUT - Update project
function handlePut($conn, $user) {
    $data = json_decode(file_get_contents('php://input'), true);
    $projectId = $data['id'] ?? null;

    if (!$projectId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Project ID is required']);
        return;
    }

    $updates = [];
    $types = "";
    $params = [];

    if (isset($data['name'])) {
        $updates[] = "name = ?";
        $types .= "s";
        $params[] = $data['name'];
    }
    if (isset($data['description'])) {
        $updates[] = "description = ?";
        $types .= "s";
        $params[] = $data['description'];
    }
    if (isset($data['color'])) {
        $updates[] = "color = ?";
        $types .= "s";
        $params[] = $data['color'];
    }
    if (isset($data['is_archived'])) {
        $updates[] = "is_archived = ?";
        $types .= "i";
        $params[] = $data['is_archived'];
    }

    if (empty($updates)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'No fields to update']);
        return;
    }

    $sql = "UPDATE projects SET " . implode(", ", $updates) . " WHERE id = ?";
    $types .= "i";
    $params[] = $projectId;

    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$params);

    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Project updated successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to update project']);
    }
}

// DELETE - Delete project
function handleDelete($conn, $user) {
    $projectId = $_GET['id'] ?? null;

    if (!$projectId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Project ID is required']);
        return;
    }

    $stmt = $conn->prepare("DELETE FROM projects WHERE id = ?");
    $stmt->bind_param("i", $projectId);

    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Project deleted successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to delete project']);
    }
}
?>
