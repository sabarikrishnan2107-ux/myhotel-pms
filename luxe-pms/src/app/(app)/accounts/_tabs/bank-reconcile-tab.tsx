"use client";
import * as React from "react";
import { FileDown, CheckCircle2, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { money, cn, formatDate } from "@/lib/utils";
import { BANK_ACCOUNTS, RECONCILE, type ReconcileEntry } from "../_data";

// ===================== BANK RECONCILE TAB =====================
export function BankReconcileTab({ onToast }: { onToast: (m: string) => void }) {
  const [activeAccount, setActiveAccount] = React.useState(BANK_ACCOUNTS[0].id);
  const [entries, setEntries] = React.useState<ReconcileEntry[]>(RECONCILE);
  const acc = BANK_ACCOUNTS.find(a => a.id === activeAccount)!;
  const accEntries = entries;
  const unmatched = accEntries.filter(e => !e.matched);
  const matchedCount = accEntries.length - unmatched.length;

  const handleMatch = (id: string, desc: string) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, matched: true } : e));
    onToast(`Matched: ${desc}`);
  };

  return (
    <div className="space-y-5">
      {/* Bank account chips */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {BANK_ACCOUNTS.map(a => {
          const diff = a.bookBalance - a.bankBalance;
          const isActive = activeAccount === a.id;
          return (
            <button key={a.id} type="button" onClick={() => setActiveAccount(a.id)} className={cn(
              "rounded-lg border p-4 text-left transition-all",
              isActive ? "bg-brand-soft border-brand shadow-xs" : "border-border hover:bg-surface-sunken hover:border-brand/40"
            )}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{a.name}</p>
                  <p className="text-sm font-medium">{a.bank}</p>
                </div>
                <Badge tone={diff === 0 ? "success" : "warning"}>{diff === 0 ? "Reconciled" : `${money(diff)} diff`}</Badge>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Book</p>
                  <p className="font-semibold tabular">{money(a.bookBalance)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Bank</p>
                  <p className="font-semibold tabular">{money(a.bankBalance)}</p>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 tabular">A/c {a.accountNo} · {a.ifsc}</p>
            </button>
          );
        })}
      </div>

      {/* Reconcile summary */}
      <Card className="p-4 bg-linear-to-br from-info-soft/40 via-surface to-surface border-info/30">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">{acc.name} reconciliation</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {matchedCount} matched · {unmatched.length} unmatched · {money(acc.uncleared)} uncleared
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onToast("Bank statement imported · 24 entries parsed")}>
              <FileDown className="h-3.5 w-3.5" />Import statement
            </Button>
            <Button variant="success" size="sm" disabled={unmatched.length > 0} onClick={() => onToast(`${acc.name} reconciled to ${formatDate(new Date().toISOString())}`)}>
              <CheckCircle2 className="h-3.5 w-3.5" />Mark reconciled
            </Button>
          </div>
        </div>
      </Card>

      {/* Reconcile table */}
      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-elevated border-b border-border">
            <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Ref</th>
              <th className="px-4 py-3 text-right">Debit</th>
              <th className="px-4 py-3 text-right">Credit</th>
              <th className="px-4 py-3 text-center">Match</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {accEntries.map(e => (
              <tr key={e.id} className={cn("hover:bg-surface-sunken/30", !e.matched && "bg-warning-soft/15")}>
                <td className="px-4 py-3 text-xs tabular">{formatDate(e.date)}</td>
                <td className="px-4 py-3">{e.description}</td>
                <td className="px-4 py-3"><Badge tone={e.source === "book" ? "brand" : "neutral"}>{e.source}</Badge></td>
                <td className="px-4 py-3 text-[11px] text-muted-foreground font-mono tabular">{e.ref}</td>
                <td className="px-4 py-3 text-right tabular">{e.debit > 0 ? money(e.debit) : "—"}</td>
                <td className="px-4 py-3 text-right tabular text-success">{e.credit > 0 ? money(e.credit) : "—"}</td>
                <td className="px-4 py-3 text-center">
                  {e.matched ? <CheckCircle2 className="h-4 w-4 text-success inline" /> : <AlertCircle className="h-4 w-4 text-warning inline" />}
                </td>
                <td className="px-4 py-3 text-right">
                  {!e.matched && (
                    <Button size="sm" variant="ghost" onClick={() => handleMatch(e.id, e.description)}>
                      Match
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
