# Walk-in selects room type only; room assigned at check-in

**Date:** 2026-06-29
**Status:** Approved (design)
**Area:** `luxe-pms/src/app/(app)/checkin/page.tsx` (WalkInModal + reservation hand-off)

## Problem

The Express Walk-in flow makes the guest pick a **specific room** in Step 3. The
subsequent check-in flow ("Assign Room & Key Card", `CheckinProcessModal` Step 2)
then asks for a room **again**. This is redundant, and it pre-commits a specific
room before the guest is even at the desk.

A walk-in should commit to a **room type**; the **specific room** is chosen once,
at the desk, in the check-in step that already exists for that purpose.

## Goal

Walk-in = "Pax & **Type**" (no specific-room selection). The specific room is
assigned during check-in, using the check-in's existing unassigned-room path.

## Current behavior (reference)

- Walk-in Step 3 (`WalkInModal`): type-first cards (`availableTypes`) **and** a
  specific-room list (`roomsOfType` / `roomNumber`). Pricing reads `room?.rate`.
- `start()` puts the chosen `roomNumber` + `roomType` into the reservation.
- Check-in `CheckinProcessModal` Step 2 **already** supports unassigned bookings:
  `isUnassigned = !reservation.roomNumber || reservation.roomNumber === "Unassigned"`
  (≈ line 1042). When unassigned it shows "Assign an available {roomType} room"
  with a dropdown of free rooms of that type (≈ line 1559 / 1578).
- `persistCheckIn(reservation, roomNumber, payment)` writes the check-in-assigned
  `roomNumber` into the booking it creates for the walk-in, so future-date room
  blocking keys off the actually-assigned room.
- The booking wizard (`bookings/new/page.tsx:254`) prices a stay by the **room
  type's `baseTariff`** (with a hard-coded fallback), not by any specific room.

## Design

### 1. Walk-in Step 3 → type-only

- Keep the room-**type** cards driven by `availableTypes` (name · N available ·
  from ₹X).
- Remove the specific-room selection: the `roomsOfType` list and the
  `roomNumber` choice in this step. Selecting a **type** is sufficient to advance.
- "Next" is enabled once a type with availability is selected.

### 2. Price by the selected type's base tariff (exactly like booking)

- Add `baseTariff` to the walk-in's `/room-types` fetch type (`roomTypeDefs`).
- Derive a single `rate` from the **selected type's** `baseTariff`, using the
  same fallback chain the booking wizard uses:
  `Suite 1200 / King 850 / Deluxe 650 / else 450`.
- Drive `breakdown` (`buildNightlyBreakdown`) off this type rate instead of
  `room?.rate`.
- Drive `selectedType` (occupancy caps + extra-adult/extra-bed rate) off the
  **selected type name** (`roomTypeDefs.find(t => t.name === selectedRoomType)`)
  instead of `room?.type`.
- Result: the walk-in price is independent of which specific room is assigned
  later — consistent with the booking wizard.

### 3. Reservation carries the type, not a room

- `start()` sets `roomType: selectedRoomType` and `roomNumber: "Unassigned"`.
- This routes the check-in into its existing `isUnassigned` path; **no check-in
  code changes are required.**

### 4. Room recorded & blocked at check-in (unchanged)

- `persistCheckIn` already writes the check-in-assigned `roomNumber` into the
  created booking. Room blocking for future dates therefore keys off the
  actually-assigned room. No change.

## Out of scope

- No changes to `CheckinProcessModal` (it already handles unassigned bookings).
- No changes to the booking wizard, dashboard, or print flow.
- No backend changes (`/room-types` already returns `baseTariff`).

## Verification

- Walk-in Step 3 shows **only** type cards — no specific-room list.
- Selecting a type prices the stay from that type's base tariff (matches the
  booking wizard for the same type/dates).
- Completing the walk-in lands the guest in check-in with Step 2 showing
  "Assign an available {type} room" and a dropdown of free rooms of that type.
- After assigning a room and completing check-in, the booking row records the
  assigned room and that room is excluded from a later overlapping walk-in.
- Clean dev-server restart (`rm -rf .next/dev`) after edits so changes compile.
