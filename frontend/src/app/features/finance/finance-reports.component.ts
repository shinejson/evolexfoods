import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { FinanceExpense, FinanceOverview, FinancePayment } from './finance.models';
import { FinanceNavComponent } from './finance-nav.component';

type ReportRange = '30d' | '90d' | 'ytd' | 'custom';

type ActivityType = 'Expense' | 'Supplier payment';

interface LedgerEntry {
  id: string;
  date: string;
  type: ActivityType;
  reference: string;
  description: string;
  method: string;
  amount: number;
}

@Component({
  selector: 'app-finance-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, FinanceNavComponent],
  templateUrl: './finance-reports.component.html',
  styleUrl: './finance-reports.component.scss'
})
export class FinanceReportsComponent implements OnInit {
  readonly ranges: { id: ReportRange; label: string }[] = [
    { id: '30d', label: '30 days' },
    { id: '90d', label: '90 days' },
    { id: 'ytd', label: 'Year to date' },
    { id: 'custom', label: 'Custom' }
  ];

  overview: FinanceOverview | null = null;
  expenses: FinanceExpense[] = [];
  payments: FinancePayment[] = [];
  entries: LedgerEntry[] = [];
  loading = true;
  error = '';
  range: ReportRange = '30d';
  customFrom = '';
  customTo = '';
  loadedAt: Date | null = null;

  constructor(private readonly api: ApiService) {}

  ngOnInit(): void {
    this.seedCustomRange();
    this.load();
  }

  selectRange(range: ReportRange): void {
    this.range = range;
    if (range !== 'custom') {
      this.load();
    }
  }

  applyCustomRange(): void {
    if (this.customFrom && this.customTo && this.customFrom <= this.customTo) {
      this.load();
    }
  }

  load(): void {
    const bounds = this.rangeBounds();
    if (!bounds) {
      this.error = 'Choose a valid start and end date.';
      return;
    }

    this.loading = true;
    this.error = '';
    forkJoin({
      overview: this.api.get<FinanceOverview>('/finance/overview', bounds),
      expenses: this.api.get<{ data: FinanceExpense[] }>('/records/expenses'),
      payments: this.api.get<{ data: FinancePayment[] }>('/records/payments')
    }).subscribe({
      next: (response) => {
        this.overview = response.overview;
        this.expenses = response.expenses.data ?? [];
        this.payments = response.payments.data ?? [];
        this.entries = this.buildEntries(bounds.from, bounds.to);
        this.loadedAt = new Date();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.error = 'We could not prepare the finance report. Check the API connection and try again.';
      }
    });
  }

  get monthlyMaximum(): number {
    return Math.max(1, ...(this.overview?.monthly_activity ?? []).map((month) => Number(month.expenses) + Number(month.payments)));
  }

  get categoryMaximum(): number {
    return Math.max(1, ...(this.overview?.expense_categories ?? []).map((category) => Number(category.amount)));
  }

  activityWidth(amount: number): number {
    return Math.min(100, Math.max(0, (amount / this.monthlyMaximum) * 100));
  }

  monthTotal(expenses: number, payments: number): number {
    return Number(expenses) + Number(payments);
  }

  categoryWidth(amount: number): number {
    return Math.min(100, Math.max(0, (amount / this.categoryMaximum) * 100));
  }

  formatCurrency(value: number | string | null | undefined): string {
    const amount = Number(value ?? 0);
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS',
      maximumFractionDigits: 2
    }).format(Number.isFinite(amount) ? amount : 0);
  }

  formatDate(value: string): string {
    const date = new Date(`${value.slice(0, 10)}T12:00:00`);
    return new Intl.DateTimeFormat('en-GH', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
  }

  exportCsv(): void {
    const rows = [
      ['Date', 'Type', 'Reference', 'Description', 'Payment method', 'Amount (GHS)'],
      ...this.entries.map((entry) => [entry.date, entry.type, entry.reference, entry.description, entry.method, entry.amount.toFixed(2)])
    ];
    const csv = rows.map((row) => row.map((value) => this.csvCell(String(value))).join(',')).join('\r\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `evolex-finance-activity-${this.overview?.from ?? 'period'}-to-${this.overview?.to ?? 'period'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  print(): void {
    window.print();
  }

  private buildEntries(from: string, to: string): LedgerEntry[] {
    const expenses: LedgerEntry[] = this.expenses
      .filter((expense) => {
        const d = (expense.expense_date || '').slice(0, 10);
        return Boolean(d && d >= from && d <= to);
      })
      .map((expense) => ({
        id: `expense-${expense.id}`,
        date: expense.expense_date,
        type: 'Expense',
        reference: expense.category || 'Expense',
        description: expense.description || 'Operating expense',
        method: expense.source || 'Manual entry',
        amount: Number(expense.amount)
      }));

    const payments: LedgerEntry[] = this.payments
      .filter((payment) => {
        const d = (payment.paid_at || '').slice(0, 10);
        return Boolean(d && d >= from && d <= to);
      })
      .map((payment) => ({
        id: `payment-${payment.id}`,
        date: payment.paid_at,
        type: 'Supplier payment',
        reference: payment.invoice?.invoice_number || `Invoice #${payment.invoice_id}`,
        description: payment.invoice?.supplier?.name || 'Supplier payment',
        method: payment.method || 'Not specified',
        amount: Number(payment.amount)
      }));

    return [...expenses, ...payments].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }

  private rangeBounds(): { from: string; to: string } | null {
    const today = new Date();
    const to = this.toDateInput(today);
    if (this.range === 'custom') {
      return this.customFrom && this.customTo && this.customFrom <= this.customTo
        ? { from: this.customFrom, to: this.customTo }
        : null;
    }
    if (this.range === 'ytd') {
      return { from: `${today.getFullYear()}-01-01`, to };
    }
    const from = new Date(today);
    from.setDate(from.getDate() - (this.range === '90d' ? 89 : 29));
    return { from: this.toDateInput(from), to };
  }

  private seedCustomRange(): void {
    const to = new Date();
    const from = new Date(to);
    from.setDate(from.getDate() - 29);
    this.customFrom = this.toDateInput(from);
    this.customTo = this.toDateInput(to);
  }

  private toDateInput(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  private csvCell(value: string): string {
    return `"${value.replace(/"/g, '""')}"`;
  }
}
