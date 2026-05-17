const {
  SecretsManagerClient,
  GetSecretValueCommand,
} = require('@aws-sdk/client-secrets-manager');

let client;

function getClient(region) {
  if (!client) {
    client = new SecretsManagerClient({ region });
  }
  return client;
}

/**
 * Fetch a secret string from AWS Secrets Manager.
 * @param {string} secretId
 * @param {string} [region='us-east-1']
 * @returns {Promise<string>}
 */
async function fetchSecret(secretId, region = 'us-east-1') {
  const response = await getClient(region).send(
    new GetSecretValueCommand({
      SecretId: secretId,
      VersionStage: 'AWSCURRENT',
    }),
  );

  if (response.SecretString) {
    return response.SecretString;
  }

  if (response.SecretBinary) {
    return Buffer.from(response.SecretBinary).toString('utf8');
  }

  throw new Error(`Secret "${secretId}" has no SecretString or SecretBinary value`);
}

function resetClient() {
  client = undefined;
}

module.exports = {
  fetchSecret,
  getClient,
  resetClient,
};
