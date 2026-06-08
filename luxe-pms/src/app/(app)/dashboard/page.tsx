"use client";
import * as React from "react";
import Link from "next/link";
import {
  BedDouble, KeyRound, Sparkles, Wrench, TrendingUp, Wallet, Receipt, ChevronRight,
  AlertTriangle, Building2, UtensilsCrossed, LogIn, LogOut, LayoutGrid, CalendarRange,
  Bot, ClipboardCheck, FileBarChart, Bell, Crown,
  Activity as ActivityIcon, CheckCircle2, Clock, Target, Trophy, ArrowRight,
  CreditCard, RefreshCw, Star, Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, PaymentBadge, StatusBadge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Sparkline } from "@/components/ui/sparkline";
import { OccupancyGauge } from "@/components/ui/occupancy-gauge";
import { FloorHeatmap } from "@/components/ui/floor-heatmap";
import { GoalProgress } from "@/components/ui/goal-progress";
import { money, formatTime, cn } from "@/lib/utils";
import { apiGet } from "@/lib/api";
import { useProperty, hotelName, currencySymbol } from "@/lib/use-property";
import {
  DASHBOARD_KPIS, TODAY_ARRIVALS, TODAY_DEPARTURES, REVENUE_TREND,
  OCCUPANCY_FORECAST, SOURCE_MIX, ALERTS, ROOMS, GUESTS,
} from "@/lib/mock-data";
import type { Reservation, Guest, Room } from "@/lib/types";
import { GuestDetailDrawer } from "@/components/guests/guest-detail-drawer";
import { Eye } from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";

const SOURCE_COLORS = [
  "var(--color-brand)",
  "var(--color-accent)",
  "var(--color-info)",
  "var(--color-warning)",
  "var(--color-status-checkout-pending)",
  "var(--color-status-inspected)",
];

const QUICK_ACTIONS = [
  { href: "/bookings/new", label: "New Booking", icon: KeyRound, tone: "brand" as const },
  { href: "/checkin", label: "Check-in", icon: LogIn, tone: "info" as const, count: 7 },
  { href: "/checkout", label: "Checkout", icon: LogOut, tone: "accent" as const, count: 5 },
  { href: "/rack", label: "Room Rack", icon: LayoutGrid, tone: "neutral" as const },
  { href: "/calendar", label: "Calendar", icon: CalendarRange, tone: "neutral" as const },
  { href: "/housekeeping", label: "Housekeeping", icon: Sparkles, tone: "warning" as const, count: 6 },
  { href: "/cashier", label: "Cashier", icon: ClipboardCheck, tone: "success" as const },
  { href: "/reports", label: "Reports", icon: FileBarChart, tone: "neutral" as const },
];

// Sparkline mock data — last 7 days
const SPARKLINE_DATA = {
  occupancy: [62, 58, 65, 70, 68, 74, 76],
  adr: [710, 695, 725, 740, 738, 750, 742],
  revpar: [440, 405, 470, 518, 502, 555, 528],
  rooms: [22, 19, 24, 27, 26, 29, 27],
  fb: [16800, 15400, 18200, 19500, 17900, 20100, 21340],
  hall: [11000, 8500, 14200, 16800, 12400, 18900, 18200],
  net: [13200, 11800, 15500, 17900, 15600, 21200, 19840],
};

const TOP_SOURCES = [
  { name: "Direct / Website", revenue: 38400, bookings: 52 },
  { name: "Booking.com", revenue: 32200, bookings: 41 },
  { name: "Corporate (TechCorp)", revenue: 18600, bookings: 14 },
  { name: "Agoda", revenue: 14800, bookings: 22 },
  { name: "Pearl Holidays", revenue: 11200, bookings: 9 },
  { name: "Expedia", revenue: 8900, bookings: 11 },
];

const AI_BRIEFING: { tone: "success" | "info" | "warning" | "danger"; text: React.ReactNode }[] = [
  { tone: "success", text: <>Pace <span className="font-semibold">+6.4%</span> vs last Monday — driven by Direct &amp; Corporate.</> },
  { tone: "warning", text: <><span className="font-semibold">2 VIP arrivals</span> today: Mr. Kapoor (Suite 502), Ms. Iyer (Villa 3).</> },
  { tone: "info", text: <>7-day forecast: <span className="font-semibold">82%</span> avg occupancy, healthy cash flow.</> },
  { tone: "danger", text: <><span className="font-semibold">Open issue:</span> Room 214 AC complaint pending &gt; 2h.</> },
];

type ActivityTone = "success" | "info" | "warning" | "danger" | "brand" | "accent";
const ACTIVITY: { id: string; at: string; actor: string; verb: string; target: string; tone: ActivityTone }[] = [
  { id: "a1", at: "Just now", actor: "Khalid R.", verb: "received payment", target: "AED 2,335 · Yuki Tanaka", tone: "success" as const },
  { id: "a2", at: "2 min ago", actor: "System", verb: "synced rates", target: "Booking.com · 6 dates", tone: "info" as const },
  { id: "a3", at: "8 min ago", actor: "Maria L.", verb: "marked clean", target: "Room 412", tone: "accent" as const },
  { id: "a4", at: "14 min ago", actor: "Tom W. (Mgr)", verb: "approved discount", target: "10% · BK100199", tone: "brand" as const },
  { id: "a5", at: "22 min ago", actor: "Ravi K.", verb: "started job", target: "M-2401 · AC Room 305", tone: "warning" as const },
  { id: "a6", at: "31 min ago", actor: "Khalid R.", verb: "checked in", target: "Anastasia V. · Room 607", tone: "success" as const },
  { id: "a7", at: "48 min ago", actor: "OTA: Booking.com", verb: "new reservation", target: "BDC-44218 · 3N", tone: "info" as const },
];

