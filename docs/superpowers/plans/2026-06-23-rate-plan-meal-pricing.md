# Rate-plan Meal Pricing + Booking Calculation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Add per-meal prices to rate plans, apply the plan discount + meal cost in the New Booking calculation, and remove the now-redundant Meal Plans Setup section.

**Architecture:** 3 price columns on `rate_plans` (backend) + price inputs in the Rate Plans Setup table; a pure `booking-pricing.ts` helper does discount + meal math; `bookings/new` carries the prices into the rate-plan option and renders from the helper. The Meal Plans Setup section is deleted (backend resource kept for Revenue).

**Tech Stack:** Laravel 11 + Postgres (PHPUnit), Next.js 16 / React 19 / TS (vitest node-env).

## Global Constraints

- Backend `hotel-pms-api/` (artisan/phpunit via `C:/php84/php.exe`); frontend `luxe-pms/` (`npm` from there).
- Frontend tests node-env pure-logic only; UI verified via `npx tsc --noEmit` + `npm run lint` + `npm run build`.
- API routes under `auth:sanctum`; feature tests use `actingAs(User::factory()->create(),'sanctum')` + `RefreshDatabase`.
- Meals are priced **per adult per night**; the plan **discount applies to the room only**.
- Keep the backend `meal-plans` resource/table (Revenue group-quote uses it); remove only its Setup section.

---

### Task 1: Backend — meal prices on rate plans

**Files:**
- Create: `hotel-pms-api/database/migrations/2026_06_23_100000_add_meal_prices_to_rate_plans.php`
- Modify: `hotel-pms-api/app/Http/Controllers/Api/ResourceController.php` (rate-plans RULES, ~line 238)
- Test: `hotel-pms-api/tests/Feature/RatePlanMealPriceTest.php`

**Interfaces:** `/rate-plans` accepts/returns `breakfastPrice`, `lunchPrice`, `dinnerPrice` (integers).

- [ ] **Step 1: Write the failing test**

Create `hotel-pms-api/tests/Feature/RatePlanMealPriceTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RatePlanMealPriceTest extends TestCase
{
    use RefreshDatabase;

    public function test_rate_plan_round_trips_meal_prices(): void
    {
        $this->actingAs(User::factory()->create(), 'sanctum');

        $created = $this->postJson('/api/rate-plans', [
            'code' => 'AP', 'name' => 'American', 'inclBreakfast' => true, 'inclLunch' => true,
            'inclDinner' => true, 'discountPct' => 0, 'refundable' => true, 'active' => true,
            'breakfastPrice' => 200, 'lunchPrice' => 350, 'dinnerPrice' => 450,
        ])->assertCreated()
          ->assertJsonPath('breakfastPrice', 200)
          ->assertJsonPath('lunchPrice', 350)
          ->assertJsonPath('dinnerPrice', 450)
          ->json();

        $this->putJson("/api/rate-plans/{$created['id']}", ['breakfastPrice' => 250])
            ->assertOk()->assertJsonPath('breakfastPrice', 250);
    }
}
```

- [ ] **Step 2: Run to verify it fails**

Run: `C:/php84/php.exe hotel-pms-api/artisan test --filter=RatePlanMealPriceTest`
Expected: FAIL — prices not persisted/returned.

- [ ] **Step 3: Create the migration**

Create `hotel-pms-api/database/migrations/2026_06_23_100000_add_meal_prices_to_rate_plans.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rate_plans', function (Blueprint $t) {
            $t->integer('breakfastPrice')->default(0)->after('inclDinner');
            $t->integer('lunchPrice')->default(0)->after('breakfastPrice');
            $t->integer('dinnerPrice')->default(0)->after('lunchPrice');
        });
    }

    public function down(): void
    {
        Schema::table('rate_plans', function (Blueprint $t) {
            $t->dropColumn(['breakfastPrice', 'lunchPrice', 'dinnerPrice']);
        });
    }
};
```

- [ ] **Step 4: Add the rules**

In `ResourceController.php`, change the `rate-plans` RULES block from:

