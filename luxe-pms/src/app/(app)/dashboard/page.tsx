"use client";
import * as React from "react";
import Link from "next/link";
import {
  BedDouble, KeyRound, Sparkles, Wrench, TrendingUp, Wallet, Receipt, ChevronRight,
  AlertTriangle, Building2, UtensilsCrossed, LogIn, LogOut, LayoutGrid, CalendarRange,
  Bot, ClipboardCheck, FileBarChart, Bell, Sun, Crown,
  Activity as ActivityIcon, CheckCircle2, Clock, Target, Trophy, ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, PaymentBadge, StatusBadge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Sparkline } from "@/components/ui/sparkline";
import { OccupancyGauge } from "@/components/ui/occupancy-gauge";
import { FloorHeatmap } from "@/components/ui/floor-heatmap";
import { GoalProgress } from "@/components/ui/goal-progress";
import { money, pct, formatTime, cn } from "@/lib/utils";
import { apiGet } from "@/lib/api";
import {
  DASHBOARD_KPIS, TODAY_ARRIVALS, TODAY_DEPARTURES, REVENUE_TREND,
  OCCUPANCY_FORECAST, SOURCE_MIX, ALERTS, ROOMS, GUESTS,
} from "@/lib/mock-data";
import type { Reservation, Guest } from "@/lib/types";
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

