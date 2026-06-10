"use client";
import * as React from "react";
import {
  Search, RefreshCw, Settings, Plus, Trash2, MapPin, Star,
  AlertTriangle, CheckCircle2, XCircle, Globe, BedDouble, Activity, Bell, Eye,
  ArrowUpRight, ArrowDownRight, Sparkles, ChevronRight, Building2, Target,
  IndianRupee, BarChart3, Clock, Wifi, WifiOff, ShieldCheck, ExternalLink, X,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn, money } from "@/lib/utils";

// ============================================================
// SEED — deterministic
// ============================================================

type Competitor = {
  id: string;
  hotel: string;
  brand: string;
  km: number;
  stars: number;
  yourRankBefore: number;
  scrapeOk: boolean;
  lastScrape: string; // human readable
  staleHours: number;
  failureRate: number; // %
  source: string;
};

const COMPETITORS: Competitor[] = [
  { id: "westin",  hotel: "The Westin Mumbai Powai Lake", brand: "Marriott",     km: 2.4, stars: 5, yourRankBefore: 3, scrapeOk: true,  lastScrape: "4 min ago",   staleHours: 0.07, failureRate: 1.2,  source: "Booking.com" },
  { id: "trident", hotel: "Trident BKC",                  brand: "Oberoi",       km: 1.1, stars: 5, yourRankBefore: 2, scrapeOk: true,  lastScrape: "6 min ago",   staleHours: 0.10, failureRate: 0.8,  source: "Agoda" },
  { id: "sahara",  hotel: "Sahara Star",                  brand: "Sahara Group", km: 4.8, stars: 5, yourRankBefore: 6, scrapeOk: true,  lastScrape: "11 min ago",  staleHours: 0.18, failureRate: 3.4,  source: "MakeMyTrip" },
  { id: "hyatt",   hotel: "Hyatt Regency Mumbai",         brand: "Hyatt",        km: 3.2, stars: 5, yourRankBefore: 4, scrapeOk: false, lastScrape: "2 hr 18 min", staleHours: 2.30, failureRate: 8.1,  source: "Expedia" },
  { id: "sofitel", hotel: "Sofitel Mumbai BKC",           brand: "Accor",        km: 1.6, stars: 5, yourRankBefore: 1, scrapeOk: true,  lastScrape: "8 min ago",   staleHours: 0.13, failureRate: 1.9,  source: "Booking.com" },
];

const YOU = { id: "you", hotel: "The Pearl Marina", brand: "MYHOTEL", km: 0, stars: 5 };

// 14 days of rates per hotel (incl YOU). All in INR. Deterministic from index hashes.
const DAYS = 14;

function startDate(): Date {
  return new Date(2026, 5, 2); // 2 Jun 2026
}
function fmtDayShort(offset: number): { date: string; dow: string; isWknd: boolean } {
  const d = new Date(startDate());
  d.setDate(d.getDate() + offset);
  const dow = d.toLocaleDateString("en-IN", { weekday: "short" });
  const dd = d.getDate().toString().padStart(2, "0");
  const mon = d.toLocaleDateString("en-IN", { month: "short" });
  return { date: `${dd} ${mon}`, dow, isWknd: d.getDay() === 5 || d.getDay() === 6 };
}

// base rates per hotel (INR)
const BASE: Record<string, number> = {
  westin: 14800,
  trident: 17200,
  sahara: 11400,
  hyatt: 13200,
  sofitel: 18900,
  you: 15600,
};

function rate(hotelId: string, dayIdx: number): number {
  const base = BASE[hotelId];
  const wknd = fmtDayShort(dayIdx).isWknd ? 1.18 : 1.0;
  // pseudo seasonal swing
  const swing = Math.sin((dayIdx + (hotelId.charCodeAt(0) % 5)) / 2.4) * 0.09;
  const noise = ((dayIdx * 13 + hotelId.charCodeAt(0)) % 9) / 100;
  return Math.round((base * wknd * (1 + swing) * (1 + noise)) / 50) * 50;
}

// per-cell colour bucket vs the row's min & max
function cellTone(price: number, min: number, max: number): "cheap" | "mid" | "expensive" {
  if (price === min) return "cheap";
  if (price === max) return "expensive";
  return "mid";
}

// ============================================================
// PARITY ALERTS
// ============================================================
type Alert = {
  id: string;
  kind: "threat" | "opportunity" | "parity";
  competitorId: string;
  title: string;
  body: string;
  pct: number;
  day: string;
};

