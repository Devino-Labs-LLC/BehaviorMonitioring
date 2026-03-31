import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AddClient from '../../../src/app/Admin/manageClients/add/page';
import { api } from '../../../src/lib/Api';

const mockPush = jest.fn();
const mockBack = jest.fn();
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
    <option value="">{props.placeholderOption || 'Select an option'}</option>
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
jest.mock('../../../src/components/ConfirmActionModal', () => (props: any) =>
  props.isVisible ? (
    <div>
      <div>{props.message}</div>
      <button type="button" onClick={props.onConfirm}>
        {props.confirmLabel}
      </button>
      <button type="button" onClick={props.onCancel}>
        {props.cancelLabel}
      </button>
    </div>
  ) : null,
);

const mockApi = api as jest.MockedFunction<typeof api>;

describe('AddClient Page Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads homes for the current admin', async () => {
    mockApi.mockImplementation((method, path) => {
      if (path === '/admin/getAllHomes') {
        return Promise.resolve({
          statusCode: 200,
          homes: [{ homeID: 4, homeName: 'Sunrise Home' }],
        } as any);
      }

      return Promise.reject(new Error(`Unexpected API path: ${path}`));
    });

    render(<AddClient />);

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('post', '/admin/getAllHomes', {
        employeeUsername: 'testadmin',
      });
    });

    expect(await screen.findByRole('option', { name: 'Sunrise Home' })).toBeInTheDocument();
  });

  it('shows validation errors before opening confirmation', async () => {
    mockApi.mockImplementation((method, path) => {
      if (path === '/admin/getAllHomes') {
        return Promise.resolve({
          statusCode: 200,
          homes: [{ homeID: 4, homeName: 'Sunrise Home' }],
        } as any);
      }

      return Promise.reject(new Error(`Unexpected API path: ${path}`));
    });

    render(<AddClient />);

    await screen.findByRole('option', { name: 'Sunrise Home' });
    fireEvent.click(screen.getByRole('button', { name: 'Create Client' }));

    expect(await screen.findByText('First name is required')).toBeInTheDocument();
    expect(screen.queryByText(/Please confirm the client details/i)).not.toBeInTheDocument();
  });

  it('creates a client after confirmation', async () => {
    mockApi.mockImplementation((method, path) => {
      if (path === '/admin/getAllHomes') {
        return Promise.resolve({
          statusCode: 200,
          homes: [{ homeID: 4, homeName: 'Sunrise Home' }],
        } as any);
      }

      if (path === '/admin/createClient') {
        return Promise.resolve({
          statusCode: 201,
          serverMessage: 'Client created successfully!',
        } as any);
      }

      return Promise.reject(new Error(`Unexpected API path: ${path}`));
    });

    render(<AddClient />);

    await screen.findByRole('option', { name: 'Sunrise Home' });

    fireEvent.change(screen.getByLabelText('First Name'), { target: { value: 'Jane' } });
    fireEvent.change(screen.getByLabelText('Last Name'), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByLabelText('Date of Birth'), { target: { value: '2005-01-01' } });
    fireEvent.change(screen.getByLabelText('Home'), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText('Intake Date'), { target: { value: '2026-03-31' } });
    fireEvent.change(screen.getByLabelText('Medicaid ID Number'), { target: { value: 'MED-123' } });
    fireEvent.change(screen.getByLabelText('Behavior Plan Due Date'), {
      target: { value: '2026-04-30' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create Client' }));

    expect(
      await screen.findByText(
        'Please confirm the client details are correct before creating this client record.',
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Create Client' })[1]);

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('post', '/admin/createClient', {
        fName: 'Jane',
        lName: 'Doe',
        DOB: '2005-01-01',
        intakeDate: '2026-03-31',
        groupHomeName: 'Sunrise Home',
        medicaidIdNumber: 'MED-123',
        behaviorPlanDueDate: '2026-04-30',
        employeeUsername: 'testadmin',
      });
    });
  });
});
