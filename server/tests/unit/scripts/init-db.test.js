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

  function loadScript({ authenticateImpl, syncImpl } = {}) {
    const authenticate = jest.fn(authenticateImpl || (() => Promise.resolve()));
    const sync = jest.fn(syncImpl || (() => Promise.resolve()));
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});

    jest.doMock('../../../config/loadSecrets', () => ({
      loadSecrets: jest.fn(() => Promise.resolve()),
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

    return { authenticate, sync, exitSpy };
  }

  it('syncs the database in safe mode by default', async () => {
    const { authenticate, sync, exitSpy } = loadScript();

    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));

    expect(authenticate).toHaveBeenCalled();
    expect(sync).toHaveBeenCalledWith();
    expect(exitSpy).toHaveBeenCalledWith(0);

    exitSpy.mockRestore();
  });

  it('uses force sync when the --force flag is present', async () => {
    process.argv = ['node', 'init-db.js', '--force'];
    const { sync, exitSpy } = loadScript();

    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));

    expect(sync).toHaveBeenCalledWith({ force: true });

    exitSpy.mockRestore();
  });

  it('uses alter sync when the --alter flag is present', async () => {
    process.argv = ['node', 'init-db.js', '--alter'];
    const { sync, exitSpy } = loadScript();

    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));

    expect(sync).toHaveBeenCalledWith({ alter: true });

    exitSpy.mockRestore();
  });

  it('logs failures and exits non-zero when initialization fails', async () => {
    const failure = new Error('db unavailable');
    const { exitSpy } = loadScript({
      authenticateImpl: () => Promise.reject(failure),
    });

    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));

    expect(console.error).toHaveBeenCalledWith('❌ Database initialization failed:', failure);
    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
  });
});
