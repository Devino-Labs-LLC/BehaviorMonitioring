const { addDays, addYears } = require('../../../functions/base/addDayYear');

describe('addDayYear', () => {
  it('adds days to a date', async () => {
    const result = await addDays('2026-03-31T00:00:00.000Z', 5);

    expect(result.toISOString()).toBe('2026-04-05T00:00:00.000Z');
  });

  it('adds years to a date', async () => {
    const result = await addYears('2026-03-31T00:00:00.000Z', 2);

    expect(result.toISOString()).toBe('2028-03-31T00:00:00.000Z');
  });
});
