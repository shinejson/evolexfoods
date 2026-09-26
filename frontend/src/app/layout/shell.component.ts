import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgFor } from '@angular/common';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgFor],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss'
})
export class ShellComponent {
  nav = [
    { path: '/hub', label: 'Hub' },
    { path: '/ceo', label: 'CEO Command' },
    { path: '/livestock', label: 'Livestock' },
    { path: '/health', label: 'Health' },
    { path: '/breeding', label: 'Breeding' },
    { path: '/feed', label: 'Feed' },
    { path: '/inventory', label: 'Inventory' },
    { path: '/procurement', label: 'Procurement' },
    { path: '/suppliers', label: 'Suppliers' },
    { path: '/assets', label: 'Assets' },
    { path: '/maintenance', label: 'Maintenance' },
    { path: '/hr', label: 'People' },
    { path: '/tasks', label: 'Tasks' },
    { path: '/finance', label: 'Finance' },
    { path: '/crm', label: 'CRM' },
    { path: '/marketing', label: 'Marketing' },
    { path: '/risks', label: 'Risks' },
    { path: '/decisions', label: 'Decisions' },
    { path: '/sops', label: 'SOPs' }
  ];

  constructor(public auth: AuthService) {}
}
