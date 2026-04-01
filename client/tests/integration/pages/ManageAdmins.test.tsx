import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ManageAdmins from '../../../src/app/Admin/manageAdmins/page';
import { api } from '../../../src/lib/Api';

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockUseAuth = jest.fn();

jest.mock('../../../src/lib/Api', () => ({
  api: jest.fn(),
}));
jest.mock('../../../src/function/VerificationCheck', () => ({
  GetLoggedInUserStatus: () => true,
  GetAdminStatus: () => true,
  GetLoggedInUser: () => 'testuser',
}));
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
  }),
}));
jest.mock('../../../src/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockApi = api as jest.MockedFunction<typeof api>;

describe('ManageAdmins Page Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      isReady: true,
      isLoggedIn: true,
      isAdmin: true,
      username: 'testuser',
    });
  });

  it('fetches and displays admin list on mount', async () => {
    const mockAdmins = [
      {
        adminID: 1,
        username: 'admin1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        role: 'admin',
        isActive: true,
        lastLogin: '2025-12-21',
      },
      {
        adminID: 2,
        username: 'admin2',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        role: 'manager',
        isActive: true,
        lastLogin: '2025-12-20',
      },
    ];

    mockApi.mockImplementation(() =>
      Promise.resolve({
        statusCode: 200,
        admins: mockAdmins,
      } as any)
    );

    render(<ManageAdmins />);

    await waitFor(() => {
      expect(screen.getByText('admin1')).toBeInTheDocument();
      expect(screen.getByText('admin2')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });
  });

  it('handles delete admin action with confirmation', async () => {
    const mockAdmins = [
      {
        adminID: 1,
        username: 'admin1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        role: 'admin',
        isActive: true,
        lastLogin: '2025-12-21',
      },
    ];

    mockApi
      .mockResolvedValueOnce({
        statusCode: 200,
        admins: mockAdmins,
      } as any)
      .mockResolvedValueOnce({
        statusCode: 200,
        serverMessage: 'Admin deleted successfully',
      } as any)
      .mockResolvedValueOnce({
        statusCode: 200,
        admins: [],
      } as any);

    globalThis.confirm = jest.fn(() => true);

    render(<ManageAdmins />);

    await waitFor(() => {
      expect(screen.getByText('admin1')).toBeInTheDocument();
    });

    const deleteButton = screen.getByLabelText('Delete admin admin1');
    await userEvent.click(deleteButton);

    expect(globalThis.confirm).toHaveBeenCalled();
  });

  it('navigates to login when auth is ready but the user is logged out', async () => {
    mockUseAuth.mockReturnValue({
      isReady: true,
      isLoggedIn: false,
      isAdmin: false,
      username: '',
    });

    render(<ManageAdmins />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/Login?previousUrl='));
    });
  });

  it('redirects non-admin users to the home page', async () => {
    mockUseAuth.mockReturnValue({
      isReady: true,
      isLoggedIn: true,
      isAdmin: false,
      username: 'testuser',
    });

    render(<ManageAdmins />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  it('shows the empty state when no admins are returned', async () => {
    mockApi.mockResolvedValue({
      statusCode: 200,
      admins: [],
    } as any);

    render(<ManageAdmins />);

    await waitFor(() => {
      expect(screen.getByText('No admins found. Click "Add Admin" to create one.')).toBeInTheDocument();
    });
  });

  it('navigates back and to edit when the action buttons are pressed', async () => {
    const user = userEvent.setup();

    mockApi.mockResolvedValue({
      statusCode: 200,
      admins: [
        {
          adminID: 7,
          username: 'admin7',
          firstName: 'Amy',
          lastName: 'Adams',
          email: 'amy@example.com',
          role: 'admin',
          isActive: true,
          lastLogin: null,
        },
      ],
    } as any);

    render(<ManageAdmins />);

    await waitFor(() => {
      expect(screen.getByText('admin7')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Back button' }));
    expect(mockBack).toHaveBeenCalled();

    await user.click(screen.getByLabelText('Edit admin admin7'));
    expect(mockPush).toHaveBeenCalledWith('/Admin/manageAdmins/edit?id=7');
  });

  it('does not delete an admin when confirmation is cancelled', async () => {
    const user = userEvent.setup();

    mockApi.mockImplementation((method, path) => {
      if (path === '/admin/getAllAdmins') {
        return Promise.resolve({
          statusCode: 200,
          admins: [
            {
              adminID: 1,
              username: 'admin1',
              firstName: 'John',
              lastName: 'Doe',
              email: 'john@example.com',
              role: 'admin',
              isActive: true,
              lastLogin: '2025-12-21',
            },
          ],
        } as any);
      }

      return Promise.reject(new Error(`Unexpected API path: ${path}`));
    });

    globalThis.confirm = jest.fn(() => false);

    render(<ManageAdmins />);

    await waitFor(() => {
      expect(screen.getByText('admin1')).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText('Delete admin admin1'));

    expect(globalThis.confirm).toHaveBeenCalled();
    expect(mockApi).not.toHaveBeenCalledWith('post', '/admin/deleteAnEmployee', expect.anything());
  });

  it('displays error message on fetch failure', async () => {
    mockApi.mockRejectedValue(new Error('Network error'));

    render(<ManageAdmins />);

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });
});
