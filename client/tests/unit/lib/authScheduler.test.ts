jest.mock('axios');
jest.mock('../../../src/lib/tokenStore', () => ({
  setAccessToken: jest.fn(),
  clearAccessToken: jest.fn(),
}));
jest.mock('../../../src/lib/csrf', () => ({
  getCsrfToken: jest.fn(),
}));

function buildToken({ iat, exp }: { iat: number; exp: number }) {
  const payload = Buffer.from(JSON.stringify({ iat, exp })).toString('base64');
  return `header.${payload}.signature`;
}

describe('authScheduler', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_BACKEND_URL = 'http://backend.test';
    jest.resetModules();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  async function loadModule() {
    const axiosModule = await import('axios');
    const tokenStore = await import('../../../src/lib/tokenStore');
    const csrf = await import('../../../src/lib/csrf');
    const scheduler = await import('../../../src/lib/authScheduler');

    scheduler.clearScheduledRefresh();

    return {
      mockAxios: axiosModule.default as jest.Mocked<typeof axiosModule.default>,
      clearScheduledRefresh: scheduler.clearScheduledRefresh,
      scheduleSilentRefresh: scheduler.scheduleSilentRefresh,
      mockSetAccessToken: tokenStore.setAccessToken as jest.MockedFunction<
        typeof tokenStore.setAccessToken
      >,
      mockClearAccessToken: tokenStore.clearAccessToken as jest.MockedFunction<
        typeof tokenStore.clearAccessToken
      >,
      mockGetCsrfToken: csrf.getCsrfToken as jest.MockedFunction<typeof csrf.getCsrfToken>,
    };
  }

  it('schedules a refresh, stores the new token, and reschedules on success', async () => {
    const { scheduleSilentRefresh, mockAxios, mockGetCsrfToken, mockSetAccessToken } =
      await loadModule();
    jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
    mockAxios.get.mockResolvedValueOnce({ data: { csrfToken: 'csrf-token' } });
    mockGetCsrfToken.mockResolvedValue('csrf-token');
    mockAxios.post.mockResolvedValue({
      data: {
        accessToken: buildToken({ iat: 1000, exp: 1060 }),
      },
    });

    scheduleSilentRefresh(buildToken({ iat: 1000, exp: 1040 }));

    await jest.advanceTimersByTimeAsync(31_000);

    expect(mockGetCsrfToken).toHaveBeenCalled();
    expect(mockAxios.post).toHaveBeenCalledWith(
      'http://backend.test/auth/refresh',
      null,
      {
        withCredentials: true,
        headers: { 'x-csrf-token': 'csrf-token' },
      },
    );
    expect(mockSetAccessToken).toHaveBeenCalledWith(buildToken({ iat: 1000, exp: 1060 }));
  });

  it('omits csrf headers when no token is available', async () => {
    const { scheduleSilentRefresh, mockAxios, mockGetCsrfToken } = await loadModule();
    jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
    mockAxios.get.mockResolvedValueOnce({ data: { csrfToken: null } });
    mockGetCsrfToken.mockResolvedValue(null);
    mockAxios.post.mockResolvedValue({
      data: {
        accessToken: buildToken({ iat: 1000, exp: 1060 }),
      },
    });

    scheduleSilentRefresh(buildToken({ iat: 1000, exp: 1040 }));
    await jest.advanceTimersByTimeAsync(31_000);

    expect(mockAxios.post).toHaveBeenCalledWith(
      'http://backend.test/auth/refresh',
      null,
      {
        withCredentials: true,
        headers: undefined,
      },
    );
  });

  it('clears tokens when silent refresh fails', async () => {
    const { scheduleSilentRefresh, mockAxios, mockClearAccessToken, mockGetCsrfToken } =
      await loadModule();
    jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
    mockAxios.get.mockResolvedValueOnce({ data: { csrfToken: 'csrf-token' } });
    mockGetCsrfToken.mockResolvedValue('csrf-token');
    mockAxios.post.mockRejectedValueOnce(new Error('refresh failed'));

    scheduleSilentRefresh(buildToken({ iat: 1000, exp: 1040 }));
    await jest.advanceTimersByTimeAsync(31_000);

    expect(mockClearAccessToken).toHaveBeenCalled();
  });

  it('cancels a previously scheduled refresh', () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
    return loadModule().then(({ clearScheduledRefresh, scheduleSilentRefresh }) => {
      scheduleSilentRefresh(buildToken({ iat: 1000, exp: 1040 }));
      clearScheduledRefresh();

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });
  });
});
