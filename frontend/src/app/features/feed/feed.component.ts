import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';

export interface FeedItemRecord {
  id: number;
  inventory_item_id: number;
  item_id: string;
  name: string;
  feed_type: string;
  unit: string;
  storage_location: string;
  quantity_on_hand: number;
  daily_consumption: number;
  days_remaining: number | null;
  average_cost: number;
  total_value: number;
  daily_cost: number;
  reorder_level: number;
  minimum_stock: number;
  maximum_level?: number;
  supplier_id?: number | null;
  supplier?: {
    id: number;
    name: string;
    phone?: string;
    email?: string;
  } | null;
  status: string;
  stock_status: 'adequate' | 'low_stock' | 'critical' | 'out_of_stock';
  created_at?: string;
  updated_at?: string;
  recent_transactions?: any[];
}

export interface FeedTransactionRecord {
  id: number;
  feed_item_id: number;
  type: 'issue' | 'receive' | 'adjustment';
  quantity: number;
  transaction_date: string;
  notes?: string;
  feed_item?: {
    id: number;
    inventory_item?: {
      name: string;
      unit: string;
    };
  };
}

export interface FeedFilters {
  search: string;
  feed_type: string;
  stock_status: string;
  storage_location: string;
  status: string;
  quick_filter: 'all' | 'low_stock' | 'critical' | 'high_usage' | 'adequate';
}

@Component({
  selector: 'app-feed',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './feed.component.html',
  styleUrls: ['./feed.component.scss']
})
export class FeedComponent implements OnInit {
  // Summary KPIs
  summary: any = {
    feed_on_hand: 0,
    average_daily_consumption: 0,
    days_remaining: 0,
    feed_cost_per_animal: 0,
    total_items: 0,
    low_stock_count: 0,
    total_inventory_value: 0,
    alert: false
  };

  // Raw list & Filtered list
  feedItems: FeedItemRecord[] = [];
  filteredFeedItems: FeedItemRecord[] = [];
  paginatedFeedItems: FeedItemRecord[] = [];

  // Transactions list
  transactions: FeedTransactionRecord[] = [];

  // Suppliers lookup
  suppliersList: { id: number; name: string }[] = [];

  // Active view tab
  activeTab: 'catalog' | 'transactions' = 'catalog';

  // Filters
  filters: FeedFilters = {
    search: '',
    feed_type: '',
    stock_status: '',
    storage_location: '',
    status: '',
    quick_filter: 'all'
  };

  showFilters = false;
  selectedItems = new Set<number>();

  // Filter option sets
  feedTypeOptions: string[] = [
    'Concentrate',
    'Roughage',
    'Forage',
    'Mineral Mix',
    'Pellets',
    'Silage',
    'Dairy Mash',
    'Hay Bales',
    'Supplements'
  ];
  storageLocationOptions: string[] = ['Feed Store', 'Silo A', 'Barn Store', 'Main Warehouse', 'North Paddock Store'];

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalRecords = 0;
  totalPages = 1;
  fromRecord = 0;
  toRecord = 0;
  Math = Math;

  // Modals state
  showModal = false;
  isEditing = false;
  modalItem: any = {};

  showViewModal = false;
  viewingItem: FeedItemRecord | null = null;

  showLogUsageModal = false;
  logUsageForm: {
    feed_item_id: number | null;
    type: 'issue' | 'receive' | 'adjustment';
    quantity: number;
    transaction_date: string;
    notes: string;
  } = {
    feed_item_id: null,
    type: 'issue',
    quantity: 10,
    transaction_date: new Date().toISOString().substring(0, 10),
    notes: ''
  };

  showDeleteModal = false;
  deletingItem: FeedItemRecord | null = null;

