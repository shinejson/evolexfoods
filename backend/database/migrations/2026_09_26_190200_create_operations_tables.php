<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('suppliers', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('name');
            $table->string('category')->nullable();
            $table->string('contact_name')->nullable();
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->string('location')->nullable();
            $table->decimal('rating', 3, 1)->nullable();
            $table->string('status')->default('active');
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('inventory_items', function (Blueprint $table) {
            $table->id();
            $table->string('item_id')->unique();
            $table->string('name');
            $table->string('category');
            $table->string('unit')->default('kg');
            $table->string('storage_location')->nullable();
            $table->decimal('quantity_on_hand', 12, 2)->default(0);
            $table->decimal('average_cost', 12, 2)->default(0);
            $table->foreignId('supplier_id')->nullable()->constrained('suppliers')->nullOnDelete();
            $table->decimal('minimum_stock', 12, 2)->default(0);
            $table->decimal('reorder_level', 12, 2)->default(0);
            $table->decimal('maximum_level', 12, 2)->nullable();
            $table->date('expiry_date')->nullable();
            $table->string('status')->default('active');
            $table->timestamps();
        });

        Schema::create('feed_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inventory_item_id')->constrained('inventory_items')->cascadeOnDelete();
            $table->decimal('daily_consumption', 12, 2)->default(0);
            $table->string('feed_type')->nullable();
            $table->timestamps();
        });

        Schema::create('feed_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('feed_item_id')->constrained('feed_items')->cascadeOnDelete();
            $table->string('type');
            $table->decimal('quantity', 12, 2);
            $table->date('transaction_date');
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('stock_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inventory_item_id')->constrained('inventory_items')->cascadeOnDelete();
            $table->string('type');
            $table->decimal('quantity', 12, 2);
            $table->date('moved_at');
            $table->string('reference')->nullable();
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('medicine_batches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inventory_item_id')->constrained('inventory_items')->cascadeOnDelete();
            $table->string('batch_number');
            $table->decimal('quantity', 12, 2);
            $table->date('expiry_date')->nullable();
            $table->string('status')->default('available');
            $table->timestamps();
        });

        Schema::create('purchase_requests', function (Blueprint $table) {
            $table->id();
            $table->string('request_number')->unique();
            $table->foreignId('requested_by')->constrained('users')->cascadeOnDelete();
            $table->date('requested_at');
            $table->string('item_name');
            $table->string('category')->nullable();
            $table->decimal('quantity', 12, 2);
            $table->string('unit')->nullable();
            $table->decimal('estimated_cost', 12, 2)->nullable();
            $table->string('priority')->default('normal');
            $table->string('status')->default('pending');
            $table->text('justification')->nullable();
            $table->timestamps();
        });

        Schema::create('purchase_request_approvals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_request_id')->constrained('purchase_requests')->cascadeOnDelete();
            $table->foreignId('approver_id')->constrained('users')->cascadeOnDelete();
            $table->string('decision');
            $table->dateTime('decided_at');
            $table->text('comments')->nullable();
            $table->timestamps();
        });

        Schema::create('purchase_orders', function (Blueprint $table) {
            $table->id();
            $table->string('po_number')->unique();
            $table->foreignId('purchase_request_id')->nullable()->constrained('purchase_requests')->nullOnDelete();
            $table->foreignId('supplier_id')->nullable()->constrained('suppliers')->nullOnDelete();
            $table->date('ordered_at');
            $table->decimal('total_amount', 12, 2)->default(0);
            $table->string('status')->default('open');
            $table->string('odoo_ref')->nullable();
            $table->timestamps();
        });

        Schema::create('goods_receipts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_order_id')->constrained('purchase_orders')->cascadeOnDelete();
            $table->date('received_at');
            $table->decimal('quantity_received', 12, 2);
            $table->string('condition')->default('ok');
            $table->text('discrepancy')->nullable();
            $table->foreignId('received_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('assets', function (Blueprint $table) {
            $table->id();
            $table->string('asset_id')->unique();
            $table->string('name');
            $table->string('category')->nullable();
            $table->string('serial_number')->nullable();
            $table->date('purchase_date')->nullable();
            $table->decimal('purchase_price', 12, 2)->nullable();
            $table->foreignId('supplier_id')->nullable()->constrained('suppliers')->nullOnDelete();
            $table->foreignId('location_id')->nullable()->constrained('locations')->nullOnDelete();
            $table->foreignId('assigned_employee_id')->nullable()->constrained('employees')->nullOnDelete();
            $table->string('condition')->default('good');
            $table->date('warranty_until')->nullable();
            $table->string('photo_url')->nullable();
            $table->string('status')->default('active');
            $table->timestamps();
        });

        Schema::create('maintenance_schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('asset_id')->constrained('assets')->cascadeOnDelete();
            $table->string('title');
            $table->string('type')->default('preventive');
            $table->date('due_date');
            $table->integer('interval_days')->nullable();
            $table->string('status')->default('scheduled');
            $table->timestamps();
        });

        Schema::create('maintenance_tickets', function (Blueprint $table) {
            $table->id();
            $table->string('ticket_number')->unique();
            $table->foreignId('asset_id')->nullable()->constrained('assets')->nullOnDelete();
            $table->string('title');
            $table->string('type')->default('corrective');
            $table->string('priority')->default('normal');
            $table->string('status')->default('open');
            $table->foreignId('reported_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('reported_at');
            $table->dateTime('completed_at')->nullable();
            $table->text('description')->nullable();
            $table->timestamps();
        });

        Schema::create('attendance', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->date('work_date');
            $table->time('time_in')->nullable();
            $table->time('time_out')->nullable();
            $table->string('status')->default('present');
            $table->decimal('overtime_hours', 5, 2)->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('tasks', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description')->nullable();
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->date('due_date')->nullable();
            $table->string('priority')->default('normal');
            $table->string('status')->default('open');
            $table->string('module')->nullable();
            $table->timestamps();
        });

        Schema::create('responsibility_matrix', function (Blueprint $table) {
            $table->id();
            $table->string('process');
            $table->string('responsible');
            $table->string('accountable')->nullable();
            $table->string('consulted')->nullable();
            $table->string('informed')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('responsibility_matrix');
        Schema::dropIfExists('tasks');
        Schema::dropIfExists('attendance');
        Schema::dropIfExists('maintenance_tickets');
        Schema::dropIfExists('maintenance_schedules');
        Schema::dropIfExists('assets');
        Schema::dropIfExists('goods_receipts');
        Schema::dropIfExists('purchase_orders');
        Schema::dropIfExists('purchase_request_approvals');
        Schema::dropIfExists('purchase_requests');
        Schema::dropIfExists('medicine_batches');
        Schema::dropIfExists('stock_movements');
        Schema::dropIfExists('feed_transactions');
        Schema::dropIfExists('feed_items');
        Schema::dropIfExists('inventory_items');
        Schema::dropIfExists('suppliers');
    }
};
