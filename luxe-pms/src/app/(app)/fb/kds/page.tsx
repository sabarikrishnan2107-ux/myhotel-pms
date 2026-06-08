"use client";
import * as React from "react";
import {
  ChefHat, Flame, Snowflake, Wine, Soup, LayoutGrid,
  Clock, AlertTriangle, CheckCircle2, Bell, RotateCcw, Timer,
  Hash, Utensils, Printer, Volume2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useProperty, hotelName } from "@/lib/use-property";
import { apiGet, apiPut } from "@/lib/api";

type Station = "all" | "hot" | "cold" | "tandoor" | "bar";
type ColumnKey = "new" | "preparing" | "ready" | "served";
type Course = 1 | 2 | 3;

type KDSItem = {
  name: string;
  qty: number;
  mods?: string;
};

type KDSOrder = {
  id: string;
  orderNo: string;
  table: string;
  station: Exclude<Station, "all">;
  course: Course;
  items: KDSItem[];
  special?: string;
  allergy?: boolean;
  receivedMinAgo: number;  // minutes since received (mock baseline)
  targetMin: number;        // SLA target in minutes
  column: ColumnKey;
  servedAtMinAgo?: number;  // for served history
  server: string;
};

// 13 mock orders distributed across columns
const SEED_ORDERS: KDSOrder[] = [
  // NEW (yellow)
  {
    id: "k1", orderNo: "#1042", table: "T-07", station: "tandoor", course: 1,
    items: [
      { name: "Butter Chicken", qty: 2, mods: "less spicy" },
      { name: "Garlic Naan", qty: 4 },
      { name: "Jeera Rice", qty: 1 },
    ],
    special: "Nut allergy - confirm dairy substitution",
    allergy: true,
    receivedMinAgo: 2, targetMin: 12, column: "new", server: "Ravi K.",
  },
  {
    id: "k2", orderNo: "#1043", table: "T-12", station: "hot", course: 1,
    items: [
      { name: "Penne Arrabbiata", qty: 1 },
      { name: "Margherita Pizza", qty: 1, mods: "extra basil" },
    ],
    receivedMinAgo: 1, targetMin: 14, column: "new", server: "Anjali I.",
  },
  {
    id: "k3", orderNo: "#1044", table: "T-03", station: "cold", course: 1,
    items: [
      { name: "Caesar Salad", qty: 2, mods: "no croutons" },
      { name: "Bruschetta", qty: 1 },
    ],
    receivedMinAgo: 3, targetMin: 8, column: "new", server: "Karan M.",
  },
  {
    id: "k4", orderNo: "#1045", table: "Bar-2", station: "bar", course: 1,
    items: [
      { name: "Old Fashioned", qty: 2 },
      { name: "Virgin Mojito", qty: 1, mods: "no sugar" },
    ],
    receivedMinAgo: 1, targetMin: 6, column: "new", server: "Priya K.",
  },

  // PREPARING (blue)
  {
    id: "k5", orderNo: "#1039", table: "T-15", station: "tandoor", course: 2,
    items: [
      { name: "Tandoori Chicken", qty: 1 },
      { name: "Paneer Tikka", qty: 1, mods: "extra char" },
      { name: "Roomali Roti", qty: 3 },
    ],
    special: "VIP - The Pearl Marina suite guest",
    receivedMinAgo: 8, targetMin: 15, column: "preparing", server: "Ravi K.",
  },
  {
    id: "k6", orderNo: "#1040", table: "T-09", station: "hot", course: 2,
    items: [
      { name: "Dal Makhani", qty: 2 },
      { name: "Veg Biryani", qty: 1, mods: "extra raita" },
      { name: "Butter Naan", qty: 4 },
    ],
    receivedMinAgo: 7, targetMin: 14, column: "preparing", server: "Anjali I.",
  },
  {
    id: "k7", orderNo: "#1041", table: "T-21", station: "hot", course: 1,
    items: [
      { name: "Grilled Salmon", qty: 1, mods: "medium" },
      { name: "Risotto Funghi", qty: 1 },
    ],
    special: "Gluten-free request",
    allergy: true,
    receivedMinAgo: 18, targetMin: 16, column: "preparing", server: "Karan M.",
  },
  {
    id: "k8", orderNo: "#1038", table: "T-04", station: "cold", course: 1,
    items: [
      { name: "Caprese Salad", qty: 1 },
      { name: "Mezze Platter", qty: 1, mods: "extra hummus" },
    ],
    receivedMinAgo: 6, targetMin: 10, column: "preparing", server: "Priya K.",
  },
  {
    id: "k9", orderNo: "#1037", table: "Bar-5", station: "bar", course: 1,
    items: [
      { name: "Negroni", qty: 1 },
      { name: "Espresso Martini", qty: 2 },
    ],
    receivedMinAgo: 9, targetMin: 7, column: "preparing", server: "Anjali I.",
  },

  // READY (green)
  {
    id: "k10", orderNo: "#1035", table: "T-06", station: "tandoor", course: 3,
    items: [
      { name: "Chicken Tikka", qty: 1 },
      { name: "Hara Bhara Kebab", qty: 1 },
    ],
    receivedMinAgo: 14, targetMin: 14, column: "ready", server: "Ravi K.",
  },
  {
    id: "k11", orderNo: "#1036", table: "T-11", station: "hot", course: 2,
    items: [
      { name: "Lasagna Bolognese", qty: 1 },
      { name: "Garlic Bread", qty: 1 },
    ],
    receivedMinAgo: 11, targetMin: 13, column: "ready", server: "Karan M.",
  },

  // SERVED (last 5 history shown - we'll provide 3)
  {
    id: "k12", orderNo: "#1031", table: "T-08", station: "hot", course: 1,
    items: [
      { name: "Mushroom Soup", qty: 2 },
    ],
    receivedMinAgo: 25, targetMin: 8, column: "served", servedAtMinAgo: 1, server: "Anjali I.",
  },
  {
    id: "k13", orderNo: "#1032", table: "T-14", station: "tandoor", course: 1,
    items: [
      { name: "Seekh Kebab", qty: 2, mods: "extra mint chutney" },
    ],
    receivedMinAgo: 30, targetMin: 12, column: "served", servedAtMinAgo: 3, server: "Ravi K.",
  },
];

