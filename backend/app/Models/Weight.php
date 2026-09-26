<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Weight extends Model
{
    protected $fillable = ['animal_id', 'weighed_at', 'weight_kg', 'method'];

    protected function casts(): array
    {
        return ['weighed_at' => 'date', 'weight_kg' => 'decimal:2'];
    }

    public function animal(): BelongsTo
    {
        return $this->belongsTo(Animal::class);
    }
}
