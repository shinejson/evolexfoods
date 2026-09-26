<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Models\Invoice;
use App\Models\PurchaseOrder;
use App\Support\DateRange;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FinanceController extends Controller
{
    public function spending(Request $request): JsonResponse
    {
        [$from, $to] = $request->filled('from')
            ? DateRange::fromRequest($request)
            : DateRange::period($request);

        $expenses = Expense::whereBetween('expense_date', [$from, $to])->get();
        $orders = PurchaseOrder::whereBetween('ordered_at', [$from, $to])->get();
        $invoices = Invoice::whereBetween('invoice_date', [$from, $to])->get();

        $expenseTotal = (float) $expenses->sum('amount');
        $poTotal = (float) $orders->sum('total_amount');
        $invoiceTotal = (float) $invoices->sum('amount');

        $byCategory = $expenses->groupBy('category')->map(fn ($rows) => round((float) $rows->sum('amount'), 2));

        return response()->json([
            'question' => 23,
            'period' => $request->query('period', 'month'),
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'expenses' => round($expenseTotal, 2),
            'purchase_orders' => round($poTotal, 2),
            'invoices' => round($invoiceTotal, 2),
            'total_spending' => round($expenseTotal + $poTotal + $invoiceTotal, 2),
            'by_category' => $byCategory,
            'upcoming_invoices' => Invoice::where('status', 'unpaid')->whereDate('due_date', '>=', now())->orderBy('due_date')->get(),
            'source' => 'expenses, purchase_orders, invoices',
        ]);
    }
}
