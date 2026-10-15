<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\WeeklyOwnerReportService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    /**
     * 1-Click Weekly Owner Report (§113).
     *
     * Defaults to the last 7 days ending today; pass ?from=&to= (Y-m-d) to
     * compile any week. The Angular CEO Command Center renders this payload
     * as the printable / PDF executive digest.
     */
    public function weeklyOwner(Request $request, WeeklyOwnerReportService $report): JsonResponse
    {
        $request->validate([
            'from' => 'nullable|date',
            'to' => 'nullable|date|after_or_equal:from',
        ]);

        $from = $request->query('from') ? Carbon::parse($request->query('from')) : null;
        $to = $request->query('to') ? Carbon::parse($request->query('to')) : null;

        return response()->json($report->build($from, $to));
    }
}
