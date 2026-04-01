import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import EditClient from '../../../src/app/Admin/manageClients/edit/page';
import { api } from '../../../src/lib/Api';

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockSearchParamGet = jest.fn();
const mockUseAuth = jest.fn();
const mockRouter = {
  push: mockPush,
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: mockBack,
};
const mockSearchParams = {
  get: mockSearchParamGet,
};

jest.mock('../../../src/lib/Api', () => ({
  api: jest.fn(),
}));
jest.mock('../../../src/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
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
  useSearchParams: () => mockSearchParams,
}));
jest.mock('../../../src/components/header', () => () => <div data-testid="header" />);
jest.mock('../../../src/components/loading', () => () => <div data-testid="loading" />);
jest.mock('../../../src/components/Button', () => (props: any) => (
  <button type={props.btnType || 'button'} onClick={props.onClick}>
    {props.placeholder}
  </button>
));
jest.mock('../../../src/components/Inputfield', () => (props: any) => (
  <input
    aria-label={props.label || props.name}
    name={props.name}
    type={props.type}
    value={props.value}
    onChange={props.onChange}
  />
));
jest.mock('../../../src/components/Datefield', () => (props: any) => (
  <input
    aria-label={props.label || props.name}
    name={props.name}
    type="date"
    value={props.value}
    onChange={props.onChange}
  />
));
jest.mock('../../../src/components/Selectdropdown', () => (props: any) => (
  <select
    aria-label={props.label || props.name}
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
jest.mock('../../../src/components/TextareaInput', () => (props: any) => (
  <textarea
    aria-label={props.label || props.name}
    name={props.name}
    value={props.value}
    onChange={props.onChange}
  />
));
jest.mock('../../../src/components/Checkbox', () => (props: any) => (
  <input
    aria-label={props.label}
    type="checkbox"
    checked={props.isChecked}
    onChange={props.onChange}
  />
));

const mockApi = api as jest.MockedFunction<typeof api>;

describe('EditClient Page Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    mockSearchParamGet.mockReturnValue('1');
    mockUseAuth.mockReturnValue({
      isReady: true,
      isLoggedIn: true,
      isAdmin: true,
      username: 'testadmin',
    });
  });

  it('redirects back to the list when no client ID is provided', async () => {
    mockSearchParamGet.mockReturnValue(null);

    render(<EditClient />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/Admin/manageClients');
    });
  });

  it('loads homes and client details', async () => {
    mockApi.mockImplementation((method, path) => {
      if (path === '/admin/getAllHomes') {
        return Promise.resolve({
          statusCode: 200,
          homes: [{ homeID: 4, homeName: 'Sunrise Home' }],
        } as any);
      }

      if (path === '/aba/getAllClientInfo') {
        return Promise.resolve({
          statusCode: 200,
          clientData: [
            {
              clientID: 1,
              fName: 'Jane',
              lName: 'Doe',
              DOB: '2005-01-01',
              homeID: 4,
              intake_Date: '2026-03-01',
              medicaid_id_number: 'MED-123',
              behavior_plan_due_date: '2026-04-30',
              companyID: 1,
            },
          ],
        } as any);
      }

      return Promise.reject(new Error(`Unexpected API path: ${path}`));
    });

    render(<EditClient />);

    expect(await screen.findByDisplayValue('Jane')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Doe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('MED-123')).toBeInTheDocument();
    expect(mockApi).toHaveBeenCalledWith('post', '/admin/getAllHomes', {
      employeeUsername: 'testadmin',
    });
    expect(mockApi).toHaveBeenCalledWith('post', '/aba/getAllClientInfo', {
      employeeUsername: 'testadmin',
    });
  });

  it('redirects logged-out users to login', async () => {
    mockUseAuth.mockReturnValue({
      isReady: true,
      isLoggedIn: false,
      isAdmin: false,
      username: '',
    });

    render(<EditClient />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/Login?previousUrl='));
    });
  });

  it('redirects non-admin users to the home page', async () => {
    mockUseAuth.mockReturnValue({
      isReady: true,
      isLoggedIn: true,
      isAdmin: false,
      username: 'testadmin',
    });

    render(<EditClient />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  it('shows a validation error when required fields are missing', async () => {
    mockApi.mockImplementation((method, path) => {
      if (path === '/admin/getAllHomes') {
        return Promise.resolve({
          statusCode: 200,
          homes: [{ homeID: 4, homeName: 'Sunrise Home' }],
        } as any);
      }

      if (path === '/aba/getAllClientInfo') {
        return Promise.resolve({
          statusCode: 200,
          clientData: [
            {
              clientID: 1,
              fName: 'Jane',
              lName: 'Doe',
              DOB: '2005-01-01',
              homeID: 4,
              intake_Date: '2026-03-01',
              medicaid_id_number: 'MED-123',
              behavior_plan_due_date: '2026-04-30',
              companyID: 1,
            },
          ],
        } as any);
      }

      return Promise.reject(new Error(`Unexpected API path: ${path}`));
    });

    render(<EditClient />);

    expect(await screen.findByDisplayValue('Jane')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('First Name'), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update Client' }));

    expect(await screen.findByText('First name is required')).toBeInTheDocument();
    expect(mockApi).not.toHaveBeenCalledWith('post', '/admin/updateClient', expect.anything());
  });

  it('falls back to a default home option when home lookup fails', async () => {
    mockApi.mockImplementation((method, path) => {
      if (path === '/admin/getAllHomes') {
        return Promise.reject(new Error('home lookup failed'));
      }

      if (path === '/aba/getAllClientInfo') {
        return Promise.resolve({
          statusCode: 200,
          clientData: [
            {
              clientID: 1,
              fName: 'Jane',
              lName: 'Doe',
              DOB: '2005-01-01',
              homeID: 1,
              intake_Date: '2026-03-01',
              medicaid_id_number: 'MED-123',
              behavior_plan_due_date: '2026-04-30',
              companyID: 1,
            },
          ],
        } as any);
      }

      return Promise.reject(new Error(`Unexpected API path: ${path}`));
    });

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    render(<EditClient />);

    expect(await screen.findByDisplayValue('Jane')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Main Home' })).toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });

  it('updates the client and returns to the list', async () => {
    jest.useFakeTimers();

    mockApi.mockImplementation((method, path) => {
      if (path === '/admin/getAllHomes') {
        return Promise.resolve({
          statusCode: 200,
          homes: [{ homeID: 4, homeName: 'Sunrise Home' }],
        } as any);
      }

      if (path === '/aba/getAllClientInfo') {
        return Promise.resolve({
          statusCode: 200,
          clientData: [
            {
              clientID: 1,
              fName: 'Jane',
              lName: 'Doe',
              DOB: '2005-01-01',
              homeID: 4,
              intake_Date: '2026-03-01',
              medicaid_id_number: 'MED-123',
              behavior_plan_due_date: '2026-04-30',
              companyID: 1,
            },
          ],
        } as any);
      }

      if (path === '/admin/updateClient') {
        return Promise.resolve({
          statusCode: 201,
          serverMessage: 'Client updated successfully!',
        } as any);
      }

      return Promise.reject(new Error(`Unexpected API path: ${path}`));
    });

    render(<EditClient />);

    const updateButton = await screen.findByRole('button', { name: 'Update Client' });
    expect(await screen.findByDisplayValue('Jane')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('First Name'), { target: { value: 'Janet' } });
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('post', '/admin/updateClient', {
        clientID: 1,
        fName: 'Janet',
        lName: 'Doe',
        DOB: '2005-01-01',
        intakeDate: '2026-03-01',
        groupHomeName: 'Sunrise Home',
        medicaidIdNumber: 'MED-123',
        behaviorPlanDueDate: '2026-04-30',
        employeeUsername: 'testadmin',
      });
    });

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(mockPush).toHaveBeenCalledWith('/Admin/manageClients');
  });

  it('shows a message when auth is ready but the username is missing', async () => {
    mockUseAuth.mockReturnValue({
      isReady: true,
      isLoggedIn: true,
      isAdmin: true,
      username: '',
    });

    render(<EditClient />);

    expect(
      await screen.findByText('Unable to load homes until the current user is available.'),
    ).toBeInTheDocument();
  });

  it('shows a client-not-found message when the requested client is absent', async () => {
    mockApi.mockImplementation((method, path) => {
      if (path === '/admin/getAllHomes') {
        return Promise.resolve({
          statusCode: 200,
          homes: [{ homeID: 4, homeName: 'Sunrise Home' }],
        } as any);
      }

      if (path === '/aba/getAllClientInfo') {
        return Promise.resolve({
          statusCode: 200,
          clientData: [],
        } as any);
      }

      return Promise.reject(new Error(`Unexpected API path: ${path}`));
    });

    render(<EditClient />);

    expect(await screen.findByText('Client not found')).toBeInTheDocument();
  });

  it('shows an update failure message when the API rejects', async () => {
    mockApi.mockImplementation((method, path) => {
      if (path === '/admin/getAllHomes') {
        return Promise.resolve({
          statusCode: 200,
          homes: [{ homeID: 4, homeName: 'Sunrise Home' }],
        } as any);
      }

      if (path === '/aba/getAllClientInfo') {
        return Promise.resolve({
          statusCode: 200,
          clientData: [
            {
              clientID: 1,
              fName: 'Jane',
              lName: 'Doe',
              DOB: '2005-01-01',
              homeID: 4,
              intake_Date: '2026-03-01',
              medicaid_id_number: 'MED-123',
              behavior_plan_due_date: '2026-04-30',
              companyID: 1,
            },
          ],
        } as any);
      }

      if (path === '/admin/updateClient') {
        return Promise.reject(new Error('update failed'));
      }

      return Promise.reject(new Error(`Unexpected API path: ${path}`));
    });

    render(<EditClient />);

    expect(await screen.findByDisplayValue('Jane')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Update Client' }));

    expect(await screen.findByText('Error: update failed')).toBeInTheDocument();
  });

  it('navigates back when the Back button is clicked', async () => {
    mockApi.mockImplementation((method, path) => {
      if (path === '/admin/getAllHomes') {
        return Promise.resolve({
          statusCode: 200,
          homes: [{ homeID: 4, homeName: 'Sunrise Home' }],
        } as any);
      }

      if (path === '/aba/getAllClientInfo') {
        return Promise.resolve({
          statusCode: 200,
          clientData: [
            {
              clientID: 1,
              fName: 'Jane',
              lName: 'Doe',
              DOB: '2005-01-01',
              homeID: 4,
              intake_Date: '2026-03-01',
              medicaid_id_number: 'MED-123',
              behavior_plan_due_date: '2026-04-30',
              companyID: 1,
            },
          ],
        } as any);
      }

      return Promise.reject(new Error(`Unexpected API path: ${path}`));
    });

    render(<EditClient />);

    expect(await screen.findByDisplayValue('Jane')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));

    expect(mockBack).toHaveBeenCalled();
  });

  it('shows a non-success update response message from the API', async () => {
    mockApi.mockImplementation((method, path) => {
      if (path === '/admin/getAllHomes') {
        return Promise.resolve({
          statusCode: 200,
          homes: [{ homeID: 4, homeName: 'Sunrise Home' }],
        } as any);
      }

      if (path === '/aba/getAllClientInfo') {
        return Promise.resolve({
          statusCode: 200,
          clientData: [
            {
              clientID: 1,
              fName: 'Jane',
              lName: 'Doe',
              DOB: '2005-01-01',
              homeID: 4,
              intake_Date: '2026-03-01',
              medicaid_id_number: 'MED-123',
              behavior_plan_due_date: '2026-04-30',
              companyID: 1,
            },
          ],
        } as any);
      }

      if (path === '/admin/updateClient') {
        return Promise.resolve({
          statusCode: 400,
          serverMessage: 'Unable to update client',
        } as any);
      }

      return Promise.reject(new Error(`Unexpected API path: ${path}`));
    });

    render(<EditClient />);

    expect(await screen.findByDisplayValue('Jane')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Update Client' }));

    expect(await screen.findByText('Error: Unable to update client')).toBeInTheDocument();
  });
});
