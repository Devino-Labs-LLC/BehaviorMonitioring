//Queries imported
const adminQueries = require('../../middleware/helpers/AdminQueries');
const employeeQueries = require('../../middleware/helpers/EmployeeQueries');

//Function to generate a username
async function GenerateUsername (fName, lName, role) {
    const primaryUsernameBase = fName.toLowerCase() + "." + lName.toLowerCase();
    const secondaryUsernameBase = fName.toLowerCase().charAt(0) + lName.toLowerCase();
    let usernameBase = primaryUsernameBase;
    let generatedUsername = usernameBase;

    let suffix = 1;
    let attempts = 0;
    const maxAttempts = 10;

    while (await checkIfUsernameExists(generatedUsername, role)) {
        generatedUsername = usernameBase + (suffix++);
        attempts++;

        if (attempts >= maxAttempts && usernameBase === primaryUsernameBase) {
            usernameBase = secondaryUsernameBase;
            generatedUsername = usernameBase;
            suffix = 1;
        }
    }

    return generatedUsername.toLowerCase();
}

//Checking is username exists
async function checkIfUsernameExists(generatedUsername, role) {
    if (role.toLowerCase() === "admin" || role.toLowerCase() === "root"){
        return adminQueries.adminExistbyUsername(generatedUsername);
    } else if (role.toLowerCase() === "employee") {
        return employeeQueries.employeeExistbyUsername(generatedUsername);
    }
}

module.exports = GenerateUsername;
