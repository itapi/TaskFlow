<?php
require_once __DIR__ . '/../../dbconfig.php';
require_once __DIR__ . '/../core/auth_middleware.php';
require_once __DIR__ . '/../core/mention_helper.php';

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

// GET - Get comments for a task
function handleGet($conn, $user) {
    $taskId = $_GET['task_id'] ?? null;

    if (!$taskId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Task ID is required']);
        return;
    }

    $stmt = $conn->prepare("
        SELECT tc.*,
               u.full_name as user_name,
               u.avatar_url as user_avatar
        FROM task_comments tc
        JOIN users u ON tc.user_id = u.id
        WHERE tc.task_id = ?
        ORDER BY tc.created_at ASC
    ");
    $stmt->bind_param("i", $taskId);
    $stmt->execute();
    $result = $stmt->get_result();
    $comments = $result->fetch_all(MYSQLI_ASSOC);

    echo json_encode(['success' => true, 'data' => $comments]);
}

// POST - Add new comment
function handlePost($conn, $user) {
    $data = json_decode(file_get_contents('php://input'), true);

    $taskId = $data['task_id'] ?? null;
    $comment = $data['comment'] ?? null;

    if (!$taskId || !$comment) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Task ID and comment are required']);
        return;
    }

    $stmt = $conn->prepare("
        INSERT INTO task_comments (task_id, user_id, comment)
        VALUES (?, ?, ?)
    ");
    $stmt->bind_param("iis", $taskId, $user['id'], $comment);

    if ($stmt->execute()) {
        $commentId = $conn->insert_id;

        // Log activity
        $activityStmt = $conn->prepare("
            INSERT INTO task_activity (task_id, user_id, action_type)
            VALUES (?, ?, 'commented')
        ");
        $activityStmt->bind_param("ii", $taskId, $user['id']);
        $activityStmt->execute();

        // Process mentions and send notifications
        if (!empty($comment)) {
            // Get task and project information
            $taskStmt = $conn->prepare("
                SELECT t.title, p.name as project_name
                FROM tasks t
                LEFT JOIN projects p ON t.project_id = p.id
                WHERE t.id = ?
            ");
            $taskStmt->bind_param("i", $taskId);
            $taskStmt->execute();
            $taskResult = $taskStmt->get_result();
            $taskData = $taskResult->fetch_assoc();

            // Send mention notifications
            processMentions(
                $conn,
                $comment,
                'comment',
                $taskData['title'] ?? 'Task',
                $taskData['project_name'] ?? '',
                $user['full_name'] ?? $user['username']
            );
        }

        echo json_encode([
            'success' => true,
            'data' => [
                'id' => $commentId,
                'task_id' => $taskId,
                'comment' => $comment,
                'user_name' => $user['full_name'],
                'user_avatar' => $user['avatar_url'] ?? null
            ]
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to add comment']);
    }
}

// PUT - Update comment
function handlePut($conn, $user) {
    $data = json_decode(file_get_contents('php://input'), true);
    $commentId = $data['id'] ?? null;
    $comment = $data['comment'] ?? null;

    if (!$commentId || !$comment) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Comment ID and text are required']);
        return;
    }

    // Check if user owns the comment
    $checkStmt = $conn->prepare("SELECT user_id FROM task_comments WHERE id = ?");
    $checkStmt->bind_param("i", $commentId);
    $checkStmt->execute();
    $result = $checkStmt->get_result();
    $existing = $result->fetch_assoc();

    if (!$existing || $existing['user_id'] != $user['id']) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Unauthorized to edit this comment']);
        return;
    }

    $stmt = $conn->prepare("
        UPDATE task_comments
        SET comment = ?, is_edited = TRUE
        WHERE id = ?
    ");
    $stmt->bind_param("si", $comment, $commentId);

    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Comment updated successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to update comment']);
    }
}

// DELETE - Delete comment
function handleDelete($conn, $user) {
    $commentId = $_GET['id'] ?? null;

    if (!$commentId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Comment ID is required']);
        return;
    }

    // Check if user owns the comment or is admin
    $checkStmt = $conn->prepare("SELECT user_id FROM task_comments WHERE id = ?");
    $checkStmt->bind_param("i", $commentId);
    $checkStmt->execute();
    $result = $checkStmt->get_result();
    $existing = $result->fetch_assoc();

    if (!$existing || ($existing['user_id'] != $user['id'] && $user['role'] !== 'admin')) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Unauthorized to delete this comment']);
        return;
    }

    $stmt = $conn->prepare("DELETE FROM task_comments WHERE id = ?");
    $stmt->bind_param("i", $commentId);

    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Comment deleted successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to delete comment']);
    }
}
?>
