const bcrypt = require('bcryptjs');

describe('Password Hashing', () => {
  it('hashes password correctly', async () => {
    const password = 'testpassword123';
    const hashedPassword = await bcrypt.hash(password, 10);

    expect(hashedPassword).toBeTruthy();
    expect(hashedPassword).not.toBe(password);
  });

  it('verifies correct password', async () => {
    const password = 'testpassword123';
    const hashedPassword = await bcrypt.hash(password, 10);

    const isMatch = await bcrypt.compare(password, hashedPassword);
    expect(isMatch).toBe(true);
  });

  it('rejects incorrect password', async () => {
    const password = 'testpassword123';
    const wrongPassword = 'wrongpassword';
    const hashedPassword = await bcrypt.hash(password, 10);

    const isMatch = await bcrypt.compare(wrongPassword, hashedPassword);
    expect(isMatch).toBe(false);
  });

  it('generates different hashes for same password', async () => {
    const password = 'testpassword123';
    const hash1 = await bcrypt.hash(password, 10);
    const hash2 = await bcrypt.hash(password, 10);

    expect(hash1).not.toBe(hash2);
    
    // But both should verify correctly
    expect(await bcrypt.compare(password, hash1)).toBe(true);
    expect(await bcrypt.compare(password, hash2)).toBe(true);
  });
});