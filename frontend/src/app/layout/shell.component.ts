import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgFor, NgIf, NgSwitch, NgSwitchCase } from '@angular/common';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgFor, NgIf, NgSwitch, NgSwitchCase],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss'
})
export class ShellComponent {
  navGroups = [
    {
      items: [
        { path: '/hub', label: 'Hub', icon: 'hub' },
        { path: '/ceo', label: 'CEO Command', icon: 'ceo' }
      ]
    },
    {
      items: [
        { path: '/livestock', label: 'Livestock', icon: 'livestock' },
        { path: '/health', label: 'Health', icon: 'health' },
        { path: '/treatments', label: 'Treatments', icon: 'treatments' },
        { path: '/breeding', label: 'Breeding', icon: 'breeding' },
        { path: '/feed', label: 'Feed', icon: 'feed' }
      ]
    },
    {
      items: [
        { path: '/inventory', label: 'Inventory', icon: 'inventory' },
        { path: '/procurement', label: 'Procurement', icon: 'procurement' },
        { path: '/suppliers', label: 'Suppliers', icon: 'suppliers' },
        { path: '/assets', label: 'Assets', icon: 'assets' },
        { path: '/maintenance', label: 'Maintenance', icon: 'maintenance' }
      ]
    },
    {
      items: [
        { path: '/hr', label: 'People', icon: 'people' },
        { path: '/tasks', label: 'Tasks', icon: 'tasks' }
      ]
    },
    {
      items: [
        { path: '/finance', label: 'Expenses', icon: 'expenses' },
        { path: '/invoices', label: 'Invoices', icon: 'invoices' }
      ]
    },
    {
      items: [
        { path: '/crm', label: 'CRM', icon: 'crm' },
        { path: '/deals', label: 'Deals', icon: 'deals' },
        { path: '/marketing', label: 'Marketing', icon: 'marketing' }
      ]
    },
    {
      items: [
        { path: '/risks', label: 'Risks', icon: 'risks' },
        { path: '/decisions', label: 'Decisions', icon: 'decisions' },
        { path: '/sops', label: 'SOPs', icon: 'sops' }
      ]
    }
  ];

  constructor(public auth: AuthService) {}
}
