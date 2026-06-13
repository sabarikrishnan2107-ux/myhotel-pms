"use client";
import * as React from "react";
import {
  CalendarDays, Users, UserPlus, Clock, Plus, Search, Phone, MessageSquare,
  CheckCircle2, X, Ban, Cake, Heart, Sparkles, Filter, ChevronLeft, ChevronRight,
  AlertTriangle, Timer, TrendingDown, Wrench, PartyPopper, Send, MapPin, Utensils,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn, money } from "@/lib/utils";
import { useProperty, hotelName } from "@/lib/use-property";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";

// ---------- Types ----------
type ResStatus = "confirmed" | "seated" | "completed" | "no-show" | "cancelled" | "blocked";
type Occasion = "none" | "birthday" | "anniversary" | "business" | "date-night" | "family";

type Reservation = {
  id: string;
  table: string;        // "T1".."T20"
  startHr: number;      // 12..23 (decimal)
  durHr: number;        // 1.5..3
  guest: string;
  party: number;
  phone: string;
  notes?: string;
  occasion: Occasion;
  status: ResStatus;
  source?: "Walk-in" | "Phone" | "Zomato" | "Dineout" | "Direct";
  seatedAt?: string | null;     // ISO datetime stamped when the party is seated
  completedAt?: string | null;  // ISO datetime stamped when the table is closed
};

type Walkin = {
  id: string;
  guest: string;
  party: number;
  phone: string;
  waitMin: number;   // estimated remaining
  arrivedAt: string; // "20:14"
  notified?: boolean;
};

// ---------- Mock data ----------
const HOURS = Array.from({ length: 12 }, (_, i) => 12 + i); // 12..23
const TABLES = Array.from({ length: 20 }, (_, i) => `T${i + 1}`);

const TABLE_META: Record<string, { seats: number; zone: string }> = Object.fromEntries(
  TABLES.map((t, i) => {
    const seats = i < 6 ? 2 : i < 14 ? 4 : i < 18 ? 6 : 8;
    const zone = i < 8 ? "Main Hall" : i < 14 ? "Garden" : i < 18 ? "Private" : "Terrace";
    return [t, { seats, zone }];
  })
);

const INITIAL_RESERVATIONS: Reservation[] = [
  { id: "R1",  table: "T3",  startHr: 12.5, durHr: 1.5, guest: "Rohan Malhotra",     party: 2, phone: "+91 98201 22341", notes: "Window seat", occasion: "date-night", status: "completed", source: "Direct" },
  { id: "R2",  table: "T7",  startHr: 13,   durHr: 2,   guest: "Sneha Iyer",         party: 4, phone: "+91 99303 11220", notes: "High-chair needed", occasion: "family", status: "completed", source: "Phone" },
  { id: "R3",  table: "T11", startHr: 13.5, durHr: 1.5, guest: "Vikram Reddy",       party: 3, phone: "+91 98402 78812", occasion: "business", status: "completed", source: "Direct" },
  { id: "R4",  table: "T1",  startHr: 19,   durHr: 2,   guest: "Anjali Iyer",        party: 2, phone: "+91 98112 45662", notes: "Anniversary cake at 20:30", occasion: "anniversary", status: "seated", source: "Phone" },
  { id: "R5",  table: "T5",  startHr: 19.5, durHr: 2,   guest: "Karan Mehta",        party: 2, phone: "+91 98765 12010", notes: "Allergic to peanuts", occasion: "date-night", status: "seated", source: "Zomato" },
  { id: "R6",  table: "T8",  startHr: 19,   durHr: 2.5, guest: "Priya Krishnan",     party: 4, phone: "+91 99887 66541", notes: "Jain food only", occasion: "family", status: "seated", source: "Dineout" },
  { id: "R7",  table: "T9",  startHr: 19.5, durHr: 2,   guest: "Arjun Kapoor",       party: 4, phone: "+91 98201 90011", occasion: "none", status: "confirmed", source: "Direct" },
  { id: "R8",  table: "T10", startHr: 20,   durHr: 2,   guest: "Meera Nair",         party: 4, phone: "+91 90004 88210", notes: "Birthday — surprise cake", occasion: "birthday", status: "confirmed", source: "Phone" },
  { id: "R9",  table: "T12", startHr: 20,   durHr: 2.5, guest: "Rajesh Pillai",      party: 6, phone: "+91 98863 55421", notes: "Bring high chair x1", occasion: "family", status: "confirmed", source: "Zomato" },
  { id: "R10", table: "T13", startHr: 20.5, durHr: 2,   guest: "Neha Gupta",         party: 4, phone: "+91 99004 22118", occasion: "none", status: "confirmed", source: "Dineout" },
  { id: "R11", table: "T15", startHr: 19.5, durHr: 3,   guest: "Aditya Shenoy",      party: 6, phone: "+91 98201 78821", notes: "Wine pairing menu", occasion: "anniversary", status: "seated", source: "Direct" },
  { id: "R12", table: "T16", startHr: 20.5, durHr: 2.5, guest: "Tanvi Bhatt",        party: 6, phone: "+91 98920 67711", notes: "Vegan menu", occasion: "business", status: "confirmed", source: "Phone" },
  { id: "R13", table: "T17", startHr: 21,   durHr: 2,   guest: "Saurabh Joshi",      party: 6, phone: "+91 98112 09988", occasion: "none", status: "confirmed", source: "Zomato" },
  { id: "R14", table: "T19", startHr: 20,   durHr: 2.5, guest: "Kapoor Family",      party: 8, phone: "+91 98201 33445", notes: "70th birthday — main cake at 21:00", occasion: "birthday", status: "confirmed", source: "Direct" },
  { id: "R15", table: "T20", startHr: 21,   durHr: 2,   guest: "Shah Family",        party: 8, phone: "+91 99001 78812", notes: "Gujarati thali pre-order", occasion: "family", status: "confirmed", source: "Phone" },
  { id: "R16", table: "T2",  startHr: 20,   durHr: 1.5, guest: "Ritu Sharma",        party: 2, phone: "+91 99877 21134", notes: "Quick dinner", occasion: "none", status: "confirmed", source: "Walk-in" },
  { id: "R17", table: "T6",  startHr: 20.5, durHr: 2,   guest: "Devansh Rao",        party: 2, phone: "+91 98980 71122", notes: "Pre-paid via Dineout", occasion: "date-night", status: "confirmed", source: "Dineout" },
  { id: "R18", table: "T14", startHr: 21.5, durHr: 1.5, guest: "Farah Khan",         party: 4, phone: "+91 98201 11102", occasion: "none", status: "confirmed", source: "Phone" },
  // No-show + cancellation
  { id: "R19", table: "T4",  startHr: 19.5, durHr: 1.5, guest: "Mahesh Pawar",       party: 2, phone: "+91 98321 44556", notes: "Did not arrive", occasion: "none", status: "no-show", source: "Zomato" },
  { id: "R20", table: "T18", startHr: 20,   durHr: 2,   guest: "Khanna Reunion",     party: 6, phone: "+91 98201 67788", notes: "Cancelled at 17:40 — wedding clash", occasion: "family", status: "cancelled", source: "Direct" },
  // Blocks
  { id: "B1", table: "T18", startHr: 14, durHr: 4, guest: "Maintenance — booth re-upholstery", party: 0, phone: "—", occasion: "none", status: "blocked", notes: "Welspun fabric refit" },
  { id: "B2", table: "T20", startHr: 12, durHr: 4, guest: "Private — Corporate lunch (Reliance)", party: 8, phone: "+91 98201 90099", occasion: "business", status: "blocked", notes: "Pre-set thali · billed to corporate" },
];

