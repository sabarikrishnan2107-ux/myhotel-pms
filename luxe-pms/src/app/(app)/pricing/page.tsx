"use client";
import * as React from "react";
import {
  Brain, Sparkles, TrendingUp, TrendingDown, Zap, Settings, BedDouble, Eye,
  CheckCircle2, X, Pencil, RefreshCw, Lightbulb, Target, Activity, Calendar,
  Cloud, Music, Flag, Users, Search, BarChart3, ChevronLeft, ChevronRight,
  AlertTriangle, Save, Lock, Unlock,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn, money } from "@/lib/utils";

// ============================================================
// TYPES + SEED
// ============================================================
type RoomTypeCode = "STD" | "DLX" | "STE" | "VLA";
type DemandLevel = "very_low" | "low" | "medium" | "high" | "very_high";

const ROOM_TYPES: { code: RoomTypeCode; name: string; basePrice: number; inventory: number }[] = [
  { code: "STD", name: "Standard",       basePrice: 4500, inventory: 32 },
  { code: "DLX", name: "Deluxe",         basePrice: 6500, inventory: 38 },
  { code: "STE", name: "Suite",          basePrice: 11500, inventory: 14 },
  { code: "VLA", name: "Villa",          basePrice: 22000, inventory: 6 },
];

type DaySignal = {
  date: Date;
  dow: number; // 0 = Sunday
  isWeekend: boolean;
  events: string[];
  holidays: string[];
  weather: "clear" | "rain" | "stormy";
  competitorAvg: number;
  searchVolumeIdx: number; // 0-100
  pickupVsLY: number; // % vs last year same date
  demand: DemandLevel;
  prices: Record<RoomTypeCode, { current: number; suggested: number; aiConfidence: number; locked: boolean }>;
};

// Deterministic seeded data — no Date.now() / Math.random() since we may run inside workflow context
function seedSignals(startDate: Date, days: number): DaySignal[] {
  const HOLIDAYS: Record<string, string[]> = {
    "2026-06-13": ["Long weekend"],
    "2026-06-20": ["Yoga Day eve"],
    "2026-06-21": ["International Yoga Day"],
    "2026-06-29": ["Eid al-Adha"],
    "2026-07-04": ["Monsoon retreat begins"],
  };
  const EVENTS: Record<string, string[]> = {
    "2026-06-07": ["Coldplay concert · NSCI Dome"],
    "2026-06-14": ["Mumbai Marathon expo"],
    "2026-06-15": ["Mumbai Marathon"],
    "2026-06-22": ["Tech conference at BKC"],
    "2026-07-01": ["Wedding season kickoff"],
  };
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    const dow = date.getDay();
    const isWeekend = dow === 5 || dow === 6 || dow === 0; // Fri-Sun
    const key = date.toISOString().slice(0, 10);
    const events = EVENTS[key] || [];
    const holidays = HOLIDAYS[key] || [];
    const eventBoost = events.length > 0 ? 1.35 : 1;
    const holidayBoost = holidays.length > 0 ? 1.18 : 1;
    const weekendBoost = isWeekend ? 1.22 : 1;
    const seasonal = 1 + Math.sin((i + 12) / 6) * 0.08;
    const factor = eventBoost * holidayBoost * weekendBoost * seasonal;

    let demand: DemandLevel = "medium";
    if (factor >= 1.5) demand = "very_high";
    else if (factor >= 1.3) demand = "high";
    else if (factor >= 1.1) demand = "medium";
    else if (factor >= 0.95) demand = "low";
    else demand = "very_low";

    const competitorAvg = Math.round(5800 * factor);
    const searchVolumeIdx = Math.min(100, Math.round(45 * factor + (events.length * 12)));
    const pickupVsLY = Math.round((factor - 1) * 100 + (i % 4 === 0 ? 5 : -2));
    const weatherSeed = (i + 3) % 10;
    const weather: DaySignal["weather"] = weatherSeed < 6 ? "clear" : weatherSeed < 9 ? "rain" : "stormy";

    const prices: DaySignal["prices"] = {} as DaySignal["prices"];
    for (const rt of ROOM_TYPES) {
      const current = Math.round(rt.basePrice * (isWeekend ? 1.15 : 1));
      const suggested = Math.round(rt.basePrice * factor / 100) * 100;
      prices[rt.code] = {
        current,
        suggested,
        aiConfidence: Math.min(95, Math.round(60 + Math.abs(factor - 1) * 60 + (events.length * 5))),
        locked: false,
      };
    }
    return { date, dow, isWeekend, events, holidays, weather, competitorAvg, searchVolumeIdx, pickupVsLY, demand, prices };
  });
}

const DEMAND_TONE: Record<DemandLevel, string> = {
  very_low: "bg-surface-sunken text-muted-foreground",
  low: "bg-info-soft text-info",
  medium: "bg-success-soft text-success",
  high: "bg-warning-soft text-warning",
  very_high: "bg-danger-soft text-danger",
};
const DEMAND_LABEL: Record<DemandLevel, string> = {
  very_low: "Very low", low: "Low", medium: "Medium", high: "High", very_high: "Very high",
};

type PricingRule = {
  id: string;
  name: string;
  trigger: string;
  adjustment: string;
  enabled: boolean;
  scope: string;
};

