const archiveCleanup = require('../../../jobs/archiveCleanup');
const adminQueries = require('../../../middleware/helpers/AdminQueries');
const emailTemplate = require('../../../middleware/email/emailTemplate');

jest.mock('../../../middleware/helpers/AdminQueries');
jest.mock('../../../middleware/email/emailTemplate', () => ({
  sendClientDataDeletionReminder: jest.fn().mockResolvedValue(true),
  sendClientDataDeleted: jest.fn().mockResolvedValue(true)
}));

describe('Archive Cleanup Job - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console methods to keep test output clean
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    console.log.mockRestore();
    console.error.mockRestore();
  });

  describe('send90DayReminders', () => {
    it('should send 90-day reminders for eligible clients', async () => {
      const mockClients = [
        {
          clientID: 1,
          fName: 'John',
          lName: 'Doe',
          archived_date: '2025-11-01',
          archived_deletion_date: '2026-04-29',
          reminder_90_sent: false
        }
      ];

      adminQueries.adminGetClientsForDeletion = jest.fn().mockResolvedValue(mockClients);
      adminQueries.adminUpdateReminderSent = jest.fn().mockResolvedValue(true);

      const result = await archiveCleanup.send90DayReminders();

      expect(result).toBe(1);
      expect(emailTemplate.sendClientDataDeletionReminder).toHaveBeenCalledWith(
        'John Doe',
        90,
        '2026-04-29',
        '2025-11-01'
      );
      expect(adminQueries.adminUpdateReminderSent).toHaveBeenCalledWith(1, '90');
    });

    it('should not send reminder if already sent', async () => {
      const mockClients = [
        {
          clientID: 1,
          fName: 'John',
          lName: 'Doe',
          archived_deletion_date: '2026-04-29',
          reminder_90_sent: true
        }
      ];

      adminQueries.adminGetClientsForDeletion = jest.fn().mockResolvedValue(mockClients);

      const result = await archiveCleanup.send90DayReminders();

      expect(result).toBe(0);
      expect(emailTemplate.sendClientDataDeletionReminder).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      adminQueries.adminGetClientsForDeletion = jest.fn().mockRejectedValue(new Error('DB error'));

      const result = await archiveCleanup.send90DayReminders();

      expect(result).toBe(0);
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('send60DayReminders', () => {
    it('should send 60-day reminders for eligible clients', async () => {
      const mockClients = [
        {
          clientID: 2,
          fName: 'Jane',
          lName: 'Smith',
          archived_date: '2025-12-01',
          archived_deletion_date: '2026-03-30',
          reminder_60_sent: false
        }
      ];

      adminQueries.adminGetClientsForDeletion = jest.fn().mockResolvedValue(mockClients);
      adminQueries.adminUpdateReminderSent = jest.fn().mockResolvedValue(true);

      const result = await archiveCleanup.send60DayReminders();

      expect(result).toBe(1);
      expect(emailTemplate.sendClientDataDeletionReminder).toHaveBeenCalledWith(
        'Jane Smith',
        60,
        '2026-03-30',
        '2025-12-01'
      );
    });
  });

  describe('send30DayReminders', () => {
    it('should send 30-day reminders for eligible clients', async () => {
      const mockClients = [
        {
          clientID: 3,
          fName: 'Bob',
          lName: 'Johnson',
          archived_date: '2025-12-30',
          archived_deletion_date: '2026-02-28',
          reminder_30_sent: false
        }
      ];

      adminQueries.adminGetClientsForDeletion = jest.fn().mockResolvedValue(mockClients);
      adminQueries.adminUpdateReminderSent = jest.fn().mockResolvedValue(true);

      const result = await archiveCleanup.send30DayReminders();

      expect(result).toBe(1);
      expect(emailTemplate.sendClientDataDeletionReminder).toHaveBeenCalledWith(
        'Bob Johnson',
        30,
        '2026-02-28',
        '2025-12-30'
      );
    });
  });

  describe('deleteExpiredClients', () => {
    it('should delete clients past their deletion date', async () => {
      const mockClients = [
        {
          clientID: 4,
          fName: 'Old',
          lName: 'Client',
          companyID: 1,
          archived_date: '2019-01-29',
          archived_deletion_date: '2026-01-28'
        }
      ];

      adminQueries.adminGetClientsForDeletion = jest.fn().mockResolvedValue(mockClients);
      adminQueries.adminDeleteArchivedClient = jest.fn().mockResolvedValue(true);

      const result = await archiveCleanup.deleteExpiredClients();

      expect(result).toBe(1);
      expect(adminQueries.adminDeleteArchivedClient).toHaveBeenCalledWith(4, 1);
      expect(emailTemplate.sendClientDataDeleted).toHaveBeenCalledWith(
        'Old Client',
        '2026-01-28',
        '2019-01-29'
      );
    });

    it('should not delete clients with future deletion dates', async () => {
      const mockClients = [
        {
          clientID: 5,
          archived_deletion_date: '2027-01-29'
        }
      ];

      adminQueries.adminGetClientsForDeletion = jest.fn().mockResolvedValue(mockClients);

      const result = await archiveCleanup.deleteExpiredClients();

      expect(result).toBe(0);
      expect(adminQueries.adminDeleteArchivedClient).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      adminQueries.adminGetClientsForDeletion = jest.fn().mockRejectedValue(new Error('DB error'));

      const result = await archiveCleanup.deleteExpiredClients();

      expect(result).toBe(0);
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('runArchiveCleanup', () => {
    it('should execute all cleanup tasks successfully', async () => {
      adminQueries.adminGetClientsForDeletion = jest.fn().mockResolvedValue([]);

      const result = await archiveCleanup.runArchiveCleanup();

      expect(result.success).toBe(true);
      expect(result.reminders90).toBe(0);
      expect(result.reminders60).toBe(0);
      expect(result.reminders30).toBe(0);
      expect(result.deletions).toBe(0);
    });

    it('should still succeed even if subtasks encounter errors', async () => {
      // Individual functions handle their own errors and return 0
      adminQueries.adminGetClientsForDeletion = jest.fn().mockRejectedValue(new Error('DB error'));

      const result = await archiveCleanup.runArchiveCleanup();

      // Job still completes successfully, but with 0 results
      expect(result.success).toBe(true);
      expect(result.reminders90).toBe(0);
      expect(result.reminders60).toBe(0);
      expect(result.reminders30).toBe(0);
      expect(result.deletions).toBe(0);
    });
  });
});
