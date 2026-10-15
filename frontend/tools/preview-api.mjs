/**
 * Dev-only mock of the Evolex API, so the Angular app can be previewed
 * without a PHP runtime or a database.
 *
 *   node tools/preview-api.mjs        # serves http://127.0.0.1:8000
 *   npm start                         # ng serve proxies /api -> 127.0.0.1:8000
 *
 * It implements the sign-in, CEO dashboard, operations preview routes and the
 * finance overview + expense, invoice and payment registers, and the
 * Commercial CRUD workspaces. Writes remain in memory for preview sessions.
 *
 * Operations figures mirror backend/database/seeders/DatabaseSeeder.php;
 * finance includes a longer sample history to exercise the charts. This file is
 * never bundled: it lives outside src/ and is not imported by the app.
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
    triggered_at: new Date(Date.now() - 2 * 3600_000).toISOString()
  },
  {
    id: 2,
    type: 'open_disease_cases',
    severity: 'critical',
    title: 'Open disease cases',
    message: '3 animals currently sick and under treatment.',
    module: 'health',
    is_read: false,
    triggered_at: new Date(Date.now() - 5 * 3600_000).toISOString()
  },
  {
    id: 3,
    type: 'low_stock',
    severity: 'warning',
    title: 'Low stock: Ivermectin',
    message: 'Quantity on hand is below reorder level.',
    module: 'inventory',
    is_read: false,
    triggered_at: new Date(Date.now() - 9 * 3600_000).toISOString()
  },
  {
    id: 4,
    type: 'overdue_maintenance',
    severity: 'warning',
    title: 'Overdue maintenance',
    message: 'Water pump seal inspection is overdue.',
    module: 'maintenance',
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
  },
  {
    id: 6,
    type: 'purchase_order_approved',
    severity: 'success',
    title: 'Purchase order approved',
    message: 'PO #1234 has been approved and released to the supplier.',
    module: 'procurement',
    is_read: false,
    triggered_at: new Date(Date.now() - 26 * 3600_000).toISOString()
  },
  {
    id: 7,
    type: 'vaccination_due',
    severity: 'warning',
    title: 'Vaccination campaign due',
    message: 'Annual clostridial vaccination is due for 12 animals next week.',
    module: 'health',
    is_read: false,
    triggered_at: new Date(Date.now() - 30 * 3600_000).toISOString()
  },
  {
    id: 8,
    type: 'employee_onboarding',
    severity: 'info',
    title: 'New employee onboarding',
    message: 'A new farm assistant starts Monday — complete onboarding tasks.',
    module: 'hr',
    is_read: false,
    triggered_at: new Date(Date.now() - 36 * 3600_000).toISOString()
  },
  {
    id: 9,
    type: 'payment_received',
    severity: 'success',
    title: 'Invoice payment received',
    message: 'Payment for invoice INV-2026-041 has been received.',
    module: 'finance',
    is_read: true,
    triggered_at: new Date(Date.now() - 44 * 3600_000).toISOString()
  },
  {
    id: 10,
    type: 'heat_detection',
    severity: 'info',
    title: 'Heat detection window',
    message: '6 cows are entering the optimal insemination window.',
    module: 'breeding',
    is_read: true,
    triggered_at: new Date(Date.now() - 52 * 3600_000).toISOString()
  },
  {
    id: 11,
    type: 'feed_delivery',
    severity: 'info',
    title: 'Feed delivery scheduled',
    message: 'Savanna Feeds delivery of 2.5T layers mash arrives Thursday.',
    module: 'feed',
    is_read: true,
    triggered_at: new Date(Date.now() - 60 * 3600_000).toISOString()
  },
  {
    id: 12,
    type: 'sales_cull_approved',
    severity: 'success',
    title: 'Sales cull approved',
    message: 'Cull request for animal AX-0419 has been approved by the owner.',
    module: 'sales',
    is_read: true,
    triggered_at: new Date(Date.now() - 72 * 3600_000).toISOString()
  }
];

let nextAlertId = ALERTS.reduce((max, alert) => Math.max(max, alert.id), 0) + 1;

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
const BREEDS = { goat: 'West African Dwarf', sheep: 'Djallonke', cattle: 'Sanga' };
const ANIMALS = Array.from({ length: 48 }, (_, index) => {
  const id = index + 1;
  const species = SPECIES[index % 3];
  const prefix = species === 'goat' ? 'EV-GT' : species === 'sheep' ? 'EV-SH' : 'EV-CT';
  const loc = PADDOCKS[index % PADDOCKS.length];
  const status = id <= 45 ? 'alive' : 'dead';
  return {
    id,
    animal_id: `${prefix}-${String(id).padStart(6, '0')}`,
    tag_id: `TAG-${String(id).padStart(4, '0')}`,
    species,
    breed: BREEDS[species],
    sex: index % 3 === 0 ? 'male' : 'female',
    status,
    current_status: status === 'alive' ? 'active' : 'inactive',
    health_status: [7, 19, 31].includes(id) ? 'sick' : 'healthy',
    weight: species === 'cattle' ? 180 + (index * 7) % 140 : 22 + (index * 5) % 45,
    cost: species === 'cattle' ? 1450 + (index % 5) * 120 : 480 + (index % 5) * 65,
    source: id % 5 === 0 ? 'purchased' : 'born_on_farm',
    location_id: loc.id,
    location: loc
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
    rows: () => healthRecords,
    set: (rows) => {
      healthRecords = rows;
    },
    defaults: { severity: 'moderate', status: 'open' }
  },
  treatments: {
    rows: () => treatments,
    set: (rows) => {
      treatments = rows;
    },
    defaults: { status: 'active' }
  }
};

/* ------------------------------------------------------------------ */
/* Breeding workspace fixtures (mirroring the seeder)                    */
/* ------------------------------------------------------------------ */

const GESTATION = { goat: 150, sheep: 147, cattle: 283 };
const BREEDING_METHODS = ['natural', 'natural', 'natural', 'artificial_insemination', 'embryo_transfer'];

function daysFromNow(days) {
  return dayOffset(-days);
}

function weightFor(species) {
  const value = species === 'cattle' ? 18 + (Math.random() * 14) : 1.5 + Math.random() * 3;
  return Number(value.toFixed(1));
}

const BREEDING_FEMALES = ANIMALS.filter((animal) => animal.sex === 'female' && animal.status === 'alive');
const BREEDING_MALES = ANIMALS.filter((animal) => animal.sex !== 'female' && animal.status === 'alive');

function withLocation(animal) {
  return animal ? { ...animal, location: PADDOCKS.find((paddock) => paddock.id === animal.location_id) ?? null } : null;
}

let breedingCycles = [];
let pregnancies = [];
let births = [];

function nextId(rows) {
  return rows.reduce((max, row) => Math.max(max, row.id), 0) + 1;
}

function breedingRecord(femaleId, maleId, servedAt, method) {
  const female = ANIMALS.find((animal) => animal.id === femaleId) ?? null;
  const male = ANIMALS.find((animal) => animal.id === maleId) ?? null;
  return {
    id: nextId(breedingCycles),
    female_id: femaleId,
    male_id: maleId,
    breeding_date: servedAt,
    method,
    status: 'completed',
    notes: null,
    female: withLocation(female),
    male: withLocation(male)
  };
}

