import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import BehaviorAddPage from '../../../src/app/Behavior/Add/page';
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
  <button type={props.btnType || 'button'} onClick={props.onClick} disabled={props.isLoading}>
    {props.placeholder}
  </button>
));
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
jest.mock('../../../src/components/Inputfield', () => (props: any) => (
  <input
    aria-label={props.name}
    name={props.name}
    type={props.type}
    value={props.value}
    onChange={props.onChange}
  />
));
jest.mock('../../../src/components/TextareaInput', () => (props: any) => (
  <textarea
    aria-label={props.name}
    name={props.name}
    value={props.value}
    onChange={props.onChange}
  />
));
jest.mock('../../../src/components/NoClientsPrompt', () => (props: any) =>
  props.isVisible ? <div>No clients prompt</div> : null,
);

const mockApi = api as jest.MockedFunction<typeof api>;

describe('Behavior Add Page Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetLoggedInUserStatus.mockReturnValue(true);
    mockGetLoggedInUser.mockReturnValue('testuser');
  });

  it('loads clients and selects the first client on mount', async () => {
    mockApi.mockResolvedValueOnce({
      statusCode: 200,
      clientData: [
        { clientID: 1, fName: 'John', lName: 'Doe' },
        { clientID: 2, fName: 'Jane', lName: 'Smith' },
      ],
    } as any);

    render(<BehaviorAddPage />);

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('post', '/aba/getAllClientInfo', {
        employeeUsername: 'testuser',
      });
    });

    expect(screen.getByRole('option', { name: 'John Doe' })).toBeInTheDocument();
    expect(screen.getByLabelText('ClientName')).toHaveValue('1');
  });

  it('shows the no-clients prompt when the API returns no clients', async () => {
    mockApi.mockResolvedValueOnce({
      statusCode: 200,
      clientData: [],
    } as any);

    render(<BehaviorAddPage />);

    expect(await screen.findByText('No clients prompt')).toBeInTheDocument();
  });

  it('adds a behavior and submits it successfully', async () => {
    mockApi
      .mockResolvedValueOnce({
        statusCode: 200,
        clientData: [{ clientID: 1, fName: 'John', lName: 'Doe' }],
      } as any)
      .mockResolvedValueOnce({
        statusCode: 204,
        serverMessage: 'Behavior added successfully!',
      } as any);

    render(<BehaviorAddPage />);

    await screen.findByRole('option', { name: 'John Doe' });

    fireEvent.change(screen.getByLabelText('behaviorNameField'), {
      target: { value: 'Aggression' },
    });
    fireEvent.change(screen.getByLabelText('behaviorCategoryDropdown'), {
      target: { value: 'Other' },
    });
    fireEvent.change(screen.getByLabelText('behaviorCategoryField'), {
      target: { value: 'Custom Category' },
    });
    fireEvent.change(screen.getByLabelText('definitionTextField'), {
      target: { value: 'Aggressive behavior toward peers.' },
    });
    fireEvent.change(screen.getByLabelText('behaviorMeasurementDropdown'), {
      target: { value: 'Frequency' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(await screen.findByRole('heading', { name: 'Aggression' })).toBeInTheDocument();
    expect(screen.getByText((text) => text.includes('Custom Category'))).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('post', '/aba/addNewTargetBehavior', {
        employeeUsername: 'testuser',
        behaviors: [
          {
            clientName: 'John Doe',
            clientID: 1,
            behaviorName: 'Aggression',
            behaviorCategory: 'Custom Category',
            behaviorDefinition: 'Aggressive behavior toward peers.',
            behaviorMeasurement: 'Frequency',
            type: 'Behavior',
          },
        ],
      });
    });

    expect(await screen.findByText('Behavior added successfully!')).toBeInTheDocument();
  });

  it('redirects unauthenticated users to login', async () => {
    mockGetLoggedInUserStatus.mockReturnValue(false);
    mockApi.mockResolvedValueOnce({
      statusCode: 401,
      serverMessage: 'Unauthorized user',
    } as any);

    render(<BehaviorAddPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/Login?previousUrl='));
    });
  });
});
