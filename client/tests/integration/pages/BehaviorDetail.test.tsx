import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import BehaviorDetail from '../../../src/app/Behavior/Detail/page';
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
  usePathname: () => '/Behavior/Detail',
  useSearchParams: () => ({
    get: jest.fn(),
  }),
}));

const mockApi = api as jest.MockedFunction<typeof api>;

describe('Behavior Detail Page Integration', () => {
  const mockBehaviorBaseData = {
    statusCode: 200,
    behaviorSkillData: [
      {
        bsID: 1,
        name: 'Aggression',
        definition: 'Physical or verbal aggressive behavior',
        measurement: 'Frequency',
        category: 'Problem Behavior',
      },
    ],
  };

  const mockBehaviorData = {
    statusCode: 200,
    behaviorData: [
      {
        behaviorDataID: 1,
        bsID: 1,
        clientID: 10,
        sessionDate: '2026-01-15',
        sessionTime: '10:00',
        count: 5,
        duration: 0,
        trial: 0,
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    Storage.prototype.getItem = jest.fn((key) => {
      if (key === 'clientID') return '10';
      if (key === 'behaviorID') return '1';
      return null;
    });
    Storage.prototype.removeItem = jest.fn();
  });

  it('fetches behavior base data and behavior data on mount', async () => {
    mockApi
      .mockResolvedValueOnce(mockBehaviorBaseData as any)
      .mockResolvedValueOnce(mockBehaviorData as any);

    render(<BehaviorDetail />);

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalled();
      expect(mockApi).toHaveBeenCalledTimes(2);
    });
  });

  it('clears sessionStorage on mount', async () => {
    mockApi
      .mockResolvedValueOnce(mockBehaviorBaseData as any)
      .mockResolvedValueOnce(mockBehaviorData as any);

    render(<BehaviorDetail />);

    await waitFor(() => {
      expect(Storage.prototype.removeItem).toHaveBeenCalledWith('clientID');
      expect(Storage.prototype.removeItem).toHaveBeenCalledWith('behaviorID');
    });
  });

  it('redirects to Behavior page when no session data exists', () => {
    Storage.prototype.getItem = jest.fn(() => null);

    const mockPush = jest.fn();
    jest.spyOn(require('next/navigation'), 'useRouter').mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
    });

    render(<BehaviorDetail />);

    expect(mockPush).toHaveBeenCalledWith('/Behavior');
  });
});
