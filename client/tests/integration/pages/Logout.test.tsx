import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Logout from '../../../src/app/Logout/page';
import { api } from '../../../src/lib/Api';
import { clearAccessToken } from '../../../src/lib/tokenStore';
import {
  ClearLoggedInUser,
  GetLoggedInUser,
  GetLoggedInUserStatus,
} from '../../../src/function/VerificationCheck';

const mockPush = jest.fn();
const mockGetLoggedInUser = jest.fn();
const mockGetLoggedInUserStatus = jest.fn();

jest.mock('../../../src/lib/Api', () => ({
  api: jest.fn(),
}));
jest.mock('../../../src/lib/tokenStore', () => ({
  clearAccessToken: jest.fn(),
}));
jest.mock('../../../src/function/VerificationCheck', () => ({
  ClearLoggedInUser: jest.fn(),
  GetLoggedInUser: () => mockGetLoggedInUser(),
  GetLoggedInUserStatus: () => mockGetLoggedInUserStatus(),
}));
jest.mock('../../../src/function/debounce', () => ({
  debounceAsync: (fn: (...args: any[]) => unknown) => (...args: any[]) => fn(...args),
}));
jest.mock('next/head', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
}));
jest.mock('../../../src/components/header', () => () => <div data-testid="header" />);
jest.mock('../../../src/components/footer', () => () => <div data-testid="footer" />);
jest.mock('../../../src/components/loading', () => () => <div data-testid="loading" />);
jest.mock('../../../src/components/Button', () => (props: any) => (
  <button type={props.btnType || 'button'} onClick={props.onClick}>
    {props.placeholder}
  </button>
));

const mockApi = api as jest.MockedFunction<typeof api>;
const mockClearAccessToken = clearAccessToken as jest.MockedFunction<typeof clearAccessToken>;
const mockClearLoggedInUser = ClearLoggedInUser as jest.MockedFunction<typeof ClearLoggedInUser>;

describe('Logout Page Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetLoggedInUser.mockReturnValue('testuser');
    mockGetLoggedInUserStatus.mockReturnValue(true);
  });

  it('submits logout, clears auth state, and shows the logout screen', async () => {
    mockApi.mockResolvedValue({
      statusCode: 200,
      serverMessage: 'Logged out',
    } as any);

    render(<Logout />);

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('post', '/auth/verifyEmployeeLogout', {
        username: 'testuser',
      });
    });

    expect(mockClearAccessToken).toHaveBeenCalled();
    expect(mockClearLoggedInUser).toHaveBeenCalled();
    expect(await screen.findByText(/You have been logged out/i)).toBeInTheDocument();
  });

  it('does not call the API when no user is logged in', async () => {
    mockGetLoggedInUserStatus.mockReturnValue(false);

    render(<Logout />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
    });

    expect(mockApi).not.toHaveBeenCalled();
    expect(mockClearAccessToken).not.toHaveBeenCalled();
  });

  it('routes back to login when the button is pressed', async () => {
    mockApi.mockResolvedValue({
      statusCode: 200,
      serverMessage: 'Logged out',
    } as any);

    render(<Logout />);

    await screen.findByRole('button', { name: 'Login' });
    fireEvent.click(screen.getByRole('button', { name: 'Login' }));

    expect(mockPush).toHaveBeenCalledWith('/Login');
  });
});
