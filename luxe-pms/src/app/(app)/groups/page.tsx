"use client";
import * as React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Plus, Search, UsersRound, BedDouble, Wallet, Calendar, FileDown,
  Eye, Edit, Ban, MoreHorizontal, X, CheckCircle2, AlertTriangle,
  Phone, Mail, MessageCircle, Printer, CalendarRange,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { isValidPhone } from "@/lib/phone";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { KPICard } from "@/components/ui/kpi-card";
import { GROUP_BOOKINGS, type GroupStatus, type GroupType, type GroupBooking } from "@/lib/mock-data-ext";
import { money, cn, formatDate } from "@/lib/utils";
import { apiGet, apiPut, sendEmail } from "@/lib/api";
import { type GroupPolicies, DEFAULT_POLICIES } from "@/app/(app)/setup/group-policies-manager";

const STATUS_TONE: Record<GroupStatus, "neutral" | "info" | "success" | "brand" | "warning" | "danger"> = {
  draft: "neutral",
  tentative: "warning",
  confirmed: "info",
  "in-house": "brand",
  completed: "success",
  cancelled: "danger",
};

const TYPE_TONE: Record<GroupType, "brand" | "info" | "accent" | "warning" | "success" | "neutral"> = {
  Wedding: "brand",
  Conference: "info",
  "Tour Group": "accent",
  "Sports Team": "warning",
  "Corporate Retreat": "success",
  Other: "neutral",
};

type DateWindow = "all" | "this-week" | "this-month" | "next-month";

type GroupOverride = {
  arrival?: string; departure?: string; nights?: number;
  totalRooms?: number; totalPax?: number;
  contactName?: string; contactPhone?: string; contactEmail?: string;
  type?: GroupType; status?: GroupStatus;
};

