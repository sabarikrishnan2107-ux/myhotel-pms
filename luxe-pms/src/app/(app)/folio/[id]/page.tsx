"use client";
import * as React from "react";
import Link from "next/link";
import { use } from "react";
import {
  Printer, Send, CreditCard, Split, Plus, Percent, X,
  Phone, Mail, Calendar, BedDouble, ArrowRight, ChevronLeft, ChevronRight,
  Sparkles, CheckCircle2, Crown, FileText, Edit, MoreVertical, Building2,
  IdCard, Globe2, Download, MessageCircle, Hash, Wallet,
  TrendingUp, FileBarChart, ShieldCheck, Activity, Activity as ActivityIcon, AlertCircle,
  RotateCcw, MinusCircle, ArrowDownToLine,
} from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, PaymentBadge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Input, Label, Select } from "@/components/ui/input";
import { RESERVATIONS, GUESTS, SAMPLE_FOLIO_CHARGES, SAMPLE_PAYMENTS } from "@/lib/mock-data";
import { cn, money, formatDate, formatDateLong, formatTime } from "@/lib/utils";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";
import { useProperty, hotelName } from "@/lib/use-property";
import { useBranding } from "@/lib/use-branding";

const TABS = [
  { id: "overview", label: "Overview", icon: FileBarChart },
  { id: "charges", label: "Charges", icon: FileText },
  { id: "payments", label: "Payments", icon: Wallet },
  { id: "split", label: "Split Billing", icon: Split },
  { id: "audit", label: "Notes & Audit", icon: ActivityIcon },
] as const;
type TabId = typeof TABS[number]["id"];

// Folio-level adjustments & comps — loaded live from /folio-adjustments.
type Adjustment = { id: string | number; date: string; type: "Discount" | "Comp"; description: string; amount: number; approver?: string };

const AUDIT_LOG = [
  { id: "al1", at: "Today 13:42", actor: "Khalid R.", action: "Added charge", detail: "Airport transfer — ₹1,500 → ₹1,770 incl. GST 18%" },
  { id: "al2", at: "Today 12:18", actor: "Tom W. (Mgr)", action: "Approved discount", detail: "10% loyalty on F&B (₹85)" },
  { id: "al3", at: "Today 10:05", actor: "System", action: "Posted nightly room charge", detail: "Deluxe · ₹10,030 incl. CGST 9% + SGST 9%" },
  { id: "al4", at: "Yesterday 19:14", actor: "Joseph D.", action: "Added F&B order", detail: "Spa — Couples massage ₹5,310 (SAC 9972)" },
  { id: "al5", at: "Yesterday 16:50", actor: "Khalid R.", action: "Payment received", detail: "UPI ₹15,000 · GPay txn 240523AB142" },
  { id: "al6", at: "23 May 14:08", actor: "System", action: "Folio opened on check-in", detail: "Initial opening balance ₹0 · e-Invoice IRN generated" },
];

const NOTES = {
  internal: [
    { id: "ni1", at: "Today 11:00", actor: "Maria L.", text: "Pillow preference: extra firm. Forwarded to HK." },
    { id: "ni2", at: "Yesterday 09:30", actor: "Tom W.", text: "Approved 10% discount on F&B per loyalty review." },
  ],
  guest: [
    { id: "ng1", at: "Today 12:00", text: "Late checkout granted until 14:00 — no charge." },
  ],
};

