"use client";
import * as React from "react";
import {
  ShieldCheck,
  Activity,
  UserCheck,
  Hourglass,
  AlertTriangle,
  Download,
  FileText,
  Search,
  Calendar,
  Filter,
  Plus,
  Pencil,
  Camera,
  Link2,
  Bell,
  RefreshCcw,
  ArrowRightLeft,
  PackageCheck,
  Trash2,
  X,
  CheckCircle2,
  XCircle,
  Hash,
  Globe,
  Smartphone,
  ChevronDown,
  Lock,
  Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn, money } from "@/lib/utils";

type ActionType =
  | "created"
  | "updated"
  | "photo"
  | "linked"
  | "notified"
  | "status"
  | "moved"
  | "returned"
  | "disposed"
  | "deleted"
  | "approved"
  | "rejected";

type EntityType = "item" | "report" | "storage" | "return" | "disposal";

type Role = "Admin" | "FO" | "HK" | "Security" | "Manager";

type AuditEntry = {
  id: string;
  ts: string;
  date: string;
  actor: string;
  role: Role;
  action: ActionType;
  entityType: EntityType;
  entityId: string;
  sentence: string;
  oldValue?: string;
  newValue?: string;
  ip: string;
  device: string;
  remarks?: string;
  hash: string;
};

const ACTION_META: Record<
  ActionType,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    tone: "neutral" | "brand" | "success" | "warning" | "danger" | "info" | "accent";
    bg: string;
    fg: string;
  }
> = {
  created: { label: "Created", icon: Plus, tone: "info", bg: "bg-sky-500/10", fg: "text-sky-600 dark:text-sky-400" },
  updated: { label: "Updated", icon: Pencil, tone: "neutral", bg: "bg-surface-sunken", fg: "text-foreground" },
  photo: { label: "Photo uploaded", icon: Camera, tone: "accent", bg: "bg-violet-500/10", fg: "text-violet-600 dark:text-violet-400" },
  linked: { label: "Guest linked", icon: Link2, tone: "brand", bg: "bg-brand-soft", fg: "text-brand" },
  notified: { label: "Notified", icon: Bell, tone: "info", bg: "bg-cyan-500/10", fg: "text-cyan-600 dark:text-cyan-400" },
  status: { label: "Status changed", icon: RefreshCcw, tone: "warning", bg: "bg-amber-500/10", fg: "text-amber-600 dark:text-amber-400" },
  moved: { label: "Moved", icon: ArrowRightLeft, tone: "neutral", bg: "bg-indigo-500/10", fg: "text-indigo-600 dark:text-indigo-400" },
  returned: { label: "Returned", icon: PackageCheck, tone: "success", bg: "bg-emerald-500/10", fg: "text-emerald-600 dark:text-emerald-400" },
  disposed: { label: "Disposed", icon: Trash2, tone: "danger", bg: "bg-rose-500/10", fg: "text-rose-600 dark:text-rose-400" },
  deleted: { label: "Deleted", icon: X, tone: "danger", bg: "bg-red-500/10", fg: "text-red-600 dark:text-red-400" },
  approved: { label: "Approved", icon: CheckCircle2, tone: "success", bg: "bg-green-500/10", fg: "text-green-600 dark:text-green-400" },
  rejected: { label: "Rejected", icon: XCircle, tone: "danger", bg: "bg-rose-500/10", fg: "text-rose-600 dark:text-rose-400" },
};

const ROLE_TONE: Record<Role, "neutral" | "brand" | "success" | "warning" | "danger" | "info" | "accent"> = {
  Admin: "danger",
  FO: "info",
  HK: "success",
  Security: "warning",
  Manager: "brand",
};

