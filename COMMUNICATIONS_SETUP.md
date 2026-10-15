# SMS, email templates and scheduled messaging

## Where to find it

**System Settings → SMS & Messaging** contains:

- **SMS configuration:** Arkesel SMS API v2, enabled switch, approved sender ID and API key, plus a real test send.
- **Message templates:** SMS and email templates for reminders, meeting invitations and operational notifications. Six starter templates are added by the migration. Create/edit or disable templates; previews are plain text, never executable HTML or Blade.
- **Send / schedule:** one recipient per message, template variables, rendered preview, SMS segment estimate, send-now or a future send time.
- **Outbox & history:** paginated records, status, safe failure message, refresh and cancellation of pending messages.

Access is restricted server-side to active owner/CEO/admin users, or active roles granted the existing `settings.system_config` permission. The same restriction now protects settings, export, diagnostics and database backup routes; ordinary staff must not have access to credentials or database backups.

## Deployment

On the Laravel server (PHP 8.2+ with normal Laravel extensions, including mbstring, OpenSSL, PDO and the selected database driver):

```sh
cd backend
composer install
# Ensure .env and a stable APP_KEY are already configured.
# Only for a brand-new install without an application key: php artisan key:generate
php artisan migrate --force
# Only if general/email defaults were never seeded:
php artisan db:seed --class=SettingSeeder --force
```

The migration adds templates, the outbox and disabled-by-default SMS settings. It encrypts a legacy plaintext SMTP password, discarding a demo bullet/asterisk mask. Re-running SettingSeeder now preserves saved configuration instead of resetting it. Do not regenerate an existing APP_KEY: encrypted secrets depend on it. Back up the key securely alongside the database. Config exports intentionally omit secrets and cannot restore credentials by themselves.

Configure the normal Laravel scheduler through your process manager or cron:

```cron
* * * * * cd /path/to/evolexfoods/backend && php artisan schedule:run >> /dev/null 2>&1
```

For foreground local development, use `php artisan schedule:work`. Manually process due messages with `php artisan communications:send-due`. No queue worker is needed for this implementation. Keep the application's timezone UTC. The browser's send date/time is converted to an ISO UTC timestamp; event date/time placeholders are message text only and do not define when the message is sent.

## SMS provider: Arkesel

1. Register at https://arkesel.com and obtain your SMS API key from its dashboard.
2. Fund your SMS balance and obtain approval for your sender ID. Confirm current country coverage, pricing and sender requirements directly with Arkesel.
3. In SMS configuration, enter the approved sender ID (up to 11 letters/numbers/spaces), paste the key, enable SMS and save.
4. Test with a number you control. Sending incurs normal provider charges.

The adapter posts JSON to the fixed HTTPS endpoint `https://sms.arkesel.com/api/v2/sms/send` using the `api-key` header. Credentials never enter URL query strings. Ghana local numbers such as `024 123 4567` normalize to `+233241234567`; international numbers must include `+countrycode`. Messages go to one recipient per record, avoiding partial batch ambiguity. SMS segment counts are estimates, not price quotes; Unicode text can require more segments.

There is no automatic retry: a connection timeout can happen **after** a provider accepted the message. Check provider logs and the recipient before sending another copy. Provider credit, sender approval, carrier filtering and actual delivery remain outside Evolex's control.

## Email configuration review and fixes

The previous email test returned a fabricated handshake, latency and delivered status without sending an email. It is now a real send using `OutboundMailService`, which is shared by the email test and template/outbox emails.

In **Settings → Email & SMTP**:

- Use SMTP for real sends, or Log for local diagnostics only.
- For Google Workspace, use your organization's approved relay or `smtp.gmail.com`, port 587 with STARTTLS, and a supported app password. Port 465 uses implicit TLS (the UI labels this SSL). STARTTLS mode requires TLS; None disables opportunistic TLS and should only be used for a trusted local relay.
- Set authentication, username, password, sender address/name and optional reply-to. The service uses the saved footer and reply-to, honors authentication disabled, and rebuilds the mailer so workers do not retain old credentials.
- Save before testing. Test with a mailbox you control, inspect spam, and verify SPF/DKIM/DMARC with your email administrator.
- Unsupported API mail drivers were removed from the UI rather than pretending SMTP fields configure their API credentials.

SMTP passwords and SMS keys are encrypted at rest with Laravel Crypt. Read/update/export responses return empty secret fields plus `*_configured` flags. Blank or masked secret fields retain existing credentials; replace a secret by entering a new one. To stop SMS, disable it; to revoke a key/password, revoke it at the provider and replace it here. Local export fallback was removed to avoid exporting unsaved plaintext credentials. Treat the database, `.env`, backups and mail logs as sensitive; log mode contains message content.

## Templates and sending behavior

Supported literal placeholders: `{{name}}`, `{{title}}`, `{{date}}`, `{{time}}`, `{{location}}`, `{{details}}`. Unknown/malformed placeholders, missing values, invalid recipients, disabled templates, past/timezone-less schedules and invalid subjects are rejected. SMS rendered bodies are limited to 1,600 characters; email bodies to 10,000, subjects to 255. Rendering happens at creation time, so edits/disabling a template do not alter messages already scheduled. Cancel those messages individually if required.

Meeting templates send an invitation/reminder **message**; this is not a Google Calendar integration, attendee RSVP system or recurring-meeting engine. This feature sends messages explicitly created in the composer; existing Alert Triggers, weekly digest and employee welcome preferences are not newly connected to automatic outbound events. Existing authentication OTP/WhatsApp code remains a separate integration and is not changed by this feature.

Statuses:

- `pending`: awaiting its scheduled time; can be cancelled.
- `sending`: atomically claimed by a sender. Other workers cannot send it again.
- `accepted`: SMTP or Arkesel accepted the request; **not** an inbox/carrier delivery receipt.
- `logged`: email written to the application log only; no email sent.
- `failed`: acceptance not confirmed or configuration unavailable. Check provider logs before resending.
- `cancelled`: will not be dispatched.

Overlapping command/API dispatch attempts use a conditional database update to claim each record once. A worker crash after claiming can leave `sending` indefinitely: investigate the provider before an administrator reconciles that record; do not reset it automatically to pending. There are no delivery-receipt webhooks or automatic retries. Protect admin access and establish an outbox/log retention policy: message content and recipient details are stored for operational history. SMS/email diagnostics and sends are rate-limited. Audit events include IDs/channel/status, not credentials or message bodies.

## Verification

```sh
cd frontend && npm ci && npm run build
cd ../backend && php artisan test --filter=CommunicationsTest
```

Feature tests cover credential encryption/redaction/blank preservation, non-destructive seeding, validation atomicity, permissions, disabled users, Arkesel request shape and number normalization, provider errors, disabled templates, scheduling snapshots/due times, cancellation, duplicate worker claims, placeholders, mail settings and truthful email test results. HTTP/mail dependencies are faked or mocked; they never send paid messages.

In the Arena workspace, the production Angular build and PHP syntax parsing were checked. PHPUnit and live SMTP/SMS could not run because the workspace has no PHP runtime; complete the commands above on the Laravel server. No real provider credentials have been configured or real messages sent here.
