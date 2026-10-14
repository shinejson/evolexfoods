<?php

namespace Tests\Feature;

use App\Models\User;
use App\Providers\AppServiceProvider;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class StartupCheckTest extends TestCase
{
    public function test_boot_seeds_demo_accounts_when_users_table_is_empty(): void
    {
        $this->artisan('migrate:fresh', ['--seed' => true, '--force' => true]);

        DB::table('users')->delete();

        $this->assertDatabaseCount('users', 0);

        $provider = new AppServiceProvider($this->app);
        $provider->boot();

        $this->assertGreaterThan(0, User::count());
    }
}
