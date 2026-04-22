alter table if exists public.plans
  add column if not exists access_config jsonb,
  add column if not exists product_id text,
  add column if not exists billing_type text;

alter table if exists public.profiles
  add column if not exists access_level text default 'pro',
  add column if not exists recommended_access_level text,
  add column if not exists onboarding_answers jsonb;

update public.profiles
set access_level = case
  when lower(coalesce(plan, '')) in ('coaching_1299', 'life_os', 'lifeos', 'lifeos_499', 'life_os_499') then 'life_os'
  when lower(coalesce(plan, '')) in ('core_599', 'core_199', 'core') then 'core'
  else 'pro'
end
where access_level is null
   or lower(access_level) not in ('pro', 'core', 'life_os');

create unique index if not exists plans_plan_key_unique
  on public.plans(plan_key);

delete from public.plans
where lower(coalesce(plan_key, '')) not in ('pro_99', 'core_599', 'coaching_1299');

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
    'PRO',
    'pro_99',
    99,
    'Unlock CLARA PRO tools with a Google Play monthly subscription.',
    array['Full financial tools', 'PRO-only tool access', 'Monthly Google Play subscription'],
    'Subscribe to PRO',
    true,
    false,
    1,
    'pro_99',
    'subscription',
    '{
      "dashboard":"full","feed":"full","expenses":"full","wallets":"full",
      "budgets":"full","analytics":"full","ai":"off","savings_goals":"full",
      "tasks":"off","modules":"off","community":"full","messages":"full",
      "coaching":"teaser","news":"full","referrals":"full"
    }'::jsonb
  ),
  (
    'CORE',
    'core_599',
    199,
    'Unlock CORE: the advanced daily spending system with guided support and CLARA Companion intelligence.',
    array['Complete CORE financial system', 'Advanced daily spending AI through CLARA Companion', 'Guided spending strategy and practical next steps'],
    'Unlock CORE',
    true,
    true,
    2,
    'core_199',
    'subscription',
    '{
      "dashboard":"full","feed":"full","expenses":"full","wallets":"full",
      "budgets":"full","analytics":"full","ai":"advanced","customization":"full","savings_goals":"full",
      "tasks":"full","modules":"full","community":"full","messages":"full",
      "coaching":"teaser","news":"full","referrals":"full"
    }'::jsonb
  ),
  (
    'Life OS',
    'coaching_1299',
    499,
    'Unlock Life OS, CLARA''s broadest decision-intelligence layer for money, planning, and life organization.',
    array['Complete Life OS operating layer', 'Broader decision intelligence beyond daily spending', 'Life scheduling, organization, and deeper CLARA context'],
    'Unlock Life OS',
    true,
    false,
    3,
    'lifeos_499',
    'subscription',
    '{
      "dashboard":"full","feed":"full","expenses":"full","wallets":"full",
      "budgets":"full","analytics":"full","ai":"life_os","customization":"full","savings_goals":"full",
      "tasks":"full","modules":"full","community":"full","messages":"full",
      "coaching":"full","news":"full","referrals":"full"
    }'::jsonb
  )
on conflict (plan_key) do update
set
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
