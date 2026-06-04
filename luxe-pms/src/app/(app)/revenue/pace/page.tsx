"use client";
import * as React from "react";
import {
  TrendingUp, TrendingDown, Calendar, Download, RefreshCw, Filter, Sparkles,
  BedDouble, IndianRupee, ArrowUpRight, ArrowDownRight, AlertTriangle,
  Target, Flag, Mail, Globe, Briefcase, Plane, ChevronRight, BarChart3,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn, money } from "@/lib/utils";

// ============================================================
// SEED — deterministic so SSR + client stay in sync
// ============================================================

type PaceAlert = "ahead" | "ontrack" | "soft" | "critical";

const paceTone = (delta: number): { tone: "success" | "warning" | "danger" | "neutral"; alert: PaceAlert; label: string } => {
  if (delta >= 8) return { tone: "success", alert: "ahead", label: "Ahead" };
  if (delta >= -3) return { tone: "neutral", alert: "ontrack", label: "On track" };
  if (delta >= -10) return { tone: "warning", alert: "soft", label: "Softening" };
  return { tone: "danger", alert: "critical", label: "Critical" };
};

const fmtPct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;

// 90 day daily build-up curve — TY OTB vs LY actual
type DayPoint = { dayOffset: number; ty: number; ly: number };
const DAYS_OUT = 90;

function buildCurve(): DayPoint[] {
  // pickup is heavier closer to today; LY same shape, slightly lower
  return Array.from({ length: DAYS_OUT }, (_, i) => {
    const x = i / DAYS_OUT;
    const decay = Math.pow(1 - x, 1.4);
    const seasonal = 1 + Math.sin((i + 8) / 11) * 0.18;
    const ty = Math.round(46 * decay * seasonal + 22 + (i % 7 === 5 ? 14 : 0) + (i % 7 === 6 ? 12 : 0));
    const ly = Math.round(ty * (0.86 + ((i * 13) % 9) / 100));
    return { dayOffset: i + 1, ty, ly };
  });
}
const CURVE = buildCurve();

// 12 rolling months
const MONTHS = [
  { label: "Jun 26", ty: { rooms: 1842, rev: 11250000 }, ly: { rooms: 1690, rev: 9870000 } },
  { label: "Jul 26", ty: { rooms: 1610, rev: 9420000 },  ly: { rooms: 1721, rev: 9980000 } },
  { label: "Aug 26", ty: { rooms: 1734, rev: 10210000 }, ly: { rooms: 1602, rev: 9120000 } },
  { label: "Sep 26", ty: { rooms: 1521, rev: 9870000 },  ly: { rooms: 1690, rev: 10440000 } },
  { label: "Oct 26", ty: { rooms: 2104, rev: 14820000 }, ly: { rooms: 1842, rev: 12940000 } },
  { label: "Nov 26", ty: { rooms: 2298, rev: 17120000 }, ly: { rooms: 1980, rev: 14210000 } },
  { label: "Dec 26", ty: { rooms: 2542, rev: 21840000 }, ly: { rooms: 2210, rev: 18420000 } },
  { label: "Jan 27", ty: { rooms: 2008, rev: 14260000 }, ly: { rooms: 1782, rev: 12120000 } },
  { label: "Feb 27", ty: { rooms: 1922, rev: 13420000 }, ly: { rooms: 1684, rev: 11580000 } },
  { label: "Mar 27", ty: { rooms: 2087, rev: 15240000 }, ly: { rooms: 1822, rev: 13110000 } },
  { label: "Apr 27", ty: { rooms: 1486, rev: 9870000 },  ly: { rooms: 1601, rev: 10420000 } },
  { label: "May 27", ty: { rooms: 1342, rev: 8720000 },  ly: { rooms: 1502, rev: 9340000 } },
];

const SEGMENTS = [
  { code: "ota",     name: "OTA",            icon: Globe,     ty: 3621, rev: 21840000, ly: 3340, lyRev: 19850000, budget: 24200000 },
  { code: "direct",  name: "Direct",         icon: Mail,      ty: 2104, rev: 16920000, ly: 1780, lyRev: 13420000, budget: 17500000 },
  { code: "corp",    name: "Corporate",      icon: Briefcase, ty: 1842, rev: 11240000, ly: 2010, lyRev: 12640000, budget: 13800000 },
  { code: "ta",      name: "Travel Agent",   icon: Plane,     ty: 1389, rev: 8420000,  ly: 1421, lyRev: 8520000,  budget: 9200000 },
];

