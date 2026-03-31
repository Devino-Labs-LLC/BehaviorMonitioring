describe('add-signup-fields script', () => {
  const flushAsyncWork = async (times = 8) => {
    for (let index = 0; index < times; index += 1) {
      await new Promise((resolve) => setImmediate(resolve));
    }
  };

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
      require('../../../scripts/add-signup-fields');
    });

    return { authenticate, query, exitSpy };
  }

  it('adds only the columns that do not already exist', async () => {
    const { authenticate, query, exitSpy } = loadScript({
      queryImpl: (sql) => {
        if (sql.includes("COLUMN_NAME = 'email_verified'")) {
          return Promise.resolve([[{ COLUMN_NAME: 'email_verified' }]]);
        }

        if (sql.includes('INFORMATION_SCHEMA.COLUMNS')) {
          return Promise.resolve([[]]);
        }

        return Promise.resolve([[]]);
      },
    });

    await flushAsyncWork();

    expect(authenticate).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith('- Column already exists: email_verified');
    expect(query.mock.calls.some(([sql]) => sql.includes('ADD COLUMN verification_token'))).toBe(true);
    expect(
      query.mock.calls.filter(([sql]) => sql.includes('ALTER TABLE employee ADD COLUMN')).length,
    ).toBeGreaterThanOrEqual(3);
    expect(exitSpy).toHaveBeenCalledWith(0);

    exitSpy.mockRestore();
  });

  it('logs the column name and exits non-zero when a query fails', async () => {
    const { exitSpy } = loadScript({
      queryImpl: (sql) => {
        if (sql.includes("COLUMN_NAME = 'email_verified'")) {
          return Promise.resolve([[]]);
        }

        throw new Error('alter failed');
      },
    });

    await flushAsyncWork();

    expect(console.error).toHaveBeenCalledWith('✗ Error adding column email_verified:', 'alter failed');
    expect(console.error).toHaveBeenCalledWith('❌ Failed to add signup fields:', 'alter failed');
    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
  });
});
