"use client";
import * as React from "react";
import {
  Filter,
  Calendar,
  Building2,
  Users,
  DoorOpen,
  Tag,
  ListChecks,
  User,
  Star,
  Search,
  FileText,
  FileSpreadsheet,
  FileDown,
  Printer,
  CalendarClock,
  Pause,
  Edit3,
  Play,
  Mail,
  ChevronRight,
  PackageCheck,
  PackageX,
  Clock,
  Crown,
  Shield,
  AlertTriangle,
  ClipboardList,
  TrendingUp,
  Archive,
  CalendarDays,
  Trash2,
  PhoneCall,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn, money } from "@/lib/utils";
import { apiGet } from "@/lib/api";

type FoundRow = {
  id: number | string;
  name: string;
  category?: string;
  status?: string;
  value?: number;
  hvi?: boolean;
  foundLocation?: string;
  foundDate?: string;
  foundBy?: string;
  guestName?: string;
};

type ReportTile = {
  id: string;
  name: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  tint: "brand" | "info" | "success" | "warning" | "danger" | "accent" | "amber" | "neutral";
  lastRun: string;
};

type Row = {
  ref: string;
  date: string;
  item: string;
  category: string;
  location: string;
  finder: string;
  guest?: string;
  status: "found" | "claimed" | "returned" | "pending" | "disposed" | "expired" | "handover";
  value: number;
  hvi?: boolean;
};

const REPORT_TILES: ReportTile[] = [
  { id: "daily-found", name: "Daily Found Items", desc: "All items logged today across departments", icon: ClipboardList, tint: "brand", lastRun: "Today, 09:42" },
  { id: "monthly-summary", name: "Monthly L&F Summary", desc: "Full month overview · trend lines", icon: TrendingUp, tint: "info", lastRun: "01 Jun, 06:00" },
  { id: "department-wise", name: "Department-wise", desc: "Housekeeping · F&B · Banquet · Spa · Front office", icon: Building2, tint: "accent", lastRun: "Yesterday, 18:15" },
  { id: "room-wise", name: "Room-wise Report", desc: "Items found by room number / floor", icon: DoorOpen, tint: "neutral", lastRun: "30 May, 22:10" },
  { id: "staff-wise", name: "Staff-wise Found", desc: "Top finders · honesty leaderboard", icon: Users, tint: "success", lastRun: "01 Jun, 08:00" },
  { id: "category", name: "Category Report", desc: "Electronics · jewellery · documents · clothing", icon: Tag, tint: "brand", lastRun: "Today, 07:30" },
  { id: "pending-claim", name: "Pending Claim", desc: "Items awaiting guest pickup", icon: Clock, tint: "warning", lastRun: "Today, 09:00" },
  { id: "returned", name: "Returned Items", desc: "Successfully handed back to guests", icon: PackageCheck, tint: "success", lastRun: "Today, 09:00" },
  { id: "disposed", name: "Disposed Items", desc: "Charity / discarded / auctioned", icon: PackageX, tint: "danger", lastRun: "31 May, 17:00" },
  { id: "high-value", name: "High-Value Items", desc: "Above ₹5,000 · safe-locker tracked", icon: Crown, tint: "amber", lastRun: "Today, 08:00" },
  { id: "police-handover", name: "Police Handover", desc: "Legal · case-id linked", icon: Shield, tint: "danger", lastRun: "28 May, 14:20" },
  { id: "guest-lost", name: "Guest Lost Reports", desc: "Complaints raised by guests", icon: PhoneCall, tint: "info", lastRun: "Today, 10:12" },
  { id: "storage-expiry", name: "Storage Expiry", desc: "Items nearing 90-day window", icon: CalendarDays, tint: "warning", lastRun: "Yesterday, 23:00" },
  { id: "audit-log", name: "Audit Log Report", desc: "Full chain-of-custody trail", icon: Archive, tint: "neutral", lastRun: "Today, 06:00" },
];

