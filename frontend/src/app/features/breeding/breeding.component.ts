import { Component, OnInit } from '@angular/core';
import { NgFor } from '@angular/common';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-breeding',
  standalone: true,
  imports: [NgFor],
  templateUrl: './breeding.component.html'
})
export class BreedingComponent implements OnInit {
  data: any = { records: [], expected_births: {} };

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.get<any>('/livestock/pregnancies').subscribe((d) => this.data = d);
  }
}
