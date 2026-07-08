"use client";
import * as React from "react";
import { createPortal } from "react-dom";
import { X, Printer, Download, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn, money, numberToWordsIN } from "@/lib/utils";
import { useProperty, hotelName } from "@/lib/use-property";

export type ReceiptPayment = {
  amount: number;
  mode: string;
  reference?: string;
  date?: string; // ISO or "YYYY-MM-DD HH:mm:ss"
};

export type ReceiptSummaryLine = { label: string; value: number; tone?: "muted" | "credit" | "due" | "bold" };
export type ReceiptChargeLine = { description: string; date?: string; items?: { name: string; qty: number; price: number }[]; amount: number };

export type PaymentReceiptData = {
  receiptNo: string;
  title: string;            // e.g. "Advance Payment Receipt", "Payment Receipt", "Group Checkout Receipt"
  towards?: string;         // what the payment is for
  payerName: string;        // group / guest name
  reference?: string;       // group code / booking ref
  room?: string;
  stay?: string;
  extraRows?: { k: string; v: React.ReactNode }[];
  charges?: ReceiptChargeLine[];  // itemised folio charges (for a detailed bill/statement)
  payment: ReceiptPayment;
  amountLabel?: string;     // headline amount label, default "Amount Received"
  summary?: ReceiptSummaryLine[];
};

function ReceiptRow({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <tr className="border-b border-border/40">
      <td className="py-1.5 text-xs text-muted-foreground w-1/3">{k}</td>
      <td className="py-1.5 text-sm">: {v}</td>
    </tr>
  );
}

/**
 * A professional, printable payment receipt. Renders the receipt twice: an
 * on-screen modal preview (`.no-print`) and a copy portaled to <body> inside
 * `.print-doc`, so window.print() emits only the receipt (the global print CSS
 * hides everything else). Reused across every payment flow.
 */
