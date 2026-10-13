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
  DialogMode,
  FacetDef,
  FacetOption,
  HealthFilters,
  HealthRecord,
  HealthRow,
  HealthSort,
  HealthTab,
  Lookups,
  Treatment
} from './health.models';
import {
  AGEING_DAYS,
  DEFAULT_PAGE_SIZE_VALUE,
  TABS,
  activeFilterCount,
  applyFilters,
  buildFacets,
  buildKpis,
  buildRows,
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
  todayIso,
  toggleKpiFilter
} from './health.insights';

type LoadState = 'loading' | 'ready' | 'error';

const EMPTY_LOOKUPS: Lookups = { locations: [], animals: [] };

@Component({
  selector: 'app-health',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './health.component.html',
  styleUrl: './health.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HealthComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly titleService = inject(Title);

  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;
  @ViewChild('dialogFirstField') dialogFirstField?: ElementRef<HTMLElement>;

  readonly tabs = TABS;
  readonly ageingDays = AGEING_DAYS;
  readonly pageSizes = [10, 25, 50, 100];
  readonly titleCase = titleCase;
  readonly formatDate = formatDate;
  readonly formatAge = formatAge;

  readonly state = signal<LoadState>('loading');
  readonly errorMessage = signal('');
  readonly message = signal('');
  readonly saving = signal(false);
  readonly tab = signal<HealthTab>('cases');
  readonly filters = signal<Record<HealthTab, HealthFilters>>({
    cases: this.blankFilters(),
    treatments: this.blankFilters()
  });
  readonly sorts = signal<Record<HealthTab, HealthSort>>({
    cases: { key: 'date', direction: 'desc' },
    treatments: { key: 'date', direction: 'desc' }
  });
  readonly pages = signal<Record<HealthTab, number>>({ cases: 1, treatments: 1 });
  readonly pageSize = signal(DEFAULT_PAGE_SIZE_VALUE);
  readonly today = signal(todayIso());

  readonly dialogMode = signal<DialogMode | null>(null);
  readonly dialogTab = signal<HealthTab>('cases');
  readonly selectedRow = signal<HealthRow | null>(null);
  readonly serverError = signal('');

  private readonly records = signal<HealthRecord[]>([]);
  private readonly treatments = signal<Treatment[]>([]);
  private readonly lookups = signal<Lookups>(EMPTY_LOOKUPS);

  readonly caseForm = this.fb.nonNullable.group({
    animal_id: [null as number | null, Validators.required],
    recorded_date: [todayIso(), Validators.required],
    condition: ['', [Validators.required, Validators.maxLength(255)]],
    severity: ['moderate'],
    status: ['open'],
    notes: ['']
  });

  readonly treatmentForm = this.fb.nonNullable.group({
    animal_id: [null as number | null, Validators.required],
    start_date: [todayIso(), Validators.required],
    end_date: [''],
    treatment_type: ['', [Validators.required, Validators.maxLength(255)]],
    medicine: [''],
    dosage: [''],
    status: ['active'],
    notes: ['']
  });

  /* ---------------- derived state ---------------- */

  private readonly rowsByTab = computed(() => buildRows(this.records(), this.treatments(), this.lookups(), this.today()));

  readonly activeFilters = computed(() => this.filters()[this.tab()]);

  readonly activeSort = computed(() => this.sorts()[this.tab()]);

  readonly tabRows = computed(() => this.rowsByTab()[this.tab()]);

  readonly filtered = computed(() => applyFilters(this.tabRows(), this.activeFilters()));

  readonly sorted = computed(() => sortRows(this.filtered(), this.activeSort()));

  readonly paged = computed(() => paginate(this.sorted(), this.pages()[this.tab()], this.pageSize()));

  readonly facets = computed(() => buildFacets(this.tabRows(), this.tab(), this.lookups()));

  readonly kpis = computed(() => buildKpis(this.tabRows(), this.tab(), this.activeFilters(), this.today()));

  readonly chips = computed(() => filterChips(this.activeFilters(), this.lookups()));

  readonly filterCount = computed(() => activeFilterCount(this.activeFilters()));

  readonly tabCounts = computed(() => {
    const rows = this.rowsByTab();
    return { cases: rows.cases.length, treatments: rows.treatments.length };
  });

  readonly openSummary = computed(() => {
    const rows = this.rowsByTab().cases;
    return {
      open: rows.filter((row) => row.isOpen).length,
      ageing: rows.filter((row) => row.isOpen && row.ageDays >= AGEING_DAYS).length
    };
  });

  readonly currentTabDef = computed(() => tabDef(this.tab()));

  readonly emptyState = computed(() => emptyStateMessage(this.tabRows().length, this.filtered().length, this.tab()));

  readonly animalOptions = computed(() => {
    const animals = [...(this.lookups().animals ?? [])];
    return animals.sort((a, b) => {
      const aliveA = (a.status ?? 'alive') === 'alive' ? 0 : 1;
      const aliveB = (b.status ?? 'alive') === 'alive' ? 0 : 1;
      return aliveA - aliveB || a.animal_id.localeCompare(b.animal_id);
    });
  });

  /** Treatments raised for the animal in the open detail panel. */
  readonly relatedTreatments = computed(() => {
    const row = this.selectedRow();
    if (!row || row.tab !== 'cases') {
      return [];
    }
    return this.rowsByTab().treatments.filter((treatment) => treatment.animalId === row.animalId).slice(0, 5);
  });

  ngOnInit(): void {
    this.titleService.setTitle('Animal health · Evolex Hub');
    this.load();
  }

  /* ---------------- data ---------------- */

  load(silent = false): void {
    if (!silent) {
      this.state.set('loading');
    }
    this.errorMessage.set('');

    forkJoin({
      records: this.api.get<{ data: HealthRecord[] }>('/records/health'),
      treatments: this.api.get<{ data: Treatment[] }>('/records/treatments'),
      lookups: this.api.get<Lookups>('/lookups')
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ records, treatments, lookups }) => {
          this.records.set(records.data ?? []);
          this.treatments.set(treatments.data ?? []);
          this.lookups.set({
            locations: lookups.locations ?? [],
            animals: lookups.animals ?? []
          });
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
              ? 'Your session has expired. Sign in again to open the health workspace.'
              : 'We could not load health records. Check the API connection and try again.'
          );
        }
      });
  }

  refresh(): void {
    this.load(this.state() === 'ready');
  }

  /* ---------------- tabs, filters, sorting, paging ---------------- */

  setTab(tab: HealthTab): void {
    if (tab === this.tab()) {
      return;
    }
    this.tab.set(tab);
    this.message.set('');
  }

  private patchFilters(patch: Partial<HealthFilters>): void {
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

  toggleSeverity(value: string): void {
    const current = this.activeFilters().severity;
    const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
    this.patchFilters({ severity: next });
  }

  setFacetValue(facet: FacetDef, value: string): void {
    if (facet.key === 'condition') {
      this.patchFilters({ condition: value });
    } else if (facet.key === 'locationId') {
      this.patchFilters({ locationId: value === '' ? null : Number(value) });
    }
  }

  applyPreset(days: string): void {
    const to = todayIso();
    const from = new Date(new Date(`${to}T00:00:00`).getTime() - Number(days) * 86_400_000).toISOString().slice(0, 10);
    this.patchFilters({ from, to });
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

  toggleAgeing(): void {
    this.patchFilters({ ageingOnly: !this.activeFilters().ageingOnly });
  }

  clearFilters(): void {
    const tab = this.tab();
    this.filters.update((all) => ({ ...all, [tab]: this.blankFilters() }));
    this.pages.update((all) => ({ ...all, [tab]: 1 }));
  }

  removeChip(key: string): void {
    const patch: Partial<HealthFilters> =
      key === 'severity'
        ? { severity: [] }
        : key === 'locationId'
          ? { locationId: null }
          : key === 'range'
            ? { from: '', to: '' }
            : key === 'ageingOnly'
              ? { ageingOnly: false }
              : key === 'search'
                ? { search: '' }
                : { status: '' };
    this.patchFilters(patch);
  }

  applyKpi(key: string): void {
    const kpi = this.kpis().find((item) => item.key === key);
    if (!kpi) {
      return;
    }
    const tab = this.tab();
    this.filters.update((all) => ({ ...all, [tab]: toggleKpiFilter(all[tab], kpi) }));
    this.pages.update((all) => ({ ...all, [tab]: 1 }));
  }

  sortBy(key: string): void {
    const current = this.activeSort();
    const defaultDirection = key === 'date' || key === 'age' || key === 'severity' ? 'desc' : 'asc';
    const next: HealthSort =
      current.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: defaultDirection };
    const tab = this.tab();
    this.sorts.update((all) => ({ ...all, [tab]: next }));
  }

  sortIndicator(key: string): string {
    const sort = this.activeSort();
    return sort.key === key ? sort.direction : '';
  }

  isRangeActive(days: string): boolean {
    const filters = this.activeFilters();
    if (!filters.to) {
      return false;
    }
    const expectedFrom = new Date(new Date(`${todayIso()}T00:00:00`).getTime() - Number(days) * 86_400_000)
      .toISOString()
      .slice(0, 10);
    return filters.from === expectedFrom && filters.to === todayIso();
  }

  /** Current value for a `<select>`-style facet. */
  facetValue(facet: FacetDef): string | number {
    const filters = this.activeFilters();
    if (facet.key === 'condition') {
      return filters.condition;
    }
    if (facet.key === 'locationId') {
      return filters.locationId ?? '';
    }
    return '';
  }

  /** Highlight state for segmented / chip / toggle facet controls. */
  isOptionActive(facet: FacetDef, option: FacetOption): boolean {
    const filters = this.activeFilters();
    switch (facet.key) {
      case 'status':
        return filters.status === String(option.value);
      case 'severity':
        return filters.severity.includes(String(option.value));
      case 'condition':
        return filters.condition === String(option.value);
      case 'locationId':
        return filters.locationId === Number(option.value);
      case 'ageingOnly':
        return filters.ageingOnly;
      default:
        return false;
    }
  }

  onFacetOption(facet: FacetDef, option: FacetOption): void {
    switch (facet.key) {
      case 'status':
        this.setStatus(String(option.value));
        break;
      case 'severity':
        this.toggleSeverity(String(option.value));
        break;
      case 'ageingOnly':
        this.toggleAgeing();
        break;
      default:
        break;
    }
  }

  setPageSize(size: number): void {
    this.pageSize.set(Number(size));
    const tab = this.tab();
    this.pages.update((all) => ({ ...all, [tab]: 1 }));
  }

  setPage(page: number): void {
    const total = this.paged().pagination.pages;
    const next = Math.min(Math.max(1, page), total);
    const tab = this.tab();
    this.pages.update((all) => ({ ...all, [tab]: next }));
  }

  pageWindow(): number[] {
    const { page, pages } = this.paged().pagination;
    const start = Math.max(1, Math.min(page - 2, pages - 4));
    const end = Math.min(pages, start + 4);
    const window: number[] = [];
    for (let index = start; index <= end; index += 1) {
      window.push(index);
    }
    return window;
  }

  dismissMessage(): void {
    this.message.set('');
  }

  focusSearch(): void {
    this.searchInput?.nativeElement.focus();
  }

  /* ---------------- dialog ---------------- */

  openCreate(): void {
    const tab = this.tab();
    this.dialogTab.set(tab);
    this.selectedRow.set(null);
    this.serverError.set('');
    this.dialogMode.set('create');
    if (tab === 'cases') {
      this.caseForm.reset({ animal_id: null, recorded_date: todayIso(), condition: '', severity: 'moderate', status: 'open', notes: '' });
    } else {
      this.treatmentForm.reset({
        animal_id: null,
        start_date: todayIso(),
        end_date: '',
        treatment_type: '',
        medicine: '',
        dosage: '',
        status: 'active',
        notes: ''
      });
    }
    this.focusDialogField();
  }

  openEdit(row: HealthRow): void {
    this.dialogTab.set(row.tab);
    this.selectedRow.set(row);
    this.serverError.set('');
    this.dialogMode.set('edit');

    if (row.tab === 'cases') {
      const record = row.raw as HealthRecord;
      this.caseForm.reset({
        animal_id: record.animal_id,
        recorded_date: toIsoDate(record.recorded_date),
        condition: record.condition ?? '',
        severity: record.severity ?? 'moderate',
        status: record.status ?? 'open',
        notes: record.notes ?? ''
      });
    } else {
      const treatment = row.raw as Treatment;
      this.treatmentForm.reset({
        animal_id: treatment.animal_id,
        start_date: toIsoDate(treatment.start_date),
        end_date: toIsoDate(treatment.end_date ?? ''),
        treatment_type: treatment.treatment_type ?? '',
        medicine: treatment.medicine ?? '',
        dosage: treatment.dosage ?? '',
        status: treatment.status ?? 'active',
        notes: treatment.notes ?? ''
      });
    }
    this.focusDialogField();
  }

  openView(row: HealthRow): void {
    this.dialogTab.set(row.tab);
    this.selectedRow.set(row);
    this.serverError.set('');
    this.dialogMode.set('view');
  }

  askDelete(row: HealthRow): void {
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
    const form = tab === 'cases' ? this.caseForm : this.treatmentForm;
    if (form.invalid) {
      form.markAllAsTouched();
      return;
    }

    const value = form.getRawValue() as Record<string, unknown>;
    const payload: Record<string, unknown> = {};
    Object.entries(value).forEach(([key, entry]) => {
      payload[key] = entry === '' || entry === null ? null : entry;
    });
    const endpoint = tabDef(tab).endpoint;
    const editing = this.dialogMode() === 'edit' ? this.selectedRow() : null;

    this.saving.set(true);
    this.serverError.set('');

    const request = editing
      ? this.api.put(`${endpoint}/${editing.id}`, payload)
      : this.api.post(endpoint, payload);

    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.saving.set(false);
        this.message.set(editing ? 'Record updated.' : `New ${tab === 'cases' ? 'case' : 'treatment'} saved.`);
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
    if (!row) {
      return;
    }

    this.saving.set(true);
    this.serverError.set('');

    this.api
      .delete(`${tabDef(row.tab).endpoint}/${row.id}`)
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

  exportCsv(): void {
    const csv = rowsToCsv(this.sorted(), this.currentTabDef().columns, this.tab());
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `evolex-health-${this.tab()}-${todayIso()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    this.message.set(`${this.sorted().length} rows exported.`);
  }

  print(): void {
    window.print();
  }

  severityTone = severityTone;

  statusTone = statusTone;

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

  private blankFilters(): HealthFilters {
    return { search: '', status: '', severity: [], condition: '', locationId: null, from: '', to: '', ageingOnly: false };
  }

  /** Animal label helper used by the dialog's select and the detail panel. */
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
}