const RULES_SEED: PricingRule[] = [
  { id: "r1", name: "Weekend premium",      trigger: "Friday, Saturday, Sunday",    adjustment: "+22%",   enabled: true,  scope: "All room types" },
  { id: "r2", name: "Festival surge",       trigger: "On listed festivals",         adjustment: "+18%",   enabled: true,  scope: "All room types" },
  { id: "r3", name: "Last-minute discount", trigger: "Same-day · unsold inventory", adjustment: "-15%",   enabled: true,  scope: "Standard + Deluxe" },
  { id: "r4", name: "Long stay discount",   trigger: "Stay ≥ 5 nights",             adjustment: "-10%",   enabled: true,  scope: "All room types" },
  { id: "r5", name: "Corporate rate floor", trigger: "Booking under corp contract", adjustment: "Min ₹4,200", enabled: true, scope: "Deluxe" },
  { id: "r6", name: "Event week surge",     trigger: "Within 5 km of major events", adjustment: "+25%",   enabled: true,  scope: "Suites + Villas" },
  { id: "r7", name: "Off-season floor",     trigger: "Monsoon weekdays",            adjustment: "Min ₹3,800", enabled: false, scope: "Standard" },
];

// ============================================================
// MAIN PAGE
// ============================================================
export default function PricingPage() {
  const [tab, setTab] = React.useState<"heatmap" | "suggestions" | "signals" | "rules" | "settings">("heatmap");
  const [monthOffset, setMonthOffset] = React.useState(0);
  const [selectedRoomType, setSelectedRoomType] = React.useState<RoomTypeCode>("DLX");
  const [signals, setSignals] = React.useState<DaySignal[]>(() => {
    const start = new Date(2026, 5, 1); // 1 June 2026
    return seedSignals(start, 90);
  });
  const [selectedDay, setSelectedDay] = React.useState<DaySignal | null>(null);
  const [rules, setRules] = React.useState<PricingRule[]>(RULES_SEED);
  const [toast, setToast] = React.useState<string | null>(null);
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };

  const acceptSuggestion = (day: DaySignal, rt: RoomTypeCode) => {
    setSignals(prev => prev.map(d => d.date.getTime() === day.date.getTime() ? {
      ...d, prices: { ...d.prices, [rt]: { ...d.prices[rt], current: d.prices[rt].suggested } }
    } : d));
    showToast(`Accepted · ${ROOM_TYPES.find(x => x.code === rt)?.name} → ${money(day.prices[rt].suggested)}`);
  };

  const acceptAll = () => {
    setSignals(prev => prev.map(d => ({
      ...d,
      prices: Object.fromEntries(Object.entries(d.prices).map(([k, v]) => [k, { ...v, current: v.locked ? v.current : v.suggested }])) as DaySignal["prices"],
    })));
    showToast("All AI suggestions accepted · pushing to channel manager");
  };

  const toggleLock = (day: DaySignal, rt: RoomTypeCode) => {
    setSignals(prev => prev.map(d => d.date.getTime() === day.date.getTime() ? {
      ...d, prices: { ...d.prices, [rt]: { ...d.prices[rt], locked: !d.prices[rt].locked } }
    } : d));
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="h-12 w-12 rounded-xl bg-linear-to-br from-violet-500 to-fuchsia-500 text-white inline-flex items-center justify-center shadow-md">
            <Brain className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-display font-medium tracking-tight">AI Pricing Engine</h1>
            <p className="text-muted-foreground text-sm mt-1">Yield heatmap · demand-aware suggestions · auto-publish to OTAs · last refresh 4 min ago</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={() => showToast("Model retrained on last 24 months of data")}>
            <RefreshCw className="h-3.5 w-3.5" />Retrain
          </Button>
          <Button variant="outline" size="sm" onClick={() => showToast("Pushed live rates to Booking.com, Agoda, MakeMyTrip, GoMMT")}>
            <Zap className="h-3.5 w-3.5" />Push to channels
          </Button>
          <Button size="sm" onClick={acceptAll}>
            <CheckCircle2 className="h-3.5 w-3.5" />Accept all suggestions
          </Button>
        </div>
      </div>

      {/* AI MODEL STATUS BANNER */}
      <Card className="p-3 bg-linear-to-r from-violet-500/10 to-fuchsia-500/10 border-violet-500/20">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="h-8 w-8 rounded-full bg-violet-500/15 text-violet-500 inline-flex items-center justify-center"><Sparkles className="h-4 w-4" /></span>
            <div>
              <p className="text-sm font-semibold">Gradient-boosted demand model · v2.4.1</p>
              <p className="text-[11px] text-muted-foreground">Features: occupancy curve, competitor parity, events, holidays, search volume, weather, lead time · MAE ₹284 · last 30-day actuals vs predicted 96.2% accuracy</p>
            </div>
          </div>
          <Badge tone="success"><CheckCircle2 className="h-3 w-3" />Healthy</Badge>
        </div>
      </Card>

      {/* SUB-TABS */}
      <div className="border-b border-border flex flex-wrap gap-1">
        {([
          { id: "heatmap",     label: "Yield heatmap",     icon: Calendar },
          { id: "suggestions", label: "Today's suggestions", icon: Lightbulb, badge: 18 },
          { id: "signals",     label: "Demand signals",    icon: Activity },
          { id: "rules",       label: "Pricing rules",     icon: Target, badge: rules.filter(r => r.enabled).length },
          { id: "settings",    label: "Engine settings",   icon: Settings },
        ] as const).map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id as typeof tab)} className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 inline-flex items-center gap-2 transition-colors",
              tab === t.id ? "border-brand text-brand" : "border-transparent text-muted-foreground hover:text-foreground"
            )}>
              <Icon className="h-3.5 w-3.5" />{t.label}
              {"badge" in t && t.badge !== undefined && (
                <span className="ml-1 tabular text-[10px] rounded-full px-1.5 h-4 inline-flex items-center font-semibold bg-brand text-brand-foreground">{t.badge}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* HEATMAP TAB */}
      {tab === "heatmap" && (
        <YieldHeatmap
          signals={signals}
          monthOffset={monthOffset}
          setMonthOffset={setMonthOffset}
          selectedRoomType={selectedRoomType}
          setSelectedRoomType={setSelectedRoomType}
          onPick={(d) => setSelectedDay(d)}
        />
      )}

      {/* SUGGESTIONS TAB */}
      {tab === "suggestions" && (
        <SuggestionsTab signals={signals} onAccept={acceptSuggestion} onLock={toggleLock} onToast={showToast} />
      )}

      {/* SIGNALS TAB */}
      {tab === "signals" && <SignalsTab signals={signals} />}

      {/* RULES TAB */}
      {tab === "rules" && (
        <RulesTab
          rules={rules}
          onToggle={(id) => { setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r)); showToast("Rule updated"); }}
          onDelete={(id) => { setRules(prev => prev.filter(r => r.id !== id)); showToast("Rule deleted"); }}
          onAdd={(r) => { setRules(prev => [...prev, { ...r, id: "r" + (prev.length + 1) }]); showToast("Rule created"); }}
        />
      )}

      {/* SETTINGS TAB */}
      {tab === "settings" && <SettingsTab onToast={showToast} />}

      {/* DAY DETAIL DRAWER */}
      {selectedDay && (
        <DayDetailDrawer
          day={selectedDay}
          onClose={() => setSelectedDay(null)}
          onAccept={(rt) => { acceptSuggestion(selectedDay, rt); setSelectedDay(null); }}
          onLock={(rt) => toggleLock(selectedDay, rt)}
        />
      )}

      {/* TOAST */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-foreground text-background rounded-lg px-4 py-3 text-sm shadow-2xl animate-in slide-in-from-bottom-2 inline-flex items-center gap-2.5 ring-1 ring-foreground/20">
          <CheckCircle2 className="h-3.5 w-3.5" />{toast}
        </div>
      )}
    </div>
  );
}

