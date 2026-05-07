<?php
// ===== AWS BEDROCK LLM PROXY =====
// Forwards chat requests to Claude Sonnet 4.6 on AWS Bedrock.
// Rate limited to 200 calls/day. Logs to /../data/ai.log.
// Only accepts requests from adfreeapps.com.

// ===== CONFIGURATION =====
// AWS credentials are loaded from /../data/aws_credentials.php, which lives
// one level above the web root and is therefore not directly accessible over HTTP.
//
// HOW TO CREATE THE CREDENTIALS FILE
// -----------------------------------
// 1. Log in to the AWS Console → IAM → Users → your user → Security credentials.
//    Create an Access Key (type: "Application running outside AWS").
//    Copy the Access Key ID and Secret Access Key — the secret is shown only once.
//
// 2. SSH (or SFTP) into your server and create the file at the path below.
//    The directory already exists because the rate-limit counter and log live there.
//
//      nano /path/to/site/../data/aws_credentials.php
//
//    Paste exactly this content, replacing the placeholder values:
//
//      <?php
//      define('AWS_ACCESS_KEY_ID',     'AKIAIOSFODNN7EXAMPLE');
//      define('AWS_SECRET_ACCESS_KEY', 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY');
//
// 3. Lock down the file so only the web-server user can read it:
//
//      chmod 640 /path/to/site/../data/aws_credentials.php
//      chown root:www-data /path/to/site/../data/aws_credentials.php
//
// 4. Make sure /../data/ is NOT inside a directory served by your web server
//    (i.e. it must be outside the document root).  If your document root is
//    /var/www/html then this file would live at /var/www/data/aws_credentials.php.
//
// 5. Never commit the real credentials file to version control.
//    Add the following line to your .gitignore if data/ is ever inside the repo:
//
//      /data/aws_credentials.php

define('DATA_DIR',   __DIR__ . '/../data');
define('LOG_FILE',   DATA_DIR . '/ai.log');
define('COUNT_FILE', DATA_DIR . '/ai_count.json');

$credentialsFile = DATA_DIR . '/aws_credentials.php';
if (!file_exists($credentialsFile)) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Server configuration error: credentials file not found.']);
    exit;
}
require $credentialsFile;

define('AWS_REGION',   'us-west-1');
define('AWS_MODEL_ID', 'us.anthropic.claude-sonnet-4-6');
define('ALLOWED_ORIGIN',    'https://adfreeapps.com');
define('MAX_CALLS_PER_DAY', 200);
define('MAX_INPUT_CHARS',   12000);  // max combined input characters

// ===== CORS / ORIGIN CHECK =====
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== ALLOWED_ORIGIN) {
    http_response_code(403);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Forbidden']);
    exit;
}

header('Access-Control-Allow-Origin: ' . ALLOWED_ORIGIN);
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// ===== RATE LIMITING =====
function loadCountData() {
    if (!file_exists(COUNT_FILE)) return ['date' => '', 'count' => 0];
    $raw = @file_get_contents(COUNT_FILE);
    if ($raw === false) return ['date' => '', 'count' => 0];
    return json_decode($raw, true) ?: ['date' => '', 'count' => 0];
}

function saveCountData($data) {
    @file_put_contents(COUNT_FILE, json_encode($data), LOCK_EX);
}

$today = gmdate('Y-m-d');
$countData = loadCountData();
if ($countData['date'] !== $today) {
    $countData = ['date' => $today, 'count' => 0];
}

if ($countData['count'] >= MAX_CALLS_PER_DAY) {
    http_response_code(429);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Daily request limit reached. Please try again tomorrow.']);
    aiLog('RATE_LIMITED', '', 0);
    exit;
}

// ===== PARSE REQUEST =====
$rawBody = file_get_contents('php://input');
if ($rawBody === false || $rawBody === '') {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Empty request body']);
    exit;
}

$input = json_decode($rawBody, true);
if (!is_array($input)) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Invalid JSON']);
    exit;
}

$messages  = $input['messages']  ?? [];
$system    = $input['system']    ?? null;
$maxTokens = isset($input['max_tokens']) ? (int)$input['max_tokens'] : 2048;
$maxTokens = max(64, min(4096, $maxTokens));

if (!is_array($messages) || count($messages) === 0) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'messages array is required']);
    exit;
}

// ===== INPUT SIZE LIMIT =====
$totalChars = 0;
foreach ($messages as $msg) {
    $totalChars += strlen($msg['content'] ?? '');
}
if ($system) {
    $totalChars += strlen($system);
}

if ($totalChars > MAX_INPUT_CHARS) {
    http_response_code(413);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Input too large. Please shorten your notes or topic.']);
    exit;
}

// ===== BEDROCK REQUEST =====
$bedrockBody = [
    'anthropic_version' => 'bedrock-2023-05-31',
    'max_tokens'        => $maxTokens,
    'messages'          => $messages,
];
if ($system) {
    $bedrockBody['system'] = $system;
}

$bodyJson   = json_encode($bedrockBody);
// Keep model ID unencoded in the URL: ':' is a valid RFC 3986 path character.
// SigV4 canonical URI encoding is applied separately inside awsBedrockPost().
$endpoint   = 'https://bedrock-runtime.' . AWS_REGION . '.amazonaws.com/model/' . AWS_MODEL_ID . '/invoke';

$bedrockHttpCode = 0;
$responseBody = awsBedrockPost($endpoint, $bodyJson, $bedrockHttpCode);
if ($responseBody === false) {
    http_response_code(502);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Failed to reach AWS Bedrock']);
    aiLog('BEDROCK_CURL_ERROR', '', $totalChars);
    exit;
}

