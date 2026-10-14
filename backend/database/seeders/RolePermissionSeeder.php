<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        // Define all modules and their actions
        $modules = [
            'Dashboard' => ['view'],
            'Livestock' => ['view', 'create', 'edit', 'delete', 'export'],
            'Health' => ['view', 'create', 'edit', 'delete', 'export'],
            'Breeding' => ['view', 'create', 'edit', 'delete', 'export'],
            'Feed' => ['view', 'create', 'edit', 'delete', 'export'],
            'Inventory' => ['view', 'create', 'edit', 'delete', 'export'],
            'Procurement' => ['view', 'create', 'edit', 'delete', 'approve', 'export'],
            'Suppliers' => ['view', 'create', 'edit', 'delete', 'export'],
            'Assets' => ['view', 'create', 'edit', 'delete', 'export'],
            'Maintenance' => ['view', 'create', 'edit', 'delete', 'export'],
            'Finance' => ['view', 'create', 'edit', 'delete', 'approve', 'export'],
            'Expenses' => ['view', 'create', 'edit', 'delete', 'approve', 'export'],
            'Invoices' => ['view', 'create', 'edit', 'delete', 'export'],
            'Payments' => ['view', 'create', 'edit', 'delete', 'approve', 'export'],
            'HR' => ['view', 'create', 'edit', 'delete', 'export'],
            'Tasks' => ['view', 'create', 'edit', 'delete', 'assign', 'export'],
            'CRM' => ['view', 'create', 'edit', 'delete', 'export'],
            'Marketing' => ['view', 'create', 'edit', 'delete', 'export'],
            'Sales' => ['view', 'create', 'edit', 'delete', 'export'],
            'Governance' => ['view', 'create', 'edit', 'delete', 'approve', 'export'],
            'Settings' => ['view', 'edit', 'manage_roles', 'manage_users', 'system_config'],
            'Reports' => ['view', 'export', 'schedule'],
        ];

        $permissions = [];

        // Create all permissions
        foreach ($modules as $module => $actions) {
            foreach ($actions as $action) {
                $permissionName = strtolower($module) . '.' . $action;
                $permission = Permission::firstOrCreate(
                    ['name' => $permissionName],
                    [
                        'module' => $module,
                        'action' => ucfirst($action),
                        'description' => ucfirst($action) . ' ' . $module,
                    ]
                );
                $permissions[$module][$action] = $permission->id;
            }
        }

        // Define roles and their permissions
        $roles = [
            'Owner' => [
                'description' => 'Full system access',
                'permissions' => 'all',
            ],
            'Executive' => [
                'description' => 'Executive management with strategic oversight',
                'permissions' => [
                    'Dashboard' => ['view'],
                    'Livestock' => ['view', 'export'],
                    'Health' => ['view', 'export'],
                    'Breeding' => ['view', 'export'],
                    'Feed' => ['view', 'export'],
                    'Inventory' => ['view', 'export'],
                    'Procurement' => ['view', 'approve', 'export'],
                    'Finance' => ['view', 'approve', 'export'],
                    'HR' => ['view', 'export'],
                    'CRM' => ['view', 'export'],
                    'Marketing' => ['view', 'export'],
                    'Sales' => ['view', 'export'],
                    'Governance' => ['view', 'approve', 'export'],
                    'Reports' => ['view', 'export', 'schedule'],
                ],
            ],
            'Operations Manager' => [
                'description' => 'Oversees daily farm operations and logistics',
                'permissions' => [
                    'Dashboard' => ['view'],
                    'Livestock' => ['view', 'create', 'edit', 'export'],
                    'Health' => ['view', 'create', 'edit', 'export'],
                    'Breeding' => ['view', 'create', 'edit', 'export'],
                    'Feed' => ['view', 'create', 'edit', 'export'],
                    'Inventory' => ['view', 'create', 'edit', 'export'],
                    'Procurement' => ['view', 'create', 'edit', 'export'],
                    'Suppliers' => ['view', 'create', 'edit', 'export'],
                    'Assets' => ['view', 'create', 'edit', 'export'],
                    'Maintenance' => ['view', 'create', 'edit', 'export'],
                    'Tasks' => ['view', 'create', 'edit', 'assign', 'export'],
                    'HR' => ['view', 'export'],
                    'Reports' => ['view', 'export'],
                ],
            ],
            'Farm Manager' => [
                'description' => 'Manages livestock and daily farm activities',
                'permissions' => [
                    'Dashboard' => ['view'],
                    'Livestock' => ['view', 'create', 'edit', 'export'],
                    'Health' => ['view', 'create', 'edit', 'export'],
                    'Breeding' => ['view', 'create', 'edit', 'export'],
                    'Feed' => ['view', 'create', 'edit', 'export'],
                    'Inventory' => ['view', 'export'],
                    'Tasks' => ['view', 'create', 'edit', 'export'],
                    'Reports' => ['view', 'export'],
                ],
            ],
            'Finance Manager' => [
                'description' => 'Manages financial operations and reporting',
                'permissions' => [
                    'Dashboard' => ['view'],
                    'Finance' => ['view', 'create', 'edit', 'approve', 'export'],
                    'Expenses' => ['view', 'create', 'edit', 'approve', 'export'],
                    'Invoices' => ['view', 'create', 'edit', 'export'],
                    'Payments' => ['view', 'create', 'edit', 'approve', 'export'],
                    'Procurement' => ['view', 'approve', 'export'],
                    'Reports' => ['view', 'export', 'schedule'],
                ],
            ],
            'Veterinarian' => [
                'description' => 'Animal health management specialist',
                'permissions' => [
                    'Dashboard' => ['view'],
                    'Livestock' => ['view', 'edit', 'export'],
                    'Health' => ['view', 'create', 'edit', 'delete', 'export'],
                    'Breeding' => ['view', 'create', 'edit', 'export'],
                    'Inventory' => ['view'],
                    'Reports' => ['view', 'export'],
                ],
            ],
            'Storekeeper' => [
                'description' => 'Inventory and stores management',
                'permissions' => [
                    'Dashboard' => ['view'],
                    'Inventory' => ['view', 'create', 'edit', 'export'],
                    'Feed' => ['view', 'create', 'edit', 'export'],
                    'Procurement' => ['view', 'create', 'export'],
                    'Suppliers' => ['view', 'export'],
                    'Reports' => ['view', 'export'],
                ],
            ],
            'Procurement Officer' => [
                'description' => 'Purchasing and supplier management',
                'permissions' => [
                    'Dashboard' => ['view'],
                    'Procurement' => ['view', 'create', 'edit', 'export'],
                    'Suppliers' => ['view', 'create', 'edit', 'export'],
                    'Inventory' => ['view', 'export'],
                    'Assets' => ['view', 'export'],
                    'Reports' => ['view', 'export'],
                ],
            ],
            'Marketing Manager' => [
                'description' => 'Marketing and brand management',
                'permissions' => [
                    'Dashboard' => ['view'],
                    'Marketing' => ['view', 'create', 'edit', 'delete', 'export'],
                    'CRM' => ['view', 'create', 'edit', 'export'],
                    'Sales' => ['view', 'export'],
                    'Reports' => ['view', 'export'],
                ],
            ],
            'Sales Representative' => [
                'description' => 'Sales and customer engagement',
                'permissions' => [
                    'Dashboard' => ['view'],
                    'CRM' => ['view', 'create', 'edit', 'export'],
                    'Sales' => ['view', 'create', 'edit', 'export'],
                    'Marketing' => ['view'],
                    'Reports' => ['view', 'export'],
                ],
            ],
            'Farm Employee' => [
                'description' => 'Basic farm worker access',
                'permissions' => [
                    'Dashboard' => ['view'],
                    'Livestock' => ['view'],
                    'Health' => ['view'],
                    'Tasks' => ['view', 'edit'],
                ],
            ],
        ];

        // Create roles and assign permissions
        foreach ($roles as $roleName => $roleData) {
            $role = Role::firstOrCreate(
                ['name' => $roleName],
                [
                    'description' => $roleData['description'],
                    'is_active' => true,
                ]
            );

            if ($roleData['permissions'] === 'all') {
                // Owner gets all permissions
                $role->syncPermissions(Permission::pluck('id')->toArray());
            } else {
                // Collect permission IDs for this role
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

        $this->command->info('✅ Roles and permissions seeded successfully!');
    }
}
