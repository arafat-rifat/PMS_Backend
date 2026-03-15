import { z } from 'zod';

import { TaskPriority, TaskStatus } from '../../constants/enums';

const optionalIsoDate = z.preprocess(
  (value) => (value === '' || value === null ? undefined : value),
  z.string().date().optional(),
);

export const createTaskSchema = z.object({
  projectId: z.uuid(),
  title: z.string().min(2),
  description: z.string().optional(),
  assignedTo: z.uuid().optional(),
  priority: z.nativeEnum(TaskPriority).default(TaskPriority.MEDIUM),
  dueDate: optionalIsoDate,
  status: z.nativeEnum(TaskStatus).default(TaskStatus.PENDING),
  comment: z.string().min(1).max(2000).optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().optional(),
  assignedTo: z.union([z.uuid(), z.null()]).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  dueDate: optionalIsoDate,
  status: z.nativeEnum(TaskStatus).optional(),
  comment: z.string().min(1).max(2000).optional(),
  reassignedReason: z.string().trim().min(3).max(1000).optional(),
});

export const deleteTaskSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

export const createTaskCommentSchema = z.object({
  body: z.string().min(1).max(2000),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type CreateTaskCommentInput = z.infer<typeof createTaskCommentSchema>;
