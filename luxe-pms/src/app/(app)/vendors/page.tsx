"use client";
import * as React from "react";
import { Plus, Search, Truck, Wallet, Phone, FileText, LayoutGrid, List, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { KPICard } from "@/components/ui/kpi-card";
import { VENDORS } from "@/lib/mock-data-ext";
import { money, cn } from "@/lib/utils";
import { apiGet } from "@/lib/api";

const TABS = [
  { id: "all", label: "All" },
  { id: "outstanding", label: "Outstanding" },
  { id: "settled", label: "Settled" },
] as const;
type TabId = typeof TABS[number]["id"];

export default function VendorsPage() {
  const [tab, setTab] = React.useState<TabId>("all");
  const [view, setView] = React.useState<"cards" | "list">("cards");
  const [q, setQ] = React.useState("");

  const [vendors, setVendors] = React.useState(VENDORS);
  React.useEffect(() => {
    let cancelled = false;
    apiGet<typeof VENDORS>("/vendors").then(r => { if (!cancelled) setVendors(r); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const filtered = vendors.filter(v => {
    if (q && !`${v.name} ${v.contact} ${v.phone}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (tab === "outstanding" && v.outstanding === 0) return false;
    if (tab === "settled" && v.outstanding > 0) return false;
    return true;
  });

  const outstanding = vendors.reduce((s, v) => s + v.outstanding, 0);
  const counts = {
    all: vendors.length,
    outstanding: vendors.filter(v => v.outstanding > 0).length,
    settled: vendors.filter(v => v.outstanding === 0).length,
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-medium tracking-tight">Vendors</h1>
          <p className="text-muted-foreground text-sm mt-1">Suppliers, purchases, accounts payable</p>
        </div>
        <Button><Plus className="h-4 w-4" />New Vendor</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard label="Vendors" value={vendors.length} icon={Truck} accent="brand" />
        <KPICard label="Outstanding" value={money(outstanding)} icon={Wallet} accent="warning" />
        <KPICard label="Due This Week" value={money(8400)} icon={FileText} accent="info" />
        <KPICard label="Paid This Month" value={money(42100)} icon={Wallet} accent="success" />
      </div>

      {/* Tabs */}
      <div className="border-b border-border flex items-center gap-1">
        {TABS.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors inline-flex items-center gap-2",
              tab === t.id ? "border-brand text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
            <span className={cn(
              "tabular text-[10px] rounded-full px-1.5 h-4 inline-flex items-center",
              tab === t.id ? "bg-brand-soft text-brand-soft-foreground" : "bg-surface-sunken"
            )}>
              {counts[t.id]}
            </span>
          </button>
        ))}
      </div>

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle-foreground" />
            <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search vendors by name or contact…" className="pl-9 h-9" />
          </div>
          <div className="flex-1" />
          {/* View toggle */}
          <div className="inline-flex rounded-md border border-border overflow-hidden h-9">
            <button
              type="button"
              onClick={() => setView("cards")}
              className={cn(
                "h-full px-3 inline-flex items-center gap-1.5 text-xs font-medium border-r border-border transition-colors",
                view === "cards" ? "bg-brand text-brand-foreground" : "hover:bg-surface-sunken text-muted-foreground"
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Cards</span>
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              className={cn(
                "h-full px-3 inline-flex items-center gap-1.5 text-xs font-medium transition-colors",
                view === "list" ? "bg-brand text-brand-foreground" : "hover:bg-surface-sunken text-muted-foreground"
              )}
            >
              <List className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">List</span>
            </button>
          </div>
        </div>
      </Card>

      <div className="text-xs text-muted-foreground">
        Showing <span className="font-medium text-foreground">{filtered.length}</span> of {vendors.length} vendors
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <Search className="h-8 w-8 mx-auto text-subtle-foreground" />
          <p className="mt-3 font-medium">No vendors match your filters</p>
        </Card>
      ) : view === "cards" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(v => (
            <Card key={v.id} className={cn(
              "p-5 hover:shadow-md transition-shadow border-l-4",
              v.outstanding > 0 ? "border-l-warning" : "border-l-success"
            )}>
              <div className="flex items-start gap-3">
                <Avatar name={v.name} size={44} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{v.name}</p>
                  <p className="text-xs text-muted-foreground">{v.contact}</p>
                  <p className="text-xs text-muted-foreground inline-flex items-center gap-1 mt-0.5"><Phone className="h-3 w-3" />{v.phone}</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-muted-foreground uppercase tracking-wider text-[10px] font-semibold">Terms</p>
                  <p className="font-medium mt-0.5">{v.terms}</p>
                </div>
                <div>
                  <p className="text-muted-foreground uppercase tracking-wider text-[10px] font-semibold">Last Invoice</p>
                  <p className="font-medium mt-0.5">{v.lastInvoice}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground uppercase tracking-wider text-[10px] font-semibold">Outstanding</p>
                  <p className={cn("text-lg font-semibold tabular mt-0.5", v.outstanding > 0 ? "text-warning" : "text-success")}>
                    {money(v.outstanding)}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button variant="secondary" size="sm" className="flex-1">View</Button>
                {v.outstanding > 0 ? (
                  <Button size="sm" className="flex-1">Pay</Button>
                ) : (
                  <Badge tone="success" className="flex-1 justify-center"><CheckCircle2 className="h-3 w-3" />Cleared</Badge>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-elevated border-b border-border">
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-semibold">Vendor</th>
                <th className="px-4 py-3 font-semibold">Contact</th>
                <th className="px-4 py-3 font-semibold">Phone</th>
                <th className="px-4 py-3 font-semibold">Terms</th>
                <th className="px-4 py-3 font-semibold">Last Invoice</th>
                <th className="px-4 py-3 font-semibold text-right">Outstanding</th>
                <th className="px-4 py-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(v => (
                <tr key={v.id} className="hover:bg-surface-sunken/50 transition-colors group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={v.name} size={32} />
                      <span className="font-medium">{v.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{v.contact}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground tabular">{v.phone}</td>
                  <td className="px-4 py-3"><Badge tone="neutral">{v.terms}</Badge></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{v.lastInvoice}</td>
                  <td className={cn("px-4 py-3 text-right tabular font-medium", v.outstanding > 0 ? "text-warning" : "text-success")}>
                    {v.outstanding > 0 ? money(v.outstanding) : "Cleared"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <Button variant="ghost" size="sm">View</Button>
                      {v.outstanding > 0 && <Button size="sm">Pay</Button>}
                    </div>
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
