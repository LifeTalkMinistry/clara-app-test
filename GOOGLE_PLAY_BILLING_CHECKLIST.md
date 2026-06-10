# CLARA Google Play Billing Checklist

## Current customer subscription

- Product ID: `clara_commitment_249`
- Type: monthly subscription
- Price: ₱249/month
- Canonical plan: `committed_249`
- Canonical access level: `committed`

The current app must not query, display, or sell any retired product ID.

## Trusted activation flow

1. The Android client opens Google Play for `clara_commitment_249`.
2. The client receives a purchase token.
3. The token is sent to `verify-google-play-purchase`.
4. The Edge Function authenticates the CLARA user and verifies the token with Google Play.
5. The backend calls `process_google_play_purchase`.
6. Supabase writes the canonical membership fields.
7. The client refreshes the profile and the shared membership resolver unlocks access.

A successful client-side order call alone must never activate membership.

## Historical receipts

Retired product IDs may remain only in the Edge Function and SQL product mapper as a legacy receipt allowlist. They are normalized to `committed_249` after trusted verification and are never offered for a new purchase.

## Required profile result after verification

- `plan = committed_249`
- `plan_key = committed_249`
- `subscription_plan = committed_249`
- `access_level = committed`
- `subscription_status = active`
- `subscription_label = CLARA Commitment`
- `enrollment_status = approved`
- `status = active`
- `is_enrolled = true`
- `program_active = true`
- `entitlement_status = active`
- `activation_status = active`
- `is_activated = true`
- `activated_at` set by the backend
