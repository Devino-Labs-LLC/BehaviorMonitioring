import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Login from '../../../src/app/Login/page';
import { api } from '../../../src/lib/Api';
import { scheduleSilentRefresh } from '../../../src/lib/authScheduler';
import { setAccessToken } from '../../../src/lib/tokenStore';
import {
  GetLoggedInUserStatus,
  SetLoggedInUser,
} from '../../../src/function/VerificationCheck';

const mockPush = jest.fn();
const mockSearchParamGet = jest.fn();

jest.mock('../../../src/lib/Api', () => ({
  api: jest.fn(),
}));
jest.mock('../../../src/lib/tokenStore', () => ({
  setAccessToken: jest.fn(),
}));
jest.mock('../../../src/lib/authScheduler', () => ({
  scheduleSilentRefresh: jest.fn(),
}));
jest.mock('../../../src/function/VerificationCheck', () => ({
  GetLoggedInUserStatus: jest.fn(),
  SetLoggedInUser: jest.fn(),
}));
jest.mock('../../../src/function/debounce', () => ({
  debounceAsync: (fn: (...args: any[]) => unknown) => (...args: any[]) => fn(...args),
}));
jest.mock('../../../src/function/EntryCheck', () => ({
  CheckUsername: (username: string) => /^[a-zA-Z0-9_]+$/.test(username),
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
  useSearchParams: () => ({
    get: mockSearchParamGet,
  }),
}));
jest.mock('../../../src/components/header', () => () => <div data-testid="header" />);
jest.mock('../../../src/components/footer', () => () => <div data-testid="footer" />);
jest.mock('../../../src/components/loading', () => () => <div data-testid="loading" />);
jest.mock('../../../src/components/Inputfield', () => (props: any) => (
  <input
    aria-label={props.name}
    placeholder={props.placeholder}
    type={props.type}
    value={props.value}
    onChange={props.onChange}
  />
));
jest.mock('../../../src/components/Button', () => (props: any) => (
  <button type={props.btnType || 'button'} onClick={props.onClick}>
    {props.placeholder}
  </button>
));

const mockApi = api as jest.MockedFunction<typeof api>;
const mockSetAccessToken = setAccessToken as jest.MockedFunction<typeof setAccessToken>;
const mockScheduleSilentRefresh = scheduleSilentRefresh as jest.MockedFunction<
  typeof scheduleSilentRefresh
>;
const mockGetLoggedInUserStatus = GetLoggedInUserStatus as jest.MockedFunction<
  typeof GetLoggedInUserStatus
>;
const mockSetLoggedInUser = SetLoggedInUser as jest.MockedFunction<typeof SetLoggedInUser>;

describe('Login Page Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParamGet.mockReturnValue(null);
    mockGetLoggedInUserStatus.mockReturnValue(false);
  });

  it('validates required fields before calling the API', async () => {
    render(<Login />);

    fireEvent.click(screen.getByRole('button', { name: 'Login' }));

    expect(await screen.findByText('All fields must be filled out')).toBeInTheDocument();
    expect(mockApi).not.toHaveBeenCalled();
  });

  it('redirects already logged in users immediately', async () => {
    mockGetLoggedInUserStatus.mockReturnValue(true);
    mockSearchParamGet.mockReturnValue('/Admin');

    render(<Login />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/Admin');
    });
  });

  it('logs the user in and schedules silent refresh on success', async () => {
    mockSearchParamGet.mockReturnValue('/Dashboard');
    mockApi.mockResolvedValue({
      statusCode: 200,
      accessToken: 'token-123',
      loginStatus: true,
      user: 'janedoe',
    } as any);

    render(<Login />);

    fireEvent.change(screen.getByPlaceholderText('Username'), {
      target: { value: 'janedoe' },
    });
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'Password123' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Login' }));

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('post', '/auth/verifyEmployeeLogin', {
        username: 'janedoe',
        password: 'Password123',
      });
    });

    expect(mockSetAccessToken).toHaveBeenCalledWith('token-123');
    expect(mockScheduleSilentRefresh).toHaveBeenCalledWith('token-123');
    expect(mockSetLoggedInUser).toHaveBeenCalledWith(true, 'janedoe');

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/Dashboard');
    });
  });
});
