"use client";
import * as React from "react";
import { Plus, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { money, cn, formatDate } from "@/lib/utils";
import { CHART_OF_ACCOUNTS, JOURNAL_ENTRIES, type JournalEntry } from "../_data";

// ===================== JOURNAL + CHART OF ACCOUNTS TAB =====================
export function JournalTab({ onToast }: { onToast: (m: string) => void }) {
  const [subtab, setSubtab] = React.useState<"journal" | "coa">("journal");
  const [entries, setEntries] = React.useState<JournalEntry[]>(JOURNAL_ENTRIES);

  const handlePost = (id: string) => {
    setEntries(prev => prev.map(je => je.id === id ? { ...je, status: "Posted" as const, postedBy: "Khalid R." } : je));
    onToast(`Journal voucher posted to ledger`);
  };

  return (
    <div className="space-y-5">
      <div className="flex gap-1">
        <button onClick={() => setSubtab("journal")} className={cn("px-4 py-2 rounded-md text-sm font-medium", subtab === "journal" ? "bg-brand text-brand-foreground" : "border border-border hover:bg-surface-sunken")}>
          Journal Entries
        </button>
        <button onClick={() => setSubtab("coa")} className={cn("px-4 py-2 rounded-md text-sm font-medium", subtab === "coa" ? "bg-brand text-brand-foreground" : "border border-border hover:bg-surface-sunken")}>
          Chart of Accounts
        </button>
        <div className="flex-1" />
        <Button size="sm" onClick={() => onToast("New journal voucher form opened")}>
          <Plus className="h-3.5 w-3.5" />New JV
        </Button>
      </div>

      {subtab === "journal" && (
        <div className="space-y-3">
          {entries.map(je => (
            <Card key={je.id} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-semibold">{je.voucherNo}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(je.date)} · {je.narration}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={je.status === "Posted" ? "success" : "warning"}>{je.status}</Badge>
                  <p className="text-[11px] text-muted-foreground">by {je.postedBy}</p>
                </div>
              </div>
              <table className="w-full text-sm border-t border-border">
                <thead>
                  <tr className="text-xs text-muted-foreground uppercase tracking-wider">
                    <th className="text-left py-2">Account</th>
                    <th className="text-right py-2">Debit</th>
                    <th className="text-right py-2">Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {je.lines.map((l, idx) => (
                    <tr key={idx} className="border-b border-border/40">
                      <td className="py-1.5">{l.account}</td>
                      <td className="py-1.5 text-right tabular">{l.debit > 0 ? money(l.debit) : "—"}</td>
                      <td className="py-1.5 text-right tabular">{l.credit > 0 ? money(l.credit) : "—"}</td>
                    </tr>
                  ))}
                  <tr className="font-semibold">
                    <td className="py-1.5">Total</td>
                    <td className="py-1.5 text-right tabular">{money(je.lines.reduce((t, l) => t + l.debit, 0))}</td>
                    <td className="py-1.5 text-right tabular">{money(je.lines.reduce((t, l) => t + l.credit, 0))}</td>
                  </tr>
                </tbody>
              </table>
              {je.status === "Draft" && (
                <div className="mt-3 flex justify-end">
                  <Button size="sm" variant="success" onClick={() => handlePost(je.id)}>
                    <CheckCircle2 className="h-3.5 w-3.5" />Post to ledger
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {subtab === "coa" && (
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-elevated border-b border-border">
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Account</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3 text-right">Balance</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {CHART_OF_ACCOUNTS.map(a => (
                <tr key={a.code} className="hover:bg-surface-sunken/30">
                  <td className="px-4 py-3 font-mono tabular text-xs">{a.code}</td>
                  <td className="px-4 py-3 font-medium">{a.name}</td>
                  <td className="px-4 py-3">
                    <Badge tone={
                      a.type === "Asset" ? "info" :
                      a.type === "Liability" ? "warning" :
                      a.type === "Equity" ? "brand" :
                      a.type === "Revenue" ? "success" : "danger"
                    }>{a.type}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right tabular font-medium">{money(a.balance)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="ghost" onClick={() => {
                      // Generate a mock ledger CSV download for this account
                      const sampleRows = [
                        ["Date", "Voucher", "Particulars", "Debit", "Credit", "Balance"],
                        ["2026-05-01", "OB", `Opening balance for ${a.name}`, "0.00", "0.00", a.balance.toFixed(2)],
                        ["2026-05-12", "JV-001", "Periodic adjustment", (a.balance * 0.1).toFixed(2), "0.00", (a.balance * 1.1).toFixed(2)],
                        ["2026-05-22", "RCP-220", "Receipt entry", "0.00", (a.balance * 0.05).toFixed(2), (a.balance * 1.05).toFixed(2)],
                      ];
                      const csv = sampleRows.map(r => r.join(",")).join("\n");
                      const blob = new Blob([csv], { type: "text/csv" });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement("a");
                      link.href = url; link.download = `ledger-${a.code}-${a.name.replace(/\s/g, "_")}.csv`; link.click();
                      URL.revokeObjectURL(url);
                      onToast(`Ledger CSV downloaded · ${a.name} (${a.code})`);
                    }}>
                      View ledger
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
