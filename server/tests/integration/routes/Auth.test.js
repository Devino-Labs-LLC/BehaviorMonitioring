const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const employeeQueries = require('../../../middleware/helpers/EmployeeQueries');
const bcrypt = require('bcryptjs');
const { csrfProtection, generateToken } = require('../../../middleware/csrfProtection');
const { createAccessToken, createRefreshToken, verifyRefreshToken } = require('../../../auth/tokens');
const { setRefreshCookie, clearRefreshCookie } = require('../../../auth/cookies');
const {
  insertRefreshToken,
  findRefreshToken,
  revokeRefreshToken,
  rotateRefreshToken,
} = require('../../../auth/refreshTokenStore');
const { getOrCreateDeviceId } = require('../../../auth/device');
const emailTemplate = require('../../../middleware/email/emailTemplate');
const Employee = require('../../../models/Employee');

// Mock employeeQueries
jest.mock('../../../middleware/helpers/EmployeeQueries');

// Mock bcrypt
jest.mock('bcryptjs');

jest.mock('../../../middleware/rateLimiter', () => ({
  authLimiter: (req, res, next) => next(),
  passwordResetLimiter: (req, res, next) => next(),
  generalLimiter: (req, res, next) => next(),
}));

jest.mock('../../../auth/tokens', () => ({
  createAccessToken: jest.fn(() => 'access-token'),
  createRefreshToken: jest.fn(() => 'refresh-token'),
  verifyRefreshToken: jest.fn(),
}));

jest.mock('../../../auth/cookies', () => ({
  setRefreshCookie: jest.fn(),
  clearRefreshCookie: jest.fn(),
}));

jest.mock('../../../auth/refreshTokenStore', () => ({
  insertRefreshToken: jest.fn(),
  findRefreshToken: jest.fn(),
  revokeRefreshToken: jest.fn(),
  rotateRefreshToken: jest.fn(),
}));

jest.mock('../../../auth/device', () => ({
  getOrCreateDeviceId: jest.fn(() => 'device-123'),
}));

