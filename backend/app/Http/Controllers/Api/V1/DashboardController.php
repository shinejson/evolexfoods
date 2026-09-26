<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Alert;
use App\Models\Animal;
use App\Models\Asset;
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
use App\Models\Location;
use App\Models\MaintenanceSchedule;
use App\Models\MaintenanceTicket;
use App\Models\Pregnancy;
use App\Models\PurchaseOrder;
use App\Models\PurchaseRequest;
use App\Models\Risk;
use App\Models\Supplier;
use App\Models\Task;
use App\Models\Treatment;
use App\Support\DateRange;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function ceo(Request $request): JsonResponse
    {
        [$from, $to] = DateRange::fromRequest($request, 30);

        $alive = Animal::alive()->count();
        $female = Animal::alive()->where('sex', 'female')->count();
        $male = Animal::alive()->where('sex', 'male')->count();
        $pregnant = Pregnancy::active()->count();
        $births = Birth::whereBetween('birth_date', [$from, $to])->count();
        $deaths = Death::whereBetween('death_date', [$from, $to])->count();

        $opening = max(1, Animal::where('created_at', '<=', $from)->count() - Death::where('death_date', '<', $from)->count());
        $averageHerd = max(1, ($opening + $alive) / 2);
        $mortalityRate = round(($deaths / $averageHerd) * 100, 2);
        $growth = $alive - $opening;
        $growthRate = round(($growth / $opening) * 100, 2);

        $feedItems = FeedItem::with('inventoryItem')->get();
        $feedOnHand = $feedItems->sum(fn ($item) => (float) ($item->inventoryItem?->quantity_on_hand ?? 0));
        $dailyFeed = $feedItems->sum(fn ($item) => (float) $item->daily_consumption);
        $daysFeed = $dailyFeed > 0 ? round($feedOnHand / $dailyFeed, 1) : null;

        $lowStock = InventoryItem::whereColumn('quantity_on_hand', '<=', 'reorder_level')->where('status', 'active')->count();
        $medicines = InventoryItem::where('category', 'Medicine')->where('status', 'active')->count();

        $weekFrom = now()->startOfWeek();
        $monthFrom = now()->startOfMonth();
        $weekSpend = $this->spendBetween($weekFrom, $to);
        $monthSpend = $this->spendBetween($monthFrom, $to);

        $alerts = Alert::where('is_read', false)->orderByDesc('triggered_at')->limit(12)->get();

        $answers = [
            1 => ['question' => 'How many animals do we own?', 'value' => $alive, 'source' => 'animals'],
            2 => [
                'question' => 'Where are they?',
                'value' => Location::withCount(['animals as total' => fn ($q) => $q->where('status', 'alive')->where('current_status', 'active')])->get()->map(fn ($l) => [
                    'location' => $l->name, 'total' => $l->total,
                ]),
                'source' => 'animals, locations',
            ],
            3 => ['question' => 'How many are female?', 'value' => $female, 'source' => 'animals'],
            4 => ['question' => 'How many are male?', 'value' => $male, 'source' => 'animals'],
            5 => ['question' => 'How many are pregnant?', 'value' => $pregnant, 'source' => 'pregnancies'],
            6 => ['question' => 'How many births have occurred?', 'value' => $births, 'period' => [$from->toDateString(), $to->toDateString()], 'source' => 'births'],
            7 => ['question' => 'How many deaths have occurred?', 'value' => $deaths, 'period' => [$from->toDateString(), $to->toDateString()], 'source' => 'deaths'],
            8 => ['question' => 'What is the mortality rate?', 'value' => $mortalityRate, 'unit' => '%', 'source' => 'deaths, animals'],
            9 => ['question' => 'Which animals are sick?', 'value' => HealthRecord::where('status', 'open')->count(), 'source' => 'health_records'],
            10 => ['question' => 'Which animals are under treatment?', 'value' => Treatment::where('status', 'active')->count(), 'source' => 'treatments'],
            11 => ['question' => 'How quickly is the herd growing?', 'value' => $growth, 'rate' => $growthRate, 'source' => 'animals'],
            12 => ['question' => 'How much feed remains?', 'value' => round($feedOnHand, 2), 'unit' => 'kg', 'source' => 'feed_items'],
            13 => ['question' => 'How many days of feed remain?', 'value' => $daysFeed, 'source' => 'feed_items'],
            14 => ['question' => 'Which medicines are available?', 'value' => $medicines, 'source' => 'inventory_items'],
            15 => ['question' => 'Which inventory items are low?', 'value' => $lowStock, 'source' => 'inventory_items'],
            16 => ['question' => 'What purchases have been requested?', 'value' => PurchaseRequest::count(), 'pending' => PurchaseRequest::where('status', 'pending')->count(), 'source' => 'purchase_requests'],
            17 => ['question' => 'Who approved each purchase?', 'value' => PurchaseRequest::whereHas('approvals')->count(), 'source' => 'purchase_request_approvals'],
            18 => ['question' => 'What has been purchased?', 'value' => PurchaseOrder::count(), 'source' => 'purchase_orders, goods_receipts'],
            19 => ['question' => 'What equipment does Evolex own?', 'value' => Asset::where('status', 'active')->count(), 'source' => 'assets'],
            20 => [
                'question' => 'What equipment requires maintenance?',
                'value' => MaintenanceSchedule::whereIn('status', ['scheduled', 'overdue'])->whereDate('due_date', '<=', now()->addDays(14))->count(),
                'open_tickets' => MaintenanceTicket::whereIn('status', ['open', 'assigned', 'in_progress'])->count(),
                'source' => 'maintenance_schedules, maintenance_tickets',
            ],
            21 => [
                'question' => 'Who is working?',
                'value' => Attendance::whereDate('work_date', now())->whereIn('status', ['present', 'overtime'])->count(),
                'headcount' => Employee::where('status', 'active')->count(),
                'source' => 'attendance',
            ],
            22 => ['question' => 'What tasks remain incomplete?', 'value' => Task::where('status', '!=', 'completed')->count(), 'source' => 'tasks'],
            23 => [
                'question' => 'How much are we spending?',
                'week' => $weekSpend,
                'month' => $monthSpend,
                'source' => 'expenses, purchase_orders, invoices',
            ],
            24 => ['question' => 'Who are our suppliers?', 'value' => Supplier::where('status', 'active')->count(), 'source' => 'suppliers'],
            25 => ['question' => 'Who are our potential customers?', 'value' => Company::whereIn('lifecycle_stage', ['lead', 'prospect', 'subscriber'])->count(), 'source' => 'companies'],
            26 => [
                'question' => 'What commercial opportunities exist?',
                'value' => Deal::where('status', 'open')->count(),
                'pipeline_value' => (float) Deal::where('status', 'open')->sum('amount'),
                'source' => 'deals',
            ],
            27 => ['question' => 'What marketing is being produced?', 'value' => ContentItem::count(), 'published' => ContentItem::where('status', 'published')->count(), 'source' => 'content_items, media_assets'],
            28 => [
                'question' => 'How are our digital channels performing?',
                'value' => [
                    'reach_30d' => (int) ChannelMetric::where('metric_date', '>=', now()->subDays(30))->sum('reach'),
                    'views_30d' => (int) ChannelMetric::where('metric_date', '>=', now()->subDays(30))->sum('views'),
                    'leads_30d' => (int) ChannelMetric::where('metric_date', '>=', now()->subDays(30))->sum('leads'),
                ],
                'source' => 'channel_metrics',
            ],
            29 => ['question' => 'What risks currently exist?', 'value' => Risk::where('status', 'open')->count(), 'source' => 'risks'],
            30 => ['question' => 'What decisions require ownership approval?', 'value' => Decision::where('status', 'pending_owner')->count(), 'source' => 'decisions'],
        ];

        return response()->json([
            'generated_at' => now()->toIso8601String(),
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'kpis' => [
                'total_herd' => $alive,
                'female' => $female,
                'male' => $male,
                'pregnancies' => $pregnant,
                'births' => $births,
                'deaths' => $deaths,
                'mortality_rate' => $mortalityRate,
                'herd_growth' => $growth,
                'herd_growth_rate' => $growthRate,
                'sick' => HealthRecord::where('status', 'open')->count(),
                'under_treatment' => Treatment::where('status', 'active')->count(),
                'feed_remaining' => round($feedOnHand, 2),
                'days_feed_remaining' => $daysFeed,
                'low_stock' => $lowStock,
                'open_purchase_requests' => PurchaseRequest::where('status', 'pending')->count(),
                'pending_approvals' => PurchaseRequest::where('status', 'pending')->count(),
                'equipment_due_maintenance' => MaintenanceSchedule::whereIn('status', ['scheduled', 'overdue'])->whereDate('due_date', '<=', now()->addDays(14))->count(),
                'employees_present' => Attendance::whereDate('work_date', now())->whereIn('status', ['present', 'overtime'])->count(),
                'open_tasks' => Task::where('status', '!=', 'completed')->count(),
                'spending_week' => $weekSpend,
                'spending_month' => $monthSpend,
                'prospects' => Company::whereIn('lifecycle_stage', ['lead', 'prospect', 'subscriber'])->count(),
                'opportunities' => Deal::where('status', 'open')->count(),
                'content_produced' => ContentItem::count(),
                'digital_performance' => [
                    'reach_30d' => (int) ChannelMetric::where('metric_date', '>=', now()->subDays(30))->sum('reach'),
                    'views_30d' => (int) ChannelMetric::where('metric_date', '>=', now()->subDays(30))->sum('views'),
                    'leads_30d' => (int) ChannelMetric::where('metric_date', '>=', now()->subDays(30))->sum('leads'),
                ],
                'risks' => Risk::where('status', 'open')->count(),
                'owner_decisions_required' => Decision::where('status', 'pending_owner')->count(),
            ],
            'answers' => $answers,
            'alerts' => $alerts,
        ]);
    }

    public function hub(): JsonResponse
    {
        return response()->json([
            'company' => 'Evolex',
            'platform' => 'Evolex Hub',
            'quick_actions' => [
                ['id' => 'birth', 'label' => 'Report Animal Birth', 'route' => '/livestock/births'],
                ['id' => 'death', 'label' => 'Report Animal Death', 'route' => '/livestock/deaths'],
                ['id' => 'sick', 'label' => 'Report Sick Animal', 'route' => '/health'],
                ['id' => 'treatment', 'label' => 'Record Animal Treatment', 'route' => '/health'],
                ['id' => 'breeding', 'label' => 'Record Breeding', 'route' => '/breeding'],
                ['id' => 'purchase', 'label' => 'Request Purchase', 'route' => '/procurement'],
                ['id' => 'receive', 'label' => 'Receive Inventory', 'route' => '/inventory'],
                ['id' => 'issue', 'label' => 'Issue Inventory', 'route' => '/inventory'],
                ['id' => 'maintenance', 'label' => 'Report Maintenance', 'route' => '/maintenance'],
                ['id' => 'incident', 'label' => 'Report Incident', 'route' => '/risks'],
                ['id' => 'calendar', 'label' => 'View Farm Calendar', 'route' => '/hub'],
                ['id' => 'sops', 'label' => 'View SOPs', 'route' => '/sops'],
                ['id' => 'ceo', 'label' => 'Open CEO Dashboard', 'route' => '/ceo'],
            ],
            'sections' => [
                'Home', 'Farm Operations', 'Livestock', 'Employees', 'Procurement',
                'Inventory', 'Maintenance', 'SOP Library', 'Training', 'Sales',
                'Marketing', 'Dashboards', 'Calendar', 'Company Directory', 'Technology', 'Support',
            ],
        ]);
    }

    private function spendBetween($from, $to): float
    {
        $expenses = (float) Expense::whereBetween('expense_date', [$from, $to])->sum('amount');
        $pos = (float) PurchaseOrder::whereBetween('ordered_at', [$from, $to])->sum('total_amount');
        $invoices = (float) Invoice::whereBetween('invoice_date', [$from, $to])->sum('amount');

        return round($expenses + $pos + $invoices, 2);
    }
}
