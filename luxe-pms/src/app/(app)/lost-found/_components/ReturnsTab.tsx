"use client";
import * as React from "react";
import {
  PackageCheck,
  CalendarClock,
  Truck,
  Clock,
  User,
  UserCheck,
  Shield,
  Building2,
  Mail,
  Phone,
  FileText,
  Eye,
  Printer,
  Download,
  CheckCircle2,
  X,
  ChevronRight,
  Camera,
  PenLine,
  KeyRound,
  Image as ImageIcon,
  Search,
  MapPin,
  Hash,
  Sparkles,
  ShieldCheck,
  Star,
  Receipt,
  Package,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn, money } from "@/lib/utils";
import { apiGet, apiPut } from "@/lib/api";

type FoundRow = {
  id: number | string;
  name: string;
  category?: string;
  status?: string;
  value?: number;
  hvi?: boolean;
  guestName?: string;
  contact?: string;
  email?: string;
  foundLocation?: string;
  foundDate?: string;
};

type ReturnMethod =
  | "Guest collects"
  | "Authorized person"
  | "Courier"
  | "Police handover"
  | "Company rep";

type ReturnStatus =
  | "Pending verification"
  | "Awaiting collection"
  | "In transit"
  | "Delivered"
  | "Completed";

type ToneType = "neutral" | "brand" | "success" | "warning" | "danger" | "info" | "accent";

type IdProofType = "Aadhaar" | "PAN" | "Passport" | "Driver License";
type Relationship =
  | "Self"
  | "Spouse"
  | "Authorized person"
  | "Courier rep"
  | "Police officer"
  | "Company rep";
type CourierCompany = "Bluedart" | "DTDC" | "FedEx" | "DHL" | "Indiapost";

interface ReturnItem {
  id: string;
  itemName: string;
  itemId: string;
  category: string;
  value: number;
  isHVI: boolean;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  guestRoom: string;
  method: ReturnMethod;
  status: ReturnStatus;
  createdAt: string;
  expectedAt: string;
  // pre-filled workflow data
  idProofType?: IdProofType;
  idProofNumber?: string;
  relationship?: Relationship;
  courierCompany?: CourierCompany;
  trackingNumber?: string;
  deliveryAddress?: string;
  expectedDelivery?: string;
  policeStation?: string;
  firNumber?: string;
  officerName?: string;
  officerId?: string;
  remarks?: string;
  receiptNo?: string;
}

const METHOD_TONE: Record<ReturnMethod, ToneType> = {
  "Guest collects": "brand",
  "Authorized person": "accent",
  Courier: "info",
  "Police handover": "warning",
  "Company rep": "neutral",
};

const STATUS_TONE: Record<ReturnStatus, ToneType> = {
  "Pending verification": "warning",
  "Awaiting collection": "info",
  "In transit": "info",
  Delivered: "brand",
  Completed: "success",
};

const METHOD_ICON: Record<ReturnMethod, React.ComponentType<{ className?: string }>> = {
  "Guest collects": User,
  "Authorized person": UserCheck,
  Courier: Truck,
  "Police handover": Shield,
  "Company rep": Building2,
};

const METHODS: (ReturnMethod | "All")[] = [
  "All",
  "Guest collects",
  "Authorized person",
  "Courier",
  "Police handover",
  "Company rep",
];

const ID_PROOFS: IdProofType[] = ["Aadhaar", "PAN", "Passport", "Driver License"];
const RELATIONSHIPS: Relationship[] = [
  "Self",
  "Spouse",
  "Authorized person",
  "Courier rep",
  "Police officer",
  "Company rep",
];
const COURIERS: CourierCompany[] = ["Bluedart", "DTDC", "FedEx", "DHL", "Indiapost"];

