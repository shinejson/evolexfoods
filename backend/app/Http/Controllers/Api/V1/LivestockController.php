<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Animal;
use App\Models\Birth;
use App\Models\Death;
use App\Models\HealthRecord;
use App\Models\Pregnancy;
use App\Models\Treatment;
use App\Support\DateRange;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LivestockController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Animal::with('location');

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }
        if ($request->filled('sex')) {
            $query->where('sex', $request->query('sex'));
        }
        if ($request->filled('location_id')) {
            $query->where('location_id', $request->query('location_id'));
        }
        if ($request->filled('species')) {
            $query->where('species', $request->query('species'));
        }
        if ($request->filled('q')) {
            $q = $request->query('q');
            $query->where(function ($builder) use ($q) {
                $builder->where('animal_id', 'like', "%{$q}%")
                    ->orWhere('tag_id', 'like', "%{$q}%")
                    ->orWhere('breed', 'like', "%{$q}%");
            });
        }

        return response()->json($query->orderBy('animal_id')->paginate(50));
    }

    public function show(int $id): JsonResponse
    {
        $animal = Animal::with([
            'location',
            'events',
            'pregnancies',
            'healthRecords',
            'treatments',
        ])->findOrFail($id);

        return response()->json($animal);
    }

    public function summary(Request $request): JsonResponse
    {
        $alive = Animal::alive();

        if ($request->query('sex')) {
            $alive = (clone $alive)->where('sex', $request->query('sex'));
        }

        $byLocation = Animal::alive()
            ->join('locations', 'animals.location_id', '=', 'locations.id')
            ->selectRaw('locations.id as location_id, locations.name as location, count(*) as total')
            ->groupBy('locations.id', 'locations.name')
            ->get()
            ->map(fn ($row) => [
                'location_id' => $row->location_id,
                'location' => $row->location,
                'total' => (int) $row->total,
            ]);

        $bySpecies = Animal::alive()
            ->selectRaw('species, count(*) as total')
            ->groupBy('species')
            ->get();

        $byAge = [
            'juvenile' => Animal::alive()->whereDate('dob', '>=', now()->subYear())->count(),
            'yearling' => Animal::alive()->whereDate('dob', '<', now()->subYear())->whereDate('dob', '>=', now()->subYears(2))->count(),
            'adult' => Animal::alive()->where(function ($q) {
                $q->whereDate('dob', '<', now()->subYears(2))->orWhereNull('dob');
            })->count(),
        ];

        return response()->json([
            'question' => [1, 2, 3, 4],
            'total_owned' => Animal::alive()->count(),
            'female' => Animal::alive()->where('sex', 'female')->count(),
            'male' => Animal::alive()->where('sex', 'male')->count(),
            'by_location' => $byLocation,
            'by_species' => $bySpecies,
            'by_age' => $byAge,
            'filtered_count' => $alive->count(),
            'source' => 'animals',
        ]);
    }

    public function pregnancies(): JsonResponse
    {
        $active = Pregnancy::active()->with('animal.location')->get();

        $expected = [
            'next_7' => Pregnancy::active()->whereBetween('expected_birth_date', [now(), now()->addDays(7)])->count(),
            'next_30' => Pregnancy::active()->whereBetween('expected_birth_date', [now(), now()->addDays(30)])->count(),
            'next_60' => Pregnancy::active()->whereBetween('expected_birth_date', [now(), now()->addDays(60)])->count(),
            'next_90' => Pregnancy::active()->whereBetween('expected_birth_date', [now(), now()->addDays(90)])->count(),
        ];

        return response()->json([
            'question' => 5,
            'count' => $active->count(),
            'expected_births' => $expected,
            'records' => $active,
            'source' => 'pregnancies',
        ]);
    }

    public function births(Request $request): JsonResponse
    {
        [$from, $to] = DateRange::fromRequest($request);

        $query = Birth::with(['animal', 'location'])->whereBetween('birth_date', [$from, $to]);

        return response()->json([
            'question' => 6,
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'count' => (clone $query)->count(),
            'records' => $query->orderByDesc('birth_date')->get(),
            'source' => 'births',
        ]);
    }

    public function deaths(Request $request): JsonResponse
    {
        [$from, $to] = DateRange::fromRequest($request);

        $query = Death::with('animal')->whereBetween('death_date', [$from, $to]);

        return response()->json([
            'question' => 7,
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'count' => (clone $query)->count(),
            'records' => $query->orderByDesc('death_date')->get(),
            'source' => 'deaths',
        ]);
    }

    public function mortalityRate(Request $request): JsonResponse
    {
        [$from, $to] = DateRange::fromRequest($request, 30);

        $deaths = Death::whereBetween('death_date', [$from, $to])->count();
        $opening = Animal::where('created_at', '<=', $from)
            ->where(function ($q) use ($from) {
                $q->where('status', 'alive')
                    ->orWhereHas('deaths', fn ($d) => $d->where('death_date', '>=', $from));
            })
            ->count();

        $closing = Animal::alive()->count();
        $averageHerd = max(1, ($opening + $closing) / 2);
        $rate = round(($deaths / $averageHerd) * 100, 2);

        return response()->json([
            'question' => 8,
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'deaths' => $deaths,
            'opening_herd' => $opening,
            'closing_herd' => $closing,
            'average_herd' => round($averageHerd, 1),
            'mortality_rate' => $rate,
            'formula' => '(deaths in period / average herd size in period) * 100',
            'source' => 'deaths, animals',
        ]);
    }

    public function growth(Request $request): JsonResponse
    {
        [$from, $to] = DateRange::fromRequest($request, 90);

        $opening = max(1, Animal::where('created_at', '<=', $from)->count() - Death::where('death_date', '<', $from)->count());
        $closing = Animal::alive()->count();
        $growth = $closing - $opening;
        $rate = round(($growth / max(1, $opening)) * 100, 2);

        return response()->json([
            'question' => 11,
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'opening_herd' => $opening,
            'closing_herd' => $closing,
            'herd_growth' => $growth,
            'herd_growth_rate' => $rate,
            'births' => Birth::whereBetween('birth_date', [$from, $to])->count(),
            'deaths' => Death::whereBetween('death_date', [$from, $to])->count(),
            'source' => 'animals, births, deaths',
        ]);
    }

    public function sick(): JsonResponse
    {
        $records = HealthRecord::with('animal.location')
            ->where('status', 'open')
            ->orderByDesc('recorded_date')
            ->get();

        return response()->json([
            'question' => 9,
            'count' => $records->count(),
            'records' => $records,
            'source' => 'health_records',
        ]);
    }

    public function treatments(): JsonResponse
    {
        $records = Treatment::with('animal.location')
            ->where('status', 'active')
            ->orderByDesc('start_date')
            ->get();

        return response()->json([
            'question' => 10,
            'count' => $records->count(),
            'records' => $records,
            'source' => 'treatments',
        ]);
    }
}