```php
        'rate-plans' => [
            'code' => 'string|max:50', 'name' => 'string|max:255', 'inclBreakfast' => 'boolean',
            'inclLunch' => 'boolean', 'inclDinner' => 'boolean', 'discountPct' => 'integer|min:0|max:100',
            'refundable' => 'boolean', 'active' => 'boolean',
        ],
```

to:

```php
        'rate-plans' => [
            'code' => 'string|max:50', 'name' => 'string|max:255', 'inclBreakfast' => 'boolean',
            'inclLunch' => 'boolean', 'inclDinner' => 'boolean', 'discountPct' => 'integer|min:0|max:100',
            'refundable' => 'boolean', 'active' => 'boolean',
            'breakfastPrice' => 'integer|min:0', 'lunchPrice' => 'integer|min:0', 'dinnerPrice' => 'integer|min:0',
        ],
```

- [ ] **Step 5: Migrate + test**

Run: `C:/php84/php.exe hotel-pms-api/artisan migrate` → `add_meal_prices_to_rate_plans ... DONE`.
Run: `C:/php84/php.exe hotel-pms-api/artisan test --filter=RatePlanMealPriceTest` → PASS.

- [ ] **Step 6: Commit**

```bash
git add hotel-pms-api/database/migrations/2026_06_23_100000_add_meal_prices_to_rate_plans.php hotel-pms-api/app/Http/Controllers/Api/ResourceController.php hotel-pms-api/tests/Feature/RatePlanMealPriceTest.php
git commit -m "feat(api): per-meal prices (breakfast/lunch/dinner) on rate plans"
```

---

### Task 2: Pure helper `booking-pricing.ts`

**Files:**
- Create: `luxe-pms/src/lib/booking-pricing.ts`
- Test: `luxe-pms/src/lib/booking-pricing.test.ts`

**Interfaces:**
- `interface PlanMeals { inclB: boolean; inclL: boolean; inclD: boolean; breakfastPrice: number; lunchPrice: number; dinnerPrice: number }`
- `mealPerNightPerGuest(p: PlanMeals): number`
- `interface BookingTotalsInput { roomSubtotal: number; discountPct: number; plan: PlanMeals; adults: number; nights: number; extras: number; taxPct: number }`
- `interface BookingTotals { roomAfterDiscount: number; discountAmount: number; mealCost: number; tax: number; total: number }`
- `computeBookingTotals(i: BookingTotalsInput): BookingTotals`

> Run `npm` from `luxe-pms/`.

- [ ] **Step 1: Write the failing test**

Create `luxe-pms/src/lib/booking-pricing.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { mealPerNightPerGuest, computeBookingTotals } from "@/lib/booking-pricing";

const AP = { inclB: true, inclL: true, inclD: true, breakfastPrice: 200, lunchPrice: 350, dinnerPrice: 450 };
const EP = { inclB: false, inclL: false, inclD: false, breakfastPrice: 200, lunchPrice: 350, dinnerPrice: 450 };
const CP = { inclB: true, inclL: false, inclD: false, breakfastPrice: 200, lunchPrice: 350, dinnerPrice: 450 };

describe("mealPerNightPerGuest", () => {
  it("sums only the included meals' prices", () => {
    expect(mealPerNightPerGuest(AP)).toBe(1000);
    expect(mealPerNightPerGuest(CP)).toBe(200);
    expect(mealPerNightPerGuest(EP)).toBe(0); // unchecked meals contribute nothing
  });
});

describe("computeBookingTotals", () => {
  it("applies discount to room only and adds meals × adults × nights", () => {
    const t = computeBookingTotals({ roomSubtotal: 10000, discountPct: 10, plan: CP, adults: 2, nights: 3, extras: 0, taxPct: 5 });
    expect(t.discountAmount).toBe(1000);          // 10% of room
    expect(t.roomAfterDiscount).toBe(9000);
    expect(t.mealCost).toBe(1200);                 // 200 × 2 × 3
    expect(t.tax).toBe(510);                        // 5% of (9000 + 1200)
    expect(t.total).toBe(10710);
  });
  it("zero discount + no meals = room + extras + tax", () => {
    const t = computeBookingTotals({ roomSubtotal: 5000, discountPct: 0, plan: EP, adults: 2, nights: 2, extras: 500, taxPct: 5 });
    expect(t.discountAmount).toBe(0);
    expect(t.mealCost).toBe(0);
    expect(t.tax).toBe(275);                        // 5% of 5500
    expect(t.total).toBe(5775);
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `npm test -- booking-pricing` → FAIL (module missing).

- [ ] **Step 3: Implement**

Create `luxe-pms/src/lib/booking-pricing.ts`:

```ts
// Pure booking pricing: plan discount (room only) + included-meal cost. Node-testable.

