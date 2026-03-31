import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BehaviorDetail from '../../../src/app/Behavior/Detail/page';
import { api } from '../../../src/lib/Api';

jest.mock('../../../src/lib/Api');
jest.mock('../../../src/function/debounce', () => ({
  debounceAsync: (fn: (...args: any[]) => unknown) => (...args: any[]) => fn(...args),
}));
jest.mock('../../../src/function/VerificationCheck', () => ({
  GetLoggedInUserStatus: () => true,
  GetLoggedInUser: () => 'testuser',
  GetAdminStatus: () => false,
}));
const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: mockBack,
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
        clientID: 10,
        clientName: 'John Doe',
        name: 'Aggression',
        definition: 'Physical or verbal aggressive behavior',
        measurement: 'Frequency',
        category: 'Problem Behavior',
      },
    ],
  };

  const mockBehaviorData = {
    statusCode: 200,
    behaviorSkillData: [
      {
        behaviorDataID: 1,
        bsID: 1,
        clientID: 10,
        sessionDate: '2026-01-15',
        sessionTime: '10:00',
        count: 5,
        duration: 0,
        trial: 0,
        entered_by: 'testuser',
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.mockReset();
    Storage.prototype.getItem = jest.fn((key) => {
      if (key === 'clientID') return '10';
      if (key === 'behaviorID') return '1';
      return null;
    });
    Storage.prototype.removeItem = jest.fn();
    mockPush.mockReset();
    mockBack.mockReset();
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

    render(<BehaviorDetail />);

    expect(mockPush).toHaveBeenCalledWith('/Behavior');
  });

  it('renders behavior details, pagination controls, and supports keyboard back navigation', async () => {
    const manyEntries = Array.from({ length: 27 }, (_, index) => ({
      behaviorDataID: index + 1,
      bsID: 1,
      clientID: 10,
      sessionDate: `2026-01-${String((index % 28) + 1).padStart(2, '0')}`,
      sessionTime: '10:00',
      count: index + 1,
      duration: 0,
      trial: 0,
      entered_by: 'testuser',
    }));

    mockApi
      .mockResolvedValueOnce(mockBehaviorBaseData as any)
      .mockResolvedValueOnce({
        statusCode: 200,
        behaviorSkillData: manyEntries,
      } as any);

    render(<BehaviorDetail />);

    expect(await screen.findByText('Behavior Details')).toBeInTheDocument();
    expect(screen.getByText(/client name/i)).toBeInTheDocument();
    expect(screen.getByText(/john doe/i)).toBeInTheDocument();
    expect(screen.getByText(/behavior name/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: '2' }));

    await waitFor(() => {
      expect(screen.getByText('2026-01-02')).toBeInTheDocument();
    });

    await userEvent.keyboard('{Escape}');
    expect(mockBack).toHaveBeenCalled();
  });

  it('deletes a behavior entry and reloads the detail data', async () => {
    const user = userEvent.setup();

    mockApi
      .mockResolvedValueOnce(mockBehaviorBaseData as any)
      .mockResolvedValueOnce(mockBehaviorData as any)
      .mockResolvedValueOnce({
        statusCode: 200,
        serverMessage: 'Deleted',
      } as any)
      .mockResolvedValueOnce(mockBehaviorBaseData as any)
      .mockResolvedValueOnce(mockBehaviorData as any);

    render(<BehaviorDetail />);

    const deleteButton = await screen.findByRole('button', { name: 'Delete button' });
    await user.click(deleteButton);

    expect(screen.getByRole('button', { name: /confirm selection of 1/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /confirm selection of 1/i }));

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('post', '/aba/deleteBehavior', {
        clientID: 10,
        behaviorId: 1,
        behaviorDataId: 1,
        employeeUsername: 'testuser',
      });
    });

    expect(await screen.findByText(/behavior "1" has been deleted successfully/i)).toBeInTheDocument();
  });

  it('shows duration headers when the behavior uses duration measurements', async () => {
    mockApi
      .mockResolvedValueOnce({
        statusCode: 200,
        behaviorSkillData: [
          {
            ...mockBehaviorBaseData.behaviorSkillData[0],
            measurement: 'Duration',
          },
        ],
      } as any)
      .mockResolvedValueOnce({
        statusCode: 200,
        behaviorSkillData: [
          {
            ...mockBehaviorData.behaviorSkillData[0],
            duration: '00:05:30',
          },
        ],
      } as any);

    render(<BehaviorDetail />);

    const table = await screen.findByRole('table');
    const headers = within(table).getAllByRole('columnheader').map((header) => header.textContent);

    expect(headers).toContain('Duration:');
    expect(headers).not.toContain('Count:');
  });
});
