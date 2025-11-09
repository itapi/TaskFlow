<?php
// auth_middleware.php - Authentication middleware for API endpoints

$SECRET_KEY = 'TaskFlow_Secret_Key_2025'; // In production, use environment variable

function authenticateUser() {
    global $SECRET_KEY;

    $token = getTokenFromHeaders();

    if (!$token) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Authentication required']);
        exit;
    }

    $userData = verifyToken($token, $SECRET_KEY);

    if (!$userData) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Invalid or expired token']);
        exit;
    }

    return $userData;
}

function getTokenFromHeaders() {
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';

    if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        return $matches[1];
    }

    return null;
}

function verifyToken($token, $secretKey) {
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        return false;
    }

    $header = base64_decode(str_replace(['-', '_'], ['+', '/'], $parts[0]));
    $payload = base64_decode(str_replace(['-', '_'], ['+', '/'], $parts[1]));
    $signature = base64_decode(str_replace(['-', '_'], ['+', '/'], $parts[2]));

    $expectedSignature = hash_hmac('sha256', $parts[0] . "." . $parts[1], $secretKey, true);

    if (!hash_equals($signature, $expectedSignature)) {
        return false;
    }

    $payloadData = json_decode($payload, true);
    if (!$payloadData || $payloadData['exp'] < time()) {
        return false;
    }

    return $payloadData;
}

function generateToken($user, $secretKey) {
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

    $signature = hash_hmac('sha256', $headerEncoded . "." . $payloadEncoded, $secretKey, true);
    $signatureEncoded = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));

    return $headerEncoded . "." . $payloadEncoded . "." . $signatureEncoded;
}
?>
