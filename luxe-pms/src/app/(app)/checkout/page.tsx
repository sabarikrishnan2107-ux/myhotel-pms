"use client";
import * as React from "react";
import Link from "next/link";
import {
  LogOut, Search, LayoutGrid, List, Filter, Calendar, Users, BedDouble,
  CreditCard, MousePointerClick, Crown, Eye, Zap, Sparkles, AlertCircle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Badge, PaymentBadge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { KPICard } from "@/components/ui/kpi-card";
import type { Reservation, PaymentStatus, BookingSource, Guest } from "@/lib/types";
import { cn, money, formatTime } from "@/lib/utils";
import { apiGet } from "@/lib/api";
import { GuestDetailDrawer } from "@/components/guests/guest-detail-drawer";

export default function CheckoutListPage() {
  const [q, setQ] = React.useState("");
  // In-house guests = checked-in bookings, ready to check out.
  const [departures, setDepartures] = React.useState<Reservation[]>([]);
  const [guests, setGuests] = React.useState<Guest[]>([]);
  React.useEffect(() => {
    apiGet<(Reservation & { status?: string })[]>("/bookings")
      .then(rows => setDepartures(
        rows.filter(b => (b.status ?? "") === "checked-in").map(b => ({ ...b, id: String(b.id) })),
      ))
      .catch(() => {});
    apiGet<Guest[]>("/guests").then(setGuests).catch(() => {});
  }, []);
  const [view, setView] = React.useState<"cards" | "list">("cards");
  const [source, setSource] = React.useState<"all" | BookingSource>("all");
  const [payment, setPayment] = React.useState<"all" | PaymentStatus>("all");
  const [balanceOnly, setBalanceOnly] = React.useState(false);
  const [vipOnly, setVipOnly] = React.useState(false);
  const [selected, setSelected] = React.useState<Reservation | null>(null);

  const matched = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    return departures.filter(r => {
      if (needle && !`${r.bookingNo} ${r.guestName} ${r.roomNumber}`.toLowerCase().includes(needle)) return false;
      if (source !== "all" && r.source !== source) return false;
      if (payment !== "all" && r.paymentStatus !== payment) return false;
      if (balanceOnly && r.balance === 0) return false;
      if (vipOnly && !r.vip) return false;
      return true;
    });
  }, [departures, q, source, payment, balanceOnly, vipOnly]);

  const exactMatch = q.trim() && matched.length === 1 ? matched[0] : null;
  const totalOutstanding = departures.reduce((s, r) => s + (r.balance ?? 0), 0);
  const cleared = departures.filter(r => (r.balance ?? 0) === 0).length;
  const sources = Array.from(new Set(departures.map(r => r.source)));
  const activeFilters = (source !== "all" ? 1 : 0) + (payment !== "all" ? 1 : 0) + (balanceOnly ? 1 : 0) + (vipOnly ? 1 : 0);

  const guestForSelected: Guest | null = React.useMemo(() => {
    if (!selected) return null;
    return guests.find(g => g.name === selected.guestName) ?? {
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
    };
  }, [selected, guests]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-medium tracking-tight">Checkout</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {departures.length} departures expected today · one-click for guests with zero balance
          </p>
        </div>
        <Link href="/bookings/new"><Button variant="outline">New Booking</Button></Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard label="Expected Today" value={departures.length} icon={Calendar} accent="brand" />
        <KPICard label="Already Settled" value={cleared} icon={CreditCard} accent="success" />
        <KPICard label="Outstanding Balance" value={money(totalOutstanding)} icon={CreditCard} accent="warning" />
        <KPICard label="VIP Departures" value={departures.filter(r => r.vip).length} icon={Crown} accent="accent" />
      </div>

      {/* Quick checkout hero */}
      <Card className="p-5 border-l-4 border-l-brand">
        <div className="flex items-start gap-4">
          <span className="h-11 w-11 rounded-md bg-brand text-brand-foreground flex items-center justify-center shrink-0">
            <Zap className="h-5 w-5" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Quick Checkout</p>
            <p className="text-xs text-muted-foreground mt-0.5">Booking #, phone, name, or room # · single match → instant checkout</p>
            <div className="mt-3 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle-foreground" />
                <Input
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  placeholder="BK100245 · 102 · Yuki Tanaka …"
                  className="pl-9 h-11 text-base"
                  autoFocus
                />
              </div>
              {exactMatch ? (
                <Link href={`/checkout/${exactMatch.bookingNo}`}>
                  <Button size="lg">
                    <LogOut className="h-4 w-4" />Checkout {exactMatch.guestName.split(" ")[0]}
                  </Button>
                </Link>
              ) : (
                <Button size="lg" disabled className="opacity-50">
                  <LogOut className="h-4 w-4" />Checkout
                </Button>
              )}
            </div>

            {exactMatch && (
              <div className="mt-3 flex items-center gap-3 p-3 rounded-md bg-brand-soft border border-brand/40 animate-in">
                <Avatar name={exactMatch.guestName} size={36} vip={exactMatch.vip} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm truncate">{exactMatch.guestName}</p>
                    <Badge tone="brand">{exactMatch.bookingNo}</Badge>
                    <PaymentBadge status={exactMatch.paymentStatus} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Room {exactMatch.roomNumber} · {exactMatch.roomType} · expected {formatTime(exactMatch.checkOut)} · {exactMatch.balance > 0 ? `${money(exactMatch.balance)} due` : "Settled"}
                  </p>
                </div>
                <Sparkles className="h-4 w-4 text-brand" />
              </div>
            )}

            {q && !exactMatch && matched.length > 1 && (
              <p className="mt-3 text-xs text-muted-foreground">{matched.length} matches — refine query or pick from the list below.</p>
            )}
          </div>
        </div>
      </Card>

      {/* Filter bar + view toggle */}
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground inline-flex items-center gap-1 mr-1">
            <Filter className="h-3.5 w-3.5" />Filters
          </span>
          <Select value={source} onChange={e => setSource(e.target.value as "all" | BookingSource)} className="h-9 w-auto">
            <option value="all">All sources</option>
            {sources.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Select value={payment} onChange={e => setPayment(e.target.value as "all" | PaymentStatus)} className="h-9 w-auto">
            <option value="all">Any payment</option>
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
            <option value="unpaid">Unpaid</option>
          </Select>
          <button
            type="button"
            onClick={() => setBalanceOnly(!balanceOnly)}
            className={cn(
              "h-9 px-3 rounded-md text-xs font-medium border inline-flex items-center gap-1.5 transition-colors",
              balanceOnly ? "bg-warning text-white border-warning" : "border-border hover:bg-surface-sunken"
            )}
          >
            <AlertCircle className="h-3.5 w-3.5" />Balance due only
          </button>
          <button
            type="button"
            onClick={() => setVipOnly(!vipOnly)}
            className={cn(
              "h-9 px-3 rounded-md text-xs font-medium border inline-flex items-center gap-1.5 transition-colors",
              vipOnly ? "bg-brand text-brand-foreground border-brand" : "border-border hover:bg-surface-sunken"
            )}
          >
            <Crown className="h-3.5 w-3.5" />VIP only
          </button>

          {activeFilters > 0 && (
            <Button variant="ghost" size="sm" onClick={() => { setSource("all"); setPayment("all"); setBalanceOnly(false); setVipOnly(false); }}>
              Clear ({activeFilters})
            </Button>
          )}

          <div className="flex-1" />

          <div className="inline-flex rounded-md border border-border overflow-hidden h-9">
            <button
              type="button"
              onClick={() => setView("cards")}
              className={cn(
                "h-full px-3 inline-flex items-center gap-1.5 text-xs font-medium border-r border-border transition-colors",
                view === "cards" ? "bg-brand text-brand-foreground" : "hover:bg-surface-sunken text-muted-foreground"
              )}
              aria-label="Card view"
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
              aria-label="List view"
            >
              <List className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">List</span>
            </button>
          </div>
        </div>
      </Card>

      <div className="flex items-center gap-2 text-xs text-muted-foreground -mt-2">
        <MousePointerClick className="h-3.5 w-3.5" />
        <span><span className="font-medium text-foreground">Double-click any row or card</span> to view full guest profile (stay history, payments, F&amp;B)</span>
      </div>

      <div className="text-xs text-muted-foreground">
        Showing <span className="font-medium text-foreground">{matched.length}</span> of {departures.length} departures
      </div>

      {view === "cards" ? (
        <CardsView arrivals={matched} onSelect={setSelected} />
      ) : (
        <ListView arrivals={matched} onSelect={setSelected} />
      )}

      {matched.length === 0 && (
        <Card className="p-12 text-center">
          <Search className="h-8 w-8 mx-auto text-subtle-foreground" />
          <p className="mt-3 font-medium">No departures match your filters</p>
          <p className="text-xs text-muted-foreground mt-1">Clear filters above to see all expected departures.</p>
        </Card>
      )}

      <GuestDetailDrawer
        open={selected !== null}
        onClose={() => setSelected(null)}
        guest={guestForSelected}
        reservation={selected}
      />
    </div>
  );
}

