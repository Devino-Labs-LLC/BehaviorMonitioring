const adminQueries = require('../../../middleware/helpers/AdminQueries');
const { Client } = require('../../../models');

jest.mock('../../../models', () => ({
  Client: {
    update: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    destroy: jest.fn()
  }
}));

describe('AdminQueries - Client Archive Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('adminArchiveClient', () => {
    it('should archive a client successfully', async () => {
      Client.update.mockResolvedValue([1]); // 1 row updated

      const result = await adminQueries.adminArchiveClient(
        10,
        1,
        'John Doe',
        '2026-01-29',
        '2033-01-29'
      );

      expect(result).toBe(true);
      expect(Client.update).toHaveBeenCalledWith(
        {
          status: 'Archived',
          archived_date: '2026-01-29',
          archived_deletion_date: '2033-01-29',
          archived_by: 'John Doe',
          reminder_90_sent: false,
          reminder_60_sent: false,
          reminder_30_sent: false
        },
        { where: { clientID: 10, companyID: 1 } }
      );
    });

    it('should return false when client is not found', async () => {
      Client.update.mockResolvedValue([0]); // 0 rows updated

      const result = await adminQueries.adminArchiveClient(
        999,
        1,
        'John Doe',
        '2026-01-29',
        '2033-01-29'
      );

      expect(result).toBe(false);
    });

    it('should throw error on database failure', async () => {
      Client.update.mockRejectedValue(new Error('Database error'));

      await expect(
        adminQueries.adminArchiveClient(10, 1, 'John Doe', '2026-01-29', '2033-01-29')
      ).rejects.toEqual({ message: 'Database error' });
    });
  });

  describe('adminGetArchivedClients', () => {
    it('should return all archived clients for a company', async () => {
      const mockClients = [
        {
          get: jest.fn(() => ({
            clientID: 1,
            fName: 'John',
            lName: 'Doe',
            status: 'Archived',
            archived_date: '2026-01-29',
            archived_deletion_date: '2033-01-29',
            companyID: 1
          }))
        },
        {
          get: jest.fn(() => ({
            clientID: 2,
            fName: 'Jane',
            lName: 'Smith',
            status: 'Archived',
            archived_date: '2026-01-20',
            archived_deletion_date: '2033-01-20',
            companyID: 1
          }))
        }
      ];

      Client.findAll.mockResolvedValue(mockClients);

      const result = await adminQueries.adminGetArchivedClients(1);

      expect(result).toHaveLength(2);
      expect(result[0].fName).toBe('John');
      expect(result[1].fName).toBe('Jane');
      expect(Client.findAll).toHaveBeenCalledWith({
        where: { companyID: 1, status: 'Archived' },
        order: [['archived_date', 'DESC']]
      });
    });

    it('should return empty array when no archived clients exist', async () => {
      Client.findAll.mockResolvedValue([]);

      const result = await adminQueries.adminGetArchivedClients(1);

      expect(result).toEqual([]);
    });

    it('should throw error on database failure', async () => {
      Client.findAll.mockRejectedValue(new Error('Database error'));

      await expect(adminQueries.adminGetArchivedClients(1)).rejects.toEqual({
        message: 'Database error'
      });
    });
  });

  describe('adminGetArchivedClientById', () => {
    it('should return a specific archived client', async () => {
      const mockClient = {
        get: jest.fn(() => ({
          clientID: 1,
          fName: 'John',
          lName: 'Doe',
          status: 'Archived',
          archived_date: '2026-01-29',
          archived_deletion_date: '2033-01-29'
        }))
      };

      Client.findOne.mockResolvedValue(mockClient);

      const result = await adminQueries.adminGetArchivedClientById(1, 1);

      expect(result.fName).toBe('John');
      expect(result.status).toBe('Archived');
      expect(Client.findOne).toHaveBeenCalledWith({
        where: { clientID: 1, companyID: 1, status: 'Archived' }
      });
    });

    it('should return null when archived client is not found', async () => {
      Client.findOne.mockResolvedValue(null);

      const result = await adminQueries.adminGetArchivedClientById(999, 1);

      expect(result).toBeNull();
    });

    it('should throw error on database failure', async () => {
      Client.findOne.mockRejectedValue(new Error('Database error'));

      await expect(adminQueries.adminGetArchivedClientById(1, 1)).rejects.toEqual({
        message: 'Database error'
      });
    });
  });

  describe('adminUnarchiveClient', () => {
    it('should unarchive a client successfully', async () => {
      Client.update.mockResolvedValue([1]);

      const result = await adminQueries.adminUnarchiveClient(1, 1);

      expect(result).toBe(true);
      expect(Client.update).toHaveBeenCalledWith(
        {
          status: 'Active',
          archived_date: null,
          archived_deletion_date: null,
          archived_by: null,
          reminder_90_sent: false,
          reminder_60_sent: false,
          reminder_30_sent: false
        },
        { where: { clientID: 1, companyID: 1, status: 'Archived' } }
      );
    });

    it('should return false when client is not found or not archived', async () => {
      Client.update.mockResolvedValue([0]);

      const result = await adminQueries.adminUnarchiveClient(999, 1);

      expect(result).toBe(false);
    });

    it('should throw error on database failure', async () => {
      Client.update.mockRejectedValue(new Error('Database error'));

      await expect(adminQueries.adminUnarchiveClient(1, 1)).rejects.toEqual({
        message: 'Database error'
      });
    });
  });

  describe('adminDeleteArchivedClient', () => {
    it('should permanently delete an archived client', async () => {
      Client.destroy.mockResolvedValue(1);

      const result = await adminQueries.adminDeleteArchivedClient(1, 1);

      expect(result).toBe(true);
      expect(Client.destroy).toHaveBeenCalledWith({
        where: { clientID: 1, companyID: 1, status: 'Archived' }
      });
    });

    it('should return false when client is not found', async () => {
      Client.destroy.mockResolvedValue(0);

      const result = await adminQueries.adminDeleteArchivedClient(999, 1);

      expect(result).toBe(false);
    });

    it('should throw error on database failure', async () => {
      Client.destroy.mockRejectedValue(new Error('Database error'));

      await expect(adminQueries.adminDeleteArchivedClient(1, 1)).rejects.toEqual({
        message: 'Database error'
      });
    });
  });

  describe('adminGetClientsForDeletion', () => {
    it('should return clients eligible for deletion (0 days)', async () => {
      const mockClients = [
        {
          get: jest.fn(() => ({
            clientID: 1,
            fName: 'Old',
            lName: 'Client',
            archived_deletion_date: '2026-01-29'
          }))
        }
      ];

      Client.findAll.mockResolvedValue(mockClients);

      const result = await adminQueries.adminGetClientsForDeletion(0);

      expect(result).toHaveLength(1);
      // Just verify findAll was called with status: 'Archived'
      expect(Client.findAll).toHaveBeenCalled();
      const callArg = Client.findAll.mock.calls[0][0];
      expect(callArg.where.status).toBe('Archived');
      expect(callArg.where.archived_deletion_date).toBeDefined();
    });

    it('should return clients eligible for 90-day reminder', async () => {
      const mockClients = [
        {
          get: jest.fn(() => ({
            clientID: 1,
            fName: 'Soon',
            lName: 'Expiring',
            archived_deletion_date: '2026-04-29',
            reminder_90_sent: false
          }))
        }
      ];

      Client.findAll.mockResolvedValue(mockClients);

      const result = await adminQueries.adminGetClientsForDeletion(90);

      expect(result).toHaveLength(1);
      expect(result[0].fName).toBe('Soon');
    });

    it('should throw error on database failure', async () => {
      Client.findAll.mockRejectedValue(new Error('Database error'));

      await expect(adminQueries.adminGetClientsForDeletion(0)).rejects.toEqual({
        message: 'Database error'
      });
    });
  });

  describe('adminUpdateReminderSent', () => {
    it('should update 90-day reminder status', async () => {
      Client.update.mockResolvedValue([1]);

      const result = await adminQueries.adminUpdateReminderSent(1, '90');

      expect(result).toBe(true);
      expect(Client.update).toHaveBeenCalledWith(
        { reminder_90_sent: true },
        { where: { clientID: 1 } }
      );
    });

    it('should update 60-day reminder status', async () => {
      Client.update.mockResolvedValue([1]);

      const result = await adminQueries.adminUpdateReminderSent(1, '60');

      expect(result).toBe(true);
      expect(Client.update).toHaveBeenCalledWith(
        { reminder_60_sent: true },
        { where: { clientID: 1 } }
      );
    });

    it('should update 30-day reminder status', async () => {
      Client.update.mockResolvedValue([1]);

      const result = await adminQueries.adminUpdateReminderSent(1, '30');

      expect(result).toBe(true);
      expect(Client.update).toHaveBeenCalledWith(
        { reminder_30_sent: true },
        { where: { clientID: 1 } }
      );
    });

    it('should return false when client is not found', async () => {
      Client.update.mockResolvedValue([0]);

      const result = await adminQueries.adminUpdateReminderSent(999, '90');

      expect(result).toBe(false);
    });

    it('should throw error on database failure', async () => {
      Client.update.mockRejectedValue(new Error('Database error'));

      await expect(adminQueries.adminUpdateReminderSent(1, '90')).rejects.toEqual({
        message: 'Database error'
      });
    });
  });
});
