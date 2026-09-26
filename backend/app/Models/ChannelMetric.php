<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ChannelMetric extends Model
{
    protected $fillable = [
        'channel', 'metric_date', 'reach', 'views', 'followers',
        'website_visits', 'leads', 'engagement_rate',
    ];

    protected function casts(): array
    {
        return ['metric_date' => 'date', 'engagement_rate' => 'decimal:2'];
    }
}