function pregnancyRecord(animalId, breedingId, confirmedAt, dueAt, status, endedAt = null) {
  const pregnancy = {
    id: nextId(pregnancies),
    animal_id: animalId,
    breeding_id: breedingId,
    confirmed_date: confirmedAt,
    expected_birth_date: dueAt,
    status,
    ended_at: endedAt,
    notes: null,
    animal: withLocation(ANIMALS.find((animal) => animal.id === animalId) ?? null),
    breeding: breedingCycles.find((cycle) => cycle.id === breedingId) ?? null
  };
  pregnancies = [...pregnancies, pregnancy];
  return pregnancy;
}

function birthRecord(calfId, mother, father, birthDate, locationId) {
  const calf = ANIMALS.find((animal) => animal.id === calfId) ?? null;
  const record = {
    id: nextId(births),
    animal_id: calfId,
    mother_animal_id: mother?.animal_id ?? null,
    father_animal_id: father?.animal_id ?? null,
    birth_date: birthDate,
    sex: calf?.sex ?? 'female',
    birth_weight: weightFor(calf?.species ?? mother?.species ?? 'goat'),
    location_id: locationId,
    status: 'alive',
    notes: null,
    animal: withLocation(calf),
    location: PADDOCKS.find((paddock) => paddock.id === locationId) ?? null
  };
  births = [...births, record];
  return record;
}

// Eight active pregnancies, mirroring the eight dams flagged in the seeder.
BREEDING_FEMALES.slice(0, 8).forEach((dam, index) => {
  const sire = BREEDING_MALES[index % BREEDING_MALES.length];
  const length = GESTATION[dam.species] ?? 150;
  const due = daysFromNow(8 + index * 9);
  const served = dayOffset(length - (8 + index * 9));
  const cycle = breedingRecord(dam.id, sire.id, served, BREEDING_METHODS[index % 3]);
  breedingCycles = [...breedingCycles, cycle];
  pregnancyRecord(dam.id, cycle.id, dayOffset(length - 29 - index * 9), due, 'active');
});

// Breeding programme: sixteen services across the last year, three in four took.
Array.from({ length: 16 }, (_, index) => index).forEach((index) => {
  const dam = BREEDING_FEMALES[(index + 8) % BREEDING_FEMALES.length];
  const sire = BREEDING_MALES[(index * 3) % BREEDING_MALES.length];
  const servedDaysAgo = 60 + index * 21;
  const length = GESTATION[dam.species] ?? 150;
  const dueDaysAhead = length - servedDaysAgo;
  const conceived = index % 4 !== 3;
  const calf = ANIMALS[20 + index] ?? null;

  const cycle = breedingRecord(dam.id, sire.id, dayOffset(servedDaysAgo), BREEDING_METHODS[index % BREEDING_METHODS.length]);
  breedingCycles = [...breedingCycles, cycle];

  pregnancyRecord(
    dam.id,
    cycle.id,
    dayOffset(servedDaysAgo - 21),
    dueDaysAhead >= 0 ? daysFromNow(dueDaysAhead) : dayOffset(-dueDaysAhead),
    conceived ? (dueDaysAhead >= 0 ? 'active' : 'completed') : 'failed',
    conceived && dueDaysAhead < 0 ? dayOffset(-dueDaysAhead) : null
  );

  if (conceived && dueDaysAhead < 0 && calf) {
    birthRecord(calf.id, dam, sire, dayOffset(-dueDaysAhead), PADDOCKS[3].id);
  }
});

// Recent arrivals at the maternity barn.
Array.from({ length: 9 }, (_, index) => index + 1).forEach((index) => {
  const dam = BREEDING_FEMALES[index % BREEDING_FEMALES.length];
  const calf = ANIMALS[index] ?? null;
  if (calf) {
    birthRecord(calf.id, dam, null, dayOffset(index * 9), PADDOCKS[3].id);
  }
});

const BREEDING_STORE = {
  breeding: {
    rows: () => breedingCycles,
    defaults: { method: 'natural', status: 'completed' },
    set: (rows) => {
      breedingCycles = rows;
    },
    attach: (row) => ({
      ...row,
      female: withLocation(ANIMALS.find((animal) => animal.id === row.female_id) ?? null),
      male: withLocation(ANIMALS.find((animal) => animal.id === row.male_id) ?? null)
    })
  },
  pregnancies: {
    rows: () => pregnancies,
    defaults: { status: 'active' },
    set: (rows) => {
      pregnancies = rows;
    },
    attach: (row) => ({
      ...row,
      animal: withLocation(ANIMALS.find((animal) => animal.id === row.animal_id) ?? null),
      breeding: breedingCycles.find((cycle) => cycle.id === row.breeding_id) ?? null
    })
  }
};

/* ------------------------------------------------------------------ */
/* Finance workspace fixtures and in-memory accounting actions         */
/* ------------------------------------------------------------------ */

let financeSuppliers = [
  { id: 1, code: 'SUP-001', name: 'Green Valley Feeds', category: 'Feed', phone: '+233 20 555 0121', email: 'orders@greenvalley.example', status: 'active' },
  { id: 2, code: 'SUP-002', name: 'Accra Vet Supplies', category: 'Veterinary', phone: '+233 30 555 0142', email: 'sales@accravet.example', status: 'active' },
  { id: 3, code: 'SUP-003', name: 'Coastal Fuel & Energy', category: 'Fuel', phone: '+233 24 555 0183', email: 'dispatch@coastalfuel.example', status: 'active' },
  { id: 4, code: 'SUP-004', name: 'Northstar Farm Services', category: 'Maintenance', phone: '+233 50 555 0194', email: 'admin@northstar.example', status: 'active' }
];

let financeExpenses = [
  { id: 1, category: 'Feed', description: 'Emergency hay', amount: 640, expense_date: dayOffset(2), source: 'Manual entry' },
  { id: 2, category: 'Fuel', description: 'Generator diesel', amount: 280, expense_date: dayOffset(1), source: 'Manual entry' },
  { id: 3, category: 'Veterinary', description: 'Clinic visit', amount: 190, expense_date: dayOffset(8), source: 'Manual entry' },
  { id: 4, category: 'Wages', description: 'Casual labour', amount: 900, expense_date: dayOffset(5), source: 'Manual entry' },
  { id: 5, category: 'Maintenance', description: 'Water pump service', amount: 460, expense_date: dayOffset(42), source: 'Manual entry' },
  { id: 6, category: 'Feed', description: 'Mineral blocks', amount: 720, expense_date: dayOffset(67), source: 'Manual entry' },
  { id: 7, category: 'Fuel', description: 'Monthly diesel delivery', amount: 510, expense_date: dayOffset(98), source: 'Manual entry' },
  { id: 8, category: 'Veterinary', description: 'Vaccination supplies', amount: 390, expense_date: dayOffset(129), source: 'Manual entry' },
  { id: 9, category: 'Repairs', description: 'Paddock gate repairs', amount: 340, expense_date: dayOffset(158), source: 'Manual entry' },
  { id: 10, category: 'Feed', description: 'Dairy mash', amount: 1180, expense_date: dayOffset(174), source: 'Manual entry' }
];

