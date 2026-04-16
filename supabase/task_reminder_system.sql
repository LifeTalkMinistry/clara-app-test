create table if not exists public.user_task_reminder_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  reminders_enabled boolean not null default true,
  reminder_mode text not null default 'in_app_only'
    check (reminder_mode in ('in_app_only', 'push_and_in_app', 'push_only')),
  reminder_frequency text not null default 'once_daily'
    check (reminder_frequency in ('once_daily', 'twice_daily', 'custom')),
  preferred_times jsonb not null default '["09:00"]'::jsonb,
  snooze_default_minutes integer not null default 30 check (snooze_default_minutes > 0),
  only_notify_if_incomplete boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_task_reminder_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  task_id text not null,
  task_day integer,
  reminder_date date not null,
  reminder_window_key text not null,
  last_shown_at timestamptz,
  last_acknowledged_at timestamptz,
  snoozed_until timestamptz,
  dismissed_for_day boolean not null default false,
  dismissed_in_window boolean not null default false,
  last_action text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, task_id, reminder_date, reminder_window_key)
);

create index if not exists idx_user_task_reminder_states_lookup
  on public.user_task_reminder_states (user_id, reminder_date, reminder_window_key);

create table if not exists public.user_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  subscription jsonb not null,
  p256dh_key text,
  auth_key text,
  user_agent text,
  is_active boolean not null default true,
  last_seen_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_user_push_subscriptions_user
  on public.user_push_subscriptions (user_id, is_active);

create or replace function public.set_task_reminder_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists task_reminder_settings_updated_at on public.user_task_reminder_settings;
create trigger task_reminder_settings_updated_at
before update on public.user_task_reminder_settings
for each row execute procedure public.set_task_reminder_updated_at();

drop trigger if exists task_reminder_states_updated_at on public.user_task_reminder_states;
create trigger task_reminder_states_updated_at
before update on public.user_task_reminder_states
for each row execute procedure public.set_task_reminder_updated_at();

drop trigger if exists user_push_subscriptions_updated_at on public.user_push_subscriptions;
create trigger user_push_subscriptions_updated_at
before update on public.user_push_subscriptions
for each row execute procedure public.set_task_reminder_updated_at();

alter table public.user_task_reminder_settings enable row level security;
alter table public.user_task_reminder_states enable row level security;
alter table public.user_push_subscriptions enable row level security;

drop policy if exists "users manage own task reminder settings" on public.user_task_reminder_settings;
create policy "users manage own task reminder settings"
on public.user_task_reminder_settings
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "users manage own task reminder states" on public.user_task_reminder_states;
create policy "users manage own task reminder states"
on public.user_task_reminder_states
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "users manage own push subscriptions" on public.user_push_subscriptions;
create policy "users manage own push subscriptions"
on public.user_push_subscriptions
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
