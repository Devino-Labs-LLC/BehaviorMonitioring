process.env.SKIP_SERVER_BOOTSTRAP = 'true';
process.env.LOG_SCANNER_REQUESTS = 'false';
process.env.SKIP_CSRF_PROTECTION = 'false';
process.env.TRUST_PROXY = '1';
delete process.env.ALLOWED_HOSTS;

jest.mock('../../middleware/helpers/authLog', () => jest.fn());
jest.mock('../../middleware/rateLimiter', () => ({
  generalLimiter: (req, res, next) => next(),
  apiLimiter: (req, res, next) => next(),
  authLimiter: (req, res, next) => next(),
  passwordResetLimiter: (req, res, next) => next(),
}));

const request = require('supertest');
const logAuthEvent = require('../../middleware/helpers/authLog');
const { AuthLog } = require('../../models');
const { registerGracefulShutdown } = require('../../lib/gracefulShutdown');
const { createApp } = require('../../index');
const {
  formatLogEntry,
  isRoutineScanner404,
} = require('../../middleware/requestLogger');
const {
  parseAllowedHosts,
  normalizeHostname,
} = require('../../middleware/hostValidation');
const { resolveStatus } = require('../../middleware/errorHandler');
const { assertProductionDbHost } = require('../../config/assertProductionDbHost');

