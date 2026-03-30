const adminQueries = require('../middleware/helpers/AdminQueries');
const currentDateTime = require('../functions/base/currentDateTime');
const { formatDateString } = require('../functions/base/dateTimeFormat');
const generateUsername = require('../functions/users/generateUsername');
const { verifyAdminAuthorization } = require('../middleware/helpers/authorizationHelper');
const emailTemplate = require('../middleware/email/emailTemplate');

class AdminController {
    /**
     * Add a new employee
     */
    async addNewEmployee(req, res) {
        try {
            const employeeData = await verifyAdminAuthorization(req, res);
            if (!employeeData) return;

            const fName = req.body.fName;
            const lName = req.body.lName;
            let username = fName + "." + lName;
            const email = req.body.email;
            const pNumber = req.body.pNumber;
            const role = req.body.role;
            const accountStatus = req.body.accountStatus || 'In verification';
                
            if (await adminQueries.adminExistByUsername(username.toLowerCase())) {
                username = await generateUsername(fName, lName, role);
            }

            if (await adminQueries.adminAddNewEmployee({
                fName,
                lName,
                username: username.toLowerCase(),
                email,
                phone_number: pNumber,
                role,
                account_status: accountStatus,
                enteredBy: employeeData.fName + " " + employeeData.lName,
                compID: employeeData.companyID,
                compName: employeeData.companyName,
                dateEntered: await formatDateString(await currentDateTime.getCurrentDate()),
                timeEntered: await currentDateTime.getCurrentTime()
            })) {
                // Send appropriate verification email based on role
                if (role.toLowerCase() === 'root' || role.toLowerCase() === 'admin') {
                    await emailTemplate.sendAdminVerification(
                        email,
                        fName,
                        lName,
                        username.toLowerCase()
                    );
                } else {
                    await emailTemplate.sendEmployeeVerification(
                        email,
                        fName,
                        lName,
                        username.toLowerCase()
                    );
                }
                return res.json({ statusCode: 201, serverMessage: 'New ' + role.toLowerCase() + ' added' });
            }
            return res.json({ statusCode: 500, serverMessage: 'A server error occurred' });
        } catch (error) {
            return res.json({ statusCode: 500, serverMessage: 'A server error occurred', errorMessage: error.message });
        }
    }

    /**
     * Delete an employee
     */
    async deleteAnEmployee(req, res) {
        try {
            const employeeData = await verifyAdminAuthorization(req, res);
            if (!employeeData) return;

            const eID = req.body.employeeID;

            if (await adminQueries.adminDeleteAnEmployeeByID(eID, employeeData.companyID)) {
                return res.json({ statusCode: 201, serverMessage: 'Account has been deleted' });
            }
            return res.json({ statusCode: 500, serverMessage: 'A server error occurred' });
        } catch (error) {
            return res.json({ statusCode: 500, serverMessage: 'A server error occurred', errorMessage: error.message });
        }
    }

    /**
     * Update employee details
     */
    async updateAnEmployeeDetail(req, res) {
        try {
            const employeeData = await verifyAdminAuthorization(req, res);
            if (!employeeData) return;

            const eID = req.body.employeeID;
            const fName = req.body.fName;
            const lName = req.body.lName;
            const email = req.body.email;
            const pNumber = req.body.pNumber;
            const role = req.body.role;

            if (await adminQueries.adminUpdateEmployeeAccountByID(fName, lName, email, pNumber, role, eID, employeeData.companyID)) {
                return res.json({ statusCode: 201, serverMessage: 'Account has been updated' });
            }
            return res.json({ statusCode: 500, serverMessage: 'A server error occurred' });
        } catch (error) {
            return res.json({ statusCode: 500, serverMessage: 'A server error occurred', errorMessage: error.message });
        }
    }

