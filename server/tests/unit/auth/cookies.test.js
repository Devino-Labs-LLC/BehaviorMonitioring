const { setRefreshCookie, clearRefreshCookie } = require('../../../auth/cookies');

describe('auth cookies helpers', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      IN_PROD: 'false',
      COOKIE_NAME: 'bmRefreshToken',
      REFRESH_TOKEN_TTL_DAYS: '7',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('sets the refresh cookie with development defaults', () => {
    const res = { cookie: jest.fn() };

    setRefreshCookie(res, 'refresh-token');

    expect(res.cookie).toHaveBeenCalledWith(
      'bmRefreshToken',
      'refresh-token',
      expect.objectContaining({
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/auth/refresh',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
    );
  });

  it('includes the cookie domain when configured', () => {
    process.env.COOKIE_DOMAIN = '.example.com';
    const res = { cookie: jest.fn() };

    setRefreshCookie(res, 'refresh-token');

    expect(res.cookie).toHaveBeenCalledWith(
      'bmRefreshToken',
      'refresh-token',
      expect.objectContaining({
        domain: '.example.com',
      })
    );
  });

  it('clears the refresh cookie at the refresh path', () => {
    const res = { clearCookie: jest.fn() };

    clearRefreshCookie(res);

    expect(res.clearCookie).toHaveBeenCalledWith('bmRefreshToken', {
      path: '/auth/refresh',
    });
  });
});
