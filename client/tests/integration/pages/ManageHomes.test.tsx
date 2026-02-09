import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ManageHomes from '../../../src/app/Admin/manageHomes/page';
import { api } from '../../../src/lib/Api';

jest.mock('../../../src/lib/Api', () => ({
  api: jest.fn(),
}));
jest.mock('../../../src/function/VerificationCheck', () => ({
  GetLoggedInUserStatus: () => true,
  GetAdminStatus: () => true,
  GetLoggedInUser: () => 'testuser',
}));
jest.mock('../../../src/hooks/useAuth', () => ({
  useAuth: () => ({
    isReady: true,
    isLoggedIn: true,
    isAdmin: true,
    username: 'testuser',
  }),
}));
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
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
    jest.clearAllMocks();
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

    expect(mockApi).toHaveBeenCalledWith('post', '/admin/getAllHomes', {});
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
    global.confirm = jest.fn(() => true);

    mockApi
      .mockResolvedValueOnce({
        statusCode: 200,
        homes: mockHomes,
      } as any)
      .mockResolvedValueOnce({
        statusCode: 200,
        serverMessage: 'Home deleted successfully',
      } as any)
      .mockResolvedValueOnce({
        statusCode: 200,
        homes: [mockHomes[1]],
      } as any);

    render(<ManageHomes />);

    await waitFor(() => {
      expect(screen.getByText('Sunrise Home')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByText('Delete');
    await userEvent.click(deleteButtons[0]);

    expect(global.confirm).toHaveBeenCalledWith(
      expect.stringContaining('Sunrise Home')
    );

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('post', '/admin/deleteHome', {
        homeID: 1,
      });
    });
  });

  it('does not delete when user cancels confirmation', async () => {
    global.confirm = jest.fn(() => false);

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

    const deleteButtons = screen.getAllByText('Delete');
    await userEvent.click(deleteButtons[0]);

    expect(global.confirm).toHaveBeenCalled();
    expect(mockApi).toHaveBeenCalledTimes(1); // Only initial fetch
  });

  it('navigates to edit page when edit button clicked', async () => {
    const mockPush = jest.fn();
    jest.spyOn(require('next/navigation'), 'useRouter').mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
    });

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

    const editButtons = screen.getAllByText('Edit');
    await userEvent.click(editButtons[0]);

    expect(mockPush).toHaveBeenCalledWith('/Admin/manageHomes/edit?homeID=1');
  });

  it('navigates to add home page when add button clicked', async () => {
    const mockPush = jest.fn();
    jest.spyOn(require('next/navigation'), 'useRouter').mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
    });

    mockApi.mockImplementation(() =>
      Promise.resolve({
        statusCode: 200,
        homes: [],
      } as any)
    );

    render(<ManageHomes />);

    await waitFor(() => {
      const addButton = screen.getByText('Add Home');
      userEvent.click(addButton);
    });

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
    jest.resetModules();
    jest.doMock('../../../src/hooks/useAuth', () => ({
      useAuth: () => ({
        isReady: true,
        isLoggedIn: false,
        isAdmin: true,
        username: '',
      }),
    }));

    const mockPush = jest.fn();
    jest.doMock('next/navigation', () => ({
      useRouter: () => ({
        push: mockPush,
        replace: jest.fn(),
        prefetch: jest.fn(),
        back: jest.fn(),
      }),
      usePathname: () => '/Admin/manageHomes',
      useSearchParams: () => ({
        get: jest.fn(),
      }),
    }));
  });

  it('redirects to home when user is not admin', () => {
    jest.resetModules();
    jest.doMock('../../../src/hooks/useAuth', () => ({
      useAuth: () => ({
        isReady: true,
        isLoggedIn: true,
        isAdmin: false,
        username: 'testuser',
      }),
    }));

    const mockPush = jest.fn();
    jest.doMock('next/navigation', () => ({
      useRouter: () => ({
        push: mockPush,
        replace: jest.fn(),
        prefetch: jest.fn(),
        back: jest.fn(),
      }),
      usePathname: () => '/Admin/manageHomes',
      useSearchParams: () => ({
        get: jest.fn(),
      }),
    }));
  });
});
