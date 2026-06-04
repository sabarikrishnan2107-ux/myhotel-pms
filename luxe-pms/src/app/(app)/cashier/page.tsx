"use client";
import * as React from "react";
import { Banknote, CreditCard, Smartphone, Globe, Receipt, AlertCircle, CheckCircle2, ClipboardCheck, Printer, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { SHIFT } from "@/lib/mock-data-ext";
import { money, cn } from "@/lib/utils";

const MODES = [
  { key: "cash", label: "Cash", icon: Banknote, tone: "success" as const },
  { key: "card", label: "Card", icon: CreditCard, tone: "info" as const },
  { key: "upi", label: "UPI", icon: Smartphone, tone: "accent" as const },
  { key: "online", label: "Online", icon: Globe, tone: "brand" as const },
];

export default function CashierPage() {
  const [physical, setPhysical] = React.useState(SHIFT.opening + SHIFT.cash - SHIFT.refunds - SHIFT.expenses + 50);
  const expected = SHIFT.opening + SHIFT.cash - SHIFT.refunds - SHIFT.expenses;
  const variance = physical - expected;
  const totalCollected = SHIFT.cash + SHIFT.card + SHIFT.upi + SHIFT.online;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-display font-medium tracking-tight">Cashier Shift Closing</h1>
            <Badge tone="info">Shift #{SHIFT.number} · Open</Badge>
            <Badge tone="success"><ClipboardCheck className="h-3 w-3" />Pre-checks done</Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">{SHIFT.cashier} · {SHIFT.startedAt} → {SHIFT.endsAt}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><Receipt className="h-4 w-4" />View Receipts</Button>
          <Button variant="outline"><Printer className="h-4 w-4" />Print Shift Report</Button>
        </div>
      </div>

      {/* Mode totals */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {MODES.map(m => {
          const Icon = m.icon;
          const amount = SHIFT[m.key as keyof typeof SHIFT] as number;
          return (
            <Card key={m.key} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{m.label}</p>
                  <p className="mt-2 text-2xl font-semibold tabular">{money(amount)}</p>
                </div>
                <span className={cn("h-9 w-9 rounded-md flex items-center justify-center",
                  m.tone === "success" && "bg-success-soft text-success",
                  m.tone === "info" && "bg-info-soft text-info",
                  m.tone === "accent" && "bg-accent-soft text-accent",
                  m.tone === "brand" && "bg-brand-soft text-brand-soft-foreground",
                )}><Icon className="h-4.5 w-4.5" /></span>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Cash reconciliation */}
        <Card className="lg:col-span-2 p-5 space-y-5">
          <div>
            <CardTitle>Cash Reconciliation</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Compare expected drawer cash with physical count</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Opening Cash" value={money(SHIFT.opening)} muted />
            <Field label="Cash Collected" value={`+ ${money(SHIFT.cash)}`} tone="success" />
            <Field label="Refunds Paid" value={`- ${money(SHIFT.refunds)}`} tone="warning" />
            <Field label="Expenses Paid" value={`- ${money(SHIFT.expenses)}`} tone="warning" />
          </div>

          <div className="border-t border-border pt-4 grid grid-cols-2 gap-3">
            <Field label="Expected in Drawer" value={money(expected)} tone="brand" big />
            <div className="space-y-1.5">
              <Label htmlFor="physical">Physical Count *</Label>
              <Input id="physical" type="number" value={physical} onChange={e => setPhysical(Number(e.target.value))} className="h-11 text-lg tabular font-semibold" />
            </div>
          </div>

          <div className={cn(
            "rounded-md p-4 flex items-start gap-3",
            variance === 0 ? "bg-success-soft text-success" : Math.abs(variance) > 100 ? "bg-danger-soft text-danger" : "bg-warning-soft text-warning"
          )}>
            {variance === 0 ? <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" /> : <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />}
            <div>
              <p className="font-semibold">
                {variance === 0 ? "Perfect balance" : variance > 0 ? `Excess: ${money(variance)}` : `Short by: ${money(Math.abs(variance))}`}
              </p>
              <p className="text-xs mt-0.5 opacity-80">
                {variance === 0 ? "Drawer matches expected cash exactly." :
                 Math.abs(variance) > 100 ? "Variance exceeds AED 100 tolerance — manager approval required to close shift." :
                 "Within AED 100 tolerance — add remarks below."}
              </p>
            </div>
          </div>

          {variance !== 0 && (
            <div className="space-y-1.5">
              <Label>Variance Remarks</Label>
              <textarea
                placeholder="Explain the difference (rounding, undisputed tip, etc.)"
                className="w-full h-20 px-3 py-2 rounded-md border border-border bg-surface text-sm placeholder:text-subtle-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 outline-hidden resize-none"
              />
            </div>
          )}
        </Card>

        {/* Summary + close */}
        <Card className="p-5 h-fit space-y-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Shift Summary</p>
            <p className="text-xs text-muted-foreground mt-1">Auto-summed from transactions</p>
          </div>

          <dl className="space-y-2 text-sm">
            <SummaryRow label="Cash" v={money(SHIFT.cash)} />
            <SummaryRow label="Card" v={money(SHIFT.card)} />
            <SummaryRow label="UPI" v={money(SHIFT.upi)} />
            <SummaryRow label="Online" v={money(SHIFT.online)} />
            <div className="border-t border-border pt-2 mt-2">
              <SummaryRow label={<span className="font-semibold">Total Collected</span>} v={<span className="font-semibold tabular text-base">{money(totalCollected)}</span>} />
            </div>
            <SummaryRow label="Refunds" v={`- ${money(SHIFT.refunds)}`} tone="warning" />
            <SummaryRow label="Expenses" v={`- ${money(SHIFT.expenses)}`} tone="warning" />
          </dl>

          <div className="pt-3 border-t border-border space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Hand-over Notes</p>
            <textarea
              placeholder="For incoming cashier…"
              className="w-full h-16 px-3 py-2 rounded-md border border-border bg-surface text-xs placeholder:text-subtle-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 outline-hidden resize-none"
            />
          </div>

          <Button size="lg" className="w-full" variant={Math.abs(variance) > 100 ? "danger" : "success"}>
            <Send className="h-4 w-4" />
            {Math.abs(variance) > 100 ? "Submit for Manager Approval" : "Close Shift"}
          </Button>

          <div className="pt-3 border-t border-border flex items-center gap-2">
            <Avatar name={SHIFT.cashier} size={28} />
            <div className="text-xs">
              <p className="font-medium">{SHIFT.cashier}</p>
              <p className="text-muted-foreground">Shift {SHIFT.startedAt} — {SHIFT.endsAt}</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, value, tone, muted, big }: { label: string; value: string; tone?: "success" | "warning" | "brand"; muted?: boolean; big?: boolean }) {
  return (
    <div className="rounded-md border border-border p-3">
      <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
      <p className={cn("mt-1 tabular font-semibold",
        big ? "text-2xl" : "text-lg",
        tone === "success" && "text-success",
        tone === "warning" && "text-warning",
        tone === "brand" && "text-brand",
        muted && "text-muted-foreground",
      )}>{value}</p>
    </div>
  );
}

function SummaryRow({ label, v, tone }: { label: React.ReactNode; v: React.ReactNode; tone?: "warning" }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn("tabular text-sm font-medium", tone === "warning" && "text-warning")}>{v}</dd>
    </div>
  );
}
