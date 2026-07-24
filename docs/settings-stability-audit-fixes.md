# CLARA Settings Stability Repair Batch

This document records the July 2026 Settings repair pass and the invariants that should remain true.

## Account isolation

- Schedule reminders may read only the active user's Schedule storage key.
- Legacy compatibility calls must resolve the active local vault at operation time, not module initialization time.
- Signed-in theme preferences are stored per active CLARA account.
- Notification preferences remain scoped to the active local vault.

## Backend authority

- Profile name changes persist through the CLARA backend account.
- Plan & Billing reads the authenticated user's backend subscription record.
- Settings support messages use the authenticated backend support inbox.
- About CLARA legal information uses backend-owned content.
- Admin Panel navigation opens the backend-authorized admin surface.

## Notification behavior

- Weekly Money Review's visible toggle is its runtime gate.
- Advanced task reminder settings do not depend on retired program tables.
- Notification storage failures must not crash Settings.
- The Settings overview must not summarize all notifications from a single reminder flag.

## Navigation and PWA behavior

- Dashboard panels participate in browser history so browser/Android Back returns toward Home instead of exiting unexpectedly.
- Settings detail views add a matching history level so Back returns to the Settings overview first.
- Non-home dashboard panels use dynamic viewport height (`dvh`) to better follow installed-PWA chrome, orientation changes, and the on-screen keyboard.

## Removed legacy behavior

- The duplicate JavaScript Theme & appearance hiding patch was removed; scoped Settings CSS is the single visibility owner.
- The hidden Account double-tap demo shortcut was removed from production and its retired file deleted.

## Regression coverage

`tests/settings-integrity-regression.test.mjs` protects the Settings-specific frontend contracts. Backend Settings contracts are covered in `clara-backend/test/settingsBackendContract.test.js`.
