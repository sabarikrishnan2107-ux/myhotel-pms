"use client";
import * as React from "react";
import {
  Package,
  Clock,
  CheckCircle2,
  Archive,
  Trash2,
  Gift,
  ShieldQuestion,
  Sparkles,
  CalendarClock,
  CalendarX,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Building2,
  MapPin,
  Target,
  Activity,
  AlertTriangle,
  PlusCircle,
  Search,
  Link2,
  Boxes,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, money } from "@/lib/utils";

type Tone = "neutral" | "brand" | "success" | "warning" | "danger" | "info" | "accent";

export default function DashboardTab({ onToast }: { onToast: (m: string) => void }) {
  // ------------ MOCK DATA ------------
  const primaryKpis: {
    label: string;
    value: string;
    sub: string;
    icon: React.ElementType;
    iconBg: string;
    iconText: string;
  }[] = [
    {
      label: "Total Found",
      value: "1,284",
      sub: "All-time registered items",
      icon: Package,
      iconBg: "bg-info-soft",
      iconText: "text-info",
    },
    {
      label: "Waiting Claim",
      value: "147",
      sub: "Active waiting buckets",
      icon: Clock,
      iconBg: "bg-warning-soft",
      iconText: "text-warning",
    },
    {
      label: "Returned",
      value: "962",
      sub: "Successfully handed over",
      icon: CheckCircle2,
      iconBg: "bg-success-soft",
      iconText: "text-success",
    },
    {
      label: "In Storage",
      value: "175",
      sub: "Locker A-3 / Vault B-1",
      icon: Archive,
      iconBg: "bg-surface-sunken",
      iconText: "text-muted-foreground",
    },
  ];

  const secondaryKpis: {
    label: string;
    value: string;
    sub: string;
    icon: React.ElementType;
    tone: Tone;
    gold?: boolean;
  }[] = [
    { label: "Disposed", value: "82", sub: "Last 12 months", icon: Trash2, tone: "danger" },
    { label: "Donated", value: "46", sub: "Goonj / Robin Hood", icon: Gift, tone: "success" },
    { label: "Pending Approval", value: "9", sub: "Awaiting GM sign-off", icon: ShieldQuestion, tone: "warning" },
    { label: "High-Value Items", value: "23", sub: "Above ₹10,000", icon: Sparkles, tone: "accent", gold: true },
    { label: "Older Than 30 Days", value: "38", sub: "Eligible for review", icon: CalendarClock, tone: "info" },
    { label: "Older Than 90 Days", value: "14", sub: "Disposal candidates", icon: CalendarX, tone: "danger" },
  ];

  // sparkline points (last 7 days, found today series)
  const sparkPoints = [3, 5, 4, 7, 6, 9, 8];
  const sparkMax = Math.max(...sparkPoints);
  const sparkPath = sparkPoints
    .map((v, i) => {
      const x = (i / (sparkPoints.length - 1)) * 100;
      const y = 30 - (v / sparkMax) * 26;
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");

  // 12-month trend
  const monthlyTrend = [
    { m: "Jul", v: 78 },
    { m: "Aug", v: 92 },
    { m: "Sep", v: 84 },
    { m: "Oct", v: 110 },
    { m: "Nov", v: 126 },
    { m: "Dec", v: 158 },
    { m: "Jan", v: 142 },
    { m: "Feb", v: 119 },
    { m: "Mar", v: 134 },
    { m: "Apr", v: 121 },
    { m: "May", v: 108 },
    { m: "Jun", v: 96 },
  ];
  const trendMax = Math.max(...monthlyTrend.map((d) => d.v));

  // status breakdown
  const statusBreakdown: { label: string; count: number; tone: Tone; bar: string }[] = [
    { label: "Waiting", count: 147, tone: "warning", bar: "bg-warning" },
    { label: "Returned", count: 962, tone: "success", bar: "bg-success" },
    { label: "Storage", count: 175, tone: "info", bar: "bg-info" },
    { label: "Disposed", count: 82, tone: "danger", bar: "bg-danger" },
    { label: "Donated", count: 46, tone: "success", bar: "bg-success/70" },
    { label: "Closed", count: 31, tone: "neutral", bar: "bg-muted-foreground/60" },
  ];
  const statusTotal = statusBreakdown.reduce((a, b) => a + b.count, 0);

  // departments
  const departments: { name: string; items: number; bar: string }[] = [
    { name: "Housekeeping", items: 612, bar: "bg-brand" },
    { name: "Front Office", items: 298, bar: "bg-info" },
    { name: "Security", items: 184, bar: "bg-warning" },
    { name: "F&B", items: 126, bar: "bg-success" },
    { name: "Concierge", items: 64, bar: "bg-accent" },
  ];
  const deptMax = Math.max(...departments.map((d) => d.items));

  // locations
  const locations: { name: string; items: number }[] = [
    { name: "Room 412", items: 38 },
    { name: "Lobby", items: 31 },
    { name: "Sea Pearl Restaurant", items: 27 },
    { name: "Infinity Pool", items: 22 },
    { name: "Aura Spa", items: 18 },
    { name: "Marina Banquet Hall", items: 16 },
  ];
  const locMax = Math.max(...locations.map((l) => l.items));

  // return success
  const returnRate = 78;
  const returnBreakdown = [
    { label: "Claimed by guest", v: 612, tone: "success" as Tone },
    { label: "Returned via courier", v: 218, tone: "info" as Tone },
    { label: "Handed at FO", v: 132, tone: "brand" as Tone },
  ];

  // recent activities
  const activities: {
    time: string;
    actor: string;
    dept: string;
    action: string;
    item: string;
    location: string;
    tone: Tone;
    statusLabel: string;
  }[] = [
    {
      time: "10:42",
      actor: "Anjali Iyer",
      dept: "HK",
      action: "registered",
      item: "Apple AirPods Pro",
      location: "Room 412",
      tone: "warning",
      statusLabel: "Waiting claim",
    },
    {
      time: "10:18",
      actor: "Karan Mehta",
      dept: "FO",
      action: "returned",
      item: "Ray-Ban Aviator sunglasses",
      location: "to Mr. Rohit Sharma",
      tone: "success",
      statusLabel: "Returned",
    },
    {
      time: "09:55",
      actor: "Priya Krishnan",
      dept: "SEC",
      action: "moved to vault",
      item: "Gold bracelet (HVI)",
      location: "Vault B-1",
      tone: "accent",
      statusLabel: "High-value",
    },
    {
      time: "09:32",
      actor: "Ravi Sharma",
      dept: "HK",
      action: "registered",
      item: "Samsung Galaxy Buds",
      location: "Room 1208",
      tone: "warning",
      statusLabel: "Waiting claim",
    },
    {
      time: "09:10",
      actor: "Neha Kapoor",
      dept: "F&B",
      action: "registered",
      item: "Leather wallet",
      location: "Sea Pearl Restaurant",
      tone: "warning",
      statusLabel: "Waiting claim",
    },
    {
      time: "08:47",
      actor: "Aditya Verma",
      dept: "CON",
      action: "matched to guest",
      item: "Hermes silk scarf",
      location: "Lobby",
      tone: "info",
      statusLabel: "Active match",
    },
    {
      time: "08:22",
      actor: "Meera Nair",
      dept: "HK",
      action: "registered",
      item: "MacBook charger 96W",
      location: "Room 805",
      tone: "warning",
      statusLabel: "Waiting claim",
    },
    {
      time: "07:55",
      actor: "Vikram Joshi",
      dept: "FO",
      action: "donated",
      item: "Children's books (lot 12)",
      location: "Goonj NGO",
      tone: "success",
      statusLabel: "Donated",
    },
  ];

  // disposal pending
  const disposalPending: { name: string; days: number; value: number; high?: boolean }[] = [
    { name: "Unbranded power bank", days: 118, value: 1200 },
    { name: "Prescription eyeglasses", days: 104, value: 4500 },
    { name: "Stainless steel water bottle", days: 96, value: 800 },
    { name: "Cartier silver pen (HVI)", days: 94, value: 28500, high: true },
  ];

  // ------------ HANDLERS ------------
  const t = (m: string) => () => onToast(m);

  return (
    <div className="space-y-4">
      {/* 1. PRIMARY KPI STRIP */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {primaryKpis.map((k) => (
          <Card key={k.label} className="p-5">
            <div className="flex items-start gap-3">
              <div className={cn("h-10 w-10 rounded-lg grid place-items-center shrink-0", k.iconBg)}>
                <k.icon className={cn("h-5 w-5", k.iconText)} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  {k.label}
                </div>
                <div className="tabular text-2xl font-semibold leading-tight mt-1">{k.value}</div>
                <div className="text-xs text-muted-foreground mt-1 truncate">{k.sub}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* 2. SECONDARY KPI ROW */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {secondaryKpis.map((k) => (
          <Card
            key={k.label}
            className={cn(
              "p-3.5 relative overflow-hidden",
              k.gold && "border-amber-300/60"
            )}
          >
            {k.gold && (
              <div className="absolute inset-0 bg-linear-to-br from-amber-400/10 to-orange-500/10 pointer-events-none" />
            )}
            <div className="relative flex items-center gap-2.5">
              <div
                className={cn(
                  "h-7 w-7 rounded-md grid place-items-center shrink-0",
                  k.gold
                    ? "bg-linear-to-br from-amber-400 to-orange-500 text-white"
                    : `bg-${k.tone}-soft text-${k.tone}`
                )}
              >
                <k.icon className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">
                  {k.label}
                </div>
                <div className="tabular text-base font-semibold leading-tight">{k.value}</div>
              </div>
            </div>
            <div className="relative text-[10px] text-muted-foreground mt-2 truncate">{k.sub}</div>
          </Card>
        ))}
      </div>

      {/* 3. TODAY / MONTH STRIP */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Found Today
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="tabular text-3xl font-semibold">8</span>
                <span className="text-xs text-success font-medium inline-flex items-center gap-0.5">
                  <TrendingUp className="h-3 w-3" /> +33%
                </span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">vs 7-day avg of 6</div>
            </div>
            <div className="w-32 h-12 shrink-0">
              <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="w-full h-full">
                <path
                  d={sparkPath}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="text-info"
                  vectorEffect="non-scaling-stroke"
                />
                <path
                  d={`${sparkPath} L100,30 L0,30 Z`}
                  className="fill-info/15"
                />
              </svg>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
            <Badge tone="info">3 Housekeeping</Badge>
            <Badge tone="warning">2 Front Office</Badge>
            <Badge tone="neutral">3 Others</Badge>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Found This Month
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="tabular text-3xl font-semibold">96</span>
                <span className="text-xs text-danger font-medium inline-flex items-center gap-0.5">
                  <TrendingDown className="h-3 w-3" /> -11.1%
                </span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                vs last month <span className="tabular">108</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Est. Value
              </div>
              <div className="tabular text-lg font-semibold mt-1">{money(184500)}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Across all items</div>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
            <Badge tone="success">62 returned</Badge>
            <Badge tone="warning">28 waiting</Badge>
            <Badge tone="info">6 in storage</Badge>
          </div>
        </Card>
      </div>

      {/* 4. CHARTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Monthly trend - vertical bars */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Monthly Found Trend</h3>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Last 12 months</p>
            </div>
            <Badge tone="info">Avg 114/mo</Badge>
          </div>
          <div className="h-40 flex items-end gap-2">
            {monthlyTrend.map((d) => {
              const h = (d.v / trendMax) * 100;
              return (
                <div key={d.m} className="flex-1 flex flex-col items-center gap-1.5 group">
                  <div className="tabular text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                    {d.v}
                  </div>
                  <div className="w-full bg-surface-sunken rounded-t-md relative" style={{ height: "100%" }}>
                    <div
                      className="absolute bottom-0 left-0 right-0 bg-brand rounded-t-md transition-all"
                      style={{ height: `${h}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex gap-2 mt-2">
            {monthlyTrend.map((d) => (
              <div key={d.m} className="flex-1 text-center text-[10px] text-muted-foreground">
                {d.m}
              </div>
            ))}
          </div>
        </Card>

        {/* Status breakdown - horizontal bars */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <PieChart className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Status-wise Breakdown</h3>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">All items by current state</p>
            </div>
            <span className="tabular text-xs text-muted-foreground">
              {statusTotal.toLocaleString("en-IN")} total
            </span>
          </div>
          <div className="space-y-3">
            {statusBreakdown.map((s) => {
              const pct = (s.count / statusTotal) * 100;
              return (
                <div key={s.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium">{s.label}</span>
                    <span className="text-xs text-muted-foreground">
                      <span className="tabular font-medium text-foreground">
                        {s.count.toLocaleString("en-IN")}
                      </span>{" "}
                      <span className="tabular">({pct.toFixed(1)}%)</span>
                    </span>
                  </div>
                  <div className="h-2 bg-surface-sunken rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all", s.bar)}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* 5 & 6. DEPARTMENT + LOCATION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Department-wise</h3>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Who registered the items</p>
            </div>
            <Button size="sm" variant="ghost" onClick={t("Opened department analytics")}>
              View all
            </Button>
          </div>
          <div className="space-y-3.5">
            {departments.map((d) => {
              const pct = (d.items / deptMax) * 100;
              return (
                <div key={d.name}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium">{d.name}</span>
                    <span className="tabular text-sm text-muted-foreground">
                      {d.items.toLocaleString("en-IN")} items
                    </span>
                  </div>
                  <div className="h-1.5 bg-surface-sunken rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full", d.bar)} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Top 6 Locations</h3>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Where items are most found</p>
            </div>
            <Button size="sm" variant="ghost" onClick={t("Opened location heatmap")}>
              Heatmap
            </Button>
          </div>
          <div className="space-y-2.5">
            {locations.map((l, i) => {
              const pct = (l.items / locMax) * 100;
              return (
                <div key={l.name} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-md bg-surface-sunken grid place-items-center text-[10px] font-semibold tabular text-muted-foreground shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium truncate">{l.name}</span>
                      <span className="tabular text-xs text-muted-foreground">{l.items}</span>
                    </div>
                    <div className="h-1 bg-surface-sunken rounded-full overflow-hidden">
                      <div className="h-full bg-info rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* 7 & 8. RETURN METER + ACTIVITIES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Return success meter */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-1">
            <Target className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Return Success</h3>
          </div>
          <p className="text-xs text-muted-foreground">Last 90 days</p>

          <div className="flex justify-center my-5">
            <div className="relative w-36 h-36">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  className="stroke-surface-sunken"
                  strokeWidth="10"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  className="stroke-success"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${(returnRate / 100) * 264} 264`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="tabular text-3xl font-semibold">{returnRate}%</span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Return rate
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2.5 pt-3 border-t border-border">
            {returnBreakdown.map((r) => (
              <div key={r.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={cn("h-2 w-2 rounded-full", `bg-${r.tone}`)} />
                  <span className="text-xs text-muted-foreground">{r.label}</span>
                </div>
                <span className="tabular text-xs font-medium">{r.v}</span>
              </div>
            ))}
          </div>

          <Button
            size="sm"
            variant="outline"
            className="w-full mt-4"
            onClick={t("Opened detailed return analytics")}
          >
            View full report
          </Button>
        </Card>

        {/* Activities */}
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Recent Activity</h3>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Live feed across all desks</p>
            </div>
            <Button size="sm" variant="ghost" onClick={t("Opened full activity log")}>
              View all
            </Button>
          </div>
          <div className="divide-y divide-border">
            {activities.map((a, i) => (
              <div
                key={i}
                className="py-2.5 flex items-start gap-3 hover:bg-surface-sunken/40 -mx-2 px-2 rounded-md transition-colors"
              >
                <span className="tabular text-xs text-muted-foreground w-12 shrink-0 mt-0.5">
                  {a.time}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm leading-snug">
                    <span className="font-medium">{a.actor}</span>{" "}
                    <span className="text-muted-foreground">({a.dept})</span>{" "}
                    <span className="text-muted-foreground">{a.action}:</span>{" "}
                    <span className="font-medium">{a.item}</span>{" "}
                    <span className="text-muted-foreground">— {a.location}</span>
                  </div>
                </div>
                <Badge tone={a.tone} className="shrink-0 mt-0.5">
                  {a.statusLabel}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* 9. DISPOSAL PENDING */}
      <Card className="overflow-hidden">
        <div className="p-5 pb-3 flex items-center justify-between border-b border-border">
          <div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <h3 className="text-sm font-semibold">Disposal Pending Approval</h3>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Items overdue per the 90-day retention policy
            </p>
          </div>
          <Badge tone="warning">4 items</Badge>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-surface-sunken/40">
            <tr>
              <th className="text-left text-[10px] uppercase text-muted-foreground font-medium px-5 py-2.5">
                Item
              </th>
              <th className="text-left text-[10px] uppercase text-muted-foreground font-medium px-5 py-2.5">
                In Storage
              </th>
              <th className="text-right text-[10px] uppercase text-muted-foreground font-medium px-5 py-2.5">
                Est. Value
              </th>
              <th className="text-right text-[10px] uppercase text-muted-foreground font-medium px-5 py-2.5">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {disposalPending.map((d, i) => (
              <tr key={i} className="border-t border-border hover:bg-surface-sunken/30 transition-colors">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{d.name}</span>
                    {d.high && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold text-white bg-linear-to-br from-amber-400 to-orange-500">
                        <Sparkles className="h-2.5 w-2.5" />
                        HVI
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-3">
                  <span className="tabular text-muted-foreground">{d.days} days</span>
                </td>
                <td className="px-5 py-3 text-right tabular font-medium">{money(d.value)}</td>
                <td className="px-5 py-3 text-right">
                  <div className="inline-flex gap-1.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={t(`Deferred ${d.name} for further review`)}
                    >
                      Defer
                    </Button>
                    <Button
                      size="sm"
                      onClick={t(`Approved disposal of ${d.name}`)}
                    >
                      Approve
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* 10. QUICK ACTIONS */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mr-2">
            Quick actions
          </span>
          <Button size="sm" onClick={t("Opened: Register found item")}>
            <PlusCircle className="h-3.5 w-3.5" />
            Register found item
          </Button>
          <Button size="sm" variant="outline" onClick={t("Opened: Report lost item")}>
            <Search className="h-3.5 w-3.5" />
            Report lost item
          </Button>
          <Button size="sm" variant="outline" onClick={t("Opened: Match an item")}>
            <Link2 className="h-3.5 w-3.5" />
            Match an item
          </Button>
          <Button size="sm" variant="outline" onClick={t("Opened storage locker view")}>
            <Boxes className="h-3.5 w-3.5" />
            Open storage
          </Button>
        </div>
      </Card>
    </div>
  );
}
