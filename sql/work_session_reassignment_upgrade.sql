-- Work session enhancement + task reassignment tracking
create extension if not exists pgcrypto;

create table if not exists public.task_reassignment_logs (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  previous_status text not null,
  new_status text not null,
  reassigned_reason text not null,
  reassigned_by uuid not null references public.users(id) on delete cascade,
  reassigned_date timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_task_reassign_task_date on public.task_reassignment_logs(task_id, reassigned_date desc);
create index if not exists idx_task_reassign_user_date on public.task_reassignment_logs(reassigned_by, reassigned_date desc);

alter table public.work_sessions
  alter column status type text;

alter table public.daily_activities
  add column if not exists work_log_note text,
  add column if not exists blocker_reason text,
  add column if not exists progress_percent numeric(5,2),
  add column if not exists carry_forward boolean not null default false,
  add column if not exists cumulative_seconds integer not null default 0,
  add column if not exists reassignment_reason text,
  add column if not exists row_type text not null default 'WORK';

create index if not exists idx_daily_activities_row_type on public.daily_activities(row_type, work_date desc);
