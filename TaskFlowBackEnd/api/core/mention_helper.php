<?php

/**
 * Mention Helper
 * Handles @mention detection and email notifications
 */

// Log file path
define('MENTION_LOG_FILE', __DIR__ . '/../../mention_notifications.log');

/**
 * Log mention activity
 */
function logMention($message, $level = 'INFO') {
    $timestamp = date('Y-m-d H:i:s');
    $logMessage = "[$timestamp] [$level] $message\n";
    file_put_contents(MENTION_LOG_FILE, $logMessage, FILE_APPEND);
}

/**
 * Extract mentioned user IDs from HTML content
 * Looks for data-user-id attributes in mention spans
 *
 * @param string $htmlContent HTML content from Jodit editor
 * @return array Array of unique user IDs
 */
function extractMentionUserIds($htmlContent) {
    logMention("=== Extracting mention user IDs ===");
    logMention("Content length: " . strlen($htmlContent));
    logMention("Content preview: " . substr($htmlContent, 0, 200));

    if (empty($htmlContent)) {
        logMention("Content is empty, returning empty array");
        return [];
    }

    $userIds = [];

    // Match data-user-id="123" in HTML
    preg_match_all('/data-user-id=["\'](\d+)["\']/', $htmlContent, $matches);

    if (!empty($matches[1])) {
        $userIds = array_unique(array_map('intval', $matches[1]));
        logMention("Found user IDs from data-user-id: " . implode(', ', $userIds));
    }

    // Fallback: extract @username mentions
    if (empty($userIds)) {
        preg_match_all('/@(\w+)/', $htmlContent, $usernameMatches);
        if (!empty($usernameMatches[1])) {
            // We have usernames, need to convert to IDs later
            logMention("Found usernames: " . implode(', ', $usernameMatches[1]));
            return ['usernames' => array_unique($usernameMatches[1])];
        }
    }

    logMention("Returning user IDs: " . (empty($userIds) ? 'none' : implode(', ', $userIds)));
    return $userIds;
}

/**
 * Get mentioned users from database
 *
 * @param mysqli $conn Database connection
 * @param string $htmlContent HTML content with mentions
 * @return array Array of user objects with id, email, full_name, username
 */
