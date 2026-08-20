# CLARA Google Play Billing Checklist

## Product rule

CLARA core app access is free. A Google Play purchase must not be used to unlock or restrict normal finance, AI, dashboard, community, or accountability features.

Paid flows are support/coaching flows and must stay separate from core app entitlement.

## Android purchase requirements

- Use the native Google Play Billing bridge for product discovery, purchase launch, ownership queries, and acknowledgement.
- Never treat a successful client-side purchase callback by itself as trusted server verification.
- Pending purchases must not be treated as completed purchases.
- Purchased items should be acknowledged when required by Google Play.
- Keep purchase tokens and order identifiers out of logs except for safely masked diagnostics.

## Backend ownership

Any future server-verified Google Play purchase flow must be implemented by the CLARA Backend. The app must send the minimum required purchase evidence to a dedicated authenticated CLARA Backend endpoint and receive a canonical support/payment result.

Do not reintroduce a frontend database SDK or direct database writes for billing verification.

At the time of this checklist, do not assume a server purchase-verification endpoint exists unless it is present and tested in `clara-backend`.

## Support and entitlement separation

A support purchase may update supporter state or payment history, but it must not mutate the user's normal CLARA app access.

Expected invariant:

```text
support/payment state changes
!=
core CLARA feature entitlement changes
```

## Play testing requirements

Real billing tests must use an app installed from a Google Play testing track. Sideloaded builds, the wrong tester account, an unaccepted tester invitation, stale Play Store cache, or product propagation delays can make a product unavailable even when the native integration is correct.

## Release checklist

- Correct application package id and signing configuration.
- Correct Play testing track and tester account.
- Product/base plan is active when a paid product is intentionally offered.
- Pending state does not grant completed purchase status.
- Purchase acknowledgement succeeds when required.
- Restore/ownership query handles an already-owned item safely.
- Failed network/server verification cannot create trusted paid state.
- Core CLARA features remain available independently of support/payment state.
