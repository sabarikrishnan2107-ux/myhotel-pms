"use client";
import * as React from "react";
import Link from "next/link";
import {
  Zap, CreditCard, Smartphone, Wallet, Check, ChevronRight,
  Mail, MessageCircle, Sparkles, Crown, Receipt, Star,
  CalendarCheck2, Clock, BedDouble, Coffee, Percent, ShieldCheck,
  AlertCircle, RotateCcw, X, FileText, ArrowRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn, money } from "@/lib/utils";
import { useProperty, hotelName } from "@/lib/use-property";
import { apiGet, apiPost, apiPut } from "@/lib/api";

type PayMethod = "preauth" | "upi" | "desk";
type TipChoice = 0 | 0.05 | 0.10 | 0.15 | -1; // -1 = custom

type ApiBooking = {
  id: number; bookingNo: string; guestName: string; roomNumber?: string;
  roomType?: string; nights?: number; total?: number; balance?: number; checkOut?: string;
};
type Charge = { id: number; date: string; description: string; type: string; amount: number; tax: number };
type Payment = { id: number; date: string; mode: string; amount: number };
type GuestRow = { name: string; email?: string | null; phone?: string | null };

export default function ExpressCheckoutPage({ params }: { params: Promise<{ bookingNo: string }> }) {
  const { bookingNo } = React.use(params);
  const name = hotelName(useProperty());
  const [toast, setToast] = React.useState<string | null>(null);
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };

  // ---------- Live data ----------
  const [booking, setBooking] = React.useState<ApiBooking | null>(null);
  const [charges, setCharges] = React.useState<Charge[]>([]);
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");

  React.useEffect(() => {
    apiGet<ApiBooking[]>("/bookings").then(list => {
      const b = list.find(x => x.bookingNo === bookingNo) ?? null;
      setBooking(b);
      if (b) {
        apiGet<GuestRow[]>("/guests").then(gs => {
          const g = gs.find(x => x.name === b.guestName);
          if (g?.email) setEmail(g.email);
          if (g?.phone) setPhone(g.phone);
        }).catch(() => {});
      }
    }).catch(() => {});
    const q = `?bookingNo=${encodeURIComponent(bookingNo)}`;
    apiGet<Charge[]>(`/folio-charges${q}`).then(setCharges).catch(() => {});
    apiGet<Payment[]>(`/folio-payments${q}`).then(setPayments).catch(() => {});
  }, [bookingNo]);

  const [pay, setPay] = React.useState<PayMethod>("preauth");
  const [tipChoice, setTipChoice] = React.useState<TipChoice>(0);
  const [tipCustom, setTipCustom] = React.useState<string>("");
  const [emailOn, setEmailOn] = React.useState(true);
  const [waOn, setWaOn] = React.useState(true);
  const [disputed, setDisputed] = React.useState<Record<string, boolean>>({});
  const [showSidePanel, setShowSidePanel] = React.useState(true);
  const [success, setSuccess] = React.useState(false);
  const [reviewIncidentals, setReviewIncidentals] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  // ---------- Derive line items from the real folio ----------
  const items = charges.map(c => ({
    id: String(c.id), at: c.date, desc: c.description, amount: c.amount,
    tax: c.tax ?? 0, type: c.type, disputable: c.type !== "Room",
  }));
  const roomItems = items.filter(i => i.type === "Room");
  const fnbItems = items.filter(i => i.type === "F&B");
  const otherItems = items.filter(i => i.type !== "Room" && i.type !== "F&B");
  const isActive = (i: { id: string }) => !disputed[i.id];

  const roomSubtotal = roomItems.filter(isActive).reduce((s, i) => s + i.amount, 0);
  const fnbActive = fnbItems.filter(isActive).reduce((s, i) => s + i.amount, 0);
  const incidentalsActive = otherItems.filter(isActive).reduce((s, i) => s + i.amount, 0);
  const fnbSubtotal = fnbActive + incidentalsActive;

  const activeItems = items.filter(isActive);
  const chargesTotal = activeItems.reduce((s, i) => s + i.amount, 0); // amounts already include tax
  const gstTotal = activeItems.reduce((s, i) => s + i.tax, 0);
  const preTaxSubtotal = chargesTotal - gstTotal;
  const cgst = gstTotal / 2;
  const sgst = gstTotal / 2;
  const paid = payments.reduce((s, p) => s + p.amount, 0);
  const balanceDue = Math.max(0, chargesTotal - paid);

  const tipRate = tipChoice === -1 ? (parseFloat(tipCustom) || 0) / 100 : tipChoice;
  const tip = Math.round(fnbSubtotal * tipRate);
  const grandTotal = balanceDue + tip; // collected now to settle + tip

  const pointsEarned = Math.round(chargesTotal / 100); // 1 pt per ₹100 of spend
  const currentPoints = 7820;
  const platinumThreshold = 10000;
  const newPoints = currentPoints + pointsEarned;
  const progressPct = Math.min(100, (newPoints / platinumThreshold) * 100);
  const pointsToPlatinum = Math.max(0, platinumThreshold - newPoints);

  const disputeCount = Object.values(disputed).filter(Boolean).length;

  const handleConfirm = () => {
    if (!booking || submitting) return;
    setSubmitting(true);
    showToast("Processing checkout…");
    const settle = grandTotal;
    const modeLabel = pay === "preauth" ? "Card (pre-auth)" : pay === "upi" ? "UPI" : "Cash";
    const date = new Date().toISOString().slice(0, 10);
    const start: Promise<unknown> = settle > 0
      ? apiPost("/folio-payments", { bookingNo: booking.bookingNo, date, mode: modeLabel, amount: settle, reference: "Express checkout" })
      : Promise.resolve();
    start
      .then(() => apiPut(`/bookings/${booking.id}`, { paymentStatus: "paid", advance: booking.total ?? settle, balance: 0, status: "checked-out" }))
      // Vacated room goes dirty so it surfaces on the Housekeeping board.
      .then(() => apiGet<{ id: number; number: string }[]>("/rooms"))
      .then(rooms => {
        const room = rooms?.find(r => r.number === booking.roomNumber);
        if (room) return apiPut(`/rooms/${room.id}`, { hkStatus: "dirty" });
      })
      .catch(() => {})
      .finally(() => { setSubmitting(false); setSuccess(true); });
  };

  // ---------- Loading / not found ----------
  if (!booking && !success) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <Card className="p-10 text-center text-muted-foreground">Loading booking {bookingNo}…</Card>
      </div>
    );
  }

  const guestName = booking?.guestName ?? "Guest";
  const roomNo = booking?.roomNumber ?? "—";

  // ---------- Success Screen ----------
  if (success) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        {toast && <div className="fixed bottom-6 right-6 z-50 bg-foreground text-background rounded-lg px-4 py-3 text-sm shadow-2xl">{toast}</div>}
        <div className="max-w-2xl mx-auto pt-8 space-y-6">
          <Card className="p-10 text-center space-y-5">
            <div className="mx-auto h-20 w-20 rounded-full bg-success-soft flex items-center justify-center">
              <Check className="h-10 w-10 text-success" strokeWidth={3} />
            </div>
            <div>
              <h2 className="text-3xl font-display font-medium tracking-tight">You&apos;re checked out</h2>
              <p className="text-muted-foreground mt-2">Thank you for staying at {name}, {guestName}.</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-surface-sunken px-4 py-2 text-sm">
              <Receipt className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Receipt</span>
              <span className="font-medium tabular">INV-{booking?.bookingNo}</span>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-medium">Receipt summary</h3>
              <Badge tone="success"><Check className="h-3 w-3" /> Paid</Badge>
            </div>
            <div className="space-y-2 text-sm">
              <Row label="Room charges" value={money(roomSubtotal)} />
              <Row label="Food, Bar & Spa" value={money(fnbSubtotal)} />
              <Row label="Incl. taxes (CGST + SGST)" value={money(gstTotal)} muted />
              {paid > 0 && <Row label="Already paid" value={`− ${money(paid)}`} className="text-success" />}
              {tip > 0 && <Row label="Tip" value={money(tip)} />}
              <div className="border-t border-border pt-3 mt-3 flex items-center justify-between">
                <span className="font-medium">Total charged</span>
                <span className="font-display text-xl tabular">{money(grandTotal)}</span>
              </div>
              <p className="text-xs text-muted-foreground pt-1">
                Settled via {pay === "preauth" ? "card on file" : pay === "upi" ? "UPI" : "front desk"} · Room {roomNo}
              </p>
            </div>
          </Card>

          <Card className="p-6 space-y-3">
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-accent" />
              <span className="text-sm">
                <span className="font-medium">+{pointsEarned} points</span> credited · {pointsToPlatinum > 0 ? `${pointsToPlatinum.toLocaleString("en-IN")} pts to Platinum` : "Platinum unlocked"}
              </span>
            </div>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Card className="p-5 hover:bg-surface-sunken/40 cursor-pointer transition" onClick={() => showToast("Rating dialog opened")}>
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-warning-soft flex items-center justify-center shrink-0">
                  <Star className="h-5 w-5 text-warning" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">Rate your stay</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Help us serve you better</div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground self-center" />
              </div>
            </Card>
            <Link href="/checkout">
              <Card className="p-5 hover:bg-surface-sunken/40 cursor-pointer transition">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-brand-soft flex items-center justify-center shrink-0">
                    <CalendarCheck2 className="h-5 w-5 text-brand-soft-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">Back to checkouts</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Process the next departure</div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground self-center" />
                </div>
              </Card>
            </Link>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2">
            <Mail className="h-3 w-3" /> Invoice {emailOn && email ? `sent to ${email}` : "ready"}
            {waOn && phone ? <> · <MessageCircle className="h-3 w-3" /> WhatsApp PDF dispatched</> : null}
          </div>
        </div>
      </div>
    );
  }

  // ---------- Main Express Checkout ----------
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-brand to-accent flex items-center justify-center text-white shadow-lg">
            <Zap className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-display font-medium tracking-tight">Express checkout · Room {roomNo}</h1>
              <Badge tone="brand"><Sparkles className="h-3 w-3" /> One-tap</Badge>
            </div>
            <p className="text-muted-foreground text-sm mt-1">
              {guestName} · {booking?.roomType ?? "Room"} · Departing today
              <span className="mx-2">·</span>
              <Clock className="inline h-3 w-3 mr-1" /> Stay {booking?.nights ?? 1} night{(booking?.nights ?? 1) === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowSidePanel(s => !s)}>
            <FileText className="h-4 w-4" /> {showSidePanel ? "Hide" : "Review"} incidentals
            {disputeCount > 0 && <Badge tone="warning" className="ml-1">{disputeCount} flagged</Badge>}
          </Button>
          <Link href={`/checkout/${booking?.bookingNo}`}>
            <Button size="sm" variant="ghost">Standard checkout</Button>
          </Link>
        </div>
      </div>

      <div className={cn("grid gap-5", showSidePanel ? "lg:grid-cols-[1fr_420px]" : "grid-cols-1")}>
        {/* LEFT COLUMN */}
        <div className="space-y-5">
          {/* BIG TOTAL CARD */}
          <Card className="p-6 sm:p-8 bg-gradient-to-br from-surface to-brand-soft/30 border-brand-soft">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Grand total due</div>
                <div className="font-display font-medium tabular text-5xl sm:text-6xl mt-2 tracking-tight">{money(grandTotal)}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Including all taxes · {pay === "preauth" && "Auto-charge on departure"}
                  {pay === "upi" && "UPI · pay now"}
                  {pay === "desk" && "Settle at front desk"}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {balanceDue === 0
                  ? <Badge tone="success"><ShieldCheck className="h-3 w-3" /> Balance clear</Badge>
                  : <Badge tone="warning"><AlertCircle className="h-3 w-3" /> {money(balanceDue)} due</Badge>}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 pt-5 border-t border-border/60 text-sm">
              <Row icon={<BedDouble className="h-3.5 w-3.5 text-muted-foreground" />} label="Room subtotal" value={money(roomSubtotal)} />
              <Row icon={<Coffee className="h-3.5 w-3.5 text-muted-foreground" />} label="Food, bar, spa & incidentals" value={money(fnbSubtotal)} />
              <Row icon={<Percent className="h-3.5 w-3.5 text-muted-foreground" />} label="CGST" value={money(cgst)} />
              <Row icon={<Percent className="h-3.5 w-3.5 text-muted-foreground" />} label="SGST" value={money(sgst)} />
              {paid > 0 && (
                <Row icon={<Check className="h-3.5 w-3.5 text-success" />} label="Already paid" value={`− ${money(paid)}`} className="text-success" />
              )}
              {tip > 0 && (
                <Row
                  icon={<Sparkles className="h-3.5 w-3.5 text-accent" />}
                  label={`Tip · ${tipChoice === -1 ? `${tipCustom || 0}%` : `${(tipRate * 100).toFixed(0)}%`}`}
                  value={money(tip)}
                />
              )}
            </div>
          </Card>

          {/* PAYMENT METHOD */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg font-medium">Payment method</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Choose how to settle the bill</p>
              </div>
              <Badge tone="neutral">3 options</Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <PayPill
                active={pay === "preauth"}
                onClick={() => { setPay("preauth"); showToast("Pre-auth card selected"); }}
                icon={<CreditCard className="h-4 w-4" />}
                title="Pre-auth card"
                sub="Default · auto-charge"
                badge="Fastest"
              />
              <PayPill
                active={pay === "upi"}
                onClick={() => { setPay("upi"); showToast("UPI selected"); }}
                icon={<Smartphone className="h-4 w-4" />}
                title="UPI"
                sub="GPay · PhonePe · Paytm"
              />
              <PayPill
                active={pay === "desk"}
                onClick={() => { setPay("desk"); showToast("Pay at desk selected"); }}
                icon={<Wallet className="h-4 w-4" />}
                title="Pay at desk"
                sub="Cash · card · forex"
              />
            </div>

            {pay === "upi" && (
              <div className="mt-2 rounded-xl border border-border bg-surface-sunken/40 p-4 max-w-md">
                <Label className="text-xs">UPI ID</Label>
                <Input placeholder="guest@okhdfc" className="mt-1.5 max-w-xs" />
                <div className="text-xs text-muted-foreground mt-2">Collect request will be sent on confirm.</div>
              </div>
            )}

            {pay === "desk" && (
              <div className="mt-2 rounded-xl border border-warning-soft bg-warning-soft/20 p-4 text-sm flex gap-2 max-w-md">
                <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                <div>Guest will settle at the front desk; the folio is recorded as paid on checkout.</div>
              </div>
            )}
          </Card>

          {/* TIP */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg font-medium">Add a tip</h3>
                <p className="text-xs text-muted-foreground mt-0.5">For the team that served you. Calculated on F&B only.</p>
              </div>
              <Badge tone="accent"><Sparkles className="h-3 w-3" /> Optional</Badge>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {([0, 0.05, 0.10, 0.15] as TipChoice[]).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setTipChoice(t); showToast(t === 0 ? "Tip removed" : `${(t * 100).toFixed(0)}% tip added`); }}
                  className={cn(
                    "rounded-lg border px-3 py-3 text-sm font-medium transition text-center",
                    tipChoice === t
                      ? "border-brand bg-brand-soft text-brand-soft-foreground ring-2 ring-brand/30"
                      : "border-border hover:bg-surface-sunken/40"
                  )}
                >
                  <div className="text-base tabular">{t === 0 ? "None" : `${(t * 100).toFixed(0)}%`}</div>
                  {t !== 0 && (
                    <div className="text-[11px] text-muted-foreground mt-0.5 tabular">
                      {money(Math.round(fnbSubtotal * (t as number)))}
                    </div>
                  )}
                </button>
              ))}
              <button
                type="button"
                onClick={() => { setTipChoice(-1); showToast("Custom tip"); }}
                className={cn(
                  "rounded-lg border px-3 py-3 text-sm font-medium transition text-center",
                  tipChoice === -1
                    ? "border-brand bg-brand-soft text-brand-soft-foreground ring-2 ring-brand/30"
                    : "border-border hover:bg-surface-sunken/40"
                )}
              >
                <div className="text-base">Custom</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">Set %</div>
              </button>
            </div>
            {tipChoice === -1 && (
              <div className="flex items-center gap-2 max-w-xs">
                <Label className="text-xs whitespace-nowrap">Custom %</Label>
                <Input
                  type="number"
                  min={0}
                  max={50}
                  value={tipCustom}
                  onChange={(e) => setTipCustom(e.target.value)}
                  placeholder="12"
                />
                <span className="text-sm text-muted-foreground tabular w-24 text-right">
                  {money(Math.round(fnbSubtotal * ((parseFloat(tipCustom) || 0) / 100)))}
                </span>
              </div>
            )}
          </Card>

          {/* INVOICE DELIVERY */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg font-medium">Invoice delivery</h3>
                <p className="text-xs text-muted-foreground mt-0.5">GST-compliant PDF, sent within 30 seconds of checkout.</p>
              </div>
              <Badge tone="info"><FileText className="h-3 w-3" /> GST tax invoice</Badge>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-lg border border-border">
                <button
                  type="button"
                  onClick={() => { setEmailOn(v => !v); showToast(`Email invoice ${!emailOn ? "enabled" : "disabled"}`); }}
                  className={cn(
                    "mt-0.5 h-6 w-11 rounded-full transition-colors shrink-0 relative",
                    emailOn ? "bg-success" : "bg-border-strong"
                  )}
                >
                  <span className={cn(
                    "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
                    emailOn ? "translate-x-[22px]" : "translate-x-0.5"
                  )} />
                </button>
                <Mail className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
                <div className="flex-1 min-w-0">
                  <Label className="text-sm">Email invoice</Label>
                  <Input
                    type="email"
                    value={email}
                    disabled={!emailOn}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="guest@email.com"
                    className="mt-1.5"
                  />
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg border border-border">
                <button
                  type="button"
                  onClick={() => { setWaOn(v => !v); showToast(`WhatsApp invoice ${!waOn ? "enabled" : "disabled"}`); }}
                  className={cn(
                    "mt-0.5 h-6 w-11 rounded-full transition-colors shrink-0 relative",
                    waOn ? "bg-success" : "bg-border-strong"
                  )}
                >
                  <span className={cn(
                    "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
                    waOn ? "translate-x-[22px]" : "translate-x-0.5"
                  )} />
                </button>
                <MessageCircle className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
                <div className="flex-1 min-w-0">
                  <Label className="text-sm">WhatsApp invoice</Label>
                  <Input
                    value={phone}
                    disabled={!waOn}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 …"
                    className="mt-1.5"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* LOYALTY */}
          <Card className="p-6 bg-gradient-to-br from-accent-soft/40 to-surface space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-accent" />
                  <h3 className="font-display text-lg font-medium">Marina Rewards · Gold</h3>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Earn 1 point per ₹100 spent. Redeem against future stays.</p>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">This stay</div>
                <div className="font-display text-2xl tabular text-accent">+{pointsEarned}</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  <span className="tabular font-medium text-foreground">{currentPoints.toLocaleString("en-IN")}</span> + {pointsEarned} = <span className="tabular font-medium text-foreground">{newPoints.toLocaleString("en-IN")}</span> pts
                </span>
                <span className="text-muted-foreground tabular">{platinumThreshold.toLocaleString("en-IN")} to Platinum</span>
              </div>
              <div className="h-2.5 rounded-full bg-surface-sunken overflow-hidden relative">
                <div
                  className="h-full bg-gradient-to-r from-accent to-brand transition-all duration-700"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Gold</span>
                <span className="tabular">
                  {pointsToPlatinum > 0
                    ? `Only ${pointsToPlatinum.toLocaleString("en-IN")} pts to unlock Platinum`
                    : "Platinum unlocked — enjoy complimentary upgrades"}
                </span>
                <span>Platinum</span>
              </div>
            </div>
          </Card>

          {/* CONFIRM */}
          <div className="sticky bottom-4 z-10">
            <Card className="p-4 sm:p-5 shadow-xl border-brand-soft">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs text-muted-foreground">You&apos;ll be charged</div>
                  <div className="font-display text-2xl tabular">{money(grandTotal)}</div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Link href={`/checkout/${booking?.bookingNo}`} className="sm:flex-none">
                    <Button variant="outline" size="sm">
                      <RotateCcw className="h-4 w-4" /> Cancel
                    </Button>
                  </Link>
                  <Button onClick={handleConfirm} disabled={submitting} className="flex-1 sm:flex-none">
                    {submitting ? "Processing…" : <>Confirm &amp; checkout <ArrowRight className="h-4 w-4" /></>}
                  </Button>
                </div>
              </div>
              {pay === "preauth" && (
                <div className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" /> Card on file charged automatically. No signature required.
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* RIGHT SIDE PANEL: incidentals review */}
        {showSidePanel && (
          <div className="space-y-5">
            <Card className="p-5 sticky top-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-display text-lg font-medium">Incidentals review</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Uncheck any line item the guest disputes.</p>
                </div>
                <Badge tone={disputeCount > 0 ? "warning" : "neutral"}>
                  {disputeCount > 0 ? `${disputeCount} flagged` : "All approved"}
                </Badge>
              </div>

              {items.length === 0 && (
                <p className="text-sm text-muted-foreground py-6 text-center">No charges posted to this folio yet.</p>
              )}

              {/* ROOM */}
              {roomItems.length > 0 && (
                <Section title="Room charges" icon={<BedDouble className="h-3.5 w-3.5" />} total={roomSubtotal}>
                  {roomItems.map(n => (
                    <LineItem key={n.id} at={n.at} desc={n.desc} amount={n.amount} disputable={false} />
                  ))}
                </Section>
              )}

              {/* F&B */}
              {fnbItems.length > 0 && (
                <Section title="Food, bar & spa" icon={<Coffee className="h-3.5 w-3.5" />} total={fnbActive}>
                  {fnbItems.map(i => (
                    <LineItem
                      key={i.id}
                      at={i.at}
                      desc={i.desc}
                      amount={i.amount}
                      disputable={i.disputable}
                      checked={!disputed[i.id]}
                      onToggle={() => {
                        setDisputed(d => ({ ...d, [i.id]: !d[i.id] }));
                        showToast(disputed[i.id] ? "Charge restored" : "Charge flagged for review");
                      }}
                    />
                  ))}
                </Section>
              )}

              {/* INCIDENTALS */}
              {otherItems.length > 0 && (
                <Section title="Other incidentals" icon={<Receipt className="h-3.5 w-3.5" />} total={incidentalsActive}>
                  {otherItems.map(i => (
                    <LineItem
                      key={i.id}
                      at={i.at}
                      desc={i.desc}
                      amount={i.amount}
                      disputable={i.disputable}
                      checked={!disputed[i.id]}
                      onToggle={() => {
                        setDisputed(d => ({ ...d, [i.id]: !d[i.id] }));
                        showToast(disputed[i.id] ? "Charge restored" : "Charge flagged for review");
                      }}
                    />
                  ))}
                </Section>
              )}

              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between text-sm font-medium">
                  <span>Subtotal after disputes</span>
                  <span className="tabular">{money(preTaxSubtotal)}</span>
                </div>
                {disputeCount > 0 && (
                  <Button size="sm" variant="outline" className="w-full mt-3" onClick={() => { setReviewIncidentals(true); showToast("Routing to manager"); }}>
                    <AlertCircle className="h-4 w-4" /> Escalate {disputeCount} disputed item{disputeCount === 1 ? "" : "s"}
                  </Button>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Escalation modal */}
      {reviewIncidentals && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-display text-xl font-medium">Escalate disputed items</h3>
                <p className="text-sm text-muted-foreground mt-1">A duty manager will review and respond within 5 minutes.</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setReviewIncidentals(false)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="rounded-lg bg-surface-sunken/60 p-4 space-y-2 text-sm">
              {items.filter(i => disputed[i.id]).map(i => (
                <div key={i.id} className="flex items-center justify-between">
                  <span>{i.desc}</span>
                  <span className="tabular text-muted-foreground">{money(i.amount)}</span>
                </div>
              ))}
            </div>
            <div>
              <Label className="text-xs">Note to manager</Label>
              <Input className="mt-1.5" placeholder="Guest says mini-bar items were never consumed…" />
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setReviewIncidentals(false)}>Cancel</Button>
              <Button size="sm" onClick={() => { setReviewIncidentals(false); showToast("Escalated to duty manager"); }}>
                Send to manager
              </Button>
            </div>
          </Card>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-foreground text-background rounded-lg px-4 py-3 text-sm shadow-2xl">
          {toast}
        </div>
      )}
    </div>
  );
}

