<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\GoodsReceipt;
use App\Models\PurchaseOrder;
use App\Models\PurchaseRequest;
use App\Models\Supplier;
use Illuminate\Http\JsonResponse;

class ProcurementController extends Controller
{
    public function requests(): JsonResponse
    {
        $requests = PurchaseRequest::with(['requester', 'approvals.approver'])
            ->orderByDesc('requested_at')
            ->get();

        return response()->json([
            'question' => 16,
            'count' => $requests->count(),
            'pending' => $requests->where('status', 'pending')->count(),
            'records' => $requests,
            'source' => 'purchase_requests',
        ]);
    }

    public function approvals(int $id): JsonResponse
    {
        $request = PurchaseRequest::with(['requester', 'approvals.approver'])->findOrFail($id);

        return response()->json([
            'question' => 17,
            'request' => $request,
            'approvals' => $request->approvals,
            'source' => 'purchase_request_approvals',
        ]);
    }

    public function purchases(): JsonResponse
    {
        $orders = PurchaseOrder::with(['supplier', 'request', 'receipts'])->orderByDesc('ordered_at')->get();
        $receipts = GoodsReceipt::with('purchaseOrder')->orderByDesc('received_at')->get();

        return response()->json([
            'question' => 18,
            'purchase_orders' => $orders,
            'goods_receipts' => $receipts,
            'count' => $orders->count(),
            'source' => 'purchase_orders, goods_receipts',
        ]);
    }

    public function suppliers(): JsonResponse
    {
        $suppliers = Supplier::orderBy('name')->get();

        return response()->json([
            'question' => 24,
            'count' => $suppliers->count(),
            'records' => $suppliers,
            'source' => 'suppliers',
        ]);
    }
}
