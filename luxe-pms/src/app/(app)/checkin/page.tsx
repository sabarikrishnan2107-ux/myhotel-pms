"use client";
import * as React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  LogIn, Search, LayoutGrid, List, Filter, Calendar, Users, BedDouble,
  CreditCard, IdCard, Sparkles, ChevronRight, Crown, Camera, Send, Zap,
  Phone, Mail, Hash, User, X, Eye, CheckCircle2, KeyRound, MessageCircle,
  ChevronLeft, Printer, AlertCircle, Upload, FileCheck2, ScanLine, Pen,
  Plus, BedDouble as BedIcon, Globe, ChevronsRight, Minus,
  Smartphone, UtensilsCrossed,
  CalendarPlus, Download, FileText,
} from "lucide-react";
import { Label } from "@/components/ui/input";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Badge, PaymentBadge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { KPICard } from "@/components/ui/kpi-card";
import { GuestDetailDrawer } from "@/components/guests/guest-detail-drawer";
import { PhotoCapture } from "@/components/guests/photo-capture";
import { NewGuestForm, type NewGuestData } from "@/components/guests/new-guest-form";
import { SignaturePad } from "@/components/guests/signature-pad";
import { MobileSyncDialog } from "@/components/guests/mobile-sync-dialog";
import { buildWalkInSyncBooking } from "@/lib/walkin-sync";
import { saveNewGuest } from "@/lib/guest-profile";
import { useGuests, useRooms } from "@/lib/use-directory";
import type { Reservation, PaymentStatus, BookingSource, Guest } from "@/lib/types";
import { cn, money, formatTime } from "@/lib/utils";
import { mealPerNightPerGuest } from "@/lib/booking-pricing";
import { apiGet, apiPut, apiPost, sendEmail } from "@/lib/api";
import { useProperty, hotelName } from "@/lib/use-property";
import { PhoneInput } from "@/components/ui/phone-input";
import { isValidPhone } from "@/lib/phone";
import { EmailInput } from "@/components/ui/email-input";
import { isValidEmail } from "@/lib/email";
import { buildNightlyBreakdown, type Season, type Holiday } from "@/lib/room-nightly-pricing";
import { extraOccupancyCharge } from "@/lib/booking-pricing";

// Weekend uplift has no Setup field (Seasons/Holidays do) — kept as a fixed default.
const WEEKEND_MULTIPLIER = 1.2;

// DOB picker bounds — guest must be 18+ and not absurdly old. Setting `max` to
// 18 years ago also makes the calendar open on that month (not today), matching
// the booking guest form.
const MIN_GUEST_AGE = 18;
const MAX_GUEST_AGE = 110;
function isoDateNYearsAgo(years: number) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return d.toISOString().slice(0, 10);
}
const DOB_MAX = isoDateNYearsAgo(MIN_GUEST_AGE);
const DOB_MIN = isoDateNYearsAgo(MAX_GUEST_AGE);

// Money collected at the check-in payment step (amount in ₹, plus mode/reference).
type CheckInPayment = { amount: number; mode: string; reference: string };

// Pre-fill payload for resuming an incomplete (synced-but-unsubmitted) walk-in draft.
type WalkInResume = {
  bookingId: number;
  bookingNo: string;
  name?: string; phone?: string; email?: string; nationality?: string;
  checkInDate?: string; nights?: number; adults?: number; children?: number;
  roomType?: string; ratePlan?: string;
  docs?: { guest_photo?: string | null; id_front?: string | null; id_back?: string | null; signature?: string | null };
};

// Mark a booking checked-in in Postgres (looked up by its bookingNo) and, when a
// payment was collected at the desk, record it on the folio and roll the
// booking's advance / balance / paymentStatus forward — same flow checkout uses,
// so the collected money is actually reflected at checkout instead of "unpaid".
async function persistCheckIn(reservation: Reservation, roomNumber?: string, payment?: CheckInPayment) {
  const bookingNo = reservation.bookingNo;
  const collected = payment && payment.amount > 0 ? payment.amount : 0;
  const today = new Date().toISOString().slice(0, 10);
  try {
    const list = await apiGet<{ id: number; bookingNo: string; advance?: number; balance?: number }[]>("/bookings");
    const bk = list.find(b => b.bookingNo === bookingNo);

    if (!bk) {
      // A fresh walk-in has no booking row yet (it lived only in memory). Persist it
      // as a checked-in booking so the room is recorded as occupied — otherwise a
      // later walk-in for overlapping dates would still offer the same room. Other
      // sources always already have a booking, so only create for walk-ins.
      if (reservation.source !== "Walk-in") return;
      const advance = (reservation.advance ?? 0) + collected;
      const balance = Math.max(0, (reservation.total ?? 0) - advance);
      await apiPost("/bookings", {
        bookingNo,
        guestName: reservation.guestName,
        roomNumber: roomNumber || reservation.roomNumber,
        roomType: reservation.roomType,
        source: reservation.source ?? "Walk-in",
        checkIn: reservation.checkIn,
        checkOut: reservation.checkOut,
        nights: reservation.nights,
        adults: reservation.adults,
        children: reservation.children,
        ratePlan: reservation.ratePlan,
        total: reservation.total,
        advance,
        balance,
        paymentStatus: balance === 0 ? "paid" : advance > 0 ? "partial" : "unpaid",
        status: "checked-in",
      });
      if (collected > 0) {
        await apiPost("/folio-payments", { bookingNo, date: today, mode: payment!.mode, reference: payment!.reference.trim() || null, amount: collected });
      }
      return;
    }

    const patch: Record<string, string | number> = { status: "checked-in" };
    if (roomNumber) patch.roomNumber = roomNumber;   // write the room assigned at check-in

    if (collected > 0) {
      const newAdvance = (bk.advance ?? 0) + collected;
      const newBalance = Math.max(0, (bk.balance ?? 0) - collected);
      patch.advance = newAdvance;
      patch.balance = newBalance;
      patch.paymentStatus = newBalance === 0 ? "paid" : "partial";
      // Record the actual payment line on the folio (mode + reference for reconciliation).
      await apiPost("/folio-payments", { bookingNo, date: today, mode: payment!.mode, reference: payment!.reference.trim() || null, amount: collected });
    }

    await apiPut(`/bookings/${bk.id}`, patch);
  } catch { /* offline — UI still reflects the check-in locally */ }
}

// Guest-profile patch saved at check-in — edited contact/personal details plus,
// when collected here, the KYC captures (base64 data URLs + ID details). Persisting
// it shows the data on the profile and lets the next stay start with ID on file.
type GuestProfilePatch = {
  name?: string; phone?: string; email?: string; nationality?: string; gender?: string;
  idType?: string; idNumber?: string; address?: string;
  idFront?: string | null; idBack?: string | null;
  photo?: string | null; signature?: string | null;
};
// Look up by the ORIGINAL booked name (the patch may rename the guest), then PUT.
async function persistGuestProfile(guestName: string, patch: GuestProfilePatch) {
  try {
    const list = await apiGet<{ id: number; name: string }[]>("/guests");
    const g = list.find(x => x.name === guestName);
    if (!g) return;   // no matching profile — booking-only guest, nothing to attach to
    await apiPut(`/guests/${g.id}`, patch);
  } catch { /* offline — edits stay in the UI for this session */ }
}

/** Join a reservation with its guest profile to enable phone/email/ID search */
function enrich(r: Reservation, guests: Guest[]) {
  const guest = guests.find(g => g.name === r.guestName);
  const [firstName, ...rest] = r.guestName.split(" ");
  const lastName = rest.join(" ");
  return {
    res: r,
    firstName,
    lastName,
    phone: guest?.phone ?? "",
    email: guest?.email ?? "",
    idNumber: guest?.idNumber ?? "",
    nationality: guest?.nationality ?? "",
  };
}
type Enriched = ReturnType<typeof enrich>;

type MatchField = "Booking #" | "First name" | "Last name" | "Full name" | "Phone" | "Email" | "ID #" | "Room #" | "Nationality";

/** Returns matched reservations + which fields matched for each */
function smartSearch(needle: string, enriched: Enriched[]): { res: Reservation; fields: MatchField[] }[] {
  const q = needle.trim().toLowerCase();
  if (!q) return [];
  // Strip spaces and punctuation for phone-like search
  const qDigits = q.replace(/[^0-9]/g, "");

  return enriched
    .map(e => {
      const fields: MatchField[] = [];
      if (e.res.bookingNo.toLowerCase().includes(q)) fields.push("Booking #");
      if (e.firstName.toLowerCase().startsWith(q)) fields.push("First name");
      if (e.lastName.toLowerCase().startsWith(q)) fields.push("Last name");
      if (!fields.includes("First name") && !fields.includes("Last name") && e.res.guestName.toLowerCase().includes(q)) fields.push("Full name");
      if (qDigits && e.phone.replace(/[^0-9]/g, "").includes(qDigits)) fields.push("Phone");
      if (e.email.toLowerCase().includes(q)) fields.push("Email");
      if (e.idNumber.toLowerCase().includes(q)) fields.push("ID #");
      if (e.res.roomNumber.includes(q)) fields.push("Room #");
      if (e.nationality.toLowerCase().includes(q)) fields.push("Nationality");
      return { res: e.res, fields, enrich: e };
    })
    .filter(m => m.fields.length > 0)
    // Rank: more matched fields first, then booking # / phone / ID / name priority
    .sort((a, b) => {
      const rank = (f: MatchField[]) => {
        if (f.includes("Booking #")) return 0;
        if (f.includes("Phone")) return 1;
        if (f.includes("ID #")) return 2;
        if (f.includes("First name") || f.includes("Last name")) return 3;
        if (f.includes("Email")) return 4;
        return 5;
      };
      return rank(a.fields) - rank(b.fields);
    });
}

const FIELD_ICON: Record<MatchField, typeof Hash> = {
  "Booking #": Hash,
  "First name": User,
  "Last name": User,
  "Full name": User,
  "Phone": Phone,
  "Email": Mail,
  "ID #": IdCard,
  "Room #": BedDouble,
  "Nationality": Users,
};

type Slot = "all" | "morning" | "afternoon" | "evening" | "night";
function inSlot(checkIn: string, slot: Slot) {
  if (slot === "all") return true;
  const h = new Date(checkIn).getHours();
  if (slot === "morning") return h < 12;
  if (slot === "afternoon") return h >= 12 && h < 17;
  if (slot === "evening") return h >= 17 && h < 21;
  return h >= 21 || h < 6; // night
}

