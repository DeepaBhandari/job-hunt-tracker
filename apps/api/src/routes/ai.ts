import { Router } from 'express';
import {
  generateCoverLetter,
  summarizeJobPosting,
  analyzeResumeGap,
  generateInterviewPrep,
} from '../lib/ai.js';
import {
  ParseJobUrlSchema,
  GenerateCoverLetterSchema,
  AnalyzeResumeGapSchema,
  GenerateInterviewPrepSchema,
} from '@job-hunt/types';
import { prisma } from '../lib/prisma.js';
import { requireAuth, getAuthenticatedRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { AppError } from '../middleware/error.js';

const router = Router();

router.use(requireAuth);

router.post('/cover-letter', validate(GenerateCoverLetterSchema), async (req, res, next) => {
  try {
    const { jobId, resumeSummary, tone } = req.body as {
      jobId: string;
      resumeSummary?: string;
      tone?: string;
    };
    const { userId } = getAuthenticatedRequest(req);

    const job = await prisma.job.findFirst({
      where: { id: jobId, userId },
      include: { company: true },
    });

    if (!job) {
      throw new AppError(404, 'Job not found');
    }

    const prompt = [
      `Company: ${job.company.name}`,
      `Title: ${job.title}`,
      job.description ? `Description: ${job.description}` : '',
      job.location ? `Location: ${job.location}` : '',
      job.url ? `Link: ${job.url}` : '',
      resumeSummary ? `Resume summary: ${resumeSummary}` : '',
      tone ? `Tone: ${tone}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    const coverLetter = await generateCoverLetter(prompt);
    res.json({ coverLetter });
  } catch (error) {
    next(error);
  }
});

router.post('/parse-job-url', validate(ParseJobUrlSchema), async (req, res, next) => {
  try {
    const { url } = req.body as { url: string };
    const response = await fetch(url);
    if (!response.ok) {
      throw new AppError(400, 'Unable to fetch job posting');
    }

    const html = await response.text();
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const summary = await summarizeJobPosting(text.slice(0, 20000));
    res.json({ summary, url });
  } catch (error) {
    next(error);
  }
});

router.post('/resume-gap', validate(AnalyzeResumeGapSchema), async (req, res, next) => {
  try {
    const { jobId, resumeText } = req.body as { jobId: string; resumeText: string };
    const { userId } = getAuthenticatedRequest(req);

    const job = await prisma.job.findFirst({
      where: { id: jobId, userId },
      include: { company: true },
    });

    if (!job) {
      throw new AppError(404, 'Job not found');
    }

    const prompt = [
      `Job posting for ${job.title} at ${job.company.name}:`,
      job.description ?? '(no description provided)',
      '',
      'Resume:',
      resumeText,
    ].join('\n');

    const analysis = await analyzeResumeGap(prompt);
    res.json({ analysis });
  } catch (error) {
    next(error);
  }
});

router.post('/interview-prep', validate(GenerateInterviewPrepSchema), async (req, res, next) => {
  try {
    const { applicationId, stage } = req.body as { applicationId: string; stage: string };
    const { userId } = getAuthenticatedRequest(req);

    const application = await prisma.application.findFirst({
      where: { id: applicationId, userId },
      include: { job: { include: { company: true } } },
    });

    if (!application) {
      throw new AppError(404, 'Application not found');
    }

    const prompt = [
      `Role: ${application.job.title} at ${application.job.company.name}`,
      `Interview stage: ${stage}`,
      application.job.description ? `Job description: ${application.job.description}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    const prep = await generateInterviewPrep(prompt);
    res.json({ prep });
  } catch (error) {
    next(error);
  }
});

export default router;
