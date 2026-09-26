<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\Contact;
use App\Models\Deal;
use Illuminate\Http\JsonResponse;

class CrmController extends Controller
{
    public function prospects(): JsonResponse
    {
        $companies = Company::whereIn('lifecycle_stage', ['lead', 'prospect', 'subscriber'])
            ->orderBy('name')
            ->get();
        $contacts = Contact::with('company')
            ->whereIn('lifecycle_stage', ['lead', 'prospect', 'subscriber'])
            ->orderBy('name')
            ->get();

        return response()->json([
            'question' => 25,
            'count' => $companies->count(),
            'companies' => $companies,
            'contacts' => $contacts,
            'source' => 'companies, contacts (HubSpot mirror)',
        ]);
    }

    public function opportunities(): JsonResponse
    {
        $deals = Deal::with(['company', 'contact', 'stage'])
            ->where('status', 'open')
            ->orderByDesc('amount')
            ->get();

        return response()->json([
            'question' => 26,
            'count' => $deals->count(),
            'pipeline_value' => round((float) $deals->sum('amount'), 2),
            'missing_next_action' => $deals->filter(fn ($d) => empty($d->next_action))->values(),
            'records' => $deals,
            'source' => 'deals (HubSpot mirror)',
        ]);
    }
}