export default function CheckinPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookParam = searchParams.get("book");
  const resumeParam = searchParams.get("resume");
  const [q, setQ] = React.useState("");
  const [view, setView] = React.useState<"cards" | "list">("cards");
  const [selected, setSelected] = React.useState<Reservation | null>(null);
  const [checkingIn, setCheckingIn] = React.useState<Reservation | null>(null);
  const [completedIds, setCompletedIds] = React.useState<Set<string>>(new Set());
  const [toast, setToast] = React.useState<string | null>(null);
  const [walkInOpen, setWalkInOpen] = React.useState(false);
  const [walkInInitial, setWalkInInitial] = React.useState<WalkInResume | null>(null);
  // Reservations created from express walk-in — force KYC capture in the check-in modal
  const [expressWalkInIds, setExpressWalkInIds] = React.useState<Set<string>>(new Set());

  // Today's real expected arrivals — confirmed bookings whose check-in date is today.
  const [arrivals, setArrivals] = React.useState<Reservation[]>([]);
  React.useEffect(() => {
    const today = new Date().toLocaleDateString("en-CA");
    apiGet<(Reservation & { status?: string })[]>("/bookings")
      .then(rows => setArrivals(
        rows
          .filter(b => (b.checkIn ?? "").slice(0, 10) === today && (b.status ?? "confirmed") === "confirmed")
          .map(b => ({ ...b, id: String(b.id) })),
      ))
      .catch(() => {});
  }, []);
  const guests = useGuests();
  const enriched = React.useMemo(() => arrivals.map(r => enrich(r, guests)), [arrivals, guests]);

  // Auto-open check-in modal when navigated with ?book=BK100245 — from the dashboard,
  // or "Complete" on an incomplete (synced-but-unsubmitted) walk-in in the bookings list.
  React.useEffect(() => {
    if (!bookParam) return;
    const target = arrivals.find(r => r.bookingNo === bookParam);
    if (target) {
      setCheckingIn(target);
      router.replace("/checkin");   // clear the query so re-render / close doesn't re-open
      return;
    }
    // Not among today's confirmed arrivals — likely a synced "pending" walk-in being
    // completed. Fetch it by bookingNo (any status) and open the same check-in flow,
    // carrying the tablet-captured documents so the Identity step can show them.
    let cancelled = false;
    (async () => {
      try {
        const rows = await apiGet<(Reservation & { status?: string; id: number | string })[]>("/bookings");
        const b = rows.find(x => x.bookingNo === bookParam);
        if (cancelled || !b) return;
        let documents: Record<string, string | null> | undefined;
        try { documents = (await apiGet<{ documents?: Record<string, string | null> }>(`/bookings/${b.id}`))?.documents; } catch { /* open without thumbnails */ }
        if (cancelled) return;
        setCheckingIn({ ...b, id: String(b.id), documents } as unknown as Reservation);
        router.replace("/checkin");
      } catch { /* offline — nothing to open */ }
    })();
    return () => { cancelled = true; };
  }, [bookParam, router, arrivals]);

  // "Complete" on an incomplete WALK-IN (WK…) draft in the bookings list → reopen
  // the walk-in form pre-filled from its draftData + stay columns + captured docs,
  // reusing the same WK record (no duplicate). BK… drafts resume in /bookings/new.
  React.useEffect(() => {
    if (!resumeParam || !resumeParam.startsWith("WK")) return;
    let cancelled = false;
    (async () => {
      try {
        const rows = await apiGet<Array<{ id: number; bookingNo: string; status?: string; checkIn?: string; nights?: number; adults?: number; children?: number; roomType?: string; ratePlan?: string; guestName?: string; draftData?: unknown }>>("/bookings");
        const matches = rows.filter(r => r.bookingNo === resumeParam && (r.status ?? "") === "pending");
        const b = matches.find(r => r.draftData) ?? [...matches].sort((a, z) => z.id - a.id)[0];
        if (cancelled || !b) return;
        const full = await apiGet<{ draftData?: { name?: string; phone?: string; email?: string; nationality?: string }; documents?: WalkInResume["docs"] }>(`/bookings/${b.id}`).catch(() => null);
        if (cancelled) return;
        const dd = full?.draftData ?? {};
        setWalkInInitial({
          bookingId: b.id, bookingNo: b.bookingNo,
          name: dd.name ?? b.guestName ?? "", phone: dd.phone ?? "", email: dd.email ?? "", nationality: dd.nationality ?? "India",
          checkInDate: (b.checkIn ?? "").slice(0, 10) || undefined,
          nights: b.nights, adults: b.adults, children: b.children,
          roomType: b.roomType,
          ratePlan: b.ratePlan,
          docs: full?.documents ?? undefined,
        });
        setWalkInOpen(true);
        router.replace("/checkin");   // clear the query so it doesn't re-open on close
      } catch { /* offline — nothing to open */ }
    })();
    return () => { cancelled = true; };
  }, [resumeParam, router]);

  // Resolve a Guest record (from GUESTS or synthesized) for the selected reservation
  const selectedGuest: Guest | null = React.useMemo(() => {
    if (!selected) return null;
    return (
      guests.find(g => g.name === selected.guestName) ?? {
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
  const [source, setSource] = React.useState<"all" | BookingSource>("all");
  const [payment, setPayment] = React.useState<"all" | PaymentStatus>("all");
  const [slot, setSlot] = React.useState<Slot>("all");
  const [roomType, setRoomType] = React.useState<string>("all");
  const [vipOnly, setVipOnly] = React.useState(false);

  const smartMatches = React.useMemo(() => smartSearch(q, enriched), [q, enriched]);

  const matched = React.useMemo(() => {
    // The list/cards view shows reservations that pass filters AND match the search (if any)
    const searchSet = q.trim() ? new Set(smartMatches.map(m => m.res.id)) : null;
    return arrivals.filter(r => {
      if (searchSet && !searchSet.has(r.id)) return false;
      if (source !== "all" && r.source !== source) return false;
      if (payment !== "all" && r.paymentStatus !== payment) return false;
      if (!inSlot(r.checkIn, slot)) return false;
      if (roomType !== "all" && r.roomType !== roomType) return false;
      if (vipOnly && !r.vip) return false;
      return true;
    });
  }, [arrivals, q, smartMatches, source, payment, slot, roomType, vipOnly]);

  // Live dropdown shows top 5 matches
  const topMatches = smartMatches.slice(0, 5);
  const exactMatch = smartMatches.length === 1 ? smartMatches[0].res : null;

  const totalBalance = arrivals.reduce((s, r) => s + r.balance, 0);
  const sources = Array.from(new Set(arrivals.map(r => r.source)));
  const roomTypes = Array.from(new Set(arrivals.map(r => r.roomType)));

  const clearFilters = () => {
    setSource("all"); setPayment("all"); setSlot("all"); setRoomType("all"); setVipOnly(false);
  };
  const activeFilters = (source !== "all" ? 1 : 0) + (payment !== "all" ? 1 : 0) +
    (slot !== "all" ? 1 : 0) + (roomType !== "all" ? 1 : 0) + (vipOnly ? 1 : 0);

  // Express Walk-in renders as in-page content (inside the app shell, so the
  // sidebar + top bar stay visible) instead of a full-screen overlay. onStart
  // hands the new reservation to the check-in process — same flow as before.
  if (walkInOpen) {
    return (
      <WalkInModal
        initialData={walkInInitial}
        onClose={() => { setWalkInOpen(false); setWalkInInitial(null); }}
        onStart={(reservation) => {
          setExpressWalkInIds(s => new Set([...s, reservation.id]));
          setCheckingIn(reservation);
          setWalkInOpen(false);
          setWalkInInitial(null);
        }}
      />
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-medium tracking-tight">Check-in</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {arrivals.length} arrivals expected today · one-click for confirmed reservations
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/bookings/new"><Button variant="ghost"><Plus className="h-4 w-4" />New booking</Button></Link>
          <Button onClick={() => setWalkInOpen(true)}>
            <LogIn className="h-4 w-4" />Walk-in Check-in
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard label="Expected Today" value={arrivals.length} icon={Calendar} accent="brand" />
        <KPICard label="VIP Arrivals" value={arrivals.filter(r => r.vip).length} icon={Crown} accent="accent" />
        <KPICard label="Paid in Advance" value={arrivals.filter(r => r.paymentStatus === "paid").length} icon={CreditCard} accent="success" />
        <KPICard label="Pending Balance" value={money(totalBalance)} icon={CreditCard} accent="warning" />
      </div>

      {/* Quick Check-in hero */}
      <Card className="p-5 border-l-4 border-l-brand bg-linear-to-br from-brand-soft/30 via-surface to-surface">
        <div className="flex items-start gap-4">
          <span className="h-11 w-11 rounded-md bg-brand text-brand-foreground flex items-center justify-center shrink-0 shadow-md">
            <Zap className="h-5 w-5" />
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-base font-semibold">Quick Check-in</p>
              <Badge tone="brand"><Sparkles className="h-3 w-3" />Smart search</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Find any pre-booked guest by <span className="font-medium text-foreground">booking #</span>, <span className="font-medium text-foreground">phone</span>, <span className="font-medium text-foreground">first / last name</span>, <span className="font-medium text-foreground">email</span>, <span className="font-medium text-foreground">ID number</span>, or <span className="font-medium text-foreground">room #</span>.
            </p>

            {/* Search field type chips */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {[
                { label: "Booking #", example: "BK100245", icon: Hash },
                { label: "Phone", example: "+971 50", icon: Phone },
                { label: "First name", example: "Yuki", icon: User },
                { label: "Last name", example: "Tanaka", icon: User },
                { label: "Email", example: "@", icon: Mail },
                { label: "ID #", example: "A1234", icon: IdCard },
                { label: "Room", example: "102", icon: BedDouble },
              ].map(c => {
                const Icon = c.icon;
                return (
                  <button
                    type="button"
                    key={c.label}
                    onClick={() => setQ(c.example)}
                    className="h-6 px-2 rounded-full text-[10px] font-medium border border-border hover:bg-surface-sunken inline-flex items-center gap-1 text-muted-foreground transition-colors"
                    title={`Example: ${c.example}`}
                  >
                    <Icon className="h-3 w-3" />{c.label}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle-foreground pointer-events-none" />
              <Input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Start typing — booking #, phone, name, email, ID, or room #..."
                className="pl-9 pr-24 h-12 text-base"
                autoFocus
              />
              {q && (
                <button
                  type="button"
                  onClick={() => setQ("")}
                  className="absolute right-24 top-1/2 -translate-y-1/2 h-7 w-7 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center text-muted-foreground"
                  aria-label="Clear"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              <Button
                size="lg"
                disabled={!exactMatch}
                onClick={() => exactMatch && setCheckingIn(exactMatch)}
                className={cn("absolute right-1.5 top-1/2 -translate-y-1/2 h-9", !exactMatch && "opacity-50")}
              >
                <LogIn className="h-4 w-4" />
                {exactMatch ? `Check in` : "Check in"}
              </Button>
            </div>

            {/* Live dropdown results */}
            {q && topMatches.length > 0 && (
              <div className="mt-3 space-y-1.5 animate-in">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  {smartMatches.length} match{smartMatches.length === 1 ? "" : "es"}
                  {smartMatches.length > 5 && ` · showing top 5`}
                </p>
                {topMatches.map(m => (
                  <div
                    key={m.res.id}
                    className="flex items-center gap-3 p-3 rounded-md bg-surface border border-border hover:border-brand hover:shadow-md transition-all group"
                  >
                    <Avatar name={m.res.guestName} size={40} vip={m.res.vip} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm truncate">{m.res.guestName}</p>
                        <Badge tone="neutral">{m.res.bookingNo}</Badge>
                        <PaymentBadge status={m.res.paymentStatus} />
                        {m.res.vip && <Crown className="h-3 w-3 text-brand" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Room {m.res.roomNumber} · {m.res.roomType} · {m.res.adults}A{m.res.children ? `+${m.res.children}C` : ""} · ETA {formatTime(m.res.checkIn)}
                        {m.res.balance > 0 && <span className="text-warning font-medium ml-2 tabular">· {money(m.res.balance)} due</span>}
                      </p>
                      {/* Match field badges — show why this matched */}
                      <div className="mt-1 flex flex-wrap gap-1">
                        {m.fields.map(f => {
                          const Icon = FIELD_ICON[f];
                          return (
                            <span key={f} className="inline-flex items-center gap-0.5 h-4 px-1.5 rounded-full bg-brand-soft text-brand-soft-foreground text-[9px] font-medium">
                              <Icon className="h-2.5 w-2.5" />matched {f}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                    <div className="inline-flex gap-1 opacity-70 group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => setSelected(m.res)}
                        className="h-8 w-8 rounded-md border border-border hover:bg-brand hover:text-brand-foreground hover:border-brand inline-flex items-center justify-center text-muted-foreground transition-colors"
                        title="View booking details"
                        aria-label="View booking details"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <Button size="sm" onClick={() => setCheckingIn(m.res)}>
                        <LogIn className="h-3.5 w-3.5" />Check in
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {q && smartMatches.length === 0 && (
              <div className="mt-3 p-3 rounded-md bg-warning-soft/40 border border-warning/30">
                <p className="text-sm">
                  <span className="font-medium">No pre-booked guest found</span> for &ldquo;{q}&rdquo;.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Try a different field, or{" "}
                  <Link href="/bookings/new" className="text-brand hover:underline font-medium">create a walk-in booking →</Link>
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Filter bar */}
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
          <Select value={slot} onChange={e => setSlot(e.target.value as Slot)} className="h-9 w-auto">
            <option value="all">Any time</option>
            <option value="morning">Morning (before 12)</option>
            <option value="afternoon">Afternoon (12-5)</option>
            <option value="evening">Evening (5-9)</option>
            <option value="night">Night (after 9)</option>
          </Select>
          <Select value={roomType} onChange={e => setRoomType(e.target.value)} className="h-9 w-auto">
            <option value="all">All room types</option>
            {roomTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </Select>
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
            <Button variant="ghost" size="sm" onClick={clearFilters}>Clear ({activeFilters})</Button>
          )}

          <div className="flex-1" />

          {/* View toggle */}
          <div className="inline-flex rounded-md border border-border overflow-hidden h-9">
            <button
              type="button"
              onClick={() => setView("cards")}
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
      </Card>

      {/* Body */}
      <div className="text-xs text-muted-foreground">
        Showing <span className="font-medium text-foreground">{matched.length}</span> of {arrivals.length} arrivals
      </div>

      {view === "cards"
        ? <CardsView arrivals={matched.filter(r => !completedIds.has(r.id))} onView={setSelected} onCheckIn={setCheckingIn} />
        : <ListView arrivals={matched.filter(r => !completedIds.has(r.id))} onView={setSelected} onCheckIn={setCheckingIn} />}

      {matched.length === 0 && (
        <Card className="p-12 text-center">
          <Search className="h-8 w-8 mx-auto text-subtle-foreground" />
          <p className="mt-3 font-medium">No arrivals match your filters</p>
          <p className="text-xs text-muted-foreground mt-1">Clear filters above, or create a walk-in booking.</p>
        </Card>
      )}

      {/* Express check-in helper at bottom */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <CardTitle>Express Check-in Steps</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Average completion: <span className="text-foreground font-medium">28 seconds</span></p>
          </div>
          <Badge tone="brand"><Sparkles className="h-3 w-3" />AI-assisted</Badge>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { icon: IdCard, label: "Verify ID", hint: "OCR scan" },
            { icon: Camera, label: "Photo & Signature", hint: "Tablet pad" },
            { icon: BedDouble, label: "Assign Room", hint: "Auto-matched" },
            { icon: CreditCard, label: "Settle Balance", hint: "Tap to pay" },
            { icon: Send, label: "Welcome Message", hint: "Email + WA" },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="flex items-start gap-3 p-3 rounded-md border border-border">
                <span className="h-7 w-7 shrink-0 rounded-full bg-brand-soft text-brand-soft-foreground flex items-center justify-center text-xs font-semibold">
                  {i + 1}
                </span>
                <div className="-mt-0.5">
                  <div className="flex items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-sm font-medium">{s.label}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{s.hint}</p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Guest detail drawer — opens on View icon click */}
      <GuestDetailDrawer
        open={selected !== null}
        onClose={() => setSelected(null)}
        guest={selectedGuest}
        reservation={selected}
      />

      {/* Check-in process modal — opens on Check-in button click */}
      {checkingIn && (
        <CheckinProcessModal
          reservation={checkingIn}
          forceKycCapture={expressWalkInIds.has(checkingIn.id)}
          onClose={() => setCheckingIn(null)}
          onComplete={(res, msg, room, payment) => {
            setCompletedIds(s => new Set([...s, res.id]));
            setCheckingIn(null);
            setToast(msg);
            setTimeout(() => setToast(null), 3000);
            persistCheckIn(res, room, payment);
          }}
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

function CardsView({ arrivals, onView, onCheckIn }: { arrivals: Reservation[]; onView: (r: Reservation) => void; onCheckIn: (r: Reservation) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {arrivals.map(r => (
        <Card
          key={r.id}
          className={cn(
            "p-4 transition-all hover:shadow-md border-l-4 relative group/card",
            r.vip ? "border-l-brand" : "border-l-info"
          )}
        >
          {/* View icon — top-right corner, always visible */}
          <button
            type="button"
            onClick={() => onView(r)}
            className="absolute top-3 right-3 h-7 w-7 rounded-md bg-surface-sunken hover:bg-brand hover:text-brand-foreground inline-flex items-center justify-center text-muted-foreground transition-colors z-10"
            title="View booking details"
            aria-label="View booking details"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>

          <div className="flex items-start gap-3 pr-10">
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
            <Item icon={Calendar} label="ETA" value={formatTime(r.checkIn)} />
          </dl>

          <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
            <Badge tone="neutral">{r.source}</Badge>
            {r.balance > 0 && (
              <span className="text-xs tabular text-warning font-medium">{money(r.balance)} due</span>
            )}
          </div>

          <div className="mt-3 flex gap-1.5">
            <Button size="sm" variant="ghost" className="flex-1" onClick={() => onView(r)}>
              <Eye className="h-3.5 w-3.5" />Details
            </Button>
            <Button size="sm" className="flex-1" onClick={() => onCheckIn(r)}>
              <LogIn className="h-3.5 w-3.5" />Check in
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}

function ListView({ arrivals, onView, onCheckIn }: { arrivals: Reservation[]; onView: (r: Reservation) => void; onCheckIn: (r: Reservation) => void }) {
  return (
    <Card className="p-0 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-surface-elevated border-b border-border">
          <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-3 font-semibold">Booking</th>
            <th className="px-4 py-3 font-semibold">Guest</th>
            <th className="px-4 py-3 font-semibold">Room</th>
            <th className="px-4 py-3 font-semibold">Source</th>
            <th className="px-4 py-3 font-semibold">ETA</th>
            <th className="px-4 py-3 font-semibold text-right">Nights</th>
            <th className="px-4 py-3 font-semibold">Payment</th>
            <th className="px-4 py-3 font-semibold text-right">Balance</th>
            <th className="px-4 py-3 font-semibold text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {arrivals.map(r => (
            <tr key={r.id} className="hover:bg-surface-sunken/50 transition-colors group">
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
              <td className="px-4 py-3 text-muted-foreground tabular">{formatTime(r.checkIn)}</td>
              <td className="px-4 py-3 text-right tabular">{r.nights}</td>
              <td className="px-4 py-3"><PaymentBadge status={r.paymentStatus} /></td>
              <td className={cn("px-4 py-3 text-right tabular font-medium", r.balance > 0 ? "text-warning" : "text-muted-foreground")}>
                {r.balance > 0 ? money(r.balance) : "—"}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="inline-flex gap-1">
                  <button
                    type="button"
                    onClick={() => onView(r)}
                    className="h-8 w-8 rounded-md border border-border hover:bg-brand hover:text-brand-foreground hover:border-brand inline-flex items-center justify-center text-muted-foreground transition-colors"
                    title="View booking details"
                    aria-label="View booking details"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                  <Button size="sm" onClick={() => onCheckIn(r)}><LogIn className="h-3.5 w-3.5" />Check in</Button>
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

// ---------- Check-in Process Modal ----------
function CheckinProcessModal({
  reservation, onClose, onComplete, forceKycCapture,
}: {
  reservation: Reservation;
  onClose: () => void;
  onComplete: (r: Reservation, msg: string, roomNumber: string, payment: CheckInPayment) => void;
  forceKycCapture?: boolean;
}) {
  const name = hotelName(useProperty());
  type Step = 0 | 1 | 2 | 3 | 4;
  const STEPS = [
    { id: 0, label: "Identity", icon: IdCard, hint: "Verify ID" },
    { id: 1, label: "Room", icon: BedDouble, hint: "Confirm assignment" },
    { id: 2, label: "Payment", icon: CreditCard, hint: "Settle balance" },
    { id: 3, label: "Welcome", icon: Send, hint: "Send message" },
    { id: 4, label: "Complete", icon: CheckCircle2, hint: "Finalize" },
  ] as const;

  // Walk-ins settle payment in the express wizard — skip the check-in Payment
  // step for them (any balance is collected at checkout). Pre-booked arrivals keep it.
  const isWalkIn = reservation.source === "Walk-in";
  const flowSteps = isWalkIn ? STEPS.filter(s => s.id !== 2) : STEPS;
  const flowIds = flowSteps.map(s => s.id) as Step[];

  const guests = useGuests();
  const rooms = useRooms();
  const guest = guests.find(g => g.name === reservation.guestName);
  // Documents captured on the tablet (when completing a synced "pending" walk-in) —
  // attached to the reservation by the bookings-list "Complete" deep-link.
  const syncedDocs = (reservation as { documents?: { guest_photo?: string | null; id_front?: string | null; id_back?: string | null; signature?: string | null } }).documents;
  const syncedHasDocs = !!(syncedDocs && (syncedDocs.guest_photo || syncedDocs.id_front || syncedDocs.id_back || syncedDocs.signature));
  // Identity captured upstream (walk-in Create-New-Guest form / tablet sync).
  const syncedIdentity = (reservation as { identity?: { id_type?: string; id_number?: string; address?: string; phone?: string; email?: string; nationality?: string; dob?: string; gender?: string } }).identity;
  // ID on file? Walk-ins from /bookings/new have KYC captured. Express walk-ins from /checkin do NOT — they capture here.
  // OTA/Website/Phone/Agent/Corporate pre-bookings typically don't capture KYC at booking.
  const idOnFile = forceKycCapture ? false : reservation.source === "Walk-in";
  const [step, setStep] = React.useState<Step>(0);
  const [done, setDone] = React.useState(false);

  // Step 1 — Identity verification (existing ID)
  const [idVerified, setIdVerified] = React.useState(false);

  // Step 0 — editable guest details (pre-filled from the booked guest's profile,
  // saved back on check-in). Mirrors the Express Walk-in wizard's Step 1 form.
  const [gName, setGName] = React.useState(guest?.name ?? reservation.guestName);
  const [gPhone, setGPhone] = React.useState(guest?.phone || syncedIdentity?.phone || "");
  const [gEmail, setGEmail] = React.useState((guest?.email && guest.email !== "—" ? guest.email : "") || syncedIdentity?.email || "");
  const [gNationality, setGNationality] = React.useState(guest?.nationality || syncedIdentity?.nationality || "India");
  const [gDob, setGDob] = React.useState(syncedIdentity?.dob ?? "");
  const [gGender, setGGender] = React.useState(guest?.gender || syncedIdentity?.gender || "Male");

  // Step 1 — KYC collection (pre-booked guest, no ID on file)
  const [collectedIdType, setCollectedIdType] = React.useState<string>(
    syncedIdentity?.id_type || (guest?.nationality && guest.nationality !== "India" ? "Passport" : "Aadhaar")
  );
  const [collectedIdNumber, setCollectedIdNumber] = React.useState<string>(syncedIdentity?.id_number ?? "");
  const [collectedAddress, setCollectedAddress] = React.useState<string>(syncedIdentity?.address ?? guest?.address ?? "");
  const [idFrontFile, setIdFrontFile] = React.useState<string | null>(syncedDocs?.id_front || null);
  const [idBackFile, setIdBackFile] = React.useState<string | null>(syncedDocs?.id_back || null);
  const [facePhoto, setFacePhoto] = React.useState<string | null>(syncedDocs?.guest_photo || null);
  const [signature, setSignature] = React.useState<string | null>(syncedDocs?.signature || null);
  const [kycConsent, setKycConsent] = React.useState(false);

  // The guest directory loads async — hydrate the editable fields once the matching
  // profile arrives (guarded so it never clobbers an edit the user already made).
  const hydratedRef = React.useRef(false);
  React.useEffect(() => {
    if (!guest || hydratedRef.current) return;
    hydratedRef.current = true;
    setGName(guest.name ?? reservation.guestName);
    setGPhone(guest.phone ?? "");
    setGEmail(guest.email && guest.email !== "—" ? guest.email : "");
    setGNationality(guest.nationality ?? "India");
    setGGender(guest.gender ?? "Male");
    setCollectedAddress(a => a || guest.address || "");
  }, [guest, reservation.guestName]);

  // ----- mobile capture sync (capture this arrival's KYC on the tablet) -----
  type SyncedBooking = {
    verification_status?: string;
    identity?: { id_type?: string | null; id_number?: string | null; address?: string | null };
    documents?: { guest_photo?: string | null; id_front?: string | null; id_back?: string | null; signature?: string | null };
  };
  const [syncState, setSyncState] = React.useState<"idle" | "creating" | "waiting" | "done" | "error">("idle");
  const [syncBookingId, setSyncBookingId] = React.useState<number | null>(null);
  const [syncDocs, setSyncDocs] = React.useState<SyncedBooking["documents"]>(undefined);
  const [syncErr, setSyncErr] = React.useState<string | null>(null);
  const [syncDialogOpen, setSyncDialogOpen] = React.useState(false);

  // The arrival already exists as a booking — send it to the tablet for capture,
  // then poll until staff upload the face photo, ID scans and signature.
  const startSync = async () => {
    if (syncState === "creating" || syncState === "waiting" || syncState === "done") {
      setSyncDialogOpen(true);
      return;
    }
    setSyncErr(null);
    setSyncDocs(undefined);
    setSyncDialogOpen(true);
    setSyncState("creating");
    // Resolve the numeric booking id. reservation.id is the DB id for arrivals;
    // other entry points carry a synthetic id, so fall back to a bookingNo lookup.
    let bookingId = Number(reservation.id);
    if (!bookingId || Number.isNaN(bookingId)) {
      try {
        const list = await apiGet<{ id: number; bookingNo: string }[]>("/bookings");
        bookingId = list.find(b => b.bookingNo === reservation.bookingNo)?.id ?? 0;
      } catch { /* handled below */ }
    }
    if (!bookingId) {
      setSyncErr("Couldn't find this booking on the server. Try again.");
      setSyncState("error");
      return;
    }
    setSyncBookingId(bookingId);
    // Seed the booking with the selected ID type (so the tablet frames the
    // capture to that exact card) plus anything already captured here. Fire-and
    // -forget — the sync shouldn't block on it.
    apiPost(`/bookings/${bookingId}/verification`, {
      guest_photo: facePhoto ?? "",
      id_front: idFrontFile ?? "",
      id_back: idBackFile ?? "",
      signature: signature ?? "",
      id_type: collectedIdType,
      id_number: collectedIdNumber,
      address: collectedAddress,
      uploaded_by: "Reception (web)",
    }).catch(() => {});
    setSyncState("waiting");
  };

  const cancelSync = () => {
    setSyncState("idle");
    setSyncBookingId(null);
    setSyncDocs(undefined);
    setSyncErr(null);
    setSyncDialogOpen(false);
  };

  // While waiting, poll the booking until the tablet uploads the documents, then
  // drop them straight into the KYC slots below.
  React.useEffect(() => {
    if (syncState !== "waiting" || !syncBookingId) return;
    let stopped = false;
    const poll = async () => {
      try {
        const b = await apiGet<SyncedBooking>(`/bookings/${syncBookingId}`);
        if (stopped) return;
        setSyncDocs(b?.documents);
        const d = b?.documents;
        // Done as soon as all four documents are present — don't depend on the
        // backend's verification_status string (which can lag at "in_progress").
        const allPresent = !!(d?.guest_photo && d?.id_front && d?.id_back && d?.signature);
        if (d && (allPresent || b?.verification_status === "synced")) {
          if (d.guest_photo) setFacePhoto(d.guest_photo);
          if (d.id_front) setIdFrontFile(d.id_front);
          if (d.id_back) setIdBackFile(d.id_back);
          if (d.signature) setSignature(d.signature);
          if (b.identity?.id_type) setCollectedIdType(b.identity.id_type);
          if (b.identity?.id_number) setCollectedIdNumber(b.identity.id_number);
          if (b.identity?.address) setCollectedAddress(b.identity.address);
          setSyncState("done");
          setSyncDialogOpen(true);
        }
      } catch { /* keep polling — transient network error */ }
    };
    poll();
    const timer = setInterval(poll, 3000);
    return () => { stopped = true; clearInterval(timer); };
  }, [syncState, syncBookingId]);

  const isForeign = guest?.nationality !== undefined && guest.nationality !== "India";
  // Aadhaar / Voter ID / Driving License are two-sided; Passport / PAN are one-side
  const needsBackSide = ["Aadhaar", "Voter ID", "Driving License"].includes(collectedIdType);
  const minDigits: Record<string, number> = { Aadhaar: 12, PAN: 10, Passport: 8, "Voter ID": 10, "Driving License": 10 };
  const idLengthOk = collectedIdNumber.replace(/\s/g, "").length >= (minDigits[collectedIdType] ?? 6);
  const kycComplete = idOnFile
    ? idVerified
    : (idLengthOk && idFrontFile !== null && (!needsBackSide || idBackFile !== null) && facePhoto !== null && signature !== null && kycConsent);
  // Edited guest details must stay valid before leaving Step 0 (phone/email only
  // checked when present, since they may be blank on an older profile).
  const detailsValid = gName.trim() !== "" && (gPhone === "" || isValidPhone(gPhone)) && (gEmail === "" || isValidEmail(gEmail));

  // Step 2 — Room assignment. Booking reserves a room TYPE; here we pick a
  // currently-available room of that type (plus the pre-assigned one if any).
  const isUnassigned = !reservation.roomNumber || reservation.roomNumber === "Unassigned";

  // Rooms already committed to ANOTHER booking whose stay overlaps this guest's
  // stay must not be offered — the room board only flags rooms occupied *today*,
  // so a room pre-assigned to a future/overlapping booking would otherwise look
  // free here and get double-booked. We compute the overlap against all active
  // (non-cancelled, non-checked-out) bookings.
  // Fetch room availability for this booking's stay window from the backend, which
  // cross-checks individual bookings AND group rooming assignments. The pre-assigned
  // room is always kept as an option so reception can re-confirm or swap it.
  const [checkinAvailRooms, setCheckinAvailRooms] = React.useState<{ number: string; available: boolean }[]>([]);
  React.useEffect(() => {
    const from = (reservation.checkIn ?? "").slice(0, 10);
    const to   = (reservation.checkOut ?? "").slice(0, 10);
    if (!from || !to) return;
    apiGet<typeof checkinAvailRooms>(`/room-availability?from=${from}&to=${to}`)
      .then(setCheckinAvailRooms).catch(() => {});
  }, [reservation.checkIn, reservation.checkOut]);

  // Assignable at check-in = rooms of this type that are available for the stay,
  // plus the pre-assigned room (always kept so the desk can re-confirm or swap).
  const availableForType = React.useMemo(() => {
    const avail = new Set(checkinAvailRooms.filter(r => r.available).map(r => r.number));
    return rooms.filter(r => r.type.toLowerCase() === reservation.roomType.toLowerCase()
      && (r.number === reservation.roomNumber || avail.has(r.number)));
  }, [rooms, reservation.roomType, reservation.roomNumber, checkinAvailRooms]);
  const [assignedRoom, setAssignedRoom] = React.useState(isUnassigned ? "" : reservation.roomNumber);
  const selectedRoomObj = availableForType.find(r => r.number === assignedRoom);
  const selectedHkPending = !!selectedRoomObj && (selectedRoomObj.status === "dirty" || selectedRoomObj.status === "cleaning");
  const [keyCardEncoded, setKeyCardEncoded] = React.useState(false);

  // Step 3 — Payment
  const [collectAmount, setCollectAmount] = React.useState(reservation.balance);
  const [paymentMode, setPaymentMode] = React.useState("UPI");
  const [paymentRef, setPaymentRef] = React.useState("");
  // Cash needs no reference; every other mode must record a transaction ref.
  const PAY_REF_FIELD: Record<string, { label: string; placeholder: string }> = {
    UPI: { label: "UPI transaction reference", placeholder: "e.g. 4123-4567-8901" },
    Card: { label: "Card auth code / last 4 digits", placeholder: "e.g. Auth 8821 · **** 4321" },
    "Net Banking": { label: "Bank reference / UTR no.", placeholder: "e.g. UTR 3219872650" },
  };
  const needsRef = collectAmount > 0 && paymentMode !== "Cash";

  // Step 4 — Welcome
  const [channels, setChannels] = React.useState<string[]>(["whatsapp", "email"]);
  const toggleChannel = (c: string) => setChannels(v => v.includes(c) ? v.filter(x => x !== c) : [...v, c]);

  // ESC + lock body scroll
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  const canAdvance = () => {
    if (step === 0) return kycComplete && detailsValid;
    if (step === 1) return assignedRoom && keyCardEncoded;
    // Step 2: allow partial advance — collectAmount can be anything from 0 to balance (or more).
    // Front-desk staff can defer remaining balance to checkout.
    if (step === 2) {
      if (reservation.balance === 0 || collectAmount === 0) return true;
      // Non-cash collections must capture a reference number.
      if (needsRef && !paymentRef.trim()) return false;
      return collectAmount >= 0;
    }
    return true;
  };

  const handleComplete = () => {
    setDone(true);
    // Persist the edited guest details to the profile for every arrival, plus the
    // KYC we just collected (ID details + scans + live face + signature) when it was
    // captured here (pre-booked guest with no ID on file). DOB has no profile column,
    // so it's collected but not stored.
    persistGuestProfile(reservation.guestName, {
      name: gName.trim(),
      phone: gPhone,
      email: gEmail,
      nationality: gNationality,
      gender: gGender,
      address: collectedAddress,
      ...(idOnFile ? {} : {
        idType: collectedIdType,
        idNumber: collectedIdNumber,
        idFront: idFrontFile,
        idBack: idBackFile,
        photo: facePhoto,
        signature,
      }),
    });

    // Send the welcome email if the guest chose the Email channel. Until now the
    // channel toggles were cosmetic — nothing was actually dispatched.
    let emailNote = "";
    const guestEmail = guest?.email && guest.email !== "—" ? guest.email.trim() : "";
    if (channels.includes("email")) {
      if (guestEmail) {
        emailNote = ` · welcome email sent to ${guestEmail}`;
        sendEmail({
          to: guestEmail,
          subject: `Welcome to ${name} · Room ${assignedRoom}`,
          heading: `Welcome to ${name}`,
          greeting: reservation.guestName.split(" ")[0],
          intro: `You're checked into Room ${assignedRoom} until ${formatTime(reservation.checkOut)}. We hope you enjoy your stay!`,
          rows: [
            { label: "Booking", value: reservation.bookingNo },
            { label: "Room", value: `${assignedRoom} · ${reservation.roomType}` },
            { label: "Check-out", value: formatTime(reservation.checkOut) },
            { label: "Wi-Fi", value: "PearlGuest · OTP via SMS" },
            { label: "Concierge", value: "Dial 0 from your room" },
          ],
          note: "Need anything during your stay? Our front desk is available 24/7.",
          context: "Check-in welcome",
        }).catch(() => {});
      } else {
        emailNote = " · no email on file — welcome email skipped";
      }
    }

    const collectedPayment: CheckInPayment = { amount: isWalkIn ? 0 : collectAmount, mode: paymentMode, reference: isWalkIn ? "" : paymentRef };
    setTimeout(() => onComplete(reservation, `${reservation.guestName} checked in · Room ${assignedRoom}${emailNote}`, assignedRoom, collectedPayment), 1600);
  };

  if (done) {
    return (
      <>
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs" onClick={onClose} />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
          <Card className="pointer-events-auto w-full max-w-md p-8 animate-in shadow-xl text-center">
            <div className="inline-flex h-16 w-16 rounded-full bg-success-soft text-success items-center justify-center mb-3">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <h2 className="text-xl font-semibold">Welcome, {reservation.guestName.split(" ")[0]}!</h2>
            <p className="text-sm text-muted-foreground mt-1">Check-in complete · Room {assignedRoom}</p>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div className="rounded-md bg-surface-sunken p-2">
                <p className="font-medium text-foreground tabular">{assignedRoom}</p>
                <p>Room number</p>
              </div>
              <div className="rounded-md bg-surface-sunken p-2">
                <p className="font-medium text-foreground tabular">PearlGuest</p>
                <p>Wi-Fi · OTP via SMS</p>
              </div>
            </div>
          </Card>
        </div>
      </>
    );
  }

  // Editable guest-detail fields shown at the top of Step 0, in both the
  // ID-on-file and capture-needed branches. Mirrors the walk-in wizard's Step 1.
  const guestDetails = (
    <div className="rounded-md border border-border p-4 space-y-3">
      <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Guest details</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Full name <span className="text-danger">*</span></Label>
          <Input value={gName} onChange={e => setGName(e.target.value)} placeholder="Full name as on ID" className="h-10" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Phone</Label>
          <PhoneInput value={gPhone} onChange={setGPhone} size="md" invalid={gPhone !== "" && !isValidPhone(gPhone)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Email <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <EmailInput value={gEmail} onChange={setGEmail} className="h-10" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs"><Globe className="h-3 w-3 inline mr-1" />Nationality</Label>
          <Select value={gNationality} onChange={e => setGNationality(e.target.value)} className="h-10">
            <option>India</option><option>UAE</option><option>USA</option><option>UK</option>
            <option>Russia</option><option>Singapore</option><option>Japan</option><option>Other</option>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Date of birth</Label>
          <Input type="date" value={gDob} onChange={e => setGDob(e.target.value)} min={DOB_MIN} max={DOB_MAX} className="h-10 tabular" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Gender</Label>
          <Select value={gGender} onChange={e => setGGender(e.target.value)} className="h-10">
            <option>Male</option><option>Female</option><option>Other</option>
          </Select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs">Address</Label>
          <Input value={collectedAddress} onChange={e => setCollectedAddress(e.target.value)} placeholder="Street, Building, City, Country" className="h-10" />
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 sm:p-6 pointer-events-none overflow-y-auto">
        <Card className="pointer-events-auto w-full max-w-2xl p-0 animate-in shadow-xl my-auto overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 bg-surface-elevated border-b border-border flex items-center gap-3">
            <Avatar name={reservation.guestName} size={42} vip={reservation.vip} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold truncate">{reservation.guestName}</h3>
                {reservation.vip && <Crown className="h-3.5 w-3.5 text-brand shrink-0" />}
                <Badge tone="neutral">{reservation.bookingNo}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Room {reservation.roomNumber} · {reservation.roomType} · {reservation.nights}N · ETA {formatTime(reservation.checkIn)}
              </p>
            </div>
            <button type="button" onClick={onClose} className="h-8 w-8 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Stepper */}
          <div className="px-5 py-3 border-b border-border bg-surface">
            <div className="flex items-center justify-between">
              {flowSteps.map((s, i) => {
                const Icon = s.icon;
                const isDone = step > s.id;
                const isActive = step === s.id;
                return (
                  <React.Fragment key={s.id}>
                    <div className="flex flex-col items-center gap-1 min-w-[60px]">
                      <div className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center transition-colors",
                        isDone ? "bg-success text-white" :
                        isActive ? "bg-brand text-brand-foreground" :
                        "bg-surface-sunken text-muted-foreground"
                      )}>
                        {isDone ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-3.5 w-3.5" />}
                      </div>
                      <span className={cn("text-[10px] uppercase tracking-wider font-semibold whitespace-nowrap",
                        isActive ? "text-foreground" : "text-muted-foreground")}>
                        {s.label}
                      </span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className={cn("flex-1 h-px mx-2 transition-colors", isDone ? "bg-success" : "bg-border")} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Body */}
          <div className="px-5 py-5 min-h-[280px]">
            {step === 0 && idOnFile && (
              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Step 1 · Verify Guest Identity</p>
                  <h2 className="text-base font-semibold">Confirm the ID matches the booking</h2>
                </div>
                {guestDetails}
                <div className="rounded-md border border-border p-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">ID Type</p>
                    <p className="font-medium mt-1">{guest?.idType ?? "Passport"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">ID Number</p>
                    <p className="font-mono tabular mt-1">{guest?.idNumber ?? "—"}</p>
                  </div>
                  {!syncedHasDocs && (
                    <div className="col-span-2 pt-3 border-t border-border">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Document on file</p>
                      <p className="text-xs mt-1 inline-flex items-center gap-1.5 text-success">
                        <CheckCircle2 className="h-3 w-3" />passport_scan_FRONT.pdf · captured at booking
                      </p>
                    </div>
                  )}
                </div>
                {syncedHasDocs && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 inline-flex items-center gap-1.5">
                      <Smartphone className="h-3 w-3" />Captured on the tablet
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {([["Face photo", syncedDocs?.guest_photo], ["ID Front", syncedDocs?.id_front], ["ID Back", syncedDocs?.id_back], ["Signature", syncedDocs?.signature]] as [string, string | null | undefined][]).map(([label, src]) => (
                        <div key={label} className="rounded-md border border-border bg-surface overflow-hidden">
                          <div className="aspect-[4/3] bg-surface-sunken flex items-center justify-center">
                            {src
                              ? <img src={src} alt={label} className="h-full w-full object-contain" />
                              : <span className="text-[11px] text-muted-foreground">—</span>}
                          </div>
                          <p className="text-[11px] text-center py-1 text-muted-foreground">{label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setIdVerified(!idVerified)}
                  className={cn(
                    "w-full rounded-md border-2 p-3 text-left transition-colors flex items-center gap-3",
                    idVerified ? "border-success bg-success-soft" : "border-dashed border-border hover:bg-surface-sunken"
                  )}
                >
                  <div className={cn(
                    "h-5 w-5 rounded-full flex items-center justify-center shrink-0",
                    idVerified ? "bg-success text-white" : "border border-border-strong"
                  )}>
                    {idVerified && <CheckCircle2 className="h-3.5 w-3.5" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">I have visually verified the guest&apos;s ID</p>
                    <p className="text-[11px] text-muted-foreground">Photo matches, name matches, expiry valid</p>
                  </div>
                </button>
                {isForeign && (
                  <div className="rounded-md bg-warning-soft border border-warning/30 p-3 text-xs">
                    <p className="font-semibold text-warning inline-flex items-center gap-1"><AlertCircle className="h-3 w-3" />Foreign national · Form C required</p>
                    <p className="text-muted-foreground mt-1">Form C will be auto-submitted to FRRO within 24 hours of check-in.</p>
                  </div>
                )}
              </div>
            )}

            {step === 0 && !idOnFile && (
              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Step 1 · Collect Guest KYC</p>
                  <h2 className="text-base font-semibold">ID documents not on file — capture now</h2>
                </div>

                {guestDetails}

                {/* Compliance banner */}
                <div className="rounded-md bg-warning-soft border border-warning/30 p-3 text-xs flex items-start gap-2">
                  <AlertCircle className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-warning">Pre-booked from <span className="underline">{reservation.source}</span> · No ID was collected at booking time.</p>
                    <p className="text-muted-foreground mt-0.5">
                      Per Indian Govt regulations, valid photo ID is mandatory for hotel registration.
                      {isForeign && " Passport + Visa + Form C are mandatory for foreign nationals (FRRO submission within 24 h)."}
                    </p>
                  </div>
                </div>

                {/* Capture on the mobile app — fills the slots below */}
                {syncState !== "done" ? (
                  <div className="rounded-md border border-border bg-surface-sunken/40 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <span className="h-7 w-7 rounded-md bg-brand-soft text-brand-soft-foreground flex items-center justify-center shrink-0">
                          <Smartphone className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="text-sm font-medium">Capture on the mobile app</p>
                          <p className="text-xs text-muted-foreground">Send this arrival to the tablet — staff capture the face photo, ID &amp; signature there. They drop straight into the slots below.</p>
                          {syncErr && <p className="text-[11px] text-danger mt-1">{syncErr}</p>}
                        </div>
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={startSync}>
                        <Smartphone className="h-4 w-4" />
                        {syncState === "creating" || syncState === "waiting" ? "View sync status" : "Sync to mobile app"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-md border border-success/40 bg-success-soft/30 p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-5 w-5 text-success" />
                      <span className="font-medium">Captured from tablet</span>
                      <span className="text-muted-foreground">· filled in below</span>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setSyncDialogOpen(true)}>View</Button>
                  </div>
                )}

                {/* ID type + number */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">ID type <span className="text-danger">*</span></Label>
                    <Select value={collectedIdType} onChange={e => { setCollectedIdType(e.target.value); setIdBackFile(null); }}>
                      {isForeign ? (
                        <>
                          <option>Passport</option>
                          <option>Driving License (Intl.)</option>
                        </>
                      ) : (
                        <>
                          <option>Aadhaar</option>
                          <option>PAN</option>
                          <option>Passport</option>
                          <option>Voter ID</option>
                          <option>Driving License</option>
                        </>
                      )}
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">ID number <span className="text-danger">*</span></Label>
                    <Input
                      value={collectedIdNumber}
                      onChange={e => setCollectedIdNumber(e.target.value.toUpperCase())}
                      placeholder={
                        collectedIdType === "Aadhaar" ? "XXXX XXXX XXXX" :
                        collectedIdType === "PAN" ? "ABCDE1234F" :
                        collectedIdType === "Passport" ? "Z1234567" :
                        "Enter ID number"
                      }
                      className={cn("font-mono tabular", idLengthOk && "border-success/60")}
                      maxLength={collectedIdType === "Aadhaar" ? 14 : 20}
                    />
                    {collectedIdNumber && !idLengthOk && (
                      <p className="text-[10px] text-danger">
                        Expected at least {minDigits[collectedIdType] ?? 6} characters for {collectedIdType}
                      </p>
                    )}
                  </div>
                </div>

                {/* Document uploads (front + back) */}
                <div className="grid grid-cols-2 gap-3">
                  <KYCUploadSlot
                    label={`${collectedIdType} — front`}
                    icon={ScanLine}
                    file={idFrontFile}
                    onChange={f => setIdFrontFile(f)}
                    required
                  />
                  {needsBackSide ? (
                    <KYCUploadSlot
                      label={`${collectedIdType} — back`}
                      icon={ScanLine}
                      file={idBackFile}
                      onChange={f => setIdBackFile(f)}
                      required
                    />
                  ) : (
                    <div className="rounded-md border border-dashed border-border p-3 text-center flex flex-col items-center justify-center gap-1 opacity-50">
                      <FileCheck2 className="h-5 w-5 text-muted-foreground" />
                      <p className="text-[11px] text-muted-foreground">Back side not required for {collectedIdType}</p>
                    </div>
                  )}
                </div>

                {/* Live face capture + signature */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs inline-flex items-center gap-1.5">
                      <Camera className="h-3.5 w-3.5 text-muted-foreground" />
                      Live face photo <span className="text-danger">*</span>
                    </Label>
                    <PhotoCapture label="Live face photo" aspect="square" value={facePhoto} onChange={setFacePhoto} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs inline-flex items-center gap-1.5">
                      <Pen className="h-3.5 w-3.5 text-muted-foreground" />
                      Digital signature <span className="text-danger">*</span>
                    </Label>
                    <SignaturePad height={150} value={signature} onChange={setSignature} />
                  </div>
                </div>

                {/* Consent */}
                <button
                  type="button"
                  onClick={() => setKycConsent(!kycConsent)}
                  className={cn(
                    "w-full rounded-md border-2 p-3 text-left transition-colors flex items-start gap-3",
                    kycConsent ? "border-success bg-success-soft" : "border-dashed border-border hover:bg-surface-sunken"
                  )}
                >
                  <div className={cn(
                    "h-5 w-5 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                    kycConsent ? "bg-success text-white" : "border border-border-strong"
                  )}>
                    {kycConsent && <CheckCircle2 className="h-3.5 w-3.5" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Guest consent &amp; verification</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      I confirm the documents are originals, the face photo matches the ID, and the guest has consented to KYC retention per DPDP Act 2023.
                    </p>
                  </div>
                </button>

                {/* Live status pill */}
                <div className={cn(
                  "rounded-md px-3 py-2 text-xs inline-flex items-center gap-2 transition-colors",
                  kycComplete ? "bg-success-soft text-success" : "bg-surface-sunken text-muted-foreground"
                )}>
                  {kycComplete ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                  {kycComplete ? "KYC complete · ready to proceed" : "Complete all required fields to continue"}
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Step 2 · Assign Room &amp; Key Card</p>
                  <h2 className="text-base font-semibold">
                    {isUnassigned ? `Assign an available ${reservation.roomType} room` : `Room ${reservation.roomNumber} is pre-assigned`}
                  </h2>
                </div>
                <div className="rounded-md border border-border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-semibold tabular">{assignedRoom || "—"}</p>
                      <p className="text-xs text-muted-foreground">{reservation.roomType}{selectedRoomObj ? ` · Floor ${selectedRoomObj.floor}` : ""} · {reservation.nights} nights</p>
                    </div>
                    {!assignedRoom
                      ? <Badge tone="warning">Pick a room</Badge>
                      : selectedHkPending
                        ? <Badge tone="warning"><AlertCircle className="h-3 w-3" />Housekeeping pending</Badge>
                        : <Badge tone="success"><CheckCircle2 className="h-3 w-3" />Inspected · Ready</Badge>}
                  </div>
                  <div className="mt-3 pt-3 border-t border-border">
                    <Label className="text-xs">{isUnassigned ? `Available ${reservation.roomType} rooms` : "Reassign to another room (optional)"}</Label>
                    <Select value={assignedRoom} onChange={e => setAssignedRoom(e.target.value)} className="mt-1">
                      <option value="">Select an available {reservation.roomType} room…</option>
                      {availableForType.map(r => (
                        <option key={r.id} value={r.number}>
                          Room {r.number} · {r.type} · Floor {r.floor}{
                            r.number === reservation.roomNumber ? " (pre-assigned)"
                            : r.status === "dirty" ? " · needs cleaning"
                            : r.status === "cleaning" ? " · being cleaned"
                            : ""
                          }
                        </option>
                      ))}
                    </Select>
                    {selectedHkPending && (
                      <p className="text-xs text-warning mt-1.5 inline-flex items-start gap-1">
                        <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                        Room {assignedRoom} is {selectedRoomObj?.status === "dirty" ? "not yet cleaned" : "being cleaned"} — housekeeping is still pending. You can assign it now; HK will be notified to prioritise before the guest arrives.
                      </p>
                    )}
                    {availableForType.length === 0 && (
                      <p className="text-xs text-warning mt-1.5">No {reservation.roomType} rooms are free right now (all booked, being cleaned, or out of order) — free one up or change the room type.</p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setKeyCardEncoded(!keyCardEncoded)}
                  className={cn(
                    "w-full rounded-md border-2 p-3 text-left transition-colors flex items-center gap-3",
                    keyCardEncoded ? "border-success bg-success-soft" : "border-dashed border-border hover:bg-surface-sunken"
                  )}
                >
                  <KeyRound className={cn("h-5 w-5 shrink-0", keyCardEncoded ? "text-success" : "text-muted-foreground")} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{keyCardEncoded ? "Key card encoded successfully" : "Encode RFID key card"}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {keyCardEncoded
                        ? `Room ${assignedRoom} access enabled · valid until ${formatTime(reservation.checkOut)}`
                        : "Tap RFID reader · device should beep twice"}
                    </p>
                  </div>
                  {keyCardEncoded && <CheckCircle2 className="h-4 w-4 text-success" />}
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Step 3 · Settle Outstanding Balance</p>
                  <h2 className="text-base font-semibold">
                    {reservation.balance > 0 ? `Collect ${money(reservation.balance)} from guest` : "Already paid in advance"}
                  </h2>
                </div>

                <div className="rounded-md border border-border p-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Total Booking</span><span className="tabular">{money(reservation.total)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Advance Received</span><span className="tabular text-success">- {money(reservation.advance)}</span></div>
                  <div className="flex justify-between border-t border-border pt-2 mt-1">
                    <span className="font-semibold">Outstanding</span>
                    <span className={cn("font-bold tabular text-base", reservation.balance > 0 ? "text-warning" : "text-success")}>
                      {money(reservation.balance)}
                    </span>
                  </div>
                </div>

                {reservation.balance > 0 && (
                  <>
                    {/* Partial advance presets */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Collect now (partial allowed)</Label>
                        <p className="text-[11px] text-muted-foreground">Tap a preset or enter custom amount</p>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                        {[
                          { label: "Skip · 0%",    pct: 0 },
                          { label: "25%",          pct: 25 },
                          { label: "50%",          pct: 50 },
                          { label: "75%",          pct: 75 },
                          { label: "Full · 100%",  pct: 100 },
                        ].map(p => {
                          const amt = Math.round(reservation.balance * p.pct / 100);
                          const isActive = Math.abs(collectAmount - amt) < 5;
                          return (
                            <button
                              key={p.pct}
                              type="button"
                              onClick={() => setCollectAmount(amt)}
                              className={cn(
                                "h-12 rounded-md border text-xs font-medium transition-colors flex flex-col items-center justify-center gap-0.5",
                                isActive
                                  ? "bg-brand text-brand-foreground border-brand"
                                  : "border-border hover:bg-surface-sunken"
                              )}
                            >
                              <span>{p.label}</span>
                              {amt > 0 && <span className="text-[10px] tabular opacity-75">{money(amt)}</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label>Custom amount</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                        <Input
                          type="number"
                          min={0}
                          value={collectAmount}
                          onChange={e => setCollectAmount(Math.max(0, Number(e.target.value)))}
                          className="text-base font-semibold tabular h-11 pl-7"
                        />
                      </div>
                    </div>

                    {/* Remaining balance preview — appears only when partial */}
                    {collectAmount > 0 && collectAmount < reservation.balance && (
                      <div className="rounded-md bg-warning-soft/30 border border-warning/40 p-3 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium inline-flex items-center gap-1.5"><AlertCircle className="h-3.5 w-3.5 text-warning" />Partial advance accepted</span>
                          <span className="text-[10px] text-muted-foreground">deferred to checkout</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Remaining balance</span>
                          <span className="font-bold tabular text-warning text-base">{money(reservation.balance - collectAmount)}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">Guest will be reminded at checkout · folio stays open with balance due</p>
                      </div>
                    )}

                    {/* Skip-payment notice — when user has chosen Skip */}
                    {collectAmount === 0 && (
                      <div className="rounded-md bg-info-soft/30 border border-info/30 p-3 inline-flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-info shrink-0 mt-0.5" />
                        <span className="text-xs">
                          Skipping advance collection · full <span className="font-semibold">{money(reservation.balance)}</span> moves to outstanding balance.
                          Manager approval may be required per property policy.
                        </span>
                      </div>
                    )}

                    {/* Overpayment notice */}
                    {collectAmount > reservation.balance && (
                      <div className="rounded-md bg-success-soft/30 border border-success/30 p-3 inline-flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                        <span className="text-xs">
                          Overpayment by <span className="font-semibold">{money(collectAmount - reservation.balance)}</span> · credited to guest wallet
                        </span>
                      </div>
                    )}

                    {collectAmount > 0 && (
                      <div className="space-y-1.5">
                        <Label>Payment mode</Label>
                        <div className="grid grid-cols-4 gap-1.5">
                          {["UPI", "Cash", "Card", "Net Banking"].map(m => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => { setPaymentMode(m); setPaymentRef(""); }}
                              className={cn(
                                "h-10 rounded-md border text-xs font-medium transition-colors",
                                paymentMode === m ? "bg-brand text-brand-foreground border-brand" : "border-border hover:bg-surface-sunken"
                              )}
                            >
                              {m}
                            </button>
                          ))}
                        </div>

                        {/* Cash needs no reference; UPI / Card / Net Banking must record one. */}
                        {needsRef && (
                          <div className="space-y-1.5 pt-1.5 animate-in">
                            <Label>
                              {PAY_REF_FIELD[paymentMode]?.label ?? "Transaction reference"} <span className="text-danger">*</span>
                            </Label>
                            <Input
                              value={paymentRef}
                              onChange={e => setPaymentRef(e.target.value)}
                              placeholder={PAY_REF_FIELD[paymentMode]?.placeholder ?? "Reference no."}
                              className="h-10 font-mono tabular"
                              autoFocus
                            />
                            <p className="text-[11px] text-muted-foreground">
                              Recorded on the folio &amp; receipt for {paymentMode} reconciliation.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {reservation.balance === 0 && (
                  <div className="rounded-md bg-success-soft border border-success/30 p-3 inline-flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span className="text-sm">No collection needed · paid in full</span>
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Step 4 · Send Welcome Message</p>
                  <h2 className="text-base font-semibold">Notify the guest their stay has begun</h2>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Channels</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "whatsapp", label: "WhatsApp", icon: MessageCircle },
                      { id: "email", label: "Email", icon: Mail },
                      { id: "sms", label: "SMS", icon: Send },
                    ].map(c => {
                      const Icon = c.icon;
                      const on = channels.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => toggleChannel(c.id)}
                          className={cn(
                            "h-12 rounded-md border-2 text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors",
                            on ? "bg-brand-soft border-brand text-brand-soft-foreground" : "border-border hover:bg-surface-sunken"
                          )}
                        >
                          <Icon className="h-4 w-4" />{c.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="rounded-md bg-surface-sunken p-3 text-xs">
                  <p className="font-semibold mb-1">Message preview (WhatsApp template)</p>
                  <p className="text-muted-foreground leading-relaxed">
                    Dear <span className="text-foreground font-medium">{reservation.guestName.split(" ")[0]}</span>, welcome to {name}! You&apos;re checked into <span className="text-foreground font-medium">Room {assignedRoom}</span> until {formatTime(reservation.checkOut)}. Wi-Fi: PearlGuest (OTP via SMS). Concierge: dial 0 from your room. Enjoy your stay!
                  </p>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Step 5 · Finalize Check-in</p>
                  <h2 className="text-base font-semibold">Ready to complete</h2>
                </div>
                <div className="rounded-md border border-success/40 bg-success-soft/30 p-4 space-y-2">
                  <SummaryRow
                    icon={IdCard}
                    label={idOnFile ? "ID verified" : "ID collected"}
                    value={idOnFile
                      ? `${guest?.idType} ${guest?.idNumber}`
                      : `${collectedIdType} ${collectedIdNumber}${facePhoto ? " · face ✓" : ""}${signature ? " · signed ✓" : ""}`}
                  />
                  <SummaryRow icon={BedDouble} label="Room assigned" value={`Room ${assignedRoom} · ${reservation.roomType}`} />
                  <SummaryRow icon={KeyRound} label="Key card" value="Encoded · access enabled" />
                  <SummaryRow
                    icon={CreditCard}
                    label="Payment"
                    value={reservation.balance === 0
                      ? "Paid in full"
                      : collectAmount === 0
                        ? `Skipped advance · ${money(reservation.balance)} outstanding`
                        : collectAmount < reservation.balance
                          ? `Partial ${money(collectAmount)} via ${paymentMode}${paymentMode !== "Cash" && paymentRef ? ` · ref ${paymentRef}` : ""} · ${money(reservation.balance - collectAmount)} due at checkout`
                          : `Collecting ${money(collectAmount)} via ${paymentMode}${paymentMode !== "Cash" && paymentRef ? ` · ref ${paymentRef}` : ""}`}
                  />
                  <SummaryRow icon={Send} label="Welcome via" value={channels.length === 0 ? "Skipped" : channels.map(c => c[0].toUpperCase() + c.slice(1)).join(" + ")} />
                </div>
                <p className="text-xs text-muted-foreground">
                  On confirm: room status → <span className="font-medium text-foreground">Occupied</span>, folio opens, audit log entry created, HK informed.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-border bg-surface-elevated flex items-center justify-between">
            <div className="flex items-center gap-2">
              {flowIds.indexOf(step) > 0 && (
                <Button variant="outline" size="sm" onClick={() => setStep(flowIds[flowIds.indexOf(step) - 1] as Step)}>
                  <ChevronLeft className="h-3.5 w-3.5" />Back
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            </div>
            {flowIds.indexOf(step) < flowIds.length - 1 ? (
              <Button
                disabled={!canAdvance()}
                onClick={() => setStep(flowIds[flowIds.indexOf(step) + 1] as Step)}
              >
                Next<ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button variant="success" onClick={handleComplete}>
                <CheckCircle2 className="h-4 w-4" />Complete Check-in
              </Button>
            )}
          </div>
        </Card>
      </div>

      {syncDialogOpen && syncState !== "idle" && (
        <MobileSyncDialog
          state={syncState}
          reference={reservation.bookingNo}
          docs={syncDocs}
          errorMessage={syncErr}
          onCancel={cancelSync}
          onHide={() => setSyncDialogOpen(false)}
          onDone={() => setSyncDialogOpen(false)}
        />
      )}
    </>
  );
}

function SummaryRow({ icon: Icon, label, value }: { icon: typeof IdCard; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <Icon className="h-4 w-4 text-success shrink-0" />
      <span className="text-xs text-muted-foreground w-28">{label}</span>
      <span className="font-medium flex-1 truncate">{value}</span>
    </div>
  );
}

// ID document upload slot — drag/click to upload a file, shows preview
function KYCUploadSlot({
  label, icon: Icon, file, onChange, required,
}: {
  label: string;
  icon: typeof ScanLine;
  file: string | null;
  onChange: (file: string | null) => void;
  required?: boolean;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const handleFile = (f: File | null) => {
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => onChange(typeof reader.result === "string" ? reader.result : "captured");
    reader.readAsDataURL(f);
  };
  if (file) {
    return (
      <div className="rounded-md border-2 border-success bg-success-soft/40 p-2 relative">
        <div className="h-24 rounded-md bg-white/60 border border-success/30 overflow-hidden flex items-center justify-center">
          { }
          {file.startsWith("data:image") ? (
            <img src={file} alt={label} className="h-full w-full object-cover" />
          ) : (
            <FileCheck2 className="h-8 w-8 text-success" />
          )}
        </div>
        <div className="mt-2 flex items-center justify-between">
          <p className="text-[11px] text-success font-medium inline-flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />{label}
          </p>
          <button type="button" onClick={() => onChange(null)} className="text-[10px] text-muted-foreground hover:text-foreground underline">
            Replace
          </button>
        </div>
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      className="rounded-md border-2 border-dashed border-border hover:border-brand hover:bg-brand-soft/20 p-3 text-center flex flex-col items-center justify-center gap-1.5 transition-colors min-h-[124px] group"
    >
      <Icon className="h-6 w-6 text-muted-foreground group-hover:text-brand transition-colors" />
      <p className="text-[11px] font-medium leading-tight">
        {label} {required && <span className="text-danger">*</span>}
      </p>
      <p className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
        <Upload className="h-2.5 w-2.5" />Click or drop image
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.pdf"
        capture="environment"
        className="hidden"
        onChange={e => handleFile(e.target.files?.[0] ?? null)}
      />
    </button>
  );
}

// ===================== EXPRESS WALK-IN MODAL =====================

// Rate-plan catalog for the walk-in selector (display: code/name/description).
// Meal INCLUSIONS + PRICES are the configured ones from Configuration → Rate
// Plans, fetched at runtime and keyed by plan code (see mealCfg below).
// EP = Room only · CP = Room + Breakfast · MAP = Room + Breakfast + Dinner · AP = All meals
type RatePlanCode = "EP" | "CP" | "MAP" | "AP";
type RatePlan = {
  code: RatePlanCode;
  name: string;
  description: string;
  includes: string[];           // human-readable meal list (display only)
};
const RATE_PLANS: RatePlan[] = [
  { code: "EP",  name: "European Plan",          description: "Room only · no meals",                           includes: [] },
  { code: "CP",  name: "Continental Plan",       description: "Room + breakfast",                              includes: ["Continental breakfast"] },
  { code: "MAP", name: "Modified American Plan", description: "Room + breakfast + dinner",                     includes: ["Continental breakfast", "Buffet dinner"] },
  { code: "AP",  name: "American Plan",          description: "Room + all meals (breakfast / lunch / dinner)", includes: ["Continental breakfast", "Buffet lunch", "Buffet dinner"] },
];

// Per-plan meal inclusions + prices from Configuration, keyed by plan code.
type WalkinMealCfg = { inclB: boolean; inclL: boolean; inclD: boolean; breakfastPrice: number; lunchPrice: number; dinnerPrice: number };
const EMPTY_MEAL_CFG: WalkinMealCfg = { inclB: false, inclL: false, inclD: false, breakfastPrice: 0, lunchPrice: 0, dinnerPrice: 0 };

type PayMode = "Cash" | "Card" | "UPI" | "Bank" | "Online";
type AdvancePayment = {
  amount: number;
  mode: PayMode;
  cardType?: "Visa" | "MasterCard" | "Amex" | "RuPay";
  cardLast4?: string;
  authCode?: string;
  upiVPA?: string;
  bankName?: string;
  reference?: string;          // catch-all: UPI ref / NEFT UTR / Cash receipt #
  txnId?: string;
  gateway?: "Razorpay" | "PayU" | "Cashfree" | "Stripe";
};

function WalkInModal({
  onClose, onStart, initialData,
}: {
  onClose: () => void;
  onStart: (r: Reservation) => void;
  initialData?: WalkInResume | null;
}) {
  // ----- guest basics (seeded from a resumed draft when present) -----
  const [name, setName] = React.useState(initialData?.name ?? "");
  const [phone, setPhone] = React.useState(initialData?.phone ?? "");
  const [email, setEmail] = React.useState(initialData?.email ?? "");
  const [nationality, setNationality] = React.useState(initialData?.nationality ?? "India");
  // Fuller personal details, matching the New Booking "Create New Guest" form.
  const [dob, setDob] = React.useState("");
  const [gender, setGender] = React.useState("Male");
  const [address, setAddress] = React.useState("");
  // Full new-guest data (incl. photo / ID scans / signature) captured in the
  // create form — carried onto the reservation so check-in pre-fills, not re-captures.
  const [newGuest, setNewGuest] = React.useState<NewGuestData | null>(null);

  // ----- existing-guest lookup (mirrors the New Booking wizard's step 1) -----
  // A resumed draft already has its fields loaded → start in "create" (review) mode.
  const guests = useGuests();
  const [guestMode, setGuestMode] = React.useState<"search" | "create">(initialData ? "create" : "search");
  const [guestSearch, setGuestSearch] = React.useState("");
  const filteredGuests = guests
    .filter(g => `${g.name} ${g.phone} ${g.email}`.toLowerCase().includes(guestSearch.toLowerCase()))
    .slice(0, 5);

  // ----- stay -----
  const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in local TZ — blocks past dates
  // ISO date helper (UTC-safe day math, matches the booking wizard).
  const addDays = (iso: string, days: number) => {
    const d = new Date(iso);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  };
  const [checkInDate, setCheckInDate] = React.useState(initialData?.checkInDate ?? today);
  // Check-out starts EMPTY for a fresh walk-in so it is deliberately entered;
  // a resumed draft that carries `nights` still seeds the right range.
  const [checkOutDate, setCheckOutDate] = React.useState(
    initialData?.nights ? addDays(initialData.checkInDate ?? today, Math.max(1, initialData.nights)) : "",
  );
  // A valid checkout is non-empty and strictly after check-in. Until then
  // `nights` is 0 so pricing/breakdown/totals resolve to 0 instead of NaN.
  const hasCheckout = !!checkOutDate && checkOutDate > checkInDate;
  const nights = hasCheckout
    ? Math.max(1, Math.round((new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / 86400000))
    : 0;
  const minCheckout = addDays(checkInDate, 1); // checkout must be at least 1 day after check-in
  // Auto-push checkout forward if check-in moves on/past it — but only when a
  // checkout is already set. An empty checkout stays empty.
  const handleCheckInChange = (val: string) => {
    setCheckInDate(val);
    if (checkOutDate && checkOutDate <= val) setCheckOutDate(addDays(val, Math.max(1, nights)));
  };
  const handleCheckOutChange = (val: string) => {
    if (!val) { setCheckOutDate(""); return; }
    if (val <= checkInDate) setCheckOutDate(addDays(checkInDate, 1));
    else setCheckOutDate(val);
  };
  const [adults, setAdults] = React.useState(initialData?.adults ?? 1);
  const [children, setChildren] = React.useState(initialData?.children ?? 0);

  // ----- seasonal / holiday per-day pricing (configured in Setup) -----
  const [seasons, setSeasons] = React.useState<Season[]>([]);
  const [holidays, setHolidays] = React.useState<Holiday[]>([]);
  React.useEffect(() => {
    apiGet<Array<Season & { active?: boolean }>>("/seasons")
      .then(r => Array.isArray(r) && setSeasons(r.filter(s => s.active !== false).map(s => ({ from: s.from, to: s.to, multiplier: Number(s.multiplier) || 1 }))))
      .catch(() => {});
    apiGet<Array<{ date: string; surchargePct?: number }>>("/holidays")
      .then(r => Array.isArray(r) && setHolidays(r.map(h => ({ date: h.date, surchargePct: Number(h.surchargePct) || 0 }))))
      .catch(() => {});
  }, []);

  // Room-type occupancy limits + extra-adult rates (for the auto extra-person charge).
  const [roomTypeDefs, setRoomTypeDefs] = React.useState<Array<{ name: string; baseTariff?: number; maxAdults?: number; maxChildren?: number; extraAdultRate?: number }>>([]);
  React.useEffect(() => {
    apiGet<Array<{ name: string; baseTariff?: number; maxAdults?: number; maxChildren?: number; extraAdultRate?: number }>>("/room-types")
      .then(r => Array.isArray(r) && setRoomTypeDefs(r))
      .catch(() => {});
  }, []);

  // ----- room -----
  const rooms = useRooms();
  // Fetch room availability for the walk-in's stay window — backend cross-checks
  // individual bookings AND group rooming so the same room can't be offered twice.
  const [walkInAvailRooms, setWalkInAvailRooms] = React.useState<{ number: string; available: boolean }[]>([]);
  React.useEffect(() => {
    const from = (checkInDate ?? "").slice(0, 10);
    const to   = (checkOutDate ?? "").slice(0, 10);
    if (!from || !to || from >= to) return;
    apiGet<typeof walkInAvailRooms>(`/room-availability?from=${from}&to=${to}`)
      .then(setWalkInAvailRooms).catch(() => {});
  }, [checkInDate, checkOutDate]);
  const availableRooms = React.useMemo(() => {
    if (!walkInAvailRooms.length) return rooms.filter(r => r.status === "available");
    const avail = new Set(walkInAvailRooms.filter(r => r.available).map(r => r.number));
    return rooms.filter(r => avail.has(r.number));
  }, [rooms, walkInAvailRooms]);
  // Booking-style: pick a room TYPE first, then a specific available room of that
  // type. Nothing is pre-selected — the guest chooses both.
  const [selectedRoomType, setSelectedRoomType] = React.useState(initialData?.roomType ?? "");
  // Available room types (only those with a free room) + count and min rate.
  const typeBaseTariff = React.useCallback((name: string) =>
    roomTypeDefs.find(t => t.name === name)?.baseTariff
      ?? (name === "Suite" ? 1200 : name === "King" ? 850 : name === "Deluxe" ? 650 : 450),
    [roomTypeDefs]);
  const availableTypes = React.useMemo(() => {
    const m = new Map<string, { name: string; count: number }>();
    availableRooms.forEach(r => {
      const e = m.get(r.type) ?? { name: r.type, count: 0 };
      e.count++;
      m.set(r.type, e);
    });
    return Array.from(m.values()).map(e => ({ ...e, rate: typeBaseTariff(e.name) }));
  }, [availableRooms, typeBaseTariff]);

  // Auto extra-person charge for ADULTS beyond the room type's max (children never charged) — matches booking.
  const selectedType = roomTypeDefs.find(t => t.name === selectedRoomType);
  // Per-night rate is the selected TYPE's base tariff (room is assigned later, at check-in) — exactly like the booking wizard.
  const typeRate = selectedRoomType ? typeBaseTariff(selectedRoomType) : 0;
  const extraOcc = extraOccupancyCharge({
    adults, children,
    maxAdults: selectedType?.maxAdults ?? Infinity,
    maxChildren: Infinity,
    extraAdultRate: selectedType?.extraAdultRate ?? 0,
    extraChildRate: 0,
    nights,
  });
  // The extra-bed charge for adults beyond the room max applies ONLY when the
  // "Extra bed" toggle (shown on Pax & Room) is enabled — opt-in, like booking.
  const [extraBedForExtra, setExtraBedForExtra] = React.useState(false);
  const extraBedCharge = (extraOcc.extraAdults > 0 && extraBedForExtra) ? extraOcc.total : 0;

  // Occupancy is hard-capped at the selected room type's included adults/children.
  // The opt-in "Extra bed" toggle lifts the ADULT cap by one (and charges the rate).
  // Before a room is picked, fall back to a neutral 6/4.
  const inclAdults = selectedType?.maxAdults ?? 6;
  const inclChildren = selectedType?.maxChildren ?? 4;
  const adultsMax = inclAdults + (extraBedForExtra ? 1 : 0);
  const childrenMax = inclChildren;
  const enableExtraBed = (on: boolean) => {
    setExtraBedForExtra(on);
    if (on) setAdults(a => Math.max(a, inclAdults + 1));   // fill the extra bed so the charge shows
  };
  React.useEffect(() => {
    setAdults(a => Math.min(a, adultsMax));
    setChildren(c => Math.min(c, childrenMax));
  }, [adultsMax, childrenMax]);

  // ----- per-day room price breakdown (seasonal / weekend / holiday) -----
  // Drives roomSubtotal so the walk-in matches booking's nightly pricing.
  const breakdown = React.useMemo(
    () => buildNightlyBreakdown(checkInDate, nights, typeRate, seasons, holidays, WEEKEND_MULTIPLIER),
    [checkInDate, nights, typeRate, seasons, holidays],
  );

  // ----- stay add-ons -----
  const [earlyCheckIn, setEarlyCheckIn] = React.useState(false);
  const [lateCheckOut, setLateCheckOut] = React.useState(false);


  // ----- rate plan -----
  const [ratePlanCode, setRatePlanCode] = React.useState<RatePlanCode>((initialData?.ratePlan as RatePlanCode) ?? "EP");
  const ratePlan = RATE_PLANS.find(r => r.code === ratePlanCode)!;

  // Meal inclusions + prices per plan code, from Configuration → Rate Plans.
  const [mealCfg, setMealCfg] = React.useState<Record<string, WalkinMealCfg>>({});
  React.useEffect(() => {
    apiGet<{ code: string; inclBreakfast?: boolean; inclLunch?: boolean; inclDinner?: boolean; breakfastPrice?: number; lunchPrice?: number; dinnerPrice?: number }[]>("/rate-plans")
      .then(rows => {
        const m: Record<string, WalkinMealCfg> = {};
        rows.forEach(r => { m[r.code] = { inclB: !!r.inclBreakfast, inclL: !!r.inclLunch, inclD: !!r.inclDinner, breakfastPrice: r.breakfastPrice ?? 0, lunchPrice: r.lunchPrice ?? 0, dinnerPrice: r.dinnerPrice ?? 0 }; });
        setMealCfg(m);
      }).catch(() => {});
  }, []);
  // Configured per-guest-per-night meal price for a plan code.
  const planMealPerGuestNight = (code: string) => mealPerNightPerGuest(mealCfg[code] ?? EMPTY_MEAL_CFG);

  // Selecting a plan only sets the code. The plan's included meals are priced
  // from Configuration (planMealsTotal below); the F&B section is manual extras.
  const applyRatePlan = (code: RatePlanCode) => setRatePlanCode(code);

  // ----- advance payment -----
  const [pay, setPay] = React.useState<AdvancePayment>({ amount: 0, mode: "UPI" });
  const [instructions, setInstructions] = React.useState("");
  const setP = <K extends keyof AdvancePayment>(k: K, v: AdvancePayment[K]) => setPay(p => ({ ...p, [k]: v }));
  const [customAdvance, setCustomAdvance] = React.useState(false);   // "Custom" advance toggle → reveals an amount input

  // ----- receipt preview -----
  const [showReceipt, setShowReceipt] = React.useState(false);

  // ----- mobile capture sync -----
  type SyncedBooking = {
    verification_status?: string;
    documents?: {
      guest_photo?: string | null;
      id_front?: string | null;
      id_back?: string | null;
      signature?: string | null;
    };
  };
  const [syncState, setSyncState] = React.useState<"idle" | "creating" | "waiting" | "done" | "error">(initialData?.docs ? "done" : "idle");
  const [syncBooking, setSyncBooking] = React.useState<{ id: number; bookingNo: string } | null>(initialData ? { id: initialData.bookingId, bookingNo: initialData.bookingNo } : null);
  const [syncDocs, setSyncDocs] = React.useState<SyncedBooking["documents"]>(initialData?.docs ?? undefined);
  const [syncErr, setSyncErr] = React.useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  // ----- wizard step (1–6), booking-wizard style -----
  const [step, setStep] = React.useState(1);
  const STEPS = [
    { n: 1, title: "Guest", icon: User, desc: "Name, contact & captures" },
    { n: 2, title: "Dates", icon: Calendar, desc: "Check-in & nights" },
    { n: 3, title: "Pax & Room", icon: BedIcon, desc: "Adults, children & room" },
    { n: 4, title: "Rate & Add-ons", icon: UtensilsCrossed, desc: "Plan & stay extras" },
    { n: 5, title: "Payment", icon: CreditCard, desc: "Advance & mode" },
    { n: 6, title: "Confirm", icon: CheckCircle2, desc: "Review & start" },
  ];

  // ----- pricing -----
  // Per-day seasonal/weekend/holiday total (was a flat rate × nights).
  const roomSubtotal = breakdown.total;
  const earlyFee = earlyCheckIn ? 500 : 0;     // ₹500 flat
  const lateFee = lateCheckOut ? 500 : 0;      // ₹500 flat
  // Plan meals: configured meal prices × guests × nights (Configuration → Rate Plans).
  const ratePlanSupplement = planMealPerGuestNight(ratePlanCode) * (adults + children) * nights;
  const extras = earlyFee + lateFee + ratePlanSupplement + extraBedCharge;
  const subtotal = roomSubtotal + extras;
  const tax = Math.round(subtotal * 0.05);
  const grandTotal = subtotal + tax;
  const balance = Math.max(0, grandTotal - (pay.amount || 0));

  // Default advance suggestion = 30% on first nights compute
  React.useEffect(() => {
    if (!customAdvance && pay.amount === 0 && grandTotal > 0) {
      setPay(p => ({ ...p, amount: Math.round(grandTotal * 0.3) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grandTotal]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); };
  }, [onClose]);

  // ----- validation -----
  const advanceModeValid =
    pay.amount <= 0 ||
    pay.mode === "Cash" ||
    (pay.mode === "Card" && !!pay.cardLast4 && pay.cardLast4.length === 4) ||
    (pay.mode === "UPI" && !!pay.upiVPA && pay.upiVPA.includes("@")) ||
    (pay.mode === "Bank" && !!pay.bankName && !!pay.reference) ||
    (pay.mode === "Online" && !!pay.txnId);
  const valid = name.trim() !== "" && isValidPhone(phone) && isValidEmail(email) && selectedRoomType !== "" && adults >= 1 && nights >= 1 && advanceModeValid;

  // ----- per-step gating: Next is disabled until the current step's required
  // fields are valid. The final Start stays gated on the full `valid` above. -----
  const canNext = () => {
    if (step === 1) return name.trim() !== "" && isValidPhone(phone) && isValidEmail(email);
    if (step === 2) return hasCheckout;
    if (step === 3) return !!selectedRoomType && adults >= 1;
    if (step === 5) return advanceModeValid;
    return true;
  };

  // ----- generated booking number -----
  const seed = name.length + phone.length + nights + typeRate;
  const bookingNo = syncBooking?.bookingNo ?? `WK${100000 + (seed % 9000)}`;
  const receiptNo = `ADV-2026-${bookingNo.slice(2)}`;

  const start = async () => {
    if (!selectedRoomType) return;
    // A first-time guest entered via "Create New Guest" only lived in component
    // state — persist them to the registry now (same as the booking wizard) so
    // the walk-in actually creates a reusable guest profile, not just a booking
    // row with a bare name. Resilient: a failure here still lets check-in proceed.
    if (newGuest) await saveNewGuest(newGuest);
    const ci = new Date(checkInDate + "T12:00:00");
    const co = new Date(ci);
    co.setDate(co.getDate() + nights);
    co.setHours(11, 0, 0, 0);
    const reservation = {
      id: `walkin-${bookingNo.slice(2)}`,
      bookingNo,
      guestName: name.trim(),
      roomNumber: "Unassigned",      // a specific room is assigned during check-in
      roomType: selectedRoomType,
      checkIn: ci.toISOString(),
      checkOut: co.toISOString(),
      nights,
      adults,
      children,
      vip: false,
      source: "Walk-in" as BookingSource,
      paymentStatus: balance === 0 ? "paid" : pay.amount > 0 ? "partial" : "unpaid",
      total: grandTotal,
      advance: pay.amount,
      balance,
      bookedBy: "Reception · Walk-in",
      ratePlan: ratePlanCode, // EP / CP / MAP / AP from selected plan
      // KYC captured in the Create-New-Guest form flows to the check-in process
      // so staff confirm rather than re-capture.
      ...(newGuest ? {
        documents: {
          guest_photo: newGuest.photo ?? "",
          id_front: newGuest.idFront ?? "",
          id_back: newGuest.idBack ?? "",
          signature: newGuest.signature ?? "",
        },
        identity: { id_type: newGuest.idType, id_number: newGuest.idNumber, address: newGuest.address, phone: newGuest.phone, email: newGuest.email, nationality: newGuest.nationality, dob: newGuest.dob, gender: newGuest.gender },
      } : {}),
    } as unknown as Reservation;
    onStart(reservation);
  };

  // "Sync to mobile app" — create the walk-in as a draft booking now so it shows
  // on the tablet for document capture, then poll until the app uploads them.
  const requestWalkInSync = async () => {
    // Already running/finished — just re-open the status dialog.
    if (syncState === "creating" || syncState === "waiting" || syncState === "done") {
      setDialogOpen(true);
      return;
    }
    if (!name.trim() || !isValidPhone(phone)) {
      setSyncErr("Enter the guest's name and phone first.");
      return;
    }
    if (!selectedRoomType) {
      setSyncErr("Pick a room type first.");
      return;
    }
    setSyncErr(null);
    setSyncDocs(undefined);
    setDialogOpen(true);
    setSyncState("creating");
    const ci = new Date(checkInDate + "T12:00:00");
    const co = new Date(ci);
    co.setDate(co.getDate() + nights);
    co.setHours(11, 0, 0, 0);
    const payload = buildWalkInSyncBooking({
      bookingNo,
      guestName: name.trim(),
      phone, email, nationality,   // saved as draftData so an abandoned walk-in resumes fully
      roomNumber: "Unassigned",      // assigned during check-in
      roomType: selectedRoomType,
      checkIn: ci.toISOString(),
      checkOut: co.toISOString(),
      nights,
      adults,
      children,
      ratePlan: ratePlanCode,
      total: grandTotal,
      advance: pay.amount,
    });
    try {
      const created = await apiPost<{ id: number }>("/bookings", payload);
      if (!created?.id) {
        setSyncErr("Couldn't create the booking. Check your connection and try again.");
        setSyncState("error");
        return;
      }
      setSyncBooking({ id: created.id, bookingNo });
      setSyncState("waiting");
    } catch {
      setSyncErr("Couldn't create the booking. Check your connection and try again.");
      setSyncState("error");
    }
  };

  const cancelSync = () => {
    setSyncState("idle");
    setSyncBooking(null);
    setSyncDocs(undefined);
    setSyncErr(null);
    setDialogOpen(false);
  };

  // While waiting, poll the booking until the tablet uploads the documents.
  React.useEffect(() => {
    if (syncState !== "waiting" || !syncBooking) return;
    let stopped = false;
    const poll = async () => {
      try {
        const b = await apiGet<SyncedBooking>(`/bookings/${syncBooking.id}`);
        if (stopped) return;
        setSyncDocs(b?.documents);
        if (b?.verification_status === "synced" && b.documents) {
          setSyncState("done");
          setDialogOpen(true);
        }
      } catch {
        /* keep polling — transient network error */
      }
    };
    poll();
    const timer = setInterval(poll, 3000);
    return () => { stopped = true; clearInterval(timer); };
  }, [syncState, syncBooking]);

  return (
    <>
      <div className="p-4 sm:p-6 lg:p-6 w-full">
        {/* Page header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-display font-medium tracking-tight inline-flex items-center gap-2">
              Express Walk-in Check-in
              <Badge tone="brand"><Zap className="h-3 w-3" />Walk-in</Badge>
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Step {step} of {STEPS.length} · {STEPS[step - 1].desc} · ref <span className="font-mono tabular">{bookingNo}</span>
            </p>
          </div>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
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
                    type="button"
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

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          {/* Step content */}
          <Card className="p-6 min-h-[400px]">
            {/* STEP 1 — Guest */}
            {step === 1 && (
              <div className="space-y-5">
                {/* Search Existing | Create New Guest toggle */}
                <div className="inline-flex rounded-md border border-border bg-surface-sunken p-0.5 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setGuestMode("search")}
                    className={cn(
                      "flex-1 sm:flex-initial h-9 px-4 rounded-md text-sm font-medium transition-colors inline-flex items-center gap-2 justify-center",
                      guestMode === "search" ? "bg-surface text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Search className="h-3.5 w-3.5" />Search Existing
                  </button>
                  <button
                    type="button"
                    onClick={() => setGuestMode("create")}
                    className={cn(
                      "flex-1 sm:flex-initial h-9 px-4 rounded-md text-sm font-medium transition-colors inline-flex items-center gap-2 justify-center",
                      guestMode === "create" ? "bg-surface text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Plus className="h-3.5 w-3.5" />Create New Guest
                  </button>
                </div>

                {/* SEARCH MODE — find a returning guest and pre-fill their details */}
                {guestMode === "search" && (
                  <div className="space-y-5">
                    <div className="space-y-1.5">
                      <Label>Search existing guest</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle-foreground" />
                        <Input
                          placeholder="Phone, name, email, or ID number…"
                          value={guestSearch}
                          onChange={e => setGuestSearch(e.target.value)}
                          className="pl-9"
                          autoFocus
                        />
                      </div>
                    </div>

                    {name.trim() && (
                      <div className="flex items-center gap-3 p-3 rounded-md border-2 border-brand bg-brand-soft">
                        <Avatar name={name.trim()} size={36} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm truncate">{name.trim()}</p>
                            <Badge tone="brand">Selected</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{[phone, email, nationality].filter(Boolean).join(" · ")}</p>
                        </div>
                        <button type="button" onClick={() => setGuestMode("create")} className="text-xs text-brand hover:underline">Edit</button>
                      </div>
                    )}

                    {guestSearch && (
                      <div className="space-y-2">
                        {filteredGuests.length === 0 ? (
                          <div className="rounded-md border border-dashed border-border p-4 text-center">
                            <p className="text-sm text-muted-foreground mb-2">No matches found for &ldquo;{guestSearch}&rdquo;</p>
                            <Button size="sm" onClick={() => setGuestMode("create")}>
                              <Plus className="h-3.5 w-3.5" />Create new guest
                            </Button>
                          </div>
                        ) : filteredGuests.map(g => {
                          const gx = g as { dob?: string; gender?: string; address?: string };
                          const selected = name.trim() === (g.name ?? "").trim() && phone === (g.phone ?? "");
                          return (
                            <button
                              key={g.id}
                              type="button"
                              onClick={() => {
                                setName(g.name ?? "");
                                setPhone(g.phone ?? "");
                                setEmail(g.email ?? "");
                                setNationality(g.nationality ?? "India");
                                setDob(gx.dob ?? "");
                                setGender(gx.gender ?? "Male");
                                setAddress(gx.address ?? "");
                                setNewGuest(null);
                              }}
                              className={cn(
                                "w-full flex items-center gap-3 p-3 rounded-md border text-left transition-colors",
                                selected ? "bg-brand-soft border-brand" : "border-border hover:bg-surface-sunken"
                              )}
                            >
                              <Avatar name={g.name} size={36} vip={g.vip} />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">
                                  {g.name} {g.vip && <Badge tone="brand" className="ml-1">VIP</Badge>}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">{g.phone} · {g.nationality} · {g.lifetimeNights}N lifetime</p>
                              </div>
                              {selected && <CheckCircle2 className="h-5 w-5 text-brand shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <p className="text-[11px] text-muted-foreground pt-2 border-t border-border">
                      First-time visitor? Switch to the{" "}
                      <button type="button" onClick={() => setGuestMode("create")} className="text-foreground font-medium hover:underline">Create New Guest</button>{" "}
                      tab above to enter their details.
                    </p>
                  </div>
                )}

                {/* CREATE MODE — Booking's shared guest form. KYC capture is done later in the check-in process. */}
                {guestMode === "create" && (
                  <div className="mt-1">
                    <NewGuestForm
                      initialData={newGuest ?? { name, phone, email, nationality, dob, gender, address }}
                      onCancel={() => setGuestMode("search")}
                      onSave={data => {
                        setNewGuest(data);
                        setName(data.name);
                        setPhone(data.phone);
                        setEmail(data.email);
                        setNationality(data.nationality);
                        setDob(data.dob);
                        setGender(data.gender);
                        setAddress(data.address);
                        setGuestMode("search");
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* STEP 2 — Dates */}
            {step === 2 && (
              <div className="space-y-5">
                <p className="text-sm text-muted-foreground">One night = 12:00 PM check-in → next-day 11:00 AM checkout</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Check-in</Label>
                    <Input type="date" value={checkInDate} min={today} onChange={e => handleCheckInChange(e.target.value)} className="h-10 tabular" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Check-out</Label>
                    <Input type="date" value={checkOutDate} min={minCheckout > today ? minCheckout : today} onChange={e => handleCheckOutChange(e.target.value)} className="h-10 tabular" />
                    <p className="text-[11px] text-muted-foreground">Must be after check-in · auto-adjusts if you change dates</p>
                  </div>
                </div>

                {!hasCheckout ? (
                  <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground flex items-center gap-3">
                    <Calendar className="h-5 w-5 shrink-0" />
                    Pick a check-out date to see nights &amp; pricing.
                  </div>
                ) : (
                  <>
                    <div className="rounded-md bg-brand-soft text-brand-soft-foreground p-4 flex items-center gap-3">
                      <Calendar className="h-5 w-5" />
                      <div className="text-sm">
                        <span className="font-semibold">{nights} {nights === 1 ? "night" : "nights"}</span> · {new Date(checkInDate).toLocaleDateString(undefined, { day: "2-digit", month: "short", weekday: "short" })} → {new Date(checkOutDate).toLocaleDateString(undefined, { day: "2-digit", month: "short", weekday: "short" })}
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
                  </>
                )}
                {/* Stay add-ons (priced toggle cards, like the booking wizard) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <PricedToggleCard label="Early check-in" hint="Before 12:00 PM · subject to availability" price={500} checked={earlyCheckIn} onChange={setEarlyCheckIn} />
                  <PricedToggleCard label="Late check-out" hint="Until 4:00 PM · housekeeping reschedules" price={500} checked={lateCheckOut} onChange={setLateCheckOut} />
                </div>
              </div>
            )}

            {/* STEP 3 — Pax & Room */}
            {step === 3 && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <NumStepper label="Adults" value={adults} onChange={setAdults} min={1} max={adultsMax} />
                  <NumStepper label="Children" value={children} onChange={setChildren} min={0} max={childrenMax} />
                </div>
                <div className="space-y-3">
                  <div>
                    <Label>Room type</Label>
                    {availableTypes.length === 0 ? (
                      <div className="rounded-md border border-dashed border-warning/40 bg-warning-soft/40 p-4 text-center mt-1.5">
                        <AlertCircle className="h-5 w-5 text-warning mx-auto mb-1" />
                        <p className="text-sm font-medium text-warning">No rooms available right now</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1.5">
                        {availableTypes.map(t => {
                          const active = selectedRoomType === t.name;
                          return (
                            <button
                              key={t.name}
                              type="button"
                              onClick={() => setSelectedRoomType(t.name)}
                              className={cn(
                                "rounded-md border p-3 text-left transition-colors",
                                active ? "bg-brand-soft border-brand text-brand-soft-foreground" : "border-border hover:bg-surface-sunken"
                              )}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-semibold">{t.name}</span>
                                {active && <CheckCircle2 className="h-4 w-4 text-brand shrink-0" />}
                              </div>
                              <p className="text-[11px] text-muted-foreground mt-0.5">{t.count} available · {money(t.rate)}/night</p>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                </div>

                {!!selectedRoomType && (
                  <div className="mt-3">
                    <ToggleAddon
                      icon={BedDouble}
                      label="Extra bed"
                      hint={`Seat 1 more guest beyond the room's ${inclAdults}-adult limit · ${money(selectedType?.extraAdultRate ?? 0)}/night`}
                      priceText={`+ ${money(selectedType?.extraAdultRate ?? 0)}/night`}
                      on={extraBedForExtra}
                      onChange={enableExtraBed}
                    />
                  </div>
                )}

                {/* Capture on the mobile app — after a room is picked (sync needs the room) */}
                {syncState !== "done" ? (
                  <div className="mt-3 rounded-md border border-border bg-surface-sunken/40 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <span className="h-7 w-7 rounded-md bg-brand-soft text-brand-soft-foreground flex items-center justify-center shrink-0">
                          <Smartphone className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="text-sm font-medium">Capture on the mobile app</p>
                          <p className="text-xs text-muted-foreground">Send this walk-in to the tablet — staff capture the face photo, ID &amp; signature there.</p>
                          {syncErr && <p className="text-[11px] text-danger mt-1">{syncErr}</p>}
                        </div>
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={requestWalkInSync}>
                        <Smartphone className="h-4 w-4" />
                        {syncState === "creating" || syncState === "waiting" ? "View sync status" : "Sync to mobile app"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 rounded-md border border-success/40 bg-success-soft/30 p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-5 w-5 text-success" />
                        <span className="font-medium">Captured from tablet</span>
                        {syncBooking && <span className="text-muted-foreground">· booking {syncBooking.bookingNo}</span>}
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setDialogOpen(true)}>View</Button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                      {([["Face photo", syncDocs?.guest_photo], ["ID Front", syncDocs?.id_front], ["ID Back", syncDocs?.id_back], ["Signature", syncDocs?.signature]] as [string, string | null | undefined][]).map(([label, src]) => (
                        <div key={label} className="rounded-md border border-border bg-surface overflow-hidden">
                          <div className="aspect-[4/3] bg-surface-sunken flex items-center justify-center">
                            {src
                              ? <img src={src} alt={label} className="h-full w-full object-contain" />
                              : <span className="text-[11px] text-muted-foreground">—</span>}
                          </div>
                          <p className="text-[11px] text-center py-1 text-muted-foreground">{label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 4 — Rate & Add-ons */}
            {step === 4 && (
              <div className="space-y-5">
                {/* Rate Plan — drives meals */}
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 inline-flex items-center gap-1.5">
                    <UtensilsCrossed className="h-3 w-3" />Rate plan (sets included meals)
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {RATE_PLANS.map(p => {
                      const isActive = ratePlanCode === p.code;
                      return (
                        <button
                          key={p.code}
                          type="button"
                          onClick={() => applyRatePlan(p.code)}
                          className={cn(
                            "rounded-md border-2 p-3 text-left transition-colors flex flex-col gap-1",
                            isActive ? "border-brand bg-brand-soft/30" : "border-border hover:bg-surface-sunken"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className={cn(
                              "h-7 px-2 rounded-md inline-flex items-center justify-center text-[11px] font-bold tracking-wider",
                              isActive ? "bg-brand text-brand-foreground" : "bg-surface-sunken text-muted-foreground"
                            )}>{p.code}</span>
                            {planMealPerGuestNight(p.code) > 0 && (
                              <span className="text-[10px] text-muted-foreground tabular">+{money(planMealPerGuestNight(p.code))}/pax/N</span>
                            )}
                          </div>
                          <p className="text-xs font-semibold leading-tight">{p.name}</p>
                          <p className="text-[10px] text-muted-foreground leading-snug">{p.description}</p>
                        </button>
                      );
                    })}
                  </div>

                  {/* Inclusions preview */}
                  {ratePlan.includes.length > 0 && (
                    <div className="mt-2 rounded-md bg-info-soft/15 border border-info/20 p-2.5 flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-info shrink-0 mt-0.5" />
                      <div className="flex-1 text-xs">
                        <p className="font-semibold">{ratePlan.code} includes</p>
                        <p className="text-muted-foreground">{ratePlan.includes.join(" · ")} for {adults + children} pax × {nights}N</p>
                        {ratePlanSupplement > 0 && (
                          <p className="text-[11px] text-info mt-0.5 tabular">Plan meals: {money(ratePlanSupplement)} ({money(planMealPerGuestNight(ratePlanCode))} × {adults + children} pax × {nights}N)</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* STEP 5 — Payment */}
            {step === 5 && (
              <div className="space-y-5">
                <div className="space-y-3">
                  {/* Quick presets + amount */}
                  <Label>Advance payment</Label>
                  <div className="flex flex-wrap gap-2">
                    {[0, 30, 50, 100].map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => { setCustomAdvance(false); setP("amount", Math.round(grandTotal * p / 100)); }}
                        className={cn(
                          "h-10 px-4 rounded-md border text-sm font-medium transition-colors",
                          !customAdvance && Math.abs(pay.amount - Math.round(grandTotal * p / 100)) < 5
                            ? "bg-brand text-brand-foreground border-brand"
                            : "border-border hover:bg-surface-sunken"
                        )}
                      >
                        {p === 0 ? "No advance" : p === 100 ? "Full payment" : `${p}%`}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => { setCustomAdvance(true); setP("amount", 0); }}
                      className={cn(
                        "h-10 px-4 rounded-md border text-sm font-medium transition-colors",
                        customAdvance ? "bg-brand text-brand-foreground border-brand" : "border-border hover:bg-surface-sunken"
                      )}
                    >
                      Custom amount
                    </button>
                  </div>
                  {customAdvance && (
                    <div className="mt-2.5 flex items-center gap-2 animate-in">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₹</span>
                        <Input
                          type="number"
                          min={0}
                          max={grandTotal}
                          value={pay.amount || ""}
                          onChange={e => setP("amount", Math.min(grandTotal, Math.max(0, Math.round(Number(e.target.value)))))}
                          placeholder="0"
                          className="h-10 w-44 pl-7 tabular"
                          autoFocus
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        of {money(grandTotal)} · {grandTotal > 0 ? Math.round((pay.amount / grandTotal) * 100) : 0}% advance
                      </span>
                    </div>
                  )}

                  {/* Mode selector — visual icons */}
                  {pay.amount > 0 && (
                    <>
                      <Label>Payment mode</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {(["Cash", "Card", "UPI", "Bank", "Online"] as PayMode[]).map(mode => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => setP("mode", mode)}
                            className={cn(
                              "h-10 rounded-md border text-sm font-medium transition-colors",
                              pay.mode === mode ? "bg-brand text-brand-foreground border-brand" : "border-border hover:bg-surface-sunken"
                            )}
                          >
                            {mode}
                          </button>
                        ))}
                      </div>

                      {/* Mode-specific fields */}
                      {pay.mode === "Cash" && (
                        <div className="rounded-md bg-success-soft/30 border border-success/30 p-3 text-xs inline-flex items-center gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                          <span>Cash receipt will be generated as part of the advance slip below.</span>
                        </div>
                      )}

                      {pay.mode === "Card" && (
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label>Card type</Label>
                            <Select value={pay.cardType ?? "Visa"} onChange={e => setP("cardType", e.target.value as AdvancePayment["cardType"])} className="h-9">
                              <option>Visa</option><option>MasterCard</option><option>Amex</option><option>RuPay</option>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label>Last 4 digits <span className="text-danger">*</span></Label>
                            <Input value={pay.cardLast4 ?? ""} onChange={e => setP("cardLast4", e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="••••" maxLength={4} className="h-9 font-mono tabular text-center" />
                          </div>
                          <div className="space-y-1">
                            <Label>Auth / Approval code</Label>
                            <Input value={pay.authCode ?? ""} onChange={e => setP("authCode", e.target.value.toUpperCase())} placeholder="e.g. 123456" className="h-9 font-mono tabular" />
                          </div>
                          <div className="space-y-1">
                            <Label>POS slip ref</Label>
                            <Input value={pay.reference ?? ""} onChange={e => setP("reference", e.target.value)} placeholder="Slip #" className="h-9 font-mono tabular" />
                          </div>
                        </div>
                      )}

                      {pay.mode === "UPI" && (
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label>Payer UPI ID (VPA) <span className="text-danger">*</span></Label>
                            <Input value={pay.upiVPA ?? ""} onChange={e => setP("upiVPA", e.target.value)} placeholder="guest@upi" className="h-9 font-mono tabular" />
                          </div>
                          <div className="space-y-1">
                            <Label>UPI Txn reference</Label>
                            <Input value={pay.reference ?? ""} onChange={e => setP("reference", e.target.value)} placeholder="e.g. 4123-4567-8901" className="h-9 font-mono tabular" />
                          </div>
                        </div>
                      )}

                      {pay.mode === "Bank" && (
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label>Bank name <span className="text-danger">*</span></Label>
                            <Input value={pay.bankName ?? ""} onChange={e => setP("bankName", e.target.value)} placeholder="HDFC / ICICI / SBI …" className="h-9" />
                          </div>
                          <div className="space-y-1">
                            <Label>NEFT / RTGS / IMPS UTR <span className="text-danger">*</span></Label>
                            <Input value={pay.reference ?? ""} onChange={e => setP("reference", e.target.value)} placeholder="UTR / Ref no." className="h-9 font-mono tabular" />
                          </div>
                        </div>
                      )}

                      {pay.mode === "Online" && (
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label>Gateway</Label>
                            <Select value={pay.gateway ?? "Razorpay"} onChange={e => setP("gateway", e.target.value as AdvancePayment["gateway"])} className="h-9">
                              <option>Razorpay</option><option>PayU</option><option>Cashfree</option><option>Stripe</option>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label>Transaction ID <span className="text-danger">*</span></Label>
                            <Input value={pay.txnId ?? ""} onChange={e => setP("txnId", e.target.value)} placeholder="pay_LqRz…" className="h-9 font-mono tabular" />
                          </div>
                        </div>
                      )}

                      {/* Validation hint */}
                      {!advanceModeValid && (
                        <p className="text-[11px] text-warning inline-flex items-center gap-1.5">
                          <AlertCircle className="h-3 w-3" />Required reference details missing for {pay.mode}
                        </p>
                      )}

                      {/* Receipt action */}
                      <div className="pt-2 border-t border-border flex items-center justify-between">
                        <p className="text-[11px] text-muted-foreground">
                          Receipt # <span className="font-mono tabular text-foreground">{receiptNo}</span>
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowReceipt(true)}
                          disabled={!advanceModeValid || pay.amount === 0 || !name.trim()}
                        >
                          <Printer className="h-3.5 w-3.5" />Preview &amp; print receipt
                        </Button>
                      </div>
                    </>
                  )}
                </div>
                <div className="space-y-1.5 pt-4 border-t border-border">
                  <Label htmlFor="walkin-instructions">Special instructions / guest requests <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <textarea
                    id="walkin-instructions"
                    value={instructions}
                    onChange={e => setInstructions(e.target.value)}
                    placeholder="e.g. Quiet room away from elevator · Allergic to peanuts · Anniversary — please arrange cake · Early breakfast at 6 AM …"
                    rows={3}
                    maxLength={500}
                    className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm placeholder:text-subtle-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 outline-hidden transition-shadow resize-y min-h-[72px]"
                  />
                </div>
              </div>
            )}

            {/* STEP 6 — Confirm */}
            {step === 6 && (
              <div className="space-y-5">
                <div className="text-center py-2">
                  <div className="inline-flex h-16 w-16 rounded-full bg-success-soft text-success items-center justify-center mb-3">
                    <ChevronsRight className="h-8 w-8" />
                  </div>
                  <h2 className="text-xl font-semibold">Ready to start check-in</h2>
                  <p className="text-sm text-muted-foreground mt-1">Review the details, then start the KYC &amp; key-card flow.</p>
                </div>

                {/* Final review */}
                <div className="rounded-md border border-border divide-y divide-border">
                  <WalkInReviewRow
                    label="Guest"
                    value={name.trim() || "—"}
                    sub={[phone, email].filter(Boolean).join(" · ") || nationality}
                    onEdit={() => setStep(1)}
                  />
                  <WalkInReviewRow
                    label="Stay"
                    value={`${new Date(checkInDate + "T12:00:00").toLocaleDateString(undefined, { day: "2-digit", month: "short" })} · ${nights} night${nights === 1 ? "" : "s"}`}
                    sub={[
                      earlyCheckIn && "Early check-in",
                      lateCheckOut && "Late check-out",
                    ].filter(Boolean).join(" · ") || "12 PM → 11 AM"}
                    onEdit={() => setStep(2)}
                  />
                  <WalkInReviewRow
                    label="Room type"
                    value={selectedRoomType ? `${selectedRoomType} · room assigned at check-in` : "—"}
                    sub={`${adults}A${children ? ` + ${children}C` : ""}${selectedRoomType ? ` · ${money(typeRate)}/night` : ""}`}
                    onEdit={() => setStep(3)}
                  />
                  <WalkInReviewRow
                    label="Rate plan"
                    value={`${ratePlan.code} · ${ratePlan.name}`}
                    sub={[
                      ratePlan.includes.length > 0 && ratePlan.includes.join(" · "),
                    ].filter(Boolean).join(" · ") || "Room only"}
                    onEdit={() => setStep(4)}
                  />
                  <WalkInReviewRow
                    label="Payment"
                    value={pay.amount <= 0 ? "No advance" : balance === 0 ? `Full · ${pay.mode}` : `${money(pay.amount)} advance · ${pay.mode}`}
                    sub={`${money(grandTotal)} total · ${money(balance)} balance`}
                    onEdit={() => setStep(5)}
                  />
                  {instructions.trim() && (
                    <div className="p-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Special instructions</p>
                      <p className="text-sm leading-snug whitespace-pre-wrap">{instructions}</p>
                    </div>
                  )}
                </div>

                {/* What happens next */}
                <div className="rounded-md bg-brand-soft/30 border border-brand/20 p-3 text-xs flex items-start gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-brand shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-foreground mb-0.5">After clicking Start check-in</p>
                    <p className="text-muted-foreground">
                      Capture KYC (Aadhaar / Passport + face + signature) → Encode key card → Welcome message → Done.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* LIVE SUMMARY — sticky cost preview (was "Live cost preview") */}
          <Card className="p-6 h-fit sticky top-20">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-3">Live summary</p>

            {/* Guest chip */}
            {name.trim() ? (
              <div className="mb-3 flex items-center gap-2.5">
                <Avatar name={name.trim()} size={36} />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-medium text-sm truncate">{name.trim()}</p>
                    <Badge tone="brand">Walk-in</Badge>
                  </div>
                  {phone && <p className="text-xs text-muted-foreground truncate">{phone}</p>}
                </div>
              </div>
            ) : (
              <p className="mb-3 text-sm text-muted-foreground">No guest entered</p>
            )}

            {!hasCheckout ? (
              <p className="text-sm text-muted-foreground py-2">Pick a check-out date to see pricing.</p>
            ) : (
            <dl className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Room · {nights}N {breakdown.avgRate > 0 ? `· avg ${money(breakdown.avgRate)}/night` : ""}</span>
                <span className="font-medium tabular">{money(roomSubtotal)}</span>
              </div>
              {extraBedCharge > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Extra bed · {extraOcc.extraAdults} extra adult{extraOcc.extraAdults > 1 ? "s" : ""}</span>
                  <span className="tabular">{money(extraBedCharge)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground inline-flex items-center gap-1.5">
                  <span className="px-1 py-0 rounded bg-brand-soft text-brand-soft-foreground text-[9px] font-bold">{ratePlan.code}</span>
                  Rate plan ({ratePlan.name})
                </span>
                <span className="tabular text-muted-foreground">{ratePlanSupplement === 0 ? "included" : `+${money(ratePlanSupplement)}`}</span>
              </div>
              {earlyFee > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Early check-in</span><span className="tabular">{money(earlyFee)}</span></div>}
              {lateFee > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Late check-out</span><span className="tabular">{money(lateFee)}</span></div>}
              <div className="pt-1.5 mt-1.5 border-t border-border flex justify-between">
                <span className="text-muted-foreground">Tax (5%)</span>
                <span className="tabular">{money(tax)}</span>
              </div>
              <div className="pt-1.5 mt-1.5 border-t border-border flex justify-between">
                <span className="font-semibold text-sm">Grand total</span>
                <span className="font-semibold text-base tabular">{money(grandTotal)}</span>
              </div>
              {pay.amount > 0 && (
                <>
                  <div className="flex justify-between text-success">
                    <span className="font-medium">Advance ({pay.mode})</span>
                    <span className="tabular font-semibold">- {money(pay.amount)}</span>
                  </div>
                  <div className="pt-1.5 mt-1.5 border-t border-border flex justify-between">
                    <span className="font-semibold text-sm">Balance</span>
                    <span className={cn("font-semibold text-base tabular", balance > 0 ? "text-warning" : "text-success")}>{money(balance)}</span>
                  </div>
                </>
              )}
            </dl>
            )}

            {/* Back / Next (Start on final step) */}
            <div className="mt-5 flex gap-2">
              <Button variant="outline" disabled={step === 1} onClick={() => setStep(s => s - 1)} className="flex-1">
                <ChevronLeft className="h-4 w-4" />Back
              </Button>
              {step < STEPS.length ? (
                <Button onClick={() => setStep(s => Math.min(STEPS.length, s + 1))} disabled={!canNext()} className="flex-1">
                  Next<ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={start} disabled={!valid} variant="success" className="flex-1">
                  <ChevronsRight className="h-4 w-4" />Start check-in
                </Button>
              )}
            </div>

            {/* Receipt — available once an advance has been entered */}
            {step === STEPS.length && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowReceipt(true)}
                disabled={pay.amount === 0 || !advanceModeValid || !name.trim()}
                className="w-full mt-2"
              >
                <Printer className="h-3.5 w-3.5" />Print receipt
              </Button>
            )}
          </Card>
        </div>
      </div>

      {dialogOpen && syncState !== "idle" && (
        <MobileSyncDialog
          state={syncState}
          reference={syncBooking?.bookingNo ?? null}
          docs={syncDocs}
          errorMessage={syncErr}
          onCancel={cancelSync}
          onHide={() => setDialogOpen(false)}
          onDone={() => setDialogOpen(false)}
        />
      )}

      {showReceipt && (
        <AdvanceReceiptModal
          onClose={() => setShowReceipt(false)}
          receiptNo={receiptNo}
          bookingNo={bookingNo}
          guestName={name}
          phone={phone}
          room={selectedRoomType ? `${selectedRoomType} (assigned at check-in)` : "—"}
          checkInDate={checkInDate}
          nights={nights}
          grandTotal={grandTotal}
          payment={pay}
          balance={balance}
          ratePlan={ratePlan}
        />
      )}
    </>
  );
}

// ===================== HELPER COMPONENTS =====================
// Confirm-step review row with an Edit jump-back (mirrors the booking wizard).
function WalkInReviewRow({ label, value, sub, onEdit }: { label: string; value: string; sub?: string; onEdit: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 p-3">
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
        <p className="text-sm font-medium truncate">{value}</p>
        {sub && <p className="text-xs text-muted-foreground truncate">{sub}</p>}
      </div>
      <button type="button" onClick={onEdit} className="text-xs text-brand hover:underline shrink-0">Edit</button>
    </div>
  );
}

function NumStepper({ label, value, onChange, min = 0, max = Infinity }: { label: string; value: number; onChange: (n: number) => void; min?: number; max?: number }) {
  const atMin = value <= min;
  const atMax = value >= max;
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex items-center border border-border rounded-md h-10">
        <button type="button" disabled={atMin} onClick={() => onChange(Math.max(min, value - 1))} className={cn("w-10 h-full inline-flex items-center justify-center", atMin ? "opacity-40 cursor-not-allowed" : "hover:bg-surface-sunken")}><Minus className="h-3.5 w-3.5" /></button>
        <span className="flex-1 text-center font-medium tabular">{value}</span>
        <button type="button" disabled={atMax} onClick={() => onChange(Math.min(max, value + 1))} className={cn("w-10 h-full inline-flex items-center justify-center", atMax ? "opacity-40 cursor-not-allowed" : "hover:bg-surface-sunken")}><Plus className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  );
}

// Booking-style priced toggle card (used by the walk-in's Dates step add-ons).
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

function ToggleAddon({ icon: Icon, label, hint, priceText, on, onChange }: {
  icon: typeof CalendarPlus; label: string; hint: string; priceText: string;
  on: boolean; onChange: (b: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={cn(
        "p-3 rounded-md border text-left transition-all",
        on ? "bg-brand-soft border-brand shadow-xs" : "border-border hover:bg-surface-sunken"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <Icon className={cn("h-4 w-4 mt-0.5", on ? "text-brand" : "text-muted-foreground")} />
        {on && <CheckCircle2 className="h-3.5 w-3.5 text-brand shrink-0" />}
      </div>
      <p className="text-sm font-medium mt-1.5">{label}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{hint}</p>
      <p className={cn("text-[11px] font-semibold tabular mt-1 pt-1 border-t border-border/50", on ? "text-brand-soft-foreground" : "text-foreground")}>{priceText}</p>
    </button>
  );
}

// ===================== ADVANCE RECEIPT MODAL =====================
function AdvanceReceiptModal({
  onClose, receiptNo, bookingNo, guestName, phone, room, checkInDate, nights,
  grandTotal, payment, balance, ratePlan,
}: {
  onClose: () => void;
  receiptNo: string; bookingNo: string;
  guestName: string; phone: string;
  room: string; checkInDate: string; nights: number;
  grandTotal: number; payment: AdvancePayment; balance: number;
  ratePlan?: RatePlan;
}) {
  const name = hotelName(useProperty());
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); };
  }, [onClose]);

  const ciDate = new Date(checkInDate + "T12:00:00");
  const coDate = new Date(ciDate);
  coDate.setDate(coDate.getDate() + nights);
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
  const dateNow = new Date("2026-05-24T14:22:00").toLocaleString(undefined, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  // Gate the print portal on mount so document.body exists (SSR-safe).
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => { setMounted(true); }, []);

  // Single source of truth for the receipt. Rendered twice: in the on-screen
  // modal (preview) and in a print-only portal to <body> (see the portal at the
  // end of this component) so window.print() emits only the receipt — not the
  // whole app as blank pages.
  const receiptDoc = (
    <div className="rounded-md border-2 border-double border-border p-5 bg-surface text-sm space-y-3">
            {/* Hotel header */}
            <div className="text-center border-b-2 border-double border-border pb-3">
              <p className="font-display text-lg font-medium">{name}</p>
              <p className="text-[10px] text-muted-foreground">Main Tower · MG Road, Bandra West, Mumbai 400050</p>
              <p className="text-[10px] text-muted-foreground tabular">GSTIN 27AAACR5055K1Z5 · PAN AAACR5055K</p>
              <div className="mt-2 inline-block px-3 py-0.5 rounded-full bg-brand-soft text-brand-soft-foreground text-[10px] uppercase tracking-[0.18em] font-bold">
                Advance Payment Receipt
              </div>
            </div>

            {/* Receipt meta */}
            <div className="flex justify-between text-xs">
              <span><span className="text-muted-foreground">Receipt No.</span> <span className="font-semibold tabular">{receiptNo}</span></span>
              <span className="tabular text-muted-foreground">{dateNow}</span>
            </div>

            {/* Body table */}
            <table className="w-full text-sm">
              <tbody>
                <ReceiptRow k="Received From" v={guestName} />
                <ReceiptRow k="Phone" v={phone} />
                <ReceiptRow k="Booking Reference" v={<span className="font-mono tabular">{bookingNo}</span>} />
                <ReceiptRow k="Room" v={room} />
                <ReceiptRow k="Stay" v={`${fmt(ciDate)} → ${fmt(coDate)} · ${nights} night${nights === 1 ? "" : "s"}`} />
                {ratePlan && (
                  <ReceiptRow k="Rate Plan" v={
                    <span className="inline-flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-brand-soft text-brand-soft-foreground text-[10px] font-bold tracking-wider">{ratePlan.code}</span>
                      <span>{ratePlan.name}{ratePlan.includes.length > 0 ? ` · ${ratePlan.includes.join(" + ")}` : ""}</span>
                    </span>
                  } />
                )}
                <ReceiptRow k="Towards" v="Walk-in booking — Advance payment" />
                {/* Payment mode details */}
                <ReceiptRow k="Payment Mode" v={payment.mode} />
                {payment.mode === "Card" && (
                  <>
                    {payment.cardType && payment.cardLast4 && (
                      <ReceiptRow k="Card" v={<span className="font-mono tabular">{payment.cardType} ****{payment.cardLast4}</span>} />
                    )}
                    {payment.authCode && <ReceiptRow k="Auth code" v={<span className="font-mono tabular">{payment.authCode}</span>} />}
                    {payment.reference && <ReceiptRow k="Slip ref" v={<span className="font-mono tabular">{payment.reference}</span>} />}
                  </>
                )}
                {payment.mode === "UPI" && (
                  <>
                    {payment.upiVPA && <ReceiptRow k="Payer VPA" v={<span className="font-mono tabular">{payment.upiVPA}</span>} />}
                    <ReceiptRow k="Merchant VPA" v={<span className="font-mono tabular">pearlpalace@hdfcbank</span>} />
                    {payment.reference && <ReceiptRow k="UPI Ref #" v={<span className="font-mono tabular">{payment.reference}</span>} />}
                  </>
                )}
                {payment.mode === "Bank" && (
                  <>
                    {payment.bankName && <ReceiptRow k="Bank" v={payment.bankName} />}
                    {payment.reference && <ReceiptRow k="UTR / Ref" v={<span className="font-mono tabular">{payment.reference}</span>} />}
                  </>
                )}
                {payment.mode === "Online" && (
                  <>
                    {payment.gateway && <ReceiptRow k="Gateway" v={payment.gateway} />}
                    {payment.txnId && <ReceiptRow k="Transaction ID" v={<span className="font-mono tabular">{payment.txnId}</span>} />}
                  </>
                )}
                {payment.mode === "Cash" && (
                  <ReceiptRow k="Receipt drawer" v="Reception cash drawer" />
                )}
              </tbody>
            </table>

            {/* Amount block */}
            <div className="rounded-md bg-brand-soft/40 border border-brand/30 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Amount Received</span>
                <span className="text-2xl font-bold tabular text-brand-soft-foreground">{money(payment.amount)}</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 italic">
                In Words: <span className="text-foreground font-medium">{numberToWordsIN(payment.amount)} Rupees Only</span>
              </p>
            </div>

            {/* Stay financial summary */}
            <div className="rounded-md border border-border p-3 space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Grand total (estimate)</span><span className="font-medium tabular">{money(grandTotal)}</span></div>
              <div className="flex justify-between text-success"><span>Advance received</span><span className="tabular font-medium">- {money(payment.amount)}</span></div>
              <div className="flex justify-between border-t border-border pt-1 mt-1">
                <span className="font-semibold">Balance at checkout</span>
                <span className={cn("font-bold tabular", balance > 0 ? "text-warning" : "text-success")}>{money(balance)}</span>
              </div>
            </div>

            {/* Signature footer */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t-2 border-double border-border">
              <div>
                <p className="text-[10px] text-muted-foreground italic mb-6">Received with thanks.</p>
                <p className="border-t border-border pt-1 text-[10px] text-muted-foreground tabular">Cashier · Khalid R.</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground italic mb-6">For {name}</p>
                <p className="border-t border-border pt-1 text-[10px] text-muted-foreground tabular">Authorised Signatory</p>
              </div>
            </div>

            <p className="text-[9px] text-muted-foreground italic text-center border-t border-border pt-2">
              This is a computer-generated receipt. Subject to realisation. Original for Guest · Duplicate for Hotel records.
            </p>
    </div>
  );

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm no-print" onClick={onClose} />
      <div className="fixed inset-0 z-[70] flex items-start justify-center p-4 pointer-events-none overflow-y-auto no-print">
        <Card className="pointer-events-auto w-full max-w-2xl p-5 animate-in shadow-xl my-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold inline-flex items-center gap-2"><FileText className="h-4 w-4 text-brand" />Advance Payment Receipt</h3>
            <button type="button" onClick={onClose} className="h-8 w-8 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
          </div>

          {/* RECEIPT PREVIEW — same content (receiptDoc) that is portaled for print */}
          {receiptDoc}

          <div className="flex justify-end gap-2 pt-3 border-t border-border mt-4">
            <Button variant="ghost" onClick={onClose}>Close</Button>
            <Button variant="outline" onClick={() => window.print()}><Download className="h-4 w-4" />Save as PDF</Button>
            <Button onClick={() => window.print()}><Printer className="h-4 w-4" />Print Now</Button>
          </div>
        </Card>
      </div>

      {/* Print-only copy, portaled to <body> so window.print() emits just the
          receipt — the on-screen modal above is .no-print. */}
      {mounted && createPortal(<div className="print-doc">{receiptDoc}</div>, document.body)}
    </>
  );
}

function ReceiptRow({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <tr className="border-b border-border/40">
      <td className="py-1.5 text-xs text-muted-foreground w-1/3">{k}</td>
      <td className="py-1.5 text-sm">: {v}</td>
    </tr>
  );
}

// Indian-style number-to-words (Lakh / Crore)
function numberToWordsIN(n: number): string {
  n = Math.round(n);
  if (n === 0) return "Zero";
  if (n < 0) return "Minus " + numberToWordsIN(-n);
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const two = (num: number): string => num < 20 ? ones[num] : tens[Math.floor(num / 10)] + (num % 10 ? " " + ones[num % 10] : "");
  const three = (num: number): string => num >= 100 ? ones[Math.floor(num / 100)] + " Hundred" + (num % 100 ? " " + two(num % 100) : "") : two(num);
  let out = "";
  const crore = Math.floor(n / 10000000); n %= 10000000;
  const lakh = Math.floor(n / 100000); n %= 100000;
  const thousand = Math.floor(n / 1000); n %= 1000;
  if (crore) out += three(crore) + " Crore ";
  if (lakh) out += three(lakh) + " Lakh ";
  if (thousand) out += three(thousand) + " Thousand ";
  if (n) out += three(n);
  return out.trim();
}
