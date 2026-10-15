import { PurchaseRequestRecord } from './procurement.models';
import { buildQueues, canDecide, routingSummary, stageOf, tierForCost } from './procurement.insights';

function request(overrides: Partial<PurchaseRequestRecord> = {}): PurchaseRequestRecord {
  return {
    id: 1,
    request_number: 'PR-2026-001',
    requested_by: 4,
    requested_at: '2026-10-12',
    item_name: 'Dairy Mash',
    category: 'Feed',
    quantity: 500,
    unit: 'kg',
    estimated_cost: 440,
    priority: 'normal',
    status: 'pending',
    justification: null,
    approval_tier: 1,
    approval_stage: 'pending_tier_1',
    required_approver_role: 'supervisor',
    ...overrides
  };
}

describe('procurement approval matrix insights', () => {
  it('routes at or below GH₵1,000 to Tier 1 and above it to Tier 2', () => {
    expect(tierForCost(0)).toBe(1);
    expect(tierForCost(999.99)).toBe(1);
    expect(tierForCost(1000)).toBe(1);
    expect(tierForCost(1000.01)).toBe(2);
    expect(tierForCost(null)).toBe(1);
    expect(routingSummary(2100)).toContain('Executive');
    expect(routingSummary(440)).toContain('Supervisor');
  });

  it('derives the stage for legacy rows without stored routing', () => {
    expect(stageOf(request({ approval_stage: '', approval_tier: 2, estimated_cost: 2100 }))).toBe('pending_tier_2');
    expect(stageOf(request({ approval_stage: '', status: 'approved' }))).toBe('approved');
  });

  it('only lets the routed tier decide', () => {
    const tier1 = request();
    const tier2 = request({ approval_tier: 2, approval_stage: 'pending_tier_2', estimated_cost: 2100 });
    expect(canDecide('farm_manager', tier1)).toBeTrue();
    expect(canDecide('procurement', tier1)).toBeTrue();
    expect(canDecide('farm_manager', tier2)).toBeFalse();
    expect(canDecide('procurement', tier2)).toBeFalse();
    expect(canDecide('executive', tier2)).toBeTrue();
    expect(canDecide('owner', tier2)).toBeTrue();
    expect(canDecide('finance', tier1)).toBeFalse();
    expect(canDecide('executive', request({ status: 'approved', approval_stage: 'approved' }))).toBeFalse();
  });

  it('splits the queue by who must act next', () => {
    const queues = buildQueues(
      [
        request({ id: 1 }),
        request({ id: 2, approval_tier: 2, approval_stage: 'pending_tier_2', estimated_cost: 2100 }),
        request({ id: 3, status: 'approved', approval_stage: 'approved' }),
        request({ id: 4, status: 'ordered', approval_stage: 'ordered' })
      ],
      'executive'
    );
    expect(queues.awaitingYou.map((r) => r.id)).toEqual([1, 2]);
    expect(queues.readyForPo.map((r) => r.id)).toEqual([3]);
    expect(queues.closed.map((r) => r.id)).toEqual([4]);
  });
});
