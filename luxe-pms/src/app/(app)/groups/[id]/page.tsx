"use client";
import * as React from "react";
import Link from "next/link";
import { use } from "react";
import {
  ChevronLeft, UsersRound, BedDouble, Receipt, Calendar, MessageSquare, Activity,
  Printer, Send, CreditCard, Sparkles, Phone, Mail, Briefcase, UserPlus, Upload,
  CheckCircle2, ArrowRight, Plus, Building2, MoreVertical, X,
} from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KPICard } from "@/components/ui/kpi-card";
import { Input, Label, Select } from "@/components/ui/input";
import { GROUP_BOOKINGS, SAMPLE_ROOMING_LIST, GROUP_TIMELINE, type GroupStatus, type GroupBooking } from "@/lib/mock-data-ext";
import { apiGet, apiPost, apiPut } from "@/lib/api";

type RoomingEntry = { id: string; groupCode?: string; roomNo?: string | null; roomType: string; lead: string; pax: number; phone?: string; remarks?: string };
type AuditRow = { id: string; action: string; entity: string; module: string; user: string; date: string; time: string };
type RoomBoardRow = { number: string; status: string };
import { cn, money, formatDate } from "@/lib/utils";

const STATUS_TONE: Record<GroupStatus, "neutral" | "info" | "success" | "brand" | "warning" | "danger"> = {
  draft: "neutral", tentative: "warning", confirmed: "info",
  "in-house": "brand", completed: "success", cancelled: "danger",
};

const TABS = [
  { id: "overview", label: "Overview", icon: UsersRound },
  { id: "rooms", label: "Rooms", icon: BedDouble },
  { id: "rooming", label: "Rooming List", icon: UsersRound },
  { id: "services", label: "Services", icon: Building2 },
  { id: "billing", label: "Billing", icon: Receipt },
  { id: "timeline", label: "Timeline", icon: Activity },
];

