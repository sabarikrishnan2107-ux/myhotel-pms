"use client";
import * as React from "react";
import Link from "next/link";
import { use } from "react";
import {
  CheckCircle2, CreditCard, Receipt, Sparkles, Printer, Send,
  Percent, Calendar, BedDouble, ArrowLeft, AlertCircle, X, FileText, Download,
  Banknote, Smartphone, Building2, Mail, MessageCircle, Plus, Trash2, Wallet, Briefcase,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, PaymentBadge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Input, Label } from "@/components/ui/input";
import { RESERVATIONS, GUESTS, SAMPLE_FOLIO_CHARGES, SAMPLE_PAYMENTS } from "@/lib/mock-data";
import { cn, money, formatDate, formatDateLong, formatTime } from "@/lib/utils";
import { apiGet, apiPost, apiPut } from "@/lib/api";
import { useProperty, hotelName } from "@/lib/use-property";
import type { Reservation } from "@/lib/types";

export default function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  // Load the real booking + its folio (charges & payments) for this bookingNo.
  const [reservation, setReservation] = React.useState<Reservation>(
    () => RESERVATIONS.find(r => r.bookingNo === id) ?? RESERVATIONS[0],
  );
  const [folioCharges, setFolioCharges] = React.useState<typeof SAMPLE_FOLIO_CHARGES>([]);
  const [folioPayments, setFolioPayments] = React.useState<typeof SAMPLE_PAYMENTS>([]);
  React.useEffect(() => {
    apiGet<Reservation[]>("/bookings")
      .then(list => { const b = list.find(x => x.bookingNo === id); if (b) setReservation({ ...b, id: String(b.id) }); })
      .catch(() => {});
    apiGet<typeof SAMPLE_FOLIO_CHARGES>(`/folio-charges?bookingNo=${encodeURIComponent(id)}`)
      .then(rows => setFolioCharges(rows.map(r => ({ ...r, id: String(r.id) }))))
      .catch(() => {});
    apiGet<typeof SAMPLE_PAYMENTS>(`/folio-payments?bookingNo=${encodeURIComponent(id)}`)
      .then(rows => setFolioPayments(rows.map(r => ({ ...r, id: String(r.id) }))))
      .catch(() => {});
  }, [id]);
  const guest = GUESTS.find(g => g.name === reservation.guestName);

  type PayMode = "Cash" | "Card" | "UPI" | "Bank" | "Online" | "Agent Credit";
  type PayLine = {
    id: string; mode: PayMode; amount: number; reference: string;
    // mode-specific
    cardType?: "Visa" | "MasterCard" | "Amex" | "RuPay";
    cardLast4?: string;
    authCode?: string;
    upiVPA?: string;       // payer VPA
    bankName?: string;
    txnId?: string;
    gateway?: "Razorpay" | "PayU" | "Cashfree" | "Stripe";
    agentName?: string;
    poNumber?: string;
    cashTendered?: number; // for cash → change due = tendered - amount
  };

  const [discount, setDiscount] = React.useState(0);
  const [lineDiscount, setLineDiscount] = React.useState<{ id: string; note: string; amount: number }[]>([]);
  const [tip, setTip] = React.useState(0);
  const [done, setDone] = React.useState(false);
  const [showInvoice, setShowInvoice] = React.useState(false);
  const [showReceipt, setShowReceipt] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };

  // Use the real folio when charges exist; otherwise derive a room-charge line
  // from the booking so the bill still reflects the actual stay.
  const billCharges = React.useMemo(() => {
    if (folioCharges.length) return folioCharges;
    const nights = Math.max(1, reservation.nights || 1);
    const nightly = Math.round((reservation.total || 0) / nights);
    return Array.from({ length: nights }, (_, i) => ({
      id: `room-${i + 1}`,
      date: reservation.checkIn,
      description: `Room — ${reservation.roomType} (Night ${i + 1})`,
      type: "Room",
      qty: 1,
      rate: nightly,
      tax: 0,
      amount: i === nights - 1 ? (reservation.total || 0) - nightly * (nights - 1) : nightly,
      paidBy: "Guest",
    })) as typeof SAMPLE_FOLIO_CHARGES;
  }, [folioCharges, reservation]);

  const billPayments = React.useMemo(() => {
    if (folioPayments.length) return folioPayments;
    return (reservation.advance > 0
      ? [{ id: "adv", date: reservation.checkIn, mode: "Advance", reference: "Advance paid at booking", amount: reservation.advance }]
      : []) as typeof SAMPLE_PAYMENTS;
  }, [folioPayments, reservation]);

  // Detailed payment capture — supports SPLIT payments (multiple modes)
  const charges = billCharges.reduce((s, c) => s + c.amount, 0);
  const tax = billCharges.reduce((s, c) => s + c.tax, 0);
  const paid = billPayments.reduce((s, p) => s + p.amount, 0);
  const lineDiscAmt = lineDiscount.reduce((t, l) => t + l.amount, 0);
  const discountAmt = (charges * discount) / 100 + lineDiscAmt;
  const grandTotal = Math.max(0, charges - discountAmt + tip);
  const balance = Math.max(0, grandTotal - paid);

  const [payLines, setPayLines] = React.useState<PayLine[]>([
    { id: "p1", mode: "UPI", amount: balance, reference: "", upiVPA: "" },
  ]);
  // Sync the first line amount with balance when discount/tip changes (only if user hasn't customized)
  React.useEffect(() => {
    setPayLines(ls => ls.length === 1 && ls[0].id === "p1"
      ? [{ ...ls[0], amount: balance }]
      : ls
    );
     
  }, [balance]);

  const totalNowReceiving = payLines.reduce((t, l) => t + (l.amount || 0), 0);
  const collectShortBy = balance - totalNowReceiving;
  const overpayment = totalNowReceiving - balance;
  const paymentMode = payLines[0]?.mode ?? "UPI"; // for backward-compat invoice/receipt

  const updatePayLine = (idx: number, patch: Partial<PayLine>) => {
    setPayLines(ls => ls.map((l, i) => i === idx ? { ...l, ...patch } : l));
  };
  const addPayLine = () => {
    setPayLines(ls => [...ls, { id: `p${ls.length + 1}`, mode: "Cash", amount: Math.max(0, balance - totalNowReceiving), reference: "" }]);
  };
  const removePayLine = (idx: number) => {
    setPayLines(ls => ls.length > 1 ? ls.filter((_, i) => i !== idx) : ls);
  };

  const addLineDiscount = () => {
    setLineDiscount(d => [...d, { id: `ld${d.length + 1}`, note: "Loyalty adjustment", amount: 0 }]);
  };

  if (done) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
        <Card className="p-10 text-center">
          <div className="inline-flex h-16 w-16 rounded-full bg-success-soft text-success items-center justify-center mb-4">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-semibold">Checkout complete</h1>
          <p className="text-muted-foreground mt-2">
            Invoice <span className="text-foreground font-medium">INV-2026-{reservation.bookingNo.slice(2)}</span> sent to {reservation.guestName}.
          </p>
          <p className="text-sm text-muted-foreground mt-4 inline-flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand" />
            Room {reservation.roomNumber} marked Dirty · housekeeping task auto-created
          </p>
          <div className="flex flex-wrap justify-center gap-2 mt-8">
            <Button variant="outline" onClick={() => setShowInvoice(true)}>
              <Printer className="h-4 w-4" />Print Invoice
            </Button>
            <Button variant="outline" onClick={() => setShowReceipt(true)}>
              <Receipt className="h-4 w-4" />Print Payment Receipt
            </Button>
            <Button variant="outline" onClick={() => showToast(`Opening GST invoice PDF for ${reservation.bookingNo}`)}>
              <FileText className="h-4 w-4" />View PDF
            </Button>
            <Button variant="outline" onClick={() => showToast(`Invoice emailed to ${guest?.email ?? "guest"}`)}>
              <Mail className="h-4 w-4" />Email Invoice
            </Button>
            <Button variant="outline" onClick={() => showToast(`Sent to WhatsApp ${guest?.phone ?? ""}`)}>
              <MessageCircle className="h-4 w-4" />WhatsApp
            </Button>
            <Link href="/dashboard"><Button>Back to Dashboard</Button></Link>
          </div>
          {showInvoice && <InvoiceModal onClose={() => setShowInvoice(false)} reservation={reservation} guest={guest} items={billCharges} charges={charges} tax={tax} discount={discount} discountAmt={discountAmt} grandTotal={grandTotal} paid={paid + Math.max(0, balance)} paymentMode={paymentMode} />}
          {showReceipt && <ReceiptModal onClose={() => setShowReceipt(false)} reservation={reservation} guest={guest} balance={Math.max(0, balance)} paymentMode={paymentMode} />}
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/checkout" className="hover:text-foreground inline-flex items-center gap-1"><ArrowLeft className="h-3.5 w-3.5" />Checkout queue</Link>
      </div>

      {/* Header */}
      <Card className="p-5">
        <div className="flex flex-wrap items-start gap-4">
          <Avatar name={reservation.guestName} size={56} vip={reservation.vip} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-semibold">{reservation.guestName}</h1>
              {reservation.vip && <Badge tone="brand">VIP</Badge>}
              <Badge tone="neutral">{reservation.bookingNo}</Badge>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><BedDouble className="h-3.5 w-3.5" />Room {reservation.roomNumber} · {reservation.roomType}</span>
              <span className="inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />{formatDate(reservation.checkIn)} → {formatDate(reservation.checkOut)} · {reservation.nights}N</span>
              <PaymentBadge status={reservation.paymentStatus} />
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: charges summary */}
        <div className="lg:col-span-2 space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Final Bill Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y divide-border">
                {billCharges.map(c => (
                  <li key={c.id} className="flex items-center justify-between px-5 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm">{c.description}</p>
                      <p className="text-xs text-muted-foreground tabular">{formatDate(c.date)} · {c.type}</p>
                    </div>
                    <p className="tabular font-medium ml-3">{money(c.amount)}</p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Adjustments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Discount %</Label>
                <div className="flex gap-2 mt-1.5">
                  {[0, 5, 10, 15].map(p => (
                    <button
                      key={p}
                      onClick={() => setDiscount(p)}
                      className={cn(
                        "h-9 px-3 rounded-md border text-sm font-medium transition-colors",
                        discount === p ? "bg-brand text-brand-foreground border-brand" : "border-border hover:bg-surface-sunken"
                      )}
                    >
                      {p}%
                    </button>
                  ))}
                  <Input type="number" placeholder="Custom" className="h-9 w-24" value={discount} onChange={e => setDiscount(Number(e.target.value))} />
                </div>
                {discount > 10 && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-warning">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Discount &gt; 10% — manager approval required
                  </div>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={addLineDiscount}>
                <Percent className="h-3.5 w-3.5" />Add line discount
              </Button>

              {lineDiscount.length > 0 && (
                <div className="mt-3 space-y-2">
                  {lineDiscount.map((l, idx) => (
                    <div key={l.id} className="flex items-center gap-2 p-2 rounded-md border border-border bg-surface-sunken/30">
                      <Input value={l.note} onChange={e => setLineDiscount(d => d.map((x, i) => i === idx ? { ...x, note: e.target.value } : x))} className="h-8 flex-1 text-xs" placeholder="Reason" />
                      <Input type="number" value={l.amount} onChange={e => setLineDiscount(d => d.map((x, i) => i === idx ? { ...x, amount: Number(e.target.value) } : x))} className="h-8 w-28 tabular text-right text-xs" placeholder="₹" />
                      <button type="button" onClick={() => setLineDiscount(d => d.filter((_, i) => i !== idx))} className="h-8 w-8 rounded-md border border-border hover:bg-danger hover:text-white hover:border-danger inline-flex items-center justify-center text-muted-foreground">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Tip */}
              <div className="pt-3 mt-3 border-t border-border">
                <Label className="text-xs">Tip / gratuity (optional)</Label>
                <div className="flex gap-2 mt-1.5">
                  {[0, 100, 200, 500].map(t => (
                    <button
                      key={t}
                      onClick={() => setTip(t)}
                      className={cn(
                        "h-9 px-3 rounded-md border text-xs font-medium transition-colors",
                        tip === t ? "bg-accent text-accent-soft border-accent" : "border-border hover:bg-surface-sunken"
                      )}
                    >
                      {t === 0 ? "None" : money(t)}
                    </button>
                  ))}
                  <Input type="number" placeholder="Custom" className="h-9 w-24 tabular" value={tip} onChange={e => setTip(Math.max(0, Number(e.target.value)))} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payments received so far */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Payments received so far</CardTitle>
                <Badge tone="success">{money(paid)} cleared</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y divide-border">
                {billPayments.map(p => (
                  <li key={p.id} className="px-5 py-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="h-8 w-8 rounded-md bg-success-soft text-success inline-flex items-center justify-center shrink-0">
                        <Receipt className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{(p as { description?: string }).description ?? p.mode}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatDate(p.date)} · {p.mode}
                          {p.reference ? <> · <span className="font-mono tabular">{p.reference}</span></> : null}
                        </p>
                      </div>
                    </div>
                    <span className="font-semibold tabular text-sm text-success shrink-0">{money(p.amount)}</span>
                  </li>
                ))}
                {billPayments.length === 0 && (
                  <li className="px-5 py-4 text-center text-sm text-muted-foreground">No advance payments on file.</li>
                )}
              </ul>
            </CardContent>
          </Card>

          {/* DETAILED PAYMENT CAPTURE */}
          {balance > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Collect payment</CardTitle>
                  <Badge tone={Math.abs(collectShortBy) < 1 ? "success" : collectShortBy > 0 ? "warning" : "info"}>
                    {Math.abs(collectShortBy) < 1 ? "Settled" : collectShortBy > 0 ? `${money(collectShortBy)} short` : `${money(overpayment)} extra`}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {payLines.map((line, idx) => (
                  <PaymentLineCard
                    key={line.id}
                    line={line}
                    idx={idx}
                    canRemove={payLines.length > 1}
                    onChange={(patch) => updatePayLine(idx, patch)}
                    onRemove={() => removePayLine(idx)}
                  />
                ))}
                <Button variant="outline" size="sm" onClick={addPayLine}>
                  <Plus className="h-3.5 w-3.5" />Split payment / add another mode
                </Button>

                {/* Live capture summary */}
                <div className="rounded-md bg-surface-sunken/40 border border-border p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Balance</p>
                    <p className="text-sm font-semibold tabular mt-0.5">{money(balance)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Receiving now</p>
                    <p className="text-sm font-semibold tabular mt-0.5">{money(totalNowReceiving)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Tip</p>
                    <p className="text-sm font-semibold tabular mt-0.5">{money(tip)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{collectShortBy > 0 ? "Short by" : overpayment > 0 ? "Overpayment" : "Status"}</p>
                    <p className={cn("text-sm font-semibold tabular mt-0.5", collectShortBy > 0 ? "text-warning" : overpayment > 0 ? "text-accent" : "text-success")}>
                      {Math.abs(collectShortBy) < 1 ? "✓ Balanced" : money(Math.abs(collectShortBy))}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: totals + payment */}
        <Card className="p-5 h-fit sticky top-20 space-y-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Final Total</p>

          <dl className="space-y-2 text-sm">
            <Row k="Charges" v={money(charges)} />
            {discount > 0 && <Row k={`Discount (${discount}%)`} v={`-${money(discountAmt)}`} tone="danger" />}
            <Row k="Tax included" v={money(tax)} muted />
            <div className="border-t border-border pt-2 mt-2">
              <Row k={<span className="font-semibold text-foreground">Grand Total</span>} v={<span className="text-xl tabular font-semibold">{money(grandTotal)}</span>} />
            </div>
            <Row k="Advance / payments" v={`-${money(paid)}`} tone="success" />
            <div className="border-t border-border pt-2 mt-2">
              <Row k={<span className="font-semibold text-foreground">Balance due</span>} v={
                <span className={cn("text-xl tabular font-semibold", balance > 0 ? "text-warning" : "text-success")}>
                  {money(Math.max(0, balance))}
                </span>
              } />
            </div>
          </dl>

          {balance > 0 && (
            <div className="pt-2 border-t border-border">
              <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1.5">
                <CreditCard className="h-3 w-3" />
                <span>Detailed payment capture below — supports split / partial / tip</span>
              </p>
            </div>
          )}

          <div className="space-y-2 pt-2 border-t border-border">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">After checkout</p>
            <p className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-brand" /> Room marked Dirty → HK task auto-created
            </p>
            <p className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
              <Send className="h-3.5 w-3.5 text-brand" /> Invoice + Thank you sent via Email + WhatsApp
            </p>
          </div>

          {/* Pre-checkout preview actions */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setShowInvoice(true)}>
              <Printer className="h-3.5 w-3.5" />Preview Invoice
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowReceipt(true)}>
              <Receipt className="h-3.5 w-3.5" />Preview Receipt
            </Button>
          </div>

          {collectShortBy > 0 && (
            <p className="text-xs text-warning text-center mb-2 inline-flex items-center justify-center gap-1 w-full">
              <AlertCircle className="h-3.5 w-3.5" />Collect {money(collectShortBy)} more to settle the balance before checkout
            </p>
          )}
          <Button
            onClick={() => {
              setDone(true);
              // Record the settlement payment and mark the booking paid in Postgres.
              const settle = Math.max(0, balance);
              if (settle > 0) {
                apiPost("/folio-payments", {
                  bookingNo: reservation.bookingNo,
                  date: new Date().toISOString().slice(0, 10),
                  mode: paymentMode,
                  amount: settle,
                  reference: "Checkout settlement",
                }).catch(() => {});
              }
              apiGet<Reservation[]>("/bookings")
                .then(list => {
                  const bk = list.find(b => b.bookingNo === reservation.bookingNo);
                  if (bk) return apiPut(`/bookings/${(bk as { id: number | string }).id}`, { paymentStatus: "paid", advance: reservation.total, balance: 0, status: "checked-out" });
                })
                // Vacated room goes dirty so it surfaces on the Housekeeping board.
                .then(() => apiGet<{ id: number; number: string }[]>("/rooms"))
                .then(rooms => {
                  const room = rooms?.find(r => r.number === reservation.roomNumber);
                  if (room) return apiPut(`/rooms/${room.id}`, { hkStatus: "dirty" });
                })
                .catch(() => {});
            }}
            size="lg"
            variant="success"
            className="w-full"
            disabled={collectShortBy > 0}
            title={collectShortBy > 0 ? "Settle the full balance to enable checkout" : undefined}
          >
            <CheckCircle2 className="h-5 w-5" />{collectShortBy > 0 ? `Balance due ${money(collectShortBy)}` : "Complete Checkout"}
          </Button>
        </Card>
      </div>

      {showInvoice && <InvoiceModal onClose={() => setShowInvoice(false)} reservation={reservation} guest={guest} items={billCharges} charges={charges} tax={tax} discount={discount} discountAmt={discountAmt} grandTotal={grandTotal} paid={paid + Math.max(0, balance)} paymentMode={paymentMode} />}
      {showReceipt && <ReceiptModal onClose={() => setShowReceipt(false)} reservation={reservation} guest={guest} balance={Math.max(0, balance)} paymentMode={paymentMode} />}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-foreground text-background rounded-lg px-4 py-3 text-sm shadow-2xl animate-in slide-in-from-bottom-2 inline-flex items-center gap-2.5 ring-1 ring-foreground/20">
          <span className="h-6 w-6 rounded-full bg-success text-white inline-flex items-center justify-center"><CheckCircle2 className="h-3.5 w-3.5" /></span>
          <span className="font-medium">{toast}</span>
        </div>
      )}
    </div>
  );
}

// ===================== DETAILED PAYMENT LINE =====================
type PayMode = "Cash" | "Card" | "UPI" | "Bank" | "Online" | "Agent Credit";
type PayLineLite = {
  id: string; mode: PayMode; amount: number; reference: string;
  cardType?: "Visa" | "MasterCard" | "Amex" | "RuPay";
  cardLast4?: string;
  authCode?: string;
  upiVPA?: string;
  bankName?: string;
  txnId?: string;
  gateway?: "Razorpay" | "PayU" | "Cashfree" | "Stripe";
  agentName?: string;
  poNumber?: string;
  cashTendered?: number;
};

const MODE_ICONS: Record<PayMode, typeof CreditCard> = {
  "Cash": Banknote,
  "Card": CreditCard,
  "UPI": Smartphone,
  "Bank": Building2,
  "Online": Wallet,
  "Agent Credit": Briefcase,
};

function PaymentLineCard({ line, idx, canRemove, onChange, onRemove }: {
  line: PayLineLite;
  idx: number;
  canRemove: boolean;
  onChange: (patch: Partial<PayLineLite>) => void;
  onRemove: () => void;
}) {
  const Icon = MODE_ICONS[line.mode];
  const changeDue = (line.cashTendered ?? 0) - line.amount;

  return (
    <div className="rounded-md border border-border p-3 space-y-3 bg-surface">
      {/* Header — Line number + mode selector */}
      <div className="flex items-center gap-2">
        <span className="h-7 w-7 rounded-md bg-brand-soft text-brand-soft-foreground inline-flex items-center justify-center shrink-0 text-xs font-semibold">{idx + 1}</span>
        <div className="flex-1">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Payment line</p>
        </div>
        {canRemove && (
          <button type="button" onClick={onRemove} className="h-7 w-7 rounded-md border border-border hover:bg-danger hover:text-white hover:border-danger inline-flex items-center justify-center text-muted-foreground" title="Remove">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Mode selector — visual icons */}
      <div className="grid grid-cols-6 gap-1">
        {(["Cash", "Card", "UPI", "Bank", "Online", "Agent Credit"] as PayMode[]).map(m => {
          const ModeIcon = MODE_ICONS[m];
          const on = line.mode === m;
          return (
            <button
              key={m}
              type="button"
              onClick={() => onChange({ mode: m })}
              title={m}
              className={cn(
                "h-12 rounded-md border flex flex-col items-center justify-center gap-0.5 transition-colors",
                on ? "bg-brand text-brand-foreground border-brand" : "border-border hover:bg-surface-sunken text-muted-foreground"
              )}
            >
              <ModeIcon className="h-3.5 w-3.5" />
              <span className="text-[9px] font-medium leading-none">{m === "Agent Credit" ? "Credit" : m}</span>
            </button>
          );
        })}
      </div>

      {/* Amount input */}
      <div className="space-y-1.5">
        <Label className="text-xs">Amount</Label>
        <Input
          type="number"
          min={0}
          value={line.amount}
          onChange={e => onChange({ amount: Math.max(0, Number(e.target.value)) })}
          className="h-10 tabular text-base font-semibold"
        />
      </div>

      {/* Mode-specific fields */}
      {line.mode === "Cash" && (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Cash tendered</Label>
            <Input type="number" min={0} value={line.cashTendered ?? line.amount} onChange={e => onChange({ cashTendered: Number(e.target.value) })} className="h-9 tabular" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Change due</Label>
            <div className={cn(
              "h-9 px-3 rounded-md border bg-surface-sunken/40 inline-flex items-center font-semibold tabular text-sm",
              changeDue < 0 ? "text-danger border-danger/30" : changeDue > 0 ? "text-warning border-warning/30" : "text-muted-foreground border-border"
            )}>
              {money(Math.max(0, changeDue))}
              {changeDue < 0 && <span className="ml-1 text-[10px] font-normal">(short)</span>}
            </div>
          </div>
        </div>
      )}

      {line.mode === "Card" && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Card type</Label>
              <select value={line.cardType ?? "Visa"} onChange={e => onChange({ cardType: e.target.value as PayLineLite["cardType"] })} className="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm">
                <option>Visa</option>
                <option>MasterCard</option>
                <option>Amex</option>
                <option>RuPay</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Last 4 digits</Label>
              <Input value={line.cardLast4 ?? ""} onChange={e => onChange({ cardLast4: e.target.value.replace(/\D/g, "").slice(0, 4) })} placeholder="••••" maxLength={4} className="h-9 font-mono tabular text-center" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Auth / Approval code</Label>
              <Input value={line.authCode ?? ""} onChange={e => onChange({ authCode: e.target.value.toUpperCase() })} placeholder="e.g. 123456" className="h-9 font-mono tabular" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Slip / Receipt ref</Label>
              <Input value={line.reference} onChange={e => onChange({ reference: e.target.value })} placeholder="POS slip #" className="h-9 font-mono tabular" />
            </div>
          </div>
        </div>
      )}

      {line.mode === "UPI" && (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Payer UPI ID (VPA)</Label>
            <Input value={line.upiVPA ?? ""} onChange={e => onChange({ upiVPA: e.target.value })} placeholder="guest@upi" className="h-9 font-mono tabular" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Txn reference</Label>
            <Input value={line.reference} onChange={e => onChange({ reference: e.target.value })} placeholder="UPI ref #" className="h-9 font-mono tabular" />
          </div>
        </div>
      )}

      {line.mode === "Bank" && (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Bank name</Label>
            <Input value={line.bankName ?? ""} onChange={e => onChange({ bankName: e.target.value })} placeholder="e.g. HDFC, ICICI" className="h-9" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">NEFT / RTGS ref</Label>
            <Input value={line.reference} onChange={e => onChange({ reference: e.target.value })} placeholder="UTR / Ref no." className="h-9 font-mono tabular" />
          </div>
        </div>
      )}

      {line.mode === "Online" && (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Gateway</Label>
            <select value={line.gateway ?? "Razorpay"} onChange={e => onChange({ gateway: e.target.value as PayLineLite["gateway"] })} className="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm">
              <option>Razorpay</option>
              <option>PayU</option>
              <option>Cashfree</option>
              <option>Stripe</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Transaction ID</Label>
            <Input value={line.txnId ?? ""} onChange={e => onChange({ txnId: e.target.value })} placeholder="pay_LqRz…" className="h-9 font-mono tabular" />
          </div>
        </div>
      )}

      {line.mode === "Agent Credit" && (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Agent / Corporate</Label>
            <Input value={line.agentName ?? ""} onChange={e => onChange({ agentName: e.target.value })} placeholder="e.g. Pearl Holidays" className="h-9" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">PO / Voucher #</Label>
            <Input value={line.poNumber ?? ""} onChange={e => onChange({ poNumber: e.target.value })} placeholder="PO ref" className="h-9 font-mono tabular" />
          </div>
        </div>
      )}

      {/* Mode summary chip */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/50">
        <span className="inline-flex items-center gap-1">
          <Icon className="h-3 w-3" />
          {line.mode}
          {line.cardType && line.cardLast4 && <> · {line.cardType} ****{line.cardLast4}</>}
          {line.upiVPA && <> · {line.upiVPA}</>}
          {line.bankName && <> · {line.bankName}</>}
        </span>
        <span className="font-semibold text-foreground tabular">{money(line.amount)}</span>
      </div>
    </div>
  );
}

function Row({ k, v, muted, tone }: { k: React.ReactNode; v: React.ReactNode; muted?: boolean; tone?: "success" | "danger" }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-xs text-muted-foreground">{k}</dt>
      <dd className={cn(
        "tabular text-sm font-medium",
        muted && "text-muted-foreground font-normal",
        tone === "success" && "text-success",
        tone === "danger" && "text-danger"
      )}>{v}</dd>
    </div>
  );
}

// ---------- Modals: Invoice + Payment Receipt ----------

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs animate-in no-print" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 pointer-events-none overflow-y-auto no-print">
        <Card className="pointer-events-auto w-full max-w-2xl p-5 animate-in shadow-xl my-auto">
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

function InvoiceModal({
  onClose, reservation, guest, items, charges, tax, discount, discountAmt, grandTotal, paid, paymentMode,
}: {
  onClose: () => void;
  reservation: typeof RESERVATIONS[number];
  guest: typeof GUESTS[number] | undefined;
  items: typeof SAMPLE_FOLIO_CHARGES;
  charges: number;
  tax: number;
  discount: number;
  discountAmt: number;
  grandTotal: number;
  paid: number;
  paymentMode: string;
}) {
  const name = hotelName(useProperty());
  const subtotal = charges - tax;
  const cgst = tax / 2;
  const sgst = tax / 2;
  const interState = (guest?.nationality ?? "India") !== "India";
  const invoiceNo = `INV-2026-${reservation.bookingNo.slice(2)}`;

  return (
    <ModalShell title="Tax Invoice Preview" onClose={onClose}>
      <div id="print-area" className="space-y-4">
        <div className="rounded-md border border-border p-5 bg-surface text-sm space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-border pb-3">
            <div>
              <p className="font-display text-base font-medium">{name}</p>
              <p className="text-xs text-muted-foreground">Main Tower · MG Road, Bandra West, Mumbai 400050</p>
              <p className="text-[10px] text-muted-foreground tabular mt-0.5">
                GSTIN <span className="font-mono">27AAACR5055K1Z5</span> · PAN <span className="font-mono">AAACR5055K</span> · FSSAI 11522999000123
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Tax Invoice · Original</p>
              <p className="font-semibold tabular">{invoiceNo}</p>
              <p className="text-[10px] text-muted-foreground">{formatDateLong(new Date())}</p>
            </div>
          </div>

          {/* Bill-to */}
          <div className="grid grid-cols-2 gap-4 border-b border-border pb-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Bill To</p>
              <p className="font-medium mt-1">{reservation.guestName}</p>
              {guest && (
                <>
                  <p className="text-xs text-muted-foreground">{guest.phone}</p>
                  <p className="text-xs text-muted-foreground">{guest.email}</p>
                  <p className="text-[10px] text-muted-foreground tabular">{guest.idType}: {guest.idNumber}</p>
                </>
              )}
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Stay</p>
              <p className="text-xs"><span className="text-muted-foreground">Booking:</span> <span className="tabular font-medium">{reservation.bookingNo}</span></p>
              <p className="text-xs"><span className="text-muted-foreground">Room:</span> {reservation.roomNumber} · {reservation.roomType}</p>
              <p className="text-xs"><span className="text-muted-foreground">Check-in:</span> {formatDate(reservation.checkIn)}</p>
              <p className="text-xs"><span className="text-muted-foreground">Check-out:</span> {formatDate(reservation.checkOut)}</p>
              <p className="text-xs"><span className="text-muted-foreground">Nights:</span> {reservation.nights}</p>
              <p className="text-[10px] text-muted-foreground mt-1">Place of Supply: Maharashtra (27)</p>
            </div>
          </div>

          {/* Charges line items */}
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-1.5">Description</th>
                <th className="text-left py-1.5">SAC</th>
                <th className="text-right py-1.5">Qty</th>
                <th className="text-right py-1.5">Rate</th>
                <th className="text-right py-1.5">Tax</th>
                <th className="text-right py-1.5">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map(c => {
                const sac = c.description.match(/SAC\s+(\d+)/)?.[1] ?? "9963";
                return (
                  <tr key={c.id} className="border-b border-border/40">
                    <td className="py-1.5">{c.description.replace(/\s*·\s*SAC\s+\d+/, "")}</td>
                    <td className="py-1.5 tabular">{sac}</td>
                    <td className="text-right py-1.5 tabular">{c.qty}</td>
                    <td className="text-right py-1.5 tabular">{money(c.rate)}</td>
                    <td className="text-right py-1.5 tabular text-muted-foreground">{money(c.tax)}</td>
                    <td className="text-right py-1.5 tabular font-medium">{money(c.amount)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Totals */}
          <div className="space-y-1 pt-1 max-w-sm ml-auto">
            <div className="flex justify-between"><span className="text-muted-foreground">Taxable Value</span><span className="tabular">{money(subtotal)}</span></div>
            {interState ? (
              <div className="flex justify-between"><span className="text-muted-foreground">IGST @ 18%</span><span className="tabular">{money(tax)}</span></div>
            ) : (
              <>
                <div className="flex justify-between"><span className="text-muted-foreground">CGST @ 9%</span><span className="tabular">{money(cgst)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">SGST @ 9%</span><span className="tabular">{money(sgst)}</span></div>
              </>
            )}
            {discountAmt > 0 && (
              <div className="flex justify-between text-success"><span>Discount ({discount}%)</span><span className="tabular">- {money(discountAmt)}</span></div>
            )}
            <div className="flex justify-between border-t border-border pt-1 mt-1">
              <span className="font-semibold">Grand Total</span>
              <span className="font-bold tabular">{money(grandTotal)}</span>
            </div>
            <div className="flex justify-between"><span className="text-muted-foreground">Paid ({paymentMode})</span><span className="tabular text-success">{money(paid)}</span></div>
            <div className="flex justify-between"><span className="font-semibold">Balance</span><span className="font-bold tabular">{money(Math.max(0, grandTotal - paid))}</span></div>
          </div>

          {/* e-Invoice + footer */}
          <div className="border-t border-border pt-3 grid grid-cols-2 gap-3 text-[10px]">
            <div>
              <p className="text-muted-foreground uppercase tracking-wider font-semibold">e-Invoice IRN</p>
              <p className="font-mono tabular mt-0.5 break-all">2705-{reservation.bookingNo.slice(2)}-{(parseInt(reservation.bookingNo.slice(2)) || 1).toString(36).toUpperCase().padEnd(8, "X")}…</p>
              <p className="text-muted-foreground mt-0.5">ACK 1120138237855 · 25 May 2026</p>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground italic">For {name}</p>
              <p className="mt-6 border-t border-border pt-1 tabular">Authorised Signatory</p>
            </div>
          </div>

          <p className="text-[9px] text-muted-foreground italic border-t border-border pt-2 leading-snug">
            Subject to Mumbai jurisdiction. Goods/Services once sold will not be taken back. This is a computer-generated invoice and does not require a physical signature when e-Invoice is generated.
          </p>
        </div>
        <div className="flex justify-end gap-2 pt-3 border-t border-border">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Download className="h-4 w-4" />Save as PDF
          </Button>
          <Button onClick={() => window.print()}><Printer className="h-4 w-4" />Print Now</Button>
        </div>
      </div>
    </ModalShell>
  );
}

function ReceiptModal({
  onClose, reservation, guest, balance, paymentMode,
}: {
  onClose: () => void;
  reservation: typeof RESERVATIONS[number];
  guest: typeof GUESTS[number] | undefined;
  balance: number;
  paymentMode: string;
}) {
  const name = hotelName(useProperty());
  const receiptNo = `RCP-2026-${reservation.bookingNo.slice(2)}`;
  const amountInWords = numberToWords(Math.round(balance));

  return (
    <ModalShell title="Payment Receipt Preview" onClose={onClose}>
      <div id="print-area" className="space-y-4">
        <div className="rounded-md border-2 border-double border-border p-5 bg-surface text-sm space-y-3">
          {/* Header */}
          <div className="text-center border-b-2 border-double border-border pb-3">
            <p className="font-display text-lg font-medium">{name}</p>
            <p className="text-[10px] text-muted-foreground">Main Tower · MG Road, Bandra West, Mumbai 400050</p>
            <p className="text-[10px] text-muted-foreground tabular">GSTIN 27AAACR5055K1Z5</p>
            <div className="mt-2 inline-block px-3 py-0.5 rounded-full bg-brand-soft text-brand-soft-foreground text-[10px] uppercase tracking-[0.18em] font-bold">
              Payment Receipt
            </div>
          </div>

          {/* Receipt meta */}
          <div className="flex justify-between items-center text-xs">
            <span><span className="text-muted-foreground">Receipt No.</span> <span className="font-semibold tabular">{receiptNo}</span></span>
            <span className="tabular">{formatDateLong(new Date())} · {formatTime(new Date())}</span>
          </div>

          {/* Body */}
          <table className="w-full text-sm">
            <tbody>
              <ReceiptRow k="Received From" v={reservation.guestName} />
              {guest && <ReceiptRow k="Phone" v={guest.phone} />}
              <ReceiptRow k="Booking Number" v={<span className="tabular">{reservation.bookingNo}</span>} />
              <ReceiptRow k="Room" v={`${reservation.roomNumber} · ${reservation.roomType}`} />
              <ReceiptRow k="Stay" v={`${formatDate(reservation.checkIn)} → ${formatDate(reservation.checkOut)} · ${reservation.nights}N`} />
              <ReceiptRow k="Towards" v="Final settlement — Tax Invoice" />
              <ReceiptRow k="Payment Mode" v={paymentMode} />
              {paymentMode === "UPI" && <ReceiptRow k="UPI ID" v={<span className="font-mono tabular">pearlpalace@hdfcbank</span>} />}
              <ReceiptRow k="Transaction Ref." v={<span className="tabular text-muted-foreground italic">Pending entry</span>} />
            </tbody>
          </table>

          {/* Amount block */}
          <div className="rounded-md bg-brand-soft/40 border border-brand/30 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Amount Received</span>
              <span className="text-2xl font-bold tabular text-brand-soft-foreground">{money(balance)}</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 italic">
              In Words: <span className="text-foreground font-medium">{amountInWords} Rupees Only</span>
            </p>
          </div>

          {/* Footer signature */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t-2 border-double border-border">
            <div>
              <p className="text-[10px] text-muted-foreground italic mb-6">Received with thanks.</p>
              <p className="border-t border-border pt-1 text-[10px] text-muted-foreground tabular">Cashier · Khalid R.</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground italic mb-6">For {name}</p>
              <p className="border-t border-border pt-1 text-[10px] text-muted-foreground tabular">Authorised Signatory</p>
            </div>
          </div>

          <p className="text-[9px] text-muted-foreground italic text-center border-t border-border pt-2">
            This is a computer-generated receipt. Subject to realisation. Original for Recipient · Duplicate for Hotel records.
          </p>
        </div>
        <div className="flex justify-end gap-2 pt-3 border-t border-border">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Download className="h-4 w-4" />Save as PDF
          </Button>
          <Button onClick={() => window.print()}><Printer className="h-4 w-4" />Print Now</Button>
        </div>
      </div>
    </ModalShell>
  );
}

function ReceiptRow({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <tr className="border-b border-border/40">
      <td className="py-1.5 text-xs text-muted-foreground w-1/3">{k}</td>
      <td className="py-1.5 text-sm">: {v}</td>
    </tr>
  );
}

// Indian-style number-to-words for receipts (Lakh / Crore)
function numberToWords(n: number): string {
  if (n === 0) return "Zero";
  if (n < 0) return "Minus " + numberToWords(-n);
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  function two(num: number): string {
    if (num < 20) return ones[num];
    return tens[Math.floor(num / 10)] + (num % 10 ? " " + ones[num % 10] : "");
  }
  function three(num: number): string {
    if (num >= 100) return ones[Math.floor(num / 100)] + " Hundred" + (num % 100 ? " " + two(num % 100) : "");
    return two(num);
  }
  let out = "";
  const crore = Math.floor(n / 10000000); n %= 10000000;
  const lakh = Math.floor(n / 100000); n %= 100000;
  const thousand = Math.floor(n / 1000); n %= 1000;
  if (crore) out += three(crore) + " Crore ";
  if (lakh) out += three(lakh) + " Lakh ";
  if (thousand) out += three(thousand) + " Thousand ";
  if (n) out += three(n);
  return out.trim();
}
