<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Alert;
use App\Models\Animal;
use App\Models\AnimalEvent;
use App\Models\AuditLog;
use App\Models\Birth;
use App\Models\Death;
use App\Models\HealthRecord;
use App\Models\PurchaseRequest;
use App\Models\Treatment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EventController extends Controller
{
    public function birth(Request $request): JsonResponse
    {
        $data = $request->validate([
            'mother_animal_id' => 'required|string',
            'sex' => 'required|in:female,male',
            'species' => 'required|string',
            'breed' => 'nullable|string',
            'birth_weight' => 'nullable|numeric',
            'location_id' => 'nullable|exists:locations,id',
            'notes' => 'nullable|string',
        ]);

        $prefix = match ($data['species']) {
            'sheep' => 'EV-SH',
            'cattle' => 'EV-CT',
            default => 'EV-GT',
        };

        $next = Animal::where('animal_id', 'like', $prefix.'-%')->count() + 1;
        $animalId = $prefix.'-'.str_pad((string) $next, 6, '0', STR_PAD_LEFT);

        $animal = Animal::create([
            'animal_id' => $animalId,
            'species' => $data['species'],
            'breed' => $data['breed'] ?? null,
            'sex' => $data['sex'],
            'dob' => now()->toDateString(),
            'mother_id' => $data['mother_animal_id'],
            'source' => 'born_on_farm',
            'location_id' => $data['location_id'] ?? null,
            'weight' => $data['birth_weight'] ?? null,
            'health_status' => 'healthy',
            'status' => 'alive',
            'current_status' => 'active',
            'notes' => $data['notes'] ?? null,
        ]);

        $birth = Birth::create([
            'animal_id' => $animal->id,
            'mother_animal_id' => $data['mother_animal_id'],
            'birth_date' => now()->toDateString(),
            'sex' => $data['sex'],
            'birth_weight' => $data['birth_weight'] ?? null,
            'location_id' => $data['location_id'] ?? null,
            'status' => 'alive',
            'notes' => $data['notes'] ?? null,
        ]);

        $this->logEvent($animal->id, 'birth', $request, ['birth_id' => $birth->id, 'animal_id' => $animalId]);

        return response()->json(['animal' => $animal, 'birth' => $birth], 201);
    }

    public function death(Request $request): JsonResponse
    {
        $data = $request->validate([
            'animal_id' => 'required|string',
            'cause' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $animal = Animal::where('animal_id', $data['animal_id'])->firstOrFail();
        $animal->update(['status' => 'dead', 'current_status' => 'inactive', 'health_status' => 'dead']);

        $death = Death::create([
            'animal_id' => $animal->id,
            'death_date' => now()->toDateString(),
            'cause' => $data['cause'] ?? 'unknown',
            'location_id' => $animal->location_id,
            'notes' => $data['notes'] ?? null,
        ]);

        Alert::create([
            'type' => 'animal_death',
            'severity' => 'critical',
            'title' => 'Animal death recorded',
            'message' => $animal->animal_id.' recorded as dead.',
            'module' => 'livestock',
            'triggered_at' => now(),
        ]);

        $this->logEvent($animal->id, 'death', $request, ['death_id' => $death->id]);

        return response()->json($death, 201);
    }

    public function sick(Request $request): JsonResponse
    {
        $data = $request->validate([
            'animal_id' => 'required|string',
            'condition' => 'required|string',
            'severity' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $animal = Animal::where('animal_id', $data['animal_id'])->firstOrFail();
        $animal->update(['health_status' => 'sick']);

        $record = HealthRecord::create([
            'animal_id' => $animal->id,
            'recorded_date' => now()->toDateString(),
            'condition' => $data['condition'],
            'severity' => $data['severity'] ?? 'moderate',
            'status' => 'open',
            'recorded_by' => $request->user()->id,
            'notes' => $data['notes'] ?? null,
        ]);

        Alert::create([
            'type' => 'sick_animal',
            'severity' => 'warning',
            'title' => 'Sick animal reported',
            'message' => $animal->animal_id.': '.$data['condition'],
            'module' => 'health',
            'triggered_at' => now(),
        ]);

        $this->logEvent($animal->id, 'sick', $request, ['health_record_id' => $record->id]);

        return response()->json($record, 201);
    }

    public function treatment(Request $request): JsonResponse
    {
        $data = $request->validate([
            'animal_id' => 'required|string',
            'treatment_type' => 'required|string',
            'medicine' => 'nullable|string',
            'dosage' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $animal = Animal::where('animal_id', $data['animal_id'])->firstOrFail();

        $treatment = Treatment::create([
            'animal_id' => $animal->id,
            'start_date' => now()->toDateString(),
            'treatment_type' => $data['treatment_type'],
            'medicine' => $data['medicine'] ?? null,
            'dosage' => $data['dosage'] ?? null,
            'status' => 'active',
            'notes' => $data['notes'] ?? null,
        ]);

        $this->logEvent($animal->id, 'treatment', $request, ['treatment_id' => $treatment->id]);

        return response()->json($treatment, 201);
    }

    public function purchaseRequest(Request $request): JsonResponse
    {
        $data = $request->validate([
            'item_name' => 'required|string',
            'category' => 'nullable|string',
            'quantity' => 'required|numeric',
            'unit' => 'nullable|string',
            'estimated_cost' => 'nullable|numeric',
            'priority' => 'nullable|string',
            'justification' => 'nullable|string',
        ]);

        $count = PurchaseRequest::count() + 1;
        $pr = PurchaseRequest::create([
            'request_number' => 'PR-'.now()->format('Y').'-'.str_pad((string) $count, 3, '0', STR_PAD_LEFT),
            'requested_by' => $request->user()->id,
            'requested_at' => now()->toDateString(),
            'item_name' => $data['item_name'],
            'category' => $data['category'] ?? null,
            'quantity' => $data['quantity'],
            'unit' => $data['unit'] ?? null,
            'estimated_cost' => $data['estimated_cost'] ?? null,
            'priority' => $data['priority'] ?? 'normal',
            'status' => 'pending',
            'justification' => $data['justification'] ?? null,
        ]);

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'purchase.requested',
            'auditable_type' => PurchaseRequest::class,
            'auditable_id' => $pr->id,
            'meta' => ['request_number' => $pr->request_number],
            'ip_address' => $request->ip(),
        ]);

        return response()->json($pr, 201);
    }

    public function locations(): JsonResponse
    {
        return response()->json(\App\Models\Location::orderBy('name')->get());
    }

    private function logEvent(int $animalId, string $type, Request $request, array $payload): void
    {
        AnimalEvent::create([
            'animal_id' => $animalId,
            'event_type' => $type,
            'occurred_at' => now(),
            'recorded_by' => $request->user()->id,
            'payload' => $payload,
        ]);

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'animal.'.$type,
            'auditable_type' => Animal::class,
            'auditable_id' => $animalId,
            'meta' => $payload,
            'ip_address' => $request->ip(),
        ]);
    }
}
