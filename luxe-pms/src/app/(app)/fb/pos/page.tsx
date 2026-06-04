"use client";
import * as React from "react";
import {
  UtensilsCrossed, Plus, Minus, Trash2, Send, Printer, Receipt, Percent,
  Scissors, Gift, CreditCard, Banknote, Smartphone, BedDouble, X, CheckCircle2,
  ChefHat, Users, Clock, TrendingUp, Flame, Salad, Cookie, Wine, Coffee,
  Beef, Soup, ImageIcon, Search,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn, money } from "@/lib/utils";

// ------------ DATA ------------
type TableStatus = "free" | "seated" | "ordering" | "billing" | "dirty";

type Tbl = {
  id: string;
  seats: number;
  status: TableStatus;
  server?: string;
  covers?: number;
  seatedAt?: string;
};

const TABLES: Tbl[] = [
  { id: "T1", seats: 2, status: "free" },
  { id: "T2", seats: 4, status: "seated", server: "Rohan", covers: 3, seatedAt: "12:42" },
  { id: "T3", seats: 4, status: "ordering", server: "Anita", covers: 4, seatedAt: "12:25" },
  { id: "T4", seats: 2, status: "free" },
  { id: "T5", seats: 6, status: "billing", server: "Vikram", covers: 5, seatedAt: "11:55" },
  { id: "T6", seats: 4, status: "dirty" },
  { id: "T7", seats: 2, status: "seated", server: "Rohan", covers: 2, seatedAt: "12:50" },
  { id: "T8", seats: 8, status: "ordering", server: "Anita", covers: 7, seatedAt: "12:18" },
  { id: "T9", seats: 4, status: "free" },
  { id: "T10", seats: 4, status: "seated", server: "Vikram", covers: 4, seatedAt: "12:35" },
  { id: "T11", seats: 2, status: "free" },
  { id: "T12", seats: 6, status: "billing", server: "Priya", covers: 6, seatedAt: "12:02" },
  { id: "T13", seats: 4, status: "dirty" },
  { id: "T14", seats: 2, status: "seated", server: "Rohan", covers: 2, seatedAt: "12:48" },
  { id: "T15", seats: 4, status: "ordering", server: "Anita", covers: 3, seatedAt: "12:30" },
  { id: "T16", seats: 4, status: "free" },
  { id: "T17", seats: 8, status: "seated", server: "Vikram", covers: 6, seatedAt: "12:40" },
  { id: "T18", seats: 2, status: "free" },
  { id: "T19", seats: 4, status: "free" },
  { id: "T20", seats: 6, status: "ordering", server: "Priya", covers: 5, seatedAt: "12:22" },
];

const STATUS_TONE: Record<TableStatus, { tone: "success" | "info" | "warning" | "accent" | "neutral"; label: string; ring: string; bg: string; text: string; dot: string }> = {
  free: { tone: "success", label: "Free", ring: "ring-success/30", bg: "bg-success-soft", text: "text-success", dot: "bg-success" },
  seated: { tone: "info", label: "Seated", ring: "ring-info/30", bg: "bg-info-soft", text: "text-info", dot: "bg-info" },
  ordering: { tone: "warning", label: "Ordering", ring: "ring-warning/30", bg: "bg-warning-soft", text: "text-warning", dot: "bg-warning" },
  billing: { tone: "accent", label: "Billing", ring: "ring-accent/30", bg: "bg-accent-soft", text: "text-accent", dot: "bg-accent" },
  dirty: { tone: "neutral", label: "Dirty", ring: "ring-border", bg: "bg-surface-sunken", text: "text-muted-foreground", dot: "bg-muted-foreground" },
};

type Category = "Starters" | "Mains" | "Indian" | "Continental" | "Sides" | "Desserts" | "Bar" | "Beverages";
const CATEGORIES: { id: Category; icon: typeof Flame }[] = [
  { id: "Starters", icon: Flame },
  { id: "Mains", icon: Beef },
  { id: "Indian", icon: Soup },
  { id: "Continental", icon: Salad },
  { id: "Sides", icon: UtensilsCrossed },
  { id: "Desserts", icon: Cookie },
  { id: "Bar", icon: Wine },
  { id: "Beverages", icon: Coffee },
];

type Item = { id: string; cat: Category; name: string; price: number; veg?: boolean; spice?: "mild" | "medium" | "hot"; tag?: string };

