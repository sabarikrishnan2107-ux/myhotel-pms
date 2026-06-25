# Accounts Usability Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize the single `/accounts` page from 12 jargon-y tabs into 9 plain-language, easy-to-understand sections, losing no existing data or functionality.

**Architecture:** In-place refactor of one Next.js page. Reduce the tab set to 9; fold the extra tabs into the closest of the 9 using a secondary sub-toggle so nothing is lost; add a one-line "what this is for" hint to every tab; then split the 4,144-line file into a thin shell + per-tab components + a shared data module for maintainability. No routing, sidebar, backend, or database changes.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind, recharts, lucide-react. Existing UI kit in `src/components/ui/*`. Data via `apiGet`/`apiPost` from `src/lib/api.ts`.

## Global Constraints

- Single page only — file: `luxe-pms/src/app/(app)/accounts/page.tsx`. No new routes/pages.
- No sidebar change — leave `src/lib/nav.ts` and `src/components/shell/sidebar.tsx` untouched.
- No backend or database change — reuse `GET /account-entries`, `GET /accounts/summary`, `POST /account-entries` exactly as today.
- Currency stays `money()` (₹); VAT stays 5%. (`money()` lives in `src/lib/utils.ts`.)
- This version of Next.js has breaking changes — per `luxe-pms/AGENTS.md`, consult `node_modules/next/dist/docs/` before using any Next API. (This plan touches no Next API beyond what the file already uses.)
- Verification per task = TypeScript typecheck + `next build` + manual click-through. There is no React component-test harness; do NOT invent UI unit tests. vitest is only for extracted pure functions.
- Preserve all existing behavior: live data fetch + static fallback, add-income/add-expense modals, all tables/charts.

**Working directory for all commands:** `luxe-pms/`

**Reusable verify commands (referenced as "VERIFY-BUILD" below):**
```bash
cd luxe-pms
npx tsc --noEmit
npm run build
```
Expected: tsc prints nothing (exit 0); build completes with "Compiled successfully" and lists `/accounts` in the route output. If `next build` is too slow in your environment, `npx tsc --noEmit && npm run lint` is an acceptable substitute gate, but a full build must pass before the final commit (Task 8).

---

## Reference: current tab inventory (page.tsx)

| Old tab id | Kind | Location |
|---|---|---|
| `overview`   | inline JSX | lines 490–730 |
| `daybook`    | inline JSX | lines 733–788 |
| `expenses`   | inline JSX | lines 791–896 |
| `income`     | inline JSX | lines 899–932 |
| `statements` | inline IIFE | lines 935–1295 |
| `tax`        | inline JSX | lines 1298–1453 |
| `bank`       | `<BankReconcileTab/>` | line 1483, component at 2156 |
| `payable`    | `<PayablesTab/>` | line 1484, component at 2268 |
| `receivable` | `<ReceivablesTab/>` | line 1485, component at 2354 |
| `pnl`        | `<PnlBsTab entries={entries}/>` | line 1486, component at 2445 |
| `journal`    | `<JournalTab/>` | line 1487, component at 2698 |
| `cashier`    | `<CashierTab/>` | line 1488, component at 2828 |

**Target 9 tabs and their composition:**

| New id | Label | Hint (one line) | Composed from |
|---|---|---|---|
| `dashboard` | Dashboard | "Your money at a glance — income, expenses, profit and cash position this month." | `overview` |
| `income` | Income | "Every payment coming in, broken down by source." | `income` |
| `expenses` | Expenses | "Every payment going out, with bills, categories and the full day book." | `expenses` + `daybook` |
| `profitloss` | Profit & Loss | "What you earned minus what you spent — plus balance sheet and journal." | `pnl` + `journal` |
| `cashflow` | Cash Flow | "Money moving through your bank and cash accounts, and reconciliation." | `statements` + `bank` |
| `vendor` | Vendor Payments | "Bills you owe suppliers, due dates and payment status." | `payable` |
| `receivables` | Guest Receivables | "Money guests, agents and companies still owe you." | `receivable` |
| `vat` | VAT Report | "VAT you've collected and paid, and your filing status." | `tax` |
| `reports` | Reports | "Download statements and summaries, and review cashier shifts." | `cashier` + export buttons |

