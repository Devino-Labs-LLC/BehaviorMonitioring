import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AddHome from '../../../src/app/Admin/manageHomes/add/page';
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

describe('AddHome Page Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows validation errors before opening confirmation', async () => {
    render(<AddHome />);

    fireEvent.click(screen.getByRole('button', { name: 'Create Home' }));

    expect(await screen.findByText('Home name is required')).toBeInTheDocument();
    expect(screen.queryByText(/Please confirm the home details/i)).not.toBeInTheDocument();
  });

  it('creates a home after confirmation', async () => {
    mockApi.mockResolvedValueOnce({
      statusCode: 201,
      serverMessage: 'Home created successfully!',
    } as any);

    render(<AddHome />);

    fireEvent.change(screen.getByLabelText('Home Name'), {
      target: { value: 'Sunrise Home' },
    });
    fireEvent.change(screen.getByLabelText('Street Address'), {
      target: { value: '123 Main St' },
    });
    fireEvent.change(screen.getByLabelText('City'), {
      target: { value: 'Albany' },
    });
    fireEvent.change(screen.getByLabelText('State'), {
      target: { value: 'ny' },
    });
    fireEvent.change(screen.getByLabelText('ZIP Code'), {
      target: { value: '12207' },
    });
    fireEvent.change(screen.getByLabelText('Capacity'), {
      target: { value: '8' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create Home' }));

    expect(
      await screen.findByText('Please confirm the home details are correct before creating this home.'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Create Home' })[1]);

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('post', '/admin/addNewHome', {
        name: 'Sunrise Home',
        streetAddress: '123 Main St',
        city: 'Albany',
        state: 'NY',
        zipCode: '12207',
        capacity: 8,
        employeeUsername: 'testadmin',
      });
    });
  });
});
