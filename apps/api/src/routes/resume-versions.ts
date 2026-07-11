import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { validate } from '../middleware/validate.js';
import { AppError } from '../middleware/error.js';
import { requireAuth, getAuthenticatedRequest } from '../middleware/auth.js';
import { deleteResumeFile, resolveResumeFilePath } from '../lib/storage.js';

const CreateResumeVersionSchema = z.object({
  label: z.string().min(1),
  filePath: z.string().min(1),
});

const router = Router();

router.use(requireAuth);

// GET all resume versions for user
router.get('/', async (req, res, next) => {
  try {
    const { userId } = getAuthenticatedRequest(req);

    const resumeVersions = await prisma.resumeVersion.findMany({
      where: { userId },
      orderBy: { uploadedAt: 'desc' },
    });

    res.json({ resumeVersions });
  } catch (error) {
    next(error);
  }
});

// POST create new resume version
router.post('/', validate(CreateResumeVersionSchema), async (req, res, next) => {
  try {
    const { userId } = getAuthenticatedRequest(req);
    const { label, filePath } = req.body as {
      label: string;
      filePath: string;
    };

    const resumeVersion = await prisma.resumeVersion.create({
      data: {
        userId,
        label,
        filePath,
      },
    });

    res.status(201).json({ resumeVersion });
  } catch (error) {
    next(error);
  }
});

// GET single resume version
router.get('/:id', async (req, res, next) => {
  try {
    const { userId } = getAuthenticatedRequest(req);
    const resumeVersion = await prisma.resumeVersion.findFirst({
      where: { id: req.params.id, userId },
    });

    if (!resumeVersion) {
      throw new AppError(404, 'Resume version not found');
    }

    res.json({ resumeVersion });
  } catch (error) {
    next(error);
  }
});

// GET download the resume file
router.get('/:id/file', async (req, res, next) => {
  try {
    const { userId } = getAuthenticatedRequest(req);
    const resumeVersion = await prisma.resumeVersion.findFirst({
      where: { id: req.params.id, userId },
    });

    if (!resumeVersion) {
      throw new AppError(404, 'Resume version not found');
    }

    res.download(resolveResumeFilePath(resumeVersion.filePath));
  } catch (error) {
    next(error);
  }
});

// PATCH update resume version label
router.patch('/:id', async (req, res, next) => {
  try {
    const { userId } = getAuthenticatedRequest(req);
    const resumeVersion = await prisma.resumeVersion.findFirst({
      where: { id: req.params.id, userId },
    });

    if (!resumeVersion) {
      throw new AppError(404, 'Resume version not found');
    }

    const { label } = req.body as { label?: string };

    if (!label) {
      throw new AppError(400, 'Label is required');
    }

    const updated = await prisma.resumeVersion.update({
      where: { id: resumeVersion.id },
      data: { label },
    });

    res.json({ resumeVersion: updated });
  } catch (error) {
    next(error);
  }
});

// DELETE resume version
router.delete('/:id', async (req, res, next) => {
  try {
    const { userId } = getAuthenticatedRequest(req);
    const resumeVersion = await prisma.resumeVersion.findFirst({
      where: { id: req.params.id, userId },
    });

    if (!resumeVersion) {
      throw new AppError(404, 'Resume version not found');
    }

    // Check if any applications use this resume
    const applicationsUsingResume = await prisma.application.findMany({
      where: { resumeVersionId: resumeVersion.id },
    });

    if (applicationsUsingResume.length > 0) {
      throw new AppError(400, 'Cannot delete resume version in use by applications');
    }

    await prisma.resumeVersion.delete({
      where: { id: resumeVersion.id },
    });
    await deleteResumeFile(resumeVersion.filePath);

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
