const jwt = require('jsonwebtoken');
const { createAccessToken, createRefreshToken, verifyAccessToken, verifyRefreshToken } = require('../../../auth/tokens');

describe('JWT Token Functions', () => {
  const mockUser = {
    employeeID: 1,
    username: 'testuser',
    isAdmin: false,
  };

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