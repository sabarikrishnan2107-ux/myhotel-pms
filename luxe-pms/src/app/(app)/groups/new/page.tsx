"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  UsersRound, Calendar, BedDouble, Plus, Minus, Trash2, Sparkles,
  ChevronLeft, Send, Upload, CheckCircle2, ArrowRight, Building2, Briefcase,
} from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { isValidPhone } from "@/lib/phone";
import { EmailInput } from "@/components/ui/email-input";
import { isValidEmail } from "@/lib/email";
import { Badge } from "@/components/ui/badge";
import { cn, money } from "@/lib/utils";
import { apiGet, apiPost } from "@/lib/api";
import { computeGroupTotals, type GstSlab } from "@/lib/group-pricing";
import { type GroupPolicies, DEFAULT_POLICIES } from "@/app/(app)/setup/group-policies-manager";
import { mealPerNightPerGuest } from "@/lib/booking-pricing";

interface BlockRow { id: string; type: string; qty: number; rate: number; extraBeds: number; }

const TYPES = ["Wedding", "Conference", "Tour Group", "Sports Team", "Corporate Retreat", "Other"];

// One imported rooming-list guest (persisted to /group-rooming on create).
type RoomingGuest = { lead: string; roomType: string; pax: number; phone?: string; remarks?: string };

// Split one delimited line into cells, honoring double-quoted CSV fields.
function splitLine(line: string, delim: string): string[] {
  const out: string[] = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else inQ = false; }
      else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === delim) { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out.map(s => s.trim());
}

// Parse CSV/TSV text (from a file or clipboard) into rooming guests. The first
// row may be a header — columns are matched by name in any order. Without a
// recognizable header we assume the order: Name, Room Type, Pax, Phone, Remarks.
function parseRoomingList(text: string, defaultRoomType: string): RoomingGuest[] {
  const lines = text.split(/\r\n|\r|\n/).map(l => l.trim()).filter(Boolean);
  if (!lines.length) return [];
  const delim = lines[0].includes("\t") ? "\t" : ",";
  const rows = lines.map(l => splitLine(l, delim));

  const first = rows[0].map(c => c.toLowerCase());
  const headerKeys = ["name", "guest", "lead", "room", "type", "pax", "occup", "phone", "mobile", "contact", "remark", "note"];
  const hasHeader = first.some(c => headerKeys.some(k => c.includes(k)));
  const find = (...keys: string[]) => first.findIndex(c => keys.some(k => c.includes(k)));

  let idx = { name: 0, roomType: 1, pax: 2, phone: 3, remarks: 4 };
  let dataRows = rows;
  if (hasHeader) {
    idx = {
      name: Math.max(find("name", "guest", "lead"), 0),
      roomType: find("room", "type"),
      pax: find("pax", "occup"),
      phone: find("phone", "mobile", "contact"),
      remarks: find("remark", "note"),
    };
    dataRows = rows.slice(1);
  }

  const guests: RoomingGuest[] = [];
  for (const r of dataRows) {
    const lead = (r[idx.name] ?? "").trim();
    if (!lead) continue; // name is required
    const paxRaw = idx.pax >= 0 ? parseInt((r[idx.pax] ?? "").replace(/[^\d]/g, ""), 10) : NaN;
    guests.push({
      lead,
      roomType: (idx.roomType >= 0 ? (r[idx.roomType] ?? "").trim() : "") || defaultRoomType,
      pax: Number.isFinite(paxRaw) && paxRaw > 0 ? paxRaw : 1,
      phone: idx.phone >= 0 ? ((r[idx.phone] ?? "").trim() || undefined) : undefined,
      remarks: idx.remarks >= 0 ? ((r[idx.remarks] ?? "").trim() || undefined) : undefined,
    });
  }
  return guests;
}

