const rateLimit = require('express-rate-limit');

/**
 * General rate limiter for most routes
 * Allows 100 requests per 15 minutes per IP
 */
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        statusCode: 429,
        success: false,
        message: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

/**
 * Strict rate limiter for authentication routes
 * Allows 5 login attempts per 15 minutes per IP
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per windowMs
    message: {
        statusCode: 429,
        success: false,
        message: 'Too many authentication attempts from this IP, please try again after 15 minutes.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful requests
});

/**
 * Moderate rate limiter for API routes
 * Allows 20 requests per 1 minute per IP
 */
const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 20, // Limit each IP to 20 requests per windowMs
    message: {
        statusCode: 429,
        success: false,
        message: 'Too many API requests, please slow down.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Very strict rate limiter for password reset routes
 * Allows 3 requests per hour per IP
 */
const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Limit each IP to 3 requests per windowMs
    message: {
        statusCode: 429,
        success: false,
        message: 'Too many password reset attempts from this IP, please try again after an hour.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = {
    generalLimiter,
    authLimiter,
    apiLimiter,
    passwordResetLimiter
};
