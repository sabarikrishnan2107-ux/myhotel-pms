"use client";
import * as React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Plus, Search, MousePointerClick, Eye, Edit, X, AlertTriangle, CheckCircle2,
  CalendarRange, IndianRupee, Users, Crown, LogIn, Printer, MoreHorizontal, Ban,
  Calendar, BedDouble, Filter, Phone, MessageCircle, Mail,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge, PaymentBadge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { KPICard } from "@/components/ui/kpi-card";
import { RESERVATIONS, GUESTS, ROOMS } from "@/lib/mock-data";
import { money, formatDate, cn } from "@/lib/utils";
import { apiGet, apiPut, sendEmail } from "@/lib/api";
import { GuestDetailDrawer } from "@/components/guests/guest-detail-drawer";
import type { Reservation, PaymentStatus, BookingSource, Guest, Room } from "@/lib/types";

type BookingState = "confirmed" | "checked-in" | "checked-out" | "cancelled" | "no-show" | "incomplete";

// Derive a booking lifecycle state from the reservation date + status (mocked)
function deriveState(r: Reservation, cancelledIds: Set<string>, today: string): BookingState {
  // Prefer the backend lifecycle status; fall back to date-derivation against today.
  const status = (r as { status?: string }).status;
  if (cancelledIds.has(r.id) || status === "cancelled") return "cancelled";
  // Synced to the tablet for ID/photo capture but the desk check-in was never
  // submitted. Flag it explicitly so it isn't date-derived into "Checked-in".
  if (status === "pending") return "incomplete";
  if (status === "checked-in") return "checked-in";
  if (status === "checked-out") return "checked-out";
  if (status === "no-show") return "no-show";
  if (!today) return "confirmed";
  if (r.checkOut <= today) return "checked-out";      // departed
  if (r.checkIn <= today && r.checkOut > today) return "checked-in"; // in-house
  return "confirmed";
}

const STATE_TONE: Record<BookingState, "neutral" | "brand" | "info" | "success" | "warning" | "danger"> = {
  "confirmed": "info",
  "checked-in": "brand",
  "checked-out": "success",
  "cancelled": "danger",
  "no-show": "warning",
  "incomplete": "warning",
};
const STATE_LABEL: Record<BookingState, string> = {
  "confirmed": "Confirmed",
  "checked-in": "Checked-in",
  "checked-out": "Checked-out",
  "cancelled": "Cancelled",
  "no-show": "No-show",
  "incomplete": "Incomplete",
};

type ModifyDraft = Pick<Reservation, "checkIn" | "checkOut" | "roomNumber" | "roomType" | "adults" | "children" | "nights">;

