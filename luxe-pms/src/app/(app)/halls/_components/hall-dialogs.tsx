"use client";
import * as React from "react";
import {
  Building2, Users, Clock, Calendar, X, CheckCircle2, AlertTriangle,
  Edit, Printer, Ban, Wallet, Sparkles, Mail, MessageCircle, Phone,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { HALLS, HALL_BOOKINGS } from "@/lib/mock-data-ext";
import { money, cn, formatDate } from "@/lib/utils";
import { apiGet } from "@/lib/api";
import { computeHallTotals, hoursBetween, crossesMidnight, dayMultiplier } from "@/lib/hall-pricing";

// Hour-only slots — must match the new-booking form so re-pricing on modify
// keys off the same whole-hour slot tiers (≥5h half-day, ≥9h full-day).
export const TIME_SLOTS = ["01:00", "02:00", "03:00", "04:00", "05:00", "06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00"];
// Venue shape the modify dialog needs to re-price a booking.
type VenueRates = { name: string; capacity: number; hourly: number; halfDay: number; fullDay: number; setupFee: number; gst: number; extraPaxFee: number };

export type Hall = typeof HALLS[number];
export type HallStatus = "confirmed" | "pending" | "in-progress" | "completed" | "cancelled";
export type HallBooking = Omit<typeof HALL_BOOKINGS[number], "status"> & {
  status: HallStatus; notes?: string; email?: string; endDate?: string; eventName?: string;
  idType?: string; idNumber?: string; guestPhoto?: string | null; idFront?: string | null; idBack?: string | null; signature?: string | null;
};

export const STATUS_TONE: Record<HallBooking["status"] | "cancelled" | "completed", "success" | "warning" | "info" | "danger" | "neutral"> = {
  confirmed: "success",
  pending: "warning",
  "in-progress": "info",
  cancelled: "danger",
  completed: "neutral",
};

export type HallOverride = {
  date?: string; endDate?: string; start?: string; end?: string;
  guests?: number; package?: string; status?: HallBooking["status"];
  notes?: string; advance?: number; total?: number; eventName?: string;
};

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between"><span className="text-muted-foreground">{label}</span><span className="tabular font-medium">{value}</span></div>;
}

