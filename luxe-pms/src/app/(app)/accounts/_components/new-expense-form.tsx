"use client";
import * as React from "react";
import { Plus, X, CheckCircle2, AlertCircle, Paperclip, ChevronRight, ChevronDown, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Entry } from "../_data";

// Accounts money can be paid from. Local to this form (the only place it's used).
const PAY_FROM = ["HDFC Operating", "ICICI Savings", "Cash in Hand", "Petty Cash"];
const DEPARTMENTS = ["General", "Rooms", "F&B", "Banquet", "Spa", "Other"];
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
  const [department, setDepartment] = React.useState("General");

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
      department,
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
            <Field label="Department">
              <Select value={department} onChange={e => setDepartment(e.target.value)} className="h-9">
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </Select>
            </Field>
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