const ENTRIES: AuditEntry[] = [
  {
    id: "AUD-29841",
    ts: "14:42:18",
    date: "Today",
    actor: "Anjali Iyer",
    role: "Manager",
    action: "approved",
    entityType: "disposal",
    entityId: "DSP-4419",
    sentence: "approved disposal batch of 6 unclaimed items (clothing + toiletries) past 90-day window",
    ip: "10.42.18.221",
    device: "MacBook Pro · Safari 17.5",
    remarks: "Bi-weekly review · auctioneer scheduled for Friday",
    hash: "0x9a3f...c12d",
  },
  {
    id: "AUD-29840",
    ts: "14:31:02",
    date: "Today",
    actor: "Ramesh Naidu",
    role: "Security",
    action: "moved",
    entityType: "item",
    entityId: "LF-21984",
    sentence: "moved Apple AirPods Pro (2nd gen) from Room 412 to General storage shelf B-3",
    oldValue: "Room 412 · HK trolley bag",
    newValue: "General storage · Shelf B-3",
    ip: "10.42.18.118",
    device: "iPad Pro · MYHOTEL App 4.2",
    hash: "0x88e1...44a7",
  },
  {
    id: "AUD-29839",
    ts: "14:18:55",
    date: "Today",
    actor: "Priya Krishnan",
    role: "HK",
    action: "returned",
    entityType: "return",
    entityId: "RET-1182",
    sentence: "returned Cartier Tank watch to guest Mr. Rohit Sharma (PNR HZ4488) at Front Desk",
    ip: "10.42.18.046",
    device: "Reception PC · Chrome 126",
    remarks: "ID verified · signature collected · CCTV reference saved",
    hash: "0x71bb...0291",
  },
  {
    id: "AUD-29838",
    ts: "13:54:09",
    date: "Today",
    actor: "Karan Mehta",
    role: "FO",
    action: "linked",
    entityType: "report",
    entityId: "LFR-7762",
    sentence: "linked lost report to found item LF-21979 (Samsung Galaxy Buds, black)",
    oldValue: "Unmatched",
    newValue: "Match confidence 92%",
    ip: "10.42.18.077",
    device: "Reception PC · Edge 124",
    hash: "0x4c20...ffae",
  },
  {
    id: "AUD-29837",
    ts: "13:41:33",
    date: "Today",
    actor: "Anjali Iyer",
    role: "Manager",
    action: "rejected",
    entityType: "return",
    entityId: "RET-1181",
    sentence: "rejected return claim for Tag Heuer wristwatch (LF-21952) — claimant ID mismatch",
    ip: "10.42.18.221",
    device: "MacBook Pro · Safari 17.5",
    remarks: "Escalated to Security · CCTV pull requested for Room 318 (14 May)",
    hash: "0x1d77...88c4",
  },
  {
    id: "AUD-29836",
    ts: "13:22:51",
    date: "Today",
    actor: "Priya Krishnan",
    role: "HK",
    action: "created",
    entityType: "item",
    entityId: "LF-21984",
    sentence: "created found-item entry for Apple AirPods Pro (white) found in Room 412 nightstand drawer",
    ip: "10.42.18.052",
    device: "Android · MYHOTEL HK 4.1",
    hash: "0x9012...aacc",
  },
  {
    id: "AUD-29835",
    ts: "13:09:14",
    date: "Today",
    actor: "Priya Krishnan",
    role: "HK",
    action: "photo",
    entityType: "item",
    entityId: "LF-21984",
    sentence: "uploaded 3 photos to LF-21984 (front, back, serial number)",
    ip: "10.42.18.052",
    device: "Android · MYHOTEL HK 4.1",
    hash: "0xa551...b210",
  },
  {
    id: "AUD-29834",
    ts: "12:48:27",
    date: "Today",
    actor: "Sneha Pillai",
    role: "FO",
    action: "notified",
    entityType: "report",
    entityId: "LFR-7761",
    sentence: "notified guest Ms. Divya Subramaniam via WhatsApp + SMS about match found for Hermes scarf",
    ip: "10.42.18.063",
    device: "Reception PC · Chrome 126",
    hash: "0x3338...91d2",
  },
  {
    id: "AUD-29833",
    ts: "12:31:08",
    date: "Today",
    actor: "Rohit Deshmukh",
    role: "Security",
    action: "status",
    entityType: "item",
    entityId: "LF-21978",
    sentence: "changed status of Louis Vuitton wallet from Searching to Awaiting claim",
    oldValue: "Searching",
    newValue: "Awaiting claim",
    ip: "10.42.18.131",
    device: "Security desk PC · Firefox 127",
    remarks: "High-value item · escalated to Manager",
    hash: "0x6664...1abc",
  },
  {
    id: "AUD-29832",
    ts: "11:58:42",
    date: "Today",
    actor: "Karan Mehta",
    role: "FO",
    action: "created",
    entityType: "report",
    entityId: "LFR-7762",
    sentence: "filed lost report for Samsung Galaxy Buds on behalf of guest Mr. Aniket Joshi (Room 1208)",
    ip: "10.42.18.077",
    device: "Reception PC · Edge 124",
    hash: "0x2222...44de",
  },
  {
    id: "AUD-29831",
    ts: "11:44:19",
    date: "Today",
    actor: "Vikram Singh",
    role: "Admin",
    action: "updated",
    entityType: "storage",
    entityId: "STG-LOCKER-04",
    sentence: "updated custodian for Security locker 04 from Ramesh Naidu to Rohit Deshmukh",
    oldValue: "Ramesh Naidu",
    newValue: "Rohit Deshmukh",
    ip: "10.42.18.005",
    device: "MacBook Air · Safari 17.5",
    remarks: "Shift rotation effective today 12:00",
    hash: "0xeeee...0011",
  },
  {
    id: "AUD-29830",
    ts: "11:22:03",
    date: "Today",
    actor: "Anjali Iyer",
    role: "Manager",
    action: "approved",
    entityType: "return",
    entityId: "RET-1180",
    sentence: "approved release of Bvlgari perfume (LF-21940) to guest Ms. Kavita Reddy",
    ip: "10.42.18.221",
    device: "MacBook Pro · Safari 17.5",
    hash: "0x7788...c0de",
  },
  {
    id: "AUD-29829",
    ts: "10:54:38",
    date: "Today",
    actor: "Priya Krishnan",
    role: "HK",
    action: "moved",
    entityType: "item",
    entityId: "LF-21976",
    sentence: "moved iPad Air (silver, 256GB) from HK trolley to Electronics cabinet shelf E-2",
    oldValue: "HK trolley · Floor 11",
    newValue: "Electronics cabinet · Shelf E-2",
    ip: "10.42.18.052",
    device: "Android · MYHOTEL HK 4.1",
    hash: "0x1357...9bd0",
  },
  {
    id: "AUD-29828",
    ts: "10:31:11",
    date: "Today",
    actor: "Sneha Pillai",
    role: "FO",
    action: "linked",
    entityType: "report",
    entityId: "LFR-7759",
    sentence: "linked report LFR-7759 to found item LF-21961 (Mont Blanc pen)",
    oldValue: "Unmatched",
    newValue: "Match confidence 88%",
    ip: "10.42.18.063",
    device: "Reception PC · Chrome 126",
    hash: "0x9bd0...aabb",
  },
  {
    id: "AUD-29827",
    ts: "10:08:54",
    date: "Today",
    actor: "Ramesh Naidu",
    role: "Security",
    action: "created",
    entityType: "item",
    entityId: "LF-21983",
    sentence: "created high-value entry for Pandora bracelet found in Banquet Hall A after wedding event",
    ip: "10.42.18.118",
    device: "iPad Pro · MYHOTEL App 4.2",
    remarks: "HVI flag · moved to Jewellery safe immediately",
    hash: "0xc0ff...eeee",
  },
  {
    id: "AUD-29826",
    ts: "09:47:22",
    date: "Today",
    actor: "Vikram Singh",
    role: "Admin",
    action: "deleted",
    entityType: "item",
    entityId: "LF-21902",
    sentence: "deleted duplicate entry for sunglasses (matched LF-21899 - same item logged twice)",
    ip: "10.42.18.005",
    device: "MacBook Air · Safari 17.5",
    remarks: "Audit trail preserved · linked to LF-21899",
    hash: "0xdead...beef",
  },
  {
    id: "AUD-29825",
    ts: "09:22:14",
    date: "Today",
    actor: "Karan Mehta",
    role: "FO",
    action: "notified",
    entityType: "item",
    entityId: "LF-21944",
    sentence: "sent 30-day reminder email to guest Mr. Suresh Iyengar regarding unclaimed Ray-Ban sunglasses",
    ip: "10.42.18.077",
    device: "Reception PC · Edge 124",
    hash: "0x4567...89ab",
  },
  {
    id: "AUD-29824",
    ts: "08:54:09",
    date: "Today",
    actor: "Rohit Deshmukh",
    role: "Security",
    action: "photo",
    entityType: "disposal",
    entityId: "DSP-4418",
    sentence: "uploaded witness photos for disposal batch DSP-4418 (12 items, photo evidence)",
    ip: "10.42.18.131",
    device: "Security desk PC · Firefox 127",
    hash: "0xfeed...face",
  },
  {
    id: "AUD-29823",
    ts: "Yesterday 18:42",
    date: "Yesterday",
    actor: "Anjali Iyer",
    role: "Manager",
    action: "approved",
    entityType: "disposal",
    entityId: "DSP-4418",
    sentence: "approved disposal of 12 expired toiletries items past 60-day window",
    ip: "10.42.18.221",
    device: "iPhone 15 · MYHOTEL Mgr 2.8",
    hash: "0x1122...3344",
  },
  {
    id: "AUD-29822",
    ts: "Yesterday 17:18",
    date: "Yesterday",
    actor: "Priya Krishnan",
    role: "HK",
    action: "returned",
    entityType: "return",
    entityId: "RET-1179",
    sentence: "returned Kindle Paperwhite to guest Ms. Pooja Bhardwaj at Concierge",
    ip: "10.42.18.052",
    device: "Android · MYHOTEL HK 4.1",
    hash: "0x5566...7788",
  },
  {
    id: "AUD-29821",
    ts: "Yesterday 16:33",
    date: "Yesterday",
    actor: "Karan Mehta",
    role: "FO",
    action: "status",
    entityType: "item",
    entityId: "LF-21971",
    sentence: "changed status of gold chain (HVI) from Awaiting claim to Returned",
    oldValue: "Awaiting claim",
    newValue: "Returned",
    ip: "10.42.18.077",
    device: "Reception PC · Edge 124",
    remarks: "Guest signature + PAN copy on file",
    hash: "0x99aa...bbcc",
  },
  {
    id: "AUD-29820",
    ts: "Yesterday 15:07",
    date: "Yesterday",
    actor: "Sneha Pillai",
    role: "FO",
    action: "updated",
    entityType: "report",
    entityId: "LFR-7758",
    sentence: "updated contact phone for lost report LFR-7758 (typo in last 4 digits)",
    oldValue: "+91 98xxx xx422",
    newValue: "+91 98xxx xx442",
    ip: "10.42.18.063",
    device: "Reception PC · Chrome 126",
    hash: "0xddee...ff00",
  },
  {
    id: "AUD-29819",
    ts: "Yesterday 14:21",
    date: "Yesterday",
    actor: "Ramesh Naidu",
    role: "Security",
    action: "moved",
    entityType: "item",
    entityId: "LF-21968",
    sentence: "moved cash envelope (₹ 8,500) from Found bin to Cash safe locker A-1",
    oldValue: "Found bin · Reception",
    newValue: "Cash safe · Locker A-1",
    ip: "10.42.18.118",
    device: "iPad Pro · MYHOTEL App 4.2",
    remarks: "Witnessed by Anjali Iyer (Manager) · seal #4471",
    hash: "0x1357...2468",
  },
  {
    id: "AUD-29818",
    ts: "Yesterday 13:48",
    date: "Yesterday",
    actor: "Vikram Singh",
    role: "Admin",
    action: "updated",
    entityType: "storage",
    entityId: "STG-FRIDGE-01",
    sentence: "updated retention policy for perishables fridge from 24h to 48h",
    oldValue: "24 hours",
    newValue: "48 hours",
    ip: "10.42.18.005",
    device: "MacBook Air · Safari 17.5",
    hash: "0xfade...c0de",
  },
  {
    id: "AUD-29817",
    ts: "Yesterday 12:54",
    date: "Yesterday",
    actor: "Priya Krishnan",
    role: "HK",
    action: "created",
    entityType: "item",
    entityId: "LF-21982",
    sentence: "created found-item entry for Welspun bath towel left in pool area sun-lounger",
    ip: "10.42.18.052",
    device: "Android · MYHOTEL HK 4.1",
    hash: "0x2024...0512",
  },
  {
    id: "AUD-29816",
    ts: "Yesterday 11:36",
    date: "Yesterday",
    actor: "Anjali Iyer",
    role: "Manager",
    action: "rejected",
    entityType: "disposal",
    entityId: "DSP-4417",
    sentence: "rejected disposal batch DSP-4417 — Rolex watch included by mistake (HVI cannot be disposed)",
    ip: "10.42.18.221",
    device: "MacBook Pro · Safari 17.5",
    remarks: "Returned to Jewellery safe · review process updated",
    hash: "0xbabe...face",
  },
  {
    id: "AUD-29815",
    ts: "Yesterday 10:14",
    date: "Yesterday",
    actor: "Karan Mehta",
    role: "FO",
    action: "linked",
    entityType: "report",
    entityId: "LFR-7757",
    sentence: "linked report LFR-7757 to MakeMyTrip booking MMT-882019 for guest verification",
    ip: "10.42.18.077",
    device: "Reception PC · Edge 124",
    hash: "0x8888...9999",
  },
];

