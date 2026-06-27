# Extra-Person Charges Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Charge a per-night extra-adult / extra-child rate (set on each Room Type) for booking guests beyond the type's included `maxAdults`/`maxChildren`; within the max stays free.

**Architecture:** Add `extraAdultRate`/`extraChildRate` (₹/night, default 0) to `room_types`; expose via the generic room-types API; add two inputs to the Setup → Room Types editor; the New Booking wizard reads the chosen type's max occupancy + rates, computes `extraGuestCharge` as a parallel taxed line, and shows an "Extra guests" row.

**Tech Stack:** Laravel `hotel-pms-api` (PHP 8.4 via `C:\php84\php.exe`, PostgreSQL `hotel_pms`, PHPUnit/sqlite), Next.js `luxe-pms`.

## Global Constraints

- Run artisan/tests with `"C:/php84/php.exe" artisan ...` in `hotel-pms-api`. Local DB = shared `hotel_pms` (additive change approved).
- New columns are camelCase to match the table: `extraAdultRate`, `extraChildRate`, both `integer default 0`. Rates default 0 = no charge (backward compatible).
- `room_types` is already company-scoped (`BelongsToCompany`) — per-tenant automatically. `RoomType` model uses `$guarded = ['id']`.
- Charge formula: `extraAdults = max(0, adults − maxAdults)`, `extraChildren = max(0, children − maxChildren)`, `extraGuestCharge = (extraAdults*extraAdultRate + extraChildren*extraChildRate) * nights`. It is a **parallel** term added to `tax` (5%) and `total` — NOT folded into the existing `extras` (so it shows as its own line without double-counting).
- Frontend = Next.js; this app's `AGENTS.md` warns its Next.js differs — but these edits are React state/JSX + a Laravel migration, no Next API surface. Verify with the app's build.
- TDD for backend; frontend verified via `npm run build` + the manual checks in each task. Commit to the main repo, branch `feat/pos-setup-live-real`.

---

## File Structure

- `hotel-pms-api/database/migrations/2026_06_25_000001_add_extra_person_rates_to_room_types.php` — two columns.
- `hotel-pms-api/app/Http/Controllers/Api/ResourceController.php` — room-types validation rules (the `'room-types' => [...]` block ~line 219).
- `hotel-pms-api/tests/Feature/RoomTypeExtraRatesTest.php` — API round-trip test.
- `luxe-pms/src/app/(app)/setup/setup-view.tsx` — `RoomType` type + two inputs in `RoomTypesManager`.
- `luxe-pms/src/app/(app)/bookings/new/page.tsx` — read type fields; compute + show extra-guest charge; stepper caps/hints.

---

## Task 1: Backend — extra-person rate columns + validation

**Files:**
- Create: `hotel-pms-api/database/migrations/2026_06_25_000001_add_extra_person_rates_to_room_types.php`
- Modify: `hotel-pms-api/app/Http/Controllers/Api/ResourceController.php` (the `'room-types'` validation block)
- Test: `hotel-pms-api/tests/Feature/RoomTypeExtraRatesTest.php`

**Interfaces:**
- Produces: `room_types.extraAdultRate` + `room_types.extraChildRate` (int, default 0); `POST/PUT /api/room-types` accept + persist them.

- [ ] **Step 1: Write the migration**

`2026_06_25_000001_add_extra_person_rates_to_room_types.php`:
```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('room_types', function (Blueprint $t) {
            if (!Schema::hasColumn('room_types', 'extraAdultRate')) $t->integer('extraAdultRate')->default(0);
            if (!Schema::hasColumn('room_types', 'extraChildRate')) $t->integer('extraChildRate')->default(0);
        });
    }
    public function down(): void {
        Schema::table('room_types', function (Blueprint $t) {
            foreach (['extraAdultRate', 'extraChildRate'] as $c) {
                if (Schema::hasColumn('room_types', $c)) $t->dropColumn($c);
            }
        });
    }
};
```

- [ ] **Step 2: Run the migration**