export default function BookingsPage() {
  const [selected, setSelected] = React.useState<Reservation | null>(null);
  const [search, setSearch] = React.useState("");
  const [sourceFilter, setSourceFilter] = React.useState<"all" | BookingSource>("all");
  const [stateFilter, setStateFilter] = React.useState<"all" | BookingState>("all");
  const [paymentFilter, setPaymentFilter] = React.useState<"all" | PaymentStatus>("all");
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [actionMenuFor, setActionMenuFor] = React.useState<string | null>(null);
  // Fixed-position coordinates for the row action menu (rendered in a portal so
  // it escapes the table's overflow clipping).
  const [menuPos, setMenuPos] = React.useState<{ top: number; left: number } | null>(null);
  const openActionMenu = (e: React.MouseEvent<HTMLButtonElement>, id: string) => {
    e.stopPropagation();
    if (actionMenuFor === id) { setActionMenuFor(null); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    const MENU_W = 224, EST_H = 296;
    const top = rect.bottom + EST_H > window.innerHeight ? Math.max(8, rect.top - EST_H) : rect.bottom + 4;
    const left = Math.max(8, rect.right - MENU_W);
    setMenuPos({ top, left });
    setActionMenuFor(id);
  };

  // Real "today" (client-only, avoids hydration mismatch) for lifecycle derivation.
  const [today, setToday] = React.useState("");
  React.useEffect(() => { setToday(new Date().toLocaleDateString("en-CA")); }, []);

  // Local state — booking modifications & cancellations (no backend yet)
  const [cancelledIds, setCancelledIds] = React.useState<Set<string>>(new Set());
  const [modifiedIds, setModifiedIds] = React.useState<Set<string>>(new Set());
  const [overrides, setOverrides] = React.useState<Record<string, Partial<Reservation>>>({});

  // Pending dialogs
  const [modifyTarget, setModifyTarget] = React.useState<Reservation | null>(null);
  const [cancelTarget, setCancelTarget] = React.useState<Reservation | null>(null);
  const [toast, setToast] = React.useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2800); };

  // Reservations, guests and rooms from Postgres (fall back to seeds if the API is down).
  const [bookings, setBookings] = React.useState<Reservation[]>(RESERVATIONS);
  const [guests, setGuests] = React.useState<Guest[]>(GUESTS);
  const [rooms, setRooms] = React.useState<Room[]>(ROOMS);
  React.useEffect(() => {
    let cancelled = false;
    apiGet<Reservation[]>("/bookings")
      .then(rows => { if (!cancelled) setBookings(rows); })
      .catch(() => { if (!cancelled) showToast("⚠ Backend offline — showing local data"); });
    apiGet<Guest[]>("/guests")
      .then(rows => { if (!cancelled && rows.length) setGuests(rows); })
      .catch(() => {});
    apiGet<Room[]>("/room-board")
      .then(rows => { if (!cancelled && rows.length) setRooms(rows); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Combine live bookings with local overrides for rendering
  const effective = React.useMemo(() => {
    return bookings.map(r => ({ ...r, ...(overrides[r.id] ?? {}) }));
  }, [bookings, overrides]);

  const guest = React.useMemo(() => {
    if (!selected) return null;
    return (
      guests.find(g => g.name === selected.guestName) ??
      {
        id: `g-${selected.id}`,
        name: selected.guestName,
        phone: "—",
        email: "—",
        nationality: "—",
        idType: "Passport",
        idNumber: "—",
        vip: selected.vip,
        blacklist: false,
        lifetimeNights: selected.nights,
        lifetimeSpend: selected.total,
        lastStay: selected.checkIn,
      }
    );
  }, [selected, guests]);

  const filtered = React.useMemo(() => {
    return effective.filter(r => {
      if (search && !`${r.bookingNo} ${r.guestName} ${r.roomNumber}`.toLowerCase().includes(search.toLowerCase())) return false;
      if (sourceFilter !== "all" && r.source !== sourceFilter) return false;
      if (paymentFilter !== "all" && r.paymentStatus !== paymentFilter) return false;
      const state = deriveState(r, cancelledIds, today);
      if (stateFilter !== "all" && state !== stateFilter) return false;
      return true;
    });
  }, [effective, search, sourceFilter, paymentFilter, stateFilter, cancelledIds, today]);

  const allStates = effective.map(r => deriveState(r, cancelledIds, today));
  const kpis = {
    total: effective.length,
    confirmed: allStates.filter(s => s === "confirmed").length,
    inHouse: allStates.filter(s => s === "checked-in").length,
    cancelled: allStates.filter(s => s === "cancelled").length,
    revenue: effective.filter(r => !cancelledIds.has(r.id)).reduce((t, r) => t + r.total, 0),
  };

  const sources = Array.from(new Set(bookings.map(r => r.source)));
  const activeFilters = (sourceFilter !== "all" ? 1 : 0) + (stateFilter !== "all" ? 1 : 0) + (paymentFilter !== "all" ? 1 : 0);
  const clearFilters = () => { setSourceFilter("all"); setStateFilter("all"); setPaymentFilter("all"); };

  // Action handlers
  const handleModify = (r: Reservation, patch: Partial<Reservation>) => {
    setOverrides(o => ({ ...o, [r.id]: { ...(o[r.id] ?? {}), ...patch } }));
    setModifiedIds(m => new Set([...m, r.id]));
    setModifyTarget(null);
    showToast(`Booking ${r.bookingNo} updated`);
    apiPut(`/bookings/${r.id}`, patch).catch(() => showToast("⚠ Save failed — backend offline"));
  };
  const handleCancel = (r: Reservation, _reason: string, _refund: number) => {
    setCancelledIds(c => new Set([...c, r.id]));
    setCancelTarget(null);
    showToast(`Booking ${r.bookingNo} cancelled · ${money(_refund)} refund processed`);
    apiPut(`/bookings/${r.id}`, { status: "cancelled" }).catch(() => showToast("⚠ Save failed — backend offline"));
  };
  const handlePrintConfirmation = (r: Reservation) => {
    showToast(`Confirmation for ${r.bookingNo} sent to printer`);
    setActionMenuFor(null);
  };

  // Close the menu on outside click, scroll, or resize (its coords are fixed at open time).
  React.useEffect(() => {
    if (!actionMenuFor) return;
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest("[data-action-menu]")) setActionMenuFor(null);
    };
    const close = () => setActionMenuFor(null);
    document.addEventListener("click", onClick);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [actionMenuFor]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-medium tracking-tight">Bookings</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {filtered.length} of {bookings.length} reservations · all sources, all statuses
          </p>
          <p className="text-[11px] text-subtle-foreground mt-1 inline-flex items-center gap-1">
            <MousePointerClick className="h-3 w-3" />
            <span>Double-click any row for the full guest profile</span>
          </p>
        </div>
        <Link href="/bookings/new"><Button><Plus className="h-4 w-4" />New Booking</Button></Link>
      </div>

      {/* KPI bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KPICard label="Total" value={kpis.total} icon={CalendarRange} accent="brand" />
        <KPICard label="Confirmed" value={kpis.confirmed} icon={CheckCircle2} accent="info" />
        <KPICard label="In-house" value={kpis.inHouse} icon={Users} accent="success" />
        <KPICard label="Cancelled" value={kpis.cancelled} icon={Ban} accent="danger" />
        <KPICard label="Revenue" value={money(kpis.revenue)} icon={IndianRupee} accent="accent" />
      </div>

      {/* Filter bar */}
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by booking #, guest name, room number"
              className="pl-9 h-9"
            />
          </div>
          <Select value={stateFilter} onChange={e => setStateFilter(e.target.value as "all" | BookingState)} className="h-9 w-auto">
            <option value="all">Any status</option>
            <option value="confirmed">Confirmed</option>
            <option value="incomplete">Incomplete</option>
            <option value="checked-in">Checked-in</option>
            <option value="checked-out">Checked-out</option>
            <option value="cancelled">Cancelled</option>
            <option value="no-show">No-show</option>
          </Select>
          <Select value={sourceFilter} onChange={e => setSourceFilter(e.target.value as "all" | BookingSource)} className="h-9 w-auto">
            <option value="all">All sources</option>
            {sources.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Button variant={filtersOpen ? "primary" : "outline"} size="sm" onClick={() => setFiltersOpen(o => !o)}>
            <Filter className="h-3.5 w-3.5" />
            {filtersOpen ? "Hide" : "More"}
            {activeFilters > 0 && (
              <span className={cn(
                "ml-0.5 h-4 px-1.5 rounded-full text-[10px] font-semibold inline-flex items-center tabular",
                filtersOpen ? "bg-brand-foreground/20" : "bg-brand text-brand-foreground"
              )}>
                {activeFilters}
              </span>
            )}
          </Button>
          {activeFilters > 0 && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>Clear</Button>
          )}
        </div>

        {filtersOpen && (
          <div className="mt-3 pt-3 border-t border-border grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in">
            <div className="space-y-1">
              <Label className="text-[11px]">Payment status</Label>
              <Select value={paymentFilter} onChange={e => setPaymentFilter(e.target.value as "all" | PaymentStatus)} className="h-8">
                <option value="all">Any payment</option>
                <option value="paid">Paid</option>
                <option value="partial">Partial</option>
                <option value="unpaid">Unpaid</option>
                <option value="refunded">Refunded</option>
              </Select>
            </div>
          </div>
        )}
      </Card>

      {/* Bookings table */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-elevated border-b border-border">
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-semibold">Booking</th>
                <th className="px-4 py-3 font-semibold">Guest</th>
                <th className="px-4 py-3 font-semibold">Room</th>
                <th className="px-4 py-3 font-semibold">Source</th>
                <th className="px-4 py-3 font-semibold">Dates</th>
                <th className="px-4 py-3 font-semibold text-right">Nights</th>
                <th className="px-4 py-3 font-semibold text-right">Total</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Payment</th>
                <th className="px-4 py-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(r => {
                const state = deriveState(r, cancelledIds, today);
                const isCancelled = state === "cancelled";
                const isOpen = actionMenuFor === r.id;
                const isModified = modifiedIds.has(r.id);
                return (
                  <tr
                    key={r.id}
                    onDoubleClick={() => setSelected(r)}
                    title="Double-click to view full guest details"
                    className={cn(
                      "hover:bg-surface-sunken/50 transition-colors cursor-pointer select-none",
                      isCancelled && "opacity-60"
                    )}
                  >
                    <td className="px-4 py-3 font-medium tabular">
                      <div className="inline-flex items-center gap-1.5">
                        <span className={cn(isCancelled && "line-through")}>{r.bookingNo}</span>
                        {isModified && <Badge tone="info">edited</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={r.guestName} size={32} vip={r.vip} />
                        <div>
                          <div className="flex items-center gap-1">
                            <p className="font-medium">{r.guestName}</p>
                            {r.vip && <Crown className="h-3 w-3 text-brand" />}
                          </div>
                          <p className="text-xs text-muted-foreground">{r.adults}A{r.children ? ` +${r.children}C` : ""}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium tabular">{r.roomNumber}</p>
                      <p className="text-xs text-muted-foreground">{r.roomType}</p>
                    </td>
                    <td className="px-4 py-3"><Badge tone="neutral">{r.source}</Badge></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground tabular whitespace-nowrap">
                      {formatDate(r.checkIn)} → {formatDate(r.checkOut)}
                    </td>
                    <td className="px-4 py-3 text-right tabular">{r.nights}</td>
                    <td className="px-4 py-3 text-right tabular font-medium">{money(r.total)}</td>
                    <td className="px-4 py-3"><Badge tone={STATE_TONE[state]}>{STATE_LABEL[state]}</Badge></td>
                    <td className="px-4 py-3"><PaymentBadge status={r.paymentStatus} /></td>
                    <td className="px-4 py-3 text-right" data-action-menu>
                      <div className="inline-flex gap-1 items-center">
                        {state === "incomplete" && (
                          <Link
                            href={r.bookingNo?.startsWith("WK") ? `/checkin?resume=${r.bookingNo}` : `/bookings/new?resume=${r.bookingNo}`}
                            onClick={e => e.stopPropagation()}
                            className="h-8 px-2.5 rounded-md bg-success text-white hover:opacity-90 inline-flex items-center justify-center gap-1 text-xs font-medium transition-opacity"
                            title="Resume this draft — reopens the form pre-filled"
                          >
                            <LogIn className="h-3.5 w-3.5" />Complete
                          </Link>
                        )}
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); setSelected(r); }}
                          className="h-8 w-8 rounded-md border border-border hover:bg-brand hover:text-brand-foreground hover:border-brand inline-flex items-center justify-center text-muted-foreground transition-colors"
                          title="View guest details"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={isCancelled}
                          onClick={e => { e.stopPropagation(); setModifyTarget(r); }}
                          className="h-8 w-8 rounded-md border border-border hover:bg-brand hover:text-brand-foreground hover:border-brand inline-flex items-center justify-center text-muted-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Modify booking"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={isCancelled || state === "checked-out"}
                          onClick={e => { e.stopPropagation(); setCancelTarget(r); }}
                          className="h-8 w-8 rounded-md border border-border hover:bg-danger hover:text-white hover:border-danger inline-flex items-center justify-center text-muted-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Cancel booking"
                        >
                          <Ban className="h-3.5 w-3.5" />
                        </button>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={e => openActionMenu(e, r.id)}
                            className={cn(
                              "h-8 w-8 rounded-md border inline-flex items-center justify-center transition-colors",
                              isOpen ? "bg-brand-soft border-brand text-brand-soft-foreground" : "border-border hover:bg-surface-sunken text-muted-foreground"
                            )}
                            title="More actions"
                          >
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </button>
                          {isOpen && menuPos && typeof document !== "undefined" && createPortal(
                            <div
                              data-action-menu
                              style={{ position: "fixed", top: menuPos.top, left: menuPos.left }}
                              className="z-50 w-56 rounded-md border border-border bg-surface shadow-lg py-1 animate-in slide-in-from-top-1"
                            >
                              {state === "confirmed" && (
                                <Link href={`/checkin?book=${r.bookingNo}`} onClick={() => setActionMenuFor(null)} className="w-full px-3 py-2 text-sm hover:bg-surface-sunken inline-flex items-center gap-2.5">
                                  <LogIn className="h-3.5 w-3.5 text-info" />Check guest in
                                </Link>
                              )}
                              {state === "incomplete" && (
                                <Link href={r.bookingNo?.startsWith("WK") ? `/checkin?resume=${r.bookingNo}` : `/bookings/new?resume=${r.bookingNo}`} onClick={() => setActionMenuFor(null)} className="w-full px-3 py-2 text-sm hover:bg-surface-sunken inline-flex items-center gap-2.5">
                                  <LogIn className="h-3.5 w-3.5 text-success" />Complete booking
                                </Link>
                              )}
                              <Link href={`/folio/${r.bookingNo}`} onClick={() => setActionMenuFor(null)} className="w-full px-3 py-2 text-sm hover:bg-surface-sunken inline-flex items-center gap-2.5">
                                <CalendarRange className="h-3.5 w-3.5 text-muted-foreground" />Open folio
                              </Link>
                              <button type="button" onClick={() => handlePrintConfirmation(r)} className="w-full px-3 py-2 text-sm hover:bg-surface-sunken inline-flex items-center gap-2.5 text-left">
                                <Printer className="h-3.5 w-3.5 text-muted-foreground" />Print confirmation
                              </button>
                              <button type="button" onClick={() => { showToast(`WhatsApp confirmation sent to ${r.guestName}`); setActionMenuFor(null); }} className="w-full px-3 py-2 text-sm hover:bg-surface-sunken inline-flex items-center gap-2.5 text-left">
                                <MessageCircle className="h-3.5 w-3.5 text-success" />Resend WhatsApp
                              </button>
                              <button type="button" onClick={() => {
                                setActionMenuFor(null);
                                const to = guests.find(g => g.name === r.guestName)?.email;
                                if (!to || to === "—") { showToast(`No email on file for ${r.guestName}`); return; }
                                showToast(`Emailing ${r.guestName}…`);
                                sendEmail({
                                  to,
                                  subject: `Booking Confirmation · ${r.bookingNo}`,
                                  heading: "Booking Confirmation",
                                  greeting: r.guestName,
                                  intro: "Here are your booking details. Please contact us if anything needs to change.",
                                  rows: [
                                    { label: "Booking No", value: r.bookingNo },
                                    { label: "Room", value: `${r.roomNumber ?? "—"} · ${r.roomType ?? ""}` },
                                    { label: "Check-in", value: String(r.checkIn ?? "") },
                                    { label: "Check-out", value: String(r.checkOut ?? "") },
                                    { label: "Total", value: money(r.total) },
                                  ],
                                  context: "Booking confirmation",
                                }).then(() => showToast(`Email confirmation sent to ${r.guestName}`))
                                  .catch(() => showToast(`Couldn't email ${r.guestName}`));
                              }} className="w-full px-3 py-2 text-sm hover:bg-surface-sunken inline-flex items-center gap-2.5 text-left">
                                <Mail className="h-3.5 w-3.5 text-brand" />Resend Email
                              </button>
                              <div className="my-1 h-px bg-border" />
                              <button type="button" onClick={() => { setModifyTarget(r); setActionMenuFor(null); }} disabled={isCancelled} className="w-full px-3 py-2 text-sm hover:bg-surface-sunken inline-flex items-center gap-2.5 text-left disabled:opacity-40 disabled:cursor-not-allowed">
                                <Edit className="h-3.5 w-3.5 text-muted-foreground" />Modify booking
                              </button>
                              <button type="button" onClick={() => { setCancelTarget(r); setActionMenuFor(null); }} disabled={isCancelled || state === "checked-out"} className="w-full px-3 py-2 text-sm hover:bg-danger-soft text-danger inline-flex items-center gap-2.5 text-left disabled:opacity-40 disabled:cursor-not-allowed">
                                <Ban className="h-3.5 w-3.5" />Cancel booking
                              </button>
                            </div>,
                            document.body
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={10} className="px-4 py-12 text-center text-sm text-muted-foreground">No bookings match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Drawer */}
      <GuestDetailDrawer
        open={selected !== null}
        onClose={() => setSelected(null)}
        guest={guest}
        reservation={selected}
      />

      {/* Modify dialog */}
      {modifyTarget && (
        <ModifyBookingDialog
          reservation={modifyTarget}
          rooms={rooms}
          onClose={() => setModifyTarget(null)}
          onSave={(patch) => handleModify(modifyTarget, patch)}
        />
      )}

      {/* Cancel dialog */}
      {cancelTarget && (
        <CancelBookingDialog
          reservation={cancelTarget}
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

// ===================== MODIFY DIALOG =====================
function ModifyBookingDialog({ reservation, rooms, onClose, onSave }: {
  reservation: Reservation;
  rooms: Room[];
  onClose: () => void;
  onSave: (patch: Partial<Reservation>) => void;
}) {
  const [draft, setDraft] = React.useState<ModifyDraft>({
    checkIn: reservation.checkIn,
    checkOut: reservation.checkOut,
    roomNumber: reservation.roomNumber,
    roomType: reservation.roomType,
    adults: reservation.adults,
    children: reservation.children,
    nights: reservation.nights,
  });

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  // Recompute nights when dates change
  React.useEffect(() => {
    const ms = new Date(draft.checkOut).getTime() - new Date(draft.checkIn).getTime();
    const nights = Math.max(1, Math.round(ms / (24 * 60 * 60 * 1000)));
    if (nights !== draft.nights) setDraft(d => ({ ...d, nights }));
  }, [draft.checkIn, draft.checkOut]);

  // ISO-date strings for input[type=date]
  const ciISO = new Date(draft.checkIn).toISOString().slice(0, 10);
  const coISO = new Date(draft.checkOut).toISOString().slice(0, 10);
  const todayISO = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in local TZ — blocks past dates
  const set = <K extends keyof ModifyDraft>(k: K, v: ModifyDraft[K]) => setDraft(d => ({ ...d, [k]: v }));

  // Available rooms — same type or upgrade options
  const availableRooms = rooms.filter(r => r.status === "available" || r.number === reservation.roomNumber);

  const totalDiff = draft.nights * (rooms.find(r => r.number === draft.roomNumber)?.rate ?? 0) - reservation.total;

  const valid = draft.nights >= 1 && new Date(draft.checkOut) > new Date(draft.checkIn) && draft.adults >= 1;

  const save = () => {
    onSave({
      checkIn: new Date(draft.checkIn + "T12:00:00").toISOString(),
      checkOut: new Date(draft.checkOut + "T11:00:00").toISOString(),
      roomNumber: draft.roomNumber,
      roomType: draft.roomType,
      adults: draft.adults,
      children: draft.children,
      nights: draft.nights,
      total: reservation.total + totalDiff,
    });
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <Card className="pointer-events-auto w-full max-w-xl p-0 animate-in shadow-xl overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 bg-surface-elevated border-b border-border flex items-center gap-3">
            <span className="h-10 w-10 rounded-md bg-brand-soft text-brand-soft-foreground inline-flex items-center justify-center shrink-0">
              <Edit className="h-5 w-5" />
            </span>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">Modify booking · {reservation.bookingNo}</h3>
              <p className="text-xs text-muted-foreground truncate">{reservation.guestName} · currently Room {reservation.roomNumber}</p>
            </div>
            <button type="button" onClick={onClose} className="h-8 w-8 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
          </div>

          <div className="px-5 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs"><Calendar className="h-3 w-3 inline mr-1" />Check-in</Label>
                <Input type="date" value={ciISO} min={todayISO} onChange={e => set("checkIn", new Date(e.target.value + "T12:00:00").toISOString())} className="h-10 tabular" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs"><Calendar className="h-3 w-3 inline mr-1" />Check-out</Label>
                <Input type="date" value={coISO} min={ciISO > todayISO ? ciISO : todayISO} onChange={e => set("checkOut", new Date(e.target.value + "T11:00:00").toISOString())} className="h-10 tabular" />
              </div>
            </div>

            <div className="rounded-md bg-surface-sunken/40 border border-border p-3 text-xs flex items-center justify-between">
              <span className="text-muted-foreground">Duration</span>
              <span className="font-semibold tabular">{draft.nights} night{draft.nights === 1 ? "" : "s"}</span>
            </div>

            {/* Room */}
            <div className="space-y-1.5">
              <Label className="text-xs"><BedDouble className="h-3 w-3 inline mr-1" />Room</Label>
              <Select value={draft.roomNumber} onChange={e => {
                const room = rooms.find(r => r.number === e.target.value);
                if (room) { set("roomNumber", room.number); set("roomType", room.type); }
              }} className="h-10">
                <option value={reservation.roomNumber}>Room {reservation.roomNumber} · {reservation.roomType} (current)</option>
                {availableRooms.filter(r => r.number !== reservation.roomNumber).map(r => (
                  <option key={r.id} value={r.number}>Room {r.number} · {r.type} · Floor {r.floor} · {money(r.rate)}/n</option>
                ))}
              </Select>
            </div>

            {/* Pax */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs"><Users className="h-3 w-3 inline mr-1" />Adults</Label>
                <Input type="number" min={1} max={6} value={draft.adults} onChange={e => set("adults", Number(e.target.value))} className="h-10 tabular" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs"><Users className="h-3 w-3 inline mr-1" />Children</Label>
                <Input type="number" min={0} max={4} value={draft.children} onChange={e => set("children", Number(e.target.value))} className="h-10 tabular" />
              </div>
            </div>

            {/* Money diff */}
            <div className="rounded-md border border-border p-3 space-y-1.5 text-sm">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Current total</span>
                <span className="tabular">{money(reservation.total)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">After modification</span>
                <span className="tabular font-semibold">{money(reservation.total + totalDiff)}</span>
              </div>
              {totalDiff !== 0 && (
                <div className="flex items-center justify-between pt-1.5 border-t border-border">
                  <span className={cn("text-xs font-medium", totalDiff > 0 ? "text-warning" : "text-success")}>
                    {totalDiff > 0 ? "Additional to collect" : "Refund due"}
                  </span>
                  <span className={cn("text-sm tabular font-semibold", totalDiff > 0 ? "text-warning" : "text-success")}>
                    {totalDiff > 0 ? "+" : ""}{money(totalDiff)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-border bg-surface-elevated flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground">Guest will be notified via the channels on file.</p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
              <Button onClick={save} disabled={!valid} variant="success"><CheckCircle2 className="h-4 w-4" />Save changes</Button>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}

// ===================== CANCEL DIALOG =====================
function CancelBookingDialog({ reservation, onClose, onConfirm }: {
  reservation: Reservation;
  onClose: () => void;
  onConfirm: (reason: string, refund: number) => void;
}) {
  const [reason, setReason] = React.useState("Guest request");
  const [notify, setNotify] = React.useState<{ email: boolean; whatsapp: boolean; sms: boolean }>({ email: true, whatsapp: true, sms: false });
  const [confirmText, setConfirmText] = React.useState("");

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  // Refund policy preview: days-to-arrival driven
  const today = new Date();
  const ci = new Date(reservation.checkIn);
  const daysUntil = Math.floor((ci.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  let refundPct = 100;
  let policyNote = "Full refund — > 7 days before arrival";
  if (daysUntil < 0) { refundPct = 0; policyNote = "No refund — stay has started"; }
  else if (daysUntil < 3) { refundPct = 50; policyNote = "50% refund — within 3 days of arrival"; }
  else if (daysUntil < 7) { refundPct = 75; policyNote = "75% refund — within 7 days of arrival"; }

  const refund = Math.round(reservation.advance * (refundPct / 100));
  const valid = confirmText.trim().toUpperCase() === "CANCEL";

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <Card className="pointer-events-auto w-full max-w-md p-0 animate-in shadow-xl overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 bg-danger-soft border-b border-danger/20 flex items-center gap-3">
            <span className="h-10 w-10 rounded-md bg-danger text-white inline-flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">Cancel booking</h3>
              <p className="text-xs text-muted-foreground truncate">{reservation.bookingNo} · {reservation.guestName}</p>
            </div>
            <button type="button" onClick={onClose} className="h-8 w-8 rounded-md hover:bg-white/40 inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
          </div>

          <div className="px-5 py-4 space-y-4">
            {/* Booking summary */}
            <div className="rounded-md border border-border p-3 text-sm space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Room</span>
                <span className="font-medium tabular">{reservation.roomNumber} · {reservation.roomType}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Stay</span>
                <span className="font-medium">{formatDate(reservation.checkIn)} → {formatDate(reservation.checkOut)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Advance paid</span>
                <span className="font-medium tabular">{money(reservation.advance)}</span>
              </div>
            </div>

            {/* Refund preview */}
            <div className={cn(
              "rounded-md border p-3 text-sm space-y-1.5",
              refundPct === 100 ? "border-success/40 bg-success-soft/40" :
              refundPct >= 50 ? "border-warning/40 bg-warning-soft/40" :
              "border-danger/40 bg-danger-soft/40"
            )}>
              <p className="text-xs font-semibold uppercase tracking-wider">Refund policy</p>
              <p className="text-[11px]">{policyNote} ({daysUntil >= 0 ? `${daysUntil} days until check-in` : `${-daysUntil} days past check-in`})</p>
              <div className="flex items-center justify-between pt-1.5 border-t border-current/15">
                <span className="text-xs">Refund to guest</span>
                <span className="text-base font-semibold tabular">{money(refund)} <span className="text-[10px] opacity-70">({refundPct}%)</span></span>
              </div>
            </div>

            {/* Reason */}
            <div className="space-y-1.5">
              <Label className="text-xs">Cancellation reason</Label>
              <Select value={reason} onChange={e => setReason(e.target.value)} className="h-9">
                <option>Guest request</option>
                <option>Payment failed</option>
                <option>Overbooking</option>
                <option>Force majeure</option>
                <option>No-show</option>
                <option>Other</option>
              </Select>
            </div>

            {/* Notify guest */}
            <div className="space-y-1.5">
              <Label className="text-[11px]">Notify guest via</Label>
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

            {/* Confirmation */}
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

          {/* Footer */}
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
