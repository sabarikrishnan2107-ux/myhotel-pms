"use client";
import * as React from "react";
import { Card } from "@/components/ui/card";
import { KPICard } from "@/components/ui/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Sparkles, Timer, CheckCircle2, Users, RefreshCw, Loader2, ClipboardList, BedDouble, Trophy } from "lucide-react";
import { apiGet } from "@/lib/api";

type Task = {
  id: number; room?: string; roomType?: string; type?: string; assignee?: string; status?: string;
  priority?: string; assignedAt?: string; startedAt?: string; completedAt?: string;
  durationMin?: number; notes?: string;
};

type Range = "today" | "week";

// Render minutes as "Xh Ym" once past an hour, else "Ym".
const fmtMins = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`);

export default function HkReportPage() {
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [range, setRange] = React.useState<Range>("today");

  const load = React.useCallback(async () => {
    setLoading(true);
    try { setTasks(await apiGet<Task[]>("/housekeeping-tasks")); } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);
  React.useEffect(() => { load(); }, [load]);

  // A completed task counts toward the time-based metrics when it falls in the
  // selected window. "today" = same calendar day; "week" = the last 7 days.
  const inRange = React.useCallback((iso?: string) => {
    if (!iso) return false;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return false;
    if (range === "today") return d.toDateString() === new Date().toDateString();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return d >= sevenDaysAgo;
  }, [range]);

  const doneInRange = tasks.filter(t => t.status === "done" && inRange(t.completedAt));

  // Per-housekeeper rollup. Assigned / in-progress are current snapshots (live
  // state, not historical); done + minutes are scoped to the selected range.
  const byStaff = new Map<string, { assigned: number; inprog: number; done: number; mins: number }>();
  tasks.forEach((t) => {
    const k = t.assignee || "—";
    const g = byStaff.get(k) || { assigned: 0, inprog: 0, done: 0, mins: 0 };
    if (t.status === "assigned") g.assigned++;
    else if (t.status === "accepted") g.inprog++;
    else if (t.status === "done" && inRange(t.completedAt)) { g.done++; g.mins += t.durationMin || 0; }
    byStaff.set(k, g);
  });
  const rows = [...byStaff.entries()]
    .map(([name, g]) => ({ name, ...g, avg: g.done ? Math.round(g.mins / g.done) : 0 }))
    .filter((r) => r.assigned || r.inprog || r.done)
    .sort((a, b) => b.done - a.done || b.mins - a.mins);

  const totalDone = doneInRange.length;
  const totalMin = doneInRange.reduce((s, t) => s + (t.durationMin || 0), 0);
  const avgMin = totalDone ? Math.round(totalMin / totalDone) : 0;
  const inProgressNow = tasks.filter(t => t.status === "accepted").length;
  const pendingAssigned = tasks.filter(t => t.status === "assigned").length;
  const topDone = rows.reduce((m, r) => Math.max(m, r.done), 0);

  const rangeLabel = range === "today" ? "today" : "last 7 days";

  return (
    <div className="space-y-5 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-medium tracking-tight">Housekeeping Productivity</h1>
          <p className="mt-1 text-sm text-muted-foreground">Rooms cleaned and time taken per housekeeper</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Range toggle */}
          <div className="inline-flex h-9 overflow-hidden rounded-md border border-border">
            {(["today", "week"] as const).map(r => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={cn(
                  "h-full px-3 text-xs font-medium transition-colors",
                  r === "week" && "border-l border-border",
                  range === r ? "bg-brand text-brand-foreground" : "text-muted-foreground hover:bg-surface-sunken",
                )}
              >
                {r === "today" ? "Today" : "This week"}
              </button>
            ))}
          </div>
          <button
            onClick={load}
            className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-surface-sunken"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} /> Refresh
          </button>
        </div>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <KPICard label="Rooms cleaned" value={totalDone} hint={rangeLabel} icon={CheckCircle2} accent="success" />
        <KPICard label="Avg min / room" value={`${avgMin}m`} hint={rangeLabel} icon={Timer} accent="warning" />
        <KPICard label="Total cleaning" value={fmtMins(totalMin)} hint={rangeLabel} icon={Sparkles} accent="accent" />
        <KPICard label="Active staff" value={rows.length} hint="with activity" icon={Users} accent="brand" />
        <KPICard label="In progress" value={inProgressNow} hint="right now" icon={Loader2} accent="info" />
        <KPICard label="Pending" value={pendingAssigned} hint="assigned, not started" icon={ClipboardList} accent="neutral" />
      </div>

      {/* Leaderboard */}
      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <div className="inline-flex items-center gap-2 text-sm font-semibold">
            <Trophy className="h-4 w-4 text-accent" />
            Per-housekeeper · {range === "today" ? "today" : "this week"}
          </div>
          {rows.length > 0 && (
            <Badge tone="neutral">{rows.length} active</Badge>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 px-5 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center px-5 py-14 text-center">
            <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-surface-sunken text-muted-foreground">
              <BedDouble className="h-6 w-6" />
            </span>
            <p className="font-medium">No housekeeping activity yet</p>
            <p className="mt-1 text-xs text-muted-foreground">Assign rooms from the Housekeeping board — productivity will appear here as staff start and complete cleans.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {rows.map((r, i) => (
              <div key={r.name} className={cn("flex items-center gap-4 px-5 py-4", i === 0 && r.done > 0 && "bg-accent-soft/30")}>
                {/* Rank */}
                <span className={cn(
                  "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular",
                  i === 0 && r.done > 0 ? "bg-accent text-white" : "bg-surface-sunken text-muted-foreground",
                )}>
                  {i + 1}
                </span>

                {/* Identity */}
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar name={r.name} size={40} />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{r.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {r.inprog > 0 && <Badge tone="info"><Loader2 className="h-3 w-3" />{r.inprog} cleaning</Badge>}
                      {r.assigned > 0 && <Badge tone="neutral">{r.assigned} assigned</Badge>}
                      {r.done === 0 && r.inprog === 0 && r.assigned === 0 && <span className="text-xs text-muted-foreground">Idle</span>}
                    </div>
                  </div>
                </div>

                {/* Progress vs top performer */}
                <div className="hidden flex-1 sm:block">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Rooms done</span>
                    <span className="tabular">{r.done}</span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-surface-sunken">
                    <div
                      className={cn("h-full rounded-full transition-all", i === 0 && r.done > 0 ? "bg-accent" : "bg-success")}
                      style={{ width: `${topDone > 0 ? (r.done / topDone) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                {/* Numbers */}
                <div className="flex shrink-0 items-center gap-5 text-right">
                  <div className="sm:hidden">
                    <p className="text-lg font-semibold tabular text-success">{r.done}</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">done</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold tabular">{r.done ? `${r.avg}m` : "—"}</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">avg/room</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold tabular">{r.done ? fmtMins(r.mins) : "—"}</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">total</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
