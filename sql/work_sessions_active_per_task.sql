-- Allow multiple active sessions per user, but only one active session per task.

DROP INDEX IF EXISTS public.uq_active_session_per_user;

CREATE UNIQUE INDEX IF NOT EXISTS uq_active_session_per_user_task
  ON public.work_sessions(user_id, task_id)
  WHERE stop_time IS NULL;
