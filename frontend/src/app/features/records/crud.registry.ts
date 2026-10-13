export interface FieldDef {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'textarea';
  required?: boolean;
  options?: { value: string; label: string }[];
  lookup?: 'locations' | 'suppliers' | 'users' | 'employees' | 'animals' | 'assets' | 'companies' | 'invoices';
  lookupValue?: string;
  lookupLabel?: string;
  hidden?: boolean;
  placeholder?: string;
}

export interface QuickFilterDef {
  id: string;
  label: string;
  badgeClass?: 'ok' | 'warning' | 'danger' | 'info';
  filterFn: (row: any) => boolean;
}

export interface AdvancedFilterOption {
  value: string;
  label: string;
}

export interface AdvancedFilterDef {
  key: string;
  label: string;
  type: 'select' | 'text' | 'date' | 'number';
  placeholder?: string;
  options?: AdvancedFilterOption[];
  lookup?: 'locations' | 'suppliers' | 'users' | 'employees' | 'animals' | 'assets' | 'companies';
  filterFn?: (row: any, value: any) => boolean;
}

export interface KpiMetric {
  label: string;
  value: string | number;
  meta?: string;
  unit?: string;
  alert?: boolean;
  ok?: boolean;
  info?: boolean;
}

export interface KpiDef {
  label: string;
  compute: (rows: any[], allRows: any[]) => KpiMetric;
}

