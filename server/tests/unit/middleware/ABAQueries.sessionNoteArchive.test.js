const { SessionNoteData } = require('../../../models');
const {
  abaGetArchivedSessionNoteDataByClientID,
  abaGetArchivedSessionNoteByID,
  abaReactivateSessionNoteByID,
  abaArchiveSessionNoteByID,
  abaDeleteArchivedSessionNoteByID,
} = require('../../../middleware/helpers/ABAQueries');

jest.mock('../../../models');

describe('ABAQueries - Session Note Archive Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('abaGetArchivedSessionNoteDataByClientID', () => {
    it('should return archived session notes for a client', async () => {
      const mockNotes = [
        {
          get: jest.fn(() => ({
            sessionNoteDataID: 1,
            clientID: 10,
            clientName: 'John Doe',
            sessionDate: '2026-01-15',
            sessionTime: '10:00 AM',
            sessionNotes: 'Test note',
            entered_by: 'Admin User',
            status: 'Archived',
          })),
        },
      ];

      SessionNoteData.findAll.mockResolvedValue(mockNotes);

      const result = await abaGetArchivedSessionNoteDataByClientID(10, 1);

      expect(SessionNoteData.findAll).toHaveBeenCalledWith({
        where: { clientID: 10, companyID: 1, status: 'Archived' },
        attributes: expect.any(Array),
      });
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('Archived');
    });

    it('should return empty array when no archived notes exist', async () => {
      SessionNoteData.findAll.mockResolvedValue([]);

      const result = await abaGetArchivedSessionNoteDataByClientID(10, 1);

      expect(result).toEqual([]);
    });

    it('should throw error when database query fails', async () => {
      SessionNoteData.findAll.mockRejectedValue(new Error('Database error'));

      await expect(abaGetArchivedSessionNoteDataByClientID(10, 1)).rejects.toThrow('Database error');
    });
  });

  describe('abaGetArchivedSessionNoteByID', () => {
    it('should return a specific archived session note', async () => {
      const mockNote = [
        {
          get: jest.fn(() => ({
            sessionNoteDataID: 5,
            clientID: 10,
            sessionNotes: 'Archived note details',
            status: 'Archived',
          })),
        },
      ];

      SessionNoteData.findAll.mockResolvedValue(mockNote);

      const result = await abaGetArchivedSessionNoteByID(10, 5, 1);

      expect(SessionNoteData.findAll).toHaveBeenCalledWith({
        where: { clientID: 10, sessionNoteDataID: 5, companyID: 1, status: 'Archived' },
        attributes: expect.any(Array),
      });
      expect(result[0].sessionNoteDataID).toBe(5);
    });

    it('should return empty array when note not found', async () => {
      SessionNoteData.findAll.mockResolvedValue([]);

      const result = await abaGetArchivedSessionNoteByID(10, 999, 1);

      expect(result).toEqual([]);
    });
  });

  describe('abaReactivateSessionNoteByID', () => {
    it('should successfully reactivate an archived session note', async () => {
      SessionNoteData.update.mockResolvedValue([1]);

      const result = await abaReactivateSessionNoteByID(10, 5, 1);

      expect(SessionNoteData.update).toHaveBeenCalledWith(
        { status: 'Active' },
        { where: { sessionNoteDataID: 5, clientID: 10, companyID: 1 } }
      );
      expect(result).toBe(true);
    });

    it('should return false when no rows updated', async () => {
      SessionNoteData.update.mockResolvedValue([0]);

      const result = await abaReactivateSessionNoteByID(10, 999, 1);

      expect(result).toBe(false);
    });

    it('should throw error when update fails', async () => {
      SessionNoteData.update.mockRejectedValue(new Error('Update failed'));

      await expect(abaReactivateSessionNoteByID(10, 5, 1)).rejects.toThrow('Update failed');
    });
  });

  describe('abaArchiveSessionNoteByID', () => {
    it('should successfully archive an active session note', async () => {
      SessionNoteData.update.mockResolvedValue([1]);

      const result = await abaArchiveSessionNoteByID(10, 5, 1);

      expect(SessionNoteData.update).toHaveBeenCalledWith(
        { status: 'Archived' },
        { where: { sessionNoteDataID: 5, clientID: 10, companyID: 1 } }
      );
      expect(result).toBe(true);
    });

    it('should return false when session note does not exist', async () => {
      SessionNoteData.update.mockResolvedValue([0]);

      const result = await abaArchiveSessionNoteByID(10, 999, 1);

      expect(result).toBe(false);
    });
  });

  describe('abaDeleteArchivedSessionNoteByID', () => {
    it('should permanently delete an archived session note', async () => {
      SessionNoteData.destroy.mockResolvedValue(1);

      const result = await abaDeleteArchivedSessionNoteByID(10, 5, 1);

      expect(SessionNoteData.destroy).toHaveBeenCalledWith({
        where: { sessionNoteDataID: 5, clientID: 10, companyID: 1, status: 'Archived' },
      });
      expect(result).toBe(true);
    });

    it('should return false when no rows deleted', async () => {
      SessionNoteData.destroy.mockResolvedValue(0);

      const result = await abaDeleteArchivedSessionNoteByID(10, 999, 1);

      expect(result).toBe(false);
    });

    it('should only delete archived notes (not active ones)', async () => {
      SessionNoteData.destroy.mockResolvedValue(0);

      await abaDeleteArchivedSessionNoteByID(10, 5, 1);

      const callArgs = SessionNoteData.destroy.mock.calls[0][0];
      expect(callArgs.where.status).toBe('Archived');
    });

    it('should throw error when deletion fails', async () => {
      SessionNoteData.destroy.mockRejectedValue(new Error('Delete failed'));

      await expect(abaDeleteArchivedSessionNoteByID(10, 5, 1)).rejects.toThrow('Delete failed');
    });
  });
});
