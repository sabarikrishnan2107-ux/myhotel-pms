# Real Departmental P&L Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded Departmental P&L Statement with one computed from real data — revenue mapped to departments from live sources, costs split by a new `department` tag on expenses, plus overhead and refunds.

**Architecture:** A read-model endpoint `GET /accounts/departmental` aggregates revenue-by-department (same sources as `accountsSummary`, so totals reconcile with the dashboard) and cost-by-department (from a new `account_entries.department` field), returning revenue/directCosts/overhead rows + totals. Expense entry forms gain a Department picker. The PnlBsTab departmental table renders from the endpoint instead of `PNL_*` mocks.

**Tech Stack:** Laravel 11 / PHP 8.4 backend (PHPUnit feature tests on sqlite `:memory:`); Next.js 16 / React / TypeScript frontend.

## Global Constraints

- Departments, exact strings: `Rooms`, `F&B`, `Banquet`, `Spa`, `Other`; non-departmental costs use `General` (or null/empty) → treated as overhead.
- Revenue mapping reuses the dashboard's income sources so Total Revenue reconciles: folio payments + group advances → Rooms; hall + banquet advances → Banquet; manual income (categories NOT in `Room Revenue`/`Group Bookings`/`Hall Bookings`/`Banquet`) mapped by keyword: contains `f&b`/`food`/`restaurant` → F&B; `spa`/`wellness` → Spa; else Other.
- `netProfit = totalRevenue − totalDirectCosts − totalOverhead`; `grossProfit = totalRevenue − totalDirectCosts`; overhead total includes a `Refunds` line.
- Rows with `amount = 0` are omitted.
- Run PHP/tests with `C:\php84\php.exe` from `hotel-pms-api/`. Tests use sqlite in-memory (RefreshDatabase). `substr()`/`str_contains` work on both sqlite and Postgres.
- Do NOT change the "Actual P&L · from day-book" card or the Balance Sheet subtab.

---

### Task 1: Backend — `department` field on account entries

**Files:**
- Create: `hotel-pms-api/database/migrations/2026_06_20_140000_add_department_to_account_entries.php`
- Modify: `hotel-pms-api/app/Http/Controllers/Api/ResourceController.php` (the `account-entries` validation schema, ~line 440)
- Test: `hotel-pms-api/tests/Feature/DepartmentalPnlTest.php` (create)

**Interfaces:**
- Produces: `account_entries.department` (nullable string) persisted via the existing `POST/PUT /account-entries` resource routes; accepted by validation.

- [ ] **Step 1: Write the migration**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('account_entries', function (Blueprint $t) {
            $t->string('department')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('account_entries', function (Blueprint $t) {
            $t->dropColumn('department');
        });
    }
};
```

- [ ] **Step 2: Add `department` to validation**

In `ResourceController.php`, find the `'account-entries' => [ ... ]` rules array (around line 440, after the existing keys like `lines`/`attachment`) and add:

```php
            'department' => 'string|max:50|nullable',
```

- [ ] **Step 3: Write the failing test**

Create `hotel-pms-api/tests/Feature/DepartmentalPnlTest.php`:

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

class DepartmentalPnlTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->actingAs(User::factory()->create(), 'sanctum');
    }

    public function test_account_entry_persists_department(): void
    {
        $id = $this->postJson('/api/account-entries', [
            'date' => '2026-06-01', 'type' => 'expense', 'category' => 'F&B cost of goods',
            'description' => 'veg supplies', 'amount' => 5000, 'mode' => 'Cash', 'department' => 'F&B',
        ])->assertCreated()->json('id');

        $this->assertDatabaseHas('account_entries', ['id' => $id, 'department' => 'F&B']);
    }
}
```

- [ ] **Step 4: Run migration + test**

Run: `C:\php84\php.exe artisan migrate --force && C:\php84\php.exe artisan test --filter=test_account_entry_persists_department`
Expected: migration `...add_department_to_account_entries` runs DONE; test PASS.

