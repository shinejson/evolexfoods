/**
 * Dev-only mock of the Evolex API, so the Angular app (and the CEO Command
 * Center in particular) can be previewed without a PHP runtime or a database.
 *
 *   node tools/preview-api.mjs        # serves http://127.0.0.1:8000
 *   npm start                         # ng serve proxies /api -> 127.0.0.1:8000
 *
 * It implements just enough of the surface the Hub needs:
 *   POST /api/v1/auth/login
 *   GET  /api/v1/auth/me
 *   POST /api/v1/auth/logout
 *   GET  /api/v1/dashboard/ceo
 *
 * The numbers below mirror backend/database/seeders/DatabaseSeeder.php.
 * This file is never bundled: it lives outside src/ and is not imported by the app.
 */
import { createServer } from 'node:http';

const PORT = Number(process.env['MOCK_API_PORT'] ?? 8000);
const HOST = process.env['MOCK_API_HOST'] ?? '127.0.0.1';

const ROLES = {
  'owner@evolex.com': 'owner',
  'executive@evolex.com': 'executive',
  'ops@evolex.com': 'operations',
  'farm@evolex.com': 'farm_manager',
  'finance@evolex.com': 'finance',
  'marketing@evolex.com': 'marketing',
  'sales@evolex.com': 'sales'
};

const LOCATIONS = [
  { location: 'North Paddock', total: 14 },
  { location: 'South Paddock', total: 11 },
  { location: 'River Field', total: 8 },
  { location: 'Maternity Barn', total: 7 },
  { location: 'Quarantine Pen', total: 5 }
];

const ALERTS = [
  {
    id: 1,
    type: 'low_feed_cover',
    severity: 'critical',
    title: 'Low feed cover',
    message: 'Dairy mash cover is under 14 days at current consumption.',
    module: 'feed',
    is_read: false,
    triggered_at: new Date(Date.now() - 3 * 3600_000).toISOString()
  },
  {
    id: 2,
    type: 'open_disease_cases',
    severity: 'critical',
    title: 'Open disease cases',
    message: '3 animals currently sick and under treatment.',
    module: 'health',
    is_read: false,
    triggered_at: new Date(Date.now() - 6 * 3600_000).toISOString()
  },
  {
    id: 3,
    type: 'overdue_maintenance',
    severity: 'warning',
    title: 'Overdue maintenance',
    message: 'Water pump seal inspection is overdue.',
    module: 'maintenance',
    is_read: false,
    triggered_at: new Date(Date.now() - 9 * 3600_000).toISOString()
  },
  {
    id: 4,
    type: 'low_stock',
    severity: 'warning',
    title: 'Low stock: Ivermectin',
    message: 'Quantity on hand is below reorder level.',
    module: 'inventory',
    is_read: false,
    triggered_at: new Date(Date.now() - 14 * 3600_000).toISOString()
  },
  {
    id: 5,
    type: 'owner_decision_required',
    severity: 'info',
    title: 'Owner decision required',
    message: '2 decisions waiting for ownership approval.',
    module: 'governance',
    is_read: false,
    triggered_at: new Date(Date.now() - 20 * 3600_000).toISOString()
  }
];

function isoDay(date) {
  return date.toISOString().slice(0, 10);
}

function resolveRange(url) {
  const to = url.searchParams.get('to') ?? isoDay(new Date());
  if (url.searchParams.get('from')) {
    return { from: url.searchParams.get('from'), to };
  }
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return { from: isoDay(from), to };
}

