-- Apply this if your database was created before full PM features.
-- Safe to run multiple times.

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'task_priority') then
    create type task_priority as enum ('LOW', 'MEDIUM', 'HIGH');
  end if;

  if not exists (select 1 from pg_type where typname = 'task_status') then
    create type task_status as enum ('PENDING', 'RUNNING', 'COMPLETED');
  end if;

  if not exists (select 1 from pg_type where typname = 'task_stage') then
    create type task_stage as enum ('STAGE_1', 'STAGE_2', 'COMPLETED');
  end if;
end $$;

create table if not exists public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_task_comments_task on public.task_comments(task_id);
create index if not exists idx_task_comments_user on public.task_comments(user_id);
create index if not exists idx_tasks_status on public.tasks(status);
create index if not exists idx_tasks_due_date on public.tasks(due_date);
create index if not exists idx_todo_user_date_time on public.todo_plans(user_id, planned_date, planned_time);
