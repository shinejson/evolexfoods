<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// One attempt per message. Ambiguous failures must be checked with the provider before resending.
Artisan::command('communications:send-due', function () {
    $count = 0;
    \App\Models\OutboundMessage::where('status', 'pending')->where('scheduled_at', '<=', now())
        ->orderBy('id')->chunkById(100, function ($messages) use (&$count) {
            foreach ($messages as $message) {
                app(\App\Services\MessageDispatcher::class)->dispatch($message);
                $count++;
            }
        });
    $this->info("Processed {$count} due message(s).");
})->purpose('Dispatch due SMS and email messages');

\Illuminate\Support\Facades\Schedule::command('communications:send-due')->everyMinute()->withoutOverlapping();
