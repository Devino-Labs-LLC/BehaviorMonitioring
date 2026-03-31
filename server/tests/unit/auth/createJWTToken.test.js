jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'signed-token'),
}));

describe('createJWTToken helpers', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      JWT_SECRET: 'jwt-secret',
      JWT_REFRESH_SECRET: 'refresh-secret',
      REFRESH_TOKEN_TTL_DAYS: '7',
      ClientHost: 'http://localhost:3000',
      HOST: 'http://localhost',
      PORT: '3001',
      IN_PROD: 'false',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('creates an access token with the expected claims', () => {
    const jwt = require('jsonwebtoken');
    const { createJWTToken } = require('../../../auth/createJWTToken');

    const token = createJWTToken({ sub: 1, email: 'user@example.com' });

    expect(token).toBe('signed-token');
    expect(jwt.sign).toHaveBeenCalledWith(
      { sub: 1, email: 'user@example.com' },
      'jwt-secret',
      expect.objectContaining({
        expiresIn: '1h',
        issuer: 'http://localhost:3001',
        audience: 'http://localhost:3000',
      })
    );
  });

  it('throws when the access token secret is missing', () => {
    delete process.env.JWT_SECRET;
    const { createJWTToken } = require('../../../auth/createJWTToken');

    expect(() => createJWTToken({ sub: 1 })).toThrow(
      'JWT_SECRET environment variable is not set. Cannot create JWT token.'
    );
  });

  it('creates a refresh token with the refresh secret', () => {
    const jwt = require('jsonwebtoken');
    const { createRefreshToken } = require('../../../auth/createJWTToken');

    const token = createRefreshToken({ sub: 1 });

    expect(token).toBe('signed-token');
    expect(jwt.sign).toHaveBeenCalledWith(
      { sub: 1 },
      'refresh-secret',
      expect.objectContaining({
        expiresIn: '7d',
        issuer: 'http://localhost',
        audience: 'http://localhost:3000',
      })
    );
  });
});
