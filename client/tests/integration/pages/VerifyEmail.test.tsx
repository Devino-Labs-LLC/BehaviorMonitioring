import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import VerifyEmailPage from '../../../src/app/verify-email/page';
import { api } from '../../../src/lib/Api';

const mockPush = jest.fn();
const mockSearchParamGet = jest.fn();

jest.mock('../../../src/lib/Api', () => ({
  api: jest.fn(),
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
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, className }: any) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
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

describe('Verify Email Page Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParamGet.mockReturnValue('verify-token');
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows an error when no token is provided', async () => {
    mockSearchParamGet.mockReturnValue(null);

    render(<VerifyEmailPage />);

    expect(
      await screen.findByText(/No verification token provided/i),
    ).toBeInTheDocument();
  });

  it('shows the success state and routes to login', async () => {
    mockApi.mockResolvedValue({
      statusCode: 200,
      success: true,
      message: 'Your email has been verified.',
    } as any);

    render(<VerifyEmailPage />);

    expect(await screen.findByText('Email Verified Successfully!')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Go to Login' }));
    expect(mockPush).toHaveBeenCalledWith('/Login');
  });

  it('shows the expired state when the link has expired', async () => {
    mockApi.mockResolvedValue({
      statusCode: 400,
      success: false,
      message: 'Verification link expired. Please request a new one.',
    } as any);

    render(<VerifyEmailPage />);

    expect(await screen.findByText('Verification Link Expired')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to Login' })).toHaveAttribute('href', '/Login');
  });

  it('shows a generic error state when verification fails', async () => {
    mockApi.mockRejectedValue(new Error('Network down'));

    render(<VerifyEmailPage />);

    await waitFor(() => {
      expect(screen.getByText('Verification Failed')).toBeInTheDocument();
    });
  });
});
