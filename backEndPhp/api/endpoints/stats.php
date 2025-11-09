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

// Get overall statistics
$stats = [];

// Total projects
$projectsStmt = $conn->query("SELECT COUNT(*) as total FROM projects WHERE is_archived = FALSE");
$stats['total_projects'] = $projectsStmt->fetch_assoc()['total'];

// Total tasks
$tasksStmt = $conn->query("SELECT COUNT(*) as total FROM tasks");
$stats['total_tasks'] = $tasksStmt->fetch_assoc()['total'];

// Tasks by status
$statusStmt = $conn->query("
    SELECT status, COUNT(*) as count
    FROM tasks
    GROUP BY status
");
$stats['tasks_by_status'] = [];
while ($row = $statusStmt->fetch_assoc()) {
    $stats['tasks_by_status'][$row['status']] = (int)$row['count'];
}

// Tasks by priority
$priorityStmt = $conn->query("
    SELECT priority, COUNT(*) as count
    FROM tasks
    GROUP BY priority
");
$stats['tasks_by_priority'] = [];
while ($row = $priorityStmt->fetch_assoc()) {
    $stats['tasks_by_priority'][$row['priority']] = (int)$row['count'];
}

// Total users
$usersStmt = $conn->query("SELECT COUNT(*) as total FROM users WHERE is_active = TRUE");
$stats['total_users'] = $usersStmt->fetch_assoc()['total'];

// Overdue tasks
$overdueStmt = $conn->query("
    SELECT COUNT(*) as count
    FROM tasks
    WHERE due_date < CURDATE() AND status != 'done'
");
$stats['overdue_tasks'] = $overdueStmt->fetch_assoc()['count'];

// Tasks due this week
$thisWeekStmt = $conn->query("
    SELECT COUNT(*) as count
    FROM tasks
    WHERE due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
    AND status != 'done'
");
$stats['due_this_week'] = $thisWeekStmt->fetch_assoc()['count'];

// My assigned tasks
$myTasksStmt = $conn->prepare("
    SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'done' THEN 1 END) as completed,
        COUNT(CASE WHEN status != 'done' AND due_date < CURDATE() THEN 1 END) as overdue
    FROM tasks
    WHERE assigned_to = ?
");
$myTasksStmt->bind_param("i", $user['id']);
$myTasksStmt->execute();
$myTasks = $myTasksStmt->get_result()->fetch_assoc();
$stats['my_tasks'] = [
    'total' => (int)$myTasks['total'],
    'completed' => (int)$myTasks['completed'],
    'overdue' => (int)$myTasks['overdue']
];

// Recent activity count
$activityStmt = $conn->query("
    SELECT COUNT(*) as count
    FROM task_activity
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
");
$stats['recent_activity_count'] = $activityStmt->fetch_assoc()['count'];

echo json_encode(['success' => true, 'data' => $stats]);

closeDBConnection($conn);
?>
