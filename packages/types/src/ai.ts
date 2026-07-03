import { z } from 'zod';

export const GenerateCoverLetterSchema = z.object({
  jobId: z.string().cuid(),
  resumeSummary: z.string().optional(),
  tone: z.string().optional(),
});

export const ParseJobUrlSchema = z.object({
  url: z.string().url(),
});

export type GenerateCoverLetterInput = z.infer<typeof GenerateCoverLetterSchema>;
export type ParseJobUrlInput = z.infer<typeof ParseJobUrlSchema>;
