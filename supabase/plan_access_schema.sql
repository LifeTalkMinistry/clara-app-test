alter table if exists public.plans
  add column if not exists access_config jsonb;

update public.plans
set access_config = case lower(coalesce(plan_key, ''))
  when 'free' then '{
    "dashboard":"full",
    "expenses":"full",
    "wallets":"full",
    "budgets":"off",
    "analytics":"limited",
    "savings_goals":"off",
    "tasks":"off",
    "modules":"off",
    "community":"off",
    "messages":"off",
    "coaching":"off",
    "news":"full",
    "referrals":"off"
  }'::jsonb
  when 'entry' then '{
    "dashboard":"full",
    "expenses":"full",
    "wallets":"full",
    "budgets":"full",
    "analytics":"full",
    "savings_goals":"full",
    "tasks":"full",
    "modules":"full",
    "community":"full",
    "messages":"full",
    "coaching":"teaser",
    "news":"full",
    "referrals":"full"
  }'::jsonb
  when 'core' then '{
    "dashboard":"full",
    "expenses":"full",
    "wallets":"full",
    "budgets":"full",
    "analytics":"full",
    "savings_goals":"full",
    "tasks":"full",
    "modules":"full",
    "community":"full",
    "messages":"full",
    "coaching":"teaser",
    "news":"full",
    "referrals":"full"
  }'::jsonb
  when 'coaching' then '{
    "dashboard":"full",
    "expenses":"full",
    "wallets":"full",
    "budgets":"full",
    "analytics":"full",
    "savings_goals":"full",
    "tasks":"full",
    "modules":"full",
    "community":"full",
    "messages":"full",
    "coaching":"full",
    "news":"full",
    "referrals":"full"
  }'::jsonb
  else access_config
end
where access_config is null;

alter table if exists public.plans
  alter column access_config set default '{}'::jsonb;

update public.profiles
set plan = case
  when lower(coalesce(plan, '')) in ('basic', 'diy', 'entry') then 'entry'
  when lower(coalesce(plan, '')) in ('transformation', 'diwm', 'student', 'core') then 'core'
  when lower(coalesce(plan, '')) in ('elite', 'ldit', 'coaching') then 'coaching'
  else 'free'
end
where coalesce(plan, '') <> '';

update public.enrollments
set
  plan = case
    when lower(coalesce(plan, '')) in ('basic', 'diy', 'entry') then 'entry'
    when lower(coalesce(plan, '')) in ('transformation', 'diwm', 'student', 'core') then 'core'
    when lower(coalesce(plan, '')) in ('elite', 'ldit', 'coaching') then 'coaching'
    when lower(coalesce(plan, '')) = 'free' then 'free'
    else plan
  end,
  plan_key = case
    when lower(coalesce(plan_key, plan, '')) in ('basic', 'diy', 'entry') then 'entry'
    when lower(coalesce(plan_key, plan, '')) in ('transformation', 'diwm', 'student', 'core') then 'core'
    when lower(coalesce(plan_key, plan, '')) in ('elite', 'ldit', 'coaching') then 'coaching'
    when lower(coalesce(plan_key, plan, '')) = 'free' then 'free'
    else coalesce(plan_key, plan)
  end;

insert into public.plans (
  name,
  plan_key,
  price,
  sort_order,
  description,
  features,
  cta_label,
  active,
  popular,
  access_config
)
select
  'Free',
  'free',
  0,
  1,
  'Start with CLARA''s core money tracking and unlock more any time.',
  array['Dashboard access', 'Expense tracking', 'Wallet tracking', 'News and updates'],
  'Start Free',
  true,
  false,
  '{
    "dashboard":"full",
    "expenses":"full",
    "wallets":"full",
    "budgets":"off",
    "analytics":"limited",
    "savings_goals":"off",
    "tasks":"off",
    "modules":"off",
    "community":"off",
    "messages":"off",
    "coaching":"off",
    "news":"full",
    "referrals":"off"
  }'::jsonb
where not exists (
  select 1 from public.plans where lower(plan_key) = 'free'
);

insert into public.plans (
  name,
  plan_key,
  price,
  sort_order,
  description,
  features,
  cta_label,
  active,
  popular,
  access_config
)
select
  'Entry',
  'entry',
  299,
  2,
  'Unlock CLARA''s guided starter path and your full money toolkit.',
  array['Full financial tools', 'Starter guided program', 'Modules and tasks', 'Community and messaging'],
  'Unlock Entry',
  true,
  false,
  '{
    "dashboard":"full",
    "expenses":"full",
    "wallets":"full",
    "budgets":"full",
    "analytics":"full",
    "savings_goals":"full",
    "tasks":"full",
    "modules":"full",
    "community":"full",
    "messages":"full",
    "coaching":"teaser",
    "news":"full",
    "referrals":"full"
  }'::jsonb
where not exists (
  select 1 from public.plans where lower(plan_key) = 'entry'
);

insert into public.plans (
  name,
  plan_key,
  price,
  sort_order,
  description,
  features,
  cta_label,
  active,
  popular,
  access_config
)
select
  'Core',
  'core',
  599,
  3,
  'Unlock the full CLARA guided system with your full money toolkit.',
  array['Full 30-day guided system', 'Modules and tasks', 'Community and messaging', 'Full analytics and goal tracking'],
  'Unlock Core',
  true,
  true,
  '{
    "dashboard":"full",
    "expenses":"full",
    "wallets":"full",
    "budgets":"full",
    "analytics":"full",
    "savings_goals":"full",
    "tasks":"full",
    "modules":"full",
    "community":"full",
    "messages":"full",
    "coaching":"teaser",
    "news":"full",
    "referrals":"full"
  }'::jsonb
where not exists (
  select 1 from public.plans where lower(plan_key) = 'core'
);

insert into public.plans (
  name,
  plan_key,
  price,
  sort_order,
  description,
  features,
  cta_label,
  active,
  popular,
  access_config
)
select
  'Coaching',
  'coaching',
  1199,
  4,
  'Unlock the full CLARA system plus your coaching and support layer.',
  array['Full 30-day guided system', 'Full coaching access', 'Community and messaging', 'Full analytics and goal tracking'],
  'Unlock Coaching',
  true,
  false,
  '{
    "dashboard":"full",
    "expenses":"full",
    "wallets":"full",
    "budgets":"full",
    "analytics":"full",
    "savings_goals":"full",
    "tasks":"full",
    "modules":"full",
    "community":"full",
    "messages":"full",
    "coaching":"full",
    "news":"full",
    "referrals":"full"
  }'::jsonb
where not exists (
  select 1 from public.plans where lower(plan_key) = 'coaching'
);