const ALERTS: Alert[] = [
  { id: "a1", kind: "threat",      competitorId: "westin",  title: "Westin BKC is 18% cheaper for next Friday", body: "Westin ₹13,200 vs you ₹16,150 on Fri 12 Jun. You are likely losing share — review weekend ceiling.", pct: -18.3, day: "Fri 12 Jun" },
  { id: "a2", kind: "opportunity", competitorId: "sahara",  title: "Sahara Star raised 12% — opportunity to push",          body: "Sahara moved from ₹11,400 → ₹12,750 across next 7 nights. Pearl can lift Standard floor by ₹400–₹600.", pct: +11.8, day: "next 7d" },
  { id: "a3", kind: "parity",      competitorId: "trident", title: "Trident BKC matched your rate on Booking.com",          body: "Trident is at ₹16,200 vs your ₹16,150 on Sat 13 Jun — within ₹50. Watch closely, rate parity engaged.", pct: -0.3,  day: "Sat 13 Jun" },
  { id: "a4", kind: "threat",      competitorId: "sofitel", title: "Sofitel undercutting Diwali week by 9%",                body: "Sofitel dropped Suite to ₹19,800 (was ₹21,750) for 5-9 Jun. Re-pitch corporate to defend pickup.",    pct: -9.0,  day: "5-9 Jun" },
];

// ============================================================
// BY ROOM TYPE comparison
// ============================================================
const ROOM_TYPES = [
  { code: "STD", name: "Deluxe Room",        you: 11800, westin: 10900, trident: 13400, sahara:  9450, hyatt: 10500, sofitel: 14200 },
  { code: "EXC", name: "Executive Suite",    you: 17400, westin: 16200, trident: 19800, sahara: 13900, hyatt: 15500, sofitel: 22500 },
  { code: "CLB", name: "Club Room",          you: 14600, westin: 13750, trident: 17100, sahara: 11800, hyatt: 12800, sofitel: 18400 },
  { code: "PRS", name: "Presidential Suite", you: 42500, westin: 38500, trident: 48000, sahara: 32000, hyatt: 36000, sofitel: 55000 },
];

const COMP_IDS = ["westin", "trident", "sahara", "hyatt", "sofitel"] as const;
const COMP_LABEL: Record<string, string> = {
  westin: "Westin",
  trident: "Trident",
  sahara: "Sahara",
  hyatt: "Hyatt",
  sofitel: "Sofitel",
  you: "You",
};

