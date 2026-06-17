"use client";
import * as React from "react";
import { Card } from "@/components/ui/card";
import { Sparkles, Timer, CheckCircle2, Users, RefreshCw } from "lucide-react";
import { apiGet } from "@/lib/api";

type Task = {
  id: number; room?: string; roomType?: string; assignee?: string; status?: string;
  assignedAt?: string; startedAt?: string; completedAt?: string; durationMin?: number;
};

export default function HkReportPage() {
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    try { setTasks(await apiGet<Task[]>("/housekeeping-tasks")); } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);
  React.useEffect(() => { load(); }, [load]);

  const sameDay = (iso?: string) => (iso ? new Date(iso).toDateString() === new Date().toDateString() : false);
  const doneToday = tasks.filter((t) => t.status === "done" && sameDay(t.completedAt));

  const byStaff = new Map<string, { assigned: number; inprog: number; done: number; mins: number }>();
  tasks.forEach((t) => {
    const k = t.assignee || "—";
    const g = byStaff.get(k) || { assigned: 0, inprog: 0, done: 0, mins: 0 };
    if (t.status === "assigned") g.assigned++;
    else if (t.status === "accepted") g.inprog++;
    else if (t.status === "done" && sameDay(t.completedAt)) { g.done++; g.mins += t.durationMin || 0; }
    byStaff.set(k, g);
  });
  const rows = [...byStaff.entries()]
    .map(([name, g]) => ({ name, ...g, avg: g.done ? Math.round(g.mins / g.done) : 0 }))
    .filter((r) => r.assigned || r.inprog || r.done)
    .sort((a, b) => b.done - a.done);

  const totalDone = doneToday.length;
  const totalMin = doneToday.reduce((s, t) => s + (t.durationMin || 0), 0);
  const avgMin = totalDone ? Math.round(totalMin / totalDone) : 0;

  const kpis = [
    { label: "Rooms cleaned today", value: String(totalDone), icon: CheckCircle2, tint: "text-emerald-600 bg-emerald-50" },
    { label: "Avg minutes / room", value: `${avgMin}m`, icon: Timer, tint: "text-amber-600 bg-amber-50" },
    { label: "Total cleaning time", value: `${totalMin}m`, icon: Sparkles, tint: "text-violet-600 bg-violet-50" },
    { label: "Active housekeepers", value: String(rows.length), icon: Users, tint: "text-blue-600 bg-blue-50" },
  ];

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Housekeeping Productivity</h1>
          <p className="text-sm text-muted-foreground">Rooms cleaned today and time taken per housekeeper</p>
        </div>
        <button onClick={load} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="p-4">
            <span className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg ${k.tint}`}>
              <k.icon className="h-4.5 w-4.5" />
            </span>
            <div className="text-2xl font-semibold tracking-tight">{k.value}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{k.label}</div>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden p-0">
        <div className="border-b px-5 py-3.5 text-sm font-semibold">Per-housekeeper · today</div>
        {loading ? (
          <div className="px-5 py-10 text-center text-sm text-muted-foreground">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-muted-foreground">No housekeeping tasks yet. Assign rooms from the mobile app.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-2.5 font-medium">Housekeeper</th>
                  <th className="px-3 py-2.5 text-center font-medium">Assigned</th>
                  <th className="px-3 py-2.5 text-center font-medium">In progress</th>
                  <th className="px-3 py-2.5 text-center font-medium">Done today</th>
                  <th className="px-3 py-2.5 text-center font-medium">Avg min</th>
                  <th className="px-5 py-2.5 text-right font-medium">Total min</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.name} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="px-5 py-3 font-medium">{r.name}</td>
                    <td className="px-3 py-3 text-center">{r.assigned || "—"}</td>
                    <td className="px-3 py-3 text-center">
                      {r.inprog ? <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-600">{r.inprog}</span> : "—"}
                    </td>
                    <td className="px-3 py-3 text-center font-semibold text-emerald-600">{r.done || "—"}</td>
                    <td className="px-3 py-3 text-center">{r.done ? `${r.avg}m` : "—"}</td>
                    <td className="px-5 py-3 text-right font-semibold">{r.done ? `${r.mins}m` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
