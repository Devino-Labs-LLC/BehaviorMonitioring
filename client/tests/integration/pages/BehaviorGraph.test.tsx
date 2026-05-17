import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import BehaviorGraph from '../../../src/app/Behavior/Graph/page';
import type { GetBehaviorDataResponse } from '../../../src/dto';
import { api } from '../../../src/lib/Api';

type MockGraphDataProcessorProps = {
  title: string;
  measurementType: string;
  dateRange: number;
  fetchedData: unknown[];
};

const graphDataResponse = (
  behaviorSkillData: GetBehaviorDataResponse['behaviorSkillData'],
): GetBehaviorDataResponse => ({
  statusCode: 200,
  behaviorSkillData,
});

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockGetLoggedInUserStatus = jest.fn();
const mockGetLoggedInUser = jest.fn();

jest.mock('../../../src/lib/Api');
jest.mock('../../../src/function/VerificationCheck', () => ({
  GetLoggedInUserStatus: () => mockGetLoggedInUserStatus(),
  GetLoggedInUser: () => mockGetLoggedInUser(),
  GetAdminStatus: () => false,
}));
jest.mock('../../../src/function/debounce', () => ({
  debounceAsync: (fn: () => Promise<unknown>) => () => fn(),
}));
jest.mock('../../../src/function/GraphDataProcessor', () => ({
  __esModule: true,
  default: ({ title, measurementType, dateRange, fetchedData }: MockGraphDataProcessorProps) => (
    <div
      data-testid="graph-data-processor"
      data-title={title}
      data-measurement-type={measurementType}
      data-date-range={String(dateRange)}
      data-points={String(fetchedData.length)}
    />
  ),
}));
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: mockBack,
  }),
}));

const mockApi = api as jest.MockedFunction<typeof api>;

describe('Behavior Graph Page Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-04-01T12:00:00Z'));
    mockGetLoggedInUserStatus.mockReturnValue(true);
    mockGetLoggedInUser.mockReturnValue('testuser');

    jest.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => {
      if (key === 'clientID') return '10';
      if (key === 'checkedBehaviors') {
        return JSON.stringify([
          { id: 1, name: 'Aggression', clientName: 'John Doe', measurementType: 'Frequency' },
          { id: 2, name: 'Elopement', clientName: 'John Doe', measurementType: 'Frequency' },
          { id: 1, name: 'Aggression', clientName: 'John Doe', measurementType: 'Frequency' },
        ]);
      }
      return null;
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('hydrates selected behaviors and fetches unique graph data', async () => {
    mockApi
      .mockResolvedValueOnce(
        graphDataResponse([
          { behaviorDataID: 'a', bsID: 1, sessionDate: '2026-03-30', count: 2 } as GetBehaviorDataResponse['behaviorSkillData'][number],
        ]),
      )
      .mockResolvedValueOnce(
        graphDataResponse([
          { behaviorDataID: 'b', bsID: 2, sessionDate: '2026-03-29', count: 1 } as GetBehaviorDataResponse['behaviorSkillData'][number],
        ]),
      );

    render(<BehaviorGraph />);

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledTimes(2);
    });

    expect(mockApi).toHaveBeenNthCalledWith(1, 'post', '/aba/getTargetBehavior', {
      clientID: '10',
      behaviorID: 1,
      employeeUsername: 'testuser',
    });
    expect(mockApi).toHaveBeenNthCalledWith(2, 'post', '/aba/getTargetBehavior', {
      clientID: '10',
      behaviorID: 2,
      employeeUsername: 'testuser',
    });

    await waitFor(() => {
      expect(screen.getByTestId('graph-data-processor')).toHaveAttribute(
        'data-title',
        "John Doe's Behavior(s) Over the Last 7 Days",
      );
      expect(screen.getByTestId('graph-data-processor')).toHaveAttribute('data-points', '2');
    });
  });

  it('updates the selected date range label when the dropdown changes', async () => {
    mockApi.mockResolvedValue(
      graphDataResponse([
        { behaviorDataID: 'a', bsID: 1, sessionDate: '2026-03-30', count: 2 } as GetBehaviorDataResponse['behaviorSkillData'][number],
      ]),
    );

    render(<BehaviorGraph />);

    await waitFor(() => {
      expect(screen.getByTestId('graph-data-processor')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '30' } });

    await waitFor(() => {
      expect(screen.getByTestId('graph-data-processor')).toHaveAttribute(
        'data-title',
        "John Doe's Behavior(s) Over the Last Month",
      );
    });
  });

  it('shows an empty-range message when no graphable data is returned', async () => {
    mockApi.mockResolvedValue(graphDataResponse([]));

    render(<BehaviorGraph />);

    await waitFor(() => {
      expect(screen.getByText('No data available within range')).toBeInTheDocument();
    });
  });

  it('redirects unauthenticated users to login', async () => {
    mockGetLoggedInUserStatus.mockReturnValue(false);

    render(<BehaviorGraph />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/Login?previousUrl='));
    });
  });
});
