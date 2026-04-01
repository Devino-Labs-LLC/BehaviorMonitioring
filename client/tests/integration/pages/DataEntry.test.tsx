import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
  const normalizedValue =
    typeof rest.value === 'number' && Number.isNaN(rest.value) ? '' : rest.value;
  return <input {...rest} value={normalizedValue} />;
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
    jest.useRealTimers();
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
    jest.useRealTimers();
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

  it('submits behavior data for the selected target', async () => {
    const user = userEvent.setup();

    mockApi
      .mockResolvedValueOnce({
        statusCode: 200,
        clientData: [{ clientID: 1, fName: 'John', lName: 'Doe' }],
      } as any)
      .mockResolvedValueOnce({
        statusCode: 200,
        behaviorSkillData: [{ bsID: 11, name: 'Aggression', measurement: 'Rate' }],
      } as any)
      .mockResolvedValueOnce({
        statusCode: 201,
        serverMessage: 'Behavior entry saved',
      } as any);

    render(<DataEntry />);

    const targetSelect = await screen.findByLabelText('Target-0');
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Aggression' })).toBeInTheDocument();
    });
    await user.selectOptions(targetSelect, '11');

    const countInput = document.querySelector('input[name="count-0"]') as HTMLInputElement;
    expect(countInput).not.toBeNull();

    fireEvent.change(countInput, {
      target: { value: '3' },
    });
    await user.click(screen.getByRole('button', { name: 'timer-duration-0' }));
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('post', '/aba/submitTargetBehavior', {
        clientID: 1,
        targetAmt: 1,
        selectedTargets: ['11'],
        selectedMeasurementTypes: ['Rate'],
        dates: ['2026-03-31'],
        times: ['09:30'],
        count: [3],
        duration: ['0:10:0'],
        employeeUsername: 'testuser',
      });
    });

    expect(screen.getByText('Behavior entry saved')).toBeInTheDocument();
  });

  it('handles invalid stored state gracefully', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    jest.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => {
      if (key === 'dataEntryState') return '{invalid-json';
      return null;
    });

    mockApi
      .mockResolvedValueOnce({
        statusCode: 200,
        clientData: [{ clientID: 1, fName: 'John', lName: 'Doe' }],
      } as any)
      .mockResolvedValueOnce({
        statusCode: 200,
        behaviorSkillData: [],
      } as any);

    render(<DataEntry />);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    consoleErrorSpy.mockRestore();
  });

  it('redirects when the client lookup rejects with an unauthorized API error', async () => {
    mockApi.mockImplementation((method, path) => {
      if (path === '/aba/getAllClientInfo') {
        return Promise.reject({
          response: {
            status: 401,
            data: {
              serverMessage: 'Unauthorized user',
            },
          },
        } as any);
      }

      return Promise.reject(new Error(`Unexpected API path: ${path}`));
    });

    render(<DataEntry />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/Login?previousUrl='));
    });
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

  it('adds and removes behavior rows while normalizing invalid target amount input', async () => {
    const user = userEvent.setup();

    mockApi
      .mockResolvedValueOnce({
        statusCode: 200,
        clientData: [{ clientID: 1, fName: 'John', lName: 'Doe' }],
      } as any)
      .mockResolvedValueOnce({
        statusCode: 200,
        behaviorSkillData: [{ bsID: 11, name: 'Aggression', measurement: 'Frequency' }],
      } as any);

    render(<DataEntry />);

    const targetAmtInput = await screen.findByRole('spinbutton');
    fireEvent.change(targetAmtInput, { target: { value: '2' } });

    await waitFor(() => {
      expect(screen.getByLabelText('Target-1')).toBeInTheDocument();
    });

    const removeButtons = screen.getAllByRole('button', { name: 'Remove' });
    await user.click(removeButtons[1]);

    await waitFor(() => {
      expect(screen.queryByLabelText('Target-1')).not.toBeInTheDocument();
    });

    await user.clear(targetAmtInput);
    fireEvent.change(targetAmtInput, { target: { value: '0' } });

    expect((targetAmtInput as HTMLInputElement).value).toBe('1');
  });

  it('hydrates stored selection state for an existing behavior entry', async () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => {
      if (key === 'dataEntryState') {
        return JSON.stringify({
          activeTab: 'Behavior',
          targetAmt: 1,
          selectedClient: 'John Doe',
          selectedClientID: 1,
          selectedTargets: ['11'],
          selectedMeasurementTypes: ['Frequency'],
          dates: ['2026-03-30'],
          times: ['08:15'],
          count: [4],
          duration: [null],
        });
      }

      return null;
    });

    mockApi
      .mockResolvedValueOnce({
        statusCode: 200,
        clientData: [{ clientID: 1, fName: 'John', lName: 'Doe' }],
      } as any)
      .mockResolvedValueOnce({
        statusCode: 200,
        behaviorSkillData: [{ bsID: 11, name: 'Aggression', measurement: 'Frequency' }],
      } as any);

    render(<DataEntry />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('2026-03-30')).toBeInTheDocument();
    });

    expect(screen.getByDisplayValue('08:15')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByDisplayValue('4')).toBeInTheDocument();
    });
  });

  it('hydrates and submits a skill acquisition entry', async () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => {
      if (key === 'dataEntryState') {
        return JSON.stringify({
          activeTab: 'Skill',
          skillAmt: 1,
          selectedClient: 'John Doe',
          selectedClientID: 1,
          selectedSkills: ['21'],
          dates: ['2026-03-31'],
          times: ['08:30'],
        });
      }

      return null;
    });

    mockApi.mockImplementation((method, path) => {
      if (path === '/aba/getAllClientInfo') {
        return Promise.resolve({
          statusCode: 200,
          clientData: [{ clientID: 1, fName: 'John', lName: 'Doe' }],
        } as any);
      }

      if (path === '/aba/getClientSkillAquisition') {
        return Promise.resolve({
          statusCode: 200,
          behaviorSkillData: [{ bsID: 21, name: 'Greeting', measurement: 'Duration' }],
        } as any);
      }

      if (path === '/aba/submitSkillAquisition') {
        return Promise.resolve({
          statusCode: 201,
          serverMessage: 'Skill acquisition saved',
        } as any);
      }

      return Promise.reject(new Error(`Unexpected API path: ${path}`));
    });

    render(<DataEntry />);

    await waitFor(() => {
      expect(screen.getByText('Number of skill:')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('post', '/aba/submitSkillAquisition', {
        clientID: 1,
        skillAmt: 1,
        selectedSkills: ['21'],
        dates: ['2026-03-31'],
        times: ['08:30'],
        employeeUsername: 'testuser',
      });
    });

    expect(screen.getByText('Skill acquisition saved')).toBeInTheDocument();
  });

  it('clears persisted state after the success timer expires', async () => {
    jest.useFakeTimers();

    mockApi.mockImplementation((method, path) => {
      if (path === '/aba/getAllClientInfo') {
        return Promise.resolve({
          statusCode: 200,
          clientData: [{ clientID: 1, fName: 'John', lName: 'Doe' }],
        } as any);
      }

      if (path === '/aba/getClientTargetBehavior') {
        return Promise.resolve({
          statusCode: 200,
          behaviorSkillData: [],
        } as any);
      }

      if (path === '/aba/submitSessionNotes') {
        return Promise.resolve({
          statusCode: 201,
          serverMessage: 'Session notes saved',
        } as any);
      }

      return Promise.reject(new Error(`Unexpected API path: ${path}`));
    });

    render(<DataEntry />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Session Notes' }));
    fireEvent.change(screen.getByLabelText('sessionNotesTextField'), {
      target: { value: 'Timer reset note' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => {
      expect(screen.getByText('Session notes saved')).toBeInTheDocument();
    });

    for (let second = 0; second < 4; second += 1) {
      act(() => {
        jest.advanceTimersByTime(1000);
      });
    }

    await waitFor(() => {
      expect(Storage.prototype.removeItem).toHaveBeenCalledWith('dataEntryState');
    });
  });

  it('shows API failure messages for behavior and skill target loading', async () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => {
      if (key === 'dataEntryState') {
        return JSON.stringify({
          activeTab: 'Skill',
          skillAmt: 1,
          selectedClient: 'John Doe',
          selectedClientID: 1,
        });
      }

      return null;
    });

    mockApi.mockImplementation((method, path) => {
      if (path === '/aba/getAllClientInfo') {
        return Promise.resolve({
          statusCode: 200,
          clientData: [{ clientID: 1, fName: 'John', lName: 'Doe' }],
        } as any);
      }

      if (path === '/aba/getClientSkillAquisition') {
        return Promise.resolve({
          statusCode: 500,
          serverMessage: 'Failed to load skills',
        } as any);
      }

      return Promise.reject(new Error(`Unexpected API path: ${path}`));
    });

    render(<DataEntry />);

    await waitFor(() => {
      expect(screen.getByText('Error: Failed to load skills')).toBeInTheDocument();
    });
  });

  it('shows an error when behavior submission fails', async () => {
    const user = userEvent.setup();

    mockApi.mockImplementation((method, path) => {
      if (path === '/aba/getAllClientInfo') {
        return Promise.resolve({
          statusCode: 200,
          clientData: [{ clientID: 1, fName: 'John', lName: 'Doe' }],
        } as any);
      }

      if (path === '/aba/getClientTargetBehavior') {
        return Promise.resolve({
          statusCode: 200,
          behaviorSkillData: [{ bsID: 11, name: 'Aggression', measurement: 'Frequency' }],
        } as any);
      }

      if (path === '/aba/submitTargetBehavior') {
        return Promise.resolve({
          statusCode: 500,
          serverMessage: 'Behavior entry failed',
        } as any);
      }

      return Promise.reject(new Error(`Unexpected API path: ${path}`));
    });

    render(<DataEntry />);

    const targetSelect = await screen.findByLabelText('Target-0');
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Aggression' })).toBeInTheDocument();
    });
    await user.selectOptions(targetSelect, '11');

    const countInput = document.querySelector('input[name="count-0"]') as HTMLInputElement;
    fireEvent.change(countInput, { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    expect(await screen.findByText('Error: Behavior entry failed')).toBeInTheDocument();
  });

  it('reloads targets when the selected client changes and normalizes negative counts', async () => {
    const user = userEvent.setup();

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
        behaviorSkillData: [{ bsID: 11, name: 'Aggression', measurement: 'Frequency' }],
      } as any)
      .mockResolvedValueOnce({
        statusCode: 200,
        behaviorSkillData: [{ bsID: 12, name: 'Elopement', measurement: 'Frequency' }],
      } as any);

    render(<DataEntry />);

    const clientSelect = await screen.findByLabelText('ClientName');
    fireEvent.change(clientSelect, { target: { value: '2' } });

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('post', '/aba/getClientTargetBehavior', {
        clientID: 2,
        employeeUsername: 'testuser',
      });
    });

    const targetSelect = await screen.findByLabelText('Target-0');
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Elopement' })).toBeInTheDocument();
    });
    await user.selectOptions(targetSelect, '12');

    const countInput = document.querySelector('input[name="count-0"]') as HTMLInputElement;
    fireEvent.change(countInput, { target: { value: '-5' } });

    expect(countInput.value).toBe('0');
  });
});
