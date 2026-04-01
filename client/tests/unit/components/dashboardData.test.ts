import { buildDashboardView, type BehaviorEntry } from '../../../src/components/dashboardData';

describe('dashboardData helpers', () => {
  it('builds an empty dashboard view with the expected defaults', () => {
    const view = buildDashboardView([], {
      start: '2026-03-01',
      end: '2026-03-07',
    });

    expect(view.meta).toEqual({ start: '2026-03-01', end: '2026-03-07' });
    expect(view.kpis.dataPoints).toBe(0);
    expect(view.kpis.sessionsLogged).toBe(0);
    expect(view.kpis.topBehaviorName).toBe('');
    expect(view.kpis.lastEntryLabel).toBe('No entries yet');
    expect(view.trend.series).toEqual([]);
    expect(view.recent).toEqual([]);
    expect(view.dailyTotals).toHaveLength(7);
    expect(view.alerts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'no-data',
          level: 'high',
        }),
      ]),
    );
  });

  it('builds KPI, trend, recent activity, and spike alert data for mixed entries', () => {
    const entries: BehaviorEntry[] = [
      {
        behaviorName: 'Aggression',
        sessionDate: '2026-03-01T12:00:00.000Z',
        measurementType: 'Frequency',
        count: 1,
      },
      {
        behaviorName: 'Aggression',
        sessionDate: '2026-03-09T12:00:00.000Z',
        measurementType: 'Frequency',
        count: 6,
      },
      {
        behaviorName: 'Elopement',
        sessionDate: '2026-03-10T12:00:00.000Z',
        measurementType: 'Duration',
        duration: 7,
      },
      {
        behaviorName: 'Property Destruction',
        sessionDate: '2026-03-10T12:30:00.000Z',
        measurementType: 'Frequency',
        count: 8,
      },
      {
        behaviorName: 'Aggression',
        sessionDate: '2026-03-11T12:00:00.000Z',
        measurementType: 'Frequency',
        count: 9,
      },
      {
        behaviorName: 'Elopement',
        sessionDate: '2026-03-12T12:00:00.000Z',
        measurementType: 'Duration',
        duration: 10,
      },
    ];

    const view = buildDashboardView(entries, {
      start: '2026-03-01',
      end: '2026-03-12',
    });

    expect(view.kpis.dataPoints).toBe(6);
    expect(view.kpis.sessionsLogged).toBe(5);
    expect(view.kpis.topBehaviorName).toBe('Elopement');
    expect(view.kpis.topBehaviorDetail).toBe('Total: 17');
    expect(view.kpis.daysSinceLastEntry).toBe(0);
    expect(view.kpis.lastDay).toBe('2026-03-12');
    expect(view.kpis.lastEntryLabel).toBe('Last: 2026-03-12');
    expect(view.kpis.sessionsDeltaLabel).toBe('vs previous range (optional)');

    expect(view.trend.series).toEqual([
      { name: 'Elopement', key: 'b0' },
      { name: 'Aggression', key: 'b1' },
      { name: 'Property Destruction', key: 'b2' },
    ]);

    expect(view.dailyTotals).toEqual(
      expect.arrayContaining([
        { date: '2026-03-01', total: 1 },
        { date: '2026-03-10', total: 15 },
        { date: '2026-03-12', total: 10 },
      ]),
    );

    expect(view.recent[0]).toEqual(
      expect.objectContaining({
        behaviorName: 'Elopement',
        sessionDate: '2026-03-12',
        valueLabel: '10',
      }),
    );

    expect(view.alerts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'spike',
          level: 'med',
        }),
      ]),
    );
  });

  it('adds a gap alert when the last entry is at least three days old', () => {
    const view = buildDashboardView(
      [
        {
          behaviorName: 'Aggression',
          sessionDate: '2026-03-01',
          measurementType: 'Frequency',
          count: 2,
        },
      ],
      {
        start: '2026-03-01',
        end: '2026-03-08',
      },
    );

    expect(view.alerts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'gap',
          level: 'high',
          title: 'Data gap: 7 days',
        }),
      ]),
    );
  });
});
