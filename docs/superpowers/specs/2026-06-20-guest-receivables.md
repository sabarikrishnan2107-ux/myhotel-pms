# Real Guest Receivables — design

**Date:** 2026-06-20
**Status:** Approved (design)
**Part of:** "Make all Accounts tabs real" (sub-project 1 of 5).

## Problem
Accounts → Guest Receivables renders the hardcoded `RECEIVABLES` mock (agent/
corporate credit ledgers). Real outstanding money lives in `bookings` as a
per-booking `balance`. Make the tab show real receivables from booking balances.

## Reality of the data
`bookings` has `bookingNo`, `guestName`, `balance`, `checkOut`, `paymentStatus`,
`status`. There is **no** agent / corporate / credit-limit data on bookings, so the
real view is **guest-centric**, not agent-credit-centric. The mock's
credit-utilization column is dropped (no data backs it).

## Backend
New `GET /accounts/receivables` (StatsController, sanctum). Source: `bookings`
where `balance > 0` AND `status <> 'cancelled'`. Each booking's due date = its
`checkOut`; `ageDays = max(0, today − checkOut)`. Bucket each booking's balance:
- **current**: not overdue (`checkOut >= today`, i.e. ageDays = 0)
- **d1_30**: ageDays 1–30
- **d31_60**: ageDays 31–60
- **d60plus**: ageDays > 60

Aggregate per guest (`guestName`). Response:
```json
{
  "rows": [
    { "guest": "Neha Rao", "bookings": 1, "current": 0, "d1_30": 0, "d31_60": 54000, "d60plus": 0, "total": 54000, "oldestDue": "2026-05-28" }
  ],
  "totals": { "total": 902025, "current": 0, "d1_30": 0, "d31_60": 0, "d60plus": 0, "accounts": 47 }
}
```
- Rows sorted by `total` desc. Dates compared as `YYYY-MM-DD` strings (lexicographic
  works); `today` from `now()->toDateString()`. `oldestDue` = min checkOut among the
  guest's unpaid bookings.

## Frontend
`ReceivablesTab` fetches `/accounts/receivables` and renders real rows. Column
changes (guest-centric):
- Columns: **Guest** (name · N bookings · oldest due) · **Current** · **1–30d** ·
  **31–60d** · **60+** · **Total** · **Action**.
- Drop the **Credit utilization** column and `creditLimit` logic (no backing data).
- KPIs: Total receivables, Current, **>60 days** (= d60plus), **Guests** (accounts count).
- Keep the Statement (download JSON) + Remind (toast) actions, populated from the
  real row (aging map, total, oldestDue).
- Remove the `RECEIVABLES` mock import; render an empty state when no rows.

## Out of scope
- Agent/corporate credit ledgers and credit limits (no data model).
- Real reminder emails / statement PDFs (Remind stays a toast; Statement stays a
  client-side JSON download).

## Verification
- Backend feature test: seed bookings with balances at varying checkOut ages +
  a cancelled one; assert bucketing, per-guest aggregation, totals, and that
  cancelled / zero-balance bookings are excluded.
- Frontend: `tsc` clean; build passes; tab shows real outstanding totals
  (≈₹902,025 locally) instead of the mock.
