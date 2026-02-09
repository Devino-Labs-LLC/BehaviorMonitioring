const { Employee, BehaviorAndSkill, BehaviorData } = require('../../models');

/*-------------------------------------------------Employee--------------------------------------------------*/
async function employeeExistByUsername(uName) {
    try {
        const employee = await Employee.findOne({
            where: { username: uName }
        });
        return employee !== null;
    } catch (err) {
        throw { message: err.message };
    }
}

async function employeeExistByID(uID) {
    try {
        const employee = await Employee.findOne({
            where: { employeeID: uID }
        });
        return employee !== null;
    } catch (err) {
        throw { message: err.message };
    }
}

async function employeeDataByUsername(uName) {
    try {
        const employee = await Employee.findOne({
            where: { username: uName },
            attributes: ['employeeID', 'fName', 'lName', 'username', 'email', 'phone_number', 'role', 'account_status', 'companyID', 'companyName', 'email_verified']
        });
        return employee ? employee.get({ plain: true }) : null;
    } catch (err) {
        throw { message: err.message };
    }
}

async function employeeDataById(uID) {
    try {
        const employee = await Employee.findOne({
            where: { employeeID: uID },
            attributes: ['employeeID', 'fName', 'lName', 'username', 'email', 'phone_number', 'role', 'account_status', 'companyID', 'companyName', 'email_verified']
        });
        return employee ? employee.get({ plain: true }) : null;
    } catch (err) {
        throw { message: err.message };
    }
}

async function employeePasswordByUsername(uName) {
    try {
        const employee = await Employee.findOne({
            where: { username: uName },
            attributes: ['password']
        });
        return employee ? employee.get({ plain: true }) : null;
    } catch (err) {
        throw { message: err.message };
    }
}

async function employeePasswordById(uID) {
    try {
        const employee = await Employee.findOne({
            where: { employeeID: uID },
            attributes: ['password']
        });
        return employee ? employee.get({ plain: true }) : null;
    } catch (err) {
        throw { message: err.message };
    }
}

async function employeeUpdateEmployeeAccountByUsername(fName, lName, email, phone_number, pWord, uName, compID) {
    try {
        const [rowsUpdated] = await Employee.update(
            { fName, lName, email, phone_number, password: pWord },
            { where: { username: uName, companyID: compID } }
        );
        return rowsUpdated > 0;
    } catch (err) {
        throw { message: err.message };
    }
}

async function employeeUpdateEmployeeAccountByID(fName, lName, email, phone_number, pWord, eID, compID) {
    try {
        const [rowsUpdated] = await Employee.update(
            { fName, lName, email, phone_number, password: pWord },
            { where: { employeeID: eID, companyID: compID } }
        );
        return rowsUpdated > 0;
    } catch (err) {
        throw { message: err.message };
    }
}

async function employeeUpdateEmployeeAccountWithoutPasswordByUsername(fName, lName, email, phone_number, pWord, uName, compID) {
    try {
        const [rowsUpdated] = await Employee.update(
            { fName, lName, email, phone_number, password: pWord },
            { where: { username: uName, companyID: compID } }
        );
        return rowsUpdated > 0;
    } catch (err) {
        throw { message: err.message };
    }
}

async function employeeUpdateEmployeeAccountWithoutPasswordByID(fName, lName, email, phone_number, pWord, eID, compID) {
    try {
        const [rowsUpdated] = await Employee.update(
            { fName, lName, email, phone_number, password: pWord },
            { where: { employeeID: eID, companyID: compID } }
        );
        return rowsUpdated > 0;
    } catch (err) {
        throw { message: err.message };
    }
}

