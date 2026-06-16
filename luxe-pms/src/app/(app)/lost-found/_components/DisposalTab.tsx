"use client";
import * as React from "react";
import {
  Trash2,
  Heart,
  Shield,
  AlertTriangle,
  Info,
  CheckCircle2,
  XCircle,
  Plus,
  Search,
  Camera,
  Upload,
  FileText,
  Building2,
  Gavel,
  PackageX,
  HandHeart,
  Clock,
  Image as ImageIcon,
  X,
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
  daysHeld?: number;
  foundDate?: string;
  storageLocation?: string;
};

const RESOLVED = ["Returned", "Claimed", "Disposed", "Donated"];
const RETENTION_DAYS = 90;

type DisposalType =
  | "Disposed"
  | "Donated"
  | "Destroyed"
  | "Police handover"
  | "Returned to finder"
  | "Auctioned";

type ToneType = "neutral" | "brand" | "success" | "warning" | "danger" | "info" | "accent";

const TYPE_TONE: Record<DisposalType, ToneType> = {
  Disposed: "danger",
  Donated: "success",
  Destroyed: "neutral",
  "Police handover": "info",
  "Returned to finder": "brand",
  Auctioned: "accent",
};

const TYPE_ICON: Record<DisposalType, React.ComponentType<{ className?: string }>> = {
  Disposed: Trash2,
  Donated: Heart,
  Destroyed: PackageX,
  "Police handover": Shield,
  "Returned to finder": HandHeart,
  Auctioned: Gavel,
};

type Pending = {
  id: string;
  item: string;
  category: string;
  daysInStorage: number;
  value: number;
  recommended: DisposalType;
  approver: string;
  hvi?: boolean;
};

type History = {
  id: string;
  date: string;
  item: string;
  type: DisposalType;
  approvedBy: string;
  disposedBy: string;
  witness: string;
  reason: string;
  remarks: string;
};

type Police = {
  id: string;
  item: string;
  station: string;
  fir: string;
  officer: string;
  date: string;
  documents: string;
};

type NGO = {
  name: string;
  category: string;
  count: number;
  unit: string;
};

const PENDING: Pending[] = [
  {
    id: "PND-1041",
    item: "Black leather wallet",
    category: "Wallet",
    daysInStorage: 92,
    value: 1800,
    recommended: "Donated",
    approver: "Anjali Iyer (GM)",
  },
  {
    id: "PND-1042",
    item: "Indian passport — P. Krishnan",
    category: "Documents",
    daysInStorage: 47,
    value: 0,
    recommended: "Police handover",
    approver: "Karan Mehta (FOM)",
  },
  {
    id: "PND-1043",
    item: "Gold-plated wristwatch",
    category: "Watch",
    daysInStorage: 121,
    value: 24500,
    recommended: "Auctioned",
    approver: "Anjali Iyer (GM)",
    hvi: true,
  },
  {
    id: "PND-1044",
    item: "Prescription medicines (assorted)",
    category: "Medicines",
    daysInStorage: 8,
    value: 600,
    recommended: "Destroyed",
    approver: "Dr. Suresh Pillai (Doctor on call)",
  },
  {
    id: "PND-1045",
    item: "Children's clothing bag (6 items)",
    category: "Clothing",
    daysInStorage: 95,
    value: 2200,
    recommended: "Donated",
    approver: "Karan Mehta (FOM)",
  },
  {
    id: "PND-1046",
    item: "Apple AirPods Pro (2nd gen)",
    category: "Electronics",
    daysInStorage: 90,
    value: 19900,
    recommended: "Returned to finder",
    approver: "Anjali Iyer (GM)",
    hvi: true,
  },
  {
    id: "PND-1047",
    item: "Half-eaten birthday cake",
    category: "Perishable",
    daysInStorage: 1,
    value: 0,
    recommended: "Disposed",
    approver: "Priya Krishnan (HK Manager)",
  },
];