const STATIONS: { key: Station; label: string; icon: React.ElementType }[] = [
  { key: "all", label: "All Stations", icon: LayoutGrid },
  { key: "hot", label: "Hot Kitchen", icon: Flame },
  { key: "cold", label: "Cold Kitchen", icon: Snowflake },
  { key: "tandoor", label: "Tandoor", icon: Soup },
  { key: "bar", label: "Bar", icon: Wine },
];

const STATION_LABEL: Record<Exclude<Station, "all">, string> = {
  hot: "Hot Kitchen",
  cold: "Cold Kitchen",
  tandoor: "Tandoor",
  bar: "Bar",
};

const STATION_ICON: Record<Exclude<Station, "all">, React.ElementType> = {
  hot: Flame,
  cold: Snowflake,
  tandoor: Soup,
  bar: Wine,
};

const COLUMN_META: Record<ColumnKey, {
  title: string;
  border: string;
  badge: string;
  header: string;
  ring: string;
}> = {
  new: {
    title: "NEW",
    border: "border-l-4 border-l-warning",
    badge: "bg-warning-soft text-warning",
    header: "text-warning",
    ring: "ring-warning/30",
  },
  preparing: {
    title: "PREPARING",
    border: "border-l-4 border-l-info",
    badge: "bg-info-soft text-info",
    header: "text-info",
    ring: "ring-info/30",
  },
  ready: {
    title: "READY",
    border: "border-l-4 border-l-success",
    badge: "bg-success-soft text-success",
    header: "text-success",
    ring: "ring-success/30",
  },
  served: {
    title: "SERVED",
    border: "border-l-4 border-l-border",
    badge: "bg-surface-sunken text-muted-foreground",
    header: "text-muted-foreground",
    ring: "ring-border/30",
  },
};

