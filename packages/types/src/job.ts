import { z } from 'zod';

export const JobTypeEnum = z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'REMOTE']);

export const CreateJobSchema = z.object({
  companyId: z.string().cuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  url: z.string().url().optional().or(z.literal('')),
  salaryMin: z.number().int().positive().optional(),
  salaryMax: z.number().int().positive().optional(),
  location: z.string().optional(),
  type: JobTypeEnum.optional(),
  source: z.string().optional(),
});

export const UpdateJobSchema = CreateJobSchema.omit({ companyId: true }).partial();

export type CreateJobInput = z.infer<typeof CreateJobSchema>;
export type UpdateJobInput = z.infer<typeof UpdateJobSchema>;
export type JobType = z.infer<typeof JobTypeEnum>;