function ceoPayload(url) {
  const { from, to } = resolveRange(url);
  const digital = { reach_30d: 48200, views_30d: 18600, leads_30d: 14 };

  return {
    generated_at: new Date().toISOString(),
    from,
    to,
    kpis: {
      total_herd: 45,
      female: 30,
      male: 15,
      pregnancies: 8,
      births: 4,
      deaths: 2,
      mortality_rate: 2.4,
      herd_growth: 4,
      herd_growth_rate: 9.8,
      sick: 3,
      under_treatment: 3,
      feed_remaining: 565,
      days_feed_remaining: 11.3,
      low_stock: 3,
      open_purchase_requests: 2,
      pending_approvals: 2,
      equipment_due_maintenance: 2,
      employees_present: 6,
      open_tasks: 11,
      spending_week: 920,
      spending_month: 4840,
      prospects: 7,
      opportunities: 3,
      content_produced: 12,
      digital_performance: digital,
      risks: 3,
      owner_decisions_required: 2
    },
    answers: {
      1: { question: 'How many animals do we own?', value: 45, source: 'animals' },
      2: { question: 'Where are they?', value: LOCATIONS, source: 'animals, locations' },
      3: { question: 'How many are female?', value: 30, source: 'animals' },
      4: { question: 'How many are male?', value: 15, source: 'animals' },
      5: { question: 'How many are pregnant?', value: 8, source: 'pregnancies' },
      6: { question: 'How many births have occurred?', value: 4, period: [from, to], source: 'births' },
      7: { question: 'How many deaths have occurred?', value: 2, period: [from, to], source: 'deaths' },
      8: { question: 'What is the mortality rate?', value: 2.4, unit: '%', source: 'deaths, animals' },
      9: { question: 'Which animals are sick?', value: 3, source: 'health_records' },
      10: { question: 'Which animals are under treatment?', value: 3, source: 'treatments' },
      11: { question: 'How quickly is the herd growing?', value: 4, rate: 9.8, source: 'animals' },
      12: { question: 'How much feed remains?', value: 565, unit: 'kg', source: 'feed_items' },
      13: { question: 'How many days of feed remain?', value: 11.3, source: 'feed_items' },
      14: { question: 'Which medicines are available?', value: 3, source: 'inventory_items' },
      15: { question: 'Which inventory items are low?', value: 3, source: 'inventory_items' },
      16: { question: 'What purchases have been requested?', value: 4, pending: 2, source: 'purchase_requests' },
      17: { question: 'Who approved each purchase?', value: 2, source: 'purchase_request_approvals' },
      18: { question: 'What has been purchased?', value: 3, source: 'purchase_orders, goods_receipts' },
      19: { question: 'What equipment does Evolex own?', value: 6, source: 'assets' },
      20: {
        question: 'What equipment requires maintenance?',
        value: 2,
        open_tickets: 3,
        source: 'maintenance_schedules, maintenance_tickets'
      },
      21: { question: 'Who is working?', value: 6, headcount: 7, source: 'attendance' },
      22: { question: 'What tasks remain incomplete?', value: 11, source: 'tasks' },
      23: { question: 'How much are we spending?', week: 920, month: 4840, source: 'expenses, purchase_orders, invoices' },
      24: { question: 'Who are our suppliers?', value: 5, source: 'suppliers' },
      25: { question: 'Who are our potential customers?', value: 7, source: 'companies' },
      26: { question: 'What commercial opportunities exist?', value: 3, pipeline_value: 17600, source: 'deals' },
      27: { question: 'What marketing is being produced?', value: 12, published: 7, source: 'content_items, media_assets' },
      28: { question: 'How are our digital channels performing?', value: digital, source: 'channel_metrics' },
      29: { question: 'What risks currently exist?', value: 3, source: 'risks' },
      30: { question: 'What decisions require ownership approval?', value: 2, source: 'decisions' }
    },
    alerts: ALERTS
  };
}

/* ------------------------------------------------------------------ */
/* Health workspace fixtures (mirroring the seeder)                     */
/* ------------------------------------------------------------------ */

const PADDOCKS = [
  { id: 1, name: 'North Paddock', code: 'PAD-A' },
  { id: 2, name: 'South Paddock', code: 'PAD-B' },
  { id: 3, name: 'River Field', code: 'PAD-C' },
  { id: 4, name: 'Maternity Barn', code: 'BRN-1' },
  { id: 5, name: 'Quarantine Pen', code: 'QRN-1' }
];

const SPECIES = ['goat', 'sheep', 'cattle'];
const ANIMALS = Array.from({ length: 24 }, (_, index) => {
  const id = index + 1;
  const species = SPECIES[index % 3];
  const prefix = species === 'goat' ? 'EV-GT' : species === 'sheep' ? 'EV-SH' : 'EV-CT';
  return {
    id,
    animal_id: `${prefix}-${String(id).padStart(6, '0')}`,
    species,
    sex: index % 3 === 0 ? 'male' : 'female',
    status: index === 22 ? 'dead' : 'alive',
    location_id: PADDOCKS[index % PADDOCKS.length].id
  };
});

const CONDITIONS = ['mastitis', 'lameness', 'respiratory', 'pneumonia', 'bloat', 'wound infection'];
const SEVERITIES = ['low', 'moderate', 'high', 'critical'];

