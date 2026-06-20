# Accounts auto-income from bookings — design

**Date:** 2026-06-20
**Status:** Approved (design)

## Problem

The Accounts page **Income** figure is the sum of manually-typed ledger entries
(`account_entries` where `type = 'income'`). It does not move when real revenue
comes in through room bookings, group bookings, hall bookings, or banquet
orders. The hotel wants Income to update automatically as that money is received.

## Decisions (settled with the user)

- **Basis:** cash-basis — income counts money **actually received**, not the full
  booked/contract value.
- **Sources:** Room bookings, Group bookings, Hall bookings, Banquet orders.
- **Approach:** live read-model (Approach A) — aggregate on read; no new tables,
  no auto-posted ledger rows, no idempotency/backfill machinery.

## Data sources (verified against the live schema)

| Category       | Source                       | Amount (cash received)        | Date field used for range |
|----------------|------------------------------|-------------------------------|---------------------------|
| Room Revenue   | `folio_payments`             | `Σ amount`                    | `folio_payments.date`     |
| Group Bookings | `group_bookings`             | `Σ advance`                   | `group_bookings.createdAt`|
| Hall Bookings  | `hall_bookings`              | `Σ advance`                   | `hall_bookings.date`      |
| Banquet        | `banquet_orders`             | `Σ advance`                   | `banquet_orders.date`     |

Notes:
- `folio_payments` is the canonical record of cash collected per stay (110 rows
  in the current DB); it is used for room revenue rather than `bookings.advance`
  to avoid double counting and to reflect actual collections.
- Group/hall/banquet have no separate payments table, so the `advance` column is
  the received-cash figure. (Balance/total are *not* counted — that would be
  accrual, which we explicitly excluded.)
- Date fields differ per table because there is no dedicated "advance received
  on" timestamp; the booking's own date is a reasonable proxy for range filters.
  When no `from`/`to` is supplied (the headline case), all rows are summed.

## Double-counting rule

The 4 computed categories are **authoritative**. The category names are exactly:
`Room Revenue`, `Group Bookings`, `Hall Bookings`, `Banquet`.

When merging with manual `account_entries` income:
- Any manual income entry whose `category` matches one of these 4 names is
  **dropped** from the income breakdown (the live figure supersedes it).
- Manual income in any **other** category (e.g. `F&B`, misc) is kept and added.

This prevents the existing illustrative manual rows (e.g. "Room Revenue ₹10,335",
"Hall Rental ₹6,500") from being added on top of the live booking revenue.

## Backend changes

**File:** `app/Http/Controllers/Api/StatsController.php` — method `accountsSummary`.

1. Keep the existing manual-entry aggregation for `expense` and `recent` unchanged.
2. Compute the 4 booking-revenue categories, honoring the same optional
   `from`/`to` query params already supported by the endpoint (each table filtered
   on its own date column from the table above; no filter ⇒ sum everything).
3. Build the income breakdown as:
   - the 4 computed categories (only those with `value > 0` are included), plus
   - manual income categories that are **not** one of the 4 authoritative names.
4. Sort income categories by `value` descending (matches current behavior).
5. Add `incomeTotal` (int) to the JSON response = sum of the merged income
   category values. Existing keys (`income`, `expense`, `recent`) keep their
   current shape; `income` now contains the merged list.

Resulting response shape:

```json
{
  "income": [ { "category": "Banquet", "value": 1900000 }, ... ],
  "incomeTotal": 3682480,
  "expense": [ ... ],
  "recent": [ ... ]
}
```

(`incomeTotal` example = folio 1,644,535 + banquet adv 1,900,000 + group adv
118,600 + hall adv 16,500 + kept manual `F&B` 2,845 = 3,682,480. The manual
"Room Revenue" 10,335 and "Hall Rental" 6,500 are dropped as collisions.)

## Frontend changes

**File:** `src/app/(app)/accounts/page.tsx`.

1. Extend the `summary` state type with `incomeTotal: number`.
2. Income KPI: replace `const income = entries.length ? sumByType("income") : seedIncome;`
   so it prefers the authoritative value:
   `const income = summary ? summary.incomeTotal : (entries.length ? sumByType("income") : seedIncome);`
   This single `income` value already flows into the Income KPIs, VAT
   (`income * 0.05`), profit, and margin — so they all update together.