export default function FolioDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const name = hotelName(useProperty());
  const branding = useBranding();
  // Real booking from Postgres (falls back to the seed only while offline / not found).
  const [liveRes, setLiveRes] = React.useState<typeof RESERVATIONS[number] | null>(null);
  const reservation = liveRes ?? RESERVATIONS.find(r => r.bookingNo === id) ?? RESERVATIONS[0];
  const mockGuest = GUESTS.find(g => g.name === reservation.guestName);
  // Live guest from Postgres (overlays the seed so KYC fields reflect the DB).
  const [liveGuest, setLiveGuest] = React.useState<{ id: number; name: string; idType?: string; idNumber?: string; nationality?: string; vip?: boolean; kycVerified?: boolean; kycVerifiedAt?: string; kycVerifiedBy?: string } | null>(null);
  const guest = (liveGuest ? { ...mockGuest, ...liveGuest } : mockGuest) as
    (Omit<NonNullable<typeof mockGuest>, "id"> & { id?: string | number; kycVerified?: boolean; kycVerifiedAt?: string; kycVerifiedBy?: string }) | undefined;

  const [tab, setTab] = React.useState<TabId>("overview");
  const [groupByDay, setGroupByDay] = React.useState(true);
  const [showPrint, setShowPrint] = React.useState(false);
  const [showEmail, setShowEmail] = React.useState(false);
  const [showAddCharge, setShowAddCharge] = React.useState(false);
  const [showPay, setShowPay] = React.useState(false);
  const [showDiscount, setShowDiscount] = React.useState(false);
  const [showRefund, setShowRefund] = React.useState(false);
  const [showQR, setShowQR] = React.useState(false);
  const [showEditSplits, setShowEditSplits] = React.useState(false);
  const [editingRule, setEditingRule] = React.useState<{ idx: number; label: string; detail: string } | null>(null);
  const [voidCharge, setVoidCharge] = React.useState<typeof SAMPLE_FOLIO_CHARGES[number] | null>(null);
  const [toast, setToast] = React.useState<string | null>(null);

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2400); };

  // Live state for editable lists
  const [charges, setCharges] = React.useState(SAMPLE_FOLIO_CHARGES);
  const [voidedIds, setVoidedIds] = React.useState<Set<string>>(new Set());
  const [payments, setPayments] = React.useState(SAMPLE_PAYMENTS);
  const [adjustments, setAdjustments] = React.useState<Adjustment[]>([]);
  const [einvoice, setEinvoice] = React.useState<{ irn?: string; ackNo?: string; ackDate?: string; status?: string; placeOfSupply?: string; recipientGstin?: string; reverseCharge?: boolean; signedJson?: unknown } | null>(null);
  const [showAddAdjustment, setShowAddAdjustment] = React.useState(false);
  const [showVerifyKyc, setShowVerifyKyc] = React.useState(false);
  const [internalNotes, setInternalNotes] = React.useState(NOTES.internal);
  const [noteDraft, setNoteDraft] = React.useState("");

  // Load this booking + its folio (charges + payments) from Postgres.
  React.useEffect(() => {
    let cancelled = false;
    const q = `?bookingNo=${encodeURIComponent(id)}`;
    apiGet<typeof RESERVATIONS>("/bookings")
      .then(rows => { if (!cancelled) { const b = rows.find(r => r.bookingNo === id); if (b) setLiveRes(b); } }).catch(() => {});
    apiGet<typeof SAMPLE_FOLIO_CHARGES>(`/folio-charges${q}`)
      .then(rows => { if (!cancelled) setCharges(rows); }).catch(() => {});
    apiGet<typeof SAMPLE_PAYMENTS>(`/folio-payments${q}`)
      .then(rows => { if (!cancelled) setPayments(rows); }).catch(() => {});
    apiGet<Adjustment[]>(`/folio-adjustments${q}`)
      .then(rows => { if (!cancelled) setAdjustments(rows); }).catch(() => {});
    apiGet<NonNullable<typeof einvoice>[]>(`/einvoices${q}`)
      .then(rows => { if (!cancelled && rows.length) setEinvoice(rows[0]); }).catch(() => {});
    apiGet<NonNullable<typeof liveGuest>[]>("/guests")
      .then(rows => {
        if (cancelled) return;
        const target = (liveRes?.guestName ?? reservation.guestName);
        const g = rows.find(x => x.name === target);
        if (g) setLiveGuest(g);
      }).catch(() => {});
    return () => { cancelled = true; };
  }, [id]);

  const liveCharges = charges.filter(c => !voidedIds.has(c.id));
  const chargesSubtotal = liveCharges.reduce((s, c) => s + (c.amount - c.tax), 0);
  const chargesTax = liveCharges.reduce((s, c) => s + c.tax, 0);
  const chargesTotal = liveCharges.reduce((s, c) => s + c.amount, 0);
  const mergedAdjustments = adjustments;

  // Indian GST split — intra-state (Maharashtra → Maharashtra) uses CGST+SGST,
  // inter-state / foreign uses IGST. Demo logic: foreign nationals trigger IGST.
  const isForeign = guest ? guest.nationality !== "India" : false;
  const interState = isForeign; // demo; in real system based on place-of-supply
  const cgst = interState ? 0 : chargesTax / 2;
  const sgst = interState ? 0 : chargesTax / 2;
  const igst = interState ? chargesTax : 0;
  // Indian e-Invoice IRN (mock — real one is 64-char SHA256 hash)
  // Deterministic so SSR matches client render
  const eInvoiceGenerated = einvoice?.status === "generated";
  const eInvoiceIrn = einvoice?.irn ?? "";
  const eInvoiceAckNo = einvoice?.ackNo ?? "";
  // Persist a generated e-Invoice (IRN/ACK computed server-side from the real folio totals).
  const generateEInvoice = () => {
    apiPost<NonNullable<typeof einvoice>>(`/einvoices/generate/${reservation.bookingNo}`, {
      taxableValue: chargesSubtotal, cgst, sgst, igst,
      placeOfSupply: interState ? "Inter-state" : "Maharashtra (27)",
      recipientGstin: null, reverseCharge: false,
    }).then(row => { setEinvoice(row); showToast("e-Invoice generated"); })
      .catch(() => showToast("⚠ Could not generate e-Invoice"));
  };
  const adjustmentsTotal = mergedAdjustments.reduce((s, a) => s + a.amount, 0);
  const grandTotal = chargesTotal + adjustmentsTotal;
  const paymentsTotal = payments.reduce((s, p) => s + p.amount, 0);
  const balance = grandTotal - paymentsTotal;

  // Charges grouped by day
  const byDay = liveCharges.reduce<Record<string, typeof liveCharges>>((acc, c) => {
    (acc[c.date] ??= []).push(c);
    return acc;
  }, {});

  // Charges grouped by category — for pie/summary
  const byType = liveCharges.reduce<Record<string, number>>((acc, c) => {
    acc[c.type] = (acc[c.type] ?? 0) + c.amount;
    return acc;
  }, {});

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5" id="folio-root">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground no-print">
        <Link href="/folio" className="hover:text-foreground inline-flex items-center gap-1">
          <ChevronLeft className="h-3.5 w-3.5" />Folios
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground font-medium tabular">{reservation.bookingNo}</span>
        <span>·</span>
        <span>{reservation.guestName}</span>
      </div>

      {/* ============ HEADER — Invoice-style ============ */}
      <Card className="p-0 overflow-hidden">
        {/* Top strip: hotel brand + invoice meta */}
        <div className="px-6 py-4 bg-linear-to-r from-brand-soft/40 via-surface to-accent-soft/30 border-b border-border flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            {branding.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={branding.logoUrl} alt={name} className="h-10 w-auto max-w-[140px] object-contain" />
            ) : (
              <span className="h-10 w-10 rounded-md bg-brand text-brand-foreground flex items-center justify-center shadow-md">
                <Sparkles className="h-5 w-5" />
              </span>
            )}
            <div>
              <p className="font-display text-lg font-medium tracking-tight">{name}</p>
              {branding.letterhead
                ? <p className="text-[11px] text-muted-foreground whitespace-pre-line">{branding.letterhead}</p>
                : <p className="text-[11px] text-muted-foreground">Main Tower · MG Road, Bandra West, Mumbai 400050 · GSTIN <span className="font-medium text-foreground tabular">27AAACR5055K1Z5</span> · PAN AAACR5055K</p>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">Folio / Invoice</p>
            <p className="text-base font-semibold tabular tracking-tight mt-0.5">INV-{reservation.bookingNo}</p>
            <p className="text-[10px] text-muted-foreground tabular mt-0.5">Issued {formatDateLong(new Date())}</p>
          </div>
        </div>

        {/* Guest + stay + status */}
        <div className="px-6 py-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Guest panel */}
            <div className="lg:col-span-1">
              <div className="flex items-start gap-3">
                <Avatar name={reservation.guestName} size={52} vip={reservation.vip} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-lg font-semibold truncate">{reservation.guestName}</h1>
                    {reservation.vip && <Badge tone="brand"><Crown className="h-3 w-3" />VIP</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground tabular mt-0.5">Guest #{guest?.id != null ? String(guest.id).toUpperCase() : "—"}</p>
                </div>
              </div>
              <dl className="mt-3 space-y-1 text-xs">
                {guest && <>
                  <dd className="inline-flex items-center gap-1.5 text-muted-foreground"><Phone className="h-3 w-3" />{guest.phone}</dd>
                  <br />
                  <dd className="inline-flex items-center gap-1.5 text-muted-foreground"><Mail className="h-3 w-3" />{guest.email}</dd>
                  <br />
                  <dd className="inline-flex items-center gap-1.5 text-muted-foreground"><Globe2 className="h-3 w-3" />{guest.nationality}</dd>
                  <br />
                  <dd className="inline-flex items-center gap-1.5 text-muted-foreground"><IdCard className="h-3 w-3" />{guest.idType} {guest.idNumber}</dd>
                  {guest.vip && <>
                    <br />
                    <dd className="inline-flex items-center gap-1.5 text-muted-foreground"><Building2 className="h-3 w-3" />Pearl Holdings LLC · GST 100123456700003</dd>
                  </>}
                </>}
              </dl>
            </div>

            {/* Stay panel */}
            <div className="lg:col-span-1 border-l border-border pl-5">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-3">Stay Details</p>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <StayItem icon={Hash} label="Booking #" value={reservation.bookingNo} />
                <StayItem icon={BedDouble} label="Room" value={`${reservation.roomNumber} · ${reservation.roomType}`} />
                <StayItem icon={Calendar} label="Check-in" value={formatDate(reservation.checkIn)} />
                <StayItem icon={Calendar} label="Check-out" value={formatDate(reservation.checkOut)} />
                <StayItem icon={Calendar} label="Nights" value={`${reservation.nights}`} />
                <StayItem icon={ActivityIcon} label="Source" value={reservation.source} />
                <StayItem icon={Sparkles} label="Rate Plan" value={reservation.ratePlan} />
                <StayItem icon={CheckCircle2} label="Pax" value={`${reservation.adults}A${reservation.children ? ` + ${reservation.children}C` : ""}`} />
              </dl>
            </div>

            {/* Totals & status */}
            <div className="lg:col-span-1 border-l border-border pl-5">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-3 flex items-center justify-between">
                <span>Account Summary</span>
                <PaymentBadge status={reservation.paymentStatus} />
              </p>
              <div className="space-y-2 text-sm">
                <TotalRow k="Taxable Value" v={money(chargesSubtotal)} muted />
                {interState ? (
                  <TotalRow k="IGST @ 18%" v={money(igst)} muted />
                ) : (
                  <>
                    <TotalRow k="CGST @ 9%" v={money(cgst)} muted />
                    <TotalRow k="SGST @ 9%" v={money(sgst)} muted />
                  </>
                )}
                {adjustmentsTotal !== 0 && <TotalRow k="Adjustments" v={money(adjustmentsTotal)} muted tone={adjustmentsTotal < 0 ? "success" : undefined} />}
                <div className="border-t border-border pt-2">
                  <TotalRow k={<span className="font-semibold">Grand Total</span>} v={<span className="font-semibold tabular text-base">{money(grandTotal)}</span>} />
                </div>
                <TotalRow k="Paid" v={money(paymentsTotal)} tone="success" />
                <div className="border-t border-border pt-2">
                  <TotalRow
                    k={<span className="font-semibold">{balance > 0 ? "Balance Due" : balance < 0 ? "Refund Due" : "Settled"}</span>}
                    v={<span className={cn("font-bold tabular text-lg",
                      balance > 0 ? "text-warning" : balance < 0 ? "text-info" : "text-success"
                    )}>{money(Math.abs(balance))}</span>}
                  />
                </div>
              </div>
              {balance === 0 && (
                <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-success bg-success-soft px-2.5 py-1 rounded-full">
                  <CheckCircle2 className="h-3 w-3" />Paid in Full
                </div>
              )}
            </div>
          </div>

          {/* Action bar */}
          <div className="mt-5 pt-5 border-t border-border flex flex-wrap gap-2 no-print">
            <Button onClick={() => setShowAddCharge(true)}><Plus className="h-4 w-4" />Add Charge</Button>
            <Button variant="secondary" onClick={() => setShowPay(true)}><CreditCard className="h-4 w-4" />Receive Payment</Button>
            <Button variant="outline" onClick={() => setTab("split")}><Split className="h-4 w-4" />Split Billing</Button>
            <Button variant="outline" onClick={() => setShowDiscount(true)}><Percent className="h-4 w-4" />Discount</Button>
            <Button variant="outline" onClick={() => setShowRefund(true)} disabled={paymentsTotal === 0}>
              <RotateCcw className="h-4 w-4" />Refund
            </Button>
            <div className="flex-1" />
            <Button variant="outline" onClick={() => setShowPrint(true)}><Printer className="h-4 w-4" />Print</Button>
            <Button variant="outline" onClick={() => { window.print(); showToast("Print dialog opened — choose Save as PDF"); }}><Download className="h-4 w-4" />PDF</Button>
            <Button variant="outline" onClick={() => setShowEmail(true)}><Send className="h-4 w-4" />Email</Button>
            <Link href={`/checkout/${reservation.bookingNo}`}>
              <Button variant="success">Checkout<ArrowRight className="h-4 w-4" /></Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* ============ TABS ============ */}
      <div className="border-b border-border flex items-center gap-1 overflow-x-auto no-print">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
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

      {/* ============ OVERVIEW TAB ============ */}
      {tab === "overview" && (
        <div className="space-y-5">
          {/* KPI strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MiniStat icon={BedDouble} label="Room nights" value={`${reservation.nights}`} hint={`${money(charges.filter(c => c.type === "Room").reduce((s, c) => s + c.amount, 0) / reservation.nights)} avg/night`} tone="brand" />
            <MiniStat icon={TrendingUp} label="Avg / day" value={money(chargesTotal / reservation.nights)} hint="All charges" tone="accent" />
            <MiniStat icon={FileText} label="Line items" value={`${charges.length}`} hint={`${Object.keys(byType).length} categories`} tone="info" />
            <MiniStat icon={Wallet} label="Last payment" value={payments.length ? money(payments[payments.length - 1].amount) : "—"} hint={payments.length ? payments[payments.length - 1].mode : ""} tone="success" />
          </div>

          {/* Category breakdown */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <CardTitle>Charges by Category</CardTitle>
              <Badge tone="neutral">{Object.keys(byType).length} types</Badge>
            </div>
            <div className="space-y-2">
              {Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([type, total]) => {
                const tone = TYPE_TONE[type as keyof typeof TYPE_TONE] ?? "neutral";
                return (
                  <div key={type} className="flex items-center gap-3">
                    <span className={cn(
                      "min-w-[80px] text-xs font-medium px-2 py-1 rounded-full",
                      tone === "brand" && "bg-brand-soft text-brand-soft-foreground",
                      tone === "accent" && "bg-accent-soft text-accent",
                      tone === "info" && "bg-info-soft text-info",
                      tone === "warning" && "bg-warning-soft text-warning",
                      tone === "neutral" && "bg-surface-sunken text-muted-foreground",
                    )}>{type}</span>
                    <div className="flex-1 h-2 bg-surface-sunken rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full transition-all duration-700",
                          tone === "brand" && "bg-brand",
                          tone === "accent" && "bg-accent",
                          tone === "info" && "bg-info",
                          tone === "warning" && "bg-warning",
                          tone === "neutral" && "bg-muted-foreground",
                        )}
                        style={{ width: `${(total / chargesTotal) * 100}%` }}
                      />
                    </div>
                    <span className="tabular font-medium text-sm w-24 text-right">{money(total)}</span>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Adjustments & Comps — live from /folio-adjustments */}
          <Card className="p-0 overflow-hidden">
            <div className="px-5 py-3 bg-surface-elevated border-b border-border flex items-center justify-between">
              <CardTitle>Adjustments &amp; Comps</CardTitle>
              <div className="flex items-center gap-2">
                {adjustmentsTotal !== 0 && <Badge tone="success">{money(Math.abs(adjustmentsTotal))} off</Badge>}
                <Button size="sm" variant="outline" onClick={() => setShowAddAdjustment(true)}>
                  <Plus className="h-3.5 w-3.5" />Add
                </Button>
              </div>
            </div>
            {mergedAdjustments.length === 0 ? (
              <p className="px-5 py-4 text-sm text-muted-foreground">No comps or adjustments on this folio.</p>
            ) : (
              <ul className="divide-y divide-border">
                {mergedAdjustments.map(a => (
                  <li key={a.id} className="px-5 py-3 flex items-center gap-3">
                    <span className="h-8 w-8 rounded-md bg-success-soft text-success flex items-center justify-center shrink-0">
                      {a.type === "Discount" ? <Percent className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{a.description}</p>
                      <p className="text-xs text-muted-foreground">{a.approver} · {formatDate(a.date)}</p>
                    </div>
                    <span className="tabular font-semibold text-success">{money(a.amount)}</span>
                    <button
                      type="button"
                      aria-label="Remove adjustment"
                      className="text-muted-foreground hover:text-danger shrink-0"
                      onClick={() => {
                        apiDelete(`/folio-adjustments/${a.id}`)
                          .then(() => setAdjustments(prev => prev.filter(x => x.id !== a.id)))
                          .catch(() => showToast("Could not remove"));
                      }}
                    ><X className="h-4 w-4" /></button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* India compliance — e-Invoice IRN + Form C for foreign guests */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">GST · e-Invoice</p>
                  <CardTitle>e-Invoice Compliance</CardTitle>
                </div>
                {eInvoiceGenerated
                  ? <Badge tone="success"><CheckCircle2 className="h-3 w-3" />Generated</Badge>
                  : <Badge tone="warning"><AlertCircle className="h-3 w-3" />Not generated</Badge>}
              </div>
              <dl className="space-y-2 text-sm">
                <ComplianceRow k="IRN" v={eInvoiceIrn ? <span className="font-mono text-[11px] tabular break-all">{eInvoiceIrn.slice(0, 20)}…</span> : "—"} />
                <ComplianceRow k="ACK No." v={<span className="font-mono tabular">{eInvoiceAckNo || "—"}</span>} />
                <ComplianceRow k="ACK Date" v={einvoice?.ackDate || "—"} />
                <ComplianceRow k="Place of Supply" v={einvoice?.placeOfSupply ?? (interState ? "Inter-state · IGST" : "Maharashtra (27) · CGST + SGST")} />
                <ComplianceRow k="Recipient GSTIN" v={einvoice?.recipientGstin ? <span className="font-mono tabular">{einvoice.recipientGstin}</span> : <span className="text-muted-foreground italic">URP (Unregistered)</span>} />
                <ComplianceRow k="Reverse Charge" v={einvoice?.reverseCharge ? "Yes" : "No"} />
              </dl>
              <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-2">
                {!eInvoiceGenerated && (
                  <Button size="sm" variant="success" onClick={generateEInvoice}>
                    <Sparkles className="h-3.5 w-3.5" />Generate e-Invoice
                  </Button>
                )}
                <Button size="sm" variant="outline" disabled={!eInvoiceGenerated} onClick={() => {
                  const payload = einvoice?.signedJson ?? {
                    Irn: eInvoiceIrn, AckNo: eInvoiceAckNo, DocNo: `INV-${reservation.bookingNo}`, TotInvVal: grandTotal,
                  };
                  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url; a.download = `e-invoice-${reservation.bookingNo}.json`; a.click();
                  URL.revokeObjectURL(url);
                  showToast("Signed e-Invoice JSON downloaded");
                }}>
                  <Download className="h-3.5 w-3.5" />Download Signed JSON
                </Button>
                <Button size="sm" variant="ghost" disabled={!eInvoiceGenerated} onClick={() => setShowQR(true)}>
                  View QR Code
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-3">Locally generated — not NIC-issued. Connect a GST Suvidha Provider for live IRNs.</p>
            </Card>

            {/* Form C for foreign guests */}
            {isForeign ? (
              <Card className="p-5 border-l-4 border-l-warning">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">Foreigner Registration · FRRO</p>
                    <CardTitle>Form C Status</CardTitle>
                  </div>
                  <Badge tone="success"><CheckCircle2 className="h-3 w-3" />Filed</Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  As per Section 14 of the Foreigners Act, 1946 — all foreign nationals staying at hotels must be reported to the FRRO within 24 hours of arrival.
                </p>
                <dl className="space-y-2 text-sm">
                  <ComplianceRow k="Form C Reference" v={<span className="font-mono tabular">FCR/MUM/2026/{reservation.bookingNo.slice(-5)}</span>} />
                  <ComplianceRow k="Filed At" v="23 May 2026, 14:18 (auto)" />
                  <ComplianceRow k="Nationality" v={guest?.nationality ?? "—"} />
                  <ComplianceRow k="Visa Type" v="Tourist (e-Visa)" />
                  <ComplianceRow k="Port of Arrival" v="BOM · Mumbai" />
                  <ComplianceRow k="Submitted To" v="FRRO Mumbai · indianfrro.gov.in" />
                </dl>
                <div className="mt-3 pt-3 border-t border-border flex gap-2">
                  <Button size="sm" variant="outline"><Download className="h-3.5 w-3.5" />Receipt</Button>
                  <Button size="sm" variant="ghost">Edit & Resubmit</Button>
                </div>
              </Card>
            ) : (
              <Card className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">Guest KYC</p>
                    <CardTitle>{guest?.kycVerified ? "Identification Verified" : "Identification Pending"}</CardTitle>
                  </div>
                  {guest?.kycVerified
                    ? <Badge tone="success"><ShieldCheck className="h-3 w-3" />Verified</Badge>
                    : <Badge tone="warning"><AlertCircle className="h-3 w-3" />Pending</Badge>}
                </div>
                <dl className="space-y-2 text-sm">
                  <ComplianceRow k="ID Type" v={guest?.idType || "—"} />
                  <ComplianceRow k="ID Number" v={<span className="font-mono tabular">{guest?.idNumber || "—"}</span>} />
                  <ComplianceRow k="Verified On" v={guest?.kycVerifiedAt || "—"} />
                  <ComplianceRow k="Hotel Register" v={<span className="font-mono tabular">HRR-2026-{reservation.bookingNo.slice(-5)}</span>} />
                </dl>
                {guest?.id != null && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <Button size="sm" variant={guest?.kycVerified ? "outline" : "success"} onClick={() => setShowVerifyKyc(true)}>
                      <ShieldCheck className="h-3.5 w-3.5" />{guest?.kycVerified ? "Re-verify KYC" : "Verify KYC"}
                    </Button>
                  </div>
                )}
                <p className="text-[11px] text-muted-foreground mt-3 pt-3 border-t border-border">
                  As required under the Hotel Register Rules. Indian nationals require Aadhaar / PAN / Driving License / Passport / Voter ID.
                </p>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ============ CHARGES TAB ============ */}
      {tab === "charges" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{charges.length} line items · grouped by {groupByDay ? "day" : "category"}</p>
            <div className="inline-flex border border-border rounded-md overflow-hidden">
              <button
                type="button"
                onClick={() => setGroupByDay(true)}
                className={cn("px-3 py-1.5 text-xs font-medium transition-colors", groupByDay ? "bg-brand text-brand-foreground" : "hover:bg-surface-sunken")}
              >By day</button>
              <button
                type="button"
                onClick={() => setGroupByDay(false)}
                className={cn("px-3 py-1.5 text-xs font-medium border-l border-border transition-colors", !groupByDay ? "bg-brand text-brand-foreground" : "hover:bg-surface-sunken")}
              >Flat list</button>
            </div>
          </div>

          {groupByDay ? (
            Object.entries(byDay).sort().map(([date, list]) => {
              const dayTotal = list.reduce((s, c) => s + c.amount, 0);
              return (
                <Card key={date} className="p-0 overflow-hidden">
                  <div className="px-5 py-3 bg-surface-elevated border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <p className="font-semibold text-sm">{formatDateLong(date)}</p>
                      <Badge tone="neutral">{list.length} items</Badge>
                    </div>
                    <p className="text-sm font-semibold tabular">{money(dayTotal)}</p>
                  </div>
                  <ChargesTable charges={list} voidedIds={voidedIds} onVoid={(c) => setVoidCharge(c)} />
                </Card>
              );
            })
          ) : (
            <Card className="p-0 overflow-hidden">
              <ChargesTable charges={liveCharges} voidedIds={voidedIds} onVoid={(c) => setVoidCharge(c)} />
            </Card>
          )}

          {/* Totals footer */}
          <Card className="p-5">
            <dl className="space-y-2 text-sm max-w-md ml-auto">
              <TotalRow k="Taxable Value (pre-GST)" v={money(chargesSubtotal)} muted />
              {interState ? (
                <TotalRow k="IGST @ 18%" v={money(igst)} muted />
              ) : (
                <>
                  <TotalRow k="CGST @ 9%" v={money(cgst)} muted />
                  <TotalRow k="SGST @ 9%" v={money(sgst)} muted />
                </>
              )}
              {adjustmentsTotal !== 0 && <TotalRow k="Adjustments / Comps" v={money(adjustmentsTotal)} tone="success" muted />}
              <div className="border-t border-border pt-2">
                <TotalRow k={<span className="font-semibold text-base">Grand Total</span>} v={<span className="font-bold tabular text-lg">{money(grandTotal)}</span>} />
              </div>
            </dl>
          </Card>
        </div>
      )}

      {/* ============ PAYMENTS TAB ============ */}
      {tab === "payments" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MiniStat icon={Wallet} label="Total Paid" value={money(paymentsTotal)} tone="success" />
            <MiniStat icon={Hash} label="Payments" value={`${payments.length}`} tone="info" />
            <MiniStat icon={CreditCard} label="Modes Used" value={`${new Set(payments.map(p => p.mode)).size}`} tone="brand" />
            <MiniStat icon={AlertCircle} label={balance > 0 ? "Balance Due" : "Refund Due"} value={money(Math.abs(balance))} tone={balance > 0 ? "warning" : balance < 0 ? "info" : "success"} />
          </div>

          <Card className="p-0 overflow-hidden">
            <div className="px-5 py-3 bg-surface-elevated border-b border-border flex items-center justify-between">
              <CardTitle>Payment History</CardTitle>
              <Button size="sm" onClick={() => setShowPay(true)}><Plus className="h-3.5 w-3.5" />Receive Payment</Button>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-surface-sunken/50 border-b border-border">
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-2.5 font-semibold">Date</th>
                  <th className="px-5 py-2.5 font-semibold">Mode</th>
                  <th className="px-5 py-2.5 font-semibold">Reference</th>
                  <th className="px-5 py-2.5 font-semibold text-right">Amount</th>
                  <th className="px-5 py-2.5 font-semibold text-right">Running Balance</th>
                  <th></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(() => {
                  let running = grandTotal;
                  return payments.map(p => {
                    running -= p.amount;
                    return (
                      <tr key={p.id} className="hover:bg-surface-sunken/40">
                        <td className="px-5 py-3 text-muted-foreground tabular">{formatDate(p.date)}</td>
                        <td className="px-5 py-3"><Badge tone={p.mode === "Cash" ? "success" : p.mode === "Card" ? "info" : "neutral"}>{p.mode}</Badge></td>
                        <td className="px-5 py-3 text-muted-foreground text-xs">{p.reference}</td>
                        <td className="px-5 py-3 text-right tabular font-medium text-success">{money(p.amount)}</td>
                        <td className="px-5 py-3 text-right tabular text-muted-foreground">{money(running)}</td>
                        <td className="px-5 py-3 text-right">
                          <button type="button" className="text-muted-foreground hover:text-foreground" title="Receipt">
                            <Printer className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  });
                })()}
                {payments.length === 0 && (
                  <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-muted-foreground">No payments yet</td></tr>
                )}
              </tbody>
              <tfoot className="bg-surface-elevated border-t border-border">
                <tr>
                  <td colSpan={3} className="px-5 py-3 text-right text-xs uppercase tracking-wider font-semibold text-muted-foreground">Total Received</td>
                  <td className="px-5 py-3 text-right tabular font-semibold">{money(paymentsTotal)}</td>
                  <td className="px-5 py-3 text-right tabular font-bold text-warning">{money(balance)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </Card>
        </div>
      )}

      {/* ============ SPLIT BILLING TAB ============ */}
      {tab === "split" && (
        <div className="space-y-4">
          <Card className="p-4 border-l-4 border-l-brand">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-brand shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">Split charges across multiple folios</p>
                <p className="text-xs text-muted-foreground mt-0.5">Route specific items to agents, companies, or separate guest folios. Useful for corporate stays, travel agent bookings, or shared rooms.</p>
              </div>
              <Button size="sm" onClick={() => setShowEditSplits(true)}>Edit Splits</Button>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <SplitCard label="Master Folio" subtitle="Group totals" amount={chargesTotal * 0.7} icon={FileBarChart} tone="brand" />
            <SplitCard label="Guest Folio" subtitle="Incidentals & extras" amount={chargesTotal * 0.18} icon={CreditCard} tone="info" />
            <SplitCard label="Agent Folio — Pearl Holidays" subtitle="Room nights" amount={chargesTotal * 0.55} icon={Building2} tone="accent" />
            <SplitCard label="Company Folio — TechCorp" subtitle="Pre-approved" amount={0} icon={Building2} tone="neutral" empty />
            <SplitCard label="Extras Folio" subtitle="Spa, laundry" amount={chargesTotal * 0.12} icon={Sparkles} tone="warning" />
          </div>

          <Card className="p-0 overflow-hidden">
            <div className="px-5 py-3 bg-surface-elevated border-b border-border">
              <CardTitle>Routing Rules</CardTitle>
            </div>
            <ul className="divide-y divide-border">
              {[
                { label: "Room charges → Agent (Pearl Holidays)", detail: "All room nights and breakfast" },
                { label: "F&B charges → Guest folio", detail: "Including minibar and room service" },
                { label: "Spa & wellness → Guest folio", detail: "Personal items" },
                { label: "Taxes → Per folio (proportional)", detail: "VAT split based on charges share" },
              ].map((r, i) => (
                <li key={i} className="px-5 py-3 flex items-center gap-3">
                  <span className="h-7 w-7 rounded-md bg-brand-soft text-brand-soft-foreground flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{r.label}</p>
                    <p className="text-xs text-muted-foreground">{r.detail}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setEditingRule({ idx: i, label: r.label, detail: r.detail })}>Edit</Button>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      {/* ============ NOTES & AUDIT TAB ============ */}
      {tab === "audit" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Notes */}
          <div className="space-y-4">
            <Card className="p-5">
              <div className="flex items-center justify-between mb-3">
                <CardTitle>Internal Notes</CardTitle>
                <Badge tone="warning">Staff only</Badge>
              </div>
              <ul className="space-y-2.5">
                {internalNotes.map(n => (
                  <li key={n.id} className="p-3 rounded-md bg-warning-soft/40 border border-warning/30">
                    <p className="text-sm">{n.text}</p>
                    <p className="text-[10px] text-muted-foreground mt-1.5 tabular">{n.at} · {n.actor}</p>
                  </li>
                ))}
              </ul>
              <div className="mt-3 pt-3 border-t border-border">
                <textarea
                  rows={2}
                  value={noteDraft}
                  onChange={e => setNoteDraft(e.target.value)}
                  placeholder="Add an internal note (not visible to guest)…"
                  className="w-full px-3 py-2 rounded-md border border-border bg-surface text-sm placeholder:text-subtle-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 outline-hidden resize-none"
                />
                <div className="mt-2 flex justify-end">
                  <Button size="sm" disabled={!noteDraft.trim()} onClick={() => {
                    const at = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
                    setInternalNotes(prev => [
                      { id: `ni-${Date.now().toString(36)}`, at: `Today ${at}`, actor: "Khalid R.", text: noteDraft.trim() },
                      ...prev,
                    ]);
                    setNoteDraft("");
                    showToast("Internal note saved");
                  }}>Save Note</Button>
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between mb-3">
                <CardTitle>Guest-Visible Notes</CardTitle>
                <Badge tone="info">Printed on invoice</Badge>
              </div>
              <ul className="space-y-2.5">
                {NOTES.guest.map(n => (
                  <li key={n.id} className="p-3 rounded-md bg-info-soft/40 border border-info/30">
                    <p className="text-sm">{n.text}</p>
                    <p className="text-[10px] text-muted-foreground mt-1.5 tabular">{n.at}</p>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          {/* Audit log */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <CardTitle className="inline-flex items-center gap-1.5"><Activity className="h-4 w-4 text-brand" />Audit Trail</CardTitle>
              <Badge tone="neutral"><ShieldCheck className="h-3 w-3" />Tamper-proof</Badge>
            </div>
            <ol className="relative space-y-3">
              <div className="absolute left-2 top-1 bottom-1 w-px bg-border" />
              {AUDIT_LOG.map(a => (
                <li key={a.id} className="relative pl-7">
                  <span className="absolute left-0 top-1.5 h-4 w-4 rounded-full bg-surface border-2 border-brand flex items-center justify-center">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                  </span>
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm">
                      <span className="font-medium">{a.actor}</span>{" "}
                      <span className="text-muted-foreground">{a.action.toLowerCase()}</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground tabular shrink-0">{a.at}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{a.detail}</p>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      )}

      {/* ============ MODALS ============ */}
      {showPrint && <PrintModal onClose={() => setShowPrint(false)} onPrint={() => { setShowPrint(false); window.print(); }} reservation={reservation} grandTotal={grandTotal} paymentsTotal={paymentsTotal} balance={balance} chargesSubtotal={chargesSubtotal} chargesTax={chargesTax} />}
      {showEmail && <EmailModal onClose={() => setShowEmail(false)} onSend={() => { setShowEmail(false); showToast("Invoice email sent to guest"); }} reservation={reservation} guestEmail={guest?.email ?? ""} grandTotal={grandTotal} />}
      {showAddCharge && <AddChargeModal onClose={() => setShowAddCharge(false)} onSave={(c) => {
        const payload = { bookingNo: id, date: new Date().toISOString().slice(0, 10), ...c };
        setShowAddCharge(false);
        showToast(`Charge added: ${c.description} · ${money(c.amount)}`);
        apiPost<typeof SAMPLE_FOLIO_CHARGES[number]>("/folio-charges", payload)
          .then(created => setCharges(prev => [...prev, created]))
          .catch(() => showToast("⚠ Save failed — backend offline"));
      }} />}
      {showPay && <PaymentModal onClose={() => setShowPay(false)} onSave={(amt, mode, reference) => {
        const payload = { bookingNo: id, date: new Date().toISOString().slice(0, 10), mode, amount: amt, reference: reference || "—" };
        setShowPay(false);
        showToast(`Payment of ${money(amt)} via ${mode} recorded`);
        apiPost<typeof SAMPLE_PAYMENTS[number]>("/folio-payments", payload)
          .then(created => setPayments(prev => [...prev, created]))
          .catch(() => showToast("⚠ Save failed — backend offline"));
      }} balance={balance} />}
      {showDiscount && <DiscountModal onClose={() => setShowDiscount(false)} chargesTotal={chargesTotal} onSave={(reason, amount, approver) => {
        setShowDiscount(false);
        showToast(`Discount applied: ${money(amount)} off · ${reason}`);
        // Persist as a negative folio line item so it survives a reload.
        apiPost<typeof SAMPLE_FOLIO_CHARGES[number]>("/folio-charges", {
          bookingNo: id,
          date: new Date().toISOString().slice(0, 10),
          description: `Discount — ${reason} (${approver})`,
          type: "Discount",
          qty: 1,
          rate: -Math.abs(amount),
          tax: 0,
          amount: -Math.abs(amount),
          paidBy: "Guest",
        }).then(created => setCharges(prev => [...prev, created])).catch(() => showToast("⚠ Save failed — backend offline"));
      }} />}
      {showVerifyKyc && guest?.id != null && <KycModal
        initialType={guest?.idType ?? ""} initialNumber={guest?.idNumber ?? ""}
        onClose={() => setShowVerifyKyc(false)}
        onSave={(idType, idNumber) => {
          setShowVerifyKyc(false);
          const at = new Date().toISOString().slice(0, 16).replace("T", " ");
          apiPut(`/guests/${guest.id}`, { idType, idNumber, kycVerified: true, kycVerifiedAt: at, kycVerifiedBy: "Front Desk" })
            .then(() => { setLiveGuest(prev => prev ? { ...prev, idType, idNumber, kycVerified: true, kycVerifiedAt: at, kycVerifiedBy: "Front Desk" } : prev); showToast("KYC verified"); })
            .catch(() => showToast("⚠ Could not verify — backend offline"));
        }} />}
      {showAddAdjustment && <AdjustmentModal onClose={() => setShowAddAdjustment(false)} onSave={(type, description, amount, approver) => {
        setShowAddAdjustment(false);
        apiPost<Adjustment>("/folio-adjustments", {
          bookingNo: id, date: new Date().toISOString().slice(0, 10),
          type, description, amount: -Math.abs(amount), approver,
        }).then(row => { setAdjustments(prev => [...prev, row]); showToast(`${type} added`); })
          .catch(() => showToast("⚠ Save failed — backend offline"));
      }} />}
      {showRefund && <RefundModal onClose={() => setShowRefund(false)} paymentsTotal={paymentsTotal} balance={balance} onSave={(amount, mode, reason, approver) => {
        const payload = { bookingNo: id, date: new Date().toISOString().slice(0, 10), mode: `${mode} (Refund)`, amount: -Math.abs(amount), reference: `Refund · ${reason} · ${approver}` };
        setShowRefund(false);
        showToast(`Refund issued: ${money(amount)} via ${mode}`);
        apiPost<typeof SAMPLE_PAYMENTS[number]>("/folio-payments", payload)
          .then(created => setPayments(prev => [...prev, created]))
          .catch(() => showToast("⚠ Save failed — backend offline"));
      }} />}
      {showQR && <QRCodeModal onClose={() => setShowQR(false)} irn={eInvoiceIrn} ackNo={eInvoiceAckNo} invoiceNo={`INV-${reservation.bookingNo}`} />}
      {showEditSplits && <EditSplitsModal onClose={() => setShowEditSplits(false)} onSave={() => { setShowEditSplits(false); showToast("Split rules saved"); }} />}
      {editingRule && <RuleEditModal rule={editingRule} onClose={() => setEditingRule(null)} onSave={() => { setEditingRule(null); showToast(`Routing rule updated`); }} />}
      {voidCharge && <VoidChargeModal charge={voidCharge} onClose={() => setVoidCharge(null)} onConfirm={(reason) => {
        const vc = voidCharge;
        setVoidedIds(prev => new Set([...prev, vc.id]));
        setVoidCharge(null);
        showToast(`Charge voided: ${vc.description} · ${reason}`);
        apiDelete(`/folio-charges/${vc.id}`).catch(() => showToast("⚠ Save failed — backend offline"));
      }} />}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-foreground text-background rounded-md px-4 py-2.5 text-sm shadow-lg animate-in inline-flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />{toast}
        </div>
      )}
    </div>
  );
}

const TYPE_TONE: Record<string, "brand" | "accent" | "info" | "warning" | "neutral"> = {
  Room: "brand",
  "F&B": "accent",
  Service: "info",
  Tax: "warning",
  Extra: "neutral",
  Discount: "neutral",
};

// ---------- Helpers ----------

function ComplianceRow({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm py-1 border-b border-border last:border-0">
      <dt className="text-xs text-muted-foreground shrink-0">{k}</dt>
      <dd className="text-right min-w-0 truncate">{v}</dd>
    </div>
  );
}

function StayItem({ icon: Icon, label, value }: { icon: typeof Phone; label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold inline-flex items-center gap-1">
        <Icon className="h-2.5 w-2.5" />{label}
      </dt>
      <dd className="text-sm font-medium mt-0.5 tabular">{value}</dd>
    </div>
  );
}

function TotalRow({ k, v, muted, tone }: { k: React.ReactNode; v: React.ReactNode; muted?: boolean; tone?: "success" | "warning" | "info" }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={cn("text-xs", muted ? "text-muted-foreground" : "text-foreground")}>{k}</span>
      <span className={cn("tabular text-sm",
        muted ? "text-muted-foreground" : "text-foreground font-medium",
        tone === "success" && "text-success",
        tone === "warning" && "text-warning",
        tone === "info" && "text-info",
      )}>{v}</span>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value, hint, tone }: {
  icon: typeof Phone; label: string; value: string; hint?: string;
  tone: "brand" | "accent" | "info" | "success" | "warning";
}) {
  const tones = {
    brand: "bg-brand-soft text-brand-soft-foreground",
    accent: "bg-accent-soft text-accent",
    info: "bg-info-soft text-info",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
  };
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
          <p className="text-xl font-semibold tabular mt-1 tracking-tight">{value}</p>
          {hint && <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>}
        </div>
        <span className={cn("h-8 w-8 rounded-md flex items-center justify-center shrink-0", tones[tone])}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
    </Card>
  );
}

function ChargesTable({ charges, voidedIds, onVoid }: {
  charges: typeof SAMPLE_FOLIO_CHARGES;
  voidedIds: Set<string>;
  onVoid: (c: typeof SAMPLE_FOLIO_CHARGES[number]) => void;
}) {
  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null);
  return (
    <table className="w-full text-sm">
      <thead className="bg-surface-sunken/50 border-b border-border">
        <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
          <th className="px-5 py-2.5 font-semibold">Description</th>
          <th className="px-5 py-2.5 font-semibold">Type</th>
          <th className="px-5 py-2.5 font-semibold text-right">Qty</th>
          <th className="px-5 py-2.5 font-semibold text-right">Rate</th>
          <th className="px-5 py-2.5 font-semibold text-right">Tax</th>
          <th className="px-5 py-2.5 font-semibold text-right">Amount</th>
          <th className="px-5 py-2.5 font-semibold">Paid by</th>
          <th></th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {charges.map(c => {
          const isVoid = voidedIds.has(c.id);
          return (
            <tr key={c.id} className={cn("hover:bg-surface-sunken/40", isVoid && "opacity-50 bg-danger-soft/10")}>
              <td className={cn("px-5 py-3", isVoid && "line-through")}>
                {c.description}
                {isVoid && <Badge tone="danger" className="ml-2">Voided</Badge>}
              </td>
              <td className="px-5 py-3"><Badge tone={TYPE_TONE[c.type] ?? "neutral"}>{c.type}</Badge></td>
              <td className="px-5 py-3 text-right tabular">{c.qty}</td>
              <td className="px-5 py-3 text-right tabular">{money(c.rate)}</td>
              <td className="px-5 py-3 text-right tabular text-muted-foreground">{money(c.tax)}</td>
              <td className={cn("px-5 py-3 text-right tabular font-medium", isVoid && "line-through")}>{money(c.amount)}</td>
              <td className="px-5 py-3"><Badge tone="neutral">{c.paidBy}</Badge></td>
              <td className="px-5 py-3 text-right relative">
                {!isVoid && (
                  <>
                    <button
                      type="button"
                      onClick={() => setOpenMenuId(openMenuId === c.id ? null : c.id)}
                      className="text-muted-foreground hover:text-foreground"
                      title="Charge actions"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                    {openMenuId === c.id && (
                      <>
                        <div className="fixed inset-0 z-30" onClick={() => setOpenMenuId(null)} />
                        <div className="absolute right-3 top-full mt-1 w-44 bg-surface border border-border rounded-md shadow-xl z-40 py-1 text-sm">
                          <button onClick={() => { onVoid(c); setOpenMenuId(null); }} className="w-full px-3 py-1.5 hover:bg-surface-sunken text-left inline-flex items-center gap-2 text-danger">
                            <X className="h-3.5 w-3.5" />Void / cancel charge
                          </button>
                        </div>
                      </>
                    )}
                  </>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function SplitCard({ label, subtitle, amount, icon: Icon, tone, empty }: {
  label: string; subtitle: string; amount: number; icon: typeof Phone;
  tone: "brand" | "accent" | "info" | "warning" | "neutral"; empty?: boolean;
}) {
  const tones = {
    brand: "border-l-brand bg-brand-soft/30",
    accent: "border-l-accent bg-accent-soft/30",
    info: "border-l-info bg-info-soft/30",
    warning: "border-l-warning bg-warning-soft/30",
    neutral: "border-l-border-strong",
  };
  return (
    <Card className={cn("p-4 border-l-4", tones[tone])}>
      <div className="flex items-start gap-2">
        <Icon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{label}</p>
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <p className={cn("mt-3 text-xl font-semibold tabular tracking-tight", empty && "text-muted-foreground")}>
        {money(amount)}
      </p>
    </Card>
  );
}

// ---------- MODALS ----------

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs animate-in" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 sm:p-6 pointer-events-none overflow-y-auto">
        <Card className={cn("pointer-events-auto w-full p-5 animate-in shadow-xl my-auto", wide ? "max-w-2xl" : "max-w-lg")}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">{title}</h3>
            <button type="button" onClick={onClose} className="h-8 w-8 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
          {children}
        </Card>
      </div>
    </>
  );
}

function PrintModal({ onClose, onPrint, reservation, grandTotal, paymentsTotal, balance, chargesSubtotal, chargesTax }: {
  onClose: () => void; onPrint: () => void;
  reservation: typeof RESERVATIONS[number]; grandTotal: number; paymentsTotal: number; balance: number; chargesSubtotal: number; chargesTax: number;
}) {
  const name = hotelName(useProperty());
  const branding = useBranding();
  return (
    <Modal title="Print / Export Invoice" onClose={onClose} wide>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Preview before printing or generating a PDF.</p>
        <div className="rounded-md border border-border p-5 bg-surface text-sm space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-display text-base font-medium">{name}</p>
              <p className="text-xs text-muted-foreground">Main Tower · MG Road, Bandra West, Mumbai 400050</p>
              <p className="text-[10px] text-muted-foreground tabular mt-0.5">GSTIN 27AAACR5055K1Z5 · PAN AAACR5055K · SAC 9963</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Tax Invoice · Original</p>
              <p className="font-semibold tabular">INV-{reservation.bookingNo}</p>
              <p className="text-[10px] text-muted-foreground tabular mt-0.5">e-Invoice IRN attached</p>
            </div>
          </div>
          <div className="border-t border-border pt-3">
            <p className="font-medium">{reservation.guestName}</p>
            <p className="text-xs text-muted-foreground">Room {reservation.roomNumber} · {reservation.roomType} · {reservation.nights}N · Place of Supply: Maharashtra (27)</p>
          </div>
          <div className="border-t border-border pt-3 space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Taxable Value</span><span className="tabular">{money(chargesSubtotal)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">CGST @ 9%</span><span className="tabular">{money(chargesTax / 2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">SGST @ 9%</span><span className="tabular">{money(chargesTax / 2)}</span></div>
            <div className="flex justify-between border-t border-border pt-1 mt-1"><span className="font-semibold">Grand Total</span><span className="font-bold tabular">{money(grandTotal)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Paid</span><span className="tabular text-success">{money(paymentsTotal)}</span></div>
            <div className="flex justify-between"><span className="font-semibold">{balance >= 0 ? "Balance Due" : "Refund Due"}</span><span className="font-bold tabular">{money(Math.abs(balance))}</span></div>
          </div>
          <p className="text-[10px] text-muted-foreground border-t border-border pt-2 italic whitespace-pre-line">
            {branding.invoiceFooter}
          </p>
        </div>
        <div className="flex justify-end gap-2 pt-3 border-t border-border">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="outline" onClick={() => { onClose(); window.print(); }}><Download className="h-4 w-4" />Download PDF</Button>
          <Button onClick={onPrint}><Printer className="h-4 w-4" />Print Now</Button>
        </div>
      </div>
    </Modal>
  );
}

function EmailModal({ onClose, onSend, reservation, guestEmail, grandTotal }: {
  onClose: () => void; onSend: () => void;
  reservation: typeof RESERVATIONS[number]; guestEmail: string; grandTotal: number;
}) {
  const name = hotelName(useProperty());
  const [to, setTo] = React.useState(guestEmail);
  const [subject, setSubject] = React.useState(`Your invoice for INV-${reservation.bookingNo} — ${name}`);
  const [channels, setChannels] = React.useState<string[]>(["email"]);
  const toggle = (c: string) => setChannels(v => v.includes(c) ? v.filter(x => x !== c) : [...v, c]);

  return (
    <Modal title="Send Invoice to Guest" onClose={onClose} wide>
      <div className="space-y-4">
        <div className="flex gap-1.5">
          {[
            { id: "email", label: "Email", icon: Mail },
            { id: "whatsapp", label: "WhatsApp", icon: MessageCircle },
            { id: "sms", label: "SMS", icon: Send },
          ].map(c => {
            const Icon = c.icon;
            const on = channels.includes(c.id);
            return (
              <button
                type="button"
                key={c.id}
                onClick={() => toggle(c.id)}
                className={cn(
                  "flex-1 h-10 rounded-md border text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors",
                  on ? "bg-brand text-brand-foreground border-brand" : "border-border hover:bg-surface-sunken"
                )}
              >
                <Icon className="h-3.5 w-3.5" />{c.label}
              </button>
            );
          })}
        </div>
        <div className="space-y-1.5">
          <Label>To</Label>
          <Input value={to} onChange={e => setTo(e.target.value)} placeholder="guest@example.com" type="email" />
        </div>
        <div className="space-y-1.5">
          <Label>Subject</Label>
          <Input value={subject} onChange={e => setSubject(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Message</Label>
          <textarea
            rows={4}
            defaultValue={`Dear ${reservation.guestName.split(" ")[0]},\n\nThank you for staying with us. Please find your invoice attached for your records.\n\nAmount: ${money(grandTotal)}\n\nWarm regards,\n${name}`}
            className="w-full px-3 py-2 rounded-md border border-border bg-surface text-sm placeholder:text-subtle-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 outline-hidden resize-none"
          />
        </div>
        <div className="rounded-md bg-surface-sunken p-3 text-xs text-muted-foreground inline-flex items-center gap-2">
          <ArrowDownToLine className="h-3.5 w-3.5" />
          PDF invoice attached automatically. Template: <span className="font-medium text-foreground ml-1">Tax Invoice — Premium</span>
        </div>
        <div className="flex justify-end gap-2 pt-3 border-t border-border">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={onSend} disabled={channels.length === 0 || !to.trim()}>
            <Send className="h-4 w-4" />Send {channels.length === 0 ? "" : `via ${channels.length} channel${channels.length === 1 ? "" : "s"}`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

type NewCharge = {
  description: string; type: string; qty: number; rate: number; tax: number; amount: number; paidBy: string;
};

function AddChargeModal({ onClose, onSave }: { onClose: () => void; onSave: (c: NewCharge) => void }) {
  const [type, setType] = React.useState("Service");
  const [paidBy, setPaidBy] = React.useState("Guest");
  const [desc, setDesc] = React.useState("");
  const [qty, setQty] = React.useState(1);
  const [rate, setRate] = React.useState(0);
  // GST rate by type (Indian SAC-based)
  const gstRate = type === "F&B" ? 0.05 : type === "Room" ? 0.12 : 0.18;
  const tax = rate * qty * gstRate;
  const total = rate * qty + tax;

  return (
    <Modal title="Add Charge" onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={type} onChange={e => setType(e.target.value)}>
              <option>Room</option><option>F&B</option><option>Service</option><option>Extra</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Paid by</Label>
            <Select value={paidBy} onChange={e => setPaidBy(e.target.value)}>
              <option>Guest</option><option>Agent</option><option>Company</option>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Description *</Label>
          <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="e.g. Airport transfer" autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Qty</Label>
            <Input type="number" value={qty} onChange={e => setQty(Math.max(1, Number(e.target.value)))} />
          </div>
          <div className="space-y-1.5">
            <Label>Rate (₹)</Label>
            <Input type="number" value={rate} onChange={e => setRate(Math.max(0, Number(e.target.value)))} step="0.01" />
          </div>
        </div>
        <div className="rounded-md border border-border p-3 text-sm space-y-1">
          <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="tabular">{money(rate * qty)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">GST ({(gstRate * 100).toFixed(0)}%)</span><span className="tabular text-muted-foreground">{money(tax)}</span></div>
          <div className="flex justify-between border-t border-border pt-1 mt-1"><span className="font-semibold">Total</span><span className="font-bold tabular">{money(total)}</span></div>
        </div>
        <div className="flex justify-end gap-2 pt-3 border-t border-border">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={!desc.trim() || rate <= 0} onClick={() => onSave({
            description: desc.trim(), type, qty, rate, tax, amount: total, paidBy,
          })}>Add Charge</Button>
        </div>
      </div>
    </Modal>
  );
}

function PaymentModal({ onClose, onSave, balance }: { onClose: () => void; onSave: (amt: number, mode: string, reference: string) => void; balance: number }) {
  const [amount, setAmount] = React.useState(balance);
  const [mode, setMode] = React.useState("Card");
  const [reference, setReference] = React.useState("");
  return (
    <Modal title="Receive Payment" onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-md bg-warning-soft border border-warning/30 p-3">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Outstanding Balance</p>
          <p className="text-2xl font-semibold tabular text-warning mt-1">{money(balance)}</p>
        </div>
        <div className="space-y-1.5">
          <Label>Amount (₹) *</Label>
          <Input type="number" value={amount} onChange={e => setAmount(Math.max(0, Number(e.target.value)))} className="text-lg tabular font-semibold h-11" step="0.01" />
        </div>
        <div className="space-y-1.5">
          <Label>Payment mode *</Label>
          <div className="grid grid-cols-4 gap-1.5">
            {["Cash", "UPI", "Card", "Net Banking", "NEFT", "RTGS", "IMPS", "Cheque", "Paytm", "PhonePe", "Agent Credit", "Razorpay"].map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  "h-10 rounded-md border text-xs font-medium transition-colors",
                  mode === m ? "bg-brand text-brand-foreground border-brand" : "border-border hover:bg-surface-sunken"
                )}
              >
                {m}
              </button>
            ))}
          </div>
          {(mode === "UPI" || mode === "PhonePe" || mode === "Paytm") && (
            <p className="text-[10px] text-muted-foreground mt-1.5 inline-flex items-center gap-1">
              UPI ID: <span className="font-mono tabular text-foreground">pearlpalace@hdfcbank</span>
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label>Reference / UTR (optional)</Label>
          <Input value={reference} onChange={e => setReference(e.target.value)} placeholder={
            mode === "Cash" ? "Receipt number"
            : mode === "Card" ? "HDFC ****1234 (last 4 digits)"
            : mode === "UPI" ? "UPI Transaction ID (12-digit)"
            : mode === "NEFT" || mode === "RTGS" ? "UTR / Reference Number"
            : mode === "Cheque" ? "Cheque number · Bank · Date"
            : "Transaction reference…"
          } />
        </div>
        {amount > balance && balance > 0 && (
          <div className="rounded-md bg-info-soft border border-info/30 p-3 inline-flex items-center gap-2 text-sm">
            <MinusCircle className="h-4 w-4 text-info shrink-0" />
            <span>Overpayment by <span className="font-semibold">{money(amount - balance)}</span> — credited to guest account</span>
          </div>
        )}
        <div className="flex justify-end gap-2 pt-3 border-t border-border">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="success" disabled={amount <= 0} onClick={() => onSave(amount, mode, reference)}>
            <CreditCard className="h-4 w-4" />Record {money(amount)}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ===================== DISCOUNT MODAL =====================
const DISCOUNT_REASONS = [
  "Loyalty member", "Long-stay (≥7N)", "Group discount", "OTA price-match",
  "Goodwill / Compensation", "Manager comp", "VIP courtesy", "Other",
];
function KycModal({ onClose, onSave, initialType, initialNumber }: {
  onClose: () => void;
  onSave: (idType: string, idNumber: string) => void;
  initialType: string;
  initialNumber: string;
}) {
  const [idType, setIdType] = React.useState(initialType || "Aadhaar");
  const [idNumber, setIdNumber] = React.useState(initialNumber);
  const canSave = idNumber.trim().length > 0;

  return (
    <Modal title="Verify Guest KYC" onClose={onClose}>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>ID Type *</Label>
          <Select value={idType} onChange={e => setIdType(e.target.value)} className="h-9">
            <option>Aadhaar</option>
            <option>PAN</option>
            <option>Passport</option>
            <option>Driving License</option>
            <option>Voter ID</option>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>ID Number *</Label>
          <Input value={idNumber} onChange={e => setIdNumber(e.target.value)} placeholder="Enter the document number" className="h-9 font-mono" />
        </div>
        <div className="flex justify-end gap-2 pt-3 border-t border-border">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="success" disabled={!canSave} onClick={() => onSave(idType, idNumber.trim())}>
            <ShieldCheck className="h-4 w-4" />Mark Verified
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function AdjustmentModal({ onClose, onSave }: {
  onClose: () => void;
  onSave: (type: "Discount" | "Comp", description: string, amount: number, approver: string) => void;
}) {
  const [type, setType] = React.useState<"Comp" | "Discount">("Comp");
  const [description, setDescription] = React.useState("");
  const [amount, setAmount] = React.useState(0);
  const [approver, setApprover] = React.useState("Tom W. (Mgr)");
  const canSave = description.trim().length > 0 && amount > 0;

  return (
    <Modal title="Add Adjustment / Comp" onClose={onClose}>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Type</Label>
          <div className="grid grid-cols-2 gap-2">
            {(["Comp", "Discount"] as const).map(t => (
              <button key={t} type="button" onClick={() => setType(t)} className={cn(
                "h-10 rounded-md border-2 text-sm font-medium transition-colors",
                type === t ? "border-brand bg-brand-soft/30" : "border-border hover:bg-surface-sunken"
              )}>{t}</button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Description *</Label>
          <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Welcome amenity (VIP)" className="h-9" />
        </div>

        <div className="space-y-1.5">
          <Label>Amount (₹) *</Label>
          <Input type="number" value={amount} onChange={e => setAmount(Math.max(0, Number(e.target.value) || 0))} className="h-10 tabular text-base font-semibold" min={0} />
          <p className="text-xs text-muted-foreground">Recorded as a credit on the folio (reduces the grand total).</p>
        </div>

        <div className="space-y-1.5">
          <Label>Approver</Label>
          <Select value={approver} onChange={e => setApprover(e.target.value)} className="h-9">
            <option>Tom W. (Mgr)</option>
            <option>Anjali S. (Mgr)</option>
            <option>Auto · VIP policy</option>
            <option>System · Loyalty rule</option>
          </Select>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-border">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="success" disabled={!canSave} onClick={() => onSave(type, description.trim(), amount, approver)}>
            <Sparkles className="h-4 w-4" />Add {type}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function DiscountModal({ onClose, onSave, chargesTotal }: {
  onClose: () => void;
  onSave: (reason: string, amount: number, approver: string) => void;
  chargesTotal: number;
}) {
  const [reason, setReason] = React.useState(DISCOUNT_REASONS[0]);
  const [mode, setMode] = React.useState<"percent" | "flat">("percent");
  const [pct, setPct] = React.useState(10);
  const [flat, setFlat] = React.useState(500);
  const [approver, setApprover] = React.useState("Tom W. (Mgr)");
  const [notes, setNotes] = React.useState("");

  const amount = mode === "percent" ? Math.round(chargesTotal * pct / 100) : flat;
  const canSave = amount > 0 && amount <= chargesTotal;

  return (
    <Modal title="Apply Discount / Write-off" onClose={onClose} wide>
      <div className="space-y-4">
        <Card className="p-3 bg-info-soft/20 border-info/30 text-xs">
          Charges before discount: <strong className="tabular">{money(chargesTotal)}</strong> · Requires manager approval & audit log entry.
        </Card>

        <div className="space-y-1.5">
          <Label>Reason *</Label>
          <div className="flex flex-wrap gap-1.5">
            {DISCOUNT_REASONS.map(r => (
              <button key={r} type="button" onClick={() => setReason(r)} className={cn(
                "h-7 px-2.5 rounded-full text-xs border transition-colors",
                reason === r ? "bg-brand text-brand-foreground border-brand" : "border-border hover:bg-surface-sunken"
              )}>{r}</button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Discount type</Label>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setMode("percent")} className={cn(
              "h-12 rounded-md border-2 text-left px-3 transition-colors",
              mode === "percent" ? "border-brand bg-brand-soft/30" : "border-border hover:bg-surface-sunken"
            )}>
              <p className="text-xs uppercase tracking-wider font-semibold">Percentage</p>
              <p className="text-xs text-muted-foreground">% off charges</p>
            </button>
            <button type="button" onClick={() => setMode("flat")} className={cn(
              "h-12 rounded-md border-2 text-left px-3 transition-colors",
              mode === "flat" ? "border-brand bg-brand-soft/30" : "border-border hover:bg-surface-sunken"
            )}>
              <p className="text-xs uppercase tracking-wider font-semibold">Flat amount</p>
              <p className="text-xs text-muted-foreground">₹ off total</p>
            </button>
          </div>
        </div>

        {mode === "percent" ? (
          <div className="space-y-1.5">
            <Label>Percentage</Label>
            <div className="flex items-center gap-2">
              <Input type="number" value={pct} onChange={e => setPct(Math.max(1, Math.min(50, Number(e.target.value) || 0)))} className="h-10 tabular text-base font-semibold" min={1} max={50} />
              <span className="text-2xl text-muted-foreground">%</span>
            </div>
            <div className="flex gap-1.5">
              {[5, 10, 15, 20].map(p => (
                <button key={p} type="button" onClick={() => setPct(p)} className={cn(
                  "h-7 px-2.5 rounded-md border text-xs",
                  pct === p ? "border-brand bg-brand-soft" : "border-border hover:bg-surface-sunken"
                )}>{p}%</button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label>Amount (₹)</Label>
            <Input type="number" value={flat} onChange={e => setFlat(Math.max(0, Number(e.target.value) || 0))} className="h-10 tabular text-base font-semibold" min={0} />
          </div>
        )}

        <div className="space-y-1.5">
          <Label>Approver *</Label>
          <Select value={approver} onChange={e => setApprover(e.target.value)} className="h-9">
            <option>Tom W. (Mgr)</option>
            <option>Anjali S. (Mgr)</option>
            <option>Owner (Auto)</option>
            <option>System · Loyalty rule</option>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Notes</Label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Context / authorisation reference…"
            className="w-full px-3 py-2 rounded-md border border-border bg-surface text-sm focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 outline-hidden resize-none" />
        </div>

        <Card className="p-3 bg-success-soft/20 border-success/30">
          <div className="flex items-center justify-between">
            <span className="text-sm">Discount amount</span>
            <span className="text-xl font-bold tabular text-success">−{money(amount)}</span>
          </div>
          <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
            <span>New charges total</span>
            <span className="tabular">{money(chargesTotal - amount)}</span>
          </div>
        </Card>

        <div className="flex justify-end gap-2 pt-3 border-t border-border">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="success" disabled={!canSave} onClick={() => onSave(`${reason}${notes ? " · " + notes : ""}`, amount, approver)}>
            <Percent className="h-4 w-4" />Apply discount
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ===================== REFUND MODAL =====================
const REFUND_REASONS = [
  "Room not as described", "Cancelled service", "Service complaint",
  "Overpayment", "Duplicate charge", "Goodwill", "Other",
];
function RefundModal({ onClose, onSave, paymentsTotal, balance }: {
  onClose: () => void;
  onSave: (amount: number, mode: string, reason: string, approver: string) => void;
  paymentsTotal: number;
  balance: number;
}) {
  const maxRefund = Math.max(0, paymentsTotal);
  const [amount, setAmount] = React.useState(Math.min(1000, maxRefund));
  const [mode, setMode] = React.useState("UPI");
  const [reason, setReason] = React.useState(REFUND_REASONS[0]);
  const [approver, setApprover] = React.useState("Tom W. (Mgr)");
  const [confirm, setConfirm] = React.useState("");

  const canConfirm = amount > 0 && amount <= maxRefund && confirm === "REFUND";

  return (
    <Modal title="Process Refund" onClose={onClose} wide>
      <div className="space-y-4">
        <Card className="p-3 bg-warning-soft/20 border-warning/30">
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div><p className="text-muted-foreground">Total received</p><p className="font-semibold tabular text-success">{money(paymentsTotal)}</p></div>
            <div><p className="text-muted-foreground">Current balance</p><p className="font-semibold tabular">{money(balance)}</p></div>
            <div><p className="text-muted-foreground">Max refundable</p><p className="font-semibold tabular text-warning">{money(maxRefund)}</p></div>
          </div>
        </Card>

        <div className="space-y-1.5">
          <Label>Refund amount (₹) *</Label>
          <Input type="number" value={amount} onChange={e => setAmount(Math.max(0, Math.min(maxRefund, Number(e.target.value) || 0)))} className="h-11 tabular text-lg font-semibold" min={0} max={maxRefund} />
        </div>

        <div className="space-y-1.5">
          <Label>Refund mode *</Label>
          <div className="grid grid-cols-4 gap-1.5">
            {["Cash", "UPI", "NEFT", "Card reversal", "Bank transfer", "Cheque", "Wallet credit", "Agent credit"].map(m => (
              <button key={m} type="button" onClick={() => setMode(m)} className={cn(
                "h-10 rounded-md border text-xs font-medium transition-colors",
                mode === m ? "bg-brand text-brand-foreground border-brand" : "border-border hover:bg-surface-sunken"
              )}>{m}</button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Reason *</Label>
          <div className="flex flex-wrap gap-1.5">
            {REFUND_REASONS.map(r => (
              <button key={r} type="button" onClick={() => setReason(r)} className={cn(
                "h-7 px-2.5 rounded-full text-xs border transition-colors",
                reason === r ? "bg-warning text-white border-warning" : "border-border hover:bg-surface-sunken"
              )}>{r}</button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Approver *</Label>
          <Select value={approver} onChange={e => setApprover(e.target.value)} className="h-9">
            <option>Tom W. (Mgr)</option>
            <option>Anjali S. (Mgr)</option>
            <option>Owner</option>
            <option>Accounts · CA Sharma</option>
          </Select>
        </div>

        <div className="space-y-1.5 pt-2 border-t border-border">
          <Label>Type <strong>REFUND</strong> to confirm</Label>
          <Input value={confirm} onChange={e => setConfirm(e.target.value)} className="h-9 font-mono tabular text-sm" placeholder="REFUND" />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-border">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="danger" disabled={!canConfirm} onClick={() => onSave(amount, mode, reason, approver)}>
            <RotateCcw className="h-4 w-4" />Process refund
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ===================== QR CODE MODAL =====================
function QRCodeModal({ onClose, irn, ackNo, invoiceNo }: {
  onClose: () => void;
  irn: string;
  ackNo: string;
  invoiceNo: string;
}) {
  // Stylised matrix QR placeholder — deterministic pattern from IRN
  const cells = Array.from({ length: 21 * 21 }, (_, i) => {
    const seed = (irn.charCodeAt(i % irn.length) + i * 7) % 13;
    return seed < 6;
  });

  return (
    <Modal title="e-Invoice QR Code" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Scan with any GSTN-aware mobile app to verify this invoice on the NIC e-Invoice portal.
        </p>
        <div className="bg-white p-6 rounded-md border border-border mx-auto" style={{ width: 252 }}>
          <div className="grid grid-cols-21" style={{ gridTemplateColumns: "repeat(21, 10px)", gap: 1 }}>
            {cells.map((c, i) => (
              <div key={i} style={{ width: 10, height: 10, background: c ? "#0a1633" : "#fff" }} />
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-200 text-center">
            <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Invoice</p>
            <p className="text-sm font-bold font-mono tabular text-gray-900">{invoiceNo}</p>
          </div>
        </div>
        <div className="rounded-md bg-surface-sunken p-3 text-xs space-y-1">
          <div className="flex justify-between"><span className="text-muted-foreground">IRN</span><span className="font-mono tabular">{irn}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">ACK No.</span><span className="font-mono tabular">{ackNo}</span></div>
        </div>
        <div className="flex justify-end gap-2 pt-3 border-t border-border">
          <Button variant="ghost" onClick={onClose}>Close</Button>
          <Button onClick={() => window.print()}><Printer className="h-4 w-4" />Print QR</Button>
        </div>
      </div>
    </Modal>
  );
}

// ===================== EDIT SPLITS MODAL =====================
type SplitDef = { id: string; label: string; pct: number; tone: "brand" | "info" | "accent" | "warning" | "neutral" };
const DEFAULT_SPLITS: SplitDef[] = [
  { id: "s1", label: "Master Folio",      pct: 70, tone: "brand" },
  { id: "s2", label: "Guest Folio",       pct: 18, tone: "info" },
  { id: "s3", label: "Agent · Pearl Holidays", pct: 55, tone: "accent" },
  { id: "s4", label: "Company · TechCorp", pct: 0,  tone: "neutral" },
  { id: "s5", label: "Extras Folio",      pct: 12, tone: "warning" },
];
function EditSplitsModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [splits, setSplits] = React.useState<SplitDef[]>(DEFAULT_SPLITS);
  const total = splits.reduce((t, s) => t + s.pct, 0);

  return (
    <Modal title="Edit Split Allocations" onClose={onClose} wide>
      <div className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Set what share of the charges each folio receives. Allocations don&apos;t need to sum to 100% — the leftover stays on Master Folio.
        </p>

        <ul className="space-y-2">
          {splits.map((s, i) => (
            <li key={s.id} className="flex items-center gap-3 p-2.5 rounded-md border border-border">
              <span className={cn(
                "h-2 w-2 rounded-full shrink-0",
                s.tone === "brand" && "bg-brand",
                s.tone === "info" && "bg-info",
                s.tone === "accent" && "bg-accent",
                s.tone === "warning" && "bg-warning",
                s.tone === "neutral" && "bg-muted-foreground",
              )} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{s.label}</p>
              </div>
              <input type="range" min={0} max={100} value={s.pct}
                onChange={e => setSplits(prev => prev.map((x, ix) => ix === i ? { ...x, pct: Number(e.target.value) } : x))}
                className="w-40 accent-current" />
              <div className="flex items-center gap-1">
                <Input type="number" min={0} max={100} value={s.pct}
                  onChange={e => setSplits(prev => prev.map((x, ix) => ix === i ? { ...x, pct: Math.max(0, Math.min(100, Number(e.target.value) || 0)) } : x))}
                  className="h-8 w-16 tabular text-right" />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </li>
          ))}
        </ul>

        <Card className={cn(
          "p-3 flex items-center justify-between",
          total === 100 ? "bg-success-soft/20 border-success/30" :
          total < 100 ? "bg-info-soft/20 border-info/30" : "bg-warning-soft/20 border-warning/30"
        )}>
          <span className="text-sm font-medium">Total allocated</span>
          <span className={cn(
            "tabular font-bold text-lg",
            total === 100 ? "text-success" : total < 100 ? "text-info" : "text-warning"
          )}>
            {total}%{total !== 100 && ` · ${total < 100 ? `${100 - total}% to Master` : `${total - 100}% over-allocated`}`}
          </span>
        </Card>

        <div className="flex justify-end gap-2 pt-3 border-t border-border">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={onSave} disabled={total > 100}>
            <CheckCircle2 className="h-4 w-4" />Save splits
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ===================== ROUTING RULE EDIT MODAL =====================
function RuleEditModal({ rule, onClose, onSave }: {
  rule: { idx: number; label: string; detail: string };
  onClose: () => void;
  onSave: () => void;
}) {
  const [label, setLabel] = React.useState(rule.label);
  const [detail, setDetail] = React.useState(rule.detail);
  const [target, setTarget] = React.useState("Guest Folio");

  return (
    <Modal title={`Edit Routing Rule #${rule.idx + 1}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Rule label</Label>
          <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="What does this rule match?" />
        </div>
        <div className="space-y-1.5">
          <Label>Match details</Label>
          <Input value={detail} onChange={e => setDetail(e.target.value)} placeholder="Which charges this applies to" />
        </div>
        <div className="space-y-1.5">
          <Label>Route to</Label>
          <Select value={target} onChange={e => setTarget(e.target.value)}>
            <option>Master Folio</option>
            <option>Guest Folio</option>
            <option>Agent · Pearl Holidays</option>
            <option>Company · TechCorp</option>
            <option>Extras Folio</option>
          </Select>
        </div>
        <div className="flex justify-between gap-2 pt-3 border-t border-border">
          <Button variant="danger" size="sm" onClick={onSave}><X className="h-3.5 w-3.5" />Delete rule</Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={onSave}><CheckCircle2 className="h-4 w-4" />Save rule</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ===================== VOID CHARGE MODAL =====================
const VOID_REASONS = [
  "Duplicate posting", "Wrong guest", "Service not delivered",
  "Pricing error", "Manager waiver", "Guest dispute", "Other",
];
function VoidChargeModal({ charge, onClose, onConfirm }: {
  charge: typeof SAMPLE_FOLIO_CHARGES[number];
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = React.useState("");
  const [notes, setNotes] = React.useState("");

  return (
    <Modal title="Void / cancel charge" onClose={onClose}>
      <div className="space-y-4">
        <Card className="p-3 bg-danger-soft/15 border-danger/30 text-sm">
          <p className="font-medium">{charge.description}</p>
          <p className="text-xs text-muted-foreground tabular mt-0.5">{charge.type} · {charge.qty} × {money(charge.rate)} + tax {money(charge.tax)} = <strong>{money(charge.amount)}</strong></p>
        </Card>
        <div className="space-y-1.5">
          <Label>Reason *</Label>
          <div className="flex flex-wrap gap-1.5">
            {VOID_REASONS.map(r => (
              <button key={r} type="button" onClick={() => setReason(r)} className={cn(
                "h-7 px-2.5 rounded-full text-xs border transition-colors",
                reason === r ? "bg-danger text-white border-danger" : "border-border hover:bg-surface-sunken"
              )}>{r}</button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Notes</Label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Document context for audit trail…"
            className="w-full px-3 py-2 rounded-md border border-border bg-surface text-sm focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 outline-hidden resize-none" />
        </div>
        <div className="rounded-md bg-warning-soft/20 border border-warning/30 p-2.5 text-xs flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          <p>Charge will be marked voided and excluded from totals. Original line is preserved with strike-through for the audit trail.</p>
        </div>
        <div className="flex justify-end gap-2 pt-3 border-t border-border">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="danger" disabled={!reason} onClick={() => onConfirm(reason + (notes ? ` · ${notes}` : ""))}>
            <X className="h-4 w-4" />Confirm void
          </Button>
        </div>
      </div>
    </Modal>
  );
}