function getMentionedUsers($conn, $htmlContent) {
    logMention("=== Getting mentioned users from DB ===");
    $userIds = extractMentionUserIds($htmlContent);

    if (empty($userIds)) {
        logMention("No user IDs found, returning empty array");
        return [];
    }

    // If we got usernames instead of IDs, convert them
    if (isset($userIds['usernames'])) {
        $usernames = $userIds['usernames'];
        logMention("Querying by usernames: " . implode(', ', $usernames));
        $placeholders = implode(',', array_fill(0, count($usernames), '?'));
        $stmt = $conn->prepare("
            SELECT id, email, full_name, username
            FROM users
            WHERE username IN ($placeholders)
        ");

        $types = str_repeat('s', count($usernames));
        $stmt->bind_param($types, ...$usernames);
        $stmt->execute();
        $result = $stmt->get_result();
        $users = $result->fetch_all(MYSQLI_ASSOC);

        logMention("Found " . count($users) . " users by username");
        foreach ($users as $user) {
            logMention("  - User: {$user['username']} ({$user['email']})");
        }

        return $users;
    }

    // We have user IDs
    logMention("Querying by user IDs: " . implode(', ', $userIds));
    $placeholders = implode(',', array_fill(0, count($userIds), '?'));
    $stmt = $conn->prepare("
        SELECT id, email, full_name, username
        FROM users
        WHERE id IN ($placeholders)
    ");

    $types = str_repeat('i', count($userIds));
    $stmt->bind_param($types, ...$userIds);
    $stmt->execute();
    $result = $stmt->get_result();
    $users = $result->fetch_all(MYSQLI_ASSOC);

    logMention("Found " . count($users) . " users by ID");
    foreach ($users as $user) {
        logMention("  - User: {$user['username']} ({$user['email']})");
    }

    return $users;
}

/**
 * Send mention notification email
 *
 * @param array $user User object with email, full_name
 * @param array $context Context array with type, taskTitle, projectName, mentionedBy, content
 * @return bool Success status
 */
function sendMentionEmail($user, $context) {
    logMention("=== Sending email to {$user['email']} ===");
    logMention("User: {$user['username']} / {$user['full_name']}");

    $type = $context['type'] ?? 'task';
    $taskTitle = $context['taskTitle'] ?? 'Unknown Task';
    $projectName = $context['projectName'] ?? '';
    $mentionedBy = $context['mentionedBy'] ?? 'Someone';
    $content = $context['content'] ?? '';

    logMention("Type: $type, Task: $taskTitle, By: $mentionedBy");

    // Strip HTML tags for preview
    $contentPreview = strip_tags($content);
    $contentPreview = mb_substr($contentPreview, 0, 200);
    if (mb_strlen(strip_tags($content)) > 200) {
        $contentPreview .= '...';
    }

    // Prepare email subject (Hebrew)
    $subject = $type === 'task'
        ? "אוזכרת במשימה: $taskTitle"
        : "אוזכרת בתגובה על: $taskTitle";

    // Prepare email body (Hebrew HTML)
    $message = '
    <html>
      <head>
        <meta charset="UTF-8">
      </head>
      <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; direction: rtl;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">👋 אוזכרת!</h1>
          </div>

          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
            <p style="font-size: 16px; margin-bottom: 20px;">
              <strong>' . htmlspecialchars($mentionedBy) . '</strong> אזכר אותך ' . ($type === 'task' ? 'במשימה' : 'בתגובה') . ':
            </p>

            <div style="background: white; padding: 20px; border-radius: 8px; border-right: 4px solid #667eea; margin-bottom: 20px;">
              <h2 style="margin: 0 0 10px 0; font-size: 18px; color: #1f2937;">📋 ' . htmlspecialchars($taskTitle) . '</h2>';

    if (!empty($projectName)) {
        $message .= '
              <p style="margin: 5px 0; color: #6b7280; font-size: 14px;">פרויקט: ' . htmlspecialchars($projectName) . '</p>';
    }

    $message .= '
            </div>';

    if ($type === 'comment' && !empty($contentPreview)) {
        $message .= '
            <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #4b5563; font-size: 14px;">' . htmlspecialchars($contentPreview) . '</p>
            </div>';
    }

    $message .= '
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

            <p style="font-size: 12px; color: #9ca3af; margin: 0;">
              זוהי התראה אוטומטית מ-TaskFlow. אנא אל תשיב למייל זה.
            </p>
          </div>
        </div>
      </body>
    </html>';

    // Prepare data for send_mail.php
    $emailData = [
        'to' => $user['email'],
        'subject' => $subject,
        'message' => $message,
        'replyTo' => $user['email']
    ];

    // Call send_mail.php endpoint
    $baseUrl = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http") . "://$_SERVER[HTTP_HOST]";
    // send_mail.php is in TaskFlowBackEnd/ directory, which is at /TaskFlow/send_mail.php from web root
    $sendMailUrl = '/TaskFlow/send_mail.php';
    $fullUrl = $baseUrl . $sendMailUrl;

    logMention("Sending email via: $fullUrl");
    logMention("Email data: " . json_encode(['to' => $emailData['to'], 'subject' => $emailData['subject']]));

    // Use cURL to send email
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

    logMention("HTTP Code: $httpCode");
    logMention("Response: " . substr($response, 0, 500));

    if ($curlError) {
        logMention("cURL Error: $curlError", 'ERROR');
        return false;
    }

    if ($httpCode === 200) {
        $result = json_decode($response, true);
        $success = $result['success'] ?? false;
        logMention("Email send result: " . ($success ? 'SUCCESS' : 'FAILED'));
        if (!$success && isset($result['message'])) {
            logMention("Error message: {$result['message']}", 'ERROR');
        }
        return $success;
    }

    logMention("HTTP request failed with code: $httpCode", 'ERROR');
    return false;
}

/**
 * Process mentions in content and send notifications
 *
 * @param mysqli $conn Database connection
 * @param string $content HTML content with mentions
 * @param string $type Type: 'task' or 'comment'
 * @param string $taskTitle Task title
 * @param string $projectName Project name (optional)
 * @param string $mentionedBy Name of user who mentioned
 * @return int Number of emails sent
 */
function processMentions($conn, $content, $type, $taskTitle, $projectName, $mentionedBy) {
    logMention("========================================");
    logMention("=== PROCESSING MENTIONS ===");
    logMention("Type: $type");
    logMention("Task: $taskTitle");
    logMention("Project: $projectName");
    logMention("Mentioned by: $mentionedBy");
    logMention("========================================");

    $mentionedUsers = getMentionedUsers($conn, $content);

    if (empty($mentionedUsers)) {
        logMention("No mentioned users found, exiting");
        return 0;
    }

    logMention("Processing " . count($mentionedUsers) . " mentioned user(s)");
    $sentCount = 0;

    foreach ($mentionedUsers as $user) {
        $context = [
            'type' => $type,
            'taskTitle' => $taskTitle,
            'projectName' => $projectName,
            'mentionedBy' => $mentionedBy,
            'content' => $content
        ];

        if (sendMentionEmail($user, $context)) {
            $sentCount++;
            logMention("✓ Email sent successfully to {$user['email']}");
        } else {
            logMention("✗ Failed to send email to {$user['email']}", 'ERROR');
            error_log("Failed to send mention email to: " . $user['email']);
        }
    }

    logMention("=== DONE: Sent $sentCount/$" . count($mentionedUsers) . " emails ===");
    logMention("========================================\n");

    return $sentCount;
}

/**
 * Send task assignment notification email
 *
 * @param array $assignedUser User object with email, full_name
 * @param string $taskTitle Task title
 * @param string $projectName Project name
 * @param string $assignedBy Name of user who assigned the task
 * @param string $priority Task priority
 * @param string $dueDate Task due date (optional)
 * @return bool Success status
 */
function sendAssignmentEmail($assignedUser, $taskTitle, $projectName, $assignedBy, $priority = 'medium', $dueDate = null) {
    logMention("=== Sending assignment email to {$assignedUser['email']} ===");
    logMention("Task: $taskTitle, Assigned by: $assignedBy");

    // Priority labels in Hebrew
    $priorityLabels = [
        'low' => 'נמוכה',
        'medium' => 'בינונית',
        'high' => 'גבוהה',
        'urgent' => 'דחופה'
    ];
    $priorityLabel = $priorityLabels[$priority] ?? 'בינונית';

    // Priority colors
    $priorityColors = [
        'low' => '#10b981',
        'medium' => '#f59e0b',
        'high' => '#f97316',
        'urgent' => '#ef4444'
    ];
    $priorityColor = $priorityColors[$priority] ?? '#f59e0b';

    // Format due date if provided
    $dueDateHtml = '';
    if (!empty($dueDate)) {
        $dueDateFormatted = date('d/m/Y', strtotime($dueDate));
        $dueDateHtml = '
              <p style="margin: 5px 0; color: #6b7280; font-size: 14px;">📅 תאריך יעד: ' . htmlspecialchars($dueDateFormatted) . '</p>';
    }

    $subject = "משימה חדשה הוקצתה לך: $taskTitle";

    $message = '
    <html>
      <head>
        <meta charset="UTF-8">
      </head>
      <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; direction: rtl;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">📋 משימה חדשה</h1>
          </div>

          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
            <p style="font-size: 16px; margin-bottom: 20px;">
              <strong>' . htmlspecialchars($assignedBy) . '</strong> הקצה לך משימה חדשה:
            </p>

            <div style="background: white; padding: 20px; border-radius: 8px; border-right: 4px solid #667eea; margin-bottom: 20px;">
              <h2 style="margin: 0 0 10px 0; font-size: 18px; color: #1f2937;">📋 ' . htmlspecialchars($taskTitle) . '</h2>
              <p style="margin: 5px 0; color: #6b7280; font-size: 14px;">פרויקט: ' . htmlspecialchars($projectName) . '</p>
              <p style="margin: 5px 0; font-size: 14px;">
                <span style="display: inline-block; padding: 4px 12px; border-radius: 12px; background-color: ' . $priorityColor . '20; color: ' . $priorityColor . '; font-weight: 500;">
                  🚩 עדיפות: ' . $priorityLabel . '
                </span>
              </p>
              ' . $dueDateHtml . '
            </div>

            <div style="background: #e0e7ff; padding: 15px; border-radius: 8px; border-right: 3px solid #667eea; margin-bottom: 20px;">
              <p style="margin: 0; color: #4338ca; font-size: 14px; font-weight: 500;">
                💡 היכנס למערכת כדי להתחיל לעבוד על המשימה
              </p>
            </div>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

            <p style="font-size: 12px; color: #9ca3af; margin: 0;">
              זוהי התראה אוטומטית מ-TaskFlow. אנא אל תשיב למייל זה.
            </p>
          </div>
        </div>
      </body>
    </html>';

    $emailData = [
        'to' => $assignedUser['email'],
        'subject' => $subject,
        'message' => $message,
        'replyTo' => $assignedUser['email']
    ];

    $baseUrl = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http") . "://$_SERVER[HTTP_HOST]";
    $sendMailUrl = '/TaskFlow/send_mail.php';
    $fullUrl = $baseUrl . $sendMailUrl;

    logMention("Sending assignment email via: $fullUrl");

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

    logMention("HTTP Code: $httpCode");

    if ($curlError) {
        logMention("cURL Error: $curlError", 'ERROR');
        return false;
    }

    if ($httpCode === 200) {
        $result = json_decode($response, true);
        $success = $result['success'] ?? false;
        logMention("Assignment email result: " . ($success ? 'SUCCESS' : 'FAILED'));
        if (!$success && isset($result['message'])) {
            logMention("Error message: {$result['message']}", 'ERROR');
        }
        return $success;
    }

    logMention("HTTP request failed with code: $httpCode", 'ERROR');
    return false;
}

?>
