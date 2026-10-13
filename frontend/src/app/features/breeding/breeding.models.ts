/**
 * Types for the Breeding & Reproduction workspace.
 *
 * Data comes from the livestock API (see backend/routes/api.php):
 *   GET  /api/v1/livestock/pregnancies   → { records: PregnancyRecord[] }  (with animal.location)
 *   GET  /api/v1/livestock/births        → { records: BirthRecord[] }      (with animal, location)
 *   GET  /api/v1/records/breeding        → { data: BreedingRecord[] }      (with female, male)
 *   GET  /api/v1/lookups                 → locations, animals, …
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
  breed?: string;
  sex?: string;
  dob?: string;
  status?: string;
  location_id?: number | null;
  location?: LocationRef | null;
}

export interface BreedingRecord {
  id: number;
  female_id: number;
  male_id: number | null;
  breeding_date: string;
  method: string;
  status: string | null;
  notes?: string | null;
  female?: AnimalRef | null;
  male?: AnimalRef | null;
}

export interface PregnancyRecord {
  id: number;
  animal_id: number;
  breeding_id: number | null;
  confirmed_date: string;
  expected_birth_date: string;
  status: string | null;
  ended_at?: string | null;
  notes?: string | null;
  animal?: AnimalRef | null;
  breeding?: BreedingRecord | null;
}

export interface BirthRecord {
  id: number;
  animal_id: number;
  mother_animal_id?: string | null;
  father_animal_id?: string | null;
  birth_date: string;
  sex: string | null;
  birth_weight: number | string | null;
  location_id: number | null;
  status: string | null;
  notes?: string | null;
  animal?: AnimalRef | null;
  location?: LocationRef | null;
}

export interface Lookups {
  locations: LocationRef[];
  animals: AnimalRef[];
}

export type BreedingTab = 'pregnancies' | 'births' | 'cycles';

/** Which date a range filter (or a chart click) targets on the active tab. */
export type RangeField = 'due' | 'confirmed' | 'birth' | 'breeding';

export type GestationStage = 'early' | 'mid' | 'late';

export type Outcome = 'confirmed' | 'awaiting' | 'failed' | 'none';

/**
 * One normalised row so a single table, filter engine, sorter and pager can
 * serve pregnancies, births and breeding cycles.
 */
export interface BreedingRow {
  id: number;
  tab: BreedingTab;
  animalId: number | null;
  /** Dam for pregnancies, calf for births, female for cycles. */
  animalCode: string;
  species: string;
  breed: string;
  locationId: number | null;
  locationName: string;
  /** Sire for pregnancies/cycles, dam code for births. */
  counterparty: string;
  counterpartyLabel: string;
  /** Stage label, calf sex or breeding method — the tab's headline cell. */
  title: string;
  subtitle: string;
  status: string;
  sex: string;
  /** Primary date for the tab: confirmed / birth / breeding date. */
  date: string;
  /** Expected birth date (pregnancies and cycles), empty for births. */
  dueDate: string;
  /** Days since `date`. */
  ageDays: number;
  /** Days until the expected birth — negative when overdue; null when unknown. */
  daysToDue: number | null;
  gestationDays: number;
  gestationLength: number;
  /** 0–1 share of the gestation completed. */
  progress: number;
  stage: GestationStage | '';
  method: string;
  outcome: Outcome;
  weight: number | null;
  /** Needs a human look: overdue, low birth weight, failed service… */
  attention: boolean;
  notes: string | null;
  raw: PregnancyRecord | BirthRecord | BreedingRecord;
}

export interface BreedingFilters {
  search: string;
  /** Tab vocabulary: active/completed/failed (pregnancies) or planned/… (cycles). */
  status: string;
  stage: string[];
  outcome: string;
  method: string;
  sex: string;
  species: string;
  locationId: number | null;
  /** Set when a chart bar is clicked: the sire (or dam) on the row. */
  partner: string;
  rangeField: RangeField;
  from: string;
  to: string;
  attentionOnly: boolean;
}

export type SortDirection = 'asc' | 'desc';

