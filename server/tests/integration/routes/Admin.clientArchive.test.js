const request = require('supertest');
const express = require('express');
const adminRoutes = require('../../../routes/Admin');
const adminQueries = require('../../../middleware/helpers/AdminQueries');
const emailTemplate = require('../../../middleware/email/emailTemplate');

// Mock dependencies
jest.mock('../../../middleware/helpers/AdminQueries');
jest.mock('../../../middleware/email/emailTemplate', () => ({
  sendEmployeeVerification: jest.fn().mockResolvedValue(true),
  sendAdminVerification: jest.fn().mockResolvedValue(true),
  sendAccountApprovalNotification: jest.fn().mockResolvedValue(true),
  sendSignupVerification: jest.fn().mockResolvedValue(true),
  sendPasswordRecovery: jest.fn().mockResolvedValue(true),
  sendNewSignupNotificationToAdmin: jest.fn().mockResolvedValue(true),
  sendDatabaseBackupNotification: jest.fn().mockResolvedValue(true),
  sendDatabaseBackupResults: jest.fn().mockResolvedValue(true),
  sendClientDataDeletionReminder: jest.fn().mockResolvedValue(true),
  sendClientDataDeleted: jest.fn().mockResolvedValue(true)
}));
jest.mock('../../../middleware/helpers/authorizationHelper', () => ({
  verifyAdminAuthorization: jest.fn((req) => ({
    employeeID: 1,
    fName: 'Admin',
    lName: 'User',
    companyID: 1,
    companyName: 'Test Company'
  }))
}));
jest.mock('../../../functions/base/currentDateTime', () => ({
  getCurrentDate: jest.fn().mockResolvedValue('2026-01-29'),
  getCurrentTime: jest.fn().mockResolvedValue('10:00:00')
}));
jest.mock('../../../functions/base/dateTimeFormat', () => ({
  formatDateString: jest.fn((date) => Promise.resolve(date))
}));

const app = express();
app.use(express.json());
app.use('/admin', adminRoutes);

