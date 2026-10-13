import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import {
  AnimalRef,
  BarsChart,
  BirthRecord,
  BreedingRecord,
  BreedingFilters,
  BreedingRow,
  BreedingSort,
  BreedingTab,
  DialogMode,
  DonutChart,
  FacetDef,
  FacetOption,
  Lookups,
  PregnancyRecord,
  RangeField,
  TimelineBucket,
  TimelineChart
} from './breeding.models';
import {
  DEFAULT_PAGE_SIZE_VALUE,
  FORECAST_WEEKS,
  HISTORY_MONTHS,
  TABS,
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
  emptyStateMessage,
  filterChips,
  formatDate,
  formatDateShort,
  formatDays,
  formatPercent,
  formatRange,
  formatWeight,
  methodLabel,
  outcomeLabel,
  pluralize,
  progressPercent,
  relativeDays,
  statusTone,
  outcomeTone,
  dueTone,
  removeChip,
  rowsToCsv,
  sortRows,
  paginate,
  speciesLabel,
  stageLabel,
  statusLabel,
  tabDef,
  titleCase,
  toIsoDate,
  todayIso,
  toggleKpiFilter
} from './breeding.insights';

type LoadState = 'loading' | 'ready' | 'error';

const EMPTY_LOOKUPS: Lookups = { locations: [], animals: [] };
/** History fetched for the birth and service charts. */
const HISTORY_DAYS = 365;

/**
 * The scope each register opens with. The pregnancies tab is a live caseload —
 * it rests on active pregnancies — while births and service cycles list their
 * whole history. `restingFilters(tab)` is also what "Clear filters" returns to
 * and what the chip row measures "applied filters" against.
 */
function restingFilters(tab: BreedingTab): BreedingFilters;
function restingFilters(): Record<BreedingTab, BreedingFilters>;
function restingFilters(tab?: BreedingTab): BreedingFilters | Record<BreedingTab, BreedingFilters> {
  const all: BreedingTab[] = ['pregnancies', 'births', 'cycles'];
  const build = (key: BreedingTab): BreedingFilters =>
    key === 'pregnancies' ? { ...defaultFilters(key), status: 'active' } : defaultFilters(key);
  if (tab) {
    return build(tab);
  }
  return { pregnancies: build('pregnancies'), births: build('births'), cycles: build('cycles') };
}

