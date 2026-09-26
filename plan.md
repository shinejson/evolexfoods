Below is a phased implementation blueprint based on the PDF. I interpret the document as the business requirements for an **Evolex Digital Operations Platform**: a custom Laravel + Angular layer that orchestrates the approved stack and fills gaps where Google Workspace, Odoo, HubSpot, WordPress, and AI tools are not enough.

**Important constraint from the manual:** “Do not build custom software when an inexpensive existing system adequately performs the function.”  
So the Laravel/Angular system should primarily be:
- **Evolex Hub** internal portal
- **Livestock / Farm OS** until a dedicated Farm OS is justified
- **Workflow, approval, automation, and reporting layer**
- **Integration layer** across Google Workspace, Odoo, HubSpot, WordPress, WhatsApp, Buffer, AI tools
- **CEO Command Center / management dashboards**

It should **not** duplicate Odoo for ERP, HubSpot for CRM, or Google Workspace for email/docs/drive.

---

# 1. Recommended Architecture

## Backend: Laravel
Use Laravel as:
- REST API / GraphQL optional
- Authentication + RBAC
- Workflow engine
- Form submission and validation
- Animal ID generation
- KPI and reporting engine
- Queue/jobs/scheduler
- Integration service layer
- Audit logging
- Notifications
- File/media metadata management

Suggested stack:
- Laravel 11+
- PostgreSQL preferred, MySQL acceptable
- Redis for queues/cache
- Laravel Horizon
- Laravel Sanctum / Passport
- Spatie Laravel Permission
- Spatie Activitylog
- Laravel Excel
- Laravel Socialite for Google OAuth
- Laravel HTTP Client for integrations
- S3-compatible storage or Google Drive API for media

## Frontend: Angular
Use Angular as:
- SPA / PWA
- Mobile-first field data entry
- Evolex Hub portal
- Quick Actions
- Dashboards
- Livestock, inventory, procurement, assets, maintenance, HR screens
- Offline-capable forms where needed
- Role-based UI

Suggested stack:
- Angular 17+ standalone components
- Angular Material or Tailwind + PrimeNG
- NgRx or Signals for state
- Angular PWA + service workers
- IndexedDB / Dexie for offline queue
- ApexCharts / ngx-charts for dashboards
- Reactive Forms
- JWT / cookie-based auth with Laravel Sanctum

## High-level flow
```
Angular SPA/PWA
      |
      v
Laravel API / Workflow / Integration Layer
      |
      +--> PostgreSQL/MySQL
      +--> Redis
      +--> S3 / Google Drive
      +--> Google Workspace APIs
      +--> Odoo XML-RPC/JSON-RPC
      +--> HubSpot API
      +--> WordPress REST API
      +--> WhatsApp Business Cloud API
      +--> Buffer API
      +--> GA4 / Search Console APIs
      +--> AI providers (OpenAI, Claude, Gemini, etc.)
```

---

# 2. Repository / Project Structure