const ROOMTYPES = [
  { code: "STD", name: "Standard", ty: 3892, rev: 17510000, ly: 3624, lyRev: 16210000, budget: 18400000 },
  { code: "DLX", name: "Deluxe",   ty: 3210, rev: 20840000, ly: 2980, lyRev: 19120000, budget: 22100000 },
  { code: "STE", name: "Suite",     ty: 1142, rev: 13120000, ly: 1310, lyRev: 14820000, budget: 15600000 },
  { code: "VLA", name: "Villa",     ty: 712,  rev: 15680000, ly: 637,  lyRev: 13880000, budget: 14900000 },
];

const INSIGHTS = [
  { tone: "success" as const, icon: TrendingUp,    title: "Direct bookings pacing 18.2% ahead",            body: "Strong push from website + loyalty mailers. Recommend holding inventory back from OTAs for Oct-Nov peak." },
  { tone: "danger"  as const, icon: TrendingDown,  title: "Suites lagging 12.8% behind LY",                body: "Push corporate MICE rate cards · re-pitch BKC accounts. Replan Suite pricing floor at ₹11,800." },
  { tone: "warning" as const, icon: AlertTriangle, title: "July OTB rooms 6.5% soft vs LY same point",     body: "Monsoon weekday pickup slow. Trigger last-minute flash discount on Standard + Deluxe." },
  { tone: "info"    as const, icon: Sparkles,      title: "Diwali week (Oct 31 - Nov 6) sold out on Villa", body: "Convert waitlist · open dynamic premium ₹28,500 floor on remaining Suite inventory." },
];

