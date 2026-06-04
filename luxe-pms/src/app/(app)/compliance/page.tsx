"use client";
import * as React from "react";
import Link from "next/link";
import {
  ShieldCheck, FileText, AlertTriangle, Calendar, Download, Upload, CheckCircle2,
  Clock, Bell, ExternalLink, FileCheck, Receipt, Building2, Users, Flag,
  IndianRupee, X, Plus, Eye, Send, Search, Pencil, Trash2, RefreshCw, Save,
  ChevronRight, FileBarChart, TrendingUp, Globe,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn, money } from "@/lib/utils";

// ============================================================
// TYPES + SEED
// ============================================================
type ComplianceTab = "overview" | "gstr" | "formC" | "licenses" | "tds" | "einvoice";

type License = {
  id: string;
  name: string;
  authority: string;
  number: string;
  issueDate: string;
  expiryDate: string;
  daysToExpiry: number;
  fee: number;
  status: "active" | "expiring_soon" | "expired" | "in_renewal";
  documents: { name: string; uploadedAt: string }[];
  reminders: number[]; // days before
};

const LICENSES_SEED: License[] = [
  { id: "l1", name: "FSSAI Food License",        authority: "FSSAI",                  number: "10012042024500",   issueDate: "2024-06-15", expiryDate: "2026-06-14", daysToExpiry: 12,  fee: 7500,    status: "expiring_soon", documents: [{ name: "FSSAI_certificate.pdf", uploadedAt: "2024-06-20" }], reminders: [90, 60, 30, 15, 7] },
  { id: "l2", name: "Excise / Bar License (FL3)", authority: "State Excise Dept",      number: "EXC/MH/2024/4521", issueDate: "2024-04-01", expiryDate: "2026-03-31", daysToExpiry: -62,  fee: 285000,  status: "expired",       documents: [], reminders: [90, 60, 30] },
  { id: "l3", name: "Fire NOC",                  authority: "MFB Mumbai",             number: "MFB/2024/8821",    issueDate: "2024-08-10", expiryDate: "2027-08-09", daysToExpiry: 433, fee: 18500,   status: "active",        documents: [{ name: "Fire_NOC_renewal_2024.pdf", uploadedAt: "2024-08-15" }], reminders: [90, 60, 30] },
  { id: "l4", name: "Pollution NOC",             authority: "MPCB",                   number: "MPCB/H/2023/1144", issueDate: "2023-12-01", expiryDate: "2026-11-30", daysToExpiry: 181, fee: 25000,   status: "active",        documents: [{ name: "MPCB_consent_2023.pdf", uploadedAt: "2024-01-05" }], reminders: [90, 60, 30] },
  { id: "l5", name: "Lift Inspection",           authority: "Public Works Dept",      number: "PWD/LFT/2025/512", issueDate: "2025-02-20", expiryDate: "2026-02-19", daysToExpiry: -101, fee: 4500,    status: "expired",       documents: [], reminders: [60, 30, 15] },
  { id: "l6", name: "Trade License",             authority: "BMC",                    number: "BMC/TR/H/4421",    issueDate: "2025-04-01", expiryDate: "2026-03-31", daysToExpiry: -62,  fee: 12000,   status: "expired",       documents: [], reminders: [60, 30, 15] },
  { id: "l7", name: "Music License (PPL+IPRS)",  authority: "PPL + IPRS",             number: "PPL/2025/H/8911",  issueDate: "2025-01-15", expiryDate: "2026-01-14", daysToExpiry: -138, fee: 85000,   status: "expired",       documents: [{ name: "PPL_invoice_2025.pdf", uploadedAt: "2025-01-20" }], reminders: [60, 30] },
  { id: "l8", name: "Shop & Establishment",      authority: "Labour Dept",            number: "SE/MH/B/01211",    issueDate: "2024-09-01", expiryDate: "2027-08-31", daysToExpiry: 455, fee: 6500,    status: "active",        documents: [{ name: "SE_certificate.pdf", uploadedAt: "2024-09-05" }], reminders: [90, 60] },
  { id: "l9", name: "Property Tax (annual)",     authority: "BMC",                    number: "PT/2026/H/4421",   issueDate: "2025-04-01", expiryDate: "2026-03-31", daysToExpiry: -62,  fee: 425000,  status: "expired",       documents: [], reminders: [60, 30, 15, 7] },
  { id: "l10", name: "Boiler Inspection",        authority: "Boiler Inspectorate",    number: "BL/MH/2024/0987",  issueDate: "2024-11-10", expiryDate: "2026-11-09", daysToExpiry: 160, fee: 15500,   status: "active",        documents: [{ name: "Boiler_cert.pdf", uploadedAt: "2024-11-15" }], reminders: [60, 30] },
];

type FormCRegistration = {
  id: string;
  guestName: string;
  passportNo: string;
  nationality: string;
  visaNo: string;
  visaExpiry: string;
  arrivalAt: string;
  departureAt: string;
  roomNo: string;
  reportedToFrro: boolean;
  reportedAt?: string;
};

const FORM_C_SEED: FormCRegistration[] = [
  { id: "fc1", guestName: "Mr. Lee Chang",      passportNo: "EE3812746",  nationality: "China",    visaNo: "VC8821",  visaExpiry: "2026-08-15", arrivalAt: "2026-05-26 16:00", departureAt: "2026-05-29 11:00", roomNo: "1201", reportedToFrro: true,  reportedAt: "2026-05-26 17:12" },
  { id: "fc2", guestName: "Mr. Ahmed Al-Hassan", passportNo: "SA9912045",  nationality: "Saudi Arabia", visaNo: "VS-7821", visaExpiry: "2026-12-01", arrivalAt: "2026-05-25 14:00", departureAt: "2026-05-28 12:00", roomNo: "508",  reportedToFrro: true,  reportedAt: "2026-05-25 14:45" },
  { id: "fc3", guestName: "Mrs. Sarah Whitfield", passportNo: "P1238765",  nationality: "UK",       visaNo: "TR-WH-21", visaExpiry: "2026-06-20", arrivalAt: "2026-05-24 19:30", departureAt: "2026-05-26 11:00", roomNo: "412",  reportedToFrro: true,  reportedAt: "2026-05-24 20:15" },
  { id: "fc4", guestName: "Mr. James Patrick",    passportNo: "AU7745812", nationality: "Australia", visaNo: "TR-AUS-92", visaExpiry: "2026-07-10", arrivalAt: "2026-05-26 09:00", departureAt: "2026-05-30 11:00", roomNo: "615",  reportedToFrro: false },
  { id: "fc5", guestName: "Ms. Yui Tanaka",      passportNo: "TK4498712",  nationality: "Japan",    visaNo: "VJ-2026", visaExpiry: "2026-09-30", arrivalAt: "2026-05-25 11:20", departureAt: "2026-05-27 11:00", roomNo: "308",  reportedToFrro: true,  reportedAt: "2026-05-25 12:00" },
];

