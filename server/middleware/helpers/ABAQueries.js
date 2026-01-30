const { Client, BehaviorAndSkill, BehaviorData, SessionNoteData } = require('../../models');

/*-------------------------------------------------client--------------------------------------------------*/
async function abaClientExistByID(cID, compID) {
    try {
        const client = await Client.findOne({
            where: { clientID: cID, companyID: compID, }
        });
        return client !== null;
    } catch (err) {
        throw { message: err.message };
    }
}

async function abaAddClientData(fName, lName, DOB, intakeDate, groupHomeName, medicadeNum, behaviorPlanDueDate, enteredBy, compID, compName, dateEntered, timeEntered) {
    try {
        await Client.create({
            fName, lName, DOB, 
            intake_Date: intakeDate, 
            group_home_name: groupHomeName, 
            medicaid_id_number: medicadeNum, 
            behavior_plan_due_date: behaviorPlanDueDate, 
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

async function abaGetClientDataByID(cID) {
    try {
        const client = await Client.findOne({
            where: { clientID: cID },
            attributes: ['clientID', 'fName', 'lName', 'DOB', 'intake_Date', 'group_home_name', 'medicaid_id_number', 'behavior_plan_due_date', 'entered_by', 'date_entered', 'companyID', 'companyName', 'time_entered']
        });
        return client ? client.get({ plain: true }) : null;
    } catch (err) {
        throw { message: err.message };
    }
}

async function abaGetAllClientData() {
    try {
        const clients = await Client.findAll({
            attributes: ['clientID', 'fName', 'lName', 'DOB', 'intake_Date', 'group_home_name', 'medicaid_id_number', 'behavior_plan_due_date', 'entered_by', 'companyID', 'companyName', 'date_entered', 'time_entered']
        });
        return clients.map(c => c.get({ plain: true }));
    } catch (err) {
        throw { message: err.message };
    }
}

async function abaUpdateClientData(fName, lName, DOB, intakeDate, groupHomeName, medicadeNum, behaviorPlanDueDate, cID) {
    try {
        const [rowsUpdated] = await Client.update({
            fName, lName, DOB,
            intake_Date: intakeDate,
            group_home_name: groupHomeName,
            medicaid_id_number: medicadeNum,
            behavior_plan_due_date: behaviorPlanDueDate
        }, {
            where: { clientID: cID }
        });
        return rowsUpdated > 0;
    } catch (err) {
        throw { message: err.message };
    }
}

/*-------------------------------------------------Behavior--------------------------------------------------*/
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

async function abaAddBehaviorOrSkill(name, def, meas, cat, type, cID, cName, enteredBy, compID, compName, dateEntered, timeEntered) {
    try {
        await BehaviorAndSkill.create({
            name, 
            definition: def, 
            measurement: meas, 
            category: cat, 
            type, 
            clientID: cID, 
            clientName: cName, 
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

async function abaUpdateBehaviorOrSkill(name, def, meas, cat, type, cID, cName, bsID, compID) {
    try {
        const [rowsUpdated] = await BehaviorAndSkill.update({
            name, 
            definition: def, 
            measurement: meas, 
            category: cat, 
            type, 
            clientID: cID, 
            clientName: cName
        }, {
            where: { bsID, companyID }
        });
        return rowsUpdated > 0;
    } catch (err) {
        throw { message: err.message };
    }
}

async function abaGetBehaviorOrSkill(cID, BorS, compID) {
    try {
        const records = await BehaviorAndSkill.findAll({
            where: { clientID: cID, type: BorS, companyID: compID, status: "Active" },
            attributes: ['bsID', 'name', 'definition', 'measurement', 'category', 'type', 'clientID', 'clientName', 'entered_by', 'date_entered', 'time_entered', 'status']
        });
        return records.map(r => r.get({ plain: true }));
    } catch (err) {
        throw { message: err.message };
    }
}

async function abaGetABehaviorOrSkill(cID, bsID, BorS, compID) {
    try {
        const records = await BehaviorAndSkill.findAll({
            where: { clientID: cID, bsID, type: BorS, companyID: compID, status: "Active" },
            attributes: ['bsID', 'name', 'definition', 'measurement', 'category', 'type', 'clientID', 'clientName', 'entered_by', 'date_entered', 'time_entered', 'status']
        });
        return records.map(r => r.get({ plain: true }));
    } catch (err) {
        throw { message: err.message };
    }
}

async function abaAddFrequencyBehaviorData(bsID, cID, cName, sDate, sTime, count, enteredBy, compID, compName, dateEntered, timeEntered) {
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

async function abaAddRateBehaviorData(bsID, cID, cName, sDate, sTime, count, duration, enteredBy, compID, compName, dateEntered, timeEntered) {
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

async function abaAddDurationBehaviorData(bsID, cID, cName, sDate, sTime, trial, enteredBy, compID, compName, dateEntered, timeEntered) {
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

async function abaGetBehaviorDataById(cID, bsID, compID) {
    try {
        const records = await BehaviorData.findAll({
            where: { bsID, clientID: cID, companyID: compID, status: "Active" },
            attributes: ['behaviorDataID', 'bsID', 'clientID', 'clientName', 'sessionDate', 'sessionTime', 'count', 'duration', 'trial', 'entered_by', 'date_entered', 'time_entered', 'status']
        });
        return records.map(r => r.get({ plain: true }));
    } catch (err) {
        throw { message: err.message };
    }
}

async function abaFoundBehaviorDataById(cID, bsID, compID) {
    try {
        const count = await BehaviorData.count({
            where: { bsID, clientID: cID, companyID: compID, status: "Active" }
        });
        return count > 0;
    } catch (err) {
        throw { message: err.message };
    }
}

async function abaMergeBehaviorDataById(cID, tBSID, mBsID, compID) {
    try {
        const [rowsUpdated] = await BehaviorData.update(
            { bsID: tBSID },
            { where: { bsID: mBsID, clientID: cID, companyID } }
        );
        return rowsUpdated > 0;
    } catch (err) {
        throw { message: err.message };
    }
}

async function abaDeleteBehaviorDataByID(cID, bsID, compID) {
    try {
        const rowsDeleted = await BehaviorData.destroy({
            where: { bsID, clientID: cID, companyID }
        });
        return rowsDeleted > 0;
    } catch (err) {
        throw { message: err.message };
    }
}

async function abaGetBehaviorDataByBehaviorId(cID, bsID, bdID, compID) {
    try {
        const count = await BehaviorData.count({
            where: { bsID, behaviorDataID: bdID, clientID: cID, companyID: compID, status: "Active" }
        });
        return count > 0;
    } catch (err) {
        throw { message: err.message };
    }
}

async function abaDeleteBehaviorDataByBehaviorID(cID, bsID, bdID, compID) {
    try {
        const rowsDeleted = await BehaviorData.destroy({
            where: { bsID, behaviorDataID: bdID, clientID: cID, companyID }
        });
        return rowsDeleted > 0;
    } catch (err) {
        throw { message: err.message };
    }
}

async function abaDeleteBehaviorOrSkillByID(cID, bsID, compID) {
    try {
        const rowsDeleted = await BehaviorAndSkill.destroy({
            where: { bsID, clientID: cID, companyID }
        });
        return rowsDeleted > 0;
    } catch (err) {
        throw { message: err.message };
    }
}

async function abaArchiveBehaviorDataByID(newStatus, cID, bsID, compID) {
    try {
        const [rowsUpdated] = await BehaviorData.update(
            { status: newStatus },
            { where: { bsID, clientID: cID, companyID } }
        );
        return rowsUpdated > 0;
    } catch (err) {
        throw { message: err.message };
    }
}

async function abaArchiveBehaviorOrSkillByID(cID, bsID, dateArchived, dateToDeleteArchive, compID) {
    try {
        const [rowsUpdated] = await BehaviorAndSkill.update(
            { status: "Archived", archived_date: dateArchived, archived_deletion_date: dateToDeleteArchive },
            { where: { bsID, clientID: cID, companyID } }
        );
        return rowsUpdated > 0;
    } catch (err) {
        throw { message: err.message };
    }
}

/*-------------------------------------------------Behavior ARCHIVE--------------------------------------------------*/

async function archiveBehaviorSkillExistByID(bsID, compID) {
    try {
        const record = await BehaviorAndSkill.findOne({
            where: { bsID, companyID: compID, status: 'Archived' }
        });
        return record !== null;
    } catch (err) {
        throw { message: err.message };
    }
}

async function abaReactivateBehaviorDataByID(newStatus, cID, bsID, compID) {
    try {
        const [rowsUpdated] = await BehaviorData.update(
            { status: newStatus },
            { where: { bsID, clientID: cID, companyID } }
        );
        return rowsUpdated > 0;
    } catch (err) {
        throw { message: err.message };
    }
}

async function abaReactivateBehaviorOrSkillByID(cID, bsID, dateArchived, dateToDeleteArchive, compID) {
    try {
        const [rowsUpdated] = await BehaviorAndSkill.update(
            { status: "Active", archived_date: dateArchived, archived_deletion_date: dateToDeleteArchive },
            { where: { bsID, clientID: cID, companyID } }
        );
        return rowsUpdated > 0;
    } catch (err) {
        throw { message: err.message };
    }
}

async function abaGetArchivedBehaviorDataById(cID, bsID, compID) {
    try {
        const records = await BehaviorData.findAll({
            where: { bsID, clientID: cID, companyID: compID, status: "Archived" },
            attributes: ['behaviorDataID', 'bsID', 'clientID', 'clientName', 'sessionDate', 'sessionTime', 'count', 'duration', 'trial', 'entered_by', 'date_entered', 'time_entered', 'status']
        });
        return records.map(r => r.get({ plain: true }));
    } catch (err) {
        throw { message: err.message };
    }
}

async function abaGetArchivedBehaviorOrSkill(cID, BorS, compID) {
    try {
        const records = await BehaviorAndSkill.findAll({
            where: { clientID: cID, type: BorS, companyID: compID, status: "Archived" },
            attributes: ['bsID', 'name', 'definition', 'measurement', 'category', 'type', 'clientID', 'clientName', 'entered_by', 'date_entered', 'time_entered', 'status']
        });
        return records.map(r => r.get({ plain: true }));
    } catch (err) {
        throw { message: err.message };
    }
}

async function abaDeleteArchivedBehaviorDataByID(cID, bsID, compID) {
    try {
        const rowsDeleted = await BehaviorData.destroy({
            where: { bsID, clientID: cID, companyID: compID, status: 'Archived' }
        });
        return rowsDeleted > 0;
    } catch (err) {
        throw { message: err.message };
    }
}

async function abaDeleteArchivedBehaviorOrSkillByID(cID, bsID, compID) {
    try {
        const rowsDeleted = await BehaviorAndSkill.destroy({
            where: { bsID, clientID: cID, companyID: compID, status: 'Archived' }
        });
        return rowsDeleted > 0;
    } catch (err) {
        throw { message: err.message };
    }
}

async function abaGetAArchivedBehaviorOrSkill(cID, bsID, BorS, compID) {
    try {
        const records = await BehaviorAndSkill.findAll({
            where: { clientID: cID, bsID, type: BorS, companyID: compID, status: "Archived" },
            attributes: ['bsID', 'name', 'definition', 'measurement', 'category', 'type', 'clientID', 'clientName', 'entered_by', 'date_entered', 'time_entered', 'status']
        });
        return records.map(r => r.get({ plain: true }));
    } catch (err) {
        throw { message: err.message };
    }
}

async function abaGetArchivedBehaviorDataByBehaviorId(cID, bsID, bdID, compID) {
    try {
        const count = await BehaviorData.count({
            where: { bsID, behaviorDataID: bdID, clientID: cID, companyID: compID, status: "Archived" }
        });
        return count > 0;
    } catch (err) {
        throw { message: err.message };
    }
}

async function abaDeleteArchivedBehaviorDataByBehaviorID(cID, bsID, bdID, compID) {
    try {
        const rowsDeleted = await BehaviorData.destroy({
            where: { bsID, behaviorDataID: bdID, clientID: cID, companyID: compID, status: "Archived" }
        });
        return rowsDeleted > 0;
    } catch (err) {
        throw { message: err.message };
    }
}

/*-------------------------------------------------Session Notes--------------------------------------------------*/
async function abaSessionNoteDataByClientIDExists(cID, compID) {
    try {
        const count = await SessionNoteData.count({
            where: { clientID: cID, companyID: compID, }
        });
        return count > 0;
    } catch (err) {
        throw { message: err.message };
    }
}

async function abaSessionNoteDataByClientID(cID, compID) {
    try {
        const records = await SessionNoteData.findAll({
            where: { clientID: cID, companyID: compID, status: 'Active' },
            attributes: ['sessionNoteDataID', 'clientID', 'clientName', 'sessionDate', 'sessionTime', 'sessionNotes', 'entered_by', 'date_entered', 'time_entered', 'status']
        });
        return records.map(r => r.get({ plain: true }));
    } catch (err) {
        throw { message: err.message };
    }
}

async function abaGetSessionNoteByID(cID, sessionNoteId, compID) {
    try {
        const records = await SessionNoteData.findAll({
            where: { clientID: cID, sessionNoteDataID: sessionNoteId, companyID: compID, status: 'Active' },
            attributes: ['sessionNoteDataID', 'clientID', 'clientName', 'sessionDate', 'sessionTime', 'sessionNotes', 'entered_by', 'date_entered', 'time_entered', 'status']
        });
        return records.map(r => r.get({ plain: true }));
    } catch (err) {
        throw { message: err.message };
    }
}

async function abaAddSessionNoteData(cID, cName, sDate, sTime, sNotes, enteredBy, compID, compName, dateEntered, timeEntered) {
    try {
        await SessionNoteData.create({
            clientID: cID, 
            clientName: cName, 
            sessionDate: sDate, 
            sessionTime: sTime, 
            sessionNotes: sNotes, 
            entered_by: enteredBy, 
            companyID: compID, 
            companyName: compName, 
            date_entered: dateEntered, 
            time_entered: timeEntered,
            status: 'Active'
        });
        return true;
    } catch (err) {
        throw { message: err.message };
    }
}

async function abaDeleteSessionNoteDataByID(cID, snID, compID) {
    try {
        const rowsDeleted = await SessionNoteData.destroy({
            where: { sessionNoteDataID: snID, clientID: cID, companyID: compID, }
        });
        return rowsDeleted > 0;
    } catch (err) {
        throw { message: err.message };
    }
}
/*-------------------------------------------------Archived Session Notes--------------------------------------------------*/
async function abaGetArchivedSessionNoteDataByClientID(cID, compID) {
    try {
        const records = await SessionNoteData.findAll({
            where: { clientID: cID, companyID: compID, status: 'Archived' },
            attributes: ['sessionNoteDataID', 'clientID', 'clientName', 'sessionDate', 'sessionTime', 'sessionNotes', 'entered_by', 'date_entered', 'time_entered', 'status']
        });
        return records.map(r => r.get({ plain: true }));
    } catch (err) {
        throw { message: err.message };
    }
}

async function abaGetArchivedSessionNoteByID(cID, sessionNoteId, compID) {
    try {
        const records = await SessionNoteData.findAll({
            where: { clientID: cID, sessionNoteDataID: sessionNoteId, companyID: compID, status: 'Archived' },
            attributes: ['sessionNoteDataID', 'clientID', 'clientName', 'sessionDate', 'sessionTime', 'sessionNotes', 'entered_by', 'date_entered', 'time_entered', 'status']
        });
        return records.map(r => r.get({ plain: true }));
    } catch (err) {
        throw { message: err.message };
    }
}

async function abaReactivateSessionNoteByID(cID, sessionNoteId, compID) {
    try {
        const [rowsUpdated] = await SessionNoteData.update(
            { status: 'Active' },
            { where: { sessionNoteDataID: sessionNoteId, clientID: cID, companyID: compID } }
        );
        return rowsUpdated > 0;
    } catch (err) {
        throw { message: err.message };
    }
}

async function abaArchiveSessionNoteByID(cID, sessionNoteId, compID) {
    try {
        const [rowsUpdated] = await SessionNoteData.update(
            { status: 'Archived' },
            { where: { sessionNoteDataID: sessionNoteId, clientID: cID, companyID: compID } }
        );
        return rowsUpdated > 0;
    } catch (err) {
        throw { message: err.message };
    }
}

async function abaDeleteArchivedSessionNoteByID(cID, sessionNoteId, compID) {
    try {
        const rowsDeleted = await SessionNoteData.destroy({
            where: { sessionNoteDataID: sessionNoteId, clientID: cID, companyID: compID, status: 'Archived' }
        });
        return rowsDeleted > 0;
    } catch (err) {
        throw { message: err.message };
    }
}

module.exports = {
    abaClientExistByID,
    abaAddClientData,
    abaGetClientDataByID,
    abaUpdateClientData,
    abaGetAllClientData,
    behaviorSkillExistByID,
    abaGetBehaviorDataById,
    abaFoundBehaviorDataById,
    abaGetABehaviorOrSkill,
    abaAddBehaviorOrSkill,
    abaUpdateBehaviorOrSkill,
    abaGetBehaviorOrSkill,
    abaAddFrequencyBehaviorData,
    abaAddRateBehaviorData,
    abaAddDurationBehaviorData,
    abaMergeBehaviorDataById,
    abaDeleteBehaviorDataByID,
    abaDeleteBehaviorOrSkillByID,
    abaGetBehaviorDataByBehaviorId,
    abaDeleteBehaviorDataByBehaviorID,
    archiveBehaviorSkillExistByID,
    abaArchiveBehaviorDataByID,
    abaReactivateBehaviorOrSkillByID,
    abaReactivateBehaviorDataByID,
    abaArchiveBehaviorOrSkillByID,
    abaGetArchivedBehaviorDataById,
    abaGetArchivedBehaviorOrSkill,
    abaDeleteArchivedBehaviorDataByID,
    abaDeleteArchivedBehaviorOrSkillByID,
    abaGetArchivedBehaviorDataByBehaviorId,
    abaGetAArchivedBehaviorOrSkill,
    abaDeleteArchivedBehaviorDataByBehaviorID,
    abaAddSessionNoteData,
    abaSessionNoteDataByClientID,
    abaSessionNoteDataByClientIDExists,
    abaGetSessionNoteByID,
    abaDeleteSessionNoteDataByID,
    abaGetArchivedSessionNoteDataByClientID,
    abaGetArchivedSessionNoteByID,
    abaReactivateSessionNoteByID,
    abaArchiveSessionNoteByID,
    abaDeleteArchivedSessionNoteByID
}