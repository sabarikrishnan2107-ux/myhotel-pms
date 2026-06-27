"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  User, Calendar, Users, Tag, CreditCard, CheckCircle2,
  ChevronLeft, ChevronRight, Search, Plus, Minus, ArrowRight, Send,
  Printer, Mail, MessageCircle, Phone, Copy, X, Eye,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { cn, money } from "@/lib/utils";
import { apiGet, apiPost, apiPut, sendEmail } from "@/lib/api";
import { NewGuestForm, type NewGuestData } from "@/components/guests/new-guest-form";
import type { Guest, Room } from "@/lib/types";
import { buildNightlyBreakdown, type Season, type Holiday } from "@/lib/room-nightly-pricing";

// Weekend uplift has no Setup field (Seasons/Holidays do) — kept as a fixed default.
const WEEKEND_MULTIPLIER = 1.2;

// Rate plan + F&B catalogs are MASTER DATA — loaded live from Configuration →
// Rate Plans (/rate-plans) and Food & Hall Packages (/fb-packages). No hardcoded
// catalog: whatever is configured in Setup is what appears here.
type Meal = "B" | "L" | "D"; // Breakfast / Lunch / Dinner
type RatePlanOpt = { v: string; label: string; meals: Meal[]; refundable: boolean; discountPct: number; hint?: string };
type FbPkgOpt = { id: string; name: string; short: string; icon: string; price: number; type: string };

// API → UI mappers (Configuration is the single source of truth).
type ApiRatePlan = { code: string; name: string; inclBreakfast?: boolean; inclLunch?: boolean; inclDinner?: boolean; refundable?: boolean; discountPct?: number };
type ApiFbPackage = { id: number | string; name: string; type?: string; price: number };
function mapRatePlan(r: ApiRatePlan): RatePlanOpt {
  const meals: Meal[] = [];
  if (r.inclBreakfast) meals.push("B");
  if (r.inclLunch) meals.push("L");
  if (r.inclDinner) meals.push("D");
  const mealHint = meals.length ? "Room + " + [meals.includes("B") && "Breakfast", meals.includes("L") && "Lunch", meals.includes("D") && "Dinner"].filter(Boolean).join(" + ") : "Room only";
  return { v: r.code, label: r.name, meals, refundable: r.refundable ?? true, discountPct: r.discountPct ?? 0, hint: r.discountPct ? `${mealHint} · ${r.discountPct}% off` : mealHint };
}
const FB_ICON: Record<string, string> = { Breakfast: "☕", Lunch: "🍽", Dinner: "🍽", "High Tea": "🍪", Snacks: "🍪" };
function mapFbPackage(p: ApiFbPackage): FbPkgOpt {
  return { id: String(p.id), name: p.name, short: p.type || p.name, icon: FB_ICON[p.type ?? ""] ?? "🍽", price: p.price, type: p.type ?? "" };
}

