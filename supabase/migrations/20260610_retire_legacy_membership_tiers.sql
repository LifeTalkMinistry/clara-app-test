-- Idempotent retirement of CLARA's legacy customer tiers.
-- Legacy values remain here only for data normalization and historical receipt support.

alter table if exists public.profiles
  add column if not exists plan_key text,
  add column if not exists subscription_plan text,
  add column if not exists access_level text default 'free',
  add column if not exists subscription_label text,
  add column if not exists activation_status text default 'not_required',
  add column if not exists is_activated boolean not null default false,
  add column if not exists activated_at timestamptz;

alter table if exists public.enrollments
  add column if not exists plan_key text,
  add column if not exists access_level text;

update public.profiles
set
  plan = case
    when lower(coalesce(plan, '')) in ('pro','pro_99','core','core_199','core_599','life_os','lifeos','life_os_499','lifeos_499','coach','coaching','coaching_1299','premium','paid') then 'committed_249'
    when lower(coalesce(plan, '')) in ('', 'free', 'free_version') then 'free'
    else plan
  end,
  plan_key = case
    when lower(coalesce(plan_key, plan, '')) in ('pro','pro_99','core','core_199','core_599','life_os','lifeos','life_os_499','lifeos_499','coach','coaching','coaching_1299','premium','paid') then 'committed_249'
    when lower(coalesce(plan_key, plan, '')) in ('', 'free', 'free_version') then 'free'
    else plan_key
  end,
  subscription_plan = case
    when lower(coalesce(subscription_plan, plan, '')) in ('pro','pro_99','core','core_199','core_599','life_os','lifeos','life_os_499','lifeos_499','coach','coaching','coaching_1299','premium','paid') then 'committed_249'
    when lower(coalesce(subscription_plan, plan, '')) in ('', 'free', 'free_version') then 'free'
    else subscription_plan
  end,
  access_level = case
    when lower(coalesce(access_level, '')) in ('pro','core','life_os','lifeos','coach','coaching','paid','premium','committed') then 'committed'
    else 'free'
  end,
  subscription_label = case
    when lower(coalesce(plan, plan_key, subscription_plan, '')) = 'committed_249' then 'CLARA Commitment'
    else 'Free Version'
  end;

update public.enrollments
set
  plan = case when lower(coalesce(plan, '')) in ('pro','pro_99','core','core_199','core_599','life_os','lifeos','life_os_499','lifeos_499','coach','coaching','coaching_1299','premium','paid') then 'committed_249' else plan end,
  plan_key = case when lower(coalesce(plan_key, plan, '')) in ('pro','pro_99','core','core_199','core_599','life_os','lifeos','life_os_499','lifeos_499','coach','coaching','coaching_1299','premium','paid') then 'committed_249' else coalesce(plan_key, plan) end,
  access_level = case when lower(coalesce(access_level, '')) in ('pro','core','life_os','lifeos','coach','coaching','paid','premium','committed') then 'committed' else coalesce(access_level, 'free') end
where lower(coalesce(plan_key, plan, access_level, '')) in ('pro','pro_99','core','core_199','core_599','life_os','lifeos','life_os_499','lifeos_499','coach','coaching','coaching_1299','paid','premium','committed');

do $migration$
begin
  if to_regclass('public.google_play_purchases') is not null then
    update public.google_play_purchases
    set plan_key = 'committed_249', tier_type = 'clara_commitment'
    where lower(coalesce(plan_key, '')) in ('pro','pro_99','core','core_199','core_599','life_os','lifeos','life_os_499','lifeos_499','coach','coaching','coaching_1299','paid','premium');
  end if;

  if to_regclass('public.activation_codes') is not null then
    update public.activation_codes
    set plan_key = 'committed_249'
    where lower(coalesce(plan_key, '')) in ('pro','pro_99','core','core_199','core_599','life_os','lifeos','life_os_499','lifeos_499','coach','coaching','coaching_1299','paid','premium');
  end if;
end
$migration$;

update public.plans
set active = false
where lower(coalesce(plan_key, '')) not in ('free', 'committed_249');

insert into public.plans (name, plan_key, price, description, features, cta_label, active, popular, sort_order, product_id, billing_type, access_config)
values
  ('Free Version','free',0,'Use CLARA''s essential money tracking tools for free.',array['Dashboard access','Expense tracking','Wallet tracking','Budget tracking','News and updates'],'Start Free',true,false,1,null,null,'{"dashboard":"full","feed":"full","expenses":"full","wallets":"full","budgets":"full","analytics":"off","ai":"off","customization":"off","savings_goals":"off","tasks":"off","modules":"off","community":"off","messages":"off","coaching":"off","news":"full","referrals":"off"}'::jsonb),
  ('Committed','committed_249',249,'Unlock the complete CLARA experience through one monthly commitment.',array['Complete CLARA financial system','Full AI guidance','Me and Schedule access','Learning Hub and committed features'],'Start Your Commitment',true,true,2,'clara_commitment_249','subscription','{"dashboard":"full","feed":"full","expenses":"full","wallets":"full","budgets":"full","analytics":"full","ai":"full","customization":"full","savings_goals":"full","tasks":"full","modules":"full","community":"full","messages":"full","coaching":"full","news":"full","referrals":"full"}'::jsonb)
on conflict (plan_key) do update set
  name=excluded.name, price=excluded.price, description=excluded.description, features=excluded.features,
  cta_label=excluded.cta_label, active=excluded.active, popular=excluded.popular, sort_order=excluded.sort_order,
  product_id=excluded.product_id, billing_type=excluded.billing_type, access_config=excluded.access_config;

do $$
declare constraint_row record;
begin
  for constraint_row in
    select n.nspname schema_name, c.relname table_name, con.conname constraint_name
    from pg_constraint con
    join pg_class c on c.oid = con.conrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in ('profiles','enrollments','plans','google_play_purchases','activation_codes')
      and pg_get_constraintdef(con.oid) ~* '(pro_99|core_199|core_599|life_os_499|coaching_1299|life_os)'
  loop
    execute format('alter table %I.%I drop constraint if exists %I', constraint_row.schema_name, constraint_row.table_name, constraint_row.constraint_name);
  end loop;
end $$;

alter table if exists public.profiles alter column access_level set default 'free';
