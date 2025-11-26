<?php
// Enable error reporting for debugging (remove in production)
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Get the requested endpoint from the URL
$request = $_SERVER['REQUEST_URI'];
$path = parse_url($request, PHP_URL_PATH);
$pathSegments = explode('/', trim($path, '/'));

// Find the API segment and get the endpoint
$apiIndex = array_search('api', $pathSegments);
if ($apiIndex === false) {
    http_response_code(404);
    echo json_encode(['success' => false, 'error' => 'API endpoint not found']);
    exit;
}

$endpoint = $pathSegments[$apiIndex + 1] ?? '';

// Route to appropriate endpoint
switch ($endpoint) {
    case 'projects':
        require_once 'endpoints/projects.php';
        break;
    case 'tasks':
        require_once 'endpoints/tasks.php';
        break;
    case 'comments':
        require_once 'endpoints/comments.php';
        break;
    case 'users':
        require_once 'endpoints/users.php';
        break;
    case 'activity':
        require_once 'endpoints/activity.php';
        break;
    case 'stats':
        require_once 'endpoints/stats.php';
        break;
    case '':
        // API root - show available endpoints
        echo json_encode([
            'success' => true,
            'message' => 'TaskFlow API v1.0',
            'endpoints' => [
                'projects' => '/api/projects',
                'tasks' => '/api/tasks',
                'comments' => '/api/comments',
                'users' => '/api/users',
                'activity' => '/api/activity',
                'stats' => '/api/stats'
            ],
            'documentation' => '/api/docs'
        ]);
        break;
    default:
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'error' => "Endpoint '$endpoint' not found",
            'available_endpoints' => [
                'projects', 'tasks', 'comments', 'users', 'activity', 'stats'
            ]
        ]);
}
?>