import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';

interface Permission {
  id: number;
  name: string;
  module: string;
  action: string;
  description?: string;
}

interface PermissionGroup {
  [module: string]: Permission[];
}

interface Role {
  id?: number;
  name: string;
  description: string;
  is_active: boolean;
  permissions: number[];
  permissions_detail?: Permission[];
  permissions_count?: number;
  users_count?: number;
  created_at?: string;
  updated_at?: string;
}

interface PaginationMeta {
  current_page: number;
  from: number;
  last_page: number;
  per_page: number;
  to: number;
  total: number;
}

interface ApiResponse {
  data: Role[];
  meta: PaginationMeta;
  links: {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  };
}

@Component({
  selector: 'app-role-management',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './role-management.component.html',
  styleUrls: ['./role-management.component.scss']
})
export class RoleManagementComponent implements OnInit {
  roles: Role[] = [];
  permissions: Permission[] = [];
  permissionGroups: PermissionGroup = {};
  
  // Filters
  searchTerm = '';
  statusFilter: 'all' | 'active' | 'inactive' = 'all';
  hasUsersFilter: 'all' | 'with_users' | 'no_users' = 'all';
  minPermissionsFilter: number | null = null;
  sortBy: 'name' | 'created_at' | 'updated_at' = 'created_at';
  sortOrder: 'asc' | 'desc' = 'desc';
  
  // Pagination
  currentPage = 1;
  perPage = 15;
  totalItems = 0;
  totalPages = 0;
  
  showModal = false;
  isEditing = false;
  currentRole: Role = this.getEmptyRole();
  
  searchPermission = '';
  searchPrivilege = '';
  searchReport = '';
  searchColumn = '';
  selectedTab: 'privilege' | 'reports' | 'columns' = 'privilege';
  showFilters = false;

