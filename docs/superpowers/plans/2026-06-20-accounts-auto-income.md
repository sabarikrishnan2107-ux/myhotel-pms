# Accounts Auto-Income from Bookings — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put the entire Accounts **Dashboard** on real data (no hardcoded mock) — Income reflects cash actually received from room/group/hall/banquet bookings, the 6-month income-vs-expense chart and 30-day cash-movement chart are computed from real records, KPI deltas/MoM are real — and give the dashboard an honest UI pass.

**Architecture:** A live read-model. The existing `GET /api/accounts/summary` endpoint is extended to (a) aggregate cash-received into authoritative income categories that supersede colliding manual ledger rows, returning `incomeTotal`; and (b) return `monthlyTrend` (6 months income/expense) and `cashTrend` (30-day cumulative net cash). The Accounts dashboard consumes these for its KPIs and charts, computes real MoM deltas, and drops all mock fallbacks (`PL_TREND`, `CASH_FLOW`, `INCOME_BREAKDOWN`, `EXPENSE_BREAKDOWN`, `RECENT_TXN`). No new tables, no migrations, no auto-posted ledger rows.

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

### Task 2: Backend — add `monthlyTrend` + `cashTrend` to the summary

**Files:**
- Modify: `hotel-pms-api/app/Http/Controllers/Api/StatsController.php` (method `accountsSummary`, the version produced by Task 1)
- Test: `hotel-pms-api/tests/Feature/AccountsAutoIncomeTest.php` (add a test method)

**Interfaces:**
- Consumes: the Task-1 `accountsSummary` (with `$autoNames`, the model imports, `$income`, `$incomeTotal`).
- Produces: `accountsSummary` JSON additionally returns `monthlyTrend: {month:string,income:int,expense:int}[]` (6 entries, oldest→newest) and `cashTrend: {day:string,balance:int}[]` (30 entries). Income uses the same de-dup rule (manual income excludes the 4 `$autoNames`); expense = `account_entries` of type `expense`+`refund`.

- [ ] **Step 1: Add the failing test**

Append this method to `hotel-pms-api/tests/Feature/AccountsAutoIncomeTest.php` (inside the class):

```php
    public function test_summary_returns_monthly_and_cash_trends(): void
    {
        $today = date('Y-m-d');
        FolioPayment::create(['bookingNo' => 'BK1', 'date' => $today, 'mode' => 'Cash', 'amount' => 50000]);
        AccountEntry::create(['date' => $today, 'type' => 'expense', 'category' => 'Salaries', 'description' => 'payroll', 'amount' => 20000]);

        $res = $this->getJson('/api/accounts/summary')->assertOk();

        $monthly = $res->json('monthlyTrend');
        $this->assertCount(6, $monthly);
        $this->assertSame(50000, $monthly[5]['income']);   // current month
        $this->assertSame(20000, $monthly[5]['expense']);

        $cash = $res->json('cashTrend');
        $this->assertCount(30, $cash);
        // Only today has activity: +50000 income − 20000 expense = +30000 cumulative on the last day.
        $this->assertSame(30000, $cash[29]['balance']);
    }
```

- [ ] **Step 2: Run it to verify it fails**

Run: `C:\php84\php.exe artisan test --filter=test_summary_returns_monthly_and_cash_trends`
Expected: FAIL — `monthlyTrend`/`cashTrend` are null (keys absent).

- [ ] **Step 3: Compute the trends in `accountsSummary`**

In the Task-1 `accountsSummary` body, **after** `$income`/`$incomeTotal` are computed and **before** the `return response()->json([...])`, insert:

