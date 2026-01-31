import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import SignUpPage from '../../../src/app/SignUp/page';
import { GetLoggedInUserStatus } from '../../../src/function/VerificationCheck';
import { api } from '../../../src/lib/Api';

// Mock dependencies
jest.mock('next/navigation', () => ({
    useRouter: jest.fn(),
}));

jest.mock('../../../src/function/VerificationCheck', () => ({
    GetLoggedInUserStatus: jest.fn(),
}));

jest.mock('../../../src/lib/Api', () => ({
    api: jest.fn(),
}));

jest.mock('../../../src/components/header', () => {
    return function Header() {
        return <div data-testid="header">Header</div>;
    };
});

jest.mock('../../../src/components/footer', () => {
    return function Footer() {
        return <div data-testid="footer">Footer</div>;
    };
});

jest.mock('../../../src/components/loading', () => {
    return function Loading() {
        return <div data-testid="loading">Loading...</div>;
    };
});

describe('SignUp Page Component', () => {
    const mockPush = jest.fn();
    
    beforeEach(() => {
        jest.clearAllMocks();
        (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
        (GetLoggedInUserStatus as jest.Mock).mockReturnValue(false);
    });

    describe('Component Rendering', () => {
        it('should render the signup form with all fields', () => {
            render(<SignUpPage />);

            expect(screen.getByPlaceholderText('First Name')).toBeInTheDocument();
            expect(screen.getByPlaceholderText('Last Name')).toBeInTheDocument();
            expect(screen.getByPlaceholderText('Username')).toBeInTheDocument();
            expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
            expect(screen.getByPlaceholderText('Phone Number (Optional)')).toBeInTheDocument();
            expect(screen.getByPlaceholderText('Company Name')).toBeInTheDocument();
            expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
            expect(screen.getByPlaceholderText('Confirm Password')).toBeInTheDocument();
            expect(screen.getByText('Sign Up')).toBeInTheDocument();
        });

        it('should render header and footer', () => {
            render(<SignUpPage />);

            expect(screen.getByTestId('header')).toBeInTheDocument();
            expect(screen.getByTestId('footer')).toBeInTheDocument();
        });

        it('should render link to login page', () => {
            render(<SignUpPage />);

            expect(screen.getByText(/Already have an account?/i)).toBeInTheDocument();
            expect(screen.getByText('Login here')).toBeInTheDocument();
        });

        it('should redirect to home if user is already logged in', () => {
            (GetLoggedInUserStatus as jest.Mock).mockReturnValue(true);
            
            render(<SignUpPage />);

            expect(mockPush).toHaveBeenCalledWith('/');
        });
    });

    describe('Form Validation', () => {
        it('should show error when required fields are empty', async () => {
            const user = userEvent.setup();
            render(<SignUpPage />);

            const submitButton = screen.getByTestId('signup-submit-button');
            await user.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText('First name is required')).toBeInTheDocument();
            });
        });

        it('should show error for invalid email format', async () => {
            const user = userEvent.setup();
            render(<SignUpPage />);

            await user.type(screen.getByPlaceholderText('First Name'), 'John');
            await user.type(screen.getByPlaceholderText('Last Name'), 'Doe');
            await user.type(screen.getByPlaceholderText('Username'), 'johndoe');
            await user.type(screen.getByPlaceholderText('Email'), 'invalid-email');
            await user.type(screen.getByPlaceholderText('Company Name'), 'Test Company');
            await user.type(screen.getByPlaceholderText('Password'), 'Password123');
            await user.type(screen.getByPlaceholderText('Confirm Password'), 'Password123');

            const submitButton = screen.getByTestId('signup-submit-button'); // Get form button
            await user.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
            });
        });

        it('should show error when passwords do not match', async () => {
            const user = userEvent.setup();
            render(<SignUpPage />);

            await user.type(screen.getByPlaceholderText('First Name'), 'John');
            await user.type(screen.getByPlaceholderText('Last Name'), 'Doe');
            await user.type(screen.getByPlaceholderText('Username'), 'johndoe');
            await user.type(screen.getByPlaceholderText('Email'), 'john@example.com');
            await user.type(screen.getByPlaceholderText('Company Name'), 'Test Company');
            await user.type(screen.getByPlaceholderText('Password'), 'Password123');
            await user.type(screen.getByPlaceholderText('Confirm Password'), 'DifferentPass123');

            const submitButton = screen.getByText('Sign Up');
            await user.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
            });
        });

        it('should show error for weak password', async () => {
            const user = userEvent.setup();
            render(<SignUpPage />);

            await user.type(screen.getByPlaceholderText('First Name'), 'John');
            await user.type(screen.getByPlaceholderText('Last Name'), 'Doe');
            await user.type(screen.getByPlaceholderText('Username'), 'johndoe');
            await user.type(screen.getByPlaceholderText('Email'), 'john@example.com');
            await user.type(screen.getByPlaceholderText('Company Name'), 'Test Company');
            await user.type(screen.getByPlaceholderText('Password'), 'weak');
            await user.type(screen.getByPlaceholderText('Confirm Password'), 'weak');

            const submitButton = screen.getByText('Sign Up');
            await user.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText(/Password must be at least 8 characters/i)).toBeInTheDocument();
            });
        });

        it('should show error for invalid username format', async () => {
            const user = userEvent.setup();
            render(<SignUpPage />);

            await user.type(screen.getByPlaceholderText('First Name'), 'John');
            await user.type(screen.getByPlaceholderText('Last Name'), 'Doe');
            await user.type(screen.getByPlaceholderText('Username'), 'jo');
            await user.type(screen.getByPlaceholderText('Email'), 'john@example.com');
            await user.type(screen.getByPlaceholderText('Company Name'), 'Test Company');
            await user.type(screen.getByPlaceholderText('Password'), 'Password123');
            await user.type(screen.getByPlaceholderText('Confirm Password'), 'Password123');

            const submitButton = screen.getByTestId('signup-submit-button'); // Get form button
            await user.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText(/Username must be 3-20 characters/i)).toBeInTheDocument();
            });
        });
    });

    describe('Form Submission', () => {
        const fillValidForm = async (user: ReturnType<typeof userEvent.setup>) => {
            await user.type(screen.getByPlaceholderText('First Name'), 'John');
            await user.type(screen.getByPlaceholderText('Last Name'), 'Doe');
            await user.type(screen.getByPlaceholderText('Username'), 'johndoe');
            await user.type(screen.getByPlaceholderText('Email'), 'john@example.com');
            await user.type(screen.getByPlaceholderText('Phone Number (Optional)'), '1234567890');
            await user.type(screen.getByPlaceholderText('Company Name'), 'Test Company');
            await user.type(screen.getByPlaceholderText('Password'), 'Password123');
            await user.type(screen.getByPlaceholderText('Confirm Password'), 'Password123');
        };

        it('should show loading state during submission', async () => {
            const user = userEvent.setup();
            (api as jest.Mock).mockImplementation(() => new Promise(() => {})); // Never resolves
            
            render(<SignUpPage />);
            await fillValidForm(user);

            const submitButton = screen.getByText('Sign Up');
            await user.click(submitButton);

            await waitFor(() => {
                expect(screen.getByTestId('loading')).toBeInTheDocument();
            });
        });

        it('should successfully submit valid form', async () => {
            const user = userEvent.setup();
            (api as jest.Mock).mockResolvedValue({
                statusCode: 201,
                signupSuccess: true,
                userId: 1,
                message: 'Registration successful. Your account is pending admin approval.',
                emailVerificationSent: false
            });

            render(<SignUpPage />);
            await fillValidForm(user);

            const submitButton = screen.getByText('Sign Up');
            await user.click(submitButton);

            await waitFor(() => {
                expect(api).toHaveBeenCalledWith('post', '/auth/signup', {
                    firstName: 'John',
                    lastName: 'Doe',
                    username: 'johndoe',
                    email: 'john@example.com',
                    phoneNumber: '1234567890',
                    password: 'Password123',
                    confirmPassword: 'Password123',
                    companyName: 'Test Company'
                });
            });

            await waitFor(() => {
                expect(screen.getByText('Registration Successful!')).toBeInTheDocument();
            });
        });

        it('should display success message after successful registration', async () => {
            const user = userEvent.setup();
            (api as jest.Mock).mockResolvedValue({
                statusCode: 201,
                signupSuccess: true,
                userId: 1,
                message: 'Registration successful. Your account is pending admin approval.',
                emailVerificationSent: false
            });

            render(<SignUpPage />);
            await fillValidForm(user);

            const submitButton = screen.getByText('Sign Up');
            await user.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText(/pending admin approval/i)).toBeInTheDocument();
                expect(screen.getByText('Go to Login')).toBeInTheDocument();
            });
        });

        it('should handle server errors gracefully', async () => {
            const user = userEvent.setup();
            (api as jest.Mock).mockResolvedValue({
                statusCode: 500,
                signupSuccess: false,
                serverMessage: 'A server error occurred'
            });

            render(<SignUpPage />);
            await fillValidForm(user);

            const submitButton = screen.getByText('Sign Up');
            await user.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText(/server error/i)).toBeInTheDocument();
            });
        });

        it('should handle duplicate username error', async () => {
            const user = userEvent.setup();
            (api as jest.Mock).mockResolvedValue({
                statusCode: 409,
                signupSuccess: false,
                serverMessage: 'Username already exists'
            });

            render(<SignUpPage />);
            await fillValidForm(user);

            const submitButton = screen.getByText('Sign Up');
            await user.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText('Username already exists')).toBeInTheDocument();
            });
        });
    });

    describe('User Interactions', () => {
        it('should update form fields on user input', async () => {
            const user = userEvent.setup();
            render(<SignUpPage />);

            const firstNameInput = screen.getByPlaceholderText('First Name') as HTMLInputElement;
            await user.type(firstNameInput, 'John');

            expect(firstNameInput.value).toBe('John');
        });

        it('should handle form submission on Enter key press', async () => {
            const user = userEvent.setup();
            (api as jest.Mock).mockResolvedValue({
                statusCode: 201,
                signupSuccess: true,
                userId: 1,
                message: 'Registration successful',
                emailVerificationSent: false
            });

            render(<SignUpPage />);
            
            await user.type(screen.getByPlaceholderText('First Name'), 'John');
            await user.type(screen.getByPlaceholderText('Last Name'), 'Doe');
            await user.type(screen.getByPlaceholderText('Username'), 'johndoe');
            await user.type(screen.getByPlaceholderText('Email'), 'john@example.com');
            await user.type(screen.getByPlaceholderText('Company Name'), 'Test Company');
            await user.type(screen.getByPlaceholderText('Password'), 'Password123');
            await user.type(screen.getByPlaceholderText('Confirm Password'), 'Password123{Enter}');

            await waitFor(() => {
                expect(api).toHaveBeenCalled();
            });
        });
    });
});
