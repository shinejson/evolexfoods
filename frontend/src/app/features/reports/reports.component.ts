import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import {
  REPORT_GROUPS,
  REPORT_GROUP_RESOLVERS,
  REPORT_ROW_FIELD,
  REPORT_TEMPLATES,
  ReportFilterDef,
  ReportTemplateDef,
  labelize
} from './report-templates';
import { buildReportDocument, ReportDocumentModel } from './report-document';

interface FilterOption {
  value: string;
  label: string;
}

interface LocationChip {
  id: string;
  label: string;
}

interface SidebarItem {
  id: string;
  title: string;
  favorite: boolean;
}

interface SidebarSection {
  label: string;
  expanded: boolean;
  items: SidebarItem[];
}

const TERMINAL_STATUSES = ['culled', 'sold', 'archived', 'inactive', 'cancelled'];

const TEMPLATE_PRESETS = ['New Report', 'Weekly Summary', 'Monthly Summary', 'Board Pack', 'Field Handover'];

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss'
})
export class ReportsComponent implements OnInit {
  readonly groups = REPORT_GROUPS;
  readonly presets = TEMPLATE_PRESETS;
  readonly copiesOptions = [1, 2, 3, 5];

  selectedId = 'livestock_summary';
  templateName = 'New Report';
  sidebarQuery = '';
  expanded: Record<string, boolean> = { 'Recommended Reports': true };

  dateFrom = this.isoDate(new Date());
  dateTo = this.isoDate(new Date());
  locationChips: LocationChip[] = [];
  locationQuery = '';
  locationPickerOpen = false;
  copies = 1;
  includeArchived = false;
  search = '';
  filterValues: Record<string, string> = {};

  favorites = new Set<string>();
  savedTemplates: Record<string, string[]> = {};

  rows: any[] = [];
  lookups: any = null;
  loading = false;
  generating = false;
  error = '';
  lastGenerated: Date | null = null;
  previewRows = 0;
  previewGroups = 0;
  businessName = 'Evolex Farms';

  private allLocations: { id: number; name: string; code?: string }[] = [];

  constructor(private readonly api: ApiService) {}

  ngOnInit(): void {
    this.favorites = new Set<string>(this.readJson('reportFavorites', []));
    this.savedTemplates = this.readJson('reportTemplates', {});
    this.loadLookups();
    this.selectReport(this.selectedId);
  }

  /* ------------------------------------------------------------------ data */

  get template(): ReportTemplateDef {
    return REPORT_TEMPLATES[this.selectedId];
  }

  private loadLookups(): void {
    this.api.get<any>('/lookups').subscribe({
      next: (data) => {
        this.lookups = data ?? {};
        this.allLocations = (this.lookups.locations ?? []).map((loc: any) => ({
          id: loc.id,
          name: loc.name,
          code: loc.code
        }));
      },
      error: () => {
        this.lookups = {};
      }
    });
  }

  selectReport(id: string): void {
    if (!REPORT_TEMPLATES[id]) {
      return;
    }
    this.selectedId = id;
    this.filterValues = {};
    this.search = '';
    this.locationPickerOpen = false;
    this.restoreState(id);
    this.loadRows();
  }

  private loadRows(): void {
    this.loading = true;
    this.error = '';
    this.api.get<{ data: any[] }>(this.template.endpoint).subscribe({
      next: (response) => {
        this.rows = response?.data ?? [];
        this.loading = false;
        this.refreshPreview();
      },
      error: () => {
        this.rows = [];
        this.loading = false;
        this.error = 'Could not load the data for this report. Check your connection and try again.';
      }
    });
  }

  /* --------------------------------------------------------------- filters */

