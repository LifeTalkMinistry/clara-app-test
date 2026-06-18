alter table if exists public.plans
  add column if not exists access_config jsonb,
  add column if not exists product_id text,
  add column if not exists billing_type text;

alter table if exists public.profiles
  add column if not exists plan_key text,
  add column if not exists subscription_plan text,
  add column if not exists access_level text default 'free',
  add column if not exists access_source text,
  add column if not exists admin_plan_override boolean not null default false,
  add column if not exists subscription_status text default 'free';

create unique index if not exists plans_plan_key_unique on public.plans(plan_key);

delete from public.plans where lower(coalesce(plan_key, '')) not in ('free', 'committed_249');

insert into public.plans (
  name, plan_key, price, description, features, cta_label,
  active, popular, sort_order, product_id, billing_type, access_config
)
values
  (
    'Free Version', 'free', 0,
    'Use CLARA''s essential money tracking tools for free.',
    array['Dashboard access', 'Expense tracking', 'Wallet tracking', 'Budget tracking', 'News and updates'],
    'Start Free', true, false, 1, null, null,
    '{"dashboard":"full","feed":"full","expenses":"full","wallets":"full","budgets":"full","analytics":"off","ai":"off","customization":"off","savings_goals":"off","tasks":"off","modules":"off","community":"off","messages":"off","coaching":"off","news":"full","referrals":"off"}'::jsonb
  ),
  (
    'Committed', 'committed_249', 249,
    'Unlock the complete CLARA experience through one monthly commitment.',
    array['Complete CLARA financial system', 'Full AI guidance', 'Me and Schedule access', 'Learning Hub and committed features'],
    'Start Your Commitment', true, true, 2, 'clara_commitment_249', 'subscription',
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
