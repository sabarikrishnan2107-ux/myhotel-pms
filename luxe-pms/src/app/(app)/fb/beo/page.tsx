"use client";
import * as React from "react";
import {
  ClipboardList, Plus, Search, Calendar, MapPin, Users, Package,
  X, ChevronRight, FileText, Send, Lock, Download,
  Sparkles, Clock, UtensilsCrossed, Wine, Volume2, Palette,
  UserCog, Truck, Building2, IndianRupee, AlertCircle, CheckCircle2,
  Filter, Eye, Trash2, Copy, TrendingUp, Layers, Activity,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, NumberInput } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn, money } from "@/lib/utils";
import { apiGet, apiPost, apiPut } from "@/lib/api";

type BeoStatus = "draft" | "confirmed" | "in-progress" | "completed";
type EventType = "Wedding" | "Conference" | "Birthday" | "Cocktail" | "Corporate Offsite" | "Anniversary";
type Package = "Silver" | "Gold" | "Platinum" | "Custom";

// A single course = a named group of dish strings (Menu section).
type Course = { name: string; items: string[] };
// Every other list section is a flat table of scalar cells, persisted verbatim
// into its JSON column. A shared shape keeps the reusable EditableTable simple.
type EditableRow = Record<string, string | number>;

type Beo = {
  id: string;
  eventName: string;
  type: EventType;
  date: string;        // ISO yyyy-mm-dd
  venue: string;
  host: string;
  pax: number;
  pkg: Package;
  revenue: number;     // INR
  margin: number;      // pct 0-1
  advance: number;     // INR
  status: BeoStatus;
  // Section detail (persisted columns) — optional on the base type, required in DraftBeo.
  startTime?: string;
  endTime?: string;
  vegPax?: number;
  nonVegPax?: number;
  dietary?: string;
  barPackage?: string;
  cocktails?: string;
  avNotes?: string;
  decorTheme?: string;
  decorColor?: string;
  staffService?: number;
  staffKitchen?: number;
  staffCaptains?: number;
  parking?: number;
  security?: number;
  florist?: string;
  photographer?: string;
  ancillary?: number;
  // List sections — round-tripped to the banquet_orders JSON columns. Optional on
  // the base row (a freshly-loaded BEO may have nulls); DraftBeo makes them required.
  courses?: Course[];
  timeline?: EditableRow[];
  bars?: EditableRow[];
  avEquipment?: EditableRow[];
  decorVendors?: EditableRow[];
  staffing?: EditableRow[];
  vendors?: EditableRow[];
  signage?: EditableRow[];
  // Backend carry-fields: the human BEO number lives in `beoNo`, the numeric PK
  // in `_pk`. `id` mirrors `beoNo` so existing JSX/comparisons stay byte-identical.
  beoNo?: string;
  _pk?: number;
};

// Raw row shape as returned by GET /banquet-orders (numeric id + beoNo column).
type BeoRow = Omit<Beo, "id"> & { id: number; beoNo: string };

const STATUS_TONE: Record<BeoStatus, "neutral"|"info"|"warning"|"success"> = {
  draft: "neutral",
  confirmed: "info",
  "in-progress": "warning",
  completed: "success",
};
const STATUS_LABEL: Record<BeoStatus, string> = {
  draft: "Draft",
  confirmed: "Confirmed",
  "in-progress": "In-progress",
  completed: "Completed",
};

const SEED: Beo[] = [
  {
    id: "BEO-1042",
    eventName: "Mehta-Sharma Wedding",
    type: "Wedding",
    date: "2026-06-15",
    venue: "Grand Ballroom",
    host: "Rajesh Mehta",
    pax: 250,
    pkg: "Platinum",
    revenue: 850000,
    margin: 0.34,
    advance: 425000,
    status: "confirmed",
  },
  {
    id: "BEO-1043",
    eventName: "Iyer Reception",
    type: "Wedding",
    date: "2026-06-08",
    venue: "Marina Lawn",
    host: "Anjali Iyer",
    pax: 180,
    pkg: "Gold",
    revenue: 480000,
    margin: 0.31,
    advance: 240000,
    status: "in-progress",
  },
  {
    id: "BEO-1044",
    eventName: "Tata Steel Annual Conference",
    type: "Conference",
    date: "2026-06-12",
    venue: "Pearl Hall A+B",
    host: "Karan Mehta",
    pax: 120,
    pkg: "Gold",
    revenue: 340000,
    margin: 0.38,
    advance: 170000,
    status: "confirmed",
  },
  {
    id: "BEO-1045",
    eventName: "Priya Krishnan 40th Birthday",
    type: "Birthday",
    date: "2026-06-20",
    venue: "Skydeck Terrace",
    host: "Priya Krishnan",
    pax: 60,
    pkg: "Silver",
    revenue: 145000,
    margin: 0.42,
    advance: 50000,
    status: "draft",
  },
  {
    id: "BEO-1046",
    eventName: "Sundaram-Reddy Sangeet",
    type: "Wedding",
    date: "2026-06-14",
    venue: "Marina Lawn",
    host: "Lakshmi Sundaram",
    pax: 220,
    pkg: "Platinum",
    revenue: 720000,
    margin: 0.33,
    advance: 360000,
    status: "confirmed",
  },
  {
    id: "BEO-1047",
    eventName: "Reliance Capital Quarterly Meet",
    type: "Corporate Offsite",
    date: "2026-06-05",
    venue: "Pearl Hall A",
    host: "Vikram Patel",
    pax: 85,
    pkg: "Gold",
    revenue: 285000,
    margin: 0.40,
    advance: 285000,
    status: "completed",
  },
  {
    id: "BEO-1048",
    eventName: "Joshi Anniversary",
    type: "Anniversary",
    date: "2026-06-22",
    venue: "Garden Pavilion",
    host: "Suresh Joshi",
    pax: 75,
    pkg: "Gold",
    revenue: 215000,
    margin: 0.36,
    advance: 0,
    status: "draft",
  },
  {
    id: "BEO-1049",
    eventName: "Bajaj Finserv Townhall",
    type: "Conference",
    date: "2026-06-10",
    venue: "Pearl Hall B",
    host: "Neha Bajaj",
    pax: 200,
    pkg: "Platinum",
    revenue: 540000,
    margin: 0.35,
    advance: 270000,
    status: "in-progress",
  },
  {
    id: "BEO-1050",
    eventName: "Khanna Engagement Cocktail",
    type: "Cocktail",
    date: "2026-06-18",
    venue: "Skydeck Terrace",
    host: "Aditya Khanna",
    pax: 90,
    pkg: "Platinum",
    revenue: 295000,
    margin: 0.37,
    advance: 100000,
    status: "confirmed",
  },
];

type SectionKey =
  | "basics" | "timeline" | "menu" | "beverages" | "av"
  | "decor" | "staffing" | "logistics" | "vendors" | "billing";

const SECTIONS: { key: SectionKey; label: string; icon: React.ElementType; sub: string }[] = [
  { key: "basics",    label: "Event basics", icon: Sparkles,        sub: "Name, type, venue" },
  { key: "timeline",  label: "Timeline",     icon: Clock,           sub: "Hour-by-hour run sheet" },
  { key: "menu",      label: "Menu",         icon: UtensilsCrossed, sub: "Courses & dietary" },
  { key: "beverages", label: "Beverages",    icon: Wine,            sub: "Bar & cocktails" },
  { key: "av",        label: "AV",           icon: Volume2,         sub: "Sound, lights, mics" },
  { key: "decor",     label: "Decor",        icon: Palette,         sub: "Theme & florals" },
  { key: "staffing",  label: "Staffing",     icon: UserCog,         sub: "Service brigade" },
  { key: "logistics", label: "Logistics",    icon: Truck,           sub: "Parking, security" },
  { key: "vendors",   label: "Vendors",      icon: Building2,       sub: "External partners" },
  { key: "billing",   label: "Billing",      icon: IndianRupee,     sub: "Rate & balance" },
];

