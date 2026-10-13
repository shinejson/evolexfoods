/**
 * Types for the Animal Health workspace.
 *
 * Data comes from three real endpoints (see backend/routes/api.php):
 *   GET /api/v1/records/health      → { data: HealthRecord[] }  (with animal)
 *   GET /api/v1/records/treatments  → { data: Treatment[] }     (with animal)
 *   GET /api/v1/lookups             → locations, animals, ...
 */

export interface LocationRef {
  id: number;
  name: string;
  code?: string;
}

export interface AnimalRef {
  id: number;
  animal_id: string;
  species?: string;
  sex?: string;
  status?: string;
  location_id?: number | null;
  location?: LocationRef | null;
}

export interface HealthRecord {
  id: number;
  animal_id: number;
  recorded_date: string;
  condition: string;
  severity: string | null;
  status: string | null;
  notes?: string | null;
  recorded_by?: number | null;
  animal?: AnimalRef | null;
}

export interface Treatment {
  id: number;
  animal_id: number;
  health_record_id?: number | null;
  start_date: string;
  end_date?: string | null;
  treatment_type: string;
  medicine?: string | null;
  dosage?: string | null;
  status: string | null;
  notes?: string | null;
  animal?: AnimalRef | null;
}

export interface Lookups {
  locations: LocationRef[];
  animals: AnimalRef[];
}

export type HealthTab = 'cases' | 'treatments';

/** Normalised row so one table, one filter engine and one toolbar serve both tabs. */
export interface HealthRow {
  id: number;
  tab: HealthTab;
  animalId: number;
  animalCode: string;
  species: string;
  locationId: number | null;
  locationName: string;
  /** Condition for cases, treatment type for treatments. */
  title: string;
  /** Medicine · dosage for treatments, empty for cases. */
  subtitle: string;
  severity: string | null;
  status: string;
  date: string;
  /** Days since the record date (or since it opened, for open cases). */
  ageDays: number;
  isOpen: boolean;
  notes: string | null;
  raw: HealthRecord | Treatment;
}

export interface HealthFilters {
  search: string;
  status: string;
  severity: string[];
  condition: string;
  locationId: number | null;
  from: string;
  to: string;
  ageingOnly: boolean;
}

export type SortDirection = 'asc' | 'desc';

export interface HealthSort {
  key: string;
  direction: SortDirection;
}

export type CellKind = 'animal' | 'text' | 'severity' | 'status' | 'date' | 'age' | 'medicine';

export interface HealthColumn {
  key: string;
  label: string;
  cell: CellKind;
  sortable: boolean;
  align?: 'left' | 'right';
  width?: string;
}

export type FacetKind = 'segmented' | 'chips' | 'select' | 'date-range' | 'toggle';

export interface FacetOption {
  value: string | number | boolean;
  label: string;
  count: number;
}

export interface FacetDef {
  key: 'status' | 'severity' | 'condition' | 'locationId' | 'range' | 'ageingOnly';
  label: string;
  kind: FacetKind;
  options: FacetOption[];
  hint: string;
}

/**
 * A KPI filter patch. `range` is a date-window preset (7/30/90 days) that the
 * toggle writes into `from`/`to` — it is not stored on the filter itself.
 */
export type HealthFilterPatch = Partial<HealthFilters> & { range?: string };

/** A KPI that doubles as a saved filter — click the tile to drill in. */
export interface HealthKpi {
  key: string;
  label: string;
  value: number;
  caption: string;
  tone: 'ok' | 'watch' | 'action' | 'neutral';
  filter: HealthFilterPatch;
  active: boolean;
}

export interface HealthTabDef {
  id: HealthTab;
  label: string;
  title: string;
  subtitle: string;
  endpoint: string;
  createLabel: string;
  columns: HealthColumn[];
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  pages: number;
  from: number;
  to: number;
}

export type DialogMode = 'create' | 'edit' | 'view' | 'delete';
