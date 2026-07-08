"use client";
import * as React from "react";
import { Card } from "@/components/ui/card";
import { KPICard } from "@/components/ui/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Sparkles, CheckCircle2, Timer, Clock, Users, ClipboardList, Loader2, Trophy } from "lucide-react";
import { apiGet } from "@/lib/api";

// One task from GET /housekeeping/report.
type Task = {
  id: number; room?: string; assignee?: string; employeeCode?: string | null; status?: string;
  assignedAt?: string | null; startedAt?: string | null; completedAt?: string | null;
  durationMin?: number; totalMinutes?: number; outcome?: string | null; type?: string;
};

const fmtMins = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m` : `${m}m`);
const dateOf = (t: Task) => { const s = t.completedAt || t.assignedAt; return s ? String(s).slice(0, 10) : ""; };
const todayStr = () => new Date().toISOString().slice(0, 10);

export default function HkReportPage() {
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [from, setFrom] = React.useState(todayStr());
  const [to, setTo] = React.useState(todayStr());

  const load = React.useCallback(async () => {
    setLoading(true);
    try { setTasks(await apiGet<Task[]>("/housekeeping/report")); } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);
  React.useEffect(() => { load(); }, [load]);

  const preset = (days: number) => {
    const t = new Date(); const f = new Date(); f.setDate(f.getDate() - days + 1);
    setFrom(f.toISOString().slice(0, 10)); setTo(t.toISOString().slice(0, 10));
  };
  const activePreset = from === todayStr() && to === todayStr() ? "today" : "";

  const filtered = React.useMemo(() => tasks.filter(t => {
    const d = dateOf(t); if (!d) return false;
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  }), [tasks, from, to]);

  const completed = filtered.filter(t => t.status === "completed");
  const inProgress = filtered.filter(t => t.status === "in_progress");
  const pending = filtered.filter(t => t.status === "assigned");
  const total = filtered.length;
  const pct = total ? Math.round((completed.length / total) * 100) : 0;
  const totalMin = completed.reduce((s, t) => s + (t.totalMinutes ?? t.durationMin ?? 0), 0);
  const avgMin = completed.length ? Math.round(totalMin / completed.length) : 0;
  const seg = (n: number) => (total ? `${(n / total) * 100}%` : "0%");

  // Per-employee rollup — who did what.
  const byEmp = new Map<string, { name: string; code?: string | null; done: number; prog: number; pend: number; min: number }>();
  filtered.forEach(t => {
    const name = t.assignee || "—";
    const g = byEmp.get(name) || { name, code: t.employeeCode, done: 0, prog: 0, pend: 0, min: 0 };
    if (!g.code && t.employeeCode) g.code = t.employeeCode;
    if (t.status === "completed") { g.done++; g.min += t.totalMinutes ?? t.durationMin ?? 0; }
    else if (t.status === "in_progress") g.prog++;
    else if (t.status === "assigned") g.pend++;
    byEmp.set(name, g);
  });
  const emps = [...byEmp.values()]
    .map(g => ({ ...g, avg: g.done ? Math.round(g.min / g.done) : 0, tot: g.done + g.prog + g.pend }))
    .filter(e => e.tot > 0)
    .sort((a, b) => b.done - a.done || b.min - a.min);
  const maxDone = emps.reduce((m, e) => Math.max(m, e.done), 0) || 1;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-medium tracking-tight inline-flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-brand" />Housekeeping Progress
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Daily task completion &amp; per-employee performance</p>
        </div>
        <Button variant="outline" onClick={load}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Refresh</Button>
      </div>

      {/* Date filter */}
      <Card className="p-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label className="text-[11px]">From</Label>
            <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="h-9 w-auto" />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">To</Label>
            <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="h-9 w-auto" />
          </div>
          <div className="flex gap-1.5">
            <button type="button" onClick={() => { setFrom(todayStr()); setTo(todayStr()); }} className={cn("h-9 px-3 rounded-md border text-xs font-medium transition-colors", activePreset === "today" ? "bg-brand text-brand-foreground border-brand" : "border-border hover:bg-surface-sunken text-muted-foreground")}>Today</button>
            <button type="button" onClick={() => preset(7)} className="h-9 px-3 rounded-md border border-border hover:bg-surface-sunken text-xs font-medium text-muted-foreground">Last 7 days</button>
            <button type="button" onClick={() => preset(30)} className="h-9 px-3 rounded-md border border-border hover:bg-surface-sunken text-xs font-medium text-muted-foreground">Last 30 days</button>
          </div>
          <div className="flex-1" />
          <p className="text-xs text-muted-foreground tabular">{total} task{total === 1 ? "" : "s"} in range</p>
        </div>
      </Card>

      {/* Progress hero */}
      <Card className="p-5">
        <div className="flex items-end justify-between mb-3 gap-4 flex-wrap">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-subtle-foreground font-bold">Rooms cleaned</p>
            <p className="text-4xl font-display font-medium mt-1 tabular">
              {completed.length} <span className="text-muted-foreground text-2xl">of {total}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-4xl font-bold tabular text-success">{pct}%</p>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">complete</p>
          </div>
        </div>
        {/* stacked progress bar */}
        <div className="h-5 rounded-full overflow-hidden flex gap-[2px] bg-surface-sunken">
          {completed.length > 0 && <div className="bg-success h-full" style={{ width: seg(completed.length) }} title={`Completed ${completed.length}`} />}
          {inProgress.length > 0 && <div className="bg-info h-full" style={{ width: seg(inProgress.length) }} title={`In progress ${inProgress.length}`} />}
          {pending.length > 0 && <div className="bg-warning h-full" style={{ width: seg(pending.length) }} title={`Pending ${pending.length}`} />}
        </div>
        <div className="flex flex-wrap gap-4 mt-3 text-xs">
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-success" />Completed <b className="tabular">{completed.length}</b></span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-info" />In progress <b className="tabular">{inProgress.length}</b></span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-warning" />Pending <b className="tabular">{pending.length}</b></span>
        </div>
      </Card>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <KPICard label="Completed" value={completed.length} icon={CheckCircle2} accent="success" hint={`of ${total} tasks`} />
        <KPICard label="In progress" value={inProgress.length} icon={Loader2} accent="info" />
        <KPICard label="Pending" value={pending.length} icon={ClipboardList} accent="warning" />
        <KPICard label="Avg. clean time" value={fmtMins(avgMin)} icon={Timer} accent="brand" hint="per room" />
        <KPICard label="Total time" value={fmtMins(totalMin)} icon={Clock} accent="accent" hint="all completed" />
      </div>

      {/* Per-employee performance */}
      <Card className="p-0 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <div className="inline-flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold">Who did what</h2>
          </div>
          <p className="text-xs text-muted-foreground">{emps.length} employee{emps.length === 1 ? "" : "s"} · sorted by rooms done</p>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-muted-foreground">Loading…</div>
        ) : emps.length === 0 ? (
          <div className="p-12 text-center">
            <ClipboardList className="h-8 w-8 mx-auto text-subtle-foreground mb-2" />
            <p className="font-medium">No tasks in this date range</p>
            <p className="text-xs text-muted-foreground mt-1">Adjust the dates above.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {emps.map((e, i) => (
              <div key={e.name} className="flex items-center gap-3 px-5 py-3">
                <div className="w-5 text-center text-xs font-bold text-muted-foreground tabular">
                  {i === 0 ? <Trophy className="h-4 w-4 text-brand inline" /> : i + 1}
                </div>
                <Avatar name={e.name} size={34} />
                <div className="w-32 sm:w-40 min-w-0">
                  <p className="text-sm font-medium truncate">{e.name}</p>
                  {e.code ? <p className="text-[11px] text-brand font-semibold tabular">ID {e.code}</p> : null}
                </div>
                {/* completed bar (single hue = magnitude) */}
                <div className="flex-1 min-w-[80px]">
                  <div className="h-6 rounded-md bg-surface-sunken overflow-hidden" title={`${e.done} rooms cleaned`}>
                    <div className="h-full bg-brand rounded-md flex items-center justify-end pr-2 min-w-[22px] transition-all"
                      style={{ width: `${Math.max(8, (e.done / maxDone) * 100)}%` }}>
                      <span className="text-[11px] font-bold text-brand-foreground tabular">{e.done}</span>
                    </div>
                  </div>
                  <div className="flex gap-1.5 mt-1">
                    {e.prog > 0 && <Badge tone="info">{e.prog} in progress</Badge>}
                    {e.pend > 0 && <Badge tone="warning">{e.pend} pending</Badge>}
                  </div>
                </div>
                <div className="w-20 text-right shrink-0">
                  <p className="text-sm font-semibold tabular">{fmtMins(e.min)}</p>
                  <p className="text-[10px] text-muted-foreground">{e.done ? `~${fmtMins(e.avg)}/room` : "—"}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
