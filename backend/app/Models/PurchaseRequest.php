<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PurchaseRequest extends Model
{
    protected $fillable = [
        'request_number', 'requested_by', 'requested_at', 'item_name', 'category',
        'quantity', 'unit', 'estimated_cost', 'priority', 'status', 'justification',
    ];

    protected function casts(): array
    {
        return [
            'requested_at' => 'date',
            'quantity' => 'decimal:2',
            'estimated_cost' => 'decimal:2',
        ];
    }

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function approvals(): HasMany
    {
        return $this->hasMany(PurchaseRequestApproval::class);
    }

    public function purchaseOrders(): HasMany
    {
        return $this->hasMany(PurchaseOrder::class);
    }
}
