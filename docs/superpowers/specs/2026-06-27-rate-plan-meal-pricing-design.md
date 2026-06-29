# Configured rate-plan meal prices drive booking + walk-in totals

**Date:** 2026-06-27

## Problem

The "Pricing & Rate Plans" config editor saves per-plan meal prices
(`breakfastPrice` / `lunchPrice` / `dinnerPrice`) to the DB, but **nothing reads
them**. Booking and walk-in use hardcoded meal numbers, so the prices the user
types never show or calculate. Also the price inputs display a literal `0`
instead of an empty field.

## Current state (from exploration)

- **Config editor** `setup-view.tsx` `RatePlansManager`: B/L/D each = checkbox
  (`inclBreakfast`…) + number input `value={p.breakfastPrice ?? 0}` (shows "0").
  Saves via PUT `/rate-plans`. Loads via GET `/rate-plans`.
- **Backend**: `rate_plans` has `breakfastPrice|lunchPrice|dinnerPrice` integer
  columns; API validates + round-trips them (camelCase).
- **Helper exists but unused**: `luxe-pms/src/lib/booking-pricing.ts` →
  `mealPerNightPerGuest(plan) = (inclB?bPrice:0)+(inclL?lPrice:0)+(inclD?dPrice:0)`.
- **Booking** `bookings/new/page.tsx`: loads `/rate-plans` but ignores meal
  prices; charges hardcoded `95 * adults * nights` breakfast.
- **Walk-in** `checkin/page.tsx`: hardcoded `RATE_PLANS` with `surchargePerNight`
  (MAP +200 / AP +400) + plan auto-fills hardcoded F&B (`WALKIN_FB` 450/850/1200).

## Decisions (approved)

- Meal charge = configured price **per guest, per night**:
  `mealPerNightPerGuest(plan) × (adults + children) × nights`.
- **Replace** the old hardcoded meal charges (booking's ₹95 breakfast; walk-in's
  `surchargePerNight` + plan→F&B auto-fill). À-la-carte "Extra F&B" add-ons stay.

## Design

**1. Config inputs empty, not "0"** (`setup-view.tsx`): the three meal price
inputs use `value={p.breakfastPrice || ""}` (etc.) with a placeholder, so an
unset price is blank. `onChange` still coerces to a number (≥0); blank → 0.

**2. Shared rule:** use the existing `mealPerNightPerGuest()`; total plan meal
charge = `mealPerNightPerGuest(plan) × pax × nights` where pax = adults + children.

**3. Booking** (`bookings/new/page.tsx`):
- Extend `ApiRatePlan`/`mapRatePlan` to carry `inclBreakfast|inclLunch|inclDinner`
  + `breakfastPrice|lunchPrice|dinnerPrice`.
- Compute `planMealsTotal` for the selected plan; add to `extras`/`total`; show a
  "Plan meals (B/L/D)" line in the cost breakdown.
- Remove the hardcoded ₹95 breakfast charge (and its now-redundant toggle).

**4. Walk-in** (`checkin/page.tsx`):
- Fetch `/rate-plans`; for the selected plan code, read config inclusions + prices.
- `planMealsTotal = mealPerNightPerGuest(dbPlan) × (adults+children) × nights`;
  add to grand total; show a "Plan meals" line in the Live Cost Preview.
- Remove `surchargePerNight` from the math and stop auto-filling F&B from the
  plan (`applyRatePlan` no longer seeds `fbAddons`). The "Extra F&B (above rate
  plan)" section is unchanged for manual extras.

## Out of scope

Plan discount % and refundable handling (separate fields, unchanged). À-la-carte
F&B catalog (`/fb-packages` / `WALKIN_FB`) pricing.

## Verification

- `tsc --noEmit` clean; ESLint no new errors; backend `RatePlanMealPriceTest`.
- Live: set e.g. AP B=300/L=500/D=600 in config → Save. Booking + walk-in with
  AP, 2 guests × 3 nights → "Plan meals" line = ₹8,400; total reflects it.
- Empty inputs: unset meal price renders blank, not "0".
