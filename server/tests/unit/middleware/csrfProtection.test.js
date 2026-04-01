const mockValidateRequest = jest.fn();

jest.mock('csrf-csrf', () => ({
  doubleCsrf: jest.fn(() => ({
    generateToken: jest.fn(() => 'csrf-token'),
    validateRequest: mockValidateRequest,
    doubleCsrfProtection: jest.fn(),
  })),
}));

const { doubleCsrf } = require('csrf-csrf');

describe('csrfProtection middleware', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockValidateRequest.mockReset();
    process.env = {
      ...originalEnv,
      IN_PROD: 'false',
      SKIP_CSRF_PROTECTION: 'false',
      CSRF_SECRET: 'csrf-secret',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('skips validation for safe methods', () => {
    const { csrfProtection } = require('../../../middleware/csrfProtection');
    const next = jest.fn();

    csrfProtection({ method: 'GET' }, {}, next);

    expect(next).toHaveBeenCalled();
  });

  it('skips validation when protection is disabled', () => {
    process.env.SKIP_CSRF_PROTECTION = 'true';
    const { csrfProtection } = require('../../../middleware/csrfProtection');
    const next = jest.fn();

    csrfProtection({ method: 'POST' }, {}, next);

    expect(next).toHaveBeenCalled();
  });

  it('rejects invalid csrf requests', () => {
    mockValidateRequest.mockReturnValue(false);
    const { csrfProtection } = require('../../../middleware/csrfProtection');
    const req = { method: 'POST', headers: {} };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    csrfProtection(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 403,
      success: false,
      message: 'Invalid or missing CSRF token',
    });
  });

  it('handles csrf validator exceptions', () => {
    mockValidateRequest.mockImplementation(() => {
      throw new Error('csrf exploded');
    });
    const { csrfProtection } = require('../../../middleware/csrfProtection');
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    csrfProtection({ method: 'POST', headers: {} }, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 403,
      success: false,
      message: 'Invalid or missing CSRF token',
      errorMessage: 'csrf exploded',
    });
  });
});
