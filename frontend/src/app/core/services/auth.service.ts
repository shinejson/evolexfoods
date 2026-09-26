import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, tap } from 'rxjs';
import { User } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private userSubject = new BehaviorSubject<User | null>(this.readUser());
  user$ = this.userSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {}

  get token(): string | null {
    return localStorage.getItem('evolex_token');
  }

  get user(): User | null {
    return this.userSubject.value;
  }

  login(email: string, password: string) {
    return this.http.post<{ token: string; user: User }>('/api/v1/auth/login', { email, password }).pipe(
      tap((res) => {
        localStorage.setItem('evolex_token', res.token);
        localStorage.setItem('evolex_user', JSON.stringify(res.user));
        this.userSubject.next(res.user);
      })
    );
  }

  logout(): void {
    localStorage.removeItem('evolex_token');
    localStorage.removeItem('evolex_user');
    this.userSubject.next(null);
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    return !!this.token;
  }

  private readUser(): User | null {
    const raw = localStorage.getItem('evolex_user');
    return raw ? JSON.parse(raw) : null;
  }
}
