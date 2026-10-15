<?php

namespace App\Services;

use App\Models\Animal;
use App\Models\AnimalIdSequence;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Automated Animal ID sequencing (§10, §96).
 *
 * IDs follow EV-{species code}-{zero-padded sequence}, e.g. EV-GT-000001
 * (goats), EV-SH-000001 (sheep), EV-CT-000001 (cattle). The sequence lives in
 * the `animal_id_sequences` table and is advanced inside a row-locked
 * transaction, so:
 *
 *  - concurrent birth/registration requests can never receive the same ID;
 *  - an ID is never reused — deleting an animal does not rewind the counter
 *    (the previous `count() + 1` logic failed on both counts);
 *  - herds registered before this service existed are respected: the counter
 *    is reconciled against the highest ID already present in `animals`.
 */
class AnimalIdGenerator
{
    /** Normalise free-text species input to a canonical key. */
    public static function normaliseSpecies(?string $species): string
    {
        $key = strtolower(trim((string) $species));

        return match ($key) {
            'goats' => 'goat',
            'sheeps' => 'sheep',
            'cow', 'cows', 'bovine' => 'cattle',
            default => $key,
        };
    }

    public static function supports(?string $species): bool
    {
        return isset(config('evolex.animal_id.species')[self::normaliseSpecies($species)]);
    }

    /** EV-GT / EV-SH / EV-CT for a species, or a validation error. */
    public static function prefixFor(?string $species): string
    {
        $key = self::normaliseSpecies($species);
        $map = config('evolex.animal_id.species');

        if (! isset($map[$key])) {
            throw ValidationException::withMessages([
                'species' => 'Animal IDs can only be issued for goat (EV-GT), sheep (EV-SH) or cattle (EV-CT). Received: '.($species ?: 'unknown').'.',
            ]);
        }

        return config('evolex.animal_id.prefix_base').'-'.$map[$key]['code'];
    }

    public static function format(string $prefix, int $number): string
    {
        return $prefix.'-'.str_pad((string) $number, (int) config('evolex.animal_id.sequence_width', 6), '0', STR_PAD_LEFT);
    }

    /**
     * The ID that *would* be issued next, without consuming it — used to
     * preview the auto-generated ID on registration/birth forms.
     */
    public function peek(string $species): string
    {
        $prefix = self::prefixFor($species);

        $stored = (int) (AnimalIdSequence::where('prefix', $prefix)->value('last_number') ?? 0);

        return self::format($prefix, max($stored, $this->highestIssuedNumber($prefix)) + 1);
    }

    /**
     * Atomically issue the next ID for a species. Must be called when a new
     * animal record is actually being created; the number is consumed even
     * if the surrounding work later rolls back only when this call runs in
     * the same transaction — callers wrap registration in DB::transaction.
     */
    public function next(string $species): string
    {
        $species = self::normaliseSpecies($species);
        $prefix = self::prefixFor($species);

        return DB::transaction(function () use ($species, $prefix) {
            $sequence = AnimalIdSequence::query()
                ->lockForUpdate()
                ->firstOrCreate(
                    ['prefix' => $prefix],
                    ['species' => $species, 'last_number' => 0]
                );

            // Reconcile with IDs issued before the sequence table existed
            // (seeded / imported herds) so we never collide with them.
            $next = max((int) $sequence->last_number, $this->highestIssuedNumber($prefix)) + 1;

            $sequence->forceFill(['species' => $species, 'last_number' => $next])->save();

            return self::format($prefix, $next);
        });
    }

    /** Highest numeric suffix currently present on animal records. */
    private function highestIssuedNumber(string $prefix): int
    {
        $ids = Animal::query()
            ->where('animal_id', 'like', $prefix.'-%')
            ->pluck('animal_id');

        $highest = 0;
        foreach ($ids as $id) {
            $suffix = substr((string) $id, strlen($prefix) + 1);
            if (is_numeric($suffix)) {
                $highest = max($highest, (int) $suffix);
            }
        }

        return $highest;
    }
}