    /**
     * Update employee account status
     */
    async updateAnEmployeeAccountStatus(req, res) {
        try {
            const employeeData = await verifyAdminAuthorization(req, res);
            if (!employeeData) return;

            const eID = req.body.employeeID;
            const accountStatus = req.body.accountStatus;

            if (await adminQueries.adminUpdateEmployeeAccountStatusByID(accountStatus, eID, employeeData.companyID)) {
                // If approving an account (from Pending to Active/approved status), send approval email
                if (accountStatus.toLowerCase() === 'active') {
                    const employeeInfo = await adminQueries.adminDataById(eID);
                    if (employeeInfo) {
                        await emailTemplate.sendAccountApprovalNotification(
                            employeeInfo.email,
                            employeeInfo.fName,
                            employeeInfo.lName,
                            employeeInfo.username
                        );
                    }
                }
                return res.json({ statusCode: 201, serverMessage: 'Account has been updated' });
            }
            return res.json({ statusCode: 500, serverMessage: 'A server error occurred' });
        } catch (error) {
            return res.json({ statusCode: 500, serverMessage: 'A server error occurred', errorMessage: error.message });
        }
    }

    /**
     * Add a new home
     */
    async addNewHome(req, res) {
        try {
            const employeeData = await verifyAdminAuthorization(req, res);
            if (!employeeData) return;

            const name = String(req.body.name || '').trim();
            const streetAddress = String(req.body.streetAddress || '').trim();
            const city = String(req.body.city || '').trim();
            const state = String(req.body.state || '').trim().toUpperCase();
            const zipCode = String(req.body.zipCode || '').trim();
            const capacity = Number(req.body.capacity);

            if (!name || !streetAddress || !city || !state || !zipCode || !Number.isFinite(capacity)) {
                return res.json({ statusCode: 400, serverMessage: 'All required home fields must be provided' });
            }

            if (!/^[A-Z]{2}$/.test(state)) {
                return res.json({ statusCode: 400, serverMessage: 'State must be a 2-letter code' });
            }

            if (!/^\d{5}(-\d{4})?$/.test(zipCode)) {
                return res.json({ statusCode: 400, serverMessage: 'ZIP code must be 5 digits or ZIP+4 format' });
            }

            if (!Number.isInteger(capacity) || capacity <= 0) {
                return res.json({ statusCode: 400, serverMessage: 'Capacity must be a positive whole number' });
            }

            if (await adminQueries.homeExistByName(name, employeeData.companyID)) {
                return res.json({ statusCode: 409, serverMessage: 'A home with this name already exists' });
            }

            if (await adminQueries.adminAddNewHome({
                name,
                streetAddress,
                city,
                state,
                zipCode,
                capacity,
                currentOccupancy: 0,
                enteredBy: employeeData.fName + " " + employeeData.lName,
                compID: employeeData.companyID,
                compName: employeeData.companyName,
                dateEntered: await formatDateString(await currentDateTime.getCurrentDate()),
                timeEntered: await currentDateTime.getCurrentTime()
            })) {
                return res.json({ statusCode: 201, serverMessage: 'New home added' });
            }
            return res.json({ statusCode: 500, serverMessage: 'A server error occurred' });
        } catch (error) {
            return res.json({ statusCode: 500, serverMessage: 'A server error occurred', errorMessage: error.message });
        }
    }

    /**
     * Delete a home
     */
    async deleteAHome(req, res) {
        try {
            const employeeData = await verifyAdminAuthorization(req, res);
            if (!employeeData) return;

            const hID = req.body.homeID;

            if (await adminQueries.adminDeleteAHomeByID(hID, employeeData.companyID)) {
                return res.json({ statusCode: 201, serverMessage: 'Home has been deleted' });
            }
            return res.json({ statusCode: 500, serverMessage: 'A server error occurred' });
        } catch (error) {
            return res.json({ statusCode: 500, serverMessage: 'A server error occurred', errorMessage: error.message });
        }
    }

