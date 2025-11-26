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

// GET - Get tasks
function handleGet($conn, $user) {
    $taskId = $_GET['id'] ?? null;
    $projectId = $_GET['project_id'] ?? null;
    $status = $_GET['status'] ?? null;
    $assignedTo = $_GET['assigned_to'] ?? null;

    if ($taskId) {
        // Get single task with details
        $stmt = $conn->prepare("
            SELECT t.*,
                   creator.full_name as created_by_name,
                   assignee.full_name as assigned_to_name,
                   assignee.avatar_url as assigned_to_avatar,
                   p.name as project_name,
                   p.color as project_color,
                   COUNT(DISTINCT tc.id) as comment_count
            FROM tasks t
            LEFT JOIN users creator ON t.created_by = creator.id
            LEFT JOIN users assignee ON t.assigned_to = assignee.id
            LEFT JOIN projects p ON t.project_id = p.id
            LEFT JOIN task_comments tc ON t.id = tc.task_id
            WHERE t.id = ?
            GROUP BY t.id
        ");
        $stmt->bind_param("i", $taskId);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($row = $result->fetch_assoc()) {
            echo json_encode(['success' => true, 'data' => $row]);
        } else {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Task not found']);
        }
    } else {
        // Build query based on filters
        $sql = "
            SELECT t.*,
                   creator.full_name as created_by_name,
                   assignee.full_name as assigned_to_name,
                   assignee.avatar_url as assigned_to_avatar,
                   p.name as project_name,
                   p.color as project_color,
                   COUNT(DISTINCT tc.id) as comment_count
            FROM tasks t
            LEFT JOIN users creator ON t.created_by = creator.id
            LEFT JOIN users assignee ON t.assigned_to = assignee.id
            LEFT JOIN projects p ON t.project_id = p.id
            LEFT JOIN task_comments tc ON t.id = tc.task_id
            WHERE 1=1
        ";

        $params = [];
        $types = "";

        if ($projectId) {
            $sql .= " AND t.project_id = ?";
            $types .= "i";
            $params[] = $projectId;
        }

        if ($status) {
            $sql .= " AND t.status = ?";
            $types .= "s";
            $params[] = $status;
        }

        if ($assignedTo) {
            $sql .= " AND t.assigned_to = ?";
            $types .= "i";
            $params[] = $assignedTo;
        }

        $sql .= " GROUP BY t.id ORDER BY t.position ASC, t.created_at DESC";

        $stmt = $conn->prepare($sql);
        if (!empty($params)) {
            $stmt->bind_param($types, ...$params);
        }
        $stmt->execute();
        $result = $stmt->get_result();
        $tasks = $result->fetch_all(MYSQLI_ASSOC);

        echo json_encode(['success' => true, 'data' => $tasks]);
    }
}

// POST - Create new task
function handlePost($conn, $user) {
    $data = json_decode(file_get_contents('php://input'), true);

    $projectId = $data['project_id'] ?? null;
    $title = $data['title'] ?? null;
    $description = $data['description'] ?? '';
    $status = $data['status'] ?? 'not_started';
    $priority = $data['priority'] ?? 'medium';
  $assignedTo = !empty($data['assigned_to']) ? $data['assigned_to'] : null;
  $dueDate = !empty($data['due_date']) ? $data['due_date'] : null;

    if (!$projectId || !$title) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Project ID and title are required']);
        return;
    }

    // Get next position
    $posStmt = $conn->prepare("SELECT COALESCE(MAX(position), 0) + 1 as next_pos FROM tasks WHERE project_id = ?");
    $posStmt->bind_param("i", $projectId);
    $posStmt->execute();
    $posResult = $posStmt->get_result();
    $position = $posResult->fetch_assoc()['next_pos'];

    $stmt = $conn->prepare("
        INSERT INTO tasks (project_id, title, description, status, priority, assigned_to, created_by, due_date, position)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->bind_param("issssiisi", $projectId, $title, $description, $status, $priority, $assignedTo, $user['id'], $dueDate, $position);

    if ($stmt->execute()) {
        $taskId = $conn->insert_id;

        // Log activity
        logActivity($conn, $taskId, $user['id'], 'created', null, $title);

        // Get project name for notifications
        $projectStmt = $conn->prepare("SELECT name FROM projects WHERE id = ?");
        $projectStmt->bind_param("i", $projectId);
        $projectStmt->execute();
        $projectResult = $projectStmt->get_result();
        $projectData = $projectResult->fetch_assoc();
        $projectName = $projectData['name'] ?? '';

        // Process mentions and send notifications
        if (!empty($description)) {
            processMentions(
                $conn,
                $description,
                'task',
                $title,
                $projectName,
                $user['full_name'] ?? $user['username']
            );
        }

        // Send assignment notification if task is assigned to someone
        if (!empty($assignedTo)) {
            $assignedUserStmt = $conn->prepare("SELECT id, email, full_name, username FROM users WHERE id = ?");
            $assignedUserStmt->bind_param("i", $assignedTo);
            $assignedUserStmt->execute();
            $assignedUserResult = $assignedUserStmt->get_result();
            $assignedUser = $assignedUserResult->fetch_assoc();

            if ($assignedUser) {
                sendAssignmentEmail(
                    $assignedUser,
                    $title,
                    $projectName,
                    $user['full_name'] ?? $user['username'],
                    $priority,
                    $dueDate
                );
            }
        }

        echo json_encode([
            'success' => true,
            'data' => [
                'id' => $taskId,
                'title' => $title,
                'status' => $status,
                'priority' => $priority
            ]
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to create task']);
    }
}

// PUT - Update task
function handlePut($conn, $user) {
    $data = json_decode(file_get_contents('php://input'), true);
    $taskId = $data['id'] ?? null;

    if (!$taskId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Task ID is required']);
        return;
    }

    // Get current task data for activity log
    $currentStmt = $conn->prepare("SELECT * FROM tasks WHERE id = ?");
    $currentStmt->bind_param("i", $taskId);
    $currentStmt->execute();
    $current = $currentStmt->get_result()->fetch_assoc();

    $updates = [];
    $types = "";
    $params = [];

    if (isset($data['title'])) {
        $updates[] = "title = ?";
        $types .= "s";
        $params[] = $data['title'];
    }
    if (isset($data['description'])) {
        $updates[] = "description = ?";
        $types .= "s";
        $params[] = $data['description'];
    }
    if (isset($data['status'])) {
        $updates[] = "status = ?";
        $types .= "s";
        $params[] = $data['status'];

        // Log status change
        if ($current['status'] !== $data['status']) {
            logActivity($conn, $taskId, $user['id'], 'status_changed', $current['status'], $data['status']);
        }

        // Set completed_at if status is done
        if ($data['status'] === 'done' && $current['status'] !== 'done') {
            $updates[] = "completed_at = NOW()";
        }
    }
    if (isset($data['priority'])) {
        $updates[] = "priority = ?";
        $types .= "s";
        $params[] = $data['priority'];
    }
  if (isset($data['assigned_to'])) {
      $updates[] = "assigned_to = ?";
      $types .= "i";
      $params[] = !empty($data['assigned_to']) ? $data['assigned_to'] : null;

        // Log assignment
        if ($current['assigned_to'] != $data['assigned_to']) {
            logActivity($conn, $taskId, $user['id'], 'assigned', $current['assigned_to'], $data['assigned_to']);
        }
    }
  if (isset($data['due_date'])) {
      $updates[] = "due_date = ?";
      $types .= "s";
      $params[] = $data['due_date'];
  }
    if (isset($data['position'])) {
        $updates[] = "position = ?";
        $types .= "i";
        $params[] = $data['position'];
    }

    if (empty($updates)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'No fields to update']);
        return;
    }

    $sql = "UPDATE tasks SET " . implode(", ", $updates) . " WHERE id = ?";
    $types .= "i";
    $params[] = $taskId;

    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$params);

    if ($stmt->execute()) {
        // Log general update if no specific action was logged
        logActivity($conn, $taskId, $user['id'], 'updated', null, null);

        // Get task details for notifications
        $taskStmt = $conn->prepare("
            SELECT t.title, t.priority, t.due_date, p.name as project_name
            FROM tasks t
            LEFT JOIN projects p ON t.project_id = p.id
            WHERE t.id = ?
        ");
        $taskStmt->bind_param("i", $taskId);
        $taskStmt->execute();
        $taskResult = $taskStmt->get_result();
        $taskData = $taskResult->fetch_assoc();

        // Process mentions if description was updated
        if (isset($data['description']) && $data['description'] !== $current['description']) {
            processMentions(
                $conn,
                $data['description'],
                'task',
                $taskData['title'] ?? 'Task',
                $taskData['project_name'] ?? '',
                $user['full_name'] ?? $user['username']
            );
        }

        // Send assignment notification if task was assigned/reassigned to someone new
        if (isset($data['assigned_to']) && $data['assigned_to'] != $current['assigned_to'] && !empty($data['assigned_to'])) {
            $assignedUserStmt = $conn->prepare("SELECT id, email, full_name, username FROM users WHERE id = ?");
            $assignedUserStmt->bind_param("i", $data['assigned_to']);
            $assignedUserStmt->execute();
            $assignedUserResult = $assignedUserStmt->get_result();
            $assignedUser = $assignedUserResult->fetch_assoc();

            if ($assignedUser) {
                sendAssignmentEmail(
                    $assignedUser,
                    $taskData['title'] ?? 'Task',
                    $taskData['project_name'] ?? '',
                    $user['full_name'] ?? $user['username'],
                    $data['priority'] ?? $taskData['priority'] ?? 'medium',
                    $data['due_date'] ?? $taskData['due_date'] ?? null
                );
            }
        }

        echo json_encode(['success' => true, 'message' => 'Task updated successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to update task']);
    }
}

// DELETE - Delete task
function handleDelete($conn, $user) {
    $taskId = $_GET['id'] ?? null;

    if (!$taskId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Task ID is required']);
        return;
    }

    $stmt = $conn->prepare("DELETE FROM tasks WHERE id = ?");
    $stmt->bind_param("i", $taskId);

    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Task deleted successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to delete task']);
    }
}

// Helper function to log activity
function logActivity($conn, $taskId, $userId, $actionType, $oldValue, $newValue) {
    $stmt = $conn->prepare("
        INSERT INTO task_activity (task_id, user_id, action_type, old_value, new_value)
        VALUES (?, ?, ?, ?, ?)
    ");
    $stmt->bind_param("iisss", $taskId, $userId, $actionType, $oldValue, $newValue);
    $stmt->execute();
}
?>
