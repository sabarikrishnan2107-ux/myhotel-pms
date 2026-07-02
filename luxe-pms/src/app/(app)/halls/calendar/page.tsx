"use client";
import * as React from "react";
import Link from "next/link";
import {
  ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, MousePointerClick,
  Building2, Users, IndianRupee, Wallet,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { KPICard } from "@/components/ui/kpi-card";
import { cn, money } from "@/lib/utils";
import { apiGet, apiPut, apiPost } from "@/lib/api";
import { computeHallBlock, isHallBlockInWindow, assignHallLanes, hallUtilizationPct } from "@/lib/hall-calendar";
import {
  HallDetailDrawer, ModifyHallDialog, ReceivePaymentDialog, CancelHallDialog,
  type Hall, type HallBooking, type HallOverride,
} from "../_components/hall-dialogs";

const CELL_W = 80;
const ROW_H = 56;
const LANE_H = 28;
const LABEL_W = 200;
const VIEW_SPANS = { Day: 1, Week: 7, "2 Weeks": 14, Month: 30 } as const;
type ViewSpan = keyof typeof VIEW_SPANS;

interface CalBlock {
  id: string;
  hallName: string;
  label: string;
  start: string;
  end: string;
  status: HallBooking["status"];
  startCol: number;
  span: number;
}

// Window anchor: a few days before today, matching the Room Reservation
// Calendar's default so recent/in-progress events show with lead-in.
function defaultWindowStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - 3);
  return d;
}

const STATUS_BG: Record<HallBooking["status"], string> = {
  pending: "bg-warning/15 border-warning/40",
  confirmed: "bg-success/15 border-success/40",
  "in-progress": "bg-info/15 border-info/40",
  completed: "bg-muted-foreground/10 border-border",
  cancelled: "bg-danger/10 border-danger/30",
};
const STATUS_BAR: Record<HallBooking["status"], string> = {
  pending: "bg-warning",
  confirmed: "bg-success",
  "in-progress": "bg-info",
  completed: "bg-muted-foreground",
  cancelled: "bg-danger",
};

