import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { ApiService } from '../../core/services/api.service';
import { CeoDashboard } from './ceo.models';
import { buildCeoView, formatDateTime, ledgerToCsv, timeAgo } from './ceo.insights';

type LoadState = 'loading' | 'ready' | 'error';
type RangeId = '7d' | '30d' | '90d' | 'ytd' | 'custom';

interface RangeOption {
  id: RangeId;
  label: string;
  hint: string;
}

const RANGE_OPTIONS: RangeOption[] = [
  { id: '7d', label: '7 days', hint: 'Last 7 days' },
  { id: '30d', label: '30 days', hint: 'Last 30 days' },
  { id: '90d', label: '90 days', hint: 'Last 90 days' },
  { id: 'ytd', label: 'Year to date', hint: 'From 1 January' },
  { id: 'custom', label: 'Custom', hint: 'Pick your own range' }
];

/** Auto-refresh cadence for wall displays and long-lived sessions. */
const AUTO_REFRESH_MS = 60_000;

@Component({
  selector: 'app-ceo',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './ceo.component.html',
  styleUrl: './ceo.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CeoComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly titleService = inject(Title);

  readonly rangeOptions = RANGE_OPTIONS;

  readonly state = signal<LoadState>('loading');
  readonly dashboard = signal<CeoDashboard | null>(null);
  readonly errorMessage = signal('');
  readonly rangeId = signal<RangeId>('30d');
  readonly customFrom = signal('');
  readonly customTo = signal('');
  readonly ledgerSearch = signal('');
  readonly gapsOnly = signal(false);
  readonly autoRefresh = signal(false);
  readonly refreshing = signal(false);
  readonly loadedAt = signal<Date | null>(null);
  readonly clock = signal(new Date());

  readonly view = computed(() => {
    const payload = this.dashboard();
    return payload ? buildCeoView(payload) : null;
  });

  readonly updatedLabel = computed(() => {
    const stamp = this.loadedAt();
    return stamp ? `${formatDateTime(stamp.toISOString())} · ${timeAgo(stamp.toISOString(), this.clock())}` : 'never';
  });

  readonly filteredLedger = computed(() => {
    const rows = this.view()?.ledger ?? [];
    const term = this.ledgerSearch().trim().toLowerCase();
    return rows.filter((row) => {
      if (this.gapsOnly() && row.hasData) {
        return false;
      }
      if (!term) {
        return true;
      }
      return (
        row.question.toLowerCase().includes(term) ||
        row.source.toLowerCase().includes(term) ||
        row.answer.toLowerCase().includes(term) ||
        String(row.number) === term
      );
    });
  });

  readonly ledgerFilterNote = computed(() => {
    const total = this.view()?.ledgerSummary.total ?? 0;
    const shown = this.filteredLedger().length;
    return shown === total ? `${total} questions` : `${shown} of ${total} questions`;
  });

  readonly hasCustomRange = computed(() => this.rangeId() === 'custom');
  readonly customRangeValid = computed(() => {
    const from = this.customFrom();
    const to = this.customTo();
    return !!from && !!to && from <= to;
  });

  private refreshTimer?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    this.titleService.setTitle('CEO Command Center · Evolex Hub');
    this.load();

    this.destroyRef.onDestroy(() => this.stopAutoRefresh());
  }

  /* ---------------- data ---------------- */

  load(options: { silent?: boolean } = {}): void {
    if (!options.silent) {
      this.state.set('loading');
    } else {
      this.refreshing.set(true);
    }
    this.errorMessage.set('');

    const range = this.activeRange();
    if (!range) {
      this.state.set('error');
      this.errorMessage.set('Choose a start date before the end date to load the dashboard.');
      this.refreshing.set(false);
      return;
    }

    this.api
      .get<CeoDashboard>('/dashboard/ceo', range)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (payload) => {
          this.dashboard.set(payload);
          this.loadedAt.set(new Date());
          this.clock.set(new Date());
          this.state.set('ready');
          this.refreshing.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.refreshing.set(false);
          // Keep the last good snapshot on screen if a background refresh fails.
          if (this.dashboard() && options.silent) {
            this.errorMessage.set('Live refresh failed — showing the last snapshot.');
            return;
          }
          this.state.set('error');
          this.errorMessage.set(
            error.status === 401
              ? 'Your session has expired. Sign in again to reload the command center.'
              : 'We could not load the command center. Check the API connection and try again.'
          );
        }
      });
  }

  refresh(): void {
    this.load({ silent: this.state() === 'ready' });
  }

  setRange(id: RangeId): void {
    if (id === this.rangeId()) {
      return;
    }
    this.rangeId.set(id);
    if (id === 'custom') {
      this.seedCustomRange();
      return;
    }
    this.load();
    if (this.autoRefresh()) {
      this.startAutoRefresh();
    }
  }

  applyCustomRange(): void {
    if (!this.customRangeValid()) {
      return;
    }
    this.load();
    if (this.autoRefresh()) {
      this.startAutoRefresh();
    }
  }

  onCustomFrom(value: string): void {
    this.customFrom.set(value);
  }

  onCustomTo(value: string): void {
    this.customTo.set(value);
  }

  /* ---------------- auto refresh ---------------- */

  toggleAutoRefresh(): void {
    this.autoRefresh.set(!this.autoRefresh());
    if (this.autoRefresh()) {
      this.startAutoRefresh();
    } else {
      this.stopAutoRefresh();
    }
  }

  private startAutoRefresh(): void {
    this.stopAutoRefresh();
    this.refreshTimer = setInterval(() => {
      this.clock.set(new Date());
      this.load({ silent: true });
    }, AUTO_REFRESH_MS);
  }

  private stopAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = undefined;
    }
  }

  /* ---------------- ledger + export ---------------- */

  onLedgerSearch(value: string): void {
    this.ledgerSearch.set(value);
  }

  toggleGapsOnly(): void {
    this.gapsOnly.set(!this.gapsOnly());
  }

  clearLedgerFilters(): void {
    this.ledgerSearch.set('');
    this.gapsOnly.set(false);
  }

  exportCsv(): void {
    const current = this.view();
    if (!current) {
      return;
    }
    const csv = ledgerToCsv(this.filteredLedger(), current.ledgerSummary, current.periodLabel);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `evolex-answerability-${current.from}-to-${current.to}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  print(): void {
    window.print();
  }

  /* ---------------- template helpers ---------------- */

  trackByKey = (_index: number, item: { key: string }): string => item.key;

  trackByNumber = (_index: number, item: { number: number }): number => item.number;

  private activeRange(): Record<string, string> | null {
    const today = new Date();
    const to = this.toIsoDate(today);
    const id = this.rangeId();

    if (id === 'custom') {
      if (!this.customRangeValid()) {
        return null;
      }
      return { from: this.customFrom(), to: this.customTo() };
    }

    if (id === 'ytd') {
      return { from: this.toIsoDate(new Date(today.getFullYear(), 0, 1)), to };
    }

    const days = id === '7d' ? 7 : id === '90d' ? 90 : 30;
    const from = new Date(today);
    from.setDate(from.getDate() - days);

    return { from: this.toIsoDate(from), to };
  }

  private seedCustomRange(): void {
    if (this.customFrom() && this.customTo()) {
      return;
    }
    const today = new Date();
    const from = new Date(today);
    from.setDate(from.getDate() - 30);
    this.customFrom.set(this.toIsoDate(from));
    this.customTo.set(this.toIsoDate(today));
  }

  private toIsoDate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }
}
