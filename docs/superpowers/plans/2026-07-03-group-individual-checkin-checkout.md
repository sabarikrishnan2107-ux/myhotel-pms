# Group Booking Individual Guest Check-in Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let front desk check group-booking guests in one at a time (mirroring the existing per-guest checkout) instead of only bulk-checking-in the whole group, and make the Room Rack correctly show a room as occupied once a group guest has actually checked in.

**Architecture:** Add a `checkedIn` boolean column to `group_rooming` (same pattern as the existing `checkedOut` column). Extend the `room-board` endpoint to also treat a room as occupied when a checked-in, not-yet-checked-out group guest holds it. On the frontend (`luxe-pms/src/app/(app)/groups/[id]/page.tsx`), add a per-guest "Check in guest" row action, a status badge (Arriving / In-house / Checked out), and make the bulk "Check-in Group" button check in every guest that already has a room assigned.

**Tech Stack:** Laravel 11 (PHP, PHPUnit feature tests, Postgres in prod / SQLite in-memory in tests), Next.js/React (TypeScript), Vitest for pure-logic unit tests only (no component-test harness exists in this repo — page components are verified manually via the dev server, per this repo's established convention).

## Global Constraints

- Follow the existing guarded-migration pattern (`if (!Schema::hasColumn(...))` / `if (Schema::hasColumn(...))` on `up()`/`down()`) — copied from `database/migrations/2026_06_29_000001_add_checked_out_to_group_rooming.php`.
- No KYC/photo/signature capture on group guest check-in — stays a lightweight toggle, mirroring the existing per-guest checkout.
- Individual bookings take precedence over group check-ins when computing Room Rack occupancy (can't actually conflict in practice, but the code must check individual bookings first regardless).
- No changes to `checkOutGroup`, Auto-assign Remaining, or `/groups/new`.
- Backend tests: PHPUnit feature tests under `hotel-pms-api/tests/Feature/`, using `RefreshDatabase` + `actingAs(User::factory()->create(), 'sanctum')`, run against SQLite in-memory (already configured in `phpunit.xml` — no Postgres/pgsql extension needed for these tests).
- Frontend: no new test files — this repo's Vitest suite only covers pure functions in `src/lib/*.ts` (confirmed: no existing `*.test.tsx` for any page component). Frontend tasks are verified manually via the dev server, consistent with existing project practice.

---

### Task 1: `checkedIn` column on `group_rooming` + validation

**Files:**
- Create: `hotel-pms-api/database/migrations/2026_07_03_000100_add_checked_in_to_group_rooming.php`
- Modify: `hotel-pms-api/app/Models/GroupRooming.php:9`
- Modify: `hotel-pms-api/app/Http/Controllers/Api/ResourceController.php:436-440`
- Test: `hotel-pms-api/tests/Feature/GroupRoomingCheckInTest.php`

**Interfaces:**
- Produces: `group_rooming.checkedIn` (boolean, default `false`) — a new field on the `GroupRooming` model and the `/api/group-rooming` REST resource, alongside the existing `checkedOut`. Task 3 (frontend) reads/writes this via `PUT /group-rooming/{id}` with `{ checkedIn: true }`, exactly like it already does for `checkedOut`.

- [ ] **Step 1: Write the failing test**

Create `hotel-pms-api/tests/Feature/GroupRoomingCheckInTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GroupRoomingCheckInTest extends TestCase
{
    use RefreshDatabase;

    private function auth(): void
    {
        $this->actingAs(User::factory()->create(), 'sanctum');
    }

    public function test_checked_in_flag_persists_via_update(): void
    {
        $this->auth();

        $created = $this->postJson('/api/group-rooming', [
            'groupCode' => 'GRP1', 'roomNo' => '201', 'roomType' => 'Deluxe',
            'lead' => 'Asha', 'pax' => 2,
        ])->assertCreated()->json();

        $this->assertArrayHasKey('checkedIn', $created);
        $this->assertFalse((bool) $created['checkedIn']);

        $this->putJson("/api/group-rooming/{$created['id']}", ['checkedIn' => true])
            ->assertOk()
            ->assertJsonPath('checkedIn', true);

        $this->assertDatabaseHas('group_rooming', ['id' => $created['id'], 'checkedIn' => true]);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `C:\php84\php.exe artisan test --filter=GroupRoomingCheckInTest`
Expected: FAIL — either a validation error (`checkedIn` not in the allowed rules yet) or `assertArrayHasKey('checkedIn', ...)` failing because the column doesn't exist yet.

- [ ] **Step 3: Create the migration**

Create `hotel-pms-api/database/migrations/2026_07_03_000100_add_checked_in_to_group_rooming.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('group_rooming', function (Blueprint $t) {
            if (!Schema::hasColumn('group_rooming', 'checkedIn')) {
                $t->boolean('checkedIn')->default(false);
            }
        });
    }

    public function down(): void
    {
        Schema::table('group_rooming', function (Blueprint $t) {
            if (Schema::hasColumn('group_rooming', 'checkedIn')) {
                $t->dropColumn('checkedIn');
            }
        });
    }
};
```

- [ ] **Step 4: Add the cast on the model**

Modify `hotel-pms-api/app/Models/GroupRooming.php` — currently:

```php
    protected $casts = ['pax'=>'integer','checkedOut'=>'boolean'];
```

Change to:

```php
    protected $casts = ['pax'=>'integer','checkedIn'=>'boolean','checkedOut'=>'boolean'];
