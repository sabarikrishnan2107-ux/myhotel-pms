"use client";
import * as React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Plus, Search, Calendar, Users, Clock, Building2,
  Eye, Edit, Ban, MoreHorizontal, X, CheckCircle2, AlertTriangle,
  Phone, Mail, MessageCircle, IndianRupee, Printer, FileText, Sparkles,
  Wallet,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { KPICard } from "@/components/ui/kpi-card";
import { HALLS, HALL_BOOKINGS } from "@/lib/mock-data-ext";
import { money, cn, formatDate } from "@/lib/utils";
import { apiGet, apiPut, apiPost } from "@/lib/api";

type Hall = typeof HALLS[number];
type HallStatus = "confirmed" | "pending" | "in-progress" | "cancelled";
type HallBooking = Omit<typeof HALL_BOOKINGS[number], "status"> & { status: HallStatus; notes?: string; email?: string };

const STATUS_TONE: Record<HallBooking["status"] | "cancelled" | "completed", "success" | "warning" | "info" | "danger" | "neutral"> = {
  confirmed: "success",
  pending: "warning",
  "in-progress": "info",
  cancelled: "danger",
  completed: "neutral",
};

type HallOverride = {
  date?: string; start?: string; end?: string;
  guests?: number; package?: string; status?: HallBooking["status"];
  notes?: string;
};

