-- CLARA iPhone/PWA access-code authority.
-- Codes are generated inside Postgres during migration so the live values are
-- never committed to the public repository.

create extension if not exists pgcrypto;

create table if not exists public.clara_ios_access_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^CLARA-[A-F0-9]{6}$'),
  enabled boolean not null default true,
  activated_by_user_id text,
  activated_by_name text,
  activated_by_email text,
  activated_at timestamptz,
  access_duration_days integer not null default 30 check (access_duration_days > 0),
  expires_at timestamptz,
  revoked_at timestamptz,
  admin_note text not null default '',
  access_token_hash text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clara_ios_access_activation_dates_check check (
    (activated_at is null and expires_at is null)
    or (activated_at is not null and expires_at is not null and expires_at > activated_at)
  )
);

create index if not exists clara_ios_access_codes_user_idx
  on public.clara_ios_access_codes (activated_by_user_id)
  where activated_by_user_id is not null;

create index if not exists clara_ios_access_codes_expiry_idx
  on public.clara_ios_access_codes (expires_at)
  where expires_at is not null;

create or replace function public.set_clara_ios_access_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_clara_ios_access_updated_at on public.clara_ios_access_codes;
create trigger set_clara_ios_access_updated_at
before update on public.clara_ios_access_codes
for each row execute function public.set_clara_ios_access_updated_at();

alter table public.clara_ios_access_codes enable row level security;

-- Ordinary clients cannot list or mutate this table. The Edge Function uses the
-- service role and exposes only narrowly scoped validate/redeem/admin actions.
revoke all on table public.clara_ios_access_codes from anon, authenticated;

drop policy if exists "deny anonymous access to clara ios codes"
  on public.clara_ios_access_codes;
create policy "deny anonymous access to clara ios codes"
  on public.clara_ios_access_codes
  for all
  to anon
  using (false)
  with check (false);

drop policy if exists "deny authenticated access to clara ios codes"
  on public.clara_ios_access_codes;
create policy "deny authenticated access to clara ios codes"
  on public.clara_ios_access_codes
  for all
  to authenticated
  using (false)
  with check (false);

-- Seed exactly 20 persistent codes once. Existing records are never regenerated
-- during app loads or deployments.
do $$
declare
  records_needed integer;
  candidate text;
  inserted_count integer;
begin
  select greatest(20 - count(*), 0)
    into records_needed
    from public.clara_ios_access_codes;

  while records_needed > 0 loop
    candidate := 'CLARA-' || upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6));

    insert into public.clara_ios_access_codes (code)
    values (candidate)
    on conflict (code) do nothing;

    get diagnostics inserted_count = row_count;
    if inserted_count = 1 then
      records_needed := records_needed - 1;
    end if;
  end loop;
end;
$$;
