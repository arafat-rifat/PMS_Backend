import { z } from 'zod';

export const deleteReasonSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

export const listTrashQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  module: z.string().trim().optional(),
  search: z.string().trim().optional(),
});

export type DeleteReasonInput = z.infer<typeof deleteReasonSchema>;
