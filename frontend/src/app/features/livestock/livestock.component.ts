import { Component, OnInit } from '@angular/core';
import { NgFor } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-livestock',
  standalone: true,
  imports: [NgFor, FormsModule],
  templateUrl: './livestock.component.html'
})
export class LivestockComponent implements OnInit {
  summary: any = {};
  births: any = {};
  deaths: any = {};
  growth: any = {};
  mortality: any = {};
  animals: any[] = [];
  q = '';

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.api.get<any>('/livestock/summary').subscribe((d) => this.summary = d);
    this.api.get<any>('/livestock/births').subscribe((d) => this.births = d);
    this.api.get<any>('/livestock/deaths').subscribe((d) => this.deaths = d);
    this.api.get<any>('/livestock/growth').subscribe((d) => this.growth = d);
    this.api.get<any>('/livestock/mortality-rate').subscribe((d) => this.mortality = d);
    this.search();
  }

  search(): void {
    this.api.get<any>('/livestock', { q: this.q }).subscribe((d) => this.animals = d.data || d);
  }
}