// Starter templates for the list sections. A BEO loaded from the backend uses its
// own saved data; a new BEO (or a legacy row that predates these columns) starts
// from these editable defaults so the run-sheet is never blank.
const DEFAULT_COURSES: Course[] = [
  { name: "Welcome / Canapes", items: ["Paneer Tikka Skewers", "Chicken Malai Tikka", "Dahi Puchka", "Mushroom Galouti"] },
  { name: "Soup", items: ["Tomato Dhaniya Shorba", "Almond & Saffron Cream"] },
  { name: "Main course (veg)", items: ["Paneer Lababdar", "Dal Makhani", "Subz Biryani", "Aloo Gobhi Mussallam", "Assorted Naan"] },
  { name: "Main course (non-veg)", items: ["Murgh Awadhi Korma", "Lamb Rogan Josh", "Goan Fish Curry", "Hyderabadi Dum Biryani"] },
  { name: "Live counters", items: ["Tandoor station", "Pasta station", "Chaat counter", "Dosa & uttapam"] },
  { name: "Dessert", items: ["Rasmalai", "Gulab Jamun", "Kulfi Falooda", "Tiramisu"] },
];

const DEFAULT_TIMELINE: EditableRow[] = [
  { time: "08:00", team: "AV", task: "Truss rigging + line array set-up", lead: "Sound Engineer · Imran" },
  { time: "09:30", team: "Decor", task: "Floral install + LED backdrop", lead: "Bloom & Bouquet" },
  { time: "11:00", team: "Kitchen", task: "Welcome lunch mise-en-place ready", lead: "Chef Vinod" },
  { time: "12:30", team: "F&B", task: "Welcome lunch served (family-side guests)", lead: "Captain Anjali I." },
  { time: "16:00", team: "HK", task: "Final venue scrub + linen turnover", lead: "Sparkle Cleaners" },
  { time: "17:30", team: "Security", task: "Perimeter sweep + valet briefing", lead: "Duty Manager" },
  { time: "18:00", team: "Front", task: "Gates open · Welcome aarti", lead: "Concierge desk" },
  { time: "19:30", team: "F&B", task: "Cocktail hour starts (bar live)", lead: "Mixologist Karan M." },
  { time: "20:30", team: "Kitchen", task: "Dinner buffet open — 8 live counters", lead: "Chef Vinod + brigade" },
  { time: "22:30", team: "AV", task: "Slow tempo cue · last call announcement", lead: "DJ Reyansh" },
  { time: "23:30", team: "All", task: "Tear-down begins · vendor coordination", lead: "Banquet Manager" },
];

const DEFAULT_BARS: EditableRow[] = [
  { name: "Main bar (north)", staff: 3, focus: "Cocktails + scotch" },
  { name: "Mezzanine bar", staff: 2, focus: "Wine + sparkling" },
  { name: "Mocktail counter", staff: 2, focus: "Non-alcoholic specials" },
];

const DEFAULT_AV: EditableRow[] = [
  { item: "Line array (L+R)", qty: 2, status: "Reserved" },
  { item: "Subwoofers", qty: 4, status: "Reserved" },
  { item: "Lapel mics (wireless)", qty: 4, status: "Tested" },
  { item: "Handheld mics", qty: 6, status: "Reserved" },
  { item: "DJ console + booth", qty: 1, status: "Reserved" },
  { item: "Moving head lights", qty: 8, status: "Reserved" },
  { item: "LED wash lights", qty: 12, status: "Tested" },
  { item: "LED backdrop 12x8 ft", qty: 1, status: "Reserved" },
  { item: "Smoke machine + hazer", qty: 2, status: "Reserved" },
];

const DEFAULT_DECOR_VENDORS: EditableRow[] = [
  { vendor: "Bloom & Bouquet — Bandra", scope: "Floral install · centerpieces · mandap", loadIn: "09:30", contact: "+91 98XX 22 14 56" },
  { vendor: "Drape & Design Co.", scope: "Ceiling drapes · entry arch", loadIn: "08:00", contact: "+91 99XX 17 88 22" },
  { vendor: "Welspun Linen Hire", scope: "Table linen · chair covers · sashes", loadIn: "10:00", contact: "+91 96XX 04 71 39" },
];

const DEFAULT_STAFFING: EditableRow[] = [
  { role: "Service stewards", count: 22, lead: "Captain Anjali I." },
  { role: "Captains (floor)", count: 4, lead: "Senior Captain Karan M." },
  { role: "Kitchen brigade", count: 14, lead: "Chef Vinod" },
  { role: "Bar tenders", count: 7, lead: "Mixologist Reyansh" },
  { role: "Bus boys", count: 6, lead: "Captain Anjali I." },
  { role: "Front-of-house", count: 4, lead: "Duty Manager" },
];

const DEFAULT_VENDORS: EditableRow[] = [
  { vendor: "Bloom & Bouquet", service: "Florals + mandap", arrival: "09:30", status: "Confirmed" },
  { vendor: "ShaadiClicks Studios", service: "Photo + video", arrival: "17:00", status: "Confirmed" },
  { vendor: "Reyansh Live Music", service: "DJ + emcee", arrival: "18:30", status: "Contract sent" },
  { vendor: "Sparkle Cleaners", service: "Pre & post-event deep clean", arrival: "06:00 / 00:30", status: "Confirmed" },
  { vendor: "Spar Valet", service: "Valet parking", arrival: "17:00", status: "Awaiting PO" },
];

const DEFAULT_SIGNAGE: EditableRow[] = [
  { location: "Lobby entrance", signage: "Welcome standee + couple photo" },
  { location: "Ballroom door", signage: "Floral arch + name plate" },
  { location: "Mezzanine corridor", signage: "Directional way-finding" },
];

// A loaded row returns null for a column it never saved; `??` then falls back to
// the template. An intentionally-emptied list is saved as `[]` and preserved.
const listOr = <T,>(v: T[] | null | undefined, fallback: T[]): T[] => (v == null ? fallback : v);

// ─────────────────────────────────────────────────────────────────────────────

