<?php

namespace App\Services;

use App\Models\Alert;
use App\Models\Animal;
use App\Models\AnimalEvent;
use App\Models\AuditLog;
use App\Models\Birth;
use App\Models\Pregnancy;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Birth lifecycle automation (§96):
 *
 *   Birth form → validates Mother ID → new Animal ID(s) generated →
 *   animal record(s) created → mother's reproductive history updated →
 *   birth register updated → herd count updated (the new animals are live
 *   `animals` rows, so every herd query sees them immediately) →
 *   dashboard updated (same reason) → supervisor notified (alert row).
 *
 * Supports litters: one submission may register several kids from the same
 * dam, each receiving its own sequential Evolex ID.
 */
class BirthRegistrationService
{
    public function __construct(private readonly AnimalIdGenerator $ids)
    {
    }

    /**
     * @param  array{
     *   mother_animal_id:string, father_animal_id?:?string, species?:?string,
     *   breed?:?string, birth_date?:?string, location_id?:?int, notes?:?string,
     *   kids: array<int, array{sex:string, birth_weight?:?float, breed?:?string, notes?:?string}>
     * } $data
     * @return array{dam:Animal, animals:array<int,Animal>, births:array<int,Birth>, litter_size:int, pregnancy_closed:bool}
     */
    public function register(array $data, ?int $recordedBy = null): array
    {
        return DB::transaction(function () use ($data, $recordedBy) {
            $dam = $this->resolveAnimal($data['mother_animal_id'] ?? null, 'mother_animal_id', 'Mother');
            if (strtolower((string) $dam->sex) !== 'female') {
                throw ValidationException::withMessages([
                    'mother_animal_id' => $dam->animal_id.' is recorded as '.($dam->sex ?: 'unknown sex').' and cannot be registered as a dam.',
                ]);
            }
            if ($dam->status === 'dead') {
                throw ValidationException::withMessages([
                    'mother_animal_id' => $dam->animal_id.' is recorded as dead and cannot be registered as a dam.',
                ]);
            }

            $species = AnimalIdGenerator::normaliseSpecies($data['species'] ?? $dam->species);
            if ($species !== AnimalIdGenerator::normaliseSpecies($dam->species)) {
                throw ValidationException::withMessages([
                    'species' => 'Kids take the dam\'s species ('.$dam->species.'); a '.$species.' birth cannot be registered against '.$dam->animal_id.'.',
                ]);
            }
            // Throws a 422 listing the supported formats for anything else.
            AnimalIdGenerator::prefixFor($species);

            $sire = null;
            if (! empty($data['father_animal_id'])) {
                $sire = $this->resolveAnimal($data['father_animal_id'], 'father_animal_id', 'Sire');
                if (strtolower((string) $sire->sex) !== 'male') {
                    throw ValidationException::withMessages([
                        'father_animal_id' => $sire->animal_id.' is not recorded as male and cannot be registered as a sire.',
                    ]);
                }
            }

            $birthDate = $data['birth_date'] ?? now()->toDateString();
            $locationId = $data['location_id'] ?? $dam->location_id;
            $breed = $data['breed'] ?? $dam->breed;

            $animals = [];
            $births = [];

            foreach ($data['kids'] as $kid) {
                $animalId = $this->ids->next($species);

                $animal = Animal::create([
                    'animal_id' => $animalId,
                    'species' => $species,
                    'breed' => $kid['breed'] ?? $breed,
                    'sex' => $kid['sex'],
                    'dob' => $birthDate,
                    'mother_id' => $dam->animal_id,
                    'father_id' => $sire?->animal_id,
                    'source' => 'born_on_farm',
                    'location_id' => $locationId,
                    'weight' => $kid['birth_weight'] ?? null,
                    'breeding_status' => $kid['sex'] === 'female' ? 'open' : null,
                    'pregnancy_status' => $kid['sex'] === 'female' ? 'open' : null,
                    'health_status' => 'healthy',
                    'status' => 'alive',
                    'current_status' => 'active',
                    'notes' => $kid['notes'] ?? ($data['notes'] ?? null),
                ]);

                $birth = Birth::create([
                    'animal_id' => $animal->id,
                    'mother_animal_id' => $dam->animal_id,
                    'father_animal_id' => $sire?->animal_id,
                    'birth_date' => $birthDate,
                    'sex' => $kid['sex'],
                    'birth_weight' => $kid['birth_weight'] ?? null,
                    'location_id' => $locationId,
                    'status' => 'alive',
                    'notes' => $kid['notes'] ?? ($data['notes'] ?? null),
                ]);

                AnimalEvent::create([
                    'animal_id' => $animal->id,
                    'event_type' => 'birth',
                    'occurred_at' => $birthDate,
                    'recorded_by' => $recordedBy,
                    'payload' => [
                        'birth_id' => $birth->id,
                        'animal_id' => $animalId,
                        'mother_animal_id' => $dam->animal_id,
                        'father_animal_id' => $sire?->animal_id,
                        'litter_size' => count($data['kids']),
                    ],
                ]);

                AuditLog::create([
                    'user_id' => $recordedBy,
                    'action' => 'animal.birth',
                    'auditable_type' => Animal::class,
                    'auditable_id' => $animal->id,
                    'meta' => ['animal_id' => $animalId, 'birth_id' => $birth->id, 'mother_animal_id' => $dam->animal_id],
                ]);

                $animals[] = $animal;
                $births[] = $birth;
            }

            // Mother's reproductive history: close every active pregnancy and
            // return the dam to open / available-for-breeding status.
            $closed = Pregnancy::where('animal_id', $dam->id)
                ->where('status', 'active')
                ->update(['status' => 'completed', 'ended_at' => $birthDate]);

            $dam->update([
                'pregnancy_status' => 'open',
                'breeding_status' => 'open',
                'expected_birth_date' => null,
            ]);

            // Supervisor notification (§96 final step).
            $idList = implode(', ', array_map(fn (Animal $a) => $a->animal_id, $animals));
            Alert::create([
                'type' => 'birth_registered',
                'severity' => 'info',
                'title' => count($animals) === 1 ? 'Birth registered' : 'Litter registered ('.count($animals).' kids)',
                'message' => $idList.' born to '.$dam->animal_id.' on '.$birthDate.'. Dam returned to open breeding status.',
                'module' => 'livestock',
                'triggered_at' => now(),
            ]);

            return [
                'dam' => $dam->fresh(),
                'animals' => $animals,
                'births' => $births,
                'litter_size' => count($animals),
                'pregnancy_closed' => $closed > 0,
            ];
        });
    }

    /** Accept an EV-… code (preferred) or a numeric animals.id. */
    private function resolveAnimal(mixed $reference, string $field, string $label): Animal
    {
        if ($reference === null || $reference === '') {
            throw ValidationException::withMessages([$field => $label.' ID is required.']);
        }

        $animal = is_numeric($reference) && ! str_starts_with((string) $reference, 'EV-')
            ? Animal::find((int) $reference)
            : Animal::where('animal_id', (string) $reference)->first();

        if (! $animal) {
            throw ValidationException::withMessages([
                $field => $label.' ID '.$reference.' was not found in the Livestock Master.',
            ]);
        }

        return $animal;
    }
}
