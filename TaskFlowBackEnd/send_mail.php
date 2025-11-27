<?php  
ini_set('display_errors', 1);  
error_reporting(E_ALL);

require 'PHPMailer/src/PHPMailer.php';  
require 'PHPMailer/src/SMTP.php';  
require 'PHPMailer/src/Exception.php';  

use PHPMailer\PHPMailer\PHPMailer;  
use PHPMailer\PHPMailer\Exception;  

function sanitize_input($data) {  
    return htmlspecialchars(stripslashes(trim($data)));  
}  

function log_error($message) {  
    error_log(date("[Y-m-d H:i:s] ") . $message . "\n", 3, __DIR__ . "/mail_error.log");  
}  

/**
 * Reusable mail sending function
 */
function send_mail($to, $subject, $message, $replyTo = null) {
    // Validate
    if (empty($to)) 
        return [ 'success' => false, 'message' => "Recipient email ('to') is required" ];
    
    if (!filter_var($to, FILTER_VALIDATE_EMAIL)) 
        return [ 'success' => false, 'message' => "Invalid recipient email format" ];
    
    if (empty($message)) 
        return [ 'success' => false, 'message' => "Message content is required" ];

    if ($replyTo === null) {
        $replyTo = $to;
    }

    try {
        $mail = new PHPMailer(true);
        $mail->isSMTP();
        $mail->Host = 'smtp.hostinger.com';
        $mail->SMTPAuth = true;
        $mail->Username = 'itapi@ikosher.me';
        $mail->Password = 'Itapi123!';
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port = 587;
        $mail->CharSet = 'UTF-8';

        $mail->setFrom('itapi@ikosher.me', 'TaskFlow');
        $mail->addAddress($to);
        $mail->addReplyTo($replyTo);

        $mail->isHTML(true);
        $mail->Subject = $subject ?: 'No Subject';
        $mail->Body = $message;
        $mail->AltBody = strip_tags($message);

        $mail->send();

        return [ 'success' => true, 'message' => 'Email sent successfully' ];
    } 
    catch (Exception $e) {
        $err = "Mail error: " . $mail->ErrorInfo;
        log_error($err);
        return [ 'success' => false, 'message' => $err ];
    }
}

/**
 * Handle POST JSON request like before
 */
if ($_SERVER["REQUEST_METHOD"] === "POST") {
    header('Content-Type: application/json');
    header('Cache-Control: no-cache');
    flush();

    $json_input = file_get_contents('php://input');
    $data = json_decode($json_input, true);

    if ($data === null) {
        echo json_encode(['success' => false, 'message' => 'Invalid JSON']);
        exit;
    }

    $to = isset($data['to']) ? sanitize_input($data['to']) : '';
    $subject = isset($data['subject']) ? sanitize_input($data['subject']) : 'No Subject';
    $message = isset($data['message']) ? $data['message'] : '';
    $replyTo = isset($data['replyTo']) ? sanitize_input($data['replyTo']) : null;

    $result = send_mail($to, $subject, $message, $replyTo);
    echo json_encode($result);
    exit;
}

?>
