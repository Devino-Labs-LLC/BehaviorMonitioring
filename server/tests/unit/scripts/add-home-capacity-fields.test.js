describe('add-home-capacity-fields script', () => {
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

  function loadScript({ authenticateImpl, queryImpl } = {}) {
    const authenticate = jest.fn(authenticateImpl || (() => Promise.resolve()));
    const query = jest.fn(queryImpl || (() => Promise.resolve([[]])));
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});

    jest.doMock('../../../config/database', () => ({ authenticate, query }));

    jest.isolateModules(() => {
      require('../../../scripts/add-home-capacity-fields');
    });

    return { authenticate, query, exitSpy };
  }

  it('adds only the missing Home columns', async () => {
    const { authenticate, query, exitSpy } = loadScript({
      queryImpl: (sql) => {
        if (sql.includes("COLUMN_NAME = 'capacity'")) {
          return Promise.resolve([[{ COLUMN_NAME: 'capacity' }]]);
        }

        if (sql.includes('INFORMATION_SCHEMA.COLUMNS')) {
          return Promise.resolve([[]]);
        }

        return Promise.resolve([[]]);
      },
    });

    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(authenticate).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith('- Column already exists: capacity');
    expect(query.mock.calls.some(([sql]) => sql.includes('ADD COLUMN current_occupancy'))).toBe(true);
    expect(exitSpy).toHaveBeenCalledWith(0);

    exitSpy.mockRestore();
  });

  it('exits non-zero when a Home column migration fails', async () => {
    const { exitSpy } = loadScript({
      queryImpl: (sql) => {
        if (sql.includes('INFORMATION_SCHEMA.COLUMNS')) {
          return Promise.resolve([[]]);
        }

        throw new Error('home alter failed');
      },
    });

    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(console.error).toHaveBeenCalledWith('✗ Error adding column capacity:', 'home alter failed');
    expect(console.error).toHaveBeenCalledWith('❌ Failed to add Home capacity fields:', 'home alter failed');
    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
  });
});