```php
        // ---- monthlyTrend: last 6 months, income (cash received) vs expense ----
        $months = [];
        for ($i = 5; $i >= 0; $i--) {
            $ts = strtotime("first day of -$i month");
            $months[date('Y-m', $ts)] = ['month' => date('M', $ts), 'income' => 0, 'expense' => 0];
        }
        $addMonthly = function ($rows, string $key) use (&$months) {
            foreach ($rows as $r) {
                if (isset($months[$r->ym])) $months[$r->ym][$key] += (int) $r->v;
            }
        };
        $monthAgg = fn ($query, string $dateCol, string $amountCol) => $query
            ->selectRaw('substr("'.$dateCol.'",1,7) as ym, coalesce(sum("'.$amountCol.'"),0) as v')
            ->groupBy('ym')->get();

        $addMonthly($monthAgg(FolioPayment::query(), 'date', 'amount'), 'income');
        $addMonthly($monthAgg(GroupBooking::query(), 'createdAt', 'advance'), 'income');
        $addMonthly($monthAgg(HallBooking::query(), 'date', 'advance'), 'income');
        $addMonthly($monthAgg(BanquetOrder::query(), 'date', 'advance'), 'income');
        $addMonthly($monthAgg(AccountEntry::where('type', 'income')->whereNotIn('category', $autoNames), 'date', 'amount'), 'income');
        $addMonthly($monthAgg(AccountEntry::whereIn('type', ['expense', 'refund']), 'date', 'amount'), 'expense');
        $monthlyTrend = array_values($months);

        // ---- cashTrend: last 30 days, cumulative net cash movement ----
        $days = [];
        for ($i = 29; $i >= 0; $i--) {
            $days[date('Y-m-d', strtotime("-$i day"))] = 0;
        }
        $addDaily = function ($rows, int $sign) use (&$days) {
            foreach ($rows as $r) {
                if (isset($days[$r->d])) $days[$r->d] += $sign * (int) $r->v;
            }
        };
        $dayAgg = fn ($query, string $dateCol, string $amountCol) => $query
            ->selectRaw('substr("'.$dateCol.'",1,10) as d, coalesce(sum("'.$amountCol.'"),0) as v')
            ->groupBy('d')->get();

        $addDaily($dayAgg(FolioPayment::query(), 'date', 'amount'), 1);
        $addDaily($dayAgg(GroupBooking::query(), 'createdAt', 'advance'), 1);
        $addDaily($dayAgg(HallBooking::query(), 'date', 'advance'), 1);
        $addDaily($dayAgg(BanquetOrder::query(), 'date', 'advance'), 1);
        $addDaily($dayAgg(AccountEntry::where('type', 'income')->whereNotIn('category', $autoNames), 'date', 'amount'), 1);
        $addDaily($dayAgg(AccountEntry::whereIn('type', ['expense', 'refund']), 'date', 'amount'), -1);

        $bal = 0; $cashTrend = []; $n = 0;
        foreach ($days as $net) {
            $bal += $net;
            $cashTrend[] = ['day' => (string) (++$n), 'balance' => $bal];
        }
```

Then extend the return array to include the two new keys:

```php
        return response()->json([
            'income'      => $income,
            'incomeTotal' => (int) $income->sum('value'),
            'expense'     => $byCat('expense'),
            'recent'      => $recent,
            'monthlyTrend' => $monthlyTrend,
            'cashTrend'    => $cashTrend,
        ]);
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `C:\php84\php.exe artisan test --filter=AccountsAutoIncomeTest`
Expected: PASS (all 3 tests).

- [ ] **Step 5: Commit**

```bash
git add hotel-pms-api/app/Http/Controllers/Api/StatsController.php hotel-pms-api/tests/Feature/AccountsAutoIncomeTest.php
git commit -m "feat(accounts): summary returns real 6-month + 30-day trends"
```

---

### Task 3: Frontend — wire dashboard to real data, remove all mock fallbacks

**Files:**
- Modify: `luxe-pms/src/app/(app)/accounts/page.tsx`

**Interfaces:**
- Consumes: `GET /api/accounts/summary` now returning `incomeTotal`, `monthlyTrend`, `cashTrend` (Tasks 1-2).
- Produces: dashboard charts/KPIs render real `summary` data; no imports from `_data`'s `PL_TREND`/`CASH_FLOW` or `mock-data-ext`'s `INCOME_BREAKDOWN`/`EXPENSE_BREAKDOWN`/`RECENT_TXN`.

- [ ] **Step 1: Extend the `summary` state type** (~line 90)

Replace the `summary` state declaration with:

```tsx
  const [summary, setSummary] = React.useState<{ incomeTotal: number; income: { category: string; value: number }[]; expense: { category: string; value: number }[]; recent: { id: number; date: string; desc: string; type: string; amount: number }[]; monthlyTrend: { month: string; income: number; expense: number }[]; cashTrend: { day: string; balance: number }[] } | null>(null);
