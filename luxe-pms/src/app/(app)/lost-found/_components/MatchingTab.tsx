"use client";
import * as React from "react";
import {
  Info,
  Sparkles,
  CheckCircle2,
  XCircle,
  Search,
  Target,
  TrendingUp,
  Trophy,
  Image as ImageIcon,
  Eye,
  GitCompareArrows,
  StickyNote,
  X,
  MapPin,
  Calendar,
  Tag,
  Palette,
  Building2,
  User,
  AlertTriangle,
  Package,
  ArrowRight,
  Check,
  Camera,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn, money } from "@/lib/utils";

type ToneType = "neutral" | "brand" | "success" | "warning" | "danger" | "info" | "accent";

type Urgency = "High" | "Medium" | "Low";

type LostReport = {
  id: string;
  guest: string;
  room: string;
  stayDates: string;
  itemName: string;
  category: string;
  description: string;
  color: string;
  brand: string;
  location: string;
  reportedAt: string;
  urgency: Urgency;
  hasPhoto: boolean;
  contact: string;
};

type FoundItem = {
  id: string;
  name: string;
  category: string;
  value: number;
  color: string;
  brand: string;
  foundLocation: string;
  foundDate: string;
  foundRoom: string;
  description: string;
  hvi: boolean;
};

type MatchRow = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  lost: string;
  found: string;
  matched: boolean;
};

type Candidate = {
  foundItem: FoundItem;
  score: number;
  rows: MatchRow[];
};

const URGENCY_TONE: Record<Urgency, ToneType> = {
  High: "danger",
  Medium: "warning",
  Low: "neutral",
};

// ---- SEED DATA ----
const LOST_REPORTS: LostReport[] = [
  {
    id: "LR-2814",
    guest: "Mr. Rohit Sharma",
    room: "1208",
    stayDates: "28 May - 31 May 2026",
    itemName: "Gold-rimmed sunglasses",
    category: "Eyewear",
    description: "Aviator style with brown gradient lenses, gold metal frame, slight scratch on left lens",
    color: "Gold / Brown",
    brand: "Ray-Ban",
    location: "Likely pool deck or Azure restaurant",
    reportedAt: "01 Jun, 09:14",
    urgency: "High",
    hasPhoto: true,
    contact: "+91 98201 44782",
  },
  {
    id: "LR-2817",
    guest: "Anjali Iyer",
    room: "0742",
    stayDates: "30 May - 01 Jun 2026",
    itemName: "Silver charm bracelet",
    category: "Jewellery",
    description: "Delicate silver chain with three small charms - a star, a heart and an elephant. Sentimental value.",
    color: "Silver",
    brand: "Tanishq",
    location: "Spa changing room or guest room bathroom",
    reportedAt: "01 Jun, 16:42",
    urgency: "High",
    hasPhoto: true,
    contact: "+91 99304 22019",
  },
  {
    id: "LR-2819",
    guest: "Karan Mehta",
    room: "1503",
    stayDates: "29 May - 02 Jun 2026",
    itemName: "Black leather wallet",
    category: "Personal",
    description: "Bi-fold black leather wallet with stitching, contained business cards and a transit pass",
    color: "Black",
    brand: "Hidesign",
    location: "Lobby bar or executive lounge",
    reportedAt: "02 Jun, 08:05",
    urgency: "Medium",
    hasPhoto: false,
    contact: "+91 98677 31550",
  },
];

