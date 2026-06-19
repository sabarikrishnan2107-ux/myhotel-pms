"use client";
import * as React from "react";
import { Wallet, AlertCircle, CheckCircle2, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KPICard } from "@/components/ui/kpi-card";
import { money, cn, formatDate } from "@/lib/utils";
import { RECEIVABLES } from "../_data";

// ===================== RECEIVABLES AGING TAB =====================
export function ReceivablesTab({ onToast }: { onToast: (m: string) => void }) {
  const totalReceivables = RECEIVABLES.reduce((t, r) => t + r.total, 0);
  const totalCurrent = RECEIVABLES.reduce((t, r) => t + r.current, 0);
  const total90plus = RECEIVABLES.reduce((t, r) => t + r.b90 + r.b90plus, 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPICard label="Total receivables" value={money(totalReceivables)} icon={Wallet} accent="brand" />
        <KPICard label="Current" value={money(totalCurrent)} icon={CheckCircle2} accent="success" />
        <KPICard label=">90 days" value={money(total90plus)} icon={AlertCircle} accent={total90plus > 0 ? "danger" : "success"} />
        <KPICard label="Active accounts" value={RECEIVABLES.length} icon={Users} accent="info" />
      </div>

      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-elevated border-b border-border">
            <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3">Agent / Corporate</th>
              <th className="px-4 py-3 text-right">Current</th>
              <th className="px-4 py-3 text-right">31–60d</th>
              <th className="px-4 py-3 text-right">61–90d</th>
              <th className="px-4 py-3 text-right">90+</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3">Credit utilization</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {RECEIVABLES.map(r => {
              const util = Math.round((r.total / r.creditLimit) * 100);
              return (
                <tr key={r.id} className="hover:bg-surface-sunken/30">
                  <td className="px-4 py-3">
                    <p className="font-medium">{r.agent}</p>
                    <p className="text-[11px] text-muted-foreground">{r.type} · {r.invoices} invoices · last paid {formatDate(r.lastPayment)}</p>
                  </td>
                  <td className="px-4 py-3 text-right tabular">{r.current > 0 ? money(r.current) : "—"}</td>
                  <td className="px-4 py-3 text-right tabular">{r.b30 > 0 ? money(r.b30) : "—"}</td>
                  <td className="px-4 py-3 text-right tabular text-warning">{r.b60 > 0 ? money(r.b60) : "—"}</td>
                  <td className="px-4 py-3 text-right tabular text-danger">{(r.b90 + r.b90plus) > 0 ? money(r.b90 + r.b90plus) : "—"}</td>
                  <td className="px-4 py-3 text-right tabular font-semibold">{money(r.total)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 bg-surface-sunken rounded-full overflow-hidden">
                        <div className={cn("h-full", util >= 80 ? "bg-danger" : util >= 50 ? "bg-warning" : "bg-success")} style={{ width: `${Math.min(100, util)}%` }} />
                      </div>
                      <p className="text-[11px] tabular text-muted-foreground">{util}%</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => {
                        const soa = {
                          accountName: r.agent,
                          type: r.type,
                          asOf: new Date().toISOString().slice(0, 10),
                          invoices: r.invoices,
                          aging: {
                            current: r.current, "31-60": r.b30, "61-90": r.b60,
                            "90+": r.b90 + r.b90plus,
                          },
                          total: r.total,
                          creditLimit: r.creditLimit,
                          lastPayment: r.lastPayment,
                        };
                        const blob = new Blob([JSON.stringify(soa, null, 2)], { type: "application/json" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url; a.download = `SOA-${r.agent.replace(/\s/g, "_")}-${soa.asOf}.json`; a.click();
                        URL.revokeObjectURL(url);
                        onToast(`Statement downloaded for ${r.agent}`);
                      }}>
                        Statement
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => onToast(`Reminder sent to ${r.agent} · Email + WhatsApp · ${money(r.total)} outstanding`)}>
                        Remind
                      </Button>
                    </div>
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