export default function GroupsPage() {
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"all" | GroupStatus>("all");
  const [typeFilter, setTypeFilter] = React.useState<"all" | GroupType>("all");
  const [dateWindow, setDateWindow] = React.useState<DateWindow>("all");
  const [actionMenuFor, setActionMenuFor] = React.useState<string | null>(null);
  // Anchor rect of the open "more actions" trigger — the menu is portalled to
  // <body> and positioned from this, so the table's overflow doesn't clip it.
  const [menuRect, setMenuRect] = React.useState<DOMRect | null>(null);

  // Groups load from the database; cancel/modify layer over them and persist.
  const [groups, setGroups] = React.useState<GroupBooking[]>([]);
  const [policies, setPolicies] = React.useState<GroupPolicies>(DEFAULT_POLICIES);
  // Actual room assignments (across all groups) — used to compute live allocation
  // % per group instead of the stale block.assigned snapshot from creation time.
  const [allocatedByGroup, setAllocatedByGroup] = React.useState<Record<string, number>>({});
  React.useEffect(() => {
    apiGet<GroupBooking[]>("/group-bookings")
      .then(rows => setGroups(rows.map(g => ({ ...g, id: String(g.id), block: g.block ?? [], services: g.services ?? [] }))))
      .catch(() => {});
    apiGet<{ groupCode?: string; roomNo?: string | null }[]>("/group-rooming")
      .then(rows => {
        const counts: Record<string, number> = {};
        rows.forEach(r => { if (r.groupCode && r.roomNo) counts[r.groupCode] = (counts[r.groupCode] ?? 0) + 1; });
        setAllocatedByGroup(counts);
      })
      .catch(() => {});
    apiGet<Partial<GroupPolicies>>("/settings/group_policies")
      .then(d => {
        if (d && typeof d === "object") setPolicies({
          depositPresets: Array.isArray(d.depositPresets) && d.depositPresets.length ? d.depositPresets : DEFAULT_POLICIES.depositPresets,
          cancellationTiers: Array.isArray(d.cancellationTiers) && d.cancellationTiers.length ? d.cancellationTiers : DEFAULT_POLICIES.cancellationTiers,
          discountTiers: Array.isArray(d.discountTiers) ? d.discountTiers : DEFAULT_POLICIES.discountTiers,
        });
      }).catch(() => {});
  }, []);

  // Local mutations
  const [cancelledIds, setCancelledIds] = React.useState<Set<string>>(new Set());
  const [overrides, setOverrides] = React.useState<Record<string, GroupOverride>>({});
  const [modifyTarget, setModifyTarget] = React.useState<typeof GROUP_BOOKINGS[number] | null>(null);
  const [cancelTarget, setCancelTarget] = React.useState<typeof GROUP_BOOKINGS[number] | null>(null);
  const [toast, setToast] = React.useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2800); };

  const effective = React.useMemo(() => {
    return groups.map(g => {
      const ov = overrides[g.id] ?? {};
      return {
        ...g,
        ...ov,
        status: cancelledIds.has(g.id) ? ("cancelled" as GroupStatus) : (ov.status ?? g.status),
      };
    });
  }, [groups, overrides, cancelledIds]);

  const inWindow = (iso: string) => {
    if (dateWindow === "all") return true;
    const today = new Date();
    const d = new Date(iso);
    const diffDays = Math.floor((d.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
    if (dateWindow === "this-week") return diffDays >= 0 && diffDays <= 7;
    if (dateWindow === "this-month") return diffDays >= 0 && diffDays <= 30;
    if (dateWindow === "next-month") return diffDays >= 30 && diffDays <= 60;
    return true;
  };

  const list = effective.filter(g => {
    if (statusFilter !== "all" && g.status !== statusFilter) return false;
    if (typeFilter !== "all" && g.type !== typeFilter) return false;
    if (search && !`${g.name} ${g.code} ${g.contactName}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (!inWindow(g.arrival)) return false;
    return true;
  });

  const totalRooms = effective.reduce((s, g) => s + g.totalRooms, 0);
  const totalPax = effective.reduce((s, g) => s + g.totalPax, 0);
  const totalRev = effective.filter(g => g.status !== "cancelled").reduce((s, g) => s + g.total, 0);
  const totalOutstanding = effective.filter(g => g.status !== "cancelled").reduce((s, g) => s + g.balance, 0);

  const handleModify = (g: typeof GROUP_BOOKINGS[number], patch: GroupOverride) => {
    setOverrides(o => ({ ...o, [g.id]: { ...(o[g.id] ?? {}), ...patch } }));
    apiPut(`/group-bookings/${g.id}`, patch).catch(() => showToast("Could not save changes"));
    setModifyTarget(null);
    showToast(`Group ${g.code} updated`);
  };
  const handleCancel = (g: typeof GROUP_BOOKINGS[number], reason: string, refund: number) => {
    setCancelledIds(c => new Set([...c, g.id]));
    apiPut(`/group-bookings/${g.id}`, { status: "cancelled" }).catch(() => showToast("Could not cancel"));
    setCancelTarget(null);
    showToast(`${g.name} cancelled · ${money(refund)} refund processed (${reason})`);
  };
  const handleExport = () => {
    const headers = ["Code", "Name", "Type", "Status", "Arrival", "Departure", "Nights", "Rooms", "Pax", "Contact", "Phone", "Total", "Balance"];
    const rows = list.map(g => [
      g.code, `"${g.name}"`, g.type, g.status,
      g.arrival, g.departure, g.nights,
      g.totalRooms, g.totalPax,
      `"${g.contactName}"`, g.contactPhone,
      g.total, g.balance,
    ].join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `group-bookings-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${list.length} group${list.length === 1 ? "" : "s"} to CSV`);
  };

  // Close menu on outside click, or when the page scrolls/resizes (the menu is
  // fixed-positioned from the trigger rect, so it must re-anchor or close).
  React.useEffect(() => {
    if (!actionMenuFor) return;
    const close = () => setActionMenuFor(null);
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest("[data-action-menu]")) setActionMenuFor(null);
    };
    document.addEventListener("click", onClick);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [actionMenuFor]);

  const STATUS_CHIPS: ("all" | GroupStatus)[] = ["all", "tentative", "confirmed", "in-house", "completed", "cancelled"];
  const activeFilters = (statusFilter !== "all" ? 1 : 0) + (typeFilter !== "all" ? 1 : 0) + (dateWindow !== "all" ? 1 : 0) + (search ? 1 : 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-medium tracking-tight">Group Bookings</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Weddings · conferences · tour groups · sports teams · corporate retreats
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}><FileDown className="h-4 w-4" />Export</Button>
          <Link href="/groups/new"><Button><Plus className="h-4 w-4" />New Group Booking</Button></Link>
        </div>
      </div>

      {/* KPI bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard label="Active Groups" value={effective.filter(g => g.status !== "completed" && g.status !== "cancelled").length} icon={UsersRound} accent="brand" />
        <KPICard label="Rooms Blocked" value={totalRooms} icon={BedDouble} accent="info" />
        <KPICard label="Pax Expected" value={totalPax} icon={UsersRound} accent="accent" />
        <KPICard label="Outstanding" value={money(totalOutstanding)} icon={Wallet} accent="warning" hint={`of ${money(totalRev)} total`} />
      </div>

      {/* Status chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        {STATUS_CHIPS.map(s => {
          const count = s === "all" ? effective.length : effective.filter(g => g.status === s).length;
          const dot = s === "tentative" ? "bg-warning" : s === "confirmed" ? "bg-info" : s === "in-house" ? "bg-brand" : s === "completed" ? "bg-success" : s === "cancelled" ? "bg-danger" : null;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "h-8 px-3 rounded-full text-xs font-medium border transition-colors inline-flex items-center gap-2",
                statusFilter === s
                  ? "bg-foreground text-background border-foreground shadow-xs"
                  : "bg-surface text-muted-foreground border-border hover:bg-surface-sunken hover:text-foreground"
              )}
            >
              {dot && <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />}
              {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1).replace("-", " ")}
              <span className={cn(
                "tabular text-[10px] rounded-full px-1.5 h-4 inline-flex items-center font-semibold",
                statusFilter === s ? "bg-background/15 text-background" : "bg-surface-sunken text-muted-foreground"
              )}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter bar */}
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by group name, code, or contact…"
              className="pl-9 h-9"
            />
          </div>
          <Select value={typeFilter} onChange={e => setTypeFilter(e.target.value as "all" | GroupType)} className="h-9 w-auto">
            <option value="all">All types</option>
            {Object.keys(TYPE_TONE).map(t => <option key={t} value={t}>{t}</option>)}
          </Select>
          <Select value={dateWindow} onChange={e => setDateWindow(e.target.value as DateWindow)} className="h-9 w-auto" title="Arrival window">
            <option value="all">All arrivals</option>
            <option value="this-week">Next 7 days</option>
            <option value="this-month">Next 30 days</option>
            <option value="next-month">31-60 days</option>
          </Select>
          {activeFilters > 0 && (
            <Button variant="ghost" size="sm" onClick={() => { setStatusFilter("all"); setTypeFilter("all"); setSearch(""); setDateWindow("all"); }}>
              Clear ({activeFilters})
            </Button>
          )}
          <div className="flex-1" />
          <p className="text-xs text-muted-foreground tabular">{list.length} of {effective.length} groups</p>
        </div>
      </Card>

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-elevated border-b border-border">
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-semibold">Group</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Contact</th>
                <th className="px-4 py-3 font-semibold">Arrival → Departure</th>
                <th className="px-4 py-3 font-semibold text-right">Rooms</th>
                <th className="px-4 py-3 font-semibold text-right">Pax</th>
                <th className="px-4 py-3 font-semibold text-right">Total</th>
                <th className="px-4 py-3 font-semibold text-right">Balance</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.map(g => {
                const isCancelled = g.status === "cancelled";
                const isOpen = actionMenuFor === g.id;
                const isModified = !!overrides[g.id];
                const allocPct = Math.round(((allocatedByGroup[g.code] ?? 0) / Math.max(1, g.totalRooms)) * 100);
                return (
                  <tr
                    key={g.id}
                    className={cn(
                      "hover:bg-surface-sunken/50 transition-colors",
                      isCancelled && "opacity-60"
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={g.name} size={36} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className={cn("font-medium truncate", isCancelled && "line-through")}>{g.name}</p>
                            {isModified && <Badge tone="info">edited</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground tabular">{g.code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><Badge tone={TYPE_TONE[g.type]}>{g.type}</Badge></td>
                    <td className="px-4 py-3">
                      <p className="text-sm">{g.contactName}</p>
                      <p className="text-xs text-muted-foreground tabular">{g.contactPhone}</p>
                      {g.bookedBy && <p className="text-[10px] text-subtle-foreground mt-0.5">via {g.bookedBy}</p>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <div className="text-foreground inline-flex items-center gap-1 text-xs">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {formatDate(g.arrival)} → {formatDate(g.departure)}
                      </div>
                      <p className="text-xs tabular">{g.nights} nights</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="tabular font-medium">{g.totalRooms}</p>
                      <div className="mt-1 w-16 ml-auto h-1 bg-surface-sunken rounded-full overflow-hidden">
                        <div className={cn("h-full", allocPct === 100 ? "bg-success" : allocPct > 0 ? "bg-warning" : "bg-border-strong")} style={{ width: `${allocPct}%` }} />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{allocPct}% allocated</p>
                    </td>
                    <td className="px-4 py-3 text-right tabular">{g.totalPax}</td>
                    <td className="px-4 py-3 text-right tabular font-medium">{money(g.total)}</td>
                    <td className="px-4 py-3 text-right">
                      <p className={cn("tabular font-medium", g.balance > 0 ? "text-warning" : "text-success")}>
                        {g.balance > 0 ? money(g.balance) : "Paid"}
                      </p>
                    </td>
                    <td className="px-4 py-3"><Badge tone={STATUS_TONE[g.status]}>{g.status}</Badge></td>
                    <td className="px-4 py-3 text-right" data-action-menu>
                      <div className="inline-flex gap-1 items-center">
                        <Link href={`/groups/${g.code}`}>
                          <button
                            type="button"
                            className="h-8 w-8 rounded-md border border-border hover:bg-brand hover:text-brand-foreground hover:border-brand inline-flex items-center justify-center text-muted-foreground transition-colors"
                            title="Open group detail"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        </Link>
                        <button
                          type="button"
                          disabled={isCancelled}
                          onClick={() => setModifyTarget(g)}
                          className="h-8 w-8 rounded-md border border-border hover:bg-brand hover:text-brand-foreground hover:border-brand inline-flex items-center justify-center text-muted-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Modify group booking"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={isCancelled || g.status === "completed"}
                          onClick={() => setCancelTarget(g)}
                          className="h-8 w-8 rounded-md border border-border hover:bg-danger hover:text-white hover:border-danger inline-flex items-center justify-center text-muted-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Cancel group booking"
                        >
                          <Ban className="h-3.5 w-3.5" />
                        </button>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              if (isOpen) { setActionMenuFor(null); return; }
                              setMenuRect(e.currentTarget.getBoundingClientRect());
                              setActionMenuFor(g.id);
                            }}
                            className={cn(
                              "h-8 w-8 rounded-md border inline-flex items-center justify-center transition-colors",
                              isOpen ? "bg-brand-soft border-brand text-brand-soft-foreground" : "border-border hover:bg-surface-sunken text-muted-foreground"
                            )}
                            title="More actions"
                          >
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {list.length === 0 && (
                <tr><td colSpan={10} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  <Search className="h-8 w-8 mx-auto text-subtle-foreground mb-2" />
                  <p className="font-medium">No groups match your filters</p>
                  <p className="text-xs mt-1">Adjust filters above or create a new group booking.</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* More-actions menu — portalled to <body> so the table's overflow never
          clips it; positioned from the trigger rect, flipping up near the bottom. */}
      {actionMenuFor && menuRect && typeof document !== "undefined" && (() => {
        const g = list.find(x => x.id === actionMenuFor);
        if (!g) return null;
        const isCancelled = g.status === "cancelled";
        const dropUp = menuRect.bottom + 300 > window.innerHeight;
        const style: React.CSSProperties = {
          position: "fixed",
          right: Math.max(8, window.innerWidth - menuRect.right),
          ...(dropUp ? { bottom: window.innerHeight - menuRect.top + 4 } : { top: menuRect.bottom + 4 }),
        };
        return createPortal(
          <div data-action-menu style={style} className="z-50 w-56 rounded-md border border-border bg-surface shadow-lg py-1 animate-in slide-in-from-top-1">
            <Link href={`/groups/${g.code}`} onClick={() => setActionMenuFor(null)} className="w-full px-3 py-2 text-sm hover:bg-surface-sunken inline-flex items-center gap-2.5">
              <CalendarRange className="h-3.5 w-3.5 text-muted-foreground" />Open detail
            </Link>
            <button type="button" onClick={() => { showToast(`Itinerary printed for ${g.code}`); setActionMenuFor(null); }} className="w-full px-3 py-2 text-sm hover:bg-surface-sunken inline-flex items-center gap-2.5 text-left">
              <Printer className="h-3.5 w-3.5 text-muted-foreground" />Print rooming list
            </button>
            <button type="button" onClick={() => {
              setActionMenuFor(null);
              const to = g.contactEmail;
              if (!to) { showToast(`No email on file for ${g.contactName}`); return; }
              showToast(`Emailing ${g.contactName}…`);
              sendEmail({ to, subject: `Group Booking · ${g.code}`, heading: "Group Booking Update", greeting: g.contactName, intro: "Here is an update regarding your group booking. Please contact us with any questions.", rows: [{ label: "Group", value: g.name }, { label: "Code", value: g.code }], context: "Group email" })
                .then(() => showToast(`Email sent to ${g.contactName}`))
                .catch(() => showToast(`Couldn't email ${g.contactName}`));
            }} className="w-full px-3 py-2 text-sm hover:bg-surface-sunken inline-flex items-center gap-2.5 text-left">
              <Mail className="h-3.5 w-3.5 text-brand" />Email contact
            </button>
            <button type="button" onClick={() => { showToast(`WhatsApp sent to ${g.contactName}`); setActionMenuFor(null); }} className="w-full px-3 py-2 text-sm hover:bg-surface-sunken inline-flex items-center gap-2.5 text-left">
              <MessageCircle className="h-3.5 w-3.5 text-success" />WhatsApp contact
            </button>
            <div className="my-1 h-px bg-border" />
            <button type="button" disabled={isCancelled} onClick={() => { setModifyTarget(g); setActionMenuFor(null); }} className="w-full px-3 py-2 text-sm hover:bg-surface-sunken inline-flex items-center gap-2.5 text-left disabled:opacity-40 disabled:cursor-not-allowed">
              <Edit className="h-3.5 w-3.5 text-muted-foreground" />Modify group
            </button>
            <button type="button" disabled={isCancelled || g.status === "completed"} onClick={() => { setCancelTarget(g); setActionMenuFor(null); }} className="w-full px-3 py-2 text-sm hover:bg-danger-soft text-danger inline-flex items-center gap-2.5 text-left disabled:opacity-40 disabled:cursor-not-allowed">
              <Ban className="h-3.5 w-3.5" />Cancel group
            </button>
          </div>,
          document.body,
        );
      })()}

      {/* Modify dialog */}
      {modifyTarget && (
        <ModifyGroupDialog
          group={modifyTarget}
          onClose={() => setModifyTarget(null)}
          onSave={(patch) => handleModify(modifyTarget, patch)}
        />
      )}

      {/* Cancel dialog */}
      {cancelTarget && (
        <CancelGroupDialog
          group={cancelTarget}
          cancellationTiers={policies.cancellationTiers}
          onClose={() => setCancelTarget(null)}
          onConfirm={(reason, refund) => handleCancel(cancelTarget, reason, refund)}
        />
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

// ===================== MODIFY GROUP DIALOG =====================
function ModifyGroupDialog({ group, onClose, onSave }: {
  group: typeof GROUP_BOOKINGS[number];
  onClose: () => void;
  onSave: (patch: GroupOverride) => void;
}) {
  const arrivalISO = new Date(group.arrival).toISOString().slice(0, 10);
  const departureISO = new Date(group.departure).toISOString().slice(0, 10);

  const [draft, setDraft] = React.useState<Required<GroupOverride>>({
    arrival: arrivalISO,
    departure: departureISO,
    nights: group.nights,
    totalRooms: group.totalRooms,
    totalPax: group.totalPax,
    contactName: group.contactName,
    contactPhone: group.contactPhone,
    contactEmail: (group as { contactEmail?: string }).contactEmail ?? "",
    type: group.type,
    status: group.status,
  });

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  React.useEffect(() => {
    const ms = new Date(draft.departure).getTime() - new Date(draft.arrival).getTime();
    const nights = Math.max(1, Math.round(ms / (24 * 60 * 60 * 1000)));
    if (nights !== draft.nights) setDraft(d => ({ ...d, nights }));
  }, [draft.arrival, draft.departure]);

  const set = <K extends keyof typeof draft>(k: K, v: typeof draft[K]) => setDraft(d => ({ ...d, [k]: v }));
  const todayISO = new Date().toLocaleDateString("en-CA"); // blocks past dates on arrival/departure

  const valid = draft.nights >= 1 && draft.totalRooms >= 1 && draft.totalPax >= 1 && draft.contactName.trim() !== "";

  const save = () => onSave({
    arrival: new Date(draft.arrival + "T12:00:00").toISOString(),
    departure: new Date(draft.departure + "T11:00:00").toISOString(),
    nights: draft.nights,
    totalRooms: draft.totalRooms,
    totalPax: draft.totalPax,
    contactName: draft.contactName,
    contactPhone: draft.contactPhone,
    type: draft.type,
    status: draft.status,
  });

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <Card className="pointer-events-auto w-full max-w-xl p-0 animate-in shadow-xl overflow-hidden">
          <div className="px-5 py-4 bg-surface-elevated border-b border-border flex items-center gap-3">
            <span className="h-10 w-10 rounded-md bg-brand-soft text-brand-soft-foreground inline-flex items-center justify-center shrink-0">
              <Edit className="h-5 w-5" />
            </span>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">Modify group · {group.code}</h3>
              <p className="text-xs text-muted-foreground truncate">{group.name}</p>
            </div>
            <button type="button" onClick={onClose} className="h-8 w-8 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
          </div>

          <div className="px-5 py-4 space-y-4 max-h-[65vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Arrival</Label>
                <Input type="date" value={draft.arrival} min={todayISO} onChange={e => set("arrival", e.target.value)} className="h-9 tabular" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Departure</Label>
                <Input type="date" value={draft.departure} min={draft.arrival > todayISO ? draft.arrival : todayISO} onChange={e => set("departure", e.target.value)} className="h-9 tabular" />
              </div>
            </div>

            <div className="rounded-md bg-surface-sunken/40 border border-border p-3 text-xs flex items-center justify-between">
              <span className="text-muted-foreground">Stay duration</span>
              <span className="font-semibold tabular">{draft.nights} night{draft.nights === 1 ? "" : "s"}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Rooms blocked</Label>
                <Input type="number" min={1} value={draft.totalRooms} onChange={e => set("totalRooms", Number(e.target.value))} className="h-9 tabular" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Total pax</Label>
                <Input type="number" min={1} value={draft.totalPax} onChange={e => set("totalPax", Number(e.target.value))} className="h-9 tabular" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Group type</Label>
              <Select value={draft.type} onChange={e => set("type", e.target.value as GroupType)} className="h-9">
                {Object.keys(TYPE_TONE).map(t => <option key={t} value={t}>{t}</option>)}
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={draft.status} onChange={e => set("status", e.target.value as GroupStatus)} className="h-9">
                <option value="draft">Draft</option>
                <option value="tentative">Tentative</option>
                <option value="confirmed">Confirmed</option>
                <option value="in-house">In-house</option>
                <option value="completed">Completed</option>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
              <div className="space-y-1.5">
                <Label className="text-xs">Primary contact</Label>
                <Input value={draft.contactName} onChange={e => set("contactName", e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Phone</Label>
                <PhoneInput value={draft.contactPhone} onChange={v => set("contactPhone", v)} size="sm" invalid={draft.contactPhone !== "" && !isValidPhone(draft.contactPhone)} />
              </div>
            </div>
          </div>

          <div className="px-5 py-3 border-t border-border bg-surface-elevated flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground">All linked sub-bookings will be auto-updated.</p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
              <Button onClick={save} disabled={!valid} variant="success"><CheckCircle2 className="h-4 w-4" />Save changes</Button>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}

// ===================== CANCEL GROUP DIALOG =====================
function CancelGroupDialog({ group, cancellationTiers, onClose, onConfirm }: {
  group: typeof GROUP_BOOKINGS[number];
  cancellationTiers: { upToDays: number; refundPct: number }[];
  onClose: () => void;
  onConfirm: (reason: string, refund: number) => void;
}) {
  const [reason, setReason] = React.useState("Client cancellation");
  const [notify, setNotify] = React.useState({ email: true, whatsapp: true, sms: false });
  const [confirmText, setConfirmText] = React.useState("");

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  // Group cancellation policy: use configured tiers sorted ascending by upToDays.
  // The first tier where daysUntil < upToDays applies. Stays already started → 0%.
  const today = new Date();
  const arr = new Date(group.arrival);
  const daysUntil = Math.floor((arr.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  let refundPct = 0;
  let policyNote = "No refund — stay has started";
  if (daysUntil >= 0) {
    const sorted = [...cancellationTiers].sort((a, b) => a.upToDays - b.upToDays);
    const match = sorted.find(t => daysUntil < t.upToDays) ?? sorted[sorted.length - 1];
    if (match) {
      refundPct = match.refundPct;
      const isLast = match === sorted[sorted.length - 1] && match.upToDays >= 9999;
      policyNote = isLast
        ? `Full refund — more than ${sorted[sorted.length - 2]?.upToDays ?? 30} days before arrival`
        : `${refundPct}% refund — within ${match.upToDays} days of arrival`;
    }
  }

  const advance = group.total - group.balance;
  const refund = Math.round(advance * (refundPct / 100));
  const valid = confirmText.trim().toUpperCase() === "CANCEL";

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <Card className="pointer-events-auto w-full max-w-md p-0 animate-in shadow-xl overflow-hidden">
          <div className="px-5 py-4 bg-danger-soft border-b border-danger/20 flex items-center gap-3">
            <span className="h-10 w-10 rounded-md bg-danger text-white inline-flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">Cancel group booking</h3>
              <p className="text-xs text-muted-foreground truncate">{group.code} · {group.name}</p>
            </div>
            <button type="button" onClick={onClose} className="h-8 w-8 rounded-md hover:bg-white/40 inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
          </div>

          <div className="px-5 py-4 space-y-4">
            {/* Group summary */}
            <div className="rounded-md border border-border p-3 text-sm space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Rooms blocked</span>
                <span className="font-medium tabular">{group.totalRooms} · {group.totalPax} pax</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Stay</span>
                <span className="font-medium">{formatDate(group.arrival)} → {formatDate(group.departure)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Advance received</span>
                <span className="font-medium tabular">{money(advance)}</span>
              </div>
            </div>

            {/* Refund preview */}
            <div className={cn(
              "rounded-md border p-3 text-sm space-y-1.5",
              refundPct === 100 ? "border-success/40 bg-success-soft/40" :
              refundPct >= 50 ? "border-warning/40 bg-warning-soft/40" :
              "border-danger/40 bg-danger-soft/40"
            )}>
              <p className="text-xs font-semibold uppercase tracking-wider">Group cancellation policy</p>
              <p className="text-[11px]">{policyNote} ({daysUntil >= 0 ? `${daysUntil} days until arrival` : `${-daysUntil} days past arrival`})</p>
              <div className="flex items-center justify-between pt-1.5 border-t border-current/15">
                <span className="text-xs">Refund to client</span>
                <span className="text-base font-semibold tabular">{money(refund)} <span className="text-[10px] opacity-70">({refundPct}%)</span></span>
              </div>
            </div>

            <div className="rounded-md bg-warning-soft/40 border border-warning/30 p-3 text-xs flex items-start gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-warning">{group.totalRooms} rooms will be released back to inventory</p>
                <p className="text-muted-foreground mt-0.5">F&amp;B / banquet orders linked to this group will also be voided.</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Cancellation reason</Label>
              <Select value={reason} onChange={e => setReason(e.target.value)} className="h-9">
                <option>Client cancellation</option>
                <option>Insufficient pax</option>
                <option>Payment failed</option>
                <option>Event postponed</option>
                <option>Force majeure</option>
                <option>Other</option>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px]">Notify contact via</Label>
              <div className="flex flex-wrap gap-1.5">
                {([
                  { id: "email", label: "Email", icon: Mail },
                  { id: "whatsapp", label: "WhatsApp", icon: MessageCircle },
                  { id: "sms", label: "SMS", icon: Phone },
                ] as const).map(c => {
                  const on = notify[c.id];
                  const Icon = c.icon;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setNotify(n => ({ ...n, [c.id]: !n[c.id] }))}
                      className={cn(
                        "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border text-xs font-medium transition-colors",
                        on ? "bg-brand-soft border-brand text-brand-soft-foreground" : "border-border text-muted-foreground hover:bg-surface-sunken"
                      )}
                    >
                      <Icon className="h-3 w-3" />{c.label}{on && <CheckCircle2 className="h-3 w-3" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Type <span className="font-mono font-semibold">CANCEL</span> to confirm</Label>
              <Input
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                placeholder="CANCEL"
                className={cn("h-9 font-mono tabular", valid && "border-success")}
              />
            </div>
          </div>

          <div className="px-5 py-3 border-t border-border bg-surface-elevated flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>Keep booking</Button>
            <Button onClick={() => onConfirm(reason, refund)} disabled={!valid} variant="danger">
              <Ban className="h-4 w-4" />Cancel group
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}
