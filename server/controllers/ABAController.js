const abaQueries = require('../middleware/helpers/ABAQueries');
const employeeQueries = require('../middleware/helpers/EmployeeQueries');
const currentDateTime = require('../functions/base/currentDateTime');
const { addDays, addYears } = require('../functions/base/addDayYear');
const { formatDateString, formatTimeString } = require('../functions/base/dateTimeFormat');
const { verifyABAAuthorization, verifyBasicAuthentication } = require('../middleware/helpers/authorizationHelper');

const sendNotImplemented = (res, serverMessage = 'Not implemented') =>
    res.json({ statusCode: 501, serverMessage });

async function getAuditTimestamp() {
    return {
        currentDate: await formatDateString(await currentDateTime.getCurrentDate()),
        currentTime: await currentDateTime.getCurrentTime()
    };
}

async function deleteBehaviorAndDataIfPresent(queryApi, cID, behaviorId, companyID, behaviorName) {
    const hasBehaviorData = await queryApi.abaFoundBehaviorDataById(cID, behaviorId, companyID);

    if (hasBehaviorData && !await queryApi.abaDeleteBehaviorDataByID(cID, behaviorId, companyID)) {
        throw new Error(`An error occured while deleting ${behaviorName}'s data`);
    }

    if (!await queryApi.abaDeleteBehaviorOrSkillByID(cID, behaviorId, companyID)) {
        throw new Error(`An error occured while deleting ${behaviorName}`);
    }
}

async function addBehaviorForClient(behavior, employeeData) {
    const { behaviorName: name, behaviorDefinition: def, behaviorMeasurement: meas, behaviorCategory: cat, type, clientID: cID, clientName } = behavior;

    if (!await abaQueries.abaClientExistByID(cID, employeeData.companyID)) {
        return { errorResponse: { statusCode: 400, behaviorsAdded: false, serverMessage: 'Client does not exist' } };
    }

    const clientData = await abaQueries.abaGetClientDataByID(cID, employeeData.companyID);
    if (!clientData) {
        return { errorResponse: { statusCode: 500, behaviorsAdded: false, serverMessage: 'Unable to locate client data' } };
    }

    const { currentDate, currentTime } = await getAuditTimestamp();
    const behaviorAdded = await abaQueries.abaAddBehaviorOrSkill({
        name,
        def,
        meas,
        cat,
        type,
        cID,
        cName: `${clientData.fName} ${clientData.lName}`,
        enteredBy: `${employeeData.fName} ${employeeData.lName}`,
        compID: employeeData.companyID,
        compName: employeeData.companyName,
        dateEntered: currentDate,
        timeEntered: currentTime
    });

    if (!behaviorAdded) {
        return { failedBehavior: { name, def, meas, cat, type, cID, clientName } };
    }

    return {};
}

const getEmployeeName = (employeeData) => `${employeeData.fName} ${employeeData.lName}`;
const getClientName = (clientData) => `${clientData.fName} ${clientData.lName}`;

async function submitBehaviorMeasurementEntry({
    measurementType,
    selectedTargetId,
    cID,
    clientData,
    occurredDate,
    occurredTime,
    countValue,
    durationValue,
    employeeData
}) {
    const { currentDate, currentTime } = await getAuditTimestamp();
    const clientName = getClientName(clientData);
    const employeeName = getEmployeeName(employeeData);

    switch (measurementType) {
        case "Frequency":
            return abaQueries.abaAddFrequencyBehaviorData({
                bsID: selectedTargetId,
                cID,
                cName: clientName,
                sDate: occurredDate,
                sTime: occurredTime,
                count: countValue,
                enteredBy: employeeName,
                compID: employeeData.companyID,
                compName: employeeData.companyName,
                dateEntered: currentDate,
                timeEntered: currentTime
            });
        case "Duration":
            return abaQueries.abaAddDurationBehaviorData({
                bsID: selectedTargetId,
                cID,
                cName: clientName,
                sDate: occurredDate,
                sTime: occurredTime,
                trial: durationValue,
                enteredBy: employeeName,
                compID: employeeData.companyID,
                compName: employeeData.companyName,
                dateEntered: currentDate,
                timeEntered: currentTime
            });
        case "Rate":
            return abaQueries.abaAddRateBehaviorData({
                bsID: selectedTargetId,
                cID,
                cName: clientName,
                sDate: occurredDate,
                sTime: occurredTime,
                count: countValue,
                duration: durationValue,
                enteredBy: employeeName,
                compID: employeeData.companyID,
                compName: employeeData.companyName,
                dateEntered: currentDate,
                timeEntered: currentTime
            });
        default:
            return false;
    }
}

class ABAController {
    // ============================================
    // CLIENT MANAGEMENT
    // ============================================

