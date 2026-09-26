Understood. These 30 questions become **mandatory acceptance criteria**. The Laravel + Angular application is not complete unless each question can be answered from structured data, through an API, and through an Angular dashboard/screen — without relying on WhatsApp, memory, notebooks, or scattered spreadsheets.

Below is the **answerability contract**, data model, calculations, traceability matrix, API surface, and phase mapping.

---

# 1. Answerability Contract

Every question must have:

1. **A system of record**
2. **A structured data model**
3. **A calculation or query**
4. **A Laravel API endpoint**
5. **An Angular view/widget**
6. **An audit trail where relevant**
7. **A refresh frequency**
8. **An alert/notification if action is needed**

The application will answer these questions through the **CEO Command Center**, **Livestock Dashboard**, **Operations Dashboard**, **Commercial Dashboard**, **Marketing Dashboard**, and **Financial Operations Dashboard**.

---

# 2. Core Data Model Required

## Livestock
- `animals`
- `animal_events`
- `births`
- `deaths`
- `breedings`
- `pregnancies`
- `health_records`
- `treatments`
- `vaccinations`
- `weights`
- `transfers`
- `sales_culls`
- `locations`

## Feed & Inventory
- `feed_items`
- `feed_transactions`
- `inventory_items`
- `stock_movements`
- `medicine_batches`

## Procurement
- `purchase_requests`
- `purchase_request_approvals`
- `purchase_orders`
- `goods_receipts`
- `suppliers`

## Assets & Maintenance
- `assets`
- `maintenance_schedules`
- `maintenance_tickets`

## People & Tasks
- `employees`
- `attendance`
- `tasks`
- `responsibility_matrix`

## Finance
- `expenses`
- `invoices`
- `payments`

## Commercial
- `companies`
- `contacts`
- `deals`
- `pipeline_stages`
- Mirrored/synced from HubSpot

## Marketing
- `media_assets`
- `content_items`
- `campaigns`
- `channel_metrics`
- `ai_prompts`

## Governance
- `risks`
- `decisions`
- `approvals`
- `alerts`
- `audit_logs`

---

# 3. Key Calculations

| Metric | Formula |
|---|---|
| Total animals owned | Count of animals where `status = alive` and `current_status = active` |
| Animals by location | Group by `location_id` |
| Female count | Count where `sex = female` and `status = alive` |
| Male count | Count where `sex = male` and `status = alive` |
| Pregnant count | Count where active pregnancy exists or `pregnancy_status = pregnant` |
| Births | Count of `births` in period |
| Deaths | Count of `deaths` in period |
| Mortality rate | `(deaths in period / average herd size in period) * 100` |
| Herd growth | `closing herd - opening herd` |
| Herd growth rate | `((closing herd - opening herd) / opening herd) * 100` |
| Feed remaining | Sum of `quantity_on_hand` for feed category |
| Days of feed remaining | `feed_on_hand / average_daily_feed_consumption` |
| Low stock | `quantity_on_hand <= reorder_level` |
| Spending | Sum of expenses + purchase orders + invoices in period |
| Digital performance | GA4 + social metrics + Buffer + HubSpot leads |

---

# 4. Traceability Matrix — All 30 Questions

