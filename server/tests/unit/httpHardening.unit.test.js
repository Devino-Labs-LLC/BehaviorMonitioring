const { configureTrustProxy } = require('../../middleware/trustProxy');
const { isApiPath, API_PREFIXES } = require('../../middleware/apiPaths');
const {
  parseAllowedHosts,
  normalizeHostname,
  createHostValidationMiddleware,
} = require('../../middleware/hostValidation');
const { notFoundHandler } = require('../../middleware/notFoundHandler');
const { errorHandler, clientMessage } = require('../../middleware/errorHandler');
const { registerProcessGuards } = require('../../lib/processGuards');

describe('trustProxy', () => {
  it('defaults to one hop and allows explicit disable', () => {
    const app = { set: jest.fn() };
    delete process.env.TRUST_PROXY;
    expect(configureTrustProxy(app)).toEqual({ mode: 1, source: 'default' });
    expect(app.set).toHaveBeenCalledWith('trust proxy', 1);

    process.env.TRUST_PROXY = 'false';
    expect(configureTrustProxy(app).mode).toBe(false);
    expect(app.set).toHaveBeenCalledWith('trust proxy', false);

    process.env.TRUST_PROXY = '2';
    expect(configureTrustProxy(app)).toEqual({ mode: 2, source: '2' });
  });

  it('does not blindly trust all proxies', () => {
    const app = { set: jest.fn() };
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    process.env.TRUST_PROXY = 'true';
    expect(configureTrustProxy(app).mode).toBe(1);
    process.env.TRUST_PROXY = '*';
    expect(configureTrustProxy(app).mode).toBe(1);
    warn.mockRestore();
  });
});

describe('apiPaths', () => {
  it('recognizes BMetrics API prefixes', () => {
    expect(API_PREFIXES).toEqual(
      expect.arrayContaining(['/auth', '/admin', '/employee', '/aba', '/csrf-token']),
    );
    expect(isApiPath('/auth/login')).toBe(true);
    expect(isApiPath('/admin')).toBe(true);
    expect(isApiPath('/wp-admin')).toBe(false);
    expect(isApiPath('/healthz')).toBe(false);
  });
});

describe('hostValidation', () => {
  it('normalizes hosts and stays disabled without ALLOWED_HOSTS', () => {
    expect(parseAllowedHosts(undefined)).toBeNull();
    expect(normalizeHostname('Example.COM:8443')).toBe('example.com');
  });

  it('rejects invalid hosts and exempts healthz', () => {
    process.env.ALLOWED_HOSTS = 'api.example.com';
    const mw = createHostValidationMiddleware();
    const next = jest.fn();
    const res = {
      status: jest.fn().mockReturnThis(),
      type: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };

    mw({ path: '/healthz', headers: { host: '10.0.0.1' } }, res, next);
    expect(next).toHaveBeenCalled();

    next.mockClear();
    mw({ path: '/', headers: { host: 'evil.com' }, hostname: 'evil.com' }, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
    delete process.env.ALLOWED_HOSTS;
  });
});

describe('notFoundHandler and errorHandler', () => {
  it('returns JSON for API and text for non-API without redirect', () => {
    const apiRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      redirect: jest.fn(),
    };
    notFoundHandler({ path: '/employee/missing' }, apiRes, jest.fn());
    expect(apiRes.redirect).not.toHaveBeenCalled();
    expect(apiRes.json).toHaveBeenCalled();

    const plainRes = {
      status: jest.fn().mockReturnThis(),
      type: jest.fn().mockReturnThis(),
      send: jest.fn(),
      redirect: jest.fn(),
    };
    notFoundHandler({ path: '/robots.txt' }, plainRes, jest.fn());
    expect(plainRes.type).toHaveBeenCalledWith('text/plain');
  });

  it('does not expose stack traces in production client messages', () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const err = new Error('boom');
    err.stack = 'Error: boom\n    at secret.js:1';
    expect(clientMessage(err, 500)).toBe('Internal Server Error');
    process.env.NODE_ENV = prev;
  });

  it('logs only 5xx via errorHandler', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const res = {
      headersSent: false,
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      type: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    errorHandler({ status: 404, message: 'Not Found' }, { path: '/auth/x', accepts: () => 'json' }, res, jest.fn());
    expect(errorSpy).not.toHaveBeenCalled();
    errorHandler(new Error('fail'), { path: '/auth/x', method: 'GET', accepts: () => 'json' }, res, jest.fn());
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

describe('processGuards', () => {
  it('registers and disposes listeners without exiting on rejection log path', () => {
    const exit = jest.fn();
    const logger = { error: jest.fn() };
    const guards = registerProcessGuards({ exit, logger });
    process.emit('unhandledRejection', new Error('async fail'));
    expect(logger.error).toHaveBeenCalled();
    expect(exit).not.toHaveBeenCalled();
    guards.dispose();
  });
});
