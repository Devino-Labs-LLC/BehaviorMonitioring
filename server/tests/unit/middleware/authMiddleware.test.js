jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

jest.mock('../../../middleware/helpers/authLog', () => jest.fn());

describe('authMiddleware', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      JWT_SECRET: 'jwt-secret',
      ClientHost: 'http://localhost:3000',
      HOST: 'http://localhost',
      PORT: '3001',
      IN_PROD: 'false',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('rejects missing bearer tokens', () => {
    const logAuthEvent = require('../../../middleware/helpers/authLog');
    const authMiddleware = require('../../../middleware/authMiddleware');
    const req = {
      headers: {},
      ip: '127.0.0.1',
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing or invalid Authorization header' });
    expect(logAuthEvent).toHaveBeenCalledWith(
      'MISSING_OR_INVALID_AUTH_HEADER',
      expect.objectContaining({
        ip: '127.0.0.1',
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('attaches the verified payload to the request', () => {
    const jwt = require('jsonwebtoken');
    const authMiddleware = require('../../../middleware/authMiddleware');
    jwt.verify.mockReturnValue({ sub: 1, email: 'user@example.com' });
    const req = {
      headers: {
        authorization: 'Bearer token-123',
        'user-agent': 'jest-agent',
      },
      ip: '127.0.0.1',
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(jwt.verify).toHaveBeenCalledWith(
      'token-123',
      'jwt-secret',
      expect.objectContaining({
        algorithms: ['HS256'],
        issuer: 'http://localhost:3001',
        audience: 'http://localhost:3000',
      })
    );
    expect(req.user).toEqual({ sub: 1, email: 'user@example.com' });
    expect(next).toHaveBeenCalled();
  });

  it('rejects invalid tokens', () => {
    const jwt = require('jsonwebtoken');
    const logAuthEvent = require('../../../middleware/helpers/authLog');
    const authMiddleware = require('../../../middleware/authMiddleware');
    jwt.verify.mockImplementation(() => {
      throw new Error('jwt expired');
    });
    const req = {
      headers: {
        authorization: 'Bearer expired-token',
        'user-agent': 'jest-agent',
      },
      ip: '127.0.0.1',
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    authMiddleware(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
    expect(logAuthEvent).toHaveBeenCalledWith(
      'JWT_VERIFY_FAILED',
      expect.objectContaining({
        details: 'jwt expired',
      })
    );
  });
});
