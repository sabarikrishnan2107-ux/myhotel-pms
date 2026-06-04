"use client";
import * as React from "react";
import {
  Sparkles, ClipboardCheck, Wrench, AlertCircle, MoreVertical,
  Search, Filter, CheckCircle2, Clock, BedDouble, Bot, Users,
  Bath, Shirt, Archive, Plus, X, ChevronRight, LayoutGrid, List as ListIcon,
  ChevronUp, ChevronDown, ArrowUpDown, MapPin,
  Edit, Trash2, MessageCircle, Send, Mail, ArrowRight,
} from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { KPICard } from "@/components/ui/kpi-card";
import { AIInsight } from "@/components/ui/ai-insight";
import { ROOMS } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { apiGet, apiPut } from "@/lib/api";
import type { Room } from "@/lib/types";

type HKStatus = "dirty" | "cleaning" | "inspected" | "ready" | "maintenance";
const HK_TONES: Record<HKStatus, "warning" | "info" | "accent" | "success" | "danger"> = {
  dirty: "warning",
  cleaning: "info",
  inspected: "accent",
  ready: "success",
  maintenance: "danger",
};

const HOUSEKEEPERS = [
  { id: "h1", name: "Maria Lopez", todayRooms: 6, avgTime: 28, status: "Active" as const },
  { id: "h2", name: "Aisha Mohamed", todayRooms: 5, avgTime: 32, status: "Active" as const },
  { id: "h3", name: "Sunil Verma (Sup.)", todayRooms: 0, avgTime: 0, status: "Inspecting" as const },
  { id: "h4", name: "Joseph D'Souza", todayRooms: 4, avgTime: 26, status: "On break" as const },
];

// Build a richer task list
const TASKS = ROOMS.slice(0, 24).map((r, i) => {
  const status: HKStatus = i % 9 < 2 ? "dirty" : i % 9 < 4 ? "cleaning" : i % 9 < 5 ? "inspected" : i % 9 < 7 ? "ready" : "maintenance";
  return {
    id: `tk${i}`,
    room: r.number,
    floor: r.floor,
    type: r.type,
    status,
    assignee: status === "cleaning" || status === "inspected" ? HOUSEKEEPERS[i % 3].name : null,
    startedAt: status === "cleaning" ? "13:42" : status === "inspected" ? "13:15" : null,
    eta: status === "cleaning" ? `${15 + (i % 20)} min` : null,
    aiPredicted: 25 + (i % 30), // AI predicted cleaning minutes
    priority: i % 11 === 0 ? "high" : i % 5 === 0 ? "medium" : "low",
  };
});

const TABS = [
  { id: "board", label: "Status Board", icon: BedDouble },
  { id: "tasks", label: "Tasks", icon: ClipboardCheck },
  { id: "inspection", label: "Inspection", icon: CheckCircle2 },
  { id: "linen", label: "Linen", icon: Shirt },
  { id: "lost", label: "Lost & Found", icon: Archive },
] as const;
type TabId = typeof TABS[number]["id"];

const LANES: { id: HKStatus; label: string; icon: typeof Sparkles }[] = [
  { id: "dirty", label: "Dirty", icon: AlertCircle },
  { id: "cleaning", label: "Cleaning", icon: Sparkles },
  { id: "inspected", label: "Inspected", icon: ClipboardCheck },
  { id: "ready", label: "Ready", icon: CheckCircle2 },
  { id: "maintenance", label: "Maintenance", icon: Wrench },
];

const LOST_ITEMS = [
  { id: "l1", item: "Apple AirPods Pro (white case)", room: "412", found: "2 days ago", contact: "Not yet" },
  { id: "l2", item: "Black leather wallet", room: "208", found: "Yesterday", contact: "Owner notified · pickup pending" },
  { id: "l3", item: "Gold ring with red stone", room: "601", found: "1 hr ago", contact: "—" },
  { id: "l4", item: "Children's plush toy (giraffe)", room: "305", found: "Yesterday", contact: "Owner notified" },
];

const LINEN_USAGE = [
  { item: "Bath towels — Large", issued: 142, returned: 138, wastage: 2, inUse: 2 },
  { item: "Bath towels — Hand", issued: 86, returned: 82, wastage: 1, inUse: 3 },
  { item: "Bed sheets — King", issued: 54, returned: 52, wastage: 0, inUse: 2 },
  { item: "Pillow covers", issued: 108, returned: 105, wastage: 1, inUse: 2 },
  { item: "Bath mats", issued: 48, returned: 46, wastage: 0, inUse: 2 },
];

const STATUS_RANK: Record<HKStatus, number> = { dirty: 0, cleaning: 1, inspected: 2, ready: 3, maintenance: 4 };
const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

type BoardSortKey = "room" | "floor" | "type" | "status" | "assignee" | "priority" | "aiPredicted";
type SortDir = "asc" | "desc";

