<?php

namespace App\Services;

use App\Models\OutboundMessage;
use Throwable;

class MessageDispatcher
{
    public function dispatch(OutboundMessage $message): void
    {
        // Atomic claim also protects overlapping workers and send-now requests.
        $claimed = OutboundMessage::whereKey($message->id)->where('status', 'pending')
            ->where('scheduled_at', '<=', now())->update(['status' => 'sending', 'updated_at' => now()]);
        if (!$claimed) return;
        $message->refresh();
        try {
            if ($message->channel === 'sms') {
                $providerId = app(SmsService::class)->send($message->recipient, $message->body);
                $status = 'accepted';
            } else {
                $status = app(OutboundMailService::class)->send($message->recipient, $message->subject, $message->body);
                $providerId = null;
            }
            $message->update(['status' => $status, 'provider_id' => $providerId, 'processed_at' => now(), 'error' => null]);
        } catch (Throwable $e) {
            // No raw exceptions: SMTP and HTTP errors can contain credentials and message text.
            $message->update([
                'status' => 'failed', 'processed_at' => now(),
                'error' => 'Acceptance not confirmed. Check saved configuration and provider logs before resending; a timeout may still have been accepted.',
            ]);
        }
    }
}
