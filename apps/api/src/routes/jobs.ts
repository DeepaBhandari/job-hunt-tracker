import { Router } from 'express';
import { CreateJobSchema, UpdateJobSchema } from '@job-hunt/types';
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

async function assertCompanyOwnership(companyId: string, userId: string) {
  const company = await prisma.company.findFirst({
    where: { id: companyId, userId },
  });

  if (!company) {
    throw new AppError(404, 'Company not found');
  }

  return company;
}

router.get('/', async (req, res, next) => {
  try {
    const { userId } = getAuthenticatedRequest(req);
    const companyId = req.query.companyId as string | undefined;

    const jobs = await prisma.job.findMany({
      where: {
        userId,
        ...(companyId ? { companyId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: { company: { select: { id: true, name: true } } },
    });

    res.json({ jobs });
  } catch (error) {
    next(error);
  }
});

router.post('/', validate(CreateJobSchema), async (req, res, next) => {
  try {
    const { userId } = getAuthenticatedRequest(req);
    const {
      companyId,
      title,
      description,
      url,
      salaryMin,
      salaryMax,
      location,
      type,
      source,
    } = req.body as {
      companyId: string;
      title: string;
      description?: string;
      url?: string;
      salaryMin?: number;
      salaryMax?: number;
      location?: string;
      type?: string;
      source?: string;
    };

    await assertCompanyOwnership(companyId, userId);

    const job = await prisma.job.create({
      data: {
        companyId,
        userId,
        title,
        description: description ?? null,
        url: normalizeOptionalString(url) ?? null,
        salaryMin: salaryMin ?? null,
        salaryMax: salaryMax ?? null,
        location: location ?? null,
        type: type as never,
        source: source ?? null,
      },
      include: { company: { select: { id: true, name: true } } },
    });

    res.status(201).json({ job });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { userId } = getAuthenticatedRequest(req);
    const job = await prisma.job.findFirst({
      where: { id: req.params.id, userId },
      include: { company: { select: { id: true, name: true } } },
    });

    if (!job) {
      throw new AppError(404, 'Job not found');
    }

    res.json({ job });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', validate(UpdateJobSchema), async (req, res, next) => {
  try {
    const { userId } = getAuthenticatedRequest(req);
    const existing = await prisma.job.findFirst({
      where: { id: req.params.id, userId },
    });

    if (!existing) {
      throw new AppError(404, 'Job not found');
    }

    const {
      title,
      description,
      url,
      salaryMin,
      salaryMax,
      location,
      type,
      source,
    } = req.body as {
      title?: string;
      description?: string;
      url?: string;
      salaryMin?: number;
      salaryMax?: number;
      location?: string;
      type?: string;
      source?: string;
    };

    const job = await prisma.job.update({
      where: { id: existing.id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(url !== undefined && { url: normalizeOptionalString(url) }),
        ...(salaryMin !== undefined && { salaryMin }),
        ...(salaryMax !== undefined && { salaryMax }),
        ...(location !== undefined && { location }),
        ...(type !== undefined && { type: type as never }),
        ...(source !== undefined && { source }),
      },
      include: { company: { select: { id: true, name: true } } },
    });

    res.json({ job });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { userId } = getAuthenticatedRequest(req);
    const existing = await prisma.job.findFirst({
      where: { id: req.params.id, userId },
    });

    if (!existing) {
      throw new AppError(404, 'Job not found');
    }

    await prisma.job.delete({ where: { id: existing.id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
