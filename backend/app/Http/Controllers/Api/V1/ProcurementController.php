<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\GoodsReceipt;
use App\Models\PurchaseOrder;
use App\Models\PurchaseRequest;
use App\Models\Supplier;
use App\Services\ProcurementApprovalService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProcurementController extends Controller
{
    public function __construct(private readonly ProcurementApprovalService $matrix)
    {
    }

    public function requests(): JsonResponse
    {
        $requests = PurchaseRequest::with(['requester', 'approvals.approver'])
            ->orderByDesc('requested_at')
            ->get()
            ->map(fn (PurchaseRequest $r) => $this->present($r));

        return response()->json([
            'question' => 16,
            'count' => $requests->count(),
            'pending' => $requests->where('status', 'pending')->count(),
            'pending_tier_1' => $requests->where('approval_stage', 'pending_tier_1')->count(),
            'pending_tier_2' => $requests->where('approval_stage', 'pending_tier_2')->count(),
            'approval_matrix' => $this->matrix->matrix(),
            'records' => $requests,
            'source' => 'purchase_requests',
        ]);
    }

    /** The two-tier approval matrix (§44–47) for the approval-queue UI. */
    public function approvalMatrix(): JsonResponse
    {
        return response()->json($this->matrix->matrix());
    }

    /** Approve a request at its routed tier (Supervisor ≤ GH₵1,000 < Executive). */
    public function approve(Request $request, int $id): JsonResponse
    {
        return $this->decide($request, $id, 'approved');
    }

    public function reject(Request $request, int $id): JsonResponse
    {
        return $this->decide($request, $id, 'rejected');
    }

    private function decide(Request $request, int $id, string $decision): JsonResponse
    {
        $data = $request->validate(['comments' => 'nullable|string|max:1000']);
        $purchaseRequest = PurchaseRequest::with(['requester', 'approvals.approver'])->findOrFail($id);

        $approval = $this->matrix->decide($purchaseRequest, $request->user(), $decision, $data['comments'] ?? null);

        return response()->json([
            'approval' => $approval->load('approver'),
            'request' => $this->present($purchaseRequest->fresh(['requester', 'approvals.approver'])),
        ]);
    }

    /** Raise a Purchase Order against a fully approved request (§47). */
    public function createPurchaseOrder(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'supplier_id' => 'nullable|exists:suppliers,id',
            'total_amount' => 'nullable|numeric|min:0',
            'ordered_at' => 'nullable|date',
            'odoo_ref' => 'nullable|string|max:60',
        ]);

        $purchaseRequest = PurchaseRequest::findOrFail($id);
        $order = $this->matrix->createPurchaseOrder($purchaseRequest, $request->user(), $data);

        return response()->json([
            'purchase_order' => $order->load(['supplier', 'request']),
            'request' => $this->present($purchaseRequest->fresh(['requester', 'approvals.approver'])),
        ], 201);
    }

    /** Attach the routed tier/stage so every consumer sees the matrix state. */
    private function present(PurchaseRequest $request): array
    {
        $tier = $this->matrix->tierOf($request);
        $row = $request->toArray();
        $row['approval_tier'] = $tier;
        $row['approval_stage'] = $this->matrix->stageOf($request);
        $row['tier_label'] = $this->matrix->tierConfig($tier)['label'] ?? ('Tier '.$tier);
        $row['approver_label'] = $this->matrix->tierConfig($tier)['approver_label'] ?? null;
        $row['requires_executive'] = $tier === 2;

        return $row;
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
