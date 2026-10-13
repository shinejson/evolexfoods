import {
  AttentionItem,
  BarRow,
  CeoAnswer,
  CeoDashboard,
  CeoInsights,
  CeoKpis,
  CeoView,
  KpiGroupDefinition,
  KpiGroupView,
  LedgerRow,
  LedgerSummary,
  MetricDefinition,
  MetricEvaluation,
  MetricFormat,
  MetricLevel,
  MetricView,
  VitalSign
} from './ceo.models';

/**
 * Pure presentation logic for the CEO Command Center.
 *
 * Everything the page shows is derived here from the API payload, which keeps
 * the component thin, the template declarative and the rules unit-testable.
 */

const NUMBER_FORMAT = new Intl.NumberFormat('en-US');
const DECIMAL_FORMAT = new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 1 });

/** Assumed average daily feed cover used to scale the feed gauge. */
export const FEED_COVER_TARGET_DAYS = 30;

/** Mortality ceiling (percent of average herd) before it is treated as critical. */
export const MORTALITY_ACTION_THRESHOLD = 5;
export const MORTALITY_WATCH_THRESHOLD = 2;

export function formatMetric(value: number | null | undefined, format: MetricFormat): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—';
  }

  switch (format) {
    case 'money':
      return NUMBER_FORMAT.format(Math.round(value));
    case 'percent':
      return `${DECIMAL_FORMAT.format(value)}%`;
    case 'kilos':
      return `${NUMBER_FORMAT.format(Math.round(value))} kg`;
    case 'days':
      return `${DECIMAL_FORMAT.format(value)} ${Math.abs(value) === 1 ? 'day' : 'days'}`;
    case 'signed':
      return `${value > 0 ? '+' : value < 0 ? '−' : ''}${NUMBER_FORMAT.format(Math.abs(value))}`;
    default:
      return NUMBER_FORMAT.format(value);
  }
}

/** `2026-10-13T08:00:00+00:00` -> `13 Oct 2026`. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) {
    return '—';
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** `2026-10-13T08:00:00+00:00` -> `13 Oct, 08:00`. */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) {
    return '—';
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return `${date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}, ${date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit'
  })}`;
}

