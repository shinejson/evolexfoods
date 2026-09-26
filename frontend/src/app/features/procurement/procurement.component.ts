import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-procurement',
  standalone: true,
  imports: [NgFor, NgIf],
  templateUrl: './procurement.component.html'
})
export class ProcurementComponent implements OnInit {
  requests: any = { records: [] };
  purchases: any = { purchase_orders: [], goods_receipts: [] };
  selected: any = null;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.get<any>('/procurement/requests').subscribe((d) => this.requests = d);
    this.api.get<any>('/procurement/purchases').subscribe((d) => this.purchases = d);
  }

  showApprovals(id: number): void {
    this.api.get<any>(`/procurement/requests/${id}/approvals`).subscribe((d) => this.selected = d);
  }
}
