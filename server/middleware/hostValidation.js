/**
 * Optional Host-header allowlist.
 *
 * Enabled only when ALLOWED_HOSTS is a non-empty comma-separated list.
 * Does not derive hosts from HOST, ClientHost, AmplifyHost, or CORS.
 * GET /healthz is exempt (ALB may send a private-IP Host header).
 */

/**
 * Parse ALLOWED_HOSTS into a Set of lowercase hostnames (no ports).
 * @param {string|undefined} raw
 * @returns {Set<string>|null} null when validation is disabled
 */
function parseAllowedHosts(raw) {
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    return null;
  }

  const hosts = String(raw)
    .split(',')
    .map((entry) => normalizeHostname(entry))
    .filter(Boolean);

  return hosts.length > 0 ? new Set(hosts) : null;
}

/**
 * @param {string} value
 * @returns {string}
 */
function normalizeHostname(value) {
  let host = String(value || '').trim().toLowerCase();
  if (!host) {
    return '';
  }

  // Strip brackets from IPv6 literals: [::1]:8080
  if (host.startsWith('[')) {
    const end = host.indexOf(']');
    if (end !== -1) {
      return host.slice(1, end);
    }
  }

  // Strip :port for IPv4 / hostname (not for bare IPv6 without brackets)
  const colonCount = (host.match(/:/g) || []).length;
  if (colonCount === 1) {
    host = host.split(':')[0];
  }

  return host;
}

/**
 * Extract hostname from Express req (Host header / req.hostname).
 * @param {import('express').Request} req
 * @returns {string}
 */
function requestHostname(req) {
  const header = req.headers.host;
  if (header) {
    return normalizeHostname(header);
  }
  return normalizeHostname(req.hostname || '');
}

/**
 * @returns {import('express').RequestHandler}
 */
function createHostValidationMiddleware() {
  return function hostValidation(req, res, next) {
    if (req.path === '/healthz') {
      return next();
    }

    const allowed = parseAllowedHosts(process.env.ALLOWED_HOSTS);
    if (!allowed) {
      return next();
    }

    const hostname = requestHostname(req);
    if (!hostname || !allowed.has(hostname)) {
      return res.status(400).type('text/plain').send('Invalid Host header');
    }

    return next();
  };
}

module.exports = {
  createHostValidationMiddleware,
  parseAllowedHosts,
  normalizeHostname,
  requestHostname,
};
