<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Employee;
use App\Models\Task;
use Illuminate\Http\JsonResponse;

class HrTaskController extends Controller
{
    public function attendanceToday(): JsonResponse
    {
        $today = now()->toDateString();
        $records = Attendance::with('employee')->whereDate('work_date', $today)->get();
        $present = $records->whereIn('status', ['present', 'overtime'])->count();

        return response()->json([
            'question' => 21,
            'date' => $today,
            'present' => $present,
            'absent' => $records->where('status', 'absent')->count(),
            'leave' => $records->where('status', 'leave')->count(),
            'headcount' => Employee::where('status', 'active')->count(),
            'records' => $records,
            'source' => 'attendance',
        ]);
    }

    public function incompleteTasks(): JsonResponse
    {
        $tasks = Task::with('assignee')
            ->where('status', '!=', 'completed')
            ->orderBy('due_date')
            ->get();

        return response()->json([
            'question' => 22,
            'count' => $tasks->count(),
            'overdue' => $tasks->filter(fn ($t) => $t->due_date && $t->due_date->lt(now()->startOfDay()))->values(),
            'records' => $tasks,
            'source' => 'tasks',
        ]);
    }

    public function employees(): JsonResponse
    {
        return response()->json(Employee::orderBy('name')->get());
    }
}
