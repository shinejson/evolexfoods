/**
 * Pure helpers behind the Breeding & Reproduction workspace: row normalisation,
 * filters, facets, sorting, paging, the KPI tiles and the chart models.
 *
 * Nothing here touches Angular or the DOM, so every rule is unit-testable —
 * see breeding.insights.spec.ts.
 */

import {
  BarRow,
  BarsChart,
  BirthRecord,
  BreedingColumn,
  BreedingFilters,
  BreedingFilterPatch,
  BreedingKpi,
  BreedingRecord,
  BreedingRow,
  BreedingSort,
  BreedingTab,
  BreedingTabDef,
  DonutChart,
  DonutSegment,
  EmptyState,
  FacetDef,
  FacetOption,
  FilterChip,
  GestationStage,
  Lookups,
  Outcome,
  Pagination,
  PregnancyRecord,
  RangeField,
  TimelineBucket,
  TimelineChart
} from './breeding.models';

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

/** Average gestation length in days, by species. */
export const GESTATION_DAYS: Record<string, number> = {
  goat: 150,
  sheep: 150,
  cattle: 283,
  pig: 114,
  rabbit: 31,
  poultry: 21
};

export const DEFAULT_GESTATION_DAYS = 150;
/** Anything due inside this window is worth a second look. */
export const DUE_WINDOW_DAYS = 14;
/** Days after service before an unreported pregnancy counts as failed. */
export const CONFIRMATION_WINDOW_DAYS = 35;
/** Births under this weight are flagged for the vet team. */
export const LOW_BIRTH_WEIGHT_KG = 3;
/** Width of the expected-births forecast, in weeks. */
export const FORECAST_WEEKS = 12;
/** Months of history shown on the births and cycles charts. */
export const HISTORY_MONTHS = 8;
export const DEFAULT_PAGE_SIZE_VALUE = 10;

const STAGE_LABELS: Record<GestationStage, string> = {
  early: 'Early',
  mid: 'Mid',
  late: 'Late'
};

const OUTCOME_LABELS: Record<Outcome, string> = {
  confirmed: 'Confirmed',
  awaiting: 'Awaiting scan',
  failed: 'No conception',
  none: '—'
};

const METHOD_LABELS: Record<string, string> = {
  natural: 'Natural service',
  artificial_insemination: 'Artificial insemination',
  ai: 'Artificial insemination',
  embryo_transfer: 'Embryo transfer',
  hand_mating: 'Hand mating'
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  completed: 'Completed',
  failed: 'Failed',
  planned: 'Planned',
  in_progress: 'In progress',
  alive: 'Live birth',
  healthy: 'Live birth',
  stillborn: 'Stillborn',
  aborted: 'Aborted'
};

const STATUS_RANK: Record<string, number> = {
  failed: 0,
  stillborn: 0,
  aborted: 1,
  planned: 2,
  in_progress: 3,
  active: 4,
  alive: 5,
  healthy: 5,
  completed: 6
};

const OUTCOME_RANK: Record<Outcome, number> = { failed: 0, awaiting: 1, confirmed: 2, none: 3 };
const STAGE_RANK: Record<GestationStage, number> = { early: 1, mid: 2, late: 3 };
const STAGE_ORDER: GestationStage[] = ['early', 'mid', 'late'];

/** SVG user-space geometry for the timeline chart. */
export const TIMELINE_GEOMETRY = {
  width: 760,
  height: 250,
  left: 54,
  right: 736,
  top: 28,
  baseline: 196
};

export const TABS: BreedingTabDef[] = [
  {
    id: 'pregnancies',
    label: 'Pregnancies',
    title: 'Breeding & reproduction',
    subtitle: 'Active pregnancies, gestation progress and the calving forecast.',
    endpoint: '/livestock/pregnancies',
    writeEndpoint: '/records/pregnancies',
    createLabel: 'Record pregnancy',
    rangeFields: [
      { value: 'due', label: 'Expected birth' },
      { value: 'confirmed', label: 'Confirmed' }
    ],
    columns: [
      { key: 'animal', label: 'Dam', cell: 'animal', sortable: true },
      { key: 'date', label: 'Confirmed', cell: 'date', sortable: true },
      { key: 'due', label: 'Expected birth', cell: 'due', sortable: true },
      { key: 'progress', label: 'Gestation', cell: 'progress', sortable: true },
      { key: 'counterparty', label: 'Sire', cell: 'counterparty', sortable: true },
      { key: 'status', label: 'Status', cell: 'status', sortable: true }
    ]
  },
  {
    id: 'births',
    label: 'Births',
    title: 'Calving & birth register',
    subtitle: 'Every arrival, its dam, birth weight and where it was born.',
    endpoint: '/livestock/births',
    writeEndpoint: null,
    createLabel: null,
    rangeFields: [{ value: 'birth', label: 'Birth date' }],
    columns: [
      { key: 'animal', label: 'Calf', cell: 'animal', sortable: true },
      { key: 'counterparty', label: 'Dam', cell: 'counterparty', sortable: true },
      { key: 'sex', label: 'Sex', cell: 'sex', sortable: true },
      { key: 'weight', label: 'Birth weight', cell: 'weight', sortable: true, align: 'right' },
      { key: 'date', label: 'Born', cell: 'date', sortable: true },
      { key: 'age', label: 'Age', cell: 'age', sortable: true },
      { key: 'status', label: 'Outcome', cell: 'status', sortable: true }
    ]
  },
  {
    id: 'cycles',
    label: 'Breeding cycles',
    title: 'Breeding cycles',
    subtitle: 'Services, sire pairings and whether the mating took.',
    endpoint: '/records/breeding',
    writeEndpoint: '/records/breeding',
    createLabel: 'Record breeding',
    rangeFields: [{ value: 'breeding', label: 'Service date' }],
    columns: [
      { key: 'animal', label: 'Female', cell: 'animal', sortable: true },
      { key: 'counterparty', label: 'Sire', cell: 'counterparty', sortable: true },
      { key: 'method', label: 'Method', cell: 'method', sortable: true },
      { key: 'date', label: 'Served', cell: 'date', sortable: true },
      { key: 'due', label: 'Due back', cell: 'due', sortable: true },
      { key: 'outcome', label: 'Result', cell: 'status', sortable: true },
      { key: 'status', label: 'Cycle', cell: 'text', sortable: true }
    ]
  }
];

export function tabDef(id: BreedingTab): BreedingTabDef {
  return TABS.find((tab) => tab.id === id) ?? TABS[0];
}

/* ------------------------------------------------------------------ */
/* Dates and formatting                                                */
/* ------------------------------------------------------------------ */

export function toIsoDate(value: string | Date | null | undefined): string {
  if (!value) {
    return '';
  }
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return value.slice(0, 10);
}