const SAMPLE_BY_REPORT: Record<string, Row[]> = {
  "daily-found": [
    { ref: "LF-2026-0612", date: "02 Jun, 09:14", item: "Apple iPhone 15 Pro (Titanium Blue)", category: "Electronics", location: "Room 1208", finder: "Anjali Iyer", guest: "Mr. Rohit Sharma", status: "found", value: 134900, hvi: true },
    { ref: "LF-2026-0611", date: "02 Jun, 08:42", item: "Gold Bangle (22kt, 12g)", category: "Jewellery", location: "Spa Locker 04", finder: "Priya Krishnan", status: "found", value: 78000, hvi: true },
    { ref: "LF-2026-0610", date: "02 Jun, 08:10", item: "Ray-Ban Aviator Sunglasses", category: "Accessories", location: "Coral Bar", finder: "Karan Mehta", guest: "Ms. Neha Kapoor", status: "claimed", value: 12500 },
    { ref: "LF-2026-0609", date: "02 Jun, 07:55", item: "Passport (UK · J. Whitman)", category: "Documents", location: "Lobby Sofa", finder: "Vikram Singh", status: "pending", value: 0 },
    { ref: "LF-2026-0608", date: "02 Jun, 07:32", item: "Kids Tablet (Samsung Tab A)", category: "Electronics", location: "Pool Deck", finder: "Suresh Kumar", status: "found", value: 18500 },
    { ref: "LF-2026-0607", date: "02 Jun, 07:05", item: "Cashmere Shawl (Pashmina)", category: "Clothing", location: "Banquet Hall 2", finder: "Meera Joshi", guest: "Mrs. Lata Iyer", status: "returned", value: 22000 },
    { ref: "LF-2026-0606", date: "02 Jun, 06:48", item: "Diamond Stud Earring (1pc)", category: "Jewellery", location: "Room 0904 Bathroom", finder: "Anjali Iyer", status: "found", value: 65000, hvi: true },
    { ref: "LF-2026-0605", date: "02 Jun, 06:20", item: "Hermès Leather Belt", category: "Accessories", location: "Gym", finder: "Karan Mehta", status: "found", value: 28000, hvi: true },
    { ref: "LF-2026-0604", date: "02 Jun, 05:55", item: "Boarding Pass + Aadhaar Card", category: "Documents", location: "Reception Counter", finder: "Priya Krishnan", guest: "Mr. Arjun Reddy", status: "claimed", value: 0 },
    { ref: "LF-2026-0603", date: "02 Jun, 05:30", item: "Bose QC45 Headphones", category: "Electronics", location: "Room 1502", finder: "Deepa Nair", status: "pending", value: 24990 },
  ],
  "pending-claim": [
    { ref: "LF-2026-0609", date: "02 Jun", item: "Passport (UK · J. Whitman)", category: "Documents", location: "Lobby Sofa", finder: "Vikram Singh", status: "pending", value: 0 },
    { ref: "LF-2026-0603", date: "02 Jun", item: "Bose QC45 Headphones", category: "Electronics", location: "Room 1502", finder: "Deepa Nair", status: "pending", value: 24990 },
    { ref: "LF-2026-0597", date: "01 Jun", item: "Cartier Tank Watch", category: "Jewellery", location: "Pool Cabana 3", finder: "Anjali Iyer", status: "pending", value: 285000, hvi: true },
    { ref: "LF-2026-0591", date: "31 May", item: "MacBook Charger 96W", category: "Electronics", location: "Co-work Lounge", finder: "Karan Mehta", status: "pending", value: 6500 },
    { ref: "LF-2026-0584", date: "30 May", item: "Pearl Necklace", category: "Jewellery", location: "Room 1107", finder: "Priya Krishnan", status: "pending", value: 95000, hvi: true },
    { ref: "LF-2026-0580", date: "29 May", item: "Kindle Paperwhite", category: "Electronics", location: "Coral Bar", finder: "Suresh Kumar", status: "pending", value: 14999 },
    { ref: "LF-2026-0575", date: "28 May", item: "Wedding Ring (Platinum)", category: "Jewellery", location: "Banquet Washroom", finder: "Meera Joshi", status: "pending", value: 145000, hvi: true },
    { ref: "LF-2026-0571", date: "27 May", item: "Insulin Pen + Pouch", category: "Medical", location: "Room 0802", finder: "Anjali Iyer", status: "pending", value: 3200 },
    { ref: "LF-2026-0566", date: "26 May", item: "Children's Soft Toy (Elsa)", category: "Toys", location: "Kids Club", finder: "Deepa Nair", status: "pending", value: 1800 },
    { ref: "LF-2026-0560", date: "25 May", item: "Designer Sunglasses (Prada)", category: "Accessories", location: "Pool Deck", finder: "Karan Mehta", status: "pending", value: 32500, hvi: true },
  ],
  "returned": [
    { ref: "LF-2026-0607", date: "02 Jun", item: "Cashmere Shawl (Pashmina)", category: "Clothing", location: "Banquet Hall 2", finder: "Meera Joshi", guest: "Mrs. Lata Iyer", status: "returned", value: 22000 },
    { ref: "LF-2026-0604", date: "02 Jun", item: "Boarding Pass + Aadhaar Card", category: "Documents", location: "Reception", finder: "Priya Krishnan", guest: "Mr. Arjun Reddy", status: "returned", value: 0 },
    { ref: "LF-2026-0598", date: "01 Jun", item: "iPad Air 5", category: "Electronics", location: "Room 0906", finder: "Anjali Iyer", guest: "Ms. Sneha Patel", status: "returned", value: 64900 },
    { ref: "LF-2026-0593", date: "31 May", item: "Wedding Sherwani Set", category: "Clothing", location: "Banquet Hall 1", finder: "Meera Joshi", guest: "Mr. Aarav Khanna", status: "returned", value: 48000 },
    { ref: "LF-2026-0588", date: "30 May", item: "Apple Watch Ultra", category: "Electronics", location: "Spa Treatment 02", finder: "Priya Krishnan", guest: "Dr. Kavya Rao", status: "returned", value: 89900 },
    { ref: "LF-2026-0581", date: "29 May", item: "Leather Wallet + ₹12,000", category: "Accessories", location: "Coral Bar", finder: "Karan Mehta", guest: "Mr. Vijay Malhotra", status: "returned", value: 12000 },
    { ref: "LF-2026-0578", date: "28 May", item: "Tanishq Gold Chain", category: "Jewellery", location: "Pool Cabana 5", finder: "Anjali Iyer", guest: "Mrs. Pooja Agarwal", status: "returned", value: 88000, hvi: true },
    { ref: "LF-2026-0572", date: "27 May", item: "Hermès Silk Scarf", category: "Clothing", location: "Lobby", finder: "Deepa Nair", guest: "Ms. Riya Bansal", status: "returned", value: 36000, hvi: true },
    { ref: "LF-2026-0567", date: "26 May", item: "Sony WH-1000XM5", category: "Electronics", location: "Co-work Lounge", finder: "Karan Mehta", guest: "Mr. Karthik Iyer", status: "returned", value: 29990 },
    { ref: "LF-2026-0562", date: "25 May", item: "Diamond Pendant", category: "Jewellery", location: "Spa Reception", finder: "Priya Krishnan", guest: "Mrs. Anita Desai", status: "returned", value: 124000, hvi: true },
  ],
  "high-value": [
    { ref: "LF-2026-0597", date: "01 Jun", item: "Cartier Tank Watch", category: "Jewellery", location: "Pool Cabana 3", finder: "Anjali Iyer", status: "pending", value: 285000, hvi: true },
    { ref: "LF-2026-0612", date: "02 Jun", item: "Apple iPhone 15 Pro", category: "Electronics", location: "Room 1208", finder: "Anjali Iyer", guest: "Mr. Rohit Sharma", status: "found", value: 134900, hvi: true },
    { ref: "LF-2026-0575", date: "28 May", item: "Wedding Ring (Platinum)", category: "Jewellery", location: "Banquet Washroom", finder: "Meera Joshi", status: "pending", value: 145000, hvi: true },
    { ref: "LF-2026-0562", date: "25 May", item: "Diamond Pendant", category: "Jewellery", location: "Spa Reception", finder: "Priya Krishnan", guest: "Mrs. Anita Desai", status: "returned", value: 124000, hvi: true },
    { ref: "LF-2026-0584", date: "30 May", item: "Pearl Necklace", category: "Jewellery", location: "Room 1107", finder: "Priya Krishnan", status: "pending", value: 95000, hvi: true },
    { ref: "LF-2026-0588", date: "30 May", item: "Apple Watch Ultra", category: "Electronics", location: "Spa Treatment 02", finder: "Priya Krishnan", guest: "Dr. Kavya Rao", status: "returned", value: 89900, hvi: true },
    { ref: "LF-2026-0578", date: "28 May", item: "Tanishq Gold Chain", category: "Jewellery", location: "Pool Cabana 5", finder: "Anjali Iyer", guest: "Mrs. Pooja Agarwal", status: "returned", value: 88000, hvi: true },
    { ref: "LF-2026-0611", date: "02 Jun", item: "Gold Bangle (22kt)", category: "Jewellery", location: "Spa Locker 04", finder: "Priya Krishnan", status: "found", value: 78000, hvi: true },
    { ref: "LF-2026-0606", date: "02 Jun", item: "Diamond Stud Earring", category: "Jewellery", location: "Room 0904", finder: "Anjali Iyer", status: "found", value: 65000, hvi: true },
    { ref: "LF-2026-0560", date: "25 May", item: "Designer Sunglasses (Prada)", category: "Accessories", location: "Pool Deck", finder: "Karan Mehta", status: "pending", value: 32500, hvi: true },
  ],
};

