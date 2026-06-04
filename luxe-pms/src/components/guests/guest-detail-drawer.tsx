"use client";
import * as React from "react";
import Link from "next/link";
import {
  X, Phone, Mail, MessageCircle, MapPin, IdCard, Briefcase, Crown, Ban,
  BedDouble, Receipt, UtensilsCrossed, FileText, Edit, ChevronRight,
  CheckCircle2, AlertCircle, Globe2, Calendar, Hash, Download, Sparkles,
  CalendarRange, Users, CreditCard, Bed, Tag, Clock, Building2, Printer, LogIn, LogOut,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge, PaymentBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Guest, Reservation } from "@/lib/types";
import { cn, money, formatDate, formatTime } from "@/lib/utils";

const TABS = [
  { id: "booking", label: "Booking", icon: CalendarRange, requiresReservation: true },
  { id: "profile", label: "Profile", icon: IdCard, requiresReservation: false },
  { id: "stays", label: "Stay History", icon: BedDouble, requiresReservation: false },
  { id: "payments", label: "Payments", icon: Receipt, requiresReservation: false },
  { id: "food", label: "F&B Orders", icon: UtensilsCrossed, requiresReservation: false },
  { id: "notes", label: "Notes & Complaints", icon: FileText, requiresReservation: false },
] as const;

type TabId = typeof TABS[number]["id"];

interface Props {
  open: boolean;
  onClose: () => void;
  guest: Guest | null;
  reservation: Reservation | null;
}

