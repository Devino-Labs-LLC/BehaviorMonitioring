const request = require('supertest');
const express = require('express');
const employeeRoutes = require('../../../routes/Employee');

jest.mock('../../../middleware/helpers/EmployeeQueries', () => ({
  employeeExistByUsername: jest.fn(),
  employeeDataByUsername: jest.fn(),
  employeeExistByID: jest.fn(),
  employeePasswordById: jest.fn(),
  employeeUpdateEmployeeAccountByID: jest.fn(),
  behaviorSkillExistByID: jest.fn(),
  employeeAddRateBehaviorData: jest.fn(),
  employeeAddFrequencyBehaviorData: jest.fn(),
  employeeAddDurationBehaviorData: jest.fn(),
}));

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

jest.mock('../../../functions/base/currentDateTime', () => ({
  getCurrentDate: jest.fn().mockResolvedValue('2026-03-30'),
  getCurrentTime: jest.fn().mockResolvedValue('10:30 AM'),
}));

jest.mock('../../../functions/base/dateTimeFormat', () => ({
  formatDateString: jest.fn().mockResolvedValue('03/30/2026'),
}));

jest.mock('../../../middleware/helpers/authorizationHelper', () => ({
  verifyAuthorization: jest.fn(),
}));

const employeeQueries = require('../../../middleware/helpers/EmployeeQueries');
const bcrypt = require('bcryptjs');
const { verifyAuthorization } = require('../../../middleware/helpers/authorizationHelper');

const app = express();
app.use(express.json());
app.use('/employee', employeeRoutes);

function mockAuthenticatedEmployee(overrides = {}) {
  const employeeData = {
    employeeID: 99,
    username: 'aba.user',
    role: 'admin',
    fName: 'Aba',
    lName: 'User',
    companyID: 1,
    companyName: 'Acme Corporation',
    ...overrides,
  };
  verifyAuthorization.mockResolvedValue(employeeData);
  return employeeData;
}

