# Accounts Auto-Income from Bookings — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Accounts page Income figure automatically reflect cash actually received from room bookings, group bookings, hall bookings, and banquet orders.

**Architecture:** A live read-model. The existing `GET /api/accounts/summary` endpoint is extended to aggregate cash-received from `folio_payments` + group/hall/banquet `advance` columns into authoritative income categories (which supersede colliding manual ledger categories), and to return an `incomeTotal`. The Accounts page uses `incomeTotal` for its Income KPI. No new tables, no auto-posted ledger rows.

**Tech Stack:** Laravel 11 (PHP 8.4) backend with PHPUnit feature tests on sqlite `:memory:`; Next.js 16 / React / TypeScript frontend.

## Global Constraints

- Income basis is **cash received** — count `folio_payments.amount` and the `advance` columns only; never `total`/`balance` (that would be accrual).
- The 4 authoritative income category names, **exact strings**: `Room Revenue`, `Group Bookings`, `Hall Bookings`, `Banquet`.
- A manual `account_entries` income row whose `category` equals one of those 4 names is **dropped** from the breakdown (the live figure supersedes it). Manual income in any other category is kept.
- Run PHP via `C:\php84\php.exe` (the herd-lite php lacks pgsql; tests use sqlite but use php84 for consistency).
- Do not change the `expense` or `recent` parts of the endpoint, nor any other Accounts tab.

---

### Task 1: Backend — aggregate booking cash-received into accounts summary

**Files:**
- Modify: `hotel-pms-api/app/Http/Controllers/Api/StatsController.php` (method `accountsSummary`, ~line 369; plus model imports at top)
- Test: `hotel-pms-api/tests/Feature/AccountsAutoIncomeTest.php` (create)

**Interfaces:**
- Consumes: existing route `GET /api/accounts/summary` (already registered, sanctum-protected), models `App\Models\FolioPayment`, `App\Models\GroupBooking`, `App\Models\HallBooking`, `App\Models\BanquetOrder`, `App\Models\AccountEntry`.
- Produces: JSON `{ income: {category,value}[], incomeTotal: int, expense: {category,value}[], recent: [...] }` where `income` includes the 4 authoritative booking categories (only those with value > 0) plus non-colliding manual income, sorted by value desc; `incomeTotal` = sum of `income[].value`.

- [ ] **Step 1: Write the failing test**

