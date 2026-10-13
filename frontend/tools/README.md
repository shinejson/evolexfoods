# Frontend dev tools

## `preview-api.mjs`

A dependency-free mock of the Evolex API for front-end work when the Laravel
backend is not running (no PHP/MySQL, fresh machine, UI review, CI screenshots).

```bash
npm run preview:api     # http://127.0.0.1:8000
npm start               # ng serve proxies /api → 127.0.0.1:8000
```

Then sign in with any of the demo accounts and the password `password`.

Implemented routes:

| Method | Route                    | Notes                                     |
| ------ | ------------------------ | ----------------------------------------- |
| POST   | `/api/v1/auth/login`     | Accepts any password, echoes a demo role  |
| GET    | `/api/v1/auth/me`        |                                           |
| POST   | `/api/v1/auth/logout`    |                                           |
| GET    | `/api/v1/dashboard/ceo`  | Honours `from` / `to`, mirrors the seeder |
| GET    | `/api/v1/finance/overview` | Finance KPIs, expense mix, six-month trend and payable aging |
| GET    | `/api/v1/lookups`        | Locations, animals, suppliers and invoices |
| GET    | `/api/v1/livestock/pregnancies` | `status` (`active` defaults, `all` for the breeding register), `date_field`, `from`, `to` |
| GET    | `/api/v1/livestock/births` | `from` / `to`, defaults to the last 30 days      |
| GET/POST | `/api/v1/records/health` | 18 seeded cases, in-memory writes        |
| GET/POST | `/api/v1/records/treatments` | 14 seeded treatments                |
| GET/POST | `/api/v1/records/breeding` | 24 service cycles with dam + sire     |
| GET/POST | `/api/v1/records/pregnancies` | pregnancies, written through the CRUD routes |
| PUT/DELETE | `/api/v1/records/{health,treatments,breeding,pregnancies}/{id}` | Full CRUD |
| GET/POST | `/api/v1/records/{expenses,invoices,payments,suppliers}` | Finance registers with in-memory writes |
| PUT/DELETE | `/api/v1/records/{expenses,invoices,payments,suppliers}/{id}` | Full finance CRUD; payment writes recalculate invoice status |

The operations fixtures mirror `backend/database/seeders/DatabaseSeeder.php` so
the CEO Command Center, KPI thresholds, the 30-question answerability contract,
the Animal Health workspace and the Breeding workspace can be exercised end to
end. Finance fixtures include six months of sample activity so the new charts
and payable aging are useful during a UI preview. Writes are held in memory and
reset when the process restarts. Never use this mock as a source of truth — the
real endpoints live in `backend/routes/api.php`.
