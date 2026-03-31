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
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  function loadServerWithMocks({ testConnectionImpl, syncDatabaseImpl } = {}) {
    const expressJson = jest.fn(() => 'json-middleware');
    const expressApp = {
      disable: jest.fn(),
      use: jest.fn(),
      get: jest.fn(),
      listen: jest.fn((port, callback) => {
        if (callback) callback();
        return { close: jest.fn() };
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
    const requireRole = jest.fn();
    const authRoute = jest.fn();
    const adminRoute = jest.fn();
    const employeeRoute = jest.fn();
    const abaRoute = jest.fn();
    const testConnection = jest.fn(testConnectionImpl || (() => Promise.resolve()));
    const syncDatabase = jest.fn(syncDatabaseImpl || (() => Promise.resolve()));
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
    jest.doMock('../../middleware/rbac', () => ({ requireRole }));
    jest.doMock('../../routes/Auth', () => authRoute);
    jest.doMock('../../routes/Admin', () => adminRoute);
    jest.doMock('../../routes/Employee', () => employeeRoute);
    jest.doMock('../../routes/ABA', () => abaRoute);
    jest.doMock('../../models', () => ({ testConnection, syncDatabase }));
    jest.doMock('../../functions/base/jsonHandler', () => ({ testJson }));

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

  it('initializes middleware, routes, and starts the server', async () => {
    const {
      expressApp,
      expressFactory,
      expressJson,
      cors,
      cookieParser,
      testConnection,
      syncDatabase,
      consoleLogSpy,
      consoleWarnSpy,
      consoleErrorSpy,
    } = loadServerWithMocks();

    await Promise.resolve();
    await Promise.resolve();

    expect(expressFactory).toHaveBeenCalled();
    expect(expressApp.disable).toHaveBeenCalledWith('x-powered-by');
    expect(cors).toHaveBeenCalled();
    expect(cookieParser).toHaveBeenCalled();
    expect(expressJson).toHaveBeenCalled();
    expect(testConnection).toHaveBeenCalled();
    expect(syncDatabase).toHaveBeenCalled();
    expect(expressApp.listen).toHaveBeenCalledWith('3001', expect.any(Function));
    expect(consoleLogSpy).toHaveBeenCalledWith('✓ Server running on port 3001...');

    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('allows requests with no origin and approved origins through the CORS callback', async () => {
    const {
      cors,
      consoleLogSpy,
      consoleWarnSpy,
      consoleErrorSpy,
    } = loadServerWithMocks();

    await Promise.resolve();
    await Promise.resolve();

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

    await Promise.resolve();
    await Promise.resolve();

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

    await Promise.resolve();
    await Promise.resolve();

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

    await Promise.resolve();
    await Promise.resolve();

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

  it('redirects 404 errors to the page-not-found route', async () => {
    const {
      expressApp,
      consoleLogSpy,
      consoleWarnSpy,
      consoleErrorSpy,
    } = loadServerWithMocks();

    await Promise.resolve();
    await Promise.resolve();

    const { notFoundMiddleware, errorMiddleware } = getTerminalMiddleware(expressApp);
    const next = jest.fn();
    const redirect = jest.fn();

    notFoundMiddleware({}, {}, next);

    const notFoundError = next.mock.calls[0][0];
    errorMiddleware(notFoundError, {}, { redirect }, jest.fn());

    expect(notFoundError.status).toBe(404);
    expect(redirect).toHaveBeenCalledWith('http://localhost/PageNotFound');

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

    await Promise.resolve();
    await Promise.resolve();

    const { errorMiddleware } = getTerminalMiddleware(expressApp);
    const status = jest.fn(() => ({ send: jest.fn() }));
    const send = jest.fn();

    errorMiddleware({ status: 401, message: 'Unauthorized' }, {}, { status }, jest.fn());
    errorMiddleware(new Error('boom'), {}, { status: jest.fn(() => ({ send })) }, jest.fn());

    expect(status).toHaveBeenCalledWith(401);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Unhandled error:', expect.any(Error));
    expect(send).toHaveBeenCalledWith('Internal Server Error');

    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('logs startup failures and exits', async () => {
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});
    const startupError = new Error('db unavailable');
    const { consoleErrorSpy, consoleWarnSpy, consoleLogSpy } = loadServerWithMocks({
      testConnectionImpl: () => Promise.reject(startupError),
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to start server:', startupError);
    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });
});
