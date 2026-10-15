<?php

namespace App\Services;

use App\Models\Alert;
use App\Models\Animal;
use App\Models\Attendance;
use App\Models\Birth;
use App\Models\ChannelMetric;
use App\Models\Company;
use App\Models\ContentItem;
use App\Models\Death;
use App\Models\Deal;
use App\Models\Decision;
use App\Models\Employee;
use App\Models\Expense;
use App\Models\FeedItem;
use App\Models\HealthRecord;
use App\Models\InventoryItem;
use App\Models\Invoice;
use App\Models\MaintenanceTicket;
use App\Models\Pregnancy;
use App\Models\PurchaseOrder;
use App\Models\PurchaseRequest;
use App\Models\Risk;
use App\Models\SalesCull;
use App\Models\Task;
use App\Models\Treatment;
use Carbon\Carbon;

/**
 * 1-Click Weekly Owner Report (§113).
 *
 * One standardised digest every week — not dozens of disconnected messages.
 * The report is compiled into eight sections:
 *
 *   1. Executive summary          5. Procurement & spend (WTD / MTD)
 *   2. Livestock & herd equation  6. Sales & marketing
 *   3. Operations & people        7. Risks
 *   4. Feed & inventory           8. Owner decisions required
 *
 * The herd equation is stated exactly as ownership requires it:
 *   Opening herd + Births + Purchases − Deaths − Sales = Closing herd.
 */
class WeeklyOwnerReportService
{
    public function __construct(
        private readonly GestationRadarService $radar,
        private readonly ProcurementApprovalService $approvals,
    ) {
    }