- [ ] **Step 5: Commit**

```bash
git add hotel-pms-api/database/migrations/2026_06_20_140000_add_department_to_account_entries.php hotel-pms-api/app/Http/Controllers/Api/ResourceController.php hotel-pms-api/tests/Feature/DepartmentalPnlTest.php
git commit -m "feat(accounts): add department field to account entries"
```

---

### Task 2: Backend — `GET /accounts/departmental` endpoint

**Files:**
- Modify: `hotel-pms-api/app/Http/Controllers/Api/StatsController.php` (add method `departmentalPnl`; ensure the 4 booking models are imported — they already are for `accountsSummary`)
- Modify: `hotel-pms-api/routes/api.php` (register the route next to `/accounts/summary`)
- Test: `hotel-pms-api/tests/Feature/DepartmentalPnlTest.php` (add a method)

**Interfaces:**
- Consumes: Task 1's `department` column; models `FolioPayment`, `GroupBooking`, `HallBooking`, `BanquetOrder`, `AccountEntry` (already imported in StatsController).
- Produces: `GET /api/accounts/departmental` → JSON `{ departments: string[], revenue: {category,dept,amount}[], directCosts: {category,dept,amount}[], overhead: {category,amount}[], totals: {revenue,directCosts,grossProfit,overhead,netProfit} }` (all ints; zero-amount rows omitted).

- [ ] **Step 1: Add the failing test**

Append to `hotel-pms-api/tests/Feature/DepartmentalPnlTest.php`:

```php
    public function test_departmental_pnl_maps_revenue_costs_and_overhead(): void
    {
        FolioPayment::create(['bookingNo' => 'BK1', 'date' => '2026-06-02', 'mode' => 'Cash', 'amount' => 100000]);
        BanquetOrder::create(['advance' => 40000]);
        AccountEntry::create(['date' => '2026-06-03', 'type' => 'income', 'category' => 'F&B', 'description' => 'restaurant', 'amount' => 25000]);
        AccountEntry::create(['date' => '2026-06-03', 'type' => 'expense', 'category' => 'F&B cost of goods', 'description' => 'x', 'amount' => 8000, 'department' => 'F&B']);
        AccountEntry::create(['date' => '2026-06-03', 'type' => 'expense', 'category' => 'Payroll', 'description' => 'x', 'amount' => 12000, 'department' => 'General']);
        AccountEntry::create(['date' => '2026-06-03', 'type' => 'refund', 'category' => 'Refund', 'description' => 'x', 'amount' => 1000]);

        $res = $this->getJson('/api/accounts/departmental')->assertOk();

        // Revenue mapped to departments.
        $res->assertJsonFragment(['category' => 'Room Revenue', 'dept' => 'Rooms', 'amount' => 100000]);
        $res->assertJsonFragment(['category' => 'Banquet', 'dept' => 'Banquet', 'amount' => 40000]);
        $res->assertJsonFragment(['category' => 'F&B', 'dept' => 'F&B', 'amount' => 25000]);
        // Direct cost under its department.
        $res->assertJsonFragment(['category' => 'F&B cost of goods', 'dept' => 'F&B', 'amount' => 8000]);
        // Untagged/General expense → overhead; refunds → overhead line.
        $res->assertJsonFragment(['category' => 'Payroll', 'amount' => 12000]);
        $res->assertJsonFragment(['category' => 'Refunds', 'amount' => 1000]);

        $totals = $res->json('totals');
        $this->assertSame(165000, $totals['revenue']);       // 100000 + 40000 + 25000
        $this->assertSame(8000, $totals['directCosts']);
        $this->assertSame(157000, $totals['grossProfit']);   // 165000 - 8000
        $this->assertSame(13000, $totals['overhead']);       // 12000 + 1000 refund
        $this->assertSame(144000, $totals['netProfit']);     // 157000 - 13000
    }
```

- [ ] **Step 2: Run it to verify it fails**