```

- [ ] **Step 5: Add the validation rule**

Modify `hotel-pms-api/app/Http/Controllers/Api/ResourceController.php:436-440` — currently:

```php
        'group-rooming' => [
            'groupCode' => 'string|max:50', 'roomNo' => 'string|max:50|nullable', 'roomType' => 'string|max:100',
            'lead' => 'string|max:255', 'pax' => 'integer|min:1', 'phone' => 'string|max:50|nullable',
            'remarks' => 'string|max:500|nullable', 'checkedOut' => 'boolean',
        ],
```

Change to:

```php
        'group-rooming' => [
            'groupCode' => 'string|max:50', 'roomNo' => 'string|max:50|nullable', 'roomType' => 'string|max:100',
            'lead' => 'string|max:255', 'pax' => 'integer|min:1', 'phone' => 'string|max:50|nullable',
            'remarks' => 'string|max:500|nullable', 'checkedIn' => 'boolean', 'checkedOut' => 'boolean',
        ],
```

- [ ] **Step 6: Run the migration on the test/local database**

Run: `cd hotel-pms-api && C:\php84\php.exe artisan migrate`
Expected: `2026_07_03_000100_add_checked_in_to_group_rooming ... DONE`

- [ ] **Step 7: Run test to verify it passes**

Run: `C:\php84\php.exe artisan test --filter=GroupRoomingCheckInTest`
Expected: PASS (1 test, 3+ assertions)

- [ ] **Step 8: Commit**

```bash
git add hotel-pms-api/database/migrations/2026_07_03_000100_add_checked_in_to_group_rooming.php hotel-pms-api/app/Models/GroupRooming.php hotel-pms-api/app/Http/Controllers/Api/ResourceController.php hotel-pms-api/tests/Feature/GroupRoomingCheckInTest.php
git commit -m "feat(api): add checkedIn flag to group_rooming"
```

---

### Task 2: Room Rack shows checked-in group guests as occupying their room

**Files:**
- Modify: `hotel-pms-api/app/Http/Controllers/Api/StatsController.php:227-281` (the `roomBoard()` method)
- Test: `hotel-pms-api/tests/Feature/RoomBoardGroupOccupancyTest.php`

**Interfaces:**
- Consumes: `group_rooming.checkedIn` (from Task 1).
- Produces: `GET /api/room-board` rows for group-occupied rooms now have `status: "occupied"`, `guestName` = the rooming entry's `lead`, `source: "Group"`, `checkIn`/`checkOut` = the group's `arrival`/`departure`, and `bookingNo`/`bookingId` left `null` (no change to the response shape/keys — same array as before, just populated differently for this case).

- [ ] **Step 1: Write the failing tests**

Create `hotel-pms-api/tests/Feature/RoomBoardGroupOccupancyTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\GroupBooking;
use App\Models\GroupRooming;
use App\Models\Room;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RoomBoardGroupOccupancyTest extends TestCase
{
    use RefreshDatabase;

    private function auth(): void
    {
        $this->actingAs(User::factory()->create(), 'sanctum');
    }

    public function test_checked_in_group_guest_shows_room_as_occupied(): void
    {
        $this->auth();

        Room::create(['number' => '201', 'floor' => 2, 'category' => 'Deluxe', 'baseTariff' => 6500]);
        GroupBooking::create([
            'code' => 'GRP1', 'name' => 'Test Wedding', 'arrival' => '2026-07-10',
            'departure' => '2026-07-12', 'status' => 'confirmed',
        ]);
        GroupRooming::create([
            'groupCode' => 'GRP1', 'roomNo' => '201', 'roomType' => 'Deluxe',
            'lead' => 'Asha', 'pax' => 2, 'checkedIn' => true, 'checkedOut' => false,
        ]);

        $row = collect($this->getJson('/api/room-board')->assertOk()->json())
            ->firstWhere('number', '201');

        $this->assertSame('occupied', $row['status']);
        $this->assertSame('Asha', $row['guestName']);
        $this->assertSame('Group', $row['source']);
        $this->assertNull($row['bookingNo']);
    }

    public function test_room_only_assigned_not_checked_in_is_not_occupied(): void
    {
        $this->auth();

        Room::create(['number' => '202', 'floor' => 2, 'category' => 'Deluxe', 'baseTariff' => 6500]);
        GroupBooking::create([
            'code' => 'GRP2', 'name' => 'Test Conference', 'arrival' => '2026-07-10',
            'departure' => '2026-07-12', 'status' => 'confirmed',
        ]);
        GroupRooming::create([
            'groupCode' => 'GRP2', 'roomNo' => '202', 'roomType' => 'Deluxe',
            'lead' => 'Ben', 'pax' => 1, 'checkedIn' => false, 'checkedOut' => false,
        ]);

        $row = collect($this->getJson('/api/room-board')->assertOk()->json())
            ->firstWhere('number', '202');

        $this->assertSame('available', $row['status']);
        $this->assertNull($row['guestName']);
    }

    public function test_individual_booking_takes_precedence_over_group_checkin(): void
    {
        $this->auth();

        Room::create(['number' => '203', 'floor' => 2, 'category' => 'Deluxe', 'baseTariff' => 6500]);
        Booking::create([
            'bookingNo' => 'BK1', 'guestName' => 'Chitra', 'roomNumber' => '203',
            'roomType' => 'Deluxe', 'checkIn' => '2026-07-01', 'checkOut' => '2026-07-05',
            'status' => 'checked-in',
        ]);
        GroupBooking::create([
            'code' => 'GRP3', 'name' => 'Test Retreat', 'arrival' => '2026-07-10',
            'departure' => '2026-07-12', 'status' => 'confirmed',
        ]);
        GroupRooming::create([
            'groupCode' => 'GRP3', 'roomNo' => '203', 'roomType' => 'Deluxe',
            'lead' => 'Deepa', 'pax' => 1, 'checkedIn' => true, 'checkedOut' => false,
        ]);

        $row = collect($this->getJson('/api/room-board')->assertOk()->json())
            ->firstWhere('number', '203');

        $this->assertSame('occupied', $row['status']);
        $this->assertSame('Chitra', $row['guestName']);
        $this->assertSame('BK1', $row['bookingNo']);
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `C:\php84\php.exe artisan test --filter=RoomBoardGroupOccupancyTest`
Expected: FAIL on the first two tests (room 201/203 show `status: "available"` since `roomBoard()` doesn't look at `group_rooming` yet); third test passes trivially (already correct) but keep it — it becomes a regression guard once Step 3 lands.

- [ ] **Step 3: Implement the fix**

Modify `hotel-pms-api/app/Http/Controllers/Api/StatsController.php:231-281` — currently:

```php
    public function roomBoard()
    {
        $today = date('Y-m-d');

        // A room is in-house if a booking is checked-in, or is within its stay dates
        // and not yet departed. Cancelled and checked-out bookings free the room.
        $inHouse = Booking::whereNotIn('status', ['cancelled', 'checked-out'])
            ->where(fn ($q) => $q->where('status', 'checked-in')
                ->orWhere(fn ($q2) => $q2->where('checkIn', '<=', $today)->where('checkOut', '>', $today)))
            ->get()
            ->keyBy('roomNumber');

        $rooms = Room::orderBy('floor')->orderBy('number')->get()->map(function ($r) use ($inHouse) {
            $bk = $inHouse->get($r->number);
            $hk = $r->hkStatus ?: 'clean';
            // Vacant rooms can be explicitly blocked or out-of-order; otherwise
            // housekeeping state decides whether they are sellable.
            $status = $bk
                ? 'occupied'
                : ($r->status === 'blocked' ? 'blocked'
                    : ($hk === 'dirty' ? 'dirty' : ($hk === 'cleaning' ? 'cleaning' : ($r->status === 'out-of-order' ? 'maintenance' : 'available'))));

            return [
                'id'            => $r->id,
                'number'        => $r->number,
                'floor'         => (int) $r->floor,
                'type'          => $r->category,
                'status'        => $status,
                'hkStatus'      => $hk,
                'hkAssignee'    => $r->hkAssignee ?? null,
                'hkStartedAt'   => $r->hkStartedAt ?? null,
                'guestName'     => $bk->guestName ?? null,
                'source'        => $bk->source ?? null,
                'checkIn'       => $bk->checkIn ?? null,
                'checkOut'      => $bk->checkOut ?? null,
                'paymentStatus' => $bk->paymentStatus ?? null,
                'vip'           => (bool) ($bk->vip ?? false),
                'rate'          => (int) $r->baseTariff,
                // Real booking identifiers so the Room Rack can act on the live
                // folio/booking (extend, reduce, change, payment, order).
                'bookingNo'     => $bk->bookingNo ?? null,
                'bookingId'     => $bk->id ?? null,
                'nights'        => $bk ? (int) $bk->nights : null,
                'total'         => $bk ? (int) $bk->total : null,
                'advance'       => $bk ? (int) $bk->advance : null,
                'balance'       => $bk ? (int) $bk->balance : null,
            ];
        });

        return response()->json($rooms);
    }
```

Change to:

```php
    public function roomBoard()
    {
        $today = date('Y-m-d');

        // A room is in-house if a booking is checked-in, or is within its stay dates
        // and not yet departed. Cancelled and checked-out bookings free the room.
        $inHouse = Booking::whereNotIn('status', ['cancelled', 'checked-out'])
            ->where(fn ($q) => $q->where('status', 'checked-in')
                ->orWhere(fn ($q2) => $q2->where('checkIn', '<=', $today)->where('checkOut', '>', $today)))
            ->get()
            ->keyBy('roomNumber');

        // Group guests actually checked into their room also occupy it — gated on
        // checkedIn (not just assigned) so an arriving-but-not-yet-checked-in guest
        // doesn't show the room as occupied. Mirrors the join roomAvailability()
        // already uses to cross-check group commitments.
        $groupOccupied = DB::table('group_rooming')
            ->join('group_bookings', 'group_rooming.groupCode', '=', 'group_bookings.code')
            ->whereNotIn('group_bookings.status', ['cancelled'])
            ->where('group_rooming.checkedIn', true)
            ->where('group_rooming.checkedOut', false)
            ->whereNotNull('group_rooming.roomNo')
            ->where('group_rooming.roomNo', '!=', '')
            ->select('group_rooming.roomNo', 'group_rooming.lead', 'group_bookings.arrival', 'group_bookings.departure')
            ->get()
            ->keyBy('roomNo');

        $rooms = Room::orderBy('floor')->orderBy('number')->get()->map(function ($r) use ($inHouse, $groupOccupied) {
            $bk = $inHouse->get($r->number);
            $grp = $bk ? null : $groupOccupied->get($r->number);
            $hk = $r->hkStatus ?: 'clean';
            // Vacant rooms can be explicitly blocked or out-of-order; otherwise
            // housekeeping state decides whether they are sellable.
            $status = ($bk || $grp)
                ? 'occupied'
                : ($r->status === 'blocked' ? 'blocked'
                    : ($hk === 'dirty' ? 'dirty' : ($hk === 'cleaning' ? 'cleaning' : ($r->status === 'out-of-order' ? 'maintenance' : 'available'))));

            return [
                'id'            => $r->id,
                'number'        => $r->number,
                'floor'         => (int) $r->floor,
                'type'          => $r->category,
                'status'        => $status,
                'hkStatus'      => $hk,
                'hkAssignee'    => $r->hkAssignee ?? null,
                'hkStartedAt'   => $r->hkStartedAt ?? null,
                'guestName'     => $bk->guestName ?? ($grp->lead ?? null),
                'source'        => $bk->source ?? ($grp ? 'Group' : null),
                'checkIn'       => $bk->checkIn ?? ($grp->arrival ?? null),
                'checkOut'      => $bk->checkOut ?? ($grp->departure ?? null),
                'paymentStatus' => $bk->paymentStatus ?? null,
                'vip'           => (bool) ($bk->vip ?? false),
                'rate'          => (int) $r->baseTariff,
                // Real booking identifiers so the Room Rack can act on the live
                // folio/booking (extend, reduce, change, payment, order). Group
                // rooms have neither — the Room Rack's `isOccupied && bookingNo`
                // guards keep it from offering Checkout/Folio for a booking that
                // doesn't exist.
                'bookingNo'     => $bk->bookingNo ?? null,
                'bookingId'     => $bk->id ?? null,
                'nights'        => $bk ? (int) $bk->nights : null,
                'total'         => $bk ? (int) $bk->total : null,
                'advance'       => $bk ? (int) $bk->advance : null,
                'balance'       => $bk ? (int) $bk->balance : null,
            ];
        });

        return response()->json($rooms);
    }
```

`DB` is already imported at the top of this file (`use Illuminate\Support\Facades\DB;`) — no new import needed.

- [ ] **Step 4: Run tests to verify they pass**

Run: `C:\php84\php.exe artisan test --filter=RoomBoardGroupOccupancyTest`
Expected: PASS (3 tests)

- [ ] **Step 5: Run the full backend suite to check for regressions**

Run: `C:\php84\php.exe artisan test`
Expected: all tests PASS (no regressions in existing Room Rack / booking tests)

- [ ] **Step 6: Commit**

```bash
git add hotel-pms-api/app/Http/Controllers/Api/StatsController.php hotel-pms-api/tests/Feature/RoomBoardGroupOccupancyTest.php
git commit -m "fix(api): room-board reflects checked-in group guests as occupied"
```

---

### Task 3: Per-guest "Check in guest" action + tightened checkout guard

**Files:**
- Modify: `luxe-pms/src/app/(app)/groups/[id]/page.tsx`

**Interfaces:**
- Consumes: `group_rooming.checkedIn` field and `PUT /group-rooming/{id}` (from Task 1).
- Produces: `RoomingEntry.checkedIn?: boolean` field and a `checkInGuest(entry: RoomingEntry): void` function — Task 4 (badges) and Task 5 (bulk check-in) both read `entry.checkedIn` / call the same `apiPut('/group-rooming/{id}', { checkedIn: true })` pattern this task establishes.

- [ ] **Step 1: Add `LogIn` to the lucide-react import**

Modify `luxe-pms/src/app/(app)/groups/[id]/page.tsx:6-10` — currently:

```tsx
import {
  ChevronLeft, UsersRound, BedDouble, Receipt, Calendar, MessageSquare, Activity,
  Printer, Send, CreditCard, Sparkles, Phone, Mail, Briefcase, UserPlus, Upload,
  CheckCircle2, ArrowRight, Plus, Building2, MoreVertical, X, LogOut,
} from "lucide-react";
```

Change to:

```tsx
import {
  ChevronLeft, UsersRound, BedDouble, Receipt, Calendar, MessageSquare, Activity,
  Printer, Send, CreditCard, Sparkles, Phone, Mail, Briefcase, UserPlus, Upload,
  CheckCircle2, ArrowRight, Plus, Building2, MoreVertical, X, LogOut, LogIn,
} from "lucide-react";
```

- [ ] **Step 2: Add `checkedIn` to the `RoomingEntry` type**

Modify `luxe-pms/src/app/(app)/groups/[id]/page.tsx:23` — currently:

```tsx
type RoomingEntry = { id: string; groupCode?: string; roomNo?: string | null; roomType: string; lead: string; pax: number; phone?: string; remarks?: string; checkedOut?: boolean };
```

Change to:

```tsx
type RoomingEntry = { id: string; groupCode?: string; roomNo?: string | null; roomType: string; lead: string; pax: number; phone?: string; remarks?: string; checkedIn?: boolean; checkedOut?: boolean };
```

- [ ] **Step 3: Add the `checkInGuest` function**

Modify `luxe-pms/src/app/(app)/groups/[id]/page.tsx` — insert immediately after the `checkOutGuest` function (which ends right before the `// QUICK check-out` comment). Currently reads:

```tsx
  // ONE-BY-ONE check-out: mark this guest departed + release their room. Persists.
  const checkOutGuest = (entry: RoomingEntry) => {
    setRooming(prev => prev.map(r => r.id === entry.id ? { ...r, checkedOut: true } : r));
    apiPut(`/group-rooming/${entry.id}`, { checkedOut: true }).catch(() => flash("⚠ Save failed — backend offline"));
    releaseRoom(entry.roomNo);
    flash(`${entry.lead} checked out${entry.roomNo ? ` · Room ${entry.roomNo} → housekeeping` : ""}`);
  };

  // QUICK check-out: collect any final payment (→ master folio), check out every
```

Change to (adds the new function between the two, leaves both existing functions untouched):

```tsx
  // ONE-BY-ONE check-out: mark this guest departed + release their room. Persists.
  const checkOutGuest = (entry: RoomingEntry) => {
    setRooming(prev => prev.map(r => r.id === entry.id ? { ...r, checkedOut: true } : r));
    apiPut(`/group-rooming/${entry.id}`, { checkedOut: true }).catch(() => flash("⚠ Save failed — backend offline"));
    releaseRoom(entry.roomNo);
    flash(`${entry.lead} checked out${entry.roomNo ? ` · Room ${entry.roomNo} → housekeeping` : ""}`);
  };

  // ONE-BY-ONE check-in: mark this guest arrived. The first guest checked into
  // an otherwise-not-yet-arrived group also flips the group's own status to
  // in-house, since the group has begun arriving.
  const checkInGuest = (entry: RoomingEntry) => {
    setRooming(prev => prev.map(r => r.id === entry.id ? { ...r, checkedIn: true } : r));
    apiPut(`/group-rooming/${entry.id}`, { checkedIn: true }).catch(() => flash("⚠ Save failed — backend offline"));
    if (group && (group.status === "confirmed" || group.status === "tentative")) {
      setGroup(g => g ? { ...g, status: "in-house" } : g);
      apiPut(`/group-bookings/${group.id}`, { status: "in-house" }).catch(() => {});
    }
    flash(`${entry.lead} checked in${entry.roomNo ? ` · Room ${entry.roomNo}` : ""}`);
  };

  // QUICK check-out: collect any final payment (→ master folio), check out every
```

- [ ] **Step 4: Update the row actions menu**

Modify `luxe-pms/src/app/(app)/groups/[id]/page.tsx` — in the portalled row-menu block, currently:

```tsx
            {entry.roomNo && (
              <button type="button" onClick={() => clearRoom(entry)} className="w-full px-3 py-2 text-sm hover:bg-surface-sunken inline-flex items-center gap-2.5 text-left">
                <X className="h-3.5 w-3.5 text-muted-foreground" />Clear room
              </button>
            )}
            {entry.roomNo && !entry.checkedOut && (
              <button type="button" onClick={() => { checkOutGuest(entry); setRowMenuFor(null); }} className="w-full px-3 py-2 text-sm hover:bg-surface-sunken inline-flex items-center gap-2.5 text-left">
                <LogOut className="h-3.5 w-3.5 text-success" />Check out guest
              </button>
            )}
```

Change to:

```tsx
            {entry.roomNo && (
              <button type="button" onClick={() => clearRoom(entry)} className="w-full px-3 py-2 text-sm hover:bg-surface-sunken inline-flex items-center gap-2.5 text-left">
                <X className="h-3.5 w-3.5 text-muted-foreground" />Clear room
              </button>
            )}
            {entry.roomNo && !entry.checkedIn && (
              <button type="button" onClick={() => { checkInGuest(entry); setRowMenuFor(null); }} className="w-full px-3 py-2 text-sm hover:bg-surface-sunken inline-flex items-center gap-2.5 text-left">
                <LogIn className="h-3.5 w-3.5 text-success" />Check in guest
              </button>
            )}
            {entry.checkedIn && !entry.checkedOut && (
              <button type="button" onClick={() => { checkOutGuest(entry); setRowMenuFor(null); }} className="w-full px-3 py-2 text-sm hover:bg-surface-sunken inline-flex items-center gap-2.5 text-left">
                <LogOut className="h-3.5 w-3.5 text-success" />Check out guest
              </button>
            )}
```

(This tightens checkout from "has a room" to "is actually checked in" — checking out someone who never arrived doesn't make sense.)

- [ ] **Step 5: Manual verification**

Run: `pwsh ./start-dev.ps1` from the repo root (starts both the Laravel backend on the pgsql-capable PHP binary and the Next dev server — see `pgsql-php-extension-fix` memory).

In the browser:
1. Open a group booking that has at least one rooming-list guest with a room assigned (e.g. `/groups/GRP5126440`, Rooming List tab).
2. Click the row's "⋮" menu — confirm "Check in guest" appears (not "Check out guest") for a guest that has a room but hasn't been checked in yet.
3. Click "Check in guest" — confirm the toast reads `"<name> checked in · Room <n>"`.
4. Re-open the "⋮" menu on that same row — confirm it now shows "Check out guest" instead.
5. If the group's status badge in the page header was "confirmed" or "tentative", confirm it flipped to "in-house" after step 3.
6. Refresh the page — confirm the checked-in state persisted (didn't revert), proving the `PUT /group-rooming/{id}` call succeeded.

- [ ] **Step 6: Commit**

```bash
git add "luxe-pms/src/app/(app)/groups/[id]/page.tsx"
git commit -m "feat(luxe-pms): add per-guest check-in action to group rooming list"
```

---

### Task 4: Check-in/check-out timestamps

**Files:**
- Create: `hotel-pms-api/database/migrations/2026_07_03_000200_add_checkin_checkout_timestamps_to_group_rooming.php`
- Modify: `hotel-pms-api/app/Http/Controllers/Api/ResourceController.php` (the `group-rooming` rules array — same block Task 1 touched)
- Modify: `luxe-pms/src/app/(app)/groups/[id]/page.tsx`
- Test: `hotel-pms-api/tests/Feature/GroupRoomingCheckInTest.php` (extend the existing file from Task 1, don't create a new one)

**Interfaces:**
- Consumes: `checkInGuest`/`checkOutGuest` (from Task 3).
- Produces: `RoomingEntry.checkedInAt?: string | null` / `checkedOutAt?: string | null` — Task 5 (badges) reads these to show a time next to the status; Task 6 (bulk check-in) stamps `checkedInAt` the same way.

Added mid-plan: while Tasks 1-3 were in review, the user asked to see when each guest checked in/out, not just whether they did. `group_rooming.updated_at` (Laravel's automatic timestamp) was considered and rejected — it bumps on ANY field update to the row (e.g. editing `remarks` later), so it can't be trusted as "the moment of check-in". A dedicated nullable string column, set once and only by the check-in/check-out actions, is the correct approach — the same pattern `bookings.checkIn`/`checkOut` already use in this codebase.

- [ ] **Step 1: Write the failing test**

Modify `hotel-pms-api/tests/Feature/GroupRoomingCheckInTest.php` — add a new test method inside the existing `GroupRoomingCheckInTest` class (alongside `test_checked_in_flag_persists_via_update`):

```php
    public function test_checked_in_at_timestamp_persists_via_update(): void
    {
        $this->auth();

        $created = $this->postJson('/api/group-rooming', [
            'groupCode' => 'GRP1', 'roomNo' => '201', 'roomType' => 'Deluxe',
            'lead' => 'Asha', 'pax' => 2,
        ])->assertCreated()->json();

        $this->assertNull($created['checkedInAt'] ?? null);

        $this->putJson("/api/group-rooming/{$created['id']}", [
            'checkedIn' => true, 'checkedInAt' => '2026-07-03T14:32:00.000Z',
        ])->assertOk()->assertJsonPath('checkedInAt', '2026-07-03T14:32:00.000Z');

        $this->assertDatabaseHas('group_rooming', [
            'id' => $created['id'], 'checkedInAt' => '2026-07-03T14:32:00.000Z',
        ]);
    }
```

- [ ] **Step 2: Run test to verify it fails**

Run: `C:\php84\php.exe artisan test --filter=GroupRoomingCheckInTest`
Expected: FAIL — either a validation error (`checkedInAt` not an allowed field yet) or the column doesn't exist.

- [ ] **Step 3: Create the migration**

Create `hotel-pms-api/database/migrations/2026_07_03_000200_add_checkin_checkout_timestamps_to_group_rooming.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('group_rooming', function (Blueprint $t) {
            if (!Schema::hasColumn('group_rooming', 'checkedInAt')) {
                $t->string('checkedInAt')->nullable();
            }
            if (!Schema::hasColumn('group_rooming', 'checkedOutAt')) {
                $t->string('checkedOutAt')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('group_rooming', function (Blueprint $t) {
            if (Schema::hasColumn('group_rooming', 'checkedInAt')) {
                $t->dropColumn('checkedInAt');
            }
            if (Schema::hasColumn('group_rooming', 'checkedOutAt')) {
                $t->dropColumn('checkedOutAt');
            }
        });
    }
};
```

- [ ] **Step 4: Add the validation rules**

Modify `hotel-pms-api/app/Http/Controllers/Api/ResourceController.php` — the `group-rooming` block (as left by Task 1) currently reads:

```php
        'group-rooming' => [
            'groupCode' => 'string|max:50', 'roomNo' => 'string|max:50|nullable', 'roomType' => 'string|max:100',
            'lead' => 'string|max:255', 'pax' => 'integer|min:1', 'phone' => 'string|max:50|nullable',
            'remarks' => 'string|max:500|nullable', 'checkedIn' => 'boolean', 'checkedOut' => 'boolean',
        ],
```

Change to:

```php
        'group-rooming' => [
            'groupCode' => 'string|max:50', 'roomNo' => 'string|max:50|nullable', 'roomType' => 'string|max:100',
            'lead' => 'string|max:255', 'pax' => 'integer|min:1', 'phone' => 'string|max:50|nullable',
            'remarks' => 'string|max:500|nullable', 'checkedIn' => 'boolean', 'checkedOut' => 'boolean',
            'checkedInAt' => 'string|max:50|nullable', 'checkedOutAt' => 'string|max:50|nullable',
        ],
```

(No model cast needed — these are plain nullable strings, same treatment as `roomNo`.)

- [ ] **Step 5: Run the migration and verify the test passes**

Run: `cd hotel-pms-api && C:\php84\php.exe artisan migrate`
Run: `C:\php84\php.exe artisan test --filter=GroupRoomingCheckInTest`
Expected: PASS (2 tests now: the original + this new one)

- [ ] **Step 6: Commit the backend half**

```bash
git add hotel-pms-api/database/migrations/2026_07_03_000200_add_checkin_checkout_timestamps_to_group_rooming.php hotel-pms-api/app/Http/Controllers/Api/ResourceController.php hotel-pms-api/tests/Feature/GroupRoomingCheckInTest.php
git commit -m "feat(api): add checkedInAt/checkedOutAt to group_rooming"
```

- [ ] **Step 7: Capture the timestamp on the frontend**

Modify `luxe-pms/src/app/(app)/groups/[id]/page.tsx:23` (the `RoomingEntry` type, as left by Task 3) — currently:

```tsx
type RoomingEntry = { id: string; groupCode?: string; roomNo?: string | null; roomType: string; lead: string; pax: number; phone?: string; remarks?: string; checkedIn?: boolean; checkedOut?: boolean };
```

Change to:

```tsx
type RoomingEntry = { id: string; groupCode?: string; roomNo?: string | null; roomType: string; lead: string; pax: number; phone?: string; remarks?: string; checkedIn?: boolean; checkedInAt?: string | null; checkedOut?: boolean; checkedOutAt?: string | null };
```

Modify `checkOutGuest` (as left by Task 3) — currently:

```tsx
  const checkOutGuest = (entry: RoomingEntry) => {
    setRooming(prev => prev.map(r => r.id === entry.id ? { ...r, checkedOut: true } : r));
    apiPut(`/group-rooming/${entry.id}`, { checkedOut: true }).catch(() => flash("⚠ Save failed — backend offline"));
    releaseRoom(entry.roomNo);
    flash(`${entry.lead} checked out${entry.roomNo ? ` · Room ${entry.roomNo} → housekeeping` : ""}`);
  };
```

Change to:

```tsx
  const checkOutGuest = (entry: RoomingEntry) => {
    const at = new Date().toISOString();
    setRooming(prev => prev.map(r => r.id === entry.id ? { ...r, checkedOut: true, checkedOutAt: at } : r));
    apiPut(`/group-rooming/${entry.id}`, { checkedOut: true, checkedOutAt: at }).catch(() => flash("⚠ Save failed — backend offline"));
    releaseRoom(entry.roomNo);
    flash(`${entry.lead} checked out${entry.roomNo ? ` · Room ${entry.roomNo} → housekeeping` : ""}`);
  };
```

Modify `checkInGuest` (as left by Task 3) — currently:

```tsx
  const checkInGuest = (entry: RoomingEntry) => {
    setRooming(prev => prev.map(r => r.id === entry.id ? { ...r, checkedIn: true } : r));
    apiPut(`/group-rooming/${entry.id}`, { checkedIn: true }).catch(() => flash("⚠ Save failed — backend offline"));
    if (group && (group.status === "confirmed" || group.status === "tentative")) {
      setGroup(g => g ? { ...g, status: "in-house" } : g);
      apiPut(`/group-bookings/${group.id}`, { status: "in-house" }).catch(() => {});
    }
    flash(`${entry.lead} checked in${entry.roomNo ? ` · Room ${entry.roomNo}` : ""}`);
  };
```

Change to:

```tsx
  const checkInGuest = (entry: RoomingEntry) => {
    const at = new Date().toISOString();
    setRooming(prev => prev.map(r => r.id === entry.id ? { ...r, checkedIn: true, checkedInAt: at } : r));
    apiPut(`/group-rooming/${entry.id}`, { checkedIn: true, checkedInAt: at }).catch(() => flash("⚠ Save failed — backend offline"));
    if (group && (group.status === "confirmed" || group.status === "tentative")) {
      setGroup(g => g ? { ...g, status: "in-house" } : g);
      apiPut(`/group-bookings/${group.id}`, { status: "in-house" }).catch(() => {});
    }
    flash(`${entry.lead} checked in${entry.roomNo ? ` · Room ${entry.roomNo}` : ""}`);
  };
```

- [ ] **Step 8: Manual verification**

With the dev server running (`pwsh ./start-dev.ps1`):

1. Check in a guest via the row menu. Refresh the page.
2. Open the browser's Network tab (or re-check via `curl http://localhost:8000/api/group-rooming?groupCode=<code>`) and confirm the guest's `checkedInAt` is a real ISO timestamp close to the current time, not null.
3. Check out a different already-checked-in guest and confirm `checkedOutAt` is likewise populated.

- [ ] **Step 9: Commit the frontend half**

```bash
git add "luxe-pms/src/app/(app)/groups/[id]/page.tsx"
git commit -m "feat(luxe-pms): capture check-in/check-out timestamps"
```

---

### Task 5: Guest status badges with check-in/out time + Rooming List summary line

**Files:**
- Modify: `luxe-pms/src/app/(app)/groups/[id]/page.tsx`

**Interfaces:**
- Consumes: `RoomingEntry.checkedIn`, `checkedInAt`, `checkedOut`, `checkedOutAt` (from Tasks 3-4).

- [ ] **Step 1: Import `formatTime`**

Modify `luxe-pms/src/app/(app)/groups/[id]/page.tsx:26` — currently:

```tsx
import { cn, money, formatDate } from "@/lib/utils";
```

Change to:

```tsx
import { cn, money, formatDate, formatTime } from "@/lib/utils";
```

- [ ] **Step 2: Update the Rooming List summary line**

Modify `luxe-pms/src/app/(app)/groups/[id]/page.tsx` — currently:

```tsx
                <p className="text-xs text-muted-foreground mt-1">{rooming.length} guests in {group.totalRooms} rooms · {rooming.filter(r => !r.roomNo).length} pending allocation</p>
```

Change to:

```tsx
                <p className="text-xs text-muted-foreground mt-1">{rooming.length} guests in {group.totalRooms} rooms · {rooming.filter(r => !r.roomNo).length} pending allocation · {rooming.filter(r => r.checkedIn && !r.checkedOut).length} checked in</p>
```

- [ ] **Step 3: Replace the bare checked-out badge with a full status badge, including the time**

Modify `luxe-pms/src/app/(app)/groups/[id]/page.tsx` — currently:

```tsx
                  <td className="px-5 py-3">{g.lead}{g.checkedOut && <Badge tone="success" className="ml-2"><LogOut className="h-3 w-3" />Checked out</Badge>}</td>
```

Change to:

```tsx
                  <td className="px-5 py-3">
                    {g.lead}
                    {g.checkedOut ? (
                      <Badge tone="success" className="ml-2"><LogOut className="h-3 w-3" />Checked out{g.checkedOutAt ? ` · ${formatTime(g.checkedOutAt)}` : ""}</Badge>
                    ) : g.checkedIn ? (
                      <Badge tone="success" className="ml-2"><LogIn className="h-3 w-3" />In-house{g.checkedInAt ? ` · ${formatTime(g.checkedInAt)}` : ""}</Badge>
                    ) : g.roomNo ? (
                      <Badge tone="neutral" className="ml-2">Arriving</Badge>
                    ) : null}
                  </td>
```

- [ ] **Step 4: Manual verification**

With the dev server still running:

1. Open a group's Rooming List tab with a mix of guests: one with no room, one with a room but not checked in, one checked in, one checked out.
2. Confirm badges: no room → no badge; room assigned only → "Arriving" (neutral/gray); checked in → "In-house · HH:MM" (green, showing the actual time you checked them in); checked out → "Checked out · HH:MM" (green).
3. Confirm the summary line under "Rooming List" now reads e.g. `"4 guests in 7 rooms · 1 pending allocation · 2 checked in"` and the checked-in count matches the badges.

- [ ] **Step 5: Commit**

```bash
git add "luxe-pms/src/app/(app)/groups/[id]/page.tsx"
git commit -m "feat(luxe-pms): show per-guest check-in status badges with timestamps"
```

---

### Task 6: Bulk "Check-in Group" checks in every guest with a room assigned

**Files:**
- Modify: `luxe-pms/src/app/(app)/groups/[id]/page.tsx`

**Interfaces:**
- Consumes: `RoomingEntry.checkedIn`, `rooming` state (from Task 3); stamps `checkedInAt` the same way Task 4's `checkInGuest` does.

- [ ] **Step 1: Rewrite `checkInGroup`**

Modify `luxe-pms/src/app/(app)/groups/[id]/page.tsx` — currently:

```tsx
  // Check the whole group in.
  const checkInGroup = () => {
    if (!group) return;
    setGroup(g => g ? { ...g, status: "in-house" } : g);
    apiPut(`/group-bookings/${group.id}`, { status: "in-house" }).catch(() => flash("⚠ Save failed — backend offline"));
    flash("Group checked in");
  };
```

Change to:

```tsx
  // Check the whole group in: checks in every guest that already has a room
  // assigned (guests still waiting on a room are skipped, not silently
  // dropped — the toast reports how many of each) and flips group status.
  const checkInGroup = () => {
    if (!group) return;
    const at = new Date().toISOString();
    const toCheckIn = rooming.filter(r => r.roomNo && !r.checkedIn);
    const skipped = rooming.filter(r => !r.roomNo && !r.checkedIn).length;
    toCheckIn.forEach(r => apiPut(`/group-rooming/${r.id}`, { checkedIn: true, checkedInAt: at }).catch(() => {}));
    setRooming(prev => prev.map(r => toCheckIn.some(c => c.id === r.id) ? { ...r, checkedIn: true, checkedInAt: at } : r));
    setGroup(g => g ? { ...g, status: "in-house" } : g);
    apiPut(`/group-bookings/${group.id}`, { status: "in-house" }).catch(() => flash("⚠ Save failed — backend offline"));
    flash(
      toCheckIn.length
        ? `${toCheckIn.length} guest${toCheckIn.length === 1 ? "" : "s"} checked in${skipped ? ` · ${skipped} still need${skipped === 1 ? "s" : ""} a room` : ""}`
        : skipped ? `No guests checked in · ${skipped} still need${skipped === 1 ? "s" : ""} a room` : "Group checked in"
    );
  };
```

- [ ] **Step 2: Manual verification**

With the dev server running:

1. Open a group with 3 rooming-list guests: 2 with rooms assigned (not yet checked in), 1 with no room.
2. Click the page header's "Check-in Group" button.
3. Confirm the toast reads `"2 guests checked in · 1 still needs a room"`.
4. Switch to the Rooming List tab — confirm the 2 room-assigned guests now show the "In-house · HH:MM" badge with a current-looking time, and the guest with no room still shows no badge.
5. Confirm the group's overall status badge in the page header shows "in-house".
6. Refresh the page — confirm all of the above persisted.

- [ ] **Step 3: Commit**

```bash
git add "luxe-pms/src/app/(app)/groups/[id]/page.tsx"
git commit -m "feat(luxe-pms): bulk group check-in now checks in every room-assigned guest"
```
