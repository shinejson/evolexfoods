<?php

use App\Models\Setting;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('message_templates', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('channel', 10);
            $table->string('category', 30);
            $table->string('subject')->nullable();
            $table->text('body');
            $table->boolean('enabled')->default(true);
            $table->timestamps();
        });
        Schema::create('outbound_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('channel', 10);
            $table->string('recipient');
            $table->string('subject')->nullable();
            $table->text('body');
            $table->string('status', 20)->default('pending');
            $table->timestamp('scheduled_at');
            $table->timestamp('processed_at')->nullable();
            $table->string('provider_id')->nullable();
            $table->string('error')->nullable();
            $table->timestamps();
            $table->index(['status', 'scheduled_at']);
        });
        foreach (['sms', 'email'] as $channel) {
            foreach ([
                ['Reminder', 'reminder', 'Reminder: {{title}}', 'Hello {{name}}, reminder: {{title}} is due on {{date}} at {{time}}. {{details}}'],
                ['Meeting invitation', 'meeting', 'Meeting: {{title}}', 'Hello {{name}}, you are invited to {{title}} on {{date}} at {{time}}. Location / link: {{location}}. {{details}}'],
                ['Operational notification', 'notification', '{{title}}', 'Hello {{name}}, {{title}}: {{details}}'],
            ] as [$name, $category, $subject, $body]) {
                DB::table('message_templates')->insert([
                    'name' => $name, 'channel' => $channel, 'category' => $category,
                    'subject' => $channel === 'email' ? $subject : null, 'body' => $body,
                    'enabled' => true, 'created_at' => now(), 'updated_at' => now(),
                ]);
            }
        }
        foreach (\App\Services\CommunicationSettings::SMS_DEFAULTS as $key => $value) {
            if (!Setting::where('key', $key)->exists()) Setting::set($key, $value, 'sms');
        }
        // Upgrade legacy plaintext SMTP secrets in place. Demo masks are not credentials.
        $password = Setting::where('key', 'mail_password')->first();
        if ($password && $password->type !== 'encrypted') {
            $value = $password->value;
            Setting::set('mail_password', preg_match('/^[•*]+$/u', $value ?? '') ? '' : $value, 'email');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('outbound_messages');
        Schema::dropIfExists('message_templates');
        // Preserve existing credentials and settings on rollback.
    }
};