const CANDIDATES_BY_REPORT: Record<string, Candidate[]> = {
  "LR-2814": [
    {
      score: 92,
      foundItem: {
        id: "FI-9921",
        name: "Ray-Ban gold aviators",
        category: "Eyewear",
        value: 14500,
        color: "Gold / Brown",
        brand: "Ray-Ban",
        foundLocation: "Pool deck - cabana 4",
        foundDate: "31 May, 18:20",
        foundRoom: "Near 1208",
        description: "Gold frame aviators with brown gradient lenses, light scratch on one lens. Found on lounger.",
        hvi: true,
      },
      rows: [
        { label: "Room number", icon: Building2, lost: "1208", found: "Near 1208", matched: true },
        { label: "Stay dates", icon: Calendar, lost: "28-31 May", found: "Found 31 May", matched: true },
        { label: "Item category", icon: Tag, lost: "Eyewear", found: "Eyewear", matched: true },
        { label: "Location", icon: MapPin, lost: "Pool deck", found: "Pool deck", matched: true },
        { label: "Color", icon: Palette, lost: "Gold / Brown", found: "Gold / Brown", matched: true },
        { label: "Brand", icon: Tag, lost: "Ray-Ban", found: "Ray-Ban", matched: true },
      ],
    },
    {
      score: 74,
      foundItem: {
        id: "FI-9908",
        name: "Aviator sunglasses (unbranded)",
        category: "Eyewear",
        value: 2200,
        color: "Gold / Green",
        brand: "Unmarked",
        foundLocation: "Azure restaurant - table 12",
        foundDate: "30 May, 21:45",
        foundRoom: "—",
        description: "Aviator sunglasses, gold frame with green tinted lenses. No visible brand mark.",
        hvi: false,
      },
      rows: [
        { label: "Room number", icon: Building2, lost: "1208", found: "Unknown", matched: false },
        { label: "Stay dates", icon: Calendar, lost: "28-31 May", found: "Found 30 May", matched: true },
        { label: "Item category", icon: Tag, lost: "Eyewear", found: "Eyewear", matched: true },
        { label: "Location", icon: MapPin, lost: "Azure restaurant", found: "Azure restaurant", matched: true },
        { label: "Color", icon: Palette, lost: "Gold / Brown", found: "Gold / Green", matched: false },
        { label: "Brand", icon: Tag, lost: "Ray-Ban", found: "Unmarked", matched: false },
      ],
    },
    {
      score: 58,
      foundItem: {
        id: "FI-9885",
        name: "Reading glasses with case",
        category: "Eyewear",
        value: 1800,
        color: "Black / Gold trim",
        brand: "Titan Eye+",
        foundLocation: "Executive lounge - 14F",
        foundDate: "29 May, 11:30",
        foundRoom: "—",
        description: "Black acetate frame with gold trim. Includes hard case.",
        hvi: false,
      },
      rows: [
        { label: "Room number", icon: Building2, lost: "1208", found: "Unknown", matched: false },
        { label: "Stay dates", icon: Calendar, lost: "28-31 May", found: "Found 29 May", matched: true },
        { label: "Item category", icon: Tag, lost: "Eyewear", found: "Eyewear", matched: true },
        { label: "Location", icon: MapPin, lost: "Pool deck", found: "Executive lounge", matched: false },
        { label: "Color", icon: Palette, lost: "Gold / Brown", found: "Black / Gold trim", matched: false },
        { label: "Brand", icon: Tag, lost: "Ray-Ban", found: "Titan Eye+", matched: false },
      ],
    },
    {
      score: 41,
      foundItem: {
        id: "FI-9842",
        name: "Sports sunglasses",
        category: "Eyewear",
        value: 3400,
        color: "Black / Red",
        brand: "Oakley",
        foundLocation: "Gym - reception",
        foundDate: "27 May, 07:10",
        foundRoom: "—",
        description: "Wraparound sports sunglasses, found on weights bench.",
        hvi: false,
      },
      rows: [
        { label: "Room number", icon: Building2, lost: "1208", found: "Unknown", matched: false },
        { label: "Stay dates", icon: Calendar, lost: "28-31 May", found: "Found 27 May", matched: false },
        { label: "Item category", icon: Tag, lost: "Eyewear", found: "Eyewear", matched: true },
        { label: "Location", icon: MapPin, lost: "Pool deck", found: "Gym", matched: false },
        { label: "Color", icon: Palette, lost: "Gold / Brown", found: "Black / Red", matched: false },
        { label: "Brand", icon: Tag, lost: "Ray-Ban", found: "Oakley", matched: false },
      ],
    },
  ],
  "LR-2817": [
    {
      score: 88,
      foundItem: {
        id: "FI-9930",
        name: "Silver charm bracelet",
        category: "Jewellery",
        value: 18900,
        color: "Silver",
        brand: "Tanishq",
        foundLocation: "Spa - women's changing room",
        foundDate: "01 Jun, 14:20",
        foundRoom: "Near 0742",
        description: "Delicate silver chain with charms (star, heart, elephant). Hallmark visible.",
        hvi: true,
      },
      rows: [
        { label: "Room number", icon: Building2, lost: "0742", found: "Near 0742", matched: true },
        { label: "Stay dates", icon: Calendar, lost: "30 May-01 Jun", found: "Found 01 Jun", matched: true },
        { label: "Item category", icon: Tag, lost: "Jewellery", found: "Jewellery", matched: true },
        { label: "Location", icon: MapPin, lost: "Spa changing room", found: "Spa changing room", matched: true },
        { label: "Color", icon: Palette, lost: "Silver", found: "Silver", matched: true },
        { label: "Brand", icon: Tag, lost: "Tanishq", found: "Tanishq", matched: true },
      ],
    },
    {
      score: 67,
      foundItem: {
        id: "FI-9925",
        name: "Silver chain bracelet",
        category: "Jewellery",
        value: 6200,
        color: "Silver",
        brand: "Unmarked",
        foundLocation: "Guest room 0738 - housekeeping",
        foundDate: "01 Jun, 11:15",
        foundRoom: "0738",
        description: "Plain silver chain bracelet, no charms attached. Clasp slightly bent.",
        hvi: false,
      },
      rows: [
        { label: "Room number", icon: Building2, lost: "0742", found: "0738", matched: false },
        { label: "Stay dates", icon: Calendar, lost: "30 May-01 Jun", found: "Found 01 Jun", matched: true },
        { label: "Item category", icon: Tag, lost: "Jewellery", found: "Jewellery", matched: true },
        { label: "Location", icon: MapPin, lost: "Spa / Room bath", found: "Guest room", matched: true },
        { label: "Color", icon: Palette, lost: "Silver", found: "Silver", matched: true },
        { label: "Brand", icon: Tag, lost: "Tanishq", found: "Unmarked", matched: false },
      ],
    },
    {
      score: 49,
      foundItem: {
        id: "FI-9912",
        name: "Gold-plated bangle",
        category: "Jewellery",
        value: 9800,
        color: "Gold",
        brand: "Malabar Gold",
        foundLocation: "Lobby - sofa area",
        foundDate: "30 May, 19:50",
        foundRoom: "—",
        description: "Single gold-plated bangle with floral engraving.",
        hvi: true,
      },
      rows: [
        { label: "Room number", icon: Building2, lost: "0742", found: "Unknown", matched: false },
        { label: "Stay dates", icon: Calendar, lost: "30 May-01 Jun", found: "Found 30 May", matched: true },
        { label: "Item category", icon: Tag, lost: "Jewellery", found: "Jewellery", matched: true },
        { label: "Location", icon: MapPin, lost: "Spa / Room", found: "Lobby", matched: false },
        { label: "Color", icon: Palette, lost: "Silver", found: "Gold", matched: false },
        { label: "Brand", icon: Tag, lost: "Tanishq", found: "Malabar Gold", matched: false },
      ],
    },
  ],
  "LR-2819": [
    {
      score: 71,
      foundItem: {
        id: "FI-9938",
        name: "Black bi-fold wallet",
        category: "Personal",
        value: 4500,
        color: "Black",
        brand: "Hidesign",
        foundLocation: "Lobby bar - booth 3",
        foundDate: "02 Jun, 00:45",
        foundRoom: "—",
        description: "Black leather bi-fold wallet with visible stitching. Empty card slots, no ID found inside.",
        hvi: false,
      },
      rows: [
        { label: "Room number", icon: Building2, lost: "1503", found: "Unknown", matched: false },
        { label: "Stay dates", icon: Calendar, lost: "29 May-02 Jun", found: "Found 02 Jun", matched: true },
        { label: "Item category", icon: Tag, lost: "Personal", found: "Personal", matched: true },
        { label: "Location", icon: MapPin, lost: "Lobby bar", found: "Lobby bar", matched: true },
        { label: "Color", icon: Palette, lost: "Black", found: "Black", matched: true },
        { label: "Brand", icon: Tag, lost: "Hidesign", found: "Hidesign", matched: true },
      ],
    },
    {
      score: 52,
      foundItem: {
        id: "FI-9933",
        name: "Brown card-holder",
        category: "Personal",
        value: 2100,
        color: "Brown",
        brand: "Unmarked",
        foundLocation: "Executive lounge - 14F",
        foundDate: "01 Jun, 18:30",
        foundRoom: "—",
        description: "Slim brown leather card-holder, two cards inside.",
        hvi: false,
      },
      rows: [
        { label: "Room number", icon: Building2, lost: "1503", found: "Unknown", matched: false },
        { label: "Stay dates", icon: Calendar, lost: "29 May-02 Jun", found: "Found 01 Jun", matched: true },
        { label: "Item category", icon: Tag, lost: "Personal", found: "Personal", matched: true },
        { label: "Location", icon: MapPin, lost: "Executive lounge", found: "Executive lounge", matched: true },
        { label: "Color", icon: Palette, lost: "Black", found: "Brown", matched: false },
        { label: "Brand", icon: Tag, lost: "Hidesign", found: "Unmarked", matched: false },
      ],
    },
    {
      score: 38,
      foundItem: {
        id: "FI-9920",
        name: "Coin purse",
        category: "Personal",
        value: 800,
        color: "Tan",
        brand: "Unmarked",
        foundLocation: "Banquet hall - Diamond",
        foundDate: "30 May, 22:10",
        foundRoom: "—",
        description: "Small tan coin purse, zipper intact, contained loose change.",
        hvi: false,
      },
      rows: [
        { label: "Room number", icon: Building2, lost: "1503", found: "Unknown", matched: false },
        { label: "Stay dates", icon: Calendar, lost: "29 May-02 Jun", found: "Found 30 May", matched: true },
        { label: "Item category", icon: Tag, lost: "Personal", found: "Personal", matched: true },
        { label: "Location", icon: MapPin, lost: "Lobby bar", found: "Banquet hall", matched: false },
        { label: "Color", icon: Palette, lost: "Black", found: "Tan", matched: false },
        { label: "Brand", icon: Tag, lost: "Hidesign", found: "Unmarked", matched: false },
      ],
    },
  ],
};