const INITIAL_WAITLIST: Walkin[] = [
  { id: "W1", guest: "Suresh Pandey",  party: 2, phone: "+91 98201 09988", waitMin: 8,  arrivedAt: "20:08" },
  { id: "W2", guest: "Aarti Deshmukh", party: 4, phone: "+91 99887 56712", waitMin: 18, arrivedAt: "20:14" },
  { id: "W3", guest: "Verma Group",    party: 6, phone: "+91 98865 33221", waitMin: 35, arrivedAt: "20:22", notified: true },
  { id: "W4", guest: "Diya Patel",     party: 2, phone: "+91 90043 88220", waitMin: 12, arrivedAt: "20:28" },
];

// ---------- Helpers ----------
const STATUS_TONE: Record<ResStatus, "success" | "info" | "neutral" | "danger" | "warning" | "accent"> = {
  confirmed: "info",
  seated:    "success",
  completed: "neutral",
  "no-show": "danger",
  cancelled: "warning",
  blocked:   "accent",
};

const STATUS_LABEL: Record<ResStatus, string> = {
  confirmed: "Confirmed",
  seated:    "Seated",
  completed: "Completed",
  "no-show": "No-show",
  cancelled: "Cancelled",
  blocked:   "Blocked",
};

const OCCASION_ICON: Record<Occasion, React.ReactNode> = {
  none:        null,
  birthday:    <Cake className="h-3 w-3" />,
  anniversary: <Heart className="h-3 w-3" />,
  business:    <Sparkles className="h-3 w-3" />,
  "date-night":<Heart className="h-3 w-3" />,
  family:      <Users className="h-3 w-3" />,
};

function partyColor(party: number, status: ResStatus) {
  if (status === "blocked")   return "bg-accent-soft text-accent border-accent/30";
  if (status === "cancelled") return "bg-warning-soft/60 text-warning border-warning/30 line-through";
  if (status === "no-show")   return "bg-danger-soft text-danger border-danger/30";
  if (party <= 2)             return "bg-info-soft text-info border-info/30";
  if (party <= 4)             return "bg-success-soft text-success border-success/30";
  if (party <= 6)             return "bg-brand-soft text-brand-soft-foreground border-brand/30";
  return "bg-warning-soft text-warning border-warning/30";
}

function hrLabel(h: number) {
  const hh = Math.floor(h);
  const mm = h % 1 === 0.5 ? "30" : "00";
  return `${String(hh).padStart(2, "0")}:${mm}`;
}

// "HH:MM" → decimal hours (20:30 → 20.5)
function parseHr(t: string) {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) + ((m || 0) >= 30 ? 0.5 : 0);
}

// ---------- Backend row normalisers ----------
// The /table-reservations & /table-waitlist endpoints store ids as numeric and
// startHr/durHr/waitMin in string columns; normalise back to the UI shapes so
// the Gantt math (numeric +/-) and string ids keep working unchanged.
type ReservationRow = Omit<Reservation, "id" | "startHr" | "durHr"> & {
  id: string | number;
  startHr: number | string;
  durHr: number | string;
};
type WalkinRow = Omit<Walkin, "id" | "waitMin"> & {
  id: string | number;
  waitMin: number | string;
};

const toReservation = (r: ReservationRow): Reservation => ({
  ...r,
  id: String(r.id),
  startHr: Number(r.startHr),
  durHr: Number(r.durHr),
});
const toWalkin = (w: WalkinRow): Walkin => ({
  ...w,
  id: String(w.id),
  waitMin: Number(w.waitMin),
});

