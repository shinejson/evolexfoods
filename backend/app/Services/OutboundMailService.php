<?php

namespace App\Services;

use App\Models\Setting;
use Illuminate\Mail\Message;
use Illuminate\Support\Facades\Mail;
use RuntimeException;

class OutboundMailService
{
    /** Return the actual transport result, never claim inbox delivery. */
    public function send(string $recipient, string $subject, string $body): string
    {
        $driver = Setting::get('mail_mailer', config('mail.default'));
        if (!in_array($driver, ['smtp', 'log'], true)) {
            throw new RuntimeException('Unsupported mail driver. Select SMTP or Log in Settings.');
        }
        $auth = Setting::get('smtp_auth', true);
        config(['mail.mailers.communications' => $driver === 'log' ? ['transport' => 'log'] : [
            'transport' => 'smtp',
            'scheme' => Setting::get('mail_encryption', 'tls') === 'ssl' ? 'smtps' : 'smtp',
            'require_tls' => Setting::get('mail_encryption', 'tls') === 'tls',
            'auto_tls' => Setting::get('mail_encryption', 'tls') !== 'none',
            'host' => Setting::get('mail_host', config('mail.mailers.smtp.host')),
            'port' => Setting::get('mail_port', config('mail.mailers.smtp.port')),
            'username' => $auth ? Setting::get('mail_username', config('mail.mailers.smtp.username')) : null,
            'password' => $auth ? Setting::get('mail_password', config('mail.mailers.smtp.password')) : null,
            'timeout' => 20,
        ]]);
        // Long-lived workers must not reuse a transport with old credentials.
        Mail::purge('communications');
        $footer = Setting::get('email_footer_text', '');
        Mail::mailer('communications')->raw($body.($footer ? "\n\n".$footer : ''), function (Message $mail) use ($recipient, $subject) {
            $mail->to($recipient)->subject($subject)
                ->from(Setting::get('mail_from_address', config('mail.from.address')), Setting::get('mail_from_name', config('mail.from.name')));
            if ($reply = Setting::get('mail_reply_to')) $mail->replyTo($reply);
        });
        return $driver === 'log' ? 'logged' : 'accepted';
    }
}
