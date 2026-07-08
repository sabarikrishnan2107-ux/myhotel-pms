"use client";
import * as React from "react";
import {
  Wrench, Search, X, Clock, CheckCircle2, Camera, Filter,
  Mic, User, CalendarDays, LayoutGrid, List as ListIcon, Package, MapPin,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { KPICard } from "@/components/ui/kpi-card";
import { apiGet } from "@/lib/api";
import { cn } from "@/lib/utils";

// A maintenance ticket as returned (raw row) by GET /maintenance-tickets.
type MTicket = {
  id: number;
  code?: string | null;
  title: string;
  description?: string | null;
  room: string;
  floor?: number | null;
  category?: string | null;
  priority: string;
  status: string;                 // open | assigned | in-progress | resolved
  assignee?: string | null;
  reported?: string | null;       // reported date/time (string)
  reported_by?: string | null;
  created_at?: string | null;
  started_at?: string | null;
  resolved_at?: string | null;
  total_minutes?: number | null;
  outcome?: string | null;        // fixed | escalate
  parts?: string[] | null;
  work_notes?: string | null;
  work_voice_url?: string | null;
  photos?: string[] | null;       // reported photos (damage report)
  voiceUrl?: string | null;       // reported voice note
  photos_before?: string[] | null;
  photos_after?: string[] | null;
};

type Tone = "warning" | "info" | "success" | "neutral" | "danger" | "brand";
const STATUS_META: Record<string, { label: string; tone: Tone }> = {
  open: { label: "Open", tone: "warning" },
  assigned: { label: "Assigned", tone: "info" },
  "in-progress": { label: "In Progress", tone: "brand" },
  resolved: { label: "Resolved", tone: "success" },
};
const statusMeta = (s: string) => STATUS_META[s] ?? { label: s, tone: "neutral" as Tone };
const outcomeMeta = (o?: string | null) =>
  o === "escalate" ? { label: "Escalated", tone: "warning" as Tone } :
  o === "fixed" ? { label: "Fixed", tone: "success" as Tone } : null;
const prioMeta = (p: string): { label: string; tone: Tone } => {
  const s = String(p).toLowerCase();
  if (s === "urgent") return { label: "urgent", tone: "danger" };
  if (s === "high") return { label: "high", tone: "warning" };
  if (s === "medium") return { label: "medium", tone: "info" };
  return { label: s || "low", tone: "neutral" };
};

const arr = (a?: string[] | null) => (Array.isArray(a) ? a : []);
const loc = (room?: string | null) => {
  const r = String(room ?? "").trim();
  if (!r) return "—";
  return /^\d/.test(r) ? `Room ${r}` : r;
};
const dateOf = (s?: string | null) => (s ? String(s).slice(0, 10) : "");
const toDate = (s?: string | null) => {
  if (!s) return null;
  const d = new Date(String(s).includes("T") ? s : String(s).replace(" ", "T"));
  return isNaN(d.getTime()) ? null : d;
};
const fmtTime = (s?: string | null) => {
  const d = toDate(s);
  if (!d) return "—";
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
};
const fmtDur = (m?: number | null) => {
  const x = Math.max(0, Math.round(m ?? 0));
  return x < 60 ? `${x}m` : `${Math.floor(x / 60)}h ${String(x % 60).padStart(2, "0")}m`;
};
// The date a ticket is bucketed under for the date filter.
const bucketDate = (t: MTicket) => dateOf(t.resolved_at) || dateOf(t.started_at) || dateOf(t.reported) || dateOf(t.created_at);

export default function MaintenanceReportPage() {
  const [tickets, setTickets] = React.useState<MTicket[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [detail, setDetail] = React.useState<MTicket | null>(null);
  const [view, setView] = React.useState<"table" | "cards">("table");

  const load = React.useCallback(() => {
    setLoading(true);
    apiGet<MTicket[]>("/maintenance-tickets").then(setTickets).catch(() => {}).finally(() => setLoading(false));
  }, []);
  React.useEffect(() => {
    load();
    const id = setInterval(load, 15000); // live: reflect app resolutions automatically
    return () => clearInterval(id);
  }, [load]);

  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [tech, setTech] = React.useState("all");
  const [statusF, setStatusF] = React.useState("all");
  const [outcomeF, setOutcomeF] = React.useState("all");
  const [q, setQ] = React.useState("");

  const techs = React.useMemo(
    () => Array.from(new Set(tickets.map(t => t.assignee).filter(Boolean))) as string[],
    [tickets],
  );

  const filtered = React.useMemo(() => tickets.filter(t => {
    const d = bucketDate(t);
    if (from && d && d < from) return false;
    if (to && d && d > to) return false;
    if (tech !== "all" && t.assignee !== tech) return false;
    if (statusF !== "all" && t.status !== statusF) return false;
    if (outcomeF !== "all" && (t.outcome ?? "") !== outcomeF) return false;
    if (q) {
      const hay = `${t.code ?? ""} ${t.title} ${t.room} ${t.assignee ?? ""} ${t.category ?? ""}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  }), [tickets, from, to, tech, statusF, outcomeF, q]);

  const resolved = filtered.filter(t => t.status === "resolved");
  const avgDur = resolved.length
    ? Math.round(resolved.reduce((s, t) => s + (t.total_minutes ?? 0), 0) / resolved.length)
    : 0;
  const escalated = filtered.filter(t => t.outcome === "escalate").length;
  const withProof = filtered.filter(t => (arr(t.photos_before).length + arr(t.photos_after).length) > 0).length;

  const activeFilters =
    (from ? 1 : 0) + (to ? 1 : 0) + (tech !== "all" ? 1 : 0) + (statusF !== "all" ? 1 : 0) + (outcomeF !== "all" ? 1 : 0) + (q ? 1 : 0);
  const clear = () => { setFrom(""); setTo(""); setTech("all"); setStatusF("all"); setOutcomeF("all"); setQ(""); };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-medium tracking-tight inline-flex items-center gap-2">
            <Wrench className="h-5 w-5 text-brand" />Maintenance Reports
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Every work order with before/after photos, parts, notes &amp; time-on-job from the maintenance app
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md border border-border overflow-hidden h-9">
            <button type="button" onClick={() => setView("table")} className={cn("h-full px-3 inline-flex items-center gap-1.5 text-xs font-medium border-r border-border transition-colors", view === "table" ? "bg-brand text-brand-foreground" : "hover:bg-surface-sunken text-muted-foreground")}>
              <ListIcon className="h-3.5 w-3.5" /><span className="hidden sm:inline">Table</span>
            </button>
            <button type="button" onClick={() => setView("cards")} className={cn("h-full px-3 inline-flex items-center gap-1.5 text-xs font-medium transition-colors", view === "cards" ? "bg-brand text-brand-foreground" : "hover:bg-surface-sunken text-muted-foreground")}>
              <LayoutGrid className="h-3.5 w-3.5" /><span className="hidden sm:inline">Cards</span>
            </button>
          </div>
          <Button variant="outline" onClick={load}>Refresh</Button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard label="Tickets (filtered)" value={filtered.length} icon={Wrench} accent="brand" hint={`${tickets.length} total`} />
        <KPICard label="Resolved" value={resolved.length} icon={CheckCircle2} accent="success" />
        <KPICard label="Avg. repair time" value={fmtDur(avgDur)} icon={Clock} accent="info" hint="resolved" />
        <KPICard label="Escalated" value={escalated} icon={Filter} accent={escalated > 0 ? "warning" : "success"} />
      </div>

      {/* Filters */}
      <Card className="p-3 space-y-2.5">
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label className="text-[11px]">From</Label>
            <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="h-9 w-auto" />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">To</Label>
            <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="h-9 w-auto" />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Technician</Label>
            <Select value={tech} onChange={e => setTech(e.target.value)} className="h-9 w-auto">
              <option value="all">All technicians</option>
              {techs.map(n => <option key={n} value={n}>{n}</option>)}
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Status</Label>
            <Select value={statusF} onChange={e => setStatusF(e.target.value)} className="h-9 w-auto">
              <option value="all">Any status</option>
              <option value="open">Open</option>
              <option value="assigned">Assigned</option>
              <option value="in-progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Outcome</Label>
            <Select value={outcomeF} onChange={e => setOutcomeF(e.target.value)} className="h-9 w-auto">
              <option value="all">Any outcome</option>
              <option value="fixed">Fixed</option>
              <option value="escalate">Escalated</option>
            </Select>
          </div>
          <div className="space-y-1 flex-1 min-w-[200px]">
            <Label className="text-[11px]">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle-foreground" />
              <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Ticket #, title, room, technician…" className="pl-9 h-9" />
            </div>
          </div>
          {activeFilters > 0 && (
            <Button variant="ghost" size="sm" onClick={clear}><X className="h-3 w-3" />Clear ({activeFilters})</Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Showing <span className="font-medium text-foreground">{filtered.length}</span> of {tickets.length} · {withProof} with photo proof
        </p>
      </Card>

      {/* Results */}
      {loading ? (
        <Card className="p-12 text-center text-sm text-muted-foreground">Loading reports…</Card>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <Search className="h-8 w-8 mx-auto text-subtle-foreground mb-2" />
          <p className="font-medium">No tickets match your filters</p>
          <p className="text-xs text-muted-foreground mt-1">Adjust the date range or filters above.</p>
        </Card>
      ) : view === "cards" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map(t => <TicketCard key={t.id} ticket={t} onOpen={() => setDetail(t)} />)}
        </div>
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-elevated border-b border-border">
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 font-semibold">Ticket</th>
                  <th className="px-4 py-3 font-semibold">Location</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold">Technician</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Started</th>
                  <th className="px-4 py-3 font-semibold">Resolved</th>
                  <th className="px-4 py-3 font-semibold">Time</th>
                  <th className="px-4 py-3 font-semibold text-right">Report</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(t => {
                  const oc = outcomeMeta(t.outcome);
                  const sm = statusMeta(t.status);
                  const pm = prioMeta(t.priority);
                  return (
                    <tr key={t.id} className="hover:bg-surface-sunken/40 transition-colors cursor-pointer" onClick={() => setDetail(t)}>
                      <td className="px-4 py-3">
                        <p className="font-medium leading-snug max-w-[240px] truncate">{t.title}</p>
                        <p className="text-[11px] text-muted-foreground tabular">{t.code ?? `#${t.id}`}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground"><MapPin className="h-3 w-3 inline mr-1" />{loc(t.room)}</td>
                      <td className="px-4 py-3"><Badge tone="neutral">{t.category ?? "General"}</Badge></td>
                      <td className="px-4 py-3">
                        {t.assignee ? (
                          <div className="flex items-center gap-2">
                            <Avatar name={t.assignee} size={26} />
                            <span className="text-xs font-medium truncate max-w-[110px]">{t.assignee}</span>
                          </div>
                        ) : <span className="text-xs text-muted-foreground">Unassigned</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1">
                          <Badge tone={sm.tone}>{sm.label}</Badge>
                          {oc && <Badge tone={oc.tone}>{oc.label}</Badge>}
                          {pm.label === "urgent" && <Badge tone="danger">urgent</Badge>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground tabular">{fmtTime(t.started_at)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground tabular">{fmtTime(t.resolved_at)}</td>
                      <td className="px-4 py-3 text-xs font-medium tabular">{t.status === "resolved" ? fmtDur(t.total_minutes) : "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setDetail(t); }}>
                          <Camera className="h-3.5 w-3.5" />View
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {detail && <DetailModal ticket={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

function TicketCard({ ticket: t, onOpen }: { ticket: MTicket; onOpen: () => void }) {
  const oc = outcomeMeta(t.outcome);
  const sm = statusMeta(t.status);
  const pm = prioMeta(t.priority);
  const before = arr(t.photos_before);
  const after = arr(t.photos_after);
  const urgent = pm.label === "urgent";
  return (
    <Card className={cn("p-4 cursor-pointer hover:shadow-md transition-all", urgent && "border-l-4 border-l-danger")} onClick={onOpen}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-snug">{t.title}</p>
          <p className="text-[11px] text-muted-foreground tabular mt-0.5">{t.code ?? `#${t.id}`} · <MapPin className="h-3 w-3 inline" /> {loc(t.room)}</p>
        </div>
        <Badge tone={pm.tone}>{pm.label}</Badge>
      </div>
      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        <Badge tone="neutral">{t.category ?? "General"}</Badge>
        <Badge tone={sm.tone}>{sm.label}</Badge>
        {oc && <Badge tone={oc.tone}>{oc.label}</Badge>}
      </div>

      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
        {t.assignee ? <Avatar name={t.assignee} size={26} /> : null}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium truncate">{t.assignee ?? "Unassigned"}</p>
        </div>
        {t.status === "resolved" && <span className="text-xs font-semibold text-success tabular">{fmtDur(t.total_minutes)}</span>}
      </div>

      <div className="grid grid-cols-3 gap-2 mt-3 text-[11px]">
        <div><p className="text-muted-foreground">Reported</p><p className="tabular font-medium">{t.reported || fmtTime(t.created_at)}</p></div>
        <div><p className="text-muted-foreground">Started</p><p className="tabular font-medium">{fmtTime(t.started_at)}</p></div>
        <div><p className="text-muted-foreground">Resolved</p><p className="tabular font-medium">{fmtTime(t.resolved_at)}</p></div>
      </div>

      {(before.length > 0 || after.length > 0 || t.work_voice_url || t.voiceUrl || arr(t.parts).length > 0) && (
        <div className="flex items-center gap-2 mt-3">
          {before[0] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={before[0]} alt="before" className="h-11 w-11 rounded object-cover border border-border" />
          )}
          {after[0] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={after[0]} alt="after" className="h-11 w-11 rounded object-cover border border-border" />
          )}
          {(t.work_voice_url || t.voiceUrl) && <Mic className="h-4 w-4 text-brand" />}
          <div className="flex-1" />
          {arr(t.parts).length > 0 && <span className="text-[11px] text-muted-foreground font-medium inline-flex items-center gap-1"><Package className="h-3 w-3" />{arr(t.parts).length}</span>}
        </div>
      )}
    </Card>
  );
}

function DetailModal({ ticket: t, onClose }: { ticket: MTicket; onClose: () => void }) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  const oc = outcomeMeta(t.outcome);
  const sm = statusMeta(t.status);
  const before = arr(t.photos_before);
  const after = arr(t.photos_after);
  const reportedPhotos = arr(t.photos);
  const parts = arr(t.parts);
  const [lb, setLb] = React.useState<{ photos: string[]; index: number } | null>(null);
  const openPhoto = (photos: string[], index: number) => setLb({ photos, index });

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <Card className="pointer-events-auto w-full max-w-2xl p-0 animate-in shadow-xl overflow-hidden max-h-[92vh] flex flex-col">
          <div className="px-5 py-4 bg-surface-elevated border-b border-border flex items-center gap-3">
            <span className="h-11 w-11 rounded-md bg-brand-soft text-brand-soft-foreground inline-flex items-center justify-center shrink-0"><Wrench className="h-5 w-5" /></span>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">{t.title}</h3>
              <p className="text-xs text-muted-foreground tabular">{t.code ?? `#${t.id}`} · {loc(t.room)} · {t.category ?? "General"}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge tone={sm.tone}>{sm.label}</Badge>
              {oc && <Badge tone={oc.tone}>{oc.label}</Badge>}
            </div>
            <button type="button" onClick={onClose} className="h-8 w-8 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
          </div>

          <div className="px-5 py-4 space-y-5 overflow-y-auto">
            {/* who + timeline */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-md border border-border p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 inline-flex items-center gap-1"><User className="h-3 w-3" />Technician</p>
                <div className="flex items-center gap-2">
                  <Avatar name={t.assignee ?? "?"} size={34} />
                  <div>
                    <p className="text-sm font-medium">{t.assignee ?? "Unassigned"}</p>
                    <p className="text-[11px] text-muted-foreground">{prioMeta(t.priority).label} priority</p>
                  </div>
                </div>
                {t.reported_by && <p className="text-[11px] text-muted-foreground mt-2">Reported by {t.reported_by}</p>}
              </div>
              <div className="rounded-md border border-border p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" />Timeline</p>
                <TimeRow label="Reported" value={t.reported || fmtTime(t.created_at)} />
                <TimeRow label="Started" value={fmtTime(t.started_at)} />
                <TimeRow label="Resolved" value={fmtTime(t.resolved_at)} />
                {t.status === "resolved" && <TimeRow label="Time on job" value={fmtDur(t.total_minutes)} highlight />}
              </div>
            </div>

            {/* reported issue (from housekeeping / reception) */}
            {(reportedPhotos.length > 0 || t.voiceUrl || t.description?.trim()) && (
              <div className="rounded-md border border-border p-3 space-y-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Reported issue</p>
                {t.description?.trim() && <p className="text-sm">{t.description}</p>}
                {reportedPhotos.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {reportedPhotos.map((u, i) => (
                      <button key={i} type="button" onClick={() => openPhoto(reportedPhotos, i)} className="block">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={u} alt={`reported ${i + 1}`} className="h-16 w-16 rounded-md object-cover border border-border hover:opacity-90 hover:ring-2 hover:ring-brand transition-all" />
                      </button>
                    ))}
                  </div>
                )}
                {t.voiceUrl && <audio controls src={t.voiceUrl} className="w-full" />}
              </div>
            )}

            {/* before / after */}
            <div className="grid sm:grid-cols-2 gap-4">
              <PhotoBlock title="Before photos" photos={before} onPhoto={openPhoto} />
              <PhotoBlock title="After photos" photos={after} onPhoto={openPhoto} />
            </div>

            {/* parts used */}
            {parts.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 inline-flex items-center gap-1"><Package className="h-3 w-3" />Parts used</p>
                <div className="flex flex-wrap gap-1.5">
                  {parts.map((p, i) => <Badge key={i} tone="neutral">{p}</Badge>)}
                </div>
              </div>
            )}

            {/* work notes */}
            {t.work_notes?.trim() && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Work notes</p>
                <p className="text-sm whitespace-pre-wrap rounded-md border border-border p-3">{t.work_notes}</p>
              </div>
            )}

            {/* work voice */}
            {t.work_voice_url && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 inline-flex items-center gap-1"><Mic className="h-3 w-3" />Technician voice note</p>
                <audio controls src={t.work_voice_url} className="w-full" />
              </div>
            )}
          </div>
        </Card>
      </div>
      {lb && (
        <Lightbox
          photos={lb.photos}
          index={lb.index}
          onClose={() => setLb(null)}
          onIndex={(i) => setLb(prev => (prev ? { ...prev, index: i } : null))}
        />
      )}
    </>
  );
}

function Lightbox({ photos, index, onClose, onIndex }: {
  photos: string[];
  index: number;
  onClose: () => void;
  onIndex: (i: number) => void;
}) {
  const prev = React.useCallback(() => onIndex((index - 1 + photos.length) % photos.length), [index, photos.length, onIndex]);
  const next = React.useCallback(() => onIndex((index + 1) % photos.length), [index, photos.length, onIndex]);
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose, prev, next]);

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center" onClick={onClose}>
      <button type="button" onClick={onClose} className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white inline-flex items-center justify-center">
        <X className="h-5 w-5" />
      </button>
      {photos.length > 1 && (
        <button type="button" onClick={(e) => { e.stopPropagation(); prev(); }} className="absolute left-3 sm:left-6 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white inline-flex items-center justify-center text-3xl leading-none">‹</button>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photos[index]} alt={`photo ${index + 1}`} className="max-h-[88vh] max-w-[92vw] object-contain rounded-md shadow-2xl" onClick={(e) => e.stopPropagation()} />
      {photos.length > 1 && (
        <button type="button" onClick={(e) => { e.stopPropagation(); next(); }} className="absolute right-3 sm:right-6 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white inline-flex items-center justify-center text-3xl leading-none">›</button>
      )}
      {photos.length > 1 && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 text-white/80 text-sm bg-black/50 px-3 py-1 rounded-full tabular">{index + 1} / {photos.length}</div>
      )}
    </div>
  );
}

function TimeRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("tabular font-medium", highlight && "text-success font-bold")}>{value}</span>
    </div>
  );
}

function PhotoBlock({ title, photos, onPhoto }: { title: string; photos: string[]; onPhoto: (photos: string[], index: number) => void }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 inline-flex items-center gap-1">
        <Camera className="h-3 w-3" />{title} ({photos.length})
      </p>
      {photos.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-6 text-center text-xs text-subtle-foreground">No photos</div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((u, i) => (
            <button key={i} type="button" onClick={() => onPhoto(photos, i)} className="block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt={`${title} ${i + 1}`} className="aspect-square w-full rounded-md object-cover border border-border hover:opacity-90 hover:ring-2 hover:ring-brand transition-all" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