export function todayIso(now: Date = new Date()): string {
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function utc(iso: string): number {
  const [year, month, day] = iso.slice(0, 10).split('-').map(Number);
  return Date.UTC(year, (month ?? 1) - 1, day ?? 1);
}

/** Whole days from `fromIso` to `toIso`; negative when `toIso` is earlier. */
export function daysBetween(fromIso: string, toIsoValue: string): number {
  if (!fromIso || !toIsoValue) {
    return 0;
  }
  return Math.round((utc(toIsoValue) - utc(fromIso)) / 86_400_000);
}

export function addDays(iso: string, days: number): string {
  if (!iso) {
    return '';
  }
  return new Date(utc(iso) + days * 86_400_000).toISOString().slice(0, 10);
}

/** Monday-based start of the week. */
export function startOfWeekIso(iso: string): string {
  if (!iso) {
    return '';
  }
  const dow = new Date(utc(iso)).getUTCDay();
  return addDays(iso, dow === 0 ? -6 : -(dow - 1));
}

export function startOfMonthIso(iso: string): string {
  return iso ? `${iso.slice(0, 7)}-01` : '';
}

export function endOfMonthIso(iso: string): string {
  if (!iso) {
    return '';
  }
  const [year, month] = iso.split('-').map(Number);
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

/** First day of the month `count` months before `iso`. */
export function monthsBefore(iso: string, count: number): string {
  if (!iso) {
    return '';
  }
  const [year, month] = iso.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1 - count, 1)).toISOString().slice(0, 10);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) {
    return '—';
  }
  const [year, month, day] = iso.slice(0, 10).split('-').map(Number);
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(year, month - 1, day))
  );
}

export function formatDateShort(iso: string | null | undefined): string {
  if (!iso) {
    return '—';
  }
  const [year, month, day] = iso.slice(0, 10).split('-').map(Number);
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', timeZone: 'UTC' }).format(
    new Date(Date.UTC(year, month - 1, day))
  );
}

export function formatMonth(iso: string | null | undefined): string {
  if (!iso) {
    return '—';
  }
  const [year, month] = iso.slice(0, 10).split('-').map(Number);
  return new Intl.DateTimeFormat('en-GB', { month: 'short', year: '2-digit', timeZone: 'UTC' }).format(
    new Date(Date.UTC(year, month - 1, 1))
  );
}

export function formatMonthLong(iso: string | null | undefined): string {
  if (!iso) {
    return '—';
  }
  const [year, month] = iso.slice(0, 10).split('-').map(Number);
  return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(year, month - 1, 1))
  );
}

export function formatDays(days: number | null | undefined): string {
  if (days === null || days === undefined) {
    return '—';
  }
  const value = Math.abs(days);
  return `${value} ${value === 1 ? 'day' : 'days'}`;
}

/** "in 12 days" / "due today" / "4 days past due" / "6 days old". */
export function relativeDays(days: number | null | undefined, verb: 'due' | 'birth' | 'age' = 'due'): string {
  if (days === null || days === undefined) {
    return '—';
  }
  if (days === 0) {
    return verb === 'age' ? 'today' : verb === 'birth' ? 'born today' : 'due today';
  }
  if (days > 0) {
    return verb === 'birth' || verb === 'age' ? `${formatDays(days)} old` : `in ${formatDays(days)}`;
  }
  return verb === 'due' ? `${formatDays(days)} past due` : `${formatDays(days)} ago`;
}

export function formatWeight(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—';
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} kg`;
}

export function formatPercent(share: number): string {
  if (!Number.isFinite(share)) {
    return '0%';
  }
  return `${Math.round(share * 100)}%`;
}

export function formatRange(from: string, to: string): string {
  if (!from && !to) {
    return 'Any date';
  }
  if (!from) {
    return `Up to ${formatDate(to)}`;
  }
  if (!to) {
    return `From ${formatDate(from)}`;
  }
  return `${formatDateShort(from)} – ${formatDate(to)}`;
}

export function titleCase(value: string | null | undefined): string {
  if (!value) {
    return '';
  }
  return value
    .toString()
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function methodLabel(method: string | null | undefined): string {
  if (!method) {
    return '—';
  }
  return METHOD_LABELS[method] ?? titleCase(method);
}

export function statusLabel(status: string | null | undefined): string {
  if (!status) {
    return '—';
  }
  return STATUS_LABELS[status] ?? titleCase(status);
}

export function outcomeLabel(outcome: Outcome): string {
  return OUTCOME_LABELS[outcome];
}

export function stageLabel(stage: GestationStage | ''): string {
  return stage ? STAGE_LABELS[stage] : '—';
}

export function speciesLabel(species: string | null | undefined): string {
  return species ? titleCase(species) : '—';
}

export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : plural ?? `${singular}s`;
}

/* ------------------------------------------------------------------ */
/* Gestation maths                                                     */
/* ------------------------------------------------------------------ */

export function gestationLength(species: string | null | undefined): number {
  if (!species) {
    return DEFAULT_GESTATION_DAYS;
  }
  return GESTATION_DAYS[species.toLowerCase()] ?? DEFAULT_GESTATION_DAYS;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Early = first third, mid = second third, late = everything after. */
export function gestationStage(progress: number): GestationStage | '' {
  if (!Number.isFinite(progress) || progress <= 0) {
    return '';
  }
  if (progress < 1 / 3) {
    return 'early';
  }
  if (progress < 2 / 3) {
    return 'mid';
  }
  return 'late';
}

/**
 * Tone vocabulary shared by badges, KPI tiles and chart legends.
 * `ok` = on track, `watch` = keep an eye, `action` = needs a decision.
 */
export type Tone = 'ok' | 'watch' | 'action' | 'neutral';

export function statusTone(status: string | null | undefined, tab: BreedingTab): Tone {
  switch ((status ?? '').toLowerCase()) {
    case 'active':
      return tab === 'pregnancies' ? 'ok' : 'neutral';
    case 'completed':
    case 'alive':
    case 'healthy':
      return 'ok';
    case 'in_progress':
    case 'planned':
      return 'watch';
    case 'failed':
    case 'stillborn':
    case 'aborted':
      return 'action';
    default:
      return 'neutral';
  }
}

export function outcomeTone(outcome: Outcome): Tone {
  switch (outcome) {
    case 'confirmed':
      return 'ok';
    case 'awaiting':
      return 'watch';
    case 'failed':
      return 'action';
    default:
      return 'neutral';
  }
}

/** Overdue pregnancies and lapsed services read as urgent. */
export function dueTone(row: BreedingRow): Tone {
  if (row.daysToDue === null) {
    return 'neutral';
  }
  if (row.daysToDue < 0) {
    return 'action';
  }
  return row.daysToDue <= DUE_WINDOW_DAYS ? 'watch' : 'neutral';
}

/** Percent of the gestation completed, for the table's progress bar. */
export function progressPercent(row: BreedingRow): number {
  return Math.round(clamp(row.progress, 0, 1) * 100);
}

/* ------------------------------------------------------------------ */
/* Row normalisation                                                   */
/* ------------------------------------------------------------------ */

function locationNameOf(animal: { location?: { name: string } | null } | null | undefined): string {
  return animal?.location?.name ?? '';
}

function locationIdOf(animal: { location_id?: number | null; location?: { id: number } | null } | null | undefined): number | null {
  return animal?.location?.id ?? animal?.location_id ?? null;
}

function num(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function pregnancyRow(record: PregnancyRecord, today: string): BreedingRow {
  const dam = record.animal ?? null;
  const species = dam?.species ?? '';
  const length = gestationLength(species);
  const due = toIsoDate(record.expected_birth_date);
  const daysToDue = due ? daysBetween(today, due) : null;
  const status = (record.status ?? 'active').toLowerCase();
  const isActive = status === 'active';
  const gestationDays = daysToDue === null ? 0 : clamp(length - daysToDue, 0, length);
  const progress = isActive ? gestationDays / length : status === 'completed' ? 1 : gestationDays / length;
  const stage = isActive ? gestationStage(progress) : '';
  const outcome: Outcome = status === 'failed' ? 'failed' : 'confirmed';

  return {
    id: record.id,
    tab: 'pregnancies',
    animalId: record.animal_id,
    animalCode: dam?.animal_id ?? `Animal #${record.animal_id}`,
    species,
    breed: dam?.breed ?? '',
    locationId: locationIdOf(dam),
    locationName: locationNameOf(dam) || 'Unassigned',
    counterparty: record.breeding?.male?.animal_id ?? '',
    counterpartyLabel: 'Sire',
    title: outcomeLabel(outcome),
    subtitle: `${gestationDays} of ${length} days`,
    status,
    sex: 'female',
    date: toIsoDate(record.confirmed_date),
    dueDate: due,
    ageDays: daysBetween(toIsoDate(record.confirmed_date), today),
    daysToDue,
    gestationDays,
    gestationLength: length,
    progress,
    stage,
    method: record.breeding?.method ?? '',
    outcome,
    weight: null,
    attention: isActive && daysToDue !== null && daysToDue <= DUE_WINDOW_DAYS,
    notes: record.notes ?? null,
    raw: record
  };
}

