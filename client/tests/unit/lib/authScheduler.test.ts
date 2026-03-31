import axios from 'axios';
import { getCsrfToken } from '../../../src/lib/csrf';
import { clearAccessToken, setAccessToken } from '../../../src/lib/tokenStore';

jest.mock('axios');
jest.mock('../../../src/lib/csrf', () => ({
  getCsrfToken: jest.fn(),
}));
jest.mock('../../../src/lib/tokenStore', () => ({
  setAccessToken: jest.fn(),
  clearAccessToken: jest.fn(),
}));

const mockAxiosPost = axios.post as jest.MockedFunction<typeof axios.post>;
const mockGetCsrfToken = getCsrfToken as jest.MockedFunction<typeof getCsrfToken>;
const mockSetAccessToken = setAccessToken as jest.MockedFunction<typeof setAccessToken>;
const mockClearAccessToken = clearAccessToken as jest.MockedFunction<typeof clearAccessToken>;

describe('authScheduler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    process.env.NEXT_PUBLIC_BACKEND_URL = 'http://localhost:3001';
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('refreshes the token and reschedules itself', async () => {
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(0);
    const { scheduleSilentRefresh, clearScheduledRefresh } = await import(
      '../../../src/lib/authScheduler'
    );
    const tokenPayload = btoa(JSON.stringify({ iat: 0, exp: 120 }));
    mockGetCsrfToken.mockResolvedValue('csrf-token');
    mockAxiosPost.mockResolvedValue({
      data: { accessToken: `header.${tokenPayload}.sig` },
    } as any);

    scheduleSilentRefresh(`header.${tokenPayload}.sig`);
    await jest.advanceTimersByTimeAsync(90000);

    expect(mockAxiosPost).toHaveBeenCalledWith(
      'http://localhost:3001/auth/refresh',
      null,
      expect.objectContaining({
        withCredentials: true,
        headers: { 'x-csrf-token': 'csrf-token' },
      }),
    );
    expect(mockSetAccessToken).toHaveBeenCalled();

    clearScheduledRefresh();
    nowSpy.mockRestore();
  });

  it('clears the token when refresh fails', async () => {
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(0);
    const { scheduleSilentRefresh, clearScheduledRefresh } = await import(
      '../../../src/lib/authScheduler'
    );
    const tokenPayload = btoa(JSON.stringify({ iat: 0, exp: 120 }));
    mockGetCsrfToken.mockResolvedValue(null);
    mockAxiosPost.mockRejectedValue(new Error('refresh failed'));

    scheduleSilentRefresh(`header.${tokenPayload}.sig`);
    await jest.advanceTimersByTimeAsync(90000);

    expect(mockClearAccessToken).toHaveBeenCalled();
    clearScheduledRefresh();
    nowSpy.mockRestore();
  });
});
