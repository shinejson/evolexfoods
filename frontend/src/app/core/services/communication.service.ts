import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
export interface MessageTemplate {
  id?: number;
  name: string;
  channel: 'sms' | 'email';
  category: 'reminder' | 'meeting' | 'notification';
  subject: string | null;
  body: string;
  enabled: boolean;
}
export interface OutboundMessage {
  id: number;
  channel: 'sms' | 'email';
  recipient: string;
  subject: string | null;
  body: string;
  status:
    | 'pending'
    | 'sending'
    | 'accepted'
    | 'logged'
    | 'failed'
    | 'cancelled';
  scheduled_at: string;
  error: string | null;
}
export interface SmsSettings {
  sms_enabled: boolean;
  sms_provider: string;
  sms_sender_id: string;
  sms_api_key: string;
  sms_api_key_configured?: boolean;
}
@Injectable({ providedIn: 'root' })
export class CommunicationService {
  constructor(private api: ApiService) {}
  templates(): Observable<{ data: MessageTemplate[]; variables: string[] }> {
    return this.api.get('/communications/templates');
  }
  saveTemplate(template: MessageTemplate): Observable<MessageTemplate> {
    return template.id
      ? this.api.put(`/communications/templates/${template.id}`, template)
      : this.api.post('/communications/templates', template);
  }
  messages(
    page = 1,
  ): Observable<{
    data: OutboundMessage[];
    current_page: number;
    last_page: number;
    total: number;
  }> {
    return this.api.get('/communications/messages', { page });
  }
  send(payload: {
    template_id: number;
    recipient: string;
    variables: Record<string, string>;
    scheduled_at: string | null;
  }): Observable<OutboundMessage> {
    return this.api.post('/communications/messages', payload);
  }
  cancel(id: number): Observable<OutboundMessage> {
    return this.api.post(`/communications/messages/${id}/cancel`, {});
  }
  testSms(
    recipient: string,
  ): Observable<{ success: boolean; message: string }> {
    return this.api.post('/settings/test-sms', { recipient });
  }
}
