import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  CommunicationService,
  MessageTemplate,
  OutboundMessage,
  SmsSettings,
} from '../../core/services/communication.service';
import { SettingsService } from '../../core/services/settings.service';

@Component({
  selector: 'app-communications',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './communications.component.html',
  styleUrl: './communications.component.scss',
})
export class CommunicationsComponent implements OnInit {
  panel: 'config' | 'templates' | 'compose' | 'history' = 'config';
  readonly panels = [
    { id: 'config' as const, name: 'SMS configuration' },
    { id: 'templates' as const, name: 'Message templates' },
    { id: 'compose' as const, name: 'Send / schedule' },
    { id: 'history' as const, name: 'Outbox & history' },
  ];
  sms: SmsSettings = {
    sms_enabled: false,
    sms_provider: 'arkesel',
    sms_sender_id: 'Evolex',
    sms_api_key: '',
  };
  templates: MessageTemplate[] = [];
  messages: OutboundMessage[] = [];
  editor: MessageTemplate = this.blankTemplate();
  templateId = 0;
  recipient = '';
  variables: Record<string, string> = {};
  schedule = '';
  sendLater = false;
  testPhone = '';
  busy = false;
  loading = true;
  ready = false;
  historyLoading = false;
  dirty = false;
  page = 1;
  lastPage = 1;
  total = 0;
  notice = '';
  isError = false;
  readonly variableNames = [
    'name',
    'title',
    'date',
    'time',
    'location',
    'details',
  ];
  constructor(
    private svc: CommunicationService,
    private settings: SettingsService,
  ) {}
  ngOnInit(): void {
    this.settings.getSettings().subscribe({
      next: (res) => {
        this.sms = { ...this.sms, ...res.settings['sms'], sms_api_key: '' };
        this.loading = false;
        this.ready = true;
      },
      error: (err) => {
        this.loading = false;
        this.fail(err);
      },
    });
    this.loadTemplates();
  }
  blankTemplate(): MessageTemplate {
    return {
      name: '',
      channel: 'sms',
      category: 'reminder',
      subject: '',
      body: '',
      enabled: true,
    };
  }
  selectPanel(panel: typeof this.panel): void {
    this.panel = panel;
    this.notice = '';
    if (panel === 'history') this.loadHistory();
  }
  loadTemplates(): void {
    this.svc.templates().subscribe({
      next: (res) => {
        this.templates = res.data;
      },
      error: (err) => this.fail(err),
    });
  }
  edit(template?: MessageTemplate): void {
    this.editor = template ? { ...template } : this.blankTemplate();
  }
  get chosen(): MessageTemplate | undefined {
    return this.templates.find((t) => t.id === Number(this.templateId));
  }
  get usedVariables(): string[] {
    const text = (this.chosen?.subject || '') + (this.chosen?.body || '');
    return [
      ...new Set(
        Array.from(
          text.matchAll(/{{\s*([a-zA-Z0-9_]+)\s*}}/g),
          (match) => match[1],
        ),
      ),
    ];
  }
  render(text: string | null | undefined, sample = false): string {
    const samples: Record<string, string> = {
      name: 'Ama',
      title: 'Operations review',
      date: '20 October 2026',
      time: '09:00 GMT',
      location: 'Head office',
      details: 'Please bring your weekly update.',
    };
    return (text || '').replace(
      /{{\s*([a-zA-Z0-9_]+)\s*}}/g,
      (_, key) => (sample ? samples[key] : this.variables[key]) || `{{${key}}}`,
    );
  }
  get canSend(): boolean {
    return (
      !!this.chosen?.enabled &&
      !!this.recipient.trim() &&
      this.usedVariables.every((key) => !!this.variables[key]?.trim()) &&
      (!this.sendLater || !!this.schedule)
    );
  }
  smsLength(text: string): string {
    const basic =
      '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà';
    const extended = '^{}\\[~]|€';
    let units = 0,
      unicode = false;
    for (const char of text) {
      if (basic.includes(char)) units++;
      else if (extended.includes(char)) units += 2;
      else {
        unicode = true;
        break;
      }
    }
    if (unicode) units = text.length;
    const single = unicode ? 70 : 160,
      multi = unicode ? 67 : 153;
    return `${units} ${unicode ? 'Unicode' : 'GSM-7'} units · ~${units <= single ? 1 : Math.ceil(units / multi)} SMS segment(s)`;
  }
  saveSms(): void {
    this.busy = true;
    this.settings.updateSettings({ sms: this.sms }).subscribe({
      next: (res) => {
        this.sms = { ...this.sms, ...res.settings.sms, sms_api_key: '' };
        this.dirty = false;
        this.done('SMS configuration saved.');
      },
      error: (err) => this.fail(err),
    });
  }
  testSms(): void {
    if (
      !confirm(
        `Send a real test SMS to ${this.testPhone}? Provider charges may apply.`,
      )
    )
      return;
    this.busy = true;
    this.svc
      .testSms(this.testPhone)
      .subscribe({
        next: (res) => this.done(res.message),
        error: (err) => this.fail(err),
      });
  }
  saveTemplate(): void {
    this.busy = true;
    this.svc.saveTemplate(this.editor).subscribe({
      next: (template) => {
        this.editor = { ...template };
        this.done(
          'Template saved. Scheduled messages keep their original content.',
        );
        this.loadTemplates();
      },
      error: (err) => this.fail(err),
    });
  }
  send(): void {
    if (!this.canSend || this.busy) return;
    let scheduledAt: string | null = null;
    if (this.sendLater) {
      const date = new Date(this.schedule);
      if (isNaN(date.getTime()) || date.getTime() <= Date.now()) {
        this.fail(null, 'Choose a future send time.');
        return;
      }
      scheduledAt = date.toISOString();
    }
    if (
      !confirm(
        `${this.sendLater ? 'Schedule' : 'Send'} this ${this.chosen!.channel.toUpperCase()} to ${this.recipient}? ${this.chosen!.channel === 'sms' ? 'Provider charges may apply.' : ''}`,
      )
    )
      return;
    this.busy = true;
    this.svc
      .send({
        template_id: Number(this.templateId),
        recipient: this.recipient.trim(),
        variables: this.variables,
        scheduled_at: scheduledAt,
      })
      .subscribe({
        next: (message) => {
          this.done(
            message.status === 'pending'
              ? 'Message scheduled. The server scheduler must be running.'
              : message.status === 'logged'
                ? 'Email logged only; no email sent.'
                : message.status === 'accepted'
                  ? 'Provider accepted the message; delivery is not yet confirmed.'
                  : message.error || 'Message was not accepted.',
          );
          this.isError = message.status === 'failed';
          this.recipient = '';
        },
        error: (err) => this.fail(err),
      });
  }
  loadHistory(page = 1): void {
    this.historyLoading = true;
    this.svc.messages(page).subscribe({
      next: (res) => {
        this.messages = res.data;
        this.page = res.current_page;
        this.lastPage = res.last_page;
        this.total = res.total;
        this.historyLoading = false;
      },
      error: (err) => {
        this.historyLoading = false;
        this.fail(err);
      },
    });
  }
  cancel(message: OutboundMessage): void {
    if (!confirm(`Cancel scheduled message #${message.id}?`)) return;
    this.busy = true;
    this.svc.cancel(message.id).subscribe({
      next: () => {
        this.done('Message cancelled.');
        this.loadHistory(this.page);
      },
      error: (err) => this.fail(err),
    });
  }
  get browserTimezone(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
  private done(message: string): void {
    this.busy = false;
    this.notice = message;
    this.isError = false;
  }
  private fail(err: any, fallback = 'Unable to complete this action.'): void {
    this.busy = false;
    const errors = err?.error?.errors;
    this.notice = errors
      ? Object.values(errors).flat().join(' ')
      : err?.error?.message || fallback;
    this.isError = true;
  }
}