// ============================================================
// PAGE
// ============================================================
export default function CompShopPage() {
  const [toast, setToast] = React.useState<string | null>(null);
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };

  const [manageOpen, setManageOpen] = React.useState(false);
  const [addOpen, setAddOpen] = React.useState(false);
  const [newComp, setNewComp] = React.useState({ hotel: "", brand: "", km: "", stars: "5" });
  const [comps, setComps] = React.useState<Competitor[]>(COMPETITORS);
  const [scrapeFreq, setScrapeFreq] = React.useState("15");
  const [alertThresh, setAlertThresh] = React.useState("10");
  const [staleAlert, setStaleAlert] = React.useState("2");
  const [roomType, setRoomType] = React.useState("STD");

  // ----- Your rank for each comp -----
  // Position rank for given day across all 6 hotels (1 = cheapest)
  function yourRankOn(dayIdx: number): number {
    const rates = ["westin", "trident", "sahara", "hyatt", "sofitel", "you"].map((id) => ({ id, p: rate(id, dayIdx) }));
    rates.sort((a, b) => a.p - b.p);
    return rates.findIndex((r) => r.id === "you") + 1;
  }
  const todayRank = yourRankOn(0);
  const tomorrowRank = yourRankOn(1);

  // ---- KPIs ----
  const yourAvg14 = Math.round(Array.from({ length: DAYS }, (_, i) => rate("you", i)).reduce((a, b) => a + b, 0) / DAYS);
  const compAvg14 = Math.round(
    COMP_IDS.flatMap((c) => Array.from({ length: DAYS }, (_, i) => rate(c, i))).reduce((a, b) => a + b, 0) /
      (DAYS * COMP_IDS.length)
  );
  const gapPct = ((yourAvg14 - compAvg14) / compAvg14) * 100;

  const staleCount = comps.filter((c) => c.staleHours > Number(staleAlert)).length;
  const okCount = comps.filter((c) => c.scrapeOk).length;

  // ---- POSITIONING CHART (next 30d) ----
  const CHART_DAYS = 30;
  const youSeries = Array.from({ length: CHART_DAYS }, (_, i) => rate("you", i % DAYS) + (i * 17) % 800);
  const compAvgSeries = Array.from({ length: CHART_DAYS }, (_, i) => {
    const day = i % DAYS;
    const avg = COMP_IDS.reduce((s, c) => s + rate(c, day), 0) / COMP_IDS.length;
    return Math.round(avg + (i * 23) % 600);
  });
  const yMin = Math.min(...youSeries, ...compAvgSeries);
  const yMax = Math.max(...youSeries, ...compAvgSeries);
  const yRange = yMax - yMin || 1;
  const sx = (i: number) => (i / (CHART_DAYS - 1)) * 100;
  const sy = (v: number) => 100 - ((v - yMin) / yRange) * 80 - 10;

  // ----- handlers -----
  const removeComp = (id: string) => {
    setComps((c) => c.filter((x) => x.id !== id));
    showToast(`Removed ${COMPETITORS.find((c) => c.id === id)?.hotel ?? id} from comp set`);
  };
  const addNew = () => {
    if (!newComp.hotel.trim()) { showToast("Hotel name required"); return; }
    const id = `c${Date.now()}`;
    setComps((c) => [
      ...c,
      {
        id, hotel: newComp.hotel, brand: newComp.brand || "Independent",
        km: Number(newComp.km) || 2.0, stars: Number(newComp.stars) || 5,
        yourRankBefore: c.length + 2, scrapeOk: true, lastScrape: "queued",
        staleHours: 0, failureRate: 0, source: "Booking.com",
      },
    ]);
    setNewComp({ hotel: "", brand: "", km: "", stars: "5" });
    setAddOpen(false);
    showToast(`${newComp.hotel} added to comp set · scrape queued`);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      {/* ====================  HEADER  ==================== */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="h-12 w-12 rounded-xl bg-linear-to-br from-violet-500 to-fuchsia-600 text-white inline-flex items-center justify-center shadow-md">
            <Search className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-display font-medium tracking-tight">Competitor Rate Shop</h1>
            <p className="text-muted-foreground text-sm mt-1">
              5 competitors tracked &middot; BKC / Powai / Worli &middot; The Pearl Marina, Mumbai &middot; last refresh 4 min ago
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone="success" className="mr-1"><span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" /> Live</Badge>
          <Button variant="outline" size="sm" onClick={() => showToast("Re-running scrape across all 5 competitors")}>
            <RefreshCw className="h-3.5 w-3.5" />Refresh now
          </Button>
          <Button size="sm" onClick={() => setManageOpen(true)}>
            <Settings className="h-3.5 w-3.5" />Manage comp set
          </Button>
        </div>
      </div>

      {/* ====================  KPI STRIP  ==================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-start justify-between">
            <span className="h-8 w-8 rounded-md bg-violet-500/10 text-violet-600 inline-flex items-center justify-center">
              <Target className="h-4 w-4" />
            </span>
            <Badge tone={todayRank <= 3 ? "success" : "warning"}>#{todayRank} of 6</Badge>
          </div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mt-3">Your Rank Today</p>
          <p className="text-2xl font-display font-medium tabular mt-1">#{todayRank}</p>
          <p className="text-xs text-muted-foreground mt-1">tomorrow projected &middot; <span className="tabular">#{tomorrowRank}</span></p>
        </Card>

        <Card className="p-4">
          <div className="flex items-start justify-between">
            <span className="h-8 w-8 rounded-md bg-amber-500/10 text-amber-600 inline-flex items-center justify-center">
              <IndianRupee className="h-4 w-4" />
            </span>
            <Badge tone="brand">14-day avg</Badge>
          </div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mt-3">Your ADR vs Comp-Set</p>
          <p className="text-2xl font-display font-medium tabular mt-1">{money(yourAvg14)}</p>
          <p className={cn("text-xs mt-1", gapPct >= 0 ? "text-success" : "text-danger")}>
            {gapPct >= 0 ? <ArrowUpRight className="h-3 w-3 inline" /> : <ArrowDownRight className="h-3 w-3 inline" />}
            <span className="tabular"> {gapPct >= 0 ? "+" : ""}{gapPct.toFixed(1)}%</span> vs comp avg {money(compAvg14)}
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-start justify-between">
            <span className="h-8 w-8 rounded-md bg-rose-500/10 text-rose-600 inline-flex items-center justify-center">
              <Bell className="h-4 w-4" />
            </span>
            <Badge tone="danger">{ALERTS.filter((a) => a.kind === "threat").length} threats</Badge>
          </div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mt-3">Parity Alerts</p>
          <p className="text-2xl font-display font-medium tabular mt-1">{ALERTS.length}</p>
          <p className="text-xs text-muted-foreground mt-1">
            <span className="tabular">{ALERTS.filter((a) => a.kind === "opportunity").length}</span> opportunities &middot;{" "}
            <span className="tabular">{ALERTS.filter((a) => a.kind === "parity").length}</span> parity
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-start justify-between">
            <span className={cn("h-8 w-8 rounded-md inline-flex items-center justify-center", staleCount > 0 ? "bg-amber-500/10 text-amber-600" : "bg-emerald-500/10 text-emerald-600")}>
              <Activity className="h-4 w-4" />
            </span>
            <Badge tone={staleCount > 0 ? "warning" : "success"}>
              {okCount}/{comps.length} live
            </Badge>
          </div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mt-3">Scrape Health</p>
          <p className="text-2xl font-display font-medium tabular mt-1">{Math.round((okCount / comps.length) * 100)}%</p>
          <p className={cn("text-xs mt-1", staleCount > 0 ? "text-warning" : "text-muted-foreground")}>
            {staleCount > 0 ? `${staleCount} stale > ${staleAlert}h` : "all sources healthy"}
          </p>
        </Card>
      </div>

      {/* ====================  COMP SET TABLE  ==================== */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between p-4 pb-3 border-b border-border">
          <div>
            <h2 className="text-base font-semibold">Your Comp Set</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Mumbai luxury 5-star · BKC / Powai / Worli cluster</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-3.5 w-3.5" />Add competitor
          </Button>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-surface-sunken/40">
            <tr className="text-[10px] uppercase tracking-wide text-muted-foreground">
              <th className="text-left px-4 py-2.5 font-medium">Hotel</th>
              <th className="text-left px-3 py-2.5 font-medium">Brand</th>
              <th className="text-left px-3 py-2.5 font-medium">Distance</th>
              <th className="text-left px-3 py-2.5 font-medium">Stars</th>
              <th className="text-left px-3 py-2.5 font-medium">Your Position</th>
              <th className="text-left px-3 py-2.5 font-medium">Today&apos;s Rate</th>
              <th className="text-left px-3 py-2.5 font-medium">vs You</th>
              <th className="text-right px-4 py-2.5 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            <tr className="bg-violet-500/5">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <span className="h-7 w-7 rounded-md bg-violet-500/15 text-violet-600 inline-flex items-center justify-center text-[11px] font-semibold">PM</span>
                  <div>
                    <p className="font-medium">{YOU.hotel}</p>
                    <p className="text-[11px] text-muted-foreground">You · property under analysis</p>
                  </div>
                </div>
              </td>
              <td className="px-3 py-3 text-muted-foreground">{YOU.brand}</td>
              <td className="px-3 py-3 text-muted-foreground tabular">—</td>
              <td className="px-3 py-3">
                <span className="inline-flex items-center gap-0.5 text-amber-500">
                  {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-3 w-3 fill-current" />)}
                </span>
              </td>
              <td className="px-3 py-3"><Badge tone="brand">#{todayRank} now</Badge></td>
              <td className="px-3 py-3 tabular font-medium">{money(rate("you", 0))}</td>
              <td className="px-3 py-3 text-muted-foreground">—</td>
              <td className="px-4 py-3 text-right text-muted-foreground text-[11px]">base property</td>
            </tr>
            {comps.map((c) => {
              const today = rate(c.id in BASE ? c.id : "you", 0);
              const your = rate("you", 0);
              const diff = ((today - your) / your) * 100;
              return (
                <tr key={c.id} className="hover:bg-surface-sunken/40 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="h-7 w-7 rounded-md bg-surface-sunken text-muted-foreground inline-flex items-center justify-center">
                        <Building2 className="h-3.5 w-3.5" />
                      </span>
                      <div>
                        <p className="font-medium">{c.hotel}</p>
                        <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                          <Globe className="h-3 w-3" />source: {c.source}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">{c.brand}</td>
                  <td className="px-3 py-3 tabular">
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <MapPin className="h-3 w-3" />{c.km.toFixed(1)} km
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="inline-flex items-center gap-0.5 text-amber-500">
                      {Array.from({ length: c.stars }).map((_, i) => <Star key={i} className="h-3 w-3 fill-current" />)}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <Badge tone={c.yourRankBefore <= 2 ? "warning" : "success"}>
                      You #{c.yourRankBefore} vs them
                    </Badge>
                  </td>
                  <td className="px-3 py-3 tabular">{c.id in BASE ? money(rate(c.id, 0)) : money(today)}</td>
                  <td className="px-3 py-3">
                    {c.id in BASE ? (
                      <span className={cn("tabular text-xs font-medium inline-flex items-center gap-0.5", diff >= 0 ? "text-success" : "text-danger")}>
                        {diff >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {diff >= 0 ? "+" : ""}{diff.toFixed(1)}%
                      </span>
                    ) : <span className="text-muted-foreground text-xs">queued</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => showToast(`Opening ${c.source} listing for ${c.hotel}`)}>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => removeComp(c.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {/* ====================  RATES BY HOTEL — heat grid  ==================== */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between p-4 pb-3 border-b border-border flex-wrap gap-2">
          <div>
            <h2 className="text-base font-semibold">Rates by Hotel · Next 14 Days</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              BAR for 1 room · 2 adults · Deluxe equivalent ·
              <span className="inline-flex items-center gap-1.5 ml-1.5">
                <span className="h-2 w-2 rounded-sm bg-success/30 ring-1 ring-success/40" /> cheapest
                <span className="h-2 w-2 rounded-sm bg-surface-sunken ml-1.5" /> mid
                <span className="h-2 w-2 rounded-sm bg-warning/30 ring-1 ring-warning/40 ml-1.5" /> most expensive
              </span>
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => showToast("Exported CompShop_14day_grid.xlsx")}>
            <BarChart3 className="h-3.5 w-3.5" />Export grid
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-sunken/40">
              <tr className="text-[10px] uppercase tracking-wide text-muted-foreground">
                <th className="text-left px-4 py-2.5 font-medium sticky left-0 bg-surface-sunken/60 z-10">Date</th>
                <th className="text-center px-2 py-2.5 font-medium bg-violet-500/10 text-violet-600">You</th>
                {comps.filter((c) => c.id in BASE).map((c) => (
                  <th key={c.id} className="text-center px-2 py-2.5 font-medium">{COMP_LABEL[c.id] ?? c.hotel.split(" ")[0]}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {Array.from({ length: DAYS }).map((_, dayIdx) => {
                const day = fmtDayShort(dayIdx);
                const visibleIds = ["you", ...comps.filter((c) => c.id in BASE).map((c) => c.id)];
                const dayRates = visibleIds.map((id) => rate(id, dayIdx));
                const min = Math.min(...dayRates);
                const max = Math.max(...dayRates);
                return (
                  <tr key={dayIdx} className={cn("hover:bg-surface-sunken/30 transition-colors", day.isWknd && "bg-amber-500/[0.03]")}>
                    <td className="px-4 py-2.5 sticky left-0 bg-card z-10">
                      <div className="flex items-center gap-2">
                        <span className={cn("text-[10px] uppercase tracking-wide w-8", day.isWknd ? "text-amber-600 font-semibold" : "text-muted-foreground")}>{day.dow}</span>
                        <span className="font-medium tabular">{day.date}</span>
                        {day.isWknd && <Badge tone="warning" className="!text-[9px] !px-1.5 !py-0">WKND</Badge>}
                      </div>
                    </td>
                    {visibleIds.map((id) => {
                      const p = rate(id, dayIdx);
                      const tone = cellTone(p, min, max);
                      const isYou = id === "you";
                      return (
                        <td key={id} className="px-1.5 py-2.5 text-center">
                          <span
                            className={cn(
                              "inline-flex items-center justify-center min-w-[78px] px-2 py-1 rounded-md text-xs tabular font-medium",
                              tone === "cheap" && "bg-success-soft text-success ring-1 ring-success/30",
                              tone === "expensive" && "bg-warning-soft text-warning ring-1 ring-warning/30",
                              tone === "mid" && "bg-surface-sunken text-foreground",
                              isYou && "outline outline-2 outline-offset-1 outline-violet-500/40",
                            )}
                            onClick={() => showToast(`${COMP_LABEL[id] ?? id} · ${day.date} · ${money(p)}`)}
                            style={{ cursor: "pointer" }}
                          >
                            {money(p)}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ====================  PARITY ALERTS  ==================== */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-semibold">Parity Alerts &amp; Opportunities</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Triggers fired when comp moves &gt; ±{alertThresh}% vs your BAR</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => showToast("Alert rules opened")}>
            <Bell className="h-3.5 w-3.5" />Alert rules
          </Button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {ALERTS.map((a) => {
            const c = COMPETITORS.find((x) => x.id === a.competitorId);
            const tone = a.kind === "threat" ? "danger" : a.kind === "opportunity" ? "success" : "warning";
            const Icon = a.kind === "threat" ? AlertTriangle : a.kind === "opportunity" ? Sparkles : ShieldCheck;
            return (
              <Card key={a.id} className="p-4">
                <div className="flex items-start gap-3">
                  <span className={cn(
                    "h-9 w-9 rounded-lg inline-flex items-center justify-center shrink-0",
                    a.kind === "threat" && "bg-danger-soft text-danger",
                    a.kind === "opportunity" && "bg-success-soft text-success",
                    a.kind === "parity" && "bg-warning-soft text-warning",
                  )}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-sm leading-snug">{a.title}</p>
                      <Badge tone={tone}>
                        <span className="tabular">{a.pct >= 0 ? "+" : ""}{a.pct.toFixed(1)}%</span>
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{a.body}</p>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                      <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1.5">
                        <Building2 className="h-3 w-3" />{c?.hotel ?? "—"}
                        <span className="mx-1 text-border">|</span>
                        <Clock className="h-3 w-3" />{a.day}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Button variant="ghost" size="sm" onClick={() => showToast(`Snoozed alert · ${a.title}`)}>
                          Snooze
                        </Button>
                        <Button size="sm" onClick={() => showToast(`Opening rate review for ${a.day}`)}>
                          Review<ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ====================  POSITIONING CHART  ==================== */}
      <Card className="p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
          <div>
            <h2 className="text-base font-semibold">Rate Positioning · Next 30 Days</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Your BAR vs comp-set average, projected daily</p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-violet-500" />
              <span className="text-muted-foreground">You</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-slate-300" />
              <span className="text-muted-foreground">Comp-set avg</span>
            </span>
            <Select className="h-8 text-xs w-auto" defaultValue="bar" onChange={(e) => showToast(`View switched to ${e.target.value}`)}>
              <option value="bar">BAR rate</option>
              <option value="ranking">Position rank</option>
              <option value="index">Rate index</option>
            </Select>
          </div>
        </div>

        <div className="relative w-full" style={{ height: 260 }}>
          <div className="absolute inset-0 grid grid-rows-4 pointer-events-none">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="border-t border-dashed border-border/60" />
            ))}
            <div className="border-t border-border" />
          </div>
          {/* axis labels */}
          <div className="absolute -left-1 top-0 h-full flex flex-col justify-between text-[10px] text-muted-foreground tabular pointer-events-none">
            <span>{money(yMax)}</span>
            <span>{money(Math.round((yMax + yMin) / 2))}</span>
            <span>{money(yMin)}</span>
          </div>

          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="youArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(139 92 246)" stopOpacity="0.35" />
                <stop offset="100%" stopColor="rgb(139 92 246)" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="compArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(148 163 184)" stopOpacity="0.25" />
                <stop offset="100%" stopColor="rgb(148 163 184)" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* comp avg area + line (behind) */}
            <path
              d={
                `M 0 100 ` +
                compAvgSeries.map((v, i) => `L ${sx(i)} ${sy(v)}`).join(" ") +
                ` L 100 100 Z`
              }
              fill="url(#compArea)"
              vectorEffect="non-scaling-stroke"
            />
            <polyline
              points={compAvgSeries.map((v, i) => `${sx(i)},${sy(v)}`).join(" ")}
              fill="none"
              stroke="rgb(148 163 184)"
              strokeWidth="0.5"
              strokeDasharray="1.4 1.2"
              vectorEffect="non-scaling-stroke"
            />

            {/* you area + line */}
            <path
              d={
                `M 0 100 ` +
                youSeries.map((v, i) => `L ${sx(i)} ${sy(v)}`).join(" ") +
                ` L 100 100 Z`
              }
              fill="url(#youArea)"
              vectorEffect="non-scaling-stroke"
            />
            <polyline
              points={youSeries.map((v, i) => `${sx(i)},${sy(v)}`).join(" ")}
              fill="none"
              stroke="rgb(139 92 246)"
              strokeWidth="0.7"
              vectorEffect="non-scaling-stroke"
            />

            {/* you points */}
            {youSeries.map((v, i) => (
              <circle key={i} cx={sx(i)} cy={sy(v)} r="0.6" fill="rgb(139 92 246)" vectorEffect="non-scaling-stroke" />
            ))}
          </svg>

          {/* x-axis */}
          <div className="absolute -bottom-5 left-0 right-0 flex justify-between text-[10px] text-muted-foreground tabular pointer-events-none">
            <span>D+0</span><span>D+7</span><span>D+14</span><span>D+21</span><span>D+30</span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3 text-xs">
          <div className="rounded-md bg-surface-sunken/50 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Avg gap (30d)</p>
            <p className={cn("text-base font-display font-medium tabular mt-0.5", gapPct >= 0 ? "text-success" : "text-danger")}>
              {gapPct >= 0 ? "+" : ""}{gapPct.toFixed(1)}%
            </p>
          </div>
          <div className="rounded-md bg-surface-sunken/50 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Days above comp avg</p>
            <p className="text-base font-display font-medium tabular mt-0.5">
              {youSeries.filter((v, i) => v > compAvgSeries[i]).length} / {CHART_DAYS}
            </p>
          </div>
          <div className="rounded-md bg-surface-sunken/50 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Sweet-spot position</p>
            <p className="text-base font-display font-medium tabular mt-0.5">#2 / 6</p>
          </div>
        </div>
      </Card>

      {/* ====================  BY ROOM TYPE  ==================== */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between p-4 pb-3 border-b border-border flex-wrap gap-2">
          <div>
            <h2 className="text-base font-semibold">By Room Type · Today&apos;s BAR Comparison</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Like-for-like comparison across published rates · 2 Jun 2026</p>
          </div>
          <Select className="w-auto h-8 text-xs" value={roomType} onChange={(e) => { setRoomType(e.target.value); showToast(`Filtered to ${ROOM_TYPES.find((r) => r.code === e.target.value)?.name}`); }}>
            <option value="STD">All room types</option>
            {ROOM_TYPES.map((r) => <option key={r.code} value={r.code}>{r.name}</option>)}
          </Select>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-surface-sunken/40">
            <tr className="text-[10px] uppercase tracking-wide text-muted-foreground">
              <th className="text-left px-4 py-2.5 font-medium">Room Type</th>
              <th className="text-center px-3 py-2.5 font-medium bg-violet-500/10 text-violet-600">You</th>
              {COMP_IDS.map((c) => <th key={c} className="text-center px-3 py-2.5 font-medium">{COMP_LABEL[c]}</th>)}
              <th className="text-right px-4 py-2.5 font-medium">Position</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {ROOM_TYPES.map((rt) => {
              const ids = ["you", ...COMP_IDS] as const;
              const vals = ids.map((id) => ({ id, p: (rt as unknown as Record<string, number>)[id] }));
              const min = Math.min(...vals.map((v) => v.p));
              const max = Math.max(...vals.map((v) => v.p));
              vals.sort((a, b) => a.p - b.p);
              const rank = vals.findIndex((v) => v.id === "you") + 1;
              return (
                <tr key={rt.code} className="hover:bg-surface-sunken/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="h-7 w-7 rounded-md bg-surface-sunken inline-flex items-center justify-center">
                        <BedDouble className="h-3.5 w-3.5 text-muted-foreground" />
                      </span>
                      <div>
                        <p className="font-medium">{rt.name}</p>
                        <p className="text-[11px] text-muted-foreground">{rt.code} category</p>
                      </div>
                    </div>
                  </td>
                  {(["you", ...COMP_IDS] as const).map((id) => {
                    const p = (rt as unknown as Record<string, number>)[id];
                    const tone = cellTone(p, min, max);
                    return (
                      <td key={id} className="px-2 py-3 text-center">
                        <span className={cn(
                          "inline-flex items-center justify-center min-w-[82px] px-2 py-1 rounded-md text-xs tabular font-medium",
                          tone === "cheap" && "bg-success-soft text-success ring-1 ring-success/30",
                          tone === "expensive" && "bg-warning-soft text-warning ring-1 ring-warning/30",
                          tone === "mid" && "bg-surface-sunken text-foreground",
                          id === "you" && "outline outline-2 outline-offset-1 outline-violet-500/40",
                        )}>
                          {money(p)}
                        </span>
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-right">
                    <Badge tone={rank <= 2 ? "success" : rank <= 4 ? "warning" : "danger"}>#{rank} of 6</Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {/* ====================  SCRAPE STATUS + SETTINGS  ==================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* SCRAPE STATUS */}
        <Card className="overflow-hidden lg:col-span-2">
          <div className="flex items-center justify-between p-4 pb-3 border-b border-border">
            <div>
              <h2 className="text-base font-semibold">Scrape Status</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Per-competitor health · alerting if stale &gt; {staleAlert}h</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => showToast("Force-rescraping all sources")}>
              <RefreshCw className="h-3.5 w-3.5" />Re-scrape all
            </Button>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-surface-sunken/40">
              <tr className="text-[10px] uppercase tracking-wide text-muted-foreground">
                <th className="text-left px-4 py-2.5 font-medium">Competitor</th>
                <th className="text-left px-3 py-2.5 font-medium">Source</th>
                <th className="text-left px-3 py-2.5 font-medium">Last Success</th>
                <th className="text-left px-3 py-2.5 font-medium">Failure Rate</th>
                <th className="text-left px-3 py-2.5 font-medium">Health</th>
                <th className="text-right px-4 py-2.5 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {comps.map((c) => {
                const stale = c.staleHours > Number(staleAlert);
                return (
                  <tr key={c.id} className={cn("hover:bg-surface-sunken/30 transition-colors", stale && "bg-danger-soft/30")}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "h-7 w-7 rounded-md inline-flex items-center justify-center",
                          c.scrapeOk ? "bg-success-soft text-success" : "bg-danger-soft text-danger",
                        )}>
                          {c.scrapeOk ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
                        </span>
                        <p className="font-medium">{c.hotel}</p>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-muted-foreground inline-flex items-center gap-1">
                        <Globe className="h-3 w-3" />{c.source}
                      </span>
                    </td>
                    <td className="px-3 py-3 tabular text-muted-foreground inline-flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />{c.lastScrape}
                    </td>
                    <td className="px-3 py-3 tabular">
                      <span className={cn(
                        c.failureRate > 5 ? "text-danger font-medium" : c.failureRate > 2 ? "text-warning" : "text-muted-foreground",
                      )}>
                        {c.failureRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {stale ? (
                        <Badge tone="danger"><AlertTriangle className="h-3 w-3" />Stale &gt; {staleAlert}h</Badge>
                      ) : c.scrapeOk ? (
                        <Badge tone="success"><CheckCircle2 className="h-3 w-3" />Healthy</Badge>
                      ) : (
                        <Badge tone="warning"><XCircle className="h-3 w-3" />Failed</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => showToast(`Re-scraping ${c.hotel} from ${c.source}`)}>
                        Re-scrape
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>

        {/* SETTINGS */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="h-8 w-8 rounded-md bg-slate-500/10 text-slate-600 inline-flex items-center justify-center">
              <Settings className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-base font-semibold">Settings</h2>
              <p className="text-[11px] text-muted-foreground">Comp-shop engine config</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Scrape frequency</Label>
              <Select value={scrapeFreq} onChange={(e) => { setScrapeFreq(e.target.value); showToast(`Scrape frequency set to every ${e.target.value} min`); }}>
                <option value="5">Every 5 minutes</option>
                <option value="15">Every 15 minutes</option>
                <option value="30">Every 30 minutes</option>
                <option value="60">Every 60 minutes</option>
                <option value="240">Every 4 hours</option>
              </Select>
              <p className="text-[11px] text-muted-foreground">Higher frequency = fresher data, more proxy cost</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Alert threshold ±</Label>
              <div className="relative">
                <Input type="number" value={alertThresh} onChange={(e) => setAlertThresh(e.target.value)} className="pr-10" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
              </div>
              <p className="text-[11px] text-muted-foreground">Fire alert when comp moves &gt; this vs your BAR</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Stale-data threshold</Label>
              <div className="relative">
                <Input type="number" value={staleAlert} onChange={(e) => setStaleAlert(e.target.value)} className="pr-10" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">hr</span>
              </div>
              <p className="text-[11px] text-muted-foreground">Flag source as stale after this duration</p>
            </div>

            <div className="pt-3 border-t border-border space-y-2">
              <Button className="w-full" size="sm" onClick={() => showToast("Settings saved · engine rebooting")}>
                <ShieldCheck className="h-3.5 w-3.5" />Save settings
              </Button>
              <Button variant="outline" size="sm" className="w-full" onClick={() => setManageOpen(true)}>
                <Eye className="h-3.5 w-3.5" />Manage competitors
              </Button>
              <Button variant="ghost" size="sm" className="w-full" onClick={() => showToast("Reset to MYHOTEL defaults")}>
                Reset to defaults
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* ====================  MANAGE COMP-SET DRAWER  ==================== */}
      {manageOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-stretch justify-end" onClick={() => setManageOpen(false)}>
          <Card className="w-full max-w-xl overflow-y-auto rounded-none" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-lg font-display font-medium">Manage Comp Set</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Add, remove or reorder the hotels you benchmark against</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setManageOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-5 space-y-4">
              <div className="rounded-lg border border-dashed border-border p-4 bg-surface-sunken/30">
                <p className="text-xs font-medium mb-2">Quick add competitor</p>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Hotel name" value={newComp.hotel} onChange={(e) => setNewComp({ ...newComp, hotel: e.target.value })} />
                  <Input placeholder="Brand (Marriott)" value={newComp.brand} onChange={(e) => setNewComp({ ...newComp, brand: e.target.value })} />
                  <Input placeholder="Distance km" type="number" value={newComp.km} onChange={(e) => setNewComp({ ...newComp, km: e.target.value })} />
                  <Select value={newComp.stars} onChange={(e) => setNewComp({ ...newComp, stars: e.target.value })}>
                    <option value="3">3-star</option>
                    <option value="4">4-star</option>
                    <option value="5">5-star</option>
                  </Select>
                </div>
                <Button size="sm" className="w-full mt-3" onClick={addNew}>
                  <Plus className="h-3.5 w-3.5" />Add to comp set
                </Button>
              </div>

              <div>
                <p className="text-xs font-medium mb-2">Current comp set ({comps.length})</p>
                <div className="space-y-2">
                  {comps.map((c) => (
                    <div key={c.id} className="flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="h-8 w-8 rounded-md bg-surface-sunken inline-flex items-center justify-center">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </span>
                        <div>
                          <p className="text-sm font-medium">{c.hotel}</p>
                          <p className="text-[11px] text-muted-foreground">{c.brand} · {c.km.toFixed(1)} km · {c.stars}-star</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => removeComp(c.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setManageOpen(false)}>Cancel</Button>
                <Button size="sm" onClick={() => { setManageOpen(false); showToast("Comp set saved · re-indexing rate intelligence"); }}>
                  Save changes
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ====================  ADD COMPETITOR MODAL  ==================== */}
      {addOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setAddOpen(false)}>
          <Card className="max-w-2xl w-full p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-display font-medium">Add Competitor</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Track rates of a new hotel in your comp set</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setAddOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label>Hotel name</Label>
                <Input placeholder="e.g. ITC Maratha Mumbai" value={newComp.hotel} onChange={(e) => setNewComp({ ...newComp, hotel: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Brand / chain</Label>
                <Input placeholder="e.g. ITC Hotels" value={newComp.brand} onChange={(e) => setNewComp({ ...newComp, brand: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Distance (km)</Label>
                <Input type="number" placeholder="3.2" value={newComp.km} onChange={(e) => setNewComp({ ...newComp, km: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Star rating</Label>
                <Select value={newComp.stars} onChange={(e) => setNewComp({ ...newComp, stars: e.target.value })}>
                  <option value="3">3-star</option>
                  <option value="4">4-star</option>
                  <option value="5">5-star</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Primary scrape source</Label>
                <Select defaultValue="booking" onChange={(e) => showToast(`Source set to ${e.target.value}`)}>
                  <option value="booking">Booking.com</option>
                  <option value="agoda">Agoda</option>
                  <option value="mmt">MakeMyTrip</option>
                  <option value="expedia">Expedia</option>
                  <option value="goibibo">Goibibo</option>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-5 pt-4 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={addNew}>
                <Plus className="h-3.5 w-3.5" />Add competitor
              </Button>
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
