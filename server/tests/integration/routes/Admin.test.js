const request = require('supertest');
const express = require('express');
const adminRoutes = require('../../../routes/Admin');

// Mock authMiddleware to simulate authenticated requests
jest.mock('../../../middleware/authMiddleware', () => {
  return (req, res, next) => {
    // Simulate authenticated user from JWT token
    req.user = {
      username: 'testadmin',
      email: 'admin@test.com',
      role: 'admin'
    };
    next();
  };
});

// Mock adminQueries module
jest.mock('../../../middleware/helpers/AdminQueries', () => ({
  adminExistByUsername: jest.fn(),
  adminExistByID: jest.fn(),
  adminDataByUsername: jest.fn(),
  adminDataById: jest.fn(),
  adminAddNewEmployee: jest.fn(),
  adminDeleteAnEmployeeByID: jest.fn(),
  adminDeleteAnEmployeeByUsername: jest.fn(),
  adminUpdateEmployeeAccountStatusByUsername: jest.fn(),
  adminUpdateEmployeeAccountStatusByID: jest.fn(),
  adminUpdateEmployeeAccountByUsername: jest.fn(),
  adminUpdateEmployeeAccountByID: jest.fn(),
}));

// Mock employeeQueries module (used by authorizationHelper)
jest.mock('../../../middleware/helpers/EmployeeQueries', () => ({
  employeeExistByUsername: jest.fn(),
  employeeDataByUsername: jest.fn(),
}));

// Mock generate username
jest.mock('../../../functions/users/generateUsername', () => jest.fn(() => 'test.user'));

// Mock email handler
jest.mock('../../../middleware/email/emailTemplate', () => ({
  sendEmployeeVerification: jest.fn().mockResolvedValue(true),
  sendAdminVerification: jest.fn().mockResolvedValue(true),
  sendAccountApprovalNotification: jest.fn().mockResolvedValue(true),
  sendSignupVerification: jest.fn().mockResolvedValue(true),
  sendPasswordRecovery: jest.fn().mockResolvedValue(true),
  sendNewSignupNotificationToAdmin: jest.fn().mockResolvedValue(true),
  sendDatabaseBackupNotification: jest.fn().mockResolvedValue(true),
  sendDatabaseBackupResults: jest.fn().mockResolvedValue(true),
}));

const adminQueries = require('../../../middleware/helpers/AdminQueries');
const employeeQueries = require('../../../middleware/helpers/EmployeeQueries');

const app = express();
app.use(express.json());
app.use('/admin', adminRoutes);

describe('Admin API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /admin/addNewEmployee', () => {
    it('handles add employee request', async () => {
      // Mock authorization check
      employeeQueries.employeeExistByUsername.mockResolvedValue(true);
      employeeQueries.employeeDataByUsername.mockResolvedValue({
        role: 'admin',
        fName: 'Test',
        lName: 'Admin',
        companyID: 1,
        companyName: 'Acme Corporation',
      });
      adminQueries.adminExistByUsername.mockResolvedValue(false);
      adminQueries.adminAddNewEmployee.mockResolvedValue(true);

      const response = await request(app)
        .post('/admin/addNewEmployee')
        .send({
          fName: 'John',
          lName: 'Doe',
          email: 'john@example.com',
          pNumber: '1234567890',
          role: 'Technician',
          employeeUsername: 'testadmin',
        });

      expect(response.status).toBe(200);
      expect(response.body.statusCode).toBeGreaterThanOrEqual(200);
      expect(response.body.statusCode).toBeLessThan(300);
    });
  });

  describe('POST /admin/deleteAnEmployee', () => {
    it('handles delete request', async () => {
      employeeQueries.employeeExistByUsername.mockResolvedValue(true);
      employeeQueries.employeeDataByUsername.mockResolvedValue({
        role: 'admin',
        companyID: 1,
      });
      adminQueries.adminDeleteAnEmployeeByID.mockResolvedValue(true);

      const response = await request(app)
        .post('/admin/deleteAnEmployee')
        .send({
          employeeID: 1,
          employeeUsername: 'testadmin',
        });

      expect(response.status).toBe(200);
      expect(response.body.statusCode).toBe(201);
    });
  });

  describe('POST /admin/updateAnEmployeeDetail', () => {
    it('handles update request', async () => {
      employeeQueries.employeeExistByUsername.mockResolvedValue(true);
      employeeQueries.employeeDataByUsername.mockResolvedValue({
        role: 'admin',
        companyID: 1,
      });
      adminQueries.adminUpdateEmployeeAccountByID.mockResolvedValue(true);

      const response = await request(app)
        .post('/admin/updateAnEmployeeDetail')
        .send({
          employeeID: 1,
          fName: 'John',
          lName: 'Doe',
          email: 'john@example.com',
          pNumber: '1234567890',
          role: 'Technician',
          employeeUsername: 'testadmin',
        });

      expect(response.status).toBe(200);
      expect(response.body.statusCode).toBe(201);
    });
  });

  describe('POST /admin/addNewHome', () => {
    it('successfully adds new home', async () => {
      const response = await request(app)
        .post('/admin/addNewHome')
        .send({
          homeName: 'Test Home',
          location: 'Test Location',
        });

      expect(response.status).toBe(200);
    });
  });

  describe('POST /admin/deleteAHome', () => {
    it('handles delete home request', async () => {
      const response = await request(app)
        .post('/admin/deleteAHome')
        .send({
          homeID: 1,
        });

      expect(response.status).toBe(200);
    });
  });
});
