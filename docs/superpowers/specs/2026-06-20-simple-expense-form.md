# Simple, professional "New expense" form

**Date:** 2026-06-20
**Status:** Approved design, pending spec review

## Problem

The "New expense" entry form (`FullScreenExpenseForm` in
[luxe-pms/src/app/(app)/accounts/page.tsx](../../../luxe-pms/src/app/(app)/accounts/page.tsx),
~lines 1984–2445) is a full-screen, 9-section enterprise form with ~30 fields:
voucher #, property/department/cost center, place of supply, GSTIN, PAN, reverse
charge (RCM), inter-state, a multi-line item grid (description/HSN-SAC/qty/rate/
GST%/taxable/tax/amount), CGST/SGST/IGST, discount/freight/round-off/TDS,
approval workflow, recurring schedule, attachments, notes. A hotel manager just
trying to record "₹4,200 electricity bill" is overwhelmed.

Saving an expense actually only requires: **date, payee, category, amount,
payment method** (see `handleSubmit` → `Omit<Entry,"id">`, posted to
`/account-entries`).

## Goal

Replace the full-screen form with **one clean, focused dialog** that captures the
essentials by default, with tax/invoice details available behind an optional
collapsible. Simple for everyday use, professional in appearance.

## Scope

- **In scope:** the expense *entry* form only (the dialog opened by the "Expense"
  / "Add Expense" buttons, i.e. `showExpenseFull`).
- **Out of scope:**
  - The Expenses *list/table* and Day Book view — unchanged.
  - The "+ Income" path (`EntryModal`) — unchanged.
  - No backend or database change — the new form posts the same `Entry` shape to
    `/account-entries`.

## Design

A centered modal dialog (`max-w-xl`, scrollable), not full-screen — lighter and
more focused. No left section-nav, no totals rail.

### Default fields (7)

| Field | Maps to `Entry` | Notes |
|---|---|---|
| Date *            | `date`                 | defaults to today |
| Payee *           | `vendor`               | e.g. DEWA, ABC Linens |
| Category *        | `category`             | from `expenseCats` |
| Amount (₹) *      | `amount`               | the total paid; single number, no line grid |
| Paid by           | `mode`                 | Cash / Card / Bank / UPI |
| Paid from         | `ref` prefix / display | account from `PAY_FROM_ACCOUNTS` |
| Note (optional)   | `description`          | falls back to `category` if blank |
| Attach receipt    | `attachment`           | optional, single file (data URL) |

`type` is always `"expense"`.

### Optional collapsible: "Add VAT / invoice details" (hidden by default)

| Field | Maps to `Entry` | Notes |
|---|---|---|
| Invoice no       | `ref`        | overrides the paid-from-derived ref |
| Invoice date     | (display)    | not separately persisted |
| VAT amount (₹)   | `igst`       | defaults to 5% of Amount, editable; stored as the single VAT tax amount (`cgst`/`sgst` left 0). No schema change. |
| Vendor Tax ID    | `gstin`      | optional |

Plain VAT language throughout — **no** GSTIN/PAN/RCM/inter-state/CGST/SGST/
HSN-SAC/place-of-supply wording.

### Dropped entirely

voucher #, property/department/cost center, multi-line item grid (qty/rate/HSN/
GST% per line), discount/freight/round-off, TDS, approval workflow, recurring
schedule, vendor address, sub-category, CGST/SGST/IGST split.

### Validation

Save enabled when **Payee** is non-empty and **Amount > 0**. A small inline hint
shows what's missing (e.g. "Enter a payee and amount"). Esc cancels.

## Data flow (unchanged contract)

`onSubmit(entry, addAnother)` produces:
```
{ date, type: "expense", category, vendor, description: note || category,
  amount, mode, ref: invoiceNo || `${paidFrom}`,            // existing fields
  gstin?, igst?, cgst: 0, sgst: 0,                          // only if VAT section used
  attachment? }
```
The page's existing `handleAdd` posts this to `/account-entries` exactly as today.
`PaymentVoucherModal` still renders the saved entry (its tax line, if shown,
should read "VAT" rather than "IGST" — a one-line copy tweak).

## Code structure

- Create `luxe-pms/src/app/(app)/accounts/_components/new-expense-form.tsx`
  exporting `NewExpenseForm({ expenseCats, onClose, onSubmit })` with the same
  prop signature the page already calls (`onSubmit: (entry, addAnother) => void`),
  so the page wiring (`showExpenseFull`) is unchanged except the import + tag name.
- Remove `FullScreenExpenseForm` and the helpers/consts that become unused after
  its removal (`Section`, `CheckRow`, `SECTIONS`, and any of
  `COST_CENTERS`/`PROPERTIES`/`DEPARTMENTS`/`TDS_SECTIONS`/`APPROVERS` no longer
  referenced — verify each with a usage search before deleting; keep
  `PAY_FROM_ACCOUNTS` since the new form reuses it).
- `Field` helper: reuse the existing one (keep it; used elsewhere too — verify).

## Success criteria

- Clicking "Expense" / "Add Expense" opens the new compact dialog (not the
  full-screen 9-section form).
- Default view shows only the 7 essentials; tax/invoice fields are hidden until
  "Add VAT / invoice details" is expanded.
- Saving with just Date + Payee + Category + Amount + Paid by works and the entry
  appears in the expenses list / day book.
- Saving with VAT details persists VAT amount + vendor tax id + invoice no on the
  entry (no schema change).
- No GST/PAN/RCM/HSN/TDS/cost-center wording remains in the form.
- `npx tsc --noEmit`, `npm run lint`, and `npm run build` pass; no dead/unused
  symbols left behind.

## Testing

- Manual: open the form, save a minimal expense, confirm it lists; expand VAT
  details, save, confirm VAT/vendor-tax-id/invoice persisted (check the day book
  entry and the voucher print).
- Build/lint/typecheck green.
