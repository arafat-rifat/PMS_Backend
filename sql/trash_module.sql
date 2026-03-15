-- Trash module for delete audit and 1-month retention
create extension if not exists pgcrypto;

create table if not exists public.deleted_items (
  id uuid primary key default gen_random_uuid(),
  module_name text not null,
  entity_id uuid,
  entity_name text,
  reason text not null,
  deleted_by uuid not null references public.users(id) on delete cascade,
  deleted_at timestamptz not null default now(),
  purge_at timestamptz not null default (now() + interval '1 month'),
  payload jsonb
);

create index if not exists idx_deleted_items_deleted_at on public.deleted_items (deleted_at desc);
create index if not exists idx_deleted_items_purge_at on public.deleted_items (purge_at);
create index if not exists idx_deleted_items_module_name on public.deleted_items (module_name);
create index if not exists idx_deleted_items_deleted_by on public.deleted_items (deleted_by);
