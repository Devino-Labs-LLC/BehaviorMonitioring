const jwt = require('jsonwebtoken');
const logAuthEvent = require('./helpers/authLog');

const secret = process.env.JWT_SECRET;
const prodStatus = process.env.IN_PROD === "true";

function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization || '';
    const [type, token] = authHeader.split(' ');

    if (type !== 'Bearer' || !token) {
        logAuthEvent("MISSING_OR_INVALID_AUTH_HEADER", {
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            details: 'Authorization header missing or not Bearer'
        });

        return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    try {
        const expectedIssuer = prodStatus ? `${process.env.HOST}` : `${process.env.HOST}${process.env.PORT ? `:${process.env.PORT}` : ''}`;
        const expectedAudience = process.env.ClientHost;
        
        console.log('🔐 JWT Verification Debug:');
        console.log('   Expected Issuer:', expectedIssuer);
        console.log('   Expected Audience:', expectedAudience);
        console.log('   Secret exists:', !!secret);
        console.log('   Token (first 20 chars):', token.substring(0, 20) + '...');
        
        const payload = jwt.verify(token, secret, {
            algorithms: ['HS256'],
            issuer: expectedIssuer,
            audience: expectedAudience,
        });

        console.log('   ✓ JWT Verified Successfully');
        console.log('   User ID:', payload.sub);

        logAuthEvent("JWT_VERIFY_SUCCESS", {
            userId: payload.sub,
            email: payload.email,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
        });

        req.user = payload;
        next();
    } catch (err) {
        console.error('❌ JWT Verification Failed:', err.message);
        
        logAuthEvent("JWT_VERIFY_FAILED", {
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            details: err.message
        });

        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

module.exports = authMiddleware;