async function employeeUpdateEmployeeAccountStatusByUsername(accountStatus, uName, compID) {
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

async function employeeUpdateEmployeeStatusAccountByID(accountStatus, eID, compID) {
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

async function employeeSetEmployeeCredentialsByUsername(pWord, uName, compID) {
    try {
        const [rowsUpdated] = await Employee.update(
            { password: pWord },
            { where: { username: uName, companyID: compID } }
        );
        return rowsUpdated > 0;
    } catch (err) {
        throw { message: err.message };
    }
}

async function employeeSetEmployeeCredentialsByID(pWord, eID, compID) {
    try {
        const [rowsUpdated] = await Employee.update(
            { password: pWord },
            { where: { employeeID: eID, companyID: compID } }
        );
        return rowsUpdated > 0;
    } catch (err) {
        throw { message: err.message };
    }
}

async function employeeDataByEmail(email) {
    try {
        const employee = await Employee.findOne({
            where: { email: email },
            attributes: ['employeeID', 'fName', 'lName', 'username', 'email', 'phone_number', 'role', 'account_status', 'companyID', 'companyName']
        });
        return employee ? employee.get({ plain: true }) : null;
    } catch (err) {
        throw { message: err.message };
    }
}

async function employeeSetPasswordResetToken(employeeID, resetToken, expiryDate) {
    try {
        const [rowsUpdated] = await Employee.update(
            { 
                password_reset_token: resetToken,
                password_reset_expires: expiryDate
            },
            { where: { employeeID: employeeID } }
        );
        return rowsUpdated > 0;
    } catch (err) {
        throw { message: err.message };
    }
}

async function employeeDataByResetToken(token) {
    try {
        const employee = await Employee.findOne({
            where: { password_reset_token: token },
            attributes: ['employeeID', 'fName', 'lName', 'username', 'email', 'password_reset_expires']
        });
        return employee ? employee.get({ plain: true }) : null;
    } catch (err) {
        throw { message: err.message };
    }
}

async function employeeResetPassword(employeeID, hashedPassword) {
    try {
        const [rowsUpdated] = await Employee.update(
            { 
                password: hashedPassword,
                password_reset_token: null,
                password_reset_expires: null
            },
            { where: { employeeID: employeeID } }
        );
        return rowsUpdated > 0;
    } catch (err) {
        throw { message: err.message };
    }
}

/*-------------------------------------------------ABA--------------------------------------------------*/
async function behaviorSkillExistByID(bsID, compID) {
    try {
        const record = await BehaviorAndSkill.findOne({
            where: { bsID, companyID: compID }
        });
        return record !== null;
    } catch (err) {
        throw { message: err.message };
    }
}

async function employeeAddFrequencyBehaviorData(bsID, cID, cName, sDate, sTime, count, enteredBy, compID, compName, dateEntered, timeEntered) {
    try {
        await BehaviorData.create({
            bsID, 
            clientID: cID, 
            clientName: cName, 
            sessionDate: sDate, 
            sessionTime: sTime, 
            count, 
            entered_by: enteredBy, 
            companyID: compID, 
            companyName: compName,
            date_entered: dateEntered, 
            time_entered: timeEntered, 
            status: "Active"
        });
        return true;
    } catch (err) {
        throw { message: err.message };
    }
}

async function employeeAddRateBehaviorData(bsID, cID, cName, sDate, sTime, count, duration, enteredBy, compID, compName, dateEntered, timeEntered) {
    try {
        await BehaviorData.create({
            bsID, 
            clientID: cID, 
            clientName: cName, 
            sessionDate: sDate, 
            sessionTime: sTime, 
            count, 
            duration, 
            entered_by: enteredBy, 
            companyID: compID, 
            companyName: compName, 
            date_entered: dateEntered, 
            time_entered: timeEntered, 
            status: "Active"
        });
        return true;
    } catch (err) {
        throw { message: err.message };
    }
}

async function employeeAddDurationBehaviorData(bsID, cID, cName, sDate, sTime, trial, enteredBy, compID, compName, dateEntered, timeEntered) {
    try {
        await BehaviorData.create({
            bsID, 
            clientID: cID, 
            clientName: cName, 
            sessionDate: sDate, 
            sessionTime: sTime, 
            duration: trial, 
            entered_by: enteredBy, 
            companyID: compID, 
            companyName: compName,
            date_entered: dateEntered, 
            time_entered: timeEntered, 
            status: "Active"
        });
        return true;
    } catch (err) {
        throw { message: err.message };
    }
}

module.exports = {
    employeeExistByUsername,
    employeeExistByID,
    employeeDataByUsername,
    employeeDataById,
    employeePasswordByUsername,
    employeePasswordById,
    employeeUpdateEmployeeAccountByUsername,
    employeeUpdateEmployeeAccountByID,
    employeeUpdateEmployeeAccountWithoutPasswordByUsername,
    employeeUpdateEmployeeAccountWithoutPasswordByID,
    employeeUpdateEmployeeAccountStatusByUsername,
    employeeUpdateEmployeeStatusAccountByID,
    employeeSetEmployeeCredentialsByUsername,
    employeeSetEmployeeCredentialsByID,
    employeeDataByEmail,
    employeeSetPasswordResetToken,
    employeeDataByResetToken,
    employeeResetPassword,
    behaviorSkillExistByID,
    employeeAddFrequencyBehaviorData,
    employeeAddRateBehaviorData,
    employeeAddDurationBehaviorData
}