const RECENT_CONFIRMED = [
  {
    id: "MC-1184",
    lostId: "LR-2806",
    foundId: "FI-9874",
    item: "Apple AirPods Pro",
    guest: "Priya Krishnan",
    returnedOn: "31 May, 17:20",
  },
  {
    id: "MC-1183",
    lostId: "LR-2803",
    foundId: "FI-9861",
    item: "Pearl drop earrings",
    guest: "Meera Nambiar",
    returnedOn: "30 May, 14:05",
  },
  {
    id: "MC-1182",
    lostId: "LR-2798",
    foundId: "FI-9858",
    item: "Mont Blanc fountain pen",
    guest: "Vikram Joshi",
    returnedOn: "29 May, 12:40",
  },
  {
    id: "MC-1181",
    lostId: "LR-2795",
    foundId: "FI-9850",
    item: "Cashmere shawl",
    guest: "Sunita Reddy",
    returnedOn: "28 May, 19:15",
  },
];

function scoreTone(score: number): { tone: ToneType; label: string; bar: string } {
  if (score >= 80) return { tone: "success", label: "Strong match", bar: "bg-emerald-500" };
  if (score >= 60) return { tone: "warning", label: "Possible match", bar: "bg-amber-500" };
  return { tone: "neutral", label: "Weak match", bar: "bg-muted-foreground/50" };
}

