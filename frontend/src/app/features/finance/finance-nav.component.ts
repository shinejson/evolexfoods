import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgFor, NgIf } from '@angular/common';

@Component({
  selector: 'app-finance-nav',
  standalone: true,
  imports: [NgFor, NgIf, RouterLink, RouterLinkActive],
  templateUrl: './finance-nav.component.html',
  styleUrl: './finance-nav.component.scss'
})
export class FinanceNavComponent {
  readonly pages = [
    { label: 'Overview', route: '/finance', icon: 'overview' },
    { label: 'Expenses', route: '/expenses', icon: 'expenses' },
    { label: 'Invoices & payables', route: '/invoices', icon: 'invoices' },
    { label: 'Payments', route: '/payments', icon: 'payments' },
    { label: 'Reports', route: '/finance/reports', icon: 'reports' }
  ];
}
