import { Component, HostListener } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgClass, NgFor, NgIf, NgSwitch, NgSwitchCase } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../core/services/auth.service';

interface Notification {
  id: number;
  title: string;
  message: string;
  time: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgFor, NgIf, NgSwitch, NgSwitchCase, NgClass, FormsModule],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss'
})
export class ShellComponent {
  sidebarCollapsed = false;
  darkMode = false;
  showNotifications = false;
  showUserMenu = false;
  searchQuery = '';
  notificationCount = 3;
  activePopupGroup: any = null;
  
  notifications: Notification[] = [
    {
      id: 1,
      title: 'New Health Alert',
      message: 'Vaccination due for 5 animals',
      time: '5 min ago',
      type: 'warning',
      read: false
    },
    {
      id: 2,
      title: 'Purchase Order Approved',
      message: 'PO #1234 has been approved',
      time: '1 hour ago',
      type: 'success',
      read: false
    },
    {
      id: 3,
      title: 'Feed Inventory Low',
      message: 'Feed stock below threshold',
      time: '2 hours ago',
      type: 'error',
      read: false
    }
  ];
  navGroups = [
    {
      label: 'Dashboard',
      icon: 'hub',
      expanded: true,
      items: [
        { path: '/hub', label: 'Hub', icon: 'hub' },
        { path: '/ceo', label: 'CEO Command', icon: 'ceo' }
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
      label: 'Finance',
      icon: 'expenses',
      expanded: false,
      items: [
        { path: '/finance', label: 'Expenses', icon: 'expenses' },
        { path: '/invoices', label: 'Invoices', icon: 'invoices' }
      ]
    },
    {
      label: 'Commercial',
      icon: 'crm',
      expanded: false,
      items: [
        { path: '/crm', label: 'CRM', icon: 'crm' },
        { path: '/deals', label: 'Deals', icon: 'deals' },
        { path: '/marketing', label: 'Marketing', icon: 'marketing' }
      ]
    },
    {
      label: 'Governance',
      icon: 'risks',
      expanded: false,
      items: [
        { path: '/risks', label: 'Risks', icon: 'risks' },
        { path: '/decisions', label: 'Decisions', icon: 'decisions' },
        { path: '/sops', label: 'SOPs', icon: 'sops' }
      ]
    }
  ];

  constructor(public auth: AuthService, private router: Router) {
    // Load dark mode preference from localStorage
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode) {
      this.darkMode = savedDarkMode === 'true';
    }
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
    this.notifications.forEach(n => n.read = true);
    this.notificationCount = 0;
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
