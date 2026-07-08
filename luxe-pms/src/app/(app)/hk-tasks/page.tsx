"use client";
import * as React from "react";
import {
  Sparkles, Search, X, Clock, CheckCircle2, Camera, Filter,
  Mic, User, CalendarDays, LayoutGrid, List as ListIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { KPICard } from "@/components/ui/kpi-card";
import { apiGet } from "@/lib/api";
import { cn } from "@/lib/utils";

// A housekeeping task as returned by GET /housekeeping/report.
type HKTask = {
  id: number;
  room: string;
  floor?: number | null;
  roomType?: string;
  guestName?: string | null;
  customerName?: string | null;
  roomState?: string | null;
  outcome?: string | null;
  type: string;
  priority: string;
  status: string;
  assignee?: string;
  assignedBy?: string | null;
  employeeCode?: string | null;
  assignedAt?: string | null;
  acknowledgedAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  durationMin?: number;
  totalMinutes?: number;
  notes?: string | null;
  voiceUrl?: string | null;
  photosBefore: string[];
  photosAfter: string[];
  foundItems?: Report[];
  maintenanceTickets?: Report[];
};

// A found item / maintenance ticket reported during the cleaning.
type Report = {
  id: number;
  name?: string;
  title?: string;
  description?: string | null;
  photos?: string[];
  voiceUrl?: string | null;
  status?: string;
  reportedAt?: string | null;
};

type Tone = "warning" | "info" | "success" | "neutral" | "danger";
const STATUS_META: Record<string, { label: string; tone: Tone }> = {
  assigned: { label: "Assigned", tone: "warning" },
  in_progress: { label: "In Progress", tone: "info" },
  completed: { label: "Completed", tone: "success" },
};
const statusMeta = (s: string) => STATUS_META[s] ?? { label: s, tone: "neutral" as Tone };
const outcomeMeta = (o?: string | null) =>
  o === "maintenance" ? { label: "Maintenance", tone: "danger" as Tone } :
  o === "ready" ? { label: "Ready", tone: "success" as Tone } : null;

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

export default function HKTasksReportPage() {
  const [tasks, setTasks] = React.useState<HKTask[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [detail, setDetail] = React.useState<HKTask | null>(null);
  const [view, setView] = React.useState<"table" | "cards">("table");

  const load = React.useCallback(() => {
    setLoading(true);
    apiGet<HKTask[]>("/housekeeping/report").then(setTasks).catch(() => {}).finally(() => setLoading(false));
  }, []);
  React.useEffect(() => { load(); }, [load]);

  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [emp, setEmp] = React.useState("all");
  const [statusF, setStatusF] = React.useState("all");
  const [outcomeF, setOutcomeF] = React.useState("all");
  const [q, setQ] = React.useState("");

  const employees = React.useMemo(
    () => Array.from(new Set(tasks.map(t => t.assignee).filter(Boolean))) as string[],
    [tasks],
  );

  const filtered = React.useMemo(() => tasks.filter(t => {
    const d = dateOf(t.completedAt) || dateOf(t.assignedAt);
    if (from && d && d < from) return false;
    if (to && d && d > to) return false;
    if (emp !== "all" && t.assignee !== emp) return false;
    if (statusF !== "all" && t.status !== statusF) return false;
    if (outcomeF !== "all" && (t.outcome ?? "") !== outcomeF) return false;
    if (q) {
      const hay = `${t.room} ${t.assignee ?? ""} ${t.type} ${t.guestName ?? ""} ${t.employeeCode ?? ""}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  }), [tasks, from, to, emp, statusF, outcomeF, q]);

  const completed = filtered.filter(t => t.status === "completed");
  const avgDur = completed.length
    ? Math.round(completed.reduce((s, t) => s + (t.totalMinutes ?? t.durationMin ?? 0), 0) / completed.length)
    : 0;
  const flagged = filtered.filter(t => t.outcome === "maintenance").length;
  const withProof = filtered.filter(t => (t.photosBefore.length + t.photosAfter.length) > 0).length;

  const activeFilters =
    (from ? 1 : 0) + (to ? 1 : 0) + (emp !== "all" ? 1 : 0) + (statusF !== "all" ? 1 : 0) + (outcomeF !== "all" ? 1 : 0) + (q ? 1 : 0);
  const clear = () => { setFrom(""); setTo(""); setEmp("all"); setStatusF("all"); setOutcomeF("all"); setQ(""); };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-medium tracking-tight inline-flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-brand" />Cleaning Reports
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Every assigned room with before/after photos, timing &amp; outcome from the housekeeping app
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
        <KPICard label="Tasks (filtered)" value={filtered.length} icon={Sparkles} accent="brand" hint={`${tasks.length} total`} />
        <KPICard label="Completed" value={completed.length} icon={CheckCircle2} accent="success" />
        <KPICard label="Avg. clean time" value={fmtDur(avgDur)} icon={Clock} accent="info" hint="completed" />
        <KPICard label="Flagged maintenance" value={flagged} icon={Filter} accent={flagged > 0 ? "danger" : "success"} />
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
            <Label className="text-[11px]">Employee</Label>
            <Select value={emp} onChange={e => setEmp(e.target.value)} className="h-9 w-auto">
              <option value="all">All employees</option>
              {employees.map(n => <option key={n} value={n}>{n}</option>)}
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Status</Label>
            <Select value={statusF} onChange={e => setStatusF(e.target.value)} className="h-9 w-auto">
              <option value="all">Any status</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Outcome</Label>
            <Select value={outcomeF} onChange={e => setOutcomeF(e.target.value)} className="h-9 w-auto">
              <option value="all">Any outcome</option>
              <option value="ready">Ready</option>
              <option value="maintenance">Maintenance</option>
            </Select>
          </div>
          <div className="space-y-1 flex-1 min-w-[200px]">
            <Label className="text-[11px]">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle-foreground" />
              <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Room, employee, guest, ID…" className="pl-9 h-9" />
            </div>
          </div>
          {activeFilters > 0 && (
            <Button variant="ghost" size="sm" onClick={clear}><X className="h-3 w-3" />Clear ({activeFilters})</Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Showing <span className="font-medium text-foreground">{filtered.length}</span> of {tasks.length} · {withProof} with photo proof
        </p>
      </Card>

      {/* Results */}
      {loading ? (
        <Card className="p-12 text-center text-sm text-muted-foreground">Loading reports…</Card>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <Search className="h-8 w-8 mx-auto text-subtle-foreground mb-2" />
          <p className="font-medium">No tasks match your filters</p>
          <p className="text-xs text-muted-foreground mt-1">Adjust the date range or filters above.</p>
        </Card>
      ) : view === "cards" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map(t => <TaskCard key={t.id} task={t} onOpen={() => setDetail(t)} />)}
        </div>
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-elevated border-b border-border">
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 font-semibold">Room</th>
                  <th className="px-4 py-3 font-semibold">Employee</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Assigned</th>
                  <th className="px-4 py-3 font-semibold">Started</th>
                  <th className="px-4 py-3 font-semibold">Completed</th>
                  <th className="px-4 py-3 font-semibold">Duration</th>
                  <th className="px-4 py-3 font-semibold text-right">Report</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(t => {
                  const oc = outcomeMeta(t.outcome);
                  const sm = statusMeta(t.status);
                  return (
                    <tr key={t.id} className="hover:bg-surface-sunken/40 transition-colors cursor-pointer" onClick={() => setDetail(t)}>
                      <td className="px-4 py-3">
                        <p className="font-semibold tabular">{t.room}</p>
                        <p className="text-[11px] text-muted-foreground">Floor {t.floor ?? "—"}{t.roomType ? ` · ${t.roomType}` : ""}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar name={t.assignee ?? "?"} size={26} />
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate">{t.assignee ?? "—"}</p>
                            {t.employeeCode && <p className="text-[10px] text-brand font-semibold tabular">ID {t.employeeCode}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs">{t.type}</p>
                        {String(t.priority).toLowerCase() === "urgent" && <Badge tone="danger">urgent</Badge>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={sm.tone}>{sm.label}</Badge>
                        {oc && <div className="mt-1"><Badge tone={oc.tone}>{oc.label}</Badge></div>}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground tabular">{fmtTime(t.assignedAt)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground tabular">{fmtTime(t.startedAt)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground tabular">{fmtTime(t.completedAt)}</td>
                      <td className="px-4 py-3 text-xs font-medium tabular">{t.status === "completed" ? fmtDur(t.totalMinutes ?? t.durationMin) : "—"}</td>
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

      {detail && <DetailModal task={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

function TaskCard({ task, onOpen }: { task: HKTask; onOpen: () => void }) {
  const oc = outcomeMeta(task.outcome);
  const sm = statusMeta(task.status);
  const urgent = String(task.priority).toLowerCase() === "urgent";
  return (
    <Card className={cn("p-4 cursor-pointer hover:shadow-md transition-all", urgent && "border-l-4 border-l-danger")} onClick={onOpen}>
      <div className="flex items-start gap-3">
        <div className="h-14 w-14 rounded-md bg-brand-soft text-brand-soft-foreground flex flex-col items-center justify-center shrink-0">
          <span className="text-[9px] font-bold tracking-wider">ROOM</span>
          <span className="text-lg font-bold tabular leading-none">{task.room}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{task.type}</p>
          <p className="text-[11px] text-muted-foreground">Floor {task.floor ?? "—"}{task.roomType ? ` · ${task.roomType}` : ""}</p>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <Badge tone={sm.tone}>{sm.label}</Badge>
            {oc && <Badge tone={oc.tone}>{oc.label}</Badge>}
            {urgent && <Badge tone="danger">urgent</Badge>}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
        <Avatar name={task.assignee ?? "?"} size={26} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium truncate">{task.assignee ?? "—"}</p>
          {task.employeeCode && <p className="text-[10px] text-brand font-semibold tabular">ID {task.employeeCode}</p>}
        </div>
        {task.status === "completed" && <span className="text-xs font-semibold text-success tabular">{fmtDur(task.totalMinutes ?? task.durationMin)}</span>}
      </div>

      <div className="grid grid-cols-3 gap-2 mt-3 text-[11px]">
        <div><p className="text-muted-foreground">Assigned</p><p className="tabular font-medium">{fmtTime(task.assignedAt)}</p></div>
        <div><p className="text-muted-foreground">Started</p><p className="tabular font-medium">{fmtTime(task.startedAt)}</p></div>
        <div><p className="text-muted-foreground">Completed</p><p className="tabular font-medium">{fmtTime(task.completedAt)}</p></div>
      </div>

      {(task.photosBefore.length > 0 || task.photosAfter.length > 0 || task.voiceUrl || (task.foundItems?.length ?? 0) > 0 || (task.maintenanceTickets?.length ?? 0) > 0) && (
        <div className="flex items-center gap-2 mt-3">
          {task.photosBefore[0] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={task.photosBefore[0]} alt="before" className="h-11 w-11 rounded object-cover border border-border" />
          )}
          {task.photosAfter[0] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={task.photosAfter[0]} alt="after" className="h-11 w-11 rounded object-cover border border-border" />
          )}
          {task.voiceUrl && <Mic className="h-4 w-4 text-brand" />}
          <div className="flex-1" />
          {(task.foundItems?.length ?? 0) > 0 && <span className="text-[11px] text-brand font-medium">🔍 {task.foundItems!.length}</span>}
          {(task.maintenanceTickets?.length ?? 0) > 0 && <span className="text-[11px] text-danger font-medium">⚠️ {task.maintenanceTickets!.length}</span>}
        </div>
      )}
    </Card>
  );
}

function DetailModal({ task, onClose }: { task: HKTask; onClose: () => void }) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  const oc = outcomeMeta(task.outcome);
  const sm = statusMeta(task.status);
  const [lb, setLb] = React.useState<{ photos: string[]; index: number } | null>(null);
  const openPhoto = (photos: string[], index: number) => setLb({ photos, index });

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <Card className="pointer-events-auto w-full max-w-2xl p-0 animate-in shadow-xl overflow-hidden max-h-[92vh] flex flex-col">
          <div className="px-5 py-4 bg-surface-elevated border-b border-border flex items-center gap-3">
            <span className="h-11 w-11 rounded-md bg-brand-soft text-brand-soft-foreground inline-flex items-center justify-center shrink-0 text-lg font-bold tabular">{task.room}</span>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold">Room {task.room} · {task.type}</h3>
              <p className="text-xs text-muted-foreground">
                Floor {task.floor ?? "—"}{task.roomType ? ` · ${task.roomType}` : ""}{task.guestName ? ` · Guest: ${task.guestName}` : ""}
              </p>
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
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 inline-flex items-center gap-1"><User className="h-3 w-3" />Employee</p>
                <div className="flex items-center gap-2">
                  <Avatar name={task.assignee ?? "?"} size={34} />
                  <div>
                    <p className="text-sm font-medium">{task.assignee ?? "—"}</p>
                    {task.employeeCode && <p className="text-xs text-brand font-semibold tabular">ID {task.employeeCode}</p>}
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">Assigned by {task.assignedBy ?? "—"}</p>
              </div>
              <div className="rounded-md border border-border p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" />Timeline</p>
                <TimeRow label="Assigned" value={fmtTime(task.assignedAt)} />
                <TimeRow label="Started" value={fmtTime(task.startedAt)} />
                <TimeRow label="Completed" value={fmtTime(task.completedAt)} />
                {task.status === "completed" && <TimeRow label="Duration" value={fmtDur(task.totalMinutes ?? task.durationMin)} highlight />}
              </div>
            </div>

            {/* before / after */}
            <div className="grid sm:grid-cols-2 gap-4">
              <PhotoBlock title="Before photos" photos={task.photosBefore} onPhoto={openPhoto} />
              <PhotoBlock title="After photos" photos={task.photosAfter} onPhoto={openPhoto} />
            </div>

            {/* voice */}
            {task.voiceUrl && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 inline-flex items-center gap-1"><Mic className="h-3 w-3" />Voice message</p>
                <audio controls src={task.voiceUrl} className="w-full" />
              </div>
            )}

            {/* notes */}
            {task.notes?.trim() && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Notes</p>
                <p className="text-sm whitespace-pre-wrap rounded-md border border-border p-3">{task.notes}</p>
              </div>
            )}

            {/* reports raised during this cleaning → Lost & Found / Maintenance */}
            {((task.foundItems?.length ?? 0) > 0 || (task.maintenanceTickets?.length ?? 0) > 0) && (
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Reported during cleaning</p>
                {task.foundItems?.map(r => <ReportCard key={`f-${r.id}`} report={r} kind="found" onPhoto={openPhoto} />)}
                {task.maintenanceTickets?.map(r => <ReportCard key={`m-${r.id}`} report={r} kind="damage" onPhoto={openPhoto} />)}
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

function ReportCard({ report, kind, onPhoto }: { report: Report; kind: "found" | "damage"; onPhoto: (photos: string[], index: number) => void }) {
  const found = kind === "found";
  return (
    <div className={cn("rounded-md border p-3", found ? "border-brand/30 bg-brand-soft/10" : "border-danger/30 bg-danger-soft/10")}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold inline-flex items-center gap-1.5">
          <span>{found ? "🔍" : "⚠️"}</span>
          {found ? "Lost & Found" : "Maintenance"} · {report.name ?? report.title}
        </p>
        {report.status && <Badge tone={found ? "info" : "warning"}>{report.status}</Badge>}
      </div>
      {report.reportedAt ? (
        <p className="text-[11px] text-muted-foreground mt-0.5 inline-flex items-center gap-1"><Clock className="h-3 w-3" />{report.reportedAt}</p>
      ) : null}
      {report.description ? <p className="text-xs text-muted-foreground mt-1">{report.description}</p> : null}
      {(report.photos?.length ?? 0) > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {report.photos!.map((u, i) => (
            <button key={i} type="button" onClick={() => onPhoto(report.photos!, i)} className="block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt="report" className="h-16 w-16 rounded-md object-cover border border-border hover:opacity-90 hover:ring-2 hover:ring-brand transition-all" />
            </button>
          ))}
        </div>
      )}
      {report.voiceUrl ? <audio controls src={report.voiceUrl} className="w-full mt-2" /> : null}
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
