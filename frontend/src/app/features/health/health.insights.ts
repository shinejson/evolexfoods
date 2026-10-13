import {
  FacetDef,
  HealthFilterPatch,
  FacetOption,
  HealthColumn,
  HealthFilters,
  HealthKpi,
  HealthRecord,
  HealthRow,
  HealthSort,
  HealthTab,
  HealthTabDef,
  Lookups,
  Pagination,
  Treatment
} from './health.models';

/**
 * Pure logic for the Animal Health workspace: normalising API payloads into one
 * row shape, deriving filter facets and KPIs from real data, and filtering,
 * sorting and paging them. No Angular, no DOM — all unit tested.
 */

/** Cases open at least this long are flagged as ageing. */
export const AGEING_DAYS = 7;

const SEVERITY_ORDER: Record<string, number> = { critical: 4, high: 3, moderate: 2, low: 1 };

const DEFAULT_PAGE_SIZE = 10;

export const TABS: HealthTabDef[] = [
  {
    id: 'cases',
    label: 'Cases',
    title: 'Animal health',
    subtitle: 'Open and closed clinical cases, and the treatments that follow them.',
    endpoint: '/records/health',
    createLabel: 'Log a case',
    columns: [
      { key: 'animal', label: 'Animal', cell: 'animal', sortable: true },
      { key: 'condition', label: 'Condition', cell: 'text', sortable: true },
      { key: 'severity', label: 'Severity', cell: 'severity', sortable: true },
      { key: 'date', label: 'Recorded', cell: 'date', sortable: true },
      { key: 'age', label: 'Age', cell: 'age', sortable: true, align: 'right' },
      { key: 'status', label: 'Status', cell: 'status', sortable: true }
    ]
  },
  {
    id: 'treatments',
    label: 'Treatments',
    title: 'Treatments',
    subtitle: 'Medication and care courses, from first dose to completion.',
    endpoint: '/records/treatments',
    createLabel: 'Log a treatment',
    columns: [
      { key: 'animal', label: 'Animal', cell: 'animal', sortable: true },
      { key: 'condition', label: 'Treatment', cell: 'text', sortable: true },
      { key: 'medicine', label: 'Medicine', cell: 'medicine', sortable: true },
      { key: 'date', label: 'Started', cell: 'date', sortable: true },
      { key: 'age', label: 'Duration', cell: 'age', sortable: true, align: 'right' },
      { key: 'status', label: 'Status', cell: 'status', sortable: true }
    ]
  }
];

export function tabDef(id: HealthTab): HealthTabDef {
  return TABS.find((tab) => tab.id === id) ?? TABS[0];
}

/* ------------------------------------------------------------------ */
/* Formatting helpers                                                  */
/* ------------------------------------------------------------------ */

/** Date-only ISO (`2026-10-13`) so comparisons never drift across timezones. */
export function toIsoDate(value: string | Date | null | undefined): string {
  if (!value) {
    return '';
  }
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return String(value).slice(0, 10);
}