// ============================================================
// PAGE
// ============================================================
export default function PaceReportPage() {
  const [toast, setToast] = React.useState<string | null>(null);
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };

  const [fromDate, setFromDate] = React.useState("2026-06-02");
  const [toDateVal, setToDateVal] = React.useState("2026-08-31");
  const [segment, setSegment] = React.useState<string>("all");
  const [property, setProperty] = React.useState<string>("pearl");

  // ---- aggregate KPIs from the 90-day curve ----
  const otbRooms = CURVE.reduce((a, c) => a + c.ty, 0);
  const lyRooms  = CURVE.reduce((a, c) => a + c.ly, 0);
  const adr = 7240; // realistic ADR INR
  const otbRev   = otbRooms * adr;
  const lyRev    = lyRooms * 6920;
  const roomsDelta = ((otbRooms - lyRooms) / lyRooms) * 100;
  const revDelta   = ((otbRev - lyRev) / lyRev) * 100;

  // ---- curve scaling for chart ----
  const maxY = Math.max(...CURVE.map(d => Math.max(d.ty, d.ly)));

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      {/* ====================  HEADER  ==================== */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="h-12 w-12 rounded-xl bg-linear-to-br from-emerald-500 to-teal-600 text-white inline-flex items-center justify-center shadow-md">
            <BarChart3 className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-display font-medium tracking-tight">Pace Report</h1>
            <p className="text-muted-foreground text-sm mt-1">
              On-the-books vs same day last year &middot; The Pearl Marina, Mumbai &middot; auto-refreshed 6 min ago
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={() => showToast("Pace snapshot refreshed from PMS warehouse")}>
            <RefreshCw className="h-3.5 w-3.5" />Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => showToast("Pace report queued for email to revenue@pearlmarina.in")}>
            <Mail className="h-3.5 w-3.5" />Email
          </Button>
          <Button size="sm" onClick={() => showToast("Exported PaceReport_Jun-Aug26.xlsx")}>
            <Download className="h-3.5 w-3.5" />Export
          </Button>
        </div>
      </div>

      {/* ====================  DATE RANGE / FILTERS  ==================== */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="space-y-1.5">
            <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">From</Label>
            <div className="relative">
              <Calendar className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="pl-9" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">To</Label>
            <div className="relative">
              <Calendar className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input type="date" value={toDateVal} onChange={(e) => setToDateVal(e.target.value)} className="pl-9" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Property</Label>
            <Select value={property} onChange={(e) => setProperty(e.target.value)}>
              <option value="pearl">The Pearl Marina, Mumbai</option>
              <option value="all">All properties (1)</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Segment</Label>
            <Select value={segment} onChange={(e) => setSegment(e.target.value)}>
              <option value="all">All segments</option>
              <option value="ota">OTA</option>
              <option value="direct">Direct</option>
              <option value="corp">Corporate</option>
              <option value="ta">Travel Agent</option>
            </Select>
          </div>
          <div className="flex items-end gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={() => {
              const d = new Date(2026, 5, 2);
              const e = new Date(d); e.setDate(d.getDate() + 90);
              setFromDate(d.toISOString().slice(0, 10));
              setToDateVal(e.toISOString().slice(0, 10));
              showToast("Reset to next 90 days");
            }}>
              <Filter className="h-3.5 w-3.5" />Next 90d
            </Button>
            <Button size="sm" className="flex-1" onClick={() => showToast(`Applied filter · ${fromDate} → ${toDateVal} · ${segment}`)}>
              Apply
            </Button>
          </div>
        </div>
      </Card>

      {/* ====================  KPI STRIP  ==================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-start justify-between">
            <span className="h-8 w-8 rounded-md bg-emerald-500/10 text-emerald-600 inline-flex items-center justify-center">
              <BedDouble className="h-4 w-4" />
            </span>
            <Badge tone="success">OTB</Badge>
          </div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mt-3">OTB Rooms</p>
          <p className="text-2xl font-display font-medium tabular mt-1">{otbRooms.toLocaleString("en-IN")}</p>
          <p className="text-xs text-muted-foreground mt-1">next 90 days &middot; <span className="tabular">{Math.round(otbRooms / 90)}</span>/night avg</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-start justify-between">
            <span className="h-8 w-8 rounded-md bg-amber-500/10 text-amber-600 inline-flex items-center justify-center">
              <IndianRupee className="h-4 w-4" />
            </span>
            <Badge tone="brand">Revenue</Badge>
          </div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mt-3">OTB Revenue</p>
          <p className="text-2xl font-display font-medium tabular mt-1">{money(otbRev)}</p>
          <p className="text-xs text-muted-foreground mt-1">ADR &middot; <span className="tabular">{money(adr)}</span></p>
        </Card>

        <Card className="p-4">
          <div className="flex items-start justify-between">
            <span className="h-8 w-8 rounded-md bg-blue-500/10 text-blue-600 inline-flex items-center justify-center">
              <Target className="h-4 w-4" />
            </span>
            <Badge tone={roomsDelta >= 0 ? "success" : "danger"}>
              {roomsDelta >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {fmtPct(roomsDelta)}
            </Badge>
          </div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mt-3">vs LY Rooms</p>
          <p className={cn("text-2xl font-display font-medium tabular mt-1", roomsDelta >= 0 ? "text-success" : "text-danger")}>
            {roomsDelta >= 0 ? "+" : ""}{(otbRooms - lyRooms).toLocaleString("en-IN")}
          </p>
          <p className="text-xs text-muted-foreground mt-1">LY OTB at this point &middot; <span className="tabular">{lyRooms.toLocaleString("en-IN")}</span></p>
        </Card>

        <Card className="p-4">
          <div className="flex items-start justify-between">
            <span className="h-8 w-8 rounded-md bg-violet-500/10 text-violet-600 inline-flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </span>
            <Badge tone={revDelta >= 0 ? "success" : "danger"}>
              {revDelta >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {fmtPct(revDelta)}
            </Badge>
          </div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mt-3">vs LY Revenue</p>
          <p className={cn("text-2xl font-display font-medium tabular mt-1", revDelta >= 0 ? "text-success" : "text-danger")}>
            {revDelta >= 0 ? "+" : ""}{money(otbRev - lyRev)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">LY revenue at this point &middot; <span className="tabular">{money(lyRev)}</span></p>
        </Card>
      </div>

      {/* ====================  BIG BUILD-UP CHART  ==================== */}
      <Card className="p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
          <div>
            <h2 className="text-base font-semibold">Pickup Build-up Curve</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Daily TY OTB vs LY actual &middot; rolling 90 days from {fromDate}</p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
              <span className="text-muted-foreground">TY OTB</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-slate-300" />
              <span className="text-muted-foreground">LY actual</span>
            </span>
            <Select className="h-8 text-xs w-auto" defaultValue="rooms" onChange={(e) => showToast(`Curve switched to ${e.target.value}`)}>
              <option value="rooms">Rooms</option>
              <option value="revenue">Revenue</option>
              <option value="adr">ADR</option>
            </Select>
          </div>
        </div>

        {/* SVG curve */}
        <div className="relative w-full" style={{ height: 280 }}>
          <div className="absolute inset-0 grid grid-rows-4 pointer-events-none">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="border-t border-dashed border-border/60" />
            ))}
            <div className="border-t border-border" />
          </div>
          <svg viewBox={`0 0 ${DAYS_OUT * 10} 280`} preserveAspectRatio="none" className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="tyArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(16 185 129)" stopOpacity="0.45" />
                <stop offset="100%" stopColor="rgb(16 185 129)" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="lyArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(148 163 184)" stopOpacity="0.30" />
                <stop offset="100%" stopColor="rgb(148 163 184)" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* LY area + line (rendered first, behind TY) */}
            <path
              d={
                `M 0 280 ` +
                CURVE.map((d, i) => `L ${i * 10} ${280 - (d.ly / maxY) * 260}`).join(" ") +
                ` L ${(DAYS_OUT - 1) * 10} 280 Z`
              }
              fill="url(#lyArea)"
            />
            <path
              d={
                `M 0 ${280 - (CURVE[0].ly / maxY) * 260} ` +
                CURVE.slice(1).map((d, i) => `L ${(i + 1) * 10} ${280 - (d.ly / maxY) * 260}`).join(" ")
              }
              stroke="rgb(148 163 184)"
              strokeWidth="2"
              strokeDasharray="4 4"
              fill="none"
            />

            {/* TY area + line */}
            <path
              d={
                `M 0 280 ` +
                CURVE.map((d, i) => `L ${i * 10} ${280 - (d.ty / maxY) * 260}`).join(" ") +
                ` L ${(DAYS_OUT - 1) * 10} 280 Z`
              }
              fill="url(#tyArea)"
            />
            <path
              d={
                `M 0 ${280 - (CURVE[0].ty / maxY) * 260} ` +
                CURVE.slice(1).map((d, i) => `L ${(i + 1) * 10} ${280 - (d.ty / maxY) * 260}`).join(" ")
              }
              stroke="rgb(16 185 129)"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />

            {/* dots every 10 days */}
            {CURVE.filter((_, i) => i % 10 === 0).map((d) => (
              <circle
                key={`ty-${d.dayOffset}`}
                cx={(d.dayOffset - 1) * 10}
                cy={280 - (d.ty / maxY) * 260}
                r="3"
                fill="rgb(16 185 129)"
                stroke="white"
                strokeWidth="1.5"
              />
            ))}
          </svg>
        </div>

        {/* x-axis labels */}
        <div className="flex justify-between text-[10px] text-muted-foreground mt-2 px-1 tabular">
          <span>Today</span>
          <span>+15d</span>
          <span>+30d</span>
          <span>+45d</span>
          <span>+60d</span>
          <span>+75d</span>
          <span>+90d</span>
        </div>
      </Card>

      {/* ====================  BY MONTH TABLE  ==================== */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 p-4 border-b border-border">
          <div>
            <h2 className="text-base font-semibold">Pace by Month</h2>
            <p className="text-xs text-muted-foreground mt-0.5">12-month rolling outlook &middot; TY on the books vs LY same point</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => showToast("Drilled into monthly forecast detail")}>
            Forecast view <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-surface-sunken/40">
            <tr className="text-[10px] uppercase tracking-wide text-muted-foreground">
              <th className="text-left font-medium p-3">Month</th>
              <th className="text-right font-medium p-3">TY OTB Rooms</th>
              <th className="text-right font-medium p-3">TY OTB Revenue</th>
              <th className="text-right font-medium p-3">LY Actual Rooms</th>
              <th className="text-right font-medium p-3">LY Actual Revenue</th>
              <th className="text-right font-medium p-3">Pace &Delta;</th>
              <th className="text-right font-medium p-3 pr-4">Alert</th>
            </tr>
          </thead>
          <tbody>
            {MONTHS.map((m) => {
              const delta = ((m.ty.rev - m.ly.rev) / m.ly.rev) * 100;
              const tone = paceTone(delta);
              return (
                <tr key={m.label} className="border-t border-border hover:bg-surface-sunken/30 transition-colors">
                  <td className="p-3 font-medium">{m.label}</td>
                  <td className="p-3 text-right tabular">{m.ty.rooms.toLocaleString("en-IN")}</td>
                  <td className="p-3 text-right tabular">{money(m.ty.rev)}</td>
                  <td className="p-3 text-right tabular text-muted-foreground">{m.ly.rooms.toLocaleString("en-IN")}</td>
                  <td className="p-3 text-right tabular text-muted-foreground">{money(m.ly.rev)}</td>
                  <td className={cn("p-3 text-right tabular font-semibold", delta >= 0 ? "text-success" : "text-danger")}>
                    <span className="inline-flex items-center gap-1">
                      {delta >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                      {fmtPct(delta)}
                    </span>
                  </td>
                  <td className="p-3 text-right pr-4">
                    <Badge tone={tone.tone}>
                      {tone.alert === "critical" && <AlertTriangle className="h-3 w-3" />}
                      {tone.alert === "ahead" && <TrendingUp className="h-3 w-3" />}
                      {tone.alert === "soft" && <TrendingDown className="h-3 w-3" />}
                      {tone.alert === "ontrack" && <Flag className="h-3 w-3" />}
                      {tone.label}
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {/* ====================  BY SEGMENT + BY ROOM TYPE  ==================== */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* BY SEGMENT */}
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between gap-3 p-4 border-b border-border">
            <div>
              <h2 className="text-base font-semibold">Pace by Segment</h2>
              <p className="text-xs text-muted-foreground mt-0.5">OTB build vs LY &middot; budget attainment</p>
            </div>
            <Badge tone="info">4 channels</Badge>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-surface-sunken/40">
              <tr className="text-[10px] uppercase tracking-wide text-muted-foreground">
                <th className="text-left font-medium p-3">Segment</th>
                <th className="text-right font-medium p-3">TY OTB</th>
                <th className="text-right font-medium p-3">LY Actual</th>
                <th className="text-right font-medium p-3">Gap</th>
                <th className="text-right font-medium p-3 pr-4">% to Budget</th>
              </tr>
            </thead>
            <tbody>
              {SEGMENTS.map((s) => {
                const gap = s.rev - s.lyRev;
                const pctBudget = (s.rev / s.budget) * 100;
                const Icon = s.icon;
                return (
                  <tr key={s.code} className="border-t border-border hover:bg-surface-sunken/30 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-2.5">
                        <span className="h-7 w-7 rounded-md bg-surface-sunken inline-flex items-center justify-center">
                          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                        </span>
                        <div>
                          <p className="font-medium leading-tight">{s.name}</p>
                          <p className="text-[11px] text-muted-foreground tabular">{s.ty.toLocaleString("en-IN")} rooms</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-right tabular">{money(s.rev)}</td>
                    <td className="p-3 text-right tabular text-muted-foreground">{money(s.lyRev)}</td>
                    <td className={cn("p-3 text-right tabular font-semibold", gap >= 0 ? "text-success" : "text-danger")}>
                      {gap >= 0 ? "+" : ""}{money(gap)}
                    </td>
                    <td className="p-3 text-right pr-4">
                      <div className="flex flex-col items-end gap-1">
                        <span className={cn("tabular text-xs font-semibold", pctBudget >= 90 ? "text-success" : pctBudget >= 75 ? "text-warning" : "text-danger")}>
                          {pctBudget.toFixed(1)}%
                        </span>
                        <div className="h-1.5 w-24 bg-surface-sunken rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full", pctBudget >= 90 ? "bg-success" : pctBudget >= 75 ? "bg-warning" : "bg-danger")}
                            style={{ width: `${Math.min(100, pctBudget)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>

        {/* BY ROOM TYPE */}
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between gap-3 p-4 border-b border-border">
            <div>
              <h2 className="text-base font-semibold">Pace by Room Type</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Inventory category vs LY &middot; budget attainment</p>
            </div>
            <Badge tone="brand">4 categories</Badge>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-surface-sunken/40">
              <tr className="text-[10px] uppercase tracking-wide text-muted-foreground">
                <th className="text-left font-medium p-3">Room Type</th>
                <th className="text-right font-medium p-3">TY OTB</th>
                <th className="text-right font-medium p-3">LY Actual</th>
                <th className="text-right font-medium p-3">Gap</th>
                <th className="text-right font-medium p-3 pr-4">% to Budget</th>
              </tr>
            </thead>
            <tbody>
              {ROOMTYPES.map((r) => {
                const gap = r.rev - r.lyRev;
                const pctBudget = (r.rev / r.budget) * 100;
                return (
                  <tr key={r.code} className="border-t border-border hover:bg-surface-sunken/30 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-2.5">
                        <span className="h-7 w-7 rounded-md bg-surface-sunken inline-flex items-center justify-center">
                          <BedDouble className="h-3.5 w-3.5 text-muted-foreground" />
                        </span>
                        <div>
                          <p className="font-medium leading-tight">{r.name}</p>
                          <p className="text-[11px] text-muted-foreground tabular">{r.ty.toLocaleString("en-IN")} rooms</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-right tabular">{money(r.rev)}</td>
                    <td className="p-3 text-right tabular text-muted-foreground">{money(r.lyRev)}</td>
                    <td className={cn("p-3 text-right tabular font-semibold", gap >= 0 ? "text-success" : "text-danger")}>
                      {gap >= 0 ? "+" : ""}{money(gap)}
                    </td>
                    <td className="p-3 text-right pr-4">
                      <div className="flex flex-col items-end gap-1">
                        <span className={cn("tabular text-xs font-semibold", pctBudget >= 90 ? "text-success" : pctBudget >= 75 ? "text-warning" : "text-danger")}>
                          {pctBudget.toFixed(1)}%
                        </span>
                        <div className="h-1.5 w-24 bg-surface-sunken rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full", pctBudget >= 90 ? "bg-success" : pctBudget >= 75 ? "bg-warning" : "bg-danger")}
                            style={{ width: `${Math.min(100, pctBudget)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </div>

      {/* ====================  AI INSIGHTS  ==================== */}
      <Card className="p-5 bg-linear-to-br from-violet-500/5 via-transparent to-emerald-500/5 border-violet-500/20">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <span className="h-9 w-9 rounded-lg bg-linear-to-br from-violet-500 to-fuchsia-500 text-white inline-flex items-center justify-center">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-base font-semibold">AI Pace Insights</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Auto-flagged from pickup, segment mix &amp; budget telemetry &middot; updated 6 min ago</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => showToast("Generated 12 deeper recommendations · queued in AI Insights tab")}>
            <Sparkles className="h-3.5 w-3.5" />Generate more
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {INSIGHTS.map((ins) => {
            const Icon = ins.icon;
            const ringColor =
              ins.tone === "success" ? "bg-success-soft text-success" :
              ins.tone === "danger"  ? "bg-danger-soft text-danger" :
              ins.tone === "warning" ? "bg-warning-soft text-warning" :
                                       "bg-info-soft text-info";
            return (
              <div
                key={ins.title}
                className="flex items-start gap-3 p-4 rounded-lg border border-border bg-surface hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => showToast(`Insight opened &middot; ${ins.title}`)}
              >
                <span className={cn("h-8 w-8 rounded-md inline-flex items-center justify-center shrink-0", ringColor)}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-sm leading-tight">{ins.title}</p>
                    <Badge tone={ins.tone}>AI</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{ins.body}</p>
                  <div className="flex items-center gap-2 mt-2.5">
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={(e) => { e.stopPropagation(); showToast("Action taken &middot; opened in revenue plan"); }}>
                      Take action <ChevronRight className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground" onClick={(e) => { e.stopPropagation(); showToast("Insight dismissed"); }}>
                      Dismiss
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* ====================  FOOTER NOTE  ==================== */}
      <p className="text-[11px] text-muted-foreground text-center pt-2">
        Pace methodology &middot; OTB measured at end of business yesterday &middot; LY comparison aligned to same days-out window &middot; budget per FY26 board plan
      </p>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-foreground text-background rounded-lg px-4 py-3 text-sm shadow-2xl">
          {toast}
        </div>
      )}
    </div>
  );
}