export default function BeoPage() {
  const [toast, setToast] = React.useState<string | null>(null);
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };

  const [beos, setBeos] = React.useState<Beo[]>(SEED);

  // Live load: replace the SEED fallback with real rows. Map the numeric PK onto
  // `_pk` and surface the human number (beoNo) as `id` so every render is identical.
  // On network/offline error we keep the SEED already in state.
  React.useEffect(() => {
    apiGet<BeoRow[]>("/banquet-orders")
      .then(rows => { if (rows.length) setBeos(rows.map(rowToBeo)); })
      .catch(() => {});
  }, []);

  const [q, setQ] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<BeoStatus | "all">("all");
  const [typeFilter, setTypeFilter] = React.useState<EventType | "all">("all");

  const [creatorOpen, setCreatorOpen] = React.useState(false);
  const [editingBeo, setEditingBeo] = React.useState<Beo | null>(null);

  const filtered = beos.filter(b => {
    if (statusFilter !== "all" && b.status !== statusFilter) return false;
    if (typeFilter !== "all" && b.type !== typeFilter) return false;
    if (q) {
      const s = q.toLowerCase();
      if (!b.eventName.toLowerCase().includes(s) &&
          !b.host.toLowerCase().includes(s) &&
          !b.venue.toLowerCase().includes(s) &&
          !b.id.toLowerCase().includes(s)) return false;
    }
    return true;
  });

  const kpi = {
    upcoming: beos.filter(b => b.status === "confirmed" || b.status === "in-progress").length,
    pax: beos.filter(b => b.status !== "completed").reduce((s, b) => s + b.pax, 0),
    revenue: beos.filter(b => b.status !== "completed").reduce((s, b) => s + b.revenue, 0),
    balance: beos.reduce((s, b) => s + (b.revenue - b.advance), 0),
  };

  const openNew = () => { setEditingBeo(null); setCreatorOpen(true); };
  const openEdit = (b: Beo) => { setEditingBeo(b); setCreatorOpen(true); };

  // Persist a saved/approved BEO to the backend. New rows POST (sending the human
  // number as `beoNo`, dropping the local `id`); existing rows PUT to the numeric
  // PK. On success we reconcile the server row (carrying `_pk`/`beoNo`) into state.
  // The caller already applied an optimistic setBeos, so failures are silent and
  // the offline value stays — UI behaviour is unchanged.
  const persistBeo = (editing: Beo | null, b: Beo) => {
    const { id: _id, beoNo: _beoNo, _pk, ...rest } = b;
    void _id; void _beoNo;
    const body = { ...rest, beoNo: b.id };
    if (editing && editing._pk != null) {
      apiPut<BeoRow>(`/banquet-orders/${editing._pk}`, body)
        .then(updated => setBeos(prev => prev.map(x => x.id === b.id ? rowToBeo(updated) : x)))
        .catch(() => {});
    } else {
      apiPost<BeoRow>("/banquet-orders", body)
        .then(created => setBeos(prev => prev.map(x => x.id === b.id ? rowToBeo(created) : x)))
        .catch(() => {});
    }
    void _pk;
  };

  // Export the current BEO list to a real CSV file (client-side blob download).
  const exportCsv = () => {
    const headers = ["BEO #", "Event", "Type", "Date", "Venue", "Host", "Pax", "Package", "Revenue", "Advance", "Balance", "Status"];
    const lines = beos.map(b => [b.id, b.eventName, b.type, b.date, b.venue, b.host, b.pax, b.pkg, b.revenue, b.advance, b.revenue - b.advance, STATUS_LABEL[b.status]]);
    const csv = [headers, ...lines].map(r => r.map(csvCell).join(",")).join("\r\n");
    downloadBlob(csv, "banquet-orders.csv", "text/csv;charset=utf-8;");
    showToast(`Exported ${beos.length} BEOs to CSV`);
  };

  // Duplicate a BEO into a fresh draft (new number, its own section data) and
  // persist it as a new row.
  const duplicate = (b: Beo) => {
    const copy: Beo = {
      ...b,
      id: `BEO-10${Math.floor(Math.random() * 90 + 51)}`,
      beoNo: undefined,
      _pk: undefined,
      status: "draft",
      eventName: `${b.eventName} (copy)`,
    };
    setBeos(prev => [copy, ...prev]);
    persistBeo(null, copy);
    showToast(`${b.id} duplicated to ${copy.id}`);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      {/* HEADER */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-brand to-accent flex items-center justify-center shadow-md shrink-0">
            <ClipboardList className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Banquet Event Orders</h1>
            <p className="text-sm text-muted-foreground">
              The single run-sheet every kitchen, F&amp;B, AV, housekeeping and security team works from.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => showToast("Calendar view opened")}>
            <Calendar className="h-4 w-4" /> Calendar
          </Button>
          <Button size="sm" variant="outline" onClick={exportCsv}>
            <Download className="h-4 w-4" /> Export
          </Button>
          <Button size="sm" onClick={openNew}>
            <Plus className="h-4 w-4" /> New BEO
          </Button>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          icon={Layers}
          label="UPCOMING EVENTS"
          value={String(kpi.upcoming)}
          sub="Confirmed + in-progress"
          tone="info"
        />
        <KpiCard
          icon={Users}
          label="TOTAL PAX"
          value={kpi.pax.toLocaleString("en-IN")}
          sub="Across active BEOs"
          tone="brand"
        />
        <KpiCard
          icon={TrendingUp}
          label="PIPELINE REVENUE"
          value={money(kpi.revenue)}
          sub="Active BEO bookings"
          tone="success"
        />
        <KpiCard
          icon={IndianRupee}
          label="BALANCE DUE"
          value={money(kpi.balance)}
          sub="Across all BEOs"
          tone="warning"
        />
      </div>

      {/* FILTERS */}
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search event, host, venue or BEO #"
              className="pl-9"
            />
          </div>
          <Select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as BeoStatus | "all")}
            className="w-auto min-w-[140px]"
          >
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="confirmed">Confirmed</option>
            <option value="in-progress">In-progress</option>
            <option value="completed">Completed</option>
          </Select>
          <Select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value as EventType | "all")}
            className="w-auto min-w-[140px]"
          >
            <option value="all">All types</option>
            <option value="Wedding">Wedding</option>
            <option value="Conference">Conference</option>
            <option value="Birthday">Birthday</option>
            <option value="Cocktail">Cocktail</option>
            <option value="Corporate Offsite">Corporate Offsite</option>
            <option value="Anniversary">Anniversary</option>
          </Select>
          <Button size="sm" variant="ghost" onClick={() => { setQ(""); setStatusFilter("all"); setTypeFilter("all"); showToast("Filters cleared"); }}>
            <Filter className="h-4 w-4" /> Clear
          </Button>
          <div className="ml-auto text-xs text-muted-foreground">
            Showing <span className="font-semibold text-foreground tabular">{filtered.length}</span> of {beos.length}
          </div>
        </div>
      </Card>

      {/* TABLE */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-sunken/40">
              <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-medium">BEO #</th>
                <th className="px-4 py-3 font-medium">Event</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Venue</th>
                <th className="px-4 py-3 font-medium text-right">Pax</th>
                <th className="px-4 py-3 font-medium">Package</th>
                <th className="px-4 py-3 font-medium text-right">Revenue</th>
                <th className="px-4 py-3 font-medium text-right">Balance</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(b => {
                const balance = b.revenue - b.advance;
                return (
                  <tr key={b.id} className="hover:bg-surface-sunken/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground tabular">{b.id}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{b.eventName}</div>
                      <div className="text-xs text-muted-foreground">{b.type} · Host: {b.host}</div>
                    </td>
                    <td className="px-4 py-3 tabular">{formatBeoDate(b.date)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-xs">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        {b.venue}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular">{b.pax}</td>
                    <td className="px-4 py-3">
                      <Badge tone={b.pkg === "Platinum" ? "accent" : b.pkg === "Gold" ? "warning" : "neutral"}>
                        {b.pkg}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-medium tabular">{money(b.revenue)}</td>
                    <td className="px-4 py-3 text-right tabular">
                      <span className={balance > 0 ? "text-warning font-medium" : "text-success"}>
                        {balance > 0 ? money(balance) : "Settled"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={STATUS_TONE[b.status]}>{STATUS_LABEL[b.status]}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(b)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => duplicate(b)}>
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => printBeo(b)}>
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    No BEOs match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* FULL-SCREEN CREATOR */}
      {creatorOpen && (
        <BeoCreator
          initial={editingBeo}
          onClose={() => setCreatorOpen(false)}
          onSaveDraft={(b) => {
            setBeos(prev => editingBeo ? prev.map(x => x.id === b.id ? b : x) : [b, ...prev]);
            persistBeo(editingBeo, b);
            showToast(`${b.id} saved as draft`);
            setCreatorOpen(false);
          }}
          onSendKitchen={() => showToast("Sent to kitchen — KDS notified")}
          onApprove={(b) => {
            const updated = { ...b, status: "confirmed" as BeoStatus };
            setBeos(prev => editingBeo ? prev.map(x => x.id === b.id ? updated : x) : [updated, ...prev]);
            persistBeo(editingBeo, updated);
            showToast(`${b.id} approved & locked`);
            setCreatorOpen(false);
          }}
          onPdf={(b) => printBeo(b)}
          showToast={showToast}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-foreground text-background rounded-lg px-4 py-3 text-sm shadow-2xl">
          {toast}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// KPI Card

function KpiCard({
  icon: Icon, label, value, sub, tone,
}: {
  icon: React.ElementType; label: string; value: string; sub: string;
  tone: "info" | "brand" | "success" | "warning";
}) {
  const toneClasses: Record<string, string> = {
    info:    "bg-info-soft text-info",
    brand:   "bg-brand-soft text-brand-soft-foreground",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
  };
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", toneClasses[tone])}>
          <Icon className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
          <div className="text-xl font-semibold tabular truncate">{value}</div>
          <div className="text-xs text-muted-foreground truncate">{sub}</div>
        </div>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Full-screen BEO creator

type DraftBeo = Beo & {
  // Section data
  startTime: string;
  endTime: string;
  vegPax: number;
  nonVegPax: number;
  dietary: string;
  barPackage: string;
  cocktails: string;
  avNotes: string;
  decorTheme: string;
  decorColor: string;
  staffService: number;
  staffKitchen: number;
  staffCaptains: number;
  parking: number;
  security: number;
  florist: string;
  photographer: string;
  ancillary: number;
  // List sections (always present in the editor; seeded from templates).
  courses: Course[];
  timeline: EditableRow[];
  bars: EditableRow[];
  avEquipment: EditableRow[];
  decorVendors: EditableRow[];
  staffing: EditableRow[];
  vendors: EditableRow[];
  signage: EditableRow[];
};

function makeDraft(initial: Beo | null): DraftBeo {
  if (initial) {
    // Use the BEO's saved section detail when present (loaded from the backend);
    // fall back to sensible demo defaults for any field not yet set.
    return {
      ...initial,
      startTime: initial.startTime ?? "08:00",
      endTime: initial.endTime ?? "23:00",
      vegPax: initial.vegPax ?? Math.round(initial.pax * 0.55),
      nonVegPax: initial.nonVegPax ?? Math.round(initial.pax * 0.45),
      dietary: initial.dietary ?? "12 Jain, 4 vegan, 2 nut allergies, 8 halal",
      barPackage: initial.barPackage ?? initial.pkg.toLowerCase(),
      cocktails: initial.cocktails ?? "Saffron Sour (signature), Marina Spritz, Bombay Sling",
      avNotes: initial.avNotes ?? "2x line array, 4 lapel mics, 6 wash lights, LED backdrop 12x8 ft",
      decorTheme: initial.decorTheme ?? "Royal Rajasthani",
      decorColor: initial.decorColor ?? "Maroon & Gold",
      staffService: initial.staffService ?? 22,
      staffKitchen: initial.staffKitchen ?? 14,
      staffCaptains: initial.staffCaptains ?? 4,
      parking: initial.parking ?? 90,
      security: initial.security ?? 6,
      florist: initial.florist ?? "Bloom & Bouquet — Bandra",
      photographer: initial.photographer ?? "ShaadiClicks Studios",
      ancillary: initial.ancillary ?? Math.round(initial.revenue * 0.12),
      courses: listOr(initial.courses, DEFAULT_COURSES),
      timeline: listOr(initial.timeline, DEFAULT_TIMELINE),
      bars: listOr(initial.bars, DEFAULT_BARS),
      avEquipment: listOr(initial.avEquipment, DEFAULT_AV),
      decorVendors: listOr(initial.decorVendors, DEFAULT_DECOR_VENDORS),
      staffing: listOr(initial.staffing, DEFAULT_STAFFING),
      vendors: listOr(initial.vendors, DEFAULT_VENDORS),
      signage: listOr(initial.signage, DEFAULT_SIGNAGE),
    };
  }
  return {
    id: `BEO-10${Math.floor(Math.random() * 90 + 51)}`,
    eventName: "",
    type: "Wedding",
    date: "2026-06-15",
    venue: "Grand Ballroom",
    host: "",
    pax: 100,
    pkg: "Gold",
    revenue: 0,
    margin: 0.35,
    advance: 0,
    status: "draft",
    startTime: "10:00",
    endTime: "23:00",
    vegPax: 55,
    nonVegPax: 45,
    dietary: "",
    barPackage: "gold",
    cocktails: "",
    avNotes: "",
    decorTheme: "",
    decorColor: "",
    staffService: 12,
    staffKitchen: 8,
    staffCaptains: 2,
    parking: 40,
    security: 3,
    florist: "",
    photographer: "",
    ancillary: 0,
    courses: DEFAULT_COURSES,
    timeline: DEFAULT_TIMELINE,
    bars: DEFAULT_BARS,
    avEquipment: DEFAULT_AV,
    decorVendors: DEFAULT_DECOR_VENDORS,
    staffing: DEFAULT_STAFFING,
    vendors: DEFAULT_VENDORS,
    signage: DEFAULT_SIGNAGE,
  };
}

function BeoCreator({
  initial, onClose, onSaveDraft, onSendKitchen, onApprove, onPdf, showToast,
}: {
  initial: Beo | null;
  onClose: () => void;
  onSaveDraft: (b: Beo) => void;
  onSendKitchen: () => void;
  onApprove: (b: Beo) => void;
  onPdf: (b: Beo) => void;
  showToast: (m: string) => void;
}) {
  const [section, setSection] = React.useState<SectionKey>("basics");
  const [d, setD] = React.useState<DraftBeo>(() => makeDraft(initial));

  const set = <K extends keyof DraftBeo>(k: K, v: DraftBeo[K]) => setD(prev => ({ ...prev, [k]: v }));

  // Persistence
  const toBeo = (): Beo => ({
    id: d.id,
    eventName: d.eventName || "Untitled Event",
    type: d.type,
    date: d.date,
    venue: d.venue,
    host: d.host || "TBD",
    pax: d.pax,
    pkg: d.pkg,
    revenue: d.revenue,
    margin: d.margin,
    advance: d.advance,
    status: d.status,
    // Section detail — round-tripped to the banquet_orders columns.
    startTime: d.startTime,
    endTime: d.endTime,
    vegPax: d.vegPax,
    nonVegPax: d.nonVegPax,
    dietary: d.dietary,
    barPackage: d.barPackage,
    cocktails: d.cocktails,
    avNotes: d.avNotes,
    decorTheme: d.decorTheme,
    decorColor: d.decorColor,
    staffService: d.staffService,
    staffKitchen: d.staffKitchen,
    staffCaptains: d.staffCaptains,
    parking: d.parking,
    security: d.security,
    florist: d.florist,
    photographer: d.photographer,
    ancillary: d.ancillary,
    // List sections → JSON columns.
    courses: d.courses,
    timeline: d.timeline,
    bars: d.bars,
    avEquipment: d.avEquipment,
    decorVendors: d.decorVendors,
    staffing: d.staffing,
    vendors: d.vendors,
    signage: d.signage,
  });

  const marginAmount = d.revenue * d.margin;
  const balance = d.revenue - d.advance;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-stretch justify-center">
      <Card className="w-full h-full max-w-none overflow-hidden rounded-none flex flex-col">
        {/* Creator header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-surface">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-brand to-accent flex items-center justify-center shrink-0">
              <ClipboardList className="h-4.5 w-4.5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">
                {initial ? `Edit ${initial.id} — ${initial.eventName}` : "New Banquet Event Order"}
              </div>
              <div className="text-xs text-muted-foreground tabular">{d.id}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={STATUS_TONE[d.status]}>{STATUS_LABEL[d.status]}</Badge>
            <Button size="sm" variant="ghost" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Body: sidebar + main + right rail */}
        <div className="flex-1 min-h-0 grid grid-cols-[260px_1fr_320px]">
          {/* Sidebar */}
          <div className="border-r border-border bg-surface-sunken/30 overflow-y-auto">
            <div className="p-3 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Sections</div>
            <nav className="px-2 pb-4 space-y-0.5">
              {SECTIONS.map(s => {
                const active = section === s.key;
                const Icon = s.icon;
                return (
                  <button
                    key={s.key}
                    onClick={() => setSection(s.key)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-md flex items-center gap-2.5 transition-colors",
                      active ? "bg-surface border border-border shadow-sm" : "hover:bg-surface/60"
                    )}
                  >
                    <Icon className={cn("h-4 w-4 shrink-0", active ? "text-brand" : "text-muted-foreground")} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{s.label}</div>
                      <div className="text-[11px] text-muted-foreground truncate">{s.sub}</div>
                    </div>
                    {active && <ChevronRight className="h-3.5 w-3.5 text-brand" />}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Main */}
          <div className="overflow-y-auto">
            <div className="p-6 max-w-3xl">
              {section === "basics" && <SectionBasics d={d} set={set} />}
              {section === "timeline" && <SectionTimeline d={d} set={set} showToast={showToast} />}
              {section === "menu" && <SectionMenu d={d} set={set} showToast={showToast} />}
              {section === "beverages" && <SectionBeverages d={d} set={set} showToast={showToast} />}
              {section === "av" && <SectionAV d={d} set={set} showToast={showToast} />}
              {section === "decor" && <SectionDecor d={d} set={set} showToast={showToast} />}
              {section === "staffing" && <SectionStaffing d={d} set={set} />}
              {section === "logistics" && <SectionLogistics d={d} set={set} showToast={showToast} />}
              {section === "vendors" && <SectionVendors d={d} set={set} showToast={showToast} />}
              {section === "billing" && <SectionBilling d={d} set={set} />}
            </div>
          </div>

          {/* Right rail summary */}
          <div className="border-l border-border bg-surface-sunken/30 overflow-y-auto">
            <div className="p-4 space-y-4">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Summary</div>
                <div className="space-y-2.5">
                  <SummaryRow icon={Users} label="Pax" value={String(d.pax)} />
                  <SummaryRow icon={Calendar} label="Date" value={formatBeoDate(d.date)} />
                  <SummaryRow icon={MapPin} label="Venue" value={d.venue || "—"} />
                  <SummaryRow icon={Package} label="Package" value={d.pkg} />
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Financials</div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Revenue</span>
                    <span className="font-semibold tabular">{money(d.revenue)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Margin</span>
                    <span className="tabular">
                      {money(marginAmount)} <span className="text-xs text-muted-foreground">({Math.round(d.margin * 100)}%)</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Advance</span>
                    <span className="tabular text-success">{money(d.advance)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm border-t border-border pt-2 mt-1">
                    <span className="font-medium">Balance due</span>
                    <span className={cn("font-semibold tabular", balance > 0 ? "text-warning" : "text-success")}>
                      {balance > 0 ? money(balance) : "Settled"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Status</div>
                <Select value={d.status} onChange={e => set("status", e.target.value as BeoStatus)}>
                  <option value="draft">Draft</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="in-progress">In-progress</option>
                  <option value="completed">Completed</option>
                </Select>
              </div>

              <div className="border-t border-border pt-4">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Checks</div>
                <div className="space-y-1.5 text-xs">
                  <Check ok={!!d.eventName} label="Event name set" />
                  <Check ok={!!d.host} label="Host details" />
                  <Check ok={d.pax > 0} label="Pax confirmed" />
                  <Check ok={d.revenue > 0} label="Package priced" />
                  <Check ok={!!d.dietary} label="Dietary captured" />
                  <Check ok={!!d.avNotes} label="AV brief documented" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky footer */}
        <div className="border-t border-border bg-surface px-6 py-3 flex items-center justify-between gap-2">
          <div className="text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5" />
              Last edited just now · Auto-save off
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => onPdf(toBeo())}>
              <Download className="h-4 w-4" /> Download PDF
            </Button>
            <Button size="sm" variant="outline" onClick={() => onSendKitchen()}>
              <Send className="h-4 w-4" /> Send to kitchen
            </Button>
            <Button size="sm" variant="outline" onClick={() => onSaveDraft(toBeo())}>
              <FileText className="h-4 w-4" /> Save draft
            </Button>
            <Button size="sm" onClick={() => onApprove(toBeo())}>
              <Lock className="h-4 w-4" /> Approve &amp; lock
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function SummaryRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-auto font-medium truncate">{value}</span>
    </div>
  );
}

function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      {ok
        ? <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
        : <AlertCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
      <span className={ok ? "text-foreground" : "text-muted-foreground"}>{label}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION COMPONENTS

type SectionProps = {
  d: DraftBeo;
  set: <K extends keyof DraftBeo>(k: K, v: DraftBeo[K]) => void;
  showToast?: (m: string) => void;
};

function SectionHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">{sub}</p>
    </div>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

// ── Reusable editable list table ──────────────────────────────────────────────
// Powers every non-menu list section (Timeline, Beverages, AV, Decor, Staffing,
// Vendors, Signage). Each cell is a live input/select bound to a JSON-column row;
// edits/adds/removes flow straight back through `onChange` into the draft, so
// Save draft / Approve persist them to the backend.
type ColDef = {
  key: string;
  label: string;
  type?: "text" | "number";
  width?: string;
  options?: string[];
  placeholder?: string;
};

function EditableTable({
  title, rows, cols, onChange, newRow, addLabel = "Add row",
}: {
  title: string;
  rows: EditableRow[];
  cols: ColDef[];
  onChange: (rows: EditableRow[]) => void;
  newRow: () => EditableRow;
  addLabel?: string;
}) {
  const update = (i: number, key: string, value: string | number) =>
    onChange(rows.map((r, j) => (j === i ? { ...r, [key]: value } : r)));
  const remove = (i: number) => onChange(rows.filter((_, j) => j !== i));
  const add = () => onChange([...rows, newRow()]);

  return (
    <Card className="overflow-hidden mb-5">
      <div className="px-4 py-2 border-b border-border bg-surface-sunken/40 flex items-center justify-between">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</div>
        <Button size="sm" variant="ghost" onClick={add}>
          <Plus className="h-3.5 w-3.5" /> {addLabel}
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface-sunken/20">
            <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
              {cols.map(c => (
                <th key={c.key} className="px-3 py-2 font-medium" style={c.width ? { width: c.width } : undefined}>{c.label}</th>
              ))}
              <th className="px-3 py-2 w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r, i) => (
              <tr key={i}>
                {cols.map(c => (
                  <td key={c.key} className="px-3 py-1.5 align-top">
                    {c.options ? (
                      <Select value={String(r[c.key] ?? "")} onChange={e => update(i, c.key, e.target.value)} className="h-8">
                        {c.options.map(o => <option key={o} value={o}>{o}</option>)}
                      </Select>
                    ) : c.type === "number" ? (
                      <NumberInput value={Number(r[c.key] ?? 0)} onChange={v => update(i, c.key, v)} className="h-8 tabular" />
                    ) : (
                      <Input value={String(r[c.key] ?? "")} placeholder={c.placeholder} onChange={e => update(i, c.key, e.target.value)} className="h-8" />
                    )}
                  </td>
                ))}
                <td className="px-3 py-1.5 text-right">
                  <Button size="sm" variant="ghost" onClick={() => remove(i)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={cols.length + 1} className="px-4 py-6 text-center text-xs text-muted-foreground">
                  Nothing yet — use “{addLabel}”.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// A single Menu course: editable name, removable dish chips, and an inline
// "add a dish" input. Local state holds only the in-progress add text.
function CourseCard({
  course, onRename, onRemove, onAddItem, onRemoveItem,
}: {
  course: Course;
  onRename: (name: string) => void;
  onRemove: () => void;
  onAddItem: (item: string) => void;
  onRemoveItem: (index: number) => void;
}) {
  const [val, setVal] = React.useState("");
  const commit = () => { const t = val.trim(); if (!t) return; onAddItem(t); setVal(""); };
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2 gap-2">
        <Input value={course.name} onChange={e => onRename(e.target.value)} className="h-8 font-medium max-w-xs" placeholder="Course name" />
        <Button size="sm" variant="ghost" onClick={onRemove} title="Remove course">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="flex flex-wrap gap-2 mb-2.5">
        {course.items.map((it, j) => (
          <Badge key={j} tone="neutral" className="gap-1">
            {it}
            <button type="button" onClick={() => onRemoveItem(j)} className="ml-1 opacity-50 hover:opacity-100" aria-label={`Remove ${it}`}>
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        {course.items.length === 0 && <span className="text-xs text-muted-foreground">No items yet.</span>}
      </div>
      <div className="flex items-center gap-2">
        <Input
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); commit(); } }}
          placeholder="Add a dish…"
          className="h-8"
        />
        <Button size="sm" variant="outline" onClick={commit}>
          <Plus className="h-3.5 w-3.5" /> Add
        </Button>
      </div>
    </Card>
  );
}

// 1. BASICS
function SectionBasics({ d, set }: SectionProps) {
  return (
    <div>
      <SectionHeader title="Event basics" sub="Core details that drive every downstream team." />
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Field label="Event name">
            <Input value={d.eventName} onChange={e => set("eventName", e.target.value)} placeholder="e.g. Mehta-Sharma Wedding" />
          </Field>
        </div>
        <Field label="Type">
          <Select value={d.type} onChange={e => set("type", e.target.value as EventType)}>
            <option>Wedding</option>
            <option>Conference</option>
            <option>Birthday</option>
            <option>Cocktail</option>
            <option>Corporate Offsite</option>
            <option>Anniversary</option>
          </Select>
        </Field>
        <Field label="Date">
          <Input type="date" value={d.date} onChange={e => set("date", e.target.value)} />
        </Field>
        <Field label="Venue">
          <Select value={d.venue} onChange={e => set("venue", e.target.value)}>
            <option>Grand Ballroom</option>
            <option>Marina Lawn</option>
            <option>Pearl Hall A</option>
            <option>Pearl Hall B</option>
            <option>Pearl Hall A+B</option>
            <option>Skydeck Terrace</option>
            <option>Garden Pavilion</option>
            <option>Boardroom 1</option>
          </Select>
        </Field>
        <Field label="Host name">
          <Input value={d.host} onChange={e => set("host", e.target.value)} placeholder="e.g. Rajesh Mehta" />
        </Field>
        <Field label="Pax expected">
          <Input
            type="number"
            value={d.pax}
            onChange={e => set("pax", Math.max(0, Number(e.target.value) || 0))}
            className="tabular"
          />
        </Field>
        <Field label="Package">
          <Select value={d.pkg} onChange={e => set("pkg", e.target.value as Package)}>
            <option>Silver</option>
            <option>Gold</option>
            <option>Platinum</option>
            <option>Custom</option>
          </Select>
        </Field>
      </div>
    </div>
  );
}

// 2. TIMELINE
const TIMELINE_TEAMS = ["AV", "Decor", "Kitchen", "F&B", "HK", "Security", "Front", "All"];
function SectionTimeline({ d, set }: SectionProps) {
  return (
    <div>
      <SectionHeader title="Timeline" sub="Call sheet by hour. Every team gets the same single source of truth." />
      <div className="grid grid-cols-2 gap-4 mb-5">
        <Field label="Event start">
          <Input type="time" value={d.startTime} onChange={e => set("startTime", e.target.value)} />
        </Field>
        <Field label="Event end">
          <Input type="time" value={d.endTime} onChange={e => set("endTime", e.target.value)} />
        </Field>
      </div>

      <EditableTable
        title="Run sheet"
        addLabel="Add row"
        rows={d.timeline}
        onChange={rows => set("timeline", rows)}
        newRow={() => ({ time: "12:00", team: "F&B", task: "", lead: "" })}
        cols={[
          { key: "time", label: "Time", width: "96px" },
          { key: "team", label: "Team", width: "130px", options: TIMELINE_TEAMS },
          { key: "task", label: "Task" },
          { key: "lead", label: "Lead" },
        ]}
      />
    </div>
  );
}

// 3. MENU
function SectionMenu({ d, set }: SectionProps) {
  const courses = d.courses;
  const setCourses = (next: Course[]) => set("courses", next);
  const mapCourse = (ci: number, fn: (c: Course) => Course) =>
    setCourses(courses.map((c, i) => (i === ci ? fn(c) : c)));

  const addItem = (ci: number, item: string) => mapCourse(ci, c => ({ ...c, items: [...c.items, item] }));
  const removeItem = (ci: number, ii: number) => mapCourse(ci, c => ({ ...c, items: c.items.filter((_, j) => j !== ii) }));
  const renameCourse = (ci: number, name: string) => mapCourse(ci, c => ({ ...c, name }));
  const removeCourse = (ci: number) => setCourses(courses.filter((_, i) => i !== ci));
  const addCourse = () => setCourses([...courses, { name: "New course", items: [] }]);

  return (
    <div>
      <SectionHeader title="Menu" sub="Multi-course selection with veg / non-veg split and dietary call-outs." />

      <div className="grid grid-cols-3 gap-3 mb-5">
        <Card className="p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Total pax</div>
          <div className="text-xl font-semibold tabular">{d.pax}</div>
        </Card>
        <Card className="p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Veg pax</div>
          <NumberInput value={d.vegPax} onChange={v => set("vegPax", v)} className="tabular h-9 mt-1" />
        </Card>
        <Card className="p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Non-veg pax</div>
          <NumberInput value={d.nonVegPax} onChange={v => set("nonVegPax", v)} className="tabular h-9 mt-1" />
        </Card>
      </div>

      <div className="space-y-3 mb-3">
        {courses.map((c, i) => (
          <CourseCard
            key={i}
            course={c}
            onRename={name => renameCourse(i, name)}
            onRemove={() => removeCourse(i)}
            onAddItem={item => addItem(i, item)}
            onRemoveItem={j => removeItem(i, j)}
          />
        ))}
      </div>

      <Button size="sm" variant="outline" className="mb-5" onClick={addCourse}>
        <Plus className="h-4 w-4" /> Add course
      </Button>

      <Field label="Dietary requirements & allergies" hint="Communicate to kitchen and captains before service.">
        <textarea
          value={d.dietary}
          onChange={e => set("dietary", e.target.value)}
          rows={3}
          placeholder="e.g. 12 Jain, 4 vegan, 2 nut allergies, 8 halal"
          className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-hidden placeholder:text-subtle-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
        />
      </Field>
    </div>
  );
}

// 4. BEVERAGES
function SectionBeverages({ d, set }: SectionProps) {
  return (
    <div>
      <SectionHeader title="Beverages" sub="Bar set-ups, package tier and signature cocktails." />
      <div className="grid grid-cols-2 gap-4 mb-5">
        <Field label="Bar package">
          <Select value={d.barPackage} onChange={e => set("barPackage", e.target.value)}>
            <option value="silver">Silver — IMFL + house wine</option>
            <option value="gold">Gold — premium scotch + import wine</option>
            <option value="platinum">Platinum — single malts + champagne</option>
          </Select>
        </Field>
        <Field label="Service hours">
          <Input defaultValue="19:30 - 23:30" />
        </Field>
      </div>

      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Bar set-ups</div>
      <EditableTable
        title="Bars"
        addLabel="Add bar"
        rows={d.bars}
        onChange={rows => set("bars", rows)}
        newRow={() => ({ name: "", staff: 2, focus: "" })}
        cols={[
          { key: "name", label: "Bar" },
          { key: "staff", label: "Staff", type: "number", width: "96px" },
          { key: "focus", label: "Focus" },
        ]}
      />

      <Field label="Signature cocktails" hint="Listed on table tents and mixologist station">
        <textarea
          value={d.cocktails}
          onChange={e => set("cocktails", e.target.value)}
          rows={3}
          className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-hidden placeholder:text-subtle-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
        />
      </Field>
    </div>
  );
}

// 5. AV
const AV_STATUSES = ["Reserved", "Tested", "Pending"];
function SectionAV({ d, set }: SectionProps) {
  return (
    <div>
      <SectionHeader title="Audio-visual" sub="Sound, lighting, video — coordinate with vendor and in-house tech." />

      <EditableTable
        title="Equipment list"
        addLabel="Add item"
        rows={d.avEquipment}
        onChange={rows => set("avEquipment", rows)}
        newRow={() => ({ item: "", qty: 1, status: "Reserved" })}
        cols={[
          { key: "item", label: "Equipment" },
          { key: "qty", label: "Qty", type: "number", width: "88px" },
          { key: "status", label: "Status", width: "140px", options: AV_STATUSES },
        ]}
      />

      <Field label="AV technical brief" hint="Shared with sound engineer and lighting designer">
        <textarea
          value={d.avNotes}
          onChange={e => set("avNotes", e.target.value)}
          rows={4}
          className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-hidden placeholder:text-subtle-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
        />
      </Field>
    </div>
  );
}

// 6. DECOR
function SectionDecor({ d, set, showToast }: SectionProps) {
  return (
    <div>
      <SectionHeader title="Decor" sub="Theme, palette and vendor coordination." />
      <div className="grid grid-cols-2 gap-4 mb-5">
        <Field label="Theme">
          <Input value={d.decorTheme} onChange={e => set("decorTheme", e.target.value)} placeholder="e.g. Royal Rajasthani" />
        </Field>
        <Field label="Color palette">
          <Input value={d.decorColor} onChange={e => set("decorColor", e.target.value)} placeholder="e.g. Maroon & Gold" />
        </Field>
      </div>

      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Vendor coordination</div>
      <EditableTable
        title="Vendors"
        addLabel="Add vendor"
        rows={d.decorVendors}
        onChange={rows => set("decorVendors", rows)}
        newRow={() => ({ vendor: "", scope: "", loadIn: "09:00", contact: "" })}
        cols={[
          { key: "vendor", label: "Vendor" },
          { key: "scope", label: "Scope" },
          { key: "loadIn", label: "Load-in", width: "96px" },
          { key: "contact", label: "Contact" },
        ]}
      />

      <Button size="sm" variant="outline" onClick={() => showToast?.("Decor moodboard opened")}>
        <Palette className="h-4 w-4" /> Open moodboard
      </Button>
    </div>
  );
}

// 7. STAFFING
function SectionStaffing({ d, set }: SectionProps) {
  return (
    <div>
      <SectionHeader title="Staffing" sub="Service team, captains and kitchen brigade." />

      <div className="grid grid-cols-3 gap-3 mb-5">
        <Card className="p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Service stewards</div>
          <NumberInput value={d.staffService} onChange={v => set("staffService", v)} className="tabular h-9 mt-1" />
        </Card>
        <Card className="p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Captains</div>
          <NumberInput value={d.staffCaptains} onChange={v => set("staffCaptains", v)} className="tabular h-9 mt-1" />
        </Card>
        <Card className="p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Kitchen brigade</div>
          <NumberInput value={d.staffKitchen} onChange={v => set("staffKitchen", v)} className="tabular h-9 mt-1" />
        </Card>
      </div>

      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Service brigade roster</div>
      <EditableTable
        title="Roster"
        addLabel="Add role"
        rows={d.staffing}
        onChange={rows => set("staffing", rows)}
        newRow={() => ({ role: "", count: 1, lead: "" })}
        cols={[
          { key: "role", label: "Role" },
          { key: "count", label: "Count", type: "number", width: "96px" },
          { key: "lead", label: "Lead" },
        ]}
      />
    </div>
  );
}

// 8. LOGISTICS
function SectionLogistics({ d, set }: SectionProps) {
  return (
    <div>
      <SectionHeader title="Logistics" sub="Parking, valet, security and signage." />

      <div className="grid grid-cols-2 gap-4 mb-5">
        <Field label="Parking slots reserved">
          <NumberInput value={d.parking} onChange={v => set("parking", v)} className="tabular" />
        </Field>
        <Field label="Security staff on-site">
          <NumberInput value={d.security} onChange={v => set("security", v)} className="tabular" />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Truck className="h-4 w-4 text-info" />
            <div className="font-medium">Valet</div>
          </div>
          <div className="text-sm text-muted-foreground">Premium valet — front porch + tower B</div>
          <div className="text-xs mt-2">Vendor: <span className="font-medium">Spar Valet Services</span></div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="h-4 w-4 text-danger" />
            <div className="font-medium">Security</div>
          </div>
          <div className="text-sm text-muted-foreground">3 layered checkpoints + VVIP corridor</div>
          <div className="text-xs mt-2">Vendor: <span className="font-medium">SecureForce Pvt Ltd</span></div>
        </Card>
      </div>

      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Signage placement</div>
      <EditableTable
        title="Signage"
        addLabel="Add signage"
        rows={d.signage}
        onChange={rows => set("signage", rows)}
        newRow={() => ({ location: "", signage: "" })}
        cols={[
          { key: "location", label: "Location", width: "220px" },
          { key: "signage", label: "Signage" },
        ]}
      />
    </div>
  );
}

// 9. VENDORS
const VENDOR_STATUSES = ["Confirmed", "Contract sent", "Awaiting PO", "Cancelled"];
function SectionVendors({ d, set }: SectionProps) {
  return (
    <div>
      <SectionHeader title="External vendors" sub="Third parties coordinated by the BEO owner." />

      <div className="grid grid-cols-2 gap-4 mb-5">
        <Field label="Florist">
          <Input value={d.florist} onChange={e => set("florist", e.target.value)} placeholder="e.g. Bloom & Bouquet" />
        </Field>
        <Field label="Photographer / videographer">
          <Input value={d.photographer} onChange={e => set("photographer", e.target.value)} placeholder="e.g. ShaadiClicks Studios" />
        </Field>
      </div>

      <EditableTable
        title="Vendor checklist"
        addLabel="Add vendor"
        rows={d.vendors}
        onChange={rows => set("vendors", rows)}
        newRow={() => ({ vendor: "", service: "", arrival: "12:00", status: "Contract sent" })}
        cols={[
          { key: "vendor", label: "Vendor" },
          { key: "service", label: "Service" },
          { key: "arrival", label: "Arrival", width: "110px" },
          { key: "status", label: "Status", width: "160px", options: VENDOR_STATUSES },
        ]}
      />
    </div>
  );
}

// 10. BILLING
function SectionBilling({ d, set }: SectionProps) {
  const perPaxRate = d.pax > 0 ? d.revenue / d.pax : 0;
  const margin = d.revenue * d.margin;
  const balance = d.revenue - d.advance;

  const ancillary = [
    { item: "Stage & mandap", amount: Math.round(d.revenue * 0.08) },
    { item: "Floral upgrade", amount: Math.round(d.revenue * 0.05) },
    { item: "Premium liquor top-up", amount: Math.round(d.revenue * 0.04) },
    { item: "Valet & security", amount: Math.round(d.revenue * 0.02) },
  ];

  return (
    <div>
      <SectionHeader title="Billing" sub="Package rate, ancillary charges and balance reconciliation." />

      <div className="grid grid-cols-2 gap-4 mb-5">
        <Field label="Total revenue (₹)">
          <Input
            type="number"
            value={d.revenue}
            onChange={e => set("revenue", Math.max(0, Number(e.target.value) || 0))}
            className="tabular"
          />
        </Field>
        <Field label="Advance received (₹)">
          <Input
            type="number"
            value={d.advance}
            onChange={e => set("advance", Math.max(0, Number(e.target.value) || 0))}
            className="tabular"
          />
        </Field>
        <Field label={`Margin (${Math.round(d.margin * 100)}%)`} hint="Drag to adjust target margin">
          <input
            type="range"
            min={0}
            max={60}
            value={Math.round(d.margin * 100)}
            onChange={e => set("margin", Number(e.target.value) / 100)}
            className="w-full"
          />
        </Field>
        <Field label="Per-pax rate" hint="Auto-calculated">
          <Input value={money(perPaxRate)} disabled className="tabular" />
        </Field>
      </div>

      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Ancillary breakdown</div>
      <Card className="overflow-hidden mb-5">
        <table className="w-full text-sm">
          <thead className="bg-surface-sunken/40">
            <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-2 font-medium">Line item</th>
              <th className="px-4 py-2 font-medium text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {ancillary.map((a, i) => (
              <tr key={i}>
                <td className="px-4 py-2">{a.item}</td>
                <td className="px-4 py-2 text-right tabular">{money(a.amount)}</td>
              </tr>
            ))}
            <tr className="bg-surface-sunken/30">
              <td className="px-4 py-2 font-semibold">Subtotal ancillary</td>
              <td className="px-4 py-2 text-right font-semibold tabular">{money(ancillary.reduce((s, a) => s + a.amount, 0))}</td>
            </tr>
          </tbody>
        </table>
      </Card>

      <Card className="p-4">
        <div className="grid grid-cols-4 gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Revenue</div>
            <div className="text-lg font-semibold tabular">{money(d.revenue)}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Margin</div>
            <div className="text-lg font-semibold tabular text-success">{money(margin)}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Advance</div>
            <div className="text-lg font-semibold tabular">{money(d.advance)}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Balance due</div>
            <div className={cn("text-lg font-semibold tabular", balance > 0 ? "text-warning" : "text-success")}>
              {balance > 0 ? money(balance) : "Settled"}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

// Map a backend row -> UI Beo. The human number (beoNo) becomes `id` so every
// existing `{b.id}` render and `x.id === b.id` comparison stays byte-identical;
// the numeric PK is carried on `_pk` for PUT/DELETE URLs.
function rowToBeo(r: BeoRow): Beo {
  return { ...r, id: r.beoNo, beoNo: r.beoNo, _pk: r.id };
}

function formatBeoDate(iso: string) {
  try {
    const dt = new Date(iso);
    return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

// Escape a value for a CSV cell (quote if it contains a comma/quote/newline).
function csvCell(v: unknown): string {
  const s = String(v ?? "");
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Trigger a browser download of an in-memory string as a file.
function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Open a printable BEO sheet in a new window and invoke the browser's print
// dialog (users can "Save as PDF"). Uses whatever section data the row carries.
function printBeo(b: Beo) {
  const esc = (s: unknown) =>
    String(s ?? "").replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string));
  const balance = b.revenue - b.advance;
  const courses = b.courses ?? [];
  const timeline = b.timeline ?? [];
  const block = (title: string, body: string) => (body ? `<h2>${esc(title)}</h2>${body}` : "");
  const coursesHtml = courses.length
    ? `<ul>${courses.map(c => `<li><b>${esc(c.name)}:</b> ${esc(c.items.join(", "))}</li>`).join("")}</ul>`
    : "";
  const timelineHtml = timeline.length
    ? `<table><thead><tr><th>Time</th><th>Team</th><th>Task</th><th>Lead</th></tr></thead><tbody>${timeline
        .map(r => `<tr><td>${esc(r.time)}</td><td>${esc(r.team)}</td><td>${esc(r.task)}</td><td>${esc(r.lead)}</td></tr>`)
        .join("")}</tbody></table>`
    : "";
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(b.id)} — ${esc(b.eventName)}</title>
    <style>
      body{font-family:system-ui,'Segoe UI',Arial,sans-serif;color:#111;margin:32px}
      h1{margin:0 0 4px;font-size:22px}
      .muted{color:#666;font-size:13px}
      h2{font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:#444;border-bottom:1px solid #ddd;padding-bottom:4px;margin:22px 0 10px}
      table{border-collapse:collapse;width:100%;font-size:13px}
      th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}
      .grid{display:grid;grid-template-columns:repeat(2,1fr);gap:6px 24px;font-size:13px;margin-top:8px}
      .grid span{color:#666}
      ul{font-size:13px;padding-left:18px}
    </style></head><body>
    <h1>${esc(b.eventName)}</h1>
    <div class="muted">${esc(b.id)} · ${esc(b.type)} · ${esc(formatBeoDate(b.date))} · ${esc(b.venue)}</div>
    <div class="grid">
      <div><span>Host:</span> ${esc(b.host)}</div>
      <div><span>Pax:</span> ${esc(b.pax)}</div>
      <div><span>Package:</span> ${esc(b.pkg)}</div>
      <div><span>Status:</span> ${esc(STATUS_LABEL[b.status])}</div>
      <div><span>Revenue:</span> ₹${esc(b.revenue.toLocaleString("en-IN"))}</div>
      <div><span>Advance:</span> ₹${esc(b.advance.toLocaleString("en-IN"))}</div>
      <div><span>Balance:</span> ${balance > 0 ? "₹" + balance.toLocaleString("en-IN") : "Settled"}</div>
    </div>
    ${block("Menu", coursesHtml)}
    ${block("Run sheet", timelineHtml)}
  </body></html>`;
  const w = window.open("", "_blank");
  if (!w) return; // popup blocked — nothing to print
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
}