  optionsFor(def: ReportFilterDef): FilterOption[] {
    const source = def.source;
    if (source === 'location' && this.allLocations.length) {
      return this.allLocations.map((loc) => ({
        value: String(loc.id),
        label: `${loc.code ? loc.code + ' — ' : ''}${loc.name}`
      }));
    }
    if (source === 'supplier' && this.lookups?.suppliers?.length) {
      return this.lookups.suppliers.map((s: any) => ({ value: String(s.id), label: s.name }));
    }
    if (source === 'user' && this.lookups?.users?.length) {
      return this.lookups.users.map((u: any) => ({ value: String(u.id), label: u.name }));
    }
    if (source === 'employee' && this.lookups?.employees?.length) {
      return this.lookups.employees.map((e: any) => ({ value: String(e.id), label: e.name }));
    }
    const field = REPORT_ROW_FIELD[source];
    if (!field) {
      return [];
    }
    const values = new Set<string>();
    this.rows.forEach((row) => {
      const raw = row[field];
      if (raw !== null && raw !== undefined && raw !== '') {
        values.add(String(raw));
      }
    });
    return [...values].sort().map((value) => ({ value, label: labelize(value) }));
  }

  toggleLocation(loc: { id: number; name: string; code?: string }): void {
    const id = String(loc.id);
    const existing = this.locationChips.find((chip) => chip.id === id);
    if (existing) {
      this.locationChips = this.locationChips.filter((chip) => chip.id !== id);
    } else {
      this.locationChips = [...this.locationChips, { id, label: `${loc.code ? loc.code + ' ' : ''}(${loc.name})` }];
    }
    this.locationQuery = '';
    this.refreshPreview();
  }

  removeLocation(id: string): void {
    this.locationChips = this.locationChips.filter((chip) => chip.id !== id);
    this.refreshPreview();
  }

  get filteredLocations(): { id: number; name: string; code?: string }[] {
    const query = this.locationQuery.trim().toLowerCase();
    if (!query) {
      return this.allLocations;
    }
    return this.allLocations.filter(
      (loc) => loc.name.toLowerCase().includes(query) || (loc.code ?? '').toLowerCase().includes(query)
    );
  }

  get locationLabel(): string {
    if (!this.locationChips.length) {
      return 'All Locations';
    }
    return this.locationChips.map((chip) => chip.label).join(', ');
  }

  isLocationSelected(loc: { id: number }): boolean {
    return this.locationChips.some((chip) => chip.id === String(loc.id));
  }

  private matchesFilters(row: any): boolean {
    const template = this.template;

    if (template.dateField) {
      const value = row[template.dateField];
      if (value) {
        const day = String(value).slice(0, 10);
        if (this.dateFrom && day < this.dateFrom) {
          return false;
        }
        if (this.dateTo && day > this.dateTo) {
          return false;
        }
      }
    }

    if (this.locationChips.length && (row.location_id || row.location?.id)) {
      const locId = String(row.location_id ?? row.location?.id);
      if (!this.locationChips.some((chip) => chip.id === locId)) {
        return false;
      }
    }

    for (const def of template.filters) {
      const selected = this.filterValues[def.key];
      if (!selected) {
        continue;
      }
      if (def.source === 'supplier') {
        const supplierName = row.supplier?.name ?? row.supplier_name;
        if (String(supplierName ?? '') !== selected) {
          return false;
        }
        continue;
      }
      const field = REPORT_ROW_FIELD[def.source] ?? def.key;
      if (String(row[field] ?? '') !== selected) {
        return false;
      }
    }

    if (!this.includeArchived && TERMINAL_STATUSES.includes(String(row.status ?? '').toLowerCase())) {
      return false;
    }

    if (this.search.trim()) {
      const haystack = JSON.stringify(row).toLowerCase();
      if (!haystack.includes(this.search.trim().toLowerCase())) {
        return false;
      }
    }

    return true;
  }

  get filterSummary(): string {
    const parts: string[] = [];
    this.template.filters.forEach((def) => {
      const value = this.filterValues[def.key];
      if (value) {
        parts.push(`${def.label}: ${labelize(value)}`);
      }
    });
    if (this.includeArchived) {
      parts.push('Including archived records');
    }
    if (this.search.trim()) {
      parts.push(`Search: "${this.search.trim()}"`);
    }
    return parts.join(' · ');
  }


  /* ----------------------------------------------------------- aggregation */

  private refreshPreview(): void {
    const filtered = this.rows.filter((row) => this.matchesFilters(row));
    this.previewRows = filtered.length;
    this.previewGroups = new Set(filtered.map((row) => REPORT_GROUP_RESOLVERS[this.template.groupBy](row))).size;
    this.persistState();
  }