let financeInvoices = [
  {
    id: 1,
    invoice_number: 'INV-2026-014',
    supplier_id: 1,
    amount: 2100,
    invoice_date: dayOffset(2),
    due_date: dayOffset(-12),
    status: 'partial'
  },
  {
    id: 2,
    invoice_number: 'INV-2026-011',
    supplier_id: 2,
    amount: 360,
    invoice_date: dayOffset(18),
    due_date: dayOffset(3),
    status: 'paid'
  },
  {
    id: 3,
    invoice_number: 'INV-2026-017',
    supplier_id: 4,
    amount: 1480,
    invoice_date: dayOffset(4),
    due_date: dayOffset(3),
    status: 'unpaid'
  },
  {
    id: 4,
    invoice_number: 'INV-2026-019',
    supplier_id: 3,
    amount: 825,
    invoice_date: dayOffset(1),
    due_date: dayOffset(-6),
    status: 'unpaid'
  },
  { id: 5, invoice_number: 'INV-2026-009', supplier_id: 1, amount: 1330, invoice_date: dayOffset(48), due_date: dayOffset(18), status: 'paid' },
  { id: 6, invoice_number: 'INV-2026-006', supplier_id: 2, amount: 760, invoice_date: dayOffset(80), due_date: dayOffset(50), status: 'paid' },
  { id: 7, invoice_number: 'INV-2026-004', supplier_id: 3, amount: 1120, invoice_date: dayOffset(111), due_date: dayOffset(81), status: 'paid' },
  { id: 8, invoice_number: 'INV-2026-002', supplier_id: 4, amount: 890, invoice_date: dayOffset(140), due_date: dayOffset(110), status: 'paid' },
  { id: 9, invoice_number: 'INV-2025-119', supplier_id: 1, amount: 1760, invoice_date: dayOffset(169), due_date: dayOffset(139), status: 'paid' }
];

let financePayments = [
  { id: 1, invoice_id: 1, amount: 500, paid_at: dayOffset(1), method: 'bank_transfer', reference: 'PAY-441' },
  { id: 2, invoice_id: 2, amount: 360, paid_at: dayOffset(9), method: 'mobile_money', reference: 'PAY-438' },
  { id: 3, invoice_id: 5, amount: 1330, paid_at: dayOffset(31), method: 'bank_transfer', reference: 'PAY-421' },
  { id: 4, invoice_id: 6, amount: 760, paid_at: dayOffset(63), method: 'mobile_money', reference: 'PAY-398' },
  { id: 5, invoice_id: 7, amount: 1120, paid_at: dayOffset(93), method: 'bank_transfer', reference: 'PAY-374' },
  { id: 6, invoice_id: 8, amount: 890, paid_at: dayOffset(123), method: 'cash', reference: 'PAY-351' },
  { id: 7, invoice_id: 9, amount: 1760, paid_at: dayOffset(153), method: 'bank_transfer', reference: 'PAY-329' }
];


let commercialCompanies = [
  { id: 1, name: 'Harborview Hotel', category: 'hotels', lifecycle_stage: 'prospect', city: 'Accra', phone: '+233 30 555 0121', email: 'purchasing@harborview.example', status: 'active' },
  { id: 2, name: 'City Supermarket', category: 'supermarkets', lifecycle_stage: 'lead', city: 'Tema', phone: '+233 30 555 0132', email: 'buying@citymarket.example', status: 'active' },
  { id: 3, name: 'Golden Fork Restaurants', category: 'restaurants', lifecycle_stage: 'customer', city: 'Accra', phone: '+233 24 555 0143', email: 'procurement@goldenfork.example', status: 'active' },
  { id: 4, name: 'Northside Butchers', category: 'butchers', lifecycle_stage: 'prospect', city: 'Kumasi', phone: '+233 50 555 0154', email: 'orders@northside.example', status: 'active' },
  { id: 5, name: 'Savanna Distributors', category: 'distributors', lifecycle_stage: 'lead', city: 'Accra', phone: '+233 20 555 0165', email: 'sales@savanna.example', status: 'inactive' }
];

let commercialContacts = [
  { id: 1, company_id: 1, name: 'Ama Mensah', role: 'Procurement Manager', email: 'ama@harborview.example', phone: '+233 20 555 1121', lifecycle_stage: 'prospect' },
  { id: 2, company_id: 2, name: 'Kofi Owusu', role: 'Category Buyer', email: 'kofi@citymarket.example', phone: '+233 24 555 1122', lifecycle_stage: 'lead' },
  { id: 3, company_id: 3, name: 'Esi Boateng', role: 'Owner', email: 'esi@goldenfork.example', phone: '+233 50 555 1123', lifecycle_stage: 'customer' },
  { id: 4, company_id: 4, name: 'Yaw Asare', role: 'Buyer', email: 'yaw@northside.example', phone: '+233 30 555 1124', lifecycle_stage: 'prospect' }
];

const commercialStages = [
  { id: 1, name: 'Prospect Identified', sort_order: 1 },
  { id: 2, name: 'Contacted', sort_order: 2 },
  { id: 3, name: 'Qualified', sort_order: 3 },
  { id: 4, name: 'Meeting', sort_order: 4 },
  { id: 5, name: 'Sample', sort_order: 5 },
  { id: 6, name: 'Quote', sort_order: 6 },
  { id: 7, name: 'Negotiation', sort_order: 7 },
  { id: 8, name: 'Won', sort_order: 8 }
];

let commercialDeals = [
  { id: 1, name: 'Weekly goat supply - Harborview', company_id: 1, contact_id: 1, pipeline_stage_id: 4, amount: 4800, close_date: daysFromNow(18), next_action: 'Send sample pack', next_action_date: daysFromNow(2), status: 'open' },
  { id: 2, name: 'Cattle carcass trial - City Super', company_id: 2, contact_id: 2, pipeline_stage_id: 6, amount: 9200, close_date: daysFromNow(30), next_action: 'Issue quote', next_action_date: daysFromNow(4), status: 'open' },
  { id: 3, name: 'Repeat order - Golden Fork', company_id: 3, contact_id: 3, pipeline_stage_id: 8, amount: 3600, close_date: dayOffset(4), next_action: 'Schedule delivery', next_action_date: null, status: 'won' },
  { id: 4, name: 'Wholesale order - Northside', company_id: 4, contact_id: 4, pipeline_stage_id: 2, amount: 2150, close_date: dayOffset(2), next_action: 'Confirm buyer specs', next_action_date: dayOffset(1), status: 'open' }
];

let commercialSales = [
  { id: 1, animal_id: 22, type: 'sale', event_date: dayOffset(8), amount: 1750, buyer: 'Golden Fork Restaurants', notes: 'Market-weight goat' },
  { id: 2, animal_id: 19, type: 'cull', event_date: dayOffset(17), amount: 820, buyer: 'Northside Butchers', notes: 'Retired breeding stock' },
  { id: 3, animal_id: 16, type: 'sale', event_date: dayOffset(31), amount: 2430, buyer: 'Harborview Hotel', notes: 'Quarterly supply' }
];