export function todayIso(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/** Whole days between two date-only ISO strings (UTC arithmetic, no DST traps). */
export function daysBetween(fromIso: string, toIsoValue: string): number {
  if (!fromIso || !toIsoValue) {
    return 0;
  }
  const from = Date.UTC(Number(fromIso.slice(0, 4)), Number(fromIso.slice(5, 7)) - 1, Number(fromIso.slice(8, 10)));
  const to = Date.UTC(Number(toIsoValue.slice(0, 4)), Number(toIsoValue.slice(5, 7)) - 1, Number(toIsoValue.slice(8, 10)));
  return Math.round((to - from) / 86_400_000);
}

export function formatDate(iso: string | null | undefined): string {
  const day = toIsoDate(iso);
  if (!day) {
    return '—';
  }
  const date = new Date(`${day}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateShort(iso: string | null | undefined): string {
  const day = toIsoDate(iso);
  if (!day) {
    return '—';
  }
  const date = new Date(`${day}T00:00:00`);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

export function formatAge(days: number): string {
  if (days <= 0) {
    return 'today';
  }
  if (days === 1) {
    return '1 day';
  }
  if (days < 30) {
    return `${days} days`;
  }
  const months = Math.round(days / 30);
  return months === 1 ? '1 month' : `${months} months`;
}

export function titleCase(value: string | null | undefined): string {
  if (!value) {
    return '—';
  }
  return value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, ' ');
}

export function severityRank(severity: string | null | undefined): number {
  return SEVERITY_ORDER[(severity ?? '').toLowerCase()] ?? 0;
}

export function severityTone(severity: string | null | undefined): 'action' | 'watch' | 'neutral' {
  const rank = severityRank(severity);
  if (rank >= 3) {
    return 'action';
  }
  return rank === 2 ? 'watch' : 'neutral';
}

export function statusTone(status: string | null | undefined, tab: HealthTab): 'action' | 'watch' | 'ok' {
  const value = (status ?? '').toLowerCase();
  if (tab === 'cases') {
    return value === 'open' ? 'action' : 'ok';
  }
  return value === 'active' ? 'watch' : 'ok';
}

/* ------------------------------------------------------------------ */
/* Normalising rows                                                    */
/* ------------------------------------------------------------------ */

export function buildRows(
  records: HealthRecord[],
  treatments: Treatment[],
  lookups: Lookups,
  today: string = todayIso()
): Record<HealthTab, HealthRow[]> {
  const locationNames = new Map<number, string>();
  lookups.locations?.forEach((location) => locationNames.set(location.id, location.name));

  const toRow = (item: HealthRecord | Treatment, tab: HealthTab): HealthRow => {
    const animal = item.animal ?? null;
    const isTreatment = tab === 'treatments';
    const treatment = item as Treatment;
    const record = item as HealthRecord;
    const date = toIsoDate(isTreatment ? treatment.start_date : record.recorded_date);
    const locationId = animal?.location_id ?? animal?.location?.id ?? null;

    return {
      id: item.id,
      tab,
      animalId: item.animal_id,
      animalCode: animal?.animal_id ?? `#${item.animal_id}`,
      species: animal?.species ?? '',
      locationId: locationId ?? null,
      locationName: animal?.location?.name ?? (locationId ? locationNames.get(locationId) ?? 'Unassigned' : 'Unassigned'),
      title: isTreatment ? treatment.treatment_type : record.condition,
      subtitle: isTreatment ? [treatment.medicine, treatment.dosage].filter(Boolean).join(' · ') : '',
      severity: isTreatment ? null : record.severity,
      status: item.status ?? (isTreatment ? 'active' : 'open'),
      date,
      ageDays: Math.max(0, daysBetween(date, today)),
      isOpen: isTreatment ? (item.status ?? '') === 'active' : (item.status ?? '') === 'open',
      notes: item.notes ?? null,
      raw: item
    };
  };

  return {
    cases: (records ?? []).map((record) => toRow(record, 'cases')).sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id),
    treatments: (treatments ?? [])
      .map((treatment) => toRow(treatment, 'treatments'))
      .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
  };
}

/* ------------------------------------------------------------------ */
/* Facets                                                              */
/* ------------------------------------------------------------------ */

