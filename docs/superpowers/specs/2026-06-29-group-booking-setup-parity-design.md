# Group booking honors the same Setup settings as booking + walk-in

**Date:** 2026-06-29
**Status:** Approved (design)

## Problem

Booking (`bookings/new`) and walk-in (`checkin`) now apply three Setup-driven
rules: **rate-plan meal pricing**, **occupancy cap by room type**, and an
**opt-in extra bed**. The Group Booking flow (`groups/new`) honors **none** of
them:

- The rate plan is used **only** as a discount % (`suggestRate = base ×
  (1 − discountPct/100)`). Configured meal prices (B/L/D) are never charged, so
  AP/MAP groups are under-priced.
- Nothing checks total pax against what the blocked rooms can physically hold.
- There is no extra-bed concept anywhere in the group pricing.

Booking/walk-in operate on **one room at a time** (adults/children per room).
A group is a **block of many rooms** (`block[] = {type, qty, rate}`) with a single
`pax` ("total expected pax"). So we apply the **same Setup values**, at the
block level — not a per-room rewrite (a 60-room wedding must not become 60 rows).

## Decision

Make `groups/new` + `group-pricing.ts` read and apply the existing Setup values
already used by booking/walk-in. No new Setup screens, no DB migration (the
`block` column is JSON; the room-type and rate-plan columns already exist).

## Existing contracts reused (no changes needed)

- **Room types** (`/room-types`): `name`, `baseTariff`, `maxAdults`,
  `maxChildren`, `extraAdultRate`, `extraChildRate`
  (migrations `…create_room_types_table`, `…add_extra_person_rates_to_room_types`).
- **Rate plans** (`/rate-plans`): `code`, `name`, `inclBreakfast|inclLunch|inclDinner`,
  `breakfastPrice|lunchPrice|dinnerPrice`, `discountPct`
  (migration `…add_meal_prices_to_rate_plans`).
- **Helper** `mealPerNightPerGuest(plan)` in `luxe-pms/src/lib/booking-pricing.ts`
  — reused as-is so group meal math equals booking meal math.
- **GST slabs** (`/gst-slabs`) + `gstRateForRate(rate, slabs)` in
  `group-pricing.ts` — already used for room GST.

## Requirements

### 1. Rate-plan meal pricing

- Extend the group form's `RatePlan` type + load to carry
  `inclBreakfast|inclLunch|inclDinner` and `breakfastPrice|lunchPrice|dinnerPrice`
  (currently only `code|name|discountPct`).
- `planMeals = mealPerNightPerGuest(selectedPlan) × pax × nights`.
- The rate plan continues to drive the room **discount** (`suggestRate`),
  unchanged. Meals are **additive** on top.
- Show a **"Plan meals"** line in the Live Summary (and the detail Billing folio).
- **GST on meals:** taxed at the GST slab of the **highest group rate in the
  block** (`gstRateForRate(maxRoomRate, slabs)`); 0 if no slabs configured
  (consistent with how rooms are taxed when no slabs exist). Rationale: meals are
  part of the room package; this avoids inventing a separate food-GST Setup field.
  _(Open to a flat food-GST instead — call out in review.)_

### 2. Occupancy cap (soft warning, not a hard block)

- `blockCapacity = Σ(row.qty × roomType.maxAdults) + Σ(row.extraBeds)`.
  `maxAdults` falls back to **2** when a type has none configured.
- If `pax > blockCapacity`, show an inline warning under "Total expected pax":
  e.g. *"Blocked rooms seat up to {capacity}. Add rooms or extra beds to fit
  {pax − capacity} more."* Save is **not** blocked.
- **Why soft, not hard:** unlike booking's per-room steppers, group `pax` is an
  early estimate captured before the rooming list exists; a hard cap on an
  estimate would block legitimate tentative holds. The warning mirrors the same
  Setup occupancy numbers without obstructing the workflow.

### 3. Opt-in extra bed (per block row)

- `BlockRow` gains `extraBeds: number` (default 0), shown as a small stepper on
  each room-type row, capped at `0..row.qty` (≤ one extra bed per room, matching
  booking's "one extra bed" rule).
- Row extra-bed charge = `row.extraBeds × roomType.extraAdultRate × nights`.
  Load `extraAdultRate` with the room types.
- Each extra bed raises `blockCapacity` by 1 (Req. 2).
- **GST on extra beds:** taxed at the row's own room-rate slab
  (`gstRateForRate(row.rate, slabs)`) — it belongs to that room type.
- Persisted into the `block` JSON as `{type, qty, rate, assigned, extraBeds}`
  (additive key; backend `'block' => 'array'` needs no change).

### 4. `group-pricing.ts` — `computeGroupTotals`

- `GroupRoomRow` gains optional `extraBeds?` and `extraBedRate?`.
- New param: `planMeals` (rupee amount, pre-computed by the caller). Meal GST is
  derived **inside** the function from the rows already passed
  (`gstRateForRate(max(rows.rate), slabs)`) — no extra rate param needed.
- New buckets in the return: `extraBedSubtotal`, `mealsSubtotal`.
- `grandTotal = roomSubtotal + extraBedSubtotal + servicesSubtotal +
  mealsSubtotal + gst`, where `gst` sums room-slab GST + extra-bed-slab GST +
  service GST + meal GST.
- Keep the function pure/Node-testable; extend `group-pricing.test.ts`.

### 5. Detail page (`groups/[id]`) — make displayed totals consistent

- Load `/room-types`, `/rate-plans`, `/gst-slabs` and recompute the folio with
  `computeGroupTotals` from the stored `block` + `ratePlan` + `totalPax`, so the
  Billing breakdown **matches** what was quoted at creation.
- Show **Plan meals** and **Extra bed** lines in the Master Folio table.
- This **replaces** the current fabricated math (hardcoded "Tax (5%)" =
  `total − total/1.05`, and services shown as `total × 0.1` split evenly). It
  fixes the create-vs-detail GST inconsistency.
- The Rooms-tab room cards show an "+N extra bed" note where `extraBeds > 0`.

## Out of scope

- The two larger correctness gaps surfaced in review, deferred by the user:
  group blocks not reserving real inventory, and group check-in not creating
  Booking records / per-room folios.
- Saving `billingMode` and the selected agent, and the collision-prone group
  code (separate small-bug fixes).
- Per-room adults/children in groups (the full per-room model was rejected).
- A configurable "max extra beds per room" (fixed at 1, as in booking).

## Verification

- `tsc --noEmit` clean; ESLint no new errors.
- `group-pricing.test.ts` extended and green: meals add
  `mealPerNightPerGuest × pax × nights`; extra beds add
  `extraBeds × extraAdultRate × nights`; GST buckets correct; no-slabs → meal/
  extra-bed GST = 0.
- Live: configure AP B=300/L=500/D=600 and a room type with extraAdultRate; build
  a group (AP, 10 pax × 3 nights, 1 extra bed) → "Plan meals" = ₹42,000
  (1,400 × 10 × 3), extra bed = `rate × 3`, capacity warning appears when pax
  exceeds block capacity, and
  the detail Billing total equals the create total.
