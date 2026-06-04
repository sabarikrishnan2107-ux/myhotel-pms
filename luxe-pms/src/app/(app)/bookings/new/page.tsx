"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  User, Calendar, Users, BedDouble, Tag, CreditCard, CheckCircle2,
  ChevronLeft, ChevronRight, Search, Plus, Minus, Sparkles, ArrowRight, Send,
  Printer, Mail, MessageCircle, Phone, Copy, X, Eye,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { GUESTS, ROOMS } from "@/lib/mock-data";
import { cn, money } from "@/lib/utils";
import { apiPost } from "@/lib/api";
import { NewGuestForm, type NewGuestData } from "@/components/guests/new-guest-form";

// Dynamic pricing — weekday / weekend / holiday multipliers (read from Master Setup in production)
const PRICING_MULTIPLIERS = {
  weekday: 1.0,   // Mon-Thu
  weekend: 1.2,   // Fri-Sat (+20%)
  holiday: 1.3,   // configured holidays (+30%)
} as const;
const HOLIDAY_DATES = new Set([
  "2026-08-15",  // Independence Day
  "2026-10-02",  // Gandhi Jayanti
  "2026-11-01",  // Diwali
  "2026-12-25",  // Christmas
  "2026-12-26",  // Christmas observed
  "2027-01-26",  // Republic Day
]);
function classifyDay(d: Date): "weekday" | "weekend" | "holiday" {
  const iso = d.toISOString().slice(0, 10);
  if (HOLIDAY_DATES.has(iso)) return "holiday";
  const day = d.getDay();
  return day === 5 || day === 6 ? "weekend" : "weekday";
}
function nightlyBreakdown(checkInISO: string, nights: number, baseRate: number) {
  const lines: { date: Date; kind: "weekday" | "weekend" | "holiday"; rate: number }[] = [];
  const counts = { weekday: 0, weekend: 0, holiday: 0 };
  let total = 0;
  for (let i = 0; i < nights; i++) {
    const d = new Date(checkInISO);
    d.setDate(d.getDate() + i);
    const kind = classifyDay(d);
    const rate = Math.round(baseRate * PRICING_MULTIPLIERS[kind]);
    counts[kind] += 1;
    total += rate;
    lines.push({ date: d, kind, rate });
  }
  return { counts, total, lines, avgRate: nights ? Math.round(total / nights) : 0 };
}

// Rate plan catalog with meal inclusions visualized
type Meal = "B" | "L" | "D"; // Breakfast / Lunch / Dinner
const RATE_PLANS: { v: string; label: string; meals: Meal[]; refundable: boolean; discountPct: number; hint?: string }[] = [
  { v: "EP",  label: "European",      meals: [],          refundable: true,  discountPct: 0,  hint: "Room only" },
  { v: "CP",  label: "Continental",   meals: ["B"],       refundable: true,  discountPct: 0,  hint: "Room + Breakfast" },
  { v: "MAP", label: "Modified Am.",  meals: ["B", "D"],  refundable: true,  discountPct: 0,  hint: "Room + Breakfast + Dinner" },
  { v: "AP",  label: "American",      meals: ["B", "L", "D"], refundable: true, discountPct: 0, hint: "Room + All meals" },
  { v: "Corporate", label: "Corporate", meals: ["B"], refundable: true, discountPct: 15, hint: "Corporate rate · 15% off" },
  { v: "Non-refundable", label: "Non-refundable", meals: ["B"], refundable: false, discountPct: 20, hint: "20% off · cannot cancel" },
];

// F&B add-on packages — mirrors the catalog from Master Setup
const FB_PACKAGES = [
  { id: "fb1", name: "Continental Breakfast", short: "Breakfast",  icon: "☕", price: 450,  type: "Breakfast" as const },
  { id: "fb2", name: "Buffet Lunch — Veg",    short: "Buffet Lunch", icon: "🍽", price: 850,  type: "Lunch" as const },
  { id: "fb3", name: "Buffet Dinner — Mixed", short: "Buffet Dinner", icon: "🍽", price: 1200, type: "Dinner" as const },
  { id: "fb4", name: "High Tea Platter",      short: "High Tea",    icon: "🍪", price: 650,  type: "High Tea" as const },
];

const STEPS = [
  { n: 1, title: "Guest", icon: User, desc: "Find existing or create new" },
  { n: 2, title: "Dates", icon: Calendar, desc: "Stay duration" },
  { n: 3, title: "Pax & Type", icon: Users, desc: "Adults, children, room type" },
  { n: 4, title: "Room", icon: BedDouble, desc: "Pick available room" },
  { n: 5, title: "Rate Plan", icon: Tag, desc: "EP / CP / MAP / AP + extras" },
  { n: 6, title: "Payment", icon: CreditCard, desc: "Advance or full" },
  { n: 7, title: "Confirm", icon: CheckCircle2, desc: "Send confirmation" },
];

