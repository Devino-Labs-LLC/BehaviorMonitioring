import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import BehaviorArchiveDetail from '../../../src/app/Behavior/Archive_Detail/page';
import { api } from '../../../src/lib/Api';

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
  debounceAsync: (fn: (...args: any[]) => unknown) => (...args: any[]) => fn(...args),
}));
jest.mock('../../../src/components/header', () => () => <div data-testid="header" />);
jest.mock('../../../src/components/loading', () => () => <div data-testid="loading" />);
jest.mock('../../../src/components/Button', () => (props: any) => {
  const { btnType, onClick, placeholder, disabled } = props;
  return (
    <button type={btnType || 'button'} onClick={onClick} disabled={disabled}>
      {placeholder}
    </button>
  );
});
jest.mock('../../../src/components/PopoutPrompt', () => (props: any) =>
  props.isVisible ? (
    <div>
      <p>{props.title}</p>
      <button type="button" onClick={props.onConfirm}>Confirm</button>
      <button type="button" onClick={props.onCancel}>Cancel</button>
    </div>
  ) : null,
);
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: mockBack,
  }),
}));

const mockApi = api as jest.MockedFunction<typeof api>;

describe('Behavior Archive Detail Page Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetLoggedInUserStatus.mockReturnValue(true);
    mockGetLoggedInUser.mockReturnValue('testuser');

    jest.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => {
      if (key === 'clientID') return '10';
      if (key === 'archivedBehaviorID') return '7';
      return null;
    });
    jest.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('loads archived behavior base data and data rows on mount', async () => {
    mockApi
      .mockResolvedValueOnce({
        statusCode: 200,
        behaviorSkillData: {
          bsID: 7,
          clientID: 10,
          clientName: 'John Doe',
          name: 'Aggression',
          measurement: 'Frequency',
          definition: 'Aggressive behavior',
        },
      } as any)
      .mockResolvedValueOnce({
        statusCode: 200,
        behaviorSkillData: [
          {
            behaviorDataID: 'b-1',
            sessionDate: '2026-03-30',
            sessionTime: '09:00',
            entered_by: 'testuser',
            count: 2,
          },
        ],
      } as any);

    render(<BehaviorArchiveDetail />);

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('POST', '/aba/getAClientArchivedBehavior', {
        clientID: '10',
        behaviorID: '7',
        employeeUsername: 'testuser',
      });
    });

    expect(mockApi).toHaveBeenCalledWith('POST', '/aba/getAArchivedBehaviorData', {
      clientID: '10',
      behaviorID: '7',
      employeeUsername: 'testuser',
    });

    await waitFor(() => {
      expect(screen.getByText('Archived Behavior Details')).toBeInTheDocument();
    });

    expect(screen.getByText((_, element) => element?.textContent === 'Client Name: John Doe')).toBeInTheDocument();
    expect(
      screen.getByText(
        (_, element) => element?.tagName === 'P' && (element.textContent?.includes('Behavior Name: Aggression') ?? false),
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('testuser')).toBeInTheDocument();
    expect(Storage.prototype.removeItem).toHaveBeenCalledWith('clientID');
    expect(Storage.prototype.removeItem).toHaveBeenCalledWith('archivedBehaviorID');
  });

  it('redirects to behavior page when session data is missing', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);

    render(<BehaviorArchiveDetail />);

    expect(mockPush).toHaveBeenCalledWith('/Behavior');
  });

  it('deletes archived behavior data after confirmation', async () => {
    mockApi
      .mockResolvedValueOnce({
        statusCode: 200,
        behaviorSkillData: {
          bsID: 7,
          clientID: 10,
          clientName: 'John Doe',
          name: 'Aggression',
          measurement: 'Frequency',
          definition: 'Aggressive behavior',
        },
      } as any)
      .mockResolvedValueOnce({
        statusCode: 200,
        behaviorSkillData: [
          {
            behaviorDataID: 'b-1',
            sessionDate: '2026-03-30',
            sessionTime: '09:00',
            entered_by: 'testuser',
            count: 2,
          },
        ],
      } as any)
      .mockResolvedValueOnce({
        statusCode: 200,
      } as any)
      .mockResolvedValueOnce({
        statusCode: 200,
        behaviorSkillData: {
          bsID: 7,
          clientID: 10,
          clientName: 'John Doe',
          name: 'Aggression',
          measurement: 'Frequency',
          definition: 'Aggressive behavior',
        },
      } as any)
      .mockResolvedValueOnce({
        statusCode: 200,
        behaviorSkillData: [],
      } as any);

    render(<BehaviorArchiveDetail />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('post', '/aba/deleteArchivedBehaviorData', {
        clientID: 10,
        behaviorId: 7,
        behaviorDataId: 'b-1',
        employeeUsername: 'testuser',
      });
    });

    expect(screen.getByText('Behavior "b-1" has been deleted successfully.')).toBeInTheDocument();
  });

  it('closes the popout when cancel is pressed', async () => {
    mockApi
      .mockResolvedValueOnce({
        statusCode: 200,
        behaviorSkillData: {
          bsID: 7,
          clientID: 10,
          clientName: 'John Doe',
          name: 'Aggression',
          measurement: 'Frequency',
          definition: 'Aggressive behavior',
        },
      } as any)
      .mockResolvedValueOnce({
        statusCode: 200,
        behaviorSkillData: [
          {
            behaviorDataID: 'b-1',
            sessionDate: '2026-03-30',
            sessionTime: '09:00',
            entered_by: 'testuser',
            count: 2,
          },
        ],
      } as any);

    render(<BehaviorArchiveDetail />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.getByText('Delete Behavior Data')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(screen.queryByText('Delete Behavior Data')).not.toBeInTheDocument();
    });
  });

  it('shows an error when deleting archived behavior data fails', async () => {
    mockApi
      .mockResolvedValueOnce({
        statusCode: 200,
        behaviorSkillData: {
          bsID: 7,
          clientID: 10,
          clientName: 'John Doe',
          name: 'Aggression',
          measurement: 'Frequency',
          definition: 'Aggressive behavior',
        },
      } as any)
      .mockResolvedValueOnce({
        statusCode: 200,
        behaviorSkillData: [
          {
            behaviorDataID: 'b-1',
            sessionDate: '2026-03-30',
            sessionTime: '09:00',
            entered_by: 'testuser',
            count: 2,
          },
        ],
      } as any)
      .mockResolvedValueOnce({
        statusCode: 500,
      } as any);

    render(<BehaviorArchiveDetail />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(await screen.findByText('Error: Failed to delete "b-1".')).toBeInTheDocument();
  });

  it('shows duration and count headers for rate measurements and paginates long lists', async () => {
    const manyEntries = Array.from({ length: 27 }, (_, index) => ({
      behaviorDataID: `b-${index + 1}`,
      sessionDate: `2026-03-${String((index % 28) + 1).padStart(2, '0')}`,
      sessionTime: '09:00',
      entered_by: 'testuser',
      count: index + 1,
      duration: `00:0${index % 6}:00`,
    }));

    mockApi
      .mockResolvedValueOnce({
        statusCode: 200,
        behaviorSkillData: {
          bsID: 7,
          clientID: 10,
          clientName: 'John Doe',
          name: 'Aggression',
          measurement: 'Rate',
          definition: 'Aggressive behavior',
        },
      } as any)
      .mockResolvedValueOnce({
        statusCode: 200,
        behaviorSkillData: manyEntries,
      } as any);

    render(<BehaviorArchiveDetail />);

    expect(await screen.findByText('Archived Behavior Details')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Count:' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Duration:' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '2' }));

    await waitFor(() => {
      expect(screen.getByText('2026-03-02')).toBeInTheDocument();
    });
  });
});
