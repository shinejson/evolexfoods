/**
 * Pure helpers behind the Expected Kidding / Gestation Horizon Radar (§39).
 *
 * The API already calculates due dates, so most of this module is defensive
 * normalisation: any entry missing a server-computed `days_to_due`, bucket or
 * progress is recomputed locally from its expected birth date, so the radar
 * stays correct against older payloads. Nothing here touches Angular or the
 * DOM — see kidding-radar.insights.spec.ts.
 */

import { GestationRadar, RadarBucket, RadarBucketKey, RadarEntry, RadarHorizon } from './kidding-radar.models';

/** Gestation length in days by species — 150 for goats/sheep, 283 cattle. */
export const GESTATION_DAYS: Record<string, number> = { goat: 150, sheep: 150, cattle: 283 };
export const DEFAULT_GESTATION_DAYS = 150;
export const HORIZONS = [7, 30, 60, 90];

export const BUCKET_ORDER: RadarBucketKey[] = ['overdue', '7', '30', '60', '90', 'beyond'];

export const BUCKET_LABELS: Record<RadarBucketKey, string> = {
  overdue: 'Overdue',
  '7': 'Next 7 days',
  '30': 'Next 30 days',
  '60': 'Next 60 days',
  '90': 'Next 90 days',
  beyond: 'Beyond 90 days'
};

export function gestationDaysFor(species: string | null | undefined): number {
  return GESTATION_DAYS[String(species ?? '').toLowerCase()] ?? DEFAULT_GESTATION_DAYS;
}

/** Parse an ISO date (Y-m-d or full timestamp) to a UTC-midnight timestamp. */
export function parseDay(iso: string | null | undefined): number | null {
  if (!iso) {
    return null;
  }
  const day = String(iso).slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match) {
    return null;
  }
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function toIsoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Whole days from `todayIso` until `dueIso` — negative when overdue. */
export function daysToDue(dueIso: string | null | undefined, todayIso: string): number | null {
  const due = parseDay(dueIso);
  const today = parseDay(todayIso);
  if (due === null || today === null) {
    return null;
  }
  return Math.round((due - today) / 86_400_000);
}

export function bucketFor(days: number | null): RadarBucketKey {
  if (days === null || Number.isNaN(days)) {
    return 'beyond';
  }
  if (days < 0) return 'overdue';
  if (days <= 7) return '7';
  if (days <= 30) return '30';
  if (days <= 60) return '60';
  if (days <= 90) return '90';
  return 'beyond';
}

export function stageFor(progress: number): 'early' | 'mid' | 'late' {
  if (progress >= 0.8) return 'late';
  if (progress >= 0.5) return 'mid';
  return 'early';
}

/** Normalise one API entry, recomputing any missing radar fields locally. */
export function normaliseEntry(raw: RadarEntry, todayIso: string): RadarEntry {
  const gestationDays = raw.gestation_days && raw.gestation_days > 0 ? raw.gestation_days : gestationDaysFor(raw.species);
  const days = raw.days_to_due ?? daysToDue(raw.expected_birth_date, todayIso);
  const progress =
    typeof raw.gestation_progress === 'number' && raw.gestation_progress > 0
      ? Math.max(0, Math.min(1, raw.gestation_progress))
      : days === null
        ? 0
        : Math.max(0, Math.min(1, (gestationDays - days) / gestationDays));

  return {
    ...raw,
    gestation_days: gestationDays,
    days_to_due: days,
    bucket: bucketFor(days),
    horizon: days !== null && days >= 0 ? (HORIZONS.find((h) => days <= h) ?? null) : null,
    gestation_progress: progress,
    gestation_percent: Math.round(progress * 100),
    stage: raw.stage || stageFor(progress),
    attention: days !== null && days < 0,
    expected_birth_date_source: raw.expected_birth_date_source ?? (raw.expected_birth_date ? 'recorded' : 'unknown')
  };
}

export interface RadarView {
  today: string;
  totalActive: number;
  overdue: number;
  /** Cumulative horizon cards: due within N days (overdue excluded). */
  horizons: RadarHorizon[];
  /** Exclusive buckets partitioning every entry exactly once. */
  buckets: RadarBucket[];
  /** All entries, nearest due first; unknown due dates last. */
  entries: RadarEntry[];
  /** Due-date span for the visual horizon track, in days. */
  trackDays: number;
  nextDue: RadarEntry | null;
}

export function buildRadarView(payload: GestationRadar, todayIso: string = toIsoDay(new Date())): RadarView {
  const today = payload?.today || todayIso;
  const rawEntries = Array.isArray(payload?.entries) ? payload.entries : [];
  const entries = rawEntries
    .map((entry) => normaliseEntry(entry, today))
    .sort((a, b) => (a.days_to_due ?? Number.MAX_SAFE_INTEGER) - (b.days_to_due ?? Number.MAX_SAFE_INTEGER));

  const buckets: RadarBucket[] = BUCKET_ORDER.map((key) => {
    const rows = entries.filter((entry) => entry.bucket === key);
    return { key, label: BUCKET_LABELS[key], exclusive: true, count: rows.length, entries: rows };
  });

  const horizons: RadarHorizon[] = HORIZONS.map((days) => {
    const rows = entries.filter((entry) => entry.days_to_due !== null && entry.days_to_due >= 0 && entry.days_to_due <= days);
    return { days, label: `Next ${days} days`, count: rows.length, animal_codes: rows.map((entry) => entry.animal_code) };
  });

  return {
    today,
    totalActive: entries.length,
    overdue: entries.filter((entry) => entry.bucket === 'overdue').length,
    horizons,
    buckets,
    entries,
    // The horizon track always spans a little past the furthest due date.
    trackDays: Math.max(90, ...entries.map((entry) => Math.max(0, entry.days_to_due ?? 0))) + 7,
    nextDue: entries.find((entry) => entry.days_to_due !== null && entry.days_to_due >= 0) ?? entries[0] ?? null
  };
}

/** Left offset (0–100%) of an entry on the horizon track. */
export function trackPosition(entry: RadarEntry, view: RadarView): number {
  if (entry.days_to_due === null) {
    return 100;
  }
  if (entry.days_to_due < 0) {
    return 0;
  }
  return Math.max(0, Math.min(100, (entry.days_to_due / view.trackDays) * 100));
}

export function dueLabel(entry: RadarEntry): string {
  if (entry.days_to_due === null) {
    return 'Due date unknown';
  }
  if (entry.days_to_due < 0) {
    return `${Math.abs(entry.days_to_due)}d overdue`;
  }
  if (entry.days_to_due === 0) {
    return 'Due today';
  }
  return `In ${entry.days_to_due}d`;
}

export function formatDate(iso: string | null | undefined): string {
  const ts = parseDay(iso);
  if (ts === null) {
    return '—';
  }
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(ts));
}

export function sourceLabel(source: string | null | undefined): string {
  switch (source) {
    case 'recorded':
      return 'Recorded due date';
    case 'calculated_from_breeding':
      return 'Calculated from breeding date';
    case 'calculated_from_confirmation':
      return 'Calculated from confirmation';
    case 'animal_record':
      return 'From Livestock Master';
    default:
      return 'Due date unknown';
  }
}
