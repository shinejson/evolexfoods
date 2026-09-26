<?php

namespace App\Support;

use Carbon\Carbon;
use Illuminate\Http\Request;

class DateRange
{
    public static function fromRequest(Request $request, int $defaultDays = 30): array
    {
        $from = $request->query('from')
            ? Carbon::parse($request->query('from'))->startOfDay()
            : now()->subDays($defaultDays)->startOfDay();

        $to = $request->query('to')
            ? Carbon::parse($request->query('to'))->endOfDay()
            : now()->endOfDay();

        return [$from, $to];
    }

    public static function period(Request $request): array
    {
        $period = $request->query('period', 'month');

        if ($period === 'week') {
            return [now()->startOfWeek(), now()->endOfDay()];
        }

        if ($period === 'year') {
            return [now()->startOfYear(), now()->endOfDay()];
        }

        return [now()->startOfMonth(), now()->endOfDay()];
    }
}
