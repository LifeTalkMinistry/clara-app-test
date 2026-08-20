# CLARA Data Boundary

## Purpose

This document defines the current storage and service boundary for CLARA.

## Core principle

Private financial behavior belongs to the user's local CLARA vault. Shared account and community capabilities belong to the CLARA Backend.

## Local-first private data

The following data is local-first and stored in CLARA's IndexedDB-based private vault unless a feature explicitly defines another trusted flow:

- Expenses
- Wallets
- Wallet transactions
- Transfers
- Budgets
- Savings goals
- Emergency fund
- Survival-expense state
- Life Profile data intended to remain private
- Spending behavior context
- Private preferences

Private finance operations must go through the local finance repository and local vault ownership rules. They must not fall back to a frontend cloud database client.

## CLARA Backend data

The CLARA Backend owns shared and account-scoped services such as:

- Authentication and account identity
- Canonical profile/account information
- Admin access control
- Community/feed data
- Messaging and support
- Coaching scheduling
- Push notification registration and preferences
- Shared content and other server-owned features
- Optional encrypted backup/device-transfer services where explicitly implemented

Frontend requests to these services go through the CLARA Backend client using `VITE_CLARA_API_URL` when an endpoint override is required.

## Architecture rules

1. Private finance records are local-first.
2. Finance writes must use the CLARA finance repository rather than direct remote table writes.
3. Local records are scoped by a stable local vault/user identifier; no global finance fallback key is allowed.
4. Authentication and shared multi-user features use the CLARA Backend.
5. Private server credentials never belong in the frontend bundle.
6. Optional backup/sync must be explicitly designed and must not silently turn local finance into remotely readable finance data.
7. Guest/local-only data must remain isolated until an intentional migration or device-transfer action occurs.
8. Deprecated cloud-database compatibility paths must not be reintroduced as fallbacks.

## Device transfer and backup

When CLARA transfers private data between devices, the flow must preserve vault ownership and must require an intentional user action. A failed account/backend request must never cause one user's local finance data to be exposed to another account or global storage key.

## Implementation references

- `src/lib/localFinanceStore.js`
- `src/lib/financeRepositoryCore.js`
- `src/lib/financeRepository.js`
- `src/lib/clara-backend-client.js`
- `src/lib/start-local-vault-identity.js`
