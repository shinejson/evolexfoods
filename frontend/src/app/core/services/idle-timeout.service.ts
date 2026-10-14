import { DOCUMENT } from '@angular/common';
import { Inject, Injectable, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthService } from './auth.service';

/** Ten minutes without a user interaction ends the authenticated session. */
export const IDLE_TIMEOUT_MS = 10 * 60 * 1000;
export const LAST_ACTIVITY_STORAGE_KEY = 'evolex_last_activity';

const AUTH_TOKEN_STORAGE_KEY = 'evolex_token';
const ACTIVITY_WRITE_INTERVAL_MS = 1000;

@Injectable({ providedIn: 'root' })
export class IdleTimeoutService implements OnDestroy {
  private readonly activityEvents = [
    'mousedown',
    'mousemove',
    'keydown',
    'touchstart',
    'scroll',
    'wheel',
    'pointerdown'
  ];

  private timer: ReturnType<typeof setTimeout> | null = null;
  private lastActivityAt = 0;
  private lastActivityWrittenAt = 0;
  private monitoring = false;
  private readonly authSubscription: Subscription;

  private readonly onActivity = (): void => {
    this.recordActivity();
  };

  private readonly onVisibilityChange = (): void => {
    // Returning to the app after a long time must not revive an expired session.
    if (this.document.visibilityState === 'visible') {
      this.recordActivity();
    }
  };

  private readonly onStorageChange = (event: StorageEvent): void => {
    if (event.key === AUTH_TOKEN_STORAGE_KEY && !event.newValue) {
      // A logout in another tab should log this tab out as well.
      this.auth.logout();
      return;
    }

    if (event.key !== LAST_ACTIVITY_STORAGE_KEY || !event.newValue || !this.monitoring) {
      return;
    }

    const activityAt = this.parseTimestamp(event.newValue);
    if (activityAt === null || activityAt <= this.lastActivityAt || activityAt > Date.now()) {
      return;
    }

    this.lastActivityAt = activityAt;
    this.scheduleLogout();
  };

  constructor(
    @Inject(DOCUMENT) private readonly document: Document,
    private readonly auth: AuthService
  ) {
    this.authSubscription = this.auth.user$.subscribe(() => {
      if (this.auth.isLoggedIn()) {
        this.start();
      } else {
        this.stop();
      }
    });
  }

  /** Starts monitoring when an access token is present. Safe to call repeatedly. */
  start(): void {
    if (!this.auth.isLoggedIn()) {
      return;
    }

    if (!this.monitoring) {
      this.monitoring = true;
      this.addEventListeners();

      const now = Date.now();
      const storedActivityAt = this.readStoredActivity();
      this.lastActivityAt = storedActivityAt && storedActivityAt <= now ? storedActivityAt : now;
      this.lastActivityWrittenAt = storedActivityAt ?? 0;

      if (!storedActivityAt || storedActivityAt > now) {
        this.persistActivity(now);
      }
    }

    this.scheduleLogout();
  }

  /** Stops monitoring and clears the persisted timestamp for the logged-out session. */
  stop(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.monitoring) {
      this.removeEventListeners();
    }

    this.monitoring = false;
    this.lastActivityAt = 0;
    this.lastActivityWrittenAt = 0;
    this.storage()?.removeItem(LAST_ACTIVITY_STORAGE_KEY);
  }

  ngOnDestroy(): void {
    this.authSubscription.unsubscribe();
    this.stop();
  }

  private recordActivity(): void {
    if (!this.monitoring || !this.auth.isLoggedIn()) {
      return;
    }

    const now = Date.now();
    if (this.lastActivityAt > 0 && now - this.lastActivityAt >= IDLE_TIMEOUT_MS) {
      this.expireSession();
      return;
    }

    this.lastActivityAt = now;
    if (now - this.lastActivityWrittenAt >= ACTIVITY_WRITE_INTERVAL_MS) {
      this.persistActivity(now);
    }
    this.scheduleLogout();
  }

  private scheduleLogout(): void {
    if (!this.monitoring) {
      return;
    }

    if (this.timer !== null) {
      clearTimeout(this.timer);
    }

    const elapsed = Date.now() - this.lastActivityAt;
    const remaining = IDLE_TIMEOUT_MS - elapsed;

    if (remaining <= 0) {
      this.expireSession();
      return;
    }

    this.timer = setTimeout(() => {
      this.timer = null;
      const idleFor = Date.now() - this.lastActivityAt;
      if (idleFor >= IDLE_TIMEOUT_MS) {
        this.expireSession();
      } else {
        // Timers can fire early on some browsers; schedule the small remainder.
        this.scheduleLogout();
      }
    }, remaining);
  }

  private expireSession(): void {
    if (!this.monitoring) {
      return;
    }

    this.stop();
    this.auth.logout();
  }

  private addEventListeners(): void {
    this.activityEvents.forEach((eventName) => {
      // Capture scroll/focus-like activity anywhere in the document.
      this.document.addEventListener(eventName, this.onActivity, true);
    });
    this.document.addEventListener('visibilitychange', this.onVisibilityChange);
    this.document.defaultView?.addEventListener('focus', this.onActivity);
    this.document.defaultView?.addEventListener('storage', this.onStorageChange);
  }

  private removeEventListeners(): void {
    this.activityEvents.forEach((eventName) => {
      this.document.removeEventListener(eventName, this.onActivity, true);
    });
    this.document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.document.defaultView?.removeEventListener('focus', this.onActivity);
    this.document.defaultView?.removeEventListener('storage', this.onStorageChange);
  }

  private readStoredActivity(): number | null {
    const raw = this.storage()?.getItem(LAST_ACTIVITY_STORAGE_KEY);
    return raw ? this.parseTimestamp(raw) : null;
  }

  private parseTimestamp(raw: string): number | null {
    const value = Number(raw);
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  private persistActivity(activityAt: number): void {
    this.storage()?.setItem(LAST_ACTIVITY_STORAGE_KEY, String(activityAt));
    this.lastActivityWrittenAt = activityAt;
  }

  private storage(): Storage | null {
    try {
      return this.document.defaultView?.localStorage ?? null;
    } catch {
      // Storage can be unavailable in private browsing or restricted web views.
      return null;
    }
  }
}