function birthRow(record: BirthRecord, today: string): BreedingRow {
  const calf = record.animal ?? null;
  const birthDate = toIsoDate(record.birth_date);
  const weight = num(record.birth_weight);
  const sex = (record.sex ?? calf?.sex ?? '').toLowerCase();
  const status = (record.status ?? 'alive').toLowerCase();
  const dam = record.mother_animal_id ?? '';
  const lowWeight = weight !== null && weight < LOW_BIRTH_WEIGHT_KG;

  return {
    id: record.id,
    tab: 'births',
    animalId: record.animal_id,
    animalCode: calf?.animal_id ?? `Animal #${record.animal_id}`,
    species: calf?.species ?? '',
    breed: calf?.breed ?? '',
    locationId: record.location?.id ?? record.location_id ?? null,
    locationName: record.location?.name ?? 'Unassigned',
    counterparty: dam,
    counterpartyLabel: 'Dam',
    title: titleCase(sex),
    subtitle: dam ? `out of ${dam}` : 'Dam unknown',
    status,
    sex,
    date: birthDate,
    dueDate: '',
    ageDays: daysBetween(birthDate, today),
    daysToDue: null,
    gestationDays: 0,
    gestationLength: 0,
    progress: 0,
    stage: '',
    method: '',
    outcome: 'confirmed',
    weight,
    attention: lowWeight || !['alive', 'healthy'].includes(status),
    notes: record.notes ?? null,
    raw: record
  };
}

/** A cycle with no pregnancy on record closes as failed once the window lapses. */
function cycleOutcome(status: string, ageDays: number, linked: PregnancyRecord | null): Outcome {
  if (linked) {
    return (linked.status ?? 'active').toLowerCase() === 'failed' ? 'failed' : 'confirmed';
  }
  if (status === 'planned') {
    return 'awaiting';
  }
  if (status === 'failed') {
    return 'failed';
  }
  return ageDays > CONFIRMATION_WINDOW_DAYS ? 'failed' : 'awaiting';
}

function cycleRow(record: BreedingRecord, pregnancies: PregnancyRecord[], today: string): BreedingRow {
  const female = record.female ?? null;
  const male = record.male ?? null;
  const species = female?.species ?? '';
  const length = gestationLength(species);
  const served = toIsoDate(record.breeding_date);
  const status = (record.status ?? 'planned').toLowerCase();
  const ageDays = daysBetween(served, today);
  const linked = pregnancies.find((pregnancy) => pregnancy.breeding_id === record.id) ?? null;
  const outcome = cycleOutcome(status, ageDays, linked);
  const due = outcome === 'confirmed' ? toIsoDate(linked?.expected_birth_date ?? addDays(served, length)) : '';
  const daysToDue = outcome === 'confirmed' && due ? daysBetween(today, due) : null;
  const gestationDays = daysToDue === null ? clamp(ageDays, 0, length) : clamp(length - daysToDue, 0, length);
  const progress = outcome === 'confirmed' ? gestationDays / length : clamp(ageDays / length, 0, 1);

  return {
    id: record.id,
    tab: 'cycles',
    animalId: record.female_id,
    animalCode: female?.animal_id ?? `Animal #${record.female_id}`,
    species,
    breed: female?.breed ?? '',
    locationId: locationIdOf(female),
    locationName: locationNameOf(female) || 'Unassigned',
    counterparty: male?.animal_id ?? '',
    counterpartyLabel: 'Sire',
    title: methodLabel(record.method),
    subtitle: outcomeLabel(outcome),
    status,
    sex: 'female',
    date: served,
    dueDate: due,
    ageDays,
    daysToDue,
    gestationDays,
    gestationLength: length,
    progress,
    stage: outcome === 'confirmed' ? gestationStage(progress) : '',
    method: record.method ?? '',
    outcome,
    weight: null,
    attention: outcome === 'failed',
    notes: record.notes ?? null,
    raw: record
  };
}

export function buildRows(
  pregnancies: PregnancyRecord[],
  births: BirthRecord[],
  cycles: BreedingRecord[],
  lookups: Lookups,
  today: string = todayIso()
): Record<BreedingTab, BreedingRow[]> {
  const locationById = new Map(lookups.locations.map((location) => [location.id, location]));

  // Relations are not always eager loaded — fall back to the lookups for names.
  const hydrate = (row: BreedingRow): BreedingRow => {
    if (row.locationName === 'Unassigned' && row.locationId !== null) {
      const fallback = locationById.get(row.locationId);
      if (fallback) {
        return { ...row, locationName: fallback.name };
      }
    }
    return row;
  };

  return {
    pregnancies: pregnancies.map((record) => hydrate(pregnancyRow(record, today))),
    births: births.map((record) => hydrate(birthRow(record, today))),
    cycles: cycles.map((record) => hydrate(cycleRow(record, pregnancies, today)))
  };
}

/* ------------------------------------------------------------------ */
/* Sorting and paging                                                  */
/* ------------------------------------------------------------------ */

function sortValue(row: BreedingRow, key: string): string | number {
  switch (key) {
    case 'animal':
      return row.animalCode.toLowerCase();
    case 'counterparty':
      return row.counterparty.toLowerCase();
    case 'date':
      return row.date || '9999-12-31';
    case 'due':
      return row.dueDate || '9999-12-31';
    case 'age':
      return row.ageDays;
    case 'progress':
      return row.progress;
    case 'status':
      return STATUS_RANK[row.status] ?? 99;
    case 'outcome':
      return OUTCOME_RANK[row.outcome];
    case 'stage':
      return row.stage ? STAGE_RANK[row.stage] : 0;
    case 'sex':
      return row.sex;
    case 'weight':
      return row.weight ?? -1;
    case 'method':
      return row.method;
    case 'location':
      return row.locationName.toLowerCase();
    default:
      return row.date || '9999-12-31';
  }
}

export function sortRows(rows: BreedingRow[], sort: BreedingSort): BreedingRow[] {
  const factor = sort.direction === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const left = sortValue(a, sort.key);
    const right = sortValue(b, sort.key);
    if (left === right) {
      return a.animalCode.localeCompare(b.animalCode);
    }
    return left > right ? factor : -factor;
  });
}

