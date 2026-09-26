import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NgFor, NgIf } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, NgIf, NgFor],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  email = 'owner@evolex.com';
  password = 'password';
  error = '';
  loading = false;

  accounts = [
    'owner@evolex.com',
    'executive@evolex.com',
    'ops@evolex.com',
    'farm@evolex.com',
    'finance@evolex.com',
    'marketing@evolex.com',
    'sales@evolex.com'
  ];

  constructor(private auth: AuthService, private router: Router) {}

  submit(): void {
    this.loading = true;
    this.error = '';
    this.auth.login(this.email, this.password).subscribe({
      next: () => this.router.navigate(['/ceo']),
      error: () => {
        this.error = 'Unable to sign in with those credentials.';
        this.loading = false;
      }
    });
  }
}
