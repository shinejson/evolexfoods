<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ChannelMetric;
use App\Models\ContentItem;
use App\Models\MediaAsset;
use Illuminate\Http\JsonResponse;

class MarketingController extends Controller
{
    public function content(): JsonResponse
    {
        $items = ContentItem::with('media')->orderByDesc('scheduled_for')->get();
        $media = MediaAsset::orderByDesc('captured_at')->get();

        return response()->json([
            'question' => 27,
            'content_count' => $items->count(),
            'published' => $items->where('status', 'published')->count(),
            'scheduled' => $items->where('status', 'scheduled')->count(),
            'media_count' => $media->count(),
            'items' => $items,
            'media' => $media,
            'source' => 'content_items, media_assets',
        ]);
    }

    public function performance(): JsonResponse
    {
        $latest = ChannelMetric::orderByDesc('metric_date')->get()->groupBy('channel')->map(fn ($rows) => $rows->first());

        $totals = [
            'reach' => (int) ChannelMetric::where('metric_date', '>=', now()->subDays(30))->sum('reach'),
            'views' => (int) ChannelMetric::where('metric_date', '>=', now()->subDays(30))->sum('views'),
            'followers' => (int) ChannelMetric::orderByDesc('metric_date')->get()->groupBy('channel')->map(fn ($rows) => $rows->first()->followers)->sum(),
            'website_visits' => (int) ChannelMetric::where('metric_date', '>=', now()->subDays(30))->sum('website_visits'),
            'leads' => (int) ChannelMetric::where('metric_date', '>=', now()->subDays(30))->sum('leads'),
        ];

        return response()->json([
            'question' => 28,
            'totals_30d' => $totals,
            'by_channel' => $latest->values(),
            'source' => 'channel_metrics (GA4, Buffer, HubSpot, social)',
        ]);
    }
}