export interface PlanMeals {
  inclB: boolean; inclL: boolean; inclD: boolean;
  breakfastPrice: number; lunchPrice: number; dinnerPrice: number;
}

const n = (v: number) => Number(v) || 0;

/** Sum of the included meals' per-guest-per-night prices. */
export function mealPerNightPerGuest(p: PlanMeals): number {
  return (p.inclB ? n(p.breakfastPrice) : 0) + (p.inclL ? n(p.lunchPrice) : 0) + (p.inclD ? n(p.dinnerPrice) : 0);
}

export interface BookingTotalsInput {
  roomSubtotal: number; discountPct: number; plan: PlanMeals;
  adults: number; nights: number; extras: number; taxPct: number;
}
export interface BookingTotals {
  roomAfterDiscount: number; discountAmount: number; mealCost: number; tax: number; total: number;
}

export function computeBookingTotals(i: BookingTotalsInput): BookingTotals {
  const room = n(i.roomSubtotal);
  const discountAmount = Math.round((room * n(i.discountPct)) / 100);
  const roomAfterDiscount = room - discountAmount;
  const mealCost = mealPerNightPerGuest(i.plan) * n(i.adults) * n(i.nights);
  const taxBase = roomAfterDiscount + mealCost + n(i.extras);
  const tax = Math.round((taxBase * n(i.taxPct)) / 100);
  const total = taxBase + tax;
  return { roomAfterDiscount, discountAmount, mealCost, tax, total };
}
```

- [ ] **Step 4: Run to verify it passes** — `npm test -- booking-pricing` → PASS.

- [ ] **Step 5: Commit**

```bash
git add luxe-pms/src/lib/booking-pricing.ts luxe-pms/src/lib/booking-pricing.test.ts
git commit -m "feat(bookings): pure helper for plan discount + included-meal cost"
```

---

### Task 3: Setup — Rate Plans price inputs + remove Meal Plans section

**Files:**
- Modify: `luxe-pms/src/app/(app)/setup/setup-view.tsx`
- Delete: `luxe-pms/src/app/(app)/setup/meal-plans-manager.tsx`

**Interfaces:** Consumes Task 1's price fields.

- [ ] **Step 1: Extend the `RatePlan` type + seed + add-default**

In `setup-view.tsx`:
(a) The `RatePlan` type (~line 228) — add `breakfastPrice: number; lunchPrice: number; dinnerPrice: number;` (before `active` is fine):
```tsx
type RatePlan = {
  id: string; code: string; name: string;
  inclBreakfast: boolean; inclLunch: boolean; inclDinner: boolean;
  discountPct: number; refundable: boolean;
  breakfastPrice: number; lunchPrice: number; dinnerPrice: number;
  active: boolean;
};
```
(b) Each `RATE_PLANS_SEED` row (~lines 234–239): add `breakfastPrice: 0, lunchPrice: 0, dinnerPrice: 0,` before `active: true`.
(c) The add-plan default (~line 1828): add `breakfastPrice: 0, lunchPrice: 0, dinnerPrice: 0,` before `active: true`.

- [ ] **Step 2: Add a ₹ price input under each B/L/D checkbox**

Replace the three meal cells (~lines 1869–1871):
```tsx
                <td className="px-3 py-2 text-center"><input type="checkbox" checked={p.inclBreakfast} onChange={e => upd(p.id, { inclBreakfast: e.target.checked })} className="h-4 w-4" /></td>
                <td className="px-3 py-2 text-center"><input type="checkbox" checked={p.inclLunch} onChange={e => upd(p.id, { inclLunch: e.target.checked })} className="h-4 w-4" /></td>
                <td className="px-3 py-2 text-center"><input type="checkbox" checked={p.inclDinner} onChange={e => upd(p.id, { inclDinner: e.target.checked })} className="h-4 w-4" /></td>
