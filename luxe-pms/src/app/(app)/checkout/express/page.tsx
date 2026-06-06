"use client";
import * as React from "react";
import {
  Zap, CreditCard, Smartphone, Wallet, Check, ChevronRight,
  Mail, MessageCircle, Sparkles, Crown, Receipt, Star,
  CalendarCheck2, Clock, BedDouble, Coffee, Percent, ShieldCheck,
  AlertCircle, RotateCcw, X, FileText, Gift, ArrowRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn, money } from "@/lib/utils";

type PayMethod = "preauth" | "upi" | "desk";
type TipChoice = 0 | 0.05 | 0.10 | 0.15 | -1; // -1 = custom

const ROOM_NIGHTS = [
  { date: "May 30", desc: "Deluxe King · Sea View", amount: 12500 },
  { date: "May 31", desc: "Deluxe King · Sea View", amount: 12500 },
  { date: "Jun 01", desc: "Deluxe King · Sea View", amount: 13750 },
];

const FNB_ITEMS = [
  { id: "fb1", at: "May 30 · 21:14", desc: "In-room dining · Coastal thali (2)", amount: 2840, disputable: false },
  { id: "fb2", at: "May 31 · 08:32", desc: "Breakfast buffet · The Atrium (2)", amount: 1800, disputable: false },
  { id: "fb3", at: "May 31 · 19:55", desc: "Mini-bar · Sula Brut + snacks", amount: 1650, disputable: true },
  { id: "fb4", at: "Jun 01 · 11:20", desc: "Spa · 60-min deep tissue", amount: 4500, disputable: true },
  { id: "fb5", at: "Jun 01 · 22:08", desc: "Bar · Pearl Lounge tab", amount: 3120, disputable: true },
];

const INCIDENTALS = [
  { id: "i1", at: "May 30 · 22:40", desc: "Laundry · 4 garments express", amount: 680, disputable: true },
  { id: "i2", at: "May 31 · 15:00", desc: "Airport pickup · Sedan", amount: 1500, disputable: false },
  { id: "i3", at: "Jun 01 · 09:15", desc: "Newspaper subscription (3 days)", amount: 90, disputable: true },
  { id: "i4", at: "Jun 01 · 17:30", desc: "Pool towel replacement", amount: 350, disputable: true },
];

