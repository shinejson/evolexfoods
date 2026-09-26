<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MediaAsset extends Model
{
    protected $fillable = [
        'title', 'type', 'location', 'subject', 'url', 'tags', 'captured_at', 'rights',
    ];

    protected function casts(): array
    {
        return ['tags' => 'array', 'captured_at' => 'date'];
    }
}
