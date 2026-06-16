create extension if not exists pgcrypto;

alter table if exists public.profiles
  add column if not exists tier_type text,
  add column if not exists plan_key text,
  add column if not exists subscription_plan text,
  add column if not exists access_level text default 'free',
  add column if not exists purchase_source text,
  add column if not exists enrollment_source text,
  add column if not exists access_source text,
  add column if not exists admin_plan_override boolean not null default false,
  add column if not exists subscription_status text default 'free',
  add column if not exists subscription_expires_at timestamptz,
  add column if not exists trial_started_at timestamptz,
  add column if not exists trial_ends_at timestamptz,
  add column if not exists play_product_id text,
  add column if not exists play_purchase_token text,
  add column if not exists recommended_access_level text,
  add column if not exists onboarding_answers jsonb,
  add column if not exists program_started_at timestamptz,
  add column if not exists program_ends_at timestamptz,
  add column if not exists program_completed_at timestamptz,
  add column if not exists continuation_pro_starts_at timestamptz,
  add column if not exists continuation_pro_ends_at timestamptz,
  add column if not exists pro_subscription_status text default 'inactive',
  add column if not exists pro_subscription_expires_at timestamptz,
  add column if not exists coaching_credits_total integer not null default 0,
  add column if not exists coaching_credits_used integer not null default 0,
  add column if not exists coaching_credits_remaining integer generated always as (greatest(0, coaching_credits_total - coaching_credits_used)) stored,
  add column if not exists entitlement_status text default 'free',
  add column if not exists last_billing_sync_at timestamptz,
  add column if not exists challenge_started boolean not null default false,
  add column if not exists challenge_started_at timestamptz,
  add column if not exists challenge_local_start_date date,
  add column if not exists active_day_number integer not null default 0,
  add column if not exists current_day_unlocked_at timestamptz,
  add column if not exists current_day_status text not null default 'not_started',
  add column if not exists last_day_completed integer not null default 0,
  add column if not exists highest_completed_tier integer not null default 0,
  add column if not exists has_completed_program_tier_599 boolean not null default false,
  add column if not exists has_completed_coaching_tier_1299 boolean not null default false,
  add column if not exists account_deletion_requested_at timestamptz,
  add column if not exists account_deletion_status text;

alter table if exists public.enrollments
  add column if not exists tier_type text,
  add column if not exists purchase_source text,
  add column if not exists play_product_id text,
  add column if not exists play_purchase_token text,
  add column if not exists purchase_payload jsonb,
  add column if not exists last_billing_sync_at timestamptz;

alter table if exists public.plans
  add column if not exists access_config jsonb,
  add column if not exists product_id text,
  add column if not exists billing_type text;

create unique index if not exists plans_plan_key_unique
  on public.plans(plan_key);

alter table if exists public.user_programs
  alter column program_start_date drop not null;

alter table if exists public.user_programs
  add column if not exists program_started_at timestamptz,
  add column if not exists program_ends_at timestamptz,
  add column if not exists program_completed_at timestamptz,
  add column if not exists challenge_started boolean not null default false,
  add column if not exists challenge_started_at timestamptz,
  add column if not exists challenge_local_start_date date,
  add column if not exists challenge_timezone text not null default 'Asia/Manila',
  add column if not exists active_day_number integer not null default 0,
  add column if not exists current_day_unlocked_at timestamptz,
  add column if not exists current_day_status text not null default 'not_started',
  add column if not exists last_day_completed integer not null default 0;

alter table if exists public.task_submissions
  add column if not exists reflection text,
  add column if not exists status text default 'submitted';

create table if not exists public.google_play_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  plan_key text not null,
  tier_type text not null,
  product_id text not null,
  purchase_token text not null,
  order_id text,
  purchase_state text not null default 'pending',
  acknowledgement_state text,
  verified_at timestamptz,
  processed_at timestamptz,
  raw_payload jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint google_play_purchases_token_unique unique (purchase_token)
);

create index if not exists google_play_purchases_user_idx
  on public.google_play_purchases(user_id, created_at desc);

create unique index if not exists enrollments_purchase_token_unique
  on public.enrollments(purchase_token)
  where purchase_token is not null;