function formatElapsed(mins: number) {
  if (mins < 1) return "0:30";
  const m = Math.floor(mins);
  const s = Math.floor((mins - m) * 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function KDSPage() {
  const name = hotelName(useProperty());
  const [station, setStation] = React.useState<Station>("all");
  const [orders, setOrders] = React.useState<KDSOrder[]>(SEED_ORDERS);
  const [tick, setTick] = React.useState(0);
  const [toast, setToast] = React.useState<string | null>(null);
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };

  // Live timer — re-render every second to update countdowns
  React.useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Elapsed time getter (live): baseline mock minutes + seconds since mount
  const elapsedFor = React.useCallback((o: KDSOrder) => {
    return o.receivedMinAgo + tick / 60;
  }, [tick]);

  const filtered = React.useMemo(() => {
    return station === "all" ? orders : orders.filter(o => o.station === station);
  }, [orders, station]);

  const byColumn: Record<ColumnKey, KDSOrder[]> = {
    new: filtered.filter(o => o.column === "new"),
    preparing: filtered.filter(o => o.column === "preparing"),
    ready: filtered.filter(o => o.column === "ready"),
    served: filtered.filter(o => o.column === "served").slice(0, 5),
  };

  // KPIs
  const activeOrders = filtered.filter(o => o.column !== "served");
  const liveCount = activeOrders.length;
  const avgPrep = activeOrders.length
    ? Math.round(activeOrders.reduce((s, o) => s + elapsedFor(o), 0) / activeOrders.length)
    : 0;
  const overdue = activeOrders.filter(o => elapsedFor(o) > o.targetMin);
  const overdueCount = overdue.length;

  // Load live kitchen orders from the POS (placed via the real fb_orders API).
  React.useEffect(() => {
    let cancelled = false;
    type ApiOrder = { id: number; orderNo: string; tableNo: string; server?: string; status: string; items?: { name: string; qty: number }[] };
    apiGet<ApiOrder[]>("/fb-orders").then(rows => {
      if (cancelled) return;
      const live = rows
        .filter(r => r.status !== "paid")
        .map(r => ({
          id: String(r.id),
          orderNo: r.orderNo,
          table: r.tableNo,
          station: "hot" as Exclude<Station, "all">,
          course: 1 as Course,
          items: (r.items ?? []).map(it => ({ name: it.name, qty: it.qty })),
          receivedMinAgo: 0,
          targetMin: 15,
          column: (r.status === "placed" ? "new" : r.status) as ColumnKey,
          server: r.server || "—",
        }));
      if (live.length) setOrders(live);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Persist a KDS column change to the backing fb_order (id is numeric for real orders).
  const persistStatus = (id: string, status: string) => {
    if (/^\d+$/.test(id)) apiPut(`/fb-orders/${id}`, { status }).catch(() => {});
  };

  // Actions
  const acknowledge = (id: string) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, column: "preparing" } : o));
    showToast("Acknowledged - moved to Preparing");
    persistStatus(id, "preparing");
  };
  const markReady = (id: string) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, column: "ready" } : o));
    showToast("Marked ready - server notified");
    persistStatus(id, "ready");
  };
  const markServed = (id: string) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, column: "served", servedAtMinAgo: 0 } : o));
    showToast("Order served - moved to history");
    persistStatus(id, "served");
  };
  const recall = (id: string) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, column: "preparing" } : o));
    showToast("Order recalled - back to Preparing");
    persistStatus(id, "preparing");
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-warning to-danger flex items-center justify-center shadow-lg">
            <ChefHat className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Kitchen Display System</h1>
            <p className="text-sm text-muted-foreground">
              {name}, Mumbai · Wall-mounted live view · Auto-refresh
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => showToast("Audio alerts enabled")}>
            <Volume2 className="h-4 w-4 mr-1.5" /> Audio
          </Button>
          <Button size="sm" variant="outline" onClick={() => showToast("Reprinting all open KOTs")}>
            <Printer className="h-4 w-4 mr-1.5" /> Reprint KOTs
          </Button>
          <Button size="sm" onClick={() => showToast("Display refreshed")}>
            <RotateCcw className="h-4 w-4 mr-1.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* STATION SWITCHER + KPIs */}
      <Card className="p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Station chips */}
          <div className="flex flex-wrap gap-2">
            {STATIONS.map(s => {
              const Icon = s.icon;
              const active = station === s.key;
              return (
                <button
                  key={s.key}
                  onClick={() => { setStation(s.key); showToast(`Showing ${s.label}`); }}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-base font-semibold transition",
                    active
                      ? "bg-foreground text-background border-foreground shadow"
                      : "bg-surface border-border text-foreground hover:bg-surface-sunken"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {s.label}
                </button>
              );
            })}
          </div>

          {/* Live KPIs */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg bg-surface-sunken px-3 py-2">
              <Utensils className="h-5 w-5 text-foreground" />
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Live Orders</div>
                <div className="text-xl font-bold tabular leading-none">{liveCount}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-info-soft px-3 py-2">
              <Timer className="h-5 w-5 text-info" />
              <div>
                <div className="text-[10px] uppercase tracking-wider text-info">Avg Prep</div>
                <div className="text-xl font-bold tabular leading-none text-info">{avgPrep}m</div>
              </div>
            </div>
            <div className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2",
              overdueCount > 0 ? "bg-danger-soft animate-pulse" : "bg-surface-sunken"
            )}>
              <AlertTriangle className={cn("h-5 w-5", overdueCount > 0 ? "text-danger" : "text-muted-foreground")} />
              <div>
                <div className={cn(
                  "text-[10px] uppercase tracking-wider",
                  overdueCount > 0 ? "text-danger" : "text-muted-foreground"
                )}>Overdue</div>
                <div className={cn(
                  "text-xl font-bold tabular leading-none",
                  overdueCount > 0 ? "text-danger" : "text-foreground"
                )}>{overdueCount}</div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* OVERDUE ALERT STRIP */}
      {overdueCount > 0 && (
        <div className="rounded-lg border-2 border-danger bg-danger-soft px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="h-6 w-6 text-danger shrink-0" />
          <div className="flex-1">
            <div className="text-base font-bold text-danger">
              {overdueCount} order{overdueCount > 1 ? "s" : ""} past SLA
            </div>
            <div className="text-sm text-danger/80">
              {overdue.map(o => `${o.orderNo} ${o.table}`).join(" · ")}
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => showToast("Chef notified - SLA escalation sent")}>
            <Bell className="h-4 w-4 mr-1.5" /> Escalate
          </Button>
        </div>
      )}

      {/* KANBAN COLUMNS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {(["new", "preparing", "ready", "served"] as ColumnKey[]).map(col => {
          const meta = COLUMN_META[col];
          const items = byColumn[col];
          return (
            <div key={col} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className={cn("flex items-center gap-2 text-lg font-bold tracking-wide", meta.header)}>
                  {meta.title}
                  <span className={cn("inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-sm font-bold tabular", meta.badge)}>
                    {items.length}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {items.length === 0 && (
                  <Card className="p-6 text-center text-sm text-muted-foreground border-dashed">
                    No orders
                  </Card>
                )}
                {items.map(o => (
                  <KDSCard
                    key={o.id}
                    order={o}
                    column={col}
                    elapsed={elapsedFor(o)}
                    onAcknowledge={() => acknowledge(o.id)}
                    onMarkReady={() => markReady(o.id)}
                    onMarkServed={() => markServed(o.id)}
                    onRecall={() => recall(o.id)}
                    onBump={() => showToast(`${o.orderNo} bumped to top`)}
                    onPrint={() => showToast(`KOT ${o.orderNo} reprinted`)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-foreground text-background rounded-lg px-4 py-3 text-sm shadow-2xl">
          {toast}
        </div>
      )}
    </div>
  );
}

/* ---------------- KDS CARD ---------------- */

function KDSCard({
  order, column, elapsed,
  onAcknowledge, onMarkReady, onMarkServed, onRecall, onBump, onPrint,
}: {
  order: KDSOrder;
  column: ColumnKey;
  elapsed: number;
  onAcknowledge: () => void;
  onMarkReady: () => void;
  onMarkServed: () => void;
  onRecall: () => void;
  onBump: () => void;
  onPrint: () => void;
}) {
  const meta = COLUMN_META[column];
  const overdue = column !== "served" && elapsed > order.targetMin;
  const warning = column !== "served" && !overdue && elapsed > order.targetMin * 0.8;
  const StationIcon = STATION_ICON[order.station];

  return (
    <Card className={cn(
      "p-4 space-y-3 transition",
      meta.border,
      overdue && "ring-2 ring-danger shadow-lg animate-pulse",
      column === "served" && "opacity-75"
    )}>
      {/* Top: Order # + Table # BIG */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Hash className="h-5 w-5 text-muted-foreground" />
            <span className="text-2xl font-extrabold tabular tracking-tight">{order.orderNo.replace("#", "")}</span>
          </div>
          <div className="text-xl font-bold text-foreground">
            Table {order.table}
          </div>
        </div>

        {/* Live elapsed countdown */}
        <div className={cn(
          "flex flex-col items-end rounded-lg px-3 py-2 min-w-[88px]",
          overdue ? "bg-danger text-white" :
          warning ? "bg-warning-soft text-warning" :
          column === "served" ? "bg-surface-sunken text-muted-foreground" :
          "bg-surface-sunken text-foreground"
        )}>
          <div className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider">
            <Clock className="h-3 w-3" />
            {column === "served" ? "Done" : overdue ? "Overdue" : "Elapsed"}
          </div>
          <div className="text-2xl font-extrabold tabular leading-none mt-0.5">
            {column === "served" && order.servedAtMinAgo !== undefined
              ? `${order.servedAtMinAgo}m`
              : formatElapsed(elapsed)}
          </div>
          {column !== "served" && (
            <div className="text-[10px] mt-0.5 opacity-80">
              SLA {order.targetMin}m
            </div>
          )}
        </div>
      </div>

      {/* Station + Course */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={cn(
          "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold",
          "bg-surface-sunken text-foreground"
        )}>
          <StationIcon className="h-3.5 w-3.5" />
          {STATION_LABEL[order.station]}
        </span>
        <Badge tone="accent">
          Course {order.course}
        </Badge>
        <span className="text-xs text-muted-foreground ml-auto">
          Server: {order.server}
        </span>
      </div>

      {/* Special instructions / allergy banner */}
      {order.special && (
        <div className={cn(
          "rounded-md px-3 py-2 text-sm font-semibold flex items-start gap-2",
          order.allergy
            ? "bg-danger text-white"
            : "bg-warning-soft text-warning"
        )}>
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{order.special}</span>
        </div>
      )}

      {/* Items list - BIG text for wall display */}
      <ul className="space-y-1.5">
        {order.items.map((it, i) => (
          <li key={i} className="flex items-start gap-2 text-lg">
            <span className="font-extrabold tabular text-foreground shrink-0 min-w-[2rem]">
              {it.qty}×
            </span>
            <div className="flex-1">
              <div className="font-bold text-foreground leading-tight">{it.name}</div>
              {it.mods && (
                <div className="text-sm text-muted-foreground italic">· {it.mods}</div>
              )}
            </div>
          </li>
        ))}
      </ul>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-border">
        {column === "new" && (
          <>
            <Button size="sm" className="flex-1" onClick={onAcknowledge}>
              <CheckCircle2 className="h-4 w-4 mr-1" /> Acknowledge
            </Button>
            <Button size="sm" variant="ghost" onClick={onPrint} title="Reprint KOT">
              <Printer className="h-4 w-4" />
            </Button>
          </>
        )}
        {column === "preparing" && (
          <>
            <Button size="sm" className="flex-1" onClick={onMarkReady}>
              <Bell className="h-4 w-4 mr-1" /> Mark Ready
            </Button>
            <Button size="sm" variant="outline" onClick={onBump}>
              Bump
            </Button>
          </>
        )}
        {column === "ready" && (
          <>
            <Button size="sm" className="flex-1" onClick={onMarkServed}>
              <CheckCircle2 className="h-4 w-4 mr-1" /> Served
            </Button>
            <Button size="sm" variant="outline" onClick={onRecall}>
              <RotateCcw className="h-4 w-4 mr-1" /> Recall
            </Button>
          </>
        )}
        {column === "served" && (
          <Button size="sm" variant="outline" className="flex-1" onClick={onRecall}>
            <RotateCcw className="h-4 w-4 mr-1" /> Recall to Preparing
          </Button>
        )}
      </div>
    </Card>
  );
}
