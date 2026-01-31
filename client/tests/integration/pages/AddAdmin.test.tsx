import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddAdmin from '../../../src/app/Admin/manageAdmins/add/page';
import { api } from '../../../src/lib/Api';

jest.mock('../../../src/lib/Api');
jest.mock('../../../src/function/VerificationCheck', () => ({
  GetLoggedInUserStatus: () => true,
  GetAdminStatus: () => true,
  GetLoggedInUser: () => 'testuser',
}));

const mockApi = api as jest.MockedFunction<typeof api>;
const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: jest.fn(),
  }),
}));

describe('AddAdmin Page Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    mockApi.mockResolvedValueOnce({
      statusCode: 200,
      employeeID: 1,
      serverMessage: 'Admin created successfully',
    } as any);

    render(<AddAdmin />);
    const user = userEvent.setup();

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
  });
});
