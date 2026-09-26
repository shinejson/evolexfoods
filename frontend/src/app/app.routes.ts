import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { ShellComponent } from './layout/shell.component';
import { LoginComponent } from './features/login/login.component';
import { HubComponent } from './features/hub/hub.component';
import { CeoComponent } from './features/ceo/ceo.component';
import { LivestockComponent } from './features/livestock/livestock.component';
import { HealthComponent } from './features/health/health.component';
import { BreedingComponent } from './features/breeding/breeding.component';
import { FeedComponent } from './features/feed/feed.component';
import { InventoryComponent } from './features/inventory/inventory.component';
import { ProcurementComponent } from './features/procurement/procurement.component';
import { SimpleListComponent } from './features/simple-list/simple-list.component';

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
      { path: 'livestock', component: LivestockComponent },
      { path: 'health', component: HealthComponent },
      { path: 'breeding', component: BreedingComponent },
      { path: 'feed', component: FeedComponent },
      { path: 'inventory', component: InventoryComponent },
      { path: 'procurement', component: ProcurementComponent },
      { path: 'suppliers', component: SimpleListComponent, data: { page: 'suppliers' } },
      { path: 'assets', component: SimpleListComponent, data: { page: 'assets' } },
      { path: 'maintenance', component: SimpleListComponent, data: { page: 'maintenance' } },
      { path: 'hr', component: SimpleListComponent, data: { page: 'hr' } },
      { path: 'tasks', component: SimpleListComponent, data: { page: 'tasks' } },
      { path: 'finance', component: SimpleListComponent, data: { page: 'finance' } },
      { path: 'crm', component: SimpleListComponent, data: { page: 'crm' } },
      { path: 'marketing', component: SimpleListComponent, data: { page: 'marketing' } },
      { path: 'risks', component: SimpleListComponent, data: { page: 'risks' } },
      { path: 'decisions', component: SimpleListComponent, data: { page: 'decisions' } },
      { path: 'sops', component: SimpleListComponent, data: { page: 'sops' } }
    ]
  },
  { path: '**', redirectTo: 'ceo' }
];