  onFilterChange(): void {
    this.refreshPreview();
  }

  private aggregate(
    column: { value?: (row: any) => number | string | null; aggregate?: string; kind: string },
    rows: any[]
  ): string {
    if (!column.value) {
      return formatNumber(rows.length, column.kind);
    }
    const values = rows.map((row) => column.value!(row));
    const numbers = values.filter((v): v is number => typeof v === 'number');

    switch (column.aggregate) {
      case 'count':
        return formatNumber(rows.length, column.kind);
      case 'count-distinct':
        return formatNumber(new Set(values.map((v) => String(v))).size, column.kind);
      case 'avg':
        return numbers.length
          ? formatNumber(numbers.reduce((acc, value) => acc + value, 0) / numbers.length, column.kind)
          : formatNumber(0, column.kind);
      default:
        return formatNumber(numbers.reduce((acc, value) => acc + value, 0), column.kind);
    }
  }

  private cellText(
    column: { value?: (row: any) => number | string | null; kind: string; unit?: string },
    row: any
  ): string {
    if (!column.value) {
      return '—';
    }
    const value = column.value(row);
    if (value === null || value === undefined || value === '') {
      return '—';
    }
    if (typeof value === 'number') {
      return formatNumber(value, column.kind, column.unit);
    }
    return String(value);
  }

  private firstColumnLabel(): string {
    switch (this.template.groupBy) {
      case 'location':
        return 'Location';
      case 'department':
        return 'Department';
      case 'condition':
        return 'Condition';
      case 'medicine':
        return 'Medicine';
      case 'supplier':
        return 'Supplier';
      case 'category':
        return 'Category';
      case 'breed':
        return 'Breed';
      case 'module':
        return 'Module';
      case 'type':
        return 'Type';
      case 'status':
        return 'Status';
      default:
        return 'Species';
    }
  }

  private buildModel(): ReportDocumentModel {
    const template = this.template;
    const filtered = this.rows.filter((row) => this.matchesFilters(row));
    const buckets = new Map<string, any[]>();
    filtered.forEach((row) => {
      const label = REPORT_GROUP_RESOLVERS[template.groupBy](row);
      if (!buckets.has(label)) {
        buckets.set(label, []);
      }
      buckets.get(label)!.push(row);
    });

    const groups = [...buckets.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([label, rows]) => ({
        label,
        rows: rows.map((row) => ({
          cells: [
            row.animal_id ?? row.employee_code ?? row.item_id ?? row.ticket_number ?? label,
            ...template.columns.map((col) => this.cellText(col as any, row))
          ]
        })),
        subtotal: template.columns.map((col) => this.aggregate(col as any, rows))
      }));

    return {
      businessName: this.businessName,
      title: template.title,
      templateName: this.templateName,
      dateFrom: this.dateFrom,
      dateTo: this.dateTo,
      locationLabel: this.locationLabel,
      filterSummary: this.filterSummary,
      generatedAt: new Date().toLocaleString(),
      columns: [
        { label: this.firstColumnLabel(), align: 'left' },
        ...template.columns.map((col) => ({ label: col.label, align: col.align ?? 'right' }))
      ],
      groups,
      grandTotal: template.columns.map((col) => this.aggregate(col as any, filtered)),
      emptyHint: template.emptyHint,
      hasData: filtered.length > 0
    };
  }


  /* -------------------------------------------------------------- actions */

  runReport(): void {
    this.generating = true;
    this.error = '';
    const doc = buildReportDocument(this.buildModel());
    const tab = window.open('', '_blank');
    if (!tab) {
      this.generating = false;
      this.error = 'The report tab was blocked by your browser. Allow pop-ups for this site and try again.';
      return;
    }
    tab.document.open();
    tab.document.write(doc);
    tab.document.close();
    this.generating = false;
    this.lastGenerated = new Date();
  }

  reset(): void {
    this.filterValues = {};
    this.search = '';
    this.locationChips = [];
    this.includeArchived = false;
    this.copies = 1;
    const today = this.isoDate(new Date());
    this.dateFrom = today;
    this.dateTo = today;
    this.refreshPreview();
  }

