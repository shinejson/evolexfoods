import { Component, OnInit } from '@angular/core';
import { NgFor } from '@angular/common';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-feed',
  standalone: true,
  imports: [NgFor],
  templateUrl: './feed.component.html'
})
export class FeedComponent implements OnInit {
  summary: any = { items: [] };
  days: any = {};

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.get<any>('/feed/summary').subscribe((d) => this.summary = d);
    this.api.get<any>('/feed/days-remaining').subscribe((d) => this.days = d);
  }
}
