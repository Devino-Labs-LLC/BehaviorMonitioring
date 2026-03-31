import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import DataEntry from '../../../src/app/DataEntry/page';
import { api } from '../../../src/lib/Api';

const mockPush = jest.fn();
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
jest.mock('../../../src/function/DateTimes', () => ({
  getCurrentDate: () => '2026-03-31',
  getCurrentTime: () => '09:30',
}));
jest.mock('../../../src/components/header', () => () => <div data-testid="header" />);
jest.mock('../../../src/components/loading', () => () => <div data-testid="loading" />);
jest.mock('../../../src/components/Inputfield', () => (props: any) => {
  const { requiring, nameOfClass, ...rest } = props;
  return <input {...rest} />;
});
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
jest.mock('../../../src/components/Datefield', () => (props: any) => {
  const { requiring, nameOfClass, ...rest } = props;
  return <input type="date" {...rest} />;
});
jest.mock('../../../src/components/Timefield', () => (props: any) => {
  const { requiring, nameOfClass, ...rest } = props;
  return <input type="time" {...rest} />;
});
jest.mock('../../../src/components/Timer', () => (props: any) => (
  <button type="button" onClick={() => props.onChange({ hour: 0, minute: 10, second: 0 })}>
    timer-{props.name}
  </button>
));
jest.mock('../../../src/components/Button', () => (props: any) => {
  const { btnType, onClick, placeholder } = props;
  return (
    <button type={btnType || 'button'} onClick={onClick}>
      {placeholder}
    </button>
  );
});
jest.mock('../../../src/components/TextareaInput', () => (props: any) => {
  const { requiring, nameOfClass, ...rest } = props;
  return <textarea aria-label={props.name} {...rest} />;
});
jest.mock('../../../src/components/Tab', () => (props: any) => {
  const { nameOfClass, onClick, placeholder } = props;
  return (
    <button type="button" className={nameOfClass} onClick={onClick}>
      {placeholder}
    </button>
  );
});
jest.mock('../../../src/components/NoClientsPrompt', () => (props: any) =>
  props.isVisible ? <div>No clients prompt</div> : null,
);
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
}));

const mockApi = api as jest.MockedFunction<typeof api>;

describe('Data Entry Page Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetLoggedInUserStatus.mockReturnValue(true);
    mockGetLoggedInUser.mockReturnValue('testuser');
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => {
      if (key === 'dataEntryState') return null;
      return null;
    });
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => undefined);
    jest.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('loads clients on mount and persists initialized state', async () => {
    mockApi.mockResolvedValueOnce({
      statusCode: 200,
      clientData: [{ clientID: 1, fName: 'John', lName: 'Doe' }],
    } as any);
    mockApi.mockResolvedValueOnce({
      statusCode: 200,
      behaviorSkillData: [],
    } as any);

    render(<DataEntry />);

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('post', '/aba/getAllClientInfo', {
        employeeUsername: 'testuser',
      });
    });

    await waitFor(() => {
      expect(Storage.prototype.setItem).toHaveBeenCalledWith(
        'dataEntryState',
        expect.stringContaining('"selectedClientID":1'),
      );
    });
  });

  it('shows the no-clients prompt when the API returns no clients', async () => {
    mockApi.mockResolvedValueOnce({
      statusCode: 200,
      clientData: [],
    } as any);

    render(<DataEntry />);

    await waitFor(() => {
      expect(screen.getByText('No clients prompt')).toBeInTheDocument();
    });
  });

  it('submits session notes for the selected client', async () => {
    mockApi
      .mockResolvedValueOnce({
        statusCode: 200,
        clientData: [{ clientID: 1, fName: 'John', lName: 'Doe' }],
      } as any)
      .mockResolvedValueOnce({
        statusCode: 200,
        behaviorSkillData: [],
      } as any)
      .mockResolvedValueOnce({
        statusCode: 201,
        serverMessage: 'Session notes saved',
      } as any);

    render(<DataEntry />);

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('post', '/aba/getAllClientInfo', {
        employeeUsername: 'testuser',
      });
    });

    await waitFor(() => {
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Session Notes' }));

    await waitFor(() => {
      expect(screen.getByLabelText('sessionNotesTextField')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('sessionNotesTextField'), {
      target: { value: 'Worked on transitions and reinforcement.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('post', '/aba/submitSessionNotes', {
        clientID: 1,
        sessionDate: '2026-03-31',
        sessionTime: '09:30',
        sessionNotes: 'Worked on transitions and reinforcement.',
        employeeUsername: 'testuser',
      });
    });

    expect(screen.getByText('Session notes saved')).toBeInTheDocument();
  });

  it('redirects unauthenticated users to login', async () => {
    mockGetLoggedInUserStatus.mockReturnValue(false);
    mockApi.mockResolvedValueOnce({
      statusCode: 401,
      serverMessage: 'Unauthorized user',
    } as any);

    render(<DataEntry />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/Login?previousUrl='));
    });
  });
});
