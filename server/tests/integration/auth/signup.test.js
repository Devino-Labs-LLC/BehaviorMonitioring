const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const authRouter = require('../../../routes/Auth');
const Employee = require('../../../models/Employee');
const bcrypt = require('bcryptjs');

// Mock the models module
jest.mock('../../../models/Employee');
jest.mock('../../../middleware/helpers/EmployeeQueries');
jest.mock('../../../middleware/helpers/authLog');

describe('SignUp API Integration Tests', () => {
    let app;

    beforeAll(() => {
        app = express();
        app.use(express.json());
        app.use(cookieParser());
        app.use('/auth', authRouter);
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /auth/signup', () => {
        const validSignupData = {
            firstName: 'John',
            lastName: 'Doe',
            username: 'johndoe',
            email: 'john.doe@example.com',
            phoneNumber: '5551234567',
            password: 'SecurePass123',
            confirmPassword: 'SecurePass123',
            companyName: 'Acme Corporation'
        };

        it('should successfully register a new user with valid data', async () => {
            const employeeQueries = require('../../../middleware/helpers/EmployeeQueries');
            const logAuthEvent = require('../../../middleware/helpers/authLog');
            
            employeeQueries.employeeExistByUsername = jest.fn().mockResolvedValue(false);
            Employee.findOne = jest.fn().mockResolvedValue(null);
            Employee.create = jest.fn().mockResolvedValue({
                employeeID: 1,
                username: 'johndoe',
                email: 'john.doe@example.com',
                fName: 'John',
                lName: 'Doe'
            });
            logAuthEvent.mockResolvedValue(true);

            const response = await request(app)
                .post('/auth/signup')
                .send(validSignupData)
                .expect('Content-Type', /json/);

            expect(response.status).toBe(200);
            expect(response.body).toMatchObject({
                statusCode: 201,
                signupSuccess: true,
                userId: 1,
                message: expect.stringContaining('pending admin approval')
            });

            expect(Employee.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    fName: 'John',
                    lName: 'Doe',
                    username: 'johndoe',
                    email: 'john.doe@example.com',
                    phone_number: '5551234567',
                    role: 'employee',
                    account_status: 'Pending',
                    companyName: 'Acme Corporation'
                })
            );
        });

        it('should reject signup with missing required fields', async () => {
            const incompleteData = {
                firstName: 'John',
                email: 'john@example.com'
                // missing other required fields
            };

            const response = await request(app)
                .post('/auth/signup')
                .send(incompleteData)
                .expect('Content-Type', /json/);

            expect(response.status).toBe(200);
            expect(response.body).toMatchObject({
                statusCode: 400,
                signupSuccess: false,
                serverMessage: 'All required fields must be filled out'
            });
        });

        it('should reject signup when passwords do not match', async () => {
            const mismatchedPasswords = {
                ...validSignupData,
                confirmPassword: 'DifferentPass123'
            };

            const response = await request(app)
                .post('/auth/signup')
                .send(mismatchedPasswords)
                .expect('Content-Type', /json/);

            expect(response.status).toBe(200);
            expect(response.body).toMatchObject({
                statusCode: 400,
                signupSuccess: false,
                serverMessage: 'Passwords do not match'
            });
        });

        it('should reject signup with weak password', async () => {
            const weakPassword = {
                ...validSignupData,
                password: 'weak',
                confirmPassword: 'weak'
            };

            const response = await request(app)
                .post('/auth/signup')
                .send(weakPassword)
                .expect('Content-Type', /json/);

            expect(response.status).toBe(200);
            expect(response.body).toMatchObject({
                statusCode: 400,
                signupSuccess: false,
                serverMessage: expect.stringContaining('at least 8 characters')
            });
        });

        it('should reject signup with invalid email format', async () => {
            const invalidEmail = {
                ...validSignupData,
                email: 'not-an-email'
            };

            const response = await request(app)
                .post('/auth/signup')
                .send(invalidEmail)
                .expect('Content-Type', /json/);

            expect(response.status).toBe(200);
            expect(response.body).toMatchObject({
                statusCode: 400,
                signupSuccess: false,
                serverMessage: 'Invalid email format'
            });
        });

        it('should reject signup when username already exists', async () => {
            const employeeQueries = require('../../../middleware/helpers/EmployeeQueries');
            employeeQueries.employeeExistByUsername = jest.fn().mockResolvedValue(true);

            const response = await request(app)
                .post('/auth/signup')
                .send(validSignupData)
                .expect('Content-Type', /json/);

            expect(response.status).toBe(200);
            expect(response.body).toMatchObject({
                statusCode: 409,
                signupSuccess: false,
                serverMessage: 'Username already exists'
            });
        });

        it('should reject signup when email already exists', async () => {
            const employeeQueries = require('../../../middleware/helpers/EmployeeQueries');
            employeeQueries.employeeExistByUsername = jest.fn().mockResolvedValue(false);
            Employee.findOne = jest.fn().mockResolvedValue({
                email: 'john.doe@example.com'
            });

            const response = await request(app)
                .post('/auth/signup')
                .send(validSignupData)
                .expect('Content-Type', /json/);

            expect(response.status).toBe(200);
            expect(response.body).toMatchObject({
                statusCode: 409,
                signupSuccess: false,
                serverMessage: 'Email already registered'
            });
        });

        it('should hash the password before storing', async () => {
            const employeeQueries = require('../../../middleware/helpers/EmployeeQueries');
            const logAuthEvent = require('../../../middleware/helpers/authLog');
            
            employeeQueries.employeeExistByUsername = jest.fn().mockResolvedValue(false);
            Employee.findOne = jest.fn().mockResolvedValue(null);
            Employee.create = jest.fn().mockResolvedValue({
                employeeID: 1,
                username: 'johndoe'
            });
            logAuthEvent.mockResolvedValue(true);

            await request(app)
                .post('/auth/signup')
                .send(validSignupData);

            expect(Employee.create).toHaveBeenCalled();
            const createArgs = Employee.create.mock.calls[0][0];
            
            // Password should be hashed (not equal to original)
            expect(createArgs.password).not.toBe(validSignupData.password);
            // Should be a bcrypt hash
            expect(createArgs.password).toMatch(/^\$2[aby]\$\d{1,2}\$/);
        });

        it('should set account_status to Pending for new signups', async () => {
            const employeeQueries = require('../../../middleware/helpers/EmployeeQueries');
            const logAuthEvent = require('../../../middleware/helpers/authLog');
            
            employeeQueries.employeeExistByUsername = jest.fn().mockResolvedValue(false);
            Employee.findOne = jest.fn().mockResolvedValue(null);
            Employee.create = jest.fn().mockResolvedValue({
                employeeID: 1,
                username: 'johndoe'
            });
            logAuthEvent.mockResolvedValue(true);

            await request(app)
                .post('/auth/signup')
                .send(validSignupData);

            expect(Employee.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    account_status: 'Pending',
                    entered_by: 'self-registration',
                    role: 'employee'
                })
            );
        });

        it('should include verification token in created employee', async () => {
            const employeeQueries = require('../../../middleware/helpers/EmployeeQueries');
            const logAuthEvent = require('../../../middleware/helpers/authLog');
            
            employeeQueries.employeeExistByUsername = jest.fn().mockResolvedValue(false);
            Employee.findOne = jest.fn().mockResolvedValue(null);
            Employee.create = jest.fn().mockResolvedValue({
                employeeID: 1,
                username: 'johndoe'
            });
            logAuthEvent.mockResolvedValue(true);

            await request(app)
                .post('/auth/signup')
                .send(validSignupData);

            expect(Employee.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    email_verified: false,
                    verification_token: expect.any(String),
                    verification_token_expires: expect.any(Date)
                })
            );
        });

        it('should handle optional phone number', async () => {
            const employeeQueries = require('../../../middleware/helpers/EmployeeQueries');
            const logAuthEvent = require('../../../middleware/helpers/authLog');
            
            employeeQueries.employeeExistByUsername = jest.fn().mockResolvedValue(false);
            Employee.findOne = jest.fn().mockResolvedValue(null);
            Employee.create = jest.fn().mockResolvedValue({
                employeeID: 1,
                username: 'johndoe'
            });
            logAuthEvent.mockResolvedValue(true);

            const dataWithoutPhone = { ...validSignupData };
            delete dataWithoutPhone.phoneNumber;

            const response = await request(app)
                .post('/auth/signup')
                .send(dataWithoutPhone);

            expect(response.body.signupSuccess).toBe(true);
            expect(Employee.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    phone_number: null
                })
            );
        });
    });
});
