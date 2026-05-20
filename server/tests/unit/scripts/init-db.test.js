describe('init-db script', () => {
  const originalEnv = process.env;
  const originalArgv = process.argv;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.argv = ['node', 'init-db.js'];
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
    console.error.mockRestore();
  });

  afterAll(() => {
    process.env = originalEnv;
    process.argv = originalArgv;
  });

  function loadScript({
    testConnectionImpl,
    syncDatabaseSafeImpl,
    authenticateImpl,
    syncImpl,
  } = {}) {
    const testConnection = jest.fn(testConnectionImpl || (() => Promise.resolve()));
    const syncDatabaseSafe = jest.fn(syncDatabaseSafeImpl || (() => Promise.resolve()));
    const authenticate = jest.fn(authenticateImpl || (() => Promise.resolve()));
    const sync = jest.fn(syncImpl || (() => Promise.resolve()));
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});

    jest.doMock('../../../config/loadSecrets', () => ({
      loadSecrets: jest.fn(() => Promise.resolve()),
    }));
    jest.doMock('../../../models', () => ({
      testConnection,
      syncDatabaseSafe,
    }));
    jest.doMock('../../../config/database', () => ({ authenticate, sync }));
    jest.doMock('../../../models/Employee', () => ({}));
    jest.doMock('../../../models/Client', () => ({}));
    jest.doMock('../../../models/Home', () => ({}));
    jest.doMock('../../../models/BehaviorAndSkill', () => ({}));
    jest.doMock('../../../models/BehaviorData', () => ({}));
    jest.doMock('../../../models/SkillData', () => ({}));
    jest.doMock('../../../models/SessionNoteData', () => ({}));
    jest.doMock('../../../models/CompanyData', () => ({}));
    jest.doMock('../../../models/RefreshToken', () => ({}));
    jest.doMock('../../../models/AuthLog', () => ({}));

    jest.isolateModules(() => {
      require('../../../scripts/init-db');
    });

    return {
      testConnection,
      syncDatabaseSafe,
      authenticate,
      sync,
      exitSpy,
    };
  }

  async function flushAsync() {
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));
  }

  it('uses production-safe sync by default', async () => {
    const { testConnection, syncDatabaseSafe, sync, exitSpy } = loadScript();

    await flushAsync();

    expect(testConnection).toHaveBeenCalled();
    expect(syncDatabaseSafe).toHaveBeenCalled();
    expect(sync).not.toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(0);

    exitSpy.mockRestore();
  });

  it('uses force sync when the --force flag is present in development', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.AWS_DB_SECRET_NAME;
    process.argv = ['node', 'init-db.js', '--force'];

    const { sync, syncDatabaseSafe, exitSpy } = loadScript();

    await flushAsync();

    expect(sync).toHaveBeenCalledWith({ force: true });
    expect(syncDatabaseSafe).not.toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(0);

    exitSpy.mockRestore();
  });

  it('uses alter sync when the --alter flag is present in development', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.AWS_DB_SECRET_NAME;
    process.argv = ['node', 'init-db.js', '--alter'];

    const { sync, syncDatabaseSafe, exitSpy } = loadScript();

    await flushAsync();

    expect(sync).toHaveBeenCalledWith({ alter: true });
    expect(syncDatabaseSafe).not.toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(0);

    exitSpy.mockRestore();
  });

  it('refuses --force against a production database target', async () => {
    process.env.NODE_ENV = 'production';
    process.argv = ['node', 'init-db.js', '--force'];

    const { exitSpy } = loadScript();

    await flushAsync();

    expect(console.error).toHaveBeenCalledWith(
      '❌ Database initialization failed:',
      expect.objectContaining({ message: expect.stringContaining('Refusing --alter or --force') }),
    );
    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
  });

  it('logs failures and exits non-zero when safe sync fails', async () => {
    const failure = new Error('db unavailable');
    const { exitSpy } = loadScript({
      testConnectionImpl: () => Promise.reject(failure),
    });

    await flushAsync();

    expect(console.error).toHaveBeenCalledWith('❌ Database initialization failed:', failure);
    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
  });
});