Run: `C:\php84\php.exe artisan test --filter=test_departmental_pnl_maps_revenue_costs_and_overhead`
Expected: FAIL — route `/api/accounts/departmental` not defined (404 / method missing).

- [ ] **Step 3: Add the `departmentalPnl` method**

In `StatsController.php`, add this method (e.g. right after `accountsSummary`):

```php
    /**
     * GET /api/accounts/departmental — real Departmental P&L.
     * Revenue mapped to departments from the same sources as accountsSummary
     * (so totals reconcile); costs split by the account_entries.department tag,
     * with untagged/General expenses + refunds as overhead.
     */
    public function departmentalPnl(\Illuminate\Http\Request $request)
    {
        $from = $request->query('from');
        $to   = $request->query('to');

        $sumBetween = function ($query, string $col, string $amountCol) use ($from, $to) {
            if ($from) $query->where($col, '>=', $from);
            if ($to)   $query->where($col, '<=', $to);
            return (int) $query->sum($amountCol);
        };
        $applyRange = function ($query, string $col = 'date') use ($from, $to) {
            if ($from) $query->where($col, '>=', $from);
            if ($to)   $query->where($col, '<=', $to);
            return $query;
        };

        // ---- Revenue by department ----
        $autoNames = ['Room Revenue', 'Group Bookings', 'Hall Bookings', 'Banquet'];
        $revenue = [];
        $pushRev = function (string $category, string $dept, int $amount) use (&$revenue) {
            if ($amount > 0) $revenue[] = ['category' => $category, 'dept' => $dept, 'amount' => $amount];
        };
        $pushRev('Room Revenue', 'Rooms', $sumBetween(FolioPayment::query(), 'date', 'amount'));
        $pushRev('Group Bookings', 'Rooms', $sumBetween(GroupBooking::query(), 'createdAt', 'advance'));
        $pushRev('Hall Bookings', 'Banquet', $sumBetween(HallBooking::query(), 'date', 'advance'));
        $pushRev('Banquet', 'Banquet', $sumBetween(BanquetOrder::query(), 'date', 'advance'));

        $deptForCategory = function (string $cat): string {
            $c = strtolower($cat);
            if (str_contains($c, 'f&b') || str_contains($c, 'food') || str_contains($c, 'restaurant')) return 'F&B';
            if (str_contains($c, 'spa') || str_contains($c, 'wellness')) return 'Spa';
            return 'Other';
        };
        $incomeRows = $applyRange(AccountEntry::query()->where('type', 'income'))
            ->selectRaw('category, coalesce(sum(amount),0) as v')->groupBy('category')->get();
        foreach ($incomeRows as $r) {
            if (in_array($r->category, $autoNames, true)) continue; // superseded by live figures
            $pushRev($r->category ?: 'Other', $deptForCategory((string) $r->category), (int) $r->v);
        }

        // ---- Costs ----
        $deptSet = ['Rooms', 'F&B', 'Banquet', 'Spa', 'Other'];
        $directCosts = [];
        $overhead = [];
        $expRows = $applyRange(AccountEntry::query()->where('type', 'expense'))
            ->selectRaw('category, department, coalesce(sum(amount),0) as v')
            ->groupBy('category', 'department')->get();
        foreach ($expRows as $r) {
            $amt = (int) $r->v;
            if ($amt <= 0) continue;
            if (in_array($r->department, $deptSet, true)) {
                $directCosts[] = ['category' => $r->category ?: 'Other', 'dept' => $r->department, 'amount' => $amt];
            } else {
                $overhead[] = ['category' => $r->category ?: 'Other', 'amount' => $amt];
            }
        }
        $refunds = $sumBetween($applyRange(AccountEntry::query()->where('type', 'refund')), 'date', 'amount');
        if ($refunds > 0) $overhead[] = ['category' => 'Refunds', 'amount' => $refunds];

        $totalRevenue = array_sum(array_column($revenue, 'amount'));
        $totalDirect  = array_sum(array_column($directCosts, 'amount'));
        $totalOverhead = array_sum(array_column($overhead, 'amount'));
        $grossProfit = $totalRevenue - $totalDirect;

        return response()->json([
            'departments' => $deptSet,
            'revenue'     => array_values($revenue),
            'directCosts' => array_values($directCosts),
            'overhead'    => array_values($overhead),
            'totals' => [
                'revenue' => $totalRevenue, 'directCosts' => $totalDirect,
                'grossProfit' => $grossProfit, 'overhead' => $totalOverhead,
                'netProfit' => $grossProfit - $totalOverhead,
            ],
        ]);
    }
```

