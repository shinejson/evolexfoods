import { BirthRecord, BreedingRecord, BreedingFilters, Lookups, PregnancyRecord } from './breeding.models';
import {
  CONFIRMATION_WINDOW_DAYS,
  FORECAST_WEEKS,
  HISTORY_MONTHS,
  TIMELINE_GEOMETRY,
  activeFilterCount,
  addDays,
  applyFilters,
  buildBirthHistoryChart,
  buildCycleHistoryChart,
  buildFacets,
  buildForecastChart,
  buildKpis,
  buildLocationChart,
  buildMixChart,
  buildPartnerChart,
  buildRows,
  defaultFilters,
  daysBetween,
  emptyStateMessage,
  endOfMonthIso,
  filterChips,
  formatDate,
  formatDays,
  formatPercent,
  formatRange,
  formatWeight,
  gestationLength,
  gestationStage,
  methodLabel,
  monthsBefore,
  outcomeLabel,
  paginate,
  progressPercent,
  relativeDays,
  removeChip,
  rowsToCsv,
  sortRows,
  startOfWeekIso,
  statusLabel,
  tabDef,
  titleCase,
  toIsoDate,
  todayIso,
  toggleKpiFilter
} from './breeding.insights';

const TODAY = '2026-10-13';

const LOOKUPS: Lookups = {
  locations: [
    { id: 1, name: 'North Paddock', code: 'PAD-A' },
    { id: 4, name: 'Maternity Barn', code: 'BRN-1' }
  ],
  animals: []
};

function pregnancies(): PregnancyRecord[] {
  return [
    {
      // Goat, due in 3 days, late in the third trimester.
      id: 1,
      animal_id: 10,
      breeding_id: 70,
      confirmed_date: '2026-05-20',
      expected_birth_date: '2026-10-16',
      status: 'active',
      animal: { id: 10, animal_id: 'EV-GT-000001', species: 'goat', breed: 'West African Dwarf', sex: 'female', location_id: 1, location: LOOKUPS.locations[0] },
      breeding: { id: 70, female_id: 10, male_id: 21, breeding_date: '2026-05-10', method: 'natural', status: 'completed', male: { id: 21, animal_id: 'EV-GT-000021' } }
    },
    {
      // Overdue ewe — needs attention.
      id: 2,
      animal_id: 11,
      breeding_id: 71,
      confirmed_date: '2026-06-01',
      expected_birth_date: '2026-10-05',
      status: 'active',
      animal: { id: 11, animal_id: 'EV-SH-000002', species: 'sheep', sex: 'female', location_id: 4, location: LOOKUPS.locations[1] },
      breeding: { id: 71, female_id: 11, male_id: 22, breeding_date: '2026-05-15', method: 'artificial_insemination', status: 'completed', male: { id: 22, animal_id: 'EV-SH-000022' } }
    },
    {
      // Mid-gestation goat, due in two months.
      id: 4,
      animal_id: 13,
      breeding_id: 75,
      confirmed_date: '2026-08-01',
      expected_birth_date: '2026-12-12',
      status: 'active',
      animal: { id: 13, animal_id: 'EV-GT-000013', species: 'goat', sex: 'female', location_id: 1, location: LOOKUPS.locations[0] },
      breeding: { id: 75, female_id: 13, male_id: 24, breeding_date: '2026-07-25', method: 'natural', status: 'completed', male: { id: 24, animal_id: 'EV-GT-000024' } }
    },
    {
      // Early-stage ewe, served a fortnight ago.
      id: 5,
      animal_id: 14,
      breeding_id: 76,
      confirmed_date: '2026-09-30',
      expected_birth_date: '2027-01-31',
      status: 'active',
      animal: { id: 14, animal_id: 'EV-SH-000014', species: 'sheep', sex: 'female', location_id: 4, location: LOOKUPS.locations[1] },
      breeding: { id: 76, female_id: 14, male_id: 22, breeding_date: '2026-09-25', method: 'natural', status: 'completed', male: { id: 22, animal_id: 'EV-SH-000022' } }
    },
    {
      // Closed-out pregnancy that produced a calf.
      id: 3,
      animal_id: 12,
      breeding_id: 72,
      confirmed_date: '2026-01-10',
      expected_birth_date: '2026-07-01',
      status: 'completed',
      animal: { id: 12, animal_id: 'EV-CT-000003', species: 'cattle', sex: 'female', location_id: 1 },
      breeding: { id: 72, female_id: 12, male_id: 23, breeding_date: '2026-01-02', method: 'natural', status: 'completed', male: { id: 23, animal_id: 'EV-CT-000023' } }
    }
  ];
}