export function paginate(rows: BreedingRow[], page: number, pageSize: number): { rows: BreedingRow[]; pagination: Pagination } {
  const size = Math.max(1, pageSize);
  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / size));
  const current = Math.min(Math.max(1, page || 1), pages);
  const start = (current - 1) * size;
  const slice = rows.slice(start, start + size);

  return {
    rows: slice,
    pagination: {
      page: current,
      pageSize: size,
      total,
      pages,
      from: total === 0 ? 0 : start + 1,
      to: start + slice.length
    }
  };
}

/* ------------------------------------------------------------------ */
/* Filters                                                             */
/* ------------------------------------------------------------------ */

export function defaultFilters(tab: BreedingTab): BreedingFilters {
  return {
    search: '',
    status: '',
    stage: [],
    outcome: '',
    method: '',
    sex: '',
    species: '',
    locationId: null,
    partner: '',
    rangeField: tabDef(tab).rangeFields[0].value,
    from: '',
    to: '',
    attentionOnly: false
  };
}

function matchesSearch(row: BreedingRow, term: string): boolean {
  return [
    row.animalCode,
    row.counterparty,
    row.species,
    row.breed,
    row.locationName,
    row.title,
    row.subtitle,
    row.method,
    row.status,
    statusLabel(row.status),
    outcomeLabel(row.outcome),
    row.notes ?? ''
  ]
    .join(' ')
    .toLowerCase()
    .includes(term);
}

function rangeValue(row: BreedingRow, field: RangeField): string {
  return field === 'due' ? row.dueDate : row.date;
}

/** `ignore` lets a chart keep offering every option of its own dimension. */
export function applyFilters(rows: BreedingRow[], filters: BreedingFilters, ignore?: keyof BreedingFilters): BreedingRow[] {
  const term = filters.search.trim().toLowerCase();

  return rows.filter((row) => {
    if (term && !matchesSearch(row, term)) {
      return false;
    }
    if (ignore !== 'status' && filters.status && row.status !== filters.status) {
      return false;
    }
    if (ignore !== 'stage' && filters.stage.length > 0 && !filters.stage.includes(row.stage)) {
      return false;
    }
    if (ignore !== 'outcome' && filters.outcome && row.outcome !== filters.outcome) {
      return false;
    }
    if (ignore !== 'method' && filters.method && row.method !== filters.method) {
      return false;
    }
    if (ignore !== 'sex' && filters.sex && row.sex !== filters.sex) {
      return false;
    }
    if (ignore !== 'species' && filters.species && row.species !== filters.species) {
      return false;
    }
    if (ignore !== 'locationId' && filters.locationId !== null && row.locationId !== filters.locationId) {
      return false;
    }
    if (ignore !== 'partner' && filters.partner && row.counterparty !== filters.partner) {
      return false;
    }
    if (ignore !== 'attentionOnly' && filters.attentionOnly && !row.attention) {
      return false;
    }
    if (ignore !== 'from' && ignore !== 'to') {
      const value = rangeValue(row, filters.rangeField);
      if (!value) {
        return false;
      }
      if (filters.from && value < filters.from) {
        return false;
      }
      if (filters.to && value > filters.to) {
        return false;
      }
    }
    return true;
  });
}

/** True when a filter still matches the tab's resting value (so it is not "applied" by the user). */
function sameValue(current: unknown, resting: unknown): boolean {
  if (Array.isArray(current) && Array.isArray(resting)) {
    return current.length === resting.length && current.every((value, index) => value === resting[index]);
  }
  return current === resting;
}

/**
 * Counts the filters the user actually applied. `resting` is the scope a tab
 * opens with (the pregnancies register rests on active pregnancies), so a
 * register shown in its default scope reports zero applied filters.
 */
export function activeFilterCount(filters: BreedingFilters, resting: BreedingFilters): number {
  let count = 0;
  if (filters.search.trim() && !sameValue(filters.search, resting.search)) {
    count += 1;
  }
  if (filters.status && !sameValue(filters.status, resting.status)) {
    count += 1;
  }
  if (filters.stage.length && !sameValue(filters.stage, resting.stage)) {
    count += 1;
  }
  if (filters.outcome && !sameValue(filters.outcome, resting.outcome)) {
    count += 1;
  }
  if (filters.method && !sameValue(filters.method, resting.method)) {
    count += 1;
  }
  if (filters.sex && !sameValue(filters.sex, resting.sex)) {
    count += 1;
  }
  if (filters.species && !sameValue(filters.species, resting.species)) {
    count += 1;
  }
  if (filters.locationId !== null && !sameValue(filters.locationId, resting.locationId)) {
    count += 1;
  }
  if (filters.partner && !sameValue(filters.partner, resting.partner)) {
    count += 1;
  }
  if ((filters.from || filters.to) && !(sameValue(filters.from, resting.from) && sameValue(filters.to, resting.to))) {
    count += 1;
  }
  if (filters.attentionOnly !== resting.attentionOnly) {
    count += 1;
  }
  return count;
}

/* ------------------------------------------------------------------ */
/* Facets                                                              */
/* ------------------------------------------------------------------ */

function countBy<T>(items: T[], pick: (item: T) => string): Map<string, number> {
  const map = new Map<string, number>();
  items.forEach((item) => {
    const key = pick(item);
    if (!key) {
      return;
    }
    map.set(key, (map.get(key) ?? 0) + 1);
  });
  return map;
}

const STATUS_VOCAB: Record<BreedingTab, string[]> = {
  pregnancies: ['active', 'completed', 'failed'],
  births: ['alive', 'stillborn'],
  cycles: ['planned', 'in_progress', 'completed', 'failed']
};