    public function build(?Carbon $from = null, ?Carbon $to = null): array
    {
        $to = ($to ?? now())->endOfDay();
        $from = ($from ?? $to->copy()->subDays(6))->startOfDay();

        /* ---------------- Livestock ---------------- */
        $opening = max(0,
            Animal::where('created_at', '<=', $from)->count()
            - Death::where('death_date', '<', $from->toDateString())->count()
            - SalesCull::where('event_date', '<', $from->toDateString())->count()
        );
        $births = Birth::whereBetween('birth_date', [$from->toDateString(), $to->toDateString()])->count();
        $purchases = Animal::where('source', 'purchased')->whereBetween('created_at', [$from, $to])->count();
        $deaths = Death::whereBetween('death_date', [$from->toDateString(), $to->toDateString()])->count();
        $sales = SalesCull::whereBetween('event_date', [$from->toDateString(), $to->toDateString()])->count();
        $computedClosing = $opening + $births + $purchases - $deaths - $sales;
        $closing = Animal::alive()->count();
        $pregnant = Pregnancy::active()->count();
        $sick = HealthRecord::where('status', 'open')->count();
        $underTreatment = Treatment::where('status', 'active')->count();
        $averageHerd = max(1, ($opening + $closing) / 2);
        $mortalityRate = round(($deaths / $averageHerd) * 100, 2);
        $radar = $this->radar->radar(now()->startOfDay());

        /* ---------------- Feed & inventory ---------------- */
        $feedItems = FeedItem::with('inventoryItem')->get();
        $feedOnHand = round((float) $feedItems->sum(fn ($i) => (float) ($i->inventoryItem?->quantity_on_hand ?? 0)), 2);
        $dailyFeed = (float) $feedItems->sum(fn ($i) => (float) $i->daily_consumption);
        $feedDays = $dailyFeed > 0 ? round($feedOnHand / $dailyFeed, 1) : null;
        $lowStockItems = InventoryItem::where('status', 'active')
            ->whereColumn('quantity_on_hand', '<=', 'reorder_level')
            ->orderBy('name')
            ->limit(10)
            ->get(['name', 'category', 'quantity_on_hand', 'reorder_level', 'unit'])
            ->map(fn ($i) => [
                'name' => $i->name, 'category' => $i->category,
                'quantity_on_hand' => (float) $i->quantity_on_hand,
                'reorder_level' => (float) $i->reorder_level, 'unit' => $i->unit,
            ])->all();
        $medicines = InventoryItem::where('category', 'Medicine')->where('status', 'active')->count();

        /* ---------------- Operations & people ---------------- */
        $tasksCompleted = Task::where('status', 'completed')->whereBetween('updated_at', [$from, $to])->count();
        $tasksOutstanding = Task::where('status', '!=', 'completed')->count();
        $tasksOverdue = Task::where('status', '!=', 'completed')->whereDate('due_date', '<', now()->toDateString())->count();
        $attendanceRows = Attendance::whereBetween('work_date', [$from->toDateString(), $to->toDateString()])->get();
        $attendance = [
            'present' => $attendanceRows->whereIn('status', ['present', 'overtime'])->count(),
            'absent' => $attendanceRows->where('status', 'absent')->count(),
            'leave' => $attendanceRows->where('status', 'leave')->count(),
            'records' => $attendanceRows->count(),
        ];
        $staffing = Employee::where('status', 'active')->count();
        $openTickets = MaintenanceTicket::whereIn('status', ['open', 'assigned', 'in_progress'])
            ->orderBy('reported_at')->limit(8)
            ->get(['ticket_number', 'title', 'priority', 'status'])
            ->map(fn ($t) => ['ticket_number' => $t->ticket_number, 'title' => $t->title, 'priority' => $t->priority, 'status' => $t->status])
            ->all();

        /* ---------------- Procurement & spend ---------------- */
        $spendPeriod = $this->spendBetween($from, $to);
        $spendWeek = $this->spendBetween(now()->startOfWeek(), now()->endOfDay());
        $spendMonth = $this->spendBetween(now()->startOfMonth(), now()->endOfDay());
        $requestsInPeriod = PurchaseRequest::whereBetween('requested_at', [$from->toDateString(), $to->toDateString()])->count();
        $pendingTier1 = PurchaseRequest::where(function ($q) {
            $q->where('approval_stage', 'pending_tier_1')
                ->orWhere(fn ($r) => $r->whereNull('approval_stage')->where('status', 'pending')->where(fn ($c) => $c->whereNull('estimated_cost')->orWhere('estimated_cost', '<=', $this->approvals->threshold())));
        })->count();
        $pendingExecutive = PurchaseRequest::where(function ($q) {
            $q->where('approval_stage', 'pending_tier_2')
                ->orWhere(fn ($r) => $r->whereNull('approval_stage')->where('status', 'pending')->where('estimated_cost', '>', $this->approvals->threshold()));
        })->get(['request_number', 'item_name', 'estimated_cost', 'priority', 'requested_at']);
        $ordersInPeriod = PurchaseOrder::whereBetween('ordered_at', [$from->toDateString(), $to->toDateString()])->count();
        $openOrders = PurchaseOrder::whereIn('status', ['open', 'ordered', 'placed'])->count();

        /* ---------------- Sales & marketing ---------------- */
        $prospects = Company::whereIn('lifecycle_stage', ['lead', 'prospect', 'subscriber'])->count();
        $openDeals = Deal::where('status', 'open');
        $contentProduced = ContentItem::whereBetween('created_at', [$from, $to])->count();
        $channel = ChannelMetric::whereBetween('metric_date', [$from->toDateString(), $to->toDateString()]);

        /* ---------------- Risks & decisions ---------------- */
        $risks = Risk::where('status', 'open')->orderByRaw("case severity when 'critical' then 0 when 'high' then 1 when 'medium' then 2 else 3 end")
            ->limit(8)->get(['title', 'category', 'severity', 'status'])
            ->map(fn ($r) => ['title' => $r->title, 'category' => $r->category, 'severity' => $r->severity, 'status' => $r->status])->all();
        $decisions = Decision::where('status', 'pending_owner')->orderBy('due_date')
            ->limit(10)->get(['title', 'description', 'due_date'])
            ->map(fn ($d) => ['title' => $d->title, 'description' => $d->description, 'due_date' => $d->due_date?->toDateString()])->all();
        $alerts = Alert::where('is_read', false)->orderByDesc('triggered_at')->limit(8)
            ->get(['type', 'severity', 'title', 'message', 'triggered_at'])
            ->map(fn ($a) => ['type' => $a->type, 'severity' => $a->severity, 'title' => $a->title, 'message' => $a->message, 'triggered_at' => $a->triggered_at?->toIso8601String()])->all();

        $developments = array_values(array_filter([
            $births > 0 ? $births.' birth'.($births === 1 ? '' : 's').' registered this week.' : null,
            $deaths > 0 ? $deaths.' death'.($deaths === 1 ? '' : 's').' recorded (mortality '.$mortalityRate.'%).' : 'No deaths recorded this week.',
            $feedDays !== null ? 'Feed cover stands at '.$feedDays.' days.' : null,
            'Spend this week: GH₵'.number_format($spendWeek['total'], 2).' · Month to date: GH₵'.number_format($spendMonth['total'], 2).'.',
            $pendingExecutive->count() > 0 ? $pendingExecutive->count().' purchase(s) over GH₵'.number_format($this->approvals->threshold(), 0).' await Executive approval.' : null,
            count($decisions) > 0 ? count($decisions).' owner decision(s) required.' : null,
            $radar['horizons'][0]['count'] > 0 ? $radar['horizons'][0]['count'].' birth(s) expected in the next 7 days.' : null,
        ]));

        $headline = $deaths > 0 || count($risks) > 0 || ($feedDays !== null && $feedDays < 14)
            ? 'Week in review — items need ownership attention'
            : 'Week in review — herd steady';

        return [
            'report' => 'Weekly Owner Report',
            'manual_reference' => '§113',
            'generated_at' => now()->toIso8601String(),
            'period' => ['from' => $from->toDateString(), 'to' => $to->toDateString(), 'label' => $from->format('j M Y').' – '.$to->format('j M Y')],
            'sections' => [
                [
                    'key' => 'executive_summary', 'number' => 1, 'title' => 'Executive Summary',
                    'headline' => $headline,
                    'major_developments' => $developments,
                    'key_numbers' => [
                        'closing_herd' => $closing, 'births' => $births, 'deaths' => $deaths,
                        'feed_days_remaining' => $feedDays, 'spend_week_to_date' => $spendWeek['total'],
                        'spend_month_to_date' => $spendMonth['total'],
                        'risks_open' => count($risks), 'decisions_required' => count($decisions),
                    ],
                ],
                [
                    'key' => 'livestock', 'number' => 2, 'title' => 'Livestock',
                    'herd_reconciliation' => [
                        'opening_herd' => $opening, 'births' => $births, 'purchases' => $purchases,
                        'deaths' => $deaths, 'sales' => $sales, 'closing_herd' => $closing,
                        'computed_closing' => $computedClosing,
                        'variance' => $closing - $computedClosing,
                        'equation' => 'Opening herd + Births + Purchases − Deaths − Sales = Closing herd',
                        'equation_display' => $opening.' + '.$births.' + '.$purchases.' − '.$deaths.' − '.$sales.' = '.$computedClosing,
                        'reconciles' => ($closing - $computedClosing) === 0,
                    ],
                    'pregnancies' => $pregnant,
                    'expected_births' => collect($radar['horizons'])->mapWithKeys(fn ($h) => ['next_'.$h['days'] => $h['count']])->all(),
                    'health_issues' => $sick,
                    'under_treatment' => $underTreatment,
                    'mortality_rate' => $mortalityRate,
                ],
                [
                    'key' => 'operations_people', 'number' => 3, 'title' => 'Operations & People',
                    'completed_work' => $tasksCompleted, 'outstanding_work' => $tasksOutstanding,
                    'overdue_work' => $tasksOverdue, 'problems' => $openTickets,
                    'attendance' => $attendance, 'staffing' => $staffing,
                    'performance_concerns' => $tasksOverdue > 0 ? $tasksOverdue.' overdue task(s) outstanding.' : 'No overdue tasks.',
                ],
                [
                    'key' => 'feed_inventory', 'number' => 4, 'title' => 'Feed & Inventory',
                    'feed_on_hand_kg' => $feedOnHand, 'daily_consumption_kg' => round($dailyFeed, 2),
                    'feed_days_remaining' => $feedDays, 'medicines_available' => $medicines,
                    'critical_stock' => $lowStockItems,
                ],
                [
                    'key' => 'procurement_spend', 'number' => 5, 'title' => 'Procurement & Financial Operations',
                    'requests_in_period' => $requestsInPeriod,
                    'pending_supervisor_approvals' => $pendingTier1,
                    'pending_executive_approvals' => $pendingExecutive->map(fn ($r) => [
                        'request_number' => $r->request_number, 'item_name' => $r->item_name,
                        'estimated_cost' => (float) $r->estimated_cost, 'priority' => $r->priority,
                    ])->all(),
                    'approval_threshold_ghs' => $this->approvals->threshold(),
                    'purchases_in_period' => $ordersInPeriod, 'open_orders' => $openOrders,
                    'spend' => [
                        'period' => $spendPeriod,
                        'week_to_date' => $spendWeek,
                        'month_to_date' => $spendMonth,
                    ],
                ],
                [
                    'key' => 'sales_marketing', 'number' => 6, 'title' => 'Sales & Marketing',
                    'prospects' => $prospects,
                    'opportunities' => (clone $openDeals)->count(),
                    'pipeline_value' => (float) (clone $openDeals)->sum('amount'),
                    'sales_in_period' => $sales,
                    'content_produced' => $contentProduced,
                    'reach' => (int) (clone $channel)->sum('reach'),
                    'views' => (int) (clone $channel)->sum('views'),
                    'leads' => (int) (clone $channel)->sum('leads'),
                ],
                [
                    'key' => 'risks', 'number' => 7, 'title' => 'Risks',
                    'open_risks' => $risks, 'unread_alerts' => $alerts,
                ],
                [
                    'key' => 'decisions', 'number' => 8, 'title' => 'Owner Decisions Required',
                    'decisions' => $decisions,
                    'executive_procurement_awaiting' => $pendingExecutive->count(),
                    'note' => 'Keep this concise and actionable — each item needs an owner decision.',
                ],
            ],
            'source' => 'animals, births, deaths, sales_culls, pregnancies, feed_items, expenses, purchase_orders, invoices, risks, decisions',
        ];
    }

    private function spendBetween(Carbon $from, Carbon $to): array
    {
        $expenses = (float) Expense::whereBetween('expense_date', [$from->toDateString(), $to->toDateString()])->sum('amount');
        $orders = (float) PurchaseOrder::whereBetween('ordered_at', [$from->toDateString(), $to->toDateString()])->sum('total_amount');
        $invoices = (float) Invoice::whereBetween('invoice_date', [$from->toDateString(), $to->toDateString()])->sum('amount');

        return [
            'from' => $from->toDateString(), 'to' => $to->toDateString(),
            'expenses' => round($expenses, 2), 'purchase_orders' => round($orders, 2),
            'invoices' => round($invoices, 2), 'total' => round($expenses + $orders + $invoices, 2),
        ];
    }
}
