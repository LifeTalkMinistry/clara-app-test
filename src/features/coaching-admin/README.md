# CLARA Coaching Admin

This feature is the private, admin-only operational UI for Monthly Coaching. It is intentionally UI-first and repository-first. It does not connect to Supabase and does not synchronize with the member-facing appointment page yet.

## Current data source

`data/index.js` exports the active repository through a single stable entry point:

```js
export { activeCoachingRepository as coachingRepository } from "./activeCoachingRepository";
```

`activeCoachingRepository` delegates to `mockCoachingRepository` and adds cross-operation availability consistency for status changes and schedule exceptions. React components import only the stable `coachingRepository` export.

Every repository method is asynchronous so the UI will not need to be rewritten when the backend changes.

Local mock state is stored under:

```text
claraCoachingAdminMockState
```

The developer-only reset action restores `data/mockCoachingSeed.js`.

## Repository contract

The active repository implements:

- `getOverview()`
- `getAppointments(filters)`
- `getAppointmentById(appointmentId)`
- `getAppointmentsForDate(dateKey)`
- `getAvailability(monthKey)`
- `updateAppointmentStatus(appointmentId, status)`
- `assignCoach(appointmentId, coachId)`
- `saveInternalNotes(appointmentId, notes)`
- `saveSessionOutcome(appointmentId, outcome)`
- `updateAvailability(dateKey, slotId, status, options)`
- `blockDate(dateKey, reason, type)`
- `unblockDate(dateKey)`
- `saveScheduleSettings(settings)`
- `saveDateException(dateKey, exception)`
- `blockTimeRange(dateKey, startTime, endTime, reason)`
- `removeTimeBlock(timeBlockId)`
- `getScheduleSettings()`
- `resetMockData()`

React components must not read mock arrays, localStorage, or future Supabase tables directly.

## Stable models

The mock state contains future-compatible records for:

- appointments
- member summaries
- coaches
- availability slots
- schedule settings
- date blocks, time-range blocks, and custom-hour exceptions

Appointment check-in fields preserve the current member flow vocabulary: focus, current situation, desired outcome, emotional state, coaching approach, and CLARA data permission.

## Status workflow

Supported appointment statuses:

- `pending`
- `confirmed`
- `reschedule_requested`
- `completed`
- `cancelled`
- `no_show`
- `declined`

Valid transitions are centralized in `constants.js`. Reopening a completed, cancelled, no-show, or declined record is an explicit admin action that returns it to `pending`.

Appointment status changes also synchronize the associated availability slot. Cancelling or declining releases the slot unless the date, time range, or individual slot remains blocked by an admin exception.

## Sensitive fields

Treat the following as private administrative data:

- full check-in answers
- betting-related, essential-money, and urgent-concern flags
- preparation notes
- questions to ask
- sensitivities or boundaries
- session notes and outcome
- agreed actions
- follow-up notes
- future CLARA financial snapshots

Do not put these values in URLs, query parameters, console logs, public route state, analytics events, or member-facing components.

## Future Supabase replacement

Add the future implementation at:

```text
src/features/coaching-admin/data/supabaseCoachingRepository.js
```

It must implement the same method signatures as the active repository contract. Then replace only the export in:

```text
src/features/coaching-admin/data/index.js
```

Likely future tables, not created by this draft:

- `coaching_appointments`
- `coaching_check_ins`
- `coaching_availability`
- `coaching_schedule_settings`
- `coaching_internal_notes`
- `coaching_membership_entitlements`
- `coaches`

No component in this feature should query Supabase directly.
