const employeeQueries = require('../middleware/helpers/EmployeeQueries');
const currentDateTime = require('../functions/base/currentDateTime');
const { formatDateString } = require('../functions/base/dateTimeFormat');
const bcrypt = require('bcryptjs');
const { verifyAuthorization } = require('../middleware/helpers/authorizationHelper');
const saltRounds = 10;

class EmployeeController {
    /**
     * Get employee data by username
     */
    async getEmployeeData(req, res) {
        try {
            const employeeData = await verifyAuthorization(req, res);
            if (!employeeData) return;

            if (employeeData.length > 0) {
                return res.json({ statusCode: 200, employeeData: employeeData });
            }
            return res.json({ statusCode: 500, serverMessage: 'Unable to locate data' });
        } catch (error) {
            return res.json({ statusCode: 500, serverMessage: 'A server error occurred', errorMessage: error.message });
        }
    }

    /**
     * Update employee account data
     */
    async updateEmployeeData(req, res) {
        try {
            const eID = req.body.employeeID;
            const fName = req.body.fName;
            const lName = req.body.lName;
            const email = req.body.email;
            const pNumber = req.body.pNumber;
            const pWord = req.body.password;
            const newPWord = req.body.newPassword;

            if (await employeeQueries.employeeExistByID(eID)) {
                const employeePassword = await employeeQueries.employeePasswordById(eID);

                const bcryptResult = await new Promise((resolve, reject) => {
                    bcrypt.compare(pWord, employeePassword.password, (err, result) => {
                        if (err) {
                            reject(err);
                        }
                        else {
                            resolve(result);
                        }
                    });
                });

                if (bcryptResult) {
                    bcrypt.hash(newPWord, saltRounds, async function(err, hash) {
                        if (err) {
                            return res.json({ statusCode: 500, updateStatus: false, serverMessage: 'Account update failed' });
                        }
                        else if (await employeeQueries.employeeUpdateEmployeeAccountByID(fName, lName, email, pNumber, hash, eID)) {
                            return res.json({ statusCode: 200, updateStatus: true });
                        }
                    });
                }
                else {
                    return res.json({ statusCode: 401, updateStatus: false, serverMessage: 'Incorrect credentials' });
                }
            }
            else {
                return res.json({ statusCode: 401, updateStatus: false, serverMessage: 'Unauthorized user' });
            }
        } catch (error) {
            return res.json({ statusCode: 500, serverMessage: 'A server error occurred', errorMessage: error.message });
        }
    }

    /**
     * Add behavior data
     */
    async addBehaviorData(req, res) {
        try {
            const employeeData = await verifyAuthorization(req, res, ['root', 'Admin', 'ABA']);
            if (!employeeData) return;

            const bsID = req.body.bsID;
            const clientID = req.body.clientID;
            const clientName = req.body.clientName;
            const sessionDate = req.body.sessionDate;
            const sessionTime = req.body.sessionTime;
            const count = req.body.count;
            const duration = req.body.duration;
            const trial = req.body.trial;
            
            if (await employeeQueries.behaviorSkillExistByID(bsID)) {
                if (count > 0) {
                    if (duration > 0) { // If Count and Duration
                        if (await employeeQueries.employeeAddRateBehaviorData(
                            bsID, 
                            clientID, 
                            clientName, 
                            sessionDate, 
                            sessionTime, 
                            count, 
                            duration, 
                            employeeData.fName + " " + employeeData.lName, 
                            await formatDateString(await currentDateTime.getCurrentDate()), 
                            await currentDateTime.getCurrentTime() + " EST"
                        )) {
                            return res.json({ statusCode: 200, behaviorAdded: true });
                        }
                        else {
                            return res.json({ statusCode: 500, behaviorAdded: false });
                        }
                    }
                    else if (await employeeQueries.employeeAddFrequencyBehaviorData(
                        bsID, 
                        clientID, 
                        clientName, 
                        sessionDate, 
                        sessionTime, 
                        count, 
                        employeeData.fName + " " + employeeData.lName, 
                        await formatDateString(await currentDateTime.getCurrentDate()), 
                        await currentDateTime.getCurrentTime() + " EST"
                    )) {
                        return res.json({ statusCode: 200, behaviorAdded: true });
                    }
                    else {
                        return res.json({ statusCode: 500, behaviorAdded: false });
                    }
                }
                else if (trial > 0) { // If trial behavior
                    if (await employeeQueries.employeeAddDurationBehaviorData(
                        bsID, 
                        clientID, 
                        clientName, 
                        sessionDate, 
                        sessionTime, 
                        trial, 
                        employeeData.fName + " " + employeeData.lName, 
                        await formatDateString(await currentDateTime.getCurrentDate()), 
                        await currentDateTime.getCurrentTime() + " EST"
                    )) {
                        return res.json({ statusCode: 200, behaviorAdded: true });
                    }
                    else {
                        return res.json({ statusCode: 500, behaviorAdded: false });
                    }
                }
                else {
                    return res.json({ statusCode: 500, behaviorAdded: false });
                }
            }
            else {
                return res.json({ statusCode: 500, serverMessage: 'Behavior does not exist' });
            }
        } catch (error) {
            return res.json({ statusCode: 500, serverMessage: 'A server error occurred', errorMessage: error.message });
        }
    }
}

module.exports = new EmployeeController();
