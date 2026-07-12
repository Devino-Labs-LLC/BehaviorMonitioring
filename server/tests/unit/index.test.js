describe('server entrypoint', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      HOST: 'http://localhost',
      PORT: '3001',
      IN_PROD: 'false',
      ClientHost: 'http://localhost:3000',
      AmplifyHost: 'https://amplify.example.com',
      NODE_ENV: 'test',
      MYSQL_DATABASE: 'behavior_monitoring_test',
      MYSQL_HOST: '127.0.0.1',
    };
    delete process.env.SKIP_SERVER_BOOTSTRAP;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  async function flushPromises() {
    await new Promise((resolve) => setImmediate(resolve));
  }

  function loadServerWithMocks({
    testConnectionImpl,
    syncDatabaseImpl,
    loadSecretsImpl,
    productionDbHost = '127.0.0.1',
  } = {}) {
    process.env.MYSQL_HOST = productionDbHost;

    const expressJson = jest.fn(() => 'json-middleware');
    const expressApp = {
      disable: jest.fn(),
      set: jest.fn(),
      use: jest.fn(),
      get: jest.fn(),
      listen: jest.fn((port, host, callback) => {
        if (typeof host === 'function') {
          callback = host;
        }
        if (callback) callback();
        return { on: jest.fn(), close: jest.fn() };
      }),
    };
    const expressFactory = jest.fn(() => expressApp);
    expressFactory.json = expressJson;

    const cors = jest.fn(() => 'cors-middleware');
    const cookieParser = jest.fn(() => 'cookie-parser-middleware');
    const requestLogger = jest.fn((req, res, next) => next && next());
    const csrfProtection = jest.fn((req, res, next) => next && next());
    const generateToken = jest.fn(() => 'csrf-token');
    const generalLimiter = jest.fn((req, res, next) => next && next());
    const apiLimiter = jest.fn((req, res, next) => next && next());
    const authMiddleware = jest.fn((req, res, next) => next && next());
    authMiddleware.createAuthMiddleware = jest.fn(() => authMiddleware);
    const requireRole = jest.fn();
    const authRoute = jest.fn();
    const adminRoute = { stack: [] };
    const employeeRoute = { stack: [] };
    const abaRoute = { stack: [] };
    const testConnection = jest.fn(testConnectionImpl || (() => Promise.resolve()));
    const syncDatabase = jest.fn(syncDatabaseImpl || (() => Promise.resolve()));
    const loadSecrets = jest.fn(loadSecretsImpl || (() => Promise.resolve()));
    const testJson = jest.fn();
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    jest.doMock('express', () => expressFactory);
    jest.doMock('cors', () => cors);
    jest.doMock('cookie-parser', () => cookieParser);
    jest.doMock('../../middleware/requestLogger', () => requestLogger);
    jest.doMock('../../middleware/csrfProtection', () => ({ csrfProtection, generateToken }));
    jest.doMock('../../middleware/rateLimiter', () => ({ generalLimiter, apiLimiter }));
    jest.doMock('../../middleware/authMiddleware', () => authMiddleware);
    jest.doMock('../../middleware/routerRouteMatcher', () => ({
      createRouterRouteMatcher: () => () => true,
    }));
    jest.doMock('../../middleware/rbac', () => ({ requireRole }));
    jest.doMock('../../routes/Auth', () => authRoute);
    jest.doMock('../../routes/Admin', () => adminRoute);
    jest.doMock('../../routes/Employee', () => employeeRoute);
    jest.doMock('../../routes/ABA', () => abaRoute);
    jest.doMock('../../models', () => ({ testConnection, syncDatabase }));
    jest.doMock('../../config/loadSecrets', () => ({
      loadSecrets,
    }));
    jest.doMock('../../config/assertProductionDbHost', () => ({
      assertProductionDbHost: jest.fn(() => {
        const { assertProductionDbHost } = jest.requireActual('../../config/assertProductionDbHost');
        assertProductionDbHost({
          NODE_ENV: process.env.NODE_ENV,
          IN_PROD: process.env.IN_PROD,
          MYSQL_HOST: process.env.MYSQL_HOST,
        });
      }),
    }));

    jest.isolateModules(() => {
      require('../../index');
    });

    return {
      expressApp,
      expressFactory,
      expressJson,
      cors,
      cookieParser,
      csrfProtection,
      generateToken,
      generalLimiter,
      apiLimiter,
      authMiddleware,
      authRoute,
      adminRoute,
      employeeRoute,
      abaRoute,
      testConnection,
      syncDatabase,
      loadSecrets,
      testJson,
      consoleLogSpy,
      consoleWarnSpy,
      consoleErrorSpy,
    };
  }

  function getTerminalMiddleware(expressApp) {
    const anonymousMiddleware = expressApp.use.mock.calls
      .map((call) => call[0])
      .filter((middleware) => typeof middleware === 'function');

    return {
      notFoundMiddleware: [...anonymousMiddleware].reverse().find((middleware) => middleware.length === 3),
      errorMiddleware: anonymousMiddleware.find((middleware) => middleware.length === 4),
    };
  }

  it('initializes middleware, routes, and starts the server after secrets', async () => {
    const {
      expressApp,
      expressFactory,
      expressJson,
      cors,
      cookieParser,
      testConnection,
      syncDatabase,
      loadSecrets,
      consoleLogSpy,
      consoleWarnSpy,
      consoleErrorSpy,
    } = loadServerWithMocks();

    await flushPromises();
    await flushPromises();

    expect(expressFactory).toHaveBeenCalled();
    expect(expressApp.disable).toHaveBeenCalledWith('x-powered-by');
    expect(expressApp.set).toHaveBeenCalledWith('trust proxy', 1);
    expect(expressApp.get.mock.calls[0][0]).toBe('/healthz');
    expect(cors).toHaveBeenCalled();
    expect(cookieParser).toHaveBeenCalled();
    expect(expressJson).toHaveBeenCalled();
    expect(testConnection).toHaveBeenCalled();
    expect(syncDatabase).toHaveBeenCalled();
    expect(expressApp.listen).toHaveBeenCalledWith(3001, '0.0.0.0', expect.any(Function));
    expect(loadSecrets.mock.invocationCallOrder[0]).toBeLessThan(
      expressApp.listen.mock.invocationCallOrder[0],
    );
    expect(expressApp.listen.mock.invocationCallOrder[0]).toBeLessThan(
      testConnection.mock.invocationCallOrder[0],
    );
    expect(consoleLogSpy).toHaveBeenCalledWith('[startup] Listening on 0.0.0.0:3001 (GET /healthz ready)');

    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('does not call app.listen when secret loading fails', async () => {
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});
    const secretError = new Error('secrets unavailable');
    const {
      expressApp,
      consoleErrorSpy,
      consoleWarnSpy,
      consoleLogSpy,
    } = loadServerWithMocks({
      loadSecretsImpl: () => Promise.reject(secretError),
    });

    await flushPromises();
    await flushPromises();

    expect(expressApp.listen).not.toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith('[startup] Fatal bootstrap error:', secretError);

    exitSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  it('does not call app.listen when production DB host validation fails', async () => {
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});
    process.env.NODE_ENV = 'production';
    process.env.IN_PROD = 'true';

    const {
      expressApp,
      consoleErrorSpy,
      consoleWarnSpy,
      consoleLogSpy,
    } = loadServerWithMocks({
      productionDbHost: '127.0.0.1',
    });

    await flushPromises();
    await flushPromises();

    expect(expressApp.listen).not.toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[startup] Fatal bootstrap error:',
      expect.objectContaining({ message: expect.stringMatching(/loopback/i) }),
    );

    exitSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  it('allows requests with no origin and approved origins through the CORS callback', async () => {
    const {
      cors,
      consoleLogSpy,
      consoleWarnSpy,
      consoleErrorSpy,
    } = loadServerWithMocks();

    await flushPromises();
    await flushPromises();

    const corsOptions = cors.mock.calls[0][0];
    const callback = jest.fn();

    corsOptions.origin(undefined, callback);
    corsOptions.origin('http://localhost:3000', callback);

    expect(callback).toHaveBeenNthCalledWith(1, null, true);
    expect(callback).toHaveBeenNthCalledWith(2, null, true);

    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('rejects disallowed origins through the CORS callback', async () => {
    const {
      cors,
      consoleLogSpy,
      consoleWarnSpy,
      consoleErrorSpy,
    } = loadServerWithMocks();

    await flushPromises();
    await flushPromises();

    const corsOptions = cors.mock.calls[0][0];
    const callback = jest.fn();

    corsOptions.origin('https://blocked.example.com', callback);

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'CORS blocked request from origin: https://blocked.example.com',
    );
    expect(callback.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(callback.mock.calls[0][0].message).toBe('Not allowed by CORS');

    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('responds with the development server message on the root route', async () => {
    const {
      expressApp,
      consoleLogSpy,
      consoleWarnSpy,
      consoleErrorSpy,
    } = loadServerWithMocks();

    await flushPromises();
    await flushPromises();

    const rootHandler = expressApp.get.mock.calls.find(([path]) => path === '/')[2];
    const res = { send: jest.fn() };

    rootHandler({}, res);

    expect(res.send).toHaveBeenCalledWith(
      'The server is running successfully. <br/>The server is running on port 3001... <br/>The server url is http://localhost:3001...',
    );

    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('returns a CSRF token from the csrf-token route', async () => {
    const {
      expressApp,
      generateToken,
      consoleLogSpy,
      consoleWarnSpy,
      consoleErrorSpy,
    } = loadServerWithMocks();

    await flushPromises();
    await flushPromises();

    const csrfHandler = expressApp.get.mock.calls.find(([path]) => path === '/csrf-token')[2];
    const req = { id: 'req-1' };
    const res = { json: jest.fn() };

    csrfHandler(req, res);

    expect(generateToken).toHaveBeenCalledWith(req, res);
    expect(res.json).toHaveBeenCalledWith({ csrfToken: 'csrf-token' });

    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('returns JSON 404 for unknown API routes without redirecting', async () => {
    const {
      expressApp,
      consoleLogSpy,
      consoleWarnSpy,
      consoleErrorSpy,
    } = loadServerWithMocks();

    await flushPromises();
    await flushPromises();

    const { notFoundMiddleware, errorMiddleware } = getTerminalMiddleware(expressApp);
    const req = { path: '/auth/missing', method: 'GET', accepts: () => false };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      type: jest.fn().mockReturnThis(),
      send: jest.fn(),
      redirect: jest.fn(),
    };

    notFoundMiddleware(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        success: false,
        error: expect.objectContaining({ code: 'ROUTE_NOT_FOUND' }),
      }),
    );
    expect(res.redirect).not.toHaveBeenCalled();
    expect(errorMiddleware).toEqual(expect.any(Function));

    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('returns text 404 for unknown non-API routes without redirecting', async () => {
    const {
      expressApp,
      consoleLogSpy,
      consoleWarnSpy,
      consoleErrorSpy,
    } = loadServerWithMocks();

    await flushPromises();
    await flushPromises();

    const { notFoundMiddleware } = getTerminalMiddleware(expressApp);
    const req = { path: '/wp-admin', method: 'GET' };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      type: jest.fn().mockReturnThis(),
      send: jest.fn(),
      redirect: jest.fn(),
    };

    notFoundMiddleware(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.type).toHaveBeenCalledWith('text/plain');
    expect(res.send).toHaveBeenCalledWith('Not Found');
    expect(res.redirect).not.toHaveBeenCalled();

    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('returns explicit status errors and logs unexpected server errors', async () => {
    const {
      expressApp,
      consoleLogSpy,
      consoleWarnSpy,
      consoleErrorSpy,
    } = loadServerWithMocks();

    await flushPromises();
    await flushPromises();

    const { errorMiddleware } = getTerminalMiddleware(expressApp);
    const json = jest.fn();
    const status = jest.fn(() => ({ json, send: jest.fn(), type: jest.fn().mockReturnThis() }));
    const send = jest.fn();
    const type = jest.fn().mockReturnThis();

    errorMiddleware(
      { status: 401, message: 'Unauthorized' },
      { path: '/auth/login', accepts: () => 'json' },
      { status, headersSent: false },
      jest.fn(),
    );
    errorMiddleware(
      new Error('boom'),
      { path: '/auth/login', method: 'GET', accepts: () => 'json' },
      { status: jest.fn(() => ({ json: send, send, type })), headersSent: false },
      jest.fn(),
    );

    expect(status).toHaveBeenCalledWith(401);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Unhandled error:',
      expect.objectContaining({ message: 'boom' }),
    );

    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('keeps listening when database initialization fails', async () => {
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});
    const startupError = new Error('db unavailable');
    const { expressApp, consoleErrorSpy, consoleWarnSpy, consoleLogSpy } = loadServerWithMocks({
      testConnectionImpl: () => Promise.reject(startupError),
    });

    await flushPromises();
    await flushPromises();

    expect(expressApp.listen).toHaveBeenCalledWith(3001, '0.0.0.0', expect.any(Function));
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[startup] Database initialization failed (healthz remains available):',
      startupError,
    );
    expect(exitSpy).not.toHaveBeenCalled();

    exitSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  it('responds from /healthz with a fast JSON payload', async () => {
    const { expressApp } = loadServerWithMocks();

    await flushPromises();
    await flushPromises();

    const healthHandler = expressApp.get.mock.calls.find(([path]) => path === '/healthz')[1];
    const res = {
      statusCode: null,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.body = payload;
      },
    };

    const started = Date.now();
    healthHandler({}, res);
    const elapsed = Date.now() - started;

    expect(elapsed).toBeLessThan(1000);
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ ok: true, service: 'bmetrics-api' });
  });
});