export function buildFacets(rows: BreedingRow[], tab: BreedingTab, lookups: Lookups): FacetDef[] {
  const facets: FacetDef[] = [];
  const statusCounts = countBy(rows, (row) => row.status);

  facets.push({
    key: 'status',
    label: tab === 'cycles' ? 'Cycle stage' : tab === 'births' ? 'Outcome' : 'Record',
    kind: 'segmented',
    options: [
      { value: '', label: 'All', count: rows.length },
      ...STATUS_VOCAB[tab]
        .filter((status) => statusCounts.has(status))
        .map((status) => ({ value: status, label: statusLabel(status), count: statusCounts.get(status) ?? 0 }))
    ],
    hint: 'Filter by the lifecycle value stored on the record'
  });

  if (tab === 'pregnancies') {
    const stageCounts = countBy(rows, (row) => row.stage);
    const stageOptions: FacetOption[] = STAGE_ORDER.filter((stage) => stageCounts.has(stage)).map((stage) => ({
      value: stage,
      label: stageLabel(stage),
      count: stageCounts.get(stage) ?? 0
    }));
    if (stageOptions.length > 1) {
      facets.push({
        key: 'stage',
        label: 'Trimester',
        kind: 'chips',
        options: stageOptions,
        hint: 'How far along the pregnancy is, using the species gestation length'
      });
    }
  }

  if (tab === 'cycles') {
    const outcomeCounts = countBy(rows, (row) => row.outcome);
    facets.push({
      key: 'outcome',
      label: 'Result',
      kind: 'segmented',
      options: [
        { value: '', label: 'All', count: rows.length },
        ...(['confirmed', 'awaiting', 'failed'] as Outcome[])
          .filter((outcome) => outcomeCounts.has(outcome))
          .map((outcome) => ({ value: outcome, label: outcomeLabel(outcome), count: outcomeCounts.get(outcome) ?? 0 }))
      ],
      hint: 'Whether the mating produced a confirmed pregnancy'
    });

    const methodCounts = countBy(rows, (row) => row.method);
    if (methodCounts.size > 1) {
      facets.push({
        key: 'method',
        label: 'Method',
        kind: 'chips',
        options: [...methodCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([key, count]) => ({ value: key, label: methodLabel(key), count })),
        hint: 'Natural service, artificial insemination or embryo transfer'
      });
    }
  }

  if (tab === 'births') {
    const sexCounts = countBy(rows, (row) => row.sex);
    if (sexCounts.size > 1) {
      facets.push({
        key: 'sex',
        label: 'Calf sex',
        kind: 'segmented',
        options: [
          { value: '', label: 'All', count: rows.length },
          ...['female', 'male']
            .filter((sex) => sexCounts.has(sex))
            .map((sex) => ({ value: sex, label: titleCase(sex), count: sexCounts.get(sex) ?? 0 }))
        ],
        hint: 'Sex recorded for the newborn'
      });
    }
  }

  const speciesCounts = countBy(rows, (row) => row.species);
  if (speciesCounts.size > 1) {
    facets.push({
      key: 'species',
      label: 'Species',
      kind: 'select',
      options: [...speciesCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([key, count]) => ({ value: key, label: speciesLabel(key), count })),
      hint: 'Gestation length follows the species'
    });
  }

  const locationCounts = countBy(rows, (row) => (row.locationId === null ? '' : String(row.locationId)));
  if (locationCounts.size > 1) {
    const nameById = new Map(lookups.locations.map((location) => [String(location.id), location.name]));
    facets.push({
      key: 'locationId',
      label: 'Location',
      kind: 'select',
      options: [...locationCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([key, count]) => ({ value: key, label: nameById.get(key) ?? `Location ${key}`, count })),
      hint: 'Where the dam is housed'
    });
  }

  facets.push({
    key: 'range',
    label: 'Date window',
    kind: 'date-range',
    options: [
      { value: '7', label: '7 days', count: 0 },
      { value: '30', label: '30 days', count: 0 },
      { value: '90', label: '90 days', count: 0 }
    ],
    hint: 'Applies to the date field shown in the toolbar'
  });

  const attentionCount = rows.filter((row) => row.attention).length;
  if (attentionCount > 0) {
    facets.push({
      key: 'attentionOnly',
      label: 'Needs attention',
      kind: 'toggle',
      options: [{ value: true, label: 'Needs attention', count: attentionCount }],
      hint:
        tab === 'pregnancies'
          ? `Due within ${DUE_WINDOW_DAYS} days or overdue`
          : tab === 'births'
            ? `Birth weight below ${LOW_BIRTH_WEIGHT_KG} kg, or a non-viable outcome`
            : `No conception confirmed within ${CONFIRMATION_WINDOW_DAYS} days`
    });
  }

  return facets;
}

/* ------------------------------------------------------------------ */
/* KPIs (each tile doubles as a filter)                                */
/* ------------------------------------------------------------------ */

interface KpiSpec {
  key: string;
  label: string;
  /** Formatted headline for the tile. */
  value: (rows: BreedingRow[]) => string;
  caption: (rows: BreedingRow[]) => string;
  tone: BreedingKpi['tone'];
  /** Tone once the tile has nothing to report — never alarm on an empty list. */
  zeroTone: BreedingKpi['tone'];
  filter: BreedingFilterPatch;
  match: (row: BreedingRow) => boolean;
}

function kpiSpecs(tab: BreedingTab, today: string): KpiSpec[] {
  const monthStart = startOfMonthIso(today);
  const in30 = addDays(today, -30);

  if (tab === 'pregnancies') {
    return [
      {
        key: 'active',
        label: 'Pregnant',
        value: (rows) => String(rows.filter((row) => row.status === 'active').length),
        caption: () => 'Active pregnancy records',
        tone: 'ok',
        zeroTone: 'neutral',
        filter: { status: 'active' },
        match: (row) => row.status === 'active'
      },
      {
        key: 'dueWeek',
        label: 'Due in 7 days',
        value: (rows) => String(rows.filter((row) => row.status === 'active' && row.daysToDue !== null && row.daysToDue >= 0 && row.daysToDue <= 7).length),
        caption: () => 'Calving watch list',
        tone: 'watch',
        zeroTone: 'ok',
        filter: { status: 'active', rangeField: 'due', from: today, to: addDays(today, 7) },
        match: (row) => row.status === 'active' && row.daysToDue !== null && row.daysToDue >= 0 && row.daysToDue <= 7
      },
      {
        key: 'overdue',
        label: 'Overdue',
        value: (rows) => String(rows.filter((row) => row.status === 'active' && row.daysToDue !== null && row.daysToDue < 0).length),
        caption: () => 'Past the expected date',
        tone: 'action',
        zeroTone: 'ok',
        filter: { status: 'active', rangeField: 'due', from: '', to: today },
        match: (row) => row.status === 'active' && row.daysToDue !== null && row.daysToDue < 0
      },
      {
        key: 'late',
        label: 'Final trimester',
        value: (rows) => String(rows.filter((row) => row.status === 'active' && row.stage === 'late').length),
        caption: () => 'Last third of gestation',
        tone: 'neutral',
        zeroTone: 'neutral',
        filter: { status: 'active', stage: ['late'] },
        match: (row) => row.status === 'active' && row.stage === 'late'
      }
    ];
  }

  if (tab === 'births') {
    const weighted = (rows: BreedingRow[]) => rows.filter((row) => row.weight !== null);
    const average = (rows: BreedingRow[]) => {
      const list = weighted(rows);
      return list.length ? list.reduce((sum, row) => sum + (row.weight ?? 0), 0) / list.length : 0;
    };

    return [
      {
        key: 'all',
        label: 'Births recorded',
        value: (rows) => String(rows.length),
        caption: (rows) => `${rows.filter((row) => row.sex === 'female').length} female · ${rows.filter((row) => row.sex === 'male').length} male`,
        tone: 'neutral',
        zeroTone: 'neutral',
        filter: { from: '', to: '' },
        match: () => true
      },
      {
        key: 'month',
        label: 'This month',
        value: (rows) => String(rows.filter((row) => row.date >= monthStart && row.date <= today).length),
        caption: () => formatMonthLong(today),
        tone: 'ok',
        zeroTone: 'neutral',
        filter: { rangeField: 'birth', from: monthStart, to: today },
        match: (row) => row.date >= monthStart && row.date <= today
      },
      {
        key: 'recent',
        label: 'Last 30 days',
        value: (rows) => String(rows.filter((row) => row.date >= in30 && row.date <= today).length),
        caption: () => 'Rolling month',
        tone: 'neutral',
        zeroTone: 'neutral',
        filter: { rangeField: 'birth', from: in30, to: today },
        match: (row) => row.date >= in30 && row.date <= today
      },
      {
        key: 'weight',
        label: 'Average weight',
        value: (rows) => {
          const list = weighted(rows);
          return list.length ? formatWeight(average(rows)) : '—';
        },
        caption: (rows) => {
          const flagged = rows.filter((row) => row.attention).length;
          return `${flagged} ${pluralize(flagged, 'birth')} flagged`;
        },
        tone: 'watch',
        zeroTone: 'ok',
        filter: { attentionOnly: true },
        match: (row) => row.attention
      }
    ];
  }

  const closedCycles = (row: BreedingRow) => row.status === 'completed' || row.status === 'failed' || row.outcome === 'confirmed';
  const conceptionRate = (rows: BreedingRow[]) => {
    const closed = rows.filter(closedCycles);
    return closed.length ? rows.filter((row) => row.outcome === 'confirmed').length / closed.length : 0;
  };

  return [
    {
      key: 'confirmed',
      label: 'Conceived',
      value: (rows) => String(rows.filter((row) => row.outcome === 'confirmed').length),
      caption: () => 'Mating produced a pregnancy',
      tone: 'ok',
      zeroTone: 'neutral',
      filter: { outcome: 'confirmed' },
      match: (row) => row.outcome === 'confirmed'
    },
    {
      key: 'awaiting',
      label: 'Awaiting scan',
      value: (rows) => String(rows.filter((row) => row.outcome === 'awaiting').length),
      caption: () => `Served within ${CONFIRMATION_WINDOW_DAYS} days`,
      tone: 'watch',
      zeroTone: 'neutral',
      filter: { outcome: 'awaiting' },
      match: (row) => row.outcome === 'awaiting'
    },
    {
      key: 'failed',
      label: 'Did not take',
      value: (rows) => String(rows.filter((row) => row.outcome === 'failed').length),
      caption: () => 'Re-serve or review the pairing',
      tone: 'action',
      zeroTone: 'ok',
      filter: { outcome: 'failed' },
      match: (row) => row.outcome === 'failed'
    },
    {
      key: 'rate',
      label: 'Conception rate',
      value: (rows) => (rows.filter(closedCycles).length ? formatPercent(conceptionRate(rows)) : '—'),
      caption: (rows) => `${rows.filter(closedCycles).length} closed ${pluralize(rows.filter(closedCycles).length, 'cycle')}`,
      tone: 'neutral',
      zeroTone: 'neutral',
      filter: { status: 'completed' },
      match: (row) => row.status === 'completed'
    }
  ];
}

