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
    filters: [
      { key: 'location', label: 'Location', source: 'location' },
      { key: 'breed', label: 'Breed', source: 'breed' },
      { key: 'sex', label: 'Sex', source: 'sex' },
      { key: 'status', label: 'Status', source: 'status' }
    ],
    columns: [
      { key: 'head_count', label: 'Head Count', align: 'right', kind: 'count', value: () => 1, aggregate: 'count' },
      { key: 'avg_weight', label: 'Avg Weight', align: 'right', kind: 'number', unit: 'kg', value: (r) => num(r.weight), aggregate: 'avg' },
      { key: 'avg_cost', label: 'Avg Cost', align: 'right', kind: 'money', value: (r) => num(r.cost), aggregate: 'avg' },
      { key: 'herd_value', label: 'Herd Value', align: 'right', kind: 'money', value: (r) => num(r.cost), aggregate: 'sum' }
    ]
  },
  herd_by_location: {
    id: 'herd_by_location',
    title: 'Herd by Location',
    endpoint: '/records/livestock',
    groupBy: 'location',
    emptyHint: 'No animals are assigned to the selected locations.',
    filters: [
      { key: 'species', label: 'Species', source: 'species' },
      { key: 'breed', label: 'Breed', source: 'breed' },
      { key: 'status', label: 'Status', source: 'status' }
    ],
    columns: [
      { key: 'animals', label: 'Animals', align: 'right', kind: 'count', value: () => 1, aggregate: 'count' },
      { key: 'males', label: 'Males', align: 'right', kind: 'count', value: (r) => (r.sex === 'male' ? 1 : 0), aggregate: 'sum' },
      { key: 'females', label: 'Females', align: 'right', kind: 'count', value: (r) => (r.sex === 'female' ? 1 : 0), aggregate: 'sum' },
      { key: 'herd_value', label: 'Herd Value', align: 'right', kind: 'money', value: (r) => num(r.cost), aggregate: 'sum' }
    ]
  },
  health_summary: {
    id: 'health_summary',
    title: 'Health Case Summary',
    endpoint: '/records/health',
    dateField: 'recorded_date',
    groupBy: 'condition',
    emptyHint: 'No health cases were recorded in this period.',
    filters: [
      { key: 'severity', label: 'Severity', source: 'severity' },
      { key: 'status', label: 'Status', source: 'status' }
    ],
    columns: [
      { key: 'cases', label: 'Cases', align: 'right', kind: 'count', value: () => 1, aggregate: 'count' },
      { key: 'open', label: 'Open', align: 'right', kind: 'count', value: (r) => (r.status === 'open' ? 1 : 0), aggregate: 'sum' },
      { key: 'closed', label: 'Closed', align: 'right', kind: 'count', value: (r) => (r.status === 'closed' ? 1 : 0), aggregate: 'sum' },
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
    filters: [
      { key: 'type', label: 'Treatment Type', source: 'type' },
      { key: 'status', label: 'Status', source: 'status' }
    ],
    columns: [
      { key: 'treatments', label: 'Treatments', align: 'right', kind: 'count', value: () => 1, aggregate: 'count' },
      { key: 'animals', label: 'Animals Treated', align: 'right', kind: 'count', value: (r) => r.animal_id, aggregate: 'count-distinct' },
      { key: 'completed', label: 'Completed', align: 'right', kind: 'count', value: (r) => (r.status === 'completed' ? 1 : 0), aggregate: 'sum' },
      { key: 'ongoing', label: 'Ongoing', align: 'right', kind: 'count', value: (r) => (r.status === 'ongoing' ? 1 : 0), aggregate: 'sum' }
    ]
  },
  sales_summary: {
    id: 'sales_summary',
    title: 'Sales & Culls Summary',
    endpoint: '/records/sales',
    dateField: 'event_date',
    groupBy: 'type',
    emptyHint: 'No sales or culls were recorded in this period.',
    filters: [{ key: 'type', label: 'Event Type', source: 'type' }],
    columns: [
      { key: 'quantity', label: 'Quantity', align: 'right', kind: 'count', value: () => 1, aggregate: 'count' },
      { key: 'unit_price', label: 'Unit Price', align: 'right', kind: 'money', value: (r) => num(r.amount), aggregate: 'avg' },
      { key: 'amount', label: 'Amount', align: 'right', kind: 'money', value: (r) => num(r.amount), aggregate: 'sum' },
      { key: 'total_amount', label: 'Total Amount', align: 'right', kind: 'money', value: (r) => num(r.amount), aggregate: 'sum' }
    ]
  },
  expense_summary: {
    id: 'expense_summary',
    title: 'Expense Summary',
    endpoint: '/records/expenses',
    dateField: 'expense_date',
    groupBy: 'category',
    emptyHint: 'No expenses were recorded in this period.',
    filters: [{ key: 'source', label: 'Business Source', source: 'source' }],
    columns: [
      { key: 'entries', label: 'Entries', align: 'right', kind: 'count', value: () => 1, aggregate: 'count' },
      { key: 'average', label: 'Average', align: 'right', kind: 'money', value: (r) => num(r.amount), aggregate: 'avg' },
      { key: 'total_amount', label: 'Total Amount', align: 'right', kind: 'money', value: (r) => num(r.amount), aggregate: 'sum' }
    ]
  },
  inventory_summary: {
    id: 'inventory_summary',
    title: 'Inventory Stock Summary',
    endpoint: '/records/inventory',
    groupBy: 'category',
    emptyHint: 'No inventory items match the selected filters.',
    filters: [
      { key: 'supplier', label: 'Supplier', source: 'supplier' },
      { key: 'status', label: 'Status', source: 'status' }
    ],
    columns: [
      { key: 'items', label: 'Items', align: 'right', kind: 'count', value: () => 1, aggregate: 'count' },
      { key: 'quantity', label: 'Quantity On Hand', align: 'right', kind: 'number', value: (r) => num(r.quantity_on_hand), aggregate: 'sum' },
      { key: 'avg_cost', label: 'Avg Unit Cost', align: 'right', kind: 'money', value: (r) => num(r.average_cost), aggregate: 'avg' },
      { key: 'stock_value', label: 'Stock Value', align: 'right', kind: 'money', value: (r) => num(r.quantity_on_hand) * num(r.average_cost), aggregate: 'sum' }
    ]
  },
  procurement_summary: {
    id: 'procurement_summary',
    title: 'Procurement Spend Summary',
    endpoint: '/records/procurement',
    dateField: 'request_date',
    groupBy: 'supplier',
    emptyHint: 'No purchase requests match the selected filters.',
    filters: [{ key: 'status', label: 'Status', source: 'status' }],
    columns: [
      { key: 'requests', label: 'Requests', align: 'right', kind: 'count', value: () => 1, aggregate: 'count' },
      { key: 'quantity', label: 'Quantity', align: 'right', kind: 'number', value: (r) => num(r.quantity), aggregate: 'sum' },
      { key: 'amount', label: 'Amount', align: 'right', kind: 'money', value: (r) => num(r.estimated_cost ?? r.amount), aggregate: 'sum' },
      { key: 'total_amount', label: 'Total Amount', align: 'right', kind: 'money', value: (r) => num(r.estimated_cost ?? r.amount), aggregate: 'sum' }
    ]
  },
  maintenance_summary: {
    id: 'maintenance_summary',
    title: 'Maintenance Ticket Summary',
    endpoint: '/records/maintenance',
    dateField: 'reported_at',
    groupBy: 'status',
    emptyHint: 'No maintenance tickets match the selected filters.',
    filters: [
      { key: 'priority', label: 'Priority', source: 'priority' },
      { key: 'type', label: 'Ticket Type', source: 'type' }
    ],
    columns: [
      { key: 'tickets', label: 'Tickets', align: 'right', kind: 'count', value: () => 1, aggregate: 'count' },
      { key: 'open', label: 'Open', align: 'right', kind: 'count', value: (r) => (r.status === 'open' ? 1 : 0), aggregate: 'sum' },
      { key: 'completed', label: 'Completed', align: 'right', kind: 'count', value: (r) => (r.status === 'closed' ? 1 : 0), aggregate: 'sum' }
    ]
  },
  staff_summary: {
    id: 'staff_summary',
    title: 'Staff Directory Summary',
    endpoint: '/records/employees',
    groupBy: 'department',
    emptyHint: 'No staff records match the selected filters.',
    filters: [{ key: 'status', label: 'Status', source: 'status' }],
    columns: [
      { key: 'staff', label: 'Staff', align: 'right', kind: 'count', value: () => 1, aggregate: 'count' },
      { key: 'active', label: 'Active', align: 'right', kind: 'count', value: (r) => (r.status === 'active' ? 1 : 0), aggregate: 'sum' },
      { key: 'on_leave', label: 'On Leave', align: 'right', kind: 'count', value: (r) => (r.status === 'on_leave' ? 1 : 0), aggregate: 'sum' }
    ]
  },
  task_summary: {
    id: 'task_summary',
    title: 'Task Completion Summary',
    endpoint: '/records/tasks',
    dateField: 'due_date',
    groupBy: 'status',
    emptyHint: 'No tasks match the selected filters.',
    filters: [
      { key: 'module', label: 'Module', source: 'module' },
      { key: 'priority', label: 'Priority', source: 'priority' }
    ],
    columns: [
      { key: 'tasks', label: 'Tasks', align: 'right', kind: 'count', value: () => 1, aggregate: 'count' },
      { key: 'completed', label: 'Completed', align: 'right', kind: 'count', value: (r) => (r.status === 'completed' ? 1 : 0), aggregate: 'sum' },
      { key: 'pending', label: 'Pending', align: 'right', kind: 'count', value: (r) => (r.status !== 'completed' ? 1 : 0), aggregate: 'sum' }
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
  supplier: (r) => r.supplier?.name || r.supplier_name || 'Unassigned supplier',
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
