const jwt = require("jsonwebtoken");
const prodStatus = process.env.IN_PROD === "true";

function createAccessToken(payload) {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET environment variable is not set. Cannot create access token.');
    }
    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.ACCESS_TOKEN_TTL || "15m",
        issuer: prodStatus ? `${process.env.HOST}` : `${process.env.HOST}${process.env.PORT ? `:${process.env.PORT}` : ""}`,
        audience: process.env.ClientHost,
    });
}

// refresh should be MINIMAL
function createRefreshToken(userId) {
    if (!process.env.JWT_REFRESH_SECRET) {
        throw new Error('JWT_REFRESH_SECRET environment variable is not set. Cannot create refresh token.');
    }
    return jwt.sign({ sub: userId }, process.env.JWT_REFRESH_SECRET, {
        expiresIn: process.env.REFRESH_TOKEN_TTL_DAYS ? `${process.env.REFRESH_TOKEN_TTL_DAYS}d` : "7d",
        issuer: prodStatus ? `${process.env.HOST}` : `${process.env.HOST}${process.env.PORT ? `:${process.env.PORT}` : ""}`,
        audience: process.env.ClientHost,
    });
}

function verifyRefreshToken(token) {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET, {
        issuer: prodStatus ? `${process.env.HOST}` : `${process.env.HOST}${process.env.PORT ? `:${process.env.PORT}` : ""}`,
        audience: process.env.ClientHost,
    });
}

function verifyAccessToken(token) {
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET, {
            issuer: prodStatus ? `${process.env.HOST}` : `${process.env.HOST}${process.env.PORT ? `:${process.env.PORT}` : ""}`,
            audience: process.env.ClientHost,
        });
        return { valid: true, decoded };
    } catch (error) {
        return { valid: false, error: error.message };
    }
}

module.exports = { createAccessToken, createRefreshToken, verifyRefreshToken, verifyAccessToken };