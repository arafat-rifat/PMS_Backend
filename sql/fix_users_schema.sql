-- Run this in Supabase SQL Editor if /auth/register returns 500
-- Aligns users table with backend custom auth model.

create extension if not exists pgcrypto;

do $$
begin
  if not exists (
    select 1 from pg_type t where t.typname = 'user_role'
  ) then
    create type user_role as enum ('ADMIN', 'MEMBER');
  end if;
end $$;

-- Drop FK to auth.users if it exists (custom auth does not require auth.users rows)
do $$
declare fk_name text;
begin
  select c.conname
  into fk_name
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relname = 'users'
    and c.contype = 'f'
    and c.confrelid = 'auth.users'::regclass
  limit 1;

  if fk_name is not null then
    execute format('alter table public.users drop constraint %I', fk_name);
  end if;
end $$;

alter table public.users
  alter column id drop default;

alter table public.users
  alter column id set default gen_random_uuid();

alter table public.users
  add column if not exists password_hash text,
  add column if not exists refresh_token_hash text,
  add column if not exists is_active boolean default true,
  add column if not exists updated_at timestamptz default now();

update public.users
set is_active = true
where is_active is null;

alter table public.users
  alter column role type user_role using role::text::user_role,
  alter column role set default 'MEMBER',
  alter column is_active set not null;

create unique index if not exists users_email_unique_idx on public.users(email);