function patchMatches(filters: BreedingFilters, patch: BreedingFilterPatch): boolean {
  return (Object.keys(patch) as (keyof BreedingFilters)[]).every((key) => {
    const expected = patch[key];
    const current = filters[key];
    if (Array.isArray(expected)) {
      return Array.isArray(current) && current.length === expected.length && expected.every((value) => (current as unknown[]).includes(value));
    }
    return current === expected;
  });
}

export function buildKpis(rows: BreedingRow[], tab: BreedingTab, filters: BreedingFilters, today: string = todayIso()): BreedingKpi[] {
  return kpiSpecs(tab, today).map((spec) => {
    const count = rows.filter(spec.match).length;
    return {
      key: spec.key,
      label: spec.label,
      value: spec.value(rows),
      caption: spec.caption(rows),
      tone: count === 0 ? spec.zeroTone : spec.tone,
      filter: spec.filter,
      active: patchMatches(filters, spec.filter)
    };
  });
}

/**
 * Applies (or clears) a KPI tile as a filter, leaving the rest untouched.
 * Re-derives whether the tile is applied so it stays correct even when handed a
 * KPI object built against older filters.
 */
export function toggleKpiFilter(filters: BreedingFilters, kpi: BreedingKpi, tab: BreedingTab, today: string = todayIso()): BreedingFilters {
  const spec = kpiSpecs(tab, today).find((item) => item.key === kpi.key);
  if (!spec) {
    return filters;
  }

  if (patchMatches(filters, spec.filter)) {
    const defaults = defaultFilters(tab);
    const next: BreedingFilters = { ...filters };
    (Object.keys(spec.filter) as (keyof BreedingFilters)[]).forEach((key) => {
      Object.assign(next, { [key]: defaults[key] });
    });
    if (!('rangeField' in spec.filter)) {
      return next;
    }
    return next;
  }

  return { ...filters, ...spec.filter };
}

export function filterChips(filters: BreedingFilters, tab: BreedingTab, lookups: Lookups, resting: BreedingFilters = defaultFilters(tab)): FilterChip[] {
  const chips: FilterChip[] = [];
  if (filters.search.trim() && !sameValue(filters.search, resting.search)) {
    chips.push({ key: 'search', label: 'Search', value: filters.search.trim() });
  }
  if (filters.status && !sameValue(filters.status, resting.status)) {
    chips.push({ key: 'status', label: 'Status', value: statusLabel(filters.status) });
  }
  if (filters.stage.length && !sameValue(filters.stage, resting.stage)) {
    chips.push({ key: 'stage', label: 'Trimester', value: filters.stage.map((stage) => stageLabel(stage as GestationStage)).join(', ') });
  }
  if (filters.outcome && !sameValue(filters.outcome, resting.outcome)) {
    chips.push({ key: 'outcome', label: 'Result', value: outcomeLabel(filters.outcome as Outcome) });
  }
  if (filters.method && !sameValue(filters.method, resting.method)) {
    chips.push({ key: 'method', label: 'Method', value: methodLabel(filters.method) });
  }
  if (filters.sex && !sameValue(filters.sex, resting.sex)) {
    chips.push({ key: 'sex', label: 'Sex', value: titleCase(filters.sex) });
  }
  if (filters.species && !sameValue(filters.species, resting.species)) {
    chips.push({ key: 'species', label: 'Species', value: speciesLabel(filters.species) });
  }
  if (filters.locationId !== null && !sameValue(filters.locationId, resting.locationId)) {
    const location = lookups.locations.find((item) => item.id === filters.locationId);
    chips.push({ key: 'locationId', label: 'Location', value: location?.name ?? `#${filters.locationId}` });
  }
  if (filters.partner && !sameValue(filters.partner, resting.partner)) {
    chips.push({ key: 'partner', label: tab === 'births' ? 'Dam' : 'Sire', value: filters.partner });
  }
  if ((filters.from || filters.to) && !(sameValue(filters.from, resting.from) && sameValue(filters.to, resting.to))) {
    const field = tabDef(tab).rangeFields.find((item) => item.value === filters.rangeField);
    chips.push({ key: 'range', label: field?.label ?? 'Date', value: formatRange(filters.from, filters.to) });
  }
  if (filters.attentionOnly && !sameValue(filters.attentionOnly, resting.attentionOnly)) {
    chips.push({ key: 'attentionOnly', label: 'Flag', value: 'Needs attention' });
  }
  return chips;
}

/** Clears one facet (used by the applied-filter chips). */
export function removeChip(filters: BreedingFilters, key: string): BreedingFilters {
  switch (key) {
    case 'search':
      return { ...filters, search: '' };
    case 'status':
      return { ...filters, status: '' };
    case 'stage':
      return { ...filters, stage: [] };
    case 'outcome':
      return { ...filters, outcome: '' };
    case 'method':
      return { ...filters, method: '' };
    case 'sex':
      return { ...filters, sex: '' };
    case 'species':
      return { ...filters, species: '' };
    case 'locationId':
      return { ...filters, locationId: null };
    case 'partner':
      return { ...filters, partner: '' };
    case 'range':
      return { ...filters, from: '', to: '' };
    case 'attentionOnly':
      return { ...filters, attentionOnly: false };
    default:
      return filters;
  }
}

