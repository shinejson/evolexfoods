<?php

// Test script for multi-method 2FA and 30-day device remember
$baseUrl = 'http://127.0.0.1:8000/api/v1';

function post($url, $data = [], $token = null) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    $headers = [
        'Content-Type: application/json',
        'Accept: application/json'
    ];
    if ($token) {
        $headers[] = 'Authorization: Bearer ' . $token;
    }
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    $res = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ['status' => $status, 'data' => json_decode($res, true), 'raw' => $res];
}

function get($url, $token = null) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $headers = ['Accept: application/json'];
    if ($token) {
        $headers[] = 'Authorization: Bearer ' . $token;
    }
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    $res = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ['status' => $status, 'data' => json_decode($res, true)];
}

echo "=== TEST 1: Initial Login as owner (2FA disabled) ===\n";
$r = post("$baseUrl/auth/login", ['email' => 'owner@evolex.com', 'password' => 'password']);
echo "Status: " . $r['status'] . "\n";
$token = $r['data']['token'] ?? null;
echo "Token: " . substr($token, 0, 15) . "...\n";
echo "2FA Enabled: " . ($r['data']['user']['two_factor_enabled'] ? 'YES' : 'NO') . "\n\n";

echo "=== TEST 2: Send OTP via Email ===\n";
$r = post("$baseUrl/auth/2fa/send-otp", ['method' => 'email'], $token);
echo "Status: " . $r['status'] . "\n";
echo "Message: " . ($r['data']['message'] ?? 'N/A') . "\n\n";

echo "=== TEST 3: Send OTP via WhatsApp ===\n";
$r = post("$baseUrl/auth/2fa/send-otp", ['method' => 'whatsapp'], $token);
echo "Status: " . $r['status'] . "\n";
echo "Message: " . ($r['data']['message'] ?? 'N/A') . "\n\n";

echo "=== TEST 4: Activate 2FA with Email Method and code 123456 ===\n";
$r = post("$baseUrl/auth/2fa/activate", ['code' => '123456', 'method' => 'email'], $token);
echo "Status: " . $r['status'] . "\n";
echo "Activated Method: " . ($r['data']['user']['two_factor_type'] ?? 'N/A') . "\n";
echo "2FA Enabled: " . ($r['data']['user']['two_factor_enabled'] ? 'YES' : 'NO') . "\n\n";

echo "=== TEST 5: Login with 2FA Email Active (no code sent) ===\n";
$r = post("$baseUrl/auth/login", ['email' => 'owner@evolex.com', 'password' => 'password']);
echo "Status: " . $r['status'] . "\n";
echo "Requires 2FA: " . (($r['data']['requires_2fa'] ?? false) ? 'YES' : 'NO') . "\n";
echo "Method: " . ($r['data']['two_factor_type'] ?? 'N/A') . "\n";
echo "Hint: " . ($r['data']['message'] ?? 'N/A') . "\n\n";

echo "=== TEST 6: Login with code 123456 and remember_device = true ===\n";
$r = post("$baseUrl/auth/login", [
    'email' => 'owner@evolex.com',
    'password' => 'password',
    'code' => '123456',
    'remember_device' => true
]);
echo "Status: " . $r['status'] . "\n";
$deviceToken = $r['data']['device_token'] ?? null;
echo "Device Token issued: " . ($deviceToken ? substr($deviceToken, 0, 15) . '...' : 'NONE') . "\n\n";

echo "=== TEST 7: Login again with device_token (Bypass 2FA for 30 days) ===\n";
$r = post("$baseUrl/auth/login", [
    'email' => 'owner@evolex.com',
    'password' => 'password',
    'device_token' => $deviceToken
]);
echo "Status: " . $r['status'] . "\n";
echo "Requires 2FA: " . (($r['data']['requires_2fa'] ?? false) ? 'YES' : 'NO') . "\n";
echo "Token issued directly: " . (isset($r['data']['token']) ? 'YES' : 'NO') . "\n\n";

echo "=== TEST 8: Switch 2FA Method to WhatsApp ===\n";
$activeToken = $r['data']['token'];
$r = post("$baseUrl/auth/2fa/activate", ['code' => '123456', 'method' => 'whatsapp'], $activeToken);
echo "Status: " . $r['status'] . "\n";
echo "Updated Method: " . ($r['data']['user']['two_factor_type'] ?? 'N/A') . "\n\n";

echo "=== RESETTING USER 2FA STATE FOR CLEAN DEMO ===\n";
include 'reset_2fa.php';
echo "Done!\n";
