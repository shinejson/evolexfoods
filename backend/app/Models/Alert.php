<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Alert extends Model
{
    protected $fillable = [
        'type', 'severity', 'title', 'message', 'module', 'is_read', 'triggered_at',
    ];

    protected function casts(): array
    {
        return ['is_read' => 'boolean', 'triggered_at' => 'datetime'];
    }
}