    /**
     * Update a home
     */
    async updateAHome(req, res) {
        try {
            const employeeData = await verifyAdminAuthorization(req, res);
            if (!employeeData) return;

            const hID = req.body.homeID;
            const name = String(req.body.name || '').trim();
            const streetAddress = String(req.body.streetAddress || '').trim();
            const city = String(req.body.city || '').trim();
            const state = String(req.body.state || '').trim().toUpperCase();
            const zipCode = String(req.body.zipCode || '').trim();
            const capacity = Number(req.body.capacity);

            if (!hID || !name || !streetAddress || !city || !state || !zipCode || !Number.isFinite(capacity)) {
                return res.json({ statusCode: 400, serverMessage: 'All required home fields must be provided' });
            }

            if (!/^[A-Z]{2}$/.test(state)) {
                return res.json({ statusCode: 400, serverMessage: 'State must be a 2-letter code' });
            }

            if (!/^\d{5}(-\d{4})?$/.test(zipCode)) {
                return res.json({ statusCode: 400, serverMessage: 'ZIP code must be 5 digits or ZIP+4 format' });
            }

            if (!Number.isInteger(capacity) || capacity <= 0) {
                return res.json({ statusCode: 400, serverMessage: 'Capacity must be a positive whole number' });
            }

            if (await adminQueries.adminUpdateHomeByID({
                name,
                streetAddress,
                city,
                state,
                zipCode,
                capacity,
                hID,
                compID: employeeData.companyID
            })) {
                return res.json({ statusCode: 201, serverMessage: 'Home has been updated' });
            }
            return res.json({ statusCode: 500, serverMessage: 'A server error occurred' });
        } catch (error) {
            return res.json({ statusCode: 500, serverMessage: 'A server error occurred', errorMessage: error.message });
        }
    }

    /**
     * Get all admins (employees with admin-level roles)
     */
    async getAllAdmins(req, res) {
        try {
            const employeeData = await verifyAdminAuthorization(req, res);
            if (!employeeData) return;

            const allEmployees = await adminQueries.adminGetAllEmployees(employeeData.companyID);
            
            // Filter to only include admin-level roles (root, admin, manager)
            const adminRoles = new Set(['root', 'admin', 'manager']);
            const admins = allEmployees
                .filter(emp => adminRoles.has(emp.role.toLowerCase()))
                .map(emp => ({
                    adminID: emp.employeeID,
                    firstName: emp.fName,
                    lastName: emp.lName,
                    username: emp.username,
                    email: emp.email,
                    phone: emp.phone_number,
                    role: emp.role,
                    isActive: emp.account_status === 'Active',
                    companyID: emp.companyID,
                    companyName: emp.companyName,
                    dateCreated: emp.date_entered
                }));

            return res.json({ 
                statusCode: 200, 
                admins,
                totalCount: admins.length,
                serverMessage: 'Admins retrieved successfully' 
            });
        } catch (error) {
            return res.json({ statusCode: 500, serverMessage: 'A server error occurred', errorMessage: error.message });
        }
    }

    /**
     * Get all homes
     */
    async getAllHomes(req, res) {
        try {
            const employeeData = await verifyAdminAuthorization(req, res);
            if (!employeeData) return;

            const homes = await adminQueries.adminGetAllHomes(employeeData.companyID);
            
            // Map database fields to frontend expectations
            const mappedHomes = homes.map(home => ({
                homeID: home.homeID,
                homeName: home.name,
                name: home.name, // Keep both for compatibility
                address: home.street_address,
                street_address: home.street_address, // Keep both for compatibility
                city: home.city,
                state: home.state,
                zip: home.zip_code,
                zip_code: home.zip_code, // Keep both for compatibility
                capacity: home.capacity ?? 0,
                currentOccupancy: home.current_occupancy ?? 0,
                companyID: home.companyID,
                companyName: home.companyName,
                dateCreated: home.date_entered,
                date_entered: home.date_entered, // Keep both for compatibility
                time_entered: home.time_entered,
                entered_by: home.entered_by,
                isActive: true // Default value - update if column exists
            }));
            
            return res.json({ 
                statusCode: 200, 
                homes: mappedHomes,
                totalCount: mappedHomes.length,
                serverMessage: 'Homes retrieved successfully' 
            });
        } catch (error) {
            return res.json({ statusCode: 500, serverMessage: 'A server error occurred', errorMessage: error.message });
        }
    }

