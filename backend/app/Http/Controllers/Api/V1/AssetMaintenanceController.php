<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Asset;
use App\Models\MaintenanceSchedule;
use App\Models\MaintenanceTicket;
use Illuminate\Http\JsonResponse;

class AssetMaintenanceController extends Controller
{
    public function index(): JsonResponse
    {
        $assets = Asset::with(['location', 'supplier'])->orderBy('asset_id')->get();

        return response()->json([
            'question' => 19,
            'count' => $assets->count(),
            'records' => $assets,
            'source' => 'assets',
        ]);
    }

    public function due(): JsonResponse
    {
        $due = MaintenanceSchedule::with('asset')
            ->whereIn('status', ['scheduled', 'overdue'])
            ->whereDate('due_date', '<=', now()->addDays(14))
            ->orderBy('due_date')
            ->get();

        $open = MaintenanceTicket::with('asset')
            ->whereIn('status', ['open', 'assigned', 'in_progress'])
            ->orderByDesc('reported_at')
            ->get();

        return response()->json([
            'question' => 20,
            'due_count' => $due->count(),
            'open_tickets' => $open->count(),
            'overdue' => $due->filter(fn ($s) => $s->due_date->lt(now()))->values(),
            'schedules' => $due,
            'tickets' => $open,
            'source' => 'maintenance_schedules, maintenance_tickets',
        ]);
    }

    public function tickets(): JsonResponse
    {
        return response()->json(
            MaintenanceTicket::with('asset')->orderByDesc('reported_at')->get()
        );
    }
}