export interface ResourceDef {
  title: string;
  subtitle: string;
  columns: { key: string; label: string; render?: (row: any) => string }[];
  fields: FieldDef[];
  defaults?: Record<string, any>;
  quickFilters?: QuickFilterDef[];
  advancedFilters?: AdvancedFilterDef[];
  kpiDefs?: KpiDef[];
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
    subtitle: 'Stock levels, reorder points, storage locations and categories.',
    columns: [
      { key: 'item_id', label: 'Item ID', render: (row) => `<strong>${row.item_id || '-'}</strong>` },
      {
        key: 'name',
        label: 'Name',
        render: (row) => `<strong>${row.name}</strong>${row.storage_location ? `<div class="sub-text">📍 ${row.storage_location}</div>` : ''}`
      },
      {
        key: 'category',
        label: 'Category',
        render: (row) => `<span class="badge ${String(row.category || '').toLowerCase().replace(/[^a-z0-9]/g, '_')}">${row.category || '-'}</span>`
      },
      {
        key: 'stock_health',
        label: 'Stock Health',
        render: (row) => {
          const qty = Number(row.quantity_on_hand || 0);
          const reorder = Number(row.reorder_level || 0);
          if (qty <= 0) return `<span class="badge badge-out-of-stock">Out of Stock</span>`;
          if (qty <= reorder) return `<span class="badge badge-low-stock">Low Stock</span>`;
          return `<span class="badge badge-adequate">Adequate</span>`;
        }
      },
      {
        key: 'quantity_on_hand',
        label: 'On Hand',
        render: (row) => `<strong>${row.quantity_on_hand ?? 0}</strong> <span class="unit-text">${row.unit || ''}</span>`
      },
      {
        key: 'reorder_level',
        label: 'Reorder At',
        render: (row) => `${row.reorder_level ?? 0} <span class="unit-text">${row.unit || ''}</span>`
      },
      {
        key: 'average_cost',
        label: 'Avg Cost',
        render: (row) => row.average_cost !== null && row.average_cost !== undefined ? `$${Number(row.average_cost).toFixed(2)}` : '-'
      },
      { key: 'supplier', label: 'Supplier', render: (row) => row.supplier?.name || '-' },
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
    defaults: { unit: 'kg', status: 'active', quantity_on_hand: 0 },
    quickFilters: [
      { id: 'all', label: 'All Items', filterFn: () => true },
      {
        id: 'low_stock',
        label: '⚠️ Low Stock Alert',
        badgeClass: 'warning',
        filterFn: (row) => Number(row.quantity_on_hand || 0) <= Number(row.reorder_level || 0) && Number(row.quantity_on_hand || 0) > 0
      },
      {
        id: 'out_of_stock',
        label: '🚨 Out of Stock',
        badgeClass: 'danger',
        filterFn: (row) => Number(row.quantity_on_hand || 0) <= 0
      },
      {
        id: 'feed',
        label: '🌾 Feed',
        badgeClass: 'ok',
        filterFn: (row) => (row.category || '').toLowerCase() === 'feed'
      },
      {
        id: 'medicine',
        label: '💊 Medicine & Vet',
        badgeClass: 'info',
        filterFn: (row) => {
          const c = (row.category || '').toLowerCase();
          return c.includes('med') || c.includes('vet');
        }
      },
      {
        id: 'active',
        label: 'Active Only',
        badgeClass: 'ok',
        filterFn: (row) => (row.status || '').toLowerCase() === 'active'
      }
    ],
    advancedFilters: [
      {
        key: 'category',
        label: 'Category',
        type: 'select',
        placeholder: 'All Categories',
        options: [
          { value: 'Feed', label: 'Feed' },
          { value: 'Medicine', label: 'Medicine' },
          { value: 'Veterinary Supplies', label: 'Veterinary Supplies' },
          { value: 'Tools', label: 'Tools' },
          { value: 'PPE', label: 'PPE' },
          { value: 'Fuel', label: 'Fuel' },
          { value: 'Spare Parts', label: 'Spare Parts' }
        ],
        filterFn: (row, val) => !val || (row.category || '').toLowerCase() === val.toLowerCase()
      },
      {
        key: 'stock_health',
        label: 'Stock Health',
        type: 'select',
        placeholder: 'All Levels',
        options: [
          { value: 'adequate', label: 'Adequate Stock' },
          { value: 'low_stock', label: 'Low Stock' },
          { value: 'out_of_stock', label: 'Out of Stock' }
        ],
        filterFn: (row, val) => {
          if (!val) return true;
          const qty = Number(row.quantity_on_hand || 0);
          const reorder = Number(row.reorder_level || 0);
          if (val === 'out_of_stock') return qty <= 0;
          if (val === 'low_stock') return qty <= reorder && qty > 0;
          if (val === 'adequate') return qty > reorder;
          return true;
        }
      },
      {
        key: 'storage_location',
        label: 'Storage Location',
        type: 'text',
        placeholder: 'Search storage location...',
        filterFn: (row, val) => !val || (row.storage_location || '').toLowerCase().includes(val.toLowerCase())
      },
      {
        key: 'supplier_id',
        label: 'Supplier',
        type: 'select',
        placeholder: 'All Suppliers',
        lookup: 'suppliers',
        filterFn: (row, val) => !val || String(row.supplier_id) === String(val)
      },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        placeholder: 'All Statuses',
        options: [
          { value: 'active', label: 'Active' },
          { value: 'inactive', label: 'Inactive' }
        ],
        filterFn: (row, val) => !val || (row.status || '').toLowerCase() === val.toLowerCase()
      }
    ],
    kpiDefs: [
      {
        label: 'Total Stock Items',
        compute: (rows, all) => ({
          label: 'Total Stock Items',
          value: rows.length,
          meta: `${all.length} items cataloged`,
          ok: true
        })
      },
      {
        label: 'Low Stock Alert',
        compute: (rows) => {
          const count = rows.filter(r => Number(r.quantity_on_hand || 0) <= Number(r.reorder_level || 0) && Number(r.quantity_on_hand || 0) > 0).length;
          return {
            label: 'Low Stock Alert',
            value: count,
            meta: 'Below reorder threshold',
            alert: count > 0
          };
        }
      },
      {
        label: 'Out of Stock',
        compute: (rows) => {
          const count = rows.filter(r => Number(r.quantity_on_hand || 0) <= 0).length;
          return {
            label: 'Out of Stock',
            value: count,
            meta: 'Zero inventory on hand',
            alert: count > 0
          };
        }
      },
      {
        label: 'Total Valuation',
        compute: (rows) => {
          const total = rows.reduce((sum, r) => sum + (Number(r.quantity_on_hand || 0) * Number(r.average_cost || 0)), 0);
          return {
            label: 'Total Valuation',
            value: '$' + total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            meta: 'Asset value on hand',
            ok: true
          };
        }
      }
    ]
  },
  suppliers: {
    title: 'Suppliers Directory',
    subtitle: 'Vendor catalog, supplier ratings, contacts and categories.',
    columns: [
      { key: 'code', label: 'Code', render: (row) => `<strong>${row.code || '-'}</strong>` },
      {
        key: 'name',
        label: 'Supplier Name',
        render: (row) => `<strong>${row.name}</strong>${row.contact_name ? `<div class="sub-text">👤 ${row.contact_name}</div>` : ''}`
      },
      {
        key: 'category',
        label: 'Category',
        render: (row) => row.category ? `<span class="badge ${String(row.category).toLowerCase().replace(/[^a-z0-9]/g, '_')}">${row.category}</span>` : '-'
      },
      {
        key: 'rating',
        label: 'Rating',
        render: (row) => row.rating !== null && row.rating !== undefined ? `<span class="badge rating-badge">⭐ ${Number(row.rating).toFixed(1)} / 5</span>` : '-'
      },
      {
        key: 'phone',
        label: 'Phone',
        render: (row) => row.phone ? `<span class="contact-link">📞 ${row.phone}</span>` : '-'
      },
      {
        key: 'email',
        label: 'Email',
        render: (row) => row.email ? `<span class="contact-link">✉️ ${row.email}</span>` : '-'
      },
      {
        key: 'location',
        label: 'Location',
        render: (row) => row.location ? `📍 ${row.location}` : '-'
      },
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
    defaults: { status: 'active', rating: 5 },
    quickFilters: [
      { id: 'all', label: 'All Suppliers', filterFn: () => true },
      {
        id: 'active',
        label: '✅ Active Only',
        badgeClass: 'ok',
        filterFn: (row) => (row.status || '').toLowerCase() === 'active'
      },
      {
        id: 'top_rated',
        label: '⭐ Top Rated (4★+)',
        badgeClass: 'warning',
        filterFn: (row) => Number(row.rating || 0) >= 4
      },
      {
        id: 'feed',
        label: '🌾 Feed Suppliers',
        badgeClass: 'info',
        filterFn: (row) => (row.category || '').toLowerCase().includes('feed')
      },
      {
        id: 'vet',
        label: '💊 Vet & Medicine',
        badgeClass: 'info',
        filterFn: (row) => {
          const c = (row.category || '').toLowerCase();
          return c.includes('vet') || c.includes('med');
        }
      },
      {
        id: 'inactive',
        label: '⚠️ Inactive / Suspended',
        badgeClass: 'danger',
        filterFn: (row) => (row.status || '').toLowerCase() === 'inactive'
      }
    ],
    advancedFilters: [
      {
        key: 'category',
        label: 'Category',
        type: 'select',
        placeholder: 'All Categories',
        options: [
          { value: 'Feed', label: 'Feed' },
          { value: 'Medicine', label: 'Medicine' },
          { value: 'Veterinary Supplies', label: 'Veterinary Supplies' },
          { value: 'Machinery', label: 'Machinery' },
          { value: 'Equipment', label: 'Equipment' },
          { value: 'Fertilizers', label: 'Fertilizers' },
          { value: 'Seeds', label: 'Seeds' },
          { value: 'Supplies', label: 'General Supplies' }
        ],
        filterFn: (row, val) => !val || (row.category || '').toLowerCase().includes(val.toLowerCase())
      },
      {
        key: 'min_rating',
        label: 'Min Rating',
        type: 'select',
        placeholder: 'Any Rating',
        options: [
          { value: '4.5', label: '4.5★ & Above' },
          { value: '4.0', label: '4.0★ & Above' },
          { value: '3.0', label: '3.0★ & Above' },
          { value: '2.0', label: '2.0★ & Above' }
        ],
        filterFn: (row, val) => {
          if (!val) return true;
          return Number(row.rating || 0) >= Number(val);
        }
      },
      {
        key: 'location',
        label: 'Location / Region',
        type: 'text',
        placeholder: 'Search location...',
        filterFn: (row, val) => !val || (row.location || '').toLowerCase().includes(val.toLowerCase())
      },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        placeholder: 'All Statuses',
        options: [
          { value: 'active', label: 'Active' },
          { value: 'inactive', label: 'Inactive' }
        ],
        filterFn: (row, val) => !val || (row.status || '').toLowerCase() === val.toLowerCase()
      }
    ],
    kpiDefs: [
      {
        label: 'Total Suppliers',
        compute: (rows, all) => ({
          label: 'Total Suppliers',
          value: rows.length,
          meta: `${all.length} registered partners`,
          ok: true
        })
      },
      {
        label: 'Active Partners',
        compute: (rows) => {
          const count = rows.filter(r => (r.status || '').toLowerCase() === 'active').length;
          return {
            label: 'Active Partners',
            value: count,
            meta: 'Operational supplier agreements',
            ok: true
          };
        }
      },
      {
        label: 'Top Rated (4★+)',
        compute: (rows) => {
          const count = rows.filter(r => Number(r.rating || 0) >= 4).length;
          return {
            label: 'Top Rated (4★+)',
            value: count,
            meta: 'Reliable supplier quality',
            ok: true
          };
        }
      },
      {
        label: 'Inactive Accounts',
        compute: (rows) => {
          const count = rows.filter(r => (r.status || '').toLowerCase() === 'inactive').length;
          return {
            label: 'Inactive Accounts',
            value: count,
            meta: 'Suspended or dormant accounts',
            alert: count > 0
          };
        }
      }
    ]
  },
  procurement: {
    title: 'Purchase Requests',
    subtitle: 'Request, approve and track farm purchases.',
    columns: [
      { key: 'request_number', label: 'PR Number', render: (row) => `<strong>${row.request_number || '-'}</strong>` },
      {
        key: 'item_name',
        label: 'Item Requested',
        render: (row) => `<strong>${row.item_name}</strong>${row.justification ? `<div class="sub-text">${row.justification}</div>` : ''}`
      },
      {
        key: 'category',
        label: 'Category',
        render: (row) => row.category ? `<span class="badge ${String(row.category).toLowerCase().replace(/[^a-z0-9]/g, '_')}">${row.category}</span>` : '-'
      },
      {
        key: 'quantity',
        label: 'Qty',
        render: (row) => `<strong>${row.quantity ?? 0}</strong> <span class="unit-text">${row.unit || ''}</span>`
      },
      {
        key: 'estimated_cost',
        label: 'Est. Cost',
        render: (row) => row.estimated_cost !== null && row.estimated_cost !== undefined ? `$${Number(row.estimated_cost).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'
      },
      {
        key: 'priority',
        label: 'Priority',
        render: (row) => `<span class="badge priority-${(row.priority || 'normal').toLowerCase()}">${row.priority || 'normal'}</span>`
      },
      {
        key: 'status',
        label: 'Status',
        render: (row) => `<span class="badge status-${(row.status || 'pending').toLowerCase()}">${row.status || 'pending'}</span>`
      },
      { key: 'requester', label: 'Requested By', render: (row) => row.requester?.name || '-' },
      {
        key: 'requested_at',
        label: 'Date',
        render: (row) => row.requested_at ? String(row.requested_at).slice(0, 10) : '-'
      }
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
    defaults: { priority: 'normal', status: 'pending', unit: 'kg' },
    quickFilters: [
      { id: 'all', label: 'All Requests', filterFn: () => true },
      {
        id: 'pending',
        label: '⏳ Pending Approval',
        badgeClass: 'warning',
        filterFn: (row) => (row.status || '').toLowerCase() === 'pending'
      },
      {
        id: 'high_priority',
        label: '🚨 High Priority',
        badgeClass: 'danger',
        filterFn: (row) => (row.priority || '').toLowerCase() === 'high'
      },
      {
        id: 'approved',
        label: '✅ Approved',
        badgeClass: 'ok',
        filterFn: (row) => (row.status || '').toLowerCase() === 'approved'
      },
      {
        id: 'rejected',
        label: '❌ Rejected',
        badgeClass: 'danger',
        filterFn: (row) => (row.status || '').toLowerCase() === 'rejected'
      }
    ],
    advancedFilters: [
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        placeholder: 'All Statuses',
        options: [
          { value: 'pending', label: 'Pending' },
          { value: 'approved', label: 'Approved' },
          { value: 'rejected', label: 'Rejected' }
        ],
        filterFn: (row, val) => !val || (row.status || '').toLowerCase() === val.toLowerCase()
      },
      {
        key: 'priority',
        label: 'Priority',
        type: 'select',
        placeholder: 'All Priorities',
        options: [
          { value: 'high', label: 'High' },
          { value: 'normal', label: 'Normal' },
          { value: 'low', label: 'Low' }
        ],
        filterFn: (row, val) => !val || (row.priority || '').toLowerCase() === val.toLowerCase()
      },
      {
        key: 'category',
        label: 'Category',
        type: 'text',
        placeholder: 'Filter category (e.g. Feed, Equipment)',
        filterFn: (row, val) => !val || (row.category || '').toLowerCase().includes(val.toLowerCase())
      },
      {
        key: 'date_from',
        label: 'Requested After',
        type: 'date',
        filterFn: (row, val) => {
          if (!val) return true;
          if (!row.requested_at) return false;
          return new Date(row.requested_at) >= new Date(val);
        }
      },
      {
        key: 'date_to',
        label: 'Requested Before',
        type: 'date',
        filterFn: (row, val) => {
          if (!val) return true;
          if (!row.requested_at) return false;
          return new Date(row.requested_at) <= new Date(val + 'T23:59:59');
        }
      },
      {
        key: 'min_cost',
        label: 'Min Cost ($)',
        type: 'number',
        placeholder: '0.00',
        filterFn: (row, val) => {
          if (val === null || val === undefined || val === '') return true;
          return Number(row.estimated_cost || 0) >= Number(val);
        }
      },
      {
        key: 'max_cost',
        label: 'Max Cost ($)',
        type: 'number',
        placeholder: 'Any',
        filterFn: (row, val) => {
          if (val === null || val === undefined || val === '') return true;
          return Number(row.estimated_cost || 0) <= Number(val);
        }
      }
    ],
    kpiDefs: [
      {
        label: 'Total Requests',
        compute: (rows, all) => ({
          label: 'Total Requests',
          value: rows.length,
          meta: `${all.length} requests in history`,
          ok: true
        })
      },
      {
        label: 'Pending Approval',
        compute: (rows) => {
          const count = rows.filter(r => (r.status || '').toLowerCase() === 'pending').length;
          return {
            label: 'Pending Approval',
            value: count,
            meta: 'Awaiting manager review',
            alert: count > 0
          };
        }
      },
      {
        label: 'High Priority',
        compute: (rows) => {
          const count = rows.filter(r => (r.priority || '').toLowerCase() === 'high').length;
          return {
            label: 'High Priority',
            value: count,
            meta: 'Urgent requests needed',
            alert: count > 0
          };
        }
      },
      {
        label: 'Estimated Spend',
        compute: (rows) => {
          const total = rows.reduce((sum, r) => sum + Number(r.estimated_cost || 0), 0);
          return {
            label: 'Estimated Spend',
            value: '$' + total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            meta: 'Total requested budget',
            ok: true
          };
        }
      }
    ]
  },
  assets: {
    title: 'Asset Register',
    subtitle: 'Machinery, vehicles, equipment assets and warranties.',
    columns: [
      { key: 'asset_id', label: 'Asset ID', render: (row) => `<strong>${row.asset_id || '-'}</strong>` },
      {
        key: 'name',
        label: 'Asset / Equipment',
        render: (row) => `<strong>${row.name}</strong>${row.serial_number ? `<div class="sub-text">SN: ${row.serial_number}</div>` : ''}`
      },
      {
        key: 'category',
        label: 'Category',
        render: (row) => row.category ? `<span class="badge ${String(row.category).toLowerCase().replace(/[^a-z0-9]/g, '_')}">${row.category}</span>` : '-'
      },
      {
        key: 'location',
        label: 'Location',
        render: (row) => row.location?.name ? `📍 ${row.location.name}` : '-'
      },
      {
        key: 'condition',
        label: 'Condition',
        render: (row) => {
          const c = (row.condition || 'good').toLowerCase();
          const label = c.charAt(0).toUpperCase() + c.slice(1);
          return `<span class="badge condition-${c}">${label}</span>`;
        }
      },
      {
        key: 'purchase_price',
        label: 'Purchase Price',
        render: (row) => row.purchase_price !== null && row.purchase_price !== undefined ? `$${Number(row.purchase_price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'
      },
      { key: 'supplier', label: 'Supplier', render: (row) => row.supplier?.name || '-' },
      { key: 'status', label: 'Status' },
      {
        key: 'purchase_date',
        label: 'Purchased',
        render: (row) => row.purchase_date ? String(row.purchase_date).slice(0, 10) : '-'
      }
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
    defaults: { status: 'active', condition: 'good' },
    quickFilters: [
      { id: 'all', label: 'All Assets', filterFn: () => true },
      {
        id: 'active',
        label: '✅ Active in Service',
        badgeClass: 'ok',
        filterFn: (row) => (row.status || '').toLowerCase() === 'active'
      },
      {
        id: 'good',
        label: '🟢 Good Condition',
        badgeClass: 'ok',
        filterFn: (row) => (row.condition || '').toLowerCase() === 'good'
      },
      {
        id: 'maintenance',
        label: '⚠️ Needs Maintenance',
        badgeClass: 'warning',
        filterFn: (row) => ['poor', 'fair'].includes((row.condition || '').toLowerCase())
      },
      {
        id: 'machinery',
        label: '🚜 Machinery & Vehicles',
        badgeClass: 'info',
        filterFn: (row) => {
          const c = (row.category || '').toLowerCase();
          return c.includes('mach') || c.includes('vehic') || c.includes('tractor');
        }
      },
      {
        id: 'retired',
        label: '🛑 Retired',
        badgeClass: 'danger',
        filterFn: (row) => (row.status || '').toLowerCase() === 'retired'
      }
    ],
    advancedFilters: [
      {
        key: 'category',
        label: 'Category',
        type: 'select',
        placeholder: 'All Categories',
        options: [
          { value: 'Machinery', label: 'Machinery' },
          { value: 'Vehicles', label: 'Vehicles' },
          { value: 'Irrigation', label: 'Irrigation' },
          { value: 'Livestock Equipment', label: 'Livestock Equipment' },
          { value: 'Processing', label: 'Processing' },
          { value: 'IT & Tech', label: 'IT & Tech' },
          { value: 'Tools', label: 'Tools' },
          { value: 'Storage', label: 'Storage' }
        ],
        filterFn: (row, val) => !val || (row.category || '').toLowerCase().includes(val.toLowerCase())
      },
      {
        key: 'condition',
        label: 'Condition',
        type: 'select',
        placeholder: 'All Conditions',
        options: [
          { value: 'good', label: 'Good' },
          { value: 'fair', label: 'Fair' },
          { value: 'poor', label: 'Poor' }
        ],
        filterFn: (row, val) => !val || (row.condition || '').toLowerCase() === val.toLowerCase()
      },
      {
        key: 'location_id',
        label: 'Location',
        type: 'select',
        placeholder: 'All Locations',
        lookup: 'locations',
        filterFn: (row, val) => !val || String(row.location_id) === String(val)
      },
      {
        key: 'supplier_id',
        label: 'Supplier',
        type: 'select',
        placeholder: 'All Suppliers',
        lookup: 'suppliers',
        filterFn: (row, val) => !val || String(row.supplier_id) === String(val)
      },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        placeholder: 'All Statuses',
        options: [
          { value: 'active', label: 'Active' },
          { value: 'retired', label: 'Retired' }
        ],
        filterFn: (row, val) => !val || (row.status || '').toLowerCase() === val.toLowerCase()
      },
      {
        key: 'min_price',
        label: 'Min Value ($)',
        type: 'number',
        placeholder: '0.00',
        filterFn: (row, val) => {
          if (val === null || val === undefined || val === '') return true;
          return Number(row.purchase_price || 0) >= Number(val);
        }
      },
      {
        key: 'max_price',
        label: 'Max Value ($)',
        type: 'number',
        placeholder: 'Any',
        filterFn: (row, val) => {
          if (val === null || val === undefined || val === '') return true;
          return Number(row.purchase_price || 0) <= Number(val);
        }
      }
    ],
    kpiDefs: [
      {
        label: 'Total Assets Owned',
        compute: (rows, all) => ({
          label: 'Total Assets Owned',
          value: rows.length,
          meta: `${all.length} registered equipment units`,
          ok: true
        })
      },
      {
        label: 'Active in Service',
        compute: (rows) => {
          const count = rows.filter(r => (r.status || '').toLowerCase() === 'active').length;
          return {
            label: 'Active in Service',
            value: count,
            meta: 'Operational farm machinery',
            ok: true
          };
        }
      },
      {
        label: 'Maintenance Needs',
        compute: (rows) => {
          const count = rows.filter(r => ['poor', 'fair'].includes((r.condition || '').toLowerCase())).length;
          return {
            label: 'Maintenance Needs',
            value: count,
            meta: 'Fair or poor condition',
            alert: count > 0
          };
        }
      },
      {
        label: 'Total Asset Value',
        compute: (rows) => {
          const total = rows.reduce((sum, r) => sum + Number(r.purchase_price || 0), 0);
          return {
            label: 'Total Asset Value',
            value: '$' + total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            meta: 'Capital equipment investment',
            ok: true
          };
        }
      }
    ]
  },
  maintenance: {
    title: 'Maintenance Tickets',
    subtitle: 'Equipment repairs, preventive servicing schedules and diagnostics.',
    columns: [
      { key: 'ticket_number', label: 'Ticket #', render: (row) => `<strong>${row.ticket_number || '-'}</strong>` },
      {
        key: 'title',
        label: 'Issue / Task',
        render: (row) => `<strong>${row.title}</strong>${row.description ? `<div class="sub-text">${row.description}</div>` : ''}`
      },
      {
        key: 'asset',
        label: 'Asset / Equipment',
        render: (row) => row.asset ? `🚜 <strong>${row.asset.asset_id || ''}</strong> ${row.asset.name || ''}` : '-'
      },
      {
        key: 'type',
        label: 'Type',
        render: (row) => {
          const t = (row.type || 'corrective').toLowerCase();
          const label = t.charAt(0).toUpperCase() + t.slice(1);
          return `<span class="badge type-${t}">${label}</span>`;
        }
      },
      {
        key: 'priority',
        label: 'Priority',
        render: (row) => {
          const p = (row.priority || 'normal').toLowerCase();
          const label = p.charAt(0).toUpperCase() + p.slice(1);
          return `<span class="badge priority-${p}">${label}</span>`;
        }
      },
      {
        key: 'status',
        label: 'Status',
        render: (row) => {
          const s = (row.status || 'open').toLowerCase().replace(/\s+/g, '_');
          const label = s.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
          return `<span class="badge status-${s}">${label}</span>`;
        }
      },
      {
        key: 'assigned_to',
        label: 'Assigned To',
        render: (row) => row.assignee?.name ? `👤 ${row.assignee.name}` : (row.assigned_to ? `User #${row.assigned_to}` : '<span class="muted">Unassigned</span>')
      },
      {
        key: 'reported_at',
        label: 'Reported',
        render: (row) => row.reported_at ? String(row.reported_at).slice(0, 10) : '-'
      }
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
    defaults: { type: 'corrective', priority: 'normal', status: 'open' },
    quickFilters: [
      { id: 'all', label: 'All Tickets', filterFn: () => true },
      {
        id: 'open_action',
        label: '🚨 Open / Needs Action',
        badgeClass: 'danger',
        filterFn: (row) => ['open', 'assigned'].includes((row.status || '').toLowerCase())
      },
      {
        id: 'in_progress',
        label: '⚡ In Progress',
        badgeClass: 'warning',
        filterFn: (row) => (row.status || '').toLowerCase() === 'in_progress'
      },
      {
        id: 'emergency',
        label: '🔥 High Priority / Urgent',
        badgeClass: 'danger',
        filterFn: (row) => ['high', 'urgent'].includes((row.priority || '').toLowerCase()) || (row.type || '').toLowerCase() === 'emergency'
      },
      {
        id: 'preventive',
        label: '🛡️ Preventive Servicing',
        badgeClass: 'info',
        filterFn: (row) => (row.type || '').toLowerCase() === 'preventive'
      },
      {
        id: 'closed',
        label: '✅ Resolved & Closed',
        badgeClass: 'ok',
        filterFn: (row) => (row.status || '').toLowerCase() === 'closed'
      }
    ],
    advancedFilters: [
      {
        key: 'status',
        label: 'Ticket Status',
        type: 'select',
        placeholder: 'All Statuses',
        options: [
          { value: 'open', label: 'Open' },
          { value: 'assigned', label: 'Assigned' },
          { value: 'in_progress', label: 'In Progress' },
          { value: 'closed', label: 'Closed' }
        ],
        filterFn: (row, val) => !val || (row.status || '').toLowerCase() === val.toLowerCase()
      },
      {
        key: 'priority',
        label: 'Priority Level',
        type: 'select',
        placeholder: 'All Priorities',
        options: [
          { value: 'high', label: 'High' },
          { value: 'normal', label: 'Normal' },
          { value: 'low', label: 'Low' }
        ],
        filterFn: (row, val) => !val || (row.priority || '').toLowerCase() === val.toLowerCase()
      },
      {
        key: 'type',
        label: 'Maintenance Type',
        type: 'select',
        placeholder: 'All Types',
        options: [
          { value: 'preventive', label: 'Preventive' },
          { value: 'corrective', label: 'Corrective' },
          { value: 'emergency', label: 'Emergency' },
          { value: 'inspection', label: 'Inspection' }
        ],
        filterFn: (row, val) => !val || (row.type || '').toLowerCase() === val.toLowerCase()
      },
      {
        key: 'asset_id',
        label: 'Asset',
        type: 'select',
        placeholder: 'All Assets',
        lookup: 'assets',
        filterFn: (row, val) => !val || String(row.asset_id) === String(val)
      },
      {
        key: 'assigned_to',
        label: 'Assigned Staff',
        type: 'select',
        placeholder: 'All Assignees',
        lookup: 'users',
        filterFn: (row, val) => !val || String(row.assigned_to) === String(val)
      },
      {
        key: 'date_from',
        label: 'Reported After',
        type: 'date',
        filterFn: (row, val) => {
          if (!val) return true;
          if (!row.reported_at) return false;
          return new Date(row.reported_at) >= new Date(val);
        }
      },
      {
        key: 'date_to',
        label: 'Reported Before',
        type: 'date',
        filterFn: (row, val) => {
          if (!val) return true;
          if (!row.reported_at) return false;
          return new Date(row.reported_at) <= new Date(val + 'T23:59:59');
        }
      }
    ],
    kpiDefs: [
      {
        label: 'Total Tickets',
        compute: (rows, all) => ({
          label: 'Total Tickets',
          value: rows.length,
          meta: `${all.length} service records logged`,
          ok: true
        })
      },
      {
        label: 'Active / Unresolved',
        compute: (rows) => {
          const count = rows.filter(r => ['open', 'assigned', 'in_progress'].includes((r.status || '').toLowerCase())).length;
          return {
            label: 'Active / Unresolved',
            value: count,
            meta: 'Tickets awaiting completion',
            alert: count > 0
          };
        }
      },
      {
        label: 'High Priority & Emergency',
        compute: (rows) => {
          const count = rows.filter(r => ['high', 'urgent'].includes((r.priority || '').toLowerCase()) || (r.type || '').toLowerCase() === 'emergency').length;
          return {
            label: 'High Priority & Emergency',
            value: count,
            meta: 'Critical farm repairs',
            alert: count > 0
          };
        }
      },
      {
        label: 'Preventive Checks',
        compute: (rows) => {
          const count = rows.filter(r => (r.type || '').toLowerCase() === 'preventive').length;
          return {
            label: 'Preventive Checks',
            value: count,
            meta: 'Scheduled equipment maintenance',
            ok: true
          };
        }
      }
    ]
  },
  employees: {
    title: 'HR & Personnel Directory',
    subtitle: 'Workforce records, department assignments, contacts and employment status.',
    columns: [
      { key: 'employee_code', label: 'Emp ID', render: (row) => `<strong>${row.employee_code || '-'}</strong>` },
      {
        key: 'name',
        label: 'Employee Name',
        render: (row) => `<strong>${row.name}</strong>${row.role ? `<div class="sub-text">💼 ${row.role}</div>` : ''}`
      },
      {
        key: 'department',
        label: 'Department',
        render: (row) => row.department ? `<span class="badge department">${row.department}</span>` : '-'
      },
      {
        key: 'phone',
        label: 'Phone',
        render: (row) => row.phone ? `<span class="contact-link">📞 ${row.phone}</span>` : '-'
      },
      {
        key: 'email',
        label: 'Email',
        render: (row) => row.email ? `<span class="contact-link">✉️ ${row.email}</span>` : '-'
      },
      {
        key: 'hire_date',
        label: 'Hire Date',
        render: (row) => row.hire_date ? String(row.hire_date).slice(0, 10) : '-'
      },
      { key: 'status', label: 'Status' }
    ],
    fields: [
      { key: 'employee_code', label: 'Code', type: 'text', placeholder: 'Auto if blank' },
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'role', label: 'Role / Title', type: 'text', placeholder: 'e.g. Veterinary Officer, Farm Manager' },
      { key: 'department', label: 'Department', type: 'select', options: [
        { value: 'Livestock & Animal Health', label: 'Livestock & Animal Health' },
        { value: 'Feed & Rations', label: 'Feed & Rations' },
        { value: 'Operations & Maintenance', label: 'Operations & Maintenance' },
        { value: 'Finance & Procurement', label: 'Finance & Procurement' },
        { value: 'Administration', label: 'Administration' },
        { value: 'Security & Field', label: 'Security & Field' }
      ]},
      { key: 'phone', label: 'Phone', type: 'text' },
      { key: 'email', label: 'Email', type: 'text' },
      { key: 'hire_date', label: 'Hire date', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', options: [
        { value: 'active', label: 'Active' },
        { value: 'on_leave', label: 'On Leave' },
        { value: 'inactive', label: 'Inactive' }
      ]}
    ],
    defaults: { status: 'active', department: 'Livestock & Animal Health' },
    quickFilters: [
      { id: 'all', label: 'All Employees', filterFn: () => true },
      {
        id: 'active',
        label: '✅ Active Staff',
        badgeClass: 'ok',
        filterFn: (row) => (row.status || '').toLowerCase() === 'active'
      },
      {
        id: 'livestock_dept',
        label: '🐐 Livestock & Health',
        badgeClass: 'info',
        filterFn: (row) => {
          const d = (row.department || '').toLowerCase();
          const r = (row.role || '').toLowerCase();
          return d.includes('live') || d.includes('animal') || d.includes('health') || r.includes('vet') || r.includes('livestock');
        }
      },
      {
        id: 'ops_dept',
        label: '🚜 Operations & Field',
        badgeClass: 'info',
        filterFn: (row) => {
          const d = (row.department || '').toLowerCase();
          return d.includes('op') || d.includes('maint') || d.includes('feed') || d.includes('field');
        }
      },
      {
        id: 'admin_dept',
        label: '💼 Admin & Finance',
        badgeClass: 'info',
        filterFn: (row) => {
          const d = (row.department || '').toLowerCase();
          return d.includes('admin') || d.includes('fin') || d.includes('procure');
        }
      },
      {
        id: 'leave_inactive',
        label: '⚠️ On Leave / Inactive',
        badgeClass: 'warning',
        filterFn: (row) => (row.status || '').toLowerCase() !== 'active'
      }
    ],
    advancedFilters: [
      {
        key: 'department',
        label: 'Department',
        type: 'select',
        placeholder: 'All Departments',
        options: [
          { value: 'Livestock & Animal Health', label: 'Livestock & Animal Health' },
          { value: 'Feed & Rations', label: 'Feed & Rations' },
          { value: 'Operations & Maintenance', label: 'Operations & Maintenance' },
          { value: 'Finance & Procurement', label: 'Finance & Procurement' },
          { value: 'Administration', label: 'Administration' },
          { value: 'Security & Field', label: 'Security & Field' }
        ],
        filterFn: (row, val) => !val || (row.department || '').toLowerCase() === val.toLowerCase()
      },
      {
        key: 'role',
        label: 'Role / Designation',
        type: 'text',
        placeholder: 'Filter by job title...',
        filterFn: (row, val) => !val || (row.role || '').toLowerCase().includes(val.toLowerCase())
      },
      {
        key: 'status',
        label: 'Employment Status',
        type: 'select',
        placeholder: 'All Statuses',
        options: [
          { value: 'active', label: 'Active' },
          { value: 'on_leave', label: 'On Leave' },
          { value: 'inactive', label: 'Inactive' }
        ],
        filterFn: (row, val) => !val || (row.status || '').toLowerCase() === val.toLowerCase()
      },
      {
        key: 'date_from',
        label: 'Hired After',
        type: 'date',
        filterFn: (row, val) => {
          if (!val) return true;
          if (!row.hire_date) return false;
          return new Date(row.hire_date) >= new Date(val);
        }
      },
      {
        key: 'date_to',
        label: 'Hired Before',
        type: 'date',
        filterFn: (row, val) => {
          if (!val) return true;
          if (!row.hire_date) return false;
          return new Date(row.hire_date) <= new Date(val + 'T23:59:59');
        }
      }
    ],
    kpiDefs: [
      {
        label: 'Total Workforce',
        compute: (rows, all) => ({
          label: 'Total Workforce',
          value: rows.length,
          meta: `${all.length} registered personnel`,
          ok: true
        })
      },
      {
        label: 'Active on Duty',
        compute: (rows) => {
          const count = rows.filter(r => (r.status || '').toLowerCase() === 'active').length;
          return {
            label: 'Active on Duty',
            value: count,
            meta: 'Current active staff',
            ok: true
          };
        }
      },
      {
        label: 'Departments Active',
        compute: (rows) => {
          const depts = new Set(rows.map(r => r.department).filter(Boolean));
          return {
            label: 'Departments Active',
            value: depts.size,
            meta: 'Operational divisions',
            info: true
          };
        }
      },
      {
        label: 'On Leave / Inactive',
        compute: (rows) => {
          const count = rows.filter(r => (r.status || '').toLowerCase() !== 'active').length;
          return {
            label: 'On Leave / Inactive',
            value: count,
            meta: 'Staff absent or off-duty',
            alert: count > 0
          };
        }
      }
    ]
  },
  tasks: {
    title: 'Tasks & Operations',
    subtitle: 'Daily farm assignments, field work orders and workflow tracking.',
    columns: [
      {
        key: 'title',
        label: 'Task & Details',
        render: (row) => `<strong>${row.title}</strong>${row.description ? `<div class="sub-text">${row.description}</div>` : ''}`
      },
      {
        key: 'module',
        label: 'Module / Area',
        render: (row) => row.module ? `<span class="badge module-${String(row.module).toLowerCase()}">${row.module}</span>` : '-'
      },
      {
        key: 'priority',
        label: 'Priority',
        render: (row) => {
          const p = (row.priority || 'normal').toLowerCase();
          const label = p.charAt(0).toUpperCase() + p.slice(1);
          return `<span class="badge priority-${p}">${label}</span>`;
        }
      },
      {
        key: 'status',
        label: 'Status',
        render: (row) => {
          const s = (row.status || 'open').toLowerCase().replace(/\s+/g, '_');
          const label = s.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
          return `<span class="badge status-${s}">${label}</span>`;
        }
      },
      {
        key: 'assignee',
        label: 'Assigned To',
        render: (row) => row.assignee?.name ? `👤 ${row.assignee.name}` : (row.assigned_to ? `User #${row.assigned_to}` : '<span class="muted">Unassigned</span>')
      },
      {
        key: 'due_date',
        label: 'Due Date',
        render: (row) => {
          if (!row.due_date) return '-';
          const d = String(row.due_date).slice(0, 10);
          const isOverdue = new Date(d) < new Date(new Date().toDateString()) && (row.status || '').toLowerCase() !== 'completed';
          if (isOverdue) {
            return `<span class="badge badge-overdue">⚠️ Overdue (${d})</span>`;
          }
          return d;
        }
      }
    ],
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'module', label: 'Module / Area', type: 'select', options: [
        { value: 'Livestock', label: 'Livestock' },
        { value: 'Health', label: 'Animal Health' },
        { value: 'Feed', label: 'Feed & Nutrition' },
        { value: 'Maintenance', label: 'Maintenance' },
        { value: 'Procurement', label: 'Procurement' },
        { value: 'Finance', label: 'Finance' },
        { value: 'General', label: 'General Farm' }
      ]},
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'assigned_to', label: 'Assigned to', type: 'select', lookup: 'users' },
      { key: 'due_date', label: 'Due date', type: 'date' },
      { key: 'priority', label: 'Priority', type: 'select', options: [
        { value: 'low', label: 'Low' },
        { value: 'normal', label: 'Normal' },
        { value: 'high', label: 'High' },
        { value: 'urgent', label: 'Urgent' }
      ]},
      { key: 'status', label: 'Status', type: 'select', options: [
        { value: 'open', label: 'Open' },
        { value: 'in_progress', label: 'In progress' },
        { value: 'completed', label: 'Completed' },
        { value: 'cancelled', label: 'Cancelled' }
      ]}
    ],
    defaults: { status: 'open', priority: 'normal', module: 'Livestock' },
    quickFilters: [
      { id: 'all', label: 'All Tasks', filterFn: () => true },
      {
        id: 'open_tasks',
        label: '🚨 Open / Pending',
        badgeClass: 'warning',
        filterFn: (row) => (row.status || '').toLowerCase() === 'open'
      },
      {
        id: 'in_progress',
        label: '⚡ In Progress',
        badgeClass: 'info',
        filterFn: (row) => (row.status || '').toLowerCase() === 'in_progress'
      },
      {
        id: 'urgent',
        label: '🔥 High Priority & Urgent',
        badgeClass: 'danger',
        filterFn: (row) => ['high', 'urgent'].includes((row.priority || '').toLowerCase()) && (row.status || '').toLowerCase() !== 'completed'
      },
      {
        id: 'livestock_tasks',
        label: '🐐 Herd & Animal Tasks',
        badgeClass: 'ok',
        filterFn: (row) => ['livestock', 'health', 'feed'].includes((row.module || '').toLowerCase())
      },
      {
        id: 'completed',
        label: '✅ Completed',
        badgeClass: 'ok',
        filterFn: (row) => (row.status || '').toLowerCase() === 'completed'
      }
    ],
    advancedFilters: [
      {
        key: 'status',
        label: 'Task Status',
        type: 'select',
        placeholder: 'All Statuses',
        options: [
          { value: 'open', label: 'Open' },
          { value: 'in_progress', label: 'In Progress' },
          { value: 'completed', label: 'Completed' },
          { value: 'cancelled', label: 'Cancelled' }
        ],
        filterFn: (row, val) => !val || (row.status || '').toLowerCase() === val.toLowerCase()
      },
      {
        key: 'priority',
        label: 'Priority Level',
        type: 'select',
        placeholder: 'All Priorities',
        options: [
          { value: 'urgent', label: 'Urgent' },
          { value: 'high', label: 'High' },
          { value: 'normal', label: 'Normal' },
          { value: 'low', label: 'Low' }
        ],
        filterFn: (row, val) => !val || (row.priority || '').toLowerCase() === val.toLowerCase()
      },
      {
        key: 'module',
        label: 'Module / Area',
        type: 'select',
        placeholder: 'All Areas',
        options: [
          { value: 'Livestock', label: 'Livestock' },
          { value: 'Health', label: 'Animal Health' },
          { value: 'Feed', label: 'Feed & Nutrition' },
          { value: 'Maintenance', label: 'Maintenance' },
          { value: 'Procurement', label: 'Procurement' },
          { value: 'Finance', label: 'Finance' },
          { value: 'General', label: 'General' }
        ],
        filterFn: (row, val) => !val || (row.module || '').toLowerCase() === val.toLowerCase()
      },
      {
        key: 'assigned_to',
        label: 'Assigned Staff',
        type: 'select',
        placeholder: 'All Assignees',
        lookup: 'users',
        filterFn: (row, val) => !val || String(row.assigned_to) === String(val)
      },
      {
        key: 'date_to',
        label: 'Due Before',
        type: 'date',
        filterFn: (row, val) => {
          if (!val) return true;
          if (!row.due_date) return false;
          return new Date(row.due_date) <= new Date(val + 'T23:59:59');
        }
      },
      {
        key: 'date_from',
        label: 'Due After',
        type: 'date',
        filterFn: (row, val) => {
          if (!val) return true;
          if (!row.due_date) return false;
          return new Date(row.due_date) >= new Date(val);
        }
      }
    ],
    kpiDefs: [
      {
        label: 'Total Tasks',
        compute: (rows, all) => ({
          label: 'Total Tasks',
          value: rows.length,
          meta: `${all.length} work items logged`,
          ok: true
        })
      },
      {
        label: 'Open & Active',
        compute: (rows) => {
          const count = rows.filter(r => ['open', 'in_progress'].includes((r.status || '').toLowerCase())).length;
          return {
            label: 'Open & Active',
            value: count,
            meta: 'Unfinished work orders',
            alert: count > 0
          };
        }
      },
      {
        label: 'High Priority',
        compute: (rows) => {
          const count = rows.filter(r => ['high', 'urgent'].includes((r.priority || '').toLowerCase()) && (r.status || '').toLowerCase() !== 'completed').length;
          return {
            label: 'High Priority',
            value: count,
            meta: 'Urgent tasks requiring attention',
            alert: count > 0
          };
        }
      },
      {
        label: 'Tasks Completed',
        compute: (rows) => {
          const count = rows.filter(r => (r.status || '').toLowerCase() === 'completed').length;
          return {
            label: 'Tasks Completed',
            value: count,
            meta: 'Successfully resolved work orders',
            ok: true
          };
        }
      }
    ]
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
  payments: {
    title: 'Payments',
    subtitle: 'Supplier payment register linked to invoice balances.',
    columns: [
      { key: 'invoice', label: 'Invoice', render: (row) => row.invoice?.invoice_number || '' },
      { key: 'supplier', label: 'Supplier', render: (row) => row.invoice?.supplier?.name || '' },
      { key: 'amount', label: 'Amount' },
      { key: 'paid_at', label: 'Paid on' },
      { key: 'method', label: 'Method' },
      { key: 'reference', label: 'Reference' }
    ],
    fields: [
      { key: 'invoice_id', label: 'Invoice', type: 'select', required: true, lookup: 'invoices' },
      { key: 'amount', label: 'Amount', type: 'number', required: true },
      { key: 'paid_at', label: 'Payment date', type: 'date', required: true },
      { key: 'method', label: 'Method', type: 'select', options: [
        { value: 'bank_transfer', label: 'Bank transfer' }, { value: 'mobile_money', label: 'Mobile money' },
        { value: 'cash', label: 'Cash' }, { value: 'card', label: 'Card' }, { value: 'other', label: 'Other' }
      ]},
      { key: 'reference', label: 'Reference', type: 'text' }
    ],
    defaults: { method: 'bank_transfer' }
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
