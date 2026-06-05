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
import { Badge } from "@/components/ui/badge";
import { cn, money } from "@/lib/utils";
import { apiPost } from "@/lib/api";

interface BlockRow { id: string; type: string; qty: number; rate: number; }

const ROOM_TYPES = [
  { name: "Queen", base: 450 },
  { name: "Deluxe", base: 650 },
  { name: "Suite", base: 1200 },
  { name: "King", base: 850 },
  { name: "Family", base: 950 },
  { name: "Executive", base: 1500 },
];

const TYPES = ["Wedding", "Conference", "Tour Group", "Sports Team", "Corporate Retreat", "Other"];

const SERVICE_OPTIONS = [
  { id: "ballroom", label: "Grand Ballroom (banquet)", price: 10000 },
  { id: "pearlHall", label: "Pearl Hall (full day)", price: 6500 },
  { id: "breakfast", label: "Group breakfast buffet", price: 75, perPax: true },
  { id: "lunch", label: "Group lunch buffet", price: 110, perPax: true },
  { id: "dinner", label: "Group dinner buffet", price: 135, perPax: true },
  { id: "pickup", label: "Airport pickup (per coach)", price: 350 },
  { id: "decor", label: "Decoration package", price: 4500 },
  { id: "av", label: "AV / Stage setup", price: 2200 },
];

