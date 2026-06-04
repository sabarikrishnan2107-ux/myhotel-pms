"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft, ChevronRight, Plus, Filter, Calendar as CalendarIcon, MousePointerClick,
  Crown, X, CheckCircle2, Building2, IndianRupee, Moon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ROOMS, RESERVATIONS, GUESTS } from "@/lib/mock-data";
import type { PaymentStatus, Reservation, Guest } from "@/lib/types";
import { cn } from "@/lib/utils";
import { apiGet } from "@/lib/api";
import { GuestDetailDrawer } from "@/components/guests/guest-detail-drawer";

const CELL_W = 80;
const ROW_H = 56;
const LABEL_W = 200;
const VIEW_SPANS = { Day: 1, Week: 7, "2 Weeks": 14, Month: 30 } as const;
type ViewSpan = keyof typeof VIEW_SPANS;

interface CalBlock {
  id: string;
  roomNumber: string;
  guestName: string;
  source: string;
  startCol: number;   // day index of check-in (12:00 PM that day)
  nights: number;     // number of hotel-nights (each = 12:00 → next 11:00 = 23h)
  paymentStatus: PaymentStatus;
  vip: boolean;
}

type DragMode = "move" | "resize-left" | "resize-right";
interface DragState {
  id: string;
  mode: DragMode;
  startX: number;
  startY: number;
  initial: Pick<CalBlock, "startCol" | "nights" | "roomNumber">;
  preview: Pick<CalBlock, "startCol" | "nights" | "roomNumber">;
  gridTop: number;
  moved: boolean;
}

function rangesOverlap(a1: number, a2: number, b1: number, b2: number) {
  return a1 < b2 && b1 < a2;
}

// Hotel timing: 12:00 PM check-in → next-day 11:00 AM checkout = 23h per night.
// Position blocks visually across the day boundary they actually span.
const HOUR_W = CELL_W / 24;
const NOON_OFFSET = 12 * HOUR_W;            // start of every booking (12:00 PM)
const CHECKOUT_OFFSET = 11 * HOUR_W;        // end-of-stay offset from start of checkout day (11:00 AM)
function blockLeft(startCol: number) {
  return startCol * CELL_W + NOON_OFFSET;
}
function blockWidth(nights: number) {
  // From 12:00 day N to 11:00 day (N+nights) → nights * 24 - 1 hours = (nights * 24 - 1) * HOUR_W
  return nights * CELL_W - HOUR_W;
}

const PAYMENT_BG: Record<PaymentStatus, string> = {
  paid: "bg-success/15 border-success/40",
  partial: "bg-warning/15 border-warning/40",
  unpaid: "bg-danger/15 border-danger/40",
  refunded: "bg-muted-foreground/10 border-border",
};
const PAYMENT_BAR: Record<PaymentStatus, string> = {
  paid: "bg-success",
  partial: "bg-warning",
  unpaid: "bg-danger",
  refunded: "bg-muted-foreground",
};

