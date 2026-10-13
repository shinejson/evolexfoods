import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';

export interface Animal {
  id: number;
  animal_id: string;
  tag_id?: string;
  tag_number?: string;
  species: string;
  breed?: string;
  sex: string;
  dob?: string;
  age?: number | string;
  location?: { id?: number; name: string; code?: string };
  location_id?: number;
  weight?: number;
  cost?: number;
  source?: string;
  health_status: string;
  status: string;
  current_status?: string;
  pregnancy_status?: string;
  breeding_status?: string;
  notes?: string;
}

export interface Filters {
  search: string;
  species: string;
  sex: string;
  location: string;
  health_status: string;
  status: string;
}

@Component({
  selector: 'app-livestock',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './livestock.component.html',
  styleUrls: ['./livestock.component.scss']
})
export class LivestockComponent implements OnInit {
  summary: any = { by_location: [], by_species: [], by_age: {} };
  births: any = { count: 0 };
  deaths: any = { count: 0 };
  growth: any = { herd_growth: 0, herd_growth_rate: 0 };
  mortality: any = { mortality_rate: 0 };
  animals: Animal[] = [];
  
  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalRecords = 0;
  totalPages = 0;
  paginatedAnimals: Animal[] = [];
  Math = Math; // Expose Math to template
  
  filters: Filters = {
    search: '',
    species: '',
    sex: '',
    location: '',
    health_status: '',
    status: ''
  };

  showFilters = false;
  selectedAnimals = new Set<number>();
  
  // Filter options
  speciesOptions = ['Goat', 'Sheep', 'Cattle', 'Chicken', 'Pig'];
  sexOptions = ['Male', 'Female'];
  locationOptions: string[] = [];
  healthStatusOptions = ['Healthy', 'Sick', 'Quarantine', 'Under Treatment'];
  statusOptions = ['Active', 'Alive', 'Dead', 'Sold', 'Transferred'];
  locationsList: { id: number; name: string; code?: string }[] = [];

  // Modals
  showModal = false;
  isEditing = false;
  modalAnimal: Partial<Animal> = {};
  showViewModal = false;
  viewingAnimal: Animal | null = null;

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit(): void {
    this.load();
    this.loadLocations();
  }

  load(): void {
    this.api.get<any>('/livestock/summary').subscribe((d) => {
      this.summary = d;
      if (d.by_location && d.by_location.length > 0) {
        this.locationOptions = d.by_location.map((l: any) => l.location);
      }
    });
    this.api.get<any>('/livestock/births').subscribe((d) => this.births = d || { count: 0 });
    this.api.get<any>('/livestock/deaths').subscribe((d) => this.deaths = d || { count: 0 });
    this.api.get<any>('/livestock/growth').subscribe((d) => this.growth = d || { herd_growth: 0, herd_growth_rate: 0 });
    this.api.get<any>('/livestock/mortality-rate').subscribe((d) => this.mortality = d || { mortality_rate: 0 });
    this.search();
  }

  loadLocations(): void {
    this.api.get<any>('/locations').subscribe((locs) => {
      if (Array.isArray(locs)) {
        this.locationsList = locs;
        if (this.locationOptions.length === 0) {
          this.locationOptions = locs.map((l: any) => l.name);
        }
      }
    });
  }

  search(): void {
    const params: any = {};
    if (this.filters.search) params.q = this.filters.search;
    if (this.filters.species) params.species = this.filters.species;
    if (this.filters.sex) params.sex = this.filters.sex;
    if (this.filters.location) params.location = this.filters.location;
    if (this.filters.health_status) params.health_status = this.filters.health_status;
    if (this.filters.status) params.status = this.filters.status;

    this.api.get<any>('/livestock', params).subscribe((d) => {
      this.animals = d.data || d || [];
      this.totalRecords = this.animals.length;
      this.totalPages = Math.ceil(this.totalRecords / this.pageSize);
      this.currentPage = 1; // Reset to first page on new search
      this.updatePaginatedData();
    });
  }

