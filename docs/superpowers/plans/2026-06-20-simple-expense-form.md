# Simple Expense Form Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the overwhelming full-screen 9-section "New expense" form with one clean, compact dialog that captures the essentials by default and tucks VAT/invoice details behind an optional collapsible.

**Architecture:** Build a new self-contained `NewExpenseForm` modal component in its own file, swap the page to use it (same `onSubmit` contract), then delete the old `FullScreenExpenseForm` and the helpers/constants that become dead. Pure frontend; same `Entry` shape posted to the same endpoint.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind, lucide-react. UI kit in `src/components/ui/*`. Data/types from `../_data`.

## Global Constraints

- Single feature area — files under `luxe-pms/src/app/(app)/accounts/` only. No nav.ts/sidebar.tsx/backend/DB changes.
- The new form posts the SAME `Entry` shape to `/account-entries` via the page's existing `handleAdd`; the page's `onSubmit(entry, addAnother)` contract is unchanged.
- Currency uses the app's `money()` (₹). VAT rate is 5%.
- Plain VAT language only — NO "GSTIN", "PAN", "RCM", "inter-state", "CGST/SGST/IGST", "HSN/SAC", "place of supply", "TDS", "cost center", "voucher #" wording anywhere in the form UI.
- This Next.js version has breaking changes — per `luxe-pms/AGENTS.md`, consult `node_modules/next/dist/docs/` before using any unfamiliar Next API. (This plan uses only React state + the existing UI kit — no Next APIs.)
- Verification per task = `npx tsc --noEmit` + `npm run lint` + (final task) `npm run build` + manual click-through. There is NO React component-test harness; do NOT invent UI unit tests — this is the project's deliberate, documented verification approach.

**Working directory for all commands:** `luxe-pms/`

**VERIFY (referenced below):**
```bash
cd luxe-pms
npx tsc --noEmit        # must print nothing (exit 0)
npm run lint            # no NEW errors; pre-existing warnings are acceptable
```

---

## Reference: current state

- Page: `luxe-pms/src/app/(app)/accounts/page.tsx` (~2478 lines).
- The Expense buttons set `showExpenseFull` (state at ~line 112; buttons at ~line 173 and ~line 482).
- Current wiring (~lines 1214–1224):
```tsx
{showExpenseFull && (
  <FullScreenExpenseForm
    expenseCats={EXPENSE_CATS}
    onClose={() => setShowExpenseFull(false)}
    onSubmit={(entry, andAddAnother) => {
      handleAdd(entry);
      showToast(andAddAnother ? "Expense saved · ready for next" : "Expense recorded");
      if (!andAddAnother) setShowExpenseFull(false);
    }}
  />
)}
```
- `FullScreenExpenseForm` is defined ~lines 1984–2433.
- `Entry` type (from `../_data`):
```ts
type Entry = {
  id: string; date: string; type: EntryType; category: string;
  description: string; amount: number; mode: string; ref: string;
  vendor?: string; gstin?: string; cgst?: number; sgst?: number; igst?: number;
  hsnSac?: string; lines?: ExpenseLine[];
  attachment?: { name: string; dataUrl: string; type: string } | null;
  voucherNo?: string;
};
```
- `EXPENSE_CATS` is exported from `../_data`.
- Symbols that become DEAD after the old form is removed (verified usage is confined to the form): `FullScreenExpenseForm`, `CheckRow`, `Section`, `SECTIONS`, `SectionId`, `PROPERTIES`, `DEPARTMENTS`, `COST_CENTERS`, `APPROVERS`, `TDS_SECTIONS`, `Attachment` (type), `PAY_FROM_ACCOUNTS`. KEEP: `Field`, `Row`, `EntryModal`, `PaymentVoucherModal`.

---

## Task 1: Build `NewExpenseForm` and wire it in

Create the compact dialog and switch the page to use it. Leave the old `FullScreenExpenseForm` in place (unused) for now — Task 2 deletes it. The new form is fully functional including the optional VAT section.

