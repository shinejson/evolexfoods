import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommonModule, NgClass, NgFor, NgIf, NgSwitch, NgSwitchCase } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, TwoFactorSetupResponse, TwoFaMethod } from '../core/services/auth.service';
import { NotificationService } from '../core/services/notification.service';
import { AppNotification } from '../core/models/notification.model';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgFor, NgIf, NgSwitch, NgSwitchCase, NgClass, FormsModule],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss'
})
export class ShellComponent implements OnInit, OnDestroy {
  sidebarCollapsed = false;
  darkMode = false;
  showNotifications = false;
  showUserMenu = false;
  searchQuery = '';
  activePopupGroup: any = null;

  // Notifications (live from the Notification Centre API)
  notifications: AppNotification[] = [];
  notificationCount = 0;
  private notificationRefreshTimer: ReturnType<typeof setInterval> | null = null;

  // ─── 2FA Mandatory Modal ───────────────────────────────────────────────────
  showTwoFactorModal = false;
  twoFactorSetup: TwoFactorSetupResponse | null = null;
  twoFactorActivationCode = '';
  twoFactorActivating = false;
  twoFactorError = '';
  twoFactorSuccess = false;
  copiedKey = false;
  copiedCodes = false;

  // Multi-method activation
  shellActivationStep: 'select-method' | 'send-otp' | 'verify' = 'select-method';
  shellSelectedMethod: TwoFaMethod = 'totp';
  shellOtpSent = false;
  shellOtpSending = false;
  shellOtpSendHint = '';

  navGroups = [
    {
      label: 'Dashboard',
      icon: 'hub',
      expanded: true,
      items: [
        { path: '/hub', label: 'Hub', icon: 'hub' },
        { path: '/notifications', label: 'Notifications', icon: 'notifications' },
        { path: '/ceo', label: 'CEO Command', icon: 'ceo' },
        { path: '/reports', label: 'Reports', icon: 'report' }
      ]
    },
    {
      label: 'Operations',
      icon: 'livestock',
      expanded: false,
      items: [
        { path: '/livestock', label: 'Livestock', icon: 'livestock' },
        { path: '/health', label: 'Health', icon: 'health' },
        { path: '/treatments', label: 'Treatments', icon: 'treatments' },
        { path: '/breeding', label: 'Breeding', icon: 'breeding' },
        { path: '/feed', label: 'Feed', icon: 'feed' }
      ]
    },
    {
      label: 'Supply Chain',
      icon: 'inventory',
      expanded: false,
      items: [
        { path: '/inventory', label: 'Inventory', icon: 'inventory' },
        { path: '/procurement', label: 'Procurement', icon: 'procurement' },
        { path: '/suppliers', label: 'Suppliers', icon: 'suppliers' },
        { path: '/assets', label: 'Assets', icon: 'assets' },
        { path: '/maintenance', label: 'Maintenance', icon: 'maintenance' }
      ]
    },
    {
      label: 'Human Resources',
      icon: 'people',
      expanded: false,
      items: [
        { path: '/hr', label: 'People', icon: 'people' },
        { path: '/tasks', label: 'Tasks', icon: 'tasks' }
      ]
    },
    {
      label: 'Finance & Accounting',
      icon: 'expenses',
      expanded: true,
      items: [
        { path: '/finance', label: 'Overview', icon: 'ceo' },
        { path: '/expenses', label: 'Expenses', icon: 'expenses' },
        { path: '/invoices', label: 'Invoices & Payables', icon: 'invoices' },
        { path: '/payments', label: 'Payments', icon: 'invoices' },
        { path: '/finance/reports', label: 'Reports', icon: 'ceo' }
      ]
    },
    {
      label: 'Commercial',
      icon: 'crm',
      expanded: false,
      items: [
        { path: '/crm', label: 'CRM · Companies', icon: 'crm' },
        { path: '/contacts', label: 'Contacts', icon: 'crm' },
        { path: '/deals', label: 'Deals & Pipeline', icon: 'deals' },
        { path: '/sales', label: 'Sales & Culls', icon: 'deals' },
        { path: '/campaigns', label: 'Campaigns', icon: 'marketing' },
        { path: '/marketing', label: 'Content Calendar', icon: 'marketing' },
        { path: '/marketing/performance', label: 'Channel Performance', icon: 'marketing' }
      ]
    },
    {
      label: 'Governance',
      icon: 'risks',
      expanded: false,
      items: [
        { path: '/risks', label: 'Risks', icon: 'risks' },
        { path: '/decisions', label: 'Decisions', icon: 'decisions' },
        { path: '/sops', label: 'SOPs', icon: 'sops' },
        { path: '/roles', label: 'Roles & Permissions', icon: 'settings' },
        { path: '/settings', label: 'System Settings', icon: 'settings' }
      ]
    }
  ];

