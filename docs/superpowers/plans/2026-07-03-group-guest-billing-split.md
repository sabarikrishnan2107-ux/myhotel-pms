# Group Guest Billing (Master vs Self-Pay) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a group booking's guests order room extras (F&B/room service via the in-room screen, Room Rack, and POS), routing each charge either to the group's master folio or to that guest's own self-pay mini-folio based on a per-guest `billTo` flag.

**Architecture:** A per-guest `billTo` column (`group`/`self`) plus a persisted group-level `billingMode` default. The `room-board` endpoint gains a single `chargeTo` field — the folio a charge for that physical room lands on (individual bookingNo, or group code, or a synthetic `GRPG-<roomingId>` self-pay key) — and all three room-charge paths post through it. Self-pay folios reuse the existing `folio_charges`/`folio_payments` tables keyed by the synthetic number; the per-guest mini-folio is a filtered view on the group detail page.

**Tech Stack:** Laravel 11 (PHP, PHPUnit feature tests on SQLite in-memory), Next.js/React (TypeScript, Vitest for pure lib functions only — page components verified via the dev server per repo convention).

## Global Constraints

- Guarded-migration pattern (`if (!Schema::hasColumn(...))` up / `if (Schema::hasColumn(...))` down), matching `hotel-pms-api/database/migrations/2026_06_29_000001_add_checked_out_to_group_rooming.php`.
- Self-pay folio key format is exactly `GRPG-<roomingId>` (e.g. `GRPG-42`), where `<roomingId>` is the `group_rooming` row id. Used verbatim in the resolver, the charge paths, the mini-folio, and the checkout guards.
- `billTo` values are exactly `'group'` and `'self'`; default `'group'`. `billingMode` values are exactly `'master'`, `'per-room'`, `'split'`; default `'master'`. New-guest `billTo` default: `master → 'group'`, else `'self'`.
- `room-board`'s `bookingNo`/`bookingId` stay `null` for group rooms (do NOT populate them) — the Room Rack's nav-button guards depend on that. `chargeTo` is a separate field for charge routing only.
- `paidBy` on a posted charge is `"Guest"` when the target key starts with `GRPG-`, else `"Room"`.
- Backend PHPUnit tests use `RefreshDatabase` + `actingAs(User::factory()->create(), 'sanctum')`, run via `C:\php84\php.exe artisan test` (default `php` lacks pgsql; tests use SQLite in-memory so any PHP works, but use the C:\php84 binary to be safe).
- Frontend has no component-test harness; frontend tasks are verified live via `pwsh ./start-dev.ps1` from the repo root (starts the pgsql-capable backend + Next dev server) and `npx tsc --noEmit` from `luxe-pms/`.
- Commit hygiene: `hotel-pms-api/app/Http/Controllers/Api/ResourceController.php` has an UNRELATED pre-existing uncommitted change (hall-bookings `contactName`/`bookedBy`). When editing it, stage only your hunk (`git add -p`) and verify `git diff --staged` shows only your `group-*` rule change. Never run `git restore`/`checkout`/`reset`/`stash` on the working tree.

---

### Task 1: Backend columns — `billingMode` + `billTo` + validation

**Files:**
- Create: `hotel-pms-api/database/migrations/2026_07_03_000400_add_billing_mode_to_group_bookings.php`
- Create: `hotel-pms-api/database/migrations/2026_07_03_000500_add_bill_to_to_group_rooming.php`
- Modify: `hotel-pms-api/app/Http/Controllers/Api/ResourceController.php` (group-bookings rules ~448-456; group-rooming rules ~436-441)
- Test: `hotel-pms-api/tests/Feature/GroupBillingFieldsTest.php`

**Interfaces:**
- Produces: `group_bookings.billingMode` (string, default `'master'`) and `group_rooming.billTo` (string, default `'group'`), both writable/readable through the existing REST resources. Task 2 reads `billTo`; Tasks 4/5 write it; Task 4 writes `billingMode`.

- [ ] **Step 1: Write the failing test**

Create `hotel-pms-api/tests/Feature/GroupBillingFieldsTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GroupBillingFieldsTest extends TestCase
{
    use RefreshDatabase;

    private function auth(): void
    {
        $this->actingAs(User::factory()->create(), 'sanctum');
    }

    public function test_group_billing_mode_defaults_and_persists(): void
    {
        $this->auth();

        $created = $this->postJson('/api/group-bookings', [
            'code' => 'GRP1', 'name' => 'Test Wedding', 'arrival' => '2026-07-10', 'departure' => '2026-07-12',
        ])->assertCreated()->json();
        $this->assertSame('master', $created['billingMode']);

        $this->putJson("/api/group-bookings/{$created['id']}", ['billingMode' => 'split'])
            ->assertOk()->assertJsonPath('billingMode', 'split');
    }

    public function test_rooming_bill_to_defaults_and_persists(): void
    {
        $this->auth();

        $created = $this->postJson('/api/group-rooming', [
            'groupCode' => 'GRP1', 'roomNo' => '201', 'roomType' => 'Deluxe', 'lead' => 'Asha', 'pax' => 2,
        ])->assertCreated()->json();
        $this->assertSame('group', $created['billTo']);

        $this->putJson("/api/group-rooming/{$created['id']}", ['billTo' => 'self'])
            ->assertOk()->assertJsonPath('billTo', 'self');
        $this->assertDatabaseHas('group_rooming', ['id' => $created['id'], 'billTo' => 'self']);
    }
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd hotel-pms-api && C:\php84\php.exe artisan test --filter=GroupBillingFieldsTest`
Expected: FAIL — `billingMode`/`billTo` keys absent (columns/validation missing).

- [ ] **Step 3: Create the group_bookings migration**

Create `hotel-pms-api/database/migrations/2026_07_03_000400_add_billing_mode_to_group_bookings.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('group_bookings', function (Blueprint $t) {
            if (!Schema::hasColumn('group_bookings', 'billingMode')) {
                $t->string('billingMode')->default('master');
            }
        });
    }

    public function down(): void
    {
        Schema::table('group_bookings', function (Blueprint $t) {
            if (Schema::hasColumn('group_bookings', 'billingMode')) {
                $t->dropColumn('billingMode');
            }
        });
    }
};
```

- [ ] **Step 4: Create the group_rooming migration**

