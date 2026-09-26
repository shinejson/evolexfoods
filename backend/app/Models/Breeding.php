<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Breeding extends Model
{
    protected $fillable = ['female_id', 'male_id', 'breeding_date', 'method', 'status', 'notes'];

    protected function casts(): array
    {
        return ['breeding_date' => 'date'];
    }

    public function female(): BelongsTo
    {
        return $this->belongsTo(Animal::class, 'female_id');
    }

    public function male(): BelongsTo
    {
        return $this->belongsTo(Animal::class, 'male_id');
    }

    public function pregnancies(): HasMany
    {
        return $this->hasMany(Pregnancy::class);
    }
}
