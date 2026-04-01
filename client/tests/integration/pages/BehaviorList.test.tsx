import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BehaviorPage from '../../../src/app/Behavior/page';
import { api } from '../../../src/lib/Api';

jest.mock('../../../src/lib/Api');
jest.mock('../../../src/function/debounce', () => ({
  debounceAsync: (fn: (...args: any[]) => unknown) => (...args: any[]) => fn(...args),
}));

const mockGetLoggedInUserStatus = jest.fn(() => true);
const mockGetLoggedInUser = jest.fn(() => 'testuser');
const mockUseAuth = jest.fn(() => ({
  isReady: true,
  isLoggedIn: true,
  username: 'testuser',
}));

jest.mock('../../../src/function/VerificationCheck', () => ({
  GetLoggedInUserStatus: () => mockGetLoggedInUserStatus(),
  GetLoggedInUser: () => mockGetLoggedInUser(),
  GetAdminStatus: () => false,
}));

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => '/Behavior',
  useSearchParams: () => ({
    get: jest.fn(),
  }),
}));
jest.mock('../../../src/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
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
    mockGetLoggedInUserStatus.mockReturnValue(true);
    mockGetLoggedInUser.mockReturnValue('testuser');
    mockUseAuth.mockReturnValue({
      isReady: true,
      isLoggedIn: true,
      username: 'testuser',
    });
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
    mockGetLoggedInUserStatus.mockReturnValue(false);

    render(<BehaviorPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/Login'));
    });
  });

  it('shows the no-clients prompt when no clients are returned', async () => {
    const user = userEvent.setup();

    mockApi
      .mockResolvedValueOnce({
        statusCode: 200,
        clientData: [],
      } as any)
      .mockResolvedValueOnce({
        statusCode: 200,
        homes: [{ homeID: 1, homeName: 'Maple House' }],
      } as any);

    render(<BehaviorPage />);

    expect(await screen.findByText(/No Clients Found/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Close' }));

    await waitFor(() => {
      expect(screen.queryByText(/No Clients Found/i)).not.toBeInTheDocument();
    });
  });

  it('stores graph selection and navigates to the graph page', async () => {
    const user = userEvent.setup();

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

    const graphButtons = await screen.findAllByRole('button', { name: 'Graph button' });
    await user.click(graphButtons[0]);

    expect(Storage.prototype.setItem).toHaveBeenCalledWith('clientID', '1');
    expect(Storage.prototype.setItem).toHaveBeenCalledWith(
      'checkedBehaviors',
      JSON.stringify([
        {
          id: 1,
          name: 'Aggression',
          clientName: 'John Doe',
          measurementType: 'Frequency',
        },
      ]),
    );
    expect(mockPush).toHaveBeenCalledWith('/Behavior/Graph');
  });

  it('stores the selected behavior id and navigates to detail view', async () => {
    const user = userEvent.setup();

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

    await user.click(await screen.findByRole('button', { name: 'Aggression' }));

    expect(Storage.prototype.setItem).toHaveBeenCalledWith('clientID', '1');
    expect(Storage.prototype.setItem).toHaveBeenCalledWith('behaviorID', '1');
    expect(mockPush).toHaveBeenCalledWith('/Behavior/Detail');
  });

  it('shows an error when merge is attempted with fewer than two selected behaviors', async () => {
    const user = userEvent.setup();

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

    const ellipsisButtons = await screen.findAllByRole('button', { name: 'More options button' });
    await user.click(ellipsisButtons[0]);
    await user.click(screen.getByRole('button', { name: 'Merge' }));

    expect(await screen.findByText(/select two or more behaviors to merge/i)).toBeInTheDocument();
    expect(mockApi).toHaveBeenCalledTimes(2);
  });

  it('disables mixed-measurement behaviors once a selection is made', async () => {
    const user = userEvent.setup();

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

    const checkboxes = await screen.findAllByRole('checkbox');
    await user.click(checkboxes[0]);
    expect(checkboxes[1]).toBeDisabled();
  });

  it('merges selected behaviors when they share the same measurement type', async () => {
    const user = userEvent.setup();
    const sameTypeBehaviors = [
      mockBehaviors[0],
      {
        ...mockBehaviors[1],
        measurement: 'Frequency',
      },
    ];

    mockApi
      .mockResolvedValueOnce({
        statusCode: 200,
        clientData: mockClients,
      } as any)
      .mockResolvedValueOnce({
        statusCode: 200,
        behaviorSkillData: sameTypeBehaviors,
      } as any)
      .mockResolvedValueOnce({
        statusCode: 200,
        serverMessage: 'Behaviors merged successfully.',
      } as any)
      .mockResolvedValueOnce({
        statusCode: 200,
        behaviorSkillData: sameTypeBehaviors,
      } as any);

    render(<BehaviorPage />);

    const checkboxes = await screen.findAllByRole('checkbox');
    await user.click(checkboxes[0]);
    await user.click(checkboxes[1]);

    const ellipsisButtons = screen.getAllByRole('button', { name: 'More options button' });
    await user.click(ellipsisButtons[0]);
    await user.click(screen.getByRole('button', { name: 'Merge' }));

    const mergeSelect = screen.getAllByRole('combobox')[1];
    await user.selectOptions(mergeSelect, '1');
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('post', '/aba/mergeBehaviors', {
        clientID: 1,
        targetBehaviorId: '1',
        mergeBehaviorIds: ['2'],
        employeeUsername: 'testuser',
      });
    });
  });

  it('archives a selected behavior through the action menu', async () => {
    const user = userEvent.setup();

    mockApi
      .mockResolvedValueOnce({
        statusCode: 200,
        clientData: mockClients,
      } as any)
      .mockResolvedValueOnce({
        statusCode: 200,
        behaviorSkillData: mockBehaviors,
      } as any)
      .mockResolvedValueOnce({
        statusCode: 200,
        serverMessage: 'Archived',
      } as any)
      .mockResolvedValueOnce({
        statusCode: 200,
        behaviorSkillData: mockBehaviors.slice(1),
      } as any);

    render(<BehaviorPage />);

    const ellipsisButtons = await screen.findAllByRole('button', { name: 'More options button' });
    await user.click(ellipsisButtons[0]);
    await user.click(screen.getByRole('button', { name: 'Archive' }));
    await user.click(screen.getByRole('button', { name: /confirm selection/i }));

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('post', '/aba/archiveBehavior', {
        clientID: 1,
        behaviorId: '1',
        employeeUsername: 'testuser',
      });
    });
  });

  it('deletes a selected behavior through the action menu', async () => {
    const user = userEvent.setup();

    mockApi
      .mockResolvedValueOnce({
        statusCode: 200,
        clientData: mockClients,
      } as any)
      .mockResolvedValueOnce({
        statusCode: 200,
        behaviorSkillData: mockBehaviors,
      } as any)
      .mockResolvedValueOnce({
        statusCode: 200,
        serverMessage: 'Deleted',
      } as any)
      .mockResolvedValueOnce({
        statusCode: 200,
        behaviorSkillData: mockBehaviors.slice(1),
      } as any);

    render(<BehaviorPage />);

    const ellipsisButtons = await screen.findAllByRole('button', { name: 'More options button' });
    await user.click(ellipsisButtons[0]);
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(screen.getByRole('button', { name: /confirm selection/i }));

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('post', '/aba/deleteBehavior', {
        clientID: 1,
        behaviorId: '1',
        employeeUsername: 'testuser',
      });
    });
  });
});
