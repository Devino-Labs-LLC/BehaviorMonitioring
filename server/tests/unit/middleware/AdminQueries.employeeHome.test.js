jest.mock('../../../models', () => ({
  Employee: {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    destroy: jest.fn(),
    update: jest.fn(),
  },
  Home: {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    destroy: jest.fn(),
    update: jest.fn(),
  },
  Client: {
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
  },
}));

const adminQueries = require('../../../middleware/helpers/AdminQueries');
const { Employee, Home, Client } = require('../../../models');

describe('AdminQueries employee, home, and active-client helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('employee helpers', () => {
    it('returns all employees as plain objects', async () => {
      Employee.findAll.mockResolvedValue([
        { get: jest.fn(() => ({ employeeID: 1, username: 'alpha' })) },
        { get: jest.fn(() => ({ employeeID: 2, username: 'beta' })) },
      ]);

      await expect(adminQueries.adminGetAllEmployees(7)).resolves.toEqual([
        { employeeID: 1, username: 'alpha' },
        { employeeID: 2, username: 'beta' },
      ]);
    });

    it('reports whether an employee exists by username and id', async () => {
      Employee.findOne
        .mockResolvedValueOnce({ employeeID: 1 })
        .mockResolvedValueOnce(null);

      await expect(adminQueries.adminExistByUsername('alpha')).resolves.toBe(true);
      await expect(adminQueries.adminExistByID(9)).resolves.toBe(false);
    });

    it('returns employee data by username and id', async () => {
      Employee.findOne
        .mockResolvedValueOnce({ get: jest.fn(() => ({ username: 'alpha' })) })
        .mockResolvedValueOnce({ get: jest.fn(() => ({ employeeID: 9 })) })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      await expect(adminQueries.adminDataByUsername('alpha')).resolves.toEqual({ username: 'alpha' });
      await expect(adminQueries.adminDataById(9)).resolves.toEqual({ employeeID: 9 });
      await expect(adminQueries.adminDataByUsername('missing')).resolves.toBeNull();
      await expect(adminQueries.adminDataById(404)).resolves.toBeNull();
    });

    it('creates, updates, and deletes employee records', async () => {
      Employee.create.mockResolvedValue({});
      Employee.update
        .mockResolvedValueOnce([1])
        .mockResolvedValueOnce([1])
        .mockResolvedValueOnce([1])
        .mockResolvedValueOnce([1]);
      Employee.destroy
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(1);

      await expect(
        adminQueries.adminAddNewEmployee({
          fName: 'Ada',
          lName: 'Lovelace',
          username: 'ada.lovelace',
          email: 'ada@example.com',
          phone_number: '5551234567',
          role: 'Admin',
          account_status: 'Active',
          enteredBy: 'Root User',
          compID: 7,
          compName: 'BMetrics',
          dateEntered: '2026-03-31',
          timeEntered: '12:00',
        }),
      ).resolves.toBe(true);

      await expect(adminQueries.adminUpdateEmployeeAccountStatusByUsername('Active', 'ada.lovelace', 7)).resolves.toBe(true);
      await expect(adminQueries.adminUpdateEmployeeAccountStatusByID('Inactive', 9, 7)).resolves.toBe(true);
      await expect(
        adminQueries.adminUpdateEmployeeAccountByUsername('Ada', 'Lovelace', 'ada@example.com', '5551234567', 'Admin', 'ada.lovelace', 7),
      ).resolves.toBe(true);
      await expect(
        adminQueries.adminUpdateEmployeeAccountByID('Ada', 'Lovelace', 'ada@example.com', '5551234567', 'Admin', 9, 7),
      ).resolves.toBe(true);
      await expect(adminQueries.adminDeleteAnEmployeeByID(9, 7)).resolves.toBe(true);
      await expect(adminQueries.adminDeleteAnEmployeeByUsername('ada.lovelace', 7)).resolves.toBe(true);
    });

    it('returns false when employee updates or deletes affect no rows', async () => {
      Employee.update
        .mockResolvedValueOnce([0])
        .mockResolvedValueOnce([0])
        .mockResolvedValueOnce([0])
        .mockResolvedValueOnce([0]);
      Employee.destroy
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      await expect(adminQueries.adminUpdateEmployeeAccountStatusByUsername('Active', 'missing', 7)).resolves.toBe(false);
      await expect(adminQueries.adminUpdateEmployeeAccountStatusByID('Inactive', 404, 7)).resolves.toBe(false);
      await expect(
        adminQueries.adminUpdateEmployeeAccountByUsername('Ada', 'Lovelace', 'ada@example.com', '5551234567', 'Admin', 'missing', 7),
      ).resolves.toBe(false);
      await expect(
        adminQueries.adminUpdateEmployeeAccountByID('Ada', 'Lovelace', 'ada@example.com', '5551234567', 'Admin', 404, 7),
      ).resolves.toBe(false);
      await expect(adminQueries.adminDeleteAnEmployeeByID(404, 7)).resolves.toBe(false);
      await expect(adminQueries.adminDeleteAnEmployeeByUsername('missing', 7)).resolves.toBe(false);
    });

    it('wraps employee query failures as errors', async () => {
      Employee.findAll.mockRejectedValue('employee exploded');

      await expect(adminQueries.adminGetAllEmployees(7)).rejects.toThrow('employee exploded');
    });
  });

  describe('home helpers', () => {
    it('returns all homes as plain objects', async () => {
      Home.findAll.mockResolvedValue([
        { get: jest.fn(() => ({ homeID: 1, name: 'Sunrise' })) },
      ]);

      await expect(adminQueries.adminGetAllHomes(7)).resolves.toEqual([{ homeID: 1, name: 'Sunrise' }]);
    });

    it('reports whether homes exist by name and id', async () => {
      Home.findOne
        .mockResolvedValueOnce({ homeID: 1 })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ get: jest.fn(() => ({ name: 'Sunrise' })) })
        .mockResolvedValueOnce({ get: jest.fn(() => ({ homeID: 1 })) })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      await expect(adminQueries.homeExistByName('Sunrise', 7)).resolves.toBe(true);
      await expect(adminQueries.homeExistByID(99, 7)).resolves.toBe(false);
      await expect(adminQueries.homeDataByName('Sunrise', 7)).resolves.toEqual({ name: 'Sunrise' });
      await expect(adminQueries.homeDataById(1, 7)).resolves.toEqual({ homeID: 1 });
      await expect(adminQueries.homeDataByName('Missing', 7)).resolves.toBeNull();
      await expect(adminQueries.homeDataById(404, 7)).resolves.toBeNull();
    });

    it('creates, updates, and deletes homes', async () => {
      Home.create.mockResolvedValue({});
      Home.update
        .mockResolvedValueOnce([1])
        .mockResolvedValueOnce([1]);
      Home.destroy
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(1);

      await expect(
        adminQueries.adminAddNewHome({
          name: 'Sunrise',
          streetAddress: '123 Main St',
          city: 'Orlando',
          state: 'FL',
          zipCode: '32801',
          capacity: 6,
          currentOccupancy: 2,
          enteredBy: 'Root User',
          compID: 7,
          compName: 'BMetrics',
          dateEntered: '2026-03-31',
          timeEntered: '12:00',
        }),
      ).resolves.toBe(true);

      await expect(adminQueries.adminUpdateHomeByName('Sunrise 2', '123 Main St', 'Orlando', 'FL', '32801', 'Sunrise', 7)).resolves.toBe(true);
      await expect(
        adminQueries.adminUpdateHomeByID({
          name: 'Sunrise 2',
          streetAddress: '123 Main St',
          city: 'Orlando',
          state: 'FL',
          zipCode: '32801',
          capacity: 8,
          hID: 1,
          compID: 7,
        }),
      ).resolves.toBe(true);
      await expect(adminQueries.adminDeleteAHomeByID(1, 7)).resolves.toBe(true);
      await expect(adminQueries.adminDeleteAHomeByName('Sunrise 2', 7)).resolves.toBe(true);
    });

    it('returns false when home updates or deletes affect no rows', async () => {
      Home.update
        .mockResolvedValueOnce([0])
        .mockResolvedValueOnce([0]);
      Home.destroy
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      await expect(adminQueries.adminUpdateHomeByName('Sunrise 2', '123 Main St', 'Orlando', 'FL', '32801', 'Missing', 7)).resolves.toBe(false);
      await expect(
        adminQueries.adminUpdateHomeByID({
          name: 'Sunrise 2',
          streetAddress: '123 Main St',
          city: 'Orlando',
          state: 'FL',
          zipCode: '32801',
          capacity: 8,
          hID: 404,
          compID: 7,
        }),
      ).resolves.toBe(false);
      await expect(adminQueries.adminDeleteAHomeByID(404, 7)).resolves.toBe(false);
      await expect(adminQueries.adminDeleteAHomeByName('Missing', 7)).resolves.toBe(false);
    });

    it('wraps home query failures as errors', async () => {
      Home.findAll.mockRejectedValue(new Error('home exploded'));

      await expect(adminQueries.adminGetAllHomes(7)).rejects.toThrow('home exploded');
    });
  });

  describe('active client helpers', () => {
    it('returns active client existence and plain client data', async () => {
      Client.findOne
        .mockResolvedValueOnce({ clientID: 12 })
        .mockResolvedValueOnce({ get: jest.fn(() => ({ clientID: 12, fName: 'John' })) })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      await expect(adminQueries.clientExistByID(12, 7)).resolves.toBe(true);
      await expect(adminQueries.clientDataById(12, 7)).resolves.toEqual({ clientID: 12, fName: 'John' });
      await expect(adminQueries.clientExistByID(404, 7)).resolves.toBe(false);
      await expect(adminQueries.clientDataById(404, 7)).resolves.toBeNull();
    });

    it('creates, updates, and deletes active clients', async () => {
      Client.create.mockResolvedValue({
        get: jest.fn(() => ({ clientID: 12, fName: 'John', lName: 'Doe' })),
      });
      Client.update.mockResolvedValue([1]);
      Client.destroy.mockResolvedValue(1);

      await expect(
        adminQueries.adminAddNewClient({
          fName: 'John',
          lName: 'Doe',
          DOB: '2000-01-01',
          intakeDate: '2026-01-01',
          groupHomeName: 'Sunrise',
          medicaidIdNumber: '12345',
          behaviorPlanDueDate: '2026-12-31',
          enteredBy: 'Root User',
          compID: 7,
          compName: 'BMetrics',
          dateEntered: '2026-03-31',
          timeEntered: '12:00',
        }),
      ).resolves.toEqual({ clientID: 12, fName: 'John', lName: 'Doe' });

      await expect(
        adminQueries.adminUpdateClient({
          clientID: 12,
          fName: 'John',
          lName: 'Doe',
          DOB: '2000-01-01',
          intakeDate: '2026-01-01',
          groupHomeName: 'Sunrise',
          medicaidIdNumber: '12345',
          behaviorPlanDueDate: '2026-12-31',
          compID: 7,
        }),
      ).resolves.toBe(true);

      await expect(adminQueries.adminDeleteClient(12, 7)).resolves.toBe(true);
    });

    it('returns false when active-client updates or deletes affect no rows', async () => {
      Client.update.mockResolvedValueOnce([0]);
      Client.destroy.mockResolvedValueOnce(0);

      await expect(
        adminQueries.adminUpdateClient({
          clientID: 404,
          fName: 'John',
          lName: 'Doe',
          DOB: '2000-01-01',
          intakeDate: '2026-01-01',
          groupHomeName: 'Sunrise',
          medicaidIdNumber: '12345',
          behaviorPlanDueDate: '2026-12-31',
          compID: 7,
        }),
      ).resolves.toBe(false);

      await expect(adminQueries.adminDeleteClient(404, 7)).resolves.toBe(false);
    });

    it('wraps active client failures as errors', async () => {
      Client.create.mockRejectedValue('client exploded');

      await expect(
        adminQueries.adminAddNewClient({
          fName: 'John',
          lName: 'Doe',
          DOB: '2000-01-01',
          intakeDate: '2026-01-01',
          groupHomeName: 'Sunrise',
          medicaidIdNumber: '12345',
          behaviorPlanDueDate: '2026-12-31',
          enteredBy: 'Root User',
          compID: 7,
          compName: 'BMetrics',
          dateEntered: '2026-03-31',
          timeEntered: '12:00',
        }),
      ).rejects.toThrow('client exploded');
    });
  });
});
