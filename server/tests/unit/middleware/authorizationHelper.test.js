jest.mock('../../../middleware/helpers/EmployeeQueries', () => ({
  employeeExistByUsername: jest.fn(),
  employeeDataByUsername: jest.fn(),
}));

const employeeQueries = require('../../../middleware/helpers/EmployeeQueries');
const {
  getAuthenticatedUser,
  hasRole,
  hasValidCompanyScope,
  verifyAuthorization,
  verifyBasicAuthentication,
  verifyABAAuthorization,
  verifyAdminAuthorization,
} = require('../../../middleware/helpers/authorizationHelper');

describe('authorizationHelper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('gets the authenticated user with a normalized username', async () => {
    employeeQueries.employeeExistByUsername.mockResolvedValue(true);
    employeeQueries.employeeDataByUsername.mockResolvedValue({ username: 'admin.user' });

    await expect(getAuthenticatedUser('Admin.User')).resolves.toEqual({ username: 'admin.user' });
    expect(employeeQueries.employeeExistByUsername).toHaveBeenCalledWith('admin.user');
    expect(employeeQueries.employeeDataByUsername).toHaveBeenCalledWith('admin.user');
  });

  it('returns null when no username is provided or the user does not exist', async () => {
    employeeQueries.employeeExistByUsername.mockResolvedValue(false);

    await expect(getAuthenticatedUser('')).resolves.toBeNull();
    await expect(getAuthenticatedUser('missing.user')).resolves.toBeNull();
  });

  it('checks roles case-insensitively', () => {
    expect(hasRole({ role: 'Admin' }, ['root', 'admin'])).toBe(true);
    expect(hasRole({ role: 'Technician' }, ['root', 'admin'])).toBe(false);
  });

  it('checks for a valid company scope', () => {
    expect(hasValidCompanyScope({ companyID: 1 })).toBe(true);
    expect(hasValidCompanyScope({ companyID: 0 })).toBe(false);
  });

  it('returns employee data when the user is authorized', async () => {
    employeeQueries.employeeExistByUsername.mockResolvedValue(true);
    employeeQueries.employeeDataByUsername.mockResolvedValue({
      username: 'admin.user',
      role: 'admin',
      companyID: 1,
    });
    const res = { json: jest.fn() };

    await expect(
      verifyAuthorization({ body: { employeeUsername: 'admin.user' } }, res)
    ).resolves.toEqual({
      username: 'admin.user',
      role: 'admin',
      companyID: 1,
    });
    expect(res.json).not.toHaveBeenCalled();
  });

  it('rejects users without a valid company scope', async () => {
    employeeQueries.employeeExistByUsername.mockResolvedValue(true);
    employeeQueries.employeeDataByUsername.mockResolvedValue({
      username: 'admin.user',
      role: 'admin',
      companyID: 0,
    });
    const res = { json: jest.fn() };

    await expect(
      verifyAuthorization({ body: { employeeUsername: 'admin.user' } }, res)
    ).resolves.toBeNull();
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 403,
      serverMessage: 'User is not assigned to a valid company',
    });
  });

  it('rejects users with the wrong role', async () => {
    employeeQueries.employeeExistByUsername.mockResolvedValue(true);
    employeeQueries.employeeDataByUsername.mockResolvedValue({
      username: 'employee.user',
      role: 'employee',
      companyID: 1,
    });
    const res = { json: jest.fn() };

    await expect(
      verifyAuthorization({ body: { employeeUsername: 'employee.user' } }, res, ['root', 'admin'])
    ).resolves.toBeNull();
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 401,
      serverMessage: 'Unauthorized user',
    });
  });

  it('allows any authenticated user with a valid company through basic authentication', async () => {
    employeeQueries.employeeExistByUsername.mockResolvedValue(true);
    employeeQueries.employeeDataByUsername.mockResolvedValue({
      username: 'employee.user',
      role: 'employee',
      companyID: 9,
    });
    const res = { json: jest.fn() };

    await expect(
      verifyBasicAuthentication({ body: { employeeUsername: 'employee.user' } }, res)
    ).resolves.toEqual({
      username: 'employee.user',
      role: 'employee',
      companyID: 9,
    });
  });

  it('rejects basic authentication when the user is not assigned to a valid company', async () => {
    employeeQueries.employeeExistByUsername.mockResolvedValue(true);
    employeeQueries.employeeDataByUsername.mockResolvedValue({
      username: 'employee.user',
      role: 'employee',
      companyID: 0,
    });
    const res = { json: jest.fn() };

    await expect(
      verifyBasicAuthentication({ body: { employeeUsername: 'employee.user' } }, res)
    ).resolves.toBeNull();

    expect(res.json).toHaveBeenCalledWith({
      statusCode: 403,
      serverMessage: 'User is not assigned to a valid company',
    });
  });

  it('rejects unauthenticated users during authorization and basic authentication', async () => {
    employeeQueries.employeeExistByUsername.mockResolvedValue(false);
    const res = { json: jest.fn() };

    await expect(
      verifyAuthorization({ body: { employeeUsername: 'ghost.user' } }, res)
    ).resolves.toBeNull();
    await expect(
      verifyBasicAuthentication({ body: { employeeUsername: 'ghost.user' } }, res)
    ).resolves.toBeNull();

    expect(res.json).toHaveBeenCalledWith({
      statusCode: 401,
      serverMessage: 'Unauthorized user',
    });
  });

  it('reuses the shared verifier for ABA and admin authorization', async () => {
    employeeQueries.employeeExistByUsername.mockResolvedValue(true);
    employeeQueries.employeeDataByUsername.mockResolvedValue({
      username: 'root.user',
      role: 'root',
      companyID: 1,
    });
    const res = { json: jest.fn() };

    await expect(
      verifyABAAuthorization({ body: { employeeUsername: 'root.user' } }, res)
    ).resolves.toEqual(expect.objectContaining({ username: 'root.user' }));
    await expect(
      verifyAdminAuthorization({ body: { employeeUsername: 'root.user' } }, res)
    ).resolves.toEqual(expect.objectContaining({ username: 'root.user' }));
  });
});
