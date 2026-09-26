<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SalesCull extends Model
{
    protected $fillable = ['animal_id', 'type', 'event_date', 'amount', 'buyer', 'notes'];

    protected function casts(): array
    {
        return ['event_date' => 'date', 'amount' => 'decimal:2'];
    }

    public function animal(): BelongsTo
    {
        return $this->belongsTo(Animal::class);
    }
}