// ---------- Page ----------
export default function TablesPage() {
  const name = hotelName(useProperty());
  const [toast, setToast] = React.useState<string | null>(null);
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };

  const [date, setDate] = React.useState("2026-06-02");
  const [zone, setZone] = React.useState<string>("All");
  const [statusFilter, setStatusFilter] = React.useState<"all" | ResStatus>("all");
  const [search, setSearch] = React.useState("");
  const [reservations, setReservations] = React.useState<Reservation[]>(INITIAL_RESERVATIONS);
  const [waitlist, setWaitlist] = React.useState<Walkin[]>(INITIAL_WAITLIST);

  // Replace the seeded mock with real backend data; .catch keeps the mock so the
  // page is byte-for-byte identical offline.
  React.useEffect(() => {
    let cancelled = false;
    apiGet<ReservationRow[]>("/table-reservations")
      .then(d => { if (!cancelled && d.length) setReservations(d.map(toReservation)); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);
  React.useEffect(() => {
    let cancelled = false;
    apiGet<WalkinRow[]>("/table-waitlist")
      .then(d => { if (!cancelled && d.length) setWaitlist(d.map(toWalkin)); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const [showNew, setShowNew] = React.useState(false);
  const [showBlock, setShowBlock] = React.useState(false);
  const [showWalkin, setShowWalkin] = React.useState(false);
  const [detail, setDetail] = React.useState<Reservation | null>(null);

  // Controlled form state for the create modals (so they POST real rows).
  const NEW_RES_BLANK = { time: "20:00", party: 4, table: "T10", guest: "", phone: "", occasion: "none" as Occasion, source: "Phone" as NonNullable<Reservation["source"]>, notes: "" };
  const [newRes, setNewRes] = React.useState(NEW_RES_BLANK);
  const BLOCK_BLANK = { table: "T18", start: "14:00", end: "18:00", type: "maintenance", reason: "" };
  const [blockForm, setBlockForm] = React.useState(BLOCK_BLANK);
  const WALK_BLANK = { guest: "", party: 2, waitMin: 15, phone: "" };
  const [walkForm, setWalkForm] = React.useState(WALK_BLANK);

  // KPIs — all derived from the live reservations now (no hardcoded numbers).
  const activeRes = reservations.filter(r => r.status !== "blocked");
  const decided = activeRes.length; // denominator for reliability rates
  const todaysCovers = activeRes
    .filter(r => r.status !== "cancelled" && r.status !== "no-show")
    .reduce((s, r) => s + r.party, 0);
  const confirmedCount = reservations.filter(r => r.status === "confirmed").length;
  const seatedCount = reservations.filter(r => r.status === "seated").length;
  const walkinsCount = reservations.filter(r => r.source === "Walk-in" && r.status !== "cancelled" && r.status !== "blocked").length;
  const waitlistCount = waitlist.length;

  // Real dwell analytics from seated→completed timestamps (rolling 30 days).
  const THIRTY_D = 30 * 24 * 60 * 60 * 1000;
  const [nowMs] = React.useState(() => Date.now()); // stable "now" for the 30-day window
  const dwellOf = (r: Reservation): number | null => {
    if (!r.seatedAt || !r.completedAt) return null;
    const s = +new Date(r.seatedAt), e = +new Date(r.completedAt);
    if (isNaN(s) || isNaN(e) || e < s || nowMs - e > THIRTY_D) return null;
    return (e - s) / 60000; // minutes
  };
  const dwells = reservations.map(dwellOf).filter((x): x is number => x !== null);
  const avgDwell = dwells.length ? Math.round(dwells.reduce((a, b) => a + b, 0) / dwells.length) : null;
  const rate = (n: number) => decided ? Math.round((n / decided) * 1000) / 10 : 0;
  const noShowRate = rate(reservations.filter(r => r.status === "no-show").length);
  const cancelRate = rate(reservations.filter(r => r.status === "cancelled").length);

  // Turn times: avg dwell by party-size × day-part (only cells with real data).
  const partyBucket = (p: number) => p <= 2 ? "1–2 pax" : p <= 4 ? "3–4 pax" : p <= 6 ? "5–6 pax" : "7–8 pax";
  const dayPart = (h: number): "lunch" | "earlyDinner" | "dinner" | "late" =>
    h < 16 ? "lunch" : h < 19 ? "earlyDinner" : h < 21 ? "dinner" : "late";
  const turnBuckets = ["1–2 pax", "3–4 pax", "5–6 pax", "7–8 pax"];
  const turnAgg: Record<string, Record<string, number[]>> = {};
  turnBuckets.forEach(b => { turnAgg[b] = { lunch: [], earlyDinner: [], dinner: [], late: [] }; });
  reservations.forEach(r => {
    const d = dwellOf(r);
    if (d === null) return;
    turnAgg[partyBucket(r.party)][dayPart(r.startHr)].push(d);
  });
  const avgCell = (arr: number[]) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;
  const turnTimes = turnBuckets.map(party => ({
    party,
    lunch: avgCell(turnAgg[party].lunch),
    earlyDinner: avgCell(turnAgg[party].earlyDinner),
    dinner: avgCell(turnAgg[party].dinner),
    late: avgCell(turnAgg[party].late),
  }));

  const filteredTables = TABLES.filter(t => zone === "All" || TABLE_META[t].zone === zone);

  const listRows = reservations
    .filter(r => r.status !== "blocked")
    .filter(r => statusFilter === "all" || r.status === statusFilter)
    .filter(r => !search || r.guest.toLowerCase().includes(search.toLowerCase()) || r.phone.includes(search) || r.table.toLowerCase() === search.toLowerCase())
    .sort((a, b) => a.startHr - b.startHr);

  const blockedSlots = reservations.filter(r => r.status === "blocked");

  // Actions
  const seatNow = (w: Walkin) => {
    setWaitlist(prev => prev.filter(x => x.id !== w.id));
    apiDelete(`/table-waitlist/${w.id}`).catch(() => {});
    // Log the seated walk-in as a real reservation so covers & turn-times count it.
    const now = new Date();
    const startHr = now.getHours() + (now.getMinutes() >= 30 ? 0.5 : 0);
    addReservation({
      table: "—",
      startHr,
      durHr: 2,
      guest: w.guest,
      party: w.party,
      phone: w.phone ?? "—",
      notes: "Walk-in (seated from waitlist)",
      occasion: "none",
      status: "seated",
      source: "Walk-in",
      seatedAt: now.toISOString(),
    });
    showToast(`${w.guest} (${w.party}) seated · Walk-in logged`);
  };
  const sendSms = (w: Walkin) => {
    setWaitlist(prev => prev.map(x => x.id === w.id ? { ...x, notified: true } : x));
    apiPut(`/table-waitlist/${w.id}`, { notified: true }).catch(() => {});
    showToast(`SMS sent to ${w.guest} · "Your table is ready"`);
  };
  const removeWait = (w: Walkin) => {
    setWaitlist(prev => prev.filter(x => x.id !== w.id));
    apiDelete(`/table-waitlist/${w.id}`).catch(() => {});
    showToast(`${w.guest} removed from waitlist`);
  };

  const addWalkin = (w: Omit<Walkin, "id">) => {
    apiPost<WalkinRow>("/table-waitlist", w)
      .then(row => setWaitlist(prev => [...prev, toWalkin(row)]))
      .catch(() => setWaitlist(prev => [...prev, { id: `W${Date.now()}`, ...w }]));
  };

  const addReservation = (r: Omit<Reservation, "id">) => {
    apiPost<ReservationRow>("/table-reservations", r)
      .then(row => setReservations(prev => [...prev, toReservation(row)]))
      .catch(() => setReservations(prev => [...prev, { id: `R${Date.now()}`, ...r }]));
  };

  // Build + persist a reservation from the New-reservation modal.
  const submitNewReservation = (withSms: boolean) => {
    addReservation({
      table: newRes.table,
      startHr: parseHr(newRes.time),
      durHr: 2,
      guest: newRes.guest.trim() || "Guest",
      party: Number(newRes.party),
      phone: newRes.phone.trim() || "—",
      notes: newRes.notes.trim() || undefined,
      occasion: newRes.occasion,
      status: "confirmed",
      source: newRes.source,
    });
    setShowNew(false);
    setNewRes(NEW_RES_BLANK);
    showToast(withSms ? `Reservation saved · SMS sent · ${newRes.table} · ${newRes.time}` : `Reservation created · ${newRes.table} · ${newRes.time}`);
  };

  // Build + persist a blocked slot from the Block-slot modal.
  const submitBlock = () => {
    const startHr = parseHr(blockForm.start);
    const endHr = parseHr(blockForm.end);
    const label = blockForm.type === "private" ? "Private event" : blockForm.type === "staff-meal" ? "Staff meal" : "Maintenance";
    addReservation({
      table: blockForm.table,
      startHr,
      durHr: Math.max(0.5, endHr - startHr),
      guest: blockForm.reason.trim() ? `${label} — ${blockForm.reason.trim()}` : label,
      party: 0,
      phone: "—",
      notes: blockForm.type,
      occasion: "none",
      status: "blocked",
      source: "Direct",
    });
    setShowBlock(false);
    setBlockForm(BLOCK_BLANK);
    showToast(`Slot blocked · ${blockForm.table} · removed from public booking`);
  };

  const updateStatus = (id: string, status: ResStatus) => {
    // Stamp the dwell timestamps so turn-time analytics are real.
    const nowISO = new Date().toISOString();
    const stamp: Partial<Reservation> =
      status === "seated" ? { seatedAt: nowISO } :
      status === "completed" ? { completedAt: nowISO } : {};
    setReservations(prev => prev.map(r => r.id === id ? { ...r, status, ...stamp } : r));
    apiPut(`/table-reservations/${id}`, { status, ...stamp }).catch(() => {});
    const r = reservations.find(x => x.id === id);
    showToast(`${r?.guest ?? "Reservation"} → ${STATUS_LABEL[status]}`);
  };

  const releaseBlock = (b: Reservation) => {
    setReservations(prev => prev.filter(x => x.id !== b.id));
    apiDelete(`/table-reservations/${b.id}`).catch(() => {});
    showToast(`Block on ${b.table} released`);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-brand to-accent text-white grid place-items-center shadow-sm">
            <Utensils className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Table Reservations</h1>
            <p className="text-sm text-muted-foreground">Restaurant floor &middot; {name}, Mumbai &middot; {new Date(date).toLocaleDateString(undefined, { weekday: "long", day: "2-digit", month: "long" })}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => { setShowBlock(true); }}>
            <Ban className="h-4 w-4" /> Block slot
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowWalkin(true)}>
            <UserPlus className="h-4 w-4" /> Add walk-in
          </Button>
          <Button size="sm" onClick={() => setShowNew(true)}>
            <Plus className="h-4 w-4" /> New reservation
          </Button>
        </div>
      </div>

      {/* KPI STRIP */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi icon={<Users className="h-4 w-4" />} tone="brand" label="Today's covers booked" value={String(todaysCovers)} sub={`${confirmedCount} confirmed · ${seatedCount} seated`} />
        <Kpi icon={<UserPlus className="h-4 w-4" />} tone="success" label="Walk-ins today" value={String(walkinsCount)} sub="logged today" />
        <Kpi icon={<Clock className="h-4 w-4" />} tone="warning" label="Waitlist" value={String(waitlistCount)} sub={`${waitlist.reduce((s,w)=>s+w.party,0)} pax · avg ${Math.round(waitlist.reduce((s,w)=>s+w.waitMin,0)/Math.max(1,waitlist.length))} min`} />
        <Kpi icon={<Timer className="h-4 w-4" />} tone="info" label="Avg dwell" value={avgDwell != null ? `${avgDwell} min` : "—"} sub={avgDwell != null ? `over ${dwells.length} visit${dwells.length === 1 ? "" : "s"}` : "no completed visits yet"} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5">
        {/* MAIN COLUMN */}
        <div className="space-y-5">
          {/* CONTROLS */}
          <Card className="p-3 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={() => showToast("Showing previous day")}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-surface-sunken">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="h-7 border-0 bg-transparent px-1 text-sm w-[140px]"
                />
              </div>
              <Button size="sm" variant="ghost" onClick={() => showToast("Showing next day")}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="h-6 w-px bg-border" />
            <div className="flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Zone</span>
              <Select value={zone} onChange={e => setZone(e.target.value)} className="h-8 w-[130px] text-xs">
                <option>All</option>
                <option>Main Hall</option>
                <option>Garden</option>
                <option>Private</option>
                <option>Terrace</option>
              </Select>
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Legend dot="bg-info"      label="1–2 pax" />
              <Legend dot="bg-success"   label="3–4 pax" />
              <Legend dot="bg-brand"     label="5–6 pax" />
              <Legend dot="bg-warning"   label="7–8 pax" />
              <Legend dot="bg-accent"    label="Blocked" />
            </div>
          </Card>

          {/* TIMELINE / GANTT */}
          <Card className="overflow-hidden">
            <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-border">
              <div>
                <CardTitle>Timeline</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Rows = tables · Columns = 30-min slots · Click a cell to view</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-success animate-pulse" /> Live · now 20:30</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[1080px]">
                {/* Header row */}
                <div className="grid sticky top-0 z-10 bg-surface" style={{ gridTemplateColumns: `60px repeat(${HOURS.length}, minmax(80px, 1fr))` }}>
                  <div className="border-b border-border bg-surface-sunken/40 px-2 py-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Table</div>
                  {HOURS.map(h => (
                    <div key={h} className="border-b border-l border-border bg-surface-sunken/40 px-2 py-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold tabular">
                      {String(h).padStart(2, "0")}:00
                    </div>
                  ))}
                </div>

                {/* Body rows */}
                {filteredTables.map((t) => {
                  const tableRes = reservations.filter(r => r.table === t);
                  return (
                    <div key={t} className="grid relative hover:bg-surface-sunken/20" style={{ gridTemplateColumns: `60px repeat(${HOURS.length}, minmax(80px, 1fr))` }}>
                      <div className="border-b border-border px-2 py-3 text-xs">
                        <div className="font-semibold tabular">{t}</div>
                        <div className="text-[10px] text-muted-foreground">{TABLE_META[t].seats}p &middot; {TABLE_META[t].zone.split(" ")[0]}</div>
                      </div>
                      {HOURS.map(h => (
                        <div key={h} className="border-b border-l border-border h-14 relative" />
                      ))}

                      {/* Reservation pills overlay */}
                      {tableRes.map(r => {
                        const startCol = (r.startHr - 12); // hours from 12
                        const leftPct = (startCol / HOURS.length) * 100;
                        const widthPct = (r.durHr / HOURS.length) * 100;
                        return (
                          <button
                            key={r.id}
                            onClick={() => { setDetail(r); showToast(`Opened ${r.guest}`); }}
                            className={cn(
                              "absolute top-1.5 bottom-1.5 rounded-md border text-[11px] px-2 py-1 text-left overflow-hidden hover:ring-2 hover:ring-ring/40 transition-all",
                              partyColor(r.party, r.status)
                            )}
                            style={{ left: `calc(60px + ${leftPct}% * (100% - 60px) / 100%)`, width: `calc(${widthPct}% * (100% - 60px) / 100%)`, marginLeft: `${(60 * leftPct) / 100}px` }}
                          >
                            <div className="flex items-center gap-1 truncate font-medium">
                              {r.status === "seated" && <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse shrink-0" />}
                              {r.occasion !== "none" && OCCASION_ICON[r.occasion]}
                              <span className="truncate">{r.guest}</span>
                            </div>
                            <div className="text-[10px] opacity-80 tabular">
                              {hrLabel(r.startHr)} &middot; {r.party > 0 ? `${r.party}p` : "—"}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* BOOKINGS LIST */}
          <Card className="overflow-hidden">
            <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-border">
              <div>
                <CardTitle>Bookings list</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">{listRows.length} reservations on {new Date(date).toLocaleDateString(undefined, { day: "2-digit", month: "short" })}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Guest, phone or table…" className="pl-8 h-8 text-xs w-[220px]" />
                </div>
                <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value as "all" | ResStatus)} className="h-8 w-[130px] text-xs">
                  <option value="all">All status</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="seated">Seated</option>
                  <option value="completed">Completed</option>
                  <option value="no-show">No-show</option>
                  <option value="cancelled">Cancelled</option>
                </Select>
              </div>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-surface-sunken/40">
                <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="text-left font-semibold px-4 py-2.5">Time</th>
                  <th className="text-left font-semibold px-3 py-2.5">Guest</th>
                  <th className="text-left font-semibold px-3 py-2.5">Party</th>
                  <th className="text-left font-semibold px-3 py-2.5">Table</th>
                  <th className="text-left font-semibold px-3 py-2.5">Phone</th>
                  <th className="text-left font-semibold px-3 py-2.5">Notes</th>
                  <th className="text-left font-semibold px-3 py-2.5">Status</th>
                  <th className="text-right font-semibold px-4 py-2.5">Actions</th>
                </tr>
              </thead>
              <tbody>
                {listRows.map(r => (
                  <tr key={r.id} className="border-t border-border hover:bg-surface-sunken/30">
                    <td className="px-4 py-2.5 tabular text-xs">
                      <div className="font-semibold">{hrLabel(r.startHr)}</div>
                      <div className="text-[10px] text-muted-foreground">{r.durHr}h slot</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="font-medium flex items-center gap-1.5">
                        {r.guest}
                        {r.occasion === "birthday" && <Cake className="h-3.5 w-3.5 text-warning" />}
                        {r.occasion === "anniversary" && <Heart className="h-3.5 w-3.5 text-danger" />}
                      </div>
                      <div className="text-[10px] text-muted-foreground">{r.source}</div>
                    </td>
                    <td className="px-3 py-2.5 tabular">{r.party}</td>
                    <td className="px-3 py-2.5">
                      <Badge tone="neutral" className="tabular">{r.table}</Badge>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{TABLE_META[r.table].zone}</div>
                    </td>
                    <td className="px-3 py-2.5 tabular text-xs text-muted-foreground">{r.phone}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground max-w-[220px] truncate" title={r.notes || ""}>{r.notes || "—"}</td>
                    <td className="px-3 py-2.5"><Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge></td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="inline-flex items-center gap-1">
                        {r.status === "confirmed" && (
                          <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, "seated")}>
                            <CheckCircle2 className="h-3.5 w-3.5" /> Seat
                          </Button>
                        )}
                        {r.status === "seated" && (
                          <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, "completed")}>
                            Close
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => { setDetail(r); }}>View</Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {listRows.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">No reservations match those filters.</td></tr>
                )}
              </tbody>
            </table>
          </Card>

          {/* TURN TIMES + RATES */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Card className="md:col-span-2 overflow-hidden">
              <div className="px-5 pt-4 pb-3 border-b border-border flex items-center justify-between">
                <div>
                  <CardTitle>Turn times</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Avg minutes by party &times; day-part &middot; rolling 30 days</p>
                </div>
                <Badge tone="info">Auto-tracked</Badge>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-surface-sunken/40">
                  <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="text-left font-semibold px-4 py-2.5">Party</th>
                    <th className="text-right font-semibold px-3 py-2.5">Lunch</th>
                    <th className="text-right font-semibold px-3 py-2.5">Early dinner</th>
                    <th className="text-right font-semibold px-3 py-2.5">Dinner peak</th>
                    <th className="text-right font-semibold px-4 py-2.5">Late</th>
                  </tr>
                </thead>
                <tbody>
                  {turnTimes.map(t => (
                    <tr key={t.party} className="border-t border-border">
                      <td className="px-4 py-2.5 font-medium">{t.party}</td>
                      <td className="px-3 py-2.5 text-right tabular">{t.lunch != null ? `${t.lunch} min` : "—"}</td>
                      <td className="px-3 py-2.5 text-right tabular">{t.earlyDinner != null ? `${t.earlyDinner} min` : "—"}</td>
                      <td className="px-3 py-2.5 text-right tabular font-semibold">{t.dinner != null ? `${t.dinner} min` : "—"}</td>
                      <td className="px-4 py-2.5 text-right tabular">{t.late != null ? `${t.late} min` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            <Card className="p-5 space-y-4">
              <CardTitle>Reliability</CardTitle>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground inline-flex items-center gap-1"><TrendingDown className="h-3.5 w-3.5" /> No-show rate</span>
                    <span className="tabular font-semibold">{noShowRate}%</span>
                  </div>
                  <div className="mt-1.5 h-2 rounded-full bg-surface-sunken overflow-hidden">
                    <div className="h-full bg-danger" style={{ width: `${noShowRate * 6}%` }} />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">Target &lt; 5% &middot; trailing 30d</p>
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground inline-flex items-center gap-1"><X className="h-3.5 w-3.5" /> Cancellation rate</span>
                    <span className="tabular font-semibold">{cancelRate}%</span>
                  </div>
                  <div className="mt-1.5 h-2 rounded-full bg-surface-sunken overflow-hidden">
                    <div className="h-full bg-warning" style={{ width: `${cancelRate * 6}%` }} />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">Within 4h of slot: 2.1%</p>
                </div>
                <div className="pt-3 border-t border-border">
                  <Button size="sm" variant="outline" className="w-full" onClick={() => showToast("Reminder SMS scheduled · 18:30 IST")}>
                    <Send className="h-3.5 w-3.5" /> Send reminder SMS batch
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* BLOCKED SLOTS */}
          <Card className="overflow-hidden">
            <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-border">
              <div>
                <CardTitle className="flex items-center gap-2"><Ban className="h-4 w-4 text-accent" /> Blocked slots</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Maintenance &amp; private events &middot; tables excluded from public booking</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setShowBlock(true)}><Plus className="h-3.5 w-3.5" /> New block</Button>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-surface-sunken/40">
                <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="text-left font-semibold px-4 py-2.5">Table</th>
                  <th className="text-left font-semibold px-3 py-2.5">Type</th>
                  <th className="text-left font-semibold px-3 py-2.5">Window</th>
                  <th className="text-left font-semibold px-3 py-2.5">Reason / Notes</th>
                  <th className="text-right font-semibold px-4 py-2.5">Actions</th>
                </tr>
              </thead>
              <tbody>
                {blockedSlots.map(b => (
                  <tr key={b.id} className="border-t border-border">
                    <td className="px-4 py-2.5">
                      <Badge tone="neutral" className="tabular">{b.table}</Badge>
                    </td>
                    <td className="px-3 py-2.5">
                      {b.notes?.toLowerCase().includes("upholstery") || b.guest.toLowerCase().includes("maintenance")
                        ? <Badge tone="warning"><Wrench className="h-3 w-3" /> Maintenance</Badge>
                        : <Badge tone="accent"><PartyPopper className="h-3 w-3" /> Private event</Badge>}
                    </td>
                    <td className="px-3 py-2.5 tabular text-xs">{hrLabel(b.startHr)} – {hrLabel(b.startHr + b.durHr)}</td>
                    <td className="px-3 py-2.5 text-xs">
                      <div className="font-medium">{b.guest}</div>
                      <div className="text-muted-foreground">{b.notes}</div>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Button size="sm" variant="ghost" onClick={() => releaseBlock(b)}>
                        Release
                      </Button>
                    </td>
                  </tr>
                ))}
                {blockedSlots.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">No active blocks.</td></tr>
                )}
              </tbody>
            </table>
          </Card>
        </div>

        {/* RIGHT COLUMN — WAITLIST */}
        <div className="space-y-5">
          <Card className="overflow-hidden">
            <div className="px-5 pt-4 pb-3 border-b border-border bg-gradient-to-br from-warning-soft/30 to-transparent">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-warning animate-pulse" />
                  Live waitlist
                </CardTitle>
                <Badge tone="warning" className="tabular">{waitlist.length}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{waitlist.reduce((s,w)=>s+w.party,0)} pax waiting &middot; longest {Math.max(...waitlist.map(w=>w.waitMin), 0)} min</p>
            </div>
            <div className="divide-y divide-border">
              {waitlist.map((w, idx) => (
                <div key={w.id} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-sm flex items-center gap-1.5">
                        <span className="text-[10px] tabular text-muted-foreground bg-surface-sunken px-1.5 py-0.5 rounded">#{idx + 1}</span>
                        {w.guest}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 tabular">
                        <span>{w.party} pax</span>
                        <span>&middot;</span>
                        <span>Arrived {w.arrivedAt}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground tabular flex items-center gap-1 mt-0.5">
                        <Phone className="h-3 w-3" /> {w.phone}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs uppercase tracking-wider text-muted-foreground">Est wait</div>
                      <div className={cn("text-lg font-bold tabular", w.waitMin >= 30 ? "text-danger" : w.waitMin >= 15 ? "text-warning" : "text-success")}>
                        {w.waitMin}<span className="text-xs font-medium">m</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button size="sm" className="flex-1" onClick={() => seatNow(w)}>
                      <CheckCircle2 className="h-3.5 w-3.5" /> Seat now
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => sendSms(w)}>
                      <MessageSquare className="h-3.5 w-3.5" />
                      {w.notified ? "Re-send" : "SMS"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => removeWait(w)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {w.notified && (
                    <div className="text-[10px] text-success flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> &quot;Your table is ready&quot; sent
                    </div>
                  )}
                </div>
              ))}
              {waitlist.length === 0 && (
                <div className="p-8 text-center text-xs text-muted-foreground">No-one waiting right now.</div>
              )}
            </div>
            <div className="p-3 border-t border-border bg-surface-sunken/30">
              <Button size="sm" variant="outline" className="w-full" onClick={() => setShowWalkin(true)}>
                <UserPlus className="h-3.5 w-3.5" /> Add walk-in to queue
              </Button>
            </div>
          </Card>

          {/* Quick floor summary */}
          <Card className="p-4 space-y-3">
            <CardTitle className="text-sm flex items-center gap-2"><MapPin className="h-4 w-4" /> Floor at a glance</CardTitle>
            <div className="space-y-2 text-xs">
              <FloorRow zone="Main Hall" total={8} occupied={5} />
              <FloorRow zone="Garden"    total={6} occupied={3} />
              <FloorRow zone="Private"   total={4} occupied={2} />
              <FloorRow zone="Terrace"   total={2} occupied={1} />
            </div>
            <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Occupancy</span>
              <span className="tabular font-semibold">55% &middot; 11/20 tables</span>
            </div>
          </Card>

          <Card className="p-4 space-y-2.5 border-warning/40 bg-warning-soft/20">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              <div className="text-xs">
                <div className="font-semibold text-foreground">Heads up</div>
                <div className="text-muted-foreground mt-0.5">3 birthday cakes due 20:30, 21:00, 21:15. Chef Vikas notified. Kapoor Family party-of-8 needs special seating arrangement.</div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* NEW RESERVATION MODAL */}
      {showNew && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-5 pt-4 pb-3 border-b border-border flex items-center justify-between">
              <div>
                <CardTitle>New reservation</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Auto-suggests the best available table for the party</p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => setShowNew(false)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
              <div>
                <Label>Date</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label>Time</Label>
                <Select value={newRes.time} onChange={e => setNewRes(s => ({ ...s, time: e.target.value }))} className="mt-1.5">
                  {HOURS.flatMap(h => [`${String(h).padStart(2,"0")}:00`, `${String(h).padStart(2,"0")}:30`]).map(t => <option key={t}>{t}</option>)}
                </Select>
              </div>
              <div>
                <Label>Party size</Label>
                <Select value={newRes.party} onChange={e => setNewRes(s => ({ ...s, party: Number(e.target.value) }))} className="mt-1.5">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n} guest{n>1?"s":""}</option>)}
                </Select>
              </div>
              <div>
                <Label>Table <span className="text-muted-foreground text-xs font-normal">(auto-suggested)</span></Label>
                <Select value={newRes.table} onChange={e => setNewRes(s => ({ ...s, table: e.target.value }))} className="mt-1.5">
                  {TABLES.map(t => <option key={t} value={t}>{t} &middot; {TABLE_META[t].zone} &middot; {TABLE_META[t].seats}-seat</option>)}
                </Select>
                <p className="text-[10px] text-success mt-1 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> {TABLE_META[newRes.table].seats}-seat · {TABLE_META[newRes.table].zone}</p>
              </div>
              <div>
                <Label>Guest name</Label>
                <Input placeholder="e.g. Aarav Sharma" value={newRes.guest} onChange={e => setNewRes(s => ({ ...s, guest: e.target.value }))} className="mt-1.5" />
              </div>
              <div>
                <Label>Phone</Label>
                <Input placeholder="+91 98XXX XXXXX" value={newRes.phone} onChange={e => setNewRes(s => ({ ...s, phone: e.target.value }))} className="mt-1.5" />
              </div>
              <div>
                <Label>Occasion</Label>
                <Select value={newRes.occasion} onChange={e => setNewRes(s => ({ ...s, occasion: e.target.value as Occasion }))} className="mt-1.5">
                  <option value="none">None</option>
                  <option value="birthday">Birthday</option>
                  <option value="anniversary">Anniversary</option>
                  <option value="date-night">Date night</option>
                  <option value="business">Business</option>
                  <option value="family">Family gathering</option>
                </Select>
              </div>
              <div>
                <Label>Source</Label>
                <Select value={newRes.source} onChange={e => setNewRes(s => ({ ...s, source: e.target.value as NonNullable<Reservation["source"]> }))} className="mt-1.5">
                  <option>Phone</option>
                  <option>Direct</option>
                  <option>Zomato</option>
                  <option>Dineout</option>
                  <option>Walk-in</option>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Special notes</Label>
                <Input placeholder="Allergies, high-chair, window seat, cake at 21:00…" value={newRes.notes} onChange={e => setNewRes(s => ({ ...s, notes: e.target.value }))} className="mt-1.5" />
              </div>
            </div>
            <div className="px-5 py-4 border-t border-border flex items-center justify-end gap-2 bg-surface-sunken/30">
              <Button size="sm" variant="ghost" onClick={() => setShowNew(false)}>Cancel</Button>
              <Button size="sm" variant="outline" onClick={() => submitNewReservation(true)}>
                Save &amp; send SMS
              </Button>
              <Button size="sm" onClick={() => submitNewReservation(false)}>
                <CheckCircle2 className="h-3.5 w-3.5" /> Create reservation
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* WALK-IN MODAL */}
      {showWalkin && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <div className="px-5 pt-4 pb-3 border-b border-border flex items-center justify-between">
              <CardTitle>Add walk-in to queue</CardTitle>
              <Button size="icon" variant="ghost" onClick={() => setShowWalkin(false)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="p-5 space-y-3">
              <div><Label>Guest name</Label><Input placeholder="e.g. Walk-in: Mehta" value={walkForm.guest} onChange={e => setWalkForm(s => ({ ...s, guest: e.target.value }))} className="mt-1.5" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Party</Label><Select value={walkForm.party} onChange={e => setWalkForm(s => ({ ...s, party: Number(e.target.value) }))} className="mt-1.5">{[1,2,3,4,5,6,7,8].map(n => <option key={n}>{n}</option>)}</Select></div>
                <div><Label>Est wait (min)</Label><Input value={walkForm.waitMin} onChange={e => setWalkForm(s => ({ ...s, waitMin: Number(e.target.value) }))} type="number" className="mt-1.5" /></div>
              </div>
              <div><Label>Phone (for SMS)</Label><Input placeholder="+91 …" value={walkForm.phone} onChange={e => setWalkForm(s => ({ ...s, phone: e.target.value }))} className="mt-1.5" /></div>
            </div>
            <div className="px-5 py-4 border-t border-border flex items-center justify-end gap-2 bg-surface-sunken/30">
              <Button size="sm" variant="ghost" onClick={() => setShowWalkin(false)}>Cancel</Button>
              <Button size="sm" onClick={() => {
                addWalkin({ guest: walkForm.guest.trim() || "Walk-in guest", party: Number(walkForm.party), phone: walkForm.phone.trim() || "—", waitMin: Number(walkForm.waitMin), arrivedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) });
                setShowWalkin(false);
                setWalkForm(WALK_BLANK);
                showToast("Added to waitlist · #" + (waitlist.length + 1));
              }}>
                <UserPlus className="h-3.5 w-3.5" /> Add to queue
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* BLOCK SLOT MODAL */}
      {showBlock && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <div className="px-5 pt-4 pb-3 border-b border-border flex items-center justify-between">
              <CardTitle>Block table slot</CardTitle>
              <Button size="icon" variant="ghost" onClick={() => setShowBlock(false)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="p-5 space-y-3">
              <div><Label>Table(s)</Label><Select value={blockForm.table} onChange={e => setBlockForm(s => ({ ...s, table: e.target.value }))} className="mt-1.5">{TABLES.map(t => <option key={t}>{t}</option>)}</Select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Start</Label><Select value={blockForm.start} onChange={e => setBlockForm(s => ({ ...s, start: e.target.value }))} className="mt-1.5">{HOURS.flatMap(h => [`${String(h).padStart(2,"0")}:00`,`${String(h).padStart(2,"0")}:30`]).map(t => <option key={t}>{t}</option>)}</Select></div>
                <div><Label>End</Label><Select value={blockForm.end} onChange={e => setBlockForm(s => ({ ...s, end: e.target.value }))} className="mt-1.5">{HOURS.flatMap(h => [`${String(h).padStart(2,"0")}:00`,`${String(h).padStart(2,"0")}:30`]).map(t => <option key={t}>{t}</option>)}</Select></div>
              </div>
              <div><Label>Type</Label><Select value={blockForm.type} onChange={e => setBlockForm(s => ({ ...s, type: e.target.value }))} className="mt-1.5"><option value="maintenance">Maintenance</option><option value="private">Private event</option><option value="staff-meal">Staff meal</option></Select></div>
              <div><Label>Reason</Label><Input placeholder="e.g. Booth re-upholstery" value={blockForm.reason} onChange={e => setBlockForm(s => ({ ...s, reason: e.target.value }))} className="mt-1.5" /></div>
            </div>
            <div className="px-5 py-4 border-t border-border flex items-center justify-end gap-2 bg-surface-sunken/30">
              <Button size="sm" variant="ghost" onClick={() => setShowBlock(false)}>Cancel</Button>
              <Button size="sm" onClick={submitBlock}>
                <Ban className="h-3.5 w-3.5" /> Block slot
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* DETAIL DRAWER */}
      {detail && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-stretch justify-end" onClick={() => setDetail(null)}>
          <Card className="w-full max-w-xl overflow-y-auto rounded-none" onClick={e => e.stopPropagation()}>
            <div className="px-5 pt-4 pb-3 border-b border-border flex items-center justify-between sticky top-0 bg-surface z-10">
              <div className="flex items-center gap-3">
                <div className={cn("h-10 w-10 rounded-lg grid place-items-center", partyColor(detail.party, detail.status))}>
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold">{detail.guest}</div>
                  <div className="text-xs text-muted-foreground tabular">{hrLabel(detail.startHr)} &middot; {detail.party} pax &middot; {detail.table}</div>
                </div>
              </div>
              <Button size="icon" variant="ghost" onClick={() => setDetail(null)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="p-5 space-y-5">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge tone={STATUS_TONE[detail.status]}>{STATUS_LABEL[detail.status]}</Badge>
                {detail.occasion !== "none" && (
                  <Badge tone="brand" className="capitalize">{OCCASION_ICON[detail.occasion]} {detail.occasion.replace("-", " ")}</Badge>
                )}
                <Badge tone="neutral">{detail.source}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <Field label="Phone" value={detail.phone} />
                <Field label="Table" value={`${detail.table} · ${TABLE_META[detail.table].zone}`} />
                <Field label="Time" value={`${hrLabel(detail.startHr)} – ${hrLabel(detail.startHr + detail.durHr)}`} />
                <Field label="Duration" value={`${detail.durHr}h slot`} />
              </div>

              {detail.notes && (
                <div>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Notes</Label>
                  <div className="mt-1.5 text-sm p-3 rounded-md bg-surface-sunken">{detail.notes}</div>
                </div>
              )}

              <div className="border-t border-border pt-4 space-y-2">
                <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Pre-order &amp; deposit</div>
                <div className="flex items-center justify-between text-sm">
                  <span>Deposit collected</span>
                  <span className="tabular font-semibold">{money(detail.party >= 6 ? 2500 : 0)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Pre-ordered menu</span>
                  <span className="tabular">{detail.party >= 6 ? money(detail.party * 1450) : "—"}</span>
                </div>
              </div>

              <div className="border-t border-border pt-4 flex flex-wrap gap-2">
                {detail.status === "confirmed" && (
                  <Button size="sm" onClick={() => { updateStatus(detail.id, "seated"); setDetail(null); }}>
                    <CheckCircle2 className="h-3.5 w-3.5" /> Seat guest now
                  </Button>
                )}
                {detail.status === "seated" && (
                  <Button size="sm" onClick={() => { updateStatus(detail.id, "completed"); setDetail(null); }}>
                    Close cover
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => showToast("SMS reminder sent to " + detail.guest)}>
                  <MessageSquare className="h-3.5 w-3.5" /> Send reminder
                </Button>
                <Button size="sm" variant="outline" onClick={() => showToast("Calling " + detail.phone)}>
                  <Phone className="h-3.5 w-3.5" /> Call guest
                </Button>
                {detail.status === "confirmed" && (
                  <Button size="sm" variant="ghost" onClick={() => { updateStatus(detail.id, "cancelled"); setDetail(null); }}>
                    Cancel reservation
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-foreground text-background rounded-lg px-4 py-3 text-sm shadow-2xl">
          {toast}
        </div>
      )}
    </div>
  );
}

// ---------- Sub-components ----------
function Kpi({
  icon, tone, label, value, sub,
}: { icon: React.ReactNode; tone: "brand" | "success" | "warning" | "info"; label: string; value: string; sub?: string }) {
  const toneClass = {
    brand:   "bg-brand-soft text-brand-soft-foreground",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
    info:    "bg-info-soft text-info",
  }[tone];
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2">
        <div className={cn("h-8 w-8 rounded-md grid place-items-center", toneClass)}>{icon}</div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
      </div>
      <div className="mt-2 text-2xl font-bold tabular">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </Card>
  );
}

function Legend({ dot, label }: { dot: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("h-2 w-2 rounded-full", dot)} />
      {label}
    </span>
  );
}

function FloorRow({ zone, total, occupied }: { zone: string; total: number; occupied: number }) {
  const pct = (occupied / total) * 100;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="font-medium">{zone}</span>
        <span className="tabular text-muted-foreground">{occupied}/{total}</span>
      </div>
      <div className="h-1.5 rounded-full bg-surface-sunken overflow-hidden">
        <div className={cn("h-full", pct >= 75 ? "bg-danger" : pct >= 50 ? "bg-warning" : "bg-success")} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
      <div className="mt-0.5 tabular">{value}</div>
    </div>
  );
}