const HISTORY: History[] = [
  {
    id: "DSP-2031",
    date: "28 May 2026",
    item: "Used cotton bedsheet (Welspun)",
    type: "Donated",
    approvedBy: "Anjali Iyer",
    disposedBy: "Priya Krishnan",
    witness: "Ramesh Naidu (Security)",
    reason: "Retention expired",
    remarks: "Handed to Goonj — 4 sheets bundle",
  },
  {
    id: "DSP-2030",
    date: "24 May 2026",
    item: "Broken umbrella",
    type: "Destroyed",
    approvedBy: "Karan Mehta",
    disposedBy: "Suresh Yadav",
    witness: "Priya Krishnan",
    reason: "Damaged",
    remarks: "Beyond repair — scrap dealer",
  },
  {
    id: "DSP-2029",
    date: "21 May 2026",
    item: "Voter ID — Mr. Rohit Sharma",
    type: "Police handover",
    approvedBy: "Anjali Iyer",
    disposedBy: "Karan Mehta",
    witness: "Ramesh Naidu",
    reason: "Police handover required",
    remarks: "Worli PS — FIR copy on file",
  },
  {
    id: "DSP-2028",
    date: "18 May 2026",
    item: "Samsung Galaxy S22 (unclaimed)",
    type: "Auctioned",
    approvedBy: "Anjali Iyer",
    disposedBy: "Karan Mehta",
    witness: "Anjali Iyer",
    reason: "No claim",
    remarks: "Auctioned ₹18,400 — proceeds to staff welfare",
  },
  {
    id: "DSP-2027",
    date: "15 May 2026",
    item: "Half-eaten thali leftovers",
    type: "Disposed",
    approvedBy: "Priya Krishnan",
    disposedBy: "HK Pantry",
    witness: "Sunita Devi",
    reason: "Perishable",
    remarks: "Same-day wet waste bin",
  },
  {
    id: "DSP-2026",
    date: "12 May 2026",
    item: "Winter jackets (3 pieces)",
    type: "Donated",
    approvedBy: "Anjali Iyer",
    disposedBy: "Priya Krishnan",
    witness: "Ramesh Naidu",
    reason: "Retention expired",
    remarks: "Goonj — winter drive Mumbai",
  },
  {
    id: "DSP-2025",
    date: "09 May 2026",
    item: "Unmarked medicine strips",
    type: "Destroyed",
    approvedBy: "Dr. Suresh Pillai",
    disposedBy: "Priya Krishnan",
    witness: "Karan Mehta",
    reason: "Cannot identify owner",
    remarks: "BMC bio-medical waste pickup",
  },
  {
    id: "DSP-2024",
    date: "05 May 2026",
    item: "Sony WH-1000XM4 headphones",
    type: "Returned to finder",
    approvedBy: "Anjali Iyer",
    disposedBy: "Karan Mehta",
    witness: "Anjali Iyer",
    reason: "Retention expired",
    remarks: "Finder: Housekeeper Sunita Devi — policy",
  },
  {
    id: "DSP-2023",
    date: "02 May 2026",
    item: "Children's storybooks (12 books)",
    type: "Donated",
    approvedBy: "Karan Mehta",
    disposedBy: "Priya Krishnan",
    witness: "Ramesh Naidu",
    reason: "Retention expired",
    remarks: "Akshara Foundation — Mumbai chapter",
  },
  {
    id: "DSP-2022",
    date: "29 Apr 2026",
    item: "Aadhaar card — A. Iyer (lookalike)",
    type: "Police handover",
    approvedBy: "Anjali Iyer",
    disposedBy: "Karan Mehta",
    witness: "Ramesh Naidu",
    reason: "Police handover required",
    remarks: "Worli PS — DD entry #4421",
  },
];

const POLICE: Police[] = [
  {
    id: "PH-308",
    item: "Voter ID — Mr. Rohit Sharma",
    station: "Worli PS",
    fir: "FIR/2026/1872",
    officer: "SI Pradeep Kamble",
    date: "21 May 2026",
    documents: "Voter ID original + cover letter",
  },
  {
    id: "PH-307",
    item: "Aadhaar card — A. Iyer (lookalike)",
    station: "Worli PS",
    fir: "DD/2026/4421",
    officer: "HC Mahesh Pawar",
    date: "29 Apr 2026",
    documents: "Aadhaar original + DD entry copy",
  },
  {
    id: "PH-306",
    item: "PAN card + driving licence wallet",
    station: "Colaba PS",
    fir: "FIR/2026/1655",
    officer: "PSI Rohini Deshmukh",
    date: "14 Apr 2026",
    documents: "Originals + finder statement",
  },
  {
    id: "PH-305",
    item: "Foreign passport (Singapore)",
    station: "Sahar Airport PS",
    fir: "FIR/2026/1411",
    officer: "Insp. Vivek Gokhale",
    date: "02 Apr 2026",
    documents: "Passport + Consulate intimation",
  },
];

