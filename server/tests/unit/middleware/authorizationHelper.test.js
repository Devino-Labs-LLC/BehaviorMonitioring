jest.mock('../../../middleware/helpers/EmployeeQueries', () => ({
    employeeExistByUsername: jest.fn(),
    employeeDataByUsername: jest.fn(),
}));

const employeeQueries = require('../../../middleware/helpers/EmployeeQueries');
const {
    hasRole,
    hasValidCompanyScope,
    verifyABAAuthorization,
    verifyBasicAuthentication,
    verifyAdminAuthorization,
} = require('../../../middleware/helpers/authorizationHelper');

describe('authorizationHelper', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('hasRole', () => {
        it('treats roles case-insensitively', () => {
            expect(hasRole({ role: 'Admin' }, ['root', 'admin'])).toBe(true);
            expect(hasRole({ role: 'admin' }, ['root', 'Admin'])).toBe(true);
        });
    });

    describe('hasValidCompanyScope', () => {
        it('rejects non-positive company IDs', () => {
            expect(hasValidCompanyScope({ companyID: 0 })).toBe(false);
            expect(hasValidCompanyScope({ companyID: null })).toBe(false);
            expect(hasValidCompanyScope({ companyID: 1 })).toBe(true);
        });
    });

    describe('verifyABAAuthorization', () => {
        it('authorizes lowercase admin users', async () => {
            employeeQueries.employeeExistByUsername.mockResolvedValue(true);
            employeeQueries.employeeDataByUsername.mockResolvedValue({
                username: 'testuser',
                role: 'admin',
                companyID: 1,
            });

            const req = { body: { employeeUsername: 'TestUser' } };
            const res = { json: jest.fn() };

            const result = await verifyABAAuthorization(req, res);

            expect(result).toMatchObject({ role: 'admin', companyID: 1 });
            expect(res.json).not.toHaveBeenCalled();
        });

        it('authorizes capitalized Admin users', async () => {
            employeeQueries.employeeExistByUsername.mockResolvedValue(true);
            employeeQueries.employeeDataByUsername.mockResolvedValue({
                username: 'testuser',
                role: 'Admin',
                companyID: 1,
            });

            const req = { body: { employeeUsername: 'TestUser' } };
            const res = { json: jest.fn() };

            const result = await verifyABAAuthorization(req, res);

            expect(result).toMatchObject({ role: 'Admin', companyID: 1 });
            expect(res.json).not.toHaveBeenCalled();
        });
    });

    describe('verifyAdminAuthorization', () => {
        it('authorizes capitalized Admin users', async () => {
            employeeQueries.employeeExistByUsername.mockResolvedValue(true);
            employeeQueries.employeeDataByUsername.mockResolvedValue({
                username: 'testuser',
                role: 'Admin',
                companyID: 1,
            });

            const req = { body: { employeeUsername: 'TestUser' } };
            const res = { json: jest.fn() };

            const result = await verifyAdminAuthorization(req, res);

            expect(result).toMatchObject({ role: 'Admin', companyID: 1 });
            expect(res.json).not.toHaveBeenCalled();
        });
    });

    describe('verifyBasicAuthentication', () => {
        it('rejects users without a valid company scope', async () => {
            employeeQueries.employeeExistByUsername.mockResolvedValue(true);
            employeeQueries.employeeDataByUsername.mockResolvedValue({
                username: 'testuser',
                role: 'employee',
                companyID: 0,
            });

            const req = { body: { employeeUsername: 'TestUser' } };
            const res = { json: jest.fn() };

            const result = await verifyBasicAuthentication(req, res);

            expect(result).toBeNull();
            expect(res.json).toHaveBeenCalledWith({
                statusCode: 403,
                serverMessage: 'User is not assigned to a valid company'
            });
        });
    });
});
