"use client";
import * as React from "react";
import Link from "next/link";
import { use } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, CreditCard, Banknote, Smartphone, Building2, Wallet, CheckCircle2, UsersRound, ArrowRight } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { cn, money, formatDate } from "@/lib/utils";
import { apiGet, apiPost, apiPut } from "@/lib/api";
import { computeGroupTotals, type GstSlab } from "@/lib/group-pricing";
import { mealPerNightPerGuest } from "@/lib/booking-pricing";
import { PaymentReceipt, type PaymentReceiptData, type ReceiptSummaryLine } from "@/components/billing/payment-receipt";
import { type GroupBooking } from "@/lib/mock-data-ext";

type BillMode = "group" | "split" | "room";
const billModeOf = (e: { billTo?: string | null }): BillMode => e.billTo === "self" ? "split" : ((e.billTo as BillMode) || "group");
type RoomingEntry = { id: string; roomNo?: string | null; roomType: string; lead: string; billTo?: string | null };
type ChargeRow = { id: string | number; amount: number };
type RatePlanCfg = { code: string; name: string; inclBreakfast?: boolean; inclLunch?: boolean; inclDinner?: boolean; breakfastPrice?: number; lunchPrice?: number; dinnerPrice?: number };
type GroupSvcCfg = { name: string; price: number; perPax: boolean; gst: number };
type RoomTypeCfg = { name: string; extraAdultRate?: number };

const PAY_MODES = [
  { id: "Cash", icon: Banknote },
  { id: "Card", icon: CreditCard },
  { id: "UPI", icon: Smartphone },
  { id: "Bank", icon: Building2 },
  { id: "Online", icon: Wallet },
] as const;

