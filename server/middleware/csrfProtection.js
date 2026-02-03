const { doubleCsrf } = require('csrf-csrf');

// Configure CSRF protection
const {
    generateToken, // Used to generate a CSRF token
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

// Middleware that both generates token and validates requests
const csrfProtection = (req, res, next) => {
    // Generate token and attach to response
    const csrfToken = generateToken(req, res);
    res.locals.csrfToken = csrfToken;
    
    // For state-changing methods, validate the token
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return doubleCsrfProtection(req, res, next);
    }
    
    next();
};

module.exports = {
    csrfProtection,
    generateToken,
};
