<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\FeedItem;
use App\Models\InventoryItem;
use App\Models\MedicineBatch;
use Illuminate\Http\JsonResponse;

class FeedInventoryController extends Controller
{
    public function feedSummary(): JsonResponse
    {
        $items = FeedItem::with('inventoryItem')->get();

        $onHand = $items->sum(fn ($item) => (float) ($item->inventoryItem?->quantity_on_hand ?? 0));
        $daily = $items->sum(fn ($item) => (float) $item->daily_consumption);
        $alive = max(1, \App\Models\Animal::alive()->count());

        return response()->json([
            'question' => 12,
            'feed_on_hand' => round($onHand, 2),
            'average_daily_consumption' => round($daily, 2),
            'feed_cost_per_animal' => round($items->sum(fn ($item) =>
                ((float) ($item->inventoryItem?->average_cost ?? 0)) * ((float) $item->daily_consumption)
            ) / $alive, 2),
            'items' => $items,
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
}