@Component({
  selector: 'app-breeding',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './breeding.component.html',
  styleUrl: './breeding.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BreedingComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly titleService = inject(Title);

  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;
  @ViewChild('dialogFirstField') dialogFirstField?: ElementRef<HTMLElement>;

  readonly tabs = TABS;
  readonly pageSizes = [5, 10, 25, 50];
  readonly historyMonths = HISTORY_MONTHS;
  readonly forecastWeeks = FORECAST_WEEKS;

  readonly titleCase = titleCase;
  readonly formatDate = formatDate;
  readonly formatDateShort = formatDateShort;
  readonly formatDays = formatDays;
  readonly formatWeight = formatWeight;
  readonly formatPercent = formatPercent;
  readonly formatRange = formatRange;
  readonly relativeDays = relativeDays;
  readonly methodLabel = methodLabel;
  readonly statusLabel = statusLabel;
  readonly outcomeLabel = outcomeLabel;
  readonly stageLabel = stageLabel;
  readonly speciesLabel = speciesLabel;
  readonly progressPercent = progressPercent;
  readonly statusTone = statusTone;
  readonly outcomeTone = outcomeTone;
  readonly dueTone = dueTone;

  /** Geometry the timeline SVG is drawn with — kept next to the chart model. */
  readonly geometry = TIMELINE_GEOMETRY;

  readonly state = signal<LoadState>('loading');
  readonly errorMessage = signal('');
  readonly message = signal('');
  readonly saving = signal(false);
  readonly tab = signal<BreedingTab>('pregnancies');
  readonly filters = signal<Record<BreedingTab, BreedingFilters>>(restingFilters());
  readonly sorts = signal<Record<BreedingTab, BreedingSort>>({
    pregnancies: { key: 'due', direction: 'asc' },
    births: { key: 'date', direction: 'desc' },
    cycles: { key: 'date', direction: 'desc' }
  });
  readonly pages = signal<Record<BreedingTab, number>>({ pregnancies: 1, births: 1, cycles: 1 });
  readonly pageSize = signal(DEFAULT_PAGE_SIZE_VALUE);
  readonly today = signal(todayIso());

  readonly dialogMode = signal<DialogMode | null>(null);
  readonly dialogTab = signal<BreedingTab>('cycles');
  readonly selectedRow = signal<BreedingRow | null>(null);
  readonly serverError = signal('');

  private readonly pregnancies = signal<PregnancyRecord[]>([]);
  private readonly births = signal<BirthRecord[]>([]);
  private readonly cycles = signal<BreedingRecord[]>([]);
  private readonly lookups = signal<Lookups>(EMPTY_LOOKUPS);

  readonly cycleForm = this.fb.nonNullable.group({
    female_id: [null as number | null, Validators.required],
    male_id: [null as number | null],
    breeding_date: [todayIso(), Validators.required],
    method: ['natural'],
    status: ['completed'],
    notes: ['']
  });

  readonly pregnancyForm = this.fb.nonNullable.group({
    animal_id: [null as number | null, Validators.required],
    confirmed_date: [todayIso(), Validators.required],
    expected_birth_date: [''],
    status: ['active'],
    notes: ['']
  });

  /* ---------------- derived state ---------------- */

  private readonly rowsByTab = computed(() => buildRows(this.pregnancies(), this.births(), this.cycles(), this.lookups(), this.today()));

  readonly activeFilters = computed(() => this.filters()[this.tab()]);

  readonly activeSort = computed(() => this.sorts()[this.tab()]);

  readonly tabRows = computed(() => this.rowsByTab()[this.tab()]);

  readonly filtered = computed(() => applyFilters(this.tabRows(), this.activeFilters()));

  readonly sorted = computed(() => sortRows(this.filtered(), this.activeSort()));

  readonly paged = computed(() => paginate(this.sorted(), this.pages()[this.tab()], this.pageSize()));

  readonly facets = computed(() => buildFacets(this.tabRows(), this.tab(), this.lookups()));

  readonly kpis = computed(() => buildKpis(this.tabRows(), this.tab(), this.activeFilters(), this.today()));

  readonly chips = computed(() => filterChips(this.activeFilters(), this.tab(), this.lookups(), restingFilters(this.tab())));

  readonly filterCount = computed(() => activeFilterCount(this.activeFilters(), restingFilters(this.tab())));

  readonly tabCounts = computed(() => {
    const rows = this.rowsByTab();
    return { pregnancies: rows.pregnancies.filter((row) => row.status === 'active').length, births: rows.births.length, cycles: rows.cycles.length };
  });

  readonly currentTabDef = computed(() => tabDef(this.tab()));

  readonly emptyState = computed(() => emptyStateMessage(this.tabRows().length, this.filtered().length, this.tab()));

  /** Headline facts for the page header, always drawn from the whole herd. */
  readonly herdSummary = computed(() => {
    const rows = this.rowsByTab().pregnancies.filter((row) => row.status === 'active');
    const today = this.today();
    return {
      active: rows.length,
      dueSoon: rows.filter((row) => row.daysToDue !== null && row.daysToDue >= 0 && row.daysToDue <= 7).length,
      overdue: rows.filter((row) => row.daysToDue !== null && row.daysToDue < 0).length,
      nextDue: rows
        .filter((row) => row.daysToDue !== null && row.daysToDue >= 0)
        .sort((a, b) => (a.daysToDue ?? 0) - (b.daysToDue ?? 0))[0] ?? null,
      today
    };
  });

  /**
   * Charts stay useful after a filter is applied: the date window is dropped
   * from the scope so every bar of the chart remains visible and clickable.
   */
  private readonly chartScope = computed(() => applyFilters(this.tabRows(), { ...this.activeFilters(), from: '', to: '' }));

  readonly timelineChart = computed<TimelineChart>(() => {
    const scope = this.chartScope();
    const filters = this.activeFilters();
    const today = this.today();
    switch (this.tab()) {
      case 'births':
        return buildBirthHistoryChart(scope, filters, today);
      case 'cycles':
        return buildCycleHistoryChart(scope, filters, today);
      default:
        return buildForecastChart(scope, filters, today);
    }
  });

  readonly mixChart = computed<DonutChart>(() => buildMixChart(this.tabRows(), this.tab(), this.activeFilters()));

  readonly locationChart = computed<BarsChart>(() => buildLocationChart(this.tabRows(), this.tab(), this.activeFilters()));

  readonly partnerChart = computed<BarsChart>(() => buildPartnerChart(this.tabRows(), this.tab(), this.activeFilters()));

  readonly femaleOptions = computed(() =>
    this.animalOptions().filter((animal) => (animal.sex ?? 'female') === 'female')
  );

  readonly maleOptions = computed(() => this.animalOptions().filter((animal) => (animal.sex ?? '') !== 'female'));

  readonly animalOptions = computed(() => {
    const animals = [...(this.lookups().animals ?? [])];
    return animals.sort((a, b) => {
      const aliveA = (a.status ?? 'alive') === 'alive' ? 0 : 1;
      const aliveB = (b.status ?? 'alive') === 'alive' ? 0 : 1;
      return aliveA - aliveB || a.animal_id.localeCompare(b.animal_id);
    });
  });

  /** The pregnancy a service produced, shown in the cycle detail panel. */
  readonly relatedPregnancy = computed(() => {
    const row = this.selectedRow();
    if (!row || row.tab !== 'cycles') {
      return null;
    }
    const cycleId = (row.raw as BreedingRecord).id;
    return this.rowsByTab().pregnancies.find((pregnancy) => (pregnancy.raw as PregnancyRecord).breeding_id === cycleId) ?? null;
  });

  ngOnInit(): void {
    this.titleService.setTitle('Breeding · Evolex Hub');
    this.load();
  }

  /* ---------------- data ---------------- */

  load(silent = false): void {
    if (!silent) {
      this.state.set('loading');
    }
    this.errorMessage.set('');

    const today = todayIso();

    forkJoin({
      pregnancies: this.api.get<{ records: PregnancyRecord[] }>('/livestock/pregnancies', { status: 'all' }),
      births: this.api.get<{ records: BirthRecord[] }>('/livestock/births', { from: addDays(today, -HISTORY_DAYS), to: today }),
      cycles: this.api.get<{ data: BreedingRecord[] }>('/records/breeding'),
      lookups: this.api.get<Lookups>('/lookups')
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ pregnancies, births, cycles, lookups }) => {
          this.pregnancies.set(pregnancies.records ?? []);
          this.births.set(births.records ?? []);
          this.cycles.set(cycles.data ?? []);
          this.lookups.set({ locations: lookups.locations ?? [], animals: lookups.animals ?? [] });
          this.today.set(todayIso());
          this.state.set('ready');
        },
        error: (error: HttpErrorResponse) => {
          if (this.state() === 'ready' && silent) {
            this.message.set('Live refresh failed — showing the last loaded data.');
            return;
          }
          this.state.set('error');
          this.errorMessage.set(
            error.status === 401
              ? 'Your session has expired. Sign in again to open the breeding workspace.'
              : 'We could not load breeding records. Check the API connection and try again.'
          );
        }
      });
  }

  refresh(): void {
    this.load(this.state() === 'ready');
  }

  /* ---------------- tabs, filters, sorting, paging ---------------- */

  setTab(tab: BreedingTab): void {
    if (tab === this.tab()) {
      return;
    }
    this.tab.set(tab);
    this.message.set('');
  }

  private patchFilters(patch: Partial<BreedingFilters>): void {
    const tab = this.tab();
    this.filters.update((all) => ({ ...all, [tab]: { ...all[tab], ...patch } }));
    this.pages.update((all) => ({ ...all, [tab]: 1 }));
  }

  onSearch(value: string): void {
    this.patchFilters({ search: value });
  }

  setStatus(value: string): void {
    this.patchFilters({ status: value });
  }

  setOutcome(value: string): void {
    this.patchFilters({ outcome: value === this.activeFilters().outcome ? '' : value });
  }

  setSex(value: string): void {
    this.patchFilters({ sex: value });
  }

  setMethod(value: string): void {
    this.patchFilters({ method: value === this.activeFilters().method ? '' : value });
  }

  toggleStage(value: string): void {
    const current = this.activeFilters().stage;
    this.patchFilters({ stage: current.includes(value) ? current.filter((item) => item !== value) : [...current, value] });
  }

  setSpecies(value: string): void {
    this.patchFilters({ species: value });
  }

  setLocation(value: string): void {
    this.patchFilters({ locationId: value === '' ? null : Number(value) });
  }

  setRangeField(value: string): void {
    this.patchFilters({ rangeField: value as RangeField, from: '', to: '' });
  }

  setFacetValue(facet: FacetDef, value: string): void {
    if (facet.key === 'species') {
      this.setSpecies(value);
    } else if (facet.key === 'locationId') {
      this.setLocation(value);
    }
  }

  onFacetOption(facet: FacetDef, option: FacetOption): void {
    const value = String(option.value);
    switch (facet.key) {
      case 'status':
        this.setStatus(value);
        break;
      case 'stage':
        this.toggleStage(value);
        break;
      case 'outcome':
        this.setOutcome(value);
        break;
      case 'method':
        this.setMethod(value);
        break;
      case 'sex':
        this.setSex(value);
        break;
      default:
        break;
    }
  }

  /** Presets look forward while planning (pregnancies) and back for the log. */
  applyPreset(days: string): void {
    const today = todayIso();
    const span = Number(days);
    if (this.tab() === 'pregnancies') {
      this.patchFilters({ from: today, to: addDays(today, span) });
      return;
    }
    this.patchFilters({ from: addDays(today, -span), to: today });
  }

  setFrom(value: string): void {
    this.patchFilters({ from: toIsoDate(value) });
  }

  setTo(value: string): void {
    this.patchFilters({ to: toIsoDate(value) });
  }

  clearRange(): void {
    this.patchFilters({ from: '', to: '' });
  }

  toggleAttention(): void {
    this.patchFilters({ attentionOnly: !this.activeFilters().attentionOnly });
  }

  clearFilters(): void {
    const tab = this.tab();
    const next = restingFilters(tab);
    this.filters.update((all) => ({ ...all, [tab]: next }));
    this.pages.update((all) => ({ ...all, [tab]: 1 }));
  }

  removeFilterChip(key: string): void {
    this.patchFilters(removeChip(this.activeFilters(), key) as Partial<BreedingFilters>);
  }

  applyKpi(key: string): void {
    const kpi = this.kpis().find((item) => item.key === key);
    if (!kpi) {
      return;
    }
    const tab = this.tab();
    this.filters.update((all) => ({ ...all, [tab]: toggleKpiFilter(all[tab], kpi, tab, todayIso()) }));
    this.pages.update((all) => ({ ...all, [tab]: 1 }));
  }

  /* ---------------- chart interactions ---------------- */

  onBucket(bucket: TimelineBucket): void {
    const filters = this.activeFilters();
    const field = this.timelineChart().field;
    if (filters.rangeField === field && filters.from === bucket.from && filters.to === bucket.to) {
      this.clearRange();
      return;
    }
    this.patchFilters({ rangeField: field, from: bucket.from, to: bucket.to });
  }

  onSlice(key: string): void {
    const tab = this.tab();
    if (tab === 'pregnancies') {
      this.toggleStage(key);
      return;
    }
    if (tab === 'births') {
      this.setSex(this.activeFilters().sex === key ? '' : key);
      return;
    }
    this.setOutcome(key);
  }

  onLocationBar(key: string): void {
    const id = key === '0' ? null : Number(key);
    this.patchFilters({ locationId: this.activeFilters().locationId === id ? null : id });
  }

  onPartnerBar(key: string): void {
    const current = this.activeFilters().partner;
    this.patchFilters({ partner: current === key ? '' : key });
  }

  clearPartner(): void {
    this.patchFilters({ partner: '' });
  }

  /* ---------------- sorting and paging controls ---------------- */

  sortBy(key: string): void {
    const current = this.activeSort();
    const descFirst = ['date', 'age', 'progress', 'due', 'weight'].includes(key);
    const next: BreedingSort =
      current.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: descFirst ? 'desc' : 'asc' };
    const tab = this.tab();
    this.sorts.update((all) => ({ ...all, [tab]: next }));
  }

  sortIndicator(key: string): string {
    const sort = this.activeSort();
    return sort.key === key ? sort.direction : '';
  }

  setPageSize(size: number): void {
    this.pageSize.set(Number(size));
    const tab = this.tab();
    this.pages.update((all) => ({ ...all, [tab]: 1 }));
  }

  setPage(page: number): void {
    const tab = this.tab();
    const total = this.paged().pagination.pages;
    const next = Math.min(Math.max(1, page), total);
    this.pages.update((all) => ({ ...all, [tab]: next }));
  }

  pageWindow(): number[] {
    const { page, pages } = this.paged().pagination;
    const start = Math.max(1, Math.min(page - 2, pages - 4));
    const end = Math.min(pages, start + 4);
    return Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => start + index);
  }

  isRangeActive(days: string): boolean {
    const filters = this.activeFilters();
    const today = todayIso();
    const span = Number(days);
    return this.tab() === 'pregnancies'
      ? filters.from === today && filters.to === addDays(today, span)
      : filters.from === addDays(today, -span) && filters.to === today;
  }

  /** Current value for a `<select>`-style facet. */
  facetValue(facet: FacetDef): string | number {
    const filters = this.activeFilters();
    if (facet.key === 'species') {
      return filters.species;
    }
    if (facet.key === 'locationId') {
      return filters.locationId ?? '';
    }
    return '';
  }

  /** Highlight state for segmented / chip / toggle facet controls. */
  isOptionActive(facet: FacetDef, option: FacetOption): boolean {
    const filters = this.activeFilters();
    const value = String(option.value);
    switch (facet.key) {
      case 'status':
        return filters.status === value;
      case 'stage':
        return filters.stage.includes(value);
      case 'outcome':
        return filters.outcome === value;
      case 'method':
        return filters.method === value;
      case 'sex':
        return filters.sex === value;
      case 'attentionOnly':
        return filters.attentionOnly;
      default:
        return false;
    }
  }

  dismissMessage(): void {
    this.message.set('');
  }

  focusSearch(): void {
    this.searchInput?.nativeElement.focus();
  }

  exportCsv(): void {
    const csv = rowsToCsv(this.sorted(), this.currentTabDef().columns, this.tab());
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `evolex-breeding-${this.tab()}-${todayIso()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    this.message.set(`${this.sorted().length} rows exported.`);
  }

  print(): void {
    window.print();
  }

  /* ---------------- dialog ---------------- */

  private get writable(): boolean {
    return this.tab() === 'cycles' || this.tab() === 'pregnancies';
  }

  openCreate(): void {
    const tab = this.tab();
    if (!this.writable) {
      return;
    }
    this.dialogTab.set(tab);
    this.selectedRow.set(null);
    this.serverError.set('');
    this.dialogMode.set('create');
    if (tab === 'cycles') {
      this.cycleForm.reset({ female_id: null, male_id: null, breeding_date: todayIso(), method: 'natural', status: 'completed', notes: '' });
    } else {
      this.pregnancyForm.reset({ animal_id: null, confirmed_date: todayIso(), expected_birth_date: '', status: 'active', notes: '' });
    }
    this.focusDialogField();
  }

  openEdit(row: BreedingRow): void {
    if (row.tab === 'cycles') {
      const record = row.raw as BreedingRecord;
      this.dialogTab.set('cycles');
      this.selectedRow.set(row);
      this.serverError.set('');
      this.dialogMode.set('edit');
      this.cycleForm.reset({
        female_id: record.female_id,
        male_id: record.male_id ?? null,
        breeding_date: toIsoDate(record.breeding_date),
        method: record.method ?? 'natural',
        status: record.status ?? 'completed',
        notes: record.notes ?? ''
      });
      this.focusDialogField();
      return;
    }

    if (row.tab === 'pregnancies') {
      const record = row.raw as PregnancyRecord;
      this.dialogTab.set('pregnancies');
      this.selectedRow.set(row);
      this.serverError.set('');
      this.dialogMode.set('edit');
      this.pregnancyForm.reset({
        animal_id: record.animal_id,
        confirmed_date: toIsoDate(record.confirmed_date),
        expected_birth_date: toIsoDate(record.expected_birth_date),
        status: record.status ?? 'active',
        notes: record.notes ?? ''
      });
      this.focusDialogField();
    }
  }

  openView(row: BreedingRow): void {
    this.dialogTab.set(row.tab);
    this.selectedRow.set(row);
    this.serverError.set('');
    this.dialogMode.set('view');
  }

  askDelete(row: BreedingRow): void {
    if (row.tab === 'births') {
      return;
    }
    this.dialogTab.set(row.tab);
    this.selectedRow.set(row);
    this.serverError.set('');
    this.dialogMode.set('delete');
  }

  closeDialog(): void {
    this.dialogMode.set(null);
    this.selectedRow.set(null);
    this.serverError.set('');
    this.saving.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.dialogMode()) {
      this.closeDialog();
    }
  }

  @HostListener('document:keydown', ['$event'])
  onShortcut(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    const typing = !!target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
    if (event.key === '/' && !typing && !this.dialogMode()) {
      event.preventDefault();
      this.focusSearch();
    }
  }

  save(): void {
    const tab = this.dialogTab();
    const form = tab === 'cycles' ? this.cycleForm : this.pregnancyForm;
    if (form.invalid) {
      form.markAllAsTouched();
      return;
    }

    const endpoint = tabDef(tab).writeEndpoint;
    if (!endpoint) {
      return;
    }
    const editing = this.dialogMode() === 'edit' ? this.selectedRow() : null;
    const payload: Record<string, unknown> = {};
    Object.entries(form.getRawValue() as Record<string, unknown>).forEach(([key, value]) => {
      payload[key] = value === '' || value === null ? null : value;
    });

    this.saving.set(true);
    this.serverError.set('');

    const request = editing ? this.api.put(`${endpoint}/${editing.id}`, payload) : this.api.post(endpoint, payload);

    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.saving.set(false);
        this.message.set(editing ? 'Record updated.' : tab === 'cycles' ? 'Breeding cycle saved.' : 'Pregnancy saved.');
        this.closeDialog();
        this.load(true);
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.serverError.set(this.describeError(error));
      }
    });
  }

  confirmDelete(): void {
    const row = this.selectedRow();
    if (!row || row.tab === 'births') {
      return;
    }
    this.saving.set(true);
    this.serverError.set('');

    const endpoint = tabDef(row.tab).writeEndpoint;
    if (!endpoint) {
      return;
    }

    this.api
      .delete(`${endpoint}/${row.id}`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.message.set('Record deleted.');
          this.closeDialog();
          this.load(true);
        },
        error: (error: HttpErrorResponse) => {
          this.saving.set(false);
          this.serverError.set(this.describeError(error));
        }
      });
  }

  private focusDialogField(): void {
    setTimeout(() => this.dialogFirstField?.nativeElement?.focus());
  }

  private describeError(error: HttpErrorResponse): string {
    const errors = error?.error?.errors;
    if (errors && typeof errors === 'object') {
      return Object.values(errors as Record<string, string[]>)
        .flat()
        .join(' ');
    }
    return error?.error?.message ?? 'Could not save this record. Please try again.';
  }

  /** Animal label helper for the form selects and the detail panel. */
  animalLabel(animal: AnimalRef): string {
    const parts = [animal.animal_id];
    if (animal.species) {
      parts.push(animal.species);
    }
    if ((animal.status ?? 'alive') !== 'alive') {
      parts.push(`(${animal.status})`);
    }
    return parts.join(' · ');
  }

  /** "12 days old" for a calf, "3 months ago" for a service. */
  relativeAge(row: BreedingRow): string {
    if (row.tab === 'births') {
      return row.ageDays === 0 ? 'born today' : `${formatDays(row.ageDays)} old`;
    }
    if (row.ageDays === 0) {
      return 'today';
    }
    if (row.ageDays < 60) {
      return `${formatDays(row.ageDays)} ago`;
    }
    const months = Math.round(row.ageDays / 30.44);
    return `${months} ${pluralize(months, 'month')} ago`;
  }

  get dueWindowLabel(): string {
    const summary = this.herdSummary();
    if (!summary.nextDue) {
      return 'no birth dates in the forecast window';
    }
    return `next due ${formatDateShort(summary.nextDue.dueDate)} (${summary.nextDue.animalCode})`;
  }

  get tabNoun(): string {
    const tab = this.tab();
    return tab === 'pregnancies' ? pluralize(this.paged().pagination.total, 'pregnancy', 'pregnancies') : tab === 'births' ? 'births' : 'breeding cycles';
  }
}
