<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Death extends Model
{
    protected $fillable = ['animal_id', 'death_date', 'cause', 'location_id', 'notes'];

    protected function casts(): array
    {
        return ['death_date' => 'date'];
    }

    public function animal(): BelongsTo
    {
        return $this->belongsTo(Animal::class);
    }
}
