<?php
/**
 * Daily Task Digest Cron Job
 *
 * Sends email notifications to users with incomplete tasks
 * Run this as a cron job daily
 *
 * Usage:
 * - Cron: curl https://ikosher.me/TaskFlow/cron/daily_task_digest.php
 * - Test: https://ikosher.me/TaskFlow/cron/daily_task_digest.php?test=1&user_id=3
 */

ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/../dbconfig.php';

// Log file path
define('DIGEST_LOG_FILE', __DIR__ . '/../daily_digest.log');

/**
 * Log digest activity
 */
function logDigest($message, $level = 'INFO') {
    $timestamp = date('Y-m-d H:i:s');
    $logMessage = "[$timestamp] [$level] $message\n";
    file_put_contents(DIGEST_LOG_FILE, $logMessage, FILE_APPEND);
    echo $logMessage; // Also output for cron logs
}

/**
 * Send daily digest email to user
 */
function sendDailyDigestEmail($user, $tasks, $taskStats) {
    logDigest("Preparing digest email for: {$user['email']}");

    // Prepare email subject
    $totalTasks = count($tasks);
    $subject = "סיכום יומי: יש לך $totalTasks משימות פתוחות";

    // Priority labels
    $priorityLabels = [
        'low' => 'נמוכה',
        'medium' => 'בינונית',
        'high' => 'גבוהה',
        'urgent' => 'דחופה'
    ];

    // Status labels
    $statusLabels = [
        'backlog' => 'ברשימת המתנה',
        'not_started' => 'לא התחיל',
        'in_progress' => 'בביצוע',
        'review' => 'בבדיקה'
    ];

    // Build task list HTML
    $taskListHtml = '';

    // Overdue tasks (red alert)
    if (!empty($taskStats['overdue'])) {
        $taskListHtml .= '
        <div style="background: #fef2f2; border-right: 4px solid #ef4444; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #991b1b; margin: 0 0 10px 0; font-size: 16px;">🚨 משימות באיחור (' . count($taskStats['overdue']) . ')</h3>
            <div style="color: #7f1d1d; font-size: 13px; margin-bottom: 10px;">משימות אלו עברו את תאריך היעד!</div>';

        foreach ($taskStats['overdue'] as $task) {
            $taskListHtml .= buildTaskHtml($task, $priorityLabels, $statusLabels, true);
        }

        $taskListHtml .= '</div>';
    }

    // Due today tasks (orange alert)
    if (!empty($taskStats['dueToday'])) {
        $taskListHtml .= '
        <div style="background: #fffbeb; border-right: 4px solid #f59e0b; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #92400e; margin: 0 0 10px 0; font-size: 16px;">⚠️ משימות לביצוע היום (' . count($taskStats['dueToday']) . ')</h3>';

        foreach ($taskStats['dueToday'] as $task) {
            $taskListHtml .= buildTaskHtml($task, $priorityLabels, $statusLabels, false);
        }

        $taskListHtml .= '</div>';
    }

    // This week tasks
    if (!empty($taskStats['thisWeek'])) {
        $taskListHtml .= '
        <div style="background: #eff6ff; border-right: 4px solid #3b82f6; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #1e40af; margin: 0 0 10px 0; font-size: 16px;">📅 משימות השבוע (' . count($taskStats['thisWeek']) . ')</h3>';

        foreach ($taskStats['thisWeek'] as $task) {
            $taskListHtml .= buildTaskHtml($task, $priorityLabels, $statusLabels, false);
        }

        $taskListHtml .= '</div>';
    }

    // No due date tasks
    if (!empty($taskStats['noDueDate'])) {
        $taskListHtml .= '
        <div style="background: #f9fafb; border-right: 4px solid #9ca3af; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #374151; margin: 0 0 10px 0; font-size: 16px;">📋 משימות ללא תאריך יעד (' . count($taskStats['noDueDate']) . ')</h3>';

        foreach ($taskStats['noDueDate'] as $task) {
            $taskListHtml .= buildTaskHtml($task, $priorityLabels, $statusLabels, false);
        }

        $taskListHtml .= '</div>';
    }

    // Build email HTML
    $message = '
    <html>
      <head>
        <meta charset="UTF-8">
      </head>
      <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; direction: rtl;">
        <div style="max-width: 700px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 26px;">📊 סיכום משימות יומי</h1>
            <p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 14px;">היי ' . htmlspecialchars($user['full_name']) . ', הנה המשימות הפתוחות שלך</p>
          </div>

          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">

            <!-- Summary Stats -->
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 30px;">
              <div style="background: white; padding: 20px; border-radius: 8px; text-align: center; border: 1px solid #e5e7eb;">
                <div style="font-size: 32px; font-weight: bold; color: #667eea;">' . $totalTasks . '</div>
                <div style="color: #6b7280; font-size: 14px;">סה"כ משימות פתוחות</div>
              </div>
              <div style="background: white; padding: 20px; border-radius: 8px; text-align: center; border: 1px solid #e5e7eb;">
                <div style="font-size: 32px; font-weight: bold; color: #ef4444;">' . count($taskStats['overdue']) . '</div>
                <div style="color: #6b7280; font-size: 14px;">משימות באיחור</div>
              </div>
            </div>

            <!-- Task Lists -->
            ' . $taskListHtml . '

            <!-- Footer -->
            <div style="background: #e0e7ff; padding: 15px; border-radius: 8px; border-right: 3px solid #667eea; margin-top: 30px;">
              <p style="margin: 0; color: #4338ca; font-size: 14px; font-weight: 500;">
                💡 היכנס למערכת TaskFlow כדי לעדכן את המשימות שלך
              </p>
            </div>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

            <p style="font-size: 12px; color: #9ca3af; margin: 0; text-align: center;">
              זוהי התראה אוטומטית מ-TaskFlow. אנא אל תשיב למייל זה.<br>
              סיכום זה נשלח ב-' . date('d/m/Y H:i') . '
            </p>
          </div>
        </div>
      </body>
    </html>';

    // Send email
    $emailData = [
        'to' => $user['email'],
        'subject' => $subject,
        'message' => $message,
        'replyTo' => $user['email']
    ];

    $baseUrl = 'https://ikosher.me';
    $sendMailUrl = '/TaskFlow/send_mail.php';
    $fullUrl = $baseUrl . $sendMailUrl;

    logDigest("Sending digest email to: {$user['email']}");

    $ch = curl_init($fullUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($emailData));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Content-Length: ' . strlen(json_encode($emailData))
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($curlError) {
        logDigest("cURL Error: $curlError", 'ERROR');
        return false;
    }

    if ($httpCode === 200) {
        $result = json_decode($response, true);
        $success = $result['success'] ?? false;
        logDigest("Email send result: " . ($success ? 'SUCCESS' : 'FAILED'));
        return $success;
    }

    logDigest("HTTP request failed with code: $httpCode", 'ERROR');
    return false;
}

