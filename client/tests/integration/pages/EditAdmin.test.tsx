import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import EditAdmin from '../../../src/app/Admin/manageAdmins/edit/page';
import { api } from '../../../src/lib/Api';

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockSearchParamGet = jest.fn();
const mockRouter = {
  push: mockPush,
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: mockBack,
};

jest.mock('../../../src/lib/Api', () => ({
  api: jest.fn(),
}));
jest.mock('../../../src/hooks/useAuth', () => ({
  useAuth: () => ({
    isReady: true,
    isLoggedIn: true,
    isAdmin: true,
    username: 'testadmin',
  }),
}));
jest.mock('../../../src/function/VerificationCheck', () => ({
  GetLoggedInUser: () => 'testadmin',
}));
jest.mock('../../../src/function/debounce', () => ({
  debounceAsync: (fn: (...args: any[]) => unknown) => (...args: any[]) => fn(...args),
}));
jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  useSearchParams: () => ({
    get: mockSearchParamGet,
  }),
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
jest.mock('../../../src/components/Checkbox', () => (props: any) => (
  <input
    aria-label={props.label}
    type="checkbox"
    checked={props.isChecked}
    onChange={props.onChange}
  />
));

const mockApi = api as jest.MockedFunction<typeof api>;

describe('EditAdmin Page Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParamGet.mockReturnValue('7');
  });

  it('redirects back to the admin list when no admin id is provided', async () => {
    mockSearchParamGet.mockReturnValue(null);

    render(<EditAdmin />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/Admin/manageAdmins');
    });
  });

  it('loads the selected admin details into the form', async () => {
    mockApi.mockImplementation((method, path) => {
      if (path === '/admin/getAllAdmins') {
        return Promise.resolve({
          statusCode: 200,
          admins: [
            {
              adminID: 7,
              firstName: 'Jane',
              lastName: 'Doe',
              email: 'jane@example.com',
              phone: '5551234567',
              role: 'manager',
              isActive: true,
            },
          ],
        } as any);
      }

      return Promise.reject(new Error(`Unexpected API path: ${path}`));
    });

    render(<EditAdmin />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
    });
    expect(await screen.findByDisplayValue('Jane')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Doe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('jane@example.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('5551234567')).toBeInTheDocument();
  });

  it('updates the admin and account status', async () => {
    mockApi.mockImplementation((method, path) => {
      if (path === '/admin/getAllAdmins') {
        return Promise.resolve({
          statusCode: 200,
          admins: [
            {
              adminID: 7,
              firstName: 'Jane',
              lastName: 'Doe',
              email: 'jane@example.com',
              phone: '5551234567',
              role: 'manager',
              isActive: true,
            },
          ],
        } as any);
      }

      if (path === '/admin/updateAnEmployeeDetail') {
        return Promise.resolve({
          statusCode: 201,
          serverMessage: 'Admin updated',
        } as any);
      }

      if (path === '/admin/updateAnEmployeeAccountStatus') {
        return Promise.resolve({
          statusCode: 201,
          serverMessage: 'Status updated',
        } as any);
      }

      return Promise.reject(new Error(`Unexpected API path: ${path}`));
    });

    render(<EditAdmin />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
    });
    await screen.findByDisplayValue('Jane');

    fireEvent.change(screen.getByLabelText('First Name'), {
      target: { value: 'Janet' },
    });
    fireEvent.click(screen.getByLabelText('Active Status'));
    fireEvent.click(screen.getByRole('button', { name: 'Update Admin' }));

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('post', '/admin/updateAnEmployeeDetail', {
        employeeID: 7,
        fName: 'Janet',
        lName: 'Doe',
        email: 'jane@example.com',
        pNumber: '5551234567',
        role: 'manager',
        employeeUsername: 'testadmin',
      });
    });

    expect(mockApi).toHaveBeenCalledWith('post', '/admin/updateAnEmployeeAccountStatus', {
      employeeID: 7,
      accountStatus: 'Inactive',
      employeeUsername: 'testadmin',
    });
  });
});
