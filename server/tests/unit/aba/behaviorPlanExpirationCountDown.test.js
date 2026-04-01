const { behaviorPlanExpirationCountDown } = require('../../../functions/aba/behaviorPlanExpirationCountDown');

describe('behaviorPlanExpirationCountDown', () => {
  it('returns zero when the target date has already passed', async () => {
    await expect(behaviorPlanExpirationCountDown('2000-01-01')).resolves.toBe(0);
  });

  it('returns a positive countdown for a future date', async () => {
    const future = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();

    await expect(behaviorPlanExpirationCountDown(future)).resolves.toBeGreaterThanOrEqual(4);
  });

  it('rejects invalid target dates', async () => {
    await expect(behaviorPlanExpirationCountDown('not-a-date')).rejects.toThrow(
      'Invalid target date',
    );
  });
});