/**
 * Build HTML for a single task
 */
function buildTaskHtml($task, $priorityLabels, $statusLabels, $isOverdue = false) {
    $priorityColors = [
        'low' => '#10b981',
        'medium' => '#f59e0b',
        'high' => '#f97316',
        'urgent' => '#ef4444'
    ];

    $priorityColor = $priorityColors[$task['priority']] ?? '#f59e0b';
    $priorityLabel = $priorityLabels[$task['priority']] ?? 'בינונית';
    $statusLabel = $statusLabels[$task['status']] ?? $task['status'];

    $dueDateHtml = '';
    if ($task['due_date']) {
        $dueDateFormatted = date('d/m/Y', strtotime($task['due_date']));
        $dueDateHtml = '<span style="color: #6b7280; font-size: 12px;">📅 ' . $dueDateFormatted . '</span>';
    }

    return '
    <div style="background: white; padding: 12px; border-radius: 6px; margin-bottom: 10px; border: 1px solid #e5e7eb;">
        <div style="font-weight: 600; color: #1f2937; margin-bottom: 5px;">' . htmlspecialchars($task['title']) . '</div>
        <div style="font-size: 12px; color: #6b7280; margin-bottom: 5px;">פרויקט: ' . htmlspecialchars($task['project_name']) . '</div>
        <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
            <span style="display: inline-block; padding: 3px 8px; border-radius: 12px; background-color: ' . $priorityColor . '20; color: ' . $priorityColor . '; font-size: 11px; font-weight: 500;">
                🚩 ' . $priorityLabel . '
            </span>
            <span style="color: #6b7280; font-size: 12px;">📊 ' . $statusLabel . '</span>
            ' . $dueDateHtml . '
        </div>
    </div>';
}

/**
 * Get incomplete tasks for a user with statistics
 */
