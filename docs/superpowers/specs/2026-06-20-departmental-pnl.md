# Real Departmental P&L — design

**Date:** 2026-06-20
**Status:** Approved (design)

## Problem
The Accounts → Profit & Loss tab's **Departmental P&L Statement** is hardcoded
mock (`PNL_REVENUE`, `PNL_DIRECT_COSTS`, `PNL_INDIRECT_COSTS` in `accounts/_data.ts`).
Make it real: revenue and costs by department, computed from live data. (The
"Actual P&L · from day-book" card above it is already real and stays unchanged.)

## Decisions (approved)
- **Departments:** `Rooms`, `F&B`, `Banquet`, `Spa`, `Other`, plus `General`
  (overhead — costs not tied to a revenue department).
- **Full departmental costs:** expenses get a `department` tag (new field + picker).
- Out of scope: the **Balance Sheet** subtab (separate larger build, unchanged);
  back-tagging historical expenses (they show under `General` until edited).

## Data model
- **Migration:** add nullable `department` (string, max 50) to `account_entries`.
- **Validation:** add `'department' => 'string|max:50|nullable'` to the
  `account-entries` schema in `ResourceController`.
- No model cast needed (plain string).

## Revenue → department mapping (reconciles with the dashboard `incomeTotal`)
Uses the **same** real income sources as `accountsSummary`, so Total Revenue here
equals the dashboard's income:
- Room folio payments (`folio_payments.amount`) → **Rooms**
- `group_bookings.advance` → **Rooms**
- `hall_bookings.advance` + `banquet_orders.advance` → **Banquet**
- Manual `account_entries` income (categories NOT among the 4 authoritative names
  `Room Revenue`/`Group Bookings`/`Hall Bookings`/`Banquet`), mapped by category:
  - category containing `F&B`/`Food`/`Restaurant` (case-insensitive) → **F&B**
  - category containing `Spa`/`Wellness` → **Spa**
  - everything else → **Other**

## Costs
- **Direct costs:** `account_entries` of type `expense` whose `department` is one
  of Rooms/F&B/Banquet/Spa/Other → grouped by (category, department).
- **Overhead:** `account_entries` type `expense` with `department` null/empty/`General`
  → total-only rows by category.
- **Refunds:** sum of type `refund` entries → a single `Refunds` line in overhead
  (department-agnostic), so Net reconciles with the Actual P&L definition
  (income − refunds − expense).

## Backend endpoint
`GET /accounts/departmental` (sanctum), optional `from`/`to` (default: all-time).
Response:
```json
{
  "departments": ["Rooms","F&B","Banquet","Spa","Other"],
  "revenue":     [{ "category": "Room Revenue", "dept": "Rooms", "amount": 1644535 }],
  "directCosts": [{ "category": "Linen", "dept": "Rooms", "amount": 38000 }],
  "overhead":    [{ "category": "Payroll", "amount": 800 }, { "category": "Refunds", "amount": 0 }],
  "totals": { "revenue": 0, "directCosts": 0, "grossProfit": 0, "overhead": 0, "netProfit": 0 }
}
```
- `grossProfit = revenue − directCosts`; `netProfit = grossProfit − overhead`
  (overhead total includes the Refunds line).
- Rows with `amount = 0` are omitted.
- Implemented in `StatsController` (new method `departmentalPnl`), reusing the
  income aggregation helpers from `accountsSummary`.

## Frontend
- **Expense entry forms** — add a **Department** `<Select>` (Rooms/F&B/Banquet/Spa/
  Other/General; default `General`) to BOTH expense paths, included in the POSTed
  entry payload:
  - `accounts/_components/new-expense-form.tsx` (the full "New expense" dialog).
  - `EntryModal` in `accounts/page.tsx` — only when `type === "expense"` (income
    entries don't get a department; departmental revenue is derived, not tagged).
- **PnlBsTab** (`accounts/_tabs/pnl-bs-tab.tsx`): fetch `/accounts/departmental`
  via `apiGet` on mount; render the departmental table (revenue rows, direct-cost
  rows by dept column, overhead total-only rows, gross/net totals) from that real
  data instead of the `PNL_*` mocks. Remove the `PNL_REVENUE`/`PNL_DIRECT_COSTS`/
  `PNL_INDIRECT_COSTS` imports/usage. Title: drop "Budgeted" → "Departmental P&L
  Statement · <period>". Empty state when no data.

## Verification
- Backend: feature test on `/accounts/departmental` — seed folio payment + a
  department-tagged expense + an untagged expense + a refund; assert revenue maps
  to the right dept, direct cost under its dept, untagged under overhead, refunds
  line present, and totals (gross/net) correct.
- Frontend: `tsc` clean; production build passes; manually verify the statement
  reflects real entries and a newly added department-tagged expense appears in its
  column.
