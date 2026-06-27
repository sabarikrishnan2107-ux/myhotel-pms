# Extra-Person Charges — Design

**Date:** 2026-06-25
**Status:** Approved design → implementation plan next
**Scope:** Charge for guests beyond a Room Type's included occupancy. Each Room Type's `maxAdults`/`maxChildren` are included free; bookings that exceed them are charged a per-night extra-adult and/or extra-child rate configured on the Room Type. Apps: `hotel-pms-api` (Laravel) + `luxe-pms` (Next.js).

## 1. Background / current state

- `room_types` table has `maxAdults`, `maxChildren`, `baseTariff` (+ name, code, sizeSqft, amenities, active, company_id). It is company-scoped via `BelongsToCompany`. There is **no** extra-person rate column.
- `rooms` has its own `maxAdults`/`maxChildren`/`extraBedRate` — used by the per-room Edit modal, NOT by booking.
- The New Booking wizard (`luxe-pms/src/app/(app)/bookings/new/page.tsx`) loads `/room-types` (currently reads `{name, baseTariff}`), uses a generic Adults stepper (1–6) and a Children stepper, and does **not** charge for occupancy at all (it charges breakfast per adult as a meal add-on, and a few flat extras). `rate` = the selected type's `baseTariff`.
- `/room-types` CRUD is the generic `ResourceController` (`MODELS['room-types'] = RoomType`); its per-resource validation lives in `ResourceController` (the `room-types` rules block).
- Room Types are managed in Setup (`luxe-pms/src/app/(app)/setup/setup-view.tsx`).

## 2. Goal

A booking is charged only for guests **beyond** the chosen Room Type's `maxAdults`/`maxChildren`, at per-night rates set on that Room Type. Within the max → ₹0. Configurable in Setup → Room Types. Backward compatible (rates default to 0).

## 3. Data model (one additive migration)

- Add to `room_types`:
  - `extraAdultRate` — integer, default `0` (₹ per extra adult per night).
  - `extraChildRate` — integer, default `0` (₹ per extra child per night).
- Nullable-with-default or NOT NULL default 0 — use `integer ... default 0`. Existing rows get 0 (no charge until configured).
- `RoomType` model uses `$guarded = ['id']` (mass-assignable) — no model change needed beyond confirming.

## 4. API

- `ResourceController` `room-types` validation rules: add `'extraAdultRate' => 'sometimes|integer|min:0'` and `'extraChildRate' => 'sometimes|integer|min:0'` so create/update accept them.
- The generic index returns the full model, so the two fields are already exposed to the frontend once the columns exist; no read change needed.

## 5. Setup UI (Setup → Room Types)

- In the Room Type editor form (`setup-view.tsx`), add two numeric inputs beside the existing Max adults / Max children / Base tariff: **"Extra adult (₹/night)"** (`extraAdultRate`) and **"Extra child (₹/night)"** (`extraChildRate`). They load from and save to the room-type record via the existing save path.
- Default display 0 when unset.

## 6. Booking logic (New Booking wizard)

- Extend the `roomTypes` state shape to include `maxAdults`, `maxChildren`, `extraAdultRate`, `extraChildRate` (read from `/room-types`).
- Resolve the selected type:
  ```
  const t = roomTypes.find(rt => rt.name === roomType);
  const maxA = t?.maxAdults ?? 0, maxC = t?.maxChildren ?? 0;
  const extraAdultRate = t?.extraAdultRate ?? 0, extraChildRate = t?.extraChildRate ?? 0;
  const extraAdults = Math.max(0, adults - maxA);
  const extraChildren = Math.max(0, children - maxC);
  const extraGuestCharge = (extraAdults * extraAdultRate + extraChildren * extraChildRate) * nights;
  ```
- Fold `extraGuestCharge` into the bill: add it to `extras` (so tax + total include it), OR show it as its own line then include in subtotal+extras for tax. Decision: add it into `extras` and render a dedicated **"Extra guests"** row in the Live Summary (only when `extraGuestCharge > 0`), with a sub-label like `+{extraAdults}A / +{extraChildren}C`. Tax (5%) applies to it (it is part of the room bill).
- Steppers: allow Adults/Children to exceed the type max (so extra guests can be added). Keep a sane upper cap (Adults max = `maxA + 4` or a constant ≥ current 6; Children max similar). Show an inline hint under the stepper when over max, e.g. "+1 adult · ₹500/night".
- Persist: the booking payload already sends `adults`/`children`/`pax` and totals; the new charge flows through `extras`/`total`. No new payload field required (the charge is reflected in the amounts), but optionally include `extraGuestCharge` for clarity if the existing payload itemizes extras.
- Unchanged: breakfast/meal-plan charge, flat extras, advance logic. The per-room Edit modal is untouched.

## 7. Error handling / edge cases

- Type not yet selected → no pricing shown (existing behavior from the prior fix); extra-guest charge is 0.
- Rates default 0 → no charge (backward compatible).
- `adults`/`children` never negative (steppers enforce min). `extraAdults/Children` clamped at ≥0.
- A type with `maxAdults` 0 (misconfigured) would charge from the first adult — acceptable; setup should set sane maxes.

## 8. Testing

**Backend:**
- Migration adds `extraAdultRate`/`extraChildRate` (default 0) to `room_types`; existing rows = 0.
- `POST/PUT /api/room-types` accepts and persists the two rates (validation integer ≥ 0); they round-trip via index.

**Frontend (manual / build):**
- Booking a type with `maxAdults=2, extraAdultRate=500`, 3 nights: 2 adults → no extra-guest line; 3 adults → "Extra guests +1A" = ₹1,500, included in total + taxed.
- `maxChildren=1, extraChildRate=300`: 2 children → +1C = ₹900 × ... per night.
- Rates 0 → no charge even when over max.
- Setup → Room Types: set/save the two rates; reload shows them.

## 9. Out of scope

- Per-room override of the extra-person rate (booking uses the type).
- Changing the breakfast/meal-plan model.
- Capping occupancy by extra-bed count (just a sane stepper cap).
- Group bookings / hall bookings (only the standard New Booking wizard).

## 10. File touch-list

- `hotel-pms-api/database/migrations/2026_06_25_000001_add_extra_person_rates_to_room_types.php`
- `hotel-pms-api/app/Http/Controllers/Api/ResourceController.php` (room-types validation rules)
- `hotel-pms-api/tests/Feature/RoomTypeExtraRatesTest.php`
- `luxe-pms/src/app/(app)/setup/setup-view.tsx` (Room Type form: two inputs)
- `luxe-pms/src/app/(app)/bookings/new/page.tsx` (read type fields; compute + show extra-guest charge; stepper caps/hints)
