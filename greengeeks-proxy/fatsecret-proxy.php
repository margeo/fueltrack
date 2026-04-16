<?php
// FuelTrack — FatSecret proxy (GreenGeeks)
//
// Κάθεται στο https://api.fueltrack.me/fatsecret-proxy.php και
// προωθεί search queries στο FatSecret OAuth 2.0 REST API. Σκοπός
// του είναι να δώσει σταθερή outbound IP στο FatSecret whitelist —
// το Netlify Lambda περιστρέφεται σε dynamic AWS IPs και δεν
// δουλεύει. Εδώ όλα τα calls βγαίνουν από τη σταθερή GreenGeeks IP
// (107.6.176.102) η οποία είναι η μόνη που πρέπει να είναι
// whitelisted στο FatSecret IP Restrictions.
//
// Call από Netlify Function:
//   GET  https://api.fueltrack.me/fatsecret-proxy.php?q=big+mac
//   Header: X-Proxy-Secret: <shared-secret>
//
// Απόκριση: ότι ακριβώς επιστρέφει το FatSecret (foods.search JSON)
// ή { "error": "..." } σε αποτυχία.

require_once __DIR__ . '/_config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// 1. Shared-secret gate — μόνο το Netlify ξέρει το secret. Χωρίς
// αυτό, οποιοσδήποτε θα μπορούσε να βρει το endpoint και να
// εξαντλήσει το FatSecret rate limit σου.
$provided = isset($_SERVER['HTTP_X_PROXY_SECRET']) ? $_SERVER['HTTP_X_PROXY_SECRET'] : '';
if (!hash_equals(FATSECRET_PROXY_SECRET, $provided)) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

// 2. Sanitize query
$query = isset($_GET['q']) ? trim($_GET['q']) : '';
if ($query === '' || strlen($query) < 2) {
    echo json_encode(['foods' => ['food' => []]]);
    exit;
}
if (strlen($query) > 100) {
    http_response_code(400);
    echo json_encode(['error' => 'Query too long']);
    exit;
}

// 3. FatSecret OAuth 2.0 — client credentials flow
$token = fatsecret_token();
if (!$token) {
    http_response_code(502);
    echo json_encode(['error' => 'FatSecret token failed']);
    exit;
}

// 4. Search
$url = 'https://platform.fatsecret.com/rest/server.api'
    . '?method=foods.search'
    . '&search_expression=' . rawurlencode($query)
    . '&format=json'
    . '&max_results=10';

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Bearer ' . $token]);
curl_setopt($ch, CURLOPT_TIMEOUT, 8);
$body = curl_exec($ch);
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$err = curl_error($ch);
curl_close($ch);

if ($err) {
    http_response_code(502);
    echo json_encode(['error' => 'FatSecret request error: ' . $err]);
    exit;
}

http_response_code($status ?: 200);
echo $body !== false ? $body : json_encode(['error' => 'Empty response']);

// ---------------------------------------------------------------
// Helpers

function fatsecret_token() {
    // Simple file-backed cache — tokens live 24h. Saves ~1 OAuth
    // call per search query (otherwise the token request would fire
    // every time the Lambda cold-starts us).
    $cache = sys_get_temp_dir() . '/fueltrack_fatsecret_token.cache';
    if (is_file($cache)) {
        $data = @json_decode(@file_get_contents($cache), true);
        if (is_array($data) && isset($data['token'], $data['exp']) && time() < $data['exp']) {
            return $data['token'];
        }
    }

    $ch = curl_init('https://oauth.fatsecret.com/connect/token');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_USERPWD, FATSECRET_CLIENT_ID . ':' . FATSECRET_CLIENT_SECRET);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/x-www-form-urlencoded']);
    curl_setopt($ch, CURLOPT_POSTFIELDS, 'grant_type=client_credentials&scope=basic');
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    $res = curl_exec($ch);
    $err = curl_error($ch);
    curl_close($ch);

    if ($err || !$res) return null;
    $data = json_decode($res, true);
    if (!is_array($data) || empty($data['access_token'])) return null;

    $ttl = isset($data['expires_in']) ? max(60, (int)$data['expires_in'] - 60) : 3600;
    @file_put_contents($cache, json_encode([
        'token' => $data['access_token'],
        'exp' => time() + $ttl,
    ]));
    return $data['access_token'];
}
