"use client";
import * as React from "react";
import {
  Settings,
  Hash,
  Eye,
  MapPin,
  IndianRupee,
  Clock,
  ShieldAlert,
  Bell,
  Truck,
  Users,
  Building2,
  Save,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  AlertTriangle,
  Sparkles,
  KeyRound,
  PenTool,
  ShieldCheck,
  MessageSquare,
  Mail,
  Smartphone,
  Bell as BellRing,
  FileText,
  Camera,
  UserCheck,
  Gavel,
  ChevronRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn, money } from "@/lib/utils";
import { apiGet, apiPut } from "@/lib/api";

type SectionId =
  | "general"
  | "retention"
  | "highvalue"
  | "notifications"
  | "return"
  | "permissions"
  | "branches";

type Section = {
  id: SectionId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  desc: string;
};

const SECTIONS: Section[] = [
  { id: "general", label: "General", icon: Settings, desc: "ID format, storage, thresholds" },
  { id: "retention", label: "Retention Policy", icon: Clock, desc: "Category-wise hold periods" },
  { id: "highvalue", label: "High-Value Rules", icon: ShieldAlert, desc: "HVI classification & approvals" },
  { id: "notifications", label: "Notifications", icon: Bell, desc: "Channels & triggers" },
  { id: "return", label: "Return Policy", icon: Truck, desc: "Handover & courier rules" },
  { id: "permissions", label: "Staff Permissions", icon: Users, desc: "Role × action matrix" },
  { id: "branches", label: "Branches", icon: Building2, desc: "Multi-property overrides" },
];

type Toggle = { id: string; label: string; on: boolean };

type RetentionRow = {
  id: string;
  category: string;
  days: number;
  action: string;
  note: string;
};

const INITIAL_RETENTION: RetentionRow[] = [
  { id: "r1", category: "Food / Perishables", days: 1, action: "Dispose", note: "Same day if spoiled" },
  { id: "r2", category: "Clothes", days: 30, action: "Donate", note: "After wash" },
  { id: "r3", category: "General", days: 60, action: "Auction / Donate", note: "Standard hold" },
  { id: "r4", category: "Electronics", days: 90, action: "Donate / Auction", note: "Wipe data first" },
  { id: "r5", category: "Documents", days: 180, action: "Shred", note: "Privacy compliant" },
  { id: "r6", category: "Passport / ID", days: 7, action: "Police handover", note: "Mandatory by law" },
  { id: "r7", category: "Cash / Jewellery", days: 180, action: "Manager safe → handover", note: "Sealed envelope" },
  { id: "r8", category: "Medicine", days: 7, action: "Dispose", note: "Verify expiry" },
];

const HVI_ITEM_TOGGLES: Toggle[] = [
  { id: "cash", label: "Cash", on: true },
  { id: "jewel", label: "Jewellery", on: true },
  { id: "passport", label: "Passport", on: true },
  { id: "id", label: "Government ID", on: true },
  { id: "laptop", label: "Laptop", on: true },
  { id: "mobile", label: "Mobile / Smartphone", on: true },
  { id: "watch", label: "Watch", on: true },
  { id: "card", label: "Credit / Debit card", on: true },
  { id: "docs", label: "Important documents", on: false },
];

const CHANNELS = ["SMS", "WhatsApp", "Email", "In-app"] as const;
type Channel = (typeof CHANNELS)[number];

const TRIGGERS = [
  "Found and linked",
  "Possible match",
  "Verification required",
  "Ready for pickup",
  "Courier dispatched",
  "Returned",
  "Storage expiry",
  "Disposal notice",
] as const;
type Trigger = (typeof TRIGGERS)[number];

const ROLES = ["Admin", "Front Office", "Housekeeping", "Security", "Manager", "Accounts"] as const;
type Role = (typeof ROLES)[number];

const ACTIONS = [
  "Create",
  "Edit",
  "Move",
  "Return",
  "Approve disposal",
  "View reports",
  "Configure settings",
  "Delete",
] as const;
type Action = (typeof ACTIONS)[number];

