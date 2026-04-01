import { formatDate, formatTime, getCurrentDate } from '../../../src/function/DateTimes';

describe('DateTimes Utility Functions', () => {
  describe('formatDate', () => {
    it('formats date string to MM/DD/YYYY', () => {
      const result = formatDate('2025-12-21');
      expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    });

    it('handles ISO date strings', () => {
      const result = formatDate('2025-12-21T10:30:00.000Z');
      expect(result).toBeTruthy();
      expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    });

    it('returns empty string for invalid date', () => {
      const result = formatDate('invalid-date');
      expect(result).toBe('');
    });
  });

  describe('formatTime', () => {
    it('formats time string to HH:MM format', () => {
      const result = formatTime('14:30:00');
      expect(result).toMatch(/^\d{2}:\d{2}$/);
    });

    it('handles ISO datetime strings', () => {
      const result = formatTime('2025-12-21T14:30:00.000Z');
      expect(result).toBeTruthy();
      expect(result).toMatch(/^\d{2}:\d{2}$/);
    });

    it('returns empty string for invalid time', () => {
      const result = formatTime('invalid-time');
      expect(result).toBe('');
    });
  });

  describe('getCurrentDate', () => {
    it('returns current date in YYYY-MM-DD format', () => {
      const result = getCurrentDate();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('returns today\'s date', () => {
      // Mock Date to ensure consistent behavior
      const mockDate = new Date('2026-01-29T12:00:00Z');
      jest.spyOn(globalThis, 'Date').mockImplementation((() => mockDate) as any);
      
      const result = getCurrentDate();
      expect(result).toBe('2026-01-29');
      
      jest.restoreAllMocks();
    });
  });
});
