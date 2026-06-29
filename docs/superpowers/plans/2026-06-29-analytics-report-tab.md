# Analytics Report Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the dashboard's analytics blocks (Revenue, Monthly Goals + Top Sources, Occupancy Forecast + Source Mix, Revenue Trend + Alerts) into a new manager-only "Analytics Report" sidebar tab, and remove them from the dashboard.

**Architecture:** Extract the shared `SectionHeader` helper, build a self-contained `<AnalyticsReport>` client component that fetches its own data and renders all four blocks, mount it on a new `/analytics` route, add a nav entry, then strip the moved sections and their orphaned code from the dashboard. Each step keeps the app building.

**Tech Stack:** Next.js 16 (App Router, `(app)` route group), React 19, TypeScript, Tailwind v4, recharts 3, lucide-react. Spec: [docs/superpowers/specs/2026-06-29-analytics-report-tab-design.md](../specs/2026-06-29-analytics-report-tab-design.md).

## Global Constraints

- All work is in `luxe-pms/` (run commands from that directory).
- This is NOT stock Next.js — APIs may differ from training data. Before writing routing/data code, consult `node_modules/next/dist/docs/` and heed deprecation notices (per `luxe-pms/AGENTS.md`).
- Pages and interactive components are `"use client"` and `export default function` / named exports, matching existing files.
- No backend changes. The analytics page is read-only and uses existing endpoints: `/stats`, `/dashboard/goals`, `/dashboard/occupancy-forecast`, `/dashboard/revenue-trend`, `/dashboard/alerts`.
- Preserve existing markup/styling verbatim when moving blocks — this is a move, not a redesign.
- Verification commands (from `luxe-pms/`): typecheck `npx tsc --noEmit`, lint `npm run lint`, build `npm run build`, tests `npm test`.

---

## File Structure

