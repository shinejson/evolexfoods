<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Transfer extends Model
{
    protected $fillable = [
        'animal_id', 'from_location_id', 'to_location_id', 'transferred_at', 'reason',
    ];

    protected function casts(): array
    {
        return ['transferred_at' => 'date'];
    }

    public function animal(): BelongsTo
    {
        return $this->belongsTo(Animal::class);
    }
}