/** Short timezone label (IST, GST, GMT…) from a Date's offset. */
function tzAbbrev(d: Date): string {
  const m: Record<number, string> = { [-330]: "IST", [-240]: "GST", [0]: "GMT", [300]: "EST", [240]: "AST", [-60]: "CET", [-480]: "CST" };
  const off = d.getTimezoneOffset();
  if (off in m) return m[off];
  const h = -off / 60;
  return `GMT${h >= 0 ? "+" : ""}${h}`;
}

/** Relative "x min ago" label from an audit log's date + time, given the current clock. */
function relTime(date: string, time: string, nowMs: number): string {
  if (!nowMs || !date) return time || "";
  const t = new Date(`${date}T${time || "00:00"}`).getTime();
  if (Number.isNaN(t)) return time || "";
  const m = Math.round((nowMs - t) / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

/** Map an audit severity/action to an activity dot tone. */
function auditTone(severity: string, action: string): ActivityTone {
  const a = action.toLowerCase();
  if (severity === "critical" || a.includes("delet") || a.includes("fail") || a.includes("block")) return "danger";
  if (severity === "warning") return "warning";
  if (a.includes("login") || a.includes("checked") || a.includes("creat") || a.includes("paid") || a.includes("payment")) return "success";
  if (a.includes("updat") || a.includes("sync")) return "info";
  return "brand";
}

type ActivityAccent = "success" | "info" | "warning" | "danger" | "brand" | "neutral";

/** Pick an icon + soft colour for an activity row from its text/tone. */
function activityVisual(text: string, tone: ActivityTone): { icon: typeof BedDouble; accent: ActivityAccent } {
  const v = text.toLowerCase();
  if (v.includes("payment") || v.includes("paid") || v.includes("received") || v.includes("refund")) return { icon: CreditCard, accent: "success" };
  if (v.includes("sync")) return { icon: RefreshCw, accent: "info" };
  if (v.includes("clean") || v.includes("inspect")) return { icon: Sparkles, accent: "success" };
  if (v.includes("discount") || v.includes("approv")) return { icon: Star, accent: "warning" };
  if (v.includes("maintenance") || v.includes("repair") || v.includes("started job") || v.includes("complaint")) return { icon: Wrench, accent: "warning" };
  if (v.includes("check-in") || v.includes("checked in") || v.includes("checkin")) return { icon: LogIn, accent: "info" };
  if (v.includes("checkout") || v.includes("checked out")) return { icon: LogOut, accent: "neutral" };
  if (v.includes("reservation") || v.includes("booking") || v.includes("ota")) return { icon: BedDouble, accent: "info" };
  if (v.includes("login")) return { icon: LogIn, accent: "info" };
  if (v.includes("delet") || v.includes("cancel") || v.includes("remov")) return { icon: Trash2, accent: "danger" };
  const map: Record<ActivityTone, { icon: typeof BedDouble; accent: ActivityAccent }> = {
    success: { icon: CheckCircle2, accent: "success" },
    info: { icon: Bell, accent: "info" },
    warning: { icon: AlertTriangle, accent: "warning" },
    danger: { icon: AlertTriangle, accent: "danger" },
    brand: { icon: ActivityIcon, accent: "brand" },
    accent: { icon: Sparkles, accent: "brand" },
  };
  return map[tone];
}

const ACTIVITY_CHIP: Record<ActivityAccent, string> = {
  success: "bg-success-soft text-success",
  info: "bg-info-soft text-info",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  brand: "bg-brand-soft text-brand",
  neutral: "bg-surface-sunken text-muted-foreground",
};

type DashStats = {
  rooms: { total: number; occupied: number; available: number; occupancyPct: number };
  bookings: { total: number; inHouse: number; arrivalsToday: number; departuresToday: number };
  guests: { total: number; vip: number };
  revenue: { totalBooked: number; collected: number; outstanding: number; folioPayments: number };
  arrivals: Reservation[];
  departures: Reservation[];
  sourceMix: { source: string; bookings: number; revenue: number }[];
};

type RoomBoardRow = {
  id: string; number: string; floor: number; type: string;
  status: "occupied" | "available" | "dirty" | "cleaning" | "maintenance";
};

type AuditRow = {
  id: string; time: string; date: string; user: string;
  module: string; action: string; entity: string; severity: string;
};

export default function DashboardPage() {
  const [stats, setStats] = React.useState<DashStats | null>(null);
  React.useEffect(() => {
    let cancelled = false;
    apiGet<DashStats>("/stats").then(s => { if (!cancelled) setStats(s); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Real KPIs from Postgres when available, falling back to mock for decorative widgets.
  const k = stats
    ? { ...DASHBOARD_KPIS, occupancyPct: stats.rooms.occupancyPct, occupied: stats.rooms.occupied, totalRooms: stats.rooms.total, available: stats.rooms.available }
    : DASHBOARD_KPIS;
  const arrivals = stats?.arrivals ?? TODAY_ARRIVALS;
  const departures = stats?.departures ?? TODAY_DEPARTURES;

  const [now, setNow] = React.useState<string>("");
  const [nowMs, setNowMs] = React.useState<number>(0);
  const [tz, setTz] = React.useState<string>("");
  const [today, setToday] = React.useState<string>("");
  const property = useProperty();
  const propName = hotelName(property, "");
  const cur = currencySymbol(property);
  const [selectedRes, setSelectedRes] = React.useState<Reservation | null>(null);

  // Live room board (real per-room status) for the Live Status panel + floor map.
  const [board, setBoard] = React.useState<RoomBoardRow[] | null>(null);
  React.useEffect(() => {
    let cancelled = false;
    apiGet<RoomBoardRow[]>("/room-board").then(b => { if (!cancelled) setBoard(b); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Real activity trail for the live feed.
  const [audit, setAudit] = React.useState<AuditRow[] | null>(null);
  React.useEffect(() => {
    let cancelled = false;
    apiGet<AuditRow[]>("/audit-logs").then(a => { if (!cancelled) setAudit(a); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Room-status breakdown derived from the real board (falls back to mock ROOMS).
  const boardRooms = board ?? ROOMS.map(r => ({ id: r.id, number: r.number, floor: r.floor, type: r.type, status: r.status as RoomBoardRow["status"] }));
  const roomCounts = React.useMemo(() => {
    const c = { total: boardRooms.length, occupied: 0, available: 0, dirty: 0, cleaning: 0, maintenance: 0 };
    for (const r of boardRooms) if (r.status in c) (c as Record<string, number>)[r.status]++;
    return c;
  }, [boardRooms]);
  const occPct = roomCounts.total ? Math.round(roomCounts.occupied / roomCounts.total * 100) : 0;
  const availPct = roomCounts.total ? Math.round(roomCounts.available / roomCounts.total * 100) : 0;

  // Resolve a Guest record for the selected reservation (synthesize if not found)
  const selectedGuest: Guest | null = React.useMemo(() => {
    if (!selectedRes) return null;
    return (
      GUESTS.find(g => g.name === selectedRes.guestName) ?? {
        id: `g-${selectedRes.id}`,
        name: selectedRes.guestName,
        phone: "—",
        email: "—",
        nationality: "—",
        idType: "Passport",
        idNumber: "—",
        vip: selectedRes.vip,
        blacklist: false,
        lifetimeNights: selectedRes.nights,
        lifetimeSpend: selectedRes.total,
        lastStay: selectedRes.checkIn,
      }
    );
  }, [selectedRes]);

  React.useEffect(() => {
    const d = new Date();
    setNow(d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    setNowMs(d.getTime());
    setTz(tzAbbrev(d));
    setToday(`${d.toLocaleDateString(undefined, { weekday: "long" })}, ${d.getDate()} ${d.toLocaleDateString(undefined, { month: "long" })} ${d.getFullYear()}`);
  }, []);

  const arrivalsBalance = arrivals.reduce((s, r) => s + r.balance, 0);
  const vipArrivals = arrivals.filter(r => r.vip).length;

  // Booking-source mix from real data (falls back to mock).
  const topSources = stats?.sourceMix?.length
    ? stats.sourceMix.map(s => ({ name: s.source, revenue: s.revenue, bookings: s.bookings }))
    : TOP_SOURCES;

  // Live activity feed from the real audit trail (falls back to mock).
  const activity = React.useMemo(() => {
    if (!audit || audit.length === 0) return ACTIVITY;
    return audit.slice(0, 7).map(a => ({
      id: a.id,
      at: relTime(a.date, a.time, nowMs),
      actor: a.user || "System",
      verb: a.action.replace(/_/g, " ").toLowerCase(),
      target: a.entity && a.entity !== "—" ? a.entity : a.module,
      tone: auditTone(a.severity, a.action),
    }));
  }, [audit, nowMs]);

  // Today's priorities derived from real stats + the live room board.
  const priorities = React.useMemo(() => {
    const list: { tone: "danger" | "warning" | "info" | "accent"; icon: typeof AlertTriangle; count?: number; title: string; hint: string; href: string }[] = [];
    const out = stats?.revenue.outstanding ?? 0;
    if (out > 0) list.push({ tone: "danger", icon: Wallet, title: "Outstanding balance", hint: `${money(out, cur)} to collect across folios`, href: "/accounts" });
    if (arrivals.length > 0) list.push({ tone: "warning", icon: LogIn, count: arrivals.length, title: "Arrivals expected today", hint: "Assign room & prep at check-in", href: "/checkin" });
    if (departures.length > 0) list.push({ tone: "info", icon: LogOut, count: departures.length, title: "Checkouts due today", hint: "Settle the folio before checkout", href: "/checkout" });
    if (roomCounts.dirty > 0) list.push({ tone: "accent", icon: Sparkles, count: roomCounts.dirty, title: "Rooms to clean", hint: "Housekeeping sign-off pending", href: "/housekeeping" });
    if (roomCounts.maintenance > 0) list.push({ tone: "warning", icon: Wrench, count: roomCounts.maintenance, title: "Rooms out of order", hint: "Maintenance in progress", href: "/maintenance" });
    if (vipArrivals > 0) list.push({ tone: "accent", icon: Crown, count: vipArrivals, title: "VIP arrivals today", hint: "Flag rooms for special prep", href: "/guests" });
    return list.slice(0, 5);
  }, [stats, cur, arrivals, departures, roomCounts, vipArrivals]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-7">
      {/* ============ HEADER ============ */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <span className="h-11 w-11 shrink-0 rounded-xl bg-brand text-brand-foreground flex items-center justify-center shadow-sm">
            <Building2 className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-display font-semibold tracking-tight leading-none">Overview</h1>
            <p className="text-sm text-muted-foreground mt-1.5 inline-flex items-center gap-1.5 truncate">
              <span className="font-medium text-foreground/90 truncate">{propName || "—"}</span>
              {typeof property.branch === "string" && property.branch && (
                <>
                  <span className="text-border">·</span>
                  <span className="truncate">{property.branch}</span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft text-success px-2.5 py-1 text-xs font-semibold">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" /> Live
          </span>
          <span className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">{today || "—"}</span>
            {now && (
              <>
                <span className="text-border">·</span>
                <span className="font-medium tabular">{now} {tz}</span>
              </>
            )}
          </span>
        </div>
      </div>

      {/* ============ EXECUTIVE KPIs ============ */}
      <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <ExecKpi label="Total Rooms" value={roomCounts.total} icon={LayoutGrid} accent="neutral" />
        <ExecKpi label="Occupied" value={roomCounts.occupied} badge={`${occPct}%`} icon={KeyRound} accent="success" />
        <ExecKpi label="Available" value={roomCounts.available} badge={`${availPct}%`} icon={BedDouble} accent="info" />
        <ExecKpi label="Arrivals" value={arrivals.length} icon={LogIn} accent="brand" />
        <ExecKpi label="Departures" value={departures.length} icon={LogOut} accent="warning" />
        <ExecKpi label="Out of Order" value={roomCounts.maintenance} icon={Wrench} accent="danger" />
      </section>

      {/* ============ QUICK ACTIONS ============ */}
      <section>
        <SectionHeader title="Quick Actions" hint="Frequent reception flows" icon={ActivityIcon} />
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {QUICK_ACTIONS.map(a => {
            const Icon = a.icon;
            return (
              <Link key={a.href} href={a.href}>
                <Card className={cn(
                  "p-4 hover:shadow-md transition-all cursor-pointer group relative h-full",
                  "hover:border-brand hover:-translate-y-0.5"
                )}>
                  <div className={cn(
                    "h-10 w-10 rounded-md flex items-center justify-center transition-transform group-hover:scale-110",
                    a.tone === "brand" && "bg-brand text-brand-foreground",
                    a.tone === "info" && "bg-info-soft text-info",
                    a.tone === "accent" && "bg-accent-soft text-accent",
                    a.tone === "warning" && "bg-warning-soft text-warning",
                    a.tone === "success" && "bg-success-soft text-success",
                    a.tone === "neutral" && "bg-surface-sunken text-muted-foreground group-hover:bg-brand-soft group-hover:text-brand",
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-medium mt-2.5">{a.label}</p>
                  {a.count !== undefined && (
                    <span className="absolute top-3 right-3 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-semibold bg-brand text-brand-foreground shadow-xs">
                      {a.count}
                    </span>
                  )}
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ============ PRIORITIES + GAUGE + ACTIVITY ============ */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Priorities — 5 cols */}
        <Card className="lg:col-span-5 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-subtle-foreground font-semibold">Today&apos;s Priorities</p>
              <h2 className="text-lg font-semibold mt-0.5">What needs attention</h2>
            </div>
            <Badge tone="brand">{priorities.length} {priorities.length === 1 ? "item" : "items"}</Badge>
          </div>
          <div className="space-y-2">
            {priorities.length === 0 ? (
              <div className="flex items-center gap-3 p-4 rounded-md border border-border bg-surface-sunken/40">
                <span className="h-9 w-9 rounded-md bg-success-soft text-success flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-medium text-sm">All clear</p>
                  <p className="text-xs text-muted-foreground mt-0.5">No arrivals, checkouts or open balances right now.</p>
                </div>
              </div>
            ) : (
              priorities.map((p, i) => (
                <PriorityRow key={i} tone={p.tone} icon={p.icon} count={p.count} title={p.title} hint={p.hint} href={p.href} />
              ))
            )}
          </div>
        </Card>

        {/* Live Status — gauge + floor heatmap — 4 cols */}
        <Card className="lg:col-span-4 p-5">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-subtle-foreground font-semibold">Live Status</p>
              <h2 className="text-lg font-semibold mt-0.5">{roomCounts.total} rooms · all floors</h2>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              Live
            </span>
          </div>
          <div className="flex flex-col items-center pt-1">
            <OccupancyGauge value={occPct} size={170} hint={`${roomCounts.occupied} of ${roomCounts.total} sold`} />
          </div>

          {/* Floor heatmap — visual room-status grid */}
          <div className="mt-3 pt-3 border-t border-border">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] uppercase tracking-[0.16em] text-subtle-foreground font-semibold">Floor Map</p>
              <Link href="/rack" className="text-[10px] text-brand hover:underline font-medium inline-flex items-center gap-0.5">
                Open rack <ChevronRight className="h-2.5 w-2.5" />
              </Link>
            </div>
            <FloorHeatmap rooms={boardRooms as unknown as Room[]} />
            {/* Legend */}
            <div className="mt-2.5 flex flex-wrap gap-x-2 gap-y-1 text-[10px]">
              <LegendDot color="bg-status-occupied" label={`Occupied ${roomCounts.occupied}`} />
              <LegendDot color="bg-status-available" label={`Available ${roomCounts.available}`} />
              <LegendDot color="bg-status-dirty" label={`Dirty ${roomCounts.dirty}`} />
              <LegendDot color="bg-status-cleaning" label={`Cleaning ${roomCounts.cleaning}`} />
              <LegendDot color="bg-status-maintenance" label={`Maint ${roomCounts.maintenance}`} />
            </div>
          </div>
        </Card>

        {/* Activity feed — 3 cols */}
        <Card className="lg:col-span-3 p-5">
          <div className="mb-3">
            <h2 className="text-lg font-semibold">Activity</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Recent staff &amp; system events</p>
          </div>
          <ul className="-mx-2 max-h-[420px] overflow-y-auto pr-1">
            {activity.map(a => {
              const v = activityVisual(`${a.verb} ${a.target}`, a.tone);
              const Icon = v.icon;
              const title = a.verb.charAt(0).toUpperCase() + a.verb.slice(1);
              const detail = a.target && a.target !== "—" ? ` · ${a.target}` : "";
              const who = a.actor && a.actor !== "System" ? `${a.actor} · ` : "";
              return (
                <li key={a.id} className="flex items-start gap-3 px-2 py-2 rounded-md hover:bg-surface-sunken/50 transition-colors">
                  <span className={cn("h-8 w-8 shrink-0 rounded-lg flex items-center justify-center", ACTIVITY_CHIP[v.accent])}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-snug">
                      <span className="font-medium">{title}</span>
                      <span className="text-muted-foreground">{detail}</span>
                    </p>
                    <p className="text-[11px] text-subtle-foreground mt-0.5">{who}{a.at}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      </section>

      {/* ============ AI DAILY BRIEFING ============ */}
      <section>
        <Card className="p-5 relative overflow-hidden border-l-2 border-l-accent bg-linear-to-br from-accent-soft/15 via-surface to-surface">
          <div className="flex items-center gap-2.5 mb-3">
            <span className="h-9 w-9 rounded-md bg-accent text-accent-foreground flex items-center justify-center shadow-xs">
              <Bot className="h-4.5 w-4.5" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">AI Daily Briefing</p>
              <p className="text-[11px] text-muted-foreground">Live activity stream · updated 2m ago</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-md bg-info-soft text-info px-2 py-0.5 text-[10px] font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-info animate-pulse" /> AI
            </span>
          </div>
          <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2.5 text-sm">
            {AI_BRIEFING.map((b, i) => (
              <li key={i} className="flex items-start gap-2 leading-snug">
                <span className={cn(
                  "h-1.5 w-1.5 rounded-full mt-1.5 shrink-0",
                  b.tone === "success" && "bg-success",
                  b.tone === "info" && "bg-info",
                  b.tone === "warning" && "bg-warning",
                  b.tone === "danger" && "bg-danger",
                )} />
                <span>{b.text}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 pt-3 border-t border-border/40 flex items-center justify-between">
            <span className="inline-flex items-center gap-1 text-[10px] text-success font-medium">
              <CheckCircle2 className="h-3 w-3" /> Verified against live PMS data
            </span>
            <Link href="/ai" className="text-xs text-brand hover:underline inline-flex items-center gap-0.5 font-medium">
              Ask AI Assistant <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </Card>
      </section>

      {/* ============ REVENUE KPIs WITH SPARKLINES ============ */}
      <section>
        <SectionHeader title="Revenue · Today" hint="Each card shows trailing 7-day trend" icon={TrendingUp} />
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          <KPISpark icon={BedDouble} label="Room" value={money(k.roomRevenue, cur)} delta={4.2} spark={SPARKLINE_DATA.rooms} color="var(--color-brand)" accent="brand" />
          <KPISpark icon={UtensilsCrossed} label="F&B" value={money(k.foodRevenue, cur)} delta={6.8} spark={SPARKLINE_DATA.fb} color="var(--color-accent)" accent="accent" />
          <KPISpark icon={Building2} label="Hall" value={money(k.hallRevenue, cur)} delta={2.4} spark={SPARKLINE_DATA.hall} color="var(--color-info)" accent="info" />
          <KPISpark icon={Wallet} label="Advance" value={money(k.advanceReceived, cur)} delta={null} accent="success" />
          <KPISpark icon={Receipt} label="Pending" value={money(k.pendingPayments, cur)} delta={null} accent="warning" hint="Outstanding" />
          <KPISpark icon={TrendingUp} label="Net Profit" value={money(k.todayProfit, cur)} delta={8.4} spark={SPARKLINE_DATA.net} color="var(--color-success)" accent="brand" />
        </div>
      </section>

      {/* ============ ARRIVALS + DEPARTURES ============ */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Today&apos;s Arrivals</CardTitle>
              <Link href="/checkin" className="text-xs text-brand hover:underline inline-flex items-center gap-1">
                View all <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            <ul className="divide-y divide-border">
              {arrivals.map(r => (
                <li
                  key={r.id}
                  onDoubleClick={() => setSelectedRes(r)}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-surface-sunken transition-colors group cursor-pointer"
                  title="Double-click to view booking details"
                >
                  <Avatar name={r.guestName} size={36} vip={r.vip} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{r.guestName}</p>
                      <Badge tone="neutral">{r.source}</Badge>
                      {r.vip && <Crown className="h-3 w-3 text-brand shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      <span className="font-mono tabular">{r.bookingNo}</span> · Room {r.roomNumber} · {r.roomType} · {r.adults}A{r.children ? `+${r.children}C` : ""} · {r.nights}N
                    </p>
                  </div>
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-muted-foreground inline-flex items-center gap-0.5"><Clock className="h-3 w-3" />{formatTime(r.checkIn)}</p>
                    <PaymentBadge status={r.paymentStatus} />
                  </div>
                  <div className="inline-flex gap-1 opacity-80 group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setSelectedRes(r); }}
                      className="h-8 w-8 rounded-md border border-border hover:bg-brand hover:text-brand-foreground hover:border-brand inline-flex items-center justify-center text-muted-foreground transition-colors"
                      title="View booking details"
                      aria-label="View booking details"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    <Link href={`/checkin?book=${r.bookingNo}`} onClick={(e) => e.stopPropagation()}>
                      <Button size="sm">
                        <LogIn className="h-3.5 w-3.5" />
                        Check in
                      </Button>
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Today&apos;s Departures</CardTitle>
              <Link href="/checkout" className="text-xs text-brand hover:underline inline-flex items-center gap-1">
                View all <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            <ul className="divide-y divide-border">
              {departures.map(r => (
                <li key={r.id} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-sunken transition-colors">
                  <Avatar name={r.guestName} size={36} vip={r.vip} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{r.guestName}</p>
                      <StatusBadge status="checkout-pending" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Room {r.roomNumber} · Balance {money(r.balance, cur)}
                    </p>
                  </div>
                  <Link href={`/checkout/${r.bookingNo}`}><Button size="sm">Checkout</Button></Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      {/* ============ MONTHLY GOALS + TOP SOURCES ============ */}
      <section className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Goals — 3 cols */}
        <Card className="lg:col-span-3 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-subtle-foreground font-semibold inline-flex items-center gap-1">
                <Target className="h-3 w-3 text-brand" /> Monthly Goals · Target AED 160k
              </p>
              <h2 className="text-lg font-semibold mt-0.5">May 2026 — day 25 of 31</h2>
            </div>
            <Link href="/reports/r10" className="text-xs text-brand hover:underline inline-flex items-center gap-1">
              Forecast<ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-4">
            <GoalProgress
              label="Total Revenue"
              current={130110}
              target={160000}
              format={v => money(v, cur)}
              pace="ontrack"
            />
            <GoalProgress
              label="Occupancy"
              current={70}
              target={75}
              format={v => `${v}%`}
              pace="behind"
            />
            <GoalProgress
              label="ADR"
              current={742}
              target={720}
              format={v => money(v, cur)}
              pace="ahead"
            />
            <GoalProgress
              label="Direct Bookings"
              current={142}
              target={180}
              format={v => `${v}`}
              pace="behind"
            />
            <GoalProgress
              label="F&B Revenue"
              current={21340}
              target={24000}
              format={v => money(v, cur)}
              pace="ontrack"
            />
            <GoalProgress
              label="Net Profit"
              current={53810}
              target={55000}
              format={v => money(v, cur)}
              pace="ahead"
            />
          </div>
        </Card>

        {/* Top Sources leaderboard — 2 cols */}
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-subtle-foreground font-semibold">Top Sources MTD</p>
              <h2 className="text-lg font-semibold mt-0.5 inline-flex items-center gap-1.5">
                <Trophy className="h-4 w-4 text-brand" />Best Performers
              </h2>
            </div>
          </div>
          <ol className="space-y-2.5">
            {topSources.map((s, i) => {
              const maxRev = topSources[0].revenue;
              return (
                <li key={s.name} className="group">
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={cn(
                        "h-6 w-6 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0",
                        i === 0 ? "bg-brand text-brand-foreground" :
                        i === 1 ? "bg-accent-soft text-accent" :
                        i === 2 ? "bg-warning-soft text-warning" :
                        "bg-surface-sunken text-muted-foreground"
                      )}>
                        {i + 1}
                      </span>
                      <span className="text-sm font-medium truncate">{s.name}</span>
                    </div>
                    <span className="text-sm font-semibold tabular shrink-0">{money(s.revenue / 1000, cur)}k</span>
                  </div>
                  <div className="ml-8.5 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-surface-sunken rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full transition-all duration-700",
                          i === 0 ? "bg-brand" : i === 1 ? "bg-accent" : i === 2 ? "bg-warning" : "bg-muted-foreground"
                        )}
                        style={{ width: `${(s.revenue / maxRev) * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground tabular w-12 text-right">{s.bookings}b</span>
                  </div>
                </li>
              );
            })}
          </ol>
        </Card>
      </section>

      {/* ============ ARRIVAL PREP STRIP ============ */}
      <Card className="p-5 bg-linear-to-br from-brand-soft/30 via-surface to-surface border-l-4 border-l-brand">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <span className="h-12 w-12 rounded-md bg-brand text-brand-foreground flex items-center justify-center shrink-0">
            <Crown className="h-6 w-6" />
          </span>
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-semibold">Pre-arrival Preparation</p>
            <h3 className="text-lg font-semibold mt-0.5">
              {vipArrivals} VIP arrival{vipArrivals === 1 ? "" : "s"} · {arrivals.length} total
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Balance to collect on arrival: <span className="font-semibold text-foreground tabular">{money(arrivalsBalance, cur)}</span>.
              {vipArrivals > 0 && " VIP rooms flagged for inspection before 13:00."}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/housekeeping"><Button variant="outline">HK Status</Button></Link>
            <Link href="/checkin"><Button>Open Check-in<ChevronRight className="h-4 w-4" /></Button></Link>
          </div>
        </div>
      </Card>

      {/* ============ CHARTS ============ */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Occupancy Forecast — Next 30 days</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Live pace vs AI forecast model</p>
              </div>
              <Badge tone="brand"><Bot className="h-3 w-3" />AI</Badge>
            </div>
          </CardHeader>
          <CardContent className="pl-0">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={OCCUPANCY_FORECAST} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
                  <defs>
                    <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-brand)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--color-brand)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="grad2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="day" stroke="var(--color-muted-foreground)" fontSize={11} axisLine={false} tickLine={false} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={11} axisLine={false} tickLine={false} unit="%" />
                  <Tooltip contentStyle={{ background: "var(--color-surface-elevated)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12, color: "var(--color-foreground)" }} />
                  <Area type="monotone" dataKey="occupancy" stroke="var(--color-brand)" strokeWidth={2} fill="url(#grad1)" name="Booked" />
                  <Area type="monotone" dataKey="forecast" stroke="var(--color-accent)" strokeWidth={2} fill="url(#grad2)" strokeDasharray="4 4" name="Forecast" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Source Mix · 30d</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Where bookings originate</p>
          </CardHeader>
          <CardContent>
            <div className="h-44 flex items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={SOURCE_MIX} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2}>
                    {SOURCE_MIX.map((_, i) => (
                      <Cell key={i} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} stroke="var(--color-surface)" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "var(--color-surface-elevated)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12, color: "var(--color-foreground)" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-2 space-y-1.5">
              {SOURCE_MIX.slice(0, 4).map((s, i) => (
                <li key={s.name} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: SOURCE_COLORS[i % SOURCE_COLORS.length] }} />
                    <span className="text-muted-foreground truncate">{s.name}</span>
                  </span>
                  <span className="font-medium tabular">{s.value}%</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      {/* ============ REVENUE TREND + ALERTS ============ */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Revenue Trend — Last 6 Months</CardTitle>
              <Badge tone="success">+8.4% MoM</Badge>
            </div>
          </CardHeader>
          <CardContent className="pl-0">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={REVENUE_TREND} margin={{ top: 8, right: 16, bottom: 0, left: 8 }} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={11} axisLine={false} tickLine={false} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={11} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "var(--color-surface-elevated)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12, color: "var(--color-foreground)" }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="room" fill="var(--color-brand)" name="Room" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="food" fill="var(--color-accent)" name="F&B" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="hall" fill="var(--color-info)" name="Hall" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Alerts</CardTitle>
              <Badge tone="danger">{ALERTS.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {ALERTS.map(a => (
                <li key={a.id} className="flex gap-3 p-3 rounded-md border border-border hover:bg-surface-sunken transition-colors group/alert">
                  <span className={cn(
                    "shrink-0 h-7 w-7 rounded-md flex items-center justify-center",
                    a.level === "danger" && "bg-danger-soft text-danger",
                    a.level === "warning" && "bg-warning-soft text-warning",
                    a.level === "info" && "bg-info-soft text-info",
                  )}>
                    <AlertTriangle className="h-3.5 w-3.5" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-snug">{a.text}</p>
                    <Link href={a.href} className="mt-1 inline-flex items-center gap-1 text-xs text-brand hover:underline font-medium">
                      Review<ChevronRight className="h-3 w-3" />
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      {/* ============ AI FOOTER INSIGHT ============ */}
      <Card className="p-6 bg-linear-to-br from-brand-soft/40 via-surface to-accent-soft/30 border-l-4 border-l-brand">
        <div className="flex items-start gap-4">
          <span className="h-12 w-12 shrink-0 rounded-md bg-brand text-brand-foreground flex items-center justify-center shadow-md">
            <Sparkles className="h-6 w-6" />
          </span>
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-brand-soft-foreground">AI Revenue Insight</p>
            <p className="mt-2 text-base leading-relaxed">
              At the current pace and 6-month trend, you&apos;re projected to close May at{" "}
              <span className="font-semibold tabular">AED 142,400</span> — that&apos;s{" "}
              <span className="font-semibold text-success">+12.4%</span> above last May.
              Consider locking OTA rates for the first week of June; competitor rates are softening by an average of 4-6%.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Link href="/reports/r10" className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">
                See full revenue forecast <ChevronRight className="h-4 w-4" />
              </Link>
              <Link href="/revenue/strategy" className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline">
                Open strategy <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </Card>

      {/* Booking detail drawer — opens on row double-click or Eye icon */}
      <GuestDetailDrawer
        open={selectedRes !== null}
        onClose={() => setSelectedRes(null)}
        guest={selectedGuest}
        reservation={selectedRes}
      />
    </div>
  );
}

function SectionHeader({ title, hint, icon: Icon }: { title: string; hint?: string; icon?: typeof ActivityIcon }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      {Icon && <Icon className="h-3.5 w-3.5 text-brand" />}
      <div>
        <h2 className="text-[11px] uppercase tracking-[0.16em] font-semibold text-subtle-foreground">{title}</h2>
      </div>
      {hint && <span className="text-xs text-muted-foreground">· {hint}</span>}
      <div className="flex-1 h-px bg-border ml-2" />
    </div>
  );
}

function ExecKpi({ label, value, badge, icon: Icon, accent }: {
  label: string; value: number | string; badge?: string;
  icon: typeof BedDouble;
  accent: "neutral" | "success" | "info" | "brand" | "warning" | "danger";
}) {
  const styles: Record<string, { label: string; chip: string; badge: string }> = {
    neutral: { label: "text-muted-foreground", chip: "bg-surface-sunken text-muted-foreground", badge: "bg-surface-sunken text-muted-foreground" },
    success: { label: "text-success", chip: "bg-success-soft text-success", badge: "bg-success-soft text-success" },
    info: { label: "text-info", chip: "bg-info-soft text-info", badge: "bg-info-soft text-info" },
    brand: { label: "text-brand", chip: "bg-brand-soft text-brand", badge: "bg-brand-soft text-brand" },
    warning: { label: "text-warning", chip: "bg-warning-soft text-warning", badge: "bg-warning-soft text-warning" },
    danger: { label: "text-danger", chip: "bg-danger-soft text-danger", badge: "bg-danger-soft text-danger" },
  };
  const s = styles[accent];
  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <p className={cn("text-[11px] uppercase tracking-[0.12em] font-semibold", s.label)}>{label}</p>
        <span className={cn("h-8 w-8 shrink-0 rounded-lg flex items-center justify-center", s.chip)}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <p className="text-3xl font-semibold tabular tracking-tight">{value}</p>
        {badge && (
          <span className={cn("text-[11px] font-semibold rounded-md px-1.5 py-0.5", s.badge)}>{badge}</span>
        )}
      </div>
    </Card>
  );
}

function KPISpark({ icon: Icon, label, value, delta, hint, spark, color, accent }: {
  icon: typeof BedDouble; label: string; value: string; delta?: number | null; hint?: string;
  spark?: number[]; color?: string;
  accent: "brand" | "accent" | "info" | "success" | "warning";
}) {
  const accentClasses = {
    brand: "bg-brand-soft text-brand-soft-foreground",
    accent: "bg-accent-soft text-accent",
    info: "bg-info-soft text-info",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
  };
  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
          <p className="text-xl font-semibold tabular mt-1 tracking-tight">{value}</p>
          {hint && <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>}
        </div>
        <span className={cn("h-8 w-8 shrink-0 rounded-md inline-flex items-center justify-center", accentClasses[accent])}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-2 flex items-end justify-between gap-2 min-h-[28px]">
        {typeof delta === "number" && (
          <span className={cn(
            "text-[10px] font-medium inline-flex items-center gap-0.5",
            delta >= 0 ? "text-success" : "text-danger"
          )}>
            {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}%
          </span>
        )}
        {spark && spark.length > 0 && (
          <div className="flex-1 ml-2">
            <Sparkline data={spark} color={color} height={28} />
          </div>
        )}
      </div>
    </Card>
  );
}

function PriorityRow({ tone, icon: Icon, count, title, hint, href }: {
  tone: "danger" | "warning" | "info" | "accent";
  icon: typeof AlertTriangle;
  count?: number;
  title: string;
  hint: string;
  href: string;
}) {
  return (
    <Link href={href}>
      <div className="flex items-center gap-3 p-3 rounded-md border border-border hover:bg-surface-sunken hover:border-brand transition-all group">
        <span className={cn(
          "h-9 w-9 rounded-md flex items-center justify-center shrink-0",
          tone === "danger" && "bg-danger-soft text-danger",
          tone === "warning" && "bg-warning-soft text-warning",
          tone === "info" && "bg-info-soft text-info",
          tone === "accent" && "bg-accent-soft text-accent",
        )}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm">{title}</p>
            {typeof count === "number" && (
              <Badge tone={tone === "danger" ? "danger" : tone === "warning" ? "warning" : tone === "info" ? "info" : "accent"}>{count}</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-brand transition-colors" />
      </div>
    </Link>
  );
}

function StatRow({ label, value, dot }: { label: string; value: number; dot: string }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5 px-1 rounded hover:bg-surface-sunken/40 transition-colors">
      <span className="inline-flex items-center gap-2 text-muted-foreground min-w-0 truncate text-xs">
        <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dot)} />
        <span className="truncate">{label}</span>
      </span>
      <span className="tabular font-semibold text-sm">{value}</span>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground">
      <span className={cn("h-2 w-2 rounded-sm", color)} />
      <span className="tabular">{label}</span>
    </span>
  );
}

