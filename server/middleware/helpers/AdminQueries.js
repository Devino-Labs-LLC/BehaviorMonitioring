const { Employee, Home, Client } = require('../../models');

/*-----------------------------------------------Employee-----------------------------------------------*/
async function adminGetAllEmployees(compID) {
    try {
        const employees = await Employee.findAll({
            where: { companyID: compID },
            attributes: ['employeeID', 'fName', 'lName', 'username', 'email', 'phone_number', 'role', 'account_status', 'entered_by', 'date_entered', 'time_entered'],
            order: [['fName', 'ASC'], ['lName', 'ASC']]
        });
        return employees.map(emp => emp.get({ plain: true }));
    } catch (err) {
        throw { message: err.message };
    }
}

async function adminExistByUsername(uName) {
    try {
        const employee = await Employee.findOne({
            where: { username: uName }
        });
        return employee !== null;
    } catch (err) {
        throw { message: err.message };
    }
}

async function adminExistByID(uID) {
    try {
        const employee = await Employee.findOne({
            where: { employeeID: uID }
        });
        return employee !== null;
    } catch (err) {
        throw { message: err.message };
    }
}

async function adminDataByUsername(uName) {
    try {
        const employee = await Employee.findOne({
            where: { username: uName },
            attributes: ['employeeID', 'fName', 'lName', 'username', 'email', 'phone_number', 'role', 'account_status', 'entered_by', 'date_entered', 'time_entered']
        });
        return employee ? employee.get({ plain: true }) : null;
    } catch (err) {
        throw { message: err.message };
    }
}

async function adminDataById(uID) {
    try {
        const employee = await Employee.findOne({
            where: { employeeID: uID },
            attributes: ['employeeID', 'fName', 'lName', 'username', 'email', 'phone_number', 'role', 'account_status', 'entered_by', 'date_entered', 'time_entered']
        });
        return employee ? employee.get({ plain: true }) : null;
    } catch (err) {
        throw { message: err.message };
    }
}

async function adminAddNewEmployee(fName, lName, username, email, phone_number, role, account_status, enteredBy, compID, compName, dateEntered, timeEntered) {
    try {
        await Employee.create({
            fName, 
            lName, 
            username, 
            email, 
            phone_number, 
            role, 
            account_status,
            entered_by: enteredBy, 
            companyID: compID, 
            companyName: compName, 
            date_entered: dateEntered, 
            time_entered: timeEntered
        });
        return true;
    } catch (err) {
        throw { message: err.message };
    }
}

async function adminDeleteAnEmployeeByID(eID, compID) {
    try {
        const rowsDeleted = await Employee.destroy({
            where: { employeeID: eID, companyID: compID }
        });
        return rowsDeleted > 0;
    } catch (err) {
        throw { message: err.message };
    }
}

async function adminDeleteAnEmployeeByUsername(uName, compID) {
    try {
        const rowsDeleted = await Employee.destroy({
            where: { username: uName, companyID: compID }
        });
        return rowsDeleted > 0;
    } catch (err) {
        throw { message: err.message };
    }
}

async function adminUpdateEmployeeAccountStatusByUsername(accountStatus, uName, compID) {
    try {
        const [rowsUpdated] = await Employee.update(
            { account_status: accountStatus },
            { where: { username: uName, companyID: compID } }
        );
        return rowsUpdated > 0;
    } catch (err) {
        throw { message: err.message };
    }
}

async function adminUpdateEmployeeAccountStatusByID(accountStatus, eID, compID) {
    try {
        const [rowsUpdated] = await Employee.update(
            { account_status: accountStatus },
            { where: { employeeID: eID, companyID: compID } }
        );
        return rowsUpdated > 0;
    } catch (err) {
        throw { message: err.message };
    }
}

async function adminUpdateEmployeeAccountByUsername(fName, lName, email, phone_number, role, uName, compID) {
    try {
        const [rowsUpdated] = await Employee.update(
            { fName, lName, email, phone_number, role },
            { where: { username: uName, companyID: compID } }
        );
        return rowsUpdated > 0;
    } catch (err) {
        throw { message: err.message };
    }
}

async function adminUpdateEmployeeAccountByID(fName, lName, email, phone_number, role, eID, compID) {
    try {
        const [rowsUpdated] = await Employee.update(
            { fName, lName, email, phone_number, role },
            { where: { employeeID: eID, companyID: compID } }
        );
        return rowsUpdated > 0;
    } catch (err) {
        throw { message: err.message };
    }
}

/*-----------------------------------------------Home-----------------------------------------------*/
async function adminGetAllHomes(compID) {
    try {
        const homes = await Home.findAll({
            where: { companyID: compID },
            attributes: ['homeID', 'name', 'street_address', 'city', 'state', 'zip_code', 'entered_by', 'companyID', 'companyName', 'date_entered', 'time_entered'],
            order: [['name', 'ASC']]
        });
        return homes.map(home => home.get({ plain: true }));
    } catch (err) {
        throw { message: err.message };
    }
}

