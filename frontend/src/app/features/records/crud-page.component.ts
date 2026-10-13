import { AfterViewInit, Component, ElementRef, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import DataTable from 'datatables.net';
import { ApiService } from '../../core/services/api.service';
import { CRUD_RESOURCES, FieldDef, ResourceDef } from './crud.registry';

@Component({
  selector: 'app-crud-page',
  standalone: true,
  imports: [NgFor, NgIf, FormsModule],
  templateUrl: './crud-page.component.html',
  styleUrl: './crud-page.component.scss'
})
export class CrudPageComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('table') tableRef?: ElementRef<HTMLTableElement>;

  resource = '';
  def!: ResourceDef;
  rows: any[] = [];
  lookups: any = {};
  form: Record<string, any> = {};
  editingId: number | null = null;
  showForm = false;
  message = '';
  error = '';
  table: any;
  viewReady = false;
  private clickBound = false;

  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
    private zone: NgZone
  ) {}

  ngOnInit(): void {
    this.route.data.subscribe((data) => {
      this.resource = data['resource'];
      this.def = CRUD_RESOURCES[this.resource];
      this.showForm = false;
      this.message = '';
      this.error = '';
      this.destroyTable();
      this.loadLookups();
      this.load();
    });
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.bindClicks();
    this.renderTable();
  }

  ngOnDestroy(): void {
    this.destroyTable();
  }

  loadLookups(): void {
    this.api.get<any>('/lookups').subscribe((data) => this.lookups = data);
  }

  load(): void {
    this.api.get<{ data: any[] }>(`/records/${this.resource}`).subscribe((res) => {
      this.rows = res.data || [];
      this.renderTable();
    });
  }

  optionsFor(field: FieldDef): { value: any; label: string }[] {
    if (field.options) {
      return field.options;
    }
    if (field.lookup) {
      const source = this.lookups[field.lookup] || [];
      const valueKey = field.lookupValue || 'id';
      return source.map((item: any) => ({
        value: item[valueKey],
        label: this.lookupLabel(field.lookup as string, item)
      }));
    }
    return [];
  }

  openCreate(): void {
    this.editingId = null;
    this.form = { ...(this.def.defaults || {}) };
    this.showForm = true;
    this.error = '';
  }

  openEdit(row: any): void {
    this.editingId = row.id;
    this.form = {};
    this.def.fields.forEach((field) => {
      const value = row[field.key];
      this.form[field.key] = field.type === 'date' ? this.toDateInput(value) : (value ?? '');
    });
    this.showForm = true;
    this.error = '';
  }

  cancel(): void {
    this.showForm = false;
    this.editingId = null;
  }

  save(): void {
    const payload: Record<string, any> = {};
    this.def.fields.forEach((field) => {
      const value = this.form[field.key];
      payload[field.key] = value === '' ? null : value;
    });

    const req = this.editingId
      ? this.api.put(`/records/${this.resource}/${this.editingId}`, payload)
      : this.api.post(`/records/${this.resource}`, payload);

    req.subscribe({
      next: () => {
        this.message = this.editingId ? 'Record updated.' : 'Record created.';
        this.showForm = false;
        this.load();
        this.loadLookups();
      },
      error: (err) => {
        const errors = err?.error?.errors;
        this.error = errors ? Object.values(errors).flat().join(' ') : (err?.error?.message || 'Could not save this record.');
      }
    });
  }

  remove(row: any): void {
    if (!confirm(`Delete this ${this.def.title.toLowerCase()} record?`)) {
      return;
    }
    this.api.delete(`/records/${this.resource}/${row.id}`).subscribe({
      next: () => {
        this.message = 'Record deleted.';
        this.load();
      },
      error: (err) => this.error = err?.error?.message || 'Could not delete this record.'
    });
  }

  private lookupLabel(lookup: string, item: any): string {
    if (lookup === 'animals') {
      return item.animal_id;
    }
    if (lookup === 'assets') {
      return `${item.asset_id} ${item.name}`;
    }
    if (lookup === 'users' || lookup === 'employees' || lookup === 'suppliers' || lookup === 'companies' || lookup === 'locations') {
      return item.name;
    }
    return item.name || item.title || String(item.id);
  }

  private toDateInput(value: any): string {
    if (!value) {
      return '';
    }
    return String(value).slice(0, 10);
  }

  private bindClicks(): void {
    if (this.clickBound || !this.tableRef) {
      return;
    }
    this.clickBound = true;
    this.tableRef.nativeElement.addEventListener('click', (event: Event) => {
      const target = (event.target as HTMLElement).closest('button') as HTMLButtonElement | null;
      if (!target) {
        return;
      }
      const id = Number(target.getAttribute('data-id'));
      const row = this.rows.find((item) => item.id === id);
      if (!row) {
        return;
      }
      if (target.classList.contains('js-edit')) {
        this.zone.run(() => this.openEdit(row));
      }
      if (target.classList.contains('js-delete')) {
        this.zone.run(() => this.remove(row));
      }
    });
  }

  private renderTable(): void {
    if (!this.viewReady || !this.tableRef || !this.def) {
      return;
    }

    this.destroyTable();
    const badgeKeys = ['status', 'severity', 'priority', 'sex', 'health_status'];
    const columns = [
      ...this.def.columns.map((col) => ({
        title: col.label,
        data: col.key,
        defaultContent: '',
        render: (_data: any, _type: string, row: any) => {
          const value = col.render ? col.render(row) : (row[col.key] ?? '');
          if (badgeKeys.includes(col.key) && value) {
            return `<span class="badge ${value}">${value}</span>`;
          }
          return value === null || value === undefined ? '' : String(value);
        }
      })),
      {
        title: 'Actions',
        data: null,
        orderable: false,
        searchable: false,
        defaultContent: '',
        className: 'col-actions',
        // Icon-only actions: DataTables renders this HTML outside Angular's view,
        // so the styles live in global scope (styles.scss .row-actions/.icon-btn).
        render: (_data: any, _type: string, row: any) =>
          `<div class="row-actions">
            <button class="icon-btn js-edit" data-id="${row.id}" type="button"
              title="Edit record" aria-label="Edit record">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L20 8l-4-4L4 16v4Zm10-14 4 4"/></svg>
            </button>
            <button class="icon-btn icon-btn--danger js-delete" data-id="${row.id}" type="button"
              title="Delete record" aria-label="Delete record">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 7V4h4v3m-7 0 1 13h8l1-13M10 11v6m4-6v6"/></svg>
            </button>
          </div>`
      }
    ];

    this.table = new DataTable(this.tableRef.nativeElement, {
      data: this.rows,
      columns,
      pageLength: 10,
      lengthMenu: [10, 25, 50, 100],
      order: [],
      autoWidth: false,
      destroy: true,
      language: { search: 'Search records:' }
    });
  }

  private destroyTable(): void {
    if (this.table) {
      this.table.destroy();
      this.table = null;
    }
    if (this.tableRef?.nativeElement) {
      const tbody = this.tableRef.nativeElement.querySelector('tbody');
      if (tbody) {
        tbody.innerHTML = '';
      }
    }
  }
}