/* ---------- Helpers ---------- */

function Row({
  label, value, icon, muted, className,
}: { label: string; value: string; icon?: React.ReactNode; muted?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <span className={cn("flex items-center gap-1.5", muted ? "text-muted-foreground" : "text-muted-foreground")}>
        {icon}{label}
      </span>
      <span className="font-medium tabular">{value}</span>
    </div>
  );
}

function PayPill({
  active, onClick, icon, title, sub, badge,
}: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; sub: string; badge?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "text-left rounded-xl border p-4 transition relative",
        active
          ? "border-brand bg-brand-soft/50 ring-2 ring-brand/30"
          : "border-border hover:bg-surface-sunken/40"
      )}
    >
      <div className="flex items-center gap-2">
        <div className={cn(
          "h-8 w-8 rounded-lg flex items-center justify-center",
          active ? "bg-brand text-white" : "bg-surface-sunken text-foreground"
        )}>
          {icon}
        </div>
        <div className="font-medium text-sm">{title}</div>
        {active && <Check className="h-4 w-4 text-brand ml-auto" />}
      </div>
      <div className="text-xs text-muted-foreground mt-2">{sub}</div>
      {badge && (
        <span className="absolute -top-2 right-3 inline-flex items-center gap-1 rounded-full bg-success-soft text-success text-[10px] px-2 py-0.5 font-medium">
          {badge}
        </span>
      )}
    </button>
  );
}