    /**
     * Create a new client
     */
    async createClient(req, res) {
        try {
            const employeeData = await verifyAdminAuthorization(req, res);
            if (!employeeData) return;

            const { fName, lName, DOB, intakeDate, groupHomeName, medicaidIdNumber, behaviorPlanDueDate } = req.body;
            
            const newClient = await adminQueries.adminAddNewClient({
                fName,
                lName,
                DOB,
                intakeDate,
                groupHomeName: groupHomeName || null,
                medicaidIdNumber: medicaidIdNumber || null,
                behaviorPlanDueDate: behaviorPlanDueDate || null,
                enteredBy: employeeData.fName + " " + employeeData.lName,
                compID: employeeData.companyID,
                compName: employeeData.companyName,
                dateEntered: await formatDateString(await currentDateTime.getCurrentDate()),
                timeEntered: await currentDateTime.getCurrentTime()
            });

            return res.json({ 
                statusCode: 201, 
                serverMessage: 'Client created successfully',
                client: newClient
            });
        } catch (error) {
            return res.json({ statusCode: 500, serverMessage: 'A server error occurred', errorMessage: error.message });
        }
    }

    /**
     * Update a client
     */
    async updateClient(req, res) {
        try {
            const employeeData = await verifyAdminAuthorization(req, res);
            if (!employeeData) return;

            const { clientID, fName, lName, DOB, intakeDate, groupHomeName, medicaidIdNumber, behaviorPlanDueDate } = req.body;
            
            if (!await adminQueries.clientExistByID(clientID, employeeData.companyID)) {
                return res.json({ statusCode: 404, serverMessage: 'Client not found' });
            }

            if (await adminQueries.adminUpdateClient({
                clientID,
                fName,
                lName,
                DOB,
                intakeDate,
                groupHomeName: groupHomeName || null,
                medicaidIdNumber: medicaidIdNumber || null,
                behaviorPlanDueDate: behaviorPlanDueDate || null,
                compID: employeeData.companyID
            })) {
                return res.json({ statusCode: 200, serverMessage: 'Client updated successfully' });
            }
            return res.json({ statusCode: 500, serverMessage: 'A server error occurred' });
        } catch (error) {
            return res.json({ statusCode: 500, serverMessage: 'A server error occurred', errorMessage: error.message });
        }
    }

    /**
     * Delete a client
     */
    async deleteClient(req, res) {
        try {
            const employeeData = await verifyAdminAuthorization(req, res);
            if (!employeeData) return;

            const { clientID } = req.body;
            
            if (!await adminQueries.clientExistByID(clientID, employeeData.companyID)) {
                return res.json({ statusCode: 404, serverMessage: 'Client not found' });
            }

            if (await adminQueries.adminDeleteClient(clientID, employeeData.companyID)) {
                return res.json({ statusCode: 200, serverMessage: 'Client deleted successfully' });
            }
            return res.json({ statusCode: 500, serverMessage: 'A server error occurred' });
        } catch (error) {
            return res.json({ statusCode: 500, serverMessage: 'A server error occurred', errorMessage: error.message });
        }
    }