const INITIAL_MATRIX: Record<Role, Record<Action, boolean>> = {
  Admin: {
    Create: true, Edit: true, Move: true, Return: true, "Approve disposal": true,
    "View reports": true, "Configure settings": true, Delete: true,
  },
  "Front Office": {
    Create: true, Edit: true, Move: true, Return: true, "Approve disposal": false,
    "View reports": true, "Configure settings": false, Delete: false,
  },
  Housekeeping: {
    Create: true, Edit: false, Move: true, Return: false, "Approve disposal": false,
    "View reports": false, "Configure settings": false, Delete: false,
  },
  Security: {
    Create: true, Edit: true, Move: true, Return: false, "Approve disposal": false,
    "View reports": true, "Configure settings": false, Delete: false,
  },
  Manager: {
    Create: true, Edit: true, Move: true, Return: true, "Approve disposal": true,
    "View reports": true, "Configure settings": true, Delete: true,
  },
  Accounts: {
    Create: false, Edit: false, Move: false, Return: false, "Approve disposal": false,
    "View reports": true, "Configure settings": false, Delete: false,
  },
};

type Branch = {
  id: string;
  name: string;
  city: string;
  rooms: number;
  override: boolean;
  primary?: boolean;
};

const INITIAL_BRANCHES: Branch[] = [
  { id: "b1", name: "The Pearl Marina", city: "Mumbai", rooms: 184, override: false, primary: true },
];

