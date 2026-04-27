# CLARA Data Boundary

**Phase:** 2A — Define CLARA Data Boundary Only  
**Purpose:** Establish the internal architecture boundary for CLARA's future privacy-first, local-first system before changing any storage behavior.

This document is intentionally documentation-only. It does not migrate data, change Supabase logic, introduce IndexedDB, implement Private Sync, add encryption, or modify any financial read/write behavior.

---

## Core Principle

CLARA is currently Supabase-first for private financial data. The future privacy-first architecture should move private financial and behavioral records toward local-first storage while keeping account identity, subscription verification, access control, and community/server features on Supabase or server infrastructure.

The boundary below defines what belongs in the future local private vault versus what remains server-based.

---

## Local-First Private Data

The following data should eventually be stored locally by default inside the user's private local vault:

- Expenses
- Wallets
- Wallet transactions
- Transfers
- Budgets
- Savings goals
- Emergency fund
- Survival expense
- Life Profile
- AI financial memory/history
- Spending behavior patterns
- Private preferences

### Why this belongs locally

These records describe the user's private financial life, behavioral patterns, personal spending context, and decision history. In the final privacy-first architecture, CLARA should treat this category as private user-owned data.

---

## Supabase / Server Data

The following data should remain server-based because it supports identity, access, subscriptions, admin control, community, or optional backup transport:

- Authentication/account identity
- Subscription tier
- Google Play Billing status
- Activation status
- Admin access control
- Feed/community
- Messaging
- Coaching access
- Optional encrypted backup package storage only

### Why this belongs on the server

These records require verification, access control, multi-device account identity, billing checks, admin visibility, or shared/community behavior. They should remain server-based, but this does not mean readable private financial contents should remain server-readable in the final architecture.

---

## Architecture Rules

1. Private financial data should eventually be stored locally by default.
2. Supabase should not store readable private financial records in the final privacy-first architecture.
3. If Private Sync is enabled later, CLARA should encrypt the backup locally first before upload.
4. Supabase should store only the encrypted backup package/blob, not readable financial contents.
5. Login/account access and subscription verification remain server-based.
6. Guest/local-only mode must use a separate local vault.
7. No private financial data should use global fallback keys.
8. The stable local owner key should eventually be `localUserId`, mapped to Supabase auth `user.id` when logged in.

---

## Future Storage Direction

### Guest / Local-Only Mode

Guest users should use a separate local vault that is not automatically mixed with authenticated account data. If a guest later logs in, CLARA should intentionally map, import, or connect that vault only through a controlled migration or sync process.

### Logged-In Mode

Logged-in users should still keep private financial records local-first. Supabase auth `user.id` may be mapped to a stable local owner key, but private records should not depend directly on readable Supabase tables in the final design.

### Private Sync Mode

Private Sync, when introduced later, should work as encrypted backup transport only:

1. CLARA reads the user's local vault.
2. CLARA encrypts the backup package locally on the device.
3. CLARA uploads only the encrypted package/blob to Supabase.
4. Supabase stores the encrypted backup but cannot read the financial contents.
5. A new device downloads the encrypted package and decrypts it locally only after the user is authorized and the correct local unlock process is satisfied.

---

## Non-Goals For Phase 2A

This phase does **not** implement any of the following:

- IndexedDB
- Private Sync
- Encryption
- Data migration
- Supabase removal
- Financial storage behavior changes
- UI changes
- Dashboard changes
- Navbar changes
- Theme changes
- Glass/glow styling changes
- Existing behavior changes

---

## Recommended Next Step

Proceed next with **Phase 2B — Local IndexedDB Foundation**.

Phase 2B should introduce the local storage foundation carefully, without changing the current financial read/write behavior yet unless explicitly approved in that phase.