const MENU: Item[] = [
  // Starters (3)
  { id: "s1", cat: "Starters", name: "Paneer Tikka", price: 380, veg: true, spice: "medium" },
  { id: "s2", cat: "Starters", name: "Chicken Malai Tikka", price: 460, spice: "mild", tag: "Chef's pick" },
  { id: "s3", cat: "Starters", name: "Crispy Lotus Stem", price: 340, veg: true },
  // Mains (3)
  { id: "m1", cat: "Mains", name: "Grilled Lamb Chops", price: 1280, spice: "medium", tag: "Signature" },
  { id: "m2", cat: "Mains", name: "Sea Bass with Lemon Butter", price: 1180, spice: "mild" },
  { id: "m3", cat: "Mains", name: "Wild Mushroom Risotto", price: 720, veg: true },
  // Indian (4)
  { id: "i1", cat: "Indian", name: "Butter Chicken", price: 540, spice: "medium", tag: "Bestseller" },
  { id: "i2", cat: "Indian", name: "Dal Makhani", price: 320, veg: true, spice: "mild" },
  { id: "i3", cat: "Indian", name: "Rogan Josh", price: 620, spice: "hot" },
  { id: "i4", cat: "Indian", name: "Hyderabadi Biryani", price: 480, spice: "hot", tag: "Chef's pick" },
  // Continental (3)
  { id: "c1", cat: "Continental", name: "Margherita Pizza", price: 520, veg: true },
  { id: "c2", cat: "Continental", name: "Penne Arrabiata", price: 460, veg: true, spice: "medium" },
  { id: "c3", cat: "Continental", name: "Chicken Parmigiana", price: 680 },
  // Sides (3)
  { id: "sd1", cat: "Sides", name: "Garlic Naan", price: 90, veg: true },
  { id: "sd2", cat: "Sides", name: "Jeera Rice", price: 180, veg: true },
  { id: "sd3", cat: "Sides", name: "Truffle Fries", price: 320, veg: true, tag: "Trending" },
  // Desserts (3)
  { id: "d1", cat: "Desserts", name: "Gulab Jamun (2 pcs)", price: 180, veg: true },
  { id: "d2", cat: "Desserts", name: "Tiramisu", price: 380, veg: true },
  { id: "d3", cat: "Desserts", name: "Kulfi Falooda", price: 260, veg: true },
  // Bar (3)
  { id: "b1", cat: "Bar", name: "Old Monk Mojito", price: 420 },
  { id: "b2", cat: "Bar", name: "Sula Cabernet (glass)", price: 480 },
  { id: "b3", cat: "Bar", name: "Kingfisher Premium 650ml", price: 320 },
  // Beverages (2)
  { id: "bv1", cat: "Beverages", name: "Masala Chai", price: 120, veg: true },
  { id: "bv2", cat: "Beverages", name: "Fresh Lime Soda", price: 140, veg: true },
];

type LineItem = {
  uid: string;
  itemId: string;
  name: string;
  price: number;
  qty: number;
  spice?: "mild" | "medium" | "hot";
  extras?: string[];
  instructions?: string;
};

// Preloaded order for T3
const PRELOADED: Record<string, LineItem[]> = {
  T3: [
    { uid: "t3-1", itemId: "i1", name: "Butter Chicken", price: 540, qty: 2, spice: "medium", extras: ["Extra cream"] },
    { uid: "t3-2", itemId: "i2", name: "Dal Makhani", price: 320, qty: 1, spice: "mild" },
    { uid: "t3-3", itemId: "sd1", name: "Garlic Naan", price: 90, qty: 6 },
    { uid: "t3-4", itemId: "bv2", name: "Fresh Lime Soda", price: 140, qty: 3, instructions: "Less sugar" },
  ],
};