| # | Question | Data Source / Calculation | Laravel API | Angular View |
|---|---|---|---|---|
| 1 | How many animals do we own? | `animals` where status=alive | `GET /api/v1/livestock/summary` | Livestock Dashboard > Total Herd |
| 2 | Where are they? | Group by `locations` | `GET /api/v1/livestock/summary?group=location` | Livestock Dashboard > By Location |
| 3 | How many are female? | Count `sex=female` | `GET /api/v1/livestock/summary?sex=female` | Livestock Dashboard > Sex Breakdown |
| 4 | How many are male? | Count `sex=male` | `GET /api/v1/livestock/summary?sex=male` | Livestock Dashboard > Sex Breakdown |
| 5 | How many are pregnant? | Active pregnancies | `GET /api/v1/livestock/pregnancies` | Breeding Dashboard > Pregnant |
| 6 | How many births have occurred? | Count `births` | `GET /api/v1/livestock/births?from=&to=` | Livestock Dashboard > Births |
| 7 | How many deaths have occurred? | Count `deaths` | `GET /api/v1/livestock/deaths?from=&to=` | Livestock Dashboard > Deaths |
| 8 | What is the mortality rate? | Deaths / average herd | `GET /api/v1/livestock/mortality-rate` | CEO Command Center > Mortality |
| 9 | Which animals are sick? | Open health records | `GET /api/v1/livestock/health/sick` | Health Dashboard > Sick Animals |
| 10 | Which animals are under treatment? | Active treatments | `GET /api/v1/livestock/health/treatments` | Health Dashboard > Under Treatment |
| 11 | How quickly is the herd growing? | Closing - opening herd | `GET /api/v1/livestock/growth` | CEO Command Center > Herd Growth |
| 12 | How much feed remains? | Sum feed stock | `GET /api/v1/feed/summary` | Feed Dashboard > Feed Balance |
| 13 | How many days of feed remain? | Feed on hand / daily usage | `GET /api/v1/feed/days-remaining` | Feed Dashboard > Days Remaining |
| 14 | Which medicines are available? | Inventory category=medicine | `GET /api/v1/inventory/medicines` | Inventory > Medicines |
| 15 | Which inventory items are low? | `qty <= reorder_level` | `GET /api/v1/inventory/low-stock` | Inventory > Low Stock Alerts |
| 16 | What purchases have been requested? | `purchase_requests` | `GET /api/v1/procurement/requests` | Procurement > Requests |
| 17 | Who approved each purchase? | `purchase_request_approvals` | `GET /api/v1/procurement/requests/{id}/approvals` | Procurement > Request Detail > Approval History |
| 18 | What has been purchased? | `purchase_orders` + `goods_receipts` | `GET /api/v1/procurement/purchases` | Procurement > Purchases |
| 19 | What equipment does Evolex own? | `assets` | `GET /api/v1/assets` | Assets > Asset Register |
| 20 | What equipment requires maintenance? | Due schedules + open tickets | `GET /api/v1/maintenance/due` | Maintenance > Due & Open |
| 21 | Who is working? | `attendance` today | `GET /api/v1/hr/attendance/today` | HR Dashboard > Present Today |
| 22 | What tasks remain incomplete? | `tasks` where status != completed | `GET /api/v1/tasks/incomplete` | Tasks Dashboard > Open Tasks |
| 23 | How much are we spending? | Expenses + POs + invoices | `GET /api/v1/finance/spending?period=week|month` | Finance Dashboard > Spend |
| 24 | Who are our suppliers? | `suppliers` | `GET /api/v1/suppliers` | Suppliers > Directory |
| 25 | Who are our potential customers? | HubSpot lifecycle lead/prospect | `GET /api/v1/crm/prospects` | CRM > Prospects |
| 26 | What commercial opportunities exist? | HubSpot open deals | `GET /api/v1/crm/opportunities` | CRM > Pipeline |
| 27 | What marketing is being produced? | `content_items` + `media_assets` | `GET /api/v1/marketing/content` | Marketing > Content Calendar |
| 28 | How are our digital channels performing? | GA4 + social + Buffer + HubSpot | `GET /api/v1/marketing/performance` | Marketing Dashboard > Channel Performance |
| 29 | What risks currently exist? | `risks` | `GET /api/v1/risks` | Risk Register |
| 30 | What decisions require ownership approval? | `decisions` pending owner | `GET /api/v1/decisions/pending-owner` | CEO Command Center > Decisions Required |

---

# 5. Laravel API Surface

## Livestock
```http
GET /api/v1/livestock/summary
GET /api/v1/livestock
GET /api/v1/livestock/{id}
GET /api/v1/livestock/pregnancies
GET /api/v1/livestock/births
GET /api/v1/livestock/deaths
GET /api/v1/livestock/mortality-rate
GET /api/v1/livestock/growth
GET /api/v1/livestock/health/sick
GET /api/v1/livestock/health/treatments
```

## Feed & Inventory
```http
GET /api/v1/feed/summary
GET /api/v1/feed/days-remaining
GET /api/v1/inventory/medicines
GET /api/v1/inventory/low-stock
```

## Procurement
```http
GET /api/v1/procurement/requests
GET /api/v1/procurement/requests/{id}/approvals
GET /api/v1/procurement/purchases
GET /api/v1/suppliers
```

