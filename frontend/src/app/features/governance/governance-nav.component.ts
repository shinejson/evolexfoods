import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgFor, NgIf } from '@angular/common';

@Component({
  selector: 'app-governance-nav',
  standalone: true,
  imports: [NgFor, NgIf, RouterLink, RouterLinkActive],
  templateUrl: './governance-nav.component.html',
  styleUrl: './governance-nav.component.scss'
})
export class GovernanceNavComponent {
  readonly pages = [
    { label: 'Risk Register', route: '/risks', icon: 'risks', desc: 'Identify, monitor & mitigate farm risks' },
    { label: 'Owner Decisions', route: '/decisions', icon: 'decisions', desc: 'Ownership approvals & signoffs' },
    { label: 'SOP Library', route: '/sops', icon: 'sops', desc: 'Controlled standard operating procedures' }
  ];
}