// ===================== DETAIL DRAWER =====================
export function HallDetailDrawer({ booking, notes, onClose, onModify, onCancel, onPay, onComplete }: {
  booking: HallBooking; notes: string; onClose: () => void; onModify: () => void; onCancel: () => void;
  onPay: () => void; onComplete: () => void;
}) {
  const [halls, setHalls] = React.useState<Hall[]>([]);
  React.useEffect(() => { apiGet<Hall[]>("/hall-packages").then(r => setHalls(r.map(h => ({ ...h, id: String(h.id) })))).catch(() => {}); }, []);
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  const balance = booking.total - booking.advance;
  const hall = halls.find(h => h.name === booking.hall);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs" onClick={onClose} aria-hidden />
      <aside className="fixed top-0 right-0 z-50 h-svh w-full sm:w-[520px] lg:w-[600px] bg-surface border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right-2">
        <div className="px-5 py-4 border-b border-border bg-linear-to-br from-brand-soft/40 via-surface to-accent-soft/20 flex items-start gap-3">
          <span className="h-12 w-12 rounded-md bg-brand-soft text-brand-soft-foreground inline-flex items-center justify-center shrink-0">
            <Building2 className="h-6 w-6" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Hall booking · {booking.id.toUpperCase()}</p>
            <h2 className="text-xl font-semibold truncate">{booking.eventName || booking.customer}</h2>
            <p className="text-xs text-muted-foreground truncate">{booking.customer} · {booking.phone}{booking.email ? ` · ${booking.email}` : ""}</p>
          </div>
          <button type="button" onClick={onClose} className="h-8 w-8 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Booking summary */}
          <div className="rounded-md border border-border p-4 space-y-2">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <DetailRow icon={Building2} label="Hall" value={booking.hall} sub={hall ? `Up to ${hall.capacity}` : ""} />
              <DetailRow icon={Users} label="Guests" value={`${booking.guests}`} sub={`Package: ${booking.package}`} />
              <DetailRow icon={Calendar} label="Date" value={booking.endDate && booking.endDate !== booking.date ? `${formatDate(booking.date)} → ${formatDate(booking.endDate)}` : formatDate(booking.date)} />
              <DetailRow icon={Clock} label="Time" value={`${booking.start} → ${booking.end}${crossesMidnight(booking.start, booking.end) ? " (+1 day)" : ""}`} sub={`${getHours(booking.start, booking.end)} h`} />
            </div>
          </div>

          {/* Package details */}
          <Section title="Package">
            <div className="rounded-md border border-border p-3 space-y-1.5 text-sm">
              <Row label="Selected" value={booking.package} />
              <Row label="Per guest" value={money(Math.round(booking.total / booking.guests))} />
            </div>
          </Section>

          {/* Money */}
          <Section title="Payment summary">
            <div className="rounded-md border border-border p-3 space-y-1.5 text-sm">
              <Row label="Total" value={money(booking.total)} />
              <Row label="Advance received" value={money(booking.advance)} />
              <div className="border-t border-border pt-1.5 mt-1.5 flex items-center justify-between">
                <span className={cn("font-semibold", balance > 0 ? "text-warning" : "text-success")}>
                  {balance > 0 ? "Balance due" : "Settled"}
                </span>
                <span className={cn("text-base font-semibold tabular", balance > 0 ? "text-warning" : "text-success")}>
                  {balance > 0 ? money(balance) : money(0)}
                </span>
              </div>
            </div>
          </Section>

          {/* Identification & captures */}
          <Section title="Identification & captures">
            {booking.idNumber || booking.guestPhoto || booking.idFront || booking.idBack || booking.signature ? (
              <div className="rounded-md border border-border p-3 space-y-2 text-sm">
                {booking.idNumber && <Row label={booking.idType || "ID"} value={booking.idNumber} />}
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {booking.guestPhoto && <Badge tone="success">Photo ✓</Badge>}
                  {booking.idFront && <Badge tone="success">ID Front ✓</Badge>}
                  {booking.idBack && <Badge tone="success">ID Back ✓</Badge>}
                  {booking.signature && <Badge tone="success">Signed ✓</Badge>}
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">No ID or captures on file. Click <span className="text-foreground font-medium">Modify</span> to add.</p>
            )}
          </Section>

          {/* Special notes */}
          <Section title="Special instructions / setup notes">
            {notes ? (
              <div className="rounded-md bg-warning-soft/40 border border-warning/30 p-3 text-sm leading-relaxed">
                <p className="inline-flex items-center gap-1.5 text-warning text-[11px] font-semibold uppercase tracking-wider mb-1.5">
                  <AlertTriangle className="h-3 w-3" />Visible to F&amp;B + Banquet setup team
                </p>
                <p className="whitespace-pre-wrap">{notes}</p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">No special instructions on file. Click <span className="text-foreground font-medium">Modify</span> to add.</p>
            )}
          </Section>

          {/* Status */}
          <Section title="Status">
            <Badge tone={STATUS_TONE[booking.status]}>{booking.status}</Badge>
          </Section>
        </div>

        {/* Footer */}
        <div className="border-t border-border p-3 space-y-2">
          {booking.status !== "cancelled" && booking.status !== "completed" && (
            <div className="grid grid-cols-2 gap-2">
              <Button variant="success" size="sm" onClick={onPay} disabled={booking.total - booking.advance <= 0}>
                <Wallet className="h-3.5 w-3.5" />{booking.total - booking.advance > 0 ? "Receive payment" : "Fully paid"}
              </Button>
              <Button variant="outline" size="sm" onClick={onComplete} disabled={booking.status === "pending" || booking.total - booking.advance > 0} title={booking.total - booking.advance > 0 ? `Clear balance first (${money(booking.total - booking.advance)} due)` : undefined}>
                <CheckCircle2 className="h-3.5 w-3.5" />Mark completed
              </Button>
            </div>
          )}
          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" size="sm" onClick={onModify} disabled={booking.status === "cancelled"}>
              <Edit className="h-3.5 w-3.5" />Modify
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-3.5 w-3.5" />BEO sheet
            </Button>
            <Button variant="danger" size="sm" onClick={onCancel} disabled={booking.status === "cancelled" || booking.status === "completed"}>
              <Ban className="h-3.5 w-3.5" />Cancel
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-semibold mb-2">{title}</p>
      {children}
    </div>
  );
}

