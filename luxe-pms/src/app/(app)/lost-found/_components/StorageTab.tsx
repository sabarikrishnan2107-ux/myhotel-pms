"use client";
import * as React from "react";
import {
  Warehouse,
  Lock,
  ShieldCheck,
  Snowflake,
  FileLock2,
  Cpu,
  Banknote,
  Gem,
  Package,
  Boxes,
  Gauge,
  AlertTriangle,
  Clock,
  Plus,
  ArrowRightLeft,
  PackageCheck,
  Trash2,
  X,
  ChevronRight,
  MapPin,
  Sparkles,
  CalendarClock,
  FileSignature,
  CheckCircle2,
  Image as ImageIcon,
  MoreVertical,
  Search,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn, money } from "@/lib/utils";
import { apiGet, apiPut } from "@/lib/api";

type FoundRow = {
  id: number | string;
  name: string;
  category?: string;
  status?: string;
  value?: number;
  hvi?: boolean;
  daysHeld?: number;
  foundBy?: string;
  foundDate?: string;
  storageLocation?: string;
  storageShelf?: string;
};

// Buckets a real found-item into one of the fixed storage zones by keyword.
function areaForFound(i: FoundRow): StorageKey {
  const loc = (i.storageLocation || "").toLowerCase();
  const cat = (i.category || "").toLowerCase();
  if (cat.includes("cash")) return "cash";
  if (cat.includes("jewel")) return "jewellery";
  if (loc.includes("fridge") || loc.includes("refrig")) return "fridge";
  if (cat.includes("passport") || cat.includes("document") || loc.includes("document")) return "documents";
  if (
    cat.includes("phone") || cat.includes("laptop") || cat.includes("tablet") ||
    cat.includes("electronic") || loc.includes("electronic")
  )
    return "electronics";
  if (loc.includes("safe") || loc.includes("vault")) return "manager";
  if (loc.includes("locker")) return "security";
  return "general";
}

const RESOLVED = ["Returned", "Claimed", "Disposed", "Donated"];

type StorageKey =
  | "general"
  | "security"
  | "manager"
  | "fridge"
  | "documents"
  | "electronics"
  | "cash"
  | "jewellery";

type StorageArea = {
  key: StorageKey;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  count: number;
  capacity: number;
  lastAccess: string;
  custodian: string;
  unit: "Shelf" | "Locker" | "Box" | "Bag";
  premium?: boolean;
};

const AREAS: StorageArea[] = [
  {
    key: "general",
    name: "General storage",
    icon: Warehouse,
    count: 22,
    capacity: 30,
    lastAccess: "Today, 11:42",
    custodian: "Priya Krishnan",
    unit: "Shelf",
  },
  {
    key: "security",
    name: "Security locker",
    icon: Lock,
    count: 9,
    capacity: 16,
    lastAccess: "Today, 09:18",
    custodian: "Ramesh Naidu",
    unit: "Locker",
  },
  {
    key: "manager",
    name: "Manager safe",
    icon: ShieldCheck,
    count: 6,
    capacity: 10,
    lastAccess: "Yesterday, 18:05",
    custodian: "Anjali Iyer",
    unit: "Box",
    premium: true,
  },
  {
    key: "fridge",
    name: "Refrigerated",
    icon: Snowflake,
    count: 4,
    capacity: 8,
    lastAccess: "Today, 08:30",
    custodian: "Sunita Devi",
    unit: "Bag",
  },
  {
    key: "documents",
    name: "Document locker",
    icon: FileLock2,
    count: 11,
    capacity: 20,
    lastAccess: "Today, 10:11",
    custodian: "Karan Mehta",
    unit: "Box",
  },
  {
    key: "electronics",
    name: "Electronics cabinet",
    icon: Cpu,
    count: 8,
    capacity: 12,
    lastAccess: "Today, 12:55",
    custodian: "Karan Mehta",
    unit: "Shelf",
  },
  {
    key: "cash",
    name: "Cash safe",
    icon: Banknote,
    count: 3,
    capacity: 6,
    lastAccess: "Yesterday, 22:40",
    custodian: "Anjali Iyer",
    unit: "Box",
    premium: true,
  },
  {
    key: "jewellery",
    name: "Jewellery safe",
    icon: Gem,
    count: 5,
    capacity: 8,
    lastAccess: "Yesterday, 17:22",
    custodian: "Anjali Iyer",
    unit: "Box",
    premium: true,
  },
];

