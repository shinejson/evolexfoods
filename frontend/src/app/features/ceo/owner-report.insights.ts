/**
 * Pure normalisation for the Weekly Owner Report (§113): turns the API's
 * section list into the typed view the document builder renders, tolerating
 * missing sections so a partial payload still produces a usable digest.
 */

import { OwnerReportSection, OwnerReportView, WeeklyOwnerReport } from './owner-report.models';

function section(report: WeeklyOwnerReport | null | undefined, key: string): OwnerReportSection {
  return report?.sections?.find((s) => s.key === key) ?? { key, number: 0, title: key };
}

function num(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function list<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function buildOwnerReportView(report: WeeklyOwnerReport | null | undefined): OwnerReportView {
  const exec = section(report, 'executive_summary');
  const livestock = section(report, 'livestock');
  const ops = section(report, 'operations_people');
  const feed = section(report, 'feed_inventory');
  const procurement = section(report, 'procurement_spend');
  const sales = section(report, 'sales_marketing');
  const risks = section(report, 'risks');
  const decisions = section(report, 'decisions');

  const reconciliation = (livestock['herd_reconciliation'] ?? {}) as OwnerReportView['livestock']['reconciliation'];
  const attendance = (ops['attendance'] ?? {}) as OwnerReportView['operationsPeople']['attendance'];
  const spend = (procurement['spend'] ?? {}) as Partial<OwnerReportView['procurementSpend']['spend']>;
  const emptySpend = { from: '', to: '', expenses: 0, purchase_orders: 0, invoices: 0, total: 0 };

  return {
    period: report?.period ?? { from: '', to: '', label: '' },
    generatedAt: report?.generated_at ?? '',
    executive: {
      headline: String(exec['headline'] ?? 'Week in review'),
      majorDevelopments: list<string>(exec['major_developments']),
      keyNumbers: (exec['key_numbers'] ?? {}) as Record<string, number | null>
    },
    livestock: {
      reconciliation: {
        opening_herd: num(reconciliation.opening_herd),
        births: num(reconciliation.births),
        purchases: num(reconciliation.purchases),
        deaths: num(reconciliation.deaths),
        sales: num(reconciliation.sales),
        closing_herd: num(reconciliation.closing_herd),
        computed_closing: num(reconciliation.computed_closing),
        variance: num(reconciliation.variance),
        equation: String(reconciliation.equation ?? 'Opening herd + Births + Purchases − Deaths − Sales = Closing herd'),
        equation_display: String(reconciliation.equation_display ?? ''),
        reconciles: Boolean(reconciliation.reconciles)
      },
      pregnancies: num(livestock['pregnancies']),
      expectedBirths: (livestock['expected_births'] ?? {}) as Record<string, number>,
      healthIssues: num(livestock['health_issues']),
      underTreatment: num(livestock['under_treatment']),
      mortalityRate: num(livestock['mortality_rate'])
    },
    operationsPeople: {
      completedWork: num(ops['completed_work']),
      outstandingWork: num(ops['outstanding_work']),
      overdueWork: num(ops['overdue_work']),
      problems: list(ops['problems']),
      attendance: {
        present: num(attendance.present),
        absent: num(attendance.absent),
        leave: num(attendance.leave),
        records: num(attendance.records)
      },
      staffing: num(ops['staffing']),
      performanceConcerns: String(ops['performance_concerns'] ?? '')
    },
    feedInventory: {
      feedOnHandKg: num(feed['feed_on_hand_kg']),
      dailyConsumptionKg: num(feed['daily_consumption_kg']),
      feedDaysRemaining: feed['feed_days_remaining'] === null || feed['feed_days_remaining'] === undefined ? null : num(feed['feed_days_remaining']),
      medicinesAvailable: num(feed['medicines_available']),
      criticalStock: list(feed['critical_stock'])
    },
    procurementSpend: {
      requestsInPeriod: num(procurement['requests_in_period']),
      pendingSupervisor: num(procurement['pending_supervisor_approvals']),
      pendingExecutive: list(procurement['pending_executive_approvals']),
      threshold: num(procurement['approval_threshold_ghs'], 1000),
      purchasesInPeriod: num(procurement['purchases_in_period']),
      openOrders: num(procurement['open_orders']),
      spend: {
        period: spend.period ?? emptySpend,
        week_to_date: spend.week_to_date ?? emptySpend,
        month_to_date: spend.month_to_date ?? emptySpend
      }
    },
    salesMarketing: {
      prospects: num(sales['prospects']),
      opportunities: num(sales['opportunities']),
      pipelineValue: num(sales['pipeline_value']),
      salesInPeriod: num(sales['sales_in_period']),
      contentProduced: num(sales['content_produced']),
      reach: num(sales['reach']),
      views: num(sales['views']),
      leads: num(sales['leads'])
    },
    risks: {
      openRisks: list(risks['open_risks']),
      unreadAlerts: list(risks['unread_alerts'])
    },
    decisions: {
      decisions: list(decisions['decisions']),
      executiveProcurementAwaiting: num(decisions['executive_procurement_awaiting']),
      note: String(decisions['note'] ?? '')
    }
  };
}

export function formatGhs(value: number | null | undefined): string {
  const amount = Number(value ?? 0);
  return `GH₵${Number.isFinite(amount) ? amount.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}`;
}

export function formatCount(value: number | null | undefined): string {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount.toLocaleString('en-GH') : '—';
}
