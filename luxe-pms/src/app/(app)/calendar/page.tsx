"use client";
import * as React from "react";
import Link from "next/link";
import {
  ChevronLeft, ChevronRight, Plus, Filter, Calendar as CalendarIcon, MousePointerClick,
  Crown, X, Building2, IndianRupee, Moon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { PaymentStatus, Reservation, Guest } from "@/lib/types";
import { cn } from "@/lib/utils";
import { apiGet } from "@/lib/api";
import { GuestDetailDrawer } from "@/components/guests/guest-detail-drawer";

const CELL_W = 80;
const ROW_H = 56;
const LABEL_W = 200;
const VIEW_SPANS = { Day: 1, Week: 7, "2 Weeks": 14, Month: 30 } as const;
type ViewSpan = keyof typeof VIEW_SPANS;

// Shape returned by GET /room-board (one row per configured room).
interface RoomRow {
  id: number | string;
  number: string;
  type: string;
  floor: number;
}

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

// Hotel timing: 12:00 PM check-in → next-day 11:00 AM checkout = 23h per night.
// Position blocks visually across the day boundary they actually span.
const HOUR_W = CELL_W / 24;
const NOON_OFFSET = 12 * HOUR_W;            // start of every booking (12:00 PM)
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
  const [startDate, setStartDate] = React.useState(() => {
    const d = new Date("2026-06-02");
    return d;
  });
  const [selected, setSelected] = React.useState<{ guest: Guest; reservation: Reservation } | null>(null);

  // Live reservations, rooms and guests — sourced entirely from Postgres.
  const [bookings, setBookings] = React.useState<Reservation[]>([]);
  const [rooms, setRooms] = React.useState<RoomRow[]>([]);
  const [guests, setGuests] = React.useState<Guest[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  React.useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiGet<Reservation[]>("/bookings"),
      apiGet<RoomRow[]>("/room-board"),
      apiGet<Guest[]>("/guests"),
    ])
      .then(([bk, rm, gs]) => {
        if (cancelled) return;
        setBookings(bk);
        setRooms(rm);
        setGuests(gs);
      })
      .catch(() => { if (!cancelled) setError("Couldn't reach the backend. Check that the API is running."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Toolbar state
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
      ({
        id: realId ?? b.id,
        bookingNo: b.id,
        guestName: b.guestName,
        roomNumber: b.roomNumber,
        roomType: "—",
        source: b.source,
        checkIn: "",
        checkOut: "",
        nights: b.nights,
        adults: 1,
        children: 0,
        paymentStatus: b.paymentStatus,
        ratePlan: "—",
        total: 0,
        advance: 0,
        balance: 0,
        vip: b.vip,
      } as unknown as Reservation);
    const guest =
      guests.find(g => g.name === b.guestName) ?? {
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

  const days = React.useMemo(() => {
    return Array.from({ length: DAYS }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [startDate, DAYS]);

  // Build calendar blocks from real reservations, positioned by their actual
  // check-in date relative to the visible window.
  const DAY_MS = 86400000;
  const blocks: CalBlock[] = React.useMemo(() => {
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
  // ADR derived from real bookings: total room revenue ÷ total room-nights.
  const avgRate = React.useMemo(() => {
    const totalRev = bookings.reduce((t, b) => t + (Number((b as { total?: number }).total) || 0), 0);
    const totalNights = bookings.reduce((t, b) => t + (Number(b.nights) || 0), 0);
    return totalNights > 0 ? Math.round(totalRev / totalNights) : 0;
  }, [bookings]);
  const projectedRevenue = totalNightsInView * avgRate;

  const activeFilters = (vipOnly ? 1 : 0) + (paymentFilter !== "all" ? 1 : 0) + (sourceFilter !== "all" ? 1 : 0) + (roomTypeFilter !== "all" ? 1 : 0);
  const clearAll = () => { setVipOnly(false); setPaymentFilter("all"); setSourceFilter("all"); setRoomTypeFilter("all"); };

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
            At-a-glance view of every stay across the window · <span className="font-medium text-foreground">double-click a booking</span> for the guest profile
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
            <span><span className="text-foreground font-medium">Double-click a booking</span> for the full guest profile</span>
          </span>
        </div>
        <div className="text-xs text-subtle-foreground mt-1.5 pt-1.5 border-t border-border/50">
          Hotel night = <span className="text-foreground font-medium">12:00 PM</span> check-in → next-day <span className="text-foreground font-medium">11:00 AM</span> checkout
        </div>
      </Card>

      {/* Backend status banners — the board is sourced live from Postgres */}
      {error && (
        <Card className="p-3 border-danger/40 bg-danger/10 text-sm text-danger">
          {error}
        </Card>
      )}
      {loading && !error && (
        <Card className="p-3 text-sm text-muted-foreground inline-flex items-center gap-2">
          <span className="h-3.5 w-3.5 rounded-full border-2 border-brand border-t-transparent animate-spin" />
          Loading reservations from the backend…
        </Card>
      )}
      {!loading && !error && sortedRooms.length === 0 && (
        <Card className="p-6 text-sm text-muted-foreground text-center">
          No rooms found in the database. Add rooms in Setup to populate the calendar.
        </Card>
      )}

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
            <div>
              {sortedRooms.map(room => {
                const roomBlocks = visibleBlocks.filter(b => b.roomNumber === room.number);
                return (
                  <div
                    key={room.id}
                    className="flex border-b border-border transition-colors hover:bg-surface-sunken/30"
                    style={{ height: ROW_H }}
                  >
                    <div
                      style={{ width: LABEL_W }}
                      className="px-4 flex items-center gap-2 border-r border-border bg-surface-elevated/50"
                    >
                      <span className="text-sm font-semibold tabular w-10">{room.number}</span>
                      <div className="min-w-0">
                        <p className="text-xs text-foreground truncate">{room.type}</p>
                        <p className="text-[10px] text-muted-foreground">Floor {room.floor}</p>
                      </div>
                    </div>
                    <div className="relative flex-1" style={{ height: ROW_H }}>
                      {/* Day grid with noon tick — display only */}
                      <div className="absolute inset-0 flex">
                        {days.map((d, i) => {
                          const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                          const isToday = d.toDateString() === new Date("2026-05-24").toDateString();
                          return (
                            <div
                              key={i}
                              style={{ width: CELL_W }}
                              className={cn(
                                "relative border-r border-border",
                                isWeekend && "bg-surface-sunken/30",
                                isToday && "bg-brand-soft/30"
                              )}
                            >
                              {/* Noon tick */}
                              <div
                                className="absolute top-0 bottom-0 w-px bg-border-strong/30"
                                style={{ left: NOON_OFFSET }}
                                aria-hidden="true"
                              />
                            </div>
                          );
                        })}
                      </div>

                      {/* Blocks — positioned to span 12:00 PM → next-day 11:00 AM.
                          Double-click to open guest details. Display only — no drag. */}
                      {roomBlocks.map((b) => {
                        const left = blockLeft(b.startCol);
                        const w = blockWidth(b.nights);
                        return (
                          <div
                            key={b.id}
                            onDoubleClick={(e) => { e.stopPropagation(); openGuestForBlock(b); }}
                            className={cn(
                              "absolute top-1.5 bottom-1.5 rounded-md border text-left overflow-hidden hover:shadow-md hover:z-10 transition-shadow cursor-pointer group/block select-none",
                              PAYMENT_BG[b.paymentStatus]
                            )}
                            style={{ left, width: w }}
                            title={`${b.guestName} · ${b.nights}N · ${b.source}\nDouble-click to view full profile`}
                          >
                            {/* Left status bar */}
                            <div className={cn("absolute left-0 top-0 bottom-0 w-0.5", PAYMENT_BAR[b.paymentStatus])} />

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
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      {/* Guest detail drawer (opens on block double-click) */}
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
