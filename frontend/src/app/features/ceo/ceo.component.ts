import { Component, OnInit } from '@angular/core';
import { DecimalPipe, NgFor, NgIf } from '@angular/common';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-ceo',
  standalone: true,
  imports: [NgFor, NgIf, DecimalPipe],
  templateUrl: './ceo.component.html'
})
export class CeoComponent implements OnInit {
  data: any = null;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.get<any>('/dashboard/ceo').subscribe((res) => this.data = res);
  }

  cards() {
    const k = this.data?.kpis || {};
    return [
      { label: 'Total herd', value: k.total_herd, meta: 'Alive and active', cls: 'ok' },
      { label: 'Females / Males', value: `${k.female ?? 0} / ${k.male ?? 0}`, meta: 'Sex breakdown', cls: 'info' },
      { label: 'Pregnancies', value: k.pregnancies, meta: 'Active pregnancies' },
      { label: 'Births (30d)', value: k.births, meta: 'Period births', cls: 'ok' },
      { label: 'Deaths (30d)', value: k.deaths, meta: 'Period deaths', cls: k.deaths ? 'alert' : '' },
      { label: 'Mortality rate', value: `${k.mortality_rate ?? 0}%`, meta: 'Deaths / avg herd', cls: 'alert' },
      { label: 'Herd growth', value: k.herd_growth, meta: `${k.herd_growth_rate ?? 0}% rate` },
      { label: 'Sick animals', value: k.sick, meta: 'Open health records', cls: k.sick ? 'alert' : 'ok' },
      { label: 'Under treatment', value: k.under_treatment, meta: 'Active treatments' },
      { label: 'Feed remaining', value: `${k.feed_remaining ?? 0} kg`, meta: 'On-hand feed' },
      { label: 'Days of feed', value: k.days_feed_remaining, meta: 'Cover remaining', cls: (k.days_feed_remaining ?? 99) <= 14 ? 'alert' : 'ok' },
      { label: 'Low stock', value: k.low_stock, meta: 'At or below reorder', cls: k.low_stock ? 'alert' : 'ok' },
      { label: 'Open purchase requests', value: k.open_purchase_requests, meta: 'Pending workflow' },
      { label: 'Pending approvals', value: k.pending_approvals, meta: 'Need action' },
      { label: 'Maintenance due', value: k.equipment_due_maintenance, meta: 'Next 14 days', cls: k.equipment_due_maintenance ? 'alert' : '' },
      { label: 'Employees present', value: k.employees_present, meta: 'Attendance today' },
      { label: 'Open tasks', value: k.open_tasks, meta: 'Incomplete work' },
      { label: 'Spend this week', value: k.spending_week, meta: 'Expenses + POs + invoices', money: true },
      { label: 'Spend this month', value: k.spending_month, meta: 'Month to date', money: true },
      { label: 'Prospects', value: k.prospects, meta: 'HubSpot mirror' },
      { label: 'Opportunities', value: k.opportunities, meta: 'Open deals' },
      { label: 'Content produced', value: k.content_produced, meta: 'Marketing assets' },
      { label: 'Digital reach 30d', value: k.digital_performance?.reach_30d, meta: `${k.digital_performance?.leads_30d ?? 0} leads` },
      { label: 'Open risks', value: k.risks, meta: 'Risk register', cls: k.risks ? 'alert' : 'ok' },
      { label: 'Owner decisions', value: k.owner_decisions_required, meta: 'Awaiting ownership', cls: k.owner_decisions_required ? 'alert' : 'ok' }
    ];
  }

  answers() {
    return Object.entries(this.data?.answers || {}).map(([num, item]: any) => ({
      num,
      question: item.question,
      source: item.source,
      display: this.formatAnswer(item)
    }));
  }

  formatAnswer(item: any): string {
    if (item.unit && (typeof item.value === 'number' || typeof item.value === 'string')) {
      return `${item.value}${item.unit === '%' ? '%' : ' ' + item.unit}`;
    }
    if (item.week !== undefined) {
      return `Week ${item.week} / Month ${item.month}`;
    }
    if (item.value && typeof item.value === 'object' && !Array.isArray(item.value)) {
      if (item.value.reach_30d !== undefined) {
        return `Reach ${item.value.reach_30d} · Views ${item.value.views_30d} · Leads ${item.value.leads_30d}`;
      }
      return JSON.stringify(item.value);
    }
    if (Array.isArray(item.value)) {
      return item.value.map((row: any) => `${row.location}: ${row.total}`).join(', ');
    }
    if (item.pending !== undefined) {
      return `${item.value} (${item.pending} pending)`;
    }
    if (item.rate !== undefined) {
      return `${item.value} (${item.rate}%)`;
    }
    if (item.headcount !== undefined) {
      return `${item.value} of ${item.headcount}`;
    }
    if (item.open_tickets !== undefined) {
      return `${item.value} due / ${item.open_tickets} tickets`;
    }
    return String(item.value ?? '—');
  }
}
