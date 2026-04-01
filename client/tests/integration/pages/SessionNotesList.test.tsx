import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SessionNotesPage from '../../../src/app/SessionNotes/page';
import { api } from '../../../src/lib/Api';

jest.mock('../../../src/lib/Api');
jest.mock('../../../src/function/debounce', () => ({
  debounceAsync: (fn: (...args: any[]) => unknown) => (...args: any[]) => fn(...args),
}));
jest.mock('../../../src/hooks/useAuth', () => ({
  useAuth: () => ({
    isReady: true,
    isLoggedIn: true,
    username: 'testuser',
  }),
}));
jest.mock('../../../src/function/VerificationCheck', () => ({
  GetLoggedInUserStatus: () => true,
  GetLoggedInUser: () => 'testuser',
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
  usePathname: () => '/SessionNotes',
  useSearchParams: () => ({
    get: jest.fn(),
  }),
}));

const mockApi = api as jest.MockedFunction<typeof api>;

describe('SessionNotes List Page Integration', () => {
  const mockClients = [
    { clientID: 1, fName: 'John', lName: 'Doe' },
    { clientID: 2, fName: 'Jane', lName: 'Smith' },
  ];

  const mockSessionNotes = [
    {
      sessionNoteDataID: 1,
      clientID: 1,
      sessionDate: '2026-01-15',
      sessionTime: '10:00',
      sessionNotes: 'Client showed improvement.',
      date_entered: '2026-01-15',
    },
  ];

  const manySessionNotes = Array.from({ length: 5 }, (_, index) => ({
    sessionNoteDataID: index + 1,
    clientID: 1,
    sessionDate: `2026-01-${String(index + 10).padStart(2, '0')}`,
    sessionTime: '10:00',
    sessionNotes: `Session note ${index + 1}`,
    date_entered: `2026-01-${String(index + 10).padStart(2, '0')}`,
    entered_by: 'testuser',
  }));

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    Storage.prototype.getItem = jest.fn(() => null);
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
        sessionNotesData: mockSessionNotes,
      } as any);

    render(<SessionNotesPage />);

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('post', '/aba/getAllClientInfo', {
        employeeUsername: 'testuser',
      });
    });
  });

  it('fetches session notes after client is selected', async () => {
    mockApi
      .mockResolvedValueOnce({
        statusCode: 200,
        clientData: mockClients,
      } as any)
      .mockResolvedValueOnce({
        statusCode: 200,
        sessionNotesData: mockSessionNotes,
      } as any);

    render(<SessionNotesPage />);

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('post', '/aba/getSessionNotes', {
        clientID: 1,
        employeeUsername: 'testuser',
      });
    });
  });

  it('redirects to login when not authenticated', async () => {
    const VerificationCheck = require('../../../src/function/VerificationCheck');
    jest.spyOn(VerificationCheck, 'GetLoggedInUserStatus').mockReturnValue(false);
    
    const navigation = require('next/navigation');
    jest.spyOn(navigation, 'useRouter').mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
    });

    render(<SessionNotesPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/Login'));
    });
  });

  it('opens the selected session note detail page', async () => {
    const user = userEvent.setup();

    mockApi
      .mockResolvedValueOnce({
        statusCode: 200,
        clientData: mockClients,
      } as any)
      .mockResolvedValueOnce({
        statusCode: 200,
        sessionNotesData: mockSessionNotes,
      } as any);

    render(<SessionNotesPage />);

    await user.click(await screen.findByRole('button', { name: '2026-01-15' }));

    expect(Storage.prototype.setItem).toHaveBeenCalledWith('clientID', '1');
    expect(Storage.prototype.setItem).toHaveBeenCalledWith('sessionNoteId', '1');
    expect(mockPush).toHaveBeenCalledWith('/SessionNotes/Detail');
  });

  it('deletes a selected session note through the action menu', async () => {
    const user = userEvent.setup();

    mockApi
      .mockResolvedValueOnce({
        statusCode: 200,
        clientData: mockClients,
      } as any)
      .mockResolvedValueOnce({
        statusCode: 200,
        sessionNotesData: mockSessionNotes,
      } as any)
      .mockResolvedValueOnce({
        statusCode: 200,
        serverMessage: 'Deleted',
      } as any);

    render(<SessionNotesPage />);

    const ellipsisButtons = await screen.findAllByRole('button', { name: 'More options button' });
    await user.click(ellipsisButtons[0]);
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(screen.getByRole('button', { name: /confirm selection/i }));

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('post', '/aba/deleteSessionNote', {
        clientID: 1,
        sessionNoteId: 'Client showed improvement.',
        employeeUsername: 'testuser',
      });
    });

    expect(screen.getByText(/session note "1" has been deleted successfully/i)).toBeInTheDocument();
  });

  it('shows the empty-state prompt when no clients exist yet', async () => {
    mockApi
      .mockResolvedValueOnce({
        statusCode: 200,
        clientData: [],
      } as any)
      .mockResolvedValueOnce({
        statusCode: 200,
        homes: [],
      } as any);

    render(<SessionNotesPage />);

    expect(await screen.findByText(/no homes found/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add new home/i })).toBeInTheDocument();
  });

  it('closes the empty-state prompt when dismissed', async () => {
    const user = userEvent.setup();

    mockApi
      .mockResolvedValueOnce({
        statusCode: 200,
        clientData: [],
      } as any)
      .mockResolvedValueOnce({
        statusCode: 200,
        homes: [],
      } as any);

    render(<SessionNotesPage />);

    await user.click(await screen.findByRole('button', { name: /close/i }));

    await waitFor(() => {
      expect(screen.queryByText(/no homes found/i)).not.toBeInTheDocument();
    });
  });

  it('loads session notes for a newly selected client', async () => {
    const user = userEvent.setup();

    mockApi
      .mockResolvedValueOnce({
        statusCode: 200,
        clientData: mockClients,
      } as any)
      .mockResolvedValueOnce({
        statusCode: 200,
        sessionNotesData: mockSessionNotes,
      } as any)
      .mockResolvedValueOnce({
        statusCode: 200,
        sessionNotesData: [
          {
            sessionNoteDataID: 2,
            clientID: 2,
            sessionDate: '2026-01-16',
            sessionTime: '11:00',
            sessionNotes: 'Client transitioned well.',
            date_entered: '2026-01-16',
            entered_by: 'testuser',
          },
        ],
      } as any);

    render(<SessionNotesPage />);

    await user.selectOptions(await screen.findByRole('combobox'), '2');

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('post', '/aba/getSessionNotes', {
        clientID: 2,
        employeeUsername: 'testuser',
      });
    });
  });

  it('limits note selection to four checked boxes at a time', async () => {
    const user = userEvent.setup();

    mockApi
      .mockResolvedValueOnce({
        statusCode: 200,
        clientData: mockClients,
      } as any)
      .mockResolvedValueOnce({
        statusCode: 200,
        sessionNotesData: manySessionNotes,
      } as any);

    render(<SessionNotesPage />);

    const checkboxes = await screen.findAllByRole('checkbox');

    await user.click(checkboxes[0]);
    await user.click(checkboxes[1]);
    await user.click(checkboxes[2]);
    await user.click(checkboxes[3]);

    expect(checkboxes[4]).toBeDisabled();
  });

  it('removes a note from session storage when a checked box is unchecked', async () => {
    const user = userEvent.setup();

    mockApi
      .mockResolvedValueOnce({
        statusCode: 200,
        clientData: mockClients,
      } as any)
      .mockResolvedValueOnce({
        statusCode: 200,
        sessionNotesData: mockSessionNotes,
      } as any);

    Storage.prototype.getItem = jest.fn(() => JSON.stringify([{ id: '1', name: 'Client showed improvement.', clientName: 'John Doe' }]));

    render(<SessionNotesPage />);

    const checkboxes = await screen.findAllByRole('checkbox');
    await user.click(checkboxes[0]);
    await user.click(checkboxes[0]);

    expect(Storage.prototype.setItem).toHaveBeenLastCalledWith('checkedNotes', JSON.stringify([]));
  });

  it('closes the row action menu without taking action', async () => {
    const user = userEvent.setup();

    mockApi
      .mockResolvedValueOnce({
        statusCode: 200,
        clientData: mockClients,
      } as any)
      .mockResolvedValueOnce({
        statusCode: 200,
        sessionNotesData: mockSessionNotes,
      } as any);

    render(<SessionNotesPage />);

    const ellipsisButtons = await screen.findAllByRole('button', { name: 'More options button' });
    await user.click(ellipsisButtons[0]);
    await user.click(screen.getByRole('button', { name: 'Close Menu' }));

    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });

  it('shows an error when deleting a session note fails', async () => {
    const user = userEvent.setup();

    mockApi
      .mockResolvedValueOnce({
        statusCode: 200,
        clientData: mockClients,
      } as any)
      .mockResolvedValueOnce({
        statusCode: 200,
        sessionNotesData: mockSessionNotes,
      } as any)
      .mockRejectedValueOnce(new Error('delete failed'));

    render(<SessionNotesPage />);

    const ellipsisButtons = await screen.findAllByRole('button', { name: 'More options button' });
    await user.click(ellipsisButtons[0]);
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(screen.getByRole('button', { name: /confirm selection/i }));

    expect(await screen.findByText('Error: delete failed')).toBeInTheDocument();
  });

  it('shows a server-side fetch failure when session note loading returns a non-200 status', async () => {
    mockApi
      .mockResolvedValueOnce({
        statusCode: 200,
        clientData: mockClients,
      } as any)
      .mockResolvedValueOnce({
        statusCode: 500,
        serverMessage: 'Failed to load notes',
      } as any);

    render(<SessionNotesPage />);

    expect(await screen.findByText('Error: Failed to load notes')).toBeInTheDocument();
  });

  it('shows a server-side fetch failure when client loading returns a non-200 status', async () => {
    mockApi.mockResolvedValueOnce({
      statusCode: 500,
      serverMessage: 'Failed to load clients',
    } as any);

    render(<SessionNotesPage />);

    expect(await screen.findByText('Error: Failed to load clients')).toBeInTheDocument();
  });

  it('redirects to login when fetching clients returns an unauthorized status', async () => {
    mockApi.mockResolvedValueOnce({
      statusCode: 401,
      serverMessage: 'Unauthorized user',
    } as any);

    render(<SessionNotesPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/Login?previousUrl='));
    });
  });

  it('redirects to login when fetching clients throws an unauthorized error', async () => {
    mockApi.mockRejectedValueOnce({
      response: {
        status: 401,
      },
    });

    render(<SessionNotesPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/Login?previousUrl='));
    });
  });

  it('shows the server-side delete failure message when deletion returns a non-200 status', async () => {
    const user = userEvent.setup();

    mockApi
      .mockResolvedValueOnce({
        statusCode: 200,
        clientData: mockClients,
      } as any)
      .mockResolvedValueOnce({
        statusCode: 200,
        sessionNotesData: mockSessionNotes,
      } as any)
      .mockResolvedValueOnce({
        statusCode: 500,
        serverMessage: 'Delete failed',
      } as any);

    render(<SessionNotesPage />);

    const ellipsisButtons = await screen.findAllByRole('button', { name: 'More options button' });
    await user.click(ellipsisButtons[0]);
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(screen.getByRole('button', { name: /confirm selection/i }));

    expect(await screen.findByText('Error: Failed to delete "1".')).toBeInTheDocument();
  });

  it('closes the row action menu when the ellipsis button is clicked twice', async () => {
    const user = userEvent.setup();

    mockApi
      .mockResolvedValueOnce({
        statusCode: 200,
        clientData: mockClients,
      } as any)
      .mockResolvedValueOnce({
        statusCode: 200,
        sessionNotesData: mockSessionNotes,
      } as any);

    render(<SessionNotesPage />);

    const ellipsisButtons = await screen.findAllByRole('button', { name: 'More options button' });
    await user.click(ellipsisButtons[0]);
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();

    await user.click(ellipsisButtons[0]);

    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });

  it('clears the success message after the timer completes', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    mockApi
      .mockResolvedValueOnce({
        statusCode: 200,
        clientData: mockClients,
      } as any)
      .mockResolvedValueOnce({
        statusCode: 200,
        sessionNotesData: mockSessionNotes,
      } as any)
      .mockResolvedValueOnce({
        statusCode: 200,
        serverMessage: 'Deleted',
      } as any);

    render(<SessionNotesPage />);

    const ellipsisButtons = await screen.findAllByRole('button', { name: 'More options button' });
    await user.click(ellipsisButtons[0]);
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(screen.getByRole('button', { name: /confirm selection/i }));

    expect(await screen.findByText(/has been deleted successfully/i)).toBeInTheDocument();

    for (let step = 0; step < 4; step += 1) {
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });
    }

    await waitFor(() => {
      expect(screen.queryByText(/has been deleted successfully/i)).not.toBeInTheDocument();
    });
  });
});