function births(): BirthRecord[] {
  return [
    {
      id: 1,
      animal_id: 31,
      mother_animal_id: 'EV-GT-000002',
      birth_date: '2026-10-09',
      sex: 'female',
      birth_weight: 2.4,
      location_id: 4,
      status: 'alive',
      animal: { id: 31, animal_id: 'EV-GT-000031', species: 'goat' },
      location: LOOKUPS.locations[1]
    },
    {
      id: 2,
      animal_id: 32,
      mother_animal_id: 'EV-SH-000002',
      birth_date: '2026-08-18',
      sex: 'male',
      birth_weight: 4.1,
      location_id: 1,
      status: 'alive',
      animal: { id: 32, animal_id: 'EV-SH-000032', species: 'sheep' },
      location: LOOKUPS.locations[0]
    }
  ];
}

function cycles(): BreedingRecord[] {
  return [
    // Matched to pregnancy 1 → confirmed.
    { id: 70, female_id: 10, male_id: 21, breeding_date: '2026-05-10', method: 'natural', status: 'completed', female: { id: 10, animal_id: 'EV-GT-000001', species: 'goat', location_id: 1 }, male: { id: 21, animal_id: 'EV-GT-000021' } },
    // Served 3 days ago, no pregnancy on record yet → awaiting scan.
    { id: 73, female_id: 13, male_id: 21, breeding_date: '2026-10-10', method: 'natural', status: 'in_progress', female: { id: 13, animal_id: 'EV-GT-000013', species: 'goat', location_id: 4 }, male: { id: 21, animal_id: 'EV-GT-000021' } },
    // Served long ago with nothing to show for it → failed.
    { id: 74, female_id: 14, male_id: 22, breeding_date: '2026-05-01', method: 'embryo_transfer', status: 'completed', female: { id: 14, animal_id: 'EV-SH-000014', species: 'sheep', location_id: 1 }, male: { id: 22, animal_id: 'EV-SH-000022' } }
  ];
}

function rows() {
  return buildRows(pregnancies(), births(), cycles(), LOOKUPS, TODAY);
}

function withFilters(tab: 'pregnancies' | 'births' | 'cycles', patch: Partial<BreedingFilters> = {}): BreedingFilters {
  return { ...defaultFilters(tab), ...patch };
}

