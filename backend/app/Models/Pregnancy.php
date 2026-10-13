<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Pregnancy extends Model
{
    protected $fillable = [
        'animal_id', 'breeding_id', 'confirmed_date', 'expected_birth_date',
        'status', 'ended_at', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'confirmed_date' => 'date',
            'expected_birth_date' => 'date',
            'ended_at' => 'date',
        ];
    }

    public function animal(): BelongsTo
    {
        return $this->belongsTo(Animal::class);
    }

    public function scopeActive($query)
    {
        return $query->where('pregnancies.status', 'active');
    }
}
