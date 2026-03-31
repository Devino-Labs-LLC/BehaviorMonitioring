import axios from 'axios';
import { clearCsrfToken, getCsrfToken } from '../../../src/lib/csrf';

jest.mock('axios');

const mockAxiosGet = axios.get as jest.MockedFunction<typeof axios.get>;

describe('csrf helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearCsrfToken();
    process.env.NEXT_PUBLIC_BACKEND_URL = 'http://localhost:3001';
  });

  it('caches the csrf token between requests', async () => {
    mockAxiosGet.mockResolvedValue({
      data: { csrfToken: 'token-123' },
    } as any);

    await expect(getCsrfToken()).resolves.toBe('token-123');
    await expect(getCsrfToken()).resolves.toBe('token-123');

    expect(mockAxiosGet).toHaveBeenCalledTimes(1);
  });

  it('allows force refresh and handles failures', async () => {
    mockAxiosGet
      .mockResolvedValueOnce({ data: { csrfToken: 'token-123' } } as any)
      .mockRejectedValueOnce(new Error('no token'));

    await getCsrfToken();
    await expect(getCsrfToken(true)).resolves.toBeNull();
  });
});
