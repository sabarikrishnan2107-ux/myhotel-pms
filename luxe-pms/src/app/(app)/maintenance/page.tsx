"use client";
import * as React from "react";
import {
  Plus, Search, Wrench, AlertCircle, Clock, CheckCircle2, User,
  LayoutGrid, List as ListIcon, ChevronDown, ChevronUp, ArrowUpDown,
  MapPin, Tag, ChevronRight, X, Calendar, RotateCw, FileText, IndianRupee,
  Phone, Mail, Building2, ShieldCheck, Sparkles, Edit, Bell, AlertTriangle,
  CalendarClock, Filter,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { KPICard } from "@/components/ui/kpi-card";
import { MAINTENANCE_TICKETS, TECHNICIANS, type Priority, type TicketStatus } from "@/lib/mock-data-ext";
import { cn, money, formatDate } from "@/lib/utils";
import { apiGet, apiPost, apiPut } from "@/lib/api";
import { useProperty, hotelName } from "@/lib/use-property";

type Ticket = typeof MAINTENANCE_TICKETS[number];
let __mtkt = 2402;
const nextTicketCode = () => `M-${++__mtkt}`;

const PRIORITY_TONE = { low: "neutral", medium: "info", high: "warning", urgent: "danger" } as const;
const STATUS_TONE = { open: "warning", assigned: "info", "in-progress": "brand", resolved: "success" } as const;
const STATUS_LABEL: Record<TicketStatus, string> = { open: "Open", assigned: "Assigned", "in-progress": "In Progress", resolved: "Resolved" };
const NEXT_STATUS: Record<TicketStatus, TicketStatus> = { open: "assigned", assigned: "in-progress", "in-progress": "resolved", resolved: "resolved" };
const PRIORITY_RANK: Record<Priority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
const STATUS_RANK: Record<TicketStatus, number> = { open: 0, assigned: 1, "in-progress": 2, resolved: 3 };

const LANES: { id: TicketStatus; label: string }[] = [
  { id: "open", label: "Open" },
  { id: "assigned", label: "Assigned" },
  { id: "in-progress", label: "In Progress" },
  { id: "resolved", label: "Resolved" },
];

const CATEGORIES = Array.from(new Set(MAINTENANCE_TICKETS.map(t => t.category)));

type SortKey = "code" | "room" | "priority" | "status" | "assignee" | "reported" | "category";
type SortDir = "asc" | "desc";

// ============ PREVENTIVE MAINTENANCE SCHEDULES ============
type Frequency = "daily" | "weekly" | "monthly" | "quarterly";
type ScheduleItem = {
  id: string;
  equipment: string;
  area: string;
  category: string;
  frequency: Frequency;
  lastDone: string;     // ISO date
  nextDue: string;      // ISO date
  assignee: string;
  durationMin: number;
};

// Today reference for the demo
const TODAY = new Date("2026-05-24");
const isoDate = (d: Date) => d.toISOString().slice(0, 10);
const daysFromNow = (n: number) => { const d = new Date(TODAY); d.setDate(d.getDate() + n); return isoDate(d); };

const SCHEDULES: ScheduleItem[] = [
  // DAILY
  { id: "sc1",  equipment: "Pool chlorine check",        area: "Swimming Pool",     category: "Pool",        frequency: "daily",     lastDone: daysFromNow(-1), nextDue: daysFromNow(0),  assignee: "Mahmoud S.", durationMin: 10 },
  { id: "sc2",  equipment: "Kitchen walk-in fridge temp", area: "Main Kitchen",      category: "HVAC",        frequency: "daily",     lastDone: daysFromNow(-1), nextDue: daysFromNow(0),  assignee: "Ravi K.",    durationMin: 5  },
  { id: "sc3",  equipment: "Lobby AC filter inspection",  area: "Lobby",             category: "HVAC",        frequency: "daily",     lastDone: daysFromNow(-1), nextDue: daysFromNow(0),  assignee: "Ravi K.",    durationMin: 15 },
  // WEEKLY
  { id: "sc4",  equipment: "Generator test run",          area: "Basement · DG room", category: "Electrical", frequency: "weekly",    lastDone: daysFromNow(-5), nextDue: daysFromNow(2),  assignee: "Joseph L.",  durationMin: 30 },
  { id: "sc5",  equipment: "Water tank chlorination",    area: "Rooftop · Tank #1", category: "Plumbing",    frequency: "weekly",    lastDone: daysFromNow(-6), nextDue: daysFromNow(1),  assignee: "Ahmed F.",   durationMin: 45 },
  { id: "sc6",  equipment: "Fire-alarm panel test",      area: "Control Room",      category: "Safety",      frequency: "weekly",    lastDone: daysFromNow(-7), nextDue: daysFromNow(0),  assignee: "Joseph L.",  durationMin: 20 },
  { id: "sc7",  equipment: "Lift cabin inspection",      area: "Service Lift",      category: "Access",      frequency: "weekly",    lastDone: daysFromNow(-3), nextDue: daysFromNow(4),  assignee: "Mahmoud S.", durationMin: 25 },
  // MONTHLY
  { id: "sc8",  equipment: "Deep AC coil cleaning",      area: "All guest floors",  category: "HVAC",        frequency: "monthly",   lastDone: daysFromNow(-20), nextDue: daysFromNow(10), assignee: "Ravi K.",    durationMin: 240 },
  { id: "sc9",  equipment: "Pest control treatment",     area: "Kitchens · F&B",    category: "Cleaning",    frequency: "monthly",   lastDone: daysFromNow(-15), nextDue: daysFromNow(15), assignee: "Ahmed F.",   durationMin: 120 },
  { id: "sc10", equipment: "Fire extinguisher refill check", area: "All floors",   category: "Safety",      frequency: "monthly",   lastDone: daysFromNow(-25), nextDue: daysFromNow(5),  assignee: "Joseph L.",  durationMin: 90 },
  { id: "sc11", equipment: "Boiler descaling",           area: "Hot water plant",   category: "Plumbing",    frequency: "monthly",   lastDone: daysFromNow(-28), nextDue: daysFromNow(2),  assignee: "Ahmed F.",   durationMin: 180 },
  // QUARTERLY
  { id: "sc12", equipment: "Lift annual inspection",     area: "All elevators",     category: "Access",      frequency: "quarterly", lastDone: daysFromNow(-60), nextDue: daysFromNow(30), assignee: "AMC · ElevPro", durationMin: 480 },
  { id: "sc13", equipment: "Pool tile + grout repair",   area: "Swimming Pool",     category: "Pool",        frequency: "quarterly", lastDone: daysFromNow(-75), nextDue: daysFromNow(15), assignee: "Mahmoud S.", durationMin: 360 },
  { id: "sc14", equipment: "Building exterior inspection", area: "Facade",         category: "Civil",        frequency: "quarterly", lastDone: daysFromNow(-80), nextDue: daysFromNow(10), assignee: "AMC · BuildSafe", durationMin: 240 },
];

// ============ AMC VENDORS ============
type AMCVendor = {
  id: string;
  name: string;
  category: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  contractStart: string;
  contractEnd: string;
  annualFee: number;
  visitFrequency: Frequency;
  lastVisit: string;
  nextVisit: string;
  slaResponseHours: number;
  status: "active" | "renewal-due" | "expired";
  notes?: string;
};

const AMC_VENDORS: AMCVendor[] = [
  { id: "amc1", name: "ElevPro Engineering",    category: "Elevator / Lift",       contactPerson: "Suresh Kapoor",  phone: "+91 98765 12345", email: "service@elevpro.in",   address: "Andheri East, Mumbai",   contractStart: "2025-08-01", contractEnd: "2026-07-31", annualFee: 144000, visitFrequency: "monthly",   lastVisit: daysFromNow(-22), nextVisit: daysFromNow(8),   slaResponseHours: 4,  status: "renewal-due" },
  { id: "amc2", name: "CoolBreeze HVAC Pvt",    category: "HVAC / Cooling",         contactPerson: "Ananya Iyer",    phone: "+91 91234 56780", email: "amc@coolbreeze.in",    address: "Powai, Mumbai",          contractStart: "2026-01-01", contractEnd: "2026-12-31", annualFee: 240000, visitFrequency: "monthly",   lastVisit: daysFromNow(-12), nextVisit: daysFromNow(18),  slaResponseHours: 6,  status: "active" },
  { id: "amc3", name: "AquaPure Pool Services", category: "Pool / Spa",            contactPerson: "Rahul Sharma",   phone: "+91 99887 65432", email: "rahul@aquapure.in",    address: "Bandra West, Mumbai",    contractStart: "2025-04-01", contractEnd: "2026-03-31", annualFee: 96000,  visitFrequency: "weekly",    lastVisit: daysFromNow(-3),  nextVisit: daysFromNow(4),   slaResponseHours: 12, status: "expired" },
  { id: "amc4", name: "PestGuard India",        category: "Pest Control",           contactPerson: "Vikram Singh",   phone: "+91 95432 10987", email: "ops@pestguard.in",     address: "Vile Parle, Mumbai",     contractStart: "2026-02-01", contractEnd: "2027-01-31", annualFee: 60000,  visitFrequency: "monthly",   lastVisit: daysFromNow(-15), nextVisit: daysFromNow(15),  slaResponseHours: 24, status: "active" },
  { id: "amc5", name: "SafeNet Fire Systems",   category: "Fire Safety",            contactPerson: "Priya Mehta",    phone: "+91 96543 21098", email: "service@safenet.in",   address: "Worli, Mumbai",          contractStart: "2025-12-01", contractEnd: "2026-11-30", annualFee: 180000, visitFrequency: "quarterly", lastVisit: daysFromNow(-45), nextVisit: daysFromNow(45),  slaResponseHours: 2,  status: "active" },
  { id: "amc6", name: "BuildSafe Civil",        category: "Civil / Structural",     contactPerson: "Dilip Joshi",    phone: "+91 94321 09876", email: "amc@buildsafe.in",     address: "Lower Parel, Mumbai",    contractStart: "2025-09-01", contractEnd: "2026-08-31", annualFee: 360000, visitFrequency: "quarterly", lastVisit: daysFromNow(-80), nextVisit: daysFromNow(10),  slaResponseHours: 24, status: "active" },
  { id: "amc7", name: "Westside Generators",    category: "Generator / DG",         contactPerson: "Karan Rao",      phone: "+91 93210 98765", email: "service@westgen.in",   address: "Goregaon West, Mumbai",  contractStart: "2026-03-01", contractEnd: "2027-02-28", annualFee: 84000,  visitFrequency: "quarterly", lastVisit: daysFromNow(-50), nextVisit: daysFromNow(40),  slaResponseHours: 6,  status: "active" },
  { id: "amc8", name: "GlassClean Pro",         category: "Facade / Window Cleaning", contactPerson: "Ravi Patel",   phone: "+91 92109 87654", email: "ops@glassclean.in",    address: "Malad West, Mumbai",     contractStart: "2026-04-01", contractEnd: "2027-03-31", annualFee: 120000, visitFrequency: "monthly",   lastVisit: daysFromNow(-18), nextVisit: daysFromNow(12),  slaResponseHours: 48, status: "active" },
];

const FREQ_LABEL: Record<Frequency, string> = { daily: "Daily", weekly: "Weekly", monthly: "Monthly", quarterly: "Quarterly" };
const FREQ_TONE: Record<Frequency, "info" | "brand" | "accent" | "success"> = { daily: "info", weekly: "brand", monthly: "accent", quarterly: "success" };

function dueStatus(nextDue: string): { tone: "danger" | "warning" | "info" | "success"; label: string; daysOff: number } {
  const due = new Date(nextDue);
  const diff = Math.floor((due.getTime() - TODAY.getTime()) / (24 * 60 * 60 * 1000));
  if (diff < 0) return { tone: "danger", label: `${-diff}d overdue`, daysOff: diff };
  if (diff === 0) return { tone: "warning", label: "Due today", daysOff: 0 };
  if (diff <= 3) return { tone: "warning", label: `Due in ${diff}d`, daysOff: diff };
  if (diff <= 7) return { tone: "info", label: `Due in ${diff}d`, daysOff: diff };
  return { tone: "success", label: `Due in ${diff}d`, daysOff: diff };
}

type MainTab = "reactive" | "schedule" | "amc";

export default function MaintenancePage() {
  const name = hotelName(useProperty());
  const [view, setView] = React.useState<"cards" | "list">("cards");
  const [q, setQ] = React.useState("");
  const [priority, setPriority] = React.useState<"all" | Priority>("all");
  const [category, setCategory] = React.useState<"all" | string>("all");
  const [technician, setTechnician] = React.useState<"all" | "unassigned" | string>("all");
  const [statusFilter, setStatusFilter] = React.useState<"all" | TicketStatus>("all");
  const [sortKey, setSortKey] = React.useState<SortKey>("reported");
  const [sortDir, setSortDir] = React.useState<SortDir>("asc");

  // Top-level tabs
  const [mainTab, setMainTab] = React.useState<MainTab>("reactive");
  const [freqFilter, setFreqFilter] = React.useState<"all" | Frequency>("all");
  const [newTicketOpen, setNewTicketOpen] = React.useState(false);
  const [scheduleDetail, setScheduleDetail] = React.useState<ScheduleItem | null>(null);
  const [amcDetail, setAmcDetail] = React.useState<AMCVendor | null>(null);
  const [assignFor, setAssignFor] = React.useState<typeof MAINTENANCE_TICKETS[number] | null>(null);
  const [toast, setToast] = React.useState<string | null>(null);

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };

  // Preventive schedules & AMC vendors: seed from the const (offline fallback),
  // replaced by the backend on mount; .catch keeps the seed when offline.
  const [schedules, setSchedules] = React.useState<ScheduleItem[]>(SCHEDULES);
  const [amcVendors, setAmcVendors] = React.useState<AMCVendor[]>(AMC_VENDORS);
  React.useEffect(() => {
    let cancelled = false;
    apiGet<ScheduleItem[]>("/maintenance-schedules").then(r => { if (!cancelled && r.length) setSchedules(r); }).catch(() => {});
    apiGet<AMCVendor[]>("/amc-contracts").then(r => { if (!cancelled && r.length) setAmcVendors(r); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // ----- Counts for hero strip -----
  const dueToday = schedules.filter(s => dueStatus(s.nextDue).daysOff === 0).length;
  const overdue = schedules.filter(s => dueStatus(s.nextDue).daysOff < 0).length;
  const upcomingWeek = schedules.filter(s => dueStatus(s.nextDue).daysOff >= 0 && dueStatus(s.nextDue).daysOff <= 7).length;
  const amcRenewSoon = amcVendors.filter(a => {
    const d = Math.floor((new Date(a.contractEnd).getTime() - TODAY.getTime()) / (24 * 60 * 60 * 1000));
    return d >= 0 && d <= 90;
  }).length;

  const [tickets, setTickets] = React.useState<Ticket[]>(MAINTENANCE_TICKETS);
  React.useEffect(() => {
    let cancelled = false;
    apiGet<Ticket[]>("/maintenance-tickets").then(r => { if (!cancelled) setTickets(r); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Mark a preventive task done: optimistically advance lastDone -> today,
  // recompute nextDue by frequency, then PUT (offline-safe).
  const markScheduleDone = (s: ScheduleItem) => {
    const FREQ_DAYS: Record<Frequency, number> = { daily: 1, weekly: 7, monthly: 30, quarterly: 90 };
    const lastDone = isoDate(TODAY);
    const nd = new Date(TODAY); nd.setDate(nd.getDate() + FREQ_DAYS[s.frequency]);
    const nextDue = isoDate(nd);
    setSchedules(prev => prev.map(x => x.id === s.id ? { ...x, lastDone, nextDue } : x));
    apiPut(`/maintenance-schedules/${s.id}`, { lastDone, nextDue }).catch(() => showToast("⚠ Save failed — backend offline"));
    showToast(`${s.equipment} marked done · next due ${FREQ_LABEL[s.frequency].toLowerCase()}`);
  };

  // Renew an AMC contract: optimistically flip status to active, then PUT.
  const renewVendor = (v: AMCVendor) => {
    setAmcVendors(prev => prev.map(x => x.id === v.id ? { ...x, status: "active" } : x));
    apiPut(`/amc-contracts/${v.id}`, { status: "active" }).catch(() => showToast("⚠ Save failed — backend offline"));
    showToast(`Renewal request sent to ${v.name}`);
  };

  // Persist a ticket patch (assign / status change) optimistically.
  const persistTicket = (id: Ticket["id"], patch: Partial<Ticket>) => {
    setTickets(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t));
    apiPut(`/maintenance-tickets/${id}`, patch).catch(() => showToast("⚠ Save failed — backend offline"));
  };
  const assignTicket = (t: Ticket, name: string) => {
    persistTicket(t.id, { assignee: name, status: t.status === "open" ? "assigned" : t.status });
    showToast(`${t.code} assigned to ${name}`);
  };
  const STATUS_ORDER: TicketStatus[] = ["open", "assigned", "in-progress", "resolved"];
  const advanceTicket = (t: Ticket) => {
    const i = STATUS_ORDER.indexOf(t.status);
    if (i < 0 || i >= STATUS_ORDER.length - 1) return;
    const next = STATUS_ORDER[i + 1];
    persistTicket(t.id, { status: next });
    showToast(`${t.code} → ${STATUS_LABEL[next]}`);
  };

  const urgent = tickets.filter(t => t.priority === "urgent" && t.status !== "resolved").length;

  const filtered = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    return tickets.filter(t => {
      if (needle) {
        const hay = `${t.code} ${t.room} ${t.title} ${t.category} ${t.assignee ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      if (priority !== "all" && t.priority !== priority) return false;
      if (category !== "all" && t.category !== category) return false;
      if (technician === "unassigned" && t.assignee !== null) return false;
      if (technician !== "all" && technician !== "unassigned" && t.assignee !== technician) return false;
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      return true;
    });
  }, [q, priority, category, technician, statusFilter]);

  const sorted = React.useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "priority") cmp = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      else if (sortKey === "status") cmp = STATUS_RANK[a.status] - STATUS_RANK[b.status];
      else if (sortKey === "assignee") cmp = (a.assignee ?? "~").localeCompare(b.assignee ?? "~");
      else cmp = String(a[sortKey] ?? "").localeCompare(String(b[sortKey] ?? ""));
      return cmp * dir;
    });
  }, [filtered, sortKey, sortDir]);

  const onSort = (key: SortKey) => {
    if (key === sortKey) setSortDir(d => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const activeFilters =
    (priority !== "all" ? 1 : 0) +
    (category !== "all" ? 1 : 0) +
    (technician !== "all" ? 1 : 0) +
    (statusFilter !== "all" ? 1 : 0);
  const clearFilters = () => { setPriority("all"); setCategory("all"); setTechnician("all"); setStatusFilter("all"); };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-medium tracking-tight">Maintenance Tickets</h1>
          <p className="text-muted-foreground text-sm mt-1">Complaints, work orders &amp; technician assignments</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => showToast(`Property: ${name}`)} className="h-9 px-3 rounded-md border border-border hover:bg-surface-sunken inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Building2 className="h-3.5 w-3.5" />{name}
          </button>
          <Button onClick={() => setNewTicketOpen(true)}><Plus className="h-4 w-4" />New Ticket</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard label="Open tickets" value={tickets.filter(t => t.status === "open").length} icon={AlertCircle} accent="warning" />
        <KPICard label="In Progress" value={tickets.filter(t => t.status === "in-progress").length} icon={Wrench} accent="info" />
        <KPICard label="Urgent" value={urgent} icon={AlertCircle} accent="danger" />
        <KPICard label="Overdue PM" value={overdue} icon={AlertTriangle} accent={overdue > 0 ? "danger" : "success"} hint="preventive" />
        <KPICard label="Due this week" value={upcomingWeek} icon={CalendarClock} accent="info" hint="scheduled" />
        <KPICard label="AMC renewing" value={amcRenewSoon} icon={ShieldCheck} accent="accent" hint="≤ 90 days" />
      </div>

      {/* ============ TOP TABS ============ */}
      <div className="border-b border-border flex items-center gap-1 overflow-x-auto">
        {([
          { id: "reactive",  label: "Reactive Tickets",     icon: Wrench,         count: tickets.filter(t => t.status !== "resolved").length },
          { id: "schedule",  label: "Preventive Schedule",  icon: CalendarClock,  count: dueToday + overdue },
          { id: "amc",       label: "AMC / Vendors",         icon: ShieldCheck,    count: amcVendors.length },
        ] as { id: MainTab; label: string; icon: typeof Wrench; count: number }[]).map(t => {
          const Icon = t.icon;
          const active = mainTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setMainTab(t.id)}
              className={cn(
                "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap inline-flex items-center gap-2",
                active ? "border-brand text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
              <span className={cn(
                "tabular text-[10px] rounded-full px-1.5 h-4 inline-flex items-center font-semibold",
                active ? "bg-brand text-brand-foreground" : "bg-surface-sunken text-muted-foreground"
              )}>
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ============ REACTIVE TICKETS TAB ============ */}
      {mainTab === "reactive" && (
        <div className="space-y-5">
      {/* Filter bar + view toggle */}
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle-foreground" />
            <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by ticket #, room, description, or technician…" className="pl-9 h-9" />
          </div>
          <Select value={priority} onChange={e => setPriority(e.target.value as "all" | Priority)} className="h-9 w-auto">
            <option value="all">All priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </Select>
          <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value as "all" | TicketStatus)} className="h-9 w-auto">
            <option value="all">Any status</option>
            <option value="open">Open</option>
            <option value="assigned">Assigned</option>
            <option value="in-progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </Select>
          <Select value={category} onChange={e => setCategory(e.target.value)} className="h-9 w-auto">
            <option value="all">All categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Select value={technician} onChange={e => setTechnician(e.target.value)} className="h-9 w-auto">
            <option value="all">All technicians</option>
            <option value="unassigned">Unassigned</option>
            {TECHNICIANS.map(t => <option key={t} value={t}>{t}</option>)}
          </Select>

          {activeFilters > 0 && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>Clear ({activeFilters})</Button>
          )}

          <div className="flex-1" />

          {/* View toggle */}
          <div className="inline-flex rounded-md border border-border overflow-hidden h-9">
            <button
              type="button"
              onClick={() => setView("cards")}
              className={cn(
                "h-full px-3 inline-flex items-center gap-1.5 text-xs font-medium border-r border-border transition-colors",
                view === "cards" ? "bg-brand text-brand-foreground" : "hover:bg-surface-sunken text-muted-foreground"
              )}
              title="Kanban board"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Board</span>
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              className={cn(
                "h-full px-3 inline-flex items-center gap-1.5 text-xs font-medium transition-colors",
                view === "list" ? "bg-brand text-brand-foreground" : "hover:bg-surface-sunken text-muted-foreground"
              )}
              title="List view"
            >
              <ListIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">List</span>
            </button>
          </div>
        </div>
      </Card>

      {/* Count banner */}
      <div className="text-xs text-muted-foreground">
        Showing <span className="font-medium text-foreground">{sorted.length}</span> of {tickets.length} tickets
      </div>

      {/* Empty state */}
      {sorted.length === 0 && (
        <Card className="p-12 text-center">
          <Search className="h-8 w-8 mx-auto text-subtle-foreground" />
          <p className="mt-3 font-medium">No tickets match your filters</p>
          <p className="text-xs text-muted-foreground mt-1">Adjust filters above, or create a new ticket.</p>
        </Card>
      )}

      {/* Body */}
      {sorted.length > 0 && view === "cards" && <BoardView tickets={sorted} onAssignFor={setAssignFor} onAdvance={advanceTicket} />}
      {sorted.length > 0 && view === "list" && (
        <ListView tickets={sorted} sortKey={sortKey} sortDir={sortDir} onSort={onSort} onAssignFor={setAssignFor} onAdvance={advanceTicket} />
      )}
        </div>
      )}

      {/* ============ PREVENTIVE SCHEDULE TAB ============ */}
      {mainTab === "schedule" && (
        <ScheduleTab
          schedules={schedules}
          freqFilter={freqFilter}
          setFreqFilter={setFreqFilter}
          onOpenDetail={setScheduleDetail}
          onShowToast={showToast}
          onMarkDone={markScheduleDone}
        />
      )}

      {/* ============ AMC VENDORS TAB ============ */}
      {mainTab === "amc" && (
        <AmcTab vendors={amcVendors} onOpenDetail={setAmcDetail} onRenew={renewVendor} />
      )}

      {/* New Ticket modal */}
      {newTicketOpen && (
        <NewTicketModal onClose={() => setNewTicketOpen(false)} onSave={(t) => {
          setNewTicketOpen(false);
          showToast(`Ticket ${t.code} created · Room ${t.room}`);
          apiPost<Ticket>("/maintenance-tickets", t).then(created => setTickets(prev => [created, ...prev])).catch(() => showToast("⚠ Save failed — backend offline"));
        }} />
      )}

      {/* Quick assign modal */}
      {assignFor && (
        <QuickAssignModal
          ticket={assignFor}
          onClose={() => setAssignFor(null)}
          onAssign={(name) => { assignTicket(assignFor, name); setAssignFor(null); }}
        />
      )}

      {/* Schedule detail modal */}
      {scheduleDetail && (
        <ScheduleDetailModal
          item={scheduleDetail}
          onClose={() => setScheduleDetail(null)}
          onAction={(msg) => { setScheduleDetail(null); showToast(msg); }}
          onMarkDone={(s) => { setScheduleDetail(null); markScheduleDone(s); }}
        />
      )}

      {/* AMC vendor detail modal */}
      {amcDetail && (
        <AmcDetailModal
          vendor={amcDetail}
          onClose={() => setAmcDetail(null)}
          onAction={(msg) => { setAmcDetail(null); showToast(msg); }}
          onRenew={(v) => { setAmcDetail(null); renewVendor(v); }}
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

// ============ KANBAN BOARD VIEW ============
function BoardView({ tickets, onAssignFor, onAdvance }: { tickets: typeof MAINTENANCE_TICKETS; onAssignFor: (t: typeof MAINTENANCE_TICKETS[number]) => void; onAdvance: (t: typeof MAINTENANCE_TICKETS[number]) => void }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
      {LANES.map(lane => {
        const laneTickets = tickets.filter(t => t.status === lane.id);
        return (
          <div key={lane.id}>
            <div className="flex items-center justify-between mb-2 px-1">
              <h3 className="text-sm font-semibold">{lane.label}</h3>
              <Badge tone={STATUS_TONE[lane.id]}>{laneTickets.length}</Badge>
            </div>
            <div className="space-y-2 min-h-[120px]">
              {laneTickets.map(t => (
                <Card key={t.id} className="p-3 hover:shadow-md cursor-grab transition-all">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground tabular">{t.code}</span>
                    <Badge tone={PRIORITY_TONE[t.priority]}>{t.priority}</Badge>
                  </div>
                  <p className="text-sm font-medium mt-2 leading-snug">{t.title}</p>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{t.room === "Lobby" || t.room === "Pool" || t.room === "Kitchen" ? t.room : `Room ${t.room}`}</span>
                    <span><Clock className="inline h-3 w-3" /> {t.reported}</span>
                  </div>
                  {t.assignee && (
                    <div className="mt-2 pt-2 border-t border-border flex items-center gap-2">
                      <Avatar name={t.assignee} size={18} />
                      <span className="text-xs text-muted-foreground">{t.assignee}</span>
                    </div>
                  )}
                  {!t.assignee && (
                    <button onClick={() => onAssignFor(t)} className="mt-2 pt-2 border-t border-border w-full text-xs text-brand hover:underline inline-flex items-center gap-1">
                      <User className="h-3 w-3" />Assign technician
                    </button>
                  )}
                  {t.status !== "resolved" && (
                    <button onClick={() => onAdvance(t)} className="mt-2 w-full text-xs font-medium rounded-md border border-border py-1.5 hover:bg-brand hover:text-brand-foreground hover:border-brand transition-colors inline-flex items-center justify-center gap-1">
                      Move to {STATUS_LABEL[NEXT_STATUS[t.status]]} <ChevronRight className="h-3 w-3" />
                    </button>
                  )}
                </Card>
              ))}
              {laneTickets.length === 0 && (
                <div className="rounded-md border border-dashed border-border h-20 flex items-center justify-center text-xs text-subtle-foreground">No tickets</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============ LIST VIEW ============
function ListView({
  tickets, sortKey, sortDir, onSort, onAssignFor, onAdvance,
}: {
  tickets: typeof MAINTENANCE_TICKETS;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (k: SortKey) => void;
  onAssignFor: (t: typeof MAINTENANCE_TICKETS[number]) => void;
  onAdvance: (t: typeof MAINTENANCE_TICKETS[number]) => void;
}) {
  return (
    <Card className="p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface-elevated border-b border-border">
            <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <Th label="Ticket" k="code" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <Th label="Title" />
              <Th label="Location" k="room" sortKey={sortKey} sortDir={sortDir} onSort={onSort} icon={MapPin} />
              <Th label="Category" k="category" sortKey={sortKey} sortDir={sortDir} onSort={onSort} icon={Tag} />
              <Th label="Priority" k="priority" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <Th label="Status" k="status" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <Th label="Technician" k="assignee" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <Th label="Reported" k="reported" sortKey={sortKey} sortDir={sortDir} onSort={onSort} icon={Clock} />
              <th className="px-4 py-3 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {tickets.map(t => {
              const location = t.room === "Lobby" || t.room === "Pool" || t.room === "Kitchen" ? t.room : `Room ${t.room}`;
              return (
                <tr key={t.id} className="hover:bg-surface-sunken/50 transition-colors group">
                  <td className="px-4 py-3 font-medium tabular align-top">
                    <span className="inline-flex items-center gap-1.5">
                      {t.priority === "urgent" && <span className="h-1.5 w-1.5 rounded-full bg-danger animate-pulse" />}
                      {t.code}
                    </span>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <p className="font-medium leading-snug max-w-[280px] truncate">{t.title}</p>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="tabular">{location}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <Badge tone="neutral">{t.category}</Badge>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <Badge tone={PRIORITY_TONE[t.priority]}>{t.priority}</Badge>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <Badge tone={STATUS_TONE[t.status]}>{STATUS_LABEL[t.status]}</Badge>
                  </td>
                  <td className="px-4 py-3 align-top">
                    {t.assignee ? (
                      <div className="inline-flex items-center gap-2">
                        <Avatar name={t.assignee} size={22} />
                        <span className="text-xs">{t.assignee}</span>
                      </div>
                    ) : (
                      <button onClick={() => onAssignFor(t)} className="text-xs text-brand hover:underline inline-flex items-center gap-1">
                        <User className="h-3 w-3" />Assign
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top text-muted-foreground text-xs tabular">{t.reported}</td>
                  <td className="px-4 py-3 align-top text-right">
                    <div className="inline-flex items-center gap-1.5 justify-end">
                      {t.status !== "resolved" && (
                        <button
                          type="button"
                          onClick={() => onAdvance(t)}
                          className="h-8 px-2 rounded-md border border-border hover:bg-brand hover:text-brand-foreground hover:border-brand inline-flex items-center justify-center text-xs gap-1 transition-colors"
                          title={`Move to ${STATUS_LABEL[NEXT_STATUS[t.status]]}`}
                        >
                          → {STATUS_LABEL[NEXT_STATUS[t.status]]}
                        </button>
                      )}
                      <button
                        type="button"
                        className="h-8 px-2 rounded-md border border-border hover:bg-brand hover:text-brand-foreground hover:border-brand inline-flex items-center justify-center text-muted-foreground text-xs gap-1 transition-colors"
                        title="View ticket"
                      >
                        Details
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function Th({
  label, k, sortKey, sortDir, onSort, icon: Icon,
}: {
  label: string;
  k?: SortKey;
  sortKey?: SortKey;
  sortDir?: SortDir;
  onSort?: (k: SortKey) => void;
  icon?: typeof Clock;
}) {
  const sortable = !!k && !!onSort;
  const active = sortable && sortKey === k;
  return (
    <th className="px-4 py-3 font-semibold">
      {sortable ? (
        <button
          type="button"
          onClick={() => onSort!(k!)}
          className={cn(
            "inline-flex items-center gap-1 transition-colors",
            active ? "text-foreground" : "hover:text-foreground"
          )}
        >
          {Icon && <Icon className="h-3 w-3" />}
          {label}
          {active ? (
            sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
          ) : (
            <ArrowUpDown className="h-3 w-3 opacity-40" />
          )}
        </button>
      ) : (
        <span className="inline-flex items-center gap-1">
          {Icon && <Icon className="h-3 w-3" />}
          {label}
        </span>
      )}
    </th>
  );
}

// ===================== PREVENTIVE SCHEDULE TAB =====================
function ScheduleTab({ schedules, freqFilter, setFreqFilter, onOpenDetail, onShowToast, onMarkDone }: {
  schedules: ScheduleItem[];
  freqFilter: "all" | Frequency;
  setFreqFilter: (f: "all" | Frequency) => void;
  onOpenDetail: (item: ScheduleItem) => void;
  onShowToast: (m: string) => void;
  onMarkDone: (s: ScheduleItem) => void;
}) {
  const list = schedules.filter(s => freqFilter === "all" || s.frequency === freqFilter);
  // Group by frequency for upcoming-reminders strip
  const upcoming = [...schedules].sort((a, b) => new Date(a.nextDue).getTime() - new Date(b.nextDue).getTime()).slice(0, 5);
  const overdueItems = schedules.filter(s => dueStatus(s.nextDue).daysOff < 0);
  const todayItems = schedules.filter(s => dueStatus(s.nextDue).daysOff === 0);

  return (
    <div className="space-y-5">
      {/* Upcoming reminders banner */}
      {(overdueItems.length > 0 || todayItems.length > 0) && (
        <Card className={cn(
          "p-4",
          overdueItems.length > 0 ? "bg-danger-soft/40 border-danger/30" : "bg-warning-soft/40 border-warning/30"
        )}>
          <div className="flex items-start gap-3">
            <Bell className={cn("h-5 w-5 mt-0.5", overdueItems.length > 0 ? "text-danger" : "text-warning")} />
            <div className="flex-1">
              <p className={cn("text-sm font-semibold inline-flex items-center gap-1.5", overdueItems.length > 0 ? "text-danger" : "text-warning")}>
                <Calendar className="h-3.5 w-3.5" />
                {overdueItems.length > 0 && `${overdueItems.length} preventive task${overdueItems.length === 1 ? "" : "s"} OVERDUE`}
                {overdueItems.length > 0 && todayItems.length > 0 && " · "}
                {todayItems.length > 0 && `${todayItems.length} due today`}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Click any task below to start it. Auto-creates a ticket on completion for the next cycle.
              </p>
            </div>
            <button type="button" onClick={() => onShowToast("AI auto-routed overdue tasks to best-fit technicians")} className="shrink-0 h-8 px-2.5 rounded-md border border-border bg-surface hover:bg-surface-sunken inline-flex items-center gap-1.5 text-[11px] font-medium text-foreground">
              <Sparkles className="h-3.5 w-3.5 text-accent" />AI auto-route
            </button>
          </div>
        </Card>
      )}

      {/* Frequency selector */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {(["daily", "weekly", "monthly", "quarterly"] as Frequency[]).map(f => {
          const count = schedules.filter(s => s.frequency === f).length;
          const overdueCount = schedules.filter(s => s.frequency === f && dueStatus(s.nextDue).daysOff < 0).length;
          const todayCount = schedules.filter(s => s.frequency === f && dueStatus(s.nextDue).daysOff === 0).length;
          const active = freqFilter === f;
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFreqFilter(active ? "all" : f)}
              className={cn(
                "rounded-md border p-4 text-left transition-all",
                active ? "bg-brand-soft border-brand shadow-xs" : "border-border hover:bg-surface-sunken hover:border-brand/40"
              )}
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{FREQ_LABEL[f]}</p>
                <Badge tone={FREQ_TONE[f]}>{count} tasks</Badge>
              </div>
              <p className="text-2xl font-display font-medium mt-1 tabular">{count}</p>
              <div className="mt-2 flex items-center gap-2 text-[11px]">
                {overdueCount > 0 && <span className="text-danger font-semibold">⚠ {overdueCount} overdue</span>}
                {todayCount > 0 && <span className="text-warning font-semibold">● {todayCount} today</span>}
                {overdueCount === 0 && todayCount === 0 && <span className="text-success">✓ On schedule</span>}
              </div>
            </button>
          );
        })}
      </div>

      {/* Filter active hint */}
      {freqFilter !== "all" && (
        <div className="flex items-center gap-2 text-sm">
          <Badge tone={FREQ_TONE[freqFilter]}>{FREQ_LABEL[freqFilter]} only</Badge>
          <button type="button" onClick={() => setFreqFilter("all")} className="text-xs text-brand hover:underline">Show all</button>
        </div>
      )}

      {/* Schedules table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-elevated border-b border-border">
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-semibold">Equipment / Task</th>
                <th className="px-4 py-3 font-semibold">Area</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">Frequency</th>
                <th className="px-4 py-3 font-semibold">Last done</th>
                <th className="px-4 py-3 font-semibold">Next due</th>
                <th className="px-4 py-3 font-semibold">Assigned to</th>
                <th className="px-4 py-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.map(s => {
                const due = dueStatus(s.nextDue);
                return (
                  <tr key={s.id} className="hover:bg-surface-sunken/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium">{s.equipment}</p>
                      <p className="text-[11px] text-muted-foreground">~{s.durationMin} min</p>
                    </td>
                    <td className="px-4 py-3 text-xs"><MapPin className="h-3 w-3 inline mr-1 text-muted-foreground" />{s.area}</td>
                    <td className="px-4 py-3"><Badge tone="neutral">{s.category}</Badge></td>
                    <td className="px-4 py-3"><Badge tone={FREQ_TONE[s.frequency]}>{FREQ_LABEL[s.frequency]}</Badge></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground tabular">{formatDate(s.lastDone)}</td>
                    <td className="px-4 py-3">
                      <p className="text-xs tabular">{formatDate(s.nextDue)}</p>
                      <Badge tone={due.tone}>{due.label}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="inline-flex items-center gap-1.5">
                        <Avatar name={s.assignee} size={22} />
                        <span className="text-xs">{s.assignee}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <button
                          type="button"
                          onClick={() => onOpenDetail(s)}
                          className="h-8 w-8 rounded-md border border-border hover:bg-brand hover:text-brand-foreground hover:border-brand inline-flex items-center justify-center text-muted-foreground transition-colors"
                          title="View detail"
                        >
                          <FileText className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onMarkDone(s)}
                          className="h-8 w-8 rounded-md border border-border hover:bg-success hover:text-white hover:border-success inline-flex items-center justify-center text-muted-foreground transition-colors"
                          title="Mark done"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Upcoming-week summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Upcoming reminders · next 5</CardTitle>
            <p className="text-xs text-muted-foreground">Sorted by due date</p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y divide-border">
            {upcoming.map(s => {
              const due = dueStatus(s.nextDue);
              return (
                <li key={s.id} className="px-5 py-3 flex items-center gap-3">
                  <span className={cn(
                    "h-9 w-9 rounded-md inline-flex items-center justify-center shrink-0",
                    due.tone === "danger" ? "bg-danger-soft text-danger" :
                    due.tone === "warning" ? "bg-warning-soft text-warning" :
                    due.tone === "info" ? "bg-info-soft text-info" :
                    "bg-success-soft text-success"
                  )}>
                    <CalendarClock className="h-4 w-4" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{s.equipment}</p>
                    <p className="text-[11px] text-muted-foreground">{s.area} · {FREQ_LABEL[s.frequency]}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs tabular">{formatDate(s.nextDue)}</p>
                    <Badge tone={due.tone}>{due.label}</Badge>
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

// ===================== AMC VENDORS TAB =====================
function AmcTab({ vendors, onOpenDetail, onRenew }: {
  vendors: AMCVendor[];
  onOpenDetail: (v: AMCVendor) => void;
  onRenew: (v: AMCVendor) => void;
}) {
  const totalAnnualFee = vendors.reduce((t, v) => t + v.annualFee, 0);
  const expiringSoon = vendors.filter(v => {
    const d = Math.floor((new Date(v.contractEnd).getTime() - TODAY.getTime()) / (24 * 60 * 60 * 1000));
    return d >= 0 && d <= 90;
  });
  const expired = vendors.filter(v => v.status === "expired");

  const STATUS_TONE_AMC = { active: "success", "renewal-due": "warning", expired: "danger" } as const;

  return (
    <div className="space-y-5">
      {/* Strip summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Active AMCs</p>
          <p className="text-2xl font-display font-medium mt-1 tabular">{vendors.filter(v => v.status === "active").length}</p>
          <p className="text-[11px] text-muted-foreground">of {vendors.length} total contracts</p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold inline-flex items-center gap-1"><IndianRupee className="h-3 w-3" />Annual spend</p>
          <p className="text-2xl font-display font-medium mt-1 tabular">{money(totalAnnualFee)}</p>
          <p className="text-[11px] text-muted-foreground">across all vendors</p>
        </Card>
        <Card className={cn("p-4", expiringSoon.length > 0 && "bg-warning-soft/30 border-warning/30")}>
          <p className="text-[10px] uppercase tracking-wider text-warning font-semibold">Renewing ≤ 90 days</p>
          <p className="text-2xl font-display font-medium mt-1 tabular text-warning">{expiringSoon.length}</p>
          <p className="text-[11px] text-muted-foreground">need PO approval</p>
        </Card>
        <Card className={cn("p-4", expired.length > 0 && "bg-danger-soft/30 border-danger/30")}>
          <p className="text-[10px] uppercase tracking-wider text-danger font-semibold">Expired</p>
          <p className="text-2xl font-display font-medium mt-1 tabular text-danger">{expired.length}</p>
          <p className="text-[11px] text-muted-foreground">no coverage — urgent</p>
        </Card>
      </div>

      {/* Vendors table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-elevated border-b border-border">
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-semibold">Vendor</th>
                <th className="px-4 py-3 font-semibold">Service Category</th>
                <th className="px-4 py-3 font-semibold">Contact</th>
                <th className="px-4 py-3 font-semibold text-right">Annual Fee</th>
                <th className="px-4 py-3 font-semibold">Contract Period</th>
                <th className="px-4 py-3 font-semibold">Last visit</th>
                <th className="px-4 py-3 font-semibold">Next visit</th>
                <th className="px-4 py-3 font-semibold">SLA</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {vendors.map(v => {
                const nextV = dueStatus(v.nextVisit);
                const contractEndDays = Math.floor((new Date(v.contractEnd).getTime() - TODAY.getTime()) / (24 * 60 * 60 * 1000));
                return (
                  <tr
                    key={v.id}
                    onDoubleClick={() => onOpenDetail(v)}
                    className={cn(
                      "hover:bg-surface-sunken/50 transition-colors cursor-pointer",
                      v.status === "expired" && "bg-danger-soft/20"
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={v.name} size={32} />
                        <div className="min-w-0">
                          <p className="font-medium truncate">{v.name}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{v.address}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><Badge tone="neutral">{v.category}</Badge></td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-medium">{v.contactPerson}</p>
                      <p className="text-[11px] text-muted-foreground tabular">{v.phone}</p>
                    </td>
                    <td className="px-4 py-3 text-right tabular font-medium">{money(v.annualFee)}</td>
                    <td className="px-4 py-3">
                      <p className="text-xs tabular">{formatDate(v.contractStart)} → {formatDate(v.contractEnd)}</p>
                      <p className={cn(
                        "text-[11px] font-semibold",
                        contractEndDays < 0 ? "text-danger" : contractEndDays <= 90 ? "text-warning" : "text-success"
                      )}>
                        {contractEndDays < 0 ? `${-contractEndDays}d EXPIRED` : `${contractEndDays}d remaining`}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground tabular">{formatDate(v.lastVisit)}</td>
                    <td className="px-4 py-3">
                      <p className="text-xs tabular">{formatDate(v.nextVisit)}</p>
                      <Badge tone={nextV.tone}>{nextV.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs"><Clock className="h-3 w-3 inline mr-0.5 text-muted-foreground" />{v.slaResponseHours}h</td>
                    <td className="px-4 py-3"><Badge tone={STATUS_TONE_AMC[v.status]}>{v.status}</Badge></td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <a href={`tel:${v.phone}`} title="Call" className="h-8 w-8 rounded-md border border-border hover:bg-brand hover:text-brand-foreground hover:border-brand inline-flex items-center justify-center text-muted-foreground transition-colors">
                          <Phone className="h-3.5 w-3.5" />
                        </a>
                        <a href={`mailto:${v.email}`} title="Email" className="h-8 w-8 rounded-md border border-border hover:bg-info hover:text-white hover:border-info inline-flex items-center justify-center text-muted-foreground transition-colors">
                          <Mail className="h-3.5 w-3.5" />
                        </a>
                        <button
                          type="button"
                          onClick={() => onOpenDetail(v)}
                          className="h-8 w-8 rounded-md border border-border hover:bg-surface-sunken inline-flex items-center justify-center text-muted-foreground"
                          title="View detail"
                        >
                          <FileText className="h-3.5 w-3.5" />
                        </button>
                        {v.status !== "active" && (
                          <button
                            type="button"
                            onClick={() => onRenew(v)}
                            className="h-8 px-2 rounded-md bg-warning text-white text-[11px] font-medium hover:bg-warning/90 inline-flex items-center gap-1"
                            title="Renew contract"
                          >
                            <RotateCw className="h-3 w-3" />Renew
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ===================== NEW TICKET MODAL =====================
function NewTicketModal({ onClose, onSave }: {
  onClose: () => void;
  onSave: (t: Omit<Ticket, "id">) => void;
}) {
  const [title, setTitle] = React.useState("");
  const [room, setRoom] = React.useState("");
  const [category, setCategory] = React.useState(CATEGORIES[0] ?? "HVAC");
  const [priority, setPriority] = React.useState<Priority>("medium");
  const [description, setDescription] = React.useState("");
  const [assignee, setAssignee] = React.useState<string | "Unassigned">("Unassigned");

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  const valid = title.trim() !== "" && room.trim() !== "";

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <Card className="pointer-events-auto w-full max-w-lg p-0 animate-in shadow-xl overflow-hidden">
          <div className="px-5 py-4 bg-surface-elevated border-b border-border flex items-center gap-3">
            <span className="h-10 w-10 rounded-md bg-brand-soft text-brand-soft-foreground inline-flex items-center justify-center shrink-0">
              <Wrench className="h-5 w-5" />
            </span>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold">Create maintenance ticket</h3>
              <p className="text-xs text-muted-foreground">Auto-routed to the right technician based on category</p>
            </div>
            <button type="button" onClick={onClose} className="h-8 w-8 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
          </div>

          <div className="px-5 py-4 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Title *</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. AC not cooling — guest complaint" className="h-9" autoFocus />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Room / Area *</Label>
                <Input value={room} onChange={e => setRoom(e.target.value)} placeholder="e.g. 305, Lobby, Kitchen" className="h-9 tabular" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Category</Label>
                <Select value={category} onChange={e => setCategory(e.target.value)} className="h-9">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Priority</Label>
              <div className="grid grid-cols-4 gap-1.5">
                {(["low", "medium", "high", "urgent"] as Priority[]).map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={cn(
                      "h-9 rounded-md border text-xs font-medium capitalize transition-colors",
                      priority === p ?
                        p === "urgent" ? "bg-danger text-white border-danger" :
                        p === "high" ? "bg-warning text-white border-warning" :
                        p === "medium" ? "bg-info text-white border-info" :
                        "bg-foreground text-background border-foreground"
                      : "border-border hover:bg-surface-sunken"
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Description</Label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                placeholder="Detailed description · symptoms · what guest reported …"
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm placeholder:text-subtle-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 outline-hidden resize-y min-h-[72px]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Assign technician (optional)</Label>
              <Select value={assignee} onChange={e => setAssignee(e.target.value)} className="h-9">
                <option>Unassigned</option>
                {TECHNICIANS.map(t => <option key={t}>{t}</option>)}
              </Select>
            </div>
          </div>

          <div className="px-5 py-3 border-t border-border bg-surface-elevated flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button
              onClick={() => onSave({ code: nextTicketCode(), room, title, priority, status: "open" as TicketStatus, assignee: assignee === "Unassigned" ? null : assignee, reported: "Just now", category })}
              disabled={!valid}
              variant="success"
            >
              <CheckCircle2 className="h-4 w-4" />Create ticket
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}

// ===================== QUICK ASSIGN MODAL =====================
function QuickAssignModal({ ticket, onClose, onAssign }: {
  ticket: typeof MAINTENANCE_TICKETS[number];
  onClose: () => void;
  onAssign: (name: string) => void;
}) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <Card className="pointer-events-auto w-full max-w-md p-5 animate-in shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Assign ticket</h3>
              <p className="text-xs text-muted-foreground">{ticket.code} · {ticket.title}</p>
            </div>
            <button type="button" onClick={onClose} className="h-8 w-8 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
          </div>
          <div className="rounded-md bg-surface-sunken/40 border border-border p-2.5 text-xs flex items-center justify-between">
            <span className="text-muted-foreground">{ticket.category} · {ticket.room} · {ticket.priority}</span>
            <Badge tone={ticket.priority === "urgent" ? "danger" : ticket.priority === "high" ? "warning" : "info"}>{ticket.priority}</Badge>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Choose technician</Label>
            <div className="space-y-1.5">
              {TECHNICIANS.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => onAssign(t)}
                  className="w-full flex items-center gap-3 p-3 rounded-md border border-border hover:bg-brand hover:text-brand-foreground hover:border-brand transition-colors text-left"
                >
                  <Avatar name={t} size={32} />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{t}</p>
                    <p className="text-[11px] text-muted-foreground">Available · best for {ticket.category}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}

// ===================== SCHEDULE DETAIL MODAL =====================
function ScheduleDetailModal({ item, onClose, onAction, onMarkDone }: {
  item: ScheduleItem;
  onClose: () => void;
  onAction: (msg: string) => void;
  onMarkDone: (s: ScheduleItem) => void;
}) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  const due = dueStatus(item.nextDue);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <Card className="pointer-events-auto w-full max-w-md p-0 animate-in shadow-xl overflow-hidden">
          <div className="px-5 py-4 bg-surface-elevated border-b border-border flex items-center gap-3">
            <span className="h-10 w-10 rounded-md bg-brand-soft text-brand-soft-foreground inline-flex items-center justify-center shrink-0">
              <CalendarClock className="h-5 w-5" />
            </span>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">{item.equipment}</h3>
              <p className="text-xs text-muted-foreground truncate">{item.area} · {item.category}</p>
            </div>
            <button type="button" onClick={onClose} className="h-8 w-8 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
          </div>

          <div className="px-5 py-4 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Frequency</p>
                <p className="font-medium mt-1"><Badge tone={FREQ_TONE[item.frequency]}>{FREQ_LABEL[item.frequency]}</Badge></p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Duration</p>
                <p className="font-medium mt-1 tabular">{item.durationMin} min</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Last done</p>
                <p className="font-medium mt-1 tabular">{formatDate(item.lastDone)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Next due</p>
                <p className="font-medium mt-1 tabular">{formatDate(item.nextDue)}</p>
                <Badge tone={due.tone}>{due.label}</Badge>
              </div>
            </div>

            <div className="rounded-md bg-surface-sunken/40 border border-border p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Assigned to</p>
              <div className="flex items-center gap-2">
                <Avatar name={item.assignee} size={28} />
                <span className="text-sm font-medium">{item.assignee}</span>
              </div>
            </div>
          </div>

          <div className="px-5 py-3 border-t border-border bg-surface-elevated grid grid-cols-3 gap-2">
            <Button variant="outline" size="sm" onClick={() => onAction(`Edit schedule for ${item.equipment}`)}>
              <Edit className="h-3.5 w-3.5" />Edit
            </Button>
            <Button variant="outline" size="sm" onClick={() => onAction(`Reminder sent to ${item.assignee}`)}>
              <Bell className="h-3.5 w-3.5" />Notify
            </Button>
            <Button variant="success" size="sm" onClick={() => onMarkDone(item)}>
              <CheckCircle2 className="h-3.5 w-3.5" />Mark done
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}

// ===================== AMC DETAIL MODAL =====================
function AmcDetailModal({ vendor, onClose, onAction, onRenew }: {
  vendor: AMCVendor;
  onClose: () => void;
  onAction: (msg: string) => void;
  onRenew: (v: AMCVendor) => void;
}) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  const lastV = dueStatus(vendor.lastVisit);
  const nextV = dueStatus(vendor.nextVisit);
  const contractEndDays = Math.floor((new Date(vendor.contractEnd).getTime() - TODAY.getTime()) / (24 * 60 * 60 * 1000));

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <Card className="pointer-events-auto w-full max-w-lg p-0 animate-in shadow-xl overflow-hidden">
          <div className="px-5 py-4 bg-linear-to-br from-brand-soft via-surface to-accent-soft/30 border-b border-border flex items-center gap-3">
            <Avatar name={vendor.name} size={48} />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold">{vendor.name}</h3>
              <p className="text-xs text-muted-foreground">{vendor.category}</p>
            </div>
            <Badge tone={vendor.status === "active" ? "success" : vendor.status === "renewal-due" ? "warning" : "danger"}>{vendor.status}</Badge>
            <button type="button" onClick={onClose} className="h-8 w-8 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
          </div>

          <div className="px-5 py-4 space-y-3">
            {/* Contact card */}
            <div className="rounded-md border border-border p-3 space-y-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Contact person</p>
              <div className="flex items-center gap-2">
                <Avatar name={vendor.contactPerson} size={32} />
                <div className="flex-1">
                  <p className="text-sm font-medium">{vendor.contactPerson}</p>
                  <p className="text-[11px] text-muted-foreground">{vendor.address}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
                <a href={`tel:${vendor.phone}`} className="h-9 rounded-md border border-border hover:bg-success hover:text-white hover:border-success text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors">
                  <Phone className="h-3 w-3" />{vendor.phone}
                </a>
                <a href={`mailto:${vendor.email}`} className="h-9 rounded-md border border-border hover:bg-info hover:text-white hover:border-info text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors">
                  <Mail className="h-3 w-3" />Email
                </a>
              </div>
            </div>

            {/* Contract summary */}
            <div className="rounded-md border border-border p-3 space-y-1.5 text-sm">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Contract</p>
              <div className="flex justify-between"><span className="text-muted-foreground">Start</span><span className="tabular">{formatDate(vendor.contractStart)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">End</span><span className="tabular">{formatDate(vendor.contractEnd)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Remaining</span>
                <span className={cn("font-medium tabular", contractEndDays < 0 ? "text-danger" : contractEndDays <= 90 ? "text-warning" : "text-success")}>
                  {contractEndDays < 0 ? `${-contractEndDays}d EXPIRED` : `${contractEndDays}d`}
                </span>
              </div>
              <div className="flex justify-between pt-1.5 border-t border-border">
                <span className="font-semibold">Annual fee</span>
                <span className="font-bold tabular">{money(vendor.annualFee)}</span>
              </div>
            </div>

            {/* Visit schedule */}
            <div className="rounded-md border border-border p-3 space-y-1.5 text-sm">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Visit schedule</p>
              <div className="flex justify-between"><span className="text-muted-foreground">Frequency</span><Badge tone={FREQ_TONE[vendor.visitFrequency]}>{FREQ_LABEL[vendor.visitFrequency]}</Badge></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Last visit</span><span className="tabular"><Badge tone={lastV.tone === "danger" ? "warning" : "neutral"}>{formatDate(vendor.lastVisit)}</Badge></span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Next visit</span><span className="tabular"><Badge tone={nextV.tone}>{formatDate(vendor.nextVisit)} · {nextV.label}</Badge></span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">SLA response</span><span className="font-medium tabular">{vendor.slaResponseHours} hours</span></div>
            </div>
          </div>

          <div className="px-5 py-3 border-t border-border bg-surface-elevated grid grid-cols-3 gap-2">
            <Button variant="outline" size="sm" onClick={() => onAction(`Service requested from ${vendor.name}`)}>
              <Bell className="h-3.5 w-3.5" />Request visit
            </Button>
            <Button variant="outline" size="sm" onClick={() => onAction(`Last service report downloaded for ${vendor.name}`)}>
              <FileText className="h-3.5 w-3.5" />Last report
            </Button>
            <Button
              variant={vendor.status === "expired" ? "danger" : "success"}
              size="sm"
              onClick={() => onRenew(vendor)}
            >
              <RotateCw className="h-3.5 w-3.5" />Renew
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}
