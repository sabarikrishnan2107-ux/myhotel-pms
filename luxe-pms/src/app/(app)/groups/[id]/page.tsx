"use client";
import * as React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { use } from "react";
import {
  ChevronLeft, UsersRound, BedDouble, Receipt, Calendar, MessageSquare, Activity,
  Printer, Send, CreditCard, Sparkles, Phone, Mail, Briefcase, UserPlus, Upload,
  CheckCircle2, ArrowRight, Plus, Building2, MoreVertical, X, LogOut,
} from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KPICard } from "@/components/ui/kpi-card";
import { Input, Label, Select } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { isValidPhone } from "@/lib/phone";
import { GROUP_TIMELINE, type GroupStatus, type GroupBooking } from "@/lib/mock-data-ext";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";
import { computeGroupTotals, type GstSlab } from "@/lib/group-pricing";
import { mealPerNightPerGuest } from "@/lib/booking-pricing";

type RoomingEntry = { id: string; groupCode?: string; roomNo?: string | null; roomType: string; lead: string; pax: number; phone?: string; remarks?: string; checkedOut?: boolean };
type AuditRow = { id: string; action: string; entity: string; module: string; user: string; date: string; time: string };
type RoomBoardRow = { id?: string | number; number: string; status: string; type?: string; floor?: number };
import { cn, money, formatDate } from "@/lib/utils";
import { useProperty, hotelName } from "@/lib/use-property";

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
  const hotel = hotelName(useProperty());
  // SSR-safe gate for the print-only summary portal (needs document.body).
  const [printMounted, setPrintMounted] = React.useState(false);
  React.useEffect(() => setPrintMounted(true), []);
  const [group, setGroup] = React.useState<GroupBooking | null>(null);
  const [payAmount, setPayAmount] = React.useState(0);
  const [payMode, setPayMode] = React.useState("Cash");
  const [checkoutOpen, setCheckoutOpen] = React.useState(false);
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
  const [rooming, setRooming] = React.useState<RoomingEntry[]>([]);
  const [assignId, setAssignId] = React.useState<string | null>(null);
  const [addGuestOpen, setAddGuestOpen] = React.useState(false);
  // Per-row "..." actions menu, portalled to <body> (the table card clips overflow).
  const [rowMenuFor, setRowMenuFor] = React.useState<string | null>(null);
  const [rowMenuRect, setRowMenuRect] = React.useState<DOMRect | null>(null);
  React.useEffect(() => {
    if (!rowMenuFor) return;
    const close = () => setRowMenuFor(null);
    const onClick = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest("[data-row-menu]")) setRowMenuFor(null); };
    document.addEventListener("click", onClick);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => { document.removeEventListener("click", onClick); window.removeEventListener("scroll", close, true); window.removeEventListener("resize", close); };
  }, [rowMenuFor]);

  // Room inventory (for room details / type filtering) + availability for this group's
  // stay window. The backend cross-checks individual bookings AND group_rooming so
  // no room can be offered if it's already committed to any other booking or group.
  const [board, setBoard] = React.useState<RoomBoardRow[]>([]);
  React.useEffect(() => {
    apiGet<RoomBoardRow[]>("/room-board").then(setBoard).catch(() => {});
  }, []);
  const [availRoomData, setAvailRoomData] = React.useState<{ number: string; available: boolean; type: string }[]>([]);
  React.useEffect(() => {
    const from = (group?.arrival ?? "").slice(0, 10);
    const to   = (group?.departure ?? "").slice(0, 10);
    if (!from || !to || from >= to) return;
    apiGet<typeof availRoomData>(`/room-availability?from=${from}&to=${to}`)
      .then(setAvailRoomData).catch(() => {});
  }, [group?.arrival, group?.departure]);
  type RoomTypeCfg = { name: string; extraAdultRate?: number };
  type RatePlanCfg = { code: string; name: string; inclBreakfast?: boolean; inclLunch?: boolean; inclDinner?: boolean; breakfastPrice?: number; lunchPrice?: number; dinnerPrice?: number };
  const [roomTypes, setRoomTypes] = React.useState<RoomTypeCfg[]>([]);
  const [ratePlans, setRatePlans] = React.useState<RatePlanCfg[]>([]);
  const [gstSlabs, setGstSlabs] = React.useState<GstSlab[]>([]);
  React.useEffect(() => {
    apiGet<RoomTypeCfg[]>("/room-types").then(r => Array.isArray(r) && setRoomTypes(r)).catch(() => {});
    apiGet<RatePlanCfg[]>("/rate-plans").then(r => Array.isArray(r) && setRatePlans(r)).catch(() => {});
    apiGet<GstSlab[]>("/gst-slabs").then(r => Array.isArray(r) && setGstSlabs(r)).catch(() => {});
  }, []);
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
    setAssignId(null);
    flash(`Room ${roomNo} assigned to ${entry.lead}`);
  };

  // Rooms free for this group's stay: server availability already excludes rooms
  // committed via individual bookings OR other group rooming assignments.
  const freeRooms = React.useMemo(() => {
    const avail = new Set(availRoomData.filter(r => r.available).map(r => r.number));
    return board.filter(r => avail.has(r.number));
  }, [board, availRoomData]);

  // Rooms a given rooming entry can be assigned: free rooms of the matching type
  // that aren't already taken by another guest in THIS group (no duplicates).
  const assignableFor = React.useCallback((entry: RoomingEntry) => {
    const taken = new Set(rooming.filter(r => r.id !== entry.id && r.roomNo).map(r => r.roomNo as string));
    const ofType = freeRooms.filter(r => !taken.has(r.number) && (!entry.roomType || (r.type ?? "").toLowerCase() === entry.roomType.toLowerCase()));
    // If none of the exact type are free, fall back to any free room so the desk isn't stuck.
    return ofType.length ? ofType : freeRooms.filter(r => !taken.has(r.number));
  }, [freeRooms, rooming]);
  const addGuest = (g: { lead: string; roomType: string; pax: number; phone?: string; remarks?: string }) => {
    apiPost<RoomingEntry>("/group-rooming", { ...g, groupCode: id, roomNo: null })
      .then(row => setRooming(prev => [...prev, { ...row, id: String(row.id) }]))
      .catch(() => flash("⚠ Save failed — backend offline"));
    setAddGuestOpen(false);
    flash(`${g.lead} added to rooming list`);
  };
  // Remove a guest (and free their room) from the rooming list.
  const removeGuest = (entry: RoomingEntry) => {
    setRooming(prev => prev.filter(r => r.id !== entry.id));
    setRowMenuFor(null);
    apiDelete(`/group-rooming/${entry.id}`).catch(() => flash("⚠ Save failed — backend offline"));
    flash(`${entry.lead} removed from rooming list`);
  };
  // Clear a room assignment without removing the guest.
  const clearRoom = (entry: RoomingEntry) => {
    setRooming(prev => prev.map(r => r.id === entry.id ? { ...r, roomNo: null } : r));
    setRowMenuFor(null);
    apiPut(`/group-rooming/${entry.id}`, { roomNo: null }).catch(() => flash("⚠ Save failed — backend offline"));
    flash(`Room cleared for ${entry.lead}`);
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
      .filter(r => /group/i.test(r.module) && (r.entity === group?.name || r.entity === group?.code))
      .map(r => ({ id: r.id, action: `${r.action}${r.entity ? " · " + r.entity : ""}`, time: `${r.date} ${r.time}`.trim(), actor: r.user }));
  }, [auditRows, group?.name, group?.code]);

  // Receive payment — persists a master-folio payment + updates the group balance.
  const receivePayment = () => {
    if (!group) return;
    const amt = Math.round(Number(payAmount) || 0);
    if (amt <= 0) { flash("Enter a valid amount"); return; }
    const today = new Date().toISOString().slice(0, 10);
    apiPost("/folio-payments", { bookingNo: group.code, date: today, mode: payMode, amount: amt, reference: `Group ${group.code}` })
      .catch(() => flash("⚠ Payment not saved — backend offline"));
    const advance = group.advance + amt;
    const balance = Math.max(0, group.balance - amt);
    setGroup(g => g ? { ...g, advance, balance } : g);
    setPayAmount(balance);
    apiPut(`/group-bookings/${group.id}`, { advance, balance }).catch(() => {});
    flash(`Payment of ${money(amt)} recorded via ${payMode}`);
  };

  // Add a service — persists onto the group record.
  const addService = (name: string) => {
    if (!group) return;
    if (group.services.includes(name)) { flash(`${name} already added`); return; }
    const services = [...group.services, name];
    setGroup(g => g ? { ...g, services } : g);
    apiPut(`/group-bookings/${group.id}`, { services }).catch(() => flash("⚠ Save failed — backend offline"));
    flash(`${name} added to the group`);
  };

  // Auto-assign available rooms to unassigned guests and persist each.
  const autoAssign = () => {
    const unassigned = rooming.filter(r => !r.roomNo);
    if (!unassigned.length) { flash("All guests already have rooms"); return; }
    // Only rooms free for the group's stay window, minus ones already taken.
    const taken = new Set(rooming.map(r => r.roomNo).filter(Boolean) as string[]);
    const pool: string[] = freeRooms.map(r => r.number).filter(n => !taken.has(n));
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
    if (!group) return;
    setGroup(g => g ? { ...g, status: "in-house" } : g);
    apiPut(`/group-bookings/${group.id}`, { status: "in-house" }).catch(() => flash("⚠ Save failed — backend offline"));
    flash("Group checked in");
  };

  // Release one room back to housekeeping (dirty → ready for turnover).
  const releaseRoom = (roomNo?: string | null) => {
    if (!roomNo) return;
    const room = board.find(b => b.number === roomNo);
    if (room?.id != null) apiPut(`/rooms/${room.id}`, { hkStatus: "dirty" }).catch(() => {});
  };

  // ONE-BY-ONE check-out: mark this guest departed + release their room. Persists.
  const checkOutGuest = (entry: RoomingEntry) => {
    setRooming(prev => prev.map(r => r.id === entry.id ? { ...r, checkedOut: true } : r));
    apiPut(`/group-rooming/${entry.id}`, { checkedOut: true }).catch(() => flash("⚠ Save failed — backend offline"));
    releaseRoom(entry.roomNo);
    flash(`${entry.lead} checked out${entry.roomNo ? ` · Room ${entry.roomNo} → housekeeping` : ""}`);
  };

  // QUICK check-out: collect any final payment (→ master folio), check out every
  // remaining guest + release their room, then move the group to "completed".
  const checkOutGroup = (finalAmt: number, finalMode: string) => {
    if (!group) return;
    setCheckoutOpen(false);
    const today = new Date().toISOString().slice(0, 10);
    let advance = group.advance, balance = group.balance;
    if (finalAmt > 0) {
      advance = group.advance + finalAmt;
      balance = Math.max(0, group.balance - finalAmt);
      apiPost("/folio-payments", { bookingNo: group.code, date: today, mode: finalMode, amount: finalAmt, reference: `Group ${group.code} · checkout` }).catch(() => {});
    }
    const remaining = rooming.filter(r => !r.checkedOut);
    remaining.forEach(r => {
      apiPut(`/group-rooming/${r.id}`, { checkedOut: true }).catch(() => {});
      releaseRoom(r.roomNo);
    });
    const released = remaining.filter(r => r.roomNo).length;
    setRooming(prev => prev.map(r => ({ ...r, checkedOut: true })));
    setGroup(g => g ? { ...g, status: "completed", advance, balance } : g);
    apiPut(`/group-bookings/${group.id}`, { status: "completed", advance, balance }).catch(() => flash("⚠ Checkout not fully saved — backend offline"));
    flash(`${group.name} checked out · ${released} room${released === 1 ? "" : "s"} released to housekeeping`);
  };

  if (!group) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/groups" className="hover:text-foreground inline-flex items-center gap-1"><ChevronLeft className="h-3.5 w-3.5" />Groups</Link>
        </div>
        <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">Loading group…</div>
      </div>
    );
  }

  const allocated = rooming.filter(r => r.roomNo && String(r.roomNo).trim()).length;
  const allocPct = group.totalRooms > 0 ? Math.round((allocated / group.totalRooms) * 100) : 0;

  // Recompute the folio from the stored block + rate plan so the displayed total
  // matches what was quoted at creation (replaces the old hardcoded 5%/10% math).
  const planCfg = ratePlans.find(p => p.code === group.ratePlan || p.name === group.ratePlan);
  const planMeals = mealPerNightPerGuest({
    inclB: !!planCfg?.inclBreakfast, inclL: !!planCfg?.inclLunch, inclD: !!planCfg?.inclDinner,
    breakfastPrice: planCfg?.breakfastPrice ?? 0, lunchPrice: planCfg?.lunchPrice ?? 0, dinnerPrice: planCfg?.dinnerPrice ?? 0,
  }) * (group.totalPax || 0) * (group.nights || 0);
  const extraBedRateFor = (typeName: string) => roomTypes.find(t => t.name === typeName)?.extraAdultRate ?? 0;
  // Prefer the extra-bed rate frozen onto the block at creation (like room rate);
  // fall back to live Setup for legacy groups saved before it was persisted.
  const extraBedRateOf = (b: { type: string; extraBedRate?: number }) => b.extraBedRate ?? extraBedRateFor(b.type);
  const folio = computeGroupTotals(
    group.block.map(b => ({ rate: b.rate, qty: b.qty, extraBeds: b.extraBeds ?? 0, extraBedRate: extraBedRateOf(b) })),
    group.nights, [], group.totalPax || 0, gstSlabs, planMeals,
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      {/* Print-only group summary. Portaled to <body> so the global print CSS
          reveals it; without a .print-doc, window.print() hides the whole dark
          page (body * { visibility:hidden }) and produces a blank sheet. Explicit
          colors so it stays readable on white paper regardless of the dark theme. */}
      {printMounted && createPortal(
        <div className="print-doc">
          <div style={{ color: "#111", padding: "6mm", fontSize: "12px", lineHeight: 1.5, fontFamily: "system-ui, Arial, sans-serif" }}>
            <div style={{ textAlign: "center", borderBottom: "2px solid #999", paddingBottom: "10px", marginBottom: "14px" }}>
              <div style={{ fontSize: "18px", fontWeight: 600 }}>{hotel}</div>
              <div style={{ fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", color: "#666", marginTop: "2px" }}>Group Booking Summary</div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
              <div>
                <div style={{ fontSize: "15px", fontWeight: 600 }}>{group.name}</div>
                <div style={{ fontSize: "11px", color: "#666", textTransform: "capitalize" }}>{group.type} · {group.status}</div>
              </div>
              <div style={{ textAlign: "right", fontSize: "11px", color: "#666" }}>
                <div>Ref <span style={{ fontFamily: "monospace", color: "#111", fontWeight: 600 }}>{group.code}</span></div>
                <div>{new Date().toLocaleString(undefined, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
              </div>
            </div>

            <table style={{ width: "100%", fontSize: "11px", marginBottom: "16px", borderCollapse: "collapse" }}>
              <tbody>
                <tr><td style={{ color: "#666", padding: "2px 0", width: "30%", verticalAlign: "top" }}>Contact</td><td style={{ padding: "2px 0", fontWeight: 500 }}>{group.contactName}</td></tr>
                <tr><td style={{ color: "#666", padding: "2px 0", verticalAlign: "top" }}>Phone</td><td style={{ padding: "2px 0" }}>{group.contactPhone}</td></tr>
                <tr><td style={{ color: "#666", padding: "2px 0", verticalAlign: "top" }}>Email</td><td style={{ padding: "2px 0" }}>{group.contactEmail}</td></tr>
                <tr><td style={{ color: "#666", padding: "2px 0", verticalAlign: "top" }}>Stay</td><td style={{ padding: "2px 0", fontWeight: 500 }}>{formatDate(group.arrival)} → {formatDate(group.departure)} · {group.nights} night{group.nights === 1 ? "" : "s"}</td></tr>
                <tr><td style={{ color: "#666", padding: "2px 0", verticalAlign: "top" }}>Rooms / Pax</td><td style={{ padding: "2px 0" }}>{group.totalRooms} rooms · {group.totalPax} pax</td></tr>
                <tr><td style={{ color: "#666", padding: "2px 0", verticalAlign: "top" }}>Rate plan</td><td style={{ padding: "2px 0" }}>{group.ratePlan}</td></tr>
                {group.bookedBy && <tr><td style={{ color: "#666", padding: "2px 0", verticalAlign: "top" }}>Booked by</td><td style={{ padding: "2px 0" }}>{group.bookedBy}</td></tr>}
              </tbody>
            </table>

            <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#666", marginBottom: "4px" }}>Room block</div>
            <table style={{ width: "100%", fontSize: "11px", borderCollapse: "collapse", marginBottom: "16px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #ccc" }}>
                  <th style={{ textAlign: "left", padding: "4px 0" }}>Type</th>
                  <th style={{ textAlign: "right", padding: "4px 0" }}>Qty</th>
                  <th style={{ textAlign: "right", padding: "4px 0" }}>Rate/night</th>
                  <th style={{ textAlign: "right", padding: "4px 0" }}>Nights</th>
                  <th style={{ textAlign: "right", padding: "4px 0" }}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {group.block.map((b, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: "4px 0" }}>{b.type}{b.extraBeds ? ` · +${b.extraBeds} extra bed${b.extraBeds === 1 ? "" : "s"}` : ""}</td>
                    <td style={{ textAlign: "right", padding: "4px 0" }}>{b.qty}</td>
                    <td style={{ textAlign: "right", padding: "4px 0" }}>{money(b.rate)}</td>
                    <td style={{ textAlign: "right", padding: "4px 0" }}>{group.nights}</td>
                    <td style={{ textAlign: "right", padding: "4px 0", fontWeight: 600 }}>{money(b.qty * b.rate * group.nights + (b.extraBeds ?? 0) * extraBedRateOf(b) * group.nights)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ marginLeft: "auto", width: "55%", fontSize: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}><span style={{ color: "#666" }}>Total</span><span style={{ fontWeight: 600 }}>{money(group.total)}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}><span style={{ color: "#666" }}>Advance paid</span><span>− {money(group.advance)}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: "1px solid #ccc", fontWeight: 700 }}><span>Balance due</span><span>{money(group.balance)}</span></div>
            </div>

            <div style={{ marginTop: "20px", paddingTop: "8px", borderTop: "1px solid #eee", fontSize: "9px", color: "#999", textAlign: "center" }}>
              Computer-generated group booking summary · {hotel} · {group.code}
            </div>
          </div>
        </div>,
        document.body,
      )}

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
          {group.status === "in-house" && (
            <Button variant="success" onClick={() => setCheckoutOpen(true)}><LogOut className="h-4 w-4" />Check-out Group<ArrowRight className="h-4 w-4" /></Button>
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
              const assignedForType = rooming.filter(r => r.roomNo && r.roomType.toLowerCase() === b.type.toLowerCase()).length;
              const pct = b.qty > 0 ? Math.round((assignedForType / b.qty) * 100) : 0;
              return (
                <Card key={i} className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{b.type}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 tabular">{money(b.rate)} per night · group rate{b.extraBeds ? ` · +${b.extraBeds} extra bed${b.extraBeds > 1 ? "s" : ""}` : ""}</p>
                    </div>
                    <Badge tone={pct === 100 ? "success" : pct > 0 ? "warning" : "neutral"}>
                      {assignedForType}/{b.qty}
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
                    {assignId === g.id ? (() => {
                      const options = assignableFor(g);
                      return (
                        <Select
                          autoFocus
                          value={g.roomNo ?? ""}
                          onChange={e => { if (e.target.value) assignRoom(g, e.target.value); }}
                          onBlur={() => setAssignId(null)}
                          className="h-7 w-36 text-sm"
                        >
                          <option value="">Select a free room…</option>
                          {options.map(r => (
                            <option key={r.number} value={r.number}>Room {r.number}{r.type ? ` · ${r.type}` : ""}</option>
                          ))}
                          {options.length === 0 && <option value="" disabled>No rooms free for these dates</option>}
                        </Select>
                      );
                    })() : g.roomNo ? (
                      <button className="tabular hover:underline" onClick={() => setAssignId(g.id)} title="Click to reassign">{g.roomNo}</button>
                    ) : (
                      <button className="text-xs text-brand hover:underline" onClick={() => setAssignId(g.id)}>Assign</button>
                    )}
                  </td>
                  <td className="px-5 py-3"><Badge tone="neutral">{g.roomType}</Badge></td>
                  <td className="px-5 py-3">{g.lead}{g.checkedOut && <Badge tone="success" className="ml-2"><LogOut className="h-3 w-3" />Checked out</Badge>}</td>
                  <td className="px-5 py-3 text-right tabular">{g.pax}</td>
                  <td className="px-5 py-3 text-xs text-muted-foreground tabular">{g.phone ?? "—"}</td>
                  <td className="px-5 py-3 text-xs text-muted-foreground">{g.remarks ?? "—"}</td>
                  <td className="px-5 py-3 text-right">
                    <button
                      data-row-menu
                      className={cn("h-7 w-7 rounded-md inline-flex items-center justify-center transition-colors", rowMenuFor === g.id ? "bg-brand-soft text-brand-soft-foreground" : "text-muted-foreground hover:bg-surface-sunken hover:text-foreground")}
                      title="Row actions"
                      onClick={(e) => {
                        if (rowMenuFor === g.id) { setRowMenuFor(null); return; }
                        setRowMenuRect(e.currentTarget.getBoundingClientRect());
                        setRowMenuFor(g.id);
                      }}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
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
                    <button onClick={() => { const services = group.services.filter(x => x !== s); setGroup(g => g ? { ...g, services } : null); apiPut(`/group-bookings/${group.id}`, { services }).catch(() => flash("⚠ Save failed")); flash(`${s} removed`); }} className="text-muted-foreground hover:text-danger" title="Remove"><X className="h-4 w-4" /></button>
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
                {group.block.filter(b => b.extraBeds).map((b, i) => (
                  <tr key={`eb${i}`}>
                    <td className="px-5 py-3">{b.type} · extra bed · {group.nights} nights</td>
                    <td className="px-5 py-3 text-right tabular">{b.extraBeds}</td>
                    <td className="px-5 py-3 text-right tabular">{money(extraBedRateOf(b) * group.nights)}</td>
                    <td className="px-5 py-3 text-right tabular font-medium">{money((b.extraBeds ?? 0) * extraBedRateOf(b) * group.nights)}</td>
                  </tr>
                ))}
                {folio.mealsSubtotal > 0 && (
                  <tr>
                    <td className="px-5 py-3">Plan meals ({group.ratePlan}) · {group.totalPax} pax × {group.nights} nights</td>
                    <td className="px-5 py-3 text-right tabular">{group.totalPax}</td>
                    <td className="px-5 py-3 text-right tabular text-muted-foreground">—</td>
                    <td className="px-5 py-3 text-right tabular font-medium">{money(folio.mealsSubtotal)}</td>
                  </tr>
                )}
                {group.services.map((s, i) => (
                  <tr key={`s${i}`}>
                    <td className="px-5 py-3">{s}</td>
                    <td className="px-5 py-3 text-right tabular">1</td>
                    <td className="px-5 py-3 text-right tabular text-muted-foreground">—</td>
                    <td className="px-5 py-3 text-right tabular text-muted-foreground">—</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-surface-elevated border-t border-border">
                <tr>
                  <td colSpan={3} className="px-5 py-2 text-right text-xs uppercase tracking-wider font-semibold text-muted-foreground">Subtotal</td>
                  <td className="px-5 py-2 text-right tabular">{money(folio.roomSubtotal + folio.extraBedSubtotal + folio.mealsSubtotal)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="px-5 py-2 text-right text-xs uppercase tracking-wider font-semibold text-muted-foreground">Tax (GST)</td>
                  <td className="px-5 py-2 text-right tabular text-muted-foreground">{money(folio.gst)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="px-5 py-3 text-right text-xs uppercase tracking-wider font-semibold">Total</td>
                  <td className="px-5 py-3 text-right tabular font-semibold text-base">{money(folio.grandTotal)}</td>
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
      {checkoutOpen && (
        <CheckOutGroupDialog
          group={group}
          remainingGuests={rooming.filter(r => !r.checkedOut).length}
          roomsToRelease={rooming.filter(r => !r.checkedOut && r.roomNo).length}
          onClose={() => setCheckoutOpen(false)}
          onConfirm={(amt, mode) => checkOutGroup(amt, mode)}
        />
      )}

      {/* Rooming row actions — portalled so the table card's overflow can't clip it. */}
      {rowMenuFor && rowMenuRect && typeof document !== "undefined" && (() => {
        const entry = rooming.find(r => r.id === rowMenuFor);
        if (!entry) return null;
        const dropUp = rowMenuRect.bottom + 160 > window.innerHeight;
        const style: React.CSSProperties = {
          position: "fixed",
          right: Math.max(8, window.innerWidth - rowMenuRect.right),
          ...(dropUp ? { bottom: window.innerHeight - rowMenuRect.top + 4 } : { top: rowMenuRect.bottom + 4 }),
        };
        return createPortal(
          <div data-row-menu style={style} className="z-50 w-52 rounded-md border border-border bg-surface shadow-lg py-1 animate-in slide-in-from-top-1">
            <button type="button" onClick={() => { setRowMenuFor(null); setAssignId(entry.id); }} className="w-full px-3 py-2 text-sm hover:bg-surface-sunken inline-flex items-center gap-2.5 text-left">
              <BedDouble className="h-3.5 w-3.5 text-muted-foreground" />{entry.roomNo ? "Reassign room" : "Assign room"}
            </button>
            {entry.roomNo && (
              <button type="button" onClick={() => clearRoom(entry)} className="w-full px-3 py-2 text-sm hover:bg-surface-sunken inline-flex items-center gap-2.5 text-left">
                <X className="h-3.5 w-3.5 text-muted-foreground" />Clear room
              </button>
            )}
            {entry.roomNo && !entry.checkedOut && (
              <button type="button" onClick={() => { checkOutGuest(entry); setRowMenuFor(null); }} className="w-full px-3 py-2 text-sm hover:bg-surface-sunken inline-flex items-center gap-2.5 text-left">
                <LogOut className="h-3.5 w-3.5 text-success" />Check out guest
              </button>
            )}
            <div className="my-1 h-px bg-border" />
            <button type="button" onClick={() => removeGuest(entry)} className="w-full px-3 py-2 text-sm hover:bg-danger-soft text-danger inline-flex items-center gap-2.5 text-left">
              <X className="h-3.5 w-3.5" />Remove from list
            </button>
          </div>,
          document.body,
        );
      })()}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-md bg-foreground text-background px-4 py-2.5 text-sm font-medium shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

// ===================== CHECK-OUT GROUP DIALOG =====================
function CheckOutGroupDialog({ group, remainingGuests, roomsToRelease, onClose, onConfirm }: {
  group: GroupBooking; remainingGuests: number; roomsToRelease: number;
  onClose: () => void; onConfirm: (amount: number, mode: string) => void;
}) {
  const balance = Math.max(0, group.balance);
  const [amount, setAmount] = React.useState(balance);
  const [mode, setMode] = React.useState("Cash");
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);
  const row = (k: string, v: string, tone?: string) => (
    <div className="flex items-center justify-between"><span className={cn("text-muted-foreground", tone)}>{k}</span><span className={cn("tabular font-medium", tone)}>{v}</span></div>
  );
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <Card className="pointer-events-auto w-full max-w-md p-0 animate-in shadow-xl overflow-hidden">
          <div className="px-5 py-4 bg-surface-elevated border-b border-border flex items-center gap-3">
            <span className="h-10 w-10 rounded-md bg-success-soft text-success inline-flex items-center justify-center shrink-0"><LogOut className="h-5 w-5" /></span>
            <div className="flex-1 min-w-0"><h3 className="font-semibold truncate">Check out group</h3><p className="text-xs text-muted-foreground truncate">{group.name} · {group.code}</p></div>
            <button type="button" onClick={onClose} className="h-8 w-8 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
          </div>
          <div className="px-5 py-4 space-y-4">
            <div className="rounded-md bg-surface-sunken/40 border border-border p-3 text-xs text-muted-foreground leading-relaxed">
              Checks out the <span className="font-medium text-foreground">{remainingGuests} remaining guest{remainingGuests === 1 ? "" : "s"}</span>, releases <span className="font-medium text-foreground">{roomsToRelease} room{roomsToRelease === 1 ? "" : "s"}</span> to housekeeping, and marks the group <span className="font-medium text-foreground">completed</span>.
            </div>
            <div className="rounded-md border border-border p-3 space-y-1.5 text-sm">
              {row("Total", money(group.total))}
              {row("Received", money(group.advance))}
              <div className="border-t border-border pt-1.5 mt-1.5">
                {row(balance > 0 ? "Balance due" : "Settled", money(balance), balance > 0 ? "text-warning" : "text-success")}
              </div>
            </div>
            {balance > 0 && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label className="text-xs">Collect now (₹)</Label><Input type="number" min={0} value={amount} onChange={e => setAmount(Math.max(0, Number(e.target.value)))} className="h-9 tabular" /></div>
                  <div className="space-y-1.5"><Label className="text-xs">Mode</Label><Select value={mode} onChange={e => setMode(e.target.value)} className="h-9"><option>Cash</option><option>Card</option><option>UPI</option><option>Bank</option><option>Online</option></Select></div>
                </div>
                {amount < balance && <p className="text-[11px] text-warning">Checking out with {money(balance - amount)} still outstanding.</p>}
              </>
            )}
          </div>
          <div className="px-5 py-3 border-t border-border bg-surface-elevated flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button variant="success" onClick={() => onConfirm(Math.min(amount, balance), mode)}><CheckCircle2 className="h-4 w-4" />Check out &amp; complete</Button>
          </div>
        </Card>
      </div>
    </>
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
          <div className="space-y-1.5"><Label>Phone</Label><PhoneInput value={phone} onChange={v => setPhone(v)} size="md" invalid={phone !== "" && !isValidPhone(phone)} /></div>
          <div className="space-y-1.5"><Label>Remarks</Label><Input value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Preferences, notes…" /></div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!lead.trim() || !(phone === "" || isValidPhone(phone))} onClick={() => onSave({ lead: lead.trim(), roomType, pax, phone: phone || undefined, remarks: remarks || undefined })}>
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
