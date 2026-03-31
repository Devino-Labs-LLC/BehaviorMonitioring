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
