-- Backend schema for custom JWT auth + project management
create extension if not exists pgcrypto;

create type user_role as enum ('ADMIN', 'MEMBER');
create type task_priority as enum ('LOW', 'MEDIUM', 'HIGH');
create type task_status as enum ('PENDING', 'RUNNING', 'COMPLETED');
create type task_stage as enum ('STAGE_1', 'STAGE_2', 'COMPLETED');

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text unique not null,
  password_hash text not null,
  role user_role not null default 'MEMBER',
  refresh_token_hash text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  start_date date not null,
  end_date date,
  created_by uuid not null references public.users(id),
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_project_dates check (end_date is null or end_date >= start_date)
);

create table if not exists public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique(project_id, user_id)
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  assigned_to uuid references public.users(id) on delete set null,
  priority task_priority not null default 'MEDIUM',
  due_date date,
  status task_status not null default 'PENDING',
  stage task_stage not null default 'STAGE_1',
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.todo_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  planned_date date not null,
  planned_time time not null,
  priority task_priority not null default 'MEDIUM',
  is_done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  uploaded_by uuid not null references public.users(id),
  file_name text not null,
  file_path text not null,
  file_size bigint,
  mime_type text,
  created_at timestamptz not null default now()
);

create index if not exists idx_projects_created_by on public.projects(created_by);
create index if not exists idx_project_members_project on public.project_members(project_id);
create index if not exists idx_project_members_user on public.project_members(user_id);
create index if not exists idx_tasks_project on public.tasks(project_id);
create index if not exists idx_tasks_assigned_to on public.tasks(assigned_to);
create index if not exists idx_tasks_status on public.tasks(status);
create index if not exists idx_tasks_stage on public.tasks(stage);
create index if not exists idx_tasks_due_date on public.tasks(due_date);
create index if not exists idx_todo_user_date_time on public.todo_plans(user_id, planned_date, planned_time);

-- Optional: seed first admin user (password hash should be bcrypt hash)
-- insert into public.users (full_name, email, password_hash, role)
-- values ('System Admin', 'admin@example.com', '<bcrypt_hash_here>', 'ADMIN');
