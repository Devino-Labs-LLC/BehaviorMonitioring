const request = require('supertest');
const express = require('express');
const adminRoutes = require('../../../routes/Admin');

jest.mock('../../../middleware/authMiddleware', () => (req, res, next) => next());
jest.mock('../../../middleware/rateLimiter', () => ({
  apiLimiter: (req, res, next) => next(),
}));

jest.mock('../../../middleware/helpers/AdminQueries', () => ({
  adminExistByUsername: jest.fn(),
  adminDataById: jest.fn(),
  adminAddNewEmployee: jest.fn(),
  adminDeleteAnEmployeeByID: jest.fn(),
  adminUpdateEmployeeAccountByID: jest.fn(),
  adminUpdateEmployeeAccountStatusByID: jest.fn(),
  adminAddNewHome: jest.fn(),
  adminDeleteAHomeByID: jest.fn(),
  adminUpdateHomeByID: jest.fn(),
  homeExistByName: jest.fn(),
  adminGetAllEmployees: jest.fn(),
  adminGetAllHomes: jest.fn(),
}));

jest.mock('../../../middleware/helpers/EmployeeQueries', () => ({
  employeeExistByUsername: jest.fn(),
  employeeDataByUsername: jest.fn(),
}));

jest.mock('../../../functions/users/generateUsername', () => jest.fn(() => 'test.user'));

jest.mock('../../../middleware/email/emailTemplate', () => ({
  sendEmployeeVerification: jest.fn().mockResolvedValue(true),
  sendAdminVerification: jest.fn().mockResolvedValue(true),
  sendAccountApprovalNotification: jest.fn().mockResolvedValue(true),
}));

const adminQueries = require('../../../middleware/helpers/AdminQueries');
const employeeQueries = require('../../../middleware/helpers/EmployeeQueries');
const emailTemplate = require('../../../middleware/email/emailTemplate');
const generateUsername = require('../../../functions/users/generateUsername');

const app = express();
app.use(express.json());
app.use('/admin', adminRoutes);

function authorizedAdmin() {
  employeeQueries.employeeExistByUsername.mockResolvedValue(true);
  employeeQueries.employeeDataByUsername.mockResolvedValue({
    employeeID: 99,
    username: 'testadmin',
    role: 'admin',
    fName: 'Test',
    lName: 'Admin',
    companyID: 1,
    companyName: 'Acme Corporation',
  });
}

