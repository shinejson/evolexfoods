<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Birth extends Model
{
    protected $fillable = [
        'animal_id', 'mother_animal_id', 'father_animal_id', 'birth_date',
        'sex', 'birth_weight', 'location_id', 'status', 'notes',
    ];

    protected function casts(): array
    {
        return ['birth_date' => 'date', 'birth_weight' => 'decimal:2'];
    }

    public function animal(): BelongsTo
    {
        return $this->belongsTo(Animal::class);
    }

    public function location(): BelongsTo
    {
        return $this->belongsTo(Location::class);
    }
}