    /**
     * Add a new client
     */
    async addNewClient(req, res) {
        try {
            const employeeData = await verifyABAAuthorization(req, res);
            if (!employeeData) return; // Response already sent

            const { clientFName: cFName, clientLName: cLName, dateOfBirth: DOB, intakeDate, ghName, medicadeNum, behaviorProvided } = req.body;
            let behaviorPlanDueDate = await formatDateString(await addDays(intakeDate, 90));
            if (behaviorProvided) {
                behaviorPlanDueDate = await formatDateString(await addYears(intakeDate, 1));
            }

            const { currentDate, currentTime } = await getAuditTimestamp();
            if (await abaQueries.abaAddClientData({
                fName: cFName,
                lName: cLName,
                DOB,
                intakeDate,
                groupHomeName: ghName,
                medicadeNum,
                behaviorPlanDueDate,
                enteredBy: employeeData.fName + " " + employeeData.lName,
                compID: employeeData.companyID,
                compName: employeeData.companyName,
                dateEntered: currentDate,
                timeEntered: currentTime
            })) {
                return res.json({ statusCode: 200, clientAdded: true });
            }

            return res.json({ statusCode: 500, clientAdded: false, serverMessage: 'Unable add a client' });
        } catch (error) {
            return res.json({ statusCode: 500, serverMessage: 'A server error occurred', errorMessage: error.message });
        }
    }

    /**
     * Get client information by ID
     */
    async getClientInfo(req, res) {
        try {
            const employeeData = await verifyABAAuthorization(req, res);
            if (!employeeData) return;

            const { clientID: cID } = req.body;
            
            if (await abaQueries.abaClientExistByID(cID, employeeData.companyID)) {
                const clientData = await abaQueries.abaGetClientDataByID(cID, employeeData.companyID);
                if (clientData) {
                    return res.json({ statusCode: 200, clientData: clientData });
                }
            }
            return res.json({ statusCode: 400, serverMessage: 'Client does not exist' });
        } catch (error) {
            return res.json({ statusCode: 500, serverMessage: 'A server error occurred', errorMessage: error.message });
        }
    }

    /**
     * Update client information
     */
    async updateClientInfo(req, res) {
        try {
            const employeeData = await verifyABAAuthorization(req, res);
            if (!employeeData) return;

            const { clientID: cID, clientFName: cFName, clientLName: cLName, dateOfBirth: DOB, intakeDate, ghName, medicadeNum, behaviorPlanDueDate } = req.body;
            
            if (await abaQueries.abaUpdateClientData({
                fName: cFName,
                lName: cLName,
                DOB,
                intakeDate,
                groupHomeName: ghName,
                medicadeNum,
                behaviorPlanDueDate,
                cID
            })) {
                return res.json({ statusCode: 200, clientAdded: true });
            }
            return res.json({ statusCode: 500, clientAdded: false, serverMessage: 'Unable add a client' });
        } catch (error) {
            return res.json({ statusCode: 500, serverMessage: 'A server error occurred', errorMessage: error.message });
        }
    }

    /**
     * Delete client information
     */
    async deleteClientInfo(req, res) {
        return sendNotImplemented(res, 'Client deletion flow is not implemented yet');
    }

    /**
     * Get all client information
     */
    async getAllClientInfo(req, res) {
        try {
            const employeeData = await verifyBasicAuthentication(req, res);
            if (!employeeData) return;

            const clientData = await abaQueries.abaGetAllClientData(employeeData.companyID);
            if (clientData) {
                return res.json({ statusCode: 200, clientData: clientData });
            }
            return res.json({ statusCode: 400, serverMessage: 'Unable to locate client data' });
        } catch (error) {
            return res.json({ statusCode: 500, serverMessage: 'A server error occurred', errorMessage: error.message });
        }
    }

    // ============================================
    // TARGET BEHAVIOR MANAGEMENT  
    // ============================================

    /**
     * Add new target behaviors
     */
    async addNewTargetBehavior(req, res) {
        try {
            const employeeData = await verifyABAAuthorization(req, res);
            if (!employeeData) return;

            const { behaviors } = req.body;
            const failedBehaviors = [];

            for (const behavior of behaviors) {
                const { errorResponse, failedBehavior } = await addBehaviorForClient(behavior, employeeData);
                if (errorResponse) {
                    return res.json(errorResponse);
                }
                if (failedBehavior) {
                    failedBehaviors.push(failedBehavior);
                }
            }

            if (failedBehaviors.length > 0) {
                return res.json({ statusCode: 500, behaviorsAdded: false, serverMessage: 'Some behaviors failed to add', failedBehaviors });
            }
            return res.json({ statusCode: 204, behaviorsAdded: true, serverMessage: 'All behaviors added successfully' });
        } catch (error) {
            return res.json({ statusCode: 500, serverMessage: 'A server error occurred', errorMessage: error.message });
        }
    }

