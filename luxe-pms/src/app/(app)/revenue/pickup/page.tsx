"use client";
import * as React from "react";
import {
  TrendingUp, TrendingDown, BedDouble, IndianRupee, XCircle, Activity,
  ArrowUpRight, ArrowDownRight, ArrowUpDown, Download, RefreshCw, Calendar,
  Filter, Pencil, ChevronDown, ChevronUp, Sparkles, Globe, Users,
  Briefcase, Footprints, Clock, BarChart3, PieChart, Flame, ArrowRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn, money } from "@/lib/utils";
import { apiGet } from "@/lib/api";

// ============================================================
// TYPES + DETERMINISTIC SEED
// ============================================================
type Period = 7 | 14 | 30 | 90;

type DayRow = {
  date: Date;
  grossNewRooms: number;
  grossNewRevenue: number;
  cancellationRooms: number;
  cancellationRevenue: number;
  modificationDeltaRooms: number;
  modificationDeltaRevenue: number;
};

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtDateShort(d: Date) {
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}
function fmtDow(d: Date) {
  return d.toLocaleDateString("en-IN", { weekday: "short" });
}
function isoKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

// Deterministic pseudo-random based on date offset
function dseed(i: number, salt: number) {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function seedRows(today: Date, days: number): DayRow[] {
  return Array.from({ length: days }, (_, k) => {
    const i = days - 1 - k; // i=0 is today, increases going back
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dow = date.getDay();
    const isWeekend = dow === 5 || dow === 6 || dow === 0;
    const wkBoost = isWeekend ? 1.35 : 1;

    const r1 = dseed(i, 1);
    const r2 = dseed(i, 2);
    const r3 = dseed(i, 3);
    const r4 = dseed(i, 4);

    const grossNewRooms = Math.round((12 + r1 * 22) * wkBoost);
    const avgRate = 5200 + Math.round(r2 * 3800);
    const grossNewRevenue = grossNewRooms * avgRate;

    const cancellationRooms = Math.round(2 + r3 * 7);
    const cancRate = 4800 + Math.round(r4 * 3200);
    const cancellationRevenue = cancellationRooms * cancRate;

    // modifications can be positive (upgrades / extra nights) or negative (room downgrades / shortened stays)
    const modRoomsSigned = Math.round((r1 - 0.45) * 6);
    const modRevSigned = Math.round((r2 - 0.4) * 18000 + modRoomsSigned * 1200);

    return {
      date,
      grossNewRooms,
      grossNewRevenue,
      cancellationRooms,
      cancellationRevenue,
      modificationDeltaRooms: modRoomsSigned,
      modificationDeltaRevenue: modRevSigned,
    };
  });
}

type StayDateCell = { date: Date; pickupRooms: number };
function seedStayHeatmap(today: Date, days: number): StayDateCell[] {
  return Array.from({ length: days }, (_, k) => {
    const date = new Date(today);
    date.setDate(today.getDate() + k);
    const dow = date.getDay();
    const isWeekend = dow === 5 || dow === 6 || dow === 0;
    const wkBoost = isWeekend ? 1.55 : 1;
    const r = dseed(k, 9);
    // distance taper - bookings cluster nearer-term
    const distanceFactor = k < 7 ? 1.3 : k < 21 ? 1.05 : k < 45 ? 0.75 : 0.45;
    const pickupRooms = Math.max(0, Math.round((r * 14) * wkBoost * distanceFactor - 1));
    return { date, pickupRooms };
  });
}

type SourceRow = { source: string; icon: React.ComponentType<{ className?: string }>; rooms: number; revenue: number; cancellations: number; color: string };
const SOURCES_SEED: SourceRow[] = [
  { source: "OTA (Booking.com, Agoda, MMT)", icon: Globe,      rooms: 18, revenue: 1_42_000, cancellations: 3, color: "bg-emerald-500" },
  { source: "Direct (website + phone)",       icon: BedDouble,  rooms: 9,  revenue: 78_500,   cancellations: 1, color: "bg-teal-500" },
  { source: "Corporate",                      icon: Briefcase,  rooms: 6,  revenue: 54_000,   cancellations: 0, color: "bg-cyan-500" },
  { source: "Group",                          icon: Users,      rooms: 4,  revenue: 38_000,   cancellations: 1, color: "bg-blue-500" },
  { source: "Walk-in",                        icon: Footprints, rooms: 3,  revenue: 19_500,   cancellations: 0, color: "bg-indigo-500" },
];

type LeadBucket = { label: string; rooms: number; revenue: number };
const LEAD_SEED: LeadBucket[] = [
  { label: "Same-day", rooms: 6,  revenue: 38_000 },
  { label: "1–7 d",    rooms: 14, revenue: 1_02_000 },
  { label: "8–30 d",   rooms: 12, revenue: 96_500 },
  { label: "31–90 d",  rooms: 6,  revenue: 64_000 },
  { label: "90+ d",    rooms: 2,  revenue: 31_500 },
];

// ---- Real backend shape: GET /api/revenue/pickup ----------------------------
// { days:[{date,pickupRooms,pickupRevenue,cancellations}],
//   sources:[{source,rooms,revenue,cancellations}],
//   leadBuckets:[{label,rooms,revenue}] }
type PickupApiDay = { date: string; pickupRooms: number; pickupRevenue: number; cancellations: number };
type PickupApiSource = { source: string; rooms: number; revenue: number; cancellations: number };
type PickupApiLead = { label: string; rooms: number; revenue: number };
type PickupApiResponse = { days: PickupApiDay[]; sources: PickupApiSource[]; leadBuckets: PickupApiLead[] };

// Presentational fallbacks (icon + swatch) re-attached to backend source rows by
// index — the API supplies only source/rooms/revenue/cancellations.
const SOURCE_PRESENTATION: { icon: SourceRow["icon"]; color: string }[] = SOURCES_SEED.map(s => ({ icon: s.icon, color: s.color }));
const SOURCE_FALLBACK_PRESENTATION = { icon: Globe, color: "bg-emerald-500" } as const;

// Map a backend day → the UI's DayRow. The endpoint exposes gross pickup +
// cancellation COUNT only; it has no cancellation-revenue or modification data,
// so those collapse to 0 (the modifications column simply reads 0/₹0).
function apiDayToRow(d: PickupApiDay): DayRow {
  return {
    date: new Date(`${d.date}T00:00:00`),
    grossNewRooms: Number(d.pickupRooms) || 0,
    grossNewRevenue: Number(d.pickupRevenue) || 0,
    cancellationRooms: Number(d.cancellations) || 0,
    cancellationRevenue: 0,
    modificationDeltaRooms: 0,
    modificationDeltaRevenue: 0,
  };
}

// ============================================================
// PAGE
// ============================================================
export default function PickupReportPage() {
  const [toast, setToast] = React.useState<string | null>(null);
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };

  const [period, setPeriod] = React.useState<Period>(14);
  const [sortKey, setSortKey] = React.useState<"date" | "gross" | "canc" | "mod" | "netR" | "netRev">("date");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc");
  const [propertyFilter, setPropertyFilter] = React.useState("all");

  // Anchor date — deterministic so server / client / workflow agree
  const TODAY = React.useMemo(() => new Date(2026, 5, 2), []); // 2 Jun 2026

  // Offline-seeded day rows for the selected period (deterministic fallback).
  const seededRows: DayRow[] = React.useMemo(() => seedRows(TODAY, period), [TODAY, period]);

  // Live data, seeded from the inline consts and replaced by the real endpoint
  // when GET /api/revenue/pickup resolves. `apiDays` stays null until then so we
  // fall back to the period-aware seeded rows above.
  const [apiDays, setApiDays] = React.useState<DayRow[] | null>(null);
  const [sources, setSources] = React.useState<SourceRow[]>(SOURCES_SEED);
  const [leadBuckets, setLeadBuckets] = React.useState<LeadBucket[]>(LEAD_SEED);

  React.useEffect(() => {
    let alive = true;
    apiGet<PickupApiResponse>("/revenue/pickup")
      .then(res => {
        if (!alive) return;
        if (Array.isArray(res.days) && res.days.length) {
          setApiDays(res.days.map(apiDayToRow));
        }
        if (Array.isArray(res.sources) && res.sources.length) {
          setSources(res.sources.map((s, i) => ({
            source: s.source,
            rooms: Number(s.rooms) || 0,
            revenue: Number(s.revenue) || 0,
            cancellations: Number(s.cancellations) || 0,
            icon: (SOURCE_PRESENTATION[i] ?? SOURCE_FALLBACK_PRESENTATION).icon,
            color: (SOURCE_PRESENTATION[i] ?? SOURCE_FALLBACK_PRESENTATION).color,
          })));
        }
        if (Array.isArray(res.leadBuckets) && res.leadBuckets.length) {
          setLeadBuckets(res.leadBuckets.map(b => ({
            label: b.label,
            rooms: Number(b.rooms) || 0,
            revenue: Number(b.revenue) || 0,
          })));
        }
      })
      .catch(() => { /* offline → keep seeded fallback */ });
    return () => { alive = false; };
  }, []);

  // Real endpoint returns a fixed 14-day window; when present it drives the
  // table/summary regardless of the period toggle, else the seeded rows do.
  const rows: DayRow[] = apiDays ?? seededRows;

  // Heatmap (pickup by stay-date) has no backend equivalent → stays seeded.
  const stayCells = React.useMemo(() => seedStayHeatmap(TODAY, 60), [TODAY]);

  // Today's row = last in array
  const todayRow = rows[rows.length - 1];
  const netRoomsToday = todayRow.grossNewRooms - todayRow.cancellationRooms + todayRow.modificationDeltaRooms;
  const netRevToday = todayRow.grossNewRevenue - todayRow.cancellationRevenue + todayRow.modificationDeltaRevenue;

  // Sorted rows for table
  const sortedRows = React.useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = sortValue(a, sortKey);
      const bv = sortValue(b, sortKey);
      if (av === bv) return 0;
      const cmp = av < bv ? -1 : 1;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  function sortValue(r: DayRow, k: typeof sortKey): number {
    const netR = r.grossNewRooms - r.cancellationRooms + r.modificationDeltaRooms;
    const netRev = r.grossNewRevenue - r.cancellationRevenue + r.modificationDeltaRevenue;
    switch (k) {
      case "date":   return r.date.getTime();
      case "gross":  return r.grossNewRooms;
      case "canc":   return r.cancellationRooms;
      case "mod":    return r.modificationDeltaRooms;
      case "netR":   return netR;
      case "netRev": return netRev;
    }
  }

  const toggleSort = (k: typeof sortKey) => {
    if (sortKey === k) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("desc"); }
  };

  // Aggregates for period
  const totals = rows.reduce((acc, r) => ({
    gross: acc.gross + r.grossNewRooms,
    grossRev: acc.grossRev + r.grossNewRevenue,
    canc: acc.canc + r.cancellationRooms,
    cancRev: acc.cancRev + r.cancellationRevenue,
    modR: acc.modR + r.modificationDeltaRooms,
    modRev: acc.modRev + r.modificationDeltaRevenue,
  }), { gross: 0, grossRev: 0, canc: 0, cancRev: 0, modR: 0, modRev: 0 });

  const totalNetRooms = totals.gross - totals.canc + totals.modR;
  const totalNetRev = totals.grossRev - totals.cancRev + totals.modRev;

  // Heatmap intensity
  const maxStay = Math.max(...stayCells.map(c => c.pickupRooms), 1);
  function heatTone(v: number): string {
    const ratio = v / maxStay;
    if (v === 0) return "bg-surface-sunken text-muted-foreground";
    if (ratio < 0.2) return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
    if (ratio < 0.4) return "bg-emerald-500/30 text-emerald-800 dark:text-emerald-200";
    if (ratio < 0.6) return "bg-emerald-500/50 text-emerald-50";
    if (ratio < 0.8) return "bg-emerald-600/70 text-white";
    return "bg-emerald-700 text-white";
  }

  // Source totals
  const totalSourceRooms = sources.reduce((s, x) => s + x.rooms, 0);
  const totalSourceRev = sources.reduce((s, x) => s + x.revenue, 0);

  // Lead time totals + max for bar scaling
  const totalLeadRooms = leadBuckets.reduce((s, x) => s + x.rooms, 0);
  const maxLeadRooms = Math.max(...leadBuckets.map(x => x.rooms));

  // LY comparison (deterministic seeded)
  const thisWeekNet = rows.slice(-7).reduce((s, r) => s + (r.grossNewRooms - r.cancellationRooms + r.modificationDeltaRooms), 0);
  const thisWeekRev = rows.slice(-7).reduce((s, r) => s + (r.grossNewRevenue - r.cancellationRevenue + r.modificationDeltaRevenue), 0);
  const lyWeekNet = Math.round(thisWeekNet * 0.83);
  const lyWeekRev = Math.round(thisWeekRev * 0.79);
  const lyDeltaRoomsPct = ((thisWeekNet - lyWeekNet) / Math.max(lyWeekNet, 1)) * 100;
  const lyDeltaRevPct = ((thisWeekRev - lyWeekRev) / Math.max(lyWeekRev, 1)) * 100;

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="h-12 w-12 rounded-xl bg-linear-to-br from-emerald-500 to-teal-600 text-white inline-flex items-center justify-center shadow-md">
            <Activity className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-display font-medium tracking-tight">Pickup Report</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Net daily change in OTB revenue · The Pearl Marina, Mumbai · as of {fmtDate(TODAY)} · last refresh 2 min ago
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Select
            className="h-9 w-auto text-sm"
            value={propertyFilter}
            onChange={e => { setPropertyFilter(e.target.value); showToast(`Filtered to ${e.target.value === "all" ? "All properties" : "The Pearl Marina"}`); }}
          >
            <option value="all">All properties</option>
            <option value="pearl-marina">The Pearl Marina</option>
            <option value="pearl-juhu">The Pearl Juhu</option>
          </Select>
          <Button variant="outline" size="sm" onClick={() => showToast("Refreshing OTB snapshot from PMS · channel managers")}>
            <RefreshCw className="h-3.5 w-3.5" />Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => showToast("Pickup report exported to /reports/pickup-2026-06-02.xlsx")}>
            <Download className="h-3.5 w-3.5" />Export
          </Button>
          <Button size="sm" onClick={() => showToast("Pickup report scheduled for daily 09:00 email to Revenue Manager")}>
            <Calendar className="h-3.5 w-3.5" />Schedule
          </Button>
        </div>
      </div>

      {/* PERIOD SELECTOR */}
      <Card className="p-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Period</span>
            <div className="inline-flex rounded-md border border-border overflow-hidden">
              {([7, 14, 30, 90] as Period[]).map(p => (
                <button
                  key={p}
                  onClick={() => { setPeriod(p); showToast(`Period set to last ${p} days`); }}
                  className={cn(
                    "px-4 py-1.5 text-sm font-medium transition-colors",
                    period === p ? "bg-foreground text-background" : "hover:bg-surface-sunken text-muted-foreground"
                  )}
                >
                  Last {p}d
                </button>
              ))}
            </div>
            <Badge tone="info">
              <Sparkles className="h-3 w-3" />Snapshot {fmtDate(TODAY)} 06:00 IST
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            <span>Stay-date span: next 60 days · booking-window: rolling</span>
          </div>
        </div>
      </Card>

      {/* 4-KPI STRIP */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="flex items-start justify-between">
            <span className="h-8 w-8 rounded-md bg-emerald-500/15 text-emerald-600 inline-flex items-center justify-center">
              <BedDouble className="h-4 w-4" />
            </span>
            <Badge tone="success" className="text-[10px]">
              <ArrowUpRight className="h-3 w-3" />vs yest
            </Badge>
          </div>
          <p className="mt-3 text-[10px] uppercase tracking-wider font-medium text-muted-foreground">Pickup rooms today</p>
          <p className="text-2xl font-display font-medium tabular mt-1">
            +{todayRow.grossNewRooms}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">New OTB · gross · across all channels</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-start justify-between">
            <span className="h-8 w-8 rounded-md bg-emerald-500/15 text-emerald-600 inline-flex items-center justify-center">
              <IndianRupee className="h-4 w-4" />
            </span>
            <Badge tone="success" className="text-[10px]">
              <TrendingUp className="h-3 w-3" />+18.4%
            </Badge>
          </div>
          <p className="mt-3 text-[10px] uppercase tracking-wider font-medium text-muted-foreground">Pickup revenue today</p>
          <p className="text-2xl font-display font-medium tabular mt-1 text-emerald-600">
            +{money(todayRow.grossNewRevenue)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">ADR {money(Math.round(todayRow.grossNewRevenue / Math.max(todayRow.grossNewRooms, 1)))} · pre-tax</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-start justify-between">
            <span className="h-8 w-8 rounded-md bg-rose-500/15 text-rose-600 inline-flex items-center justify-center">
              <XCircle className="h-4 w-4" />
            </span>
            <Badge tone="danger" className="text-[10px]">
              <ArrowDownRight className="h-3 w-3" />impact
            </Badge>
          </div>
          <p className="mt-3 text-[10px] uppercase tracking-wider font-medium text-muted-foreground">Cancellations today</p>
          <p className="text-2xl font-display font-medium tabular mt-1 text-rose-600">
            −{todayRow.cancellationRooms} <span className="text-base text-muted-foreground">rms</span>
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">−{money(todayRow.cancellationRevenue)} revenue lost</p>
        </Card>

        <Card className={cn("p-4 border-2", netRoomsToday >= 0 ? "border-emerald-500/30 bg-emerald-500/[0.03]" : "border-rose-500/30 bg-rose-500/[0.03]")}>
          <div className="flex items-start justify-between">
            <span className={cn(
              "h-8 w-8 rounded-md inline-flex items-center justify-center",
              netRoomsToday >= 0 ? "bg-emerald-500/15 text-emerald-600" : "bg-rose-500/15 text-rose-600"
            )}>
              {netRoomsToday >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            </span>
            <Badge tone={netRoomsToday >= 0 ? "success" : "danger"} className="text-[10px]">
              NET
            </Badge>
          </div>
          <p className="mt-3 text-[10px] uppercase tracking-wider font-medium text-muted-foreground">Net pickup today</p>
          <p className={cn("text-2xl font-display font-medium tabular mt-1", netRevToday >= 0 ? "text-emerald-600" : "text-rose-600")}>
            {netRevToday >= 0 ? "+" : "−"}{money(Math.abs(netRevToday))}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {netRoomsToday >= 0 ? "+" : "−"}{Math.abs(netRoomsToday)} rooms · gross − canc {todayRow.modificationDeltaRooms !== 0 ? ` ${todayRow.modificationDeltaRooms > 0 ? "+" : "−"} mods` : ""}
          </p>
        </Card>
      </div>

      {/* TWO-COLUMN: COMPARISON STAT + PERIOD SUMMARY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card className="p-4 lg:col-span-2 bg-linear-to-br from-emerald-500/[0.06] to-teal-500/[0.04] border-emerald-500/20">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">Comparison · this week vs same week last year</p>
              <p className="text-sm font-medium mt-1">26 May – 1 Jun 2026 vs 27 May – 2 Jun 2025</p>
            </div>
            <Badge tone="success"><Sparkles className="h-3 w-3" />Outperforming LY</Badge>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Net pickup rooms</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-display font-medium tabular">{thisWeekNet}</span>
                <span className="text-sm text-muted-foreground tabular">vs LY {lyWeekNet}</span>
              </div>
              <div className="flex items-center gap-1 mt-1">
                <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-600 tabular">+{lyDeltaRoomsPct.toFixed(1)}%</span>
                <span className="text-xs text-muted-foreground">YoY</span>
              </div>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Net pickup revenue</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-display font-medium tabular text-emerald-600">{money(thisWeekRev)}</span>
                <span className="text-sm text-muted-foreground tabular">vs {money(lyWeekRev)}</span>
              </div>
              <div className="flex items-center gap-1 mt-1">
                <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-600 tabular">+{lyDeltaRevPct.toFixed(1)}%</span>
                <span className="text-xs text-muted-foreground">YoY</span>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3">
            Driven by Coldplay NSCI weekend + monsoon staycation pickup · ADR lift ₹680 vs LY
          </p>
        </Card>

        <Card className="p-4">
          <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">Period summary · last {period}d</p>
          <div className="mt-3 space-y-2">
            <Row label="Gross new rooms" value={`+${totals.gross}`} sub={`+${money(totals.grossRev)}`} positive />
            <Row label="Cancellations" value={`−${totals.canc}`} sub={`−${money(totals.cancRev)}`} negative />
            <Row label="Modifications net" value={`${totals.modR >= 0 ? "+" : "−"}${Math.abs(totals.modR)}`} sub={`${totals.modRev >= 0 ? "+" : "−"}${money(Math.abs(totals.modRev))}`} positive={totals.modR >= 0} negative={totals.modR < 0} />
            <div className="h-px bg-border my-2" />
            <Row label="Net pickup" value={`${totalNetRooms >= 0 ? "+" : "−"}${Math.abs(totalNetRooms)} rms`} sub={`${totalNetRev >= 0 ? "+" : "−"}${money(Math.abs(totalNetRev))}`} bold positive={totalNetRev >= 0} negative={totalNetRev < 0} />
          </div>
        </Card>
      </div>

      {/* DAILY TABLE */}
      <Card className="overflow-hidden">
        <div className="p-4 pb-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="h-8 w-8 rounded-md bg-surface-sunken inline-flex items-center justify-center">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </span>
            <div>
              <h2 className="text-base font-semibold">Daily pickup detail</h2>
              <p className="text-xs text-muted-foreground">Last {period} days · click any column header to sort</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="sm" onClick={() => showToast(`Sort reset · date descending`)}>
              <ArrowUpDown className="h-3.5 w-3.5" />Reset sort
            </Button>
            <Button variant="outline" size="sm" onClick={() => showToast("Drill-down view opened in new tab")}>
              <Pencil className="h-3.5 w-3.5" />Drill-down
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-sunken/40">
              <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                <Th onClick={() => toggleSort("date")} active={sortKey === "date"} dir={sortDir}>Date</Th>
                <Th onClick={() => toggleSort("gross")} active={sortKey === "gross"} dir={sortDir} align="right">Gross new</Th>
                <Th onClick={() => toggleSort("canc")} active={sortKey === "canc"} dir={sortDir} align="right">Cancellations</Th>
                <Th onClick={() => toggleSort("mod")} active={sortKey === "mod"} dir={sortDir} align="right">Modifications Δ</Th>
                <Th onClick={() => toggleSort("netR")} active={sortKey === "netR"} dir={sortDir} align="right">Net pickup rms</Th>
                <Th onClick={() => toggleSort("netRev")} active={sortKey === "netRev"} dir={sortDir} align="right">Net pickup rev</Th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((r, idx) => {
                const netR = r.grossNewRooms - r.cancellationRooms + r.modificationDeltaRooms;
                const netRev = r.grossNewRevenue - r.cancellationRevenue + r.modificationDeltaRevenue;
                const isToday = isoKey(r.date) === isoKey(TODAY);
                return (
                  <tr key={idx} className={cn("border-t border-border hover:bg-surface-sunken/30", isToday && "bg-emerald-500/[0.04]")}>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium tabular">{fmtDateShort(r.date)}</span>
                        <span className="text-[10px] text-muted-foreground uppercase">{fmtDow(r.date)}</span>
                        {isToday && <Badge tone="success" className="text-[9px] px-1.5 py-0">Today</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="text-emerald-600 font-medium tabular">+{r.grossNewRooms} rms</div>
                      <div className="text-[11px] text-muted-foreground tabular">+{money(r.grossNewRevenue)}</div>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="text-rose-600 font-medium tabular">−{r.cancellationRooms} rms</div>
                      <div className="text-[11px] text-muted-foreground tabular">−{money(r.cancellationRevenue)}</div>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className={cn("font-medium tabular", r.modificationDeltaRooms >= 0 ? "text-emerald-600" : "text-rose-600")}>
                        {r.modificationDeltaRooms >= 0 ? "+" : "−"}{Math.abs(r.modificationDeltaRooms)} rms
                      </div>
                      <div className={cn("text-[11px] tabular", r.modificationDeltaRevenue >= 0 ? "text-muted-foreground" : "text-rose-500/80")}>
                        {r.modificationDeltaRevenue >= 0 ? "+" : "−"}{money(Math.abs(r.modificationDeltaRevenue))}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold tabular",
                        netR >= 0 ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-rose-500/10 text-rose-700 dark:text-rose-300"
                      )}>
                        {netR >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {netR >= 0 ? "+" : "−"}{Math.abs(netR)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={cn("font-semibold tabular", netRev >= 0 ? "text-emerald-600" : "text-rose-600")}>
                        {netRev >= 0 ? "+" : "−"}{money(Math.abs(netRev))}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-surface-sunken/30 border-t-2 border-border">
              <tr className="text-sm font-semibold">
                <td className="px-4 py-3 text-[11px] uppercase tracking-wider text-muted-foreground">Total · {period}d</td>
                <td className="px-4 py-3 text-right tabular text-emerald-600">+{totals.gross} rms · +{money(totals.grossRev)}</td>
                <td className="px-4 py-3 text-right tabular text-rose-600">−{totals.canc} rms · −{money(totals.cancRev)}</td>
                <td className={cn("px-4 py-3 text-right tabular", totals.modR >= 0 ? "text-emerald-600" : "text-rose-600")}>
                  {totals.modR >= 0 ? "+" : "−"}{Math.abs(totals.modR)} rms · {totals.modRev >= 0 ? "+" : "−"}{money(Math.abs(totals.modRev))}
                </td>
                <td className={cn("px-4 py-3 text-right tabular", totalNetRooms >= 0 ? "text-emerald-600" : "text-rose-600")}>
                  {totalNetRooms >= 0 ? "+" : "−"}{Math.abs(totalNetRooms)}
                </td>
                <td className={cn("px-4 py-3 text-right tabular", totalNetRev >= 0 ? "text-emerald-600" : "text-rose-600")}>
                  {totalNetRev >= 0 ? "+" : "−"}{money(Math.abs(totalNetRev))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* PICKUP BY STAY-DATE HEATMAP */}
      <Card className="overflow-hidden">
        <div className="p-4 pb-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="h-8 w-8 rounded-md bg-emerald-500/15 text-emerald-600 inline-flex items-center justify-center">
              <Flame className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-base font-semibold">Pickup by stay-date · next 60 days</h2>
              <p className="text-xs text-muted-foreground">Bookings made today, by check-in date · color = pickup intensity</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-muted-foreground">Intensity</span>
            <div className="flex items-center gap-0.5">
              {[0, 0.2, 0.4, 0.6, 0.8, 1].map(r => (
                <div key={r} className={cn("h-3 w-5 rounded-sm", r === 0 ? "bg-surface-sunken" : "")} style={r > 0 ? { backgroundColor: `rgba(16, 185, 129, ${0.15 + r * 0.75})` } : {}} />
              ))}
            </div>
            <span className="text-muted-foreground tabular">0–{maxStay} rms</span>
          </div>
        </div>
        <div className="px-4 pb-4">
          {/* DOW header */}
          <div className="grid grid-cols-7 gap-1 mb-1 text-[10px] uppercase tracking-wider text-muted-foreground text-center font-medium">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {/* leading empty cells to align first row to DOW */}
            {Array.from({ length: stayCells[0].date.getDay() }, (_, i) => (
              <div key={`pad-${i}`} className="aspect-square" />
            ))}
            {stayCells.map(cell => {
              const dow = cell.date.getDay();
              const isWeekend = dow === 5 || dow === 6 || dow === 0;
              return (
                <button
                  key={isoKey(cell.date)}
                  onClick={() => showToast(`${fmtDate(cell.date)} · ${cell.pickupRooms} rooms picked up today · drill-down opening`)}
                  className={cn(
                    "aspect-square rounded-md flex flex-col items-center justify-center text-[10px] font-medium transition-transform hover:scale-105 hover:ring-2 hover:ring-emerald-500/40",
                    heatTone(cell.pickupRooms),
                    isWeekend && "ring-1 ring-amber-500/20",
                  )}
                  title={`${fmtDate(cell.date)} · ${cell.pickupRooms} new bookings`}
                >
                  <span className="tabular leading-none">{cell.date.getDate()}</span>
                  {cell.pickupRooms > 0 && <span className="tabular text-[9px] mt-0.5 opacity-90">+{cell.pickupRooms}</span>}
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-between mt-3 text-[11px] text-muted-foreground">
            <span>Weekends shown with amber outline · click any cell for stay-date drill-down</span>
            <span className="tabular">Total stay-date pickup: <span className="font-semibold text-foreground">+{stayCells.reduce((s, c) => s + c.pickupRooms, 0)} rms</span> over 60 days</span>
          </div>
        </div>
      </Card>

      {/* PICKUP BY SOURCE + PICKUP BY LEAD TIME */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* SOURCE */}
        <Card className="overflow-hidden">
          <div className="p-4 pb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <span className="h-8 w-8 rounded-md bg-emerald-500/15 text-emerald-600 inline-flex items-center justify-center">
                <PieChart className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-base font-semibold">Pickup by source</h2>
                <p className="text-xs text-muted-foreground">Today · {totalSourceRooms} rooms · {money(totalSourceRev)}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => showToast("Source mix breakdown opened in Channel manager")}>
              View <ArrowRight className="h-3 w-3" />
            </Button>
          </div>

          {/* DONUT placeholder via conic-gradient */}
          <div className="px-4 flex items-center justify-center py-2">
            <div className="relative h-40 w-40 rounded-full" style={{
              background: buildConicGradient(sources.map(s => ({ value: s.rooms, color: tailwindToHex(s.color) }))),
            }}>
              <div className="absolute inset-3 rounded-full bg-surface flex flex-col items-center justify-center">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</span>
                <span className="text-xl font-display font-medium tabular">{totalSourceRooms}</span>
                <span className="text-[10px] text-muted-foreground">rooms today</span>
              </div>
            </div>
          </div>

          <div className="border-t border-border">
            <table className="w-full text-sm">
              <thead className="bg-surface-sunken/40">
                <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-2 text-left">Source</th>
                  <th className="px-4 py-2 text-right">Rooms</th>
                  <th className="px-4 py-2 text-right">Revenue</th>
                  <th className="px-4 py-2 text-right">Mix</th>
                  <th className="px-4 py-2 text-right">Canc</th>
                </tr>
              </thead>
              <tbody>
                {sources.map(s => {
                  const Icon = s.icon;
                  const mix = (s.rooms / totalSourceRooms) * 100;
                  return (
                    <tr key={s.source} className="border-t border-border hover:bg-surface-sunken/30">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className={cn("h-2.5 w-2.5 rounded-sm", s.color)} />
                          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-medium">{s.source}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right text-emerald-600 font-medium tabular">+{s.rooms}</td>
                      <td className="px-4 py-2.5 text-right tabular">{money(s.revenue)}</td>
                      <td className="px-4 py-2.5 text-right tabular text-muted-foreground">{mix.toFixed(0)}%</td>
                      <td className="px-4 py-2.5 text-right tabular">
                        {s.cancellations > 0 ? <span className="text-rose-600">−{s.cancellations}</span> : <span className="text-muted-foreground">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-surface-sunken/30 border-t-2 border-border text-sm font-semibold">
                <tr>
                  <td className="px-4 py-2.5 text-[11px] uppercase tracking-wider text-muted-foreground">Total</td>
                  <td className="px-4 py-2.5 text-right text-emerald-600 tabular">+{totalSourceRooms}</td>
                  <td className="px-4 py-2.5 text-right tabular">{money(totalSourceRev)}</td>
                  <td className="px-4 py-2.5 text-right tabular">100%</td>
                  <td className="px-4 py-2.5 text-right text-rose-600 tabular">−{sources.reduce((s, x) => s + x.cancellations, 0)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>

        {/* LEAD TIME */}
        <Card className="overflow-hidden">
          <div className="p-4 pb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <span className="h-8 w-8 rounded-md bg-emerald-500/15 text-emerald-600 inline-flex items-center justify-center">
                <Clock className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-base font-semibold">Pickup by lead time</h2>
                <p className="text-xs text-muted-foreground">Booking-to-stay distance · today&apos;s pickup</p>
              </div>
            </div>
            <Badge tone="info">Avg lead 14.2 d</Badge>
          </div>

          <div className="px-4 pb-4 space-y-2.5">
            {leadBuckets.map(b => {
              const widthPct = (b.rooms / maxLeadRooms) * 100;
              const sharePct = (b.rooms / totalLeadRooms) * 100;
              return (
                <button
                  key={b.label}
                  onClick={() => showToast(`Drilling into ${b.label} lead bucket · ${b.rooms} rooms · ${money(b.revenue)}`)}
                  className="w-full text-left group"
                >
                  <div className="flex items-center justify-between text-sm mb-1">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-medium">{b.label}</span>
                      <span className="text-[11px] text-muted-foreground tabular">{sharePct.toFixed(0)}%</span>
                    </div>
                    <div className="flex items-center gap-3 tabular">
                      <span className="text-emerald-600 font-medium">+{b.rooms} rms</span>
                      <span className="text-muted-foreground">{money(b.revenue)}</span>
                    </div>
                  </div>
                  <div className="h-3 rounded-full bg-surface-sunken overflow-hidden">
                    <div
                      className="h-full bg-linear-to-r from-emerald-500 to-teal-500 group-hover:from-emerald-600 group-hover:to-teal-600 transition-colors"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>

          <div className="border-t border-border p-3 bg-surface-sunken/30">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Insight: <span className="font-semibold text-foreground">1–7 day</span> bucket leads — typical for monsoon weekend OTA spike</span>
              <Button variant="ghost" size="sm" onClick={() => showToast("Lead-time forecast opened in AI Pricing engine")}>
                Forecast <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* FOOTER NOTE */}
      <div className="text-[11px] text-muted-foreground flex items-center justify-between flex-wrap gap-2 pt-2">
        <span>Snapshot generated from OTB ledger · Includes confirmed + tentative bookings · Excludes blocked inventory</span>
        <span className="tabular">Auto-refreshes every 15 minutes · next at {new Date(TODAY.getTime() + 9 * 60 * 1000).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
      </div>

      {/* TOAST */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-foreground text-background rounded-lg px-4 py-3 text-sm shadow-2xl">
          {toast}
        </div>
      )}
    </div>
  );
}

// ============================================================
// SUB-COMPONENTS
// ============================================================
function Th({ children, onClick, active, dir, align = "left" }: {
  children: React.ReactNode;
  onClick: () => void;
  active: boolean;
  dir: "asc" | "desc";
  align?: "left" | "right";
}) {
  return (
    <th className={cn("px-4 py-2.5 font-medium select-none cursor-pointer", align === "right" ? "text-right" : "text-left")} onClick={onClick}>
      <span className={cn("inline-flex items-center gap-1", active && "text-foreground")}>
        {children}
        {active ? (
          dir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40" />
        )}
      </span>
    </th>
  );
}

function Row({ label, value, sub, positive, negative, bold }: {
  label: string;
  value: string;
  sub?: string;
  positive?: boolean;
  negative?: boolean;
  bold?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className={cn("text-sm", bold ? "font-semibold" : "text-muted-foreground")}>{label}</span>
      <div className="text-right">
        <div className={cn(
          "tabular",
          bold ? "text-base font-semibold" : "text-sm font-medium",
          positive && "text-emerald-600",
          negative && "text-rose-600",
        )}>{value}</div>
        {sub && <div className={cn("text-[11px] tabular", positive ? "text-emerald-600/80" : negative ? "text-rose-600/80" : "text-muted-foreground")}>{sub}</div>}
      </div>
    </div>
  );
}

// ============================================================
// HELPERS
// ============================================================
function buildConicGradient(segments: { value: number; color: string }[]): string {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  let acc = 0;
  const stops = segments.map(seg => {
    const start = (acc / total) * 360;
    acc += seg.value;
    const end = (acc / total) * 360;
    return `${seg.color} ${start}deg ${end}deg`;
  });
  return `conic-gradient(${stops.join(", ")})`;
}

// minimal tailwind→hex map for donut chart colors
function tailwindToHex(cls: string): string {
  const map: Record<string, string> = {
    "bg-emerald-500": "#10b981",
    "bg-teal-500": "#14b8a6",
    "bg-cyan-500": "#06b6d4",
    "bg-blue-500": "#3b82f6",
    "bg-indigo-500": "#6366f1",
  };
  return map[cls] || "#10b981";
}
