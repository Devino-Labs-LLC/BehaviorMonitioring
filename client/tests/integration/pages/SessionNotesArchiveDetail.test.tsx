import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import SessionNotesArchiveDetail from '../../../src/app/SessionNotes/Archive_Detail/page';
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
  usePathname: () => '/SessionNotes/Archive_Detail',
  useSearchParams: () => ({
    get: jest.fn(),
  }),
}));

const mockApi = api as jest.MockedFunction<typeof api>;

describe('SessionNotes Archive Detail Page Integration', () => {
  const mockSessionNoteData = {
    statusCode: 200,
    sessionNotesData: [
      {
        sessionNoteDataID: 1,
        clientID: 10,
        sessionDate: '2026-01-15',
        sessionTime: '10:00',
        sessionNotes: 'Client showed improvement in behavior.',
        date_entered: '2026-01-15',
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    Storage.prototype.getItem = jest.fn((key) => {
      if (key === 'clientID') return '10';
      if (key === 'archivedSessionNoteId') return '1';
      return null;
    });
    Storage.prototype.removeItem = jest.fn();
  });

  it('fetches archived session note details on mount', async () => {
    mockApi.mockResolvedValueOnce(mockSessionNoteData as any);

    render(<SessionNotesArchiveDetail />);

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('post', '/aba/getAArchivedSessionNote', {
        clientID: '10',
        sessionNoteId: '1',
        employeeUsername: 'testuser',
      });
    });
  });

  it('clears sessionStorage on mount', async () => {
    mockApi.mockResolvedValueOnce(mockSessionNoteData as any);

    render(<SessionNotesArchiveDetail />);

    await waitFor(() => {
      expect(Storage.prototype.removeItem).toHaveBeenCalledWith('clientID');
      expect(Storage.prototype.removeItem).toHaveBeenCalledWith('archivedSessionNoteId');
    });
  });

  it('redirects to Archive page when no session data exists', () => {
    Storage.prototype.getItem = jest.fn(() => null);

    const mockPush = jest.fn();
    jest.spyOn(require('next/navigation'), 'useRouter').mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
    });

    render(<SessionNotesArchiveDetail />);

    expect(mockPush).toHaveBeenCalledWith('/SessionNotes/Archive');
  });

  it('shows an error message when archived session note loading fails', async () => {
    mockApi.mockRejectedValueOnce(new Error('archived load failed'));

    render(<SessionNotesArchiveDetail />);

    expect(await screen.findByText('Error: archived load failed')).toBeInTheDocument();
  });

  it('navigates back when the Back button is clicked', async () => {
    const mockBack = jest.fn();
    jest.spyOn(require('next/navigation'), 'useRouter').mockReturnValue({
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: mockBack,
    });

    mockApi.mockResolvedValueOnce(mockSessionNoteData as any);

    render(<SessionNotesArchiveDetail />);

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Back button' }));
    expect(mockBack).toHaveBeenCalled();
  });

  it('navigates back when Escape is pressed', async () => {
    const mockBack = jest.fn();
    jest.spyOn(require('next/navigation'), 'useRouter').mockReturnValue({
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: mockBack,
    });

    mockApi.mockResolvedValueOnce(mockSessionNoteData as any);

    render(<SessionNotesArchiveDetail />);

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalled();
    });

    fireEvent.keyDown(globalThis, { key: 'Escape' });
    expect(mockBack).toHaveBeenCalled();
  });
});
