import { HealthFilters, HealthRecord, Lookups, Treatment } from './health.models';
import {
  AGEING_DAYS,
  activeFilterCount,
  applyFilters,
  buildFacets,
  buildKpis,
  buildRows,
  defaultFilters,
  daysBetween,
  emptyStateMessage,
  filterChips,
  formatAge,
  formatDate,
  paginate,
  rowsToCsv,
  severityTone,
  sortRows,
  statusTone,
  tabDef,
  titleCase,
  toIsoDate,
  toggleKpiFilter
} from './health.insights';

const TODAY = '2026-10-13';

const LOOKUPS: Lookups = {
  locations: [
    { id: 1, name: 'North Paddock', code: 'PAD-A' },
    { id: 2, name: 'Maternity Barn', code: 'BRN-1' }
  ],
  animals: []
};

function records(): HealthRecord[] {
  return [
    {
      id: 1,
      animal_id: 10,
      recorded_date: '2026-10-11',
      condition: 'Mastitis',
      severity: 'high',
      status: 'open',
      notes: 'Under observation',
      animal: { id: 10, animal_id: 'EV-GT-000001', species: 'goat', location_id: 1 }
    },
    {
      id: 2,
      animal_id: 11,
      recorded_date: '2026-09-20',
      condition: 'Lameness',
      severity: 'low',
      status: 'open',
      animal: { id: 11, animal_id: 'EV-SH-000002', species: 'sheep', location_id: 2 }
    },
    {
      id: 3,
      animal_id: 12,
      recorded_date: '2026-10-01',
      condition: 'Mastitis',
      severity: 'critical',
      status: 'closed',
      animal: { id: 12, animal_id: 'EV-CT-000003', species: 'cattle', location_id: 2 }
    }
  ];
}

function treatmentRows(): Treatment[] {
  return [
    {
      id: 5,
      animal_id: 10,
      start_date: '2026-10-12',
      treatment_type: 'Medication',
      medicine: 'Oxytetracycline',
      dosage: '10ml IM',
      status: 'active',
      animal: { id: 10, animal_id: 'EV-GT-000001', species: 'goat', location_id: 1 }
    },
    {
      id: 6,
      animal_id: 11,
      start_date: '2026-08-01',
      treatment_type: 'Wound care',
      medicine: 'Iodine',
      dosage: 'topical',
      status: 'completed',
      animal: { id: 11, animal_id: 'EV-SH-000002', species: 'sheep', location_id: 2 }
    }
  ];
}

function rows() {
  return buildRows(records(), treatmentRows(), LOOKUPS, TODAY);
}

function withFilters(patch: Partial<HealthFilters>): HealthFilters {
  return { ...defaultFilters(), ...patch };
}