Tabs that merge two sources (`expenses`, `profitloss`, `cashflow`, `reports`) get a small **segmented sub-toggle** at the top of the tab to switch between the folded views.

---

## Task 1: Swap to the 9-tab model with hints (single-source tabs first)

Deliver the new tab bar, labels, order, default tab, and per-tab hint banner. Wire the 5 tabs that map 1:1 (`dashboard`, `income`, `vendor`, `receivables`, `vat`). Merged tabs are wired in Tasks 2–4; until then they may render only their primary view — that is acceptable mid-plan but every old tab's content must still be reachable by Task 4.

**Files:**
- Modify: `luxe-pms/src/app/(app)/accounts/page.tsx`

**Interfaces:**
- Produces: `TABS` array of `{ id: TabId; label: string; hint: string }`; `TabId` union `"dashboard" | "income" | "expenses" | "profitloss" | "cashflow" | "vendor" | "receivables" | "vat" | "reports"`; component `TabHint({ children }: { children: React.ReactNode })`.

- [ ] **Step 1: Replace the `TABS` constant and `TabId` type** (currently lines 34–48).

```tsx
const TABS = [
  { id: "dashboard",   label: "Dashboard",         hint: "Your money at a glance — income, expenses, profit and cash position this month." },
  { id: "income",      label: "Income",            hint: "Every payment coming in, broken down by source." },
  { id: "expenses",    label: "Expenses",          hint: "Every payment going out, with bills, categories and the full day book." },
  { id: "profitloss",  label: "Profit & Loss",     hint: "What you earned minus what you spent — plus balance sheet and journal." },
  { id: "cashflow",    label: "Cash Flow",         hint: "Money moving through your bank and cash accounts, and reconciliation." },
  { id: "vendor",      label: "Vendor Payments",   hint: "Bills you owe suppliers, due dates and payment status." },
  { id: "receivables", label: "Guest Receivables", hint: "Money guests, agents and companies still owe you." },
  { id: "vat",         label: "VAT Report",        hint: "VAT you've collected and paid, and your filing status." },
  { id: "reports",     label: "Reports",           hint: "Download statements and summaries, and review cashier shifts." },
] as const;
type TabId = typeof TABS[number]["id"];
```

- [ ] **Step 2: Change the default tab** — line 375, `React.useState<TabId>("overview")` → `React.useState<TabId>("dashboard")`.

- [ ] **Step 3: Add the `TabHint` helper component** just above `export default function AccountsPage()` (before line 374).

```tsx
function TabHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm text-muted-foreground -mt-1">{children}</p>
  );
}
```

- [ ] **Step 4: Render the active tab's hint** directly under the tab bar. After the tab bar's closing `</div>` (currently line 487), insert:

```tsx
      {/* One-line description of the active section */}
      <TabHint>{TABS.find(t => t.id === tab)?.hint}</TabHint>
```

- [ ] **Step 5: Re-key the 1:1 tab blocks to their new ids.** In the render body change these conditionals:
  - `{tab === "overview" && (` → `{tab === "dashboard" && (` (line 490)
  - `{tab === "income" && (` stays (line 899)
  - `{tab === "tax" && (` → `{tab === "vat" && (` (line 1298)
  - `{tab === "payable" && <PayablesTab ... />}` → `{tab === "vendor" && <PayablesTab onToast={showToast} />}` (line 1484)
  - `{tab === "receivable" && <ReceivablesTab ... />}` → `{tab === "receivables" && <ReceivablesTab onToast={showToast} />}` (line 1485)
  - Update the `AIInsight` action on line 469 `onClick: () => setTab("daybook")` → `onClick: () => setTab("expenses")` (day book now lives under Expenses).

