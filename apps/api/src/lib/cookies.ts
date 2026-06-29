import type { Response } from 'express';
import { signAccessToken, signRefreshToken, type TokenPayload } from './jwt.js';

const isProduction = process.env.NODE_ENV === 'production';

const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax' as const,
  path: '/',
};

export function setAuthCookies(res: Response, payload: TokenPayload): void {
  res.cookie('access_token', signAccessToken(payload), {
    ...cookieOptions,
    maxAge: 15 * 60 * 1000,
  });

  res.cookie('refresh_token', signRefreshToken(payload), {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie('access_token', cookieOptions);
  res.clearCookie('refresh_token', cookieOptions);
}
