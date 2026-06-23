# Hall Price Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Fix the New Hall Booking total to add the per-hall setup fee, use the hall package's real GST (not 5%), and use a per-hall over-capacity surcharge (not ₹35).

**Architecture:** Add an `extraPaxFee` column to `hall_packages`; expose it in the Setup hall table; a pure `hall-pricing.ts` helper assembles the total; `halls/new` delegates to it.

**Tech Stack:** Laravel 11 + Postgres (PHPUnit), Next.js 16 / React 19 / TS (vitest node-env).

## Global Constraints

- Backend `hotel-pms-api/` (artisan/phpunit via `C:/php84/php.exe`); frontend `luxe-pms/` (`npm` from there).
- `hall_packages` already has `setupFee` + `gst` columns; only `extraPaxFee` is new.
- Frontend tests are node-env pure-logic only; UI verified via `npx tsc --noEmit` + `npm run lint` + `npm run build`.
- API routes under `auth:sanctum`; feature tests use `actingAs(User::factory()->create(),'sanctum')` + `RefreshDatabase`.

---

### Task 1: Backend — `extraPaxFee` on hall packages

**Files:**
- Create: `hotel-pms-api/database/migrations/2026_06_22_110000_add_extra_pax_fee_to_hall_packages.php`
- Modify: `hotel-pms-api/app/Http/Controllers/Api/ResourceController.php` (hall-packages RULES, ~line 254)
- Test: `hotel-pms-api/tests/Feature/HallPackageExtraFeeTest.php`

**Interfaces:** Produces an `extraPaxFee` integer field accepted/returned by `/hall-packages`.

- [ ] **Step 1: Write the failing test**

Create `hotel-pms-api/tests/Feature/HallPackageExtraFeeTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HallPackageExtraFeeTest extends TestCase
{
    use RefreshDatabase;

    public function test_hall_package_accepts_and_returns_extra_pax_fee(): void
    {
        $this->actingAs(User::factory()->create(), 'sanctum');

        $created = $this->postJson('/api/hall-packages', [
            'name' => 'Grand Ballroom', 'capacity' => 300, 'hourly' => 8500,
            'halfDay' => 38000, 'fullDay' => 72000, 'setupFee' => 5000,
            'gst' => 18, 'extraPaxFee' => 250, 'active' => true,
        ])->assertCreated()->assertJsonPath('extraPaxFee', 250)->json();

        $this->putJson("/api/hall-packages/{$created['id']}", ['extraPaxFee' => 300])
            ->assertOk()->assertJsonPath('extraPaxFee', 300);
    }
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `C:/php84/php.exe hotel-pms-api/artisan test --filter=HallPackageExtraFeeTest`
Expected: FAIL — `extraPaxFee` not persisted/returned (column + rule missing).

- [ ] **Step 3: Create the migration**

Create `hotel-pms-api/database/migrations/2026_06_22_110000_add_extra_pax_fee_to_hall_packages.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('hall_packages', function (Blueprint $t) {
            $t->integer('extraPaxFee')->default(0)->after('gst');
        });
    }

    public function down(): void
    {
        Schema::table('hall_packages', function (Blueprint $t) {
            $t->dropColumn('extraPaxFee');
        });
    }
};
```

- [ ] **Step 4: Add the validation rule**

In `hotel-pms-api/app/Http/Controllers/Api/ResourceController.php`, change the `hall-packages` RULES block from:

```php
        'hall-packages' => [
            'name' => 'string|max:255', 'capacity' => 'integer|min:0', 'hourly' => 'integer|min:0',
            'halfDay' => 'integer|min:0', 'fullDay' => 'integer|min:0', 'setupFee' => 'integer|min:0',
            'gst' => 'integer|min:0|max:100', 'active' => 'boolean',
        ],
```

to (add the `extraPaxFee` rule):

```php
        'hall-packages' => [
            'name' => 'string|max:255', 'capacity' => 'integer|min:0', 'hourly' => 'integer|min:0',
            'halfDay' => 'integer|min:0', 'fullDay' => 'integer|min:0', 'setupFee' => 'integer|min:0',
            'gst' => 'integer|min:0|max:100', 'extraPaxFee' => 'integer|min:0', 'active' => 'boolean',
        ],
```

- [ ] **Step 5: Migrate + run the test**

Run: `C:/php84/php.exe hotel-pms-api/artisan migrate`
Expected: `add_extra_pax_fee_to_hall_packages ... DONE`.

Run: `C:/php84/php.exe hotel-pms-api/artisan test --filter=HallPackageExtraFeeTest`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add hotel-pms-api/database/migrations/2026_06_22_110000_add_extra_pax_fee_to_hall_packages.php hotel-pms-api/app/Http/Controllers/Api/ResourceController.php hotel-pms-api/tests/Feature/HallPackageExtraFeeTest.php
git commit -m "feat(api): per-hall extraPaxFee on hall packages"
```