function countBy<T>(items: T[], pick: (item: T) => string): Map<string, number> {
  const counts = new Map<string, number>();
  items.forEach((item) => {
    const key = pick(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  return counts;
}

/**
 * Filter controls are derived from the data actually present, so a new severity
 * or condition is never invisible and empty options never appear.
 */
export function buildFacets(rows: HealthRow[], tab: HealthTab, lookups: Lookups): FacetDef[] {
  const statusOrder = tab === 'cases' ? ['open', 'closed'] : ['active', 'completed'];
  const statusCounts = countBy(rows, (row) => (row.status || '').toLowerCase());

  const statusOptions: FacetOption[] = [
    { value: '', label: 'All', count: rows.length },
    ...statusOrder
      .filter((status) => statusCounts.has(status))
      .map((status) => ({ value: status, label: titleCase(status), count: statusCounts.get(status) ?? 0 }))
  ];

  const facets: FacetDef[] = [
    { key: 'status', label: 'Status', kind: 'segmented', options: statusOptions, hint: 'Filter by record status' }
  ];

  if (tab === 'cases') {
    const severityCounts = countBy(rows, (row) => (row.severity || '').toLowerCase());
    const severityOptions = Object.keys(SEVERITY_ORDER)
      .filter((severity) => severityCounts.has(severity))
      .sort((a, b) => SEVERITY_ORDER[b] - SEVERITY_ORDER[a])
      .map((severity) => ({ value: severity, label: titleCase(severity), count: severityCounts.get(severity) ?? 0 }));

    if (severityOptions.length) {
      facets.push({
        key: 'severity',
        label: 'Severity',
        kind: 'chips',
        options: severityOptions,
        hint: 'Select one or more severities'
      });
    }
  }

  const titleCounts = countBy(rows, (row) => row.title || '—');
  if (titleCounts.size > 1) {
    facets.push({
      key: 'condition',
      label: tab === 'cases' ? 'Condition' : 'Treatment type',
      kind: 'select',
      options: [...titleCounts.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([value, count]) => ({ value, label: value, count })),
      hint: 'Most frequent first'
    });
  }

  const locationCounts = new Map<number, number>();
  rows.forEach((row) => {
    if (row.locationId !== null) {
      locationCounts.set(row.locationId, (locationCounts.get(row.locationId) ?? 0) + 1);
    }
  });

  if (locationCounts.size > 1) {
    facets.push({
      key: 'locationId',
      label: 'Location',
      kind: 'select',
      options: (lookups.locations ?? [])
        .filter((location) => locationCounts.has(location.id))
        .map((location) => ({ value: location.id, label: location.name, count: locationCounts.get(location.id) ?? 0 })),
      hint: 'Where the animal is housed'
    });
  }

  facets.push({
    key: 'range',
    label: tab === 'cases' ? 'Recorded' : 'Started',
    kind: 'date-range',
    options: [
      { value: '7', label: '7 days', count: 0 },
      { value: '30', label: '30 days', count: 0 },
      { value: '90', label: '90 days', count: 0 }
    ],
    hint: 'Date window'
  });

  const ageingCount = rows.filter((row) => row.isOpen && row.ageDays >= AGEING_DAYS).length;
  if (ageingCount > 0) {
    facets.push({
      key: 'ageingOnly',
      label: tab === 'cases' ? `Open ${AGEING_DAYS}+ days` : `Running ${AGEING_DAYS}+ days`,
      kind: 'toggle',
      options: [{ value: true, label: `${ageingCount} records`, count: ageingCount }],
      hint: `Beyond the ${AGEING_DAYS}-day review threshold`
    });
  }

  return facets;
}

/* ------------------------------------------------------------------ */
/* Filtering, sorting, paging                                          */
/* ------------------------------------------------------------------ */

export function defaultFilters(): HealthFilters {
  return { search: '', status: '', severity: [], condition: '', locationId: null, from: '', to: '', ageingOnly: false };
}

function matchesSearch(row: HealthRow, term: string): boolean {
  return [row.animalCode, row.species, row.locationName, row.title, row.subtitle, row.status, row.notes ?? '']
    .join(' ')
    .toLowerCase()
    .includes(term);
}

export function applyFilters(rows: HealthRow[], filters: HealthFilters): HealthRow[] {
  const term = filters.search.trim().toLowerCase();

  return rows.filter((row) => {
    if (term && !matchesSearch(row, term)) {
      return false;
    }
    if (filters.status && row.status.toLowerCase() !== filters.status) {
      return false;
    }
    if (filters.severity.length) {
      if (!filters.severity.includes((row.severity ?? '').toLowerCase())) {
        return false;
      }
    }
    if (filters.condition && row.title !== filters.condition) {
      return false;
    }
    if (filters.locationId !== null && row.locationId !== filters.locationId) {
      return false;
    }
    if (filters.from && row.date < filters.from) {
      return false;
    }
    if (filters.to && row.date > filters.to) {
      return false;
    }
    if (filters.ageingOnly && !(row.isOpen && row.ageDays >= AGEING_DAYS)) {
      return false;
    }
    return true;
  });
}

function sortValue(row: HealthRow, key: string): string | number {
  switch (key) {
    case 'animal':
      return row.animalCode;
    case 'severity':
      return severityRank(row.severity);
    case 'date':
      return row.date;
    case 'age':
      return row.ageDays;
    case 'status':
      return row.status.toLowerCase();
    case 'medicine':
      return row.subtitle.toLowerCase();
    default:
      return row.title.toLowerCase();
  }
}

export function sortRows(rows: HealthRow[], sort: HealthSort): HealthRow[] {
  const factor = sort.direction === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const left = sortValue(a, sort.key);
    const right = sortValue(b, sort.key);
    if (typeof left === 'number' && typeof right === 'number') {
      return (left - right) * factor || b.id - a.id;
    }
    return String(left).localeCompare(String(right)) * factor || b.id - a.id;
  });
}

export function paginate(rows: HealthRow[], page: number, pageSize: number): { rows: HealthRow[]; pagination: Pagination } {
  const size = Math.max(1, pageSize);
  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / size));
  const current = Math.min(Math.max(1, page), pages);
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
/* KPIs (each tile doubles as a filter)                                */
/* ------------------------------------------------------------------ */

