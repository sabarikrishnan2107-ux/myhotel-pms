# Accounts page — usability redesign

**Date:** 2026-06-19
**Status:** Approved design, pending spec review

## Problem

The current `/accounts` page ([luxe-pms/src/app/(app)/accounts/page.tsx](../../../luxe-pms/src/app/(app)/accounts/page.tsx))
is a single 4,145-line file with **12 tabs** (Overview, Day Book, Expenses, Income,
Statements, Bank Reconcile, Payables, Receivables, P&L / BS, Journal, Cashier
Summary, GST & Tax). It contains all the right data but is hard to understand —
too many tabs, jargon-y labels, and no guidance on what each section is for.

## Goal

Make the existing page **user-friendly and easy to understand**, reorganized
around the 9 plain-language sections the user wants (from a reference design):

1. Dashboard
2. Income
3. Expenses
4. Profit & Loss
5. Cash Flow
6. Vendor Payments
7. Guest Receivables
8. VAT Report
9. Reports

## Scope

- **In scope:** Frontend reorganization of the single `/accounts` page only.
- **Out of scope (explicitly):**
  - No new routes / pages — it stays one page.
  - No sidebar change — the existing single "Accounts" link stays as-is.
  - No backend or database changes — reuse all existing data and endpoints
    (`/account-entries`, `/accounts/summary`).

## Approach

Pragmatic in-place refactor. Reduce 12 tabs → 9, folding the extra tabs into the
closest of the 9 so **nothing is lost**:

| New tab (the 9) | Built from existing tab content |
|---|---|
| Dashboard        | Overview |
| Income           | Income |
| Expenses         | Expenses + Day Book |
| Profit & Loss    | P&L / BS + Journal |
| Cash Flow        | Statements + Bank Reconcile |
| Vendor Payments  | Payables |
| Guest Receivables| Receivables |
| VAT Report       | GST & Tax (relabelled to VAT) |
| Reports          | Cashier Summary + export buttons |

### Usability improvements (the actual point)

- **Plain labels** — the 9 names above replace the current jargon.
- **One-line purpose hint** at the top of each tab (e.g. Cash Flow → "Money in
  and out of your bank and cash accounts this month").
- **Clear visual hierarchy** — consistent card/table/section styling, less
  clutter, group related content under labelled sub-headings.
- **Tab order** matches the 9-item list (overview/dashboard first).
- Keep the existing KPI row and AI insight panel at the top (they orient the user).

### Code-quality improvements (in service of the goal)

The 4,145-line single file is itself a source of confusion. While reorganizing:

- Extract each of the 9 tab bodies into its own focused component under
  `src/app/(app)/accounts/_tabs/` (e.g. `dashboard-tab.tsx`, `income-tab.tsx`, …).
- Move the large seed/data constants and shared types into
  `src/app/(app)/accounts/_data.ts`.
- `page.tsx` becomes a thin shell: header + KPI row + tab switcher that renders
  the active tab component.

This keeps each file small and understandable without changing behavior or data.

## Data flow (unchanged)

- Live data still comes from `apiGet('/account-entries')` and
  `apiGet('/accounts/summary')`; the static demo constants remain the fallback,
  exactly as today.
- Add-income / add-expense modals still `POST /account-entries` as they do now.

## Success criteria

- `/accounts` shows exactly 9 tabs with the plain-language names, in order.
- Every piece of data/functionality from the old 12 tabs is reachable within the 9.
- Each tab has a short purpose hint and consistent styling.
- `page.tsx` is a thin shell; tab content lives in per-tab components.
- No sidebar, route, backend, or DB changes. App builds and the page works against
  the existing API.

## Testing

- Manual: load `/accounts`, click through all 9 tabs, confirm content is present
  and readable; add an income and an expense entry and confirm they post and appear.
- Build: `npm run build` (or lint) passes in `luxe-pms`.