describe('Admin API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authorizedAdmin();
  });

  describe('POST /admin/addNewEmployee', () => {
    it('adds a technician and sends employee verification', async () => {
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
      expect(response.body).toEqual({
        statusCode: 201,
        serverMessage: 'New technician added',
      });
      expect(emailTemplate.sendEmployeeVerification).toHaveBeenCalledWith(
        'john@example.com',
        'John',
        'Doe',
        'john.doe'
      );
    });

    it('sends admin verification for admin roles', async () => {
      adminQueries.adminExistByUsername.mockResolvedValue(false);
      adminQueries.adminAddNewEmployee.mockResolvedValue(true);

      const response = await request(app)
        .post('/admin/addNewEmployee')
        .send({
          fName: 'Ada',
          lName: 'Lovelace',
          email: 'ada@example.com',
          pNumber: '1234567890',
          role: 'Admin',
          employeeUsername: 'testadmin',
        });

      expect(response.body.statusCode).toBe(201);
      expect(emailTemplate.sendAdminVerification).toHaveBeenCalledWith(
        'ada@example.com',
        'Ada',
        'Lovelace',
        'ada.lovelace'
      );
    });

    it('uses a generated username when the default one already exists', async () => {
      adminQueries.adminExistByUsername.mockResolvedValue(true);
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

      expect(response.body.statusCode).toBe(201);
      expect(generateUsername).toHaveBeenCalledWith('John', 'Doe', 'Technician');
      expect(adminQueries.adminAddNewEmployee).toHaveBeenCalledWith(
        expect.objectContaining({ username: 'test.user' })
      );
    });

    it('returns a server error when employee creation fails', async () => {
      adminQueries.adminExistByUsername.mockResolvedValue(false);
      adminQueries.adminAddNewEmployee.mockResolvedValue(false);

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

      expect(response.body).toEqual({
        statusCode: 500,
        serverMessage: 'A server error occurred',
      });
    });

    it('returns the error message when employee creation throws', async () => {
      adminQueries.adminExistByUsername.mockRejectedValue(new Error('username lookup failed'));

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

      expect(response.body.statusCode).toBe(500);
      expect(response.body.errorMessage).toBe('username lookup failed');
    });
  });

  describe('POST /admin/deleteAnEmployee', () => {
    it('deletes an employee', async () => {
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

    it('returns a server error when deletion fails', async () => {
      adminQueries.adminDeleteAnEmployeeByID.mockResolvedValue(false);

      const response = await request(app)
        .post('/admin/deleteAnEmployee')
        .send({
          employeeID: 1,
          employeeUsername: 'testadmin',
        });

      expect(response.body).toEqual({
        statusCode: 500,
        serverMessage: 'A server error occurred',
      });
    });

    it('returns the error message when deletion throws', async () => {
      adminQueries.adminDeleteAnEmployeeByID.mockRejectedValue(new Error('delete failed'));

      const response = await request(app)
        .post('/admin/deleteAnEmployee')
        .send({
          employeeID: 1,
          employeeUsername: 'testadmin',
        });

      expect(response.body.statusCode).toBe(500);
      expect(response.body.errorMessage).toBe('delete failed');
    });
  });

  describe('POST /admin/updateAnEmployeeDetail', () => {
    it('updates employee detail', async () => {
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

    it('returns a server error when employee update fails', async () => {
      adminQueries.adminUpdateEmployeeAccountByID.mockResolvedValue(false);

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

      expect(response.body).toEqual({
        statusCode: 500,
        serverMessage: 'A server error occurred',
      });
    });

    it('returns the error message when employee update throws', async () => {
      adminQueries.adminUpdateEmployeeAccountByID.mockRejectedValue(new Error('update failed'));

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

      expect(response.body.statusCode).toBe(500);
      expect(response.body.errorMessage).toBe('update failed');
    });
  });

  describe('POST /admin/updateAnEmployeeAccountStatus', () => {
    it('sends approval email when activating an employee', async () => {
      adminQueries.adminUpdateEmployeeAccountStatusByID.mockResolvedValue(true);
      adminQueries.adminDataById.mockResolvedValue({
        email: 'john@example.com',
        fName: 'John',
        lName: 'Doe',
        username: 'john.doe',
      });

      const response = await request(app)
        .post('/admin/updateAnEmployeeAccountStatus')
        .send({
          employeeID: 1,
          accountStatus: 'Active',
          employeeUsername: 'testadmin',
        });

      expect(response.status).toBe(200);
      expect(response.body.statusCode).toBe(201);
      expect(emailTemplate.sendAccountApprovalNotification).toHaveBeenCalledWith(
        'john@example.com',
        'John',
        'Doe',
        'john.doe'
      );
    });

    it('returns a server error when account status update fails', async () => {
      adminQueries.adminUpdateEmployeeAccountStatusByID.mockResolvedValue(false);

      const response = await request(app)
        .post('/admin/updateAnEmployeeAccountStatus')
        .send({
          employeeID: 1,
          accountStatus: 'Inactive',
          employeeUsername: 'testadmin',
        });

      expect(response.body).toEqual({
        statusCode: 500,
        serverMessage: 'A server error occurred',
      });
    });

    it('returns the error message when account status update throws', async () => {
      adminQueries.adminUpdateEmployeeAccountStatusByID.mockRejectedValue(new Error('status failed'));

      const response = await request(app)
        .post('/admin/updateAnEmployeeAccountStatus')
        .send({
          employeeID: 1,
          accountStatus: 'Active',
          employeeUsername: 'testadmin',
        });

      expect(response.body.statusCode).toBe(500);
      expect(response.body.errorMessage).toBe('status failed');
    });
  });

  describe('POST /admin/addNewHome', () => {
    it('rejects missing required fields', async () => {
      const response = await request(app)
        .post('/admin/addNewHome')
        .send({
          name: 'Home One',
          city: 'Tampa',
          employeeUsername: 'testadmin',
        });

      expect(response.body).toEqual({
        statusCode: 400,
        serverMessage: 'All required home fields must be provided',
      });
    });

    it('rejects invalid state', async () => {
      const response = await request(app)
        .post('/admin/addNewHome')
        .send({
          name: 'Home One',
          streetAddress: '123 Main St',
          city: 'Tampa',
          state: 'Florida',
          zipCode: '33601',
          capacity: 4,
          employeeUsername: 'testadmin',
        });

      expect(response.body.serverMessage).toBe('State must be a 2-letter code');
    });

    it('rejects invalid zip code', async () => {
      const response = await request(app)
        .post('/admin/addNewHome')
        .send({
          name: 'Home One',
          streetAddress: '123 Main St',
          city: 'Tampa',
          state: 'FL',
          zipCode: '33',
          capacity: 4,
          employeeUsername: 'testadmin',
        });

      expect(response.body.serverMessage).toBe('ZIP code must be 5 digits or ZIP+4 format');
    });

    it('rejects invalid capacity', async () => {
      const response = await request(app)
        .post('/admin/addNewHome')
        .send({
          name: 'Home One',
          streetAddress: '123 Main St',
          city: 'Tampa',
          state: 'FL',
          zipCode: '33601',
          capacity: 0,
          employeeUsername: 'testadmin',
        });

      expect(response.body.serverMessage).toBe('Capacity must be a positive whole number');
    });

    it('rejects duplicate home names', async () => {
      adminQueries.homeExistByName.mockResolvedValue(true);

      const response = await request(app)
        .post('/admin/addNewHome')
        .send({
          name: 'Home One',
          streetAddress: '123 Main St',
          city: 'Tampa',
          state: 'FL',
          zipCode: '33601',
          capacity: 4,
          employeeUsername: 'testadmin',
        });

      expect(response.body).toEqual({
        statusCode: 409,
        serverMessage: 'A home with this name already exists',
      });
    });

    it('adds a home with valid input', async () => {
      adminQueries.homeExistByName.mockResolvedValue(false);
      adminQueries.adminAddNewHome.mockResolvedValue(true);

      const response = await request(app)
        .post('/admin/addNewHome')
        .send({
          name: 'Home One',
          streetAddress: '123 Main St',
          city: 'Tampa',
          state: 'fl',
          zipCode: '33601',
          capacity: 4,
          employeeUsername: 'testadmin',
        });

      expect(response.body).toEqual({
        statusCode: 201,
        serverMessage: 'New home added',
      });
      expect(adminQueries.adminAddNewHome).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Home One',
          streetAddress: '123 Main St',
          city: 'Tampa',
          state: 'FL',
          zipCode: '33601',
          capacity: 4,
          currentOccupancy: 0,
          compID: 1,
        })
      );
    });

    it('returns a server error when home creation fails', async () => {
      adminQueries.homeExistByName.mockResolvedValue(false);
      adminQueries.adminAddNewHome.mockResolvedValue(false);

      const response = await request(app)
        .post('/admin/addNewHome')
        .send({
          name: 'Home One',
          streetAddress: '123 Main St',
          city: 'Tampa',
          state: 'FL',
          zipCode: '33601',
          capacity: 4,
          employeeUsername: 'testadmin',
        });

      expect(response.body).toEqual({
        statusCode: 500,
        serverMessage: 'A server error occurred',
      });
    });

    it('returns the error message when home creation throws', async () => {
      adminQueries.homeExistByName.mockRejectedValue(new Error('home lookup failed'));

      const response = await request(app)
        .post('/admin/addNewHome')
        .send({
          name: 'Home One',
          streetAddress: '123 Main St',
          city: 'Tampa',
          state: 'FL',
          zipCode: '33601',
          capacity: 4,
          employeeUsername: 'testadmin',
        });

      expect(response.body.statusCode).toBe(500);
      expect(response.body.errorMessage).toBe('home lookup failed');
    });
  });

  describe('POST /admin/deleteAHome', () => {
    it('deletes a home', async () => {
      adminQueries.adminDeleteAHomeByID.mockResolvedValue(true);

      const response = await request(app)
        .post('/admin/deleteAHome')
        .send({
          homeID: 1,
          employeeUsername: 'testadmin',
        });

      expect(response.status).toBe(200);
      expect(response.body.statusCode).toBe(201);
    });

    it('returns a server error when home deletion fails', async () => {
      adminQueries.adminDeleteAHomeByID.mockResolvedValue(false);

      const response = await request(app)
        .post('/admin/deleteAHome')
        .send({
          homeID: 1,
          employeeUsername: 'testadmin',
        });

      expect(response.body).toEqual({
        statusCode: 500,
        serverMessage: 'A server error occurred',
      });
    });

    it('returns the error message when home deletion throws', async () => {
      adminQueries.adminDeleteAHomeByID.mockRejectedValue(new Error('delete home failed'));

      const response = await request(app)
        .post('/admin/deleteAHome')
        .send({
          homeID: 1,
          employeeUsername: 'testadmin',
        });

      expect(response.body.statusCode).toBe(500);
      expect(response.body.errorMessage).toBe('delete home failed');
    });
  });

  describe('POST /admin/updateAHome', () => {
    it('rejects missing required fields', async () => {
      const response = await request(app)
        .post('/admin/updateAHome')
        .send({
          homeID: 1,
          name: '',
          city: 'Tampa',
          employeeUsername: 'testadmin',
        });

      expect(response.body.serverMessage).toBe('All required home fields must be provided');
    });

    it('rejects updates with invalid state', async () => {
      const response = await request(app)
        .post('/admin/updateAHome')
        .send({
          homeID: 1,
          name: 'Home One',
          streetAddress: '123 Main St',
          city: 'Tampa',
          state: 'Florida',
          zipCode: '33601',
          capacity: 2,
          employeeUsername: 'testadmin',
        });

      expect(response.body.serverMessage).toBe('State must be a 2-letter code');
    });

    it('rejects updates with invalid zip code', async () => {
      const response = await request(app)
        .post('/admin/updateAHome')
        .send({
          homeID: 1,
          name: 'Home One',
          streetAddress: '123 Main St',
          city: 'Tampa',
          state: 'FL',
          zipCode: '33',
          capacity: 2,
          employeeUsername: 'testadmin',
        });

      expect(response.body.serverMessage).toBe('ZIP code must be 5 digits or ZIP+4 format');
    });

    it('rejects updates with invalid capacity', async () => {
      const response = await request(app)
        .post('/admin/updateAHome')
        .send({
          homeID: 1,
          name: 'Home One',
          streetAddress: '123 Main St',
          city: 'Tampa',
          state: 'FL',
          zipCode: '33601',
          capacity: -1,
          employeeUsername: 'testadmin',
        });

      expect(response.body.serverMessage).toBe('Capacity must be a positive whole number');
    });

    it('updates a home with valid input', async () => {
      adminQueries.adminUpdateHomeByID.mockResolvedValue(true);

      const response = await request(app)
        .post('/admin/updateAHome')
        .send({
          homeID: 1,
          name: 'Home One',
          streetAddress: '123 Main St',
          city: 'Tampa',
          state: 'FL',
          zipCode: '33601-1234',
          capacity: 6,
          employeeUsername: 'testadmin',
        });

      expect(response.body).toEqual({
        statusCode: 201,
        serverMessage: 'Home has been updated',
      });
      expect(adminQueries.adminUpdateHomeByID).toHaveBeenCalledWith({
        name: 'Home One',
        streetAddress: '123 Main St',
        city: 'Tampa',
        state: 'FL',
        zipCode: '33601-1234',
        capacity: 6,
        hID: 1,
        compID: 1,
      });
    });

    it('returns a server error when home update fails', async () => {
      adminQueries.adminUpdateHomeByID.mockResolvedValue(false);

      const response = await request(app)
        .post('/admin/updateAHome')
        .send({
          homeID: 1,
          name: 'Home One',
          streetAddress: '123 Main St',
          city: 'Tampa',
          state: 'FL',
          zipCode: '33601',
          capacity: 4,
          employeeUsername: 'testadmin',
        });

      expect(response.body).toEqual({
        statusCode: 500,
        serverMessage: 'A server error occurred',
      });
    });

    it('returns the error message when home update throws', async () => {
      adminQueries.adminUpdateHomeByID.mockRejectedValue(new Error('update home failed'));

      const response = await request(app)
        .post('/admin/updateAHome')
        .send({
          homeID: 1,
          name: 'Home One',
          streetAddress: '123 Main St',
          city: 'Tampa',
          state: 'FL',
          zipCode: '33601',
          capacity: 4,
          employeeUsername: 'testadmin',
        });

      expect(response.body.statusCode).toBe(500);
      expect(response.body.errorMessage).toBe('update home failed');
    });
  });

  describe('POST /admin/getAllAdmins', () => {
    it('returns only admin-level employees mapped to frontend admin fields', async () => {
      adminQueries.adminGetAllEmployees.mockResolvedValue([
        {
          employeeID: 1,
          fName: 'Root',
          lName: 'User',
          username: 'root.user',
          email: 'root@example.com',
          phone_number: '555-1111',
          role: 'root',
          account_status: 'Active',
          companyID: 1,
          companyName: 'Acme Corporation',
          date_entered: '2026-03-31',
        },
        {
          employeeID: 2,
          fName: 'Tech',
          lName: 'User',
          username: 'tech.user',
          email: 'tech@example.com',
          phone_number: '555-2222',
          role: 'technician',
          account_status: 'Active',
          companyID: 1,
          companyName: 'Acme Corporation',
          date_entered: '2026-03-30',
        },
      ]);

      const response = await request(app)
        .post('/admin/getAllAdmins')
        .send({
          employeeUsername: 'testadmin',
        });

      expect(response.body).toEqual({
        statusCode: 200,
        admins: [
          {
            adminID: 1,
            firstName: 'Root',
            lastName: 'User',
            username: 'root.user',
            email: 'root@example.com',
            phone: '555-1111',
            role: 'root',
            isActive: true,
            companyID: 1,
            companyName: 'Acme Corporation',
            dateCreated: '2026-03-31',
          },
        ],
        totalCount: 1,
        serverMessage: 'Admins retrieved successfully',
      });
    });

    it('returns the error message when getAllAdmins throws', async () => {
      adminQueries.adminGetAllEmployees.mockRejectedValue(new Error('admin list failed'));

      const response = await request(app)
        .post('/admin/getAllAdmins')
        .send({
          employeeUsername: 'testadmin',
        });

      expect(response.body.statusCode).toBe(500);
      expect(response.body.errorMessage).toBe('admin list failed');
    });
  });

  describe('POST /admin/getAllHomes', () => {
    it('maps homes into the frontend response shape', async () => {
      adminQueries.adminGetAllHomes.mockResolvedValue([
        {
          homeID: 5,
          name: 'Sunrise Home',
          street_address: '123 Main St',
          city: 'Tampa',
          state: 'FL',
          zip_code: '33601',
          capacity: 4,
          current_occupancy: 2,
          companyID: 1,
          companyName: 'Acme Corporation',
          date_entered: '2026-03-31',
          time_entered: '09:00',
          entered_by: 'Test Admin',
        },
      ]);

      const response = await request(app)
        .post('/admin/getAllHomes')
        .send({
          employeeUsername: 'testadmin',
        });

      expect(response.body).toEqual({
        statusCode: 200,
        homes: [
          {
            homeID: 5,
            homeName: 'Sunrise Home',
            name: 'Sunrise Home',
            address: '123 Main St',
            street_address: '123 Main St',
            city: 'Tampa',
            state: 'FL',
            zip: '33601',
            zip_code: '33601',
            capacity: 4,
            currentOccupancy: 2,
            companyID: 1,
            companyName: 'Acme Corporation',
            dateCreated: '2026-03-31',
            date_entered: '2026-03-31',
            time_entered: '09:00',
            entered_by: 'Test Admin',
            isActive: true,
          },
        ],
        totalCount: 1,
        serverMessage: 'Homes retrieved successfully',
      });
    });

    it('returns default values when optional home fields are missing', async () => {
      adminQueries.adminGetAllHomes.mockResolvedValue([
        {
          homeID: 5,
          name: 'Sunrise Home',
          street_address: '123 Main St',
          city: 'Tampa',
          state: 'FL',
          zip_code: '33601',
          capacity: null,
          current_occupancy: null,
          companyID: 1,
          companyName: 'Acme Corporation',
          date_entered: '2026-03-31',
          time_entered: '09:00',
          entered_by: 'Test Admin',
        },
      ]);

      const response = await request(app)
        .post('/admin/getAllHomes')
        .send({
          employeeUsername: 'testadmin',
        });

      expect(response.body.homes[0].capacity).toBe(0);
      expect(response.body.homes[0].currentOccupancy).toBe(0);
    });

    it('returns the error message when getAllHomes throws', async () => {
      adminQueries.adminGetAllHomes.mockRejectedValue(new Error('home list failed'));

      const response = await request(app)
        .post('/admin/getAllHomes')
        .send({
          employeeUsername: 'testadmin',
        });

      expect(response.body.statusCode).toBe(500);
      expect(response.body.errorMessage).toBe('home list failed');
    });
  });
});
