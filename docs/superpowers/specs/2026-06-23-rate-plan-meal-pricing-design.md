# Rate-plan meal pricing → correct booking calculation

**Date:** 2026-06-23
**Scope:** Backend (3 columns + rules on `rate-plans`) + Setup (Rate Plans manager fields,
remove the redundant Meal Plans section) + booking calculation (`bookings/new`) + a pure
helper. Supersedes the meal-pricing overlap surfaced after sub-project #4.

## Goal

Make rate plans carry per-meal prices and have the New Booking flow actually apply them:
selecting a plan adds its included meals' cost and applies the plan's discount. Today the
discount is shown but **not applied**, and included meals add **₹0**. Meal pricing currently
also lives in a separate **Meal Plans** Setup section (per-pax/day per code) — that overlaps
with rate plans and is removed here so there is one source of truth.

## A. Backend — meal prices on rate plans

- **Migration** `add_meal_prices_to_rate_plans`: `breakfastPrice`, `lunchPrice`,
  `dinnerPrice` (integer, default 0) on `rate_plans`.
- **ResourceController** `rate-plans` RULES: add `'breakfastPrice' => 'integer|min:0'`,
  `'lunchPrice' => 'integer|min:0'`, `'dinnerPrice' => 'integer|min:0'`. No
  `REQUIRED_ON_CREATE` change.
- The `meal-plans` resource/table is **kept** (still used by `/revenue/group-quote`); only
  its Setup section is removed (below).

## B. Setup — Rate Plans manager

In `RatePlansManager` (in `setup-view.tsx`): beside each **B / L / D** checkbox add a small
**₹ price `<Input>`** (number). The price input is shown/enabled when that meal is checked
(an unchecked meal contributes nothing at booking regardless of its stored price). The
`RatePlan` type + seed + add-default gain `breakfastPrice`/`lunchPrice`/`dinnerPrice`.

## C. Remove the Meal Plans Setup section (de-duplicate)

Delete `meal-plans-manager.tsx` and its five `setup-view.tsx` touch-points (import,
`SECTIONS` entry, `CUSTOM_SECTIONS` membership, `INITIAL_DATA` key, render line). Leave the
backend `meal-plans` resource intact (Revenue group-quote still reads it).

## D. Booking calculation (`bookings/new`) — the fix

Carry the three prices into the rate-plan option (`RatePlanOpt` + `ApiRatePlan` +
`mapRatePlan`). Then compute via a pure helper:

- `roomAfterDiscount = round(roomSubtotal × (1 − discountPct/100))` — apply the plan discount
  (currently missing).
- `mealPerNightPerGuest = (inclB ? breakfastPrice : 0) + (inclL ? lunchPrice : 0) + (inclD ? dinnerPrice : 0)`.
- `mealCost = mealPerNightPerGuest × adults × nights` — meals priced **per adult per night**
  (matches the existing ₹95/person/day and F&B-package conventions).
- `taxBase = roomAfterDiscount + mealCost + extras`; `tax = round(taxBase × 0.05)`;
  `total = taxBase + tax`.
- The summary shows a **discount** line (−amount) and a **plan meals** line so the math is
  transparent.

Note: `roomSubtotal` already comes from the seasonal `breakdown.total` (sub-project #3); the
discount applies to that room subtotal. The existing à-la-carte "Breakfast ₹95" toggle and
F&B add-on packages remain unchanged (separate top-ups; F&B already flags "included in
{plan}").

## E. Pure helper `src/lib/booking-pricing.ts` (node-unit-tested)

```
interface PlanMeals { inclB: boolean; inclL: boolean; inclD: boolean; breakfastPrice: number; lunchPrice: number; dinnerPrice: number }
mealPerNightPerGuest(plan: PlanMeals): number
computeBookingTotals({ roomSubtotal, discountPct, plan, adults, nights, extras, taxPct }): { roomAfterDiscount, discountAmount, mealCost, tax, total }
```

## Out of scope (YAGNI)

- Removing the backend `meal-plans` resource (kept for Revenue group-quote).
- Per-pax-type meal pricing (adult vs child); uses `adults`.
- Changing the à-la-carte breakfast toggle or F&B add-on packages.
- Discounting meals (discount is room-only, per the decision).

## Testing

- Backend: `rate-plans` create/update round-trips the three price fields.
- Frontend unit (node): `booking-pricing.ts` — discount applied to room only; meal cost =
  included-meal prices × adults × nights; tax on room+meals+extras; zero-discount and
  no-meal cases.
- Browser (Playwright): set meal prices on a rate plan in Setup; in `bookings/new` pick that
  plan and confirm the total shows the discount line + plan-meal cost and the grand total
  matches; confirm the Meal Plans section no longer appears in Setup.
