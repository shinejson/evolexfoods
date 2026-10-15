<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Foundations for the four executive features:
 *
 *  1. `animal_id_sequences` — monotonic per-species counter behind the
 *     automated EV-GT / EV-SH / EV-CT Animal ID generator (§10). Seeded from
 *     the highest ID already in use so existing herds keep their numbering.
 *  4. Procurement approval matrix (§44–47) — every purchase request records
 *     the tier it was routed to, the stage it is waiting on and the role
 *     allowed to decide it; each decision records the tier it was made at.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('animal_id_sequences', function (Blueprint $table) {
            $table->id();
            $table->string('species')->unique();
            $table->string('prefix')->unique();
            $table->unsignedBigInteger('last_number')->default(0);
            $table->timestamps();
        });

        // Continue numbering from the herd that already exists — never rewind.
        foreach (['goat' => 'EV-GT', 'sheep' => 'EV-SH', 'cattle' => 'EV-CT'] as $species => $prefix) {
            $highest = 0;
            foreach (DB::table('animals')->where('animal_id', 'like', $prefix.'-%')->pluck('animal_id') as $animalId) {
                $suffix = substr((string) $animalId, strlen($prefix) + 1);
                if (is_numeric($suffix)) {
                    $highest = max($highest, (int) $suffix);
                }
            }

            DB::table('animal_id_sequences')->insert([
                'species' => $species,
                'prefix' => $prefix,
                'last_number' => $highest,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        Schema::table('purchase_requests', function (Blueprint $table) {
            // 1 = Supervisor tier, 2 = Executive tier (see config/evolex.php).
            $table->unsignedTinyInteger('approval_tier')->nullable()->after('status');
            // pending_tier_1 | pending_tier_2 | approved | rejected | ordered
            $table->string('approval_stage')->nullable()->after('approval_tier');
            // users.role value(s) allowed to decide, e.g. "executive".
            $table->string('required_approver_role')->nullable()->after('approval_stage');
        });

        Schema::table('purchase_request_approvals', function (Blueprint $table) {
            $table->unsignedTinyInteger('tier')->nullable()->after('approver_id');
            $table->string('approver_role')->nullable()->after('tier');
        });

        // Backfill the routing for requests that already exist: over the
        // GH₵1,000 executive threshold → Tier 2, otherwise Tier 1.
        $threshold = (float) config('evolex.procurement.executive_threshold_ghs', 1000);
        DB::table('purchase_requests')->orderBy('id')->eachById(function ($row) use ($threshold) {
            $tier = ((float) ($row->estimated_cost ?? 0)) > $threshold ? 2 : 1;
            $stage = match ($row->status) {
                'approved' => 'approved',
                'rejected' => 'rejected',
                'ordered', 'converted' => 'ordered',
                default => $tier === 2 ? 'pending_tier_2' : 'pending_tier_1',
            };

            DB::table('purchase_requests')->where('id', $row->id)->update([
                'approval_tier' => $tier,
                'approval_stage' => $stage,
                'required_approver_role' => $tier === 2 ? 'executive' : 'supervisor',
            ]);
        });
    }

    public function down(): void
    {
        Schema::table('purchase_request_approvals', function (Blueprint $table) {
            $table->dropColumn(['tier', 'approver_role']);
        });

        Schema::table('purchase_requests', function (Blueprint $table) {
            $table->dropColumn(['approval_tier', 'approval_stage', 'required_approver_role']);
        });

        Schema::dropIfExists('animal_id_sequences');
    }
};