export default function HallsPage() {
  const [search, setSearch] = React.useState("");
  const [hallFilter, setHallFilter] = React.useState<"all" | string>("all");
  const [statusFilter, setStatusFilter] = React.useState<"all" | HallBooking["status"] | "cancelled">("all");
  const [actionMenuFor, setActionMenuFor] = React.useState<string | null>(null);
  // Anchor rect of the open trigger — the menu is portalled to <body> so the
  // table's overflow doesn't clip it.
  const [menuRect, setMenuRect] = React.useState<DOMRect | null>(null);

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
    if (search && !`${b.customer} ${b.hall} ${b.package} ${b.phone}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (hallFilter !== "all" && b.hall !== hallFilter) return false;
    if (statusFilter !== "all" && b.status !== statusFilter) return false;
    return true;
  });

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
  const STATUS_CHIPS: ("all" | HallBooking["status"] | "cancelled")[] = ["all", "pending", "confirmed", "in-progress", "cancelled"];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-medium tracking-tight">Hall Booking</h1>
          <p className="text-muted-foreground text-sm mt-1">Function halls, banquets &amp; meeting rooms · minimum 3-hour slots</p>
        </div>
        <Link href="/halls/new"><Button><Plus className="h-4 w-4" />New Hall Booking</Button></Link>
      </div>

      {/* KPI bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard label="Halls" value={halls.length} icon={Building2} accent="brand" />
        <KPICard label="Active Bookings" value={effective.filter(b => b.status !== "cancelled").length} icon={Calendar} accent="info" />
        <KPICard label="Hall Revenue" value={money(totalRev)} icon={IndianRupee} accent="success" />
        <KPICard label="Outstanding" value={money(outstanding)} icon={Wallet} accent="warning" hint={`of ${money(totalRev)}`} />
      </div>

      {/* Hall capacities — click to filter to bookings for that hall */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Halls — Capacity &amp; Pricing</CardTitle>
            <p className="text-xs text-muted-foreground">Click a hall to filter its bookings</p>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {halls.map(h => {
            const isActive = hallFilter === h.name;
            const bookCount = effective.filter(b => b.hall === h.name && b.status !== "cancelled").length;
            return (
              <button
                key={h.id}
                type="button"
                onClick={() => setHallFilter(isActive ? "all" : h.name)}
                className={cn(
                  "rounded-md border p-4 text-left transition-all",
                  isActive ? "border-brand bg-brand-soft shadow-xs" : "border-border hover:bg-surface-sunken hover:border-brand/30"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{h.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Up to {h.capacity} guests · {bookCount} booking{bookCount === 1 ? "" : "s"}</p>
                  </div>
                  <span className={cn(
                    "h-8 w-8 rounded-md flex items-center justify-center shrink-0",
                    isActive ? "bg-brand text-brand-foreground" : "bg-brand-soft text-brand-soft-foreground"
                  )}>
                    <Building2 className="h-4 w-4" />
                  </span>
                </div>
                <div className="mt-3 pt-3 border-t border-border space-y-1 text-xs">
                  <Row label="Hourly" value={money(h.hourly)} />
                  <Row label="Half-day" value={money(h.halfDay)} />
                  <Row label="Full-day" value={money(h.fullDay)} />
                </div>
              </button>
            );
          })}
        </CardContent>
      </Card>

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
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customer, hall, package, phone…" className="pl-9 h-9" />
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
          <p className="text-xs text-muted-foreground tabular">{list.length} of {effective.length}</p>
        </div>
      </Card>

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-elevated border-b border-border">
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-semibold">Customer</th>
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
                        <p className={cn("font-medium", isCancelled && "line-through")}>{b.customer}</p>
                        {isModified && <Badge tone="info">edited</Badge>}
                        {overrides[b.id]?.notes && <FileText className="h-3 w-3 text-brand" aria-label="Has special notes" />}
                      </div>
                      <p className="text-xs text-muted-foreground tabular">{b.phone}</p>
                    </td>
                    <td className="px-4 py-3">{b.hall}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <p className="text-foreground">{formatDate(b.date)}</p>
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
        return createPortal(
          <div data-action-menu style={style} className="z-50 w-56 rounded-md border border-border bg-surface shadow-lg py-1 animate-in slide-in-from-top-1">
            <button type="button" onClick={() => { setSelected(b); setActionMenuFor(null); }} className="w-full px-3 py-2 text-sm hover:bg-surface-sunken inline-flex items-center gap-2.5 text-left">
              <Eye className="h-3.5 w-3.5 text-muted-foreground" />View detail
            </button>
            <button type="button" onClick={() => { showToast(`Itinerary printed for ${b.customer}`); setActionMenuFor(null); }} className="w-full px-3 py-2 text-sm hover:bg-surface-sunken inline-flex items-center gap-2.5 text-left">
              <Printer className="h-3.5 w-3.5 text-muted-foreground" />Print BEO sheet
            </button>
            <button type="button" onClick={() => handleEmail(b)} className="w-full px-3 py-2 text-sm hover:bg-surface-sunken inline-flex items-center gap-2.5 text-left">
              <Mail className="h-3.5 w-3.5 text-brand" />Email customer
            </button>
            <button type="button" onClick={() => { showToast(`WhatsApp sent to ${b.customer}`); setActionMenuFor(null); }} className="w-full px-3 py-2 text-sm hover:bg-surface-sunken inline-flex items-center gap-2.5 text-left">
              <MessageCircle className="h-3.5 w-3.5 text-success" />WhatsApp customer
            </button>
            <div className="my-1 h-px bg-border" />
            <button type="button" disabled={isCancelled} onClick={() => { setModifyTarget(b); setActionMenuFor(null); }} className="w-full px-3 py-2 text-sm hover:bg-surface-sunken inline-flex items-center gap-2.5 text-left disabled:opacity-40 disabled:cursor-not-allowed">
              <Edit className="h-3.5 w-3.5 text-muted-foreground" />Modify booking
            </button>
            <button type="button" disabled={isCancelled} onClick={() => { setCancelTarget(b); setActionMenuFor(null); }} className="w-full px-3 py-2 text-sm hover:bg-danger-soft text-danger inline-flex items-center gap-2.5 text-left disabled:opacity-40 disabled:cursor-not-allowed">
              <Ban className="h-3.5 w-3.5" />Cancel booking
            </button>
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

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between"><span className="text-muted-foreground">{label}</span><span className="tabular font-medium">{value}</span></div>;
}

// ===================== DETAIL DRAWER =====================
function HallDetailDrawer({ booking, notes, onClose, onModify, onCancel }: {
  booking: HallBooking; notes: string; onClose: () => void; onModify: () => void; onCancel: () => void;
}) {
  const [halls, setHalls] = React.useState<Hall[]>([]);
  React.useEffect(() => { apiGet<Hall[]>("/hall-packages").then(r => setHalls(r.map(h => ({ ...h, id: String(h.id) })))).catch(() => {}); }, []);
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  const balance = booking.total - booking.advance;
  const hall = halls.find(h => h.name === booking.hall);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs" onClick={onClose} aria-hidden />
      <aside className="fixed top-0 right-0 z-50 h-svh w-full sm:w-[520px] lg:w-[600px] bg-surface border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right-2">
        <div className="px-5 py-4 border-b border-border bg-linear-to-br from-brand-soft/40 via-surface to-accent-soft/20 flex items-start gap-3">
          <span className="h-12 w-12 rounded-md bg-brand-soft text-brand-soft-foreground inline-flex items-center justify-center shrink-0">
            <Building2 className="h-6 w-6" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Hall booking · {booking.id.toUpperCase()}</p>
            <h2 className="text-xl font-semibold truncate">{booking.customer}</h2>
            <p className="text-xs text-muted-foreground truncate">{booking.phone}{booking.email ? ` · ${booking.email}` : ""}</p>
          </div>
          <button type="button" onClick={onClose} className="h-8 w-8 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Booking summary */}
          <div className="rounded-md border border-border p-4 space-y-2">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <DetailRow icon={Building2} label="Hall" value={booking.hall} sub={hall ? `Up to ${hall.capacity}` : ""} />
              <DetailRow icon={Users} label="Guests" value={`${booking.guests}`} sub={`Package: ${booking.package}`} />
              <DetailRow icon={Calendar} label="Date" value={formatDate(booking.date)} />
              <DetailRow icon={Clock} label="Time" value={`${booking.start} → ${booking.end}`} sub={`${getHours(booking.start, booking.end)} h`} />
            </div>
          </div>

          {/* Package details */}
          <Section title="Package">
            <div className="rounded-md border border-border p-3 space-y-1.5 text-sm">
              <Row label="Selected" value={booking.package} />
              <Row label="Per guest" value={money(Math.round(booking.total / booking.guests))} />
            </div>
          </Section>

          {/* Money */}
          <Section title="Payment summary">
            <div className="rounded-md border border-border p-3 space-y-1.5 text-sm">
              <Row label="Total" value={money(booking.total)} />
              <Row label="Advance received" value={money(booking.advance)} />
              <div className="border-t border-border pt-1.5 mt-1.5 flex items-center justify-between">
                <span className={cn("font-semibold", balance > 0 ? "text-warning" : "text-success")}>
                  {balance > 0 ? "Balance due" : "Settled"}
                </span>
                <span className={cn("text-base font-semibold tabular", balance > 0 ? "text-warning" : "text-success")}>
                  {balance > 0 ? money(balance) : money(0)}
                </span>
              </div>
            </div>
          </Section>

          {/* Special notes */}
          <Section title="Special instructions / setup notes">
            {notes ? (
              <div className="rounded-md bg-warning-soft/40 border border-warning/30 p-3 text-sm leading-relaxed">
                <p className="inline-flex items-center gap-1.5 text-warning text-[11px] font-semibold uppercase tracking-wider mb-1.5">
                  <AlertTriangle className="h-3 w-3" />Visible to F&amp;B + Banquet setup team
                </p>
                <p className="whitespace-pre-wrap">{notes}</p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">No special instructions on file. Click <span className="text-foreground font-medium">Modify</span> to add.</p>
            )}
          </Section>

          {/* Status */}
          <Section title="Status">
            <Badge tone={STATUS_TONE[booking.status]}>{booking.status}</Badge>
          </Section>
        </div>

        {/* Footer */}
        <div className="border-t border-border p-3 grid grid-cols-3 gap-2">
          <Button variant="outline" size="sm" onClick={onModify} disabled={booking.status === "cancelled"}>
            <Edit className="h-3.5 w-3.5" />Modify
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-3.5 w-3.5" />BEO sheet
          </Button>
          <Button variant="danger" size="sm" onClick={onCancel} disabled={booking.status === "cancelled"}>
            <Ban className="h-3.5 w-3.5" />Cancel
          </Button>
        </div>
      </aside>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-semibold mb-2">{title}</p>
      {children}
    </div>
  );
}

function DetailRow({ icon: Icon, label, value, sub }: { icon: typeof Building2; label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="h-7 w-7 rounded-md bg-surface-sunken text-muted-foreground inline-flex items-center justify-center shrink-0"><Icon className="h-3.5 w-3.5" /></span>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
        <p className="text-sm font-semibold leading-tight mt-0.5 truncate">{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground truncate">{sub}</p>}
      </div>
    </div>
  );
}

function getHours(start: string, end: string) {
  const [sH, sM] = start.split(":").map(Number);
  const [eH, eM] = end.split(":").map(Number);
  return ((eH * 60 + eM) - (sH * 60 + sM)) / 60;
}

// ===================== MODIFY DIALOG =====================
function ModifyHallDialog({ booking, notes, onClose, onSave }: {
  booking: HallBooking; notes: string; onClose: () => void; onSave: (patch: HallOverride) => void;
}) {
  const [draft, setDraft] = React.useState({
    date: booking.date,
    start: booking.start,
    end: booking.end,
    guests: booking.guests,
    package: booking.package,
    status: booking.status as HallBooking["status"],
    notes: notes,
  });

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  const set = <K extends keyof typeof draft>(k: K, v: typeof draft[K]) => setDraft(d => ({ ...d, [k]: v }));
  const todayISO = new Date().toLocaleDateString("en-CA"); // blocks past dates on event date
  const valid = draft.guests >= 1 && draft.start < draft.end;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <Card className="pointer-events-auto w-full max-w-xl p-0 animate-in shadow-xl overflow-hidden">
          <div className="px-5 py-4 bg-surface-elevated border-b border-border flex items-center gap-3">
            <span className="h-10 w-10 rounded-md bg-brand-soft text-brand-soft-foreground inline-flex items-center justify-center shrink-0">
              <Edit className="h-5 w-5" />
            </span>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">Modify hall booking</h3>
              <p className="text-xs text-muted-foreground truncate">{booking.customer} · {booking.hall}</p>
            </div>
            <button type="button" onClick={onClose} className="h-8 w-8 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
          </div>

          <div className="px-5 py-4 space-y-4 max-h-[65vh] overflow-y-auto">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Date</Label>
                <Input type="date" value={draft.date} min={todayISO} onChange={e => set("date", e.target.value)} className="h-9 tabular" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Start time</Label>
                <Input type="time" value={draft.start} onChange={e => set("start", e.target.value)} className="h-9 tabular" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">End time</Label>
                <Input type="time" value={draft.end} onChange={e => set("end", e.target.value)} className="h-9 tabular" />
              </div>
            </div>

            <div className="rounded-md bg-surface-sunken/40 border border-border p-3 text-xs flex items-center justify-between">
              <span className="text-muted-foreground">Duration</span>
              <span className="font-semibold tabular">{getHours(draft.start, draft.end)} hours</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Guest count</Label>
                <Input type="number" min={1} value={draft.guests} onChange={e => set("guests", Number(e.target.value))} className="h-9 tabular" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Package</Label>
                <Input value={draft.package} onChange={e => set("package", e.target.value)} className="h-9" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Booking status</Label>
              <Select value={draft.status} onChange={e => set("status", e.target.value as HallBooking["status"])} className="h-9">
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="in-progress">In Progress</option>
              </Select>
            </div>

            {/* SPECIAL NOTES */}
            <div className="space-y-1.5 pt-3 border-t border-border">
              <Label htmlFor="notes" className="text-xs">
                <Sparkles className="h-3 w-3 inline mr-1 text-brand" />Special instructions / guest requests
              </Label>
              <textarea
                id="notes"
                value={draft.notes}
                onChange={e => set("notes", e.target.value)}
                placeholder="e.g. White tablecloths · Stage backdrop with floral arch · Vegan menu only · Sound check at 17:00 · No nuts in any dish · Birthday cake at 21:30 with sparkler …"
                rows={4}
                maxLength={600}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm placeholder:text-subtle-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 outline-hidden resize-y min-h-[96px]"
              />
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Forwarded to F&amp;B, banquet setup, and AV teams.</span>
                <span className="tabular">{draft.notes.length} / 600</span>
              </div>
            </div>
          </div>

          <div className="px-5 py-3 border-t border-border bg-surface-elevated flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button onClick={() => onSave(draft)} disabled={!valid} variant="success"><CheckCircle2 className="h-4 w-4" />Save changes</Button>
          </div>
        </Card>
      </div>
    </>
  );
}

// ===================== CANCEL DIALOG =====================
function CancelHallDialog({ booking, onClose, onConfirm }: {
  booking: HallBooking; onClose: () => void; onConfirm: (reason: string, refund: number) => void;
}) {
  const [reason, setReason] = React.useState("Client cancellation");
  const [notify, setNotify] = React.useState({ email: true, whatsapp: true, sms: false });
  const [confirmText, setConfirmText] = React.useState("");

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  // Tiered refund based on days-until-event, relative to today's real date.
  // Parse "today" from a YYYY-MM-DD string so it matches how booking.date is
  // parsed (both land on UTC midnight) and the day diff stays exact.
  const today = new Date(new Date().toLocaleDateString("en-CA"));
  const ev = new Date(booking.date);
  const daysUntil = Math.floor((ev.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  let refundPct = 100;
  let policyNote = "Full refund — > 14 days before event";
  if (daysUntil < 0) { refundPct = 0; policyNote = "No refund — event date passed"; }
  else if (daysUntil < 3) { refundPct = 0; policyNote = "No refund — within 3 days of event"; }
  else if (daysUntil < 7) { refundPct = 25; policyNote = "25% refund — within 7 days of event"; }
  else if (daysUntil < 14) { refundPct = 50; policyNote = "50% refund — within 14 days of event"; }

  const refund = Math.round(booking.advance * (refundPct / 100));
  const valid = confirmText.trim().toUpperCase() === "CANCEL";

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <Card className="pointer-events-auto w-full max-w-md p-0 animate-in shadow-xl overflow-hidden">
          <div className="px-5 py-4 bg-danger-soft border-b border-danger/20 flex items-center gap-3">
            <span className="h-10 w-10 rounded-md bg-danger text-white inline-flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">Cancel hall booking</h3>
              <p className="text-xs text-muted-foreground truncate">{booking.customer} · {booking.hall}</p>
            </div>
            <button type="button" onClick={onClose} className="h-8 w-8 rounded-md hover:bg-white/40 inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
          </div>

          <div className="px-5 py-4 space-y-4">
            <div className="rounded-md border border-border p-3 text-sm space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Event</span>
                <span className="font-medium">{formatDate(booking.date)} · {booking.start} → {booking.end}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Guests</span>
                <span className="font-medium tabular">{booking.guests}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Advance paid</span>
                <span className="font-medium tabular">{money(booking.advance)}</span>
              </div>
            </div>

            <div className={cn(
              "rounded-md border p-3 text-sm space-y-1.5",
              refundPct >= 50 ? "border-warning/40 bg-warning-soft/40" : "border-danger/40 bg-danger-soft/40"
            )}>
              <p className="text-xs font-semibold uppercase tracking-wider">Hall cancellation policy</p>
              <p className="text-[11px]">{policyNote} ({daysUntil >= 0 ? `${daysUntil} days until event` : `event passed`})</p>
              <div className="flex items-center justify-between pt-1.5 border-t border-current/15">
                <span className="text-xs">Refund to client</span>
                <span className="text-base font-semibold tabular">{money(refund)} <span className="text-[10px] opacity-70">({refundPct}%)</span></span>
              </div>
            </div>

            <div className="rounded-md bg-warning-soft/40 border border-warning/30 p-3 text-xs flex items-start gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-warning">{booking.hall} slot will be released</p>
                <p className="text-muted-foreground mt-0.5">F&amp;B / catering linked to this booking will also be voided.</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Cancellation reason</Label>
              <Select value={reason} onChange={e => setReason(e.target.value)} className="h-9">
                <option>Client cancellation</option>
                <option>Insufficient guests</option>
                <option>Payment failed</option>
                <option>Event postponed</option>
                <option>Force majeure</option>
                <option>Other</option>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px]">Notify customer via</Label>
              <div className="flex flex-wrap gap-1.5">
                {([
                  { id: "email", label: "Email", icon: Mail },
                  { id: "whatsapp", label: "WhatsApp", icon: MessageCircle },
                  { id: "sms", label: "SMS", icon: Phone },
                ] as const).map(c => {
                  const on = notify[c.id];
                  const Icon = c.icon;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setNotify(n => ({ ...n, [c.id]: !n[c.id] }))}
                      className={cn(
                        "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border text-xs font-medium transition-colors",
                        on ? "bg-brand-soft border-brand text-brand-soft-foreground" : "border-border text-muted-foreground hover:bg-surface-sunken"
                      )}
                    >
                      <Icon className="h-3 w-3" />{c.label}{on && <CheckCircle2 className="h-3 w-3" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Type <span className="font-mono font-semibold">CANCEL</span> to confirm</Label>
              <Input
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                placeholder="CANCEL"
                className={cn("h-9 font-mono tabular", valid && "border-success")}
              />
            </div>
          </div>

          <div className="px-5 py-3 border-t border-border bg-surface-elevated flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>Keep booking</Button>
            <Button onClick={() => onConfirm(reason, refund)} disabled={!valid} variant="danger">
              <Ban className="h-4 w-4" />Cancel booking
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}