Run: `cd hotel-pms-api && "C:/php84/php.exe" artisan migrate`
Expected: the one migration runs. Verify: `"C:/php84/php.exe" artisan tinker --execute="echo \Illuminate\Support\Facades\Schema::hasColumn('room_types','extraAdultRate')?'yes':'no'; echo \Illuminate\Support\Facades\Schema::hasColumn('room_types','extraChildRate')?' yes':' no';"` → `yes yes`.

- [ ] **Step 3: Write the failing test**

`tests/Feature/RoomTypeExtraRatesTest.php`:
```php
<?php
use App\Models\User;

class RoomTypeExtraRatesTest extends \Tests\TestCase {
    use \Illuminate\Foundation\Testing\RefreshDatabase;

    private function owner(): User {
        return User::create(['name' => 'O', 'email' => 'rt@a.com', 'password' => 'x', 'role' => 'Owner', 'company_id' => 901]);
    }

    public function test_room_type_accepts_and_persists_extra_person_rates(): void {
        $this->actingAs($this->owner(), 'sanctum');
        $this->postJson('/api/room-types', [
            'name' => 'Deluxe', 'code' => 'DLX', 'baseTariff' => 6500,
            'maxAdults' => 2, 'maxChildren' => 1, 'extraAdultRate' => 500, 'extraChildRate' => 300, 'active' => true,
        ])->assertSuccessful();

        $row = collect($this->getJson('/api/room-types')->json())->firstWhere('code', 'DLX');
        $this->assertSame(500, (int) $row['extraAdultRate']);
        $this->assertSame(300, (int) $row['extraChildRate']);
    }

    public function test_extra_rates_reject_negatives(): void {
        $this->actingAs($this->owner(), 'sanctum');
        $this->postJson('/api/room-types', [
            'name' => 'Bad', 'code' => 'BAD', 'baseTariff' => 1000, 'maxAdults' => 2, 'maxChildren' => 1,
            'extraAdultRate' => -5,
        ])->assertStatus(422);
    }
}
```
(If `/api/room-types` POST requires more fields or a different success code, adapt to the real ResourceController contract — keep the assertions on the two rates persisting + the negative rejection.)

- [ ] **Step 4: Run to verify fail**

Run: `"C:/php84/php.exe" artisan test --filter=RoomTypeExtraRatesTest`
Expected: FAIL — the rates aren't validated/persisted (stripped by validation) or negative not rejected.

- [ ] **Step 5: Add validation rules**

In `app/Http/Controllers/Api/ResourceController.php`, the `'room-types'` rules block currently is:
```php
        'room-types' => [
            'name' => 'string|max:100', 'code' => 'string|max:20|nullable', 'baseTariff' => 'integer|min:0',
            'maxAdults' => 'integer|min:1', 'maxChildren' => 'integer|min:0', 'sizeSqft' => 'integer|min:0|nullable',
            'description' => 'string|max:500|nullable', 'amenities' => 'array', 'active' => 'boolean',
        ],
```
Add the two rate rules (keep the rest):
```php
            'extraAdultRate' => 'integer|min:0', 'extraChildRate' => 'integer|min:0',
```
(append inside the `'room-types' => [...]` array).

- [ ] **Step 6: Run to verify pass + full suite**

Run: `"C:/php84/php.exe" artisan test --filter=RoomTypeExtraRatesTest` → PASS (2).
Run: `"C:/php84/php.exe" artisan test` → full suite green (was 138).

- [ ] **Step 7: Commit**

```bash
cd "d:/transfer the file/Downloads/myhotel-pms-source"
git add hotel-pms-api/database/migrations hotel-pms-api/app/Http/Controllers/Api/ResourceController.php hotel-pms-api/tests/Feature/RoomTypeExtraRatesTest.php
git commit -m "feat(pms): room-type extraAdultRate/extraChildRate columns + validation"
```

---

## Task 2: Setup UI — extra-person rate inputs on Room Types

**Files:**
- Modify: `luxe-pms/src/app/(app)/setup/setup-view.tsx` (`RoomType` type + `RoomTypesManager` form)

