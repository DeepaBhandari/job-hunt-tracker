import { Router } from 'express';
import { CreateApplicationSchema, UpdateApplicationSchema } from '@job-hunt/types';
import { prisma } from '../lib/prisma.js';
import { validate } from '../middleware/validate.js';
import { AppError } from '../middleware/error.js';
import { requireAuth, getAuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

async function assertJobOwnership(jobId: string, userId: string) {
  const job = await prisma.job.findFirst({
    where: { id: jobId, userId },
  });

  if (!job) {
    throw new AppError(404, 'Job not found');
  }

  return job;
}

// GET all applications for user
router.get('/', async (req, res, next) => {
  try {
    const { userId } = getAuthenticatedRequest(req);
    const status = req.query.status as string | undefined;

    const applications = await prisma.application.findMany({
      where: {
        userId,
        ...(status ? { status: status as never } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            location: true,
            salaryMin: true,
            salaryMax: true,
          },
          include: {
            company: {
              select: { id: true, name: true },
            },
          },
        },
        resumeVersion: { select: { id: true, label: true } },
        interviews: {
          select: {
            id: true,
            scheduledAt: true,
            type: true,
            outcome: true,
          },
        },
        tags: {
          include: { tag: { select: { id: true, name: true, color: true } } },
        },
      },
    });

    res.json({ applications });
  } catch (error) {
    next(error);
  }
});

// POST create new application
router.post('/', validate(CreateApplicationSchema), async (req, res, next) => {
  try {
    const { userId } = getAuthenticatedRequest(req);
    const { jobId, status, appliedAt, resumeVersionId, coverLetter, notes } = req.body as {
      jobId: string;
      status?: string;
      appliedAt?: string;
      resumeVersionId?: string;
      coverLetter?: string;
      notes?: string;
    };

    // Verify job exists and belongs to user
    await assertJobOwnership(jobId, userId);

    // Check if application already exists
    const existing = await prisma.application.findFirst({
      where: { jobId, userId },
    });

    if (existing) {
      throw new AppError(400, 'Application for this job already exists');
    }

    const application = await prisma.application.create({
      data: {
        jobId,
        userId,
        status: (status as never) ?? 'SAVED',
        appliedAt: appliedAt ? new Date(appliedAt) : null,
        resumeVersionId: resumeVersionId ?? null,
        coverLetter: coverLetter ?? null,
        notes: notes ?? null,
      },
      include: {
        job: {
          include: {
            company: { select: { id: true, name: true } },
          },
        },
        resumeVersion: { select: { id: true, label: true } },
        interviews: true,
        tags: {
          include: { tag: { select: { id: true, name: true, color: true } } },
        },
      },
    });

    res.status(201).json({ application });
  } catch (error) {
    next(error);
  }
});

// GET single application
router.get('/:id', async (req, res, next) => {
  try {
    const { userId } = getAuthenticatedRequest(req);
    const application = await prisma.application.findFirst({
      where: { id: req.params.id, userId },
      include: {
        job: {
          include: {
            company: { select: { id: true, name: true } },
          },
        },
        resumeVersion: true,
        interviews: {
          orderBy: { scheduledAt: 'asc' },
        },
        tags: {
          include: { tag: { select: { id: true, name: true, color: true } } },
        },
      },
    });

    if (!application) {
      throw new AppError(404, 'Application not found');
    }

    res.json({ application });
  } catch (error) {
    next(error);
  }
});

// PATCH update application
router.patch('/:id', validate(UpdateApplicationSchema), async (req, res, next) => {
  try {
    const { userId } = getAuthenticatedRequest(req);
    const existing = await prisma.application.findFirst({
      where: { id: req.params.id, userId },
    });

    if (!existing) {
      throw new AppError(404, 'Application not found');
    }

    const { status, appliedAt, resumeVersionId, coverLetter, notes } = req.body as {
      status?: string;
      appliedAt?: string;
      resumeVersionId?: string;
      coverLetter?: string;
      notes?: string;
    };

    const application = await prisma.application.update({
      where: { id: existing.id },
      data: {
        ...(status !== undefined && { status: status as never }),
        ...(appliedAt !== undefined && {
          appliedAt: appliedAt ? new Date(appliedAt) : null,
        }),
        ...(resumeVersionId !== undefined && { resumeVersionId }),
        ...(coverLetter !== undefined && { coverLetter }),
        ...(notes !== undefined && { notes }),
      },
      include: {
        job: {
          include: {
            company: { select: { id: true, name: true } },
          },
        },
        resumeVersion: true,
        interviews: {
          orderBy: { scheduledAt: 'asc' },
        },
        tags: {
          include: { tag: { select: { id: true, name: true, color: true } } },
        },
      },
    });

    res.json({ application });
  } catch (error) {
    next(error);
  }
});

export default router;
