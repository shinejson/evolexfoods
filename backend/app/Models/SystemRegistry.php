<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SystemRegistry extends Model
{
    protected $table = 'system_registry';

    protected $fillable = [
        'system_name', 'business_purpose', 'account_owner', 'administrator',
        'billing_owner', 'renewal_period', 'renewal_date', 'data_owner',
        'recovery_process', 'notes',
    ];

    protected function casts(): array
    {
        return ['renewal_date' => 'date'];
    }
}