type DashStats = {
  rooms: { total: number; occupied: number; available: number; occupancyPct: number };
  bookings: { total: number; inHouse: number; arrivalsToday: number; departuresToday: number };
  guests: { total: number; vip: number };
  revenue: { totalBooked: number; collected: number; outstanding: number; folioPayments: number };
  arrivals: Reservation[];
  departures: Reservation[];
  sourceMix: { source: string; bookings: number; revenue: number }[];
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
  const [today, setToday] = React.useState<string>("");
  const [greeting, setGreeting] = React.useState<string>("Good afternoon");
  const [userName, setUserName] = React.useState<string>("");
  const [selectedRes, setSelectedRes] = React.useState<Reservation | null>(null);

  // Real signed-in user for the greeting.
  React.useEffect(() => {
    apiGet<{ name: string }>("/me").then(u => { if (u?.name) setUserName(u.name); }).catch(() => {});
  }, []);

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
    setToday(d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" }));
    const h = d.getHours();
    setGreeting(h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : h < 21 ? "Good evening" : "Working late");
  }, []);

  const arrivalsBalance = arrivals.reduce((s, r) => s + r.balance, 0);
  const vipArrivals = arrivals.filter(r => r.vip).length;

  // Booking-source mix from real data (falls back to mock).
  const topSources = stats?.sourceMix?.length
    ? stats.sourceMix.map(s => ({ name: s.source, revenue: s.revenue, bookings: s.bookings }))
    : TOP_SOURCES;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-7">
      {/* ============ HERO ============ */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Main hero panel — 8 cols */}
        <Card className="lg:col-span-8 p-0 overflow-hidden relative">
          {/* decorative gradient + dot pattern */}
          <div className="absolute inset-0 bg-linear-to-br from-brand-soft/60 via-surface to-accent-soft/40 pointer-events-none" />
          <div
            className="absolute inset-0 opacity-[0.045] pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
              backgroundSize: "24px 24px",
            }}
          />
          <div className="absolute top-0 left-0 h-full w-1 bg-brand pointer-events-none" />

          <div className="relative p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold inline-flex items-center gap-2">
                  <Sun className="h-3 w-3 text-brand" />
                  {today || "—"} · {now || "—"}
                </p>
                <h1 className="mt-1.5 text-2xl sm:text-3xl font-display font-medium tracking-tight">
                  {greeting}, <span className="text-brand">{userName ? userName.split(" ")[0] : "there"}</span>.
                </h1>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed max-w-xl">
                  <span className="font-medium text-foreground">{k.occupancyPct}% occupancy</span> ·{" "}
                  <span className="font-medium text-foreground">{arrivals.length} arrivals</span> ·{" "}
                  <span className="font-medium text-foreground">{departures.length} departures</span> · net{" "}
                  <span className="text-success font-semibold">{money(k.todayProfit)}</span>
                </p>
              </div>
              <Avatar name={userName || "Guest User"} size={44} />
            </div>

            {/* Hero KPI strip */}
            <div className="mt-4 pt-4 border-t border-border/40 grid grid-cols-3 gap-4">
              <HeroStat
                label="Occupancy"
                value={pct(k.occupancyPct)}
                delta={2.1}
                spark={SPARKLINE_DATA.occupancy}
                sparkColor="var(--color-brand)"
              />
              <HeroStat
                label="ADR"
                value={money(k.adr)}
                delta={1.4}
                spark={SPARKLINE_DATA.adr}
                sparkColor="var(--color-accent)"
              />
              <HeroStat
                label="RevPAR"
                value={money(k.revpar)}
                delta={3.6}
                spark={SPARKLINE_DATA.revpar}
                sparkColor="var(--color-success)"
              />
            </div>
          </div>
        </Card>

        {/* AI Daily Briefing — 4 cols */}
        <Card className="lg:col-span-4 p-5 bg-linear-to-br from-accent-soft/30 via-surface to-brand-soft/30 border-l-4 border-l-accent flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <span className="h-8 w-8 rounded-md bg-accent text-accent-foreground flex items-center justify-center shadow-xs">
              <Bot className="h-4 w-4" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold">AI Daily Briefing</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Updated 8 min ago</p>
            </div>
            <Badge tone="accent">Live</Badge>
          </div>
          <ul className="space-y-2.5 text-sm flex-1">
            <AIBullet tone="info">Today&apos;s pace is <span className="font-semibold">+12%</span> vs last Sunday — hold rates.</AIBullet>
            <AIBullet tone="warning"><span className="font-semibold">2 VIP arrivals</span> at 14:00 — Suite 605 prep flagged.</AIBullet>
            <AIBullet tone="success">7-day forecast: <span className="font-semibold">78% occupancy</span>, healthy cash flow.</AIBullet>
            <AIBullet tone="danger">Cash mismatch on Shift #4217 — awaiting owner approval.</AIBullet>
          </ul>
          <div className="mt-2 inline-flex items-center gap-1 text-[10px] text-success font-medium">
            <CheckCircle2 className="h-3 w-3" /> All checks passed · briefing verified
          </div>
          <Link href="/ai" className="mt-4 pt-3 border-t border-border/40 text-xs text-brand hover:underline inline-flex items-center gap-0.5 font-medium">
            Ask AI Assistant <ChevronRight className="h-3 w-3" />
          </Link>
        </Card>
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
            <Badge tone="brand">5 items</Badge>
          </div>
          <div className="space-y-2">
            <PriorityRow tone="danger" icon={AlertTriangle} count={1} title="Cash mismatch — Shift #4217" hint="AED 50 excess · Owner approval" href="/cashier" />
            <PriorityRow tone="warning" icon={LogIn} count={3} title="Early check-in requested" hint="Rooms not yet ready for 2:00 PM" href="/checkin" />
            <PriorityRow tone="warning" icon={Wrench} count={1} title="Room 305 AC complaint" hint="In-house · Maintenance dispatched" href="/maintenance" />
            <PriorityRow tone="info" icon={LogOut} count={5} title="Pending checkouts" hint="3 with balance · 2 ready" href="/checkout" />
            <PriorityRow tone="accent" icon={Sparkles} count={6} title="Awaiting inspection" hint="HK supervisor sign-off pending" href="/housekeeping" />
          </div>
        </Card>

        {/* Live Status — gauge + floor heatmap — 4 cols */}
        <Card className="lg:col-span-4 p-5">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-subtle-foreground font-semibold">Live Status</p>
              <h2 className="text-lg font-semibold mt-0.5">{k.totalRooms} rooms · all floors</h2>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              Live
            </span>
          </div>
          <div className="flex flex-col items-center pt-1">
            <OccupancyGauge value={k.occupancyPct} size={170} hint={`${k.occupied} of ${k.totalRooms} sold`} />
          </div>

          {/* Floor heatmap — visual room-status grid */}
          <div className="mt-3 pt-3 border-t border-border">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] uppercase tracking-[0.16em] text-subtle-foreground font-semibold">Floor Map</p>
              <Link href="/rack" className="text-[10px] text-brand hover:underline font-medium inline-flex items-center gap-0.5">
                Open rack <ChevronRight className="h-2.5 w-2.5" />
              </Link>
            </div>
            <FloorHeatmap rooms={ROOMS} />
            {/* Legend */}
            <div className="mt-2.5 flex flex-wrap gap-x-2 gap-y-1 text-[10px]">
              <LegendDot color="bg-status-occupied" label={`Occupied ${k.occupied}`} />
              <LegendDot color="bg-status-reserved" label={`Reserved ${k.reserved}`} />
              <LegendDot color="bg-status-available" label={`Available ${k.available}`} />
              <LegendDot color="bg-status-dirty" label={`Dirty ${k.dirty}`} />
              <LegendDot color="bg-status-maintenance" label={`Maint ${k.maintenance}`} />
            </div>
          </div>
        </Card>

        {/* Activity feed — 3 cols */}
        <Card className="lg:col-span-3 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-subtle-foreground font-semibold">Activity</p>
              <h2 className="text-lg font-semibold mt-0.5">Live feed</h2>
            </div>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </div>
          <ol className="relative space-y-3">
            <div className="absolute left-1.5 top-1 bottom-1 w-px bg-border" />
            {ACTIVITY.map(a => (
              <li key={a.id} className="relative pl-6">
                <span className={cn(
                  "absolute left-0 top-1 h-3 w-3 rounded-full ring-2 ring-surface",
                  a.tone === "success" && "bg-success",
                  a.tone === "info" && "bg-info",
                  a.tone === "warning" && "bg-warning",
                  a.tone === "danger" && "bg-danger",
                  a.tone === "brand" && "bg-brand",
                  a.tone === "accent" && "bg-accent",
                )} />
                <p className="text-xs leading-snug">
                  <span className="font-medium">{a.actor}</span>{" "}
                  <span className="text-muted-foreground">{a.verb}</span>{" "}
                  <span className="font-medium">{a.target}</span>
                </p>
                <p className="text-[10px] text-subtle-foreground mt-0.5 tabular">{a.at}</p>
              </li>
            ))}
          </ol>
        </Card>
      </section>

      {/* ============ REVENUE KPIs WITH SPARKLINES ============ */}
      <section>
        <SectionHeader title="Revenue · Today" hint="Each card shows trailing 7-day trend" icon={TrendingUp} />
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          <KPISpark icon={BedDouble} label="Room" value={money(k.roomRevenue)} delta={4.2} spark={SPARKLINE_DATA.rooms} color="var(--color-brand)" accent="brand" />
          <KPISpark icon={UtensilsCrossed} label="F&B" value={money(k.foodRevenue)} delta={6.8} spark={SPARKLINE_DATA.fb} color="var(--color-accent)" accent="accent" />
          <KPISpark icon={Building2} label="Hall" value={money(k.hallRevenue)} delta={2.4} spark={SPARKLINE_DATA.hall} color="var(--color-info)" accent="info" />
          <KPISpark icon={Wallet} label="Advance" value={money(k.advanceReceived)} delta={null} accent="success" />
          <KPISpark icon={Receipt} label="Pending" value={money(k.pendingPayments)} delta={null} accent="warning" hint="Outstanding" />
          <KPISpark icon={TrendingUp} label="Net Profit" value={money(k.todayProfit)} delta={8.4} spark={SPARKLINE_DATA.net} color="var(--color-success)" accent="brand" />
        </div>
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
              format={v => money(v)}
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
              format={v => money(v)}
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
              format={v => money(v)}
              pace="ontrack"
            />
            <GoalProgress
              label="Net Profit"
              current={53810}
              target={55000}
              format={v => money(v)}
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
                    <span className="text-sm font-semibold tabular shrink-0">{money(s.revenue / 1000)}k</span>
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
              Balance to collect on arrival: <span className="font-semibold text-foreground tabular">{money(arrivalsBalance)}</span>.
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
                      Room {r.roomNumber} · Balance {money(r.balance)}
                    </p>
                  </div>
                  <Link href={`/checkout/${r.bookingNo}`}><Button size="sm">Checkout</Button></Link>
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