    /**
     * Update target behavior
     */
    async updateTargetBehavior(req, res) {
        try {
            return sendNotImplemented(res, 'Target behavior update is not implemented yet');
        } catch (error) {
            return res.json({ statusCode: 500, serverMessage: 'A server error occurred', errorMessage: error.message });
        }
    }

    /**
     * Delete target behavior
     */
    async deleteTargetBehavior(req, res) {
        return sendNotImplemented(res, 'Target behavior deletion flow is not implemented yet');
    }

    /**
     * Get target behavior data
     */
    async getTargetBehavior(req, res) {
        try {
            const employeeData = await verifyBasicAuthentication(req, res);
            if (!employeeData) return;

            const { clientID: cID, behaviorID: bID } = req.body;

            if (await abaQueries.behaviorSkillExistByID(bID, employeeData.companyID)) {
                const behaviorSkillData = await abaQueries.abaGetBehaviorDataById(cID, bID, employeeData.companyID);
                if (behaviorSkillData.length > 0) {
                    return res.json({ statusCode: 200, behaviorSkillData });
                }
                return res.json({ statusCode: 500, serverMessage: 'Unable to locate behavior data' });
            }
            return res.json({ statusCode: 400, serverMessage: 'Behavior does not exist' });
        } catch (error) {
            return res.json({ statusCode: 500, serverMessage: 'A server error occurred', errorMessage: error.message });
        }
    }

    /**
     * Get all target behaviors for a client
     */
    async getClientTargetBehavior(req, res) {
        try {
            const employeeData = await verifyBasicAuthentication(req, res);
            if (!employeeData) return;

            const { clientID: cID } = req.body;

            if (await abaQueries.abaClientExistByID(cID, employeeData.companyID)) {
                const behaviorSkillData = await abaQueries.abaGetBehaviorOrSkill(cID, 'Behavior', employeeData.companyID);
                if (behaviorSkillData.length > 0) {
                    return res.json({ statusCode: 200, behaviorSkillData });
                }
                return res.json({ statusCode: 500, serverMessage: 'Unable to locate client data' });
            }
            return res.json({ statusCode: 400, serverMessage: 'Client does not exist' });
        } catch (error) {
            return res.json({ statusCode: 500, serverMessage: 'A server error occurred', errorMessage: error.message });
        }
    }

    /**
     * Get a specific client target behavior
     */
    async getAClientTargetBehavior(req, res) {
        try {
            const employeeData = await verifyBasicAuthentication(req, res);
            if (!employeeData) return;

            const { clientID: cID, behaviorID: bsID } = req.body;

            if (await abaQueries.abaClientExistByID(cID, employeeData.companyID)) {
                const behaviorSkillData = await abaQueries.abaGetABehaviorOrSkill(cID, bsID, 'Behavior', employeeData.companyID);
                if (behaviorSkillData.length > 0) {
                    return res.json({ statusCode: 200, behaviorSkillData });
                }
                return res.json({ statusCode: 500, serverMessage: 'Unable to locate client data' });
            }
            return res.json({ statusCode: 400, serverMessage: 'Client does not exist' });
        } catch (error) {
            return res.json({ statusCode: 500, serverMessage: 'A server error occurred', errorMessage: error.message });
        }
    }

    // ============================================
    // ARCHIVED BEHAVIOR MANAGEMENT
    // ============================================

    /**
     * Get archived behavior data
     */
    async getArchivedBehavior(req, res) {
        try {
            const employeeData = await verifyBasicAuthentication(req, res);
            if (!employeeData) return;

            const { clientID: cID, behaviorID: bID } = req.body;

            if (await abaQueries.behaviorSkillExistByID(bID, employeeData.companyID)) {
                const behaviorSkillData = await abaQueries.abaGetArchivedBehaviorDataById(cID, bID, employeeData.companyID);
                if (behaviorSkillData.length > 0) {
                    return res.json({ statusCode: 200, behaviorSkillData });
                }
                return res.json({ statusCode: 500, serverMessage: 'Unable to locate behavior data' });
            }
            return res.json({ statusCode: 400, serverMessage: 'Behavior does not exist' });
        } catch (error) {
            return res.json({ statusCode: 500, serverMessage: 'A server error occurred', errorMessage: error.message });
        }
    }

    /**
     * Get all archived behaviors for a client
     */
    async getClientArchivedBehavior(req, res) {
        try {
            const employeeData = await verifyBasicAuthentication(req, res);
            if (!employeeData) return;

            const { clientID: cID } = req.body;

            if (await abaQueries.abaClientExistByID(cID, employeeData.companyID)) {
                const behaviorSkillData = await abaQueries.abaGetBehaviorOrSkill(cID, 'Behavior', employeeData.companyID);
                const archivedBehaviorSkillData = await abaQueries.abaGetArchivedBehaviorOrSkill(cID, 'Behavior', employeeData.companyID);

                if (archivedBehaviorSkillData.length > 0 || behaviorSkillData.length > 0) {
                    return res.json({ statusCode: 200, behaviorSkillData: archivedBehaviorSkillData });
                }
                return res.json({ statusCode: 500, serverMessage: 'Unable to locate client data' });
            }
            return res.json({ statusCode: 400, serverMessage: 'Client does not exist' });
        } catch (error) {
            return res.json({ statusCode: 500, serverMessage: 'A server error occurred', errorMessage: error.message });
        }
    }

