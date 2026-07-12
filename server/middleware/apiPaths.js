/**
 * API route prefixes used by the BMetrics Express backend.
 * Keep in sync with mounts in registerApplicationRoutes (index.js / appSetup).
 */
const API_PREFIXES = ['/auth', '/admin', '/employee', '/aba', '/csrf-token'];

/**
 * @param {string} pathname - req.path (no query string)
 * @returns {boolean}
 */
function isApiPath(pathname) {
  const path = pathname || '';
  if (path === '/csrf-token') {
    return true;
  }
  return API_PREFIXES.some((prefix) => {
    if (prefix === '/csrf-token') {
      return path === '/csrf-token';
    }
    return path === prefix || path.startsWith(`${prefix}/`);
  });
}

module.exports = {
  API_PREFIXES,
  isApiPath,
};