async function homeExistByName(name, compID) {
    try {
        const home = await Home.findOne({
            where: { name, companyID: compID }
        });
        return home !== null;
    } catch (err) {
        throw { message: err.message };
    }
}

async function homeExistByID(hID, compID) {
    try {
        const home = await Home.findOne({
            where: { homeID: hID, companyID: compID }
        });
        return home !== null;
    } catch (err) {
        throw { message: err.message };
    }
}

async function homeDataByName(name, compID) {
    try {
        const home = await Home.findOne({
            where: { name, companyID: compID },
            attributes: ['homeID', 'name', 'street_address', 'city', 'state', 'zip_code', 'entered_by', 'companyID', 'companyName', 'date_entered', 'time_entered']
        });
        return home ? home.get({ plain: true }) : null;
    } catch (err) {
        throw { message: err.message };
    }
}

async function homeDataById(hID, compID) {
    try {
        const home = await Home.findOne({
            where: { homeID: hID, companyID: compID },
            attributes: ['homeID', 'name', 'street_address', 'city', 'state', 'zip_code', 'entered_by', 'date_entered', 'companyID', 'companyName', 'time_entered']
        });
        return home ? home.get({ plain: true }) : null;
    } catch (err) {
        throw { message: err.message };
    }
}

async function adminAddNewHome(name, streetAddress, city, state, zipCode, enteredBy, compID, compName, dateEntered, timeEntered) {
    try {
        await Home.create({
            name, 
            street_address: streetAddress, 
            city, 
            state, 
            zip_code: zipCode, 
            entered_by: enteredBy, 
            companyID: compID, 
            companyName: compName, 
            date_entered: dateEntered, 
            time_entered: timeEntered
        });
        return true;
    } catch (err) {
        throw { message: err.message };
    }
}

async function adminDeleteAHomeByID(hID, compID) {
    try {
        const rowsDeleted = await Home.destroy({
            where: { homeID: hID, companyID: compID }
        });
        return rowsDeleted > 0;
    } catch (err) {
        throw { message: err.message };
    }
}

async function adminDeleteAHomeByName(name, compID) {
    try {
        const rowsDeleted = await Home.destroy({
            where: { name, companyID: compID }
        });
        return rowsDeleted > 0;
    } catch (err) {
        throw { message: err.message };
    }
}

async function adminUpdateHomeByName(name, streetAddress, city, state, zipCode, currentName, compID) {
    try {
        const [rowsUpdated] = await Home.update(
            { name, street_address: streetAddress, city, state, zip_code: zipCode },
            { where: { name: currentName, companyID: compID } }
        );
        return rowsUpdated > 0;
    } catch (err) {
        throw { message: err.message };
    }
}

async function adminUpdateHomeByID(name, streetAddress, city, state, zipCode, hID, compID) {
    try {
        const [rowsUpdated] = await Home.update(
            { name, street_address: streetAddress, city, state, zip_code: zipCode },
            { where: { homeID: hID, companyID: compID } }
        );
        return rowsUpdated > 0;
    } catch (err) {
        throw { message: err.message };
    }
}

/*-----------------------------------------------Client-----------------------------------------------*/
async function clientExistByID(clientID, compID) {
    try {
        const client = await Client.findOne({
            where: { clientID, companyID: compID }
        });
        return client !== null;
    } catch (err) {
        throw { message: err.message };
    }
}

async function clientDataById(clientID, compID) {
    try {
        const client = await Client.findOne({
            where: { clientID, companyID: compID },
            attributes: ['clientID', 'fName', 'lName', 'DOB', 'intake_Date', 'group_home_name', 'medicaid_id_number', 'behavior_plan_due_date', 'entered_by', 'companyID', 'companyName', 'date_entered', 'time_entered']
        });
        return client ? client.get({ plain: true }) : null;
    } catch (err) {
        throw { message: err.message };
    }
}

async function adminAddNewClient(fName, lName, DOB, intakeDate, groupHomeName, medicaidIdNumber, behaviorPlanDueDate, enteredBy, compID, compName, dateEntered, timeEntered) {
    try {
        const result = await Client.create({
            fName,
            lName,
            DOB,
            intake_Date: intakeDate,
            group_home_name: groupHomeName,
            medicaid_id_number: medicaidIdNumber,
            behavior_plan_due_date: behaviorPlanDueDate,
            entered_by: enteredBy,
            companyID: compID,
            companyName: compName,
            date_entered: dateEntered,
            time_entered: timeEntered
        });
        return result.get({ plain: true });
    } catch (err) {
        throw { message: err.message };
    }
}

async function adminUpdateClient(clientID, fName, lName, DOB, intakeDate, groupHomeName, medicaidIdNumber, behaviorPlanDueDate, compID) {
    try {
        const [rowsUpdated] = await Client.update(
            { 
                fName, 
                lName, 
                DOB, 
                intake_Date: intakeDate, 
                group_home_name: groupHomeName, 
                medicaid_id_number: medicaidIdNumber, 
                behavior_plan_due_date: behaviorPlanDueDate 
            },
            { where: { clientID, companyID: compID } }
        );
        return rowsUpdated > 0;
    } catch (err) {
        throw { message: err.message };
    }
}

