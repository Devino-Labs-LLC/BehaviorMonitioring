jest.mock('../../../middleware/helpers/authorizationHelper', () => ({
  verifyABAAuthorization: jest.fn(),
  verifyBasicAuthentication: jest.fn(),
}));

jest.mock('../../../middleware/helpers/ABAQueries', () => ({
  abaClientExistByID: jest.fn(),
  abaGetClientDataByID: jest.fn(),
  abaGetAllClientData: jest.fn(),
  abaAddClientData: jest.fn(),
  abaUpdateClientData: jest.fn(),
  abaAddBehaviorOrSkill: jest.fn(),
  behaviorSkillExistByID: jest.fn(),
  abaGetBehaviorDataById: jest.fn(),
  abaGetBehaviorOrSkill: jest.fn(),
  abaGetABehaviorOrSkill: jest.fn(),
  abaGetBehaviorDataByBehaviorId: jest.fn(),
  abaDeleteBehaviorDataByID: jest.fn(),
  abaDeleteBehaviorDataByBehaviorID: jest.fn(),
  abaDeleteBehaviorOrSkillByID: jest.fn(),
  abaMergeBehaviorDataById: jest.fn(),
  abaGetArchivedBehaviorOrSkill: jest.fn(),
  abaGetArchivedBehaviorDataById: jest.fn(),
  abaGetArchivedBehaviorDataByBehaviorId: jest.fn(),
  abaGetAArchivedBehaviorOrSkill: jest.fn(),
  abaDeleteArchivedBehaviorDataByBehaviorID: jest.fn(),
  abaFoundBehaviorDataById: jest.fn(),
  abaArchiveBehaviorDataByID: jest.fn(),
  abaArchiveBehaviorOrSkillByID: jest.fn(),
  abaReactivateBehaviorDataByID: jest.fn(),
  abaReactivateBehaviorOrSkillByID: jest.fn(),
  abaAddFrequencyBehaviorData: jest.fn(),
  abaAddDurationBehaviorData: jest.fn(),
  abaAddRateBehaviorData: jest.fn(),
  abaAddSessionNoteData: jest.fn(),
  abaSessionNoteDataByClientIDExists: jest.fn(),
  abaSessionNoteDataByClientID: jest.fn(),
  abaGetSessionNoteByID: jest.fn(),
  abaGetArchivedSessionNoteDataByClientID: jest.fn(),
  abaGetArchivedSessionNoteByID: jest.fn(),
  abaDeleteSessionNoteDataByID: jest.fn(),
  abaArchiveSessionNoteByID: jest.fn(),
  abaReactivateSessionNoteByID: jest.fn(),
  abaDeleteArchivedSessionNoteByID: jest.fn(),
}));

jest.mock('../../../functions/base/currentDateTime', () => ({
  getCurrentDate: jest.fn(),
  getCurrentTime: jest.fn(),
}));

jest.mock('../../../functions/base/addDayYear', () => ({
  addDays: jest.fn(),
  addYears: jest.fn(),
}));

jest.mock('../../../functions/base/dateTimeFormat', () => ({
  formatDateString: jest.fn(),
  formatTimeString: jest.fn(),
}));

const controller = require('../../../controllers/ABAController');
const abaQueries = require('../../../middleware/helpers/ABAQueries');
const { verifyABAAuthorization, verifyBasicAuthentication } = require('../../../middleware/helpers/authorizationHelper');
const currentDateTime = require('../../../functions/base/currentDateTime');
const { addYears } = require('../../../functions/base/addDayYear');
const { formatDateString, formatTimeString } = require('../../../functions/base/dateTimeFormat');