export default function GroupPaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [group, setGroup] = React.useState<GroupBooking | null>(null);
  const [rooming, setRooming] = React.useState<RoomingEntry[]>([]);
  const [masterExtras, setMasterExtras] = React.useState<ChargeRow[]>([]);
  const [selfCharges, setSelfCharges] = React.useState<Record<string, ChargeRow[]>>({});
  const [selfPayments, setSelfPayments] = React.useState<Record<string, ChargeRow[]>>({});
  const [ratePlans, setRatePlans] = React.useState<RatePlanCfg[]>([]);
  const [gstSlabs, setGstSlabs] = React.useState<GstSlab[]>([]);
  const [svcCatalog, setSvcCatalog] = React.useState<GroupSvcCfg[]>([]);
  const [roomTypes, setRoomTypes] = React.useState<RoomTypeCfg[]>([]);
  // Payment must not be collectable until every pricing input has settled:
  // computeGroupTotals understates the total until gst-slabs / rate-plan /
  // services / room-types load, so a click during that window would post an
  // underpayment and clear the balance against the wrong figure.
  const [pricingReady, setPricingReady] = React.useState(false);

  React.useEffect(() => {
    const jobs = [
      apiGet<GroupBooking[]>("/group-bookings")
        .then(rows => {
          const m = rows.find(g => g.code === id);
          if (m) setGroup({ ...m, id: String(m.id), block: m.block ?? [], services: m.services ?? [] });
        }),
      apiGet<RoomingEntry[]>(`/group-rooming?groupCode=${encodeURIComponent(id)}`)
        .then(rows => { if (Array.isArray(rows)) setRooming(rows.map(r => ({ ...r, id: String(r.id) }))); }),
      apiGet<ChargeRow[]>(`/folio-charges?bookingNo=${encodeURIComponent(id)}`).then(setMasterExtras),
      apiGet<RatePlanCfg[]>("/rate-plans").then(r => Array.isArray(r) && setRatePlans(r)),
      apiGet<GstSlab[]>("/gst-slabs").then(r => Array.isArray(r) && setGstSlabs(r)),
      apiGet<GroupSvcCfg[]>("/group-services").then(r => Array.isArray(r) && setSvcCatalog(r)),
      apiGet<RoomTypeCfg[]>("/room-types").then(r => Array.isArray(r) && setRoomTypes(r)),
    ];
    Promise.allSettled(jobs).then(() => setPricingReady(true));
  }, [id]);

  // Load each self-pay guest's own folio lines (charges + payments).
  React.useEffect(() => {
    rooming.filter(r => billModeOf(r) !== "group").forEach(r => {
      const key = `GRPG-${r.id}`;
      apiGet<ChargeRow[]>(`/folio-charges?bookingNo=${encodeURIComponent(key)}`)
        .then(rows => setSelfCharges(prev => ({ ...prev, [r.id]: rows }))).catch(() => {});
      apiGet<ChargeRow[]>(`/folio-payments?bookingNo=${encodeURIComponent(key)}`)
        .then(rows => setSelfPayments(prev => ({ ...prev, [r.id]: rows }))).catch(() => {});
    });
  }, [rooming]);

  const [mode, setMode] = React.useState<string>("Cash");
  const [reference, setReference] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [receipt, setReceipt] = React.useState<PaymentReceiptData | null>(null);
  const issuedRef = React.useRef<PaymentReceiptData | null>(null);
  const [done, setDone] = React.useState(false);

  if (!group) {
    return (
      <div className="p-6">
        <Link href={`/groups/${id}`} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"><ChevronLeft className="h-3.5 w-3.5" />Back</Link>
        <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">Loading payment…</div>
      </div>
    );
  }

  // --- Outstanding computation (mirrors the group detail folio) --------------
  const planCfg = ratePlans.find(p => p.code === group.ratePlan || p.name === group.ratePlan);
  const planMeals = mealPerNightPerGuest({
    inclB: !!planCfg?.inclBreakfast, inclL: !!planCfg?.inclLunch, inclD: !!planCfg?.inclDinner,
    breakfastPrice: planCfg?.breakfastPrice ?? 0, lunchPrice: planCfg?.lunchPrice ?? 0, dinnerPrice: planCfg?.dinnerPrice ?? 0,
  }) * (group.totalPax || 0) * (group.nights || 0);
  const extraBedRateOf = (b: { type: string; extraBedRate?: number }) => b.extraBedRate ?? (roomTypes.find(t => t.name === b.type)?.extraAdultRate ?? 0);
  const svcLines = (group.services ?? [])
    .map(name => svcCatalog.find(s => s.name === name))
    .filter((s): s is GroupSvcCfg => !!s)
    .map(s => ({ price: s.price, perPax: s.perPax, gst: s.gst }));
  const folio = computeGroupTotals(
    group.block.map(b => ({ rate: b.rate, qty: b.qty, extraBeds: b.extraBeds ?? 0, extraBedRate: extraBedRateOf(b) })),
    group.nights, svcLines, group.totalPax || 0, gstSlabs, planMeals,
  );
  const masterExtrasTotal = masterExtras.reduce((s, c) => s + (c.amount || 0), 0);
  const totalCharges = folio.grandTotal + masterExtrasTotal;
  const masterBalance = Math.max(0, Math.round(totalCharges - group.advance));

  const guestRoomRent = (e: RoomingEntry): number => {
    const b = group.block.find(bl => bl.type.toLowerCase() === e.roomType.toLowerCase());
    return b ? Math.round(b.rate * group.nights) : 0;
  };
  const dueFor = (e: RoomingEntry): number => {
    const room = billModeOf(e) === "room" ? guestRoomRent(e) : 0;
    const charges = (selfCharges[e.id] ?? []).reduce((s, c) => s + (c.amount || 0), 0);
    const paid = (selfPayments[e.id] ?? []).reduce((s, c) => s + (c.amount || 0), 0);
    return Math.max(0, room + charges - paid);
  };
  const owingGuests = rooming
    .filter(r => billModeOf(r) !== "group")
    .map(r => ({ id: r.id, lead: r.lead, roomNo: r.roomNo, due: dueFor(r) }))
    .filter(g => g.due > 0);
  const guestDuesTotal = owingGuests.reduce((s, g) => s + g.due, 0);
  const totalOutstanding = masterBalance + guestDuesTotal;

  const needsRef = mode !== "Cash";
  const refLabel = mode === "Card" ? "Card last 4 / auth code" : mode === "UPI" ? "UPI reference" : mode === "Bank" ? "UTR / bank ref" : "Transaction ID";

  const completePayment = async () => {
    if (submitting || !pricingReady || totalOutstanding <= 0) return;
    setSubmitting(true);
    const today = new Date().toISOString().slice(0, 10);
    const refSuffix = reference.trim() ? ` · ${reference.trim()}` : "";
    try {
      if (masterBalance > 0) {
        await apiPost("/folio-payments", { bookingNo: group.code, date: today, mode, amount: masterBalance, reference: `Group ${group.code} · payment${refSuffix}` }).catch(() => {});
        await apiPut(`/group-bookings/${group.id}`, { advance: group.advance + masterBalance, balance: Math.max(0, group.balance - masterBalance) }).catch(() => {});
      }
      for (const g of owingGuests) {
        await apiPost("/folio-payments", { bookingNo: `GRPG-${g.id}`, date: today, mode, amount: g.due, reference: `${g.lead} · self-pay extras${refSuffix}` }).catch(() => {});
      }
    } finally {
      setSubmitting(false);
    }
    const summary: ReceiptSummaryLine[] = [
      { label: "Total charges", value: totalCharges },
      { label: "Master balance settled", value: masterBalance, tone: "credit" },
    ];
    if (guestDuesTotal > 0) summary.push({ label: "Guest dues settled", value: guestDuesTotal, tone: "credit" });
    summary.push({ label: "Balance due", value: 0, tone: "bold" });
    const receiptData: PaymentReceiptData = {
      receiptNo: `RCP-${group.code}-PAY${Date.now().toString().slice(-6)}`,
      title: "Payment Receipt",
      towards: "Group booking — full settlement",
      payerName: group.name,
      reference: group.code,
      stay: `${formatDate(group.arrival)} → ${formatDate(group.departure)} · ${group.nights} night${group.nights === 1 ? "" : "s"}`,
      payment: { amount: totalOutstanding, mode, reference: reference.trim() || undefined, date: new Date().toISOString() },
      extraRows: owingGuests.length
        ? [{ k: "Guest dues settled", v: owingGuests.map(g => `${g.lead}${g.roomNo ? ` · Rm ${g.roomNo}` : ""} — ${money(g.due)}`).join("; ") }]
        : undefined,
      summary,
    };
    issuedRef.current = receiptData;
    setReceipt(receiptData);
    setDone(true);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <Link href={`/groups/${group.code}`} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ChevronLeft className="h-3.5 w-3.5" />Back to group
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-display font-medium tracking-tight">Complete Payment</h1>
        <p className="text-muted-foreground text-sm mt-1">{group.name} · <span className="tabular">{group.code}</span></p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        {/* Outstanding breakdown */}
        <Card className="p-5 space-y-4 h-fit">
          <CardTitle>Outstanding</CardTitle>
          <div className="rounded-md border border-border p-3 space-y-1.5 text-sm">
            <Row k="Group charges" v={money(totalCharges)} />
            <Row k="Received" v={money(group.advance)} />
            <div className="border-t border-border pt-1.5 mt-1.5">
              <Row k={masterBalance > 0 ? "Master balance" : "Master settled"} v={money(masterBalance)} tone={masterBalance > 0 ? "warning" : "success"} />
            </div>
          </div>

          {owingGuests.length > 0 && (
            <div className="rounded-md border border-warning/30 bg-warning-soft/20 p-3 space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-warning inline-flex items-center gap-1.5"><UsersRound className="h-3.5 w-3.5" />Guest self-pay dues</p>
              {owingGuests.map(g => (
                <div key={g.id} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{g.lead}{g.roomNo ? ` · Room ${g.roomNo}` : ""}</span>
                  <span className="tabular font-medium text-warning">{money(g.due)}</span>
                </div>
              ))}
              <div className="border-t border-warning/20 pt-1.5 flex items-center justify-between">
                <span className="text-xs font-semibold">Guest dues total</span>
                <span className="tabular font-semibold text-warning">{money(guestDuesTotal)}</span>
              </div>
            </div>
          )}

          <div className="rounded-md bg-surface-sunken/40 border border-border p-3 flex items-center justify-between">
            <span className="text-sm font-semibold">Total to collect</span>
            <span className={cn("text-xl font-bold tabular", totalOutstanding > 0 ? "text-warning" : "text-success")}>{money(totalOutstanding)}</span>
          </div>
        </Card>

        {/* Payment panel */}
        <Card className="p-5 space-y-4 h-fit lg:sticky lg:top-20">
          {!pricingReady ? (
            <div className="text-center py-8">
              <span className="h-10 w-10 rounded-full border-2 border-brand/30 border-t-brand inline-block animate-spin mb-3" />
              <p className="font-semibold">Calculating outstanding…</p>
              <p className="text-sm text-muted-foreground mt-1">Loading rates, taxes &amp; charges.</p>
            </div>
          ) : totalOutstanding <= 0 ? (
            <div className="text-center py-6">
              <span className="h-12 w-12 rounded-full bg-success-soft text-success inline-flex items-center justify-center mb-3"><CheckCircle2 className="h-6 w-6" /></span>
              <p className="font-semibold">Nothing to pay</p>
              <p className="text-sm text-muted-foreground mt-1">This group is fully settled.</p>
              <Link href={`/groups/${group.code}`}><Button className="mt-4 w-full" variant="outline">Back to group<ArrowRight className="h-4 w-4" /></Button></Link>
            </div>
          ) : done ? (
            <div className="text-center py-6">
              <span className="h-12 w-12 rounded-full bg-success-soft text-success inline-flex items-center justify-center mb-3"><CheckCircle2 className="h-6 w-6" /></span>
              <p className="font-semibold">Payment complete</p>
              <p className="text-sm text-muted-foreground mt-1">{money(totalOutstanding)} settled via {mode}.</p>
              <Button className="mt-4 w-full" onClick={() => router.push(`/groups/${group.code}`)}>Return to check out<ArrowRight className="h-4 w-4" /></Button>
              <button type="button" onClick={() => { if (issuedRef.current) setReceipt(issuedRef.current); }} className="text-xs text-brand hover:underline mt-2">View receipt again</button>
            </div>
          ) : (
            <>
              <CardTitle>Payment</CardTitle>
              <div>
                <Label className="text-xs">Amount</Label>
                <div className="mt-1 rounded-md border border-border bg-surface-sunken/40 px-3 py-2.5 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Total to collect</span>
                  <span className="text-2xl font-bold tabular">{money(totalOutstanding)}</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">Full settlement — master balance{guestDuesTotal > 0 ? " + guest dues" : ""}.</p>
              </div>

              <div>
                <Label className="text-xs">Payment method</Label>
                <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                  {PAY_MODES.map(m => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setMode(m.id)}
                        className={cn(
                          "h-14 rounded-md border text-xs font-medium transition-colors flex flex-col items-center justify-center gap-1",
                          mode === m.id ? "border-brand bg-brand-soft text-brand-soft-foreground" : "border-border hover:bg-surface-sunken text-muted-foreground",
                        )}
                      >
                        <Icon className="h-4 w-4" />{m.id}
                      </button>
                    );
                  })}
                </div>
              </div>

              {needsRef && (
                <div className="space-y-1.5">
                  <Label className="text-xs">{refLabel}</Label>
                  <Input value={reference} onChange={e => setReference(e.target.value)} placeholder={refLabel} className="tabular" />
                </div>
              )}

              <Button variant="success" size="lg" className="w-full" disabled={submitting} onClick={completePayment}>
                <CreditCard className="h-4 w-4" />{submitting ? "Processing…" : `Complete Payment · ${money(totalOutstanding)}`}
              </Button>
              <p className="text-[11px] text-muted-foreground text-center">A printable receipt is issued on completion. Then return to the group to check out.</p>
            </>
          )}
        </Card>
      </div>

      {receipt && <PaymentReceipt data={receipt} onClose={() => setReceipt(null)} />}
    </div>
  );
}

function Row({ k, v, tone }: { k: string; v: string; tone?: "warning" | "success" }) {
  return (
    <div className="flex items-center justify-between">
      <span className={cn("text-muted-foreground", tone === "warning" && "text-warning", tone === "success" && "text-success")}>{k}</span>
      <span className={cn("tabular font-medium", tone === "warning" && "text-warning font-semibold", tone === "success" && "text-success font-semibold")}>{v}</span>
    </div>
  );
}
