"use client";
import * as React from "react";
import Link from "next/link";
import {
  Receipt, Search, Crown, Eye, Printer, Send, AlertCircle,
  IndianRupee, Users, FileText, Filter, CheckCircle2, X,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge, PaymentBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { KPICard } from "@/components/ui/kpi-card";
import { RESERVATIONS } from "@/lib/mock-data";
import type { PaymentStatus } from "@/lib/types";
import { money, formatTime, cn } from "@/lib/utils";

type SortKey = "balance-desc" | "balance-asc" | "checkin-asc" | "name-asc";

export default function FolioListPage() {
  const [search, setSearch] = React.useState("");
  const [paymentFilter, setPaymentFilter] = React.useState<"all" | PaymentStatus>("all");
  const [sourceFilter, setSourceFilter] = React.useState<"all" | string>("all");
  const [sort, setSort] = React.useState<SortKey>("balance-desc");
  const [toast, setToast] = React.useState<string | null>(null);
  const [remindedAt, setRemindedAt] = React.useState<Record<string, number>>({});

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };

  // Active folios = anything not fully paid
  const allFolios = RESERVATIONS.filter(r => r.paymentStatus !== "paid" || r.balance > 0);

  const filtered = React.useMemo(() => {
    const list = allFolios.filter(r => {
      if (search && !`${r.guestName} ${r.bookingNo} ${r.roomNumber} ${r.source}`.toLowerCase().includes(search.toLowerCase())) return false;
      if (paymentFilter !== "all" && r.paymentStatus !== paymentFilter) return false;
      if (sourceFilter !== "all" && r.source !== sourceFilter) return false;
      return true;
    });
    return [...list].sort((a, b) => {
      if (sort === "balance-desc") return b.balance - a.balance;
      if (sort === "balance-asc")  return a.balance - b.balance;
      if (sort === "checkin-asc")  return new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime();
      return a.guestName.localeCompare(b.guestName);
    });
  }, [allFolios, search, paymentFilter, sourceFilter, sort]);

  const totalOutstanding = allFolios.reduce((t, r) => t + r.balance, 0);
  const totalCharges = allFolios.reduce((t, r) => t + r.total, 0);
  const unpaidCount = allFolios.filter(r => r.paymentStatus === "unpaid").length;
  const partialCount = allFolios.filter(r => r.paymentStatus === "partial").length;
  const avgBalance = allFolios.length > 0 ? Math.round(totalOutstanding / allFolios.length) : 0;
  const sources = Array.from(new Set(RESERVATIONS.map(r => r.source)));
  const activeFilters = (paymentFilter !== "all" ? 1 : 0) + (sourceFilter !== "all" ? 1 : 0) + (search ? 1 : 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-medium tracking-tight">Guest Folios</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Active charges, payments &amp; balance tracking across all in-house guests
          </p>
        </div>
        <Link href="/checkout"><Button variant="outline"><Receipt className="h-4 w-4" />Checkout queue</Button></Link>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KPICard label="Active folios" value={allFolios.length} icon={Users} accent="brand" />
        <KPICard label="Outstanding" value={money(totalOutstanding)} icon={IndianRupee} accent={totalOutstanding > 0 ? "warning" : "success"} />
        <KPICard label="Total charges" value={money(totalCharges)} icon={Receipt} accent="info" />
        <KPICard label="Unpaid" value={unpaidCount} icon={AlertCircle} accent={unpaidCount > 0 ? "danger" : "success"} hint={`${partialCount} partial`} />
        <KPICard label="Avg balance" value={money(avgBalance)} icon={IndianRupee} accent="accent" hint="per folio" />
      </div>

      {/* Payment status chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        {(["all", "unpaid", "partial", "paid", "refunded"] as ("all" | PaymentStatus)[]).map(s => {
          const count = s === "all" ? allFolios.length : allFolios.filter(r => r.paymentStatus === s).length;
          const dot = s === "unpaid" ? "bg-danger" : s === "partial" ? "bg-warning" : s === "paid" ? "bg-success" : s === "refunded" ? "bg-muted-foreground" : null;
          return (
            <button
              key={s}
              onClick={() => setPaymentFilter(s)}
              className={cn(
                "h-8 px-3 rounded-full text-xs font-medium border transition-colors inline-flex items-center gap-2",
                paymentFilter === s ? "bg-foreground text-background border-foreground shadow-xs" : "bg-surface text-muted-foreground border-border hover:bg-surface-sunken hover:text-foreground"
              )}
            >
              {dot && <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />}
              {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
              <span className={cn(
                "tabular text-[10px] rounded-full px-1.5 h-4 inline-flex items-center font-semibold",
                paymentFilter === s ? "bg-background/15 text-background" : "bg-surface-sunken text-muted-foreground"
              )}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Filter / sort bar */}
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search guest, booking #, room, source…" className="pl-9 h-9" />
          </div>
          <Select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} className="h-9 w-auto">
            <option value="all">All sources</option>
            {sources.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Select value={sort} onChange={e => setSort(e.target.value as SortKey)} className="h-9 w-auto" title="Sort">
            <option value="balance-desc">Highest balance first</option>
            <option value="balance-asc">Lowest balance first</option>
            <option value="checkin-asc">Check-in date</option>
            <option value="name-asc">Guest name (A–Z)</option>
          </Select>
          {activeFilters > 0 && (
            <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setPaymentFilter("all"); setSourceFilter("all"); }}>
              <X className="h-3.5 w-3.5" />Clear ({activeFilters})
            </Button>
          )}
          <div className="flex-1" />
          <p className="text-xs text-muted-foreground tabular">
            <span className="font-medium text-foreground">{filtered.length}</span> of {allFolios.length} folios
          </p>
        </div>
      </Card>

      {/* Folio list */}
      <Card className="p-0 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Search className="h-8 w-8 mx-auto text-subtle-foreground mb-2" />
            <p className="font-medium">No folios match your filters</p>
            <p className="text-xs text-muted-foreground mt-1">Adjust filters above or search by guest / booking #</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map(r => {
              const pct = r.total > 0 ? Math.round((r.advance / r.total) * 100) : 0;
              return (
                <li
                  key={r.id}
                  className={cn(
                    "flex items-center gap-4 p-4 transition-colors hover:bg-surface-sunken/50",
                    r.balance > 0 && "border-l-4",
                    r.paymentStatus === "unpaid" && "border-l-danger/50",
                    r.paymentStatus === "partial" && "border-l-warning/50",
                  )}
                >
                  <Avatar name={r.guestName} size={42} vip={r.vip} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate">{r.guestName}</p>
                      {r.vip && <Crown className="h-3 w-3 text-brand" />}
                      <Badge tone="neutral">{r.bookingNo}</Badge>
                      <PaymentBadge status={r.paymentStatus} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      Room {r.roomNumber} · {r.roomType} · {r.nights}N · {r.source} · {formatTime(r.checkIn)} → {formatTime(r.checkOut)}
                    </p>
                    {/* Mini payment progress */}
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-1 w-32 bg-surface-sunken rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full transition-all",
                            pct === 100 ? "bg-success" : pct >= 50 ? "bg-warning" : "bg-danger"
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground tabular">
                        {pct}% paid · {money(r.advance)} / {money(r.total)}
                      </p>
                    </div>
                  </div>

                  <div className="text-right hidden sm:block">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Balance</p>
                    <p className={cn(
                      "font-semibold tabular text-lg",
                      r.balance > 0 ? "text-warning" : "text-success"
                    )}>{money(r.balance)}</p>
                  </div>

                  <div className="inline-flex gap-1.5">
                    <Link href={`/folio/${r.bookingNo}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="h-3.5 w-3.5" />View
                      </Button>
                    </Link>
                    <button
                      type="button"
                      onClick={() => showToast(`Opening folio statement PDF for ${r.bookingNo}`)}
                      className="h-8 w-8 rounded-md border border-border hover:bg-surface-sunken inline-flex items-center justify-center text-muted-foreground transition-colors"
                      title="Open folio statement PDF"
                    >
                      <FileText className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRemindedAt(prev => ({ ...prev, [r.id]: Date.now() }));
                        showToast(`Reminder sent to ${r.guestName} · Email + WhatsApp`);
                      }}
                      className={cn(
                        "h-8 w-8 rounded-md border inline-flex items-center justify-center transition-colors relative",
                        remindedAt[r.id]
                          ? "bg-info-soft border-info text-info"
                          : "border-border hover:bg-info hover:text-white hover:border-info text-muted-foreground"
                      )}
                      title={remindedAt[r.id] ? `Reminded ${Math.floor((Date.now() - remindedAt[r.id]) / 60000)}m ago — click to resend` : "Send folio reminder via Email + WhatsApp"}
                    >
                      <Send className="h-3.5 w-3.5" />
                      {remindedAt[r.id] && (
                        <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-info border border-surface" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => { window.print(); showToast(`Print dialog opened for ${r.guestName}`); }}
                      className="h-8 w-8 rounded-md border border-border hover:bg-surface-sunken inline-flex items-center justify-center text-muted-foreground transition-colors"
                      title="Print folio"
                    >
                      <Printer className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-foreground text-background rounded-lg px-4 py-3 text-sm shadow-2xl animate-in slide-in-from-bottom-2 inline-flex items-center gap-2.5 ring-1 ring-foreground/20">
          <span className="h-6 w-6 rounded-full bg-success text-white inline-flex items-center justify-center"><CheckCircle2 className="h-3.5 w-3.5" /></span>
          <span className="font-medium">{toast}</span>
        </div>
      )}
    </div>
  );
}
