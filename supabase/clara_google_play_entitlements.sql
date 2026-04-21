create extension if not exists pgcrypto;

alter table if exists public.profiles
  add column if not exists tier_type text,
  add column if not exists purchase_source text,
  add column if not exists play_product_id text,
  add column if not exists play_purchase_token text,
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
  select case product_id
    when 'clara_pro_tools_monthly_99' then 'entry'
    when 'clara_program_599' then 'core'
    when 'clara_coaching_1299' then 'coaching'
    else null
  end
$$;

create or replace function public.clara_product_tier(product_id text)
returns text
language sql
immutable
as $$
  select case product_id
    when 'clara_pro_tools_monthly_99' then 'pro_tools'
    when 'clara_program_599' then 'clara_program'
    when 'clara_coaching_1299' then 'clara_coaching'
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
  v_plan text := coalesce(public.clara_product_plan(p_product_id), lower(coalesce(p_plan_key, '')));
  v_tier text := public.clara_product_tier(p_product_id);
  v_purchase_id uuid;
  v_enrollment_id uuid;
  v_existing public.google_play_purchases%rowtype;
  v_now timestamptz := timezone('utc', now());
begin
  if p_user_id is null or p_purchase_token is null or length(trim(p_purchase_token)) = 0 then
    raise exception 'Missing required purchase fields';
  end if;

  if v_plan not in ('entry', 'core', 'coaching') or v_tier is null then
    raise exception 'Unsupported CLARA product %', p_product_id;
  end if;

  select * into v_existing
  from public.google_play_purchases
  where purchase_token = p_purchase_token;

  if found and v_existing.processed_at is not null then
    select id into v_enrollment_id
    from public.enrollments
    where play_purchase_token = p_purchase_token or purchase_token = p_purchase_token
    order by created_at desc
    limit 1;

    purchase_id := v_existing.id;
    enrollment_id := v_enrollment_id;
    entitlement_status := 'already_processed';
    return next;
    return;
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
  )
  values (
    p_user_id,
    v_plan,
    v_tier,
    p_product_id,
    p_purchase_token,
    p_order_id,
    coalesce(p_payload->>'purchaseState', 'purchased'),
    coalesce(p_payload->>'acknowledgementState', 'acknowledged'),
    v_now,
    v_now,
    p_payload
  )
  on conflict (purchase_token) do update
  set
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
  )
  values (
    p_user_id,
    v_plan,
    v_plan,
    v_tier,
    'google_play',
    'google_play',
    p_product_id,
    p_product_id,
    p_purchase_token,
    p_purchase_token,
    p_order_id,
    'active',
    p_payload,
    v_now
  )
  on conflict do nothing
  returning id into v_enrollment_id;

  if v_enrollment_id is null then
    select id into v_enrollment_id
    from public.enrollments
    where user_id = p_user_id
      and (play_purchase_token = p_purchase_token or purchase_token = p_purchase_token)
    order by created_at desc
    limit 1;
  end if;

  if v_plan = 'entry' then
    update public.profiles
    set
      plan = 'entry',
      tier_type = v_tier,
      purchase_source = 'google_play',
      play_product_id = p_product_id,
      play_purchase_token = p_purchase_token,
      pro_subscription_status = 'active',
      entitlement_status = 'pro_subscription',
      status = 'approved',
      enrollment_status = 'active',
      is_enrolled = false,
      program_active = false,
      last_billing_sync_at = v_now
    where id = p_user_id;
  elsif v_plan in ('core', 'coaching') then
    update public.profiles
    set
      plan = v_plan,
      tier_type = v_tier,
      purchase_source = 'google_play',
      play_product_id = p_product_id,
      play_purchase_token = p_purchase_token,
      entitlement_status = 'program_available',
      status = 'approved',
      enrollment_status = 'active',
      is_enrolled = true,
      program_active = false,
      coaching_credits_total = case when v_plan = 'coaching' then greatest(coaching_credits_total, 2) else coaching_credits_total end,
      last_billing_sync_at = v_now
    where id = p_user_id;
  end if;

  purchase_id := v_purchase_id;
  enrollment_id := v_enrollment_id;
  entitlement_status := 'processed';
  return next;
end;
$$;

create or replace function public.refresh_clara_entitlement_summary(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_now timestamptz := timezone('utc', now());
begin
  select * into v_profile from public.profiles where id = p_user_id;
  if not found then return; end if;

  if v_profile.program_completed_at is not null then
    if v_profile.continuation_pro_ends_at is not null and v_profile.continuation_pro_ends_at > v_now then
      update public.profiles
      set plan = 'entry', entitlement_status = 'continuation_pro', program_active = false, is_enrolled = false
      where id = p_user_id;
    elsif coalesce(v_profile.pro_subscription_status, '') = 'active'
       or (v_profile.pro_subscription_expires_at is not null and v_profile.pro_subscription_expires_at > v_now) then
      update public.profiles
      set plan = 'entry', entitlement_status = 'pro_subscription', program_active = false, is_enrolled = false
      where id = p_user_id;
    else
      update public.profiles
      set plan = 'free', status = 'free', enrollment_status = 'completed', entitlement_status = 'free', program_active = false, is_enrolled = false
      where id = p_user_id;
    end if;
  end if;
end;
$$;

update public.plans
set
  name = case plan_key
    when 'entry' then 'PRO Tools'
    when 'core' then 'CLARA Program'
    when 'coaching' then 'CLARA Coaching'
    else name
  end,
  price = case plan_key
    when 'entry' then 99
    when 'core' then 599
    when 'coaching' then 1299
    else price
  end,
  description = case plan_key
    when 'entry' then 'Unlock CLARA PRO tools with a Google Play monthly subscription.'
    when 'core' then 'Unlock the 30-day CLARA Program, PRO during the program, and +1 month continuation PRO after completion.'
    when 'coaching' then 'Unlock the 30-day CLARA Program, PRO during the program, +2 months continuation PRO after completion, and 2 coaching sessions.'
    else description
  end,
  features = case plan_key
    when 'entry' then array['Full financial tools', 'PRO-only tool access', 'Monthly Google Play subscription']
    when 'core' then array['30-day CLARA Program', 'Includes PRO access during the program', '+1 month continuation PRO after program completion']
    when 'coaching' then array['30-day CLARA Program', 'Includes PRO access during the program', '+2 months continuation PRO after program completion', '2 coaching session credits']
    else features
  end,
  cta_label = case plan_key
    when 'entry' then 'Subscribe to PRO'
    when 'core' then 'Unlock Program'
    when 'coaching' then 'Unlock Coaching'
    else cta_label
  end
where plan_key in ('entry', 'core', 'coaching');