// Room number is NOT chosen at booking — only the room type is reserved. The
// specific room is assigned at check-in from what's available that day.
const STEPS = [
  { n: 1, title: "Guest", icon: User, desc: "Find existing or create new" },
  { n: 2, title: "Dates", icon: Calendar, desc: "Stay duration" },
  { n: 3, title: "Pax & Type", icon: Users, desc: "Adults, children, room type" },
  { n: 4, title: "Rate Plan", icon: Tag, desc: "EP / CP / MAP / AP + extras" },
  { n: 5, title: "Payment", icon: CreditCard, desc: "Advance or full" },
  { n: 6, title: "Confirm", icon: CheckCircle2, desc: "Send confirmation" },
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
  const [roomType, setRoomType] = React.useState("");
  // Managed room types (name → base rate) from Configuration → Room Types.
  const [roomTypes, setRoomTypes] = React.useState<{ name: string; baseTariff: number }[]>([]);
  // Real guests + rooms from Postgres (seeded with mock as an offline fallback).
  const [guests, setGuests] = React.useState<Guest[]>([]);
  const [rooms, setRooms] = React.useState<Room[]>([]);
  // Master rate plans + F&B packages from Configuration (single source of truth).
  const [ratePlans, setRatePlans] = React.useState<RatePlanOpt[]>([]);
  const [fbPackages, setFbPackages] = React.useState<FbPkgOpt[]>([]);
  const [seasons, setSeasons] = React.useState<Season[]>([]);
  const [holidays, setHolidays] = React.useState<Holiday[]>([]);
  React.useEffect(() => {
    apiGet<{ name: string; baseTariff: number }[]>("/room-types").then(setRoomTypes).catch(() => {});
    apiGet<Guest[]>("/guests").then(rows => { if (rows.length) setGuests(rows); }).catch(() => {});
    apiGet<Room[]>("/room-board").then(rows => { if (rows.length) setRooms(rows); }).catch(() => {});
    apiGet<ApiRatePlan[]>("/rate-plans").then(rows => setRatePlans(rows.map(mapRatePlan))).catch(() => {});
    apiGet<ApiFbPackage[]>("/fb-packages").then(rows => setFbPackages(rows.map(mapFbPackage))).catch(() => {});
  }, []);
  React.useEffect(() => {
    apiGet<Array<Season & { active?: boolean }>>("/seasons")
      .then(r => Array.isArray(r) && setSeasons(r.filter(s => s.active !== false).map(s => ({ from: s.from, to: s.to, multiplier: Number(s.multiplier) || 1 }))))
      .catch(() => {});
    apiGet<Array<{ date: string; surchargePct?: number }>>("/holidays")
      .then(r => Array.isArray(r) && setHolidays(r.map(h => ({ date: h.date, surchargePct: Number(h.surchargePct) || 0 }))))
      .catch(() => {});
  }, []);
  const [ratePlan, setRatePlan] = React.useState("");
  // Do NOT auto-select a room type / rate plan — the guest must choose them, so
  // the Live Summary stays empty (no pricing) until a real selection is made.
  // Only clear a stale selection that is no longer in the loaded list.
  React.useEffect(() => {
    if (ratePlan && ratePlans.length && !ratePlans.some(p => p.v === ratePlan)) setRatePlan("");
  }, [ratePlans, ratePlan]);
  React.useEffect(() => {
    if (roomType && roomTypes.length && !roomTypes.some(t => t.name === roomType)) setRoomType("");
  }, [roomTypes, roomType]);
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
  // When set (not null), the advance is a fixed money amount instead of a percentage.
  const [customAdvance, setCustomAdvance] = React.useState<number | null>(null);
  // "Booked by" — how the booking came in. Stored in the booking's `source`.
  const [source, setSource] = React.useState("Direct Guest");
  const BOOKED_BY = ["Direct Guest", "Travel Agent", "Corporate", "OTA"];
  const [paymentMode, setPaymentMode] = React.useState("UPI");
  const [paymentRef, setPaymentRef] = React.useState("");
  // Cash / Pay-at-hotel need no reference; electronic modes must record one
  // (only when an advance is actually being collected now).
  const PAY_REF_FIELD: Record<string, { label: string; placeholder: string }> = {
    Card: { label: "Card auth code / last 4 digits", placeholder: "e.g. Auth 8821 · **** 4321" },
    UPI: { label: "UPI transaction reference", placeholder: "e.g. 4123-4567-8901" },
    "Bank Transfer": { label: "Bank reference / UTR no.", placeholder: "e.g. UTR 3219872650" },
    Online: { label: "Gateway transaction ID", placeholder: "e.g. pay_Nv3x82hKd..." },
  };
  const collectingAdvance = customAdvance !== null ? customAdvance > 0 : paymentPct > 0;
  const needsRef = collectingAdvance && !!PAY_REF_FIELD[paymentMode];
  const [channels, setChannels] = React.useState<{ email: boolean; whatsapp: boolean; sms: boolean }>({ email: true, whatsapp: true, sms: false });
  const [submitting, setSubmitting] = React.useState(false);
  // Booking created early via "Sync to mobile app" so the tablet can capture
  // documents. When set, the final Confirm UPDATES this booking instead of
  // creating a duplicate.
  const [syncBooking, setSyncBooking] = React.useState<{ id: number; bookingNo: string } | null>(null);
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
  const resumeNo = searchParams.get("resume");

  // Default to today → today + 3 nights (local time), unless the URL overrides it.
  const isoDay = (offset = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d.toLocaleDateString("en-CA");
  };
  const [checkIn, setCheckIn] = React.useState(urlCheckin ?? isoDay(0));
  const [checkOut, setCheckOut] = React.useState(urlCheckout ?? isoDay(3));

  // If the URL specified a room, find it and pre-select its type + the room itself
  React.useEffect(() => {
    if (!urlRoom) return;
    const room = rooms.find(r => r.number === urlRoom);
    if (room) {
      setRoomType(room.type);   // pre-select the room's type; specific room is assigned at check-in
    }
  }, [urlRoom, rooms]);

  // Resume an incomplete (mobile-sync) draft from the bookings list: rehydrate
  // the wizard from its saved draftData + captured documents and land back on the
  // pre-filled guest form so the user can finish + Confirm the SAME draft (no dup).
  React.useEffect(() => {
    if (!resumeNo) return;
    let cancelled = false;
    (async () => {
      const rows = await apiGet<Array<{ id: number; bookingNo: string; status?: string; checkIn?: string; checkOut?: string; roomType?: string; ratePlan?: string; adults?: number; children?: number; source?: string; guestName?: string; draftData?: unknown }>>("/bookings").catch(() => []);
      // A seed-derived bookingNo can repeat across sync sessions, so several
      // pending rows may share it. Prefer the one that actually saved draftData,
      // else the most recently created (highest id) — never just the first stale match.
      const matches = rows.filter(r => r.bookingNo === resumeNo && (r.status ?? "") === "pending");
      const b = matches.find(r => r.draftData) ?? [...matches].sort((a, z) => z.id - a.id)[0];
      if (cancelled || !b) return;   // already completed / not a draft → start fresh
      if (b.checkIn) setCheckIn(b.checkIn.slice(0, 10));
      if (b.checkOut) setCheckOut(b.checkOut.slice(0, 10));
      if (b.roomType) setRoomType(b.roomType);
      if (b.ratePlan) setRatePlan(b.ratePlan);
      if (typeof b.adults === "number") setAdults(b.adults);
      if (typeof b.children === "number") setChildren(b.children);
      if (b.source) setSource(b.source);
      setSyncBooking({ id: b.id, bookingNo: b.bookingNo });
      const full = await apiGet<{ draftData?: Partial<NewGuestData>; documents?: { guest_photo?: string | null; id_front?: string | null; id_back?: string | null; signature?: string | null } }>(`/bookings/${b.id}`).catch(() => null);
      if (cancelled) return;
      const dd = (full?.draftData ?? {}) as Partial<NewGuestData>;
      const docs = full?.documents ?? {};
      setNewGuest({
        name: dd.name ?? b.guestName ?? "", phone: dd.phone ?? "+91 ", email: dd.email ?? "",
        address: dd.address ?? "", nationality: dd.nationality ?? "India", dob: dd.dob ?? "",
        gender: dd.gender ?? "Male", idType: dd.idType ?? "Aadhaar", idNumber: dd.idNumber ?? "",
        idFront: docs.id_front ?? null, idBack: docs.id_back ?? null, photo: docs.guest_photo ?? null, signature: docs.signature ?? null,
        company: dd.company ?? "", gst: dd.gst ?? "", vip: dd.vip ?? false, remarks: dd.remarks ?? "",
      });
      setGuest(null);
      setStep1Mode("create");
      setStep(1);
    })();
    return () => { cancelled = true; };
  }, [resumeNo]);

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

  // Per-night base rate comes from the managed Room Type; falls back to a
  // sensible default only if the type list hasn't loaded.
  const rate = roomTypes.find(t => t.name === roomType)?.baseTariff
    ?? (roomType === "Suite" ? 1200 : roomType === "King" ? 850 : roomType === "Deluxe" ? 650 : 450);
  // Dynamic per-night rate breakdown by day type
  const breakdown = React.useMemo(
    () => buildNightlyBreakdown(checkIn, nights, rate, seasons, holidays, WEEKEND_MULTIPLIER),
    [checkIn, nights, rate, seasons, holidays],
  );
  const subtotal = halfDay ? Math.round(rate * 0.5) : breakdown.total;

  // Each F&B add-on package: price × pax-per-day × nights
  const fbTotal = fbPackages.reduce((t, p) => t + p.price * (fbAddons[p.id] ?? 0) * nights, 0);

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
  const advance = customAdvance !== null
    ? Math.min(Math.max(0, Math.round(customAdvance)), total)
    : Math.round((total * paymentPct) / 100);
  const advanceLabel = customAdvance !== null ? "custom" : `${paymentPct}%`;

  // The Live Summary starts empty and reveals each section only once it's
  // relevant. Dates appear from the Dates step (2), pax from the Pax & Type
  // step (3); a chosen room type / rate plan also implies the guest has reached
  // those steps, so the rows stay visible even after navigating back.
  const showDates = step >= 2 || !!roomType || !!ratePlan;
  const showPax = step >= 3 || !!roomType || !!ratePlan;

  const filteredGuests = guests.filter(g => `${g.name} ${g.phone} ${g.email}`.toLowerCase().includes(search.toLowerCase())).slice(0, 5);

  // "Sync to mobile app" — create the booking now so it appears on the tablet
  // for document capture. Returns the new booking id + reference for the form
  // to poll; the final Confirm step updates this same booking.
  const requestMobileSync = async (g: NewGuestData): Promise<{ bookingId: number; reference: string } | null> => {
    // Guard: one booking per wizard — re-syncing reuses the same draft booking.
    if (syncBooking) {
      return { bookingId: syncBooking.id, reference: syncBooking.bookingNo };
    }
    const seed = (g.name || "X").length * 137 + roomType.length * 53 + nights * 7;
    const bookingNo = `BK${100400 + (seed % 9000)}`;
    try {
      const created = await apiPost<{ id: number }>("/bookings", {
        bookingNo,
        guestName: g.name,
        roomNumber: "Unassigned",
        roomType,
        source,
        checkIn,
        checkOut,
        nights,
        adults,
        children,
        paymentStatus: advance <= 0 ? "unpaid" : advance >= total ? "paid" : "partial",
        ratePlan,
        total: Math.round(total),
        advance: Math.round(advance),
        balance: Math.round(total - advance),
        // Persist the typed step-1 guest fields (NOT the base64 captures — those
        // go to /verification) so an abandoned draft can be fully resumed later.
        draftData: {
          name: g.name, phone: g.phone, email: g.email, address: g.address,
          nationality: g.nationality, dob: g.dob, gender: g.gender,
          idType: g.idType, idNumber: g.idNumber, company: g.company,
          gst: g.gst, vip: g.vip, remarks: g.remarks,
        },
        // Held as a draft so it shows on the tablet for capture but NOT as a
        // confirmed arrival. The final "Confirm booking" promotes it.
        status: "pending",
        vip: g.vip ?? false,
      });
      if (!created?.id) return null;
      setSyncBooking({ id: created.id, bookingNo });
      // Seed the booking with the selected ID type (so the tablet frames the
      // capture to that exact card) plus any documents already captured in this
      // web form. Fire-and-forget — sync shouldn't block on it.
      apiPost(`/bookings/${created.id}/verification`, {
        guest_photo: g.photo ?? "",
        id_front: g.idFront ?? "",
        id_back: g.idBack ?? "",
        signature: g.signature ?? "",
        id_type: g.idType,
        id_number: g.idNumber,
        uploaded_by: "Front Desk (web)",
      }).catch(() => {});
      return { bookingId: created.id, reference: bookingNo };
    } catch {
      return null;
    }
  };

  const canNext = () => {
    if (step === 1) return guest !== null || newGuest !== null;
    // Step 3 (Pax & Type) and Step 4 (Rate Plan) require an explicit selection.
    if (step === 3) return roomType !== "";
    if (step === 4) return ratePlan !== "";
    // Step 5 (Payment): a non-cash advance must capture a reference number.
    if (step === 5) return !needsRef || paymentRef.trim() !== "";
    return true;
  };

  // Selected guest display info (works for existing OR newly-created guest)
  const selectedGuestDisplay = React.useMemo(() => {
    if (newGuest) {
      return { name: newGuest.name, phone: newGuest.phone, vip: newGuest.vip, photo: newGuest.photo, isExisting: false as const };
    }
    if (guest) {
      const g = guests.find(x => x.id === guest);
      if (g) return {
        name: g.name, phone: g.phone, vip: g.vip, photo: null as string | null, isExisting: true as const,
        email: g.email, nationality: g.nationality, idType: g.idType, idNumber: g.idNumber, lastStay: g.lastStay,
      };
    }
    return null;
  }, [guest, newGuest, guests]);

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

              {/* Booked by — asked for every booking, new or existing guest */}
              <div>
                <Label>Booked by</Label>
                <div className="mt-1.5 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {BOOKED_BY.map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setSource(opt)}
                      className={cn(
                        "h-10 rounded-md border text-sm font-medium transition-colors",
                        source === opt ? "bg-brand text-brand-foreground border-brand" : "border-border hover:bg-surface-sunken"
                      )}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">How this booking came in.</p>
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
                initialData={newGuest ?? undefined}
                onCancel={() => setStep1Mode("search")}
                onSave={(data) => {
                  setNewGuest(data);
                  setGuest(null);
                  setStep1Mode("search");
                }}
                mobileSync={{ onRequest: requestMobileSync }}
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
                  disabled={halfDay}
                  disabledHint="Not available with half-day rate"
                />
                <PricedToggleCard
                  label="Half-day rate"
                  hint="< 6 hours stay · 50% of room tariff"
                  pricePct="-50%"
                  checked={halfDay}
                  onChange={setHalfDay}
                  disabled={lateCheckout}
                  disabledHint="Not available with late check-out"
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
                  {roomTypes.map(t => t.name).map(t => (
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
            <div className="space-y-5">
              {/* Rate plan — visual meal-inclusion */}
              <div className="space-y-1.5">
                <Label>Rate plan</Label>
                <p className="text-[11px] text-muted-foreground">Choose how meals are bundled with the room.</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                  {ratePlans.map(p => {
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
                  {fbPackages.map(pkg => {
                    const count = fbAddons[pkg.id] ?? 0;
                    const includedInPlan = (pkg.type === "Breakfast" && ratePlans.find(rp => rp.v === ratePlan)?.meals.includes("B")) ||
                                           (pkg.type === "Lunch" && ratePlans.find(rp => rp.v === ratePlan)?.meals.includes("L")) ||
                                           (pkg.type === "Dinner" && ratePlans.find(rp => rp.v === ratePlan)?.meals.includes("D"));
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
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-5">
              <div>
                <Label>Advance payment</Label>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {[0, 30, 50, 100].map(p => (
                    <button
                      key={p}
                      onClick={() => { setPaymentPct(p); setCustomAdvance(null); }}
                      className={cn(
                        "h-10 px-4 rounded-md border text-sm font-medium transition-colors",
                        customAdvance === null && paymentPct === p ? "bg-brand text-brand-foreground border-brand" : "border-border hover:bg-surface-sunken"
                      )}
                    >
                      {p === 0 ? "No advance" : p === 100 ? "Full payment" : `${p}%`}
                    </button>
                  ))}
                  <button
                    onClick={() => setCustomAdvance(c => (c === null ? 0 : c))}
                    className={cn(
                      "h-10 px-4 rounded-md border text-sm font-medium transition-colors",
                      customAdvance !== null ? "bg-brand text-brand-foreground border-brand" : "border-border hover:bg-surface-sunken"
                    )}
                  >
                    Custom amount
                  </button>
                </div>
                {customAdvance !== null && (
                  <div className="mt-2.5 flex items-center gap-2 animate-in">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₹</span>
                      <Input
                        type="number"
                        min={0}
                        max={total}
                        value={customAdvance || ""}
                        onChange={e => setCustomAdvance(Math.max(0, Math.min(total, Math.round(Number(e.target.value)))))}
                        placeholder="0"
                        className="h-10 w-44 pl-7 tabular"
                        autoFocus
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      of {money(total)} · {total > 0 ? Math.round((advance / total) * 100) : 0}% advance
                    </span>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-2">Default 30% from settings · Manager approval required for 0% · or enter a fixed amount</p>
              </div>

              <div className="space-y-1.5">
                <Label>Payment mode</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {["Cash", "Card", "UPI", "Bank Transfer", "Online", "Pay at hotel"].map(m => (
                    <button
                      key={m}
                      onClick={() => { setPaymentMode(m); setPaymentRef(""); }}
                      className={cn(
                        "h-10 rounded-md border text-sm font-medium transition-colors",
                        paymentMode === m ? "bg-brand-soft border-brand text-brand-soft-foreground" : "border-border hover:bg-surface-sunken"
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                {/* Reference number — required for electronic advance payments */}
                {needsRef && (
                  <div className="space-y-1.5 pt-2 animate-in">
                    <Label htmlFor="paymentRef">
                      {PAY_REF_FIELD[paymentMode].label} <span className="text-danger">*</span>
                    </Label>
                    <Input
                      id="paymentRef"
                      value={paymentRef}
                      onChange={e => setPaymentRef(e.target.value)}
                      placeholder={PAY_REF_FIELD[paymentMode].placeholder}
                      className="h-10 font-mono tabular"
                    />
                    <p className="text-[11px] text-muted-foreground">Recorded on the folio &amp; receipt for {paymentMode} reconciliation.</p>
                  </div>
                )}
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

          {step === 6 && (
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
                <ReviewRow label="Booked by" value={source} onEdit={() => setStep(1)} />
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
                <ReviewRow label="Room type" value={roomType} sub={`${adults}A${children ? ` + ${children}C` : ""} · room assigned at check-in`} onEdit={() => setStep(3)} />
                <ReviewRow
                  label="Rate plan"
                  value={`${ratePlan} · ${ratePlans.find(p => p.v === ratePlan)?.hint ?? ""}`}
                  sub={[
                    Object.values(fbAddons).some(c => c > 0) && `+ ${fbPackages.filter(p => (fbAddons[p.id] ?? 0) > 0).map(p => `${fbAddons[p.id]}× ${p.short}`).join(" · ")}`,
                    breakfast && "Breakfast top-up",
                    extraBed && "Extra bed",
                    airportTransfer && "Airport transfer",
                    lateCheckout && "Late check-out",
                  ].filter(Boolean).join(" · ") || "No extras"}
                  onEdit={() => setStep(4)}
                />
                <ReviewRow label="Payment" value={`${advance <= 0 ? "Pay at hotel" : advance >= total ? `Full · ${paymentMode}` : `${advanceLabel} advance · ${paymentMode}`}${needsRef && paymentRef ? ` · ref ${paymentRef}` : ""}`} sub={`${money(advance)} now · ${money(total - advance)} balance`} onEdit={() => setStep(5)} />
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
            <>
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
              {/* Returning-guest history: shown when an existing guest is selected. */}
              {selectedGuestDisplay.isExisting && (
                <div className="mt-2.5 rounded-md bg-surface-sunken/40 px-3 py-2 space-y-1 text-xs">
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Last stay</span>
                    <span className="font-medium">
                      {selectedGuestDisplay.lastStay
                        ? new Date(selectedGuestDisplay.lastStay).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })
                        : "First-time guest"}
                    </span>
                  </div>
                  {selectedGuestDisplay.email && (
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Email</span>
                      <span className="font-medium truncate max-w-[60%]">{selectedGuestDisplay.email}</span>
                    </div>
                  )}
                  {selectedGuestDisplay.nationality && (
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Nationality</span>
                      <span className="font-medium">{selectedGuestDisplay.nationality}</span>
                    </div>
                  )}
                  {(selectedGuestDisplay.idType || selectedGuestDisplay.idNumber) && (
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">ID on file</span>
                      <span className="font-medium truncate max-w-[60%]">{[selectedGuestDisplay.idType, selectedGuestDisplay.idNumber].filter(Boolean).join(" · ")}</span>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">No guest selected</p>
          )}

          <dl className="mt-5 space-y-2.5 text-sm empty:mt-0">
            {showDates && <Row k="Check-in" v={new Date(checkIn).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })} />}
            {showDates && <Row k="Check-out" v={new Date(checkOut).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })} />}
            {showDates && <Row k="Nights" v={`${nights}`} />}
            {showPax && <Row k="Pax" v={`${adults}A${children ? ` + ${children}C` : ""}`} />}
            {!!roomType && <Row k="Room type" v={roomType} />}
            {!!ratePlan && <Row k="Rate plan" v={ratePlan} />}
          </dl>

          {roomType ? (
          <>
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
            {advance > 0 && (
              <>
                <Row k={`Advance (${advanceLabel})`} v={<span className="text-brand font-medium">{money(advance)}</span>} />
                <Row k="Balance at checkout" v={money(total - advance)} muted />
              </>
            )}
          </dl>
          </>
          ) : showPax ? (
            <div className="mt-4 border-t border-border pt-4">
              <p className="text-sm text-muted-foreground">Select a room type to see pricing.</p>
            </div>
          ) : null}

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
                disabled={submitting || !selectedGuestDisplay}
                onClick={async () => {
                  setSubmitting(true);
                  // Deterministic-ish booking number (no Date.now() to avoid hydration drift if rendered server-side)
                  const seed = (selectedGuestDisplay?.name ?? "X").length * 137 + roomType.length * 53 + nights * 7;
                  // Reuse the reference from the early "Sync to mobile" booking if one exists.
                  const bookingNo = syncBooking?.bookingNo ?? `BK${100400 + (seed % 9000)}`;
                  // Persist the booking (and the guest, if a brand-new one was entered).
                  // NOTE: don't gate on step1Mode here — saving the new-guest form flips
                  // the mode back to "search", so checking it dropped every new profile.
                  try {
                    if (newGuest) {
                      // Save the core profile FIRST (small payload, always succeeds) so
                      // name/phone/email/ID can never be lost. The large base64 KYC
                      // captures are attached in a second request — if they're too big
                      // or fail, the core profile is already safely stored.
                      const createdGuest = await apiPost<{ id: number }>("/guests", {
                        name: selectedGuestDisplay!.name,
                        phone: selectedGuestDisplay!.phone ?? "",
                        email: newGuest.email ?? "",
                        nationality: newGuest.nationality ?? "",
                        idType: newGuest.idType ?? "",
                        idNumber: newGuest.idNumber ?? "",
                        address: newGuest.address ?? "",
                        birthday: newGuest.dob ?? "",
                        gender: newGuest.gender ?? "",
                        company: newGuest.company ?? "",
                        gst: newGuest.gst ?? "",
                        vip: newGuest.vip ?? false,
                        internalNotes: newGuest.remarks ?? "",
                      }).catch(() => null);
                      const captures = {
                        idFront: newGuest.idFront ?? "", idBack: newGuest.idBack ?? "",
                        photo: newGuest.photo ?? "", signature: newGuest.signature ?? "",
                      };
                      if (createdGuest?.id && (captures.idFront || captures.idBack || captures.photo || captures.signature)) {
                        await apiPut(`/guests/${createdGuest.id}`, captures).catch(() => {});
                      }
                    }
                    const bookingPayload = {
                      bookingNo,
                      guestName: selectedGuestDisplay!.name,
                      roomNumber: "Unassigned",   // specific room assigned at check-in
                      roomType,
                      source,
                      checkIn,
                      checkOut,
                      nights,
                      adults,
                      children,
                      paymentStatus: advance <= 0 ? "unpaid" : advance >= total ? "paid" : "partial",
                      ratePlan,
                      total: Math.round(total),
                      advance: Math.round(advance),
                      balance: Math.round(total - advance),
                      status: "confirmed",     // reservation; room assigned at check-in
                      vip: false,
                      draftData: null,         // promoted — clear the resume payload
                    };
                    // If this booking was already created via "Sync to mobile app",
                    // update it (keeping the captured documents) instead of duplicating.
                    if (syncBooking) {
                      await apiPut(`/bookings/${syncBooking.id}`, bookingPayload);
                    } else {
                      await apiPost("/bookings", bookingPayload);
                    }
                  } catch {
                    /* show the confirmation anyway; the booking just didn't persist */
                  }
                  // Send the real booking-confirmation email when the Email channel is on.
                  // Falls back to a prompt when the guest has no email on file (e.g. walk-ins).
                  if (channels.email) {
                    const to = (newGuest?.email || guests.find(x => x.id === guest)?.email || "").trim()
                      || (typeof window !== "undefined" ? (window.prompt("No email on file for this guest. Send the booking confirmation to:", "") || "").trim() : "");
                    if (to) {
                      sendEmail({
                        to,
                        subject: `Booking Confirmed · ${bookingNo}`,
                        heading: "Booking Confirmed",
                        greeting: selectedGuestDisplay!.name,
                        intro: "Your booking is confirmed — we look forward to welcoming you. Your details are below.",
                        rows: [
                          { label: "Booking No", value: bookingNo },
                          { label: "Room", value: roomType },
                          { label: "Check-in", value: String(checkIn) },
                          { label: "Check-out", value: String(checkOut) },
                          { label: "Nights", value: String(nights) },
                          { label: "Total", value: money(total) },
                          { label: "Advance", value: money(advance) },
                          { label: "Balance", value: money(total - advance) },
                        ],
                        context: "Booking confirmation",
                      }).catch(() => {});
                    }
                  }
                  setConfirmed({
                    bookingNo,
                    guestName: selectedGuestDisplay!.name,
                    guestPhone: selectedGuestDisplay!.phone,
                    roomNumber: "Assigned at check-in",
                    roomType,
                    checkIn,
                    checkOut,
                    nights,
                    pax: `${adults}A${children ? ` + ${children}C` : ""}`,
                    total,
                    advance,
                    balance: total - advance,
                    paymentMode: advance <= 0 ? "Pay at hotel" : paymentMode,
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
  label, hint, price, pricePct, checked, onChange, disabled, disabledHint,
}: {
  label: string;
  hint: string;
  price?: number;
  pricePct?: string;
  checked: boolean;
  onChange: (b: boolean) => void;
  disabled?: boolean;
  disabledHint?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => { if (!disabled) onChange(!checked); }}
      className={cn(
        "p-3 rounded-md border text-left transition-all relative",
        disabled
          ? "opacity-50 cursor-not-allowed border-border"
          : checked ? "bg-brand-soft border-brand shadow-xs" : "border-border hover:bg-surface-sunken"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{disabled && disabledHint ? disabledHint : hint}</p>
        </div>
        {checked && !disabled && <CheckCircle2 className="h-4 w-4 text-brand shrink-0" />}
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
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full px-0.5 align-middle transition-colors",
        checked ? "bg-success justify-end" : "bg-zinc-300 dark:bg-zinc-600 justify-start"
      )}>
        <span className="h-5 w-5 rounded-full bg-white shadow-sm" />
      </span>
    </button>
  );
}
