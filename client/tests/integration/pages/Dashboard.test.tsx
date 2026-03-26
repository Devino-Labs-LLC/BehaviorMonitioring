import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import Dashboard from '../../../src/app/Dashboard/page';
import { api } from '../../../src/lib/Api';

jest.mock('../../../src/lib/Api');
jest.mock('../../../src/hooks/useAuth', () => ({
  useAuth: () => ({
    isReady: true,
    isLoggedIn: true,
    username: 'testuser',
    isAdmin: false,
  }),
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

describe('Dashboard Page Integration', () => {
  const mockClients = [
    { clientID: 1, fName: 'John', lName: 'Doe' },
    { clientID: 2, fName: 'Jane', lName: 'Smith' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

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
    mockApi
      .mockResolvedValueOnce({
        statusCode: 200,
        clientData: [{ clientID: 1, fName: 'John', lName: 'Doe' }],
      } as any)
      .mockResolvedValueOnce({
        statusCode: 200,
        behaviorSkillData: [
          { bsID: 10, name: 'Aggression', measurement: 'Frequency' },
          { bsID: 11, name: 'Elopement', measurement: 'Duration' },
        ],
      } as any)
      .mockResolvedValueOnce({
        statusCode: 200,
        behaviorSkillData: [
          { behaviorDataID: 'a', bsID: 10, clientID: 1, clientName: 'John Doe', sessionDate: '2026-03-20', count: 2, duration: 0 },
        ],
      } as any)
      .mockResolvedValueOnce({
        statusCode: 200,
        behaviorSkillData: [
          { behaviorDataID: 'b', bsID: 11, clientID: 1, clientName: 'John Doe', sessionDate: '2026-03-21', count: 0, duration: 5 },
        ],
      } as any);

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

  it('redirects to login when not authenticated', () => {
    jest
      .spyOn(require('../../../src/hooks/useAuth'), 'useAuth')
      .mockReturnValue({
        isReady: true,
        isLoggedIn: false,
        username: null,
        isAdmin: false,
      });

    const mockPush = jest.fn();
    jest.spyOn(require('next/navigation'), 'useRouter').mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
    });

    render(<Dashboard />);

    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/Login'));
  });
});
