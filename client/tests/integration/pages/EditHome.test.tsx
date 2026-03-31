import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import EditHome from '../../../src/app/Admin/manageHomes/edit/page';
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
const mockSearchParams = {
  get: mockSearchParamGet,
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
jest.mock('../../../src/components/Checkbox', () => (props: any) => (
  <input
    aria-label={props.label}
    type="checkbox"
    checked={props.isChecked}
    onChange={props.onChange}
  />
));

const mockApi = api as jest.MockedFunction<typeof api>;

describe('EditHome Page Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParamGet.mockReturnValue('1');
  });

  it('redirects back to the list when no home ID is provided', async () => {
    mockSearchParamGet.mockReturnValue(null);

    render(<EditHome />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/Admin/manageHomes');
    });
  });

  it('loads home details and updates the selected home', async () => {
    mockApi
      .mockResolvedValueOnce({
        statusCode: 200,
        homes: [
          {
            homeID: 1,
            homeName: 'Sunrise Home',
            address: '123 Main St',
            city: 'Albany',
            state: 'NY',
            zip: '12207',
            capacity: 8,
            isActive: true,
          },
        ],
      } as any)
      .mockResolvedValueOnce({
        statusCode: 201,
        serverMessage: 'Home updated successfully!',
      } as any);

    render(<EditHome />);

    const updateButton = await screen.findByRole('button', { name: 'Update Home' });
    expect(await screen.findByDisplayValue('Sunrise Home')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Home Name'), {
      target: { value: 'Sunset Home' },
    });
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('post', '/admin/updateAHome', {
        homeID: 1,
        name: 'Sunset Home',
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
