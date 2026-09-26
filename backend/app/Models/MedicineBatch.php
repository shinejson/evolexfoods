<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MedicineBatch extends Model
{
    protected $fillable = ['inventory_item_id', 'batch_number', 'quantity', 'expiry_date', 'status'];

    protected function casts(): array
    {
        return ['expiry_date' => 'date', 'quantity' => 'decimal:2'];
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(InventoryItem::class, 'inventory_item_id');
    }
}