```text
evolex-platform/
├── backend/                         # Laravel API
│   ├── app/
│   │   ├── Domain/
│   │   │   ├── Livestock/
│   │   │   │   ├── Models/
│   │   │   │   ├── Actions/
│   │   │   │   ├── Data/
│   │   │   │   ├── Policies/
│   │   │   │   └── Services/
│   │   │   ├── Breeding/
│   │   │   ├── AnimalHealth/
│   │   │   ├── Feed/
│   │   │   ├── Inventory/
│   │   │   ├── Procurement/
│   │   │   ├── Suppliers/
│   │   │   ├── Assets/
│   │   │   ├── Maintenance/
│   │   │   ├── HR/
│   │   │   ├── Attendance/
│   │   │   ├── SOP/
│   │   │   ├── Media/
│   │   │   ├── Marketing/
│   │   │   ├── CRM/
│   │   │   ├── Reporting/
│   │   │   └── Admin/
│   │   ├── Integrations/
│   │   │   ├── GoogleWorkspace/
│   │   │   ├── Odoo/
│   │   │   ├── HubSpot/
│   │   │   ├── WordPress/
│   │   │   ├── WhatsApp/
│   │   │   ├── Buffer/
│   │   │   ├── Analytics/
│   │   │   └── AI/
│   │   ├── Http/
│   │   │   ├── Controllers/Api/V1/
│   │   │   ├── Requests/
│   │   │   ├── Resources/
│   │   │   └── Middleware/
│   │   ├── Jobs/
│   │   ├── Events/
│   │   ├── Listeners/
│   │   ├── Notifications/
│   │   ├── Console/
│   │   └── Support/
│   ├── routes/api.php
│   ├── database/migrations/
│   ├── database/seeders/
│   └── tests/
│
├── frontend/                        # Angular SPA/PWA
│   ├── src/app/
│   │   ├── core/
│   │   │   ├── auth/
│   │   │   ├── guards/
│   │   │   ├── interceptors/
│   │   │   ├── services/
│   │   │   └── models/
│   │   ├── shared/
│   │   │   ├── components/
│   │   │   ├── directives/
│   │   │   ├── pipes/
│   │   │   └── ui/
│   │   ├── layout/
│   │   ├── features/
│   │   │   ├── hub/
│   │   │   ├── dashboard/
│   │   │   ├── livestock/
│   │   │   ├── breeding/
│   │   │   ├── health/
│   │   │   ├── feed/
│   │   │   ├── inventory/
│   │   │   ├── procurement/
│   │   │   ├── suppliers/
│   │   │   ├── assets/
│   │   │   ├── maintenance/
│   │   │   ├── hr/
│   │   │   ├── attendance/
│   │   │   ├── sop/
│   │   │   ├── media/
│   │   │   ├── marketing/
│   │   │   ├── crm/
│   │   │   ├── reports/
│   │   │   └── admin/
│   │   └── store/
│   └── src/assets/
│
├── infra/
│   ├── docker/
│   ├── nginx/
│   ├── scripts/
│   └── backups/
│
└── docs/
    ├── architecture/
    ├── sops/
    ├── api/
    ├── training/
    └── roadmap/
```

---

# 3. Phase Breakdown

## Phase 0 — Discovery, Architecture, and Standards
**Duration:** Weeks 1–2  
**Goal:** Understand Evolex, standardize before digitizing, and set the technical foundation.

### Laravel requirements
- Set up Laravel API skeleton.
- Configure PostgreSQL/MySQL, Redis, queues, storage.
- Implement authentication base: Google OAuth + email/password fallback.
- Implement RBAC roles:
  - Owner
  - Executive
  - Business Operations & Technology Manager
  - Farm Manager
  - Finance
  - Marketing
  - Sales
  - Farm Employee
  - Vet
  - Storekeeper
  - Procurement
- Implement audit logging.
- Create system registry table for all software systems, owners, billing, recovery, renewal.
- Create integration abstraction layer.

### Angular requirements
- Set up Angular SPA/PWA.
- Build login and role-based routing.
- Build app shell: sidebar, topbar, mobile navigation.
- Build Evolex Hub home page skeleton.
- Build Quick Actions component.
- Build shared form components: text, number, date, select, animal picker, location picker, photo upload.

### Integrations
- Google Workspace OAuth.
- Google Drive link handling.
- Odoo sandbox connection.
- HubSpot sandbox connection.

### Deliverables
- Architecture document.
- ERD / data model.
- SOP template.
- Security model.
- Phase plan approved.
- Initial system registry.

### Acceptance criteria
- A user can log in with role-based access.
- Audit log records critical actions.
- Integration credentials are stored securely.
- No process is automated before it is standardized.

---

## Phase 1 — Month 1: Digital Control and Livestock Core
**Goal:** Make Evolex measurable, organized, and digitally controlled.

### Laravel requirements
- Employee register CRUD.
- Animal ID generator:
  - Format: `EV-GT-000001`, `EV-SH-000001`, `EV-CT-000001`
  - Never reuse IDs.
- Livestock master:
  - Animal ID, tag ID, species, breed, sex, DOB, age, mother ID, father ID, source, cost, location, weight, breeding status, pregnancy status, expected birth date, health status, status, photo link, notes.