export default function HallCalendarPage() {
  const [startDate, setStartDate] = React.useState(defaultWindowStart);
  const [selected, setSelected] = React.useState<HallBooking | null>(null);
  const [modifyTarget, setModifyTarget] = React.useState<HallBooking | null>(null);
  const [cancelTarget, setCancelTarget] = React.useState<HallBooking | null>(null);
  const [payTarget, setPayTarget] = React.useState<HallBooking | null>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2800); };

  // Live halls + bookings — sourced entirely from Postgres, same endpoints
  // the Hall Booking list page uses.
  const [halls, setHalls] = React.useState<Hall[]>([]);
  const [bookings, setBookings] = React.useState<HallBooking[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  React.useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiGet<Hall[]>("/hall-packages"),
      apiGet<HallBooking[]>("/hall-bookings"),
    ])
      .then(([hs, bk]) => {
        if (cancelled) return;
        setHalls(hs.map(h => ({ ...h, id: String(h.id) })));
        setBookings(bk.map(b => ({ ...b, id: String(b.id) })));
      })
      .catch(() => { if (!cancelled) setError("Couldn't reach the backend. Check that the API is running."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Local mutations mirror halls/page.tsx exactly, so Modify/Cancel/Pay/Complete
  // behave identically from either screen.
  const [cancelledIds, setCancelledIds] = React.useState<Set<string>>(new Set());
  const [overrides, setOverrides] = React.useState<Record<string, HallOverride>>({});

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
  const handleComplete = (b: HallBooking) => {
    const balance = b.total - b.advance;
    if (balance > 0) { showToast(`⚠ Cannot complete — ${money(balance)} balance still outstanding`); return; }
    setOverrides(o => ({ ...o, [b.id]: { ...(o[b.id] ?? {}), status: "completed" } }));
    apiPut(`/hall-bookings/${b.id}`, { status: "completed" }).catch(() => showToast("Could not update status"));
    showToast(`${b.customer} marked completed`);
  };
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

  // Toolbar state
  const [hallFilter, setHallFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<"all" | HallBooking["status"]>("all");
  const [showCancelled, setShowCancelled] = React.useState(false);
  const [viewSpan, setViewSpan] = React.useState<ViewSpan>("2 Weeks");
  const DAYS = VIEW_SPANS[viewSpan];

  const days = React.useMemo(() => {
    return Array.from({ length: DAYS }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [startDate, DAYS]);

  const blocks: CalBlock[] = React.useMemo(() => {
    return effective.flatMap(b => {
      if (b.status === "cancelled" && !showCancelled) return [];
      const { startCol, span } = computeHallBlock(b, startDate);
      return [{
        id: b.id,
        hallName: b.hall,
        label: b.eventName || b.customer,
        start: b.start,
        end: b.end,
        status: b.status,
        startCol,
        span,
      }];
    });
  }, [effective, startDate, showCancelled]);

  const visibleBlocks = React.useMemo(() => {
    return blocks.filter(b => {
      if (hallFilter !== "all" && b.hallName !== hallFilter) return false;
      if (statusFilter !== "all" && b.status !== statusFilter) return false;
      return true;
    });
  }, [blocks, hallFilter, statusFilter]);

  const sortedHalls = React.useMemo(() => [...halls].sort((a, b) => a.name.localeCompare(b.name)), [halls]);

  // KPI computation — across the visible window, excluding cancelled
  // bookings even when "Show cancelled" is on (matches the list page's
  // revenue/outstanding totals, which always exclude cancelled).
  const inViewBlocks = React.useMemo(
    () => visibleBlocks.filter(b => isHallBlockInWindow(b, DAYS) && b.status !== "cancelled"),
    [visibleBlocks, DAYS],
  );
  const bookedHallDays = inViewBlocks.reduce((t, b) => t + Math.min(b.startCol + b.span, DAYS) - Math.max(b.startCol, 0), 0);
  const utilizationPct = hallUtilizationPct(bookedHallDays, sortedHalls.length, DAYS);
  const inViewBookings = React.useMemo(() => {
    const ids = new Set(inViewBlocks.map(b => b.id));
    return effective.filter(b => ids.has(b.id));
  }, [inViewBlocks, effective]);
  const guestsInView = inViewBookings.reduce((t, b) => t + b.guests, 0);
  const revenueInView = inViewBookings.reduce((t, b) => t + b.total, 0);
  const outstandingInView = inViewBookings.reduce((t, b) => t + Math.max(0, b.total - b.advance), 0);

  const moveDays = (delta: number) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + delta);
    setStartDate(d);
  };

  const openBooking = (id: string) => {
    const b = effective.find(x => x.id === id);
    if (b) setSelected(b);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-medium tracking-tight">Hall Reservation Calendar</h1>
          <p className="text-muted-foreground text-sm mt-1">
            At-a-glance view of every hall booking across the window · <span className="font-medium text-foreground">double-click an event</span> for the full booking
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/halls"><Button variant="outline">Hall Booking List</Button></Link>
          <Link href="/halls/new"><Button><Plus className="h-4 w-4" />New Hall Booking</Button></Link>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2.5">
        <KPICard label="Events" value={inViewBookings.length} icon={CalendarIcon} accent="brand" hint={`in ${DAYS}-day window`} />
        <KPICard label="Guests" value={guestsInView} icon={Users} accent="info" hint="across visible events" />
        <KPICard label="Utilization" value={`${utilizationPct}%`} icon={Building2} accent={utilizationPct >= 60 ? "success" : utilizationPct >= 30 ? "accent" : "warning"} hint="of hall-days in window" />
        <KPICard label="Revenue" value={money(revenueInView)} icon={IndianRupee} accent="success" hint="in window" />
        <KPICard label="Outstanding" value={money(outstandingInView)} icon={Wallet} accent="warning" hint="in window" />
      </div>

      {/* Toolbar */}
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center rounded-md border border-border">
            <button onClick={() => moveDays(-DAYS)} className="h-9 px-2 hover:bg-surface-sunken inline-flex items-center justify-center border-r border-border" title={`Previous ${DAYS} days`}><ChevronLeft className="h-4 w-4" /></button>
            <span className="px-3 text-sm font-medium tabular whitespace-nowrap">
              {days[0].toLocaleDateString(undefined, { day: "2-digit", month: "short" })} → {days[DAYS - 1].toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })}
            </span>
            <button onClick={() => moveDays(DAYS)} className="h-9 px-2 hover:bg-surface-sunken inline-flex items-center justify-center border-l border-border" title={`Next ${DAYS} days`}><ChevronRight className="h-4 w-4" /></button>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setStartDate(defaultWindowStart())}>
            <CalendarIcon className="h-3.5 w-3.5" /> Today
          </Button>
          <div className="relative">
            <CalendarIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-subtle-foreground pointer-events-none" />
            <Input
              type="date"
              value={startDate.toISOString().slice(0, 10)}
              onChange={e => setStartDate(new Date(e.target.value))}
              className="h-9 pl-8 w-[160px] tabular text-xs"
              title="Jump to date"
            />
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Select value={hallFilter} onChange={e => setHallFilter(e.target.value)} className="h-9 w-auto" title="Hall">
              <option value="all">All halls</option>
              {sortedHalls.map(h => <option key={h.id} value={h.name}>{h.name}</option>)}
            </Select>
            <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value as typeof statusFilter)} className="h-9 w-auto" title="Status">
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
            </Select>
            <Select value={viewSpan} onChange={e => setViewSpan(e.target.value as ViewSpan)} className="h-9 w-auto" title="View span">
              {(Object.keys(VIEW_SPANS) as ViewSpan[]).map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
            <label className="inline-flex items-center gap-1.5 h-9 px-2 text-xs text-muted-foreground cursor-pointer">
              <input type="checkbox" checked={showCancelled} onChange={e => setShowCancelled(e.target.checked)} className="h-3.5 w-3.5 rounded border-border text-brand focus:ring-ring" />
              Show cancelled
            </label>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-3 text-xs">
          <LegendChip color="bg-warning" label="Pending" />
          <LegendChip color="bg-success" label="Confirmed" />
          <LegendChip color="bg-info" label="In progress" />
          <LegendChip color="bg-muted-foreground" label="Completed" />
          <span className="text-subtle-foreground ml-auto inline-flex items-center gap-1.5">
            <MousePointerClick className="h-3.5 w-3.5" />
            <span><span className="text-foreground font-medium">Double-click an event</span> for the full booking</span>
          </span>
        </div>
      </Card>

      {/* Backend status banners — the board is sourced live from Postgres */}
      {error && (
        <Card className="p-3 border-danger/40 bg-danger/10 text-sm text-danger">{error}</Card>
      )}
      {loading && !error && (
        <Card className="p-3 text-sm text-muted-foreground inline-flex items-center gap-2">
          <span className="h-3.5 w-3.5 rounded-full border-2 border-brand border-t-transparent animate-spin" />
          Loading hall bookings from the backend…
        </Card>
      )}
      {!loading && !error && sortedHalls.length === 0 && (
        <Card className="p-6 text-sm text-muted-foreground text-center">
          No halls found. Add venues in Configuration → Food &amp; Hall Packages to populate the calendar.
        </Card>
      )}

      {/* Timeline */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <div style={{ width: LABEL_W + DAYS * CELL_W, minWidth: "100%" }}>
            {/* Header row */}
            <div className="flex sticky top-0 bg-surface-elevated z-10 border-b border-border">
              <div style={{ width: LABEL_W }} className="px-4 py-2 border-r border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Hall
              </div>
              {days.map((d, i) => {
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                const isToday = d.toDateString() === new Date().toDateString();
                return (
                  <div
                    key={i}
                    style={{ width: CELL_W }}
                    className={cn(
                      "flex flex-col items-center justify-center py-1.5 border-r border-border",
                      isWeekend && "bg-surface-sunken/40",
                      isToday && "bg-brand-soft"
                    )}
                  >
                    <span className={cn("text-[10px] uppercase tracking-wider", isToday ? "text-brand-soft-foreground font-semibold" : "text-muted-foreground")}>
                      {d.toLocaleDateString(undefined, { weekday: "short" })}
                    </span>
                    <span className={cn("text-sm tabular font-medium", isToday ? "text-brand-soft-foreground" : "text-foreground")}>
                      {d.getDate()}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Rows */}
            <div>
              {sortedHalls.map(hall => {
                const hallBlocks = visibleBlocks.filter(
                  b => b.hallName === hall.name && isHallBlockInWindow(b, DAYS),
                );
                const { laneOf, laneCount } = assignHallLanes(hallBlocks);
                const rowHeight = Math.max(ROW_H, laneCount * LANE_H + 8);
                const stackTop = (rowHeight - laneCount * LANE_H) / 2;
                return (
                  <div
                    key={hall.id}
                    className="flex border-b border-border transition-colors hover:bg-surface-sunken/30"
                    style={{ height: rowHeight }}
                  >
                    <div
                      style={{ width: LABEL_W }}
                      className="px-4 flex items-center gap-2 border-r border-border bg-surface-elevated/50"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{hall.name}</p>
                        <p className="text-[10px] text-muted-foreground">Up to {hall.capacity}</p>
                      </div>
                    </div>
                    <div className="relative flex-1 overflow-hidden" style={{ height: rowHeight }}>
                      {/* Day grid — display only */}
                      <div className="absolute inset-0 flex">
                        {days.map((d, i) => {
                          const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                          const isToday = d.toDateString() === new Date().toDateString();
                          return (
                            <div
                              key={i}
                              style={{ width: CELL_W }}
                              className={cn("border-r border-border", isWeekend && "bg-surface-sunken/30", isToday && "bg-brand-soft/30")}
                            />
                          );
                        })}
                      </div>

                      {/* Blocks — whole-day spans. Double-click to open the full booking. Display only — no drag. */}
                      {hallBlocks.map(b => {
                        const left = b.startCol * CELL_W;
                        const w = b.span * CELL_W - 4;
                        const top = stackTop + (laneOf.get(b.id) ?? 0) * LANE_H;
                        return (
                          <div
                            key={b.id}
                            onDoubleClick={(e) => { e.stopPropagation(); openBooking(b.id); }}
                            className={cn(
                              "absolute rounded-md border text-left overflow-hidden hover:shadow-md hover:z-10 transition-shadow cursor-pointer select-none",
                              STATUS_BG[b.status],
                              b.status === "cancelled" && "opacity-60"
                            )}
                            style={{ left, width: w, top, height: LANE_H - 4 }}
                            title={`${b.label} · ${b.hallName} · ${b.status}\nDouble-click to view full booking`}
                          >
                            <div className={cn("absolute left-0 top-0 bottom-0 w-0.5", STATUS_BAR[b.status])} />
                            <div className="h-full flex items-center gap-1 pl-2.5 pr-1.5 pointer-events-none">
                              <p className={cn("text-[11px] font-medium leading-none truncate", b.status === "cancelled" && "line-through")}>{b.label}</p>
                              {w >= 140 && (
                                <span className="ml-auto text-[9px] text-muted-foreground tabular shrink-0 leading-none">
                                  {b.start} → {b.end}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      {/* Detail drawer + dialogs — shared with the Hall Booking list page */}
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
      {payTarget && (
        <ReceivePaymentDialog
          booking={payTarget}
          onClose={() => setPayTarget(null)}
          onConfirm={(amount, mode) => handlePayment(payTarget, amount, mode)}
        />
      )}
      {modifyTarget && (
        <ModifyHallDialog
          booking={modifyTarget}
          notes={overrides[modifyTarget.id]?.notes ?? ""}
          onClose={() => setModifyTarget(null)}
          onSave={(patch) => handleModify(modifyTarget, patch)}
        />
      )}
      {cancelTarget && (
        <CancelHallDialog
          booking={cancelTarget}
          onClose={() => setCancelTarget(null)}
          onConfirm={(reason, refund) => handleCancel(cancelTarget, reason, refund)}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-foreground text-background rounded-lg px-4 py-3 text-sm shadow-2xl animate-in slide-in-from-bottom-2 inline-flex items-center gap-2.5 ring-1 ring-foreground/20">
          <span className="font-medium">{toast}</span>
        </div>
      )}
    </div>
  );
}

function LegendChip({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
      <span className={cn("h-2 w-2 rounded-full", color)} />
      {label}
    </span>
  );
}
