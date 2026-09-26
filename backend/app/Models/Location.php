<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Location extends Model
{
    protected $fillable = ['code', 'name', 'type', 'address', 'capacity', 'status'];

    public function animals(): HasMany
    {
        return $this->hasMany(Animal::class);
    }
}
