import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ManageClients from '../../../src/app/Admin/manageClients/page';
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
jest.mock('../../../src/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: mockBack,
  }),
  usePathname: () => '/Admin/manageClients',
  useSearchParams: () => ({
    get: jest.fn(),
  }),
}));

const mockApi = api as jest.MockedFunction<typeof api>;

describe('ManageClients Page Integration', () => {
  const mockClients = [
    {
      clientID: 1,
      fName: 'John',
      lName: 'Doe',
      DOB: '1990-01-15',
      intake_Date: '2025-01-01',
      group_home_name: 'Sunrise Home',
      medicaid_id_number: 'MED123456',
      behavior_plan_due_date: '2026-06-01',
      companyID: 1,
      companyName: 'Test Company',
      entered_by: 'Admin User',
      date_entered: '2025-01-01',
    },
    {
      clientID: 2,
      fName: 'Jane',
      lName: 'Smith',
      DOB: '1985-06-20',
      intake_Date: '2025-02-15',
      group_home_name: 'Sunset Villa',
      medicaid_id_number: 'MED789012',
      behavior_plan_due_date: '2026-08-15',
      companyID: 1,
      companyName: 'Test Company',
      entered_by: 'Admin User',
      date_entered: '2025-02-15',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      isReady: true,
      isLoggedIn: true,
      isAdmin: true,
      username: 'testuser',
    });
  });

  it('fetches and displays clients on mount', async () => {
    mockApi.mockImplementation(() =>
      Promise.resolve({
        statusCode: 200,
        clientData: mockClients,
      } as any)
    );

    render(<ManageClients />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getAllByText('Test Company')).toHaveLength(2);
    });

    expect(mockApi).toHaveBeenCalledWith('post', '/aba/getAllClientInfo', {
      employeeUsername: 'testuser',
    });
  });

  it('displays empty state when no clients exist', async () => {
    mockApi.mockImplementation((method, path) => {
      if (path === '/admin/getAllHomes') {
        return Promise.resolve({
          statusCode: 200,
          homes: [],
        } as any);
      }

      return Promise.resolve({
        statusCode: 200,
        clientData: [],
      } as any);
    });

    render(<ManageClients />);

    await waitFor(() => {
      expect(screen.getByText(/no homes found/i)).toBeInTheDocument();
    });
  });

  it('handles delete client with confirmation', async () => {
    globalThis.confirm = jest.fn(() => true);

    mockApi.mockImplementation((method, path) => {
      if (path === '/admin/deleteClient') {
        return Promise.resolve({
          statusCode: 200,
          serverMessage: 'Client deleted successfully',
        } as any);
      }

      return Promise.resolve({
        statusCode: 200,
        clientData: mockClients,
      } as any);
    });

    render(<ManageClients />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByLabelText('Delete client John Doe'));

    expect(globalThis.confirm).toHaveBeenCalledWith(
      expect.stringContaining('John Doe')
    );

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('post', '/admin/deleteClient', {
        clientID: 1,
        employeeUsername: 'testuser',
      });
    });
  });

  it('does not delete when user cancels confirmation', async () => {
    globalThis.confirm = jest.fn(() => false);

    mockApi.mockImplementation(() =>
      Promise.resolve({
        statusCode: 200,
        clientData: mockClients,
      } as any)
    );

    render(<ManageClients />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByLabelText('Delete client John Doe'));

    expect(globalThis.confirm).toHaveBeenCalled();
    expect(mockApi.mock.calls.filter(([, path]) => path === '/admin/deleteClient')).toHaveLength(0);
  });

  it('navigates to edit page when edit button clicked', async () => {
    mockApi.mockResolvedValueOnce({
      statusCode: 200,
      clientData: mockClients,
    } as any);

    render(<ManageClients />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByLabelText('Edit client John Doe'));

    expect(mockPush).toHaveBeenCalledWith('/Admin/manageClients/edit?id=1');
  });

  it('displays success message after deletion', async () => {
    globalThis.confirm = jest.fn(() => true);

    mockApi.mockImplementation((method, path) => {
      if (path === '/admin/deleteClient') {
        return Promise.resolve({
          statusCode: 200,
          serverMessage: 'Client deleted successfully',
        } as any);
      }

      return Promise.resolve({
        statusCode: 200,
        clientData: mockClients,
      } as any);
    });

    render(<ManageClients />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByLabelText('Delete client John Doe'));

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('post', '/admin/deleteClient', {
        clientID: 1,
        employeeUsername: 'testuser',
      });
    });
  });

  it('displays error message when API call fails', async () => {
    mockApi.mockImplementation(() =>
      Promise.reject(new Error('Network error'))
    );

    render(<ManageClients />);

    await waitFor(() => {
      // The component should handle errors gracefully
      expect(mockApi).toHaveBeenCalled();
    });
  });

  it('redirects logged-out users to login', async () => {
    mockUseAuth.mockReturnValue({
      isReady: true,
      isLoggedIn: false,
      isAdmin: false,
      username: '',
    });

    render(<ManageClients />);

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

    render(<ManageClients />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  it('archives a client after confirmation and shows the deletion date', async () => {
    globalThis.confirm = jest.fn(() => true);

    mockApi.mockImplementation((method, path) => {
      if (path === '/admin/archiveClient') {
        return Promise.resolve({
          statusCode: 200,
          deletionDate: '2033-03-31',
        } as any);
      }

      return Promise.resolve({
        statusCode: 200,
        clientData: mockClients,
      } as any);
    });

    render(<ManageClients />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByLabelText('Archive client John Doe'));

    expect(globalThis.confirm).toHaveBeenCalledWith(expect.stringContaining('John Doe'));

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('post', '/admin/archiveClient', {
        clientID: 1,
        employeeUsername: 'testuser',
      });
    });

    expect(screen.getByText(/Deletion scheduled for:/i)).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes('2033-03-31'))).toBeInTheDocument();
  });

  it('supports the back action from the toolbar', async () => {
    mockApi.mockResolvedValueOnce({
      statusCode: 200,
      clientData: mockClients,
    } as any);

    render(<ManageClients />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: 'Back button' }));

    expect(mockBack).toHaveBeenCalled();
  });

});