describe('Admin Routes - Client Archive Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /admin/createClient', () => {
    it('should create a client successfully', async () => {
      adminQueries.adminAddNewClient = jest.fn().mockResolvedValue({
        clientID: 10,
        fName: 'John',
        lName: 'Doe',
      });

      const response = await request(app)
        .post('/admin/createClient')
        .send({
          fName: 'John',
          lName: 'Doe',
          DOB: '2000-01-01',
          intakeDate: '2026-01-29',
          groupHomeName: 'Sunrise',
          medicaidIdNumber: '123456',
          behaviorPlanDueDate: '2026-02-15',
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        statusCode: 201,
        serverMessage: 'Client created successfully',
        client: {
          clientID: 10,
          fName: 'John',
          lName: 'Doe',
        },
      });
      expect(adminQueries.adminAddNewClient).toHaveBeenCalledWith(
        expect.objectContaining({
          fName: 'John',
          lName: 'Doe',
          enteredBy: 'Admin User',
          compID: 1,
          compName: 'Test Company',
        })
      );
    });
  });

  describe('POST /admin/updateClient', () => {
    it('should return 404 when the client does not exist', async () => {
      adminQueries.clientExistByID = jest.fn().mockResolvedValue(false);

      const response = await request(app)
        .post('/admin/updateClient')
        .send({
          clientID: 999,
          fName: 'John',
          lName: 'Doe',
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        statusCode: 404,
        serverMessage: 'Client not found',
      });
    });

    it('should update a client successfully', async () => {
      adminQueries.clientExistByID = jest.fn().mockResolvedValue(true);
      adminQueries.adminUpdateClient = jest.fn().mockResolvedValue(true);

      const response = await request(app)
        .post('/admin/updateClient')
        .send({
          clientID: 5,
          fName: 'Jane',
          lName: 'Smith',
          DOB: '2001-02-03',
          intakeDate: '2026-01-29',
          groupHomeName: 'Sunrise',
          medicaidIdNumber: 'ABC123',
          behaviorPlanDueDate: '2026-02-15',
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        statusCode: 200,
        serverMessage: 'Client updated successfully',
      });
      expect(adminQueries.adminUpdateClient).toHaveBeenCalledWith({
        clientID: 5,
        fName: 'Jane',
        lName: 'Smith',
        DOB: '2001-02-03',
        intakeDate: '2026-01-29',
        groupHomeName: 'Sunrise',
        medicaidIdNumber: 'ABC123',
        behaviorPlanDueDate: '2026-02-15',
        compID: 1,
      });
    });
  });

  describe('POST /admin/deleteClient', () => {
    it('should return 404 when the client does not exist', async () => {
      adminQueries.clientExistByID = jest.fn().mockResolvedValue(false);

      const response = await request(app)
        .post('/admin/deleteClient')
        .send({ clientID: 404 });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        statusCode: 404,
        serverMessage: 'Client not found',
      });
    });

    it('should delete a client successfully', async () => {
      adminQueries.clientExistByID = jest.fn().mockResolvedValue(true);
      adminQueries.adminDeleteClient = jest.fn().mockResolvedValue(true);

      const response = await request(app)
        .post('/admin/deleteClient')
        .send({ clientID: 5 });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        statusCode: 200,
        serverMessage: 'Client deleted successfully',
      });
      expect(adminQueries.adminDeleteClient).toHaveBeenCalledWith(5, 1);
    });
  });

  describe('POST /admin/archiveClient', () => {
    it('should archive a client successfully', async () => {
      adminQueries.clientDataById = jest.fn().mockResolvedValue({
        clientID: 1,
        fName: 'John',
        lName: 'Doe',
        status: 'Active'
      });
      adminQueries.adminArchiveClient = jest.fn().mockResolvedValue(true);

      const response = await request(app)
        .post('/admin/archiveClient')
        .send({ clientID: 1 });

      expect(response.status).toBe(200);
      expect(response.body.statusCode).toBe(200);
      expect(response.body.serverMessage).toBe('Client archived successfully');
      expect(response.body.archiveDate).toBe('2026-01-29');
      expect(response.body.deletionDate).toBeDefined();
      expect(adminQueries.adminArchiveClient).toHaveBeenCalledWith(
        1,
        1,
        'Admin User',
        '2026-01-29',
        expect.any(String)
      );
    });

    it('should return 404 when client is not found', async () => {
      adminQueries.clientDataById = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .post('/admin/archiveClient')
        .send({ clientID: 999 });

      expect(response.status).toBe(200);
      expect(response.body.statusCode).toBe(404);
      expect(response.body.serverMessage).toBe('Client not found');
    });

    it('should return 400 when client is already archived', async () => {
      adminQueries.clientDataById = jest.fn().mockResolvedValue({
        clientID: 1,
        status: 'Archived'
      });

      const response = await request(app)
        .post('/admin/archiveClient')
        .send({ clientID: 1 });

      expect(response.status).toBe(200);
      expect(response.body.statusCode).toBe(400);
      expect(response.body.serverMessage).toBe('Client is already archived');
    });

    it('should return 500 on database error', async () => {
      adminQueries.clientDataById = jest.fn().mockResolvedValue({
        clientID: 1,
        status: 'Active'
      });
      adminQueries.adminArchiveClient = jest.fn().mockResolvedValue(false);

      const response = await request(app)
        .post('/admin/archiveClient')
        .send({ clientID: 1 });

      expect(response.status).toBe(200);
      expect(response.body.statusCode).toBe(500);
    });
  });

  describe('POST /admin/getArchivedClients', () => {
    it('should return all archived clients', async () => {
      const mockClients = [
        {
          clientID: 1,
          fName: 'John',
          lName: 'Doe',
          status: 'Archived',
          archived_date: '2026-01-29',
          archived_deletion_date: '2033-01-29'
        },
        {
          clientID: 2,
          fName: 'Jane',
          lName: 'Smith',
          status: 'Archived',
          archived_date: '2026-01-20',
          archived_deletion_date: '2033-01-20'
        }
      ];

      adminQueries.adminGetArchivedClients = jest.fn().mockResolvedValue(mockClients);

      const response = await request(app).post('/admin/getArchivedClients').send({});

      expect(response.status).toBe(200);
      expect(response.body.statusCode).toBe(200);
      expect(response.body.archivedClients).toHaveLength(2);
      expect(response.body.count).toBe(2);
      expect(response.body.archivedClients[0].fName).toBe('John');
    });

    it('should return empty array when no archived clients exist', async () => {
      adminQueries.adminGetArchivedClients = jest.fn().mockResolvedValue([]);

      const response = await request(app).post('/admin/getArchivedClients').send({});

      expect(response.status).toBe(200);
      expect(response.body.statusCode).toBe(200);
      expect(response.body.archivedClients).toEqual([]);
      expect(response.body.count).toBe(0);
    });

    it('should return 500 on database error', async () => {
      adminQueries.adminGetArchivedClients = jest.fn().mockRejectedValue(new Error('DB error'));

      const response = await request(app).post('/admin/getArchivedClients').send({});

      expect(response.status).toBe(200);
      expect(response.body.statusCode).toBe(500);
      expect(response.body.errorMessage).toBe('DB error');
    });
  });

  describe('POST /admin/getArchivedClient', () => {
    it('should return a specific archived client', async () => {
      const mockClient = {
        clientID: 1,
        fName: 'John',
        lName: 'Doe',
        status: 'Archived',
        archived_date: '2026-01-29'
      };

      adminQueries.adminGetArchivedClientById = jest.fn().mockResolvedValue(mockClient);

      const response = await request(app)
        .post('/admin/getArchivedClient')
        .send({ clientID: 1 });

      expect(response.status).toBe(200);
      expect(response.body.statusCode).toBe(200);
      expect(response.body.client.fName).toBe('John');
    });

    it('should return 404 when archived client is not found', async () => {
      adminQueries.adminGetArchivedClientById = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .post('/admin/getArchivedClient')
        .send({ clientID: 999 });

      expect(response.status).toBe(200);
      expect(response.body.statusCode).toBe(404);
      expect(response.body.serverMessage).toBe('Archived client not found');
    });
  });

  describe('POST /admin/unarchiveClient', () => {
    it('should unarchive a client successfully', async () => {
      adminQueries.adminUnarchiveClient = jest.fn().mockResolvedValue(true);

      const response = await request(app)
        .post('/admin/unarchiveClient')
        .send({ clientID: 1 });

      expect(response.status).toBe(200);
      expect(response.body.statusCode).toBe(200);
      expect(response.body.serverMessage).toBe('Client unarchived successfully');
    });

    it('should return 404 when client is not found or already active', async () => {
      adminQueries.adminUnarchiveClient = jest.fn().mockResolvedValue(false);

      const response = await request(app)
        .post('/admin/unarchiveClient')
        .send({ clientID: 999 });

      expect(response.status).toBe(200);
      expect(response.body.statusCode).toBe(404);
      expect(response.body.serverMessage).toBe('Archived client not found or already active');
    });
  });

  describe('POST /admin/deleteArchivedClient', () => {
    it('should permanently delete an archived client', async () => {
      const mockClient = {
        clientID: 1,
        fName: 'John',
        lName: 'Doe',
        archived_date: '2026-01-29',
        archived_deletion_date: '2033-01-29'
      };

      adminQueries.adminGetArchivedClientById = jest.fn().mockResolvedValue(mockClient);
      adminQueries.adminDeleteArchivedClient = jest.fn().mockResolvedValue(true);

      const response = await request(app)
        .post('/admin/deleteArchivedClient')
        .send({ clientID: 1 });

      expect(response.status).toBe(200);
      expect(response.body.statusCode).toBe(200);
      expect(response.body.serverMessage).toBe('Archived client deleted permanently');
      expect(emailTemplate.sendClientDataDeleted).toHaveBeenCalledWith(
        'John Doe',
        '2033-01-29',
        '2026-01-29'
      );
    });

    it('should return 404 when archived client is not found', async () => {
      adminQueries.adminGetArchivedClientById = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .post('/admin/deleteArchivedClient')
        .send({ clientID: 999 });

      expect(response.status).toBe(200);
      expect(response.body.statusCode).toBe(404);
      expect(response.body.serverMessage).toBe('Archived client not found');
    });

    it('should return 500 when deletion fails', async () => {
      const mockClient = {
        clientID: 1,
        fName: 'John',
        lName: 'Doe'
      };

      adminQueries.adminGetArchivedClientById = jest.fn().mockResolvedValue(mockClient);
      adminQueries.adminDeleteArchivedClient = jest.fn().mockResolvedValue(false);

      const response = await request(app)
        .post('/admin/deleteArchivedClient')
        .send({ clientID: 1 });

      expect(response.status).toBe(200);
      expect(response.body.statusCode).toBe(500);
    });
  });
});
