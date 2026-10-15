<?php

namespace App\Services;

use Carbon\Carbon;

/**
 * Gestation maths shared by the Horizon Radar (§39).
 *
 * Goats and sheep carry for 150 days, cattle for 283. When a pregnancy has
 * no recorded due date, the expected birth date is calculated from the
 * breeding (service) date, falling back to the confirmation date.
 */
class GestationCalculator
{
    public static function daysFor(?string $species): int
    {
        $key = AnimalIdGenerator::normaliseSpecies($species);
        $days = config('evolex.gestation.days', []);

        return (int) ($days[$key] ?? config('evolex.gestation.default_days', 150));
    }

    /** Bucket key for a signed days-to-due value. */
    public static function bucketFor(int $daysToDue): string
    {
        return match (true) {
            $daysToDue < 0 => 'overdue',
            $daysToDue <= 7 => '7',
            $daysToDue <= 30 => '30',
            $daysToDue <= 60 => '60',
            $daysToDue <= 90 => '90',
            default => 'beyond',
        };
    }

    /** early < 50% · mid 50–80% · late > 80% of gestation elapsed. */
    public static function stageFor(float $progress): string
    {
        return match (true) {
            $progress >= 0.8 => 'late',
            $progress >= 0.5 => 'mid',
            default => 'early',
        };
    }

    /**
     * Resolve the expected birth date for a pregnancy-like record.
     *
     * @return array{date: ?Carbon, source: string}
     */
    public static function expectedBirthDate(?string $recorded, ?string $confirmedDate, ?string $breedingDate, ?string $species): array
    {
        if ($recorded) {
            return ['date' => Carbon::parse($recorded)->startOfDay(), 'source' => 'recorded'];
        }
        if ($breedingDate) {
            return [
                'date' => Carbon::parse($breedingDate)->startOfDay()->addDays(self::daysFor($species)),
                'source' => 'calculated_from_breeding',
            ];
        }
        if ($confirmedDate) {
            // Confirmation typically happens ~21 days after service, so the
            // remainder is approximated as (gestation − 21) from confirmation.
            return [
                'date' => Carbon::parse($confirmedDate)->startOfDay()->addDays(max(0, self::daysFor($species) - 21)),
                'source' => 'calculated_from_confirmation',
            ];
        }

        return ['date' => null, 'source' => 'unknown'];
    }
}
