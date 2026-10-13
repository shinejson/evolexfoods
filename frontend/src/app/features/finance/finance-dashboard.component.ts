import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { FinanceOverview } from './finance.models';
import { FinanceNavComponent } from './finance-nav.component';

type FinanceRange = '30d' | '90d' | 'ytd' | 'custom';

interface DonutSegment {
  category: string;
  amount: number;
  color: string;
  dasharray: string;
  offset: number;
  share: number;
}

@Component({
  selector: 'app-finance-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, FinanceNavComponent],
  templateUrl: './finance-dashboard.component.html',
  styleUrl: './finance-dashboard.component.scss'
})
export class FinanceDashboardComponent implements OnInit {
  readonly ranges: { id: FinanceRange; label: string }[] = [
    { id: '30d', label: '30 days' },
    { id: '90d', label: '90 days' },
    { id: 'ytd', label: 'Year to date' },
    { id: 'custom', label: 'Custom' }
  ];

  readonly categoryColors = ['#42634c', '#c2a25c', '#78916f', '#b87855', '#527984', '#8c7d9b'];
  readonly ringRadius = 58;
  readonly ringCircumference = 2 * Math.PI * this.ringRadius;

  overview: FinanceOverview | null = null;
  loading = false;
  error = '';
  range: FinanceRange = '30d';
  customFrom = '';
  customTo = '';
  updatedAt: Date | null = null;
  private categorySegments: DonutSegment[] = [];

  constructor(private readonly api: ApiService) {}

  ngOnInit(): void {
    this.seedCustomRange();
    this.load();
  }

  selectRange(range: FinanceRange): void {
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

  refresh(): void {
    this.load();
  }

  load(): void {
    const bounds = this.rangeBounds();
    if (!bounds) {
      this.error = 'Choose a valid start and end date.';
      return;
    }

    this.loading = true;
    this.error = '';
    this.api.get<FinanceOverview>('/finance/overview', bounds).subscribe({
      next: (overview) => {
        this.overview = overview;
        this.categorySegments = this.buildDonutSegments(overview.expense_categories ?? []);
        this.updatedAt = new Date();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.error = 'We could not load finance data. Check the API connection and try again.';
      }
    });
  }

  get periodLabel(): string {
    if (!this.overview) {
      return 'Selected period';
    }
    return `${this.formatDate(this.overview.from)} – ${this.formatDate(this.overview.to)}`;
  }

  get donutSegments(): DonutSegment[] {
    return this.categorySegments;
  }

  get categoryTotal(): number {
    return this.categorySegments.reduce((sum, item) => sum + item.amount, 0);
  }

  trackByCategory = (_index: number, segment: DonutSegment): string => segment.category;

  get monthlyMaximum(): number {
    const months = this.overview?.monthly_activity ?? [];
    return Math.max(1, ...months.map((month) => Number(month.expenses) + Number(month.payments)));
  }

  chartHeight(value: number): number {
    return value > 0 ? Math.max(3, (value / this.monthlyMaximum) * 150) : 0;
  }

  chartY(value: number): number {
    return 218 - this.chartHeight(value);
  }

  chartX(index: number): number {
    return 68 + index * 106;
  }

  shortCurrency(value: number): string {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS',
      notation: Math.abs(value) >= 10000 ? 'compact' : 'standard',
      maximumFractionDigits: 0
    }).format(value || 0);
  }

  formatCurrency(value: number | string | null | undefined): string {
    const amount = Number(value ?? 0);
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS',
      maximumFractionDigits: 2
    }).format(Number.isFinite(amount) ? amount : 0);
  }

  formatDate(value: string | null | undefined): string {
    if (!value) {
      return 'Not set';
    }
    const date = new Date(`${value.slice(0, 10)}T12:00:00`);
    return new Intl.DateTimeFormat('en-GH', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
  }

  private buildDonutSegments(categories: FinanceOverview['expense_categories']): DonutSegment[] {
    const visibleCategories = categories.filter((item) => Number(item.amount) > 0);
    const total = visibleCategories.reduce((sum, item) => sum + Number(item.amount), 0);
    if (!total) {
      return [];
    }

    let consumed = 0;
    return visibleCategories.map((item, index) => {
      const amount = Number(item.amount);
      const share = amount / total;
      const length = share * this.ringCircumference;
      const segment: DonutSegment = {
        category: item.category,
        amount,
        color: this.categoryColors[index % this.categoryColors.length],
        dasharray: `${length} ${this.ringCircumference - length}`,
        offset: -consumed,
        share
      };
      consumed += length;
      return segment;
    });
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
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