  updatePaginatedData(): void {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedAnimals = this.animals.slice(startIndex, endIndex);
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePaginatedData();
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePaginatedData();
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePaginatedData();
    }
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(this.totalPages, startPage + maxVisible - 1);

    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  }

  clearFilters(): void {
    this.filters = {
      search: '',
      species: '',
      sex: '',
      location: '',
      health_status: '',
      status: ''
    };
    this.search();
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  hasActiveFilters(): boolean {
    return !!(this.filters.species || this.filters.sex || this.filters.location || 
              this.filters.health_status || this.filters.status);
  }

  toggleSelectAll(event: any): void {
    if (event.target.checked) {
      this.paginatedAnimals.forEach(a => this.selectedAnimals.add(a.id));
    } else {
      this.selectedAnimals.clear();
    }
  }

  toggleSelect(id: number): void {
    if (this.selectedAnimals.has(id)) {
      this.selectedAnimals.delete(id);
    } else {
      this.selectedAnimals.add(id);
    }
  }

  isSelected(id: number): boolean {
    return this.selectedAnimals.has(id);
  }

  viewAnimal(animal: Animal): void {
    this.viewingAnimal = animal;
    this.showViewModal = true;
  }

  closeViewModal(): void {
    this.showViewModal = false;
    this.viewingAnimal = null;
  }

  addNew(): void {
    this.isEditing = false;
    this.modalAnimal = {
      species: 'goat',
      sex: 'female',
      health_status: 'healthy',
      status: 'alive',
      current_status: 'active',
      location_id: this.locationsList[0]?.id
    };
    this.showModal = true;
  }

  editAnimal(animal: Animal): void {
    this.isEditing = true;
    this.modalAnimal = {
      id: animal.id,
      animal_id: animal.animal_id,
      tag_id: animal.tag_id || animal.tag_number,
      species: (animal.species || '').toLowerCase(),
      breed: animal.breed,
      sex: (animal.sex || '').toLowerCase(),
      dob: animal.dob ? animal.dob.split('T')[0] : '',
      location_id: animal.location?.id || animal.location_id,
      weight: animal.weight,
      health_status: (animal.health_status || 'healthy').toLowerCase(),
      status: (animal.status || 'alive').toLowerCase(),
      notes: animal.notes
    };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.modalAnimal = {};
  }

  saveAnimal(): void {
    if (this.isEditing && this.modalAnimal.id) {
      this.api.put(`/livestock/${this.modalAnimal.id}`, this.modalAnimal).subscribe({
        next: () => {
          this.closeModal();
          this.load();
        },
        error: (err) => alert(err.error?.message || 'Error updating animal')
      });
    } else {
      this.api.post('/livestock', this.modalAnimal).subscribe({
        next: () => {
          this.closeModal();
          this.load();
        },
        error: (err) => alert(err.error?.message || 'Error adding animal')
      });
    }
  }

  deleteAnimal(animal: Animal): void {
    if (confirm(`Are you sure you want to delete ${animal.animal_id}?`)) {
      this.api.delete(`/livestock/${animal.id}`).subscribe({
        next: () => {
          this.selectedAnimals.delete(animal.id);
          this.load();
        },
        error: (err) => alert(err.error?.message || 'Error deleting animal')
      });
    }
  }

  exportData(): void {
    const exportList = this.selectedAnimals.size > 0 
      ? this.animals.filter(a => this.selectedAnimals.has(a.id))
      : this.animals;

    if (!exportList || exportList.length === 0) {
      alert('No animals to export');
      return;
    }

    const headers = ['Animal ID', 'Tag ID', 'Species', 'Breed', 'Sex', 'Location', 'Health', 'Status', 'Weight', 'DOB'];
    const rows = exportList.map(a => [
      `"${a.animal_id || ''}"`,
      `"${a.tag_id || a.tag_number || ''}"`,
      `"${a.species || ''}"`,
      `"${a.breed || ''}"`,
      `"${a.sex || ''}"`,
      `"${a.location?.name || ''}"`,
      `"${a.health_status || ''}"`,
      `"${a.status || a.current_status || ''}"`,
      `"${a.weight || ''}"`,
      `"${a.dob || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `livestock_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  bulkAction(action: string): void {
    if (this.selectedAnimals.size === 0) {
      alert('Please select at least one animal');
      return;
    }

    if (action === 'delete') {
      if (confirm(`Delete ${this.selectedAnimals.size} selected animals?`)) {
        const ids = Array.from(this.selectedAnimals);
        let completed = 0;
        ids.forEach(id => {
          this.api.delete(`/livestock/${id}`).subscribe({
            next: () => {
              completed++;
              if (completed === ids.length) {
                this.selectedAnimals.clear();
                this.load();
              }
            },
            error: () => {
              completed++;
              if (completed === ids.length) {
                this.selectedAnimals.clear();
                this.load();
              }
            }
          });
        });
      }
    }
  }

  calculateAge(dob?: string): string {
    if (!dob) return 'N/A';
    const birth = new Date(dob);
    const now = new Date();
    const diffMonths = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
    if (isNaN(diffMonths) || diffMonths < 0) return 'N/A';
    if (diffMonths < 12) return `${diffMonths}m`;
    const years = Math.floor(diffMonths / 12);
    const remMonths = diffMonths % 12;
    return remMonths > 0 ? `${years}y ${remMonths}m` : `${years}y`;
  }

  getHealthBadgeClass(status?: string): string {
    if (!status) return 'healthy';
    return status.toLowerCase().replace(/\s+/g, '-');
  }

  getStatusBadgeClass(status?: string): string {
    if (!status) return 'active';
    return status.toLowerCase().replace(/\s+/g, '-');
  }
}