create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  email text not null,
  status text not null default 'requested',
  requested_from text not null default 'in_app',
  processed_at timestamptz,
  admin_notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists account_deletion_requests_user_idx
  on public.account_deletion_requests(user_id, created_at desc);

create or replace function public.clara_product_plan(product_id text)
returns text
language sql
immutable
as $$
  select case
    when product_id in (
      'clara_commitment_249',
      'clara_pro_99',
      'clara_core_199',
      'clara_lifeos_499',
      'pro_99',
      'core_199',
      'lifeos_499',
      'core_599',
      'coaching_1299'
    ) then 'committed_249'
    else null
  end
$$;

create or replace function public.clara_product_tier(product_id text)
returns text
language sql
immutable
as $$
  select case
    when public.clara_product_plan(product_id) = 'committed_249' then 'clara_commitment'
    else null
  end
$$;

create or replace function public.process_google_play_purchase(
  p_user_id uuid,
  p_plan_key text,
  p_product_id text,
  p_purchase_token text,
  p_order_id text default null,
  p_payload jsonb default '{}'::jsonb
)
returns table(purchase_id uuid, enrollment_id uuid, entitlement_status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan text := public.clara_product_plan(p_product_id);
  v_tier text := public.clara_product_tier(p_product_id);
  v_purchase_id uuid;
  v_enrollment_id uuid;
  v_existing public.google_play_purchases%rowtype;
  v_now timestamptz := timezone('utc', now());
  v_expires_at timestamptz := case
    when coalesce(p_payload->>'expiryTimeMillis', '') ~ '^[0-9]+$'
      then to_timestamp(((p_payload->>'expiryTimeMillis')::numeric / 1000.0))
    else null
  end;
  v_subscription_status text := 'active';
begin
  if p_user_id is null or p_purchase_token is null or length(trim(p_purchase_token)) = 0 then
    raise exception 'Missing required purchase fields';
  end if;

  if v_plan <> 'committed_249' or v_tier is null then
    raise exception 'Unsupported CLARA product %', p_product_id;
  end if;

  select * into v_existing
  from public.google_play_purchases
  where purchase_token = p_purchase_token;

  if found and v_existing.user_id <> p_user_id then
    raise exception 'Google Play purchase is already linked to another user';
  end if;

  insert into public.google_play_purchases (
    user_id,
    plan_key,
    tier_type,
    product_id,
    purchase_token,
    order_id,
    purchase_state,
    acknowledgement_state,
    verified_at,
    processed_at,
    raw_payload
  ) values (
    p_user_id,
    'committed_249',
    'clara_commitment',
    p_product_id,
    p_purchase_token,
    p_order_id,
    coalesce(p_payload->>'purchaseState', 'purchased'),
    coalesce(p_payload->>'acknowledgementState', 'acknowledged'),
    v_now,
    v_now,
    p_payload
  ) on conflict (purchase_token) do update set
    plan_key = 'committed_249',
    tier_type = 'clara_commitment',
    raw_payload = excluded.raw_payload,
    verified_at = excluded.verified_at,
    processed_at = coalesce(public.google_play_purchases.processed_at, excluded.processed_at),
    updated_at = v_now
  returning id into v_purchase_id;

  insert into public.enrollments (
    user_id,
    plan,
    plan_key,
    tier_type,
    source,
    purchase_source,
    product_id,
    play_product_id,
    purchase_token,
    play_purchase_token,
    order_id,
    status,
    purchase_payload,
    last_billing_sync_at
  ) values (
    p_user_id,
    'committed_249',
    'committed_249',
    'clara_commitment',
    'google_play',
    'google_play',
    p_product_id,
    p_product_id,
    p_purchase_token,
    p_purchase_token,
    p_order_id,
    v_subscription_status,
    p_payload,
    v_now
  ) on conflict do nothing
  returning id into v_enrollment_id;

  if v_enrollment_id is null then
    select id into v_enrollment_id
    from public.enrollments
    where user_id = p_user_id
      and (play_purchase_token = p_purchase_token or purchase_token = p_purchase_token)
    order by created_at desc
    limit 1;
  end if;

  update public.profiles set
    plan = 'committed_249',
    plan_key = 'committed_249',
    subscription_plan = 'committed_249',
    access_level = 'committed',
    tier_type = 'clara_commitment',
    enrollment_source = 'google_play',
    purchase_source = 'google_play',
    access_source = 'google_play',
    admin_plan_override = false,
    subscription_status = v_subscription_status,
    subscription_label = 'CLARA Commitment',
    subscription_expires_at = v_expires_at,
    play_product_id = p_product_id,
    play_purchase_token = p_purchase_token,
    entitlement_status = 'active',
    status = 'active',
    enrollment_status = 'approved',
    is_enrolled = true,
    program_active = true,
    activation_status = 'active',
    is_activated = true,
    activated_at = coalesce(activated_at, v_now),
    last_billing_sync_at = v_now
  where id = p_user_id;

  purchase_id := v_purchase_id;
  enrollment_id := v_enrollment_id;
  entitlement_status := 'active';
  return next;
end;
$$;

create or replace function public.refresh_clara_entitlement_summary(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set
    plan = case when lower(coalesce(plan, plan_key, subscription_plan, '')) in ('pro','pro_99','core','core_199','core_599','life_os','lifeos','life_os_499','lifeos_499','coach','coaching','coaching_1299','paid','premium','committed_249') then 'committed_249' else 'free' end,
    plan_key = case when lower(coalesce(plan, plan_key, subscription_plan, '')) in ('pro','pro_99','core','core_199','core_599','life_os','lifeos','life_os_499','lifeos_499','coach','coaching','coaching_1299','paid','premium','committed_249') then 'committed_249' else 'free' end,
    subscription_plan = case when lower(coalesce(plan, plan_key, subscription_plan, '')) in ('pro','pro_99','core','core_199','core_599','life_os','lifeos','life_os_499','lifeos_499','coach','coaching','coaching_1299','paid','premium','committed_249') then 'committed_249' else 'free' end,
    access_level = case when lower(coalesce(plan, plan_key, subscription_plan, '')) in ('pro','pro_99','core','core_199','core_599','life_os','lifeos','life_os_499','lifeos_499','coach','coaching','coaching_1299','paid','premium','committed_249') then 'committed' else 'free' end
  where id = p_user_id;
end;
$$;

delete from public.plans
where lower(coalesce(plan_key, '')) not in ('free', 'committed_249');

insert into public.plans (
  name,
  plan_key,
  price,
  description,
  features,
  cta_label,
  active,
  popular,
  sort_order,
  product_id,
  billing_type,
  access_config
)
values
  (
    'Free Version',
    'free',
    0,
    'Use CLARA''s essential money tracking tools for free.',
    array['Dashboard access', 'Expense tracking', 'Wallet tracking', 'Budget tracking', 'News and updates'],
    'Start Free',
    true,
    false,
    1,
    null,
    null,
    '{"dashboard":"full","feed":"full","expenses":"full","wallets":"full","budgets":"full","analytics":"off","ai":"off","customization":"off","savings_goals":"off","tasks":"off","modules":"off","community":"off","messages":"off","coaching":"off","news":"full","referrals":"off"}'::jsonb
  ),
  (
    'Committed',
    'committed_249',
    249,
    'Unlock the complete CLARA experience through one monthly commitment.',
    array['Complete CLARA financial system', 'Full AI guidance', 'Me and Schedule access', 'Learning Hub and committed features'],
    'Start Your Commitment',
    true,
    true,
    2,
    'clara_commitment_249',
    'subscription',
    '{"dashboard":"full","feed":"full","expenses":"full","wallets":"full","budgets":"full","analytics":"full","ai":"full","customization":"full","savings_goals":"full","tasks":"full","modules":"full","community":"full","messages":"full","coaching":"full","news":"full","referrals":"full"}'::jsonb
  )
on conflict (plan_key) do update set
  name = excluded.name,
  price = excluded.price,
  description = excluded.description,
  features = excluded.features,
  cta_label = excluded.cta_label,
  active = excluded.active,
  popular = excluded.popular,
  sort_order = excluded.sort_order,
  product_id = excluded.product_id,
  billing_type = excluded.billing_type,
  access_config = excluded.access_config;
