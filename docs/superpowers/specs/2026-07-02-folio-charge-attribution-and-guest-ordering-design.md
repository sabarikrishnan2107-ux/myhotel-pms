# Folio charge attribution + real guest self-ordering + cancel

**Date:** 2026-07-02
**Scope:** Backend (`hotel-pms-api`) — one column + one generic-controller edit. Frontend
(`luxe-pms`) — Folio page display, and making the guest self-order page (`/menu/[room]`) real
end-to-end (menu, charge, cancel).

## Problem

1. `folio_charges` rows don't record who created them. Every charge-creating flow (extend
   stay, reduce stay, the Room Rack Order dialog, and soon the guest self-order page) posts a
   charge with no attribution — nobody can tell which staff member (or which guest,
   self-ordering) raised a given line item.
2. `/menu/[room]` — the guest-facing "order food to your room" page — is **entirely mock**.
   Its dish catalog is a separate 30-item hardcoded array (not the real `/menu-items`), and
   "Place order" never calls the backend at all: no folio charge is created, so a guest's
   self-placed order never actually appears on their bill.
3. There is no way for a guest to cancel an order they just placed from that page. (Staff can
   already void a charge from the Folio page — `apiDelete(/folio-charges/{id})`, which correctly
   removes it from the bill total — but that's a staff-only flow reached from a different
   screen.)

## Goals

1. Every folio charge, from every creation path, records who created it — automatically, with
   no per-call-site changes.
2. The Folio page shows who posted each charge.
3. `/menu/[room]` shows the real, Settings-managed dish catalog, and placing an order creates a
   real folio charge on the correct guest's bill (or is blocked if the room has no current
   occupant).
