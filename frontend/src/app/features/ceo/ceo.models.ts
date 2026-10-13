/**
 * Contract for `GET /api/v1/dashboard/ceo`
 * (see backend/app/Http/Controllers/Api/V1/DashboardController.php).
 *
 * The endpoint is the answerability layer for the 30 management questions, so
 * every field here maps 1:1 to something a CEO has to be able to see without
 * asking anyone.
 */

export interface CeoAlert {
  id: number;
  type: string;
  severity: string;
  title: string;
  message: string;
  module: string;
  is_read?: boolean;
  triggered_at?: string;
}

export interface CeoDigitalPerformance {
  reach_30d: number;
  views_30d: number;
  leads_30d: number;
}

export interface CeoKpis {
  total_herd: number;
  female: number;
  male: number;
  pregnancies: number;
  births: number;
  deaths: number;
  mortality_rate: number;
  herd_growth: number;
  herd_growth_rate: number;
  sick: number;
  under_treatment: number;
  feed_remaining: number;
  days_feed_remaining: number | null;
  low_stock: number;
  open_purchase_requests: number;
  pending_approvals: number;
  equipment_due_maintenance: number;
  employees_present: number;
  open_tasks: number;
  spending_week: number;
  spending_month: number;
  prospects: number;
  opportunities: number;
  content_produced: number;
  digital_performance: CeoDigitalPerformance;
  risks: number;
  owner_decisions_required: number;
}

/** A single answer from the 30-question answerability contract. */
export interface CeoAnswer {
  question: string;
  source: string;
  value?: unknown;
  unit?: string;
  rate?: number;
  pending?: number;
  published?: number;
  headcount?: number;
  open_tickets?: number;
  pipeline_value?: number;
  period?: [string, string];
  week?: number;
  month?: number;
  [extra: string]: unknown;
}

export interface CeoDashboard {
  generated_at: string;
  from: string;
  to: string;
  kpis: CeoKpis;
  answers: Record<string, CeoAnswer>;
  alerts: CeoAlert[];
}

/* ------------------------------------------------------------------ */
/* View model                                                          */
/* ------------------------------------------------------------------ */

export type MetricFormat = 'count' | 'money' | 'percent' | 'kilos' | 'days' | 'signed';

export type MetricLevel = 'ok' | 'watch' | 'action' | 'unknown';

export interface MetricEvaluation {
  level: MetricLevel;
  /** Short, human explanation of why the metric sits at this level. */
  note: string;
}

export interface MetricDefinition {
  key: string;
  label: string;
  /** How the number is produced — shown as a tooltip / secondary line. */
  hint: string;
  format: MetricFormat;
  read: (kpis: CeoKpis) => number | null;
  route: string;
  module: string;
  /** Shown when the API returns no value for this metric. */
  emptyHint: string;
  evaluate?: (value: number, kpis: CeoKpis) => MetricEvaluation;
  /** Optional 0..1 gauge rendered under the value, derived from real data. */
  meter?: (value: number, kpis: CeoKpis) => number | null;
  meterLabel?: string;
}

export type GroupIcon = 'herd' | 'health' | 'stock' | 'ops' | 'finance' | 'growth' | 'governance';

export interface KpiGroupDefinition {
  id: string;
  title: string;
  summary: string;
  icon: GroupIcon;
  kpis: MetricDefinition[];
}

export interface MetricView extends Omit<MetricDefinition, 'read' | 'evaluate' | 'meter'> {
  display: string;
  raw: number | null;
  level: MetricLevel;
  note: string;
  meterValue: number | null;
}

export interface KpiGroupView {
  id: string;
  title: string;
  summary: string;
  icon: GroupIcon;
  metrics: MetricView[];
  actionCount: number;
  watchCount: number;
}

export interface VitalSign {
  key: string;
  label: string;
  display: string;
  caption: string;
  level: MetricLevel;
  route: string;
}

export interface AttentionItem {
  id: string;
  level: 'critical' | 'warning' | 'info';
  title: string;
  detail: string;
  /** Headline value for KPI breaches (e.g. `3`); null for alert records. */
  value: string | null;
  module: string;
  route: string | null;
  /** ISO timestamp when the source is an alert; null for derived signals. */
  occurredAt: string | null;
  /** Pre-formatted relative time ("4 h ago"), safe for the template. */
  occurredLabel: string;
  /** True when the item comes from an alert record rather than a threshold. */
  fromAlert: boolean;
}

export interface LedgerRow {
  number: number;
  question: string;
  answer: string;
  source: string;
  sourceRoute: string | null;
  hasData: boolean;
}

export interface BarRow {
  label: string;
  value: number;
  share: number;
  display: string;
  /** Pre-formatted share, e.g. `34%`. */
  shareDisplay: string;
}

export interface CeoInsights {
  herdByLocation: BarRow[];
  herdByLocationTotal: number;
  mix: { female: number; male: number; femaleShare: number };
  digital: CeoDigitalPerformance;
  digitalDisplay: { reach: string; views: string; leads: string };
  spend: BarRow[];
  feedCover: { days: number | null; target: number; ratio: number | null };
}

export interface LedgerSummary {
  total: number;
  answered: number;
  gaps: number;
  completeness: number;
}

export interface CeoView {
  periodLabel: string;
  from: string;
  to: string;
  generatedAt: string;
  status: {
    level: 'clear' | 'watch' | 'action';
    headline: string;
    detail: string;
  };
  attention: AttentionItem[];
  attentionCounts: { critical: number; warning: number; info: number };
  /** Metrics sitting on the watch line inside their domain (not in the feed). */
  watchSignals: number;
  vitals: VitalSign[];
  groups: KpiGroupView[];
  insights: CeoInsights;
  ledger: LedgerRow[];
  ledgerSummary: LedgerSummary;
}
