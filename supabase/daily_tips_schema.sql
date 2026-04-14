create extension if not exists pgcrypto;

create table if not exists public.daily_tips (
  id uuid primary key default gen_random_uuid(),
  title text,
  text text not null,
  category text not null default 'money',
  audience text not null default 'all',
  status text not null default 'inactive',
  source text not null default 'admin',
  scheduled_date date,
  approved_by text,
  created_by text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint daily_tips_status_check check (status in ('active', 'inactive', 'pending', 'approved', 'rejected')),
  constraint daily_tips_source_check check (source in ('admin', 'student'))
);

create index if not exists daily_tips_source_status_idx
  on public.daily_tips (source, status, scheduled_date desc, updated_at desc);

create or replace function public.set_daily_tips_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_daily_tips_updated_at on public.daily_tips;

create trigger trg_daily_tips_updated_at
before update on public.daily_tips
for each row
execute function public.set_daily_tips_updated_at();

alter table public.daily_tips enable row level security;

drop policy if exists "daily_tips_read_all" on public.daily_tips;
create policy "daily_tips_read_all"
on public.daily_tips
for select
to authenticated
using (true);

drop policy if exists "daily_tips_insert_authenticated" on public.daily_tips;
create policy "daily_tips_insert_authenticated"
on public.daily_tips
for insert
to authenticated
with check (true);

drop policy if exists "daily_tips_update_authenticated" on public.daily_tips;
create policy "daily_tips_update_authenticated"
on public.daily_tips
for update
to authenticated
using (true)
with check (true);

drop policy if exists "daily_tips_delete_authenticated" on public.daily_tips;
create policy "daily_tips_delete_authenticated"
on public.daily_tips
for delete
to authenticated
using (true);