export function emptyStateMessage(totalRows: number, filtered: number, tab: BreedingTab): EmptyState {
  if (totalRows === 0) {
    const noun = tab === 'pregnancies' ? 'pregnancy' : tab === 'births' ? 'birth' : 'breeding cycle';
    return {
      title: `No ${noun} records yet`,
      detail:
        tab === 'cycles'
          ? 'Record a service to start tracking conception rates and the calving forecast.'
          : `Once the team records a ${noun}, it will appear here.`
    };
  }
  if (filtered === 0) {
    return {
      title: 'No rows match these filters',
      detail: 'Widen the date window or clear a filter to see the rest of the herd.'
    };
  }
  return { title: '', detail: '' };
}

export function rowsToCsv(rows: BreedingRow[], columns: BreedingColumn[], tab: BreedingTab): string {
  const quote = (value: unknown) => `"${String(value).replace(/"/g, '""')}"`;
  const header = columns.map((column) => quote(column.label));
  const body = rows.map((row) => columns.map((column) => quote(csvCell(row, column.cell))));
  return `\uFEFF${[[`Evolex ${tab} export`, `Generated ${todayIso()}`], header, ...body].map((line) => line.join(',')).join('\n')}`;
}

function csvCell(row: BreedingRow, cell: BreedingColumn['cell']): string {
  switch (cell) {
    case 'animal':
      return `${row.animalCode} (${row.species || 'unknown'} · ${row.locationName})`;
    case 'counterparty':
      return row.counterparty || '—';
    case 'status':
      return statusLabel(row.status);
    case 'date':
      return formatDate(row.date);
    case 'due':
      return row.dueDate ? formatDate(row.dueDate) : '—';
    case 'age':
      return String(row.ageDays);
    case 'progress':
      return `${progressPercent(row)}%`;
    case 'sex':
      return row.sex ? titleCase(row.sex) : '—';
    case 'weight':
      return row.weight === null ? '—' : String(row.weight);
    case 'method':
      return methodLabel(row.method);
    default:
      return row.title;
  }
}

/* ------------------------------------------------------------------ */
/* Charts                                                              */
/* ------------------------------------------------------------------ */

interface BucketSpec {
  key: string;
  label: string;
  rangeLabel: string;
  from: string;
  to: string;
  value: number;
}

interface TimelineCopy {
  title: string;
  subtitle: string;
  primaryLabel: string;
  footnote: string;
  empty: string;
}

function buildTimeline(specs: BucketSpec[], filters: BreedingFilters, field: RangeField, copy: TimelineCopy): TimelineChart {
  const primaryTotal = specs.reduce((sum, spec) => sum + spec.value, 0);
  const max = Math.max(1, ...specs.map((spec) => spec.value));
  const { left, right, top, baseline } = TIMELINE_GEOMETRY;
  const plotWidth = right - left;
  const plotHeight = baseline - top;
  const step = plotWidth / Math.max(1, specs.length);
  const barWidth = Math.min(34, step * 0.52);

  let running = 0;
  const cumulative = specs.map((spec) => (running += spec.value));
  const cumulativeMax = Math.max(1, ...cumulative);

  const buckets: TimelineBucket[] = specs.map((spec, index) => {
    const height = (spec.value / max) * plotHeight;
    const markerY = baseline - (cumulative[index] / cumulativeMax) * plotHeight;
    const x = left + index * step + (step - barWidth) / 2;
    return {
      key: spec.key,
      label: spec.label,
      rangeLabel: spec.rangeLabel,
      from: spec.from,
      to: spec.to,
      primary: spec.value,
      secondary: cumulative[index],
      primaryDisplay: String(spec.value),
      secondaryDisplay: String(cumulative[index]),
      barX: Number(x.toFixed(2)),
      barY: Number((baseline - height).toFixed(2)),
      barWidth: Number(barWidth.toFixed(2)),
      barHeight: Number(Math.max(spec.value > 0 ? 3 : 0, height).toFixed(2)),
      markerY: Number(markerY.toFixed(2)),
      active: filters.rangeField === field && filters.from === spec.from && filters.to === spec.to
    };
  });

  const linePoints = buckets
    .map((bucket, index) => `${(left + index * step + step / 2).toFixed(2)},${bucket.markerY}`)
    .join(' ');

  const peakIndex = specs.reduce((best, spec, index) => (spec.value > specs[best].value ? index : best), 0);

  return {
    title: copy.title,
    subtitle: copy.subtitle,
    primaryLabel: copy.primaryLabel,
    secondaryLabel: 'Cumulative',
    primaryTotal,
    secondaryTotal: cumulative[cumulative.length - 1] ?? 0,
    buckets,
    linePoints,
    gridLines: [0, 0.5, 1].map((fraction) => ({
      y: Number((baseline - fraction * plotHeight).toFixed(2)),
      label: String(Math.round(max * fraction))
    })),
    field,
    peak: primaryTotal > 0 ? { label: buckets[peakIndex].rangeLabel, display: String(buckets[peakIndex].primary) } : null,
    footnote: copy.footnote,
    empty: copy.empty
  };
}

/** Expected births week by week for the next FORECAST_WEEKS weeks. */
export function buildForecastChart(rows: BreedingRow[], filters: BreedingFilters, today: string): TimelineChart {
  const weekStart = startOfWeekIso(today);
  const specs: BucketSpec[] = Array.from({ length: FORECAST_WEEKS }, (_, index) => {
    const from = addDays(weekStart, index * 7);
    const to = addDays(from, 6);
    return {
      key: from,
      label: index === 0 ? 'This wk' : `+${index}w`,
      rangeLabel: `${formatDateShort(from)} – ${formatDateShort(to)}`,
      from,
      to,
      value: rows.filter((row) => row.status === 'active' && row.dueDate >= from && row.dueDate <= to).length
    };
  });

  return buildTimeline(specs, filters, 'due', {
    title: 'Expected births',
    subtitle: `Pregnancies due in each of the next ${FORECAST_WEEKS} weeks · click a bar to filter the table`,
    primaryLabel: 'Due that week',
    footnote: 'Derived from the expected birth date on each active pregnancy record',
    empty: 'No expected birth dates fall inside the forecast window.'
  });
}

function monthSpecs(rows: BreedingRow[], today: string): BucketSpec[] {
  return Array.from({ length: HISTORY_MONTHS }, (_, index) => {
    const from = monthsBefore(today, HISTORY_MONTHS - 1 - index);
    const to = endOfMonthIso(from);
    return {
      key: from,
      label: formatMonth(from),
      rangeLabel: formatMonthLong(from),
      from,
      to,
      value: rows.filter((row) => row.date >= from && row.date <= to).length
    };
  });
}

/** Births recorded month by month over the recent past. */
export function buildBirthHistoryChart(rows: BreedingRow[], filters: BreedingFilters, today: string): TimelineChart {
  return buildTimeline(monthSpecs(rows, today), filters, 'birth', {
    title: 'Births per month',
    subtitle: `Arrivals over the last ${HISTORY_MONTHS} months · click a bar to filter`,
    primaryLabel: 'Births',
    footnote: 'Every birth on the register, grouped by birth date',
    empty: 'No births have been recorded in this window.'
  });
}