- Event forms API:
  - Animal registration
  - Birth
  - Death
  - Breeding
  - Pregnancy
  - Animal health
  - Vaccination
  - Weight
  - Transfer
  - Sale/Cull
- SOP library API.
- Document metadata and Drive link registry.
- Form submission validation and approval rules.
- Notifications for critical events.

### Angular requirements
- Evolex Hub sections:
  - Home
  - Farm Operations
  - Livestock
  - Employees
  - Procurement
  - Inventory
  - Maintenance
  - SOP Library
  - Training
  - Sales
  - Marketing
  - Dashboards
  - Calendar
  - Company Directory
  - Technology
  - Support
- Quick Actions:
  - Report Animal Birth
  - Report Animal Death
  - Report Sick Animal
  - Record Animal Treatment
  - Record Breeding
  - Request Purchase
  - Receive Inventory
  - Issue Inventory
  - Report Maintenance
  - Report Incident
  - View Farm Calendar
  - View SOPs
  - Open CEO Dashboard
- Livestock list, detail, timeline, and form entry screens.
- Mobile-first forms for farm workers.
- Photo upload support.

### Integrations
- Google Workspace for email/Drive.
- Google Forms can still be used for simple field entry, but Laravel API becomes the controlled data layer.
- Google Sheets sync optional for backup/reporting.

### Deliverables
- Google Workspace configured externally.
- Official emails operational.
- Google Groups created.
- Drive organized.
- Evolex Hub operational.
- Livestock physically counted.
- Animal ID system established.
- Livestock Master operational.
- Core livestock forms operational.
- Employee register operational.
- Supplier database started.
- Asset audit started.
- At least 5 critical SOPs completed.

### Acceptance criteria
- Management can answer: how many animals, where, sex, pregnancies, births, deaths, mortality rate, sick animals, treatments.
- 100% of livestock registered with unique IDs.
- Farm workers can submit events without editing the master sheet.

---

## Phase 2 — Month 2: Operational Control
**Goal:** Install structured enterprise operations for procurement, inventory, suppliers, assets, maintenance, and attendance.

### Laravel requirements
- Procurement workflow:
  - Need identified → Purchase request → Approval → Supplier selection → PO → Order placed → Goods received → Inventory updated → Invoice → Payment → Closed.
- Purchase request API.
- Approval matrix engine.
- Purchase order integration with Odoo.
- Goods receiving and discrepancy recording.
- Inventory management:
  - Categories: Feed, Medicine, Veterinary Supplies, Tools, PPE, Fuel, Spare Parts, Cleaning, Construction, Electrical, Plumbing, Office, Packaging.
  - Item ID, description, category, unit, storage location, quantity, average cost, supplier, minimum stock, reorder level, maximum level.
- Inventory receiving and issuing.
- Asset register:
  - Asset ID: `EV-AS-000001`
  - Description, category, serial, purchase date, price, supplier, location, assigned employee, condition, warranty, maintenance schedule, photo, status.
- Maintenance management:
  - Preventive, Corrective, Emergency, Inspection.
  - Ticket workflow.
- Attendance system:
  - Employee, date, time in, time out, absence, leave, overtime, notes.
- Responsibility matrix.
- SOP library expansion.

### Angular requirements
- Procurement screens:
  - Purchase request form
  - Approval queue
  - Purchase order view
  - Goods receiving
- Inventory screens:
  - Item list
  - Stock levels
  - Receive stock
  - Issue stock
  - Low-stock alerts
- Supplier screens.
- Asset register screens.
- Maintenance request and ticket screens.
- Attendance capture screens.
- SOP library browser and reader.
- Responsibility matrix viewer.

### Integrations
- Odoo Community:
  - Purchasing
  - Inventory
  - Maintenance
  - Suppliers
  - Projects
  - Employees where useful
- Do not force livestock into Odoo.

### Deliverables
- Odoo configured.
- Procurement operational.
- Purchase requests operational.
- Inventory functioning.
- Supplier system functioning.
- Asset register functioning.
- Maintenance system functioning.
- Attendance functioning.
- Responsibility matrix completed.
- At least 10 SOPs completed.

