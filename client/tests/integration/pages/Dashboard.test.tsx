import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Dashboard from '../../../src/app/Dashboard/page';
import { api } from '../../../src/lib/Api';

jest.mock('../../../src/lib/Api');
jest.mock('../../../src/hooks/useAuth', () => ({
  useAuth: jest.fn(() => ({
    isReady: true,
    isLoggedIn: true,
    username: 'testuser',
    isAdmin: false,
  })),
}));
jest.mock('../../../src/function/VerificationCheck', () => ({
  GetLoggedInUserStatus: () => true,
  GetLoggedInUser: () => 'testuser',
  GetCompanyID: () => 1,
  GetAdminStatus: () => false,
}));
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => '/Dashboard',
  useSearchParams: () => ({
    get: jest.fn(),
  }),
}));

const mockApi = api as jest.MockedFunction<typeof api>;
const mockUseAuth = jest.requireMock('../../../src/hooks/useAuth').useAuth as jest.Mock;
const mockPush = jest.fn();
const mockRouter = {
  push: mockPush,
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
};

type ApiMockOptions = {
  clients?: any[];
  homes?: any[];
  behaviorList?: any[];
  behaviorDataById?: Record<string, any>;
  getAllClientsResponse?: any;
  getAllClientsError?: any;
  behaviorListResponse?: any;
  behaviorListError?: any;
};

jest.spyOn(require('next/navigation'), 'useRouter').mockReturnValue({
  ...mockRouter,
});