    /**
     * Archive a client when they leave the home
     * Calculates deletion date (7 years from archive) and sets up reminders
     */
    async archiveClient(req, res) {
        try {
            const employeeData = await verifyAdminAuthorization(req, res);
            if (!employeeData) return;

            const { clientID } = req.body;
            
            // Verify client exists and is not already archived
            const client = await adminQueries.clientDataById(clientID, employeeData.companyID);
            if (!client) {
                return res.json({ statusCode: 404, serverMessage: 'Client not found' });
            }

            if (client.status === 'Archived') {
                return res.json({ statusCode: 400, serverMessage: 'Client is already archived' });
            }

            // Calculate dates
            const archiveDate = await formatDateString(await currentDateTime.getCurrentDate());
            const deletionDate = new Date();
            deletionDate.setFullYear(deletionDate.getFullYear() + 7); // 7 years from now
            const deletionDateStr = await formatDateString(deletionDate.toISOString().split('T')[0]);

            // Archive the client
            if (await adminQueries.adminArchiveClient(
                clientID,
                employeeData.companyID,
                employeeData.fName + ' ' + employeeData.lName,
                archiveDate,
                deletionDateStr
            )) {
                return res.json({ 
                    statusCode: 200, 
                    serverMessage: 'Client archived successfully',
                    archiveDate,
                    deletionDate: deletionDateStr
                });
            }

            return res.json({ statusCode: 500, serverMessage: 'A server error occurred' });
        } catch (error) {
            return res.json({ statusCode: 500, serverMessage: 'A server error occurred', errorMessage: error.message });
        }
    }

    /**
     * Get all archived clients
     */
    async getArchivedClients(req, res) {
        try {
            const employeeData = await verifyAdminAuthorization(req, res);
            if (!employeeData) return;

            const archivedClients = await adminQueries.adminGetArchivedClients(employeeData.companyID);
            return res.json({ 
                statusCode: 200, 
                archivedClients,
                count: archivedClients.length
            });
        } catch (error) {
            return res.json({ statusCode: 500, serverMessage: 'A server error occurred', errorMessage: error.message });
        }
    }

    /**
     * Get a specific archived client with details
     */
    async getArchivedClient(req, res) {
        try {
            const employeeData = await verifyAdminAuthorization(req, res);
            if (!employeeData) return;

            const { clientID } = req.body;
            
            const client = await adminQueries.adminGetArchivedClientById(clientID, employeeData.companyID);
            if (!client) {
                return res.json({ statusCode: 404, serverMessage: 'Archived client not found' });
            }

            return res.json({ 
                statusCode: 200, 
                client
            });
        } catch (error) {
            return res.json({ statusCode: 500, serverMessage: 'A server error occurred', errorMessage: error.message });
        }
    }

    /**
     * Unarchive a client (restore to Active status)
     */
    async unarchiveClient(req, res) {
        try {
            const employeeData = await verifyAdminAuthorization(req, res);
            if (!employeeData) return;

            const { clientID } = req.body;
            
            if (await adminQueries.adminUnarchiveClient(clientID, employeeData.companyID)) {
                return res.json({ 
                    statusCode: 200, 
                    serverMessage: 'Client unarchived successfully'
                });
            }

            return res.json({ statusCode: 404, serverMessage: 'Archived client not found or already active' });
        } catch (error) {
            return res.json({ statusCode: 500, serverMessage: 'A server error occurred', errorMessage: error.message });
        }
    }

    /**
     * Permanently delete an archived client
     */
    async deleteArchivedClient(req, res) {
        try {
            const employeeData = await verifyAdminAuthorization(req, res);
            if (!employeeData) return;

            const { clientID } = req.body;
            
            // Get client info before deletion for notification
            const client = await adminQueries.adminGetArchivedClientById(clientID, employeeData.companyID);
            if (!client) {
                return res.json({ statusCode: 404, serverMessage: 'Archived client not found' });
            }

            if (await adminQueries.adminDeleteArchivedClient(clientID, employeeData.companyID)) {
                // Send deletion notification email
                await emailTemplate.sendClientDataDeleted(
                    `${client.fName} ${client.lName}`,
                    client.archived_deletion_date,
                    client.archived_date
                );

                return res.json({ 
                    statusCode: 200, 
                    serverMessage: 'Archived client deleted permanently'
                });
            }

            return res.json({ statusCode: 500, serverMessage: 'A server error occurred' });
        } catch (error) {
            return res.json({ statusCode: 500, serverMessage: 'A server error occurred', errorMessage: error.message });
        }
    }
}

module.exports = new AdminController();
