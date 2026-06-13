create table if not exists public.user_notification_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  channel text not null check (channel in ('web_push','fcm','apns')),
  platform text not null check (platform in ('web','android','ios')),
  token text,
  endpoint text,
  subscription jsonb,
  device_label text,
  user_agent text,
  is_active boolean not null default true,
  last_seen_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_user_notification_devices_user
  on public.user_notification_devices (user_id, is_active);

create index if not exists idx_user_notification_devices_channel
  on public.user_notification_devices (channel);

create index if not exists idx_user_notification_devices_platform
  on public.user_notification_devices (platform);

create index if not exists idx_user_notification_devices_active
  on public.user_notification_devices (is_active);

create unique index if not exists uq_user_notification_devices_token
  on public.user_notification_devices (token)
  where token is not null;

create unique index if not exists uq_user_notification_devices_endpoint
  on public.user_notification_devices (endpoint)
  where endpoint is not null;

create unique index if not exists uq_user_notification_devices_active_token
  on public.user_notification_devices (token)
  where is_active = true and token is not null;

create unique index if not exists uq_user_notification_devices_active_endpoint
  on public.user_notification_devices (endpoint)
  where is_active = true and endpoint is not null;

create or replace function public.set_notification_devices_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists user_notification_devices_updated_at on public.user_notification_devices;
create trigger user_notification_devices_updated_at
before update on public.user_notification_devices
for each row execute procedure public.set_notification_devices_updated_at();

alter table public.user_notification_devices enable row level security;

drop policy if exists "users manage own notification devices" on public.user_notification_devices;
create policy "users manage own notification devices"
on public.user_notification_devices
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "service role manages notification devices" on public.user_notification_devices;
create policy "service role manages notification devices"
on public.user_notification_devices
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
