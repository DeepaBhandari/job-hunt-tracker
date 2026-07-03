import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, getAuthenticatedRequest } from '../middleware/auth.js';
import { presignResumeUpload } from '../lib/s3.js';

const router = Router();

const PresignResumeSchema = z.object({
  key: z.string().min(1),
  contentType: z.string().min(1),
});

router.use(requireAuth);

router.post('/', async (req, res, next) => {
  try {
    const body = PresignResumeSchema.parse(req.body);
    const url = await presignResumeUpload(body.key, body.contentType);
    res.json({ uploadUrl: url, key: body.key });
  } catch (error) {
    next(error);
  }
});

export default router;