const SEED: ReturnItem[] = [
  {
    id: "RR-2026-0231",
    itemName: "Cartier Gold Bracelet",
    itemId: "LF-2401",
    category: "Jewellery",
    value: 245000,
    isHVI: true,
    guestName: "Mrs. Anjali Iyer",
    guestEmail: "anjali.iyer@gmail.com",
    guestPhone: "+91 98203 11422",
    guestRoom: "Suite 1204",
    method: "Guest collects",
    status: "Pending verification",
    createdAt: "2026-05-29",
    expectedAt: "2026-06-02",
    idProofType: "Aadhaar",
    idProofNumber: "XXXX-XXXX-4192",
    relationship: "Self",
    remarks: "HVI — manager approval pending. Guest arriving in person at 6 PM.",
  },
  {
    id: "RR-2026-0232",
    itemName: "MacBook Pro 16-inch (Space Black)",
    itemId: "LF-2389",
    category: "Electronics",
    value: 318000,
    isHVI: true,
    guestName: "Mr. Karan Mehta",
    guestEmail: "karan.mehta@outlook.com",
    guestPhone: "+91 99672 84510",
    guestRoom: "Deluxe 802",
    method: "Courier",
    status: "In transit",
    createdAt: "2026-05-27",
    expectedAt: "2026-06-03",
    idProofType: "PAN",
    idProofNumber: "BNZPM4519H",
    relationship: "Self",
    courierCompany: "Bluedart",
    trackingNumber: "BD7711-MUM-09421",
    deliveryAddress: "B-704, Oberoi Splendor, JVLR, Andheri East, Mumbai 400060",
    expectedDelivery: "2026-06-03",
    remarks: "Insured shipment · double-boxed · signature required.",
  },
  {
    id: "RR-2026-0233",
    itemName: "Ray-Ban Aviator Sunglasses",
    itemId: "LF-2412",
    category: "Accessories",
    value: 12500,
    isHVI: false,
    guestName: "Ms. Priya Krishnan",
    guestEmail: "priya.k@yahoo.in",
    guestPhone: "+91 98101 55872",
    guestRoom: "Standard 416",
    method: "Authorized person",
    status: "Awaiting collection",
    createdAt: "2026-05-30",
    expectedAt: "2026-06-02",
    idProofType: "Driver License",
    idProofNumber: "MH02-20210038221",
    relationship: "Authorized person",
    remarks: "Guest's brother authorised — written email on file.",
  },
  {
    id: "RR-2026-0234",
    itemName: "Samsonite Cabin Trolley",
    itemId: "LF-2378",
    category: "Luggage",
    value: 18900,
    isHVI: false,
    guestName: "Mr. Rohit Sharma",
    guestEmail: "rohit.sharma1988@gmail.com",
    guestPhone: "+91 96452 70113",
    guestRoom: "Deluxe 511",
    method: "Courier",
    status: "Delivered",
    createdAt: "2026-05-25",
    expectedAt: "2026-05-31",
    idProofType: "Aadhaar",
    idProofNumber: "XXXX-XXXX-8821",
    relationship: "Self",
    courierCompany: "DTDC",
    trackingNumber: "DTDC-X9032-MUM",
    deliveryAddress: "Flat 12-A, Lodha Park, Worli, Mumbai 400018",
    expectedDelivery: "2026-05-31",
    remarks: "Delivered to security — pending OTP confirmation from guest.",
  },
  {
    id: "RR-2026-0235",
    itemName: "Silver Anklet (pair)",
    itemId: "LF-2401",
    category: "Jewellery",
    value: 4800,
    isHVI: false,
    guestName: "Mrs. Lakshmi Venkat",
    guestEmail: "lakshmi.v@rediffmail.com",
    guestPhone: "+91 94484 02265",
    guestRoom: "Standard 322",
    method: "Police handover",
    status: "Pending verification",
    createdAt: "2026-05-28",
    expectedAt: "2026-06-04",
    idProofType: "Aadhaar",
    idProofNumber: "XXXX-XXXX-7741",
    relationship: "Police officer",
    policeStation: "Worli Police Station, Mumbai",
    firNumber: "FIR/0421/2026",
    officerName: "SI Mahesh Patil",
    officerId: "MAH-PS-23119",
    remarks: "Found in spa locker — guest filed complaint. Awaiting court letter.",
  },
  {
    id: "RR-2026-0236",
    itemName: "Mont Blanc Fountain Pen",
    itemId: "LF-2367",
    category: "Stationery",
    value: 42000,
    isHVI: false,
    guestName: "Mr. Aditya Bansal",
    guestEmail: "aditya@bansaltextiles.in",
    guestPhone: "+91 90876 54321",
    guestRoom: "Suite 1108",
    method: "Company rep",
    status: "Awaiting collection",
    createdAt: "2026-05-31",
    expectedAt: "2026-06-02",
    idProofType: "PAN",
    idProofNumber: "AGTPB5520K",
    relationship: "Company rep",
    remarks: "Bansal Textiles secretary will collect with authority letter.",
  },
  {
    id: "RR-2026-0237",
    itemName: "Tanishq Diamond Earrings",
    itemId: "LF-2350",
    category: "Jewellery",
    value: 165000,
    isHVI: false,
    guestName: "Mrs. Neha Agarwal",
    guestEmail: "neha.agarwal@hotmail.com",
    guestPhone: "+91 87654 32109",
    guestRoom: "Suite 1502",
    method: "Guest collects",
    status: "Completed",
    createdAt: "2026-05-20",
    expectedAt: "2026-05-22",
    idProofType: "Passport",
    idProofNumber: "Z3344112",
    relationship: "Self",
    remarks: "Collected & signed · receipt RR/2026/0228 issued.",
    receiptNo: "RR/2026/0228",
  },
  {
    id: "RR-2026-0238",
    itemName: "Charger + Adapter Kit",
    itemId: "LF-2440",
    category: "Electronics",
    value: 2400,
    isHVI: false,
    guestName: "Mr. Suresh Pillai",
    guestEmail: "spillai@infotech.co.in",
    guestPhone: "+91 70212 88394",
    guestRoom: "Standard 218",
    method: "Courier",
    status: "In transit",
    createdAt: "2026-05-30",
    expectedAt: "2026-06-04",
    idProofType: "Aadhaar",
    idProofNumber: "XXXX-XXXX-1199",
    relationship: "Self",
    courierCompany: "Indiapost",
    trackingNumber: "EI7720114IN",
    deliveryAddress: "12, Sector-5, Vashi, Navi Mumbai 400703",
    expectedDelivery: "2026-06-04",
    remarks: "Low-value · standard speed post · cash-on-delivery courier fee.",
  },
];