### Acceptance criteria
- Every purchase has a request, approval, PO, receipt, and inventory update.
- Low-stock items trigger alerts.
- Maintenance tickets can be opened, assigned, completed, verified, and closed.
- Attendance is recorded digitally.

---

## Phase 3 — Month 3: Digital Brand and Marketing Engine
**Goal:** Build the public brand, media library, and AI-assisted marketing production system.

### Laravel requirements
- Media library:
  - Organize by year → month → location → content type → subject.
  - Store original media metadata, tags, links, and rights.
- AI prompt library.
- Content calendar.
- Marketing asset registry.
- Campaign tracking.
- Social channel registry.
- Website integration metadata.
- Analytics data ingestion from GA4 and Search Console.
- WhatsApp Business integration metadata.
- Buffer integration for scheduling.

### Angular requirements
- Media library browser:
  - Upload, tag, search, preview, download.
- Content calendar:
  - Weekly/monthly view
  - Draft, review, approved, scheduled, published.
- AI Prompt Library:
  - Approved prompts for ChatGPT, Claude, Gemini, etc.
- Marketing dashboard:
  - Reach, engagement, views, followers, website visits, leads.
- Social account management screen.
- WhatsApp Business quick links.
- Website analytics screen.

### Integrations
- WordPress REST API.
- Cloudflare DNS/security documentation.
- Google Analytics 4.
- Google Search Console.
- WhatsApp Business Cloud API.
- Buffer.
- Canva, CapCut, Kling, ElevenLabs, Google Vids as external production tools.

### Deliverables
- Website live.
- Cloudflare configured.
- Analytics configured.
- Search Console configured.
- Social accounts operational.
- WhatsApp Business operational.
- Media library operational.
- Canva templates operational.
- AI content-production workflow operational.
- Buffer configured.
- Content calendar operational.
- At least 15 SOPs completed.

### Acceptance criteria
- A real farm event can be turned into multiple content assets.
- Public content is human-reviewed before publishing.
- Website and social analytics flow into management reporting.

---

## Phase 4 — Month 4: Commercial Engine
**Goal:** Build the commercial CRM and sales pipeline around HubSpot.

### Laravel requirements
- HubSpot integration:
  - OAuth / API key
  - Sync companies, contacts, deals, notes, tasks
  - Webhooks for updates
- Buyer database mirror for reporting.
- Customer categories:
  - Restaurants, hotels, supermarkets, butchers, wholesalers, distributors, food processors, caterers, schools, institutions, exporters, retail chains.
- Sales pipeline mirror:
  - Prospect Identified → Contacted → Qualified → Meeting → Sample → Quote → Negotiation → Won → Repeat Customer.
- Market intelligence capture.
- Commercial reporting.
- WhatsApp-to-HubSpot lead capture workflow.

### Angular requirements
- CRM dashboard.
- Buyer database screens.
- Sales pipeline board.
- Company and contact detail pages.
- Next-action reminders.
- Commercial opportunity tracking.
- Sales reporting widgets.
- Market intelligence forms.

### Integrations
- HubSpot Free / low-cost CRM.
- Gmail and HubSpot connection.
- WhatsApp Business for communication, not CRM.
- Commercial leads must move into HubSpot.

### Deliverables
- HubSpot operational.
- Customer categories configured.
- Sales pipeline configured.
- Buyer database established.
- Commercial research underway.
- Sales reporting included in management dashboard.
- At least 20 SOPs completed.

### Acceptance criteria
- Every active opportunity has a next action.
- Important commercial relationships are not only inside personal WhatsApp.
- Management can see prospects, qualified leads, meetings, quotes, customers.

---

## Phase 5 — Month 5: Automate Repetitive Work and Business Intelligence
**Goal:** Automate repetitive tasks and provide executive visibility.

### Laravel requirements
- Google Apps Script alternatives in Laravel where appropriate:
  - Animal ID creation
  - Birth notifications
  - Expected-birth reminders
  - Feed reorder alerts
  - Medicine expiration alerts
  - Purchase approval notifications
  - Overdue maintenance alerts
  - Missing daily report alerts
  - Weekly report preparation
  - Data validation
