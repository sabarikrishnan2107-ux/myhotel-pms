# Walk-in: room-type-first selection + KYC captures in the create form

**Date:** 2026-06-27
**File:** `luxe-pms/src/app/(app)/checkin/page.tsx` (`WalkInModal`, `CheckinProcessModal`).

## A. Step 3 — pick room type, then rooms of that type

Today Step 3 lists all available rooms and auto-selects the first. Change to
Booking-style: show **room type** buttons first (each: `N available · from ₹X`),
derived from the available rooms; selecting a type reveals only the available
rooms **of that type**. Nothing pre-selected (remove the auto-select-first
effect; `roomNumber` starts `""`). Changing type clears a mismatched room.
Resume-safe: a resumed room stays selected and its type is pre-highlighted. The
Adults/Children steppers and Extra-bed toggle are unchanged. Still ends on a
specific room (walk-in checks in now). Next stays disabled until a room is picked.

## B. Photo / ID / signature capture in "Create New Guest"

Reverse the earlier `hideCaptures`: the walk-in's Create-New-Guest `NewGuestForm`
shows the live face photo, ID front/back upload, and signature pad — like Booking.

- Add a `newGuest: NewGuestData | null` state; `onSave` stores the **full** data
  (captures + ID type/number), and the create form seeds from it on edit.
- `start()` passes the captures onto the reservation as `documents`
  (`guest_photo`/`id_front`/`id_back`/`signature`) + `identity` (idType/idNumber).
- **No double capture:** `CheckinProcessModal` seeds its KYC fields (facePhoto,
  idFront/back, signature, ID type/number) from `reservation.documents`/`identity`
  when present, so the check-in KYC step opens pre-filled — staff confirm consent
  and proceed instead of re-capturing. When absent (mobile-sync or none), behavior
  is unchanged.

The Step-3 "Sync to mobile app" option stays as an alternative capture path.

## Verification

`tsc --noEmit` clean; ESLint no new errors; live screenshots of Step 3
(type → rooms) and Step 1 create (captures visible); both pages load with no
runtime errors.
