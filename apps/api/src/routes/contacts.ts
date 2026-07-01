import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { validate } from '../middleware/validate.js';
import { AppError } from '../middleware/error.js';
import { requireAuth, getAuthenticatedRequest } from '../middleware/auth.js';

const CreateContactSchema = z.object({
  companyId: z.string().cuid(),
  name: z.string().min(1),
  role: z.string().optional(),
  email: z.string().email().optional(),
  linkedinUrl: z.string().url().optional(),
  notes: z.string().optional(),
});

const UpdateContactSchema = CreateContactSchema.omit({ companyId: true }).partial();

const router = Router();

router.use(requireAuth);

async function assertCompanyOwnership(companyId: string, userId: string) {
  const company = await prisma.company.findFirst({
    where: { id: companyId, userId },
  });

  if (!company) {
    throw new AppError(404, 'Company not found');
  }

  return company;
}

// GET all contacts for a company
router.get('/', async (req, res, next) => {
  try {
    const { userId } = getAuthenticatedRequest(req);
    const companyId = req.query.companyId as string | undefined;

    if (companyId) {
      await assertCompanyOwnership(companyId, userId);
    }

    const contacts = await prisma.contact.findMany({
      where: {
        userId,
        ...(companyId ? { companyId } : {}),
      },
      orderBy: { name: 'asc' },
      include: {
        company: { select: { id: true, name: true } },
      },
    });

    res.json({ contacts });
  } catch (error) {
    next(error);
  }
});

// POST create new contact
router.post('/', validate(CreateContactSchema), async (req, res, next) => {
  try {
    const { userId } = getAuthenticatedRequest(req);
    const { companyId, name, role, email, linkedinUrl, notes } = req.body as {
      companyId: string;
      name: string;
      role?: string;
      email?: string;
      linkedinUrl?: string;
      notes?: string;
    };

    await assertCompanyOwnership(companyId, userId);

    const contact = await prisma.contact.create({
      data: {
        companyId,
        userId,
        name,
        role: role ?? null,
        email: email ?? null,
        linkedinUrl: linkedinUrl ?? null,
        notes: notes ?? null,
      },
      include: {
        company: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({ contact });
  } catch (error) {
    next(error);
  }
});

// GET single contact
router.get('/:id', async (req, res, next) => {
  try {
    const { userId } = getAuthenticatedRequest(req);
    const contact = await prisma.contact.findFirst({
      where: { id: req.params.id, userId },
      include: {
        company: { select: { id: true, name: true } },
      },
    });

    if (!contact) {
      throw new AppError(404, 'Contact not found');
    }

    res.json({ contact });
  } catch (error) {
    next(error);
  }
});

// PATCH update contact
router.patch('/:id', validate(UpdateContactSchema), async (req, res, next) => {
  try {
    const { userId } = getAuthenticatedRequest(req);
    const existing = await prisma.contact.findFirst({
      where: { id: req.params.id, userId },
    });

    if (!existing) {
      throw new AppError(404, 'Contact not found');
    }

    const { name, role, email, linkedinUrl, notes } = req.body as {
      name?: string;
      role?: string;
      email?: string;
      linkedinUrl?: string;
      notes?: string;
    };

    const contact = await prisma.contact.update({
      where: { id: existing.id },
      data: {
        ...(name !== undefined && { name }),
        ...(role !== undefined && { role }),
        ...(email !== undefined && { email }),
        ...(linkedinUrl !== undefined && { linkedinUrl }),
        ...(notes !== undefined && { notes }),
      },
      include: {
        company: { select: { id: true, name: true } },
      },
    });

    res.json({ contact });
  } catch (error) {
    next(error);
  }
});

// DELETE contact
router.delete('/:id', async (req, res, next) => {
  try {
    const { userId } = getAuthenticatedRequest(req);
    const contact = await prisma.contact.findFirst({
      where: { id: req.params.id, userId },
    });

    if (!contact) {
      throw new AppError(404, 'Contact not found');
    }

    await prisma.contact.delete({
      where: { id: contact.id },
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