**Interfaces:**
- Consumes: the room-types API now carries `extraAdultRate`/`extraChildRate`.
- Produces: the Room Type editor reads/edits/saves both rates.

- [ ] **Step 1: Extend the `RoomType` type**

In `setup-view.tsx`, the `RoomType` type (~line 122) has `baseTariff, maxAdults, maxChildren, ...`. Add two optional fields:
```ts
  extraAdultRate?: number;
  extraChildRate?: number;
```

- [ ] **Step 2: Add inputs in `RoomTypesManager`**

Find the `RoomTypesManager` component (~line 1214) and the form where `maxAdults`/`maxChildren`/`baseTariff` are edited (number inputs bound to the editing room-type's fields). Add two more number inputs in the same grid, immediately after Max children (or near Base tariff):
- Label **"Extra adult (₹/night)"**, bound to `extraAdultRate` (value `form.extraAdultRate ?? 0`, onChange sets it to `Number(e.target.value)` clamped `>= 0`).
- Label **"Extra child (₹/night)"**, bound to `extraChildRate` (same pattern).
Match the existing input components/markup used for `maxChildren`/`baseTariff` in that form (read the file to copy the exact Input/Label pattern; keep styling consistent). Ensure these fields are included in the object sent on save (the existing save/`onChange`/`persistList` path serializes the room-type object — since they're real fields on the object, they save automatically; confirm the editor builds the payload from the full object, not a hardcoded field list — if it uses a field whitelist, add the two keys).

- [ ] **Step 3: Build**

Run: `cd luxe-pms && npm run build`
Expected: compiles. Fix only genuine type errors you introduce.

- [ ] **Step 4: Manual check**

(With the PMS API + luxe-pms running) Setup → Room Types → edit a type → set Extra adult 500, Extra child 300 → Save → reload → the values persist (round-trip through `/api/room-types`).

- [ ] **Step 5: Commit**

```bash
cd "d:/transfer the file/Downloads/myhotel-pms-source"
git add "luxe-pms/src/app/(app)/setup/setup-view.tsx"
git commit -m "feat(pms-ui): set extra adult/child per-night rate on Room Types"
```

---

## Task 3: Booking — charge extra guests beyond room-type occupancy

**Files:**
- Modify: `luxe-pms/src/app/(app)/bookings/new/page.tsx`

**Interfaces:**
- Consumes: the chosen room type's `maxAdults`, `maxChildren`, `extraAdultRate`, `extraChildRate`.
- Produces: an `extraGuestCharge` taxed line in the Live Summary; the booking total includes it.

- [ ] **Step 1: Extend the `roomTypes` state shape + fetch**

In `bookings/new/page.tsx`, change the state (currently `{ name: string; baseTariff: number }[]`):
```tsx
  const [roomTypes, setRoomTypes] = React.useState<{ name: string; baseTariff: number; maxAdults?: number; maxChildren?: number; extraAdultRate?: number; extraChildRate?: number }[]>([]);
```
and the fetch type:
```tsx
    apiGet<{ name: string; baseTariff: number; maxAdults?: number; maxChildren?: number; extraAdultRate?: number; extraChildRate?: number }[]>("/room-types").then(setRoomTypes).catch(() => {});
```

- [ ] **Step 2: Compute the extra-guest charge**

Just below the existing `rate` derivation and before `const extras =` (around the existing `const subtotal = ...` / `const tax = ...` area), add:
```tsx
  const selType = roomTypes.find(t => t.name === roomType);
  const maxAdultsInc = selType?.maxAdults ?? Infinity;   // Infinity until a type is chosen → no charge
  const maxChildrenInc = selType?.maxChildren ?? Infinity;
  const extraAdultRate = selType?.extraAdultRate ?? 0;
  const extraChildRate = selType?.extraChildRate ?? 0;
  const extraAdults = Math.max(0, adults - maxAdultsInc);
  const extraChildren = Math.max(0, children - maxChildrenInc);
  const extraGuestCharge = (extraAdults * extraAdultRate + extraChildren * extraChildRate) * nights;
```

- [ ] **Step 3: Include it in tax + total (parallel term, not inside `extras`)**

Find the existing lines:
```tsx
  const tax = (subtotal + extras) * 0.05;
  const total = subtotal + extras + tax;
```
Change to:
```tsx
  const tax = (subtotal + extras + extraGuestCharge) * 0.05;
  const total = subtotal + extras + extraGuestCharge + tax;
```
(`advance` is derived from `total`, so it updates automatically.)

- [ ] **Step 4: Show the "Extra guests" row in the Live Summary**

In the pricing `<dl>` (the block that renders `Extras`/`Tax`), add an "Extra guests" row right before the `Extras` row. The existing Extras row is:
```tsx
            {extras > 0 && <Row k="Extras" v={money(extras)} muted />}
```
Add immediately before it:
```tsx
            {extraGuestCharge > 0 && (
              <Row
                k="Extra guests"
                v={money(extraGuestCharge)}
                sub={[extraAdults ? `+${extraAdults}A` : "", extraChildren ? `+${extraChildren}C` : ""].filter(Boolean).join(" ") + ` · ₹${extraAdultRate}/adult/night`}
                muted
              />
            )}
```
(If `Row` doesn't accept a `sub` prop, match how other rows show sub-text — e.g. inline the label; read the `Row` helper in this file and adapt. Keep it to one concise line.)

- [ ] **Step 5: Let the steppers exceed the included max, with a hint**

The Adults stepper is `<Stepper label="Adults" value={adults} onChange={setAdults} min={1} max={6} />` and there is a Children stepper nearby. Keep `max={6}` (a sane cap ≥ any room's max) so guests can exceed the included occupancy. Under the Pax & Type step's stepper area, add a small hint when over the included max, e.g.:
```tsx
  {selType && extraAdults > 0 && (
    <p className="mt-1 text-xs text-muted-foreground">+{extraAdults} adult{extraAdults > 1 ? "s" : ""} beyond {maxAdultsInc} included · ₹{extraAdultRate}/night each</p>
  )}
  {selType && extraChildren > 0 && (
    <p className="mt-1 text-xs text-muted-foreground">+{extraChildren} child{extraChildren > 1 ? "ren" : ""} beyond {maxChildrenInc} included · ₹{extraChildRate}/night each</p>
  )}
```
Place these inside the Pax & Type step JSX, after the Adults/Children steppers. (Match the file's existing class/markup conventions.)

- [ ] **Step 6: Build + manual verify**

Run: `cd luxe-pms && npm run build` → compiles.
Manual (servers running): pick a Room Type with `maxAdults=2, extraAdultRate=500`, dates = 3 nights:
- Adults 2 → no "Extra guests" line.
- Adults 3 → "Extra guests" = ₹1,500 (1×500×3), Total/Tax updated; hint shows under the stepper.
- A type with `extraAdultRate=0` → no charge even at 4 adults.

- [ ] **Step 7: Commit**

```bash
cd "d:/transfer the file/Downloads/myhotel-pms-source"
git add "luxe-pms/src/app/(app)/bookings/new/page.tsx"
git commit -m "feat(pms): charge extra adults/children beyond room-type occupancy in booking"
```

---

## Self-Review notes

- **Spec coverage:** columns + default 0 ✓ (T1), API validation ✓ (T1), setup inputs ✓ (T2), booking compute + show + tax/total ✓ (T3), stepper exceed-max + hint ✓ (T3), backward compatible (rate 0 → no charge; Infinity max until a type chosen) ✓.
- **No double-count:** `extraGuestCharge` is a parallel term in `tax`/`total`, shown as its own row — it is NOT added into `extras`.
- **Naming consistency:** `extraAdultRate`, `extraChildRate` (camelCase columns + state fields + validation keys), `extraGuestCharge`, `maxAdults`/`maxChildren` — identical across backend, setup, and booking tasks.
- **Untouched:** breakfast/meal-plan charge, flat extras, the per-room Edit modal.
