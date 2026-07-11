import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/error.js';
import { saveResumeFile } from '../lib/storage.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const router = Router();

router.use(requireAuth);

router.post('/', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError(400, 'A resume file is required');
    }

    const filePath = await saveResumeFile(req.file.buffer, req.file.originalname);
    res.json({ filePath });
  } catch (error) {
    next(error);
  }
});

export default router;
