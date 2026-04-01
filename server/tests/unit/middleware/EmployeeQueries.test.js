const {
  Employee,
  BehaviorAndSkill,
  BehaviorData,
} = require('../../../models');
const employeeQueries = require('../../../middleware/helpers/EmployeeQueries');

jest.mock('../../../models', () => ({
  Employee: {
    findOne: jest.fn(),
    update: jest.fn(),
  },
  BehaviorAndSkill: {
    findOne: jest.fn(),
  },
  BehaviorData: {
    create: jest.fn(),
  },
}));

describe('EmployeeQueries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('employee lookups', () => {
    it('returns whether an employee exists by username', async () => {
      Employee.findOne.mockResolvedValue({ employeeID: 1 });

      await expect(employeeQueries.employeeExistByUsername('jdoe')).resolves.toBe(true);
      expect(Employee.findOne).toHaveBeenCalledWith({
        where: { username: 'jdoe' },
      });
    });

    it('returns whether an employee exists by id', async () => {
      Employee.findOne.mockResolvedValue({ employeeID: 8 });

      await expect(employeeQueries.employeeExistByID(8)).resolves.toBe(true);
      expect(Employee.findOne).toHaveBeenCalledWith({
        where: { employeeID: 8 },
      });
    });

    it('returns false when employee existence lookups do not match', async () => {
      Employee.findOne.mockResolvedValue(null);

      await expect(employeeQueries.employeeExistByUsername('missing')).resolves.toBe(false);
      await expect(employeeQueries.employeeExistByID(404)).resolves.toBe(false);
    });

    it('returns employee data by username as plain data', async () => {
      Employee.findOne.mockResolvedValue({
        get: jest.fn(() => ({
          employeeID: 1,
          fName: 'John',
          lName: 'Doe',
          username: 'jdoe',
        })),
      });

      await expect(employeeQueries.employeeDataByUsername('jdoe')).resolves.toEqual(
        expect.objectContaining({
          employeeID: 1,
          username: 'jdoe',
        }),
      );
    });

    it('returns employee data by id as plain data', async () => {
      Employee.findOne.mockResolvedValue({
        get: jest.fn(() => ({
          employeeID: 8,
          fName: 'Jane',
          lName: 'Smith',
          username: 'jsmith',
        })),
      });

      await expect(employeeQueries.employeeDataById(8)).resolves.toEqual(
        expect.objectContaining({
          employeeID: 8,
          username: 'jsmith',
        }),
      );
    });

    it('returns null when username and id lookups do not match an employee', async () => {
      Employee.findOne.mockResolvedValue(null);

      await expect(employeeQueries.employeeDataByUsername('missing')).resolves.toBeNull();
      await expect(employeeQueries.employeeDataById(404)).resolves.toBeNull();
    });

    it('returns password data by username as plain data', async () => {
      Employee.findOne.mockResolvedValue({
        get: jest.fn(() => ({ password: 'hashed-password' })),
      });

      await expect(employeeQueries.employeePasswordByUsername('jdoe')).resolves.toEqual({
        password: 'hashed-password',
      });
      expect(Employee.findOne).toHaveBeenCalledWith({
        where: { username: 'jdoe' },
        attributes: ['password'],
      });
    });

    it('returns password data by id as plain data', async () => {
      Employee.findOne.mockResolvedValue({
        get: jest.fn(() => ({ password: 'hashed-password' })),
      });

      await expect(employeeQueries.employeePasswordById(9)).resolves.toEqual({
        password: 'hashed-password',
      });
      expect(Employee.findOne).toHaveBeenCalledWith({
        where: { employeeID: 9 },
        attributes: ['password'],
      });
    });

    it('returns null when password lookups do not match an employee', async () => {
      Employee.findOne.mockResolvedValue(null);

      await expect(employeeQueries.employeePasswordByUsername('missing')).resolves.toBeNull();
      await expect(employeeQueries.employeePasswordById(404)).resolves.toBeNull();
    });

    it('returns null when no employee matches a reset token', async () => {
      Employee.findOne.mockResolvedValue(null);

      await expect(employeeQueries.employeeDataByResetToken('missing-token')).resolves.toBeNull();
    });

    it('returns employee data by reset token as plain data', async () => {
      Employee.findOne.mockResolvedValue({
        get: jest.fn(() => ({
          employeeID: 12,
          username: 'janedoe',
          password_reset_expires: '2026-04-02T00:00:00.000Z',
        })),
      });

      await expect(employeeQueries.employeeDataByResetToken('valid-token')).resolves.toEqual(
        expect.objectContaining({
          employeeID: 12,
          password_reset_expires: '2026-04-02T00:00:00.000Z',
        }),
      );
    });

    it('returns employee data by email as plain data', async () => {
      Employee.findOne.mockResolvedValue({
        get: jest.fn(() => ({
          employeeID: 4,
          email: 'jane@example.com',
        })),
      });

      await expect(employeeQueries.employeeDataByEmail('jane@example.com')).resolves.toEqual(
        expect.objectContaining({
          employeeID: 4,
          email: 'jane@example.com',
        }),
      );
    });

    it('returns null when no employee matches the requested email', async () => {
      Employee.findOne.mockResolvedValue(null);

      await expect(employeeQueries.employeeDataByEmail('missing@example.com')).resolves.toBeNull();
    });
  });

  describe('employee updates', () => {
    it('updates an employee account by username with a password', async () => {
      Employee.update.mockResolvedValue([1]);

      await expect(
        employeeQueries.employeeUpdateEmployeeAccountByUsername(
          'John',
          'Doe',
          'john@example.com',
          '555-111-2222',
          'hashed-password',
          'jdoe',
          4,
        ),
      ).resolves.toBe(true);

      expect(Employee.update).toHaveBeenCalledWith(
        {
          fName: 'John',
          lName: 'Doe',
          email: 'john@example.com',
          phone_number: '555-111-2222',
          password: 'hashed-password',
        },
        { where: { username: 'jdoe', companyID: 4 } },
      );
    });

    it('updates an employee account by id with a password', async () => {
      Employee.update.mockResolvedValue([1]);

      await expect(
        employeeQueries.employeeUpdateEmployeeAccountByID(
          'John',
          'Doe',
          'john@example.com',
          '555-111-2222',
          'hashed-password',
          8,
          4,
        ),
      ).resolves.toBe(true);

      expect(Employee.update).toHaveBeenCalledWith(
        {
          fName: 'John',
          lName: 'Doe',
          email: 'john@example.com',
          phone_number: '555-111-2222',
          password: 'hashed-password',
        },
        { where: { employeeID: 8, companyID: 4 } },
      );
    });

    it('updates an employee account by username without a password', async () => {
      Employee.update.mockResolvedValue([1]);

      await expect(
        employeeQueries.employeeUpdateEmployeeAccountWithoutPasswordByUsername(
          'Jane',
          'Smith',
          'jane@example.com',
          '555-333-4444',
          'jsmith',
          12,
        ),
      ).resolves.toBe(true);

      expect(Employee.update).toHaveBeenCalledWith(
        {
          fName: 'Jane',
          lName: 'Smith',
          email: 'jane@example.com',
          phone_number: '555-333-4444',
        },
        { where: { username: 'jsmith', companyID: 12 } },
      );
    });

    it('updates an employee account by id without a password', async () => {
      Employee.update.mockResolvedValue([1]);

      await expect(
        employeeQueries.employeeUpdateEmployeeAccountWithoutPasswordByID(
          'Jane',
          'Smith',
          'jane@example.com',
          '555-333-4444',
          8,
          12,
        ),
      ).resolves.toBe(true);

      expect(Employee.update).toHaveBeenCalledWith(
        {
          fName: 'Jane',
          lName: 'Smith',
          email: 'jane@example.com',
          phone_number: '555-333-4444',
        },
        { where: { employeeID: 8, companyID: 12 } },
      );
    });

    it('updates employee account status by username', async () => {
      Employee.update.mockResolvedValue([1]);

      await expect(
        employeeQueries.employeeUpdateEmployeeAccountStatusByUsername('Active', 'jdoe', 4),
      ).resolves.toBe(true);

      expect(Employee.update).toHaveBeenCalledWith(
        { account_status: 'Active' },
        { where: { username: 'jdoe', companyID: 4 } },
      );
    });

    it('sets password reset metadata for an employee', async () => {
      const expiryDate = new Date('2026-04-01T12:00:00.000Z');
      Employee.update.mockResolvedValue([1]);

      await expect(
        employeeQueries.employeeSetPasswordResetToken(6, 'reset-token', expiryDate),
      ).resolves.toBe(true);

      expect(Employee.update).toHaveBeenCalledWith(
        {
          password_reset_token: 'reset-token',
          password_reset_expires: expiryDate,
        },
        { where: { employeeID: 6 } },
      );
    });

    it('updates employee account status by id', async () => {
      Employee.update.mockResolvedValue([1]);

      await expect(
        employeeQueries.employeeUpdateEmployeeStatusAccountByID('Inactive', 6, 10),
      ).resolves.toBe(true);

      expect(Employee.update).toHaveBeenCalledWith(
        { account_status: 'Inactive' },
        { where: { employeeID: 6, companyID: 10 } },
      );
    });

    it('sets employee credentials by username', async () => {
      Employee.update.mockResolvedValue([1]);

      await expect(
        employeeQueries.employeeSetEmployeeCredentialsByUsername('new-hash', 'jdoe', 4),
      ).resolves.toBe(true);

      expect(Employee.update).toHaveBeenCalledWith(
        { password: 'new-hash' },
        { where: { username: 'jdoe', companyID: 4 } },
      );
    });

    it('sets employee credentials by id', async () => {
      Employee.update.mockResolvedValue([1]);

      await expect(employeeQueries.employeeSetEmployeeCredentialsByID('new-hash', 6, 4)).resolves.toBe(
        true,
      );

      expect(Employee.update).toHaveBeenCalledWith(
        { password: 'new-hash' },
        { where: { employeeID: 6, companyID: 4 } },
      );
    });

    it('resets a password and clears reset token fields', async () => {
      Employee.update.mockResolvedValue([1]);

      await expect(employeeQueries.employeeResetPassword(6, 'new-hash')).resolves.toBe(true);

      expect(Employee.update).toHaveBeenCalledWith(
        {
          password: 'new-hash',
          password_reset_token: null,
          password_reset_expires: null,
        },
        { where: { employeeID: 6 } },
      );
    });

    it('returns false when a credentials update affects no rows', async () => {
      Employee.update.mockResolvedValue([0]);

      await expect(employeeQueries.employeeSetEmployeeCredentialsByUsername('new-hash', 'jdoe', 4)).resolves.toBe(false);
    });

    it('returns false when other employee updates affect no rows', async () => {
      Employee.update
        .mockResolvedValueOnce([0])
        .mockResolvedValueOnce([0])
        .mockResolvedValueOnce([0])
        .mockResolvedValueOnce([0])
        .mockResolvedValueOnce([0])
        .mockResolvedValueOnce([0])
        .mockResolvedValueOnce([0])
        .mockResolvedValueOnce([0]);

      await expect(
        employeeQueries.employeeUpdateEmployeeAccountByUsername(
          'John',
          'Doe',
          'john@example.com',
          '555-111-2222',
          'hashed-password',
          'missing',
          4,
        ),
      ).resolves.toBe(false);
      await expect(
        employeeQueries.employeeUpdateEmployeeAccountByID(
          'John',
          'Doe',
          'john@example.com',
          '555-111-2222',
          'hashed-password',
          404,
          4,
        ),
      ).resolves.toBe(false);
      await expect(
        employeeQueries.employeeUpdateEmployeeAccountWithoutPasswordByUsername(
          'Jane',
          'Smith',
          'jane@example.com',
          '555-333-4444',
          'missing',
          12,
        ),
      ).resolves.toBe(false);
      await expect(
        employeeQueries.employeeUpdateEmployeeAccountWithoutPasswordByID(
          'Jane',
          'Smith',
          'jane@example.com',
          '555-333-4444',
          404,
          12,
        ),
      ).resolves.toBe(false);
      await expect(
        employeeQueries.employeeUpdateEmployeeAccountStatusByUsername('Active', 'missing', 4),
      ).resolves.toBe(false);
      await expect(
        employeeQueries.employeeUpdateEmployeeStatusAccountByID('Inactive', 404, 10),
      ).resolves.toBe(false);
      await expect(
        employeeQueries.employeeSetPasswordResetToken(404, 'reset-token', new Date('2026-04-01T12:00:00.000Z')),
      ).resolves.toBe(false);
      await expect(employeeQueries.employeeResetPassword(404, 'new-hash')).resolves.toBe(false);
    });
  });

  describe('behavior helpers', () => {
    it('returns whether a behavior skill exists', async () => {
      BehaviorAndSkill.findOne.mockResolvedValue({ bsID: 3 });

      await expect(employeeQueries.behaviorSkillExistByID(3, 11)).resolves.toBe(true);
      expect(BehaviorAndSkill.findOne).toHaveBeenCalledWith({
        where: { bsID: 3, companyID: 11 },
      });
    });

    it('returns false when a behavior skill does not exist', async () => {
      BehaviorAndSkill.findOne.mockResolvedValue(null);

      await expect(employeeQueries.behaviorSkillExistByID(999, 11)).resolves.toBe(false);
    });

    it('creates frequency behavior data with active status', async () => {
      BehaviorData.create.mockResolvedValue({ behaviorDataID: 5 });

      await expect(
        employeeQueries.employeeAddFrequencyBehaviorData({
          bsID: 3,
          cID: 10,
          cName: 'John Doe',
          sDate: '2026-03-31',
          sTime: '10:00',
          count: 4,
          enteredBy: 'testuser',
          compID: 11,
          compName: 'BMetrics',
          dateEntered: '2026-03-31',
          timeEntered: '10:05',
        }),
      ).resolves.toBe(true);

      expect(BehaviorData.create).toHaveBeenCalledWith(
        expect.objectContaining({
          bsID: 3,
          clientID: 10,
          count: 4,
          entered_by: 'testuser',
          status: 'Active',
        }),
      );
    });

    it('creates rate behavior data with duration', async () => {
      BehaviorData.create.mockResolvedValue({ behaviorDataID: 6 });

      await expect(
        employeeQueries.employeeAddRateBehaviorData({
          bsID: 3,
          cID: 10,
          cName: 'John Doe',
          sDate: '2026-03-31',
          sTime: '11:00',
          count: 2,
          duration: '00:15:00',
          enteredBy: 'testuser',
          compID: 11,
          compName: 'BMetrics',
          dateEntered: '2026-03-31',
          timeEntered: '11:05',
        }),
      ).resolves.toBe(true);

      expect(BehaviorData.create).toHaveBeenCalledWith(
        expect.objectContaining({
          duration: '00:15:00',
          count: 2,
          status: 'Active',
        }),
      );
    });

    it('creates duration behavior data using the provided trial value', async () => {
      BehaviorData.create.mockResolvedValue({ behaviorDataID: 7 });

      await expect(
        employeeQueries.employeeAddDurationBehaviorData({
          bsID: 3,
          cID: 10,
          cName: 'John Doe',
          sDate: '2026-03-31',
          sTime: '12:00',
          trial: '00:02:30',
          enteredBy: 'testuser',
          compID: 11,
          compName: 'BMetrics',
          dateEntered: '2026-03-31',
          timeEntered: '12:05',
        }),
      ).resolves.toBe(true);

      expect(BehaviorData.create).toHaveBeenCalledWith(
        expect.objectContaining({
          duration: '00:02:30',
          status: 'Active',
        }),
      );
    });
  });

  describe('error handling', () => {
    it('rethrows lookup errors as Error instances', async () => {
      Employee.findOne.mockRejectedValue('lookup failed');

      await expect(employeeQueries.employeeExistByUsername('jdoe')).rejects.toThrow('lookup failed');
      await expect(employeeQueries.employeeExistByID(4)).rejects.toThrow('lookup failed');
    });

    it.each([
      ['employeeDataByUsername', () => employeeQueries.employeeDataByUsername('jdoe')],
      ['employeeDataById', () => employeeQueries.employeeDataById(7)],
      ['employeePasswordByUsername', () => employeeQueries.employeePasswordByUsername('jdoe')],
      ['employeePasswordById', () => employeeQueries.employeePasswordById(7)],
      ['employeeDataByEmail', () => employeeQueries.employeeDataByEmail('jane@example.com')],
      ['employeeDataByResetToken', () => employeeQueries.employeeDataByResetToken('reset-token')],
      [
        'behaviorSkillExistByID',
        () => employeeQueries.behaviorSkillExistByID(3, 11),
      ],
    ])('rethrows lookup errors for %s', async (_name, runQuery) => {
      Employee.findOne.mockRejectedValue(new Error('lookup failed'));
      BehaviorAndSkill.findOne.mockRejectedValue(new Error('lookup failed'));

      await expect(runQuery()).rejects.toThrow('lookup failed');
    });

    it.each([
      [
        'employeeUpdateEmployeeAccountByUsername',
        () =>
          employeeQueries.employeeUpdateEmployeeAccountByUsername(
            'John',
            'Doe',
            'john@example.com',
            '555-111-2222',
            'hashed-password',
            'jdoe',
            4,
          ),
      ],
      [
        'employeeUpdateEmployeeAccountByID',
        () =>
          employeeQueries.employeeUpdateEmployeeAccountByID(
            'John',
            'Doe',
            'john@example.com',
            '555-111-2222',
            'hashed-password',
            8,
            4,
          ),
      ],
      [
        'employeeUpdateEmployeeAccountWithoutPasswordByUsername',
        () =>
          employeeQueries.employeeUpdateEmployeeAccountWithoutPasswordByUsername(
            'Jane',
            'Smith',
            'jane@example.com',
            '555-333-4444',
            'jsmith',
            12,
          ),
      ],
      [
        'employeeUpdateEmployeeAccountWithoutPasswordByID',
        () =>
          employeeQueries.employeeUpdateEmployeeAccountWithoutPasswordByID(
            'Jane',
            'Smith',
            'jane@example.com',
            '555-333-4444',
            8,
            12,
          ),
      ],
      [
        'employeeUpdateEmployeeAccountStatusByUsername',
        () => employeeQueries.employeeUpdateEmployeeAccountStatusByUsername('Active', 'jdoe', 4),
      ],
      [
        'employeeUpdateEmployeeStatusAccountByID',
        () => employeeQueries.employeeUpdateEmployeeStatusAccountByID('Inactive', 8, 4),
      ],
      [
        'employeeSetEmployeeCredentialsByUsername',
        () => employeeQueries.employeeSetEmployeeCredentialsByUsername('new-hash', 'jdoe', 4),
      ],
      [
        'employeeSetEmployeeCredentialsByID',
        () => employeeQueries.employeeSetEmployeeCredentialsByID('new-hash', 8, 4),
      ],
      [
        'employeeSetPasswordResetToken',
        () =>
          employeeQueries.employeeSetPasswordResetToken(
            8,
            'reset-token',
            new Date('2026-04-01T12:00:00.000Z'),
          ),
      ],
      [
        'employeeResetPassword',
        () => employeeQueries.employeeResetPassword(8, 'new-hash'),
      ],
    ])('rethrows update errors for %s', async (_name, runQuery) => {
      Employee.update.mockRejectedValue(new Error('update failed'));

      await expect(runQuery()).rejects.toThrow('update failed');
    });

    it('rethrows behavior creation errors', async () => {
      BehaviorData.create.mockRejectedValue(new Error('create failed'));

      await expect(
        employeeQueries.employeeAddFrequencyBehaviorData({
          bsID: 3,
          cID: 10,
          cName: 'John Doe',
          sDate: '2026-03-31',
          sTime: '10:00',
          count: 4,
          enteredBy: 'testuser',
          compID: 11,
          compName: 'BMetrics',
          dateEntered: '2026-03-31',
          timeEntered: '10:05',
        }),
      ).rejects.toThrow('create failed');
    });

    it('rethrows rate and duration behavior creation errors', async () => {
      BehaviorData.create
        .mockRejectedValueOnce(new Error('create failed'))
        .mockRejectedValueOnce(new Error('create failed'));

      await expect(
        employeeQueries.employeeAddRateBehaviorData({
          bsID: 3,
          cID: 10,
          cName: 'John Doe',
          sDate: '2026-03-31',
          sTime: '11:00',
          count: 2,
          duration: '00:15:00',
          enteredBy: 'testuser',
          compID: 11,
          compName: 'BMetrics',
          dateEntered: '2026-03-31',
          timeEntered: '11:05',
        }),
      ).rejects.toThrow('create failed');

      await expect(
        employeeQueries.employeeAddDurationBehaviorData({
          bsID: 3,
          cID: 10,
          cName: 'John Doe',
          sDate: '2026-03-31',
          sTime: '12:00',
          trial: '00:02:30',
          enteredBy: 'testuser',
          compID: 11,
          compName: 'BMetrics',
          dateEntered: '2026-03-31',
          timeEntered: '12:05',
        }),
      ).rejects.toThrow('create failed');
    });
  });
});
