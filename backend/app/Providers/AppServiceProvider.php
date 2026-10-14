<?php

namespace App\Providers;

use App\Models\User;
use Database\Seeders\DemoUsersSeeder;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        if (! in_array(app()->environment(), ['local', 'testing'], true)) {
            return;
        }

        if (! Schema::hasTable('users')) {
            return;
        }

        if (User::count() > 0) {
            return;
        }

        Artisan::call('db:seed', [
            '--class' => DemoUsersSeeder::class,
            '--force' => true,
        ]);
    }
}
