/**
 * ALB / Elastic Beanstalk liveness probe — register before auth, CSRF, and rate limiting.
 */
function registerHealthRoutes(app) {
  app.get('/healthz', (req, res) => {
    res.status(200).json({
      ok: true,
      service: 'bmetrics-api',
      timestamp: new Date().toISOString(),
    });
  });
}

module.exports = { registerHealthRoutes };
