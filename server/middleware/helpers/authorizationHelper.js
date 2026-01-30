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
function hasRole(employeeData, allowedRoles = ['root', 'admin', 'Admin']) {
    if (!employeeData || !employeeData.role) return false;
    return allowedRoles.includes(employeeData.role);
}

/**
 * Verify user authorization and return employee data or send error response
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {string[]} allowedRoles - Array of allowed roles (default: ['root', 'admin', 'Admin'])
 * @returns {Promise<Object|null>} Employee data if authorized, null otherwise (response already sent)
 */
async function verifyAuthorization(req, res, allowedRoles = ['root', 'admin', 'Admin']) {
    const { employeeUsername } = req.body;
    
    const employeeData = await getAuthenticatedUser(employeeUsername);
    
    if (!employeeData) {
        res.json({ statusCode: 401, serverMessage: 'Unauthorized user' });
        return null;
    }
    
    if (!hasRole(employeeData, allowedRoles)) {
        res.json({ statusCode: 401, serverMessage: 'Unauthorized user' });
        return null;
    }
    
    return employeeData;
}

/**
 * Verify user authorization for ABA operations (requires root or Admin role)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object|null>} Employee data if authorized, null otherwise
 */
async function verifyABAAuthorization(req, res) {
    return verifyAuthorization(req, res, ['root', 'Admin']);
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
    verifyAuthorization,
    verifyABAAuthorization,
    verifyAdminAuthorization
};