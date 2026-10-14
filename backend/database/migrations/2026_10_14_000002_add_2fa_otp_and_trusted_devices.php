<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('two_factor_otp', 10)->nullable()->after('two_factor_type');
            $table->timestamp('two_factor_otp_expires_at')->nullable()->after('two_factor_otp');
            $table->json('two_factor_trusted_tokens')->nullable()->after('two_factor_otp_expires_at');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['two_factor_otp', 'two_factor_otp_expires_at', 'two_factor_trusted_tokens']);
        });
    }
};
