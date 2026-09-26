<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Alert;
use App\Models\AuditLog;
use App\Models\Decision;
use App\Models\Risk;
use App\Models\Sop;
use App\Models\SystemRegistry;
use Illuminate\Http\JsonResponse;

class GovernanceController extends Controller
{
    public function risks(): JsonResponse
    {
        $risks = Risk::with('owner')->orderByRaw("CASE severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END")->get();

        return response()->json([
            'question' => 29,
            'count' => $risks->where('status', 'open')->count(),
            'records' => $risks,
            'source' => 'risks',
        ]);
    }

    public function pendingOwner(): JsonResponse
    {
        $decisions = Decision::with(['requester', 'owner'])
            ->where('status', 'pending_owner')
            ->orderBy('due_date')
            ->get();

        return response()->json([
            'question' => 30,
            'count' => $decisions->count(),
            'records' => $decisions,
            'source' => 'decisions',
        ]);
    }

    public function alerts(): JsonResponse
    {
        return response()->json(Alert::orderByDesc('triggered_at')->limit(50)->get());
    }

    public function auditLogs(): JsonResponse
    {
        return response()->json(AuditLog::with('user')->orderByDesc('created_at')->limit(100)->get());
    }

    public function sops(): JsonResponse
    {
        return response()->json(Sop::orderBy('code')->get());
    }

    public function systems(): JsonResponse
    {
        return response()->json(SystemRegistry::orderBy('system_name')->get());
    }
}
