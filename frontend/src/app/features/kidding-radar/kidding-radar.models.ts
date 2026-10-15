/**
 * Types for the Expected Kidding / Gestation Horizon Radar (manual §39).
 *
 * Data comes from GET /api/v1/livestock/gestation-radar — every active
 * pregnancy placed on a 7 / 30 / 60 / 90-day horizon, with the expected birth
 * date recorded on the pregnancy or calculated from the breeding date at
 * 150 days' gestation for goats and sheep (283 for cattle).
 */

export type RadarBucketKey = 'overdue' | '7' | '30' | '60' | '90' | 'beyond';

export interface RadarEntry {
  pregnancy_id: number | null;
  animal_id: number;
  animal_code: string;
  species: string | null;
  breed: string | null;
  location: string | null;
  location_id: number | null;
  sire_code: string | null;
  confirmed_date: string | null;
  breeding_date: string | null;
  expected_birth_date: string | null;
  expected_birth_date_source: string | null;
  record_source: string | null;
  gestation_days: number;
  days_to_due: number | null;
  bucket: RadarBucketKey;
  horizon: number | null;
  gestation_progress: number;
  gestation_percent: number;
  stage: string;
  attention: boolean;
}

export interface RadarHorizon {
  days: number;
  label: string;
  /** Cumulative count due on or before this horizon. */
  count: number;
  animal_codes: string[];
}

export interface RadarBucket {
  key: RadarBucketKey;
  label: string;
  /** Buckets partition the herd — counts never double-count an animal. */
  exclusive: boolean;
  count: number;
  entries: RadarEntry[];
}

export interface GestationRadar {
  generated_at: string;
  today: string;
  gestation_days: Record<string, number>;
  total_active: number;
  overdue: number;
  horizons: RadarHorizon[];
  buckets: RadarBucket[];
  entries: RadarEntry[];
  source: string;
}