    /**
     * Get a specific archived behavior for a client
     */
    async getAClientArchivedBehavior(req, res) {
        try {
            const employeeData = await verifyBasicAuthentication(req, res);
            if (!employeeData) return;

            const { clientID: cID, behaviorID: bsID } = req.body;

            if (await abaQueries.abaClientExistByID(cID, employeeData.companyID)) {
                const behaviorSkillData = await abaQueries.abaGetABehaviorOrSkill(cID, bsID, 'Behavior', employeeData.companyID);
                const archivedBehaviorSkillData = await abaQueries.abaGetAArchivedBehaviorOrSkill(cID, bsID, 'Behavior', employeeData.companyID);

                if (archivedBehaviorSkillData.length > 0) {
                    return res.json({ statusCode: 200, behaviorSkillData: archivedBehaviorSkillData });
                } else if (behaviorSkillData.length > 0) {
                    return res.json({ statusCode: 200, behaviorSkillData });
                }
                return res.json({ statusCode: 500, serverMessage: 'Unable to locate client data' });
            }
            return res.json({ statusCode: 400, serverMessage: 'Client does not exist' });
        } catch (error) {
            return res.json({ statusCode: 500, serverMessage: 'A server error occurred', errorMessage: error.message });
        }
    }

    /**
     * Get archived behavior data by ID
     */
    async getAArchivedBehaviorData(req, res) {
        try {
            const employeeData = await verifyBasicAuthentication(req, res);
            if (!employeeData) return;

            const { clientID: cID, behaviorID: bID } = req.body;

            if (!await abaQueries.behaviorSkillExistByID(bID, employeeData.companyID)) {
                return res.json({ statusCode: 400, serverMessage: 'Behavior does not exist' });
            }

            const behaviorSkillData = await abaQueries.abaGetBehaviorDataById(cID, bID, employeeData.companyID);
            const archivedBehaviorSkillData = await abaQueries.abaGetArchivedBehaviorDataById(cID, bID, employeeData.companyID);

            if (archivedBehaviorSkillData.length > 0) {
                return res.json({ statusCode: 200, behaviorSkillData: archivedBehaviorSkillData });
            }

            if (behaviorSkillData.length > 0) {
                return res.json({ statusCode: 200, behaviorSkillData });
            }

            return res.json({ statusCode: 500, serverMessage: 'Unable to locate behavior data' });
        } catch (error) {
            return res.json({ statusCode: 500, serverMessage: 'A server error occurred', errorMessage: error.message });
        }
    }

    // ============================================
    // BEHAVIOR DATA OPERATIONS
    // ============================================

    /**
     * Submit target behavior data
     */
    async submitTargetBehavior(req, res) {
        try {
            const employeeData = await verifyABAAuthorization(req, res);
            if (!employeeData) return;

            const { clientID: cID, targetAmt: targetAmount, selectedTargets: selectedTargetIds, selectedMeasurementTypes, dates: datesTargetsOccured, times: timesTargetsOccured, count, duration } = req.body;

            if (!await abaQueries.abaClientExistByID(cID, employeeData.companyID)) {
                return res.json({ statusCode: 400, behaviorAdded: false, serverMessage: 'Client does not exist' });
            }

            const clientData = await abaQueries.abaGetClientDataByID(cID, employeeData.companyID);

            for (const [index, selectedTargetId] of selectedTargetIds.entries()) {
                if (index >= targetAmount) {
                    break;
                }

                if (!await abaQueries.behaviorSkillExistByID(selectedTargetId, employeeData.companyID)) {
                    continue;
                }

                const addedSuccessfully = await submitBehaviorMeasurementEntry({
                    measurementType: selectedMeasurementTypes[index],
                    selectedTargetId,
                    cID,
                    clientData,
                    occurredDate: datesTargetsOccured[index],
                    occurredTime: timesTargetsOccured[index],
                    countValue: count[index],
                    durationValue: duration[index],
                    employeeData
                });

                if (addedSuccessfully) {
                    continue;
                }

                return res.json({
                    statusCode: 400,
                    behaviorAdded: false,
                    serverMessage: 'Target behavior id, ' + selectedTargetId + ', does not exist',
                    Data: {
                        index,
                        Date: datesTargetsOccured[index],
                        time: timesTargetsOccured[index],
                        count: count[index],
                        duration: duration[index]
                    }
                });
            }

            return res.json({ statusCode: 201, behaviorAdded: true, serverMessage: 'All behavior data added' });
        } catch (error) {
            return res.json({ statusCode: 500, serverMessage: 'A server error occurred', errorMessage: error.message });
        }
    }

