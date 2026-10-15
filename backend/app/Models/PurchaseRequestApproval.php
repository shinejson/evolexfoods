<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PurchaseRequestApproval extends Model
{
    protected $fillable = ['purchase_request_id', 'approver_id', 'tier', 'approver_role', 'decision', 'decided_at', 'comments'];

    protected function casts(): array
    {
        return ['decided_at' => 'datetime', 'tier' => 'integer'];
    }

    public function request(): BelongsTo
    {
        return $this->belongsTo(PurchaseRequest::class, 'purchase_request_id');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approver_id');
    }
}