function HeroStat({ label, value, delta, spark, sparkColor }: {
  label: string; value: string; delta?: number; spark?: number[]; sparkColor?: string;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
      <p className="text-2xl font-semibold tabular mt-1 tracking-tight">{value}</p>
      {typeof delta === "number" && (
        <span className={cn(
          "text-[11px] inline-flex items-center gap-0.5 mt-0.5 font-medium",
          delta >= 0 ? "text-success" : "text-danger"
        )}>
          {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}% <span className="text-muted-foreground font-normal ml-0.5">vs yesterday</span>
        </span>
      )}
      {spark && spark.length > 0 && (
        <Sparkline data={spark} color={sparkColor} height={20} className="mt-1.5 -mx-1" />
      )}
    </div>
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
  count: number;
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
            <Badge tone={tone === "danger" ? "danger" : tone === "warning" ? "warning" : tone === "info" ? "info" : "accent"}>{count}</Badge>
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

function AIBullet({ tone, children }: { tone: "info" | "warning" | "success" | "danger"; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 leading-snug">
      <span className={cn(
        "h-1.5 w-1.5 rounded-full mt-1.5 shrink-0",
        tone === "info" && "bg-info",
        tone === "warning" && "bg-warning",
        tone === "success" && "bg-success",
        tone === "danger" && "bg-danger",
      )} />
      <span className="text-sm">{children}</span>
    </li>
  );
}