export default function BookingWizardPage() {
  const router = useRouter();
  const [step, setStep] = React.useState(1);
  const [guest, setGuest] = React.useState<string | null>(null);
  const [newGuest, setNewGuest] = React.useState<NewGuestData | null>(null);
  const [step1Mode, setStep1Mode] = React.useState<"search" | "create">("search");
  const [search, setSearch] = React.useState("");
  const [adults, setAdults] = React.useState(2);
  const [children, setChildren] = React.useState(0);
  const [roomType, setRoomType] = React.useState("Deluxe");
  const [selectedRoom, setSelectedRoom] = React.useState<string | null>(null);
  const [ratePlan, setRatePlan] = React.useState("CP");
  const [breakfast, setBreakfast] = React.useState(true);
  const [extraBed, setExtraBed] = React.useState(false);
  const [airportTransfer, setAirportTransfer] = React.useState(false);
  const [lateCheckout, setLateCheckout] = React.useState(false);
  // Step-2 stay options
  const [earlyCheckIn, setEarlyCheckIn] = React.useState(false);
  const [halfDay, setHalfDay] = React.useState(false);
  // Special instructions / requests from guest
  const [instructions, setInstructions] = React.useState("");
  // Live rate-breakdown drawer toggle
  const [rateBreakdownOpen, setRateBreakdownOpen] = React.useState(false);
  // F&B add-on packages (per-pax counts × nights)
  const [fbAddons, setFbAddons] = React.useState<Record<string, number>>({}); // { id: count-of-pax-per-day }
  const [paymentPct, setPaymentPct] = React.useState(30);
  const [source, setSource] = React.useState("Walk-in");
  const [paymentMode, setPaymentMode] = React.useState("UPI");
  const [channels, setChannels] = React.useState<{ email: boolean; whatsapp: boolean; sms: boolean }>({ email: true, whatsapp: true, sms: false });
  const [submitting, setSubmitting] = React.useState(false);
  const [confirmed, setConfirmed] = React.useState<null | {
    bookingNo: string;
    guestName: string;
    guestPhone: string;
    roomNumber: string;
    roomType: string;
    checkIn: string;
    checkOut: string;
    nights: number;
    pax: string;
    total: number;
    advance: number;
    balance: number;
    paymentMode: string;
    channels: { email: boolean; whatsapp: boolean; sms: boolean };
    createdAt: string;
  }>(null);
  // URL prefill from Calendar drag-select (room + checkin + checkout)
  const searchParams = useSearchParams();
  const urlRoom = searchParams.get("room");
  const urlCheckin = searchParams.get("checkin") ?? searchParams.get("date");
  const urlCheckout = searchParams.get("checkout");

  const [checkIn, setCheckIn] = React.useState(urlCheckin ?? "2026-05-24");
  const [checkOut, setCheckOut] = React.useState(urlCheckout ?? "2026-05-27");

  // If the URL specified a room, find it and pre-select its type + the room itself
  React.useEffect(() => {
    if (!urlRoom) return;
    const room = ROOMS.find(r => r.number === urlRoom);
    if (room) {
      setRoomType(room.type);
      setSelectedRoom(room.id);
    }
  }, [urlRoom]);

  // ISO date helpers
  const addDays = (iso: string, days: number) => {
    const d = new Date(iso);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  };
  const minCheckout = addDays(checkIn, 1); // checkout must be at least 1 day after check-in
  const todayISO = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD local — blocks past dates

  // Auto-push checkout forward if check-in moves past it
  const handleCheckInChange = (val: string) => {
    setCheckIn(val);
    if (checkOut <= val) {
      setCheckOut(addDays(val, Math.max(1, nights)));
    }
  };
  const handleCheckOutChange = (val: string) => {
    // Guard: never allow checkout on/before check-in
    if (val <= checkIn) {
      setCheckOut(addDays(checkIn, 1));
    } else {
      setCheckOut(val);
    }
  };

  const nights = Math.max(1, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000));

  const rate = roomType === "Suite" ? 1200 : roomType === "King" ? 850 : roomType === "Deluxe" ? 650 : 450;
  // Dynamic per-night rate breakdown by day type
  const breakdown = React.useMemo(() => nightlyBreakdown(checkIn, nights, rate), [checkIn, nights, rate]);
  const subtotal = halfDay ? Math.round(rate * 0.5) : breakdown.total;

  // Each F&B add-on package: price × pax-per-day × nights
  const fbTotal = FB_PACKAGES.reduce((t, p) => t + p.price * (fbAddons[p.id] ?? 0) * nights, 0);

  // Stay options as flat fees
  const earlyFee = earlyCheckIn ? 500 : 0;        // ₹500 flat
  const lateFee = lateCheckout ? 500 : 0;         // ₹500 flat

  const extras =
    (breakfast ? 95 * adults * nights : 0) +
    (extraBed ? 900 * nights : 0) +
    (airportTransfer ? 175 : 0) +
    earlyFee + lateFee +
    fbTotal;
  const tax = (subtotal + extras) * 0.05;
  const total = subtotal + extras + tax;
  const advance = Math.round((total * paymentPct) / 100);

  const filteredGuests = GUESTS.filter(g => `${g.name} ${g.phone} ${g.email}`.toLowerCase().includes(search.toLowerCase())).slice(0, 5);
  const availableRooms = ROOMS.filter(r => r.type === roomType).slice(0, 6);

  const canNext = () => {
    if (step === 1) return guest !== null || newGuest !== null;
    if (step === 4) return selectedRoom !== null;
    return true;
  };

  // Selected guest display info (works for existing OR newly-created guest)
  const selectedGuestDisplay = React.useMemo(() => {
    if (newGuest) {
      return { name: newGuest.name, phone: newGuest.phone, vip: newGuest.vip, photo: newGuest.photo };
    }
    if (guest) {
      const g = GUESTS.find(x => x.id === guest);
      if (g) return { name: g.name, phone: g.phone, vip: g.vip, photo: null as string | null };
    }
    return null;
  }, [guest, newGuest]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-display font-medium tracking-tight">New Booking</h1>
          <p className="text-muted-foreground text-sm mt-1">Step {step} of {STEPS.length} · {STEPS[step - 1].desc}</p>
        </div>
        <Link href="/dashboard"><Button variant="ghost">Cancel</Button></Link>
      </div>

      {/* Stepper */}
      <Card className="p-4 mb-5">
        <div className="flex items-center justify-between overflow-x-auto">
          {STEPS.map((s, idx) => {
            const completed = step > s.n;
            const active = step === s.n;
            const Icon = s.icon;
            return (
              <React.Fragment key={s.n}>
                <button
                  onClick={() => completed && setStep(s.n)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 min-w-[80px] transition-opacity",
                    completed ? "cursor-pointer" : "cursor-default",
                    !completed && !active && "opacity-60"
                  )}
                >
                  <div className={cn(
                    "h-9 w-9 rounded-full flex items-center justify-center transition-colors",
                    completed ? "bg-success text-white" :
                    active ? "bg-brand text-brand-foreground" :
                    "bg-surface-sunken text-muted-foreground border border-border"
                  )}>
                    {completed ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <span className={cn("text-[11px] font-medium whitespace-nowrap", active && "text-foreground", !active && "text-muted-foreground")}>
                    {s.title}
                  </span>
                </button>
                {idx < STEPS.length - 1 && (
                  <div className={cn("flex-1 h-px mx-2", completed ? "bg-success" : "bg-border")} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Step content */}
        <Card className="lg:col-span-2 p-6 min-h-[400px]">
          {step === 1 && (
            <div className="space-y-5">
              {/* Guest source tabs */}
              <div className="inline-flex rounded-md border border-border bg-surface-sunken p-0.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setStep1Mode("search")}
                  className={cn(
                    "flex-1 sm:flex-initial h-9 px-4 rounded-md text-sm font-medium transition-colors inline-flex items-center gap-2 justify-center",
                    step1Mode === "search" ? "bg-surface text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Search className="h-3.5 w-3.5" />Search Existing
                </button>
                <button
                  type="button"
                  onClick={() => { setStep1Mode("create"); setGuest(null); }}
                  className={cn(
                    "flex-1 sm:flex-initial h-9 px-4 rounded-md text-sm font-medium transition-colors inline-flex items-center gap-2 justify-center",
                    step1Mode === "create" ? "bg-surface text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Plus className="h-3.5 w-3.5" />Create New Guest
                </button>
              </div>
            </div>
          )}

          {step === 1 && step1Mode === "search" && (
            <div className="space-y-5 mt-5">
              <div>
                <Label>Search existing guest</Label>
                <div className="relative mt-1.5">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle-foreground" />
                  <Input placeholder="Phone, name, email, or ID number…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" autoFocus />
                </div>
              </div>

              {/* New-guest summary chip if one was just created */}
              {newGuest && (
                <div className="flex items-center gap-3 p-3 rounded-md border-2 border-brand bg-brand-soft">
                  <Avatar name={newGuest.name} size={36} vip={newGuest.vip} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{newGuest.name}</p>
                      <Badge tone="brand">NEW</Badge>
                      {newGuest.vip && <Badge tone="brand">VIP</Badge>}
                      {newGuest.photo && <Badge tone="success">Photo ✓</Badge>}
                      {newGuest.signature && <Badge tone="success">Signed ✓</Badge>}
                      {newGuest.idFront && <Badge tone="success">ID ✓</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{newGuest.phone} · {newGuest.nationality} · {newGuest.idType} {newGuest.idNumber}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setStep1Mode("create"); }}
                    className="text-xs text-brand hover:underline"
                  >
                    Edit
                  </button>
                </div>
              )}

              {search && (
                <div className="space-y-2">
                  {filteredGuests.length === 0 ? (
                    <div className="rounded-md border border-dashed border-border p-4 text-center">
                      <p className="text-sm text-muted-foreground mb-2">No matches found for &ldquo;{search}&rdquo;</p>
                      <Button size="sm" onClick={() => { setStep1Mode("create"); setGuest(null); }}>
                        <Plus className="h-3.5 w-3.5" />Create new guest
                      </Button>
                    </div>
                  ) : filteredGuests.map(g => (
                    <button
                      key={g.id}
                      onClick={() => { setGuest(g.id); setNewGuest(null); }}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-md border text-left transition-colors",
                        guest === g.id ? "bg-brand-soft border-brand" : "border-border hover:bg-surface-sunken"
                      )}
                    >
                      <Avatar name={g.name} size={36} vip={g.vip} />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{g.name} {g.vip && <Badge tone="brand" className="ml-1">VIP</Badge>}</p>
                        <p className="text-xs text-muted-foreground">{g.phone} · {g.nationality} · {g.lifetimeNights}N lifetime</p>
                      </div>
                      {guest === g.id && <CheckCircle2 className="h-5 w-5 text-brand" />}
                    </button>
                  ))}
                </div>
              )}

              <p className="text-[11px] text-muted-foreground pt-2 border-t border-border">
                First-time visitor? Switch to the <span className="text-foreground font-medium">Create New Guest</span> tab above to capture face, ID & signature.
              </p>
            </div>
          )}

          {step === 1 && step1Mode === "create" && (
            <div className="mt-5">
              <NewGuestForm
                onCancel={() => setStep1Mode("search")}
                onSave={(data) => {
                  setNewGuest(data);
                  setGuest(null);
                  setStep1Mode("search");
                }}
              />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <p className="text-sm text-muted-foreground">One night = 12:00 PM check-in → next-day 11:00 AM checkout</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Check-in</Label>
                  <Input type="date" value={checkIn} min={todayISO} onChange={e => handleCheckInChange(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Check-out</Label>
                  <Input type="date" value={checkOut} min={minCheckout > todayISO ? minCheckout : todayISO} onChange={e => handleCheckOutChange(e.target.value)} />
                  <p className="text-[11px] text-muted-foreground">Must be after check-in · auto-adjusts if you change dates</p>
                </div>
              </div>
              <div className="rounded-md bg-brand-soft text-brand-soft-foreground p-4 flex items-center gap-3">
                <Calendar className="h-5 w-5" />
                <div className="text-sm">
                  <span className="font-semibold">{nights} {nights === 1 ? "night" : "nights"}</span> · {new Date(checkIn).toLocaleDateString(undefined, { day: "2-digit", month: "short", weekday: "short" })} → {new Date(checkOut).toLocaleDateString(undefined, { day: "2-digit", month: "short", weekday: "short" })}
                </div>
              </div>

              {/* Day-type breakdown — weekday vs weekend vs holiday */}
              <div className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-muted-foreground uppercase tracking-wider">Rate by day type</span>
                  <span className="text-muted-foreground">{breakdown.counts.weekday}W · {breakdown.counts.weekend}WE · {breakdown.counts.holiday}H</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {breakdown.lines.map((ln, i) => {
                    const tone = ln.kind === "holiday" ? "bg-warning-soft text-warning border-warning/30"
                              : ln.kind === "weekend" ? "bg-accent-soft text-accent border-accent/30"
                              : "bg-success-soft text-success border-success/30";
                    return (
                      <span key={i} className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-md border text-[10px] font-medium", tone)}>
                        <span className="font-semibold tabular">{ln.date.toLocaleDateString(undefined, { day: "2-digit", month: "short" })}</span>
                        <span className="opacity-70">·</span>
                        <span className="tabular">{money(ln.rate)}</span>
                      </span>
                    );
                  })}
                </div>
                <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-3">
                  <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-success" />Weekday</span>
                  <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-accent" />Weekend +20%</span>
                  <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-warning" />Holiday +30%</span>
                </p>
              </div>

              {/* Early / Late / Half-day options */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-sm">
                <PricedToggleCard
                  label="Early check-in"
                  hint="Before 12:00 PM · subject to availability"
                  price={500}
                  checked={earlyCheckIn}
                  onChange={setEarlyCheckIn}
                />
                <PricedToggleCard
                  label="Late check-out"
                  hint="Until 4:00 PM · housekeeping reschedules"
                  price={500}
                  checked={lateCheckout}
                  onChange={setLateCheckout}
                />
                <PricedToggleCard
                  label="Half-day rate"
                  hint="< 6 hours stay · 50% of room tariff"
                  pricePct="-50%"
                  checked={halfDay}
                  onChange={setHalfDay}
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <Stepper label="Adults" value={adults} onChange={setAdults} min={1} max={6} />
                <Stepper label="Children" value={children} onChange={setChildren} min={0} max={4} />
              </div>
              <div className="space-y-1.5">
                <Label>Room type</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {["Queen", "Deluxe", "Suite", "King", "Family", "Executive"].map(t => (
                    <button
                      key={t}
                      onClick={() => setRoomType(t)}
                      className={cn(
                        "h-12 rounded-md border text-sm font-medium transition-colors",
                        roomType === t ? "bg-brand-soft border-brand text-brand-soft-foreground" : "border-border hover:bg-surface-sunken"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{availableRooms.length} {roomType} rooms available for these dates</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {availableRooms.map(r => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRoom(r.id)}
                    className={cn(
                      "p-3 rounded-md border text-left transition-all hover:shadow-md",
                      selectedRoom === r.id ? "bg-brand-soft border-brand" : "border-border hover:bg-surface-sunken"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-semibold tabular">{r.number}</span>
                      {selectedRoom === r.id && <CheckCircle2 className="h-4 w-4 text-brand" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">Floor {r.floor} · {r.type}</p>
                    <p className="text-sm font-medium mt-2 tabular">{money(r.rate)}<span className="text-xs text-muted-foreground">/night</span></p>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-border">
                <Sparkles className="h-3.5 w-3.5 text-brand" />
                <span>AI suggests <span className="text-foreground font-medium">Room {availableRooms[0]?.number}</span> — closest to elevator, requested twice by this guest before.</span>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-5">
              {/* Rate plan — visual meal-inclusion */}
              <div className="space-y-1.5">
                <Label>Rate plan</Label>
                <p className="text-[11px] text-muted-foreground">Choose how meals are bundled with the room.</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                  {RATE_PLANS.map(p => {
                    const isSelected = ratePlan === p.v;
                    return (
                      <button
                        key={p.v}
                        onClick={() => setRatePlan(p.v)}
                        className={cn(
                          "p-3 rounded-md border text-left text-sm transition-all",
                          isSelected ? "bg-brand-soft border-brand shadow-xs" : "border-border hover:bg-surface-sunken"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{p.v}</span>
                          {p.discountPct > 0 && (
                            <span className="text-[10px] font-semibold text-success bg-success-soft px-1.5 py-0.5 rounded">
                              -{p.discountPct}%
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{p.label}</p>
                        {/* Meal pills — show which meals are included */}
                        <div className="mt-2 flex gap-1">
                          <MealPill label="B" full="Breakfast" on={p.meals.includes("B")} />
                          <MealPill label="L" full="Lunch" on={p.meals.includes("L")} />
                          <MealPill label="D" full="Dinner" on={p.meals.includes("D")} />
                          {!p.refundable && <span className="text-[9px] px-1.5 py-0.5 rounded bg-danger-soft text-danger font-semibold uppercase tracking-wider ml-auto">No-refund</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* F&B add-on packages — for extra meals beyond the rate plan */}
              <div className="space-y-1.5">
                <Label>F&amp;B add-on packages</Label>
                <p className="text-[11px] text-muted-foreground">
                  Pre-book additional meals or banquets for the stay. Charged <span className="text-foreground font-medium">per pax × {nights} night{nights === 1 ? "" : "s"}</span>.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  {FB_PACKAGES.map(pkg => {
                    const count = fbAddons[pkg.id] ?? 0;
                    const includedInPlan = (pkg.type === "Breakfast" && RATE_PLANS.find(rp => rp.v === ratePlan)?.meals.includes("B")) ||
                                           (pkg.type === "Lunch" && RATE_PLANS.find(rp => rp.v === ratePlan)?.meals.includes("L")) ||
                                           (pkg.type === "Dinner" && RATE_PLANS.find(rp => rp.v === ratePlan)?.meals.includes("D"));
                    return (
                      <div
                        key={pkg.id}
                        className={cn(
                          "rounded-md border p-3 flex items-center gap-3 transition-colors",
                          count > 0 ? "bg-brand-soft/40 border-brand" : "border-border",
                          includedInPlan && "opacity-70"
                        )}
                      >
                        <span className="text-2xl shrink-0">{pkg.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-sm font-medium leading-tight truncate">{pkg.short}</p>
                            {includedInPlan && (
                              <span className="text-[9px] font-semibold uppercase tracking-wider bg-success-soft text-success px-1.5 py-0.5 rounded">included in {ratePlan}</span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground tabular">{money(pkg.price)}/pax × {nights}N</p>
                        </div>
                        <div className="flex items-center border border-border rounded-md h-8 bg-surface shrink-0">
                          <button
                            type="button"
                            onClick={() => setFbAddons(a => ({ ...a, [pkg.id]: Math.max(0, (a[pkg.id] ?? 0) - 1) }))}
                            disabled={count === 0}
                            className="w-7 h-7 inline-flex items-center justify-center hover:bg-surface-sunken disabled:opacity-40 disabled:cursor-not-allowed"
                            aria-label={`Decrease ${pkg.short}`}
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-7 text-center text-sm tabular font-medium">{count}</span>
                          <button
                            type="button"
                            onClick={() => setFbAddons(a => ({ ...a, [pkg.id]: (a[pkg.id] ?? 0) + 1 }))}
                            className="w-7 h-7 inline-flex items-center justify-center hover:bg-surface-sunken"
                            aria-label={`Increase ${pkg.short}`}
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {fbTotal > 0 && (
                  <div className="mt-2 px-3 py-2 rounded-md bg-brand-soft/30 border border-brand/20 text-xs flex items-center justify-between">
                    <span className="text-muted-foreground">F&amp;B add-on subtotal</span>
                    <span className="font-semibold tabular text-brand-soft-foreground">{money(fbTotal)}</span>
                  </div>
                )}
              </div>

              {/* Other extras */}
              <div className="space-y-2">
                <Label>Other extras</Label>
                <ToggleRow label="Breakfast buffet (à la carte top-up)" hint={`${money(95)} per person/day · use this only if not on a meal plan`} checked={breakfast} onChange={setBreakfast} />
                <ToggleRow label="Extra bed" hint={`${money(900)} per person/night (incl. breakfast)`} checked={extraBed} onChange={setExtraBed} />
                <ToggleRow label="Airport transfer" hint={`${money(175)} one way`} checked={airportTransfer} onChange={setAirportTransfer} />
                <ToggleRow label="Late check-out (until 4pm)" hint={`${money(200)} flat`} checked={lateCheckout} onChange={setLateCheckout} />
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <Label>Booking source</Label>
                <Select value={source} onChange={e => setSource(e.target.value)}>
                  <option>Walk-in</option><option>Website</option><option>Phone</option>
                  <option>OTA: Booking.com</option><option>Agent</option><option>Corporate</option>
                </Select>
              </div>

              <div>
                <Label>Advance payment percentage</Label>
                <div className="flex gap-2 mt-1.5">
                  {[0, 30, 50, 100].map(p => (
                    <button
                      key={p}
                      onClick={() => setPaymentPct(p)}
                      className={cn(
                        "h-10 px-4 rounded-md border text-sm font-medium transition-colors",
                        paymentPct === p ? "bg-brand text-brand-foreground border-brand" : "border-border hover:bg-surface-sunken"
                      )}
                    >
                      {p === 0 ? "No advance" : p === 100 ? "Full payment" : `${p}%`}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">Default 30% from settings · Manager approval required for 0%</p>
              </div>

              <div className="space-y-1.5">
                <Label>Payment mode</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {["Cash", "Card", "UPI", "Bank Transfer", "Online", "Pay at hotel"].map(m => (
                    <button
                      key={m}
                      onClick={() => setPaymentMode(m)}
                      className={cn(
                        "h-10 rounded-md border text-sm font-medium transition-colors",
                        paymentMode === m ? "bg-brand-soft border-brand text-brand-soft-foreground" : "border-border hover:bg-surface-sunken"
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Special instructions / guest requests */}
              <div className="space-y-1.5 pt-4 border-t border-border">
                <Label htmlFor="instructions">Special instructions / guest requests <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <textarea
                  id="instructions"
                  value={instructions}
                  onChange={e => setInstructions(e.target.value)}
                  placeholder="e.g. Quiet room away from elevator · Allergic to peanuts · Anniversary celebration — please arrange cake · Early breakfast at 6 AM for airport transfer …"
                  rows={3}
                  maxLength={500}
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm placeholder:text-subtle-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 outline-hidden transition-shadow resize-y min-h-[72px]"
                />
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Flagged to housekeeping, F&amp;B, and concierge on check-in.</span>
                  <span className="tabular">{instructions.length} / 500</span>
                </div>
              </div>
            </div>
          )}

          {step === 7 && (
            <div className="space-y-5">
              <div className="text-center py-4">
                <div className="inline-flex h-16 w-16 rounded-full bg-success-soft text-success items-center justify-center mb-3">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h2 className="text-xl font-semibold">Booking ready to confirm</h2>
                <p className="text-sm text-muted-foreground mt-1">A confirmation number will be assigned on submit.</p>
              </div>

              {/* Final review */}
              <div className="rounded-md border border-border divide-y divide-border">
                <ReviewRow label="Guest" value={selectedGuestDisplay?.name ?? "—"} sub={selectedGuestDisplay?.phone ?? ""} onEdit={() => setStep(1)} />
                <ReviewRow
                  label="Stay"
                  value={`${new Date(checkIn).toLocaleDateString(undefined, { day: "2-digit", month: "short" })} → ${new Date(checkOut).toLocaleDateString(undefined, { day: "2-digit", month: "short" })}`}
                  sub={[
                    `${nights} ${nights === 1 ? "night" : "nights"}`,
                    halfDay ? "Half-day rate" : "12 PM → 11 AM",
                    earlyCheckIn && "Early check-in",
                    lateCheckout && "Late check-out",
                  ].filter(Boolean).join(" · ")}
                  onEdit={() => setStep(2)}
                />
                <ReviewRow label="Room" value={`${ROOMS.find(r => r.id === selectedRoom)?.number ?? "—"} · ${roomType}`} sub={`${adults}A${children ? ` + ${children}C` : ""}`} onEdit={() => setStep(4)} />
                <ReviewRow
                  label="Rate plan"
                  value={`${ratePlan} · ${RATE_PLANS.find(p => p.v === ratePlan)?.hint ?? ""}`}
                  sub={[
                    Object.values(fbAddons).some(c => c > 0) && `+ ${FB_PACKAGES.filter(p => (fbAddons[p.id] ?? 0) > 0).map(p => `${fbAddons[p.id]}× ${p.short}`).join(" · ")}`,
                    breakfast && "Breakfast top-up",
                    extraBed && "Extra bed",
                    airportTransfer && "Airport transfer",
                    lateCheckout && "Late check-out",
                  ].filter(Boolean).join(" · ") || "No extras"}
                  onEdit={() => setStep(5)}
                />
                <ReviewRow label="Payment" value={paymentPct === 0 ? "Pay at hotel" : paymentPct === 100 ? `Full · ${paymentMode}` : `${paymentPct}% advance · ${paymentMode}`} sub={`${money(advance)} now · ${money(total - advance)} balance`} onEdit={() => setStep(6)} />
                {instructions && (
                  <div className="p-3 border-t border-border">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Special instructions</p>
                    <p className="text-sm leading-snug whitespace-pre-wrap">{instructions}</p>
                  </div>
                )}
              </div>

              <div className="rounded-md border border-border p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Send confirmation via</p>
                <div className="flex gap-2 flex-wrap">
                  <ChannelChip icon={Mail} label="Email" active={channels.email} onToggle={() => setChannels(c => ({ ...c, email: !c.email }))} />
                  <ChannelChip icon={MessageCircle} label="WhatsApp" active={channels.whatsapp} onToggle={() => setChannels(c => ({ ...c, whatsapp: !c.whatsapp }))} />
                  <ChannelChip icon={Phone} label="SMS" active={channels.sms} onToggle={() => setChannels(c => ({ ...c, sms: !c.sms }))} />
                </div>
                <p className="text-xs text-muted-foreground">Template: <span className="text-foreground">&ldquo;Booking Confirmation — Premium&rdquo;</span> · <button className="text-brand hover:underline">Preview & edit</button></p>
              </div>
            </div>
          )}
        </Card>

        {/* Live summary */}
        <Card className="p-5 h-fit sticky top-20">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Live summary</p>

          {selectedGuestDisplay ? (
            <div className="mt-3 flex items-center gap-2.5">
              <Avatar name={selectedGuestDisplay.name} size={36} vip={selectedGuestDisplay.vip} />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-medium text-sm truncate">{selectedGuestDisplay.name}</p>
                  {newGuest && <Badge tone="brand">NEW</Badge>}
                </div>
                <p className="text-xs text-muted-foreground truncate">{selectedGuestDisplay.phone}</p>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">No guest selected</p>
          )}

          <dl className="mt-5 space-y-2.5 text-sm">
            <Row k="Check-in" v={new Date(checkIn).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })} />
            <Row k="Check-out" v={new Date(checkOut).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })} />
            <Row k="Nights" v={`${nights}`} />
            <Row k="Pax" v={`${adults}A${children ? ` + ${children}C` : ""}`} />
            <Row k="Room type" v={roomType} />
            {selectedRoom && <Row k="Room" v={ROOMS.find(r => r.id === selectedRoom)?.number ?? ""} />}
            <Row k="Rate plan" v={ratePlan} />
          </dl>

          <div className="border-t border-border my-4" />

          <dl className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setRateBreakdownOpen(o => !o)}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Room subtotal
                {rateBreakdownOpen ? <ChevronLeft className="h-3 w-3 rotate-90" /> : <ChevronRight className="h-3 w-3 rotate-90" />}
              </button>
              <span className="tabular text-sm text-muted-foreground">{money(subtotal)}</span>
            </div>
            {rateBreakdownOpen && !halfDay && (
              <div className="ml-2 pl-2 border-l-2 border-border space-y-1 animate-in">
                {breakdown.lines.map((ln, i) => (
                  <div key={i} className="flex items-center justify-between text-[11px]">
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <span className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        ln.kind === "holiday" ? "bg-warning" : ln.kind === "weekend" ? "bg-accent" : "bg-success"
                      )} />
                      {ln.date.toLocaleDateString(undefined, { day: "2-digit", month: "short", weekday: "short" })}
                      <span className="text-subtle-foreground capitalize">· {ln.kind}</span>
                    </span>
                    <span className="tabular text-muted-foreground">{money(ln.rate)}</span>
                  </div>
                ))}
              </div>
            )}
            {rateBreakdownOpen && halfDay && (
              <p className="ml-2 pl-2 border-l-2 border-border text-[11px] text-muted-foreground animate-in">Half-day rate · 50% of {money(rate)} base</p>
            )}
            {extras > 0 && <Row k="Extras" v={money(extras)} muted />}
            <Row k="Tax (5%)" v={money(tax)} muted />
            <div className="border-t border-border pt-2 mt-2">
              <Row k={<span className="font-semibold">Total</span>} v={<span className="font-semibold tabular text-base">{money(total)}</span>} />
            </div>
            {paymentPct > 0 && (
              <>
                <Row k={`Advance (${paymentPct}%)`} v={<span className="text-brand font-medium">{money(advance)}</span>} />
                <Row k="Balance at checkout" v={money(total - advance)} muted />
              </>
            )}
          </dl>

          <div className="mt-5 flex gap-2">
            <Button variant="outline" disabled={step === 1} onClick={() => setStep(s => s - 1)} className="flex-1">
              <ChevronLeft className="h-4 w-4" />Back
            </Button>
            {step < STEPS.length ? (
              <Button onClick={() => setStep(s => Math.min(STEPS.length, s + 1))} disabled={!canNext()} className="flex-1">
                Next<ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                className="flex-1"
                variant="success"
                disabled={submitting || !selectedGuestDisplay || !selectedRoom}
                onClick={async () => {
                  setSubmitting(true);
                  // Deterministic-ish booking number (no Date.now() to avoid hydration drift if rendered server-side)
                  const seed = (selectedGuestDisplay?.name ?? "X").length * 137 + (selectedRoom?.length ?? 1) * 53 + nights * 7;
                  const bookingNo = `BK${100400 + (seed % 9000)}`;
                  const roomNumber = ROOMS.find(r => r.id === selectedRoom)?.number ?? "";
                  // Persist the booking (and the guest, if a brand-new one was entered).
                  try {
                    if (newGuest && step1Mode === "create") {
                      await apiPost("/guests", {
                        name: selectedGuestDisplay!.name,
                        phone: selectedGuestDisplay!.phone ?? "",
                        email: newGuest.email ?? "",
                        nationality: newGuest.nationality ?? "",
                        idType: newGuest.idType ?? "",
                        idNumber: newGuest.idNumber ?? "",
                      }).catch(() => {});
                    }
                    await apiPost("/bookings", {
                      bookingNo,
                      guestName: selectedGuestDisplay!.name,
                      roomNumber,
                      roomType,
                      source: "Walk-in",
                      checkIn,
                      checkOut,
                      nights,
                      adults,
                      children,
                      paymentStatus: paymentPct === 0 ? "unpaid" : paymentPct === 100 ? "paid" : "partial",
                      ratePlan,
                      total: Math.round(total),
                      advance: Math.round(advance),
                      balance: Math.round(total - advance),
                      vip: false,
                    });
                  } catch {
                    /* show the confirmation anyway; the booking just didn't persist */
                  }
                  setConfirmed({
                    bookingNo,
                    guestName: selectedGuestDisplay!.name,
                    guestPhone: selectedGuestDisplay!.phone,
                    roomNumber: roomNumber || "—",
                    roomType,
                    checkIn,
                    checkOut,
                    nights,
                    pax: `${adults}A${children ? ` + ${children}C` : ""}`,
                    total,
                    advance,
                    balance: total - advance,
                    paymentMode: paymentPct === 0 ? "Pay at hotel" : paymentMode,
                    channels,
                    createdAt: new Date(checkIn).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }),
                  });
                  setSubmitting(false);
                }}
              >
                {submitting ? (
                  <>
                    <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Creating…
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />Confirm booking
                  </>
                )}
              </Button>
            )}
          </div>
        </Card>
      </div>

      {confirmed && (
        <BookingConfirmedModal
          data={confirmed}
          onClose={() => { setConfirmed(null); router.push("/bookings"); }}
          onNewBooking={() => {
            setConfirmed(null);
            setStep(1);
            setGuest(null);
            setNewGuest(null);
            setSelectedRoom(null);
            setSearch("");
          }}
        />
      )}
    </div>
  );
}

function ReviewRow({ label, value, sub, onEdit }: { label: string; value: string; sub?: string; onEdit: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 p-3">
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
        <p className="text-sm font-medium truncate">{value}</p>
        {sub && <p className="text-xs text-muted-foreground truncate">{sub}</p>}
      </div>
      <button onClick={onEdit} className="text-xs text-brand hover:underline shrink-0">Edit</button>
    </div>
  );
}

function ChannelChip({ icon: Icon, label, active, onToggle }: { icon: React.ComponentType<{ className?: string }>; label: string; active: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "inline-flex items-center gap-1.5 h-8 px-3 rounded-full border text-xs font-medium transition-colors",
        active ? "bg-brand-soft border-brand text-brand-soft-foreground" : "border-border text-muted-foreground hover:bg-surface-sunken"
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
      {active && <CheckCircle2 className="h-3 w-3" />}
    </button>
  );
}

function BookingConfirmedModal({
  data,
  onClose,
  onNewBooking,
}: {
  data: NonNullable<React.ComponentProps<typeof Object>> & {
    bookingNo: string;
    guestName: string;
    guestPhone: string;
    roomNumber: string;
    roomType: string;
    checkIn: string;
    checkOut: string;
    nights: number;
    pax: string;
    total: number;
    advance: number;
    balance: number;
    paymentMode: string;
    channels: { email: boolean; whatsapp: boolean; sms: boolean };
    createdAt: string;
  };
  onClose: () => void;
  onNewBooking: () => void;
}) {
  const [copied, setCopied] = React.useState(false);
  const copy = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(data.bookingNo).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      });
    }
  };

  const activeChannels = [
    data.channels.email && "Email",
    data.channels.whatsapp && "WhatsApp",
    data.channels.sms && "SMS",
  ].filter(Boolean) as string[];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <Card className="w-full max-w-lg p-0 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        {/* Hero strip */}
        <div className="relative bg-gradient-to-br from-success/90 to-success p-6 text-white text-center">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 h-8 w-8 rounded-md hover:bg-white/15 inline-flex items-center justify-center text-white/80 hover:text-white"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="inline-flex h-14 w-14 rounded-full bg-white/15 ring-4 ring-white/20 items-center justify-center mb-3">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-display font-semibold">Booking confirmed</h2>
          <button onClick={copy} className="mt-1.5 inline-flex items-center gap-2 px-3 h-7 rounded-full bg-white/15 hover:bg-white/25 text-sm font-mono tabular transition-colors">
            {data.bookingNo}
            <Copy className="h-3 w-3" />
            {copied && <span className="text-[10px]">copied</span>}
          </button>
        </div>

        {/* Summary */}
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-md bg-surface-sunken p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Guest</p>
              <p className="font-medium truncate">{data.guestName}</p>
              <p className="text-xs text-muted-foreground truncate">{data.guestPhone}</p>
            </div>
            <div className="rounded-md bg-surface-sunken p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Room</p>
              <p className="font-medium">{data.roomNumber} · {data.roomType}</p>
              <p className="text-xs text-muted-foreground">{data.pax}</p>
            </div>
            <div className="rounded-md bg-surface-sunken p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Check-in</p>
              <p className="font-medium">{new Date(data.checkIn).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })}</p>
              <p className="text-xs text-muted-foreground">12:00 PM</p>
            </div>
            <div className="rounded-md bg-surface-sunken p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Check-out</p>
              <p className="font-medium">{new Date(data.checkOut).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })}</p>
              <p className="text-xs text-muted-foreground">11:00 AM · {data.nights}N</p>
            </div>
          </div>

          {/* Money */}
          <div className="rounded-md border border-border p-3 space-y-1.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="font-semibold tabular">{money(data.total)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Advance ({data.paymentMode})</span>
              <span className="text-brand font-medium tabular">{money(data.advance)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Balance at checkout</span>
              <span className="text-muted-foreground tabular">{money(data.balance)}</span>
            </div>
          </div>

          {/* Channels */}
          {activeChannels.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Send className="h-3.5 w-3.5 text-success" />
              <span>Confirmation sent via <span className="text-foreground font-medium">{activeChannels.join(" · ")}</span></span>
            </div>
          )}

          {/* Actions */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />Print
            </Button>
            <Link href={`/folio/${data.bookingNo}`}>
              <Button variant="outline" className="w-full">
                <Eye className="h-4 w-4" />View folio
              </Button>
            </Link>
            <Button variant="outline" onClick={onNewBooking}>
              <Plus className="h-4 w-4" />New booking
            </Button>
            <Button onClick={onClose}>
              Done<ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function Row({ k, v, muted }: { k: React.ReactNode; v: React.ReactNode; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className={cn("text-xs", muted ? "text-muted-foreground" : "text-muted-foreground")}>{k}</dt>
      <dd className={cn("tabular text-sm", muted ? "text-muted-foreground" : "text-foreground font-medium")}>{v}</dd>
    </div>
  );
}

function Stepper({ label, value, onChange, min = 0, max = 10 }: { label: string; value: number; onChange: (n: number) => void; min?: number; max?: number }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex items-center border border-border rounded-md h-10">
        <button onClick={() => onChange(Math.max(min, value - 1))} className="h-full w-10 hover:bg-surface-sunken inline-flex items-center justify-center border-r border-border">
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="flex-1 text-center font-medium tabular">{value}</span>
        <button onClick={() => onChange(Math.min(max, value + 1))} className="h-full w-10 hover:bg-surface-sunken inline-flex items-center justify-center border-l border-border">
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function ToggleCard({ label, hint }: { label: string; hint: string }) {
  const [on, setOn] = React.useState(false);
  return (
    <button
      onClick={() => setOn(!on)}
      className={cn(
        "p-3 rounded-md border text-left transition-colors",
        on ? "bg-brand-soft border-brand" : "border-border hover:bg-surface-sunken"
      )}
    >
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>
    </button>
  );
}

function PricedToggleCard({
  label, hint, price, pricePct, checked, onChange,
}: {
  label: string;
  hint: string;
  price?: number;
  pricePct?: string;
  checked: boolean;
  onChange: (b: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "p-3 rounded-md border text-left transition-all relative",
        checked ? "bg-brand-soft border-brand shadow-xs" : "border-border hover:bg-surface-sunken"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{hint}</p>
        </div>
        {checked && <CheckCircle2 className="h-4 w-4 text-brand shrink-0" />}
      </div>
      <div className="mt-2 pt-2 border-t border-border/50">
        <span className={cn(
          "text-[11px] font-semibold tabular",
          pricePct ? "text-success" : "text-foreground"
        )}>
          {price !== undefined && `+ ${money(price)} flat`}
          {pricePct && pricePct}
        </span>
      </div>
    </button>
  );
}

function MealPill({ label, full, on }: { label: string; full: string; on: boolean }) {
  return (
    <span
      title={full}
      className={cn(
        "inline-flex items-center justify-center h-5 w-5 rounded text-[10px] font-bold transition-colors",
        on ? "bg-success text-white" : "bg-surface-sunken text-subtle-foreground"
      )}
    >
      {label}
    </span>
  );
}

function ToggleRow({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (b: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)} className="w-full flex items-center justify-between gap-3 p-3 rounded-md border border-border hover:bg-surface-sunken transition-colors">
      <div className="text-left">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <span className={cn(
        "h-5 w-9 rounded-full relative transition-colors shrink-0",
        checked ? "bg-brand" : "bg-surface-sunken border border-border"
      )}>
        <span className={cn("absolute top-0.5 h-3.5 w-3.5 rounded-full bg-surface shadow-xs transition-transform", checked ? "translate-x-4" : "translate-x-0.5")} />
      </span>
    </button>
  );
}
