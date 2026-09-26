<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContentItem extends Model
{
    protected $fillable = [
        'title', 'channel', 'content_type', 'status', 'scheduled_for',
        'published_at', 'media_asset_id', 'body',
    ];

    protected function casts(): array
    {
        return ['scheduled_for' => 'date', 'published_at' => 'date'];
    }

    public function media(): BelongsTo
    {
        return $this->belongsTo(MediaAsset::class, 'media_asset_id');
    }
}
