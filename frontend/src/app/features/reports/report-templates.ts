/**
 * Report catalogue for the Report workspace.
 *
 * Each template maps a CRUD endpoint onto the printed-report layout used by
 * the operations teams: a grouped summary table with subtotals per group and a
 * grand total, rendered in an external browser tab.
 */

export type ReportFilterSource =
  | 'location'
  | 'supplier'
  | 'user'
  | 'employee'
  | 'species'
  | 'breed'
  | 'sex'
  | 'status'
  | 'condition'
  | 'medicine'
  | 'category'
  | 'department'
  | 'module'
  | 'priority'
  | 'severity'
  | 'type'
  | 'source';

export interface ReportFilterDef {
  key: string;
  label: string;
  source: ReportFilterSource;
}

export interface ReportColumnDef {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  kind: 'text' | 'count' | 'number' | 'money';
  unit?: string;
  permission?: string;
  value?: (row: any) => number | string | null;
  aggregate?: 'sum' | 'avg' | 'count' | 'count-distinct';
}

export type ReportGroupBy =
  | 'species'
  | 'location'
  | 'condition'
  | 'medicine'
  | 'type'
  | 'category'
  | 'supplier'
  | 'status'
  | 'department'
  | 'module'
  | 'breed';

export interface ReportTemplateDef {
  id: string;
  title: string;
  endpoint: string;
  dateField?: string;
  groupBy: ReportGroupBy;
  columns: ReportColumnDef[];
  filters: ReportFilterDef[];
  emptyHint: string;
  helpDescription?: string;
  comparisonGuides?: string[];
}

export interface ReportGroupDef {
  label: string;
  reports: string[];
}

