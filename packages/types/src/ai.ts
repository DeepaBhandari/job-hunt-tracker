import { z } from 'zod';

export const GenerateCoverLetterSchema = z.object({
  jobId: z.string().cuid(),
  resumeSummary: z.string().optional(),
  tone: z.string().optional(),
});

export const ParseJobUrlSchema = z.object({
  url: z.string().url(),
});

export const AnalyzeResumeGapSchema = z.object({
  jobId: z.string().cuid(),
  resumeText: z.string().min(1),
});

export const GenerateInterviewPrepSchema = z.object({
  applicationId: z.string().cuid(),
  stage: z.enum(['PHONE', 'VIDEO', 'TECHNICAL', 'ONSITE', 'HR']),
});

export type GenerateCoverLetterInput = z.infer<typeof GenerateCoverLetterSchema>;
export type ParseJobUrlInput = z.infer<typeof ParseJobUrlSchema>;
export type AnalyzeResumeGapInput = z.infer<typeof AnalyzeResumeGapSchema>;
export type GenerateInterviewPrepInput = z.infer<typeof GenerateInterviewPrepSchema>;
