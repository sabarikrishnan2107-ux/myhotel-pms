"use client";
import * as React from "react";
import {
  Home,
  UtensilsCrossed,
  Receipt,
  Sparkles,
  MessageCircle,
  Wifi,
  BellRing,
  Bath,
  Wrench,
  Clock,
  CalendarDays,
  ShoppingBag,
  Plus,
  Minus,
  CreditCard,
  Coins,
  Plane,
  Stethoscope,
  Shirt,
  Mic,
  Send,
  Bot,
  ChevronRight,
  MapPin,
  X,
  CheckCircle2,
  Hotel,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn, money, initials } from "@/lib/utils";
import { apiGet } from "@/lib/api";

// ---------- types & data ----------
type TabKey = "stay" | "order" | "folio" | "services" | "concierge";

type MenuItem = {
  id: string;
  name: string;
  desc: string;
  price: number;
  category: "Breakfast" | "Indian" | "Continental" | "Beverages";
};

const MENU: MenuItem[] = [
  { id: "m1", name: "Masala Dosa", desc: "Crispy crepe, potato masala, sambar", price: 320, category: "Breakfast" },
  { id: "m2", name: "Poha & Filter Coffee", desc: "Flattened rice with peanuts", price: 240, category: "Breakfast" },
  { id: "m3", name: "Butter Chicken & Naan", desc: "Slow-cooked tomato gravy", price: 680, category: "Indian" },
  { id: "m4", name: "Paneer Tikka Masala", desc: "Smoked cottage cheese in cashew gravy", price: 560, category: "Indian" },
  { id: "m5", name: "Truffle Mushroom Risotto", desc: "Arborio rice, parmesan, black truffle", price: 920, category: "Continental" },
  { id: "m6", name: "Grilled Atlantic Salmon", desc: "Lemon-butter, asparagus", price: 1480, category: "Continental" },
  { id: "m7", name: "Masala Chai", desc: "Spiced milk tea, pot of two", price: 180, category: "Beverages" },
  { id: "m8", name: "Fresh Lime Soda", desc: "Sweet, salt or mixed", price: 220, category: "Beverages" },
];

type FolioLine = { id: string; label: string; ts: string; amount: number };
const FOLIO_LINES: FolioLine[] = [
  { id: "f1", label: "Room tariff · Deluxe Sea View", ts: "30 May · check-in", amount: 12500 },
  { id: "f2", label: "Room tariff · Deluxe Sea View", ts: "31 May", amount: 12500 },
  { id: "f3", label: "In-room dining · Dinner", ts: "31 May · 21:14", amount: 2840 },
  { id: "f4", label: "Spa · Ayurvedic massage 60min", ts: "01 Jun · 11:30", amount: 4500 },
  { id: "f5", label: "Mini bar · Assorted", ts: "01 Jun · 23:02", amount: 620 },
  { id: "f6", label: "Laundry · 4 items express", ts: "02 Jun · 08:15", amount: 980 },
];

type ChatMsg = { id: string; from: "guest" | "concierge"; text: string; ts: string };
const CHAT_SEED: ChatMsg[] = [
  { id: "c1", from: "concierge", text: "Namaste Anjali! Welcome to The Pearl Marina. How may I assist you today?", ts: "09:42" },
  { id: "c2", from: "guest", text: "Could you arrange a cab to the Gateway of India around 4 pm?", ts: "09:43" },
  { id: "c3", from: "concierge", text: "Of course. A Toyota Innova is booked for 16:00 · ₹1,200 round-trip. Driver Mr. Rajesh will meet you at the porte-cochère.", ts: "09:44" },
];

type ServiceKey = "spa" | "laundry" | "transfer" | "doctor" | "wakeup";