  constructor(
    public auth: AuthService,
    private router: Router,
    private notificationSvc: NotificationService
  ) {
    // Load dark mode preference from localStorage
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode) {
      this.darkMode = savedDarkMode === 'true';
    }
  }

  ngOnInit(): void {
    this.checkTwoFactorStatus();
    this.auth.user$.subscribe(() => {
      this.checkTwoFactorStatus();
    });

    // Live notification badge + dropdown content
    this.notificationSvc.unreadCount$.subscribe((count) => (this.notificationCount = count));
    this.notificationSvc.recent$.subscribe((items) => (this.notifications = items));
    this.notificationSvc.refresh();
    this.notificationRefreshTimer = setInterval(() => this.notificationSvc.refresh(), 60_000);
  }

  ngOnDestroy(): void {
    if (this.notificationRefreshTimer) {
      clearInterval(this.notificationRefreshTimer);
    }
  }

  checkTwoFactorStatus(): void {
    if (this.auth.user && !this.auth.user.two_factor_enabled) {
      this.showTwoFactorModal = true;
      this.shellActivationStep = 'select-method';
      this.shellSelectedMethod = 'totp';
      this.shellOtpSent = false;
      this.twoFactorActivationCode = '';
      this.twoFactorError = '';
      this.loadTwoFactorSetup();
    }
  }

  loadTwoFactorSetup(): void {
    this.auth.setup2fa().subscribe({
      next: (data) => { this.twoFactorSetup = data; },
      error: (err)  => { console.error('Failed to load 2FA setup in shell:', err); }
    });
  }

  shellSelectMethod(m: TwoFaMethod): void {
    this.shellSelectedMethod = m;
  }

  shellProceedToVerify(): void {
    this.twoFactorActivationCode = '';
    this.twoFactorError = '';
    this.shellOtpSent = false;
    this.shellOtpSendHint = '';
    this.shellActivationStep = this.shellSelectedMethod === 'totp' ? 'verify' : 'send-otp';
  }

  shellSendOtp(): void {
    if (this.shellOtpSending) return;
    this.shellOtpSending = true;
    this.twoFactorError  = '';
    this.auth.sendOtp(this.shellSelectedMethod as 'email' | 'whatsapp').subscribe({
      next: (res) => {
        this.shellOtpSending    = false;
        this.shellOtpSent       = true;
        this.shellOtpSendHint   = res.message;
        this.shellActivationStep = 'verify';
      },
      error: (err) => {
        this.shellOtpSending = false;
        this.twoFactorError  = err?.error?.message || 'Failed to send code. Please try again.';
      }
    });
  }

  shellBackToSelect(): void {
    this.shellActivationStep = 'select-method';
    this.twoFactorActivationCode = '';
    this.twoFactorError = '';
    this.shellOtpSent = false;
  }

  submitTwoFactorActivation(): void {
    if (!this.twoFactorActivationCode || this.twoFactorActivationCode.trim().length < 6) {
      this.twoFactorError = 'Please enter a valid 6-digit verification code.';
      return;
    }

    this.twoFactorActivating = true;
    this.twoFactorError = '';

    this.auth.activate2fa(this.twoFactorActivationCode.trim(), this.shellSelectedMethod).subscribe({
      next: () => {
        this.twoFactorActivating = false;
        this.twoFactorSuccess = true;
        setTimeout(() => {
          this.showTwoFactorModal = false;
          this.twoFactorSuccess = false;
        }, 1500);
      },
      error: (err) => {
        this.twoFactorActivating = false;
        this.twoFactorError = err?.error?.message || 'Invalid verification code. Please try again.';
      }
    });
  }

  copySecretKey(): void {
    if (this.twoFactorSetup?.secret) {
      navigator.clipboard.writeText(this.twoFactorSetup.secret);
      this.copiedKey = true;
      setTimeout(() => this.copiedKey = false, 2500);
    }
  }

  copyRecoveryCodes(): void {
    if (this.twoFactorSetup?.recovery_codes) {
      navigator.clipboard.writeText(this.twoFactorSetup.recovery_codes.join('\n'));
      this.copiedCodes = true;
      setTimeout(() => this.copiedCodes = false, 2500);
    }
  }

  get shellMethodLabel(): string {
    const map: Record<TwoFaMethod, string> = { totp: 'Authenticator App', email: 'Email', whatsapp: 'WhatsApp' };
    return map[this.shellSelectedMethod];
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.notification-btn') && !target.closest('.notifications-dropdown')) {
      this.showNotifications = false;
    }
    if (!target.closest('.user-menu')) {
      this.showUserMenu = false;
    }
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    // Ctrl+K or Cmd+K for search focus
    if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
      event.preventDefault();
      const searchInput = document.querySelector('.search-bar input') as HTMLInputElement;
      searchInput?.focus();
    }
  }

  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  toggleDarkMode() {
    this.darkMode = !this.darkMode;
    localStorage.setItem('darkMode', this.darkMode.toString());
  }

  toggleNotifications() {
    this.showNotifications = !this.showNotifications;
    this.showUserMenu = false;
    if (this.showNotifications) {
      this.notificationSvc.refresh();
    }
  }

  toggleUserMenu() {
    this.showUserMenu = !this.showUserMenu;
    this.showNotifications = false;
  }

  onSearch() {
    console.log('Searching for:', this.searchQuery);
    // Implement search logic here
  }

  markAllRead() {
    this.notificationSvc.markAllRead().subscribe({
      next: () => this.notificationSvc.refresh(),
      error: () => void 0
    });
  }

  openNotification(notif: AppNotification) {
    this.showNotifications = false;
    this.router.navigate(['/notifications'], { queryParams: { id: notif.id } });
  }

  openAllNotifications() {
    this.showNotifications = false;
    this.router.navigate(['/notifications']);
  }

  notifTimeAgo(value: string | null | undefined): string {
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
    return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  getUserInitials(): string {
    const name = this.auth.user?.name || 'User';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  navigateTo(path: string) {
    this.showUserMenu = false;
    this.router.navigate([path]);
  }

  toggleNavGroup(group: any) {
    if (!this.sidebarCollapsed) {
      // Close all other groups
      this.navGroups.forEach(g => {
        if (g !== group) {
          g.expanded = false;
        }
      });
      // Toggle current group
      group.expanded = !group.expanded;
    }
  }

  showPopup(group: any) {
    if (this.sidebarCollapsed) {
      this.activePopupGroup = group;
    }
  }

  hidePopup() {
    if (this.sidebarCollapsed) {
      this.activePopupGroup = null;
    }
  }
}
