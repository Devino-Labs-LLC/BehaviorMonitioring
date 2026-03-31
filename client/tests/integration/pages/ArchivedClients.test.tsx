import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ArchivedClients from '../../../src/app/Admin/ArchivedClients/page';
import { api } from '../../../src/lib/Api';

const mockPush = jest.fn();
const mockUseAuth = jest.fn();

jest.mock('../../../src/lib/Api', () => ({
  api: jest.fn(),
}));
jest.mock('../../../src/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
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

const mockApi = api as jest.MockedFunction<typeof api>;

describe('ArchivedClients Page Integration', () => {
  const archivedClients = [
    {
      clientID: 1,
      fName: 'John',
      lName: 'Doe',
      DOB: '1990-01-15',
      group_home_name: 'Sunrise Home',
      archived_date: '2025-01-15',
      archived_deletion_date: '2099-01-01',
      archived_by: 'testadmin',
    },
    {
      clientID: 2,
      fName: 'Jane',
      lName: 'Smith',
      DOB: '1985-06-20',
      group_home_name: null,
      archived_date: '2025-02-15',
      archived_deletion_date: '2000-01-01',
      archived_by: 'testadmin',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      isReady: true,
      isLoggedIn: true,
      isAdmin: true,
      username: 'testadmin',
    });
  });

  it('redirects unauthenticated users to login', async () => {
    mockUseAuth.mockReturnValue({
      isReady: true,
      isLoggedIn: false,
      isAdmin: false,
      username: '',
    });

    render(<ArchivedClients />);

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

    render(<ArchivedClients />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  it('loads archived clients and shows overdue status', async () => {
    mockApi.mockResolvedValueOnce({
      statusCode: 200,
      archivedClients,
    } as any);

    render(<ArchivedClients />);

    expect(await screen.findByText('Archived Clients')).toBeInTheDocument();
    expect(await screen.findByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('N/A')).toBeInTheDocument();
    expect(screen.getByText('Overdue')).toBeInTheDocument();
  });

  it('shows empty state when there are no archived clients', async () => {
    mockApi.mockResolvedValueOnce({
      statusCode: 200,
      archivedClients: [],
    } as any);

    render(<ArchivedClients />);

    expect(await screen.findByText(/no archived clients found/i)).toBeInTheDocument();
  });

  it('unarchives a client after confirmation', async () => {
    const user = userEvent.setup();
    let currentArchivedClients = [archivedClients[0]];

    mockApi.mockImplementation((method, path) => {
      if (path === '/admin/unarchiveClient') {
        currentArchivedClients = [];
        return Promise.resolve({
          statusCode: 200,
          serverMessage: 'Client restored',
        } as any);
      }

      return Promise.resolve({
        statusCode: 200,
        archivedClients: currentArchivedClients,
      } as any);
    });

    render(<ArchivedClients />);

    expect(await screen.findByText('John Doe')).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: 'Unarchive button' })[0]);
    expect(screen.getByText('Confirm Unarchive')).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: 'Unarchive button' })[1]);

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('POST', '/admin/unarchiveClient', {
        clientID: 1,
        employeeUsername: 'testadmin',
      });
    });

    expect(await screen.findByText(/has been restored to active status/i)).toBeInTheDocument();
  });

  it('deletes a client after confirmation', async () => {
    const user = userEvent.setup();
    let currentArchivedClients = [archivedClients[0]];

    mockApi.mockImplementation((method, path) => {
      if (path === '/admin/deleteArchivedClient') {
        currentArchivedClients = [];
        return Promise.resolve({
          statusCode: 200,
          serverMessage: 'Client deleted',
        } as any);
      }

      return Promise.resolve({
        statusCode: 200,
        archivedClients: currentArchivedClients,
      } as any);
    });

    render(<ArchivedClients />);

    expect(await screen.findByText('John Doe')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Delete button' }));
    expect(screen.getByText('Confirm Deletion')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Delete Permanently button' }));

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('POST', '/admin/deleteArchivedClient', {
        clientID: 1,
        employeeUsername: 'testadmin',
      });
    });

    expect(await screen.findByText(/data has been permanently deleted/i)).toBeInTheDocument();
  });
});
