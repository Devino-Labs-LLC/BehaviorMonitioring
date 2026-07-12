const jwt = require('jsonwebtoken');
const logAuthEvent = require('./helpers/authLog');

function resolveIssuer() {
  const prodStatus = process.env.IN_PROD === 'true';
  const host = process.env.HOST || '';
  const port = process.env.PORT ? `:${process.env.PORT}` : '';
  return prodStatus ? host : `${host}${port}`;
}

/**
 * @param {{ isKnownRoute?: (req: import('express').Request) => boolean }} [options]
 * @returns {import('express').RequestHandler}
 *
 * Security tradeoff:
 * - Always returns 401 for missing/invalid credentials (does not reveal whether the path exists).
 * - AuthLog DB writes for MISSING_OR_INVALID_AUTH_HEADER are skipped when the path is not a
 *   registered route on the protected router (anonymous scanner noise).
 * - Presenting a Bearer token (valid or invalid) is always audited.
 * - Missing credentials against a real registered endpoint remain audited.
 */
function createAuthMiddleware(options = {}) {
  const { isKnownRoute } = options;

  return function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization || '';
    const [type, token] = authHeader.split(' ');

    if (type !== 'Bearer' || !token) {
      const knownRoute = typeof isKnownRoute === 'function' ? isKnownRoute(req) : true;

      if (knownRoute) {
        logAuthEvent('MISSING_OR_INVALID_AUTH_HEADER', {
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          details: 'Authorization header missing or not Bearer',
        });
      }

      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET, {
        algorithms: ['HS256'],
        issuer: resolveIssuer(),
        audience: process.env.ClientHost,
      });

      logAuthEvent('JWT_VERIFY_SUCCESS', {
        userId: payload.sub,
        email: payload.email,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });

      req.user = payload;
      return next();
    } catch (err) {
      logAuthEvent('JWT_VERIFY_FAILED', {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        details: err.message,
      });

      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  };
}

const authMiddleware = createAuthMiddleware();

module.exports = authMiddleware;
module.exports.createAuthMiddleware = createAuthMiddleware;
