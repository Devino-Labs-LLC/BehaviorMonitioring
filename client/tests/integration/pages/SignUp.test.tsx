import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import SignUpPage from '../../../src/app/SignUp/page';

// Mock the API module
const mockApi = jest.fn();
jest.mock('../../../src/lib/Api', () => ({
    api: (...args: any[]) => mockApi(...args),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
    useRouter: jest.fn(),
}));

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => {
            store[key] = value.toString();
        },
        removeItem: (key: string) => {
            delete store[key];
        },
        clear: () => {
            store = {};
        },
    };
})();

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
});

describe('SignUp Page Integration Tests', () => {
    const mockPush = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        localStorageMock.clear();
        (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
        mockApi.mockClear();
    });

    describe('End-to-End Registration Flow', () => {
        it('should complete full registration flow successfully', async () => {
            const user = userEvent.setup();
            
            // Mock successful API response
            mockApi.mockResolvedValueOnce({
                statusCode: 201,
                signupSuccess: true,
                userId: 123,
                message: 'Registration successful. Your account is pending admin approval.',
                emailVerificationSent: false
            });

            render(<SignUpPage />);

            // Fill out the form
            await user.type(screen.getByPlaceholderText('First Name'), 'Jane');
            await user.type(screen.getByPlaceholderText('Last Name'), 'Smith');
            await user.type(screen.getByPlaceholderText('Username'), 'janesmith123');
            await user.type(screen.getByPlaceholderText('Email'), 'jane.smith@company.com');
            await user.type(screen.getByPlaceholderText('Phone Number (Optional)'), '5559876543');
            await user.type(screen.getByPlaceholderText('Company Name'), 'Smith Industries');
            await user.type(screen.getByPlaceholderText('Password'), 'SecurePass123');
            await user.type(screen.getByPlaceholderText('Confirm Password'), 'SecurePass123');

            // Submit the form
            const submitButton = screen.getByTestId('signup-submit-button');
            await user.click(submitButton);

            // Wait for API call
            await waitFor(() => {
                expect(mockApi).toHaveBeenCalledTimes(1);
            });

            // Verify success screen is shown
            await waitFor(() => {
                expect(screen.getByText('Registration Successful!')).toBeInTheDocument();
                expect(screen.getByText(/pending admin approval/i)).toBeInTheDocument();
                expect(screen.getByText('Go to Login')).toBeInTheDocument();
            });
        });

        it('should handle validation errors before API call', async () => {
            const user = userEvent.setup();
            render(<SignUpPage />);

            // Try to submit with invalid data (missing required fields)
            await user.type(screen.getByPlaceholderText('First Name'), 'John');
            await user.type(screen.getByPlaceholderText('Password'), 'weak');
            await user.type(screen.getByPlaceholderText('Confirm Password'), 'weak');

            const submitButton = screen.getByTestId('signup-submit-button');
            await user.click(submitButton);

            // Should not make API call due to validation
            await waitFor(() => {
                expect(mockApi).not.toHaveBeenCalled();
            });

            // Should show validation error (Last name is required comes before password validation)
            await waitFor(() => {
                expect(screen.queryByText('Last name is required')).toBeInTheDocument();
            });
        });

        it('should handle username already exists error', async () => {
            const user = userEvent.setup();
            
            mockApi.mockResolvedValueOnce({
                statusCode: 409,
                signupSuccess: false,
                serverMessage: 'Username already exists'
            });

            render(<SignUpPage />);

            // Fill valid form
            await user.type(screen.getByPlaceholderText('First Name'), 'John');
            await user.type(screen.getByPlaceholderText('Last Name'), 'Doe');
            await user.type(screen.getByPlaceholderText('Username'), 'existinguser');
            await user.type(screen.getByPlaceholderText('Email'), 'john@example.com');
            await user.type(screen.getByPlaceholderText('Company Name'), 'Test Co');
            await user.type(screen.getByPlaceholderText('Password'), 'Password123');
            await user.type(screen.getByPlaceholderText('Confirm Password'), 'Password123');

            const submitButton = screen.getByTestId('signup-submit-button'); // Get form button
            await user.click(submitButton);

            // Wait for error message
            await waitFor(() => {
                expect(screen.getByText('Username already exists')).toBeInTheDocument();
            });

            // Form should still be visible (not success screen)
            expect(screen.getByPlaceholderText('Username')).toBeInTheDocument();
        });

        it('should handle email already exists error', async () => {
            const user = userEvent.setup();
            
            mockApi.mockResolvedValueOnce({
                statusCode: 409,
                signupSuccess: false,
                serverMessage: 'Email already registered'
            });

            render(<SignUpPage />);

            await user.type(screen.getByPlaceholderText('First Name'), 'John');
            await user.type(screen.getByPlaceholderText('Last Name'), 'Doe');
            await user.type(screen.getByPlaceholderText('Username'), 'newuser');
            await user.type(screen.getByPlaceholderText('Email'), 'existing@example.com');
            await user.type(screen.getByPlaceholderText('Company Name'), 'Test Co');
            await user.type(screen.getByPlaceholderText('Password'), 'Password123');
            await user.type(screen.getByPlaceholderText('Confirm Password'), 'Password123');

            const submitButton = screen.getByTestId('signup-submit-button');
            await user.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText('Email already registered')).toBeInTheDocument();
            });
        });

        it('should handle network errors gracefully', async () => {
            const user = userEvent.setup();
            
            mockApi.mockRejectedValueOnce(new Error('Network error'));

            render(<SignUpPage />);

            await user.type(screen.getByPlaceholderText('First Name'), 'John');
            await user.type(screen.getByPlaceholderText('Last Name'), 'Doe');
            await user.type(screen.getByPlaceholderText('Username'), 'johndoe');
            await user.type(screen.getByPlaceholderText('Email'), 'john@example.com');
            await user.type(screen.getByPlaceholderText('Company Name'), 'Test Co');
            await user.type(screen.getByPlaceholderText('Password'), 'Password123');
            await user.type(screen.getByPlaceholderText('Confirm Password'), 'Password123');

            const submitButton = screen.getByTestId('signup-submit-button'); // Get form button
            await user.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText(/Network error/i)).toBeInTheDocument();
            });
        });
    });

    describe('Form Validation Integration', () => {
        it('should validate all fields before submission', async () => {
            const user = userEvent.setup();
            render(<SignUpPage />);

            const submitButton = screen.getByTestId('signup-submit-button');
            await user.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText('First name is required')).toBeInTheDocument();
            });

            expect(mockApi).not.toHaveBeenCalled();
        });

        it('should clear error message when user corrects input', async () => {
            const user = userEvent.setup();
            render(<SignUpPage />);

            // Submit empty form to trigger error
            const submitButton = screen.getByTestId('signup-submit-button');
            await user.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText('First name is required')).toBeInTheDocument();
            });

            // Start filling form
            await user.type(screen.getByPlaceholderText('First Name'), 'John');
            await user.type(screen.getByPlaceholderText('Last Name'), 'Doe');
            
            // Try again - should show different error
            await user.click(submitButton);

            await waitFor(() => {
                expect(screen.queryByText('First name is required')).not.toBeInTheDocument();
            });
        });
    });

    describe('Navigation Integration', () => {
        it('should navigate to login page when clicking login link', async () => {
            const user = userEvent.setup();
            render(<SignUpPage />);

            const loginLink = screen.getByText('Login here');
            expect(loginLink.closest('a')).toHaveAttribute('href', '/Login');
        });

        it('should show link to login page on success screen', async () => {
            const user = userEvent.setup();
            
            mockApi.mockResolvedValueOnce({
                statusCode: 201,
                signupSuccess: true,
                userId: 1,
                message: 'Registration successful',
                emailVerificationSent: false
            });

            render(<SignUpPage />);

            // Fill and submit form
            await user.type(screen.getByPlaceholderText('First Name'), 'John');
            await user.type(screen.getByPlaceholderText('Last Name'), 'Doe');
            await user.type(screen.getByPlaceholderText('Username'), 'johndoe');
            await user.type(screen.getByPlaceholderText('Email'), 'john@example.com');
            await user.type(screen.getByPlaceholderText('Company Name'), 'Test Co');
            await user.type(screen.getByPlaceholderText('Password'), 'Password123');
            await user.type(screen.getByPlaceholderText('Confirm Password'), 'Password123');

            await user.click(screen.getByTestId('signup-submit-button')); // Get form button

            await waitFor(() => {
                const loginButton = screen.getByText('Go to Login');
                expect(loginButton.closest('a')).toHaveAttribute('href', '/Login');
            });
        });
    });

    describe('Loading State Integration', () => {
        it('should show loading indicator during API call', async () => {
            const user = userEvent.setup();
            
            // Mock delayed response
            mockApi.mockImplementationOnce(
                () => new Promise(resolve => setTimeout(() => resolve({
                    statusCode: 201,
                    signupSuccess: true,
                    userId: 1,
                    message: 'Success',
                    emailVerificationSent: false
                }), 100))
            );

            render(<SignUpPage />);

            await user.type(screen.getByPlaceholderText('First Name'), 'John');
            await user.type(screen.getByPlaceholderText('Last Name'), 'Doe');
            await user.type(screen.getByPlaceholderText('Username'), 'johndoe');
            await user.type(screen.getByPlaceholderText('Email'), 'john@example.com');
            await user.type(screen.getByPlaceholderText('Company Name'), 'Test Co');
            await user.type(screen.getByPlaceholderText('Password'), 'Password123');
            await user.type(screen.getByPlaceholderText('Confirm Password'), 'Password123');

            await user.click(screen.getByTestId('signup-submit-button')); // Get form button

            // Should show loading state
            await waitFor(() => {
                expect(screen.queryByPlaceholderText('First Name')).not.toBeInTheDocument();
            });

            // Eventually shows success
            await waitFor(() => {
                expect(screen.getByText('Registration Successful!')).toBeInTheDocument();
            }, { timeout: 2000 });
        });

        it('should disable form during submission', async () => {
            const user = userEvent.setup();
            
            mockApi.mockImplementationOnce(
                () => new Promise(resolve => setTimeout(() => resolve({
                    statusCode: 201,
                    signupSuccess: true,
                    userId: 1
                }), 100))
            );

            render(<SignUpPage />);

            await user.type(screen.getByPlaceholderText('First Name'), 'John');
            await user.type(screen.getByPlaceholderText('Last Name'), 'Doe');
            await user.type(screen.getByPlaceholderText('Username'), 'johndoe');
            await user.type(screen.getByPlaceholderText('Email'), 'john@example.com');
            await user.type(screen.getByPlaceholderText('Company Name'), 'Test Co');
            await user.type(screen.getByPlaceholderText('Password'), 'Password123');
            await user.type(screen.getByPlaceholderText('Confirm Password'), 'Password123');

            await user.click(screen.getByTestId('signup-submit-button')); // Get form button

            // Form should be hidden (replaced with loading)
            await waitFor(() => {
                expect(screen.queryByPlaceholderText('Email')).not.toBeInTheDocument();
            });
        });
    });
});