describe('HTTP 4xx hardening', () => {
  let app;
  let exitSpy;

  beforeAll(() => {
    app = createApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});
    delete process.env.ALLOWED_HOSTS;
  });

  afterEach(() => {
    exitSpy.mockRestore();
  });

  it('GET /healthz returns 200 without authentication', async () => {
    const res = await request(app).get('/healthz');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true, service: 'bmetrics-api' });
    expect(logAuthEvent).not.toHaveBeenCalled();
  });

  it('GET /healthz is not blocked by CSRF', async () => {
    const res = await request(app)
      .get('/healthz')
      .set('Cookie', 'psifi.x-csrf-token=not-a-real-token');
    expect(res.status).toBe(200);
  });

  it('GET /healthz remains reachable with a non-allowlisted Host when Host validation is enabled', async () => {
    process.env.ALLOWED_HOSTS = 'api.allowed.example';
    const isolated = createApp();
    const res = await request(isolated)
      .get('/healthz')
      .set('Host', '10.0.0.25');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('a valid API route still works', async () => {
    const res = await request(app).get('/csrf-token');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('csrfToken');
  });

  it('unknown API path returns JSON 404', async () => {
    const res = await request(app).get('/auth/this-route-does-not-exist');
    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body).toMatchObject({
      statusCode: 404,
      success: false,
      error: { code: 'ROUTE_NOT_FOUND' },
    });
  });

  it('unknown API path does not redirect', async () => {
    const res = await request(app).get('/auth/missing-route');
    expect(res.status).toBe(404);
    expect(res.headers.location).toBeUndefined();
  });

  it('unknown non-API path returns text/plain 404', async () => {
    const res = await request(app).get('/wp-admin/setup');
    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/text\/plain/);
    expect(res.text).toBe('Not Found');
    expect(res.headers.location).toBeUndefined();
  });

  it('malformed JSON returns a controlled 400', async () => {
    const tokenRes = await request(app).get('/csrf-token');
    const csrfToken = tokenRes.body.csrfToken;
    const cookie = tokenRes.headers['set-cookie'];

    const res = await request(app)
      .post('/auth/verifyEmployeeLogin')
      .set('Cookie', cookie)
      .set('x-csrf-token', csrfToken)
      .set('Content-Type', 'application/json')
      .send('{"not":"json"');

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      statusCode: 400,
      success: false,
    });
    expect(JSON.stringify(res.body).toLowerCase()).not.toMatch(/stack|password|secret/);
  });

  it('invalid CSRF returns a controlled 403', async () => {
    const res = await request(app)
      .post('/auth/verifyEmployeeLogin')
      .set('Content-Type', 'application/json')
      .send({ email: 'a@b.com', password: 'x' });

    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({
      statusCode: 403,
      success: false,
      message: 'Invalid or missing CSRF token',
      errorMessage: 'Invalid or missing CSRF token',
    });
  });

  it('missing authentication on a real protected route remains audited', async () => {
    logAuthEvent.mockClear();
    const tokenRes = await request(app).get('/csrf-token');
    const csrfToken = tokenRes.body.csrfToken;
    const cookie = tokenRes.headers['set-cookie'];

    const res = await request(app)
      .post('/admin/getAllAdmins')
      .set('Cookie', cookie)
      .set('x-csrf-token', csrfToken)
      .send({});

    expect(res.status).toBe(401);
    expect(logAuthEvent).toHaveBeenCalledWith(
      'MISSING_OR_INVALID_AUTH_HEADER',
      expect.any(Object),
    );
  });

  it('anonymous scanner paths under protected mounts return 401 without AuthLog DB work', async () => {
    logAuthEvent.mockClear();
    AuthLog.create.mockClear();

    const res = await request(app).get('/admin/definitely-not-a-real-route');

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({
      error: 'Missing or invalid Authorization header',
    });
    expect(res.status).not.toBe(200);
    expect(logAuthEvent).not.toHaveBeenCalled();
    expect(AuthLog.create).not.toHaveBeenCalled();
  });

  it('invalid bearer tokens against protected mounts remain audited', async () => {
    logAuthEvent.mockClear();

    const res = await request(app)
      .get('/admin/definitely-not-a-real-route')
      .set('Authorization', 'Bearer not-a-real-jwt');

    expect(res.status).toBe(401);
    expect(logAuthEvent).toHaveBeenCalledWith(
      'JWT_VERIFY_FAILED',
      expect.any(Object),
    );
  });

  it('expected 4xx responses do not enter the 5xx handler log path', async () => {
    const errorSpy = jest.spyOn(console, 'error');
    await request(app).get('/auth/missing');
    await request(app).get('/nope');
    const unhandled = errorSpy.mock.calls.filter(
      (args) => typeof args[0] === 'string' && args[0].startsWith('Unhandled error:'),
    );
    expect(unhandled).toHaveLength(0);
    errorSpy.mockRestore();
  });

  it('expected 4xx responses do not terminate the process', async () => {
    await request(app).get('/auth/missing');
    await request(app).get('/wp-login.php');
    await request(app).post('/auth/verifyEmployeeLogin').send({});
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('unknown non-API routes do not invoke AuthLog / DB auth work', async () => {
    AuthLog.create.mockClear();
    logAuthEvent.mockClear();
    await request(app).get('/.env');
    expect(logAuthEvent).not.toHaveBeenCalled();
    expect(AuthLog.create).not.toHaveBeenCalled();
  });

  it('unknown non-protected paths do not run auth middleware logging', async () => {
    logAuthEvent.mockClear();
    await request(app).get('/csrf-token-missing-path-outside');
    // non-API path under catch-all — no auth
    expect(logAuthEvent).not.toHaveBeenCalled();
  });

  it('Host validation rejects non-allowlisted hosts when enabled', async () => {
    process.env.ALLOWED_HOSTS = 'api.allowed.example';
    const isolated = createApp();
    const res = await request(isolated)
      .get('/')
      .set('Host', 'evil.example');
    expect(res.status).toBe(400);
    expect(res.text).toBe('Invalid Host header');
  });

  it('ALLOWED_HOSTS is the only allowlist source', () => {
    process.env.HOST = 'http://should-not-matter.example';
    process.env.ClientHost = 'https://frontend.example';
    process.env.AmplifyHost = 'https://amplify.example';
    expect(parseAllowedHosts(undefined)).toBeNull();
    expect(parseAllowedHosts('')).toBeNull();
    expect(parseAllowedHosts('api.allowed.example')).toEqual(
      new Set(['api.allowed.example']),
    );
    expect(normalizeHostname('API.Allowed.Example:443')).toBe('api.allowed.example');
  });

  it('request logging does not expose Authorization, cookies, tokens, or passwords', () => {
    const entry = formatLogEntry(
      {
        method: 'POST',
        path: '/auth/verifyEmployeeLogin',
        originalUrl: '/auth/verifyEmployeeLogin?token=secret-jwt',
        headers: {
          authorization: 'Bearer super-secret',
          cookie: 'bmRefreshToken=refresh-secret',
        },
        body: { password: 'hunter2', csrfToken: 'csrf-secret' },
      },
      { statusCode: 401 },
      12,
    );
    expect(entry).not.toMatch(/super-secret|refresh-secret|hunter2|csrf-secret|Bearer|password/i);
    expect(entry).toContain('POST /auth/verifyEmployeeLogin 401');
  });

  it('routine scanner 404s are suppressed when LOG_SCANNER_REQUESTS is false', () => {
    process.env.LOG_SCANNER_REQUESTS = 'false';
    expect(isRoutineScanner404({ method: 'GET', path: '/wp-admin' }, 404)).toBe(true);
    process.env.LOG_SCANNER_REQUESTS = 'true';
    expect(isRoutineScanner404({ method: 'GET', path: '/wp-admin' }, 404)).toBe(false);
    process.env.LOG_SCANNER_REQUESTS = 'false';
  });

  it('resolveStatus keeps operational 4xx out of the 500 bucket', () => {
    expect(resolveStatus({ status: 404 })).toBe(404);
    expect(resolveStatus({ status: 403, message: 'Not allowed by CORS' })).toBe(403);
    expect(resolveStatus({ type: 'entity.parse.failed' })).toBe(400);
    expect(resolveStatus(new Error('boom'))).toBe(500);
  });

  it('graceful shutdown closes test-created resources without open signal handlers', async () => {
    const close = jest.fn((cb) => cb && cb());
    const sequelizeClose = jest.fn().mockResolvedValue(undefined);
    const exit = jest.fn();
    const server = { close };
    const { shutdown, dispose } = registerGracefulShutdown({
      server,
      getSequelize: () => ({ close: sequelizeClose }),
      drainMs: 1000,
      exit,
      logger: { log: jest.fn(), error: jest.fn() },
    });

    await shutdown('SIGTERM');
    expect(close).toHaveBeenCalled();
    expect(sequelizeClose).toHaveBeenCalled();
    expect(exit).toHaveBeenCalledWith(0);
    dispose();
  });

  it('production DB host assertion rejects loopback hosts', () => {
    expect(() =>
      assertProductionDbHost({
        NODE_ENV: 'production',
        MYSQL_HOST: '127.0.0.1',
      }),
    ).toThrow(/loopback/i);
    expect(() =>
      assertProductionDbHost({
        NODE_ENV: 'development',
        MYSQL_HOST: '127.0.0.1',
      }),
    ).not.toThrow();
  });
});
