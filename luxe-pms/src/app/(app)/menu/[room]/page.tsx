"use client";
import * as React from "react";
import { use } from "react";
import {
  Hotel, Phone, Plus, Minus, ShoppingBag, X, ChefHat, Clock,
  CheckCircle2, Sparkles, AlertCircle, Send, MapPin, Utensils,
  Coffee, Soup, Salad, IceCream, Cookie, Bike, Home, ArrowRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn, money } from "@/lib/utils";

// ---------- Menu data ----------
type MenuCategory = "Breakfast" | "Mains" | "Indian" | "Continental" | "Sides" | "Desserts" | "Beverages";

type MenuItem = {
  id: string;
  name: string;
  desc: string;
  price: number;
  category: MenuCategory;
  veg: boolean;
  spicy?: boolean;
  badge?: string;
};

const MENU: MenuItem[] = [
  // Breakfast
  { id: "b1", name: "Masala Dosa", desc: "Crispy rice crepe with spiced potato filling, sambar & coconut chutney", price: 280, category: "Breakfast", veg: true, badge: "Chef's pick" },
  { id: "b2", name: "Avocado Toast", desc: "Sourdough, smashed avocado, poached egg, chilli flakes", price: 420, category: "Breakfast", veg: true },
  { id: "b3", name: "Poha Tadka", desc: "Flattened rice tempered with curry leaves, peanuts & lime", price: 220, category: "Breakfast", veg: true },
  { id: "b4", name: "Eggs Benedict", desc: "Toasted muffin, ham, two poached eggs, hollandaise", price: 480, category: "Breakfast", veg: false },

  // Mains / Indian
  { id: "i1", name: "Butter Chicken", desc: "Tandoor-roasted chicken in silky tomato-cream gravy", price: 520, category: "Indian", veg: false, badge: "Bestseller" },
  { id: "i2", name: "Paneer Tikka Masala", desc: "Charred cottage cheese in rich onion-tomato masala", price: 460, category: "Indian", veg: true },
  { id: "i3", name: "Dal Makhani", desc: "Slow-cooked black lentils, butter & cream, 24-hour simmered", price: 380, category: "Indian", veg: true },
  { id: "i4", name: "Mutton Rogan Josh", desc: "Kashmiri lamb curry with aromatic spices & saffron", price: 620, category: "Indian", veg: false, spicy: true },
  { id: "i5", name: "Hyderabadi Biryani", desc: "Fragrant basmati layered with marinated chicken, served with raita", price: 540, category: "Indian", veg: false, spicy: true },
  { id: "i6", name: "Veg Biryani", desc: "Dum-cooked basmati, mixed vegetables, fried onion, mint", price: 420, category: "Indian", veg: true },

  // Continental Mains
  { id: "c1", name: "Grilled Atlantic Salmon", desc: "Lemon-herb butter, sautéed greens, mashed potato", price: 980, category: "Continental", veg: false },
  { id: "c2", name: "Margherita Pizza", desc: "San Marzano tomato, fior di latte, fresh basil, EVOO", price: 540, category: "Continental", veg: true },
  { id: "c3", name: "Penne Arrabbiata", desc: "Spicy tomato sugo, garlic, chilli, parmesan", price: 480, category: "Continental", veg: true, spicy: true },
  { id: "c4", name: "Mushroom Risotto", desc: "Arborio rice, wild mushrooms, truffle oil, aged pecorino", price: 620, category: "Continental", veg: true },
  { id: "c5", name: "Caesar Salad", desc: "Romaine, parmesan, croutons, anchovy dressing", price: 380, category: "Continental", veg: false },
  { id: "c6", name: "Club Sandwich", desc: "Triple-decker with chicken, bacon, egg, lettuce, fries", price: 460, category: "Continental", veg: false },

  // Sides
  { id: "s1", name: "Garlic Naan", desc: "Tandoor-fresh, brushed with butter & garlic", price: 80, category: "Sides", veg: true },
  { id: "s2", name: "Steamed Basmati Rice", desc: "Long grain, fluffy, fragrant", price: 140, category: "Sides", veg: true },
  { id: "s3", name: "French Fries", desc: "Hand-cut, sea salt, peri-peri dip", price: 220, category: "Sides", veg: true },
  { id: "s4", name: "Papad Platter", desc: "Roasted & fried, mint chutney, onion salad", price: 120, category: "Sides", veg: true },

  // Desserts
  { id: "d1", name: "Gulab Jamun", desc: "Warm milk dumplings in cardamom-rose syrup (2 pcs)", price: 240, category: "Desserts", veg: true },
  { id: "d2", name: "Tiramisu", desc: "Layered mascarpone, espresso-soaked savoiardi, cocoa", price: 360, category: "Desserts", veg: true },
  { id: "d3", name: "Chocolate Fondant", desc: "Warm molten centre, vanilla bean ice cream", price: 380, category: "Desserts", veg: true, badge: "New" },

  // Beverages
  { id: "v1", name: "Masala Chai", desc: "Cardamom, ginger, fresh milk, brewed strong", price: 120, category: "Beverages", veg: true },
  { id: "v2", name: "Fresh Lime Soda", desc: "Sweet, salty or mixed — your choice", price: 180, category: "Beverages", veg: true },
  { id: "v3", name: "Cold Brew Coffee", desc: "12-hour steeped, smooth & low acid", price: 280, category: "Beverages", veg: true },
  { id: "v4", name: "Mango Lassi", desc: "Alphonso pulp, hung curd, saffron", price: 220, category: "Beverages", veg: true },
];

