# CLARA Google Play Billing Checklist

## Current customer subscription

- Product ID: `clara_commitment_249`
- Base plan ID / plan key: `committed_249`
- Base plan status: active
- Type: monthly subscription
- Price: ₱249/month
- Canonical plan: `committed_249`
- Canonical access level: `committed`
- Free trial requirement: none

The current app must not query, display, or sell any retired product ID.

## Trusted activation flow

1. The Android client opens Google Play for `clara_commitment_249`.
2. `/enroll`, onboarding, and the dashboard commitment modal must request the monthly committed subscription flow.
3. The app must not require or validate a free-trial offer token.
4. The client receives a purchase token.
5. The token is sent to `verify-google-play-purchase`.
6. The Edge Function authenticates the CLARA user and verifies the token with Google Play.
7. The backend calls `process_google_play_purchase`.
8. Supabase writes the canonical membership fields, including `subscription_expires_at`.
9. The client refreshes the profile and the shared membership resolver unlocks access.

A successful client-side order call alone must never activate membership.

## Active access handling

- `active`, `approved`, `committed`, and other trusted paid/verified backend statuses can unlock committed access after trusted backend verification.
- `cancelled`, `canceled`, `expired`, `revoked`, `payment_failed`, and `account_hold` must not be treated as active access states.
- `subscription_expires_at` must always be stored when Google returns `expiryTimeMillis`.

## Lifecycle sync

`verify-google-play-purchase` handles the first trusted activation only. Ongoing access must be maintained by `sync-google-play-entitlements`.

The lifecycle sync must run on a schedule to handle:

- cancellation
- expiry
- payment failure
- account hold / payment pending states
- renewal expiry changes

Admin override users must not be downgraded by lifecycle sync.

Recommended Supabase cron setup:

- Deploy `supabase/functions/sync-google-play-entitlements`.
- Configure `GOOGLE_SERVICE_ACCOUNT_JSON` and `SUPABASE_SERVICE_ROLE_KEY`.
- Optionally configure `GOOGLE_PLAY_SYNC_SECRET`.
- Schedule the function every 15 to 60 minutes while testing, then adjust based on production need.
- Call the function with either `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>` or `x-sync-secret: <GOOGLE_PLAY_SYNC_SECRET>`.

## Play testing requirements

Real billing tests must use an app installed from a Google Play testing track. Sideloaded builds, wrong tester accounts, unaccepted tester invitations, stale Play Store cache, or product propagation delays can make the product/base plan appear unavailable even when the code is correct.

## Historical receipts

Retired product IDs may remain only in the Edge Function and SQL product mapper as a legacy receipt allowlist. They are normalized to `committed_249` after trusted verification and are never offered for a new purchase.

## Required profile result after verification

- `plan = committed_249`
- `plan_key = committed_249`
- `subscription_plan = committed_249`
- `access_level = committed`
- `subscription_status = active`
- `subscription_label = CLARA Commitment`
- `subscription_expires_at` set from Google `expiryTimeMillis`
- `enrollment_status = approved`
- `status = active`
- `is_enrolled = true`
- `program_active = true`
- `entitlement_status = active`
- `activation_status = active`
- `is_activated = true`
- `activated_at` set by the backend
- `last_billing_sync_at` set by verification/sync
