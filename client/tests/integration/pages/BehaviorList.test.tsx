import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BehaviorPage from '../../../src/app/Behavior/page';
import { api } from '../../../src/lib/Api';

jest.mock('../../../src/lib/Api');
jest.mock('../../../src/function/VerificationCheck', () => ({
  GetLoggedInUserStatus: () => true,
  GetLoggedInUser: () => 'testuser',
  GetAdminStatus: () => false,
}));
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => '/Behavior',
  useSearchParams: () => ({
    get: jest.fn(),
  }),
}));

const mockApi = api as jest.MockedFunction<typeof api>;

describe('Behavior List Page Integration', () => {
  const mockClients = [
    { clientID: 1, fName: 'John', lName: 'Doe' },
    { clientID: 2, fName: 'Jane', lName: 'Smith' },
  ];

  const mockBehaviors = [
    {
      bsID: 1,
      name: 'Aggression',
      definition: 'Physical or verbal aggressive behavior',
      measurement: 'Frequency',
      category: 'Problem Behavior',
      type: 'Behavior',
      clientID: 1,
      date_entered: '2026-01-01',
    },
    {
      bsID: 2,
      name: 'Self-Injury',
      definition: 'Self-injurious behavior',
      measurement: 'Duration',
      category: 'Problem Behavior',
      type: 'Behavior',
      clientID: 1,
      date_entered: '2026-01-01',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    Storage.prototype.getItem = jest.fn();
    Storage.prototype.setItem = jest.fn();
    Storage.prototype.removeItem = jest.fn();
  });

  it('fetches clients on mount', async () => {
    mockApi
      .mockResolvedValueOnce({
        statusCode: 200,
        clientData: mockClients,
      } as any)
      .mockResolvedValueOnce({
        statusCode: 200,
        behaviorSkillData: mockBehaviors,
      } as any);

    render(<BehaviorPage />);

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('post', '/aba/getAllClientInfo', {
        employeeUsername: 'testuser',
      });
    });
  });

  it('fetches behaviors after client is selected', async () => {
    mockApi
      .mockResolvedValueOnce({
        statusCode: 200,
        clientData: mockClients,
      } as any)
      .mockResolvedValueOnce({
        statusCode: 200,
        behaviorSkillData: mockBehaviors,
      } as any);

    render(<BehaviorPage />);

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('post', '/aba/getClientTargetBehavior', {
        clientID: 1,
        employeeUsername: 'testuser',
      });
    });
  });

  it('redirects to login when not authenticated', async () => {
    const mockPush = jest.fn();
    
    const VerificationCheck = require('../../../src/function/VerificationCheck');
    jest.spyOn(VerificationCheck, 'GetLoggedInUserStatus').mockReturnValue(false);
    
    const navigation = require('next/navigation');
    jest.spyOn(navigation, 'useRouter').mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
    });

    render(<BehaviorPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/Login'));
    });
  });
});
