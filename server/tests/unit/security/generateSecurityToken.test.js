jest.mock('node:crypto', () => ({
  randomBytes: jest.fn(() => Buffer.from('1234567890abcdef')),
}));

const crypto = require('node:crypto');
const generateRandomToken = require('../../../functions/security/generateSecurityToken');

describe('generateSecurityToken', () => {
  it('creates a hex token from crypto random bytes', async () => {
    const token = await generateRandomToken();

    expect(crypto.randomBytes).toHaveBeenCalledWith(16);
    expect(token).toBe(Buffer.from('1234567890abcdef').toString('hex'));
  });
});
