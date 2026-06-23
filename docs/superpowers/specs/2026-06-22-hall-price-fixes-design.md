# Hall / banquet booking price fixes

**Date:** 2026-06-22
**Scope:** Small backend change (one column + rule) + Setup form field + `halls/new`
pricing math + a pure helper. Sub-project #2 of the Setup-flow audit.

## Goal

Fix the New Hall Booking total so it matches configured data: add the per-hall **setup
fee**, use the hall package's **real GST** (e.g. 18%) instead of the hardcoded 5%, and make
the **over-capacity surcharge** a per-hall configurable field instead of the hardcoded ₹35.

## Current state (`luxe-pms/src/app/(app)/halls/new/page.tsx`, lines 64–79)

Hall venues, banquet packages, and extra services are already read live from Setup
(`/hall-packages`, `/banquet-packages`, `/extra-services`). But:
- `hall.setupFee` (configured per hall) is **never added** to `subtotal`.
- `tax = subtotal * 0.05` — **hardcoded 5%**, ignores the hall package's `gst` (set to 18%
  in Setup).
- `extraPaxCost = extraPax * 35` — **hardcoded** ₹35/over-capacity guest.

## Design

### A. Backend — add `extraPaxFee` to hall packages
- **Migration** `add_extra_pax_fee_to_hall_packages`: nullable/`default(0)` integer
  `extraPaxFee` on `hall_packages`.
- **ResourceController** `hall-packages` RULES: add `'extraPaxFee' => 'integer|min:0'`. (No
  change to REQUIRED_ON_CREATE; `HallPackage` is `$guarded=['id']` so it persists.)
- `setupFee` and `gst` columns already exist — no schema change for those.

### B. Setup — expose `extraPaxFee` in the hall form
- In `FoodHallManager`'s hall add/edit form (in `setup-view.tsx`), add an **"Extra pax fee
  (₹/guest over capacity)"** number field next to the existing `setupFee`/`gst` fields, wired
  into the same persisted row. (setupFee + gst fields already exist in the form.)

### C. `halls/new` pricing — use real config
- Ensure the `Venue` type includes `setupFee`, `gst`, `extraPaxFee` (add any missing).
- Replace the pricing block:
  - `extraPaxCost = extraPax * (hall?.extraPaxFee ?? 0)` (was `* 35`)
  - `subtotal = hallCost + (hall?.setupFee ?? 0) + foodCost + extrasCost + extraPaxCost`
  - `tax = round(subtotal * (hall?.gst ?? 0) / 100)` (was `subtotal * 0.05`)
  - `total = subtotal + tax`
- The summary UI should show the setup fee as a line and label tax with the actual rate
  (e.g. "GST (18%)").

### D. Pure helper `hall-pricing.ts` (node-unit-tested)
`computeHallTotals({ hallCost, setupFee, foodCost, extrasCost, extraPax, extraPaxFee, gstPct })
→ { subtotal, tax, total }`. The page computes `hallCost`/`foodCost`/`extrasCost` as today
and delegates the assembly + GST to the helper. Unit tests cover: setup fee included, GST at
the hall's rate, surcharge using the per-hall fee, and zero/missing-hall fallbacks.

## Out of scope (YAGNI)

- Per-component GST (banquet/extras keep no own GST; the whole bill uses the hall's GST —
  the chosen approach).
- Changing the slot-type (`hourly`/`halfDay`/`fullDay`) logic or the booking persistence
  shape.
- Group bookings (sub-project #1, already done) and room seasonal pricing (#3).

## Testing

- Backend: hall-packages create/update accepts and returns `extraPaxFee`.
- Frontend unit (node): `hall-pricing.ts` — setup fee added, GST at hall rate (18% not 5%),
  surcharge = extraPax × per-hall fee, fallbacks when fields are 0/undefined.
- Browser (Playwright): in Setup set a hall's setupFee/gst/extraPaxFee; in `halls/new` pick
  that hall over capacity and confirm the total includes setup fee, the configured GST, and
  the per-hall surcharge (not 5% / ₹35).
