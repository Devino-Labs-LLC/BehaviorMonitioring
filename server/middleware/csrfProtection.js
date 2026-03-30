const { doubleCsrf } = require('csrf-csrf');
const prodStatus = process.env.IN_PROD === 'true';
const csrfCookieName = prodStatus ? '__Host-psifi.x-csrf-token' : 'psifi.x-csrf-token';

// Configure CSRF protection with double-submit cookie pattern
const {
    generateToken, // Used to generate a CSRF token
    validateRequest, // Used to validate CSRF token
    doubleCsrfProtection, // Combined middleware for protection
} = doubleCsrf({
    getSecret: () => process.env.CSRF_SECRET || 'default-csrf-secret-change-in-production',
    cookieName: csrfCookieName, // Cookie name for CSRF token
    cookieOptions: {
        sameSite: 'strict',
        path: '/',
        secure: prodStatus, // Secure only in production
        httpOnly: true, // Prevent client-side access
    },
    size: 64, // Size of the secret
    ignoredMethods: ['GET', 'HEAD', 'OPTIONS'], // Methods to ignore
    getTokenFromRequest: (req) => req.headers['x-csrf-token'], // Get token from header
});

const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

const csrfProtection = (req, res, next) => {
    if (SAFE_METHODS.includes(req.method) || process.env.SKIP_CSRF_PROTECTION === 'true') {
        return next();
    }

    try {
        const isValid = validateRequest(req);
        if (!isValid) {
            return res.status(403).json({
                statusCode: 403,
                success: false,
                message: 'Invalid or missing CSRF token'
            });
        }
        return next();
    } catch (error) {
        return res.status(403).json({
            statusCode: 403,
            success: false,
            message: 'Invalid or missing CSRF token',
            errorMessage: error.message
        });
    }
};

module.exports = {
    csrfProtection,
    generateToken,
};