  // Expose Math to template
  Math = Math;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadRoles();
    this.loadPermissions();
  }

  getEmptyRole(): Role {
    return {
      name: '',
      description: '',
      is_active: true,
      permissions: []
    };
  }

  loadRoles(): void {
    const params: any = {
      page: this.currentPage,
      per_page: this.perPage,
      sort_by: this.sortBy,
      sort_order: this.sortOrder
    };

    if (this.searchTerm) {
      params.search = this.searchTerm;
    }

    if (this.statusFilter !== 'all') {
      params.is_active = this.statusFilter === 'active' ? '1' : '0';
    }

    if (this.hasUsersFilter !== 'all') {
      params.has_users = this.hasUsersFilter === 'with_users' ? '1' : '0';
    }

    if (this.minPermissionsFilter && this.minPermissionsFilter > 0) {
      params.min_permissions = this.minPermissionsFilter;
    }

    this.api.get<ApiResponse>('/roles', params)
      .subscribe({
        next: (response) => {
          this.roles = response.data;
          this.currentPage = response.meta.current_page;
          this.totalItems = response.meta.total;
          this.totalPages = response.meta.last_page;
          this.perPage = response.meta.per_page;
        },
        error: (err) => console.error('Failed to load roles:', err)
      });
  }

  loadPermissions(): void {
    this.api.get<{ data: PermissionGroup; flat: Permission[] }>('/permissions')
      .subscribe({
        next: (response) => {
          this.permissions = response.flat;
          this.permissionGroups = response.data;
        },
        error: (err) => console.error('Failed to load permissions:', err)
      });
  }

  searchRoles(): void {
    this.currentPage = 1;
    this.loadRoles();
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.loadRoles();
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.statusFilter = 'all';
    this.hasUsersFilter = 'all';
    this.minPermissionsFilter = null;
    this.sortBy = 'created_at';
    this.sortOrder = 'desc';
    this.currentPage = 1;
    this.loadRoles();
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadRoles();
    }
  }

  changePerPage(perPage: number): void {
    this.perPage = perPage;
    this.currentPage = 1;
    this.loadRoles();
  }

  changeSort(field: 'name' | 'created_at' | 'updated_at'): void {
    if (this.sortBy === field) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = field;
      this.sortOrder = 'asc';
    }
    this.loadRoles();
  }

  get pageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(this.totalPages, start + maxVisible - 1);

    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }

  openAddModal(): void {
    this.currentRole = this.getEmptyRole();
    this.isEditing = false;
    this.showModal = true;
    this.searchPermission = '';
  }

  openEditModal(role: Role): void {
    this.currentRole = { ...role };
    this.isEditing = true;
    this.showModal = true;
    this.searchPermission = '';
  }

  closeModal(): void {
    this.showModal = false;
    this.currentRole = this.getEmptyRole();
    this.searchPermission = '';
  }

  saveRole(): void {
    if (!this.currentRole.name.trim()) {
      alert('Role name is required');
      return;
    }

    const request = this.isEditing
      ? this.api.put(`/roles/${this.currentRole.id}`, this.currentRole)
      : this.api.post('/roles', this.currentRole);

    request.subscribe({
      next: () => {
        this.loadRoles();
        this.closeModal();
      },
      error: (err) => {
        console.error('Failed to save role:', err);
        alert(err.error?.message || 'Failed to save role');
      }
    });
  }

  deleteRole(role: Role): void {
    if (!confirm(`Are you sure you want to delete the role "${role.name}"?`)) {
      return;
    }

    this.api.delete(`/roles/${role.id}`)
      .subscribe({
        next: () => this.loadRoles(),
        error: (err) => {
          console.error('Failed to delete role:', err);
          alert(err.error?.message || 'Failed to delete role');
        }
      });
  }

  toggleRoleStatus(role: Role): void {
    role.is_active = !role.is_active;
    this.api.put(`/roles/${role.id}`, role)
      .subscribe({
        next: () => this.loadRoles(),
        error: (err) => {
          console.error('Failed to update role status:', err);
          role.is_active = !role.is_active; // Revert on error
        }
      });
  }

  isPermissionSelected(permissionId: number): boolean {
    return this.currentRole.permissions.includes(permissionId);
  }

  togglePermission(permissionId: number): void {
    const index = this.currentRole.permissions.indexOf(permissionId);
    if (index > -1) {
      this.currentRole.permissions.splice(index, 1);
    } else {
      this.currentRole.permissions.push(permissionId);
    }
  }

  toggleModulePermissions(module: string): void {
    const modulePermissions = this.permissionGroups[module] || [];
    const modulePermissionIds = modulePermissions.map(p => p.id);
    const allSelected = modulePermissionIds.every(id => this.currentRole.permissions.includes(id));

    if (allSelected) {
      // Deselect all
      this.currentRole.permissions = this.currentRole.permissions.filter(
        id => !modulePermissionIds.includes(id)
      );
    } else {
      // Select all
      modulePermissionIds.forEach(id => {
        if (!this.currentRole.permissions.includes(id)) {
          this.currentRole.permissions.push(id);
        }
      });
    }
  }

  isModuleSelected(module: string): boolean {
    const modulePermissions = this.permissionGroups[module] || [];
    return modulePermissions.length > 0 && 
           modulePermissions.every(p => this.currentRole.permissions.includes(p.id));
  }

  isModulePartiallySelected(module: string): boolean {
    const modulePermissions = this.permissionGroups[module] || [];
    const selected = modulePermissions.filter(p => this.currentRole.permissions.includes(p.id));
    return selected.length > 0 && selected.length < modulePermissions.length;
  }

  get filteredPermissionGroups(): PermissionGroup {
    return this.filterGroup(this.permissionGroups, this.searchPrivilege || this.searchPermission);
  }

  get sortedModules(): string[] {
    return this.privilegeModules;
  }

  get privilegeModules(): string[] {
    const term = (this.searchPrivilege || this.searchPermission).toLowerCase().trim();
    return Object.keys(this.permissionGroups)
      .filter(m => !m.startsWith('Reports') && m !== 'Order Summary Columns')
      .filter(m => {
        if (!term) return true;
        if (m.toLowerCase().includes(term)) return true;
        return (this.permissionGroups[m] || []).some(p =>
          p.name.toLowerCase().includes(term) ||
          p.action.toLowerCase().includes(term) ||
          (p.description || '').toLowerCase().includes(term)
        );
      })
      .sort();
  }

  get reportModules(): string[] {
    const term = this.searchReport.toLowerCase().trim();
    return Object.keys(this.permissionGroups)
      .filter(m => m.startsWith('Reports'))
      .filter(m => {
        if (!term) return true;
        if (m.toLowerCase().includes(term)) return true;
        return (this.permissionGroups[m] || []).some(p =>
          p.name.toLowerCase().includes(term) ||
          p.action.toLowerCase().includes(term) ||
          (p.description || '').toLowerCase().includes(term)
        );
      })
      .sort();
  }

  get columnModules(): string[] {
    const term = this.searchColumn.toLowerCase().trim();
    return Object.keys(this.permissionGroups)
      .filter(m => m === 'Order Summary Columns')
      .filter(m => {
        if (!term) return true;
        if (m.toLowerCase().includes(term)) return true;
        return (this.permissionGroups[m] || []).some(p =>
          p.name.toLowerCase().includes(term) ||
          p.action.toLowerCase().includes(term) ||
          (p.description || '').toLowerCase().includes(term)
        );
      });
  }

  getPermissionsForModule(module: string, searchTerm: string = ''): Permission[] {
    const list = this.permissionGroups[module] || [];
    const term = searchTerm.toLowerCase().trim();
    if (!term) return list;
    return list.filter(p =>
      p.name.toLowerCase().includes(term) ||
      p.action.toLowerCase().includes(term) ||
      (p.description || '').toLowerCase().includes(term)
    );
  }

  private filterGroup(groups: PermissionGroup, term: string): PermissionGroup {
    if (!term.trim()) return groups;
    const lower = term.toLowerCase().trim();
    const result: PermissionGroup = {};
    Object.keys(groups).forEach(m => {
      const match = groups[m].filter(p =>
        m.toLowerCase().includes(lower) ||
        p.name.toLowerCase().includes(lower) ||
        p.action.toLowerCase().includes(lower) ||
        (p.description || '').toLowerCase().includes(lower)
      );
      if (match.length > 0) {
        result[m] = match;
      }
    });
    return result;
  }

  // ─── Grouped Counts & Select All ──────────────────────────────────────────
  get totalPrivilegeCount(): number {
    return this.permissions.filter(p => !p.module.startsWith('Reports') && p.module !== 'Order Summary Columns').length;
  }

  get selectedPrivilegeCount(): number {
    const privIds = new Set(this.permissions.filter(p => !p.module.startsWith('Reports') && p.module !== 'Order Summary Columns').map(p => p.id));
    return this.currentRole.permissions.filter(id => privIds.has(id)).length;
  }

  get totalReportCount(): number {
    return this.permissions.filter(p => p.module.startsWith('Reports')).length;
  }

  get selectedReportCount(): number {
    const reportIds = new Set(this.permissions.filter(p => p.module.startsWith('Reports')).map(p => p.id));
    return this.currentRole.permissions.filter(id => reportIds.has(id)).length;
  }

  get totalColumnCount(): number {
    return this.permissions.filter(p => p.module === 'Order Summary Columns').length;
  }

  get selectedColumnCount(): number {
    const colIds = new Set(this.permissions.filter(p => p.module === 'Order Summary Columns').map(p => p.id));
    return this.currentRole.permissions.filter(id => colIds.has(id)).length;
  }

  toggleAllSectionPermissions(type: 'privilege' | 'reports' | 'columns'): void {
    let targetPerms: Permission[] = [];
    if (type === 'privilege') {
      targetPerms = this.permissions.filter(p => !p.module.startsWith('Reports') && p.module !== 'Order Summary Columns');
    } else if (type === 'reports') {
      targetPerms = this.permissions.filter(p => p.module.startsWith('Reports'));
    } else {
      targetPerms = this.permissions.filter(p => p.module === 'Order Summary Columns');
    }

    const targetIds = targetPerms.map(p => p.id);
    const allSelected = targetIds.every(id => this.currentRole.permissions.includes(id));

    if (allSelected) {
      // Deselect all
      this.currentRole.permissions = this.currentRole.permissions.filter(id => !targetIds.includes(id));
    } else {
      // Select all
      targetIds.forEach(id => {
        if (!this.currentRole.permissions.includes(id)) {
          this.currentRole.permissions.push(id);
        }
      });
    }
  }

  isAllSectionSelected(type: 'privilege' | 'reports' | 'columns'): boolean {
    let targetPerms: Permission[] = [];
    if (type === 'privilege') {
      targetPerms = this.permissions.filter(p => !p.module.startsWith('Reports') && p.module !== 'Order Summary Columns');
    } else if (type === 'reports') {
      targetPerms = this.permissions.filter(p => p.module.startsWith('Reports'));
    } else {
      targetPerms = this.permissions.filter(p => p.module === 'Order Summary Columns');
    }
    return targetPerms.length > 0 && targetPerms.every(p => this.currentRole.permissions.includes(p.id));
  }
}
