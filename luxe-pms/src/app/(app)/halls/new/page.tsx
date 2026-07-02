"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Building2, Calendar, Users, UtensilsCrossed, Sparkles,
  ChevronLeft, Send, Plus, Minus, CheckCircle2, User, Mail,
  ArrowRight, AlertCircle, IdCard, Camera, Pen,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { isValidPhone } from "@/lib/phone";
import { EmailInput } from "@/components/ui/email-input";
import { isValidEmail } from "@/lib/email";
import { Badge } from "@/components/ui/badge";
import { cn, money } from "@/lib/utils";
import { apiGet, apiPost } from "@/lib/api";
import { computeHallTotals, hoursBetween, crossesMidnight, dayMultiplier } from "@/lib/hall-pricing";
import { PhotoCapture } from "@/components/guests/photo-capture";
import { DocumentUpload } from "@/components/guests/document-upload";
import { SignaturePad } from "@/components/guests/signature-pad";

type Venue = { id: string; name: string; capacity: number; hourly: number; halfDay: number; fullDay: number; setupFee: number; gst: number; extraPaxFee: number };

const EVENT_TYPES = ["Wedding", "Engagement", "Conference", "Corporate Meeting", "Birthday", "Anniversary", "Product Launch", "Other"];

// Banquet catering packages + add-on services are master data from
// Configuration → Food & Hall Packages (/banquet-packages, /extra-services).
type BanquetPkg = { id: string; name: string; desc?: string; pricePerPax: number; veg: boolean };
type ExtraService = { id: string; label: string; price: number };

const TIME_SLOTS = ["01:00", "02:00", "03:00", "04:00", "05:00", "06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00"];

