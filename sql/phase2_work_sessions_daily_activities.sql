-- Phase 2 upgrade: work sessions + daily activities consistency
create extension if not exists pgcrypto;

create table if not exists public.work_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete restrict,
  task_id uuid not null references public.tasks(id) on delete restrict,
  todo_id uuid not null references public.todo_plans(id) on delete restrict,
  start_time timestamptz not null,
  stop_time timestamptz,
  duration_seconds integer,
  status text not null default 'RUNNING',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_work_session_time check (stop_time is null or stop_time >= start_time)
);

create unique index if not exists uq_active_session_per_user
  on public.work_sessions(user_id)
  where stop_time is null;

create index if not exists idx_work_sessions_user_start on public.work_sessions(user_id, start_time desc);

create table if not exists public.daily_activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete restrict,
  task_id uuid not null references public.tasks(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete restrict,
  todo_id uuid not null references public.todo_plans(id) on delete restrict,
  start_time timestamptz not null,
  stop_time timestamptz not null,
  total_duration_seconds integer not null default 0,
  work_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_daily_activities_user_date on public.daily_activities(user_id, work_date);
create index if not exists idx_daily_activities_project_date on public.daily_activities(project_id, work_date);

-- Optional if todo_plans.task_id is missing in old schema:
alter table public.todo_plans
  add column if not exists task_id uuid references public.tasks(id) on delete cascade;

create index if not exists idx_todo_task on public.todo_plans(task_id);