type GstRow = { label: string; taxable: number; igst: number; cgst: number; sgst: number };
const GSTR1_ROWS: GstRow[] = [
  { label: "B2B (registered)",            taxable: 1850000, igst: 333000, cgst: 0,       sgst: 0      },
  { label: "B2C large (intra-state)",     taxable: 6850000, igst: 0,      cgst: 616500,  sgst: 616500 },
  { label: "B2C small",                   taxable: 4250000, igst: 0,      cgst: 382500,  sgst: 382500 },
  { label: "Export of services (zero)",   taxable: 85000,   igst: 0,      cgst: 0,       sgst: 0      },
  { label: "Credit / debit notes",        taxable: -28500,  igst: -5130,  cgst: 0,       sgst: 0      },
];

type TdsRow = { id: string; section: string; description: string; partyType: string; amount: number; rate: number; tds: number };
const TDS_SEED: TdsRow[] = [
  { id: "t1", section: "194C", description: "Housekeeping contract · Sparkle Cleaners",   partyType: "Contractor", amount: 285000, rate: 2,   tds: 5700 },
  { id: "t2", section: "194I", description: "Office space rent",                          partyType: "Landlord",   amount: 125000, rate: 10,  tds: 12500 },
  { id: "t3", section: "194J", description: "CA fees · KPMG audit",                       partyType: "Professional",amount: 85000,  rate: 10,  tds: 8500 },
  { id: "t4", section: "194H", description: "Commission · Travel agent Kesari",           partyType: "Agent",      amount: 145000, rate: 5,   tds: 7250 },
  { id: "t5", section: "194Q", description: "Bulk linen purchase · Welspun Mills",        partyType: "Supplier",   amount: 425000, rate: 0.1, tds: 425 },
  { id: "t6", section: "194O", description: "E-commerce ops · Booking.com commission",    partyType: "E-com op",   amount: 1280000, rate: 1,  tds: 12800 },
];

type EInvoice = { id: string; invoiceNo: string; partyName: string; date: string; amount: number; irn: string; ackNo: string; status: "generated" | "pending" | "failed"; reason?: string };
const EINVOICES_SEED: EInvoice[] = [
  { id: "e1", invoiceNo: "INV/2026/04421", partyName: "Infosys Ltd",          date: "2026-05-26", amount: 285000, irn: "8a7f5e2d9c1b4f6e3d8a7f5e2d9c1b4f6e3d8a7f5e2d9c1b4f6e3d8a7f5e2d9c", ackNo: "112000245412", status: "generated" },
  { id: "e2", invoiceNo: "INV/2026/04422", partyName: "TCS",                  date: "2026-05-26", amount: 148000, irn: "9b8c6e3d0c2b5f7e4d9a8f6e3d0c2b5f7e4d9a8f6e3d0c2b5f7e4d9a8f6e3d0c", ackNo: "112000245418", status: "generated" },
  { id: "e3", invoiceNo: "INV/2026/04423", partyName: "Reliance Industries",  date: "2026-05-26", amount: 425000, irn: "0c9d7f4e1d3c6f8e5e0b9c7f4e1d3c6f8e5e0b9c7f4e1d3c6f8e5e0b9c7f4e1d", ackNo: "112000245425", status: "generated" },
  { id: "e4", invoiceNo: "INV/2026/04424", partyName: "Mahindra & Mahindra",  date: "2026-05-26", amount: 62000,  irn: "",                                                                       ackNo: "",            status: "pending" },
  { id: "e5", invoiceNo: "INV/2026/04425", partyName: "Anjali Iyer (Pvt)",    date: "2026-05-26", amount: 42800,  irn: "",                                                                       ackNo: "",            status: "failed", reason: "Recipient GSTIN invalid" },
];