const NGOS: NGO[] = [
  { name: "Goonj", category: "Clothing & linen", count: 18, unit: "items" },
  { name: "Akshara Foundation", category: "Books & stationery", count: 24, unit: "books" },
  { name: "Robin Hood Army", category: "Food & toiletries", count: 9, unit: "kits" },
  { name: "Helpage India", category: "Mobility aids", count: 3, unit: "items" },
];

const TYPES: (DisposalType | "All")[] = [
  "All",
  "Disposed",
  "Donated",
  "Destroyed",
  "Police handover",
  "Returned to finder",
  "Auctioned",
];

const REASONS = [
  "Retention expired",
  "Damaged",
  "No claim",
  "Police handover required",
  "Perishable",
  "Cannot identify owner",
];

const WITNESSES = [
  "Ramesh Naidu (Security)",
  "Priya Krishnan (HK Manager)",
  "Karan Mehta (FOM)",
  "Anjali Iyer (GM)",
  "Sunita Devi (HK Supervisor)",
];

const SEARCH_ITEMS = [
  "Black leather wallet",
  "Indian passport — P. Krishnan",
  "Gold-plated wristwatch",
  "Children's clothing bag",
  "Apple AirPods Pro",
  "Used cotton bedsheets",
  "Broken umbrella",
];

// A disposal status maps a found-item to one of the closed states.
function statusForDisposal(t: DisposalType): string {
  if (t === "Donated") return "Donated";
  if (t === "Returned to finder") return "Returned";
  return "Disposed";
}
function toPending(i: FoundRow): Pending {
  return {
    id: String(i.id),
    item: i.name,
    category: i.category || "—",
    daysInStorage: i.daysHeld ?? 0,
    value: i.value ?? 0,
    recommended: i.hvi ? "Police handover" : (i.value ?? 0) > 0 ? "Donated" : "Disposed",
    approver: "Anjali Iyer (GM)",
    hvi: i.hvi,
  };
}
function toHistory(i: FoundRow): History {
  return {
    id: String(i.id),
    date: i.foundDate || "—",
    item: i.name,
    type: i.status === "Donated" ? "Donated" : "Disposed",
    approvedBy: "Anjali Iyer (GM)",
    disposedBy: "—",
    witness: "—",
    reason: "Retention period expired",
    remarks: "",
  };
}

