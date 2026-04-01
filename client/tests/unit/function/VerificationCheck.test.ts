import {
  ClearLoggedInUser,
  GetAdminStatus,
  GetLoggedInUser,
  GetLoggedInUserStatus,
  NeedToLogout,
  SetLoggedInUser,
  validateEmail,
  validatePassword,
  validateUsername,
} from '../../../src/function/VerificationCheck';
import { getAccessToken } from '../../../src/lib/tokenStore';
import { getBootstrapStatus } from '../../../src/components/AuthBootstrap';
import { clearScheduledRefresh } from '../../../src/lib/authScheduler';

jest.mock('../../../src/lib/tokenStore', () => ({
  getAccessToken: jest.fn(),
}));

jest.mock('../../../src/components/AuthBootstrap', () => ({
  getBootstrapStatus: jest.fn(),
}));

jest.mock('../../../src/lib/authScheduler', () => ({
  clearScheduledRefresh: jest.fn(),
}));

const mockGetAccessToken = getAccessToken as jest.MockedFunction<typeof getAccessToken>;
const mockGetBootstrapStatus = getBootstrapStatus as jest.MockedFunction<typeof getBootstrapStatus>;
const mockClearScheduledRefresh = clearScheduledRefresh as jest.MockedFunction<
  typeof clearScheduledRefresh
>;

