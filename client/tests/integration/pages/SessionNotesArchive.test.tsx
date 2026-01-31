import React from 'react';
import { render, waitFor } from '@testing-library/react';
import SessionNotesArchive from '../../../src/app/SessionNotes/Archive/page';
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
    const mockPush = jest.fn();

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
});
