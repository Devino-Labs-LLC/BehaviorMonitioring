const { doubleCsrf } = require('csrf-csrf');

// Configure CSRF protection
const {
    generateToken, // Used to generate a CSRF token
    validateRequest, // Used to validate a request
    invalidCsrfTokenError, // Error to use when CSRF validation fails
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

// Middleware to generate and attach CSRF token to response
const csrfProtection = (req, res, next) => {
    const csrfToken = generateToken(req, res);
    res.locals.csrfToken = csrfToken;
    next();
};

// Middleware to validate CSRF token
const csrfValidation = (req, res, next) => {
    const result = validateRequest(req);
    if (result) {
        return next();
    }
    return res.status(403).json({
        statusCode: 403,
        success: false,
        message: 'Invalid CSRF token'
    });
};

module.exports = {
    csrfProtection,
    csrfValidation,
    generateToken,
    invalidCsrfTokenError
};