// ============================================================
// YIELD HEATMAP
// ============================================================
function YieldHeatmap({
  signals, monthOffset, setMonthOffset, selectedRoomType, setSelectedRoomType, onPick,
}: {
  signals: DaySignal[];
  monthOffset: number;
  setMonthOffset: (n: number) => void;
  selectedRoomType: RoomTypeCode;
  setSelectedRoomType: (c: RoomTypeCode) => void;
  onPick: (d: DaySignal) => void;
}) {
  const firstDay = signals[0]?.date || new Date(2026, 5, 1);
  const viewMonth = new Date(firstDay);
  viewMonth.setMonth(viewMonth.getMonth() + monthOffset);
  const monthStart = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
  const firstDow = monthStart.getDay();
  const monthSignals = signals.filter(s => s.date.getMonth() === viewMonth.getMonth() && s.date.getFullYear() === viewMonth.getFullYear());

  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const avgPrice = monthSignals.reduce((t, s) => t + s.prices[selectedRoomType].suggested, 0) / Math.max(1, monthSignals.length);
  const maxPrice = Math.max(...monthSignals.map(s => s.prices[selectedRoomType].suggested));
  const minPrice = Math.min(...monthSignals.map(s => s.prices[selectedRoomType].suggested));
  const totalSuggested = monthSignals.reduce((t, s) => t + s.prices[selectedRoomType].suggested * ROOM_TYPES.find(x => x.code === selectedRoomType)!.inventory, 0);
  const totalCurrent = monthSignals.reduce((t, s) => t + s.prices[selectedRoomType].current * ROOM_TYPES.find(x => x.code === selectedRoomType)!.inventory, 0);
  const uplift = ((totalSuggested - totalCurrent) / Math.max(1, totalCurrent)) * 100;

  function priceColor(price: number) {
    const range = maxPrice - minPrice;
    if (range === 0) return "bg-info-soft text-info";
    const norm = (price - minPrice) / range;
    if (norm > 0.85) return "bg-danger text-white";
    if (norm > 0.65) return "bg-warning text-white";
    if (norm > 0.4) return "bg-success text-white";
    if (norm > 0.2) return "bg-info text-white";
    return "bg-info-soft text-info";
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => setMonthOffset(monthOffset - 1)}><ChevronLeft className="h-3.5 w-3.5" /></Button>
            <div className="px-3 py-1.5 font-semibold tabular text-sm min-w-[180px] text-center">{MONTHS[viewMonth.getMonth()]} {viewMonth.getFullYear()}</div>
            <Button variant="outline" size="sm" onClick={() => setMonthOffset(monthOffset + 1)} disabled={monthOffset >= 2}><ChevronRight className="h-3.5 w-3.5" /></Button>
          </div>
          <div className="flex items-center gap-1 ml-auto flex-wrap">
            <span className="text-xs text-muted-foreground mr-1">Room type:</span>
            {ROOM_TYPES.map(rt => (
              <button key={rt.code} onClick={() => setSelectedRoomType(rt.code)} className={cn(
                "h-8 px-3 rounded-full text-xs font-medium border transition-colors",
                selectedRoomType === rt.code ? "bg-foreground text-background border-foreground" : "border-border hover:bg-surface-sunken text-muted-foreground"
              )}>{rt.name}</button>
            ))}
          </div>
        </div>
      </Card>

      {/* Summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Avg suggested price</p>
          <p className="text-xl font-bold tabular mt-0.5">{money(avgPrice)}</p>
          <p className="text-[10px] text-muted-foreground">per night · {ROOM_TYPES.find(x => x.code === selectedRoomType)?.name}</p>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Price range</p>
          <p className="text-xl font-bold tabular mt-0.5">{money(minPrice)} <span className="text-sm text-muted-foreground font-normal">to</span> {money(maxPrice)}</p>
          <p className="text-[10px] text-muted-foreground">low to peak demand</p>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Potential revenue (month)</p>
          <p className="text-xl font-bold tabular mt-0.5 text-brand">{money(totalSuggested)}</p>
          <p className="text-[10px] text-muted-foreground">{ROOM_TYPES.find(x => x.code === selectedRoomType)?.inventory} rooms × {daysInMonth} nights @ AI rate</p>
        </Card>
        <Card className={cn("p-3", uplift > 0 ? "bg-success-soft/20 border-success/30" : "bg-warning-soft/20 border-warning/30")}>
          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Uplift vs current rates</p>
          <p className={cn("text-xl font-bold tabular mt-0.5", uplift > 0 ? "text-success" : "text-warning")}>{uplift > 0 ? "+" : ""}{uplift.toFixed(1)}%</p>
          <p className="text-[10px] text-muted-foreground">{money(totalSuggested - totalCurrent)} additional</p>
        </Card>
      </div>

      {/* Calendar heatmap */}
      <Card className="p-4">
        <div className="grid grid-cols-7 gap-1.5 mb-1.5">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
            <div key={d} className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground text-center py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: firstDow }, (_, i) => <div key={"pad" + i} />)}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const dayDate = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), i + 1);
            const sig = monthSignals.find(s => s.date.getDate() === i + 1);
            if (!sig) return <div key={i} className="aspect-square rounded-md bg-surface-sunken/40" />;
            const p = sig.prices[selectedRoomType];
            const colorClass = priceColor(p.suggested);
            const hasSignal = sig.events.length > 0 || sig.holidays.length > 0;
            return (
              <button
                key={i}
                onClick={() => onPick(sig)}
                className={cn(
                  "aspect-square rounded-md p-1.5 transition-all hover:scale-105 hover:shadow-md text-left relative",
                  colorClass,
                )}
              >
                <div className="flex items-start justify-between">
                  <span className="text-[10px] font-bold tabular">{i + 1}</span>
                  {p.locked && <Lock className="h-2.5 w-2.5 opacity-80" />}
                </div>
                <div className="mt-1">
                  <p className="text-[9px] tabular font-bold leading-tight">{money(p.suggested).replace("₹", "")}</p>
                  {sig.demand === "very_high" && <p className="text-[8px] uppercase font-bold opacity-90">PEAK</p>}
                  {sig.demand === "very_low" && <p className="text-[8px] uppercase font-bold opacity-90">LOW</p>}
                </div>
                {hasSignal && <div className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full bg-white shadow" title="Event or holiday" />}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-border text-[10px]">
          <span className="text-muted-foreground uppercase tracking-wider font-semibold">Demand:</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-info-soft" />Very low</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-info" />Low</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-success" />Medium</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-warning" />High</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-danger" />Peak</span>
          <span className="text-muted-foreground ml-3 inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-foreground" />= event or holiday signal</span>
          <span className="text-muted-foreground ml-3 inline-flex items-center gap-1.5"><Lock className="h-3 w-3" />= price locked by user</span>
        </div>
      </Card>
    </div>
  );
}