export function PaymentReceipt({ data, onClose }: { data: PaymentReceiptData; onClose: () => void }) {
  const name = hotelName(useProperty());
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => { setMounted(true); }, []);
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const p = data.payment;
  const hasMode = !!p.mode && p.mode !== "—";
  const stamp = p.date ? new Date(p.date.replace(" ", "T")) : new Date();
  const dateNow = isNaN(stamp.getTime())
    ? ""
    : stamp.toLocaleString(undefined, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const summary = data.summary ?? [];

  const receiptDoc = (
    <div className="rounded-md border-2 border-double border-border p-5 bg-surface text-sm space-y-3">
      {/* Hotel header */}
      <div className="text-center border-b-2 border-double border-border pb-3">
        <p className="font-display text-lg font-medium">{name}</p>
        <p className="text-[10px] text-muted-foreground">Main Tower · MG Road, Bandra West, Mumbai 400050</p>
        <p className="text-[10px] text-muted-foreground tabular">GSTIN 27AAACR5055K1Z5 · PAN AAACR5055K</p>
        <div className="mt-2 inline-block px-3 py-0.5 rounded-full bg-brand-soft text-brand-soft-foreground text-[10px] uppercase tracking-[0.18em] font-bold">
          {data.title}
        </div>
      </div>

      {/* Receipt meta */}
      <div className="flex justify-between text-xs">
        <span><span className="text-muted-foreground">Receipt No.</span> <span className="font-semibold tabular">{data.receiptNo}</span></span>
        <span className="tabular text-muted-foreground">{dateNow}</span>
      </div>

      {/* Body */}
      <table className="w-full text-sm">
        <tbody>
          <ReceiptRow k="Received From" v={data.payerName} />
          {data.reference && <ReceiptRow k="Reference" v={<span className="font-mono tabular">{data.reference}</span>} />}
          {data.room && <ReceiptRow k="Room" v={data.room} />}
          {data.stay && <ReceiptRow k="Stay" v={data.stay} />}
          {data.towards && <ReceiptRow k="Towards" v={data.towards} />}
          {hasMode && <ReceiptRow k="Payment Mode" v={p.mode} />}
          {hasMode && p.reference && <ReceiptRow k="Reference / Txn" v={<span className="font-mono tabular">{p.reference}</span>} />}
          {hasMode && p.mode === "Cash" && <ReceiptRow k="Receipt drawer" v="Reception cash drawer" />}
          {(data.extraRows ?? []).map((r, i) => <ReceiptRow key={i} k={r.k} v={r.v} />)}
        </tbody>
      </table>

      {/* Itemised charges (detailed bill / statement) */}
      {data.charges && data.charges.length > 0 && (
        <div className="rounded-md border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-surface-sunken/50 border-b border-border">
              <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-1.5 font-semibold">Item</th>
                <th className="px-3 py-1.5 font-semibold text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {data.charges.map((c, i) => (
                <React.Fragment key={i}>
                  <tr>
                    <td className="px-3 py-1.5">{c.description}{c.date ? <span className="text-[10px] text-subtle-foreground"> · {c.date}</span> : ""}</td>
                    <td className="px-3 py-1.5 text-right tabular font-medium">{money(c.amount)}</td>
                  </tr>
                  {(c.items ?? []).map((it, j) => (
                    <tr key={j} className="text-muted-foreground">
                      <td className="px-3 py-1 pl-6">{it.name}{it.qty > 1 ? ` × ${it.qty}` : ""}</td>
                      <td className="px-3 py-1 text-right tabular">{money(it.price * it.qty)}</td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Headline amount */}
      <div className="rounded-md bg-brand-soft/40 border border-brand/30 p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{data.amountLabel ?? "Amount Received"}</span>
          <span className="text-2xl font-bold tabular text-brand-soft-foreground">{money(p.amount)}</span>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1 italic">
          In Words: <span className="text-foreground font-medium">{numberToWordsIN(p.amount)} Rupees Only</span>
        </p>
      </div>

      {/* Bill summary */}
      {summary.length > 0 && (
        <div className="rounded-md border border-border p-3 space-y-1 text-xs">
          {summary.map((s, i) => (
            <div
              key={i}
              className={cn(
                "flex justify-between",
                s.tone === "credit" && "text-success",
                s.tone === "due" && "text-warning",
                i === summary.length - 1 && "border-t border-border pt-1 mt-1",
              )}
            >
              <span className={s.tone === "bold" ? "font-semibold text-foreground" : "text-muted-foreground"}>{s.label}</span>
              <span className={cn("tabular", (s.tone === "bold" || s.tone === "due") ? "font-bold" : "font-medium")}>
                {s.tone === "credit" ? "- " : ""}{money(s.value)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Signature footer */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t-2 border-double border-border">
        <div>
          <p className="text-[10px] text-muted-foreground italic mb-6">Received with thanks.</p>
          <p className="border-t border-border pt-1 text-[10px] text-muted-foreground tabular">Cashier</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-muted-foreground italic mb-6">For {name}</p>
          <p className="border-t border-border pt-1 text-[10px] text-muted-foreground tabular">Authorised Signatory</p>
        </div>
      </div>

      <p className="text-[9px] text-muted-foreground italic text-center border-t border-border pt-2">
        This is a computer-generated receipt. Subject to realisation. Original for Guest · Duplicate for Hotel records.
      </p>
    </div>
  );

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm no-print" onClick={onClose} />
      <div className="fixed inset-0 z-[70] flex items-start justify-center p-4 pointer-events-none overflow-y-auto no-print">
        <Card className="pointer-events-auto w-full max-w-2xl p-5 animate-in shadow-xl my-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold inline-flex items-center gap-2"><FileText className="h-4 w-4 text-brand" />{data.title}</h3>
            <button type="button" onClick={onClose} className="h-8 w-8 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
          </div>

          {/* Preview — same content that is portaled for print */}
          {receiptDoc}

          <div className="flex justify-end gap-2 pt-3 border-t border-border mt-4">
            <Button variant="ghost" onClick={onClose}>Close</Button>
            <Button variant="outline" onClick={() => window.print()}><Download className="h-4 w-4" />Save as PDF</Button>
            <Button onClick={() => window.print()}><Printer className="h-4 w-4" />Print Now</Button>
          </div>
        </Card>
      </div>

      {/* Print-only copy — window.print() emits just this (global print CSS). */}
      {mounted && createPortal(<div className="print-doc">{receiptDoc}</div>, document.body)}
    </>
  );
}
