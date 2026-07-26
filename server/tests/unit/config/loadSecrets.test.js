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
    delete process.env.SECRETS_PROVIDER;
    process.env.NODE_ENV = 'development';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('skips AWS when secret names are not configured', async () => {
    process.env.SECRETS_PROVIDER = 'aws';
    const fetchSecret = jest.fn();
    jest.doMock('../../../config/awsSecrets', () => ({ fetchSecret, resetClient: jest.fn() }));

    const { loadSecrets } = require('../../../config/loadSecrets');
    await loadSecrets();

    expect(fetchSecret).not.toHaveBeenCalled();
  });

  it('skips AWS in test environment', async () => {
    process.env.NODE_ENV = 'test';
    process.env.SECRETS_PROVIDER = 'aws';
    process.env.AWS_SECRET_NAME = 'prod/BmetricsOPC_EB_Server';

    const fetchSecret = jest.fn();
    jest.doMock('../../../config/awsSecrets', () => ({ fetchSecret, resetClient: jest.fn() }));

    const { loadSecrets } = require('../../../config/loadSecrets');
    await loadSecrets();

    expect(fetchSecret).not.toHaveBeenCalled();
  });

  it('loads application secrets into process.env', async () => {
    process.env.SECRETS_PROVIDER = 'aws';
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
    process.env.SECRETS_PROVIDER = 'aws';
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
    process.env.SECRETS_PROVIDER = 'aws';
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

  it('uses the aws provider and logs the provider name', async () => {
    process.env.SECRETS_PROVIDER = 'aws';
    process.env.AWS_SECRET_NAME = 'prod/BmetricsOPC_EB_Server';

    const fetchSecret = jest.fn().mockResolvedValueOnce(JSON.stringify({ JWT_SECRET: 'x' }));
    jest.doMock('../../../config/awsSecrets', () => ({ fetchSecret, resetClient: jest.fn() }));
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    const { loadSecrets } = require('../../../config/loadSecrets');
    await loadSecrets();

    expect(logSpy).toHaveBeenCalledWith('[Secrets] Provider: aws');
    expect(fetchSecret).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it('defaults to the environment provider and never calls AWS', async () => {
    process.env.HOST = 'http://localhost';
    process.env.ClientHost = 'http://localhost:3000';
    process.env.JWT_SECRET = 'jwt';
    process.env.JWT_REFRESH_SECRET = 'refresh';
    process.env.MYSQL_HOST = 'db.example.com';
    process.env.MYSQL_PORT = '3306';
    process.env.MYSQL_USER = 'user';
    process.env.MYSQL_PASSWORD = 'pass';
    process.env.MYSQL_DATABASE = 'BMetrics';

    const fetchSecret = jest.fn();
    jest.doMock('../../../config/awsSecrets', () => ({ fetchSecret, resetClient: jest.fn() }));
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    const { loadSecrets } = require('../../../config/loadSecrets');
    await loadSecrets();

    expect(logSpy).toHaveBeenCalledWith('[Secrets] Provider: environment');
    expect(logSpy).toHaveBeenCalledWith('[Secrets] Using process environment variables');
    expect(fetchSecret).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it('throws a descriptive error when required environment variables are missing', async () => {
    process.env.SECRETS_PROVIDER = 'environment';
    delete process.env.JWT_SECRET;
    delete process.env.MYSQL_HOST;

    const fetchSecret = jest.fn();
    jest.doMock('../../../config/awsSecrets', () => ({ fetchSecret, resetClient: jest.fn() }));

    const { loadSecrets } = require('../../../config/loadSecrets');

    await expect(loadSecrets()).rejects.toThrow(/Missing required environment variables/);
    await expect(loadSecrets()).rejects.toThrow(/JWT_SECRET/);
    await expect(loadSecrets()).rejects.toThrow(/MYSQL_HOST/);
    expect(fetchSecret).not.toHaveBeenCalled();
  });

  it('rejects an invalid secrets provider', async () => {
    process.env.SECRETS_PROVIDER = 'vault';

    const fetchSecret = jest.fn();
    jest.doMock('../../../config/awsSecrets', () => ({ fetchSecret, resetClient: jest.fn() }));

    const { loadSecrets } = require('../../../config/loadSecrets');

    await expect(loadSecrets()).rejects.toThrow(/Invalid SECRETS_PROVIDER "vault"/);
    expect(fetchSecret).not.toHaveBeenCalled();
  });

  it('does not require awsSecrets when using the environment provider', async () => {
    process.env.SECRETS_PROVIDER = 'environment';
    process.env.HOST = 'http://localhost';
    process.env.ClientHost = 'http://localhost:3000';
    process.env.JWT_SECRET = 'jwt';
    process.env.JWT_REFRESH_SECRET = 'refresh';
    process.env.MYSQL_HOST = 'db.example.com';
    process.env.MYSQL_PORT = '3306';
    process.env.MYSQL_USER = 'user';
    process.env.MYSQL_PASSWORD = 'pass';
    process.env.MYSQL_DATABASE = 'BMetrics';

    // If awsSecrets were required at module load, this mock would still be hit via require.
    // Assert the AWS module is never loaded for environment provider.
    const awsFactory = jest.fn(() => ({ fetchSecret: jest.fn(), resetClient: jest.fn() }));
    jest.doMock('../../../config/awsSecrets', awsFactory);

    jest.resetModules();
    const { loadSecrets } = require('../../../config/loadSecrets');
    await loadSecrets();

    expect(awsFactory).not.toHaveBeenCalled();
  });
});

describe('loadSecrets helpers', () => {
  const {
    applyEnvFromObject,
    applyDbSecret,
    parseSecretJson,
    resolveSecretsProvider,
    validateEnvironmentSecrets,
  } = require('../../../config/loadSecrets');

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

  it('resolveSecretsProvider defaults to environment', () => {
    expect(resolveSecretsProvider({})).toBe('environment');
    expect(resolveSecretsProvider({ SECRETS_PROVIDER: 'AWS' })).toBe('aws');
  });

  it('validateEnvironmentSecrets lists all missing keys', () => {
    expect(() => validateEnvironmentSecrets({})).toThrow(/HOST/);
    expect(() => validateEnvironmentSecrets({})).toThrow(/MYSQL_DATABASE/);
  });
});
