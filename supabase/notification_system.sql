-- CLARA notification system migration
-- Keeps private financial notifications local while extending server-backed task reminders.

create extension if not exists pg_cron;
create extension if not exists pg_net;

alter table if exists public.user_task_reminder_settings
  add column if not exists timezone text not null default 'UTC',
  add column if not exists quiet_hours_enabled boolean not null default true,
  add column if not exists quiet_hours_start time not null default '22:00',
  add column if not exists quiet_hours_end time not null default '07:00';

alter table if exists public.user_task_reminder_states
  add column if not exists dedupe_key text,
  add column if not exists push_sent_at timestamptz;

create unique index if not exists user_task_reminder_states_dedupe_idx
  on public.user_task_reminder_states (user_id, dedupe_key)
  where dedupe_key is not null;

create index if not exists user_task_reminder_settings_delivery_idx
  on public.user_task_reminder_settings (reminders_enabled, reminder_mode);

create or replace function public.invoke_clara_task_reminder_scheduler()
returns bigint
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  project_url text;
  service_role_key text;
  request_id bigint;
begin
  select decrypted_secret
  into project_url
  from vault.decrypted_secrets
  where name = 'clara_project_url'
  limit 1;

  select decrypted_secret
  into service_role_key
  from vault.decrypted_secrets
  where name = 'clara_service_role_key'
  limit 1;

  if coalesce(project_url, '') = '' or coalesce(service_role_key, '') = '' then
    raise exception 'CLARA scheduler Vault secrets are missing. Add clara_project_url and clara_service_role_key.';
  end if;

  select net.http_post(
    url := rtrim(project_url, '/') || '/functions/v1/schedule-task-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := '{}'::jsonb
  )
  into request_id;

  return request_id;
end;
$$;

revoke all on function public.invoke_clara_task_reminder_scheduler() from public;
grant execute on function public.invoke_clara_task_reminder_scheduler() to service_role;

-- Schedule only when both required Vault secrets already exist.
-- This avoids creating a failing cron job in an environment that has not been configured yet.
do $$
declare
  has_project_url boolean;
  has_service_role_key boolean;
  existing_job_id bigint;
begin
  select exists(
    select 1 from vault.decrypted_secrets where name = 'clara_project_url'
  ) into has_project_url;

  select exists(
    select 1 from vault.decrypted_secrets where name = 'clara_service_role_key'
  ) into has_service_role_key;

  select jobid
  into existing_job_id
  from cron.job
  where jobname = 'clara-task-reminders-every-minute'
  limit 1;

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  if has_project_url and has_service_role_key then
    perform cron.schedule(
      'clara-task-reminders-every-minute',
      '* * * * *',
      'select public.invoke_clara_task_reminder_scheduler();'
    );
  else
    raise notice 'CLARA task reminder cron was not scheduled. Add Vault secrets clara_project_url and clara_service_role_key, then rerun this scheduling block.';
  end if;
end;
$$;
