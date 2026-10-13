<?php

use App\Http\Controllers\Api\V1\AssetMaintenanceController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\CrmController;
use App\Http\Controllers\Api\V1\CrudController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\EventController;
use App\Http\Controllers\Api\V1\FeedInventoryController;
use App\Http\Controllers\Api\V1\FinanceController;
use App\Http\Controllers\Api\V1\GovernanceController;
use App\Http\Controllers\Api\V1\HrTaskController;
use App\Http\Controllers\Api\V1\LivestockController;
use App\Http\Controllers\Api\V1\MarketingController;
use App\Http\Controllers\Api\V1\ProcurementController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::post('/auth/login', [AuthController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::post('/auth/logout', [AuthController::class, 'logout']);

        Route::get('/hub', [DashboardController::class, 'hub']);
        Route::get('/dashboard/ceo', [DashboardController::class, 'ceo']);

        Route::get('/livestock/summary', [LivestockController::class, 'summary']);
        Route::get('/livestock/pregnancies', [LivestockController::class, 'pregnancies']);
        Route::get('/livestock/births', [LivestockController::class, 'births']);
        Route::get('/livestock/deaths', [LivestockController::class, 'deaths']);
        Route::get('/livestock/mortality-rate', [LivestockController::class, 'mortalityRate']);
        Route::get('/livestock/mortality', [LivestockController::class, 'mortalityRate']);
        Route::get('/livestock/growth', [LivestockController::class, 'growth']);
        Route::get('/livestock/health/sick', [LivestockController::class, 'sick']);
        Route::get('/livestock/health/treatments', [LivestockController::class, 'treatments']);
        Route::get('/locations', [EventController::class, 'locations']);
        Route::post('/livestock/events/birth', [EventController::class, 'birth']);
        Route::post('/livestock/events/death', [EventController::class, 'death']);
        Route::post('/livestock/events/sick', [EventController::class, 'sick']);
        Route::post('/livestock/events/treatment', [EventController::class, 'treatment']);
        Route::post('/procurement/requests', [EventController::class, 'purchaseRequest']);

        Route::get('/livestock', [LivestockController::class, 'index']);
        Route::post('/livestock', fn (\Illuminate\Http\Request $req) => app(CrudController::class)->store($req, 'livestock'));
        Route::get('/livestock/{id}', [LivestockController::class, 'show']);
        Route::put('/livestock/{id}', fn (\Illuminate\Http\Request $req, int $id) => app(CrudController::class)->update($req, 'livestock', $id));
        Route::delete('/livestock/{id}', fn (int $id) => app(CrudController::class)->destroy('livestock', $id));

        Route::get('/feed/summary', [FeedInventoryController::class, 'feedSummary']);
        Route::get('/feed/days-remaining', [FeedInventoryController::class, 'daysRemaining']);
        Route::get('/inventory', [FeedInventoryController::class, 'inventory']);
        Route::get('/inventory/medicines', [FeedInventoryController::class, 'medicines']);
        Route::get('/inventory/low-stock', [FeedInventoryController::class, 'lowStock']);

        Route::get('/procurement/requests', [ProcurementController::class, 'requests']);
        Route::get('/procurement/requests/{id}/approvals', [ProcurementController::class, 'approvals']);
        Route::get('/procurement/purchases', [ProcurementController::class, 'purchases']);
        Route::get('/suppliers', [ProcurementController::class, 'suppliers']);

        Route::get('/assets', [AssetMaintenanceController::class, 'index']);
        Route::get('/maintenance/due', [AssetMaintenanceController::class, 'due']);
        Route::get('/maintenance/tickets', [AssetMaintenanceController::class, 'tickets']);

        Route::get('/hr/employees', [HrTaskController::class, 'employees']);
        Route::get('/hr/attendance/today', [HrTaskController::class, 'attendanceToday']);
        Route::get('/tasks/incomplete', [HrTaskController::class, 'incompleteTasks']);

        Route::get('/finance/spending', [FinanceController::class, 'spending']);

        Route::get('/crm/prospects', [CrmController::class, 'prospects']);
        Route::get('/crm/opportunities', [CrmController::class, 'opportunities']);

        Route::get('/marketing/content', [MarketingController::class, 'content']);
        Route::get('/marketing/performance', [MarketingController::class, 'performance']);

        Route::get('/risks', [GovernanceController::class, 'risks']);
        Route::get('/decisions/pending-owner', [GovernanceController::class, 'pendingOwner']);
        Route::get('/alerts', [GovernanceController::class, 'alerts']);
        Route::get('/audit-logs', [GovernanceController::class, 'auditLogs']);
        Route::get('/sops', [GovernanceController::class, 'sops']);
        Route::get('/systems', [GovernanceController::class, 'systems']);

        Route::get('/lookups', [CrudController::class, 'lookups']);
        Route::get('/records/{resource}', [CrudController::class, 'index']);
        Route::post('/records/{resource}', [CrudController::class, 'store']);
        Route::get('/records/{resource}/{id}', [CrudController::class, 'show']);
        Route::put('/records/{resource}/{id}', [CrudController::class, 'update']);
        Route::delete('/records/{resource}/{id}', [CrudController::class, 'destroy']);
    });
});