    /**
     * Merge multiple behaviors into one
     */
    async mergeBehaviors(req, res) {
        try {
            const employeeData = await verifyABAAuthorization(req, res);
            if (!employeeData) return;

            const { clientID: cID, targetBehaviorId, mergeBehaviorIds } = req.body;

            if (!await abaQueries.abaClientExistByID(cID, employeeData.companyID)) {
                return res.json({ statusCode: 400, behaviorMerged: false, serverMessage: 'Client does not exist' });
            }

            if (!await abaQueries.behaviorSkillExistByID(targetBehaviorId, employeeData.companyID)) {
                return res.json({ statusCode: 400, behaviorMerged: false, serverMessage: 'Client does not exist' });
            }

            const targetBehaviorData = await abaQueries.abaGetBehaviorOrSkill(targetBehaviorId, "Behavior", employeeData.companyID);

            for (const mergeBehaviorId of mergeBehaviorIds) {
                const mergeBehaviorData = await abaQueries.abaGetBehaviorOrSkill(mergeBehaviorId, "Behavior", employeeData.companyID);
                if (mergeBehaviorData.measurment !== targetBehaviorData.measurment) {
                    continue;
                }

                const dataExists = await abaQueries.abaGetBehaviorDataById(cID, mergeBehaviorId, employeeData.companyID);
                if (dataExists.length > 0 && !await abaQueries.abaMergeBehaviorDataById(cID, targetBehaviorId, mergeBehaviorId, employeeData.companyID)) {
                    throw new Error("An error occured while merging " + mergeBehaviorData.name);
                }

                if (!await abaQueries.abaDeleteBehaviorOrSkillByID(cID, mergeBehaviorId, employeeData.companyID)) {
                    throw new Error("An error occured while deleting " + mergeBehaviorData.name);
                }
            }

            return res.json({ statusCode: 200, behaviorMerged: true, serverMessage: 'All behavior data merged successfully' });
        } catch (error) {
            return res.json({ statusCode: 500, behaviorMerged: false, serverMessage: 'A server error occurred', errorMessage: error.message });
        }
    }

    /**
     * Archive a behavior
     */
    async archiveBehavior(req, res) {
        try {
            const employeeData = await verifyABAAuthorization(req, res);
            if (!employeeData) return;

            const { clientID: cID, behaviorId } = req.body;

            if (!await abaQueries.abaClientExistByID(cID, employeeData.companyID)) {
                return res.json({ statusCode: 400, behaviorMerged: false, serverMessage: 'Client does not exist' });
            }

            if (!await abaQueries.behaviorSkillExistByID(behaviorId, employeeData.companyID)) {
                return res.json({ statusCode: 400, behaviorMerged: false, serverMessage: 'Client does not exist' });
            }

            const behaviorData = await abaQueries.abaGetBehaviorOrSkill(behaviorId, "Behavior", employeeData.companyID);
            const { currentDate } = await getAuditTimestamp();
            const archiveDeletionDate = await formatDateString(await addYears(currentDate, 7));

            if (await abaQueries.abaFoundBehaviorDataById(cID, behaviorId, employeeData.companyID) &&
                !await abaQueries.abaArchiveBehaviorDataByID('Archived', cID, behaviorId, employeeData.companyID)) {
                throw new Error("An error occured while archiving " + behaviorData.name + "'s data");
            }

            if (!await abaQueries.abaArchiveBehaviorOrSkillByID(cID, behaviorId, currentDate, archiveDeletionDate, employeeData.companyID)) {
                throw new Error("An error occured while archiving " + behaviorData.name);
            }

            return res.json({ statusCode: 200, behaviorMerged: true, serverMessage: 'All behavior data archived successfully' });
        } catch (error) {
            return res.json({ statusCode: 500, serverMessage: 'A server error occurred', errorMessage: error.message });
        }
    }

    /**
     * Delete a behavior
     */
    async deleteBehavior(req, res) {
        try {
            const employeeData = await verifyABAAuthorization(req, res);
            if (!employeeData) return;

            const { clientID: cID, behaviorId } = req.body;

            let behaviorData = await abaQueries.abaGetBehaviorOrSkill(behaviorId, "Behavior", employeeData.companyID); 

            await deleteBehaviorAndDataIfPresent(abaQueries, cID, behaviorId, employeeData.companyID, behaviorData.name);
            return res.json({ statusCode: 200, behaviorAdded: true, serverMessage: 'All behavior data deleted successfully' });
        } catch (error) {
            return res.json({ statusCode: 500, serverMessage: 'A server error occurred', errorMessage: error.message });
        }
    }

