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

if ($method !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Only GET method is allowed']);
    exit;
}

$taskId = $_GET['task_id'] ?? null;
$projectId = $_GET['project_id'] ?? null;
$limit = $_GET['limit'] ?? 50;

if ($taskId) {
    // Get activity for specific task
    $stmt = $conn->prepare("
        SELECT ta.*,
               u.full_name as user_name,
               u.avatar_url as user_avatar
        FROM task_activity ta
        JOIN users u ON ta.user_id = u.id
        WHERE ta.task_id = ?
        ORDER BY ta.created_at DESC
        LIMIT ?
    ");
    $stmt->bind_param("ii", $taskId, $limit);
} elseif ($projectId) {
    // Get activity for all tasks in a project
    $stmt = $conn->prepare("
        SELECT ta.*,
               u.full_name as user_name,
               u.avatar_url as user_avatar,
               t.title as task_title
        FROM task_activity ta
        JOIN users u ON ta.user_id = u.id
        JOIN tasks t ON ta.task_id = t.id
        WHERE t.project_id = ?
        ORDER BY ta.created_at DESC
        LIMIT ?
    ");
    $stmt->bind_param("ii", $projectId, $limit);
} else {
    // Get recent activity across all projects
    $stmt = $conn->prepare("
        SELECT ta.*,
               u.full_name as user_name,
               u.avatar_url as user_avatar,
               t.title as task_title,
               p.name as project_name
        FROM task_activity ta
        JOIN users u ON ta.user_id = u.id
        JOIN tasks t ON ta.task_id = t.id
        JOIN projects p ON t.project_id = p.id
        WHERE p.is_archived = FALSE
        ORDER BY ta.created_at DESC
        LIMIT ?
    ");
    $stmt->bind_param("i", $limit);
}

$stmt->execute();
$result = $stmt->get_result();
$activity = $result->fetch_all(MYSQLI_ASSOC);

echo json_encode(['success' => true, 'data' => $activity]);

closeDBConnection($conn);
?>