$bedrockResponse = json_decode($responseBody, true);
if (!is_array($bedrockResponse)) {
    http_response_code(502);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Invalid response from AWS Bedrock']);
    aiLog('BEDROCK_PARSE_ERROR', 'HTTP ' . $bedrockHttpCode . ' | ' . substr($responseBody, 0, 300), $totalChars);
    exit;
}

// ===== EXTRACT CONTENT =====
$content = '';
if ($bedrockHttpCode >= 200 && $bedrockHttpCode < 300 &&
    isset($bedrockResponse['content']) && is_array($bedrockResponse['content'])) {
    foreach ($bedrockResponse['content'] as $block) {
        if (($block['type'] ?? '') === 'text') {
            $content .= $block['text'];
        }
    }
} else {
    // Extract the error message from the AWS response.
    // Bedrock Runtime REST errors use {"message":"..."} or {"Message":"..."}.
    // Older / wrapped error shapes use {"error":{"message":"..."}}.
    $errMsg = $bedrockResponse['message']
           ?? $bedrockResponse['Message']
           ?? ($bedrockResponse['error']['message'] ?? null)
           ?? ('HTTP ' . $bedrockHttpCode);
    http_response_code(502);
    header('Content-Type: application/json');
    echo json_encode(['error' => $errMsg]);
    aiLog('BEDROCK_ERROR', 'HTTP ' . $bedrockHttpCode . ' | ' . $errMsg, $totalChars);
    exit;
}

// ===== INCREMENT COUNTER & LOG =====
$countData['count']++;
saveCountData($countData);
aiLog('OK', '', $totalChars);

// ===== RESPOND =====
header('Content-Type: application/json');
echo json_encode(['content' => $content]);
exit;

// ===== HELPERS =====

function aiLog($status, $detail, $inputChars) {
    $line = implode(' | ', [
        gmdate('Y-m-d H:i:s'),
        $status,
        'ip=' . ($_SERVER['REMOTE_ADDR'] ?? '-'),
        'chars=' . $inputChars,
        $detail ? 'detail=' . str_replace(["\n", "\r"], ' ', $detail) : '',
    ]);
    @file_put_contents(LOG_FILE, trim($line) . "\n", FILE_APPEND | LOCK_EX);
}

// Signs and posts a request to AWS Bedrock Runtime.
// Returns the response body string on any HTTP response, or false on a curl-level failure.
// $httpCode is an output parameter set to the HTTP status code returned by AWS.
function awsBedrockPost($url, $body, &$httpCode = 0) {
    $service   = 'bedrock';  // SigV4 service name for Bedrock Runtime is 'bedrock', not 'bedrock-runtime'
    $region    = AWS_REGION;
    $accessKey = AWS_ACCESS_KEY_ID;
    $secretKey = AWS_SECRET_ACCESS_KEY;

    $parsedUrl = parse_url($url);
    $host      = $parsedUrl['host'];
    $rawPath   = $parsedUrl['path'];

    // SigV4 canonical URI: encode every character that is not an RFC 3986 unreserved
    // character (A-Z, a-z, 0-9, -, _, ., ~) or a path separator ('/').
    // This converts ':' -> '%3A', '%' -> '%25', etc., matching exactly what AWS
    // computes from the raw path it receives in the HTTP request.
    $canonicalPath = preg_replace_callback(
        '/[^A-Za-z0-9\-_.~\/]/',
        function ($m) { return rawurlencode($m[0]); },
        $rawPath
    );

    $amzDate   = gmdate('Ymd\THis\Z');
    $dateStamp = gmdate('Ymd');

    $contentType  = 'application/json';
    $payloadHash  = hash('sha256', $body);

    $canonicalHeaders =
        'content-type:' . $contentType . "\n" .
        'host:' . $host . "\n" .
        'x-amz-date:' . $amzDate . "\n";

    $signedHeaders = 'content-type;host;x-amz-date';

    $canonicalRequest = implode("\n", [
        'POST',
        $canonicalPath,
        '',  // no query string
        $canonicalHeaders,
        $signedHeaders,
        $payloadHash,
    ]);

    $credentialScope = implode('/', [$dateStamp, $region, $service, 'aws4_request']);
    $stringToSign    = implode("\n", [
        'AWS4-HMAC-SHA256',
        $amzDate,
        $credentialScope,
        hash('sha256', $canonicalRequest),
    ]);

    // Derive signing key: HMAC chain - each step uses previous result as key
    $kDate      = hmacSha256('AWS4' . $secretKey, $dateStamp, true);
    $kRegion    = hmacSha256($kDate,    $region,       true);
    $kService   = hmacSha256($kRegion,  $service,      true);
    $signingKey = hmacSha256($kService, 'aws4_request', true);
    $signature   = hash_hmac('sha256', $stringToSign, $signingKey);

    $authHeader = 'AWS4-HMAC-SHA256 Credential=' . $accessKey . '/' . $credentialScope .
                  ', SignedHeaders=' . $signedHeaders .
                  ', Signature=' . $signature;

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $body,
        CURLOPT_TIMEOUT        => 60,
        CURLOPT_SSL_VERIFYHOST => 2,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_HTTPHEADER     => [
            'Content-Type: '    . $contentType,
            'X-Amz-Date: '      . $amzDate,
            'Authorization: '   . $authHeader,
        ],
    ]);

    $result = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($result === false) {
        return false;  // curl-level failure (no network, SSL error, etc.)
    }
    return $result;  // return body for all HTTP responses so caller can log the error
}

function hmacSha256($key, $data, $raw = false) {
    return hash_hmac('sha256', $data, $key, $raw);
}