function CardsView({ arrivals, onSelect }: { arrivals: Reservation[]; onSelect: (r: Reservation) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {arrivals.map(r => (
        <Card
          key={r.id}
          onDoubleClick={() => onSelect(r)}
          title="Double-click for guest details"
          className={cn(
            "p-4 transition-all hover:shadow-md border-l-4 cursor-pointer select-none",
            r.vip ? "border-l-brand" : r.balance > 0 ? "border-l-warning" : "border-l-success"
          )}
        >
          <div className="flex items-start gap-3">
            <Avatar name={r.guestName} size={44} vip={r.vip} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="font-semibold truncate">{r.guestName}</p>
                {r.vip && <Crown className="h-3.5 w-3.5 text-brand shrink-0" />}
              </div>
              <p className="text-[11px] text-muted-foreground tabular">{r.bookingNo}</p>
            </div>
            <PaymentBadge status={r.paymentStatus} />
          </div>

          <dl className="mt-4 pt-3 border-t border-border grid grid-cols-2 gap-y-1.5 text-xs">
            <Item icon={BedDouble} label={`Room ${r.roomNumber}`} value={r.roomType} />
            <Item icon={Users} label="Pax" value={`${r.adults}A${r.children ? ` +${r.children}C` : ""}`} />
            <Item icon={Calendar} label="Nights" value={`${r.nights}`} />
            <Item icon={Calendar} label="ETA out" value={formatTime(r.checkOut)} />
          </dl>

          <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
            <Badge tone="neutral">{r.source}</Badge>
            {r.balance > 0 ? (
              <span className="text-xs tabular text-warning font-semibold">{money(r.balance)} due</span>
            ) : (
              <span className="text-xs tabular text-success font-medium">Settled</span>
            )}
          </div>

          <div className="mt-3 flex gap-1.5">
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onSelect(r); }}
              className="flex-1 h-8 px-2 rounded-md text-xs font-medium border border-border hover:bg-surface-sunken inline-flex items-center justify-center gap-1.5"
            >
              <Eye className="h-3 w-3" />Details
            </button>
            <Link href={`/checkout/${r.bookingNo}`} className="flex-1" onClick={e => e.stopPropagation()}>
              <Button size="sm" className="w-full">
                <LogOut className="h-3.5 w-3.5" />Checkout
              </Button>
            </Link>
            <Link href={`/checkout/express/${r.bookingNo}`} onClick={e => e.stopPropagation()} title="Express checkout">
              <Button size="sm" variant="outline" className="w-full">
                <Zap className="h-3.5 w-3.5" />Express
              </Button>
            </Link>
          </div>
        </Card>
      ))}
    </div>
  );
}

