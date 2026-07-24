# CLARA Settings Stability Repair Batch

This document records the July 2026 Settings repair pass and the invariants that should remain true.

## Account isolation

- Schedule reminders may read only the active user's Schedule storage key.
- Legacy compatibility calls must resolve the active local vault at operation time, not module initialization time.
- Signed-in theme preferences are stored per active CLARA account.
- Notification preferences remain scoped to the active local vault.
- CLARA's user-context story and behavioral-memory aliases are archived and restored per active local vault.
- CLARA memory-cabinet aliases are also archived and restored per active local vault instead of sharing one global device namespace.
- A newly switched account receives an explicit empty behavioral-memory snapshot rather than hydrating another account's historical global IndexedDB snapshot.
- Ephemeral Talk to CLARA message history is cleared when account/vault ownership changes.

## Backend authority

- Profile name changes persist through the CLARA backend account.
- Plan & Billing reads the authenticated user's backend subscription record.
- Settings support messages use the authenticated backend support inbox.
- Settings support history is readable by the signed-in user and support follow-ups stay backend-backed.
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
- The AI privacy modal adds its own history level, supports Back/Escape, traps focus, returns focus to its opener, and locks body scroll while open.
- Non-home dashboard panels use dynamic viewport height (`dvh`) to better follow installed-PWA chrome, orientation changes, and the on-screen keyboard.

## Removed legacy behavior

- The duplicate JavaScript Theme & appearance hiding patch was removed; scoped Settings CSS is the single visibility owner.
- The hidden Account double-tap demo shortcut was removed from production and its retired file deleted.
- The Settings Memory control is now constructed as its own row instead of cloning the Security & privacy control.

## Regression coverage

`tests/settings-integrity-regression.test.mjs` protects the Settings-specific frontend contracts. `tests/settings-local-only-regression.test.mjs` verifies retired Settings DOM patches stay deleted and Memory is not implemented through row cloning. `tests/settings-account-isolation-and-modal-regression.test.mjs` protects account-scoped memory and modal behavior. Backend Settings contracts are covered in `clara-backend/test/settingsBackendContract.test.js`.
