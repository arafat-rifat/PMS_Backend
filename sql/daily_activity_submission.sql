-- Daily activity final submission flow
create extension if not exists pgcrypto;

create table if not exists public.daily_activity_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  work_date date not null,
  total_duration_seconds integer not null default 0,
  entry_count integer not null default 0,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_daily_activity_submissions_user_date
  on public.daily_activity_submissions(user_id, work_date desc);

alter table public.daily_activities
  add column if not exists submitted boolean not null default false;

alter table public.daily_activities
  add column if not exists submission_id uuid references public.daily_activity_submissions(id) on delete set null;

create index if not exists idx_daily_activities_submitted
  on public.daily_activities(submitted, user_id, work_date desc);