function getSample(reportId: string): Row[] {
  return SAMPLE_BY_REPORT[reportId] ?? SAMPLE_BY_REPORT["daily-found"];
}

// Real found-items become report rows; status maps to the report vocabulary.
const ROW_STATUS: Record<string, Row["status"]> = {
  Returned: "returned",
  Claimed: "claimed",
  Disposed: "disposed",
  Donated: "disposed",
  Storage: "found",
  Notified: "pending",
  Waiting: "pending",
};
function foundToRow(i: FoundRow): Row {
  return {
    ref: `LF-${i.id}`,
    date: i.foundDate || "—",
    item: i.name,
    category: i.category || "—",
    location: i.foundLocation || "—",
    finder: i.foundBy || "—",
    guest: i.guestName || undefined,
    status: ROW_STATUS[i.status ?? ""] ?? "found",
    value: i.value ?? 0,
    hvi: i.hvi,
  };
}
// Narrows the full row set to the rows a given report card is about.
function rowsForReport(id: string, rows: Row[]): Row[] {
  switch (id) {
    case "pending-claim": return rows.filter((r) => r.status === "pending");
    case "returned": return rows.filter((r) => r.status === "returned" || r.status === "claimed");
    case "disposed": return rows.filter((r) => r.status === "disposed");
    case "high-value": return rows.filter((r) => r.hvi || r.value >= 5000);
    case "storage-expiry": return rows.filter((r) => r.status === "found" || r.status === "pending");
    default: return rows;
  }
}
// Reports backed by other tables (lost reports, audit, police) keep illustrative samples.
const SAMPLE_ONLY = new Set(["guest-lost", "audit-log", "police-handover"]);