---

### Task 2: Pure helper `hall-pricing.ts`

**Files:**
- Create: `luxe-pms/src/lib/hall-pricing.ts`
- Test: `luxe-pms/src/lib/hall-pricing.test.ts`

**Interfaces:**
- Produces: `interface HallPricingInput { hallCost: number; setupFee: number; foodCost: number; extrasCost: number; extraPax: number; extraPaxFee: number; gstPct: number }`; `interface HallTotals { subtotal: number; tax: number; total: number }`; `computeHallTotals(i: HallPricingInput): HallTotals`.

> Run `npm` from `luxe-pms/`.

- [ ] **Step 1: Write the failing test**

Create `luxe-pms/src/lib/hall-pricing.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { computeHallTotals } from "@/lib/hall-pricing";

describe("computeHallTotals", () => {
  it("includes the setup fee and applies the hall's GST rate", () => {
    const t = computeHallTotals({ hallCost: 38000, setupFee: 5000, foodCost: 90000, extrasCost: 0, extraPax: 0, extraPaxFee: 0, gstPct: 18 });
    expect(t.subtotal).toBe(133000);          // 38000 + 5000 + 90000
    expect(t.tax).toBe(23940);                 // 18%
    expect(t.total).toBe(156940);
  });
  it("adds the per-hall over-capacity surcharge", () => {
    const t = computeHallTotals({ hallCost: 10000, setupFee: 0, foodCost: 0, extrasCost: 0, extraPax: 20, extraPaxFee: 250, gstPct: 0 });
    expect(t.subtotal).toBe(15000);            // 10000 + 20*250
    expect(t.tax).toBe(0);
    expect(t.total).toBe(15000);
  });
  it("treats missing/zero fields as 0 (no NaN)", () => {
    const t = computeHallTotals({ hallCost: 5000, setupFee: 0, foodCost: 0, extrasCost: 0, extraPax: 0, extraPaxFee: 0, gstPct: 0 });
    expect(t).toEqual({ subtotal: 5000, tax: 0, total: 5000 });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- hall-pricing`
Expected: FAIL — cannot resolve `@/lib/hall-pricing`.

- [ ] **Step 3: Implement the helper**

Create `luxe-pms/src/lib/hall-pricing.ts`:

```ts
// Pure pricing math for the New Hall Booking flow. Framework-free (node-testable).

export interface HallPricingInput {
  hallCost: number;
  setupFee: number;
  foodCost: number;
  extrasCost: number;
  extraPax: number;
  extraPaxFee: number;
  gstPct: number;
}

export interface HallTotals {
  subtotal: number;
  tax: number;
  total: number;
}

const n = (v: number) => Number(v) || 0;

export function computeHallTotals(i: HallPricingInput): HallTotals {
  const extraPaxCost = Math.max(0, n(i.extraPax)) * n(i.extraPaxFee);
  const subtotal = n(i.hallCost) + n(i.setupFee) + n(i.foodCost) + n(i.extrasCost) + extraPaxCost;
  const tax = Math.round((subtotal * n(i.gstPct)) / 100);
  const total = subtotal + tax;
  return { subtotal, tax, total };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- hall-pricing`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add luxe-pms/src/lib/hall-pricing.ts luxe-pms/src/lib/hall-pricing.test.ts
git commit -m "feat(halls): pure hall-pricing helper (setup fee + GST + per-hall surcharge)"
```

---

### Task 3: Frontend — Setup `extraPaxFee` field + `halls/new` pricing

**Files:**
- Modify: `luxe-pms/src/app/(app)/setup/setup-view.tsx`
- Modify: `luxe-pms/src/app/(app)/halls/new/page.tsx`

**Interfaces:** Consumes `computeHallTotals` (Task 2) and the `extraPaxFee` field (Task 1).

- [ ] **Step 1: Setup — add `extraPaxFee` to the HallPackage type + seed + add-default**

In `luxe-pms/src/app/(app)/setup/setup-view.tsx`:

(a) Change the `HallPackage` type (line ~255) — add `extraPaxFee: number;` before `active`:
```tsx
type HallPackage = { id: string; name: string; capacity: number; hourly: number; halfDay: number; fullDay: number; setupFee: number; gst: number; extraPaxFee: number; active: boolean };
```
(b) In each `HALL_PACKAGES_SEED` row (lines ~265–270), add `extraPaxFee: 0,` before `active: true` (these are the offline fallback rows).
(c) In the "Add" hall button default (line ~2050), add `extraPaxFee: 0,` before `active: true`.

- [ ] **Step 2: Setup — add the `Extra/pax` column to the hall table**

(a) In the hall table header (after the `GST` `<th>`, line ~2062), add:
```tsx
                <th className="px-3 py-2 font-semibold text-right">Extra/pax</th>