// ============================================================
// MAIN PAGE
// ============================================================
export default function CompliancePage() {
  const [tab, setTab] = React.useState<ComplianceTab>("overview");
  const [licenses, setLicenses] = React.useState<License[]>(LICENSES_SEED);
  const [toast, setToast] = React.useState<string | null>(null);
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };

  const expiredCount = licenses.filter(l => l.status === "expired").length;
  const expiringSoonCount = licenses.filter(l => l.status === "expiring_soon").length;
  const formCPending = FORM_C_SEED.filter(f => !f.reportedToFrro).length;
  const eInvoiceFailed = EINVOICES_SEED.filter(e => e.status === "failed" || e.status === "pending").length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="h-12 w-12 rounded-xl bg-linear-to-br from-emerald-500 to-teal-500 text-white inline-flex items-center justify-center shadow-md">
            <ShieldCheck className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-display font-medium tracking-tight">Indian Compliance Pack</h1>
            <p className="text-muted-foreground text-sm mt-1">GST · FRRO Form C · License renewals · TDS / TCS · e-Invoice — everything in one place</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button onClick={() => showToast("Property: The Pearl Marina · GSTIN 27ABCDE1234F1Z5 · PAN ABCDE1234F")} className="h-8 inline-flex items-center gap-1.5 px-3 rounded-md border border-border hover:bg-surface-sunken text-xs font-medium">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />The Pearl Marina · Mumbai
          </button>
          <Button variant="outline" size="sm" onClick={() => showToast("Compliance reports opened")}>
            <FileBarChart className="h-3.5 w-3.5" />Reports
          </Button>
          <Button variant="outline" size="sm" onClick={() => showToast("Compliance digest emailed to CA + owner")}>
            <Send className="h-3.5 w-3.5" />Email digest
          </Button>
          <Button size="sm" onClick={() => showToast("Refreshed · all integrations synced")}>
            <RefreshCw className="h-3.5 w-3.5" />Sync now
          </Button>
        </div>
      </div>

      {/* ATTENTION BANNER */}
      {(expiredCount > 0 || expiringSoonCount > 0 || formCPending > 0 || eInvoiceFailed > 0) && (
        <Card className="p-3 bg-danger-soft/10 border-danger/30">
          <div className="flex items-center gap-3 flex-wrap">
            <AlertTriangle className="h-5 w-5 text-danger shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-sm">Action required</p>
              <p className="text-[11px] text-muted-foreground">
                {expiredCount > 0 && <><span className="text-danger font-semibold">{expiredCount} expired licenses</span> · </>}
                {expiringSoonCount > 0 && <><span className="text-warning font-semibold">{expiringSoonCount} expiring soon</span> · </>}
                {formCPending > 0 && <><span className="text-danger font-semibold">{formCPending} Form C pending FRRO</span> · </>}
                {eInvoiceFailed > 0 && <><span className="text-warning font-semibold">{eInvoiceFailed} e-Invoice issues</span></>}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* SUB-TABS */}
      <div className="border-b border-border flex flex-wrap gap-1 overflow-x-auto">
        {([
          { id: "overview",  label: "Overview",       icon: ShieldCheck },
          { id: "gstr",      label: "GSTR-1 / 3B",    icon: Receipt },
          { id: "formC",     label: "Form C (FRRO)",  icon: Globe,  badge: formCPending },
          { id: "licenses",  label: "License calendar", icon: Calendar, badge: expiredCount + expiringSoonCount },
          { id: "tds",       label: "TDS / TCS",      icon: IndianRupee },
          { id: "einvoice",  label: "e-Invoice",      icon: FileCheck, badge: eInvoiceFailed },
        ] as const).map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id as ComplianceTab)} className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 inline-flex items-center gap-2 transition-colors whitespace-nowrap",
              tab === t.id ? "border-brand text-brand" : "border-transparent text-muted-foreground hover:text-foreground"
            )}>
              <Icon className="h-3.5 w-3.5" />{t.label}
              {"badge" in t && t.badge !== undefined && t.badge > 0 && (
                <span className="ml-1 tabular text-[10px] rounded-full px-1.5 h-4 inline-flex items-center font-semibold bg-danger text-white">{t.badge}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* OVERVIEW */}
      {tab === "overview" && <OverviewTab licenses={licenses} setTab={setTab} />}

      {/* GSTR */}
      {tab === "gstr" && <GstrTab onToast={showToast} />}

      {/* FORM C */}
      {tab === "formC" && <FormCTab onToast={showToast} />}

      {/* LICENSE CALENDAR */}
      {tab === "licenses" && (
        <LicensesTab licenses={licenses} setLicenses={setLicenses} onToast={showToast} />
      )}

      {/* TDS / TCS */}
      {tab === "tds" && <TdsTab onToast={showToast} />}

      {/* E-INVOICE */}
      {tab === "einvoice" && <EinvoiceTab onToast={showToast} />}

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
// OVERVIEW TAB
// ============================================================
function OverviewTab({ licenses, setTab }: { licenses: License[]; setTab: (t: ComplianceTab) => void }) {
  const totalTax = GSTR1_ROWS.reduce((t, r) => t + r.igst + r.cgst + r.sgst, 0);
  const totalTaxable = GSTR1_ROWS.reduce((t, r) => t + r.taxable, 0);
  const tdsTotal = TDS_SEED.reduce((t, r) => t + r.tds, 0);
  const upcomingLicenses = [...licenses].sort((a, b) => a.daysToExpiry - b.daysToExpiry).slice(0, 6);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button onClick={() => setTab("gstr")} className="text-left">
          <Card className="p-4 hover:border-brand transition-colors">
            <span className="h-8 w-8 rounded-md bg-info-soft text-info inline-flex items-center justify-center mb-2"><Receipt className="h-4 w-4" /></span>
            <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">GST liability (May)</p>
            <p className="text-xl font-bold tabular mt-0.5">{money(totalTax)}</p>
            <p className="text-[10px] text-muted-foreground">on {money(totalTaxable)} taxable</p>
          </Card>
        </button>
        <button onClick={() => setTab("formC")} className="text-left">
          <Card className="p-4 hover:border-brand transition-colors">
            <span className="h-8 w-8 rounded-md bg-warning-soft text-warning inline-flex items-center justify-center mb-2"><Globe className="h-4 w-4" /></span>
            <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Form C this month</p>
            <p className="text-xl font-bold tabular mt-0.5">{FORM_C_SEED.length}</p>
            <p className="text-[10px] text-muted-foreground">{FORM_C_SEED.filter(f => !f.reportedToFrro).length} pending FRRO upload</p>
          </Card>
        </button>
        <button onClick={() => setTab("licenses")} className="text-left">
          <Card className="p-4 hover:border-brand transition-colors">
            <span className="h-8 w-8 rounded-md bg-danger-soft text-danger inline-flex items-center justify-center mb-2"><Calendar className="h-4 w-4" /></span>
            <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">License action items</p>
            <p className="text-xl font-bold tabular mt-0.5">{licenses.filter(l => l.status === "expired" || l.status === "expiring_soon").length}</p>
            <p className="text-[10px] text-muted-foreground">{licenses.filter(l => l.status === "expired").length} expired · {licenses.filter(l => l.status === "expiring_soon").length} expiring</p>
          </Card>
        </button>
        <button onClick={() => setTab("tds")} className="text-left">
          <Card className="p-4 hover:border-brand transition-colors">
            <span className="h-8 w-8 rounded-md bg-accent-soft text-accent inline-flex items-center justify-center mb-2"><IndianRupee className="h-4 w-4" /></span>
            <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">TDS deducted (May)</p>
            <p className="text-xl font-bold tabular mt-0.5">{money(tdsTotal)}</p>
            <p className="text-[10px] text-muted-foreground">across {TDS_SEED.length} sections</p>
          </Card>
        </button>
      </div>

      {/* Compliance health score */}
      <Card className="p-4 bg-linear-to-r from-emerald-500/10 to-teal-500/10 border-emerald-500/20">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="h-10 w-10 rounded-md bg-emerald-500/15 text-emerald-600 inline-flex items-center justify-center"><TrendingUp className="h-5 w-5" /></span>
            <div>
              <p className="text-sm font-semibold">Compliance health score: 84 / 100 <span className="text-success font-bold inline-flex items-center gap-0.5"><TrendingUp className="h-3 w-3" />+6 vs last month</span></p>
              <p className="text-[11px] text-muted-foreground">GST 95% · FRRO 80% · Licenses 72% · TDS 100% · e-Invoice 92% — fix expired licenses to reach 95+</p>
            </div>
          </div>
          <Badge tone="success">Healthy</Badge>
        </div>
      </Card>

      {/* Compliance calendar */}
      <Card className="p-4">
        <p className="font-semibold mb-3 inline-flex items-center gap-2"><Calendar className="h-4 w-4 text-brand" />Statutory compliance calendar · next 30 days</p>
        <div className="space-y-1.5">
          {([
            { date: "2026-06-07", task: "Pay TDS for May 2026 (challan 281)",          deadline: "7 June",  severity: "high" as const,    section: "TDS" },
            { date: "2026-06-10", task: "File GSTR-1 for May 2026",                    deadline: "10 June", severity: "high" as const,    section: "GST" },
            { date: "2026-06-14", task: "Renew FSSAI Food License",                    deadline: "14 June", severity: "critical" as const,section: "License" },
            { date: "2026-06-15", task: "Pay advance tax · Q1 (15%)",                  deadline: "15 June", severity: "high" as const,    section: "Income tax" },
            { date: "2026-06-20", task: "File GSTR-3B for May 2026",                   deadline: "20 June", severity: "high" as const,    section: "GST" },
            { date: "2026-06-25", task: "File ESI / PF returns",                       deadline: "25 June", severity: "medium" as const,  section: "Labour" },
            { date: "2026-06-30", task: "Upload Form C for all foreign guests · May",  deadline: "30 June", severity: "high" as const,    section: "FRRO" },
          ]).map((c, i) => (
            <div key={i} className="flex items-center gap-3 p-2.5 rounded-md hover:bg-surface-sunken/40">
              <span className={cn(
                "h-9 w-9 rounded-md inline-flex items-center justify-center shrink-0 font-bold tabular text-xs",
                c.severity === "critical" ? "bg-danger text-white" :
                c.severity === "high" ? "bg-warning-soft text-warning" : "bg-info-soft text-info"
              )}>
                {new Date(c.date).getDate()}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{c.task}</p>
                <p className="text-[11px] text-muted-foreground">Due {c.deadline} · {c.section}</p>
              </div>
              <Badge tone={c.severity === "critical" ? "danger" : c.severity === "high" ? "warning" : "info"}>{c.severity}</Badge>
              <Button size="sm" variant="ghost"><ChevronRight className="h-3.5 w-3.5" /></Button>
            </div>
          ))}
        </div>
      </Card>

      {/* License expiry preview */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="font-semibold inline-flex items-center gap-2"><FileCheck className="h-4 w-4 text-warning" />License expiry preview</p>
          <button onClick={() => setTab("licenses")} className="text-xs text-brand hover:underline inline-flex items-center gap-1">View all<ChevronRight className="h-3 w-3" /></button>
        </div>
        <div className="space-y-1.5">
          {upcomingLicenses.map(l => (
            <div key={l.id} className="flex items-center gap-3 p-2.5 rounded-md hover:bg-surface-sunken/40">
              <span className={cn(
                "h-9 w-9 rounded-md inline-flex items-center justify-center shrink-0",
                l.status === "expired" ? "bg-danger text-white" :
                l.status === "expiring_soon" ? "bg-warning-soft text-warning" : "bg-success-soft text-success"
              )}>
                <FileCheck className="h-4 w-4" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{l.name}</p>
                <p className="text-[11px] text-muted-foreground">{l.authority} · expires {l.expiryDate}</p>
              </div>
              <Badge tone={l.status === "expired" ? "danger" : l.status === "expiring_soon" ? "warning" : "success"}>
                {l.status === "expired" ? `${Math.abs(l.daysToExpiry)}d overdue` :
                 l.status === "expiring_soon" ? `${l.daysToExpiry}d left` : `${l.daysToExpiry}d left`}
              </Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ============================================================
// GSTR TAB
// ============================================================
function GstrTab({ onToast }: { onToast: (m: string) => void }) {
  const [returnType, setReturnType] = React.useState<"gstr1" | "gstr3b">("gstr1");
  const [period, setPeriod] = React.useState("2026-05");

  const totalTaxable = GSTR1_ROWS.reduce((t, r) => t + r.taxable, 0);
  const totalIgst = GSTR1_ROWS.reduce((t, r) => t + r.igst, 0);
  const totalCgst = GSTR1_ROWS.reduce((t, r) => t + r.cgst, 0);
  const totalSgst = GSTR1_ROWS.reduce((t, r) => t + r.sgst, 0);
  const totalTax = totalIgst + totalCgst + totalSgst;

  // Mock ITC for 3B
  const itcSummary = { eligible: 285000, ineligible: 12500, reversal: 8500 };
  const netLiability = totalTax - itcSummary.eligible;

  return (
    <div className="space-y-4">
      <Card className="p-3 bg-info-soft/15 border-info/20 text-xs flex items-start gap-2">
        <Receipt className="h-3.5 w-3.5 text-info shrink-0 mt-0.5" />
        <p><strong>Auto-prep</strong> from your folio + invoice data · download the JSON to upload on the <a href="https://gst.gov.in" target="_blank" className="text-brand hover:underline inline-flex items-center gap-0.5">GST portal<ExternalLink className="h-2.5 w-2.5" /></a>, or push via GSTN API. <strong>Validation:</strong> all rows checked for GSTIN format, HSN/SAC, place-of-supply mismatches.</p>
      </Card>

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Return:</span>
          <button onClick={() => setReturnType("gstr1")} className={cn(
            "h-8 px-3 rounded-full text-xs font-medium border transition-colors",
            returnType === "gstr1" ? "bg-foreground text-background border-foreground" : "border-border hover:bg-surface-sunken"
          )}>GSTR-1 (outward supplies)</button>
          <button onClick={() => setReturnType("gstr3b")} className={cn(
            "h-8 px-3 rounded-full text-xs font-medium border transition-colors",
            returnType === "gstr3b" ? "bg-foreground text-background border-foreground" : "border-border hover:bg-surface-sunken"
          )}>GSTR-3B (summary)</button>
          <span className="text-xs text-muted-foreground ml-3">Period:</span>
          <Select value={period} onChange={e => setPeriod(e.target.value)} className="h-8 max-w-[160px]">
            <option value="2026-05">May 2026</option>
            <option value="2026-04">April 2026</option>
            <option value="2026-03">March 2026</option>
          </Select>
          <div className="ml-auto flex gap-1.5">
            <Button size="sm" variant="outline" onClick={() => onToast("JSON validated · 0 errors, 2 warnings")}>
              <CheckCircle2 className="h-3.5 w-3.5" />Validate
            </Button>
            <Button size="sm" variant="outline" onClick={() => onToast("GSTR JSON downloaded")}>
              <Download className="h-3.5 w-3.5" />Download JSON
            </Button>
            <Button size="sm" onClick={() => onToast("Pushed to GSTN portal · ARN received")}>
              <Upload className="h-3.5 w-3.5" />Push to GSTN
            </Button>
          </div>
        </div>
      </Card>

      {returnType === "gstr1" && (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-sunken/40 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
              <tr>
                <th className="text-left p-3">Section</th>
                <th className="text-right p-3">Taxable value</th>
                <th className="text-right p-3">IGST</th>
                <th className="text-right p-3">CGST</th>
                <th className="text-right p-3">SGST</th>
                <th className="text-right p-3 pr-4">Total tax</th>
              </tr>
            </thead>
            <tbody>
              {GSTR1_ROWS.map((r, i) => (
                <tr key={i} className="border-t border-border hover:bg-surface-sunken/30">
                  <td className="p-3">{r.label}</td>
                  <td className="p-3 text-right tabular">{money(r.taxable)}</td>
                  <td className="p-3 text-right tabular text-muted-foreground">{r.igst > 0 ? money(r.igst) : "—"}</td>
                  <td className="p-3 text-right tabular text-muted-foreground">{r.cgst > 0 ? money(r.cgst) : "—"}</td>
                  <td className="p-3 text-right tabular text-muted-foreground">{r.sgst > 0 ? money(r.sgst) : "—"}</td>
                  <td className="p-3 text-right pr-4 tabular font-semibold">{money(r.igst + r.cgst + r.sgst)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-foreground bg-surface-sunken/40 font-bold">
                <td className="p-3">Total</td>
                <td className="p-3 text-right tabular">{money(totalTaxable)}</td>
                <td className="p-3 text-right tabular">{money(totalIgst)}</td>
                <td className="p-3 text-right tabular">{money(totalCgst)}</td>
                <td className="p-3 text-right tabular">{money(totalSgst)}</td>
                <td className="p-3 text-right pr-4 tabular text-brand">{money(totalTax)}</td>
              </tr>
            </tbody>
          </table>
          <div className="p-4 border-t border-border flex items-center justify-between flex-wrap gap-2">
            <div className="text-xs text-muted-foreground">
              <strong>HSN summary:</strong> SAC 996311 (hotel accommodation), 996332 (F&B), 996334 (banquet) · auto-classified · 0 unmapped
            </div>
            <Badge tone="success"><CheckCircle2 className="h-3 w-3" />Ready to file</Badge>
          </div>
        </Card>
      )}

      {returnType === "gstr3b" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-4">
            <p className="font-semibold mb-3">3.1 Outward supplies (auto-fetched from GSTR-1)</p>
            <ul className="space-y-1.5 text-sm">
              <li className="flex justify-between"><span className="text-muted-foreground">Taxable supplies</span><span className="tabular font-semibold">{money(totalTaxable)}</span></li>
              <li className="flex justify-between"><span className="text-muted-foreground">IGST collected</span><span className="tabular">{money(totalIgst)}</span></li>
              <li className="flex justify-between"><span className="text-muted-foreground">CGST collected</span><span className="tabular">{money(totalCgst)}</span></li>
              <li className="flex justify-between"><span className="text-muted-foreground">SGST collected</span><span className="tabular">{money(totalSgst)}</span></li>
              <li className="flex justify-between pt-2 mt-2 border-t border-border font-semibold"><span>Output tax</span><span className="tabular text-brand">{money(totalTax)}</span></li>
            </ul>
          </Card>
          <Card className="p-4">
            <p className="font-semibold mb-3">4. ITC summary (eligible input tax credit)</p>
            <ul className="space-y-1.5 text-sm">
              <li className="flex justify-between"><span className="text-muted-foreground">Eligible ITC</span><span className="tabular font-semibold text-success">{money(itcSummary.eligible)}</span></li>
              <li className="flex justify-between"><span className="text-muted-foreground">Ineligible (Sec 17(5))</span><span className="tabular">{money(itcSummary.ineligible)}</span></li>
              <li className="flex justify-between"><span className="text-muted-foreground">Reversed</span><span className="tabular">{money(itcSummary.reversal)}</span></li>
              <li className="flex justify-between pt-2 mt-2 border-t border-border font-semibold"><span>Net ITC available</span><span className="tabular text-success">{money(itcSummary.eligible - itcSummary.reversal)}</span></li>
            </ul>
          </Card>
          <Card className="p-4 lg:col-span-2 bg-brand-soft/10 border-brand/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">Net GST payable for {period}</p>
                <p className="text-xs text-muted-foreground">After eligible ITC offset · cash payment due by 20th</p>
              </div>
              <p className="text-3xl font-bold tabular text-brand">{money(netLiability)}</p>
            </div>
            <div className="mt-3 pt-3 border-t border-brand/20 grid grid-cols-3 gap-2 text-center text-xs">
              <div><p className="text-muted-foreground">CGST cash</p><p className="font-bold tabular">{money(Math.max(0, totalCgst - itcSummary.eligible / 2))}</p></div>
              <div><p className="text-muted-foreground">SGST cash</p><p className="font-bold tabular">{money(Math.max(0, totalSgst - itcSummary.eligible / 2))}</p></div>
              <div><p className="text-muted-foreground">IGST cash</p><p className="font-bold tabular">{money(totalIgst)}</p></div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// ============================================================
// FORM C TAB
// ============================================================
function FormCTab({ onToast }: { onToast: (m: string) => void }) {
  const [forms] = React.useState(FORM_C_SEED);
  const [filter, setFilter] = React.useState<"all" | "pending" | "reported">("all");
  const [search, setSearch] = React.useState("");

  const filtered = forms.filter(f => {
    if (filter === "pending" && f.reportedToFrro) return false;
    if (filter === "reported" && !f.reportedToFrro) return false;
    if (search && !`${f.guestName} ${f.passportNo} ${f.nationality}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <Card className="p-3 bg-info-soft/15 border-info/20 text-xs flex items-start gap-2">
        <Globe className="h-3.5 w-3.5 text-info shrink-0 mt-0.5" />
        <p>Form C reporting for foreign guests is mandatory under <strong>Section 14 of the Foreigners Act 1946</strong> · upload within 24 hours of arrival to the <a href="https://indianfrro.gov.in" className="text-brand hover:underline inline-flex items-center gap-0.5" target="_blank">FRRO portal<ExternalLink className="h-2.5 w-2.5" /></a>. Auto-extracted from passport scans at check-in.</p>
      </Card>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by guest, passport, nationality…" className="pl-9 h-9" />
        </div>
        {(["all", "pending", "reported"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={cn(
            "h-9 px-3 rounded-full text-xs font-medium border transition-colors capitalize",
            filter === f ? "bg-foreground text-background border-foreground" : "border-border hover:bg-surface-sunken text-muted-foreground"
          )}>{f} ({f === "all" ? forms.length : f === "pending" ? forms.filter(x => !x.reportedToFrro).length : forms.filter(x => x.reportedToFrro).length})</button>
        ))}
        <Button size="sm" onClick={() => onToast("Bulk Form C export · 5 records prepared")}>
          <Download className="h-3.5 w-3.5" />Bulk export
        </Button>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-sunken/40 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
            <tr>
              <th className="text-left p-3">Guest</th>
              <th className="text-left p-3">Passport · Visa</th>
              <th className="text-left p-3">Nationality</th>
              <th className="text-left p-3">Stay</th>
              <th className="text-left p-3">Room</th>
              <th className="text-center p-3">FRRO status</th>
              <th className="text-right p-3 pr-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(f => (
              <tr key={f.id} className="border-t border-border hover:bg-surface-sunken/30">
                <td className="p-3 font-medium">{f.guestName}</td>
                <td className="p-3 text-xs">
                  <p className="font-mono tabular">{f.passportNo}</p>
                  <p className="text-muted-foreground tabular">Visa {f.visaNo} · exp {f.visaExpiry}</p>
                </td>
                <td className="p-3"><Badge tone="info">{f.nationality}</Badge></td>
                <td className="p-3 text-xs">
                  <p className="tabular">{f.arrivalAt.slice(0, 16)}</p>
                  <p className="tabular text-muted-foreground">→ {f.departureAt.slice(0, 16)}</p>
                </td>
                <td className="p-3 tabular">{f.roomNo}</td>
                <td className="p-3 text-center">
                  {f.reportedToFrro ? (
                    <Badge tone="success"><CheckCircle2 className="h-3 w-3" />Reported</Badge>
                  ) : (
                    <Badge tone="danger"><AlertTriangle className="h-3 w-3" />Pending</Badge>
                  )}
                  {f.reportedAt && <p className="text-[10px] text-muted-foreground tabular mt-0.5">{f.reportedAt}</p>}
                </td>
                <td className="p-3 text-right pr-4 whitespace-nowrap">
                  <div className="inline-flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => onToast(`Form C downloaded for ${f.guestName}`)}><Download className="h-3 w-3" /></Button>
                    {!f.reportedToFrro && (
                      <Button size="sm" onClick={() => onToast(`Uploaded to FRRO portal · ${f.guestName} · ACK received`)}>
                        <Upload className="h-3 w-3" />Upload
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-12 text-center text-sm text-muted-foreground">
            <Globe className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />No matching records
          </div>
        )}
      </Card>
    </div>
  );
}

// ============================================================
// LICENSES TAB
// ============================================================
function LicensesTab({ licenses, setLicenses, onToast }: {
  licenses: License[];
  setLicenses: React.Dispatch<React.SetStateAction<License[]>>;
  onToast: (m: string) => void;
}) {
  const [view, setView] = React.useState<"list" | "calendar">("list");
  const [statusFilter, setStatusFilter] = React.useState<"all" | License["status"]>("all");
  const [showAdd, setShowAdd] = React.useState(false);
  const [editing, setEditing] = React.useState<License | null>(null);

  const filtered = licenses.filter(l => statusFilter === "all" || l.status === statusFilter);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 border border-border rounded-md p-0.5">
          <button onClick={() => setView("list")} className={cn("px-2.5 py-1 rounded text-xs", view === "list" ? "bg-foreground text-background" : "text-muted-foreground")}>List</button>
          <button onClick={() => setView("calendar")} className={cn("px-2.5 py-1 rounded text-xs", view === "calendar" ? "bg-foreground text-background" : "text-muted-foreground")}>Year view</button>
        </div>
        {(["all", "expired", "expiring_soon", "active"] as const).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} className={cn(
            "h-8 px-3 rounded-full text-xs font-medium border transition-colors",
            statusFilter === s ? "bg-foreground text-background border-foreground" : "border-border hover:bg-surface-sunken text-muted-foreground"
          )}>
            {s === "all" ? "All" : s === "expiring_soon" ? "Expiring soon" : s.charAt(0).toUpperCase() + s.slice(1)} ({s === "all" ? licenses.length : licenses.filter(l => l.status === s).length})
          </button>
        ))}
        <Button size="sm" className="ml-auto" onClick={() => setShowAdd(true)}><Plus className="h-3.5 w-3.5" />Add license</Button>
      </div>

      {view === "list" && (
        <div className="space-y-2">
          {filtered.map(l => (
            <Card key={l.id} className={cn(
              "p-4",
              l.status === "expired" && "border-l-4 border-l-danger",
              l.status === "expiring_soon" && "border-l-4 border-l-warning",
            )}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <span className={cn(
                    "h-10 w-10 rounded-md inline-flex items-center justify-center shrink-0",
                    l.status === "expired" ? "bg-danger text-white" :
                    l.status === "expiring_soon" ? "bg-warning text-white" :
                    "bg-success-soft text-success"
                  )}>
                    <FileCheck className="h-4 w-4" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">{l.name}</p>
                      <Badge tone={l.status === "expired" ? "danger" : l.status === "expiring_soon" ? "warning" : "success"}>
                        {l.status === "expired" ? `${Math.abs(l.daysToExpiry)} days overdue` :
                         l.status === "expiring_soon" ? `${l.daysToExpiry} days left` :
                         l.status === "in_renewal" ? "in renewal" : `${l.daysToExpiry} days left`}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1"><strong>Authority:</strong> {l.authority} · <strong>No:</strong> <span className="font-mono tabular">{l.number}</span></p>
                    <p className="text-xs text-muted-foreground"><strong>Valid:</strong> <span className="tabular">{l.issueDate}</span> → <span className="tabular">{l.expiryDate}</span> · <strong>Fee:</strong> {money(l.fee)}</p>
                    {l.documents.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {l.documents.map(d => (
                          <Badge key={d.name} tone="neutral"><FileText className="h-2.5 w-2.5" />{d.name}</Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <p className="text-[10px] text-muted-foreground inline-flex items-center gap-1"><Bell className="h-2.5 w-2.5" />Reminders: {l.reminders.join(", ")} days before</p>
                      <p className="text-[10px] text-muted-foreground inline-flex items-center gap-1"><Users className="h-2.5 w-2.5" />Owner: Anjali Iyer (Compliance Mgr)</p>
                      {(l.status === "expired" || l.status === "expiring_soon") && (
                        <span className="text-[10px] inline-flex items-center gap-1 text-warning font-semibold"><Flag className="h-2.5 w-2.5" />Priority</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {l.status === "expired" && (
                    <Button size="sm" onClick={() => { setLicenses(prev => prev.map(x => x.id === l.id ? { ...x, status: "in_renewal" } : x)); onToast("Renewal initiated · added to action list"); }}>
                      <RefreshCw className="h-3 w-3" />Start renewal
                    </Button>
                  )}
                  {l.status === "expiring_soon" && (
                    <Button size="sm" onClick={() => onToast("Renewal flow opened · documents pre-filled")}>
                      <RefreshCw className="h-3 w-3" />Renew now
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => onToast("Upload dialog opened")}>
                    <Upload className="h-3 w-3" />Upload doc
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(l)}><Pencil className="h-3 w-3" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => { setLicenses(prev => prev.filter(x => x.id !== l.id)); onToast("License removed"); }}><Trash2 className="h-3 w-3 text-danger" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {view === "calendar" && (
        <Card className="p-4">
          <p className="font-semibold mb-3">License renewals · year view</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 12 }, (_, m) => {
              const monthName = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m];
              const monthLicenses = licenses.filter(l => new Date(l.expiryDate).getMonth() === m);
              return (
                <div key={m} className={cn("p-3 rounded-md border", monthLicenses.length > 0 ? "border-border" : "border-border/50 opacity-50")}>
                  <p className="text-xs font-semibold uppercase tracking-wider">{monthName}</p>
                  {monthLicenses.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground mt-1">No renewals due</p>
                  ) : (
                    <ul className="mt-2 space-y-1">
                      {monthLicenses.map(l => (
                        <li key={l.id} className="text-[11px] flex items-start gap-1.5">
                          <span className={cn("h-1.5 w-1.5 rounded-full mt-1 shrink-0", l.status === "expired" ? "bg-danger" : l.status === "expiring_soon" ? "bg-warning" : "bg-success")} />
                          <span className="flex-1">{l.name} <span className="text-muted-foreground tabular">· {l.expiryDate.slice(-2)}</span></span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Add license modal */}
      {showAdd && <LicenseEditModal license={null} onClose={() => setShowAdd(false)} onSave={(l) => { setLicenses(prev => [...prev, { ...l, id: "l" + (prev.length + 1) }]); setShowAdd(false); onToast("License added · reminders set"); }} />}
      {editing && <LicenseEditModal license={editing} onClose={() => setEditing(null)} onSave={(l) => { setLicenses(prev => prev.map(x => x.id === l.id ? l : x)); setEditing(null); onToast("License updated"); }} />}
    </div>
  );
}

function LicenseEditModal({ license, onClose, onSave }: { license: License | null; onClose: () => void; onSave: (l: License) => void }) {
  const [l, setL] = React.useState<License>(license || { id: "", name: "", authority: "", number: "", issueDate: "", expiryDate: "", daysToExpiry: 0, fee: 0, status: "active", documents: [], reminders: [60, 30] });
  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-xl max-h-[90vh] overflow-y-auto p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{license ? "Edit license" : "Add license"}</h2>
          <button onClick={onClose} className="h-8 w-8 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Label>License name</Label><Input value={l.name} onChange={e => setL({ ...l, name: e.target.value })} placeholder="e.g. FSSAI Food License" /></div>
          <div><Label>Issuing authority</Label><Input value={l.authority} onChange={e => setL({ ...l, authority: e.target.value })} /></div>
          <div><Label>License number</Label><Input value={l.number} onChange={e => setL({ ...l, number: e.target.value })} /></div>
          <div><Label>Issue date</Label><Input type="date" value={l.issueDate} onChange={e => setL({ ...l, issueDate: e.target.value })} /></div>
          <div><Label>Expiry date</Label><Input type="date" value={l.expiryDate} onChange={e => setL({ ...l, expiryDate: e.target.value })} /></div>
          <div><Label>Renewal fee (₹)</Label><Input type="number" value={l.fee || ""} onChange={e => setL({ ...l, fee: parseInt(e.target.value) || 0 })} /></div>
          <div><Label>Status</Label>
            <Select value={l.status} onChange={e => setL({ ...l, status: e.target.value as License["status"] })}>
              <option value="active">Active</option>
              <option value="expiring_soon">Expiring soon</option>
              <option value="expired">Expired</option>
              <option value="in_renewal">In renewal</option>
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-border">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(l)} disabled={!l.name || !l.authority || !l.expiryDate}><Save className="h-3.5 w-3.5" />Save</Button>
        </div>
      </Card>
    </div>
  );
}

// ============================================================
// TDS / TCS TAB
// ============================================================
function TdsTab({ onToast }: { onToast: (m: string) => void }) {
  const total = TDS_SEED.reduce((t, r) => t + r.tds, 0);
  const totalTaxable = TDS_SEED.reduce((t, r) => t + r.amount, 0);

  return (
    <div className="space-y-4">
      <Card className="p-3 bg-info-soft/15 border-info/20 text-xs flex items-start gap-2">
        <IndianRupee className="h-3.5 w-3.5 text-info shrink-0 mt-0.5" />
        <p>TDS deducted from vendor / contractor / professional payments · pay by 7th of next month via Challan 281 · file quarterly TDS returns (Form 24Q / 26Q).</p>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Total TDS (May)</p>
          <p className="text-xl font-bold tabular mt-0.5 text-brand">{money(total)}</p>
          <p className="text-[10px] text-muted-foreground">to deposit by 7 June</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Taxable payments</p>
          <p className="text-xl font-bold tabular mt-0.5">{money(totalTaxable)}</p>
          <p className="text-[10px] text-muted-foreground">across {TDS_SEED.length} entries</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Effective rate</p>
          <p className="text-xl font-bold tabular mt-0.5">{(total / totalTaxable * 100).toFixed(2)}%</p>
          <p className="text-[10px] text-muted-foreground">weighted average</p>
        </Card>
        <Card className="p-3 text-center bg-warning-soft/30 border-warning/30">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-warning">Form 26Q due</p>
          <p className="text-xl font-bold tabular mt-0.5 text-warning">31 July</p>
          <p className="text-[10px] text-muted-foreground">Q1 FY 26-27</p>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-sunken/40 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
            <tr>
              <th className="text-left p-3">Section</th>
              <th className="text-left p-3">Description</th>
              <th className="text-left p-3">Party type</th>
              <th className="text-right p-3">Gross amount</th>
              <th className="text-right p-3">Rate</th>
              <th className="text-right p-3 pr-4">TDS</th>
            </tr>
          </thead>
          <tbody>
            {TDS_SEED.map(r => (
              <tr key={r.id} className="border-t border-border hover:bg-surface-sunken/30">
                <td className="p-3"><Badge tone="brand">{r.section}</Badge></td>
                <td className="p-3 text-xs">{r.description}</td>
                <td className="p-3 text-xs text-muted-foreground">{r.partyType}</td>
                <td className="p-3 text-right tabular">{money(r.amount)}</td>
                <td className="p-3 text-right tabular text-muted-foreground">{r.rate}%</td>
                <td className="p-3 text-right pr-4 tabular font-semibold">{money(r.tds)}</td>
              </tr>
            ))}
            <tr className="border-t-2 border-foreground bg-surface-sunken/40 font-bold">
              <td className="p-3" colSpan={3}>Total</td>
              <td className="p-3 text-right tabular">{money(totalTaxable)}</td>
              <td className="p-3"></td>
              <td className="p-3 text-right pr-4 tabular text-brand">{money(total)}</td>
            </tr>
          </tbody>
        </table>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => onToast("Form 16A certificates generated for all vendors")}>
          <Download className="h-3.5 w-3.5" />Generate Form 16A
        </Button>
        <Button variant="outline" onClick={() => onToast("Challan 281 PDF downloaded")}>
          <FileText className="h-3.5 w-3.5" />Challan 281
        </Button>
        <Button onClick={() => onToast("TDS payment initiated via TIN-NSDL · OTP sent")}>
          <Send className="h-3.5 w-3.5" />Pay now
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// E-INVOICE TAB
// ============================================================
function EinvoiceTab({ onToast }: { onToast: (m: string) => void }) {
  const generated = EINVOICES_SEED.filter(e => e.status === "generated").length;
  const pending = EINVOICES_SEED.filter(e => e.status === "pending").length;
  const failed = EINVOICES_SEED.filter(e => e.status === "failed").length;

  return (
    <div className="space-y-4">
      <Card className="p-3 bg-info-soft/15 border-info/20 text-xs flex items-start gap-2">
        <FileCheck className="h-3.5 w-3.5 text-info shrink-0 mt-0.5" />
        <p>e-Invoice (IRN) is mandatory for B2B invoices when annual turnover &gt; ₹5 Cr · auto-generated via NIC IRP API · printed on invoice as QR code.</p>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 text-center bg-success-soft/30 border-success/30">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-success">Generated</p>
          <p className="text-2xl font-bold tabular mt-0.5 text-success">{generated}</p>
        </Card>
        <Card className="p-3 text-center bg-warning-soft/30 border-warning/30">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-warning">Pending</p>
          <p className="text-2xl font-bold tabular mt-0.5 text-warning">{pending}</p>
        </Card>
        <Card className="p-3 text-center bg-danger-soft/30 border-danger/30">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-danger">Failed</p>
          <p className="text-2xl font-bold tabular mt-0.5 text-danger">{failed}</p>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-sunken/40 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
            <tr>
              <th className="text-left p-3">Invoice #</th>
              <th className="text-left p-3">Party</th>
              <th className="text-left p-3">Date</th>
              <th className="text-right p-3">Amount</th>
              <th className="text-left p-3">IRN (first 16)</th>
              <th className="text-left p-3">ACK #</th>
              <th className="text-center p-3">Status</th>
              <th className="text-right p-3 pr-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {EINVOICES_SEED.map(e => (
              <tr key={e.id} className="border-t border-border hover:bg-surface-sunken/30">
                <td className="p-3 font-mono tabular text-xs">{e.invoiceNo}</td>
                <td className="p-3">{e.partyName}</td>
                <td className="p-3 tabular text-xs">{e.date}</td>
                <td className="p-3 text-right tabular font-semibold">{money(e.amount)}</td>
                <td className="p-3 font-mono tabular text-[10px] text-muted-foreground">{e.irn ? e.irn.slice(0, 16) + "…" : "—"}</td>
                <td className="p-3 font-mono tabular text-xs">{e.ackNo || "—"}</td>
                <td className="p-3 text-center">
                  {e.status === "generated" && <Badge tone="success"><CheckCircle2 className="h-3 w-3" />Generated</Badge>}
                  {e.status === "pending" && <Badge tone="warning"><Clock className="h-3 w-3" />Pending</Badge>}
                  {e.status === "failed" && (
                    <>
                      <Badge tone="danger"><AlertTriangle className="h-3 w-3" />Failed</Badge>
                      {e.reason && <p className="text-[10px] text-danger mt-0.5">{e.reason}</p>}
                    </>
                  )}
                </td>
                <td className="p-3 text-right pr-4 whitespace-nowrap">
                  <div className="inline-flex gap-1">
                    {e.status === "failed" && <Button size="sm" onClick={() => onToast("Retrying IRN generation…")}><RefreshCw className="h-3 w-3" />Retry</Button>}
                    {e.status === "generated" && <Button size="sm" variant="ghost" onClick={() => onToast(`PDF with QR downloaded · ${e.invoiceNo}`)}><Download className="h-3 w-3" /></Button>}
                    <Button size="sm" variant="ghost"><Eye className="h-3 w-3" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
