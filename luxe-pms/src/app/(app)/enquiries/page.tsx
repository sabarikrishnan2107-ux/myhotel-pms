"use client";
import * as React from "react";
import Link from "next/link";
import {
  Plus, Search, MessageSquare, BedDouble, Building2, Users, IndianRupee,
  Calendar, Phone, Mail, MessageCircle, Eye, Edit, Ban, X, CheckCircle2,
  AlertTriangle, Bell, FileText, Send, Clock, Filter, ChevronRight,
  TrendingUp, MoreHorizontal, Trash2, RotateCw, ThumbsUp, ThumbsDown,
  Crown, ArrowRight, Tag, Sparkles, Briefcase,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { KPICard } from "@/components/ui/kpi-card";
import { cn, money, formatDate } from "@/lib/utils";
import { apiGet, apiPost, apiPut, apiDelete, sendEmail } from "@/lib/api";
import { PhoneInput } from "@/components/ui/phone-input";
import { isValidPhone } from "@/lib/phone";
import { EmailInput } from "@/components/ui/email-input";
import { isValidEmail } from "@/lib/email";

// ============ TYPES ============
type EnquiryType = "Room" | "Hall" | "Both";
type EnquiryStatus = "new" | "contacted" | "quoted" | "negotiating" | "won" | "lost" | "cold";
type EnquirySource = "Website" | "Phone" | "Email" | "WhatsApp" | "Walk-in" | "Agent" | "Referral";

type FollowUp = {
  id: string;
  date: string;            // ISO date
  kind: "call" | "email" | "whatsapp" | "meeting" | "note";
  by: string;
  outcome?: string;
  nextStep?: string;
  done: boolean;
};

type Enquiry = {
  id: string;
  enqNo: string;
  type: EnquiryType;
  name: string;
  phone: string;
  email: string;
  company?: string;
  source: EnquirySource;
  status: EnquiryStatus;
  // What they want
  roomNights?: number;
  roomCount?: number;
  hallName?: string;
  guestCount?: number;
  checkIn?: string;
  checkOut?: string;
  eventDate?: string;
  // Budget
  budget?: number;
  quotedAmount?: number;
  // Lead management
  enquiredOn: string;       // ISO date
  assignedTo: string;       // sales rep
  nextFollowUp?: string;    // ISO date
  followUps: FollowUp[];
  notes: string;
  thankYouSent: boolean;
  vip: boolean;
};

// ============ SEED DATA ============
const TODAY = new Date("2026-05-24");
const isoDate = (d: Date) => d.toISOString().slice(0, 10);
const daysFromNow = (n: number) => { const d = new Date(TODAY); d.setDate(d.getDate() + n); return isoDate(d); };

const ENQUIRIES_SEED: Enquiry[] = [
  {
    id: "enq1", enqNo: "ENQ-2026-1042",
    type: "Hall", name: "Rohan Mehta", phone: "+91 98765 12345", email: "rohan.mehta@gmail.com",
    company: "Mehta Family", source: "Website", status: "negotiating",
    hallName: "Grand Ballroom", guestCount: 350, eventDate: daysFromNow(45), budget: 850000, quotedAmount: 920000,
    enquiredOn: daysFromNow(-7), assignedTo: "Priya Sales", nextFollowUp: daysFromNow(1),
    thankYouSent: true, vip: true,
    followUps: [
      { id: "f1", date: daysFromNow(-7), kind: "email", by: "System", outcome: "Auto thank-you sent", done: true },
      { id: "f2", date: daysFromNow(-6), kind: "call", by: "Priya Sales", outcome: "Connected · client confirmed wedding date 8 Jul, 350 pax", nextStep: "Send detailed proposal with menu options", done: true },
      { id: "f3", date: daysFromNow(-4), kind: "email", by: "Priya Sales", outcome: "Proposal sent with 3 menu options + decor packages", nextStep: "Follow up in 48h", done: true },
      { id: "f4", date: daysFromNow(-2), kind: "whatsapp", by: "Priya Sales", outcome: "Client wants discount of ~10%. Suggested complimentary upgrade to premium menu instead", nextStep: "Get manager approval and revert", done: true },
      { id: "f5", date: daysFromNow(1),  kind: "call", by: "Priya Sales", nextStep: "Confirm decision · close deal", done: false },
    ],
    notes: "Wedding reception · vegetarian only · live music allowed till 22:30 per police permission · client decision-maker is the father, contact him on +91 99888 12345 for final.",
  },
  {
    id: "enq2", enqNo: "ENQ-2026-1041",
    type: "Room", name: "TechCorp HR", phone: "+91 96543 21098", email: "events@techcorp.in",
    company: "TechCorp FZ-LLC", source: "Agent", status: "quoted",
    roomCount: 25, roomNights: 3, guestCount: 35, checkIn: daysFromNow(20), checkOut: daysFromNow(23),
    budget: 600000, quotedAmount: 540000,
    enquiredOn: daysFromNow(-3), assignedTo: "Aman Sales", nextFollowUp: daysFromNow(0),
    thankYouSent: true, vip: false,
    followUps: [
      { id: "f1", date: daysFromNow(-3), kind: "email", by: "System", outcome: "Auto thank-you sent", done: true },
      { id: "f2", date: daysFromNow(-3), kind: "call", by: "Aman Sales", outcome: "HR confirmed 25 rooms + conference hall", nextStep: "Send corporate rate proposal", done: true },
      { id: "f3", date: daysFromNow(-1), kind: "email", by: "Aman Sales", outcome: "Corporate proposal sent at ₹7,200/n × 25 rooms × 3N + conference setup", nextStep: "Follow up tomorrow", done: true },
      { id: "f4", date: daysFromNow(0),  kind: "call", by: "Aman Sales", nextStep: "Get confirmation today", done: false },
    ],
    notes: "Annual sales offsite · 35 senior managers · needs conference room for 2 days · airport transfer for all required.",
  },
  {
    id: "enq3", enqNo: "ENQ-2026-1040",
    type: "Both", name: "Sneha Patel", phone: "+91 91234 56789", email: "sneha.patel@yahoo.in",
    company: "", source: "WhatsApp", status: "contacted",
    roomCount: 12, hallName: "Crystal Hall", guestCount: 80, eventDate: daysFromNow(30), roomNights: 2,
    checkIn: daysFromNow(29), checkOut: daysFromNow(31), budget: 380000,
    enquiredOn: daysFromNow(-2), assignedTo: "Priya Sales", nextFollowUp: daysFromNow(2),
    thankYouSent: true, vip: false,
    followUps: [
      { id: "f1", date: daysFromNow(-2), kind: "whatsapp", by: "System", outcome: "Auto thank-you sent", done: true },
      { id: "f2", date: daysFromNow(-1), kind: "whatsapp", by: "Priya Sales", outcome: "Connected · engagement function · 80 guests confirmed", nextStep: "Send hall + room combined proposal", done: true },
      { id: "f3", date: daysFromNow(2),  kind: "email", by: "Priya Sales", nextStep: "Send proposal with photos of past engagement events", done: false },
    ],
    notes: "Engagement function · north-Indian menu · stage decoration with floral arch.",
  },
  {
    id: "enq4", enqNo: "ENQ-2026-1039",
    type: "Room", name: "Anil Kumar", phone: "+91 99887 11223", email: "anil.k@hotmail.com",
    source: "Phone", status: "new",
    roomCount: 2, roomNights: 4, guestCount: 4, checkIn: daysFromNow(10), checkOut: daysFromNow(14),
    enquiredOn: daysFromNow(0), assignedTo: "Aman Sales", nextFollowUp: daysFromNow(0),
    thankYouSent: false, vip: false,
    followUps: [],
    notes: "Family vacation · 2 Deluxe rooms · interconnecting preferred.",
  },
  {
    id: "enq5", enqNo: "ENQ-2026-1038",
    type: "Hall", name: "BlueOcean Pharma", phone: "+91 95432 99887", email: "events@blueocean.in",
    company: "BlueOcean Pharma Pvt", source: "Email", status: "won",
    hallName: "Conference Room 1", guestCount: 40, eventDate: daysFromNow(-2), budget: 80000, quotedAmount: 75000,
    enquiredOn: daysFromNow(-12), assignedTo: "Aman Sales",
    thankYouSent: true, vip: false,
    followUps: [
      { id: "f1", date: daysFromNow(-12), kind: "email", by: "System", outcome: "Auto thank-you sent", done: true },
      { id: "f2", date: daysFromNow(-10), kind: "email", by: "Aman Sales", outcome: "Proposal sent", done: true },
      { id: "f3", date: daysFromNow(-8),  kind: "call",   by: "Aman Sales", outcome: "Closed · ₹75K accepted · advance ₹25K received", done: true },
      { id: "f4", date: daysFromNow(-2),  kind: "note",   by: "Aman Sales", outcome: "Event executed successfully · client very happy · asked for repeat next quarter", done: true },
    ],
    notes: "Won deal · ₹75K · executed successfully · client referral expected.",
  },
  {
    id: "enq6", enqNo: "ENQ-2026-1037",
    type: "Room", name: "Walk-in browser", phone: "+91 90000 11111", email: "—",
    source: "Walk-in", status: "lost",
    roomCount: 1, roomNights: 1, guestCount: 2, checkIn: daysFromNow(-15), checkOut: daysFromNow(-14),
    budget: 5000, quotedAmount: 8500,
    enquiredOn: daysFromNow(-15), assignedTo: "Aman Sales",
    thankYouSent: false, vip: false,
    followUps: [
      { id: "f1", date: daysFromNow(-15), kind: "note", by: "Aman Sales", outcome: "Walk-in · budget ₹5K · we charge ₹8.5K · went elsewhere", done: true },
    ],
    notes: "Price-sensitive · lost to budget hotel.",
  },
  {
    id: "enq7", enqNo: "ENQ-2026-1036",
    type: "Room", name: "Sunita Joshi", phone: "+91 88776 99887", email: "sunita.joshi@gmail.com",
    source: "Website", status: "cold",
    roomCount: 1, roomNights: 5, guestCount: 1, checkIn: daysFromNow(60), checkOut: daysFromNow(65), budget: 60000,
    enquiredOn: daysFromNow(-25), assignedTo: "Priya Sales", nextFollowUp: daysFromNow(-7),
    thankYouSent: true, vip: false,
    followUps: [
      { id: "f1", date: daysFromNow(-25), kind: "email", by: "System", outcome: "Auto thank-you sent", done: true },
      { id: "f2", date: daysFromNow(-23), kind: "email", by: "Priya Sales", outcome: "Sent proposal — no response", done: true },
      { id: "f3", date: daysFromNow(-15), kind: "call", by: "Priya Sales", outcome: "Phone unreachable", done: true },
      { id: "f4", date: daysFromNow(-7),  kind: "whatsapp", by: "Priya Sales", outcome: "Final WhatsApp — no response · marked cold", done: true },
    ],
    notes: "Going cold · no response after 3 follow-ups.",
  },
];

const STATUS_TONE: Record<EnquiryStatus, "info" | "warning" | "accent" | "brand" | "success" | "danger" | "neutral"> = {
  new: "info",
  contacted: "warning",
  quoted: "accent",
  negotiating: "brand",
  won: "success",
  lost: "danger",
  cold: "neutral",
};

const STATUS_LABEL: Record<EnquiryStatus, string> = {
  new: "New", contacted: "Contacted", quoted: "Quoted", negotiating: "Negotiating", won: "Won", lost: "Lost", cold: "Cold",
};

const KIND_ICON: Record<FollowUp["kind"], typeof Phone> = {
  call: Phone, email: Mail, whatsapp: MessageCircle, meeting: Briefcase, note: FileText,
};

// Days-until-follow-up classifier
function followUpDue(iso?: string): { tone: "danger" | "warning" | "info" | "success" | "neutral"; label: string; days: number | null } {
  if (!iso) return { tone: "neutral", label: "—", days: null };
  const d = new Date(iso);
  const diff = Math.floor((d.getTime() - TODAY.getTime()) / (24 * 60 * 60 * 1000));
  if (diff < 0) return { tone: "danger", label: `${-diff}d overdue`, days: diff };
  if (diff === 0) return { tone: "warning", label: "Due today", days: 0 };
  if (diff <= 2) return { tone: "warning", label: `In ${diff}d`, days: diff };
  if (diff <= 7) return { tone: "info", label: `In ${diff}d`, days: diff };
  return { tone: "success", label: `In ${diff}d`, days: diff };
}

export default function EnquiriesPage() {
  const [enquiries, setEnquiries] = React.useState<Enquiry[]>(ENQUIRIES_SEED);
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<"all" | EnquiryType>("all");
  const [statusFilter, setStatusFilter] = React.useState<"all" | EnquiryStatus>("all");
  const [sourceFilter, setSourceFilter] = React.useState<"all" | EnquirySource>("all");
  const [selected, setSelected] = React.useState<Enquiry | null>(null);
  const [newOpen, setNewOpen] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2600); };

  React.useEffect(() => {
    let cancelled = false;
    apiGet<Enquiry[]>("/enquiries")
      .then(r => { if (!cancelled) setEnquiries(r.map(e => ({ ...e, followUps: e.followUps ?? [] }))); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const list = enquiries.filter(e => {
    if (search && !`${e.name} ${e.enqNo} ${e.phone} ${e.email} ${e.company ?? ""}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter !== "all" && e.type !== typeFilter) return false;
    if (statusFilter !== "all" && e.status !== statusFilter) return false;
    if (sourceFilter !== "all" && e.source !== sourceFilter) return false;
    return true;
  }).sort((a, b) => {
    // Overdue follow-ups first, then by next follow-up date
    const aFU = followUpDue(a.nextFollowUp).days ?? 999;
    const bFU = followUpDue(b.nextFollowUp).days ?? 999;
    return aFU - bFU;
  });

  // KPI metrics
  const totalActive = enquiries.filter(e => !["won", "lost"].includes(e.status)).length;
  const newToday = enquiries.filter(e => e.enquiredOn === isoDate(TODAY)).length;
  const overdueFU = enquiries.filter(e => {
    const d = followUpDue(e.nextFollowUp);
    return d.days !== null && d.days < 0 && !["won", "lost"].includes(e.status);
  }).length;
  const wonThisMonth = enquiries.filter(e => e.status === "won").length;
  const conversionRate = enquiries.length > 0 ? Math.round((wonThisMonth / enquiries.length) * 100) : 0;

  // Selected item with live overrides
  const selectedLive = selected ? enquiries.find(e => e.id === selected.id) ?? selected : null;

  const updateEnquiry = (id: string, patch: Partial<Enquiry>) => {
    setEnquiries(es => es.map(e => e.id === id ? { ...e, ...patch } : e));
    apiPut(`/enquiries/${id}`, patch).catch(() => showToast("⚠ Save failed — backend offline"));
  };
  const addFollowUp = (id: string, fu: FollowUp) => {
    const cur = enquiries.find(e => e.id === id);
    if (!cur) return;
    const followUps = [...cur.followUps, fu];
    const nextFollowUp = fu.done ? cur.nextFollowUp : fu.date;
    setEnquiries(es => es.map(e => e.id === id ? { ...e, followUps, nextFollowUp } : e));
    apiPut(`/enquiries/${id}`, { followUps, nextFollowUp }).catch(() => showToast("⚠ Save failed — backend offline"));
  };
  const markFollowUpDone = (id: string, fuId: string, outcome: string) => {
    const cur = enquiries.find(e => e.id === id);
    if (!cur) return;
    const followUps = cur.followUps.map(f => f.id === fuId ? { ...f, done: true, outcome: outcome || f.outcome } : f);
    const nextFollowUp = followUps.find(f => !f.done)?.date;
    setEnquiries(es => es.map(e => e.id === id ? { ...e, followUps, nextFollowUp } : e));
    apiPut(`/enquiries/${id}`, { followUps, nextFollowUp }).catch(() => showToast("⚠ Save failed — backend offline"));
  };

  const sources = Array.from(new Set(enquiries.map(e => e.source))) as EnquirySource[];
  const activeFilters = (typeFilter !== "all" ? 1 : 0) + (statusFilter !== "all" ? 1 : 0) + (sourceFilter !== "all" ? 1 : 0) + (search ? 1 : 0);
  const STATUS_CHIPS: ("all" | EnquiryStatus)[] = ["all", "new", "contacted", "quoted", "negotiating", "won", "lost", "cold"];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-medium tracking-tight">Enquiries &amp; Leads</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Room &amp; hall booking enquiries · follow-up reminders · thank-you emails · convert to bookings
          </p>
        </div>
        <Button onClick={() => setNewOpen(true)}><Plus className="h-4 w-4" />New Enquiry</Button>
      </div>

      {/* KPI bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KPICard label="Active leads" value={totalActive} icon={MessageSquare} accent="brand" />
        <KPICard label="New today" value={newToday} icon={Sparkles} accent="info" />
        <KPICard label="Overdue follow-ups" value={overdueFU} icon={AlertTriangle} accent={overdueFU > 0 ? "danger" : "success"} />
        <KPICard label="Won this month" value={wonThisMonth} icon={ThumbsUp} accent="success" />
        <KPICard label="Conversion rate" value={`${conversionRate}%`} icon={TrendingUp} accent="accent" />
      </div>

      {/* Status chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        {STATUS_CHIPS.map(s => {
          const count = s === "all" ? enquiries.length : enquiries.filter(e => e.status === s).length;
          const dot = s !== "all" ? {
            new: "bg-info", contacted: "bg-warning", quoted: "bg-accent",
            negotiating: "bg-brand", won: "bg-success", lost: "bg-danger", cold: "bg-muted-foreground"
          }[s] : null;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "h-8 px-3 rounded-full text-xs font-medium border transition-colors inline-flex items-center gap-2",
                statusFilter === s
                  ? "bg-foreground text-background border-foreground shadow-xs"
                  : "bg-surface text-muted-foreground border-border hover:bg-surface-sunken hover:text-foreground"
              )}
            >
              {dot && <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />}
              {s === "all" ? "All" : STATUS_LABEL[s]}
              <span className={cn(
                "tabular text-[10px] rounded-full px-1.5 h-4 inline-flex items-center font-semibold",
                statusFilter === s ? "bg-background/15 text-background" : "bg-surface-sunken text-muted-foreground"
              )}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Filter bar */}
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, enquiry #, phone, email, company…" className="pl-9 h-9" />
          </div>
          <Select value={typeFilter} onChange={e => setTypeFilter(e.target.value as "all" | EnquiryType)} className="h-9 w-auto">
            <option value="all">All types</option>
            <option value="Room">Room</option>
            <option value="Hall">Hall</option>
            <option value="Both">Both</option>
          </Select>
          <Select value={sourceFilter} onChange={e => setSourceFilter(e.target.value as "all" | EnquirySource)} className="h-9 w-auto">
            <option value="all">All sources</option>
            {sources.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
          {activeFilters > 0 && (
            <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setTypeFilter("all"); setStatusFilter("all"); setSourceFilter("all"); }}>
              Clear ({activeFilters})
            </Button>
          )}
          <div className="flex-1" />
          <p className="text-xs text-muted-foreground tabular">Showing <span className="font-medium text-foreground">{list.length}</span> of {enquiries.length} · sorted by follow-up</p>
        </div>
      </Card>

      {/* List */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-elevated border-b border-border">
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-semibold">Enquiry</th>
                <th className="px-4 py-3 font-semibold">Contact</th>
                <th className="px-4 py-3 font-semibold">Type / Requirement</th>
                <th className="px-4 py-3 font-semibold">Source</th>
                <th className="px-4 py-3 font-semibold text-right">Budget</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Next follow-up</th>
                <th className="px-4 py-3 font-semibold">Assigned</th>
                <th className="px-4 py-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.map(e => {
                const fu = followUpDue(e.nextFollowUp);
                return (
                  <tr
                    key={e.id}
                    onDoubleClick={() => setSelected(e)}
                    title="Double-click for detail + follow-up timeline"
                    className="hover:bg-surface-sunken/50 transition-colors cursor-pointer select-none"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <p className="font-medium tabular text-xs">{e.enqNo}</p>
                        {e.vip && <Crown className="h-3 w-3 text-brand" />}
                      </div>
                      <p className="text-[11px] text-muted-foreground tabular">{formatDate(e.enquiredOn)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={e.name} size={32} />
                        <div className="min-w-0">
                          <p className="font-medium truncate">{e.name}</p>
                          <p className="text-xs text-muted-foreground tabular truncate">{e.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={e.type === "Hall" ? "brand" : e.type === "Room" ? "info" : "accent"}>
                        {e.type === "Room" ? <BedDouble className="h-3 w-3" /> : e.type === "Hall" ? <Building2 className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
                        {e.type}
                      </Badge>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {e.type === "Hall" || e.type === "Both" ? `${e.hallName} · ${e.guestCount}pax` : ""}
                        {e.type === "Both" && " · "}
                        {e.type === "Room" || e.type === "Both" ? `${e.roomCount}rm × ${e.roomNights}N` : ""}
                      </p>
                    </td>
                    <td className="px-4 py-3"><Badge tone="neutral">{e.source}</Badge></td>
                    <td className="px-4 py-3 text-right">
                      {e.budget ? (
                        <>
                          <p className="tabular font-medium">{money(e.budget)}</p>
                          {e.quotedAmount && <p className="text-[11px] text-muted-foreground tabular">Quoted: {money(e.quotedAmount)}</p>}
                        </>
                      ) : <span className="text-xs text-subtle-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3"><Badge tone={STATUS_TONE[e.status]}>{STATUS_LABEL[e.status]}</Badge></td>
                    <td className="px-4 py-3">
                      {e.nextFollowUp ? (
                        <>
                          <p className="text-xs tabular">{formatDate(e.nextFollowUp)}</p>
                          <p className={cn(
                            "text-[10px] font-semibold inline-flex items-center gap-0.5",
                            fu.tone === "danger" && "text-danger",
                            fu.tone === "warning" && "text-warning",
                            fu.tone === "info" && "text-info",
                            fu.tone === "success" && "text-success",
                          )}>
                            {fu.tone === "danger" ? <AlertTriangle className="h-2.5 w-2.5" /> : <Clock className="h-2.5 w-2.5" />}
                            {fu.label}
                          </p>
                        </>
                      ) : <span className="text-xs text-subtle-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Avatar name={e.assignedTo} size={22} />
                        <span className="text-xs truncate">{e.assignedTo}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1 items-center">
                        {(e.status === "lost" || e.status === "cold") && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground mr-1" title={e.status === "lost" ? "Lost · no further follow-up" : "Cold · paused outreach"}>
                            <Ban className="h-2.5 w-2.5" />
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={ev => { ev.stopPropagation(); setSelected(e); }}
                          className="h-8 w-8 rounded-md border border-border hover:bg-brand hover:text-brand-foreground hover:border-brand inline-flex items-center justify-center text-muted-foreground transition-colors"
                          title="View detail + follow-ups"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        {!e.thankYouSent && (
                          <button
                            type="button"
                            onClick={ev => {
                              ev.stopPropagation();
                              updateEnquiry(e.id, { thankYouSent: true });
                              addFollowUp(e.id, { id: `f${Date.now()}`, date: isoDate(TODAY), kind: "email", by: "System", outcome: "Thank-you letter sent", done: true });
                              const to = e.email;
                              if (!to) { showToast(`Marked thank-you for ${e.name} (no email on file)`); return; }
                              showToast(`Emailing ${e.name}…`);
                              sendEmail({ to, subject: "Thank you for your enquiry", heading: "Thank You", greeting: e.name, intro: "Thank you for reaching out to The Pearl Palace. Our team will follow up with you shortly.", context: "Enquiry thank-you" })
                                .then(() => showToast(`Thank-you email sent to ${e.name}`))
                                .catch(() => showToast(`Couldn't email ${e.name}`));
                            }}
                            className="h-8 w-8 rounded-md border border-border hover:bg-success hover:text-white hover:border-success inline-flex items-center justify-center text-muted-foreground transition-colors"
                            title="Send thank-you email"
                          >
                            <Mail className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {(e.status === "lost" || e.status === "cold") && (
                          <button
                            type="button"
                            onClick={ev => { ev.stopPropagation(); updateEnquiry(e.id, { status: "new", nextFollowUp: daysFromNow(1) }); showToast(`${e.enqNo} reopened · next follow-up tomorrow`); }}
                            className="h-8 w-8 rounded-md border border-border hover:bg-info hover:text-white hover:border-info inline-flex items-center justify-center text-muted-foreground transition-colors"
                            title="Reopen enquiry"
                          >
                            <RotateCw className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={ev => { ev.stopPropagation(); showToast(`More actions for ${e.enqNo}`); }}
                          className="h-8 w-8 rounded-md border border-border hover:bg-surface-sunken inline-flex items-center justify-center text-muted-foreground transition-colors"
                          title="More actions"
                        >
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={ev => { ev.stopPropagation(); if (window.confirm(`Delete enquiry ${e.enqNo}?`)) { setEnquiries(es => es.filter(x => x.id !== e.id)); showToast(`Enquiry ${e.enqNo} deleted`); apiDelete(`/enquiries/${e.id}`).catch(() => showToast("⚠ Delete failed — backend offline")); } }}
                          className="h-8 w-8 rounded-md border border-border hover:bg-danger-soft hover:text-danger inline-flex items-center justify-center text-muted-foreground transition-colors"
                          title="Delete enquiry"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        <ChevronRight className="h-3.5 w-3.5 text-subtle-foreground ml-0.5" />
                      </div>
                    </td>
                  </tr>
                );
              })}
              {list.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  <Search className="h-8 w-8 mx-auto text-subtle-foreground mb-2" />
                  <p className="font-medium">No enquiries match your filters</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Detail drawer */}
      {selectedLive && (
        <EnquiryDetail
          enquiry={selectedLive}
          onClose={() => setSelected(null)}
          onUpdate={(patch) => updateEnquiry(selectedLive.id, patch)}
          onAddFollowUp={(fu) => addFollowUp(selectedLive.id, fu)}
          onMarkFollowUpDone={(fuId, outcome) => markFollowUpDone(selectedLive.id, fuId, outcome)}
          onShowToast={showToast}
        />
      )}

      {/* New Enquiry modal */}
      {newOpen && (
        <NewEnquiryModal
          onClose={() => setNewOpen(false)}
          onSave={(e) => {
            setNewOpen(false);
            showToast(`Enquiry ${e.enqNo} created · auto thank-you sent`);
            const { id: _drop, ...payload } = e;
            void _drop;
            apiPost<Enquiry>("/enquiries", payload)
              .then(created => setEnquiries(es => [{ ...created, followUps: created.followUps ?? [] }, ...es]))
              .catch(() => showToast("⚠ Save failed — backend offline"));
          }}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-foreground text-background rounded-lg px-4 py-3 text-sm shadow-2xl animate-in slide-in-from-bottom-2 inline-flex items-center gap-2.5 ring-1 ring-foreground/20">
          <span className="h-6 w-6 rounded-full bg-success text-white inline-flex items-center justify-center"><CheckCircle2 className="h-3.5 w-3.5" /></span>
          <span className="font-medium">{toast}</span>
        </div>
      )}
    </div>
  );
}

// ===================== ENQUIRY DETAIL DRAWER =====================
function EnquiryDetail({ enquiry, onClose, onUpdate, onAddFollowUp, onMarkFollowUpDone, onShowToast }: {
  enquiry: Enquiry;
  onClose: () => void;
  onUpdate: (patch: Partial<Enquiry>) => void;
  onAddFollowUp: (fu: FollowUp) => void;
  onMarkFollowUpDone: (fuId: string, outcome: string) => void;
  onShowToast: (m: string) => void;
}) {
  const [tab, setTab] = React.useState<"detail" | "followups" | "notes">("detail");

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  const pendingFU = enquiry.followUps.find(f => !f.done);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs" onClick={onClose} aria-hidden />
      <aside className="fixed top-0 right-0 z-50 h-svh w-full sm:w-[560px] lg:w-[640px] bg-surface border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right-2">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border bg-gradient-to-br from-brand-soft/40 via-surface to-accent-soft/20">
          <div className="flex items-start gap-4">
            <Avatar name={enquiry.name} size={56} vip={enquiry.vip} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-semibold truncate">{enquiry.name}</h2>
                {enquiry.vip && <Badge tone="brand"><Crown className="h-3 w-3" />VIP</Badge>}
                <Badge tone={STATUS_TONE[enquiry.status]}>{STATUS_LABEL[enquiry.status]}</Badge>
              </div>
              <p className="text-xs text-muted-foreground tabular mt-0.5">{enquiry.enqNo} · enquired {formatDate(enquiry.enquiredOn)}</p>
              {enquiry.company && <p className="text-xs text-muted-foreground mt-0.5">{enquiry.company}</p>}
            </div>
            <button type="button" onClick={onClose} className="h-8 w-8 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
          </div>

          {/* Quick contact actions */}
          <div className="mt-4 flex flex-wrap gap-1.5">
            <a href={`tel:${enquiry.phone}`} className="h-8 px-2.5 rounded-md border border-border bg-surface/80 hover:bg-surface text-xs font-medium inline-flex items-center gap-1.5"><Phone className="h-3 w-3" />Call</a>
            <a href={`mailto:${enquiry.email}`} className="h-8 px-2.5 rounded-md border border-border bg-surface/80 hover:bg-surface text-xs font-medium inline-flex items-center gap-1.5"><Mail className="h-3 w-3" />Email</a>
            <button onClick={() => onShowToast(`WhatsApp opened to ${enquiry.name}`)} className="h-8 px-2.5 rounded-md border border-border bg-surface/80 hover:bg-surface text-xs font-medium inline-flex items-center gap-1.5"><MessageCircle className="h-3 w-3" />WhatsApp</button>
            {!enquiry.thankYouSent && (
              <button onClick={() => { onUpdate({ thankYouSent: true }); onAddFollowUp({ id: `f${Date.now()}`, date: new Date().toISOString().slice(0, 10), kind: "email", by: "System", outcome: "Thank-you letter sent", done: true }); onShowToast(`Thank-you email sent to ${enquiry.name}`); }} className="h-8 px-2.5 rounded-md bg-success text-white text-xs font-medium inline-flex items-center gap-1.5"><Send className="h-3 w-3" />Send thank-you</button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-border flex items-center gap-1 px-3 shrink-0">
          {([
            { id: "detail", label: "Detail", icon: FileText },
            { id: "followups", label: `Follow-ups (${enquiry.followUps.length})`, icon: Bell },
            { id: "notes", label: "Notes", icon: Edit },
          ] as const).map(t => {
            const active = tab === t.id;
            const Icon = t.icon;
            return (
              <button key={t.id} type="button" onClick={() => setTab(t.id)} className={cn(
                "px-3 py-2.5 text-sm font-medium border-b-2 transition-colors inline-flex items-center gap-1.5",
                active ? "border-brand text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              )}>
                <Icon className="h-3.5 w-3.5" />{t.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {tab === "detail" && (
            <>
              {/* Enquiry summary */}
              <div className="rounded-md border border-border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Requirement</p>
                  <Badge tone={enquiry.type === "Hall" ? "brand" : enquiry.type === "Room" ? "info" : "accent"}>{enquiry.type}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {(enquiry.type === "Hall" || enquiry.type === "Both") && (
                    <>
                      <KV label="Hall" value={enquiry.hallName ?? "—"} icon={Building2} />
                      <KV label="Guests" value={`${enquiry.guestCount} pax`} icon={Users} />
                      <KV label="Event date" value={enquiry.eventDate ? formatDate(enquiry.eventDate) : "—"} icon={Calendar} />
                    </>
                  )}
                  {(enquiry.type === "Room" || enquiry.type === "Both") && (
                    <>
                      <KV label="Rooms" value={`${enquiry.roomCount} × ${enquiry.roomNights}N`} icon={BedDouble} />
                      <KV label="Check-in" value={enquiry.checkIn ? formatDate(enquiry.checkIn) : "—"} icon={Calendar} />
                      <KV label="Check-out" value={enquiry.checkOut ? formatDate(enquiry.checkOut) : "—"} icon={Calendar} />
                    </>
                  )}
                </div>
              </div>

              {/* Budget vs Quoted */}
              <div className="rounded-md border border-border p-4 space-y-2">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Money</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <KV label="Budget" value={enquiry.budget ? money(enquiry.budget) : "Not stated"} icon={IndianRupee} />
                  <KV label="Quoted" value={enquiry.quotedAmount ? money(enquiry.quotedAmount) : "Not quoted yet"} icon={Tag} />
                </div>
              </div>

              {/* Contact */}
              <div className="rounded-md border border-border p-4 space-y-2">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Contact</p>
                <div className="grid grid-cols-1 gap-3 text-sm">
                  <KV label="Phone" value={enquiry.phone} icon={Phone} />
                  <KV label="Email" value={enquiry.email} icon={Mail} />
                  <KV label="Source" value={enquiry.source} icon={Tag} />
                  <KV label="Assigned to" value={enquiry.assignedTo} icon={Users} />
                </div>
              </div>

              {/* Pipeline status update */}
              <div className="rounded-md border border-border p-4 space-y-2">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Pipeline status</p>
                <Select value={enquiry.status} onChange={e => onUpdate({ status: e.target.value as EnquiryStatus })} className="h-9">
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="quoted">Quoted</option>
                  <option value="negotiating">Negotiating</option>
                  <option value="won">Won</option>
                  <option value="lost">Lost</option>
                  <option value="cold">Cold</option>
                </Select>
                {enquiry.status === "negotiating" && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <Button variant="success" size="sm" onClick={() => { onUpdate({ status: "won" }); onShowToast(`Marked WON · convert to booking`); }}>
                      <ThumbsUp className="h-3.5 w-3.5" />Mark Won
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => { onUpdate({ status: "lost" }); onShowToast(`Marked LOST`); }}>
                      <ThumbsDown className="h-3.5 w-3.5" />Mark Lost
                    </Button>
                  </div>
                )}
                {enquiry.status === "won" && (
                  <Link
                    href={enquiry.type === "Hall"
                      ? `/halls/new?${new URLSearchParams(
                          Object.entries({
                            customer: enquiry.name, phone: enquiry.phone, email: enquiry.email,
                            date: enquiry.eventDate, pax: enquiry.guestCount, hall: enquiry.hallName, enq: enquiry.enqNo,
                          }).filter(([, v]) => v != null && v !== "").map(([k, v]) => [k, String(v)]),
                        ).toString()}`
                      : "/bookings/new"}
                    className="block">
                    <Button variant="success" className="w-full" size="sm">
                      <ArrowRight className="h-3.5 w-3.5" />Convert to {enquiry.type === "Hall" ? "Hall Booking" : "Booking"}
                    </Button>
                  </Link>
                )}
              </div>
            </>
          )}

          {tab === "followups" && (
            <FollowUpsTab
              enquiry={enquiry}
              pendingFU={pendingFU}
              onAddFollowUp={onAddFollowUp}
              onMarkFollowUpDone={onMarkFollowUpDone}
              onShowToast={onShowToast}
            />
          )}

          {tab === "notes" && (
            <NotesTab enquiry={enquiry} onUpdate={onUpdate} onShowToast={onShowToast} />
          )}
        </div>
      </aside>
    </>
  );
}

function KV({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Phone }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="h-7 w-7 rounded-md bg-surface-sunken text-muted-foreground inline-flex items-center justify-center shrink-0"><Icon className="h-3.5 w-3.5" /></span>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
        <p className="text-sm font-medium truncate">{value}</p>
      </div>
    </div>
  );
}

// ===================== FOLLOW-UPS TAB =====================
function FollowUpsTab({ enquiry, pendingFU, onAddFollowUp, onMarkFollowUpDone, onShowToast }: {
  enquiry: Enquiry; pendingFU?: FollowUp;
  onAddFollowUp: (fu: FollowUp) => void;
  onMarkFollowUpDone: (fuId: string, outcome: string) => void;
  onShowToast: (m: string) => void;
}) {
  const [addOpen, setAddOpen] = React.useState(false);
  const [kind, setKind] = React.useState<FollowUp["kind"]>("call");
  const [date, setDate] = React.useState(isoDate(TODAY));
  const [nextStep, setNextStep] = React.useState("");
  const todayISO = new Date().toLocaleDateString("en-CA"); // blocks past dates on next follow-up

  const [completeFor, setCompleteFor] = React.useState<string | null>(null);
  const [outcome, setOutcome] = React.useState("");

  const submit = () => {
    onAddFollowUp({
      id: `f${Date.now()}`,
      date, kind, by: enquiry.assignedTo,
      nextStep,
      done: false,
    });
    setAddOpen(false);
    setNextStep("");
    onShowToast(`Follow-up scheduled · ${formatDate(date)}`);
  };

  const completeFollowUp = () => {
    if (!completeFor) return;
    onMarkFollowUpDone(completeFor, outcome || "Done");
    setCompleteFor(null);
    setOutcome("");
    onShowToast(`Follow-up marked done`);
  };

  // Sort follow-ups: pending first by date, then completed by date desc
  const sorted = [...enquiry.followUps].sort((a, b) => {
    if (a.done === b.done) return new Date(b.date).getTime() - new Date(a.date).getTime();
    return a.done ? 1 : -1;
  });

  return (
    <div className="space-y-3">
      {/* Pending reminder */}
      {pendingFU && (
        <div className={cn(
          "rounded-md border p-3",
          followUpDue(pendingFU.date).tone === "danger" ? "bg-danger-soft border-danger/40" :
          followUpDue(pendingFU.date).tone === "warning" ? "bg-warning-soft border-warning/40" :
          "bg-info-soft border-info/40"
        )}>
          <div className="flex items-start gap-2">
            <Bell className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-wider">Upcoming follow-up · {followUpDue(pendingFU.date).label}</p>
              <p className="text-sm mt-1 inline-flex items-center gap-1.5">
                {React.createElement(KIND_ICON[pendingFU.kind], { className: "h-3.5 w-3.5" })}
                {pendingFU.kind} · {formatDate(pendingFU.date)} · by {pendingFU.by}
              </p>
              {pendingFU.nextStep && <p className="text-xs mt-1 italic">&ldquo;{pendingFU.nextStep}&rdquo;</p>}
              <Button size="sm" variant="success" className="mt-2" onClick={() => { setCompleteFor(pendingFU.id); setOutcome(""); }}>
                <CheckCircle2 className="h-3.5 w-3.5" />Mark done
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add follow-up */}
      {!addOpen ? (
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="h-3.5 w-3.5" />Schedule follow-up
        </Button>
      ) : (
        <div className="rounded-md border border-border bg-surface p-3 space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">New follow-up</p>
          <div className="grid grid-cols-5 gap-1.5">
            {([
              { id: "call", label: "Call", icon: Phone },
              { id: "email", label: "Email", icon: Mail },
              { id: "whatsapp", label: "WhatsApp", icon: MessageCircle },
              { id: "meeting", label: "Meeting", icon: Briefcase },
              { id: "note", label: "Note", icon: FileText },
            ] as const).map(t => {
              const Icon = t.icon;
              return (
                <button key={t.id} type="button" onClick={() => setKind(t.id)} className={cn(
                  "h-12 rounded-md border flex flex-col items-center justify-center gap-0.5 transition-colors",
                  kind === t.id ? "bg-brand text-brand-foreground border-brand" : "border-border hover:bg-surface-sunken text-muted-foreground"
                )}>
                  <Icon className="h-3.5 w-3.5" />
                  <span className="text-[10px] leading-none">{t.label}</span>
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Date</Label>
              <Input type="date" value={date} min={todayISO} onChange={e => setDate(e.target.value)} className="h-9 tabular" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Next step / agenda</Label>
            <textarea value={nextStep} onChange={e => setNextStep(e.target.value)} rows={2} placeholder="e.g. Confirm hall menu + decor choices · get advance payment commitment" className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm placeholder:text-subtle-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 outline-hidden resize-y min-h-[56px]" />
          </div>
          <div className="flex justify-end gap-1.5 pt-1">
            <Button size="sm" variant="ghost" onClick={() => { setAddOpen(false); setNextStep(""); }}>Cancel</Button>
            <Button size="sm" variant="success" onClick={submit}><Plus className="h-3.5 w-3.5" />Schedule</Button>
          </div>
        </div>
      )}

      {/* Complete follow-up modal */}
      {completeFor && (
        <div className="rounded-md border border-success/40 bg-success-soft/40 p-3 space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-success font-semibold">Mark follow-up done</p>
          <div className="space-y-1">
            <Label className="text-xs">What was the outcome?</Label>
            <textarea value={outcome} onChange={e => setOutcome(e.target.value)} rows={2} placeholder="e.g. Spoke for 10 min · client confirmed · sending updated proposal" className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm resize-y min-h-[56px]" />
          </div>
          <div className="flex justify-end gap-1.5">
            <Button size="sm" variant="ghost" onClick={() => setCompleteFor(null)}>Cancel</Button>
            <Button size="sm" variant="success" onClick={completeFollowUp}><CheckCircle2 className="h-3.5 w-3.5" />Save outcome</Button>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-2 pt-2 border-t border-border">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Activity timeline ({enquiry.followUps.length})</p>
        {sorted.length === 0 && (
          <p className="text-sm text-muted-foreground italic py-3">No activity yet · schedule the first follow-up</p>
        )}
        {sorted.map((f, i) => {
          const Icon = KIND_ICON[f.kind];
          const due = followUpDue(f.date);
          return (
            <div key={f.id} className="flex gap-3">
              <div className="flex flex-col items-center shrink-0">
                <span className={cn(
                  "h-8 w-8 rounded-full inline-flex items-center justify-center",
                  f.done ? "bg-success-soft text-success" :
                  due.tone === "danger" ? "bg-danger-soft text-danger" :
                  due.tone === "warning" ? "bg-warning-soft text-warning" :
                  "bg-info-soft text-info"
                )}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
                {i < sorted.length - 1 && <span className="flex-1 w-px bg-border mt-1" />}
              </div>
              <div className="flex-1 pb-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-sm font-medium capitalize">{f.kind} · by {f.by}</p>
                  <p className="text-[11px] text-muted-foreground tabular">{formatDate(f.date)}</p>
                </div>
                {f.outcome && <p className="text-xs text-muted-foreground mt-0.5">{f.outcome}</p>}
                {f.nextStep && !f.done && <p className="text-xs italic mt-0.5">Next: {f.nextStep}</p>}
                {f.done ? (
                  <Badge tone="success">✓ Done</Badge>
                ) : (
                  <Button size="sm" variant="ghost" className="mt-1 h-6 px-2" onClick={() => { setCompleteFor(f.id); setOutcome(""); }}>
                    Mark done
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ===================== NOTES TAB =====================
function NotesTab({ enquiry, onUpdate, onShowToast }: {
  enquiry: Enquiry;
  onUpdate: (patch: Partial<Enquiry>) => void;
  onShowToast: (m: string) => void;
}) {
  const [notes, setNotes] = React.useState(enquiry.notes);
  return (
    <div className="space-y-3">
      <Label className="text-xs">Internal notes</Label>
      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        rows={10}
        placeholder="Internal notes about this lead · decision-makers · client preferences · budget flexibility · objections · competitor info …"
        className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm placeholder:text-subtle-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 outline-hidden resize-y min-h-[300px]"
      />
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-muted-foreground">{notes.length} characters · only visible to sales team</p>
        <Button size="sm" variant="success" onClick={() => { onUpdate({ notes }); onShowToast("Notes saved"); }}>
          <CheckCircle2 className="h-3.5 w-3.5" />Save notes
        </Button>
      </div>
    </div>
  );
}

// ===================== NEW ENQUIRY MODAL =====================
function NewEnquiryModal({ onClose, onSave }: {
  onClose: () => void;
  onSave: (e: Enquiry) => void;
}) {
  const [type, setType] = React.useState<EnquiryType>("Hall");
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [company, setCompany] = React.useState("");
  const [source, setSource] = React.useState<EnquirySource>("Website");
  const [hallName, setHallName] = React.useState("Grand Ballroom");
  const [guestCount, setGuestCount] = React.useState(50);
  const [eventDate, setEventDate] = React.useState(daysFromNow(30));
  const [roomCount, setRoomCount] = React.useState(1);
  const [roomNights, setRoomNights] = React.useState(1);
  const [checkIn, setCheckIn] = React.useState(daysFromNow(7));
  const [budget, setBudget] = React.useState(0);
  const [assignedTo, setAssignedTo] = React.useState("Priya Sales");
  const [autoThankYou, setAutoThankYou] = React.useState(true);
  const todayISO = new Date().toLocaleDateString("en-CA"); // blocks past dates on event / check-in

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  const valid = name.trim() !== "" && isValidPhone(phone) && isValidEmail(email);

  const save = () => {
    const id = `enq-${Date.now()}`;
    const enqNo = `ENQ-2026-${1043 + Math.floor(Math.random() * 99)}`;
    const followUps: FollowUp[] = autoThankYou ? [
      { id: `f${Date.now()}`, date: isoDate(TODAY), kind: source === "WhatsApp" ? "whatsapp" : "email", by: "System", outcome: "Auto thank-you sent", done: true },
    ] : [];
    const checkOut = new Date(checkIn); checkOut.setDate(checkOut.getDate() + roomNights);
    const newEnq: Enquiry = {
      id, enqNo, type, name: name.trim(), phone, email, company: company || undefined, source,
      status: "new",
      hallName: type === "Hall" || type === "Both" ? hallName : undefined,
      guestCount: type === "Hall" || type === "Both" ? guestCount : undefined,
      eventDate: type === "Hall" || type === "Both" ? eventDate : undefined,
      roomCount: type === "Room" || type === "Both" ? roomCount : undefined,
      roomNights: type === "Room" || type === "Both" ? roomNights : undefined,
      checkIn: type === "Room" || type === "Both" ? checkIn : undefined,
      checkOut: type === "Room" || type === "Both" ? isoDate(checkOut) : undefined,
      budget: budget || undefined,
      enquiredOn: isoDate(TODAY),
      assignedTo,
      nextFollowUp: daysFromNow(1),
      followUps,
      notes: "",
      thankYouSent: autoThankYou,
      vip: false,
    };
    onSave(newEnq);
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <Card className="pointer-events-auto w-full max-w-xl p-0 animate-in shadow-xl overflow-hidden">
          <div className="px-5 py-4 bg-surface-elevated border-b border-border flex items-center gap-3">
            <span className="h-10 w-10 rounded-md bg-brand-soft text-brand-soft-foreground inline-flex items-center justify-center shrink-0">
              <MessageSquare className="h-5 w-5" />
            </span>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold">Log new enquiry</h3>
              <p className="text-xs text-muted-foreground">Auto thank-you email goes out once you save</p>
            </div>
            <button type="button" onClick={onClose} className="h-8 w-8 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
          </div>

          <div className="px-5 py-4 space-y-3 max-h-[68vh] overflow-y-auto">
            {/* Type */}
            <div className="grid grid-cols-3 gap-1.5">
              {(["Room", "Hall", "Both"] as EnquiryType[]).map(t => (
                <button key={t} type="button" onClick={() => setType(t)} className={cn(
                  "h-12 rounded-md border flex items-center justify-center gap-1.5 transition-colors",
                  type === t ? "bg-brand text-brand-foreground border-brand" : "border-border hover:bg-surface-sunken"
                )}>
                  {t === "Room" ? <BedDouble className="h-4 w-4" /> : t === "Hall" ? <Building2 className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                  <span className="text-sm font-medium">{t}</span>
                </button>
              ))}
            </div>

            {/* Contact */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Name *</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Customer name" className="h-9" autoFocus />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Phone *</Label>
                <PhoneInput value={phone} onChange={v => setPhone(v)} size="sm" invalid={phone !== "" && !isValidPhone(phone)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Email</Label>
                <EmailInput value={email} onChange={setEmail} placeholder="customer@example.com" className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Company (optional)</Label>
                <Input value={company} onChange={e => setCompany(e.target.value)} placeholder="Organization" className="h-9" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Source</Label>
                <Select value={source} onChange={e => setSource(e.target.value as EnquirySource)} className="h-9">
                  <option>Website</option><option>Phone</option><option>Email</option><option>WhatsApp</option>
                  <option>Walk-in</option><option>Agent</option><option>Referral</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Assigned to</Label>
                <Select value={assignedTo} onChange={e => setAssignedTo(e.target.value)} className="h-9">
                  <option>Priya Sales</option>
                  <option>Aman Sales</option>
                  <option>Khalid R.</option>
                </Select>
              </div>
            </div>

            {/* Hall requirements */}
            {(type === "Hall" || type === "Both") && (
              <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border">
                <div className="space-y-1.5">
                  <Label className="text-xs"><Building2 className="h-3 w-3 inline mr-1" />Hall</Label>
                  <Select value={hallName} onChange={e => setHallName(e.target.value)} className="h-9">
                    <option>Grand Ballroom</option>
                    <option>Pearl Hall</option>
                    <option>Marina Suite</option>
                    <option>Crystal Hall</option>
                    <option>Boardroom A</option>
                    <option>Conference Room 1</option>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Guests</Label>
                  <Input type="number" min={1} value={guestCount} onChange={e => setGuestCount(Number(e.target.value))} className="h-9 tabular" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Event date</Label>
                  <Input type="date" value={eventDate} min={todayISO} onChange={e => setEventDate(e.target.value)} className="h-9 tabular" />
                </div>
              </div>
            )}

            {/* Room requirements */}
            {(type === "Room" || type === "Both") && (
              <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border">
                <div className="space-y-1.5">
                  <Label className="text-xs"><BedDouble className="h-3 w-3 inline mr-1" />Rooms</Label>
                  <Input type="number" min={1} value={roomCount} onChange={e => setRoomCount(Number(e.target.value))} className="h-9 tabular" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Nights</Label>
                  <Input type="number" min={1} value={roomNights} onChange={e => setRoomNights(Number(e.target.value))} className="h-9 tabular" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Check-in date</Label>
                  <Input type="date" value={checkIn} min={todayISO} onChange={e => setCheckIn(e.target.value)} className="h-9 tabular" />
                </div>
              </div>
            )}

            {/* Budget */}
            <div className="pt-2 border-t border-border space-y-1.5">
              <Label className="text-xs">Budget (₹) — optional</Label>
              <Input type="number" min={0} value={budget || ""} onChange={e => setBudget(Number(e.target.value))} placeholder="Not stated" className="h-9 tabular" />
            </div>

            {/* Auto thank-you */}
            <button type="button" onClick={() => setAutoThankYou(!autoThankYou)} className={cn(
              "w-full rounded-md border-2 p-2.5 text-left transition-colors flex items-center gap-3",
              autoThankYou ? "border-success bg-success-soft" : "border-dashed border-border hover:bg-surface-sunken"
            )}>
              {autoThankYou ? <CheckCircle2 className="h-4 w-4 text-success shrink-0" /> : <Mail className="h-4 w-4 text-muted-foreground shrink-0" />}
              <div>
                <p className="text-sm font-medium">Auto-send thank-you {source === "WhatsApp" ? "WhatsApp" : "email"}</p>
                <p className="text-[11px] text-muted-foreground">Standard template · brand voice · within 60 seconds</p>
              </div>
            </button>
          </div>

          <div className="px-5 py-3 border-t border-border bg-surface-elevated flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button onClick={save} disabled={!valid} variant="success">
              <CheckCircle2 className="h-4 w-4" />Save enquiry
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}
