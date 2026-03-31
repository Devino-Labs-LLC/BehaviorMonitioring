import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import AdminPage from '../../../src/app/Admin/page';
import SkillPage from '../../../src/app/Skill/page';
import AddSkillPage from '../../../src/app/Skill/Add/page';

const mockPush = jest.fn();
const mockUseAuth = jest.fn();
const mockGetLoggedInUserStatus = jest.fn();

jest.mock('../../../src/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));
jest.mock('../../../src/function/VerificationCheck', () => ({
  GetLoggedInUserStatus: () => mockGetLoggedInUserStatus(),
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
jest.mock('../../../src/components/loading', () => () => <div data-testid="loading" />);
jest.mock('../../../src/components/Link', () => (props: any) => (
  <a href={props.href}>{props.placeholder}</a>
));

describe('Admin and Skill Page Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      isReady: true,
      isLoggedIn: true,
      isAdmin: true,
    });
    mockGetLoggedInUserStatus.mockReturnValue(true);
  });

  it('renders admin shortcuts for authenticated admins', async () => {
    render(<AdminPage />);

    expect(await screen.findByText('Manage admins')).toBeInTheDocument();
    expect(screen.getByText('Manage clients')).toBeInTheDocument();
    expect(screen.getByText('Manage homes')).toBeInTheDocument();
    expect(screen.getByText('Archived clients')).toBeInTheDocument();
  });

  it('redirects unauthenticated admins to login', async () => {
    mockUseAuth.mockReturnValue({
      isReady: true,
      isLoggedIn: false,
      isAdmin: false,
    });

    render(<AdminPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/Login?previousUrl='));
    });
  });

  it('renders the skill page for logged-in users', async () => {
    render(<SkillPage />);

    expect(await screen.findByText('Skill Aquisition')).toBeInTheDocument();
  });

  it('redirects visitors to login from the skill page', async () => {
    mockGetLoggedInUserStatus.mockReturnValue(false);

    render(<SkillPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/Login?previousUrl='));
    });
  });

  it('renders the add skill page for logged-in users', async () => {
    render(<AddSkillPage />);

    expect(await screen.findAllByText('Skill Aquisition')).toHaveLength(1);
  });

  it('redirects visitors to login from the add skill page', async () => {
    mockGetLoggedInUserStatus.mockReturnValue(false);

    render(<AddSkillPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/Login?previousUrl='));
    });
  });
});
