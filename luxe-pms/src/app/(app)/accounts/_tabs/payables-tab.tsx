"use client";
import * as React from "react";
import { Plus, Wallet, AlertCircle, FileText, Receipt } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KPICard } from "@/components/ui/kpi-card";
import { money, cn, formatDate } from "@/lib/utils";
import { VENDOR_BILLS, type VendorBill } from "../_data";

// ===================== VENDOR BILLS / PAYABLES TAB =====================
export function PayablesTab({ onToast }: { onToast: (m: string) => void }) {
  const [statusFilter, setStatusFilter] = React.useState<"all" | VendorBill["status"]>("all");
  const list = VENDOR_BILLS.filter(b => statusFilter === "all" || b.status === statusFilter);

  const totalOutstanding = VENDOR_BILLS.reduce((t, b) => t + (b.netPayable - b.paid), 0);
  const totalTDS = VENDOR_BILLS.reduce((t, b) => t + b.tdsAmount, 0);
  const overdueAmount = VENDOR_BILLS.filter(b => b.status === "Overdue").reduce((t, b) => t + (b.netPayable - b.paid), 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPICard label="Total bills" value={VENDOR_BILLS.length} icon={FileText} accent="brand" />
        <KPICard label="Outstanding" value={money(totalOutstanding)} icon={Wallet} accent="warning" />
        <KPICard label="Overdue" value={money(overdueAmount)} icon={AlertCircle} accent={overdueAmount > 0 ? "danger" : "success"} />
        <KPICard label="TDS to deposit" value={money(totalTDS)} icon={Receipt} accent="info" hint="Quarterly 26Q" />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {(["all", "Draft", "Approved", "Partial", "Paid", "Overdue"] as ("all" | VendorBill["status"])[]).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} className={cn(
            "h-8 px-3 rounded-full text-xs font-medium border transition-colors",
            statusFilter === s ? "bg-foreground text-background border-foreground" : "border-border hover:bg-surface-sunken text-muted-foreground"
          )}>
            {s === "all" ? "All" : s} · {s === "all" ? VENDOR_BILLS.length : VENDOR_BILLS.filter(b => b.status === s).length}
          </button>
        ))}
        <div className="flex-1" />
        <Button size="sm" onClick={() => onToast("New vendor bill form opened")}>
          <Plus className="h-3.5 w-3.5" />New bill
        </Button>
      </div>

      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-elevated border-b border-border">
            <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3">Bill #</th>
              <th className="px-4 py-3">Vendor</th>
              <th className="px-4 py-3">Bill / Due</th>
              <th className="px-4 py-3 text-right">Taxable</th>
              <th className="px-4 py-3 text-right">GST</th>
              <th className="px-4 py-3 text-right">TDS</th>
              <th className="px-4 py-3 text-right">Net Payable</th>
              <th className="px-4 py-3 text-right">Paid</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {list.map(b => {
              const balance = b.netPayable - b.paid;
              return (
                <tr key={b.id} className={cn("hover:bg-surface-sunken/30", b.status === "Overdue" && "bg-danger-soft/20")}>
                  <td className="px-4 py-3 font-mono tabular text-xs">{b.billNo}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{b.vendor}</p>
                    <Badge tone="neutral">{b.category}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <p className="tabular text-muted-foreground">{formatDate(b.billDate)}</p>
                    <p className={cn("tabular font-medium", b.status === "Overdue" && "text-danger")}>Due {formatDate(b.dueDate)}</p>
                  </td>
                  <td className="px-4 py-3 text-right tabular">{money(b.taxableValue)}</td>
                  <td className="px-4 py-3 text-right tabular text-muted-foreground">{money(b.gst)}</td>
                  <td className="px-4 py-3 text-right tabular text-info">{b.tdsAmount > 0 ? `${money(b.tdsAmount)} (${b.tdsRate}%)` : "—"}</td>
                  <td className="px-4 py-3 text-right tabular font-semibold">{money(b.netPayable)}</td>
                  <td className="px-4 py-3 text-right tabular text-success">{money(b.paid)}</td>
                  <td className="px-4 py-3"><Badge tone={b.status === "Paid" ? "success" : b.status === "Overdue" ? "danger" : b.status === "Partial" ? "warning" : b.status === "Draft" ? "neutral" : "info"}>{b.status}</Badge></td>
                  <td className="px-4 py-3 text-right">
                    {balance > 0 && (
                      <Button size="sm" variant="success" onClick={() => onToast(`Payment voucher created · ${money(balance)} to ${b.vendor}`)}>
                        Pay {money(balance)}
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