export default function CalendarPage() {
  const router = useRouter();
  const [startDate, setStartDate] = React.useState(() => {
    const d = new Date("2026-06-02");
    return d;
  });
  const [selected, setSelected] = React.useState<{ guest: Guest; reservation: Reservation } | null>(null);

  // Live reservations + rooms from Postgres (fall back to seeds if offline).
  const [bookings, setBookings] = React.useState<Reservation[]>(RESERVATIONS);
  const [rooms, setRooms] = React.useState(ROOMS);
  React.useEffect(() => {
    let cancelled = false;
    apiGet<Reservation[]>("/bookings").then(r => { if (!cancelled) setBookings(r); }).catch(() => {});
    apiGet<typeof ROOMS>("/room-board").then(r => { if (!cancelled) setRooms(r); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Toolbar state — was previously hard-coded
  const [roomTypeFilter, setRoomTypeFilter] = React.useState<string>("all");
  const [viewSpan, setViewSpan] = React.useState<ViewSpan>("2 Weeks");
  const DAYS = VIEW_SPANS[viewSpan];

  // Advanced filters
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [vipOnly, setVipOnly] = React.useState(false);
  const [paymentFilter, setPaymentFilter] = React.useState<"all" | PaymentStatus>("all");
  const [sourceFilter, setSourceFilter] = React.useState<string>("all");

  const openGuestForBlock = (b: CalBlock) => {
    // Resolve the real reservation this block came from (by DB id, then name).
    const realId = b.id.startsWith("bk-") ? b.id.slice(3) : null;
    const reservation =
      bookings.find(r => String((r as { id: unknown }).id) === realId) ??
      bookings.find(r => r.guestName === b.guestName) ??
      RESERVATIONS[0];
    const guest =
      GUESTS.find(g => g.name === b.guestName) ?? {
        id: `g-${b.guestName.replace(/\s+/g, "-").toLowerCase()}`,
        name: b.guestName,
        phone: "—",
        email: "—",
        nationality: "—",
        idType: "Passport",
        idNumber: "—",
        vip: b.vip,
        blacklist: false,
        lifetimeNights: b.nights,
        lifetimeSpend: reservation.total,
        lastStay: reservation.checkIn,
      };
    setSelected({ guest, reservation });
  };

  const openNewBookingFor = (roomNumber: string, startDay: number, nights: number) => {
    const ci = new Date(startDate);
    ci.setDate(ci.getDate() + startDay);
    const co = new Date(startDate);
    co.setDate(co.getDate() + startDay + nights);
    const ciISO = ci.toISOString().slice(0, 10);
    const coISO = co.toISOString().slice(0, 10);
    router.push(`/bookings/new?room=${encodeURIComponent(roomNumber)}&checkin=${ciISO}&checkout=${coISO}&nights=${nights}`);
  };

  // Range-select state for "drag to book"
  const [select, setSelect] = React.useState<{ roomNumber: string; startDay: number; endDay: number } | null>(null);

  // Track movement so single-click vs drag is distinguishable
  const selectMovedRef = React.useRef(false);

  const startSelect = (roomNumber: string, dayIndex: number, e: React.MouseEvent) => {
    e.preventDefault();
    selectMovedRef.current = false;
    setSelect({ roomNumber, startDay: dayIndex, endDay: dayIndex });
  };

  // Range-select effect is registered below after `blocks` is declared (TDZ).

  const days = React.useMemo(() => {
    return Array.from({ length: DAYS }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [startDate]);

  // Build calendar blocks from real reservations, positioned by their actual
  // check-in date relative to the visible window.
  const DAY_MS = 86400000;
  const realBlocks: CalBlock[] = React.useMemo(() => {
    const base = new Date(startDate); base.setHours(0, 0, 0, 0);
    return bookings.flatMap(b => {
      if ((b as { status?: string }).status === "cancelled") return [];
      const ci = new Date(b.checkIn);
      if (isNaN(ci.getTime())) return [];
      ci.setHours(0, 0, 0, 0);
      const startCol = Math.round((ci.getTime() - base.getTime()) / DAY_MS);
      const co = new Date(b.checkOut);
      const nights = b.nights || (isNaN(co.getTime()) ? 1 : Math.max(1, Math.round((co.getTime() - ci.getTime()) / DAY_MS)));
      return [{
        id: `bk-${b.id}`,
        roomNumber: b.roomNumber,
        guestName: b.guestName,
        source: b.source,
        startCol,
        nights,
        paymentStatus: b.paymentStatus,
        vip: b.vip,
      }];
    });
  }, [bookings, startDate, DAY_MS]);

  const [blocks, setBlocks] = React.useState<CalBlock[]>(realBlocks);
  // Reseed the board whenever the reservations or the visible window change.
  // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing derived state from the API
  React.useEffect(() => { setBlocks(realBlocks); }, [realBlocks]);
  const [drag, setDrag] = React.useState<DragState | null>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const sortedRooms = React.useMemo(() => {
    let list = [...rooms].sort((a, b) => (Number(b.number) || 0) - (Number(a.number) || 0));
    if (roomTypeFilter !== "all") list = list.filter(r => r.type === roomTypeFilter);
    return list;
  }, [rooms, roomTypeFilter]);

  // Apply payment / source / vip filters to visible blocks
  const visibleBlocks = React.useMemo(() => {
    return blocks.filter(b => {
      if (vipOnly && !b.vip) return false;
      if (paymentFilter !== "all" && b.paymentStatus !== paymentFilter) return false;
      if (sourceFilter !== "all" && b.source !== sourceFilter) return false;
      return true;
    });
  }, [blocks, vipOnly, paymentFilter, sourceFilter]);

  const availableSources = React.useMemo(() => Array.from(new Set(blocks.map(b => b.source))), [blocks]);

  // KPI computation — across the visible window
  const inViewBlocks = React.useMemo(() => visibleBlocks.filter(b => b.startCol < DAYS && b.startCol + b.nights > 0), [visibleBlocks, DAYS]);
  const totalNightsInView = inViewBlocks.reduce((t, b) => t + Math.min(b.startCol + b.nights, DAYS) - Math.max(b.startCol, 0), 0);
  const capacity = sortedRooms.length * DAYS;
  const occupancyPct = capacity > 0 ? Math.round((totalNightsInView / capacity) * 100) : 0;
  const avgRate = 8500; // mock fixed avg rate
  const projectedRevenue = totalNightsInView * avgRate;

  const activeFilters = (vipOnly ? 1 : 0) + (paymentFilter !== "all" ? 1 : 0) + (sourceFilter !== "all" ? 1 : 0) + (roomTypeFilter !== "all" ? 1 : 0);
  const clearAll = () => { setVipOnly(false); setPaymentFilter("all"); setSourceFilter("all"); setRoomTypeFilter("all"); };

  // Drag-to-book selection — registered here so `blocks` is initialized first
  React.useEffect(() => {
    if (!select) return;
    const onMove = (e: MouseEvent) => {
      const rect = gridRef.current?.getBoundingClientRect();
      if (!rect) return;
      // gridRef wraps rows that include the LABEL_W label column on the left, then DAYS cells.
      // Subtract LABEL_W to align with the day-cells coordinate system.
      const relX = e.clientX - rect.left - LABEL_W;
      const dayUnder = Math.max(0, Math.min(DAYS - 1, Math.floor(relX / CELL_W)));
      if (dayUnder !== select.endDay) {
        selectMovedRef.current = true;
        setSelect(s => s ? { ...s, endDay: dayUnder } : null);
      }
    };
    const onUp = () => {
      if (!select) return;
      const lo = Math.min(select.startDay, select.endDay);
      const hi = Math.max(select.startDay, select.endDay);
      const nights = hi - lo + 1;
      const colliding = blocks.some(b =>
        b.roomNumber === select.roomNumber &&
        rangesOverlap(b.startCol, b.startCol + b.nights, lo, lo + nights)
      );
      if (colliding) {
        setToast("Selection conflicts with an existing booking");
        setTimeout(() => setToast(null), 2500);
        setSelect(null);
        return;
      }
      openNewBookingFor(select.roomNumber, lo, nights);
      setSelect(null);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [select, blocks]);
  const gridRef = React.useRef<HTMLDivElement>(null);

  // Drag handlers
  const startDrag = (e: React.MouseEvent, block: CalBlock, mode: DragMode) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect) return;
    setDrag({
      id: block.id,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      initial: { startCol: block.startCol, nights: block.nights, roomNumber: block.roomNumber },
      preview: { startCol: block.startCol, nights: block.nights, roomNumber: block.roomNumber },
      gridTop: rect.top,
      moved: false,
    });
  };

  React.useEffect(() => {
    if (!drag) return;
    const onMove = (e: MouseEvent) => {
      const deltaX = e.clientX - drag.startX;
      const deltaY = e.clientY - drag.startY;
      const moved = Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3;
      const deltaDays = Math.round(deltaX / CELL_W);
      let { startCol, nights, roomNumber } = drag.initial;

      if (drag.mode === "move") {
        startCol = Math.max(0, Math.min(DAYS - nights, drag.initial.startCol + deltaDays));
        const relY = e.clientY - drag.gridTop;
        const rowIdx = Math.max(0, Math.min(sortedRooms.length - 1, Math.floor(relY / ROW_H)));
        roomNumber = sortedRooms[rowIdx].number;
      } else if (drag.mode === "resize-left") {
        const endCol = drag.initial.startCol + drag.initial.nights;
        const newStartCol = Math.max(0, Math.min(endCol - 1, drag.initial.startCol + deltaDays));
        startCol = newStartCol;
        nights = endCol - newStartCol;
      } else {
        // resize-right
        nights = Math.max(1, Math.min(DAYS - drag.initial.startCol, drag.initial.nights + deltaDays));
      }
      setDrag(d => d ? { ...d, preview: { startCol, nights, roomNumber }, moved: d.moved || moved } : null);
    };
    const onUp = () => {
      if (!drag) return;
      // No movement → just clear drag (single click is a no-op; double-click opens details)
      if (!drag.moved) {
        setDrag(null);
        return;
      }
      // Commit if no collision
      const { preview, id } = drag;
      const otherBlocks = blocks.filter(b => b.id !== id);
      const colliding = otherBlocks.some(b =>
        b.roomNumber === preview.roomNumber &&
        rangesOverlap(b.startCol, b.startCol + b.nights, preview.startCol, preview.startCol + preview.nights)
      );
      if (colliding) {
        setToast("Can't drop here — conflicts with another booking");
        setTimeout(() => setToast(null), 2500);
      } else {
        setBlocks(bs => bs.map(b => b.id === id ? { ...b, ...preview } : b));
        const action = drag.mode === "move"
          ? (preview.roomNumber !== drag.initial.roomNumber ? `Moved to Room ${preview.roomNumber}` : `Rescheduled · ${preview.nights}N`)
          : drag.mode === "resize-left" ? `Extended check-in earlier · ${preview.nights}N` : `Stay updated to ${preview.nights} night${preview.nights === 1 ? "" : "s"}`;
        setToast(action);
        setTimeout(() => setToast(null), 2500);
      }
      setDrag(null);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag, blocks]);

  // Target row index for visual highlight during move
  const dragTargetRoomNumber = drag?.mode === "move" ? drag.preview.roomNumber : null;

  const moveDays = (delta: number) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + delta);
    setStartDate(d);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-medium tracking-tight">Reservation Calendar</h1>
          <p className="text-muted-foreground text-sm mt-1">
            <span className="font-medium text-foreground">Drag a booking</span> to change room or dates · <span className="font-medium text-foreground">drag its edges</span> to extend / reduce stay · double-booking prevented
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/rack"><Button variant="outline">Open Room Rack</Button></Link>
          <Link href="/bookings/new"><Button><Plus className="h-4 w-4" />New Booking</Button></Link>
        </div>
      </div>

      {/* KPI strip — at-a-glance window stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2.5">
        <KPI label="Bookings" value={inViewBlocks.length} icon={CalendarIcon} accent="brand" sub={`in ${DAYS}-day window`} />
        <KPI label="Room-nights" value={totalNightsInView} icon={Moon} accent="info" sub={`of ${capacity} capacity`} />
        <KPI label="Occupancy" value={`${occupancyPct}%`} icon={Building2} accent={occupancyPct >= 80 ? "success" : occupancyPct >= 50 ? "accent" : "warning"} sub="across visible rooms" />
        <KPI label="Projected" value={`₹${(projectedRevenue / 1000).toFixed(0)}K`} icon={IndianRupee} accent="success" sub={`@ avg ${avgRate}/n`} />
        <KPI label="VIP guests" value={inViewBlocks.filter(b => b.vip).length} icon={Crown} accent="accent" sub="in view" />
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
          <Button variant="ghost" size="sm" onClick={() => setStartDate(new Date("2026-05-22"))}>
            <CalendarIcon className="h-3.5 w-3.5" /> Today
          </Button>
          {/* Date jumper */}
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
            <Select value="The Pearl Marina" onChange={() => { /* single-property demo */ }} className="h-9 w-auto" title="Property">
              <option>The Pearl Marina</option>
            </Select>
            <Select value={roomTypeFilter} onChange={e => setRoomTypeFilter(e.target.value)} className="h-9 w-auto" title="Room type">
              <option value="all">All room types</option>
              {["Queen", "Deluxe", "Suite", "King", "Family", "Executive"].map(t => <option key={t} value={t}>{t}</option>)}
            </Select>
            <Select value={viewSpan} onChange={e => setViewSpan(e.target.value as ViewSpan)} className="h-9 w-auto" title="View span">
              {(Object.keys(VIEW_SPANS) as ViewSpan[]).map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
            <Button
              variant={filtersOpen ? "primary" : "outline"}
              size="sm"
              onClick={() => setFiltersOpen(o => !o)}
            >
              <Filter className="h-3.5 w-3.5" />
              Filters
              {activeFilters > 0 && (
                <span className={cn(
                  "ml-0.5 h-4 px-1.5 rounded-full text-[10px] font-semibold inline-flex items-center tabular",
                  filtersOpen ? "bg-brand-foreground/20" : "bg-brand text-brand-foreground"
                )}>
                  {activeFilters}
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Advanced filters drawer */}
        {filtersOpen && (
          <div className="mt-3 pt-3 border-t border-border grid grid-cols-1 sm:grid-cols-4 gap-3 animate-in">
            <label className="inline-flex items-center gap-2 text-sm cursor-pointer h-9">
              <input type="checkbox" checked={vipOnly} onChange={e => setVipOnly(e.target.checked)} className="h-4 w-4 rounded border-border text-brand focus:ring-ring" />
              <span className="inline-flex items-center gap-1">VIP only <Crown className="h-3 w-3 text-brand" /></span>
            </label>
            <div className="space-y-1">
              <Label className="text-[11px]">Payment status</Label>
              <Select value={paymentFilter} onChange={e => setPaymentFilter(e.target.value as "all" | PaymentStatus)} className="h-8">
                <option value="all">Any payment</option>
                <option value="paid">Paid</option>
                <option value="partial">Partial</option>
                <option value="unpaid">Unpaid</option>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Source</Label>
              <Select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} className="h-8">
                <option value="all">All sources</option>
                {availableSources.map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
            </div>
            <div className="flex items-end">
              <Button variant="ghost" size="sm" onClick={clearAll} disabled={activeFilters === 0}>
                <X className="h-3.5 w-3.5" />Clear ({activeFilters})
              </Button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 mt-3 text-xs">
          <LegendChip color="bg-success" label="Paid" />
          <LegendChip color="bg-warning" label="Partial" />
          <LegendChip color="bg-danger" label="Unpaid" />
          <div className="mx-1 h-3 w-px bg-border" />
          <Badge tone="brand">VIP</Badge>
          <span className="text-subtle-foreground ml-auto inline-flex items-center gap-1.5">
            <MousePointerClick className="h-3.5 w-3.5" />
            <span><span className="text-foreground font-medium">Double-click a booking</span> for guest profile · <span className="text-foreground font-medium">drag across empty cells</span> to pick check-in → check-out · drag a booking to move or resize</span>
          </span>
        </div>
        <div className="text-xs text-subtle-foreground mt-1.5 pt-1.5 border-t border-border/50">
          Hotel night = <span className="text-foreground font-medium">12:00 PM</span> check-in → next-day <span className="text-foreground font-medium">11:00 AM</span> checkout
        </div>
      </Card>

      {/* Timeline */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <div style={{ width: LABEL_W + DAYS * CELL_W, minWidth: "100%" }}>
            {/* Header row */}
            <div className="flex sticky top-0 bg-surface-elevated z-10 border-b border-border">
              <div style={{ width: LABEL_W }} className="px-4 py-2 border-r border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Room
              </div>
              {days.map((d, i) => {
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                const isToday = d.toDateString() === new Date("2026-05-24").toDateString();
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
            <div ref={gridRef}>
              {sortedRooms.map(room => {
                const roomBlocks = visibleBlocks.filter(b => b.roomNumber === room.number);
                const isDragTarget = dragTargetRoomNumber === room.number;
                return (
                  <div
                    key={room.id}
                    className={cn(
                      "flex border-b border-border transition-colors",
                      isDragTarget ? "bg-brand-soft/40" : "hover:bg-surface-sunken/30"
                    )}
                    style={{ height: ROW_H }}
                  >
                    <div
                      style={{ width: LABEL_W }}
                      className={cn(
                        "px-4 flex items-center gap-2 border-r border-border",
                        isDragTarget ? "bg-brand-soft" : "bg-surface-elevated/50"
                      )}
                    >
                      <span className="text-sm font-semibold tabular w-10">{room.number}</span>
                      <div className="min-w-0">
                        <p className="text-xs text-foreground truncate">{room.type}</p>
                        <p className="text-[10px] text-muted-foreground">Floor {room.floor}</p>
                      </div>
                    </div>
                    <div className="relative flex-1" style={{ height: ROW_H }}>
                      {/* Day grid with noon tick — empty cells are clickable to start a new booking */}
                      <div className="absolute inset-0 flex">
                        {days.map((d, i) => {
                          const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                          const isToday = d.toDateString() === new Date("2026-05-24").toDateString();
                          // Is this cell occupied by any block?
                          const isOccupied = roomBlocks.some(b => i >= b.startCol && i < b.startCol + b.nights);
                          // Is this cell inside the active drag-select range for this room?
                          const inSelect = !!(
                            select &&
                            select.roomNumber === room.number &&
                            i >= Math.min(select.startDay, select.endDay) &&
                            i <= Math.max(select.startDay, select.endDay)
                          );
                          return (
                            <button
                              type="button"
                              key={i}
                              disabled={isOccupied}
                              onMouseDown={e => !isOccupied && startSelect(room.number, i, e)}
                              style={{ width: CELL_W }}
                              title={isOccupied ? "" : `Click or drag to book Room ${room.number} starting ${d.toLocaleDateString()}`}
                              className={cn(
                                "relative border-r border-border group/cell",
                                isWeekend && "bg-surface-sunken/30",
                                isToday && "bg-brand-soft/30",
                                !isOccupied && !inSelect && "hover:bg-brand/10 transition-colors cursor-pointer",
                                inSelect && "bg-brand/25 ring-1 ring-inset ring-brand"
                              )}
                            >
                              {/* Noon tick */}
                              <div
                                className="absolute top-0 bottom-0 w-px bg-border-strong/30"
                                style={{ left: NOON_OFFSET }}
                                aria-hidden="true"
                              />
                              {/* Hover affordance — small + icon */}
                              {!isOccupied && !inSelect && (
                                <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/cell:opacity-100 transition-opacity">
                                  <span className="h-5 w-5 rounded-full bg-brand text-brand-foreground flex items-center justify-center shadow-md">
                                    <Plus className="h-3 w-3" />
                                  </span>
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Selection callout — floating tag above the active drag-select range for this room */}
                      {select && room.number === select.roomNumber && (() => {
                        const lo = Math.min(select.startDay, select.endDay);
                        const hi = Math.max(select.startDay, select.endDay);
                        const nights = hi - lo + 1;
                        const ci = new Date(startDate); ci.setDate(ci.getDate() + lo);
                        const co = new Date(startDate); co.setDate(co.getDate() + lo + nights);
                        return (
                          <div
                            className="absolute z-20 -top-1 px-2 py-0.5 rounded-md bg-brand text-brand-foreground text-[10px] font-semibold shadow-md tabular pointer-events-none animate-in flex items-center gap-1"
                            style={{ left: lo * CELL_W + 4, transform: "translateY(-100%)" }}
                          >
                            {nights}N · {ci.toLocaleDateString(undefined, { day: "2-digit", month: "short" })} → {co.toLocaleDateString(undefined, { day: "2-digit", month: "short" })}
                            <span className="text-brand-foreground/80">· release to book</span>
                          </div>
                        );
                      })()}

                      {/* Blocks — positioned to span 12:00 PM → next-day 11:00 AM.
                          Click to open guest details · Drag body to move (rooms + dates) · Drag edge handles to resize */}
                      {roomBlocks.map((b) => {
                        const isDragging = drag?.id === b.id;
                        // While dragging this block, hide the original (preview ghost is rendered below)
                        const left = isDragging ? -9999 : blockLeft(b.startCol);
                        const w = blockWidth(b.nights);
                        return (
                          <div
                            key={b.id}
                            onMouseDown={(e) => startDrag(e, b, "move")}
                            onDoubleClick={(e) => { e.stopPropagation(); openGuestForBlock(b); }}
                            className={cn(
                              "absolute top-1.5 bottom-1.5 rounded-md border text-left overflow-hidden hover:shadow-md hover:z-10 transition-shadow cursor-grab active:cursor-grabbing group/block select-none",
                              PAYMENT_BG[b.paymentStatus]
                            )}
                            style={{ left, width: w }}
                            title={`${b.guestName} · ${b.nights}N · ${b.source}\nDouble-click to view full profile · drag to move · drag edges to resize`}
                          >
                            {/* Left status bar */}
                            <div className={cn("absolute left-0 top-0 bottom-0 w-0.5", PAYMENT_BAR[b.paymentStatus])} />

                            {/* Resize handles (left + right) — wider invisible hit area, narrow visible indicator on hover */}
                            <div
                              onMouseDown={(e) => startDrag(e, b, "resize-left")}
                              className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize z-10 hover:bg-brand/30"
                              title="Drag to extend / reduce check-in"
                            />
                            <div
                              onMouseDown={(e) => startDrag(e, b, "resize-right")}
                              className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize z-10 hover:bg-brand/30"
                              title="Drag to extend / reduce checkout"
                            />

                            {/* Check-in / out markers */}
                            <span className="absolute left-2.5 top-0.5 text-[8px] font-mono text-muted-foreground/80 tabular leading-none pointer-events-none">12P</span>
                            <span className="absolute right-2.5 top-0.5 text-[8px] font-mono text-muted-foreground/80 tabular leading-none pointer-events-none">11A</span>

                            {/* Guest name + source */}
                            <div className="pl-2.5 pr-2.5 pt-2.5 pointer-events-none">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-medium truncate">{b.guestName}</p>
                                {b.vip && <span className="text-[10px] text-brand shrink-0">★</span>}
                              </div>
                              <p className="text-[10px] text-muted-foreground truncate">
                                {w >= 70 ? `${b.nights}N · ${b.source}` : `${b.nights}N`}
                              </p>
                            </div>
                          </div>
                        );
                      })}

                      {/* Drag preview ghost for blocks belonging to this room while dragging */}
                      {drag && room.number === drag.preview.roomNumber && (() => {
                        const draggedBlock = blocks.find(x => x.id === drag.id);
                        if (!draggedBlock) return null;
                        const { startCol, nights } = drag.preview;
                        return (
                          <div
                            className={cn(
                              "absolute top-1.5 bottom-1.5 rounded-md border-2 border-dashed border-brand bg-brand/20 pointer-events-none z-20 overflow-hidden"
                            )}
                            style={{ left: blockLeft(startCol), width: blockWidth(nights) }}
                          >
                            <div className="pl-2.5 pr-2.5 pt-1.5 text-xs font-medium text-brand-soft-foreground tabular">
                              {nights}N · {new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + startCol).toLocaleDateString(undefined, { day: "2-digit", month: "short" })} → +{nights}N
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      {/* Toast — drag commit feedback */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-foreground text-background rounded-lg px-4 py-3 text-sm shadow-2xl animate-in slide-in-from-bottom-2 inline-flex items-center gap-2.5 ring-1 ring-foreground/20">
          <span className="h-6 w-6 rounded-full bg-success text-white inline-flex items-center justify-center"><CheckCircle2 className="h-3.5 w-3.5" /></span>
          <span className="font-medium">{toast}</span>
        </div>
      )}

      {/* Guest detail drawer (opens on block click) */}
      <GuestDetailDrawer
        open={selected !== null}
        onClose={() => setSelected(null)}
        guest={selected?.guest ?? null}
        reservation={selected?.reservation ?? null}
      />
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

function KPI({ label, value, icon: Icon, accent, sub }: { label: string; value: React.ReactNode; icon: typeof CalendarIcon; accent: "brand" | "info" | "accent" | "warning" | "success"; sub?: string }) {
  const accentClass = {
    brand: "bg-brand-soft text-brand-soft-foreground",
    info: "bg-info-soft text-info",
    accent: "bg-accent-soft text-accent",
    warning: "bg-warning-soft text-warning",
    success: "bg-success-soft text-success",
  }[accent];
  return (
    <div className="rounded-lg border border-border bg-surface p-3 flex items-center gap-3 hover:shadow-sm transition-shadow">
      <span className={cn("h-9 w-9 rounded-md flex items-center justify-center shrink-0", accentClass)}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold leading-tight">{label}</p>
        <p className="text-lg font-semibold tabular leading-tight mt-0.5 truncate">{value}</p>
        {sub && <p className="text-[10px] text-muted-foreground leading-tight truncate">{sub}</p>}
      </div>
    </div>
  );
}