```
with (checkbox stacked above a small price input, disabled when the meal is unchecked):
```tsx
                <td className="px-3 py-2 text-center"><div className="flex flex-col items-center gap-1"><input type="checkbox" checked={p.inclBreakfast} onChange={e => upd(p.id, { inclBreakfast: e.target.checked })} className="h-4 w-4" /><Input type="number" min={0} value={p.breakfastPrice} disabled={!p.inclBreakfast} onChange={e => upd(p.id, { breakfastPrice: Math.max(0, Number(e.target.value)) })} className="h-7 w-16 tabular text-right text-xs" placeholder="₹" /></div></td>
                <td className="px-3 py-2 text-center"><div className="flex flex-col items-center gap-1"><input type="checkbox" checked={p.inclLunch} onChange={e => upd(p.id, { inclLunch: e.target.checked })} className="h-4 w-4" /><Input type="number" min={0} value={p.lunchPrice} disabled={!p.inclLunch} onChange={e => upd(p.id, { lunchPrice: Math.max(0, Number(e.target.value)) })} className="h-7 w-16 tabular text-right text-xs" placeholder="₹" /></div></td>
                <td className="px-3 py-2 text-center"><div className="flex flex-col items-center gap-1"><input type="checkbox" checked={p.inclDinner} onChange={e => upd(p.id, { inclDinner: e.target.checked })} className="h-4 w-4" /><Input type="number" min={0} value={p.dinnerPrice} disabled={!p.inclDinner} onChange={e => upd(p.id, { dinnerPrice: Math.max(0, Number(e.target.value)) })} className="h-7 w-16 tabular text-right text-xs" placeholder="₹" /></div></td>
```

- [ ] **Step 3: Remove the Meal Plans Setup section**

In `setup-view.tsx`, remove the five `meal-plans` touch-points added earlier:
- the `import { MealPlansManager } from "./meal-plans-manager";` line,
- the `{ id: "meal-plans", ... }` entry in `SECTIONS`,
- `"meal-plans"` from the `CUSTOM_SECTIONS` set,
- the `"meal-plans": [],` entry in `INITIAL_DATA`,
- the `{active === "meal-plans" && <MealPlansManager onToast={showToast} />}` render line.

Then delete the file `luxe-pms/src/app/(app)/setup/meal-plans-manager.tsx`.

- [ ] **Step 4: Typecheck + lint + build**

Run (from `luxe-pms/`): `npx tsc --noEmit` → exit 0; `npm run lint` → no new errors; `npm run build` → succeeds (confirms `RatePlan` type usages compile and no dangling `MealPlansManager`/`"meal-plans"` references remain).

- [ ] **Step 5: Commit**

```bash
git add "luxe-pms/src/app/(app)/setup/setup-view.tsx"
git rm "luxe-pms/src/app/(app)/setup/meal-plans-manager.tsx"
git commit -m "feat(setup): rate-plan B/L/D price inputs; remove redundant Meal Plans section"
```

---

### Task 4: Booking calculation in `bookings/new`

**Files:**
- Modify: `luxe-pms/src/app/(app)/bookings/new/page.tsx`

**Interfaces:** Consumes `computeBookingTotals` from `@/lib/booking-pricing` and the rate-plan meal prices.

- [ ] **Step 1: Carry meal prices into the rate-plan option**

In `bookings/new/page.tsx`:
(a) `RatePlanOpt` type (~line 28) — add `breakfastPrice: number; lunchPrice: number; dinnerPrice: number;`.
(b) `ApiRatePlan` type (~line 32) — add `breakfastPrice?: number; lunchPrice?: number; dinnerPrice?: number;`.
(c) `mapRatePlan` return (~line 40) — add `breakfastPrice: r.breakfastPrice ?? 0, lunchPrice: r.lunchPrice ?? 0, dinnerPrice: r.dinnerPrice ?? 0,`.
(d) Add the import near the top:
```tsx
import { computeBookingTotals } from "@/lib/booking-pricing";
```

- [ ] **Step 2: Replace the tax/total block with the helper**

Replace lines ~222–229:
```tsx
  const extras =
    (breakfast ? 95 * adults * nights : 0) +
    (extraBed ? 900 * nights : 0) +
    (airportTransfer ? 175 : 0) +
    earlyFee + lateFee +
    fbTotal;
  const tax = (subtotal + extras) * 0.05;
  const total = subtotal + extras + tax;
