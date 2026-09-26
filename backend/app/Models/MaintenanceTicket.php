<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MaintenanceTicket extends Model
{
    protected $fillable = [
        'ticket_number', 'asset_id', 'title', 'type', 'priority', 'status',
        'reported_by', 'assigned_to', 'reported_at', 'completed_at', 'description',
    ];

    protected function casts(): array
    {
        return ['reported_at' => 'datetime', 'completed_at' => 'datetime'];
    }

    public function asset(): BelongsTo
    {
        return $this->belongsTo(Asset::class);
    }
}
