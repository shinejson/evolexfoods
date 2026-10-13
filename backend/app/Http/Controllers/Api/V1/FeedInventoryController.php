<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\FeedItem;
use App\Models\FeedTransaction;
use App\Models\InventoryItem;
use App\Models\MedicineBatch;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FeedInventoryController extends Controller
{
    public function feedSummary(): JsonResponse
    {
        $items = FeedItem::with(['inventoryItem.supplier', 'transactions'])->get();

        $onHand = (float) $items->sum(fn ($item) => (float) ($item->inventoryItem?->quantity_on_hand ?? 0));
        $daily = (float) $items->sum(fn ($item) => (float) $item->daily_consumption);
        $alive = max(1, \App\Models\Animal::alive()->count());
        $days = $daily > 0 ? round($onHand / $daily, 1) : null;

        $costPerAnimal = round($items->sum(fn ($item) =>
            ((float) ($item->inventoryItem?->average_cost ?? 0)) * ((float) $item->daily_consumption)
        ) / $alive, 2);

        $formatted = $items->map(fn ($item) => $this->formatFeedItem($item))->values();
        $lowStockCount = $formatted->filter(fn ($i) => in_array($i['stock_status'], ['low_stock', 'critical', 'out_of_stock']))->count();
        $totalValue = round($formatted->sum('total_value'), 2);

        return response()->json([
            'question' => 12,
            'feed_on_hand' => round($onHand, 2),
            'average_daily_consumption' => round($daily, 2),
            'days_remaining' => $days,
            'feed_cost_per_animal' => $costPerAnimal,
            'total_items' => $items->count(),
            'low_stock_count' => $lowStockCount,
            'total_inventory_value' => $totalValue,
            'alert' => $days !== null && $days <= 7,
            'items' => $formatted,
            'source' => 'feed_items, inventory_items',
        ]);
    }

    public function daysRemaining(): JsonResponse
    {
        $items = FeedItem::with('inventoryItem')->get();
        $onHand = $items->sum(fn ($item) => (float) ($item->inventoryItem?->quantity_on_hand ?? 0));
        $daily = $items->sum(fn ($item) => (float) $item->daily_consumption);
        $days = $daily > 0 ? round($onHand / $daily, 1) : null;

        return response()->json([
            'question' => 13,
            'feed_on_hand' => round($onHand, 2),
            'average_daily_consumption' => round($daily, 2),
            'days_remaining' => $days,
            'formula' => 'feed_on_hand / average_daily_feed_consumption',
            'alert' => $days !== null && $days <= 7,
            'source' => 'feed_items, inventory_items',
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $query = FeedItem::with(['inventoryItem.supplier', 'transactions']);

        if ($request->filled('q')) {
            $term = $request->query('q');
            $query->where(function ($b) use ($term) {
                $b->where('feed_type', 'like', "%{$term}%")
                  ->orWhereHas('inventoryItem', function ($inv) use ($term) {
                      $inv->where('name', 'like', "%{$term}%")
                          ->orWhere('item_id', 'like', "%{$term}%")
                          ->orWhere('storage_location', 'like', "%{$term}%");
                  });
            });
        }

        if ($request->filled('feed_type')) {
            $query->where('feed_type', $request->query('feed_type'));
        }

        if ($request->filled('status')) {
            $status = $request->query('status');
            $query->whereHas('inventoryItem', fn ($q) => $q->where('status', $status));
        }

        if ($request->filled('storage_location')) {
            $loc = $request->query('storage_location');
            $query->whereHas('inventoryItem', fn ($q) => $q->where('storage_location', $loc));
        }

        $items = $query->orderByDesc('id')->get()->map(fn ($item) => $this->formatFeedItem($item))->values();

        // Optional stock status filter in memory (calculated status)
        if ($request->filled('stock_status')) {
            $target = $request->query('stock_status');
            $items = $items->filter(fn ($item) => $item['stock_status'] === $target)->values();
        }

        return response()->json([
            'data' => $items,
            'total' => $items->count(),
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $item = FeedItem::with(['inventoryItem.supplier', 'transactions'])->findOrFail($id);
        return response()->json($this->formatFeedItem($item));
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'feed_type' => 'nullable|string|max:100',
            'daily_consumption' => 'required|numeric|min:0',
            'unit' => 'nullable|string|max:50',
            'storage_location' => 'nullable|string|max:255',
            'quantity_on_hand' => 'nullable|numeric|min:0',
            'average_cost' => 'nullable|numeric|min:0',
            'supplier_id' => 'nullable|exists:suppliers,id',
            'minimum_stock' => 'nullable|numeric|min:0',
            'reorder_level' => 'nullable|numeric|min:0',
            'maximum_level' => 'nullable|numeric|min:0',
            'status' => 'nullable|string',
            'item_id' => 'nullable|string|max:100',
            'notes' => 'nullable|string',
        ]);

        $feedItem = DB::transaction(function () use ($validated) {
            $itemId = $validated['item_id'] ?? null;
            if (empty($itemId)) {
                $count = InventoryItem::where('category', 'Feed')->count() + 1;
                $itemId = 'INV-FEED-' . str_pad((string) $count, 3, '0', STR_PAD_LEFT);
                while (InventoryItem::where('item_id', $itemId)->exists()) {
                    $count++;
                    $itemId = 'INV-FEED-' . str_pad((string) $count, 3, '0', STR_PAD_LEFT);
                }
            }

            $inventory = InventoryItem::create([
                'item_id' => $itemId,
                'name' => $validated['name'],
                'category' => 'Feed',
                'unit' => $validated['unit'] ?? 'kg',
                'storage_location' => $validated['storage_location'] ?? 'Feed Store',
                'quantity_on_hand' => $validated['quantity_on_hand'] ?? 0,
                'average_cost' => $validated['average_cost'] ?? 0,
                'supplier_id' => $validated['supplier_id'] ?? null,
                'minimum_stock' => $validated['minimum_stock'] ?? 0,
                'reorder_level' => $validated['reorder_level'] ?? 0,
                'maximum_level' => $validated['maximum_level'] ?? null,
                'status' => $validated['status'] ?? 'active',
            ]);

            $feed = FeedItem::create([
                'inventory_item_id' => $inventory->id,
                'daily_consumption' => $validated['daily_consumption'],
                'feed_type' => $validated['feed_type'] ?? 'Concentrate',
            ]);

            $initialQty = (float) ($validated['quantity_on_hand'] ?? 0);
            if ($initialQty > 0) {
                FeedTransaction::create([
                    'feed_item_id' => $feed->id,
                    'type' => 'receive',
                    'quantity' => $initialQty,
                    'transaction_date' => now()->toDateString(),
                    'notes' => $validated['notes'] ?? 'Initial stock setup',
                ]);
            }

            return $feed;
        });

        $feedItem->load(['inventoryItem.supplier', 'transactions']);
        return response()->json($this->formatFeedItem($feedItem), 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $feedItem = FeedItem::with('inventoryItem')->findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'feed_type' => 'nullable|string|max:100',
            'daily_consumption' => 'required|numeric|min:0',
            'unit' => 'nullable|string|max:50',
            'storage_location' => 'nullable|string|max:255',
            'quantity_on_hand' => 'nullable|numeric|min:0',
            'average_cost' => 'nullable|numeric|min:0',
            'supplier_id' => 'nullable|exists:suppliers,id',
            'minimum_stock' => 'nullable|numeric|min:0',
            'reorder_level' => 'nullable|numeric|min:0',
            'maximum_level' => 'nullable|numeric|min:0',
            'status' => 'nullable|string',
        ]);

        DB::transaction(function () use ($feedItem, $validated) {
            $feedItem->update([
                'daily_consumption' => $validated['daily_consumption'],
                'feed_type' => $validated['feed_type'] ?? $feedItem->feed_type,
            ]);

            if ($feedItem->inventoryItem) {
                $feedItem->inventoryItem->update([
                    'name' => $validated['name'],
                    'unit' => $validated['unit'] ?? $feedItem->inventoryItem->unit,
                    'storage_location' => $validated['storage_location'] ?? $feedItem->inventoryItem->storage_location,
                    'quantity_on_hand' => $validated['quantity_on_hand'] ?? $feedItem->inventoryItem->quantity_on_hand,
                    'average_cost' => $validated['average_cost'] ?? $feedItem->inventoryItem->average_cost,
                    'supplier_id' => $validated['supplier_id'] ?? $feedItem->inventoryItem->supplier_id,
                    'minimum_stock' => $validated['minimum_stock'] ?? $feedItem->inventoryItem->minimum_stock,
                    'reorder_level' => $validated['reorder_level'] ?? $feedItem->inventoryItem->reorder_level,
                    'maximum_level' => $validated['maximum_level'] ?? $feedItem->inventoryItem->maximum_level,
                    'status' => $validated['status'] ?? $feedItem->inventoryItem->status,
                ]);
            }
        });

        $feedItem->load(['inventoryItem.supplier', 'transactions']);
        return response()->json($this->formatFeedItem($feedItem));
    }

    public function destroy(int $id): JsonResponse
    {
        $feedItem = FeedItem::findOrFail($id);
        $inventoryId = $feedItem->inventory_item_id;

        DB::transaction(function () use ($feedItem, $inventoryId) {
            $feedItem->transactions()->delete();
            $feedItem->delete();
            if ($inventoryId) {
                InventoryItem::where('id', $inventoryId)->delete();
            }
        });

        return response()->json(['deleted' => true, 'id' => $id]);
    }

    public function logTransaction(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'feed_item_id' => 'required|exists:feed_items,id',
            'type' => 'required|in:issue,receive,adjustment',
            'quantity' => 'required|numeric|min:0.01',
            'transaction_date' => 'required|date',
            'notes' => 'nullable|string',
        ]);

        $tx = DB::transaction(function () use ($validated) {
            $feedItem = FeedItem::with('inventoryItem')->findOrFail($validated['feed_item_id']);

            $transaction = FeedTransaction::create([
                'feed_item_id' => $feedItem->id,
                'type' => $validated['type'],
                'quantity' => $validated['quantity'],
                'transaction_date' => $validated['transaction_date'],
                'notes' => $validated['notes'] ?? null,
            ]);

            if ($feedItem->inventoryItem) {
                $qty = (float) $validated['quantity'];
                if ($validated['type'] === 'issue') {
                    $newQty = max(0, (float) $feedItem->inventoryItem->quantity_on_hand - $qty);
                    $feedItem->inventoryItem->update(['quantity_on_hand' => $newQty]);
                } elseif ($validated['type'] === 'receive') {
                    $newQty = (float) $feedItem->inventoryItem->quantity_on_hand + $qty;
                    $feedItem->inventoryItem->update(['quantity_on_hand' => $newQty]);
                } elseif ($validated['type'] === 'adjustment') {
                    $feedItem->inventoryItem->update(['quantity_on_hand' => $qty]);
                }
            }

            return $transaction;
        });

        $tx->load('feedItem.inventoryItem');
        return response()->json($tx, 201);
    }

    public function transactions(Request $request): JsonResponse
    {
        $query = FeedTransaction::with('feedItem.inventoryItem');

        if ($request->filled('feed_item_id')) {
            $query->where('feed_item_id', $request->query('feed_item_id'));
        }

        if ($request->filled('type')) {
            $query->where('type', $request->query('type'));
        }

        $records = $query->orderByDesc('transaction_date')->orderByDesc('id')->take(50)->get();
        return response()->json(['data' => $records]);
    }

    public function medicines(): JsonResponse
    {
        $items = InventoryItem::with('medicineBatches')
            ->where('category', 'Medicine')
            ->where('status', 'active')
            ->get();

        $expiring = MedicineBatch::with('item')
            ->whereNotNull('expiry_date')
            ->where('expiry_date', '<=', now()->addDays(30))
            ->where('status', 'available')
            ->get();

        return response()->json([
            'question' => 14,
            'count' => $items->count(),
            'items' => $items,
            'expiring' => $expiring,
            'source' => 'inventory_items, medicine_batches',
        ]);
    }

    public function lowStock(): JsonResponse
    {
        $items = InventoryItem::whereColumn('quantity_on_hand', '<=', 'reorder_level')
            ->where('status', 'active')
            ->orderBy('quantity_on_hand')
            ->get();

        return response()->json([
            'question' => 15,
            'count' => $items->count(),
            'items' => $items,
            'source' => 'inventory_items',
        ]);
    }

    public function inventory(): JsonResponse
    {
        return response()->json(
            InventoryItem::with('supplier')->orderBy('category')->orderBy('name')->get()
        );
    }

    private function formatFeedItem(FeedItem $item): array
    {
        $inv = $item->inventoryItem;
        $onHand = (float) ($inv?->quantity_on_hand ?? 0);
        $daily = (float) ($item->daily_consumption ?? 0);
        $days = $daily > 0 ? round($onHand / $daily, 1) : null;
        $cost = (float) ($inv?->average_cost ?? 0);
        $totalValue = round($onHand * $cost, 2);
        $dailyCost = round($daily * $cost, 2);

        $reorder = (float) ($inv?->reorder_level ?? 0);
        $minStock = (float) ($inv?->minimum_stock ?? 0);

        $stockStatus = 'adequate';
        if ($onHand <= 0) {
            $stockStatus = 'out_of_stock';
        } elseif ($onHand <= $minStock || ($days !== null && $days <= 5)) {
            $stockStatus = 'critical';
        } elseif ($onHand <= $reorder || ($days !== null && $days <= 10)) {
            $stockStatus = 'low_stock';
        }

        return [
            'id' => $item->id,
            'inventory_item_id' => $item->inventory_item_id,
            'item_id' => $inv?->item_id ?? ('FEED-' . $item->id),
            'name' => $inv?->name ?? 'Feed Item #' . $item->id,
            'feed_type' => $item->feed_type ?? 'Concentrate',
            'unit' => $inv?->unit ?? 'kg',
            'storage_location' => $inv?->storage_location ?? 'Feed Store',
            'quantity_on_hand' => $onHand,
            'daily_consumption' => $daily,
            'days_remaining' => $days,
            'average_cost' => $cost,
            'total_value' => $totalValue,
            'daily_cost' => $dailyCost,
            'reorder_level' => $reorder,
            'minimum_stock' => $minStock,
            'maximum_level' => (float) ($inv?->maximum_level ?? 0),
            'supplier_id' => $inv?->supplier_id,
            'supplier' => $inv?->supplier ? [
                'id' => $inv->supplier->id,
                'name' => $inv->supplier->name,
                'phone' => $inv->supplier->phone,
                'email' => $inv->supplier->email,
            ] : null,
            'status' => $inv?->status ?? 'active',
            'stock_status' => $stockStatus,
            'created_at' => $item->created_at?->toIso8601String(),
            'updated_at' => $item->updated_at?->toIso8601String(),
            'recent_transactions' => $item->transactions ? $item->transactions->sortByDesc('transaction_date')->take(5)->values()->toArray() : [],
        ];
    }
}

