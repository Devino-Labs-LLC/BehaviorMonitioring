import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { useAuth } from '../../../src/hooks/useAuth';
import { getBootstrapStatus, onBootstrapComplete } from '../../../src/components/AuthBootstrap';
import {
  GetAdminStatus,
  GetLoggedInUser,
  GetLoggedInUserStatus,
} from '../../../src/function/VerificationCheck';

jest.mock('../../../src/components/AuthBootstrap', () => ({
  getBootstrapStatus: jest.fn(),
  onBootstrapComplete: jest.fn(),
}));

jest.mock('../../../src/function/VerificationCheck', () => ({
  GetLoggedInUserStatus: jest.fn(),
  GetLoggedInUser: jest.fn(),
  GetAdminStatus: jest.fn(),
}));

const mockGetBootstrapStatus = getBootstrapStatus as jest.MockedFunction<typeof getBootstrapStatus>;
const mockOnBootstrapComplete = onBootstrapComplete as jest.MockedFunction<
  typeof onBootstrapComplete
>;
const mockGetLoggedInUserStatus = GetLoggedInUserStatus as jest.MockedFunction<
  typeof GetLoggedInUserStatus
>;
const mockGetLoggedInUser = GetLoggedInUser as jest.MockedFunction<typeof GetLoggedInUser>;
const mockGetAdminStatus = GetAdminStatus as jest.MockedFunction<typeof GetAdminStatus>;

function AuthProbe() {
  const auth = useAuth();

  return (
    <div>
      <span data-testid="is-ready">{String(auth.isReady)}</span>
      <span data-testid="is-logged-in">{String(auth.isLoggedIn)}</span>
      <span data-testid="username">{auth.username ?? 'null'}</span>
      <span data-testid="is-admin">{String(auth.isAdmin)}</span>
    </div>
  );
}

describe('useAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetLoggedInUserStatus.mockReturnValue(true);
    mockGetLoggedInUser.mockReturnValue('janedoe');
    mockGetAdminStatus.mockReturnValue(true);
  });

  it('hydrates immediately when bootstrap has already completed', async () => {
    mockGetBootstrapStatus.mockReturnValue({
      isBootstrapped: true,
      isBootstrapping: false,
    });

    render(<AuthProbe />);

    await waitFor(() => {
      expect(screen.getByTestId('is-ready')).toHaveTextContent('true');
    });

    expect(screen.getByTestId('is-logged-in')).toHaveTextContent('true');
    expect(screen.getByTestId('username')).toHaveTextContent('janedoe');
    expect(screen.getByTestId('is-admin')).toHaveTextContent('true');
  });

  it('waits for bootstrap completion before hydrating auth state', async () => {
    let bootstrapCallback: (() => void) | undefined;

    mockGetBootstrapStatus.mockReturnValue({
      isBootstrapped: false,
      isBootstrapping: true,
    });
    mockOnBootstrapComplete.mockImplementation((callback) => {
      bootstrapCallback = callback;
    });

    render(<AuthProbe />);

    expect(screen.getByTestId('is-ready')).toHaveTextContent('false');

    act(() => {
      bootstrapCallback?.();
    });

    await waitFor(() => {
      expect(screen.getByTestId('is-ready')).toHaveTextContent('true');
    });

    expect(screen.getByTestId('is-logged-in')).toHaveTextContent('true');
    expect(screen.getByTestId('username')).toHaveTextContent('janedoe');
    expect(screen.getByTestId('is-admin')).toHaveTextContent('true');
  });

  it('reflects logged-out state after bootstrap completion', async () => {
    let bootstrapCallback: (() => void) | undefined;

    mockGetBootstrapStatus.mockReturnValue({
      isBootstrapped: false,
      isBootstrapping: true,
    });
    mockGetLoggedInUserStatus.mockReturnValue(false);
    mockGetLoggedInUser.mockReturnValue(null);
    mockGetAdminStatus.mockReturnValue(false);
    mockOnBootstrapComplete.mockImplementation((callback) => {
      bootstrapCallback = callback;
    });

    render(<AuthProbe />);

    act(() => {
      bootstrapCallback?.();
    });

    await waitFor(() => {
      expect(screen.getByTestId('is-ready')).toHaveTextContent('true');
    });

    expect(screen.getByTestId('is-logged-in')).toHaveTextContent('false');
    expect(screen.getByTestId('username')).toHaveTextContent('null');
    expect(screen.getByTestId('is-admin')).toHaveTextContent('false');
  });
});
