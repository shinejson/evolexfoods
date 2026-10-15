# Executive Features — Implementation Notes

Implements the four high-impact recommendations from the operations manual
on top of the existing Evolex Hub / CEO Command Center platform:

| # | Feature | Manual | Where it lives |
|---|---------|--------|----------------|
| 1 | Automated Animal ID Generator & Birth Lifecycle Automation | §10, §96 | Livestock → **Record Birth** |
| 2 | 1-Click Weekly Owner Report (printable / PDF digest) | §113 | CEO Command Center → **Weekly Owner Report** |
| 3 | Expected Kidding & Gestation Horizon Radar (7/30/60/90 days) | §39 | Operations → **Kidding Radar** (`/kidding-radar`) |
| 4 | Two-Tier Procurement Approval Matrix | §44–47 | Supply Chain → **Procurement** (`/procurement`) |

## 1. Animal IDs & birth automation (§10, §96)

- `App\Services\AnimalIdGenerator` is the only place IDs are minted:
  `EV-GT-000001` (goat), `EV-SH-000001` (sheep), `EV-CT-000001` (cattle).
- Numbering is backed by the new `animal_id_sequences` table (migration
  `2026_10_15_000000…`), advanced inside a row-locked transaction and
  reconciled against the highest ID already in `animals`. This replaces the
  old `count() + 1` logic, which could hand out duplicates after deletions
  and under concurrent submissions. **IDs are never reused.**
- `POST /api/v1/livestock/events/birth` now runs the full §96 chain via
  `App\Services\BirthRegistrationService`: validate Mother ID (must exist,
  be female and alive) → generate one ID per kid → create animal + birth
  records with dam/sire linked → close the dam's active pregnancy → return
  the dam to `open` breeding/pregnancy status → supervisor alert raised.
  Litters are supported with `kids: [{sex, birth_weight}, …]`; the legacy
  single-kid payload still works.
- `GET /api/v1/livestock/next-id?species=goat` previews the next ID without
  consuming it (shown live on the Livestock birth and registration forms).
  The generic CRUD store uses the same generator, so no creation path can
  bypass the sequence.

## 2. Weekly Owner Report (§113)

- `GET /api/v1/reports/weekly-owner?from=&to=` (defaults to the last 7 days)
  compiles the eight sections via `App\Services\WeeklyOwnerReportService`:
  1. Executive summary · 2. Livestock · 3. Operations & People ·
  4. Feed & Inventory · 5. Procurement & Financial Operations ·
  6. Sales & Marketing · 7. Risks · 8. Owner Decisions Required.
- The Livestock section states the herd equation exactly as required —
  *Opening herd + Births + Purchases − Deaths − Sales = Closing herd* — and
  flags any variance against the Livestock Master. Feed days remaining and
  spend (period / week-to-date / month-to-date, split across expenses,
  purchase orders and invoices) are included, as are top risks and every
  pending owner decision.
- In the CEO Command Center, **Weekly Owner Report** fetches the digest and
  opens it as a self-contained printable document
  (`owner-report.document.ts`); Print → *Save as PDF* produces the owner
  file. A download fallback covers popup-blocked browsers.

## 3. Gestation Horizon Radar (§39)

- `GET /api/v1/livestock/gestation-radar` returns every active pregnancy
  with its expected birth date — recorded, or calculated from the breeding
  date at **150 days for goats and sheep** (283 for cattle) — plus days to
  due, gestation progress/stage, and an exclusive bucket:
  `overdue / 7 / 30 / 60 / 90 / beyond`. The `horizons` list gives the
  cumulative "next 7/30/60/90 days" counts the manual asks for. Pregnant
  animals without a pregnancy record are included from the Livestock
  Master so the radar always agrees with the dashboard count.
- The `/kidding-radar` page renders horizon cards, a visual due-date track
  (one marker per dam), and per-bucket lists with gestation progress bars.
  Sheep gestation was aligned to 150 days across the breeding workspace,
  seeders and settings to match the manual.

## 4. Two-tier procurement approval matrix (§44–47)

- Routing (in `config/evolex.php`, threshold overridable via the
  `procurement_executive_threshold_ghs` setting, seeded at GH₵1,000):
  - **Tier 1 — Supervisor approval:** estimated cost ≤ GH₵1,000
    (supervisor / operations / farm manager / procurement roles).
  - **Tier 2 — Executive approval:** estimated cost > GH₵1,000, routed
    *directly* to Executive/Owner approvers.
- `approval_tier`, `approval_stage` and `required_approver_role` are stamped
  on every purchase request at creation (all creation paths, including the
  generic CRUD); each decision records its tier and approver role.
- `POST /procurement/requests/{id}/approve|reject` enforces the tier
  server-side (wrong tier → 422 with the reason) and a purchase order can
  only be raised afterwards: `POST /procurement/requests/{id}/purchase-order`.
- `GET /procurement/approval-matrix` describes the matrix; the Procurement
  page renders it, previews the routing live while a request is typed, and
  splits work into *Awaiting you / Awaiting others / Ready for PO / Closed*
  queues with the full approval history per request.

## Running it

```bash
cd backend && php artisan migrate            # adds sequences + tier columns
php artisan test --filter=ExecutiveFeaturesTest
cd ../frontend && npm start                  # or: node tools/preview-api.mjs
```

`frontend/tools/preview-api.mjs` mirrors every new endpoint in memory so the
Angular app (including all four features) can be exercised without a PHP
runtime. Frontend pure-logic specs live beside each feature
(`*.insights.spec.ts`) following the existing breeding/CEO test pattern.

Key configuration: `backend/config/evolex.php` (ID formats, gestation days,
approval tiers/threshold).
