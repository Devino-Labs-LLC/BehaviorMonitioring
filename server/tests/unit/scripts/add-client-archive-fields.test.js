describe('add-client-archive-fields script', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
    console.error.mockRestore();
  });

  function loadScript({ authenticateImpl, upImpl } = {}) {
    const authenticate = jest.fn(authenticateImpl || (() => Promise.resolve()));
    const getQueryInterface = jest.fn(() => ({ fake: true }));
    const up = jest.fn(upImpl || (() => Promise.resolve()));
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});

    jest.doMock('../../../config/database', () => ({ authenticate, getQueryInterface }));
    jest.doMock('../../../migrations/20260129-add-client-archive-fields', () => ({ up }), {
      virtual: true,
    });

    jest.isolateModules(() => {
      require('../../../scripts/add-client-archive-fields');
    });

    return { authenticate, getQueryInterface, up, exitSpy };
  }

  it('authenticates and runs the migration query interface', async () => {
    const { authenticate, getQueryInterface, up, exitSpy } = loadScript();

    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(authenticate).toHaveBeenCalled();
    expect(getQueryInterface).toHaveBeenCalled();
    expect(up).toHaveBeenCalledWith({ fake: true });
    expect(exitSpy).toHaveBeenCalledWith(0);

    exitSpy.mockRestore();
  });

  it('logs the migration error and exits non-zero on failure', async () => {
    const failure = new Error('migration failed');
    const { exitSpy } = loadScript({
      upImpl: () => Promise.reject(failure),
    });

    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(console.error).toHaveBeenCalledWith('\n✗ Migration failed:', 'migration failed');
    expect(console.error).toHaveBeenCalledWith(failure);
    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
  });
});
