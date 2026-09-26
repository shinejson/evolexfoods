<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FeedTransaction extends Model
{
    protected $fillable = ['feed_item_id', 'type', 'quantity', 'transaction_date', 'notes'];

    protected function casts(): array
    {
        return ['transaction_date' => 'date', 'quantity' => 'decimal:2'];
    }

    public function feedItem(): BelongsTo
    {
        return $this->belongsTo(FeedItem::class);
    }
}
