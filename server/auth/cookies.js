function setRefreshCookie(res, token) {
    const cookieOptions = {
        httpOnly: true,
        secure: process.env.IN_PROD === "true",
        sameSite: process.env.IN_PROD === "true" ? "none" : "lax",
        path: "/auth/refresh",
        maxAge: Number(process.env.REFRESH_TOKEN_TTL_DAYS || 7) * 24 * 60 * 60 * 1000,
    };

    // In production, ensure the domain is properly set for cross-domain cookies
    // Only set domain if it's explicitly provided (for cross-subdomain support)
    if (process.env.COOKIE_DOMAIN) {
        cookieOptions.domain = process.env.COOKIE_DOMAIN;
    }

    // Debug logging for production
    if (process.env.IN_PROD === "true") {
        console.log('[COOKIE] Setting refresh cookie');
        console.log('[COOKIE] Options:', JSON.stringify(cookieOptions, null, 2));
        console.log('[COOKIE] Cookie name:', process.env.COOKIE_NAME);
    }

    res.cookie(process.env.COOKIE_NAME, token, cookieOptions);
}

function clearRefreshCookie(res) {
    res.clearCookie(process.env.COOKIE_NAME, {
        path: "/auth/refresh",
    });
}

module.exports = { setRefreshCookie, clearRefreshCookie };