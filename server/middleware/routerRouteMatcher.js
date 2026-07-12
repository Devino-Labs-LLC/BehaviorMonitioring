/**
 * Derive registered method+path pairs from an Express Router's stack.
 * Avoids hard-coded route lists that drift from the real router.
 *
 * @param {import('express').Router} router
 * @returns {{ method: string, path: string }[]}
 */
function listRouterRoutes(router) {
  if (!router || !Array.isArray(router.stack)) {
    return [];
  }

  const routes = [];
  for (const layer of router.stack) {
    if (!layer.route) {
      continue;
    }
    const routePath = layer.route.path;
    const methods = layer.route.methods || {};
    for (const [method, enabled] of Object.entries(methods)) {
      if (enabled && method !== '_all') {
        routes.push({ method: method.toLowerCase(), path: routePath });
      }
    }
  }
  return routes;
}

/**
 * Build a matcher for the current request against a router's registered routes.
 * When mounted (e.g. app.use('/admin', ...)), Express sets req.path relative to the mount.
 *
 * @param {import('express').Router} router
 * @returns {(req: import('express').Request) => boolean}
 */
function createRouterRouteMatcher(router) {
  const routes = listRouterRoutes(router);

  return function isKnownRoute(req) {
    const method = String(req.method || '').toLowerCase();
    const path = req.path || '';
    return routes.some((route) => route.method === method && route.path === path);
  };
}

module.exports = {
  listRouterRoutes,
  createRouterRouteMatcher,
};
