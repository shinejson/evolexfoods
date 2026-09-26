import { Component, OnInit } from '@angular/core';
import { NgFor } from '@angular/common';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [NgFor],
  templateUrl: './inventory.component.html'
})
export class InventoryComponent implements OnInit {
  items: any[] = [];
  low: any = { items: [] };
  medicines: any = { items: [], expiring: [] };

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.get<any[]>('/inventory').subscribe((d) => this.items = d);
    this.api.get<any>('/inventory/low-stock').subscribe((d) => this.low = d);
    this.api.get<any>('/inventory/medicines').subscribe((d) => this.medicines = d);
  }
}