```
with:
```tsx
  const extras =
    (breakfast ? 95 * adults * nights : 0) +
    (extraBed ? 900 * nights : 0) +
    (airportTransfer ? 175 : 0) +
    earlyFee + lateFee +
    fbTotal;
  const selectedPlan = ratePlans.find(p => p.v === ratePlan);
  const { roomAfterDiscount, discountAmount, mealCost, tax, total } = computeBookingTotals({
    roomSubtotal: subtotal,
    discountPct: selectedPlan?.discountPct ?? 0,
    plan: {
      inclB: !!selectedPlan?.meals.includes("B"), inclL: !!selectedPlan?.meals.includes("L"), inclD: !!selectedPlan?.meals.includes("D"),
      breakfastPrice: selectedPlan?.breakfastPrice ?? 0, lunchPrice: selectedPlan?.lunchPrice ?? 0, dinnerPrice: selectedPlan?.dinnerPrice ?? 0,
    },
    adults, nights, extras, taxPct: 5,
  });
```
(`tax` and `total` are now the helper's; `advance` below already derives from `total`, unchanged.)

- [ ] **Step 3: Show discount + plan-meals in the summary**

In the price-summary JSX (the section listing Room subtotal / extras / Tax / Total), add — right after the room subtotal line and before the tax line — two conditional rows so the math is transparent:
```tsx
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-success"><span>{selectedPlan?.label ?? "Plan"} discount ({selectedPlan?.discountPct ?? 0}%)</span><span>−{money(discountAmount)}</span></div>
                )}
                {mealCost > 0 && (
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Plan meals ({adults} × {nights}n)</span><span>{money(mealCost)}</span></div>
                )}
```
Match the existing summary row markup/classes in the file (use the same wrapper/`money()` pattern the neighboring lines use). Keep the existing Room subtotal, extras, Tax, and Total lines (`subtotal`, `extras`, `tax`, `total` are all still defined).

- [ ] **Step 4: Typecheck + lint + build**

Run (from `luxe-pms/`): `npx tsc --noEmit` → exit 0; `npm run lint` → no new errors; `npm run build` → succeeds (confirms the discount is now applied via the helper and meal prices flow through).

- [ ] **Step 5: Commit**

```bash
git add "luxe-pms/src/app/(app)/bookings/new/page.tsx"
git commit -m "feat(bookings): apply plan discount + included-meal cost to the booking total"
```

---

## Self-Review

**Spec coverage:**
- Meal-price columns + rules on rate-plans → Task 1. ✓
- Rate Plans Setup price inputs (type+seed+add+cells) → Task 3 Steps 1–2. ✓
- Remove Meal Plans Setup section (keep backend resource) → Task 3 Step 3. ✓
- Booking applies discount (room only) + meal cost (per adult/night), tax on room+meals+extras → Task 2 helper + Task 4 Step 2. ✓
- Summary shows discount + plan-meal lines → Task 4 Step 3. ✓
- Pure unit-tested helper → Task 2. ✓
- Out-of-scope (drop backend meal-plans, child pricing, à-la-carte/F&B untouched) → respected. ✓

**Placeholder scan:** Complete code for Tasks 1–2; exact before/after for Tasks 3–4 (Step 3 of Task 4 says "match neighboring markup" because the summary row classes vary — the rows added are concrete). ✓

**Type consistency:** `PlanMeals`/`computeBookingTotals` (Task 2) consumed in Task 4 with matching shape; `RatePlanOpt`/`ApiRatePlan`/`mapRatePlan` (Task 4 Step 1) carry the three prices that Task 1 persists; `RatePlan` (Setup, Task 3) gains the same three fields. Downstream `subtotal`/`extras`/`tax`/`total`/`advance` names preserved. ✓
