import { CeoDashboard } from './ceo.models';
import {
  FEED_COVER_TARGET_DAYS,
  buildCeoView,
  formatAnswer,
  formatDate,
  formatMetric,
  levelForSeverity,
  ledgerToCsv,
  routeForSource,
  timeAgo
} from './ceo.insights';

function fixture(overrides: Partial<CeoDashboard['kpis']> = {}, answers: CeoDashboard['answers'] = {}): CeoDashboard {
  return {
    generated_at: '2026-10-13T08:15:00+00:00',
    from: '2026-09-13',
    to: '2026-10-13',
    kpis: {
      total_herd: 45,
      female: 30,
      male: 15,
      pregnancies: 8,
      births: 4,
      deaths: 2,
      mortality_rate: 2.4,
      herd_growth: 4,
      herd_growth_rate: 9.8,
      sick: 1,
      under_treatment: 1,
      feed_remaining: 565,
      days_feed_remaining: 21,
      low_stock: 1,
      open_purchase_requests: 2,
      pending_approvals: 2,
      equipment_due_maintenance: 1,
      employees_present: 6,
      open_tasks: 11,
      spending_week: 920,
      spending_month: 4840,
      prospects: 7,
      opportunities: 3,
      content_produced: 12,
      digital_performance: { reach_30d: 48200, views_30d: 18600, leads_30d: 14 },
      risks: 1,
      owner_decisions_required: 1,
      ...overrides
    },
    answers,
    alerts: []
  };
}