- Event-driven automation:
  - Birth form → validate mother → generate animal ID → create animal → update mother history → update birth register → update herd count → dashboard → notify supervisor.
  - Feed balance → threshold → LOW FEED → operations alert → procurement notice → management dashboard status.
- Looker Studio data feeds.
- CEO Command Center API.
- KPI snapshot engine.
- Scheduled reports.

### Angular requirements
- Livestock Dashboard.
- Feed Dashboard.
- Operations Dashboard.
- Commercial Dashboard.
- Marketing Dashboard.
- Financial Operations Dashboard.
- CEO Command Center:
  - Livestock
  - Health
  - Feed
  - People
  - Operations
  - Inventory
  - Financial Operations
  - Sales
  - Marketing
  - Projects
  - Risks
  - Management Decisions Required
- Alerts and notifications center.
- Mobile PWA support for field use.

### Integrations
- Looker Studio for BI where appropriate.
- AppSheet only if Forms/Laravel/Angular becomes too limited.
- AI tools for analysis and report drafting.

### Deliverables
- Priority workflows automated.
- Management dashboards operating.
- CEO Command Center operating.
- AppSheet deployed only where justified.
- Reporting increasingly automated.
- Data-quality checks operating.

### Acceptance criteria
- Management can view real-time or near-real-time KPIs remotely.
- Alerts are generated automatically for feed, health, maintenance, procurement, and missing reports.
- Weekly owner report can be generated from system data.

---

## Phase 6 — Month 6: Stabilize and Prepare for Scale
**Goal:** Make the system independent of the builder and ready for growth.

### Laravel requirements
- Full system audit.
- Data quality audit:
  - Missing animals
  - Duplicate animals
  - Invalid IDs
  - Missing supplier records
  - Incorrect inventory
  - Unclosed purchase orders
  - Missing maintenance records
  - Inactive accounts
  - Incorrect permissions
  - Missing CRM follow-ups
  - Broken automations
- System administration manual:
  - System name
  - Business purpose
  - Account owner
  - Administrator
  - Users
  - Permissions
  - Billing owner
  - Renewal period
  - Recovery process
  - Integration
  - Data owner
  - Backup process
  - Configuration notes
- Backup and recovery procedures.
- Security hardening.
- Farm OS requirements document.
- 12-month technology roadmap.

### Angular requirements
- Training video library.
- System administration restricted view.
- Employee adoption audit forms.
- Data quality issue tracker.
- Simplified forms where adoption is low.
- Final presentation mode:
  - Live demonstration of systems.

### Integrations
- Full integration health checks.
- Renewal and billing tracking.
- AI stack review.

### Deliverables
- Major SOPs completed.
- Training videos created.
- System administration manual complete.
- Employee training completed.
- 12-month technology roadmap completed.
- Farm OS requirements documented.
- Upgrade triggers reviewed.

### Acceptance criteria
- Systems survive the absence of the Business Operations & Technology Manager.
- 100% livestock registered.
- Births, deaths, breeding, pregnancies, health, treatments, feed tracked.
- Weekly owner report consistently produced.
- CEO Command Center functioning.
- Major risks visible.
- Management decisions clearly identified.

---

# 4. Core Data Model

High-level entities:

```text
Users, Roles, Permissions
Employees, Attendance, TrainingRecords
Animals, Species, Breeds, Locations
AnimalEvents, Births, Deaths, Breedings, Pregnancies
HealthRecords, Treatments, Vaccinations, Weights, Transfers, SalesCulls
FeedItems, FeedTransactions, InventoryItems, StockMovements
Suppliers, PurchaseRequests, PurchaseOrders, GoodsReceipts
Assets, MaintenanceTickets, MaintenanceSchedules
SOPs, Documents, TrainingVideos
MediaAssets, ContentCalendar, Campaigns, AIPrompts
Companies, Contacts, Deals, PipelineStages  # mirrored from HubSpot
SystemRegistry, IntegrationAccounts, AuditLogs
KPISnapshots, Alerts, Notifications, Reports
```

