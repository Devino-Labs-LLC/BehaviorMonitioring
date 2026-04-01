import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ManageHomes from '../../../src/app/Admin/manageHomes/page';
import { api } from '../../../src/lib/Api';

const mockUseAuth = jest.fn();
const mockPush = jest.fn();
const mockBack = jest.fn();
const mockRouter = {
  push: mockPush,
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: mockBack,
};

jest.mock('../../../src/lib/Api', () => ({
  api: jest.fn(),
}));
jest.mock('../../../src/function/VerificationCheck', () => ({
  GetLoggedInUserStatus: () => true,
  GetAdminStatus: () => true,
  GetLoggedInUser: () => 'testuser',
}));
jest.mock('../../../src/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));
jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => '/Admin/manageHomes',
  useSearchParams: () => ({
    get: jest.fn(),
  }),
}));

const mockApi = api as jest.MockedFunction<typeof api>;

describe('ManageHomes Page Integration', () => {
  const mockHomes = [
    {
      homeID: 1,
      homeName: 'Sunrise Home',
      name: 'Sunrise Home',
      address: '123 Main St',
      street_address: '123 Main St',
      city: 'Springfield',
      state: 'IL',
      zip: '62701',
      zip_code: '62701',
      capacity: 8,
      currentOccupancy: 5,
      companyID: 1,
      companyName: 'Test Company',
      isActive: true,
    },
    {
      homeID: 2,
      homeName: 'Sunset Villa',
      name: 'Sunset Villa',
      address: '456 Oak Ave',
      street_address: '456 Oak Ave',
      city: 'Riverside',
      state: 'CA',
      zip: '92501',
      zip_code: '92501',
      capacity: 6,
      currentOccupancy: 4,
      companyID: 1,
      companyName: 'Test Company',
      isActive: true,
    },
  ];

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    jest.useRealTimers();
    mockUseAuth.mockReturnValue({
      isReady: true,
      isLoggedIn: true,
      isAdmin: true,
      username: 'testuser',
    });
  });

  it('fetches and displays homes on mount', async () => {
    mockApi.mockImplementation(() =>
      Promise.resolve({
        statusCode: 200,
        homes: mockHomes,
        totalCount: 2,
      } as any)
    );

    render(<ManageHomes />);

    await waitFor(() => {
      expect(screen.getByText('Sunrise Home')).toBeInTheDocument();
      expect(screen.getByText('Sunset Villa')).toBeInTheDocument();
      expect(screen.getByText('Springfield')).toBeInTheDocument();
      expect(screen.getByText('Riverside')).toBeInTheDocument();
    });

    expect(mockApi).toHaveBeenCalledWith('post', '/admin/getAllHomes', {
      employeeUsername: 'testuser',
    });
  });

  it('displays empty state when no homes exist', async () => {
    mockApi.mockImplementation(() =>
      Promise.resolve({
        statusCode: 200,
        homes: [],
        totalCount: 0,
      } as any)
    );

    render(<ManageHomes />);

    await waitFor(() => {
      expect(screen.getByText(/no homes found/i)).toBeInTheDocument();
    });
  });

  it('handles delete home with confirmation', async () => {
    globalThis.confirm = jest.fn(() => true);

    mockApi.mockImplementation((method, path) => {
      if (path === '/admin/deleteHome') {
        return Promise.resolve({
          statusCode: 200,
          serverMessage: 'Home deleted successfully',
        } as any);
      }

      return Promise.resolve({
        statusCode: 200,
        homes: mockHomes,
      } as any);
    });

    render(<ManageHomes />);

    await waitFor(() => {
      expect(screen.getByText('Sunrise Home')).toBeInTheDocument();
    });

    const deleteButtons = await screen.findAllByRole('button', { name: 'Delete button' });
    await userEvent.click(deleteButtons[0]);

    expect(globalThis.confirm).toHaveBeenCalledWith(
      expect.stringContaining('Sunrise Home')
    );

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('post', '/admin/deleteHome', {
        homeID: 1,
        employeeUsername: 'testuser',
      });
    });
  });

  it('does not delete when user cancels confirmation', async () => {
    globalThis.confirm = jest.fn(() => false);

    mockApi.mockImplementation(() =>
      Promise.resolve({
        statusCode: 200,
        homes: mockHomes,
      } as any)
    );

    render(<ManageHomes />);

    await waitFor(() => {
      expect(screen.getByText('Sunrise Home')).toBeInTheDocument();
    });

    const deleteButtons = await screen.findAllByRole('button', { name: 'Delete button' });
    await userEvent.click(deleteButtons[0]);

    expect(globalThis.confirm).toHaveBeenCalled();
    expect(mockApi.mock.calls.filter(([, path]) => path === '/admin/deleteHome')).toHaveLength(0);
  });

  it('navigates to edit page when edit button clicked', async () => {
    mockApi.mockImplementation(() =>
      Promise.resolve({
        statusCode: 200,
        homes: mockHomes,
      } as any)
    );

    render(<ManageHomes />);

    await waitFor(() => {
      expect(screen.getByText('Sunrise Home')).toBeInTheDocument();
    });

    const editButtons = await screen.findAllByRole('button', { name: 'Edit button' });
    await userEvent.click(editButtons[0]);

    expect(mockPush).toHaveBeenCalledWith('/Admin/manageHomes/edit?homeID=1');
  });

  it('navigates to add home page when add button clicked', async () => {
    mockApi.mockImplementation(() =>
      Promise.resolve({
        statusCode: 200,
        homes: [],
      } as any)
    );

    render(<ManageHomes />);

    const addButton = await screen.findByRole('button', { name: 'Add Home button' });
    await userEvent.click(addButton);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/Admin/manageHomes/add');
    });
  });

  it('displays error message when API call fails', async () => {
    mockApi.mockImplementation(() =>
      Promise.reject(new Error('Network error'))
    );

    render(<ManageHomes />);

    await waitFor(() => {
      expect(screen.getByText(/error|network/i)).toBeInTheDocument();
    });
  });

  it('redirects to login when not authenticated', () => {
    mockUseAuth.mockReturnValue({
      isReady: true,
      isLoggedIn: false,
      isAdmin: true,
      username: '',
    });

    render(<ManageHomes />);

    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/Login?previousUrl='));
  });

  it('redirects to home when user is not admin', () => {
    mockUseAuth.mockReturnValue({
      isReady: true,
      isLoggedIn: true,
      isAdmin: false,
      username: 'testuser',
    });

    render(<ManageHomes />);

    expect(mockPush).toHaveBeenCalledWith('/');
  });

  it('shows a message when username is unavailable during load', async () => {
    mockUseAuth.mockReturnValue({
      isReady: true,
      isLoggedIn: true,
      isAdmin: true,
      username: '',
    });

    render(<ManageHomes />);

    expect(
      await screen.findByText('Unable to identify the current user. Please log in again.'),
    ).toBeInTheDocument();
  });

  it('supports the toolbar back action', async () => {
    mockApi.mockImplementation(() =>
      Promise.resolve({
        statusCode: 200,
        homes: mockHomes,
      } as any),
    );

    render(<ManageHomes />);

    await screen.findAllByRole('button', { name: 'Delete button' });
    await userEvent.click(screen.getByText('Back'));

    expect(mockBack).toHaveBeenCalled();
  });

  it('keeps the home visible when delete fails', async () => {
    globalThis.confirm = jest.fn(() => true);

    mockApi.mockImplementation((method, path) => {
      if (path === '/admin/deleteHome') {
        return Promise.reject(new Error('delete failed'));
      }

      return Promise.resolve({
        statusCode: 200,
        homes: mockHomes,
      } as any);
    });

    render(<ManageHomes />);

    const deleteButtons = await screen.findAllByRole('button', { name: 'Delete button' });
    await userEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('post', '/admin/deleteHome', {
        homeID: 1,
        employeeUsername: 'testuser',
      });
    });

    expect(screen.getByText('Sunrise Home')).toBeInTheDocument();
  });
});
