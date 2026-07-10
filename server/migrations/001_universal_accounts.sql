CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
  CREATE TYPE clara_account_status AS ENUM ('active', 'suspended', 'disabled', 'deleted');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE clara_plan AS ENUM ('free', 'beta', 'committed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE clara_subscription_status AS ENUM ('active', 'cancelled', 'expired', 'suspended', 'refunded');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE clara_subscription_source AS ENUM ('free', 'manual', 'beta', 'android', 'ios', 'web');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE clara_platform AS ENUM ('ios_pwa', 'android', 'web');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  normalized_email text NOT NULL UNIQUE,
  display_name text NOT NULL,
  password_hash text NOT NULL,
  account_status clara_account_status NOT NULL DEFAULT 'active',
  signup_platform clara_platform NOT NULL,
  must_change_password boolean NOT NULL DEFAULT false,
  password_changed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  disabled_at timestamptz,
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS users_created_at_idx ON users (created_at DESC);
CREATE INDEX IF NOT EXISTS users_account_status_idx ON users (account_status);
CREATE INDEX IF NOT EXISTS users_signup_platform_idx ON users (signup_platform);

CREATE TABLE IF NOT EXISTS memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  plan clara_plan NOT NULL DEFAULT 'free',
  subscription_status clara_subscription_status NOT NULL DEFAULT 'active',
  source clara_subscription_source NOT NULL DEFAULT 'free',
  started_at timestamptz NOT NULL DEFAULT now(),
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  cancelled_at timestamptz,
  expired_at timestamptz,
  refunded_at timestamptz,
  suspended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS memberships_plan_idx ON memberships (plan);
CREATE INDEX IF NOT EXISTS memberships_status_idx ON memberships (subscription_status);

CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash text NOT NULL UNIQUE,
  device_id text,
  platform clara_platform NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  replaced_by_session_id uuid REFERENCES sessions(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions (user_id);
CREATE INDEX IF NOT EXISTS sessions_active_idx ON sessions (user_id, expires_at) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS admin_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_identifier text NOT NULL,
  refresh_token_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  replaced_by_session_id uuid REFERENCES admin_sessions(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS admin_sessions_active_idx ON admin_sessions (admin_identifier, expires_at) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_identifier text NOT NULL,
  target_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  safe_change_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_audit_target_idx ON admin_audit_log (target_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS admin_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  admin_identifier text NOT NULL,
  note text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS legacy_ios_access_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_record_id text NOT NULL UNIQUE,
  legacy_code_label text,
  activated_name text,
  activated_email text,
  activated_at timestamptz,
  linked_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  migrated_at timestamptz,
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
