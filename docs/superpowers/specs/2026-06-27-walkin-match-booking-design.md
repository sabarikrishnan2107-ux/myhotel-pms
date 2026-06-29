# Walk-in wizard mirrors the Booking wizard

**Date:** 2026-06-27
**Files:** `luxe-pms/src/app/(app)/checkin/page.tsx` (`WalkInModal`), reusing
`luxe-pms/src/components/guests/new-guest-form.tsx`.

## Context

The Booking wizard (`bookings/new/page.tsx`) and the Walk-in wizard already share
the same shell (`max-w-6xl` container, 2-col layout), stepper bar, Live Summary
panel, footer, and 6-step structure. Four gaps remain; align all four.

## Changes

**1. Guest step (Step 1) → Booking's guest UI.** Keep Search/Create tabs. In
Create mode, render the shared `<NewGuestForm>` (name, phone, email, address,
DOB, gender, nationality, ID type/number + optional capture cards) instead of the
plain inline fields. Adopt booking's pattern: `guest` (selected existing) /
`newGuest` (created) state + a derived `selectedGuestDisplay`. `start()` and the
receipt read guest data from there. Step-1 validity = a guest is selected/created.
Walk-in's mobile-sync stays; check-in still forces KYC if not captured.

**2. Stay extras → Booking placement + style.** Move Early check-in / Late
check-out from Step 4 to Step 2 (Dates), rendered with a `PricedToggleCard`
matching booking. Step 4 keeps only the rate plan + inclusions preview. No
half-day toggle (checking in now).

**3. Payment step → Booking style.** Replace the icon mode-grid with booking's
text mode buttons; add a "Special instructions / guest requests" textarea (new
state, shown in review). Modes stay Cash/Card/UPI/Bank/Online; per-mode reference
fields unchanged.

**4. Visual polish.** Use booking's default `<Label>` sizing (drop `text-xs`),
matching section headers, and align the walk-in helper components (stepper /
review row / toggles / meal pills) to booking's exact markup. Reuse the shared
`NewGuestForm`; for the small local helpers, match booking's markup in-place in
checkin/page.tsx (do not modify the working booking page).

## Unchanged by design

Walk-in picks a specific room (not a room type); Step 6 ends with "Start check-in"
launching `CheckinProcessModal` (no future-booking POST).

## Verification

Per area: `tsc --noEmit` clean, ESLint no new errors. End: live screenshots of
each walk-in step vs booking; both pages load with no runtime errors.
