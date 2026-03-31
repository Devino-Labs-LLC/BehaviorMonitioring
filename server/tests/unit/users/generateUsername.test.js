jest.mock('../../../middleware/helpers/AdminQueries', () => ({
  adminExistbyUsername: jest.fn(),
}));

jest.mock('../../../middleware/helpers/EmployeeQueries', () => ({
  employeeExistbyUsername: jest.fn(),
}));

const adminQueries = require('../../../middleware/helpers/AdminQueries');
const employeeQueries = require('../../../middleware/helpers/EmployeeQueries');
const generateUsername = require('../../../functions/users/generateUsername');

describe('generateUsername', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the primary username when it is available', async () => {
    adminQueries.adminExistbyUsername.mockResolvedValue(false);

    await expect(generateUsername('Jane', 'Doe', 'admin')).resolves.toBe('jane.doe');
  });

  it('appends a suffix when the primary username already exists', async () => {
    adminQueries.adminExistbyUsername
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    await expect(generateUsername('Jane', 'Doe', 'admin')).resolves.toBe('jane.doe1');
  });

  it('falls back to the secondary username base after repeated collisions', async () => {
    adminQueries.adminExistbyUsername.mockImplementation(async (username) => username !== 'jdoe');

    await expect(generateUsername('Jane', 'Doe', 'admin')).resolves.toBe('jdoe');
  });

  it('checks employee usernames for employee roles', async () => {
    employeeQueries.employeeExistbyUsername.mockResolvedValue(false);

    await expect(generateUsername('John', 'Smith', 'employee')).resolves.toBe('john.smith');
    expect(employeeQueries.employeeExistbyUsername).toHaveBeenCalledWith('john.smith');
  });
});
