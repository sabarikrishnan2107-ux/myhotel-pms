# "Sync to mobile app" for Express Walk-in check-in — design

**Date:** 2026-06-26
**Status:** Awaiting review
**Base branch:** `feat/resume-incomplete-draft` (has the mobile-sync feature; `main` does not)

## Problem

The new-booking guest form can push a booking to the tablet so reception
captures the guest's face photo, ID front/back & signature on the mobile app,
and they flow back into the form ("Sync to mobile app"). The **Express Walk-in
Check-in** modal has no such option — walk-in KYC can only be captured at the
desk during the check-in process. Reception wants the same tablet-capture option
for walk-ins.

## Decision (agreed)

**Scoped — mirror the guest form.** Add the same sync card to the walk-in
modal: it creates a draft booking on the server so the tablet can capture
documents, shows live per-document progress, and shows a "Captured ✓" summary.
The walk-in's own **Start check-in** flow is unchanged (it already has its
`forceKycCapture` desk step). We do **not** thread the captured docs into the
downstream `CheckinProcessModal` (that was the rejected deeper option).

## What already exists (reused as-is)

- `components/guests/mobile-sync-dialog.tsx` — `MobileSyncDialog`, a purely
  presentational modal for the `creating | waiting | done | error` states with
  live per-document progress. Reused unchanged.
- The proven controller pattern in `app/(app)/bookings/new/page.tsx`
  (`requestMobileSync`) and `components/guests/new-guest-form.tsx` (sync state
  machine + 3 s polling of `/bookings/{id}` for `verification_status` ===
  `"synced"`). We replicate this inside `WalkInModal`.
- API: `POST /bookings` (create draft), `GET /bookings/{id}` (poll documents),
  `POST /bookings/{id}/verification` (push any already-captured docs). No
  backend changes.

## Implementation — all inside `WalkInModal` (`app/(app)/checkin/page.tsx`)

### State (mirrors new-guest-form)
`syncState: "idle" | "creating" | "waiting" | "done" | "error"`, `syncBooking:
{ id; bookingNo } | null`, `syncDocs`, `syncErr`, `dialogOpen`.

### `requestWalkInSync()`
Like `requestMobileSync`: guard (reuse `syncBooking` if already created), then
`apiPost("/bookings", …)` with the walk-in's current data — `guestName`,
`roomNumber` (the chosen room), `roomType`, `source: "Walk-in"`, `checkIn`/
`checkOut`/`nights`/`adults`/`children`, `ratePlan: ratePlanCode`, `total`,
`advance`, `balance`, `status: "pending"` (draft, so it shows on the tablet but
not as a confirmed arrival). Uses the **existing** `bookingNo` (`WK…`) the modal
already generates, so the reference is consistent. Returns `{ bookingId,
bookingNo }` or `null` on failure.

### Polling effect
While `syncState === "waiting"`, poll `GET /bookings/{id}` every 3 s; store
`documents` into `syncDocs` for live progress; when `verification_status ===
"synced"`, set `syncState = "done"`. Cleared on unmount / cancel. (Copy of the
new-guest-form effect.)

### UI
- A "Capture on the mobile app" card in the **Guest basics** `WalkInSection`
  (matches the guest-form card: icon + blurb + "Sync to mobile app" button).
  Requires name + phone first (same guard).
- Renders `<MobileSyncDialog>` when `dialogOpen && syncState !== "idle"`, wired
  to `onCancel` (reset), `onHide` (close dialog, keep polling), `onDone` (close,
  keep "Captured ✓").
- When `syncState === "done"`, the card shows a compact "Captured ✓" row with
  the four thumbnails (reuse the guest-form done layout).

### Guarded edge cases
- Re-clicking "Sync" reuses the same draft booking (no duplicates within the
  modal session).
- Network failure → `error` state with retry.
- Closing the walk-in modal clears the poll timer.

## Known caveat (accepted with the scoped choice)

In scoped mode the synced draft booking is a separate server record from
whatever the check-in later persists. Using the same `WK…` reference keeps them
correlated; full reconciliation (one booking end-to-end) was the rejected
deeper option and can be a later enhancement.

## Out of scope

- Threading captured docs into `CheckinProcessModal` / pre-filling its KYC step.
- Any backend change.
- The walk-in phone field upgrade (covered by the separate phone-input spec).

## Testing

- The new booking-payload assembly is the only non-trivial pure-ish bit; extract
  it as a small helper and unit-test it (vitest) — correct fields, draft status,
  reused reference. The state machine/polling mirror an already-shipped,
  manually-verified component.
- Manual: run the app → Check-in → Express Walk-in → enter name+phone → Sync to
  mobile app → confirm the dialog shows creating → waiting (live progress) and
  that a draft booking is created server-side.
