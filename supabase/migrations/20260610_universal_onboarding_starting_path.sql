-- Safe, idempotent support for the CLARA universal onboarding starting path.
-- These columns let onboarding save diagnosis answers without exposing schema errors to users.

alter table if exists public.profiles
  add column if not exists onboarding_completed boolean default false,
  add column if not exists has_completed_onboarding boolean default false,
  add column if not exists onboarding_step integer,
  add column if not exists onboarding_answers jsonb default '{}'::jsonb,
  add column if not exists commitment_level text,
  add column if not exists lifestyle_context text,
  add column if not exists money_pressure_point text,
  add column if not exists spending_trigger text,
  add column if not exists spending_guidance_style text,
  add column if not exists guidance_intensity text,
  add column if not exists recommended_access_level text,
  add column if not exists onboarding_completed_at timestamptz;