describe('ABAController behavior lifecycle', () => {
  let req;
  let res;
  let employeeData;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { body: {} };
    res = { json: jest.fn() };
    employeeData = {
      fName: 'Staff',
      lName: 'Member',
      companyID: 9,
      companyName: 'Test Company',
    };

    verifyABAAuthorization.mockResolvedValue(employeeData);
    verifyBasicAuthentication.mockResolvedValue(employeeData);
    currentDateTime.getCurrentDate.mockResolvedValue('2026-04-01');
    currentDateTime.getCurrentTime.mockResolvedValue('10:00');
    formatDateString.mockImplementation(async (value) => `fmt-${value}`);
    formatTimeString.mockImplementation(async (value) => `time-${value}`);
    addYears.mockResolvedValue('2033-04-01');
  });

  it('adds new target behaviors successfully', async () => {
    req.body.behaviors = [
      {
        behaviorName: 'Aggression',
        behaviorDefinition: 'Hits',
        behaviorMeasurement: 'Frequency',
        behaviorCategory: 'Aggression',
        type: 'Behavior',
        clientID: 2,
        clientName: 'John Doe',
      },
    ];

    abaQueries.abaClientExistByID.mockResolvedValue(true);
    abaQueries.abaGetClientDataByID.mockResolvedValue({ fName: 'John', lName: 'Doe' });
    abaQueries.abaAddBehaviorOrSkill.mockResolvedValue(true);

    await controller.addNewTargetBehavior(req, res);

    expect(res.json).toHaveBeenCalledWith({
      statusCode: 204,
      behaviorsAdded: true,
      serverMessage: 'All behaviors added successfully',
    });
  });

  it('returns a client error when adding a target behavior for a missing client', async () => {
    req.body.behaviors = [
      {
        behaviorName: 'Aggression',
        behaviorDefinition: 'Hits',
        behaviorMeasurement: 'Frequency',
        behaviorCategory: 'Aggression',
        type: 'Behavior',
        clientID: 2,
        clientName: 'John Doe',
      },
    ];
    abaQueries.abaClientExistByID.mockResolvedValue(false);

    await controller.addNewTargetBehavior(req, res);

    expect(res.json).toHaveBeenCalledWith({
      statusCode: 400,
      behaviorsAdded: false,
      serverMessage: 'Client does not exist',
    });
  });

  it('adds a new client and lists all clients', async () => {
    req.body = {
      clientFName: 'Jane',
      clientLName: 'Doe',
      dateOfBirth: '2000-01-01',
      intakeDate: '2026-04-01',
      ghName: 'Home A',
      medicadeNum: '1234',
      behaviorProvided: false,
    };
    abaQueries.abaAddClientData.mockResolvedValue(true);
    abaQueries.abaGetAllClientData.mockResolvedValue([{ clientID: 1 }]);

    await controller.addNewClient(req, res);
    expect(res.json).toHaveBeenCalledWith({ statusCode: 200, clientAdded: true });

    res.json.mockClear();
    await controller.getAllClientInfo({ body: {}, headers: {} }, res);
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 200,
      clientData: [{ clientID: 1 }],
    });
  });

  it('reads and updates a single client record', async () => {
    req.body = {
      clientID: 2,
      clientFName: 'Jane',
      clientLName: 'Doe',
      dateOfBirth: '2000-01-01',
      intakeDate: '2026-04-01',
      ghName: 'Home A',
      medicadeNum: '1234',
      behaviorPlanDueDate: '2026-07-01',
    };
    abaQueries.abaClientExistByID.mockResolvedValue(true);
    abaQueries.abaGetClientDataByID.mockResolvedValue({ clientID: 2, fName: 'Jane' });
    abaQueries.abaUpdateClientData.mockResolvedValue(true);

    await controller.getClientInfo(req, res);
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 200,
      clientData: { clientID: 2, fName: 'Jane' },
    });

    res.json.mockClear();
    await controller.updateClientInfo(req, res);
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 200,
      clientAdded: true,
    });
  });

  it('returns not-implemented responses for stubbed flows', async () => {
    await controller.deleteClientInfo(req, res);
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 501,
      serverMessage: 'Client deletion flow is not implemented yet',
    });

    res.json.mockClear();
    await controller.updateTargetBehavior(req, res);
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 501,
      serverMessage: 'Target behavior update is not implemented yet',
    });

    res.json.mockClear();
    await controller.deleteTargetBehavior(req, res);
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 501,
      serverMessage: 'Target behavior deletion flow is not implemented yet',
    });

    res.json.mockClear();
    await controller.submitSkillAquisition(req, res);
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 501,
      serverMessage: 'Skill acquisition submission is not implemented yet',
    });
  });

  it('returns active and archived behavior reads across the lookup endpoints', async () => {
    req.body = { clientID: 2, behaviorID: 55 };
    abaQueries.abaClientExistByID.mockResolvedValue(true);
    abaQueries.behaviorSkillExistByID.mockResolvedValue(true);
    abaQueries.abaGetBehaviorDataById.mockResolvedValue([{ behaviorDataID: 1 }]);
    abaQueries.abaGetBehaviorOrSkill.mockResolvedValue([{ bsID: 55, name: 'Aggression' }]);
    abaQueries.abaGetABehaviorOrSkill.mockResolvedValue([{ bsID: 55, name: 'Aggression' }]);
    abaQueries.abaGetArchivedBehaviorOrSkill.mockResolvedValue([{ bsID: 55, status: 'Archived' }]);
    abaQueries.abaGetArchivedBehaviorDataById.mockResolvedValue([{ behaviorDataID: 2, status: 'Archived' }]);
    abaQueries.abaGetAArchivedBehaviorOrSkill.mockResolvedValue([{ bsID: 55, status: 'Archived' }]);

    await controller.getTargetBehavior(req, res);
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 200,
      behaviorSkillData: [{ behaviorDataID: 1 }],
    });

    res.json.mockClear();
    await controller.getClientTargetBehavior({ body: { clientID: 2 } }, res);
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 200,
      behaviorSkillData: [{ bsID: 55, name: 'Aggression' }],
    });

    res.json.mockClear();
    await controller.getAClientTargetBehavior(req, res);
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 200,
      behaviorSkillData: [{ bsID: 55, name: 'Aggression' }],
    });

    res.json.mockClear();
    await controller.getArchivedBehavior(req, res);
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 200,
      behaviorSkillData: [{ behaviorDataID: 2, status: 'Archived' }],
    });

    res.json.mockClear();
    await controller.getClientArchivedBehavior({ body: { clientID: 2 } }, res);
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 200,
      behaviorSkillData: [{ bsID: 55, status: 'Archived' }],
    });

    res.json.mockClear();
    await controller.getAClientArchivedBehavior(req, res);
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 200,
      behaviorSkillData: [{ bsID: 55, status: 'Archived' }],
    });

    res.json.mockClear();
    await controller.getAArchivedBehaviorData(req, res);
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 200,
      behaviorSkillData: [{ behaviorDataID: 2, status: 'Archived' }],
    });
  });

  it('submits target behavior measurements and rejects unsupported measurement types', async () => {
    req.body = {
      clientID: 2,
      targetAmt: 2,
      selectedTargets: [101, 202],
      selectedMeasurementTypes: ['Frequency', 'Unknown'],
      dates: ['2026-04-01', '2026-04-02'],
      times: ['09:00', '10:00'],
      count: [1, 2],
      duration: [10, 20],
    };

    abaQueries.abaClientExistByID.mockResolvedValue(true);
    abaQueries.abaGetClientDataByID.mockResolvedValue({ fName: 'John', lName: 'Doe' });
    abaQueries.behaviorSkillExistByID.mockResolvedValue(true);
    abaQueries.abaAddFrequencyBehaviorData.mockResolvedValue(true);

    await controller.submitTargetBehavior(req, res);

    expect(abaQueries.abaAddFrequencyBehaviorData).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 400,
      behaviorAdded: false,
      serverMessage: 'Target behavior id, 202, does not exist',
      Data: {
        index: 1,
        Date: '2026-04-02',
        time: '10:00',
        count: 2,
        duration: 20,
      },
    });
  });

  it('deletes active and archived behavior data entries when they exist', async () => {
    req.body = { clientID: 2, behaviorId: 55, behaviorDataId: 9 };
    abaQueries.abaGetBehaviorOrSkill.mockResolvedValue({ name: 'Aggression' });
    abaQueries.abaGetBehaviorDataByBehaviorId.mockResolvedValue(true);
    abaQueries.abaDeleteBehaviorDataByBehaviorID.mockResolvedValue(true);
    abaQueries.abaGetArchivedBehaviorDataByBehaviorId.mockResolvedValue(true);
    abaQueries.abaDeleteArchivedBehaviorDataByBehaviorID.mockResolvedValue(true);

    await controller.deleteBehaviorData(req, res);
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 200,
      serverMessage: 'Behavior data deleted successfully',
    });

    res.json.mockClear();
    await controller.deleteArchivedBehaviorData(req, res);
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 200,
      serverMessage: 'Behavior data deleted successfully',
    });
  });

  it('merges behaviors and deletes source behaviors when measurements match', async () => {
    req.body = {
      clientID: 2,
      targetBehaviorId: 55,
      mergeBehaviorIds: [77],
    };
    abaQueries.abaClientExistByID.mockResolvedValue(true);
    abaQueries.behaviorSkillExistByID.mockResolvedValue(true);
    abaQueries.abaGetBehaviorOrSkill
      .mockResolvedValueOnce({ measurment: 'Frequency', name: 'Target' })
      .mockResolvedValueOnce({ measurment: 'Frequency', name: 'Source' });
    abaQueries.abaGetBehaviorDataById.mockResolvedValue([{ behaviorDataID: 1 }]);
    abaQueries.abaMergeBehaviorDataById.mockResolvedValue(true);
    abaQueries.abaDeleteBehaviorOrSkillByID.mockResolvedValue(true);

    await controller.mergeBehaviors(req, res);

    expect(res.json).toHaveBeenCalledWith({
      statusCode: 200,
      behaviorMerged: true,
      serverMessage: 'All behavior data merged successfully',
    });
  });

  it('deletes full behavior records and archived behavior records', async () => {
    req.body = { clientID: 2, behaviorId: 55 };
    abaQueries.abaGetBehaviorOrSkill.mockResolvedValue({ name: 'Aggression' });
    abaQueries.abaFoundBehaviorDataById.mockResolvedValue(true);
    abaQueries.abaDeleteBehaviorDataByID.mockResolvedValue(true);
    abaQueries.abaDeleteBehaviorOrSkillByID.mockResolvedValue(true);

    await controller.deleteBehavior(req, res);
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 200,
      behaviorAdded: true,
      serverMessage: 'All behavior data deleted successfully',
    });

    res.json.mockClear();
    await controller.deleteArchivedBehavior(req, res);
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 200,
      behaviorAdded: true,
      serverMessage: 'All behavior data merged successfully',
    });
  });

  it('archives and reactivates behavior data', async () => {
    req.body = { clientID: 2, behaviorId: 55 };

    abaQueries.abaClientExistByID.mockResolvedValue(true);
    abaQueries.behaviorSkillExistByID.mockResolvedValue(true);
    abaQueries.abaGetBehaviorOrSkill.mockResolvedValue({ name: 'Aggression' });
    abaQueries.abaGetArchivedBehaviorOrSkill.mockResolvedValue({ name: 'Aggression' });
    abaQueries.abaFoundBehaviorDataById.mockResolvedValue(true);
    abaQueries.abaArchiveBehaviorDataByID.mockResolvedValue(true);
    abaQueries.abaArchiveBehaviorOrSkillByID.mockResolvedValue(true);
    abaQueries.abaGetArchivedBehaviorDataById.mockResolvedValue([{ behaviorDataID: 1 }]);
    abaQueries.abaReactivateBehaviorDataByID.mockResolvedValue(true);
    abaQueries.abaReactivateBehaviorOrSkillByID.mockResolvedValue(true);

    await controller.archiveBehavior(req, res);
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 200,
      behaviorMerged: true,
      serverMessage: 'All behavior data archived successfully',
    });

    res.json.mockClear();
    await controller.activateBehavior(req, res);
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 200,
      behaviorMerged: true,
      serverMessage: 'The behavior data reactivated successfully',
    });
  });

  it('returns session note reads and deletes active session notes', async () => {
    req.body = { clientID: 2, sessionNoteId: 15 };
    abaQueries.abaClientExistByID.mockResolvedValue(true);
    abaQueries.abaSessionNoteDataByClientIDExists.mockResolvedValue(true);
    abaQueries.abaSessionNoteDataByClientID.mockResolvedValue([{ sessionNoteDataID: 15 }]);
    abaQueries.abaGetSessionNoteByID.mockResolvedValue([{ sessionNoteDataID: 15 }]);
    abaQueries.abaDeleteSessionNoteDataByID.mockResolvedValue(true);

    await controller.getSessionNotes({ body: { clientID: 2 } }, res);
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 200,
      sessionNotesData: [{ sessionNoteDataID: 15 }],
    });

    res.json.mockClear();
    await controller.getASessionNote(req, res);
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 200,
      sessionNotesData: [{ sessionNoteDataID: 15 }],
    });

    res.json.mockClear();
    await controller.deleteSessionNote(req, res);
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 200,
      serverMessage: 'Session note deleted successfully',
    });
  });

  it('stores session notes and exposes archived session note paths', async () => {
    req.body = {
      clientID: 2,
      sessionDate: '2026-04-01',
      sessionTime: '10:30',
      sessionNotes: 'Worked on replacement behavior',
      sessionNoteId: 15,
    };

    abaQueries.abaClientExistByID.mockResolvedValue(true);
    abaQueries.abaGetClientDataByID.mockResolvedValue({ fName: 'John', lName: 'Doe' });
    abaQueries.abaAddSessionNoteData.mockResolvedValue(true);
    abaQueries.abaGetArchivedSessionNoteDataByClientID.mockResolvedValue([{ sessionNoteDataID: 15 }]);
    abaQueries.abaGetArchivedSessionNoteByID.mockResolvedValue([{ sessionNoteDataID: 15 }]);
    abaQueries.abaArchiveSessionNoteByID.mockResolvedValue(true);
    abaQueries.abaReactivateSessionNoteByID.mockResolvedValue(true);
    abaQueries.abaDeleteArchivedSessionNoteByID.mockResolvedValue(true);

    await controller.submitSessionNotes(req, res);
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 201,
      behaviorAdded: true,
      serverMessage: 'All submission notes stored',
    });

    res.json.mockClear();
    await controller.getArchivedSessionNotes(req, res);
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 200,
      sessionNotesData: [{ sessionNoteDataID: 15 }],
    });

    res.json.mockClear();
    await controller.getAArchivedSessionNote(req, res);
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 200,
      sessionNotesData: [{ sessionNoteDataID: 15 }],
    });

    res.json.mockClear();
    await controller.archiveSessionNote(req, res);
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 200,
      serverMessage: 'Session note archived successfully',
    });

    res.json.mockClear();
    await controller.activateSessionNote(req, res);
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 200,
      serverMessage: 'Session note reactivated successfully',
    });

    res.json.mockClear();
    await controller.deleteArchivedSessionNote(req, res);
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 200,
      serverMessage: 'Archived session note deleted successfully',
    });
  });

  it('returns client skill acquisition data', async () => {
    abaQueries.abaClientExistByID.mockResolvedValue(true);
    abaQueries.abaGetBehaviorOrSkill.mockResolvedValue([{ bsID: 70, type: 'Skill' }]);

    await controller.getClientSkillAquisition({ body: { clientID: 2 } }, res);

    expect(res.json).toHaveBeenCalledWith({
      statusCode: 200,
      behaviorSkillData: [{ bsID: 70, type: 'Skill' }],
    });
  });

  it('falls back correctly when archived behavior detail must use active data', async () => {
    req.body = { clientID: 2, behaviorID: 55 };
    abaQueries.abaClientExistByID.mockResolvedValue(true);
    abaQueries.behaviorSkillExistByID.mockResolvedValue(true);
    abaQueries.abaGetBehaviorDataById.mockResolvedValue([{ behaviorDataID: 1, status: 'Active' }]);
    abaQueries.abaGetArchivedBehaviorDataById.mockResolvedValue([]);

    await controller.getAArchivedBehaviorData(req, res);

    expect(res.json).toHaveBeenCalledWith({
      statusCode: 200,
      behaviorSkillData: [{ behaviorDataID: 1, status: 'Active' }],
    });
  });
});