describe('Dashboard Page Integration', () => {
  const mockClients = [
    { clientID: 1, fName: 'John', lName: 'Doe' },
    { clientID: 2, fName: 'Jane', lName: 'Smith' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(require('next/navigation'), 'useRouter').mockReturnValue({
      ...mockRouter,
    });
    mockUseAuth.mockReturnValue({
      isReady: true,
      isLoggedIn: true,
      username: 'testuser',
      isAdmin: false,
    });
  });

  const mockDashboardApi = ({
    clients = mockClients,
    homes = [{ homeID: 1, name: 'Main Home' }],
    behaviorList = [],
    behaviorDataById = {},
    getAllClientsResponse,
    getAllClientsError,
    behaviorListResponse,
    behaviorListError,
  }: ApiMockOptions = {}) => {
    mockApi.mockImplementation(async (_method, url, payload) => {
      if (url === '/aba/getAllClientInfo') {
        if (getAllClientsError) {
          throw getAllClientsError;
        }

        return getAllClientsResponse ?? {
          statusCode: 200,
          clientData: clients,
        };
      }

      if (url === '/admin/getAllHomes') {
        return {
          statusCode: 200,
          homes,
        } as any;
      }

      if (url === '/aba/getClientTargetBehavior') {
        if (behaviorListError) {
          throw behaviorListError;
        }

        return behaviorListResponse ?? {
          statusCode: 200,
          behaviorSkillData: behaviorList,
        };
      }

      if (url === '/aba/getTargetBehavior') {
        return behaviorDataById[String(payload?.behaviorID)] ?? {
          statusCode: 200,
          behaviorSkillData: [],
        };
      }

      throw new Error(`Unexpected API call: ${url}`);
    });
  };

  it('fetches clients on mount', async () => {
    mockApi.mockResolvedValueOnce({
      statusCode: 200,
      clientData: mockClients,
    } as any);
    mockApi.mockResolvedValueOnce({
      statusCode: 200,
      behaviorSkillData: [],
    } as any);

    render(<Dashboard />);

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('post', '/aba/getAllClientInfo', {
        employeeUsername: 'testuser',
      });
    });
  });

  it('loads dashboard entries through behavior list and behavior-data calls', async () => {
    mockDashboardApi({
      clients: [{ clientID: 1, fName: 'John', lName: 'Doe' }],
      behaviorList: [
        { bsID: 10, name: 'Aggression', measurement: 'Frequency' },
        { bsID: 11, name: 'Elopement', measurement: 'Duration' },
      ],
      behaviorDataById: {
        '10': {
          statusCode: 200,
          behaviorSkillData: [
            { behaviorDataID: 'a', bsID: 10, clientID: 1, clientName: 'John Doe', sessionDate: '2026-03-20', count: 2, duration: 0 },
          ],
        },
        '11': {
          statusCode: 200,
          behaviorSkillData: [
            { behaviorDataID: 'b', bsID: 11, clientID: 1, clientName: 'John Doe', sessionDate: '2026-03-21', count: 0, duration: 5 },
          ],
        },
      },
    });

    render(<Dashboard />);

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('post', '/aba/getClientTargetBehavior', {
        clientID: '1',
        employeeUsername: 'testuser',
      });
    });

    expect(mockApi).toHaveBeenCalledWith('post', '/aba/getTargetBehavior', {
      clientID: '1',
      behaviorID: 10,
      employeeUsername: 'testuser',
    });

    expect(mockApi).toHaveBeenCalledWith('post', '/aba/getTargetBehavior', {
      clientID: '1',
      behaviorID: 11,
      employeeUsername: 'testuser',
    });
  });

  it('shows invalid company scope message from the API', async () => {
    mockApi.mockResolvedValueOnce({
      statusCode: 403,
      serverMessage: 'User is not assigned to a valid company',
    } as any);

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('User is not assigned to a valid company')).toBeInTheDocument();
    });
  });

  it('shows an empty-state message when the selected client has no behaviors', async () => {
    mockDashboardApi({
      clients: [{ clientID: 1, fName: 'John', lName: 'Doe' }],
      behaviorList: [],
    });

    render(<Dashboard />);

    expect(await screen.findByText('No data available within range.')).toBeInTheDocument();
  });

  it('shows the no-clients prompt when the API returns an empty client list', async () => {
    mockDashboardApi({
      clients: [],
      homes: [],
    });

    render(<Dashboard />);

    expect(await screen.findByText('No Homes Found')).toBeInTheDocument();
  });

  it('closes the no-clients prompt when dismissed', async () => {
    mockDashboardApi({
      clients: [],
      homes: [],
    });

    render(<Dashboard />);

    const closeButton = await screen.findByRole('button', { name: 'Close' });
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByText('No Homes Found')).not.toBeInTheDocument();
    });
  });

  it('updates the dashboard when a different client is selected', async () => {
    mockDashboardApi({
      clients: mockClients,
      behaviorListResponse: {
        statusCode: 200,
        behaviorSkillData: [{ bsID: 10, name: 'Aggression', measurement: 'Frequency' }],
      },
      behaviorDataById: {
        '10': {
          statusCode: 200,
          behaviorSkillData: [],
        },
        '20': {
          statusCode: 200,
          behaviorSkillData: [],
        },
      },
    });

    render(<Dashboard />);

    const clientSelect = await screen.findByLabelText('Client');
    fireEvent.change(clientSelect, { target: { value: '2' } });

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('post', '/aba/getClientTargetBehavior', {
        clientID: '2',
        employeeUsername: 'testuser',
      });
    });
  });

  it('shows the API failure message when client loading fails', async () => {
    mockDashboardApi({
      getAllClientsError: new Error('Failed to load clients'),
    });

    render(<Dashboard />);

    expect(await screen.findByText('Failed to load clients')).toBeInTheDocument();
  });

  it('redirects to login when auth reports the user is logged out', async () => {
    mockUseAuth.mockReturnValue({
      isReady: true,
      isLoggedIn: false,
      username: null,
      isAdmin: false,
    });

    render(<Dashboard />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/Login?previousUrl=%2F');
    });
  });

  it('redirects to login when the client info response is unauthorized', async () => {
    mockDashboardApi({
      getAllClientsResponse: {
        statusCode: 401,
      },
    });

    render(<Dashboard />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/Login?previousUrl=%2F');
    });
  });

  it('redirects to login when the client info request throws an unauthorized error', async () => {
    mockDashboardApi({
      getAllClientsError: {
        response: {
          status: 401,
        },
      },
    });

    render(<Dashboard />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/Login?previousUrl=%2F');
    });
  });

  it('shows recent activity data when behavior entries are returned', async () => {
    mockDashboardApi({
      clients: [{ clientID: 1, fName: 'John', lName: 'Doe' }],
      behaviorList: [
        { bsID: 10, name: 'Aggression', measurement: 'Frequency' },
      ],
      behaviorDataById: {
        '10': {
          statusCode: 200,
          behaviorSkillData: [
            { behaviorDataID: 'a', bsID: 10, clientID: 1, clientName: 'John Doe', sessionDate: '2026-03-20', count: 2, duration: 0 },
            { behaviorDataID: 'b', bsID: 10, clientID: 1, clientName: 'John Doe', sessionDate: '2026-03-21', count: 4, duration: 0 },
          ],
        },
      },
    });

    render(<Dashboard />);

    expect(await screen.findByText('Recent Activity')).toBeInTheDocument();
    expect(await screen.findByText('2026-03-21 • Frequency')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('surfaces behavior loading failures from the target behavior list', async () => {
    mockDashboardApi({
      clients: [{ clientID: 1, fName: 'John', lName: 'Doe' }],
      behaviorListResponse: {
        statusCode: 500,
        serverMessage: 'Failed to load behaviors',
      },
    });

    render(<Dashboard />);

    expect(await screen.findByText('Failed to load behaviors')).toBeInTheDocument();
  });

  it('ignores individual behavior detail failures and still renders successful entries', async () => {
    mockDashboardApi({
      clients: [{ clientID: 1, fName: 'John', lName: 'Doe' }],
      behaviorList: [
        { bsID: 10, name: 'Aggression', measurement: 'Frequency' },
        { bsID: 11, name: 'Elopement', measurement: 'Duration' },
      ],
      behaviorDataById: {
        '10': {
          statusCode: 200,
          behaviorSkillData: [
            { behaviorDataID: 'a', bsID: 10, clientID: 1, clientName: 'John Doe', sessionDate: '2026-03-22', count: 3, duration: 0 },
          ],
        },
        '11': {
          statusCode: 500,
          behaviorSkillData: [],
        },
      },
    });

    render(<Dashboard />);

    expect(await screen.findByText('3')).toBeInTheDocument();
    expect(screen.queryByText('No recent entries.')).not.toBeInTheDocument();
  });

  it('updates the displayed date range when the filter changes', async () => {
    mockDashboardApi({
      clients: [{ clientID: 1, fName: 'John', lName: 'Doe' }],
      behaviorList: [],
    });

    render(<Dashboard />);

    const rangeSelect = await screen.findByLabelText('Range');
    fireEvent.change(rangeSelect, { target: { value: '7d' } });

    await waitFor(() => {
      expect((rangeSelect as HTMLSelectElement).value).toBe('7d');
    });
  });

  it('shows the loading state while auth is still initializing', () => {
    mockUseAuth.mockReturnValue({
      isReady: false,
      isLoggedIn: false,
      username: null,
      isAdmin: false,
    });

    render(<Dashboard />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

});
