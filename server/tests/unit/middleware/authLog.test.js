const { AuthLog } = require('../../../models');
const logAuthEvent = require('../../../middleware/helpers/authLog');

jest.mock('../../../models', () => ({
  AuthLog: {
    create: jest.fn(),
  },
}));

describe('authLog helper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  it('writes auth log entries with the provided metadata', async () => {
    AuthLog.create.mockResolvedValue({ id: 1 });

    logAuthEvent('login_success', {
      userId: 7,
      email: 'user@example.com',
      ip: '127.0.0.1',
      userAgent: 'jest',
      details: { source: 'unit-test' },
    });

    await Promise.resolve();

    expect(AuthLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'login_success',
        userId: 7,
        email: 'user@example.com',
        ip: '127.0.0.1',
        userAgent: 'jest',
        details: { source: 'unit-test' },
        timestamp: expect.any(String),
      }),
    );
  });

  it('logs insertion failures without throwing', async () => {
    AuthLog.create.mockRejectedValue(new Error('insert failed'));

    logAuthEvent('login_failure');

    await Promise.resolve();
    await Promise.resolve();

    expect(console.error).toHaveBeenCalledWith('Failed to insert auth log:', 'insert failed');
  });
});
