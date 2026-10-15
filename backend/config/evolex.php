<?php

/**
 * Evolex operational standards (Operations Manual).
 *
 * These values are the single source of truth shared by the API services
 * below — they are intentionally *not* re-declared in controllers:
 *
 *  - Animal ID system (§10):  EV-GT-000001 / EV-SH-000001 / EV-CT-000001,
 *    sequence numbers are never reused.
 *  - Gestation lengths (§39): 150 days for goats and sheep, 283 for cattle,
 *    used by the Expected Kidding / Gestation Horizon Radar.
 *  - Procurement approval matrix (§44–47): purchases whose estimated cost
 *    exceeds the executive threshold are routed to Executive approval;
 *    everything at or below it is approved at Supervisor / Operations tier.
 *    The threshold can be overridden at runtime with the
 *    `procurement_executive_threshold_ghs` setting (Settings → procurement).
 */
return [
    'animal_id' => [
        // species => [code, label]
        'species' => [
            'goat' => ['code' => 'GT', 'label' => 'Goat'],
            'sheep' => ['code' => 'SH', 'label' => 'Sheep'],
            'cattle' => ['code' => 'CT', 'label' => 'Cattle'],
        ],
        'prefix_base' => 'EV',
        'sequence_width' => 6,
    ],

    'gestation' => [
        // days, by species (§39 — 150 days for goats/sheep)
        'days' => [
            'goat' => 150,
            'sheep' => 150,
            'cattle' => 283,
        ],
        'default_days' => 150,
        // Horizon buckets shown on the radar, in days from today.
        'horizons' => [7, 30, 60, 90],
    ],

    'procurement' => [
        // GH₵ — at or below: Tier 1 (Supervisor). Above: Tier 2 (Executive).
        'executive_threshold_ghs' => (float) env('EVOLEX_PROCUREMENT_EXECUTIVE_THRESHOLD', 1000),
        'tiers' => [
            1 => [
                'key' => 'tier_1',
                'label' => 'Tier 1 · Supervisor approval',
                'approver_label' => 'Supervisor / Operations',
                // users.role values allowed to decide at this tier
                'roles' => ['supervisor', 'operations', 'operations_manager', 'farm_manager', 'procurement', 'executive', 'owner', 'admin'],
            ],
            2 => [
                'key' => 'tier_2',
                'label' => 'Tier 2 · Executive approval',
                'approver_label' => 'Executive / Owner',
                'roles' => ['executive', 'owner', 'ceo', 'admin'],
            ],
        ],
    ],
];