// ---------- page ----------
export default function GuestPortalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);

  const [toast, setToast] = React.useState<string | null>(null);
  const showToast = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2500);
  };

  const [tab, setTab] = React.useState<TabKey>("stay");

  const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
    { key: "stay", label: "My Stay", icon: Home },
    { key: "order", label: "Order", icon: UtensilsCrossed },
    { key: "folio", label: "Folio", icon: Receipt },
    { key: "services", label: "Services", icon: Sparkles },
    { key: "concierge", label: "Concierge", icon: MessageCircle },
  ];

  // Read-only live data: resolve this stay from real guest → booking → folio.
  // Falls back to the demo values offline so the portal always renders.
  const [guestName, setGuestName] = React.useState("Anjali Iyer");
  const [roomNo, setRoomNo] = React.useState("412");
  const [folioLines, setFolioLines] = React.useState<FolioLine[]>(FOLIO_LINES);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const guests = await apiGet<{ id: number | string; name: string }[]>("/guests");
        const g = guests.find(x => String(x.id) === String(id));
        if (!g || cancelled) return;
        setGuestName(g.name);

        const bookings = await apiGet<{ guestName: string; roomNumber?: string; bookingNo: string; status?: string }[]>("/bookings");
        const mine = bookings.filter(b => (b.guestName ?? "").toLowerCase() === g.name.toLowerCase());
        const booking = mine.find(b => /house|check|stay/i.test(b.status ?? "")) ?? mine[0];
        if (!booking || cancelled) return;
        if (booking.roomNumber) setRoomNo(booking.roomNumber);

        const charges = await apiGet<{ id: number | string; description: string; date: string; amount: number }[]>(
          `/folio-charges?bookingNo=${encodeURIComponent(booking.bookingNo)}`,
        );
        if (charges.length && !cancelled) {
          setFolioLines(charges.map(c => ({ id: String(c.id), label: c.description, ts: c.date, amount: c.amount })));
        }
      } catch {
        /* offline → keep the demo fallback */
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  return (
    <div className="min-h-screen bg-surface-sunken/40">
      <div className="max-w-md mx-auto bg-background min-h-screen pb-24 relative">
        {/* sticky brand bar */}
        <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
          <div className="px-4 pt-4 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-brand to-accent flex items-center justify-center shadow-sm">
                <Hotel className="h-5 w-5 text-white" />
              </div>
              <div className="leading-tight">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">MYHOTEL · Stay #{id}</div>
                <div className="text-sm font-semibold">The Pearl Marina</div>
              </div>
            </div>
            <Badge tone="success">
              <span className="h-1.5 w-1.5 rounded-full bg-success" /> Checked in
            </Badge>
          </div>

          {/* top tabs */}
          <div className="px-2 pb-1 overflow-x-auto">
            <div className="flex gap-1 min-w-max">
              {tabs.map((t) => {
                const Icon = t.icon;
                const active = tab === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-md border-b-2 transition-colors",
                      active
                        ? "border-brand text-brand"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="px-4 py-4 space-y-4">
          {tab === "stay" && <MyStayTab guestName={guestName} roomNo={roomNo} showToast={showToast} />}
          {tab === "order" && <OrderTab roomNo={roomNo} showToast={showToast} />}
          {tab === "folio" && <FolioTab showToast={showToast} folioLines={folioLines} />}
          {tab === "services" && <ServicesTab showToast={showToast} />}
          {tab === "concierge" && <ConciergeTab guestName={guestName} showToast={showToast} />}
        </div>

        {toast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-foreground text-background rounded-lg px-4 py-3 text-sm shadow-2xl max-w-[90%]">
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- MY STAY ----------
function MyStayTab({
  guestName,
  roomNo,
  showToast,
}: {
  guestName: string;
  roomNo: string;
  showToast: (m: string) => void;
}) {
  const quickActions = [
    { key: "rs", label: "Room service", icon: BellRing, msg: "Room service notified — server on the way" },
    { key: "hk", label: "Housekeeping", icon: Bath, msg: "Housekeeping requested — arrival in 15 minutes" },
    { key: "mt", label: "Maintenance", icon: Wrench, msg: "Maintenance ticket #M-2419 raised" },
    { key: "co", label: "Late checkout", icon: Clock, msg: "Late checkout till 2 PM requested" },
  ];

  return (
    <div className="space-y-4">
      {/* welcome card */}
      <Card className="overflow-hidden bg-gradient-to-br from-brand to-accent text-white border-0">
        <div className="p-5">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-lg font-semibold ring-2 ring-white/40">
              {initials(guestName)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs opacity-80">Welcome back</div>
              <div className="text-lg font-semibold leading-tight truncate">{guestName}</div>
              <div className="text-xs opacity-90 mt-0.5">Pearl Privilege · Gold tier</div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-md bg-white/15 backdrop-blur p-2.5">
              <div className="opacity-80 uppercase tracking-wider text-[10px]">Room</div>
              <div className="font-semibold text-base tabular">{roomNo}</div>
              <div className="opacity-90 text-[11px]">Deluxe Sea View</div>
            </div>
            <div className="rounded-md bg-white/15 backdrop-blur p-2.5">
              <div className="opacity-80 uppercase tracking-wider text-[10px]">Stay</div>
              <div className="font-semibold text-base tabular">30 May – 03 Jun</div>
              <div className="opacity-90 text-[11px]">4 nights · 2 adults</div>
            </div>
          </div>

          <div className="mt-3 rounded-md bg-white/15 backdrop-blur p-2.5 flex items-center gap-2.5">
            <Wifi className="h-4 w-4 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[11px] opacity-80">Wi-Fi</div>
              <div className="text-xs font-medium truncate">PearlGuest · pass: stay2026</div>
            </div>
            <button
              onClick={() => showToast("Wi-Fi password copied")}
              className="text-[11px] font-medium px-2 py-1 rounded bg-white/25 hover:bg-white/35 transition-colors"
            >
              Copy
            </button>
          </div>
        </div>
      </Card>

      {/* quick actions */}
      <div>
        <div className="px-1 pb-2 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
          Quick actions
        </div>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.key}
                onClick={() => showToast(a.msg)}
                className="text-left"
              >
                <Card className="p-3 hover:shadow-md transition-shadow active:scale-[0.98]">
                  <div className="h-10 w-10 rounded-xl bg-brand-soft text-brand-soft-foreground flex items-center justify-center mb-2">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="text-sm font-medium">{a.label}</div>
                  <div className="text-[11px] text-muted-foreground">Tap to request</div>
                </Card>
              </button>
            );
          })}
        </div>
      </div>

      {/* today at hotel */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-brand" />
            <div className="text-sm font-semibold">Today at the hotel</div>
          </div>
          <Badge tone="info">02 Jun</Badge>
        </div>

        <div className="space-y-2.5">
          <TodayItem
            time="07:00 – 10:30"
            title="Sunrise breakfast"
            sub="Coral · ground floor"
            tone="info"
          />
          <TodayItem
            time="18:00 – 19:30"
            title="Pearl high tea"
            sub="Atrium lounge · ₹850 / guest"
            tone="accent"
          />
          <TodayItem
            time="20:30"
            title="Live ghazal night"
            sub="Marina rooftop · complimentary"
            tone="brand"
          />
        </div>

        <button
          onClick={() => showToast("Opening full hotel directory")}
          className="mt-3 w-full text-xs text-brand font-medium flex items-center justify-center gap-1 hover:underline"
        >
          See full directory <ChevronRight className="h-3 w-3" />
        </button>
      </Card>

      <Card className="p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-accent-soft text-accent flex items-center justify-center shrink-0">
          <MapPin className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">Mumbai · 28°C, partly cloudy</div>
          <div className="text-[11px] text-muted-foreground">Light evening showers expected · monsoon onset</div>
        </div>
      </Card>
    </div>
  );
}

function TodayItem({
  time,
  title,
  sub,
  tone,
}: {
  time: string;
  title: string;
  sub: string;
  tone: "brand" | "accent" | "info";
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-20 shrink-0">
        <Badge tone={tone}>{time}</Badge>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium leading-tight">{title}</div>
        <div className="text-[11px] text-muted-foreground">{sub}</div>
      </div>
    </div>
  );
}

// ---------- ORDER ----------
function OrderTab({ roomNo, showToast }: { roomNo: string; showToast: (m: string) => void }) {
  const [cart, setCart] = React.useState<Record<string, number>>({});

  const inc = (id: string) => setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
  const dec = (id: string) =>
    setCart((c) => {
      const n = (c[id] ?? 0) - 1;
      const next = { ...c };
      if (n <= 0) delete next[id];
      else next[id] = n;
      return next;
    });

  const totalItems = Object.values(cart).reduce((a, b) => a + b, 0);
  const totalAmt = Object.entries(cart).reduce(
    (sum, [id, q]) => sum + (MENU.find((m) => m.id === id)?.price ?? 0) * q,
    0
  );

  const groups = ["Breakfast", "Indian", "Continental", "Beverages"] as const;

  return (
    <div className="space-y-4">
      <Card className="p-3 flex items-center gap-2 bg-accent-soft border-accent/20">
        <UtensilsCrossed className="h-4 w-4 text-accent shrink-0" />
        <div className="text-xs text-accent-foreground">
          In-room dining · Live until 23:30 · Delivered to room {roomNo}
        </div>
      </Card>

      {groups.map((g) => {
        const items = MENU.filter((m) => m.category === g);
        return (
          <div key={g}>
            <div className="px-1 pb-2 flex items-center justify-between">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                {g}
              </div>
              <div className="text-[10px] text-muted-foreground">{items.length} items</div>
            </div>
            <div className="space-y-2">
              {items.map((m) => {
                const qty = cart[m.id] ?? 0;
                return (
                  <Card key={m.id} className="p-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium leading-tight">{m.name}</div>
                      <div className="text-[11px] text-muted-foreground line-clamp-1">{m.desc}</div>
                      <div className="text-xs font-semibold tabular mt-1">{money(m.price)}</div>
                    </div>
                    {qty === 0 ? (
                      <Button size="sm" variant="outline" onClick={() => inc(m.id)}>
                        <Plus className="h-3.5 w-3.5" /> Add
                      </Button>
                    ) : (
                      <div className="flex items-center gap-1.5 rounded-full border border-brand/40 bg-brand-soft px-1">
                        <button
                          onClick={() => dec(m.id)}
                          className="h-7 w-7 rounded-full flex items-center justify-center text-brand-soft-foreground hover:bg-white/40"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="text-xs font-semibold tabular w-4 text-center text-brand-soft-foreground">
                          {qty}
                        </span>
                        <button
                          onClick={() => inc(m.id)}
                          className="h-7 w-7 rounded-full flex items-center justify-center text-brand-soft-foreground hover:bg-white/40"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* floating cart */}
      {totalItems > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[90%] max-w-md z-40 px-2">
          <Card className="p-3 shadow-2xl border-brand/30 bg-foreground text-background">
            <div className="flex items-center gap-3">
              <div className="relative">
                <ShoppingBag className="h-5 w-5" />
                <span className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 rounded-full bg-accent text-[10px] font-bold flex items-center justify-center text-white">
                  {totalItems}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs opacity-80">Order to room {roomNo}</div>
                <div className="text-sm font-semibold tabular">{money(totalAmt)}</div>
              </div>
              <Badge tone="success" className="bg-success/20 text-success border-0">
                <Clock className="h-3 w-3" /> 25 min
              </Badge>
              <Button
                size="sm"
                onClick={() => {
                  showToast(`Order placed · ${totalItems} items · ETA 25 min`);
                  setCart({});
                }}
              >
                Send
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// ---------- FOLIO ----------
function FolioTab({ showToast, folioLines = FOLIO_LINES }: { showToast: (m: string) => void; folioLines?: FolioLine[] }) {
  const [tipOpen, setTipOpen] = React.useState(false);
  const [tip, setTip] = React.useState<number>(500);

  const subtotal = folioLines.reduce((s, l) => s + l.amount, 0);
  const gst = Math.round(subtotal * 0.18);
  const total = subtotal + gst;

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-gradient-to-br from-foreground to-foreground/90 text-background border-0">
        <div className="text-[11px] opacity-70 uppercase tracking-wider">Running tab · Folio F-20418</div>
        <div className="text-3xl font-semibold tabular mt-1">{money(total)}</div>
        <div className="text-[11px] opacity-70 mt-0.5">
          Inclusive of GST {money(gst)} · settles on checkout 03 Jun
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button
            size="sm"
            className="bg-white text-foreground hover:bg-white/90"
            onClick={() => showToast(`Pre-payment of ${money(total)} processed`)}
          >
            <CreditCard className="h-4 w-4" /> Pre-pay now
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-white/40 text-background bg-white/10 hover:bg-white/20"
            onClick={() => setTipOpen(true)}
          >
            <Coins className="h-4 w-4" /> Add tip
          </Button>
        </div>
      </Card>

      <div>
        <div className="px-1 pb-2 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
          Line items
        </div>
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-sunken/40">
              <tr className="text-[10px] uppercase text-muted-foreground">
                <th className="text-left px-3 py-2 font-medium">Charge</th>
                <th className="text-right px-3 py-2 font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {folioLines.map((l) => (
                <tr key={l.id} className="border-t border-border">
                  <td className="px-3 py-2.5">
                    <div className="text-sm leading-tight">{l.label}</div>
                    <div className="text-[11px] text-muted-foreground">{l.ts}</div>
                  </td>
                  <td className="px-3 py-2.5 text-right text-sm tabular font-medium">{money(l.amount)}</td>
                </tr>
              ))}
              <tr className="border-t border-border bg-surface-sunken/40">
                <td className="px-3 py-2 text-xs text-muted-foreground">Subtotal</td>
                <td className="px-3 py-2 text-right text-xs tabular">{money(subtotal)}</td>
              </tr>
              <tr className="border-t border-border bg-surface-sunken/40">
                <td className="px-3 py-2 text-xs text-muted-foreground">GST · CGST 9% + SGST 9%</td>
                <td className="px-3 py-2 text-right text-xs tabular">{money(gst)}</td>
              </tr>
              <tr className="border-t border-border bg-surface-sunken/40">
                <td className="px-3 py-2.5 text-sm font-semibold">Total payable</td>
                <td className="px-3 py-2.5 text-right text-sm font-bold tabular">{money(total)}</td>
              </tr>
            </tbody>
          </table>
        </Card>
      </div>

      <Card className="p-3 flex items-center gap-3 bg-success-soft border-success/20">
        <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
        <div className="text-xs text-success">
          Auto-checkout enabled · folio will be emailed and charged to your saved card ending 4827.
        </div>
      </Card>

      {tipOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          onClick={() => setTipOpen(false)}
        >
          <Card
            className="w-full max-w-md p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold">Add tip to housekeeping</div>
              <button onClick={() => setTipOpen(false)} className="text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="text-xs text-muted-foreground mb-3">
              100% of tips go to the team that served you.
            </div>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {[200, 500, 1000, 2000].map((v) => (
                <button
                  key={v}
                  onClick={() => setTip(v)}
                  className={cn(
                    "py-2 rounded-md text-sm font-medium tabular border transition-colors",
                    tip === v
                      ? "border-brand bg-brand-soft text-brand-soft-foreground"
                      : "border-border bg-surface hover:bg-surface-sunken/40"
                  )}
                >
                  {money(v)}
                </button>
              ))}
            </div>
            <Label className="text-xs">Custom amount</Label>
            <Input
              type="number"
              value={tip}
              onChange={(e) => setTip(Number(e.target.value) || 0)}
              className="mt-1 mb-3"
            />
            <Button
              className="w-full"
              onClick={() => {
                showToast(`Tip of ${money(tip)} added to folio`);
                setTipOpen(false);
              }}
            >
              Add {money(tip)}
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}

// ---------- SERVICES ----------
function ServicesTab({ showToast }: { showToast: (m: string) => void }) {
  const [open, setOpen] = React.useState<ServiceKey | null>(null);

  const services: {
    key: ServiceKey;
    name: string;
    sub: string;
    icon: React.ElementType;
    tone: "brand" | "accent" | "info" | "success" | "warning";
  }[] = [
    { key: "spa", name: "Spa booking", sub: "Ayurvedic, Swedish, hot stone", icon: Sparkles, tone: "brand" },
    { key: "laundry", name: "Laundry & pressing", sub: "Same day, express slots", icon: Shirt, tone: "info" },
    { key: "transfer", name: "Airport transfer", sub: "Sedan, SUV, luxury", icon: Plane, tone: "accent" },
    { key: "doctor", name: "Doctor on call", sub: "24×7 in-house physician", icon: Stethoscope, tone: "success" },
    { key: "wakeup", name: "Wake-up call", sub: "Schedule a courtesy call", icon: BellRing, tone: "warning" },
  ];

  return (
    <div className="space-y-3">
      <div className="px-1 pb-1 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
        Premium services
      </div>
      {services.map((s) => {
        const Icon = s.icon;
        return (
          <button key={s.key} className="w-full text-left" onClick={() => setOpen(s.key)}>
            <Card className="p-3 flex items-center gap-3 hover:shadow-md transition-shadow active:scale-[0.99]">
              <div
                className={cn(
                  "h-11 w-11 rounded-xl flex items-center justify-center shrink-0",
                  s.tone === "brand" && "bg-brand-soft text-brand-soft-foreground",
                  s.tone === "accent" && "bg-accent-soft text-accent",
                  s.tone === "info" && "bg-info-soft text-info",
                  s.tone === "success" && "bg-success-soft text-success",
                  s.tone === "warning" && "bg-warning-soft text-warning"
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{s.name}</div>
                <div className="text-[11px] text-muted-foreground">{s.sub}</div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Card>
          </button>
        );
      })}

      {open && <ServiceSheet which={open} onClose={() => setOpen(null)} showToast={showToast} />}
    </div>
  );
}

function ServiceSheet({
  which,
  onClose,
  showToast,
}: {
  which: ServiceKey;
  onClose: () => void;
  showToast: (m: string) => void;
}) {
  const titles: Record<ServiceKey, string> = {
    spa: "Book a spa session",
    laundry: "Send laundry",
    transfer: "Book airport transfer",
    doctor: "Request a doctor",
    wakeup: "Schedule wake-up call",
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end justify-center"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-md rounded-b-none p-5 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="text-base font-semibold">{titles[which]}</div>
          <button onClick={onClose} className="text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {which === "spa" && <SpaForm onConfirm={() => { showToast("Spa booked · 11:30 tomorrow · ₹4,500"); onClose(); }} />}
        {which === "laundry" && <LaundryForm onConfirm={() => { showToast("Laundry pickup at 15:00 confirmed"); onClose(); }} />}
        {which === "transfer" && <TransferForm onConfirm={() => { showToast("Airport pickup booked · driver Karan Mehta"); onClose(); }} />}
        {which === "doctor" && <DoctorForm onConfirm={() => { showToast("Doctor will arrive in 12 minutes"); onClose(); }} />}
        {which === "wakeup" && <WakeupForm onConfirm={() => { showToast("Wake-up call set for 06:30"); onClose(); }} />}
      </Card>
    </div>
  );
}

function SpaForm({ onConfirm }: { onConfirm: () => void }) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Treatment</Label>
        <Select className="mt-1">
          <option>Ayurvedic Abhyanga · 60 min · ₹4,500</option>
          <option>Swedish full-body · 90 min · ₹6,800</option>
          <option>Hot stone therapy · 75 min · ₹5,900</option>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Date</Label>
          <Input type="date" defaultValue="2026-06-03" className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">Time</Label>
          <Select className="mt-1">
            <option>09:00</option>
            <option>11:30</option>
            <option>15:00</option>
            <option>18:00</option>
          </Select>
        </div>
      </div>
      <div>
        <Label className="text-xs">Therapist preference</Label>
        <Select className="mt-1">
          <option>Any available</option>
          <option>Female therapist</option>
          <option>Male therapist</option>
        </Select>
      </div>
      <Button className="w-full" onClick={onConfirm}>Confirm booking</Button>
    </div>
  );
}

function LaundryForm({ onConfirm }: { onConfirm: () => void }) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Service type</Label>
        <Select className="mt-1">
          <option>Regular · 24 hrs · from ₹120 / piece</option>
          <option>Express · 6 hrs · from ₹220 / piece</option>
          <option>Dry clean only · 48 hrs · from ₹280 / piece</option>
        </Select>
      </div>
      <div>
        <Label className="text-xs">Pickup slot</Label>
        <Select className="mt-1">
          <option>Today · 10:00 – 12:00</option>
          <option>Today · 15:00 – 17:00</option>
          <option>Tomorrow · 08:00 – 10:00</option>
        </Select>
      </div>
      <div>
        <Label className="text-xs">Notes for housekeeping</Label>
        <Input placeholder="e.g. starch on cotton shirts" className="mt-1" />
      </div>
      <Button className="w-full" onClick={onConfirm}>Request pickup</Button>
    </div>
  );
}

function TransferForm({ onConfirm }: { onConfirm: () => void }) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Vehicle</Label>
        <Select className="mt-1">
          <option>Toyota Innova · sedan · ₹1,800</option>
          <option>Toyota Fortuner · SUV · ₹2,800</option>
          <option>Mercedes E-class · luxury · ₹5,500</option>
        </Select>
      </div>
      <div>
        <Label className="text-xs">Destination</Label>
        <Select className="mt-1">
          <option>Chhatrapati Shivaji T2 · International</option>
          <option>Chhatrapati Shivaji T1 · Domestic</option>
          <option>BKC corporate park</option>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Pickup date</Label>
          <Input type="date" defaultValue="2026-06-03" className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">Pickup time</Label>
          <Input type="time" defaultValue="14:00" className="mt-1" />
        </div>
      </div>
      <Button className="w-full" onClick={onConfirm}>Book transfer</Button>
    </div>
  );
}

function DoctorForm({ onConfirm }: { onConfirm: () => void }) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Urgency</Label>
        <Select className="mt-1">
          <option>Standard · within 30 min</option>
          <option>Urgent · within 10 min · ₹500 surcharge</option>
        </Select>
      </div>
      <div>
        <Label className="text-xs">Briefly describe symptoms</Label>
        <Input placeholder="e.g. mild fever, body ache" className="mt-1" />
      </div>
      <div>
        <Label className="text-xs">Any allergies?</Label>
        <Input placeholder="e.g. penicillin" className="mt-1" />
      </div>
      <Button className="w-full" onClick={onConfirm}>Request doctor</Button>
    </div>
  );
}

function WakeupForm({ onConfirm }: { onConfirm: () => void }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Time</Label>
          <Input type="time" defaultValue="06:30" className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">Repeat</Label>
          <Select className="mt-1">
            <option>Once</option>
            <option>Daily during stay</option>
          </Select>
        </div>
      </div>
      <div>
        <Label className="text-xs">Add with call</Label>
        <Select className="mt-1">
          <option>Just a courtesy call</option>
          <option>Include hot tea / coffee</option>
          <option>Include continental breakfast</option>
        </Select>
      </div>
      <Button className="w-full" onClick={onConfirm}>Schedule call</Button>
    </div>
  );
}

// ---------- CONCIERGE ----------
function ConciergeTab({ guestName, showToast }: { guestName: string; showToast: (m: string) => void }) {
  const [messages, setMessages] = React.useState<ChatMsg[]>(CHAT_SEED);
  const [draft, setDraft] = React.useState("");

  const send = () => {
    if (!draft.trim()) return;
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setMessages((m) => [
      ...m,
      { id: `g-${m.length}`, from: "guest", text: draft.trim(), ts: now },
    ]);
    setDraft("");
    setTimeout(() => {
      setMessages((m) => [
        ...m,
        {
          id: `c-${m.length}`,
          from: "concierge",
          text: "Noted! I will check with the team and get back to you shortly.",
          ts: now,
        },
      ]);
    }, 800);
    showToast("Message sent to concierge");
  };

  return (
    <div className="space-y-3">
      <Card className="p-3 flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-brand-soft text-brand-soft-foreground flex items-center justify-center">
          <Bot className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold">Pearl Concierge</div>
          <div className="text-[11px] text-success flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-success" /> Live · usually replies in 2 min
          </div>
        </div>
        <Badge tone="brand">{guestName.split(" ")[0]}</Badge>
      </Card>

      <Card className="p-3 space-y-3 min-h-[280px]">
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn("flex", m.from === "guest" ? "justify-end" : "justify-start")}
          >
            <div className="max-w-[80%]">
              <div
                className={cn(
                  "rounded-2xl px-3 py-2 text-sm leading-snug shadow-sm",
                  m.from === "guest"
                    ? "bg-brand text-white rounded-br-sm"
                    : "bg-surface-sunken/60 text-foreground rounded-bl-sm"
                )}
              >
                {m.text}
              </div>
              <div
                className={cn(
                  "text-[10px] text-muted-foreground mt-0.5",
                  m.from === "guest" ? "text-right" : "text-left"
                )}
              >
                {m.ts}
              </div>
            </div>
          </div>
        ))}
      </Card>

      {/* suggestions */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {["Book a table tonight", "Recommend nearby attractions", "Extend my stay by 1 night"].map((s) => (
          <button
            key={s}
            onClick={() => setDraft(s)}
            className="text-[11px] whitespace-nowrap px-3 py-1.5 rounded-full border border-border bg-surface hover:bg-surface-sunken/40 transition-colors"
          >
            {s}
          </button>
        ))}
      </div>

      {/* input */}
      <Card className="p-2 flex items-center gap-2 sticky bottom-4">
        <button
          onClick={() => showToast("Voice message recording started")}
          className="h-9 w-9 rounded-full bg-accent text-white flex items-center justify-center shrink-0 hover:opacity-90"
        >
          <Mic className="h-4 w-4" />
        </button>
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Type a message…"
          className="flex-1 border-0 shadow-none focus-visible:ring-0 h-9"
        />
        <button
          onClick={send}
          disabled={!draft.trim()}
          className={cn(
            "h-9 w-9 rounded-full flex items-center justify-center shrink-0",
            draft.trim() ? "bg-brand text-white hover:opacity-90" : "bg-surface-sunken text-muted-foreground"
          )}
        >
          <Send className="h-4 w-4" />
        </button>
      </Card>
    </div>
  );
}
