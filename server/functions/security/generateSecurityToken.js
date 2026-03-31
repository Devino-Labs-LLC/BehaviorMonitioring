const crypto = require('node:crypto');

async function generateRandomToken() {
    return crypto.randomBytes(16).toString('hex');
}

module.exports = generateRandomToken;
