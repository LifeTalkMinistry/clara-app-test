# CLARA Google Play Billing Checklist

## Current customer subscription

- Product ID: `clara_commitment_249`
- Base plan ID: `monthly`
- Base plan status: active
- Offer ID: `trial-7-days`
- Offer status: active
- Offer phase: 7-day free trial
- Type: monthly subscription
- Price after trial: ₱249/month
- Canonical plan: `committed_249`
- Canonical access level: `committed`

The current app must not query, display, or sell any retired product ID.

## Trusted activation flow

1. The Android client opens Google Play for `clara_commitment_249`.
2. `/enroll` and the dashboard commitment modal must request the 7-day trial flow with `purchaseIntent: "trial_7d"` and `trialDays: 7`.
3. Google Play must show the free trial before the user confirms.
4. If Google Play cannot return an eligible 7-day offer, the app must block purchase and show the trial unavailable/product unavailable guidance.
5. The client receives a purchase token.
6. The token is sent to `verify-google-play-purchase`.
7. The Edge Function authenticates the CLARA user and verifies the token with Google Play.
8. The backend calls `process_google_play_purchase`.
9. Supabase writes the canonical membership fields, including `subscription_expires_at` and trial dates for trial users.
10. The client refreshes the profile and the shared membership resolver unlocks access.

A successful client-side order call alone must never activate membership.

## Trial handling

- `trialing` is a successful access state.
- `trialing`, `active`, and `approved` should unlock committed access after trusted backend verification.
- `cancelled`, `canceled`, `expired`, `revoked`, `payment_failed`, and `account_hold` must not be treated as active access states.
- `trial_ends_at` must be stored for trial users.
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

Real billing tests must use an app installed from a Google Play testing track. Sideloaded builds, wrong tester accounts, unaccepted tester invitations, stale Play Store cache, or product propagation delays can make the product/offer appear unavailable even when the code is correct.

## Historical receipts

Retired product IDs may remain only in the Edge Function and SQL product mapper as a legacy receipt allowlist. They are normalized to `committed_249` after trusted verification and are never offered for a new purchase.

## Required profile result after verification

- `plan = committed_249`
- `plan_key = committed_249`
- `subscription_plan = committed_249`
- `access_level = committed`
- `subscription_status = active` or `trialing`
- `subscription_label = CLARA Commitment`
- `subscription_expires_at` set from Google `expiryTimeMillis`
- `trial_started_at` set for trial users
- `trial_ends_at` set for trial users
- `enrollment_status = approved`
- `status = active`
- `is_enrolled = true`
- `program_active = true`
- `entitlement_status = active`
- `activation_status = active`
- `is_activated = true`
- `activated_at` set by the backend
- `last_billing_sync_at` set by verification/sync
