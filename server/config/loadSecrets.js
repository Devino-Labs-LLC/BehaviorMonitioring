const { fetchSecret } = require('./awsSecrets');

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
 * Load application and database secrets from AWS Secrets Manager when configured.
 * Skipped when AWS_SECRET_NAME / AWS_DB_SECRET_NAME are unset (local development).
 */
async function loadSecrets() {
  if (process.env.SKIP_AWS_SECRETS === 'true' || process.env.NODE_ENV === 'test') {
    return;
  }

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

module.exports = {
  loadSecrets,
  applyEnvFromObject,
  applyDbSecret,
  parseSecretJson,
  DB_SECRET_KEY_MAP,
};
