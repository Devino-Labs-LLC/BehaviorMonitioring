const { Employee, BehaviorAndSkill, BehaviorData } = require('../../models');

const toError = (err) => err instanceof Error ? err : new Error(err?.message || String(err));

async function updateEmployeeAccount(where, values) {
    const [rowsUpdated] = await Employee.update(values, { where });
    return rowsUpdated > 0;
}

async function createBehaviorDataEntry(values) {
    await BehaviorData.create({
        ...values,
        status: "Active"
    });
    return true;
}

/*-------------------------------------------------Employee--------------------------------------------------*/
async function employeeExistByUsername(uName) {
    try {
        const employee = await Employee.findOne({
            where: { username: uName }
        });
        return employee !== null;
    } catch (err) {
        throw toError(err);
    }
}

async function employeeExistByID(uID) {
    try {
        const employee = await Employee.findOne({
            where: { employeeID: uID }
        });
        return employee !== null;
    } catch (err) {
        throw toError(err);
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
        throw toError(err);
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
        throw toError(err);
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
        throw toError(err);
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
        throw toError(err);
    }
}

async function employeeUpdateEmployeeAccountByUsername(fName, lName, email, phone_number, pWord, uName, compID) {
    try {
        return await updateEmployeeAccount(
            { username: uName, companyID: compID },
            { fName, lName, email, phone_number, password: pWord }
        );
    } catch (err) {
        throw toError(err);
    }
}

async function employeeUpdateEmployeeAccountByID(fName, lName, email, phone_number, pWord, eID, compID) {
    try {
        return await updateEmployeeAccount(
            { employeeID: eID, companyID: compID },
            { fName, lName, email, phone_number, password: pWord }
        );
    } catch (err) {
        throw toError(err);
    }
}

async function employeeUpdateEmployeeAccountWithoutPasswordByUsername(fName, lName, email, phone_number, uName, compID) {
    try {
        return await updateEmployeeAccount(
            { username: uName, companyID: compID },
            { fName, lName, email, phone_number }
        );
    } catch (err) {
        throw toError(err);
    }
}

async function employeeUpdateEmployeeAccountWithoutPasswordByID(fName, lName, email, phone_number, eID, compID) {
    try {
        return await updateEmployeeAccount(
            { employeeID: eID, companyID: compID },
            { fName, lName, email, phone_number }
        );
    } catch (err) {
        throw toError(err);
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
        throw toError(err);
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
        throw toError(err);
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
        throw toError(err);
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
        throw toError(err);
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
        throw toError(err);
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
        throw toError(err);
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
        throw toError(err);
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
        throw toError(err);
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
        throw toError(err);
    }
}

async function employeeAddFrequencyBehaviorData({
    bsID,
    cID,
    cName,
    sDate,
    sTime,
    count,
    enteredBy,
    compID,
    compName,
    dateEntered,
    timeEntered
}) {
    try {
        return await createBehaviorDataEntry({
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
            time_entered: timeEntered
        });
    } catch (err) {
        throw toError(err);
    }
}

async function employeeAddRateBehaviorData({
    bsID,
    cID,
    cName,
    sDate,
    sTime,
    count,
    duration,
    enteredBy,
    compID,
    compName,
    dateEntered,
    timeEntered
}) {
    try {
        return await createBehaviorDataEntry({
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
            time_entered: timeEntered
        });
    } catch (err) {
        throw toError(err);
    }
}

async function employeeAddDurationBehaviorData({
    bsID,
    cID,
    cName,
    sDate,
    sTime,
    trial,
    enteredBy,
    compID,
    compName,
    dateEntered,
    timeEntered
}) {
    try {
        return await createBehaviorDataEntry({
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
            time_entered: timeEntered
        });
    } catch (err) {
        throw toError(err);
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