```
(b) In the hall row (after the `gst` cell, line ~2075), add:
```tsx
                  <td className="px-3 py-2 text-right"><div className="inline-flex items-center gap-1"><span className="text-xs text-muted-foreground">₹</span><Input type="number" value={h.extraPaxFee} onChange={e => updHall(h.id, { extraPaxFee: Number(e.target.value) })} className="h-8 w-16 tabular text-right" /></div></td>
```

- [ ] **Step 3: Typecheck the Setup change**

Run (from `luxe-pms/`): `npx tsc --noEmit`
Expected: exit 0 (the `HallPackage` type now has `extraPaxFee`, so `updHall(h.id, { extraPaxFee })` and seed rows typecheck).

- [ ] **Step 4: `halls/new` — extend the Venue type**

In `luxe-pms/src/app/(app)/halls/new/page.tsx`, change the `Venue` type (line 17) from:
```tsx
type Venue = { id: string; name: string; capacity: number; hourly: number; halfDay: number; fullDay: number };
```
to:
```tsx
type Venue = { id: string; name: string; capacity: number; hourly: number; halfDay: number; fullDay: number; setupFee: number; gst: number; extraPaxFee: number };
```

- [ ] **Step 5: `halls/new` — use the helper for pricing**

Add the import below the existing `@/lib/api` / utils imports near the top:
```tsx
import { computeHallTotals } from "@/lib/hall-pricing";
```

Replace the pricing block (lines ~72–79):
```tsx
  const capacityWarning = !!hall && pax > hall.capacity;
  const extraPax = capacityWarning && hall ? pax - hall.capacity : 0;
  const extraPaxCost = extraPax * 35; // surcharge per extra guest

  const subtotal = hallCost + foodCost + extrasCost + extraPaxCost;
  const tax = subtotal * 0.05;
  const total = subtotal + tax;
  const advance = Math.round((total * advancePct) / 100);
```
with:
```tsx
  const capacityWarning = !!hall && pax > hall.capacity;
  const extraPax = capacityWarning && hall ? pax - hall.capacity : 0;
  const extraPaxCost = extraPax * (hall?.extraPaxFee ?? 0); // per-hall over-capacity surcharge
  const setupFee = hall?.setupFee ?? 0;
  const gstPct = hall?.gst ?? 0;

  const { subtotal, tax, total } = computeHallTotals({
    hallCost, setupFee, foodCost, extrasCost, extraPax, extraPaxFee: hall?.extraPaxFee ?? 0, gstPct,
  });
  const advance = Math.round((total * advancePct) / 100);
```

- [ ] **Step 6: `halls/new` — fix the summary labels/lines**

In the booking summary JSX, find the tax line (it renders something like `Tax (5%)` / `GST` with `{money(tax)}`) and:
- change the hardcoded `5%` label to the live rate: `GST ({gstPct}%)`.
- if the summary itemizes hall/food/extras, add a **Setup fee** line `{money(setupFee)}` (only when `setupFee > 0`) and keep the existing extra-pax line (now driven by `extraPaxCost`).
Leave `subtotal`/`tax`/`total`/`advance` usages as-is (names preserved by Step 5).

- [ ] **Step 7: Typecheck + lint + build**

Run (from `luxe-pms/`): `npx tsc --noEmit` → exit 0; `npm run lint` → no new errors in the two files; `npm run build` → succeeds (confirms no dangling `* 35` / `* 0.05` references and the Venue/HallPackage types line up).

- [ ] **Step 8: Commit**

```bash
git add "luxe-pms/src/app/(app)/setup/setup-view.tsx" "luxe-pms/src/app/(app)/halls/new/page.tsx"
git commit -m "feat(halls): setup fee + real hall GST + per-hall over-capacity surcharge"
```

---

## Self-Review

**Spec coverage:**
- `extraPaxFee` column + rule → Task 1. ✓
- Setup hall form exposes `extraPaxFee` → Task 3 Steps 1–2. ✓
- `halls/new` adds setupFee, uses hall GST (not 5%), per-hall surcharge (not ₹35) → Task 3 Steps 4–6 via `computeHallTotals`. ✓
- Pure unit-tested helper → Task 2. ✓
- GST applied to the whole subtotal at the hall's rate (chosen approach) → Task 2 (`tax = subtotal*gstPct/100`). ✓
- Out-of-scope (per-component GST, slot logic, persistence shape) → untouched. ✓

**Placeholder scan:** No vague steps; complete code for Tasks 1–2, exact before/after for Task 3 (Step 6 references "find the tax line" but specifies the exact change — acceptable since the summary JSX text varies; the change is concrete). ✓

**Type consistency:** `HallPricingInput`/`computeHallTotals` (Task 2) consumed in Task 3 Step 5 with matching keys. `HallPackage` (Setup) and `Venue` (halls/new) both gain `extraPaxFee` (+ `setupFee`/`gst` already present on HallPackage; added to Venue) matching the backend column (Task 1). Downstream names `subtotal`/`tax`/`total`/`advance` preserved. ✓
