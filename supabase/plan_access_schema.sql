alter table if exists public.plans
  add column if not exists access_config jsonb,
  add column if not exists product_id text,
  add column if not exists billing_type text;

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
      "budgets":"full","analytics":"full","savings_goals":"full",
      "tasks":"off","modules":"off","community":"full","messages":"full",
      "coaching":"teaser","news":"full","referrals":"full"
    }'::jsonb
  ),
  (
    'CORE',
    'core_599',
    599,
    'Unlock the 30-day CLARA Program, PRO during the program, and +1 month continuation PRO after completion.',
    array['30-day CLARA Program', 'Includes PRO access during the program', '+1 month continuation PRO after program completion'],
    'Unlock CORE',
    true,
    true,
    2,
    'core_599',
    'one_time',
    '{
      "dashboard":"full","feed":"full","expenses":"full","wallets":"full",
      "budgets":"full","analytics":"full","savings_goals":"full",
      "tasks":"full","modules":"full","community":"full","messages":"full",
      "coaching":"teaser","news":"full","referrals":"full"
    }'::jsonb
  ),
  (
    'COACHING',
    'coaching_1299',
    1299,
    'Unlock the 30-day CLARA Program, PRO during the program, +2 months continuation PRO after completion, and 2 coaching sessions.',
    array['30-day CLARA Program', 'Includes PRO access during the program', '+2 months continuation PRO after program completion', '2 coaching session credits'],
    'Unlock COACHING',
    true,
    false,
    3,
    'coaching_1299',
    'one_time',
    '{
      "dashboard":"full","feed":"full","expenses":"full","wallets":"full",
      "budgets":"full","analytics":"full","savings_goals":"full",
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
