import { CheckEmail, CheckPassword, CheckUsername } from '../../../src/function/EntryCheck';

describe('EntryCheck utilities', () => {
  describe('CheckEmail', () => {
    it('accepts well-formed email addresses', () => {
      expect(CheckEmail('test@example.com')).toBe(true);
      expect(CheckEmail(' user.name@example.co.uk ')).toBe(true);
      expect(CheckEmail('user+tag@example.io')).toBe(true);
    });

    it('rejects malformed email addresses', () => {
      expect(CheckEmail('')).toBe(false);
      expect(CheckEmail('user name@example.com')).toBe(false);
      expect(CheckEmail('user@@example.com')).toBe(false);
      expect(CheckEmail('@example.com')).toBe(false);
      expect(CheckEmail('user@example')).toBe(false);
      expect(CheckEmail('user@example..com')).toBe(false);
      expect(CheckEmail('user@-example.com')).toBe(false);
      expect(CheckEmail('user@example-.com')).toBe(false);
    });
  });

  describe('CheckPassword', () => {
    it('accepts passwords that meet all requirements', () => {
      expect(CheckPassword('Abcd1234!')).toBe(true);
      expect(CheckPassword('Secure9$Pass')).toBe(true);
    });

    it('rejects passwords that miss a required character class', () => {
      expect(CheckPassword('short1!')).toBe(false);
      expect(CheckPassword('lowercase1!')).toBe(false);
      expect(CheckPassword('UPPERCASE1!')).toBe(false);
      expect(CheckPassword('NoNumbers!')).toBe(false);
      expect(CheckPassword('NoSymbols123')).toBe(false);
    });
  });

  describe('CheckUsername', () => {
    it('accepts usernames with supported characters', () => {
      expect(CheckUsername('john_doe')).toBe(true);
      expect(CheckUsername('john.doe-123')).toBe(true);
      expect(CheckUsername('JaneDoe')).toBe(true);
    });

    it('rejects usernames with unsupported characters', () => {
      expect(CheckUsername('john doe')).toBe(false);
      expect(CheckUsername('john@doe')).toBe(false);
      expect(CheckUsername('john/doe')).toBe(false);
    });
  });
});