Create `hotel-pms-api/database/migrations/2026_07_03_000500_add_bill_to_to_group_rooming.php`:

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
            if (!Schema::hasColumn('group_rooming', 'billTo')) {
                $t->string('billTo')->default('group');
            }
        });
    }

    public function down(): void
    {
        Schema::table('group_rooming', function (Blueprint $t) {
            if (Schema::hasColumn('group_rooming', 'billTo')) {
                $t->dropColumn('billTo');
            }
        });
    }
};
```

- [ ] **Step 5: Add `billingMode` to the group-bookings validation rules**

In `hotel-pms-api/app/Http/Controllers/Api/ResourceController.php`, the `group-bookings` block currently ends:

```php
            'notes' => 'string|max:2000|nullable', 'createdAt' => 'string|max:50|nullable',
        ],
```

Change to:

```php
            'notes' => 'string|max:2000|nullable', 'createdAt' => 'string|max:50|nullable',
            'billingMode' => 'string|max:20',
        ],
```

- [ ] **Step 6: Add `billTo` to the group-rooming validation rules**

The `group-rooming` block currently ends:

```php
            'checkedInAt' => 'string|max:50|nullable', 'checkedOutAt' => 'string|max:50|nullable',
        ],
```

Change to:

```php
            'checkedInAt' => 'string|max:50|nullable', 'checkedOutAt' => 'string|max:50|nullable',
            'billTo' => 'string|max:20',
        ],
```

- [ ] **Step 7: Run the migrations and the test**

Run: `cd hotel-pms-api && C:\php84\php.exe artisan migrate`
Run: `C:\php84\php.exe artisan test --filter=GroupBillingFieldsTest`
Expected: PASS (2 tests).

Note: if `test_group_billing_mode_defaults_and_persists` fails on the default assertion because `create()` doesn't echo DB defaults, add a class-level default on the model exactly as `GroupRooming` already does for its booleans — but check first: `GroupBooking` (`app/Models/GroupBooking.php`) and `GroupRooming` (`app/Models/GroupRooming.php`). If the default assertion fails, add `protected $attributes = ['billingMode' => 'master'];` to `GroupBooking` and `protected $attributes = ['billTo' => 'group'];` to `GroupRooming` (merge with any existing `$attributes`), then re-run.

- [ ] **Step 8: Commit (mind the hygiene note)**

Stage the two migrations, the test, and ONLY your ResourceController hunks:
```bash
git add hotel-pms-api/database/migrations/2026_07_03_000400_add_billing_mode_to_group_bookings.php hotel-pms-api/database/migrations/2026_07_03_000500_add_bill_to_to_group_rooming.php hotel-pms-api/tests/Feature/GroupBillingFieldsTest.php
git add -p hotel-pms-api/app/Http/Controllers/Api/ResourceController.php   # stage only the group-bookings + group-rooming rule additions
git diff --staged hotel-pms-api/app/Http/Controllers/Api/ResourceController.php   # verify: only billingMode + billTo lines, NO hall-bookings
```
If the model `$attributes` change was needed, `git add hotel-pms-api/app/Models/GroupBooking.php hotel-pms-api/app/Models/GroupRooming.php` too. Then:
```bash
git commit -m "feat(api): add group billingMode + per-guest billTo fields"
```

---

### Task 2: `chargeTo` resolver on `room-board`

**Files:**
- Modify: `hotel-pms-api/app/Http/Controllers/Api/StatsController.php` (the `roomBoard()` method, ~243-297)
- Test: `hotel-pms-api/tests/Feature/RoomBoardChargeToTest.php`

**Interfaces:**
- Consumes: `group_rooming.billTo` (Task 1).
- Produces: each `/api/room-board` row gains `chargeTo` (string|null) — the folio a charge for that room posts to. Task 3 reads it. `bookingNo`/`bookingId` are unchanged (still null for group rooms).

- [ ] **Step 1: Write the failing test**

Create `hotel-pms-api/tests/Feature/RoomBoardChargeToTest.php`:

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

class RoomBoardChargeToTest extends TestCase
{
    use RefreshDatabase;

    private function auth(): void
    {
        $this->actingAs(User::factory()->create(), 'sanctum');
    }

    private function board(string $number): array
    {
        return collect($this->getJson('/api/room-board')->assertOk()->json())->firstWhere('number', $number);
    }

    public function test_individual_booking_charge_to_is_its_booking_no(): void
    {
        $this->auth();
        Room::create(['number' => '301', 'floor' => 3, 'category' => 'Deluxe', 'baseTariff' => 6500]);
        Booking::create([
            'bookingNo' => 'BK9', 'guestName' => 'Ivy', 'roomNumber' => '301', 'roomType' => 'Deluxe',
            'checkIn' => '2026-07-01', 'checkOut' => '2026-07-05', 'status' => 'checked-in',
        ]);
        $this->assertSame('BK9', $this->board('301')['chargeTo']);
    }

    public function test_group_pays_guest_charge_to_is_group_code(): void
    {
        $this->auth();
        Room::create(['number' => '302', 'floor' => 3, 'category' => 'Deluxe', 'baseTariff' => 6500]);
        GroupBooking::create(['code' => 'GRPA', 'name' => 'G', 'arrival' => '2026-07-10', 'departure' => '2026-07-12', 'status' => 'in-house']);
        GroupRooming::create([
            'groupCode' => 'GRPA', 'roomNo' => '302', 'roomType' => 'Deluxe', 'lead' => 'Jo', 'pax' => 1,
            'checkedIn' => true, 'checkedOut' => false, 'billTo' => 'group',
        ]);
        $this->assertSame('GRPA', $this->board('302')['chargeTo']);
    }

    public function test_self_pay_guest_charge_to_is_synthetic_key(): void
    {
        $this->auth();
        Room::create(['number' => '303', 'floor' => 3, 'category' => 'Deluxe', 'baseTariff' => 6500]);
        GroupBooking::create(['code' => 'GRPB', 'name' => 'G', 'arrival' => '2026-07-10', 'departure' => '2026-07-12', 'status' => 'in-house']);
        $r = GroupRooming::create([
            'groupCode' => 'GRPB', 'roomNo' => '303', 'roomType' => 'Deluxe', 'lead' => 'Kai', 'pax' => 1,
            'checkedIn' => true, 'checkedOut' => false, 'billTo' => 'self',
        ]);
        $this->assertSame("GRPG-{$r->id}", $this->board('303')['chargeTo']);
    }

    public function test_vacant_room_charge_to_is_null(): void
    {
        $this->auth();
        Room::create(['number' => '304', 'floor' => 3, 'category' => 'Deluxe', 'baseTariff' => 6500]);
        $this->assertNull($this->board('304')['chargeTo']);
    }
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd hotel-pms-api && C:\php84\php.exe artisan test --filter=RoomBoardChargeToTest`
Expected: FAIL — `chargeTo` key absent.