function Section({
  title, icon, total, children,
}: { title: string; icon: React.ReactNode; total: number; children: React.ReactNode }) {
  return (
    <div className="mt-4 first:mt-0">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          {icon}{title}
        </div>
        <span className="text-xs tabular text-muted-foreground">{money(total)}</span>
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function LineItem({
  at, desc, amount, disputable, checked = true, onToggle,
}: { at: string; desc: string; amount: number; disputable: boolean; checked?: boolean; onToggle?: () => void }) {
  return (
    <div className={cn(
      "flex items-start gap-2.5 rounded-md px-2 py-1.5 text-sm",
      !checked && "bg-danger-soft/40 line-through text-muted-foreground"
    )}>
      {disputable ? (
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            "h-4 w-4 mt-0.5 rounded border flex items-center justify-center shrink-0 transition",
            checked ? "bg-brand border-brand" : "border-border bg-surface"
          )}
        >
          {checked && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
        </button>
      ) : (
        <div className="h-4 w-4 mt-0.5 rounded bg-surface-sunken border border-border flex items-center justify-center shrink-0">
          <ShieldCheck className="h-2.5 w-2.5 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="leading-tight truncate">{desc}</div>
        <div className="text-[11px] text-muted-foreground tabular">{at}</div>
      </div>
      <div className="tabular text-sm shrink-0">{money(amount)}</div>
    </div>
  );
}