let commercialMedia = [
  { id: 1, title: 'New kid in Maternity Barn', type: 'photo', location: 'Maternity Barn', subject: 'goat birth', url: 'https://drive.evolex.local/media/birth-01.jpg', captured_at: dayOffset(3), rights: 'internal' },
  { id: 2, title: 'Traceable protein product image', type: 'photo', location: 'Packing area', subject: 'product', url: 'https://drive.evolex.local/media/traceable-protein.jpg', captured_at: dayOffset(12), rights: 'approved' }
];

let commercialContent = [
  { id: 1, title: 'Life on the farm: first kid of September', channel: 'Instagram', content_type: 'carousel', status: 'published', scheduled_for: null, published_at: dayOffset(2), media_asset_id: 1, body: 'A new arrival at Evolex Farm.' },
  { id: 2, title: 'Why traceable livestock matters', channel: 'Website', content_type: 'article', status: 'scheduled', scheduled_for: daysFromNow(2), published_at: null, media_asset_id: null, body: 'A draft article about responsible sourcing.' },
  { id: 3, title: 'Buyer sample day recap', channel: 'LinkedIn', content_type: 'post', status: 'draft', scheduled_for: daysFromNow(5), published_at: null, media_asset_id: null, body: 'Share highlights from the buyer tasting.' },
  { id: 4, title: 'Farm-to-table supply update', channel: 'Facebook', content_type: 'post', status: 'review', scheduled_for: daysFromNow(3), published_at: null, media_asset_id: 2, body: 'Review copy before publishing.' }
];

let commercialCampaigns = [
  { id: 1, name: 'Traceable Protein Q3', channel: 'multi', start_date: dayOffset(20), end_date: daysFromNow(40), status: 'active', budget: 1200 },
  { id: 2, name: 'Buyer Sample Day', channel: 'LinkedIn', start_date: daysFromNow(10), end_date: daysFromNow(14), status: 'draft', budget: 450 },
  { id: 3, name: 'September Farm Stories', channel: 'Instagram', start_date: dayOffset(45), end_date: dayOffset(15), status: 'completed', budget: 320 }
];

let commercialMetrics = [
  { id: 1, channel: 'Instagram', metric_date: dayOffset(1), reach: 8420, views: 5120, followers: 1830, website_visits: 86, leads: 4, engagement_rate: 4.8 },
  { id: 2, channel: 'Facebook', metric_date: dayOffset(1), reach: 4620, views: 3210, followers: 2140, website_visits: 43, leads: 2, engagement_rate: 3.1 },
  { id: 3, channel: 'Website', metric_date: dayOffset(1), reach: 2680, views: 1840, followers: 0, website_visits: 690, leads: 6, engagement_rate: 5.2 },
  { id: 4, channel: 'WhatsApp', metric_date: dayOffset(2), reach: 940, views: 680, followers: 520, website_visits: 0, leads: 3, engagement_rate: 8.6 },
  { id: 5, channel: 'LinkedIn', metric_date: dayOffset(4), reach: 3290, views: 1760, followers: 740, website_visits: 52, leads: 2, engagement_rate: 2.7 }
];


const commercialStores = {
  companies: { get: () => commercialCompanies, set: (rows) => { commercialCompanies = rows; } },
  contacts: { get: () => commercialContacts, set: (rows) => { commercialContacts = rows; } },
  deals: { get: () => commercialDeals, set: (rows) => { commercialDeals = rows; } },
  sales: { get: () => commercialSales, set: (rows) => { commercialSales = rows; } },
  marketing: { get: () => commercialContent, set: (rows) => { commercialContent = rows; } },
  campaigns: { get: () => commercialCampaigns, set: (rows) => { commercialCampaigns = rows; } },
  channel_metrics: { get: () => commercialMetrics, set: (rows) => { commercialMetrics = rows; } }
};

function attachCommercial(resource, record) {
  if (resource === 'contacts') {
    return { ...record, company: commercialCompanies.find((row) => row.id === Number(record.company_id)) ?? null };
  }
  if (resource === 'deals') {
    return {
      ...record,
      company: commercialCompanies.find((row) => row.id === Number(record.company_id)) ?? null,
      contact: commercialContacts.find((row) => row.id === Number(record.contact_id)) ?? null,
      stage: commercialStages.find((row) => row.id === Number(record.pipeline_stage_id)) ?? null
    };
  }
  if (resource === 'sales') {
    return attachAnimal(record, ANIMALS);
  }
  if (resource === 'marketing') {
    return { ...record, media: commercialMedia.find((row) => row.id === Number(record.media_asset_id)) ?? null };
  }
  return { ...record };
}

function financeInvoiceBalance(invoice) {
  if (invoice.status === 'paid' && !financePayments.some((payment) => payment.invoice_id === invoice.id)) {
    return 0;
  }
  const paid = financePayments
    .filter((payment) => payment.invoice_id === invoice.id)
    .reduce((sum, payment) => sum + Number(payment.amount), 0);
  return Math.max(0, Number(invoice.amount) - paid);
}

function financeInvoiceWithRelations(invoice) {
  return {
    ...invoice,
    supplier: financeSuppliers.find((supplier) => supplier.id === invoice.supplier_id) ?? null,
    payments: financePayments.filter((payment) => payment.invoice_id === invoice.id).map((payment) => ({ ...payment }))
  };
}

function financePaymentWithRelations(payment) {
  const invoice = financeInvoices.find((row) => row.id === payment.invoice_id);
  return {
    ...payment,
    invoice: invoice ? {
      ...invoice,
      supplier: financeSuppliers.find((supplier) => supplier.id === invoice.supplier_id) ?? null
    } : null
  };
}

function syncFinanceInvoice(invoiceId) {
  const invoice = financeInvoices.find((row) => row.id === Number(invoiceId));
  if (!invoice) return;
  const paid = financePayments
    .filter((payment) => payment.invoice_id === invoice.id)
    .reduce((sum, payment) => sum + Number(payment.amount), 0);
  invoice.status = paid <= 0 ? 'unpaid' : (paid + 0.005 >= Number(invoice.amount) ? 'paid' : 'partial');
}

function monthStart(offset) {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth() + offset, 1);
}

