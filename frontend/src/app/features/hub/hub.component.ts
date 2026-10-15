import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

interface HubAction {
  id: string;
  label: string;
  route: string;
}

interface HubResponse {
  quick_actions?: HubAction[];
  sections?: string[];
}

type FormType = 'birth' | 'death' | 'sick' | 'treatment' | 'purchase';
type ActionIcon = 'animal' | 'box' | 'tools' | 'alert' | 'calendar' | 'book' | 'chart' | 'arrow';

interface ActionDetails {
  description: string;
  icon: ActionIcon;
}

interface QuickAction extends HubAction {
  description: string;
  icon: ActionIcon;
  available: boolean;
}

interface QuickActionForm {
  mother_animal_id?: string;
  species?: string;
  sex?: string;
  breed?: string;
  birth_weight?: number | null;
  animal_id?: string;
  cause?: string;
  condition?: string;
  severity?: string;
  treatment_type?: string;
  medicine?: string;
  dosage?: string;
  item_name?: string;
  category?: string;
  quantity?: number | null;
  unit?: string;
  estimated_cost?: number | null;
  priority?: string;
  justification?: string;
}

interface WorkspaceModule {
  label: string;
  description: string;
  route: string;
}

interface WorkspaceGroup {
  title: string;
  description: string;
  icon: 'animal' | 'box' | 'people' | 'chart';
  modules: WorkspaceModule[];
}

const ACTION_DETAILS: Record<string, ActionDetails> = {
  birth: { description: 'Add a new arrival to the herd', icon: 'animal' },
  death: { description: 'Update an animal’s record', icon: 'animal' },
  sick: { description: 'Open a health case for follow-up', icon: 'animal' },
  treatment: { description: 'Log care, medicine and dosage', icon: 'animal' },
  breeding: { description: 'Track a breeding event', icon: 'animal' },
  purchase: { description: 'Send a request for approval', icon: 'box' },
  receive: { description: 'Update stock received on site', icon: 'box' },
  issue: { description: 'Record stock issued to a team', icon: 'box' },
  maintenance: { description: 'Log an equipment or facility issue', icon: 'tools' },
  incident: { description: 'Flag a risk for the team', icon: 'alert' },
  calendar: { description: 'Calendar view is not available yet', icon: 'calendar' },
  sops: { description: 'Open standard operating procedures', icon: 'book' },
  ceo: { description: 'Review the executive overview', icon: 'chart' }
};

const FORM_TYPES: Record<string, FormType> = {
  birth: 'birth',
  death: 'death',
  sick: 'sick',
  treatment: 'treatment',
  purchase: 'purchase'
};

const FORM_ENDPOINTS: Record<FormType, string> = {
  birth: '/livestock/events/birth',
  death: '/livestock/events/death',
  sick: '/livestock/events/sick',
  treatment: '/livestock/events/treatment',
  purchase: '/procurement/requests'
};

const FORM_TITLES: Record<FormType, string> = {
  birth: 'animal birth',
  death: 'animal death',
  sick: 'health case',
  treatment: 'animal treatment',
  purchase: 'purchase request'
};

@Component({
  selector: 'app-hub',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './hub.component.html',
  styleUrl: './hub.component.scss'
})
export class HubComponent implements OnInit {
  actions: QuickAction[] = [];
  isLoading = true;
  loadError = '';
  searchTerm = '';
  activeForm: FormType | null = null;
  form: QuickActionForm = {};
  formError = '';
  formSubmitted = false;
  isSaving = false;

  readonly dateLabel = new Intl.DateTimeFormat('en', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date());

