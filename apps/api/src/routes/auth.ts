import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { LoginSchema, RegisterSchema } from '@job-hunt/types';
import { prisma } from '../lib/prisma.js';
import { validate } from '../middleware/validate.js';
import { AppError } from '../middleware/error.js';
import { requireAuth, getAuthenticatedRequest } from '../middleware/auth.js';
import { clearAuthCookies, setAuthCookies } from '../lib/cookies.js';
import { signAccessToken, verifyRefreshToken } from '../lib/jwt.js';

const router = Router();

function serializeUser(user: {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt.toISOString(),
  };
}

router.post('/register', validate(RegisterSchema), async (req, res, next) => {
  try {
    const { email, password, name } = req.body as {
      email: string;
      password: string;
      name?: string;
    };

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new AppError(409, 'An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, passwordHash, name },
    });

    setAuthCookies(res, { userId: user.id, email: user.email });
    res.status(201).json({ user: serializeUser(user) });
  } catch (error) {
    next(error);
  }
});

router.post('/login', validate(LoginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body as { email: string; password: string };

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user?.passwordHash) {
      throw new AppError(401, 'Invalid email or password');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new AppError(401, 'Invalid email or password');
    }

    setAuthCookies(res, { userId: user.id, email: user.email });
    res.json({ user: serializeUser(user) });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', (_req, res) => {
  clearAuthCookies(res);
  res.json({ ok: true });
});

router.post('/refresh', async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refresh_token as string | undefined;
    if (!refreshToken) {
      throw new AppError(401, 'Refresh token required');
    }

    const payload = verifyRefreshToken(refreshToken);
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      throw new AppError(401, 'User not found');
    }

    res.cookie('access_token', signAccessToken({ userId: user.id, email: user.email }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60 * 1000,
    });

    res.json({ user: serializeUser(user) });
  } catch (error) {
    next(error);
  }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const { userId } = getAuthenticatedRequest(req);
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    res.json({ user: serializeUser(user) });
  } catch (error) {
    next(error);
  }
});

export default router;
