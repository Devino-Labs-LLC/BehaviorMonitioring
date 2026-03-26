import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ManageAdmins from '../../../src/app/Admin/manageAdmins/page';
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

const mockApi = api as jest.MockedFunction<typeof api>;

describe('ManageAdmins Page Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

    global.confirm = jest.fn(() => true);

    render(<ManageAdmins />);

    await waitFor(() => {
      expect(screen.getByText('admin1')).toBeInTheDocument();
    });

    const deleteButton = screen.getByLabelText('Delete admin admin1');
    await userEvent.click(deleteButton);

    expect(global.confirm).toHaveBeenCalled();
  });

  it('displays error message on fetch failure', async () => {
    mockApi.mockRejectedValue(new Error('Network error'));

    render(<ManageAdmins />);

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });
});