Create `hotel-pms-api/tests/Feature/AccountsAutoIncomeTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\AccountEntry;
use App\Models\BanquetOrder;
use App\Models\FolioPayment;
use App\Models\GroupBooking;
use App\Models\HallBooking;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AccountsAutoIncomeTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->actingAs(User::factory()->create(), 'sanctum');
    }

    public function test_summary_uses_booking_cash_received_and_supersedes_manual(): void
    {
        // Manual ledger: one colliding category (Room Revenue) + one distinct (F&B) + an expense.
        AccountEntry::create(['date' => '2026-06-01', 'type' => 'income', 'category' => 'Room Revenue', 'description' => 'manual room', 'amount' => 10000]);
        AccountEntry::create(['date' => '2026-06-01', 'type' => 'income', 'category' => 'F&B', 'description' => 'snacks', 'amount' => 2000]);
        AccountEntry::create(['date' => '2026-06-01', 'type' => 'expense', 'category' => 'Salaries', 'description' => 'payroll', 'amount' => 5000]);

        // Real cash received.
        FolioPayment::create(['bookingNo' => 'BK1', 'date' => '2026-06-02', 'mode' => 'Cash', 'amount' => 50000]);
        FolioPayment::create(['bookingNo' => 'BK2', 'date' => '2026-06-03', 'mode' => 'Card', 'amount' => 30000]);
        GroupBooking::create(['advance' => 20000]);
        HallBooking::create(['advance' => 15000]);
        BanquetOrder::create(['advance' => 40000]);

        $res = $this->getJson('/api/accounts/summary')->assertOk();

        // Authoritative booking categories (Room Revenue from folio payments, NOT the manual 10000).
        $res->assertJsonFragment(['category' => 'Room Revenue', 'value' => 80000]);
        $res->assertJsonFragment(['category' => 'Group Bookings', 'value' => 20000]);
        $res->assertJsonFragment(['category' => 'Hall Bookings', 'value' => 15000]);
        $res->assertJsonFragment(['category' => 'Banquet', 'value' => 40000]);
        // Non-colliding manual income kept.
        $res->assertJsonFragment(['category' => 'F&B', 'value' => 2000]);

        // Total = 80000 + 20000 + 15000 + 40000 + 2000 (F&B); manual Room Revenue 10000 dropped.
        $this->assertSame(157000, $res->json('incomeTotal'));
        // Expense untouched.
        $res->assertJsonFragment(['category' => 'Salaries', 'value' => 5000]);
    }

    public function test_zero_booking_revenue_categories_are_omitted(): void
    {
        AccountEntry::create(['date' => '2026-06-01', 'type' => 'income', 'category' => 'Misc', 'description' => 'x', 'amount' => 500]);

        $res = $this->getJson('/api/accounts/summary')->assertOk();

        // No bookings => the 4 auto categories should not appear (value 0 omitted).
        $res->assertJsonMissing(['category' => 'Room Revenue']);
        $res->assertJsonMissing(['category' => 'Banquet']);
        $this->assertSame(500, $res->json('incomeTotal'));
    }
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `C:\php84\php.exe artisan test --filter=AccountsAutoIncomeTest`
Expected: FAIL — `incomeTotal` is null (key absent) and `Room Revenue` value is 10000 (manual) not 80000.

- [ ] **Step 3: Add model imports to StatsController**

At the top of `hotel-pms-api/app/Http/Controllers/Api/StatsController.php`, alongside the existing `use App\Models\...` lines, add (keep alphabetical with the existing ones where practical):

```php
use App\Models\BanquetOrder;
use App\Models\FolioPayment;
use App\Models\GroupBooking;
use App\Models\HallBooking;
```

(Do not duplicate any that already exist — check the current `use` block first.)

- [ ] **Step 4: Rewrite the `accountsSummary` method body**

Replace the entire `accountsSummary` method (currently ~lines 369-392) with:

```php
    public function accountsSummary(\Illuminate\Http\Request $request)
    {
        $from = $request->query('from');
        $to   = $request->query('to');

        $base = AccountEntry::query();
        if ($from) $base->where('date', '>=', $from);
        if ($to)   $base->where('date', '<=', $to);

        $byCat = fn (string $type) => (clone $base)->where('type', $type)
            ->selectRaw('category, coalesce(sum(amount),0) as value')
            ->groupBy('category')->orderByDesc('value')->get()
            ->map(fn ($r) => ['category' => $r->category ?: 'Other', 'value' => (int) $r->value])
            ->values();

        $recent = (clone $base)->orderByDesc('id')->limit(8)->get()
            ->map(fn ($e) => [
                'id' => $e->id, 'date' => $e->date, 'desc' => $e->description,
                'type' => ucfirst($e->type), 'amount' => (int) $e->amount,
            ])->values();

        // ---- Live cash received from bookings (authoritative income categories) ----
        // Each source is filtered on its own date column when a range is supplied;
        // with no range, all rows are summed. Only the `advance`/payment amount is
        // counted (cash received), never the booked total/balance.
        $sumBetween = function ($query, string $col, string $amountCol) use ($from, $to) {
            if ($from) $query->where($col, '>=', $from);
            if ($to)   $query->where($col, '<=', $to);
            return (int) $query->sum($amountCol);
        };

        $autoCats = [
            ['category' => 'Room Revenue',   'value' => $sumBetween(FolioPayment::query(), 'date', 'amount')],
            ['category' => 'Group Bookings', 'value' => $sumBetween(GroupBooking::query(), 'createdAt', 'advance')],
            ['category' => 'Hall Bookings',  'value' => $sumBetween(HallBooking::query(), 'date', 'advance')],
            ['category' => 'Banquet',        'value' => $sumBetween(BanquetOrder::query(), 'date', 'advance')],
        ];
        $autoNames = ['Room Revenue', 'Group Bookings', 'Hall Bookings', 'Banquet'];

        // Manual income, minus the categories the live booking figures supersede.
        $manualIncome = $byCat('income')
            ->reject(fn ($r) => in_array($r['category'], $autoNames, true));

        $income = collect($autoCats)
            ->filter(fn ($r) => $r['value'] > 0)
            ->merge($manualIncome)
            ->sortByDesc('value')
            ->values();

        return response()->json([
            'income'      => $income,
            'incomeTotal' => (int) $income->sum('value'),
            'expense'     => $byCat('expense'),
            'recent'      => $recent,
        ]);
    }
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `C:\php84\php.exe artisan test --filter=AccountsAutoIncomeTest`
Expected: PASS (2 tests, all assertions green).

