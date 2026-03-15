-- Schema repair migration generated from backend code audit
-- Safe to run multiple times.

create extension if not exists pgcrypto;

-- 1) Enum types used by tasks/users
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('ADMIN', 'MEMBER');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_priority') THEN
    CREATE TYPE task_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status') THEN
    CREATE TYPE task_status AS ENUM ('PENDING', 'RUNNING', 'COMPLETED');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_stage') THEN
    CREATE TYPE task_stage AS ENUM ('STAGE_1', 'STAGE_2', 'COMPLETED');
  END IF;
END $$;

-- 2) Core tables
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text UNIQUE NOT NULL,
  password_hash text,
  role user_role NOT NULL DEFAULT 'MEMBER',
  refresh_token_hash text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS password_hash text,
  ADD COLUMN IF NOT EXISTS refresh_token_hash text,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_idx ON public.users(email);

CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  start_date date NOT NULL,
  end_date date,
  created_by uuid NOT NULL REFERENCES public.users(id),
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS public.project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  assigned_to uuid REFERENCES public.users(id) ON DELETE SET NULL,
  priority task_priority NOT NULL DEFAULT 'MEDIUM',
  due_date date,
  status task_status NOT NULL DEFAULT 'PENDING',
  stage task_stage NOT NULL DEFAULT 'STAGE_1',
  created_by uuid NOT NULL REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS stage task_stage NOT NULL DEFAULT 'STAGE_1',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS public.todo_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  title text NOT NULL,
  planned_date date NOT NULL,
  planned_time time NOT NULL,
  priority task_priority NOT NULL DEFAULT 'MEDIUM',
  is_done boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.todo_plans
  ADD COLUMN IF NOT EXISTS task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.todo_plans
SET title = COALESCE(title, 'Untitled')
WHERE title IS NULL;

ALTER TABLE public.todo_plans
  ALTER COLUMN title SET NOT NULL;

CREATE TABLE IF NOT EXISTS public.task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.work_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE RESTRICT,
  todo_id uuid NOT NULL REFERENCES public.todo_plans(id) ON DELETE RESTRICT,
  start_time timestamptz NOT NULL,
  stop_time timestamptz,
  duration_seconds integer,
  status text NOT NULL DEFAULT 'RUNNING',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.work_sessions
  ADD COLUMN IF NOT EXISTS duration_seconds integer,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'RUNNING',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Optional compatibility aliases for external reporting names
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'work_sessions' AND column_name = 'total_duration'
  ) THEN
    ALTER TABLE public.work_sessions
      ADD COLUMN total_duration integer GENERATED ALWAYS AS (duration_seconds) STORED;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'work_sessions' AND column_name = 'session_status'
  ) THEN
    ALTER TABLE public.work_sessions
      ADD COLUMN session_status text GENERATED ALWAYS AS (status) STORED;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.daily_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE RESTRICT,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
  todo_id uuid NOT NULL REFERENCES public.todo_plans(id) ON DELETE RESTRICT,
  start_time timestamptz NOT NULL,
  stop_time timestamptz NOT NULL,
  total_duration_seconds integer NOT NULL DEFAULT 0,
  work_date date NOT NULL,
  work_log_note text,
  blocker_reason text,
  progress_percent numeric(5,2),
  carry_forward boolean NOT NULL DEFAULT false,
  cumulative_seconds integer NOT NULL DEFAULT 0,
  reassignment_reason text,
  row_type text NOT NULL DEFAULT 'WORK',
  submitted boolean NOT NULL DEFAULT false,
  submission_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_activities
  ADD COLUMN IF NOT EXISTS work_log_note text,
  ADD COLUMN IF NOT EXISTS blocker_reason text,
  ADD COLUMN IF NOT EXISTS progress_percent numeric(5,2),
  ADD COLUMN IF NOT EXISTS carry_forward boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cumulative_seconds integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reassignment_reason text,
  ADD COLUMN IF NOT EXISTS row_type text NOT NULL DEFAULT 'WORK',
  ADD COLUMN IF NOT EXISTS submitted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS submission_id uuid,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS public.daily_activity_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  work_date date NOT NULL,
  total_duration_seconds integer NOT NULL DEFAULT 0,
  entry_count integer NOT NULL DEFAULT 0,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.task_reassignment_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  previous_status text NOT NULL,
  new_status text NOT NULL,
  reassigned_reason text NOT NULL,
  reassigned_by uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reassigned_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.deleted_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_name text NOT NULL,
  entity_id uuid,
  entity_name text,
  reason text NOT NULL,
  deleted_by uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  deleted_at timestamptz NOT NULL DEFAULT now(),
  purge_at timestamptz NOT NULL DEFAULT (now() + interval '1 month'),
  payload jsonb
);

-- 3) Indexes used by backend query patterns
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON public.projects(created_by);
CREATE INDEX IF NOT EXISTS idx_project_members_project ON public.project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON public.project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_stage ON public.tasks(stage);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_todo_user_date_time ON public.todo_plans(user_id, planned_date, planned_time);
CREATE INDEX IF NOT EXISTS idx_todo_task ON public.todo_plans(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_task ON public.task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_user ON public.task_comments(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_session_per_user ON public.work_sessions(user_id) WHERE stop_time IS NULL;
CREATE INDEX IF NOT EXISTS idx_work_sessions_user_start ON public.work_sessions(user_id, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_daily_activities_user_date ON public.daily_activities(user_id, work_date);
CREATE INDEX IF NOT EXISTS idx_daily_activities_project_date ON public.daily_activities(project_id, work_date);
CREATE INDEX IF NOT EXISTS idx_daily_activities_submitted ON public.daily_activities(submitted, user_id, work_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_activities_row_type ON public.daily_activities(row_type, work_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_activity_submissions_user_date ON public.daily_activity_submissions(user_id, work_date DESC);
CREATE INDEX IF NOT EXISTS idx_task_reassign_task_date ON public.task_reassignment_logs(task_id, reassigned_date DESC);
CREATE INDEX IF NOT EXISTS idx_task_reassign_user_date ON public.task_reassignment_logs(reassigned_by, reassigned_date DESC);
CREATE INDEX IF NOT EXISTS idx_deleted_items_deleted_at ON public.deleted_items(deleted_at DESC);
CREATE INDEX IF NOT EXISTS idx_deleted_items_purge_at ON public.deleted_items(purge_at);
CREATE INDEX IF NOT EXISTS idx_deleted_items_module_name ON public.deleted_items(module_name);
CREATE INDEX IF NOT EXISTS idx_deleted_items_deleted_by ON public.deleted_items(deleted_by);