    /**
     * Delete specific behavior data entry
     */
    async deleteBehaviorData(req, res) {
        try {
            const employeeData = await verifyABAAuthorization(req, res);
            if (!employeeData) return;

            const { clientID: cID, behaviorId, behaviorDataId } = req.body;

            let behaviorData = await abaQueries.abaGetBehaviorOrSkill(behaviorId, "Behavior", employeeData.companyID);

            if (await abaQueries.abaGetBehaviorDataByBehaviorId(cID, behaviorId, behaviorDataId, employeeData.companyID)) {
                if (!await abaQueries.abaDeleteBehaviorDataByBehaviorID(cID, behaviorId, behaviorDataId, employeeData.companyID)) {
                    throw new Error("An error occured while deleting " + behaviorData.name + "'s data");
                }
                return res.json({ statusCode: 200, serverMessage: 'Behavior data deleted successfully' });     
            }
            throw new Error('Unable to locate selected behavior data');
        } catch (error) {
            return res.json({ statusCode: 500, serverMessage: 'A server error occurred', errorMessage: error.message });
        }
    }

    /**
     * Activate (unarchive) a behavior
     */
    async activateBehavior(req, res) {
        try {
            const employeeData = await verifyABAAuthorization(req, res);
            if (!employeeData) return;

            const { clientID: cID, behaviorId } = req.body;

            if (!await abaQueries.abaClientExistByID(cID, employeeData.companyID)) {
                return res.json({ statusCode: 400, behaviorMerged: false, serverMessage: 'Client does not exist' });
            }

            if (!await abaQueries.behaviorSkillExistByID(behaviorId, employeeData.companyID)) {
                return res.json({ statusCode: 400, behaviorMerged: false, serverMessage: 'Client does not exist' });
            }

            const behaviorData = await abaQueries.abaGetArchivedBehaviorOrSkill(behaviorId, "Behavior", employeeData.companyID);
            const archivedBehaviorData = await abaQueries.abaGetArchivedBehaviorDataById(cID, behaviorId, employeeData.companyID);
            if (archivedBehaviorData.length > 0 &&
                !await abaQueries.abaReactivateBehaviorDataByID('Active', cID, behaviorId, employeeData.companyID)) {
                throw new Error("An error occured while reactivating " + behaviorData.name + "'s data");
            }

            if (!await abaQueries.abaReactivateBehaviorOrSkillByID(cID, behaviorId, null, null, employeeData.companyID)) {
                throw new Error("An error occured while reactivating " + behaviorData.name);
            }

            return res.json({ statusCode: 200, behaviorMerged: true, serverMessage: 'The behavior data reactivated successfully' });
        } catch (error) {
            return res.json({ statusCode: 500, serverMessage: 'A server error occurred', errorMessage: error.message });
        }
    }

    /**
     * Delete an archived behavior
     */
    async deleteArchivedBehavior(req, res) {
        try {
            const employeeData = await verifyABAAuthorization(req, res);
            if (!employeeData) return;

            const { clientID: cID, behaviorId } = req.body;

            let behaviorData = await abaQueries.abaGetBehaviorOrSkill(behaviorId, "Behavior", employeeData.companyID);

            await deleteBehaviorAndDataIfPresent(abaQueries, cID, behaviorId, employeeData.companyID, behaviorData.name);
            return res.json({ statusCode: 200, behaviorAdded: true, serverMessage: 'All behavior data merged successfully' });
        } catch (error) {
            return res.json({ statusCode: 500, serverMessage: 'A server error occurred', errorMessage: error.message });
        }
    }

    /**
     * Delete archived behavior data entry
     */
    async deleteArchivedBehaviorData(req, res) {
        try {
            const employeeData = await verifyABAAuthorization(req, res);
            if (!employeeData) return;

            const { clientID: cID, behaviorId, behaviorDataId } = req.body;

            let behaviorData = await abaQueries.abaGetBehaviorOrSkill(behaviorId, "Behavior", employeeData.companyID);

            if (await abaQueries.abaGetArchivedBehaviorDataByBehaviorId(cID, behaviorId, behaviorDataId, employeeData.companyID)) {
                if (!await abaQueries.abaDeleteArchivedBehaviorDataByBehaviorID(cID, behaviorId, behaviorDataId, employeeData.companyID)) {
                    throw new Error("An error occured while deleting " + behaviorData.name + "'s data");
                }
                return res.json({ statusCode: 200, serverMessage: 'Behavior data deleted successfully' });     
            }
            throw new Error('Unable to locate selected behavior data');
        } catch (error) {
            return res.json({ statusCode: 500, serverMessage: 'A server error occurred', errorMessage: error.message });
        }
    }

    // ============================================
    // SESSION NOTES
    // ============================================

