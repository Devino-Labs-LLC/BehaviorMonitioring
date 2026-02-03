const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');
const authController = require('../../../controllers/AuthController');
const employeeQueries = require('../../../middleware/helpers/EmployeeQueries');
const Employee = require('../../../models/Employee');
const CompanyData = require('../../../models/CompanyData');
const logAuthEvent = require('../../../middleware/helpers/authLog');

// Mock dependencies
jest.mock('../../../middleware/helpers/EmployeeQueries');
jest.mock('../../../models/Employee');
jest.mock('../../../models/CompanyData');
jest.mock('../../../middleware/helpers/authLog');
jest.mock('bcryptjs');

describe('AuthController - signUpEmployee', () => {
    let app;
    let req;
    let res;

    beforeEach(() => {
        app = express();
        app.use(express.json());
        // Test setup: Rate limiting and CSRF intentionally omitted for testing
        // codeql[js/missing-rate-limiting]
        app.post('/auth/signup', authController.signUpEmployee.bind(authController));

        req = {
            body: {},
            ip: '127.0.0.1',
            headers: { 'user-agent': 'test-agent' }
        };

        res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
        };

        // Clear all mocks
        jest.clearAllMocks();
    });

    describe('Validation', () => {
        it('should return error when required fields are missing', async () => {
            req.body = {
                firstName: 'John',
                lastName: 'Doe'
                // missing other required fields
            };

            await authController.signUpEmployee(req, res);

            expect(res.json).toHaveBeenCalledWith({
                statusCode: 400,
                signupSuccess: false,
                serverMessage: 'All required fields must be filled out'
            });
        });

        it('should return error when passwords do not match', async () => {
            req.body = {
                firstName: 'John',
                lastName: 'Doe',
                username: 'johndoe',
                email: 'john@example.com',
                password: 'Password123',
                confirmPassword: 'Password456',
                companyName: 'Test Company'
            };

            await authController.signUpEmployee(req, res);

            expect(res.json).toHaveBeenCalledWith({
                statusCode: 400,
                signupSuccess: false,
                serverMessage: 'Passwords do not match'
            });
        });

        it('should return error for weak password', async () => {
            req.body = {
                firstName: 'John',
                lastName: 'Doe',
                username: 'johndoe',
                email: 'john@example.com',
                password: 'weak',
                confirmPassword: 'weak',
                companyName: 'Test Company'
            };

            await authController.signUpEmployee(req, res);

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    statusCode: 400,
                    signupSuccess: false,
                    serverMessage: expect.stringContaining('Password must be at least 8 characters')
                })
            );
        });

        it('should return error for invalid email format', async () => {
            req.body = {
                firstName: 'John',
                lastName: 'Doe',
                username: 'johndoe',
                email: 'invalid-email',
                password: 'Password123',
                confirmPassword: 'Password123',
                companyName: 'Test Company'
            };

            await authController.signUpEmployee(req, res);

            expect(res.json).toHaveBeenCalledWith({
                statusCode: 400,
                signupSuccess: false,
                serverMessage: 'Invalid email format'
            });
        });
    });

    describe('Duplicate Check', () => {
        beforeEach(() => {
            req.body = {
                firstName: 'John',
                lastName: 'Doe',
                username: 'johndoe',
                email: 'john@example.com',
                password: 'Password123',
                confirmPassword: 'Password123',
                companyName: 'Test Company'
            };
        });

        it('should return error when username already exists', async () => {
            employeeQueries.employeeExistByUsername.mockResolvedValue(true);

            await authController.signUpEmployee(req, res);

            expect(employeeQueries.employeeExistByUsername).toHaveBeenCalledWith('johndoe');
            expect(res.json).toHaveBeenCalledWith({
                statusCode: 409,
                signupSuccess: false,
                serverMessage: 'Username already exists'
            });
        });

        it('should return error when email already exists', async () => {
            employeeQueries.employeeExistByUsername.mockResolvedValue(false);
            Employee.findOne.mockResolvedValue({ email: 'john@example.com' });

            await authController.signUpEmployee(req, res);

            expect(Employee.findOne).toHaveBeenCalledWith({
                where: { email: 'john@example.com' }
            });
            expect(res.json).toHaveBeenCalledWith({
                statusCode: 409,
                signupSuccess: false,
                serverMessage: 'Email already registered'
            });
        });
    });

    describe('Successful Registration', () => {
        beforeEach(() => {
            req.body = {
                firstName: 'John',
                lastName: 'Doe',
                username: 'johndoe',
                email: 'john@example.com',
                phoneNumber: '1234567890',
                password: 'Password123',
                confirmPassword: 'Password123',
                companyName: 'Test Company'
            };

            employeeQueries.employeeExistByUsername.mockResolvedValue(false);
            Employee.findOne.mockResolvedValue(null);
            CompanyData.findOne.mockResolvedValue(null); // No existing company
            CompanyData.create.mockResolvedValue({
                companyDataID: 1,
                companyName: 'Test Company'
            });
            bcrypt.hash.mockResolvedValue('hashed_password');
            Employee.create.mockResolvedValue({
                employeeID: 1,
                username: 'johndoe',
                email: 'john@example.com'
            });
            logAuthEvent.mockResolvedValue(true);
        });

        it('should successfully create a new employee account', async () => {
            await authController.signUpEmployee(req, res);

            expect(bcrypt.hash).toHaveBeenCalledWith('Password123', 10);
            expect(Employee.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    fName: 'John',
                    lName: 'Doe',
                    username: 'johndoe',
                    email: 'john@example.com',
                    phone_number: '1234567890',
                    role: 'admin',
                    password: 'hashed_password',
                    account_status: 'Active',
                    entered_by: 'self-registration',
                    companyName: 'Test Company',
                    email_verified: false
                })
            );
        });

        it('should return success response with user ID', async () => {
            await authController.signUpEmployee(req, res);

            expect(res.json).toHaveBeenCalledWith({
                statusCode: 201,
                signupSuccess: true,
                userId: 1,
                message: 'Registration successful. You have been assigned as company administrator.',
                emailVerificationSent: false,
                isCompanyAdmin: true
            });
        });

        it('should log the signup event', async () => {
            await authController.signUpEmployee(req, res);

            expect(logAuthEvent).toHaveBeenCalledWith('EMPLOYEE_SIGNUP', {
                userId: 1,
                email: 'john@example.com',
                ip: '127.0.0.1',
                userAgent: 'test-agent',
                details: 'New company registered - user assigned as admin'
            });
        });

        it('should handle optional phone number', async () => {
            delete req.body.phoneNumber;

            await authController.signUpEmployee(req, res);

            expect(Employee.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    phone_number: null
                })
            );
        });
    });

    describe('Error Handling', () => {
        beforeEach(() => {
            req.body = {
                firstName: 'John',
                lastName: 'Doe',
                username: 'johndoe',
                email: 'john@example.com',
                password: 'Password123',
                confirmPassword: 'Password123',
                companyName: 'Test Company'
            };
        });

        it('should handle database errors', async () => {
            employeeQueries.employeeExistByUsername.mockRejectedValue(new Error('Database error'));

            await authController.signUpEmployee(req, res);

            expect(res.json).toHaveBeenCalledWith({
                statusCode: 500,
                signupSuccess: false,
                serverMessage: 'A server error occurred',
                errorMessage: 'Database error'
            });
        });

        it('should log error events', async () => {
            const error = new Error('Test error');
            employeeQueries.employeeExistByUsername.mockRejectedValue(error);

            await authController.signUpEmployee(req, res);

            expect(logAuthEvent).toHaveBeenCalledWith('EMPLOYEE_SIGNUP_ERROR', {
                email: 'john@example.com',
                ip: '127.0.0.1',
                userAgent: 'test-agent',
                details: 'Test error'
            });
        });
    });
});
