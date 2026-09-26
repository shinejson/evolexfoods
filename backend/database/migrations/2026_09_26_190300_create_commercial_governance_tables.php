<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('expenses', function (Blueprint $table) {
            $table->id();
            $table->string('category');
            $table->string('description')->nullable();
            $table->decimal('amount', 12, 2);
            $table->date('expense_date');
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('source')->default('manual');
            $table->timestamps();
        });

        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->string('invoice_number')->unique();
            $table->foreignId('supplier_id')->nullable()->constrained('suppliers')->nullOnDelete();
            $table->foreignId('purchase_order_id')->nullable()->constrained('purchase_orders')->nullOnDelete();
            $table->decimal('amount', 12, 2);
            $table->date('invoice_date');
            $table->date('due_date')->nullable();
            $table->string('status')->default('unpaid');
            $table->timestamps();
        });

        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->nullable()->constrained('invoices')->nullOnDelete();
            $table->decimal('amount', 12, 2);
            $table->date('paid_at');
            $table->string('method')->nullable();
            $table->string('reference')->nullable();
            $table->timestamps();
        });

        Schema::create('pipeline_stages', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->integer('sort_order')->default(0);
            $table->boolean('is_won')->default(false);
            $table->boolean('is_lost')->default(false);
            $table->timestamps();
        });

        Schema::create('companies', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('category')->nullable();
            $table->string('lifecycle_stage')->default('lead');
            $table->string('hubspot_id')->nullable();
            $table->string('city')->nullable();
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->string('status')->default('active');
            $table->timestamps();
        });

        Schema::create('contacts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->nullable()->constrained('companies')->nullOnDelete();
            $table->string('name');
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->string('role')->nullable();
            $table->string('lifecycle_stage')->default('lead');
            $table->string('hubspot_id')->nullable();
            $table->timestamps();
        });

        Schema::create('deals', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->foreignId('company_id')->nullable()->constrained('companies')->nullOnDelete();
            $table->foreignId('contact_id')->nullable()->constrained('contacts')->nullOnDelete();
            $table->foreignId('pipeline_stage_id')->nullable()->constrained('pipeline_stages')->nullOnDelete();
            $table->decimal('amount', 12, 2)->default(0);
            $table->date('close_date')->nullable();
            $table->string('next_action')->nullable();
            $table->date('next_action_date')->nullable();
            $table->string('hubspot_id')->nullable();
            $table->string('status')->default('open');
            $table->timestamps();
        });

        Schema::create('media_assets', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('type')->nullable();
            $table->string('location')->nullable();
            $table->string('subject')->nullable();
            $table->string('url')->nullable();
            $table->json('tags')->nullable();
            $table->date('captured_at')->nullable();
            $table->string('rights')->nullable();
            $table->timestamps();
        });

        Schema::create('content_items', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('channel')->nullable();
            $table->string('content_type')->nullable();
            $table->string('status')->default('draft');
            $table->date('scheduled_for')->nullable();
            $table->date('published_at')->nullable();
            $table->foreignId('media_asset_id')->nullable()->constrained('media_assets')->nullOnDelete();
            $table->text('body')->nullable();
            $table->timestamps();
        });

        Schema::create('campaigns', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('channel')->nullable();
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->string('status')->default('active');
            $table->decimal('budget', 12, 2)->nullable();
            $table->timestamps();
        });

        Schema::create('channel_metrics', function (Blueprint $table) {
            $table->id();
            $table->string('channel');
            $table->date('metric_date');
            $table->unsignedBigInteger('reach')->default(0);
            $table->unsignedBigInteger('views')->default(0);
            $table->unsignedBigInteger('followers')->default(0);
            $table->unsignedBigInteger('website_visits')->default(0);
            $table->unsignedBigInteger('leads')->default(0);
            $table->decimal('engagement_rate', 5, 2)->default(0);
            $table->timestamps();
        });

        Schema::create('ai_prompts', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('tool')->nullable();
            $table->text('prompt');
            $table->string('status')->default('approved');
            $table->timestamps();
        });

        Schema::create('risks', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('category')->nullable();
            $table->string('severity')->default('medium');
            $table->string('likelihood')->default('possible');
            $table->foreignId('owner_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('status')->default('open');
            $table->text('mitigation')->nullable();
            $table->date('identified_at')->nullable();
            $table->timestamps();
        });

        Schema::create('decisions', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('status')->default('pending_owner');
            $table->foreignId('requested_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('owner_id')->nullable()->constrained('users')->nullOnDelete();
            $table->date('due_date')->nullable();
            $table->dateTime('decided_at')->nullable();
            $table->text('decision_notes')->nullable();
            $table->timestamps();
        });

        Schema::create('approvals', function (Blueprint $table) {
            $table->id();
            $table->string('approvable_type');
            $table->unsignedBigInteger('approvable_id');
            $table->foreignId('approver_id')->constrained('users')->cascadeOnDelete();
            $table->string('status')->default('pending');
            $table->dateTime('acted_at')->nullable();
            $table->text('comments')->nullable();
            $table->timestamps();
        });

        Schema::create('alerts', function (Blueprint $table) {
            $table->id();
            $table->string('type');
            $table->string('severity')->default('warning');
            $table->string('title');
            $table->text('message')->nullable();
            $table->string('module')->nullable();
            $table->boolean('is_read')->default(false);
            $table->dateTime('triggered_at');
            $table->timestamps();
        });

        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action');
            $table->string('auditable_type')->nullable();
            $table->unsignedBigInteger('auditable_id')->nullable();
            $table->json('meta')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->timestamps();
        });

        Schema::create('sops', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('title');
            $table->string('category')->nullable();
            $table->string('version')->default('1.0');
            $table->string('status')->default('published');
            $table->text('summary')->nullable();
            $table->string('drive_url')->nullable();
            $table->timestamps();
        });

        Schema::create('system_registry', function (Blueprint $table) {
            $table->id();
            $table->string('system_name');
            $table->string('business_purpose')->nullable();
            $table->string('account_owner')->nullable();
            $table->string('administrator')->nullable();
            $table->string('billing_owner')->nullable();
            $table->string('renewal_period')->nullable();
            $table->date('renewal_date')->nullable();
            $table->string('data_owner')->nullable();
            $table->text('recovery_process')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('system_registry');
        Schema::dropIfExists('sops');
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('alerts');
        Schema::dropIfExists('approvals');
        Schema::dropIfExists('decisions');
        Schema::dropIfExists('risks');
        Schema::dropIfExists('ai_prompts');
        Schema::dropIfExists('channel_metrics');
        Schema::dropIfExists('campaigns');
        Schema::dropIfExists('content_items');
        Schema::dropIfExists('media_assets');
        Schema::dropIfExists('deals');
        Schema::dropIfExists('contacts');
        Schema::dropIfExists('companies');
        Schema::dropIfExists('pipeline_stages');
        Schema::dropIfExists('payments');
        Schema::dropIfExists('invoices');
        Schema::dropIfExists('expenses');
    }
};
