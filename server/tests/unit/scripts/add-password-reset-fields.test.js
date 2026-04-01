describe('add-password-reset-fields script', () => {
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

  function loadScript(queryImpl) {
    const query = jest.fn(queryImpl);
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});

    jest.doMock('../../../config/database', () => ({ query }));

    jest.isolateModules(() => {
      require('../../../scripts/add-password-reset-fields');
    });

    return { query, exitSpy };
  }

  it('adds only the missing password reset columns', async () => {
    const { query, exitSpy } = loadScript((sql) => {
      if (sql.includes('INFORMATION_SCHEMA.COLUMNS')) {
        return Promise.resolve([[{ COLUMN_NAME: 'password_reset_token' }]]);
      }

      return Promise.resolve([[]]);
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[1][0]).toContain('ADD COLUMN password_reset_expires');
    expect(console.log).toHaveBeenCalledWith('✓ password_reset_token column already exists');
    expect(console.log).toHaveBeenCalledWith('✓ Added password_reset_expires column');
    expect(exitSpy).toHaveBeenCalledWith(0);

    exitSpy.mockRestore();
  });

  it('adds both password reset columns when neither exists', async () => {
    const { query, exitSpy } = loadScript((sql) => {
      if (sql.includes('INFORMATION_SCHEMA.COLUMNS')) {
        return Promise.resolve([[]]);
      }

      return Promise.resolve([[]]);
    });

    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(query).toHaveBeenCalledTimes(3);
    expect(query.mock.calls[1][0]).toContain('ADD COLUMN password_reset_token');
    expect(query.mock.calls[2][0]).toContain('ADD COLUMN password_reset_expires');
    expect(console.log).toHaveBeenCalledWith('✓ Added password_reset_token column');
    expect(console.log).toHaveBeenCalledWith('✓ Added password_reset_expires column');
    expect(exitSpy).toHaveBeenCalledWith(0);

    exitSpy.mockRestore();
  });

  it('logs failures and exits non-zero when the migration fails', async () => {
    const { exitSpy } = loadScript(() => Promise.reject(new Error('query failed')));

    await Promise.resolve();
    await Promise.resolve();

    expect(console.error).toHaveBeenCalledWith(
      'Error adding password reset fields:',
      'query failed',
    );
    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
  });
});
