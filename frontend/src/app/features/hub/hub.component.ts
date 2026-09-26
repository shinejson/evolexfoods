import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-hub',
  standalone: true,
  imports: [NgFor, NgIf, FormsModule],
  templateUrl: './hub.component.html'
})
export class HubComponent implements OnInit {
  hub: any = { quick_actions: [], sections: [] };
  formType = '';
  message = '';
  form: any = {};

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit(): void {
    this.api.get<any>('/hub').subscribe((data) => this.hub = data);
  }

  go(action: any): void {
    const map: Record<string, string> = {
      birth: 'birth',
      death: 'death',
      sick: 'sick',
      treatment: 'treatment',
      purchase: 'purchase'
    };
    if (map[action.id]) {
      this.formType = map[action.id];
      this.form = {};
      this.message = '';
      return;
    }
    this.router.navigateByUrl(action.route);
  }

  submit(): void {
    const routes: Record<string, string> = {
      birth: '/livestock/events/birth',
      death: '/livestock/events/death',
      sick: '/livestock/events/sick',
      treatment: '/livestock/events/treatment',
      purchase: '/procurement/requests'
    };
    this.api.post(routes[this.formType], this.form).subscribe({
      next: () => {
        this.message = 'Record saved into Evolex Hub.';
        this.formType = '';
      },
      error: () => this.message = 'Could not save this record. Check required fields.'
    });
  }
}
