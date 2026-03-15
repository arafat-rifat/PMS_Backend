import { z } from 'zod';

export const submitDaySchema = z.object({
  workDate: z.string().date().optional(),
});