- [ ] **Step 6: Temporarily re-key merged-tab primary views** so nothing throws while Tasks 2–4 are pending:
  - `{tab === "expenses" && (` stays (line 791).
  - `{tab === "statements" && (() => {` → `{tab === "cashflow" && (() => {` (line 935).
  - `{tab === "pnl" && <PnlBsTab entries={entries} />}` → `{tab === "profitloss" && <PnlBsTab entries={entries} />}` (line 1486).
  - `{tab === "cashier" && <CashierTab onToast={showToast} />}` → `{tab === "reports" && <CashierTab onToast={showToast} />}` (line 1488).
  - Leave the now-unreferenced blocks `{tab === "daybook" && ...}` (733), `{tab === "bank" && ...}` (1483), `{tab === "journal" && ...}` (1487) in place for now — they simply never match. They get folded in Tasks 2–4.

- [ ] **Step 7: VERIFY-BUILD.** Run the VERIFY-BUILD commands. Expected: typecheck + build pass.

- [ ] **Step 8: Manual check.** `npm run dev`, open `/accounts`. Expected: exactly 9 tabs in the new order; default is Dashboard; each tab shows its hint line; Dashboard/Income/Vendor Payments/Guest Receivables/VAT Report show full content. (Expenses/Profit & Loss/Cash Flow/Reports show their primary view only for now.)

- [ ] **Step 9: Commit.**

```bash
git add luxe-pms/src/app/\(app\)/accounts/page.tsx
git commit -m "feat(accounts): 9 plain-language tabs with purpose hints"
```

---

## Task 2: Fold Day Book into the Expenses tab

**Files:**
- Modify: `luxe-pms/src/app/(app)/accounts/page.tsx`

**Interfaces:**
- Consumes: `TabId` (Task 1).
- Produces: local state `expensesView: "bills" | "daybook"` inside `AccountsPage`; reusable `SubToggle` component `SubToggle<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { id: T; label: string }[] })`.

- [ ] **Step 1: Add the reusable `SubToggle` component** just below `TabHint` (from Task 1).

```tsx
function SubToggle<T extends string>({ value, onChange, options }: {
  value: T; onChange: (v: T) => void; options: { id: T; label: string }[];
}) {
  return (
    <div className="inline-flex rounded-md border border-border bg-surface-sunken/40 p-0.5">
      {options.map(o => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={cn(
            "px-3 py-1.5 text-sm font-medium rounded-[5px] transition-colors",
            value === o.id ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Add view state** near the other `useState` hooks in `AccountsPage` (after line 409):

```tsx
  const [expensesView, setExpensesView] = React.useState<"bills" | "daybook">("bills");