3. The income breakdown chart/list already reads `summary.income`; the 4 booking
   categories appear automatically with no further change.
4. Expenses, refunds, recent-transactions, and all other tabs are untouched.

## Out of scope

- Auto-posting individual journal/day-book rows per payment (Approach B).
- Accrual revenue, receivables/outstanding balances.
- F&B/Restaurant POS as an income source (not requested).
- Non-dashboard tabs (Income/Expenses/P&L/Cash Flow/Vendor/Receivables/VAT/Reports)
  beyond what already reads from `summary` — only the **Dashboard** tab is in scope
  for the real-data + UI pass.

(Note: the "P&L trend / cash trend remain illustrative" exclusion from the original
narrow spec is **superseded** by the Dashboard expansion section above — those charts
are now real.)

## Dashboard expansion (added 2026-06-20 — "all real, no hardcoded, better UI")

The whole Accounts **Dashboard** tab must run on real data and get an honest UI
pass. All aggregations are folded into the existing `GET /api/accounts/summary`
so the page makes one fetch.

### Additional backend output (same `accountsSummary` method)

- `monthlyTrend`: last 6 calendar months, `[{ month: "Jan", income, expense }]`.
  - `income` per month = Σ folio_payments.amount (by `date`) + Σ group/hall/banquet
    `advance` (by their date columns) + manual income entries (by `date`) whose
    category is **not** one of the 4 authoritative names (same de-dup rule).
  - `expense` per month = Σ account_entries where `type IN ('expense','refund')` (by `date`).
  - Month bucket key = `substr(date,1,7)` (`YYYY-MM`); label = short month name.
- `cashTrend`: last 30 days, `[{ day: "1".."30", balance }]` where `balance` is the
  **cumulative net cash movement** over the window: running sum of (daily inflows −
  daily outflows). Inflows = folio_payments + advances + manual income that day;
  outflows = expenses + refunds that day. Starts at 0 on day −29. (Honest label:
  this is net cash movement, not a bank balance.)

These two windows are fixed (6 months / 30 days) and ignore the `from`/`to` params.

### Frontend dashboard changes (`accounts/page.tsx`)

- Income vs Expense chart: data `= summary.monthlyTrend` (was `PL_TREND`).
- Cash trend chart: data `= summary.cashTrend` (was `CASH_FLOW`); card title →
  "Net Cash Movement — last 30 days"; **remove** the fake "AI projection enabled" badge.
- KPI deltas: compute real month-over-month % from `monthlyTrend` (last vs prev
  month) for Income, Expense, Net Profit — replacing the hardcoded `4.9 / -2.7 / 8.4`.
- "+8.4% MoM profit" badge → real computed MoM profit % (tone success/danger by sign).
- Remove all mock fallbacks and imports: `PL_TREND`, `CASH_FLOW` (from `_data`),
  `INCOME_BREAKDOWN`, `EXPENSE_BREAKDOWN`, `RECENT_TXN` (from `mock-data-ext`),
  and the `seedIncome`/`seedExpense` fallbacks. Charts/lists render real data or a
  clean empty state.
- UI polish (conservative, within the existing design system): consistent KPI card
  hints, ensure empty states for charts, keep spacing/typography aligned with the
  rest of the app. No radical redesign.

### Double-count consistency

`monthlyTrend.income` and `cashTrend` inflows use the **same** de-dup rule as
`incomeTotal` (the 4 authoritative booking categories supersede manual rows of the
same name), so headline Income and the trend agree.

## Testing / verification

- Backend: with no range, `incomeTotal` ≈ Σ(folio_payments) + Σ(group/hall/banquet
  advances) + non-overlapping manual income. Verify via the API with a minted
  token; confirm the 4 categories appear and manual "Room Revenue"/"Hall Rental"
  are not double-counted.
- Frontend: `tsc --noEmit` clean; production build passes; Income KPI reflects the
  new total and the breakdown shows the booking categories.