- [ ] **Step 6: Run the broader suite to check nothing regressed**

Run: `C:\php84\php.exe artisan test --filter=MockToLiveTest`
Expected: PASS (existing accounts/mock-to-live behavior unaffected).

- [ ] **Step 7: Commit**

```bash
git add hotel-pms-api/app/Http/Controllers/Api/StatsController.php hotel-pms-api/tests/Feature/AccountsAutoIncomeTest.php
git commit -m "feat(accounts): summary income includes cash received from bookings"
```

---

### Task 2: Frontend — drive the Income KPI from `incomeTotal`

**Files:**
- Modify: `luxe-pms/src/app/(app)/accounts/page.tsx` (the `summary` state type ~line 90; the `income` derivation ~line 145)

**Interfaces:**
- Consumes: `GET /api/accounts/summary` now returning `incomeTotal: number` (from Task 1).
- Produces: the page-level `income` constant now equals `summary.incomeTotal` when summary has loaded; everything downstream (Income KPIs, VAT `income*0.05`, profit, margin, income breakdown) already derives from `income`/`summary.income`.

- [ ] **Step 1: Add `incomeTotal` to the summary state type**

In `luxe-pms/src/app/(app)/accounts/page.tsx`, find the `summary` state declaration (~line 90):

```tsx
  const [summary, setSummary] = React.useState<{ income: { category: string; value: number }[]; expense: { category: string; value: number }[]; recent: { id: number; date: string; desc: string; type: string; amount: number }[] } | null>(null);
```

Replace it with (adds `incomeTotal`):

```tsx
  const [summary, setSummary] = React.useState<{ incomeTotal: number; income: { category: string; value: number }[]; expense: { category: string; value: number }[]; recent: { id: number; date: string; desc: string; type: string; amount: number }[] } | null>(null);
```

- [ ] **Step 2: Use `incomeTotal` for the Income figure**

Find the income derivation (~line 145):

```tsx
  const income = entries.length ? sumByType("income") : seedIncome;
```

Replace with (prefer the authoritative live total; fall back to manual sum, then seed):

```tsx
  const income = summary ? summary.incomeTotal : (entries.length ? sumByType("income") : seedIncome);
```

Leave the line below it (`const expense = ...`) and everything else unchanged.

- [ ] **Step 3: Typecheck**

Run: `cd "luxe-pms" && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -cE "error TS"`
Expected: `0`

- [ ] **Step 4: Production build**

Run: `cd "luxe-pms" && NODE_OPTIONS=--max-old-space-size=3072 npm run build`
Expected: compiles successfully, all pages generated, exit 0.

- [ ] **Step 5: Commit**

```bash
git add "luxe-pms/src/app/(app)/accounts/page.tsx"
git commit -m "feat(accounts): Income KPI reflects live booking revenue total"
```

---

### Task 3: End-to-end verification against the live local backend

**Files:** none (verification only)

**Interfaces:** Consumes the running local backend (`C:\php84\php.exe artisan serve` on :8000) and Postgres `hotel_pms`.

- [ ] **Step 1: Confirm the summary endpoint returns booking revenue**

With the backend running, mint/login a token and call the endpoint:

```bash
BASE=http://127.0.0.1:8000/api
TOKEN=$(curl -s -X POST "$BASE/login" -H "Content-Type: application/json" -H "Accept: application/json" -d '{"email":"admin@hotel.com","password":"password123"}' | sed -E 's/.*"token":"([^"]+)".*/\1/')
curl -s "$BASE/accounts/summary" -H "Authorization: Bearer $TOKEN" -H "Accept: application/json" | python -m json.tool
```

Expected: JSON contains `incomeTotal` and `income` with `Room Revenue`/`Group Bookings`/`Hall Bookings`/`Banquet` categories reflecting the seeded `folio_payments`/advances; no duplicated manual "Room Revenue"/"Hall Rental".

- [ ] **Step 2: Confirm in the browser**

Open the Accounts page (dev server on :3000), Dashboard tab. The Total Income KPI and the income breakdown pie/list should show the booking-driven figure (millions, from real folio payments + banquet advances), not the small manual-entry sum.

---

## Notes for the executor

- After Task 2's build passes, the change is deploy-ready. Deployment to the live server (`168.144.26.131`) is a **separate step** (push `main` → rsync → backend `php artisan optimize` + `systemctl reload php8.4-fpm` → frontend rebuild/restart). No migration is involved — this is a read-model change only. Ask the user before deploying.
