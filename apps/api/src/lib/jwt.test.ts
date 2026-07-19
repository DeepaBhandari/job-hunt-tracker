import { beforeEach, describe, expect, it } from 'vitest';
import { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken } from './jwt';

const payload = { userId: 'user_1', email: 'test@example.com' };

beforeEach(() => {
  process.env.JWT_SECRET = 'test-access-secret';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
});

describe('access tokens', () => {
  it('round-trips the payload through sign and verify', () => {
    const token = signAccessToken(payload);
    expect(verifyAccessToken(token)).toMatchObject(payload);
  });

  it('rejects a tampered token', () => {
    const token = signAccessToken(payload);
    expect(() => verifyAccessToken(`${token}tampered`)).toThrow();
  });
});

describe('refresh tokens', () => {
  it('round-trips the payload through sign and verify', () => {
    const token = signRefreshToken(payload);
    expect(verifyRefreshToken(token)).toEqual(payload);
  });

  it('rejects an access token presented as a refresh token', () => {
    const token = signAccessToken(payload);
    process.env.JWT_REFRESH_SECRET = process.env.JWT_SECRET;
    expect(() => verifyRefreshToken(token)).toThrow('Invalid refresh token');
  });
});
