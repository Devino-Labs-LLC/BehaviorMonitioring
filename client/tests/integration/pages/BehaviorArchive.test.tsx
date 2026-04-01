import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BehaviorArchive from '../../../src/app/Behavior/Archive/page';
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
jest.mock('../../../src/components/Selectdropdown', () => (props: any) => (
  <select
    aria-label={props.name}
    name={props.name}
    value={props.value}
    onChange={props.onChange}
  >
    {props.options.map((option: any) => (
      <option key={String(option.value)} value={option.value}>
        {option.label}
      </option>
    ))}
  </select>
));
jest.mock('../../../src/components/Button', () => (props: any) => {
  const { btnType, onClick, placeholder } = props;
  return (
    <button type={btnType || 'button'} onClick={onClick}>
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
jest.mock('../../../src/components/NoClientsPrompt', () => (props: any) =>
  props.isVisible ? <div>No clients prompt</div> : null,
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

describe('Behavior Archive Page Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetLoggedInUserStatus.mockReturnValue(true);
    mockGetLoggedInUser.mockReturnValue('testuser');
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('loads clients and archived behaviors on mount', async () => {
    mockApi
      .mockResolvedValueOnce({
        statusCode: 200,
        clientData: [{ clientID: 1, fName: 'John', lName: 'Doe' }],
      } as any)
      .mockResolvedValueOnce({
        statusCode: 200,
        behaviorSkillData: [
          {
            bsID: 7,
            name: 'Aggression',
            definition: 'Aggressive behavior',
            date_entered: '2026-03-01',
            measurement: 'Frequency',
            category: 'Problem Behavior',
          },
        ],
      } as any);

    render(<BehaviorArchive />);

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('post', '/aba/getAllClientInfo', {
        employeeUsername: 'testuser',
      });
    });

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('post', '/aba/getClientArchivedBehavior', {
        clientID: 1,
        employeeUsername: 'testuser',
      });
    });

    expect(screen.getByText('Aggression')).toBeInTheDocument();
  });

  it('stores the selected archived behavior and navigates to detail view', async () => {
    mockApi
      .mockResolvedValueOnce({
        statusCode: 200,
        clientData: [{ clientID: 1, fName: 'John', lName: 'Doe' }],
      } as any)
      .mockResolvedValueOnce({
        statusCode: 200,
        behaviorSkillData: [
          {
            bsID: 7,
            name: 'Aggression',
            definition: 'Aggressive behavior',
            date_entered: '2026-03-01',
            measurement: 'Frequency',
            category: 'Problem Behavior',
          },
        ],
      } as any);

    render(<BehaviorArchive />);

    await waitFor(() => {
      expect(screen.getByText('Aggression')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Aggression'));

    expect(Storage.prototype.setItem).toHaveBeenCalledWith('clientID', '1');
    expect(Storage.prototype.setItem).toHaveBeenCalledWith('archivedBehaviorID', '7');
    expect(mockPush).toHaveBeenCalledWith('/Behavior/Archive_Detail');
  });

  it('shows the no-clients prompt when no clients are available', async () => {
    mockApi.mockResolvedValueOnce({
      statusCode: 200,
      clientData: [],
    } as any);

    render(<BehaviorArchive />);

    await waitFor(() => {
      expect(screen.getByText('No clients prompt')).toBeInTheDocument();
    });
  });

  it('redirects unauthenticated users to login', async () => {
    mockGetLoggedInUserStatus.mockReturnValue(false);
    mockApi.mockResolvedValueOnce({
      statusCode: 401,
      serverMessage: 'Unauthorized user',
    } as any);

    render(<BehaviorArchive />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/Login?previousUrl='));
    });
  });

  it('reactivates an archived behavior after confirmation', async () => {
    const user = userEvent.setup();

    mockApi
      .mockResolvedValueOnce({
        statusCode: 200,
        clientData: [{ clientID: 1, fName: 'John', lName: 'Doe' }],
      } as any)
      .mockResolvedValueOnce({
        statusCode: 200,
        behaviorSkillData: [
          {
            bsID: 7,
            name: 'Aggression',
            definition: 'Aggressive behavior',
            date_entered: '2026-03-01',
            measurement: 'Frequency',
            category: 'Problem Behavior',
          },
        ],
      } as any)
      .mockResolvedValueOnce({
        statusCode: 200,
        serverMessage: 'Behavior restored',
      } as any)
      .mockResolvedValueOnce({
        statusCode: 200,
        behaviorSkillData: [],
      } as any);

    render(<BehaviorArchive />);

    await user.click(await screen.findByRole('button', { name: 'Reactivate' }));
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('post', 'aba/activateBehavior', {
        clientID: 1,
        behaviorId: '7',
        employeeUsername: 'testuser',
      });
    });
  });

  it('deletes an archived behavior after confirmation', async () => {
    const user = userEvent.setup();

    mockApi
      .mockResolvedValueOnce({
        statusCode: 200,
        clientData: [{ clientID: 1, fName: 'John', lName: 'Doe' }],
      } as any)
      .mockResolvedValueOnce({
        statusCode: 200,
        behaviorSkillData: [
          {
            bsID: 7,
            name: 'Aggression',
            definition: 'Aggressive behavior',
            date_entered: '2026-03-01',
            measurement: 'Frequency',
            category: 'Problem Behavior',
          },
        ],
      } as any)
      .mockResolvedValueOnce({
        statusCode: 200,
        serverMessage: 'Behavior deleted',
      } as any)
      .mockResolvedValueOnce({
        statusCode: 200,
        behaviorSkillData: [],
      } as any);

    render(<BehaviorArchive />);

    await user.click(await screen.findByRole('button', { name: 'Delete' }));
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('post', '/aba/deleteBehavior', {
        clientID: 1,
        behaviorId: '7',
        employeeUsername: 'testuser',
      });
    });
  });

  it('navigates back when escape is pressed', async () => {
    mockApi
      .mockResolvedValueOnce({
        statusCode: 200,
        clientData: [{ clientID: 1, fName: 'John', lName: 'Doe' }],
      } as any)
      .mockResolvedValueOnce({
        statusCode: 200,
        behaviorSkillData: [],
      } as any);

    render(<BehaviorArchive />);

    await screen.findByText('Archived Behavior');
    fireEvent.keyDown(globalThis, { key: 'Escape' });

    expect(mockBack).toHaveBeenCalled();
  });

  it('loads a different client archive when the selection changes', async () => {
    mockApi
      .mockResolvedValueOnce({
        statusCode: 200,
        clientData: [
          { clientID: 1, fName: 'John', lName: 'Doe' },
          { clientID: 2, fName: 'Jane', lName: 'Smith' },
        ],
      } as any)
      .mockResolvedValueOnce({
        statusCode: 200,
        behaviorSkillData: [],
      } as any)
      .mockResolvedValueOnce({
        statusCode: 200,
        behaviorSkillData: [
          {
            bsID: 8,
            name: 'Elopement',
            definition: 'Leaves area',
            date_entered: '2026-03-02',
            measurement: 'Frequency',
            category: 'Problem Behavior',
          },
        ],
      } as any);

    render(<BehaviorArchive />);

    await screen.findByText('Archived Behavior');
    fireEvent.change(screen.getByLabelText('ClientName'), {
      target: { value: '2' },
    });

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('post', '/aba/getClientArchivedBehavior', {
        clientID: 2,
        employeeUsername: 'testuser',
      });
    });
  });

  it('shows API errors when archived behavior fetch fails', async () => {
    mockApi
      .mockResolvedValueOnce({
        statusCode: 200,
        clientData: [{ clientID: 1, fName: 'John', lName: 'Doe' }],
      } as any)
      .mockRejectedValueOnce(new Error('Failed to load archived behaviors'));

    render(<BehaviorArchive />);

    expect(await screen.findByText('Error: Failed to load archived behaviors')).toBeInTheDocument();
  });

  it('closes the popout when the user cancels the action', async () => {
    const user = userEvent.setup();

    mockApi
      .mockResolvedValueOnce({
        statusCode: 200,
        clientData: [{ clientID: 1, fName: 'John', lName: 'Doe' }],
      } as any)
      .mockResolvedValueOnce({
        statusCode: 200,
        behaviorSkillData: [
          {
            bsID: 7,
            name: 'Aggression',
            definition: 'Aggressive behavior',
            date_entered: '2026-03-01',
            measurement: 'Frequency',
            category: 'Problem Behavior',
          },
        ],
      } as any);

    render(<BehaviorArchive />);

    await user.click(await screen.findByRole('button', { name: 'Delete' }));
    expect(screen.getByText('Delete Behavior')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(screen.queryByText('Delete Behavior')).not.toBeInTheDocument();
    });
    expect(mockApi).toHaveBeenCalledTimes(2);
  });

  it('navigates back when the back button is clicked', async () => {
    mockApi
      .mockResolvedValueOnce({
        statusCode: 200,
        clientData: [{ clientID: 1, fName: 'John', lName: 'Doe' }],
      } as any)
      .mockResolvedValueOnce({
        statusCode: 200,
        behaviorSkillData: [],
      } as any);

    render(<BehaviorArchive />);

    fireEvent.click(await screen.findByRole('button', { name: 'Back' }));

    expect(mockBack).toHaveBeenCalled();
  });

  it('shows an error message when reactivation fails', async () => {
    const user = userEvent.setup();

    mockApi
      .mockResolvedValueOnce({
        statusCode: 200,
        clientData: [{ clientID: 1, fName: 'John', lName: 'Doe' }],
      } as any)
      .mockResolvedValueOnce({
        statusCode: 200,
        behaviorSkillData: [
          {
            bsID: 7,
            name: 'Aggression',
            definition: 'Aggressive behavior',
            date_entered: '2026-03-01',
            measurement: 'Frequency',
            category: 'Problem Behavior',
          },
        ],
      } as any)
      .mockResolvedValueOnce({
        statusCode: 500,
        serverMessage: 'Reactivate failed',
      } as any);

    render(<BehaviorArchive />);

    await user.click(await screen.findByRole('button', { name: 'Reactivate' }));
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(await screen.findByText('Error: Failed to archive "Aggression".')).toBeInTheDocument();
  });

  it('shows an error message when delete fails', async () => {
    const user = userEvent.setup();

    mockApi
      .mockResolvedValueOnce({
        statusCode: 200,
        clientData: [{ clientID: 1, fName: 'John', lName: 'Doe' }],
      } as any)
      .mockResolvedValueOnce({
        statusCode: 200,
        behaviorSkillData: [
          {
            bsID: 7,
            name: 'Aggression',
            definition: 'Aggressive behavior',
            date_entered: '2026-03-01',
            measurement: 'Frequency',
            category: 'Problem Behavior',
          },
        ],
      } as any)
      .mockResolvedValueOnce({
        statusCode: 500,
        serverMessage: 'Delete failed',
      } as any);

    render(<BehaviorArchive />);

    await user.click(await screen.findByRole('button', { name: 'Delete' }));
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(await screen.findByText('Error: Failed to delete "Aggression".')).toBeInTheDocument();
  });
});