```

- [ ] **Step 3: Wrap the Expenses tab content** (the block at line 791 `{tab === "expenses" && (`). Immediately after the opening `<>` of that block, insert the sub-toggle:

```tsx
          <SubToggle
            value={expensesView}
            onChange={setExpensesView}
            options={[{ id: "bills", label: "Expenses & bills" }, { id: "daybook", label: "Day book (all entries)" }]}
          />
```

- [ ] **Step 4: Gate the existing expenses content** behind `expensesView === "bills"`. Wrap the three existing `<div className="grid ...">`/`<Card>` children currently inside the expenses block in `{expensesView === "bills" && (<>...</>)}`.

- [ ] **Step 5: Move the Day Book content** from the old `{tab === "daybook" && (` block (lines 733–788) into the Expenses tab, gated by `expensesView === "daybook"`. Cut the inner `<>...</>` content (the search Card + the Day Book table Card), paste it into the expenses block wrapped as `{expensesView === "daybook" && (<>...</>)}`. Delete the now-empty `{tab === "daybook" && (...)}` block.

- [ ] **Step 6: VERIFY-BUILD.** Expected: pass.

- [ ] **Step 7: Manual check.** Expenses tab shows a sub-toggle; "Expenses & bills" shows the expense table + category breakdown; "Day book (all entries)" shows the searchable full ledger with the search box working.

- [ ] **Step 8: Commit.**

```bash
git add luxe-pms/src/app/\(app\)/accounts/page.tsx
git commit -m "feat(accounts): fold day book into Expenses tab via sub-toggle"
```

---

## Task 3: Fold Bank Reconcile into Cash Flow, and Journal into Profit & Loss

**Files:**
- Modify: `luxe-pms/src/app/(app)/accounts/page.tsx`

**Interfaces:**
- Consumes: `SubToggle`, `TabId`.
- Produces: local state `cashflowView: "statements" | "reconcile"`, `plView: "statement" | "journal"`.

- [ ] **Step 1: Add view state** after the `expensesView` state:

```tsx
  const [cashflowView, setCashflowView] = React.useState<"statements" | "reconcile">("statements");
  const [plView, setPlView] = React.useState<"statement" | "journal">("statement");
```

- [ ] **Step 2: Convert the Cash Flow block.** The `cashflow` block (line 935) is an inline IIFE `{tab === "cashflow" && (() => { ... })()}`. Wrap its rendered output so the sub-toggle is always visible and the heavy statements UI is shown only for `cashflowView === "statements"`. Inside the IIFE's returned JSX, wrap the top with:

```tsx
          <div className="space-y-5">
            <SubToggle
              value={cashflowView}
              onChange={setCashflowView}
              options={[{ id: "statements", label: "Statements" }, { id: "reconcile", label: "Bank reconcile" }]}
            />
            {cashflowView === "statements" && (<>{/* existing statements JSX */}</>)}
            {cashflowView === "reconcile" && <BankReconcileTab onToast={showToast} />}
          </div>
```

Keep the existing statements computations (running balance etc.) inside the IIFE above the `return`. Move the existing returned JSX into the `cashflowView === "statements"` branch.

- [ ] **Step 3: Delete the standalone** `{tab === "bank" && <BankReconcileTab onToast={showToast} />}` line (old line 1483) — it is now rendered inside Cash Flow.

- [ ] **Step 4: Convert the Profit & Loss block.** Replace `{tab === "profitloss" && <PnlBsTab entries={entries} />}` (set in Task 1) with:

```tsx
      {tab === "profitloss" && (
        <div className="space-y-5">
          <SubToggle
            value={plView}
            onChange={setPlView}
            options={[{ id: "statement", label: "P&L / Balance sheet" }, { id: "journal", label: "Journal & ledger" }]}
          />
          {plView === "statement" && <PnlBsTab entries={entries} />}
          {plView === "journal" && <JournalTab onToast={showToast} />}
        </div>
      )}
```

- [ ] **Step 5: Delete the standalone** `{tab === "journal" && <JournalTab onToast={showToast} />}` line (old line 1487).

- [ ] **Step 6: VERIFY-BUILD.** Expected: pass.

- [ ] **Step 7: Manual check.** Cash Flow shows Statements / Bank reconcile sub-toggle, both render. Profit & Loss shows P&L-BS / Journal sub-toggle, both render (P&L still has its own inner pnl/bs toggle — that is fine, it is one level deeper).

- [ ] **Step 8: Commit.**

```bash
git add luxe-pms/src/app/\(app\)/accounts/page.tsx
git commit -m "feat(accounts): fold bank reconcile into Cash Flow and journal into P&L"
```

---

## Task 4: Build the Reports tab (export cards + cashier shifts)

The `reports` tab currently renders only `<CashierTab/>` (from Task 1). Add a downloads section above it.

**Files:**
- Modify: `luxe-pms/src/app/(app)/accounts/page.tsx`

**Interfaces:**
- Consumes: `SubToggle`, `showToast`, `entries`.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Add view state** after `plView`:

```tsx
  const [reportsView, setReportsView] = React.useState<"downloads" | "cashier">("downloads");
```

- [ ] **Step 2: Replace** the `{tab === "reports" && <CashierTab onToast={showToast} />}` line (from Task 1) with a composed block:

```tsx
      {tab === "reports" && (
        <div className="space-y-5">
          <SubToggle
            value={reportsView}
            onChange={setReportsView}
            options={[{ id: "downloads", label: "Statements & summaries" }, { id: "cashier", label: "Cashier shifts" }]}
          />
          {reportsView === "downloads" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { name: "Profit & Loss statement", desc: "Revenue, costs and net profit for the period.", icon: FileBarChart },
                { name: "Cash flow statement", desc: "Opening, movements and closing balances.", icon: Wallet },
                { name: "VAT summary", desc: "Output VAT, input VAT and net payable.", icon: Receipt },
                { name: "Day book export", desc: "Every transaction, ready for your accountant.", icon: ClipboardList },
                { name: "Receivables aging", desc: "Outstanding by guest, agent and company.", icon: Users },
                { name: "Vendor payables", desc: "Bills due and payment status.", icon: FileText },
              ].map(r => (
                <Card key={r.name} className="p-5 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <span className="h-9 w-9 rounded-md bg-brand-soft text-brand-soft-foreground flex items-center justify-center shrink-0">
                      <r.icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{r.name}</p>
                      <p className="text-xs text-muted-foreground">{r.desc}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-auto">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => showToast(`${r.name} · CSV downloaded`)}>
                      <FileDown className="h-3.5 w-3.5" />CSV
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => showToast(`${r.name} · PDF generated`)}>
                      <Printer className="h-3.5 w-3.5" />PDF
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
          {reportsView === "cashier" && <CashierTab onToast={showToast} />}
        </div>
      )}
```

- [ ] **Step 3: Confirm icon imports.** `FileBarChart`, `ClipboardList`, `Users`, `FileText`, `Wallet`, `Receipt`, `FileDown`, `Printer` must be in the lucide-react import block (lines 3–7). `ClipboardList`, `Users`, `FileText` are already imported; add `FileBarChart` to the import list if missing (it is not currently imported — add it).

- [ ] **Step 4: VERIFY-BUILD.** Expected: pass (especially that all icons resolve).

- [ ] **Step 5: Manual check.** Reports tab shows a sub-toggle; "Statements & summaries" shows 6 report cards with working CSV/PDF toast buttons; "Cashier shifts" shows the cashier table. Then click through ALL 9 tabs and confirm every piece of old content is reachable (use the inventory table above as a checklist).

- [ ] **Step 6: Commit.**

```bash
git add luxe-pms/src/app/\(app\)/accounts/page.tsx
git commit -m "feat(accounts): Reports tab with downloadable statements + cashier shifts"
```

---

## Task 5: Usability polish pass

Tighten readability now that structure is settled. Keep changes purely visual/copy — no logic changes.

**Files:**
- Modify: `luxe-pms/src/app/(app)/accounts/page.tsx`

- [ ] **Step 1: Update the page subtitle** (line 440) to plain language:

```tsx
          <p className="text-muted-foreground text-sm mt-1">Income, expenses, profit, cash flow and VAT — May 2026</p>
```

- [ ] **Step 2: Ensure consistent tab spacing.** Confirm the hint (`TabHint`) renders with a small gap above the tab content; if content hugs it, the parent already uses `space-y-5` on the root `<div>` (line 436) so no change is usually needed. Only adjust if manual review shows cramped spacing.

- [ ] **Step 3: Verify every merged tab leads with its `SubToggle` then content**, visually consistent across Expenses / Profit & Loss / Cash Flow / Reports (same control, same position). Fix any inconsistency in placement.

- [ ] **Step 4: VERIFY-BUILD.** Expected: pass.

- [ ] **Step 5: Manual check.** Read each tab as a first-time user: label clear, hint clear, content grouped under headings, no leftover jargon labels ("GST", "Payables", "BS") visible as primary navigation. (Inner accounting terms inside tables are fine.)

- [ ] **Step 6: Commit.**

```bash
git add luxe-pms/src/app/\(app\)/accounts/page.tsx
git commit -m "polish(accounts): plain-language copy and consistent section layout"
```

---

## Task 6: Extract shared data + types into `_data.ts`

Begin the maintainability split. Move static data and shared types out of `page.tsx`. Pure move — no behavior change.

**Files:**
- Create: `luxe-pms/src/app/(app)/accounts/_data.ts`
- Modify: `luxe-pms/src/app/(app)/accounts/page.tsx`

**Interfaces:**
- Produces (exported from `_data.ts`): the constants `PL_TREND`, `CASH_FLOW`, `BANK_ACCOUNTS`, `RECONCILE`, `VENDOR_BILLS`, `RECEIVABLES`, `PNL_REVENUE`, `PNL_DIRECT_COSTS`, `PNL_INDIRECT_COSTS`, `BS_ASSETS`, `BS_LIABILITIES`, `CHART_OF_ACCOUNTS`, `JOURNAL_ENTRIES`, `CASHIER_SHIFTS`, `ACCOUNTS`, `HDFC_STATEMENT`, `AGING_RECEIVABLES`, `AGING_PAYABLES`, `GSTR_RETURNS`, `INCOME_CATS`, `EXPENSE_CATS`, `SEED_ENTRIES`; and the types `BankAccount`, `ReconcileEntry`, `VendorBill`, `ReceivableEntry`, `PnlRow`, `ChartAccount`, `JournalEntry`, `CashierShift`, `LedgerAccount`, `LedgerEntry`, `EntryType`, `ExpenseLine`, `Entry`.

- [ ] **Step 1: Create `_data.ts`** and move the data/type definitions currently at lines 20–372 of `page.tsx` (everything from `const PL_TREND` through `SEED_ENTRIES`, including all `type`/`export type` declarations and the `blankLine` helper). Add `export` to each top-level `const`/`type`/`function`. Keep `export type ExpenseLine` exported (it already is and is imported elsewhere — verify with a repo search for `ExpenseLine`).

- [ ] **Step 2: Add the import** at the top of `page.tsx` (after the existing `@/lib/...` imports):

```tsx
import {
  PL_TREND, CASH_FLOW, BANK_ACCOUNTS, RECONCILE, VENDOR_BILLS, RECEIVABLES,
  PNL_REVENUE, PNL_DIRECT_COSTS, PNL_INDIRECT_COSTS, BS_ASSETS, BS_LIABILITIES,
  CHART_OF_ACCOUNTS, JOURNAL_ENTRIES, CASHIER_SHIFTS, ACCOUNTS, HDFC_STATEMENT,
  AGING_RECEIVABLES, AGING_PAYABLES, GSTR_RETURNS, INCOME_CATS, EXPENSE_CATS,
  SEED_ENTRIES, blankLine,
  type BankAccount, type ReconcileEntry, type VendorBill, type ReceivableEntry,
  type PnlRow, type ChartAccount, type JournalEntry, type CashierShift,
  type LedgerAccount, type LedgerEntry, type EntryType, type ExpenseLine, type Entry,
} from "./_data";
```

(Trim this import to only the names actually still referenced in `page.tsx` after Step 1 — `tsc` will flag unused ones.)

- [ ] **Step 3: Remove the moved declarations** from `page.tsx`. If `blankLine` or any const is referenced by the tab components still inside `page.tsx` (e.g. `PnlBsTab`, `CashierTab`), they now import from `./_data` too — they are in the same file so the top-level import covers them.

- [ ] **Step 4: VERIFY-BUILD.** Expected: pass with no unused-import errors. Fix the import list until clean.

- [ ] **Step 5: Manual check.** Quick click through all 9 tabs — identical to before.

- [ ] **Step 6: Commit.**

```bash
git add luxe-pms/src/app/\(app\)/accounts/_data.ts luxe-pms/src/app/\(app\)/accounts/page.tsx
git commit -m "refactor(accounts): extract static data and types into _data.ts"
```

---

## Task 7: Extract tab components into `_tabs/`

Move the six existing helper components and the four largest inline blocks into focused files. Do this **one component at a time, building between each** to keep moves safe. Below lists the moves; treat each bullet as its own write+build+commit micro-cycle.

**Files:**
- Create: `luxe-pms/src/app/(app)/accounts/_tabs/bank-reconcile-tab.tsx`, `payables-tab.tsx`, `receivables-tab.tsx`, `pnl-bs-tab.tsx`, `journal-tab.tsx`, `cashier-tab.tsx` (and their modal sub-components moved alongside the tab that uses them).
- Modify: `luxe-pms/src/app/(app)/accounts/page.tsx`

**Interfaces:**
- Produces: each file `export function <Name>(props)` with the SAME props the component has today (`BankReconcileTab({ onToast })`, `PayablesTab({ onToast })`, `ReceivablesTab({ onToast })`, `PnlBsTab({ entries })`, `JournalTab({ onToast })`, `CashierTab({ onToast })`). `onToast: (m: string) => void`. `entries: Entry[]`.

- [ ] **Step 1: Move `BankReconcileTab`** (and any helper it alone uses) to `_tabs/bank-reconcile-tab.tsx`. Add `"use client";` at top. Import what it needs from `../_data`, `@/components/ui/*`, `@/lib/utils`, `lucide-react`. In `page.tsx` add `import { BankReconcileTab } from "./_tabs/bank-reconcile-tab";`. Remove the original definition. VERIFY-BUILD. Commit `refactor(accounts): extract BankReconcileTab`.

- [ ] **Step 2: Move `PayablesTab`** → `_tabs/payables-tab.tsx` (carry `AddBillModal`/related helpers it uses, e.g. the `TDS_SECTIONS`, `numberToWords` `numToWords` helper around line 2132 — search for its usages; if shared with another tab, move shared helpers to `_data.ts` instead). VERIFY-BUILD. Commit.

- [ ] **Step 3: Move `ReceivablesTab`** → `_tabs/receivables-tab.tsx`. VERIFY-BUILD. Commit.

- [ ] **Step 4: Move `PnlBsTab`** → `_tabs/pnl-bs-tab.tsx`. VERIFY-BUILD. Commit.

- [ ] **Step 5: Move `JournalTab`** → `_tabs/journal-tab.tsx`. VERIFY-BUILD. Commit.

- [ ] **Step 6: Move `CashierTab`** (and its `OpenShiftModal`, `CloseShiftModal`, `VerifyShiftModal`, `ShiftDetailDrawer` — lines ~2828–3640) → `_tabs/cashier-tab.tsx`. These modals are used only by CashierTab, so they travel with it. VERIFY-BUILD. Commit.

- [ ] **Step 7: Final VERIFY-BUILD + full manual pass** across all 9 tabs and their sub-toggles and modals (add income, add expense, open a cashier shift, etc.).

---

## Task 8: Final verification and wrap-up

**Files:** none (verification only).

- [ ] **Step 1: Full build.** From `luxe-pms/`: `npx tsc --noEmit && npm run lint && npm run build`. Expected: all pass; `/accounts` listed in build output.

- [ ] **Step 2: Manual QA against success criteria.** With the backend running (`start-dev.ps1`, login `admin@hotel.com` / `password123`):
  - `/accounts` shows exactly 9 tabs, plain names, Dashboard first.
  - Each tab shows its hint line.
  - Every old-tab content item (use the inventory table) is reachable within the 9.
  - Add an Income entry and an Expense entry → both POST and appear in Day book / tables.
  - Sidebar still shows the single "Accounts" link (unchanged).

- [ ] **Step 3: Confirm no out-of-scope changes.** `git diff --stat main` should touch only files under `luxe-pms/src/app/(app)/accounts/` and the docs/plan. `nav.ts`, `sidebar.tsx`, and `hotel-pms-api/` must be untouched.

- [ ] **Step 4: Final commit if anything outstanding**, otherwise done.

---

## Self-Review notes (author)

- **Spec coverage:** 9 tabs + ordering (Task 1) ✓; fold extras with nothing lost (Tasks 2–4, verified by inventory checklist in Task 4/8) ✓; plain labels + per-tab hints (Task 1) ✓; usability polish (Task 5) ✓; thin shell + per-tab components + `_data.ts` (Tasks 6–7) ✓; no sidebar/route/backend/DB change (Global Constraints + Task 8 Step 3) ✓; reuse existing endpoints (Global Constraints) ✓.
- **Placeholder scan:** Merged-tab "primary view only" in Task 1 is explicitly temporary and resolved by Tasks 2–4; flagged, not a placeholder. No TBD/TODO left.
- **Type consistency:** `TabId` ids used identically across Tasks 1–5; component prop shapes in Task 7 match current definitions; `_data.ts` exports in Task 6 match the names imported.
- **Note on TDD:** This is a UI reorganization with no component-test harness; per Global Constraints the verification gate is typecheck/build/lint + manual click-through, deliberately substituted for failing-test-first cycles.
