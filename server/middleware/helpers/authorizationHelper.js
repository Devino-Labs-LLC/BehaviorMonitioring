const employeeQueries = require('./EmployeeQueries');

/**
 * Verify user exists and retrieve their data
 * @param {string} username - Employee username
 * @returns {Promise<Object|null>} Employee data or null if not found
 */
async function getAuthenticatedUser(username) {
    if (!username) return null;
    
    const lowerUsername = username.toLowerCase();
    if (await employeeQueries.employeeExistByUsername(lowerUsername)) {
        return await employeeQueries.employeeDataByUsername(lowerUsername);
    }
    return null;
}

/**
 * Check if user has required role(s)
 * @param {Object} employeeData - Employee data object
 * @param {string[]} allowedRoles - Array of allowed roles
 * @returns {boolean} True if user has one of the allowed roles
 */
function hasRole(employeeData, allowedRoles = ['root', 'admin']) {
    if (!employeeData?.role) return false;
    const normalizedRole = String(employeeData.role).toLowerCase();
    const normalizedAllowedRoles = allowedRoles.map((role) => String(role).toLowerCase());
    return normalizedAllowedRoles.includes(normalizedRole);
}

function hasValidCompanyScope(employeeData) {
    if (!employeeData) return false;
    return Number(employeeData.companyID) > 0;
}

/**
 * Verify user authorization and return employee data or send error response
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {string[]} allowedRoles - Array of allowed roles (default: ['root', 'admin', 'Admin'])
 * @returns {Promise<Object|null>} Employee data if authorized, null otherwise (response already sent)
 */
async function verifyAuthorization(req, res, allowedRoles = ['root', 'admin']) {
    const { employeeUsername } = req.body;
    
    const employeeData = await getAuthenticatedUser(employeeUsername);
    
    if (!employeeData) {
        res.json({ statusCode: 401, serverMessage: 'Unauthorized user' });
        return null;
    }

    if (!hasValidCompanyScope(employeeData)) {
        res.json({ statusCode: 403, serverMessage: 'User is not assigned to a valid company' });
        return null;
    }
    
    if (!hasRole(employeeData, allowedRoles)) {
        res.json({ statusCode: 401, serverMessage: 'Unauthorized user' });
        return null;
    }
    
    return employeeData;
}

/**
 * Verify basic user authentication (any authenticated user from the same company)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object|null>} Employee data if authenticated, null otherwise
 */
async function verifyBasicAuthentication(req, res) {
    const { employeeUsername } = req.body;
    
    const employeeData = await getAuthenticatedUser(employeeUsername);
    
    if (!employeeData) {
        res.json({ statusCode: 401, serverMessage: 'Unauthorized user' });
        return null;
    }

    if (!hasValidCompanyScope(employeeData)) {
        res.json({ statusCode: 403, serverMessage: 'User is not assigned to a valid company' });
        return null;
    }
    
    return employeeData;
}

/**
 * Verify user authorization for ABA operations (requires root or admin role)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object|null>} Employee data if authorized, null otherwise
 */
async function verifyABAAuthorization(req, res) {
    return verifyAuthorization(req, res, ['root', 'admin']);
}

/**
 * Verify user authorization for admin operations (requires root or admin role)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object|null>} Employee data if authorized, null otherwise
 */
async function verifyAdminAuthorization(req, res) {
    return verifyAuthorization(req, res, ['root', 'admin']);
}

module.exports = {
    getAuthenticatedUser,
    hasRole,
    hasValidCompanyScope,
    verifyAuthorization,
    verifyBasicAuthentication,
    verifyABAAuthorization,
    verifyAdminAuthorization
};
