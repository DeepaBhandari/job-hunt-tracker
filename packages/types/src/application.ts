import { z } from 'zod';

export const ApplicationStatusEnum = z.enum([
  'SAVED',
  'APPLIED',
  'SCREENING',
  'INTERVIEW',
  'OFFER',
  'REJECTED',
  'WITHDRAWN',
]);

export const CreateApplicationSchema = z.object({
  jobId: z.string().cuid(),
  status: ApplicationStatusEnum.default('SAVED'),
  appliedAt: z.string().datetime().optional(),
  resumeVersionId: z.string().cuid().optional(),
  coverLetter: z.string().optional(),
  notes: z.string().optional(),
});

export const UpdateApplicationSchema = CreateApplicationSchema.omit({ jobId: true }).partial();

export type CreateApplicationInput = z.infer<typeof CreateApplicationSchema>;
export type UpdateApplicationInput = z.infer<typeof UpdateApplicationSchema>;
export type ApplicationStatus = z.infer<typeof ApplicationStatusEnum>;
