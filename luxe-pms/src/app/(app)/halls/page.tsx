"use client";
import * as React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Plus, Search, Calendar, Users, Building2,
  Eye, Edit, Ban, MoreHorizontal, CheckCircle2,
  Mail, MessageCircle, IndianRupee, Printer, FileText,
  Wallet, LayoutGrid, List, CalendarCheck, CalendarClock,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { KPICard } from "@/components/ui/kpi-card";
import { money, cn, formatDate } from "@/lib/utils";
import { apiGet, apiPut, apiPost } from "@/lib/api";
import {
  HallDetailDrawer, ModifyHallDialog, ReceivePaymentDialog, CancelHallDialog,
  STATUS_TONE, type Hall, type HallBooking, type HallOverride,
} from "./_components/hall-dialogs";

export default function HallsPage() {
  const [search, setSearch] = React.useState("");
  const [hallFilter, setHallFilter] = React.useState<"all" | string>("all");
  const [statusFilter, setStatusFilter] = React.useState<"all" | HallBooking["status"] | "cancelled">("all");
  const [actionMenuFor, setActionMenuFor] = React.useState<string | null>(null);
  // Anchor rect of the open trigger — the menu is portalled to <body> so the
  // table's overflow doesn't clip it.
  const [menuRect, setMenuRect] = React.useState<DOMRect | null>(null);
  const [view, setView] = React.useState<"table" | "cards">("table");

  // Venues (master) + bookings load from the database; cancel/modify layer over them and persist.
  const [halls, setHalls] = React.useState<Hall[]>([]);
  const [bookings, setBookings] = React.useState<HallBooking[]>([]);
  React.useEffect(() => {
    apiGet<Hall[]>("/hall-packages")
      .then(rows => setHalls(rows.map(h => ({ ...h, id: String(h.id) }))))
      .catch(() => {});
    apiGet<HallBooking[]>("/hall-bookings")
      .then(rows => setBookings(rows.map(b => ({ ...b, id: String(b.id) }))))
      .catch(() => {});
  }, []);

  // Local mutations
  const [cancelledIds, setCancelledIds] = React.useState<Set<string>>(new Set());
  const [overrides, setOverrides] = React.useState<Record<string, HallOverride>>({});
  const [selected, setSelected] = React.useState<HallBooking | null>(null);
  const [modifyTarget, setModifyTarget] = React.useState<HallBooking | null>(null);
  const [cancelTarget, setCancelTarget] = React.useState<HallBooking | null>(null);
  const [payTarget, setPayTarget] = React.useState<HallBooking | null>(null);
  const [toast, setToast] = React.useState<string | null>(null);

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2800); };

  const effective = React.useMemo(() => {
    return bookings.map(b => {
      const ov = overrides[b.id] ?? {};
      return {
        ...b,
        ...ov,
        status: cancelledIds.has(b.id) ? "cancelled" as const : (ov.status ?? b.status),
      };
    });
  }, [bookings, overrides, cancelledIds]);

  const list = effective.filter(b => {
    if (search && !`${b.customer} ${b.eventName ?? ""} ${b.hall} ${b.package} ${b.phone}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (hallFilter !== "all" && b.hall !== hallFilter) return false;
    if (statusFilter !== "all" && b.status !== statusFilter) return false;
    return true;
  });

  const now = new Date();
  const today = now.toLocaleDateString("en-CA");
  const tomorrowDate = new Date(now);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = tomorrowDate.toLocaleDateString("en-CA");
  const isOnDate = (b: HallBooking, d: string) => b.date <= d && (b.endDate ?? b.date) >= d;
  const todayCount = effective.filter(b => b.status !== "cancelled" && isOnDate(b, today)).length;
  const tomorrowCount = effective.filter(b => b.status !== "cancelled" && isOnDate(b, tomorrow)).length;

  const totalRev = effective.filter(b => b.status !== "cancelled").reduce((s, b) => s + b.total, 0);
  const advance = effective.filter(b => b.status !== "cancelled").reduce((s, b) => s + b.advance, 0);
  const outstanding = effective.filter(b => b.status !== "cancelled").reduce((s, b) => s + (b.total - b.advance), 0);

  const handleModify = (b: HallBooking, patch: HallOverride) => {
    setOverrides(o => ({ ...o, [b.id]: { ...(o[b.id] ?? {}), ...patch } }));
    apiPut(`/hall-bookings/${b.id}`, patch).catch(() => showToast("Could not save changes"));
    setModifyTarget(null);
    showToast(`${b.customer} updated`);
  };
  const handleCancel = (b: HallBooking, reason: string, refund: number) => {
    setCancelledIds(c => new Set([...c, b.id]));
    apiPut(`/hall-bookings/${b.id}`, { status: "cancelled" }).catch(() => showToast("Could not cancel"));
    setCancelTarget(null);
    showToast(`${b.customer} cancelled · ${money(refund)} refund processed (${reason})`);
  };
  // Mark a held event as completed (terminal state) — only when fully paid.
  const handleComplete = (b: HallBooking) => {
    const balance = b.total - b.advance;
    if (balance > 0) {
      showToast(`⚠ Cannot complete — ${money(balance)} balance still outstanding`);
      setActionMenuFor(null);
      return;
    }
    setOverrides(o => ({ ...o, [b.id]: { ...(o[b.id] ?? {}), status: "completed" } }));
    apiPut(`/hall-bookings/${b.id}`, { status: "completed" }).catch(() => showToast("Could not update status"));
    setActionMenuFor(null);
    showToast(`${b.customer} marked completed`);
  };
  // Record a payment against a hall booking: bumps the persisted advance (so the
  // balance drops everywhere) AND writes a folio-payment line for the money trail,
  // mirroring the room/group flows.
  const handlePayment = (b: HallBooking, amount: number, mode: string) => {
    const amt = Math.max(0, Math.round(amount));
    const newAdvance = Math.min(b.total, b.advance + amt);
    setOverrides(o => ({ ...o, [b.id]: { ...(o[b.id] ?? {}), advance: newAdvance } }));
    apiPut(`/hall-bookings/${b.id}`, { advance: newAdvance }).catch(() => showToast("Could not save payment"));
    apiPost("/folio-payments", {
      bookingNo: `HALL-${b.id}`,
      date: new Date().toLocaleDateString("en-CA"),
      mode,
      reference: `Hall · ${b.hall}`,
      amount: amt,
    }).catch(() => { /* trail is best-effort; the advance update is the source of truth */ });
    setPayTarget(null);
    showToast(`${money(amt)} received from ${b.customer} · balance ${money(Math.max(0, b.total - newAdvance))}`);
  };
  // Sends the booking-confirmation email via the backend (Gmail SMTP).
  const handleEmail = (b: HallBooking) => {
    setActionMenuFor(null);
    showToast(`Emailing ${b.customer}…`);
    apiPost(`/hall-bookings/${b.id}/send-email`, {})
      .then(() => showToast(`Confirmation emailed to ${b.customer}`))
      .catch(() => showToast(`Couldn't email ${b.customer} — no address on file?`));
  };

  // Close menu on outside click, or when the page scrolls/resizes (the menu is
  // fixed-positioned from the trigger rect).
  React.useEffect(() => {
    if (!actionMenuFor) return;
    const close = () => setActionMenuFor(null);
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest("[data-action-menu]")) setActionMenuFor(null);
    };
    document.addEventListener("click", onClick);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [actionMenuFor]);

  const activeFilters = (hallFilter !== "all" ? 1 : 0) + (statusFilter !== "all" ? 1 : 0) + (search ? 1 : 0);
  const STATUS_CHIPS: ("all" | HallBooking["status"] | "cancelled")[] = ["all", "pending", "confirmed", "in-progress", "completed", "cancelled"];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-medium tracking-tight">Hall Booking</h1>
          <p className="text-muted-foreground text-sm mt-1">Function halls, banquets &amp; meeting rooms · billed by the hour</p>
        </div>
        <div className="flex gap-2">
          <Link href="/halls/calendar"><Button variant="outline">Reservation Calendar</Button></Link>
          <Link href="/halls/new"><Button><Plus className="h-4 w-4" />New Hall Booking</Button></Link>
        </div>
      </div>

      {/* KPI bar */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard label="Halls" value={halls.length} icon={Building2} accent="brand" />
        <KPICard label="Active Bookings" value={effective.filter(b => b.status !== "cancelled").length} icon={Calendar} accent="info" />
        <KPICard label="Today's Bookings" value={todayCount} icon={CalendarCheck} accent="accent" />
        <KPICard label="Tomorrow's Bookings" value={tomorrowCount} icon={CalendarClock} accent="neutral" />
        <KPICard label="Hall Revenue" value={money(totalRev)} icon={IndianRupee} accent="success" />
        <KPICard label="Outstanding" value={money(outstanding)} icon={Wallet} accent="warning" hint={`of ${money(totalRev)}`} />
      </div>

      {/* Status chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        {STATUS_CHIPS.map(s => {
          const count = s === "all" ? effective.length : effective.filter(b => b.status === s).length;
          const dot = s === "pending" ? "bg-warning" : s === "confirmed" ? "bg-success" : s === "in-progress" ? "bg-info" : s === "cancelled" ? "bg-danger" : null;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "h-8 px-3 rounded-full text-xs font-medium border transition-colors inline-flex items-center gap-2",
                statusFilter === s
                  ? "bg-foreground text-background border-foreground shadow-xs"
                  : "bg-surface text-muted-foreground border-border hover:bg-surface-sunken hover:text-foreground"
              )}
            >
              {dot && <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />}
              {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1).replace("-", " ")}
              <span className={cn(
                "tabular text-[10px] rounded-full px-1.5 h-4 inline-flex items-center font-semibold",
                statusFilter === s ? "bg-background/15 text-background" : "bg-surface-sunken text-muted-foreground"
              )}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter bar */}
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search event, customer, hall, package, phone…" className="pl-9 h-9" />
          </div>
          <Select value={hallFilter} onChange={e => setHallFilter(e.target.value)} className="h-9 w-auto">
            <option value="all">All halls</option>
            {halls.map(h => <option key={h.id} value={h.name}>{h.name}</option>)}
          </Select>
          <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value as typeof statusFilter)} className="h-9 w-auto">
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="in-progress">In Progress</option>
            <option value="cancelled">Cancelled</option>
          </Select>
          {activeFilters > 0 && (
            <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setHallFilter("all"); setStatusFilter("all"); }}>
              Clear ({activeFilters})
            </Button>
          )}
          <div className="flex-1" />
          {/* View toggle */}
          <div className="inline-flex rounded-md border border-border overflow-hidden h-9">
            <button
              type="button"
              onClick={() => setView("table")}
              className={cn(
                "h-full px-3 inline-flex items-center gap-1.5 text-xs font-medium border-r border-border transition-colors",
                view === "table" ? "bg-brand text-brand-foreground" : "hover:bg-surface-sunken text-muted-foreground"
              )}
            >
              <List className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Table</span>
            </button>
            <button
              type="button"
              onClick={() => setView("cards")}
              className={cn(
                "h-full px-3 inline-flex items-center gap-1.5 text-xs font-medium transition-colors",
                view === "cards" ? "bg-brand text-brand-foreground" : "hover:bg-surface-sunken text-muted-foreground"
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Cards</span>
            </button>
          </div>
          <p className="text-xs text-muted-foreground tabular">{list.length} of {effective.length}</p>
        </div>
      </Card>

      {/* Table */}
      {view === "table" && (
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-elevated border-b border-border">
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-semibold">Event</th>
                <th className="px-4 py-3 font-semibold">Hall</th>
                <th className="px-4 py-3 font-semibold">Date &amp; Time</th>
                <th className="px-4 py-3 font-semibold text-right">Guests</th>
                <th className="px-4 py-3 font-semibold">Package</th>
                <th className="px-4 py-3 font-semibold text-right">Total</th>
                <th className="px-4 py-3 font-semibold text-right">Balance</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.map(b => {
                const isCancelled = b.status === "cancelled";
                const isModified = !!overrides[b.id];
                const isOpen = actionMenuFor === b.id;
                const balance = b.total - b.advance;
                return (
                  <tr
                    key={b.id}
                    onDoubleClick={() => setSelected(b)}
                    title="Double-click to view full booking"
                    className={cn(
                      "hover:bg-surface-sunken/50 transition-colors cursor-pointer select-none",
                      isCancelled && "opacity-60"
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <p className={cn("font-medium", isCancelled && "line-through")}>{b.eventName || b.customer}</p>
                        {isModified && <Badge tone="info">edited</Badge>}
                        {overrides[b.id]?.notes && <FileText className="h-3 w-3 text-brand" aria-label="Has special notes" />}
                      </div>
                      <p className="text-xs text-muted-foreground tabular">{b.customer}{b.phone ? ` · ${b.phone}` : ""}</p>
                    </td>
                    <td className="px-4 py-3">{b.hall}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <p className="text-foreground">
                        {formatDate(b.date)}{b.endDate && b.endDate !== b.date ? ` → ${formatDate(b.endDate)}` : ""}
                      </p>
                      <p className="text-xs tabular">{b.start} → {b.end}</p>
                    </td>
                    <td className="px-4 py-3 text-right tabular">{b.guests}</td>
                    <td className="px-4 py-3"><Badge tone="neutral">{b.package}</Badge></td>
                    <td className="px-4 py-3 text-right tabular font-medium">{money(b.total)}</td>
                    <td className={cn("px-4 py-3 text-right tabular font-medium", balance > 0 ? "text-warning" : "text-success")}>
                      {balance > 0 ? money(balance) : "Paid"}
                    </td>
                    <td className="px-4 py-3"><Badge tone={STATUS_TONE[b.status]}>{b.status}</Badge></td>
                    <td className="px-4 py-3 text-right" data-action-menu>
                      <div className="inline-flex gap-1 items-center">
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); setSelected(b); }}
                          className="h-8 w-8 rounded-md border border-border hover:bg-brand hover:text-brand-foreground hover:border-brand inline-flex items-center justify-center text-muted-foreground transition-colors"
                          title="View booking detail"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={isCancelled}
                          onClick={e => { e.stopPropagation(); setModifyTarget(b); }}
                          className="h-8 w-8 rounded-md border border-border hover:bg-brand hover:text-brand-foreground hover:border-brand inline-flex items-center justify-center text-muted-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Modify booking"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={isCancelled}
                          onClick={e => { e.stopPropagation(); setCancelTarget(b); }}
                          className="h-8 w-8 rounded-md border border-border hover:bg-danger hover:text-white hover:border-danger inline-flex items-center justify-center text-muted-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Cancel booking"
                        >
                          <Ban className="h-3.5 w-3.5" />
                        </button>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              if (isOpen) { setActionMenuFor(null); return; }
                              setMenuRect(e.currentTarget.getBoundingClientRect());
                              setActionMenuFor(b.id);
                            }}
                            className={cn(
                              "h-8 w-8 rounded-md border inline-flex items-center justify-center transition-colors",
                              isOpen ? "bg-brand-soft border-brand text-brand-soft-foreground" : "border-border hover:bg-surface-sunken text-muted-foreground"
                            )}
                            title="More actions"
                          >
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {list.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  <Search className="h-8 w-8 mx-auto text-subtle-foreground mb-2" />
                  <p className="font-medium">No hall bookings match your filters</p>
                  <p className="text-xs mt-1">Adjust filters or create a new booking.</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
      )}

      {/* Card view */}
      {view === "cards" && (
        list.length === 0 ? (
          <Card className="p-12 text-center">
            <Search className="h-8 w-8 mx-auto text-subtle-foreground mb-2" />
            <p className="font-medium">No hall bookings match your filters</p>
            <p className="text-xs mt-1 text-muted-foreground">Adjust filters or create a new booking.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {list.map(b => {
              const isCancelled = b.status === "cancelled";
              const isModified = !!overrides[b.id];
              const isOpen = actionMenuFor === b.id;
              const balance = b.total - b.advance;
              return (
                <Card
                  key={b.id}
                  onDoubleClick={() => setSelected(b)}
                  title="Double-click to view full booking"
                  className={cn("p-4 hover:shadow-md transition-shadow cursor-pointer select-none", isCancelled && "opacity-60")}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className={cn("font-semibold truncate", isCancelled && "line-through")}>{b.customer}</p>
                        {isModified && <Badge tone="info">edited</Badge>}
                        {overrides[b.id]?.notes && <FileText className="h-3 w-3 text-brand shrink-0" aria-label="Has special notes" />}
                      </div>
                      <p className="text-xs text-muted-foreground tabular">{b.phone}</p>
                    </div>
                    <Badge tone={STATUS_TONE[b.status]}>{b.status}</Badge>
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                    <p className="inline-flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 shrink-0" />{b.hall}</p>
                    <p className="inline-flex items-center gap-1.5 flex-wrap">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      {formatDate(b.date)}{b.endDate && b.endDate !== b.date ? ` → ${formatDate(b.endDate)}` : ""}
                      <span className="tabular">· {b.start} → {b.end}</span>
                    </p>
                    <p className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5 shrink-0" />{b.guests} guests</p>
                  </div>

                  <div className="mt-3"><Badge tone="neutral">{b.package}</Badge></div>

                  <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-muted-foreground uppercase tracking-wider text-[10px] font-semibold">Total</p>
                      <p className="font-semibold tabular mt-0.5">{money(b.total)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground uppercase tracking-wider text-[10px] font-semibold">Balance</p>
                      <p className={cn("font-semibold tabular mt-0.5", balance > 0 ? "text-warning" : "text-success")}>
                        {balance > 0 ? money(balance) : "Paid"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-border flex items-center gap-1.5" data-action-menu>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setSelected(b); }}
                      className="h-8 w-8 rounded-md border border-border hover:bg-brand hover:text-brand-foreground hover:border-brand inline-flex items-center justify-center text-muted-foreground transition-colors"
                      title="View booking detail"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={isCancelled}
                      onClick={e => { e.stopPropagation(); setModifyTarget(b); }}
                      className="h-8 w-8 rounded-md border border-border hover:bg-brand hover:text-brand-foreground hover:border-brand inline-flex items-center justify-center text-muted-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Modify booking"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={isCancelled}
                      onClick={e => { e.stopPropagation(); setCancelTarget(b); }}
                      className="h-8 w-8 rounded-md border border-border hover:bg-danger hover:text-white hover:border-danger inline-flex items-center justify-center text-muted-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Cancel booking"
                    >
                      <Ban className="h-3.5 w-3.5" />
                    </button>
                    <div className="relative ml-auto">
                      <button
                        type="button"
                        onClick={(e) => {
                          if (isOpen) { setActionMenuFor(null); return; }
                          setMenuRect(e.currentTarget.getBoundingClientRect());
                          setActionMenuFor(b.id);
                        }}
                        className={cn(
                          "h-8 w-8 rounded-md border inline-flex items-center justify-center transition-colors",
                          isOpen ? "bg-brand-soft border-brand text-brand-soft-foreground" : "border-border hover:bg-surface-sunken text-muted-foreground"
                        )}
                        title="More actions"
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )
      )}

      {/* Row actions menu — portalled to <body> so the table's overflow never
          clips it; positioned from the trigger rect, flipping up near the bottom. */}
      {actionMenuFor && menuRect && typeof document !== "undefined" && (() => {
        const b = list.find(x => x.id === actionMenuFor);
        if (!b) return null;
        const isCancelled = b.status === "cancelled";
        const dropUp = menuRect.bottom + 300 > window.innerHeight;
        const style: React.CSSProperties = {
          position: "fixed",
          right: Math.max(8, window.innerWidth - menuRect.right),
          ...(dropUp ? { bottom: window.innerHeight - menuRect.top + 4 } : { top: menuRect.bottom + 4 }),
        };
        const isPending = b.status === "pending";
        const isConfirmed = b.status === "confirmed";
        const isInProgress = b.status === "in-progress";
        const isCompleted = b.status === "completed";
        const balance = b.total - b.advance;
        const canModify = !isCancelled && !isCompleted;
        const canCancel = !isCancelled && !isCompleted;
        const canReceivePayment = !isCancelled && !isCompleted && balance > 0;
        const canMarkComplete = (isConfirmed || isInProgress) && balance <= 0;

        return createPortal(
          <div data-action-menu style={style} className="z-50 w-56 rounded-md border border-border bg-surface shadow-lg py-1 animate-in slide-in-from-top-1">
            {/* Always available */}
            <button type="button" onClick={() => { setSelected(b); setActionMenuFor(null); }} className="w-full px-3 py-2 text-sm hover:bg-surface-sunken inline-flex items-center gap-2.5 text-left">
              <Eye className="h-3.5 w-3.5 text-muted-foreground" />View detail
            </button>
            <button type="button" onClick={() => { showToast(`Itinerary printed for ${b.customer}`); setActionMenuFor(null); }} className="w-full px-3 py-2 text-sm hover:bg-surface-sunken inline-flex items-center gap-2.5 text-left">
              <Printer className="h-3.5 w-3.5 text-muted-foreground" />Print BEO sheet
            </button>

            <div className="my-1 h-px bg-border" />

            {/* Pending: Send confirmations & modify */}
            {isPending && (
              <>
                <button type="button" onClick={() => handleEmail(b)} className="w-full px-3 py-2 text-sm hover:bg-surface-sunken inline-flex items-center gap-2.5 text-left">
                  <Mail className="h-3.5 w-3.5 text-brand" />Email quote
                </button>
                <button type="button" onClick={() => { showToast(`WhatsApp sent to ${b.customer}`); setActionMenuFor(null); }} className="w-full px-3 py-2 text-sm hover:bg-surface-sunken inline-flex items-center gap-2.5 text-left">
                  <MessageCircle className="h-3.5 w-3.5 text-success" />Send via WhatsApp
                </button>
                <div className="my-1 h-px bg-border" />
                <button type="button" onClick={() => { setModifyTarget(b); setActionMenuFor(null); }} className="w-full px-3 py-2 text-sm hover:bg-surface-sunken inline-flex items-center gap-2.5 text-left">
                  <Edit className="h-3.5 w-3.5 text-muted-foreground" />Modify booking
                </button>
                <button type="button" onClick={() => { setCancelTarget(b); setActionMenuFor(null); }} className="w-full px-3 py-2 text-sm hover:bg-danger-soft text-danger inline-flex items-center gap-2.5 text-left">
                  <Ban className="h-3.5 w-3.5" />Cancel booking
                </button>
              </>
            )}

            {/* Confirmed: Payment & modifications */}
            {isConfirmed && (
              <>
                <button type="button" onClick={() => handleEmail(b)} className="w-full px-3 py-2 text-sm hover:bg-surface-sunken inline-flex items-center gap-2.5 text-left">
                  <Mail className="h-3.5 w-3.5 text-brand" />Email customer
                </button>
                <button type="button" onClick={() => { showToast(`WhatsApp sent to ${b.customer}`); setActionMenuFor(null); }} className="w-full px-3 py-2 text-sm hover:bg-surface-sunken inline-flex items-center gap-2.5 text-left">
                  <MessageCircle className="h-3.5 w-3.5 text-success" />WhatsApp customer
                </button>
                {canReceivePayment && (
                  <>
                    <div className="my-1 h-px bg-border" />
                    <button type="button" onClick={() => { setPayTarget(b); setActionMenuFor(null); }} className="w-full px-3 py-2 text-sm hover:bg-surface-sunken inline-flex items-center gap-2.5 text-left">
                      <Wallet className="h-3.5 w-3.5 text-success" />Receive payment
                    </button>
                  </>
                )}
                <div className="my-1 h-px bg-border" />
                <button type="button" onClick={() => { setModifyTarget(b); setActionMenuFor(null); }} className="w-full px-3 py-2 text-sm hover:bg-surface-sunken inline-flex items-center gap-2.5 text-left">
                  <Edit className="h-3.5 w-3.5 text-muted-foreground" />Modify booking
                </button>
                <button type="button" onClick={() => { setCancelTarget(b); setActionMenuFor(null); }} className="w-full px-3 py-2 text-sm hover:bg-danger-soft text-danger inline-flex items-center gap-2.5 text-left">
                  <Ban className="h-3.5 w-3.5" />Cancel booking
                </button>
              </>
            )}

            {/* In progress: Payment & completion */}
            {isInProgress && (
              <>
                <button type="button" onClick={() => handleEmail(b)} className="w-full px-3 py-2 text-sm hover:bg-surface-sunken inline-flex items-center gap-2.5 text-left">
                  <Mail className="h-3.5 w-3.5 text-brand" />Email customer
                </button>
                <button type="button" onClick={() => { showToast(`WhatsApp sent to ${b.customer}`); setActionMenuFor(null); }} className="w-full px-3 py-2 text-sm hover:bg-surface-sunken inline-flex items-center gap-2.5 text-left">
                  <MessageCircle className="h-3.5 w-3.5 text-success" />WhatsApp customer
                </button>
                {canReceivePayment && (
                  <>
                    <div className="my-1 h-px bg-border" />
                    <button type="button" onClick={() => { setPayTarget(b); setActionMenuFor(null); }} className="w-full px-3 py-2 text-sm hover:bg-surface-sunken inline-flex items-center gap-2.5 text-left">
                      <Wallet className="h-3.5 w-3.5 text-success" />Receive payment
                    </button>
                  </>
                )}
                <div className="my-1 h-px bg-border" />
                <button type="button" onClick={() => handleComplete(b)} disabled={!canMarkComplete} className="w-full px-3 py-2 text-sm hover:bg-surface-sunken inline-flex items-center gap-2.5 text-left disabled:opacity-40 disabled:cursor-not-allowed">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" />Mark completed
                  {balance > 0 && <span className="ml-auto text-[10px] text-danger">balance due</span>}
                </button>
              </>
            )}

            {/* Completed: View only */}
            {isCompleted && (
              <p className="px-3 py-2 text-xs text-muted-foreground italic">Event completed · no further actions</p>
            )}

            {/* Cancelled: View only */}
            {isCancelled && (
              <p className="px-3 py-2 text-xs text-danger italic">Booking cancelled</p>
            )}
          </div>,
          document.body,
        );
      })()}

      {/* Detail drawer */}
      {selected && (
        <HallDetailDrawer
          booking={selected}
          notes={overrides[selected.id]?.notes ?? ""}
          onClose={() => setSelected(null)}
          onModify={() => { setModifyTarget(selected); setSelected(null); }}
          onCancel={() => { setCancelTarget(selected); setSelected(null); }}
          onPay={() => { setPayTarget(selected); setSelected(null); }}
          onComplete={() => { handleComplete(selected); setSelected(null); }}
        />
      )}

      {/* Receive payment dialog */}
      {payTarget && (
        <ReceivePaymentDialog
          booking={payTarget}
          onClose={() => setPayTarget(null)}
          onConfirm={(amount, mode) => handlePayment(payTarget, amount, mode)}
        />
      )}

      {/* Modify dialog */}
      {modifyTarget && (
        <ModifyHallDialog
          booking={modifyTarget}
          notes={overrides[modifyTarget.id]?.notes ?? ""}
          onClose={() => setModifyTarget(null)}
          onSave={(patch) => handleModify(modifyTarget, patch)}
        />
      )}

      {/* Cancel dialog */}
      {cancelTarget && (
        <CancelHallDialog
          booking={cancelTarget}
          onClose={() => setCancelTarget(null)}
          onConfirm={(reason, refund) => handleCancel(cancelTarget, reason, refund)}
        />
      )}

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
