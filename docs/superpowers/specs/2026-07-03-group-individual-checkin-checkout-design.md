# Group Booking: Individual Guest Check-in

## Problem

Group bookings (`/groups/[id]`) support a bulk "Check-in Group" button that flips the group's overall status to `in-house` without touching individual guests, alongside an existing per-guest "Check out guest" row action. There's no way to check guests into a group one at a time as they physically arrive — which is how groups actually arrive in practice (a wedding party doesn't walk in as one atomic unit).

Separately, even when a guest IS physically checked into their room, the Room Rack (`/rack`) and Dashboard don't show that room as occupied — `StatsController::roomBoard()` only inspects the individual `bookings` table, not `group_rooming`. This is a real gap: front desk and housekeeping have no visibility into rooms occupied by group guests.

## Design

### 1. Data model

Add a `checkedIn` boolean column (default `false`) to `group_rooming`, mirroring the existing `checkedOut` column — same guarded-migration pattern used in `database/migrations/2026_06_29_000001_add_checked_out_to_group_rooming.php`:

```php
Schema::table('group_rooming', function (Blueprint $t) {
    if (!Schema::hasColumn('group_rooming', 'checkedIn')) {
        $t->boolean('checkedIn')->default(false);
    }
});
```

`hotel-pms-api/app/Http/Controllers/Api/ResourceController.php` — add `'checkedIn' => 'boolean'` to the `group-rooming` validation rule set (alongside the existing `'checkedOut' => 'boolean'`).

No `checkedInAt` timestamp column — the existing `checkedOut` field has no companion timestamp either; Laravel's `updated_at` on the row serves as an implicit audit trail if ever needed.

### 2. Room Rack / Dashboard occupancy fix

`StatsController::roomBoard()` currently computes `$inHouse` from `Booking` only. Add a second lookup: rooms where a `group_rooming` row has `checkedIn = true`, `checkedOut = false`, joined to `group_bookings` on `groupCode`, excluding cancelled group bookings — mirroring the join already used in `roomAvailability()`.

Precedence: individual bookings win if both exist for the same room number (can't happen in practice — `roomAvailability` already prevents a room being committed to both an individual booking and a group for overlapping dates — but the code checks `$inHouse` first regardless).

For a room occupied by a checked-in group guest, populate:
- `status`: `'occupied'`
- `guestName`: the rooming entry's `lead`
- `source`: `'Group'`
- `checkIn` / `checkOut`: the parent group's `arrival` / `departure`
- `bookingNo` / `bookingId`: left `null`

Leaving `bookingNo`/`bookingId` null means the Room Rack's existing `isOccupied && bookingNo` guards on the Checkout/Folio quick-action buttons naturally hide those buttons for group rooms (no dead links to a nonexistent individual booking) — no Room Rack UI changes needed.

### 3. Frontend — `luxe-pms/src/app/(app)/groups/[id]/page.tsx`

**`RoomingEntry` type**: add `checkedIn?: boolean`.

**Per-guest check-in action** (`checkInGuest(entry)`): sets `checkedIn: true` locally + `apiPut('/group-rooming/{id}', { checkedIn: true })`, mirroring `checkOutGuest`. Also flips the group's own status to `in-house` if it's currently `confirmed` or `tentative` (first-arrival auto-flip), via the existing `apiPut('/group-bookings/{id}', { status: 'in-house' })` pattern already used by `checkInGroup`.

**Row menu** (around line 824, the portalled `data-row-menu` block): replace the single "Reassign room" trigger's neighbor logic with:
- "Check in guest" — shown when `entry.roomNo && !entry.checkedIn`
- "Check out guest" — tightened from `entry.roomNo && !entry.checkedOut` to `entry.checkedIn && !entry.checkedOut` (checking out someone who never checked in doesn't make sense)

**Status badge** in the Rooming List table, next to the lead guest name (replacing the existing bare `checkedOut` badge):
- No room yet: no badge (row already has the `bg-warning-soft/30` "needs attention" tint from the existing `!g.roomNo` check)
- Room assigned, not checked in: `Badge tone="neutral"` "Arriving"
- Checked in, not checked out: `Badge tone="success"` "In-house"
- Checked out: `Badge tone="success"` "Checked out" with `LogOut` icon (unchanged from today)

**Rooming List summary line** (line 561): extends from
`"{rooming.length} guests in {group.totalRooms} rooms · {pending} pending allocation"`
to also show `· {checkedInCount} checked in`.

**Bulk "Check-in Group" button** (`checkInGroup`, currently just sets `status: 'in-house'`): now also checks in every rooming entry that has a room assigned and isn't already checked in (loops and calls the same per-guest logic as `checkInGuest`, batched like `autoAssign` already batches its `apiPut` calls). Guests still waiting on a room assignment are skipped; the toast reports how many were checked in vs. skipped, e.g. `"2 guests checked in · 1 still needs a room"`.

## Out of scope

- No KYC/photo/signature capture on group guest check-in — mirrors the existing lightweight per-guest checkout (a toggle, not a wizard). Individual (non-group) bookings already have a full check-in capture flow elsewhere; group rooming stays simple by design.
- No changes to `checkOutGroup` (the bulk end-of-stay checkout) beyond nothing — it already checks out all remaining guests regardless of prior `checkedIn` state, which is correct for a "everyone's leaving now" bulk action.
- No changes to the Auto-assign Remaining flow.
- No changes to group creation (`/groups/new`).
- No new KPI card on the Overview tab — check-in progress is visible via the Rooming List summary line and per-row badges.