export default function MatchingTab({ onToast }: { onToast: (m: string) => void }) {
  const [selectedReportId, setSelectedReportId] = React.useState<string>(LOST_REPORTS[0].id);
  const [search, setSearch] = React.useState("");
  const [drawerItem, setDrawerItem] = React.useState<FoundItem | null>(null);
  const [compareItem, setCompareItem] = React.useState<{ lost: LostReport; found: FoundItem } | null>(null);
  const [notesFor, setNotesFor] = React.useState<FoundItem | null>(null);
  const [notesText, setNotesText] = React.useState("");

  const selected = LOST_REPORTS.find((r) => r.id === selectedReportId)!;
  const allCandidates = CANDIDATES_BY_REPORT[selectedReportId] ?? [];
  const candidates = search.trim()
    ? allCandidates.filter((c) => {
        const q = search.toLowerCase();
        return (
          c.foundItem.name.toLowerCase().includes(q) ||
          c.foundItem.brand.toLowerCase().includes(q) ||
          c.foundItem.color.toLowerCase().includes(q) ||
          c.foundItem.foundLocation.toLowerCase().includes(q) ||
          c.foundItem.description.toLowerCase().includes(q)
        );
      })
    : allCandidates;

  return (
    <div className="space-y-4">
      {/* EXPLAINER BANNER */}
      <Card className="p-4 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900">
        <div className="flex items-start gap-3">
          <div className="size-9 rounded-md bg-blue-100 dark:bg-blue-900/50 grid place-items-center shrink-0">
            <Info className="size-4 text-blue-600 dark:text-blue-300" />
          </div>
          <div className="space-y-1">
            <div className="text-sm font-semibold text-foreground flex items-center gap-2">
              How smart matching works
              <Badge tone="info">AI-assisted</Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Auto-match scores compare room/stay dates, item category, location, color, brand, and description keywords. Review and confirm matches to notify guests.
            </p>
          </div>
        </div>
      </Card>

      {/* STATS STRIP */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="flex items-start gap-3">
            <div className="size-9 rounded-md bg-brand-soft text-brand grid place-items-center shrink-0">
              <Target className="size-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Possible matches today</div>
              <div className="text-xl font-bold tabular text-foreground mt-0.5">14</div>
              <div className="text-[11px] text-muted-foreground">across 9 active reports</div>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-start gap-3">
            <div className="size-9 rounded-md bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 grid place-items-center shrink-0">
              <CheckCircle2 className="size-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Confirmed this week</div>
              <div className="text-xl font-bold tabular text-foreground mt-0.5">23</div>
              <div className="text-[11px] text-muted-foreground">+5 vs last week</div>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-start gap-3">
            <div className="size-9 rounded-md bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 grid place-items-center shrink-0">
              <TrendingUp className="size-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Avg match score</div>
              <div className="text-xl font-bold tabular text-foreground mt-0.5">72%</div>
              <div className="text-[11px] text-muted-foreground">past 30 days</div>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-start gap-3">
            <div className="size-9 rounded-md bg-linear-to-br from-amber-400 to-orange-500 text-white grid place-items-center shrink-0">
              <Trophy className="size-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Returns from matches</div>
              <div className="text-xl font-bold tabular text-foreground mt-0.5">68</div>
              <div className="text-[11px] text-muted-foreground">YTD · 81% success</div>
            </div>
          </div>
        </Card>
      </div>

      {/* MAIN 2-PANE LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        {/* LEFT — Lost reports list */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-foreground">Active lost reports</div>
            <Badge tone="info">{LOST_REPORTS.length}</Badge>
          </div>
          <div className="space-y-2">
            {LOST_REPORTS.map((r) => {
              const active = r.id === selectedReportId;
              const count = CANDIDATES_BY_REPORT[r.id]?.length ?? 0;
              return (
                <button
                  key={r.id}
                  onClick={() => setSelectedReportId(r.id)}
                  className={cn(
                    "w-full text-left rounded-md border transition-colors",
                    active
                      ? "border-brand bg-brand-soft/50"
                      : "border-border bg-surface hover:bg-surface-sunken/60",
                  )}
                >
                  <div className="p-3 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] tabular text-muted-foreground font-medium">{r.id}</span>
                      <Badge tone={URGENCY_TONE[r.urgency]}>{r.urgency}</Badge>
                    </div>
                    <div className="text-sm font-semibold text-foreground line-clamp-1">{r.itemName}</div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                      <User className="size-3" />
                      <span className="truncate">{r.guest}</span>
                      <span className="text-border">·</span>
                      <span className="tabular">Rm {r.room}</span>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{r.reportedAt}</span>
                      <span className="text-[11px] font-medium text-brand flex items-center gap-1">
                        <Sparkles className="size-3" />
                        {count} matches
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT — Selected report + candidates */}
        <div className="space-y-4">
          {/* SELECTED LOST REPORT CARD */}
          <Card className="p-4">
            <div className="flex items-start gap-4">
              {/* Photo placeholder */}
              <div className="size-20 rounded-md bg-surface-sunken grid place-items-center shrink-0 border border-border">
                {selected.hasPhoto ? (
                  <ImageIcon className="size-7 text-muted-foreground" />
                ) : (
                  <Camera className="size-7 text-muted-foreground/50" />
                )}
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge tone="info">{selected.id}</Badge>
                  <Badge tone={URGENCY_TONE[selected.urgency]}>
                    <AlertTriangle className="size-3 mr-1" />
                    {selected.urgency} urgency
                  </Badge>
                  <Badge tone="neutral">{selected.category}</Badge>
                </div>
                <div className="text-base font-semibold text-foreground">{selected.itemName}</div>
                <div className="text-sm text-muted-foreground line-clamp-2">{selected.description}</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-border">
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Guest</div>
                    <div className="text-xs font-medium text-foreground mt-0.5 truncate">{selected.guest}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Room</div>
                    <div className="text-xs font-medium text-foreground mt-0.5 tabular">{selected.room}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Stay</div>
                    <div className="text-xs font-medium text-foreground mt-0.5">{selected.stayDates}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Reported</div>
                    <div className="text-xs font-medium text-foreground mt-0.5">{selected.reportedAt}</div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Find matches search */}
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Type keywords to filter beyond auto-matches (e.g. 'aviator', 'gold', 'pool')"
                  className="pl-9"
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  onToast(`Searching found items for "${search || "all keywords"}"`);
                }}
              >
                <Search className="size-3.5 mr-1.5" />
                Find
              </Button>
            </div>
          </Card>

          {/* MATCH CANDIDATES */}
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="size-4 text-brand" />
              Ranked candidates
              <Badge tone="neutral">{candidates.length}</Badge>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="inline-block size-2 rounded-full bg-emerald-500" />
                Strong 80+
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block size-2 rounded-full bg-amber-500" />
                Possible 60-79
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block size-2 rounded-full bg-muted-foreground/50" />
                Weak {"<60"}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {candidates.length === 0 ? (
              <Card className="p-8 text-center">
                <Package className="size-10 text-muted-foreground/40 mx-auto mb-2" />
                <div className="text-sm font-medium text-foreground">No candidates match your filter</div>
                <div className="text-xs text-muted-foreground mt-1">Try clearing the search or pick a different lost report.</div>
              </Card>
            ) : (
              candidates.map((c) => {
                const tone = scoreTone(c.score);
                const matchedCount = c.rows.filter((r) => r.matched).length;
                return (
                  <Card key={c.foundItem.id} className="p-4 space-y-3">
                    {/* Header row */}
                    <div className="flex items-start gap-4">
                      <div
                        className={cn(
                          "size-16 rounded-md grid place-items-center shrink-0 border",
                          c.foundItem.hvi
                            ? "bg-linear-to-br from-amber-400 to-orange-500 border-transparent text-white"
                            : "bg-surface-sunken border-border",
                        )}
                      >
                        <ImageIcon className={cn("size-6", c.foundItem.hvi ? "text-white" : "text-muted-foreground")} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] tabular text-muted-foreground font-medium">{c.foundItem.id}</span>
                          <Badge tone="neutral">{c.foundItem.category}</Badge>
                          {c.foundItem.hvi && (
                            <Badge tone="warning">
                              <Trophy className="size-3 mr-1" />
                              HVI
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm font-semibold text-foreground mt-1">{c.foundItem.name}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <MapPin className="size-3" />
                            {c.foundItem.foundLocation}
                          </span>
                          <span className="tabular font-medium text-foreground">{money(c.foundItem.value)}</span>
                        </div>
                      </div>
                      {/* Score */}
                      <div className="text-right shrink-0">
                        <div className="text-2xl font-bold tabular text-foreground">{c.score}%</div>
                        <Badge tone={tone.tone}>{tone.label}</Badge>
                      </div>
                    </div>

                    {/* Score bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>{matchedCount} of 6 attributes match</span>
                        <span className="tabular">{c.score}/100</span>
                      </div>
                      <div className="h-2 rounded-full bg-surface-sunken overflow-hidden">
                        <div className={cn("h-full rounded-full", tone.bar)} style={{ width: `${c.score}%` }} />
                      </div>
                    </div>

                    {/* Match breakdown table */}
                    <Card className="overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-surface-sunken/40">
                          <tr>
                            <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Attribute</th>
                            <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Lost report</th>
                            <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Found item</th>
                            <th className="text-right px-3 py-2 text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Match</th>
                          </tr>
                        </thead>
                        <tbody>
                          {c.rows.map((row, idx) => {
                            const Icon = row.icon;
                            return (
                              <tr key={idx} className="border-t border-border">
                                <td className="px-3 py-2">
                                  <div className="flex items-center gap-2 text-xs text-foreground">
                                    <Icon className="size-3.5 text-muted-foreground" />
                                    {row.label}
                                  </div>
                                </td>
                                <td className="px-3 py-2 text-xs text-muted-foreground">{row.lost}</td>
                                <td className="px-3 py-2 text-xs text-muted-foreground">{row.found}</td>
                                <td className="px-3 py-2 text-right">
                                  {row.matched ? (
                                    <CheckCircle2 className="size-4 text-emerald-500 inline-block" />
                                  ) : (
                                    <XCircle className="size-4 text-muted-foreground/60 inline-block" />
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </Card>

                    {/* Actions */}
                    <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Button size="sm" variant="ghost" onClick={() => setDrawerItem(c.foundItem)}>
                          <Eye className="size-3.5 mr-1.5" />
                          View full item
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setCompareItem({ lost: selected, found: c.foundItem })}>
                          <GitCompareArrows className="size-3.5 mr-1.5" />
                          Compare photos
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setNotesFor(c.foundItem);
                            setNotesText("");
                          }}
                        >
                          <StickyNote className="size-3.5 mr-1.5" />
                          Add notes
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onToast(`${c.foundItem.id} rejected as match for ${selected.id}`)}
                        >
                          <XCircle className="size-3.5 mr-1.5" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          onClick={() =>
                            onToast(`Match confirmed · ${selected.guest} notified about "${c.foundItem.name}"`)
                          }
                        >
                          <Check className="size-3.5 mr-1.5" />
                          Confirm match
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>

          {/* RECENT CONFIRMED MATCHES */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-500" />
                Recent confirmed matches
              </div>
              <Button size="sm" variant="ghost" onClick={() => onToast("Opening full match history")}>View all</Button>
            </div>
            <div className="space-y-2">
              {RECENT_CONFIRMED.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-3 p-2.5 rounded-md bg-surface-sunken/40 border border-border"
                >
                  <div className="size-8 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 grid place-items-center shrink-0">
                    <Check className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{m.item}</div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                      <span className="tabular">{m.lostId}</span>
                      <ArrowRight className="size-3" />
                      <span className="tabular">{m.foundId}</span>
                      <span className="text-border">·</span>
                      <span className="truncate">{m.guest}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge tone="success">Returned</Badge>
                    <div className="text-[10px] text-muted-foreground mt-1 tabular">{m.returnedOn}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* DRAWER — full found item */}
      {drawerItem && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-stretch justify-end">
          <Card className="w-full max-w-xl overflow-y-auto rounded-none">
            <div className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] tabular text-muted-foreground font-medium">{drawerItem.id}</div>
                  <div className="text-lg font-semibold text-foreground mt-0.5">{drawerItem.name}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge tone="neutral">{drawerItem.category}</Badge>
                    {drawerItem.hvi && <Badge tone="warning">HVI · {money(drawerItem.value)}</Badge>}
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setDrawerItem(null)}>
                  <X className="size-4" />
                </Button>
              </div>

              <div
                className={cn(
                  "aspect-video rounded-md grid place-items-center border",
                  drawerItem.hvi
                    ? "bg-linear-to-br from-amber-400 to-orange-500 border-transparent"
                    : "bg-surface-sunken border-border",
                )}
              >
                <ImageIcon className={cn("size-10", drawerItem.hvi ? "text-white" : "text-muted-foreground")} />
              </div>

              <div className="space-y-3">
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Description</div>
                  <div className="text-sm text-foreground mt-1">{drawerItem.description}</div>
                </div>

                <Card className="overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-surface-sunken/40">
                      <tr>
                        <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Attribute</th>
                        <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t border-border">
                        <td className="px-3 py-2 text-xs text-muted-foreground">Brand</td>
                        <td className="px-3 py-2 text-xs font-medium text-foreground">{drawerItem.brand}</td>
                      </tr>
                      <tr className="border-t border-border">
                        <td className="px-3 py-2 text-xs text-muted-foreground">Color</td>
                        <td className="px-3 py-2 text-xs font-medium text-foreground">{drawerItem.color}</td>
                      </tr>
                      <tr className="border-t border-border">
                        <td className="px-3 py-2 text-xs text-muted-foreground">Found at</td>
                        <td className="px-3 py-2 text-xs font-medium text-foreground">{drawerItem.foundLocation}</td>
                      </tr>
                      <tr className="border-t border-border">
                        <td className="px-3 py-2 text-xs text-muted-foreground">Found on</td>
                        <td className="px-3 py-2 text-xs font-medium text-foreground">{drawerItem.foundDate}</td>
                      </tr>
                      <tr className="border-t border-border">
                        <td className="px-3 py-2 text-xs text-muted-foreground">Nearest room</td>
                        <td className="px-3 py-2 text-xs font-medium text-foreground tabular">{drawerItem.foundRoom}</td>
                      </tr>
                      <tr className="border-t border-border">
                        <td className="px-3 py-2 text-xs text-muted-foreground">Declared value</td>
                        <td className="px-3 py-2 text-xs font-medium text-foreground tabular">{money(drawerItem.value)}</td>
                      </tr>
                    </tbody>
                  </table>
                </Card>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button size="sm" variant="outline" onClick={() => setDrawerItem(null)}>
                  Close
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    onToast(`Match confirmed for ${drawerItem.name} · guest notify queued`);
                    setDrawerItem(null);
                  }}
                >
                  <Check className="size-3.5 mr-1.5" />
                  Confirm as match
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* MODAL — compare photos */}
      {compareItem && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                <GitCompareArrows className="size-4 text-brand" />
                Compare photos
              </div>
              <Button size="sm" variant="ghost" onClick={() => setCompareItem(null)}>
                <X className="size-4" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Badge tone="info">Lost report</Badge>
                  <span className="text-[11px] tabular text-muted-foreground">{compareItem.lost.id}</span>
                </div>
                <div className="aspect-square rounded-md bg-surface-sunken grid place-items-center border border-border">
                  <ImageIcon className="size-10 text-muted-foreground" />
                </div>
                <div className="text-xs font-semibold text-foreground">{compareItem.lost.itemName}</div>
                <div className="text-[11px] text-muted-foreground line-clamp-3">{compareItem.lost.description}</div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Badge tone="success">Found item</Badge>
                  <span className="text-[11px] tabular text-muted-foreground">{compareItem.found.id}</span>
                </div>
                <div
                  className={cn(
                    "aspect-square rounded-md grid place-items-center border",
                    compareItem.found.hvi
                      ? "bg-linear-to-br from-amber-400 to-orange-500 border-transparent"
                      : "bg-surface-sunken border-border",
                  )}
                >
                  <ImageIcon className={cn("size-10", compareItem.found.hvi ? "text-white" : "text-muted-foreground")} />
                </div>
                <div className="text-xs font-semibold text-foreground">{compareItem.found.name}</div>
                <div className="text-[11px] text-muted-foreground line-clamp-3">{compareItem.found.description}</div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button size="sm" variant="outline" onClick={() => setCompareItem(null)}>
                Close
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onToast(`${compareItem.found.id} rejected as match for ${compareItem.lost.id}`)}
              >
                <XCircle className="size-3.5 mr-1.5" />
                Reject
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  onToast(`Match confirmed · ${compareItem.lost.guest} notified`);
                  setCompareItem(null);
                }}
              >
                <Check className="size-3.5 mr-1.5" />
                Confirm match
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* MODAL — add notes */}
      {notesFor && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                <StickyNote className="size-4 text-amber-500" />
                Add notes
              </div>
              <Button size="sm" variant="ghost" onClick={() => setNotesFor(null)}>
                <X className="size-4" />
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">
              Notes on candidate <span className="font-medium text-foreground">{notesFor.id} · {notesFor.name}</span>
            </div>
            <div className="space-y-2">
              <Label>Internal note</Label>
              <textarea
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
                rows={4}
                placeholder="e.g. Guest mentioned a small scratch on the lens - matches photo evidence."
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button size="sm" variant="outline" onClick={() => setNotesFor(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  onToast(`Note saved on ${notesFor.id}`);
                  setNotesFor(null);
                }}
              >
                <Check className="size-3.5 mr-1.5" />
                Save note
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
