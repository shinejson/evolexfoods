import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import {
  AppNotification,
  NotificationCreatePayload,
  NotificationListParams,
  NotificationListResponse,
  NotificationSummary
} from '../models/notification.model';

/**
 * Shared notification state for the navbar bell and the Notifications page.
 *
 * `unreadCount$` / `recent$` feed the shell dropdown and badge; every
 * mutation refreshes both so the UI never drifts from the API.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly unreadCountSubject = new BehaviorSubject<number>(0);
  private readonly recentSubject = new BehaviorSubject<AppNotification[]>([]);

  readonly unreadCount$ = this.unreadCountSubject.asObservable();
  readonly recent$ = this.recentSubject.asObservable();

  constructor(private readonly api: ApiService) {}

  get unreadCount(): number {
    return this.unreadCountSubject.value;
  }

  /** Reload badge count + latest notifications for the navbar dropdown. */
  refresh(): void {
    this.api.get<{ count: number }>('/notifications/unread-count').subscribe({
      next: (res) => this.unreadCountSubject.next(res.count ?? 0),
      error: () => void 0
    });
    this.api
      .get<NotificationListResponse>('/notifications', { status: 'all', per_page: 6, page: 1 })
      .subscribe({
        next: (res) => this.recentSubject.next(res.data ?? []),
        error: () => void 0
      });
  }

  list(params: NotificationListParams = {}): Observable<NotificationListResponse> {
    return this.api.get<NotificationListResponse>('/notifications', {
      status: params.status ?? 'all',
      severity: params.severity,
      module: params.module,
      q: params.q,
      from: params.from,
      to: params.to,
      page: params.page ?? 1,
      per_page: params.per_page ?? 15
    });
  }

  stats(): Observable<NotificationSummary> {
    return this.api.get<NotificationSummary>('/notifications/stats');
  }

  show(id: number): Observable<AppNotification> {
    return this.api.get<AppNotification>(`/notifications/${id}`);
  }

  create(payload: NotificationCreatePayload): Observable<AppNotification> {
    return this.api
      .post<AppNotification>('/notifications', payload)
      .pipe(tap(() => this.refresh()));
  }

  markRead(id: number): Observable<AppNotification> {
    return this.api
      .patch<AppNotification>(`/notifications/${id}/read`, {})
      .pipe(tap(() => this.refresh()));
  }

  markUnread(id: number): Observable<AppNotification> {
    return this.api
      .patch<AppNotification>(`/notifications/${id}/unread`, {})
      .pipe(tap(() => this.refresh()));
  }

  markAllRead(params: Pick<NotificationListParams, 'severity' | 'module' | 'q'> = {}): Observable<{ updated: number; count: number }> {
    return this.api
      .post<{ updated: number; count: number }>('/notifications/read-all', params)
      .pipe(tap(() => this.refresh()));
  }

  remove(id: number): Observable<{ deleted: boolean; count: number }> {
    return this.api
      .delete<{ deleted: boolean; count: number }>(`/notifications/${id}`)
      .pipe(tap(() => this.refresh()));
  }

  clear(status: 'read' | 'unread' | 'all' = 'read'): Observable<{ deleted: number; count: number }> {
    return this.api
      .delete<{ deleted: number; count: number }>(`/notifications?status=${status}`)
      .pipe(tap(() => this.refresh()));
  }
}
