"use client";
import * as React from "react";
import { Wallet, AlertCircle, CheckCircle2, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KPICard } from "@/components/ui/kpi-card";
import { money, formatDate } from "@/lib/utils";
import { apiGet } from "@/lib/api";

// ===================== TYPES =====================
type ReceivableRow = {
  guest: string;
  bookings: number;
  current: number;
  d1_30: number;
  d31_60: number;
  d60plus: number;
  total: number;
  oldestDue: string;
};

type ReceivablesResponse = {
  rows: ReceivableRow[];
  totals: {
    total: number;
    current: number;
    d1_30: number;
    d31_60: number;
    d60plus: number;
    accounts: number;
  };
};

// ===================== RECEIVABLES AGING TAB =====================
export function ReceivablesTab({ onToast }: { onToast: (m: string) => void }) {
  const [data, setData] = React.useState<ReceivablesResponse | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    apiGet<ReceivablesResponse>("/accounts/receivables")
      .then(setData)
      .catch(() => onToast("Failed to load receivables"))
      .finally(() => setLoading(false));
  }, [onToast]);

  if (loading) {
    return <div className="py-16 text-center text-muted-foreground text-sm">Loading receivables…</div>;
  }

  const rows = data?.rows ?? [];
  const totals = data?.totals ?? { total: 0, current: 0, d1_30: 0, d31_60: 0, d60plus: 0, accounts: 0 };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPICard label="Total receivables" value={money(totals.total)} icon={Wallet} accent="brand" />
        <KPICard label="Current" value={money(totals.current)} icon={CheckCircle2} accent="success" />
        <KPICard label=">60 days" value={money(totals.d60plus)} icon={AlertCircle} accent={totals.d60plus > 0 ? "danger" : "success"} />
        <KPICard label="Guests" value={totals.accounts} icon={Users} accent="info" />
      </div>

      <Card className="p-0 overflow-hidden">
        {rows.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground text-sm">
            No outstanding receivables
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-elevated border-b border-border">
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">Guest</th>
                <th className="px-4 py-3 text-right">Current</th>
                <th className="px-4 py-3 text-right">1–30d</th>
                <th className="px-4 py-3 text-right">31–60d</th>
                <th className="px-4 py-3 text-right">60+</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map(r => (
                <tr key={r.guest} className="hover:bg-surface-sunken/30">
                  <td className="px-4 py-3">
                    <p className="font-medium">{r.guest}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {r.bookings} booking{r.bookings !== 1 ? "s" : ""} · oldest due {formatDate(r.oldestDue)}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-right tabular">{r.current > 0 ? money(r.current) : "—"}</td>
                  <td className="px-4 py-3 text-right tabular">{r.d1_30 > 0 ? money(r.d1_30) : "—"}</td>
                  <td className="px-4 py-3 text-right tabular text-warning">{r.d31_60 > 0 ? money(r.d31_60) : "—"}</td>
                  <td className="px-4 py-3 text-right tabular text-danger">{r.d60plus > 0 ? money(r.d60plus) : "—"}</td>
                  <td className="px-4 py-3 text-right tabular font-semibold">{money(r.total)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => {
                        const soa = {
                          guest: r.guest,
                          asOf: new Date().toISOString().slice(0, 10),
                          bookings: r.bookings,
                          aging: {
                            current: r.current,
                            "1-30": r.d1_30,
                            "31-60": r.d31_60,
                            "60+": r.d60plus,
                          },
                          total: r.total,
                          oldestDue: r.oldestDue,
                        };
                        const blob = new Blob([JSON.stringify(soa, null, 2)], { type: "application/json" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `SOA-${r.guest.replace(/\s/g, "_")}-${soa.asOf}.json`;
                        a.click();
                        URL.revokeObjectURL(url);
                        onToast(`Statement downloaded for ${r.guest}`);
                      }}>
                        Statement
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => onToast(`Reminder sent to ${r.guest} · ${money(r.total)} outstanding`)}>
                        Remind
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
