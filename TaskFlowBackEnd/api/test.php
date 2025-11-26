<?php
// Simple test file to check API setup
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

echo json_encode([
    'success' => true,
    'message' => 'API is working!',
    'php_version' => phpversion(),
    'current_directory' => __DIR__,
    'document_root' => $_SERVER['DOCUMENT_ROOT'] ?? 'Not set',
    'script_filename' => $_SERVER['SCRIPT_FILENAME'] ?? 'Not set',
    'request_uri' => $_SERVER['REQUEST_URI'] ?? 'Not set'
]);
?>