// ============================================================
// SUGGESTIONS TAB
// ============================================================
function SuggestionsTab({ signals, onAccept, onLock, onToast }: {
  signals: DaySignal[];
  onAccept: (day: DaySignal, rt: RoomTypeCode) => void;
  onLock: (day: DaySignal, rt: RoomTypeCode) => void;
  onToast: (m: string) => void;
}) {
  const [filter, setFilter] = React.useState<"all" | "high_uplift" | "drop">("all");
  // Show next 14 days
  const next14 = signals.slice(0, 14);

  const flatSuggestions = next14.flatMap(d =>
    ROOM_TYPES.map(rt => ({
      day: d,
      rt,
      current: d.prices[rt.code].current,
      suggested: d.prices[rt.code].suggested,
      confidence: d.prices[rt.code].aiConfidence,
      locked: d.prices[rt.code].locked,
      delta: d.prices[rt.code].suggested - d.prices[rt.code].current,
    }))
  ).filter(s => s.delta !== 0);

  const filtered = flatSuggestions.filter(s => {
    if (filter === "high_uplift") return s.delta > 500;
    if (filter === "drop") return s.delta < 0;
    return true;
  }).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  return (
    <div className="space-y-4">
      <Card className="p-3 bg-info-soft/15 border-info/20 text-xs flex items-start gap-2">
        <Lightbulb className="h-3.5 w-3.5 text-info shrink-0 mt-0.5" />
        <p><strong>{flatSuggestions.length} pricing changes</strong> suggested for the next 14 days · acceptance auto-publishes to all connected channels (Booking.com, Agoda, MakeMyTrip, GoMMT) within 90 seconds</p>
      </Card>

      <div className="flex items-center gap-1.5 flex-wrap">
        {([
          { id: "all",          label: "All suggestions", count: flatSuggestions.length },
          { id: "high_uplift",  label: "High uplift (+₹500)", count: flatSuggestions.filter(s => s.delta > 500).length },
          { id: "drop",         label: "Price drops",     count: flatSuggestions.filter(s => s.delta < 0).length },
        ] as const).map(f => (
          <button key={f.id} onClick={() => setFilter(f.id as typeof filter)} className={cn(
            "h-8 px-3 rounded-full text-xs font-medium border transition-colors inline-flex items-center gap-1.5",
            filter === f.id ? "bg-foreground text-background border-foreground" : "border-border hover:bg-surface-sunken text-muted-foreground"
          )}>
            {f.label}
            <span className={cn("tabular text-[10px] rounded-full px-1.5 h-4 inline-flex items-center font-semibold", filter === f.id ? "bg-background/15 text-background" : "bg-surface-sunken text-muted-foreground")}>{f.count}</span>
          </button>
        ))}
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-sunken/40 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
            <tr>
              <th className="text-left p-3">Date</th>
              <th className="text-left p-3">Room type</th>
              <th className="text-right p-3">Current</th>
              <th className="text-right p-3">AI suggested</th>
              <th className="text-right p-3">Δ</th>
              <th className="text-center p-3">Confidence</th>
              <th className="text-left p-3">Why</th>
              <th className="text-right p-3 pr-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 30).map((s, i) => {
              const reasons: string[] = [];
              if (s.day.isWeekend) reasons.push("Weekend");
              if (s.day.events.length > 0) reasons.push(`Event: ${s.day.events[0]}`);
              if (s.day.holidays.length > 0) reasons.push(`Holiday: ${s.day.holidays[0]}`);
              if (s.day.pickupVsLY > 10) reasons.push(`Pickup +${s.day.pickupVsLY}% vs LY`);
              if (s.day.competitorAvg > s.current) reasons.push("Competitors higher");
              if (reasons.length === 0) reasons.push("Seasonal trend");

              return (
                <tr key={i} className="border-t border-border hover:bg-surface-sunken/30">
                  <td className="p-3 whitespace-nowrap">
                    <span className="font-medium tabular">{s.day.date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</span>
                    <span className="text-[10px] text-muted-foreground block">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][s.day.dow]}</span>
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <Badge tone="neutral">{s.rt.name}</Badge>
                  </td>
                  <td className="p-3 text-right tabular">{money(s.current)}</td>
                  <td className="p-3 text-right tabular font-bold">{money(s.suggested)}</td>
                  <td className={cn("p-3 text-right tabular font-semibold inline-flex items-center justify-end gap-0.5", s.delta > 0 ? "text-success" : "text-danger")}>
                    {s.delta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {s.delta > 0 ? "+" : ""}{money(s.delta)}
                  </td>
                  <td className="p-3 text-center">
                    <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-[10px] tabular font-bold",
                      s.confidence >= 80 ? "bg-success-soft text-success" : s.confidence >= 60 ? "bg-warning-soft text-warning" : "bg-surface-sunken text-muted-foreground"
                    )}>{s.confidence}%</span>
                  </td>
                  <td className="p-3 text-xs">
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {reasons.slice(0, 2).map(r => <Badge key={r} tone="info">{r}</Badge>)}
                    </div>
                  </td>
                  <td className="p-3 text-right pr-4 whitespace-nowrap">
                    <div className="inline-flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => onToast(`Why this price: ${s.day.events[0] || s.day.holidays[0] || (s.day.isWeekend ? "Weekend premium" : "Seasonal trend")} · model confidence ${s.confidence}%`)}>
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { onLock(s.day, s.rt.code); onToast(s.locked ? "Unlocked" : "Locked"); }}>
                        {s.locked ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                      </Button>
                      <Button size="sm" onClick={() => onAccept(s.day, s.rt.code)} disabled={s.locked}>
                        <CheckCircle2 className="h-3 w-3" />Accept
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-12 text-center">
            <CheckCircle2 className="h-8 w-8 mx-auto text-success mb-2" />
            <p className="font-medium">All caught up</p>
            <p className="text-xs text-muted-foreground mt-1">No price changes suggested · matches your current strategy</p>
          </div>
        )}
      </Card>
    </div>
  );
}