function ListView({ arrivals, onSelect }: { arrivals: Reservation[]; onSelect: (r: Reservation) => void }) {
  return (
    <Card className="p-0 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-surface-elevated border-b border-border">
          <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-3 font-semibold">Booking</th>
            <th className="px-4 py-3 font-semibold">Guest</th>
            <th className="px-4 py-3 font-semibold">Room</th>
            <th className="px-4 py-3 font-semibold">Source</th>
            <th className="px-4 py-3 font-semibold">Expected Out</th>
            <th className="px-4 py-3 font-semibold text-right">Nights</th>
            <th className="px-4 py-3 font-semibold">Payment</th>
            <th className="px-4 py-3 font-semibold text-right">Balance</th>
            <th className="px-4 py-3 font-semibold text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {arrivals.map(r => (
            <tr
              key={r.id}
              onDoubleClick={() => onSelect(r)}
              title="Double-click for guest details"
              className="hover:bg-surface-sunken/50 transition-colors cursor-pointer select-none"
            >
              <td className="px-4 py-3 font-medium tabular">{r.bookingNo}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <Avatar name={r.guestName} size={32} vip={r.vip} />
                  <div>
                    <p className="font-medium inline-flex items-center gap-1">
                      {r.guestName}
                      {r.vip && <Crown className="h-3 w-3 text-brand" />}
                    </p>
                    <p className="text-xs text-muted-foreground">{r.adults}A{r.children ? ` +${r.children}C` : ""}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <p className="font-medium tabular">{r.roomNumber}</p>
                <p className="text-xs text-muted-foreground">{r.roomType}</p>
              </td>
              <td className="px-4 py-3"><Badge tone="neutral">{r.source}</Badge></td>
              <td className="px-4 py-3 text-muted-foreground tabular">{formatTime(r.checkOut)}</td>
              <td className="px-4 py-3 text-right tabular">{r.nights}</td>
              <td className="px-4 py-3"><PaymentBadge status={r.paymentStatus} /></td>
              <td className={cn("px-4 py-3 text-right tabular font-medium", r.balance > 0 ? "text-warning" : "text-success")}>
                {r.balance > 0 ? money(r.balance) : "Settled"}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="inline-flex gap-1">
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); onSelect(r); }}
                    className="h-8 px-2 rounded-md text-xs font-medium border border-border hover:bg-surface-sunken inline-flex items-center gap-1"
                  >
                    <Eye className="h-3 w-3" />Details
                  </button>
                  <Link href={`/checkout/${r.bookingNo}`} onClick={e => e.stopPropagation()}>
                    <Button size="sm"><LogOut className="h-3.5 w-3.5" />Checkout</Button>
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function Item({ icon: Icon, label, value }: { icon: typeof Calendar; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="h-3 w-3 text-subtle-foreground shrink-0" />
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium truncate">{value}</span>
    </div>
  );
}