function getUserIncompleteTasks($conn, $userId) {
    $stmt = $conn->prepare("
        SELECT t.*, p.name as project_name
        FROM tasks t
        LEFT JOIN projects p ON t.project_id = p.id
        WHERE t.assigned_to = ?
        AND t.status != 'done'
        ORDER BY
            CASE
                WHEN t.due_date IS NOT NULL AND t.due_date < CURDATE() THEN 1
                WHEN t.due_date = CURDATE() THEN 2
                WHEN t.priority = 'urgent' THEN 3
                WHEN t.priority = 'high' THEN 4
                ELSE 5
            END,
            t.due_date ASC,
            t.priority DESC
    ");

    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    $tasks = $result->fetch_all(MYSQLI_ASSOC);

    // Categorize tasks
    $stats = [
        'overdue' => [],
        'dueToday' => [],
        'thisWeek' => [],
        'noDueDate' => []
    ];

    $today = date('Y-m-d');
    $endOfWeek = date('Y-m-d', strtotime('+7 days'));

    foreach ($tasks as $task) {
        if (!$task['due_date']) {
            $stats['noDueDate'][] = $task;
        } elseif ($task['due_date'] < $today) {
            $stats['overdue'][] = $task;
        } elseif ($task['due_date'] === $today) {
            $stats['dueToday'][] = $task;
        } elseif ($task['due_date'] <= $endOfWeek) {
            $stats['thisWeek'][] = $task;
        } else {
            $stats['noDueDate'][] = $task;
        }
    }

    return ['tasks' => $tasks, 'stats' => $stats];
}

// ========== MAIN EXECUTION ==========

logDigest("========================================");
logDigest("=== DAILY TASK DIGEST STARTED ===");
logDigest("========================================");

$conn = getDBConnection();

if (!$conn) {
    logDigest("Database connection failed", 'ERROR');
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database connection failed']);
    exit;
}

// Check if this is a test run for specific user
$isTest = isset($_GET['test']) && $_GET['test'] == '1';
$testUserId = isset($_GET['user_id']) ? intval($_GET['user_id']) : null;

if ($isTest) {
    logDigest("Running in TEST mode" . ($testUserId ? " for user ID: $testUserId" : ""));
}

// Get users to process
if ($testUserId) {
    $stmt = $conn->prepare("SELECT id, email, full_name, username FROM users WHERE id = ? AND is_active = 1");
    $stmt->bind_param("i", $testUserId);
} else {
    $stmt = $conn->prepare("SELECT id, email, full_name, username FROM users WHERE is_active = 1");
}

$stmt->execute();
$result = $stmt->get_result();
$users = $result->fetch_all(MYSQLI_ASSOC);

logDigest("Found " . count($users) . " active user(s) to process");

$successCount = 0;
$failCount = 0;
$skippedCount = 0;

foreach ($users as $user) {
    logDigest("Processing user: {$user['username']} ({$user['email']})");

    // Get user's incomplete tasks
    $taskData = getUserIncompleteTasks($conn, $user['id']);
    $tasks = $taskData['tasks'];
    $stats = $taskData['stats'];

    if (empty($tasks)) {
        logDigest("User has no incomplete tasks, skipping");
        $skippedCount++;
        continue;
    }

    logDigest("User has " . count($tasks) . " incomplete tasks");
    logDigest("  - Overdue: " . count($stats['overdue']));
    logDigest("  - Due today: " . count($stats['dueToday']));
    logDigest("  - This week: " . count($stats['thisWeek']));
    logDigest("  - No due date: " . count($stats['noDueDate']));

    // Send digest email
    if (sendDailyDigestEmail($user, $tasks, $stats)) {
        $successCount++;
        logDigest("✓ Successfully sent digest to {$user['email']}");
    } else {
        $failCount++;
        logDigest("✗ Failed to send digest to {$user['email']}", 'ERROR');
    }
}

closeDBConnection($conn);

logDigest("========================================");
logDigest("=== DAILY TASK DIGEST COMPLETED ===");
logDigest("Total users processed: " . count($users));
logDigest("Emails sent: $successCount");
logDigest("Emails failed: $failCount");
logDigest("Users skipped (no tasks): $skippedCount");
logDigest("========================================\n");

// Return JSON response
header('Content-Type: application/json');
echo json_encode([
    'success' => true,
    'summary' => [
        'total_users' => count($users),
        'emails_sent' => $successCount,
        'emails_failed' => $failCount,
        'users_skipped' => $skippedCount,
        'test_mode' => $isTest
    ]
]);
?>
