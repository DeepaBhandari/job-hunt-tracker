import { Router } from 'express';
import { CreateCompanySchema, UpdateCompanySchema } from '@job-hunt/types';
import { prisma } from '../lib/prisma.js';
import { validate } from '../middleware/validate.js';
import { AppError } from '../middleware/error.js';
import { requireAuth, getAuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

function normalizeOptionalString(value: string | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  return value === '' ? null : value;
}

router.get('/', async (req, res, next) => {
  try {
    const { userId } = getAuthenticatedRequest(req);
    const companies = await prisma.company.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
      include: { _count: { select: { jobs: true } } },
    });

    res.json({ companies });
  } catch (error) {
    next(error);
  }
});

router.post('/', validate(CreateCompanySchema), async (req, res, next) => {
  try {
    const { userId } = getAuthenticatedRequest(req);
    const { name, website, industry, size, notes } = req.body as {
      name: string;
      website?: string;
      industry?: string;
      size?: string;
      notes?: string;
    };

    const company = await prisma.company.create({
      data: {
        userId,
        name,
        website: normalizeOptionalString(website) ?? null,
        industry: industry ?? null,
        size: size ?? null,
        notes: notes ?? null,
      },
    });

    res.status(201).json({ company });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { userId } = getAuthenticatedRequest(req);
    const company = await prisma.company.findFirst({
      where: { id: req.params.id, userId },
      include: { jobs: { orderBy: { createdAt: 'desc' } } },
    });

    if (!company) {
      throw new AppError(404, 'Company not found');
    }

    res.json({ company });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', validate(UpdateCompanySchema), async (req, res, next) => {
  try {
    const { userId } = getAuthenticatedRequest(req);
    const existing = await prisma.company.findFirst({
      where: { id: req.params.id, userId },
    });

    if (!existing) {
      throw new AppError(404, 'Company not found');
    }

    const { name, website, industry, size, notes } = req.body as {
      name?: string;
      website?: string;
      industry?: string;
      size?: string;
      notes?: string;
    };

    const company = await prisma.company.update({
      where: { id: existing.id },
      data: {
        ...(name !== undefined && { name }),
        ...(website !== undefined && { website: normalizeOptionalString(website) }),
        ...(industry !== undefined && { industry }),
        ...(size !== undefined && { size }),
        ...(notes !== undefined && { notes }),
      },
    });

    res.json({ company });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { userId } = getAuthenticatedRequest(req);
    const existing = await prisma.company.findFirst({
      where: { id: req.params.id, userId },
    });

    if (!existing) {
      throw new AppError(404, 'Company not found');
    }

    await prisma.company.delete({ where: { id: existing.id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
