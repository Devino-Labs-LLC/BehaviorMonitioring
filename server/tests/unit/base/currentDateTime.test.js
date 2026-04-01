describe('currentDateTime helpers', () => {
  let RealDate;

  beforeEach(() => {
    jest.resetModules();
    RealDate = Date;
  });

  afterEach(() => {
    global.Date = RealDate;
  });

  it('returns the current date in America/New_York format', async () => {
    const fixedDate = new RealDate('2026-03-31T15:45:30Z');
    global.Date = class extends RealDate {
      constructor(...args) {
        return args.length ? new RealDate(...args) : fixedDate;
      }
    };

    const { getCurrentDate } = require('../../../functions/base/currentDateTime');

    await expect(getCurrentDate()).resolves.toBe(
      fixedDate.toLocaleDateString('en-US', { timeZone: 'America/New_York' }),
    );
  });

  it('returns the current time in America/New_York format', async () => {
    const fixedDate = new RealDate('2026-03-31T15:45:30Z');
    global.Date = class extends RealDate {
      constructor(...args) {
        return args.length ? new RealDate(...args) : fixedDate;
      }
    };

    const { getCurrentTime } = require('../../../functions/base/currentDateTime');

    await expect(getCurrentTime()).resolves.toBe(
      fixedDate.toLocaleTimeString('en-US', {
        timeZone: 'America/New_York',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    );
  });

  it('rejects when date localization throws', async () => {
    global.Date = class extends RealDate {
      toLocaleDateString() {
        throw new Error('date failure');
      }
    };

    const { getCurrentDate } = require('../../../functions/base/currentDateTime');

    await expect(getCurrentDate()).rejects.toThrow('date failure');
  });

  it('rejects when time localization throws', async () => {
    global.Date = class extends RealDate {
      toLocaleTimeString() {
        throw new Error('time failure');
      }
    };

    const { getCurrentTime } = require('../../../functions/base/currentDateTime');

    await expect(getCurrentTime()).rejects.toThrow('time failure');
  });
});
