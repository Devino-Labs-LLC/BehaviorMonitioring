import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddAdmin from '../../../src/app/Admin/manageAdmins/add/page';
import { api } from '../../../src/lib/Api';

jest.mock('../../../src/lib/Api');
const mockUseAuth = jest.fn();
jest.mock('../../../src/function/VerificationCheck', () => ({
  GetLoggedInUserStatus: () => true,
  GetAdminStatus: () => true,
  GetLoggedInUser: () => 'testuser',
}));
jest.mock('../../../src/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockApi = api as jest.MockedFunction<typeof api>;
const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
  }),
}));

describe('AddAdmin Page Integration', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.useRealTimers();
    mockUseAuth.mockReturnValue({
      isReady: true,
      isLoggedIn: true,
      isAdmin: true,
      username: 'testuser',
    });
  });

  it('redirects logged-out users to login', async () => {
    mockUseAuth.mockReturnValue({
      isReady: true,
      isLoggedIn: false,
      isAdmin: false,
      username: '',
    });

    render(<AddAdmin />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/Login?previousUrl='));
    });
  });

  it('redirects non-admin users to the home page', async () => {
    mockUseAuth.mockReturnValue({
      isReady: true,
      isLoggedIn: true,
      isAdmin: false,
      username: 'testuser',
    });

    render(<AddAdmin />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  it('validates required fields before submission', async () => {
    render(<AddAdmin />);
    const user = userEvent.setup();

    const submitButton = screen.getByText('Create Admin');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
    });
  });

  it('validates email format', async () => {
    render(<AddAdmin />);
    const user = userEvent.setup();

    const firstNameInput = screen.getByPlaceholderText('First Name');
    const lastNameInput = screen.getByPlaceholderText('Last Name');
    const emailInput = screen.getByPlaceholderText('Email Address');

    await user.type(firstNameInput, 'John');
    await user.type(lastNameInput, 'Doe');
    await user.type(emailInput, 'invalid-email');

    const submitButton = screen.getByText('Create Admin');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
    });
  });

  it('successfully creates admin with valid data', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    mockApi.mockResolvedValueOnce({
      statusCode: 201,
      employeeID: 1,
      serverMessage: 'Admin created successfully',
    } as any);

    render(<AddAdmin />);

    await user.type(screen.getByPlaceholderText('First Name'), 'John');
    await user.type(screen.getByPlaceholderText('Last Name'), 'Doe');
    await user.type(screen.getByPlaceholderText('Email Address'), 'john@example.com');

    const submitButton = screen.getByText('Create Admin');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('post', '/admin/addNewEmployee', expect.objectContaining({
        fName: 'John',
        lName: 'Doe',
        email: 'john@example.com',
      }));
    });

    expect(
      await screen.findByText(/admin created successfully! a verification email will be sent/i),
    ).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(mockPush).toHaveBeenCalledWith('/Admin/manageAdmins');
  });

  it('surfaces API failures after submit', async () => {
    mockApi.mockRejectedValueOnce(new Error('create admin failed'));

    render(<AddAdmin />);
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText('First Name'), 'John');
    await user.type(screen.getByPlaceholderText('Last Name'), 'Doe');
    await user.type(screen.getByPlaceholderText('Email Address'), 'john@example.com');
    await user.click(screen.getByText('Create Admin'));

    expect(await screen.findByText('Error: create admin failed')).toBeInTheDocument();
  });

  it('supports the toolbar back action', async () => {
    render(<AddAdmin />);
    const user = userEvent.setup();

    await user.click(screen.getByText('Back'));

    expect(mockBack).toHaveBeenCalled();
  });
});
