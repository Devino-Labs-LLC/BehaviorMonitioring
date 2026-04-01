const {
  dateTimeFormat,
  formatDateString,
  formatTimeString,
} = require('../../../functions/base/dateTimeFormat');

describe('dateTimeFormat helpers', () => {
  it('normalizes a date string to yyyy-MM-dd', async () => {
    await expect(dateTimeFormat('2026-03-31')).resolves.toBe('2026-03-31');
  });

  it('formats a Date object as yyyy-MM-dd', async () => {
    const value = new Date('2026-03-31T15:45:00.000Z');

    await expect(formatDateString(value)).resolves.toBe('2026-03-31');
  });

  it('formats a 24-hour time string as EST 12-hour time', async () => {
    await expect(formatTimeString('13:05')).resolves.toBe('01:05:00 PM EST');
  });
});
