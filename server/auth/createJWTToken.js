const jwt = require('jsonwebtoken');
const prodStatus = process.env.IN_PROD === "true";
const host = process.env.HOST || '';
const port = process.env.PORT ? `:${process.env.PORT}` : '';
const issuer = prodStatus ? host : `${host}${port}`;

function createJWTToken(payload) {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET environment variable is not set. Cannot create JWT token.');
    }
    return jwt.sign(
        payload,
        process.env.JWT_SECRET,
        {
            expiresIn: "1h",
            issuer,
            audience: process.env.ClientHost
        }
    );
}

function createRefreshToken(payload) {
  if (!process.env.JWT_REFRESH_SECRET) {
      throw new Error('JWT_REFRESH_SECRET environment variable is not set. Cannot create refresh token.');
  }
  return jwt.sign(
    payload,
    process.env.JWT_REFRESH_SECRET, // separate secret from access token
    {
      expiresIn: process.env.REFRESH_TOKEN_TTL_DAYS + "d",
      issuer: process.env.HOST,
      audience: process.env.ClientHost
    }
  );
}

module.exports = {
  createJWTToken,
  createRefreshToken
};