function dayOffset(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

let healthRecords = Array.from({ length: 18 }, (_, index) => {
  const id = index + 1;
  const animal = ANIMALS[index % ANIMALS.length];
  const open = index % 3 !== 2;
  return {
    id,
    animal_id: animal.id,
    recorded_date: dayOffset(open ? [2, 9, 21, 40][index % 4] : [12, 26, 55][index % 3]),
    condition: CONDITIONS[index % CONDITIONS.length],
    severity: SEVERITIES[index % SEVERITIES.length],
    status: open ? 'open' : 'closed',
    notes: open ? 'Under observation by the vet team.' : 'Recovered, no further action.',
    recorded_by: 3,
    animal: { ...animal, location: PADDOCKS.find((l) => l.id === animal.location_id) }
  };
});

const TREATMENT_TYPES = ['medication', 'vaccination', 'wound care', 'isolation'];
const MEDICINES = ['Oxytetracycline', 'Ivermectin', 'Multivitamin', 'Penicillin'];

let treatments = Array.from({ length: 14 }, (_, index) => {
  const id = index + 1;
  const animal = ANIMALS[(index + 2) % ANIMALS.length];
  const active = index % 4 !== 3;
  return {
    id,
    animal_id: animal.id,
    health_record_id: healthRecords[index % healthRecords.length].id,
    start_date: dayOffset(active ? [1, 4, 11, 19][index % 4] : [20, 34, 47][index % 3]),
    end_date: active ? null : dayOffset([10, 20, 30][index % 3]),
    treatment_type: TREATMENT_TYPES[index % TREATMENT_TYPES.length],
    medicine: MEDICINES[index % MEDICINES.length],
    dosage: `${[5, 10, 15][index % 3]}ml ${index % 2 === 0 ? 'IM' : 'oral'}`,
    status: active ? 'active' : 'completed',
    notes: '',
    animal: { ...animal, location: PADDOCKS.find((l) => l.id === animal.location_id) }
  };
});

function attachAnimal(record, animals) {
  const animal = animals.find((item) => item.id === record.animal_id);
  return { ...record, animal: animal ? { ...animal, location: PADDOCKS.find((l) => l.id === animal.location_id) } : null };
}

const HEALTH_STORE = {
  health: {
    rows: healthRecords,
    defaults: { severity: 'moderate', status: 'open' }
  },
  treatments: {
    rows: treatments,
    defaults: { status: 'active' }
  }
};

function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
    'Cache-Control': 'no-store'
  });
  res.end(payload);
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const path = url.pathname;

  if (req.method === 'POST' && path === '/api/v1/auth/login') {
    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', () => {
      let email = 'owner@evolex.com';
      try {
        email = JSON.parse(raw || '{}').email ?? email;
      } catch {
        /* keep the default demo account */
      }
      const role = ROLES[email] ?? 'owner';
      json(res, 200, {
        token: `mock-token-${role}`,
        user: { name: 'Demo Owner', email, role, department: 'Executive' }
      });
    });
    return;
  }

  if (path === '/api/v1/auth/me') {
    json(res, 200, { name: 'Demo Owner', email: 'owner@evolex.com', role: 'owner', department: 'Executive' });
    return;
  }

  if (path === '/api/v1/auth/logout') {
    json(res, 200, { message: 'Signed out' });
    return;
  }

  if (path === '/api/v1/dashboard/ceo') {
    json(res, 200, ceoPayload(url));
    return;
  }

  if (req.method === 'GET' && path === '/api/v1/lookups') {
    json(res, 200, {
      locations: PADDOCKS,
      animals: ANIMALS,
      suppliers: [],
      users: [],
      employees: [],
      assets: [],
      companies: []
    });
    return;
  }

  const recordMatch = path.match(/^\/api\/v1\/records\/(health|treatments)(?:\/(\d+))?$/);
  if (recordMatch) {
    const store = HEALTH_STORE[recordMatch[1]];
    const id = recordMatch[2] ? Number(recordMatch[2]) : null;

    if (req.method === 'GET') {
      if (id) {
        const row = store.rows.find((item) => item.id === id);
        row ? json(res, 200, attachAnimal(row, ANIMALS)) : json(res, 404, { message: 'Not found' });
        return;
      }
      json(res, 200, { data: store.rows.map((row) => attachAnimal(row, ANIMALS)) });
      return;
    }

    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', () => {
      let body = {};
      try {
        body = JSON.parse(raw || '{}');
      } catch {
        json(res, 422, { message: 'Invalid JSON body' });
        return;
      }

      if (req.method === 'POST') {
        const nextId = store.rows.reduce((max, row) => Math.max(max, row.id), 0) + 1;
        const created = { id: nextId, ...store.defaults, ...body };
        store.rows = [created, ...store.rows];
        json(res, 201, attachAnimal(created, ANIMALS));
        return;
      }

      if (req.method === 'PUT' && id) {
        const index = store.rows.findIndex((item) => item.id === id);
        if (index < 0) {
          json(res, 404, { message: 'Not found' });
          return;
        }
        store.rows[index] = { ...store.rows[index], ...body, id };
        json(res, 200, attachAnimal(store.rows[index], ANIMALS));
        return;
      }

      if (req.method === 'DELETE' && id) {
        store.rows = store.rows.filter((item) => item.id !== id);
        json(res, 200, { message: 'Deleted' });
        return;
      }

      json(res, 405, { message: `Method ${req.method} not allowed` });
    });
    return;
  }

  json(res, 404, { message: `Mock API has no route for ${req.method} ${path}` });
});

server.listen(PORT, HOST, () => {
  console.log(`Mock Evolex API listening on http://${HOST}:${PORT} (dev preview only)`);
});
