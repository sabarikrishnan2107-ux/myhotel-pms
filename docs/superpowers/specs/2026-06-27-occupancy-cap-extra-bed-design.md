# Cap occupancy by room type + opt-in extra bed

**Date:** 2026-06-27
**Status:** Approved (design)

## Problem

The Adults/Children steppers in New Booking (step 3) and Express Walk-in (step 3)
use fixed maxes (booking: 6/4; walk-in: unbounded), independent of the chosen room
type. Staff want occupancy capped at the room type's configured **Incl. adults /
Incl. children** (Setup → Room Types) — you can't add more than that — with the
existing "extra bed" charge kept as an **opt-in** way to seat one more.

## Decision

Hard-cap the steppers at the room type's included occupancy. After a room type is
selected, show an **Extra bed** toggle (default off); enabling it lifts the **adult**
cap by one and adds the type's extra-bed charge. Apply to **both** flows.

## Requirements

1. **Hard cap.** Adults stepper max = `selectedType.maxAdults`; Children max =
   `selectedType.maxChildren`. The `+` button disables at the cap; `-` disables at min.
   - Booking `selectedType` = the chosen room type. Walk-in `selectedType` = the
     selected room's type (room is picked in the same step).
   - Before a type/room is chosen, fall back to 6 adults / 4 children.

2. **Opt-in extra bed.** Once a type/room is chosen, show the existing extra-bed
   toggle (`extraBedForExtra`) regardless of current count (not gated on already
   exceeding). Label it `Extra bed · +₹{extraAdultRate}/night`.
   - **Enable:** raise the adult cap by 1 and bump Adults to `maxAdults + 1` so the
     charge appears immediately ("if I enable, amount adds"). One extra bed max.
   - **Disable:** clamp Adults back to `maxAdults`; charge returns to 0.
   - Charge reuses the existing `extraBedCharge = extraBedForExtra && extraOcc.extraAdults>0 ? extraOcc.total : 0`
     (= `extraAdultRate × extra adults × nights`), already wired into the total and
     the live-summary "Extra bed" line.

3. **Clamp on change.** A `useEffect` on the derived `(adultsMax, childrenMax)`
   clamps current Adults/Children down whenever the cap shrinks (smaller type chosen,
   or extra bed disabled).

4. **Children** stay hard-capped at Incl. children — extra bed seats one extra adult
   only.

## Files affected

- `luxe-pms/src/app/(app)/bookings/new/page.tsx` (`Stepper` + step-3 occupancy).
- `luxe-pms/src/app/(app)/checkin/page.tsx` (`NumStepper` + `WalkInWizard` step-3).

## Out of scope

- A configurable "max extra beds" Setup field (fixed at 1 for now).
- The separate flat-rate "Extra bed" add-on in booking step 4 (`extraBed`/₹900) —
  unrelated, left as-is.
- The type-first room selection (separate, still pending).

## Verification

Run both flows: pick a room type, confirm Adults `+` stops at the type's Incl. adults
and Children at Incl. children; enable Extra bed → Adults can reach max+1 and the
extra-bed amount appears in the summary; disable → count clamps back and the charge
clears; switching to a smaller type clamps counts down.