interface KpiSpec {
  key: string;
  label: string;
  caption: (count: number) => string;
  tone: HealthKpi['tone'];
  filter: HealthFilterPatch;
  match: (row: HealthRow) => boolean;
}

function kpiSpecs(tab: HealthTab): KpiSpec[] {
  if (tab === 'cases') {
    return [
      {
        key: 'open',
        label: 'Open cases',
        caption: (count) => (count === 0 ? 'Nothing outstanding' : `${count} awaiting closure`),
        tone: 'action',
        filter: { status: 'open' },
        match: (row) => row.status.toLowerCase() === 'open'
      },
      {
        key: 'ageing',
        label: `Open ${AGEING_DAYS}+ days`,
        caption: (count) => (count === 0 ? 'All reviewed on time' : 'Beyond the review threshold'),
        tone: 'watch',
        filter: { status: 'open', ageingOnly: true },
        match: (row) => row.status.toLowerCase() === 'open' && row.ageDays >= AGEING_DAYS
      },
      {
        key: 'severe',
        label: 'High or critical',
        caption: (count) => (count === 0 ? 'No severe cases' : 'Needs clinical escalation'),
        tone: 'action',
        filter: { severity: ['high', 'critical'] },
        match: (row) => severityRank(row.severity) >= 3
      },
      {
        key: 'closed30',
        label: 'Closed (30 days)',
        caption: (count) => (count === 0 ? 'No closures yet' : 'Recovered and closed'),
        tone: 'ok',
        filter: { status: 'closed', range: '30' },
        match: (row) => row.status.toLowerCase() === 'closed' && row.ageDays <= 30
      }
    ];
  }

  return [
    {
      key: 'active',
      label: 'Active courses',
      caption: (count) => (count === 0 ? 'Nothing in progress' : 'Currently being administered'),
      tone: 'watch',
      filter: { status: 'active' },
      match: (row) => row.status.toLowerCase() === 'active'
    },
    {
      key: 'long',
      label: `Running ${AGEING_DAYS}+ days`,
      caption: (count) => (count === 0 ? 'All within the window' : 'Review whether to extend'),
      tone: 'action',
      filter: { status: 'active', ageingOnly: true },
      match: (row) => row.status.toLowerCase() === 'active' && row.ageDays >= AGEING_DAYS
    },
    {
      key: 'week',
      label: 'Started this week',
      caption: (count) => (count === 0 ? 'None started' : 'In the last 7 days'),
      tone: 'neutral',
      filter: { range: '7' },
      match: (row) => row.ageDays <= 7
    },
    {
      key: 'completed',
      label: 'Completed',
      caption: (count) => (count === 0 ? 'No completed courses' : 'Closed out'),
      tone: 'ok',
      filter: { status: 'completed' },
      match: (row) => row.status.toLowerCase() === 'completed'
    }
  ];
}

