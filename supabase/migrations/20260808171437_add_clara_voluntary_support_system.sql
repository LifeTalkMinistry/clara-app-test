create table if not exists public.support_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tier text not null check (tier in ('supporter', 'builder', 'champion', 'custom')),
  amount_php numeric(10,2) not null check (amount_php > 0),
  payment_provider text not null default 'google_play',
  product_id text,
  provider_order_id text,
  payment_date timestamptz not null,
  support_start_at timestamptz not null,
  support_expires_at timestamptz not null,
  renewal_at timestamptz,
  status text not null check (status in ('active', 'pending', 'expired', 'cancelled', 'inactive')),
  custom_amount_php numeric(10,2),
  provider_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint support_dates_valid check (support_expires_at >= support_start_at),
  constraint support_custom_amount_valid check (
    (tier = 'custom' and custom_amount_php is not null and custom_amount_php > 0)
    or (tier <> 'custom' and custom_amount_php is null)
  )
);

create index if not exists support_subscriptions_user_expiry_idx
  on public.support_subscriptions (user_id, support_expires_at desc);

create index if not exists support_subscriptions_active_champion_idx
  on public.support_subscriptions (support_expires_at desc)
  where tier = 'champion' and status = 'active';

create unique index if not exists support_subscriptions_provider_order_unique
  on public.support_subscriptions (payment_provider, provider_order_id)
  where provider_order_id is not null;

alter table public.support_subscriptions enable row level security;

drop policy if exists "Users can read own support state" on public.support_subscriptions;
create policy "Users can read own support state"
  on public.support_subscriptions
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.support_subscriptions from anon;
revoke insert, update, delete on table public.support_subscriptions from authenticated;
grant select on table public.support_subscriptions to authenticated;

create table if not exists public.support_program_config (
  id text primary key default 'default' check (id = 'default'),
  champion_slot_cap integer check (champion_slot_cap is null or champion_slot_cap > 0),
  champion_slots_used integer not null default 0 check (champion_slots_used >= 0),
  updated_at timestamptz not null default now()
);

insert into public.support_program_config (id, champion_slot_cap, champion_slots_used)
values ('default', null, 0)
on conflict (id) do nothing;

alter table public.support_program_config enable row level security;

drop policy if exists "Signed in users can read support capacity" on public.support_program_config;
create policy "Signed in users can read support capacity"
  on public.support_program_config
  for select
  to authenticated
  using (true);

revoke all on table public.support_program_config from anon;
revoke insert, update, delete on table public.support_program_config from authenticated;
grant select on table public.support_program_config to authenticated;

comment on table public.support_subscriptions is 'Voluntary CLARA support cycles. These records must never be used to gate core app features.';
comment on table public.support_program_config is 'Optional support-program capacity controls. Champion cap stays NULL until explicitly enabled.';
