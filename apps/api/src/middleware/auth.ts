import type { Request, Response, NextFunction } from 'express';
import { AppError } from './error.js';
import { verifyAccessToken } from '../lib/jwt.js';

export interface AuthenticatedRequest extends Request {
  userId: string;
  userEmail: string;
}

export function getAuthenticatedRequest(req: Request): AuthenticatedRequest {
  return req as unknown as AuthenticatedRequest;
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = req.cookies?.access_token as string | undefined;

  if (!token) {
    next(new AppError(401, 'Authentication required'));
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    (req as AuthenticatedRequest).userId = payload.userId;
    (req as AuthenticatedRequest).userEmail = payload.email;
    next();
  } catch {
    next(new AppError(401, 'Invalid or expired token'));
  }
}
