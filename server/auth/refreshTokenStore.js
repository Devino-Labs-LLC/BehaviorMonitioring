const RefreshToken = require('../models/RefreshToken');

function addDaysISO(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString();
}

async function insertRefreshToken({ userId, token, ttlDays, userAgent, ipAddress, deviceId, lastUsedAt }) {
    const expiresAt = addDaysISO(ttlDays);
    const normalizedLastUsedAt = lastUsedAt instanceof Date
        ? lastUsedAt.toISOString()
        : lastUsedAt || new Date().toISOString();

    await RefreshToken.create({
        user_id: userId,
        token,
        expires_at: expiresAt,
        user_agent: userAgent || null,
        ip_address: ipAddress || null,
        device_id: deviceId || null,
        last_used_at: normalizedLastUsedAt
    });

    return expiresAt;
}

async function findRefreshToken(token) {
    const result = await RefreshToken.findOne({ where: { token } });
    return result ? [result.toJSON()] : [];
}

async function revokeRefreshToken(token) {
    await RefreshToken.update(
        { revoked: 1, revoked_at: new Date() },
        { where: { token } }
    );
}

async function rotateRefreshToken(oldToken, newToken) {
    await RefreshToken.update(
        { revoked: 1, revoked_at: new Date(), replaced_by_token: newToken },
        { where: { token: oldToken } }
    );
}

async function touchRefreshToken(token) {
    return RefreshToken.update(
        { last_used_at: new Date() },
        { where: { token } }
    );
}

module.exports = { insertRefreshToken, findRefreshToken, revokeRefreshToken, rotateRefreshToken, touchRefreshToken };
