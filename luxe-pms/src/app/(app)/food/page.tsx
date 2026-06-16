"use client";
import * as React from "react";
import {
  Search, Plus, Minus, Trash2, UtensilsCrossed, Printer, Send, ChefHat,
  X, BedDouble, User, Sparkles, CheckCircle2, Building2,
  Edit, Ban, Eye, MoreHorizontal, AlertTriangle, Clock, Receipt,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { MENU_CATEGORIES, MENU_ITEMS, FOOD_ORDERS } from "@/lib/mock-data-ext";
import { RESERVATIONS } from "@/lib/mock-data";
import { apiGet, apiPost, apiPut } from "@/lib/api";
import { money } from "@/lib/utils";
import { cn } from "@/lib/utils";

// In-house guests (currently occupying rooms) — used to populate the New Order modal
const IN_HOUSE = RESERVATIONS.slice(0, 8);
type OrderTarget = "room" | "hall" | "walkin";

export default function FoodPage() {
  const [cat, setCat] = React.useState<string>(MENU_CATEGORIES[0]);
  const [cart, setCart] = React.useState<Record<string, number>>({});
  const [room, setRoom] = React.useState("305");

  // Menu — loaded from the backend, mock as offline fallback.
  const [menu, setMenu] = React.useState<MenuItem[]>(() => MENU_ITEMS.map(m => ({ ...m })));
  React.useEffect(() => {
    apiGet<{ id: number | string; cat?: string; name?: string; price?: number; veg?: boolean; spice?: string | null; tag?: string | null }[]>("/menu-items")
      .then(rows => { if (Array.isArray(rows) && rows.length) setMenu(rows.map(normalizeMenu)); })
      .catch(() => {});
  }, []);
  const categories = React.useMemo(() => {
    const seen: string[] = [];
    for (const m of menu) if (!seen.includes(m.cat)) seen.push(m.cat);
    return seen.length ? seen : MENU_CATEGORIES;
  }, [menu]);
  const activeCat = categories.includes(cat) ? cat : categories[0];

  // Live F&B orders.
  const [orders, setOrders] = React.useState<FoodOrder[]>(() => FOOD_ORDERS.map(o => ({ ...o, guest: o.guest, lineItems: [] })));
  React.useEffect(() => {
    apiGet<FbOrderRow[]>("/fb-orders")
      .then(rows => { if (Array.isArray(rows) && rows.length) setOrders(rows.map(normalizeOrder)); })
      .catch(() => {});
  }, []);
  const [guestName, setGuestName] = React.useState<string | null>(null);
  const [target, setTarget] = React.useState<OrderTarget>("room");
  const [newOrderOpen, setNewOrderOpen] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);
  const cartRef = React.useRef<HTMLDivElement>(null);

  // Cart payment mode (Add-to-room / Pay-now / Agent-Company)
  const [cartPaymentMode, setCartPaymentMode] = React.useState<"Add to Room" | "Pay Now" | "Agent / Company">("Add to Room");

  // ----- Order management (modify / cancel before delivery) -----
  type OrderOverride = { items?: number; total?: number; instructions?: string; status?: OrderStatus };
  const [orderOverrides, setOrderOverrides] = React.useState<Record<string, OrderOverride>>({});
  const [modifyOrder, setModifyOrder] = React.useState<FoodOrder | null>(null);
  const [cancelOrder, setCancelOrder] = React.useState<FoodOrder | null>(null);
  const [viewOrder, setViewOrder] = React.useState<FoodOrder | null>(null);

  // Effective orders with overrides applied
  const effectiveOrders = React.useMemo(() => {
    return orders.map(o => {
      const ov = orderOverrides[o.id] ?? {};
      return { ...o, ...ov, status: (ov.status ?? o.status) as OrderStatus };
    });
  }, [orders, orderOverrides]);

  const handleModifyOrder = (id: string, patch: OrderOverride) => {
    setOrderOverrides(o => ({ ...o, [id]: { ...(o[id] ?? {}), ...patch } }));
    setModifyOrder(null);
    const body: Record<string, unknown> = {};
    if (patch.total !== undefined) body.total = Math.round(patch.total);
    if (Object.keys(body).length) apiPut(`/fb-orders/${id}`, body).catch(() => showToast("⚠ Save failed — backend offline"));
    showToast(`Order updated · KOT reprinted`);
  };

  const handleCancelOrder = (id: string, reason: string) => {
    setOrderOverrides(o => ({ ...o, [id]: { ...(o[id] ?? {}), status: "cancelled" } }));
    setCancelOrder(null);
    apiPut(`/fb-orders/${id}`, { status: "cancelled" }).catch(() => showToast("⚠ Cancel not saved — backend offline"));
    showToast(`Order cancelled · ${reason}`);
  };

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const startNewOrder = (info: { target: OrderTarget; room: string; guest: string | null }) => {
    setTarget(info.target);
    setRoom(info.room);
    setGuestName(info.guest);
    setCart({});
    setNewOrderOpen(false);
    showToast(`Order started · ${info.target === "room" ? `Room ${info.room}` : info.target === "hall" ? `Hall ${info.room}` : "Walk-in"}`);
    // Smooth-scroll the cart into view so the user can start adding items
    setTimeout(() => cartRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const items = menu.filter(m => m.cat === activeCat);
  const cartItems = menu.filter(m => cart[m.id]).map(m => ({ ...m, qty: cart[m.id] }));
  const subtotal = cartItems.reduce((s, c) => s + c.price * c.qty, 0);
  const tax = subtotal * 0.05;
  const total = subtotal + tax;

  const add = (id: string) => setCart(c => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
  const sub = (id: string) => setCart(c => {
    const n = (c[id] ?? 0) - 1;
    const { [id]: _, ...rest } = c;
    return n > 0 ? { ...c, [id]: n } : rest;
  });
  const remove = (id: string) => setCart(c => { const { [id]: _, ...rest } = c; return rest; });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-medium tracking-tight">Food & Room Service</h1>
          <p className="text-muted-foreground text-sm mt-1">In-room dining · F&B POS · auto-print KOTs to kitchen</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => showToast("Kitchen Display sent to side monitor · KDS view active")}>
            <ChefHat className="h-4 w-4" />Kitchen Display
          </Button>
          <Button onClick={() => setNewOrderOpen(true)}>
            <Plus className="h-4 w-4" />New Order
          </Button>
        </div>
      </div>

      {/* Active orders */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Active Orders</CardTitle>
            <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1.5">
              <AlertTriangle className="h-3 w-3 text-warning" />Modify / cancel allowed while status is Preparing
            </p>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {effectiveOrders.map(o => {
            const canEdit = o.status === "preparing";
            const isCancelled = o.status === "cancelled";
            const isDelivered = o.status === "delivered";
            return (
              <div
                key={o.id}
                className={cn(
                  "rounded-md border p-3 transition-all relative group/order",
                  isCancelled && "opacity-60 border-danger/30",
                  canEdit && "border-warning/40 bg-warning-soft/20",
                  o.status === "in-kitchen" && "border-info/40 bg-info-soft/20",
                  isDelivered && "border-success/30 bg-success-soft/10",
                  "hover:shadow-md"
                )}
              >
                <div className="flex items-center justify-between">
                  <p className={cn("text-lg font-semibold tabular", isCancelled && "line-through")}>Rm {o.room}</p>
                  <div className="flex items-center gap-1">
                    <Badge tone={
                      o.status === "preparing" ? "warning" :
                      o.status === "in-kitchen" ? "info" :
                      o.status === "delivered" ? "success" : "danger"
                    }>
                      {o.status}
                    </Badge>
                    <button
                      type="button"
                      onClick={() => showToast(`More actions for Room ${o.room} · reprint, split bill, transfer`)}
                      className="h-6 w-6 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center text-muted-foreground"
                      title="More actions"
                      aria-label="More order actions"
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1 truncate">{o.guest}</p>

                {/* Live ETA when in-kitchen */}
                {o.status === "in-kitchen" && (
                  <div className="mt-1 text-[10px] text-info inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />ETA ~8 min
                  </div>
                )}
                {o.status === "preparing" && (
                  <div className="mt-1 text-[10px] text-warning inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />Editable for ~5 min
                  </div>
                )}

                <div className="mt-2 pt-2 border-t border-border flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{o.items} items · {o.time}</span>
                  <span className="font-semibold tabular">{money(o.total)}</span>
                </div>
                <p className="text-[10px] text-subtle-foreground mt-1">{o.paidBy}</p>

                {/* Action row */}
                <div className="mt-2 pt-2 border-t border-border flex gap-1">
                  <button
                    type="button"
                    onClick={() => setViewOrder(o)}
                    className="flex-1 h-7 px-2 rounded-md border border-border hover:bg-surface-sunken text-[10px] font-medium inline-flex items-center justify-center gap-1 transition-colors"
                    title="View order detail"
                  >
                    <Eye className="h-3 w-3" />Detail
                  </button>
                  <button
                    type="button"
                    disabled={!canEdit}
                    onClick={() => setModifyOrder(o)}
                    className="flex-1 h-7 px-2 rounded-md border border-border hover:bg-brand hover:text-brand-foreground hover:border-brand text-[10px] font-medium inline-flex items-center justify-center gap-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-current"
                    title={canEdit ? "Modify order" : "Cannot modify — order has left the kitchen"}
                  >
                    <Edit className="h-3 w-3" />Modify
                  </button>
                  <button
                    type="button"
                    disabled={isDelivered || isCancelled}
                    onClick={() => setCancelOrder(o)}
                    className="flex-1 h-7 px-2 rounded-md border border-border hover:bg-danger hover:text-white hover:border-danger text-[10px] font-medium inline-flex items-center justify-center gap-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-current"
                    title={isDelivered ? "Already delivered" : isCancelled ? "Already cancelled" : "Cancel order"}
                  >
                    <Ban className="h-3 w-3" />Cancel
                  </button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Menu */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle-foreground" />
              <Input placeholder="Search menu items…" className="pl-9 h-10" />
            </div>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {categories.map(c => (
                <button
                  key={c}
                  onClick={() => setCat(c)}
                  className={cn(
                    "h-8 px-3 rounded-full text-xs font-medium border transition-colors",
                    activeCat === c
                      ? "bg-brand text-brand-foreground border-brand"
                      : "bg-surface text-muted-foreground border-border hover:bg-surface-sunken hover:text-foreground"
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">{activeCat} · {items.length} items</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {items.map(item => (
                <button
                  key={item.id}
                  onClick={() => add(item.id)}
                  className="text-left p-3 rounded-md border border-border hover:bg-surface-sunken hover:border-brand transition-all hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-sm leading-tight">{item.name}</p>
                    {cart[item.id] && <Badge tone="brand">{cart[item.id]}</Badge>}
                  </div>
                  <p className="text-sm font-semibold mt-2 tabular text-brand">{money(item.price)}</p>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Cart */}
        <div ref={cartRef} className="lg:col-span-1">
        <Card className="p-5 h-fit sticky top-20">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Current Order</p>
            <Badge tone="brand">
              {target === "hall" ? <Building2 className="h-3 w-3" /> : target === "walkin" ? <User className="h-3 w-3" /> : <BedDouble className="h-3 w-3" />}
              {target === "room" ? `Room ${room}` : target === "hall" ? `Hall ${room}` : "Walk-in"}
            </Badge>
          </div>

          {guestName && (
            <div className="mb-3 flex items-center gap-2 p-2 rounded-md bg-brand-soft text-brand-soft-foreground text-xs">
              <Avatar name={guestName} size={22} />
              <span className="font-medium truncate">{guestName}</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">{target === "hall" ? "Hall" : "Room"} #</label>
            <Input value={room} onChange={e => setRoom(e.target.value)} placeholder={target === "hall" ? "Hall name" : "Room #"} className="h-9" />
          </div>

          {cartItems.length === 0 ? (
            <div className="mt-4 py-8 text-center text-sm text-muted-foreground border border-dashed border-border rounded-md">
              <UtensilsCrossed className="h-6 w-6 mx-auto mb-2 text-subtle-foreground" />
              Add items from the menu
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {cartItems.map(c => (
                <li key={c.id} className="py-2.5 flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground tabular">{money(c.price)} each</p>
                  </div>
                  <div className="flex items-center border border-border rounded-md h-7">
                    <button onClick={() => sub(c.id)} className="w-7 h-7 inline-flex items-center justify-center hover:bg-surface-sunken"><Minus className="h-3 w-3" /></button>
                    <span className="w-7 text-center text-sm tabular">{c.qty}</span>
                    <button onClick={() => add(c.id)} className="w-7 h-7 inline-flex items-center justify-center hover:bg-surface-sunken"><Plus className="h-3 w-3" /></button>
                  </div>
                  <button onClick={() => remove(c.id)} className="text-subtle-foreground hover:text-danger"><Trash2 className="h-3.5 w-3.5" /></button>
                </li>
              ))}
            </ul>
          )}

          {cartItems.length > 0 && (
            <>
              <div className="mt-4 pt-4 border-t border-border space-y-1.5 text-sm">
                <Row label="Subtotal" value={money(subtotal)} />
                <Row label="Tax (5%)" value={money(tax)} muted />
                <div className="pt-2 mt-2 border-t border-border">
                  <Row label={<span className="font-semibold">Total</span>} value={<span className="font-semibold tabular text-base">{money(total)}</span>} />
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Payment</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["Add to Room", "Pay Now", "Agent / Company"] as const).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setCartPaymentMode(p)}
                      className={cn(
                        "h-9 rounded-md border text-[11px] font-medium transition-colors",
                        cartPaymentMode === p
                          ? "bg-brand text-brand-foreground border-brand"
                          : "border-border hover:bg-surface-sunken"
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" onClick={() => showToast(`KOT printed · ${cartItems.length} items`)}>
                  <Printer className="h-3.5 w-3.5" />KOT
                </Button>
                <Button
                  size="sm"
                  variant="success"
                  onClick={() => {
                    const label = target === "room" ? `Room ${room}` : target === "hall" ? `Hall ${room}` : "Walk-in";
                    const lineItems = cartItems.map(c => ({ name: c.name, qty: c.qty, price: c.price }));
                    const payload = {
                      orderNo: "KOT-" + Date.now().toString().slice(-5),
                      tableNo: label,
                      server: guestName ?? "",
                      items: lineItems,
                      total: Math.round(total),
                      status: "placed",
                      paymentMethod: cartPaymentMode,
                      room: target === "room" ? room : "",
                    };
                    apiPost<FbOrderRow>("/fb-orders", payload)
                      .then(row => setOrders(prev => [normalizeOrder(row), ...prev]))
                      .catch(() => showToast("⚠ Order not saved — backend offline"));
                    showToast(`Order sent to kitchen · ${label} · ${money(total)}`);
                    setCart({});
                  }}
                >
                  <Send className="h-3.5 w-3.5" />Send to Kitchen
                </Button>
              </div>
            </>
          )}
        </Card>
        </div>
      </div>

      {newOrderOpen && (
        <NewOrderModal
          onClose={() => setNewOrderOpen(false)}
          onStart={startNewOrder}
        />
      )}

      {modifyOrder && (
        <ModifyOrderModal
          order={modifyOrder}
          onClose={() => setModifyOrder(null)}
          onSave={(patch) => handleModifyOrder(modifyOrder.id, patch)}
        />
      )}

      {cancelOrder && (
        <CancelOrderModal
          order={cancelOrder}
          onClose={() => setCancelOrder(null)}
          onConfirm={(reason) => handleCancelOrder(cancelOrder.id, reason)}
        />
      )}

      {viewOrder && (
        <ViewOrderModal
          order={viewOrder}
          override={orderOverrides[viewOrder.id]}
          onClose={() => setViewOrder(null)}
          onModify={() => { setModifyOrder(viewOrder); setViewOrder(null); }}
          onCancel={() => { setCancelOrder(viewOrder); setViewOrder(null); }}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-foreground text-background rounded-lg px-4 py-3 text-sm shadow-2xl animate-in slide-in-from-bottom-2 inline-flex items-center gap-2.5 ring-1 ring-foreground/20">
          <span className="h-6 w-6 rounded-full bg-success text-white inline-flex items-center justify-center"><CheckCircle2 className="h-3.5 w-3.5" /></span>
          <span className="font-medium">{toast}</span>
        </div>
      )}
    </div>
  );
}

function NewOrderModal({
  onClose, onStart,
}: {
  onClose: () => void;
  onStart: (info: { target: OrderTarget; room: string; guest: string | null }) => void;
}) {
  const [target, setTarget] = React.useState<OrderTarget>("room");
  const [search, setSearch] = React.useState("");
  const [selectedRes, setSelectedRes] = React.useState<typeof IN_HOUSE[number] | null>(null);
  const [manualRoom, setManualRoom] = React.useState("");
  const [hallName, setHallName] = React.useState("Banquet A");
  const [walkinName, setWalkinName] = React.useState("");

  // Real in-house guests from Postgres for the room-charge picker (mock fallback offline).
  const [inHouse, setInHouse] = React.useState<typeof IN_HOUSE>(IN_HOUSE);
  React.useEffect(() => {
    apiGet<typeof IN_HOUSE>("/bookings").then(rows => {
      const today = new Date().toLocaleDateString("en-CA");
      const live = rows.filter(r => (r as { status?: string }).status === "checked-in" || (r.checkIn <= today && r.checkOut > today));
      if (live.length) setInHouse(live);
    }).catch(() => {});
  }, []);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  const filteredGuests = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return inHouse.filter(r => !q || `${r.guestName} ${r.roomNumber} ${r.bookingNo}`.toLowerCase().includes(q));
  }, [search, inHouse]);

  const canStart =
    (target === "room" && (selectedRes !== null || manualRoom.trim() !== "")) ||
    (target === "hall" && hallName.trim() !== "") ||
    (target === "walkin");

  const start = () => {
    if (target === "room") {
      onStart({
        target: "room",
        room: selectedRes ? selectedRes.roomNumber : manualRoom,
        guest: selectedRes ? selectedRes.guestName : null,
      });
    } else if (target === "hall") {
      onStart({ target: "hall", room: hallName, guest: null });
    } else {
      onStart({ target: "walkin", room: "—", guest: walkinName || null });
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <Card className="pointer-events-auto w-full max-w-lg p-0 animate-in shadow-xl overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 bg-surface-elevated border-b border-border flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Start a new order</h3>
              <p className="text-xs text-muted-foreground">Pick where the order is for, then start adding menu items</p>
            </div>
            <button type="button" onClick={onClose} className="h-8 w-8 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Target type toggle */}
          <div className="px-5 pt-4">
            <div className="grid grid-cols-3 gap-2">
              <TargetTile icon={BedDouble} label="In-room" hint="Pick guest" active={target === "room"} onClick={() => setTarget("room")} />
              <TargetTile icon={Building2} label="Hall / Event" hint="Banquet menu" active={target === "hall"} onClick={() => setTarget("hall")} />
              <TargetTile icon={User} label="Walk-in" hint="POS sale" active={target === "walkin"} onClick={() => setTarget("walkin")} />
            </div>
          </div>

          <div className="px-5 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
            {/* IN-ROOM: pick guest */}
            {target === "room" && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Search in-house guest</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle-foreground" />
                    <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Name, room #, booking #…" className="pl-9 h-9" autoFocus />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">In-house guests ({filteredGuests.length})</Label>
                  <div className="space-y-1.5 max-h-[230px] overflow-y-auto pr-1">
                    {filteredGuests.length === 0 && (
                      <p className="text-xs text-muted-foreground py-3 text-center">No matches — try the manual room field below.</p>
                    )}
                    {filteredGuests.map(r => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => { setSelectedRes(r); setManualRoom(""); }}
                        className={cn(
                          "w-full flex items-center gap-3 p-2.5 rounded-md border text-left transition-colors",
                          selectedRes?.id === r.id ? "bg-brand-soft border-brand" : "border-border hover:bg-surface-sunken"
                        )}
                      >
                        <Avatar name={r.guestName} size={32} vip={r.vip} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium truncate">{r.guestName}</p>
                            <Badge tone="neutral">{r.bookingNo}</Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground">Room {r.roomNumber} · {r.roomType}</p>
                        </div>
                        {selectedRes?.id === r.id && <CheckCircle2 className="h-4 w-4 text-brand" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-border">
                  <Label className="text-xs">Or enter room # manually</Label>
                  <Input
                    value={manualRoom}
                    onChange={e => { setManualRoom(e.target.value); setSelectedRes(null); }}
                    placeholder="e.g. 305"
                    className="mt-1.5 h-9 font-mono tabular"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">Use this if the guest isn&apos;t in the list (e.g. day-use room).</p>
                </div>
              </>
            )}

            {/* HALL */}
            {target === "hall" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Hall / venue</Label>
                <Select value={hallName} onChange={e => setHallName(e.target.value)}>
                  <option>Banquet A</option>
                  <option>Banquet B</option>
                  <option>Garden Pavilion</option>
                  <option>Crystal Hall</option>
                  <option>Conference Room 1</option>
                </Select>
                <p className="text-[11px] text-muted-foreground mt-1">Orders billed against the hall booking folio.</p>
              </div>
            )}

            {/* WALK-IN */}
            {target === "walkin" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Guest name (optional)</Label>
                <Input value={walkinName} onChange={e => setWalkinName(e.target.value)} placeholder="Walk-in customer" className="h-9" autoFocus />
                <p className="text-[11px] text-muted-foreground mt-1">No room — payment collected at the F&amp;B counter.</p>
              </div>
            )}

            {/* AI hint */}
            <div className="rounded-md bg-brand-soft/40 border border-brand/20 p-3 text-xs flex items-start gap-2">
              <Sparkles className="h-3.5 w-3.5 text-brand shrink-0 mt-0.5" />
              <p className="text-muted-foreground">
                After you click <span className="font-medium text-foreground">Start order</span>, pick items from the menu — the cart will be ready to send to kitchen.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-border bg-surface-elevated flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button onClick={start} disabled={!canStart}>
              Start order
              <UtensilsCrossed className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}

function TargetTile({
  icon: Icon, label, hint, active, onClick,
}: {
  icon: typeof BedDouble;
  label: string;
  hint: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md border p-3 text-left transition-all",
        active ? "bg-brand-soft border-brand shadow-sm" : "border-border hover:bg-surface-sunken"
      )}
    >
      <Icon className={cn("h-4 w-4", active ? "text-brand" : "text-muted-foreground")} />
      <p className={cn("text-sm font-medium mt-1.5", active && "text-brand-soft-foreground")}>{label}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>
    </button>
  );
}

function Row({ label, value, muted }: { label: React.ReactNode; value: React.ReactNode; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={cn(muted ? "text-muted-foreground" : "text-muted-foreground", "text-xs")}>{label}</span>
      <span className={cn("tabular", muted ? "text-muted-foreground" : "text-foreground font-medium")}>{value}</span>
    </div>
  );
}

// ===================== ORDER MODALS =====================
type OrderStatus = "preparing" | "in-kitchen" | "delivered" | "cancelled";
type LineItem = { name: string; qty: number; price: number };
type FoodOrder = {
  id: string; room: string; guest: string; time: string; items: number;
  total: number; status: OrderStatus; paidBy: string; instructions?: string; lineItems?: LineItem[];
};
type ModifyPatch = { items?: number; total?: number; instructions?: string };

type MenuItem = { id: string; cat: string; name: string; price: number; veg?: boolean; spice?: string | null; tag?: string | null };
// Row shape from GET /api/fb-orders
type FbOrderRow = {
  id: number | string; orderNo?: string; tableNo?: string; server?: string | null;
  items?: LineItem[] | null; total?: number; status?: string; paymentMethod?: string | null;
  room?: string | null; created_at?: string;
};

const FB_STATUS_MAP: Record<string, OrderStatus> = {
  placed: "in-kitchen", new: "in-kitchen", "in-kitchen": "in-kitchen",
  preparing: "preparing", ready: "preparing",
  served: "delivered", paid: "delivered", delivered: "delivered", completed: "delivered",
  cancelled: "cancelled", canceled: "cancelled",
};

function normalizeMenu(r: { id: number | string; cat?: string; name?: string; price?: number; veg?: boolean; spice?: string | null; tag?: string | null }): MenuItem {
  return { id: String(r.id), cat: r.cat ?? "Other", name: r.name ?? "", price: Number(r.price) || 0, veg: r.veg, spice: r.spice, tag: r.tag };
}

function normalizeOrder(r: FbOrderRow): FoodOrder {
  const line = Array.isArray(r.items) ? r.items : [];
  const count = line.reduce((s, it) => s + (Number(it?.qty) || 1), 0) || line.length;
  const status = FB_STATUS_MAP[String(r.status ?? "").toLowerCase()] ?? "preparing";
  const time = r.created_at
    ? new Date(r.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";
  return {
    id: String(r.id),
    room: r.room || r.tableNo || "—",
    guest: r.server || "",
    time,
    items: count,
    total: Number(r.total) || 0,
    status,
    paidBy: r.paymentMethod || "—",
    lineItems: line,
  };
}

function ModifyOrderModal({ order, onClose, onSave }: {
  order: FoodOrder;
  onClose: () => void;
  onSave: (patch: ModifyPatch) => void;
}) {
  const [items, setItems] = React.useState(order.items);
  const [total, setTotal] = React.useState(order.total);
  const [instructions, setInstructions] = React.useState("");

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <Card className="pointer-events-auto w-full max-w-md p-0 animate-in shadow-xl overflow-hidden">
          <div className="px-5 py-4 bg-surface-elevated border-b border-border flex items-center gap-3">
            <span className="h-10 w-10 rounded-md bg-brand-soft text-brand-soft-foreground inline-flex items-center justify-center shrink-0">
              <Edit className="h-5 w-5" />
            </span>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">Modify Room {order.room} order</h3>
              <p className="text-xs text-muted-foreground truncate">{order.guest} · placed {order.time}</p>
            </div>
            <button type="button" onClick={onClose} className="h-8 w-8 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
          </div>

          <div className="px-5 py-4 space-y-3">
            {/* Warning */}
            <div className="rounded-md bg-warning-soft border border-warning/30 p-2.5 text-xs flex items-start gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" />
              <p className="text-muted-foreground">
                Modifications go to the kitchen as a <span className="font-medium text-foreground">revised KOT</span>.
                Only available while status is <span className="font-medium text-foreground">Preparing</span>.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Items count</Label>
                <Input type="number" min={1} value={items} onChange={e => setItems(Math.max(1, Number(e.target.value)))} className="h-9 tabular" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Revised total (₹)</Label>
                <Input type="number" min={0} value={total} onChange={e => setTotal(Math.max(0, Number(e.target.value)))} className="h-9 tabular" />
              </div>
            </div>

            <div className="rounded-md bg-surface-sunken/40 border border-border p-2.5 text-xs flex items-center justify-between">
              <span className="text-muted-foreground">Original</span>
              <span className="tabular">{order.items} items · {money(order.total)}</span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Revision notes for kitchen</Label>
              <textarea
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
                rows={3}
                placeholder="e.g. Remove ice from cola · Add extra cheese on burger · No onion in salad · Make it well-done"
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm placeholder:text-subtle-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 outline-hidden resize-y min-h-[72px]"
              />
            </div>
          </div>

          <div className="px-5 py-3 border-t border-border bg-surface-elevated flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button onClick={() => onSave({ items, total, instructions })} variant="success">
              <CheckCircle2 className="h-4 w-4" />Save &amp; reprint KOT
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}

function CancelOrderModal({ order, onClose, onConfirm }: {
  order: FoodOrder;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = React.useState("Guest changed mind");
  const [notes, setNotes] = React.useState("");
  const [confirmText, setConfirmText] = React.useState("");

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  const cancellable = order.status === "preparing" || order.status === "in-kitchen";
  const wastageWarning = order.status === "in-kitchen";
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
              <h3 className="font-semibold truncate">Cancel Room {order.room} order</h3>
              <p className="text-xs text-muted-foreground truncate">{order.guest} · {order.items} items · {money(order.total)}</p>
            </div>
            <button type="button" onClick={onClose} className="h-8 w-8 rounded-md hover:bg-white/40 inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
          </div>

          <div className="px-5 py-4 space-y-3">
            {!cancellable ? (
              <div className="rounded-md bg-danger-soft border border-danger/30 p-3 text-xs">
                <p className="font-semibold text-danger">Cannot cancel — order already {order.status}.</p>
              </div>
            ) : wastageWarning ? (
              <div className="rounded-md bg-warning-soft border border-warning/30 p-3 text-xs">
                <p className="font-semibold text-warning inline-flex items-center gap-1.5">
                  <AlertTriangle className="h-3 w-3" />Order already in kitchen
                </p>
                <p className="text-muted-foreground mt-1">
                  Cancellation may incur a <span className="font-medium text-foreground">50% wastage charge</span> ({money(Math.round(order.total / 2))}) because preparation has started.
                </p>
              </div>
            ) : (
              <div className="rounded-md bg-success-soft border border-success/30 p-3 text-xs">
                <p className="font-semibold text-success inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-3 w-3" />Full cancellation allowed
                </p>
                <p className="text-muted-foreground mt-1">Order has not entered preparation. No charges apply.</p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">Reason</Label>
              <Select value={reason} onChange={e => setReason(e.target.value)} className="h-9">
                <option>Guest changed mind</option>
                <option>Wrong items ordered</option>
                <option>Allergy / dietary issue raised</option>
                <option>Long delay — guest requested cancellation</option>
                <option>Kitchen out of stock</option>
                <option>Duplicate order</option>
                <option>Other</option>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Notes (optional)</Label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                placeholder="Any additional context for kitchen / F&B manager…"
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm placeholder:text-subtle-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 outline-hidden resize-y min-h-[56px]"
              />
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
            <Button variant="ghost" size="sm" onClick={onClose}>Keep order</Button>
            <Button onClick={() => onConfirm(reason)} disabled={!valid || !cancellable} variant="danger">
              <Ban className="h-4 w-4" />Cancel order
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}

function ViewOrderModal({ order, override, onClose, onModify, onCancel }: {
  order: FoodOrder;
  override: { items?: number; total?: number; instructions?: string; status?: string } | undefined;
  onClose: () => void;
  onModify: () => void;
  onCancel: () => void;
}) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  const status = override?.status ?? order.status;
  const items = override?.items ?? order.items;
  const total = override?.total ?? order.total;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <Card className="pointer-events-auto w-full max-w-md p-0 animate-in shadow-xl overflow-hidden">
          <div className="px-5 py-4 bg-linear-to-br from-brand-soft via-surface to-surface border-b border-border flex items-center gap-3">
            <span className="h-12 w-12 rounded-md bg-brand text-brand-foreground inline-flex items-center justify-center shrink-0">
              <UtensilsCrossed className="h-6 w-6" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Room {order.room}</p>
              <h3 className="font-semibold truncate">{order.guest}</h3>
              <p className="text-xs text-muted-foreground">Placed at {order.time}</p>
            </div>
            <button type="button" onClick={onClose} className="h-8 w-8 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
          </div>

          <div className="px-5 py-4 space-y-3">
            {/* Status + ETA */}
            <div className="rounded-md border border-border p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Status</span>
                <Badge tone={
                  status === "preparing" ? "warning" :
                  status === "in-kitchen" ? "info" :
                  status === "delivered" ? "success" : "danger"
                }>{status}</Badge>
              </div>
              {(status === "preparing" || status === "in-kitchen") && (
                <p className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />
                  {status === "preparing" ? "Waiting for kitchen pickup · editable for ~5 min" : "Kitchen is cooking · ETA ~8 min"}
                </p>
              )}
            </div>

            {/* Order summary */}
            <div className="rounded-md border border-border p-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Items</span>
                <span className="tabular font-medium">{items}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="tabular">{money(Math.round(total / 1.05))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax (5%)</span>
                <span className="tabular">{money(total - Math.round(total / 1.05))}</span>
              </div>
              <div className="flex justify-between pt-1.5 border-t border-border">
                <span className="font-semibold">Total</span>
                <span className="font-semibold tabular text-base">{money(total)}</span>
              </div>
              <p className="text-[11px] text-muted-foreground pt-1">Charged via: <span className="text-foreground font-medium">{order.paidBy}</span></p>
            </div>

            {/* Revision notes */}
            {override?.instructions && (
              <div className="rounded-md bg-warning-soft/40 border border-warning/30 p-3 text-xs">
                <p className="font-semibold text-warning uppercase tracking-wider text-[10px] mb-1">Revision notes</p>
                <p className="whitespace-pre-wrap text-foreground">{override.instructions}</p>
              </div>
            )}
          </div>

          <div className="px-5 py-3 border-t border-border bg-surface-elevated grid grid-cols-3 gap-2">
            <Button variant="outline" size="sm" onClick={onModify} disabled={status !== "preparing"}>
              <Edit className="h-3.5 w-3.5" />Modify
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Receipt className="h-3.5 w-3.5" />KOT
            </Button>
            <Button variant="danger" size="sm" onClick={onCancel} disabled={status === "delivered" || status === "cancelled"}>
              <Ban className="h-3.5 w-3.5" />Cancel
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}
