drop index if exists public.support_subscriptions_provider_order_unique;
alter table public.support_subscriptions alter column provider_order_id set not null;
alter table public.support_subscriptions
  add constraint support_subscriptions_provider_order_unique
  unique (payment_provider, provider_order_id);
