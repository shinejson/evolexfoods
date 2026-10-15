<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Per-species counter backing the Evolex Animal ID system (§10).
 *
 * One row per species (`goat` / `sheep` / `cattle`); `last_number` only ever
 * moves forward, so an issued ID such as EV-GT-000001 is never reused —
 * even if the animal record that carried it is later deleted.
 */
class AnimalIdSequence extends Model
{
    protected $fillable = ['species', 'prefix', 'last_number'];

    protected function casts(): array
    {
        return ['last_number' => 'integer'];
    }
}
