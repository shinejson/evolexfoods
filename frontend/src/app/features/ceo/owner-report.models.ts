/**
 * Types for the 1-Click Weekly Owner Report (§113) —
 * GET /api/v1/reports/weekly-owner compiles the eight-section executive
 * digest that the CEO Command Center renders as a printable/PDF document.
 */

export interface OwnerReportPeriod {
  from: string;
  to: string;
  label: string;
}

export interface HerdReconciliation {
  opening_herd: number;
  births: number;
  purchases: number;
  deaths: number;
  sales: number;
  closing_herd: number;
  computed_closing: number;
  variance: number;
  equation: string;
  equation_display: string;
  reconciles: boolean;
}

export interface SpendBlock {
  from: string;
  to: string;
  expenses: number;
  purchase_orders: number;
  invoices: number;
  total: number;
}

export interface OwnerReportSection {
  key: string;
  number: number;
  title: string;
  [field: string]: unknown;
}

export interface WeeklyOwnerReport {
  report: string;
  manual_reference: string;
  generated_at: string;
  period: OwnerReportPeriod;
  sections: OwnerReportSection[];
  source: string;
}

/** Typed accessors for the sections the document builder renders. */
export interface OwnerReportView {
  period: OwnerReportPeriod;
  generatedAt: string;
  executive: {
    headline: string;
    majorDevelopments: string[];
    keyNumbers: Record<string, number | null>;
  };
  livestock: {
    reconciliation: HerdReconciliation;
    pregnancies: number;
    expectedBirths: Record<string, number>;
    healthIssues: number;
    underTreatment: number;
    mortalityRate: number;
  };
  operationsPeople: {
    completedWork: number;
    outstandingWork: number;
    overdueWork: number;
    problems: { ticket_number: string; title: string; priority: string; status: string }[];
    attendance: { present: number; absent: number; leave: number; records: number };
    staffing: number;
    performanceConcerns: string;
  };
  feedInventory: {
    feedOnHandKg: number;
    dailyConsumptionKg: number;
    feedDaysRemaining: number | null;
    medicinesAvailable: number;
    criticalStock: { name: string; category: string | null; quantity_on_hand: number; reorder_level: number; unit: string | null }[];
  };
  procurementSpend: {
    requestsInPeriod: number;
    pendingSupervisor: number;
    pendingExecutive: { request_number: string; item_name: string; estimated_cost: number; priority: string | null }[];
    threshold: number;
    purchasesInPeriod: number;
    openOrders: number;
    spend: { period: SpendBlock; week_to_date: SpendBlock; month_to_date: SpendBlock };
  };
  salesMarketing: {
    prospects: number;
    opportunities: number;
    pipelineValue: number;
    salesInPeriod: number;
    contentProduced: number;
    reach: number;
    views: number;
    leads: number;
  };
  risks: {
    openRisks: { title: string; category: string | null; severity: string | null; status: string }[];
    unreadAlerts: { type: string; severity: string | null; title: string; message: string | null }[];
  };
  decisions: {
    decisions: { title: string; description: string | null; due_date: string | null }[];
    executiveProcurementAwaiting: number;
    note: string;
  };
}