    /**
     * Submit session notes
     */
    async submitSessionNotes(req, res) {
        try {
            const employeeData = await verifyABAAuthorization(req, res);
            if (!employeeData) return;

            const { clientID: cID, sessionDate, sessionTime, sessionNotes } = req.body;

            if (await abaQueries.abaClientExistByID(cID, employeeData.companyID)) {
                const clientData = await abaQueries.abaGetClientDataByID(cID, employeeData.companyID);

                if (await abaQueries.abaAddSessionNoteData({
                    cID,
                    cName: `${clientData.fName} ${clientData.lName}`,
                    sDate: await formatDateString(sessionDate),
                    sTime: await formatTimeString(sessionTime),
                    sNotes: sessionNotes,
                    enteredBy: `${employeeData.fName} ${employeeData.lName}`,
                    compID: employeeData.companyID,
                    compName: employeeData.companyName,
                    dateEntered: await formatDateString(await currentDateTime.getCurrentDate()),
                    timeEntered: await currentDateTime.getCurrentTime()
                })) {
                    return res.json({ statusCode: 201, behaviorAdded: true, serverMessage: 'All submission notes stored' });
                }
                return res.json({ statusCode: 400, behaviorAdded: false, serverMessage: 'Unable to store notes' });
            }
            return res.json({ statusCode: 400, behaviorAdded: false, serverMessage: 'Client does not exist' });
        } catch (error) {
            return res.json({ statusCode: 500, serverMessage: 'A server error occurred', errorMessage: error.message });
        }
    }

    /**
     * Get session notes for a client
     */
    async getSessionNotes(req, res) {
        try {
            const employeeData = await verifyBasicAuthentication(req, res);
            if (!employeeData) return;

            const { clientID: cID } = req.body;

            if (await abaQueries.abaClientExistByID(cID, employeeData.companyID)) {
                const locatedSessionNotesData = await abaQueries.abaSessionNoteDataByClientIDExists(cID, employeeData.companyID);

                if (locatedSessionNotesData) {
                    const sessionNotesData = await abaQueries.abaSessionNoteDataByClientID(cID, employeeData.companyID);
                    return res.json({ statusCode: 200, sessionNotesData });
                }
                return res.json({ statusCode: 400, serverMessage: 'Unable to locate client data' });
            }
            return res.json({ statusCode: 400, serverMessage: 'Client does not exist' });
        } catch (error) {
            return res.json({ statusCode: 500, serverMessage: 'A server error occurred', errorMessage: error.message });
        }
    }

    /**
     * Get a specific session note
     */
    async getASessionNote(req, res) {
        try {
            const employeeData = await verifyBasicAuthentication(req, res);
            if (!employeeData) return;

            const { clientID: cID, sessionNoteId } = req.body;

            if (await abaQueries.abaClientExistByID(cID, employeeData.companyID)) {
                const sessionNoteData = await abaQueries.abaGetSessionNoteByID(cID, sessionNoteId, employeeData.companyID);
                
                if (sessionNoteData.length > 0) {
                    return res.json({ statusCode: 200, sessionNotesData: sessionNoteData });
                }
                return res.json({ statusCode: 400, serverMessage: 'Unable to locate client data' });
            }
            return res.json({ statusCode: 400, serverMessage: 'Client does not exist' });
        } catch (error) {
            return res.json({ statusCode: 500, serverMessage: 'A server error occurred', errorMessage: error.message });
        }
    }

    /**
     * Delete a session note
     */
    async deleteSessionNote(req, res) {
        try {
            const employeeData = await verifyABAAuthorization(req, res);
            if (!employeeData) return;

            const { clientID: cID, sessionNoteId } = req.body;

            if (await abaQueries.abaClientExistByID(cID, employeeData.companyID)) {
                if (!await abaQueries.abaDeleteSessionNoteDataByID(cID, sessionNoteId, employeeData.companyID)) {
                    throw new Error("An error occured while deleting the session note");
                }
                return res.json({ statusCode: 200, serverMessage: 'Session note deleted successfully' });     
            }
            return res.json({ statusCode: 400, serverMessage: 'Client does not exist' });
        } catch (error) {
            return res.json({ statusCode: 500, serverMessage: 'A server error occurred', errorMessage: error.message });
        }
    }

    /**
     * Get archived session notes for a client
     */
    async getArchivedSessionNotes(req, res) {
        try {
            const employeeData = await verifyBasicAuthentication(req, res);
            if (!employeeData) return;

            const { clientID: cID } = req.body;

            if (await abaQueries.abaClientExistByID(cID, employeeData.companyID)) {
                const archivedSessionNotes = await abaQueries.abaGetArchivedSessionNoteDataByClientID(cID, employeeData.companyID);
                
                if (archivedSessionNotes.length > 0) {
                    return res.json({ statusCode: 200, sessionNotesData: archivedSessionNotes });
                }
                return res.json({ statusCode: 200, sessionNotesData: [] });
            }
            return res.json({ statusCode: 400, serverMessage: 'Client does not exist' });
        } catch (error) {
            return res.json({ statusCode: 500, serverMessage: 'A server error occurred', errorMessage: error.message });
        }
    }

