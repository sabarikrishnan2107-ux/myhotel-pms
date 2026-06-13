"use client";
import * as React from "react";
import {
  Lock, Calendar, Calendar as CalendarIcon, Radio, Sparkles, Info, Zap, Layers,
  AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Wand2, Target,
  TrendingDown, Bookmark, X, RefreshCw, Send, ListFilter,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn, money } from "@/lib/utils";
import { apiGet, apiPost, apiDelete } from "@/lib/api";

// ----- types -----
type RoomTypeKey = "standard" | "deluxe" | "suite" | "villa";
type RestrictionKind = "minlos" | "maxlos" | "cta" | "ctd";

type Restriction = {
  minLos: number;
  maxLos: number;
  cta: boolean; // closed to arrival
  ctd: boolean; // closed to departure
};

type ActiveRow = {
  id: string | number;
  fromIso: string;
  toIso: string;
  roomType: RoomTypeKey | "all";
  kind: RestrictionKind;
  value: string;
  appliedBy: string;
  appliedAt: string;
  channels: string[];
};

type Preset = {
  id: string;
  label: string;
  description: string;
  apply: (r: Restriction) => Restriction;
  tone: "warning" | "danger" | "info" | "accent";
  affectedDays: number;
  rooms: RoomTypeKey[] | "all";
};

const ROOM_TYPES: { key: RoomTypeKey; label: string; rate: number; rooms: number }[] = [
  { key: "standard", label: "Standard", rate: 4500, rooms: 18 },
  { key: "deluxe", label: "Deluxe", rate: 6800, rooms: 22 },
  { key: "suite", label: "Suite", rate: 12500, rooms: 8 },
  { key: "villa", label: "Villa", rate: 24000, rooms: 4 },
];

const CHANNELS = ["Booking.com", "Agoda", "MakeMyTrip", "Expedia", "Direct"];

const TODAY = new Date("2026-06-02");

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function fmtShort(d: Date): string {
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}
function dow(d: Date): string {
  return d.toLocaleDateString("en-IN", { weekday: "short" });
}
function isWeekend(d: Date): boolean {
  const day = d.getDay();
  return day === 5 || day === 6; // Fri / Sat
}

// build initial 90-day restriction map per room type
function buildInitial(): Record<RoomTypeKey, Record<string, Restriction>> {
  const out: Record<RoomTypeKey, Record<string, Restriction>> = {
    standard: {}, deluxe: {}, suite: {}, villa: {},
  };
  for (let i = 0; i < 90; i++) {
    const d = addDays(TODAY, i);
    const iso = toIso(d);
    const wk = isWeekend(d);
    // Festival weekend simulation: Day 14-16 (Diwali-like) gets stronger rules
    const festival = i >= 14 && i <= 16;
    // Long weekend bump: Day 28-30
    const longwk = i >= 28 && i <= 30;

    (Object.keys(out) as RoomTypeKey[]).forEach((rt) => {
      let minLos = 1;
      const maxLos = 30;
      let cta = false;
      let ctd = false;
      if (wk) minLos = 2;
      if (festival) { minLos = 3; ctd = true; }
      if (longwk && (rt === "suite" || rt === "villa")) { minLos = 2; }
      // Some random sold-out style CTAs on key dates for villa
      if (rt === "villa" && (i === 7 || i === 21)) { cta = true; }
      out[rt][iso] = { minLos, maxLos, cta, ctd };
    });
  }
  return out;
}

const INITIAL_ACTIVE: ActiveRow[] = [
  {
    id: "ar-1",
    fromIso: toIso(addDays(TODAY, 5)),
    toIso: toIso(addDays(TODAY, 6)),
    roomType: "all",
    kind: "minlos",
    value: "MinLOS 2 nights",
    appliedBy: "Priya Krishnan",
    appliedAt: "2026-05-28 11:42",
    channels: ["Booking.com", "Agoda", "MakeMyTrip", "Direct"],
  },
  {
    id: "ar-2",
    fromIso: toIso(addDays(TODAY, 14)),
    toIso: toIso(addDays(TODAY, 16)),
    roomType: "all",
    kind: "minlos",
    value: "MinLOS 3 + CTD (Festival)",
    appliedBy: "Karan Mehta",
    appliedAt: "2026-05-22 09:18",
    channels: ["Booking.com", "Agoda", "MakeMyTrip", "Expedia", "Direct"],
  },
  {
    id: "ar-3",
    fromIso: toIso(addDays(TODAY, 7)),
    toIso: toIso(addDays(TODAY, 7)),
    roomType: "villa",
    kind: "cta",
    value: "Closed to arrival",
    appliedBy: "Anjali Iyer",
    appliedAt: "2026-05-30 16:05",
    channels: ["Booking.com", "Agoda", "Direct"],
  },
  {
    id: "ar-4",
    fromIso: toIso(addDays(TODAY, 28)),
    toIso: toIso(addDays(TODAY, 30)),
    roomType: "suite",
    kind: "minlos",
    value: "MinLOS 2 (Long weekend)",
    appliedBy: "Priya Krishnan",
    appliedAt: "2026-05-31 14:20",
    channels: ["Booking.com", "MakeMyTrip", "Direct"],
  },
];