4. A guest can cancel their own order (before it's left the kitchen), which removes the charge
   and correctly reduces their bill — reusing the exact mechanism the existing staff-side void
   already uses.
5. The full loop — order → real DB charge → shows on Folio → cancel → charge gone, bill
   correct — is verified live in a browser against the real dev database, not just unit tests.

## Key design decisions

### A. `postedBy` — auto-stamped, not frontend-supplied

- **Migration**: add `postedBy` (string, nullable) to `folio_charges`.
- **`ResourceController::store()`** (`hotel-pms-api/app/Http/Controllers/Api/ResourceController.php:1041-1065`):
  right after `$data = $this->validated($resource, $request, true);` and before the
  `::create($data)` call, add:
  ```php
  if ($resource === 'folio-charges' && empty($data['postedBy']) && $request->user()) {
      $data['postedBy'] = $request->user()->name;
  }
  ```
  This mirrors the existing `bookings` → auto-create-guest special case a few lines below it —
  same function, same style, one more `if ($resource === '...')` block. `RULES['folio-charges']`
  gets `'postedBy' => 'string|max:255|nullable'` added so an explicit value can still be passed
  (not required; auto-fill only kicks in when the caller didn't supply one).
- **Why auto-stamp instead of having each frontend call site pass it:** `POST /folio-charges`
  is already called from ≥5 places (extend, reduce, the Room Rack Order dialog, folio manual
  "Add charge", and the new guest self-order page). Auto-stamping in the one shared endpoint
  means all of them get correct attribution with zero changes to their call sites, and it can't
  be spoofed or forgotten by a future one. When the caller is a guest (self-ordering), `$request
  ->user()->name` is the guest's own account name — which is exactly the right "who placed
  this" value for a self-service order.

### B. Folio page shows who posted each charge

- `FolioCharge` type (`luxe-pms/src/lib/types.ts:101-111`) gets `postedBy?: string`.
- `ChargesTable` (`luxe-pms/src/app/(app)/folio/[id]/page.tsx:1001-1035`), in the description
  cell (line 1026-1029): after the description text, if `c.postedBy` is present, render a small
  muted `· by {c.postedBy}` suffix. Charges created before this ships simply have no suffix — no
  synthetic "System" backfill.

### C. `/menu/[room]` — real catalog, real charge

- **Catalog**: replace the local hardcoded `MENU` array with `apiGet<MenuRow[]>("/menu-items")`
  on mount (same endpoint Settings → Menu Items and the Order dialog's Food & Drinks tab already
  use). `CATEGORIES` stops being a hardcoded `MenuCategory` union — category tabs are derived
  from the distinct `cat` values actually present in the fetched rows, prefixed with "All".
  `veg`, `spice`, `tag` render as before (menu items have these fields); the per-dish long
  description paragraph is dropped (menu items have no `desc` field) — the dish name and price
  are enough on the card.
- **Which booking gets charged**: on mount, also `apiGet<Room[]>("/room-board")` (the same live
  endpoint Room Rack uses) and find the entry with `number === room` (the route param — already
  a `string`, matches `Room.number`'s type with no coercion). If that room's `status ===
  "occupied"` and it has a `bookingNo`, that's the target booking. If not (nobody's currently
  in that room), ordering is blocked: the "Place order" button is disabled with a short message
  ("This room has no current guest — orders can't be placed") instead of the checkout flow
  proceeding.
- **Placing an order** (`placeOrder`, currently a pure client-side fake at
  `menu/[room]/page.tsx:145-153`): becomes `await apiPost<{id: ...}>("/folio-charges", {
  bookingNo, date: today, description: "F&B order (self-service) · N items", type: "F&B", qty:
  cartCount, rate: cartTotal, tax: gst, amount: grandTotal, paidBy: "Room" })` — same field
  shape the Room Rack Order dialog already posts for its Food & Drinks tab. The response's `id`
  is kept in the `success` state (alongside the existing cosmetic `orderNo`/`eta`) so Part D can
  reference it. On failure, show an error toast and stay on the checkout screen (don't fake
  success).
- Everything else on the page — cart state, the checkout form (ETA/instructions/allergy), the
  cosmetic order-tracking stage animation — is unchanged.

### D. Cancel from the tracking screen

- On the tracker screen (`menu/[room]/page.tsx:214-...`, inside the `mt-4 space-y-2` button
  group at line 291), add a "Cancel order" button, shown only while `trackStage < 2` (i.e.
  stage is "Received" or "Preparing" — `STAGES = ["Received","Preparing","Out","Delivered"]`,
  so index 2 is "Out for delivery"). Once out for delivery or delivered, the button is gone.
- Clicking it asks for one confirmation (inline, no reason field — this is a guest self-service
  action, not the staff-side audit-trail void), then `await apiDelete(\`/folio-charges/
  ${success.chargeId}\`)` — the identical call the Folio page's existing `VoidChargeModal`
  already makes. On success, replace the tracker with a simple "Order cancelled" state (stop
  the stage-advance timer, clear `success`/`trackOpen`). On failure, toast an error and leave
  the tracker as-is (nothing was removed, so no state to roll back).
- No refund step: the charge was never paid (folio charges are pending bill lines, settled at
  checkout), so deleting it is the complete, correct reversal — same as staff-side void.

## Files

- Create: `hotel-pms-api/database/migrations/2026_07_02_xxxxxx_add_posted_by_to_folio_charges.php`
- Modify: `hotel-pms-api/app/Http/Controllers/Api/ResourceController.php` (`RULES['folio-charges']`
  entry + the auto-stamp block in `store()`)
- Modify: `luxe-pms/src/lib/types.ts` (`FolioCharge.postedBy?: string`)
- Modify: `luxe-pms/src/app/(app)/folio/[id]/page.tsx` (`ChargesTable` description cell)
- Modify: `luxe-pms/src/app/(app)/menu/[room]/page.tsx` (catalog fetch, room-board lookup, real
  `placeOrder`, cancel button + handler)

## Out of scope (YAGNI)

- Any change to the existing staff-side `VoidChargeModal` / Folio page void flow itself — it
  already works correctly (deletes the charge, excludes it from `liveCharges` totals); this
  work only reuses it, doesn't touch it.
- A real backend order-status/kitchen-tracking system. The Received→Preparing→Out→Delivered
  tracker stays exactly what it is today: a client-side cosmetic timer. Cancel eligibility is
  gated on that same client-side stage, not a new backend concept.
- Refund/payment-reversal flows — not needed since nothing is paid before checkout.
- Extending `postedBy` display to the guest self-order confirmation screen itself (a guest
  doesn't need to see their own name echoed back) — it only shows on the staff-facing Folio
  page.
- `menu_items` schema changes (e.g. adding back a `desc` field) — already decided against
  during brainstorming.

## Testing

- Backend: `ServiceItemsTest`-style Feature test — POST `/folio-charges` as an authenticated
  user, assert the response's `postedBy` equals that user's name; assert an explicitly-supplied
  `postedBy` in the request body is preserved (auto-fill only applies when absent).
- Backend: full suite must stay green (147 + 1 new test).
- Frontend: no new pure-logic module here (this is UI wiring + a straightforward fetch/post
  swap), so no new `.test.ts` file — verified via the live browser pass below instead, matching
  how `menu-items-manager.tsx` and `service-items-manager.tsx` were verified.
- **Live browser verification (Playwright, against the real dev DB and Postgres — same approach
  used for the previous feature's Task 6), covering the full loop end to end:**
  1. As a guest/staff login, open `/menu/[room]` for a room that is currently occupied (e.g.
     PH1 / Karan Reddy from the live demo data); confirm the catalog shown matches
     `/menu-items` (not the old hardcoded 30-item list).
  2. Add items, place the order; confirm in Postgres (`folio_charges` table) that a new row
     exists with the correct `bookingNo`, `amount`, and `postedBy`; confirm it shows on that
     booking's real Folio page with the `· by <name>` tag.
  3. On the tracking screen (before "Out for delivery"), cancel the order; confirm in Postgres
     that the row is gone, and that the Folio page's total dropped back down by exactly that
     amount.
  4. Repeat the "place → shows on Folio with postedBy" check via the Room Rack → Order dialog
     path (staff-side), to confirm both entry points attribute correctly.
  5. Confirm the pre-existing staff-side "void charge" on the Folio page still works
     (unaffected by the new column).
