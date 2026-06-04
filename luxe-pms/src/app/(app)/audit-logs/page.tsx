"use client";
import * as React from "react";
import {
  Search, FileDown, ScrollText, X, Eye, ShieldCheck, AlertCircle, ChevronRight,
  Calendar, Filter, Clock, User, ArrowRight, Copy, Database,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { KPICard } from "@/components/ui/kpi-card";
import { AUDIT_LOG_ENTRIES } from "@/lib/mock-data-ext";
import { cn } from "@/lib/utils";

type Severity = "info" | "warning" | "critical";
type SeededEntry = typeof AUDIT_LOG_ENTRIES[number];
type Enriched = SeededEntry & {
  severity: Severity;
  ip?: string;
  device?: string;
};

const MODULE_TONE: Record<string, "brand" | "info" | "warning" | "success" | "danger" | "neutral" | "accent"> = {
  Folio: "brand", "Check-in": "info", Payment: "success", Approval: "accent",
  Housekeeping: "neutral", Maintenance: "warning", Inventory: "neutral",
  "Night Audit": "brand", Vendor: "neutral",
};

const SEVERITY_TONE: Record<Severity, "neutral" | "warning" | "danger"> = {
  info: "neutral", warning: "warning", critical: "danger",
};

// Enrich seed entries with severity / IP / device for the demo
function enrich(): Enriched[] {
  const ips = ["10.0.0.12", "10.0.0.21", "192.168.1.4", "10.0.0.45", "10.0.0.12"];
  const devices = ["MacBook Pro · Chrome", "iPad · Safari", "Reception Terminal", "Manager iPhone", "Server"];
  return AUDIT_LOG_ENTRIES.map((e, i) => {
    const sev: Severity =
      e.module === "Approval" || e.action.toLowerCase().includes("discount") ? "warning" :
      e.user === "System" ? "info" :
      e.action.toLowerCase().includes("paid") || e.action.toLowerCase().includes("approved") ? "warning" : "info";
    return {
      ...e, severity: sev,
      ip: e.user === "System" ? "internal" : ips[i % ips.length],
      device: e.user === "System" ? "Cron worker" : devices[i % devices.length],
    };
  });
}

export default function AuditLogsPage() {
  const entries = React.useMemo(enrich, []);

  const [search, setSearch] = React.useState("");
  const [moduleFilter, setModuleFilter] = React.useState("all");
  const [userFilter, setUserFilter] = React.useState("all");
  const [dateFilter, setDateFilter] = React.useState<"today" | "yesterday" | "week" | "all">("today");
  const [severityFilter, setSeverityFilter] = React.useState<"all" | Severity>("all");
  const [detailEntry, setDetailEntry] = React.useState<Enriched | null>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };

  const filtered = React.useMemo(() => {
    return entries.filter(e => {
      if (search && !`${e.action} ${e.entity} ${e.user} ${e.module} ${e.before} ${e.after}`.toLowerCase().includes(search.toLowerCase())) return false;
      if (moduleFilter !== "all" && e.module !== moduleFilter) return false;
      if (userFilter !== "all" && e.user !== userFilter) return false;
      if (severityFilter !== "all" && e.severity !== severityFilter) return false;
      if (dateFilter === "today" && (e.time === "Yesterday" || e.time.includes("days") || e.time.includes("week"))) return false;
      if (dateFilter === "yesterday" && e.time !== "Yesterday") return false;
      // week and all: show everything
      return true;
    });
  }, [entries, search, moduleFilter, userFilter, dateFilter, severityFilter]);

  const users = Array.from(new Set(entries.map(e => e.user)));
  const modules = Array.from(new Set(entries.map(e => e.module)));

  const totalToday = entries.filter(e => !e.time.includes("Yesterday")).length;
  const byMostActive = entries.reduce<Record<string, number>>((acc, e) => { acc[e.user] = (acc[e.user] || 0) + 1; return acc; }, {});
  const mostActive = Object.entries(byMostActive).sort((a, b) => b[1] - a[1])[0];
  const systemCount = entries.filter(e => e.user === "System").length;
  const approvalsCount = entries.filter(e => e.module === "Approval").length;
  const criticalCount = entries.filter(e => e.severity === "critical").length;
  const warningCount = entries.filter(e => e.severity === "warning").length;

  const downloadCsv = () => {
    const rows = [
      ["Time", "User", "Module", "Action", "Entity", "Before", "After", "Severity", "IP", "Device"],
      ...filtered.map(e => [e.time, e.user, e.module, e.action, e.entity, e.before, e.after, e.severity, e.ip || "", e.device || ""]),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${filtered.length} entries to CSV`);
  };

  const activeFilters =
    (search ? 1 : 0) + (moduleFilter !== "all" ? 1 : 0) + (userFilter !== "all" ? 1 : 0) +
    (severityFilter !== "all" ? 1 : 0) + (dateFilter !== "today" ? 1 : 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-medium tracking-tight inline-flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-brand" />Audit Logs
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Immutable trail · who, when, what · cryptographically hashed · 90-day retention</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => showToast("Retention settings: 90 days · upgrade to extend")}>
            <Database className="h-4 w-4" />Retention
          </Button>
          <Button variant="outline" onClick={downloadCsv} disabled={filtered.length === 0}>
            <FileDown className="h-4 w-4" />Export CSV ({filtered.length})
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KPICard label="Entries today" value={totalToday} icon={ScrollText} accent="brand" />
        <KPICard label="Most active" value={mostActive?.[0] || "—"} accent="info" hint={mostActive ? `${mostActive[1]} events` : ""} />
        <KPICard label="System events" value={systemCount} icon={Database} accent="neutral" />
        <KPICard label="Approvals" value={approvalsCount} accent="accent" />
        <KPICard label="Critical / warning" value={`${criticalCount} / ${warningCount}`} icon={AlertCircle} accent={criticalCount > 0 ? "danger" : warningCount > 0 ? "warning" : "success"} />
      </div>

      {/* Filter bar */}
      <Card className="p-3 space-y-2.5">
        {/* Date chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mr-1">
            <Calendar className="h-3 w-3" />Range
          </span>
          {(["today", "yesterday", "week", "all"] as const).map(d => (
            <button key={d} onClick={() => setDateFilter(d)} className={cn(
              "h-8 px-3 rounded-full text-xs font-medium border transition-colors capitalize",
              dateFilter === d ? "bg-foreground text-background border-foreground" : "border-border hover:bg-surface-sunken text-muted-foreground"
            )}>{d === "week" ? "Last 7 days" : d}</button>
          ))}
          <div className="h-5 w-px bg-border mx-1" />
          {/* Severity chips */}
          {(["all", "info", "warning", "critical"] as const).map(s => (
            <button key={s} onClick={() => setSeverityFilter(s)} className={cn(
              "h-8 px-3 rounded-full text-xs font-medium border transition-colors capitalize inline-flex items-center gap-1.5",
              severityFilter === s ? "bg-foreground text-background border-foreground" : "border-border hover:bg-surface-sunken text-muted-foreground"
            )}>
              {s !== "all" && <span className={cn(
                "h-1.5 w-1.5 rounded-full",
                s === "info" && "bg-info",
                s === "warning" && "bg-warning",
                s === "critical" && "bg-danger",
              )} />}
              {s === "all" ? "All severity" : s}
            </button>
          ))}
        </div>

        {/* Search + selects */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search action, entity, user, IP, before / after…" className="pl-9 h-9" />
          </div>
          <Select value={moduleFilter} onChange={e => setModuleFilter(e.target.value)} className="h-9 w-auto text-xs">
            <option value="all">All modules</option>
            {modules.map(m => <option key={m} value={m}>{m}</option>)}
          </Select>
          <Select value={userFilter} onChange={e => setUserFilter(e.target.value)} className="h-9 w-auto text-xs">
            <option value="all">All users</option>
            {users.map(u => <option key={u} value={u}>{u}</option>)}
          </Select>
          {activeFilters > 0 && (
            <Button size="sm" variant="ghost" onClick={() => { setSearch(""); setModuleFilter("all"); setUserFilter("all"); setSeverityFilter("all"); setDateFilter("today"); }}>
              <X className="h-3 w-3" />Clear ({activeFilters})
            </Button>
          )}
          <div className="flex-1" />
          <p className="text-xs text-muted-foreground tabular">
            <span className="font-medium text-foreground">{filtered.length}</span> of {entries.length}
          </p>
        </div>
      </Card>

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <ScrollText className="h-8 w-8 mx-auto text-subtle-foreground mb-2" />
            <p className="font-medium">No audit entries match your filters</p>
            <p className="text-xs text-muted-foreground mt-1">Try clearing filters or widening the date range</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-elevated border-b border-border">
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 font-semibold">Time</th>
                  <th className="px-4 py-3 font-semibold">User</th>
                  <th className="px-4 py-3 font-semibold">Module</th>
                  <th className="px-4 py-3 font-semibold">Action</th>
                  <th className="px-4 py-3 font-semibold">Entity</th>
                  <th className="px-4 py-3 font-semibold">Change</th>
                  <th className="px-4 py-3 font-semibold">Severity</th>
                  <th className="px-4 py-3 font-semibold text-right">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(e => (
                  <tr key={e.id}
                    onClick={() => setDetailEntry(e)}
                    className={cn(
                      "hover:bg-surface-sunken/50 transition-colors cursor-pointer",
                      e.severity === "critical" && "bg-danger-soft/10",
                      e.severity === "warning" && "bg-warning-soft/10"
                    )}>
                    <td className="px-4 py-3 text-muted-foreground tabular whitespace-nowrap text-xs">{e.time}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {e.user === "System" ? (
                          <span className="h-6 w-6 rounded-full bg-neutral text-background inline-flex items-center justify-center"><Database className="h-3 w-3" /></span>
                        ) : (
                          <Avatar name={e.user.replace(" (Mgr)", "")} size={24} />
                        )}
                        <span className="text-xs font-medium">{e.user}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><Badge tone={MODULE_TONE[e.module] ?? "neutral"}>{e.module}</Badge></td>
                    <td className="px-4 py-3 font-medium text-sm">{e.action}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground tabular font-mono">{e.entity}</td>
                    <td className="px-4 py-3 text-xs tabular">
                      <span className="text-muted-foreground">{e.before}</span>
                      <ArrowRight className="h-3 w-3 inline mx-1 text-muted-foreground" />
                      <span className="font-medium">{e.after}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={SEVERITY_TONE[e.severity]}>{e.severity}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button type="button" onClick={(ev) => { ev.stopPropagation(); setDetailEntry(e); }} className="h-7 px-2 rounded-md border border-border hover:bg-surface-sunken inline-flex items-center justify-center gap-1 text-muted-foreground" title="Open detail">
                        <Eye className="h-3.5 w-3.5" />
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {detailEntry && <AuditDetailDrawer entry={detailEntry} onClose={() => setDetailEntry(null)} onToast={showToast} />}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-foreground text-background rounded-lg px-4 py-3 text-sm shadow-2xl animate-in slide-in-from-bottom-2 inline-flex items-center gap-2.5 ring-1 ring-foreground/20">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span className="font-medium">{toast}</span>
        </div>
      )}
    </div>
  );
}

// ============== DETAIL DRAWER ==============
function AuditDetailDrawer({ entry, onClose, onToast }: {
  entry: Enriched;
  onClose: () => void;
  onToast: (m: string) => void;
}) {
  React.useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; document.removeEventListener("keydown", onKey); };
  }, [onClose]);

  // Derived hash (deterministic from id for demo)
  const hashSeed = entry.id.replace(/\D/g, "") || "0";
  const hash = "0x" + (parseInt(hashSeed) * 7919 + 1234567).toString(16).padStart(12, "0").slice(0, 12) + "…";

  // Mocked before/after as field-level diff
  const fields = [
    { label: "State", before: entry.before, after: entry.after },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm" onClick={onClose}>
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-xl bg-surface shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-border bg-linear-to-r from-brand-soft/30 to-surface">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Audit entry</p>
              <h3 className="font-semibold text-lg truncate">{entry.action}</h3>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <Badge tone={MODULE_TONE[entry.module] ?? "neutral"}>{entry.module}</Badge>
                <Badge tone={SEVERITY_TONE[entry.severity]}>{entry.severity}</Badge>
                <Badge tone="neutral">{entry.time}</Badge>
              </div>
            </div>
            <button type="button" onClick={onClose} className="h-8 w-8 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1">
          {/* Who */}
          <Card className="p-4">
            <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2 inline-flex items-center gap-1.5"><User className="h-3 w-3" />Actor</p>
            <div className="flex items-center gap-3">
              {entry.user === "System" ? (
                <span className="h-10 w-10 rounded-full bg-neutral text-background inline-flex items-center justify-center"><Database className="h-4 w-4" /></span>
              ) : (
                <Avatar name={entry.user.replace(" (Mgr)", "")} size={40} />
              )}
              <div className="min-w-0">
                <p className="font-medium">{entry.user}</p>
                <p className="text-[11px] text-muted-foreground tabular">{entry.device || "—"} · {entry.ip || "—"}</p>
              </div>
            </div>
          </Card>

          {/* Diff */}
          <div>
            <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2">Change diff</p>
            <Card className="p-0 overflow-hidden">
              {fields.map((f, i) => (
                <div key={i} className="grid grid-cols-[120px_1fr] divide-x divide-border border-b border-border last:border-b-0">
                  <div className="bg-surface-sunken/40 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{f.label}</div>
                  <div className="grid grid-cols-2 divide-x divide-border">
                    <div className="px-3 py-2 bg-danger-soft/10">
                      <p className="text-[10px] text-danger uppercase font-bold tracking-wider mb-1">Before</p>
                      <p className="text-sm tabular font-mono break-all">{f.before || "—"}</p>
                    </div>
                    <div className="px-3 py-2 bg-success-soft/10">
                      <p className="text-[10px] text-success uppercase font-bold tracking-wider mb-1">After</p>
                      <p className="text-sm tabular font-mono break-all">{f.after || "—"}</p>
                    </div>
                  </div>
                </div>
              ))}
            </Card>
          </div>

          {/* Entity / metadata */}
          <Card className="p-4 space-y-2">
            <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Entity</p>
            <p className="text-sm font-mono tabular bg-surface-sunken/40 rounded-md px-2 py-1.5 break-all">{entry.entity}</p>
          </Card>

          {/* Integrity proof */}
          <Card className="p-4 bg-info-soft/10 border-info/20 space-y-2">
            <p className="text-xs uppercase tracking-wider font-semibold text-info inline-flex items-center gap-1.5"><ShieldCheck className="h-3 w-3" />Integrity proof</p>
            <div className="space-y-1 text-[11px] tabular font-mono">
              <div className="flex justify-between gap-2"><span className="text-muted-foreground">Hash</span><span>{hash}</span></div>
              <div className="flex justify-between gap-2"><span className="text-muted-foreground">Prev hash</span><span>0x{(parseInt(hashSeed) * 7919).toString(16).slice(0, 12)}…</span></div>
              <div className="flex justify-between gap-2"><span className="text-muted-foreground">Signature</span><span className="truncate">RSA-2048 · ✓ verified</span></div>
            </div>
            <p className="text-[10px] text-muted-foreground">Tamper-evident · entries are chained · any modification breaks the hash chain</p>
          </Card>

          {/* Timeline */}
          <div>
            <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2 inline-flex items-center gap-1.5"><Clock className="h-3 w-3" />Timeline</p>
            <ol className="relative space-y-2">
              <div className="absolute left-2 top-2 bottom-2 w-px bg-border" />
              <li className="relative pl-7">
                <span className="absolute left-0 top-1 h-4 w-4 rounded-full bg-success border-2 border-surface" />
                <p className="text-sm">Event recorded</p>
                <p className="text-[11px] text-muted-foreground tabular">{entry.time} · {entry.device || "—"}</p>
              </li>
              <li className="relative pl-7">
                <span className="absolute left-0 top-1 h-4 w-4 rounded-full bg-info border-2 border-surface" />
                <p className="text-sm">Hashed &amp; chained</p>
                <p className="text-[11px] text-muted-foreground">SHA-256 with previous entry hash</p>
              </li>
              <li className="relative pl-7">
                <span className="absolute left-0 top-1 h-4 w-4 rounded-full bg-brand border-2 border-surface" />
                <p className="text-sm">Replicated</p>
                <p className="text-[11px] text-muted-foreground">3 zones · S3 versioned bucket</p>
              </li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border bg-surface-sunken/30 flex justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard?.writeText(JSON.stringify(entry, null, 2)); onToast("Entry JSON copied"); }}>
            <Copy className="h-3.5 w-3.5" />Copy JSON
          </Button>
          <Button size="sm" variant="outline" onClick={() => onToast(`Investigation opened for ${entry.id}`)}>
            <AlertCircle className="h-3.5 w-3.5" />Flag for review
          </Button>
        </div>
      </div>
    </div>
  );
}
