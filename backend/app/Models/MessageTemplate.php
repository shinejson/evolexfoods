<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MessageTemplate extends Model
{
    protected $fillable = ['name', 'channel', 'category', 'subject', 'body', 'enabled'];

    protected function casts(): array
    {
        return ['enabled' => 'boolean'];
    }
}