// ============================================================
// SIGNALS TAB
// ============================================================
function SignalsTab({ signals }: { signals: DaySignal[] }) {
  const next30 = signals.slice(0, 30);
  const events = next30.flatMap(d => d.events.map(e => ({ date: d.date, label: e })));
  const holidays = next30.flatMap(d => d.holidays.map(h => ({ date: d.date, label: h })));
  const peakDays = next30.filter(d => d.demand === "very_high");
  const lowDays = next30.filter(d => d.demand === "very_low" || d.demand === "low");
  const avgSearchIdx = next30.reduce((t, d) => t + d.searchVolumeIdx, 0) / next30.length;
  const avgPickup = next30.reduce((t, d) => t + d.pickupVsLY, 0) / next30.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-semibold inline-flex items-center gap-2"><BarChart3 className="h-4 w-4 text-brand" />Demand signals · next 30 days</p>
        <span className="text-xs text-muted-foreground">refreshed every hour</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <span className="h-8 w-8 rounded-md bg-info-soft text-info inline-flex items-center justify-center mb-2"><Search className="h-4 w-4" /></span>
          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Search volume</p>
          <p className="text-xl font-bold tabular mt-0.5">{avgSearchIdx.toFixed(0)}<span className="text-sm text-muted-foreground">/100</span></p>
          <p className="text-[10px] text-muted-foreground">Google Hotels & OTA search</p>
        </Card>
        <Card className="p-3">
          <span className="h-8 w-8 rounded-md bg-success-soft text-success inline-flex items-center justify-center mb-2"><TrendingUp className="h-4 w-4" /></span>
          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Pickup vs last year</p>
          <p className={cn("text-xl font-bold tabular mt-0.5", avgPickup > 0 ? "text-success" : "text-danger")}>{avgPickup > 0 ? "+" : ""}{avgPickup.toFixed(1)}%</p>
          <p className="text-[10px] text-muted-foreground">Bookings on books</p>
        </Card>
        <Card className="p-3">
          <span className="h-8 w-8 rounded-md bg-danger-soft text-danger inline-flex items-center justify-center mb-2"><AlertTriangle className="h-4 w-4" /></span>
          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Peak days (30d)</p>
          <p className="text-xl font-bold tabular mt-0.5">{peakDays.length}</p>
          <p className="text-[10px] text-muted-foreground">Maximize rate</p>
        </Card>
        <Card className="p-3">
          <span className="h-8 w-8 rounded-md bg-warning-soft text-warning inline-flex items-center justify-center mb-2"><TrendingDown className="h-4 w-4" /></span>
          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Low demand days</p>
          <p className="text-xl font-bold tabular mt-0.5">{lowDays.length}</p>
          <p className="text-[10px] text-muted-foreground">Push promo offers</p>
        </Card>
      </div>

      {/* Events & holidays */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <p className="font-semibold mb-3 inline-flex items-center gap-2"><Music className="h-4 w-4 text-accent" />Upcoming events</p>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No major events in next 30 days</p>
          ) : (
            <ul className="space-y-2">
              {events.map((e, i) => (
                <li key={i} className="flex items-center gap-3 p-2 rounded-md hover:bg-surface-sunken/40">
                  <span className="h-9 w-9 rounded-md bg-accent-soft text-accent inline-flex items-center justify-center shrink-0"><Music className="h-4 w-4" /></span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{e.label}</p>
                    <p className="text-[11px] text-muted-foreground tabular">{e.date.toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "short" })}</p>
                  </div>
                  <Badge tone="danger">+35% surge</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-4">
          <p className="font-semibold mb-3 inline-flex items-center gap-2"><Flag className="h-4 w-4 text-warning" />Holidays & long weekends</p>
          {holidays.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No public holidays in next 30 days</p>
          ) : (
            <ul className="space-y-2">
              {holidays.map((h, i) => (
                <li key={i} className="flex items-center gap-3 p-2 rounded-md hover:bg-surface-sunken/40">
                  <span className="h-9 w-9 rounded-md bg-warning-soft text-warning inline-flex items-center justify-center shrink-0"><Flag className="h-4 w-4" /></span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{h.label}</p>
                    <p className="text-[11px] text-muted-foreground tabular">{h.date.toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "short" })}</p>
                  </div>
                  <Badge tone="warning">+18% surge</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Competitor parity */}
      <Card className="p-4">
        <p className="font-semibold mb-3 inline-flex items-center gap-2"><Users className="h-4 w-4 text-info" />Competitor parity · within 5 km</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {([
            { name: "The Westin Mumbai",      delta: -8.2, rate: 7150 },
            { name: "Trident Bandra Kurla",   delta: 4.5, rate: 7800 },
            { name: "Sahara Star Mumbai",     delta: -2.1, rate: 6900 },
          ]).map(c => (
            <div key={c.name} className="p-3 rounded-md border border-border">
              <p className="text-sm font-medium">{c.name}</p>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-xs text-muted-foreground">Their avg deluxe</span>
                <span className="text-lg font-bold tabular">{money(c.rate)}</span>
              </div>
              <div className="flex items-center justify-between mt-1 pt-2 border-t border-border">
                <span className="text-xs text-muted-foreground">You vs them</span>
                <span className={cn("text-xs tabular font-semibold inline-flex items-center gap-0.5", c.delta > 0 ? "text-success" : "text-danger")}>
                  {c.delta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}{c.delta > 0 ? "+" : ""}{c.delta}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Weather */}
      <Card className="p-4">
        <p className="font-semibold mb-3 inline-flex items-center gap-2"><Cloud className="h-4 w-4 text-info" />Weather impact · next 14 days</p>
        <div className="grid grid-cols-7 gap-1.5">
          {next30.slice(0, 14).map((s, i) => (
            <div key={i} className={cn(
              "p-2 rounded-md text-center text-[10px]",
              s.weather === "clear" ? "bg-success-soft text-success" :
              s.weather === "rain" ? "bg-info-soft text-info" : "bg-danger-soft text-danger"
            )}>
              <p className="tabular font-bold text-sm">{s.date.getDate()}</p>
              <p className="capitalize">{s.weather}</p>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">Heavy rain or storms typically reduce walk-in demand by 12-18% · model already accounts for this</p>
      </Card>
    </div>
  );
}

// ============================================================
// RULES TAB
// ============================================================
function RulesTab({ rules, onToggle, onDelete, onAdd }: {
  rules: PricingRule[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onAdd: (r: PricingRule) => void;
}) {
  const [showNew, setShowNew] = React.useState(false);
  const [draft, setDraft] = React.useState<PricingRule>({ id: "", name: "", trigger: "", adjustment: "", enabled: true, scope: "All room types" });

  return (
    <div className="space-y-4">
      <Card className="p-3 bg-info-soft/15 border-info/20 text-xs flex items-start gap-2">
        <Target className="h-3.5 w-3.5 text-info shrink-0 mt-0.5" />
        <p>Rules are <strong>guardrails on top of the AI engine</strong> — they apply after the model has produced a base suggestion. Rules ensure brand consistency (min/max floors, weekend premium, festival surge) even when the model is uncertain.</p>
      </Card>

      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{rules.filter(r => r.enabled).length} active · {rules.filter(r => !r.enabled).length} paused</p>
        <Button size="sm" onClick={() => setShowNew(true)}><Sparkles className="h-3.5 w-3.5" />New rule</Button>
      </div>

      <div className="space-y-2">
        {rules.map(r => (
          <Card key={r.id} className={cn("p-4", !r.enabled && "opacity-60")}>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <span className={cn(
                  "h-10 w-10 rounded-md inline-flex items-center justify-center shrink-0",
                  r.enabled ? "bg-brand-soft text-brand-soft-foreground" : "bg-surface-sunken text-muted-foreground"
                )}><Target className="h-4 w-4" /></span>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold">{r.name}</p>
                    <Badge tone={r.enabled ? "success" : "neutral"}>{r.enabled ? "active" : "paused"}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1"><strong>When:</strong> {r.trigger}</p>
                  <p className="text-xs text-muted-foreground"><strong>Then:</strong> apply <span className="font-bold text-foreground">{r.adjustment}</span></p>
                  <p className="text-xs text-muted-foreground"><strong>Scope:</strong> {r.scope}</p>
                </div>
              </div>
              <div className="flex gap-1.5">
                <Button size="sm" variant="outline" onClick={() => onToggle(r.id)}>{r.enabled ? "Pause" : "Resume"}</Button>
                <Button size="sm" variant="ghost"><Pencil className="h-3 w-3" /></Button>
                <Button size="sm" variant="ghost" onClick={() => onDelete(r.id)}><X className="h-3 w-3 text-danger" /></Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* New rule modal */}
      {showNew && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">New pricing rule</h2>
              <button onClick={() => setShowNew(false)} className="h-8 w-8 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              <div><Label>Rule name</Label><Input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. New Year premium" /></div>
              <div><Label>Trigger (when)</Label><Input value={draft.trigger} onChange={e => setDraft({ ...draft, trigger: e.target.value })} placeholder="e.g. December 29-31" /></div>
              <div><Label>Adjustment (then)</Label><Input value={draft.adjustment} onChange={e => setDraft({ ...draft, adjustment: e.target.value })} placeholder="e.g. +40% or Min ₹8,000" /></div>
              <div><Label>Scope</Label>
                <Select value={draft.scope} onChange={e => setDraft({ ...draft, scope: e.target.value })}>
                  <option>All room types</option>
                  <option>Standard</option>
                  <option>Deluxe</option>
                  <option>Suite</option>
                  <option>Villa</option>
                  <option>Suites + Villas</option>
                  <option>Standard + Deluxe</option>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-border">
              <Button variant="ghost" onClick={() => setShowNew(false)}>Cancel</Button>
              <Button onClick={() => { onAdd(draft); setShowNew(false); setDraft({ id: "", name: "", trigger: "", adjustment: "", enabled: true, scope: "All room types" }); }} disabled={!draft.name || !draft.trigger || !draft.adjustment}>Create rule</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// ============================================================
// SETTINGS TAB
// ============================================================
function SettingsTab({ onToast }: { onToast: (m: string) => void }) {
  const [sensitivity, setSensitivity] = React.useState("balanced");
  const [refreshFreq, setRefreshFreq] = React.useState("hourly");
  const [autoPublish, setAutoPublish] = React.useState(false);
  const [confThreshold, setConfThreshold] = React.useState(75);

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <p className="font-semibold mb-1">Model sensitivity</p>
        <p className="text-xs text-muted-foreground mb-3">Tradeoff between revenue maximization and inventory protection</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {([
            { id: "conservative", label: "Conservative", detail: "Smaller price moves · prioritize occupancy" },
            { id: "balanced",     label: "Balanced",     detail: "Default · RevPAR optimization" },
            { id: "aggressive",   label: "Aggressive",   detail: "Larger moves · prioritize ADR" },
          ]).map(o => (
            <button key={o.id} onClick={() => setSensitivity(o.id)} className={cn(
              "p-3 rounded-md border text-left transition-all",
              sensitivity === o.id ? "border-brand bg-brand-soft/15 ring-2 ring-brand/20" : "border-border hover:bg-surface-sunken"
            )}>
              <p className="text-sm font-semibold">{o.label}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{o.detail}</p>
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <p className="font-semibold mb-1">Refresh frequency</p>
        <p className="text-xs text-muted-foreground mb-3">How often the model recomputes suggestions from live demand signals</p>
        <Select value={refreshFreq} onChange={e => setRefreshFreq(e.target.value)}>
          <option value="15min">Every 15 minutes (highest cost)</option>
          <option value="hourly">Hourly</option>
          <option value="4hours">Every 4 hours</option>
          <option value="daily">Daily at 4 AM</option>
        </Select>
      </Card>

      <Card className="p-5">
        <p className="font-semibold mb-3">Auto-publish</p>
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 rounded-md bg-surface-sunken/40 border border-border">
            <input id="auto" type="checkbox" checked={autoPublish} onChange={e => setAutoPublish(e.target.checked)} className="h-4 w-4 mt-0.5" />
            <label htmlFor="auto" className="cursor-pointer flex-1">
              <p className="text-sm font-semibold">Auto-accept high-confidence suggestions</p>
              <p className="text-[11px] text-muted-foreground">When confidence ≥ {confThreshold}%, push to channels without manual review</p>
            </label>
          </div>
          {autoPublish && (
            <div className="pl-4 border-l-2 border-brand">
              <Label>Confidence threshold</Label>
              <div className="flex items-center gap-3">
                <input type="range" min={60} max={95} value={confThreshold} onChange={e => setConfThreshold(parseInt(e.target.value))} className="flex-1" />
                <span className="text-sm tabular font-bold min-w-[40px]">{confThreshold}%</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Higher = safer, fewer auto-accepted suggestions</p>
            </div>
          )}
        </div>
      </Card>

      <Card className="p-5">
        <p className="font-semibold mb-3">Channels connected</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {(["Booking.com", "Agoda", "MakeMyTrip", "GoMMT", "Expedia", "Direct website", "Cleartrip", "Yatra"]).map(c => (
            <div key={c} className="p-3 rounded-md border border-border flex items-center justify-between">
              <span className="text-xs font-medium">{c}</span>
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
            </div>
          ))}
        </div>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline">Cancel</Button>
        <Button onClick={() => onToast("Engine settings saved")}><Save className="h-3.5 w-3.5" />Save changes</Button>
      </div>
    </div>
  );
}

// ============================================================
// DAY DETAIL DRAWER
// ============================================================
function DayDetailDrawer({ day, onClose, onAccept, onLock }: {
  day: DaySignal;
  onClose: () => void;
  onAccept: (rt: RoomTypeCode) => void;
  onLock: (rt: RoomTypeCode) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-stretch justify-end">
      <Card className="w-full max-w-xl overflow-y-auto rounded-none border-l border-border">
        <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between z-10">
          <div>
            <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">{day.date.toLocaleDateString("en-IN", { weekday: "long" })}</p>
            <p className="text-lg font-bold tabular">{day.date.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>

        <div className="p-4 space-y-4">
          {/* Demand */}
          <Card className="p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Demand level</span>
              <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-bold", DEMAND_TONE[day.demand])}>{DEMAND_LABEL[day.demand]}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3 text-center">
              <div className="p-2 rounded-md bg-surface-sunken/40">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Search idx</p>
                <p className="text-lg font-bold tabular">{day.searchVolumeIdx}</p>
              </div>
              <div className="p-2 rounded-md bg-surface-sunken/40">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Pickup vs LY</p>
                <p className={cn("text-lg font-bold tabular", day.pickupVsLY > 0 ? "text-success" : "text-danger")}>{day.pickupVsLY > 0 ? "+" : ""}{day.pickupVsLY}%</p>
              </div>
              <div className="p-2 rounded-md bg-surface-sunken/40">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Comp avg</p>
                <p className="text-lg font-bold tabular">{money(day.competitorAvg)}</p>
              </div>
            </div>
          </Card>

          {/* Signals */}
          {(day.events.length > 0 || day.holidays.length > 0) && (
            <Card className="p-3">
              <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2">Active signals</p>
              <div className="space-y-1.5">
                {day.events.map(e => <div key={e} className="inline-flex items-center gap-2 text-sm"><Music className="h-3.5 w-3.5 text-accent" />{e}</div>)}
                {day.holidays.map(h => <div key={h} className="inline-flex items-center gap-2 text-sm"><Flag className="h-3.5 w-3.5 text-warning" />{h}</div>)}
                {day.isWeekend && <div className="inline-flex items-center gap-2 text-sm"><Calendar className="h-3.5 w-3.5 text-info" />Weekend</div>}
              </div>
            </Card>
          )}

          {/* Per room type pricing */}
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">AI suggestions per room type</p>
            {ROOM_TYPES.map(rt => {
              const p = day.prices[rt.code];
              const delta = p.suggested - p.current;
              return (
                <Card key={rt.code} className="p-3">
                  <div className="flex items-center gap-3">
                    <span className="h-9 w-9 rounded-md bg-brand-soft text-brand-soft-foreground inline-flex items-center justify-center shrink-0"><BedDouble className="h-4 w-4" /></span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{rt.name}</p>
                      <p className="text-[11px] text-muted-foreground">{rt.inventory} rooms available</p>
                    </div>
                    {p.locked && <Lock className="h-3.5 w-3.5 text-warning" />}
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                    <div className="p-2 rounded-md border border-border">
                      <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Current</p>
                      <p className="text-base font-bold tabular">{money(p.current)}</p>
                    </div>
                    <div className="p-2 rounded-md border-2 border-brand bg-brand-soft/15">
                      <p className="text-[9px] uppercase tracking-wider text-brand font-semibold">AI suggested</p>
                      <p className="text-base font-bold tabular text-brand">{money(p.suggested)}</p>
                    </div>
                    <div className="p-2 rounded-md border border-border">
                      <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Delta</p>
                      <p className={cn("text-base font-bold tabular inline-flex items-center justify-center gap-0.5", delta > 0 ? "text-success" : delta < 0 ? "text-danger" : "text-muted-foreground")}>
                        {delta > 0 ? "+" : ""}{money(delta)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                    <span className="text-[11px] text-muted-foreground">Confidence: <span className="font-bold tabular text-foreground">{p.aiConfidence}%</span></span>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => onLock(rt.code)}>
                        {p.locked ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}{p.locked ? "Unlock" : "Lock"}
                      </Button>
                      {!p.locked && delta !== 0 && (
                        <Button size="sm" onClick={() => onAccept(rt.code)}><CheckCircle2 className="h-3 w-3" />Accept</Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </Card>
    </div>
  );
}