## Assets & Maintenance
```http
GET /api/v1/assets
GET /api/v1/maintenance/due
GET /api/v1/maintenance/tickets
```

## HR & Tasks
```http
GET /api/v1/hr/attendance/today
GET /api/v1/tasks/incomplete
```

## Finance
```http
GET /api/v1/finance/spending
```

## CRM
```http
GET /api/v1/crm/prospects
GET /api/v1/crm/opportunities
```

## Marketing
```http
GET /api/v1/marketing/content
GET /api/v1/marketing/performance
```

## Governance
```http
GET /api/v1/risks
GET /api/v1/decisions/pending-owner
```

## CEO Command Center
```http
GET /api/v1/dashboard/ceo
```

This single endpoint aggregates all 30 answers into one executive payload.

---

# 6. Angular Screens Required

## CEO Command Center
Cards:
- Total herd
- Females / Males
- Pregnancies
- Births
- Deaths
- Mortality rate
- Herd growth
- Sick animals
- Under treatment
- Feed remaining
- Days feed remaining
- Low stock
- Open purchase requests
- Pending approvals
- Equipment due maintenance
- Employees present
- Open tasks
- Spending week/month
- Prospects
- Opportunities
- Content produced
- Digital performance
- Risks
- Owner decisions required

## Livestock Dashboard
- Total animals
- By location
- By sex
- By age
- Pregnancies
- Expected births next 7/30/60/90 days
- Births
- Deaths
- Mortality rate
- Herd growth

## Health Dashboard
- Sick animals
- Under treatment
- Vaccinations due
- Deworming due
- Quarantine
- Veterinary follow-up

## Feed & Inventory Dashboard
- Feed on hand
- Days remaining
- Average daily consumption
- Feed cost per animal
- Low stock
- Medicines available
- Expiring medicines

## Procurement Dashboard
- Purchase requests
- Approval status
- Approver history
- Purchase orders
- Goods received
- Supplier performance

## Assets & Maintenance Dashboard
- Asset register
- Equipment owned
- Maintenance due
- Open tickets
- Overdue maintenance

## HR & Tasks Dashboard
- Employees present
- Attendance
- Leave
- Open tasks
- Overdue tasks

## Finance Dashboard
- Week-to-date spending
- Month-to-date spending
- Major cost categories
- Upcoming cash requirements

## CRM Dashboard
- Prospects
- Qualified leads
- Meetings
- Quotes
- Opportunities
- Next actions

## Marketing Dashboard
- Content produced
- Reach
- Views
- Followers
- Website traffic
- Leads
- Channel performance

## Risk & Decisions
- Risk register
- Severity
- Owner
- Mitigation
- Decisions requiring ownership approval

---

# 7. Phase Mapping

| Phase | Questions Enabled |
|---|---|
| Month 1 | 1–11, 14–15, 19, 21–22, 24 |
| Month 2 | 12–13, 16–20, 23–24 |
| Month 3 | 27–28 |
| Month 4 | 25–26 |
| Month 5 | All dashboard aggregation, alerts, automation |
| Month 6 | Audit, data quality, full answerability verification |

By Day 180, every question must be answerable from the system.

---

# 8. Acceptance Tests

The application passes only if:

1. `GET /api/v1/dashboard/ceo` returns answers to all 30 questions.
2. Every answer has a source table and audit trail.
3. Every answer can be filtered by date range.
4. Every answer can be viewed by role:
   - Owner
   - Executive
   - Operations Manager
   - Farm Manager
   - Finance
   - Marketing
   - Sales
5. Low stock, feed shortage, disease, mortality, overdue maintenance, missing reports, and pending owner decisions trigger alerts.
6. No answer depends on:
   - verbal reporting
   - individual memory
   - random notebooks
   - personal email
   - personal phones
   - uncontrolled WhatsApp
   - disconnected files
   - unstructured spreadsheets

---

# 9. Final Rule

The Laravel + Angular application must be the **management visibility layer** over Google Workspace, Odoo, HubSpot, WordPress, WhatsApp, Buffer, and AI tools.

It must not try to replace every system.

It must **answer the 30 questions reliably**, from structured data, with dashboards, APIs, alerts, and audit trails.

That is the definition of success for the first 180 days.