function financeOverview(url) {
  const { from, to } = resolveRange(url);
  const today = isoDay(new Date());
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekDay = isoDay(nextWeek);
  const rangeExpenses = financeExpenses.filter((expense) => expense.expense_date >= from && expense.expense_date <= to);
  const rangePayments = financePayments.filter((payment) => payment.paid_at >= from && payment.paid_at <= to);
  const openInvoices = financeInvoices.filter((invoice) => ['unpaid', 'partial'].includes(invoice.status));
  const overdueInvoices = openInvoices.filter((invoice) => invoice.due_date && invoice.due_date < today && financeInvoiceBalance(invoice) > 0);
  const dueSoonInvoices = openInvoices.filter((invoice) => invoice.due_date && invoice.due_date >= today && invoice.due_date <= nextWeekDay && financeInvoiceBalance(invoice) > 0);

  const aging = { current: 0, days_1_30: 0, days_31_60: 0, days_61_plus: 0 };
  for (const invoice of openInvoices) {
    const balance = financeInvoiceBalance(invoice);
    if (balance <= 0) continue;
    if (!invoice.due_date || invoice.due_date >= today) {
      aging.current += balance;
      continue;
    }
    const daysLate = Math.floor((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${invoice.due_date}T00:00:00Z`)) / 86_400_000);
    aging[daysLate <= 30 ? 'days_1_30' : daysLate <= 60 ? 'days_31_60' : 'days_61_plus'] += balance;
  }

  const categories = new Map();
  for (const expense of rangeExpenses) {
    const key = expense.category || 'Uncategorised';
    categories.set(key, (categories.get(key) ?? 0) + Number(expense.amount));
  }

  const monthlyActivity = Array.from({ length: 6 }, (_, index) => {
    const month = monthStart(index - 5);
    const key = month.toISOString().slice(0, 7);
    return {
      month: key,
      label: month.toLocaleDateString('en', { month: 'short', timeZone: 'UTC' }),
      expenses: financeExpenses.filter((expense) => expense.expense_date.slice(0, 7) === key).reduce((sum, expense) => sum + Number(expense.amount), 0),
      payments: financePayments.filter((payment) => payment.paid_at.slice(0, 7) === key).reduce((sum, payment) => sum + Number(payment.amount), 0)
    };
  });

  const upcoming = openInvoices
    .filter((invoice) => invoice.due_date && invoice.due_date >= today && financeInvoiceBalance(invoice) > 0)
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
    .slice(0, 5)
    .map((invoice) => ({
      id: invoice.id,
      invoice_number: invoice.invoice_number,
      supplier: financeSuppliers.find((supplier) => supplier.id === invoice.supplier_id)?.name ?? 'Unassigned supplier',
      balance: financeInvoiceBalance(invoice),
      due_date: invoice.due_date,
      status: invoice.status
    }));

  const expensesTotal = rangeExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const paymentsTotal = rangePayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const openPayables = openInvoices.reduce((sum, invoice) => sum + financeInvoiceBalance(invoice), 0);
  const overduePayables = overdueInvoices.reduce((sum, invoice) => sum + financeInvoiceBalance(invoice), 0);
  const due7Days = dueSoonInvoices.reduce((sum, invoice) => sum + financeInvoiceBalance(invoice), 0);

  return {
    generated_at: new Date().toISOString(),
    from,
    to,
    currency: 'GHS',
    totals: {
      expenses: expensesTotal,
      payments: paymentsTotal,
      outflow: expensesTotal + paymentsTotal,
      open_payables: openPayables,
      overdue_payables: overduePayables,
      overdue_invoice_count: overdueInvoices.length,
      due_7_days: due7Days,
      due_7_days_count: dueSoonInvoices.length,
      open_invoice_count: openInvoices.filter((invoice) => financeInvoiceBalance(invoice) > 0).length
    },
    expense_categories: [...categories.entries()]
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6),
    monthly_activity: monthlyActivity,
    invoice_aging: aging,
    upcoming_invoices: upcoming,
    source: 'expenses, invoices, payments'
  };
}

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
        user: { name: 'Demo Owner', email, role, department: 'Executive', two_factor_enabled: true }
      });
    });
    return;
  }

  if (path === '/api/v1/auth/me') {
    json(res, 200, { name: 'Demo Owner', email: 'owner@evolex.com', role: 'owner', department: 'Executive', two_factor_enabled: true });
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

  if (req.method === 'GET' && path === '/api/v1/finance/overview') {
    json(res, 200, financeOverview(url));
    return;
  }

  if (req.method === 'GET' && path === '/api/v1/lookups') {
    json(res, 200, {
      locations: PADDOCKS,
      animals: ANIMALS,
      suppliers: financeSuppliers,
      users: [],
      employees: [],
      assets: [],
      companies: commercialCompanies.map(({ id, name }) => ({ id, name })),
      contacts: commercialContacts.map((contact) => ({
        id: contact.id,
        name: contact.name,
        company_id: contact.company_id,
        company: commercialCompanies.find((company) => company.id === contact.company_id) ?? null
      })),
      pipeline_stages: commercialStages,
      media_assets: commercialMedia.map(({ id, title, type, captured_at }) => ({ id, title, type, captured_at })),
      invoices: financeInvoices.map(({ id, invoice_number }) => ({ id, invoice_number }))
    });
    return;
  }

  if (req.method === 'GET' && path === '/api/v1/livestock/pregnancies') {
    // Mirrors LivestockController::pregnancies — status/date_field/from/to.
    const status = url.searchParams.get('status') ?? 'active';
    const field = url.searchParams.get('date_field') === 'confirmed_date' ? 'confirmed_date' : 'expected_birth_date';
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');

    const records = pregnancies
      .filter((row) => status === 'all' || row.status === status)
      .filter((row) => (from ? row[field] >= from : true))
      .filter((row) => (to ? row[field] <= to : true))
      .sort((a, b) => a[field].localeCompare(b[field]))
      .map((row) => BREEDING_STORE.pregnancies.attach(row));

    const active = pregnancies.filter((row) => row.status === 'active');
    const within = (days) => active.filter((row) => row.expected_birth_date >= dayOffset(0) && row.expected_birth_date <= daysFromNow(days)).length;

    json(res, 200, {
      question: 5,
      count: active.length,
      expected_births: { next_7: within(7), next_30: within(30), next_60: within(60), next_90: within(90) },
      filters: { status, date_field: field },
      records,
      source: 'pregnancies'
    });
    return;
  }

  if (req.method === 'GET' && path === '/api/v1/livestock/births') {
    const to = url.searchParams.get('to') ?? dayOffset(0);
    const from = url.searchParams.get('from') ?? dayOffset(30);
    const records = births
      .filter((row) => row.birth_date >= from && row.birth_date <= to)
      .sort((a, b) => b.birth_date.localeCompare(a.birth_date));
    json(res, 200, { question: 6, from, to, count: records.length, records, source: 'births' });
    return;
  }

  const financeRecordMatch = path.match(/^\/api\/v1\/records\/(expenses|invoices|payments|suppliers)(?:\/(\d+))?$/);
  if (financeRecordMatch) {
    const resource = financeRecordMatch[1];
    const id = financeRecordMatch[2] ? Number(financeRecordMatch[2]) : null;
    const rows = () => resource === 'expenses'
      ? financeExpenses
      : resource === 'invoices'
        ? financeInvoices
        : resource === 'payments'
          ? financePayments
          : financeSuppliers;
    const replaceRows = (next) => {
      if (resource === 'expenses') financeExpenses = next;
      else if (resource === 'invoices') financeInvoices = next;
      else if (resource === 'payments') financePayments = next;
      else financeSuppliers = next;
    };
    const attach = (row) => resource === 'invoices'
      ? financeInvoiceWithRelations(row)
      : resource === 'payments'
        ? financePaymentWithRelations(row)
        : { ...row };

    if (req.method === 'GET') {
      if (id) {
        const row = rows().find((item) => item.id === id);
        row ? json(res, 200, attach(row)) : json(res, 404, { message: 'Not found' });
        return;
      }
      json(res, 200, { data: [...rows()].sort((a, b) => b.id - a.id).map(attach) });
      return;
    }

    if (req.method === 'DELETE' && id) {
      const row = rows().find((item) => item.id === id);
      if (!row) {
        json(res, 404, { message: 'Not found' });
        return;
      }
      if (resource === 'invoices' && financePayments.some((payment) => payment.invoice_id === id)) {
        json(res, 409, { message: 'This invoice has a payment history and cannot be deleted. Keep it for accounting records.' });
        return;
      }
      if (resource === 'payments') {
        const invoiceId = row.invoice_id;
        replaceRows(rows().filter((item) => item.id !== id));
        syncFinanceInvoice(invoiceId);
      } else {
        replaceRows(rows().filter((item) => item.id !== id));
      }
      json(res, 200, { deleted: true });
      return;
    }

    if (req.method === 'POST' || (req.method === 'PUT' && id)) {
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

        const existing = id ? rows().find((item) => item.id === id) : null;
        if (id && !existing) {
          json(res, 404, { message: 'Not found' });
          return;
        }

        if (resource === 'expenses' && (!body.category || !body.expense_date || Number(body.amount) <= 0)) {
          json(res, 422, { message: 'Category, date and a positive amount are required.' });
          return;
        }
        if (resource === 'invoices' && (!body.invoice_number || !body.invoice_date || Number(body.amount) <= 0)) {
          json(res, 422, { message: 'Invoice number, date and a positive amount are required.' });
          return;
        }
        if (resource === 'invoices' && financeInvoices.some((invoice) => invoice.invoice_number === body.invoice_number && invoice.id !== id)) {
          json(res, 422, { message: 'An invoice with this number already exists.' });
          return;
        }
        if (resource === 'payments' && (!body.invoice_id || Number(body.amount) <= 0 || !body.paid_at)) {
          json(res, 422, { message: 'Invoice, date and a positive payment amount are required.' });
          return;
        }
        if (resource === 'payments' && !financeInvoices.some((invoice) => invoice.id === Number(body.invoice_id))) {
          json(res, 422, { message: 'Choose an existing invoice.' });
          return;
        }
        if (resource === 'suppliers' && !body.name) {
          json(res, 422, { message: 'Supplier name is required.' });
          return;
        }

        if (req.method === 'POST') {
          const created = { id: nextId(rows()), ...body };
          if (resource === 'invoices') created.status = body.status ?? 'unpaid';
          if (resource === 'suppliers') {
            created.code = body.code || `SUP-${String(created.id).padStart(3, '0')}`;
            created.status = body.status ?? 'active';
          }
          replaceRows([created, ...rows()]);
          if (resource === 'payments') syncFinanceInvoice(created.invoice_id);
          json(res, 201, attach(created));
          return;
        }

        const previousInvoiceId = resource === 'payments' ? existing.invoice_id : null;
        const updated = { ...existing, ...body, id };
        replaceRows(rows().map((item) => item.id === id ? updated : item));
        if (resource === 'payments') {
          syncFinanceInvoice(previousInvoiceId);
          syncFinanceInvoice(updated.invoice_id);
        } else if (resource === 'invoices' && financePayments.some((payment) => payment.invoice_id === id)) {
          syncFinanceInvoice(id);
        }
        json(res, 200, attach(updated));
      });
      return;
    }

    json(res, 405, { message: `Method ${req.method} not allowed` });
    return;
  }

  const commercialRecordMatch = path.match(/^\/api\/v1\/records\/(companies|contacts|deals|sales|marketing|campaigns|channel_metrics)(?:\/(\d+))?$/);
  if (commercialRecordMatch) {
    const resource = commercialRecordMatch[1];
    const store = commercialStores[resource];
    const id = commercialRecordMatch[2] ? Number(commercialRecordMatch[2]) : null;

    if (req.method === 'GET') {
      if (id) {
        const record = store.get().find((row) => row.id === id);
        record ? json(res, 200, attachCommercial(resource, record)) : json(res, 404, { message: 'Not found' });
        return;
      }
      const records = [...store.get()].sort((a, b) => b.id - a.id).map((row) => attachCommercial(resource, row));
      json(res, 200, { data: records });
      return;
    }

    if (req.method === 'DELETE' && id) {
      const records = store.get();
      if (!records.some((row) => row.id === id)) {
        json(res, 404, { message: 'Not found' });
        return;
      }
      store.set(records.filter((row) => row.id !== id));
      json(res, 200, { deleted: true });
      return;
    }

    if (req.method === 'POST' || (req.method === 'PUT' && id)) {
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

        const records = store.get();
        const existing = id ? records.find((row) => row.id === id) : null;
        if (id && !existing) {
          json(res, 404, { message: 'Not found' });
          return;
        }

        const requiredFields = {
          companies: ['name'],
          contacts: ['name'],
          deals: ['name'],
          sales: ['animal_id', 'type', 'event_date'],
          marketing: ['title'],
          campaigns: ['name'],
          channel_metrics: ['channel', 'metric_date']
        }[resource];
        const missing = requiredFields.find((field) => body[field] === undefined || body[field] === null || body[field] === '');
        if (missing) {
          json(res, 422, { message: `${missing.replaceAll('_', ' ')} is required.` });
          return;
        }

        if (resource === 'deals' && body.company_id && !commercialCompanies.some((row) => row.id === Number(body.company_id))) {
          json(res, 422, { message: 'Choose an existing company.' });
          return;
        }
        if (resource === 'deals' && body.contact_id && !commercialContacts.some((row) => row.id === Number(body.contact_id))) {
          json(res, 422, { message: 'Choose an existing contact.' });
          return;
        }
        if (resource === 'deals' && body.pipeline_stage_id && !commercialStages.some((row) => row.id === Number(body.pipeline_stage_id))) {
          json(res, 422, { message: 'Choose an existing pipeline stage.' });
          return;
        }
        if (resource === 'sales' && !ANIMALS.some((row) => row.id === Number(body.animal_id))) {
          json(res, 422, { message: 'Choose an existing animal.' });
          return;
        }
        if (resource === 'marketing' && body.media_asset_id && !commercialMedia.some((row) => row.id === Number(body.media_asset_id))) {
          json(res, 422, { message: 'Choose an existing media asset.' });
          return;
        }

        const defaults = {
          companies: { lifecycle_stage: 'lead', status: 'active' },
          contacts: { lifecycle_stage: 'lead' },
          deals: { status: 'open' },
          sales: { type: 'sale' },
          marketing: { status: 'draft' },
          campaigns: { status: 'draft' },
          channel_metrics: { reach: 0, views: 0, followers: 0, website_visits: 0, leads: 0, engagement_rate: 0 }
        }[resource];
        let saved;
        if (req.method === 'POST') {
          saved = { id: nextId(records), ...defaults, ...body };
          store.set([saved, ...records]);
        } else {
          saved = { ...existing, ...body, id };
          store.set(records.map((row) => row.id === id ? saved : row));
        }
        json(res, req.method === 'POST' ? 201 : 200, attachCommercial(resource, saved));
      });
      return;
    }

    json(res, 405, { message: `Method ${req.method} not allowed` });
    return;
  }

  const recordMatch = path.match(/^\/api\/v1\/records\/(health|treatments|breeding|pregnancies)(?:\/(\d+))?$/);
  if (recordMatch) {
    const store = HEALTH_STORE[recordMatch[1]] ?? BREEDING_STORE[recordMatch[1]];
    const rowsOf = () => (store.rows instanceof Function ? store.rows() : store.rows);
    const write = (rows) => store.set(rows);
    const attach = (row) => (store.attach ? store.attach(row) : attachAnimal(row, ANIMALS));
    const id = recordMatch[2] ? Number(recordMatch[2]) : null;

    if (req.method === 'GET') {
      if (id) {
        const row = rowsOf().find((item) => item.id === id);
        row ? json(res, 200, attach(row)) : json(res, 404, { message: 'Not found' });
        return;
      }
      json(res, 200, { data: rowsOf().map((row) => attach(row)) });
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

      const rows = rowsOf();

      if (req.method === 'POST') {
        const created = { id: nextId(rows), ...store.defaults, ...body };
        write([created, ...rows]);
        json(res, 201, attach(created));
        return;
      }

      if (req.method === 'PUT' && id) {
        const index = rows.findIndex((item) => item.id === id);
        if (index < 0) {
          json(res, 404, { message: 'Not found' });
          return;
        }
        const next = [...rows];
        next[index] = { ...rows[index], ...body, id };
        write(next);
        json(res, 200, attach(next[index]));
        return;
      }

      if (req.method === 'DELETE' && id) {
        write(rows.filter((item) => item.id !== id));
        json(res, 200, { message: 'Deleted' });
        return;
      }

      json(res, 405, { message: `Method ${req.method} not allowed` });
    });
    return;
  }

  /* ---------------------------------------------------------------- */
  /* Additional CRUD record routes for Report Workspace & Operations   */
  /* ---------------------------------------------------------------- */
  if (req.method === 'GET' && path === '/api/v1/records/livestock') {
    json(res, 200, { data: ANIMALS });
    return;
  }
  if (req.method === 'GET' && path === '/api/v1/records/inventory') {
    const items = [
      { id: 1, item_id: 'INV-FEED-001', name: 'Dairy Mash', category: 'Feed', unit: 'kg', quantity_on_hand: 420, reorder_level: 250, average_cost: 4.2, supplier_id: 1, supplier: financeSuppliers[0], status: 'active' },
      { id: 2, item_id: 'INV-FEED-002', name: 'Hay Bales', category: 'Feed', unit: 'bale', quantity_on_hand: 90, reorder_level: 40, average_cost: 18, supplier_id: 1, supplier: financeSuppliers[0], status: 'active' },
      { id: 3, item_id: 'INV-FEED-003', name: 'Mineral Mix', category: 'Feed', unit: 'kg', quantity_on_hand: 55, reorder_level: 40, average_cost: 12, supplier_id: 1, supplier: financeSuppliers[0], status: 'active' },
      { id: 4, item_id: 'INV-MED-001', name: 'Oxytetracycline', category: 'Medicine', unit: 'vial', quantity_on_hand: 24, reorder_level: 10, average_cost: 15, supplier_id: 2, supplier: financeSuppliers[1], status: 'active' },
      { id: 5, item_id: 'INV-MED-002', name: 'Ivermectin', category: 'Medicine', unit: 'bottle', quantity_on_hand: 8, reorder_level: 12, average_cost: 22, supplier_id: 2, supplier: financeSuppliers[1], status: 'active' },
      { id: 6, item_id: 'INV-MED-003', name: 'Multivitamin', category: 'Medicine', unit: 'bottle', quantity_on_hand: 18, reorder_level: 8, average_cost: 9, supplier_id: 2, supplier: financeSuppliers[1], status: 'active' },
      { id: 7, item_id: 'INV-PPE-001', name: 'Nitrile Gloves', category: 'PPE', unit: 'box', quantity_on_hand: 4, reorder_level: 6, average_cost: 18, supplier_id: 4, supplier: financeSuppliers[3], status: 'active' },
      { id: 8, item_id: 'INV-FUL-001', name: 'Diesel', category: 'Fuel', unit: 'L', quantity_on_hand: 210, reorder_level: 150, average_cost: 1.4, supplier_id: 3, supplier: financeSuppliers[2], status: 'active' },
      { id: 9, item_id: 'INV-TOL-001', name: 'Fence Staples', category: 'Tools', unit: 'box', quantity_on_hand: 3, reorder_level: 5, average_cost: 11, supplier_id: 4, supplier: financeSuppliers[3], status: 'active' }
    ];
    json(res, 200, { data: items });
    return;
  }
  if (req.method === 'GET' && path === '/api/v1/records/procurement') {
    const requests = [
      { id: 1, request_number: 'PR-2026-001', item_name: 'Dairy Mash', category: 'Feed', quantity: 500, unit: 'kg', estimated_cost: 2100, priority: 'high', status: 'approved', requested_at: dayOffset(6), request_date: dayOffset(6), supplier: financeSuppliers[0] },
      { id: 2, request_number: 'PR-2026-002', item_name: 'Ivermectin', category: 'Medicine', quantity: 20, unit: 'bottle', estimated_cost: 440, priority: 'high', status: 'pending', requested_at: dayOffset(1), request_date: dayOffset(1), supplier: financeSuppliers[1] },
      { id: 3, request_number: 'PR-2026-003', item_name: 'Fence Staples', category: 'Tools', quantity: 10, unit: 'box', estimated_cost: 110, priority: 'normal', status: 'approved', requested_at: dayOffset(3), request_date: dayOffset(3), supplier: financeSuppliers[3] }
    ];
    json(res, 200, { data: requests });
    return;
  }
  if (req.method === 'GET' && path === '/api/v1/records/maintenance') {
    const tickets = [
      { id: 1, ticket_number: 'MT-2026-001', title: 'Water pump losing pressure', type: 'corrective', priority: 'high', status: 'open', cost: 420, reported_at: dayOffset(0) },
      { id: 2, ticket_number: 'MT-2026-002', title: 'Generator monthly test', type: 'preventive', priority: 'normal', status: 'in_progress', cost: 180, reported_at: dayOffset(1) },
      { id: 3, ticket_number: 'MT-2026-003', title: 'Tractor oil and filter', type: 'preventive', priority: 'normal', status: 'closed', cost: 650, reported_at: dayOffset(5) }
    ];
    json(res, 200, { data: tickets });
    return;
  }
  if (req.method === 'GET' && path === '/api/v1/records/employees') {
    const employees = [
      { id: 1, employee_code: 'EV-EMP-0001', name: 'Amara Okoye', role: 'owner', department: 'Ownership', type: 'full_time', status: 'active' },
      { id: 2, employee_code: 'EV-EMP-0002', name: 'Daniel Mensah', role: 'executive', department: 'Executive', type: 'full_time', status: 'active' },
      { id: 3, employee_code: 'EV-EMP-0003', name: 'Nia Boateng', role: 'operations_manager', department: 'Business Operations', type: 'full_time', status: 'active' },
      { id: 4, employee_code: 'EV-EMP-0004', name: 'Kwame Asante', role: 'farm_manager', department: 'Farm', type: 'full_time', status: 'active' },
      { id: 5, employee_code: 'EV-EMP-0005', name: 'Amina Diallo', role: 'finance', department: 'Finance', type: 'full_time', status: 'on_leave' },
      { id: 6, employee_code: 'EV-EMP-0006', name: 'Sofia Ribeiro', role: 'marketing', department: 'Marketing', type: 'full_time', status: 'active' },
      { id: 7, employee_code: 'EV-EMP-0007', name: 'James Carter', role: 'sales', department: 'Sales', type: 'full_time', status: 'active' },
      { id: 8, employee_code: 'EV-EMP-0008', name: 'Ibrahim Touré', role: 'storekeeper', department: 'Stores', type: 'full_time', status: 'active' },
      { id: 9, employee_code: 'EV-EMP-0009', name: 'Dr. Helen Nkrumah', role: 'vet', department: 'Animal Health', type: 'full_time', status: 'active' },
      { id: 10, employee_code: 'EV-EMP-0010', name: 'Kojo Ampofo', role: 'procurement', department: 'Procurement', type: 'full_time', status: 'active' },
      { id: 11, employee_code: 'EV-EMP-0011', name: 'Yaw Mensah', role: 'farm_employee', department: 'Farm', type: 'full_time', status: 'active' }
    ];
    json(res, 200, { data: employees });
    return;
  }
  if (req.method === 'GET' && path === '/api/v1/records/tasks') {
    const tasks = [
      { id: 1, title: 'Complete weekly herd count', module: 'livestock', priority: 'high', status: 'open', due_date: dayOffset(0) },
      { id: 2, title: 'Follow up Ivermectin purchase', module: 'procurement', priority: 'high', status: 'open', due_date: daysFromNow(1) },
      { id: 3, title: 'Publish goat birth content pack', module: 'marketing', priority: 'normal', status: 'in_progress', due_date: dayOffset(1) },
      { id: 4, title: 'Archive September invoices', module: 'finance', priority: 'normal', status: 'completed', due_date: dayOffset(3) }
    ];
    json(res, 200, { data: tasks });
    return;
  }

  /* ---------------------------------------------------------------- */
  /* Notification centre (mirrors NotificationController)              */
  /* ---------------------------------------------------------------- */
  const notificationSummary = () => {
    const bySeverity = {};
    const byModule = {};
    for (const alert of ALERTS) {
      bySeverity[alert.severity] = (bySeverity[alert.severity] ?? 0) + 1;
      const key = alert.module ?? 'general';
      byModule[key] = (byModule[key] ?? 0) + 1;
    }
    return {
      total: ALERTS.length,
      unread: ALERTS.filter((alert) => !alert.is_read).length,
      read: ALERTS.filter((alert) => alert.is_read).length,
      by_severity: bySeverity,
      by_module: byModule,
      last_24h: ALERTS.filter((alert) => Date.now() - new Date(alert.triggered_at).getTime() < 24 * 3600_000).length
    };
  };

  const notificationMatch = path.match(/^\/api\/v1\/notifications(?:\/(\d+)(?:\/(read|unread))?)?$/);
  if (path === '/api/v1/notifications/stats' && req.method === 'GET') {
    json(res, 200, notificationSummary());
    return;
  }
  if (path === '/api/v1/notifications/unread-count' && req.method === 'GET') {
    json(res, 200, { count: ALERTS.filter((alert) => !alert.is_read).length });
    return;
  }
  if (path === '/api/v1/notifications/read-all' && req.method === 'POST') {
    for (const alert of ALERTS) alert.is_read = true;
    json(res, 200, { updated: ALERTS.length, count: 0 });
    return;
  }
  if (path === '/api/v1/notifications' && req.method === 'DELETE') {
    const status = url.searchParams.get('status') ?? 'read';
    const before = ALERTS.length;
    const kept = ALERTS.filter((alert) => {
      if (status === 'all') return false;
      if (status === 'unread') return alert.is_read;
      return !alert.is_read;
    });
    ALERTS.length = 0;
    ALERTS.push(...kept);
    json(res, 200, { deleted: before - kept.length, count: ALERTS.filter((item) => !item.is_read).length });
    return;
  }
  if (notificationMatch) {
    const id = notificationMatch[1] ? Number(notificationMatch[1]) : null;
    const action = notificationMatch[2] ?? null;

    if (req.method === 'GET' && !id) {
      const status = url.searchParams.get('status') ?? 'all';
      const severity = url.searchParams.get('severity');
      const module = url.searchParams.get('module');
      const q = (url.searchParams.get('q') ?? '').toLowerCase();
      const from = url.searchParams.get('from');
      const to = url.searchParams.get('to');
      const perPage = Math.min(Math.max(Number(url.searchParams.get('per_page') ?? 15) || 15, 1), 100);
      const page = Math.max(Number(url.searchParams.get('page') ?? 1) || 1, 1);

      const filtered = [...ALERTS]
        .filter((alert) => status === 'all' || (status === 'unread' ? !alert.is_read : alert.is_read))
        .filter((alert) => !severity || alert.severity === severity)
        .filter((alert) => !module || alert.module === module)
        .filter((alert) => {
          if (!q) return true;
          return [alert.title, alert.message, alert.type, alert.module]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(q));
        })
        .filter((alert) => !from || alert.triggered_at.slice(0, 10) >= from)
        .filter((alert) => !to || alert.triggered_at.slice(0, 10) <= to)
        .sort((a, b) => (a.triggered_at === b.triggered_at ? b.id - a.id : a.triggered_at < b.triggered_at ? 1 : -1));

      const lastPage = Math.max(Math.ceil(filtered.length / perPage), 1);
      const start = (Math.min(page, lastPage) - 1) * perPage;
      json(res, 200, {
        data: filtered.slice(start, start + perPage),
        meta: {
          total: filtered.length,
          count: Math.min(perPage, Math.max(filtered.length - start, 0)),
          per_page: perPage,
          current_page: Math.min(page, lastPage),
          last_page: lastPage
        },
        summary: notificationSummary()
      });
      return;
    }

    if (req.method === 'POST' && !id) {
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
        if (!body.title || !String(body.title).trim()) {
          json(res, 422, { message: 'The title field is required.' });
          return;
        }
        const created = {
          id: nextAlertId++,
          type: body.type ?? 'announcement',
          severity: body.severity ?? 'info',
          title: String(body.title).trim(),
          message: body.message ?? null,
          module: body.module ?? 'general',
          is_read: false,
          triggered_at: body.triggered_at ?? new Date().toISOString()
        };
        ALERTS.unshift(created);
        json(res, 201, created);
      });
      return;
    }

    const alert = id ? ALERTS.find((item) => item.id === id) : null;
    if (id && !alert) {
      json(res, 404, { message: 'Not found' });
      return;
    }

    if (req.method === 'GET' && alert) {
      json(res, 200, alert);
      return;
    }

    if (req.method === 'PATCH' && alert && (action === 'read' || action === 'unread')) {
      alert.is_read = action === 'read';
      json(res, 200, alert);
      return;
    }

    if (req.method === 'DELETE' && alert) {
      ALERTS.splice(ALERTS.indexOf(alert), 1);
      json(res, 200, { deleted: true, count: ALERTS.filter((item) => !item.is_read).length });
      return;
    }

    json(res, 405, { message: `Method ${req.method} not allowed` });
    return;
  }

  json(res, 404, { message: `Mock API has no route for ${req.method} ${path}` });
});

server.listen(PORT, HOST, () => {
  console.log(`Mock Evolex API listening on http://${HOST}:${PORT} (dev preview only)`);
});