```

- [ ] **Step 2: Replace mock-fallback derivations** (~lines 103-111)

Replace the `incomeBreakdown`/`expenseBreakdown`/`recentTxn` block so they use real data or empty arrays (no mock import):

```tsx
  const incomeBreakdown = (summary?.income ?? []).map((r, i) => ({ label: r.category, value: r.value, color: PIE_COLORS[i % PIE_COLORS.length] }));
  const expenseBreakdown = (summary?.expense ?? []).map((r, i) => ({ label: r.category, value: r.value, color: PIE_COLORS[i % PIE_COLORS.length] }));
  const recentTxn = (summary?.recent ?? []).map(r => ({ id: String(r.id), date: r.date, desc: r.desc, type: r.type as "Income" | "Expense" | "Refund", amount: r.amount }));
  const monthlyTrend = summary?.monthlyTrend ?? [];
  const cashTrend = summary?.cashTrend ?? [];
```

- [ ] **Step 3: Replace income/expense derivations** (~lines 143-146)

Replace the `seedIncome`/`seedExpense`/`income`/`expense` lines with (real summary totals; 0 until loaded):

```tsx
  const income = summary?.incomeTotal ?? 0;
  const expense = summary ? summary.expense.reduce((s, e) => s + e.value, 0) : 0;
```

(Remove the now-unused `sumByType`, `seedIncome`, `seedExpense` if nothing else references them — check first; `sumByType` may be used elsewhere.)

- [ ] **Step 4: Point the charts at real data**

Income vs Expense chart (~line 219): change `data={PL_TREND}` → `data={monthlyTrend}`.
Cash chart (~line 244): change `data={CASH_FLOW}` → `data={cashTrend}`.

- [ ] **Step 5: Remove the mock imports**

Delete the import on ~line 15:

```tsx
import { INCOME_BREAKDOWN, EXPENSE_BREAKDOWN, RECENT_TXN } from "@/lib/mock-data-ext";
```

In the `./_data` import block (~lines 20-25), remove `PL_TREND, CASH_FLOW,` from the imported names (leave the rest of that import intact).

- [ ] **Step 6: Typecheck**

Run: `cd "luxe-pms" && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "accounts/page|error TS" | head`
Expected: no output (no errors). Fix any unused-symbol errors by removing the dead symbol.

- [ ] **Step 7: Commit**

```bash
git add "luxe-pms/src/app/(app)/accounts/page.tsx"
git commit -m "feat(accounts): dashboard reads real summary data, drop mock fallbacks"
```

---

### Task 4: Frontend — real KPI deltas, honest MoM badge, UI polish

**Files:**
- Modify: `luxe-pms/src/app/(app)/accounts/page.tsx`

**Interfaces:**
- Consumes: `monthlyTrend` (from Task 3 scope).
- Produces: KPI deltas and the trend-card badge computed from real month-over-month data; the fake "AI projection enabled" badge removed.

- [ ] **Step 1: Compute real MoM deltas** — add near the other derived values (after `monthlyTrend` is defined, ~line 108):

```tsx
  // Real month-over-month deltas from the last two months of the trend.
  const pctDelta = (cur: number, prev: number) => (prev > 0 ? Number((((cur - prev) / prev) * 100).toFixed(1)) : 0);
  const lastM = monthlyTrend[monthlyTrend.length - 1];
  const prevM = monthlyTrend[monthlyTrend.length - 2];
  const incomeDelta = lastM && prevM ? pctDelta(lastM.income, prevM.income) : 0;
  const expenseDelta = lastM && prevM ? pctDelta(lastM.expense, prevM.expense) : 0;
  const profitDelta = lastM && prevM ? pctDelta(lastM.income - lastM.expense, prevM.income - prevM.expense) : 0;