// ------------ COMPONENT ------------
export default function RestaurantPOSPage() {
  const [toast, setToast] = React.useState<string | null>(null);
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };

  const [selectedTable, setSelectedTable] = React.useState<string>("T3");
  const [cat, setCat] = React.useState<Category>("Indian");
  const [search, setSearch] = React.useState("");
  const [orders, setOrders] = React.useState<Record<string, LineItem[]>>(PRELOADED);

  // Modifier popup
  const [modifierFor, setModifierFor] = React.useState<Item | null>(null);

  // Action modals
  const [payOpen, setPayOpen] = React.useState(false);
  const [splitOpen, setSplitOpen] = React.useState(false);
  const [discountOpen, setDiscountOpen] = React.useState(false);
  const [loyaltyOpen, setLoyaltyOpen] = React.useState(false);
  const [discountPct, setDiscountPct] = React.useState(0);
  const [loyaltyApplied, setLoyaltyApplied] = React.useState(0);

  const table = TABLES.find(t => t.id === selectedTable)!;
  const lines = orders[selectedTable] ?? [];

  const filteredItems = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return MENU.filter(m => m.cat === cat && (!q || m.name.toLowerCase().includes(q)));
  }, [cat, search]);

  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const discountAmt = Math.round(subtotal * (discountPct / 100));
  const afterDiscount = subtotal - discountAmt - loyaltyApplied;
  const cgst = Math.round(afterDiscount * 0.025);
  const sgst = Math.round(afterDiscount * 0.025);
  const grandTotal = afterDiscount + cgst + sgst;

  const addLine = (item: Item, opts?: { spice?: "mild" | "medium" | "hot"; extras?: string[]; instructions?: string }) => {
    setOrders(o => {
      const cur = o[selectedTable] ?? [];
      const line: LineItem = {
        uid: `${selectedTable}-${item.id}-${Date.now()}`,
        itemId: item.id,
        name: item.name,
        price: item.price,
        qty: 1,
        spice: opts?.spice ?? item.spice,
        extras: opts?.extras,
        instructions: opts?.instructions,
      };
      return { ...o, [selectedTable]: [...cur, line] };
    });
    showToast(`${item.name} added to ${selectedTable}`);
  };

  const changeQty = (uid: string, delta: number) => {
    setOrders(o => {
      const cur = o[selectedTable] ?? [];
      const updated = cur.map(l => l.uid === uid ? { ...l, qty: Math.max(1, l.qty + delta) } : l);
      return { ...o, [selectedTable]: updated };
    });
  };

  const removeLine = (uid: string) => {
    setOrders(o => ({ ...o, [selectedTable]: (o[selectedTable] ?? []).filter(l => l.uid !== uid) }));
    showToast(`Item removed from ${selectedTable}`);
  };

  const sendToKitchen = () => {
    if (lines.length === 0) { showToast("Add items before sending to kitchen"); return; }
    showToast(`KOT printed · ${selectedTable} · ${lines.reduce((s, l) => s + l.qty, 0)} items to kitchen`);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-brand via-brand to-accent text-brand-foreground inline-flex items-center justify-center shadow-md">
            <UtensilsCrossed className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-medium tracking-tight">Restaurant POS</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Pearl Marina Grill · Tablet floor view · Live KOT to kitchen</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => showToast("Kitchen Display sent to KDS monitor")}>
            <ChefHat className="h-4 w-4" />KDS
          </Button>
          <Button variant="outline" size="sm" onClick={() => showToast("End-of-day Z-report queued for shift close")}>
            <Receipt className="h-4 w-4" />Z-Report
          </Button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon={ChefHat} tone="warning" label="Active KOTs" value="7" sub="3 in queue · 4 cooking" />
        <KpiCard icon={Clock} tone="info" label="Avg dwell" value="48 min" sub="vs 52 min yest" />
        <KpiCard icon={Users} tone="brand" label="Covers today" value="142" sub="Lunch + Dinner" />
        <KpiCard icon={TrendingUp} tone="success" label="Revenue today" value={money(186400)} sub="Target ₹2.2L" />
      </div>

      {/* MAIN 3-COLUMN LAYOUT */}
      <div className="grid grid-cols-12 gap-4">
        {/* LEFT — TABLE MAP */}
        <Card className="col-span-12 lg:col-span-3 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Floor Map</p>
            <Badge tone="neutral">{TABLES.length} tables</Badge>
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 gap-1.5 mb-3 text-[10px]">
            {(Object.keys(STATUS_TONE) as TableStatus[]).map(s => (
              <div key={s} className="inline-flex items-center gap-1.5">
                <span className={cn("h-2 w-2 rounded-full", STATUS_TONE[s].dot)} />
                <span className="text-muted-foreground capitalize">{STATUS_TONE[s].label}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {TABLES.map(t => {
              const s = STATUS_TONE[t.status];
              const active = t.id === selectedTable;
              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedTable(t.id)}
                  className={cn(
                    "aspect-square rounded-md border p-2 text-left transition-all flex flex-col justify-between",
                    s.bg,
                    active ? "border-brand ring-2 ring-brand/40 shadow-md scale-[1.02]" : "border-border hover:ring-1",
                    !active && s.ring,
                  )}
                >
                  <div className="flex items-start justify-between">
                    <span className={cn("font-display font-semibold text-sm", s.text)}>{t.id}</span>
                    <span className={cn("h-1.5 w-1.5 rounded-full mt-1", s.dot)} />
                  </div>
                  <div>
                    <p className={cn("text-[9px] uppercase tracking-wider font-semibold leading-tight", s.text)}>{s.label}</p>
                    <p className="text-[10px] text-muted-foreground tabular leading-tight">
                      {t.covers ? `${t.covers}/${t.seats}` : `${t.seats} seats`}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {table && table.status !== "free" && table.status !== "dirty" && (
            <div className="mt-3 pt-3 border-t border-border space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Server</span>
                <span className="font-medium">{table.server}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Seated at</span>
                <span className="font-medium tabular">{table.seatedAt}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Covers</span>
                <span className="font-medium tabular">{table.covers}</span>
              </div>
            </div>
          )}
        </Card>

        {/* CENTER — MENU */}
        <Card className="col-span-12 lg:col-span-6 p-0 overflow-hidden">
          {/* Category strip */}
          <div className="px-4 pt-4 pb-3 border-b border-border bg-surface-elevated">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search menu…" className="pl-9 h-9" />
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
              {CATEGORIES.map(c => {
                const Icon = c.icon;
                const active = cat === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setCat(c.id)}
                    className={cn(
                      "h-9 px-3 rounded-full text-xs font-medium border transition-colors inline-flex items-center gap-1.5 shrink-0",
                      active
                        ? "bg-brand text-brand-foreground border-brand"
                        : "bg-surface text-muted-foreground border-border hover:bg-surface-sunken hover:text-foreground"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {c.id}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Items grid */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{cat} · {filteredItems.length} items</p>
              <Badge tone="brand">Tap to add · Long-press for modifier</Badge>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {filteredItems.map(item => (
                <div
                  key={item.id}
                  className="rounded-md border border-border bg-surface hover:border-brand hover:shadow-sm transition-all overflow-hidden flex flex-col"
                >
                  {/* Photo placeholder */}
                  <div className="aspect-[4/3] bg-gradient-to-br from-surface-sunken via-surface-elevated to-surface-sunken flex items-center justify-center relative">
                    <ImageIcon className="h-8 w-8 text-subtle-foreground/60" />
                    {item.tag && (
                      <Badge tone="accent" className="absolute top-1.5 left-1.5 text-[9px] px-1.5 py-0">{item.tag}</Badge>
                    )}
                    <div className="absolute top-1.5 right-1.5 flex gap-1">
                      {item.veg && <span className="h-3.5 w-3.5 border border-success bg-surface inline-flex items-center justify-center"><span className="h-1.5 w-1.5 rounded-full bg-success" /></span>}
                      {!item.veg && <span className="h-3.5 w-3.5 border border-danger bg-surface inline-flex items-center justify-center"><span className="h-1.5 w-1.5 rounded-full bg-danger" /></span>}
                    </div>
                  </div>
                  <div className="p-2.5 flex-1 flex flex-col">
                    <p className="font-medium text-sm leading-tight line-clamp-2 min-h-[2.5em]">{item.name}</p>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-sm font-semibold tabular text-brand">{money(item.price)}</span>
                      {item.spice && (
                        <span className={cn(
                          "text-[9px] uppercase tracking-wider font-semibold",
                          item.spice === "hot" && "text-danger",
                          item.spice === "medium" && "text-warning",
                          item.spice === "mild" && "text-info",
                        )}>{item.spice}</span>
                      )}
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-1.5">
                      <Button size="sm" variant="outline" className="h-7 text-[10px] px-1.5" onClick={() => setModifierFor(item)}>
                        Modify
                      </Button>
                      <Button size="sm" className="h-7 text-[10px] px-1.5" onClick={() => addLine(item)}>
                        <Plus className="h-3 w-3" />Add
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {filteredItems.length === 0 && (
                <div className="col-span-full py-10 text-center text-sm text-muted-foreground border border-dashed border-border rounded-md">
                  No items match your search.
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* RIGHT — ORDER TICKET */}
        <Card className="col-span-12 lg:col-span-3 p-0 overflow-hidden flex flex-col">
          <div className="px-4 pt-4 pb-3 border-b border-border bg-surface-elevated">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Order Ticket</p>
                <h3 className="font-display font-semibold text-lg">{selectedTable}</h3>
              </div>
              <Badge tone={STATUS_TONE[table.status].tone}>
                <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_TONE[table.status].dot)} />
                {STATUS_TONE[table.status].label}
              </Badge>
            </div>
            {table.server && (
              <p className="text-[11px] text-muted-foreground mt-1">{table.server} · {table.covers} covers · since {table.seatedAt}</p>
            )}
          </div>

          {/* Lines */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {lines.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground border border-dashed border-border rounded-md">
                <UtensilsCrossed className="h-6 w-6 mx-auto mb-2 text-subtle-foreground" />
                Tap menu items to add
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {lines.map(l => (
                  <li key={l.uid} className="py-2.5">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-tight">{l.name}</p>
                        <p className="text-[11px] text-muted-foreground tabular">{money(l.price)} ea</p>
                        {(l.spice || l.extras?.length || l.instructions) && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {l.spice && <span className="text-[9px] px-1.5 py-0.5 rounded bg-warning-soft text-warning uppercase">{l.spice}</span>}
                            {l.extras?.map(e => <span key={e} className="text-[9px] px-1.5 py-0.5 rounded bg-info-soft text-info">+{e}</span>)}
                            {l.instructions && <span className="text-[9px] px-1.5 py-0.5 rounded bg-surface-sunken text-muted-foreground italic">{l.instructions}</span>}
                          </div>
                        )}
                      </div>
                      <button onClick={() => removeLine(l.uid)} className="text-subtle-foreground hover:text-danger shrink-0">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between">
                      <div className="flex items-center border border-border rounded-md h-7">
                        <button onClick={() => changeQty(l.uid, -1)} className="w-6 h-7 inline-flex items-center justify-center hover:bg-surface-sunken"><Minus className="h-3 w-3" /></button>
                        <span className="w-6 text-center text-xs tabular font-medium">{l.qty}</span>
                        <button onClick={() => changeQty(l.uid, +1)} className="w-6 h-7 inline-flex items-center justify-center hover:bg-surface-sunken"><Plus className="h-3 w-3" /></button>
                      </div>
                      <span className="text-sm font-semibold tabular">{money(l.price * l.qty)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Totals */}
          {lines.length > 0 && (
            <div className="px-4 py-3 border-t border-border bg-surface-sunken/30 space-y-1.5 text-xs">
              <Row label="Subtotal" value={money(subtotal)} />
              {discountAmt > 0 && <Row label={`Discount (${discountPct}%)`} value={`- ${money(discountAmt)}`} tone="warning" />}
              {loyaltyApplied > 0 && <Row label="Loyalty redeem" value={`- ${money(loyaltyApplied)}`} tone="accent" />}
              <Row label="CGST (2.5%)" value={money(cgst)} muted />
              <Row label="SGST (2.5%)" value={money(sgst)} muted />
              <div className="pt-1.5 mt-1.5 border-t border-border flex items-center justify-between">
                <span className="text-sm font-semibold">Grand Total</span>
                <span className="text-base font-semibold tabular">{money(grandTotal)}</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="px-4 py-3 border-t border-border bg-surface-elevated space-y-2">
            <Button className="w-full" onClick={sendToKitchen}>
              <Send className="h-4 w-4" />Send to Kitchen
            </Button>
            <div className="grid grid-cols-3 gap-1.5">
              <Button size="sm" variant="outline" onClick={() => setSplitOpen(true)} disabled={lines.length === 0}>
                <Scissors className="h-3.5 w-3.5" />Split
              </Button>
              <Button size="sm" variant="outline" onClick={() => setDiscountOpen(true)} disabled={lines.length === 0}>
                <Percent className="h-3.5 w-3.5" />Disc.
              </Button>
              <Button size="sm" variant="outline" onClick={() => setLoyaltyOpen(true)} disabled={lines.length === 0}>
                <Gift className="h-3.5 w-3.5" />Loyalty
              </Button>
            </div>
            <Button className="w-full" variant="outline" onClick={() => setPayOpen(true)} disabled={lines.length === 0}>
              <CreditCard className="h-4 w-4" />Pay {lines.length > 0 && money(grandTotal)}
            </Button>
            <Button size="sm" variant="ghost" className="w-full" onClick={() => showToast(`Bill printed for ${selectedTable}`)}>
              <Printer className="h-3.5 w-3.5" />Print bill
            </Button>
          </div>
        </Card>
      </div>

      {/* MODALS */}
      {modifierFor && (
        <ModifierModal
          item={modifierFor}
          onClose={() => setModifierFor(null)}
          onSave={(opts) => { addLine(modifierFor, opts); setModifierFor(null); }}
        />
      )}

      {payOpen && (
        <PayModal
          total={grandTotal}
          table={selectedTable}
          onClose={() => setPayOpen(false)}
          onPay={(method, ref) => {
            setPayOpen(false);
            setOrders(o => ({ ...o, [selectedTable]: [] }));
            setDiscountPct(0);
            setLoyaltyApplied(0);
            showToast(`Payment ${money(grandTotal)} · ${method}${ref ? ` · ${ref}` : ""} · ${selectedTable} closed`);
          }}
        />
      )}

      {splitOpen && (
        <SplitModal
          total={grandTotal}
          table={selectedTable}
          onClose={() => setSplitOpen(false)}
          onConfirm={(ways) => {
            setSplitOpen(false);
            showToast(`Bill split ${ways} ways · ${money(Math.round(grandTotal / ways))} per guest`);
          }}
        />
      )}

      {discountOpen && (
        <DiscountModal
          current={discountPct}
          onClose={() => setDiscountOpen(false)}
          onApply={(pct, reason) => {
            setDiscountPct(pct);
            setDiscountOpen(false);
            showToast(`Discount ${pct}% applied · ${reason}`);
          }}
        />
      )}

      {loyaltyOpen && (
        <LoyaltyModal
          subtotal={subtotal}
          onClose={() => setLoyaltyOpen(false)}
          onApply={(amt, member) => {
            setLoyaltyApplied(amt);
            setLoyaltyOpen(false);
            showToast(`Loyalty redeemed · ${member} · ${money(amt)} off`);
          }}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-[60] bg-foreground text-background rounded-lg px-4 py-3 text-sm shadow-2xl inline-flex items-center gap-2.5 ring-1 ring-foreground/20">
          <span className="h-6 w-6 rounded-full bg-success text-white inline-flex items-center justify-center"><CheckCircle2 className="h-3.5 w-3.5" /></span>
          <span className="font-medium">{toast}</span>
        </div>
      )}
    </div>
  );
}

// ===================== HELPERS =====================
function KpiCard({ icon: Icon, tone, label, value, sub }: {
  icon: typeof Flame;
  tone: "warning" | "info" | "brand" | "success";
  label: string;
  value: string;
  sub: string;
}) {
  const TONE = {
    warning: "bg-warning-soft text-warning",
    info: "bg-info-soft text-info",
    brand: "bg-brand-soft text-brand-soft-foreground",
    success: "bg-success-soft text-success",
  };
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between mb-2">
        <span className={cn("h-9 w-9 rounded-md inline-flex items-center justify-center", TONE[tone])}>
          <Icon className="h-4.5 w-4.5" />
        </span>
      </div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
      <p className="text-2xl font-display font-semibold tabular mt-0.5">{value}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
    </Card>
  );
}

function Row({ label, value, muted, tone }: { label: React.ReactNode; value: React.ReactNode; muted?: boolean; tone?: "warning" | "accent" }) {
  return (
    <div className="flex items-center justify-between">
      <span className={cn("text-xs", muted ? "text-muted-foreground" : "text-foreground", tone === "warning" && "text-warning", tone === "accent" && "text-accent")}>{label}</span>
      <span className={cn("tabular text-xs", muted ? "text-muted-foreground" : "font-medium", tone === "warning" && "text-warning font-medium", tone === "accent" && "text-accent font-medium")}>{value}</span>
    </div>
  );
}

// ============= MODIFIER MODAL =============
function ModifierModal({ item, onClose, onSave }: {
  item: Item;
  onClose: () => void;
  onSave: (opts: { spice?: "mild" | "medium" | "hot"; extras?: string[]; instructions?: string }) => void;
}) {
  const [spice, setSpice] = React.useState<"mild" | "medium" | "hot">(item.spice ?? "medium");
  const [extras, setExtras] = React.useState<Record<string, boolean>>({});
  const [instructions, setInstructions] = React.useState("");

  const EXTRA_OPTIONS = ["Extra cheese", "Extra cream", "No onion", "No garlic", "Less salt", "Extra spicy"];

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full p-0 overflow-hidden">
        <div className="px-5 py-4 bg-surface-elevated border-b border-border flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Customize · {item.name}</h3>
            <p className="text-xs text-muted-foreground">{money(item.price)} · {item.cat}</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <Label className="text-xs mb-2 block">Spice level</Label>
            <div className="grid grid-cols-3 gap-2">
              {(["mild", "medium", "hot"] as const).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSpice(s)}
                  className={cn(
                    "h-10 rounded-md border text-xs font-medium capitalize transition-colors",
                    spice === s ? "bg-brand text-brand-foreground border-brand" : "border-border hover:bg-surface-sunken"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs mb-2 block">Extras</Label>
            <div className="grid grid-cols-2 gap-2">
              {EXTRA_OPTIONS.map(e => (
                <label key={e} className={cn(
                  "flex items-center gap-2 h-10 px-3 rounded-md border cursor-pointer transition-colors",
                  extras[e] ? "bg-brand-soft border-brand" : "border-border hover:bg-surface-sunken"
                )}>
                  <input
                    type="checkbox"
                    checked={!!extras[e]}
                    onChange={ev => setExtras(x => ({ ...x, [e]: ev.target.checked }))}
                    className="h-3.5 w-3.5 accent-brand"
                  />
                  <span className="text-xs">{e}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs mb-2 block">Special instructions</Label>
            <textarea
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              rows={2}
              placeholder="e.g. Jain preparation, no root vegetables…"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm placeholder:text-subtle-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 outline-hidden resize-y"
            />
          </div>
        </div>

        <div className="px-5 py-3 border-t border-border bg-surface-elevated flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={() => onSave({
            spice,
            extras: Object.keys(extras).filter(k => extras[k]),
            instructions: instructions.trim() || undefined,
          })}>
            <Plus className="h-3.5 w-3.5" />Add to ticket
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ============= PAY MODAL =============
function PayModal({ total, table, onClose, onPay }: {
  total: number;
  table: string;
  onClose: () => void;
  onPay: (method: string, ref?: string) => void;
}) {
  const [method, setMethod] = React.useState<"Cash" | "Card" | "UPI" | "Room charge">("Card");
  const [roomNumber, setRoomNumber] = React.useState("305");
  const [cashTendered, setCashTendered] = React.useState(total);
  const [cardLast4, setCardLast4] = React.useState("");
  const [upiId, setUpiId] = React.useState("");

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  const change = method === "Cash" ? Math.max(0, cashTendered - total) : 0;

  const submit = () => {
    if (method === "Cash") onPay("Cash", `Tendered ${money(cashTendered)} · Change ${money(change)}`);
    else if (method === "Card") onPay("Card", cardLast4 ? `**** ${cardLast4}` : "POS terminal");
    else if (method === "UPI") onPay("UPI", upiId || "scan-to-pay");
    else onPay("Room charge", `Room ${roomNumber} folio`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full p-0 overflow-hidden">
        <div className="px-5 py-4 bg-surface-elevated border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="h-10 w-10 rounded-md bg-success text-white inline-flex items-center justify-center"><CreditCard className="h-5 w-5" /></span>
            <div>
              <h3 className="font-semibold">Settle bill · {table}</h3>
              <p className="text-xs text-muted-foreground">Grand total <span className="font-semibold tabular text-foreground">{money(total)}</span></p>
            </div>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <Label className="text-xs mb-2 block">Payment method</Label>
            <div className="grid grid-cols-4 gap-2">
              {([
                { id: "Cash" as const, icon: Banknote },
                { id: "Card" as const, icon: CreditCard },
                { id: "UPI" as const, icon: Smartphone },
                { id: "Room charge" as const, icon: BedDouble },
              ]).map(m => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMethod(m.id)}
                    className={cn(
                      "h-16 rounded-md border flex flex-col items-center justify-center gap-1 transition-colors",
                      method === m.id ? "bg-brand-soft border-brand text-brand-soft-foreground" : "border-border hover:bg-surface-sunken"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-[11px] font-medium">{m.id}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {method === "Cash" && (
            <div className="space-y-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Cash tendered</Label>
                <Input
                  type="number"
                  value={cashTendered}
                  onChange={e => setCashTendered(Number(e.target.value))}
                  className="h-9 tabular"
                />
              </div>
              <div className="grid grid-cols-2 gap-2 p-3 rounded-md bg-surface-sunken/40 border border-border text-xs">
                <div>
                  <p className="text-muted-foreground">Bill</p>
                  <p className="font-semibold tabular">{money(total)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Change</p>
                  <p className="font-semibold tabular text-success">{money(change)}</p>
                </div>
              </div>
            </div>
          )}

          {method === "Card" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Card last 4 digits (optional)</Label>
              <Input
                value={cardLast4}
                onChange={e => setCardLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="1234"
                className="h-9 tabular font-mono"
              />
              <p className="text-[11px] text-muted-foreground">Tap card on terminal, then enter last 4 from receipt</p>
            </div>
          )}

          {method === "UPI" && (
            <div className="space-y-1.5">
              <Label className="text-xs">UPI ID / Payer name</Label>
              <Input
                value={upiId}
                onChange={e => setUpiId(e.target.value)}
                placeholder="guest@okhdfcbank"
                className="h-9 font-mono"
              />
              <p className="text-[11px] text-muted-foreground">Show QR or share UPI ID</p>
            </div>
          )}

          {method === "Room charge" && (
            <div className="space-y-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Charge to room number</Label>
                <Input
                  value={roomNumber}
                  onChange={e => setRoomNumber(e.target.value)}
                  placeholder="e.g. 305"
                  className="h-10 tabular font-mono text-lg"
                />
              </div>
              <div className="rounded-md bg-info-soft border border-info/30 p-2.5 text-xs">
                <p className="text-info font-semibold">Room {roomNumber}</p>
                <p className="text-muted-foreground mt-0.5">Posted to in-house folio · settled at checkout</p>
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-border bg-surface-elevated flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" variant="outline" onClick={submit}>
            <CheckCircle2 className="h-3.5 w-3.5" />Confirm {money(total)}
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ============= SPLIT MODAL =============
function SplitModal({ total, table, onClose, onConfirm }: {
  total: number;
  table: string;
  onClose: () => void;
  onConfirm: (ways: number) => void;
}) {
  const [ways, setWays] = React.useState(2);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full p-0 overflow-hidden">
        <div className="px-5 py-4 bg-surface-elevated border-b border-border flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Split bill · {table}</h3>
            <p className="text-xs text-muted-foreground">Grand total {money(total)}</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Number of ways</Label>
            <div className="grid grid-cols-6 gap-2">
              {[2, 3, 4, 5, 6, 8].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setWays(n)}
                  className={cn(
                    "h-12 rounded-md border text-sm font-semibold transition-colors tabular",
                    ways === n ? "bg-brand text-brand-foreground border-brand" : "border-border hover:bg-surface-sunken"
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-md bg-brand-soft/40 border border-brand/20 p-4 text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Per guest</p>
            <p className="text-2xl font-display font-semibold tabular mt-1">{money(Math.round(total / ways))}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{ways} × {money(Math.round(total / ways))}</p>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-border bg-surface-elevated flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={() => onConfirm(ways)}>
            <Scissors className="h-3.5 w-3.5" />Split {ways} ways
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ============= DISCOUNT MODAL =============
function DiscountModal({ current, onClose, onApply }: {
  current: number;
  onClose: () => void;
  onApply: (pct: number, reason: string) => void;
}) {
  const [pct, setPct] = React.useState(current || 10);
  const [reason, setReason] = React.useState("Manager comp");

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full p-0 overflow-hidden">
        <div className="px-5 py-4 bg-surface-elevated border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="h-10 w-10 rounded-md bg-warning-soft text-warning inline-flex items-center justify-center"><Percent className="h-5 w-5" /></span>
            <div>
              <h3 className="font-semibold">Apply discount</h3>
              <p className="text-xs text-muted-foreground">Manager approval recorded in audit log</p>
            </div>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Quick picks</Label>
            <div className="grid grid-cols-5 gap-2">
              {[5, 10, 15, 20, 25].map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPct(p)}
                  className={cn(
                    "h-10 rounded-md border text-sm font-semibold tabular transition-colors",
                    pct === p ? "bg-warning text-white border-warning" : "border-border hover:bg-surface-sunken"
                  )}
                >
                  {p}%
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Custom %</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={pct}
              onChange={e => setPct(Math.max(0, Math.min(100, Number(e.target.value))))}
              className="h-9 tabular"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Reason</Label>
            <Select value={reason} onChange={e => setReason(e.target.value)}>
              <option>Manager comp</option>
              <option>Loyalty member</option>
              <option>Service recovery</option>
              <option>Soft launch promo</option>
              <option>Staff meal</option>
              <option>Critic / Influencer</option>
            </Select>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-border bg-surface-elevated flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={() => onApply(pct, reason)}>
            <Percent className="h-3.5 w-3.5" />Apply {pct}%
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ============= LOYALTY MODAL =============
function LoyaltyModal({ subtotal, onClose, onApply }: {
  subtotal: number;
  onClose: () => void;
  onApply: (amt: number, member: string) => void;
}) {
  const [member, setMember] = React.useState("Anjali Iyer · MYH00214");
  const [points, setPoints] = React.useState(0);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  const amt = points;
  const maxRedeem = Math.min(subtotal, 2400);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full p-0 overflow-hidden">
        <div className="px-5 py-4 bg-surface-elevated border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="h-10 w-10 rounded-md bg-accent-soft text-accent inline-flex items-center justify-center"><Gift className="h-5 w-5" /></span>
            <div>
              <h3 className="font-semibold">Apply loyalty redemption</h3>
              <p className="text-xs text-muted-foreground">MYHOTEL Marina Rewards · 1 pt = ₹1</p>
            </div>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Loyalty member</Label>
            <Select value={member} onChange={e => setMember(e.target.value)}>
              <option>Anjali Iyer · MYH00214 · 2,400 pts · Gold</option>
              <option>Karan Mehta · MYH01188 · 1,150 pts · Silver</option>
              <option>Priya Krishnan · MYH00077 · 5,820 pts · Platinum</option>
              <option>Rohit Sharma · MYH00501 · 380 pts · Silver</option>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Points to redeem (max {maxRedeem.toLocaleString("en-IN")})</Label>
            <Input
              type="number"
              min={0}
              max={maxRedeem}
              value={points}
              onChange={e => setPoints(Math.max(0, Math.min(maxRedeem, Number(e.target.value))))}
              className="h-9 tabular"
            />
            <div className="grid grid-cols-4 gap-1.5 mt-1.5">
              {[100, 500, 1000, maxRedeem].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPoints(n)}
                  className={cn(
                    "h-8 rounded-md border text-xs font-medium tabular transition-colors",
                    points === n ? "bg-accent text-white border-accent" : "border-border hover:bg-surface-sunken"
                  )}
                >
                  {n === maxRedeem ? "Max" : n.toLocaleString("en-IN")}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-md bg-accent-soft/40 border border-accent/20 p-3 text-xs space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="tabular">{money(subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Loyalty discount</span><span className="tabular text-accent font-medium">- {money(amt)}</span></div>
            <div className="flex justify-between pt-1 border-t border-accent/20"><span className="font-semibold">After redeem</span><span className="tabular font-semibold">{money(subtotal - amt)}</span></div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-border bg-surface-elevated flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={() => onApply(amt, member.split(" · ")[0])} disabled={amt === 0}>
            <Gift className="h-3.5 w-3.5" />Redeem {money(amt)}
          </Button>
        </div>
      </Card>
    </div>
  );
}