**Files:**
- Create: `luxe-pms/src/app/(app)/accounts/_components/new-expense-form.tsx`
- Modify: `luxe-pms/src/app/(app)/accounts/page.tsx` (import + the `showExpenseFull` render block)

**Interfaces:**
- Produces: `NewExpenseForm({ expenseCats, onClose, onSubmit }: { expenseCats: string[]; onClose: () => void; onSubmit: (entry: Omit<Entry, "id">, addAnother: boolean) => void })` — same prop shape the page already passes to `FullScreenExpenseForm`.

- [ ] **Step 1: Create the component file** `luxe-pms/src/app/(app)/accounts/_components/new-expense-form.tsx` with this exact content:

```tsx
"use client";
import * as React from "react";
import { Plus, X, CheckCircle2, AlertCircle, Paperclip, ChevronRight, ChevronDown, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { money } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Entry } from "../_data";

// Accounts money can be paid from. Local to this form (the only place it's used).
const PAY_FROM = ["HDFC Operating", "ICICI Savings", "Cash in Hand", "Petty Cash"];
const MODES = ["Cash", "Card", "Bank", "UPI"] as const;

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}{hint && <span className="ml-1 normal-case font-normal text-subtle-foreground">· {hint}</span>}
      </label>
      {children}
    </div>
  );
}

export function NewExpenseForm({ expenseCats, onClose, onSubmit }: {
  expenseCats: string[];
  onClose: () => void;
  onSubmit: (entry: Omit<Entry, "id">, addAnother: boolean) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);

  // --- essentials ---
  const [date, setDate] = React.useState(today);
  const [payee, setPayee] = React.useState("");
  const [category, setCategory] = React.useState(expenseCats[0] ?? "");
  const [amountStr, setAmountStr] = React.useState("");
  const [mode, setMode] = React.useState<string>(MODES[0]);
  const [paidFrom, setPaidFrom] = React.useState(PAY_FROM[0]);
  const [note, setNote] = React.useState("");
  const [attachment, setAttachment] = React.useState<{ name: string; dataUrl: string; type: string } | null>(null);

  // --- optional VAT / invoice details ---
  const [showVat, setShowVat] = React.useState(false);
  const [invoiceNo, setInvoiceNo] = React.useState("");
  const [invoiceDate, setInvoiceDate] = React.useState(today);
  const [vatTouched, setVatTouched] = React.useState(false);
  const [vatStr, setVatStr] = React.useState("");
  const [vendorTaxId, setVendorTaxId] = React.useState("");

  const amount = Math.max(0, Math.round(Number(amountStr) || 0));
  const suggestedVat = Math.round(amount * 0.05);
  const vatValue = vatTouched ? Math.max(0, Math.round(Number(vatStr) || 0)) : suggestedVat;

  React.useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; document.removeEventListener("keydown", onKey); };
  }, [onClose]);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setAttachment({ name: file.name, dataUrl: (ev.target?.result as string) || "", type: file.type });
    reader.readAsDataURL(file);
  };

  const valid = payee.trim() !== "" && amount > 0;

  const handleSubmit = (addAnother: boolean) => {
    if (!valid) return;
    const entry: Omit<Entry, "id"> = {
      date, type: "expense", category,
      vendor: payee.trim(),
      description: note.trim() || category,
      amount,
      mode,
      ref: invoiceNo.trim() || paidFrom,
      attachment,
      ...(showVat ? { gstin: vendorTaxId.trim() || undefined, igst: vatValue, cgst: 0, sgst: 0 } : {}),
    };
    onSubmit(entry, addAnother);
    if (addAnother) {
      setPayee(""); setAmountStr(""); setNote(""); setAttachment(null);
      setInvoiceNo(""); setVatStr(""); setVatTouched(false); setVendorTaxId("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start sm:items-center justify-center p-0 sm:p-4 overflow-y-auto" onClick={onClose}>
      <div
        className="bg-surface w-full sm:max-w-xl sm:rounded-xl border border-border shadow-2xl flex flex-col max-h-[100dvh] sm:max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border shrink-0">
          <span className="h-9 w-9 rounded-md bg-warning-soft text-warning inline-flex items-center justify-center"><Plus className="h-4 w-4" /></span>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-base leading-tight">New expense</h2>
            <p className="text-[11px] text-muted-foreground">Record money your hotel paid out</p>
          </div>
          <button type="button" onClick={onClose} className="h-8 w-8 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center text-muted-foreground" title="Cancel (Esc)">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Date"><Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-9 tabular" /></Field>
            <Field label="Payee"><Input value={payee} onChange={e => setPayee(e.target.value)} placeholder="e.g. DEWA, ABC Linens" className="h-9" /></Field>
            <Field label="Category"><Select value={category} onChange={e => setCategory(e.target.value)} className="h-9">{expenseCats.map(c => <option key={c}>{c}</option>)}</Select></Field>
            <Field label="Amount (₹)"><Input inputMode="decimal" value={amountStr} onChange={e => setAmountStr(e.target.value)} placeholder="0" className="h-9 tabular" /></Field>
            <Field label="Paid by"><Select value={mode} onChange={e => setMode(e.target.value)} className="h-9">{MODES.map(m => <option key={m}>{m}</option>)}</Select></Field>
            <Field label="Paid from"><Select value={paidFrom} onChange={e => setPaidFrom(e.target.value)} className="h-9">{PAY_FROM.map(a => <option key={a}>{a}</option>)}</Select></Field>
          </div>

          <Field label="Note" hint="optional"><Input value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Electricity bill — May" className="h-9" /></Field>

          {/* Receipt */}
          <div className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
            <div className="flex items-center gap-2 min-w-0">
              <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm truncate">{attachment ? attachment.name : "Attach receipt"}<span className="text-subtle-foreground"> · optional</span></span>
            </div>
            {attachment
              ? <Button size="sm" variant="ghost" onClick={() => setAttachment(null)}><Trash2 className="h-3.5 w-3.5" />Remove</Button>
              : <label className="cursor-pointer"><span className="inline-flex items-center h-8 px-3 rounded-md border border-border text-sm hover:bg-surface-sunken">Choose file</span><input type="file" className="hidden" onChange={onFile} /></label>}
          </div>

          {/* Optional VAT / invoice details */}
          <div className="rounded-md border border-border">
            <button type="button" onClick={() => setShowVat(v => !v)} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium hover:bg-surface-sunken/50">
              {showVat ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              Add VAT / invoice details
              <span className="text-subtle-foreground font-normal">· optional</span>
            </button>
            {showVat && (
              <div className="px-3 pb-3 pt-1 grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-border">
                <Field label="Invoice no"><Input value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} placeholder="e.g. INV-2426" className="h-9" /></Field>
                <Field label="Invoice date"><Input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} className="h-9 tabular" /></Field>
                <Field label="VAT amount (₹)" hint="5% suggested"><Input inputMode="decimal" value={vatTouched ? vatStr : String(suggestedVat)} onChange={e => { setVatTouched(true); setVatStr(e.target.value); }} className="h-9 tabular" /></Field>
                <Field label="Vendor tax ID" hint="optional"><Input value={vendorTaxId} onChange={e => setVendorTaxId(e.target.value)} placeholder="Tax registration no." className="h-9" /></Field>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-5 py-4 border-t border-border shrink-0">
          <span className={cn("text-xs inline-flex items-center gap-1", valid ? "text-success" : "text-muted-foreground")}>
            {valid ? <><CheckCircle2 className="h-3.5 w-3.5" />Ready to save</> : <><AlertCircle className="h-3.5 w-3.5" />Enter a payee and amount</>}
          </span>
          <div className="flex-1" />
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="outline" disabled={!valid} onClick={() => handleSubmit(true)}>Save &amp; add another</Button>
          <Button disabled={!valid} onClick={() => handleSubmit(false)}>Save expense</Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Confirm UI-kit exports.** Open `luxe-pms/src/components/ui/input.tsx` and confirm it exports `Input` and `Select`. If `Select` is exported under a different name, adjust the import. (The page already imports `{ Input, Label, Select } from "@/components/ui/input"`, so these exist.)

- [ ] **Step 3: Wire the page to the new form.** In `page.tsx`, add near the other component imports at the top:

```tsx
import { NewExpenseForm } from "./_components/new-expense-form";
```

Then change the `showExpenseFull` render block (currently `<FullScreenExpenseForm ... />`) to:

```tsx
{showExpenseFull && (
  <NewExpenseForm
    expenseCats={EXPENSE_CATS}
    onClose={() => setShowExpenseFull(false)}
    onSubmit={(entry, andAddAnother) => {
      handleAdd(entry);
      showToast(andAddAnother ? "Expense saved · ready for next" : "Expense recorded");
      if (!andAddAnother) setShowExpenseFull(false);
    }}
  />
)}
```

Leave `FullScreenExpenseForm` defined in the file for now (it is simply no longer rendered — Task 2 removes it).

- [ ] **Step 4: VERIFY.** Run VERIFY. Expected: tsc clean. lint may warn that `FullScreenExpenseForm` (and the consts it uses) are now unused — that is expected and removed in Task 2; there must be no NEW errors and no errors from `new-expense-form.tsx`.

- [ ] **Step 5: Manual check.** `npm run dev`, open `/accounts` → Expenses tab → "Add Expense" (and the top-right "Expense" button). Expected: the new compact dialog opens (not the full-screen form). Fill Date+Payee+Category+Amount+Paid by, click "Save expense" → toast "Expense recorded", dialog closes, and the entry appears in Expenses list / Day book. Expand "Add VAT / invoice details", confirm the 4 fields appear with VAT pre-filled at 5%. Esc and backdrop-click close the dialog.

- [ ] **Step 6: Commit.**

```bash
git add "luxe-pms/src/app/(app)/accounts/_components/new-expense-form.tsx" "luxe-pms/src/app/(app)/accounts/page.tsx"
git commit -m "feat(accounts): compact New expense dialog replacing full-screen form"
```

---

## Task 2: Remove the old full-screen form and dead helpers

Delete `FullScreenExpenseForm` and every symbol that is now unused because only it referenced them. Verify each is dead before deleting.

**Files:**
- Modify: `luxe-pms/src/app/(app)/accounts/page.tsx`

- [ ] **Step 1: Confirm dead symbols.** For each of these, run a usage search in `page.tsx` and confirm the ONLY references are the definition itself and code inside `FullScreenExpenseForm`:

```bash
cd luxe-pms
for s in FullScreenExpenseForm CheckRow Section SECTIONS SectionId PROPERTIES DEPARTMENTS COST_CENTERS APPROVERS TDS_SECTIONS PAY_FROM_ACCOUNTS Attachment; do
  echo "== $s =="; grep -n "\b$s\b" "src/app/(app)/accounts/page.tsx";
