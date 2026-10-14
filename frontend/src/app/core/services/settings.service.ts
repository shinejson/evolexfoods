import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface SystemInfo {
  app_name: string;
  app_env: string;
  app_url: string;
  laravel_version: string;
  php_version: string;
  database_connection: string;
  server_time: string;
  server_timezone: string;
  server_status: string;
  active_users_count: number;
  total_livestock_count: number;
  storage_status: string;
}

export interface SettingsResponse {
  settings: Record<string, Record<string, any>>;
  system_info: SystemInfo;
}

export interface TestEmailResult {
  success: boolean;
  message: string;
  details?: {
    recipient: string;
    smtp_server: string;
    encryption: string;
    from_sender: string;
    handshake: string;
    latency_ms: number;
    sent_at: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  constructor(private api: ApiService) {}

  getSettings(): Observable<SettingsResponse> {
    return this.api.get<SettingsResponse>('/settings');
  }

  updateSettings(settings: Record<string, any>): Observable<{ success: boolean; message: string; settings: any }> {
    return this.api.put<{ success: boolean; message: string; settings: any }>('/settings', settings);
  }

  sendTestEmail(recipient?: string): Observable<TestEmailResult> {
    return this.api.post<TestEmailResult>('/settings/test-email', { recipient });
  }

  clearCache(): Observable<{ success: boolean; message: string }> {
    return this.api.post<{ success: boolean; message: string }>('/settings/clear-cache', {});
  }

  exportConfig(): Observable<any> {
    return this.api.get<any>('/settings/export');
  }
}
