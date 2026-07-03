# Group Guest Billing: Master vs Self-Pay for Room Extras

## Problem

A guest checked into a room via a **group booking** cannot place a room order today: the in-room ordering screen (`/menu/[room]`), the Room Rack "Order" action, and the POS "charge to room" flow all resolve a physical room to a folio via an **individual** booking number (`bookings.bookingNo` or `room-board`'s `bookingNo`), which group-occupied rooms don't have (they were deliberately left `null` in the check-in feature so nav buttons stay hidden). So group guests can't order F&B/room service, and there is no way to say whether a group guest's extras should go on the **group's master folio** (the organiser pays) or be billed to the **guest separately** (they settle their own incidentals).

The group-creation form has a "Billing Setup" selector (Master / Per-room / Split), but it is **purely decorative** — never persisted (`group_bookings` has no such column) and never enforced anywhere.

## Design

### 1. Data model

**Persist the group billing mode.** Add `billingMode` to `group_bookings` (`string`, default `'master'`; values `'master' | 'per-room' | 'split'`). The creation form (`luxe-pms/src/app/(app)/groups/new/page.tsx`) already holds this in local state (`billingMode`) but omits it from the create POST — add it to the payload. Add `'billingMode' => 'string|max:20'` to the `group-bookings` validation rules in `ResourceController.php`.

**Per-guest billing flag.** Add `billTo` to `group_rooming` (`string`, default `'group'`; values `'group' | 'self'`). Add `'billTo' => 'string|max:20'` to the `group-rooming` validation rules. When a guest is added, the frontend defaults `billTo` from the group's `billingMode`: `master → 'group'`, `per-room`/`split → 'self'`. Editable per guest afterwards.

**Self-pay guest folio identity.** A self-pay guest's charges and payments are keyed by a synthetic booking number: `GRPG-<roomingId>` (e.g. `GRPG-42`), where `roomingId` is the `group_rooming` row id. It is stable across room reassignment (the id never changes). No new tables: reuse `folio_charges` and `folio_payments`, both of which already support `?bookingNo=` filtering (confirmed in `ResourceController::FILTER_BY`). The per-guest "mini-folio" is those rows filtered by that key.

Both migrations follow the existing guarded pattern (`if (!Schema::hasColumn(...))`), matching `2026_06_29_000001_add_checked_out_to_group_rooming.php`.

### 2. The `chargeTo` resolver (`StatsController::roomBoard()`)

Extend the existing group-occupancy lookup (added in the check-in feature) so each room row gains a new field, `chargeTo` — the folio a charge for this physical room should land on:

- Individual booking present → `chargeTo = bk.bookingNo` (unchanged behaviour, just surfaced under the new key too).
- Checked-in group guest present → the `$groupOccupied` query additionally selects `group_rooming.id` and `group_rooming.billTo`; then `chargeTo = billTo === 'self' ? "GRPG-{id}" : groupCode`.
- Vacant / blocked / maintenance → `chargeTo = null`.

`bookingNo`/`bookingId` remain exactly as today (null for group rooms), so the Room Rack's `isOccupied && bookingNo` guards keep its Checkout/Folio nav buttons hidden for group rooms — `chargeTo` is a separate field purely for "where charges post," never for navigation.

Add a `RoomBoardChargeToTest` PHPUnit feature test covering: individual room → `chargeTo` = its bookingNo; group-pays guest → `chargeTo` = group code; self-pay guest → `chargeTo` = `GRPG-<id>`; vacant → null.

### 3. Routing the three charge paths through `chargeTo`

All three read `chargeTo` from `room-board` and post the folio-charge with `bookingNo: chargeTo`:

1. **`/menu/[room]`** (`luxe-pms/src/app/(app)/menu/[room]/page.tsx`) — currently sets `bookingNo` only when `status === "occupied" && match.bookingNo` (line ~88) and gates `placeOrder` on it (line ~137). Change to read `match.chargeTo`, store it as the charge target, gate ordering on it being non-null, and post with `bookingNo: chargeTo`. Set `paidBy` to `"Guest"` when the target is a `GRPG-` key, else `"Room"`.
2. **Room Rack "Order"** (`luxe-pms/src/app/(app)/rack/page.tsx`) — the Order dialog's folio-charge POST uses `room.chargeTo` instead of `room.bookingNo`. Only the *order* action changes; extend/reduce/change/payment stay individual-booking-only (they genuinely need a real booking and remain gated on `bookingNo`).
3. **POS "charge to room"** (`luxe-pms/src/app/(app)/fb/pos/page.tsx`, `chargeToRoom`) — currently looks up `/bookings` by `roomNumber` (misses group guests). Switch to fetching `room-board`, find the room, and post with `bookingNo: chargeTo` (report "no active guest in room N" when `chargeTo` is null). `paidBy` derived from the key prefix as above.

### 4. Per-guest UI on the group detail page (`luxe-pms/src/app/(app)/groups/[id]/page.tsx`)

**Billing toggle per rooming row.** Each row shows a badge: **"Group pays"** (neutral tone) or **"Self-pay"** (accent tone), clickable to flip; also offered in the row "⋮" menu as "Bill extras to → Group / Guest". Flipping writes `billTo` via `PUT /group-rooming/{id}` (optimistic update + persist, matching the existing per-guest action pattern). A tooltip notes that changing it affects only future charges, not already-posted ones.

**Self-pay balance + mini-folio drawer.** For each self-pay guest, the page fetches their charges and payments by their own key — `GET /folio-charges?bookingNo=GRPG-<id>` and `GET /folio-payments?bookingNo=GRPG-<id>` (both already support the `bookingNo` filter, so each call returns only that guest's rows — never the whole system's folio data) — and computes their balance = Σcharges − Σpayments. These run one-per-self-pay-guest when the rooming list loads (a group has at most a handful of self-pay guests; group-pays guests are skipped entirely). A self-pay row shows a small "₹X due" (or "Settled") indicator that opens a drawer listing that guest's charges, payments, balance, and a **"Collect payment"** action (amount + mode → `POST /folio-payments` with `bookingNo: GRPG-<id>`, mirroring the group's existing `receivePayment`). Group-pays guests show no separate balance (their extras flow to the master folio).