export default function HousekeepingPage() {
  const [tab, setTab] = React.useState<TabId>("board");
  const [boardView, setBoardView] = React.useState<"kanban" | "list">("kanban");
  const [boardSearch, setBoardSearch] = React.useState("");
  const [boardStatus, setBoardStatus] = React.useState<"all" | HKStatus>("all");
  const [boardFloor, setBoardFloor] = React.useState<"all" | string>("all");
  const [boardSortKey, setBoardSortKey] = React.useState<BoardSortKey>("room");
  const [boardSortDir, setBoardSortDir] = React.useState<SortDir>("asc");
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"all" | HKStatus>("all");
  const [assignModal, setAssignModal] = React.useState<{ taskId: string; room: string } | null>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const [taskMenuFor, setTaskMenuFor] = React.useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [logItemOpen, setLogItemOpen] = React.useState(false);
  const [manageLost, setManageLost] = React.useState<typeof LOST_ITEMS[number] | null>(null);
  const [inspectionItems, setInspectionItems] = React.useState<Set<number>>(new Set(Array.from({ length: 12 }, (_, i) => i)));

  // Build the housekeeping board from the real room board (live hk status).
  const [tasks, setTasks] = React.useState(TASKS);
  React.useEffect(() => {
    let cancelled = false;
    apiGet<Room[]>("/room-board").then(board => {
      if (cancelled) return;
      setTasks(board.map((r, i) => ({
        id: `tk-${r.id}`,
        room: r.number,
        floor: r.floor,
        type: r.type,
        status: (r.status === "maintenance" ? "maintenance" : r.hkStatus === "clean" ? "ready" : r.hkStatus) as HKStatus,
        assignee: r.hkStatus === "cleaning" || r.hkStatus === "inspected" ? HOUSEKEEPERS[i % 3].name : null,
        startedAt: r.hkStatus === "cleaning" ? "13:42" : null,
        eta: r.hkStatus === "cleaning" ? `${15 + (i % 20)} min` : null,
        aiPredicted: 25 + (i % 30),
        priority: "low" as const,
      })));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Mark a room Ready (clean) — updates the board and persists hk status.
  const markReady = (t: { id: string; room: string }) => {
    const roomId = t.id.startsWith("tk-") ? t.id.slice(3) : null;
    setTasks(prev => prev.map(x => x.id === t.id ? { ...x, status: "ready" as HKStatus } : x));
    setTaskMenuFor(null);
    showToast(`Room ${t.room} marked Ready`);
    if (roomId) apiPut(`/rooms/${roomId}`, { hkStatus: "clean" }).catch(() => showToast("⚠ Save failed — backend offline"));
  };

  // Close per-row menus when clicking outside
  React.useEffect(() => {
    if (!taskMenuFor) return;
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest("[data-task-menu]")) setTaskMenuFor(null);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [taskMenuFor]);

  const onBoardSort = (k: BoardSortKey) => {
    if (k === boardSortKey) setBoardSortDir(d => (d === "asc" ? "desc" : "asc"));
    else { setBoardSortKey(k); setBoardSortDir("asc"); }
  };

  const boardFiltered = React.useMemo(() => {
    const needle = boardSearch.trim().toLowerCase();
    return tasks.filter(t => {
      if (needle && !`${t.room} ${t.assignee ?? ""} ${t.type}`.toLowerCase().includes(needle)) return false;
      if (boardStatus !== "all" && t.status !== boardStatus) return false;
      if (boardFloor !== "all" && String(t.floor) !== boardFloor) return false;
      return true;
    });
  }, [tasks, boardSearch, boardStatus, boardFloor]);

  const boardSorted = React.useMemo(() => {
    const dir = boardSortDir === "asc" ? 1 : -1;
    return [...boardFiltered].sort((a, b) => {
      let cmp = 0;
      if (boardSortKey === "status") cmp = STATUS_RANK[a.status] - STATUS_RANK[b.status];
      else if (boardSortKey === "priority") cmp = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      else if (boardSortKey === "floor") cmp = a.floor - b.floor;
      else if (boardSortKey === "aiPredicted") cmp = a.aiPredicted - b.aiPredicted;
      else if (boardSortKey === "assignee") cmp = (a.assignee ?? "~").localeCompare(b.assignee ?? "~");
      else cmp = String(a[boardSortKey] ?? "").localeCompare(String(b[boardSortKey] ?? ""));
      return cmp * dir;
    });
  }, [boardFiltered, boardSortKey, boardSortDir]);

  const floors = Array.from(new Set(tasks.map(t => t.floor))).sort((a, b) => a - b);

  const filtered = tasks.filter(t => {
    if (search && !`${t.room} ${t.assignee ?? ""}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    return true;
  });

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const counts = LANES.reduce<Record<HKStatus, number>>((acc, l) => {
    acc[l.id] = tasks.filter(t => t.status === l.id).length;
    return acc;
  }, { dirty: 0, cleaning: 0, inspected: 0, ready: 0, maintenance: 0 });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-medium tracking-tight">Housekeeping</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Room cleanliness · staff productivity · linen tracking · lost &amp; found
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant={filtersOpen ? "primary" : "outline"} onClick={() => setFiltersOpen(o => !o)}>
            <Filter className="h-4 w-4" />Filters
          </Button>
          <Button onClick={() => {
            // Pick first dirty task to assign
            const t = tasks.find(x => x.status === "dirty");
            if (t) setAssignModal({ taskId: t.id, room: t.room });
            else showToast("No dirty rooms to assign right now");
          }}>
            <Plus className="h-4 w-4" />Assign Task
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard label="Dirty" value={counts.dirty} icon={AlertCircle} accent="warning" />
        <KPICard label="Cleaning" value={counts.cleaning} icon={Sparkles} accent="info" />
        <KPICard label="Inspected" value={counts.inspected} icon={ClipboardCheck} accent="accent" />
        <KPICard label="Ready to Sell" value={counts.ready} icon={CheckCircle2} accent="success" />
        <KPICard label="Maintenance" value={counts.maintenance} icon={Wrench} accent="danger" />
        <KPICard label="Active Staff" value={HOUSEKEEPERS.filter(h => h.status === "Active").length} icon={Users} accent="brand" />
      </div>

      {/* AI Insight */}
      <AIInsight
        variant="panel"
        title="AI Housekeeping Insight"
        text={
          <>
            Based on past stays, <span className="font-semibold">5 of today&apos;s dirty rooms</span> should take under 25 min each (no F&amp;B service, single occupancy). Recommend assigning to <span className="font-semibold">Maria Lopez</span> (avg 28 min) and <span className="font-semibold">Joseph D&apos;Souza</span> (avg 26 min) — they can clear them by 16:30 in time for evening arrivals.
          </>
        }
        action={{ label: "Auto-assign tasks", onClick: () => showToast("AI auto-assigned 8 tasks") }}
      />

      {/* Tabs */}
      <div className="border-b border-border flex items-center gap-1 overflow-x-auto">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap inline-flex items-center gap-2",
                tab === t.id ? "border-brand text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* === STATUS BOARD === */}
      {tab === "board" && (
        <>
          {/* Filter bar + view toggle for the board */}
          <Card className="p-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle-foreground" />
                <Input value={boardSearch} onChange={e => setBoardSearch(e.target.value)} placeholder="Search room, type, or housekeeper…" className="pl-9 h-9" />
              </div>
              <Select value={boardStatus} onChange={e => setBoardStatus(e.target.value as "all" | HKStatus)} className="h-9 w-auto">
                <option value="all">All statuses</option>
                {LANES.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
              </Select>
              <Select value={boardFloor} onChange={e => setBoardFloor(e.target.value)} className="h-9 w-auto">
                <option value="all">All floors</option>
                {floors.map(f => <option key={f} value={String(f)}>Floor {f}</option>)}
              </Select>
              {(boardSearch || boardStatus !== "all" || boardFloor !== "all") && (
                <Button variant="ghost" size="sm" onClick={() => { setBoardSearch(""); setBoardStatus("all"); setBoardFloor("all"); }}>Clear</Button>
              )}

              <div className="flex-1" />

              {/* View toggle */}
              <div className="inline-flex rounded-md border border-border overflow-hidden h-9">
                <button
                  type="button"
                  onClick={() => setBoardView("kanban")}
                  className={cn(
                    "h-full px-3 inline-flex items-center gap-1.5 text-xs font-medium border-r border-border transition-colors",
                    boardView === "kanban" ? "bg-brand text-brand-foreground" : "hover:bg-surface-sunken text-muted-foreground"
                  )}
                  title="Status Board (Kanban)"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Board</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBoardView("list")}
                  className={cn(
                    "h-full px-3 inline-flex items-center gap-1.5 text-xs font-medium transition-colors",
                    boardView === "list" ? "bg-brand text-brand-foreground" : "hover:bg-surface-sunken text-muted-foreground"
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
            Showing <span className="font-medium text-foreground">{boardSorted.length}</span> of {tasks.length} rooms
          </div>

          {/* Empty */}
          {boardSorted.length === 0 && (
            <Card className="p-12 text-center">
              <Search className="h-8 w-8 mx-auto text-subtle-foreground" />
              <p className="mt-3 font-medium">No rooms match your filters</p>
              <p className="text-xs text-muted-foreground mt-1">Clear filters above to see all rooms.</p>
            </Card>
          )}

          {/* Kanban */}
          {boardSorted.length > 0 && boardView === "kanban" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              {LANES.map(lane => {
                const tasks = boardSorted.filter(t => t.status === lane.id);
                const LIcon = lane.icon;
                return (
                  <div key={lane.id}>
                    <div className="flex items-center justify-between mb-2 px-1">
                      <div className="flex items-center gap-1.5">
                        <LIcon className={cn("h-3.5 w-3.5",
                          lane.id === "dirty" && "text-warning",
                          lane.id === "cleaning" && "text-info",
                          lane.id === "inspected" && "text-accent",
                          lane.id === "ready" && "text-success",
                          lane.id === "maintenance" && "text-danger",
                        )} />
                        <h3 className="text-sm font-semibold">{lane.label}</h3>
                      </div>
                      <Badge tone={HK_TONES[lane.id]}>{tasks.length}</Badge>
                    </div>
                    <div className="space-y-2 min-h-[120px]">
                      {tasks.map(t => (
                        <Card key={t.id} className={cn(
                          "p-3 hover:shadow-md cursor-pointer transition-all border-l-4",
                          t.status === "dirty" && "border-l-status-dirty",
                          t.status === "cleaning" && "border-l-status-cleaning",
                          t.status === "inspected" && "border-l-status-inspected",
                          t.status === "ready" && "border-l-status-ready",
                          t.status === "maintenance" && "border-l-status-maintenance",
                        )}>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-base font-semibold tabular">{t.room}</p>
                              <p className="text-[10px] text-muted-foreground">{t.type} · Floor {t.floor}</p>
                            </div>
                            {t.priority === "high" && <Badge tone="danger">High</Badge>}
                          </div>
                          <div className="mt-2 pt-2 border-t border-border text-[11px] inline-flex items-center gap-1.5 text-muted-foreground">
                            <Bot className="h-3 w-3 text-brand" />
                            <span>AI: ~{t.aiPredicted} min</span>
                          </div>
                          {t.assignee ? (
                            <div className="mt-2 flex items-center gap-2">
                              <Avatar name={t.assignee} size={20} />
                              <p className="text-xs truncate">{t.assignee}</p>
                              {t.startedAt && <span className="ml-auto text-[10px] text-muted-foreground tabular">{t.startedAt}</span>}
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setAssignModal({ taskId: t.id, room: t.room })}
                              className="mt-2 text-xs text-brand hover:underline inline-flex items-center gap-1"
                            >
                              <Users className="h-3 w-3" />Assign
                            </button>
                          )}
                        </Card>
                      ))}
                      {tasks.length === 0 && (
                        <div className="rounded-md border border-dashed border-border h-20 flex items-center justify-center text-xs text-subtle-foreground">No rooms</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* List view */}
          {boardSorted.length > 0 && boardView === "list" && (
            <Card className="p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-surface-elevated border-b border-border">
                    <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <BoardTh label="Room" k="room" sortKey={boardSortKey} sortDir={boardSortDir} onSort={onBoardSort} />
                      <BoardTh label="Type" k="type" sortKey={boardSortKey} sortDir={boardSortDir} onSort={onBoardSort} />
                      <BoardTh label="Floor" k="floor" sortKey={boardSortKey} sortDir={boardSortDir} onSort={onBoardSort} icon={MapPin} />
                      <BoardTh label="Status" k="status" sortKey={boardSortKey} sortDir={boardSortDir} onSort={onBoardSort} />
                      <BoardTh label="Housekeeper" k="assignee" sortKey={boardSortKey} sortDir={boardSortDir} onSort={onBoardSort} />
                      <BoardTh label="Started" />
                      <BoardTh label="ETA" />
                      <BoardTh label="AI ETA" k="aiPredicted" sortKey={boardSortKey} sortDir={boardSortDir} onSort={onBoardSort} icon={Bot} />
                      <BoardTh label="Priority" k="priority" sortKey={boardSortKey} sortDir={boardSortDir} onSort={onBoardSort} />
                      <th className="px-4 py-3 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {boardSorted.map(t => (
                      <tr key={t.id} className="hover:bg-surface-sunken/40 group">
                        <td className="px-4 py-3 align-middle">
                          <span className={cn(
                            "inline-flex items-center gap-2 font-semibold tabular",
                            t.status === "dirty" && "before:content-[''] before:h-2 before:w-2 before:rounded-full before:bg-status-dirty",
                            t.status === "cleaning" && "before:content-[''] before:h-2 before:w-2 before:rounded-full before:bg-status-cleaning",
                            t.status === "inspected" && "before:content-[''] before:h-2 before:w-2 before:rounded-full before:bg-status-inspected",
                            t.status === "ready" && "before:content-[''] before:h-2 before:w-2 before:rounded-full before:bg-status-ready",
                            t.status === "maintenance" && "before:content-[''] before:h-2 before:w-2 before:rounded-full before:bg-status-maintenance",
                          )}>
                            {t.room}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{t.type}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground tabular">Floor {t.floor}</td>
                        <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                        <td className="px-4 py-3">
                          {t.assignee ? (
                            <div className="inline-flex items-center gap-2">
                              <Avatar name={t.assignee} size={22} />
                              <span className="text-xs">{t.assignee}</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setAssignModal({ taskId: t.id, room: t.room })}
                              className="text-xs text-brand hover:underline inline-flex items-center gap-1"
                            >
                              <Users className="h-3 w-3" />Assign
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground tabular">{t.startedAt ?? "—"}</td>
                        <td className="px-4 py-3 text-xs tabular">{t.eta ?? "—"}</td>
                        <td className="px-4 py-3"><Badge tone="brand"><Bot className="h-3 w-3" />{t.aiPredicted}m</Badge></td>
                        <td className="px-4 py-3">
                          <Badge tone={t.priority === "high" ? "danger" : t.priority === "medium" ? "warning" : "neutral"}>{t.priority}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right relative" data-task-menu>
                          <TaskRowActions
                            taskId={t.id}
                            room={t.room}
                            isOpen={taskMenuFor === t.id}
                            onToggle={() => setTaskMenuFor(taskMenuFor === t.id ? null : t.id)}
                            onAssign={() => { setAssignModal({ taskId: t.id, room: t.room }); setTaskMenuFor(null); }}
                            onMessage={() => { showToast(`WhatsApp sent to ${t.assignee ?? "unassigned"}`); setTaskMenuFor(null); }}
                            onMarkReady={() => markReady(t)}
                            onReportIssue={() => { showToast(`Maintenance ticket created for Room ${t.room}`); setTaskMenuFor(null); }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {/* === TASKS === */}
      {tab === "tasks" && (
        <>
          <Card className="p-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle-foreground" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by room or housekeeper…" className="pl-9 h-9" />
              </div>
              <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value as "all" | HKStatus)} className="h-9 w-auto">
                <option value="all">All statuses</option>
                {LANES.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
              </Select>
            </div>
          </Card>

          <Card className="p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface-elevated border-b border-border">
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 font-semibold">Room</th>
                  <th className="px-4 py-3 font-semibold">Type · Floor</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Assignee</th>
                  <th className="px-4 py-3 font-semibold">Started</th>
                  <th className="px-4 py-3 font-semibold">ETA</th>
                  <th className="px-4 py-3 font-semibold">AI Predicted</th>
                  <th className="px-4 py-3 font-semibold">Priority</th>
                  <th></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(t => (
                  <tr key={t.id} className="hover:bg-surface-sunken/40">
                    <td className="px-4 py-3 font-semibold tabular">{t.room}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{t.type} · F{t.floor}</td>
                    <td className="px-4 py-3"><StatusBadge status={t.status === "dirty" ? "dirty" : t.status === "cleaning" ? "cleaning" : t.status === "inspected" ? "inspected" : t.status === "ready" ? "ready" : "maintenance"} /></td>
                    <td className="px-4 py-3">
                      {t.assignee ? (
                        <div className="flex items-center gap-2">
                          <Avatar name={t.assignee} size={24} />
                          <span className="text-xs">{t.assignee}</span>
                        </div>
                      ) : (
                        <button type="button" onClick={() => setAssignModal({ taskId: t.id, room: t.room })} className="text-xs text-brand hover:underline">Assign</button>
                      )}
                    </td>
                    <td className="px-4 py-3 tabular text-xs text-muted-foreground">{t.startedAt ?? "—"}</td>
                    <td className="px-4 py-3 tabular text-xs">{t.eta ?? "—"}</td>
                    <td className="px-4 py-3"><Badge tone="brand"><Bot className="h-3 w-3" />{t.aiPredicted}m</Badge></td>
                    <td className="px-4 py-3"><Badge tone={t.priority === "high" ? "danger" : t.priority === "medium" ? "warning" : "neutral"}>{t.priority}</Badge></td>
                    <td className="px-4 py-3 text-right relative" data-task-menu>
                      <TaskRowActions
                        taskId={t.id}
                        room={t.room}
                        isOpen={taskMenuFor === t.id}
                        onToggle={() => setTaskMenuFor(taskMenuFor === t.id ? null : t.id)}
                        onAssign={() => { setAssignModal({ taskId: t.id, room: t.room }); setTaskMenuFor(null); }}
                        onMessage={() => { showToast(`WhatsApp sent to ${t.assignee ?? "unassigned"}`); setTaskMenuFor(null); }}
                        onMarkReady={() => markReady(t)}
                        onReportIssue={() => { showToast(`Maintenance ticket created for Room ${t.room}`); setTaskMenuFor(null); }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Housekeeper productivity */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Housekeeper Productivity — Today</CardTitle>
                <Button variant="ghost" size="sm">View report<ChevronRight className="h-3 w-3" /></Button>
              </div>
            </CardHeader>
            <div className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {HOUSEKEEPERS.map(h => (
                <div key={h.id} className="rounded-md border border-border p-4">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={h.name} size={36} />
                    <div>
                      <p className="font-medium text-sm">{h.name}</p>
                      <Badge tone={h.status === "Active" ? "success" : h.status === "Inspecting" ? "accent" : "neutral"}>{h.status}</Badge>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">Today</p>
                      <p className="text-base font-semibold tabular">{h.todayRooms} rooms</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Avg time</p>
                      <p className="text-base font-semibold tabular">{h.avgTime} min</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {/* === INSPECTION === */}
      {tab === "inspection" && (
        <>
          <AIInsight
            text={
              <>
                <span className="font-semibold">3 rooms</span> currently inspected and awaiting supervisor sign-off. Average inspection time today is <span className="font-semibold">4.2 min</span>.
              </>
            }
          />
          <Card>
            <CardHeader>
              <CardTitle>Inspection Checklist · Standard Room</CardTitle>
            </CardHeader>
            <div className="px-5 pb-5 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5">
              {[
                "Bed properly made · sheets crisp",
                "Bathroom — sink, shower, mirror clean",
                "Toilet sanitised · paper roll full",
                "Towels stocked (2 bath, 2 hand, 2 face)",
                "Wastebins emptied and lined",
                "Floor vacuumed / mopped",
                "Curtains aligned, no stains",
                "Glass surfaces streak-free",
                "TV remote tested, batteries OK",
                "Lights — all bulbs functional",
                "AC tested · default 22°C",
                "Minibar restocked",
                "Welcome amenities placed",
                "Kettle / glasses / tea bags",
                "DND tag, key card, info folder set",
                "No odours — fragrance refreshed",
              ].map((item, i) => (
                <label key={i} className="flex items-center gap-2 py-1.5 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inspectionItems.has(i)}
                    onChange={e => setInspectionItems(s => {
                      const next = new Set(s);
                      if (e.target.checked) next.add(i); else next.delete(i);
                      return next;
                    })}
                    className="h-4 w-4 rounded border-border text-brand focus:ring-ring"
                  />
                  <span>{item}</span>
                </label>
              ))}
            </div>
            <div className="px-5 pb-5 border-t border-border pt-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">{inspectionItems.size} of 16 items checked</p>
                <div className="h-1.5 w-32 bg-surface-sunken rounded-full overflow-hidden">
                  <div className={cn(
                    "h-full transition-all",
                    inspectionItems.size === 16 ? "bg-success" : inspectionItems.size >= 12 ? "bg-warning" : "bg-info"
                  )} style={{ width: `${(inspectionItems.size / 16) * 100}%` }} />
                </div>
              </div>
              <Button
                variant="success"
                disabled={inspectionItems.size < 16}
                onClick={() => {
                  showToast(`Room marked Inspected · ${inspectionItems.size}/16 items checked · status → Ready`);
                  setInspectionItems(new Set(Array.from({ length: 12 }, (_, i) => i)));
                }}
              >
                <CheckCircle2 className="h-4 w-4" />
                {inspectionItems.size < 16 ? `Mark Inspected (${inspectionItems.size}/16)` : "Mark Inspected"}
              </Button>
            </div>
          </Card>
        </>
      )}

      {/* === LINEN === */}
      {tab === "linen" && (
        <Card className="p-0 overflow-hidden">
          <CardHeader className="bg-surface-elevated">
            <div className="flex items-center justify-between">
              <CardTitle>Linen Usage — Today</CardTitle>
              <Badge tone="info"><Bath className="h-3 w-3" />5 categories tracked</Badge>
            </div>
          </CardHeader>
          <table className="w-full text-sm">
            <thead className="bg-surface-sunken/50 border-y border-border">
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-2.5 font-semibold">Item</th>
                <th className="px-5 py-2.5 font-semibold text-right">Issued</th>
                <th className="px-5 py-2.5 font-semibold text-right">Returned</th>
                <th className="px-5 py-2.5 font-semibold text-right">Wastage</th>
                <th className="px-5 py-2.5 font-semibold text-right">In Use</th>
                <th className="px-5 py-2.5 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {LINEN_USAGE.map(l => {
                const returnRate = (l.returned / l.issued) * 100;
                return (
                  <tr key={l.item} className="hover:bg-surface-sunken/40">
                    <td className="px-5 py-3 font-medium">{l.item}</td>
                    <td className="px-5 py-3 text-right tabular">{l.issued}</td>
                    <td className="px-5 py-3 text-right tabular">{l.returned}</td>
                    <td className="px-5 py-3 text-right tabular text-warning">{l.wastage}</td>
                    <td className="px-5 py-3 text-right tabular text-muted-foreground">{l.inUse}</td>
                    <td className="px-5 py-3">
                      <Badge tone={returnRate >= 98 ? "success" : returnRate >= 95 ? "warning" : "danger"}>
                        {returnRate.toFixed(1)}% return
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {/* === LOST & FOUND === */}
      {tab === "lost" && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{LOST_ITEMS.length} items currently logged · auto-archive after 90 days</p>
            <Button onClick={() => setLogItemOpen(true)}><Plus className="h-4 w-4" />Log Item</Button>
          </div>
          <Card className="p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface-elevated border-b border-border">
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3 font-semibold">Item</th>
                  <th className="px-5 py-3 font-semibold">Room</th>
                  <th className="px-5 py-3 font-semibold">Found</th>
                  <th className="px-5 py-3 font-semibold">Owner contact</th>
                  <th></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {LOST_ITEMS.map(l => (
                  <tr key={l.id} className="hover:bg-surface-sunken/40">
                    <td className="px-5 py-3 font-medium">{l.item}</td>
                    <td className="px-5 py-3 tabular">{l.room}</td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">{l.found}</td>
                    <td className="px-5 py-3 text-xs">{l.contact}</td>
                    <td className="px-5 py-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => setManageLost(l)}>Manage</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}

      {/* Assign modal */}
      {assignModal && (
        <AssignModal
          taskId={assignModal.taskId}
          room={assignModal.room}
          onClose={() => setAssignModal(null)}
          onAssign={(name) => { setAssignModal(null); showToast(`Room ${assignModal.room} assigned to ${name}`); }}
        />
      )}

      {/* Log lost item modal */}
      {logItemOpen && (
        <LogItemModal onClose={() => setLogItemOpen(false)} onSave={(item) => { setLogItemOpen(false); showToast(`Logged: ${item} · auto-archive in 90 days`); }} />
      )}

      {/* Manage lost item modal */}
      {manageLost && (
        <ManageLostModal item={manageLost} onClose={() => setManageLost(null)} onAction={(action) => { setManageLost(null); showToast(action); }} />
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

// ===================== TASK ROW ACTIONS DROPDOWN =====================
function TaskRowActions({
  taskId: _taskId, room, isOpen, onToggle, onAssign, onMessage, onMarkReady, onReportIssue,
}: {
  taskId: string;
  room: string;
  isOpen: boolean;
  onToggle: () => void;
  onAssign: () => void;
  onMessage: () => void;
  onMarkReady: () => void;
  onReportIssue: () => void;
}) {
  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "h-7 w-7 rounded-md border inline-flex items-center justify-center transition-colors",
          isOpen ? "bg-brand-soft border-brand text-brand-soft-foreground" : "border-border hover:bg-surface-sunken text-muted-foreground"
        )}
        title="More actions"
      >
        <MoreVertical className="h-3.5 w-3.5" />
      </button>
      {isOpen && (
        <div className="absolute right-0 top-full mt-1 z-30 w-56 rounded-md border border-border bg-surface shadow-lg py-1 animate-in slide-in-from-top-1 text-left">
          <button type="button" onClick={onAssign} className="w-full px-3 py-2 text-sm hover:bg-surface-sunken inline-flex items-center gap-2.5 text-left">
            <Edit className="h-3.5 w-3.5 text-muted-foreground" />Assign / Reassign
          </button>
          <button type="button" onClick={onMessage} className="w-full px-3 py-2 text-sm hover:bg-surface-sunken inline-flex items-center gap-2.5 text-left">
            <MessageCircle className="h-3.5 w-3.5 text-success" />Message housekeeper
          </button>
          <button type="button" onClick={onMarkReady} className="w-full px-3 py-2 text-sm hover:bg-surface-sunken inline-flex items-center gap-2.5 text-left">
            <CheckCircle2 className="h-3.5 w-3.5 text-success" />Mark Room {room} Ready
          </button>
          <div className="my-1 h-px bg-border" />
          <button type="button" onClick={onReportIssue} className="w-full px-3 py-2 text-sm hover:bg-warning-soft text-warning inline-flex items-center gap-2.5 text-left">
            <Wrench className="h-3.5 w-3.5" />Report room issue
          </button>
        </div>
      )}
    </>
  );
}

// ===================== LOG LOST ITEM MODAL =====================
function LogItemModal({ onClose, onSave }: { onClose: () => void; onSave: (item: string) => void }) {
  const [item, setItem] = React.useState("");
  const [room, setRoom] = React.useState("");
  const [where, setWhere] = React.useState("Bedside drawer");
  const [foundBy, setFoundBy] = React.useState("Maria Lopez");
  const [photoTaken, setPhotoTaken] = React.useState(false);
  const [contact, setContact] = React.useState<"None" | "Email" | "WhatsApp">("WhatsApp");

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  const valid = item.trim() !== "" && room.trim() !== "";

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <Card className="pointer-events-auto w-full max-w-md p-0 animate-in shadow-xl overflow-hidden">
          <div className="px-5 py-4 bg-surface-elevated border-b border-border flex items-center gap-3">
            <span className="h-10 w-10 rounded-md bg-brand-soft text-brand-soft-foreground inline-flex items-center justify-center shrink-0">
              <Archive className="h-5 w-5" />
            </span>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">Log lost &amp; found item</h3>
              <p className="text-xs text-muted-foreground">Auto-archive after 90 days · original guest auto-contacted if room is known</p>
            </div>
            <button type="button" onClick={onClose} className="h-8 w-8 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
          </div>

          <div className="px-5 py-4 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Item description *</Label>
              <Input value={item} onChange={e => setItem(e.target.value)} placeholder="e.g. Apple AirPods Pro (white case), Brown leather wallet…" className="h-9" autoFocus />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Room found in *</Label>
                <Input value={room} onChange={e => setRoom(e.target.value)} placeholder="e.g. 305" className="h-9 tabular" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Where in room?</Label>
                <Select value={where} onChange={e => setWhere(e.target.value)} className="h-9">
                  <option>Bedside drawer</option>
                  <option>Under bed</option>
                  <option>Bathroom counter</option>
                  <option>Safe (unlocked)</option>
                  <option>Wardrobe</option>
                  <option>Sofa cushions</option>
                  <option>Balcony / sit-out</option>
                  <option>Other</option>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Found by (housekeeper)</Label>
              <Select value={foundBy} onChange={e => setFoundBy(e.target.value)} className="h-9">
                <option>Maria Lopez</option>
                <option>Aisha Mohamed</option>
                <option>Joseph D&apos;Souza</option>
                <option>Sunil Verma (Sup.)</option>
              </Select>
            </div>

            <button
              type="button"
              onClick={() => setPhotoTaken(!photoTaken)}
              className={cn(
                "w-full rounded-md border-2 p-2.5 text-left transition-colors flex items-center gap-2",
                photoTaken ? "border-success bg-success-soft" : "border-dashed border-border hover:bg-surface-sunken"
              )}
            >
              {photoTaken ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Plus className="h-4 w-4 text-muted-foreground" />}
              <div className="flex-1">
                <p className="text-sm font-medium">{photoTaken ? "Photo captured" : "Capture photo (recommended)"}</p>
                <p className="text-[11px] text-muted-foreground">For identification when guest claims the item</p>
              </div>
            </button>

            <div className="space-y-1.5 pt-2 border-t border-border">
              <Label className="text-[11px]">Auto-notify guest</Label>
              <div className="flex gap-1.5">
                {(["None", "WhatsApp", "Email"] as const).map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setContact(c)}
                    className={cn(
                      "inline-flex items-center gap-1.5 h-8 px-3 rounded-full border text-xs font-medium transition-colors",
                      contact === c ? "bg-brand-soft border-brand text-brand-soft-foreground" : "border-border text-muted-foreground hover:bg-surface-sunken"
                    )}
                  >
                    {c === "WhatsApp" ? <MessageCircle className="h-3 w-3" /> : c === "Email" ? <Mail className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="px-5 py-3 border-t border-border bg-surface-elevated flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button onClick={() => onSave(item)} disabled={!valid} variant="success">
              <CheckCircle2 className="h-4 w-4" />Log item
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}

// ===================== MANAGE LOST ITEM MODAL =====================
function ManageLostModal({ item, onClose, onAction }: {
  item: typeof LOST_ITEMS[number];
  onClose: () => void;
  onAction: (msg: string) => void;
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
        <Card className="pointer-events-auto w-full max-w-md p-0 animate-in shadow-xl overflow-hidden">
          <div className="px-5 py-4 bg-surface-elevated border-b border-border flex items-center gap-3">
            <span className="h-10 w-10 rounded-md bg-brand-soft text-brand-soft-foreground inline-flex items-center justify-center shrink-0">
              <Archive className="h-5 w-5" />
            </span>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">{item.item}</h3>
              <p className="text-xs text-muted-foreground">Room {item.room} · Found {item.found}</p>
            </div>
            <button type="button" onClick={onClose} className="h-8 w-8 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
          </div>

          <div className="px-5 py-4 space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Current status</p>
            <div className="rounded-md border border-border p-3 text-sm">
              <p>{item.contact}</p>
            </div>

            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mt-4">Actions</p>
            <button type="button" onClick={() => onAction(`WhatsApp sent to guest about ${item.item}`)} className="w-full px-3 py-2.5 text-sm border border-border rounded-md hover:bg-success-soft hover:border-success inline-flex items-center gap-2.5 text-left transition-colors">
              <MessageCircle className="h-4 w-4 text-success" />Notify guest via WhatsApp
            </button>
            <button type="button" onClick={() => onAction(`Email sent to guest about ${item.item}`)} className="w-full px-3 py-2.5 text-sm border border-border rounded-md hover:bg-info-soft hover:border-info inline-flex items-center gap-2.5 text-left transition-colors">
              <Mail className="h-4 w-4 text-info" />Notify guest via Email
            </button>
            <button type="button" onClick={() => onAction(`${item.item} marked as Returned to guest`)} className="w-full px-3 py-2.5 text-sm border border-border rounded-md hover:bg-success-soft hover:border-success inline-flex items-center gap-2.5 text-left transition-colors">
              <ArrowRight className="h-4 w-4 text-success" />Mark Returned to guest
            </button>
            <button type="button" onClick={() => onAction(`${item.item} marked as Shipped to address on file`)} className="w-full px-3 py-2.5 text-sm border border-border rounded-md hover:bg-surface-sunken inline-flex items-center gap-2.5 text-left transition-colors">
              <Send className="h-4 w-4 text-muted-foreground" />Ship to address on file
            </button>
            <button type="button" onClick={() => onAction(`${item.item} moved to long-term storage`)} className="w-full px-3 py-2.5 text-sm border border-border rounded-md hover:bg-surface-sunken inline-flex items-center gap-2.5 text-left transition-colors">
              <Archive className="h-4 w-4 text-muted-foreground" />Move to long-term storage
            </button>
            <button type="button" onClick={() => onAction(`${item.item} removed from log`)} className="w-full px-3 py-2.5 text-sm border border-border rounded-md hover:bg-danger-soft hover:border-danger text-danger inline-flex items-center gap-2.5 text-left transition-colors">
              <Trash2 className="h-4 w-4" />Remove from log
            </button>
          </div>

          <div className="px-5 py-3 border-t border-border bg-surface-elevated flex items-center justify-end">
            <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
          </div>
        </Card>
      </div>
    </>
  );
}

function BoardTh({
  label, k, sortKey, sortDir, onSort, icon: Icon,
}: {
  label: string;
  k?: BoardSortKey;
  sortKey?: BoardSortKey;
  sortDir?: SortDir;
  onSort?: (k: BoardSortKey) => void;
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
          className={cn("inline-flex items-center gap-1 transition-colors", active ? "text-foreground" : "hover:text-foreground")}
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

function AssignModal({ taskId, room, onClose, onAssign }: { taskId: string; room: string; onClose: () => void; onAssign: (name: string) => void }) {
  void taskId;
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
        <Card className="pointer-events-auto w-full max-w-md p-5 animate-in shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Assign Room {room}</h3>
            <button type="button" onClick={onClose} className="h-8 w-8 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
          </div>
          <div className="space-y-1.5">
            <Label>Housekeeper</Label>
            <div className="space-y-2">
              {HOUSEKEEPERS.filter(h => h.status === "Active").map(h => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => onAssign(h.name)}
                  className="w-full flex items-center gap-3 p-3 rounded-md border border-border hover:bg-surface-sunken hover:border-brand transition-colors text-left"
                >
                  <Avatar name={h.name} size={36} />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{h.name}</p>
                    <p className="text-[11px] text-muted-foreground">{h.todayRooms} rooms today · avg {h.avgTime} min</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
          <AIInsight
            text={
              <>AI suggests <span className="font-semibold">Maria Lopez</span> — closest to floor &amp; matches room type preference.</>
            }
          />
        </Card>
      </div>
    </>
  );
}
