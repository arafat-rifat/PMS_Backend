import { z } from 'zod';

import { TaskPriority } from '../../constants/enums';

export const createTodoSchema = z.object({
  taskId: z.uuid(),
  plannedDate: z.string().date(),
  plannedTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  priority: z.nativeEnum(TaskPriority).default(TaskPriority.MEDIUM),
});

export const updateTodoSchema = z.object({
  taskId: z.uuid().optional(),
  plannedDate: z.string().date().optional(),
  plannedTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  isDone: z.boolean().optional(),
});

export const deleteTodoSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

export type CreateTodoInput = z.infer<typeof createTodoSchema>;
export type UpdateTodoInput = z.infer<typeof updateTodoSchema>;
