# Real VAT Report — design

**Date:** 2026-06-20
**Status:** Approved (design)
**Part of:** "Make all Accounts tabs real" (sub-project 3 of 5).

## Problem
The VAT tab shows real-ish Output VAT (income×5%) but hardcoded Input VAT (₹28,400),
a hardcoded ITC ledger, and a mock GSTR returns tracker (`GSTR_RETURNS`) with no
backing model. Make the VAT numbers and ITC ledger real; honestly handle the
unbacked pieces.

## Reality of the data
- Output VAT: derive from real income (the page already has real `income` from
  `/accounts/summary`). Convention in this app: 5% of income.
- Input VAT / ITC: `account_entries` already has `cgst`, `sgst`, `igst` columns on
  expense entries (the New Expense form captures them). Real input VAT = Σ those.
  **Currently ₹0** (no expense has VAT filled in yet) — that's the honest real value;
  it grows as VAT-tagged expenses are entered.
- GSTR returns tracker + TDS: **no backing model** — cannot be made real here.

## Backend
New `GET /accounts/vat` (StatsController, sanctum), optional `from`/`to`:
- `taxableIncome` = Σ income `account_entries` + booking cash (reuse the same income
  basis as `accountsSummary`'s `incomeTotal`).  (Simplest correct: call the same
  income aggregation already used; if reuse is awkward, `taxableIncome` = `incomeTotal`
  computed identically.)
- `outputVat` = round(taxableIncome × 0.05).
- `itcBySource` = expense `account_entries` grouped by `category`, each with
  `{ category, cgst, sgst, igst, total }` (only rows where cgst+sgst+igst > 0).
- `inputVat` = Σ all (cgst+sgst+igst) on expenses.
- `netVat` = outputVat − inputVat.
Response:
```json
{ "taxableIncome": 0, "outputVat": 0, "inputVat": 0, "netVat": 0,
  "itcBySource": [{ "category": "F&B cost of goods", "cgst": 0, "sgst": 0, "igst": 0, "total": 0 }] }
```

## Frontend (`accounts/page.tsx`, the `tab === "vat"` block)
- Fetch `/accounts/vat` (add state + `apiGet` in the page; the page already uses apiGet).
- KPIs: **Output VAT** = `vat.outputVat`, **Input VAT (recoverable)** = `vat.inputVat`,
  **Net VAT Payable** = `vat.netVat`. (TDS KPI: keep but relabel hint "illustrative" OR
  leave — it has no real source; do NOT claim it's real. Keep value but mark it.)
- **ITC Ledger** table: render from `vat.itcBySource` (category rows with CGST/SGST/IGST/
  Total) + a real total footer = `vat.inputVat`. Remove the hardcoded inline array and
  the `money(28400)`/`money(11800)` literals.
- **GSTR Returns Tracker**: replace the `GSTR_RETURNS.map(...)` body with an empty state
  row: "No filed returns recorded yet." Remove the `GSTR_RETURNS` import/usage. (Keep the
  card + Download-JSON button; it just has no rows.)
- **AI Tax Reminder** AIInsight: feed it the real `vat.netVat`/`vat.inputVat` instead of
  `income*0.05 - 28400` / `28400`. (Keep the panel.)
- The "VAT Summary by Source" table (below ITC ledger), if it uses `income*0.05`
  literals, point its output-VAT figure at `vat.outputVat`; leave structural labels.

## Out of scope
- GSTR e-filing integration / returns model (tracker stays an empty state).
- TDS computation (no source; KPI left as illustrative, not claimed real).

## Verification
- Backend feature test: seed income entries + an expense with cgst/sgst/igst; assert
  outputVat = round(income×0.05), inputVat = Σ tax, netVat, and itcBySource row.
- Frontend: `tsc` 0; build passes; VAT KPIs/ITC ledger reflect real data (input ₹0
  until a VAT-tagged expense exists), GSTR tracker shows the empty state.
