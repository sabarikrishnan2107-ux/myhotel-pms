"use client";
import * as React from "react";
import Link from "next/link";
import {
  Filter, Search, BedDouble, Crown, MoreHorizontal, KeyRound, LogIn, LogOut,
  CalendarPlus, CalendarMinus, ArrowLeftRight, CreditCard, UtensilsCrossed,
  Sparkles, Wrench, Receipt, LayoutGrid, List, MousePointerClick,
  CheckCircle2, X, Lock, LockOpen, AlertTriangle, Building2, Users, Eye,
  Wine, Shirt, BellRing,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, StatusBadge, PaymentBadge } from "@/components/ui/badge";
import { Input, Label, Select } from "@/components/ui/input";
import { ROOMS, RESERVATIONS, GUESTS } from "@/lib/mock-data";
import type { Room, RoomStatus, Reservation, Guest } from "@/lib/types";
import { cn, formatTime, money } from "@/lib/utils";
import { apiGet, apiPost, apiPut } from "@/lib/api";
import { GuestDetailDrawer } from "@/components/guests/guest-detail-drawer";

// Status filter metadata — semantic color for each chip
const STATUS_FILTERS: { value: RoomStatus | "all"; label: string; dot?: string }[] = [
  { value: "all", label: "All" },
  { value: "available", label: "Available", dot: "bg-status-available" },
  { value: "occupied", label: "Occupied", dot: "bg-status-occupied" },
  { value: "reserved", label: "Reserved", dot: "bg-status-reserved" },
  { value: "checkout-pending", label: "Checkout", dot: "bg-status-checkout-pending" },
  { value: "dirty", label: "Dirty", dot: "bg-status-dirty" },
  { value: "cleaning", label: "Cleaning", dot: "bg-status-cleaning" },
  { value: "maintenance", label: "Maintenance", dot: "bg-status-maintenance" },
];

const STATUS_BORDER: Record<RoomStatus, string> = {
  available: "border-l-status-available",
  reserved: "border-l-status-reserved",
  occupied: "border-l-status-occupied",
  dirty: "border-l-status-dirty",
  cleaning: "border-l-status-cleaning",
  inspected: "border-l-status-inspected",
  ready: "border-l-status-ready",
  maintenance: "border-l-status-maintenance",
  blocked: "border-l-status-blocked",
  "checkout-pending": "border-l-status-checkout-pending",
};

/** Build a Reservation + Guest pair for a room (real if it matches, synthesized if not) */
function lookupGuest(room: Room): { guest: Guest; reservation: Reservation } | null {
  if (!room.guestName) return null;
  const reservation =
    RESERVATIONS.find(r => r.roomNumber === room.number) ??
    RESERVATIONS.find(r => r.guestName === room.guestName) ??
    RESERVATIONS[0];
  const guest =
    GUESTS.find(g => g.name === room.guestName) ?? {
      id: `g-${room.guestName.replace(/\s+/g, "-").toLowerCase()}`,
      name: room.guestName,
      phone: "—",
      email: "—",
      nationality: "—",
      idType: "Passport",
      idNumber: "—",
      vip: room.vip ?? false,
      blacklist: false,
      lifetimeNights: 1,
      lifetimeSpend: reservation.total,
      lastStay: reservation.checkIn,
    };
  return { guest, reservation };
}

type ActionKind = "extend" | "reduce" | "change" | "payment" | "block" | "unblock" | "order";

