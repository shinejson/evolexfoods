<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FeedItem extends Model
{
    protected $fillable = ['inventory_item_id', 'daily_consumption', 'feed_type'];

    protected function casts(): array
    {
        return ['daily_consumption' => 'decimal:2'];
    }

    public function inventoryItem(): BelongsTo
    {
        return $this->belongsTo(InventoryItem::class);
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(FeedTransaction::class);
    }
}
