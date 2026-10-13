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
| GET    | `/api/v1/lookups`        | Locations + animals                       |
| GET/POST | `/api/v1/records/health` | 18 seeded cases, in-memory writes        |
| GET/POST | `/api/v1/records/treatments` | 14 seeded treatments                |
| PUT/DELETE | `/api/v1/records/{health,treatments}/{id}` | Full CRUD        |

The numbers mirror `backend/database/seeders/DatabaseSeeder.php` so the CEO
Command Center, KPI thresholds, the 30-question answerability contract and the
Animal Health workspace (filters, KPI tiles, create/edit/delete) can be exercised
end to end. Writes are held in memory and reset when the process restarts. Never use it as a source of truth — the real endpoints live
in `backend/routes/api.php`.
