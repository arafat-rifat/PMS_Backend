import { z } from 'zod';

const optionalIsoDate = z.preprocess(
  (value) => (value === '' || value === null ? undefined : value),
  z.string().date().optional(),
);

export const createProjectSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  startDate: z.string().date(),
  endDate: optionalIsoDate,
  memberIds: z.array(z.uuid()).default([]),
});

export const updateProjectSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  startDate: optionalIsoDate,
  endDate: optionalIsoDate,
  memberIds: z.array(z.uuid()).optional(),
  isArchived: z.boolean().optional(),
});

export const deleteProjectSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