Note: `$sumBetween` is called with an already-range-applied query for refunds; applying the range twice is harmless (same bounds). Leave as written.

- [ ] **Step 4: Register the route**

In `hotel-pms-api/routes/api.php`, next to the existing `Route::get('/accounts/summary', ...)`, add:

```php
    Route::get('/accounts/departmental', [StatsController::class, 'departmentalPnl']);
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `C:\php84\php.exe artisan test --filter=DepartmentalPnlTest`
Expected: PASS (both tests).

- [ ] **Step 6: Commit**

```bash
git add hotel-pms-api/app/Http/Controllers/Api/StatsController.php hotel-pms-api/routes/api.php hotel-pms-api/tests/Feature/DepartmentalPnlTest.php
git commit -m "feat(accounts): real departmental P&L endpoint"
```

---

### Task 3: Frontend — Department picker on expense forms

**Files:**
- Modify: `luxe-pms/src/app/(app)/accounts/_components/new-expense-form.tsx`
- Modify: `luxe-pms/src/app/(app)/accounts/page.tsx` (the `EntryModal` component)

**Interfaces:**
- Produces: expense entries POSTed with a `department` field (one of `Rooms`/`F&B`/`Banquet`/`Spa`/`Other`/`General`). `Entry` type gains optional `department`.

- [ ] **Step 1: Add `department` to the `Entry` type**

In `luxe-pms/src/app/(app)/accounts/_data.ts`, find the `Entry` type/interface and add an optional field:

```ts
  department?: string;
```

- [ ] **Step 2: Add the picker to `NewExpenseForm`**

In `new-expense-form.tsx`, add the constant near `PAY_FROM` (top of file, ~line 10):

```tsx
const DEPARTMENTS = ["General", "Rooms", "F&B", "Banquet", "Spa", "Other"];
```

Add state next to the other `useState`s (~line 37):

```tsx
  const [department, setDepartment] = React.useState("General");
```

Add a Department field in the form body next to the Category field (use the existing `Field` + `Select` pattern already in this file):

```tsx
          <Field label="Department">
            <Select value={department} onChange={e => setDepartment(e.target.value)}>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </Select>
          </Field>
```

In the object passed to `onSubmit(...)` (the `Omit<Entry,"id">` payload), add `department` alongside `category`/`amount`/etc.

- [ ] **Step 3: Add the picker to `EntryModal` (expense only)**

In `accounts/page.tsx`, inside `EntryModal`, add state:

```tsx
  const [department, setDepartment] = React.useState("General");
```

Render a Department `<Select>` only for expenses, near the category field:

```tsx
        {type === "expense" && (
          <div className="space-y-1.5">
            <Label>Department</Label>
            <Select value={department} onChange={e => setDepartment(e.target.value)}>
              {["General", "Rooms", "F&B", "Banquet", "Spa", "Other"].map(d => <option key={d} value={d}>{d}</option>)}
            </Select>
          </div>
        )}