describe('VerificationCheck Utility Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetBootstrapStatus.mockReturnValue({
      isBootstrapped: false,
      isBootstrapping: false,
    });
    mockGetAccessToken.mockReturnValue('access-token');
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => null);
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => undefined);
    jest.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('session helpers', () => {
    it('stores logged in user data when login succeeds', () => {
      SetLoggedInUser(true, {
        uName: 'janedoe',
        compID: 12,
        compName: 'Devino',
        isAdmin: true,
      });

      expect(Storage.prototype.setItem).toHaveBeenCalledWith(
        'bmUserData',
        JSON.stringify({
          bmLoggedInStatus: true,
          bmUsername: 'janedoe',
          bmCompanyID: '12',
          bmCompanyName: 'Devino',
          bmAdmin: true,
        }),
      );
    });

    it('clears stored user data when login is unsuccessful', () => {
      SetLoggedInUser(false, {
        uName: 'janedoe',
        compID: 12,
        compName: 'Devino',
        isAdmin: true,
      });

      expect(mockClearScheduledRefresh).toHaveBeenCalled();
      expect(Storage.prototype.removeItem).toHaveBeenCalledWith('bmUserData');
    });

    it('returns false when no stored user data exists', () => {
      expect(GetLoggedInUserStatus()).toBe(false);
    });

    it('returns false when stored user data marks the user as logged out', () => {
      jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() =>
        JSON.stringify({
          bmLoggedInStatus: false,
          bmUsername: 'janedoe',
          bmAdmin: false,
        }),
      );

      expect(GetLoggedInUserStatus()).toBe(false);
    });

    it('returns true while bootstrap is in progress when stored user data exists', () => {
      mockGetBootstrapStatus.mockReturnValue({
        isBootstrapped: false,
        isBootstrapping: true,
      });
      jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() =>
        JSON.stringify({
          bmLoggedInStatus: true,
          bmUsername: 'janedoe',
          bmAdmin: true,
        }),
      );

      expect(GetLoggedInUserStatus()).toBe(true);
    });

    it('clears stored user data when bootstrap finishes without an access token', () => {
      mockGetBootstrapStatus.mockReturnValue({
        isBootstrapped: true,
        isBootstrapping: false,
      });
      mockGetAccessToken.mockReturnValue(null);
      jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() =>
        JSON.stringify({
          bmLoggedInStatus: true,
          bmUsername: 'janedoe',
          bmAdmin: true,
        }),
      );

      expect(GetLoggedInUserStatus()).toBe(false);
      expect(mockClearScheduledRefresh).toHaveBeenCalled();
      expect(Storage.prototype.removeItem).toHaveBeenCalledWith('bmUserData');
    });

    it('returns true after bootstrap completes when an access token still exists', () => {
      mockGetBootstrapStatus.mockReturnValue({
        isBootstrapped: true,
        isBootstrapping: false,
      });
      mockGetAccessToken.mockReturnValue('still-valid-token');
      jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() =>
        JSON.stringify({
          bmLoggedInStatus: true,
          bmUsername: 'janedoe',
          bmAdmin: true,
        }),
      );

      expect(GetLoggedInUserStatus()).toBe(true);
    });

    it('returns username and admin status when a valid session exists', () => {
      mockGetBootstrapStatus.mockReturnValue({
        isBootstrapped: true,
        isBootstrapping: false,
      });
      jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() =>
        JSON.stringify({
          bmLoggedInStatus: true,
          bmUsername: 'janedoe',
          bmAdmin: true,
        }),
      );

      expect(GetLoggedInUser()).toBe('janedoe');
      expect(GetAdminStatus()).toBe(true);
    });

    it('clears corrupted stored user data', () => {
      jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => '{invalid-json');

      expect(GetLoggedInUserStatus()).toBe(false);
      expect(mockClearScheduledRefresh).toHaveBeenCalled();
      expect(Storage.prototype.removeItem).toHaveBeenCalledWith('bmUserData');
    });

    it('forces logout when usernames do not match', () => {
      mockGetBootstrapStatus.mockReturnValue({
        isBootstrapped: true,
        isBootstrapping: false,
      });
      jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() =>
        JSON.stringify({
          bmLoggedInStatus: true,
          bmUsername: 'janedoe',
          bmAdmin: false,
        }),
      );

      expect(NeedToLogout('someone-else')).toBe(true);
      expect(mockClearScheduledRefresh).toHaveBeenCalled();
      expect(Storage.prototype.removeItem).toHaveBeenCalledWith('bmUserData');
    });

    it('does not log out when the current username matches', () => {
      mockGetBootstrapStatus.mockReturnValue({
        isBootstrapped: true,
        isBootstrapping: false,
      });
      jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() =>
        JSON.stringify({
          bmLoggedInStatus: true,
          bmUsername: 'janedoe',
          bmAdmin: false,
        }),
      );

      expect(NeedToLogout('janedoe')).toBe(false);
    });

    it('returns null username and false admin status when no active session exists', () => {
      expect(GetLoggedInUser()).toBeNull();
      expect(GetAdminStatus()).toBe(false);
    });

    it('forces logout when there is no active session to preserve', () => {
      expect(NeedToLogout('janedoe')).toBe(true);
      expect(mockClearScheduledRefresh).toHaveBeenCalled();
      expect(Storage.prototype.removeItem).toHaveBeenCalledWith('bmUserData');
    });
  });

  describe('validateEmail', () => {
    it('validates correct email format', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.co.uk')).toBe(true);
      expect(validateEmail('user+tag@example.com')).toBe(true);
    });

    it('rejects invalid email format', () => {
      expect(validateEmail('invalid-email')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('user@')).toBe(false);
      expect(validateEmail('user@domain')).toBe(false);
    });

    it('rejects empty string', () => {
      expect(validateEmail('')).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('validates password with minimum length', () => {
      expect(validatePassword('password123')).toBe(true);
      expect(validatePassword('12345678')).toBe(true);
    });

    it('rejects password shorter than minimum length', () => {
      expect(validatePassword('pass')).toBe(false);
      expect(validatePassword('1234567')).toBe(false);
    });

    it('rejects empty password', () => {
      expect(validatePassword('')).toBe(false);
    });
  });

  describe('validateUsername', () => {
    it('validates username with minimum length', () => {
      expect(validateUsername('user')).toBe(true);
      expect(validateUsername('username123')).toBe(true);
    });

    it('rejects username shorter than minimum length', () => {
      expect(validateUsername('ab')).toBe(false);
      expect(validateUsername('u')).toBe(false);
    });

    it('rejects empty username', () => {
      expect(validateUsername('')).toBe(false);
    });
  });
});
