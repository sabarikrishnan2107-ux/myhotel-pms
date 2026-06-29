# Full guest form in reservation check-in (like the walk-in)

**Date:** 2026-06-27
**Status:** Approved (design)

## Problem

The reservation check-in wizard (`CheckInWizard` in `checkin/page.tsx`, for booked
arrivals) opens on **Step 0 "Identity"**, which only collects ID/KYC. Reception
wants the same full **Guest** form the Express Walk-in wizard shows in its Step 1 —
name, phone, email, nationality, DOB, gender, address — so guest details can be
viewed and corrected at arrival.

## Decision

Add an editable **Guest details** section to the top of Step 0, pre-filled from the
booked guest's profile, saved back on check-in. Keep the existing Identification &
Captures block below it, unchanged.

## Requirements

1. **Guest-details section** (mirrors walk-in Step 1 markup): Full name, Phone
   (`PhoneInput`), Email (`EmailInput`), Nationality (`Select`), Date of birth
   (`Input type=date`), Gender (`Select`), Address (`Input`). Rendered in **both**
   Step-0 branches (`idOnFile` and `!idOnFile`) — defined once as a JSX variable and
   reused so the two branches stay in sync.

2. **Pre-fill** from the booked guest's profile (`guest` from `useGuests()`):
   name, phone, email, nationality, gender, address. The guest list loads async, so
   hydrate the fields once via an effect when the profile arrives (guarded so it
   doesn't clobber edits). DOB starts empty (no source field).

3. **Address** moves into this section. Remove the standalone Address field from the
   `!idOnFile` KYC block (no duplicate); it shares the existing `collectedAddress`
   state.

4. **Persistence (on completion):** save the edited name, phone, email, nationality,
   gender, address to the guest profile via `PUT /guests/:id` — for **every** arrival
   (not just `!idOnFile`). KYC capture fields (idType, idNumber, idFront/Back, photo,
   signature) persist as today, only when captured here (`!idOnFile`). Generalize the
   `persistKyc` helper to PUT a merged patch object. Lookup stays keyed by the
   original `reservation.guestName`, so editing the name is safe.

5. **DOB:** shown and editable, **not** persisted (no DOB column on the Guest record)
   — captured-not-stored, per decision.

6. **Validation/gating:** keep the current Step-0 gate (`kycComplete`). Add a light
   guard: cannot advance with an emptied name, or an edited phone/email that is
   present but invalid (`isValidPhone` / `isValidEmail`).

## Files affected

- `luxe-pms/src/app/(app)/checkin/page.tsx` (`CheckInWizard` + `persistKyc`).

## Out of scope

- Extracting a shared guest-form component between walk-in and check-in.
- Rewriting the cached `reservation.guestName` in the arrivals list when the name is
  edited mid-check-in (profile is updated; the live list row is not).
- Adding a DOB column to the Guest record / backend.

## Verification

Run the app, open a booked arrival's check-in: Step 0 shows the pre-filled,
editable guest details + the captures block; editing a field and completing check-in
persists it to the guest profile; emptying the name or entering an invalid
phone/email blocks advancing.
