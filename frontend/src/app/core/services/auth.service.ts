import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { User } from '../models/user.model';

export interface LoginResponse {
  token?: string;
  user?: User;
  requires_2fa?: boolean;
  two_factor_type?: string;
  email?: string;
  message?: string;
  device_token?: string;
}

export interface TwoFactorSetupResponse {
  secret: string;
  formatted_secret: string;
  qr_uri: string;
  recovery_codes: string[];
  two_factor_enabled: boolean;
  two_factor_type?: string;
  confirmed_at?: string;
}

export interface TwoFactorActivateResponse {
  success: boolean;
  message: string;
  user: User;
  recovery_codes?: string[];
}

export type TwoFaMethod = 'totp' | 'email' | 'whatsapp';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private userSubject = new BehaviorSubject<User | null>(this.readUser());
  user$ = this.userSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {}

  get token(): string | null {
    return localStorage.getItem('evolex_token');
  }

  get deviceToken(): string | null {
    return localStorage.getItem('evolex_device_token');
  }

  get user(): User | null {
    return this.userSubject.value;
  }

  login(
    email: string,
    password: string,
    code?: string,
    rememberDevice?: boolean,
    deviceToken?: string
  ): Observable<LoginResponse> {
    const payload: Record<string, unknown> = { email, password };
    if (code) payload['code'] = code;
    if (rememberDevice !== undefined) payload['remember_device'] = rememberDevice;
    if (deviceToken) payload['device_token'] = deviceToken;

    return this.http.post<LoginResponse>('/api/v1/auth/login', payload).pipe(
      tap((res) => {
        if (res.token && res.user) {
          localStorage.setItem('evolex_token', res.token);
          localStorage.setItem('evolex_user', JSON.stringify(res.user));
          this.userSubject.next(res.user);
          // Persist device token so future logins skip 2FA for 30 days
          if (res.device_token) {
            localStorage.setItem('evolex_device_token', res.device_token);
          }
        }
      })
    );
  }

  setup2fa(): Observable<TwoFactorSetupResponse> {
    return this.http.get<TwoFactorSetupResponse>('/api/v1/auth/2fa/setup');
  }

  sendOtp(method: 'email' | 'whatsapp'): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(
      '/api/v1/auth/2fa/send-otp',
      { method }
    );
  }

  activate2fa(
    code: string,
    method: TwoFaMethod = 'totp'
  ): Observable<TwoFactorActivateResponse> {
    return this.http
      .post<TwoFactorActivateResponse>('/api/v1/auth/2fa/activate', { code, method })
      .pipe(
        tap((res) => {
          if (res.user) this.refreshUser(res.user);
        })
      );
  }

  deactivate2fa(password: string): Observable<{ success: boolean; message: string; user: User }> {
    return this.http
      .post<{ success: boolean; message: string; user: User }>(
        '/api/v1/auth/2fa/deactivate',
        { password }
      )
      .pipe(
        tap((res) => {
          if (res.user) this.refreshUser(res.user);
        })
      );
  }

  refreshUser(user: User): void {
    localStorage.setItem('evolex_user', JSON.stringify(user));
    this.userSubject.next(user);
  }

  logout(): void {
    const token = this.token;

    // Clear the local session immediately so an expired session cannot make
    // further authenticated requests while the revoke request is in flight.
    localStorage.removeItem('evolex_token');
    localStorage.removeItem('evolex_user');
    // Intentionally keep device token — so the user stays trusted for 30 days
    this.userSubject.next(null);

    // Revoke the Sanctum token as a best-effort server-side cleanup. The
    // explicit header is needed because the token was removed above.
    if (token) {
      this.http.post('/api/v1/auth/logout', {}, {
        headers: new HttpHeaders({
          Accept: 'application/json',
          Authorization: `Bearer ${token}`
        })
      }).subscribe({ error: () => undefined });
    }

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
