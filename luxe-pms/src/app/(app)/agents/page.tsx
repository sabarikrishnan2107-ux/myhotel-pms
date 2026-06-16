"use client";
import * as React from "react";
import {
  Plus, Search, Briefcase, Building2, Phone, Mail, FileText, Wallet,
  X, CheckCircle2, AlertCircle, Eye, MoreHorizontal, Edit, Ban, Download,
  CalendarPlus, TrendingUp, Send, Globe, Star, ClipboardList, MapPin,
  Percent, IndianRupee, Hash, BedDouble,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { KPICard } from "@/components/ui/kpi-card";
import { AGENTS } from "@/lib/mock-data-ext";
import { sendEmail, apiGet, apiPost, apiPut } from "@/lib/api";
import { money, cn, formatDate } from "@/lib/utils";

// ========================= BACKEND ROW SHAPES =========================
// GET /agents — the agent master (creditLimit/commissionPct stored as ₹/%).
type AgentRow = {
  id: number | string;
  type: "Agent" | "Corporate";
  name: string;
  contact?: string;
  phone?: string;
  email?: string;
  gstin?: string;
  creditLimit?: number;
  commissionPct?: number;
  creditTerms?: string;
  active?: boolean;
};
// GET /agent-ledger — per-agent transactions in chronological order; the last
// row for an agent carries the running `balance` (its outstanding).
type AgentLedgerRow = {
  id: number | string;
  agentName: string;
  date: string;
  type: string;
  bookingNo?: string | null;
  description?: string;
  debit?: number;
  credit?: number;
  balance?: number;
  mode?: string | null;
  reference?: string | null;
};

// ========================= EXTENDED TYPE =========================
type AgentBase = typeof AGENTS[number];
type AgentExt = AgentBase & {
  pan?: string;
  address?: string;
  city?: string;
  country?: string;
  website?: string;
  paymentTerms?: "Advance" | "Net 7" | "Net 15" | "Net 30" | "Net 45" | "Net 60";
  tdsRate?: number;
  bankAccount?: string;
  bankIfsc?: string;
  contractStart?: string;
  contractEnd?: string;
  blocked?: boolean;
  blockReason?: string;
  internalNotes?: string;
  contacts?: { name: string; role: string; phone: string; email: string }[];
  rating?: number; // 1-5
};

const PAYMENT_TERMS = ["Advance", "Net 7", "Net 15", "Net 30", "Net 45", "Net 60"] as const;
const BLOCK_REASONS = ["Non-payment", "Disputed bookings", "Contract expired", "Suspicious activity", "Policy violation", "Other"];

type SortKey = "outstanding-desc" | "bookings-desc" | "credit-desc" | "name-asc";
type StatusFilter = "all" | "active" | "overdue" | "blocked";

// Layers the deterministic enrichment fields (pan/address/contacts/etc.) on top
// of a base agent. Used both for the offline mock seed and for real /agents rows
// so the UI shape stays identical regardless of data source.
function enrichAgent(a: AgentBase, i: number): AgentExt {
  return {
    ...a,
    pan: `AABCT${1000 + i * 13}E`,
    address: i % 2 === 0 ? "Office 401, Sky Tower" : "Suite 12, Marina Plaza",
    city: i < 3 ? "Mumbai" : "Bengaluru",
    country: "India",
    website: a.email.split("@")[1] ? `https://${a.email.split("@")[1]}` : undefined,
    paymentTerms: a.type === "Corporate" ? "Net 30" : "Net 15",
    tdsRate: a.type === "Corporate" ? 2 : 5,
    bankAccount: `••••••${1000 + i * 17}`.slice(-8),
    bankIfsc: "HDFC0001234",
    contractStart: "2025-04-01",
    contractEnd: "2027-03-31",
    blocked: false,
    contacts: i === 0 ? [
      { name: "Mr. Sharma", role: "Owner", phone: a.phone, email: a.email },
      { name: "Ms. Reddy", role: "Accounts", phone: "+91 98765 12345", email: "accounts@" + (a.email.split("@")[1] || "example.com") },
    ] : [],
    rating: 3 + (i % 3),
    internalNotes: i === 0 ? "Long-standing partner — pays on time, prefers WhatsApp updates." : undefined,
  };
}

export default function AgentsPage() {
  // Seed from the AGENTS mock (offline fallback); replaced by real-derived rows
  // once /agents + /agent-ledger resolve in the effect below.
  const [agents, setAgents] = React.useState<AgentExt[]>([]);

  // Fetch the agent master and the ledger in parallel, then build the list from
  // the real /agents rows: map gstin→gst, creditLimit→credit, commissionPct→
  // commission, creditTerms→terms; derive outstanding from the latest ledger
  // balance (fallback sum(debit)-sum(credit)) and bookings from Invoice rows.
  React.useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiGet<AgentRow[]>("/agents"),
      apiGet<AgentLedgerRow[]>("/agent-ledger"),
    ])
      .then(([rows, ledger]) => {
        if (cancelled || !Array.isArray(rows) || rows.length === 0) return;

        // Latest running balance per agent (rows arrive ordered by id =
        // chronological per agent), plus a sum fallback and an Invoice count.
        const latestBalance = new Map<string, number>();
        const netByName = new Map<string, number>();
        const invoiceCount = new Map<string, number>();
        for (const l of ledger ?? []) {
          const name = l.agentName;
          if (typeof l.balance === "number") latestBalance.set(name, l.balance);
          netByName.set(name, (netByName.get(name) ?? 0) + (l.debit ?? 0) - (l.credit ?? 0));
          if (l.type === "Invoice") invoiceCount.set(name, (invoiceCount.get(name) ?? 0) + 1);
        }

        const mapped: AgentExt[] = rows.map((r, i) => {
          const base: AgentBase = {
            id: String(r.id),
            type: r.type,
            name: r.name,
            contact: r.contact ?? "",
            phone: r.phone ?? "",
            email: r.email ?? "",
            gst: r.gstin ?? "",
            credit: r.creditLimit ?? 0,
            outstanding: latestBalance.get(r.name) ?? netByName.get(r.name) ?? 0,
            commission: r.commissionPct ?? 0,
            bookings: invoiceCount.get(r.name) ?? 0,
          };
          const ext = enrichAgent(base, i);
          // Preserve backend-driven fields over the deterministic defaults.
          return {
            ...ext,
            paymentTerms: (r.creditTerms as AgentExt["paymentTerms"]) || ext.paymentTerms,
            blocked: r.active === false,
          };
        });
        setAgents(mapped);
      })
      .catch(() => { /* backend offline — keep mock seed */ });
    return () => { cancelled = true; };
  }, []);

  const [filter, setFilter] = React.useState<"all" | "Agent" | "Corporate">("all");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [search, setSearch] = React.useState("");
  const [sort, setSort] = React.useState<SortKey>("outstanding-desc");

  const [editAgent, setEditAgent] = React.useState<AgentExt | "new" | null>(null);
  const [detailAgent, setDetailAgent] = React.useState<AgentExt | null>(null);
  const [blockFor, setBlockFor] = React.useState<AgentExt | null>(null);
  const [actionFor, setActionFor] = React.useState<string | null>(null);
  const [bulkSoa, setBulkSoa] = React.useState(false);

  const [toast, setToast] = React.useState<string | null>(null);
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };

  const filtered = React.useMemo(() => {
    const list = agents.filter(a => {
      if (filter !== "all" && a.type !== filter) return false;
      if (statusFilter === "active" && (a.blocked || a.outstanding === 0)) {
        if (a.blocked) return false;
      }
      if (statusFilter === "overdue" && a.outstanding <= 0) return false;
      if (statusFilter === "blocked" && !a.blocked) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!`${a.name} ${a.contact} ${a.phone} ${a.email} ${a.gst} ${a.pan ?? ""}`.toLowerCase().includes(q)) return false;
      }
      return true;
    });
    return [...list].sort((a, b) => {
      if (sort === "outstanding-desc") return b.outstanding - a.outstanding;
      if (sort === "bookings-desc")    return b.bookings - a.bookings;
      if (sort === "credit-desc")      return b.credit - a.credit;
      return a.name.localeCompare(b.name);
    });
  }, [agents, filter, statusFilter, search, sort]);

  const outstanding = agents.reduce((s, a) => s + a.outstanding, 0);
  const credit = agents.reduce((s, a) => s + a.credit, 0);
  const bookings = agents.reduce((s, a) => s + a.bookings, 0);
  const blockedCount = agents.filter(a => a.blocked).length;
  const overdueCount = agents.filter(a => a.outstanding > 0).length;
  const topPerformer = [...agents].sort((a, b) => b.bookings - a.bookings)[0];

  // AgentExt → backend /agents body (gst→gstin, credit→creditLimit,
  // commission→commissionPct, terms/paymentTerms→creditTerms, blocked→!active).
  const toAgentBody = (a: AgentExt) => ({
    type: a.type,
    name: a.name,
    contact: a.contact,
    phone: a.phone,
    email: a.email,
    gstin: a.gst,
    creditLimit: a.credit,
    commissionPct: a.commission,
    creditTerms: a.paymentTerms || "Net 15",
    active: !a.blocked,
  });

  const handleSave = (data: AgentExt) => {
    if (editAgent === "new") {
      const newId = `a-${Date.now().toString(36).slice(-6)}`;
      setAgents(prev => [{ ...data, id: newId, outstanding: 0, bookings: 0 }, ...prev]);
      showToast(`${data.name} added · ${data.type} account`);
      apiPost<AgentRow>("/agents", toAgentBody(data))
        .then(created => setAgents(prev => prev.map(a => a.id === newId ? { ...a, id: String(created.id) } : a)))
        .catch(() => showToast("⚠ Save failed — backend offline"));
    } else if (editAgent && typeof editAgent === "object") {
      const id = editAgent.id;
      setAgents(prev => prev.map(a => a.id === id ? { ...a, ...data, id } : a));
      showToast(`${data.name} updated`);
      apiPut<AgentRow>(`/agents/${String(id)}`, toAgentBody({ ...editAgent, ...data }))
        .catch(() => showToast("⚠ Update failed — backend offline"));
    }
    setEditAgent(null);
  };

  const handleBlock = (a: AgentExt, reason: string, notes: string) => {
    setAgents(prev => prev.map(x => x.id === a.id ? { ...x, blocked: true, blockReason: `${reason}${notes ? " · " + notes : ""}` } : x));
    setBlockFor(null);
    showToast(`${a.name} blocked · ${reason}`);
    apiPut<AgentRow>(`/agents/${String(a.id)}`, { active: false })
      .catch(() => showToast("⚠ Block didn't sync — backend offline"));
  };

  const handleUnblock = (a: AgentExt) => {
    setAgents(prev => prev.map(x => x.id === a.id ? { ...x, blocked: false, blockReason: undefined } : x));
    showToast(`${a.name} unblocked — bookings re-enabled`);
    apiPut<AgentRow>(`/agents/${String(a.id)}`, { active: true })
      .catch(() => showToast("⚠ Unblock didn't sync — backend offline"));
  };

  const downloadSoa = (a: AgentExt) => {
    const soa = {
      account: a.name,
      type: a.type,
      gst: a.gst,
      pan: a.pan,
      asOf: new Date().toISOString().slice(0, 10),
      creditLimit: a.credit,
      outstanding: a.outstanding,
      utilization: ((a.outstanding / a.credit) * 100).toFixed(1) + "%",
      paymentTerms: a.paymentTerms,
      bookings: a.bookings,
      commissionRate: a.commission + "%",
      tdsRate: a.tdsRate + "%",
    };
    const blob = new Blob([JSON.stringify(soa, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `SOA-${a.name.replace(/\s/g, "_")}-${soa.asOf}.json`; link.click();
    URL.revokeObjectURL(url);
    showToast(`Statement downloaded for ${a.name}`);
  };

  const activeFilters = (filter !== "all" ? 1 : 0) + (statusFilter !== "all" ? 1 : 0) + (search ? 1 : 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-medium tracking-tight">Agents &amp; Corporate</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {agents.length} accounts · credit ledgers · commissions · contracts
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBulkSoa(true)}>
            <FileText className="h-4 w-4" />Statements
          </Button>
          <Button onClick={() => setEditAgent("new")}><Plus className="h-4 w-4" />New account</Button>
        </div>
      </div>

      {/* Top performer banner */}
      {topPerformer && (
        <Card className="p-3 bg-linear-to-r from-brand-soft/40 via-accent-soft/30 to-surface border-brand/30">
          <div className="flex items-center gap-3 flex-wrap">
            <Star className="h-5 w-5 text-brand shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm">
                <strong>Top performer:</strong> {topPerformer.name} with {topPerformer.bookings} bookings ·
                <span className="text-muted-foreground ml-1">{topPerformer.type} · {topPerformer.commission > 0 ? `${topPerformer.commission}% comm.` : "no commission"}</span>
              </p>
              <p className="text-[11px] text-success inline-flex items-center gap-1 mt-0.5">
                <TrendingUp className="h-3 w-3" />+18% vs last quarter
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setDetailAgent(topPerformer)}>
              <Eye className="h-3.5 w-3.5" />View
            </Button>
          </div>
        </Card>
      )}

      {/* High outstanding warning */}
      {overdueCount >= 3 && (
        <Card className="p-3 bg-warning-soft/20 border-warning/30 flex items-center gap-2.5">
          <AlertCircle className="h-4 w-4 text-warning shrink-0" />
          <p className="text-sm flex-1">
            <strong>{overdueCount} accounts</strong> have outstanding balances totalling {money(outstanding)}.
          </p>
          <Button size="sm" variant="outline" onClick={() => { setStatusFilter("overdue"); showToast("Filtered to overdue accounts"); }}>
            Review
          </Button>
        </Card>
      )}

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KPICard label="Active accounts" value={agents.length - blockedCount} icon={Briefcase} accent="brand" hint={`${blockedCount} blocked`} />
        <KPICard label="Total bookings" value={bookings} icon={BedDouble} accent="info" hint="lifetime" />
        <KPICard label="Credit limit" value={money(credit)} icon={Wallet} accent="accent" hint="combined" />
        <KPICard label="Outstanding" value={money(outstanding)} icon={IndianRupee} accent={outstanding > 0 ? "warning" : "success"} hint={`${overdueCount} accounts`} />
        <KPICard label="Avg commission" value={`${(agents.filter(a => a.type === "Agent").reduce((s, a) => s + a.commission, 0) / Math.max(1, agents.filter(a => a.type === "Agent").length)).toFixed(1)}%`} icon={Percent} accent="success" hint="agent partners" />
      </div>

      {/* Filter bar */}
      <Card className="p-3 space-y-2.5">
        {/* Type + status chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Type */}
          {(["all", "Agent", "Corporate"] as const).map(t => (
            <button key={t} onClick={() => setFilter(t)} className={cn(
              "h-8 px-3 rounded-full text-xs font-medium border transition-colors inline-flex items-center gap-2",
              filter === t ? "bg-foreground text-background border-foreground shadow-xs" : "bg-surface text-muted-foreground border-border hover:bg-surface-sunken hover:text-foreground"
            )}>
              {t === "all" ? "All types" : t}
              <span className={cn(
                "tabular text-[10px] rounded-full px-1.5 h-4 inline-flex items-center font-semibold",
                filter === t ? "bg-background/15 text-background" : "bg-surface-sunken text-muted-foreground"
              )}>
                {t === "all" ? agents.length : agents.filter(a => a.type === t).length}
              </span>
            </button>
          ))}
          <div className="h-5 w-px bg-border mx-1" />
          {/* Status */}
          {([
            { id: "all", label: "All status", dot: null },
            { id: "active", label: "Active", dot: "bg-success" },
            { id: "overdue", label: "Overdue", dot: "bg-warning" },
            { id: "blocked", label: "Blocked", dot: "bg-danger" },
          ] as const).map(s => (
            <button key={s.id} onClick={() => setStatusFilter(s.id as StatusFilter)} className={cn(
              "h-8 px-3 rounded-full text-xs font-medium border transition-colors inline-flex items-center gap-2",
              statusFilter === s.id ? "bg-foreground text-background border-foreground" : "bg-surface text-muted-foreground border-border hover:bg-surface-sunken"
            )}>
              {s.dot && <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />}
              {s.label}
            </button>
          ))}
        </div>

        {/* Search + sort */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, contact, phone, GST, PAN…" className="pl-9 h-9" />
          </div>
          <Select value={sort} onChange={e => setSort(e.target.value as SortKey)} className="h-9 w-auto" title="Sort">
            <option value="outstanding-desc">Outstanding (high to low)</option>
            <option value="bookings-desc">Bookings (most first)</option>
            <option value="credit-desc">Credit limit (largest first)</option>
            <option value="name-asc">Name A–Z</option>
          </Select>
          {activeFilters > 0 && (
            <Button size="sm" variant="ghost" onClick={() => { setSearch(""); setFilter("all"); setStatusFilter("all"); }}>
              <X className="h-3 w-3" />Clear ({activeFilters})
            </Button>
          )}
          <div className="flex-1" />
          <p className="text-xs text-muted-foreground tabular">
            <span className="font-medium text-foreground">{filtered.length}</span> of {agents.length}
          </p>
        </div>
      </Card>

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Search className="h-8 w-8 mx-auto text-subtle-foreground mb-2" />
            <p className="font-medium">No accounts match your filters</p>
            <p className="text-xs text-muted-foreground mt-1">Adjust search or filters above</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-elevated border-b border-border">
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 font-semibold">Account</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Contact</th>
                  <th className="px-4 py-3 font-semibold tabular">GST / PAN</th>
                  <th className="px-4 py-3 font-semibold">Terms</th>
                  <th className="px-4 py-3 font-semibold text-right">Credit / Outstanding</th>
                  <th className="px-4 py-3 font-semibold text-right">Bookings</th>
                  <th className="px-4 py-3 font-semibold text-right">Commission</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(a => {
                  const utilization = a.credit > 0 ? (a.outstanding / a.credit) * 100 : 0;
                  return (
                    <tr key={a.id} className={cn(
                      "hover:bg-surface-sunken/50 transition-colors cursor-pointer",
                      a.blocked && "bg-danger-soft/15"
                    )} onClick={() => setDetailAgent(a)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className={cn("h-9 w-9 rounded-md flex items-center justify-center shrink-0",
                            a.blocked ? "bg-danger-soft text-danger" :
                            a.type === "Corporate" ? "bg-info-soft text-info" : "bg-brand-soft text-brand-soft-foreground"
                          )}>
                            {a.type === "Corporate" ? <Building2 className="h-4 w-4" /> : <Briefcase className="h-4 w-4" />}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-medium truncate">{a.name}</p>
                              {a.blocked && <Badge tone="danger"><Ban className="h-2.5 w-2.5" />Blocked</Badge>}
                            </div>
                            <p className="text-[11px] text-muted-foreground tabular inline-flex items-center gap-0.5"><Hash className="h-2.5 w-2.5" />{a.id}</p>
                            <p className="text-xs text-muted-foreground truncate">{a.contact}{a.city ? ` · ${a.city}` : ""}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><Badge tone={a.type === "Corporate" ? "info" : "brand"}>{a.type}</Badge></td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <a href={`tel:${a.phone}`} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-brand tabular"><Phone className="h-3 w-3" />{a.phone}</a><br/>
                        <a href={`mailto:${a.email}`} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-brand truncate max-w-[180px]"><Mail className="h-3 w-3" />{a.email}</a>
                      </td>
                      <td className="px-4 py-3 text-xs tabular">
                        <p className="font-mono">{a.gst}</p>
                        {a.pan && <p className="font-mono text-muted-foreground">{a.pan}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone="neutral">{a.paymentTerms || "Net 15"}</Badge>
                        {a.tdsRate !== undefined && a.tdsRate > 0 && <p className="text-[10px] text-muted-foreground tabular mt-1">TDS {a.tdsRate}%</p>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="tabular text-muted-foreground">{money(a.credit)}</p>
                        <p className={cn("tabular font-medium", a.outstanding > 0 ? "text-warning" : "text-muted-foreground")}>{money(a.outstanding)}</p>
                        {a.outstanding > 0 && (
                          <div className="mt-1 w-20 ml-auto h-1 bg-surface-sunken rounded-full overflow-hidden">
                            <div className={cn("h-full", utilization > 80 ? "bg-danger" : utilization > 50 ? "bg-warning" : "bg-success")} style={{ width: `${Math.min(100, utilization)}%` }} />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular font-medium">{a.bookings}</td>
                      <td className="px-4 py-3 text-right tabular">{a.commission > 0 ? <span className="font-medium">{a.commission}%</span> : <span className="text-muted-foreground">—</span>}</td>
                      <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                        <div className="inline-flex gap-1 items-center relative">
                          <button type="button" onClick={() => setDetailAgent(a)} className="h-8 w-8 rounded-md border border-border hover:bg-surface-sunken inline-flex items-center justify-center text-muted-foreground transition-colors" title="View detail">
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" onClick={() => downloadSoa(a)} className="h-8 w-8 rounded-md border border-border hover:bg-info hover:text-white hover:border-info inline-flex items-center justify-center text-muted-foreground transition-colors" title="Statement of Account">
                            <Download className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" onClick={() => setActionFor(actionFor === a.id ? null : a.id)} className="h-8 w-8 rounded-md border border-border hover:bg-surface-sunken inline-flex items-center justify-center text-muted-foreground transition-colors" title="More">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </button>
                          {actionFor === a.id && (
                            <>
                              <div className="fixed inset-0 z-30" onClick={() => setActionFor(null)} />
                              <div className="absolute right-0 top-full mt-1 w-48 bg-surface border border-border rounded-md shadow-xl z-40 py-1 text-sm">
                                <button onClick={() => { setEditAgent(a); setActionFor(null); }} className="w-full px-3 py-1.5 hover:bg-surface-sunken text-left inline-flex items-center gap-2"><Edit className="h-3.5 w-3.5" />Edit profile</button>
                                <button onClick={() => { showToast(`Booking flow opened for ${a.name}`); setActionFor(null); }} className="w-full px-3 py-1.5 hover:bg-surface-sunken text-left inline-flex items-center gap-2"><CalendarPlus className="h-3.5 w-3.5" />New booking</button>
                                <button onClick={() => {
                                  setActionFor(null);
                                  const to = a.email;
                                  if (!to) { showToast(`No email on file for ${a.name}`); return; }
                                  showToast(`Emailing ${a.name}…`);
                                  sendEmail({ to, subject: "Payment Reminder", heading: "Payment Reminder", greeting: a.name, intro: "This is a friendly reminder regarding the outstanding balance on your account.", rows: [{ label: "Outstanding", value: money(a.outstanding) }], context: "Agent payment reminder" })
                                    .then(() => showToast(`Reminder sent to ${a.name} · ${money(a.outstanding)} due`))
                                    .catch(() => showToast(`Couldn't email ${a.name}`));
                                }} className="w-full px-3 py-1.5 hover:bg-surface-sunken text-left inline-flex items-center gap-2" disabled={a.outstanding === 0}><Send className="h-3.5 w-3.5" />Send reminder</button>
                                <hr className="my-1 border-border" />
                                {a.blocked ? (
                                  <button onClick={() => { handleUnblock(a); setActionFor(null); }} className="w-full px-3 py-1.5 hover:bg-surface-sunken text-left inline-flex items-center gap-2 text-success"><CheckCircle2 className="h-3.5 w-3.5" />Unblock account</button>
                                ) : (
                                  <button onClick={() => { setBlockFor(a); setActionFor(null); }} className="w-full px-3 py-1.5 hover:bg-surface-sunken text-left inline-flex items-center gap-2 text-danger"><Ban className="h-3.5 w-3.5" />Block account</button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modals + drawer */}
      {editAgent && (
        <AddEditAgentModal
          agent={editAgent === "new" ? null : editAgent}
          onClose={() => setEditAgent(null)}
          onSave={handleSave}
        />
      )}
      {blockFor && (
        <BlockAgentModal
          agent={blockFor}
          onClose={() => setBlockFor(null)}
          onSave={handleBlock}
        />
      )}
      {detailAgent && (
        <AgentDetailDrawer
          agent={detailAgent}
          onClose={() => setDetailAgent(null)}
          onEdit={() => { setEditAgent(detailAgent); setDetailAgent(null); }}
          onDownloadSoa={() => downloadSoa(detailAgent)}
          onToast={showToast}
        />
      )}
      {bulkSoa && (
        <BulkStatementsModal
          agents={agents}
          onClose={() => setBulkSoa(false)}
          onSend={(ids, channel) => {
            setBulkSoa(false);
            showToast(`${ids.length} statements queued via ${channel}`);
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

// ========================= ADD / EDIT AGENT MODAL =========================
function AddEditAgentModal({ agent, onClose, onSave }: {
  agent: AgentExt | null;
  onClose: () => void;
  onSave: (a: AgentExt) => void;
}) {
  const [form, setForm] = React.useState<AgentExt>(agent || {
    id: "", type: "Agent", name: "", contact: "", phone: "+91 ", email: "",
    gst: "", pan: "", credit: 50000, outstanding: 0, commission: 10, bookings: 0,
    paymentTerms: "Net 15", tdsRate: 5,
    country: "India", contractStart: new Date().toISOString().slice(0, 10),
    contractEnd: new Date(new Date().getFullYear() + 1, 11, 31).toISOString().slice(0, 10),
    contacts: [], blocked: false,
  });

  const update = <K extends keyof AgentExt>(k: K, v: AgentExt[K]) => setForm(f => ({ ...f, [k]: v }));
  const updateContact = (idx: number, k: keyof NonNullable<AgentExt["contacts"]>[number], v: string) =>
    update("contacts", form.contacts?.map((c, i) => i === idx ? { ...c, [k]: v } : c) || []);
  const addContact = () => update("contacts", [...(form.contacts || []), { name: "", role: "", phone: "", email: "" }]);
  const removeContact = (idx: number) => update("contacts", form.contacts?.filter((_, i) => i !== idx) || []);

  React.useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; document.removeEventListener("keydown", onKey); };
  }, [onClose]);

  const canSave = form.name.trim().length > 1 && form.phone.trim().length > 4 && form.email.trim().length > 4;

  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface rounded-xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="h-9 w-9 rounded-md bg-brand-soft text-brand-soft-foreground inline-flex items-center justify-center"><Briefcase className="h-4 w-4" /></span>
            <div>
              <h3 className="font-semibold">{agent ? "Edit account" : "New agent / corporate account"}</h3>
              <p className="text-xs text-muted-foreground">{agent ? `Updating ${agent.name}` : "Add to partner ledger"}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="h-7 w-7 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>

        <div className="px-5 py-4 space-y-4 overflow-y-auto">
          {/* Account type */}
          <div className="grid grid-cols-2 gap-2">
            {(["Agent", "Corporate"] as const).map(t => (
              <button key={t} type="button" onClick={() => update("type", t)} className={cn(
                "h-14 rounded-md border-2 text-left px-3 transition-colors",
                form.type === t ? "border-brand bg-brand-soft/30" : "border-border hover:bg-surface-sunken"
              )}>
                <p className="text-sm font-semibold inline-flex items-center gap-2">
                  {t === "Agent" ? <Briefcase className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}{t}
                </p>
                <p className="text-[11px] text-muted-foreground">{t === "Agent" ? "Travel agent · earns commission" : "Corporate client · direct billing"}</p>
              </button>
            ))}
          </div>

          {/* Identity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Account name *</Label>
              <Input value={form.name} onChange={e => update("name", e.target.value)} placeholder={form.type === "Agent" ? "e.g. ABC Travels" : "e.g. TechCorp FZ-LLC"} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Primary contact</Label>
              <Input value={form.contact} onChange={e => update("contact", e.target.value)} placeholder="Mr. / Ms. <name>" className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Phone *</Label>
              <Input value={form.phone} onChange={e => update("phone", e.target.value)} placeholder="+91 9XXXX XXXXX" className="h-9 tabular" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email *</Label>
              <Input type="email" value={form.email} onChange={e => update("email", e.target.value)} placeholder="account@example.com" className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs"><Globe className="h-3 w-3 inline mr-1" />Website</Label>
              <Input value={form.website || ""} onChange={e => update("website", e.target.value)} placeholder="https://…" className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs"><Star className="h-3 w-3 inline mr-1" />Rating</Label>
              <Select value={String(form.rating || 3)} onChange={e => update("rating", Number(e.target.value))} className="h-9">
                {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{"★".repeat(n)}{"☆".repeat(5 - n)} ({n}/5)</option>)}
              </Select>
            </div>
          </div>

          {/* Tax + Address */}
          <div>
            <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2">Tax &amp; address</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">GSTIN</Label>
                <Input value={form.gst} onChange={e => update("gst", e.target.value)} placeholder="15-char GSTIN" className="h-9 font-mono tabular" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">PAN</Label>
                <Input value={form.pan || ""} onChange={e => update("pan", e.target.value)} placeholder="ABCDE1234F" className="h-9 font-mono tabular" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs"><MapPin className="h-3 w-3 inline mr-1" />Address</Label>
                <Input value={form.address || ""} onChange={e => update("address", e.target.value)} placeholder="Street, Building" className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">City</Label>
                <Input value={form.city || ""} onChange={e => update("city", e.target.value)} placeholder="Mumbai" className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Country</Label>
                <Input value={form.country || "India"} onChange={e => update("country", e.target.value)} className="h-9" />
              </div>
            </div>
          </div>

          {/* Commercial terms */}
          <div>
            <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2">Commercial terms</p>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs"><Wallet className="h-3 w-3 inline mr-1" />Credit limit (₹)</Label>
                <Input type="number" value={form.credit} onChange={e => update("credit", Math.max(0, Number(e.target.value) || 0))} className="h-9 tabular" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Payment terms</Label>
                <Select value={form.paymentTerms || "Net 15"} onChange={e => update("paymentTerms", e.target.value as AgentExt["paymentTerms"])} className="h-9">
                  {PAYMENT_TERMS.map(t => <option key={t}>{t}</option>)}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs"><Percent className="h-3 w-3 inline mr-1" />Commission %</Label>
                <Input type="number" value={form.commission} onChange={e => update("commission", Math.max(0, Math.min(50, Number(e.target.value) || 0)))} className="h-9 tabular" min={0} max={50} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">TDS %</Label>
                <Select value={String(form.tdsRate || 0)} onChange={e => update("tdsRate", Number(e.target.value))} className="h-9">
                  <option value={0}>0% (No TDS)</option>
                  <option value={1}>1% (194-O)</option>
                  <option value={2}>2% (194C contract)</option>
                  <option value={5}>5% (194H commission)</option>
                  <option value={10}>10% (194J prof.)</option>
                </Select>
              </div>
            </div>
          </div>

          {/* Bank for payouts */}
          <div>
            <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2">Bank for payouts</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Account number</Label>
                <Input value={form.bankAccount || ""} onChange={e => update("bankAccount", e.target.value)} placeholder="Bank account #" className="h-9 tabular" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">IFSC</Label>
                <Input value={form.bankIfsc || ""} onChange={e => update("bankIfsc", e.target.value.toUpperCase())} placeholder="HDFC0001234" className="h-9 font-mono tabular" />
              </div>
            </div>
          </div>

          {/* Contract */}
          <div>
            <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2">Contract dates</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Start</Label>
                <Input type="date" value={form.contractStart || ""} onChange={e => update("contractStart", e.target.value)} className="h-9 tabular" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">End</Label>
                <Input type="date" value={form.contractEnd || ""} onChange={e => update("contractEnd", e.target.value)} className="h-9 tabular" />
              </div>
            </div>
          </div>

          {/* Contact persons */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Additional contact persons</p>
              <Button size="sm" variant="ghost" onClick={addContact}><Plus className="h-3 w-3" />Add</Button>
            </div>
            {form.contacts && form.contacts.length > 0 ? (
              <ul className="space-y-2">
                {form.contacts.map((c, i) => (
                  <li key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_1fr_auto] gap-1.5 p-2 rounded-md border border-border">
                    <Input value={c.name} onChange={e => updateContact(i, "name", e.target.value)} placeholder="Name" className="h-8 text-xs" />
                    <Input value={c.role} onChange={e => updateContact(i, "role", e.target.value)} placeholder="Role" className="h-8 text-xs" />
                    <Input value={c.phone} onChange={e => updateContact(i, "phone", e.target.value)} placeholder="Phone" className="h-8 text-xs tabular" />
                    <Input value={c.email} onChange={e => updateContact(i, "email", e.target.value)} placeholder="Email" className="h-8 text-xs" />
                    <button type="button" onClick={() => removeContact(i)} className="h-8 w-8 rounded-md hover:bg-danger-soft inline-flex items-center justify-center text-muted-foreground hover:text-danger" title="Remove"><X className="h-3.5 w-3.5" /></button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground italic">No additional contacts. Click Add to add staff at this account.</p>
            )}
          </div>

          {/* Internal notes */}
          <div className="space-y-1.5">
            <Label className="text-xs"><ClipboardList className="h-3 w-3 inline mr-1" />Internal notes</Label>
            <textarea value={form.internalNotes || ""} onChange={e => update("internalNotes", e.target.value)} rows={2} placeholder="Staff-only context, special handling, history…"
              className="w-full px-3 py-2 rounded-md border border-border bg-surface text-sm focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 outline-hidden resize-none" />
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-border bg-surface-sunken/30">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(form)} disabled={!canSave}>
            <CheckCircle2 className="h-3.5 w-3.5" />{agent ? "Save changes" : "Add account"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ========================= BLOCK AGENT MODAL =========================
function BlockAgentModal({ agent, onClose, onSave }: {
  agent: AgentExt;
  onClose: () => void;
  onSave: (a: AgentExt, reason: string, notes: string) => void;
}) {
  const [reason, setReason] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [confirm, setConfirm] = React.useState("");

  React.useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; document.removeEventListener("keydown", onKey); };
  }, [onClose]);

  const canConfirm = reason !== "" && confirm === "BLOCK";

  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="h-9 w-9 rounded-md bg-danger-soft text-danger inline-flex items-center justify-center"><Ban className="h-4 w-4" /></span>
            <div>
              <h3 className="font-semibold">Block account</h3>
              <p className="text-xs text-muted-foreground">Disable future bookings for {agent.name}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="h-7 w-7 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <Card className="p-3 bg-danger-soft/15 border-danger/30 text-xs">
            <strong>{agent.name}</strong> ({agent.type}) — {agent.bookings} lifetime bookings, current outstanding {money(agent.outstanding)}. Future booking attempts will be blocked at the front desk.
          </Card>

          <div className="space-y-1.5">
            <Label className="text-xs">Reason *</Label>
            <div className="flex flex-wrap gap-1.5">
              {BLOCK_REASONS.map(r => (
                <button key={r} type="button" onClick={() => setReason(r)} className={cn(
                  "h-7 px-2.5 rounded-full text-xs border transition-colors",
                  reason === r ? "bg-danger text-white border-danger" : "border-border hover:bg-surface-sunken"
                )}>{r}</button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Additional notes</Label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Document the decision…"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 outline-hidden resize-y" />
          </div>

          <div className="space-y-1.5 pt-2 border-t border-border">
            <Label className="text-xs">Type <strong>BLOCK</strong> to confirm</Label>
            <Input value={confirm} onChange={e => setConfirm(e.target.value)} className="h-9 font-mono tabular text-sm" placeholder="BLOCK" />
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-border bg-surface-sunken/30">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="danger" onClick={() => onSave(agent, reason, notes)} disabled={!canConfirm}>
            <Ban className="h-3.5 w-3.5" />Confirm block
          </Button>
        </div>
      </div>
    </div>
  );
}

// ========================= AGENT DETAIL DRAWER =========================
function AgentDetailDrawer({ agent, onClose, onEdit, onDownloadSoa, onToast }: {
  agent: AgentExt;
  onClose: () => void;
  onEdit: () => void;
  onDownloadSoa: () => void;
  onToast: (m: string) => void;
}) {
  const [tab, setTab] = React.useState<"profile" | "bookings" | "ledger" | "contacts">("profile");

  React.useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; document.removeEventListener("keydown", onKey); };
  }, [onClose]);

  // Mock bookings/ledger derived from the agent
  const mockBookings = Array.from({ length: Math.min(6, agent.bookings) }, (_, i) => ({
    bookingNo: `BK1002${(40 + i).toString().padStart(2, "0")}`,
    guestName: ["Anjali Iyer", "Karan Mehta", "Priya Sharma", "Vikram Singh", "Rohan Joshi", "Kavya Nair"][i],
    checkIn: `2026-05-${(15 + i).toString().padStart(2, "0")}`,
    nights: 2 + (i % 3),
    amount: 8000 + (i * 3500),
    status: i < 3 ? "paid" : i < 5 ? "partial" : "unpaid",
  }));
  const mockLedger = [
    { date: "2026-05-01", type: "Invoice", ref: "INV-2426-001", debit: 28400, credit: 0 },
    { date: "2026-05-10", type: "Receipt", ref: "RCP-2026-1122", debit: 0, credit: 15000 },
    { date: "2026-05-15", type: "Invoice", ref: "INV-2426-008", debit: 18500, credit: 0 },
    { date: "2026-05-22", type: "Receipt", ref: "RCP-2026-1245", debit: 0, credit: 13450 },
  ];

  let runningBalance = 0;
  const ledgerWithRunning = mockLedger.map(l => {
    runningBalance += l.debit - l.credit;
    return { ...l, balance: runningBalance };
  });

  return (
    <div className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm" onClick={onClose}>
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-surface shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-border bg-linear-to-r from-brand-soft/30 to-surface">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className={cn("h-12 w-12 rounded-lg flex items-center justify-center shrink-0",
                agent.type === "Corporate" ? "bg-info-soft text-info" : "bg-brand-soft text-brand-soft-foreground"
              )}>
                {agent.type === "Corporate" ? <Building2 className="h-5 w-5" /> : <Briefcase className="h-5 w-5" />}
              </span>
              <div className="min-w-0">
                <h3 className="font-semibold text-lg truncate">{agent.name}</h3>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <Badge tone={agent.type === "Corporate" ? "info" : "brand"}>{agent.type}</Badge>
                  {agent.rating && <Badge tone="accent"><Star className="h-2.5 w-2.5" />{agent.rating}/5</Badge>}
                  {agent.blocked && <Badge tone="danger"><Ban className="h-2.5 w-2.5" />Blocked</Badge>}
                </div>
              </div>
            </div>
            <button type="button" onClick={onClose} className="h-8 w-8 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center shrink-0"><X className="h-4 w-4" /></button>
          </div>

          {/* Quick action row */}
          <div className="flex gap-1.5 mt-3">
            <a href={`tel:${agent.phone}`} className="flex-1 h-9 rounded-md border border-border hover:bg-success hover:text-white hover:border-success inline-flex items-center justify-center gap-1.5 text-xs font-medium transition-colors"><Phone className="h-3.5 w-3.5" />Call</a>
            <a href={`mailto:${agent.email}`} className="flex-1 h-9 rounded-md border border-border hover:bg-info hover:text-white hover:border-info inline-flex items-center justify-center gap-1.5 text-xs font-medium transition-colors"><Mail className="h-3.5 w-3.5" />Email</a>
            <button onClick={onDownloadSoa} className="flex-1 h-9 rounded-md border border-border hover:bg-surface-sunken inline-flex items-center justify-center gap-1.5 text-xs font-medium transition-colors"><Download className="h-3.5 w-3.5" />SOA</button>
            <button onClick={() => onToast(`Booking opened with ${agent.name}`)} className="flex-1 h-9 rounded-md bg-brand text-brand-foreground hover:bg-brand/90 inline-flex items-center justify-center gap-1.5 text-xs font-medium transition-colors"><CalendarPlus className="h-3.5 w-3.5" />Book</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border bg-surface-sunken/40 px-2">
          {([
            { id: "profile", label: "Profile" },
            { id: "bookings", label: `Bookings (${agent.bookings})` },
            { id: "ledger", label: "Ledger" },
            { id: "contacts", label: `Contacts (${agent.contacts?.length || 0})` },
          ] as const).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={cn(
              "px-3 py-2.5 text-xs font-medium border-b-2 transition-colors",
              tab === t.id ? "border-brand text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            )}>{t.label}</button>
          ))}
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1">
          {tab === "profile" && (
            <div className="space-y-4">
              {/* Key stats */}
              <div className="grid grid-cols-3 gap-2">
                <Card className="p-3 text-center">
                  <BedDouble className="h-4 w-4 mx-auto text-brand mb-1" />
                  <p className="text-lg font-bold tabular">{agent.bookings}</p>
                  <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Bookings</p>
                </Card>
                <Card className="p-3 text-center">
                  <Wallet className="h-4 w-4 mx-auto text-info mb-1" />
                  <p className="text-lg font-bold tabular">{money(agent.credit)}</p>
                  <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Credit</p>
                </Card>
                <Card className="p-3 text-center">
                  <IndianRupee className={cn("h-4 w-4 mx-auto mb-1", agent.outstanding > 0 ? "text-warning" : "text-success")} />
                  <p className={cn("text-lg font-bold tabular", agent.outstanding > 0 ? "text-warning" : "text-success")}>{money(agent.outstanding)}</p>
                  <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Outstanding</p>
                </Card>
              </div>

              {/* Identity */}
              <Card className="p-4 space-y-3">
                <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Primary contact</p>
                <div className="space-y-1.5 text-sm">
                  <p><strong>{agent.contact}</strong></p>
                  <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" /><span className="tabular">{agent.phone}</span></div>
                  <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" /><span className="truncate">{agent.email}</span></div>
                  {agent.website && <div className="flex items-center gap-2"><Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" /><a href={agent.website} target="_blank" rel="noopener noreferrer" className="text-info hover:underline truncate">{agent.website}</a></div>}
                  {(agent.address || agent.city) && <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" /><span>{[agent.address, agent.city, agent.country].filter(Boolean).join(", ")}</span></div>}
                </div>
                <hr className="border-border" />
                <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Tax</p>
                <div className="space-y-1 text-sm tabular">
                  <p><strong>GSTIN</strong>: <span className="font-mono">{agent.gst}</span></p>
                  {agent.pan && <p><strong>PAN</strong>: <span className="font-mono">{agent.pan}</span></p>}
                  {agent.tdsRate !== undefined && <p className="text-muted-foreground">TDS rate: {agent.tdsRate}%</p>}
                </div>
              </Card>

              {/* Commercial */}
              <Card className="p-4 space-y-3">
                <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Commercial</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-muted-foreground text-xs">Payment terms</p><p className="font-medium">{agent.paymentTerms || "Net 15"}</p></div>
                  <div><p className="text-muted-foreground text-xs">Commission</p><p className="font-medium">{agent.commission > 0 ? `${agent.commission}%` : "—"}</p></div>
                  {agent.bankAccount && <div><p className="text-muted-foreground text-xs">Bank account</p><p className="font-mono tabular text-xs">{agent.bankAccount}</p></div>}
                  {agent.bankIfsc && <div><p className="text-muted-foreground text-xs">IFSC</p><p className="font-mono tabular text-xs">{agent.bankIfsc}</p></div>}
                </div>
                {(agent.contractStart || agent.contractEnd) && (
                  <>
                    <hr className="border-border" />
                    <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Contract</p>
                    <div className="text-sm tabular">
                      {agent.contractStart && agent.contractEnd
                        ? `${formatDate(agent.contractStart)} → ${formatDate(agent.contractEnd)}`
                        : "Open-ended"}
                    </div>
                  </>
                )}
              </Card>

              {agent.internalNotes && (
                <Card className="p-3 bg-info-soft/15 border-info/20">
                  <p className="text-[10px] uppercase tracking-wider text-info font-semibold mb-1">Internal note</p>
                  <p className="text-sm italic">&ldquo;{agent.internalNotes}&rdquo;</p>
                </Card>
              )}

              {agent.blocked && agent.blockReason && (
                <Card className="p-3 bg-danger-soft/15 border-danger/30">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-danger flex items-center gap-1.5"><Ban className="h-3 w-3" />Block reason</p>
                  <p className="text-sm mt-1">{agent.blockReason}</p>
                </Card>
              )}

              <Button variant="outline" onClick={onEdit} className="w-full"><Edit className="h-3.5 w-3.5" />Edit profile</Button>
            </div>
          )}

          {tab === "bookings" && (
            <div className="space-y-3">
              {mockBookings.length === 0 ? (
                <div className="text-center py-8">
                  <BedDouble className="h-8 w-8 mx-auto text-subtle-foreground mb-2" />
                  <p className="font-medium">No bookings yet</p>
                  <p className="text-xs text-muted-foreground mt-1">First booking will appear here</p>
                </div>
              ) : (
                mockBookings.map(b => (
                  <Card key={b.bookingNo} className="p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{b.bookingNo} · {b.guestName}</p>
                        <p className="text-xs text-muted-foreground tabular mt-0.5">{formatDate(b.checkIn)} · {b.nights}N</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-semibold tabular text-sm">{money(b.amount)}</p>
                        <Badge tone={b.status === "paid" ? "success" : b.status === "partial" ? "warning" : "danger"}>{b.status}</Badge>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}

          {tab === "ledger" && (
            <Card className="p-0 overflow-hidden">
              <div className="px-4 py-2 bg-surface-elevated border-b border-border flex items-center justify-between">
                <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Account ledger</p>
                <Button size="sm" variant="ghost" onClick={onDownloadSoa}><Download className="h-3 w-3" />SOA</Button>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-surface-elevated">
                  <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Type / Ref</th>
                    <th className="px-3 py-2 text-right">Debit</th>
                    <th className="px-3 py-2 text-right">Credit</th>
                    <th className="px-3 py-2 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {ledgerWithRunning.map((l, i) => (
                    <tr key={i}>
                      <td className="px-3 py-1.5 tabular text-xs text-muted-foreground">{formatDate(l.date)}</td>
                      <td className="px-3 py-1.5"><Badge tone={l.type === "Invoice" ? "warning" : "success"}>{l.type}</Badge> <span className="font-mono text-[10px] text-muted-foreground tabular">{l.ref}</span></td>
                      <td className="px-3 py-1.5 text-right tabular">{l.debit > 0 ? money(l.debit) : "—"}</td>
                      <td className="px-3 py-1.5 text-right tabular text-success">{l.credit > 0 ? money(l.credit) : "—"}</td>
                      <td className="px-3 py-1.5 text-right tabular font-medium">{money(l.balance)}</td>
                    </tr>
                  ))}
                  <tr className="font-bold bg-surface-elevated">
                    <td colSpan={4} className="px-3 py-2 text-right text-xs uppercase tracking-wider text-muted-foreground">Closing balance</td>
                    <td className="px-3 py-2 text-right tabular text-warning">{money(agent.outstanding)}</td>
                  </tr>
                </tbody>
              </table>
            </Card>
          )}

          {tab === "contacts" && (
            <div className="space-y-3">
              {agent.contacts && agent.contacts.length > 0 ? (
                agent.contacts.map((c, i) => (
                  <Card key={i} className="p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-medium">{c.name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{c.role}</p>
                      </div>
                      <div className="flex gap-1">
                        {c.phone && <a href={`tel:${c.phone}`} className="h-8 w-8 rounded-md border border-border hover:bg-success hover:text-white inline-flex items-center justify-center" title={c.phone}><Phone className="h-3 w-3" /></a>}
                        {c.email && <a href={`mailto:${c.email}`} className="h-8 w-8 rounded-md border border-border hover:bg-info hover:text-white inline-flex items-center justify-center" title={c.email}><Mail className="h-3 w-3" /></a>}
                      </div>
                    </div>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8">
                  <Phone className="h-8 w-8 mx-auto text-subtle-foreground mb-2" />
                  <p className="font-medium">No additional contacts yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Add via Edit profile</p>
                  <Button variant="outline" size="sm" onClick={onEdit} className="mt-3"><Plus className="h-3 w-3" />Add contact</Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ========================= BULK STATEMENTS MODAL =========================
function BulkStatementsModal({ agents, onClose, onSend }: {
  agents: AgentExt[];
  onClose: () => void;
  onSend: (ids: string[], channel: string) => void;
}) {
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(() => new Set(agents.filter(a => a.outstanding > 0).map(a => a.id)));
  const [channel, setChannel] = React.useState<"Email" | "WhatsApp" | "Email + WhatsApp">("Email + WhatsApp");

  React.useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; document.removeEventListener("keydown", onKey); };
  }, [onClose]);

  const toggle = (id: string) => setSelectedIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const toggleAll = () => {
    if (selectedIds.size === agents.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(agents.map(a => a.id)));
  };

  const totalOutstanding = agents.filter(a => selectedIds.has(a.id)).reduce((t, a) => t + a.outstanding, 0);

  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface rounded-xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="h-9 w-9 rounded-md bg-info-soft text-info inline-flex items-center justify-center"><FileText className="h-4 w-4" /></span>
            <div>
              <h3 className="font-semibold">Send statements of account</h3>
              <p className="text-xs text-muted-foreground">Bulk SOA delivery to selected accounts</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="h-7 w-7 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>

        <div className="px-5 py-4 space-y-3 overflow-y-auto">
          <div className="space-y-1.5">
            <Label className="text-xs">Delivery channel</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {(["Email", "WhatsApp", "Email + WhatsApp"] as const).map(c => (
                <button key={c} type="button" onClick={() => setChannel(c)} className={cn(
                  "h-9 rounded-md border text-xs font-medium transition-colors",
                  channel === c ? "bg-brand text-brand-foreground border-brand" : "border-border hover:bg-surface-sunken"
                )}>{c}</button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground tabular">{selectedIds.size}</span> selected · outstanding <span className="font-semibold text-warning tabular">{money(totalOutstanding)}</span>
            </p>
            <Button size="sm" variant="ghost" onClick={toggleAll}>
              {selectedIds.size === agents.length ? "Deselect all" : "Select all"}
            </Button>
          </div>

          <ul className="space-y-1 max-h-72 overflow-y-auto pr-1">
            {agents.map(a => (
              <li key={a.id} className={cn(
                "flex items-center gap-2.5 p-2 rounded-md border transition-colors cursor-pointer",
                selectedIds.has(a.id) ? "border-brand bg-brand-soft/20" : "border-border hover:bg-surface-sunken"
              )} onClick={() => toggle(a.id)}>
                <input type="checkbox" checked={selectedIds.has(a.id)} onChange={() => toggle(a.id)} className="h-4 w-4 rounded accent-brand" onClick={e => e.stopPropagation()} />
                <span className={cn("h-7 w-7 rounded-md flex items-center justify-center shrink-0",
                  a.type === "Corporate" ? "bg-info-soft text-info" : "bg-brand-soft text-brand-soft-foreground"
                )}>
                  {a.type === "Corporate" ? <Building2 className="h-3.5 w-3.5" /> : <Briefcase className="h-3.5 w-3.5" />}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{a.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{a.email}</p>
                </div>
                <p className={cn("text-xs tabular shrink-0", a.outstanding > 0 ? "text-warning font-medium" : "text-muted-foreground")}>{money(a.outstanding)}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-border bg-surface-sunken/30">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSend(Array.from(selectedIds), channel)} disabled={selectedIds.size === 0}>
            <Send className="h-3.5 w-3.5" />Send {selectedIds.size}
          </Button>
        </div>
      </div>
    </div>
  );
}