export default function SettingsTab({ onToast }: { onToast: (m: string) => void }) {
  const [active, setActive] = React.useState<SectionId>("general");

  // General
  const [idFormat, setIdFormat] = React.useState("LF/{YYYY}/{####}");
  const [storageArea, setStorageArea] = React.useState("Locker Room — Basement Level 1");
  const [threshold, setThreshold] = React.useState(5000);

  // Retention
  const [retention, setRetention] = React.useState<RetentionRow[]>(INITIAL_RETENTION);
  const [editingRow, setEditingRow] = React.useState<string | null>(null);

  // High-value
  const [hviThreshold, setHviThreshold] = React.useState(5000);
  const [hviItems, setHviItems] = React.useState<Toggle[]>(HVI_ITEM_TOGGLES);
  const [hviApproval, setHviApproval] = React.useState(true);
  const [hviOtp, setHviOtp] = React.useState(true);
  const [hviSignature, setHviSignature] = React.useState(true);

  // Notifications
  const [notif, setNotif] = React.useState<Record<Trigger, Record<Channel, boolean>>>(() => {
    const seed: Record<string, Record<string, boolean>> = {};
    TRIGGERS.forEach((t) => {
      seed[t] = {
        SMS: t === "Ready for pickup" || t === "Verification required",
        WhatsApp: true,
        Email: t !== "Possible match",
        "In-app": true,
      };
    });
    return seed as Record<Trigger, Record<Channel, boolean>>;
  });

  // Return policy
  const [courierAllowed, setCourierAllowed] = React.useState(true);
  const [photoOnReturn, setPhotoOnReturn] = React.useState(true);
  const [witnessHvi, setWitnessHvi] = React.useState(true);
  const [policeHandover, setPoliceHandover] = React.useState(true);
  const [courierVendor, setCourierVendor] = React.useState("Blue Dart");

  // Permissions
  const [matrix, setMatrix] = React.useState(INITIAL_MATRIX);

  // Branches
  const [branches, setBranches] = React.useState<Branch[]>(INITIAL_BRANCHES);

  // Hydrate every section from the persisted JSON blob (settings/lost-found).
  React.useEffect(() => {
    let cancelled = false;
    apiGet<Record<string, unknown>>("/settings/lost-found")
      .then((c) => {
        if (cancelled || !c || typeof c !== "object" || !Object.keys(c).length) return;
        if (typeof c.idFormat === "string") setIdFormat(c.idFormat);
        if (typeof c.storageArea === "string") setStorageArea(c.storageArea);
        if (typeof c.threshold === "number") setThreshold(c.threshold);
        if (Array.isArray(c.retention)) setRetention(c.retention as RetentionRow[]);
        if (typeof c.hviThreshold === "number") setHviThreshold(c.hviThreshold);
        if (Array.isArray(c.hviItems)) setHviItems(c.hviItems as Toggle[]);
        if (typeof c.hviApproval === "boolean") setHviApproval(c.hviApproval);
        if (typeof c.hviOtp === "boolean") setHviOtp(c.hviOtp);
        if (typeof c.hviSignature === "boolean") setHviSignature(c.hviSignature);
        if (c.notif && typeof c.notif === "object") setNotif(c.notif as Record<Trigger, Record<Channel, boolean>>);
        if (typeof c.courierAllowed === "boolean") setCourierAllowed(c.courierAllowed);
        if (typeof c.photoOnReturn === "boolean") setPhotoOnReturn(c.photoOnReturn);
        if (typeof c.witnessHvi === "boolean") setWitnessHvi(c.witnessHvi);
        if (typeof c.policeHandover === "boolean") setPoliceHandover(c.policeHandover);
        if (typeof c.courierVendor === "string") setCourierVendor(c.courierVendor);
        if (c.matrix && typeof c.matrix === "object") setMatrix(c.matrix as typeof INITIAL_MATRIX);
        if (Array.isArray(c.branches)) setBranches(c.branches as Branch[]);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Persist the whole config; called whenever a section's Save bar fires.
  const persist = () => {
    apiPut("/settings/lost-found", {
      idFormat, storageArea, threshold,
      retention, hviThreshold, hviItems, hviApproval, hviOtp, hviSignature,
      notif, courierAllowed, photoOnReturn, witnessHvi, policeHandover, courierVendor,
      matrix, branches,
    }).catch(() => {});
  };
  const saveToast = (m: string) => {
    if (/saved/i.test(m)) persist();
    onToast(m);
  };

  const idPreview = idFormat
    .replace("{YYYY}", "2026")
    .replace("{MM}", "06")
    .replace("{DD}", "02")
    .replace("{####}", "0247");

  const toggleHvi = (id: string) => {
    setHviItems((prev) =>
      prev.map((t) => (t.id === id ? { ...t, on: !t.on } : t))
    );
  };

  const toggleNotif = (trigger: Trigger, channel: Channel) => {
    setNotif((prev) => ({
      ...prev,
      [trigger]: { ...prev[trigger], [channel]: !prev[trigger][channel] },
    }));
  };

  const togglePerm = (role: Role, action: Action) => {
    setMatrix((prev) => ({
      ...prev,
      [role]: { ...prev[role], [action]: !prev[role][action] },
    }));
  };

  const updateRetention = (id: string, patch: Partial<RetentionRow>) => {
    setRetention((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const channelIcon = (c: Channel) => {
    if (c === "SMS") return Smartphone;
    if (c === "WhatsApp") return MessageSquare;
    if (c === "Email") return Mail;
    return BellRing;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-12 gap-4">
        {/* Left vertical nav */}
        <div className="col-span-12 md:col-span-3 lg:col-span-3">
          <Card className="overflow-hidden">
            <div className="border-b border-border p-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-soft text-brand">
                  <Settings className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">Configuration</div>
                  <div className="text-[11px] text-muted-foreground">Lost & Found settings</div>
                </div>
              </div>
            </div>
            <nav className="flex flex-col p-2">
              {SECTIONS.map((s) => {
                const Icon = s.icon;
                const isActive = active === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setActive(s.id)}
                    className={cn(
                      "group flex items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors",
                      isActive
                        ? "bg-brand-soft text-brand-soft-foreground"
                        : "hover:bg-surface-sunken text-foreground"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        isActive ? "text-brand" : "text-muted-foreground"
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{s.label}</div>
                      <div className="truncate text-[11px] text-muted-foreground">
                        {s.desc}
                      </div>
                    </div>
                    <ChevronRight
                      className={cn(
                        "h-3.5 w-3.5 shrink-0 transition-transform",
                        isActive ? "text-brand translate-x-0.5" : "text-muted-foreground opacity-0 group-hover:opacity-100"
                      )}
                    />
                  </button>
                );
              })}
            </nav>
            <div className="border-t border-border bg-surface-sunken/40 p-3">
              <div className="flex items-start gap-2">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Configure once; rules apply across all 184 rooms of The Pearl Marina, Mumbai.
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Right content */}
        <div className="col-span-12 md:col-span-9 lg:col-span-9">
          {active === "general" && (
            <GeneralSection
              idFormat={idFormat}
              setIdFormat={setIdFormat}
              idPreview={idPreview}
              storageArea={storageArea}
              setStorageArea={setStorageArea}
              threshold={threshold}
              setThreshold={setThreshold}
              onToast={saveToast}
            />
          )}
          {active === "retention" && (
            <RetentionSection
              rows={retention}
              editingRow={editingRow}
              setEditingRow={setEditingRow}
              updateRetention={updateRetention}
              onToast={saveToast}
            />
          )}
          {active === "highvalue" && (
            <HighValueSection
              hviThreshold={hviThreshold}
              setHviThreshold={setHviThreshold}
              items={hviItems}
              toggleHvi={toggleHvi}
              hviApproval={hviApproval}
              setHviApproval={setHviApproval}
              hviOtp={hviOtp}
              setHviOtp={setHviOtp}
              hviSignature={hviSignature}
              setHviSignature={setHviSignature}
              onToast={saveToast}
            />
          )}
          {active === "notifications" && (
            <NotificationsSection
              notif={notif}
              toggleNotif={toggleNotif}
              channelIcon={channelIcon}
              onToast={saveToast}
            />
          )}
          {active === "return" && (
            <ReturnSection
              courierAllowed={courierAllowed}
              setCourierAllowed={setCourierAllowed}
              photoOnReturn={photoOnReturn}
              setPhotoOnReturn={setPhotoOnReturn}
              witnessHvi={witnessHvi}
              setWitnessHvi={setWitnessHvi}
              policeHandover={policeHandover}
              setPoliceHandover={setPoliceHandover}
              courierVendor={courierVendor}
              setCourierVendor={setCourierVendor}
              onToast={saveToast}
            />
          )}
          {active === "permissions" && (
            <PermissionsSection
              matrix={matrix}
              togglePerm={togglePerm}
              onToast={saveToast}
            />
          )}
          {active === "branches" && (
            <BranchesSection
              branches={branches}
              setBranches={setBranches}
              onToast={saveToast}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Reusable bits ---------- */

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  tone = "brand",
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  tone?: "brand" | "amber" | "info";
}) {
  const bg =
    tone === "amber"
      ? "bg-linear-to-br from-amber-400 to-orange-500 text-white"
      : tone === "info"
      ? "bg-info-soft text-info"
      : "bg-brand-soft text-brand";
  return (
    <div className="flex items-center gap-3 border-b border-border p-4">
      <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", bg)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

function SaveBar({ onSave, label = "Save changes" }: { onSave: () => void; label?: string }) {
  return (
    <div className="flex items-center justify-end gap-2 border-t border-border bg-surface-sunken/30 p-4">
      <Button size="sm" variant="ghost" onClick={() => {}}>
        Discard
      </Button>
      <Button size="sm" onClick={onSave}>
        <Save className="h-3.5 w-3.5" />
        {label}
      </Button>
    </div>
  );
}

function ToggleSwitch({
  on,
  onChange,
}: {
  on: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onChange}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full px-0.5 transition-colors",
        on ? "bg-success justify-end" : "bg-zinc-300 dark:bg-zinc-600 justify-start"
      )}
    >
      <span className="inline-block h-5 w-5 rounded-full bg-white shadow-sm" />
    </button>
  );
}

function ToggleRow({
  icon: Icon,
  title,
  desc,
  on,
  onChange,
  tone = "neutral",
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  on: boolean;
  onChange: () => void;
  tone?: "neutral" | "amber";
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-md border border-border bg-surface p-3">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
            tone === "amber"
              ? "bg-linear-to-br from-amber-400 to-orange-500 text-white"
              : "bg-surface-sunken text-muted-foreground"
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="text-sm font-medium text-foreground">{title}</div>
          <div className="text-xs text-muted-foreground">{desc}</div>
        </div>
      </div>
      <ToggleSwitch on={on} onChange={onChange} />
    </div>
  );
}

/* ---------- GENERAL ---------- */

function GeneralSection({
  idFormat,
  setIdFormat,
  idPreview,
  storageArea,
  setStorageArea,
  threshold,
  setThreshold,
  onToast,
}: {
  idFormat: string;
  setIdFormat: (v: string) => void;
  idPreview: string;
  storageArea: string;
  setStorageArea: (v: string) => void;
  threshold: number;
  setThreshold: (v: number) => void;
  onToast: (m: string) => void;
}) {
  return (
    <Card className="overflow-hidden">
      <SectionHeader
        icon={Settings}
        title="General"
        subtitle="Item ID format, default storage location, and value thresholds"
      />
      <div className="space-y-5 p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="id-format">
              <span className="flex items-center gap-1.5">
                <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                Auto item ID format
              </span>
            </Label>
            <Input
              id="id-format"
              value={idFormat}
              onChange={(e) => setIdFormat(e.target.value)}
              placeholder="LF/{YYYY}/{####}"
            />
            <div className="flex flex-wrap items-center gap-1.5">
              {["{YYYY}", "{MM}", "{DD}", "{####}"].map((token) => (
                <button
                  key={token}
                  onClick={() => setIdFormat(idFormat + token)}
                  className="rounded-md border border-border bg-surface-sunken/40 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground"
                >
                  {token}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>
              <span className="flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                Live preview
              </span>
            </Label>
            <div className="flex h-10 items-center rounded-md border border-dashed border-border bg-surface-sunken/40 px-3">
              <Badge tone="brand" className="tabular font-mono">
                {idPreview}
              </Badge>
              <span className="ml-2 text-[11px] text-muted-foreground">
                next ticket
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="storage">
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                Default storage area
              </span>
            </Label>
            <Select
              id="storage"
              value={storageArea}
              onChange={(e) => setStorageArea(e.target.value)}
            >
              <option>Locker Room — Basement Level 1</option>
              <option>Front Office — Cabinet A</option>
              <option>Housekeeping — Linen Store</option>
              <option>Security — Vault Room</option>
              <option>Manager safe — Admin Office</option>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="thr">
              <span className="flex items-center gap-1.5">
                <IndianRupee className="h-3.5 w-3.5 text-muted-foreground" />
                Default high-value threshold
              </span>
            </Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                ₹
              </span>
              <Input
                id="thr"
                type="number"
                className="pl-7 tabular"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value) || 0)}
              />
            </div>
            <div className="text-[11px] text-muted-foreground">
              Items above <span className="tabular font-medium text-foreground">{money(threshold)}</span> auto-flagged as HVI
            </div>
          </div>
        </div>

        <div className="rounded-md border border-amber-500/30 bg-linear-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <div className="text-xs text-foreground">
              <span className="font-medium">Heads-up:</span> Changing the ID format does not retroactively rename existing tickets. New tickets only.
            </div>
          </div>
        </div>
      </div>
      <SaveBar onSave={() => onToast("General settings saved")} />
    </Card>
  );
}

/* ---------- RETENTION ---------- */

function RetentionSection({
  rows,
  editingRow,
  setEditingRow,
  updateRetention,
  onToast,
}: {
  rows: RetentionRow[];
  editingRow: string | null;
  setEditingRow: (id: string | null) => void;
  updateRetention: (id: string, patch: Partial<RetentionRow>) => void;
  onToast: (m: string) => void;
}) {
  return (
    <Card className="overflow-hidden">
      <SectionHeader
        icon={Clock}
        title="Retention Policy"
        subtitle="Per-category storage period before disposal or handover"
      />
      <div className="p-4">
        <table className="w-full text-sm">
          <thead className="bg-surface-sunken/40">
            <tr>
              <th className="px-3 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Category
              </th>
              <th className="px-3 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Hold (days)
              </th>
              <th className="px-3 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Action after expiry
              </th>
              <th className="px-3 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Note
              </th>
              <th className="px-3 py-2 text-right text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {""}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => {
              const isEditing = editingRow === r.id;
              const tone =
                r.days <= 7 ? "danger" : r.days <= 30 ? "warning" : r.days <= 90 ? "info" : "neutral";
              return (
                <tr key={r.id} className="hover:bg-surface-sunken/30">
                  <td className="px-3 py-2.5">
                    <div className="font-medium text-foreground">{r.category}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    {isEditing ? (
                      <Input
                        type="number"
                        className="h-8 w-24 tabular"
                        value={r.days}
                        onChange={(e) =>
                          updateRetention(r.id, { days: Number(e.target.value) || 0 })
                        }
                      />
                    ) : (
                      <Badge tone={tone} className="tabular">
                        {r.days} day{r.days !== 1 ? "s" : ""}
                      </Badge>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {isEditing ? (
                      <Select
                        className="h-8"
                        value={r.action}
                        onChange={(e) => updateRetention(r.id, { action: e.target.value })}
                      >
                        <option>Dispose</option>
                        <option>Donate</option>
                        <option>Auction / Donate</option>
                        <option>Donate / Auction</option>
                        <option>Shred</option>
                        <option>Police handover</option>
                        <option>Manager safe → handover</option>
                      </Select>
                    ) : (
                      <span className="text-foreground">{r.action}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {isEditing ? (
                      <Input
                        className="h-8"
                        value={r.note}
                        onChange={(e) => updateRetention(r.id, { note: e.target.value })}
                      />
                    ) : (
                      <span className="text-muted-foreground text-xs">{r.note}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {isEditing ? (
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingRow(null)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            setEditingRow(null);
                            onToast(`${r.category} updated to ${r.days} days`);
                          }}
                        >
                          <Check className="h-3.5 w-3.5" />
                          Done
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingRow(r.id)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground">
            Indian Hotels Association best practice — passports must go to local police within 7 days.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onToast("Add category dialog — coming soon")}
          >
            <Plus className="h-3.5 w-3.5" />
            Add category
          </Button>
        </div>
      </div>
      <SaveBar onSave={() => onToast("Retention policy saved")} />
    </Card>
  );
}

/* ---------- HIGH VALUE ---------- */

function HighValueSection({
  hviThreshold,
  setHviThreshold,
  items,
  toggleHvi,
  hviApproval,
  setHviApproval,
  hviOtp,
  setHviOtp,
  hviSignature,
  setHviSignature,
  onToast,
}: {
  hviThreshold: number;
  setHviThreshold: (v: number) => void;
  items: Toggle[];
  toggleHvi: (id: string) => void;
  hviApproval: boolean;
  setHviApproval: (v: boolean) => void;
  hviOtp: boolean;
  setHviOtp: (v: boolean) => void;
  hviSignature: boolean;
  setHviSignature: (v: boolean) => void;
  onToast: (m: string) => void;
}) {
  const enabledCount = items.filter((i) => i.on).length;
  return (
    <Card className="overflow-hidden">
      <SectionHeader
        icon={ShieldAlert}
        title="High-Value Rules"
        subtitle="Items classified as HVI need approval, OTP, and signature on return"
        tone="amber"
      />
      <div className="space-y-5 p-4">
        {/* Threshold */}
        <div className="rounded-lg border border-border bg-linear-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px] space-y-2">
              <Label htmlFor="hvi-thr">
                <span className="flex items-center gap-1.5">
                  <IndianRupee className="h-3.5 w-3.5 text-amber-600" />
                  Auto-classify as HVI when value exceeds
                </span>
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-amber-700 dark:text-amber-400">
                  ₹
                </span>
                <Input
                  id="hvi-thr"
                  type="number"
                  className="pl-7 tabular"
                  value={hviThreshold}
                  onChange={(e) => setHviThreshold(Number(e.target.value) || 0)}
                />
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Current threshold
              </div>
              <div className="tabular text-2xl font-bold text-foreground">
                {money(hviThreshold)}
              </div>
            </div>
          </div>
        </div>

        {/* Always HVI */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-foreground">Always classified as HVI</h4>
              <p className="text-[11px] text-muted-foreground">
                Regardless of declared value, these item types follow HVI protocol
              </p>
            </div>
            <Badge tone="warning" className="tabular">
              {enabledCount} of {items.length} enabled
            </Badge>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((it) => (
              <label
                key={it.id}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 transition-colors",
                  it.on
                    ? "border-amber-500/40 bg-amber-50 dark:bg-amber-950/20"
                    : "border-border bg-surface hover:bg-surface-sunken/40"
                )}
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 cursor-pointer accent-amber-500"
                  checked={it.on}
                  onChange={() => toggleHvi(it.id)}
                />
                <span
                  className={cn(
                    "text-sm",
                    it.on ? "font-medium text-foreground" : "text-muted-foreground"
                  )}
                >
                  {it.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Workflow toggles */}
        <div>
          <h4 className="mb-2 text-sm font-semibold text-foreground">Return workflow for HVI</h4>
          <div className="space-y-2">
            <ToggleRow
              icon={ShieldCheck}
              title="Manager approval workflow"
              desc="HVI items require manager sign-off before handover"
              on={hviApproval}
              onChange={() => setHviApproval(!hviApproval)}
              tone="amber"
            />
            <ToggleRow
              icon={KeyRound}
              title="OTP verification on return"
              desc="6-digit OTP sent to guest's registered mobile before release"
              on={hviOtp}
              onChange={() => setHviOtp(!hviOtp)}
              tone="amber"
            />
            <ToggleRow
              icon={PenTool}
              title="Digital signature mandatory"
              desc="Guest signs on tablet — stored with the case file"
              on={hviSignature}
              onChange={() => setHviSignature(!hviSignature)}
              tone="amber"
            />
          </div>
        </div>
      </div>
      <SaveBar onSave={() => onToast("High-value rules saved")} />
    </Card>
  );
}

/* ---------- NOTIFICATIONS ---------- */

function NotificationsSection({
  notif,
  toggleNotif,
  channelIcon,
  onToast,
}: {
  notif: Record<Trigger, Record<Channel, boolean>>;
  toggleNotif: (t: Trigger, c: Channel) => void;
  channelIcon: (c: Channel) => React.ComponentType<{ className?: string }>;
  onToast: (m: string) => void;
}) {
  return (
    <Card className="overflow-hidden">
      <SectionHeader
        icon={Bell}
        title="Notifications"
        subtitle="Choose which triggers fire on which channels"
        tone="info"
      />
      <div className="p-4">
        <table className="w-full text-sm">
          <thead className="bg-surface-sunken/40">
            <tr>
              <th className="px-3 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Trigger
              </th>
              {CHANNELS.map((c) => {
                const Icon = channelIcon(c);
                return (
                  <th
                    key={c}
                    className="px-3 py-2 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <Icon className="h-3.5 w-3.5" />
                      {c}
                    </div>
                  </th>
                );
              })}
              <th className="px-3 py-2 text-right text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Template
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {TRIGGERS.map((t) => (
              <tr key={t} className="hover:bg-surface-sunken/30">
                <td className="px-3 py-2.5">
                  <div className="font-medium text-foreground">{t}</div>
                </td>
                {CHANNELS.map((c) => (
                  <td key={c} className="px-3 py-2.5 text-center">
                    <ToggleSwitch
                      on={notif[t][c]}
                      onChange={() => toggleNotif(t, c)}
                    />
                  </td>
                ))}
                <td className="px-3 py-2.5 text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onToast(`Editing "${t}" template`)}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-3 flex items-center justify-between rounded-md border border-border bg-surface-sunken/40 p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MessageSquare className="h-3.5 w-3.5" />
            WhatsApp Business API connected · sender ID:
            <span className="font-mono font-medium text-foreground">PEARL-MARINA</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onToast("Sending test notification to manager")}
          >
            Send test
          </Button>
        </div>
      </div>
      <SaveBar onSave={() => onToast("Notification settings saved")} />
    </Card>
  );
}

/* ---------- RETURN POLICY ---------- */

function ReturnSection({
  courierAllowed,
  setCourierAllowed,
  photoOnReturn,
  setPhotoOnReturn,
  witnessHvi,
  setWitnessHvi,
  policeHandover,
  setPoliceHandover,
  courierVendor,
  setCourierVendor,
  onToast,
}: {
  courierAllowed: boolean;
  setCourierAllowed: (v: boolean) => void;
  photoOnReturn: boolean;
  setPhotoOnReturn: (v: boolean) => void;
  witnessHvi: boolean;
  setWitnessHvi: (v: boolean) => void;
  policeHandover: boolean;
  setPoliceHandover: (v: boolean) => void;
  courierVendor: string;
  setCourierVendor: (v: string) => void;
  onToast: (m: string) => void;
}) {
  return (
    <Card className="overflow-hidden">
      <SectionHeader
        icon={Truck}
        title="Return Policy"
        subtitle="Rules governing how items get back to guests"
      />
      <div className="space-y-4 p-4">
        <div className="space-y-2">
          <ToggleRow
            icon={Truck}
            title="Courier shipping allowed"
            desc="Guests in another city can request a paid courier"
            on={courierAllowed}
            onChange={() => setCourierAllowed(!courierAllowed)}
          />

          {courierAllowed && (
            <div className="ml-11 grid grid-cols-1 gap-3 rounded-md border border-dashed border-border p-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="vendor" className="text-xs">
                  Preferred courier vendor
                </Label>
                <Select
                  id="vendor"
                  className="h-9"
                  value={courierVendor}
                  onChange={(e) => setCourierVendor(e.target.value)}
                >
                  <option>Blue Dart</option>
                  <option>DTDC</option>
                  <option>India Post — Speed Post</option>
                  <option>Delhivery</option>
                  <option>FedEx India</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Charge to guest</Label>
                <Select className="h-9" defaultValue="Actuals + 15% handling">
                  <option>Actuals only</option>
                  <option>Actuals + 15% handling</option>
                  <option>Flat ₹500</option>
                  <option>Complimentary</option>
                </Select>
              </div>
            </div>
          )}

          <ToggleRow
            icon={Camera}
            title="Mandatory photo on return"
            desc="Capture item handover image (guest holding the item) for the case file"
            on={photoOnReturn}
            onChange={() => setPhotoOnReturn(!photoOnReturn)}
          />

          <ToggleRow
            icon={UserCheck}
            title="Witness required for HVI return"
            desc="Second staff member must co-sign for high-value items"
            on={witnessHvi}
            onChange={() => setWitnessHvi(!witnessHvi)}
            tone="amber"
          />

          <ToggleRow
            icon={Gavel}
            title="Police handover for unclaimed ID / Passport"
            desc="Auto-route to nearest police station after 7 days (Colaba PS for Pearl Marina)"
            on={policeHandover}
            onChange={() => setPoliceHandover(!policeHandover)}
          />
        </div>

        <div className="rounded-md border border-info/30 bg-info-soft/50 p-3">
          <div className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-info" />
            <div className="text-xs">
              <div className="font-medium text-foreground">Compliance note</div>
              <div className="text-muted-foreground">
                Foreigner passports trigger FRRO notification automatically as per MHA guidelines.
              </div>
            </div>
          </div>
        </div>
      </div>
      <SaveBar onSave={() => onToast("Return policy saved")} />
    </Card>
  );
}

/* ---------- PERMISSIONS ---------- */

function PermissionsSection({
  matrix,
  togglePerm,
  onToast,
}: {
  matrix: Record<Role, Record<Action, boolean>>;
  togglePerm: (r: Role, a: Action) => void;
  onToast: (m: string) => void;
}) {
  return (
    <Card className="overflow-hidden">
      <SectionHeader
        icon={Users}
        title="Staff Permissions"
        subtitle="Role × action matrix — who can do what"
      />
      <div className="overflow-x-auto p-4">
        <table className="w-full text-sm">
          <thead className="bg-surface-sunken/40">
            <tr>
              <th className="sticky left-0 z-10 bg-surface-sunken/40 px-3 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Role
              </th>
              {ACTIONS.map((a) => (
                <th
                  key={a}
                  className="px-2 py-2 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
                >
                  {a}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {ROLES.map((role) => {
              const row = matrix[role];
              const granted = ACTIONS.filter((a) => row[a]).length;
              const tone =
                granted === ACTIONS.length
                  ? "success"
                  : granted === 0
                  ? "neutral"
                  : "info";
              return (
                <tr key={role} className="hover:bg-surface-sunken/30">
                  <td className="sticky left-0 z-10 bg-surface px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-foreground">{role}</div>
                      <Badge tone={tone} className="tabular text-[10px]">
                        {granted}/{ACTIONS.length}
                      </Badge>
                    </div>
                  </td>
                  {ACTIONS.map((a) => (
                    <td key={a} className="px-2 py-2.5 text-center">
                      <label className="inline-flex cursor-pointer">
                        <input
                          type="checkbox"
                          className="h-4 w-4 cursor-pointer accent-brand"
                          checked={row[a]}
                          onChange={() => togglePerm(role, a)}
                        />
                      </label>
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Badge tone="success" className="text-[10px]">All</Badge>
              full access
            </span>
            <span className="flex items-center gap-1">
              <Badge tone="info" className="text-[10px]">Partial</Badge>
              restricted
            </span>
            <span className="flex items-center gap-1">
              <Badge tone="neutral" className="text-[10px]">None</Badge>
              view-only or blocked
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onToast("Copying Front Office permissions as template")}
          >
            Copy from role
          </Button>
        </div>
      </div>
      <SaveBar onSave={() => onToast("Permission matrix saved")} />
    </Card>
  );
}

/* ---------- BRANCHES ---------- */

function BranchesSection({
  branches,
  setBranches,
  onToast,
}: {
  branches: Branch[];
  setBranches: React.Dispatch<React.SetStateAction<Branch[]>>;
  onToast: (m: string) => void;
}) {
  const toggleOverride = (id: string) => {
    setBranches((prev) =>
      prev.map((b) => (b.id === id ? { ...b, override: !b.override } : b))
    );
  };

  return (
    <Card className="overflow-hidden">
      <SectionHeader
        icon={Building2}
        title="Branches"
        subtitle="Multi-property chain — per-branch policy overrides"
      />
      <div className="space-y-3 p-4">
        {branches.map((b) => (
          <div
            key={b.id}
            className="flex flex-wrap items-center gap-4 rounded-md border border-border bg-surface p-3"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-soft text-brand">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <div className="text-sm font-semibold text-foreground">{b.name}</div>
                  {b.primary && (
                    <Badge tone="brand" className="text-[10px]">Primary</Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {b.city} · <span className="tabular">{b.rooms}</span> rooms
                </div>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Custom policy</span>
                <ToggleSwitch
                  on={b.override}
                  onChange={() => toggleOverride(b.id)}
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onToast(`Opening ${b.name} policy editor`)}
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
              {!b.primary && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onToast(`${b.name} removed from chain`)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        ))}

        <button
          onClick={() => onToast("Add branch — connect new property")}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-border bg-surface-sunken/30 px-3 py-4 text-sm text-muted-foreground transition-colors hover:bg-surface-sunken/60 hover:text-foreground"
        >
          <Plus className="h-4 w-4" />
          Add another branch
        </button>

        <div className="rounded-md border border-border bg-surface-sunken/40 p-3">
          <div className="flex items-start gap-2">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <div className="text-xs">
              <div className="font-medium text-foreground">Chain rollout (Enterprise)</div>
              <div className="text-muted-foreground">
                Push centralized policies to all properties · audit log keeps per-branch deltas.
              </div>
            </div>
          </div>
        </div>
      </div>
      <SaveBar onSave={() => onToast("Branch settings saved")} />
    </Card>
  );
}