export default function NewGroupPage() {
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState("Wedding");
  const [contactName, setContactName] = React.useState("");
  const [contactPhone, setContactPhone] = React.useState("");
  const [contactEmail, setContactEmail] = React.useState("");
  const [bookedBy, setBookedBy] = React.useState("Direct");
  const [arrival, setArrival] = React.useState("");
  const [departure, setDeparture] = React.useState("");
  const [ratePlan, setRatePlan] = React.useState("CP");
  const [paymentTerm, setPaymentTerm] = React.useState<number | "custom">(30);
  const [customAdvance, setCustomAdvance] = React.useState<number | null>(null);
  const [policies, setPolicies] = React.useState<GroupPolicies>(DEFAULT_POLICIES);
  const [billingMode, setBillingMode] = React.useState<"master" | "per-room" | "split">("master");
  const [notes, setNotes] = React.useState("");
  const [services, setServices] = React.useState<string[]>([]);
  const [pax, setPax] = React.useState(0);

  // Start with one empty room-block row so the structure is visible; the user
  // fills in the quantity. Rate is set by suggestRate once room types load.
  const [block, setBlock] = React.useState<BlockRow[]>([
    { id: "b1", type: "Deluxe", qty: 0, rate: 0, extraBeds: 0 },
  ]);

  // Room availability for the chosen date window — fetched from the backend which
  // cross-checks individual bookings AND group rooming assignments so the same room
  // can never be double-booked across any flow.
  const [availData, setAvailData] = React.useState<{ number: string; type: string; available: boolean }[]>([]);
  React.useEffect(() => {
    const from = (arrival ?? "").slice(0, 10);
    const to   = (departure ?? "").slice(0, 10);
    if (!from || !to || from >= to) { setAvailData([]); return; }
    apiGet<typeof availData>(`/room-availability?from=${from}&to=${to}`)
      .then(setAvailData).catch(() => {});
  }, [arrival, departure]);

  // Config state — room types, rate plans, agents, service catalog, GST slabs
  type RoomType = { name: string; baseTariff: number; maxAdults?: number; extraAdultRate?: number };
  type RatePlan = { code: string; name: string; discountPct?: number; inclBreakfast?: boolean; inclLunch?: boolean; inclDinner?: boolean; breakfastPrice?: number; lunchPrice?: number; dinnerPrice?: number };
  type AgentRow = { name: string; type?: string };
  type GroupSvc = { id: number | string; name: string; category: string; price: number; perPax: boolean; gst: number; active: boolean };
  const [roomTypes, setRoomTypes] = React.useState<RoomType[]>([]);
  const [ratePlans, setRatePlans] = React.useState<RatePlan[]>([]);
  const [agents, setAgents] = React.useState<AgentRow[]>([]);
  const [svcCatalog, setSvcCatalog] = React.useState<GroupSvc[]>([]);
  const [gstSlabs, setGstSlabs] = React.useState<GstSlab[]>([]);
  React.useEffect(() => {
    apiGet<RoomType[]>("/room-types").then(r => Array.isArray(r) && setRoomTypes(r)).catch(() => {});
    apiGet<RatePlan[]>("/rate-plans").then(r => Array.isArray(r) && setRatePlans(r)).catch(() => {});
    apiGet<AgentRow[]>("/agents").then(r => Array.isArray(r) && setAgents(r)).catch(() => {});
    apiGet<GroupSvc[]>("/group-services").then(r => Array.isArray(r) && setSvcCatalog(r.filter(s => s.active))).catch(() => {});
    apiGet<GstSlab[]>("/gst-slabs").then(r => Array.isArray(r) && setGstSlabs(r)).catch(() => {});
    apiGet<Partial<GroupPolicies>>("/settings/group_policies").then(d => {
      if (d && typeof d === "object") {
        const merged: GroupPolicies = {
          depositPresets: Array.isArray(d.depositPresets) && d.depositPresets.length ? d.depositPresets : DEFAULT_POLICIES.depositPresets,
          cancellationTiers: Array.isArray(d.cancellationTiers) ? d.cancellationTiers : DEFAULT_POLICIES.cancellationTiers,
          discountTiers: Array.isArray(d.discountTiers) ? d.discountTiers : DEFAULT_POLICIES.discountTiers,
        };
        setPolicies(merged);
        // Set first deposit preset as default advance
        if (merged.depositPresets.length) setPaymentTerm(merged.depositPresets[0]);
      }
    }).catch(() => {});
  }, []);

  const selectedPlan = ratePlans.find(p => p.code === ratePlan || p.name === ratePlan);
  const planDiscount = Number(selectedPlan?.discountPct) || 0;

  // totalRooms must be computed before volumeDiscountPct (which depends on it).
  const totalRooms = block.reduce((s, b) => s + b.qty, 0);

  // Volume discount: highest tier whose minRooms threshold the block meets.
  const volumeDiscountPct = (() => {
    const tiers = [...policies.discountTiers].sort((a, b) => b.minRooms - a.minRooms);
    return tiers.find(t => totalRooms >= t.minRooms)?.discountPct ?? 0;
  })();

  const suggestRate = React.useCallback((typeName: string) => {
    const base = roomTypes.find(t => t.name === typeName)?.baseTariff ?? 0;
    const combinedDiscount = Math.min(planDiscount + volumeDiscountPct, 100);
    return Math.round(base * (1 - combinedDiscount / 100));
  }, [roomTypes, planDiscount, volumeDiscountPct]);

  // Track which rows the user has manually edited the rate for
  const editedRates = React.useRef<Set<string>>(new Set());
  // Fill unedited room rates once room types / plan load
  React.useEffect(() => {
    if (!roomTypes.length) return;
    setBlock(prev => prev.map(r => editedRates.current.has(r.id) ? r : { ...r, rate: suggestRate(r.type) || r.rate }));
  }, [roomTypes, suggestRate]);

  // Count free rooms per type from the server-side availability response.
  const availabilityByType = React.useMemo(() => {
    const result: Record<string, number> = {};
    availData.filter(r => r.available).forEach(r => {
      const key = r.type.toLowerCase();
      result[key] = (result[key] ?? 0) + 1;
    });
    return result;
  }, [availData]);

  const datesChosen = !!(arrival && departure && arrival < departure);
  // Max qty for a row = free rooms of its type minus what earlier rows of the
  // same type already reserved (so multiple rows can't double-book the pool).
  const maxQtyForRow = React.useCallback((arr: BlockRow[], i: number) => {
    const r = arr[i];
    const avail = availabilityByType[r.type.toLowerCase()] ?? 0;
    const usedBefore = arr.slice(0, i)
      .filter(x => x.type.toLowerCase() === r.type.toLowerCase())
      .reduce((s, x) => s + x.qty, 0);
    return Math.max(0, avail - usedBefore);
  }, [availabilityByType]);

  // When the date window (and thus availability) changes, clamp any quantity
  // that now exceeds what's free.
  React.useEffect(() => {
    if (!datesChosen) return;
    setBlock(prev => {
      let changed = false;
      const next = prev.map((r, i, arr) => {
        const max = maxQtyForRow(arr, i);
        if (r.qty > max) { changed = true; return { ...r, qty: max }; }
        return r;
      });
      return changed ? next : prev;
    });
  }, [datesChosen, maxQtyForRow]);

  // Imported rooming list (CSV upload / clipboard paste). Persisted to
  // /group-rooming after the group is created.
  const [rooming, setRooming] = React.useState<RoomingGuest[]>([]);
  const [pasteOpen, setPasteOpen] = React.useState(false);
  const [importMsg, setImportMsg] = React.useState("");
  const fileRef = React.useRef<HTMLInputElement>(null);

  const ingestRooming = (text: string) => {
    const defaultType = block[0]?.type ?? "Deluxe";
    const parsed = parseRoomingList(text, defaultType);
    if (!parsed.length) { setImportMsg("Couldn't find any guest rows — check the format."); return; }
    setRooming(parsed);
    setPasteOpen(false);
    setImportMsg(`${parsed.length} guest${parsed.length === 1 ? "" : "s"} imported.`);
  };

  const onUploadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then(ingestRooming).catch(() => setImportMsg("Couldn't read that file."));
    e.target.value = ""; // allow re-uploading the same file
  };

  const onPasteClipboard = async () => {
    setImportMsg("");
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) { ingestRooming(text); return; }
      setPasteOpen(true); // clipboard empty → offer manual paste
    } catch {
      setPasteOpen(true); // permission blocked → fall back to a paste box
    }
  };

  const todayISO = new Date().toLocaleDateString("en-CA"); // blocks past dates on arrival/departure
  const nights = (() => {
    const a = new Date(arrival); const d = new Date(departure);
    if (!arrival || !departure || isNaN(+a) || isNaN(+d)) return 0; // no dates yet → blank summary, not NaN
    return Math.max(1, Math.round((+d - +a) / (1000 * 60 * 60 * 24)));
  })();

  const selectedSvcLines = services
    .map(id => svcCatalog.find(s => String(s.id) === id))
    .filter((s): s is GroupSvc => !!s)
    .map(s => ({ price: s.price, perPax: s.perPax, gst: s.gst }));

  const extraBedRateFor = (typeName: string) => roomTypes.find(t => t.name === typeName)?.extraAdultRate ?? 0;
  const maxAdultsFor = (typeName: string) => roomTypes.find(t => t.name === typeName)?.maxAdults ?? 2;

  // Configured rate-plan meals: same per-guest-per-night math as booking/walk-in.
  const planMeals = mealPerNightPerGuest({
    inclB: !!selectedPlan?.inclBreakfast, inclL: !!selectedPlan?.inclLunch, inclD: !!selectedPlan?.inclDinner,
    breakfastPrice: selectedPlan?.breakfastPrice ?? 0, lunchPrice: selectedPlan?.lunchPrice ?? 0, dinnerPrice: selectedPlan?.dinnerPrice ?? 0,
  }) * pax * nights;

  const totals = computeGroupTotals(
    block.map(b => ({ rate: b.rate, qty: b.qty, extraBeds: b.extraBeds, extraBedRate: extraBedRateFor(b.type) })),
    nights, selectedSvcLines, pax, gstSlabs, planMeals,
  );
  const roomSubtotal = totals.roomSubtotal;
  const extraBedTotal = totals.extraBedSubtotal;
  const mealsTotal = totals.mealsSubtotal;
  const servicesTotal = totals.servicesSubtotal;
  const subtotal = roomSubtotal + extraBedTotal + mealsTotal + servicesTotal;
  const tax = totals.gst;
  const total = totals.grandTotal;

  // Soft occupancy check: rooms (× included adults) + extra beds vs expected pax.
  const blockCapacity = block.reduce((s, b) => s + b.qty * maxAdultsFor(b.type) + b.extraBeds, 0);
  const overCapacity = pax > 0 && totalRooms > 0 && pax > blockCapacity;

  const advance = customAdvance !== null
    ? Math.min(Math.max(0, Math.round(customAdvance)), total)
    : Math.round((total * paymentTerm) / 100);

  const updateBlock = (id: string, key: keyof BlockRow, value: number | string) => {
    setBlock(b => b.map(r => {
      if (r.id !== id) return r;
      if (key === "rate") { editedRates.current.add(id); return { ...r, rate: Number(value) || 0 }; }
      if (key === "type") { const next = { ...r, type: String(value) }; if (!editedRates.current.has(id)) next.rate = suggestRate(String(value)) || r.rate; return next; }
      if (key === "qty") { const qty = Number(value) || 0; return { ...r, qty, extraBeds: Math.min(r.extraBeds, qty) }; }
      if (key === "extraBeds") { return { ...r, extraBeds: Math.max(0, Math.min(Number(value) || 0, r.qty)) }; }
      return r; // id is never updated through this handler; all editable keys are handled above
    }));
  };
  const removeBlock = (id: string) => setBlock(b => b.filter(r => r.id !== id));
  const addBlock = () => setBlock(b => [...b, { id: `b${Date.now()}`, type: "Deluxe", qty: 0, rate: 0, extraBeds: 0 }]);

  const router = useRouter();
  const [saving, setSaving] = React.useState(false);
  const requiredOk = !!(name && contactName && isValidPhone(contactPhone) && isValidEmail(contactEmail) && arrival && departure && block.length);

  const save = (status: "confirmed" | "tentative") => {
    if (saving || !requiredOk) return;
    setSaving(true);
    const code = `GRP${Date.now().toString().slice(-7)}`;
    apiPost("/group-bookings", {
      code, name, type, contactName, contactPhone, contactEmail,
      bookedBy, arrival, departure, nights,
      block: block.map(b => ({ type: b.type, qty: b.qty, rate: b.rate, assigned: 0, extraBeds: b.extraBeds, extraBedRate: extraBedRateFor(b.type) })),
      totalRooms, totalPax: pax, ratePlan,
      services: services.map(id => svcCatalog.find(s => String(s.id) === id)?.name ?? id),
      total: Math.round(total), advance: Math.round(advance), balance: Math.round(total - advance),
      status, notes, createdAt: new Date().toISOString().slice(0, 10),
    })
      // Persist the imported rooming list (if any) against the new group code.
      .then(() => rooming.length
        ? Promise.all(rooming.map(g => apiPost("/group-rooming", {
            groupCode: code, roomNo: null,
            lead: g.lead, roomType: g.roomType, pax: g.pax,
            phone: g.phone ?? "", remarks: g.remarks ?? "",
          }).catch(() => null)))
        : null)
      .then(() => router.push("/groups"))
      .catch(() => setSaving(false));
  };

  return (
    <div className="p-4 sm:p-6 lg:p-6 w-full">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/groups" className="hover:text-foreground inline-flex items-center gap-1"><ChevronLeft className="h-3.5 w-3.5" />Groups</Link>
        </div>
        <Link href="/groups"><Button variant="ghost">Cancel</Button></Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-display font-medium tracking-tight">New Group Booking</h1>
          <p className="text-muted-foreground text-sm mt-1">One workflow for many rooms · agent or corporate · master folio + per-room incidentals</p>
        </div>
        <Badge tone="brand"><Sparkles className="h-3 w-3" />AI fills suggested rates from past groups</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        {/* Left: form */}
        <div className="space-y-5">
          {/* Group identity */}
          <Card className="p-6 space-y-4">
            <SectionHead icon={UsersRound} title="Group Identity" hint="What is the group called and what's its purpose?" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Group name *">
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Al-Mansoori Wedding" />
              </Field>
              <Field label="Group type *">
                <Select value={type} onChange={e => setType(e.target.value)}>
                  {TYPES.map(t => <option key={t}>{t}</option>)}
                </Select>
              </Field>
            </div>

            <Field label="Booked by">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { v: "Direct", icon: UsersRound, label: "Direct guest" },
                  { v: "Agent", icon: Briefcase, label: "Travel Agent" },
                  { v: "Corporate", icon: Building2, label: "Corporate" },
                ].map(o => {
                  const Icon = o.icon;
                  return (
                    <button
                      key={o.v}
                      type="button"
                      onClick={() => setBookedBy(o.v)}
                      className={cn(
                        "p-3 rounded-md border text-sm transition-colors flex items-center gap-2",
                        bookedBy === o.v ? "border-brand bg-brand-soft text-brand-soft-foreground" : "border-border hover:bg-surface-sunken"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </Field>

            {bookedBy !== "Direct" && (
              <Field label={bookedBy === "Agent" ? "Choose travel agent" : "Choose corporate account"}>
                <Select>
                  {agents.length ? agents.map(a => <option key={a.name} value={a.name}>{a.name}</option>) : <option value="">No agents configured</option>}
                </Select>
              </Field>
            )}
          </Card>

          {/* Contact */}
          <Card className="p-6 space-y-4">
            <SectionHead icon={UsersRound} title="Primary Contact" hint="Who do we coordinate with for this group?" />
            <Field label="Contact name *">
              <Input value={contactName} onChange={e => setContactName(e.target.value)} />
            </Field>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Phone *"><PhoneInput value={contactPhone} onChange={v => setContactPhone(v)} size="md" invalid={contactPhone !== "" && !isValidPhone(contactPhone)} /></Field>
              <Field label="Email"><EmailInput value={contactEmail} onChange={setContactEmail} /></Field>
            </div>
          </Card>

          {/* Dates */}
          <Card className="p-6 space-y-4">
            <SectionHead icon={Calendar} title="Stay Dates" hint="Group rate applies for the whole stay window" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Arrival *"><Input type="date" value={arrival} min={todayISO} onChange={e => setArrival(e.target.value)} /></Field>
              <Field label="Departure *"><Input type="date" value={departure} min={arrival > todayISO ? arrival : todayISO} onChange={e => setDeparture(e.target.value)} /></Field>
              <Field label="Total expected pax *"><Input type="number" value={pax} onChange={e => setPax(Number(e.target.value))} /></Field>
            </div>
            {overCapacity && (
              <p className="text-xs text-warning inline-flex items-center gap-1.5">
                <UsersRound className="h-3.5 w-3.5" />Blocked rooms seat up to {blockCapacity}. Add rooms or extra beds to fit {pax - blockCapacity} more.
              </p>
            )}
            <div className="rounded-md bg-brand-soft text-brand-soft-foreground p-3 flex items-center gap-3 text-sm">
              <Calendar className="h-4 w-4" />
              <span><span className="font-semibold">{nights} nights</span> · {arrival} → {departure}</span>
            </div>
          </Card>

          {/* Room block */}
          <Card className="p-6 space-y-4">
            <SectionHead icon={BedDouble} title="Room Block" hint="Allocate rooms by type — only rooms free for these dates can be blocked" />

            {!datesChosen && (
              <p className="text-xs text-warning inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />Pick arrival &amp; departure dates above to see how many rooms are available.
              </p>
            )}

            <div className="space-y-2">
              {block.map((row, i) => {
                const typeAvail = availabilityByType[row.type.toLowerCase()] ?? 0;
                const maxQty = maxQtyForRow(block, i);
                const atMax = datesChosen && row.qty >= maxQty;
                return (
                <div key={row.id} className="grid grid-cols-12 gap-2 items-end p-3 rounded-md border border-border bg-surface-sunken/30">
                  <div className="col-span-12 sm:col-span-4">
                    <Label>Room type</Label>
                    <Select value={row.type} onChange={e => updateBlock(row.id, "type", e.target.value)}>
                      {roomTypes.map(t => (
                        <option key={t.name} value={t.name}>
                          {t.name}{datesChosen ? ` — ${availabilityByType[t.name.toLowerCase()] ?? 0} free` : ""}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="col-span-5 sm:col-span-3">
                    <Label>Quantity</Label>
                    <div className="flex items-center border border-border rounded-md h-10 bg-surface">
                      <button type="button" onClick={() => updateBlock(row.id, "qty", Math.max(0, row.qty - 1))} className="h-full w-10 hover:bg-surface-sunken inline-flex items-center justify-center border-r border-border disabled:opacity-40 disabled:cursor-not-allowed" disabled={row.qty <= 0}><Minus className="h-3.5 w-3.5" /></button>
                      <span className="flex-1 text-center font-medium tabular">{row.qty}</span>
                      <button type="button" onClick={() => updateBlock(row.id, "qty", Math.min(maxQty, row.qty + 1))} className="h-full w-10 hover:bg-surface-sunken inline-flex items-center justify-center border-l border-border disabled:opacity-40 disabled:cursor-not-allowed" disabled={!datesChosen || atMax} title={!datesChosen ? "Select dates first" : atMax ? "No more rooms of this type free for these dates" : "Add a room"}><Plus className="h-3.5 w-3.5" /></button>
                    </div>
                    {datesChosen && (
                      <p className={cn("text-[10px] mt-1", typeAvail === 0 ? "text-danger" : atMax ? "text-warning" : "text-muted-foreground")}>
                        {typeAvail === 0 ? "None free for these dates" : `${maxQty} of ${typeAvail} still available`}
                      </p>
                    )}
                  </div>
                  <div className="col-span-5 sm:col-span-3">
                    <Label>Group rate / night</Label>
                    <Input type="number" value={row.rate} onChange={e => updateBlock(row.id, "rate", Number(e.target.value))} />
                  </div>
                  <div className="col-span-2 sm:col-span-2 flex items-end justify-end">
                    <button onClick={() => removeBlock(row.id)} type="button" className="h-10 w-10 rounded-md inline-flex items-center justify-center text-subtle-foreground hover:text-danger hover:bg-danger-soft" aria-label="Remove row">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {datesChosen && row.qty > 0 && (
                    <div className="col-span-12 flex items-center gap-3 pt-1 text-xs">
                      <span className="text-muted-foreground">Extra bed</span>
                      <div className="flex items-center border border-border rounded-md h-8 bg-surface">
                        <button type="button" onClick={() => updateBlock(row.id, "extraBeds", row.extraBeds - 1)} className="h-full w-8 hover:bg-surface-sunken inline-flex items-center justify-center border-r border-border disabled:opacity-40 disabled:cursor-not-allowed" disabled={row.extraBeds <= 0}><Minus className="h-3 w-3" /></button>
                        <span className="w-8 text-center font-medium tabular">{row.extraBeds}</span>
                        <button type="button" onClick={() => updateBlock(row.id, "extraBeds", row.extraBeds + 1)} className="h-full w-8 hover:bg-surface-sunken inline-flex items-center justify-center border-l border-border disabled:opacity-40 disabled:cursor-not-allowed" disabled={row.extraBeds >= row.qty} title={row.extraBeds >= row.qty ? "One extra bed per room max" : "Add an extra bed"}><Plus className="h-3 w-3" /></button>
                      </div>
                      <span className="text-muted-foreground">
                        {extraBedRateFor(row.type) > 0 ? `+${money(extraBedRateFor(row.type))}/night each` : "No extra-bed rate set for this type"}
                      </span>
                    </div>
                  )}
                </div>
                );
              })}
              <Button variant="outline" size="sm" onClick={addBlock}><Plus className="h-3.5 w-3.5" />Add room type</Button>
            </div>

            <div className="border-t border-border pt-3 grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center justify-between p-3 rounded-md bg-surface-sunken">
                <span className="text-muted-foreground">Total rooms blocked</span>
                <span className="font-semibold tabular">{totalRooms}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-md bg-surface-sunken">
                <span className="text-muted-foreground">Room subtotal</span>
                <span className="font-semibold tabular">{money(roomSubtotal)}</span>
              </div>
            </div>
          </Card>

          {/* Rate plan */}
          <Card className="p-6 space-y-4">
            <SectionHead icon={Sparkles} title="Rate Plan & Inclusions" hint="What's included in the room rate" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {ratePlans.length ? ratePlans.map(p => (
                <button
                  key={p.code}
                  type="button"
                  onClick={() => setRatePlan(p.code)}
                  className={cn(
                    "p-3 rounded-md border text-left text-sm transition-colors",
                    ratePlan === p.code ? "bg-brand-soft border-brand" : "border-border hover:bg-surface-sunken"
                  )}
                >
                  <span className="font-medium">{p.code}</span>
                  <p className="text-xs text-muted-foreground mt-0.5">{p.name}{p.discountPct ? ` (−${p.discountPct}%)` : ""}</p>
                </button>
              )) : (
                <button
                  type="button"
                  onClick={() => setRatePlan("CP")}
                  className={cn(
                    "p-3 rounded-md border text-left text-sm transition-colors",
                    ratePlan === "CP" ? "bg-brand-soft border-brand" : "border-border hover:bg-surface-sunken"
                  )}
                >
                  <span className="font-medium">CP</span>
                  <p className="text-xs text-muted-foreground mt-0.5">Room + Breakfast</p>
                </button>
              )}
            </div>
          </Card>

          {/* Services */}
          <Card className="p-6 space-y-4">
            <SectionHead icon={Building2} title="Services & Add-ons" hint="Halls, F&B, transfers, decoration — anything extra" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {svcCatalog.map(svc => {
                const id = String(svc.id);
                const on = services.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setServices(v => on ? v.filter(x => x !== id) : [...v, id])}
                    className={cn(
                      "p-3 rounded-md border text-left transition-colors flex items-start justify-between gap-2",
                      on ? "bg-brand-soft border-brand" : "border-border hover:bg-surface-sunken"
                    )}
                  >
                    <div>
                      <p className="text-sm font-medium">{svc.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 tabular">
                        {money(svc.price)}{svc.perPax ? "/pax" : ""}
                      </p>
                    </div>
                    {on && <CheckCircle2 className="h-4 w-4 text-brand shrink-0" />}
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Billing setup */}
          <Card className="p-6 space-y-4">
            <SectionHead icon={UsersRound} title="Billing Setup" hint="How charges are routed across folios" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { v: "master", t: "Master folio", d: "All charges → group" },
                { v: "per-room", t: "Per-room folio", d: "Each room pays own" },
                { v: "split", t: "Split", d: "Room → group · Extras → guest" },
              ].map(o => (
                <button
                  key={o.v}
                  type="button"
                  onClick={() => setBillingMode(o.v as typeof billingMode)}
                  className={cn(
                    "p-3 rounded-md border text-left transition-colors",
                    billingMode === o.v ? "bg-brand-soft border-brand" : "border-border hover:bg-surface-sunken"
                  )}
                >
                  <p className="text-sm font-medium">{o.t}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{o.d}</p>
                </button>
              ))}
            </div>
          </Card>

          {/* Rooming list */}
          <Card className="p-6 space-y-3">
            <SectionHead icon={UsersRound} title="Rooming List" hint="Add guest details now or import later" />

            {rooming.length === 0 ? (
              <div className="rounded-md border border-dashed border-border p-6 text-center">
                <Upload className="h-6 w-6 mx-auto text-subtle-foreground" />
                <p className="text-sm mt-2">Import rooming list</p>
                <p className="text-xs text-muted-foreground mt-1">CSV · or paste from Excel / email · or fill in after creating the group</p>
                <p className="text-[11px] text-subtle-foreground mt-1">Columns (any order): Name · Room Type · Pax · Phone · Remarks</p>
                <div className="mt-3 flex gap-2 justify-center">
                  <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}><Upload className="h-3.5 w-3.5" />Upload File</Button>
                  <Button type="button" variant="ghost" size="sm" onClick={onPasteClipboard}>Paste from clipboard</Button>
                </div>
                <input ref={fileRef} type="file" accept=".csv,.tsv,.txt,text/csv,text/plain" className="hidden" onChange={onUploadFile} />
              </div>
            ) : (
              <div className="rounded-md border border-border overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 bg-surface-sunken/50 border-b border-border">
                  <p className="text-xs font-semibold inline-flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" />{rooming.length} guest{rooming.length === 1 ? "" : "s"} imported
                  </p>
                  <button type="button" onClick={() => { setRooming([]); setImportMsg(""); }} className="text-[11px] text-muted-foreground hover:text-danger inline-flex items-center gap-1">
                    <Trash2 className="h-3 w-3" />Clear
                  </button>
                </div>
                <div className="max-h-56 overflow-y-auto divide-y divide-border">
                  {rooming.map((g, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2 text-sm">
                      <span className="text-[10px] tabular text-subtle-foreground w-5 shrink-0">{i + 1}</span>
                      <span className="font-medium flex-1 min-w-0 truncate">{g.lead}</span>
                      <Badge tone="neutral">{g.roomType}</Badge>
                      <span className="text-xs text-muted-foreground tabular w-12 text-right">{g.pax} pax</span>
                      <span className="text-xs text-muted-foreground tabular w-28 truncate hidden sm:block">{g.phone ?? "—"}</span>
                    </div>
                  ))}
                </div>
                <div className="px-3 py-2 text-[11px] text-muted-foreground border-t border-border">
                  These guests will be saved to the group&apos;s Rooming List when you create the booking.
                </div>
              </div>
            )}

            {pasteOpen && (
              <div className="space-y-2">
                <textarea
                  autoFocus
                  rows={4}
                  placeholder={"Paste rows here (Ctrl/Cmd+V).\nName, Room Type, Pax, Phone, Remarks"}
                  onChange={e => { if (e.target.value.trim()) ingestRooming(e.target.value); }}
                  className="w-full px-3 py-2 rounded-md border border-border bg-surface text-sm font-mono placeholder:text-subtle-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 outline-hidden resize-none"
                />
                <button type="button" onClick={() => setPasteOpen(false)} className="text-[11px] text-muted-foreground hover:text-foreground">Cancel</button>
              </div>
            )}

            {importMsg && <p className="text-xs text-muted-foreground">{importMsg}</p>}
          </Card>

          {/* Notes */}
          <Card className="p-6 space-y-3">
            <SectionHead icon={Sparkles} title="Internal Notes & Special Requests" hint="Visible to all staff handling this group" />
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="VIP suite assignments, room blocks, dietary needs, decoration timing, etc."
              className="w-full px-3 py-2 rounded-md border border-border bg-surface text-sm placeholder:text-subtle-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 outline-hidden resize-none"
            />
          </Card>
        </div>

        {/* Right: live summary */}
        <Card className="p-6 h-fit sticky top-20 space-y-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Live Summary</p>
          </div>

          <div>
            <p className="font-semibold text-base">{name || "Untitled group"}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{type}{bookedBy !== "Direct" ? ` · via ${bookedBy}` : ""}</p>
          </div>

          <dl className="space-y-2 text-sm border-t border-border pt-3">
            <Row k="Contact" v={contactName || "—"} />
            <Row k="Dates" v={`${arrival} → ${departure}`} />
            <Row k="Nights" v={`${nights}`} />
            <Row k="Pax" v={`${pax}`} />
            <Row k="Rooms blocked" v={`${totalRooms}`} />
            <Row k="Rate plan" v={ratePlan} />
            <Row k="Billing" v={billingMode === "master" ? "Master folio" : billingMode === "per-room" ? "Per-room" : "Split"} />
          </dl>

          <div className="border-t border-border pt-3 space-y-2 text-sm">
            <Row k="Room subtotal" v={money(roomSubtotal)} muted />
            {extraBedTotal > 0 && <Row k="Extra beds" v={money(extraBedTotal)} muted />}
            {mealsTotal > 0 && <Row k="Plan meals" v={money(mealsTotal)} muted />}
            <Row k="Services" v={money(servicesTotal)} muted />
            <Row k="Tax (GST)" v={money(tax)} muted />
            <div className="border-t border-border pt-2 mt-2">
              <Row k={<span className="font-semibold">Total</span>} v={<span className="font-semibold tabular text-base">{money(total)}</span>} />
            </div>
          </div>

          <div className="border-t border-border pt-3">
            <Label>Advance payment</Label>
            <div className="flex gap-1.5 mt-1.5 flex-wrap">
              {policies.depositPresets.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPaymentTerm(p)}
                  className={cn(
                    "h-9 px-3 rounded-md border text-xs font-medium transition-colors",
                    paymentTerm === p ? "bg-brand text-brand-foreground border-brand" : "border-border hover:bg-surface-sunken"
                  )}
                >
                  {p === 100 ? "Full" : `${p}%`}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPaymentTerm("custom")}
                className={cn(
                  "h-9 px-3 rounded-md border text-xs font-medium transition-colors",
                  paymentTerm === "custom" ? "bg-brand text-brand-foreground border-brand" : "border-border hover:bg-surface-sunken"
                )}
              >
                Instalments
              </button>
            </div>
            {paymentTerm !== "custom" && (
              <div className="mt-3 space-y-1.5 text-sm">
                <Row k={`Advance (${paymentTerm}%)`} v={<span className="text-brand font-semibold">{money(advance)}</span>} />
                <Row k="Balance" v={money(total - advance)} muted />
              </div>
            )}
            {volumeDiscountPct > 0 && (
              <p className="text-xs text-success mt-1.5">Volume discount applied: {volumeDiscountPct}% off (block ≥ {policies.discountTiers.filter(t => totalRooms >= t.minRooms).sort((a,b) => b.minRooms - a.minRooms)[0]?.minRooms} rooms)</p>
            )}
          </div>

          <div className="border-t border-border pt-4 space-y-2">
            <Button className="w-full" size="lg" variant="success" disabled={!requiredOk || saving} onClick={() => save("confirmed")}>
              <Send className="h-4 w-4" />{saving ? "Saving…" : "Create Group Booking"}
            </Button>
            <Button className="w-full" variant="outline" disabled={!requiredOk || saving} onClick={() => save("tentative")}>
              Save as Tentative<ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function SectionHead({ icon: Icon, title, hint }: { icon: typeof UsersRound; title: string; hint: string }) {
  return (
    <div className="flex items-center gap-3 pb-2 border-b border-border">
      <span className="h-8 w-8 rounded-md bg-brand-soft text-brand-soft-foreground flex items-center justify-center">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}

function Row({ k, v, muted }: { k: React.ReactNode; v: React.ReactNode; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-xs text-muted-foreground">{k}</dt>
      <dd className={cn("tabular text-sm", muted ? "text-muted-foreground" : "text-foreground font-medium")}>{v}</dd>
    </div>
  );
}