done
```
Expected: every hit is the declaration or sits inside the `FullScreenExpenseForm` body. (Note: `Field` and `Row` will show many hits elsewhere — those are KEPT, not in this list.)

- [ ] **Step 2: Delete** the `FullScreenExpenseForm` function definition and the now-dead helpers/constants/types: `CheckRow`, `Section`, the `SECTIONS` array, the `SectionId` type, and the constants `PROPERTIES`, `DEPARTMENTS`, `COST_CENTERS`, `APPROVERS`, `TDS_SECTIONS`, `PAY_FROM_ACCOUNTS`, and the `Attachment` type. Do NOT delete `Field`, `Row`, `EntryModal`, `PaymentVoucherModal`.

- [ ] **Step 3: Remove now-unused imports.** After deletion, some lucide-react icons / `_data` symbols imported by `page.tsx` may become unused (e.g. icons only the old form used). Run VERIFY and trim any import the lint flags as unused. Do NOT remove imports still used elsewhere in the file.

- [ ] **Step 4: VERIFY.** Run VERIFY. Expected: tsc clean; lint shows NO unused-symbol warnings for the deleted names and no new errors.

- [ ] **Step 5: Manual check.** Reload `/accounts`; the Expense button still opens the new dialog; saving still works. Nothing else changed.

- [ ] **Step 6: Commit.**

```bash
git add "luxe-pms/src/app/(app)/accounts/page.tsx"
git commit -m "refactor(accounts): remove full-screen expense form and dead helpers"
```

---

## Task 3: VAT label on the voucher + final verification

The saved VAT amount is stored on `Entry.igst`. The existing `PaymentVoucherModal` may print that as "IGST"; relabel it to "VAT" so a saved expense reads correctly. Then run the full gate.

**Files:**
- Modify: `luxe-pms/src/app/(app)/accounts/page.tsx`

- [ ] **Step 1: Find the voucher's tax line.** Search the `PaymentVoucherModal` region:

```bash
cd luxe-pms
grep -n "IGST\|CGST\|SGST" "src/app/(app)/accounts/page.tsx"
```

- [ ] **Step 2: Relabel for the new single-VAT entries.** In `PaymentVoucherModal`, where it renders the IGST line (a `Row`/label showing `entry.igst`), change the visible label text from `IGST` to `VAT`. If the modal shows CGST/SGST/IGST as three separate rows, leave CGST/SGST as-is (they will be 0 for new entries) and only relabel the IGST row to `VAT`. This is a copy-only change — do not alter amounts or logic. Example shape (match the actual code):

```tsx
{/* before */ }   <Row k="IGST" v={money(entry.igst ?? 0)} />
{/* after  */ }   <Row k="VAT" v={money(entry.igst ?? 0)} />
```

If `PaymentVoucherModal` does not render `igst` at all, skip the edit and note that in the report.

- [ ] **Step 3: VERIFY + build.** Run:

```bash
cd luxe-pms
npx tsc --noEmit
npm run lint
npm run build
```
Expected: tsc clean; lint no new errors; build "Compiled successfully" with `/accounts` in the route list.

- [ ] **Step 4: Manual QA against success criteria.** With the dev server (and ideally the backend via `start-dev.ps1`, login `admin@hotel.com` / `password123`):
  - Expense button opens the compact dialog (not the 9-section form).
  - Default view shows only the 7 essentials; VAT/invoice fields hidden until expanded.
  - Save with Date+Payee+Category+Amount+Paid by → entry appears in Expenses list / Day book.
  - Expand VAT details, set a VAT amount + vendor tax id + invoice no, save → open that entry's voucher (Expenses list → "Voucher"/"View") and confirm VAT + vendor tax id show.
  - No GST/PAN/RCM/HSN/TDS/cost-center/voucher-# wording remains in the form.

- [ ] **Step 5: Commit.**

```bash
git add "luxe-pms/src/app/(app)/accounts/page.tsx"
git commit -m "polish(accounts): label saved tax as VAT on expense voucher"
```

---

## Self-Review notes (author)

- **Spec coverage:** compact dialog replacing full-screen form (Task 1) ✓; 7 default essentials + collapsible VAT/invoice with 5% default (Task 1) ✓; dropped voucher#/property/dept/cost-center/line-grid/TDS/approval/recurring (Task 1 builds only essentials; Task 2 deletes old) ✓; plain VAT language / no GST-PAN-RCM-HSN wording (Task 1 component copy) ✓; same `Entry` to same endpoint, no backend/DB change (Global Constraints + Task 1 submit) ✓; new form in own file, old form + dead helpers removed (Tasks 1–2) ✓; VAT persisted via `igst`/`gstin`/`ref` (Task 1 submit), voucher label fixed (Task 3) ✓.
- **Placeholder scan:** none — full component code provided; deletions enumerated; the only conditional ("if voucher doesn't render igst, skip") is an explicit instruction, not a TODO.
- **Type consistency:** `NewExpenseForm` prop shape matches the page's existing `onSubmit(entry, addAnother)` call; `Omit<Entry,"id">` fields match the `Entry` type from `_data`; `igst/cgst/sgst/gstin` are existing optional `Entry` fields.
- **TDD note:** UI work with no component-test harness; verification is typecheck/lint/build + manual, per Global Constraints.