export default function DisposalTab({ onToast }: { onToast: (m: string) => void }) {
  const [filter, setFilter] = React.useState<(typeof TYPES)[number]>("All");
  const [showInitiate, setShowInitiate] = React.useState(false);

  // Real found-items drive the pending queue and disposal history.
  const [found, setFound] = React.useState<FoundRow[] | null>(null);
  const [dismissed, setDismissed] = React.useState<Set<string>>(new Set());
  React.useEffect(() => {
    let cancelled = false;
    apiGet<FoundRow[]>("/found-items")
      .then((r) => { if (!cancelled && r.length) setFound(r); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);
  const live = !!(found && found.length);

  // modal local state
  const [mItem, setMItem] = React.useState("");
  const [mType, setMType] = React.useState<DisposalType>("Disposed");
  const [mReason, setMReason] = React.useState(REASONS[0]);
  const [mApproved, setMApproved] = React.useState(false);
  const [mWitness, setMWitness] = React.useState(WITNESSES[0]);
  const [mPhoto, setMPhoto] = React.useState<string>("");

  const pending: Pending[] = (live
    ? found!
        .filter((i) => (i.daysHeld ?? 0) >= RETENTION_DAYS && !RESOLVED.includes(i.status ?? ""))
        .map(toPending)
    : PENDING
  ).filter((p) => !dismissed.has(p.id));

  const history: History[] = live
    ? found!.filter((i) => i.status === "Disposed" || i.status === "Donated").map(toHistory)
    : HISTORY;

  // Names offered in the "initiate disposal" item picker.
  const initiateOptions = live
    ? found!.filter((i) => !RESOLVED.includes(i.status ?? "")).map((i) => i.name)
    : SEARCH_ITEMS;

  const stats = React.useMemo(() => {
    if (live) {
      return {
        pending: pending.length,
        disposed: history.filter((h) => h.type === "Disposed" || h.type === "Destroyed").length,
        donated: history.filter((h) => h.type === "Donated").length,
        police: history.filter((h) => h.type === "Police handover").length,
      };
    }
    const monthCount = (t: DisposalType) => HISTORY.filter(h => h.type === t && h.date.includes("May 2026")).length;
    return {
      pending: pending.length,
      disposed: monthCount("Disposed") + monthCount("Destroyed"),
      donated: monthCount("Donated"),
      police: monthCount("Police handover"),
    };
  }, [live, pending.length, history]);

  const filteredHistory = React.useMemo(() => {
    if (filter === "All") return history;
    return history.filter(h => h.type === filter);
  }, [filter, history]);

  const approve = (p: Pending) => {
    const status = statusForDisposal(p.recommended);
    apiPut(`/found-items/${p.id}`, { status })
      .then(() => {
        setFound((prev) => (prev ? prev.map((f) => (String(f.id) === p.id ? { ...f, status } : f)) : prev));
        onToast(`${p.item} approved for ${p.recommended.toLowerCase()} — workflow triggered`);
      })
      .catch(() => onToast("⚠ Save failed — backend offline"));
  };

  const reject = (p: Pending) => {
    setDismissed((prev) => new Set(prev).add(p.id));
    onToast(`${p.item} rejected — returned to storage queue`);
  };

  const submitInitiate = () => {
    if (!mItem) {
      onToast("Please select an item first");
      return;
    }
    if (!mApproved) {
      onToast("Manager approval is required to proceed");
      return;
    }
    const target = live ? found!.find((f) => f.name === mItem) : null;
    const done = () => {
      setShowInitiate(false);
      onToast(`Disposal initiated for "${mItem}" (${mType}) — witnessed by ${mWitness.split(" (")[0]}`);
      setMItem("");
      setMType("Disposed");
      setMReason(REASONS[0]);
      setMApproved(false);
      setMWitness(WITNESSES[0]);
      setMPhoto("");
    };
    if (target) {
      const status = statusForDisposal(mType);
      apiPut(`/found-items/${target.id}`, { status })
        .then(() => {
          setFound((prev) => (prev ? prev.map((f) => (f.id === target.id ? { ...f, status } : f)) : prev));
          done();
        })
        .catch(() => onToast("⚠ Save failed — backend offline"));
    } else {
      done();
    }
  };

  return (
    <div className="space-y-4">
      {/* Policy banner */}
      <Card className="border-info-soft bg-info-soft/40 p-4">
        <div className="flex items-start gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-info-soft text-info">
            <Info className="h-4 w-4" />
          </div>
          <div className="space-y-1">
            <div className="text-sm font-semibold text-foreground">Disposal Policy — The Pearl Marina</div>
            <div className="text-xs text-muted-foreground leading-relaxed">
              Low-value items: dispose after retention period · High-value items: manager approval · Documents/passports:
              police handover · Perishables: same-day disposal · Medicines: safety disposal.
            </div>
          </div>
        </div>
      </Card>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          icon={<Clock className="h-4 w-4" />}
          label="Pending approval"
          value={String(stats.pending).padStart(2, "0")}
          sub="awaiting manager sign-off"
          tone="warning"
        />
        <KpiCard
          icon={<Trash2 className="h-4 w-4" />}
          label="Disposed this month"
          value={String(stats.disposed).padStart(2, "0")}
          sub="May 2026 · low-value + medical"
          tone="danger"
        />
        <KpiCard
          icon={<Heart className="h-4 w-4" />}
          label="Donated this month"
          value={String(stats.donated).padStart(2, "0")}
          sub="NGO partners · CSR ledger"
          tone="success"
        />
        <KpiCard
          icon={<Shield className="h-4 w-4" />}
          label="Police handover"
          value={String(stats.police).padStart(2, "0")}
          sub="documents & IDs · this month"
          tone="info"
        />
      </div>

      {/* Filter chips + initiate button */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {TYPES.map(t => {
            const active = filter === t;
            return (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                  active
                    ? "border-brand bg-brand-soft text-brand-soft-foreground"
                    : "border-border bg-surface text-muted-foreground hover:bg-surface-sunken hover:text-foreground"
                )}
              >
                {t !== "All" && React.createElement(TYPE_ICON[t as DisposalType], { className: "h-3 w-3" })}
                {t}
                {t !== "All" && (
                  <span className="tabular text-[10px] opacity-70">
                    {history.filter(h => h.type === t).length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <Button size="sm" onClick={() => setShowInitiate(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Initiate disposal
        </Button>
      </div>

      {/* Pending Approval */}
      <Card className="overflow-hidden border-warning-soft">
        <div className="flex items-center justify-between border-b border-warning-soft bg-warning-soft/40 px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <div className="text-sm font-semibold text-foreground">Pending approval</div>
            <Badge tone="warning">{pending.length} items</Badge>
          </div>
          <button
            onClick={() => onToast("Bulk approval workflow — sent to GM dashboard")}
            className="text-xs font-medium text-warning hover:underline"
          >
            Bulk approve →
          </button>
        </div>
        {pending.length === 0 ? (
          <div className="grid place-items-center py-10 text-sm text-muted-foreground">
            <CheckCircle2 className="mb-2 h-6 w-6 text-success" />
            All caught up — no items awaiting approval.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-sunken/40">
              <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-2 font-semibold">Item</th>
                <th className="px-4 py-2 font-semibold">Days in storage</th>
                <th className="px-4 py-2 font-semibold">Value</th>
                <th className="px-4 py-2 font-semibold">Recommended</th>
                <th className="px-4 py-2 font-semibold">Approver</th>
                <th className="px-4 py-2 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {pending.map(p => {
                const Icon = TYPE_ICON[p.recommended];
                return (
                  <tr key={p.id} className="border-t border-border hover:bg-surface-sunken/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {p.hvi && (
                          <span className="grid h-6 w-6 place-items-center rounded-md bg-linear-to-br from-amber-400 to-orange-500 text-white">
                            <span className="text-[9px] font-bold">HVI</span>
                          </span>
                        )}
                        <div>
                          <div className="font-medium text-foreground">{p.item}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {p.id} · {p.category}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "tabular font-medium",
                          p.daysInStorage > 90 ? "text-danger" : p.daysInStorage > 30 ? "text-warning" : "text-foreground"
                        )}
                      >
                        {p.daysInStorage}
                      </span>{" "}
                      <span className="text-xs text-muted-foreground">days</span>
                    </td>
                    <td className="px-4 py-3 tabular text-foreground">{p.value > 0 ? money(p.value) : "—"}</td>
                    <td className="px-4 py-3">
                      <Badge tone={TYPE_TONE[p.recommended]}>
                        <Icon className="h-3 w-3" />
                        {p.recommended}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{p.approver}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button size="sm" variant="outline" onClick={() => reject(p)}>
                          <XCircle className="mr-1 h-3 w-3" /> Reject
                        </Button>
                        <Button size="sm" onClick={() => approve(p)}>
                          <CheckCircle2 className="mr-1 h-3 w-3" /> Approve
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      {/* History table + NGOs side panel */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="overflow-hidden lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="text-sm font-semibold text-foreground">
              Disposal history
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                · {filteredHistory.length} records {filter !== "All" && `(${filter})`}
              </span>
            </div>
            <Button size="sm" variant="ghost" onClick={() => onToast("Disposal log exported as PDF")}>
              <FileText className="mr-1.5 h-3.5 w-3.5" /> Export log
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-sunken/40">
                <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-2 font-semibold">Date</th>
                  <th className="px-3 py-2 font-semibold">Item</th>
                  <th className="px-3 py-2 font-semibold">Type</th>
                  <th className="px-3 py-2 font-semibold">Approved by</th>
                  <th className="px-3 py-2 font-semibold">Disposed by</th>
                  <th className="px-3 py-2 font-semibold">Witness</th>
                  <th className="px-3 py-2 font-semibold">Reason</th>
                  <th className="px-3 py-2 font-semibold">Photo</th>
                  <th className="px-3 py-2 font-semibold">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map(h => {
                  const Icon = TYPE_ICON[h.type];
                  return (
                    <tr key={h.id} className="border-t border-border hover:bg-surface-sunken/30">
                      <td className="px-3 py-2.5 text-xs text-muted-foreground tabular whitespace-nowrap">{h.date}</td>
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-foreground">{h.item}</div>
                        <div className="text-[11px] text-muted-foreground">{h.id}</div>
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge tone={TYPE_TONE[h.type]}>
                          <Icon className="h-3 w-3" />
                          {h.type}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 text-xs">{h.approvedBy}</td>
                      <td className="px-3 py-2.5 text-xs">{h.disposedBy}</td>
                      <td className="px-3 py-2.5 text-xs">{h.witness}</td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{h.reason}</td>
                      <td className="px-3 py-2.5">
                        <button
                          onClick={() => onToast(`Opening disposal photo for ${h.id}`)}
                          className="grid h-9 w-9 place-items-center rounded-md border border-border bg-surface-sunken/60 hover:bg-surface-sunken"
                        >
                          <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground max-w-[220px]">{h.remarks}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* NGO beneficiaries */}
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-success-soft text-success">
                <Heart className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">Donation beneficiaries</div>
                <div className="text-[11px] text-muted-foreground">Q2 FY26 · CSR partners</div>
              </div>
            </div>
            <button
              onClick={() => onToast("Add new NGO partner — vendor onboarding flow")}
              className="text-xs font-medium text-brand hover:underline"
            >
              + Add
            </button>
          </div>
          <div className="space-y-2">
            {NGOS.map(n => (
              <button
                key={n.name}
                onClick={() => onToast(`Viewing donation history for ${n.name}`)}
                className="flex w-full items-center justify-between rounded-lg border border-border bg-surface px-3 py-2.5 text-left hover:bg-surface-sunken/50"
              >
                <div>
                  <div className="text-sm font-medium text-foreground">{n.name}</div>
                  <div className="text-[11px] text-muted-foreground">{n.category}</div>
                </div>
                <div className="text-right">
                  <div className="tabular text-sm font-semibold text-success">{n.count}</div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{n.unit}</div>
                </div>
              </button>
            ))}
          </div>
          <div className="mt-3 rounded-md bg-success-soft/40 p-2.5 text-[11px] text-success">
            Goonj — 18 clothing items donated this quarter · pickup scheduled 04 Jun
          </div>
        </Card>
      </div>

      {/* Police handover log */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-info-soft text-info">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">Police handover log</div>
              <div className="text-[11px] text-muted-foreground">Documents, IDs & high-value contraband · audit trail</div>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => onToast("Police handover trail downloaded (PDF + photos)")}>
            <FileText className="mr-1.5 h-3.5 w-3.5" /> Audit trail
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-sunken/40">
              <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-2 font-semibold">Ref</th>
                <th className="px-4 py-2 font-semibold">Item</th>
                <th className="px-4 py-2 font-semibold">Police station</th>
                <th className="px-4 py-2 font-semibold">FIR / DD #</th>
                <th className="px-4 py-2 font-semibold">Officer</th>
                <th className="px-4 py-2 font-semibold">Date</th>
                <th className="px-4 py-2 font-semibold">Documents trail</th>
                <th className="px-4 py-2 font-semibold text-right"></th>
              </tr>
            </thead>
            <tbody>
              {POLICE.map(p => (
                <tr key={p.id} className="border-t border-border hover:bg-surface-sunken/30">
                  <td className="px-4 py-3 text-xs font-mono text-muted-foreground tabular">{p.id}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{p.item}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs">{p.station}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone="info">{p.fir}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs">{p.officer}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground tabular whitespace-nowrap">{p.date}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground max-w-[260px]">{p.documents}</td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onToast(`Opening full chain-of-custody for ${p.id}`)}
                    >
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Initiate Disposal Modal */}
      {showInitiate && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-soft text-brand">
                  <Trash2 className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">Initiate disposal</div>
                  <div className="text-[11px] text-muted-foreground">Follow disposal policy — all fields required</div>
                </div>
              </div>
              <button
                onClick={() => setShowInitiate(false)}
                className="grid h-8 w-8 place-items-center rounded-md hover:bg-surface-sunken"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 px-5 py-5">
              {/* Item search */}
              <div className="space-y-1.5">
                <Label>Select item</Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    list="dsp-items"
                    placeholder="Search by ID, item name, or category…"
                    value={mItem}
                    onChange={e => setMItem(e.target.value)}
                    className="pl-9"
                  />
                  <datalist id="dsp-items">
                    {initiateOptions.map(s => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Type + reason */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Disposal type</Label>
                  <Select value={mType} onChange={e => setMType(e.target.value as DisposalType)}>
                    {(Object.keys(TYPE_TONE) as DisposalType[]).map(t => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Reason</Label>
                  <Select value={mReason} onChange={e => setMReason(e.target.value)}>
                    {REASONS.map(r => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              {/* Manager approval checkbox */}
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-surface-sunken/40 p-3">
                <input
                  type="checkbox"
                  checked={mApproved}
                  onChange={e => setMApproved(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-border accent-brand"
                />
                <div className="text-xs">
                  <div className="font-semibold text-foreground">Manager approval obtained</div>
                  <div className="text-muted-foreground">
                    Required for all high-value items, police handovers, and donations · approver name will be auto-logged
                    from your role.
                  </div>
                </div>
              </label>

              {/* Witness staff */}
              <div className="space-y-1.5">
                <Label>Witness staff</Label>
                <Select value={mWitness} onChange={e => setMWitness(e.target.value)}>
                  {WITNESSES.map(w => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Photo upload */}
              <div className="space-y-1.5">
                <Label>Disposal photo</Label>
                <button
                  type="button"
                  onClick={() => {
                    setMPhoto("disposal-2026-06-02.jpg");
                    onToast("Disposal photo uploaded — 2.4 MB");
                  }}
                  className={cn(
                    "flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-surface-sunken/30 p-6 hover:bg-surface-sunken/50",
                    mPhoto && "border-success bg-success-soft/30"
                  )}
                >
                  {mPhoto ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-success" />
                      <div className="text-xs font-medium text-success">{mPhoto}</div>
                      <div className="text-[10px] text-muted-foreground">Tap to replace</div>
                    </>
                  ) : (
                    <>
                      <div className="grid h-9 w-9 place-items-center rounded-full bg-surface text-muted-foreground">
                        <Camera className="h-4 w-4" />
                      </div>
                      <div className="text-xs font-medium text-foreground">Tap to capture or upload</div>
                      <div className="text-[10px] text-muted-foreground">
                        Required for compliance · JPG/PNG up to 5 MB
                      </div>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-border bg-surface-sunken/40 px-5 py-3">
              <div className="text-[11px] text-muted-foreground">
                Action will be logged in the audit trail with timestamp.
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setShowInitiate(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={submitInitiate}>
                  <Upload className="mr-1.5 h-3.5 w-3.5" /> Submit disposal
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  tone: "warning" | "danger" | "success" | "info";
}) {
  const toneMap: Record<typeof tone, string> = {
    warning: "bg-warning-soft text-warning",
    danger: "bg-danger-soft text-danger",
    success: "bg-success-soft text-success",
    info: "bg-info-soft text-info",
  };
  return (
    <Card className="p-3.5">
      <div className="flex items-start gap-3">
        <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg", toneMap[tone])}>{icon}</div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="mt-0.5 tabular text-xl font-bold text-foreground">{value}</div>
          <div className="text-[11px] text-muted-foreground truncate">{sub}</div>
        </div>
      </div>
    </Card>
  );
}