function DetailRow({ icon: Icon, label, value, sub }: { icon: typeof Building2; label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="h-7 w-7 rounded-md bg-surface-sunken text-muted-foreground inline-flex items-center justify-center shrink-0"><Icon className="h-3.5 w-3.5" /></span>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
        <p className="text-sm font-semibold leading-tight mt-0.5 truncate">{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground truncate">{sub}</p>}
      </div>
    </div>
  );
}

function getHours(start: string, end: string) {
  return hoursBetween(start, end);
}

// ===================== MODIFY DIALOG =====================
export function ModifyHallDialog({ booking, notes, onClose, onSave }: {
  booking: HallBooking; notes: string; onClose: () => void; onSave: (patch: HallOverride) => void;
}) {
  const [draft, setDraft] = React.useState({
    eventName: booking.eventName ?? "",
    date: booking.date,
    endDate: booking.endDate ?? booking.date,
    start: booking.start,
    end: booking.end,
    guests: booking.guests,
    package: booking.package,
    status: booking.status as HallBooking["status"],
    notes: notes,
    total: booking.total,
  });

  // Master data for live re-pricing: the booking's venue rates + banquet prices.
  const [pkgs, setPkgs] = React.useState<{ name: string; pricePerPax: number }[]>([]);
  const [venues, setVenues] = React.useState<VenueRates[]>([]);
  React.useEffect(() => {
    apiGet<{ name: string; pricePerPax: number }[]>("/banquet-packages").then(setPkgs).catch(() => {});
    apiGet<VenueRates[]>("/hall-packages").then(setVenues).catch(() => {});
  }, []);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  const set = <K extends keyof typeof draft>(k: K, v: typeof draft[K]) => setDraft(d => ({ ...d, [k]: v }));
  const todayISO = new Date().toLocaleDateString("en-CA"); // blocks past dates on event date
  const valid = draft.eventName.trim() !== "" && draft.guests >= 1 && draft.total >= 0;

  // Live re-price from venue rates + package + guests + slot — same formula as the
  // new-booking form, so editing guests/package/time no longer leaves a stale total.
  // Stored bookings don't keep the à-la-carte extras, so this excludes them; the
  // total stays editable for staff to add those back or apply a special rate.
  // end <= start wraps into the next day (e.g. 20:00→02:00 = 6h).
  const venue = venues.find(v => v.name === booking.hall);
  const draftCrossesMidnight = crossesMidnight(draft.start, draft.end);
  const hours = hoursBetween(draft.start, draft.end);
  const slotType: "hourly" | "halfDay" | "fullDay" = hours >= 9 ? "fullDay" : hours >= 5 ? "halfDay" : "hourly";
  const draftDayMult = dayMultiplier(draft.date, draft.endDate, draftCrossesMidnight);
  const hallCost = (venue ? (slotType === "fullDay" ? venue.fullDay : slotType === "halfDay" ? venue.halfDay : venue.hourly * hours) : 0) * draftDayMult;
  const pkgPrice = pkgs.find(p => p.name === draft.package)?.pricePerPax ?? 0;
  const extraPax = (venue && draft.guests > venue.capacity ? draft.guests - venue.capacity : 0) * draftDayMult;
  const reprice = venue
    ? computeHallTotals({ hallCost, setupFee: venue.setupFee, foodCost: pkgPrice * draft.guests * draftDayMult, extrasCost: 0, extraPax, extraPaxFee: venue.extraPaxFee, gstPct: venue.gst }).total
    : null;
  const repriceDiffers = reprice != null && reprice !== draft.total;

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
              <h3 className="font-semibold truncate">Modify hall booking</h3>
              <p className="text-xs text-muted-foreground truncate">{booking.eventName || booking.customer} · {booking.hall}</p>
            </div>
            <button type="button" onClick={onClose} className="h-8 w-8 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
          </div>

          <div className="px-5 py-4 space-y-4 max-h-[65vh] overflow-y-auto">
            <div className="space-y-1.5">
              <Label className="text-xs">Event name</Label>
              <Input value={draft.eventName} onChange={e => set("eventName", e.target.value)} placeholder="e.g. Sabari's Wedding" className="h-9" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Start date</Label>
                <Input
                  type="date" value={draft.date} min={todayISO}
                  onChange={e => setDraft(d => ({ ...d, date: e.target.value, endDate: d.endDate < e.target.value ? e.target.value : d.endDate }))}
                  className="h-9 tabular"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">End date</Label>
                <Input type="date" value={draft.endDate} min={draft.date} onChange={e => set("endDate", e.target.value < draft.date ? draft.date : e.target.value)} className="h-9 tabular" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Start time</Label>
                <Select value={draft.start} onChange={e => set("start", e.target.value)} className="h-9 tabular">
                  {!TIME_SLOTS.includes(draft.start) && <option value={draft.start}>{draft.start}</option>}
                  {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">End time</Label>
                <Select value={draft.end} onChange={e => set("end", e.target.value)} className="h-9 tabular">
                  {!TIME_SLOTS.includes(draft.end) && <option value={draft.end}>{draft.end}</option>}
                  {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                </Select>
              </div>
            </div>

            <div className="rounded-md bg-surface-sunken/40 border border-border p-3 text-xs flex items-center justify-between">
              <span className="text-muted-foreground">Duration</span>
              <span className="font-semibold tabular">
                {hours} hours{draftCrossesMidnight ? " · ends next day" : ""}
                {draftDayMult > 1 ? ` · spans ${draftDayMult} days (×${draftDayMult} charges)` : ""}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Guest count</Label>
                <Input type="number" min={1} value={draft.guests} onChange={e => set("guests", Number(e.target.value))} className="h-9 tabular" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Package</Label>
                <Select value={draft.package} onChange={e => set("package", e.target.value)} className="h-9">
                  {draft.package && !pkgs.some(p => p.name === draft.package) && <option value={draft.package}>{draft.package}</option>}
                  {pkgs.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                </Select>
              </div>
            </div>

            {/* Re-priced total — editing guests / package / time recomputes this so the
                balance and revenue never go stale. Editable for extras / special rates. */}
            <div className="rounded-md border border-border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Total (₹)</Label>
                {repriceDiffers && (
                  <button type="button" onClick={() => set("total", reprice!)} className="text-[11px] font-medium text-brand hover:underline inline-flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />Apply re-priced {money(reprice!)}
                  </button>
                )}
              </div>
              <Input type="number" min={0} value={draft.total} onChange={e => set("total", Math.max(0, Number(e.target.value)))} className="h-9 tabular" />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {venue
                  ? <>Re-priced: {slotType === "fullDay" ? "full-day" : slotType === "halfDay" ? "half-day" : `${hours}h`} · {draft.guests} pax{extraPax > 0 ? ` (+${extraPax} over capacity)` : ""} = <span className="font-medium tabular text-foreground">{money(reprice ?? 0)}</span>{repriceDiffers ? ` · current ${money(draft.total)}` : " · matches current"}. Excludes à-la-carte add-on services.</>
                  : <>Couldn&apos;t find venue &ldquo;{booking.hall}&rdquo; to re-price — total stays editable.</>}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Booking status</Label>
              <Select value={draft.status} onChange={e => set("status", e.target.value as HallBooking["status"])} className="h-9">
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </Select>
            </div>

            {/* SPECIAL NOTES */}
            <div className="space-y-1.5 pt-3 border-t border-border">
              <Label htmlFor="notes" className="text-xs">
                <Sparkles className="h-3 w-3 inline mr-1 text-brand" />Special instructions / guest requests
              </Label>
              <textarea
                id="notes"
                value={draft.notes}
                onChange={e => set("notes", e.target.value)}
                placeholder="e.g. White tablecloths · Stage backdrop with floral arch · Vegan menu only · Sound check at 17:00 · No nuts in any dish · Birthday cake at 21:30 with sparkler …"
                rows={4}
                maxLength={600}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm placeholder:text-subtle-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 outline-hidden resize-y min-h-[96px]"
              />
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Forwarded to F&amp;B, banquet setup, and AV teams.</span>
                <span className="tabular">{draft.notes.length} / 600</span>
              </div>
            </div>
          </div>

          <div className="px-5 py-3 border-t border-border bg-surface-elevated flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button onClick={() => onSave(draft)} disabled={!valid} variant="success"><CheckCircle2 className="h-4 w-4" />Save changes</Button>
          </div>
        </Card>
      </div>
    </>
  );
}

// ===================== RECEIVE PAYMENT DIALOG =====================
export function ReceivePaymentDialog({ booking, onClose, onConfirm }: {
  booking: HallBooking; onClose: () => void; onConfirm: (amount: number, mode: string) => void;
}) {
  const balance = Math.max(0, booking.total - booking.advance);
  const [amount, setAmount] = React.useState(balance);
  const [mode, setMode] = React.useState("Cash");
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);
  const valid = amount > 0 && amount <= balance;
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <Card className="pointer-events-auto w-full max-w-md p-0 animate-in shadow-xl overflow-hidden">
          <div className="px-5 py-4 bg-surface-elevated border-b border-border flex items-center gap-3">
            <span className="h-10 w-10 rounded-md bg-success-soft text-success inline-flex items-center justify-center shrink-0"><Wallet className="h-5 w-5" /></span>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">Receive payment</h3>
              <p className="text-xs text-muted-foreground truncate">{booking.eventName || booking.customer} · {booking.hall}</p>
            </div>
            <button type="button" onClick={onClose} className="h-8 w-8 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
          </div>
          <div className="px-5 py-4 space-y-4">
            <div className="rounded-md border border-border p-3 space-y-1.5 text-sm">
              <Row label="Total" value={money(booking.total)} />
              <Row label="Already received" value={money(booking.advance)} />
              <div className="border-t border-border pt-1.5 mt-1.5 flex items-center justify-between">
                <span className="font-semibold text-warning">Balance due</span>
                <span className="text-base font-semibold tabular text-warning">{money(balance)}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Amount (₹)</Label>
                <Input type="number" min={1} max={balance} value={amount} onChange={e => setAmount(Math.min(balance, Math.max(0, Number(e.target.value))))} className="h-9 tabular" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Mode</Label>
                <Select value={mode} onChange={e => setMode(e.target.value)} className="h-9">
                  <option>Cash</option><option>Card</option><option>UPI</option><option>Bank</option><option>Online</option>
                </Select>
              </div>
            </div>
            <div className="flex gap-1.5">
              {[25, 50, 100].map(p => (
                <button key={p} type="button" onClick={() => setAmount(Math.round(balance * p / 100))} className="flex-1 h-8 rounded-md border border-border text-xs font-medium hover:bg-surface-sunken transition-colors">{p === 100 ? "Full" : `${p}%`}</button>
              ))}
            </div>
          </div>
          <div className="px-5 py-3 border-t border-border bg-surface-elevated flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button variant="success" disabled={!valid} onClick={() => onConfirm(amount, mode)}><CheckCircle2 className="h-4 w-4" />Record payment</Button>
          </div>
        </Card>
      </div>
    </>
  );
}

// ===================== CANCEL DIALOG =====================
export function CancelHallDialog({ booking, onClose, onConfirm }: {
  booking: HallBooking; onClose: () => void; onConfirm: (reason: string, refund: number) => void;
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

  // Tiered refund based on days-until-event, relative to today's real date.
  // Parse "today" from a YYYY-MM-DD string so it matches how booking.date is
  // parsed (both land on UTC midnight) and the day diff stays exact.
  const today = new Date(new Date().toLocaleDateString("en-CA"));
  const ev = new Date(booking.date);
  const daysUntil = Math.floor((ev.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  let refundPct = 100;
  let policyNote = "Full refund — > 14 days before event";
  if (daysUntil < 0) { refundPct = 0; policyNote = "No refund — event date passed"; }
  else if (daysUntil < 3) { refundPct = 0; policyNote = "No refund — within 3 days of event"; }
  else if (daysUntil < 7) { refundPct = 25; policyNote = "25% refund — within 7 days of event"; }
  else if (daysUntil < 14) { refundPct = 50; policyNote = "50% refund — within 14 days of event"; }

  const refund = Math.round(booking.advance * (refundPct / 100));
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
              <h3 className="font-semibold truncate">Cancel hall booking</h3>
              <p className="text-xs text-muted-foreground truncate">{booking.eventName || booking.customer} · {booking.hall}</p>
            </div>
            <button type="button" onClick={onClose} className="h-8 w-8 rounded-md hover:bg-white/40 inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
          </div>

          <div className="px-5 py-4 space-y-4">
            <div className="rounded-md border border-border p-3 text-sm space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Event</span>
                <span className="font-medium">{formatDate(booking.date)} · {booking.start} → {booking.end}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Guests</span>
                <span className="font-medium tabular">{booking.guests}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Advance paid</span>
                <span className="font-medium tabular">{money(booking.advance)}</span>
              </div>
            </div>

            <div className={cn(
              "rounded-md border p-3 text-sm space-y-1.5",
              refundPct >= 50 ? "border-warning/40 bg-warning-soft/40" : "border-danger/40 bg-danger-soft/40"
            )}>
              <p className="text-xs font-semibold uppercase tracking-wider">Hall cancellation policy</p>
              <p className="text-[11px]">{policyNote} ({daysUntil >= 0 ? `${daysUntil} days until event` : `event passed`})</p>
              <div className="flex items-center justify-between pt-1.5 border-t border-current/15">
                <span className="text-xs">Refund to client</span>
                <span className="text-base font-semibold tabular">{money(refund)} <span className="text-[10px] opacity-70">({refundPct}%)</span></span>
              </div>
            </div>

            <div className="rounded-md bg-warning-soft/40 border border-warning/30 p-3 text-xs flex items-start gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-warning">{booking.hall} slot will be released</p>
                <p className="text-muted-foreground mt-0.5">F&amp;B / catering linked to this booking will also be voided.</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Cancellation reason</Label>
              <Select value={reason} onChange={e => setReason(e.target.value)} className="h-9">
                <option>Client cancellation</option>
                <option>Insufficient guests</option>
                <option>Payment failed</option>
                <option>Event postponed</option>
                <option>Force majeure</option>
                <option>Other</option>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px]">Notify customer via</Label>
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
              <Ban className="h-4 w-4" />Cancel booking
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}
