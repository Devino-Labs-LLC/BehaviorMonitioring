/**
 * Configure Express trust proxy for ALB / Elastic Beanstalk.
 *
 * TRUST_PROXY:
 * - unset or "1" → trust 1 hop (default for single ALB)
 * - "0" or "false" → disabled (local / direct exposure)
 * - positive integer → trust that many hops
 * - never blindly trusts all proxies ("true" / "*")
 *
 * @param {import('express').Application} app
 */
function configureTrustProxy(app) {
  const raw = process.env.TRUST_PROXY;

  if (raw === '0' || raw === 'false') {
    app.set('trust proxy', false);
    return { mode: false, source: raw };
  }

  if (raw === undefined || raw === null || raw === '') {
    app.set('trust proxy', 1);
    return { mode: 1, source: 'default' };
  }

  const hops = Number.parseInt(String(raw), 10);
  if (Number.isFinite(hops) && hops >= 0) {
    if (hops === 0) {
      app.set('trust proxy', false);
      return { mode: false, source: raw };
    }
    app.set('trust proxy', hops);
    return { mode: hops, source: raw };
  }

  // Reject "true", "*", or other open trust values — fall back to single hop
  console.warn(
    `[startup] TRUST_PROXY=${raw} is not a safe hop count; using trust proxy = 1`,
  );
  app.set('trust proxy', 1);
  return { mode: 1, source: 'fallback' };
}

module.exports = { configureTrustProxy };