type StoredItem = {
  id: string;
  name: string;
  photo: string;
  storedOn: string;
  storedBy: string;
  slot: string;
  verifiedBy: string;
  daysHeld: number;
  area: StorageKey;
  retentionDays: number;
  value?: number;
  hvi?: boolean;
  safeLocker?: string;
  dualSig?: "Pending" | "Complete";
};

const UNASSIGNED = [
  { id: "LF-7801", name: "Black leather wallet" },
  { id: "LF-7802", name: "Spar shopping bag (groceries)" },
  { id: "LF-7803", name: "Children's water bottle" },
  { id: "LF-7804", name: "Apple Watch Series 9 (HVI)" },
];

const STAFF = [
  "Anjali Iyer (GM)",
  "Karan Mehta (FOM)",
  "Priya Krishnan (HK Manager)",
  "Ramesh Naidu (Security)",
  "Sunita Devi (HK Supervisor)",
];

export default function StorageTab({ onToast }: { onToast: (m: string) => void }) {
  const [drawerArea, setDrawerArea] = React.useState<StorageKey | null>(null);
  const [assignArea, setAssignArea] = React.useState<StorageKey>("general");
  const [assignSlot, setAssignSlot] = React.useState<string>("");
  const [storedBy, setStoredBy] = React.useState<string>(STAFF[2]);
  const [verifiedBy, setVerifiedBy] = React.useState<string>(STAFF[0]);

  // Real found-items power every list below.
  const [found, setFound] = React.useState<FoundRow[] | null>(null);
  const [assignItem, setAssignItem] = React.useState<string>(UNASSIGNED[0].id);
  React.useEffect(() => {
    let cancelled = false;
    apiGet<FoundRow[]>("/found-items")
      .then((r) => {
        if (cancelled || !r.length) return;
        setFound(r);
        const firstUnassigned = r.find((i) => !i.storageLocation && !RESOLVED.includes(i.status ?? ""));
        if (firstUnassigned) setAssignItem(String(firstUnassigned.id));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const itemsData: StoredItem[] = (found ?? [])
    .filter((i) => i.storageLocation && !RESOLVED.includes(i.status ?? ""))
    .map((i) => ({
      id: String(i.id),
      name: i.name,
      photo: i.hvi ? "bg-linear-to-br from-amber-400 to-orange-500" : "bg-linear-to-br from-slate-300 to-slate-500",
      storedOn: i.foundDate || "—",
      storedBy: i.foundBy || "—",
      slot: i.storageShelf || i.storageLocation || "—",
      verifiedBy: "—",
      daysHeld: i.daysHeld ?? 0,
      area: areaForFound(i),
      retentionDays: 90,
      value: i.value,
      hvi: i.hvi,
      safeLocker: i.storageShelf || i.storageLocation,
      dualSig: i.hvi ? "Complete" : undefined,
    }));

  const unassignedData = (found ?? [])
    .filter((i) => !i.storageLocation && !RESOLVED.includes(i.status ?? ""))
    .map((i) => ({ id: String(i.id), name: i.name }));

  const areasData: StorageArea[] = AREAS.map((a) => ({
    ...a,
    count: itemsData.filter((it) => it.area === a.key).length,
  }));

  const totalLocations = areasData.length;
  const totalItems = itemsData.length;
  const totalCap = areasData.reduce((s, a) => s + a.capacity, 0);
  const capUsedPct = Math.round((totalItems / totalCap) * 100);
  const overdueItems = itemsData.filter((i) => i.daysHeld > i.retentionDays);
  const overdueCount = overdueItems.length;

  const nearDisposal = itemsData.filter((i) => {
    const remaining = i.retentionDays - i.daysHeld;
    return remaining >= 0 && remaining <= 7;
  });

  const safeItems = itemsData.filter((i) => i.area === "manager");

  const areaItems = (key: StorageKey) => itemsData.filter((i) => i.area === key);

  const submitAssign = () => {
    if (!assignSlot.trim()) {
      onToast("Enter shelf / locker / box / bag number first");
      return;
    }
    const itemName = unassignedData.find((u) => u.id === assignItem)?.name ?? assignItem;
    const areaName = areasData.find((a) => a.key === assignArea)?.name ?? assignArea;
    apiPut(`/found-items/${assignItem}`, {
      storageLocation: areaName,
      storageShelf: assignSlot,
      status: "Storage",
    })
      .then(() => {
        setFound((prev) =>
          prev
            ? prev.map((f) =>
                String(f.id) === assignItem
                  ? { ...f, storageLocation: areaName, storageShelf: assignSlot, status: "Storage" }
                  : f,
              )
            : prev,
        );
        onToast(`${itemName} assigned to ${areaName} (${assignSlot})`);
      })
      .catch(() => onToast("⚠ Save failed — backend offline"));
    setAssignSlot("");
  };

  // Persist a status change from the contents drawer (Return / Dispose).
  const itemAction = (id: string, status: string, label: string) => {
    apiPut(`/found-items/${id}`, { status })
      .then(() => {
        setFound((prev) => (prev ? prev.map((f) => (String(f.id) === id ? { ...f, status } : f)) : prev));
        onToast(`${label} · ${id}`);
      })
      .catch(() => onToast("⚠ Save failed — backend offline"));
  };

  return (
    <div className="space-y-4">
      {/* 1. KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi
          icon={Warehouse}
          label="Total locations"
          value={String(totalLocations)}
          sub="Across 3 floors"
          tone="brand"
        />
        <Kpi
          icon={Boxes}
          label="Items stored"
          value={String(totalItems)}
          sub={`of ${totalCap} slots`}
          tone="info"
        />
        <Kpi
          icon={Gauge}
          label="Capacity used"
          value={`${capUsedPct}%`}
          sub={capUsedPct > 75 ? "Nearing limit" : "Healthy"}
          tone={capUsedPct > 75 ? "warning" : "success"}
        />
        <Kpi
          icon={AlertTriangle}
          label="Items overdue"
          value={String(overdueCount)}
          sub="Past retention"
          tone="danger"
        />
      </div>

      {/* 2. Storage locations grid */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold">Storage locations</h3>
            <p className="text-sm text-muted-foreground">The Pearl Marina, Mumbai — back-of-house storage</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => onToast("Storage map exported (PDF)")}>
            <FileSignature className="size-4" /> Export map
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {areasData.map((a) => {
            const pct = Math.round((a.count / a.capacity) * 100);
            const Icon = a.icon;
            const overCap = pct > 80;
            return (
              <Card
                key={a.key}
                className={cn(
                  "p-4 flex flex-col gap-3",
                  a.premium && "border-amber-300/60 bg-linear-to-br from-amber-50/60 to-orange-50/40 dark:from-amber-950/30 dark:to-orange-950/20"
                )}
              >
                <div className="flex items-start justify-between">
                  <div
                    className={cn(
                      "size-10 rounded-md flex items-center justify-center",
                      a.premium
                        ? "bg-linear-to-br from-amber-400 to-orange-500 text-white"
                        : "bg-brand-soft text-brand"
                    )}
                  >
                    <Icon className="size-5" />
                  </div>
                  {a.premium && (
                    <Badge tone="accent" className="gap-1">
                      <Sparkles className="size-3" /> HVI
                    </Badge>
                  )}
                </div>
                <div>
                  <div className="text-sm font-semibold leading-tight">{a.name}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">Custodian: {a.custodian}</div>
                </div>
                <div>
                  <div className="flex items-baseline justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground">Capacity</span>
                    <span className="tabular font-medium">
                      {a.count}/{a.capacity}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-surface-sunken overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        overCap ? "bg-warning" : a.premium ? "bg-linear-to-r from-amber-400 to-orange-500" : "bg-brand"
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Clock className="size-3" />
                  <span>Last access {a.lastAccess}</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-auto"
                  onClick={() => setDrawerArea(a.key)}
                >
                  View contents <ChevronRight className="size-4" />
                </Button>
              </Card>
            );
          })}
        </div>
      </Card>

      {/* 4. Assign storage + 6. Retention alerts side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Assign storage */}
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <div className="size-9 rounded-md bg-brand-soft text-brand flex items-center justify-center">
              <Plus className="size-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold">Assign storage</h3>
              <p className="text-xs text-muted-foreground">Place an unassigned item into a storage area</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="item">Unassigned item</Label>
              <Select id="item" value={assignItem} onChange={(e) => setAssignItem(e.target.value)} className="mt-1">
                {unassignedData.length === 0 && <option value="">No unassigned items</option>}
                {unassignedData.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.id} — {u.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="area">Storage area</Label>
              <Select
                id="area"
                value={assignArea}
                onChange={(e) => setAssignArea(e.target.value as StorageKey)}
                className="mt-1"
              >
                {areasData.map((a) => (
                  <option key={a.key} value={a.key}>
                    {a.name} ({a.count}/{a.capacity})
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="slot">
                {areasData.find((a) => a.key === assignArea)?.unit ?? "Slot"} number
              </Label>
              <Input
                id="slot"
                placeholder={`e.g. ${areasData.find((a) => a.key === assignArea)?.unit ?? "Slot"} A-14`}
                value={assignSlot}
                onChange={(e) => setAssignSlot(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="storedBy">Stored by</Label>
              <Select id="storedBy" value={storedBy} onChange={(e) => setStoredBy(e.target.value)} className="mt-1">
                {STAFF.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="verifiedBy">Verified by</Label>
              <Select
                id="verifiedBy"
                value={verifiedBy}
                onChange={(e) => setVerifiedBy(e.target.value)}
                className="mt-1"
              >
                {STAFF.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 mt-4">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setAssignSlot("");
                onToast("Form reset");
              }}
            >
              Reset
            </Button>
            <Button size="sm" onClick={submitAssign}>
              <PackageCheck className="size-4" /> Submit
            </Button>
          </div>
        </Card>

        {/* Retention alerts */}
        <Card className="p-5 border-danger/30 bg-danger-soft/30">
          <div className="flex items-center gap-2 mb-3">
            <div className="size-9 rounded-md bg-danger-soft text-danger flex items-center justify-center">
              <CalendarClock className="size-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold">Retention alerts</h3>
              <p className="text-xs text-muted-foreground">Approaching disposal date</p>
            </div>
          </div>
          <div className="space-y-2 max-h-[260px] overflow-y-auto">
            {nearDisposal.length === 0 && (
              <div className="text-sm text-muted-foreground py-4 text-center">No items in alert window</div>
            )}
            {nearDisposal.map((i) => {
              const remaining = i.retentionDays - i.daysHeld;
              return (
                <div
                  key={i.id}
                  className="flex items-center gap-2 p-2 rounded-md bg-surface border border-danger/20"
                >
                  <div className={cn("size-8 rounded shrink-0", i.photo)} />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium truncate">{i.name}</div>
                    <div className="text-[10px] text-muted-foreground tabular">
                      {i.id} · {i.slot}
                    </div>
                  </div>
                  <Badge tone={remaining <= 0 ? "danger" : "warning"} className="shrink-0">
                    {remaining <= 0 ? "Overdue" : `${remaining}d`}
                  </Badge>
                </div>
              );
            })}
          </div>
          <Button
            size="sm"
            variant="outline"
            className="w-full mt-3 border-danger/40 text-danger hover:bg-danger-soft"
            onClick={() => onToast("Disposal flow initiated for retention-expired items")}
          >
            <Trash2 className="size-4" /> Initiate disposal flow
          </Button>
        </Card>
      </div>

      {/* 5. HVI Manager safe special section */}
      <Card className="overflow-hidden border-amber-300/60">
        <div className="p-5 bg-linear-to-br from-amber-400/15 to-orange-500/10 border-b border-amber-300/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-md bg-linear-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold">High-value safe</h3>
                  <Badge tone="accent" className="gap-1">
                    <Sparkles className="size-3" /> HVI vault
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Dual-signature protocol · Manager + Front Office Manager · CCTV monitored
                </p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => onToast("HVI audit log exported")}>
              <FileSignature className="size-4" /> Audit log
            </Button>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-surface-sunken/40">
            <tr className="text-[10px] uppercase text-muted-foreground tracking-wider">
              <th className="text-left px-4 py-2 font-medium">ID</th>
              <th className="text-left px-4 py-2 font-medium">Item</th>
              <th className="text-left px-4 py-2 font-medium">Safe locker #</th>
              <th className="text-left px-4 py-2 font-medium">Value</th>
              <th className="text-left px-4 py-2 font-medium">Days held</th>
              <th className="text-left px-4 py-2 font-medium">Dual-sig</th>
              <th className="text-right px-4 py-2 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {safeItems.map((i) => (
              <tr key={i.id} className="border-t border-border hover:bg-surface-sunken/30">
                <td className="px-4 py-2.5 tabular font-medium">{i.id}</td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className={cn("size-7 rounded", i.photo)} />
                    <span className="text-sm">{i.name}</span>
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <Badge tone="accent" className="tabular">
                    {i.safeLocker}
                  </Badge>
                </td>
                <td className="px-4 py-2.5 tabular font-semibold">{money(i.value ?? 0)}</td>
                <td className="px-4 py-2.5 tabular text-muted-foreground">{i.daysHeld}d</td>
                <td className="px-4 py-2.5">
                  {i.dualSig === "Complete" ? (
                    <Badge tone="success" className="gap-1">
                      <CheckCircle2 className="size-3" /> Complete
                    </Badge>
                  ) : (
                    <Badge tone="warning" className="gap-1">
                      <Clock className="size-3" /> Pending
                    </Badge>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      i.dualSig === "Pending"
                        ? onToast(`Co-signature requested for ${i.id}`)
                        : onToast(`Inspecting ${i.id} — ${i.name}`)
                    }
                  >
                    {i.dualSig === "Pending" ? "Co-sign" : "Inspect"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* 7. Storage map placeholder */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MapPin className="size-4 text-muted-foreground" />
            <div>
              <h3 className="text-base font-semibold">Storage map</h3>
              <p className="text-xs text-muted-foreground">
                Back-of-house · Floor B2 · 8 zones · color-coded fill
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="size-2.5 rounded-sm bg-brand" /> Filled
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2.5 rounded-sm bg-warning" /> Near full
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2.5 rounded-sm bg-linear-to-br from-amber-400 to-orange-500" /> HVI
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2.5 rounded-sm bg-surface-sunken border border-border" /> Empty
            </span>
          </div>
        </div>
        <div className="space-y-3">
          {areasData.map((a) => {
            const cells = Array.from({ length: a.capacity }, (_, idx) => idx < a.count);
            return (
              <div
                key={a.key}
                className="flex items-center gap-3 p-3 rounded-md bg-surface-sunken/40"
              >
                <div className="w-44 shrink-0">
                  <div className="text-xs font-medium flex items-center gap-1.5">
                    <a.icon className="size-3.5 text-muted-foreground" />
                    {a.name}
                  </div>
                  <div className="text-[10px] text-muted-foreground tabular">
                    {a.count}/{a.capacity} · {Math.round((a.count / a.capacity) * 100)}%
                  </div>
                </div>
                <div className="flex-1 grid grid-cols-10 sm:grid-cols-15 md:grid-cols-20 gap-1">
                  {cells.map((filled, idx) => {
                    const pct = (a.count / a.capacity) * 100;
                    const cls = !filled
                      ? "bg-surface-sunken border border-border"
                      : a.premium
                        ? "bg-linear-to-br from-amber-400 to-orange-500"
                        : pct > 80
                          ? "bg-warning"
                          : "bg-brand";
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() =>
                          onToast(
                            filled
                              ? `${a.name} · ${a.unit} ${idx + 1} · occupied`
                              : `${a.name} · ${a.unit} ${idx + 1} · empty`
                          )
                        }
                        className={cn("h-5 rounded-sm hover:opacity-80 transition", cls)}
                        title={`${a.unit} ${idx + 1}`}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* 3. Contents drawer */}
      {drawerArea && (
        <ContentsDrawer
          area={areasData.find((a) => a.key === drawerArea)!}
          items={areaItems(drawerArea)}
          onClose={() => setDrawerArea(null)}
          onAction={onToast}
          onItemAction={itemAction}
        />
      )}
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub: string;
  tone: "brand" | "info" | "success" | "warning" | "danger";
}) {
  const toneCls: Record<string, string> = {
    brand: "bg-brand-soft text-brand",
    info: "bg-info-soft text-info",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
    danger: "bg-danger-soft text-danger",
  };
  return (
    <Card className="p-4 flex items-start gap-3">
      <div className={cn("size-10 rounded-md flex items-center justify-center shrink-0", toneCls[tone])}>
        <Icon className="size-5" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
        <div className="text-2xl font-semibold tabular leading-tight mt-0.5">{value}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>
      </div>
    </Card>
  );
}

function ContentsDrawer({
  area,
  items,
  onClose,
  onAction,
  onItemAction,
}: {
  area: StorageArea;
  items: StoredItem[];
  onClose: () => void;
  onAction: (m: string) => void;
  onItemAction: (id: string, status: string, label: string) => void;
}) {
  const [openMenu, setOpenMenu] = React.useState<string | null>(null);
  const Icon = area.icon;
  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-stretch justify-end"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-2xl overflow-y-auto rounded-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={cn(
            "p-5 border-b border-border sticky top-0 bg-surface z-10",
            area.premium && "bg-linear-to-br from-amber-50/80 to-orange-50/50 dark:from-amber-950/40 dark:to-orange-950/30"
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "size-11 rounded-md flex items-center justify-center",
                  area.premium
                    ? "bg-linear-to-br from-amber-400 to-orange-500 text-white"
                    : "bg-brand-soft text-brand"
                )}
              >
                <Icon className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">{area.name}</h3>
                  {area.premium && (
                    <Badge tone="accent" className="gap-1">
                      <Sparkles className="size-3" /> HVI
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {items.length} items · {area.capacity - items.length} slots free · Custodian {area.custodian}
                </p>
              </div>
            </div>
            <Button size="sm" variant="ghost" onClick={onClose}>
              <X className="size-4" />
            </Button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search this storage area..." className="pl-9" />
            </div>
            <Button size="sm" variant="outline" onClick={() => onAction(`Audit started for ${area.name}`)}>
              <FileSignature className="size-4" /> Audit
            </Button>
          </div>
        </div>

        <div className="p-0">
          {items.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <Package className="size-8 mx-auto mb-2 opacity-50" />
              No items currently stored in {area.name}.
            </div>
          )}
          <table className="w-full text-sm">
            <thead className="bg-surface-sunken/40">
              <tr className="text-[10px] uppercase text-muted-foreground tracking-wider">
                <th className="text-left px-4 py-2 font-medium">Item</th>
                <th className="text-left px-4 py-2 font-medium">Slot</th>
                <th className="text-left px-4 py-2 font-medium">Stored</th>
                <th className="text-left px-4 py-2 font-medium">Held</th>
                <th className="text-right px-4 py-2 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => {
                const overdue = i.daysHeld > i.retentionDays;
                return (
                  <tr key={i.id} className="border-t border-border align-top">
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-2.5">
                        <div className={cn("size-10 rounded shrink-0 flex items-center justify-center", i.photo)}>
                          <ImageIcon className="size-4 text-white/60" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-medium leading-tight">{i.name}</div>
                          <div className="text-[10px] text-muted-foreground tabular mt-0.5">
                            {i.id}
                            {i.value ? ` · ${money(i.value)}` : ""}
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            By {i.storedBy} · Verified {i.verifiedBy}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={area.premium ? "accent" : "neutral"} className="tabular">
                        {i.slot}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {i.storedOn}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={overdue ? "danger" : i.daysHeld > i.retentionDays - 7 ? "warning" : "neutral"}>
                        <span className="tabular">{i.daysHeld}d</span>
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right relative">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setOpenMenu(openMenu === i.id ? null : i.id)}
                      >
                        <MoreVertical className="size-4" />
                      </Button>
                      {openMenu === i.id && (
                        <div className="absolute right-4 top-12 z-20 bg-surface border border-border rounded-md shadow-lg w-40 py-1">
                          <MenuItem
                            icon={ArrowRightLeft}
                            label="Move"
                            onClick={() => {
                              onAction(`Move requested for ${i.id}`);
                              setOpenMenu(null);
                            }}
                          />
                          <MenuItem
                            icon={PackageCheck}
                            label="Return"
                            onClick={() => {
                              onItemAction(i.id, "Returned", "Returned");
                              setOpenMenu(null);
                            }}
                          />
                          <MenuItem
                            icon={Trash2}
                            label="Dispose"
                            danger
                            onClick={() => {
                              onItemAction(i.id, "Disposed", "Disposed");
                              setOpenMenu(null);
                            }}
                          />
                        </div>
                      )}
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

function MenuItem({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-surface-sunken",
        danger && "text-danger"
      )}
    >
      <Icon className="size-3.5" />
      {label}
    </button>
  );
}