export default function AuditTab({ onToast }: { onToast: (m: string) => void }) {
  const [dateFrom, setDateFrom] = React.useState("2026-06-01");
  const [dateTo, setDateTo] = React.useState("2026-06-02");
  const [actorQuery, setActorQuery] = React.useState("");
  const [actionFilter, setActionFilter] = React.useState<string>("all");
  const [entityFilter, setEntityFilter] = React.useState<string>("all");
  const [roleFilter, setRoleFilter] = React.useState<string>("all");
  const [openEntry, setOpenEntry] = React.useState<AuditEntry | null>(null);

  const filtered = React.useMemo(() => {
    return ENTRIES.filter((e) => {
      if (actionFilter !== "all" && e.action !== actionFilter) return false;
      if (entityFilter !== "all" && e.entityType !== entityFilter) return false;
      if (roleFilter !== "all" && e.role !== roleFilter) return false;
      if (actorQuery && !e.actor.toLowerCase().includes(actorQuery.toLowerCase())) return false;
      return true;
    });
  }, [actionFilter, entityFilter, roleFilter, actorQuery]);

  const grouped = React.useMemo(() => {
    const map = new Map<string, AuditEntry[]>();
    for (const e of filtered) {
      const list = map.get(e.date) ?? [];
      list.push(e);
      map.set(e.date, list);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const kpis = [
    {
      label: "Actions today",
      value: ENTRIES.filter((e) => e.date === "Today").length,
      sub: "across 6 staff members",
      icon: Activity,
      tint: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    },
    {
      label: "Most active staff",
      value: "Priya K.",
      sub: "5 actions (HK)",
      icon: UserCheck,
      tint: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Approvals pending",
      value: 3,
      sub: "2 returns · 1 disposal",
      icon: Hourglass,
      tint: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    },
    {
      label: "Critical actions",
      value: 4,
      sub: "deletes + disposals (7d)",
      icon: AlertTriangle,
      tint: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    },
  ] as const;

  return (
    <div className="space-y-4">
      {/* Tamper protection banner */}
      <Card className="overflow-hidden border-emerald-500/30 bg-linear-to-br from-emerald-500/10 via-emerald-500/5 to-transparent">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <div className="text-sm font-semibold text-foreground">Tamper protection active</div>
                <Badge tone="success">Verified</Badge>
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                Audit log is append-only · cryptographic hash chain (SHA-256) · last verified
                <span className="tabular font-medium text-foreground"> 4 min ago</span>
                <span className="mx-1.5 text-muted-foreground/60">·</span>
                chain height
                <span className="tabular font-medium text-foreground"> 29,841</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onToast("Re-verifying hash chain integrity...")}
            >
              <Lock className="h-3.5 w-3.5" />
              Verify now
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onToast("Opening tamper-proof chain explorer")}
            >
              <Hash className="h-3.5 w-3.5" />
              View chain
            </Button>
          </div>
        </div>
      </Card>

      {/* KPI strip */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label} className="p-4">
              <div className="flex items-start gap-3">
                <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-md", k.tint)}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    {k.label}
                  </div>
                  <div className="tabular mt-0.5 text-xl font-semibold text-foreground">
                    {k.value}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">{k.sub}</div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Filter bar */}
      <Card className="p-3">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Filter className="h-4 w-4 text-muted-foreground" />
              Filter audit log
              <Badge tone="neutral">{filtered.length} entries</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onToast("Exporting filtered audit log to CSV...")}
              >
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onToast("Generating signed PDF report...")}
              >
                <FileText className="h-3.5 w-3.5" />
                Export PDF
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            <div>
              <Label className="text-[10px] uppercase tracking-wide">From</Label>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="pl-7"
                />
              </div>
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-wide">To</Label>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="pl-7"
                />
              </div>
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-wide">Actor</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search staff..."
                  value={actorQuery}
                  onChange={(e) => setActorQuery(e.target.value)}
                  className="pl-7"
                />
              </div>
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-wide">Action</Label>
              <Select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
                <option value="all">All actions</option>
                <option value="created">Created</option>
                <option value="updated">Updated</option>
                <option value="photo">Photo uploaded</option>
                <option value="linked">Guest linked</option>
                <option value="notified">Notified</option>
                <option value="status">Status changed</option>
                <option value="moved">Moved</option>
                <option value="returned">Returned</option>
                <option value="disposed">Disposed</option>
                <option value="deleted">Deleted</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </Select>
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-wide">Entity</Label>
              <Select value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)}>
                <option value="all">All entities</option>
                <option value="item">Item</option>
                <option value="report">Lost report</option>
                <option value="storage">Storage</option>
                <option value="return">Return</option>
                <option value="disposal">Disposal</option>
              </Select>
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-wide">Role</Label>
              <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                <option value="all">All roles</option>
                <option value="Admin">Admin</option>
                <option value="FO">Front Office</option>
                <option value="HK">Housekeeping</option>
                <option value="Security">Security</option>
                <option value="Manager">Manager</option>
              </Select>
            </div>
          </div>
        </div>
      </Card>

      {/* Timeline */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-border/60 bg-surface-sunken/40 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Audit timeline
            </div>
          </div>
          <button
            type="button"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => onToast("Refreshed audit feed")}
          >
            <RefreshCcw className="h-3 w-3" />
            Refresh
          </button>
        </div>

        <div className="divide-y divide-border/60">
          {grouped.map(([dateGroup, entries]) => (
            <div key={dateGroup}>
              <div className="sticky top-0 z-10 flex items-center gap-2 bg-surface-sunken/80 px-4 py-1.5 backdrop-blur">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {dateGroup}
                </div>
                <div className="h-px flex-1 bg-border/60" />
                <div className="tabular text-[10px] text-muted-foreground">
                  {entries.length} action{entries.length === 1 ? "" : "s"}
                </div>
              </div>

              <ul className="divide-y divide-border/60">
                {entries.map((e) => {
                  const meta = ACTION_META[e.action];
                  const Icon = meta.icon;
                  return (
                    <li
                      key={e.id}
                      className="group flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors hover:bg-surface-sunken/40"
                      onClick={() => setOpenEntry(e)}
                    >
                      <div
                        className={cn(
                          "grid h-9 w-9 shrink-0 place-items-center rounded-md",
                          meta.bg,
                          meta.fg
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-sm font-semibold text-foreground">{e.actor}</span>
                          <Badge tone={ROLE_TONE[e.role]}>{e.role}</Badge>
                          <Badge tone={meta.tone}>{meta.label}</Badge>
                          <span className="text-sm text-muted-foreground">{e.sentence}</span>
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <button
                            type="button"
                            className="tabular flex items-center gap-1 font-medium text-brand hover:underline"
                            onClick={(ev) => {
                              ev.stopPropagation();
                              onToast(`Opening ${e.entityId}`);
                            }}
                          >
                            <Hash className="h-3 w-3" />
                            {e.entityId}
                          </button>
                          <span className="flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            <span className="tabular">{e.ip}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <Smartphone className="h-3 w-3" />
                            {e.device}
                          </span>
                        </div>

                        {(e.oldValue || e.newValue) && (
                          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                            <span className="rounded-md bg-rose-500/10 px-1.5 py-0.5 text-rose-600 line-through dark:text-rose-400">
                              {e.oldValue}
                            </span>
                            <span className="text-muted-foreground">→</span>
                            <span className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-emerald-600 dark:text-emerald-400">
                              {e.newValue}
                            </span>
                          </div>
                        )}

                        {e.remarks && (
                          <div className="mt-1.5 flex items-start gap-1.5 rounded-md bg-surface-sunken/60 px-2 py-1 text-xs text-muted-foreground">
                            <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
                            <span>{e.remarks}</span>
                          </div>
                        )}
                      </div>

                      <div className="tabular shrink-0 text-right text-xs text-muted-foreground">
                        {e.ts}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
              <div className="grid h-10 w-10 place-items-center rounded-md bg-surface-sunken text-muted-foreground">
                <Search className="h-5 w-5" />
              </div>
              <div className="text-sm font-medium text-foreground">No audit entries match</div>
              <div className="text-xs text-muted-foreground">
                Try widening your date range or clearing the filters
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setActionFilter("all");
                  setEntityFilter("all");
                  setRoleFilter("all");
                  setActorQuery("");
                  onToast("Filters cleared");
                }}
              >
                Clear filters
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border/60 bg-surface-sunken/40 px-4 py-2.5">
          <div className="text-xs text-muted-foreground">
            Showing
            <span className="tabular font-medium text-foreground"> {filtered.length} </span>
            of
            <span className="tabular font-medium text-foreground"> {ENTRIES.length} </span>
            recent entries
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onToast("Loading older entries (30 more)...")}
          >
            <ChevronDown className="h-3.5 w-3.5" />
            Load older
          </Button>
        </div>
      </Card>

      {/* Detail drawer */}
      {openEntry && (
        <div
          className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/40 backdrop-blur-sm"
          onClick={() => setOpenEntry(null)}
        >
          <Card
            className="w-full max-w-xl overflow-y-auto rounded-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-border/60 p-4">
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "grid h-10 w-10 shrink-0 place-items-center rounded-md",
                    ACTION_META[openEntry.action].bg,
                    ACTION_META[openEntry.action].fg
                  )}
                >
                  {React.createElement(ACTION_META[openEntry.action].icon, {
                    className: "h-5 w-5",
                  })}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <div className="text-base font-semibold text-foreground">
                      {ACTION_META[openEntry.action].label}
                    </div>
                    <Badge tone={ACTION_META[openEntry.action].tone}>
                      {openEntry.entityType}
                    </Badge>
                  </div>
                  <div className="tabular mt-0.5 text-xs text-muted-foreground">
                    {openEntry.id} · {openEntry.date} {openEntry.ts}
                  </div>
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setOpenEntry(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4 p-4">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Description
                </div>
                <div className="mt-1 text-sm text-foreground">
                  <span className="font-semibold">{openEntry.actor}</span>{" "}
                  <span className="text-muted-foreground">{openEntry.sentence}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md bg-surface-sunken/50 p-3">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Actor
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{openEntry.actor}</span>
                    <Badge tone={ROLE_TONE[openEntry.role]}>{openEntry.role}</Badge>
                  </div>
                </div>
                <div className="rounded-md bg-surface-sunken/50 p-3">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Entity
                  </div>
                  <button
                    type="button"
                    className="tabular mt-1 flex items-center gap-1 text-sm font-medium text-brand hover:underline"
                    onClick={() => onToast(`Opening ${openEntry.entityId}`)}
                  >
                    <Hash className="h-3.5 w-3.5" />
                    {openEntry.entityId}
                  </button>
                </div>
              </div>

              {(openEntry.oldValue || openEntry.newValue) && (
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Value diff
                  </div>
                  <div className="mt-1.5 space-y-1.5">
                    <div className="flex items-start gap-2 rounded-md bg-rose-500/10 px-2.5 py-1.5">
                      <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-600 dark:text-rose-400">
                        Old
                      </span>
                      <span className="text-sm text-rose-600 line-through dark:text-rose-400">
                        {openEntry.oldValue}
                      </span>
                    </div>
                    <div className="flex items-start gap-2 rounded-md bg-emerald-500/10 px-2.5 py-1.5">
                      <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                        New
                      </span>
                      <span className="text-sm text-emerald-600 dark:text-emerald-400">
                        {openEntry.newValue}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Session metadata
                </div>
                <div className="mt-1.5 space-y-1.5 rounded-md border border-border/60 p-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Globe className="h-3 w-3" />
                      IP address
                    </span>
                    <span className="tabular font-medium text-foreground">{openEntry.ip}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Smartphone className="h-3 w-3" />
                      Device
                    </span>
                    <span className="font-medium text-foreground">{openEntry.device}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Hash className="h-3 w-3" />
                      Hash
                    </span>
                    <span className="tabular font-medium text-foreground">{openEntry.hash}</span>
                  </div>
                </div>
              </div>

              {openEntry.remarks && (
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Remarks
                  </div>
                  <div className="mt-1.5 flex items-start gap-2 rounded-md bg-amber-500/10 px-2.5 py-2 text-sm text-foreground">
                    <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                    <span>{openEntry.remarks}</span>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onToast(`Verifying hash for ${openEntry.id}...`)}
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Verify hash
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onToast(`Copied audit entry ${openEntry.id} to clipboard`)}
                >
                  <FileText className="h-3.5 w-3.5" />
                  Copy entry
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onToast(`Opening related entity ${openEntry.entityId}`)}
                >
                  Go to entity
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
