const crypto = require("node:crypto");

function getOrCreateDeviceId(req, res) {
    let deviceId = req.cookies?.bmDeviceId;

    if (!deviceId) {
        deviceId = crypto.randomUUID();
        res.cookie("bmDeviceId", deviceId, {
        httpOnly: false, // ok (not a secret)
        secure: process.env.IN_PROD === "true",
        sameSite: "lax",
        maxAge: 365 * 24 * 60 * 60 * 1000,
        });
    }

    return deviceId;
}

module.exports = { getOrCreateDeviceId };
