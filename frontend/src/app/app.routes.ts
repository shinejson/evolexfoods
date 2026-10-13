import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { ShellComponent } from './layout/shell.component';
import { LoginComponent } from './features/login/login.component';
import { HubComponent } from './features/hub/hub.component';
import { CeoComponent } from './features/ceo/ceo.component';
import { HealthComponent } from './features/health/health.component';
import { BreedingComponent } from './features/breeding/breeding.component';
import { FeedComponent } from './features/feed/feed.component';
import { LivestockComponent } from './features/livestock/livestock.component';
import { CrudPageComponent } from './features/records/crud-page.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'ceo' },
      { path: 'hub', component: HubComponent },
      { path: 'ceo', component: CeoComponent },
      // Merge resolution: keep both purpose-built workspaces (livestock + health)
      // instead of routing either one back to the generic CRUD page.
      { path: 'livestock', component: LivestockComponent },
      { path: 'health', component: HealthComponent },
      { path: 'treatments', component: CrudPageComponent, data: { resource: 'treatments' } },
      { path: 'breeding', component: BreedingComponent },
      { path: 'feed', component: FeedComponent },
      { path: 'inventory', component: CrudPageComponent, data: { resource: 'inventory' } },
      { path: 'procurement', component: CrudPageComponent, data: { resource: 'procurement' } },
      { path: 'suppliers', component: CrudPageComponent, data: { resource: 'suppliers' } },
      { path: 'assets', component: CrudPageComponent, data: { resource: 'assets' } },
      { path: 'maintenance', component: CrudPageComponent, data: { resource: 'maintenance' } },
      { path: 'hr', component: CrudPageComponent, data: { resource: 'employees' } },
      { path: 'tasks', component: CrudPageComponent, data: { resource: 'tasks' } },
      { path: 'finance', component: CrudPageComponent, data: { resource: 'expenses' } },
      { path: 'invoices', component: CrudPageComponent, data: { resource: 'invoices' } },
      { path: 'crm', component: CrudPageComponent, data: { resource: 'companies' } },
      { path: 'deals', component: CrudPageComponent, data: { resource: 'deals' } },
      { path: 'marketing', component: CrudPageComponent, data: { resource: 'marketing' } },
      { path: 'risks', component: CrudPageComponent, data: { resource: 'risks' } },
      { path: 'decisions', component: CrudPageComponent, data: { resource: 'decisions' } },
      { path: 'sops', component: CrudPageComponent, data: { resource: 'sops' } }
    ]
  },
  { path: '**', redirectTo: 'ceo' }
];