- [ ] **Step 3: Extend the `$groupOccupied` select**

In `hotel-pms-api/app/Http/Controllers/Api/StatsController.php`, the `$groupOccupied` query's `->select(...)` currently is:

```php
            ->select('group_rooming.roomNo', 'group_rooming.lead', 'group_bookings.arrival', 'group_bookings.departure')
```

Change to (adds the rooming id + billTo needed to compute the key):

```php
            ->select('group_rooming.id', 'group_rooming.roomNo', 'group_rooming.lead', 'group_rooming.billTo', 'group_bookings.arrival', 'group_bookings.departure')
```

- [ ] **Step 4: Compute `chargeTo` and add it to the returned row**

Note: Step 3's `->select(...)` must also carry `group_rooming.groupCode` so the group-pays branch can read it. Use this exact select (supersedes Step 3's — it adds `groupCode`):

```php
            ->select('group_rooming.id', 'group_rooming.groupCode', 'group_rooming.roomNo', 'group_rooming.lead', 'group_rooming.billTo', 'group_bookings.arrival', 'group_bookings.departure')
```

In the `Room::...->map(function ($r) use (...) {` body, find where `$grp` is assigned:

```php
            $grp = $bk ? null : $groupOccupied->get($r->number);
```

Immediately after it, add the `$chargeTo` local:

```php
            // Where a charge for this physical room posts: the individual booking,
            // or the group master folio (group-pays), or the guest's own synthetic
            // folio (self-pay). Separate from bookingNo, which stays null for group
            // rooms so the Room Rack's nav-button guards keep hiding them.
            $chargeTo = null;
            if ($bk) {
                $chargeTo = $bk->bookingNo;
            } elseif ($grp) {
                $chargeTo = $grp->billTo === 'self' ? "GRPG-{$grp->id}" : $grp->groupCode;
            }
```

Then in the returned array, insert `chargeTo` right before the existing `'bookingNo'` line (leave `bookingNo`/`bookingId` exactly as-is):

```php
                'chargeTo'      => $chargeTo,
                'bookingNo'     => $bk->bookingNo ?? null,
                'bookingId'     => $bk->id ?? null,
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `C:\php84\php.exe artisan test --filter=RoomBoardChargeToTest`
Expected: PASS (4 tests).

- [ ] **Step 6: Run the room-board regression tests**

Run: `C:\php84\php.exe artisan test --filter=RoomBoardGroupOccupancyTest`
Expected: PASS (5 tests) — confirms the check-in feature's occupancy behavior is unbroken.

- [ ] **Step 7: Commit**

```bash
git add hotel-pms-api/app/Http/Controllers/Api/StatsController.php hotel-pms-api/tests/Feature/RoomBoardChargeToTest.php
git commit -m "feat(api): room-board exposes chargeTo for group-guest charge routing"
```

---

### Task 3: Route the three room-charge paths through `chargeTo`

**Files:**
- Modify: `luxe-pms/src/lib/types.ts` (the `Room` interface, ~50)
- Modify: `luxe-pms/src/app/(app)/menu/[room]/page.tsx` (~50, ~88, ~136-148)
- Modify: `luxe-pms/src/app/(app)/rack/page.tsx` (~778-783, the `kind === "order"` branch)
- Modify: `luxe-pms/src/app/(app)/fb/pos/page.tsx` (`chargeToRoom`, ~273-289)

**Interfaces:**
- Consumes: `room-board`'s `chargeTo` field (Task 2).
- Produces: all three paths post `folio-charges` with `bookingNo: <chargeTo>` and `paidBy` derived from the key. Later tasks read the resulting charges by `GRPG-<id>` (mini-folio) and by group code (billing tab).

- [ ] **Step 1: Add `chargeTo` to the shared `Room` type**

In `luxe-pms/src/lib/types.ts`, the `Room` interface has:

```ts
  bookingNo?: string;
  bookingId?: number;
```

Change to:

```ts
  bookingNo?: string;
  bookingId?: number;
  // Folio a charge for this physical room posts to (individual bookingNo,
  // group master code, or a GRPG-<roomingId> self-pay key). Present on /room-board.
  chargeTo?: string | null;
```

- [ ] **Step 2: Route the self-service room order (`menu/[room]`)**

In `luxe-pms/src/app/(app)/menu/[room]/page.tsx`, line ~50:

```tsx
  const [bookingNo, setBookingNo] = React.useState<string | null>(null);
```

Change to:

```tsx
  const [chargeTo, setChargeTo] = React.useState<string | null>(null);
```

Line ~82-88 (the room-board effect), currently:

```tsx
        const match = rows.find(r => r.number === room);
        setBookingNo(match && match.status === "occupied" && match.bookingNo ? match.bookingNo : null);
```

Change to:

```tsx
        const match = rows.find(r => r.number === room);
        setChargeTo(match && match.status === "occupied" ? (match.chargeTo ?? null) : null);
