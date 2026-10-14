export type NotificationSeverity = 'info' | 'success' | 'warning' | 'critical';

export type NotificationStatusFilter = 'all' | 'unread' | 'read';

export interface AppNotification {
  id: number;
  type: string;
  severity: NotificationSeverity;
  title: string;
  message: string | null;
  module: string | null;
  is_read: boolean;
  triggered_at: string;
  created_at?: string;
  updated_at?: string;
}

export interface NotificationSummary {
  total: number;
  unread: number;
  read: number;
  by_severity: Record<string, number>;
  by_module: Record<string, number>;
  last_24h: number;
}

export interface NotificationListMeta {
  total: number;
  count: number;
  per_page: number;
  current_page: number;
  last_page: number;
}

export interface NotificationListResponse {
  data: AppNotification[];
  meta: NotificationListMeta;
  summary: NotificationSummary;
}

export interface NotificationListParams {
  status?: NotificationStatusFilter;
  severity?: string;
  module?: string;
  q?: string;
  from?: string;
  to?: string;
  page?: number;
  per_page?: number;
}

export interface NotificationCreatePayload {
  title: string;
  message?: string;
  severity?: NotificationSeverity;
  type?: string;
  module?: string;
}