describe('breeding insights', () => {
  describe('formatting and dates', () => {
    it('normalises dates to day precision', () => {
      expect(toIsoDate('2026-10-13T09:31:00+00:00')).toBe('2026-10-13');
      expect(toIsoDate('')).toBe('');
    });

    it('counts whole days in both directions', () => {
      expect(daysBetween('2026-10-13', '2026-10-16')).toBe(3);
      expect(daysBetween('2026-10-13', '2026-10-05')).toBe(-8);
      expect(addDays('2026-10-13', 7)).toBe('2026-10-20');
      expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    });

    it('anchors weeks on Monday and months on the first day', () => {
      // 2026-10-13 is a Tuesday.
      expect(startOfWeekIso(TODAY)).toBe('2026-10-12');
      expect(endOfMonthIso('2026-02-10')).toBe('2026-02-28');
      expect(monthsBefore('2026-10-13', 2)).toBe('2026-08-01');
    });

    it('renders dates, weights and percentages for humans', () => {
      expect(formatDate('2026-10-13')).toBe('13 Oct 2026');
      expect(formatWeight(2.4)).toBe('2.4 kg');
      expect(formatWeight(41)).toBe('41 kg');
      expect(formatPercent(0.426)).toBe('43%');
      expect(formatDays(1)).toBe('1 day');
      expect(formatDays(12)).toBe('12 days');
      expect(formatRange('2026-10-01', '2026-10-31')).toBe('01 Oct – 31 Oct 2026');
      expect(formatRange('', '')).toBe('Any date');
    });

    it('describes countdowns in the direction the team reads them', () => {
      expect(relativeDays(3)).toBe('in 3 days');
      expect(relativeDays(0)).toBe('due today');
      expect(relativeDays(-4)).toBe('4 days past due');
      expect(relativeDays(0, 'age')).toBe('today');
      expect(relativeDays(21, 'age')).toBe('21 days old');
      expect(relativeDays(-2, 'birth')).toBe('2 days ago');
    });

    it('labels statuses, methods and outcomes', () => {
      expect(titleCase('artificial_insemination')).toBe('Artificial Insemination');
      expect(methodLabel('artificial_insemination')).toBe('Artificial insemination');
      expect(methodLabel('natural')).toBe('Natural service');
      expect(statusLabel('in_progress')).toBe('In progress');
      expect(outcomeLabel('awaiting')).toBe('Awaiting scan');
      expect(todayIso(new Date('2026-10-13T23:00:00Z'))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('gestation maths', () => {
    it('uses the species gestation length', () => {
      expect(gestationLength('goat')).toBe(150);
      expect(gestationLength('sheep')).toBe(150);
      expect(gestationLength('cattle')).toBe(283);
      expect(gestationLength('unknown breed')).toBe(150);
    });

    it('splits the gestation into thirds', () => {
      expect(gestationStage(0)).toBe('');
      expect(gestationStage(0.2)).toBe('early');
      expect(gestationStage(0.5)).toBe('mid');
      expect(gestationStage(0.8)).toBe('late');
    });
  });

  describe('row normalisation', () => {
    it('derives the countdown, stage and progress of a pregnancy', () => {
      const [dueSoon, overdue] = rows().pregnancies;
      expect(dueSoon.daysToDue).toBe(3);
      expect(dueSoon.stage).toBe('late');
      expect(dueSoon.counterparty).toBe('EV-GT-000021');
      expect(dueSoon.counterpartyLabel).toBe('Sire');
      expect(dueSoon.locationName).toBe('North Paddock');
      expect(progressPercent(dueSoon)).toBeGreaterThan(90);
      expect(dueSoon.attention).toBe(true);

      expect(overdue.daysToDue).toBe(-8);
      expect(overdue.attention).toBe(true);
      expect(overdue.method).toBe('artificial_insemination');
    });

    it('keeps closed pregnancies out of the active filters', () => {
      const closed = rows().pregnancies.find((row) => row.id === 3)!;
      expect(closed.status).toBe('completed');
      expect(closed.stage).toBe('');
      expect(closed.progress).toBe(1);
      expect(closed.attention).toBe(false);
    });

    it('falls back to the lookups when a relation is not loaded', () => {
      const withLookup = buildRows(pregnancies(), [], [], LOOKUPS, TODAY);
      expect(withLookup.pregnancies[2].locationName).toBe('North Paddock');
    });

    it('normalises a birth row around the calf', () => {
      const [calf] = rows().births;
      expect(calf.animalCode).toBe('EV-GT-000031');
      expect(calf.counterparty).toBe('EV-GT-000002');
      expect(calf.counterpartyLabel).toBe('Dam');
      expect(calf.sex).toBe('female');
      expect(calf.weight).toBe(2.4);
      expect(calf.ageDays).toBe(4);
      expect(calf.attention).toBe(true);
      expect(rows().births[1].attention).toBe(false);
    });

    it('reads the outcome of a cycle from the pregnancies it produced', () => {
      const [confirmed, awaiting, failed] = rows().cycles;
      expect(confirmed.outcome).toBe('confirmed');
      expect(confirmed.dueDate).toBe('2026-10-16');
      expect(confirmed.title).toBe('Natural service');

      expect(awaiting.outcome).toBe('awaiting');
      expect(awaiting.ageDays).toBe(3);
      expect(awaiting.attention).toBe(false);

      expect(failed.outcome).toBe('failed');
      expect(failed.attention).toBe(true);
      expect(failed.dueDate).toBe('');
    });

    it('closes an unreported cycle once the confirmation window lapses', () => {
      const stale: BreedingRecord = {
        id: 80,
        female_id: 15,
        male_id: 21,
        breeding_date: addDays(TODAY, -(CONFIRMATION_WINDOW_DAYS + 5)),
        method: 'natural',
        status: 'completed',
        female: { id: 15, animal_id: 'EV-GT-000015', species: 'goat' },
        male: { id: 21, animal_id: 'EV-GT-000021' }
      };
      const [row] = buildRows([], [], [stale], LOOKUPS, TODAY).cycles;
      expect(row.outcome).toBe('failed');
    });
  });

  describe('filters', () => {
    it('searches across animal, sire, breed, paddock and notes', () => {
      const list = rows().pregnancies;
      expect(applyFilters(list, withFilters('pregnancies', { search: 'ev-sh' })).length).toBe(2);
      expect(applyFilters(list, withFilters('pregnancies', { search: 'west african' })).length).toBe(1);
      expect(applyFilters(list, withFilters('pregnancies', { search: 'maternity' })).length).toBe(2);
      expect(applyFilters(list, withFilters('pregnancies', { search: 'zzz' })).length).toBe(0);
    });

    it('filters by status, trimester, outcome, method, species and location', () => {
      const pregnanciesList = rows().pregnancies;
      expect(applyFilters(pregnanciesList, withFilters('pregnancies', { status: 'active' })).length).toBe(4);
      expect(applyFilters(pregnanciesList, withFilters('pregnancies', { stage: ['late'] })).length).toBe(2);
      expect(applyFilters(pregnanciesList, withFilters('pregnancies', { species: 'sheep' })).length).toBe(2);
      expect(applyFilters(pregnanciesList, withFilters('pregnancies', { locationId: 4 })).length).toBe(2);

      const cycleList = rows().cycles;
      expect(applyFilters(cycleList, withFilters('cycles', { outcome: 'confirmed' })).length).toBe(1);
      expect(applyFilters(cycleList, withFilters('cycles', { method: 'natural' })).length).toBe(2);
      expect(applyFilters(cycleList, withFilters('cycles', { partner: 'EV-GT-000021' })).length).toBe(2);

      const birthList = rows().births;
      expect(applyFilters(birthList, withFilters('births', { sex: 'male' })).length).toBe(1);
    });

    it('applies the date window to the chosen field', () => {
      const list = rows().pregnancies;
      const dueWindow = applyFilters(list, withFilters('pregnancies', { rangeField: 'due', from: TODAY, to: addDays(TODAY, 7) }));
      expect(dueWindow.map((row) => row.id)).toEqual([1]);

      const confirmedWindow = applyFilters(list, withFilters('pregnancies', { rangeField: 'confirmed', from: '2026-05-01', to: '2026-05-31' }));
      expect(confirmedWindow.map((row) => row.id)).toEqual([1]);
    });

    it('can ignore its own dimension so a chart keeps every option clickable', () => {
      const list = rows().pregnancies;
      const filters = withFilters('pregnancies', { stage: ['late'] });
      expect(applyFilters(list, filters).length).toBe(2);
      expect(applyFilters(list, filters, 'stage').length).toBe(5);
    });

    it('counts the active facets', () => {
      const defaults = defaultFilters('pregnancies');
      expect(activeFilterCount(defaults, defaults)).toBe(0);
      expect(
        activeFilterCount(
          withFilters('pregnancies', { search: 'goat', status: 'active', attentionOnly: true, stage: ['late'] }),
          defaults
        )
      ).toBe(4);
    });

    it('labels applied filters and clears them one at a time', () => {
      const filters = withFilters('births', { sex: 'female', locationId: 4, attentionOnly: true, rangeField: 'birth', from: '2026-10-01', to: TODAY });
      const chips = filterChips(filters, 'births', LOOKUPS);
      expect(chips.map((chip) => chip.key)).toEqual(['sex', 'locationId', 'range', 'attentionOnly']);
      expect(chips.find((chip) => chip.key === 'locationId')?.value).toBe('Maternity Barn');

      expect(removeChip(filters, 'locationId').locationId).toBeNull();
      expect(removeChip(filters, 'sex').sex).toBe('');
      expect(removeChip(filters, 'range').from).toBe('');
      expect(removeChip(filters, 'attentionOnly').attentionOnly).toBe(false);
      expect(filterChips(withFilters('cycles'), 'cycles', LOOKUPS)).toEqual([]);
    });

    it('reads a tab`s resting scope as "nothing applied yet"', () => {
      // The pregnancies register rests on active pregnancies: that scope is the
      // baseline, so it earns neither a chip nor a place in the filter count.
      const resting = { ...defaultFilters('pregnancies'), status: 'active' };
      expect(activeFilterCount(resting, resting)).toBe(0);
      expect(filterChips(resting, 'pregnancies', LOOKUPS, resting)).toEqual([]);

      const narrowed = { ...resting, stage: ['late'] };
      expect(activeFilterCount(narrowed, resting)).toBe(1);
      expect(filterChips(narrowed, 'pregnancies', LOOKUPS, resting).map((chip) => chip.key)).toEqual(['stage']);

      // Re-scoping to a narrower status is a deliberate choice, so it is reported.
      const closed = { ...resting, status: 'completed' };
      expect(activeFilterCount(closed, resting)).toBe(1);
      expect(filterChips(closed, 'pregnancies', LOOKUPS, resting).map((chip) => chip.key)).toEqual(['status']);

      // Opening the status back up restricts nothing, so there is nothing to show.
      const opened = { ...resting, status: '' };
      expect(activeFilterCount(opened, resting)).toBe(0);
      expect(filterChips(opened, 'pregnancies', LOOKUPS, resting)).toEqual([]);
    });
  });

  describe('facets', () => {
    it('offers the tab vocabulary with counts', () => {
      const [status] = buildFacets(rows().pregnancies, 'pregnancies', LOOKUPS);
      expect(status.options.map((option) => option.value)).toEqual(['', 'active', 'completed']);
      expect(status.options[1].count).toBe(4);
      expect(status.options[2].count).toBe(1);
    });

    it('only offers a trimester facet when there is a choice', () => {
      const stages = buildFacets(rows().pregnancies, 'pregnancies', LOOKUPS).find((facet) => facet.key === 'stage');
      expect(stages?.options.map((option) => option.value)).toEqual(['early', 'mid', 'late']);
      expect(stages?.options.find((option) => option.value === 'late')?.count).toBe(2);
      const single = buildRows([pregnancies()[0]], [], [], LOOKUPS, TODAY);
      expect(buildFacets(single.pregnancies, 'pregnancies', LOOKUPS).find((facet) => facet.key === 'stage')).toBeUndefined();
    });

    it('exposes the result and method facets on the cycle tab', () => {
      const facets = buildFacets(rows().cycles, 'cycles', LOOKUPS);
      expect(facets.find((facet) => facet.key === 'outcome')?.options.map((option) => option.value)).toEqual(['', 'confirmed', 'awaiting', 'failed']);
      expect(facets.find((facet) => facet.key === 'method')?.options.map((option) => option.label)).toEqual([
        'Natural service',
        'Embryo transfer'
      ]);
    });

    it('names the locations from the lookups and flags rows needing attention', () => {
      const facets = buildFacets(rows().pregnancies, 'pregnancies', LOOKUPS);
      const location = facets.find((facet) => facet.key === 'locationId');
      expect(location?.options.map((option) => option.label)).toEqual(['North Paddock', 'Maternity Barn']);
      const attention = facets.find((facet) => facet.key === 'attentionOnly');
      expect(attention?.options[0].count).toBe(2);
      expect(attention?.kind).toBe('toggle');
      expect(facets.find((facet) => facet.key === 'range')?.kind).toBe('date-range');
    });
  });

  describe('sorting and paging', () => {
    it('sorts by the countdown, date and weight', () => {
      const byDue = sortRows(rows().pregnancies, { key: 'due', direction: 'asc' });
      expect(byDue.map((row) => row.id)).toEqual([3, 2, 1, 4, 5]);
      const byWeight = sortRows(rows().births, { key: 'weight', direction: 'desc' });
      expect(byWeight.map((row) => row.id)).toEqual([2, 1]);
      const byAge = sortRows(rows().births, { key: 'age', direction: 'asc' });
      expect(byAge.map((row) => row.id)).toEqual([1, 2]);
    });

    it('clamps the page and reports the visible range', () => {
      const list = rows().cycles;
      const first = paginate(list, 1, 2);
      expect(first.rows.map((row) => row.id)).toEqual([70, 73]);
      expect(first.pagination).toEqual({ page: 1, pageSize: 2, total: 3, pages: 2, from: 1, to: 2 });

      const last = paginate(list, 9, 2);
      expect(last.pagination.page).toBe(2);
      expect(last.pagination.from).toBe(3);
      expect(last.pagination.to).toBe(3);

      expect(paginate([], 1, 10).pagination.from).toBe(0);
    });
  });

  describe('KPIs', () => {
    it('counts the pregnancy tiles from the whole tab', () => {
      const kpis = buildKpis(rows().pregnancies, 'pregnancies', withFilters('pregnancies'), TODAY);
      const byKey = Object.fromEntries(kpis.map((kpi) => [kpi.key, kpi]));
      expect(byKey['active'].value).toBe('4');
      expect(byKey['dueWeek'].value).toBe('1');
      expect(byKey['overdue'].value).toBe('1');
      expect(byKey['late'].value).toBe('2');
      expect(byKey['overdue'].tone).toBe('action');
      expect(byKey['active'].active).toBe(false);
    });

    it('counts the birth tiles and averages the weights', () => {
      const kpis = buildKpis(rows().births, 'births', withFilters('births'), TODAY);
      const byKey = Object.fromEntries(kpis.map((kpi) => [kpi.key, kpi]));
      expect(byKey['all'].value).toBe('2');
      expect(byKey['recent'].value).toBe('1');
      expect(byKey['weight'].value).toBe('3.3 kg');
      expect(byKey['weight'].caption).toBe('1 birth flagged');
    });

    it('counts the cycle tiles and the conception rate', () => {
      const kpis = buildKpis(rows().cycles, 'cycles', withFilters('cycles'), TODAY);
      const byKey = Object.fromEntries(kpis.map((kpi) => [kpi.key, kpi]));
      expect(byKey['confirmed'].value).toBe('1');
      expect(byKey['awaiting'].value).toBe('1');
      expect(byKey['failed'].value).toBe('1');
      expect(byKey['rate'].value).toBe('50%');
    });

    it('applies a tile as a filter and clears it again', () => {
      const kpis = buildKpis(rows().pregnancies, 'pregnancies', withFilters('pregnancies'), TODAY);
      const overdue = kpis.find((kpi) => kpi.key === 'overdue')!;
      const applied = toggleKpiFilter(defaultFilters('pregnancies'), overdue, 'pregnancies', TODAY);
      expect(applied.status).toBe('active');
      expect(applied.rangeField).toBe('due');
      expect(applied.to).toBe(TODAY);

      const active = buildKpis(rows().pregnancies, 'pregnancies', applied, TODAY).find((kpi) => kpi.key === 'overdue');
      expect(active?.active).toBe(true);

      const cleared = toggleKpiFilter(applied, overdue, 'pregnancies', TODAY);
      expect(cleared.status).toBe('');
      expect(cleared.to).toBe('');
    });
  });

  describe('export and empty states', () => {
    it('exports the current tab as CSV with a BOM and the tab columns', () => {
      const csv = rowsToCsv(rows().births, tabDef('births').columns, 'births');
      expect(csv.startsWith('\uFEFF')).toBe(true);
      const lines = csv.split('\n');
      expect(lines[1]).toBe('"Calf","Dam","Sex","Birth weight","Born","Age","Outcome"');
      expect(lines[2]).toContain('"EV-GT-000031');
      expect(lines[2]).toContain('"2.4"');
      expect(lines[2]).toContain('"4"');
    });

    it('explains an empty register differently from an over-filtered one', () => {
      expect(emptyStateMessage(0, 0, 'cycles').title).toBe('No breeding cycle records yet');
      expect(emptyStateMessage(12, 0, 'pregnancies').title).toBe('No rows match these filters');
      expect(emptyStateMessage(12, 4, 'births').title).toBe('');
    });
  });

  describe('charts', () => {
    it('forecasts expected births week by week from Monday', () => {
      const chart = buildForecastChart(rows().pregnancies, withFilters('pregnancies'), TODAY);
      expect(chart.buckets.length).toBe(FORECAST_WEEKS);
      expect(chart.buckets[0].from).toBe('2026-10-12');
      expect(chart.buckets[0].to).toBe('2026-10-18');
      expect(chart.buckets[0].primary).toBe(1);
      expect(chart.primaryTotal).toBe(2);
      expect(chart.buckets[0].barHeight).toBeGreaterThan(0);
      expect(chart.buckets[1].barHeight).toBe(0);
      expect(chart.field).toBe('due');
      expect(chart.peak?.display).toBe('1');
    });

    it('keeps every bar inside the SVG view box', () => {
      const chart = buildForecastChart(rows().pregnancies, withFilters('pregnancies'), TODAY);
      chart.buckets.forEach((bucket) => {
        expect(bucket.barX).toBeGreaterThanOrEqual(TIMELINE_GEOMETRY.left);
        expect(bucket.barX + bucket.barWidth).toBeLessThanOrEqual(TIMELINE_GEOMETRY.right + 1);
        expect(bucket.barY + bucket.barHeight).toBeLessThanOrEqual(TIMELINE_GEOMETRY.baseline + 1);
        expect(bucket.markerY).toBeLessThanOrEqual(TIMELINE_GEOMETRY.baseline);
      });
      expect(chart.linePoints.split(' ').length).toBe(FORECAST_WEEKS);
      expect(chart.gridLines.map((line) => line.label)).toEqual(['0', '1', '1']);
    });

    it('marks the bucket a chart click filtered on', () => {
      const chart = buildForecastChart(
        rows().pregnancies,
        withFilters('pregnancies', { rangeField: 'due', from: '2026-10-12', to: '2026-10-18' }),
        TODAY
      );
      expect(chart.buckets[0].active).toBe(true);
      expect(chart.buckets[1].active).toBe(false);
    });

    it('groups births and services into the last few months', () => {
      const birthsChart = buildBirthHistoryChart(rows().births, withFilters('births'), TODAY);
      expect(birthsChart.buckets.length).toBe(HISTORY_MONTHS);
      expect(birthsChart.buckets[birthsChart.buckets.length - 1].from).toBe('2026-10-01');
      expect(birthsChart.buckets[birthsChart.buckets.length - 1].primary).toBe(1);
      expect(birthsChart.buckets.find((bucket) => bucket.key === '2026-08-01')?.primary).toBe(1);
      expect(birthsChart.buckets.find((bucket) => bucket.key === '2026-09-01')?.primary).toBe(0);
      expect(birthsChart.secondaryTotal).toBe(2);

      const cycleChart = buildCycleHistoryChart(rows().cycles, withFilters('cycles'), TODAY);
      expect(cycleChart.field).toBe('breeding');
      expect(cycleChart.primaryTotal).toBe(3);
      expect(cycleChart.buckets.reduce((sum, bucket) => sum + bucket.secondary, 0)).toBeGreaterThan(cycleChart.primaryTotal);
    });

    it('builds a donut whose shares add up to the whole', () => {
      const mix = buildMixChart(rows().pregnancies, 'pregnancies', withFilters('pregnancies'));
      expect(mix.total).toBe(4);
      expect(mix.segments.map((segment) => segment.key)).toEqual(['early', 'mid', 'late']);
      expect(mix.gradient.startsWith('conic-gradient(')).toBe(true);
      expect(mix.segments[0].from).toBe(0);
      expect(mix.segments[0].to).toBe(25);
      expect(mix.segments[2].to).toBe(100);

      const sexes = buildMixChart(rows().births, 'births', withFilters('births'));
      expect(sexes.segments.map((segment) => segment.key)).toEqual(['female', 'male']);
      expect(sexes.segments.reduce((sum, segment) => sum + segment.share, 0)).toBeCloseTo(1, 5);
      expect(sexes.centerLabel).toBe('births');
    });

    it('marks the active slice', () => {
      const mix = buildMixChart(rows().births, 'births', withFilters('births', { sex: 'female' }));
      expect(mix.segments.find((segment) => segment.key === 'female')?.active).toBe(true);
      expect(mix.segments.find((segment) => segment.key === 'male')?.active).toBe(false);
    });

    it('ranks locations and sires with shares that stay clickable', () => {
      const locations = buildLocationChart(rows().pregnancies, 'pregnancies', withFilters('pregnancies', { locationId: 1 }));
      expect(locations.rows.length).toBe(2);
      expect(locations.rows[0].label).toBe('North Paddock');
      expect(locations.rows[0].value).toBe(3);
      expect(locations.rows[0].share).toBe(1);
      expect(locations.rows.find((row) => row.key === '1')?.active).toBe(true);

      const sires = buildPartnerChart(rows().cycles, 'cycles', withFilters('cycles', { partner: 'EV-GT-000021' }));
      expect(sires.rows[0].label).toBe('EV-GT-000021');
      expect(sires.rows[0].value).toBe(2);
      expect(sires.rows[0].meta).toBe('67% of 3');
      expect(sires.rows[0].active).toBe(true);
    });

    it('falls back to an empty chart when there is nothing to plot', () => {
      const empty = buildRows([], [], [], LOOKUPS, TODAY);
      expect(buildForecastChart(empty.pregnancies, defaultFilters('pregnancies'), TODAY).primaryTotal).toBe(0);
      expect(buildMixChart(empty.births, 'births', defaultFilters('births')).total).toBe(0);
      expect(buildLocationChart(empty.cycles, 'cycles', defaultFilters('cycles')).rows).toEqual([]);
    });
  });
});
