# Role & Permission Management System - Setup Guide

## Overview
This is a comprehensive role and permission management system for the Evolex farm management application. It includes hierarchical roles with granular permissions for all system modules.

## Features
- ✅ **Complete Role Management**: Create, edit, delete, and manage user roles
- ✅ **Granular Permissions**: Module-based permissions with actions (view, create, edit, delete, approve, export)
- ✅ **User-Friendly Interface**: Modern UI matching your application's design system
- ✅ **Pre-configured Roles**: 11 pre-seeded roles covering all organizational positions
- ✅ **Permission Groups**: Organized by modules (Dashboard, Livestock, Health, Finance, etc.)
- ✅ **Active/Inactive Status**: Enable or disable roles without deleting them
- ✅ **Search & Filter**: Quick search across roles and permissions
- ✅ **Bulk Permission Management**: Select/deselect entire modules at once

## Backend Setup

### 1. Run Migrations
```bash
cd backend
php artisan migrate
```

This will create:
- `roles` table
- `permissions` table
- `role_permission` pivot table
- Add `role_id` foreign key to `users` table

### 2. Seed Initial Data
```bash
php artisan db:seed --class=RolePermissionSeeder
```

This seeds **11 pre-configured roles**:
1. **Owner** - Full system access
2. **Executive** - Strategic oversight and approvals
3. **Operations Manager** - Daily operations management
4. **Farm Manager** - Livestock and farm activities
5. **Finance Manager** - Financial operations
6. **Veterinarian** - Animal health specialist
7. **Storekeeper** - Inventory management
8. **Procurement Officer** - Purchasing and suppliers
9. **Marketing Manager** - Marketing and brand
10. **Sales Representative** - Sales and CRM
11. **Farm Employee** - Basic worker access

And **100+ permissions** across 22 modules:
- Dashboard, Livestock, Health, Breeding, Feed
- Inventory, Procurement, Suppliers, Assets, Maintenance
- Finance, Expenses, Invoices, Payments
- HR, Tasks, CRM, Marketing, Sales
- Governance, Settings, Reports

## Frontend Access

### Navigate to Roles Management
1. Log in to the application
2. Go to **Settings** section
3. Click on **Roles & Permissions** (or navigate to `/roles`)

### Using the Interface

#### View Roles
- See all roles in a clean table layout
- View role descriptions and assigned user counts
- Search roles by name or description

#### Create New Role
1. Click the **+** button (top right)
2. Enter role name and description
3. Navigate to the **Privilege** tab
4. Search and select permissions by:
   - Checking individual permissions
   - Checking entire modules (bulk selection)
5. Click **Save**

#### Edit Role
1. Click the pencil icon on any role
2. Modify name, description, or permissions
3. Click **Save**

#### Delete Role
1. Click the trash icon
2. Confirm deletion
3. Note: Cannot delete roles with assigned users

#### Toggle Role Status
- Click the green checkmark to deactivate
- Inactive roles appear dimmed and cannot be assigned to new users

## API Endpoints

### Roles
- `GET /api/v1/roles` - List all roles
- `POST /api/v1/roles` - Create new role
- `GET /api/v1/roles/{id}` - Get single role
- `PUT /api/v1/roles/{id}` - Update role
- `DELETE /api/v1/roles/{id}` - Delete role

### Permissions
- `GET /api/v1/permissions` - List all permissions (grouped and flat)
- `POST /api/v1/roles/{id}/permissions` - Sync permissions for a role

## Permission Structure

Each permission follows the format: `module.action`

**Example permissions:**
- `livestock.view` - View livestock records
- `livestock.create` - Create new livestock
- `livestock.edit` - Edit livestock
- `livestock.delete` - Delete livestock
- `livestock.export` - Export livestock data

**Available actions per module:**
- `view` - Read access
- `create` - Create new records
- `edit` - Modify existing records
- `delete` - Remove records
- `approve` - Approval workflows (Finance, Procurement, Governance)
- `assign` - Assign tasks/responsibilities (Tasks, HR)
- `export` - Export data
- `manage_roles` - Role management (Settings only)
- `manage_users` - User management (Settings only)
- `system_config` - System configuration (Settings only)
- `schedule` - Schedule reports (Reports only)

## User Model Integration

The User model now includes:
- `role_id` - Foreign key to roles table
- `roleModel()` - Relationship to Role model
- `hasPermission($permissionName)` - Check if user has specific permission
- `permissions()` - Get all user permissions through role

### Usage Example (Backend)
```php
// Check if user has permission
if (auth()->user()->hasPermission('livestock.create')) {
    // Allow livestock creation
}

// Get all user permissions
$permissions = auth()->user()->permissions();
```

## Customization

### Adding New Permissions
1. Add permissions in the seeder or via code:
```php
Permission::create([
    'name' => 'custom_module.custom_action',
    'module' => 'Custom Module',
    'action' => 'Custom Action',
    'description' => 'Description of the permission'
]);
```

2. Assign to roles:
```php
$role = Role::findByName('Farm Manager');
$permission = Permission::where('name', 'custom_module.custom_action')->first();
$role->givePermissionTo($permission);
```

### Adding New Roles
Either use the UI or create programmatically:
```php
$role = Role::create([
    'name' => 'New Role',
    'description' => 'Role description',
    'is_active' => true
]);

$permissions = Permission::whereIn('id', [1, 2, 3])->pluck('id');
$role->syncPermissions($permissions);
```

## Styling

The role management interface uses your application's design system:
- **Primary Color**: Forest green (`--forest: #2f4a32`)
- **Accent**: Gold (`--gold: #c4a35a`)
- **Surface**: Paper colors for cards and panels
- **Typography**: Fraunces (headings), Manrope (body)
- **Dark Mode**: Full support with surface token system

## Database Schema

### roles
- id
- name (unique)
- description
- is_active (boolean)
- timestamps

### permissions
- id
- name (unique)
- module
- action
- description
- timestamps

### role_permission
- id
- role_id (foreign key)
- permission_id (foreign key)
- timestamps

### users (updated)
- ... existing fields
- role_id (foreign key, nullable)

## Migration Notes

- The migration safely adds `role_id` to existing users table
- Existing `role` string column is preserved for backward compatibility
- You can migrate data from `role` string to `role_id` foreign key gradually

## Troubleshooting

### Issue: Cannot delete role
**Solution**: Role has users assigned. Reassign users to different role first.

### Issue: Permissions not loading
**Solution**: Run the seeder to populate permissions: `php artisan db:seed --class=RolePermissionSeeder`

### Issue: 404 on /roles route
**Solution**: Make sure the route is registered in `app.routes.ts` and component is created.

### Issue: API returns 401/403
**Solution**: Ensure user is authenticated with valid Sanctum token.

## Next Steps

1. **Implement Permission Guards**: Add middleware to protect routes based on permissions
2. **UI Permission Checks**: Hide/disable UI elements based on user permissions
3. **Audit Logging**: Track permission changes and role assignments
4. **Role Templates**: Create role templates for quick setup
5. **Permission Presets**: Define permission groups for common scenarios

## Support

For issues or questions:
1. Check the backend logs: `storage/logs/laravel.log`
2. Check browser console for frontend errors
3. Verify database migrations ran successfully
4. Ensure API endpoints are accessible

---

**Built with ❤️ for Evolex Farm Management System**
