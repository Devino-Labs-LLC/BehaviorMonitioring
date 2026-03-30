const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const authRouter = require('../../../routes/Auth');
const { csrfProtection } = require('../../../middleware/csrfProtection');
const Employee = require('../../../models/Employee');
const bcrypt = require('bcryptjs');

// Mock the models module
jest.mock('../../../models/Employee');
jest.mock('../../../middleware/helpers/EmployeeQueries');
jest.mock('../../../middleware/helpers/authLog');

describe('SignUp API Integration Tests', () => {
    let app;
    let agent;

    const testRateLimiter = rateLimit({
        windowMs: 60 * 1000,
        max: 1000,
        standardHeaders: true,
        legacyHeaders: false,
    });

    async function postWithCsrf(path, payload) {
        const csrfResponse = await agent.get('/csrf-token');
        return agent
            .post(path)
            .set('x-csrf-token', csrfResponse.body.csrfToken)
            .send(payload)
            .expect('Content-Type', /json/);
    }

    beforeAll(() => {
        app = express();
        app.use(cookieParser());
        app.use(express.json());
        app.use(csrfProtection);
        app.get('/csrf-token', (req, res) => {
            res.json({ csrfToken: res.locals.csrfToken });
        });
        app.use('/auth', testRateLimiter, authRouter);
    });

    beforeEach(() => {
        agent = request.agent(app);
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
            const CompanyData = require('../../../models/CompanyData');
            
            employeeQueries.employeeExistByUsername = jest.fn().mockResolvedValue(false);
            Employee.findOne = jest.fn().mockResolvedValue(null);
            CompanyData.findOne = jest.fn().mockResolvedValue(null); // No existing company
            CompanyData.create = jest.fn().mockResolvedValue({
                companyDataID: 1,
                companyName: 'Acme Corporation'
            });
            Employee.findAll = jest.fn().mockResolvedValue([]);
            Employee.create = jest.fn().mockResolvedValue({
                employeeID: 1,
                username: 'johndoe',
                email: 'john.doe@example.com',
                fName: 'John',
                lName: 'Doe'
            });
            logAuthEvent.mockResolvedValue(true);

            const response = await postWithCsrf('/auth/signup', validSignupData);

            expect(response.status).toBe(200);
            expect(response.body).toMatchObject({
                statusCode: 201,
                signupSuccess: true,
                userId: 1,
                message: expect.stringContaining('company administrator'),
                isCompanyAdmin: true
            });

            expect(Employee.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    fName: 'John',
                    lName: 'Doe',
                    username: 'johndoe',
                    email: 'john.doe@example.com',
                    phone_number: '5551234567',
                    role: 'admin',
                    account_status: 'Active',
                    companyName: 'Acme Corporation',
                    companyID: 1
                })
            );
        });

        it('should reject signup with missing required fields', async () => {
            const incompleteData = {
                firstName: 'John',
                email: 'john@example.com'
                // missing other required fields
            };

            const response = await postWithCsrf('/auth/signup', incompleteData);

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

            const response = await postWithCsrf('/auth/signup', mismatchedPasswords);

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

            const response = await postWithCsrf('/auth/signup', weakPassword);

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

            const response = await postWithCsrf('/auth/signup', invalidEmail);

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

            const response = await postWithCsrf('/auth/signup', validSignupData);

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

            const response = await postWithCsrf('/auth/signup', validSignupData);

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
            const CompanyData = require('../../../models/CompanyData');
            CompanyData.findOne = jest.fn().mockResolvedValue(null);
            CompanyData.create = jest.fn().mockResolvedValue({
                companyDataID: 1,
                companyName: 'Acme Corporation'
            });
            Employee.findAll = jest.fn().mockResolvedValue([]);
            Employee.create = jest.fn().mockResolvedValue({
                employeeID: 1,
                username: 'johndoe'
            });
            logAuthEvent.mockResolvedValue(true);

            await postWithCsrf('/auth/signup', validSignupData);

            expect(Employee.create).toHaveBeenCalled();
            const createArgs = Employee.create.mock.calls[0][0];
            
            // Password should be hashed (not equal to original)
            expect(createArgs.password).not.toBe(validSignupData.password);
            // Should be a bcrypt hash
            expect(createArgs.password).toMatch(/^\$2[aby]\$\d{1,2}\$/);
        });

        it('should set account_status to Pending for new signups to existing company', async () => {
            const employeeQueries = require('../../../middleware/helpers/EmployeeQueries');
            const logAuthEvent = require('../../../middleware/helpers/authLog');
            const CompanyData = require('../../../models/CompanyData');
            
            employeeQueries.employeeExistByUsername = jest.fn().mockResolvedValue(false);
            Employee.findOne = jest.fn().mockResolvedValue(null);
            CompanyData.findOne = jest.fn().mockResolvedValue({
                companyDataID: 1,
                companyName: 'Acme Corporation'
            }); // Existing company
            Employee.findAll = jest.fn().mockResolvedValue([
                { role: 'admin' }
            ]);
            Employee.create = jest.fn().mockResolvedValue({
                employeeID: 1,
                username: 'johndoe'
            });
            logAuthEvent.mockResolvedValue(true);

            await postWithCsrf('/auth/signup', validSignupData);

            expect(Employee.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    account_status: 'Pending',
                    entered_by: 'self-registration',
                    role: 'employee',
                    companyID: 1
                })
            );
        });

        it('should include verification token in created employee', async () => {
            const employeeQueries = require('../../../middleware/helpers/EmployeeQueries');
            const logAuthEvent = require('../../../middleware/helpers/authLog');
            
            employeeQueries.employeeExistByUsername = jest.fn().mockResolvedValue(false);
            Employee.findOne = jest.fn().mockResolvedValue(null);
            const CompanyData = require('../../../models/CompanyData');
            CompanyData.findOne = jest.fn().mockResolvedValue(null);
            CompanyData.create = jest.fn().mockResolvedValue({
                companyDataID: 1,
                companyName: 'Acme Corporation'
            });
            Employee.findAll = jest.fn().mockResolvedValue([]);
            Employee.create = jest.fn().mockResolvedValue({
                employeeID: 1,
                username: 'johndoe'
            });
            logAuthEvent.mockResolvedValue(true);

            await postWithCsrf('/auth/signup', validSignupData);

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
            const CompanyData = require('../../../models/CompanyData');
            CompanyData.findOne = jest.fn().mockResolvedValue(null);
            CompanyData.create = jest.fn().mockResolvedValue({
                companyDataID: 1,
                companyName: 'Acme Corporation'
            });
            Employee.findAll = jest.fn().mockResolvedValue([]);
            Employee.create = jest.fn().mockResolvedValue({
                employeeID: 1,
                username: 'johndoe'
            });
            logAuthEvent.mockResolvedValue(true);

            const dataWithoutPhone = { ...validSignupData };
            delete dataWithoutPhone.phoneNumber;

            const response = await postWithCsrf('/auth/signup', dataWithoutPhone);

            expect(response.body.signupSuccess).toBe(true);
            expect(Employee.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    phone_number: null
                })
            );
        });
    });
});
