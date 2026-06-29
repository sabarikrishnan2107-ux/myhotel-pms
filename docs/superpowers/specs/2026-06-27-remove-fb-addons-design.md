# Remove F&B add-on packages from Booking + Walk-in

**Date:** 2026-06-27

## Decision

Remove the "F&B add-on packages" selector (extra meals/banquets, per-pax × nights)
from the **booking** wizard (Step 4) and the **walk-in** flow (Step 4 "Extra
F&B"). Keep the config-driven **Plan meals** (rate-plan B/L/D pricing). Leave the
Configuration → Food & Hall Packages page and the `/fb-packages` API untouched.

## Removals

**Booking** (`bookings/new/page.tsx`): the F&B UI section + subtotal; `fbAddons`
state; `fbTotal` calc + its term in `extras`/total; `fbPackages` state +
`/fb-packages` fetch + `FbPkgOpt`/`ApiFbPackage` types + `mapFbPackage`; the
"+ F&B" review line; the "Meals / F&B add-ons" breakdown row.

**Walk-in** (`checkin/page.tsx`): the "Extra F&B (above rate plan)" section +
`WALKIN_FB` catalog; `fbAddons` state + `setFb`; `fbTotal` calc + its term in
`extras`; the F&B review line; the F&B lines in the Live Cost Preview; trim
"& F&B" from the Step 4 label.

## Verification

`tsc --noEmit` clean (catches any leftover reference); ESLint no new errors;
booking + walk-in pages load with no runtime errors; no "F&B add-on" section on
either page.