export default function NewHallBookingPage() {
  // Pre-fill from a converted enquiry: /halls/new?customer=&phone=&email=&date=&pax=&hall=
  const searchParams = useSearchParams();
  const todayISO = new Date().toLocaleDateString("en-CA"); // blocks past dates on event date
  const qpDate = searchParams.get("date");
  const qpPax = Number(searchParams.get("pax"));
  const [customer, setCustomer] = React.useState(searchParams.get("customer") ?? "");
  const [phone, setPhone] = React.useState(searchParams.get("phone") ?? "");
  const [email, setEmail] = React.useState(searchParams.get("email") ?? "");
  const [eventType, setEventType] = React.useState("Wedding");
  const [eventName, setEventName] = React.useState("");
  // Venues (master) loaded from Configuration → Food & Hall Packages (/hall-packages).
  const [halls, setHalls] = React.useState<Venue[]>([]);
  const [hallId, setHallId] = React.useState("");
  React.useEffect(() => {
    apiGet<Venue[]>("/hall-packages").then(rows => setHalls(rows.map(h => ({ ...h, id: String(h.id) })))).catch(() => {});
  }, []);
  const [eventDate, setEventDate] = React.useState(qpDate && qpDate >= todayISO ? qpDate : todayISO);
  const [eventEndDate, setEventEndDate] = React.useState(eventDate);
  // Keep the end date from drifting before the start date if the start date moves past it.
  React.useEffect(() => {
    setEventEndDate(d => (d < eventDate ? eventDate : d));
  }, [eventDate]);
  const [startTime, setStartTime] = React.useState("18:00");
  const [endTime, setEndTime] = React.useState("23:00");
  const [pax, setPax] = React.useState(qpPax > 0 ? qpPax : 150);
  const [banquetPkgs, setBanquetPkgs] = React.useState<BanquetPkg[]>([]);
  const [extraServices, setExtraServices] = React.useState<ExtraService[]>([]);
  React.useEffect(() => {
    apiGet<BanquetPkg[]>("/banquet-packages").then(rows => setBanquetPkgs(rows.map(p => ({ ...p, id: String(p.id) })))).catch(() => {});
    apiGet<ExtraService[]>("/extra-services").then(rows => setExtraServices(rows.map(s => ({ ...s, id: String(s.id) })))).catch(() => {});
  }, []);
  const [packageId, setPackageId] = React.useState<string>("");
  const [extras, setExtras] = React.useState<string[]>([]);
  React.useEffect(() => {
    if (banquetPkgs.length && !banquetPkgs.some(p => p.id === packageId)) setPackageId(banquetPkgs[0].id);
  }, [banquetPkgs, packageId]);
  const [advancePct, setAdvancePct] = React.useState(30);
  const [notes, setNotes] = React.useState("");

  // Optional guest ID + captures — mirrors the check-in capture widgets, filled
  // in directly on this screen (no tablet hand-off for hall bookings).
  const [idType, setIdType] = React.useState("Aadhaar");
  const [idNumber, setIdNumber] = React.useState("");
  const [guestPhoto, setGuestPhoto] = React.useState<string | null>(null);
  const [idFront, setIdFront] = React.useState<string | null>(null);
  const [idBack, setIdBack] = React.useState<string | null>(null);
  const [signature, setSignature] = React.useState<string | null>(null);

  const hall = halls.find(h => h.id === hallId);
  const pkg = banquetPkgs.find(p => p.id === packageId);

  // Pricing math — end <= start wraps into the next day (e.g. 20:00→02:00 = 6h).
  const eventCrossesMidnight = crossesMidnight(startTime, endTime);
  const hours = hoursBetween(startTime, endTime);
  const slotType: "hourly" | "halfDay" | "fullDay" = hours >= 9 ? "fullDay" : hours >= 5 ? "halfDay" : "hourly";
  // Charges per day-rate; dayMult folds in any extra calendar days beyond a
  // single (possibly overnight) session — see dayMultiplier for the rule.
  const dayMult = dayMultiplier(eventDate, eventEndDate, eventCrossesMidnight);
  const hallCost = (slotType === "fullDay" ? (hall?.fullDay ?? 0) : slotType === "halfDay" ? (hall?.halfDay ?? 0) : (hall?.hourly ?? 0) * hours) * dayMult;
  const foodCost = (pkg ? pkg.pricePerPax * pax : 0) * dayMult;
  const extrasCost = extras.reduce((s, id) => s + (extraServices.find(e => e.id === id)?.price ?? 0), 0); // one-time add-ons
  const capacityWarning = !!hall && pax > hall.capacity;
  const extraPax = (capacityWarning && hall ? pax - hall.capacity : 0) * dayMult;
  const extraPaxCost = extraPax * (hall?.extraPaxFee ?? 0); // per-hall over-capacity surcharge
  const setupFee = hall?.setupFee ?? 0;
  const gstPct = hall?.gst ?? 0;

  const { subtotal, tax, total } = computeHallTotals({
    hallCost, setupFee, foodCost, extrasCost, extraPax, extraPaxFee: hall?.extraPaxFee ?? 0, gstPct,
  });
  const advance = Math.round((total * advancePct) / 100);

  const requiredOk = !!(customer && eventName && isValidPhone(phone) && isValidEmail(email) && eventDate && startTime && endTime && pax > 0 && pkg && hall);

  const router = useRouter();
  const [saving, setSaving] = React.useState(false);

  const save = (status: "confirmed" | "pending") => {
    if (saving || !requiredOk) return;
    setSaving(true);
    apiPost("/hall-bookings", {
      customer, phone, email, hall: hall?.name ?? "", eventName, date: eventDate, endDate: eventEndDate,
      start: startTime, end: endTime, guests: pax,
      package: pkg?.name ?? eventType,
      advance: Math.round(advance), total: Math.round(total),
      status, notes,
      idType, idNumber, guestPhoto, idFront, idBack, signature,
    })
      .then(() => router.push("/halls"))
      .catch(() => setSaving(false));
  };

  return (
    <div className="p-4 sm:p-6 lg:p-6 w-full">
      <div className="flex items-center justify-between mb-5">
        <Link href="/halls" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ChevronLeft className="h-3.5 w-3.5" />Hall Bookings
        </Link>
        <Link href="/halls"><Button variant="ghost">Cancel</Button></Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-display font-medium tracking-tight">New Hall Booking</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Functions, banquets, conferences · billed by the hour
          </p>
        </div>
        <Badge tone="brand"><Sparkles className="h-3 w-3" />AI suggests Pearl Hall for 150 pax</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        {/* Left: form */}
        <div className="space-y-5">
          {/* Customer */}
          <Card className="p-6 space-y-4">
            <SectionHead icon={User} title="Customer Details" required />
            <Field label="Customer / Organisation name *">
              <Input value={customer} onChange={e => setCustomer(e.target.value)} placeholder="e.g. Al-Mansoori Wedding" autoFocus />
            </Field>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Phone *">
                <PhoneInput value={phone} onChange={v => setPhone(v)} size="md" invalid={phone !== "" && !isValidPhone(phone)} />
              </Field>
              <Field label="Email">
                <div className="relative">
                  <Mail className="absolute left-3 top-5 -translate-y-1/2 h-4 w-4 text-subtle-foreground" />
                  <EmailInput value={email} onChange={setEmail} placeholder="customer@example.com" className="pl-9" />
                </div>
              </Field>
            </div>
          </Card>

          {/* Event */}
          <Card className="p-6 space-y-4">
            <SectionHead icon={Calendar} title="Event Details" required />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field label="Event type *">
                <Select value={eventType} onChange={e => setEventType(e.target.value)}>
                  {EVENT_TYPES.map(t => <option key={t}>{t}</option>)}
                </Select>
              </Field>
              <Field label="Event name *">
                <Input value={eventName} onChange={e => setEventName(e.target.value)} placeholder="e.g. Sabari's Wedding" />
              </Field>
              <Field label="Event date *">
                <Input type="date" value={eventDate} min={todayISO} onChange={e => setEventDate(e.target.value)} />
              </Field>
              <Field label="Event end date *">
                <Input type="date" value={eventEndDate} min={eventDate} onChange={e => setEventEndDate(e.target.value < eventDate ? eventDate : e.target.value)} />
              </Field>
              <Field label="Start time *">
                <Select value={startTime} onChange={e => setStartTime(e.target.value)}>
                  {TIME_SLOTS.map(t => <option key={t}>{t}</option>)}
                </Select>
              </Field>
              <Field label="End time *">
                <Select value={endTime} onChange={e => setEndTime(e.target.value)}>
                  {TIME_SLOTS.map(t => <option key={t}>{t}</option>)}
                </Select>
              </Field>
            </div>
            <div className="rounded-md bg-brand-soft text-brand-soft-foreground p-3 flex items-center gap-3 text-sm">
              <Calendar className="h-4 w-4" />
              <span>
                Duration: <span className="font-semibold">{hours}h</span> · billed at{" "}
                <span className="font-semibold">{slotType === "fullDay" ? "Full-day rate" : slotType === "halfDay" ? "Half-day rate" : "Hourly rate"}</span>
                {eventCrossesMidnight && <span className="font-semibold"> · ends next day</span>}
                {dayMult > 1 && <span className="font-semibold"> · spans {dayMult} days (×{dayMult} charges)</span>}
              </span>
            </div>
          </Card>

          {/* Hall */}
          <Card className="p-6 space-y-4">
            <SectionHead icon={Building2} title="Hall Selection" required />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {halls.map(h => {
                const tooSmall = pax > h.capacity;
                return (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => setHallId(h.id)}
                    className={cn(
                      "p-4 rounded-md border-2 text-left transition-all hover:shadow-md",
                      hallId === h.id ? "border-brand bg-brand-soft" : "border-border hover:bg-surface-sunken"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold">{h.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Up to {h.capacity} guests</p>
                      </div>
                      {hallId === h.id && <CheckCircle2 className="h-4 w-4 text-brand shrink-0" />}
                    </div>
                    <div className="mt-3 pt-3 border-t border-border grid grid-cols-3 gap-1 text-xs">
                      <Mini label="Hour" v={money(h.hourly)} />
                      <Mini label="½ day" v={money(h.halfDay)} />
                      <Mini label="Full day" v={money(h.fullDay)} />
                    </div>
                    {tooSmall && hallId === h.id && (
                      <p className="mt-2 text-xs text-warning inline-flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />{pax - h.capacity} over capacity — extra pax surcharge applies
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Pax + Package */}
          <Card className="p-6 space-y-4">
            <SectionHead icon={Users} title="Guests & F&B Package" required />
            <Field label="Number of guests *">
              <div className="flex items-center border border-border rounded-md h-11 bg-surface w-fit">
                <button type="button" onClick={() => setPax(Math.max(1, pax - 10))} className="h-full w-11 hover:bg-surface-sunken inline-flex items-center justify-center border-r border-border"><Minus className="h-4 w-4" /></button>
                <input type="number" value={pax} onChange={e => setPax(Math.max(1, Number(e.target.value)))} className="w-24 text-center font-semibold tabular bg-transparent outline-hidden h-full" />
                <button type="button" onClick={() => setPax(pax + 10)} className="h-full w-11 hover:bg-surface-sunken inline-flex items-center justify-center border-l border-border"><Plus className="h-4 w-4" /></button>
              </div>
              {capacityWarning && (
                <p className="text-xs text-warning inline-flex items-center gap-1 mt-2">
                  <AlertCircle className="h-3 w-3" />
                  Selected hall capacity is {hall?.capacity ?? 0} · {extraPax} extra guests incur {money(hall?.extraPaxFee ?? 0)}/pax surcharge
                </p>
              )}
            </Field>

            <Field label="Food package *">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {banquetPkgs.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPackageId(p.id)}
                    className={cn(
                      "p-3 rounded-md border text-left transition-colors flex items-start justify-between gap-2",
                      packageId === p.id ? "bg-brand-soft border-brand" : "border-border hover:bg-surface-sunken"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{p.name}</p>
                        {p.veg && <Badge tone="success">Veg</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{p.desc}</p>
                      <p className="text-sm font-semibold mt-1 tabular text-brand">{money(p.pricePerPax)} <span className="text-xs text-muted-foreground font-normal">per pax</span></p>
                    </div>
                    {packageId === p.id && <CheckCircle2 className="h-4 w-4 text-brand shrink-0" />}
                  </button>
                ))}
              </div>
            </Field>
          </Card>

          {/* Extras */}
          <Card className="p-6 space-y-4">
            <SectionHead icon={Sparkles} title="Extra Services" optional />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {extraServices.map(s => {
                const on = extras.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setExtras(v => on ? v.filter(x => x !== s.id) : [...v, s.id])}
                    className={cn(
                      "p-3 rounded-md border text-left transition-colors flex items-start justify-between gap-2",
                      on ? "bg-brand-soft border-brand" : "border-border hover:bg-surface-sunken"
                    )}
                  >
                    <div>
                      <p className="text-sm font-medium">{s.label}</p>
                      <p className="text-xs text-muted-foreground tabular mt-0.5">{money(s.price)}</p>
                    </div>
                    {on && <CheckCircle2 className="h-4 w-4 text-brand shrink-0" />}
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Identification + Captures */}
          <Card className="p-6 space-y-4">
            <SectionHead icon={IdCard} title="Identification & Captures" optional />
            <div className="grid grid-cols-2 gap-3 max-w-md">
              <Field label="ID type">
                <Select value={idType} onChange={e => setIdType(e.target.value)}>
                  <option>Aadhaar</option>
                  <option>PAN</option>
                  <option>Driving License</option>
                  <option>Voter ID</option>
                  <option>Passport</option>
                </Select>
              </Field>
              <Field label="ID number">
                <Input value={idNumber} onChange={e => setIdNumber(e.target.value)} placeholder="A12345678" />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Camera className="h-4 w-4 text-muted-foreground" />
                  <Label>Guest face photo</Label>
                </div>
                <PhotoCapture value={guestPhoto} onChange={setGuestPhoto} aspect="landscape" />
              </div>
              <Field label={`${idType} — front`}>
                <DocumentUpload label="ID Front" value={idFront} onChange={setIdFront} />
              </Field>
              <Field label={`${idType} — back`}>
                <DocumentUpload label="ID Back" value={idBack} onChange={setIdBack} />
              </Field>
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Pen className="h-4 w-4 text-muted-foreground" />
                  <Label>Digital signature</Label>
                </div>
                <SignaturePad value={signature} onChange={setSignature} className="aspect-[3/2]" />
              </div>
            </div>
          </Card>

          {/* Notes */}
          <Card className="p-6 space-y-3">
            <SectionHead icon={UtensilsCrossed} title="Special Requirements" optional />
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Stage arrangement, dietary restrictions, vendor parking, special timing, etc."
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
            <p className="font-semibold text-base">{eventName || "Untitled event"}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{eventType}{customer ? ` · ${customer}` : ""}</p>
          </div>

          <dl className="space-y-2 text-sm border-t border-border pt-3">
            <Row k="Date" v={eventEndDate !== eventDate ? `${eventDate} → ${eventEndDate}` : eventDate} />
            <Row k="Time" v={`${startTime} → ${endTime}${eventCrossesMidnight ? " (+1 day)" : ""}`} />
            <Row k="Duration" v={`${hours} hours`} />
            <Row k="Hall" v={hall?.name ?? "—"} />
            <Row k="Capacity" v={`${pax} / ${hall?.capacity ?? 0}`} />
            <Row k="Package" v={pkg?.name ?? "—"} />
          </dl>

          <div className="border-t border-border pt-3 space-y-2 text-sm">
            <Row k={`Hall (${slotType})${dayMult > 1 ? ` × ${dayMult}d` : ""}`} v={money(hallCost)} muted />
            {setupFee > 0 && <Row k="Setup fee" v={money(setupFee)} muted />}
            <Row k={`F&B × ${pax} pax${dayMult > 1 ? ` × ${dayMult}d` : ""}`} v={money(foodCost)} muted />
            {extraPaxCost > 0 && <Row k={`Extra pax × ${extraPax}`} v={money(extraPaxCost)} muted warn />}
            {extrasCost > 0 && <Row k={`Extras (${extras.length})`} v={money(extrasCost)} muted />}
            <Row k={`GST (${gstPct}%)`} v={money(tax)} muted />
            <div className="border-t border-border pt-2 mt-2">
              <Row k={<span className="font-semibold">Total</span>} v={<span className="font-semibold tabular text-base">{money(total)}</span>} />
            </div>
          </div>

          <div className="border-t border-border pt-3">
            <Label>Advance payment</Label>
            <div className="flex gap-1.5 mt-1.5">
              {[30, 50, 100].map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setAdvancePct(p)}
                  className={cn(
                    "flex-1 h-9 rounded-md border text-xs font-medium transition-colors",
                    advancePct === p ? "bg-brand text-brand-foreground border-brand" : "border-border hover:bg-surface-sunken"
                  )}
                >
                  {p === 100 ? "Full" : `${p}%`}
                </button>
              ))}
            </div>
            <div className="mt-3 space-y-1.5 text-sm">
              <Row k={`Advance (${advancePct}%)`} v={<span className="text-brand font-semibold">{money(advance)}</span>} />
              <Row k="Balance on event day" v={money(total - advance)} muted />
            </div>
          </div>

          <div className="border-t border-border pt-4 space-y-2">
            <Button className="w-full" size="lg" variant="success" disabled={!requiredOk || saving} onClick={() => save("confirmed")}>
              <Send className="h-4 w-4" />{saving ? "Saving…" : "Confirm & Send Quote"}
            </Button>
            <Button className="w-full" variant="outline" disabled={!requiredOk || saving} onClick={() => save("pending")}>
              Save as Tentative<ArrowRight className="h-4 w-4" />
            </Button>
            {!requiredOk && (
              <p className="text-[11px] text-muted-foreground text-center mt-2">Fill customer name, phone, dates, hall and package to enable.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function SectionHead({ icon: Icon, title, required, optional }: { icon: typeof Building2; title: string; required?: boolean; optional?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 pb-2 border-b border-border">
      <span className="h-7 w-7 rounded-md bg-brand-soft text-brand-soft-foreground flex items-center justify-center">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <h3 className="text-sm font-semibold">{title}</h3>
      {required && <span className="text-[10px] uppercase tracking-wider font-semibold text-danger">Required</span>}
      {optional && <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">Optional</span>}
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Mini({ label, v }: { label: string; v: string }) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{label}</p>
      <p className="text-xs font-medium tabular mt-0.5">{v}</p>
    </div>
  );
}

function Row({ k, v, muted, warn }: { k: React.ReactNode; v: React.ReactNode; muted?: boolean; warn?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className={cn("text-xs", warn ? "text-warning" : "text-muted-foreground")}>{k}</dt>
      <dd className={cn("tabular text-sm", warn ? "text-warning font-medium" : muted ? "text-muted-foreground" : "text-foreground font-medium")}>{v}</dd>
    </div>
  );
}

