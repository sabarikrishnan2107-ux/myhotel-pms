"use client";
import * as React from "react";
import { Printer } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { money, cn } from "@/lib/utils";
import { useProperty, hotelName } from "@/lib/use-property";
import { apiGet } from "@/lib/api";
import {
  BS_ASSETS, BS_LIABILITIES,
  type EntryType, type Entry,
} from "../_data";

// Private helper — only used by PnlBsTab
function PnlStat({ label, value, tone, big }: { label: string; value: string; tone?: "success" | "warning" | "brand" | "danger"; big?: boolean }) {
  return (
    <div className="rounded-md border border-border p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
      <p className={cn("mt-1 tabular font-semibold", big ? "text-xl" : "text-base",
        tone === "success" && "text-success", tone === "warning" && "text-warning",
        tone === "brand" && "text-brand", tone === "danger" && "text-danger")}>{value}</p>
    </div>
  );
}

type DeptRow = { category: string; dept: string; amount: number };
type DeptPnl = {
  departments: string[];
  revenue: DeptRow[];
  directCosts: DeptRow[];
  overhead: { category: string; amount: number }[];
  totals: { revenue: number; directCosts: number; grossProfit: number; overhead: number; netProfit: number };
};

// ===================== P&L + BALANCE SHEET TAB =====================
export function PnlBsTab({ entries }: { entries: Entry[] }) {
  const name = hotelName(useProperty());
  const [subtab, setSubtab] = React.useState<"pnl" | "bs">("pnl");

  // Departmental P&L from real endpoint
  const [dept, setDept] = React.useState<DeptPnl | null>(null);
  React.useEffect(() => {
    let cancelled = false;
    apiGet<DeptPnl>("/accounts/departmental").then(d => { if (!cancelled) setDept(d); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);
  const DEPTS = dept?.departments ?? ["Rooms", "F&B", "Banquet", "Spa", "Other"];

  // Actual P&L computed from the real day-book entries.
  const sumType = (t: EntryType) => entries.filter(e => e.type === t).reduce((s, e) => s + e.amount, 0);
  const byCategory = (t: EntryType) => {
    const m: Record<string, number> = {};
    for (const e of entries.filter(x => x.type === t)) m[e.category] = (m[e.category] ?? 0) + e.amount;
    return Object.entries(m).map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);
  };
  const actualIncome = sumType("income");
  const actualRefunds = sumType("refund");
  const actualExpense = sumType("expense");
  const actualNet = actualIncome - actualRefunds - actualExpense;
  const incomeRows = byCategory("income");
  const expenseRows = byCategory("expense");

  const totalRevenue = dept?.totals.revenue ?? 0;
  const grossProfit = dept?.totals.grossProfit ?? 0;
  const netProfit = dept?.totals.netProfit ?? 0;

  const totalAssets = BS_ASSETS.flatMap(g => g.items).reduce((t, i) => t + i.value, 0);
  const totalLiabEquity = BS_LIABILITIES.flatMap(g => g.items).reduce((t, i) => t + i.value, 0);

  return (
    <div className="space-y-5">
      <div className="flex gap-1">
        <button onClick={() => setSubtab("pnl")} className={cn("px-4 py-2 rounded-md text-sm font-medium", subtab === "pnl" ? "bg-brand text-brand-foreground" : "border border-border hover:bg-surface-sunken")}>
          Profit & Loss
        </button>
        <button onClick={() => setSubtab("bs")} className={cn("px-4 py-2 rounded-md text-sm font-medium", subtab === "bs" ? "bg-brand text-brand-foreground" : "border border-border hover:bg-surface-sunken")}>
          Balance Sheet
        </button>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="h-3.5 w-3.5" />Print
        </Button>
      </div>

      {subtab === "pnl" && (
        <Card className="p-5 border-brand/30">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display text-lg">Actual P&amp;L · from day-book</h3>
              <p className="text-xs text-muted-foreground">Computed live from posted entries · {entries.length} transactions</p>
            </div>
            <Badge tone={actualNet >= 0 ? "success" : "danger"}>{actualNet >= 0 ? "Profit" : "Loss"}</Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <PnlStat label="Revenue" value={money(actualIncome)} tone="success" />
            <PnlStat label="Refunds" value={`- ${money(actualRefunds)}`} tone="warning" />
            <PnlStat label="Expenses" value={`- ${money(actualExpense)}`} tone="warning" />
            <PnlStat label="Net Profit" value={money(actualNet)} tone={actualNet >= 0 ? "brand" : "danger"} big />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Income by category</p>
              <table className="w-full text-sm">
                <tbody>
                  {incomeRows.map(r => (
                    <tr key={r.category} className="border-b border-border/40">
                      <td className="py-1.5">{r.category}</td>
                      <td className="py-1.5 text-right tabular text-success">{money(r.amount)}</td>
                    </tr>
                  ))}
                  {incomeRows.length === 0 && <tr><td className="py-3 text-muted-foreground text-xs">No income entries yet.</td></tr>}
                </tbody>
              </table>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Expenses by category</p>
              <table className="w-full text-sm">
                <tbody>
                  {expenseRows.map(r => (
                    <tr key={r.category} className="border-b border-border/40">
                      <td className="py-1.5">{r.category}</td>
                      <td className="py-1.5 text-right tabular text-warning">{money(r.amount)}</td>
                    </tr>
                  ))}
                  {expenseRows.length === 0 && <tr><td className="py-3 text-muted-foreground text-xs">No expense entries yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}

      {subtab === "pnl" && (
        <Card className="p-5">
          <div className="text-center mb-4">
            <h3 className="font-display text-xl">Departmental P&amp;L Statement</h3>
            <p className="text-xs text-muted-foreground">Live departmental view · MYHOTEL — {name}</p>
          </div>
          {dept && dept.revenue.length === 0 && dept.directCosts.length === 0 && dept.overhead.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-6">No posted entries yet for a departmental view.</p>
          )}
          <table className="w-full text-sm">
            <thead className="border-y-2 border-foreground">
              <tr>
                <th className="text-left py-2 px-2">Particulars</th>
                {DEPTS.map(d => <th key={d} className="text-right py-2 px-2">{d}</th>)}
                <th className="text-right py-2 px-2 font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr><td colSpan={DEPTS.length + 2} className="pt-3 pb-1 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Revenue</td></tr>
              {(dept?.revenue ?? []).map((r, i) => (
                <tr key={`rev-${i}`} className="border-b border-border/40">
                  <td className="py-1.5 px-2">{r.category}</td>
                  {DEPTS.map(d => <td key={d} className="py-1.5 px-2 text-right tabular text-muted-foreground">{r.dept === d ? money(r.amount) : "—"}</td>)}
                  <td className="py-1.5 px-2 text-right tabular font-medium">{money(r.amount)}</td>
                </tr>
              ))}
              <tr className="border-t border-border font-semibold">
                <td className="py-1.5 px-2">Total Revenue</td>
                <td colSpan={DEPTS.length} />
                <td className="py-1.5 px-2 text-right tabular text-success">{money(totalRevenue)}</td>
              </tr>

              <tr><td colSpan={DEPTS.length + 2} className="pt-3 pb-1 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Direct Costs</td></tr>
              {(dept?.directCosts ?? []).map((r, i) => (
                <tr key={`dc-${i}`} className="border-b border-border/40">
                  <td className="py-1.5 px-2">{r.category}</td>
                  {DEPTS.map(d => <td key={d} className="py-1.5 px-2 text-right tabular text-muted-foreground">{r.dept === d ? money(r.amount) : "—"}</td>)}
                  <td className="py-1.5 px-2 text-right tabular">{money(r.amount)}</td>
                </tr>
              ))}
              <tr className="border-t border-border font-semibold bg-surface-sunken/30">
                <td className="py-2 px-2">Gross Profit</td>
                <td colSpan={DEPTS.length} />
                <td className="py-2 px-2 text-right tabular text-success text-base">{money(grossProfit)}</td>
              </tr>

              <tr><td colSpan={DEPTS.length + 2} className="pt-3 pb-1 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Overhead</td></tr>
              {(dept?.overhead ?? []).map((r, i) => (
                <tr key={`oh-${i}`} className="border-b border-border/40">
                  <td className="py-1.5 px-2">{r.category}</td>
                  <td colSpan={DEPTS.length} />
                  <td className="py-1.5 px-2 text-right tabular">{money(r.amount)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-foreground font-bold bg-success-soft/30">
                <td className="py-2.5 px-2">Net Profit (before tax)</td>
                <td colSpan={DEPTS.length} />
                <td className="py-2.5 px-2 text-right tabular text-success text-lg">{money(netProfit)}</td>
              </tr>
            </tbody>
          </table>
        </Card>
      )}

      {subtab === "bs" && (
        <Card className="p-5">
          <div className="text-center mb-4">
            <h3 className="font-display text-xl">Balance Sheet</h3>
            <p className="text-xs text-muted-foreground">As at 31 May 2026 · MYHOTEL — {name}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Liabilities + Equity */}
            <div>
              <p className="text-xs uppercase tracking-wider font-bold border-b-2 border-foreground pb-1">Liabilities &amp; Equity</p>
              {BS_LIABILITIES.map(g => (
                <div key={g.group} className="mt-3">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{g.group}</p>
                  <ul className="mt-1">
                    {g.items.map((i, idx) => (
                      <li key={idx} className="flex justify-between py-1 border-b border-border/40 text-sm">
                        <span>{i.name}</span>
                        <span className="tabular">{money(i.value)}</span>
                      </li>
                    ))}
                    <li className="flex justify-between py-1 font-semibold border-t border-border text-sm">
                      <span>Sub-total</span>
                      <span className="tabular">{money(g.items.reduce((t, i) => t + i.value, 0))}</span>
                    </li>
                  </ul>
                </div>
              ))}
              <div className="flex justify-between pt-3 mt-3 border-t-2 border-foreground font-bold text-base">
                <span>Total</span>
                <span className="tabular">{money(totalLiabEquity)}</span>
              </div>
            </div>
            {/* Assets */}
            <div>
              <p className="text-xs uppercase tracking-wider font-bold border-b-2 border-foreground pb-1">Assets</p>
              {BS_ASSETS.map(g => (
                <div key={g.group} className="mt-3">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{g.group}</p>
                  <ul className="mt-1">
                    {g.items.map((i, idx) => (
                      <li key={idx} className={cn("flex justify-between py-1 border-b border-border/40 text-sm", i.value < 0 && "text-muted-foreground italic")}>
                        <span>{i.name}</span>
                        <span className="tabular">{money(i.value)}</span>
                      </li>
                    ))}
                    <li className="flex justify-between py-1 font-semibold border-t border-border text-sm">
                      <span>Sub-total</span>
                      <span className="tabular">{money(g.items.reduce((t, i) => t + i.value, 0))}</span>
                    </li>
                  </ul>
                </div>
              ))}
              <div className="flex justify-between pt-3 mt-3 border-t-2 border-foreground font-bold text-base">
                <span>Total</span>
                <span className="tabular">{money(totalAssets)}</span>
              </div>
            </div>
          </div>
          <div className="mt-4 text-center text-xs text-muted-foreground italic">
            {totalAssets === totalLiabEquity ? "✓ Balance sheet tallies" : `⚠ Difference: ${money(Math.abs(totalAssets - totalLiabEquity))}`}
          </div>
        </Card>
      )}
    </div>
  );
}
