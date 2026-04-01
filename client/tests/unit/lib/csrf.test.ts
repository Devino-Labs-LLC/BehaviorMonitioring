jest.mock('axios');

describe('csrf helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_BACKEND_URL = 'http://backend.test';
    jest.resetModules();
  });

  async function loadModule() {
    const axiosModule = await import('axios');
    const module = await import('../../../src/lib/csrf');
    module.clearCsrfToken();
    return {
      ...module,
      mockAxios: axiosModule.default as jest.Mocked<typeof axiosModule.default>,
    };
  }

  it('fetches and caches the csrf token', async () => {
    const { getCsrfToken, mockAxios } = await loadModule();
    mockAxios.get.mockResolvedValueOnce({ data: { csrfToken: 'token-123' } });

    await expect(getCsrfToken()).resolves.toBe('token-123');
    await expect(getCsrfToken()).resolves.toBe('token-123');

    expect(mockAxios.get).toHaveBeenCalledTimes(1);
    expect(mockAxios.get).toHaveBeenCalledWith('http://backend.test/csrf-token', {
      withCredentials: true,
    });
  });

  it('reuses an in-flight csrf request', async () => {
    const { getCsrfToken, mockAxios } = await loadModule();
    let resolveRequest: ((value: { data: { csrfToken: string } }) => void) | undefined;

    mockAxios.get.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        }) as ReturnType<typeof axios.get>,
    );

    const first = getCsrfToken();
    const second = getCsrfToken();
    resolveRequest?.({ data: { csrfToken: 'shared-token' } });

    await expect(first).resolves.toBe('shared-token');
    await expect(second).resolves.toBe('shared-token');
    expect(mockAxios.get).toHaveBeenCalledTimes(1);
  });

  it('forces a refresh when requested', async () => {
    const { getCsrfToken, mockAxios } = await loadModule();
    mockAxios.get
      .mockResolvedValueOnce({ data: { csrfToken: 'token-123' } })
      .mockResolvedValueOnce({ data: { csrfToken: 'token-456' } });

    await expect(getCsrfToken()).resolves.toBe('token-123');
    await expect(getCsrfToken(true)).resolves.toBe('token-456');

    expect(mockAxios.get).toHaveBeenCalledTimes(2);
  });

  it('returns null when the backend does not provide a token', async () => {
    const { getCsrfToken, mockAxios } = await loadModule();
    mockAxios.get.mockResolvedValueOnce({ data: {} });

    await expect(getCsrfToken()).resolves.toBeNull();
  });

  it('returns null and clears cache when the request fails', async () => {
    const { getCsrfToken, mockAxios } = await loadModule();
    mockAxios.get.mockRejectedValueOnce(new Error('csrf failed'));

    await expect(getCsrfToken()).resolves.toBeNull();

    mockAxios.get.mockResolvedValueOnce({ data: { csrfToken: 'recovered' } });
    await expect(getCsrfToken()).resolves.toBe('recovered');
  });
});