export default function RackPage() {
  const [filter, setFilter] = React.useState<RoomStatus | "all">("all");
  const [search, setSearch] = React.useState("");
  const [floor, setFloor] = React.useState<string>("all");
  const [type, setType] = React.useState<string>("all");
  const [view, setView] = React.useState<"cards" | "list">("cards");
  const [selected, setSelected] = React.useState<{ guest: Guest; reservation: Reservation } | null>(null);
  const [advancedOpen, setAdvancedOpen] = React.useState(false);
  const [advVIPOnly, setAdvVIPOnly] = React.useState(false);
  const [advHasGuestOnly, setAdvHasGuestOnly] = React.useState(false);
  const [advRateMin, setAdvRateMin] = React.useState<number>(0);
  const [actionDialog, setActionDialog] = React.useState<{ kind: ActionKind; room: Room } | null>(null);
  const [toast, setToast] = React.useState<string | null>(null);

  // Live room board from Postgres: real occupancy (from bookings) + housekeeping status.
  const [rooms, setRooms] = React.useState<Room[]>(ROOMS);
  const refreshBoard = React.useCallback(
    () => apiGet<Room[]>("/room-board").then(setRooms).catch(() => {}),
    [],
  );
  React.useEffect(() => { refreshBoard(); }, [refreshBoard]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2600); };

  const openGuestFor = (room: Room) => {
    const found = lookupGuest(room);
    if (found) setSelected(found);
  };

  const openAction = (kind: ActionKind, room: Room) => setActionDialog({ kind, room });

  const filtered = rooms.filter(r => {
    if (filter !== "all" && r.status !== filter) return false;
    if (floor !== "all" && r.floor !== Number(floor)) return false;
    if (type !== "all" && r.type !== type) return false;
    if (search && !`${r.number} ${r.guestName ?? ""}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (advVIPOnly && !r.vip) return false;
    if (advHasGuestOnly && !r.guestName) return false;
    if (advRateMin && r.rate < advRateMin) return false;
    return true;
  });

  const counts = STATUS_FILTERS.reduce<Record<string, number>>((acc, f) => {
    acc[f.value] = f.value === "all" ? rooms.length : rooms.filter(r => r.status === f.value).length;
    return acc;
  }, {});

  const occRate = Math.round(((counts.occupied ?? 0) + (counts["checkout-pending"] ?? 0)) / rooms.length * 100);

  const activeFilterCount = (filter !== "all" ? 1 : 0) + (floor !== "all" ? 1 : 0) + (type !== "all" ? 1 : 0) + (search ? 1 : 0) + (advVIPOnly ? 1 : 0) + (advHasGuestOnly ? 1 : 0) + (advRateMin > 0 ? 1 : 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-medium tracking-tight">Room Rack</h1>
          <p className="text-muted-foreground text-sm mt-1 inline-flex items-center gap-1">
            <span>{filtered.length} of {rooms.length} rooms · Live status across all floors</span>
          </p>
          <p className="text-[11px] text-subtle-foreground mt-1 inline-flex items-center gap-1">
            <MousePointerClick className="h-3 w-3" />
            <span>Double-click any occupied room for full guest profile & folio</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/calendar"><Button variant="outline">Open Calendar</Button></Link>
          <Link href="/bookings/new"><Button><LogIn className="h-4 w-4" />Walk-in Check-in</Button></Link>
        </div>
      </div>

      {/* KPI bar — at-a-glance occupancy */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <KPI label="Occupancy" value={`${occRate}%`} icon={Building2} accent="brand" sub={`${(counts.occupied ?? 0) + (counts["checkout-pending"] ?? 0)} / ${rooms.length}`} />
        <KPI label="Available" value={counts.available ?? 0} icon={CheckCircle2} accent="success" sub="Ready to sell" />
        <KPI label="Occupied" value={counts.occupied ?? 0} icon={Users} accent="accent" sub="In-house" />
        <KPI label="Arriving" value={counts.reserved ?? 0} icon={LogIn} accent="info" sub="Reserved today" />
        <KPI label="Dirty / OOO" value={(counts.dirty ?? 0) + (counts.maintenance ?? 0)} icon={Wrench} accent="warning" sub="Not ready" />
        <KPI label="Avg rate" value={money(Math.round(rooms.reduce((t, r) => t + r.rate, 0) / rooms.length))} icon={CreditCard} accent="neutral" sub="per night" />
      </div>

      {/* Status filter chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        {STATUS_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              "h-8 px-3 rounded-full text-xs font-medium border transition-colors inline-flex items-center gap-2",
              filter === f.value
                ? "bg-foreground text-background border-foreground shadow-xs"
                : "bg-surface text-muted-foreground border-border hover:bg-surface-sunken hover:text-foreground"
            )}
          >
            {f.dot && <span className={cn("h-1.5 w-1.5 rounded-full", f.dot)} />}
            {f.label}
            <span className={cn(
              "tabular text-[10px] rounded-full px-1.5 h-4 inline-flex items-center font-semibold",
              filter === f.value ? "bg-background/15 text-background" : "bg-surface-sunken text-muted-foreground"
            )}>
              {counts[f.value]}
            </span>
          </button>
        ))}
      </div>

      {/* Sub-filters */}
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by room number or guest name"
              className="pl-9 h-9"
            />
          </div>
          <Select value={floor} onChange={e => setFloor(e.target.value)} className="h-9 w-auto">
            <option value="all">All floors</option>
            {[1, 2, 3, 4, 5, 6].map(f => <option key={f} value={f}>Floor {f}</option>)}
          </Select>
          <Select value={type} onChange={e => setType(e.target.value)} className="h-9 w-auto">
            <option value="all">All types</option>
            {["Queen", "Deluxe", "Suite", "King", "Family", "Executive"].map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Select>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={() => { setFilter("all"); setSearch(""); setFloor("all"); setType("all"); setAdvVIPOnly(false); setAdvHasGuestOnly(false); setAdvRateMin(0); }}>
              Clear ({activeFilterCount})
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="outline" size="sm" onClick={() => setAdvancedOpen(o => !o)}>
            <Filter className="h-3.5 w-3.5" />
            {advancedOpen ? "Hide" : "More"} filters
          </Button>

          {/* View toggle */}
          <div className="inline-flex rounded-md border border-border overflow-hidden h-9 ml-1">
            <button
              type="button"
              onClick={() => setView("cards")}
              aria-label="Card view"
              title="Card view"
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
              aria-label="List view"
              title="List view"
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

        {/* Advanced (collapsible) */}
        {advancedOpen && (
          <div className="mt-3 pt-3 border-t border-border grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in">
            <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={advVIPOnly} onChange={e => setAdvVIPOnly(e.target.checked)} className="h-4 w-4 rounded border-border text-brand focus:ring-ring" />
              <span className="inline-flex items-center gap-1">VIP only <Crown className="h-3 w-3 text-brand" /></span>
            </label>
            <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={advHasGuestOnly} onChange={e => setAdvHasGuestOnly(e.target.checked)} className="h-4 w-4 rounded border-border text-brand focus:ring-ring" />
              <span>With guest only</span>
            </label>
            <div className="space-y-1">
              <Label className="text-[11px]">Min rate (₹/night)</Label>
              <Input type="number" value={advRateMin || ""} onChange={e => setAdvRateMin(Number(e.target.value) || 0)} placeholder="0" className="h-8 tabular" />
            </div>
          </div>
        )}
      </Card>

      {/* Body — Card view or List view */}
      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <Search className="h-8 w-8 mx-auto text-subtle-foreground" />
          <p className="mt-3 font-medium">No rooms match your filters</p>
          <p className="text-xs text-muted-foreground mt-1">Try clearing filters above or searching for a specific room.</p>
        </Card>
      ) : view === "cards" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6 gap-3 items-start">
          {[...filtered]
            .sort((a, b) => b.floor - a.floor || Number(a.number) - Number(b.number))
            .map(room => (
              <RoomCard
                key={room.id}
                room={room}
                onOpenGuest={openGuestFor}
                onAction={openAction}
              />
            ))}
        </div>
      ) : (
        <RoomListView rooms={filtered} onOpenGuest={openGuestFor} onAction={openAction} />
      )}

      {/* Guest detail drawer */}
      <GuestDetailDrawer
        open={selected !== null}
        onClose={() => setSelected(null)}
        guest={selected?.guest ?? null}
        reservation={selected?.reservation ?? null}
      />

      {/* Action dialog */}
      {actionDialog && (
        <ActionDialog
          kind={actionDialog.kind}
          room={actionDialog.room}
          allRooms={rooms}
          onClose={() => setActionDialog(null)}
          onDone={(msg) => { setActionDialog(null); showToast(msg); refreshBoard(); }}
          onError={(msg) => { setActionDialog(null); showToast(msg); }}
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

function KPI({ label, value, icon: Icon, accent, sub }: { label: string; value: React.ReactNode; icon: typeof BedDouble; accent: "brand" | "info" | "accent" | "warning" | "success" | "neutral"; sub?: string }) {
  const accentClass = {
    brand: "bg-brand-soft text-brand-soft-foreground",
    info: "bg-info-soft text-info",
    accent: "bg-accent-soft text-accent",
    warning: "bg-warning-soft text-warning",
    success: "bg-success-soft text-success",
    neutral: "bg-surface-sunken text-muted-foreground",
  }[accent];
  return (
    <div className="rounded-lg border border-border bg-surface p-3 flex items-center gap-3 hover:shadow-sm transition-shadow">
      <span className={cn("h-9 w-9 rounded-md flex items-center justify-center shrink-0", accentClass)}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold leading-tight">{label}</p>
        <p className="text-lg font-semibold tabular leading-tight mt-0.5">{value}</p>
        {sub && <p className="text-[10px] text-muted-foreground leading-tight">{sub}</p>}
      </div>
    </div>
  );
}

function RoomListView({ rooms, onOpenGuest, onAction }: { rooms: Room[]; onOpenGuest: (r: Room) => void; onAction: (kind: ActionKind, room: Room) => void }) {
  const sorted = [...rooms].sort((a, b) => Number(b.number) - Number(a.number));
  return (
    <Card className="p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface-elevated border-b border-border">
            <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3 font-semibold">Room</th>
              <th className="px-4 py-3 font-semibold">Type</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Guest</th>
              <th className="px-4 py-3 font-semibold">Source</th>
              <th className="px-4 py-3 font-semibold">Payment</th>
              <th className="px-4 py-3 font-semibold">In / Out</th>
              <th className="px-4 py-3 font-semibold text-right">Rate</th>
              <th className="px-4 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sorted.map(room => {
              const isOccupied = room.status === "occupied" || room.status === "checkout-pending";
              const isReserved = room.status === "reserved";
              const hasGuest = !!room.guestName;
              const lookup = lookupGuest(room);
              const bookingNo = room.bookingNo ?? lookup?.reservation.bookingNo;
              return (
                <tr
                  key={room.id}
                  onDoubleClick={() => hasGuest && onOpenGuest(room)}
                  title={hasGuest ? "Double-click to view full guest profile & folio" : undefined}
                  className={cn(
                    "hover:bg-surface-sunken/50 transition-colors group",
                    hasGuest && "cursor-pointer select-none"
                  )}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className={cn("w-1 h-9 rounded-full shrink-0", STATUS_BORDER[room.status].replace("border-l-", "bg-"))} />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-base font-semibold tabular leading-none">{room.number}</p>
                          {room.vip && <Crown className="h-3 w-3 text-brand" />}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Floor {room.floor}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><Badge tone="neutral">{room.type}</Badge></td>
                  <td className="px-4 py-3"><StatusBadge status={room.status} /></td>
                  <td className="px-4 py-3">
                    {room.guestName ? (
                      <p className="font-medium truncate max-w-[180px]">{room.guestName}</p>
                    ) : (
                      <span className="text-xs text-subtle-foreground italic">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{room.source ?? "—"}</td>
                  <td className="px-4 py-3">{room.paymentStatus ? <PaymentBadge status={room.paymentStatus} /> : <span className="text-xs text-subtle-foreground">—</span>}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground tabular whitespace-nowrap">
                    {room.checkIn ? (
                      <>
                        <span>{formatTime(room.checkIn)}</span>
                        <span className="text-subtle-foreground"> → </span>
                        <span>{formatTime(room.checkOut!)}</span>
                      </>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular font-medium">{money(room.rate)}<span className="text-xs text-muted-foreground font-normal">/n</span></td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                      {hasGuest && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onOpenGuest(room); }}
                          className="h-7 w-7 rounded-md border border-border hover:bg-brand hover:text-brand-foreground hover:border-brand inline-flex items-center justify-center text-muted-foreground transition-colors"
                          title="View guest"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {isOccupied && bookingNo && (
                        <Link href={`/checkout/${bookingNo}`} onClick={(e) => e.stopPropagation()} className="h-7 px-2 rounded-md text-[11px] font-medium bg-brand text-brand-foreground hover:bg-brand/90 inline-flex items-center gap-1">
                          <LogOut className="h-3 w-3" />Checkout
                        </Link>
                      )}
                      {isReserved && bookingNo && (
                        <Link href={`/checkin?book=${bookingNo}`} onClick={(e) => e.stopPropagation()} className="h-7 px-2 rounded-md text-[11px] font-medium bg-brand text-brand-foreground hover:bg-brand/90 inline-flex items-center gap-1">
                          <LogIn className="h-3 w-3" />Check-in
                        </Link>
                      )}
                      {!isOccupied && !isReserved && (
                        <Link href="/bookings/new" onClick={(e) => e.stopPropagation()} className="h-7 px-2 rounded-md text-[11px] font-medium bg-brand text-brand-foreground hover:bg-brand/90 inline-flex items-center gap-1">
                          <KeyRound className="h-3 w-3" />Book
                        </Link>
                      )}
                      {bookingNo ? (
                        <Link href={`/folio/${bookingNo}?from=rack`} onClick={(e) => e.stopPropagation()} className="h-7 px-2 rounded-md text-[11px] font-medium border border-border hover:bg-surface-sunken inline-flex items-center gap-1">
                          <Receipt className="h-3 w-3" />Folio
                        </Link>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function RoomCard({ room, onOpenGuest, onAction }: { room: Room; onOpenGuest: (r: Room) => void; onAction: (kind: ActionKind, room: Room) => void }) {
  const [showActions, setShowActions] = React.useState(false);
  const isOccupied = room.status === "occupied" || room.status === "checkout-pending";
  const isReserved = room.status === "reserved";
  const hasGuest = !!room.guestName;
  const lookup = lookupGuest(room);
  const bookingNo = room.bookingNo ?? lookup?.reservation.bookingNo;

  return (
    <Card
      onDoubleClick={() => hasGuest && onOpenGuest(room)}
      title={hasGuest ? "Double-click to view full guest profile & folio" : undefined}
      className={cn(
        "relative overflow-hidden border-l-4 transition-all hover:shadow-md hover:-translate-y-0.5",
        STATUS_BORDER[room.status],
        hasGuest && "cursor-pointer select-none"
      )}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="h-9 w-9 rounded-md bg-surface-sunken flex items-center justify-center">
              <BedDouble className="h-4.5 w-4.5 text-muted-foreground" />
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-lg font-semibold leading-none">{room.number}</p>
                {room.vip && <Crown className="h-3.5 w-3.5 text-brand" />}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">{room.type} · Floor {room.floor}</p>
            </div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); setShowActions(s => !s); }}
            className={cn(
              "h-7 w-7 rounded-md inline-flex items-center justify-center text-muted-foreground transition-colors",
              showActions ? "bg-brand-soft text-brand-soft-foreground" : "hover:bg-surface-sunken"
            )}
            aria-label="Quick actions"
            title="Quick actions"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3">
          <StatusBadge status={room.status} />
        </div>

        {room.guestName ? (
          <div className="mt-3 pt-3 border-t border-border space-y-1.5">
            <p className="text-sm font-medium truncate">{room.guestName}</p>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="truncate">{room.source}</span>
              {room.paymentStatus && <PaymentBadge status={room.paymentStatus} />}
            </div>
            {room.checkIn && (
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>In {formatTime(room.checkIn)}</span>
                <span>Out {formatTime(room.checkOut!)}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-3 pt-3 border-t border-border text-[11px] text-muted-foreground flex items-center justify-between">
            <span>Ready to sell</span>
            <span className="tabular font-medium text-foreground">{money(room.rate)}/n</span>
          </div>
        )}

        {/* Action sheet — grouped by category */}
        {showActions && (
          <div className="mt-3 pt-3 border-t border-border animate-in" onClick={(e) => e.stopPropagation()}>
            {isOccupied || isReserved ? (
              <div className="space-y-2.5">
                <ActionGroup label="Front desk">
                  <ActionBtn icon={LogIn} label="Check-in" href={isReserved && bookingNo ? `/checkin?book=${bookingNo}` : undefined} emphasized={isReserved} disabled={!isReserved} />
                  <ActionBtn icon={LogOut} label="Checkout" href={isOccupied && bookingNo ? `/checkout/${bookingNo}` : undefined} emphasized={isOccupied} disabled={!isOccupied} />
                  <ActionBtn icon={Receipt} label="Folio" href={bookingNo ? `/folio/${bookingNo}?from=rack` : undefined} />
                </ActionGroup>
                <ActionGroup label="Stay">
                  <ActionBtn icon={CalendarPlus} label="Extend" onClick={() => onAction("extend", room)} />
                  <ActionBtn icon={CalendarMinus} label="Reduce" onClick={() => onAction("reduce", room)} disabled={(room.nights ?? 1) <= 1} />
                  <ActionBtn icon={ArrowLeftRight} label="Change" onClick={() => onAction("change", room)} />
                </ActionGroup>
                <ActionGroup label="Money & service">
                  <ActionBtn icon={CreditCard} label="Payment" onClick={() => onAction("payment", room)} />
                  <ActionBtn icon={UtensilsCrossed} label="Order" onClick={() => onAction("order", room)} />
                  <ActionBtn icon={Sparkles} label="Clean" href="/housekeeping" />
                </ActionGroup>
              </div>
            ) : (
              <div className="space-y-2.5">
                <ActionGroup label="Front desk">
                  <ActionBtn icon={KeyRound} label="Book" href="/bookings/new" emphasized />
                  <ActionBtn icon={LogIn} label="Walk-in" href="/bookings/new" />
                </ActionGroup>
                <ActionGroup label="Operations">
                  <ActionBtn icon={Sparkles} label="Clean" href="/housekeeping" emphasized={room.status === "dirty"} />
                  <ActionBtn icon={Wrench} label="Maint." href="/maintenance" emphasized={room.status === "maintenance"} />
                  {room.status === "blocked"
                    ? <ActionBtn icon={LockOpen} label="Unblock" onClick={() => onAction("unblock", room)} emphasized />
                    : <ActionBtn icon={Lock} label="Block" onClick={() => onAction("block", room)} />}
                </ActionGroup>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

function ActionGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">{label}</p>
      <div className="grid grid-cols-3 gap-1.5">{children}</div>
    </div>
  );
}

function ActionBtn({ icon: Icon, label, href, onClick, emphasized, disabled }: { icon: typeof BedDouble; label: string; href?: string; onClick?: () => void; emphasized?: boolean; disabled?: boolean }) {
  const className = cn(
    "h-8 px-2 rounded-md text-[11px] font-medium border inline-flex items-center justify-center gap-1.5 transition-colors",
    disabled && "opacity-40 cursor-not-allowed pointer-events-none",
    !disabled && emphasized && "bg-brand text-brand-foreground border-brand hover:bg-brand/90",
    !disabled && !emphasized && "border-border text-muted-foreground hover:bg-surface-sunken hover:border-brand hover:text-foreground"
  );
  if (href && !disabled) {
    return (
      <Link href={href} className={className}>
        <Icon className="h-3 w-3" />
        {label}
      </Link>
    );
  }
  return (
    <button type="button" disabled={disabled} onClick={onClick} className={className}>
      <Icon className="h-3 w-3" />
      {label}
    </button>
  );
}

// ===================== ACTION DIALOG =====================
/** Shift an ISO date string by N days, returning a YYYY-MM-DD string. */
function shiftDate(iso: string | undefined, days: number): string {
  const base = iso ? new Date(iso) : new Date();
  base.setDate(base.getDate() + days);
  return base.toISOString().slice(0, 10);
}

function ActionDialog({ kind, room, allRooms, onClose, onDone, onError }: {
  kind: ActionKind; room: Room; allRooms: Room[];
  onClose: () => void; onDone: (msg: string) => void; onError: (msg: string) => void;
}) {
  // Lock body scroll + ESC handling
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  const titles: Record<ActionKind, string> = {
    extend: `Extend stay · Room ${room.number}`,
    reduce: `Reduce stay · Room ${room.number}`,
    change: `Change room · from ${room.number}`,
    payment: `Collect payment · Room ${room.number}`,
    block: `Block room ${room.number}`,
    unblock: `Release room ${room.number}`,
    order: `Order for Room ${room.number}`,
  };
  const icons: Record<ActionKind, typeof BedDouble> = {
    extend: CalendarPlus, reduce: CalendarMinus, change: ArrowLeftRight,
    payment: CreditCard, block: Lock, unblock: LockOpen,
    order: UtensilsCrossed,
  };
  const Icon = icons[kind];

  // Local state for each action's inputs
  const [extraNights, setExtraNights] = React.useState(1);
  const [reduceNights, setReduceNights] = React.useState(1);
  const [newRoom, setNewRoom] = React.useState(allRooms.find(r => r.status === "available" && r.number !== room.number)?.number ?? "");
  const [submitting, setSubmitting] = React.useState(false);
  const [payAmount, setPayAmount] = React.useState(0);
  const [payMode, setPayMode] = React.useState("UPI");
  const [blockReason, setBlockReason] = React.useState("Maintenance scheduled");

  // Change room — enhanced fields
  const CHANGE_REASONS = ["Guest preference", "Room issue", "Upgrade request", "Downgrade request", "Connecting room needed", "Floor / view preference", "Other"];
  const ROOM_ISSUES = ["AC not cooling", "Water heater issue", "Noise from corridor", "Bad odour", "View blocked", "Bed comfort", "Cleanliness concern", "Wi-Fi issue", "Plumbing", "TV / electronics"];
  const [changeReason, setChangeReason] = React.useState(CHANGE_REASONS[0]);
  const [roomIssues, setRoomIssues] = React.useState<Set<string>>(new Set());
  const [changeNotes, setChangeNotes] = React.useState("");
  const [notifyHK, setNotifyHK] = React.useState(true);
  const [notifyMaint, setNotifyMaint] = React.useState(true);

  // Order — tab + cart
  type OrderTab = "food" | "snacks" | "laundry" | "other";
  const [orderTab, setOrderTab] = React.useState<OrderTab>("food");
  const [orderCart, setOrderCart] = React.useState<Record<string, number>>({});
  const [orderNotes, setOrderNotes] = React.useState("");
  const setCart = (id: string, n: number) => setOrderCart(c => {
    const next = { ...c };
    if (n <= 0) delete next[id]; else next[id] = n;
    return next;
  });

  const ORDER_CATALOG: Record<OrderTab, { id: string; name: string; price: number; hint?: string }[]> = {
    food: [
      { id: "f1", name: "Continental Breakfast", price: 450, hint: "Eggs · juice · toast" },
      { id: "f2", name: "Eggs Benedict", price: 380 },
      { id: "f3", name: "Caesar Salad", price: 320 },
      { id: "f4", name: "Wagyu Burger", price: 850 },
      { id: "f5", name: "Grilled Salmon", price: 1200 },
      { id: "f6", name: "Margherita Pizza", price: 650 },
      { id: "f7", name: "Penne Arrabbiata", price: 480 },
      { id: "f8", name: "Tiramisu", price: 280 },
    ],
    snacks: [
      { id: "s1", name: "Bottled water (1L)", price: 100 },
      { id: "s2", name: "Coca-Cola 330ml", price: 150 },
      { id: "s3", name: "Lays / Chips pack", price: 120 },
      { id: "s4", name: "Snickers / Mars bar", price: 150 },
      { id: "s5", name: "Mixed nuts (200g)", price: 350 },
      { id: "s6", name: "Coffee pod (Nespresso)", price: 180 },
      { id: "s7", name: "Tea bags (assorted)", price: 80 },
      { id: "s8", name: "Beer · Kingfisher 330ml", price: 350 },
      { id: "s9", name: "Wine · House 187ml", price: 650 },
      { id: "s10", name: "Whiskey · Single peg 30ml", price: 450 },
    ],
    laundry: [
      { id: "l1", name: "Shirt · wash & press", price: 150 },
      { id: "l2", name: "Trousers / Jeans", price: 180 },
      { id: "l3", name: "Dress / Saree", price: 250 },
      { id: "l4", name: "Suit / Jacket (dry-clean)", price: 400 },
      { id: "l5", name: "Inner wear / Socks", price: 80 },
      { id: "l6", name: "Pyjamas / Nightwear", price: 150 },
      { id: "l7", name: "Bedsheet / Pillow cover", price: 200 },
      { id: "l8", name: "Express (same-day) — surcharge", price: 250, hint: "+ 50% on items" },
    ],
    other: [
      { id: "o1", name: "Wake-up call (set time below)", price: 0 },
      { id: "o2", name: "Newspaper delivery", price: 0, hint: "Free · daily" },
      { id: "o3", name: "Spa booking — 60 min", price: 3500 },
      { id: "o4", name: "Airport drop (sedan)", price: 1800 },
      { id: "o5", name: "Doctor on call", price: 2000 },
      { id: "o6", name: "Babysitting (per hour)", price: 800 },
      { id: "o7", name: "Iron + board to room", price: 0, hint: "Free" },
      { id: "o8", name: "Extra towels / amenities", price: 0, hint: "Free" },
    ],
  };

  const ALL_ITEMS = [...ORDER_CATALOG.food, ...ORDER_CATALOG.snacks, ...ORDER_CATALOG.laundry, ...ORDER_CATALOG.other];
  const orderSubtotal = Object.entries(orderCart).reduce((t, [id, qty]) => {
    const it = ALL_ITEMS.find(x => x.id === id);
    return t + (it?.price ?? 0) * qty;
  }, 0);
  const orderTax = Math.round(orderSubtotal * 0.05);
  const orderTotal = orderSubtotal + orderTax;
  const orderItemCount = Object.values(orderCart).reduce((t, n) => t + n, 0);

  // Reduce: a stay must keep at least 1 night, so cap how many can be removed.
  // reduceCut is the effective nights removed (0 for a 1-night stay → can't reduce);
  // reduceLess is the bill reduction; reduceRefundDue is the already-paid portion
  // owed back to the guest (when the reduction exceeds the outstanding balance).
  const maxReduce = Math.max(0, (room.nights ?? 1) - 1);
  const reduceCut = Math.min(Math.max(1, reduceNights), maxReduce);
  const reduceLess = room.rate * reduceCut;
  const reduceRefundDue = Math.max(0, reduceLess - (room.balance ?? 0));

  // Persist each action to the backend, then let the caller refresh the live board.
  // Stay/money actions need the room's real booking link (present on occupied rooms).
  const handle = async () => {
    if (submitting) return;
    setSubmitting(true);
    const today = new Date().toISOString().slice(0, 10);
    try {
      if (kind === "extend") {
        const extra = room.rate * extraNights;
        if (room.bookingId) {
          await apiPut(`/bookings/${room.bookingId}`, {
            checkOut: shiftDate(room.checkOut, extraNights),
            nights: (room.nights ?? 0) + extraNights,
            total: (room.total ?? 0) + extra,
            balance: (room.balance ?? 0) + extra,
          });
          await apiPost("/folio-charges", {
            bookingNo: room.bookingNo, date: today,
            description: `Room charge · extension ${extraNights} night${extraNights === 1 ? "" : "s"}`,
            type: "Room", qty: extraNights, rate: room.rate, tax: 0, amount: extra, paidBy: "Guest",
          });
        }
        onDone(`Room ${room.number} extended by ${extraNights} night${extraNights === 1 ? "" : "s"}`);
      } else if (kind === "reduce") {
        if (reduceCut > 0 && room.bookingId) {
          await apiPut(`/bookings/${room.bookingId}`, {
            checkOut: shiftDate(room.checkOut, -reduceCut),
            nights: Math.max(1, (room.nights ?? 1) - reduceCut),
            total: Math.max(0, (room.total ?? 0) - reduceLess),
            // Outstanding drops by the reversal; goes negative when the guest had
            // already paid for the removed nights (= a credit/refund owed).
            balance: (room.balance ?? 0) - reduceLess,
          });
          // Mirror the Extend flow: post a folio line so the folio reconciles
          // with the new total (a negative "reversal" instead of a charge).
          await apiPost("/folio-charges", {
            bookingNo: room.bookingNo, date: today,
            description: `Room charge reversal · reduced ${reduceCut} night${reduceCut === 1 ? "" : "s"}`,
            type: "Room", qty: -reduceCut, rate: room.rate, tax: 0, amount: -reduceLess, paidBy: "Guest",
          });
        }
        onDone(`Room ${room.number} stay reduced by ${reduceCut} night${reduceCut === 1 ? "" : "s"}${reduceRefundDue > 0 ? ` · refund due ${money(reduceRefundDue)}` : ""}`);
      } else if (kind === "change") {
        const issues = roomIssues.size > 0 ? ` (${[...roomIssues].slice(0, 2).join(", ")}${roomIssues.size > 2 ? `, +${roomIssues.size - 2}` : ""})` : "";
        if (room.bookingId) {
          await apiPut(`/bookings/${room.bookingId}`, { roomNumber: newRoom });
          await apiPut(`/rooms/${room.id}`, { hkStatus: "dirty" });
        }
        onDone(`Moved Room ${room.number} → ${newRoom} · ${changeReason}${issues}${notifyHK || notifyMaint ? " · HK/Maint notified" : ""}`);
      } else if (kind === "payment") {
        if (room.bookingNo) {
          await apiPost("/folio-payments", {
            bookingNo: room.bookingNo, date: today, mode: payMode, amount: payAmount, reference: "Front desk · Room Rack",
          });
        }
        onDone(`${money(payAmount)} collected via ${payMode} · Room ${room.number}`);
      } else if (kind === "block") {
        await apiPut(`/rooms/${room.id}`, { status: "blocked" });
        onDone(`Room ${room.number} blocked · ${blockReason}`);
      } else if (kind === "unblock") {
        await apiPut(`/rooms/${room.id}`, { status: "available", hkStatus: "clean" });
        onDone(`Room ${room.number} released back to sale`);
      } else if (kind === "order") {
        const dept = orderTab === "laundry" ? "laundry" : orderTab === "other" ? "concierge" : "kitchen";
        const chargeType = orderTab === "laundry" ? "Laundry" : orderTab === "other" ? "Service" : "F&B";
        if (room.bookingNo) {
          await apiPost("/folio-charges", {
            bookingNo: room.bookingNo, date: today,
            description: `${dept.charAt(0).toUpperCase() + dept.slice(1)} order · ${orderItemCount} item${orderItemCount === 1 ? "" : "s"}`,
            type: chargeType, qty: orderItemCount, rate: orderSubtotal, tax: orderTax, amount: orderTotal, paidBy: "Room",
          });
        }
        onDone(`Order sent to ${dept} · Room ${room.number} · ${orderItemCount} item${orderItemCount === 1 ? "" : "s"} · ${money(orderTotal)} added to folio`);
      }
    } catch {
      onError("⚠ Save failed — backend offline");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <Card className={cn(
          "pointer-events-auto w-full p-0 animate-in shadow-xl overflow-hidden",
          kind === "order" ? "max-w-3xl" : kind === "change" ? "max-w-lg" : "max-w-md"
        )}>
          <div className="px-5 py-4 bg-surface-elevated border-b border-border flex items-center gap-3">
            <span className="h-10 w-10 rounded-md bg-brand-soft text-brand-soft-foreground inline-flex items-center justify-center shrink-0">
              <Icon className="h-5 w-5" />
            </span>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">{titles[kind]}</h3>
              <p className="text-xs text-muted-foreground">{room.guestName ?? "Vacant"} · {room.type} · {money(room.rate)}/night</p>
            </div>
            <button type="button" onClick={onClose} className="h-8 w-8 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
          </div>

          <div className="px-5 py-4 space-y-4">
            {kind === "extend" && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Additional nights</Label>
                  <Input type="number" min={1} max={30} value={extraNights} onChange={e => setExtraNights(Math.max(1, Number(e.target.value)))} className="h-10 tabular text-base" />
                </div>
                <div className="rounded-md bg-surface-sunken p-3 text-xs space-y-1">
                  <div className="flex justify-between"><span className="text-muted-foreground">Extra charge</span><span className="font-medium tabular">{money(room.rate * extraNights)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">New checkout</span><span className="font-medium">Auto-calculated</span></div>
                </div>
              </>
            )}
            {kind === "reduce" && (
              maxReduce < 1 ? (
                <div className="rounded-md bg-warning-soft border border-warning/30 p-3 text-xs">
                  <p className="font-semibold text-warning inline-flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Single-night stay</p>
                  <p className="text-muted-foreground mt-0.5">A 1-night stay can&apos;t be reduced — use Checkout instead.</p>
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Reduce by nights</Label>
                    <Input type="number" min={1} max={maxReduce} value={reduceNights} onChange={e => setReduceNights(Math.min(maxReduce, Math.max(1, Number(e.target.value))))} className="h-10 tabular text-base" />
                    <p className="text-[11px] text-muted-foreground">Max {maxReduce} night{maxReduce === 1 ? "" : "s"} — at least 1 night must remain.</p>
                  </div>
                  <div className="rounded-md bg-warning-soft border border-warning/30 p-3 text-xs space-y-1">
                    <p className="font-semibold text-warning inline-flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Early checkout</p>
                    <p className="text-muted-foreground">Cancellation policy may apply.</p>
                    <div className="flex justify-between"><span className="text-muted-foreground">Bill reduction</span><span className="font-medium tabular">{money(reduceLess)}</span></div>
                    {reduceRefundDue > 0 && (
                      <div className="flex justify-between"><span className="text-muted-foreground">Refund due (already paid)</span><span className="font-medium tabular text-warning">{money(reduceRefundDue)}</span></div>
                    )}
                  </div>
                </>
              )
            )}
            {kind === "change" && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Move guest to room</Label>
                  <Select value={newRoom} onChange={e => setNewRoom(e.target.value)} className="h-10">
                    {allRooms.filter(r => r.status === "available" && r.number !== room.number).map(r => (
                      <option key={r.id} value={r.number}>Room {r.number} · {r.type} · Floor {r.floor} · {money(r.rate)}/n</option>
                    ))}
                  </Select>
                  {(() => {
                    const target = allRooms.find(r => r.number === newRoom);
                    if (!target) return null;
                    const diff = target.rate - room.rate;
                    if (Math.abs(diff) < 1) return null;
                    return (
                      <p className={cn("text-[11px] inline-flex items-center gap-1.5 mt-1.5", diff > 0 ? "text-warning" : "text-success")}>
                        <CreditCard className="h-3 w-3" />
                        {diff > 0 ? `Rate uplift: +${money(diff)}/night` : `Rate reduction: ${money(diff)}/night (apply credit)`}
                      </p>
                    );
                  })()}
                </div>

                {/* Reason picker */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Reason for change</Label>
                  <Select value={changeReason} onChange={e => setChangeReason(e.target.value)} className="h-10">
                    {CHANGE_REASONS.map(r => <option key={r}>{r}</option>)}
                  </Select>
                </div>

                {/* Sub-issues when room issue is selected */}
                {changeReason === "Room issue" && (
                  <div className="space-y-1.5 animate-in">
                    <Label className="text-xs inline-flex items-center gap-1.5">
                      <AlertTriangle className="h-3 w-3 text-warning" />Which issues? (tap all that apply)
                    </Label>
                    <div className="flex flex-wrap gap-1.5">
                      {ROOM_ISSUES.map(iss => {
                        const on = roomIssues.has(iss);
                        return (
                          <button
                            key={iss}
                            type="button"
                            onClick={() => setRoomIssues(s => {
                              const next = new Set(s);
                              if (next.has(iss)) next.delete(iss); else next.add(iss);
                              return next;
                            })}
                            className={cn(
                              "h-7 px-2.5 rounded-full text-[11px] font-medium border transition-colors",
                              on ? "bg-warning text-white border-warning" : "border-border hover:bg-surface-sunken text-muted-foreground"
                            )}
                          >
                            {on && <CheckCircle2 className="h-3 w-3 inline mr-1" />}{iss}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Optional comments */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Comments / instructions (optional)</Label>
                  <textarea
                    value={changeNotes}
                    onChange={e => setChangeNotes(e.target.value)}
                    rows={2}
                    placeholder="e.g. Guest prefers higher floor with sea view · Move ASAP after housekeeping cleans target room"
                    className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm placeholder:text-subtle-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 outline-hidden resize-y min-h-[56px]"
                  />
                </div>

                {/* Notify chips */}
                <div className="space-y-1.5">
                  <Label className="text-[11px]">Auto-notify</Label>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setNotifyHK(!notifyHK)}
                      className={cn(
                        "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border text-xs font-medium transition-colors",
                        notifyHK ? "bg-brand-soft border-brand text-brand-soft-foreground" : "border-border text-muted-foreground hover:bg-surface-sunken"
                      )}
                    >
                      <Sparkles className="h-3 w-3" />Housekeeping{notifyHK && <CheckCircle2 className="h-3 w-3" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setNotifyMaint(!notifyMaint)}
                      className={cn(
                        "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border text-xs font-medium transition-colors",
                        notifyMaint ? "bg-brand-soft border-brand text-brand-soft-foreground" : "border-border text-muted-foreground hover:bg-surface-sunken"
                      )}
                    >
                      <Wrench className="h-3 w-3" />Maintenance{notifyMaint && <CheckCircle2 className="h-3 w-3" />}
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-muted-foreground pt-2 border-t border-border">
                  On confirm: target room marked Occupied · old room → Dirty + HK task · key card re-encoded · folio rate adjusted.
                </p>
              </>
            )}

            {kind === "order" && (
              <div className="space-y-3">
                {/* Tabs */}
                <div className="grid grid-cols-4 gap-1.5">
                  {([
                    { id: "food", label: "Food & Drinks", icon: UtensilsCrossed },
                    { id: "snacks", label: "Snacks / Minibar", icon: Wine },
                    { id: "laundry", label: "Laundry", icon: Shirt },
                    { id: "other", label: "Other services", icon: BellRing },
                  ] as { id: OrderTab; label: string; icon: typeof BedDouble }[]).map(t => {
                    const TabIcon = t.icon;
                    const on = orderTab === t.id;
                    const count = ORDER_CATALOG[t.id].reduce((c, it) => c + (orderCart[it.id] ?? 0), 0);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setOrderTab(t.id)}
                        className={cn(
                          "h-14 rounded-md border flex flex-col items-center justify-center gap-1 transition-colors relative",
                          on ? "bg-brand text-brand-foreground border-brand" : "border-border hover:bg-surface-sunken text-muted-foreground"
                        )}
                      >
                        <TabIcon className="h-4 w-4" />
                        <span className="text-[10px] font-medium leading-none">{t.label}</span>
                        {count > 0 && (
                          <span className={cn(
                            "absolute -top-1.5 -right-1.5 h-4 min-w-[16px] px-1 rounded-full text-[9px] font-bold inline-flex items-center justify-center tabular ring-2 ring-surface",
                            on ? "bg-brand-foreground text-brand" : "bg-brand text-brand-foreground"
                          )}>
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Item list — current tab */}
                <div className="max-h-[300px] overflow-y-auto pr-1 space-y-1">
                  {ORDER_CATALOG[orderTab].map(it => {
                    const qty = orderCart[it.id] ?? 0;
                    return (
                      <div key={it.id} className={cn(
                        "rounded-md border p-2.5 flex items-center gap-2 transition-colors",
                        qty > 0 ? "bg-brand-soft/40 border-brand" : "border-border"
                      )}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-tight truncate">{it.name}</p>
                          <p className="text-[11px] text-muted-foreground tabular">
                            {it.price === 0 ? "Complimentary" : money(it.price)}
                            {it.hint && <> · <span className="italic">{it.hint}</span></>}
                          </p>
                        </div>
                        <div className="flex items-center border border-border rounded-md h-8 bg-surface shrink-0">
                          <button type="button" onClick={() => setCart(it.id, qty - 1)} disabled={qty === 0} className="w-7 h-7 inline-flex items-center justify-center hover:bg-surface-sunken disabled:opacity-40">−</button>
                          <span className="w-7 text-center text-sm tabular font-medium">{qty}</span>
                          <button type="button" onClick={() => setCart(it.id, qty + 1)} className="w-7 h-7 inline-flex items-center justify-center hover:bg-surface-sunken">+</button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Special instructions (optional)</Label>
                  <textarea
                    value={orderNotes}
                    onChange={e => setOrderNotes(e.target.value)}
                    rows={2}
                    placeholder="e.g. No onion / garlic · Extra hot · Send express (laundry) · Wake-up at 06:30"
                    className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm placeholder:text-subtle-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 outline-hidden resize-y min-h-[56px]"
                  />
                </div>

                {/* Live cart */}
                {orderItemCount > 0 && (
                  <div className="rounded-md bg-surface-sunken/40 border border-border p-3 space-y-1 text-sm">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{orderItemCount} item{orderItemCount === 1 ? "" : "s"}</span>
                      <span className="tabular">{money(orderSubtotal)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Tax (5%)</span>
                      <span className="tabular">{money(orderTax)}</span>
                    </div>
                    <div className="flex justify-between pt-1.5 border-t border-border">
                      <span className="font-semibold">Add to folio</span>
                      <span className="font-semibold text-base tabular">{money(orderTotal)}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground pt-1 italic">
                      Will be routed to <span className="font-medium text-foreground">{orderTab === "laundry" ? "Laundry · pickup in 30 min" : orderTab === "other" ? "Concierge desk" : "Kitchen · KOT printed"}</span>
                    </p>
                  </div>
                )}
              </div>
            )}
            {kind === "payment" && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Amount</Label>
                  <Input type="number" min={0} value={payAmount} onChange={e => setPayAmount(Number(e.target.value))} placeholder="0" className="h-10 tabular text-base" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Payment mode</Label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {["UPI", "Cash", "Card", "Net Banking"].map(m => (
                      <button key={m} type="button" onClick={() => setPayMode(m)} className={cn(
                        "h-9 rounded-md border text-xs font-medium transition-colors",
                        payMode === m ? "bg-brand text-brand-foreground border-brand" : "border-border hover:bg-surface-sunken"
                      )}>{m}</button>
                    ))}
                  </div>
                </div>
              </>
            )}
            {kind === "block" && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Reason for blocking</Label>
                  <Select value={blockReason} onChange={e => setBlockReason(e.target.value)} className="h-10">
                    <option>Maintenance scheduled</option>
                    <option>Deep cleaning</option>
                    <option>Renovation</option>
                    <option>VIP hold</option>
                    <option>Owner use</option>
                  </Select>
                </div>
                <p className="text-[11px] text-muted-foreground">Blocked rooms are removed from sale until released.</p>
              </>
            )}
            {kind === "unblock" && (
              <div className="space-y-2">
                <p className="text-sm">Release <span className="font-semibold">Room {room.number}</span> back to available inventory?</p>
                <p className="text-[11px] text-muted-foreground">It becomes sellable again immediately and is marked clean.</p>
              </div>
            )}
          </div>

          <div className="px-5 py-3 border-t border-border bg-surface-elevated flex items-center justify-between gap-2">
            <p className="text-[11px] text-muted-foreground">
              {kind === "order" && orderItemCount > 0 && `${orderItemCount} item${orderItemCount === 1 ? "" : "s"} · ${money(orderTotal)} to folio`}
              {kind === "change" && changeReason === "Room issue" && roomIssues.size > 0 && `${roomIssues.size} issue${roomIssues.size === 1 ? "" : "s"} logged`}
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={onClose} disabled={submitting}>Cancel</Button>
              <Button onClick={handle} variant={kind === "block" ? "danger" : "success"} disabled={submitting || (kind === "order" && orderItemCount === 0) || (kind === "reduce" && reduceCut < 1)}>
                <CheckCircle2 className="h-4 w-4" />
                {submitting ? "Saving…" : kind === "order" ? (orderTab === "laundry" ? "Send to laundry" : orderTab === "other" ? "Send to concierge" : "Send to kitchen") : kind === "unblock" ? "Release room" : "Confirm"}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
