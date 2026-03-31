import { getAccessToken, setAccessToken, clearAccessToken } from '../../../src/lib/tokenStore';
import { ClearLoggedInUser } from '../../../src/function/VerificationCheck';
import { clearScheduledRefresh, scheduleSilentRefresh } from '../../../src/lib/authScheduler';
import { getCsrfToken } from '../../../src/lib/csrf';

const mockRequestUse = jest.fn();
const mockRequest = jest.fn();
const mockPost = jest.fn();

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    create: jest.fn(() => ({
      interceptors: {
        request: {
          use: mockRequestUse,
        },
      },
      request: mockRequest,
      post: mockPost,
    })),
  },
}));
jest.mock('../../../src/lib/tokenStore', () => ({
  getAccessToken: jest.fn(),
  setAccessToken: jest.fn(),
  clearAccessToken: jest.fn(),
}));
jest.mock('../../../src/function/VerificationCheck', () => ({
  ClearLoggedInUser: jest.fn(),
}));
jest.mock('../../../src/lib/authScheduler', () => ({
  clearScheduledRefresh: jest.fn(),
  scheduleSilentRefresh: jest.fn(),
}));
jest.mock('../../../src/lib/csrf', () => ({
  getCsrfToken: jest.fn(),
}));

const mockGetAccessToken = getAccessToken as jest.MockedFunction<typeof getAccessToken>;
const mockSetAccessToken = setAccessToken as jest.MockedFunction<typeof setAccessToken>;
const mockClearAccessToken = clearAccessToken as jest.MockedFunction<typeof clearAccessToken>;
const mockClearLoggedInUser = ClearLoggedInUser as jest.MockedFunction<typeof ClearLoggedInUser>;
const mockClearScheduledRefresh = clearScheduledRefresh as jest.MockedFunction<
  typeof clearScheduledRefresh
>;
const mockScheduleSilentRefresh = scheduleSilentRefresh as jest.MockedFunction<
  typeof scheduleSilentRefresh
>;
const mockGetCsrfToken = getCsrfToken as jest.MockedFunction<typeof getCsrfToken>;

describe('api client helper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_BACKEND_URL = 'http://localhost:3001';
  });

  it('adds csrf headers for unsafe request methods through the interceptor', async () => {
    const { api } = await import('../../../src/lib/Api');
    void api;
    mockGetCsrfToken.mockResolvedValue('csrf-123');

    const interceptor = mockRequestUse.mock.calls[0][0];
    const result = await interceptor({ method: 'post', headers: {} });

    expect(result.headers).toEqual({ 'x-csrf-token': 'csrf-123' });
  });

  it('sends bearer tokens on successful requests', async () => {
    const { api } = await import('../../../src/lib/Api');
    mockGetAccessToken.mockReturnValue('access-token');
    mockRequest.mockResolvedValue({ data: { ok: true } });

    await expect(api('post', '/auth/login', { user: 'jane' })).resolves.toEqual({ ok: true });

    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'post',
        url: '/auth/login',
        data: { user: 'jane' },
        headers: expect.objectContaining({
          Authorization: 'Bearer access-token',
        }),
      }),
    );
  });

  it('refreshes and retries when the first request returns 401', async () => {
    const { api } = await import('../../../src/lib/Api');
    mockGetAccessToken.mockReturnValue('stale-token');
    mockRequest.mockRejectedValueOnce({ response: { status: 401 } }).mockResolvedValueOnce({
      data: { ok: true },
    });
    mockPost.mockResolvedValue({ data: { accessToken: 'fresh-token' } });

    await expect(api('get', '/protected', { id: 1 })).resolves.toEqual({ ok: true });

    expect(mockSetAccessToken).toHaveBeenCalledWith('fresh-token');
    expect(mockScheduleSilentRefresh).toHaveBeenCalledWith('fresh-token');
    expect(mockRequest).toHaveBeenLastCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer fresh-token',
        }),
      }),
    );
  });

  it('clears auth state when token refresh fails', async () => {
    const { api } = await import('../../../src/lib/Api');
    const error = { response: { status: 401 } };
    mockGetAccessToken.mockReturnValue('stale-token');
    mockRequest.mockRejectedValue(error);
    mockPost.mockRejectedValue(new Error('refresh failed'));

    await expect(api('get', '/protected')).rejects.toBe(error);

    expect(mockClearScheduledRefresh).toHaveBeenCalled();
    expect(mockClearAccessToken).toHaveBeenCalled();
    expect(mockClearLoggedInUser).toHaveBeenCalled();
  });
});
