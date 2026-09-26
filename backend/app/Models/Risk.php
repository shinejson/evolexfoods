<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Risk extends Model
{
    protected $fillable = [
        'title', 'category', 'severity', 'likelihood', 'owner_id',
        'status', 'mitigation', 'identified_at',
    ];

    protected function casts(): array
    {
        return ['identified_at' => 'date'];
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }
}