// ----- helpers -----
function restrictionLabel(r: Restriction): string {
  const parts: string[] = [];
  if (r.minLos > 1) parts.push(`MinLOS ${r.minLos}`);
  if (r.maxLos < 30) parts.push(`MaxLOS ${r.maxLos}`);
  if (r.cta) parts.push("CTA");
  if (r.ctd) parts.push("CTD");
  return parts.length ? parts.join(" + ") : "Open";
}

function isRestricted(r: Restriction): boolean {
  return r.minLos > 1 || r.maxLos < 30 || r.cta || r.ctd;
}

export default function RestrictionsPage() {
  const [toast, setToast] = React.useState<string | null>(null);
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };

  const [activeRoom, setActiveRoom] = React.useState<RoomTypeKey>("standard");
  const [rangeStart, setRangeStart] = React.useState<number>(0); // day index into 90
  const [rangeEnd, setRangeEnd] = React.useState<number>(29);
  const [grid, setGrid] = React.useState<Record<RoomTypeKey, Record<string, Restriction>>>(() => buildInitial());
  const [activeRows, setActiveRows] = React.useState<ActiveRow[]>(INITIAL_ACTIVE);
  // Load applied restrictions from the backend (falls back to INITIAL_ACTIVE offline).
  React.useEffect(() => {
    apiGet<ActiveRow[]>("/rate-restrictions")
      .then(rows => { if (rows.length) setActiveRows(rows); })
      .catch(() => {});
  }, []);
  const [editing, setEditing] = React.useState<{ iso: string; rt: RoomTypeKey } | null>(null);

  // bulk apply
  const [bulkStart, setBulkStart] = React.useState<string>(toIso(addDays(TODAY, 7)));
  const [bulkEnd, setBulkEnd] = React.useState<string>(toIso(addDays(TODAY, 13)));
  const [bulkRooms, setBulkRooms] = React.useState<Record<RoomTypeKey, boolean>>({
    standard: true, deluxe: true, suite: false, villa: false,
  });
  const [bulkMinLos, setBulkMinLos] = React.useState<string>("2");
  const [bulkMaxLos, setBulkMaxLos] = React.useState<string>("");
  const [bulkCta, setBulkCta] = React.useState<boolean>(false);
  const [bulkCtd, setBulkCtd] = React.useState<boolean>(false);

  // table filter
  const [tableFilter, setTableFilter] = React.useState<"all" | RestrictionKind>("all");

  // Generate 90-day window
  const days = React.useMemo(() => {
    const list: { iso: string; date: Date; index: number }[] = [];
    for (let i = 0; i < 90; i++) {
      const d = addDays(TODAY, i);
      list.push({ iso: toIso(d), date: d, index: i });
    }
    return list;
  }, []);

  const visibleDays = days.slice(rangeStart, rangeEnd + 1);

  // KPIs
  const stats = React.useMemo(() => {
    const all = Object.values(grid).flatMap((m) => Object.values(m));
    const total = all.length;
    const restricted = all.filter(isRestricted).length;
    const cta = all.filter((r) => r.cta).length;
    const ctd = all.filter((r) => r.ctd).length;
    const minlosWeighted = all.reduce((acc, r) => acc + (r.minLos > 1 ? 1 : 0), 0);
    return { total, restricted, cta, ctd, minlosWeighted };
  }, [grid]);

  // Bulk preview affected days
  const bulkPreview = React.useMemo(() => {
    const start = new Date(bulkStart);
    const end = new Date(bulkEnd);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return { days: 0, rooms: 0, unitNights: 0 };
    const ms = end.getTime() - start.getTime();
    const days = Math.floor(ms / (1000 * 60 * 60 * 24)) + 1;
    const selectedRooms = (Object.keys(bulkRooms) as RoomTypeKey[]).filter((k) => bulkRooms[k]);
    const rooms = selectedRooms.reduce((a, k) => a + (ROOM_TYPES.find((r) => r.key === k)?.rooms ?? 0), 0);
    return { days, rooms, unitNights: days * rooms };
  }, [bulkStart, bulkEnd, bulkRooms]);

  // Impact estimate — focus on next-weekend MinLOS for active room
  const impact = React.useMemo(() => {
    // Find next weekend in window
    const nextWeekend = days.find((d) => isWeekend(d.date));
    if (!nextWeekend) return null;
    const map = grid[activeRoom];
    const r = map[nextWeekend.iso];
    if (!r || r.minLos <= 1) return null;
    const roomCount = ROOM_TYPES.find((x) => x.key === activeRoom)?.rooms ?? 0;
    // Rough heuristic: rooms blocked from 1-night bookers ~= 70% of inventory
    const blocked = Math.round(roomCount * 0.7);
    return {
      minLos: r.minLos,
      date: nextWeekend.date,
      blocked,
      roomType: ROOM_TYPES.find((x) => x.key === activeRoom)?.label ?? "",
    };
  }, [grid, activeRoom, days]);

  // ----- inline editing -----
  const updateCell = (iso: string, rt: RoomTypeKey, patch: Partial<Restriction>) => {
    setGrid((prev) => ({
      ...prev,
      [rt]: { ...prev[rt], [iso]: { ...prev[rt][iso], ...patch } },
    }));
  };

  const openEditor = (iso: string, rt: RoomTypeKey) => setEditing({ iso, rt });
  const closeEditor = () => setEditing(null);

  // ----- bulk apply -----
  const applyBulk = () => {
    const start = new Date(bulkStart);
    const end = new Date(bulkEnd);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      showToast("Please set a valid date range");
      return;
    }
    const selectedRooms = (Object.keys(bulkRooms) as RoomTypeKey[]).filter((k) => bulkRooms[k]);
    if (selectedRooms.length === 0) {
      showToast("Select at least one room type");
      return;
    }
    const minLosNum = bulkMinLos ? Number(bulkMinLos) : undefined;
    const maxLosNum = bulkMaxLos ? Number(bulkMaxLos) : undefined;
    setGrid((prev) => {
      const next = { ...prev };
      selectedRooms.forEach((rt) => {
        const map = { ...next[rt] };
        let cur = new Date(start);
        while (cur <= end) {
          const iso = toIso(cur);
          if (map[iso]) {
            map[iso] = {
              ...map[iso],
              ...(minLosNum ? { minLos: minLosNum } : {}),
              ...(maxLosNum ? { maxLos: maxLosNum } : {}),
              cta: bulkCta || map[iso].cta,
              ctd: bulkCtd || map[iso].ctd,
            };
          }
          cur = addDays(cur, 1);
        }
        next[rt] = map;
      });
      return next;
    });
    // add to active table
    const parts: string[] = [];
    if (minLosNum) parts.push(`MinLOS ${minLosNum}`);
    if (maxLosNum) parts.push(`MaxLOS ${maxLosNum}`);
    if (bulkCta) parts.push("CTA");
    if (bulkCtd) parts.push("CTD");
    const kind: RestrictionKind = bulkCta ? "cta" : bulkCtd ? "ctd" : maxLosNum ? "maxlos" : "minlos";
    const newRow: Omit<ActiveRow, "id"> = {
      fromIso: bulkStart,
      toIso: bulkEnd,
      roomType: selectedRooms.length === ROOM_TYPES.length ? "all" : (selectedRooms[0] as RoomTypeKey),
      kind,
      value: parts.join(" + ") || "Updated",
      appliedBy: "Priya Krishnan",
      appliedAt: "2026-06-02 10:14",
      channels: ["Booking.com", "Agoda", "MakeMyTrip", "Direct"],
    };
    // Persist to the backend; use the server row (with real id) on success,
    // otherwise fall back to an optimistic local row so the UI still updates.
    apiPost<ActiveRow>("/rate-restrictions", newRow)
      .then((saved) => setActiveRows((r) => [saved, ...r]))
      .catch(() => setActiveRows((r) => [{ ...newRow, id: `ar-${Date.now()}` }, ...r]));
    showToast(`Applied to ${bulkPreview.days} days · ${bulkPreview.unitNights} unit-nights`);
  };

  // ----- presets -----
  const presets: Preset[] = React.useMemo(() => {
    const weekendCount = days.filter((d) => isWeekend(d.date)).length;
    return [
      {
        id: "wk-2",
        label: "Weekend MinLOS 2",
        description: "Enforce 2-night minimum across all Fri & Sat in next 90 days",
        apply: (r) => ({ ...r, minLos: Math.max(r.minLos, 2) }),
        tone: "warning",
        affectedDays: weekendCount,
        rooms: "all",
      },
      {
        id: "fest-3",
        label: "Festival MinLOS 3 + CTD",
        description: "3-night minimum stay + closed to departure during festival window (14–16 Jun)",
        apply: (r) => ({ ...r, minLos: Math.max(r.minLos, 3), ctd: true }),
        tone: "danger",
        affectedDays: 3,
        rooms: "all",
      },
      {
        id: "long-5",
        label: "Long stay only (5+)",
        description: "Restrict Villa & Suite to 5-night minimum stays for premium guests",
        apply: (r) => ({ ...r, minLos: Math.max(r.minLos, 5) }),
        tone: "info",
        affectedDays: 90,
        rooms: ["suite", "villa"],
      },
      {
        id: "clear",
        label: "Clear all restrictions",
        description: "Reset entire 90-day window back to open inventory",
        apply: () => ({ minLos: 1, maxLos: 30, cta: false, ctd: false }),
        tone: "accent",
        affectedDays: 90,
        rooms: "all",
      },
    ];
  }, [days]);

  const applyPreset = (p: Preset) => {
    setGrid((prev) => {
      const next = { ...prev };
      (Object.keys(next) as RoomTypeKey[]).forEach((rt) => {
        if (p.rooms !== "all" && !p.rooms.includes(rt)) return;
        const map = { ...next[rt] };
        days.forEach((d) => {
          if (p.id === "wk-2" && !isWeekend(d.date)) return;
          if (p.id === "fest-3" && (d.index < 14 || d.index > 16)) return;
          map[d.iso] = p.apply(map[d.iso]);
        });
        next[rt] = map;
      });
      return next;
    });
    showToast(`Preset applied: ${p.label}`);
  };

  // pagination of 30-day windows
  const pageBack = () => {
    if (rangeStart === 0) return;
    setRangeStart(Math.max(0, rangeStart - 30));
    setRangeEnd(Math.max(29, rangeEnd - 30));
  };
  const pageNext = () => {
    if (rangeEnd >= 89) return;
    setRangeStart(Math.min(60, rangeStart + 30));
    setRangeEnd(Math.min(89, rangeEnd + 30));
  };

  const filteredActive = activeRows.filter((r) => tableFilter === "all" || r.kind === tableFilter);

  const editingCell = editing ? grid[editing.rt][editing.iso] : null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-500 to-rose-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Lock className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-medium tracking-tight">LOS Restrictions Manager</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Set minimum/maximum length-of-stay, closed-to-arrival &amp; closed-to-departure rules per date, per room type
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => showToast(`Window: ${fmtShort(addDays(TODAY, 0))} – ${fmtShort(addDays(TODAY, 89))} (90 days)`)}
            className="h-9 px-3 rounded-full border border-border bg-surface hover:bg-surface-sunken inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
            title="Change date window"
          >
            <Calendar className="h-3.5 w-3.5" /> Next 90 days
          </button>
          <Button variant="outline" size="sm" onClick={() => showToast("Restrictions exported as CSV")}>
            <ListFilter className="h-4 w-4" /> Export
          </Button>
          <Button size="sm" onClick={() => showToast("Pushed to Booking.com, Agoda, MakeMyTrip, Expedia · 4 channels updated")}>
            <Send className="h-4 w-4" /> Push to channels
          </Button>
        </div>
      </div>

      {/* Explanation banner */}
      <Card className="bg-info-soft/50 border-info/20 p-4 flex items-start gap-3">
        <div className="h-8 w-8 rounded-lg bg-info/15 flex items-center justify-center shrink-0">
          <Radio className="h-4 w-4 text-info" />
        </div>
        <div className="text-sm flex-1">
          <div className="font-medium text-foreground">Channel push behaviour</div>
          <p className="text-muted-foreground mt-0.5 leading-relaxed">
            Changes saved here apply immediately to direct bookings. To sync with OTAs (Booking.com, Agoda, MakeMyTrip, Expedia),
            click <span className="font-medium text-foreground">Push to channels</span>. Typical propagation: <span className="tabular font-medium">30–90 seconds</span>.
            Channel-manager logs are kept for 30 days under Audit Logs.
          </p>
        </div>
        <Badge tone="info" className="shrink-0"><CheckCircle2 className="h-3 w-3" /> Live</Badge>
      </Card>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4 space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-warning-soft flex items-center justify-center"><Lock className="h-3.5 w-3.5 text-warning" /></div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Restricted days</div>
          </div>
          <div className="text-2xl font-display font-medium tabular">{stats.restricted}</div>
          <div className="text-xs text-muted-foreground">of {stats.total} total cells</div>
        </Card>
        <Card className="p-4 space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-danger-soft flex items-center justify-center"><AlertCircle className="h-3.5 w-3.5 text-danger" /></div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">CTA / CTD active</div>
          </div>
          <div className="text-2xl font-display font-medium tabular">{stats.cta + stats.ctd}</div>
          <div className="text-xs text-muted-foreground">{stats.cta} CTA &middot; {stats.ctd} CTD</div>
        </Card>
        <Card className="p-4 space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-info-soft flex items-center justify-center"><CalendarIcon className="h-3.5 w-3.5 text-info" /></div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">MinLOS days</div>
          </div>
          <div className="text-2xl font-display font-medium tabular">{stats.minlosWeighted}</div>
          <div className="text-xs text-muted-foreground">across all room types</div>
        </Card>
        <Card className="p-4 space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-success-soft flex items-center justify-center"><CheckCircle2 className="h-3.5 w-3.5 text-success" /></div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Open inventory</div>
          </div>
          <div className="text-2xl font-display font-medium tabular">{stats.total - stats.restricted}</div>
          <div className="text-xs text-muted-foreground">freely sellable cells</div>
        </Card>
      </div>

      {/* TOOLBAR */}
      <Card className="p-3 sm:p-4 flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          {ROOM_TYPES.map((rt) => {
            const active = activeRoom === rt.key;
            const restrictedCount = Object.values(grid[rt.key]).filter(isRestricted).length;
            return (
              <button
                key={rt.key}
                onClick={() => { setActiveRoom(rt.key); showToast(`Viewing ${rt.label}`); }}
                className={cn(
                  "h-9 px-3.5 rounded-full text-sm font-medium border transition-colors inline-flex items-center gap-2",
                  active
                    ? "bg-foreground text-background border-foreground shadow-xs"
                    : "bg-surface text-muted-foreground border-border hover:bg-surface-sunken hover:text-foreground"
                )}
              >
                {rt.label}
                <span className={cn(
                  "text-[10px] tabular rounded-full px-1.5 h-4 inline-flex items-center font-semibold",
                  active ? "bg-background/15 text-background" : "bg-surface-sunken text-muted-foreground"
                )}>{restrictedCount}</span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarIcon className="h-3.5 w-3.5" />
            <span className="tabular font-medium text-foreground">{fmtShort(visibleDays[0].date)}</span>
            <span>–</span>
            <span className="tabular font-medium text-foreground">{fmtShort(visibleDays[visibleDays.length - 1].date)}</span>
            <span className="text-muted-foreground">({visibleDays.length} days)</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon-sm" onClick={pageBack} disabled={rangeStart === 0}><ChevronLeft className="h-3.5 w-3.5" /></Button>
            <Button variant="outline" size="icon-sm" onClick={pageNext} disabled={rangeEnd >= 89}><ChevronRight className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
      </Card>

      {/* Main grid + sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
        <div className="space-y-5">
          {/* CALENDAR GRID */}
          <Card className="p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-surface-sunken/40">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">90-day restriction calendar — {ROOM_TYPES.find((r) => r.key === activeRoom)?.label}</span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-success/70" /> Open</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-warning/80" /> Restricted</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-danger/80" /> CTA / CTD</span>
              </div>
            </div>
            <div className="p-3 grid grid-cols-5 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-6 xl:grid-cols-7 gap-2">
              {visibleDays.map((d) => {
                const r = grid[activeRoom][d.iso];
                const hardClosed = r.cta || r.ctd;
                const restricted = isRestricted(r);
                const wknd = isWeekend(d.date);
                return (
                  <button
                    key={d.iso}
                    onClick={() => openEditor(d.iso, activeRoom)}
                    className={cn(
                      "group relative rounded-lg border p-2 text-left transition-all hover:shadow-md hover:-translate-y-px",
                      hardClosed
                        ? "border-danger/30 bg-danger-soft/40 hover:bg-danger-soft/70"
                        : restricted
                          ? "border-warning/30 bg-warning-soft/40 hover:bg-warning-soft/70"
                          : "border-success/20 bg-success-soft/30 hover:bg-success-soft/50"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{dow(d.date)}</div>
                        <div className="text-base font-display font-medium tabular leading-tight">{d.date.getDate()}</div>
                      </div>
                      {wknd && <span className="text-[9px] font-semibold rounded-sm px-1 bg-accent-soft text-accent uppercase">Wknd</span>}
                    </div>
                    <div className="mt-1.5 space-y-0.5">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-muted-foreground">Min</span>
                        <span className={cn("tabular font-semibold", r.minLos > 1 ? "text-warning" : "text-foreground/60")}>{r.minLos}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-muted-foreground">Max</span>
                        <span className={cn("tabular font-semibold", r.maxLos < 30 ? "text-warning" : "text-foreground/60")}>{r.maxLos < 30 ? r.maxLos : "—"}</span>
                      </div>
                    </div>
                    <div className="mt-1 flex items-center gap-1">
                      {r.cta && <span className="text-[9px] font-bold rounded-sm px-1 bg-danger text-white">CTA</span>}
                      {r.ctd && <span className="text-[9px] font-bold rounded-sm px-1 bg-danger text-white">CTD</span>}
                      {!r.cta && !r.ctd && !restricted && <span className="text-[9px] text-success font-medium">open</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* BULK APPLY */}
          <Card className="p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-surface-sunken/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wand2 className="h-4 w-4 text-brand" />
                <span className="text-sm font-medium">Bulk apply restrictions</span>
              </div>
              <span className="text-[11px] text-muted-foreground">Apply rules to multiple dates + room types in one go</span>
            </div>
            <div className="p-4 grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-5">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="bs">From date</Label>
                    <Input id="bs" type="date" value={bulkStart} onChange={(e) => setBulkStart(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="be">To date</Label>
                    <Input id="be" type="date" value={bulkEnd} onChange={(e) => setBulkEnd(e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Room types</Label>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {ROOM_TYPES.map((rt) => {
                      const sel = bulkRooms[rt.key];
                      return (
                        <button
                          key={rt.key}
                          onClick={() => setBulkRooms((s) => ({ ...s, [rt.key]: !s[rt.key] }))}
                          className={cn(
                            "h-8 px-3 rounded-full text-xs font-medium border transition-colors",
                            sel
                              ? "bg-brand text-brand-foreground border-brand shadow-xs"
                              : "bg-surface text-muted-foreground border-border hover:bg-surface-sunken"
                          )}
                        >{rt.label}</button>
                      );
                    })}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="bmin" className="text-xs">MinLOS</Label>
                    <Select id="bmin" value={bulkMinLos} onChange={(e) => setBulkMinLos(e.target.value)}>
                      <option value="">— Keep current —</option>
                      <option value="1">1 night</option>
                      <option value="2">2 nights</option>
                      <option value="3">3 nights</option>
                      <option value="4">4 nights</option>
                      <option value="5">5 nights</option>
                      <option value="7">7 nights</option>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="bmax" className="text-xs">MaxLOS</Label>
                    <Select id="bmax" value={bulkMaxLos} onChange={(e) => setBulkMaxLos(e.target.value)}>
                      <option value="">— No cap —</option>
                      <option value="3">3 nights</option>
                      <option value="5">5 nights</option>
                      <option value="7">7 nights</option>
                      <option value="14">14 nights</option>
                      <option value="21">21 nights</option>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-4 pt-1">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bulkCta}
                      onChange={(e) => setBulkCta(e.target.checked)}
                      className="h-4 w-4 rounded border-border accent-brand"
                    />
                    <span className="text-sm">Closed to arrival (CTA)</span>
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bulkCtd}
                      onChange={(e) => setBulkCtd(e.target.checked)}
                      className="h-4 w-4 rounded border-border accent-brand"
                    />
                    <span className="text-sm">Closed to departure (CTD)</span>
                  </label>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-surface-sunken/30 p-4 flex flex-col">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Preview impact</div>
                <div className="mt-3 grid grid-cols-3 gap-3">
                  <div>
                    <div className="text-xs text-muted-foreground">Days</div>
                    <div className="text-xl font-display font-medium tabular">{bulkPreview.days}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Rooms</div>
                    <div className="text-xl font-display font-medium tabular">{bulkPreview.rooms}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Unit-nights</div>
                    <div className="text-xl font-display font-medium tabular">{bulkPreview.unitNights}</div>
                  </div>
                </div>
                <div className="mt-4 text-xs text-muted-foreground leading-relaxed">
                  Restriction will be written to <span className="font-medium text-foreground tabular">{bulkPreview.days * Object.values(bulkRooms).filter(Boolean).length}</span> cells across {Object.values(bulkRooms).filter(Boolean).length} room type(s).
                </div>
                <div className="mt-auto pt-4 flex items-center gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => showToast("Preview refreshed")}>
                    <RefreshCw className="h-4 w-4" /> Refresh
                  </Button>
                  <Button size="sm" className="flex-1" onClick={applyBulk}>
                    <Zap className="h-4 w-4" /> Apply
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* IMPACT ESTIMATE */}
          {impact && (
            <Card className="p-4 border-warning/30 bg-warning-soft/30 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-warning/15 flex items-center justify-center shrink-0">
                <TrendingDown className="h-5 w-5 text-warning" />
              </div>
              <div className="flex-1">
                <div className="text-[10px] uppercase tracking-wide text-warning font-semibold">Impact estimate</div>
                <p className="mt-0.5 text-sm">
                  Current <span className="font-semibold">MinLOS {impact.minLos}</span> on next weekend (<span className="tabular font-medium">{fmtShort(impact.date)}</span>)
                  reduces sellable rooms in <span className="font-medium">{impact.roomType}</span> by <span className="tabular font-semibold">~{impact.blocked} unit-nights</span>.
                  Estimated revenue at risk:&nbsp;
                  <span className="tabular font-semibold">{money(impact.blocked * (ROOM_TYPES.find((r) => r.key === activeRoom)?.rate ?? 0))}</span>.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => showToast("Opened RM dashboard with affected dates")}>
                <Target className="h-4 w-4" /> Review
              </Button>
            </Card>
          )}

          {/* ACTIVE RESTRICTIONS table */}
          <Card className="overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-surface-sunken/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Active restrictions</span>
                <Badge tone="neutral" className="tabular">{filteredActive.length}</Badge>
              </div>
              <div className="flex items-center gap-1.5">
                {(["all", "minlos", "maxlos", "cta", "ctd"] as const).map((k) => (
                  <button
                    key={k}
                    onClick={() => setTableFilter(k)}
                    className={cn(
                      "h-7 px-2.5 rounded-md text-[11px] font-medium border transition-colors uppercase",
                      tableFilter === k
                        ? "bg-foreground text-background border-foreground"
                        : "bg-surface text-muted-foreground border-border hover:bg-surface-sunken"
                    )}
                  >{k === "all" ? "All" : k}</button>
                ))}
              </div>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-surface-sunken/40">
                <tr className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  <th className="text-left px-4 py-2.5 font-medium">Date range</th>
                  <th className="text-left px-4 py-2.5 font-medium">Room type</th>
                  <th className="text-left px-4 py-2.5 font-medium">Restriction</th>
                  <th className="text-left px-4 py-2.5 font-medium">Applied by</th>
                  <th className="text-left px-4 py-2.5 font-medium">Channels synced</th>
                  <th className="text-right px-4 py-2.5 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredActive.map((r) => {
                  const sameDay = r.fromIso === r.toIso;
                  const rtLabel = r.roomType === "all" ? "All room types" : (ROOM_TYPES.find((rt) => rt.key === r.roomType)?.label ?? r.roomType);
                  return (
                    <tr key={r.id} className="border-t border-border hover:bg-surface-sunken/40">
                      <td className="px-4 py-3">
                        <div className="font-medium tabular">{fmtShort(new Date(r.fromIso))}{!sameDay && <> – {fmtShort(new Date(r.toIso))}</>}</div>
                        <div className="text-[11px] text-muted-foreground tabular">{sameDay ? "1 day" : `${Math.floor((new Date(r.toIso).getTime() - new Date(r.fromIso).getTime()) / 86400000) + 1} days`}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={r.roomType === "all" ? "neutral" : "brand"}>{rtLabel}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{r.value}</span>
                          <Badge tone={r.kind === "cta" || r.kind === "ctd" ? "danger" : "warning"} className="uppercase">{r.kind}</Badge>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">{r.appliedBy}</div>
                        <div className="text-[11px] text-muted-foreground tabular">{r.appliedAt}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1">
                          {r.channels.map((c) => (
                            <Badge key={c} tone="success" className="text-[10px]"><CheckCircle2 className="h-2.5 w-2.5" />{c}</Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <Button size="sm" variant="ghost" onClick={() => showToast(`Pushed "${r.value}" to ${r.channels.length} channels`)}>
                            <Send className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => { setActiveRows((rows) => rows.filter((x) => x.id !== r.id)); if (typeof r.id === "number") apiDelete(`/rate-restrictions/${r.id}`).catch(() => {}); showToast("Restriction removed"); }}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredActive.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">No restrictions match this filter</td></tr>
                )}
              </tbody>
            </table>
          </Card>
        </div>

        {/* PRESETS sidebar */}
        <aside className="space-y-4">
          <Card className="p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-surface-sunken/40 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium">Quick presets</span>
            </div>
            <div className="p-3 space-y-2">
              {presets.map((p) => (
                <button
                  key={p.id}
                  onClick={() => applyPreset(p)}
                  className="w-full text-left rounded-lg border border-border bg-surface hover:bg-surface-sunken hover:border-border-strong transition-colors p-3 group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "h-7 w-7 rounded-md flex items-center justify-center",
                        p.tone === "warning" && "bg-warning-soft text-warning",
                        p.tone === "danger" && "bg-danger-soft text-danger",
                        p.tone === "info" && "bg-info-soft text-info",
                        p.tone === "accent" && "bg-accent-soft text-accent",
                      )}>
                        <Bookmark className="h-3.5 w-3.5" />
                      </div>
                      <div className="font-medium text-sm">{p.label}</div>
                    </div>
                    <Zap className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="mt-1.5 text-[11px] text-muted-foreground leading-relaxed">{p.description}</p>
                  <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground tabular uppercase tracking-wide">
                    <span>{p.affectedDays} days affected</span>
                    <span>{p.rooms === "all" ? "All rooms" : `${p.rooms.length} rooms`}</span>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-info" />
              <span className="text-sm font-medium">Channel sync status</span>
            </div>
            <div className="space-y-2">
              {CHANNELS.map((c) => (
                <div key={c} className="flex items-center justify-between text-sm">
                  <span>{c}</span>
                  <Badge tone="success" className="text-[10px]"><CheckCircle2 className="h-2.5 w-2.5" /> Synced</Badge>
                </div>
              ))}
            </div>
            <Button size="sm" variant="outline" className="w-full" onClick={() => showToast("All channels resynced · 4 OTAs updated")}>
              <RefreshCw className="h-4 w-4" /> Resync all
            </Button>
          </Card>

          <Card className="p-4 space-y-2 bg-gradient-to-br from-brand/5 to-accent/5 border-brand/20">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-brand" />
              <span className="text-sm font-medium">AI suggestion</span>
            </div>
            <p className="text-[12px] text-muted-foreground leading-relaxed">
              Based on Pearl Marina&apos;s pickup pattern, consider <span className="font-medium text-foreground">MinLOS 3</span> on
              <span className="tabular font-medium text-foreground"> 14–16 Jun</span>. Last year same dates ran 96% occupancy at ADR <span className="tabular font-medium text-foreground">{money(11200)}</span>.
            </p>
            <Button size="sm" variant="outline" className="w-full" onClick={() => showToast("AI suggestion applied to festival window")}>
              <Wand2 className="h-4 w-4" /> Apply suggestion
            </Button>
          </Card>
        </aside>
      </div>

      {/* Inline edit modal */}
      {editing && editingCell && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={closeEditor}>
          <Card className="max-w-md w-full p-0 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-border bg-surface-sunken/40 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Edit restriction</div>
                <div className="text-base font-display font-medium mt-0.5 tabular">
                  {fmtShort(new Date(editing.iso))} — {ROOM_TYPES.find((r) => r.key === editing.rt)?.label}
                </div>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={closeEditor}><X className="h-4 w-4" /></Button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Minimum LOS</Label>
                  <Select
                    value={String(editingCell.minLos)}
                    onChange={(e) => updateCell(editing.iso, editing.rt, { minLos: Number(e.target.value) })}
                  >
                    {[1, 2, 3, 4, 5, 7, 10, 14].map((n) => <option key={n} value={n}>{n} night{n > 1 ? "s" : ""}</option>)}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Maximum LOS</Label>
                  <Select
                    value={String(editingCell.maxLos)}
                    onChange={(e) => updateCell(editing.iso, editing.rt, { maxLos: Number(e.target.value) })}
                  >
                    {[3, 5, 7, 14, 21, 30].map((n) => <option key={n} value={n}>{n === 30 ? "No cap" : `${n} nights`}</option>)}
                  </Select>
                </div>
              </div>
              <div className="space-y-2 pt-1">
                <label className="flex items-center justify-between rounded-md border border-border p-3 cursor-pointer hover:bg-surface-sunken">
                  <div>
                    <div className="text-sm font-medium">Closed to arrival</div>
                    <div className="text-[11px] text-muted-foreground">Guests cannot start a stay on this date</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={editingCell.cta}
                    onChange={(e) => updateCell(editing.iso, editing.rt, { cta: e.target.checked })}
                    className="h-4 w-4 accent-brand"
                  />
                </label>
                <label className="flex items-center justify-between rounded-md border border-border p-3 cursor-pointer hover:bg-surface-sunken">
                  <div>
                    <div className="text-sm font-medium">Closed to departure</div>
                    <div className="text-[11px] text-muted-foreground">Guests cannot check out on this date</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={editingCell.ctd}
                    onChange={(e) => updateCell(editing.iso, editing.rt, { ctd: e.target.checked })}
                    className="h-4 w-4 accent-brand"
                  />
                </label>
              </div>
              <div className="rounded-md bg-surface-sunken/50 p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Resulting label</span>
                  <span className="font-medium">{restrictionLabel(editingCell)}</span>
                </div>
              </div>
            </div>
            <div className="px-5 py-3 border-t border-border bg-surface-sunken/30 flex items-center justify-between">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  updateCell(editing.iso, editing.rt, { minLos: 1, maxLos: 30, cta: false, ctd: false });
                  showToast("Cleared restrictions for this date");
                }}
              >Clear all</Button>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={closeEditor}>Cancel</Button>
                <Button size="sm" onClick={() => { showToast("Saved · ready to push to channels"); closeEditor(); }}>
                  <CheckCircle2 className="h-4 w-4" /> Save
                </Button>
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