- **Create** `luxe-pms/src/components/dashboard/section-header.tsx` — shared `SectionHeader` (used by both the dashboard's Quick Actions and the analytics Revenue block).
- **Create** `luxe-pms/src/components/dashboard/analytics-report.tsx` — self-contained `<AnalyticsReport>` component: own data fetching + all four analytics blocks + local `KPISpark` helper.
- **Create** `luxe-pms/src/app/(app)/analytics/page.tsx` — thin page rendering `<AnalyticsReport />`.
- **Modify** `luxe-pms/src/lib/nav.ts` — add the "Analytics Report" nav item.
- **Modify** `luxe-pms/src/app/(app)/dashboard/page.tsx` — import shared `SectionHeader`; remove the four analytics sections and their now-orphaned state, effects, derived values, constants, types, imports, and the `KPISpark`/`StatRow` helpers.

---

### Task 1: Extract shared `SectionHeader`

Pull the `SectionHeader` helper out of the dashboard into a shared file so both the dashboard (Quick Actions) and the new analytics component can use it. Dashboard behaviour is unchanged.

**Files:**
- Create: `luxe-pms/src/components/dashboard/section-header.tsx`
- Modify: `luxe-pms/src/app/(app)/dashboard/page.tsx` (remove local `SectionHeader` definition at lines 946-957; add import)

**Interfaces:**
- Produces: `export function SectionHeader({ title, hint, icon }: { title: string; hint?: string; icon?: LucideIcon }): JSX.Element` — renders an uppercase section label with an optional leading icon and trailing hint.
- Consumes: nothing from other tasks.

- [ ] **Step 1: Create the shared component**

Create `luxe-pms/src/components/dashboard/section-header.tsx` with the exact markup moved from the dashboard (the dashboard typed `icon` as `typeof ActivityIcon`; use the proper `LucideIcon` type here):

```tsx
import { type LucideIcon } from "lucide-react";

/** Uppercase section divider with an optional leading icon and trailing hint. */
export function SectionHeader({ title, hint, icon: Icon }: { title: string; hint?: string; icon?: LucideIcon }) {
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
```

- [ ] **Step 2: Remove the local definition from the dashboard**

In `luxe-pms/src/app/(app)/dashboard/page.tsx`, delete the local `SectionHeader` function (currently lines 946-957):

```tsx
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
```

- [ ] **Step 3: Add the import to the dashboard**

In `luxe-pms/src/app/(app)/dashboard/page.tsx`, add this import alongside the other `@/components` imports (e.g. just after the `GoalProgress` import near line 19):

```tsx
import { SectionHeader } from "@/components/dashboard/section-header";
```

- [ ] **Step 4: Typecheck and lint**

Run from `luxe-pms/`:
```bash
npx tsc --noEmit && npm run lint
```
Expected: no errors. (The dashboard still references `SectionHeader` for Quick Actions and Revenue — now via the import.)

- [ ] **Step 5: Commit**

```bash
git add luxe-pms/src/components/dashboard/section-header.tsx luxe-pms/src/app/(app)/dashboard/page.tsx
git commit -m "refactor(dashboard): extract shared SectionHeader component"
```

---

### Task 2: Build the `AnalyticsReport` component

Create the self-contained component holding all four analytics blocks and their data fetching. It is not yet routed, so the app is unaffected at runtime; this task verifies it compiles.

**Files:**
- Create: `luxe-pms/src/components/dashboard/analytics-report.tsx`

**Interfaces:**
- Consumes: `SectionHeader` from `@/components/dashboard/section-header` (Task 1); `apiGet` from `@/lib/api`; `useProperty`, `currencySymbol` from `@/lib/use-property`; `money`, `cn` from `@/lib/utils`; `Card`/`CardContent`/`CardHeader`/`CardTitle`, `Badge`, `Sparkline`, `GoalProgress` from `@/components/ui/*`.
- Produces: `export function AnalyticsReport(): JSX.Element` — full-page analytics view, used by Task 3.

- [ ] **Step 1: Create the component file**

Create `luxe-pms/src/components/dashboard/analytics-report.tsx` with the full content below. The markup is moved verbatim from the dashboard's four analytics sections plus its offline banner and `KPISpark` helper:

```tsx
"use client";
import * as React from "react";
import Link from "next/link";
import {
  TrendingUp, BedDouble, UtensilsCrossed, Building2, Wallet, Receipt,
  ChevronRight, Target, Trophy, Bot, Bell, AlertTriangle, CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkline } from "@/components/ui/sparkline";
import { GoalProgress } from "@/components/ui/goal-progress";
import { SectionHeader } from "@/components/dashboard/section-header";
import { money, cn } from "@/lib/utils";
import { apiGet } from "@/lib/api";
import { useProperty, currencySymbol } from "@/lib/use-property";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";

// Distinct categorical palette so every source slice is easy to tell apart.
const SOURCE_COLORS = [
  "var(--color-brand)", // gold
  "#3b82f6",            // blue
  "#10b981",            // emerald
  "#ec4899",            // pink
  "#8b5cf6",            // violet
  "#06b6d4",            // cyan
  "#f97316",            // orange
  "#64748b",            // slate
];

const TOP_SOURCES = [
  { name: "Direct / Website", revenue: 38400, bookings: 52 },
  { name: "Booking.com", revenue: 32200, bookings: 41 },
  { name: "Corporate (TechCorp)", revenue: 18600, bookings: 14 },
  { name: "Agoda", revenue: 14800, bookings: 22 },
  { name: "Pearl Holidays", revenue: 11200, bookings: 9 },
  { name: "Expedia", revenue: 8900, bookings: 11 },
];

// Used only while the goals endpoint is offline.
const GOALS_FALLBACK: GoalRow[] = [
  { label: "Total Revenue", current: 0, target: 160000, format: "money", pace: "behind" },
  { label: "Occupancy", current: 0, target: 75, format: "pct", pace: "behind" },
  { label: "ADR", current: 0, target: 720, format: "money", pace: "behind" },
  { label: "Direct Bookings", current: 0, target: 60, format: "number", pace: "behind" },
  { label: "F&B Revenue", current: 0, target: 24000, format: "money", pace: "behind" },
  { label: "Outstanding", current: 0, target: 50000, format: "money", pace: "ahead" },
];

// Only the slice of /stats this view needs.
type StatsForAnalytics = {
  revenue: { room: number; food: number; hall: number; advance: number; pending: number; total: number };
  sourceMix: { source: string; bookings: number; revenue: number }[];
};
type TrendRow = { month: string; room: number; food: number; hall: number };
type ForecastRow = { day: number; occupancy: number; forecast: number };
type AlertRow = { id: string; level: "danger" | "warning" | "info"; text: string; href: string };
type GoalRow = { label: string; current: number; target: number; format: "money" | "pct" | "number"; pace: "ahead" | "ontrack" | "behind" };

export function AnalyticsReport() {
  const [stats, setStats] = React.useState<StatsForAnalytics | null>(null);
  const [offline, setOffline] = React.useState(false);
  const [trend, setTrend] = React.useState<TrendRow[] | null>(null);
  const [forecast, setForecast] = React.useState<ForecastRow[] | null>(null);
  const [liveAlerts, setLiveAlerts] = React.useState<AlertRow[] | null>(null);
  const [goals, setGoals] = React.useState<GoalRow[] | null>(null);
  const [period, setPeriod] = React.useState<{ label: string; day: number; days: number } | null>(null);

  const property = useProperty();
  const cur = currencySymbol(property);

  React.useEffect(() => {
    let cancelled = false;
    apiGet<StatsForAnalytics>("/stats")
      .then(s => { if (!cancelled) { setStats(s); setOffline(false); } })
      .catch(() => { if (!cancelled) setOffline(true); });
    return () => { cancelled = true; };
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    apiGet<TrendRow[]>("/dashboard/revenue-trend").then(d => { if (!cancelled) setTrend(d); }).catch(() => {});
    apiGet<ForecastRow[]>("/dashboard/occupancy-forecast").then(d => { if (!cancelled) setForecast(d); }).catch(() => {});
    apiGet<AlertRow[]>("/dashboard/alerts").then(d => { if (!cancelled) setLiveAlerts(d); }).catch(() => {});
    apiGet<GoalRow[]>("/dashboard/goals").then(d => { if (!cancelled) setGoals(d); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  React.useEffect(() => {
    const d = new Date();
    setPeriod({
      label: d.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
      day: d.getDate(),
      days: new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(),
    });
  }, []);

  const rev = stats?.revenue;
  const trendData: TrendRow[] = trend ?? [];
  const forecastData: ForecastRow[] = forecast ?? [];
  const alertsData = liveAlerts ?? [];

  // Booking-source mix from real data (falls back to mock).
  const topSources = stats?.sourceMix?.length
    ? stats.sourceMix.map(s => ({ name: s.source, revenue: s.revenue, bookings: s.bookings }))
    : TOP_SOURCES;

  const sourceMixDonut = React.useMemo(() => {
    const sm = stats?.sourceMix ?? [];
    const total = sm.reduce((s, x) => s + x.revenue, 0) || 1;
    return sm.map(x => ({ name: x.source, value: Math.round((x.revenue / total) * 100) }));
  }, [stats]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-7">
      {offline && (
        <div className="rounded-lg border border-warning/40 bg-warning-soft/40 px-4 py-2.5 text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
          <span><span className="font-semibold text-warning">Backend offline</span> — showing sample data. Start the API on <span className="font-mono">:8000</span> to see live numbers.</span>
        </div>
      )}

      {/* ============ REVENUE BREAKDOWN ============ */}
      <section>
        <SectionHeader title="Revenue" hint="Live booked revenue across departments" icon={TrendingUp} />
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          <KPISpark icon={BedDouble} label="Room" value={money(rev?.room ?? 0, cur)} delta={null} accent="brand" />
          <KPISpark icon={UtensilsCrossed} label="F&B" value={money(rev?.food ?? 0, cur)} delta={null} accent="accent" />
          <KPISpark icon={Building2} label="Hall" value={money(rev?.hall ?? 0, cur)} delta={null} accent="info" />
          <KPISpark icon={Wallet} label="Advance" value={money(rev?.advance ?? 0, cur)} delta={null} accent="success" hint="Collected" />
          <KPISpark icon={Receipt} label="Outstanding" value={money(rev?.pending ?? 0, cur)} delta={null} accent="warning" hint="To collect" />
          <KPISpark icon={TrendingUp} label="Total" value={money(rev?.total ?? 0, cur)} delta={null} accent="brand" hint="Room + F&B + Hall" />
        </div>
      </section>

      {/* ============ MONTHLY GOALS + TOP SOURCES ============ */}
      <section className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-stretch">
        {/* Goals — 3 cols */}
        <Card className="lg:col-span-3 p-5 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-subtle-foreground font-semibold inline-flex items-center gap-1">
                <Target className="h-3 w-3 text-brand" /> Monthly Goals
              </p>
              <h2 className="text-base font-semibold mt-0.5">
                {period ? `${period.label} — day ${period.day} of ${period.days}` : "This month"}
              </h2>
            </div>
            <Link href="/reports/r10" className="text-xs text-brand hover:underline inline-flex items-center gap-1">
              Forecast<ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1 auto-rows-fr">
            {(goals ?? GOALS_FALLBACK).map(g => (
              <GoalProgress
                key={g.label}
                label={g.label}
                current={g.current}
                target={g.target}
                format={g.format === "money" ? (v => money(v, cur)) : g.format === "pct" ? (v => `${v}%`) : (v => `${v}`)}
                pace={g.pace}
              />
            ))}
          </div>
        </Card>

        {/* Top Sources leaderboard — 2 cols */}
        <Card className="lg:col-span-2 p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-subtle-foreground font-semibold">Top Sources MTD</p>
              <h2 className="text-base font-semibold mt-0.5 inline-flex items-center gap-1.5">
                <Trophy className="h-4 w-4 text-brand" />Best Performers
              </h2>
            </div>
          </div>
          <ol className="space-y-0.5 max-h-[300px] overflow-y-auto pr-1 -mr-1">
            {topSources.map((s, i) => {
              const maxRev = topSources[0].revenue;
              return (
                <li key={s.name} className="group flex items-center gap-2.5 -mx-2 px-2 py-1 rounded-md hover:bg-surface-sunken/40 transition-colors">
                  <span className={cn(
                    "h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0",
                    i === 0 ? "bg-brand text-brand-foreground" :
                    i === 1 ? "bg-accent-soft text-accent" :
                    i === 2 ? "bg-warning-soft text-warning" :
                    "bg-surface-sunken text-muted-foreground"
                  )}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate">{s.name}</span>
                      <span className="text-sm font-semibold tabular shrink-0">{money(s.revenue / 1000, cur)}k</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-2 bg-surface-sunken rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-700",
                            i === 0 ? "bg-brand" : i === 1 ? "bg-accent" : i === 2 ? "bg-warning" : "bg-muted-foreground/60"
                          )}
                          style={{ width: `${(s.revenue / maxRev) * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground tabular shrink-0">{s.bookings} bkg{s.bookings === 1 ? "" : "s"}</span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </Card>
      </section>

      {/* ============ CHARTS ============ */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2 flex flex-col">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>Occupancy Forecast — Next 30 days</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Booked pace vs AI forecast model</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="h-1 w-4 rounded-full bg-brand" /> Booked
                </span>
                <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="w-4 border-t-2 border-dashed" style={{ borderColor: "#06b6d4" }} /> Forecast
                </span>
                <Badge tone="brand"><Bot className="h-3 w-3" />AI</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pl-0 flex-1 flex flex-col">
            <div className="flex-1 min-h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={forecastData} margin={{ top: 14, right: 16, bottom: 0, left: 8 }}>
                  <defs>
                    <linearGradient id="fcBooked" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-brand)" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="var(--color-brand)" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="fcForecast" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="day" stroke="var(--color-muted-foreground)" fontSize={11} axisLine={false} tickLine={false} interval={2} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={11} axisLine={false} tickLine={false} unit="%" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} />
                  <Tooltip formatter={(value) => `${value}%`} contentStyle={{ background: "var(--color-surface-elevated)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12, color: "var(--color-foreground)" }} />
                  <Area type="natural" dataKey="forecast" stroke="#06b6d4" strokeWidth={3} fill="url(#fcForecast)" strokeDasharray="6 4" name="Forecast" dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
                  <Area type="natural" dataKey="occupancy" stroke="var(--color-brand)" strokeWidth={3} fill="url(#fcBooked)" name="Booked" dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
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
            <div className="relative h-36">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sourceMixDonut} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={62} paddingAngle={2}>
                    {sourceMixDonut.map((_, i) => (
                      <Cell key={i} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} stroke="var(--color-surface)" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value}%`} contentStyle={{ background: "var(--color-surface-elevated)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12, color: "var(--color-foreground)" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-semibold tabular leading-none">{sourceMixDonut[0]?.value}%</span>
                <span className="text-[10px] text-muted-foreground mt-1 max-w-[88px] truncate text-center">{sourceMixDonut[0]?.name}</span>
              </div>
            </div>
            <ul className="mt-3 space-y-1.5 max-h-[150px] overflow-y-auto pr-1 -mr-1">
              {sourceMixDonut.map((s, i) => {
                const color = SOURCE_COLORS[i % SOURCE_COLORS.length];
                const maxVal = sourceMixDonut[0]?.value || 1;
                return (
                  <li key={s.name} className="flex items-center gap-2.5 text-xs">
                    <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ background: color }} />
                    <span className="text-muted-foreground truncate w-24 shrink-0">{s.name}</span>
                    <span className="flex-1 h-1.5 bg-surface-sunken rounded-full overflow-hidden">
                      <span className="block h-full rounded-full" style={{ width: `${(s.value / maxVal) * 100}%`, background: color }} />
                    </span>
                    <span className="font-semibold tabular shrink-0 w-8 text-right">{s.value}%</span>
                  </li>
                );
              })}
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
                <BarChart data={trendData} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={11} axisLine={false} tickLine={false} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={11} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} />
                  <Tooltip formatter={(value) => money(Number(value), cur)} contentStyle={{ background: "var(--color-surface-elevated)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12, color: "var(--color-foreground)" }} cursor={{ fill: "var(--color-surface-sunken)", opacity: 0.4 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" iconSize={8} />
                  <Bar dataKey="room" stackId="rev" fill="var(--color-brand)" name="Room" maxBarSize={44} />
                  <Bar dataKey="food" stackId="rev" fill="#10b981" name="F&B" maxBarSize={44} />
                  <Bar dataKey="hall" stackId="rev" fill="var(--color-info)" name="Hall" radius={[4, 4, 0, 0]} maxBarSize={44} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Alerts</CardTitle>
              <Badge tone="danger">{alertsData.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {alertsData.length === 0 ? (
              <div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-surface-sunken/40">
                <span className="h-8 w-8 rounded-lg bg-success-soft text-success flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
                <p className="text-sm text-muted-foreground">No open alerts — all systems nominal.</p>
              </div>
            ) : (
            <ul className="space-y-2 max-h-[244px] overflow-y-auto pr-1">
              {alertsData.map(a => {
                const AlertIcon = a.level === "info" ? Bell : AlertTriangle;
                return (
                  <li key={a.id} className={cn(
                    "flex gap-3 p-3 rounded-lg border border-border border-l-2 hover:bg-surface-sunken/50 transition-colors",
                    a.level === "danger" && "border-l-danger",
                    a.level === "warning" && "border-l-warning",
                    a.level === "info" && "border-l-info",
                  )}>
                    <span className={cn(
                      "shrink-0 h-8 w-8 rounded-lg ring-1 ring-inset flex items-center justify-center",
                      a.level === "danger" && "bg-danger-soft text-danger ring-danger/20",
                      a.level === "warning" && "bg-warning-soft text-warning ring-warning/20",
                      a.level === "info" && "bg-info-soft text-info ring-info/20",
                    )}>
                      <AlertIcon className="h-4 w-4" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm leading-snug">{a.text}</p>
                      <Link href={a.href} className="mt-1 inline-flex items-center gap-0.5 text-xs text-brand hover:underline font-medium">
                        Review <ChevronRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function KPISpark({ icon: Icon, label, value, delta, hint, spark, color, accent }: {
  icon: typeof BedDouble; label: string; value: string; delta?: number | null; hint?: string;
  spark?: number[]; color?: string;
  accent: "brand" | "accent" | "info" | "success" | "warning";
}) {
  const chip: Record<string, string> = {
    brand: "bg-brand-soft text-brand ring-brand/20",
    accent: "bg-accent-soft text-accent ring-accent/20",
    info: "bg-info-soft text-info ring-info/20",
    success: "bg-success-soft text-success ring-success/20",
    warning: "bg-warning-soft text-warning ring-warning/20",
  };
  return (
    <Card className="p-4 flex flex-col hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground font-semibold pt-0.5">{label}</p>
        <span className={cn("h-9 w-9 shrink-0 rounded-xl ring-1 ring-inset inline-flex items-center justify-center", chip[accent])}>
          <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
        </span>
      </div>
      <p className="text-2xl font-semibold tabular mt-2.5 tracking-tight leading-none">{value}</p>
      <div className="mt-1.5 flex items-center gap-2">
        {typeof delta === "number" && (
          <span className={cn(
            "text-[11px] font-semibold inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5",
            delta >= 0 ? "text-success bg-success-soft/60" : "text-danger bg-danger-soft/60"
          )}>
            {delta >= 0 ? "↗" : "↘"} {Math.abs(delta).toFixed(1)}%
          </span>
        )}
        {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
      </div>
      {spark && spark.length > 0 && (
        <Sparkline data={spark} color={color} height={30} className="mt-auto pt-3 -mx-1 -mb-1" />
      )}
    </Card>
  );
}
```

- [ ] **Step 2: Typecheck and lint**

Run from `luxe-pms/`:
```bash
npx tsc --noEmit && npm run lint
```
Expected: no errors. (`Sparkline`, `color`, `spark`, `delta` are part of the moved `KPISpark` signature; they are referenced inside the component so there are no unused-symbol errors.)

- [ ] **Step 3: Commit**

```bash
git add luxe-pms/src/components/dashboard/analytics-report.tsx
git commit -m "feat(analytics): add self-contained AnalyticsReport component"
```

---

### Task 3: Add the `/analytics` route and nav entry

Mount the component on a new page and surface it in the sidebar. After this task the new tab works (the dashboard still shows the blocks too — that duplication is removed in Task 4).

**Files:**
- Create: `luxe-pms/src/app/(app)/analytics/page.tsx`
- Modify: `luxe-pms/src/lib/nav.ts:64` (insert before the `/reports` entry)

**Interfaces:**
- Consumes: `AnalyticsReport` from `@/components/dashboard/analytics-report` (Task 2); `NavItem` shape and `MANAGER` const already in `nav.ts`.
- Produces: route `/analytics`; nav item visible to managers.

- [ ] **Step 1: Create the page**

Create `luxe-pms/src/app/(app)/analytics/page.tsx`:

```tsx
import { AnalyticsReport } from "@/components/dashboard/analytics-report";

export default function AnalyticsPage() {
  return <AnalyticsReport />;
}
```

- [ ] **Step 2: Add the nav item**

In `luxe-pms/src/lib/nav.ts`, insert the Analytics Report entry immediately before the existing `/reports` line (currently line 64). `TrendingUp` is already imported at the top of the file.

Find:
```ts
  { href: "/reports", label: "Reports", icon: FileBarChart, group: "system", roles: MANAGER },
```
Replace with:
```ts
  { href: "/analytics", label: "Analytics Report", icon: TrendingUp, group: "system", roles: MANAGER },
  { href: "/reports", label: "Reports", icon: FileBarChart, group: "system", roles: MANAGER },
```

- [ ] **Step 3: Typecheck, lint, build**

Run from `luxe-pms/`:
```bash
npx tsc --noEmit && npm run lint && npm run build
```
Expected: clean compile and a successful production build (confirms the new route renders and recharts works in the App Router build).

- [ ] **Step 4: Manual smoke check**

Start the app (`npm run dev`), sign in as a manager (`admin@hotel.com` / `password123`), open the sidebar **System** group, click **Analytics Report**. Expected: the four blocks render with the same look as the dashboard. Stop the backend and reload to confirm the offline banner appears and goals/sources fall back to sample data.

- [ ] **Step 5: Commit**

```bash
git add "luxe-pms/src/app/(app)/analytics/page.tsx" luxe-pms/src/lib/nav.ts
git commit -m "feat(analytics): add /analytics route and sidebar tab"
```

---

### Task 4: Remove the analytics blocks from the dashboard

Delete the four moved sections and every symbol that only existed to serve them. After this task the dashboard shows only operational content and the move is complete.

**Files:**
- Modify: `luxe-pms/src/app/(app)/dashboard/page.tsx`

**Interfaces:**
- Consumes: shared `SectionHeader` (already imported in Task 1) — still used by the Quick Actions section.
- Produces: a dashboard with sections 1–4 only.

- [ ] **Step 1: Trim the top-of-file imports**

In `luxe-pms/src/app/(app)/dashboard/page.tsx`:

(a) Remove the `Sparkline` import line (currently line 16):
```tsx
import { Sparkline } from "@/components/ui/sparkline";
```

(b) Remove the `GoalProgress` import line (currently line 19):
```tsx
import { GoalProgress } from "@/components/ui/goal-progress";
```

(c) Remove the entire recharts import block (currently lines 26-29):
```tsx
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";
```

(d) Remove the now-unused lucide icons `TrendingUp`, `Receipt`, `UtensilsCrossed`, `Target`, `Trophy` from the lucide-react import (currently lines 4-11). The remaining icons stay (they are still used by sections 1–4: `BedDouble`, `Sparkles`, `Wrench`, `Wallet`, `ChevronRight`, `AlertTriangle`, `Building2`, `LogIn`, `LogOut`, `LayoutGrid`, `CalendarRange`, `Bot`, `FileBarChart`, `Bell`, `Crown`, `CalendarPlus`, `BrushCleaning`, `Banknote`, `Activity as ActivityIcon`, `CheckCircle2`, `Clock`, `CreditCard`, `RefreshCw`, `Star`, `Trash2`, `Hotel`, `DoorOpen`, `PlaneLanding`, `PlaneTakeoff`). Replace the block with:
```tsx
import {
  BedDouble, Sparkles, Wrench, Wallet, ChevronRight,
  AlertTriangle, Building2, LogIn, LogOut, LayoutGrid, CalendarRange,
  Bot, FileBarChart, Bell, Crown, CalendarPlus, BrushCleaning, Banknote,
  Activity as ActivityIcon, CheckCircle2, Clock,
  CreditCard, RefreshCw, Star, Trash2,
  Hotel, DoorOpen, PlaneLanding, PlaneTakeoff,
} from "lucide-react";
```

- [ ] **Step 2: Remove analytics-only module constants**

Remove `SOURCE_COLORS` (currently lines 31-41):
```tsx
// Distinct categorical palette so every source slice is easy to tell apart.
const SOURCE_COLORS = [
  "var(--color-brand)", // gold
  "#3b82f6",            // blue
  "#10b981",            // emerald
  "#ec4899",            // pink
  "#8b5cf6",            // violet
  "#06b6d4",            // cyan
  "#f97316",            // orange
  "#64748b",            // slate
];
```

Remove `TOP_SOURCES` (currently lines 54-61):
```tsx
const TOP_SOURCES = [
  { name: "Direct / Website", revenue: 38400, bookings: 52 },
  { name: "Booking.com", revenue: 32200, bookings: 41 },
  { name: "Corporate (TechCorp)", revenue: 18600, bookings: 14 },
  { name: "Agoda", revenue: 14800, bookings: 22 },
  { name: "Pearl Holidays", revenue: 11200, bookings: 9 },
  { name: "Expedia", revenue: 8900, bookings: 11 },
];
```

Remove `GOALS_FALLBACK` (currently lines 63-71):
```tsx
// Used only while the goals endpoint is offline.
const GOALS_FALLBACK: GoalRow[] = [
  { label: "Total Revenue", current: 0, target: 160000, format: "money", pace: "behind" },
  { label: "Occupancy", current: 0, target: 75, format: "pct", pace: "behind" },
  { label: "ADR", current: 0, target: 720, format: "money", pace: "behind" },
  { label: "Direct Bookings", current: 0, target: 60, format: "number", pace: "behind" },
  { label: "F&B Revenue", current: 0, target: 24000, format: "money", pace: "behind" },
  { label: "Outstanding", current: 0, target: 50000, format: "money", pace: "ahead" },
];
```

- [ ] **Step 3: Remove analytics-only type aliases**

Remove these type lines (currently lines 171, 173, 174 — keep `RoomBoardRow`, `AuditRow`, and the `ActivityTone`/`ActivityAccent` types which sections 1–4 still use):
```tsx
type TrendRow = { month: string; room: number; food: number; hall: number };
```
```tsx
type AlertRow = { id: string; level: "danger" | "warning" | "info"; text: string; href: string };
type GoalRow = { label: string; current: number; target: number; format: "money" | "pct" | "number"; pace: "ahead" | "ontrack" | "behind" };
```
And remove the `ForecastRow` type (currently line 172):
```tsx
type ForecastRow = { day: number; occupancy: number; forecast: number };
```

- [ ] **Step 4: Remove analytics-only state and the analytics fetch effect**

Remove the four analytics `useState` lines and their comment (currently lines 217-221):
```tsx
  // Real analytics: revenue trend, occupancy forecast, alerts, monthly goals.
  const [trend, setTrend] = React.useState<TrendRow[] | null>(null);
  const [forecast, setForecast] = React.useState<ForecastRow[] | null>(null);
  const [liveAlerts, setLiveAlerts] = React.useState<AlertRow[] | null>(null);
  const [goals, setGoals] = React.useState<GoalRow[] | null>(null);
```

Remove the analytics fetch effect (currently lines 222-229):
```tsx
  React.useEffect(() => {
    let cancelled = false;
    apiGet<TrendRow[]>("/dashboard/revenue-trend").then(d => { if (!cancelled) setTrend(d); }).catch(() => {});
    apiGet<ForecastRow[]>("/dashboard/occupancy-forecast").then(d => { if (!cancelled) setForecast(d); }).catch(() => {});
    apiGet<AlertRow[]>("/dashboard/alerts").then(d => { if (!cancelled) setLiveAlerts(d); }).catch(() => {});
    apiGet<GoalRow[]>("/dashboard/goals").then(d => { if (!cancelled) setGoals(d); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);
```

- [ ] **Step 5: Drop the `period` state (keep `nowMs`)**

The clock effect sets both `nowMs` (used by the Activity feed — keep) and `period` (only used by the moved Goals header — remove).

Change the state declaration (currently line 196) from:
```tsx
  const [period, setPeriod] = React.useState<{ label: string; day: number; days: number } | null>(null);
```
to nothing (delete the line).

Change the clock effect (currently lines 262-270) from:
```tsx
  React.useEffect(() => {
    const d = new Date();
    setNowMs(d.getTime());
    setPeriod({
      label: d.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
      day: d.getDate(),
      days: new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(),
    });
  }, []);
```
to:
```tsx
  React.useEffect(() => {
    setNowMs(new Date().getTime());
  }, []);
```

- [ ] **Step 6: Remove analytics-only derived values**

Remove the source-mix / revenue derivations (currently lines 275-290), i.e. the `topSources` block, the `rev` line (only the Revenue strip used it), the `trendData`/`forecastData`/`alertsData` lines, and the `sourceMixDonut` memo. Keep `quick` (used by Quick Actions).

Remove:
```tsx
  // Booking-source mix from real data (falls back to mock).
  const topSources = stats?.sourceMix?.length
    ? stats.sourceMix.map(s => ({ name: s.source, revenue: s.revenue, bookings: s.bookings }))
    : TOP_SOURCES;

  // Real analytics with mock fallback (only used while the backend is offline).
  const rev = stats?.revenue;
```
Keep the `const quick = stats?.quickCounts;` line that sits between them.
Then remove:
```tsx
  const trendData: TrendRow[] = trend ?? [];
  const forecastData: ForecastRow[] = forecast ?? [];
  const alertsData = liveAlerts ?? [];
  const sourceMixDonut = React.useMemo(() => {
    const sm = stats?.sourceMix ?? [];
    const total = sm.reduce((s, x) => s + x.revenue, 0) || 1;
    return sm.map(x => ({ name: x.source, value: Math.round((x.revenue / total) * 100) }));
  }, [stats]);
```

> Note: `aiBriefing` (kept, section 4) still reads `stats?.sourceMix?.[0]` directly — that is fine; `sourceMix` stays on the `DashStats` type. Only the `sourceMixDonut`/`topSources` derivations are removed.

- [ ] **Step 7: Delete the four analytics JSX sections**

Remove these four `<section>` blocks from the returned JSX (between the Priorities/Live-Status/Activity/AI section and the `GuestDetailDrawer`):

1. `{/* ============ REVENUE BREAKDOWN ============ */}` … its closing `</section>` (currently lines 678-689).
2. `{/* ============ MONTHLY GOALS + TOP SOURCES ============ */}` … `</section>` (currently lines 691-769).
3. `{/* ============ CHARTS ============ */}` … `</section>` (currently lines 771-857).
4. `{/* ============ REVENUE TREND + ALERTS ============ */}` … `</section>` (currently lines 859-933).

After deletion, the JSX goes straight from the closing `</section>` of the Priorities/Live-Status/Activity/AI block to the `{/* Booking detail drawer ... */}` comment and `<GuestDetailDrawer .../>`.

- [ ] **Step 8: Delete the `KPISpark` and dead `StatRow` helpers**

Remove the `KPISpark` function (currently lines 992-1029) — it was only used by the Revenue strip.

Remove the `StatRow` function (currently lines 1066-1076) — it is dead code (no call sites remain):
```tsx
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
```

Keep `ExecKpi`, `PriorityRow`, and `LegendDot` (sections 1 and 4 use them).

- [ ] **Step 9: Typecheck, lint, build**

Run from `luxe-pms/`:
```bash
npx tsc --noEmit && npm run lint && npm run build
```
Expected: clean. Watch specifically for "declared but never used" errors — if any appear, an import/symbol from the removal list above was missed (or a kept icon was over-removed); fix per the error.

- [ ] **Step 10: Manual verification**

`npm run dev`, sign in as manager. Expected:
- **Dashboard** shows only KPIs, Quick Actions, Arrivals/Departures, and Priorities/Live Status/Activity/AI — no Revenue strip, goals, charts, trend, or alerts. Arrivals double-click drawer still works.
- **Analytics Report** tab still shows all four blocks.
- Switch role to staff (non-manager): the Analytics Report tab is hidden, and the dashboard is unchanged.

- [ ] **Step 11: Commit**

```bash
git add "luxe-pms/src/app/(app)/dashboard/page.tsx"
git commit -m "refactor(dashboard): remove analytics blocks now living in Analytics Report"
```

---

## Self-Review

**Spec coverage:**
- New manager-only "Analytics Report" tab in System group → Task 3 (nav entry `roles: MANAGER`, group `system`, before `/reports`). ✓
- All four analytics blocks moved → Task 2 (component) + Task 3 (route). ✓
- Removed from dashboard (true move) → Task 4. ✓
- Shared `SectionHeader` extraction → Task 1. ✓
- Self-contained data fetching using existing endpoints, no backend change → Task 2. ✓
- Offline banner + sample-data fallback preserved → Task 2 (banner, `GOALS_FALLBACK`, `TOP_SOURCES`). ✓
- Access note (staff lose analytics) is intended → reflected by manager-only nav + dashboard removal. ✓

**Placeholder scan:** No TBD/TODO/"handle edge cases"; every code step shows complete code or exact text to remove. ✓

**Type consistency:** `AnalyticsReport` (Task 2) is the exact symbol imported in Task 3. `SectionHeader` signature in Task 1 matches its two call sites (`title`/`hint`/`icon`). `KPISpark` moves intact with its full prop type. `StatsForAnalytics` covers exactly the `revenue` fields (`room`, `food`, `hall`, `advance`, `pending`, `total`) and `sourceMix` shape the component reads. Dashboard keeps `DashStats.sourceMix` so the retained `aiBriefing` still compiles. ✓
