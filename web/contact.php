<?php
// Contact endpoint for the beeper form (web/js/beeper.js).
// The recipient is fixed here on the server, so the form can't be used to email anyone else.
declare(strict_types=1);

// Never print warnings into the JSON response (they still go to the PHP error log)
ini_set('display_errors', '0');

const TO_EMAIL     = 'hardstonepaul@gmail.com';
const FROM_EMAIL   = 'no-reply@jowui.com'; // an address on this domain, so the mail passes SPF
const SITE_NAME    = 'HardStone Portfolio';
const MAX_PER_HOUR = 5;                    // per visitor IP

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function reply(int $status, array $body): never
{
    http_response_code($status);
    echo json_encode($body);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    reply(405, ['ok' => false, 'error' => 'method']);
}

// Only accept posts from this site
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$host = strtok($_SERVER['HTTP_HOST'] ?? '', ':');
if ($origin !== '' && parse_url($origin, PHP_URL_HOST) !== $host) {
    reply(403, ['ok' => false, 'error' => 'origin']);
}

// Honeypot: real visitors never fill the hidden "website" field
if (trim((string) ($_POST['website'] ?? '')) !== '') {
    reply(200, ['ok' => true]);
}

// One line, no control characters (blocks header injection)
$line = static fn(string $s, int $max): string =>
    trim(mb_substr(preg_replace('/[\x00-\x1F\x7F]+/u', ' ', $s) ?? '', 0, $max));

$name    = $line((string) ($_POST['name'] ?? ''), 60);
$email   = $line((string) ($_POST['email'] ?? ''), 120);
$message = trim(mb_substr((string) ($_POST['message'] ?? ''), 0, 1000));

if ($name === '' || $message === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    reply(422, ['ok' => false, 'error' => 'invalid']);
}

// Rate limit: timestamps per IP in the system temp folder
$file = sys_get_temp_dir() . '/hs-contact-' . hash('sha256', $_SERVER['REMOTE_ADDR'] ?? 'unknown') . '.json';
$now = time();
$hits = is_file($file) ? (json_decode((string) file_get_contents($file), true) ?: []) : [];
$hits = array_values(array_filter($hits, static fn($t) => is_int($t) && $t > $now - 3600));
if (count($hits) >= MAX_PER_HOUR) {
    reply(429, ['ok' => false, 'error' => 'rate']);
}
$hits[] = $now;
file_put_contents($file, json_encode($hits), LOCK_EX);

$subject = mb_encode_mimeheader('Portfolio contact from ' . $name, 'UTF-8');
$body = "Name: {$name}\nEmail: {$email}\n\n{$message}\n\n--\nSent from the beeper on " . ($host ?: 'the portfolio') . "\n";
$headers = [
    'From'                      => SITE_NAME . ' <' . FROM_EMAIL . '>',
    'Reply-To'                  => $email,
    'Content-Type'              => 'text/plain; charset=UTF-8',
    'Content-Transfer-Encoding' => '8bit',
];

$sent = mail(TO_EMAIL, $subject, $body, $headers, '-f' . FROM_EMAIL);
reply($sent ? 200 : 500, ['ok' => $sent, 'error' => $sent ? null : 'mail']);
