import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import SessionNotesPage from '../../../src/app/SessionNotes/page';
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

  beforeEach(() => {
    jest.clearAllMocks();
    Storage.prototype.setItem = jest.fn();
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
    const mockPush = jest.fn();
    
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
});
