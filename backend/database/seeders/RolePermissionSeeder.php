<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;

class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        // ── 1. General Privilege Modules ──────────────────────────────────────
        $modules = [
            'Dashboard'     => ['view'],
            'CEO'           => ['view'],
            'Notifications' => ['view', 'manage'],
            'Livestock'     => ['view', 'create', 'edit', 'delete', 'export'],
            'Health'        => ['view', 'create', 'edit', 'delete', 'export'],
            'Treatments'    => ['view', 'create', 'edit', 'delete', 'export'],
            'Breeding'      => ['view', 'create', 'edit', 'delete', 'export'],
            'Feed'          => ['view', 'create', 'edit', 'delete', 'export'],
            'Inventory'     => ['view', 'create', 'edit', 'delete', 'export'],
            'Procurement'   => ['view', 'create', 'edit', 'delete', 'approve', 'export'],
            'Suppliers'     => ['view', 'create', 'edit', 'delete', 'export'],
            'Assets'        => ['view', 'create', 'edit', 'delete', 'export'],
            'Maintenance'   => ['view', 'create', 'edit', 'delete', 'export'],
            'HR'            => ['view', 'create', 'edit', 'delete', 'export'],
            'Tasks'         => ['view', 'create', 'edit', 'delete', 'assign', 'export'],
            'Finance'       => ['view', 'create', 'edit', 'delete', 'approve', 'export'],
            'Expenses'      => ['view', 'create', 'edit', 'delete', 'approve', 'export'],
            'Invoices'      => ['view', 'create', 'edit', 'delete', 'export'],
            'Payments'      => ['view', 'create', 'edit', 'delete', 'approve', 'export'],
            'CRM'           => ['view', 'create', 'edit', 'delete', 'export'],
            'Contacts'      => ['view', 'create', 'edit', 'delete', 'export'],
            'Deals'         => ['view', 'create', 'edit', 'delete', 'export'],
            'Sales'         => ['view', 'create', 'edit', 'delete', 'export'],
            'Marketing'     => ['view', 'create', 'edit', 'delete', 'export'],
            'Campaigns'     => ['view', 'create', 'edit', 'delete', 'export'],
            'Governance'    => ['view', 'create', 'edit', 'delete', 'approve', 'export'],
            'Settings'      => ['view', 'edit', 'manage_roles', 'manage_users', 'system_config'],
        ];

        $permissions = [];

        foreach ($modules as $module => $actions) {
            foreach ($actions as $action) {
                $permissionName = strtolower($module) . '.' . $action;
                $permission = Permission::firstOrCreate(
                    ['name' => $permissionName],
                    [
                        'module'      => $module,
                        'action'      => ucfirst(str_replace('_', ' ', $action)),
                        'description' => ucfirst(str_replace('_', ' ', $action)) . ' ' . $module,
                    ]
                );
                $permissions[$module][$action] = $permission->id;
            }
        }

        // ── 2. Reports Permissions (Categorized Catalogue) ────────────────────
        $reportCatalogue = [
            'Reports - General' => [
                'view'                => 'Access Reports Workspace',
                'export'              => 'Export Reports (PDF / Excel / CSV)',
                'schedule'            => 'Schedule Automated Recurring Reports',
            ],
            'Reports - Livestock' => [
                'livestock_summary'   => 'Livestock Herd Summary Report',
                'herd_by_location'    => 'Herd by Location & Enclosure Report',
            ],
            'Reports - Health' => [
                'health_summary'      => 'Health Cases & Illness Summary',
                'treatment_summary'   => 'Treatment & Medicine Dispensation Report',
            ],
            'Reports - Sales & Production' => [
                'sales_summary'       => 'Livestock Sales & Culls Summary',
            ],
            'Reports - Supply & Inventory' => [
                'inventory_summary'   => 'Inventory Stock & Valuation Report',
                'procurement_summary' => 'Procurement & Purchase Orders Report',
            ],
            'Reports - Operations' => [
                'maintenance_summary' => 'Asset Maintenance & Service Schedule',
                'task_summary'        => 'Operational Tasks Completion Report',
            ],
            'Reports - Finance' => [
                'expense_summary'     => 'Operational Expenses & Cost Breakdown',
            ],
            'Reports - People' => [
                'staff_summary'       => 'Staff Headcount & Attendance Summary',
            ],
        ];

        foreach ($reportCatalogue as $category => $items) {
            foreach ($items as $action => $desc) {
                $permissionName = 'reports.' . $action;
                $permission = Permission::firstOrCreate(
                    ['name' => $permissionName],
                    [
                        'module'      => $category,
                        'action'      => ucfirst(str_replace('_', ' ', $action)),
                        'description' => $desc,
                    ]
                );
                $permissions['Reports'][$action] = $permission->id;
            }
        }

        // ── 3. Data Column Permissions (Order & Sensitive Fields) ─────────────
        $columnCatalogue = [
            'cost_price'          => 'View Purchase & Unit Cost Prices',
            'valuation'           => 'View Herd & Stock Asset Valuation Totals',
            'financial_totals'    => 'View Financial Amounts & Revenue Totals',
            'profit_margins'      => 'View Gross & Net Profit Margin Metrics',
            'confidential_notes'  => 'View Internal & Confidential Audit Notes',
            'personal_contacts'   => 'View Personal Phone & Contact Information',
            'tax_rates'           => 'View & Adjust Tax-Inclusive Rates',
        ];

        foreach ($columnCatalogue as $action => $desc) {
            $permissionName = 'columns.' . $action;
            $permission = Permission::firstOrCreate(
                ['name' => $permissionName],
                [
                    'module'      => 'Order Summary Columns',
                    'action'      => ucfirst(str_replace('_', ' ', $action)),
                    'description' => $desc,
                ]
            );
            $permissions['Columns'][$action] = $permission->id;
        }

        // ── 4. Define Roles with Mapped Permissions ───────────────────────────
        $roles = [
            'Owner' => [
                'description' => 'Super Administrator with unrestricted access across all modules, reports, and columns',
                'permissions' => 'all',
            ],
            'Executive' => [
                'description' => 'Executive management with full strategic oversight, reports, and approval rights',
                'permissions' => [
                    'Dashboard'     => ['view'],
                    'CEO'           => ['view'],
                    'Notifications' => ['view', 'manage'],
                    'Livestock'     => ['view', 'export'],
                    'Health'        => ['view', 'export'],
                    'Breeding'      => ['view', 'export'],
                    'Feed'          => ['view', 'export'],
                    'Inventory'     => ['view', 'export'],
                    'Procurement'   => ['view', 'approve', 'export'],
                    'Finance'       => ['view', 'approve', 'export'],
                    'Expenses'      => ['view', 'approve', 'export'],
                    'Invoices'      => ['view', 'export'],
                    'Payments'      => ['view', 'approve', 'export'],
                    'HR'            => ['view', 'export'],
                    'CRM'           => ['view', 'export'],
                    'Marketing'     => ['view', 'export'],
                    'Sales'         => ['view', 'export'],
                    'Governance'    => ['view', 'approve', 'export'],
                    'Reports'       => ['view', 'export', 'schedule', 'livestock_summary', 'herd_by_location', 'health_summary', 'treatment_summary', 'sales_summary', 'inventory_summary', 'procurement_summary', 'maintenance_summary', 'task_summary', 'expense_summary', 'staff_summary'],
                    'Columns'       => ['cost_price', 'valuation', 'financial_totals', 'profit_margins', 'confidential_notes', 'personal_contacts', 'tax_rates'],
                ],
            ],
            'Operations Manager' => [
                'description' => 'Oversees daily farm operations, herd logistics, maintenance, and dispatch',
                'permissions' => [
                    'Dashboard'     => ['view'],
                    'Notifications' => ['view', 'manage'],
                    'Livestock'     => ['view', 'create', 'edit', 'export'],
                    'Health'        => ['view', 'create', 'edit', 'export'],
                    'Treatments'    => ['view', 'create', 'edit', 'export'],
                    'Breeding'      => ['view', 'create', 'edit', 'export'],
                    'Feed'          => ['view', 'create', 'edit', 'export'],
                    'Inventory'     => ['view', 'create', 'edit', 'export'],
                    'Procurement'   => ['view', 'create', 'edit', 'export'],
                    'Suppliers'     => ['view', 'create', 'edit', 'export'],
                    'Assets'        => ['view', 'create', 'edit', 'export'],
                    'Maintenance'   => ['view', 'create', 'edit', 'export'],
                    'Tasks'         => ['view', 'create', 'edit', 'assign', 'export'],
                    'HR'            => ['view', 'export'],
                    'Reports'       => ['view', 'export', 'livestock_summary', 'herd_by_location', 'health_summary', 'treatment_summary', 'inventory_summary', 'procurement_summary', 'maintenance_summary', 'task_summary', 'staff_summary'],
                    'Columns'       => ['valuation', 'confidential_notes', 'personal_contacts'],
                ],
            ],
            'Farm Manager' => [
                'description' => 'Manages livestock herd health, breeding schedules, and daily farm tasks',
                'permissions' => [
                    'Dashboard'     => ['view'],
                    'Notifications' => ['view'],
                    'Livestock'     => ['view', 'create', 'edit', 'export'],
                    'Health'        => ['view', 'create', 'edit', 'export'],
                    'Treatments'    => ['view', 'create', 'edit', 'export'],
                    'Breeding'      => ['view', 'create', 'edit', 'export'],
                    'Feed'          => ['view', 'create', 'edit', 'export'],
                    'Inventory'     => ['view', 'export'],
                    'Tasks'         => ['view', 'create', 'edit', 'export'],
                    'Reports'       => ['view', 'export', 'livestock_summary', 'herd_by_location', 'health_summary', 'treatment_summary', 'task_summary'],
                    'Columns'       => ['confidential_notes'],
                ],
            ],
            'Finance Manager' => [
                'description' => 'Controls financial ledgers, disbursements, payroll, invoices, and accounting reports',
                'permissions' => [
                    'Dashboard'     => ['view'],
                    'Notifications' => ['view', 'manage'],
                    'Finance'       => ['view', 'create', 'edit', 'approve', 'export'],
                    'Expenses'      => ['view', 'create', 'edit', 'approve', 'export'],
                    'Invoices'      => ['view', 'create', 'edit', 'delete', 'export'],
                    'Payments'      => ['view', 'create', 'edit', 'approve', 'export'],
                    'Procurement'   => ['view', 'approve', 'export'],
                    'Sales'         => ['view', 'export'],
                    'Reports'       => ['view', 'export', 'schedule', 'sales_summary', 'expense_summary', 'procurement_summary'],
                    'Columns'       => ['cost_price', 'valuation', 'financial_totals', 'profit_margins', 'tax_rates'],
                ],
            ],
            'Veterinarian' => [
                'description' => 'Animal health management specialist with full veterinary record authority',
                'permissions' => [
                    'Dashboard'     => ['view'],
                    'Notifications' => ['view'],
                    'Livestock'     => ['view', 'edit', 'export'],
                    'Health'        => ['view', 'create', 'edit', 'delete', 'export'],
                    'Treatments'    => ['view', 'create', 'edit', 'delete', 'export'],
                    'Breeding'      => ['view', 'create', 'edit', 'export'],
                    'Inventory'     => ['view'],
                    'Reports'       => ['view', 'export', 'health_summary', 'treatment_summary'],
                    'Columns'       => ['confidential_notes'],
                ],
            ],
            'Storekeeper' => [
                'description' => 'Maintains inventory stores, feed rations, supplies, and stock movements',
                'permissions' => [
                    'Dashboard'     => ['view'],
                    'Notifications' => ['view'],
                    'Inventory'     => ['view', 'create', 'edit', 'export'],
                    'Feed'          => ['view', 'create', 'edit', 'export'],
                    'Procurement'   => ['view', 'create', 'export'],
                    'Suppliers'     => ['view', 'export'],
                    'Assets'        => ['view', 'export'],
                    'Reports'       => ['view', 'export', 'inventory_summary'],
                    'Columns'       => ['cost_price'],
                ],
            ],
            'Procurement Officer' => [
                'description' => 'Purchasing, RFQs, purchase orders, and vendor supplier management',
                'permissions' => [
                    'Dashboard'     => ['view'],
                    'Notifications' => ['view'],
                    'Procurement'   => ['view', 'create', 'edit', 'export'],
                    'Suppliers'     => ['view', 'create', 'edit', 'export'],
                    'Inventory'     => ['view', 'export'],
                    'Assets'        => ['view', 'export'],
                    'Invoices'      => ['view', 'create'],
                    'Reports'       => ['view', 'export', 'procurement_summary', 'inventory_summary'],
                    'Columns'       => ['cost_price', 'financial_totals'],
                ],
            ],
            'Marketing Manager' => [
                'description' => 'Brand campaigns, CRM inquiries, channels, and content calendar',
                'permissions' => [
                    'Dashboard'     => ['view'],
                    'Notifications' => ['view'],
                    'Marketing'     => ['view', 'create', 'edit', 'delete', 'export'],
                    'Campaigns'     => ['view', 'create', 'edit', 'delete', 'export'],
                    'CRM'           => ['view', 'create', 'edit', 'export'],
                    'Contacts'      => ['view', 'create', 'edit', 'export'],
                    'Sales'         => ['view', 'export'],
                    'Reports'       => ['view', 'export', 'sales_summary'],
                    'Columns'       => ['personal_contacts'],
                ],
            ],
            'Sales Representative' => [
                'description' => 'Deals pipeline, live off-take sales, customer orders, and negotiations',
                'permissions' => [
                    'Dashboard'     => ['view'],
                    'Notifications' => ['view'],
                    'CRM'           => ['view', 'create', 'edit', 'export'],
                    'Contacts'      => ['view', 'create', 'edit', 'export'],
                    'Deals'         => ['view', 'create', 'edit', 'export'],
                    'Sales'         => ['view', 'create', 'edit', 'export'],
                    'Marketing'     => ['view'],
                    'Reports'       => ['view', 'export', 'sales_summary'],
                    'Columns'       => ['financial_totals', 'personal_contacts'],
                ],
            ],
            'Farm Employee' => [
                'description' => 'Base farm operative for viewing livestock and completing assigned daily tasks',
                'permissions' => [
                    'Dashboard'     => ['view'],
                    'Livestock'     => ['view'],
                    'Health'        => ['view'],
                    'Tasks'         => ['view', 'edit'],
                ],
            ],
        ];

        // ── 5. Sync Roles and Permissions ─────────────────────────────────────
        $allPermissionIds = Permission::pluck('id')->toArray();

        foreach ($roles as $roleName => $roleData) {
            $role = Role::firstOrCreate(
                ['name' => $roleName],
                [
                    'description' => $roleData['description'],
                    'is_active'   => true,
                ]
            );

            if ($roleData['permissions'] === 'all') {
                $role->syncPermissions($allPermissionIds);
            } else {
                $rolePermissions = [];
                foreach ($roleData['permissions'] as $module => $actions) {
                    foreach ($actions as $action) {
                        if (isset($permissions[$module][$action])) {
                            $rolePermissions[] = $permissions[$module][$action];
                        }
                    }
                }
                $role->syncPermissions($rolePermissions);
            }
        }

        // ── 6. Map Users to role_id based on role string ─────────────────────
        $roleMap = [
            'owner'              => 'Owner',
            'executive'          => 'Executive',
            'operations_manager' => 'Operations Manager',
            'farm_manager'       => 'Farm Manager',
            'finance'            => 'Finance Manager',
            'marketing'          => 'Marketing Manager',
            'sales'              => 'Sales Representative',
            'storekeeper'        => 'Storekeeper',
            'vet'                => 'Veterinarian',
            'procurement'        => 'Procurement Officer',
            'farm_employee'      => 'Farm Employee',
        ];

        foreach ($roleMap as $roleSlug => $roleName) {
            $role = Role::where('name', $roleName)->first();
            if ($role) {
                User::where('role', $roleSlug)->update(['role_id' => $role->id]);
            }
        }

        $this->command->info('Roles, Permissions, Reports & Columns catalogue seeded successfully!');
    }
}
