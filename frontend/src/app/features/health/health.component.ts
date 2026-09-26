import { Component, OnInit } from '@angular/core';
import { NgFor } from '@angular/common';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-health',
  standalone: true,
  imports: [NgFor],
  templateUrl: './health.component.html'
})
export class HealthComponent implements OnInit {
  sick: any = { records: [] };
  treatments: any = { records: [] };

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.get<any>('/livestock/health/sick').subscribe((d) => this.sick = d);
    this.api.get<any>('/livestock/health/treatments').subscribe((d) => this.treatments = d);
  }
}