```

- [ ] **Step 2: Use real deltas on the KPI cards** (~lines 179-181)

Replace the three hardcoded `delta` props:
- `delta={4.9}` → `delta={incomeDelta}`
- `delta={-2.7}` → `delta={expenseDelta}`
- `delta={8.4}` → `delta={profitDelta}`

- [ ] **Step 3: Real MoM badge on the trend card** (~line 213)

Replace:

```tsx
                <Badge tone="success">+8.4% MoM profit</Badge>
```

with:

```tsx
                <Badge tone={profitDelta >= 0 ? "success" : "danger"}>{profitDelta >= 0 ? "+" : ""}{profitDelta}% MoM profit</Badge>
```

- [ ] **Step 4: Honest cash-trend card** (~lines 237-238)

Change the title `Cash Balance Trend — last 30 days` → `Net Cash Movement — last 30 days`, and **remove** the badge line:

```tsx
                <Badge tone="brand"><Bot className="h-3 w-3" />AI projection enabled</Badge>
```

(If `Bot` becomes an unused import after this, remove it from the lucide import on line 5.)

- [ ] **Step 5: Empty states for the charts** — so an account with no data doesn't show blank axes. Wrap each chart's `ResponsiveContainer` so that when its data array is empty it renders a centered muted message instead. For the income chart use `monthlyTrend.length === 0`, for cash use `cashTrend.length === 0`:

```tsx
                {monthlyTrend.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">No income or expense recorded yet</div>
                ) : (
                  <div className="h-64">
                    {/* existing ResponsiveContainer ... */}
                  </div>
                )}
```

Apply the analogous wrapper to the cash chart (`h-44`, message "No cash movement in the last 30 days"). Keep the existing chart markup inside the `else` branch unchanged.

- [ ] **Step 6: Typecheck + build**

Run: `cd "luxe-pms" && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -cE "error TS"` → expect `0`
Run: `cd "luxe-pms" && NODE_OPTIONS=--max-old-space-size=3072 npm run build` → expect exit 0, all pages generated.

- [ ] **Step 7: Commit**

```bash
git add "luxe-pms/src/app/(app)/accounts/page.tsx"
git commit -m "feat(accounts): real KPI deltas + MoM badge, honest cash card, empty states"
```

---

### Task 5: End-to-end verification against the live local backend

**Files:** none (verification only)

**Interfaces:** Consumes the running local backend (`C:\php84\php.exe artisan serve` on :8000) and Postgres `hotel_pms`.

- [ ] **Step 1: Confirm the summary endpoint shape**

```bash
BASE=http://127.0.0.1:8000/api
TOKEN=$(curl -s -X POST "$BASE/login" -H "Content-Type: application/json" -H "Accept: application/json" -d '{"email":"admin@hotel.com","password":"password123"}' | sed -E 's/.*"token":"([^"]+)".*/\1/')
curl -s "$BASE/accounts/summary" -H "Authorization: Bearer $TOKEN" -H "Accept: application/json" | python -m json.tool
```

Expected: JSON has `incomeTotal`, `income` (with the 4 booking categories), `monthlyTrend` (6 items with month/income/expense), `cashTrend` (30 items with day/balance).

- [ ] **Step 2: Confirm in the browser**

Open the Accounts → Dashboard tab. Verify: Total Income KPI shows the booking-driven figure; the 6-month bar chart and 30-day cash line reflect real data (not the old smooth mock curve); KPI deltas and the MoM badge show computed values; no "AI projection enabled" badge.

---

## Notes for the executor

- This is a read-model change only — **no migration**. After Task 4's build passes it is deploy-ready.
- Deployment to the live server (`168.144.26.131`) is a **separate step** (push `main` → rsync → backend `php artisan optimize` + `systemctl reload php8.4-fpm` → frontend rebuild/restart). Ask the user before deploying.