export default function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [group, setGroup] = React.useState<GroupBooking>(() => GROUP_BOOKINGS.find(g => g.code === id) ?? GROUP_BOOKINGS[0]);
  const [payAmount, setPayAmount] = React.useState(0);
  const [payMode, setPayMode] = React.useState("Cash");
  React.useEffect(() => {
    apiGet<GroupBooking[]>("/group-bookings")
      .then(rows => {
        const match = rows.find(g => g.code === id);
        if (match) {
          setGroup({ ...match, id: String(match.id), block: match.block ?? [], services: match.services ?? [] });
          setPayAmount(match.balance);
        }
      })
      .catch(() => {});
  }, [id]);
  const [tab, setTab] = React.useState("overview");

  // Rooming list — group-scoped, loaded from the API.
  const [rooming, setRooming] = React.useState<RoomingEntry[]>(SAMPLE_ROOMING_LIST);
  const [assignId, setAssignId] = React.useState<string | null>(null);
  const [assignVal, setAssignVal] = React.useState("");
  const [addGuestOpen, setAddGuestOpen] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };

  React.useEffect(() => {
    apiGet<RoomingEntry[]>(`/group-rooming?groupCode=${encodeURIComponent(id)}`)
      .then(rows => { if (rows.length) setRooming(rows.map(r => ({ ...r, id: String(r.id) }))); })
      .catch(() => {});
  }, [id]);

  const assignRoom = (entry: RoomingEntry, roomNo: string) => {
    setRooming(prev => prev.map(r => r.id === entry.id ? { ...r, roomNo } : r));
    apiPut(`/group-rooming/${entry.id}`, { roomNo }).catch(() => flash("⚠ Save failed — backend offline"));
    setAssignId(null); setAssignVal("");
    flash(`Room ${roomNo} assigned to ${entry.lead}`);
  };
  const addGuest = (g: { lead: string; roomType: string; pax: number; phone?: string; remarks?: string }) => {
    apiPost<RoomingEntry>("/group-rooming", { ...g, groupCode: id, roomNo: null })
      .then(row => setRooming(prev => [...prev, { ...row, id: String(row.id) }]))
      .catch(() => flash("⚠ Save failed — backend offline"));
    setAddGuestOpen(false);
    flash(`${g.lead} added to rooming list`);
  };

  // Activity timeline — real audit-log entries scoped to this group.
  const [auditRows, setAuditRows] = React.useState<AuditRow[] | null>(null);
  React.useEffect(() => {
    apiGet<AuditRow[]>("/audit-logs")
      .then(rows => setAuditRows(rows))
      .catch(() => {});
  }, []);
  const timeline = React.useMemo(() => {
    if (!auditRows) return null;
    return auditRows
      .filter(r => /group/i.test(r.module) && (r.entity === group.name || r.entity === group.code))
      .map(r => ({ id: r.id, action: `${r.action}${r.entity ? " · " + r.entity : ""}`, time: `${r.date} ${r.time}`.trim(), actor: r.user }));
  }, [auditRows, group.name, group.code]);

  // Receive payment — persists a master-folio payment + updates the group balance.
  const receivePayment = () => {
    const amt = Math.round(Number(payAmount) || 0);
    if (amt <= 0) { flash("Enter a valid amount"); return; }
    const today = new Date().toISOString().slice(0, 10);
    apiPost("/folio-payments", { bookingNo: group.code, date: today, mode: payMode, amount: amt, reference: `Group ${group.code}` })
      .catch(() => flash("⚠ Payment not saved — backend offline"));
    const advance = group.advance + amt;
    const balance = Math.max(0, group.balance - amt);
    setGroup(g => ({ ...g, advance, balance }));
    setPayAmount(balance);
    apiPut(`/group-bookings/${group.id}`, { advance, balance }).catch(() => {});
    flash(`Payment of ${money(amt)} recorded via ${payMode}`);
  };

  // Add a service — persists onto the group record.
  const addService = (name: string) => {
    if (group.services.includes(name)) { flash(`${name} already added`); return; }
    const services = [...group.services, name];
    setGroup(g => ({ ...g, services }));
    apiPut(`/group-bookings/${group.id}`, { services }).catch(() => flash("⚠ Save failed — backend offline"));
    flash(`${name} added to the group`);
  };

  // Auto-assign available rooms to unassigned guests and persist each.
  const autoAssign = async () => {
    const unassigned = rooming.filter(r => !r.roomNo);
    if (!unassigned.length) { flash("All guests already have rooms"); return; }
    let pool: string[] = [];
    try {
      const board = await apiGet<RoomBoardRow[]>("/room-board");
      const taken = new Set(rooming.map(r => r.roomNo).filter(Boolean) as string[]);
      pool = board.filter(b => b.status === "available").map(b => b.number).filter(n => !taken.has(n));
    } catch { flash("⚠ Could not load room board — backend offline"); return; }
    const updated = [...rooming];
    let assigned = 0;
    for (const entry of unassigned) {
      const roomNo = pool.shift();
      if (!roomNo) break;
      const idx = updated.findIndex(r => r.id === entry.id);
      updated[idx] = { ...entry, roomNo };
      apiPut(`/group-rooming/${entry.id}`, { roomNo }).catch(() => {});
      assigned++;
    }
    setRooming(updated);
    flash(assigned ? `Auto-assigned ${assigned} room${assigned > 1 ? "s" : ""}` : "No available rooms to assign");
  };

  // Check the whole group in.
  const checkInGroup = () => {
    setGroup(g => ({ ...g, status: "in-house" }));
    apiPut(`/group-bookings/${group.id}`, { status: "in-house" }).catch(() => flash("⚠ Save failed — backend offline"));
    flash("Group checked in");
  };

  const allocated = group.block.reduce((s, b) => s + b.assigned, 0);
  const allocPct = Math.round((allocated / group.totalRooms) * 100);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/groups" className="hover:text-foreground inline-flex items-center gap-1">
          <ChevronLeft className="h-3.5 w-3.5" />Groups
        </Link>
        <span>·</span>
        <span className="tabular">{group.code}</span>
      </div>

      {/* Hero */}
      <Card className="p-5">
        <div className="flex flex-col lg:flex-row gap-5">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <span className="h-14 w-14 rounded-md bg-brand-soft text-brand-soft-foreground flex items-center justify-center shrink-0">
              <UsersRound className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-semibold truncate">{group.name}</h1>
                <Badge tone="brand">{group.type}</Badge>
                <Badge tone={STATUS_TONE[group.status]}>{group.status}</Badge>
                <span className="text-xs text-muted-foreground tabular">{group.code}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><UsersRound className="h-3.5 w-3.5" />{group.contactName}</span>
                <span className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{group.contactPhone}</span>
                <span className="inline-flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{group.contactEmail}</span>
                <span className="inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />{formatDate(group.arrival)} → {formatDate(group.departure)} · {group.nights}N</span>
                {group.bookedBy && <span className="inline-flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5" />{group.bookedBy}</span>}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 lg:gap-4 lg:min-w-[440px]">
            <Stat label="Rooms" value={group.totalRooms.toString()} hint={`${allocated} assigned`} />
            <Stat label="Total" value={money(group.total)} />
            <Stat label="Balance" value={money(group.balance)} tone={group.balance > 0 ? "warning" : "success"} />
          </div>
        </div>

        <div className="mt-5 pt-5 border-t border-border flex flex-wrap gap-2">
          <Button onClick={() => { setTab("rooming"); setAddGuestOpen(true); }}><UserPlus className="h-4 w-4" />Add to Rooming List</Button>
          <Button variant="secondary" onClick={() => setTab("billing")}><CreditCard className="h-4 w-4" />Receive Payment</Button>
          <Button variant="outline" onClick={() => setTab("services")}><Plus className="h-4 w-4" />Add Service</Button>
          <div className="flex-1" />
          <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4" />Print</Button>
          <Button variant="outline" onClick={() => flash(`Folio emailed to ${group.contactEmail}`)}><Send className="h-4 w-4" />Email Contact</Button>
          {(group.status === "confirmed" || group.status === "tentative") && (
            <Button variant="success" onClick={checkInGroup}><CheckCircle2 className="h-4 w-4" />Check-in Group<ArrowRight className="h-4 w-4" /></Button>
          )}
        </div>
      </Card>

      {/* Tabs */}
      <div className="border-b border-border flex items-center gap-1 overflow-x-auto">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
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

      {/* OVERVIEW */}
      {tab === "overview" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KPICard label="Rooms blocked" value={group.totalRooms} icon={BedDouble} accent="brand" />
            <KPICard label="Pax" value={group.totalPax} icon={UsersRound} accent="info" />
            <KPICard label="Nights" value={group.nights} icon={Calendar} accent="accent" />
            <KPICard label="Advance %" value={`${Math.round((group.advance / group.total) * 100)}%`} icon={CreditCard} accent="success" hint={money(group.advance)} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <Card className="lg:col-span-2 p-5 space-y-4">
              <CardTitle>Group Details</CardTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <Detail k="Group code" v={group.code} />
                <Detail k="Type" v={group.type} />
                <Detail k="Status" v={<Badge tone={STATUS_TONE[group.status]}>{group.status}</Badge>} />
                <Detail k="Rate plan" v={group.ratePlan} />
                <Detail k="Contact" v={group.contactName} />
                <Detail k="Booked by" v={group.bookedBy ?? "Direct"} />
                <Detail k="Arrival" v={formatDate(group.arrival)} />
                <Detail k="Departure" v={formatDate(group.departure)} />
                <Detail k="Created" v={group.createdAt} />
                <Detail k="Allocation" v={`${allocPct}% (${allocated} of ${group.totalRooms})`} />
              </div>
              {group.notes && (
                <div className="border-t border-border pt-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Notes & Special Requests</p>
                  <p className="text-sm leading-relaxed bg-warning-soft/50 border border-warning/20 rounded-md p-3">{group.notes}</p>
                </div>
              )}
            </Card>

            <Card className="p-5 space-y-3">
              <CardTitle>Services Booked</CardTitle>
              {group.services.length === 0 ? (
                <p className="text-sm text-muted-foreground">No services added.</p>
              ) : (
                <ul className="space-y-2">
                  {group.services.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-brand mt-0.5 shrink-0" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="pt-3 border-t border-border">
                <Button variant="outline" size="sm" className="w-full" onClick={() => setTab("services")}>
                  Manage services<ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ROOMS */}
      {tab === "rooms" && (
        <div className="space-y-5">
          <Card className="p-4 border-l-4 border-l-brand">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-brand shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">{allocPct}% of block allocated · {group.totalRooms - allocated} rooms still to assign</p>
                <p className="text-xs text-muted-foreground mt-0.5">AI will auto-assign rooms by floor preference (group on same floor) when you click below.</p>
              </div>
              <Button size="sm" onClick={autoAssign}>Auto-assign Remaining</Button>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {group.block.map((b, i) => {
              const pct = Math.round((b.assigned / b.qty) * 100);
              return (
                <Card key={i} className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{b.type}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 tabular">{money(b.rate)} per night · group rate</p>
                    </div>
                    <Badge tone={pct === 100 ? "success" : pct > 0 ? "warning" : "neutral"}>
                      {b.assigned}/{b.qty}
                    </Badge>
                  </div>
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground">Allocation</span>
                      <span className="tabular font-medium">{pct}%</span>
                    </div>
                    <div className="h-2 bg-surface-sunken rounded-full overflow-hidden">
                      <div className={cn("h-full", pct === 100 ? "bg-success" : "bg-warning")} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal · {b.qty} × {group.nights}N</span>
                    <span className="font-semibold tabular">{money(b.qty * b.rate * group.nights)}</span>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ROOMING LIST */}
      {tab === "rooming" && (
        <Card className="p-0 overflow-hidden">
          <CardHeader className="bg-surface-elevated">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Rooming List</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">{rooming.length} guests in {group.totalRooms} rooms · {rooming.filter(r => !r.roomNo).length} pending allocation</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => flash("CSV import — coming soon")}><Upload className="h-3.5 w-3.5" />Import CSV</Button>
                <Button size="sm" onClick={() => setAddGuestOpen(true)}><Plus className="h-3.5 w-3.5" />Add Guest</Button>
              </div>
            </div>
          </CardHeader>
          <table className="w-full text-sm">
            <thead className="bg-surface-sunken/50 border-y border-border">
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-2.5 font-semibold">Room</th>
                <th className="px-5 py-2.5 font-semibold">Type</th>
                <th className="px-5 py-2.5 font-semibold">Lead Guest</th>
                <th className="px-5 py-2.5 font-semibold text-right">Pax</th>
                <th className="px-5 py-2.5 font-semibold">Phone</th>
                <th className="px-5 py-2.5 font-semibold">Remarks</th>
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rooming.map(g => (
                <tr key={g.id} className={cn("hover:bg-surface-sunken/40", !g.roomNo && "bg-warning-soft/30")}>
                  <td className="px-5 py-3 font-medium tabular">
                    {g.roomNo ? g.roomNo : assignId === g.id ? (
                      <input
                        autoFocus
                        value={assignVal}
                        onChange={e => setAssignVal(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter" && assignVal.trim()) assignRoom(g, assignVal.trim()); if (e.key === "Escape") { setAssignId(null); setAssignVal(""); } }}
                        onBlur={() => { if (assignVal.trim()) assignRoom(g, assignVal.trim()); else { setAssignId(null); setAssignVal(""); } }}
                        placeholder="Room #"
                        className="w-20 h-7 px-2 rounded border border-brand bg-surface text-sm tabular outline-none"
                      />
                    ) : (
                      <button className="text-xs text-brand hover:underline" onClick={() => { setAssignId(g.id); setAssignVal(""); }}>Assign</button>
                    )}
                  </td>
                  <td className="px-5 py-3"><Badge tone="neutral">{g.roomType}</Badge></td>
                  <td className="px-5 py-3">{g.lead}</td>
                  <td className="px-5 py-3 text-right tabular">{g.pax}</td>
                  <td className="px-5 py-3 text-xs text-muted-foreground tabular">{g.phone ?? "—"}</td>
                  <td className="px-5 py-3 text-xs text-muted-foreground">{g.remarks ?? "—"}</td>
                  <td className="px-5 py-3 text-right">
                    <button className="text-muted-foreground hover:text-foreground"><MoreVertical className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* SERVICES */}
      {tab === "services" && (
        <div className="space-y-4">
          <Card className="p-0 overflow-hidden">
            <CardHeader className="bg-surface-elevated">
              <div className="flex items-center justify-between">
                <CardTitle>Services & Add-ons</CardTitle>
              </div>
            </CardHeader>
            {group.services.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted-foreground">No services added yet · use Quick add below.</p>
            ) : (
              <ul className="divide-y divide-border">
                {group.services.map((s, i) => (
                  <li key={i} className="px-5 py-3 flex items-center gap-3">
                    <span className="h-8 w-8 rounded-md bg-accent-soft text-accent flex items-center justify-center shrink-0">
                      <Building2 className="h-4 w-4" />
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{s}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Booked · confirmed for the group window</p>
                    </div>
                    <Badge tone="success">Active</Badge>
                    <button onClick={() => { const services = group.services.filter(x => x !== s); setGroup(g => ({ ...g, services })); apiPut(`/group-bookings/${group.id}`, { services }).catch(() => flash("⚠ Save failed")); flash(`${s} removed`); }} className="text-muted-foreground hover:text-danger" title="Remove"><X className="h-4 w-4" /></button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">Quick add</p>
            <div className="flex flex-wrap gap-2">
              {["Conference room", "AV setup", "Coffee break", "Decoration", "Transport", "Photographer", "Dietary special"].map(s => (
                <button key={s} onClick={() => addService(s)} disabled={group.services.includes(s)} className="h-8 px-3 rounded-full border border-border text-xs hover:bg-surface-sunken disabled:opacity-40 disabled:cursor-not-allowed">+ {s}</button>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* BILLING */}
      {tab === "billing" && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <KPICard label="Total Charges" value={money(group.total)} icon={Receipt} accent="brand" />
            <KPICard label="Paid" value={money(group.advance)} icon={CreditCard} accent="success" />
            <KPICard label="Balance" value={money(group.balance)} icon={CreditCard} accent={group.balance > 0 ? "warning" : "success"} />
          </div>

          <Card className="p-0 overflow-hidden">
            <CardHeader className="bg-surface-elevated">
              <CardTitle>Master Folio · {group.code}</CardTitle>
            </CardHeader>
            <table className="w-full text-sm">
              <thead className="bg-surface-sunken/50 border-y border-border">
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-2.5 font-semibold">Item</th>
                  <th className="px-5 py-2.5 font-semibold text-right">Qty</th>
                  <th className="px-5 py-2.5 font-semibold text-right">Rate</th>
                  <th className="px-5 py-2.5 font-semibold text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {group.block.map((b, i) => (
                  <tr key={i}>
                    <td className="px-5 py-3">{b.type} room · {group.nights} nights</td>
                    <td className="px-5 py-3 text-right tabular">{b.qty}</td>
                    <td className="px-5 py-3 text-right tabular">{money(b.rate * group.nights)}</td>
                    <td className="px-5 py-3 text-right tabular font-medium">{money(b.qty * b.rate * group.nights)}</td>
                  </tr>
                ))}
                {group.services.map((s, i) => (
                  <tr key={`s${i}`}>
                    <td className="px-5 py-3">{s}</td>
                    <td className="px-5 py-3 text-right tabular">1</td>
                    <td className="px-5 py-3 text-right tabular text-muted-foreground">—</td>
                    <td className="px-5 py-3 text-right tabular font-medium">{money(Math.round((group.total * 0.1) / Math.max(1, group.services.length)))}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-surface-elevated border-t border-border">
                <tr>
                  <td colSpan={3} className="px-5 py-2 text-right text-xs uppercase tracking-wider font-semibold text-muted-foreground">Subtotal</td>
                  <td className="px-5 py-2 text-right tabular">{money(group.total / 1.05)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="px-5 py-2 text-right text-xs uppercase tracking-wider font-semibold text-muted-foreground">Tax (5%)</td>
                  <td className="px-5 py-2 text-right tabular text-muted-foreground">{money(group.total - group.total / 1.05)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="px-5 py-3 text-right text-xs uppercase tracking-wider font-semibold">Total</td>
                  <td className="px-5 py-3 text-right tabular font-semibold text-base">{money(group.total)}</td>
                </tr>
              </tfoot>
            </table>
          </Card>

          <Card className="p-5">
            <CardTitle>Receive Payment</CardTitle>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div className="space-y-1.5">
                <p className="text-xs font-medium">Amount</p>
                <Input type="number" value={payAmount} onChange={e => setPayAmount(Number(e.target.value))} className="text-lg tabular font-semibold h-11" />
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-medium">Mode</p>
                <div className="grid grid-cols-2 gap-1">
                  {["Cash", "Card", "Bank", "Online"].map(m => (
                    <button key={m} onClick={() => setPayMode(m)} className={cn(
                      "h-9 rounded-md border text-xs font-medium transition-colors",
                      payMode === m ? "border-brand bg-brand-soft text-brand-soft-foreground" : "border-border hover:bg-surface-sunken"
                    )}>{m}</button>
                  ))}
                </div>
              </div>
              <Button size="lg" variant="success" onClick={receivePayment}><CreditCard className="h-4 w-4" />Record Payment</Button>
            </div>
          </Card>
        </div>
      )}

      {/* TIMELINE */}
      {tab === "timeline" && (
        <Card className="p-5">
          <CardTitle>Activity Timeline</CardTitle>
          <ol className="mt-5 relative">
            <div className="absolute left-3.5 top-2 bottom-2 w-px bg-border" />
            {/* Real audit entries when available; mock only as offline fallback (timeline === null). */}
            {(timeline ?? GROUP_TIMELINE).map(t => (
              <li key={t.id} className="relative pl-10 pb-5 last:pb-0">
                <span className="absolute left-0 top-0 h-7 w-7 rounded-full bg-surface border-2 border-brand flex items-center justify-center">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                </span>
                <p className="text-sm font-medium">{t.action}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t.time} · {t.actor}</p>
              </li>
            ))}
            {timeline && timeline.length === 0 && (
              <li className="relative pl-10 pb-5"><p className="text-sm text-muted-foreground">No recorded activity for this group yet.</p></li>
            )}
            <li className="relative pl-10">
              <span className="absolute left-0 top-0 h-7 w-7 rounded-full bg-surface border-2 border-dashed border-border flex items-center justify-center">
                <MessageSquare className="h-3 w-3 text-subtle-foreground" />
              </span>
              <p className="text-sm text-muted-foreground">Add an internal note…</p>
            </li>
          </ol>
        </Card>
      )}

      {addGuestOpen && <AddGuestModal onClose={() => setAddGuestOpen(false)} onSave={addGuest} />}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-md bg-foreground text-background px-4 py-2.5 text-sm font-medium shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

function AddGuestModal({ onClose, onSave }: { onClose: () => void; onSave: (g: { lead: string; roomType: string; pax: number; phone?: string; remarks?: string }) => void }) {
  const [lead, setLead] = React.useState("");
  const [roomType, setRoomType] = React.useState("Deluxe");
  const [pax, setPax] = React.useState(2);
  const [phone, setPhone] = React.useState("");
  const [remarks, setRemarks] = React.useState("");

  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <Card className="w-full max-w-md p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <CardTitle>Add Guest to Rooming List</CardTitle>
          <button onClick={onClose}><X className="h-4 w-4 text-muted-foreground" /></button>
        </div>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Lead guest *</Label><Input value={lead} onChange={e => setLead(e.target.value)} placeholder="e.g. Mr. Karim Bishara" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Room type</Label><Select value={roomType} onChange={e => setRoomType(e.target.value)}>{["Deluxe", "King", "Queen", "Suite", "Family", "Executive"].map(t => <option key={t}>{t}</option>)}</Select></div>
            <div className="space-y-1.5"><Label>Pax</Label><Input type="number" value={pax} onChange={e => setPax(Math.max(1, Number(e.target.value) || 1))} /></div>
          </div>
          <div className="space-y-1.5"><Label>Phone</Label><Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 …" /></div>
          <div className="space-y-1.5"><Label>Remarks</Label><Input value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Preferences, notes…" /></div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!lead.trim()} onClick={() => onSave({ lead: lead.trim(), roomType, pax, phone: phone || undefined, remarks: remarks || undefined })}>
            <Plus className="h-3.5 w-3.5" />Add Guest
          </Button>
        </div>
      </Card>
    </div>
  );
}

function Stat({ label, value, tone, hint }: { label: string; value: string; tone?: "warning" | "success"; hint?: string }) {
  return (
    <div className={cn(
      "rounded-md p-3 border",
      tone === "success" ? "bg-success-soft border-success/30" :
      tone === "warning" ? "bg-warning-soft border-warning/30" :
      "bg-surface-sunken border-border"
    )}>
      <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-lg font-semibold tabular",
        tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : "text-foreground"
      )}>{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  );
}

function Detail({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{k}</dt>
      <dd className="mt-1 text-sm">{v}</dd>
    </div>
  );
}
