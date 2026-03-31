import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SessionNotesArchive from '../../../src/app/SessionNotes/Archive/page';
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
  usePathname: () => '/SessionNotes/Archive',
  useSearchParams: () => ({
    get: jest.fn(),
  }),
}));

const mockApi = api as jest.MockedFunction<typeof api>;

describe('SessionNotes Archive Page Integration', () => {
  const mockClientData = [
    { clientID: 1, fName: 'John', lName: 'Doe' },
    { clientID: 2, fName: 'Jane', lName: 'Smith' },
  ];

  const mockArchivedSessionNotes = [
    {
      sessionNoteDataID: 1,
      clientID: 1,
      sessionDate: '2026-01-15',
      sessionTime: '10:00',
      sessionNotes: 'First archived note',
      date_entered: '2026-01-15',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    Storage.prototype.getItem = jest.fn(() => null);
    Storage.prototype.setItem = jest.fn();
  });

  it('fetches clients on mount', async () => {
    mockApi
      .mockResolvedValueOnce({
        statusCode: 200,
        clientData: mockClientData,
      } as any)
      .mockResolvedValueOnce({
        statusCode: 200,
        sessionNotesData: mockArchivedSessionNotes,
      } as any);

    render(<SessionNotesArchive />);

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('post', '/aba/getAllClientInfo', {
        employeeUsername: 'testuser',
      });
    });
  });

  it('fetches archived session notes after clients are loaded', async () => {
    mockApi
      .mockResolvedValueOnce({
        statusCode: 200,
        clientData: mockClientData,
      } as any)
      .mockResolvedValueOnce({
        statusCode: 200,
        sessionNotesData: mockArchivedSessionNotes,
      } as any);

    render(<SessionNotesArchive />);

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('post', '/aba/getArchivedSessionNotes', {
        clientID: 1,
        employeeUsername: 'testuser',
      });
    });
  });

  it('redirects to login when not authenticated', async () => {
    jest
      .spyOn(require('../../../src/function/VerificationCheck'), 'GetLoggedInUserStatus')
      .mockReturnValueOnce(false);

    jest.spyOn(require('next/navigation'), 'useRouter').mockReturnValueOnce({
      push: mockPush,
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
    });

    render(<SessionNotesArchive />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/Login'));
    });
  });

  it('opens archived session note detail when a row is clicked', async () => {
    const user = userEvent.setup();

    mockApi
      .mockResolvedValueOnce({
        statusCode: 200,
        clientData: mockClientData,
      } as any)
      .mockResolvedValueOnce({
        statusCode: 200,
        sessionNotesData: mockArchivedSessionNotes,
      } as any);

    render(<SessionNotesArchive />);

    await user.click(await screen.findByText('2026-01-15'));

    expect(Storage.prototype.setItem).toHaveBeenCalledWith('clientID', '1');
    expect(Storage.prototype.setItem).toHaveBeenCalledWith('archivedSessionNoteId', '1');
    expect(mockPush).toHaveBeenCalledWith('/SessionNotes/Archive_Detail');
  });

  it('reactivates an archived session note', async () => {
    const user = userEvent.setup();

    mockApi
      .mockResolvedValueOnce({
        statusCode: 200,
        clientData: mockClientData,
      } as any)
      .mockResolvedValueOnce({
        statusCode: 200,
        sessionNotesData: mockArchivedSessionNotes,
      } as any)
      .mockResolvedValueOnce({
        statusCode: 200,
        serverMessage: 'Reactivated',
      } as any)
      .mockResolvedValueOnce({
        statusCode: 200,
        sessionNotesData: [],
      } as any);

    render(<SessionNotesArchive />);

    await user.click(await screen.findByRole('button', { name: 'Reactivate button' }));
    await user.click(screen.getByRole('button', { name: /confirm selection/i }));

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('post', '/aba/activateSessionNote', {
        clientID: 1,
        sessionNoteId: '1',
        employeeUsername: 'testuser',
      });
    });
  });

  it('navigates back when escape is pressed', async () => {
    mockApi
      .mockResolvedValueOnce({
        statusCode: 200,
        clientData: mockClientData,
      } as any)
      .mockResolvedValueOnce({
        statusCode: 200,
        sessionNotesData: mockArchivedSessionNotes,
      } as any);

    render(<SessionNotesArchive />);

    await screen.findByText('2026-01-15');
    fireEvent.keyDown(globalThis, { key: 'Escape' });

    expect(mockBack).toHaveBeenCalled();
  });
});
