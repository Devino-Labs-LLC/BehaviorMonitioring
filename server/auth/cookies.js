function setRefreshCookie(res, token) {
    res.cookie(process.env.COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.IN_PROD === "true",
        sameSite: process.env.IN_PROD === "true" ? "none" : "lax",
        path: "/auth/refresh",
        maxAge: Number(process.env.REFRESH_TOKEN_TTL_DAYS || 7) * 24 * 60 * 60 * 1000,
    });
}

function clearRefreshCookie(res) {
    res.clearCookie(process.env.COOKIE_NAME, {
        path: "/auth/refresh",
    });
}

module.exports = { setRefreshCookie, clearRefreshCookie };