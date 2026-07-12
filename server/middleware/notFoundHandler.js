const { isApiPath } = require('./apiPaths');

/**
 * Final fallback after all legitimate routes.
 * Responds directly — does not throw, query DB, or create sessions.
 *
 * BMetrics Express is API-only (Next.js client is deployed separately).
 * - API prefixes → JSON 404 (existing statusCode/success shape + ROUTE_NOT_FOUND)
 * - Other paths → cheap text/plain 404 (no redirect, no HTML 200)
 *
 * @type {import('express').RequestHandler}
 */
function notFoundHandler(req, res, _next) {
  if (isApiPath(req.path)) {
    return res.status(404).json({
      statusCode: 404,
      success: false,
      message: 'The requested API route was not found.',
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: 'The requested API route was not found.',
      },
    });
  }

  return res.status(404).type('text/plain').send('Not Found');
}

module.exports = { notFoundHandler };
