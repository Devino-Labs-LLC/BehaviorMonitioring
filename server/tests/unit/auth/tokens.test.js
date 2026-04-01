const jwt = require('jsonwebtoken');
const { createAccessToken, createRefreshToken, verifyAccessToken, verifyRefreshToken } = require('../../../auth/tokens');

describe('JWT Token Functions', () => {
  const originalEnv = process.env;
  const mockUser = {
    employeeID: 1,
    username: 'testuser',
    isAdmin: false,
  };

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      JWT_SECRET: 'test-secret',
      JWT_REFRESH_SECRET: 'test-refresh-secret',
      ClientHost: 'http://localhost:3000',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('createAccessToken', () => {
    it('creates a valid access token', () => {
      const token = createAccessToken(mockUser);
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
    });

    it('token contains user information', () => {
      const token = createAccessToken(mockUser);
      const decoded = jwt.decode(token);
      
      expect(decoded.employeeID).toBe(mockUser.employeeID);
      expect(decoded.username).toBe(mockUser.username);
      expect(decoded.isAdmin).toBe(mockUser.isAdmin);
    });

    it('token expires in 15 minutes', () => {
      const token = createAccessToken(mockUser);
      const decoded = jwt.decode(token);
      
      const expirationTime = decoded.exp - decoded.iat;
      expect(expirationTime).toBe(900); // 15 minutes = 900 seconds
    });

    it('throws when JWT_SECRET is missing', () => {
      delete process.env.JWT_SECRET;

      expect(() => createAccessToken(mockUser)).toThrow(
        'JWT_SECRET environment variable is not set. Cannot create access token.',
      );
    });
  });

  describe('createRefreshToken', () => {
    it('creates a valid refresh token', () => {
      const token = createRefreshToken(mockUser);
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
    });

    it('refresh token expires in 7 days', () => {
      const token = createRefreshToken(mockUser);
      const decoded = jwt.decode(token);
      
      const expirationTime = decoded.exp - decoded.iat;
      expect(expirationTime).toBe(604800); // 7 days = 604800 seconds
    });

    it('throws when JWT_REFRESH_SECRET is missing', () => {
      delete process.env.JWT_REFRESH_SECRET;

      expect(() => createRefreshToken(mockUser)).toThrow(
        'JWT_REFRESH_SECRET environment variable is not set. Cannot create refresh token.',
      );
    });
  });

  describe('verifyAccessToken', () => {
    it('verifies valid access token', () => {
      const token = createAccessToken(mockUser);
      const result = verifyAccessToken(token);
      
      expect(result.valid).toBe(true);
      expect(result.decoded.employeeID).toBe(mockUser.employeeID);
    });

    it('rejects invalid token', () => {
      const result = verifyAccessToken('invalid-token');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('rejects expired token', () => {
      const expiredToken = jwt.sign(
        { ...mockUser },
        process.env.JWT_SECRET,
        { expiresIn: '0s' }
      );
      
      const result = verifyAccessToken(expiredToken);
      expect(result.valid).toBe(false);
    });
  });

  describe('verifyRefreshToken', () => {
    it('verifies valid refresh token', () => {
      const userId = 123;
      const token = createRefreshToken(userId);
      const result = verifyRefreshToken(token);
      
      expect(result).toBeTruthy();
      expect(result.sub).toBe(userId);
    });

    it('rejects invalid refresh token', () => {
      expect(() => {
        verifyRefreshToken('invalid-token');
      }).toThrow();
    });
  });
});
