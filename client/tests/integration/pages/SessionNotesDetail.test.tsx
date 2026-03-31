import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import SessionNotesDetailPage from '../../../src/app/SessionNotes/Detail/page';
import { api } from '../../../src/lib/Api';

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockRouter = {
  push: mockPush,
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: mockBack,
};
const mockGetLoggedInUserStatus = jest.fn();
const mockGetLoggedInUser = jest.fn();

jest.mock('../../../src/lib/Api');
jest.mock('../../../src/function/VerificationCheck', () => ({
  GetLoggedInUserStatus: () => mockGetLoggedInUserStatus(),
  GetLoggedInUser: () => mockGetLoggedInUser(),
}));
jest.mock('../../../src/function/debounce', () => ({
  debounceAsync: (fn: (...args: any[]) => unknown) => (...args: any[]) => fn(...args),
}));
jest.mock('next/head', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));
jest.mock('../../../src/components/header', () => () => <div data-testid="header" />);
jest.mock('../../../src/components/loading', () => () => <div data-testid="loading" />);
jest.mock('../../../src/components/Button', () => (props: any) => (
  <button type={props.btnType || 'button'} onClick={props.onClick}>
    {props.placeholder}
  </button>
));

const mockApi = api as jest.MockedFunction<typeof api>;

describe('Session Notes Detail Page Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetLoggedInUserStatus.mockReturnValue(true);
    mockGetLoggedInUser.mockReturnValue('testuser');
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => {
      if (key === 'clientID') return '1';
      if (key === 'sessionNoteId') return 'note-1';
      return null;
    });
    jest.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('loads the selected session note details from session storage', async () => {
    mockApi.mockResolvedValueOnce({
      statusCode: 200,
      sessionNotesData: [
        {
          sessionNoteDataID: 'note-1',
          clientName: 'John Doe',
          sessionDate: '2026-03-31',
          sessionTime: '10:00',
          sessionNotes: 'Client had a productive session.',
          entered_by: 'testuser',
        },
      ],
    } as any);

    render(<SessionNotesDetailPage />);

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('post', '/aba/getASessionNote', {
        clientID: '1',
        sessionNoteId: 'note-1',
        employeeUsername: 'testuser',
      });
    });

    expect(await screen.findByText('Session Notes - Detail')).toBeInTheDocument();
    expect(screen.getByText((_, element) => element?.textContent === 'Client Name: John Doe')).toBeInTheDocument();
    expect(screen.getByText('Client had a productive session.')).toBeInTheDocument();
    expect(screen.getByText('testuser')).toBeInTheDocument();
    expect(Storage.prototype.removeItem).toHaveBeenCalledWith('clientID');
    expect(Storage.prototype.removeItem).toHaveBeenCalledWith('sessionNoteId');
  });

  it('returns to the list when the required session storage values are missing', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);

    render(<SessionNotesDetailPage />);

    expect(mockPush).toHaveBeenCalledWith('/SessionNotes');
  });

  it('goes back when Escape is pressed', async () => {
    mockApi.mockResolvedValueOnce({
      statusCode: 200,
      sessionNotesData: [],
    } as any);

    render(<SessionNotesDetailPage />);

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalled();
    });

    fireEvent.keyDown(globalThis, { key: 'Escape' });

    expect(mockBack).toHaveBeenCalled();
  });
});
