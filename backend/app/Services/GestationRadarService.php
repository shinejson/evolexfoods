<?php

namespace App\Services;

use App\Models\Animal;
use App\Models\Pregnancy;
use Carbon\Carbon;

/**
 * Expected Kidding / Gestation Horizon Radar (§39).
 *
 * Every active pregnancy is placed on a horizon — overdue, next 7 / 30 / 60 /
 * 90 days, or beyond — using its recorded expected birth date, or one
 * calculated from the breeding date at 150 days' gestation for goats and
 * sheep (283 for cattle). Pregnant animals without a pregnancy record are
 * included from their Livestock Master expected birth date so nothing that
 * the CEO dashboard counts as pregnant is missing from the radar.
 */
class GestationRadarService
{
    public function radar(?Carbon $today = null): array
    {
        $today = ($today ?? now())->startOfDay();
        $entries = [];
        $seenAnimalIds = [];

        $pregnancies = Pregnancy::active()
            ->with(['animal.location', 'breeding.male', 'breeding'])
            ->orderBy('expected_birth_date')
            ->get();

        foreach ($pregnancies as $pregnancy) {
            $animal = $pregnancy->animal;
            if (! $animal) {
                continue;
            }
            $seenAnimalIds[] = $animal->id;

            $expected = GestationCalculator::expectedBirthDate(
                $pregnancy->expected_birth_date?->toDateString(),
                $pregnancy->confirmed_date?->toDateString(),
                $pregnancy->breeding?->breeding_date?->toDateString(),
                $animal->species,
            );

            $entries[] = $this->entry([
                'pregnancy_id' => $pregnancy->id,
                'animal' => $animal,
                'sire_code' => $pregnancy->breeding?->male?->animal_id,
                'confirmed_date' => $pregnancy->confirmed_date?->toDateString(),
                'breeding_date' => $pregnancy->breeding?->breeding_date?->toDateString(),
                'expected' => $expected,
                'record_source' => 'pregnancy',
            ], $today);
        }

        // Dams flagged pregnant on the Livestock Master with no pregnancy row.
        $orphans = Animal::alive()
            ->with('location')
            ->where('pregnancy_status', 'pregnant')
            ->whereNotIn('id', $seenAnimalIds ?: [0])
            ->get();

        foreach ($orphans as $animal) {
            $expected = GestationCalculator::expectedBirthDate(
                $animal->expected_birth_date?->toDateString(),
                null,
                null,
                $animal->species,
            );
            if (! $expected['date']) {
                continue;
            }

            $entries[] = $this->entry([
                'pregnancy_id' => null,
                'animal' => $animal,
                'sire_code' => null,
                'confirmed_date' => null,
                'breeding_date' => null,
                'expected' => ['date' => $expected['date'], 'source' => 'animal_record'],
                'record_source' => 'animal_record',
            ], $today);
        }

        usort($entries, fn ($a, $b) => ($a['days_to_due'] ?? PHP_INT_MAX) <=> ($b['days_to_due'] ?? PHP_INT_MAX));

        $horizons = [];
        foreach ((array) config('evolex.gestation.horizons', [7, 30, 60, 90]) as $days) {
            $horizons[] = [
                'days' => (int) $days,
                'label' => 'Next '.$days.' days',
                // Cumulative, matching §39's "next 7 / 30 / 60 / 90 days".
                'count' => count(array_filter($entries, fn ($e) => $e['days_to_due'] !== null && $e['days_to_due'] >= 0 && $e['days_to_due'] <= $days)),
                'animal_codes' => array_values(array_map(
                    fn ($e) => $e['animal_code'],
                    array_filter($entries, fn ($e) => $e['days_to_due'] !== null && $e['days_to_due'] >= 0 && $e['days_to_due'] <= $days)
                )),
            ];
        }

        $buckets = [];
        foreach (['overdue', '7', '30', '60', '90', 'beyond'] as $key) {
            $rows = array_values(array_filter($entries, fn ($e) => $e['bucket'] === $key));
            $buckets[] = [
                'key' => $key,
                'label' => match ($key) {
                    'overdue' => 'Overdue',
                    'beyond' => 'Beyond 90 days',
                    default => 'Next '.$key.' days',
                },
                'exclusive' => true,
                'count' => count($rows),
                'entries' => $rows,
            ];
        }

        return [
            'generated_at' => now()->toIso8601String(),
            'today' => $today->toDateString(),
            'gestation_days' => (array) config('evolex.gestation.days'),
            'total_active' => count($entries),
            'overdue' => count(array_filter($entries, fn ($e) => $e['bucket'] === 'overdue')),
            'horizons' => $horizons,
            'buckets' => $buckets,
            'entries' => $entries,
            'source' => 'pregnancies, animals',
        ];
    }

    private function entry(array $row, Carbon $today): array
    {
        /** @var Animal $animal */
        $animal = $row['animal'];
        $gestationDays = GestationCalculator::daysFor($animal->species);
        /** @var ?Carbon $due */
        $due = $row['expected']['date'];

        $daysToDue = $due ? (int) $today->diffInDays($due, false) : null;
        // Elapsed gestation is inferred backwards from the due date so the
        // progress bar works for recorded and calculated dates alike.
        $progress = $daysToDue === null
            ? 0.0
            : max(0.0, min(1.0, ($gestationDays - $daysToDue) / $gestationDays));

        return [
            'pregnancy_id' => $row['pregnancy_id'],
            'animal_id' => $animal->id,
            'animal_code' => $animal->animal_id,
            'species' => $animal->species,
            'breed' => $animal->breed,
            'location' => $animal->location?->name,
            'location_id' => $animal->location_id,
            'sire_code' => $row['sire_code'],
            'confirmed_date' => $row['confirmed_date'],
            'breeding_date' => $row['breeding_date'],
            'expected_birth_date' => $due?->toDateString(),
            'expected_birth_date_source' => $row['expected']['source'],
            'record_source' => $row['record_source'],
            'gestation_days' => $gestationDays,
            'days_to_due' => $daysToDue,
            'bucket' => $daysToDue === null ? 'beyond' : GestationCalculator::bucketFor($daysToDue),
            'horizon' => match (GestationCalculator::bucketFor($daysToDue ?? PHP_INT_MAX)) {
                '7' => 7, '30' => 30, '60' => 60, '90' => 90, default => null,
            },
            'gestation_progress' => round($progress, 3),
            'gestation_percent' => (int) round($progress * 100),
            'stage' => GestationCalculator::stageFor($progress),
            'attention' => $daysToDue !== null && $daysToDue < 0,
        ];
    }
}
