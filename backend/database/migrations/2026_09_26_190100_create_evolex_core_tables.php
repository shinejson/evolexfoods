<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('locations', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('name');
            $table->string('type')->default('paddock');
            $table->string('address')->nullable();
            $table->decimal('capacity', 10, 2)->nullable();
            $table->string('status')->default('active');
            $table->timestamps();
        });

        Schema::create('employees', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('employee_code')->unique();
            $table->string('name');
            $table->string('role')->nullable();
            $table->string('department')->nullable();
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->date('hire_date')->nullable();
            $table->string('status')->default('active');
            $table->timestamps();
        });

        Schema::create('animals', function (Blueprint $table) {
            $table->id();
            $table->string('animal_id')->unique();
            $table->string('tag_id')->nullable();
            $table->string('species');
            $table->string('breed')->nullable();
            $table->string('sex');
            $table->date('dob')->nullable();
            $table->string('mother_id')->nullable();
            $table->string('father_id')->nullable();
            $table->string('source')->nullable();
            $table->decimal('cost', 12, 2)->nullable();
            $table->foreignId('location_id')->nullable()->constrained()->nullOnDelete();
            $table->decimal('weight', 8, 2)->nullable();
            $table->string('breeding_status')->nullable();
            $table->string('pregnancy_status')->nullable();
            $table->date('expected_birth_date')->nullable();
            $table->string('health_status')->default('healthy');
            $table->string('status')->default('alive');
            $table->string('current_status')->default('active');
            $table->string('photo_url')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('animal_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('animal_id')->constrained('animals')->cascadeOnDelete();
            $table->string('event_type');
            $table->dateTime('occurred_at');
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->json('payload')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('births', function (Blueprint $table) {
            $table->id();
            $table->foreignId('animal_id')->nullable()->constrained('animals')->nullOnDelete();
            $table->string('mother_animal_id')->nullable();
            $table->string('father_animal_id')->nullable();
            $table->date('birth_date');
            $table->string('sex')->nullable();
            $table->decimal('birth_weight', 8, 2)->nullable();
            $table->foreignId('location_id')->nullable()->constrained()->nullOnDelete();
            $table->string('status')->default('alive');
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('deaths', function (Blueprint $table) {
            $table->id();
            $table->foreignId('animal_id')->constrained('animals')->cascadeOnDelete();
            $table->date('death_date');
            $table->string('cause')->nullable();
            $table->foreignId('location_id')->nullable()->constrained()->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('breedings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('female_id')->constrained('animals')->cascadeOnDelete();
            $table->foreignId('male_id')->nullable()->constrained('animals')->nullOnDelete();
            $table->date('breeding_date');
            $table->string('method')->nullable();
            $table->string('status')->default('completed');
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('pregnancies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('animal_id')->constrained('animals')->cascadeOnDelete();
            $table->foreignId('breeding_id')->nullable()->constrained('breedings')->nullOnDelete();
            $table->date('confirmed_date');
            $table->date('expected_birth_date')->nullable();
            $table->string('status')->default('active');
            $table->date('ended_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('health_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('animal_id')->constrained('animals')->cascadeOnDelete();
            $table->date('recorded_date');
            $table->string('condition');
            $table->string('severity')->default('moderate');
            $table->string('status')->default('open');
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('treatments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('animal_id')->constrained('animals')->cascadeOnDelete();
            $table->foreignId('health_record_id')->nullable()->constrained('health_records')->nullOnDelete();
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->string('treatment_type');
            $table->string('medicine')->nullable();
            $table->string('dosage')->nullable();
            $table->string('status')->default('active');
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('vaccinations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('animal_id')->constrained('animals')->cascadeOnDelete();
            $table->string('vaccine_name');
            $table->date('administered_date');
            $table->date('next_due_date')->nullable();
            $table->string('batch_number')->nullable();
            $table->string('status')->default('completed');
            $table->timestamps();
        });

        Schema::create('weights', function (Blueprint $table) {
            $table->id();
            $table->foreignId('animal_id')->constrained('animals')->cascadeOnDelete();
            $table->date('weighed_at');
            $table->decimal('weight_kg', 8, 2);
            $table->string('method')->nullable();
            $table->timestamps();
        });

        Schema::create('transfers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('animal_id')->constrained('animals')->cascadeOnDelete();
            $table->foreignId('from_location_id')->nullable()->constrained('locations')->nullOnDelete();
            $table->foreignId('to_location_id')->constrained('locations')->cascadeOnDelete();
            $table->date('transferred_at');
            $table->string('reason')->nullable();
            $table->timestamps();
        });

        Schema::create('sales_culls', function (Blueprint $table) {
            $table->id();
            $table->foreignId('animal_id')->constrained('animals')->cascadeOnDelete();
            $table->string('type');
            $table->date('event_date');
            $table->decimal('amount', 12, 2)->nullable();
            $table->string('buyer')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sales_culls');
        Schema::dropIfExists('transfers');
        Schema::dropIfExists('weights');
        Schema::dropIfExists('vaccinations');
        Schema::dropIfExists('treatments');
        Schema::dropIfExists('health_records');
        Schema::dropIfExists('pregnancies');
        Schema::dropIfExists('breedings');
        Schema::dropIfExists('deaths');
        Schema::dropIfExists('births');
        Schema::dropIfExists('animal_events');
        Schema::dropIfExists('animals');
        Schema::dropIfExists('employees');
        Schema::dropIfExists('locations');
    }
};
