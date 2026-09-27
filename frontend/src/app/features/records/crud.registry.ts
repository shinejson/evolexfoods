export interface FieldDef {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'textarea';
  required?: boolean;
  options?: { value: string; label: string }[];
  lookup?: 'locations' | 'suppliers' | 'users' | 'employees' | 'animals' | 'assets' | 'companies';
  lookupValue?: string;
  lookupLabel?: string;
  hidden?: boolean;
  placeholder?: string;
}

export interface ResourceDef {
  title: string;
  subtitle: string;
  columns: { key: string; label: string; render?: (row: any) => string }[];
  fields: FieldDef[];
  defaults?: Record<string, any>;
}

export const CRUD_RESOURCES: Record<string, ResourceDef> = {
  livestock: {
    title: 'Livestock Master',
    subtitle: 'Create, edit and archive animals with unique Evolex IDs.',
    columns: [
      { key: 'animal_id', label: 'Animal ID' },
      { key: 'species', label: 'Species' },
      { key: 'breed', label: 'Breed' },
      { key: 'sex', label: 'Sex' },
      { key: 'location', label: 'Location', render: (row) => row.location?.name || '' },
      { key: 'health_status', label: 'Health' },
      { key: 'status', label: 'Status' }
    ],
    fields: [
      { key: 'animal_id', label: 'Animal ID', type: 'text', placeholder: 'Auto if blank' },
      { key: 'tag_id', label: 'Tag ID', type: 'text' },
      { key: 'species', label: 'Species', type: 'select', required: true, options: [
        { value: 'goat', label: 'Goat' }, { value: 'sheep', label: 'Sheep' }, { value: 'cattle', label: 'Cattle' }
      ]},
      { key: 'breed', label: 'Breed', type: 'text' },
      { key: 'sex', label: 'Sex', type: 'select', required: true, options: [
        { value: 'female', label: 'Female' }, { value: 'male', label: 'Male' }
      ]},
      { key: 'dob', label: 'Date of birth', type: 'date' },
      { key: 'location_id', label: 'Location', type: 'select', lookup: 'locations' },
      { key: 'weight', label: 'Weight (kg)', type: 'number' },
      { key: 'source', label: 'Source', type: 'select', options: [
        { value: 'born_on_farm', label: 'Born on farm' }, { value: 'purchased', label: 'Purchased' }
      ]},
      { key: 'health_status', label: 'Health status', type: 'select', options: [
        { value: 'healthy', label: 'Healthy' }, { value: 'sick', label: 'Sick' }, { value: 'quarantine', label: 'Quarantine' }
      ]},
      { key: 'pregnancy_status', label: 'Pregnancy', type: 'select', options: [
        { value: 'open', label: 'Open' }, { value: 'pregnant', label: 'Pregnant' }
      ]},
      { key: 'status', label: 'Status', type: 'select', options: [
        { value: 'alive', label: 'Alive' }, { value: 'dead', label: 'Dead' }
      ]},
      { key: 'notes', label: 'Notes', type: 'textarea' }
    ],
    defaults: { species: 'goat', sex: 'female', status: 'alive', health_status: 'healthy' }
  },
  health: {
    title: 'Health Records',
    subtitle: 'Open and closed animal health cases.',
    columns: [
      { key: 'animal', label: 'Animal', render: (row) => row.animal?.animal_id || row.animal_id },
      { key: 'condition', label: 'Condition' },
      { key: 'severity', label: 'Severity' },
      { key: 'recorded_date', label: 'Recorded' },
      { key: 'status', label: 'Status' }
    ],
    fields: [
      { key: 'animal_id', label: 'Animal', type: 'select', required: true, lookup: 'animals', lookupValue: 'id', lookupLabel: 'animal_id' },
      { key: 'recorded_date', label: 'Recorded date', type: 'date', required: true },
      { key: 'condition', label: 'Condition', type: 'text', required: true },
      { key: 'severity', label: 'Severity', type: 'select', options: [
        { value: 'low', label: 'Low' }, { value: 'moderate', label: 'Moderate' }, { value: 'high', label: 'High' }, { value: 'critical', label: 'Critical' }
      ]},
      { key: 'status', label: 'Status', type: 'select', options: [
        { value: 'open', label: 'Open' }, { value: 'closed', label: 'Closed' }
      ]},
      { key: 'notes', label: 'Notes', type: 'textarea' }
    ],
    defaults: { status: 'open', severity: 'moderate' }
  },
  treatments: {
    title: 'Treatments',
    subtitle: 'Medication and treatment records.',
    columns: [
      { key: 'animal', label: 'Animal', render: (row) => row.animal?.animal_id || row.animal_id },
      { key: 'treatment_type', label: 'Type' },
      { key: 'medicine', label: 'Medicine' },
      { key: 'dosage', label: 'Dosage' },
      { key: 'start_date', label: 'Started' },
      { key: 'status', label: 'Status' }
    ],
    fields: [
      { key: 'animal_id', label: 'Animal', type: 'select', required: true, lookup: 'animals', lookupValue: 'id', lookupLabel: 'animal_id' },
      { key: 'start_date', label: 'Start date', type: 'date', required: true },
      { key: 'treatment_type', label: 'Type', type: 'text', required: true },
      { key: 'medicine', label: 'Medicine', type: 'text' },
      { key: 'dosage', label: 'Dosage', type: 'text' },
      { key: 'status', label: 'Status', type: 'select', options: [
        { value: 'active', label: 'Active' }, { value: 'completed', label: 'Completed' }
      ]},
      { key: 'notes', label: 'Notes', type: 'textarea' }
    ],
    defaults: { status: 'active' }
  },
  inventory: {
    title: 'Inventory Items',
    subtitle: 'Stock levels, reorder points and categories.',
    columns: [
      { key: 'item_id', label: 'Item ID' },
      { key: 'name', label: 'Name' },
      { key: 'category', label: 'Category' },
      { key: 'quantity_on_hand', label: 'On hand' },
      { key: 'reorder_level', label: 'Reorder' },
      { key: 'status', label: 'Status' }
    ],
    fields: [
      { key: 'item_id', label: 'Item ID', type: 'text', placeholder: 'Auto if blank' },
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'category', label: 'Category', type: 'select', required: true, options: [
        { value: 'Feed', label: 'Feed' }, { value: 'Medicine', label: 'Medicine' }, { value: 'Veterinary Supplies', label: 'Veterinary Supplies' },
        { value: 'Tools', label: 'Tools' }, { value: 'PPE', label: 'PPE' }, { value: 'Fuel', label: 'Fuel' }, { value: 'Spare Parts', label: 'Spare Parts' }
      ]},
      { key: 'unit', label: 'Unit', type: 'text' },
      { key: 'storage_location', label: 'Storage', type: 'text' },
      { key: 'quantity_on_hand', label: 'Quantity on hand', type: 'number' },
      { key: 'average_cost', label: 'Average cost', type: 'number' },
      { key: 'supplier_id', label: 'Supplier', type: 'select', lookup: 'suppliers' },
      { key: 'reorder_level', label: 'Reorder level', type: 'number' },
      { key: 'minimum_stock', label: 'Minimum stock', type: 'number' },
      { key: 'expiry_date', label: 'Expiry date', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', options: [
        { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }
      ]}
    ],
    defaults: { unit: 'kg', status: 'active', quantity_on_hand: 0 }
  },
  suppliers: {
    title: 'Suppliers',
    subtitle: 'Supplier directory with contact and category.',
    columns: [
      { key: 'code', label: 'Code' },
      { key: 'name', label: 'Name' },
      { key: 'category', label: 'Category' },
      { key: 'phone', label: 'Phone' },
      { key: 'email', label: 'Email' },
      { key: 'status', label: 'Status' }
    ],
    fields: [
      { key: 'code', label: 'Code', type: 'text', placeholder: 'Auto if blank' },
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'category', label: 'Category', type: 'text' },
      { key: 'contact_name', label: 'Contact', type: 'text' },
      { key: 'phone', label: 'Phone', type: 'text' },
      { key: 'email', label: 'Email', type: 'text' },
      { key: 'location', label: 'Location', type: 'text' },
      { key: 'rating', label: 'Rating', type: 'number' },
      { key: 'status', label: 'Status', type: 'select', options: [
        { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }
      ]},
      { key: 'notes', label: 'Notes', type: 'textarea' }
    ],
    defaults: { status: 'active' }
  },
  procurement: {
    title: 'Purchase Requests',
    subtitle: 'Request, approve and track purchases.',
    columns: [
      { key: 'request_number', label: 'Number' },
      { key: 'item_name', label: 'Item' },
      { key: 'quantity', label: 'Qty' },
      { key: 'estimated_cost', label: 'Est. cost' },
      { key: 'priority', label: 'Priority' },
      { key: 'status', label: 'Status' }
    ],
    fields: [
      { key: 'item_name', label: 'Item name', type: 'text', required: true },
      { key: 'category', label: 'Category', type: 'text' },
      { key: 'quantity', label: 'Quantity', type: 'number', required: true },
      { key: 'unit', label: 'Unit', type: 'text' },
      { key: 'estimated_cost', label: 'Estimated cost', type: 'number' },
      { key: 'priority', label: 'Priority', type: 'select', options: [
        { value: 'low', label: 'Low' }, { value: 'normal', label: 'Normal' }, { value: 'high', label: 'High' }
      ]},
      { key: 'status', label: 'Status', type: 'select', options: [
        { value: 'pending', label: 'Pending' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }
      ]},
      { key: 'justification', label: 'Justification', type: 'textarea' }
    ],
    defaults: { priority: 'normal', status: 'pending', unit: 'kg' }
  },
  assets: {
    title: 'Asset Register',
    subtitle: 'Equipment Evolex owns.',
    columns: [
      { key: 'asset_id', label: 'Asset ID' },
      { key: 'name', label: 'Name' },
      { key: 'category', label: 'Category' },
      { key: 'condition', label: 'Condition' },
      { key: 'status', label: 'Status' }
    ],
    fields: [
      { key: 'asset_id', label: 'Asset ID', type: 'text', placeholder: 'Auto if blank' },
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'category', label: 'Category', type: 'text' },
      { key: 'serial_number', label: 'Serial', type: 'text' },
      { key: 'purchase_date', label: 'Purchase date', type: 'date' },
      { key: 'purchase_price', label: 'Purchase price', type: 'number' },
      { key: 'supplier_id', label: 'Supplier', type: 'select', lookup: 'suppliers' },
      { key: 'location_id', label: 'Location', type: 'select', lookup: 'locations' },
      { key: 'condition', label: 'Condition', type: 'select', options: [
        { value: 'good', label: 'Good' }, { value: 'fair', label: 'Fair' }, { value: 'poor', label: 'Poor' }
      ]},
      { key: 'warranty_until', label: 'Warranty until', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', options: [
        { value: 'active', label: 'Active' }, { value: 'retired', label: 'Retired' }
      ]}
    ],
    defaults: { status: 'active', condition: 'good' }
  },
  maintenance: {
    title: 'Maintenance Tickets',
    subtitle: 'Open, assign and close equipment tickets.',
    columns: [
      { key: 'ticket_number', label: 'Ticket' },
      { key: 'title', label: 'Title' },
      { key: 'type', label: 'Type' },
      { key: 'priority', label: 'Priority' },
      { key: 'status', label: 'Status' }
    ],
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'asset_id', label: 'Asset', type: 'select', lookup: 'assets' },
      { key: 'type', label: 'Type', type: 'select', options: [
        { value: 'preventive', label: 'Preventive' }, { value: 'corrective', label: 'Corrective' },
        { value: 'emergency', label: 'Emergency' }, { value: 'inspection', label: 'Inspection' }
      ]},
      { key: 'priority', label: 'Priority', type: 'select', options: [
        { value: 'low', label: 'Low' }, { value: 'normal', label: 'Normal' }, { value: 'high', label: 'High' }
      ]},
      { key: 'status', label: 'Status', type: 'select', options: [
        { value: 'open', label: 'Open' }, { value: 'assigned', label: 'Assigned' },
        { value: 'in_progress', label: 'In progress' }, { value: 'closed', label: 'Closed' }
      ]},
      { key: 'assigned_to', label: 'Assigned to', type: 'select', lookup: 'users' },
      { key: 'description', label: 'Description', type: 'textarea' }
    ],
    defaults: { type: 'corrective', priority: 'normal', status: 'open' }
  },
  employees: {
    title: 'Employees',
    subtitle: 'Employee register.',
    columns: [
      { key: 'employee_code', label: 'Code' },
      { key: 'name', label: 'Name' },
      { key: 'role', label: 'Role' },
      { key: 'department', label: 'Department' },
      { key: 'phone', label: 'Phone' },
      { key: 'status', label: 'Status' }
    ],
    fields: [
      { key: 'employee_code', label: 'Code', type: 'text', placeholder: 'Auto if blank' },
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'role', label: 'Role', type: 'text' },
      { key: 'department', label: 'Department', type: 'text' },
      { key: 'phone', label: 'Phone', type: 'text' },
      { key: 'email', label: 'Email', type: 'text' },
      { key: 'hire_date', label: 'Hire date', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', options: [
        { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }
      ]}
    ],
    defaults: { status: 'active' }
  },
  tasks: {
    title: 'Tasks',
    subtitle: 'Operational work items.',
    columns: [
      { key: 'title', label: 'Task' },
      { key: 'module', label: 'Module' },
      { key: 'priority', label: 'Priority' },
      { key: 'due_date', label: 'Due' },
      { key: 'status', label: 'Status' }
    ],
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'assigned_to', label: 'Assigned to', type: 'select', lookup: 'users' },
      { key: 'due_date', label: 'Due date', type: 'date' },
      { key: 'priority', label: 'Priority', type: 'select', options: [
        { value: 'low', label: 'Low' }, { value: 'normal', label: 'Normal' }, { value: 'high', label: 'High' }
      ]},
      { key: 'status', label: 'Status', type: 'select', options: [
        { value: 'open', label: 'Open' }, { value: 'in_progress', label: 'In progress' }, { value: 'completed', label: 'Completed' }
      ]},
      { key: 'module', label: 'Module', type: 'text' }
    ],
    defaults: { status: 'open', priority: 'normal' }
  },
  expenses: {
    title: 'Expenses',
    subtitle: 'Operating spend records.',
    columns: [
      { key: 'expense_date', label: 'Date' },
      { key: 'category', label: 'Category' },
      { key: 'description', label: 'Description' },
      { key: 'amount', label: 'Amount' }
    ],
    fields: [
      { key: 'expense_date', label: 'Date', type: 'date', required: true },
      { key: 'category', label: 'Category', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'text' },
      { key: 'amount', label: 'Amount', type: 'number', required: true },
      { key: 'source', label: 'Source', type: 'text' }
    ]
  },
  invoices: {
    title: 'Invoices',
    subtitle: 'Supplier invoices and payment status.',
    columns: [
      { key: 'invoice_number', label: 'Invoice' },
      { key: 'supplier', label: 'Supplier', render: (row) => row.supplier?.name || '' },
      { key: 'amount', label: 'Amount' },
      { key: 'invoice_date', label: 'Date' },
      { key: 'due_date', label: 'Due' },
      { key: 'status', label: 'Status' }
    ],
    fields: [
      { key: 'invoice_number', label: 'Invoice number', type: 'text', required: true },
      { key: 'supplier_id', label: 'Supplier', type: 'select', lookup: 'suppliers' },
      { key: 'amount', label: 'Amount', type: 'number', required: true },
      { key: 'invoice_date', label: 'Invoice date', type: 'date', required: true },
      { key: 'due_date', label: 'Due date', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', options: [
        { value: 'unpaid', label: 'Unpaid' }, { value: 'paid', label: 'Paid' }, { value: 'partial', label: 'Partial' }
      ]}
    ],
    defaults: { status: 'unpaid' }
  },
  companies: {
    title: 'CRM Companies',
    subtitle: 'Buyer database mirrored for reporting.',
    columns: [
      { key: 'name', label: 'Company' },
      { key: 'category', label: 'Category' },
      { key: 'lifecycle_stage', label: 'Stage' },
      { key: 'city', label: 'City' },
      { key: 'phone', label: 'Phone' }
    ],
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'category', label: 'Category', type: 'select', options: [
        { value: 'restaurants', label: 'Restaurants' }, { value: 'hotels', label: 'Hotels' },
        { value: 'supermarkets', label: 'Supermarkets' }, { value: 'butchers', label: 'Butchers' },
        { value: 'distributors', label: 'Distributors' }, { value: 'caterers', label: 'Caterers' }
      ]},
      { key: 'lifecycle_stage', label: 'Lifecycle', type: 'select', options: [
        { value: 'lead', label: 'Lead' }, { value: 'prospect', label: 'Prospect' },
        { value: 'customer', label: 'Customer' }, { value: 'subscriber', label: 'Subscriber' }
      ]},
      { key: 'city', label: 'City', type: 'text' },
      { key: 'phone', label: 'Phone', type: 'text' },
      { key: 'email', label: 'Email', type: 'text' },
      { key: 'status', label: 'Status', type: 'select', options: [
        { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }
      ]}
    ],
    defaults: { lifecycle_stage: 'lead', status: 'active' }
  },
  deals: {
    title: 'Opportunities',
    subtitle: 'Commercial pipeline deals.',
    columns: [
      { key: 'name', label: 'Deal' },
      { key: 'company', label: 'Company', render: (row) => row.company?.name || '' },
      { key: 'amount', label: 'Amount' },
      { key: 'next_action', label: 'Next action' },
      { key: 'status', label: 'Status' }
    ],
    fields: [
      { key: 'name', label: 'Deal name', type: 'text', required: true },
      { key: 'company_id', label: 'Company', type: 'select', lookup: 'companies' },
      { key: 'amount', label: 'Amount', type: 'number' },
      { key: 'close_date', label: 'Close date', type: 'date' },
      { key: 'next_action', label: 'Next action', type: 'text' },
      { key: 'next_action_date', label: 'Next action date', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', options: [
        { value: 'open', label: 'Open' }, { value: 'won', label: 'Won' }, { value: 'lost', label: 'Lost' }
      ]}
    ],
    defaults: { status: 'open' }
  },
  marketing: {
    title: 'Marketing Content',
    subtitle: 'Content calendar items.',
    columns: [
      { key: 'title', label: 'Title' },
      { key: 'channel', label: 'Channel' },
      { key: 'content_type', label: 'Type' },
      { key: 'scheduled_for', label: 'Scheduled' },
      { key: 'status', label: 'Status' }
    ],
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'channel', label: 'Channel', type: 'text' },
      { key: 'content_type', label: 'Type', type: 'text' },
      { key: 'status', label: 'Status', type: 'select', options: [
        { value: 'draft', label: 'Draft' }, { value: 'review', label: 'Review' },
        { value: 'scheduled', label: 'Scheduled' }, { value: 'published', label: 'Published' }
      ]},
      { key: 'scheduled_for', label: 'Scheduled for', type: 'date' },
      { key: 'published_at', label: 'Published at', type: 'date' },
      { key: 'body', label: 'Body', type: 'textarea' }
    ],
    defaults: { status: 'draft' }
  },
  risks: {
    title: 'Risk Register',
    subtitle: 'Current risks, owners and mitigation.',
    columns: [
      { key: 'title', label: 'Risk' },
      { key: 'category', label: 'Category' },
      { key: 'severity', label: 'Severity' },
      { key: 'status', label: 'Status' }
    ],
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'category', label: 'Category', type: 'text' },
      { key: 'severity', label: 'Severity', type: 'select', options: [
        { value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' },
        { value: 'high', label: 'High' }, { value: 'critical', label: 'Critical' }
      ]},
      { key: 'likelihood', label: 'Likelihood', type: 'select', options: [
        { value: 'unlikely', label: 'Unlikely' }, { value: 'possible', label: 'Possible' }, { value: 'likely', label: 'Likely' }
      ]},
      { key: 'owner_id', label: 'Owner', type: 'select', lookup: 'users' },
      { key: 'status', label: 'Status', type: 'select', options: [
        { value: 'open', label: 'Open' }, { value: 'mitigating', label: 'Mitigating' }, { value: 'closed', label: 'Closed' }
      ]},
      { key: 'mitigation', label: 'Mitigation', type: 'textarea' },
      { key: 'identified_at', label: 'Identified', type: 'date' }
    ],
    defaults: { status: 'open', severity: 'medium' }
  },
  decisions: {
    title: 'Owner Decisions',
    subtitle: 'Decisions requiring ownership approval.',
    columns: [
      { key: 'title', label: 'Decision' },
      { key: 'due_date', label: 'Due' },
      { key: 'status', label: 'Status' }
    ],
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'status', label: 'Status', type: 'select', options: [
        { value: 'pending_owner', label: 'Pending owner' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }
      ]},
      { key: 'owner_id', label: 'Owner', type: 'select', lookup: 'users' },
      { key: 'due_date', label: 'Due date', type: 'date' },
      { key: 'decision_notes', label: 'Notes', type: 'textarea' }
    ],
    defaults: { status: 'pending_owner' }
  },
  sops: {
    title: 'SOP Library',
    subtitle: 'Controlled standard operating procedures.',
    columns: [
      { key: 'code', label: 'Code' },
      { key: 'title', label: 'Title' },
      { key: 'category', label: 'Category' },
      { key: 'version', label: 'Version' },
      { key: 'status', label: 'Status' }
    ],
    fields: [
      { key: 'code', label: 'Code', type: 'text', required: true },
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'category', label: 'Category', type: 'text' },
      { key: 'version', label: 'Version', type: 'text' },
      { key: 'status', label: 'Status', type: 'select', options: [
        { value: 'draft', label: 'Draft' }, { value: 'published', label: 'Published' }
      ]},
      { key: 'summary', label: 'Summary', type: 'textarea' },
      { key: 'drive_url', label: 'Drive URL', type: 'text' }
    ],
    defaults: { version: '1.0', status: 'published' }
  }
};