describe('ceo insights', () => {
  describe('formatting', () => {
    it('renders placeholders for missing values', () => {
      expect(formatMetric(null, 'count')).toBe('—');
      expect(formatMetric(undefined, 'percent')).toBe('—');
      expect(formatMetric(Number.NaN, 'money')).toBe('—');
    });

    it('renders each metric format', () => {
      expect(formatMetric(1234567, 'money')).toBe('1,234,567');
      expect(formatMetric(2.35, 'percent')).toBe('2.4%');
      expect(formatMetric(11.3, 'days')).toBe('11.3 days');
      expect(formatMetric(1, 'days')).toBe('1 day');
      expect(formatMetric(4, 'signed')).toBe('+4');
      expect(formatMetric(-3, 'signed')).toBe('−3');
    });

    it('formats dates defensively', () => {
      expect(formatDate('2026-10-13')).toBe('13 Oct 2026');
      expect(formatDate('not-a-date')).toBe('—');
      expect(formatDate(null)).toBe('—');
    });

    it('describes recency in words', () => {
      const now = new Date('2026-10-13T12:00:00Z');
      expect(timeAgo('2026-10-13T11:59:30Z', now)).toBe('just now');
      expect(timeAgo('2026-10-13T11:20:00Z', now)).toBe('40 min ago');
      expect(timeAgo('2026-10-13T08:00:00Z', now)).toBe('4 h ago');
      expect(timeAgo('2026-10-12T09:00:00Z', now)).toBe('yesterday');
      expect(timeAgo(null, now)).toBe('unknown time');
    });
  });

  describe('answerability contract', () => {
    it('formats location arrays, nested objects and unit values', () => {
      expect(
        formatAnswer({ question: 'Where are they?', source: 'locations', value: [{ location: 'North Paddock', total: 14 }] })
      ).toBe('North Paddock: 14');

      expect(
        formatAnswer({
          question: 'How are our digital channels performing?',
          source: 'channel_metrics',
          value: { reach_30d: 48200, views_30d: 18600, leads_30d: 14 }
        })
      ).toBe('Reach 48,200 · Views 18,600 · Leads 14');

      expect(formatAnswer({ question: 'Sick?', source: 'health_records', value: 3 })).toBe('3');
      expect(formatAnswer({ question: 'Mortality?', source: 'deaths', value: 2.4, unit: '%' })).toBe('2.4%');
      expect(formatAnswer({ question: 'Feed?', source: 'feed_items', value: 565, unit: 'kg' })).toBe('565 kg');
      expect(formatAnswer({ question: 'Who is working?', source: 'attendance', value: 6, headcount: 7 })).toBe(
        '6 · of 7 employees'
      );
      expect(formatAnswer({ question: 'Spend?', source: 'expenses', week: 920, month: 4840 })).toBe('Week 920 · Month 4,840');
      expect(formatAnswer({ question: 'Missing?', source: 'animals', value: null })).toBe('—');
      expect(formatAnswer(undefined)).toBe('—');
    });

    it('maps sources to the module that owns the record', () => {
      expect(routeForSource('animals, locations')).toBe('/livestock');
      expect(routeForSource('purchase_orders, goods_receipts')).toBe('/procurement');
      expect(routeForSource('channel_metrics')).toBe('/marketing/performance');
      expect(routeForSource('unknown_source')).toBeNull();
    });

    it('normalises alert severities', () => {
      expect(levelForSeverity('critical')).toBe('critical');
      expect(levelForSeverity('HIGH')).toBe('critical');
      expect(levelForSeverity('moderate')).toBe('warning');
      expect(levelForSeverity('something-else')).toBe('info');
    });

    it('reports completeness and gaps', () => {
      const view = buildCeoView(
        fixture(
          {},
          {
            1: { question: 'How many animals do we own?', value: 45, source: 'animals' },
            2: { question: 'Where are they?', value: [], source: 'locations' },
            30: { question: 'Decisions?', value: 2, source: 'decisions' }
          }
        )
      );

      expect(view.ledgerSummary).toEqual({ total: 3, answered: 2, gaps: 1, completeness: 67 });
      expect(view.ledger.map((row) => row.number)).toEqual([1, 2, 30]);
      expect(view.ledger[1].hasData).toBeFalse();
      expect(view.ledger[0].sourceRoute).toBe('/livestock');
    });

    it('exports the filtered contract as CSV', () => {
      const view = buildCeoView(
        fixture(
          {},
          {
            1: { question: 'How many animals do we own?', value: 45, source: 'animals' },
            2: { question: 'Where are they?', value: [], source: 'locations' },
            3: { question: 'How many are female?', value: null, source: 'animals' }
          }
        )
      );
      const csv = ledgerToCsv(view.ledger, view.ledgerSummary, view.periodLabel);

      // BOM so Excel reads the UTF-8 header correctly.
      expect(csv.startsWith('\uFEFF')).toBeTrue();
      expect(csv).toContain('"#","Question","Answer","System of record","Status"');
      expect(csv).toContain('"1","How many animals do we own?","45","animals","Answered"');
      expect(csv).toContain('"2","Where are they?","—","locations","Data gap"');
      expect(csv).toContain('33%');
    });
  });

  describe('view model', () => {
    it('builds every KPI group with a metric for each definition', () => {
      const view = buildCeoView(fixture());
      const metrics = view.groups.flatMap((group) => group.metrics);

      expect(view.groups.map((group) => group.id)).toEqual([
        'herd',
        'health',
        'stock',
        'ops',
        'finance',
        'growth',
        'governance'
      ]);
      expect(metrics.length).toBe(26);
      expect(metrics.every((metric) => metric.module && metric.route)).toBeTrue();
    });

    it('flags a metric as unknown when the API returns no value', () => {
      const view = buildCeoView(fixture({ days_feed_remaining: null }));
      const metric = view.groups.flatMap((group) => group.metrics).find((item) => item.key === 'days_feed_remaining');

      expect(metric?.level).toBe('unknown');
      expect(metric?.display).toBe('—');
      expect(metric?.note).toContain('daily consumption');
    });

    it('applies feed-cover and mortality thresholds', () => {
      const levels = (kpis: Partial<CeoDashboard['kpis']>) => {
        const metrics = buildCeoView(fixture(kpis)).groups.flatMap((group) => group.metrics);
        return {
          feed: metrics.find((metric) => metric.key === 'days_feed_remaining')?.level,
          mortality: metrics.find((metric) => metric.key === 'mortality_rate')?.level
        };
      };

      expect(levels({ days_feed_remaining: 5, mortality_rate: 0.4 })).toEqual({ feed: 'action', mortality: 'ok' });
      expect(levels({ days_feed_remaining: 12, mortality_rate: 3 })).toEqual({ feed: 'watch', mortality: 'watch' });
      expect(levels({ days_feed_remaining: 40, mortality_rate: 9 })).toEqual({ feed: 'ok', mortality: 'action' });
    });

    it('scales the meter against real thresholds', () => {
      const view = buildCeoView(fixture({ days_feed_remaining: FEED_COVER_TARGET_DAYS / 2, mortality_rate: 2.5 }));
      const metrics = view.groups.flatMap((group) => group.metrics);

      expect(metrics.find((metric) => metric.key === 'days_feed_remaining')?.meterValue).toBeCloseTo(0.5, 5);
      expect(metrics.find((metric) => metric.key === 'mortality_rate')?.meterValue).toBeCloseTo(0.5, 5);
    });

    it('explains an unreliable growth rate instead of printing it', () => {
      const view = buildCeoView(fixture({ herd_growth: 44, herd_growth_rate: 4400 }));
      const metric = view.groups.flatMap((group) => group.metrics).find((item) => item.key === 'herd_growth');

      expect(metric?.level).toBe('watch');
      expect(metric?.note).toBe('Opening herd was near zero, so the growth rate is not meaningful yet');
    });

    it('derives headline vitals and a status headline', () => {
      const calm = buildCeoView(
        fixture({
          sick: 0,
          under_treatment: 0,
          deaths: 0,
          mortality_rate: 0.4,
          low_stock: 0,
          open_purchase_requests: 0,
          pending_approvals: 0,
          equipment_due_maintenance: 0,
          risks: 0,
          owner_decisions_required: 0
        })
      );
      expect(calm.vitals.map((vital) => vital.key)).toEqual([
        'total_herd',
        'herd_growth',
        'mortality_rate',
        'days_feed_remaining'
      ]);
      expect(calm.status.level).toBe('clear');
      expect(calm.attentionCounts).toEqual({ critical: 0, warning: 0, info: 0 });
      expect(calm.attention).toEqual([]);

      const critical = buildCeoView(fixture({ sick: 4, owner_decisions_required: 2 }));
      expect(critical.status.level).toBe('action');
      expect(critical.attentionCounts.critical).toBeGreaterThan(0);

      // Watch-level metrics stay in their domain and are counted, not listed.
      const watching = buildCeoView(fixture({ days_feed_remaining: 12, low_stock: 1 }));
      expect(watching.attention.some((item) => item.title === 'Days of feed cover')).toBeFalse();
      expect(watching.watchSignals).toBeGreaterThan(0);
    });

    it('orders attention by severity, unread alerts first', () => {
      const dashboard = fixture({ owner_decisions_required: 0, days_feed_remaining: 30, sick: 0 });
      dashboard.alerts = [
        {
          id: 9,
          type: 'low_stock',
          severity: 'warning',
          title: 'Low stock: Ivermectin',
          message: 'Below reorder level.',
          module: 'inventory',
          triggered_at: '2026-10-13T06:00:00+00:00'
        },
        {
          id: 10,
          type: 'owner_decision',
          severity: 'info',
          title: 'Owner decision required',
          message: 'Two decisions waiting.',
          module: 'governance',
          triggered_at: '2026-10-13T05:00:00+00:00'
        }
      ];

      const view = buildCeoView(dashboard);
      expect(view.attention.map((item) => item.title)).toEqual([
        'Low stock: Ivermectin',
        'Owner decision required'
      ]);
      expect(view.attention[0].level).toBe('warning');
      expect(view.attention[0].route).toBe('/inventory');
      expect(view.attention[0].occurredLabel).toContain('ago');
      expect(view.status.level).toBe('watch');
      // The board summary also counts watch-level domain signals.
      expect(view.attentionCounts.warning).toBeGreaterThan(1);
    });

    it('builds insight panels from real records only', () => {
      const view = buildCeoView(
        fixture(
          {},
          {
            2: {
              question: 'Where are they?',
              source: 'animals, locations',
              value: [
                { location: 'North Paddock', total: 14 },
                { location: 'Maternity Barn', total: 7 }
              ]
            }
          }
        )
      );

      expect(view.insights.herdByLocationTotal).toBe(21);
      expect(view.insights.herdByLocation[0].shareDisplay).toBe('67%');
      expect(view.insights.mix.femaleShare).toBeCloseTo(30 / 45, 5);
      expect(view.insights.digitalDisplay.reach).toBe('48,200');
      expect(view.insights.spend[1].display).toBe('4,840');
      expect(view.insights.feedCover.ratio).toBeCloseTo(21 / FEED_COVER_TARGET_DAYS, 5);
    });

    it('survives an empty payload without throwing', () => {
      const empty: CeoDashboard = {
        generated_at: '2026-10-13T08:15:00+00:00',
        from: '2026-09-13',
        to: '2026-10-13',
        kpis: {} as CeoDashboard['kpis'],
        answers: {},
        alerts: []
      };

      const view = buildCeoView(empty);
      expect(view.groups.flatMap((group) => group.metrics).every((metric) => metric.level === 'unknown')).toBeTrue();
      expect(view.ledgerSummary.total).toBe(0);
      expect(view.insights.herdByLocation).toEqual([]);
      expect(view.insights.feedCover.ratio).toBeNull();
      expect(view.status.level).toBe('clear');
    });
  });
});