export function timeAgo(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) {
    return 'unknown time';
  }
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) {
    return 'unknown time';
  }
  const minutes = Math.max(0, Math.floor((now.getTime() - then) / 60000));
  if (minutes < 1) {
    return 'just now';
  }
  if (minutes < 60) {
    return `${minutes} min ago`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours} h ago`;
  }
  const days = Math.round(hours / 24);
  return days === 1 ? 'yesterday' : `${days} days ago`;
}

/* ------------------------------------------------------------------ */
/* Metric catalogue                                                    */
/* ------------------------------------------------------------------ */

function level(levelOf: MetricLevel, note: string): MetricEvaluation {
  return { level: levelOf, note };
}

/**
 * Declarative KPI catalogue: one entry drives the tile, its status colour,
 * the attention feed and the drill-down link. No bespoke markup per metric.
 */
export const KPI_GROUPS: KpiGroupDefinition[] = [
  {
    id: 'herd',
    title: 'Herd & breeding',
    summary: 'What we own, how it is growing and what is in calf.',
    icon: 'herd',
    kpis: [
      {
        key: 'total_herd',
        label: 'Total herd',
        hint: 'Animals with status alive and current status active',
        format: 'count',
        read: (k) => k.total_herd,
        route: '/livestock',
        module: 'Livestock',
        emptyHint: 'Register animals in the Livestock Master'
      },
      {
        key: 'female',
        label: 'Females',
        hint: 'Breeding capacity — alive females',
        format: 'count',
        read: (k) => k.female,
        route: '/livestock',
        module: 'Livestock',
        emptyHint: 'Record sex on each animal'
      },
      {
        key: 'male',
        label: 'Males',
        hint: 'Alive males, including sires',
        format: 'count',
        read: (k) => k.male,
        route: '/livestock',
        module: 'Livestock',
        emptyHint: 'Record sex on each animal'
      },
      {
        key: 'pregnancies',
        label: 'Active pregnancies',
        hint: 'Open pregnancy records for the current breeding cycle',
        format: 'count',
        read: (k) => k.pregnancies,
        route: '/breeding',
        module: 'Breeding',
        emptyHint: 'Log breeding events to build the calving calendar'
      },
      {
        key: 'births',
        label: 'Births in period',
        hint: 'Birth events recorded inside the selected date range',
        format: 'count',
        read: (k) => k.births,
        route: '/breeding',
        module: 'Breeding',
        emptyHint: 'Capture births from the Hub quick action'
      },
      {
        key: 'herd_growth',
        label: 'Herd growth',
        hint: 'Closing herd minus opening herd for the period',
        format: 'signed',
        read: (k) => k.herd_growth,
        route: '/livestock',
        module: 'Livestock',
        emptyHint: 'Growth appears once animals are registered',
        evaluate: (value, kpis) => {
          const rate = kpis.herd_growth_rate ?? 0;
          // A rate above 100% almost always means the opening herd was empty
          // (records start inside the period) — say so instead of showing 4000%.
          if (Math.abs(rate) > 100) {
            return level('watch', 'Opening herd was near zero, so the growth rate is not meaningful yet');
          }
          return value < 0
            ? level('watch', `${formatMetric(rate, 'percent')} net decline — check deaths and sales`)
            : level('ok', `${formatMetric(rate, 'percent')} net change vs opening herd`);
        }
      },
      {
        key: 'mortality_rate',
        label: 'Mortality rate',
        hint: 'Deaths in period ÷ average herd, per the SOP definition',
        format: 'percent',
        read: (k) => k.mortality_rate,
        route: '/livestock',
        module: 'Livestock',
        emptyHint: 'Record deaths to compute mortality',
        evaluate: (value) =>
          value >= MORTALITY_ACTION_THRESHOLD
            ? level('action', `Above the ${MORTALITY_ACTION_THRESHOLD}% ceiling — investigate the causes now`)
            : value >= MORTALITY_WATCH_THRESHOLD
              ? level('watch', `Above the ${MORTALITY_WATCH_THRESHOLD}% watch line — review the death log`)
              : level('ok', `Below the ${MORTALITY_WATCH_THRESHOLD}% watch line`),
        meter: (value) => Math.min(1, value / MORTALITY_ACTION_THRESHOLD),
        meterLabel: `0–${MORTALITY_ACTION_THRESHOLD}% scale`
      },
      {
        key: 'deaths',
        label: 'Deaths in period',
        hint: 'Death events recorded inside the selected date range',
        format: 'count',
        read: (k) => k.deaths,
        route: '/livestock',
        module: 'Livestock',
        emptyHint: 'No deaths recorded in this period',
        evaluate: (value) =>
          value >= 3
            ? level('action', `${value} losses in period — escalate to the vet and review records`)
            : value > 0
              ? level('watch', `${value} loss${value === 1 ? '' : 'es'} recorded in period`)
              : level('ok', 'No losses recorded in period')
      }
    ]
  },
  {
    id: 'health',
    title: 'Animal health',
    summary: 'Open clinical work and animals under active treatment.',
    icon: 'health',
    kpis: [
      {
        key: 'sick',
        label: 'Sick animals',
        hint: 'Health records still open',
        format: 'count',
        read: (k) => k.sick,
        route: '/health',
        module: 'Health',
        emptyHint: 'No open health cases',
        evaluate: (value) =>
          value >= 3
            ? level('action', `${value} open cases — possible outbreak, isolate and review`)
            : value > 0
              ? level('watch', `${value} open case${value === 1 ? '' : 's'} awaiting closure`)
              : level('ok', 'No open cases')
      },
      {
        key: 'under_treatment',
        label: 'Under treatment',
        hint: 'Treatments with an active status',
        format: 'count',
        read: (k) => k.under_treatment,
        route: '/treatments',
        module: 'Treatments',
        emptyHint: 'No active treatment courses',
        evaluate: (value) => (value > 0 ? level('watch', `${value} active course${value === 1 ? '' : 's'} to finish`) : level('ok', 'No active courses'))
      }
    ]
  },
  {
    id: 'stock',
    title: 'Feed & stock',
    summary: 'Cover, reorder pressure and the inputs the herd depends on.',
    icon: 'stock',
    kpis: [
      {
        key: 'feed_remaining',
        label: 'Feed on hand',
        hint: 'Sum of quantity on hand across feed items',
        // NOTE: the API sums quantity_on_hand across every feed item, so mixed
        // units (kg + bales) are added together. Kept unit-less on purpose;
        // the backend needs a per-unit split before this can claim "kg".
        format: 'count',
        read: (k) => k.feed_remaining,
        route: '/feed',
        module: 'Feed',
        emptyHint: 'Record feed receipts to build cover'
      },
      {
        key: 'days_feed_remaining',
        label: 'Days of feed cover',
        hint: 'Feed on hand ÷ average daily consumption',
        format: 'days',
        read: (k) => k.days_feed_remaining,
        route: '/feed',
        module: 'Feed',
        emptyHint: 'Set daily consumption on feed items',
        evaluate: (value) =>
          value <= 7
            ? level('action', `Under a week of cover — approve a feed purchase today`)
            : value <= 14
              ? level('watch', `Under two weeks of cover — raise a purchase request`)
              : level('ok', `${formatMetric(value, 'days')} of cover at current consumption`),
        meter: (value) => Math.min(1, Math.max(0, value / FEED_COVER_TARGET_DAYS)),
        meterLabel: `0–${FEED_COVER_TARGET_DAYS} day scale`
      },
      {
        key: 'low_stock',
        label: 'Items at reorder level',
        hint: 'Inventory items where quantity on hand ≤ reorder level',
        format: 'count',
        read: (k) => k.low_stock,
        route: '/inventory',
        module: 'Inventory',
        emptyHint: 'No items below reorder level',
        evaluate: (value) =>
          value >= 3
            ? level('action', `${value} items below reorder level — consolidate one purchase request`)
            : value > 0
              ? level('watch', `${value} item${value === 1 ? '' : 's'} below reorder level`)
              : level('ok', 'Stock levels healthy')
      }
    ]
  },
  {
    id: 'ops',
    title: 'Operations & people',
    summary: 'Work in flight: approvals, maintenance, tasks and attendance.',
    icon: 'ops',
    kpis: [
      {
        key: 'open_purchase_requests',
        label: 'Open purchase requests',
        hint: 'Requests in a pending workflow state',
        format: 'count',
        read: (k) => k.open_purchase_requests,
        route: '/procurement',
        module: 'Procurement',
        emptyHint: 'No outstanding purchase requests',
        evaluate: (value) => (value > 0 ? level('watch', `${value} request${value === 1 ? '' : 's'} in the approval queue`) : level('ok', 'Approval queue clear'))
      },
      {
        key: 'pending_approvals',
        label: 'Pending approvals',
        hint: 'Requests waiting on an approver decision',
        format: 'count',
        read: (k) => k.pending_approvals,
        route: '/procurement',
        module: 'Procurement',
        emptyHint: 'Nothing waiting on an approval',
        evaluate: (value) => (value > 0 ? level('watch', `${value} request${value === 1 ? '' : 's'} waiting on a signature`) : level('ok', 'Nothing waiting on a signature'))
      },
      {
        key: 'equipment_due_maintenance',
        label: 'Maintenance due',
        hint: 'Scheduled or overdue within the next 14 days',
        format: 'count',
        read: (k) => k.equipment_due_maintenance,
        route: '/maintenance',
        module: 'Maintenance',
        emptyHint: 'No maintenance due in the next 14 days',
        evaluate: (value) =>
          value >= 3
            ? level('action', `${value} services due — schedule a maintenance block`)
            : value > 0
              ? level('watch', `${value} service${value === 1 ? '' : 's'} due within 14 days`)
              : level('ok', 'No services due')
      },
      {
        key: 'open_tasks',
        label: 'Open tasks',
        hint: 'Tasks not yet completed',
        format: 'count',
        read: (k) => k.open_tasks,
        route: '/tasks',
        module: 'Tasks',
        emptyHint: 'No open tasks',
        evaluate: (value) => (value > 25 ? level('watch', `${value} open tasks — review the backlog in the weekly meeting`) : level('ok', `${value} open task${value === 1 ? '' : 's'} in the backlog`))
      },
      {
        key: 'employees_present',
        label: 'Present today',
        hint: 'Attendance marked present or overtime today',
        format: 'count',
        read: (k) => k.employees_present,
        route: '/hr',
        module: 'People',
        emptyHint: 'Mark attendance for today',
        evaluate: (value) => (value === 0 ? level('watch', 'No attendance captured today') : level('ok', `${value} on site today`))
      }
    ]
  },
  {
    id: 'finance',
    title: 'Financial operations',
    summary: 'Spend to date across expenses, purchase orders and invoices.',
    icon: 'finance',
    kpis: [
      {
        key: 'spending_week',
        label: 'Spend this week',
        hint: 'Expenses + purchase orders + invoices since Monday',
        format: 'money',
        read: (k) => k.spending_week,
        route: '/finance',
        module: 'Expenses',
        emptyHint: 'No spend captured this week'
      },
      {
        key: 'spending_month',
        label: 'Spend this month',
        hint: 'Expenses + purchase orders + invoices month to date',
        format: 'money',
        read: (k) => k.spending_month,
        route: '/finance',
        module: 'Expenses',
        emptyHint: 'No spend captured this month',
        evaluate: (value, kpis) => {
          const month = kpis.spending_month ?? 0;
          if (!value || !month) {
            return level('ok', 'Month-to-date spend');
          }
          return level('ok', `Week accounts for ${Math.round((value / month) * 100)}% of month-to-date spend`);
        }
      }
    ]
  },
  {
    id: 'growth',
    title: 'Commercial & marketing',
    summary: 'Demand, pipeline and the reach that feeds them.',
    icon: 'growth',
    kpis: [
      {
        key: 'prospects',
        label: 'Prospects',
        hint: 'Companies in lead, prospect or subscriber stage',
        format: 'count',
        read: (k) => k.prospects,
        route: '/crm',
        module: 'CRM',
        emptyHint: 'Sync companies from HubSpot'
      },
      {
        key: 'opportunities',
        label: 'Open opportunities',
        hint: 'Deals with an open status',
        format: 'count',
        read: (k) => k.opportunities,
        route: '/deals',
        module: 'Deals',
        emptyHint: 'No open deals',
        evaluate: (value) => (value === 0 ? level('watch', 'No open pipeline — commercial activity has stalled') : level('ok', `${value} live deal${value === 1 ? '' : 's'} in the pipeline`))
      },
      {
        key: 'content_produced',
        label: 'Content produced',
        hint: 'Content items created, by status',
        format: 'count',
        read: (k) => k.content_produced,
        route: '/marketing',
        module: 'Marketing',
        emptyHint: 'Add content items to the marketing calendar'
      },
      {
        key: 'digital_performance',
        label: 'Digital reach (30d)',
        hint: 'Sum of channel reach over the last 30 days',
        format: 'count',
        read: (k) => k.digital_performance?.reach_30d ?? null,
        route: '/marketing/performance',
        module: 'Channel performance',
        emptyHint: 'Sync channel metrics to see reach',
        evaluate: (value, kpis) => {
          const leads = kpis.digital_performance?.leads_30d ?? 0;
          return leads > 0
            ? level('ok', `${leads} lead${leads === 1 ? '' : 's'} captured from ${NUMBER_FORMAT.format(value)} reach`)
            : level('watch', 'Reach is flowing but no leads were captured');
        }
      }
    ]
  },
  {
    id: 'governance',
    title: 'Governance & risk',
    summary: 'What is waiting on ownership and what could go wrong.',
    icon: 'governance',
    kpis: [
      {
        key: 'risks',
        label: 'Open risks',
        hint: 'Risks with an open status',
        format: 'count',
        read: (k) => k.risks,
        route: '/risks',
        module: 'Risks',
        emptyHint: 'No open risks registered',
        evaluate: (value) =>
          value >= 5
            ? level('action', `${value} open risks — run a risk review this week`)
            : value > 0
              ? level('watch', `${value} open risk${value === 1 ? '' : 's'} on the register`)
              : level('ok', 'Register clear')
      },
      {
        key: 'owner_decisions_required',
        label: 'Owner decisions',
        hint: 'Decisions with status pending_owner',
        format: 'count',
        read: (k) => k.owner_decisions_required,
        route: '/decisions',
        module: 'Decisions',
        emptyHint: 'Nothing waiting on ownership',
        evaluate: (value) => (value > 0 ? level('action', `${value} decision${value === 1 ? '' : 's'} blocked on the owner — clear them to unblock delivery`) : level('ok', 'No decisions blocked'))
      }
    ]
  }
];

/** Metric keys that feed the headline vital signs. */
const VITAL_KEYS = ['total_herd', 'herd_growth', 'mortality_rate', 'days_feed_remaining'] as const;

const ALERT_ROUTES: Record<string, string> = {
  feed: '/feed',
  inventory: '/inventory',
  health: '/health',
  maintenance: '/maintenance',
  governance: '/decisions',
  procurement: '/procurement',
  finance: '/finance',
  tasks: '/tasks',
  hr: '/hr',
  risks: '/risks',
  marketing: '/marketing',
  crm: '/crm',
  deals: '/deals'
};

/** Maps an answerability `source` (e.g. `animals, locations`) to a module route. */
const SOURCE_ROUTES: Array<{ match: string; route: string }> = [
  { match: 'pregnancies', route: '/breeding' },
  { match: 'births', route: '/breeding' },
  { match: 'breedings', route: '/breeding' },
  { match: 'health_records', route: '/health' },
  { match: 'treatments', route: '/treatments' },
  { match: 'feed_items', route: '/feed' },
  { match: 'feed_transactions', route: '/feed' },
  { match: 'inventory_items', route: '/inventory' },
  { match: 'stock_movements', route: '/inventory' },
  { match: 'purchase_request_approvals', route: '/procurement' },
  { match: 'purchase_requests', route: '/procurement' },
  { match: 'purchase_orders', route: '/procurement' },
  { match: 'goods_receipts', route: '/procurement' },
  { match: 'suppliers', route: '/suppliers' },
  { match: 'maintenance_schedules', route: '/maintenance' },
  { match: 'maintenance_tickets', route: '/maintenance' },
  { match: 'assets', route: '/assets' },
  { match: 'attendance', route: '/hr' },
  { match: 'employees', route: '/hr' },
  { match: 'tasks', route: '/tasks' },
  { match: 'expenses', route: '/finance' },
  { match: 'invoices', route: '/invoices' },
  { match: 'companies', route: '/crm' },
  { match: 'deals', route: '/deals' },
  { match: 'content_items', route: '/marketing' },
  { match: 'media_assets', route: '/marketing' },
  { match: 'channel_metrics', route: '/marketing/performance' },
  { match: 'risks', route: '/risks' },
  { match: 'decisions', route: '/decisions' },
  { match: 'animals', route: '/livestock' },
  { match: 'locations', route: '/livestock' },
  { match: 'deaths', route: '/livestock' }
];

export function routeForSource(source: string): string | null {
  const normalised = (source ?? '').toLowerCase();
  const hit = SOURCE_ROUTES.find((entry) => normalised.includes(entry.match));
  return hit ? hit.route : null;
}

export function levelForSeverity(severity: string): 'critical' | 'warning' | 'info' {
  switch ((severity ?? '').toLowerCase()) {
    case 'critical':
    case 'high':
    case 'severe':
    case 'urgent':
      return 'critical';
    case 'warning':
    case 'medium':
    case 'moderate':
      return 'warning';
    default:
      return 'info';
  }
}

function isBlank(value: unknown): boolean {
  return value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0);
}

/** Renders an answerability-contract answer without leaking raw JSON to the CEO. */
export function formatAnswer(item: CeoAnswer | undefined): string {
  if (!item) {
    return '—';
  }

  const { value } = item;

  if (Array.isArray(value)) {
    const rows = value as Array<Record<string, unknown>>;
    if (!rows.length) {
      return '—';
    }
    return rows.map((row) => `${row['location'] ?? row['name'] ?? '—'}: ${NUMBER_FORMAT.format(Number(row['total'] ?? 0))}`).join(' · ');
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (record['reach_30d'] !== undefined) {
      return `Reach ${NUMBER_FORMAT.format(Number(record['reach_30d']))} · Views ${NUMBER_FORMAT.format(
        Number(record['views_30d'] ?? 0)
      )} · Leads ${NUMBER_FORMAT.format(Number(record['leads_30d'] ?? 0))}`;
    }
    return Object.entries(record)
      .map(([key, entry]) => `${key.replace(/_/g, ' ')}: ${typeof entry === 'number' ? NUMBER_FORMAT.format(entry) : String(entry)}`)
      .join(' · ');
  }

  if (item.week !== undefined || item.month !== undefined) {
    return `Week ${formatMetric(item.week ?? null, 'money')} · Month ${formatMetric(item.month ?? null, 'money')}`;
  }

  if (isBlank(value)) {
    return '—';
  }

  const suffix = item.unit === '%' ? '%' : item.unit ? ` ${item.unit}` : '';
  const base = `${typeof value === 'number' ? NUMBER_FORMAT.format(value) : String(value)}${suffix}`;
  const extras: string[] = [];

  if (item.pending !== undefined) {
    extras.push(`${NUMBER_FORMAT.format(item.pending)} pending`);
  }
  if (item.rate !== undefined) {
    extras.push(`${item.rate}% rate`);
  }
  if (item.open_tickets !== undefined) {
    extras.push(`${NUMBER_FORMAT.format(item.open_tickets)} open ticket${item.open_tickets === 1 ? '' : 's'}`);
  }
  if (item.headcount !== undefined && item.headcount > 0) {
    extras.push(`of ${NUMBER_FORMAT.format(item.headcount)} employees`);
  }
  if (item.published !== undefined && item.published > 0) {
    extras.push(`${NUMBER_FORMAT.format(item.published)} published`);
  }
  if (item.pipeline_value !== undefined && item.pipeline_value > 0) {
    extras.push(`pipeline ${formatMetric(item.pipeline_value, 'money')}`);
  }

  return extras.length ? `${base} · ${extras.join(' · ')}` : base;
}

/** True when the contract entry carries an actual answer rather than a placeholder. */
export function hasAnswer(item: CeoAnswer | undefined): boolean {
  if (!item) {
    return false;
  }
  if (item.week !== undefined || item.month !== undefined) {
    return true;
  }
  return !isBlank(item.value);
}

function evaluateMetric(definition: MetricDefinition, value: number | null, kpis: CeoKpis): MetricEvaluation {
  if (value === null) {
    return level('unknown', definition.emptyHint);
  }
  if (definition.evaluate) {
    return definition.evaluate(value, kpis);
  }
  return level('ok', definition.hint);
}

function toMetricView(definition: MetricDefinition, kpis: CeoKpis): MetricView {
  const raw = definition.read(kpis);
  const value = typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
  const evaluation = evaluateMetric(definition, value, kpis);
  const meterValue = value !== null && definition.meter ? definition.meter(value, kpis) : null;

  return {
    key: definition.key,
    label: definition.label,
    hint: definition.hint,
    format: definition.format,
    route: definition.route,
    module: definition.module,
    emptyHint: definition.emptyHint,
    meterLabel: definition.meterLabel,
    display: formatMetric(value, definition.format),
    raw: value,
    level: evaluation.level,
    note: evaluation.note,
    meterValue
  };
}

export function buildGroupViews(kpis: CeoKpis): KpiGroupView[] {
  return KPI_GROUPS.map((group) => {
    const metrics = group.kpis.map((definition) => toMetricView(definition, kpis));
    return {
      id: group.id,
      title: group.title,
      summary: group.summary,
      icon: group.icon,
      metrics,
      actionCount: metrics.filter((metric) => metric.level === 'action').length,
      watchCount: metrics.filter((metric) => metric.level === 'watch').length
    };
  });
}

function buildVitals(groups: KpiGroupView[]): VitalSign[] {
  const metrics = groups.flatMap((group) => group.metrics);
  return VITAL_KEYS.map((key) => metrics.find((metric) => metric.key === key)).reduce<VitalSign[]>((acc, metric) => {
    if (!metric) {
      return acc;
    }
    acc.push({
      key: metric.key,
      label: metric.label,
      display: metric.display,
      caption: metric.note,
      level: metric.level,
      route: metric.route
    });
    return acc;
  }, []);
}

function buildAttention(dashboard: CeoDashboard, groups: KpiGroupView[]): AttentionItem[] {
  const fromAlerts: AttentionItem[] = (dashboard.alerts ?? []).map((alert) => {
    const severity = levelForSeverity(alert.severity);
    const route = ALERT_ROUTES[(alert.module ?? '').toLowerCase()] ?? null;
    return {
      id: `alert-${alert.id}`,
      level: severity,
      title: alert.title,
      detail: alert.message,
      value: null,
      module: alert.module ? alert.module.charAt(0).toUpperCase() + alert.module.slice(1) : 'System',
      route,
      occurredAt: alert.triggered_at ?? null,
      occurredLabel: alert.triggered_at ? timeAgo(alert.triggered_at) : 'unread alert',
      fromAlert: true
    };
  });

  // Only hard breaches make the feed. Watch-level metrics stay inside their
  // domain as tiles and are summarised as a count — a command centre that
  // flags everything flags nothing.
  const fromMetrics: AttentionItem[] = groups
    .flatMap((group) => group.metrics)
    .filter((metric) => metric.level === 'action')
    .map((metric) => ({
      id: `metric-${metric.key}`,
      level: 'critical' as const,
      title: metric.label,
      detail: metric.note,
      value: metric.display,
      module: metric.module,
      route: metric.route,
      occurredAt: null,
      occurredLabel: 'live records',
      fromAlert: false
    }));

  const weight: Record<AttentionItem['level'], number> = { critical: 0, warning: 1, info: 2 };

  return [...fromAlerts, ...fromMetrics].sort((a, b) => {
    if (weight[a.level] !== weight[b.level]) {
      return weight[a.level] - weight[b.level];
    }
    if (a.fromAlert !== b.fromAlert) {
      return a.fromAlert ? -1 : 1;
    }
    const aTime = a.occurredAt ? new Date(a.occurredAt).getTime() : 0;
    const bTime = b.occurredAt ? new Date(b.occurredAt).getTime() : 0;
    return bTime - aTime || a.title.localeCompare(b.title);
  });
}

function buildInsights(dashboard: CeoDashboard): CeoInsights {
  const kpis = dashboard.kpis;
  const locationAnswer = dashboard.answers?.['2'];
  const locationRows = Array.isArray(locationAnswer?.value) ? (locationAnswer?.value as Array<Record<string, unknown>>) : [];
  const total = locationRows.reduce((sum, row) => sum + Number(row['total'] ?? 0), 0);
  const herdByLocation: BarRow[] = locationRows
    .map((row) => {
      const value = Number(row['total'] ?? 0);
      return {
        label: String(row['location'] ?? row['name'] ?? 'Unassigned'),
        value,
        share: total > 0 ? value / total : 0,
        display: NUMBER_FORMAT.format(value),
        shareDisplay: `${Math.round((total > 0 ? value / total : 0) * 100)}%`
      };
    })
    .sort((a, b) => b.value - a.value);

  const digital = kpis.digital_performance ?? { reach_30d: 0, views_30d: 0, leads_30d: 0 };
  const totalSexed = Math.max(1, (kpis.female ?? 0) + (kpis.male ?? 0));
  const days = typeof kpis.days_feed_remaining === 'number' ? kpis.days_feed_remaining : null;

  const spendRows: BarRow[] = [
    { label: 'This week', value: kpis.spending_week ?? 0 },
    { label: 'This month', value: kpis.spending_month ?? 0 }
  ].map((row) => {
    const max = Math.max(kpis.spending_week ?? 0, kpis.spending_month ?? 0, 1);
    return { ...row, share: row.value / max, display: formatMetric(row.value, 'money'), shareDisplay: `${Math.round((row.value / max) * 100)}%` };
  });

  return {
    herdByLocation,
    herdByLocationTotal: total,
    mix: {
      female: kpis.female ?? 0,
      male: kpis.male ?? 0,
      femaleShare: (kpis.female ?? 0) / totalSexed
    },
    digital,
    digitalDisplay: {
      reach: NUMBER_FORMAT.format(digital.reach_30d ?? 0),
      views: NUMBER_FORMAT.format(digital.views_30d ?? 0),
      leads: NUMBER_FORMAT.format(digital.leads_30d ?? 0)
    },
    spend: spendRows,
    feedCover: {
      days,
      target: FEED_COVER_TARGET_DAYS,
      ratio: days === null ? null : Math.min(1, Math.max(0, days / FEED_COVER_TARGET_DAYS))
    }
  };
}

function buildLedger(dashboard: CeoDashboard): { rows: LedgerRow[]; summary: LedgerSummary } {
  const entries = Object.entries(dashboard.answers ?? {})
    .map(([key, value]) => ({ number: Number(key), item: value }))
    .filter((entry) => Number.isFinite(entry.number))
    .sort((a, b) => a.number - b.number);

  const rows: LedgerRow[] = entries.map(({ number, item }) => ({
    number,
    question: item?.question ?? '—',
    answer: formatAnswer(item),
    source: item?.source ?? '—',
    sourceRoute: routeForSource(item?.source ?? ''),
    hasData: hasAnswer(item)
  }));

  const answered = rows.filter((row) => row.hasData).length;

  return {
    rows,
    summary: {
      total: rows.length,
      answered,
      gaps: rows.length - answered,
      completeness: rows.length ? Math.round((answered / rows.length) * 100) : 0
    }
  };
}

/** Builds the complete view model for the page. Pure — safe to unit test. */
export function buildCeoView(dashboard: CeoDashboard): CeoView {
  const groups = buildGroupViews(dashboard.kpis);
  const attention = buildAttention(dashboard, groups);
  const ledger = buildLedger(dashboard);
  const metrics = groups.flatMap((group) => group.metrics);
  const actionCount = attention.filter((item) => item.level === 'critical').length;
  const alertWarnings = attention.filter((item) => item.level === 'warning').length;
  const watchSignals = metrics.filter((metric) => metric.level === 'watch').length;
  const watchLabel = `${watchSignals} KPI signal${watchSignals === 1 ? '' : 's'} on watch inside the domains.`;

  const status: CeoView['status'] =
    actionCount > 0
      ? {
          level: 'action',
          headline: `${actionCount} item${actionCount === 1 ? '' : 's'} need your decision`,
          detail: watchSignals > 0 ? watchLabel : 'Everything else is inside tolerance.'
        }
      : alertWarnings + watchSignals > 0
        ? {
            level: 'watch',
            headline: 'Inside tolerance, worth a look',
            detail: `${alertWarnings + watchSignals} signal${alertWarnings + watchSignals === 1 ? '' : 's'} trending toward the limit.`
          }
        : {
            level: 'clear',
            headline: 'All clear',
            detail: 'No alerts, no breaches. Keep executing.'
          };

  return {
    periodLabel: `${formatDate(dashboard.from)} → ${formatDate(dashboard.to)}`,
    from: dashboard.from,
    to: dashboard.to,
    generatedAt: dashboard.generated_at,
    status,
    attention,
    attentionCounts: {
      critical: actionCount,
      // The board summary counts every signal on the watch line, including the
      // domain tiles that do not warrant a row in the feed.
      warning: watchSignals + alertWarnings,
      info: attention.filter((item) => item.level === 'info').length
    },
    watchSignals,
    vitals: buildVitals(groups),
    groups,
    insights: buildInsights(dashboard),
    ledger: ledger.rows,
    ledgerSummary: ledger.summary
  };
}

/** CSV of the answerability contract — the board-pack export. */
export function ledgerToCsv(rows: LedgerRow[], summary: LedgerSummary, periodLabel: string): string {
  const escape = (value: string) => `"${(value ?? '').replace(/"/g, '""')}"`;
  const lines = [
    `Evolex CEO Command Center — answerability contract`,
    `Period,${escape(periodLabel)}`,
    `Completeness,${escape(`${summary.answered} of ${summary.total} questions (${summary.completeness}%)`)}`,
    '',
    ['#', 'Question', 'Answer', 'System of record', 'Status'].map(escape).join(',')
  ];

  rows.forEach((row) => {
    lines.push([String(row.number), row.question, row.answer, row.source, row.hasData ? 'Answered' : 'Data gap'].map(escape).join(','));
  });

  return `\uFEFF${lines.join('\n')}`;
}
