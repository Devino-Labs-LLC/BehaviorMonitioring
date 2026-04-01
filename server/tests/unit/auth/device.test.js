jest.mock('node:crypto', () => ({
  randomUUID: jest.fn(() => 'generated-device-id'),
}));

const crypto = require('node:crypto');
const { getOrCreateDeviceId } = require('../../../auth/device');

describe('device auth helper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.IN_PROD = 'false';
  });

  it('returns the existing device id cookie when present', () => {
    const req = { cookies: { bmDeviceId: 'existing-device-id' } };
    const res = { cookie: jest.fn() };

    const deviceId = getOrCreateDeviceId(req, res);

    expect(deviceId).toBe('existing-device-id');
    expect(res.cookie).not.toHaveBeenCalled();
  });

  it('creates and stores a device id when the cookie is missing', () => {
    const req = { cookies: {} };
    const res = { cookie: jest.fn() };

    const deviceId = getOrCreateDeviceId(req, res);

    expect(deviceId).toBe('generated-device-id');
    expect(crypto.randomUUID).toHaveBeenCalled();
    expect(res.cookie).toHaveBeenCalledWith(
      'bmDeviceId',
      'generated-device-id',
      expect.objectContaining({
        httpOnly: false,
        secure: false,
        sameSite: 'lax',
      })
    );
  });
});
