/** AWS RDS / standard DB secret JSON keys → MYSQL_* env vars */
const DB_SECRET_KEY_MAP = {
  host: 'MYSQL_HOST',
  hostname: 'MYSQL_HOST',
  port: 'MYSQL_PORT',
  username: 'MYSQL_USER',
  user: 'MYSQL_USER',
  password: 'MYSQL_PASSWORD',
  dbname: 'MYSQL_DATABASE',
  database: 'MYSQL_DATABASE',
  db: 'MYSQL_DATABASE',
};

const SECRETS_PROVIDERS = Object.freeze({
  aws: 'aws',
  environment: 'environment',
});

/**
 * Runtime variables required when SECRETS_PROVIDER=environment.
 * AWS provider populates these from Secrets Manager instead.
 */
const REQUIRED_ENVIRONMENT_SECRETS = Object.freeze([
  'HOST',
  'ClientHost',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'MYSQL_HOST',
  'MYSQL_PORT',
  'MYSQL_USER',
  'MYSQL_PASSWORD',
  'MYSQL_DATABASE',
]);

/**
 * Resolve the secrets provider.
 * Defaults to "environment" when SECRETS_PROVIDER is omitted.
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {'aws'|'environment'}
 */
function resolveSecretsProvider(env = process.env) {
  const raw = env.SECRETS_PROVIDER;
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    return SECRETS_PROVIDERS.environment;
  }

  const provider = String(raw).trim().toLowerCase();
  if (provider !== SECRETS_PROVIDERS.aws && provider !== SECRETS_PROVIDERS.environment) {
    throw new Error(
      `Invalid SECRETS_PROVIDER "${raw}". Supported values: aws, environment`,
    );
  }

  return provider;
}

/**
 * Verify required runtime environment variables are present.
 * @param {NodeJS.ProcessEnv} [env]
 */
function validateEnvironmentSecrets(env = process.env) {
  const missing = REQUIRED_ENVIRONMENT_SECRETS.filter((key) => {
    const value = env[key];
    return value === undefined || value === null || String(value).trim() === '';
  });

  if (missing.length > 0) {
    throw new Error(
      'Missing required environment variables for SECRETS_PROVIDER=environment: '
        + `${missing.join(', ')}. `
        + 'Set these in the deployment environment, or use SECRETS_PROVIDER=aws with AWS Secrets Manager.',
    );
  }
}

/**
 * Apply key/value pairs to process.env.
 * @param {Record<string, unknown>} values
 * @param {{ onlyIfUnset?: boolean }} [options]
 */
function applyEnvFromObject(values, options = {}) {
  if (!values || typeof values !== 'object' || Array.isArray(values)) {
    return;
  }

  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }

    if (options.onlyIfUnset && process.env[key]) {
      continue;
    }

    process.env[key] = String(value);
  }
}

/**
 * Map AWS RDS-style DB secret JSON onto MYSQL_* variables.
 * @param {Record<string, unknown>} secret
 */
function applyDbSecret(secret) {
  const mapped = {};

  for (const [key, value] of Object.entries(secret)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }

    if (key.startsWith('MYSQL_')) {
      mapped[key] = value;
      continue;
    }

    const envKey = DB_SECRET_KEY_MAP[key.toLowerCase()];
    if (envKey) {
      mapped[envKey] = value;
    }
  }

  applyEnvFromObject(mapped);
}

function parseSecretJson(secretString, secretName) {
  try {
    const parsed = JSON.parse(secretString);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new TypeError('Secret value must be a JSON object');
    }
    return parsed;
  } catch (error) {
    throw new Error(`Failed to parse secret "${secretName}" as JSON: ${error.message}`);
  }
}

/**
 * Load secrets from AWS Secrets Manager (lazy-requires the AWS SDK).
 * Skipped when AWS_SECRET_NAME / AWS_DB_SECRET_NAME are unset.
 */
async function loadAwsSecrets() {
  if (process.env.SKIP_AWS_SECRETS === 'true') {
    return;
  }

  // Lazy require — never load AWS SDK for the environment provider.
  const { fetchSecret } = require('./awsSecrets');

  const region = process.env.AWS_REGION || 'us-east-1';
  const appSecretName = process.env.AWS_SECRET_NAME;
  const dbSecretName = process.env.AWS_DB_SECRET_NAME;

  if (!appSecretName && !dbSecretName) {
    return;
  }

  if (appSecretName) {
    const appSecret = parseSecretJson(await fetchSecret(appSecretName, region), appSecretName);
    applyEnvFromObject(appSecret);
    console.log(`✓ Loaded application secrets from AWS Secrets Manager (${appSecretName})`);
  }

  if (dbSecretName) {
    const dbSecret = parseSecretJson(await fetchSecret(dbSecretName, region), dbSecretName);
    applyDbSecret(dbSecret);
    console.log(`✓ Loaded database secrets from AWS Secrets Manager (${dbSecretName})`);
  }
}

/**
 * Load runtime secrets using the configured provider.
 *
 * SECRETS_PROVIDER:
 * - "environment" (default) — validate process.env; never initialize AWS SDK
 * - "aws" — load from AWS Secrets Manager (Elastic Beanstalk)
 */
async function loadSecrets() {
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  const provider = resolveSecretsProvider();
  console.log(`[Secrets] Provider: ${provider}`);

  if (provider === SECRETS_PROVIDERS.environment) {
    validateEnvironmentSecrets();
    console.log('[Secrets] Using process environment variables');
    return;
  }

  await loadAwsSecrets();
}

module.exports = {
  loadSecrets,
  loadAwsSecrets,
  validateEnvironmentSecrets,
  resolveSecretsProvider,
  applyEnvFromObject,
  applyDbSecret,
  parseSecretJson,
  DB_SECRET_KEY_MAP,
  REQUIRED_ENVIRONMENT_SECRETS,
  SECRETS_PROVIDERS,
};
