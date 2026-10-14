<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Alert;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Notification centre endpoints.
 *
 * Notifications are backed by the `alerts` table: every alert is a
 * notification the team can read, filter, acknowledge and clear from the
 * Notifications page and the navbar bell dropdown.
 */
class NotificationController extends Controller
{
    /**
     * GET /notifications
     *
     * Filters: status (all|unread|read), severity, module, type,
     * q (free text on title/message/type/module), from/to (triggered_at day).
     * Paginated: page, per_page (1..100, default 15).
     */
    public function index(Request $request): JsonResponse
    {
        $query = Alert::query()->orderByDesc('triggered_at')->orderByDesc('id');

        $status = $request->query('status', 'all');
        if ($status === 'unread') {
            $query->where('is_read', false);
        } elseif ($status === 'read') {
            $query->where('is_read', true);
        }

        if ($request->filled('severity')) {
            $query->where('severity', $request->query('severity'));
        }

        if ($request->filled('module')) {
            $query->where('module', $request->query('module'));
        }

        if ($request->filled('type')) {
            $query->where('type', $request->query('type'));
        }

        if ($request->filled('q')) {
            $term = $request->query('q');
            $query->where(function ($builder) use ($term) {
                $builder->where('title', 'like', "%{$term}%")
                    ->orWhere('message', 'like', "%{$term}%")
                    ->orWhere('type', 'like', "%{$term}%")
                    ->orWhere('module', 'like', "%{$term}%");
            });
        }

        if ($request->filled('from')) {
            $query->where('triggered_at', '>=', $request->query('from'));
        }

        if ($request->filled('to')) {
            $query->whereDate('triggered_at', '<=', $request->query('to'));
        }

        $perPage = min(max((int) $request->query('per_page', 15), 1), 100);
        $page = $query->paginate($perPage);

        return response()->json([
            'data' => $page->items(),
            'meta' => [
                'total' => $page->total(),
                'count' => $page->count(),
                'per_page' => $page->perPage(),
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
            ],
            'summary' => $this->summary(),
        ]);
    }

    /**
     * GET /notifications/stats
     */
    public function stats(): JsonResponse
    {
        return response()->json($this->summary());
    }

    /**
     * GET /notifications/unread-count
     */
    public function unreadCount(): JsonResponse
    {
        return response()->json(['count' => Alert::where('is_read', false)->count()]);
    }

    /**
     * GET /notifications/{id}
     */
    public function show(int $id): JsonResponse
    {
        return response()->json(Alert::findOrFail($id));
    }

    /**
     * POST /notifications — publish a notification to the team.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'message' => ['nullable', 'string', 'max:2000'],
            'severity' => ['nullable', Rule::in(['info', 'success', 'warning', 'critical'])],
            'type' => ['nullable', 'string', 'max:100'],
            'module' => ['nullable', 'string', 'max:100'],
            'triggered_at' => ['nullable', 'date'],
        ]);

        $alert = Alert::create([
            'title' => $data['title'],
            'message' => $data['message'] ?? null,
            'severity' => $data['severity'] ?? 'info',
            'type' => $data['type'] ?? 'announcement',
            'module' => $data['module'] ?? 'general',
            'is_read' => false,
            'triggered_at' => $data['triggered_at'] ?? now(),
        ]);

        return response()->json($alert, 201);
    }

    /**
     * PATCH /notifications/{id}/read
     */
    public function markRead(int $id): JsonResponse
    {
        $alert = Alert::findOrFail($id);
        $alert->is_read = true;
        $alert->save();

        return response()->json($alert);
    }

    /**
     * PATCH /notifications/{id}/unread
     */
    public function markUnread(int $id): JsonResponse
    {
        $alert = Alert::findOrFail($id);
        $alert->is_read = false;
        $alert->save();

        return response()->json($alert);
    }

    /**
     * POST /notifications/read-all
     *
     * Optionally limited to the current filter set via ?severity=&module=&q=.
     */
    public function markAllRead(Request $request): JsonResponse
    {
        $query = Alert::where('is_read', false);

        if ($request->filled('severity')) {
            $query->where('severity', $request->query('severity'));
        }
        if ($request->filled('module')) {
            $query->where('module', $request->query('module'));
        }
        if ($request->filled('q')) {
            $term = $request->query('q');
            $query->where(function ($builder) use ($term) {
                $builder->where('title', 'like', "%{$term}%")
                    ->orWhere('message', 'like', "%{$term}%");
            });
        }

        $updated = $query->update(['is_read' => true]);

        return response()->json([
            'updated' => $updated,
            'count' => Alert::where('is_read', false)->count(),
        ]);
    }

    /**
     * DELETE /notifications/{id}
     */
    public function destroy(int $id): JsonResponse
    {
        $alert = Alert::findOrFail($id);
        $alert->delete();

        return response()->json([
            'deleted' => true,
            'count' => Alert::where('is_read', false)->count(),
        ]);
    }

    /**
     * DELETE /notifications — bulk clear.
     *
     * ?status=read   → clears acknowledged notifications only (safe default)
     * ?status=all    → clears everything
     * ?status=unread → clears unread only
     */
    public function clear(Request $request): JsonResponse
    {
        $status = $request->query('status', 'read');

        $query = Alert::query();
        if ($status === 'read') {
            $query->where('is_read', true);
        } elseif ($status === 'unread') {
            $query->where('is_read', false);
        }

        $deleted = $query->delete();

        return response()->json([
            'deleted' => $deleted,
            'count' => Alert::where('is_read', false)->count(),
        ]);
    }

    /**
     * Aggregate counts used by the page header cards and list footer.
     */
    private function summary(): array
    {
        $base = fn () => Alert::query();

        return [
            'total' => (clone $base())->count(),
            'unread' => (clone $base())->where('is_read', false)->count(),
            'read' => (clone $base())->where('is_read', true)->count(),
            'by_severity' => (clone $base())
                ->selectRaw('severity, COUNT(*) as count')
                ->groupBy('severity')
                ->pluck('count', 'severity'),
            'by_module' => (clone $base())
                ->selectRaw('module, COUNT(*) as count')
                ->groupBy('module')
                ->pluck('count', 'module'),
            'last_24h' => (clone $base())->where('triggered_at', '>=', now()->subDay())->count(),
        ];
    }
}