export function num(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function labelize(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  return String(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/** Sidebar catalogue — mirrors the recommended/groups structure of the sample. */
export const REPORT_GROUPS: ReportGroupDef[] = [
  {
    label: 'Recommended Reports',
    reports: ['livestock_summary', 'health_summary', 'sales_summary', 'expense_summary', 'inventory_summary']
  },
  { label: 'Livestock Reports', reports: ['livestock_summary', 'herd_by_location'] },
  { label: 'Health Reports', reports: ['health_summary', 'treatment_summary'] },
  { label: 'Sales & Production', reports: ['sales_summary'] },
  { label: 'Supply & Inventory', reports: ['inventory_summary', 'procurement_summary'] },
  { label: 'Operations', reports: ['maintenance_summary', 'task_summary'] },
  { label: 'Finance', reports: ['expense_summary'] },
  { label: 'People', reports: ['staff_summary'] }
];

export const REPORT_TEMPLATES: Record<string, ReportTemplateDef> = {
  livestock_summary: {
    id: 'livestock_summary',
    title: 'Livestock Herd Summary',
    endpoint: '/records/livestock',
    groupBy: 'species',
    emptyHint: 'No animals match the selected filters.',
    helpDescription: 'A Livestock Herd Summary report is used to track animal census, weight metrics, asset valuation, and demographic distribution across breeds and species in all farm locations.',
    comparisonGuides: [
      'Livestock Herd Summary can be cross-checked with Feed Consumption & Inventory to reconcile daily feed utilization per head count.',
      'Can be matched against Health Case Summary for the same date range to verify morbidity rates per species and pen location.',
      'Valuation metrics should be cross-verified with Asset Register and Balance Sheet totals for accurate biological asset accounting.'
    ],
    filters: [
      { key: 'species', label: 'Species', source: 'species' },
      { key: 'breed', label: 'Breed', source: 'breed' },
      { key: 'sex', label: 'Sex', source: 'sex' },
      { key: 'status', label: 'Status', source: 'status' }
    ],
    columns: [
      { key: 'head_count', label: 'Head Count', align: 'right', kind: 'count', value: () => 1, aggregate: 'count' },
      { key: 'avg_weight', label: 'Avg Weight', align: 'right', kind: 'number', unit: 'kg', value: (r) => num(r.weight), aggregate: 'avg' },
      { key: 'males', label: 'Males', align: 'right', kind: 'count', value: (r) => (r.sex === 'male' ? 1 : 0), aggregate: 'sum' },
      { key: 'females', label: 'Females', align: 'right', kind: 'count', value: (r) => (r.sex === 'female' ? 1 : 0), aggregate: 'sum' },
      { key: 'avg_cost', label: 'Avg Cost', align: 'right', kind: 'money', permission: 'columns.cost_price', value: (r) => num(r.cost), aggregate: 'avg' },
      { key: 'herd_value', label: 'Herd Value', align: 'right', kind: 'money', permission: 'columns.valuation', value: (r) => num(r.cost), aggregate: 'sum' },
      { key: 'healthy_count', label: 'Healthy', align: 'right', kind: 'count', value: (r) => (r.health_status === 'healthy' || r.status === 'active' ? 1 : 0), aggregate: 'sum' }
    ]
  },

  herd_by_location: {
    id: 'herd_by_location',
    title: 'Herd by Location',
    endpoint: '/records/livestock',
    groupBy: 'location',
    emptyHint: 'No animals are assigned to the selected locations.',
    helpDescription: 'A Herd by Location report provides pen and barn-level distribution of animals, tracking stocking density, male/female ratios, and pen valuations across farm facilities.',
    comparisonGuides: [
      'Herd by Location can be cross-referenced with Maintenance Ticket Summary to verify pen structural integrity and facility workload.',
      'Match with Feed & Nutrition logs to ensure feeding troughs and delivery batches correspond to active herd locations.',
      'Check against Staff Assignment logs to confirm adequate worker-to-animal care ratios per facility.'
    ],
    filters: [
      { key: 'species', label: 'Species', source: 'species' },
      { key: 'breed', label: 'Breed', source: 'breed' },
      { key: 'status', label: 'Status', source: 'status' }
    ],
    columns: [
      { key: 'animals', label: 'Animals', align: 'right', kind: 'count', value: () => 1, aggregate: 'count' },
      { key: 'males', label: 'Males', align: 'right', kind: 'count', value: (r) => (r.sex === 'male' ? 1 : 0), aggregate: 'sum' },
      { key: 'females', label: 'Females', align: 'right', kind: 'count', value: (r) => (r.sex === 'female' ? 1 : 0), aggregate: 'sum' },
      { key: 'avg_weight', label: 'Avg Weight', align: 'right', kind: 'number', unit: 'kg', value: (r) => num(r.weight), aggregate: 'avg' },
      { key: 'herd_value', label: 'Herd Value', align: 'right', kind: 'money', permission: 'columns.valuation', value: (r) => num(r.cost), aggregate: 'sum' },
      { key: 'quarantine', label: 'Quarantine', align: 'right', kind: 'count', value: (r) => (r.status === 'quarantine' ? 1 : 0), aggregate: 'sum' }
    ]
  },

  health_summary: {
    id: 'health_summary',
    title: 'Health Case Summary',
    endpoint: '/records/health',
    dateField: 'recorded_date',
    groupBy: 'condition',
    emptyHint: 'No health cases were recorded in this period.',
    helpDescription: 'The Health Case Summary captures veterinary diagnosis records, disease incidence, severity distributions, and patient resolution timelines across all farm units.',
    comparisonGuides: [
      'Health Case Summary should be compared with Treatment & Medicine Summary to verify that all diagnosed conditions received prescribed protocols.',
      'Can be evaluated alongside Mortality / Cull records in Sales Summary to track clinical outcome rates.',
      'Cross-check with Procurement Summary to anticipate replenishment of vital antibiotics, vaccines, and supplements.'
    ],
    filters: [
      { key: 'severity', label: 'Severity', source: 'severity' },
      { key: 'status', label: 'Status', source: 'status' }
    ],
    columns: [
      { key: 'cases', label: 'Cases', align: 'right', kind: 'count', value: () => 1, aggregate: 'count' },
      { key: 'open', label: 'Open', align: 'right', kind: 'count', value: (r) => (r.status === 'open' ? 1 : 0), aggregate: 'sum' },
      { key: 'closed', label: 'Closed', align: 'right', kind: 'count', value: (r) => (r.status === 'closed' ? 1 : 0), aggregate: 'sum' },
      { key: 'critical', label: 'Critical', align: 'right', kind: 'count', value: (r) => (r.severity === 'critical' || r.severity === 'high' ? 1 : 0), aggregate: 'sum' },
      { key: 'animals', label: 'Animals Affected', align: 'right', kind: 'count', value: (r) => r.animal_id, aggregate: 'count-distinct' }
    ]
  },

  treatment_summary: {
    id: 'treatment_summary',
    title: 'Treatment & Medicine Summary',
    endpoint: '/records/treatments',
    dateField: 'start_date',
    groupBy: 'medicine',
    emptyHint: 'No treatments were administered in this period.',
    helpDescription: 'Tracks veterinary pharmaceutical administration, treatment courses, withdrawal period compliance, and medicine consumption per diagnosis.',
    comparisonGuides: [
      'Treatment & Medicine Summary should be matched against Inventory Stock Summary to audit pharmacy stock depletion against recorded administration.',
      'Cross-reference with Livestock Culling and Sales to enforce strict adherence to drug withdrawal periods before processing.',
      'Compare with Health Case Summary to audit treatment efficacy and recurrence rates.'
    ],
    filters: [
      { key: 'type', label: 'Treatment Type', source: 'type' },
      { key: 'status', label: 'Status', source: 'status' }
    ],
    columns: [
      { key: 'treatments', label: 'Treatments', align: 'right', kind: 'count', value: () => 1, aggregate: 'count' },
      { key: 'animals', label: 'Animals Treated', align: 'right', kind: 'count', value: (r) => r.animal_id, aggregate: 'count-distinct' },
      { key: 'completed', label: 'Completed', align: 'right', kind: 'count', value: (r) => (r.status === 'completed' ? 1 : 0), aggregate: 'sum' },
      { key: 'ongoing', label: 'Ongoing', align: 'right', kind: 'count', value: (r) => (r.status === 'ongoing' || r.status === 'active' ? 1 : 0), aggregate: 'sum' },
      { key: 'med_cost', label: 'Medicine Cost', align: 'right', kind: 'money', permission: 'columns.cost_price', value: (r) => num(r.cost), aggregate: 'sum' }
    ]
  },

  sales_summary: {
    id: 'sales_summary',
    title: 'Sales & Culls Summary',
    endpoint: '/records/sales',
    dateField: 'event_date',
    groupBy: 'type',
    emptyHint: 'No sales or culls were recorded in this period.',
    helpDescription: 'An operational sales and revenue report capturing off-take volumes, slaughterhouse distributions, customer orders, and realised gross proceeds.',
    comparisonGuides: [
      'Sales & Culls Summary must be reconciled with Invoice & Payment Records to verify outstanding accounts receivable and cash deposits.',
      'Cross-check animal IDs against Livestock Herd Summary to verify de-listing and inventory derecognition.',
      'Reconcile with Financial Expense Summary to compute net gross margins per production batch.'
    ],
    filters: [{ key: 'type', label: 'Event Type', source: 'type' }],
    columns: [
      { key: 'quantity', label: 'Quantity', align: 'right', kind: 'count', value: () => 1, aggregate: 'count' },
      { key: 'unit_price', label: 'Unit Price', align: 'right', kind: 'money', permission: 'columns.cost_price', value: (r) => num(r.amount), aggregate: 'avg' },
      { key: 'amount', label: 'Subtotal Amount', align: 'right', kind: 'money', permission: 'columns.financial_totals', value: (r) => num(r.amount), aggregate: 'sum' },
      { key: 'total_amount', label: 'Total Amount', align: 'right', kind: 'money', permission: 'columns.financial_totals', value: (r) => num(r.amount), aggregate: 'sum' },
      { key: 'profit_est', label: 'Est. Profit', align: 'right', kind: 'money', permission: 'columns.profit_margins', value: (r) => num(r.amount) * 0.22, aggregate: 'sum' }
    ]
  },

  expense_summary: {
    id: 'expense_summary',
    title: 'Expense Summary',
    endpoint: '/records/expenses',
    dateField: 'expense_date',
    groupBy: 'category',
    emptyHint: 'No expenses were recorded in this period.',
    helpDescription: 'Summarizes operational expenditures, feed procurement, fuel, maintenance outlays, and utility overheads across all cost centers.',
    comparisonGuides: [
      'Expense Summary can be matched with Purchase Orders in Procurement Summary to verify invoiced amounts against initial quotations.',
      'Compare with Sales & Production Summary to monitor operating expense ratios against monthly revenue targets.',
      'Cross-reference with Bank Activity & Audit Logs to verify transaction disbursement authorizations.'
    ],
    filters: [{ key: 'source', label: 'Business Source', source: 'source' }],
    columns: [
      { key: 'entries', label: 'Entries', align: 'right', kind: 'count', value: () => 1, aggregate: 'count' },
      { key: 'average', label: 'Average', align: 'right', kind: 'money', value: (r) => num(r.amount), aggregate: 'avg' },
      { key: 'total_amount', label: 'Total Amount', align: 'right', kind: 'money', permission: 'columns.financial_totals', value: (r) => num(r.amount), aggregate: 'sum' },
      { key: 'tax_est', label: 'Est. Tax', align: 'right', kind: 'money', permission: 'columns.tax_rates', value: (r) => num(r.amount) * 0.15, aggregate: 'sum' }
    ]
  },

  inventory_summary: {
    id: 'inventory_summary',
    title: 'Inventory Stock Summary',
    endpoint: '/records/inventory',
    groupBy: 'category',
    emptyHint: 'No inventory items match the selected filters.',
    helpDescription: 'Tracks current warehouse inventory balances, minimum safety thresholds, average unit valuation, and reorder alerts for feed, medicine, and farm supplies.',
    comparisonGuides: [
      'Inventory Stock Summary can be cross-checked with Treatment and Feeding logs to audit material consumption variances.',
      'Reconcile with Procurement Spend Summary to confirm receipt of newly delivered supplier shipments.',
      'Check against Physical Stocktake Audit sheets to detect shrinkage or expiry losses.'
    ],
    filters: [
      { key: 'supplier', label: 'Supplier', source: 'supplier' },
      { key: 'status', label: 'Status', source: 'status' }
    ],
    columns: [
      { key: 'items', label: 'Items', align: 'right', kind: 'count', value: () => 1, aggregate: 'count' },
      { key: 'quantity', label: 'Quantity On Hand', align: 'right', kind: 'number', value: (r) => num(r.quantity_on_hand), aggregate: 'sum' },
      { key: 'avg_cost', label: 'Avg Unit Cost', align: 'right', kind: 'money', permission: 'columns.cost_price', value: (r) => num(r.average_cost), aggregate: 'avg' },
      { key: 'stock_value', label: 'Stock Value', align: 'right', kind: 'money', permission: 'columns.valuation', value: (r) => num(r.quantity_on_hand) * num(r.average_cost), aggregate: 'sum' },
      { key: 'low_stock', label: 'Low Stock Items', align: 'right', kind: 'count', value: (r) => (num(r.quantity_on_hand) <= num(r.reorder_level) ? 1 : 0), aggregate: 'sum' }
    ]
  },

  procurement_summary: {
    id: 'procurement_summary',
    title: 'Procurement Spend Summary',
    endpoint: '/records/procurement',
    dateField: 'requested_at',
    groupBy: 'supplier',
    emptyHint: 'No purchase requests match the selected filters.',
    helpDescription: 'Captures purchase requests, requisition approvals, vendor commitments, and delivery status across all supplier channels.',
    comparisonGuides: [
      'Procurement Spend Summary can be compared with Supplier Accounts and Invoices to verify credit terms and timely payment fulfillment.',
      'Cross-check with Warehouse Receiving Logs in Inventory Summary to ensure ordered goods were inspected and stocked.',
      'Match with Departmental Budget allocations in Expense Summary to prevent overspending.'
    ],
    filters: [{ key: 'status', label: 'Status', source: 'status' }],
    columns: [
      { key: 'requests', label: 'Requests', align: 'right', kind: 'count', value: () => 1, aggregate: 'count' },
      { key: 'quantity', label: 'Quantity', align: 'right', kind: 'number', value: (r) => num(r.quantity), aggregate: 'sum' },
      { key: 'amount', label: 'Est. Amount', align: 'right', kind: 'money', permission: 'columns.financial_totals', value: (r) => num(r.estimated_cost ?? r.amount), aggregate: 'sum' },
      { key: 'total_amount', label: 'Total Spend', align: 'right', kind: 'money', permission: 'columns.financial_totals', value: (r) => num(r.estimated_cost ?? r.amount), aggregate: 'sum' },
      { key: 'approved', label: 'Approved', align: 'right', kind: 'count', value: (r) => (r.status === 'approved' ? 1 : 0), aggregate: 'sum' }
    ]
  },

  maintenance_summary: {
    id: 'maintenance_summary',
    title: 'Maintenance Ticket Summary',
    endpoint: '/records/maintenance',
    dateField: 'reported_at',
    groupBy: 'status',
    emptyHint: 'No maintenance tickets match the selected filters.',
    helpDescription: 'Tracks equipment, vehicle, and building maintenance tickets, turnaround times, urgent breakdowns, and associated repair expenses.',
    comparisonGuides: [
      'Maintenance Ticket Summary should be matched with Asset Register records to track asset lifecycle depreciation and frequent failure assets.',
      'Reconcile parts and lubricants utilized with Inventory Stock Summary.',
      'Check contractor service invoices against Financial Expense Summary.'
    ],
    filters: [
      { key: 'priority', label: 'Priority', source: 'priority' },
      { key: 'type', label: 'Ticket Type', source: 'type' }
    ],
    columns: [
      { key: 'tickets', label: 'Tickets', align: 'right', kind: 'count', value: () => 1, aggregate: 'count' },
      { key: 'open', label: 'Open', align: 'right', kind: 'count', value: (r) => (r.status === 'open' ? 1 : 0), aggregate: 'sum' },
      { key: 'completed', label: 'Completed', align: 'right', kind: 'count', value: (r) => (r.status === 'closed' ? 1 : 0), aggregate: 'sum' },
      { key: 'critical', label: 'Urgent', align: 'right', kind: 'count', value: (r) => (r.priority === 'urgent' || r.priority === 'high' ? 1 : 0), aggregate: 'sum' },
      { key: 'repair_cost', label: 'Repair Cost', align: 'right', kind: 'money', permission: 'columns.cost_price', value: (r) => num(r.cost), aggregate: 'sum' }
    ]
  },

  staff_summary: {
    id: 'staff_summary',
    title: 'Staff Directory Summary',
    endpoint: '/records/employees',
    groupBy: 'department',
    emptyHint: 'No staff records match the selected filters.',
    helpDescription: 'Provides employee headcount, active roster status, departmental deployment, and attendance records across all operational sites.',
    comparisonGuides: [
      'Staff Directory Summary can be cross-checked with Operations Task Summary to evaluate labor productivity and task completion velocity.',
      'Match active staff count against Biometric Clock-in logs and Payroll disbursements in Finance.',
      'Check field crew allocation against Herd by Location to ensure sufficient pen supervision.'
    ],
    filters: [{ key: 'status', label: 'Status', source: 'status' }],
    columns: [
      { key: 'staff', label: 'Staff Count', align: 'right', kind: 'count', value: () => 1, aggregate: 'count' },
      { key: 'active', label: 'Active', align: 'right', kind: 'count', value: (r) => (r.status === 'active' ? 1 : 0), aggregate: 'sum' },
      { key: 'on_leave', label: 'On Leave', align: 'right', kind: 'count', value: (r) => (r.status === 'on_leave' ? 1 : 0), aggregate: 'sum' },
      { key: 'full_time', label: 'Full Time', align: 'right', kind: 'count', value: (r) => (r.type === 'full_time' || !r.type ? 1 : 0), aggregate: 'sum' }
    ]
  },

  task_summary: {
    id: 'task_summary',
    title: 'Task Completion Summary',
    endpoint: '/records/tasks',
    dateField: 'due_date',
    groupBy: 'status',
    emptyHint: 'No tasks match the selected filters.',
    helpDescription: 'Monitors scheduled farm tasks, daily feeding cycles, sanitation routines, inspection milestones, and overdue operational tickets.',
    comparisonGuides: [
      'Task Completion Summary can be compared with Staff Directory to assess workload distribution across field operatives.',
      'Cross-reference health inspection tasks with Health Case Summary to verify compliance with scheduled animal checks.',
      'Compare maintenance work orders with Equipment Logs to track preventative maintenance compliance.'
    ],
    filters: [
      { key: 'module', label: 'Module', source: 'module' },
      { key: 'priority', label: 'Priority', source: 'priority' }
    ],
    columns: [
      { key: 'tasks', label: 'Tasks', align: 'right', kind: 'count', value: () => 1, aggregate: 'count' },
      { key: 'completed', label: 'Completed', align: 'right', kind: 'count', value: (r) => (r.status === 'completed' ? 1 : 0), aggregate: 'sum' },
      { key: 'pending', label: 'Pending', align: 'right', kind: 'count', value: (r) => (r.status !== 'completed' ? 1 : 0), aggregate: 'sum' },
      { key: 'urgent', label: 'Urgent', align: 'right', kind: 'count', value: (r) => (r.priority === 'urgent' || r.priority === 'high' ? 1 : 0), aggregate: 'sum' }
    ]
  }
};

/** Grouping key resolvers, keyed by `groupBy`. */
export const REPORT_GROUP_RESOLVERS: Record<ReportGroupBy, (row: any) => string> = {
  species: (r) => labelize(r.species) || 'Unspecified',
  location: (r) => r.location?.name || 'Unassigned location',
  condition: (r) => labelize(r.condition) || 'Unclassified',
  medicine: (r) => r.medicine || 'Unspecified',
  type: (r) => labelize(r.type) || 'Uncategorised',
  category: (r) => labelize(r.category) || 'Uncategorised',
  supplier: (r) => r.supplier?.name || r.supplier_name || labelize(r.category) || 'Unassigned supplier',
  status: (r) => labelize(r.status) || 'Unknown status',
  department: (r) => r.department || 'Unassigned department',
  module: (r) => labelize(r.module) || 'General',
  breed: (r) => r.breed || 'Unspecified'
};

/** Distinct-value fields for the row-driven filter dropdowns. */
export const REPORT_ROW_FIELD: Partial<Record<ReportFilterSource, string>> = {
  species: 'species',
  breed: 'breed',
  sex: 'sex',
  status: 'status',
  condition: 'condition',
  medicine: 'medicine',
  category: 'category',
  department: 'department',
  module: 'module',
  priority: 'priority',
  severity: 'severity',
  type: 'type',
  source: 'source'
};