export default function NewGroupPage() {
  const [name, setName] = React.useState("Al-Mansoori Wedding");
  const [type, setType] = React.useState("Wedding");
  const [contactName, setContactName] = React.useState("Mr. Hassan Al-Mansoori");
  const [contactPhone, setContactPhone] = React.useState("+971 50 111 2233");
  const [contactEmail, setContactEmail] = React.useState("hassan@almansoori.ae");
  const [bookedBy, setBookedBy] = React.useState("Direct");
  const [arrival, setArrival] = React.useState("2026-05-25");
  const [departure, setDeparture] = React.useState("2026-05-28");
  const [ratePlan, setRatePlan] = React.useState("CP");
  const [paymentTerm, setPaymentTerm] = React.useState<"30" | "50" | "100" | "custom">("30");
  const [billingMode, setBillingMode] = React.useState<"master" | "per-room" | "split">("master");
  const [notes, setNotes] = React.useState("Bridal suite must be Room 605. Henna evening 25th in Pearl Hall.");
  const [services, setServices] = React.useState<string[]>(["ballroom", "pickup"]);
  const [pax, setPax] = React.useState(110);

  const [block, setBlock] = React.useState<BlockRow[]>([
    { id: "b1", type: "Deluxe", qty: 30, rate: 580 },
    { id: "b2", type: "Suite", qty: 6, rate: 1100 },
    { id: "b3", type: "King", qty: 14, rate: 780 },
  ]);

  const totalRooms = block.reduce((s, b) => s + b.qty, 0);
  const todayISO = new Date().toLocaleDateString("en-CA"); // blocks past dates on arrival/departure
  const nights = (() => {
    const a = new Date(arrival); const d = new Date(departure);
    return Math.max(1, Math.round((+d - +a) / (1000 * 60 * 60 * 24)));
  })();
  const roomSubtotal = block.reduce((s, b) => s + b.qty * b.rate * nights, 0);
  const servicesTotal = services.reduce((s, id) => {
    const svc = SERVICE_OPTIONS.find(o => o.id === id);
    if (!svc) return s;
    return s + (svc.perPax ? svc.price * pax * nights : svc.price);
  }, 0);
  const subtotal = roomSubtotal + servicesTotal;
  const tax = subtotal * 0.05;
  const total = subtotal + tax;
  const advance = paymentTerm === "custom" ? 0 : Math.round((total * Number(paymentTerm)) / 100);

  const updateBlock = (id: string, key: keyof BlockRow, value: number | string) => {
    setBlock(b => b.map(r => r.id === id ? { ...r, [key]: value } : r));
  };
  const removeBlock = (id: string) => setBlock(b => b.filter(r => r.id !== id));
  const addBlock = () => setBlock(b => [...b, { id: `b${Date.now()}`, type: "Deluxe", qty: 5, rate: 650 }]);

  const router = useRouter();
  const [saving, setSaving] = React.useState(false);
  const requiredOk = !!(name && contactName && contactPhone && arrival && departure && block.length);

  const save = (status: "confirmed" | "tentative") => {
    if (saving || !requiredOk) return;
    setSaving(true);
    const code = `GRP-${new Date().getFullYear().toString().slice(-2)}${Math.floor(10 + (totalRooms % 90))}`;
    apiPost("/group-bookings", {
      code, name, type, contactName, contactPhone, contactEmail,
      bookedBy, arrival, departure, nights,
      block: block.map(b => ({ type: b.type, qty: b.qty, rate: b.rate, assigned: 0 })),
      totalRooms, totalPax: pax, ratePlan,
      services: services.map(id => SERVICE_OPTIONS.find(o => o.id === id)?.label ?? id),
      total: Math.round(total), advance: Math.round(advance), balance: Math.round(total - advance),
      status, notes, createdAt: new Date().toISOString().slice(0, 10),
    })
      .then(() => router.push("/groups"))
      .catch(() => setSaving(false));
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: form */}
        <div className="lg:col-span-2 space-y-5">
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
                  {bookedBy === "Agent" ? (
                    <><option>Pearl Holidays</option><option>ABC Travels</option><option>Skyline Tours</option></>
                  ) : (
                    <><option>TechCorp FZ-LLC</option><option>Emirates Bank</option><option>Global Oil Co.</option></>
                  )}
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
              <Field label="Phone *"><Input value={contactPhone} onChange={e => setContactPhone(e.target.value)} /></Field>
              <Field label="Email"><Input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} /></Field>
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
            <div className="rounded-md bg-brand-soft text-brand-soft-foreground p-3 flex items-center gap-3 text-sm">
              <Calendar className="h-4 w-4" />
              <span><span className="font-semibold">{nights} nights</span> · {arrival} → {departure}</span>
            </div>
          </Card>

          {/* Room block */}
          <Card className="p-6 space-y-4">
            <SectionHead icon={BedDouble} title="Room Block" hint="Allocate rooms by type — group rate may differ from rack rate" />

            <div className="space-y-2">
              {block.map(row => (
                <div key={row.id} className="grid grid-cols-12 gap-2 items-end p-3 rounded-md border border-border bg-surface-sunken/30">
                  <div className="col-span-12 sm:col-span-4">
                    <Label>Room type</Label>
                    <Select value={row.type} onChange={e => {
                      const def = ROOM_TYPES.find(t => t.name === e.target.value);
                      updateBlock(row.id, "type", e.target.value);
                      if (def) updateBlock(row.id, "rate", def.base);
                    }}>
                      {ROOM_TYPES.map(t => <option key={t.name}>{t.name}</option>)}
                    </Select>
                  </div>
                  <div className="col-span-5 sm:col-span-3">
                    <Label>Quantity</Label>
                    <div className="flex items-center border border-border rounded-md h-10 bg-surface">
                      <button type="button" onClick={() => updateBlock(row.id, "qty", Math.max(1, row.qty - 1))} className="h-full w-10 hover:bg-surface-sunken inline-flex items-center justify-center border-r border-border"><Minus className="h-3.5 w-3.5" /></button>
                      <span className="flex-1 text-center font-medium tabular">{row.qty}</span>
                      <button type="button" onClick={() => updateBlock(row.id, "qty", row.qty + 1)} className="h-full w-10 hover:bg-surface-sunken inline-flex items-center justify-center border-l border-border"><Plus className="h-3.5 w-3.5" /></button>
                    </div>
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
                </div>
              ))}
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
              {[
                { v: "EP", t: "Room only" },
                { v: "CP", t: "Room + Breakfast" },
                { v: "MAP", t: "Breakfast + 1 meal" },
                { v: "AP", t: "Full board" },
                { v: "Custom", t: "Negotiated" },
                { v: "Non-refundable", t: "Lower rate, no refund" },
              ].map(p => (
                <button
                  key={p.v}
                  type="button"
                  onClick={() => setRatePlan(p.v)}
                  className={cn(
                    "p-3 rounded-md border text-left text-sm transition-colors",
                    ratePlan === p.v ? "bg-brand-soft border-brand" : "border-border hover:bg-surface-sunken"
                  )}
                >
                  <span className="font-medium">{p.v}</span>
                  <p className="text-xs text-muted-foreground mt-0.5">{p.t}</p>
                </button>
              ))}
            </div>
          </Card>

          {/* Services */}
          <Card className="p-6 space-y-4">
            <SectionHead icon={Building2} title="Services & Add-ons" hint="Halls, F&B, transfers, decoration — anything extra" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {SERVICE_OPTIONS.map(s => {
                const on = services.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setServices(v => on ? v.filter(x => x !== s.id) : [...v, s.id])}
                    className={cn(
                      "p-3 rounded-md border text-left transition-colors flex items-start justify-between gap-2",
                      on ? "bg-brand-soft border-brand" : "border-border hover:bg-surface-sunken"
                    )}
                  >
                    <div>
                      <p className="text-sm font-medium">{s.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 tabular">
                        {money(s.price)}{s.perPax ? " per pax / day" : ""}
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
            <div className="rounded-md border border-dashed border-border p-6 text-center">
              <Upload className="h-6 w-6 mx-auto text-subtle-foreground" />
              <p className="text-sm mt-2">Import rooming list</p>
              <p className="text-xs text-muted-foreground mt-1">CSV / Excel · or paste from email · or fill in after creating the group</p>
              <div className="mt-3 flex gap-2 justify-center">
                <Button variant="outline" size="sm"><Upload className="h-3.5 w-3.5" />Upload File</Button>
                <Button variant="ghost" size="sm">Paste from clipboard</Button>
              </div>
            </div>
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
        <Card className="p-5 h-fit sticky top-20 space-y-4">
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
            <Row k="Services" v={money(servicesTotal)} muted />
            <Row k="Tax (5%)" v={money(tax)} muted />
            <div className="border-t border-border pt-2 mt-2">
              <Row k={<span className="font-semibold">Total</span>} v={<span className="font-semibold tabular text-base">{money(total)}</span>} />
            </div>
          </div>

          <div className="border-t border-border pt-3">
            <Label>Advance payment</Label>
            <div className="flex gap-1.5 mt-1.5 flex-wrap">
              {(["30", "50", "100", "custom"] as const).map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPaymentTerm(p)}
                  className={cn(
                    "h-9 px-3 rounded-md border text-xs font-medium transition-colors",
                    paymentTerm === p ? "bg-brand text-brand-foreground border-brand" : "border-border hover:bg-surface-sunken"
                  )}
                >
                  {p === "custom" ? "Instalments" : p === "100" ? "Full" : `${p}%`}
                </button>
              ))}
            </div>
            {paymentTerm !== "custom" && (
              <div className="mt-3 space-y-1.5 text-sm">
                <Row k={`Advance (${paymentTerm}%)`} v={<span className="text-brand font-semibold">{money(advance)}</span>} />
                <Row k="Balance" v={money(total - advance)} muted />
              </div>
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
