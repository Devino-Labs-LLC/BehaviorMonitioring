const { doubleCsrf } = require('csrf-csrf');

// Configure CSRF protection with double-submit cookie pattern
const {
    generateToken, // Used to generate a CSRF token
    validateRequest, // Used to validate CSRF token
    doubleCsrfProtection, // Combined middleware for protection
} = doubleCsrf({
    getSecret: () => process.env.CSRF_SECRET || 'default-csrf-secret-change-in-production',
    cookieName: '__Host-psifi.x-csrf-token', // Cookie name for CSRF token
    cookieOptions: {
        sameSite: 'strict',
        path: '/',
        secure: process.env.IN_PROD === 'true', // Secure only in production
        httpOnly: true, // Prevent client-side access
    },
    size: 64, // Size of the secret
    ignoredMethods: ['GET', 'HEAD', 'OPTIONS'], // Methods to ignore
    getTokenFromRequest: (req) => req.headers['x-csrf-token'], // Get token from header
});

/**
 * CSRF Protection Middleware
 * - Generates CSRF token for all requests (available via /csrf-token endpoint)
 * - Currently disabled for validation since app uses JWT (not cookie-based sessions)
 * - CSRF protection is primarily for cookie-based authentication
 * - Enable validation when implementing cookie-based features
 */
const csrfProtection = (req, res, next) => {
    // Generate token and attach to response for client consumption
    const csrfToken = generateToken(req, res);
    res.locals.csrfToken = csrfToken;
    
    // Skip CSRF validation - app uses JWT authentication, not cookies
    // CSRF is primarily needed for cookie-based session authentication
    // Uncomment below to enable CSRF validation for cookie-based features
    /*
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        const isValid = validateRequest(req);
        if (!isValid) {
            return res.status(403).json({
                statusCode: 403,
                success: false,
                message: 'Invalid or missing CSRF token'
            });
        }
    }
    */
    
    next();
};

module.exports = {
    csrfProtection,
    generateToken,
};