---

# 5. Cross-Cutting Requirements

## Security
- Google Workspace SSO.
- MFA for admin and management.
- RBAC with least privilege.
- Encrypted secrets.
- Audit logs.
- No passwords in ordinary spreadsheets.
- Restricted system administration register.

## Offline / Field Use
- Angular PWA.
- IndexedDB queue for offline form submissions.
- Sync when online.
- Mobile-first forms.
- Low-bandwidth optimization.

## Integrations
- Google Workspace: OAuth, Drive, Gmail, Sheets, Apps Script where needed.
- Odoo: XML-RPC/JSON-RPC for procurement, inventory, suppliers, maintenance.
- HubSpot: CRM sync.
- WordPress: website content.
- Cloudflare: DNS/security.
- GA4 / Search Console: analytics.
- WhatsApp Business: messaging.
- Buffer: scheduling.
- AI providers: ChatGPT, Claude, Gemini, NotebookLM, Qwen, DeepSeek, Kling, ElevenLabs.

## AI Governance
- AI tools are not systems of record.
- Human review for all public content.
- Store approved prompts in AI Prompt Library.
- Do not upload sensitive Evolox information unnecessarily.
- Measure AI by hours saved, content created, external production avoided, turnaround time, sales material, marketing output, automation savings.

## Reporting
- Weekly owner report.
- Monthly management review.
- CEO Command Center.
- Looker Studio where appropriate.
- Laravel/Angular custom dashboards for operational and executive views.

## DevOps
- Dockerized local and production.
- CI/CD pipeline.
- Staging and production environments.
- Automated backups.
- Health checks.
- Error monitoring.
- Queue monitoring.

---

# 6. What to Build Custom vs Integrate

| Area | System of Record | Custom Laravel/Angular Role |
|---|---|---|
| Email / Docs / Drive | Google Workspace | Portal links, metadata, SSO |
| Procurement / Inventory / ERP | Odoo | Approval workflow, portal UI, reporting |
| CRM / Sales | HubSpot | Mirror, dashboards, WhatsApp lead capture |
| Website | WordPress | API integration, analytics |
| Livestock | Laravel/Angular until Farm OS | Full livestock management |
| SOP / Training | Laravel/Angular | SOP library, training videos |
| Media / Marketing | Laravel/Angular + external AI tools | Media library, content calendar, prompts |
| Dashboards | Looker Studio + Angular | CEO Command Center, operational dashboards |
| Automation | Laravel queues + Google Apps Script | Workflow automation, alerts |

---

# 7. Suggested MVP Boundary

**Build in first 6 months:**
- Evolex Hub
- Auth + RBAC
- Employee register
- Livestock master
- Animal ID generator
- Core livestock forms
- SOP library
- Procurement workflow
- Inventory
- Suppliers
- Assets
- Maintenance
- Attendance
- Media library
- Content calendar
- HubSpot integration
- CEO Command Center
- Alerts and automation

**Delay until triggers are met:**
- Full custom Farm OS
- RFID
- Multi-farm
- Offline-first advanced mobile app
- Manufacturing / processing modules
- Warehouse management
- Distribution
- Custom accounting
- Custom CRM replacement

The manual says Farm OS development should begin when herd approaches 750–1,000 animals, a second livestock location becomes operational, Google Sheets creates material data-quality problems, RFID is justified, multiple employees need complex livestock workflows, offline farm operation becomes important, or existing systems materially slow operations.

---

# 8. Final Definition of Success

The Laravel + Angular platform is successful when Evolex no longer depends primarily on:
- verbal reporting
- individual memory
- random notebooks
- personal email
- personal phones
- uncontrolled WhatsApp communication
- disconnected files
- unstructured spreadsheets

Information should flow:

```text
Physical Business Activity
   ↓
Structured Digital Record
   ↓
Company System
   ↓
Management Information
   ↓
Decision
   ↓
Action
   ↓
Performance Measurement
```

The mandate is to make Evolex:
- measurable
- organized
- digital
- visible
- automated where practical
- AI-leveraged
- scalable

Build today for the company Evolex intends to become.