const CATEGORIES: ("All" | MenuCategory)[] = ["All", "Breakfast", "Mains", "Indian", "Continental", "Sides", "Desserts", "Beverages"];

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  All: Utensils, Breakfast: Coffee, Mains: ChefHat, Indian: Soup,
  Continental: Salad, Sides: Cookie, Desserts: IceCream, Beverages: Coffee,
};

type OrderStage = "Received" | "Preparing" | "Out" | "Delivered";
const STAGES: OrderStage[] = ["Received", "Preparing", "Out", "Delivered"];

const STAGE_ICONS: Record<OrderStage, React.ElementType> = {
  Received: CheckCircle2,
  Preparing: ChefHat,
  Out: Bike,
  Delivered: Home,
};

// ---------- Page ----------
export default function MenuRoomPage({ params }: { params: Promise<{ room: string }> }) {
  const { room } = use(params);

  const [cat, setCat] = React.useState<(typeof CATEGORIES)[number]>("All");
  const [cart, setCart] = React.useState<Record<string, number>>({});
  const [checkoutOpen, setCheckoutOpen] = React.useState(false);
  const [success, setSuccess] = React.useState<{ orderNo: string; eta: number } | null>(null);
  const [trackOpen, setTrackOpen] = React.useState(false);
  const [trackStage, setTrackStage] = React.useState<number>(0);
  const [toast, setToast] = React.useState<string | null>(null);

  // Checkout form fields
  const [eta, setEta] = React.useState("30");
  const [instructions, setInstructions] = React.useState("");
  const [allergy, setAllergy] = React.useState("");

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };

  const filtered = React.useMemo(() => {
    if (cat === "All") return MENU;
    if (cat === "Mains") return MENU.filter(m => m.category === "Indian" || m.category === "Continental");
    return MENU.filter(m => m.category === cat);
  }, [cat]);

  const cartCount = React.useMemo(() => Object.values(cart).reduce((a, b) => a + b, 0), [cart]);
  const cartTotal = React.useMemo(() => {
    return Object.entries(cart).reduce((sum, [id, qty]) => {
      const item = MENU.find(m => m.id === id);
      return sum + (item ? item.price * qty : 0);
    }, 0);
  }, [cart]);

  const cartItems = React.useMemo(() => {
    return Object.entries(cart)
      .map(([id, qty]) => ({ item: MENU.find(m => m.id === id)!, qty }))
      .filter(x => x.item);
  }, [cart]);

  const gst = Math.round(cartTotal * 0.05); // 5% GST on F&B
  const grandTotal = cartTotal + gst;

  const addToCart = (id: string) => {
    setCart(c => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
    const item = MENU.find(m => m.id === id);
    if (item) showToast(`${item.name} added`);
  };

  const removeFromCart = (id: string) => {
    setCart(c => {
      const next = { ...c };
      if ((next[id] ?? 0) <= 1) delete next[id];
      else next[id] = next[id] - 1;
      return next;
    });
  };

  const placeOrder = () => {
    const orderNo = `RSV-${Math.floor(1000 + Math.random() * 9000)}`;
    setSuccess({ orderNo, eta: Number(eta) || 30 });
    setCheckoutOpen(false);
    setCart({});
    setInstructions("");
    setAllergy("");
    showToast(`Order ${orderNo} sent to kitchen`);
  };

  // Auto-advance tracker for demo
  React.useEffect(() => {
    if (!trackOpen) return;
    if (trackStage >= STAGES.length - 1) return;
    const t = setTimeout(() => setTrackStage(s => Math.min(s + 1, STAGES.length - 1)), 3500);
    return () => clearTimeout(t);
  }, [trackOpen, trackStage]);

  // -------- Success screen --------
  if (success && !trackOpen) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-brand-soft/30 to-background">
        <div className="max-w-md mx-auto p-4 sm:p-6 min-h-screen flex flex-col">
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 py-10">
            <div className="h-20 w-20 rounded-full bg-success-soft text-success flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">Order placed</h1>
              <p className="text-muted-foreground text-sm">Your order has been received by our kitchen.</p>
            </div>
            <Card className="w-full p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">Order no.</span>
                <span className="font-bold tabular">{success.orderNo}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">Room</span>
                <Badge tone="brand">Room {room}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">Estimated arrival</span>
                <span className="font-semibold tabular flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {success.eta} min
                </span>
              </div>
            </Card>
            <Button
              className="w-full"
              onClick={() => { setTrackOpen(true); setTrackStage(0); showToast("Tracking your order"); }}
            >
              <MapPin className="h-4 w-4" />
              Track order
            </Button>
            <button
              onClick={() => { setSuccess(null); showToast("Back to menu"); }}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Order something else
            </button>
          </div>
          <Footer />
          {toast && (<div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-foreground text-background rounded-lg px-4 py-3 text-sm shadow-2xl">{toast}</div>)}
        </div>
      </div>
    );
  }

  // -------- Tracker screen --------
  if (trackOpen && success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-brand-soft/30 to-background">
        <div className="max-w-md mx-auto p-4 sm:p-6 min-h-screen flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => setTrackOpen(false)} className="text-sm text-muted-foreground flex items-center gap-1">
              <X className="h-4 w-4" /> Close
            </button>
            <Badge tone="brand">Room {room}</Badge>
          </div>

          <div className="text-center mb-6">
            <h1 className="text-xl font-bold">Order {success.orderNo}</h1>
            <p className="text-sm text-muted-foreground mt-1">ETA {success.eta} min</p>
          </div>

          <Card className="p-5">
            <div className="space-y-5">
              {STAGES.map((stage, i) => {
                const Icon = STAGE_ICONS[stage];
                const done = i <= trackStage;
                const active = i === trackStage;
                return (
                  <div key={stage} className="flex items-start gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className={cn(
                          "h-10 w-10 rounded-full flex items-center justify-center transition-colors",
                          done ? "bg-brand text-brand-foreground" : "bg-surface-sunken text-muted-foreground",
                          active && "ring-4 ring-brand-soft"
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      {i < STAGES.length - 1 && (
                        <div className={cn("w-0.5 h-10 mt-1", i < trackStage ? "bg-brand" : "bg-border")} />
                      )}
                    </div>
                    <div className="flex-1 pt-1.5">
                      <div className={cn("font-semibold text-sm", done ? "text-foreground" : "text-muted-foreground")}>
                        {stage === "Received" && "Order received"}
                        {stage === "Preparing" && "Chef is preparing"}
                        {stage === "Out" && "Out for delivery"}
                        {stage === "Delivered" && "Delivered to your room"}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {stage === "Received" && "Confirmed by kitchen"}
                        {stage === "Preparing" && "Cooking in progress"}
                        {stage === "Out" && "Your steward is on the way"}
                        {stage === "Delivered" && "Enjoy your meal!"}
                      </div>
                      {active && (
                        <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-brand">
                          <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse" />
                          In progress
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {trackStage >= STAGES.length - 1 && (
            <Card className="mt-4 p-4 bg-success-soft border-success/20">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <div>
                  <div className="font-semibold text-sm">Enjoy your meal!</div>
                  <div className="text-xs text-muted-foreground">Charged to your folio · Room {room}</div>
                </div>
              </div>
            </Card>
          )}

          <div className="mt-4 space-y-2">
            <Button variant="outline" className="w-full" onClick={() => { setSuccess(null); setTrackOpen(false); showToast("Back to menu"); }}>
              Order more items
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => showToast("Connecting to front desk · ext 9")}>
              <Phone className="h-4 w-4" />
              Call front desk
            </Button>
          </div>

          <div className="flex-1" />
          <Footer />
          {toast && (<div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-foreground text-background rounded-lg px-4 py-3 text-sm shadow-2xl">{toast}</div>)}
        </div>
      </div>
    );
  }

  // -------- Main menu screen --------
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto pb-32">
        {/* Hero */}
        <div className="bg-gradient-to-br from-brand to-accent text-brand-foreground p-5 pb-7 rounded-b-3xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-xl bg-background/15 backdrop-blur-sm flex items-center justify-center">
                <Hotel className="h-5 w-5" />
              </div>
              <div className="text-xs">
                <div className="font-bold tracking-wide">THE PEARL MARINA</div>
                <div className="opacity-80">Mumbai</div>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-background/15 backdrop-blur-sm px-3 py-1 text-xs font-semibold">
              <MapPin className="h-3 w-3" />
              Room {room}
            </span>
          </div>
          <div className="space-y-1">
            <div className="text-xs opacity-80 uppercase tracking-wider">In-room dining</div>
            <h1 className="text-2xl font-bold leading-tight">Good evening</h1>
            <p className="text-sm opacity-90">What would you like to order to Room {room}?</p>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 bg-background/15 backdrop-blur-sm rounded-full px-2.5 py-1">
              <Clock className="h-3 w-3" />
              30 min average
            </span>
            <span className="inline-flex items-center gap-1 bg-background/15 backdrop-blur-sm rounded-full px-2.5 py-1">
              <Sparkles className="h-3 w-3" />
              24/7 service
            </span>
          </div>
        </div>

        {/* Category strip */}
        <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border -mt-2 px-1 py-2">
          <div className="flex gap-2 overflow-x-auto no-scrollbar px-3 pb-1">
            {CATEGORIES.map(c => {
              const Icon = CATEGORY_ICONS[c];
              const active = cat === c;
              return (
                <button
                  key={c}
                  onClick={() => { setCat(c); showToast(`Showing ${c}`); }}
                  className={cn(
                    "shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
                    active
                      ? "bg-foreground text-background border-foreground"
                      : "bg-surface text-foreground border-border hover:bg-surface-sunken"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {c}
                </button>
              );
            })}
          </div>
        </div>

        {/* Items grid */}
        <div className="px-4 pt-4 grid grid-cols-2 gap-3">
          {filtered.map(item => {
            const qty = cart[item.id] ?? 0;
            return (
              <Card key={item.id} className="overflow-hidden flex flex-col">
                {/* Image placeholder */}
                <div className="relative aspect-square bg-gradient-to-br from-surface-sunken to-surface flex items-center justify-center">
                  <Utensils className="h-8 w-8 text-muted-foreground/40" />
                  <div className="absolute top-2 left-2 flex flex-col gap-1">
                    <span
                      className={cn(
                        "h-4 w-4 rounded-sm border-2 flex items-center justify-center bg-background",
                        item.veg ? "border-success" : "border-danger"
                      )}
                      title={item.veg ? "Veg" : "Non-veg"}
                    >
                      <span className={cn("h-1.5 w-1.5 rounded-full", item.veg ? "bg-success" : "bg-danger")} />
                    </span>
                  </div>
                  {item.badge && (
                    <span className="absolute top-2 right-2 text-[9px] font-bold uppercase tracking-wide bg-accent text-accent-foreground rounded-full px-2 py-0.5">
                      {item.badge}
                    </span>
                  )}
                  {item.spicy && (
                    <span className="absolute bottom-2 left-2 text-[10px] bg-danger-soft text-danger rounded-full px-1.5 py-0.5">
                      Spicy
                    </span>
                  )}
                </div>
                <div className="p-3 flex-1 flex flex-col">
                  <div className="font-semibold text-sm leading-tight">{item.name}</div>
                  <div className="text-[11px] text-muted-foreground mt-1 line-clamp-2 flex-1">{item.desc}</div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="font-bold tabular text-sm">{money(item.price)}</span>
                    {qty === 0 ? (
                      <button
                        onClick={() => addToCart(item.id)}
                        className="h-7 w-7 rounded-full bg-foreground text-background flex items-center justify-center hover:opacity-90 transition-opacity"
                        aria-label={`Add ${item.name}`}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    ) : (
                      <div className="flex items-center gap-1 bg-foreground text-background rounded-full">
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="h-7 w-7 flex items-center justify-center"
                          aria-label="Remove one"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="text-xs font-bold w-4 text-center tabular">{qty}</span>
                        <button
                          onClick={() => addToCart(item.id)}
                          className="h-7 w-7 flex items-center justify-center"
                          aria-label="Add one"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <Footer />
      </div>

      {/* Floating cart */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 pb-4 px-4 pointer-events-none">
          <div className="max-w-md mx-auto pointer-events-auto">
            <button
              onClick={() => setCheckoutOpen(true)}
              className="w-full bg-foreground text-background rounded-2xl px-4 py-3.5 flex items-center justify-between shadow-2xl hover:opacity-95 transition-opacity"
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <ShoppingBag className="h-5 w-5" />
                  <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-accent text-accent-foreground text-[10px] font-bold flex items-center justify-center tabular">
                    {cartCount}
                  </span>
                </div>
                <div className="text-left">
                  <div className="text-[10px] uppercase tracking-wider opacity-70">{cartCount} item{cartCount > 1 ? "s" : ""}</div>
                  <div className="font-bold tabular text-sm">{money(grandTotal)}</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-sm font-semibold">
                Place order
                <ArrowRight className="h-4 w-4" />
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Checkout modal */}
      {checkoutOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl">
            <div className="sticky top-0 bg-surface z-10 flex items-center justify-between p-4 border-b border-border">
              <div>
                <div className="font-bold">Review & send</div>
                <div className="text-xs text-muted-foreground">Delivering to Room {room}</div>
              </div>
              <button onClick={() => setCheckoutOpen(false)} className="h-8 w-8 rounded-full hover:bg-surface-sunken flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Cart items */}
              <div className="space-y-2">
                {cartItems.map(({ item, qty }) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-surface-sunken flex items-center justify-center shrink-0">
                      <Utensils className="h-4 w-4 text-muted-foreground/50" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{item.name}</div>
                      <div className="text-xs text-muted-foreground tabular">{money(item.price)} × {qty}</div>
                    </div>
                    <div className="flex items-center gap-1 bg-surface-sunken rounded-full">
                      <button onClick={() => removeFromCart(item.id)} className="h-7 w-7 flex items-center justify-center">
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="text-xs font-bold w-4 text-center tabular">{qty}</span>
                      <button onClick={() => addToCart(item.id)} className="h-7 w-7 flex items-center justify-center">
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="text-sm font-semibold tabular w-16 text-right">{money(item.price * qty)}</div>
                  </div>
                ))}
              </div>

              {/* Delivery ETA */}
              <div className="space-y-1.5">
                <Label htmlFor="eta">Preferred delivery time</Label>
                <div className="grid grid-cols-3 gap-2">
                  {["ASAP", "30", "45"].map(opt => {
                    const val = opt === "ASAP" ? "20" : opt;
                    return (
                      <button
                        key={opt}
                        onClick={() => setEta(val)}
                        className={cn(
                          "h-10 rounded-lg border text-sm font-medium",
                          eta === val ? "bg-foreground text-background border-foreground" : "border-border hover:bg-surface-sunken"
                        )}
                      >
                        {opt === "ASAP" ? "ASAP" : `${opt} min`}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Allergy */}
              <div className="space-y-1.5">
                <Label htmlFor="allergy" className="flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-warning" />
                  Allergies or dietary notes
                </Label>
                <Input
                  id="allergy"
                  placeholder="e.g. nut allergy, lactose intolerant"
                  value={allergy}
                  onChange={e => setAllergy(e.target.value)}
                />
              </div>

              {/* Special instructions */}
              <div className="space-y-1.5">
                <Label htmlFor="instructions">Special instructions</Label>
                <textarea
                  id="instructions"
                  placeholder="e.g. less spicy, no onion, send extra cutlery"
                  value={instructions}
                  onChange={e => setInstructions(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-hidden placeholder:text-subtle-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 resize-none"
                />
              </div>

              {/* Bill */}
              <Card className="bg-surface-sunken/50 border-dashed p-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="tabular">{money(cartTotal)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">GST (5%)</span>
                  <span className="tabular">{money(gst)}</span>
                </div>
                <div className="border-t border-border pt-1.5 flex items-center justify-between font-semibold">
                  <span>Total · charged to room</span>
                  <span className="tabular">{money(grandTotal)}</span>
                </div>
              </Card>
            </div>

            <div className="sticky bottom-0 bg-surface border-t border-border p-4">
              <Button className="w-full h-12" onClick={placeOrder}>
                <Send className="h-4 w-4" />
                Send to kitchen
              </Button>
              <p className="text-[10px] text-muted-foreground text-center mt-2">
                Charges will be added to your folio · Room {room}
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] bg-foreground text-background rounded-lg px-4 py-3 text-sm shadow-2xl">
          {toast}
        </div>
      )}
    </div>
  );
}

// ---------- Footer ----------
function Footer() {
  return (
    <div className="mt-8 px-4 pb-2">
      <Card className="p-4 bg-surface-sunken/40">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-brand-soft text-brand-soft-foreground flex items-center justify-center">
            <Phone className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold">Need help?</div>
            <div className="text-xs text-muted-foreground">Call front desk · dial extension 9</div>
          </div>
          <a
            href="tel:9"
            className="text-xs font-semibold text-brand-soft-foreground bg-brand-soft rounded-full px-3 py-1.5"
          >
            Ext 9
          </a>
        </div>
      </Card>
      <div className="text-center text-[10px] text-muted-foreground mt-3">
        The Pearl Marina · Mumbai · MYHOTEL
      </div>
    </div>
  );
}