  // UI state
  loading = false;
  saving = false;
  notification: { message: string; type: 'success' | 'error' } | null = null;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadData();
    this.loadSuppliers();
    this.loadTransactions();
  }

  loadData(): void {
    this.loading = true;
    this.api.get<any>('/feed/summary').subscribe({
      next: (res) => {
        this.summary = res;
        this.feedItems = (res.items || []).map((item: any) => this.normalizeItem(item));
        this.extractFilterOptions();
        this.applyFilters();
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load feed summary', err);
        // Fallback: try /feed/items
        this.api.get<any>('/feed/items').subscribe({
          next: (itemsRes) => {
            this.feedItems = (itemsRes.data || itemsRes || []).map((item: any) => this.normalizeItem(item));
            this.extractFilterOptions();
            this.applyFilters();
            this.loading = false;
          },
          error: () => {
            this.loading = false;
            this.showNotification('Error loading feed data from server', 'error');
          }
        });
      }
    });
  }

  loadSuppliers(): void {
    this.api.get<any>('/suppliers').subscribe({
      next: (res) => {
        this.suppliersList = res.records || res.data || res || [];
      },
      error: (err) => console.warn('Could not load suppliers', err)
    });
  }

  loadTransactions(): void {
    this.api.get<any>('/feed/transactions').subscribe({
      next: (res) => {
        this.transactions = res.data || res || [];
      },
      error: (err) => console.warn('Could not load feed transactions', err)
    });
  }

  private normalizeItem(raw: any): FeedItemRecord {
    const inv = raw.inventory_item || raw.inventoryItem || {};
    const onHand = Number(raw.quantity_on_hand ?? inv.quantity_on_hand ?? 0);
    const daily = Number(raw.daily_consumption ?? 0);
    const cost = Number(raw.average_cost ?? inv.average_cost ?? 0);
    const reorder = Number(raw.reorder_level ?? inv.reorder_level ?? 0);
    const minStock = Number(raw.minimum_stock ?? inv.minimum_stock ?? 0);

    let daysRemaining = raw.days_remaining;
    if (daysRemaining === undefined || daysRemaining === null) {
      daysRemaining = daily > 0 ? Math.round((onHand / daily) * 10) / 10 : null;
    }

    let stockStatus: 'adequate' | 'low_stock' | 'critical' | 'out_of_stock' = raw.stock_status;
    if (!stockStatus) {
      if (onHand <= 0) {
        stockStatus = 'out_of_stock';
      } else if (onHand <= minStock || (daysRemaining !== null && daysRemaining <= 5)) {
        stockStatus = 'critical';
      } else if (onHand <= reorder || (daysRemaining !== null && daysRemaining <= 10)) {
        stockStatus = 'low_stock';
      } else {
        stockStatus = 'adequate';
      }
    }

    return {
      id: raw.id,
      inventory_item_id: raw.inventory_item_id ?? inv.id ?? 0,
      item_id: raw.item_id ?? inv.item_id ?? `INV-FEED-${raw.id}`,
      name: raw.name ?? inv.name ?? `Feed Item #${raw.id}`,
      feed_type: raw.feed_type ?? 'Concentrate',
      unit: raw.unit ?? inv.unit ?? 'kg',
      storage_location: raw.storage_location ?? inv.storage_location ?? 'Feed Store',
      quantity_on_hand: onHand,
      daily_consumption: daily,
      days_remaining: daysRemaining,
      average_cost: cost,
      total_value: Math.round(onHand * cost * 100) / 100,
      daily_cost: Math.round(daily * cost * 100) / 100,
      reorder_level: reorder,
      minimum_stock: minStock,
      maximum_level: Number(raw.maximum_level ?? inv.maximum_level ?? 0),
      supplier_id: raw.supplier_id ?? inv.supplier_id ?? null,
      supplier: raw.supplier ?? inv.supplier ?? null,
      status: raw.status ?? inv.status ?? 'active',
      stock_status: stockStatus,
      created_at: raw.created_at,
      updated_at: raw.updated_at,
      recent_transactions: raw.recent_transactions || []
    };
  }

  private extractFilterOptions(): void {
    const types = new Set(this.feedTypeOptions);
    const locations = new Set(this.storageLocationOptions);

    this.feedItems.forEach((item) => {
      if (item.feed_type) types.add(item.feed_type);
      if (item.storage_location) locations.add(item.storage_location);
    });

    this.feedTypeOptions = Array.from(types).sort();
    this.storageLocationOptions = Array.from(locations).sort();
  }

  applyFilters(): void {
    const q = (this.filters.search || '').trim().toLowerCase();
    const typeFilter = this.filters.feed_type;
    const stockStatusFilter = this.filters.stock_status;
    const locationFilter = this.filters.storage_location;
    const statusFilter = this.filters.status;
    const quick = this.filters.quick_filter;

    this.filteredFeedItems = this.feedItems.filter((item) => {
      // Search text match
      if (q) {
        const matchName = item.name.toLowerCase().includes(q);
        const matchId = (item.item_id || '').toLowerCase().includes(q);
        const matchType = (item.feed_type || '').toLowerCase().includes(q);
        const matchLoc = (item.storage_location || '').toLowerCase().includes(q);
        const matchSupplier = (item.supplier?.name || '').toLowerCase().includes(q);
        if (!matchName && !matchId && !matchType && !matchLoc && !matchSupplier) {
          return false;
        }
      }

      // Dropdown filters
      if (typeFilter && item.feed_type !== typeFilter) return false;
      if (stockStatusFilter && item.stock_status !== stockStatusFilter) return false;
      if (locationFilter && item.storage_location !== locationFilter) return false;
      if (statusFilter && item.status !== statusFilter) return false;

      // Quick filter tabs
      if (quick === 'low_stock' && item.stock_status !== 'low_stock' && item.stock_status !== 'critical') {
        return false;
      }
      if (quick === 'critical' && item.stock_status !== 'critical' && item.stock_status !== 'out_of_stock') {
        return false;
      }
      if (quick === 'high_usage' && item.daily_consumption < 25) {
        return false;
      }
      if (quick === 'adequate' && item.stock_status !== 'adequate') {
        return false;
      }

      return true;
    });

    this.currentPage = 1;
    this.updatePagination();
  }

  setQuickFilter(filter: 'all' | 'low_stock' | 'critical' | 'high_usage' | 'adequate'): void {
    this.filters.quick_filter = filter;
    this.applyFilters();
  }

  hasActiveFilters(): boolean {
    return (
      !!this.filters.search ||
      !!this.filters.feed_type ||
      !!this.filters.stock_status ||
      !!this.filters.storage_location ||
      !!this.filters.status ||
      this.filters.quick_filter !== 'all'
    );
  }

  clearFilters(): void {
    this.filters = {
      search: '',
      feed_type: '',
      stock_status: '',
      storage_location: '',
      status: '',
      quick_filter: 'all'
    };
    this.applyFilters();
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  // ==================== PAGINATION ====================
  updatePagination(): void {
    this.totalRecords = this.filteredFeedItems.length;
    this.totalPages = Math.max(1, Math.ceil(this.totalRecords / this.pageSize));
    this.currentPage = Math.min(Math.max(1, this.currentPage), this.totalPages);

    this.fromRecord = this.totalRecords === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
    this.toRecord = Math.min(this.currentPage * this.pageSize, this.totalRecords);

    const startIndex = (this.currentPage - 1) * this.pageSize;
    this.paginatedFeedItems = this.filteredFeedItems.slice(startIndex, startIndex + this.pageSize);
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.updatePagination();
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  getPageNumbers(): (number | string)[] {
    const total = this.totalPages;
    const current = this.currentPage;
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const pages: (number | string)[] = [];
    pages.push(1);
    if (current > 3) pages.push('...');
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    if (current < total - 2) pages.push('...');
    pages.push(total);
    return pages;
  }

  // ==================== SELECTION ====================
  toggleSelectAll(e: Event): void {
    const checked = (e.target as HTMLInputElement).checked;
    if (checked) {
      this.paginatedFeedItems.forEach((item) => this.selectedItems.add(item.id));
    } else {
      this.paginatedFeedItems.forEach((item) => this.selectedItems.delete(item.id));
    }
  }

  toggleSelect(id: number): void {
    if (this.selectedItems.has(id)) {
      this.selectedItems.delete(id);
    } else {
      this.selectedItems.add(id);
    }
  }

  isSelected(id: number): boolean {
    return this.selectedItems.has(id);
  }

  isAllSelected(): boolean {
    return (
      this.paginatedFeedItems.length > 0 &&
      this.paginatedFeedItems.every((item) => this.selectedItems.has(item.id))
    );
  }

  // ==================== CRUD OPERATIONS ====================
  openCreate(): void {
    this.isEditing = false;
    this.modalItem = {
      name: '',
      feed_type: 'Concentrate',
      unit: 'kg',
      storage_location: 'Feed Store',
      quantity_on_hand: 100,
      daily_consumption: 15,
      average_cost: 4.5,
      reorder_level: 50,
      minimum_stock: 20,
      maximum_level: 500,
      supplier_id: this.suppliersList[0]?.id || null,
      status: 'active',
      notes: ''
    };
    this.showModal = true;
  }

  openEdit(item: FeedItemRecord): void {
    this.isEditing = true;
    this.modalItem = {
      id: item.id,
      name: item.name,
      feed_type: item.feed_type,
      unit: item.unit,
      storage_location: item.storage_location,
      quantity_on_hand: item.quantity_on_hand,
      daily_consumption: item.daily_consumption,
      average_cost: item.average_cost,
      reorder_level: item.reorder_level,
      minimum_stock: item.minimum_stock,
      maximum_level: item.maximum_level,
      supplier_id: item.supplier_id,
      status: item.status
    };
    this.showModal = true;
  }

  saveItem(): void {
    if (!this.modalItem.name || this.modalItem.daily_consumption === undefined) {
      this.showNotification('Please fill in required fields (Name and Daily consumption)', 'error');
      return;
    }

    this.saving = true;
    if (this.isEditing) {
      this.api.put<any>(`/feed/items/${this.modalItem.id}`, this.modalItem).subscribe({
        next: () => {
          this.saving = false;
          this.showModal = false;
          this.showNotification('Feed item updated successfully', 'success');
          this.loadData();
        },
        error: (err) => {
          this.saving = false;
          this.showNotification(err.error?.message || 'Error updating feed item', 'error');
        }
      });
    } else {
      this.api.post<any>('/feed/items', this.modalItem).subscribe({
        next: () => {
          this.saving = false;
          this.showModal = false;
          this.showNotification('Feed item created successfully', 'success');
          this.loadData();
          this.loadTransactions();
        },
        error: (err) => {
          this.saving = false;
          this.showNotification(err.error?.message || 'Error creating feed item', 'error');
        }
      });
    }
  }

  viewItem(item: FeedItemRecord): void {
    this.viewingItem = item;
    this.showViewModal = true;
  }

  confirmDelete(item: FeedItemRecord): void {
    this.deletingItem = item;
    this.showDeleteModal = true;
  }

  deleteItem(): void {
    if (!this.deletingItem) return;

    this.saving = true;
    this.api.delete<any>(`/feed/items/${this.deletingItem.id}`).subscribe({
      next: () => {
        this.saving = false;
        this.showDeleteModal = false;
        this.showNotification(`"${this.deletingItem?.name}" deleted successfully`, 'success');
        this.selectedItems.delete(this.deletingItem!.id);
        this.deletingItem = null;
        this.loadData();
      },
      error: (err) => {
        this.saving = false;
        this.showNotification(err.error?.message || 'Failed to delete feed item', 'error');
      }
    });
  }

  bulkDelete(): void {
    if (this.selectedItems.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${this.selectedItems.size} selected feed items?`)) return;

    const ids = Array.from(this.selectedItems);
    let completed = 0;
    this.saving = true;

    ids.forEach((id) => {
      this.api.delete<any>(`/feed/items/${id}`).subscribe({
        next: () => {
          completed++;
          if (completed === ids.length) {
            this.saving = false;
            this.selectedItems.clear();
            this.showNotification('Selected feed items deleted', 'success');
            this.loadData();
          }
        },
        error: () => {
          completed++;
          if (completed === ids.length) {
            this.saving = false;
            this.selectedItems.clear();
            this.loadData();
          }
        }
      });
    });
  }

  // ==================== LOG FEED USAGE / RESTOCK ====================
  openLogUsage(item?: FeedItemRecord): void {
    this.logUsageForm = {
      feed_item_id: item ? item.id : (this.feedItems[0]?.id || null),
      type: 'issue',
      quantity: item ? item.daily_consumption || 10 : 10,
      transaction_date: new Date().toISOString().substring(0, 10),
      notes: item ? `Daily feeding ration for ${item.name}` : 'Feeding ration issue'
    };
    this.showLogUsageModal = true;
  }

  saveLogUsage(): void {
    if (!this.logUsageForm.feed_item_id || !this.logUsageForm.quantity || this.logUsageForm.quantity <= 0) {
      this.showNotification('Please provide a valid feed item and quantity', 'error');
      return;
    }

    this.saving = true;
    this.api.post<any>('/feed/transactions', this.logUsageForm).subscribe({
      next: () => {
        this.saving = false;
        this.showLogUsageModal = false;
        const actionLabel = this.logUsageForm.type === 'issue' ? 'Usage logged' : 'Stock recorded';
        this.showNotification(`${actionLabel} successfully`, 'success');
        this.loadData();
        this.loadTransactions();
      },
      error: (err) => {
        this.saving = false;
        this.showNotification(err.error?.message || 'Failed to log feed transaction', 'error');
      }
    });
  }

  // ==================== EXPORT DATA ====================
  exportData(): void {
    const headers = [
      'Feed Code',
      'Name',
      'Feed Type',
      'Unit',
      'Storage Location',
      'Stock On Hand',
      'Daily Usage',
      'Days of Cover',
      'Reorder Level',
      'Unit Cost',
      'Total Value',
      'Stock Status',
      'Status'
    ];

    const rows = this.filteredFeedItems.map((item) => [
      `"${item.item_id}"`,
      `"${item.name}"`,
      `"${item.feed_type}"`,
      `"${item.unit}"`,
      `"${item.storage_location}"`,
      item.quantity_on_hand,
      item.daily_consumption,
      item.days_remaining ?? 'N/A',
      item.reorder_level,
      item.average_cost,
      item.total_value,
      `"${item.stock_status}"`,
      `"${item.status}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `feed_inventory_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.showNotification('Feed catalog exported to CSV', 'success');
  }

  // ==================== BADGE CLASSES ====================
  getStockStatusClass(status: string): string {
    switch (status) {
      case 'adequate':
        return 'status-ok';
      case 'low_stock':
        return 'status-warning';
      case 'critical':
      case 'out_of_stock':
        return 'status-danger';
      default:
        return 'status-neutral';
    }
  }

  getStockStatusLabel(status: string): string {
    switch (status) {
      case 'adequate':
        return 'Adequate';
      case 'low_stock':
        return 'Low Stock';
      case 'critical':
        return 'Critical';
      case 'out_of_stock':
        return 'Out of Stock';
      default:
        return status;
    }
  }

  getDaysCoverClass(days: number | null): string {
    if (days === null) return 'days-neutral';
    if (days > 14) return 'days-ok';
    if (days >= 7) return 'days-warning';
    return 'days-critical';
  }

  showNotification(message: string, type: 'success' | 'error'): void {
    this.notification = { message, type };
    setTimeout(() => {
      if (this.notification?.message === message) {
        this.notification = null;
      }
    }, 4000);
  }

  closeNotification(): void {
    this.notification = null;
  }
}
