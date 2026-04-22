alter table if exists public.profiles
  add column if not exists display_name text,
  add column if not exists subscription_status text,
  add column if not exists subscription_label text;

alter table if exists public.expenses
  add column if not exists user_id uuid,
  add column if not exists user_email text,
  add column if not exists wallet_id text,
  add column if not exists need_type text default 'need',
  add column if not exists planning_status text default 'planned',
  add column if not exists unplanned_reason text,
  add column if not exists updated_at timestamptz default now();

alter table if exists public.wallets
  add column if not exists user_id uuid,
  add column if not exists user_email text,
  add column if not exists balance numeric default 0,
  add column if not exists starting_balance numeric default 0,
  add column if not exists sort_order integer default 0,
  add column if not exists updated_at timestamptz default now();

create table if not exists public.wallet_transactions (
  id text primary key,
  wallet_id text,
  type text not null,
  amount numeric not null default 0,
  category text,
  need_type text,
  planning_status text,
  unplanned_reason text,
  expense_id text,
  transfer_group_id text,
  related_wallet_id text,
  source_type text,
  tag text,
  details text,
  notes text,
  user_id uuid,
  user_email text,
  created_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table if exists public.wallet_transactions
  add column if not exists category text,
  add column if not exists need_type text,
  add column if not exists planning_status text,
  add column if not exists unplanned_reason text,
  add column if not exists expense_id text,
  add column if not exists transfer_group_id text,
  add column if not exists related_wallet_id text,
  add column if not exists source_type text,
  add column if not exists tag text,
  add column if not exists details text,
  add column if not exists user_id uuid,
  add column if not exists user_email text,
  add column if not exists created_by text,
  add column if not exists updated_at timestamptz default now();

create table if not exists public.transfers (
  id text primary key,
  from_wallet_id text,
  to_wallet_id text,
  amount numeric not null default 0,
  notes text,
  user_id uuid,
  user_email text,
  created_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists expenses_user_id_idx on public.expenses(user_id);
create index if not exists expenses_user_email_idx on public.expenses(user_email);
create index if not exists wallet_transactions_wallet_id_idx on public.wallet_transactions(wallet_id);
create index if not exists wallet_transactions_user_id_idx on public.wallet_transactions(user_id);
create index if not exists wallet_transactions_expense_id_idx on public.wallet_transactions(expense_id);
create index if not exists wallets_user_id_idx on public.wallets(user_id);