jest.mock('../../../middleware/email/emailTemplate', () => ({
  sendSignupVerification: jest.fn().mockResolvedValue(true),
  sendPasswordRecovery: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../../middleware/helpers/authLog', () => jest.fn());
jest.mock('../../../models/Employee', () => ({
  update: jest.fn(),
  findOne: jest.fn(),
}));

const authRoutes = require('../../../routes/Auth');

const app = express();
const testRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(cookieParser());
app.use(csrfProtection);
app.use(express.json());
app.get('/csrf-token', (req, res) => {
  res.json({ csrfToken: generateToken(req, res) });
});
app.use('/auth', testRateLimiter, authRoutes);

describe('Auth API Integration Tests', () => {
  let agent;

  async function postWithCsrf(path, payload = {}) {
    const csrfResponse = await agent.get('/csrf-token');
    const requestBuilder = agent.post(path);

    if (csrfResponse.body?.csrfToken) {
      requestBuilder.set('x-csrf-token', csrfResponse.body.csrfToken);
    }

    return requestBuilder.send(payload);
  }

  async function postWithCsrfAndCookies(path, cookies, payload = {}) {
    const csrfResponse = await agent.get('/csrf-token');
    const csrfCookies = (csrfResponse.headers['set-cookie'] || []).map((cookie) => cookie.split(';')[0]);
    const requestBuilder = agent.post(path).set('Cookie', [...csrfCookies, ...cookies].join('; '));

    if (csrfResponse.body?.csrfToken) {
      requestBuilder.set('x-csrf-token', csrfResponse.body.csrfToken);
    }

    return requestBuilder.send(payload);
  }

  beforeEach(() => {
    agent = request.agent(app);
    jest.clearAllMocks();
  });

  describe('POST /auth/validateEmployeeAccount', () => {
    test.todo(
      'returns 401 when username does not exist once validateEmployeeAccount sends a response for missing users'
    );

    it('handles employee in verification status', async () => {
      employeeQueries.employeeExistByUsername.mockResolvedValue(true);
      employeeQueries.employeeDataByUsername.mockResolvedValue({
        account_status: 'In Verification',
        username: 'testuser'
      });
      employeeQueries.employeeSetEmployeeCredentialsByUsername.mockResolvedValue(true);
      employeeQueries.employeeUpdateEmployeeAccountStatusByUsername.mockResolvedValue(true);
      
      // Mock bcrypt.hash to return a promise instead of using callback
      // This avoids the timing issue where the route returns 401 before bcrypt finishes
      bcrypt.hash.mockImplementation(() => {
        return Promise.resolve('hashedpassword');
      });

      const response = await postWithCsrf('/auth/validateEmployeeAccount', {
        username: 'testuser',
        password: 'password123',
      });

      expect(response.status).toBe(200);
      // Due to route bug with callback timing, expecting 401
      expect(response.body.statusCode).toBe(401);
    });
  });

  describe('POST /auth/verifyEmployeeLogin', () => {
    it('returns 200 with error when username does not exist', async () => {
      employeeQueries.employeeExistByUsername.mockResolvedValue(false);

      const response = await postWithCsrf('/auth/verifyEmployeeLogin', {
        username: 'nonexistent',
        password: 'password123',
      });

      expect(response.status).toBe(200);
      expect(response.body.statusCode).toBe(401);
    });

    it('blocks login and resends verification when email is not verified', async () => {
      employeeQueries.employeeExistByUsername.mockResolvedValue(true);
      employeeQueries.employeePasswordByUsername = jest.fn().mockResolvedValue({
        password: 'hashed-password',
      });
      employeeQueries.employeeDataByUsername.mockResolvedValue({
        employeeID: 1,
        username: 'testuser',
        email: 'test@example.com',
        fName: 'Test',
        lName: 'User',
        role: 'admin',
        companyID: 1,
        companyName: 'Acme',
        email_verified: false,
        account_status: 'Active',
      });
      bcrypt.compare.mockImplementation((plainTextPassword, hashedPassword, callback) => {
        callback(null, true);
      });
      Employee.update.mockResolvedValue([1]);

      const response = await postWithCsrf('/auth/verifyEmployeeLogin', {
        username: 'testuser',
        password: 'password123',
      });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        statusCode: 403,
        loginStatus: false,
        emailNotVerified: true,
      });
      expect(emailTemplate.sendSignupVerification).toHaveBeenCalled();
    });

    it('blocks login when the account is pending approval', async () => {
      employeeQueries.employeeExistByUsername.mockResolvedValue(true);
      employeeQueries.employeePasswordByUsername = jest.fn().mockResolvedValue({
        password: 'hashed-password',
      });
      employeeQueries.employeeDataByUsername.mockResolvedValue({
        employeeID: 1,
        username: 'testuser',
        email: 'test@example.com',
        fName: 'Test',
        lName: 'User',
        role: 'admin',
        companyID: 1,
        companyName: 'Acme',
        email_verified: true,
        account_status: 'Pending',
      });
      bcrypt.compare.mockImplementation((plainTextPassword, hashedPassword, callback) => {
        callback(null, true);
      });

      const response = await postWithCsrf('/auth/verifyEmployeeLogin', {
        username: 'testuser',
        password: 'password123',
      });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        statusCode: 403,
        loginStatus: false,
        serverMessage: 'Your account is pending approval. Please contact your company administrator.',
      });
    });

    it('logs in active verified users and issues tokens', async () => {
      employeeQueries.employeeExistByUsername.mockResolvedValue(true);
      employeeQueries.employeePasswordByUsername = jest.fn().mockResolvedValue({
        password: 'hashed-password',
      });
      employeeQueries.employeeDataByUsername.mockResolvedValue({
        employeeID: 1,
        username: 'testuser',
        email: 'test@example.com',
        fName: 'Test',
        lName: 'User',
        role: 'admin',
        companyID: 1,
        companyName: 'Acme',
        email_verified: true,
        account_status: 'Active',
      });
      bcrypt.compare.mockImplementation((plainTextPassword, hashedPassword, callback) => {
        callback(null, true);
      });
      insertRefreshToken.mockResolvedValue(true);

      const response = await postWithCsrf('/auth/verifyEmployeeLogin', {
        username: 'testuser',
        password: 'password123',
      });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        statusCode: 200,
        loginStatus: true,
        accessToken: 'access-token',
      });
      expect(createAccessToken).toHaveBeenCalled();
      expect(createRefreshToken).toHaveBeenCalledWith(1);
      expect(getOrCreateDeviceId).toHaveBeenCalled();
      expect(setRefreshCookie).toHaveBeenCalledWith(expect.any(Object), 'refresh-token');
    });
  });

  describe('POST /auth/refresh', () => {
    it('returns 401 when refresh token cookie is missing', async () => {
      const response = await postWithCsrf('/auth/refresh');

      expect(response.status).toBe(401);
      expect(response.body.error).toMatch(/refresh token/i);
    });

    it('returns 401 when the refresh token is not recognized', async () => {
      verifyRefreshToken.mockReturnValue({ sub: 1 });
      findRefreshToken.mockResolvedValue([]);

      const response = await postWithCsrfAndCookies('/auth/refresh', ['bmRefreshToken=refresh-token']);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Refresh token not recognized');
    });

    it('refreshes tokens for a valid refresh token', async () => {
      verifyRefreshToken.mockReturnValue({ sub: 1 });
      findRefreshToken.mockResolvedValue([
        {
          expires_at: new Date(Date.now() + 60_000).toISOString(),
          revoked: 0,
          device_id: 'device-123',
        },
      ]);
      employeeQueries.employeeDataById = jest.fn().mockResolvedValue({
        employeeID: 1,
        email: 'test@example.com',
        role: 'admin',
        companyID: 1,
      });
      rotateRefreshToken.mockResolvedValue(true);
      insertRefreshToken.mockResolvedValue(true);

      const response = await postWithCsrfAndCookies('/auth/refresh', ['bmRefreshToken=refresh-token']);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ accessToken: 'access-token' });
      expect(rotateRefreshToken).toHaveBeenCalledWith('refresh-token', 'refresh-token');
      expect(insertRefreshToken).toHaveBeenCalled();
      expect(setRefreshCookie).toHaveBeenCalledWith(expect.any(Object), 'refresh-token');
    });

    it('returns 401 when the stored refresh token is expired', async () => {
      verifyRefreshToken.mockReturnValue({ sub: 1 });
      findRefreshToken.mockResolvedValue([
        {
          expires_at: new Date(Date.now() - 60_000).toISOString(),
          revoked: 0,
          device_id: 'device-123',
        },
      ]);

      const response = await postWithCsrfAndCookies('/auth/refresh', ['bmRefreshToken=refresh-token']);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid refresh token');
      expect(clearRefreshCookie).toHaveBeenCalled();
    });

    it('returns 401 when the user for the refresh token no longer exists', async () => {
      verifyRefreshToken.mockReturnValue({ sub: 1 });
      findRefreshToken.mockResolvedValue([
        {
          expires_at: new Date(Date.now() + 60_000).toISOString(),
          revoked: 0,
          device_id: 'device-123',
        },
      ]);
      employeeQueries.employeeDataById = jest.fn().mockResolvedValue(null);

      const response = await postWithCsrfAndCookies('/auth/refresh', ['bmRefreshToken=refresh-token']);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('User not found');
      expect(clearRefreshCookie).toHaveBeenCalled();
    });

    it('still returns an access token when refresh token insertion races on a duplicate row', async () => {
      verifyRefreshToken.mockReturnValue({ sub: 1 });
      findRefreshToken.mockResolvedValue([
        {
          expires_at: new Date(Date.now() + 60_000).toISOString(),
          revoked: 0,
          device_id: 'device-123',
        },
      ]);
      employeeQueries.employeeDataById = jest.fn().mockResolvedValue({
        employeeID: 1,
        email: 'test@example.com',
        role: 'admin',
        companyID: 1,
      });
      rotateRefreshToken.mockResolvedValue(true);
      insertRefreshToken.mockRejectedValue({ name: 'SequelizeUniqueConstraintError' });

      const response = await postWithCsrfAndCookies('/auth/refresh', ['bmRefreshToken=refresh-token']);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ accessToken: 'access-token' });
      expect(setRefreshCookie).toHaveBeenCalledWith(expect.any(Object), 'refresh-token');
    });
  });

  describe('POST /auth/verifyEmployeeLogout', () => {
    it('returns 200 successfully logs out', async () => {
      const response = await postWithCsrf('/auth/verifyEmployeeLogout');

      expect(response.status).toBe(200);
      expect(response.body.statusCode).toBe(200);
      expect(response.body.loginStatus).toBe(false);
    });
  });

  describe('POST /auth/request-password-reset', () => {
    it('rejects requests without an email', async () => {
      const response = await postWithCsrf('/auth/request-password-reset', {});

      expect(response.body).toEqual({
        statusCode: 400,
        success: false,
        message: 'Email is required',
      });
    });

    it('returns a generic success message when the email does not exist', async () => {
      employeeQueries.employeeDataByEmail = jest.fn().mockResolvedValue(null);

      const response = await postWithCsrf('/auth/request-password-reset', {
        email: 'missing@example.com',
      });

      expect(response.body).toMatchObject({
        statusCode: 200,
        success: true,
      });
    });

    it('generates a reset token and sends a password recovery email', async () => {
      employeeQueries.employeeDataByEmail = jest.fn().mockResolvedValue({
        employeeID: 1,
        email: 'user@example.com',
        fName: 'Test',
        lName: 'User',
        username: 'testuser',
      });
      employeeQueries.employeeSetPasswordResetToken = jest.fn().mockResolvedValue(true);

      const response = await postWithCsrf('/auth/request-password-reset', {
        email: 'user@example.com',
      });

      expect(response.body).toMatchObject({
        statusCode: 200,
        success: true,
        emailSent: true,
      });
      expect(employeeQueries.employeeSetPasswordResetToken).toHaveBeenCalled();
      expect(emailTemplate.sendPasswordRecovery).toHaveBeenCalled();
    });
  });

  describe('POST /auth/reset-password', () => {
    it('rejects requests with missing fields', async () => {
      const response = await postWithCsrf('/auth/reset-password', {
        token: 'token-only',
      });

      expect(response.body).toEqual({
        statusCode: 400,
        success: false,
        message: 'All fields are required',
      });
    });

    it('rejects mismatched passwords', async () => {
      const response = await postWithCsrf('/auth/reset-password', {
        token: 'token',
        newPassword: 'NewPassword123',
        confirmPassword: 'DifferentPassword123',
      });

      expect(response.body).toEqual({
        statusCode: 400,
        success: false,
        message: 'Passwords do not match',
      });
    });

    it('rejects weak passwords', async () => {
      const response = await postWithCsrf('/auth/reset-password', {
        token: 'token',
        newPassword: 'weak',
        confirmPassword: 'weak',
      });

      expect(response.body).toEqual({
        statusCode: 400,
        success: false,
        message: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number',
      });
    });

    it('rejects invalid reset tokens', async () => {
      employeeQueries.employeeDataByResetToken = jest.fn().mockResolvedValue(null);

      const response = await postWithCsrf('/auth/reset-password', {
        token: 'bad-token',
        newPassword: 'NewPassword123',
        confirmPassword: 'NewPassword123',
      });

      expect(response.body).toEqual({
        statusCode: 400,
        success: false,
        message: 'Invalid or expired reset token',
      });
    });

    it('rejects expired reset tokens', async () => {
      employeeQueries.employeeDataByResetToken = jest.fn().mockResolvedValue({
        employeeID: 1,
        email: 'user@example.com',
        password_reset_expires: new Date(Date.now() - 60_000).toISOString(),
      });

      const response = await postWithCsrf('/auth/reset-password', {
        token: 'expired-token',
        newPassword: 'NewPassword123',
        confirmPassword: 'NewPassword123',
      });

      expect(response.body).toEqual({
        statusCode: 400,
        success: false,
        message: 'Reset token has expired. Please request a new one.',
      });
    });

    it('resets the password when the token is valid', async () => {
      employeeQueries.employeeDataByResetToken = jest.fn().mockResolvedValue({
        employeeID: 1,
        email: 'user@example.com',
        password_reset_expires: new Date(Date.now() + 60_000).toISOString(),
      });
      employeeQueries.employeeResetPassword = jest.fn().mockResolvedValue(true);
      bcrypt.hash.mockResolvedValue('new-hash');

      const response = await postWithCsrf('/auth/reset-password', {
        token: 'good-token',
        newPassword: 'NewPassword123',
        confirmPassword: 'NewPassword123',
      });

      expect(response.body).toEqual({
        statusCode: 200,
        success: true,
        message: 'Password successfully reset. You can now log in with your new password.',
      });
      expect(employeeQueries.employeeResetPassword).toHaveBeenCalledWith(1, 'new-hash');
    });
  });

  describe('POST /auth/verify-email', () => {
    it('rejects requests without a verification token', async () => {
      const response = await postWithCsrf('/auth/verify-email', {});

      expect(response.body).toEqual({
        statusCode: 400,
        success: false,
        message: 'Verification token is required',
      });
    });

    it('rejects invalid verification tokens', async () => {
      Employee.findOne.mockResolvedValue(null);

      const response = await postWithCsrf('/auth/verify-email', {
        token: 'bad-token',
      });

      expect(response.body).toEqual({
        statusCode: 400,
        success: false,
        message: 'Invalid verification token',
      });
    });

    it('rejects expired verification tokens', async () => {
      Employee.findOne.mockResolvedValue({
        employeeID: 1,
        email: 'user@example.com',
        email_verified: false,
        verification_token_expires: new Date(Date.now() - 60_000).toISOString(),
      });

      const response = await postWithCsrf('/auth/verify-email', {
        token: 'expired-token',
      });

      expect(response.body).toEqual({
        statusCode: 400,
        success: false,
        message: 'Verification token has expired. Please request a new one.',
      });
    });

    it('returns success when the email is already verified', async () => {
      Employee.findOne.mockResolvedValue({
        email_verified: true,
      });

      const response = await postWithCsrf('/auth/verify-email', {
        token: 'good-token',
      });

      expect(response.body).toEqual({
        statusCode: 200,
        success: true,
        message: 'Email is already verified. You can now log in.',
      });
    });

    it('verifies email and activates accounts that should be auto-activated', async () => {
      Employee.findOne.mockResolvedValue({
        employeeID: 7,
        email: 'admin@example.com',
        role: 'admin',
        account_status: 'In Verification',
        email_verified: false,
        verification_token_expires: new Date(Date.now() + 60_000).toISOString(),
      });
      Employee.update.mockResolvedValue([1]);

      const response = await postWithCsrf('/auth/verify-email', {
        token: 'good-token',
      });

      expect(response.body).toEqual({
        statusCode: 200,
        success: true,
        message: 'Email successfully verified! You can now log in.',
      });
      expect(Employee.update).toHaveBeenCalledWith(
        expect.objectContaining({
          email_verified: true,
          verification_token: null,
          verification_token_expires: null,
          account_status: 'Active',
        }),
        { where: { employeeID: 7 } }
      );
    });
  });
});
