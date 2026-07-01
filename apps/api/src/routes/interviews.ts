import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { validate } from '../middleware/validate.js';
import { AppError } from '../middleware/error.js';
import { requireAuth, getAuthenticatedRequest } from '../middleware/auth.js';

const CreateInterviewSchema = z.object({
  applicationId: z.string().cuid(),
  scheduledAt: z.string().datetime(),
  type: z.enum(['PHONE', 'VIDEO', 'TECHNICAL', 'ONSITE', 'HR']),
  interviewerName: z.string().optional(),
  notes: z.string().optional(),
});

const UpdateInterviewSchema = CreateInterviewSchema.omit({
  applicationId: true,
})
  .partial()
  .extend({
    outcome: z.string().optional(),
  });

const router = Router();

router.use(requireAuth);

async function assertApplicationOwnership(applicationId: string, userId: string) {
  const application = await prisma.application.findFirst({
    where: { id: applicationId, userId },
  });

  if (!application) {
    throw new AppError(404, 'Application not found');
  }

  return application;
}

// GET all interviews for an application
router.get('/by-application/:applicationId', async (req, res, next) => {
  try {
    const { userId } = getAuthenticatedRequest(req);
    const { applicationId } = req.params;

    await assertApplicationOwnership(applicationId, userId);

    const interviews = await prisma.interview.findMany({
      where: { applicationId },
      orderBy: { scheduledAt: 'asc' },
    });

    res.json({ interviews });
  } catch (error) {
    next(error);
  }
});

// POST create new interview
router.post('/', validate(CreateInterviewSchema), async (req, res, next) => {
  try {
    const { userId } = getAuthenticatedRequest(req);
    const { applicationId, scheduledAt, type, interviewerName, notes } = req.body as {
      applicationId: string;
      scheduledAt: string;
      type: string;
      interviewerName?: string;
      notes?: string;
    };

    await assertApplicationOwnership(applicationId, userId);

    const interview = await prisma.interview.create({
      data: {
        applicationId,
        scheduledAt: new Date(scheduledAt),
        type: type as never,
        interviewerName: interviewerName ?? null,
        notes: notes ?? null,
      },
    });

    res.status(201).json({ interview });
  } catch (error) {
    next(error);
  }
});

// GET single interview
router.get('/:id', async (req, res, next) => {
  try {
    const { userId } = getAuthenticatedRequest(req);
    const interview = await prisma.interview.findUnique({
      where: { id: req.params.id },
    });

    if (!interview) {
      throw new AppError(404, 'Interview not found');
    }

    // Verify user owns the application
    const application = await prisma.application.findFirst({
      where: { id: interview.applicationId, userId },
    });

    if (!application) {
      throw new AppError(403, 'Unauthorized');
    }

    res.json({ interview });
  } catch (error) {
    next(error);
  }
});

// PATCH update interview
router.patch('/:id', validate(UpdateInterviewSchema), async (req, res, next) => {
  try {
    const { userId } = getAuthenticatedRequest(req);
    const interview = await prisma.interview.findUnique({
      where: { id: req.params.id },
    });

    if (!interview) {
      throw new AppError(404, 'Interview not found');
    }

    // Verify user owns the application
    const application = await prisma.application.findFirst({
      where: { id: interview.applicationId, userId },
    });

    if (!application) {
      throw new AppError(403, 'Unauthorized');
    }

    const { scheduledAt, type, interviewerName, notes, outcome } = req.body as {
      scheduledAt?: string;
      type?: string;
      interviewerName?: string;
      notes?: string;
      outcome?: string;
    };

    const updated = await prisma.interview.update({
      where: { id: interview.id },
      data: {
        ...(scheduledAt !== undefined && {
          scheduledAt: new Date(scheduledAt),
        }),
        ...(type !== undefined && { type: type as never }),
        ...(interviewerName !== undefined && { interviewerName }),
        ...(notes !== undefined && { notes }),
        ...(outcome !== undefined && { outcome }),
      },
    });

    res.json({ interview: updated });
  } catch (error) {
    next(error);
  }
});

// DELETE interview
router.delete('/:id', async (req, res, next) => {
  try {
    const { userId } = getAuthenticatedRequest(req);
    const interview = await prisma.interview.findUnique({
      where: { id: req.params.id },
    });

    if (!interview) {
      throw new AppError(404, 'Interview not found');
    }

    // Verify user owns the application
    const application = await prisma.application.findFirst({
      where: { id: interview.applicationId, userId },
    });

    if (!application) {
      throw new AppError(403, 'Unauthorized');
    }

    await prisma.interview.delete({
      where: { id: interview.id },
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