```

In the submit payload built by `EntryModal`, include `department: type === "expense" ? department : undefined`.

- [ ] **Step 4: Typecheck**

Run: `cd "luxe-pms" && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -cE "error TS"`
Expected: `0`

- [ ] **Step 5: Commit**

```bash
git add "luxe-pms/src/app/(app)/accounts/_components/new-expense-form.tsx" "luxe-pms/src/app/(app)/accounts/page.tsx" "luxe-pms/src/app/(app)/accounts/_data.ts"
git commit -m "feat(accounts): department picker on expense entry forms"
```

---

### Task 4: Frontend — PnlBsTab renders real departmental P&L

**Files:**
- Modify: `luxe-pms/src/app/(app)/accounts/_tabs/pnl-bs-tab.tsx`

**Interfaces:**
- Consumes: `GET /api/accounts/departmental` (Task 2 shape).
- Produces: the Departmental P&L Statement renders from real data; `PNL_REVENUE`/`PNL_DIRECT_COSTS`/`PNL_INDIRECT_COSTS` no longer used.

- [ ] **Step 1: Fetch the real departmental data**

At the top of `PnlBsTab`, add the type, state, and fetch (the `apiGet` import: add `import { apiGet } from "@/lib/api";`):

```tsx
  type DeptRow = { category: string; dept: string; amount: number };
  type DeptPnl = {
    departments: string[];
    revenue: DeptRow[];
    directCosts: DeptRow[];
    overhead: { category: string; amount: number }[];
    totals: { revenue: number; directCosts: number; grossProfit: number; overhead: number; netProfit: number };
  };
  const [dept, setDept] = React.useState<DeptPnl | null>(null);
  React.useEffect(() => {
    let cancelled = false;
    apiGet<DeptPnl>("/accounts/departmental").then(d => { if (!cancelled) setDept(d); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);
  const DEPTS = dept?.departments ?? ["Rooms", "F&B", "Banquet", "Spa", "Other"];
```

- [ ] **Step 2: Remove the mock-derived totals and imports**

Delete the lines computing `totalRevenue`, `totalDirect`, `grossProfit`, `totalIndirect`, `netProfit` from `PNL_*` (~lines 45-49). Remove `PNL_REVENUE, PNL_DIRECT_COSTS, PNL_INDIRECT_COSTS` from the `../_data` import (keep `BS_ASSETS`, `BS_LIABILITIES`, `EntryType`, `Entry`). Replace the deleted totals with values from `dept`:

```tsx
  const totalRevenue = dept?.totals.revenue ?? 0;
  const grossProfit = dept?.totals.grossProfit ?? 0;
  const netProfit = dept?.totals.netProfit ?? 0;
```

- [ ] **Step 3: Render the departmental table from real rows**

Replace the departmental table body (the `{subtab === "pnl" && (...)}` Card content that maps `PNL_REVENUE`/`PNL_DIRECT_COSTS`/`PNL_INDIRECT_COSTS`) so it maps the real arrays. A row places its amount under its `dept` column:

```tsx
              <tr><td colSpan={DEPTS.length + 2} className="pt-3 pb-1 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Revenue</td></tr>
              {(dept?.revenue ?? []).map((r, i) => (
                <tr key={`rev-${i}`} className="border-b border-border/40">
                  <td className="py-1.5 px-2">{r.category}</td>
                  {DEPTS.map(d => <td key={d} className="py-1.5 px-2 text-right tabular text-muted-foreground">{r.dept === d ? money(r.amount) : "—"}</td>)}
                  <td className="py-1.5 px-2 text-right tabular font-medium">{money(r.amount)}</td>
                </tr>
              ))}
              <tr className="border-t border-border font-semibold">
                <td className="py-1.5 px-2">Total Revenue</td>
                <td colSpan={DEPTS.length} />
                <td className="py-1.5 px-2 text-right tabular text-success">{money(totalRevenue)}</td>
              </tr>

              <tr><td colSpan={DEPTS.length + 2} className="pt-3 pb-1 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Direct Costs</td></tr>
              {(dept?.directCosts ?? []).map((r, i) => (
                <tr key={`dc-${i}`} className="border-b border-border/40">
                  <td className="py-1.5 px-2">{r.category}</td>
                  {DEPTS.map(d => <td key={d} className="py-1.5 px-2 text-right tabular text-muted-foreground">{r.dept === d ? money(r.amount) : "—"}</td>)}
                  <td className="py-1.5 px-2 text-right tabular">{money(r.amount)}</td>
                </tr>
              ))}
              <tr className="border-t border-border font-semibold bg-surface-sunken/30">
                <td className="py-2 px-2">Gross Profit</td>
                <td colSpan={DEPTS.length} />
                <td className="py-2 px-2 text-right tabular text-success text-base">{money(grossProfit)}</td>
              </tr>

              <tr><td colSpan={DEPTS.length + 2} className="pt-3 pb-1 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Overhead</td></tr>
              {(dept?.overhead ?? []).map((r, i) => (
                <tr key={`oh-${i}`} className="border-b border-border/40">
                  <td className="py-1.5 px-2">{r.category}</td>
                  <td colSpan={DEPTS.length} />
                  <td className="py-1.5 px-2 text-right tabular">{money(r.amount)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-foreground font-bold bg-success-soft/30">
                <td className="py-2.5 px-2">Net Profit (before tax)</td>
                <td colSpan={DEPTS.length} />
                <td className="py-2.5 px-2 text-right tabular text-success text-lg">{money(netProfit)}</td>
              </tr>
```

Update the table header to render the dept columns from `DEPTS` (so it stays in sync):

```tsx
                <th className="text-left py-2 px-2">Particulars</th>
                {DEPTS.map(d => <th key={d} className="text-right py-2 px-2">{d}</th>)}
                <th className="text-right py-2 px-2 font-semibold">Total</th>
```

Change the subtitle (~line 121) from "Budgeted departmental view · May 2026 · MYHOTEL — {name}" to:

```tsx
            <p className="text-xs text-muted-foreground">Live departmental view · MYHOTEL — {name}</p>
```

Add an empty state above the table when there's no data:

```tsx
          {dept && dept.revenue.length === 0 && dept.directCosts.length === 0 && dept.overhead.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-6">No posted entries yet for a departmental view.</p>
          )}
```

(Wrap the `<table>` so it only renders when there is data, or leave it — empty arrays render just the section headers + zero totals, which is acceptable.)

- [ ] **Step 4: Typecheck + build**

Run: `cd "luxe-pms" && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -cE "error TS"` → expect `0`
Run: `cd "luxe-pms" && NODE_OPTIONS=--max-old-space-size=3072 npm run build` → expect exit 0, all pages generated.

- [ ] **Step 5: Commit**

```bash
git add "luxe-pms/src/app/(app)/accounts/_tabs/pnl-bs-tab.tsx"
git commit -m "feat(accounts): departmental P&L renders real data, drop PNL mocks"
```

---

### Task 5: End-to-end verification

**Files:** none (verification only)

- [ ] **Step 1: Confirm the endpoint against the local backend**

```bash
BASE=http://127.0.0.1:8000/api
TOKEN=$(curl -s -X POST "$BASE/login" -H "Content-Type: application/json" -H "Accept: application/json" -d '{"email":"admin@hotel.com","password":"password123"}' | sed -E 's/.*"token":"([^"]+)".*/\1/')
curl -s "$BASE/accounts/departmental" -H "Authorization: Bearer $TOKEN" -H "Accept: application/json" | python -m json.tool
```
Expected: real `revenue` rows mapped to departments, `directCosts`/`overhead`, and `totals` with grossProfit/netProfit. Post an expense with `department: "F&B"` and confirm it appears under directCosts F&B.

- [ ] **Step 2: Browser**

Accounts → Profit & Loss → the Departmental P&L Statement reflects real entries; add an expense with a department in the form and see it land in the right column; subtitle reads "Live departmental view".

---

## Notes for the executor
- Read-model + one additive migration (`department`). After Task 4 builds, deploy-ready (push `main` → rsync → `migrate --force` runs the new column → frontend rebuild). Ask the user before deploying.