// Maps a real found-item (in a return-relevant state) into a return record.
const RETURN_STATUS: Record<string, ReturnStatus> = {
  Notified: "Pending verification",
  Claimed: "Awaiting collection",
  Returned: "Completed",
};
function toReturnItem(i: FoundRow): ReturnItem {
  return {
    id: `RR-${i.id}`,
    itemName: i.name,
    itemId: String(i.id),
    category: i.category || "—",
    value: i.value || 0,
    isHVI: !!i.hvi,
    guestName: i.guestName || "—",
    guestEmail: i.email || "",
    guestPhone: i.contact || "",
    guestRoom: i.foundLocation || "",
    method: "Guest collects",
    status: RETURN_STATUS[i.status ?? ""] ?? "Pending verification",
    createdAt: i.foundDate || "",
    expectedAt: "",
  };
}

export default function ReturnsTab({ onToast }: { onToast: (m: string) => void }) {
  const [filter, setFilter] = React.useState<ReturnMethod | "All">("All");
  const [search, setSearch] = React.useState("");
  const [openId, setOpenId] = React.useState<string | null>(null);

  // Real found-items in a return-relevant state; mock SEED is the offline fallback.
  const [found, setFound] = React.useState<FoundRow[] | null>(null);
  React.useEffect(() => {
    let cancelled = false;
    apiGet<FoundRow[]>("/found-items")
      .then((r) => { if (!cancelled && r.length) setFound(r); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const data: ReturnItem[] = found && found.length
    ? found.filter((i) => i.status && i.status in RETURN_STATUS).map(toReturnItem)
    : SEED;

  const markCompleted = (r: ReturnItem) => {
    apiPut(`/found-items/${r.itemId}`, { status: "Returned" })
      .then(() => {
        setFound((prev) => (prev ? prev.map((f) => (String(f.id) === r.itemId ? { ...f, status: "Returned" } : f)) : prev));
        onToast(`${r.id} marked completed`);
      })
      .catch(() => onToast("⚠ Save failed — backend offline"));
  };

  const filtered = data.filter((r) => {
    if (filter !== "All" && r.method !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        r.itemName.toLowerCase().includes(q) ||
        r.guestName.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        r.itemId.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // KPIs
  const pending = data.filter(
    (r) => r.status === "Pending verification" || r.status === "Awaiting collection"
  ).length;
  const returnedThisMonth = data.filter((r) => r.status === "Completed").length;
  const avgDays = 3.4;
  const inTransit = data.filter((r) => r.status === "In transit").length;

  const openRow = openId ? data.find((r) => r.id === openId) || null : null;

  return (
    <div className="space-y-4">
      {/* STATUS STRIP */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          icon={<Clock className="h-4 w-4" />}
          tone="warning"
          label="Pending return"
          value={pending.toString()}
          sub="Awaiting verification + collection"
        />
        <KpiCard
          icon={<PackageCheck className="h-4 w-4" />}
          tone="success"
          label="Returned this month"
          value={returnedThisMonth.toString()}
          sub="May 2026 · all categories"
        />
        <KpiCard
          icon={<CalendarClock className="h-4 w-4" />}
          tone="info"
          label="Avg return time"
          value={`${avgDays}d`}
          sub="From log → completion"
        />
        <KpiCard
          icon={<Truck className="h-4 w-4" />}
          tone="brand"
          label="Courier in-transit"
          value={inTransit.toString()}
          sub="Bluedart / DTDC / Indiapost"
        />
      </div>

      {/* FILTER CHIPS + SEARCH */}
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <div className="flex flex-wrap gap-1.5">
            {METHODS.map((m) => {
              const active = filter === m;
              const Icon = m === "All" ? Sparkles : METHOD_ICON[m as ReturnMethod];
              return (
                <button
                  key={m}
                  onClick={() => setFilter(m)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors",
                    active
                      ? "bg-brand text-brand-foreground border-brand"
                      : "bg-surface text-foreground border-border hover:bg-surface-sunken"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {m}
                </button>
              );
            })}
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by item / guest / ID"
              className="pl-8 h-9 w-64"
            />
          </div>
        </div>
      </Card>

      {/* ACTIVE RETURNS TABLE */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <div className="text-sm font-semibold text-foreground">Active returns</div>
            <div className="text-xs text-muted-foreground">
              {filtered.length} record{filtered.length === 1 ? "" : "s"} · sorted by newest
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onToast("Returns exported to CSV")}
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-sunken/40">
              <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="text-left font-medium px-4 py-2.5">Item</th>
                <th className="text-left font-medium px-4 py-2.5">Guest</th>
                <th className="text-left font-medium px-4 py-2.5">Method</th>
                <th className="text-left font-medium px-4 py-2.5">Status</th>
                <th className="text-right font-medium px-4 py-2.5">Value</th>
                <th className="text-right font-medium px-4 py-2.5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((r) => {
                const MethodIcon = METHOD_ICON[r.method];
                return (
                  <tr
                    key={r.id}
                    onClick={() => setOpenId(r.id)}
                    className="hover:bg-surface-sunken/40 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "h-11 w-11 rounded-md flex items-center justify-center shrink-0",
                            r.isHVI
                              ? "bg-linear-to-br from-amber-400 to-orange-500 text-white"
                              : "bg-surface-sunken text-muted-foreground"
                          )}
                        >
                          <Package className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-foreground truncate">
                              {r.itemName}
                            </span>
                            {r.isHVI && (
                              <Badge tone="accent" className="gap-1">
                                <Star className="h-3 w-3 fill-current" />
                                HVI
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground tabular">
                            {r.id} · {r.itemId} · {r.category}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{r.guestName}</div>
                      <div className="text-xs text-muted-foreground tabular flex items-center gap-2">
                        <Phone className="h-3 w-3" />
                        {r.guestPhone}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={METHOD_TONE[r.method]} className="gap-1">
                        <MethodIcon className="h-3 w-3" />
                        {r.method}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right tabular text-foreground">
                      {money(r.value)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenId(r.id);
                          }}
                          title="View"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToast(`Receipt printed for ${r.id}`);
                          }}
                          title="Print receipt"
                        >
                          <Printer className="h-3.5 w-3.5" />
                        </Button>
                        {r.method === "Courier" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToast(
                                `Tracking ${r.trackingNumber} · ${r.courierCompany} · opening tracker`
                              );
                            }}
                            title="Track courier"
                          >
                            <Truck className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {r.status !== "Completed" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              markCompleted(r);
                            }}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Mark
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                    No returns match your filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* RETURN RECEIPT PREVIEW */}
      <ReceiptPreview onToast={onToast} />

      {/* DRAWER */}
      {openRow && (
        <ReturnDrawer
          item={openRow}
          onClose={() => setOpenId(null)}
          onToast={onToast}
          onComplete={markCompleted}
        />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// KPI CARD
// ────────────────────────────────────────────────────────────────────────────
function KpiCard({
  icon,
  tone,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  tone: ToneType;
  label: string;
  value: string;
  sub: string;
}) {
  const toneBg: Record<ToneType, string> = {
    neutral: "bg-surface-sunken text-muted-foreground",
    brand: "bg-brand-soft text-brand",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
    danger: "bg-danger-soft text-danger",
    info: "bg-info-soft text-info",
    accent: "bg-accent-soft text-accent",
  };
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "h-9 w-9 rounded-md flex items-center justify-center shrink-0",
            toneBg[tone]
          )}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            {label}
          </div>
          <div className="text-2xl font-semibold tabular text-foreground mt-0.5">{value}</div>
          <div className="text-xs text-muted-foreground mt-0.5 truncate">{sub}</div>
        </div>
      </div>
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// RECEIPT PREVIEW
// ────────────────────────────────────────────────────────────────────────────
function ReceiptPreview({ onToast }: { onToast: (m: string) => void }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-brand" />
          <div>
            <div className="text-sm font-semibold text-foreground">Return receipt preview</div>
            <div className="text-xs text-muted-foreground">
              Sample · Last generated RR/2026/0234
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onToast("Receipt PDF downloaded · RR/2026/0234")}
          >
            <Download className="h-3.5 w-3.5" />
            Download PDF
          </Button>
          <Button size="sm" onClick={() => onToast("Receipt sent to printer")}>
            <Printer className="h-3.5 w-3.5" />
            Print
          </Button>
        </div>
      </div>

      {/* Mock letterhead receipt */}
      <div className="p-6 bg-surface-sunken/30">
        <div className="max-w-3xl mx-auto bg-surface border border-border rounded-md shadow-sm p-8 space-y-6">
          {/* Letterhead */}
          <div className="flex items-start justify-between pb-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-md bg-linear-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-lg">
                M
              </div>
              <div>
                <div className="text-lg font-bold text-foreground tracking-tight">
                  THE PEARL MARINA
                </div>
                <div className="text-xs text-muted-foreground">
                  A MYHOTEL Premium Property
                </div>
                <div className="text-xs text-muted-foreground">
                  Marine Drive, Mumbai 400020 · GSTIN 27AAACP1234M1Z5
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Return receipt
              </div>
              <div className="text-base font-bold text-foreground tabular">RR/2026/0234</div>
              <div className="text-xs text-muted-foreground tabular">Date: 02 Jun 2026</div>
            </div>
          </div>

          <div className="text-center">
            <div className="text-sm font-semibold text-foreground uppercase tracking-wider">
              Lost &amp; Found Item Return Acknowledgement
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              This document certifies the lawful return of the item described below.
            </div>
          </div>

          {/* Item + guest grid */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Item details
              </div>
              <Row k="Item" v="Samsonite Cabin Trolley" />
              <Row k="Item ID" v="LF-2378" />
              <Row k="Category" v="Luggage" />
              <Row k="Declared value" v={money(18900)} />
              <Row k="Logged on" v="25 May 2026" />
            </div>
            <div className="space-y-2">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Guest details
              </div>
              <Row k="Name" v="Mr. Rohit Sharma" />
              <Row k="Room" v="Deluxe 511" />
              <Row k="Phone" v="+91 96452 70113" />
              <Row k="ID proof" v="Aadhaar · XXXX-XXXX-8821" />
              <Row k="Relationship" v="Self" />
            </div>
          </div>

          {/* Method block */}
          <div className="rounded-md border border-border bg-surface-sunken/40 p-4 space-y-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Method of return
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
              <Row k="Method" v="Courier · DTDC" />
              <Row k="Tracking #" v="DTDC-X9032-MUM" />
              <Row k="Delivered" v="31 May 2026, 4:18 PM" />
              <Row k="Charges" v={money(450)} />
            </div>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-3 gap-6 pt-2">
            <SigBlock label="Guest signature" name="R. Sharma" />
            <SigBlock label="Staff (Front Desk)" name="A. Deshpande" />
            <SigBlock label="Manager on duty" name="V. Iyer" />
          </div>

          {/* Terms */}
          <div className="pt-4 border-t border-border">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">
              Terms &amp; declaration
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              I, the undersigned, hereby acknowledge receipt of the above-mentioned item from The
              Pearl Marina. I confirm the item is in the same condition as logged and that no claim
              shall arise against the hotel henceforth. This receipt is generated electronically
              and is valid without signature when accompanied by a digital seal. For any dispute,
              contact lostfound@thepearlmarina.in within 7 days.
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-xs text-muted-foreground">{k}</span>
      <span className="text-sm text-foreground tabular text-right">{v}</span>
    </div>
  );
}

function SigBlock({ label, name }: { label: string; name: string }) {
  return (
    <div>
      <div className="h-12 border-b border-border-strong italic text-muted-foreground flex items-end pb-0.5">
        <span className="text-sm">{name}</span>
      </div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
        {label}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// RETURN DRAWER
// ────────────────────────────────────────────────────────────────────────────
function ReturnDrawer({
  item,
  onClose,
  onToast,
  onComplete,
}: {
  item: ReturnItem;
  onClose: () => void;
  onToast: (m: string) => void;
  onComplete: (r: ReturnItem) => void;
}) {
  const [idType, setIdType] = React.useState<IdProofType>(item.idProofType || "Aadhaar");
  const [idNum, setIdNum] = React.useState(item.idProofNumber || "");
  const [rel, setRel] = React.useState<Relationship>(item.relationship || "Self");
  const [courier, setCourier] = React.useState<CourierCompany>(
    item.courierCompany || "Bluedart"
  );
  const [tracking, setTracking] = React.useState(item.trackingNumber || "");
  const [address, setAddress] = React.useState(item.deliveryAddress || "");
  const [expDelivery, setExpDelivery] = React.useState(item.expectedDelivery || "");
  const [station, setStation] = React.useState(item.policeStation || "");
  const [fir, setFir] = React.useState(item.firNumber || "");
  const [officer, setOfficer] = React.useState(item.officerName || "");
  const [officerId, setOfficerId] = React.useState(item.officerId || "");
  const [otp, setOtp] = React.useState("");
  const [remarks, setRemarks] = React.useState(item.remarks || "");

  const MethodIcon = METHOD_ICON[item.method];

  function complete() {
    if (item.isHVI && !otp) {
      onToast("HVI return needs OTP verification before completion");
      return;
    }
    onComplete(item);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-stretch justify-end"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-xl overflow-y-auto rounded-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="sticky top-0 z-10 bg-surface border-b border-border p-4 flex items-start justify-between">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className={cn(
                "h-11 w-11 rounded-md flex items-center justify-center shrink-0",
                item.isHVI
                  ? "bg-linear-to-br from-amber-400 to-orange-500 text-white"
                  : "bg-surface-sunken text-muted-foreground"
              )}
            >
              <Package className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <div className="font-semibold text-foreground">{item.itemName}</div>
                {item.isHVI && (
                  <Badge tone="accent" className="gap-1">
                    <Star className="h-3 w-3 fill-current" />
                    HVI
                  </Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground tabular">
                {item.id} · {item.itemId} · {money(item.value)}
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                <Badge tone={METHOD_TONE[item.method]} className="gap-1">
                  <MethodIcon className="h-3 w-3" />
                  {item.method}
                </Badge>
                <Badge tone={STATUS_TONE[item.status]}>{item.status}</Badge>
              </div>
            </div>
          </div>
          <Button size="sm" variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4 space-y-5">
          {/* GUEST INFO */}
          <div className="rounded-md border border-border bg-surface-sunken/30 p-3 space-y-1.5 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-medium text-foreground">{item.guestName}</span>
              <span className="text-xs text-muted-foreground">· {item.guestRoom}</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground tabular">
              <span className="flex items-center gap-1.5">
                <Phone className="h-3 w-3" />
                {item.guestPhone}
              </span>
              <span className="flex items-center gap-1.5">
                <Mail className="h-3 w-3" />
                {item.guestEmail}
              </span>
            </div>
          </div>

          {/* SECTION A — Verify collector */}
          <SectionHeader
            icon={<ShieldCheck className="h-4 w-4 text-brand" />}
            title="A. Verify collector"
            sub="Validate ID proof of the person collecting on behalf of the guest"
          />
          <div className="space-y-3">
            <div>
              <Label className="text-xs">ID proof type</Label>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {ID_PROOFS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setIdType(t)}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-medium border transition-colors",
                      idType === t
                        ? "bg-brand text-brand-foreground border-brand"
                        : "bg-surface text-foreground border-border hover:bg-surface-sunken"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="idnum" className="text-xs">
                  ID proof number
                </Label>
                <Input
                  id="idnum"
                  value={idNum}
                  onChange={(e) => setIdNum(e.target.value)}
                  placeholder="Enter ID number"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="rel" className="text-xs">
                  Relationship to guest
                </Label>
                <Select
                  id="rel"
                  value={rel}
                  onChange={(e) => setRel(e.target.value as Relationship)}
                  className="mt-1"
                >
                  {RELATIONSHIPS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>

          {/* SECTION B — Signatures */}
          <SectionHeader
            icon={<PenLine className="h-4 w-4 text-brand" />}
            title="B. Signatures & verification"
            sub={
              item.isHVI
                ? "HVI item — manager signature + OTP mandatory"
                : "Guest and staff signature required"
            }
          />
          <div className={cn("grid gap-3", item.isHVI ? "grid-cols-3" : "grid-cols-2")}>
            <SigPlaceholder label="Guest signature" onSign={() => onToast("Guest signature captured")} />
            <SigPlaceholder label="Staff signature" onSign={() => onToast("Staff signature captured")} />
            {item.isHVI && (
              <SigPlaceholder
                label="Manager signature"
                onSign={() => onToast("Manager signature captured")}
                accent
              />
            )}
          </div>
          {item.isHVI && (
            <div className="rounded-md border border-amber-300/40 bg-linear-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 p-3">
              <div className="flex items-center gap-2 mb-2">
                <KeyRound className="h-4 w-4 text-amber-700 dark:text-amber-300" />
                <span className="text-sm font-medium text-foreground">OTP verification</span>
                <Badge tone="accent">HVI required</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="Enter 6-digit OTP"
                  inputMode="numeric"
                  className="tabular tracking-widest"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onToast(`OTP sent to ${item.guestPhone}`)}
                >
                  Send OTP
                </Button>
              </div>
            </div>
          )}

          {/* SECTION C — Method-specific */}
          {(item.method === "Courier" || item.method === "Police handover") && (
            <>
              <SectionHeader
                icon={
                  item.method === "Courier" ? (
                    <Truck className="h-4 w-4 text-brand" />
                  ) : (
                    <Shield className="h-4 w-4 text-brand" />
                  )
                }
                title={`C. ${item.method} details`}
                sub={
                  item.method === "Courier"
                    ? "Shipment information for tracking"
                    : "Police handover documentation"
                }
              />
              {item.method === "Courier" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Courier company</Label>
                    <Select
                      value={courier}
                      onChange={(e) => setCourier(e.target.value as CourierCompany)}
                      className="mt-1"
                    >
                      {COURIERS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Tracking number</Label>
                    <Input
                      value={tracking}
                      onChange={(e) => setTracking(e.target.value)}
                      placeholder="e.g. BD7711-MUM-09421"
                      className="mt-1 tabular"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Delivery address</Label>
                    <Input
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Full address with PIN"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Expected delivery</Label>
                    <Input
                      type="date"
                      value={expDelivery}
                      onChange={(e) => setExpDelivery(e.target.value)}
                      className="mt-1 tabular"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() =>
                        onToast(`Tracking ${tracking || "—"} · opened ${courier} dashboard`)
                      }
                    >
                      <Search className="h-3.5 w-3.5" />
                      Track shipment
                    </Button>
                  </div>
                </div>
              )}
              {item.method === "Police handover" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label className="text-xs">Police station</Label>
                    <Input
                      value={station}
                      onChange={(e) => setStation(e.target.value)}
                      placeholder="e.g. Worli Police Station"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">FIR number</Label>
                    <Input
                      value={fir}
                      onChange={(e) => setFir(e.target.value)}
                      placeholder="FIR/0421/2026"
                      className="mt-1 tabular"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Officer name</Label>
                    <Input
                      value={officer}
                      onChange={(e) => setOfficer(e.target.value)}
                      placeholder="SI / ASI name"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Officer ID</Label>
                    <Input
                      value={officerId}
                      onChange={(e) => setOfficerId(e.target.value)}
                      placeholder="Badge / service ID"
                      className="mt-1 tabular"
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {/* SECTION D — Handover photo + remarks */}
          <SectionHeader
            icon={<Camera className="h-4 w-4 text-brand" />}
            title="D. Handover photo & remarks"
            sub="Capture evidence at the moment of return"
          />
          <button
            onClick={() => onToast("Handover photo captured · stored")}
            className="w-full rounded-md border-2 border-dashed border-border hover:border-brand hover:bg-brand-soft/30 transition-colors p-6 flex flex-col items-center justify-center gap-2 text-muted-foreground"
          >
            <ImageIcon className="h-8 w-8" />
            <div className="text-sm font-medium">Click to upload handover photo</div>
            <div className="text-xs">JPG or PNG · max 5 MB · auto-watermarked</div>
          </button>
          <div>
            <Label htmlFor="remarks" className="text-xs">
              Remarks
            </Label>
            <textarea
              id="remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Any condition notes, observer remarks, exceptions…"
              className="mt-1 w-full min-h-[80px] rounded-md border border-border bg-surface px-3 py-2 text-sm outline-hidden focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
            />
          </div>
        </div>

        {/* FOOTER */}
        <div className="sticky bottom-0 bg-surface border-t border-border p-4 flex items-center justify-between gap-3">
          <Button size="sm" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onToast(`Draft saved for ${item.id}`)}
            >
              Save draft
            </Button>
            <Button size="sm" onClick={complete}>
              <CheckCircle2 className="h-3.5 w-3.5" />
              Complete return + Generate receipt PDF
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  sub,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
}) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <div className="h-7 w-7 rounded-md bg-brand-soft flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <div className="text-sm font-semibold text-foreground">{title}</div>
        <div className="text-xs text-muted-foreground">{sub}</div>
      </div>
    </div>
  );
}

function SigPlaceholder({
  label,
  onSign,
  accent,
}: {
  label: string;
  onSign: () => void;
  accent?: boolean;
}) {
  return (
    <button
      onClick={onSign}
      className={cn(
        "rounded-md border-2 border-dashed p-3 flex flex-col items-center justify-center gap-1.5 transition-colors min-h-[88px]",
        accent
          ? "border-amber-300/60 bg-linear-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 hover:border-amber-400"
          : "border-border hover:border-brand hover:bg-brand-soft/30"
      )}
    >
      <PenLine className={cn("h-5 w-5", accent ? "text-amber-700 dark:text-amber-300" : "text-muted-foreground")} />
      <div className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground">
        {label}
      </div>
      <div className="text-[10px] text-muted-foreground">Tap to sign</div>
    </button>
  );
}