### 5. Billing tab master-folio extras (`luxe-pms/src/app/(app)/groups/[id]/page.tsx`, `tab === "billing"`)

Currently the master folio is computed from block + meals + services only. Additionally fetch `GET /folio-charges?bookingNo=<group.code>`, render each as a line item, and add their sum to the grand total. Balance due = grand total − `group.advance` (which already reflects recorded master-folio payments via `receivePayment`), so ad-hoc extras are not double-counted.

### 6. Checkout guards

- **Per-guest checkout** (`checkOutGuest`): if the guest is `billTo === 'self'` and their mini-folio balance > 0, block with a toast ("Clear ₹X in extras first") instead of checking out. Front desk collects via the drawer, then checks out.
- **Bulk group checkout** (`checkOutGroup`): auto-checks-out only guests who are group-pays, or self-pay with a zero balance. Self-pay guests who still owe are left checked-in and reported in the result toast ("N guest(s) still owe for extras — settle in their folio"). The group's own master balance settles as it does today.

## Out of scope

- Folio-centric charge paths (`/checkout/[id]`, the `/folio/[id]` manual "Add charge") are unchanged — they operate on an already-chosen folio, so there is no room→folio resolution to route. A self-pay guest's mini-folio is reached through the group page's drawer (Section 4), not `/folio/[id]` (which resolves by individual booking and wouldn't recognise a `GRPG-` key).
- Spa and other non-room-order charge sources are not wired in this feature (no room→folio charge path exists for them today); they can adopt the same `chargeTo` resolver later.
- Moving already-posted charges when `billTo` is flipped — out of scope; the flip affects only future charges (surfaced via the tooltip).
- Tax/GST rate changes — self-pay F&B charges use the same 5% F&B GST the room-order screen already applies; no new tax logic.
- The `per-room` vs `split` distinction in `billingMode` is collapsed to "default each guest to self-pay" — both map to `billTo='self'` as the per-guest default. A finer room-vs-incidentals split is not modelled (YAGNI; per-guest `billTo` already gives the needed control).