    /**
     * Get a specific archived session note
     */
    async getAArchivedSessionNote(req, res) {
        try {
            const employeeData = await verifyBasicAuthentication(req, res);
            if (!employeeData) return;

            const { clientID: cID, sessionNoteId } = req.body;

            if (await abaQueries.abaClientExistByID(cID, employeeData.companyID)) {
                const archivedSessionNote = await abaQueries.abaGetArchivedSessionNoteByID(cID, sessionNoteId, employeeData.companyID);
                
                if (archivedSessionNote.length > 0) {
                    return res.json({ statusCode: 200, sessionNotesData: archivedSessionNote });
                }
                return res.json({ statusCode: 400, serverMessage: 'Unable to locate archived session note' });
            }
            return res.json({ statusCode: 400, serverMessage: 'Client does not exist' });
        } catch (error) {
            return res.json({ statusCode: 500, serverMessage: 'A server error occurred', errorMessage: error.message });
        }
    }

    /**
     * Reactivate an archived session note
     */
    async activateSessionNote(req, res) {
        try {
            const employeeData = await verifyABAAuthorization(req, res);
            if (!employeeData) return;

            const { clientID: cID, sessionNoteId } = req.body;

            if (await abaQueries.abaClientExistByID(cID, employeeData.companyID)) {
                if (!await abaQueries.abaReactivateSessionNoteByID(cID, sessionNoteId, employeeData.companyID)) {
                    throw new Error("An error occurred while reactivating the session note");
                }
                return res.json({ statusCode: 200, serverMessage: 'Session note reactivated successfully' });
            }
            return res.json({ statusCode: 400, serverMessage: 'Client does not exist' });
        } catch (error) {
            return res.json({ statusCode: 500, serverMessage: 'A server error occurred', errorMessage: error.message });
        }
    }

    /**
     * Archive a session note
     */
    async archiveSessionNote(req, res) {
        try {
            const employeeData = await verifyABAAuthorization(req, res);
            if (!employeeData) return;

            const { clientID: cID, sessionNoteId } = req.body;

            if (await abaQueries.abaClientExistByID(cID, employeeData.companyID)) {
                if (!await abaQueries.abaArchiveSessionNoteByID(cID, sessionNoteId, employeeData.companyID)) {
                    throw new Error("An error occurred while archiving the session note");
                }
                return res.json({ statusCode: 200, serverMessage: 'Session note archived successfully' });
            }
            return res.json({ statusCode: 400, serverMessage: 'Client does not exist' });
        } catch (error) {
            return res.json({ statusCode: 500, serverMessage: 'A server error occurred', errorMessage: error.message });
        }
    }

    /**
     * Delete an archived session note
     */
    async deleteArchivedSessionNote(req, res) {
        try {
            const employeeData = await verifyABAAuthorization(req, res);
            if (!employeeData) return;

            const { clientID: cID, sessionNoteId } = req.body;

            if (await abaQueries.abaClientExistByID(cID, employeeData.companyID)) {
                if (!await abaQueries.abaDeleteArchivedSessionNoteByID(cID, sessionNoteId, employeeData.companyID)) {
                    throw new Error("An error occurred while deleting the archived session note");
                }
                return res.json({ statusCode: 200, serverMessage: 'Archived session note deleted successfully' });
            }
            return res.json({ statusCode: 400, serverMessage: 'Client does not exist' });
        } catch (error) {
            return res.json({ statusCode: 500, serverMessage: 'A server error occurred', errorMessage: error.message });
        }
    }

    // ============================================
    // SKILL ACQUISITION
    // ============================================

    /**
     * Get client skill acquisition data
     */
    async getClientSkillAquisition(req, res) {
        try {
            const employeeData = await verifyBasicAuthentication(req, res);
            if (!employeeData) return;

            const { clientID: cID } = req.body;

            if (await abaQueries.abaClientExistByID(cID, employeeData.companyID, employeeData.companyName)) {
                const behaviorSkillData = await abaQueries.abaGetBehaviorOrSkill(cID, 'Skill', employeeData.companyID);

                if (behaviorSkillData.length > 0) {
                    return res.json({ statusCode: 200, behaviorSkillData });
                }
                return res.json({ statusCode: 500, serverMessage: 'Unable to locate client data' });
            }
            return res.json({ statusCode: 400, serverMessage: 'Client does not exist' });
        } catch (error) {
            return res.json({ statusCode: 500, serverMessage: 'A server error occurred', errorMessage: error.message });
        }
    }

    /**
     * Submit skill acquisition data
     */
    async submitSkillAquisition(req, res) {
        return sendNotImplemented(res, 'Skill acquisition submission is not implemented yet');
    }
}

module.exports = new ABAController();