```

Line ~136-148 (`placeOrder`), currently:

```tsx
  const placeOrder = async () => {
    if (!bookingNo) {
      showToast("This room has no current guest — orders can't be placed");
      return;
    }
    setPlacing(true);
    const today = new Date().toISOString().slice(0, 10);
    try {
      const created = await apiPost<{ id: number | string }>("/folio-charges", {
        bookingNo, date: today,
        description: `F&B order (self-service) · ${cartCount} item${cartCount === 1 ? "" : "s"}`,
        type: "F&B", qty: cartCount, rate: cartTotal, tax: gst, amount: grandTotal, paidBy: "Room",
      });
```

Change to:

```tsx
  const placeOrder = async () => {
    if (!chargeTo) {
      showToast("This room has no current guest — orders can't be placed");
      return;
    }
    setPlacing(true);
    const today = new Date().toISOString().slice(0, 10);
    try {
      const created = await apiPost<{ id: number | string }>("/folio-charges", {
        bookingNo: chargeTo, date: today,
        description: `F&B order (self-service) · ${cartCount} item${cartCount === 1 ? "" : "s"}`,
        type: "F&B", qty: cartCount, rate: cartTotal, tax: gst, amount: grandTotal,
        paidBy: chargeTo.startsWith("GRPG-") ? "Guest" : "Room",
      });
```

Then replace the two remaining `bookingNo` references in the JSX (lines ~528 and ~627) — `{!bookingNo && (` becomes `{!chargeTo && (` and `disabled={placing || !bookingNo}` becomes `disabled={placing || !chargeTo}`.

- [ ] **Step 3: Route the Room Rack order action**

In `luxe-pms/src/app/(app)/rack/page.tsx`, the `kind === "order"` branch currently:

```tsx
        if (room.bookingNo) {
          await apiPost("/folio-charges", {
            bookingNo: room.bookingNo, date: today,
            description: `${dept.charAt(0).toUpperCase() + dept.slice(1)} order · ${orderItemCount} item${orderItemCount === 1 ? "" : "s"}`,
            type: chargeType, qty: orderItemCount, rate: orderSubtotal, tax: orderTax, amount: orderTotal, paidBy: "Room",
          });
        }
```

Change to (route via `chargeTo`, so a group guest's room can be ordered to; other Rack actions still use `bookingNo` and are untouched):

```tsx
        if (room.chargeTo) {
          await apiPost("/folio-charges", {
            bookingNo: room.chargeTo, date: today,
            description: `${dept.charAt(0).toUpperCase() + dept.slice(1)} order · ${orderItemCount} item${orderItemCount === 1 ? "" : "s"}`,
            type: chargeType, qty: orderItemCount, rate: orderSubtotal, tax: orderTax, amount: orderTotal,
            paidBy: room.chargeTo.startsWith("GRPG-") ? "Guest" : "Room",
          });
        }
```

- [ ] **Step 4: Route the POS "charge to room"**

In `luxe-pms/src/app/(app)/fb/pos/page.tsx`, `chargeToRoom` currently:

```tsx
  const chargeToRoom = async (roomNumber: string) => {
    setChargeRoomOpen(false);
    try {
      const list = await apiGet<Reservation[]>("/bookings");
      const bk = list.find(b => b.roomNumber === roomNumber && (b as { status?: string }).status !== "cancelled");
      if (!bk) { showToast(`No active booking in room ${roomNumber}`); return; }
      await apiPost("/folio-charges", {
        bookingNo: bk.bookingNo,
        date: new Date().toISOString().slice(0, 10),
        description: `F&B — ${selectedTable} (${lines.length} items)`,
        type: "F&B",
        qty: 1,
        rate: Math.round(grandTotal),
        tax: 0,
        amount: Math.round(grandTotal),
        paidBy: "Guest",
      });
```

Change to (resolve via `room-board`'s `chargeTo`, so group guests are found too):

```tsx
  const chargeToRoom = async (roomNumber: string) => {
    setChargeRoomOpen(false);
    try {
      const board = await apiGet<{ number: string; status: string; chargeTo?: string | null }[]>("/room-board");
      const match = board.find(r => r.number === roomNumber && r.status === "occupied");
      const chargeTo = match?.chargeTo ?? null;
      if (!chargeTo) { showToast(`No active guest in room ${roomNumber}`); return; }
      await apiPost("/folio-charges", {
        bookingNo: chargeTo,
        date: new Date().toISOString().slice(0, 10),
        description: `F&B — ${selectedTable} (${lines.length} items)`,
        type: "F&B",
        qty: 1,
        rate: Math.round(grandTotal),
        tax: 0,
        amount: Math.round(grandTotal),
        paidBy: chargeTo.startsWith("GRPG-") ? "Guest" : "Room",
      });
```

- [ ] **Step 5: Typecheck**

Run: `cd luxe-pms && npx tsc --noEmit`
Expected: exit 0. (If `Reservation` import in `fb/pos` becomes unused, remove it from the imports to keep the lint clean.)

- [ ] **Step 6: Manual verification (dev server)**

Run `pwsh ./start-dev.ps1` from the repo root. Log in (admin@hotel.com / password123). Prepare a group with two checked-in guests in rooms — one `billTo=group`, one `billTo=self` (set `billTo` directly via `curl -X PUT` against `/api/group-rooming/{id}` for now, since the toggle UI is Task 5). Then:
1. **Self-service:** open `/menu/<selfPayRoom>` — the order button is enabled (was disabled before). Place an order. Verify via `curl "http://localhost:8000/api/folio-charges?bookingNo=GRPG-<id>"` that the charge landed with `paidBy: "Guest"`.
2. Open `/menu/<groupPayRoom>` — place an order; verify via `curl ".../folio-charges?bookingNo=<groupCode>"` it landed with `paidBy: "Room"`.
3. **Room Rack:** on the group-pays room's card, use the "Order" action; confirm it posts to the group code.
4. Record the observed `paidBy` and `bookingNo` for each in the report.

- [ ] **Step 7: Commit**

```bash
git add luxe-pms/src/lib/types.ts "luxe-pms/src/app/(app)/menu/[room]/page.tsx" "luxe-pms/src/app/(app)/rack/page.tsx" "luxe-pms/src/app/(app)/fb/pos/page.tsx"
git commit -m "feat(luxe-pms): route group-guest room charges via room-board chargeTo"
```

---

### Task 4: Default `billTo` from the group's billing mode

**Files:**
- Modify: `luxe-pms/src/app/(app)/groups/new/page.tsx` (the create POST, ~317-324)
- Modify: `luxe-pms/src/app/(app)/groups/[id]/page.tsx` (the `RoomingEntry` type ~23; the `GroupBooking`-consuming state; `addGuest` ~139-145)

**Interfaces:**
- Consumes: `billingMode`/`billTo` fields (Task 1).
- Produces: newly created groups persist `billingMode`; guests added via `addGuest` default `billTo` from the group's `billingMode`. Task 5 reads/toggles `billTo`.

- [ ] **Step 1: Send `billingMode` on group creation**

In `luxe-pms/src/app/(app)/groups/new/page.tsx`, the create payload (~317-324) currently includes `bookedBy, arrival, departure, nights,` and later `status, notes, createdAt`. Add `billingMode` — find:

```tsx
      totalRooms, totalPax: paxNum, ratePlan,
```

Change to:

```tsx
      totalRooms, totalPax: paxNum, ratePlan, billingMode,
```

(`billingMode` is already in local state at `page.tsx:103`.)

- [ ] **Step 2: Add `billTo` to `RoomingEntry` and default it on add**

In `luxe-pms/src/app/(app)/groups/[id]/page.tsx`, `RoomingEntry` (~23) currently:

```tsx
type RoomingEntry = { id: string; groupCode?: string; roomNo?: string | null; roomType: string; lead: string; pax: number; phone?: string; remarks?: string; checkedIn?: boolean; checkedInAt?: string | null; checkedOut?: boolean; checkedOutAt?: string | null };
```

Change to (append `billTo`):

```tsx
type RoomingEntry = { id: string; groupCode?: string; roomNo?: string | null; roomType: string; lead: string; pax: number; phone?: string; remarks?: string; checkedIn?: boolean; checkedInAt?: string | null; checkedOut?: boolean; checkedOutAt?: string | null; billTo?: "group" | "self" };
```

The `addGuest` function (~139-145) currently:

```tsx
  const addGuest = (g: { lead: string; roomType: string; pax: number; phone?: string; remarks?: string }) => {
    apiPost<RoomingEntry>("/group-rooming", { ...g, groupCode: id, roomNo: null })
      .then(row => setRooming(prev => [...prev, { ...row, id: String(row.id) }]))
      .catch(() => flash("⚠ Save failed — backend offline"));
    setAddGuestOpen(false);
    flash(`${g.lead} added to rooming list`);
  };
```

Change to (default `billTo` from the group's `billingMode`; `master → group`, else `self`):

```tsx
  const addGuest = (g: { lead: string; roomType: string; pax: number; phone?: string; remarks?: string }) => {
    const billTo: "group" | "self" = (group?.billingMode ?? "master") === "master" ? "group" : "self";
    apiPost<RoomingEntry>("/group-rooming", { ...g, groupCode: id, roomNo: null, billTo })
      .then(row => setRooming(prev => [...prev, { ...row, id: String(row.id) }]))
      .catch(() => flash("⚠ Save failed — backend offline"));
    setAddGuestOpen(false);
    flash(`${g.lead} added to rooming list`);
  };
```

- [ ] **Step 3: Extend the `GroupBooking` type reference if needed**

`GroupBooking` is imported from `@/lib/mock-data-ext`. Check whether it includes `billingMode`. Run:
`grep -n "billingMode\|type GroupBooking\|interface GroupBooking" luxe-pms/src/lib/mock-data-ext.ts`
If `billingMode` is not on the type, add `billingMode?: "master" | "per-room" | "split";` to the `GroupBooking` type definition in `luxe-pms/src/lib/mock-data-ext.ts` so `group?.billingMode` typechecks.

- [ ] **Step 4: Typecheck**

Run: `cd luxe-pms && npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 5: Manual verification**

With the dev server running: create a new group with Billing Setup = "Per-room" (or "Split"); after creation, add a guest via the Rooming List "Add Guest". Then `curl "http://localhost:8000/api/group-rooming?groupCode=<code>"` and confirm the new guest's `billTo` is `"self"`. Repeat with a "Master" group and confirm `billTo` is `"group"`. Record both observed values.

- [ ] **Step 6: Commit**

```bash
git add "luxe-pms/src/app/(app)/groups/new/page.tsx" "luxe-pms/src/app/(app)/groups/[id]/page.tsx" luxe-pms/src/lib/mock-data-ext.ts
git commit -m "feat(luxe-pms): persist group billingMode + default guest billTo from it"
```

---

### Task 5: Per-guest billing toggle in the Rooming List

**Files:**
- Modify: `luxe-pms/src/app/(app)/groups/[id]/page.tsx` (rooming table row ~608-628; the row "⋮" menu ~824-840)

**Interfaces:**
- Consumes: `RoomingEntry.billTo` (Task 4).
- Produces: a `setBillTo(entry, value)` handler and a visible per-row toggle. Task 6 reads `billTo` to decide whether to show a self-pay balance.

- [ ] **Step 1: Add the `setBillTo` handler**

In `luxe-pms/src/app/(app)/groups/[id]/page.tsx`, add near the other rooming handlers (after `clearRoom`, ~159):

```tsx
  // Flip who pays a guest's extras. Affects only FUTURE charges — already-posted
  // charges keep whichever folio they landed on.
  const setBillTo = (entry: RoomingEntry, billTo: "group" | "self") => {
    setRooming(prev => prev.map(r => r.id === entry.id ? { ...r, billTo } : r));
    setRowMenuFor(null);
    apiPut(`/group-rooming/${entry.id}`, { billTo }).catch(() => flash("⚠ Save failed — backend offline"));
    flash(`${entry.lead}: extras now billed to ${billTo === "self" ? "guest" : "group"}`);
  };
```

- [ ] **Step 2: Show a billing badge in the Type column cell (or a new cell)**

The rooming row currently renders the Type cell (~609):

```tsx
                  <td className="px-5 py-3"><Badge tone="neutral">{g.roomType}</Badge></td>
```

Change to add a billing badge beneath the type (clickable to toggle):

```tsx
                  <td className="px-5 py-3">
                    <Badge tone="neutral">{g.roomType}</Badge>
                    <button
                      type="button"
                      onClick={() => setBillTo(g, (g.billTo ?? "group") === "group" ? "self" : "group")}
                      title="Click to change who pays this guest's extras (future charges only)"
                      className="ml-2 align-middle"
                    >
                      <Badge tone={(g.billTo ?? "group") === "self" ? "accent" : "neutral"}>
                        {(g.billTo ?? "group") === "self" ? "Self-pay" : "Group pays"}
                      </Badge>
                    </button>
                  </td>
```

(`Badge` supports `tone="accent"` — confirm via `grep -n "accent" luxe-pms/src/components/ui/badge.tsx`; if `accent` is not a valid tone, use `"info"` instead.)

- [ ] **Step 3: Add a menu entry in the row "⋮" menu**

In the portalled row menu, after the "Clear room" button (~831), add:

```tsx
            <button type="button" onClick={() => setBillTo(entry, (entry.billTo ?? "group") === "group" ? "self" : "group")} className="w-full px-3 py-2 text-sm hover:bg-surface-sunken inline-flex items-center gap-2.5 text-left">
              <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />Bill extras to {(entry.billTo ?? "group") === "group" ? "guest" : "group"}
            </button>
```

Ensure `CreditCard` is imported from `lucide-react` at the top of the file (it's used elsewhere on the page already — verify with `grep -n "CreditCard" luxe-pms/src/app/(app)/groups/[id]/page.tsx`; if absent from the import, add it).

- [ ] **Step 4: Typecheck**

Run: `cd luxe-pms && npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 5: Manual verification**

With the dev server running, open a group's Rooming List. Confirm each row shows a "Group pays"/"Self-pay" badge. Click one to flip it — confirm the badge changes, a toast appears, and after refresh the change persisted (or `curl` the rooming row to confirm `billTo`). Confirm the "⋮" menu also offers "Bill extras to guest/group". Record what you observed.

- [ ] **Step 6: Commit**

```bash
git add "luxe-pms/src/app/(app)/groups/[id]/page.tsx"
git commit -m "feat(luxe-pms): per-guest billing toggle in group rooming list"
```

---

### Task 6: Self-pay mini-folio (row balance + drawer + collect)

**Files:**
- Modify: `luxe-pms/src/app/(app)/groups/[id]/page.tsx` (new state + fetch; row balance indicator; a new drawer component in-file; a collect action)

**Interfaces:**
- Consumes: `RoomingEntry.billTo`, the `GRPG-<id>` key convention.
- Produces: `selfPayBalance(entry): number` and a drawer; Task 8 reuses `selfPayBalance` for the checkout guards.

- [ ] **Step 1: Add charge/payment state and a per-guest fetch**

Add state near the rooming state (~67):

```tsx
  // Self-pay guests' folio lines, keyed by rooming id. Fetched per self-pay guest
  // by their GRPG-<id> key so each call returns only that guest's rows.
  const [selfCharges, setSelfCharges] = React.useState<Record<string, { id: string | number; description: string; amount: number; date: string }[]>>({});
  const [selfPayments, setSelfPayments] = React.useState<Record<string, { id: string | number; amount: number; mode: string; date: string }[]>>({});
```

Add an effect that (re)loads self-pay lines whenever the rooming list changes:

```tsx
  React.useEffect(() => {
    const selfGuests = rooming.filter(r => (r.billTo ?? "group") === "self");
    selfGuests.forEach(r => {
      const key = `GRPG-${r.id}`;
      apiGet<{ id: string | number; description: string; amount: number; date: string }[]>(`/folio-charges?bookingNo=${encodeURIComponent(key)}`)
        .then(rows => setSelfCharges(prev => ({ ...prev, [r.id]: rows })))
        .catch(() => {});
      apiGet<{ id: string | number; amount: number; mode: string; date: string }[]>(`/folio-payments?bookingNo=${encodeURIComponent(key)}`)
        .then(rows => setSelfPayments(prev => ({ ...prev, [r.id]: rows })))
        .catch(() => {});
    });
  }, [rooming]);
```

Add the balance helper (near other derived values, after the `if (!group)` guard):

```tsx
  const selfPayBalance = (entry: RoomingEntry): number => {
    const charges = (selfCharges[entry.id] ?? []).reduce((s, c) => s + (c.amount || 0), 0);
    const paid = (selfPayments[entry.id] ?? []).reduce((s, p) => s + (p.amount || 0), 0);
    return Math.max(0, charges - paid);
  };
```

- [ ] **Step 2: Add drawer + collect state**

Near the other dialog state (~68-72):

```tsx
  const [folioFor, setFolioFor] = React.useState<RoomingEntry | null>(null);
  const [collectAmt, setCollectAmt] = React.useState(0);
  const [collectMode, setCollectMode] = React.useState("Cash");
```

Add the collect handler (near `receivePayment`, ~176):

```tsx
  const collectSelfPay = (entry: RoomingEntry) => {
    const amt = Math.round(Number(collectAmt) || 0);
    if (amt <= 0) { flash("Enter a valid amount"); return; }
    const key = `GRPG-${entry.id}`;
    const today = new Date().toISOString().slice(0, 10);
    apiPost<{ id: string | number; amount: number; mode: string; date: string }>("/folio-payments", { bookingNo: key, date: today, mode: collectMode, amount: amt, reference: `${entry.lead} · self-pay extras` })
      .then(row => setSelfPayments(prev => ({ ...prev, [entry.id]: [...(prev[entry.id] ?? []), row] })))
      .catch(() => flash("⚠ Payment not saved — backend offline"));
    setCollectAmt(0);
    flash(`${money(amt)} collected from ${entry.lead}`);
  };
```

- [ ] **Step 3: Show the balance indicator on self-pay rows**

In the Lead Guest cell (the badge block from the check-in feature, ~610-627), after the status badges, add a self-pay balance chip. Find the closing `</td>` of the lead-guest cell and insert before it:

```tsx
                    {(g.billTo ?? "group") === "self" && (
                      <button
                        type="button"
                        onClick={() => { setFolioFor(g); setCollectAmt(selfPayBalance(g)); }}
                        className="ml-2 align-middle"
                        title="View this guest's extras folio"
                      >
                        <Badge tone={selfPayBalance(g) > 0 ? "warning" : "success"}>
                          {selfPayBalance(g) > 0 ? `${money(selfPayBalance(g))} due` : "Settled"}
                        </Badge>
                      </button>
                    )}
```

- [ ] **Step 4: Add the mini-folio drawer**

Near the other portalled overlays (after the row-menu portal block, ~845), add a drawer rendered when `folioFor` is set:

```tsx
      {folioFor && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs" onClick={() => setFolioFor(null)} aria-hidden />
          <aside className="fixed top-0 right-0 z-50 h-svh w-full sm:w-[440px] bg-surface border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right-2">
            <div className="px-5 py-4 border-b border-border flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Self-pay extras</p>
                <h2 className="text-lg font-semibold truncate">{folioFor.lead}</h2>
                <p className="text-xs text-muted-foreground truncate">Room {folioFor.roomNo ?? "—"} · GRPG-{folioFor.id}</p>
              </div>
              <button type="button" onClick={() => setFolioFor(null)} className="h-8 w-8 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-semibold mb-2">Charges</p>
                {(selfCharges[folioFor.id] ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No extras charged yet.</p>
                ) : (
                  <ul className="space-y-1.5 text-sm">
                    {(selfCharges[folioFor.id] ?? []).map(c => (
                      <li key={c.id} className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground truncate">{c.description}</span>
                        <span className="tabular font-medium shrink-0">{money(c.amount)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {(selfPayments[folioFor.id] ?? []).length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-semibold mb-2">Payments</p>
                  <ul className="space-y-1.5 text-sm">
                    {(selfPayments[folioFor.id] ?? []).map(p => (
                      <li key={p.id} className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">{p.mode} · {p.date}</span>
                        <span className="tabular text-success shrink-0">− {money(p.amount)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="border-t border-border pt-3 flex items-center justify-between">
                <span className={cn("font-semibold", selfPayBalance(folioFor) > 0 ? "text-warning" : "text-success")}>
                  {selfPayBalance(folioFor) > 0 ? "Balance due" : "Settled"}
                </span>
                <span className={cn("text-base font-semibold tabular", selfPayBalance(folioFor) > 0 ? "text-warning" : "text-success")}>
                  {money(selfPayBalance(folioFor))}
                </span>
              </div>
            </div>
            <div className="border-t border-border p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Input type="number" min={0} value={collectAmt || ""} onChange={e => setCollectAmt(Math.max(0, Number(e.target.value)))} placeholder="Amount" className="h-9 tabular" />
                <Select value={collectMode} onChange={e => setCollectMode(e.target.value)} className="h-9"><option>Cash</option><option>Card</option><option>UPI</option><option>Bank</option></Select>
              </div>
              <Button variant="success" size="sm" className="w-full" onClick={() => collectSelfPay(folioFor)} disabled={selfPayBalance(folioFor) <= 0}>
                <CreditCard className="h-3.5 w-3.5" />Collect payment
              </Button>
            </div>
          </aside>
        </>
      )}
```

(`Input`, `Select`, `Button`, `Badge`, `X`, `CreditCard`, `cn`, `money` are all already imported on this page — verify with grep; add any missing to the imports.)

- [ ] **Step 5: Typecheck**

Run: `cd luxe-pms && npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 6: Manual verification**

With the dev server running, using a self-pay guest who has at least one charge (place one via `/menu/<room>` from Task 3's setup, or `curl -X POST .../folio-charges` with `bookingNo=GRPG-<id>`): open the group's Rooming List, confirm the self-pay row shows a "₹X due" chip, click it, confirm the drawer lists the charge and the balance. Enter an amount and click "Collect payment"; confirm the balance drops and, on reopening, the payment appears. Record the observed before/after balance.

- [ ] **Step 7: Commit**

```bash
git add "luxe-pms/src/app/(app)/groups/[id]/page.tsx"
git commit -m "feat(luxe-pms): self-pay guest mini-folio drawer with collect payment"
```

---

### Task 7: Billing tab shows master-folio extras

**Files:**
- Modify: `luxe-pms/src/app/(app)/groups/[id]/page.tsx` (billing tab, ~676-746)

**Interfaces:**
- Consumes: charges posted to `group.code` (Task 3, group-pays path).
- Produces: master-folio ad-hoc charges are visible and summed into the group total.

- [ ] **Step 1: Fetch the group's master-folio ad-hoc charges**

Add state + effect near the other group-scoped fetches:

```tsx
  const [masterExtras, setMasterExtras] = React.useState<{ id: string | number; description: string; amount: number; date: string }[]>([]);
  React.useEffect(() => {
    if (!group) return;
    apiGet<{ id: string | number; description: string; amount: number; date: string }[]>(`/folio-charges?bookingNo=${encodeURIComponent(group.code)}`)
      .then(setMasterExtras).catch(() => {});
  }, [group?.code]);
```

- [ ] **Step 2: Render extras as line items and add to the total**

In the billing tab's folio table body, after the `group.services.map(...)` rows (~722-729), add:

```tsx
                {masterExtras.map(c => (
                  <tr key={`x${c.id}`}>
                    <td className="px-5 py-3">{c.description}</td>
                    <td className="px-5 py-3 text-right tabular">1</td>
                    <td className="px-5 py-3 text-right tabular text-muted-foreground">—</td>
                    <td className="px-5 py-3 text-right tabular font-medium">{money(c.amount)}</td>
                  </tr>
                ))}
```

Then compute the extras sum near the folio totals and add it into the grand total shown in the `<tfoot>`. Find where `folio.grandTotal` is displayed (~742) and change that cell to include the extras:

```tsx
                  <td className="px-5 py-3 text-right tabular font-semibold text-base">{money(folio.grandTotal + masterExtras.reduce((s, c) => s + (c.amount || 0), 0))}</td>
```

- [ ] **Step 3: Typecheck**

Run: `cd luxe-pms && npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Manual verification**

With the dev server running, for a group-pays guest place a room order (Task 3 path) so a charge lands on the group code. Open the group's **Billing** tab; confirm the F&B charge appears as a line item and the Total increased by that amount. Record the observed line item + new total.

- [ ] **Step 5: Commit**

```bash
git add "luxe-pms/src/app/(app)/groups/[id]/page.tsx"
git commit -m "feat(luxe-pms): show master-folio extras on group billing tab"
```

---

### Task 8: Checkout guards for unpaid self-pay balances

**Files:**
- Modify: `luxe-pms/src/app/(app)/groups/[id]/page.tsx` (`checkOutGuest` ~248-255; `checkOutGroup` ~273-289)

**Interfaces:**
- Consumes: `selfPayBalance(entry)` (Task 6), `RoomingEntry.billTo`.

- [ ] **Step 1: Block per-guest checkout when self-pay balance is outstanding**

`checkOutGuest` (~248) currently:

```tsx
  const checkOutGuest = (entry: RoomingEntry) => {
    const at = new Date().toISOString();
    setRooming(prev => prev.map(r => r.id === entry.id ? { ...r, checkedOut: true, checkedOutAt: at } : r));
    apiPut(`/group-rooming/${entry.id}`, { checkedOut: true, checkedOutAt: at }).catch(() => flash("⚠ Save failed — backend offline"));
    releaseRoom(entry.roomNo);
    flash(`${entry.lead} checked out${entry.roomNo ? ` · Room ${entry.roomNo} → housekeeping` : ""}`);
  };
```

Change to (guard first):

```tsx
  const checkOutGuest = (entry: RoomingEntry) => {
    if ((entry.billTo ?? "group") === "self" && selfPayBalance(entry) > 0) {
      setFolioFor(entry); setCollectAmt(selfPayBalance(entry));
      flash(`Clear ${money(selfPayBalance(entry))} in extras before checking out ${entry.lead}`);
      setRowMenuFor(null);
      return;
    }
    const at = new Date().toISOString();
    setRooming(prev => prev.map(r => r.id === entry.id ? { ...r, checkedOut: true, checkedOutAt: at } : r));
    apiPut(`/group-rooming/${entry.id}`, { checkedOut: true, checkedOutAt: at }).catch(() => flash("⚠ Save failed — backend offline"));
    releaseRoom(entry.roomNo);
    flash(`${entry.lead} checked out${entry.roomNo ? ` · Room ${entry.roomNo} → housekeeping` : ""}`);
  };
```

- [ ] **Step 2: Bulk checkout skips self-pay guests who still owe**

`checkOutGroup` (~273) currently checks out ALL remaining guests:

```tsx
    const at = new Date().toISOString();
    const remaining = rooming.filter(r => !r.checkedOut);
    remaining.forEach(r => {
      apiPut(`/group-rooming/${r.id}`, { checkedOut: true, checkedOutAt: at }).catch(() => {});
      releaseRoom(r.roomNo);
    });
    const released = remaining.filter(r => r.roomNo).length;
    setRooming(prev => prev.map(r => r.checkedOut ? r : { ...r, checkedOut: true, checkedOutAt: at }));
```

Change to (only check out guests who don't owe; leave owing self-pay guests checked-in):

```tsx
    const at = new Date().toISOString();
    const remaining = rooming.filter(r => !r.checkedOut);
    const owing = remaining.filter(r => (r.billTo ?? "group") === "self" && selfPayBalance(r) > 0);
    const toCheckOut = remaining.filter(r => !owing.some(o => o.id === r.id));
    toCheckOut.forEach(r => {
      apiPut(`/group-rooming/${r.id}`, { checkedOut: true, checkedOutAt: at }).catch(() => {});
      releaseRoom(r.roomNo);
    });
    const released = toCheckOut.filter(r => r.roomNo).length;
    const toCheckOutIds = new Set(toCheckOut.map(r => r.id));
    setRooming(prev => prev.map(r => toCheckOutIds.has(r.id) ? { ...r, checkedOut: true, checkedOutAt: at } : r));
```

Then, where `checkOutGroup` ends with its status update + toast, append a note when guests were left owing. Find the final `flash(...)` in `checkOutGroup` and, immediately before the group-status update, add:

```tsx
    if (owing.length) {
      flash(`${owing.length} guest${owing.length === 1 ? "" : "s"} still owe for extras — settle in their folio`);
    }
```

(Keep the existing status update + completion toast after it; the `owing` note is an additional flash. If leaving guests checked-in means the group shouldn't move to `completed`, gate the existing `status: "completed"` update on `owing.length === 0` — set it to `completed` only when nobody was left owing; otherwise leave the group `in-house`.)

- [ ] **Step 3: Block group checkout while the group's own (master) balance is unpaid**

The group's master-folio balance must be fully settled before the group can complete checkout — not just a warning. In `CheckOutGroupDialog` (bottom of `luxe-pms/src/app/(app)/groups/[id]/page.tsx`), the confirm button currently is:

```tsx
            <Button variant="success" onClick={() => onConfirm(Math.min(amount, balance), mode)}><CheckCircle2 className="h-4 w-4" />Check out &amp; complete</Button>
```

Change it to disable completion while the amount being collected doesn't clear the balance:

```tsx
            <Button variant="success" disabled={amount < balance} onClick={() => onConfirm(Math.min(amount, balance), mode)}><CheckCircle2 className="h-4 w-4" />Check out &amp; complete</Button>
```

And update the outstanding-balance warning just above it (currently `{amount < balance && <p className="text-[11px] text-warning">Checking out with {money(balance - amount)} still outstanding.</p>}`) to make clear it's now a block, not a soft warning:

```tsx
                {amount < balance && <p className="text-[11px] text-warning">Collect the full {money(balance)} balance to complete checkout — {money(balance - amount)} still due.</p>}
```

(When `balance <= 0` the whole payment block is already hidden by the existing `{balance > 0 && (...)}` guard, so a fully-paid group's confirm button stays enabled.)

- [ ] **Step 4: Typecheck**

Run: `cd luxe-pms && npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 5: Manual verification**

With the dev server running: give a self-pay guest an unpaid charge. Try to check that guest out via the row "⋮" menu → confirm it does NOT check out; instead the mini-folio drawer opens and a toast says to clear the balance. Collect the payment, then check out → confirm it now succeeds. Separately, with one self-pay guest still owing, run the bulk "Check-out Group" → confirm the owing guest stays checked-in, others check out, and a toast reports the owing guest. Finally, on a group whose master balance is > 0, open "Check-out Group" and confirm the "Check out & complete" button is **disabled** until you enter an amount covering the full balance. Record what you observed.

- [ ] **Step 6: Commit**

```bash
git add "luxe-pms/src/app/(app)/groups/[id]/page.tsx"
git commit -m "feat(luxe-pms): block group checkout on unpaid self-pay extras"
```

---

## Notes for the implementer

- Tasks 1-2 are backend with real PHPUnit tests (TDD). Tasks 3-8 are frontend, verified live via the dev server (`pwsh ./start-dev.ps1`) + `npx tsc --noEmit` — this repo has no component-test harness by convention, so do NOT add one.
- The `ResourceController.php` file carries an unrelated pre-existing uncommitted hall-bookings change. Only Task 1 touches this file; use `git add -p` and verify `git diff --staged` before committing. Never discard working-tree changes with `git restore`/`checkout`/`reset`.
- Line numbers are approximate (the file has been edited across features); match on the shown code, not the line number.
