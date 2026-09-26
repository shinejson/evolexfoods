import { Component, OnInit } from '@angular/core';
import { DecimalPipe, NgFor, NgIf } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-simple-list',
  standalone: true,
  imports: [NgFor, NgIf, DecimalPipe],
  templateUrl: './simple-list.component.html'
})
export class SimpleListComponent implements OnInit {
  title = '';
  subtitle = '';
  kpis: { label: string; value: any; cls?: string }[] = [];
  columns: { key: string; label: string }[] = [];
  rows: any[] = [];
  extraTitle = '';
  extraRows: any[] = [];
  extraColumns: { key: string; label: string }[] = [];

  constructor(private route: ActivatedRoute, private api: ApiService) {}

  ngOnInit(): void {
    const page = this.route.snapshot.data['page'];
    if (page === 'suppliers') {
      this.title = 'Suppliers';
      this.subtitle = 'Approved supplier directory.';
      this.api.get<any>('/suppliers').subscribe((d) => {
        this.kpis = [{ label: 'Suppliers', value: d.count }];
        this.columns = [
          { key: 'code', label: 'Code' }, { key: 'name', label: 'Name' },
          { key: 'category', label: 'Category' }, { key: 'phone', label: 'Phone' }, { key: 'rating', label: 'Rating' }
        ];
        this.rows = d.records;
      });
    }
    if (page === 'assets') {
      this.title = 'Asset Register';
      this.subtitle = 'Equipment Evolex owns.';
      this.api.get<any>('/assets').subscribe((d) => {
        this.kpis = [{ label: 'Assets', value: d.count }];
        this.columns = [
          { key: 'asset_id', label: 'ID' }, { key: 'name', label: 'Name' },
          { key: 'category', label: 'Category' }, { key: 'condition', label: 'Condition' }, { key: 'status', label: 'Status' }
        ];
        this.rows = d.records;
      });
    }
    if (page === 'maintenance') {
      this.title = 'Maintenance';
      this.subtitle = 'Due schedules and open tickets.';
      this.api.get<any>('/maintenance/due').subscribe((d) => {
        this.kpis = [
          { label: 'Due', value: d.due_count, cls: 'alert' },
          { label: 'Open tickets', value: d.open_tickets }
        ];
        this.columns = [
          { key: 'title', label: 'Schedule' }, { key: 'due_date', label: 'Due' }, { key: 'status', label: 'Status' }
        ];
        this.rows = d.schedules;
        this.extraTitle = 'Open tickets';
        this.extraColumns = [
          { key: 'ticket_number', label: 'Ticket' }, { key: 'title', label: 'Title' },
          { key: 'priority', label: 'Priority' }, { key: 'status', label: 'Status' }
        ];
        this.extraRows = d.tickets;
      });
    }
    if (page === 'hr') {
      this.title = 'People & Attendance';
      this.subtitle = 'Who is working today.';
      this.api.get<any>('/hr/attendance/today').subscribe((d) => {
        this.kpis = [
          { label: 'Present', value: d.present, cls: 'ok' },
          { label: 'Absent', value: d.absent },
          { label: 'Leave', value: d.leave },
          { label: 'Headcount', value: d.headcount }
        ];
        this.columns = [
          { key: 'employee', label: 'Employee' }, { key: 'status', label: 'Status' },
          { key: 'time_in', label: 'In' }, { key: 'time_out', label: 'Out' }
        ];
        this.rows = (d.records || []).map((r: any) => ({ ...r, employee: r.employee?.name }));
      });
    }
    if (page === 'tasks') {
      this.title = 'Tasks';
      this.subtitle = 'Incomplete and overdue work.';
      this.api.get<any>('/tasks/incomplete').subscribe((d) => {
        this.kpis = [
          { label: 'Incomplete', value: d.count },
          { label: 'Overdue', value: d.overdue?.length, cls: 'alert' }
        ];
        this.columns = [
          { key: 'title', label: 'Task' }, { key: 'module', label: 'Module' },
          { key: 'due_date', label: 'Due' }, { key: 'status', label: 'Status' }
        ];
        this.rows = d.records;
      });
    }
    if (page === 'finance') {
      this.title = 'Finance';
      this.subtitle = 'Spending from expenses, purchase orders and invoices.';
      this.api.get<any>('/finance/spending', { period: 'month' }).subscribe((d) => {
        this.kpis = [
          { label: 'Total spend', value: d.total_spending },
          { label: 'Expenses', value: d.expenses },
          { label: 'Purchase orders', value: d.purchase_orders },
          { label: 'Invoices', value: d.invoices }
        ];
        this.columns = [
          { key: 'invoice_number', label: 'Invoice' }, { key: 'amount', label: 'Amount' },
          { key: 'due_date', label: 'Due' }, { key: 'status', label: 'Status' }
        ];
        this.rows = d.upcoming_invoices;
      });
    }
    if (page === 'crm') {
      this.title = 'CRM';
      this.subtitle = 'Prospects and commercial opportunities mirrored from HubSpot.';
      this.api.get<any>('/crm/prospects').subscribe((p) => {
        this.api.get<any>('/crm/opportunities').subscribe((o) => {
          this.kpis = [
            { label: 'Prospects', value: p.count },
            { label: 'Open deals', value: o.count },
            { label: 'Pipeline', value: o.pipeline_value }
          ];
          this.columns = [
            { key: 'name', label: 'Deal' }, { key: 'amount', label: 'Amount' },
            { key: 'next_action', label: 'Next action' }, { key: 'status', label: 'Status' }
          ];
          this.rows = o.records;
          this.extraTitle = 'Prospect companies';
          this.extraColumns = [
            { key: 'name', label: 'Company' }, { key: 'category', label: 'Category' }, { key: 'lifecycle_stage', label: 'Stage' }
          ];
          this.extraRows = p.companies;
        });
      });
    }
    if (page === 'marketing') {
      this.title = 'Marketing';
      this.subtitle = 'Content produced and digital channel performance.';
      this.api.get<any>('/marketing/content').subscribe((c) => {
        this.api.get<any>('/marketing/performance').subscribe((p) => {
          this.kpis = [
            { label: 'Content items', value: c.content_count },
            { label: 'Published', value: c.published },
            { label: 'Reach 30d', value: p.totals_30d?.reach },
            { label: 'Leads 30d', value: p.totals_30d?.leads }
          ];
          this.columns = [
            { key: 'title', label: 'Content' }, { key: 'channel', label: 'Channel' },
            { key: 'content_type', label: 'Type' }, { key: 'status', label: 'Status' }
          ];
          this.rows = c.items;
          this.extraTitle = 'Channel performance';
          this.extraColumns = [
            { key: 'channel', label: 'Channel' }, { key: 'reach', label: 'Reach' },
            { key: 'views', label: 'Views' }, { key: 'followers', label: 'Followers' }, { key: 'leads', label: 'Leads' }
          ];
          this.extraRows = p.by_channel;
        });
      });
    }
    if (page === 'risks') {
      this.title = 'Risk Register';
      this.subtitle = 'Current operational, health and commercial risks.';
      this.api.get<any>('/risks').subscribe((d) => {
        this.kpis = [{ label: 'Open risks', value: d.count, cls: 'alert' }];
        this.columns = [
          { key: 'title', label: 'Risk' }, { key: 'category', label: 'Category' },
          { key: 'severity', label: 'Severity' }, { key: 'mitigation', label: 'Mitigation' }
        ];
        this.rows = d.records;
      });
    }
    if (page === 'decisions') {
      this.title = 'Owner Decisions';
      this.subtitle = 'Decisions that require ownership approval.';
      this.api.get<any>('/decisions/pending-owner').subscribe((d) => {
        this.kpis = [{ label: 'Pending owner', value: d.count, cls: 'alert' }];
        this.columns = [
          { key: 'title', label: 'Decision' }, { key: 'due_date', label: 'Due' },
          { key: 'status', label: 'Status' }
        ];
        this.rows = d.records;
      });
    }
    if (page === 'sops') {
      this.title = 'SOP Library';
      this.subtitle = 'Controlled procedures for farm and office work.';
      this.api.get<any[]>('/sops').subscribe((d) => {
        this.kpis = [{ label: 'Published SOPs', value: d.length }];
        this.columns = [
          { key: 'code', label: 'Code' }, { key: 'title', label: 'Title' },
          { key: 'category', label: 'Category' }, { key: 'version', label: 'Version' }
        ];
        this.rows = d;
      });
    }
  }

  cell(row: any, key: string): any {
    return row?.[key];
  }
}
