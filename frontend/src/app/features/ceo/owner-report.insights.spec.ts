import { WeeklyOwnerReport } from './owner-report.models';
import { buildOwnerReportView, formatGhs } from './owner-report.insights';
import { buildOwnerReportDocument } from './owner-report.document';

function fixture(): WeeklyOwnerReport {
  return {
    report: 'Weekly Owner Report',
    manual_reference: '§113',
    generated_at: '2026-10-13T07:30:00Z',
    period: { from: '2026-10-06', to: '2026-10-13', label: '6 Oct 2026 – 13 Oct 2026' },
    sections: [
      {
        key: 'executive_summary', number: 1, title: 'Executive Summary',
        headline: 'Week in review — herd steady',
        major_developments: ['3 births registered this week.'],
        key_numbers: { closing_herd: 48, feed_days_remaining: 21, spend_week_to_date: 920, spend_month_to_date: 4840, risks_open: 1, decisions_required: 1 }
      },
      {
        key: 'livestock', number: 2, title: 'Livestock',
        herd_reconciliation: {
          opening_herd: 45, births: 3, purchases: 2, deaths: 1, sales: 1, closing_herd: 48,
          computed_closing: 48, variance: 0,
          equation: 'Opening herd + Births + Purchases − Deaths − Sales = Closing herd',
          equation_display: '45 + 3 + 2 − 1 − 1 = 48', reconciles: true
        },
        pregnancies: 8, expected_births: { next_7: 1, next_30: 3, next_60: 5, next_90: 6 },
        health_issues: 1, under_treatment: 1, mortality_rate: 2.2
      },
      { key: 'operations_people', number: 3, title: 'Operations & People', completed_work: 4, outstanding_work: 3, overdue_work: 0, problems: [], attendance: { present: 6, absent: 1, leave: 1, records: 8 }, staffing: 9, performance_concerns: 'No overdue tasks.' },
      { key: 'feed_inventory', number: 4, title: 'Feed & Inventory', feed_on_hand_kg: 565, daily_consumption_kg: 27, feed_days_remaining: 21, medicines_available: 4, critical_stock: [] },
      {
        key: 'procurement_spend', number: 5, title: 'Procurement & Financial Operations',
        requests_in_period: 2, pending_supervisor_approvals: 1,
        pending_executive_approvals: [{ request_number: 'PR-2026-004', item_name: 'Dairy Mash', estimated_cost: 2100, priority: 'high' }],
        approval_threshold_ghs: 1000, purchases_in_period: 1, open_orders: 1,
        spend: {
          period: { from: '2026-10-06', to: '2026-10-13', expenses: 100, purchase_orders: 0, invoices: 0, total: 100 },
          week_to_date: { from: '2026-10-12', to: '2026-10-13', expenses: 920, purchase_orders: 0, invoices: 0, total: 920 },
          month_to_date: { from: '2026-10-01', to: '2026-10-13', expenses: 4840, purchase_orders: 0, invoices: 0, total: 4840 }
        }
      },
      { key: 'sales_marketing', number: 6, title: 'Sales & Marketing', prospects: 7, opportunities: 3, pipeline_value: 12500, sales_in_period: 1, content_produced: 5, reach: 48200, views: 18600, leads: 14 },
      { key: 'risks', number: 7, title: 'Risks', open_risks: [{ title: 'Feed price volatility', category: 'supply', severity: 'high', status: 'open' }], unread_alerts: [] },
      { key: 'decisions', number: 8, title: 'Owner Decisions Required', decisions: [{ title: 'Approve borehole repair', description: null, due_date: '2026-10-20' }], executive_procurement_awaiting: 1, note: 'Keep this concise and actionable.' }
    ],
    source: 'animals, births'
  };
}

describe('weekly owner report insights', () => {
  it('formats Ghana cedi amounts', () => {
    expect(formatGhs(1234.5)).toBe('GH₵1,234.50');
  });

  it('normalises the eight sections into a typed view', () => {
    const view = buildOwnerReportView(fixture());
    expect(view.livestock.reconciliation.equation_display).toBe('45 + 3 + 2 − 1 − 1 = 48');
    expect(view.livestock.reconciliation.reconciles).toBeTrue();
    expect(view.procurementSpend.spend.week_to_date.total).toBe(920);
    expect(view.procurementSpend.spend.month_to_date.total).toBe(4840);
    expect(view.procurementSpend.pendingExecutive[0].item_name).toBe('Dairy Mash');
    expect(view.decisions.decisions[0].title).toBe('Approve borehole repair');
    expect(view.feedInventory.feedDaysRemaining).toBe(21);
  });

  it('tolerates a payload with missing sections', () => {
    const view = buildOwnerReportView({ ...fixture(), sections: [] });
    expect(view.livestock.reconciliation.closing_herd).toBe(0);
    expect(view.decisions.decisions).toEqual([]);
  });

  it('renders the printable digest with the herd equation and spend', () => {
    const html = buildOwnerReportDocument(buildOwnerReportView(fixture()), '13 Oct 2026');
    expect(html).toContain('Weekly Owner Report');
    expect(html).toContain('45 + 3 + 2 − 1 − 1 = 48');
    expect(html).toContain('GH₵4,840.00');
    expect(html).toContain('Owner Decisions Required');
    expect(html).toContain('window.print()');
  });
});
