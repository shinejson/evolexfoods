import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import {
  AppNotification,
  NotificationCreatePayload,
  NotificationListMeta,
  NotificationSeverity,
  NotificationStatusFilter,
  NotificationSummary
} from '../../core/models/notification.model';
import { NotificationService } from '../../core/services/notification.service';

type SeverityFilter = 'all' | NotificationSeverity;

interface Toast {
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ComposeForm {
  title: string;
  message: string;
  severity: NotificationSeverity;
  module: string;
}

const MODULE_ROUTES: Record<string, string> = {
  livestock: '/livestock',
  health: '/health',
  breeding: '/breeding',
  feed: '/feed',
  inventory: '/inventory',
  procurement: '/procurement',
  maintenance: '/maintenance',
  finance: '/finance',
  invoices: '/invoices',
  payments: '/payments',
  hr: '/hr',
  tasks: '/tasks',
  sales: '/sales',
  marketing: '/marketing',
  crm: '/crm',
  governance: '/risks',
  decisions: '/decisions'
};

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.scss'
})
export class NotificationsComponent implements OnInit, OnDestroy {
  readonly statusTabs: { id: NotificationStatusFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'unread', label: 'Unread' },
    { id: 'read', label: 'Read' }
  ];

  readonly severityChips: { id: SeverityFilter; label: string }[] = [
    { id: 'all', label: 'All types' },
    { id: 'critical', label: 'Critical' },
    { id: 'warning', label: 'Warning' },
    { id: 'success', label: 'Success' },
    { id: 'info', label: 'Info' }
  ];

  readonly moduleOptions = [
    'general', 'livestock', 'health', 'breeding', 'feed', 'inventory', 'procurement',
    'maintenance', 'finance', 'hr', 'sales', 'marketing', 'crm', 'governance'
  ];

  notifications: AppNotification[] = [];
  meta: NotificationListMeta = { total: 0, count: 0, per_page: 10, current_page: 1, last_page: 1 };
  summary: NotificationSummary | null = null;

  statusFilter: NotificationStatusFilter = 'all';
  severityFilter: SeverityFilter = 'all';
  moduleFilter = '';
  searchTerm = '';
  dateFrom = '';
  dateTo = '';

  loading = true;
  error = '';
  selected: AppNotification | null = null;
  showCompose = false;
  saving = false;
  toast: Toast | null = null;

  composeForm: ComposeForm = this.emptyCompose();

  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  private querySub?: Subscription;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly notificationsSvc: NotificationService,
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const id = Number(params.get('id'));
      const status = params.get('status');
      if (status === 'unread' || status === 'read' || status === 'all') {
        this.statusFilter = status;
      }
      this.load(id > 0 ? id : undefined);
    });
  }

  ngOnDestroy(): void {
    this.querySub?.unsubscribe();
    if (this.searchTimer) clearTimeout(this.searchTimer);
    if (this.toastTimer) clearTimeout(this.toastTimer);
  }

  // ─── Data ──────────────────────────────────────────────────────────────────

  load(preselectId?: number): void {
    this.loading = true;
    this.error = '';
    this.querySub?.unsubscribe();
    this.querySub = this.notificationsSvc
      .list({
        status: this.statusFilter,
        severity: this.severityFilter === 'all' ? undefined : this.severityFilter,
        module: this.moduleFilter || undefined,
        q: this.searchTerm.trim() || undefined,
        from: this.dateFrom || undefined,
        to: this.dateTo || undefined,
        page: this.meta.current_page,
        per_page: this.meta.per_page
      })
      .subscribe({
        next: (res) => {
          this.notifications = res.data ?? [];
          this.meta = res.meta ?? this.meta;
          this.summary = res.summary ?? null;
          this.loading = false;
          if (preselectId) {
            const found = this.notifications.find((n) => n.id === preselectId);
            if (found) {
              this.select(found);
              return;
            }
            // Not on this page — fetch it directly for the reading pane.
            this.notificationsSvc.show(preselectId).subscribe({
              next: (n) => this.select(n),
              error: () => void 0
            });
            return;
          }
          if (this.selected) {
            const stillThere = this.notifications.find((n) => n.id === this.selected!.id);
            this.selected = stillThere ?? this.selected;
          }
        },
        error: (err) => {
          this.loading = false;
          this.error = err?.error?.message || 'Could not load notifications. Please try again.';
        }
      });
  }

  refresh(): void {
    this.load(this.selected?.id);
    this.notificationsSvc.refresh();
    this.notify('info', 'Notifications refreshed.');
  }

  // ─── Filters ───────────────────────────────────────────────────────────────

  setStatus(status: NotificationStatusFilter): void {
    if (this.statusFilter === status) return;
    this.statusFilter = status;
    this.resetPageAndLoad();
  }

  setSeverity(severity: SeverityFilter): void {
    if (this.severityFilter === severity) return;
    this.severityFilter = severity;
    this.resetPageAndLoad();
  }

  onModuleChange(): void {
    this.resetPageAndLoad();
  }

  onSearchInput(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.resetPageAndLoad(), 300);
  }

  onDateChange(): void {
    this.resetPageAndLoad();
  }

  clearFilters(): void {
    this.statusFilter = 'all';
    this.severityFilter = 'all';
    this.moduleFilter = '';
    this.searchTerm = '';
    this.dateFrom = '';
    this.dateTo = '';
    this.resetPageAndLoad();
  }

  get hasActiveFilters(): boolean {
    return (
      this.statusFilter !== 'all' ||
      this.severityFilter !== 'all' ||
      !!this.moduleFilter ||
      !!this.searchTerm ||
      !!this.dateFrom ||
      !!this.dateTo
    );
  }

  get filterLabel(): string {
    const parts: string[] = [];
    if (this.searchTerm) parts.push(`“${this.searchTerm}”`);
    if (this.severityFilter !== 'all') parts.push(this.severityFilter);
    if (this.moduleFilter) parts.push(this.moduleFilter);
    return parts.join(' · ') || 'all notifications';
  }

  private resetPageAndLoad(): void {
    this.meta = { ...this.meta, current_page: 1 };
    this.load();
  }

  // ─── Pagination ────────────────────────────────────────────────────────────

  goToPage(page: number): void {
    if (page < 1 || page > this.meta.last_page || page === this.meta.current_page) return;
    this.meta = { ...this.meta, current_page: page };
    this.load();
  }

  get showingFrom(): number {
    return this.meta.total === 0 ? 0 : (this.meta.current_page - 1) * this.meta.per_page + 1;
  }

  get showingTo(): number {
    return Math.min(this.meta.current_page * this.meta.per_page, this.meta.total);
  }

  get pageNumbers(): number[] {
    const pages: number[] = [];
    const start = Math.max(1, this.meta.current_page - 2);
    const end = Math.min(this.meta.last_page, this.meta.current_page + 2);
    for (let p = start; p <= end; p++) pages.push(p);
    return pages;
  }

  // ─── Reading pane ──────────────────────────────────────────────────────────

  select(notif: AppNotification, markAsRead = true): void {
    this.selected = notif;
    if (markAsRead && !notif.is_read) {
      this.notificationsSvc.markRead(notif.id).subscribe({
        next: (updated) => {
          notif.is_read = updated.is_read;
          this.bumpSummaryUnread(-1);
        },
        error: () => void 0
      });
    }
  }

  closeDetail(): void {
    this.selected = null;
    if (this.route.snapshot.queryParamMap.has('id')) {
      this.router.navigate([], { relativeTo: this.route, queryParams: {} });
    }
  }

  toggleRead(notif: AppNotification): void {
    const nextRead = !notif.is_read;
    const req$ = nextRead ? this.notificationsSvc.markRead(notif.id) : this.notificationsSvc.markUnread(notif.id);
    req$.subscribe({
      next: (updated) => {
        notif.is_read = updated.is_read;
        if (this.selected?.id === notif.id) this.selected.is_read = updated.is_read;
        this.bumpSummaryUnread(nextRead ? -1 : 1);
        this.notify('success', nextRead ? 'Marked as read.' : 'Marked as unread.');
      },
      error: () => this.notify('error', 'Could not update the notification.')
    });
  }

  markAllRead(): void {
    this.notificationsSvc
      .markAllRead({
        severity: this.severityFilter === 'all' ? undefined : this.severityFilter,
        module: this.moduleFilter || undefined,
        q: this.searchTerm.trim() || undefined
      })
      .subscribe({
        next: (res) => {
          this.notifications.forEach((n) => (n.is_read = true));
          if (this.selected) this.selected.is_read = true;
          if (this.summary) {
            this.summary.unread = res.count;
            this.summary.read = this.summary.total - res.count;
          }
          this.notify('success', res.updated > 0 ? `${res.updated} notification(s) marked as read.` : 'Everything is already read.');
        },
        error: () => this.notify('error', 'Could not mark notifications as read.')
      });
  }

  deleteNotification(notif: AppNotification): void {
    this.notificationsSvc.remove(notif.id).subscribe({
      next: () => {
        this.notifications = this.notifications.filter((n) => n.id !== notif.id);
        if (this.selected?.id === notif.id) this.selected = null;
        if (this.summary) {
          this.summary.total = Math.max(0, this.summary.total - 1);
          if (!notif.is_read) this.summary.unread = Math.max(0, this.summary.unread - 1);
          else this.summary.read = Math.max(0, this.summary.read - 1);
        }
        this.meta = { ...this.meta, total: Math.max(0, this.meta.total - 1) };
        this.notify('success', 'Notification deleted.');
        if (this.notifications.length === 0 && this.meta.current_page > 1) {
          this.goToPage(this.meta.current_page - 1);
        }
      },
      error: () => this.notify('error', 'Could not delete the notification.')
    });
  }

  clearRead(): void {
    if (!confirm('Clear all read notifications? This cannot be undone.')) return;
    this.notificationsSvc.clear('read').subscribe({
      next: (res) => {
        this.notify('success', `${res.deleted} read notification(s) cleared.`);
        this.selected = null;
        this.load();
      },
      error: () => this.notify('error', 'Could not clear read notifications.')
    });
  }

  moduleRoute(notif: AppNotification): string | null {
    if (!notif.module) return null;
    return MODULE_ROUTES[notif.module] ?? null;
  }

  moduleLabel(notif: AppNotification): string {
    if (!notif.module) return 'General';
    return notif.module
      .split(/[_\s-]+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  // ─── Compose ───────────────────────────────────────────────────────────────

  openCompose(): void {
    this.composeForm = this.emptyCompose();
    this.showCompose = true;
  }

  closeCompose(): void {
    this.showCompose = false;
  }

  submitCompose(): void {
    const title = this.composeForm.title.trim();
    if (!title) {
      this.notify('error', 'A title is required.');
      return;
    }
    const payload: NotificationCreatePayload = {
      title,
      message: this.composeForm.message.trim() || undefined,
      severity: this.composeForm.severity,
      type: 'announcement',
      module: this.composeForm.module || 'general'
    };
    this.saving = true;
    this.notificationsSvc.create(payload).subscribe({
      next: (created) => {
        this.saving = false;
        this.closeCompose();
        this.notify('success', 'Notification published to the team.');
        this.statusFilter = 'all';
        this.severityFilter = 'all';
        this.moduleFilter = '';
        this.searchTerm = '';
        this.meta = { ...this.meta, current_page: 1 };
        this.load(created.id);
      },
      error: (err) => {
        this.saving = false;
        this.notify('error', err?.error?.message || 'Could not publish the notification.');
      }
    });
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  severityIcon(severity: NotificationSeverity | string): string {
    switch (severity) {
      case 'critical': return '!';
      case 'warning': return '▲';
      case 'success': return '✓';
      default: return 'i';
    }
  }

  trackById(_index: number, notif: AppNotification): number {
    return notif.id;
  }

  timeAgo(value: string | null | undefined): string {
    if (!value) return '';
    const then = new Date(value).getTime();
    if (Number.isNaN(then)) return '';
    const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
    if (seconds < 45) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
    return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  private bumpSummaryUnread(delta: number): void {
    if (!this.summary) return;
    this.summary.unread = Math.max(0, this.summary.unread + delta);
    this.summary.read = Math.max(0, this.summary.total - this.summary.unread);
  }

  private emptyCompose(): ComposeForm {
    return { title: '', message: '', severity: 'info', module: 'general' };
  }

  private notify(type: Toast['type'], message: string): void {
    this.toast = { type, message };
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => (this.toast = null), 3500);
  }
}