  applyQuickRange(range: 'today' | 'week' | 'month' | 'last30'): void {
    const today = new Date();
    const from = new Date(today);
    if (range === 'week') {
      from.setDate(today.getDate() - 7);
    } else if (range === 'month') {
      from.setMonth(today.getMonth() - 1);
    } else if (range === 'last30') {
      from.setDate(today.getDate() - 30);
    }
    this.dateFrom = this.isoDate(from);
    this.dateTo = this.isoDate(today);
    this.refreshPreview();
  }

  saveTemplate(): void {
    const existing = this.savedTemplates[this.selectedId] ?? [];
    const name = `${this.template.title} ${existing.length + 1}`;
    this.savedTemplates = { ...this.savedTemplates, [this.selectedId]: [...existing, name] };
    localStorage.setItem('reportTemplates', JSON.stringify(this.savedTemplates));
    this.templateName = name;
  }

  get templateOptions(): string[] {
    const saved = this.savedTemplates[this.selectedId] ?? [];
    return [...new Set([...TEMPLATE_PRESETS, ...saved])];
  }

  toggleFavorite(id: string): void {
    if (this.favorites.has(id)) {
      this.favorites.delete(id);
    } else {
      this.favorites.add(id);
    }
    localStorage.setItem('reportFavorites', JSON.stringify([...this.favorites]));
  }

  isFavorite(id: string): boolean {
    return this.favorites.has(id);
  }

  /* -------------------------------------------------------------- sidebar */

  toggleSection(label: string): void {
    this.expanded = { ...this.expanded, [label]: !this.expanded[label] };
  }

  trackByLabel(_index: number, section: SidebarSection): string {
    return section.label;
  }

  get sidebarSections(): SidebarSection[] {
    const query = this.sidebarQuery.trim().toLowerCase();
    const matchesQuery = (value: string) => !query || value.toLowerCase().includes(query);
    return this.groups
      .map((group) => ({
        label: group.label,
        expanded: this.expanded[group.label] ?? group.label === 'Recommended Reports',
        items: group.reports
          .filter((id) => REPORT_TEMPLATES[id])
          .map((id) => ({ id, title: REPORT_TEMPLATES[id].title, favorite: this.favorites.has(id) }))
          .filter((item) => matchesQuery(item.title) || matchesQuery(group.label))
      }))
      .filter((section) => matchesQuery(section.label) || section.items.length > 0);
  }


  /* ------------------------------------------------------------- helpers */

  private readJson<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  }

  private persistState(): void {
    const all = this.readJson<Record<string, any>>('reportStates', {});
    all[this.selectedId] = {
      dateFrom: this.dateFrom,
      dateTo: this.dateTo,
      locationChips: this.locationChips,
      includeArchived: this.includeArchived,
      search: this.search,
      filterValues: this.filterValues
    };
    try {
      localStorage.setItem('reportStates', JSON.stringify(all));
    } catch {
      /* storage unavailable — state simply will not persist */
    }
  }

  private restoreState(id: string): void {
    const state = this.readJson<Record<string, any>>('reportStates', {})[id];
    const today = this.isoDate(new Date());
    if (!state) {
      this.dateFrom = today;
      this.dateTo = today;
      this.locationChips = [];
      this.includeArchived = false;
      this.search = '';
      this.filterValues = {};
      return;
    }
    this.dateFrom = state.dateFrom ?? today;
    this.dateTo = state.dateTo ?? this.dateFrom;
    this.locationChips = state.locationChips ?? [];
    this.includeArchived = !!state.includeArchived;
    this.search = state.search ?? '';
    this.filterValues = state.filterValues ?? {};
  }

  private isoDate(date: Date): string {
    const copy = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return copy.toISOString().slice(0, 10);
  }
}

function formatNumber(value: number, kind: string, unit?: string): string {
  const safe = Number.isFinite(value) ? value : 0;
  if (kind === 'money') {
    return `₵${safe.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (kind === 'count') {
    return Math.round(safe).toLocaleString('en-GH');
  }
  const formatted = safe.toLocaleString('en-GH', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return unit ? `${formatted} ${unit}` : formatted;
}