export interface BreedingSort {
  key: string;
  direction: SortDirection;
}

export type CellKind = 'animal' | 'counterparty' | 'text' | 'status' | 'date' | 'due' | 'age' | 'progress' | 'sex' | 'weight' | 'method';

export interface BreedingColumn {
  key: string;
  label: string;
  cell: CellKind;
  sortable: boolean;
  align?: 'left' | 'right';
}

export type FacetKind = 'segmented' | 'chips' | 'select' | 'date-range' | 'toggle';

export interface FacetOption {
  value: string | number | boolean;
  label: string;
  count: number;
}

export interface FacetDef {
  key: 'status' | 'stage' | 'outcome' | 'method' | 'sex' | 'species' | 'locationId' | 'range' | 'attentionOnly';
  label: string;
  kind: FacetKind;
  options: FacetOption[];
  hint: string;
}

/** A KPI filter patch. `range` is a preset that the toggle writes into from/to. */
export type BreedingFilterPatch = Partial<BreedingFilters> & { range?: string };

/** A KPI that doubles as a saved filter — click the tile to drill in. */
export interface BreedingKpi {
  key: string;
  label: string;
  value: string;
  caption: string;
  tone: 'ok' | 'watch' | 'action' | 'neutral';
  filter: BreedingFilterPatch;
  active: boolean;
}

export interface BreedingTabDef {
  id: BreedingTab;
  label: string;
  title: string;
  subtitle: string;
  /** Read endpoint (also the source cited in the footer). */
  endpoint: string;
  /** Where create/update/delete go — null when the tab is read-only. */
  writeEndpoint: string | null;
  createLabel: string | null;
  columns: BreedingColumn[];
  rangeFields: { value: RangeField; label: string }[];
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  pages: number;
  from: number;
  to: number;
}

export interface FilterChip {
  key: string;
  label: string;
  value: string;
}

export interface EmptyState {
  title: string;
  detail: string;
}

/* ------------------------------------------------------------------ */
/* Charts                                                              */
/* ------------------------------------------------------------------ */

export interface TimelineBucket {
  key: string;
  /** Short x-axis label, e.g. "W3" or "Mar". */
  label: string;
  /** Tooltip label, e.g. "20 Apr – 26 Apr". */
  rangeLabel: string;
  from: string;
  to: string;
  primary: number;
  secondary: number;
  primaryDisplay: string;
  secondaryDisplay: string;
  /** Geometry, in the SVG user space of `TIMELINE_GEOMETRY`. */
  barX: number;
  barY: number;
  barWidth: number;
  barHeight: number;
  markerY: number;
  active: boolean;
}

export interface TimelineChart {
  title: string;
  subtitle: string;
  primaryLabel: string;
  secondaryLabel: string;
  primaryTotal: number;
  secondaryTotal: number;
  buckets: TimelineBucket[];
  /** The series the bars represent, plotted as a lighter line behind them. */
  linePoints: string;
  gridLines: { y: number; label: string }[];
  /** Which filter field a bucket click writes into. */
  field: RangeField;
  peak: { label: string; display: string } | null;
  footnote: string;
  empty: string;
}

export interface DonutSegment {
  key: string;
  label: string;
  value: number;
  display: string;
  share: number;
  tone: string;
  active: boolean;
  /** Slice bounds as percentages, ready for a legend or a custom gradient. */
  from: number;
  to: number;
}

export interface DonutChart {
  title: string;
  subtitle: string;
  gradient: string;
  segments: DonutSegment[];
  centerValue: string;
  centerLabel: string;
  total: number;
  footnote: string;
  empty: string;
}

export interface BarRow {
  key: string;
  label: string;
  value: number;
  display: string;
  share: number;
  tone: string;
  active: boolean;
  meta: string;
}

export interface BarsChart {
  title: string;
  subtitle: string;
  rows: BarRow[];
  total: number;
  unit: string;
  footnote: string;
  empty: string;
}

export type DialogMode = 'create' | 'edit' | 'view' | 'delete';
