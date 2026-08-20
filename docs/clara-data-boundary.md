# CLARA Data Boundary

## Current Architecture

CLARA is a **local-first app with a dedicated CLARA backend**. The frontend must not connect directly to Supabase or another database provider.

The purpose of this boundary is to keep private financial behavior data close to the user while allowing account, shared, administrative, and delivery features to use CLARA-controlled server APIs.

## Device-Local Private Data

The following records are device-local by default unless a specific feature explicitly documents a server-owned copy:

- Wallets and wallet transactions
- Expenses
- Budgets
- Money Schedule / calendar money context that is derived locally
- Savings goals
- Emergency fund
- Survival expense
- Transfers
- Life Profile and private financial context
- Private spending behavior and decision context
- Local preferences and dashboard state

These records are used to give CLARA practical decision context. They are not required to be mirrored into a cloud database in order for the core money-coaching experience to work.

## CLARA Backend Data

The dedicated CLARA backend owns server-verified or shared features, including where applicable:

- Account authentication and account identity
- Membership and billing status
- Activation and access control
- Admin-authorized content
- Community/feed data
- Messaging and support delivery
- Coaching/server-owned access data
- Push-notification registrations and server push delivery
- Other features that explicitly require cross-device or shared server state

Frontend code must reach these capabilities through CLARA backend API clients. It must not contain database credentials or direct database-provider SDK calls.

## Architecture Rules

1. Private financial data stays local-first by default.
2. Account and shared data goes through the CLARA backend API.
3. The frontend does not connect directly to Supabase, PostgreSQL, or another database service.
4. Server credentials and privileged database access never ship in the app bundle.
5. Browser/local vault ownership remains scoped to the active CLARA account or guest vault.
6. Optional backup/sync features must be explicit, user-controlled, and designed so they do not silently turn local private data into general server-readable data.
7. Push notification delivery is registered through the CLARA backend; Firebase/FCM is a delivery provider, not the app database.
8. Compatibility adapters may preserve old query-shaped call sites during migration, but they must resolve only to device-local storage or CLARA backend APIs and must never restore a direct Supabase runtime.

## Runtime Guardrail

The app repository intentionally blocks reintroduction of:

- `@supabase/supabase-js`
- Supabase cloud frontend environment variables
- the former cloud Supabase client
- Supabase quota handling
- the legacy `supabase/` migrations and edge-functions directory

A regression test enforces these rules in CI.

## Product Context

CLARA's goal is decision clarity and accountability, not accounting-grade real-time reconciliation. Local financial records and scheduled/assumed money context exist to help the user make wiser money decisions, while actual bank, cash, e-wallet, debt, and other authoritative records remain outside CLARA's claim of financial accuracy.