describe('health insights', () => {
  describe('formatting and dates', () => {
    it('normalises dates to day precision', () => {
      expect(toIsoDate('2026-10-13T09:31:00+00:00')).toBe('2026-10-13');
      expect(toIsoDate('')).toBe('');
      expect(toIsoDate(null)).toBe('');
    });

    it('counts whole days without timezone drift', () => {
      expect(daysBetween('2026-10-13', '2026-10-13')).toBe(0);
      expect(daysBetween('2026-10-06', '2026-10-13')).toBe(7);
      expect(daysBetween('2026-09-13', '2026-10-13')).toBe(30);
    });

    it('renders dates and ages', () => {
      expect(formatDate('2026-10-13')).toBe('13 Oct 2026');
      expect(formatDate(null)).toBe('—');
      expect(formatAge(0)).toBe('today');
      expect(formatAge(1)).toBe('1 day');
      expect(formatAge(9)).toBe('9 days');
      expect(formatAge(90)).toBe('3 months');
    });

    it('title-cases statuses and severities', () => {
      expect(titleCase('open')).toBe('Open');
      expect(titleCase('in_progress')).toBe('In progress');
      expect(titleCase(null)).toBe('—');
    });

    it('maps severity and status to tones', () => {
      expect(severityTone('critical')).toBe('action');
      expect(severityTone('high')).toBe('action');
      expect(severityTone('moderate')).toBe('watch');
      expect(severityTone('low')).toBe('neutral');
      expect(statusTone('open', 'cases')).toBe('action');
      expect(statusTone('closed', 'cases')).toBe('ok');
      expect(statusTone('active', 'treatments')).toBe('watch');
      expect(statusTone('completed', 'treatments')).toBe('ok');
    });
  });

  describe('row normalisation', () => {
    it('builds one row shape for cases and treatments', () => {
      const { cases, treatments } = rows();

      expect(cases.map((row) => row.id)).toEqual([1, 3, 2]);
      expect(cases[0].animalCode).toBe('EV-GT-000001');
      expect(cases[0].locationName).toBe('North Paddock');
      expect(cases[0].title).toBe('Mastitis');
      expect(cases[0].ageDays).toBe(2);
      expect(cases[0].isOpen).toBeTrue();

      expect(treatments[0].title).toBe('Medication');
      expect(treatments[0].subtitle).toBe('Oxytetracycline · 10ml IM');
      expect(treatments[0].severity).toBeNull();
      expect(treatments[1].isOpen).toBeFalse();
    });

    it('resolves the location name from the lookups when the animal has none', () => {
      const orphan: HealthRecord = {
        id: 9,
        animal_id: 99,
        recorded_date: '2026-10-10',
        condition: 'Bloat',
        severity: 'moderate',
        status: 'open'
      };
      const [row] = buildRows([orphan], [], LOOKUPS, TODAY).cases;

      expect(row.animalCode).toBe('#99');
      expect(row.locationName).toBe('Unassigned');
      expect(row.locationId).toBeNull();
    });

    it('treats missing status as open for cases and active for treatments', () => {
      const { cases, treatments } = buildRows(
        [{ id: 1, animal_id: 1, recorded_date: TODAY, condition: 'Lameness', severity: null, status: null }],
        [{ id: 2, animal_id: 1, start_date: TODAY, treatment_type: 'Medication', status: null }],
        LOOKUPS,
        TODAY
      );

      expect(cases[0].status).toBe('open');
      expect(treatments[0].status).toBe('active');
    });
  });

  describe('filters', () => {
    it('filters by free text across animal, condition, location and notes', () => {
      const all = rows().cases;
      expect(applyFilters(all, withFilters({ search: 'mastitis' }))).toHaveSize(2);
      expect(applyFilters(all, withFilters({ search: 'EV-SH' }))).toHaveSize(1);
      expect(applyFilters(all, withFilters({ search: 'maternity' }))).toHaveSize(2);
      expect(applyFilters(all, withFilters({ search: 'observation' }))).toHaveSize(1);
      expect(applyFilters(all, withFilters({ search: 'nothing here' }))).toHaveSize(0);
    });

    it('filters by status, severity set, condition and location', () => {
      const all = rows().cases;
      expect(applyFilters(all, withFilters({ status: 'open' }))).toHaveSize(2);
      expect(applyFilters(all, withFilters({ severity: ['high', 'critical'] }))).toHaveSize(2);
      expect(applyFilters(all, withFilters({ severity: ['low'] }))).toHaveSize(1);
      expect(applyFilters(all, withFilters({ condition: 'Mastitis' }))).toHaveSize(2);
      expect(applyFilters(all, withFilters({ locationId: 2 }))).toHaveSize(2);
    });

    it('filters by date window and ageing threshold', () => {
      const all = rows().cases;
      expect(applyFilters(all, withFilters({ from: '2026-10-10', to: '2026-10-13' }))).toHaveSize(1);
      expect(applyFilters(all, withFilters({ from: '2026-09-01' }))).toHaveSize(3);

      const ageing = applyFilters(all, withFilters({ ageingOnly: true }));
      expect(ageing).toHaveSize(1);
      expect(ageing[0].id).toBe(2);
      expect(ageing[0].ageDays).toBeGreaterThanOrEqual(AGEING_DAYS);
    });

    it('combines filters with AND semantics', () => {
      const all = rows().cases;
      const result = applyFilters(all, withFilters({ status: 'open', severity: ['high'], locationId: 1 }));
      expect(result.map((row) => row.id)).toEqual([1]);
    });
  });

  describe('facets', () => {
    it('derives status options with counts and an All entry', () => {
      const facets = buildFacets(rows().cases, 'cases', LOOKUPS);
      const status = facets.find((facet) => facet.key === 'status');

      expect(status?.kind).toBe('segmented');
      expect(status?.options).toEqual([
        { value: '', label: 'All', count: 3 },
        { value: 'open', label: 'Open', count: 2 },
        { value: 'closed', label: 'Closed', count: 1 }
      ]);
    });

    it('orders severity options from critical to low and skips empty ones', () => {
      const severity = buildFacets(rows().cases, 'cases', LOOKUPS).find((facet) => facet.key === 'severity');
      expect(severity?.options.map((option) => option.value)).toEqual(['critical', 'high', 'low']);

      const noSeverity = buildFacets(
        [{ ...rows().cases[0], severity: null }],
        'cases',
        LOOKUPS
      ).find((facet) => facet.key === 'severity');
      expect(noSeverity).toBeUndefined();
    });

    it('only offers a condition facet when there is a choice', () => {
      const facets = buildFacets(rows().cases, 'cases', LOOKUPS);
      const condition = facets.find((facet) => facet.key === 'condition');
      expect(condition?.options.map((option) => option.value)).toEqual(['Mastitis', 'Lameness']);

      const single = buildFacets([rows().cases[0]], 'cases', LOOKUPS).find((facet) => facet.key === 'condition');
      expect(single).toBeUndefined();
    });

    it('exposes an ageing toggle only when something is ageing', () => {
      const cases = rows().cases;
      const withAgeing = buildFacets(cases, 'cases', LOOKUPS).find((facet) => facet.key === 'ageingOnly');
      expect(withAgeing?.options[0].count).toBe(1);

      const young = buildFacets(
        cases.map((row) => ({ ...row, ageDays: 1 })),
        'cases',
        LOOKUPS
      ).find((facet) => facet.key === 'ageingOnly');
      expect(young).toBeUndefined();
    });

    it('labels treatments with their own vocabulary', () => {
      const facets = buildFacets(rows().treatments, 'treatments', LOOKUPS);
      expect(facets.find((facet) => facet.key === 'condition')?.label).toBe('Treatment type');
      expect(facets.find((facet) => facet.key === 'range')?.label).toBe('Started');
      expect(facets.find((facet) => facet.key === 'severity')).toBeUndefined();
    });
  });

  describe('sorting and paging', () => {
    it('sorts by animal, date, age and severity rank', () => {
      const cases = rows().cases;
      expect(sortRows(cases, { key: 'animal', direction: 'asc' }).map((row) => row.animalCode)).toEqual([
        'EV-CT-000003',
        'EV-GT-000001',
        'EV-SH-000002'
      ]);
      expect(sortRows(cases, { key: 'date', direction: 'asc' }).map((row) => row.id)).toEqual([2, 3, 1]);
      expect(sortRows(cases, { key: 'severity', direction: 'desc' }).map((row) => row.severity)).toEqual([
        'critical',
        'high',
        'low'
      ]);
      expect(sortRows(cases, { key: 'age', direction: 'desc' })[0].id).toBe(2);
    });

    it('clamps the page and reports the visible range', () => {
      const cases = rows().cases;
      const first = paginate(cases, 1, 2);
      expect(first.rows).toHaveSize(2);
      expect(first.pagination).toEqual({ page: 1, pageSize: 2, total: 3, pages: 2, from: 1, to: 2 });

      const second = paginate(cases, 99, 2);
      expect(second.pagination.page).toBe(2);
      expect(second.rows).toHaveSize(1);

      const empty = paginate([], 4, 10);
      expect(empty.pagination).toEqual({ page: 1, pageSize: 10, total: 0, pages: 1, from: 0, to: 0 });
    });
  });

  describe('KPIs', () => {
    it('counts the case KPIs from the rows', () => {
      const kpis = buildKpis(rows().cases, 'cases', defaultFilters(), TODAY);
      const byKey = Object.fromEntries(kpis.map((kpi) => [kpi.key, kpi]));

      expect(byKey['open'].value).toBe(2);
      expect(byKey['ageing'].value).toBe(1);
      expect(byKey['severe'].value).toBe(2);
      expect(byKey['closed30'].value).toBe(1);
      expect(byKey['open'].tone).toBe('action');
    });

    it('stays calm when a tile has nothing to report', () => {
      const calm = buildKpis([], 'cases', defaultFilters(), TODAY);
      expect(calm.every((kpi) => kpi.tone === 'ok' || kpi.tone === 'neutral')).toBeTrue();
      expect(calm.find((kpi) => kpi.key === 'open')?.caption).toBe('Nothing outstanding');
    });

    it('counts the treatment KPIs from the rows', () => {
      const kpis = buildKpis(rows().treatments, 'treatments', defaultFilters(), TODAY);
      const byKey = Object.fromEntries(kpis.map((kpi) => [kpi.key, kpi]));

      expect(byKey['active'].value).toBe(1);
      expect(byKey['completed'].value).toBe(1);
      expect(byKey['long'].value).toBe(0);
      expect(byKey['week'].value).toBe(1);
    });

    it('applies and clears a KPI as a filter', () => {
      const kpis = buildKpis(rows().cases, 'cases', defaultFilters(), TODAY);
      const open = kpis.find((kpi) => kpi.key === 'open')!;
      const ageing = kpis.find((kpi) => kpi.key === 'ageing')!;

      const opened = toggleKpiFilter(defaultFilters(), open);
      expect(opened.status).toBe('open');
      expect(applyFilters(rows().cases, opened)).toHaveSize(2);

      const ageingOn = toggleKpiFilter(opened, ageing);
      expect(ageingOn.ageingOnly).toBeTrue();
      expect(applyFilters(rows().cases, ageingOn)).toHaveSize(1);

      // Clearing a tile resets every facet it owns, including the implied status.
      const cleared = toggleKpiFilter(ageingOn, ageing);
      expect(cleared).toEqual(defaultFilters());
      expect(applyFilters(rows().cases, cleared)).toHaveSize(3);
    });

    it('writes the date window for a range KPI', () => {
      const kpis = buildKpis(rows().treatments, 'treatments', defaultFilters(), TODAY);
      const week = kpis.find((kpi) => kpi.key === 'week')!;
      const applied = toggleKpiFilter(defaultFilters(), week);

      expect(applied.to).toBe('2026-10-13');
      expect(applied.from).toBe('2026-10-06');
    });

    it('marks a KPI as active only while its filter still matches', () => {
      const filters = withFilters({ status: 'open' });
      const kpis = buildKpis(rows().cases, 'cases', filters, TODAY);
      expect(kpis.find((kpi) => kpi.key === 'open')?.active).toBeTrue();
      expect(kpis.find((kpi) => kpi.key === 'closed30')?.active).toBeFalse();
    });
  });

  describe('filter summary', () => {
    it('counts the active facets', () => {
      expect(activeFilterCount(defaultFilters())).toBe(0);
      expect(
        activeFilterCount(
          withFilters({ search: 'lame', status: 'open', severity: ['high'], locationId: 1, from: '2026-01-01', ageingOnly: true })
        )
      ).toBe(6);
    });

    it('labels the applied filters for the chip row', () => {
      const chips = filterChips(
        withFilters({ search: 'lame', status: 'open', severity: ['high', 'critical'], locationId: 2, from: '2026-09-13', to: '2026-10-13' }),
        LOOKUPS
      );

      expect(chips.map((chip) => chip.key)).toEqual(['search', 'status', 'severity', 'locationId', 'range']);
      expect(chips.find((chip) => chip.key === 'severity')?.value).toBe('High, Critical');
      expect(chips.find((chip) => chip.key === 'locationId')?.value).toBe('Maternity Barn');
      expect(chips.find((chip) => chip.key === 'range')?.value).toBe('13 Sept → 13 Oct');
    });

    it('reports an empty chip row when nothing is filtered', () => {
      expect(filterChips(defaultFilters(), LOOKUPS)).toEqual([]);
    });
  });

  describe('export and empty states', () => {
    it('exports the current tab as CSV with a BOM', () => {
      const csv = rowsToCsv(rows().cases, tabDef('cases').columns, 'cases');

      expect(csv.startsWith('\uFEFF')).toBeTrue();
      expect(csv).toContain('"Animal","Species","Condition","Severity","Recorded","Age","Status","Location","Notes"');
      expect(csv).toContain('"EV-GT-000001","goat","Mastitis","High","2026-10-11","2","Open","North Paddock","Under observation"');
    });

    it('exports treatments with their medicine column', () => {
      const csv = rowsToCsv(rows().treatments, tabDef('treatments').columns, 'treatments');
      expect(csv).toContain('"Treatment","Medicine","Started","Duration","Status"');
      expect(csv).toContain('"Oxytetracycline · 10ml IM"');
    });

    it('explains an empty table differently from an over-filtered one', () => {
      expect(emptyStateMessage(0, 0, 'cases').title).toBe('No health cases recorded yet');
      expect(emptyStateMessage(12, 0, 'cases').title).toBe('No records match these filters');
      expect(emptyStateMessage(12, 0, 'cases').detail).toContain('12 cases exist in total');
      expect(emptyStateMessage(4, 0, 'treatments').detail).toContain('4 treatments exist in total');
      expect(emptyStateMessage(3, 3, 'cases')).toEqual({ title: '', detail: '' });
    });
  });
});
