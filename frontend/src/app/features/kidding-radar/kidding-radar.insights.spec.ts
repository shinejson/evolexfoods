import { GestationRadar, RadarEntry } from './kidding-radar.models';
import { bucketFor, buildRadarView, daysToDue, gestationDaysFor, normaliseEntry, trackPosition } from './kidding-radar.insights';

const TODAY = '2026-10-13';

function entry(overrides: Partial<RadarEntry> = {}): RadarEntry {
  return {
    pregnancy_id: 1,
    animal_id: 1,
    animal_code: 'EV-GT-000001',
    species: 'goat',
    breed: 'West African Dwarf',
    location: 'Maternity Barn',
    location_id: 4,
    sire_code: 'EV-GT-000009',
    confirmed_date: '2026-08-04',
    breeding_date: '2026-07-14',
    expected_birth_date: '2026-10-20',
    expected_birth_date_source: 'recorded',
    record_source: 'pregnancy',
    gestation_days: 150,
    days_to_due: 7,
    bucket: '7',
    horizon: 7,
    gestation_progress: 0.95,
    gestation_percent: 95,
    stage: 'late',
    attention: false,
    ...overrides
  };
}

describe('kidding radar insights', () => {
  it('uses 150 days gestation for goats and sheep, 283 for cattle', () => {
    expect(gestationDaysFor('goat')).toBe(150);
    expect(gestationDaysFor('sheep')).toBe(150);
    expect(gestationDaysFor('cattle')).toBe(283);
    expect(gestationDaysFor(null)).toBe(150);
  });

  it('computes signed days to due and horizons buckets', () => {
    expect(daysToDue('2026-10-20', TODAY)).toBe(7);
    expect(daysToDue('2026-10-10', TODAY)).toBe(-3);
    expect(daysToDue(null, TODAY)).toBeNull();
    expect(bucketFor(-1)).toBe('overdue');
    expect(bucketFor(0)).toBe('7');
    expect(bucketFor(7)).toBe('7');
    expect(bucketFor(8)).toBe('30');
    expect(bucketFor(30)).toBe('30');
    expect(bucketFor(45)).toBe('60');
    expect(bucketFor(90)).toBe('90');
    expect(bucketFor(91)).toBe('beyond');
  });

  it('recomputes missing radar fields from the due date', () => {
    const normalised = normaliseEntry(
      entry({ days_to_due: null as unknown as number, gestation_progress: 0, expected_birth_date: '2026-10-10' }),
      TODAY
    );
    expect(normalised.days_to_due).toBe(-3);
    expect(normalised.bucket).toBe('overdue');
    expect(normalised.attention).toBeTrue();
    expect(normalised.gestation_percent).toBeGreaterThan(95);
  });

  it('partitions entries into exclusive buckets and cumulative horizons', () => {
    const payload: GestationRadar = {
      generated_at: '2026-10-13T07:00:00Z',
      today: TODAY,
      gestation_days: { goat: 150, sheep: 150, cattle: 283 },
      total_active: 4,
      overdue: 1,
      horizons: [],
      buckets: [],
      entries: [
        entry({ animal_code: 'EV-GT-000001', expected_birth_date: '2026-10-10', days_to_due: -3 }),
        entry({ animal_code: 'EV-GT-000002', expected_birth_date: '2026-10-18', days_to_due: 5 }),
        entry({ animal_code: 'EV-SH-000003', expected_birth_date: '2026-11-20', days_to_due: 38, species: 'sheep' }),
        entry({ animal_code: 'EV-CT-000004', expected_birth_date: '2027-03-01', days_to_due: 139, species: 'cattle' })
      ],
      source: 'pregnancies, animals'
    };

    const view = buildRadarView(payload, TODAY);

    expect(view.totalActive).toBe(4);
    expect(view.overdue).toBe(1);
    expect(view.buckets.reduce((sum, bucket) => sum + bucket.count, 0)).toBe(4);
    expect(view.buckets.find((b) => b.key === 'overdue')?.entries[0].animal_code).toBe('EV-GT-000001');
    // Cumulative horizons: 5-day entry counts at 7/30/60/90; the overdue one counts nowhere.
    expect(view.horizons.map((h) => h.count)).toEqual([1, 1, 2, 2]);
    expect(view.entries[0].animal_code).toBe('EV-GT-000001');
    expect(view.nextDue?.animal_code).toBe('EV-GT-000002');
  });

  it('positions overdue entries at the start of the horizon track', () => {
    const view = buildRadarView(
      {
        generated_at: '', today: TODAY, gestation_days: {}, total_active: 1, overdue: 1,
        horizons: [], buckets: [], entries: [entry({ days_to_due: -4 })], source: ''
      },
      TODAY
    );
    expect(trackPosition(view.entries[0], view)).toBe(0);
  });
});
