<?php

namespace App\Services;

use App\Models\Setting;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class SmsService
{
    public static function normalizePhone(string $phone): string
    {
        $phone = preg_replace('/[\s()-]/', '', trim($phone));
        if (preg_match('/^0[235]\d{8}$/', $phone)) $phone = '+233'.substr($phone, 1);
        if (!preg_match('/^\+[1-9]\d{7,14}$/', $phone)) {
            throw ValidationException::withMessages(['recipient' => 'Use an international number such as +233241234567, or a Ghanaian local mobile number.']);
        }
        return $phone;
    }

    public function send(string $recipient, string $body): ?string
    {
        if (!Setting::get('sms_enabled', false) || !($key = Setting::get('sms_api_key'))) {
            throw new RuntimeException('SMS is disabled or the Arkesel API key is missing.');
        }
        // Fixed HTTPS endpoint; keys are never put into URLs, logs, or responses.
        // Do not retry a timeout automatically: the provider may already have accepted it.
        $response = Http::acceptJson()->withHeaders(['api-key' => $key])
            ->connectTimeout(10)->timeout(25)
            ->post('https://sms.arkesel.com/api/v2/sms/send', [
                'sender' => Setting::get('sms_sender_id', 'Evolex'),
                'message' => $body,
                'recipients' => [ltrim(self::normalizePhone($recipient), '+')],
            ]);
        if (!$response->successful() || $response->json('status') !== 'success') {
            throw new RuntimeException('Arkesel did not confirm acceptance. Check your balance, sender approval and API key.');
        }
        $id = $response->json('data.0.id');
        return is_scalar($id) ? (string) $id : null;
    }
}