export default function ExpressCheckoutPage() {
  const [toast, setToast] = React.useState<string | null>(null);
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };

  const [pay, setPay] = React.useState<PayMethod>("preauth");
  const [tipChoice, setTipChoice] = React.useState<TipChoice>(0.10);
  const [tipCustom, setTipCustom] = React.useState<string>("");
  const [emailOn, setEmailOn] = React.useState(true);
  const [email, setEmail] = React.useState("anjali.iyer@gmail.com");
  const [waOn, setWaOn] = React.useState(true);
  const [phone, setPhone] = React.useState("+91 98201 47823");
  const [disputed, setDisputed] = React.useState<Record<string, boolean>>({});
  const [showSidePanel, setShowSidePanel] = React.useState(true);
  const [success, setSuccess] = React.useState(false);
  const [reviewIncidentals, setReviewIncidentals] = React.useState(false);

  // ---------- Calculations ----------
  const roomSubtotal = ROOM_NIGHTS.reduce((s, n) => s + n.amount, 0);
  const fnbActive = FNB_ITEMS.filter(i => !disputed[i.id]).reduce((s, i) => s + i.amount, 0);
  const incidentalsActive = INCIDENTALS.filter(i => !disputed[i.id]).reduce((s, i) => s + i.amount, 0);
  const fnbSubtotal = fnbActive + incidentalsActive;

  const preTaxSubtotal = roomSubtotal + fnbSubtotal;
  const gstRate = 0.18; // Deluxe King ₹12,500/nt → 18% slab
  const gstTotal = Math.round(preTaxSubtotal * gstRate);
  const cgst = gstTotal / 2;
  const sgst = gstTotal / 2;

  // Loyalty discount: Gold tier 5% off F&B
  const discount = Math.round(fnbSubtotal * 0.05);

  const tipRate = tipChoice === -1 ? (parseFloat(tipCustom) || 0) / 100 : tipChoice;
  const tip = Math.round(fnbSubtotal * tipRate);

  const grandTotal = preTaxSubtotal + gstTotal - discount + tip;

  const pointsEarned = Math.round(grandTotal / 100); // 1 pt per ₹100
  const currentPoints = 7820;
  const platinumThreshold = 10000;
  const newPoints = currentPoints + pointsEarned;
  const progressPct = Math.min(100, (newPoints / platinumThreshold) * 100);
  const pointsToPlatinum = Math.max(0, platinumThreshold - newPoints);

  const disputeCount = Object.values(disputed).filter(Boolean).length;

  const handleConfirm = () => {
    showToast("Processing payment…");
    setTimeout(() => setSuccess(true), 800);
  };

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
              <p className="text-muted-foreground mt-2">Thank you for staying at The Pearl Marina, Anjali.</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-surface-sunken px-4 py-2 text-sm">
              <Receipt className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Receipt</span>
              <span className="font-medium tabular">INV-2026-04812</span>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-medium">Receipt summary</h3>
              <Badge tone="success"><Check className="h-3 w-3" /> Paid</Badge>
            </div>
            <div className="space-y-2 text-sm">
              <Row label="Room (3 nights)" value={money(roomSubtotal)} />
              <Row label="Food, Bar & Spa" value={money(fnbSubtotal)} />
              <Row label="CGST 9% + SGST 9%" value={money(gstTotal)} />
              {discount > 0 && <Row label="Loyalty discount" value={`− ${money(discount)}`} muted className="text-success" />}
              {tip > 0 && <Row label="Tip" value={money(tip)} />}
              <div className="border-t border-border pt-3 mt-3 flex items-center justify-between">
                <span className="font-medium">Total charged</span>
                <span className="font-display text-xl tabular">{money(grandTotal)}</span>
              </div>
              <p className="text-xs text-muted-foreground pt-1">
                Charged to HDFC Credit Card ending 4521 · Auth code 8A2F19
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
            <Card className="p-5 hover:bg-surface-sunken/40 cursor-pointer transition" onClick={() => showToast("Returning to bookings")}>
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-brand-soft flex items-center justify-center shrink-0">
                  <CalendarCheck2 className="h-5 w-5 text-brand-soft-foreground" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">Book again</div>
                  <div className="text-xs text-muted-foreground mt-0.5">15% loyalty rate available</div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground self-center" />
              </div>
            </Card>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2">
            <Mail className="h-3 w-3" /> Invoice sent to {email} · <MessageCircle className="h-3 w-3" /> WhatsApp PDF dispatched
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
              <h1 className="text-2xl font-display font-medium tracking-tight">Express checkout · Room 412</h1>
              <Badge tone="brand"><Sparkles className="h-3 w-3" /> One-tap</Badge>
            </div>
            <p className="text-muted-foreground text-sm mt-1">
              Anjali Iyer · Deluxe King · Departing today by <span className="tabular font-medium text-foreground">11:30 AM</span>
              <span className="mx-2">·</span>
              <Clock className="inline h-3 w-3 mr-1" /> Stay 3 nights
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowSidePanel(s => !s)}>
            <FileText className="h-4 w-4" /> {showSidePanel ? "Hide" : "Review"} incidentals
            {disputeCount > 0 && <Badge tone="warning" className="ml-1">{disputeCount} flagged</Badge>}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => showToast("Switched to standard checkout")}>
            Standard checkout
          </Button>
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
                <Badge tone="success"><ShieldCheck className="h-3 w-3" /> Pre-auth on file</Badge>
                <Badge tone="accent"><Crown className="h-3 w-3" /> Gold tier</Badge>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 pt-5 border-t border-border/60 text-sm">
              <Row icon={<BedDouble className="h-3.5 w-3.5 text-muted-foreground" />} label="Room subtotal (3 nights)" value={money(roomSubtotal)} />
              <Row icon={<Coffee className="h-3.5 w-3.5 text-muted-foreground" />} label="Food, bar, spa & incidentals" value={money(fnbSubtotal)} />
              <Row icon={<Percent className="h-3.5 w-3.5 text-muted-foreground" />} label="CGST 9%" value={money(cgst)} />
              <Row icon={<Percent className="h-3.5 w-3.5 text-muted-foreground" />} label="SGST 9%" value={money(sgst)} />
              {discount > 0 && (
                <Row
                  icon={<Gift className="h-3.5 w-3.5 text-success" />}
                  label="Gold tier discount (5% F&B)"
                  value={`− ${money(discount)}`}
                  className="text-success"
                />
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

            {/* Card preview */}
            {pay === "preauth" && (
              <div className="mt-2 rounded-xl border border-border bg-gradient-to-br from-foreground to-foreground/80 text-background p-5 max-w-md">
                <div className="flex items-start justify-between">
                  <div className="space-y-3">
                    <div className="text-[10px] uppercase tracking-widest opacity-60">HDFC Bank · Credit</div>
                    <div className="font-display text-xl tabular tracking-widest">•••• •••• •••• 4521</div>
                    <div className="text-xs opacity-70">Anjali Iyer · exp 08/29</div>
                  </div>
                  <CreditCard className="h-7 w-7 opacity-70" />
                </div>
                <div className="mt-4 pt-3 border-t border-background/20 flex items-center justify-between text-[11px]">
                  <span className="opacity-70 flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" /> Pre-auth held: {money(grandTotal + 5000)}
                  </span>
                  <span className="opacity-90">Auto-charge on departure</span>
                </div>
              </div>
            )}

            {pay === "upi" && (
              <div className="mt-2 rounded-xl border border-border bg-surface-sunken/40 p-4 max-w-md">
                <Label className="text-xs">UPI ID</Label>
                <Input
                  placeholder="anjali@okhdfc"
                  defaultValue="anjali.iyer@okhdfcbank"
                  className="mt-1.5 max-w-xs"
                />
                <div className="text-xs text-muted-foreground mt-2">Collect request will be sent on confirm.</div>
              </div>
            )}

            {pay === "desk" && (
              <div className="mt-2 rounded-xl border border-warning-soft bg-warning-soft/20 p-4 text-sm flex gap-2 max-w-md">
                <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                <div>Guest will settle at the front desk. Express flow will mark the folio as <span className="font-medium">pending settlement</span>.</div>
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
                    "mt-0.5 h-5 w-9 rounded-full transition-colors shrink-0 relative",
                    emailOn ? "bg-brand" : "bg-border"
                  )}
                >
                  <span className={cn(
                    "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
                    emailOn ? "translate-x-4" : "translate-x-0.5"
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
                    className="mt-1.5"
                  />
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg border border-border">
                <button
                  type="button"
                  onClick={() => { setWaOn(v => !v); showToast(`WhatsApp invoice ${!waOn ? "enabled" : "disabled"}`); }}
                  className={cn(
                    "mt-0.5 h-5 w-9 rounded-full transition-colors shrink-0 relative",
                    waOn ? "bg-brand" : "bg-border"
                  )}
                >
                  <span className={cn(
                    "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
                    waOn ? "translate-x-4" : "translate-x-0.5"
                  )} />
                </button>
                <MessageCircle className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
                <div className="flex-1 min-w-0">
                  <Label className="text-sm">WhatsApp invoice</Label>
                  <Input
                    value={phone}
                    disabled={!waOn}
                    onChange={(e) => setPhone(e.target.value)}
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
                  <Button variant="outline" size="sm" onClick={() => showToast("Reverted to standard flow")}>
                    <RotateCcw className="h-4 w-4" /> Cancel
                  </Button>
                  <Button onClick={handleConfirm} className="flex-1 sm:flex-none">
                    Confirm & checkout <ArrowRight className="h-4 w-4" />
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

              {/* ROOM */}
              <Section title="Room charges" icon={<BedDouble className="h-3.5 w-3.5" />} total={roomSubtotal}>
                {ROOM_NIGHTS.map((n, i) => (
                  <LineItem key={i} at={n.date} desc={n.desc} amount={n.amount} disputable={false} />
                ))}
              </Section>

              {/* F&B */}
              <Section title="Food, bar & spa" icon={<Coffee className="h-3.5 w-3.5" />} total={fnbActive}>
                {FNB_ITEMS.map(i => (
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

              {/* INCIDENTALS */}
              <Section title="Other incidentals" icon={<Receipt className="h-3.5 w-3.5" />} total={incidentalsActive}>
                {INCIDENTALS.map(i => (
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
              {[...FNB_ITEMS, ...INCIDENTALS].filter(i => disputed[i.id]).map(i => (
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