const TINT_STYLES: Record<ReportTile["tint"], string> = {
  brand: "bg-brand-soft text-brand-soft-foreground",
  info: "bg-info-soft text-info",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  accent: "bg-accent-soft text-accent",
  neutral: "bg-surface-sunken text-muted-foreground",
  amber: "bg-linear-to-br from-amber-400 to-orange-500 text-white",
};

function statusBadge(s: Row["status"]) {
  switch (s) {
    case "found":     return <Badge tone="info">Found</Badge>;
    case "claimed":   return <Badge tone="success">Claimed</Badge>;
    case "returned":  return <Badge tone="success">Returned</Badge>;
    case "pending":   return <Badge tone="warning">Pending</Badge>;
    case "disposed":  return <Badge tone="danger">Disposed</Badge>;
    case "expired":   return <Badge tone="danger">Expired</Badge>;
    case "handover":  return <Badge tone="neutral">Police</Badge>;
  }
}

type ScheduledReport = {
  id: string;
  name: string;
  freq: string;
  next: string;
  recipients: string[];
  paused: boolean;
};

export default function ReportsTab({ onToast }: { onToast: (m: string) => void }) {
  // -------------------- filter state
  const today = "2026-06-02";
  const [from, setFrom] = React.useState("2026-05-26");
  const [to, setTo] = React.useState(today);
  const [branch, setBranch] = React.useState("pearl-marina");
  const [dept, setDept] = React.useState("all");
  const [roomNo, setRoomNo] = React.useState("");
  const [category, setCategory] = React.useState("all");
  const [status, setStatus] = React.useState("all");
  const [staff, setStaff] = React.useState("all");
  const [guestName, setGuestName] = React.useState("");
  const [hviOnly, setHviOnly] = React.useState(false);
  const [bucket, setBucket] = React.useState<"all" | "returned" | "pending" | "disposed">("all");

  // -------------------- real data (offline → samples)
  const [found, setFound] = React.useState<FoundRow[] | null>(null);
  React.useEffect(() => {
    let cancelled = false;
    apiGet<FoundRow[]>("/found-items")
      .then((r) => { if (!cancelled && r.length) setFound(r); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);
  const live = !!(found && found.length);

  // -------------------- selected report
  const [selectedId, setSelectedId] = React.useState<string>("daily-found");
  const selected = REPORT_TILES.find(t => t.id === selectedId)!;
  const rows = live && !SAMPLE_ONLY.has(selectedId)
    ? rowsForReport(selectedId, found!.map(foundToRow)).filter((r) => !hviOnly || r.hvi)
    : getSample(selectedId);

  // -------------------- scheduled
  const [schedules, setSchedules] = React.useState<ScheduledReport[]>([
    { id: "s1", name: "Daily Found Items", freq: "Daily · 09:00 IST", next: "Tomorrow 09:00", recipients: ["gm@pearlmarina.in", "duty.manager@pearlmarina.in"], paused: false },
    { id: "s2", name: "Pending Claim", freq: "Weekly · Mon 08:00", next: "Mon 08:00", recipients: ["fo.manager@pearlmarina.in"], paused: false },
    { id: "s3", name: "High-Value Items", freq: "Daily · 18:00 IST", next: "Today 18:00", recipients: ["security@pearlmarina.in", "gm@pearlmarina.in"], paused: false },
    { id: "s4", name: "Monthly L&F Summary", freq: "Monthly · 1st 06:00", next: "01 Jul 06:00", recipients: ["owner@pearlmarina.in", "audit@myhotel.in"], paused: true },
  ]);

  const togglePause = (id: string) => {
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, paused: !s.paused } : s));
    const s = schedules.find(x => x.id === id);
    onToast(s && !s.paused ? `Paused schedule: ${s.name}` : `Resumed schedule: ${s?.name ?? ""}`);
  };

  const resetFilters = () => {
    setFrom("2026-05-26"); setTo(today); setBranch("pearl-marina"); setDept("all");
    setRoomNo(""); setCategory("all"); setStatus("all"); setStaff("all");
    setGuestName(""); setHviOnly(false); setBucket("all");
    onToast("Filters reset to last 7 days");
  };

  const applyFilters = () => onToast(`Filters applied · ${from} → ${to} · ${branch === "all" ? "All branches" : "Pearl Marina"}`);

  // -------------------- KPIs (derived from sample rows)
  const totalValue = rows.reduce((s, r) => s + r.value, 0);
  const hviCount = rows.filter(r => r.hvi).length;
  const returnedCount = rows.filter(r => r.status === "returned" || r.status === "claimed").length;
  const pendingCount = rows.filter(r => r.status === "pending").length;

  return (
    <div className="space-y-4">
      {/* ============================ FILTER BAR ============================ */}
      <Card className="sticky top-0 z-30 p-3 backdrop-blur supports-[backdrop-filter]:bg-surface/85">
        <div className="flex items-center gap-2 mb-3">
          <span className="h-8 w-8 rounded-md bg-brand-soft text-brand-soft-foreground flex items-center justify-center">
            <Filter className="h-4 w-4" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold leading-tight">Report Filters</p>
            <p className="text-[11px] text-muted-foreground">The Pearl Marina, Mumbai · multi-property ready</p>
          </div>
          <Button size="sm" variant="ghost" onClick={resetFilters}>Reset</Button>
          <Button size="sm" onClick={applyFilters}>Apply filters</Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <div className="col-span-2 sm:col-span-1">
            <Label className="text-[11px] text-muted-foreground">From</Label>
            <div className="relative">
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-subtle-foreground pointer-events-none" />
              <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="h-9 pl-8 tabular" />
            </div>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <Label className="text-[11px] text-muted-foreground">To</Label>
            <div className="relative">
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-subtle-foreground pointer-events-none" />
              <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="h-9 pl-8 tabular" />
            </div>
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">Branch</Label>
            <Select value={branch} onChange={e => setBranch(e.target.value)} className="h-9">
              <option value="pearl-marina">The Pearl Marina, Mumbai</option>
              <option value="pearl-bandra">Pearl Bandra (coming soon)</option>
              <option value="all">All properties</option>
            </Select>
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">Department</Label>
            <Select value={dept} onChange={e => setDept(e.target.value)} className="h-9">
              <option value="all">All departments</option>
              <option value="hk">Housekeeping</option>
              <option value="fo">Front Office</option>
              <option value="fb">F&amp;B</option>
              <option value="banquet">Banquet</option>
              <option value="spa">Spa &amp; Wellness</option>
              <option value="security">Security</option>
              <option value="engg">Engineering</option>
            </Select>
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">Room No.</Label>
            <div className="relative">
              <DoorOpen className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-subtle-foreground pointer-events-none" />
              <Input value={roomNo} onChange={e => setRoomNo(e.target.value)} placeholder="e.g. 1208" className="h-9 pl-8 tabular" />
            </div>
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">Category</Label>
            <Select value={category} onChange={e => setCategory(e.target.value)} className="h-9">
              <option value="all">All categories</option>
              <option value="electronics">Electronics</option>
              <option value="jewellery">Jewellery</option>
              <option value="documents">Documents</option>
              <option value="clothing">Clothing</option>
              <option value="accessories">Accessories</option>
              <option value="medical">Medical</option>
              <option value="toys">Toys</option>
              <option value="other">Other</option>
            </Select>
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">Status</Label>
            <Select value={status} onChange={e => setStatus(e.target.value)} className="h-9">
              <option value="all">Any status</option>
              <option value="found">Found</option>
              <option value="pending">Pending claim</option>
              <option value="returned">Returned</option>
              <option value="disposed">Disposed</option>
              <option value="handover">Police handover</option>
            </Select>
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">Staff</Label>
            <Select value={staff} onChange={e => setStaff(e.target.value)} className="h-9">
              <option value="all">All staff</option>
              <option value="anjali">Anjali Iyer (HK)</option>
              <option value="karan">Karan Mehta (F&amp;B)</option>
              <option value="priya">Priya Krishnan (Spa)</option>
              <option value="meera">Meera Joshi (Banquet)</option>
              <option value="vikram">Vikram Singh (FO)</option>
              <option value="suresh">Suresh Kumar (Pool)</option>
            </Select>
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">Guest name</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-subtle-foreground pointer-events-none" />
              <Input value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="e.g. Rohit Sharma" className="h-9 pl-8" />
            </div>
          </div>
          <div className="col-span-2 sm:col-span-2 lg:col-span-2">
            <Label className="text-[11px] text-muted-foreground">Quick bucket</Label>
            <div className="flex items-center flex-wrap gap-1 h-9">
              {([
                { v: "all", l: "All" },
                { v: "returned", l: "Returned only" },
                { v: "pending", l: "Pending only" },
                { v: "disposed", l: "Disposed only" },
              ] as const).map(opt => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setBucket(opt.v)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                    bucket === opt.v
                      ? "border-brand bg-brand-soft text-brand-soft-foreground"
                      : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30",
                  )}
                >
                  <span className={cn("h-1.5 w-1.5 rounded-full",
                    opt.v === "all" && "bg-muted-foreground",
                    opt.v === "returned" && "bg-success",
                    opt.v === "pending" && "bg-warning",
                    opt.v === "disposed" && "bg-danger",
                  )} />
                  {opt.l}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
          <button
            type="button"
            onClick={() => setHviOnly(v => !v)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-all",
              hviOnly
                ? "bg-linear-to-br from-amber-400 to-orange-500 text-white shadow-sm"
                : "border border-border text-muted-foreground hover:text-foreground"
            )}
          >
            <Crown className="h-3.5 w-3.5" />
            High-value only
            <span className={cn("h-3.5 w-7 rounded-full p-0.5 transition-colors", hviOnly ? "bg-white/30" : "bg-surface-sunken")}>
              <span className={cn("block h-2.5 w-2.5 rounded-full transition-transform", hviOnly ? "translate-x-3 bg-white" : "bg-muted-foreground")} />
            </span>
          </button>
          <p className="text-[11px] text-muted-foreground">
            Showing items where <span className="font-medium text-foreground">value &gt; ₹5,000</span> when toggled
          </p>
        </div>
      </Card>

      {/* ============================ REPORT TILE GRID ============================ */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Available Reports</h3>
            <p className="text-[11px] text-muted-foreground">14 standard reports · click any tile to preview · export PDF / Excel / CSV</p>
          </div>
          <Badge tone="brand">{REPORT_TILES.length} reports</Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {REPORT_TILES.map(t => {
            const Icon = t.icon;
            const isSelected = selectedId === t.id;
            return (
              <Card
                key={t.id}
                onClick={() => { setSelectedId(t.id); onToast(`Loaded preview: ${t.name}`); }}
                className={cn(
                  "p-4 cursor-pointer group transition-all duration-200",
                  "hover:border-brand hover:shadow-[0_4px_16px_-4px_rgb(0_0_0/0.08),_0_2px_4px_-2px_rgb(0_0_0/0.06)]",
                  "hover:-translate-y-0.5",
                  isSelected && "border-brand ring-2 ring-brand/20 shadow-[0_4px_16px_-4px_rgb(0_0_0/0.08)]",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className={cn(
                    "h-10 w-10 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
                    TINT_STYLES[t.tint],
                  )}>
                    <Icon className="h-5 w-5" />
                  </span>
                  {isSelected && <Badge tone="brand">Active</Badge>}
                </div>
                <p className="mt-3 font-medium text-sm leading-tight">{t.name}</p>
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed line-clamp-2">{t.desc}</p>
                <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Last run · <span className="text-foreground/80 normal-case tracking-normal tabular">{t.lastRun}</span>
                  </span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setSelectedId(t.id); onToast(`Running report: ${t.name}`); }}
                    className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-brand hover:underline"
                  >
                    Run<ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ============================ SELECTED REPORT VIEWER ============================ */}
      <Card className="overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-border bg-surface-sunken/30">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className={cn(
                "h-11 w-11 rounded-lg flex items-center justify-center shrink-0",
                TINT_STYLES[selected.tint],
              )}>
                <selected.icon className="h-5 w-5" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold tracking-tight">{selected.name}</h3>
                  <Badge tone="info">Preview · 10 rows</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{selected.desc}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <Badge tone="neutral"><CalendarDays className="h-3 w-3" />{from} → {to}</Badge>
                  <Badge tone="neutral"><Building2 className="h-3 w-3" />Pearl Marina</Badge>
                  {dept !== "all" && <Badge tone="neutral">Dept: {dept.toUpperCase()}</Badge>}
                  {category !== "all" && <Badge tone="neutral">Category: {category}</Badge>}
                  {hviOnly && <Badge tone="warning"><Crown className="h-3 w-3" />HVI only</Badge>}
                  {bucket !== "all" && <Badge tone="info">{bucket} only</Badge>}
                </div>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => onToast(`Full report opened: ${selected.name}`)}>
              View full report<ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border">
          <KpiCell icon={ClipboardList} tint="brand" label="Total items" value={rows.length.toString()} sub="In current view" />
          <KpiCell icon={TrendingUp} tint="info" label="Total value" value={money(totalValue)} sub="Declared by guest" />
          <KpiCell icon={Crown} tint="amber" label="High-value" value={hviCount.toString()} sub="Above ₹5,000" />
          <KpiCell icon={PackageCheck} tint="success" label="Returned / claimed" value={`${returnedCount} / ${rows.length}`} sub={`${pendingCount} still pending`} />
        </div>

        {/* Sample table */}
        <div>
          <table className="w-full text-sm">
            <thead className="bg-surface-sunken/40">
              <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="text-left px-4 py-2 font-medium">Ref / Date</th>
                <th className="text-left px-4 py-2 font-medium">Item</th>
                <th className="text-left px-4 py-2 font-medium">Category</th>
                <th className="text-left px-4 py-2 font-medium">Location</th>
                <th className="text-left px-4 py-2 font-medium">Found by</th>
                <th className="text-left px-4 py-2 font-medium">Guest</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
                <th className="text-right px-4 py-2 font-medium">Value</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={r.ref}
                  className={cn(
                    "border-t border-border hover:bg-surface-sunken/40 transition-colors",
                    i % 2 === 1 && "bg-surface-sunken/15",
                  )}
                >
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-xs tabular">{r.ref}</div>
                    <div className="text-[11px] text-muted-foreground">{r.date}</div>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-foreground">{r.item}</span>
                      {r.hvi && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-linear-to-br from-amber-400 to-orange-500 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                          <Crown className="h-2.5 w-2.5" />HVI
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{r.category}</td>
                  <td className="px-4 py-2.5">{r.location}</td>
                  <td className="px-4 py-2.5">{r.finder}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{r.guest ?? <span className="text-subtle-foreground italic">—</span>}</td>
                  <td className="px-4 py-2.5">{statusBadge(r.status)}</td>
                  <td className="px-4 py-2.5 text-right font-medium tabular">
                    {r.value > 0 ? money(r.value) : <span className="text-subtle-foreground">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border bg-surface-sunken/40">
                <td colSpan={7} className="px-4 py-2.5 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                  Total declared value (sample)
                </td>
                <td className="px-4 py-2.5 text-right font-bold tabular">{money(totalValue)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Export bar */}
        <div className="px-4 py-3 border-t border-border bg-surface-sunken/30 flex flex-wrap items-center justify-between gap-3">
          <div className="text-[11px] text-muted-foreground">
            Generated <span className="text-foreground font-medium tabular">02 Jun 2026 · 09:42 IST</span> · Pearl Marina · MYHOTEL Reports Engine v2.4
          </div>
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="outline" onClick={() => onToast(`PDF export queued: ${selected.name}.pdf`)}>
              <FileText className="h-3.5 w-3.5" />PDF
            </Button>
            <Button size="sm" variant="outline" onClick={() => onToast(`Excel export queued: ${selected.name}.xlsx`)}>
              <FileSpreadsheet className="h-3.5 w-3.5" />Excel
            </Button>
            <Button size="sm" variant="outline" onClick={() => onToast(`CSV export queued: ${selected.name}.csv`)}>
              <FileDown className="h-3.5 w-3.5" />CSV
            </Button>
            <Button size="sm" variant="outline" onClick={() => onToast("Print dialog opened")}>
              <Printer className="h-3.5 w-3.5" />Print
            </Button>
            <Button size="sm" onClick={() => onToast(`Email scheduled: ${selected.name} → 3 recipients`)}>
              <Mail className="h-3.5 w-3.5" />Email
            </Button>
          </div>
        </div>
      </Card>

      {/* ============================ SCHEDULED REPORTS ============================ */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-9 w-9 rounded-md bg-accent-soft text-accent flex items-center justify-center">
              <CalendarClock className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold leading-tight">Scheduled Reports</p>
              <p className="text-[11px] text-muted-foreground">{schedules.filter(s => !s.paused).length} active · auto-emailed to recipients · IST timezone</p>
            </div>
          </div>
          <Button size="sm" onClick={() => onToast("New schedule wizard opened")}>
            <CalendarClock className="h-3.5 w-3.5" />New schedule
          </Button>
        </div>

        <div className="divide-y divide-border">
          {schedules.map(s => (
            <div key={s.id} className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 hover:bg-surface-sunken/30 transition-colors">
              <div className="flex items-start gap-3 min-w-0">
                <span className={cn(
                  "h-9 w-9 rounded-md flex items-center justify-center shrink-0",
                  s.paused ? "bg-surface-sunken text-muted-foreground" : "bg-brand-soft text-brand-soft-foreground",
                )}>
                  <FileText className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium leading-tight">{s.name}</p>
                    {s.paused ? <Badge tone="neutral">Paused</Badge> : <Badge tone="success">Active</Badge>}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1"><CalendarClock className="h-3 w-3" />{s.freq}</span>
                    <span>·</span>
                    <span>Next: <span className="text-foreground tabular">{s.next}</span></span>
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1.5 flex-wrap">
                    <Mail className="h-3 w-3" />
                    {s.recipients.map((r, idx) => (
                      <span key={r} className="inline-flex items-center">
                        <code className="text-[11px] bg-surface-sunken px-1.5 py-0.5 rounded text-foreground">{r}</code>
                        {idx < s.recipients.length - 1 && <span className="mx-1">·</span>}
                      </span>
                    ))}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button size="sm" variant="ghost" onClick={() => onToast(`Schedule run now: ${s.name}`)}>
                  <Play className="h-3.5 w-3.5" />Run now
                </Button>
                <Button size="sm" variant="outline" onClick={() => onToast(`Edit schedule: ${s.name}`)}>
                  <Edit3 className="h-3.5 w-3.5" />Edit
                </Button>
                <Button size="sm" variant="outline" onClick={() => togglePause(s.id)}>
                  {s.paused ? <><Play className="h-3.5 w-3.5" />Resume</> : <><Pause className="h-3.5 w-3.5" />Pause</>}
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="px-4 py-2.5 bg-surface-sunken/30 border-t border-border text-[11px] text-muted-foreground flex items-center gap-2">
          <AlertTriangle className="h-3 w-3 text-warning" />
          Schedule emails are sent from <span className="font-medium text-foreground">reports@myhotel.in</span> · DKIM signed · receipts in audit log.
        </div>
      </Card>
    </div>
  );
}

/* ------------------------- KPI cell ------------------------- */
function KpiCell({
  icon: Icon,
  tint,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tint: ReportTile["tint"];
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="bg-surface p-4 flex items-start gap-3">
      <span className={cn("h-10 w-10 rounded-md flex items-center justify-center shrink-0", TINT_STYLES[tint])}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
        <p className="text-lg font-bold tabular leading-tight mt-0.5">{value}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{sub}</p>
      </div>
    </div>
  );
}