async function adminDeleteClient(clientID, compID) {
    try {
        const rowsDeleted = await Client.destroy({
            where: { clientID, companyID: compID }
        });
        return rowsDeleted > 0;
    } catch (err) {
        throw { message: err.message };
    }
}

/*-----------------------------------------------Client Archive Operations-----------------------------------------------*/

/**
 * Archive a client when they leave the home
 * Sets status to 'Archived' and calculates deletion date (7 years from archive date)
 */
async function adminArchiveClient(clientID, compID, archivedBy, archiveDate, deletionDate) {
    try {
        const [rowsUpdated] = await Client.update({
            status: 'Archived',
            archived_date: archiveDate,
            archived_deletion_date: deletionDate,
            archived_by: archivedBy,
            reminder_90_sent: false,
            reminder_60_sent: false,
            reminder_30_sent: false
        }, {
            where: { clientID, companyID: compID }
        });
        return rowsUpdated > 0;
    } catch (err) {
        throw { message: err.message };
    }
}

/**
 * Get all archived clients for a company
 */
async function adminGetArchivedClients(compID) {
    try {
        const clients = await Client.findAll({
            where: { 
                companyID: compID,
                status: 'Archived'
            },
            order: [['archived_date', 'DESC']]
        });
        return clients.map(client => client.get({ plain: true }));
    } catch (err) {
        throw { message: err.message };
    }
}

/**
 * Get a specific archived client by ID
 */
async function adminGetArchivedClientById(clientID, compID) {
    try {
        const client = await Client.findOne({
            where: { 
                clientID,
                companyID: compID,
                status: 'Archived'
            }
        });
        return client ? client.get({ plain: true }) : null;
    } catch (err) {
        throw { message: err.message };
    }
}

/**
 * Unarchive a client (restore to Active status)
 */
async function adminUnarchiveClient(clientID, compID) {
    try {
        const [rowsUpdated] = await Client.update({
            status: 'Active',
            archived_date: null,
            archived_deletion_date: null,
            archived_by: null,
            reminder_90_sent: false,
            reminder_60_sent: false,
            reminder_30_sent: false
        }, {
            where: { clientID, companyID: compID, status: 'Archived' }
        });
        return rowsUpdated > 0;
    } catch (err) {
        throw { message: err.message };
    }
}

/**
 * Permanently delete an archived client
 */
async function adminDeleteArchivedClient(clientID, compID) {
    try {
        const rowsDeleted = await Client.destroy({
            where: { 
                clientID, 
                companyID: compID,
                status: 'Archived'
            }
        });
        return rowsDeleted > 0;
    } catch (err) {
        throw { message: err.message };
    }
}

/**
 * Get clients eligible for deletion or reminders
 * Returns clients whose deletion date has passed or is within X days
 */
async function adminGetClientsForDeletion(daysUntilDeletion = 0) {
    try {
        const { Op } = require('sequelize');
        const currentDate = new Date();
        
        // Calculate target date (current date + daysUntilDeletion)
        const targetDate = new Date(currentDate);
        targetDate.setDate(targetDate.getDate() + daysUntilDeletion);
        const targetDateStr = targetDate.toISOString().split('T')[0]; // YYYY-MM-DD format
        
        const clients = await Client.findAll({
            where: {
                status: 'Archived',
                archived_deletion_date: {
                    [Op.lte]: targetDateStr
                }
            }
        });
        return clients.map(client => client.get({ plain: true }));
    } catch (err) {
        throw { message: err.message };
    }
}

/**
 * Update reminder sent status for a client
 */
async function adminUpdateReminderSent(clientID, reminderType) {
    try {
        const updateField = `reminder_${reminderType}_sent`;
        const [rowsUpdated] = await Client.update({
            [updateField]: true
        }, {
            where: { clientID }
        });
        return rowsUpdated > 0;
    } catch (err) {
        throw { message: err.message };
    }
}

module.exports = {
    adminGetAllEmployees,
    adminExistByUsername,
    adminExistByID,
    adminDataByUsername,
    adminDataById,
    adminAddNewEmployee,
    adminDeleteAnEmployeeByID,
    adminDeleteAnEmployeeByUsername,
    adminUpdateEmployeeAccountStatusByUsername,
    adminUpdateEmployeeAccountStatusByID,
    adminUpdateEmployeeAccountByUsername,
    adminUpdateEmployeeAccountByID,
    adminGetAllHomes,
    homeExistByName,
    homeExistByID,
    homeDataByName,
    homeDataById,
    adminAddNewHome,
    adminDeleteAHomeByID,
    adminDeleteAHomeByName,
    adminUpdateHomeByName,
    adminUpdateHomeByID,
    clientExistByID,
    clientDataById,
    adminAddNewClient,
    adminUpdateClient,
    adminDeleteClient,
    // Client Archive Operations
    adminArchiveClient,
    adminGetArchivedClients,
    adminGetArchivedClientById,
    adminUnarchiveClient,
    adminDeleteArchivedClient,
    adminGetClientsForDeletion,
    adminUpdateReminderSent
}