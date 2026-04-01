import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from '../../../src/lib/tokenStore';

describe('tokenStore', () => {
  afterEach(() => {
    clearAccessToken();
  });

  it('stores and returns an access token', () => {
    setAccessToken('token-123');

    expect(getAccessToken()).toBe('token-123');
  });

  it('clears the stored access token', () => {
    setAccessToken('token-123');
    clearAccessToken();

    expect(getAccessToken()).toBeNull();
  });

  it('supports explicitly storing null', () => {
    setAccessToken(null);

    expect(getAccessToken()).toBeNull();
  });
});