function patchValueMatches(filters: HealthFilters, patch: HealthFilterPatch, key: keyof HealthFilters | 'range'): boolean {
  if (key === 'range') {
    // `range` is a preset that writes from/to; it counts as active only when the
    // window still matches the preset exactly.
    const days = Number(patch.range);
    const today = todayIso();
    const expectedFrom = new Date(new Date(`${today}T00:00:00`).getTime() - days * 86_400_000).toISOString().slice(0, 10);
    return filters.from === expectedFrom && filters.to === today;
  }
  const current = filters[key];
  const expected = patch[key];
  if (Array.isArray(expected)) {
    return Array.isArray(current) && current.length === expected.length && expected.every((value) => current.includes(value));
  }
  return current === expected;
}

export function buildKpis(rows: HealthRow[], tab: HealthTab, filters: HealthFilters, today: string = todayIso()): HealthKpi[] {
  const recent = rows.map((row) => ({ ...row, ageDays: Math.max(0, daysBetween(row.date, today)) }));

  return kpiSpecs(tab).map((spec) => {
    const patchKeys = Object.keys(spec.filter) as Array<keyof HealthFilters | 'range'>;
    const active = patchKeys.every((key) => patchValueMatches(filters, spec.filter, key));
    const count = recent.filter(spec.match).length;

    return {
      key: spec.key,
      label: spec.label,
      value: count,
      caption: spec.caption(count),
      // A tile only carries its alarm colour when it has something to say.
      tone: count === 0 && spec.tone !== 'neutral' ? 'ok' : spec.tone,
      filter: spec.filter,
      active
    };
  });
}

/**
 * Applies (or clears) a KPI tile as a filter, leaving the rest untouched.
 *
 * The toggle re-derives whether the KPI is currently applied from `filters`
 * rather than trusting `kpi.active`, so it stays correct even when handed a
 * KPI object built against older filters.
 *
 * Clearing resets every facet the tile owns (a tile is a whole view, so
 * "Open 7+ days" clears both the status and the ageing facets) — one click back
 * to the full table, which is what the tile's own tooltip promises.
 */
export function toggleKpiFilter(filters: HealthFilters, kpi: HealthKpi): HealthFilters {
  const keys = Object.keys(kpi.filter) as Array<keyof HealthFilters | 'range'>;
  const isApplied = keys.length > 0 && keys.every((key) => patchValueMatches(filters, kpi.filter, key));

  if (isApplied) {
    const next: HealthFilters = { ...filters };
    keys.forEach((key) => {
      if (key === 'range') {
        next.from = '';
        next.to = '';
      } else if (key === 'severity') {
        next.severity = [];
      } else if (key === 'locationId') {
        next.locationId = null;
      } else if (key === 'ageingOnly') {
        next.ageingOnly = false;
      } else {
        (next[key] as string) = '';
      }
    });
    return next;
  }

  const { range, ...rest } = kpi.filter;
  const next: HealthFilters = { ...filters, ...rest };
  if (range) {
    const days = Number(range);
    next.to = todayIso();
    next.from = new Date(new Date(`${next.to}T00:00:00`).getTime() - days * 86_400_000).toISOString().slice(0, 10);
  }
  return next;
}