/** Services started month by month over the recent past. */
export function buildCycleHistoryChart(rows: BreedingRow[], filters: BreedingFilters, today: string): TimelineChart {
  return buildTimeline(monthSpecs(rows, today), filters, 'breeding', {
    title: 'Breeding activity',
    subtitle: `Services started per month · the line accumulates the window`,
    primaryLabel: 'Services',
    footnote: 'Groups by service date so the line reads as mating pressure over time',
    empty: 'No breeding cycles have been recorded in this window.'
  });
}

const DONUT_TONES: Record<string, string> = {
  early: '#3e6b73',
  mid: '#c4a35a',
  late: '#b45a3c',
  female: '#8c6a9c',
  male: '#3e6b73',
  confirmed: '#2f6b45',
  awaiting: '#b5812a',
  failed: '#9b2f2f',
  none: '#8b9384'
};

interface DonutCopy {
  title: string;
  subtitle: string;
  centerLabel: string;
  footnote: string;
  empty: string;
}

function donutFrom(counts: { key: string; label: string; value: number }[], isActive: (key: string) => boolean, copy: DonutCopy): DonutChart {
  const total = counts.reduce((sum, entry) => sum + entry.value, 0);
  let cursor = 0;

  const segments: DonutSegment[] = counts
    .filter((entry) => entry.value > 0)
    .map((entry) => {
      const share = total ? entry.value / total : 0;
      const start = cursor * 100;
      cursor += share;
      return {
        key: entry.key,
        label: entry.label,
        value: entry.value,
        display: String(entry.value),
        share,
        tone: DONUT_TONES[entry.key] ?? '#5d7a4d',
        active: isActive(entry.key),
        from: Number(start.toFixed(2)),
        to: Number((cursor * 100).toFixed(2))
      };
    });

  const gradient = segments.length
    ? `conic-gradient(${segments.map((segment) => `${segment.tone} ${segment.from}% ${segment.to}%`).join(', ')})`
    : 'conic-gradient(#ece4d3 0 100%)';

  return {
    title: copy.title,
    subtitle: copy.subtitle,
    gradient,
    segments,
    centerValue: String(total),
    centerLabel: copy.centerLabel,
    total,
    footnote: copy.footnote,
    empty: copy.empty
  };
}

/** Gestation-stage mix, calf sex mix or service-outcome mix — one donut per tab. */
export function buildMixChart(rows: BreedingRow[], tab: BreedingTab, filters: BreedingFilters): DonutChart {
  if (tab === 'pregnancies') {
    const inScope = applyFilters(rows, filters, 'stage').filter((row) => row.status === 'active');
    return donutFrom(
      STAGE_ORDER.map((stage) => ({
        key: stage,
        label: `${stageLabel(stage)} gestation`,
        value: inScope.filter((row) => row.stage === stage).length
      })),
      (key) => filters.stage.includes(key),
      {
        title: 'Gestation stage',
        subtitle: 'Active pregnancies by trimester · click a slice to filter',
        centerLabel: 'in calf',
        footnote: 'Trimester split follows the species gestation length',
        empty: 'No active pregnancies to plot.'
      }
    );
  }

  if (tab === 'births') {
    const inScope = applyFilters(rows, filters, 'sex');
    return donutFrom(
      [
        { key: 'female', label: 'Female calves', value: inScope.filter((row) => row.sex === 'female').length },
        { key: 'male', label: 'Male calves', value: inScope.filter((row) => row.sex === 'male').length }
      ],
      (key) => filters.sex === key,
      {
        title: 'Calf sex mix',
        subtitle: 'Sex recorded at birth · click a slice to filter',
        centerLabel: 'births',
        footnote: 'Drives replacement-heifer planning',
        empty: 'No births carry a recorded sex yet.'
      }
    );
  }

  const inScope = applyFilters(rows, filters, 'outcome');
  return donutFrom(
    [
      { key: 'confirmed', label: 'Confirmed in calf', value: inScope.filter((row) => row.outcome === 'confirmed').length },
      { key: 'awaiting', label: 'Awaiting scan', value: inScope.filter((row) => row.outcome === 'awaiting').length },
      { key: 'failed', label: 'Did not take', value: inScope.filter((row) => row.outcome === 'failed').length }
    ],
    (key) => filters.outcome === key,
    {
      title: 'Service outcome',
      subtitle: 'Did the mating take? · click a slice to filter',
      centerLabel: 'cycles',
      footnote: `A cycle with no pregnancy closes as failed after ${CONFIRMATION_WINDOW_DAYS} days`,
      empty: 'No breeding cycles to plot.'
    }
  );
}

interface BarsCopy {
  title: string;
  subtitle: string;
  footnote: string;
  empty: string;
}

function barsFrom(
  rows: BreedingRow[],
  pick: (row: BreedingRow) => { key: string; label: string } | null,
  isActive: (key: string) => boolean,
  copy: BarsCopy
): BarsChart {
  const groups = new Map<string, { label: string; value: number }>();
  rows.forEach((row) => {
    const picked = pick(row);
    if (!picked) {
      return;
    }
    const current = groups.get(picked.key);
    if (current) {
      current.value += 1;
      return;
    }
    groups.set(picked.key, { label: picked.label, value: 1 });
  });

  const entries = [...groups.entries()].sort((a, b) => b[1].value - a[1].value || a[1].label.localeCompare(b[1].label));
  const max = Math.max(1, ...entries.map(([, entry]) => entry.value));
  const total = entries.reduce((sum, [, entry]) => sum + entry.value, 0);

  const bars: BarRow[] = entries.slice(0, 6).map(([key, entry]) => ({
    key,
    label: entry.label,
    value: entry.value,
    display: String(entry.value),
    share: entry.value / max,
    tone: 'primary',
    active: isActive(key),
    meta: `${formatPercent(total ? entry.value / total : 0)} of ${total}`
  }));

  return {
    title: copy.title,
    subtitle: copy.subtitle,
    rows: bars,
    total,
    unit: copy.title.toLowerCase(),
    footnote: copy.footnote,
    empty: copy.empty
  };
}

/** Where breeding activity sits — grouped by paddock. */
export function buildLocationChart(rows: BreedingRow[], tab: BreedingTab, filters: BreedingFilters): BarsChart {
  const inScope = applyFilters(rows, filters, 'locationId');
  const noun = tab === 'pregnancies' ? 'Pregnancies' : tab === 'births' ? 'Births' : 'Services';

  return barsFrom(
    inScope,
    (row) => ({ key: String(row.locationId ?? 0), label: row.locationName || 'Unassigned' }),
    (key) => filters.locationId === Number(key),
    {
      title: `${noun} by location`,
      subtitle: 'Click a bar to narrow the table to that paddock',
      footnote: `Grouped from the ${inScope.length} ${pluralize(inScope.length, 'row')} in scope`,
      empty: 'No location data on these records yet.'
    }
  );
}

/** Top sires — or the dams with the most births. */
export function buildPartnerChart(rows: BreedingRow[], tab: BreedingTab, filters: BreedingFilters): BarsChart {
  const inScope = applyFilters(rows, filters, 'partner');

  return barsFrom(
    inScope,
    (row) => (row.counterparty ? { key: row.counterparty, label: row.counterparty } : null),
    (key) => filters.partner === key,
    {
      title: tab === 'births' ? 'Busiest dams' : 'Most used sires',
      subtitle: 'Click a bar to inspect that pairing',
      footnote: tab === 'births' ? 'Dams ranked by recorded births' : 'Sires ranked by services in scope',
      empty: 'No sire or dam is recorded on these rows yet.'
    }
  );
}
