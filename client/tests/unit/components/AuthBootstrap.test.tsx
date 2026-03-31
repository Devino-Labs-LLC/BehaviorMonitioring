import React from 'react';
import { render, waitFor } from '@testing-library/react';
import axios from 'axios';
import AuthBootstrap, {
  getBootstrapStatus,
  onBootstrapComplete,
  resetBootstrapState,
} from '../../../src/components/AuthBootstrap';
import { clearAccessToken, setAccessToken } from '../../../src/lib/tokenStore';
import { clearScheduledRefresh, scheduleSilentRefresh } from '../../../src/lib/authScheduler';
import { ClearLoggedInUser } from '../../../src/function/VerificationCheck';
import { getCsrfToken } from '../../../src/lib/csrf';

jest.mock('axios');
jest.mock('../../../src/lib/tokenStore', () => ({
  setAccessToken: jest.fn(),
  clearAccessToken: jest.fn(),
}));
jest.mock('../../../src/lib/authScheduler', () => ({
  clearScheduledRefresh: jest.fn(),
  scheduleSilentRefresh: jest.fn(),
}));
jest.mock('../../../src/function/VerificationCheck', () => ({
  ClearLoggedInUser: jest.fn(),
}));
jest.mock('../../../src/lib/csrf', () => ({
  getCsrfToken: jest.fn(),
}));

const mockAxiosPost = axios.post as jest.MockedFunction<typeof axios.post>;
const mockSetAccessToken = setAccessToken as jest.MockedFunction<typeof setAccessToken>;
const mockClearAccessToken = clearAccessToken as jest.MockedFunction<typeof clearAccessToken>;
const mockClearScheduledRefresh = clearScheduledRefresh as jest.MockedFunction<
  typeof clearScheduledRefresh
>;
const mockScheduleSilentRefresh = scheduleSilentRefresh as jest.MockedFunction<
  typeof scheduleSilentRefresh
>;
const mockClearLoggedInUser = ClearLoggedInUser as jest.MockedFunction<typeof ClearLoggedInUser>;
const mockGetCsrfToken = getCsrfToken as jest.MockedFunction<typeof getCsrfToken>;

describe('AuthBootstrap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetBootstrapState();
    localStorage.clear();
    process.env.NEXT_PUBLIC_BACKEND_URL = 'http://localhost:3001';
  });

  it('completes immediately when there is no stored session', async () => {
    const callback = jest.fn();
    onBootstrapComplete(callback);

    render(<AuthBootstrap />);

    await waitFor(() => {
      expect(mockClearScheduledRefresh).toHaveBeenCalled();
      expect(mockClearAccessToken).toHaveBeenCalled();
    });
  });

  it('refreshes and bootstraps an existing session', async () => {
    localStorage.setItem(
      'bmUserData',
      JSON.stringify({ bmLoggedInStatus: true, bmUsername: 'jane' }),
    );
    mockGetCsrfToken.mockResolvedValue('csrf-123');
    mockAxiosPost.mockResolvedValue({
      data: { accessToken: 'token-123' },
    } as any);

    render(<AuthBootstrap />);

    await waitFor(() => {
      expect(mockSetAccessToken).toHaveBeenCalledWith('token-123');
      expect(mockScheduleSilentRefresh).toHaveBeenCalledWith('token-123');
    });

    expect(getBootstrapStatus().isBootstrapped).toBe(true);
  });

  it('clears stored auth when refresh fails', async () => {
    localStorage.setItem(
      'bmUserData',
      JSON.stringify({ bmLoggedInStatus: true, bmUsername: 'jane' }),
    );
    mockGetCsrfToken.mockResolvedValue(null);
    mockAxiosPost.mockRejectedValue(new Error('refresh failed'));

    render(<AuthBootstrap />);

    await waitFor(() => {
      expect(mockClearLoggedInUser).toHaveBeenCalled();
      expect(mockClearAccessToken).toHaveBeenCalled();
    });
  });
});