/** Number of active facets, for the filter bar badge. */
export function activeFilterCount(filters: HealthFilters, defaults: HealthFilters = defaultFilters()): number {
  let count = 0;
  if (filters.search.trim()) {
    count += 1;
  }
  if (filters.status !== defaults.status) {
    count += 1;
  }
  if (filters.severity.length) {
    count += 1;
  }
  if (filters.condition) {
    count += 1;
  }
  if (filters.locationId !== null) {
    count += 1;
  }
  if (filters.from || filters.to) {
    count += 1;
  }
  if (filters.ageingOnly) {
    count += 1;
  }
  return count;
}

export interface FilterChip {
  key: string;
  label: string;
  value: string;
}

/** Human-readable summary of what is currently filtered, for the chip row. */
export function filterChips(filters: HealthFilters, lookups: Lookups): FilterChip[] {
  const chips: FilterChip[] = [];

  if (filters.search.trim()) {
    chips.push({ key: 'search', label: 'Search', value: filters.search.trim() });
  }
  if (filters.status) {
    chips.push({ key: 'status', label: 'Status', value: titleCase(filters.status) });
  }
  if (filters.severity.length) {
    chips.push({ key: 'severity', label: 'Severity', value: filters.severity.map(titleCase).join(', ') });
  }
  if (filters.condition) {
    chips.push({ key: 'condition', label: 'Type', value: filters.condition });
  }
  if (filters.locationId !== null) {
    const location = (lookups.locations ?? []).find((item) => item.id === filters.locationId);
    chips.push({ key: 'locationId', label: 'Location', value: location?.name ?? `#${filters.locationId}` });
  }
  if (filters.from || filters.to) {
    chips.push({
      key: 'range',
      label: 'Dates',
      value: `${filters.from ? formatDateShort(filters.from) : 'Any'} → ${filters.to ? formatDateShort(filters.to) : 'today'}`
    });
  }
  if (filters.ageingOnly) {
    chips.push({ key: 'ageingOnly', label: 'Ageing', value: `${AGEING_DAYS}+ days` });
  }

  return chips;
}

/* ------------------------------------------------------------------ */
/* Export                                                             */
/* ------------------------------------------------------------------ */

export function rowsToCsv(rows: HealthRow[], columns: HealthColumn[], tab: HealthTab): string {
  const escape = (value: string) => `"${(value ?? '').replace(/"/g, '""')}"`;
  const header = ['Animal', 'Species', ...columns.filter((column) => column.key !== 'animal').map((column) => column.label), 'Location', 'Notes'];

  const lines = [`Evolex ${tabDef(tab).label} export`, `Rows,${rows.length}`, '', header.map(escape).join(',')];

  rows.forEach((row) => {
    const cells =
      tab === 'cases'
        ? [row.title, row.severity ? titleCase(row.severity) : '—', row.date, String(row.ageDays), titleCase(row.status)]
        : [row.title, row.subtitle || '—', row.date, String(row.ageDays), titleCase(row.status)];
    lines.push([row.animalCode, row.species || '—', ...cells, row.locationName, row.notes ?? ''].map(escape).join(','));
  });

  // BOM so Excel reads the UTF-8 headers and dashes correctly.
  return `\uFEFF${lines.join('\n')}`;
}

export function emptyStateMessage(total: number, filtered: number, tab: HealthTab): { title: string; detail: string } {
  if (total === 0) {
    return {
      title: tab === 'cases' ? 'No health cases recorded yet' : 'No treatments recorded yet',
      detail:
        tab === 'cases'
          ? 'Log the first case when an animal shows symptoms — severity and follow-up drive the veterinary calendar.'
          : 'Treatments are logged against a case or an animal, and feed the active-course counters.'
    };
  }
  if (filtered === 0) {
    return {
      title: 'No records match these filters',
      detail: `${total} ${tab === 'cases' ? 'cases' : 'treatments'} exist in total. Clear the filters to see them again.`
    };
  }
  return { title: '', detail: '' };
}

export const DEFAULT_PAGE_SIZE_VALUE = DEFAULT_PAGE_SIZE;