export function GuestDetailDrawer({ open, onClose, guest, reservation }: Props) {
  // Default to the Booking tab when opened from a reservation, else Profile
  const [tab, setTab] = React.useState<TabId>(reservation ? "booking" : "profile");

  // Reset tab when drawer opens with a new context
  React.useEffect(() => {
    if (open) setTab(reservation ? "booking" : "profile");
  }, [open, reservation?.id]);

  // ESC to close + body scroll lock
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!guest) return null;

  // Synthesized mock history derived from the guest profile
  const stays = makeStays(guest);
  const payments = makePayments(guest);
  const foodOrders = makeFood(guest);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Guest details"
        className={cn(
          "fixed top-0 right-0 z-50 h-svh w-full sm:w-[520px] lg:w-[600px]",
          "bg-surface border-l border-border shadow-2xl flex flex-col",
          "transition-transform duration-200",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="relative p-5 border-b border-border bg-linear-to-br from-brand-soft/60 via-surface to-accent-soft/30">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 h-8 w-8 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center text-muted-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-start gap-4 pr-10">
            <Avatar name={guest.name} size={64} vip={guest.vip} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-semibold truncate">{guest.name}</h2>
                {guest.vip && <Badge tone="brand"><Crown className="h-3 w-3" />VIP</Badge>}
                {guest.blacklist && <Badge tone="danger"><Ban className="h-3 w-3" />Blacklisted</Badge>}
              </div>
              <p className="text-xs text-muted-foreground mt-1 tabular">Guest #{guest.id.toUpperCase()}</p>
              {reservation && (
                <p className="text-xs text-muted-foreground mt-2">
                  Current: Room <span className="font-medium text-foreground">{reservation.roomNumber}</span> · {reservation.roomType} · {reservation.bookingNo}
                </p>
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div className="mt-4 flex flex-wrap gap-1.5">
            <a href={`tel:${guest.phone}`} className="h-8 px-2.5 rounded-md border border-border bg-surface/80 hover:bg-surface text-xs font-medium inline-flex items-center gap-1.5">
              <Phone className="h-3 w-3" />Call
            </a>
            <a href={`mailto:${guest.email}`} className="h-8 px-2.5 rounded-md border border-border bg-surface/80 hover:bg-surface text-xs font-medium inline-flex items-center gap-1.5">
              <Mail className="h-3 w-3" />Email
            </a>
            <button className="h-8 px-2.5 rounded-md border border-border bg-surface/80 hover:bg-surface text-xs font-medium inline-flex items-center gap-1.5">
              <MessageCircle className="h-3 w-3" />WhatsApp
            </button>
            <button className="h-8 px-2.5 rounded-md border border-border bg-surface/80 hover:bg-surface text-xs font-medium inline-flex items-center gap-1.5">
              <Edit className="h-3 w-3" />Edit
            </button>
          </div>

          {/* Lifetime metrics */}
          <dl className="mt-4 pt-4 border-t border-border grid grid-cols-3 gap-3">
            <Stat label="Lifetime Nights" value={guest.lifetimeNights.toString()} />
            <Stat label="Lifetime Spend" value={money(guest.lifetimeSpend)} />
            <Stat label="Last Stay" value={guest.lastStay ? formatDate(guest.lastStay) : "—"} />
          </dl>
        </div>

        {/* Tabs */}
        <div className="border-b border-border flex items-center gap-1 overflow-x-auto px-2 shrink-0">
          {TABS.filter(t => !t.requiresReservation || reservation).map(t => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "px-3 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap inline-flex items-center gap-1.5",
                  active ? "border-brand text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-5">
          {tab === "booking" && reservation && (
            <div className="space-y-5">
              {/* Headline status */}
              <div className="rounded-lg border border-border p-4 bg-linear-to-br from-brand-soft/30 via-surface to-surface space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Booking #</p>
                    <p className="text-xl font-display font-medium tracking-tight tabular">{reservation.bookingNo}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <PaymentBadge status={reservation.paymentStatus} />
                    <Badge tone="brand">{reservation.source}</Badge>
                  </div>
                </div>

                {/* Stay summary grid — most important at a glance */}
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
                  <SummaryCell icon={LogIn} label="Check-in" main={formatDate(reservation.checkIn)} sub={`${formatTime(reservation.checkIn)} (12 PM)`} />
                  <SummaryCell icon={LogOut} label="Check-out" main={formatDate(reservation.checkOut)} sub={`${formatTime(reservation.checkOut)} (11 AM)`} />
                  <SummaryCell icon={Clock} label="Nights" main={`${reservation.nights}`} sub={reservation.nights === 1 ? "1 night" : `${reservation.nights} nights`} />
                  <SummaryCell icon={Users} label="Pax" main={`${reservation.adults}A${reservation.children ? ` + ${reservation.children}C` : ""}`} sub={reservation.children ? `${reservation.adults + reservation.children} total` : `${reservation.adults} adult${reservation.adults === 1 ? "" : "s"}`} />
                </div>
              </div>

              {/* Room & rate */}
              <Section title="Room & rate">
                <Row icon={Bed} label="Room" value={
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-base tabular">{reservation.roomNumber}</span>
                    <Badge tone="neutral">{reservation.roomType}</Badge>
                  </div>
                } />
                <Row icon={Tag} label="Rate plan" value={
                  <span className="inline-flex items-center gap-2">
                    <span>CP — Continental</span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 bg-success-soft text-success rounded">+ Breakfast</span>
                  </span>
                } />
                <Row icon={Calendar} label="Day-rate breakdown" value={
                  <span className="text-xs tabular">
                    {reservation.nights} × {money(Math.round(reservation.total / Math.max(1, reservation.nights)))} avg/night
                  </span>
                } />
              </Section>

              {/* Money */}
              <Section title="Payment summary">
                <div className="rounded-md border border-border p-3 space-y-1.5 text-sm">
                  <Line label="Total" value={money(reservation.total)} bold />
                  <Line label="Advance received" value={money(reservation.advance)} color="success" />
                  <div className="border-t border-border my-1.5" />
                  <Line label="Balance at checkout" value={money(reservation.balance)} color={reservation.balance > 0 ? "warning" : "muted"} bold />
                  {reservation.paymentStatus === "unpaid" && (
                    <div className="mt-2 px-2.5 py-1.5 rounded bg-warning-soft border border-warning/30 text-[11px] text-warning flex items-center gap-1.5">
                      <AlertCircle className="h-3 w-3" />Outstanding — collect at check-in
                    </div>
                  )}
                </div>
              </Section>

              {/* Stay options & extras */}
              <Section title="Stay options & extras">
                <div className="flex flex-wrap gap-1.5">
                  {reservation.vip && <Badge tone="brand"><Crown className="h-3 w-3" />VIP treatment</Badge>}
                  <Badge tone="info">Breakfast included</Badge>
                  <Badge tone="neutral">Non-smoking</Badge>
                  <Badge tone="accent">Late check-out OK</Badge>
                  {reservation.children > 0 && <Badge tone="info">Child amenities</Badge>}
                </div>
              </Section>

              {/* Special instructions */}
              <Section title="Special instructions / guest requests">
                <div className="rounded-md bg-warning-soft/40 border border-warning/30 p-3 text-sm leading-relaxed">
                  <p className="inline-flex items-center gap-1.5 text-warning text-[11px] font-semibold uppercase tracking-wider mb-1.5">
                    <AlertCircle className="h-3 w-3" />Visible to HK, F&amp;B, Concierge
                  </p>
                  <p className="text-sm">
                    {reservation.vip
                      ? "Anniversary celebration on Day 2 — please arrange champagne, rose petals on bed at 18:00. Early breakfast at 06:30 for airport transfer."
                      : "Quiet room preferred, away from elevator. Allergic to peanuts. Will need extra pillows."}
                  </p>
                </div>
              </Section>

              {/* Booking metadata */}
              <Section title="Booking record">
                <Row icon={Building2} label="Property" value="The Pearl Marina · Main Tower" />
                <Row icon={Globe2} label="Source" value={reservation.source} />
                <Row icon={Hash} label="Confirmation #" value={<span className="font-mono tabular">{reservation.bookingNo}</span>} />
                <Row icon={Calendar} label="Booked on" value="04 May 2026 · 14:22 IST" />
                <Row icon={Users} label="Booked by" value="Khalid R. · Reception · Shift #4218" />
              </Section>
            </div>
          )}

          {tab === "profile" && (
            <div className="space-y-5">
              <Section title="Contact">
                <Row icon={Phone} label="Phone" value={guest.phone} />
                <Row icon={Mail} label="Email" value={guest.email} />
                <Row icon={MapPin} label="Address" value={
                  guest.nationality === "India" ? "MG Road, Bandra West, Mumbai 400050, India"
                    : guest.nationality === "—" ? "—"
                    : `${guest.nationality} (full address on file)`
                } />
                <Row icon={Globe2} label="Nationality" value={guest.nationality} />
              </Section>

              <Section title="Identification">
                <Row icon={IdCard} label={guest.idType} value={guest.idNumber} />
                <Row icon={FileText} label="Document" value={
                  <div className="flex items-center gap-2">
                    <span className="text-xs">passport_scan_FRONT.pdf</span>
                    <button className="text-brand hover:underline text-xs inline-flex items-center gap-0.5">
                      <Download className="h-3 w-3" />View
                    </button>
                  </div>
                } />
                <Row icon={Edit} label="Digital signature" value={
                  <span className="font-display italic text-base">{guest.name.split(" ")[0]}</span>
                } />
              </Section>

              <Section title="Business">
                <Row icon={Briefcase} label="Company / Organization" value={guest.vip ? "Pearl Holdings LLC" : "—"} />
                <Row icon={Hash} label="GST / Tax number" value={guest.vip ? "100123456700003" : "—"} />
              </Section>

              <Section title="Preferences & Flags">
                <div className="flex flex-wrap gap-2">
                  {guest.vip && <Badge tone="brand"><Crown className="h-3 w-3" />VIP</Badge>}
                  <Badge tone="success"><CheckCircle2 className="h-3 w-3" />Verified ID</Badge>
                  <Badge tone="info">Non-smoking floor</Badge>
                  <Badge tone="info">High floor preferred</Badge>
                  <Badge tone="accent">Late checkout OK</Badge>
                  {guest.lifetimeNights > 20 && <Badge tone="brand"><Sparkles className="h-3 w-3" />Loyalty Gold</Badge>}
                </div>
              </Section>
            </div>
          )}

          {tab === "stays" && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">{stays.length} stays · most recent first</p>
              <ul className="space-y-2">
                {stays.map((s, i) => (
                  <li key={i} className="rounded-md border border-border p-3 hover:bg-surface-sunken transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-sm tabular">{s.bookingNo}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Room {s.room} · {s.type} · {s.nights}N</p>
                      </div>
                      <Badge tone="neutral">{s.source}</Badge>
                    </div>
                    <div className="mt-2 pt-2 border-t border-border flex items-center justify-between text-xs">
                      <span className="text-muted-foreground inline-flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" />{s.dates}
                      </span>
                      <span className="font-medium tabular">{money(s.amount)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {tab === "payments" && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">{payments.length} payments · {money(payments.reduce((s, p) => s + p.amount, 0))} total</p>
              <ul className="divide-y divide-border">
                {payments.map((p, i) => (
                  <li key={i} className="py-3 flex items-center gap-3">
                    <span className="h-9 w-9 rounded-md bg-success-soft text-success flex items-center justify-center shrink-0">
                      <Receipt className="h-4 w-4" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{p.desc}</p>
                      <p className="text-xs text-muted-foreground">{p.date} · {p.mode} · {p.ref}</p>
                    </div>
                    <span className="font-semibold tabular text-sm">{money(p.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {tab === "food" && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">{foodOrders.length} in-room dining orders</p>
              <ul className="space-y-2">
                {foodOrders.map((o, i) => (
                  <li key={i} className="rounded-md border border-border p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium">{o.items}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{o.when} · Room {o.room}</p>
                      </div>
                      <span className="font-semibold tabular text-sm">{money(o.total)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {tab === "notes" && (
            <div className="space-y-4">
              <Section title="Internal Notes">
                <div className="rounded-md bg-warning-soft border border-warning/30 p-3">
                  <p className="text-sm">{guest.vip ? "VIP guest — always assign suite category, complimentary upgrade if available." : "Prefers high floor, away from elevators."}</p>
                  <p className="text-[10px] text-muted-foreground mt-2">Added by Tom W. · 2 weeks ago</p>
                </div>
              </Section>

              <Section title="Complaint History">
                {guest.lifetimeNights > 30 ? (
                  <div className="rounded-md border border-border p-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">AC noise complaint — Room 305</p>
                        <p className="text-xs text-muted-foreground mt-0.5">14 Mar 2026 · resolved by Engineering · room change offered</p>
                      </div>
                      <Badge tone="success">Resolved</Badge>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No complaints on file.</p>
                )}
              </Section>

              <Section title="Add Note">
                <textarea
                  rows={3}
                  placeholder="Add an internal note about this guest…"
                  className="w-full px-3 py-2 rounded-md border border-border bg-surface text-sm placeholder:text-subtle-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 outline-hidden resize-none"
                />
                <div className="mt-2 flex justify-end">
                  <Button size="sm">Save Note</Button>
                </div>
              </Section>
            </div>
          )}
        </div>

        {/* Footer actions */}
        {reservation && (
          <div className="border-t border-border p-3 grid grid-cols-2 sm:grid-cols-4 gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => window.print()}
              className="h-9 px-2 rounded-md border border-border hover:bg-surface-sunken text-xs font-medium inline-flex items-center justify-center gap-1.5"
              title="Print booking summary"
            >
              <Printer className="h-3.5 w-3.5" />Print
            </button>
            <Link href={`/folio/${reservation.bookingNo}`}>
              <Button variant="outline" size="sm" className="w-full">
                <Receipt className="h-3.5 w-3.5" />Folio
              </Button>
            </Link>
            <Link href={`/bookings?modify=${reservation.bookingNo}`}>
              <Button variant="outline" size="sm" className="w-full">
                <Edit className="h-3.5 w-3.5" />Modify
              </Button>
            </Link>
            <Link href={`/checkout/${reservation.bookingNo}`}>
              <Button size="sm" className="w-full">
                Checkout<ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="text-[10px] uppercase tracking-[0.16em] text-subtle-foreground font-semibold mb-3">{title}</p>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}

function Row({ icon: Icon, label, value }: { icon: typeof Phone; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
        <div className="text-sm mt-0.5 break-words">{value}</div>
      </div>
    </div>
  );
}

function SummaryCell({ icon: Icon, label, main, sub }: { icon: typeof Phone; label: string; main: React.ReactNode; sub?: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="h-8 w-8 rounded-md bg-surface-sunken text-muted-foreground inline-flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
        <p className="text-sm font-semibold leading-tight mt-0.5 truncate">{main}</p>
        {sub && <p className="text-[11px] text-muted-foreground leading-tight">{sub}</p>}
      </div>
    </div>
  );
}

function Line({ label, value, bold, color }: { label: string; value: string; bold?: boolean; color?: "success" | "warning" | "muted" }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className={cn("text-xs", color === "muted" ? "text-muted-foreground" : "text-muted-foreground")}>{label}</span>
      <span className={cn(
        "tabular",
        bold ? "font-semibold text-base" : "",
        color === "success" && "text-success",
        color === "warning" && "text-warning",
        !bold && color !== "warning" && color !== "success" && "text-foreground"
      )}>{value}</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
      <p className="mt-1 text-base font-semibold tabular">{value}</p>
    </div>
  );
}

// ---------- mock history derivation ----------
function makeStays(g: Guest) {
  const n = Math.min(8, Math.max(1, Math.floor(g.lifetimeNights / 4)));
  const types = ["Deluxe", "King", "Suite", "Queen"];
  const sources = ["Website", "OTA: Booking.com", "Agent", "Direct"];
  return Array.from({ length: n }, (_, i) => ({
    bookingNo: `BK${String(99000 - i * 137 - (parseInt(g.id.slice(1)) * 11))}`,
    room: `${(3 + i) % 6 + 1}0${(i * 3 % 9) + 1}`,
    type: types[i % types.length],
    nights: 2 + (i % 4),
    source: sources[i % sources.length],
    dates: `${10 + i % 18} ${["Feb", "Jan", "Dec", "Nov", "Oct", "Sep", "Aug", "Jul"][i % 8]} 202${6 - Math.floor(i / 3)}`,
    amount: Math.round(g.lifetimeSpend / n + i * 137) - 80,
  }));
}

function makePayments(g: Guest) {
  return [
    { date: g.lastStay ?? "—", desc: "Folio settlement", mode: "Card", ref: "Visa ****4421", amount: Math.round(g.lifetimeSpend * 0.18) },
    { date: "12 Feb 2026", desc: "Advance — BK98423", mode: "Bank transfer", ref: "Ref 8821-0094", amount: Math.round(g.lifetimeSpend * 0.12) },
    { date: "08 Jan 2026", desc: "Folio settlement", mode: "Card", ref: "Mastercard ****0118", amount: Math.round(g.lifetimeSpend * 0.21) },
    { date: "15 Nov 2025", desc: "Spa add-on", mode: "Cash", ref: "Reception", amount: Math.round(g.lifetimeSpend * 0.04) },
  ];
}

function makeFood(g: Guest) {
  return [
    { items: "Eggs Benedict × 2, Cappuccino × 2", room: "305", when: "Today 09:42", total: 232 },
    { items: "Wagyu Burger, Truffle Pizza", room: "305", when: "Yesterday 20:15", total: 270 },
    { items: "Caesar Salad, Tiramisu, Espresso", room: "412", when: g.lastStay ? formatDate(g.lastStay) : "—", total: 150 },
    { items: "Continental Breakfast × 1", room: "412", when: "Last visit", total: 95 },
  ];
}