  readonly workspaceGroups: WorkspaceGroup[] = [
    {
      title: 'Farm operations',
      description: 'The day-to-day care and movement of your herd.',
      icon: 'animal',
      modules: [
        { label: 'Livestock', description: 'Animal register and events', route: '/livestock' },
        { label: 'Health', description: 'Health cases and monitoring', route: '/health' },
        { label: 'Treatments', description: 'Care plans and medication', route: '/treatments' },
        { label: 'Breeding', description: 'Cycles, pairings and outcomes', route: '/breeding' },
        { label: 'Kidding Radar', description: 'Gestation & expected kidding horizon', route: '/kidding-radar' },
        { label: 'Feed', description: 'Feed stock and consumption', route: '/feed' }
      ]
    },
    {
      title: 'Supply & facilities',
      description: 'Keep essential resources and equipment moving.',
      icon: 'box',
      modules: [
        { label: 'Inventory', description: 'Stock levels and movements', route: '/inventory' },
        { label: 'Procurement', description: 'Requests and purchasing', route: '/procurement' },
        { label: 'Suppliers', description: 'Supplier directory', route: '/suppliers' },
        { label: 'Assets', description: 'Equipment and farm assets', route: '/assets' },
        { label: 'Maintenance', description: 'Tickets and scheduled work', route: '/maintenance' }
      ]
    },
    {
      title: 'People & process',
      description: 'Coordinate the people and routines behind the work.',
      icon: 'people',
      modules: [
        { label: 'People', description: 'Employee records and attendance', route: '/hr' },
        { label: 'Tasks', description: 'Open work and assignments', route: '/tasks' },
        { label: 'SOPs', description: 'Standard operating procedures', route: '/sops' }
      ]
    },
    {
      title: 'Business & oversight',
      description: 'A clear view of performance, customers and decisions.',
      icon: 'chart',
      modules: [
        { label: 'CEO Command', description: 'Executive overview', route: '/ceo' },
        { label: 'Finance overview', description: 'Spend, payables and cash activity', route: '/finance' },
        { label: 'Expenses', description: 'Operating costs and expense records', route: '/expenses' },
        { label: 'Invoices & payables', description: 'Supplier bills and due dates', route: '/invoices' },
        { label: 'Payments', description: 'Supplier payment register', route: '/payments' },
        { label: 'Finance reports', description: 'Period summaries and exports', route: '/finance/reports' },
        { label: 'CRM', description: 'Company accounts', route: '/crm' },
        { label: 'Contacts', description: 'Buyer-side people and decision makers', route: '/contacts' },
        { label: 'Deals', description: 'Commercial sales pipeline', route: '/deals' },
        { label: 'Sales & culls', description: 'Livestock sales records and realized value', route: '/sales' },
        { label: 'Campaigns', description: 'Marketing initiatives, timing and budgets', route: '/campaigns' },
        { label: 'Content calendar', description: 'Create, review and schedule content', route: '/marketing' },
        { label: 'Channel performance', description: 'Reach, engagement and lead metrics', route: '/marketing/performance' },
        { label: 'Risks', description: 'Risk register and alerts', route: '/risks' },
        { label: 'Decisions', description: 'Pending owner decisions', route: '/decisions' }
      ]
    }
  ];

  constructor(
    private readonly api: ApiService,
    private readonly router: Router,
    private readonly auth: AuthService
  ) {}

  ngOnInit(): void {
    this.loadHub();
  }

  get greeting(): string {
    const firstName = this.auth.user?.name?.trim().split(/\s+/)[0];
    const hour = new Date().getHours();
    const salutation = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    return firstName ? `${salutation}, ${firstName}.` : `${salutation}, team.`;
  }

  get formTitle(): string {
    return this.activeForm ? FORM_TITLES[this.activeForm] : '';
  }

  get filteredActions(): QuickAction[] {
    const query = this.searchTerm.trim().toLowerCase();
    if (!query) {
      return this.actions;
    }

    return this.actions.filter((action) =>
      `${action.label} ${action.description}`.toLowerCase().includes(query)
    );
  }

  loadHub(): void {
    this.isLoading = true;
    this.loadError = '';

    this.api.get<HubResponse>('/hub').subscribe({
      next: (response) => {
        this.actions = (response.quick_actions ?? []).map((action) => {
          const details = ACTION_DETAILS[action.id] ?? {
            description: 'Open this area in your workspace',
            icon: 'arrow' as const
          };
          const available = Boolean(action.route) && !(action.id === 'calendar' || action.route === '/hub');

          return { ...action, ...details, available };
        });
        this.isLoading = false;
      },
      error: () => {
        this.actions = [];
        this.isLoading = false;
        this.loadError = 'We couldn’t load your shortcuts. Check your connection and try again.';
      }
    });
  }

  go(action: QuickAction): void {
    if (!action.available) {
      return;
    }

    const formType = FORM_TYPES[action.id];
    if (formType) {
      this.activeForm = formType;
      this.form = this.initialForm(formType);
      this.formError = '';
      this.formSubmitted = false;
      return;
    }

    this.router.navigateByUrl(action.route);
  }

  submit(formDirective: NgForm): void {
    if (!this.activeForm || this.isSaving || this.formSubmitted) {
      return;
    }

    if (formDirective.invalid) {
      formDirective.form.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    this.formError = '';

    this.api.post(FORM_ENDPOINTS[this.activeForm], this.form).subscribe({
      next: () => {
        this.isSaving = false;
        this.formSubmitted = true;
      },
      error: () => {
        this.isSaving = false;
        this.formError = 'We couldn’t save this record. Review the details and try again.';
      }
    });
  }

  closeForm(): void {
    if (this.isSaving) {
      return;
    }

    this.activeForm = null;
    this.form = {};
    this.formError = '';
    this.formSubmitted = false;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.activeForm && !this.isSaving) {
      this.closeForm();
    }
  }

  private initialForm(type: FormType): QuickActionForm {
    switch (type) {
      case 'birth':
        return { species: 'goat', sex: 'female' };
      case 'sick':
        return { severity: 'moderate' };
      case 'purchase':
        return { unit: 'kg', priority: 'normal' };
      case 'death':
      case 'treatment':
        return {};
    }
  }
}
