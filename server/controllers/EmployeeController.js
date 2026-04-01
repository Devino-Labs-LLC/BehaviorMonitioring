const employeeQueries = require('../middleware/helpers/EmployeeQueries');
const currentDateTime = require('../functions/base/currentDateTime');
const { formatDateString } = require('../functions/base/dateTimeFormat');
const bcrypt = require('bcryptjs');
const { verifyAuthorization } = require('../middleware/helpers/authorizationHelper');
const saltRounds = 10;

async function getEntryTimestamp() {
    return {
        dateEntered: await formatDateString(await currentDateTime.getCurrentDate()),
        timeEntered: await currentDateTime.getCurrentTime()
    };
}

async function addEmployeeBehaviorRecord({
    employeeData,
    bsID,
    clientID,
    clientName,
    sessionDate,
    sessionTime,
    count,
    duration,
    trial
}) {
    const enteredBy = `${employeeData.fName} ${employeeData.lName}`;
    const { dateEntered, timeEntered } = await getEntryTimestamp();

    if (count > 0 && duration > 0) {
        return employeeQueries.employeeAddRateBehaviorData({
            bsID,
            cID: clientID,
            cName: clientName,
            sDate: sessionDate,
            sTime: sessionTime,
            count,
            duration,
            enteredBy,
            compID: employeeData.companyID,
            compName: employeeData.companyName,
            dateEntered,
            timeEntered
        });
    }

    if (count > 0) {
        return employeeQueries.employeeAddFrequencyBehaviorData({
            bsID,
            cID: clientID,
            cName: clientName,
            sDate: sessionDate,
            sTime: sessionTime,
            count,
            enteredBy,
            compID: employeeData.companyID,
            compName: employeeData.companyName,
            dateEntered,
            timeEntered
        });
    }

    if (trial > 0) {
        return employeeQueries.employeeAddDurationBehaviorData({
            bsID,
            cID: clientID,
            cName: clientName,
            sDate: sessionDate,
            sTime: sessionTime,
            trial,
            enteredBy,
            compID: employeeData.companyID,
            compName: employeeData.companyName,
            dateEntered,
            timeEntered
        });
    }

    return false;
}

function comparePassword(plainTextPassword, hashedPassword) {
    return new Promise((resolve, reject) => {
        bcrypt.compare(plainTextPassword, hashedPassword, (err, result) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(result);
        });
    });
}

function hashPassword(password) {
    return new Promise((resolve, reject) => {
        bcrypt.hash(password, saltRounds, (err, hash) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(hash);
        });
    });
}

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
            const {
                employeeID: eID,
                fName,
                lName,
                email,
                pNumber,
                password: pWord,
                newPassword: newPWord
            } = req.body;

            if (!await employeeQueries.employeeExistByID(eID)) {
                return res.json({ statusCode: 401, updateStatus: false, serverMessage: 'Unauthorized user' });
            }

            const employeePassword = await employeeQueries.employeePasswordById(eID);
            const passwordMatches = await comparePassword(pWord, employeePassword.password);

            if (!passwordMatches) {
                return res.json({ statusCode: 401, updateStatus: false, serverMessage: 'Incorrect credentials' });
            }

            const hashedPassword = await hashPassword(newPWord);
            const updateSucceeded = await employeeQueries.employeeUpdateEmployeeAccountByID(
                fName,
                lName,
                email,
                pNumber,
                hashedPassword,
                eID
            );

            if (updateSucceeded) {
                return res.json({ statusCode: 200, updateStatus: true });
            }

            return res.json({ statusCode: 500, updateStatus: false, serverMessage: 'Account update failed' });
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
            
            if (!await employeeQueries.behaviorSkillExistByID(bsID)) {
                return res.json({ statusCode: 500, serverMessage: 'Behavior does not exist' });
            }

            const behaviorAdded = await addEmployeeBehaviorRecord({
                employeeData,
                bsID,
                clientID,
                clientName,
                sessionDate,
                sessionTime,
                count,
                duration,
                trial
            });

            if (behaviorAdded) {
                return res.json({ statusCode: 200, behaviorAdded: true });
            }

            return res.json({ statusCode: 500, behaviorAdded: false });
        } catch (error) {
            return res.json({ statusCode: 500, serverMessage: 'A server error occurred', errorMessage: error.message });
        }
    }
}

module.exports = new EmployeeController();
