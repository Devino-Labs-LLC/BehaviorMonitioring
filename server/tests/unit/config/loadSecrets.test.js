const { resetClient } = require('../../../config/awsSecrets');

describe('loadSecrets', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    resetClient();
    process.env = { ...originalEnv };
    delete process.env.AWS_SECRET_NAME;
    delete process.env.AWS_DB_SECRET_NAME;
    delete process.env.SKIP_AWS_SECRETS;
    process.env.NODE_ENV = 'development';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('skips AWS when secret names are not configured', async () => {
    const fetchSecret = jest.fn();
    jest.doMock('../../../config/awsSecrets', () => ({ fetchSecret, resetClient: jest.fn() }));

    const { loadSecrets } = require('../../../config/loadSecrets');
    await loadSecrets();

    expect(fetchSecret).not.toHaveBeenCalled();
  });

  it('skips AWS in test environment', async () => {
    process.env.NODE_ENV = 'test';
    process.env.AWS_SECRET_NAME = 'prod/BmetricsOPC_EB_Server';

    const fetchSecret = jest.fn();
    jest.doMock('../../../config/awsSecrets', () => ({ fetchSecret, resetClient: jest.fn() }));

    const { loadSecrets } = require('../../../config/loadSecrets');
    await loadSecrets();

    expect(fetchSecret).not.toHaveBeenCalled();
  });

  it('loads application secrets into process.env', async () => {
    process.env.AWS_SECRET_NAME = 'prod/BmetricsOPC_EB_Server';
    process.env.AWS_REGION = 'us-east-1';

    const fetchSecret = jest.fn()
      .mockResolvedValueOnce(JSON.stringify({
        JWT_SECRET: 'from-aws',
        ClientHost: 'https://app.example.com',
      }));

    jest.doMock('../../../config/awsSecrets', () => ({ fetchSecret, resetClient: jest.fn() }));

    const { loadSecrets } = require('../../../config/loadSecrets');
    await loadSecrets();

    expect(fetchSecret).toHaveBeenCalledWith('prod/BmetricsOPC_EB_Server', 'us-east-1');
    expect(process.env.JWT_SECRET).toBe('from-aws');
    expect(process.env.ClientHost).toBe('https://app.example.com');
  });

  it('maps RDS database secrets onto MYSQL_* variables', async () => {
    process.env.AWS_DB_SECRET_NAME = 'prod/BmetricsOPC_DB';

    const fetchSecret = jest.fn().mockResolvedValueOnce(JSON.stringify({
      username: 'dbuser',
      password: 'dbpass',
      host: 'db.example.com',
      port: 3306,
      dbname: 'BMetrics',
    }));

    jest.doMock('../../../config/awsSecrets', () => ({ fetchSecret, resetClient: jest.fn() }));

    const { loadSecrets } = require('../../../config/loadSecrets');
    await loadSecrets();

    expect(process.env.MYSQL_USER).toBe('dbuser');
    expect(process.env.MYSQL_PASSWORD).toBe('dbpass');
    expect(process.env.MYSQL_HOST).toBe('db.example.com');
    expect(process.env.MYSQL_PORT).toBe('3306');
    expect(process.env.MYSQL_DATABASE).toBe('BMetrics');
  });

  it('loads both application and database secrets when configured', async () => {
    process.env.AWS_SECRET_NAME = 'prod/BmetricsOPC_EB_Server';
    process.env.AWS_DB_SECRET_NAME = 'prod/BmetricsOPC_DB';

    const fetchSecret = jest.fn()
      .mockResolvedValueOnce(JSON.stringify({ JWT_SECRET: 'app-secret' }))
      .mockResolvedValueOnce(JSON.stringify({
        username: 'dbuser',
        password: 'dbpass',
        host: 'db.example.com',
        port: 3306,
        dbname: 'BMetrics',
      }));

    jest.doMock('../../../config/awsSecrets', () => ({ fetchSecret, resetClient: jest.fn() }));

    const { loadSecrets } = require('../../../config/loadSecrets');
    await loadSecrets();

    expect(fetchSecret).toHaveBeenCalledTimes(2);
    expect(process.env.JWT_SECRET).toBe('app-secret');
    expect(process.env.MYSQL_USER).toBe('dbuser');
  });
});

describe('loadSecrets helpers', () => {
  const { applyEnvFromObject, applyDbSecret, parseSecretJson } = require('../../../config/loadSecrets');

  it('applyEnvFromObject respects onlyIfUnset', () => {
    process.env.EXISTING = 'keep';
    applyEnvFromObject({ EXISTING: 'replace', NEW: 'value' }, { onlyIfUnset: true });
    expect(process.env.EXISTING).toBe('keep');
    expect(process.env.NEW).toBe('value');
    delete process.env.EXISTING;
    delete process.env.NEW;
  });

  it('parseSecretJson throws for invalid JSON', () => {
    expect(() => parseSecretJson('not-json', 'test/secret')).toThrow(
      'Failed to parse secret "test/secret" as JSON',
    );
  });
});