describe('Employee API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthenticatedEmployee();
  });

  describe('POST /employee/getEmployeeData', () => {
    it('returns employee data for an authorized user', async () => {
      verifyAuthorization.mockResolvedValue([
        {
          employeeID: 99,
          username: 'aba.user',
          role: 'admin',
          fName: 'Aba',
          lName: 'User',
          companyID: 1,
          companyName: 'Acme Corporation',
        },
      ]);

      const response = await request(app)
        .post('/employee/getEmployeeData')
        .send({ employeeUsername: 'aba.user' });

      expect(response.status).toBe(200);
      expect(response.body.statusCode).toBe(200);
      expect(response.body.employeeData[0]).toEqual(
        expect.objectContaining({
          username: 'aba.user',
          role: 'admin',
        })
      );
    });
  });

  describe('POST /employee/updateEmployeeData', () => {
    it('rejects unauthorized employees', async () => {
      employeeQueries.employeeExistByID.mockResolvedValue(false);

      const response = await request(app)
        .post('/employee/updateEmployeeData')
        .send({
          employeeID: 1,
          fName: 'Jane',
          lName: 'Doe',
          email: 'jane@example.com',
          pNumber: '5551112222',
          password: 'old-password',
          newPassword: 'new-password',
        });

      expect(response.body).toEqual({
        statusCode: 401,
        updateStatus: false,
        serverMessage: 'Unauthorized user',
      });
    });

    it('rejects incorrect credentials', async () => {
      employeeQueries.employeeExistByID.mockResolvedValue(true);
      employeeQueries.employeePasswordById.mockResolvedValue({ password: 'hashed-password' });
      bcrypt.compare.mockImplementation((plainTextPassword, hashedPassword, callback) => {
        callback(null, false);
      });

      const response = await request(app)
        .post('/employee/updateEmployeeData')
        .send({
          employeeID: 1,
          fName: 'Jane',
          lName: 'Doe',
          email: 'jane@example.com',
          pNumber: '5551112222',
          password: 'old-password',
          newPassword: 'new-password',
        });

      expect(response.body).toEqual({
        statusCode: 401,
        updateStatus: false,
        serverMessage: 'Incorrect credentials',
      });
    });

    it('updates employee data when credentials are valid', async () => {
      employeeQueries.employeeExistByID.mockResolvedValue(true);
      employeeQueries.employeePasswordById.mockResolvedValue({ password: 'hashed-password' });
      employeeQueries.employeeUpdateEmployeeAccountByID.mockResolvedValue(true);
      bcrypt.compare.mockImplementation((plainTextPassword, hashedPassword, callback) => {
        callback(null, true);
      });
      bcrypt.hash.mockImplementation((password, rounds, callback) => {
        callback(null, 'new-hash');
      });

      const response = await request(app)
        .post('/employee/updateEmployeeData')
        .send({
          employeeID: 1,
          fName: 'Jane',
          lName: 'Doe',
          email: 'jane@example.com',
          pNumber: '5551112222',
          password: 'old-password',
          newPassword: 'new-password',
        });

      expect(response.body).toEqual({
        statusCode: 200,
        updateStatus: true,
      });
      expect(employeeQueries.employeeUpdateEmployeeAccountByID).toHaveBeenCalledWith(
        'Jane',
        'Doe',
        'jane@example.com',
        '5551112222',
        'new-hash',
        1
      );
    });
  });

  describe('POST /employee/addBehaviorData', () => {
    it('returns a server error when the behavior does not exist', async () => {
      employeeQueries.behaviorSkillExistByID.mockResolvedValue(false);

      const response = await request(app)
        .post('/employee/addBehaviorData')
        .send({
          employeeUsername: 'aba.user',
          bsID: 12,
          clientID: 45,
          clientName: 'Client Example',
          sessionDate: '2026-03-30',
          sessionTime: '10:00',
          count: 1,
          duration: 0,
          trial: 0,
        });

      expect(response.body).toEqual({
        statusCode: 500,
        serverMessage: 'Behavior does not exist',
      });
    });

    it('adds frequency behavior data', async () => {
      employeeQueries.behaviorSkillExistByID.mockResolvedValue(true);
      employeeQueries.employeeAddFrequencyBehaviorData.mockResolvedValue(true);

      const response = await request(app)
        .post('/employee/addBehaviorData')
        .send({
          employeeUsername: 'aba.user',
          bsID: 12,
          clientID: 45,
          clientName: 'Client Example',
          sessionDate: '2026-03-30',
          sessionTime: '10:00',
          count: 3,
          duration: 0,
          trial: 0,
        });

      expect(response.body).toEqual({
        statusCode: 200,
        behaviorAdded: true,
      });
      expect(employeeQueries.employeeAddFrequencyBehaviorData).toHaveBeenCalledWith(
        expect.objectContaining({
          bsID: 12,
          cID: 45,
          cName: 'Client Example',
          count: 3,
          enteredBy: 'Aba User',
          compID: 1,
        })
      );
    });

    it('adds rate behavior data when count and duration are both provided', async () => {
      employeeQueries.behaviorSkillExistByID.mockResolvedValue(true);
      employeeQueries.employeeAddRateBehaviorData.mockResolvedValue(true);

      const response = await request(app)
        .post('/employee/addBehaviorData')
        .send({
          employeeUsername: 'aba.user',
          bsID: 12,
          clientID: 45,
          clientName: 'Client Example',
          sessionDate: '2026-03-30',
          sessionTime: '10:00',
          count: 2,
          duration: 15,
          trial: 0,
        });

      expect(response.body).toEqual({
        statusCode: 200,
        behaviorAdded: true,
      });
      expect(employeeQueries.employeeAddRateBehaviorData).toHaveBeenCalledWith(
        expect.objectContaining({
          bsID: 12,
          duration: 15,
          count: 2,
        })
      );
    });

    it('adds duration behavior data when trial data is provided', async () => {
      employeeQueries.behaviorSkillExistByID.mockResolvedValue(true);
      employeeQueries.employeeAddDurationBehaviorData.mockResolvedValue(true);

      const response = await request(app)
        .post('/employee/addBehaviorData')
        .send({
          employeeUsername: 'aba.user',
          bsID: 12,
          clientID: 45,
          clientName: 'Client Example',
          sessionDate: '2026-03-30',
          sessionTime: '10:00',
          count: 0,
          duration: 0,
          trial: 1,
        });

      expect(response.body).toEqual({
        statusCode: 200,
        behaviorAdded: true,
      });
      expect(employeeQueries.employeeAddDurationBehaviorData).toHaveBeenCalledWith(
        expect.objectContaining({
          bsID: 12,
          trial: 1,
        })
      );
    });
  });
});
