<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class HealthRecord extends Model
{
    protected $fillable = [
        'animal_id', 'recorded_date', 'condition', 'severity',
        'status', 'recorded_by', 'notes',
    ];

    protected function casts(): array
    {
        return ['recorded_date' => 'date'];
    }

    public function animal(): BelongsTo
    {
        return $this->belongsTo(Animal::class);
    }

    public function treatments(): HasMany
    {
        return $this->hasMany(Treatment::class);
    }
}
