const {
  Client,
  BehaviorAndSkill,
  BehaviorData,
  SessionNoteData,
} = require('../../../models');
const abaQueries = require('../../../middleware/helpers/ABAQueries');

jest.mock('../../../models', () => ({
  Client: {
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  BehaviorAndSkill: {
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
  },
  BehaviorData: {
    findAll: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
  },
  SessionNoteData: {
    findAll: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
  },
}));

describe('ABAQueries behavior lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('client helpers', () => {
    it('looks up client existence and plain client data', async () => {
      Client.findOne
        .mockResolvedValueOnce({ clientID: 3 })
        .mockResolvedValueOnce({
          get: jest.fn(() => ({ clientID: 3, fName: 'John', lName: 'Doe' })),
        });

      await expect(abaQueries.abaClientExistByID(3, 9)).resolves.toBe(true);
      await expect(abaQueries.abaGetClientDataByID(3, 9)).resolves.toEqual(
        expect.objectContaining({ clientID: 3, fName: 'John' }),
      );
    });

    it('creates, lists, and updates client data', async () => {
      Client.create.mockResolvedValue({});
      Client.findAll.mockResolvedValue([
        { get: jest.fn(() => ({ clientID: 1, companyID: 5 })) },
        { get: jest.fn(() => ({ clientID: 2, companyID: 5 })) },
      ]);
      Client.update.mockResolvedValue([1]);

      await expect(
        abaQueries.abaAddClientData({
          fName: 'Jane',
          lName: 'Smith',
          DOB: '2000-01-01',
          intakeDate: '2026-01-01',
          groupHomeName: 'Home A',
          medicadeNum: '123',
          behaviorPlanDueDate: '2026-04-01',
          enteredBy: 'Staff Member',
          compID: 5,
          compName: 'Test Co',
          dateEntered: '2026-04-01',
          timeEntered: '10:00',
        }),
      ).resolves.toBe(true);

      await expect(abaQueries.abaGetAllClientData(5)).resolves.toHaveLength(2);
      expect(Client.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: { companyID: 5 } }),
      );

      await expect(
        abaQueries.abaUpdateClientData({
          fName: 'Jane',
          lName: 'Doe',
          DOB: '2000-01-01',
          intakeDate: '2026-01-01',
          groupHomeName: 'Home B',
          medicadeNum: '321',
          behaviorPlanDueDate: '2027-01-01',
          cID: 1,
        }),
      ).resolves.toBe(true);
    });
  });

  describe('active behavior helpers', () => {
    it('creates and fetches active behavior records as plain data', async () => {
      BehaviorAndSkill.findOne.mockResolvedValue({ bsID: 77 });
      BehaviorAndSkill.create.mockResolvedValue({});
      BehaviorAndSkill.findAll.mockResolvedValue([
        {
          get: jest.fn(() => ({
            bsID: 77,
            name: 'Aggression',
            measurement: 'Frequency',
            status: 'Active',
          })),
        },
      ]);

      await expect(abaQueries.behaviorSkillExistByID(77, 4)).resolves.toBe(true);
      await expect(
        abaQueries.abaAddBehaviorOrSkill({
          name: 'Aggression',
          def: 'Hits others',
          meas: 'Frequency',
          cat: 'Aggression',
          type: 'Behavior',
          cID: 2,
          cName: 'Client Name',
          enteredBy: 'Staff Member',
          compID: 4,
          compName: 'Test Co',
          dateEntered: '2026-04-01',
          timeEntered: '09:00',
        }),
      ).resolves.toBe(true);
      await expect(abaQueries.abaGetBehaviorOrSkill(2, 'Behavior', 4)).resolves.toEqual([
        expect.objectContaining({ bsID: 77, status: 'Active' }),
      ]);
      await expect(abaQueries.abaGetABehaviorOrSkill(2, 77, 'Behavior', 4)).resolves.toEqual([
        expect.objectContaining({ bsID: 77 }),
      ]);
    });

    it('stores and fetches frequency, rate, and duration behavior data', async () => {
      BehaviorData.create.mockResolvedValue({});
      BehaviorData.findAll.mockResolvedValue([
        {
          get: jest.fn(() => ({
            behaviorDataID: 9,
            bsID: 77,
            clientID: 2,
            status: 'Active',
          })),
        },
      ]);

      await expect(
        abaQueries.abaAddFrequencyBehaviorData({
          bsID: 77,
          cID: 2,
          cName: 'Client',
          sDate: '2026-04-01',
          sTime: '09:00',
          count: 3,
          enteredBy: 'Staff Member',
          compID: 4,
          compName: 'Test Co',
          dateEntered: '2026-04-01',
          timeEntered: '09:00',
        }),
      ).resolves.toBe(true);

      await expect(
        abaQueries.abaAddRateBehaviorData({
          bsID: 77,
          cID: 2,
          cName: 'Client',
          sDate: '2026-04-01',
          sTime: '09:00',
          count: 4,
          duration: 20,
          enteredBy: 'Staff Member',
          compID: 4,
          compName: 'Test Co',
          dateEntered: '2026-04-01',
          timeEntered: '09:00',
        }),
      ).resolves.toBe(true);

      await expect(
        abaQueries.abaAddDurationBehaviorData({
          bsID: 77,
          cID: 2,
          cName: 'Client',
          sDate: '2026-04-01',
          sTime: '09:00',
          trial: 30,
          enteredBy: 'Staff Member',
          compID: 4,
          compName: 'Test Co',
          dateEntered: '2026-04-01',
          timeEntered: '09:00',
        }),
      ).resolves.toBe(true);

      await expect(abaQueries.abaGetBehaviorDataById(2, 77, 4)).resolves.toEqual([
        expect.objectContaining({ behaviorDataID: 9 }),
      ]);
    });

    it('handles behavior data existence, merge, delete, and archive operations', async () => {
      BehaviorData.count
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(1);
      BehaviorData.update.mockResolvedValue([2]);
      BehaviorData.destroy.mockResolvedValue(1);
      BehaviorAndSkill.update.mockResolvedValue([1]);
      BehaviorAndSkill.destroy.mockResolvedValue(1);

      await expect(abaQueries.abaFoundBehaviorDataById(2, 77, 4)).resolves.toBe(true);
      await expect(abaQueries.abaGetBehaviorDataByBehaviorId(2, 77, 5, 4)).resolves.toBe(true);
      await expect(abaQueries.abaMergeBehaviorDataById(2, 99, 77, 4)).resolves.toBe(true);
      await expect(abaQueries.abaDeleteBehaviorDataByID(2, 77, 4)).resolves.toBe(true);
      await expect(abaQueries.abaDeleteBehaviorDataByBehaviorID(2, 77, 5, 4)).resolves.toBe(true);
      await expect(abaQueries.abaArchiveBehaviorDataByID('Archived', 2, 77, 4)).resolves.toBe(true);
      await expect(
        abaQueries.abaArchiveBehaviorOrSkillByID(2, 77, '2026-04-01', '2033-04-01', 4),
      ).resolves.toBe(true);
      await expect(abaQueries.abaDeleteBehaviorOrSkillByID(2, 77, 4)).resolves.toBe(true);
    });
  });

  describe('archived behavior helpers', () => {
    it('handles archived behavior queries, reactivation, and deletion', async () => {
      BehaviorAndSkill.findOne.mockResolvedValue({ bsID: 44, status: 'Archived' });
      BehaviorAndSkill.findAll.mockResolvedValue([
        {
          get: jest.fn(() => ({
            bsID: 44,
            name: 'Archived Behavior',
            status: 'Archived',
          })),
        },
      ]);
      BehaviorData.findAll.mockResolvedValue([
        {
          get: jest.fn(() => ({
            behaviorDataID: 12,
            bsID: 44,
            status: 'Archived',
          })),
        },
      ]);
      BehaviorData.count.mockResolvedValue(1);
      BehaviorData.update.mockResolvedValue([1]);
      BehaviorAndSkill.update.mockResolvedValue([1]);
      BehaviorData.destroy.mockResolvedValue(1);
      BehaviorAndSkill.destroy.mockResolvedValue(1);

      await expect(abaQueries.archiveBehaviorSkillExistByID(44, 4)).resolves.toBe(true);
      await expect(abaQueries.abaGetArchivedBehaviorDataById(2, 44, 4)).resolves.toEqual([
        expect.objectContaining({ behaviorDataID: 12 }),
      ]);
      await expect(abaQueries.abaGetArchivedBehaviorOrSkill(2, 'Behavior', 4)).resolves.toEqual([
        expect.objectContaining({ bsID: 44 }),
      ]);
      await expect(abaQueries.abaGetAArchivedBehaviorOrSkill(2, 44, 'Behavior', 4)).resolves.toEqual([
        expect.objectContaining({ bsID: 44 }),
      ]);
      await expect(abaQueries.abaGetArchivedBehaviorDataByBehaviorId(2, 44, 12, 4)).resolves.toBe(true);
      await expect(abaQueries.abaReactivateBehaviorDataByID('Active', 2, 44, 4)).resolves.toBe(true);
      await expect(abaQueries.abaReactivateBehaviorOrSkillByID(2, 44, null, null, 4)).resolves.toBe(true);
      await expect(abaQueries.abaDeleteArchivedBehaviorDataByID(2, 44, 4)).resolves.toBe(true);
      await expect(abaQueries.abaDeleteArchivedBehaviorDataByBehaviorID(2, 44, 12, 4)).resolves.toBe(true);
      await expect(abaQueries.abaDeleteArchivedBehaviorOrSkillByID(2, 44, 4)).resolves.toBe(true);
    });
  });

  describe('session note helpers', () => {
    it('creates, fetches, and deletes active session notes', async () => {
      SessionNoteData.count.mockResolvedValue(1);
      SessionNoteData.findAll.mockResolvedValue([
        {
          get: jest.fn(() => ({
            sessionNoteDataID: 8,
            clientID: 2,
            sessionNotes: 'Worked on goals',
            status: 'Active',
          })),
        },
      ]);
      SessionNoteData.create.mockResolvedValue({});
      SessionNoteData.destroy.mockResolvedValue(1);

      await expect(abaQueries.abaSessionNoteDataByClientIDExists(2, 4)).resolves.toBe(true);
      await expect(abaQueries.abaSessionNoteDataByClientID(2, 4)).resolves.toEqual([
        expect.objectContaining({ sessionNoteDataID: 8, status: 'Active' }),
      ]);
      await expect(abaQueries.abaGetSessionNoteByID(2, 8, 4)).resolves.toEqual([
        expect.objectContaining({ sessionNoteDataID: 8 }),
      ]);
      await expect(
        abaQueries.abaAddSessionNoteData({
          cID: 2,
          cName: 'Client Name',
          sDate: '2026-04-01',
          sTime: '09:00',
          sNotes: 'Worked on goals',
          enteredBy: 'Staff Member',
          compID: 4,
          compName: 'Test Co',
          dateEntered: '2026-04-01',
          timeEntered: '09:05',
        }),
      ).resolves.toBe(true);
      await expect(abaQueries.abaDeleteSessionNoteDataByID(2, 8, 4)).resolves.toBe(true);
    });

    it('wraps session note query errors consistently', async () => {
      SessionNoteData.count.mockRejectedValue(new Error('session-count-failed'));
      SessionNoteData.findAll.mockRejectedValue(new Error('session-find-failed'));
      SessionNoteData.create.mockRejectedValue(new Error('session-create-failed'));
      SessionNoteData.destroy.mockRejectedValue(new Error('session-destroy-failed'));

      await expect(abaQueries.abaSessionNoteDataByClientIDExists(2, 4)).rejects.toThrow('session-count-failed');
      await expect(abaQueries.abaSessionNoteDataByClientID(2, 4)).rejects.toThrow('session-find-failed');
      await expect(
        abaQueries.abaAddSessionNoteData({
          cID: 2,
          cName: 'Client Name',
          sDate: '2026-04-01',
          sTime: '09:00',
          sNotes: 'Worked on goals',
          enteredBy: 'Staff Member',
          compID: 4,
          compName: 'Test Co',
          dateEntered: '2026-04-01',
          timeEntered: '09:05',
        }),
      ).rejects.toThrow('session-create-failed');
      await expect(abaQueries.abaDeleteSessionNoteDataByID(2, 8, 4)).rejects.toThrow('session-destroy-failed');
    });
  });
});
