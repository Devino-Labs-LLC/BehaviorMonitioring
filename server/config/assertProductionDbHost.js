/**
 * Prevent production from silently using a loopback MySQL host.
 * Local development and test remain unrestricted.
 *
 * @param {{ host?: string, nodeEnv?: string, inProd?: string }} [env]
 */
function assertProductionDbHost(env = process.env) {
  const isProd = env.NODE_ENV === 'production' || env.IN_PROD === 'true';
  if (!isProd) {
    return;
  }

  const host = String(env.MYSQL_HOST || '')
    .trim()
    .toLowerCase();
  const loopbacks = new Set(['', 'localhost', '127.0.0.1', '::1']);

  if (loopbacks.has(host)) {
    throw new Error(
      'Production database host is missing or set to a loopback address. '
        + 'Set MYSQL_HOST (or AWS_DB_SECRET_NAME) to the RDS endpoint before starting.',
    );
  }
}

module.exports = { assertProductionDbHost };
