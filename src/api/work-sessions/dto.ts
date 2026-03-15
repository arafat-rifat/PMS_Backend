import { z } from 'zod';

const blockerReasons = ['waiting_client', 'dependency_blocked', 'review_pending', 'technical_issue', 'work_not_finished', 'none'] as const;

const sessionLogSchema = z.object({
  workLogNote: z.string().trim().min(10).max(3000),
  blockerReason: z.enum(blockerReasons).optional(),
  progressPercent: z.number().min(0).max(100).optional(),
});

export const startWorkSchema = z.object({
  todoId: z.uuid(),
});

export const pauseWorkSchema = sessionLogSchema;

export const completeWorkSchema = sessionLogSchema.extend({
  progressPercent: z.number().min(0).max(100).optional().default(100),
});

// Backward-compatible payload used by existing /stop endpoint.
export const stopWorkSchema = z.object({
  markTaskCompleted: z.boolean().optional().default(false),
  workLogNote: z.string().trim().min(10).max(3000),
  blockerReason: z.enum(blockerReasons).optional(),
  progressPercent: z.number().min(0).max(100).optional(),
});

export type StartWorkInput = z.infer<typeof startWorkSchema>;
export type PauseWorkInput = z.infer<typeof pauseWorkSchema>;
export type CompleteWorkInput = z.infer<typeof completeWorkSchema>;
export type StopWorkInput = z.infer<typeof stopWorkSchema>;

