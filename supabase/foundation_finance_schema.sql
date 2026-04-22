alter table if exists public.profiles
  add column if not exists display_name text,
  add column if not exists subscription_status text,
  add column if not exists subscription_label text,
  add column if not exists monthly_survival_expense numeric default 0,
  add column if not exists survival_setup_done boolean default false,
  add column if not exists activation_status text default 'not_required',
  add column if not exists is_activated boolean default false,
  add column if not exists activated_at timestamptz,
  add column if not exists activation_plan text,
  add column if not exists activation_code_id uuid,
  add column if not exists activation_onboarding_completed boolean default false,
  add column if not exists suspended_at timestamptz,
  add column if not exists messaging_disabled boolean default false,
  add column if not exists updated_at timestamptz default now();

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

create table if not exists public.activation_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  code_normalized text not null unique,
  plan_key text not null,
  user_id uuid,
  user_email text,
  status text not null default 'available',
  printed_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,
  used_at timestamptz,
  activated_at timestamptz,
  created_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid,
  author_email text,
  author_name text,
  body text not null,
  status text default 'active',
  reactions integer default 0,
  report_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid,
  author_id uuid,
  author_email text,
  author_name text,
  body text not null,
  status text default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table if exists public.budgets
  add column if not exists category text,
  add column if not exists budget_category text,
  add column if not exists allocated_amount numeric default 0,
  add column if not exists month text,
  add column if not exists tracking_start_date timestamptz,
  add column if not exists tracking_end_date timestamptz,
  add column if not exists range_start timestamptz,
  add column if not exists range_end timestamptz,
  add column if not exists is_manual_range boolean default false,
  add column if not exists user_id uuid,
  add column if not exists email text,
  add column if not exists user_email text,
  add column if not exists created_by text,
  add column if not exists updated_at timestamptz default now();

create index if not exists expenses_user_id_idx on public.expenses(user_id);
create index if not exists expenses_user_email_idx on public.expenses(user_email);
create index if not exists wallet_transactions_wallet_id_idx on public.wallet_transactions(wallet_id);
create index if not exists wallet_transactions_user_id_idx on public.wallet_transactions(user_id);
create index if not exists wallet_transactions_expense_id_idx on public.wallet_transactions(expense_id);
create index if not exists wallets_user_id_idx on public.wallets(user_id);
create index if not exists budgets_user_id_idx on public.budgets(user_id);
create index if not exists budgets_month_category_idx on public.budgets(month, category);
create index if not exists activation_codes_code_normalized_idx on public.activation_codes(code_normalized);
create index if not exists activation_codes_user_id_idx on public.activation_codes(user_id);
create index if not exists community_posts_author_id_idx on public.community_posts(author_id);
create index if not exists community_comments_post_id_idx on public.community_comments(post_id);

update public.wallets wallet
set starting_balance = greatest(
  coalesce(wallet.balance, 0) -
  coalesce((
    select sum(
      case lower(coalesce(txn.type, ''))
        when 'expense' then -coalesce(txn.amount, 0)
        when 'transfer_out' then -coalesce(txn.amount, 0)
        when 'savings_goal' then -coalesce(txn.amount, 0)
        when 'savings_transfer' then -coalesce(txn.amount, 0)
        when 'reset' then -coalesce(txn.amount, 0)
        when 'income' then coalesce(txn.amount, 0)
        when 'add' then coalesce(txn.amount, 0)
        when 'cash_in' then coalesce(txn.amount, 0)
        when 'deposit' then coalesce(txn.amount, 0)
        when 'transfer_in' then coalesce(txn.amount, 0)
        when 'opening_balance' then coalesce(txn.amount, 0)
        else 0
      end
    )
    from public.wallet_transactions txn
    where txn.wallet_id = wallet.id::text
  ), 0),
  0
)
where coalesce(wallet.starting_balance, 0) = 0
  and coalesce(wallet.balance, 0) > 0;
