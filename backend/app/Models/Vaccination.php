<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Vaccination extends Model
{
    protected $fillable = [
        'animal_id', 'vaccine_name', 'administered_date',
        'next_due_date', 'batch_number', 'status',
    ];

    protected function casts(): array
    {
        return ['administered_date' => 'date', 'next_due_date' => 'date'];
    }

    public function animal(): BelongsTo
    {
        return $this->belongsTo(Animal::class);
    }
}
