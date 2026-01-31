const { 
  insertRefreshToken, 
  findRefreshToken, 
  revokeRefreshToken,
  rotateRefreshToken,
  touchRefreshToken
} = require('../../../auth/refreshTokenStore');

// Mock the RefreshToken model
jest.mock('../../../models/RefreshToken', () => ({
  create: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn()
}));

const RefreshToken = require('../../../models/RefreshToken');

describe('Refresh Token Store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('insertRefreshToken', () => {
    it('inserts token successfully', async () => {
      RefreshToken.create.mockResolvedValue({});

      const result = await insertRefreshToken({
        userId: 1,
        token: 'test-token',
        ttlDays: 7,
        userAgent: 'test-agent',
        ipAddress: '127.0.0.1',
        deviceId: 'device-123',
        lastUsedAt: new Date()
      });

      expect(typeof result).toBe('string'); // Returns expiresAt ISO string
      expect(RefreshToken.create).toHaveBeenCalled();
      const createCall = RefreshToken.create.mock.calls[0][0];
      expect(createCall.user_id).toBe(1);
      expect(createCall.token).toBe('test-token');
    });
  });

  describe('findRefreshToken', () => {
    it('finds existing token', async () => {
      const mockToken = {
        id: 1,
        token: 'test-token',
        user_id: 1,
        device_id: 'device-123',
        created_at: new Date().toISOString(),
        toJSON: jest.fn().mockReturnValue({
          id: 1,
          token: 'test-token',
          user_id: 1,
          device_id: 'device-123',
          created_at: new Date().toISOString()
        })
      };

      RefreshToken.findOne.mockResolvedValue(mockToken);

      const result = await findRefreshToken('test-token');

      expect(result).toHaveLength(1);
      expect(result[0].token).toBe('test-token');
      expect(RefreshToken.findOne).toHaveBeenCalledWith({ where: { token: 'test-token' } });
    });

    it('returns empty array for non-existent token', async () => {
      RefreshToken.findOne.mockResolvedValue(null);

      const result = await findRefreshToken('non-existent-token');

      expect(result).toEqual([]);
    });
  });

  describe('revokeRefreshToken', () => {
    it('revokes token successfully', async () => {
      RefreshToken.update.mockResolvedValue([1]);

      await revokeRefreshToken('test-token');

      expect(RefreshToken.update).toHaveBeenCalled();
      const updateCall = RefreshToken.update.mock.calls[0];
      expect(updateCall[0].revoked).toBe(1);
      expect(updateCall[1].where.token).toBe('test-token');
    });
  });

  describe('rotateRefreshToken', () => {
    it('rotates token successfully', async () => {
      RefreshToken.update.mockResolvedValue([1]);

      await rotateRefreshToken('old-token', 'new-token');

      expect(RefreshToken.update).toHaveBeenCalled();
      const updateCall = RefreshToken.update.mock.calls[0];
      expect(updateCall[0].revoked).toBe(1);
      expect(updateCall[0].replaced_by_token).toBe('new-token');
      expect(updateCall[1].where.token).toBe('old-token');
    });
  });

  describe('touchRefreshToken', () => {
    it('updates last used timestamp', async () => {
      RefreshToken.update.mockResolvedValue([1]);

      await touchRefreshToken('test-token');

      expect(RefreshToken.update).toHaveBeenCalled();
      const updateCall = RefreshToken.update.mock.calls[0];
      expect(updateCall[0].last_used_at).toBeInstanceOf(Date);
      expect(updateCall[1].where.token).toBe('test-token');
    });
  });
});