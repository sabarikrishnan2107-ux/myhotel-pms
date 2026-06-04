"use client";
import * as React from "react";
import {
  Users, Building2, Phone, Mail, Calendar, BedDouble, UtensilsCrossed,
  Gift, PartyPopper, FileText, Sparkles,
  Percent, Target, ShieldCheck, ShieldAlert, ShieldX,
  CheckCircle2, XCircle, RefreshCw, Download, Send, ArrowUpRight,
  ArrowDownRight, Plus, Trash2, AlertTriangle, Clock, Briefcase,
  Cake, GlassWater, Crown, Award, Medal, Hotel, ChevronRight,
  Info, BarChart3, Wand2, Save,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn, money } from "@/lib/utils";

// ============================================================
// TYPES + SEED DATA
// ============================================================

type RoomTypeCode = "STD" | "DLX" | "STE" | "VLA";
type FBPlan = "EP" | "CP" | "MAP" | "AP" | "BQ";
type BanquetPkg = "silver" | "gold" | "platinum";
type LeadType = "wedding" | "corporate" | "conference" | "social" | "tour";
type Decision = "GO" | "MAYBE" | "STOP";

type RoomBlock = {
  id: string;
  type: RoomTypeCode;
  qty: number;
  rate: number; // per room per night
};

type RoomTypeMeta = {
  code: RoomTypeCode;
  name: string;
  rackRate: number;
  projectedBAR: number; // projected transient rate for the stay window
  inventory: number; // total rooms of this type at property
  forecastOccPct: number; // forecasted transient occupancy if NO group
};

const ROOM_TYPES: Record<RoomTypeCode, RoomTypeMeta> = {
  STD: { code: "STD", name: "Standard",  rackRate: 6800,  projectedBAR: 5900,  inventory: 48, forecastOccPct: 72 },
  DLX: { code: "DLX", name: "Deluxe",    rackRate: 9500,  projectedBAR: 8200,  inventory: 60, forecastOccPct: 78 },
  STE: { code: "STE", name: "Suite",     rackRate: 18500, projectedBAR: 15800, inventory: 14, forecastOccPct: 64 },
  VLA: { code: "VLA", name: "Villa",     rackRate: 28500, projectedBAR: 24200, inventory: 6,  forecastOccPct: 58 },
};

const FB_PLANS: { code: FBPlan; name: string; perPaxPerDay: number; desc: string }[] = [
  { code: "EP",  name: "Rooms only (EP)",      perPaxPerDay: 0,    desc: "No meals included" },
  { code: "CP",  name: "Continental (CP)",     perPaxPerDay: 950,  desc: "Breakfast only" },
  { code: "MAP", name: "Modified American (MAP)", perPaxPerDay: 2200, desc: "Breakfast + 1 meal" },
  { code: "AP",  name: "American Plan (AP)",   perPaxPerDay: 3400, desc: "All 3 meals" },
  { code: "BQ",  name: "Banquet inclusive",    perPaxPerDay: 0,    desc: "Catered via banquet pkg" },
];

const BANQUET_PKGS: { code: BanquetPkg; name: string; perPax: number; icon: typeof Medal; desc: string }[] = [
  { code: "silver",   name: "Silver",   perPax: 1850, icon: Medal, desc: "Veg/non-veg buffet, 1 live counter" },
  { code: "gold",     name: "Gold",     perPax: 2650, icon: Award, desc: "Premium buffet, 3 live counters, mocktails" },
  { code: "platinum", name: "Platinum", perPax: 3850, icon: Crown, desc: "Curated chef menu, 5 counters, premium bar" },
];

const BANQUET_VENUES = [
  { code: "pearl-grand",   name: "Pearl Grand Ballroom",   capacity: 450 },
  { code: "marina-hall",   name: "Marina Hall",            capacity: 250 },
  { code: "lotus-lawn",    name: "Lotus Lawn",             capacity: 600 },
  { code: "emerald-room",  name: "Emerald Conference",     capacity: 120 },
];

type Concessions = {
  compRooms: number;        // # rooms comped (e.g. 1 in 40)
  welcomeDrink: boolean;
  airportPickup: number;    // # of pickups
  cake: boolean;
  spaCredit: number;        // INR credit
  lateCheckout: boolean;
  discountPct: number;      // off the quoted room rate
};

const CONCESSION_COSTS = {
  welcomeDrink: 350,     // per pax per night
  airportPickup: 2200,   // per trip
  cake: 4500,
  lateCheckout: 1200,    // per room
};

// ============================================================
// HELPERS
// ============================================================

const fmtPct = (n: number) => `${n >= 0 ? "" : ""}${n.toFixed(1)}%`;

function decisionFor(margin: number, displacement: number, displacedRev: number, netRev: number): { d: Decision; tone: "success" | "warning" | "danger"; label: string; icon: typeof ShieldCheck } {
  // GO if net revenue beats displaced by 12%+ AND margin >= 28%
  // STOP if net revenue is below displaced (we are LOSING money vs transient)
  // MAYBE otherwise
  const lift = displacedRev > 0 ? ((netRev - displacedRev) / displacedRev) * 100 : 100;
  if (netRev < displacedRev) return { d: "STOP", tone: "danger", label: "STOP — displaces better business", icon: ShieldX };
  if (lift >= 12 && margin >= 28) return { d: "GO", tone: "success", label: "GO — strong lift over transient", icon: ShieldCheck };
  return { d: "MAYBE", tone: "warning", label: "MAYBE — negotiate concessions", icon: ShieldAlert };
}

// ============================================================
// PAGE
// ============================================================

export default function GroupQuotePage() {
  const [toast, setToast] = React.useState<string | null>(null);
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2800); };

  // --- LEAD ---
  const [company, setCompany] = React.useState("Iyer–Mehta Wedding");
  const [contact, setContact] = React.useState("Anjali Iyer");
  const [phone, setPhone] = React.useState("+91 98201 47821");
  const [email, setEmail] = React.useState("anjali.iyer@gmail.com");
  const [leadType, setLeadType] = React.useState<LeadType>("wedding");
  const [source, setSource] = React.useState("Direct enquiry");

  // --- DATES ---
  const [arrival, setArrival] = React.useState("2026-11-21");
  const [nights, setNights] = React.useState(4);

  // --- INVENTORY ---
  const [blocks, setBlocks] = React.useState<RoomBlock[]>([
    { id: "b1", type: "DLX", qty: 40, rate: 7200 },
    { id: "b2", type: "STE", qty: 15, rate: 13500 },
    { id: "b3", type: "VLA", qty: 5,  rate: 21500 },
  ]);

  const addBlock = () => {
    setBlocks([...blocks, { id: `b${Date.now()}`, type: "STD", qty: 5, rate: 5500 }]);
    showToast("Added room block — set type, qty, rate");
  };
  const removeBlock = (id: string) => {
    setBlocks(blocks.filter(b => b.id !== id));
    showToast("Removed room block");
  };
  const updateBlock = (id: string, patch: Partial<RoomBlock>) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, ...patch } : b));
  };

  // --- F&B ---
  const [fbPlan, setFbPlan] = React.useState<FBPlan>("BQ");
  const [paxPerRoom, setPaxPerRoom] = React.useState(2);

  // --- CONCESSIONS ---
  const [conc, setConc] = React.useState<Concessions>({
    compRooms: 3,
    welcomeDrink: true,
    airportPickup: 12,
    cake: true,
    spaCredit: 15000,
    lateCheckout: true,
    discountPct: 8,
  });

  // --- BANQUET ---
  const [bqVenue, setBqVenue] = React.useState("pearl-grand");
  const [bqPax, setBqPax] = React.useState(250);
  const [bqPkg, setBqPkg] = React.useState<BanquetPkg>("gold");
  const [bqEvents, setBqEvents] = React.useState(3); // mehndi + sangeet + reception

  // --- SPECIAL REQUESTS ---
  const [requests, setRequests] = React.useState(
    "Mehndi setup on lawn Day 1, sangeet stage Day 2, reception Day 3. Jain meals for 22 guests. Pundit room near bridal suite. Baraat entry via porte-cochère."
  );

  // ============================================================
  // LIVE CALCULATIONS
  // ============================================================

  const totalRoomNights = blocks.reduce((a, b) => a + b.qty, 0) * nights;
  const totalRooms = blocks.reduce((a, b) => a + b.qty, 0);

  // Quoted room revenue (after % discount)
  const grossRoomRev = blocks.reduce((a, b) => a + (b.qty * b.rate * nights), 0);
  const discountAmt = grossRoomRev * (conc.discountPct / 100);
  const netRoomRev = grossRoomRev - discountAmt;

  // F&B revenue
  const totalPax = totalRooms * paxPerRoom;
  const fbMeta = FB_PLANS.find(f => f.code === fbPlan)!;
  const fbRev = fbMeta.perPaxPerDay * totalPax * nights;

  // Banquet revenue
  const bqMeta = BANQUET_PKGS.find(b => b.code === bqPkg)!;
  const banquetRev = bqPkg && fbPlan === "BQ" ? bqMeta.perPax * bqPax * bqEvents : bqMeta.perPax * bqPax * bqEvents;

  // Concession COSTS (what we give up / spend)
  const compRoomCost = conc.compRooms > 0 && blocks.length > 0
    ? conc.compRooms * (netRoomRev / Math.max(totalRooms, 1)) // avg net rate per room across stay
    : 0;
  const welcomeDrinkCost = conc.welcomeDrink ? CONCESSION_COSTS.welcomeDrink * totalPax * nights : 0;
  const pickupCost = conc.airportPickup * CONCESSION_COSTS.airportPickup;
  const cakeCost = conc.cake ? CONCESSION_COSTS.cake : 0;
  const spaCost = conc.spaCredit;
  const lateCheckoutCost = conc.lateCheckout ? CONCESSION_COSTS.lateCheckout * totalRooms : 0;
  const totalConcessionCost = compRoomCost + welcomeDrinkCost + pickupCost + cakeCost + spaCost + lateCheckoutCost;

  // Gross quote (what guest will be billed)
  const grossQuote = netRoomRev + fbRev + banquetRev;

  // Variable cost assumption (housekeeping + linen + amenities + f&b cogs)
  const roomVarCost = totalRoomNights * 850; // per occupied room night
  const fbVarCost = fbRev * 0.38; // 38% food cost
  const banquetVarCost = banquetRev * 0.42; // banquet COGS
  const totalVarCost = roomVarCost + fbVarCost + banquetVarCost;

  // Net contribution (gross - concession cost - variable cost)
  const netContribution = grossQuote - totalConcessionCost - totalVarCost;
  const margin = grossQuote > 0 ? (netContribution / grossQuote) * 100 : 0;

  // ============================================================
  // DISPLACED BUSINESS CALC
  // ============================================================
  // For each room type, how many transient room-nights would we have sold at projected BAR?
  // Displacement = group rooms that displace transient demand (limited by inventory * forecastOcc - already booked)

  const displacementByType = blocks.map(b => {
    const meta = ROOM_TYPES[b.type];
    const groupNights = b.qty * nights;
    const transientCapacity = Math.round(meta.inventory * nights * (meta.forecastOccPct / 100));
    const displacedNights = Math.min(groupNights, transientCapacity);
    const displacedRev = displacedNights * meta.projectedBAR;
    return {
      type: b.type,
      name: meta.name,
      groupNights,
      transientCapacity,
      displacedNights,
      displacedRev,
      projectedBAR: meta.projectedBAR,
      groupRate: b.rate,
      diff: b.rate - meta.projectedBAR,
    };
  });

  const totalDisplacedRev = displacementByType.reduce((a, d) => a + d.displacedRev, 0);
  const totalDisplacedNights = displacementByType.reduce((a, d) => a + d.displacedNights, 0);
  const displacementPct = totalRoomNights > 0 ? (totalDisplacedNights / totalRoomNights) * 100 : 0;

  // Net revenue from group (room only, comparable to displaced room rev)
  const groupRoomOnly = netRoomRev;
  const liftVsTransient = totalDisplacedRev > 0 ? ((groupRoomOnly - totalDisplacedRev) / totalDisplacedRev) * 100 : 0;

  // Recommended minimum rate to break even with displaced + cover concessions
  const recommendedFloor = totalDisplacedNights > 0
    ? Math.ceil((totalDisplacedRev + totalConcessionCost * 0.6) / totalDisplacedNights / 100) * 100
    : 0;

  // Decision
  const decision = decisionFor(margin, displacementPct, totalDisplacedRev, groupRoomOnly + (banquetRev * 0.4));

  // Confidence (based on lead time + forecast firmness)
  const arrivalDate = new Date(arrival);
  const today = new Date(2026, 5, 2);
  const leadDays = Math.max(0, Math.round((arrivalDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
  const confidence = leadDays > 120 ? 62 : leadDays > 60 ? 78 : leadDays > 30 ? 88 : 94;

  // ============================================================
  // SCENARIO PRESETS
  // ============================================================
  const loadWedding = () => {
    setCompany("Iyer–Mehta Wedding");
    setContact("Anjali Iyer");
    setPhone("+91 98201 47821");
    setEmail("anjali.iyer@gmail.com");
    setLeadType("wedding");
    setArrival("2026-11-21");
    setNights(4);
    setBlocks([
      { id: "b1", type: "DLX", qty: 40, rate: 7200 },
      { id: "b2", type: "STE", qty: 15, rate: 13500 },
      { id: "b3", type: "VLA", qty: 5,  rate: 21500 },
    ]);
    setFbPlan("BQ");
    setBqVenue("pearl-grand");
    setBqPax(250);
    setBqPkg("gold");
    setBqEvents(3);
    setConc({ compRooms: 3, welcomeDrink: true, airportPickup: 12, cake: true, spaCredit: 15000, lateCheckout: true, discountPct: 8 });
    showToast("Loaded Indian wedding scenario · 60 rooms · 4 nights · banquet 250");
  };

  const loadCorporate = () => {
    setCompany("Tata Consultancy Services");
    setContact("Karan Mehta");
    setPhone("+91 99203 64210");
    setEmail("karan.mehta@tcs.com");
    setLeadType("conference");
    setArrival("2026-09-14");
    setNights(3);
    setBlocks([
      { id: "b1", type: "STD", qty: 30, rate: 5400 },
      { id: "b2", type: "DLX", qty: 20, rate: 7600 },
    ]);
    setFbPlan("MAP");
    setBqVenue("emerald-room");
    setBqPax(100);
    setBqPkg("silver");
    setBqEvents(2);
    setConc({ compRooms: 2, welcomeDrink: false, airportPickup: 6, cake: false, spaCredit: 0, lateCheckout: true, discountPct: 5 });
    showToast("Loaded corporate offsite scenario · 50 rooms · 3 nights");
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="h-12 w-12 rounded-xl bg-linear-to-br from-violet-500 to-fuchsia-600 text-white inline-flex items-center justify-center shadow-md">
            <Users className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-display font-medium tracking-tight">Group Pricing Optimiser</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Quote builder with displaced-business analysis &middot; The Pearl Marina, Mumbai &middot; live recommendation engine
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={loadWedding}>
            <PartyPopper className="h-3.5 w-3.5" />Wedding preset
          </Button>
          <Button variant="outline" size="sm" onClick={loadCorporate}>
            <Briefcase className="h-3.5 w-3.5" />Corporate preset
          </Button>
          <Button variant="outline" size="sm" onClick={() => showToast("Quote saved as draft #GQ-2026-1147")}>
            <Save className="h-3.5 w-3.5" />Save draft
          </Button>
          <Button size="sm" onClick={() => showToast("Quote PDF generated · sent to anjali.iyer@gmail.com")}>
            <Download className="h-3.5 w-3.5" />Export PDF
          </Button>
        </div>
      </div>

      {/* LEAD STATUS STRIP */}
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Badge tone="brand">Lead #GQ-2026-1147</Badge>
          <span className="text-muted-foreground">|</span>
          <span className="font-medium">{company}</span>
          <span className="text-muted-foreground">|</span>
          <Badge tone="neutral">{leadType}</Badge>
          <span className="text-muted-foreground">|</span>
          <span className="inline-flex items-center gap-1 text-muted-foreground"><Clock className="h-3.5 w-3.5" /><span className="tabular">{leadDays}</span> days out</span>
          <span className="text-muted-foreground">|</span>
          <span className="inline-flex items-center gap-1 text-muted-foreground"><BedDouble className="h-3.5 w-3.5" /><span className="tabular">{totalRooms}</span> rooms × <span className="tabular">{nights}</span> nights = <span className="tabular font-medium text-foreground">{totalRoomNights}</span> RN</span>
          <span className="text-muted-foreground">|</span>
          <span className="inline-flex items-center gap-1 text-muted-foreground"><Users className="h-3.5 w-3.5" /><span className="tabular">{totalPax}</span> pax</span>
          <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Sparkles className="h-3 w-3" /> Auto-saved 12s ago
          </span>
        </div>
      </Card>

      {/* MAIN GRID — LEFT FORM / RIGHT RECOMMENDATION */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* ==================== LEFT FORM (3 cols) ==================== */}
        <div className="lg:col-span-3 space-y-5">

          {/* LEAD INFO */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="h-8 w-8 rounded-md bg-violet-500/10 text-violet-600 inline-flex items-center justify-center">
                <Building2 className="h-4 w-4" />
              </span>
              <h2 className="font-medium">Lead information</h2>
              <Badge tone="info" className="ml-auto">Step 1</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Company / Event name</Label>
                <Input value={company} onChange={e => setCompany(e.target.value)} placeholder="e.g. Iyer-Mehta Wedding" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Contact person</Label>
                <Input value={contact} onChange={e => setContact(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Phone</Label>
                <div className="relative">
                  <Phone className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <Input value={phone} onChange={e => setPhone(e.target.value)} className="pl-9" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Email</Label>
                <div className="relative">
                  <Mail className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <Input value={email} onChange={e => setEmail(e.target.value)} className="pl-9" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Lead type</Label>
                <Select value={leadType} onChange={e => setLeadType(e.target.value as LeadType)}>
                  <option value="wedding">Wedding</option>
                  <option value="corporate">Corporate offsite</option>
                  <option value="conference">Conference</option>
                  <option value="social">Social event</option>
                  <option value="tour">Tour group</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Source</Label>
                <Select value={source} onChange={e => setSource(e.target.value)}>
                  <option>Direct enquiry</option>
                  <option>WeddingWire.in</option>
                  <option>ShaadiSaga</option>
                  <option>MakeMyTrip MICE</option>
                  <option>Travel agent — Thomas Cook</option>
                  <option>Sales rep — Priya Krishnan</option>
                </Select>
              </div>
            </div>
          </Card>

          {/* DATES */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="h-8 w-8 rounded-md bg-blue-500/10 text-blue-600 inline-flex items-center justify-center">
                <Calendar className="h-4 w-4" />
              </span>
              <h2 className="font-medium">Stay dates</h2>
              <Badge tone="info" className="ml-auto">Step 2</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Arrival date</Label>
                <Input type="date" value={arrival} onChange={e => setArrival(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Nights</Label>
                <Input type="number" min={1} max={14} value={nights} onChange={e => setNights(Math.max(1, +e.target.value))} className="tabular" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Departure</Label>
                <Input value={new Date(new Date(arrival).getTime() + nights * 86400000).toISOString().slice(0, 10)} readOnly className="tabular bg-surface-sunken/40" />
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[3, 4, 5, 7].slice(0, 4).map(n => (
                <Button
                  key={n}
                  variant="outline"
                  size="sm"
                  className={cn("text-xs", nights === n && "ring-2 ring-violet-500/40 border-violet-500/60")}
                  onClick={() => { setNights(n); showToast(`Set duration to ${n} nights`); }}
                >
                  {n} nights
                </Button>
              ))}
            </div>
          </Card>

          {/* INVENTORY ASK */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="h-8 w-8 rounded-md bg-emerald-500/10 text-emerald-600 inline-flex items-center justify-center">
                <BedDouble className="h-4 w-4" />
              </span>
              <h2 className="font-medium">Inventory ask</h2>
              <Badge tone="info" className="ml-auto">Step 3</Badge>
              <Button variant="outline" size="sm" onClick={addBlock}>
                <Plus className="h-3.5 w-3.5" />Add block
              </Button>
            </div>
            <div className="space-y-2">
              {blocks.map(b => {
                const meta = ROOM_TYPES[b.type];
                const blockSubtotal = b.qty * b.rate * nights;
                const vsBar = ((b.rate - meta.projectedBAR) / meta.projectedBAR) * 100;
                return (
                  <div key={b.id} className="grid grid-cols-12 gap-2 items-end p-3 rounded-lg border border-border bg-surface-sunken/30">
                    <div className="col-span-12 md:col-span-3 space-y-1">
                      <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Room type</Label>
                      <Select value={b.type} onChange={e => updateBlock(b.id, { type: e.target.value as RoomTypeCode })}>
                        {Object.values(ROOM_TYPES).map(rt => (
                          <option key={rt.code} value={rt.code}>{rt.name} ({money(rt.projectedBAR)} BAR)</option>
                        ))}
                      </Select>
                    </div>
                    <div className="col-span-4 md:col-span-2 space-y-1">
                      <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Qty</Label>
                      <Input type="number" min={1} value={b.qty} onChange={e => updateBlock(b.id, { qty: Math.max(1, +e.target.value) })} className="tabular" />
                    </div>
                    <div className="col-span-4 md:col-span-2 space-y-1">
                      <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Rate / night</Label>
                      <Input type="number" value={b.rate} onChange={e => updateBlock(b.id, { rate: Math.max(0, +e.target.value) })} className="tabular" />
                    </div>
                    <div className="col-span-4 md:col-span-2 space-y-1">
                      <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">vs BAR</Label>
                      <Badge tone={vsBar >= 0 ? "success" : "warning"} className="w-full justify-center h-10">
                        {vsBar >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {vsBar.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="col-span-10 md:col-span-2 space-y-1">
                      <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Subtotal</Label>
                      <div className="h-10 px-3 rounded-md border border-border bg-surface flex items-center text-sm tabular font-medium">
                        {money(blockSubtotal)}
                      </div>
                    </div>
                    <div className="col-span-2 md:col-span-1 flex justify-end">
                      <Button variant="ghost" size="sm" onClick={() => removeBlock(b.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              <div className="flex justify-between items-center pt-2 text-sm">
                <span className="text-muted-foreground">{blocks.length} block(s) &middot; <span className="tabular">{totalRooms}</span> rooms &middot; <span className="tabular">{totalRoomNights}</span> room-nights</span>
                <span className="font-medium tabular">{money(grossRoomRev)}</span>
              </div>
            </div>
          </Card>

          {/* F&B PLAN */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="h-8 w-8 rounded-md bg-amber-500/10 text-amber-600 inline-flex items-center justify-center">
                <UtensilsCrossed className="h-4 w-4" />
              </span>
              <h2 className="font-medium">F&amp;B plan</h2>
              <Badge tone="info" className="ml-auto">Step 4</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
              {FB_PLANS.map(p => {
                const active = p.code === fbPlan;
                return (
                  <button
                    key={p.code}
                    type="button"
                    onClick={() => { setFbPlan(p.code); showToast(`F&B plan set to ${p.name}`); }}
                    className={cn(
                      "text-left p-3 rounded-lg border transition-all",
                      active
                        ? "border-amber-500/60 bg-amber-500/5 ring-2 ring-amber-500/30"
                        : "border-border bg-surface hover:border-amber-500/30"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">{p.code}</span>
                      {active && <CheckCircle2 className="h-3.5 w-3.5 text-amber-600" />}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">{p.desc}</p>
                    <p className="text-xs tabular mt-2">{p.perPaxPerDay > 0 ? `${money(p.perPaxPerDay)}/pax/day` : "—"}</p>
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Pax per room (avg)</Label>
                <Input type="number" min={1} max={4} value={paxPerRoom} onChange={e => setPaxPerRoom(Math.max(1, +e.target.value))} className="tabular" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Total pax (computed)</Label>
                <div className="h-10 px-3 rounded-md border border-border bg-surface-sunken/40 flex items-center tabular font-medium">{totalPax}</div>
              </div>
            </div>
          </Card>

          {/* BANQUET */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="h-8 w-8 rounded-md bg-fuchsia-500/10 text-fuchsia-600 inline-flex items-center justify-center">
                <PartyPopper className="h-4 w-4" />
              </span>
              <h2 className="font-medium">Banquet &amp; events</h2>
              <Badge tone="info" className="ml-auto">Step 5</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Venue</Label>
                <Select value={bqVenue} onChange={e => setBqVenue(e.target.value)}>
                  {BANQUET_VENUES.map(v => (
                    <option key={v.code} value={v.code}>{v.name} (cap {v.capacity})</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Pax (banquet)</Label>
                <Input type="number" value={bqPax} onChange={e => setBqPax(Math.max(0, +e.target.value))} className="tabular" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Event sessions</Label>
                <Select value={bqEvents} onChange={e => setBqEvents(+e.target.value)}>
                  <option value={1}>1 session</option>
                  <option value={2}>2 sessions</option>
                  <option value={3}>3 sessions (mehndi + sangeet + reception)</option>
                  <option value={4}>4 sessions</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Package per-pax rate</Label>
                <div className="h-10 px-3 rounded-md border border-border bg-surface-sunken/40 flex items-center tabular font-medium">
                  {money(bqMeta.perPax)}/pax
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {BANQUET_PKGS.map(p => {
                const Icon = p.icon;
                const active = p.code === bqPkg;
                return (
                  <button
                    key={p.code}
                    type="button"
                    onClick={() => { setBqPkg(p.code); showToast(`Banquet package set to ${p.name}`); }}
                    className={cn(
                      "text-left p-3 rounded-lg border transition-all",
                      active
                        ? "border-fuchsia-500/60 bg-fuchsia-500/5 ring-2 ring-fuchsia-500/30"
                        : "border-border bg-surface hover:border-fuchsia-500/30"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={cn("h-4 w-4", active ? "text-fuchsia-600" : "text-muted-foreground")} />
                      <span className="font-medium text-sm">{p.name}</span>
                      {active && <CheckCircle2 className="h-3.5 w-3.5 text-fuchsia-600 ml-auto" />}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-2">{p.desc}</p>
                    <p className="text-sm tabular font-medium mt-2">{money(p.perPax)} <span className="text-xs text-muted-foreground font-normal">/ pax</span></p>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* CONCESSIONS */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="h-8 w-8 rounded-md bg-teal-500/10 text-teal-600 inline-flex items-center justify-center">
                <Gift className="h-4 w-4" />
              </span>
              <h2 className="font-medium">Concessions &amp; perks</h2>
              <Badge tone="info" className="ml-auto">Step 6</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Comp rooms</Label>
                <Input type="number" min={0} value={conc.compRooms} onChange={e => setConc({ ...conc, compRooms: Math.max(0, +e.target.value) })} className="tabular" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Discount on room rate (%)</Label>
                <Input type="number" min={0} max={50} value={conc.discountPct} onChange={e => setConc({ ...conc, discountPct: Math.max(0, Math.min(50, +e.target.value)) })} className="tabular" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Airport pickups</Label>
                <Input type="number" min={0} value={conc.airportPickup} onChange={e => setConc({ ...conc, airportPickup: Math.max(0, +e.target.value) })} className="tabular" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Spa credit (INR)</Label>
                <Input type="number" min={0} value={conc.spaCredit} onChange={e => setConc({ ...conc, spaCredit: Math.max(0, +e.target.value) })} className="tabular" />
              </div>
              <div className="col-span-2 grid grid-cols-3 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setConc({ ...conc, welcomeDrink: !conc.welcomeDrink })}
                  className={cn(
                    "p-3 rounded-lg border text-left transition-all",
                    conc.welcomeDrink ? "border-teal-500/60 bg-teal-500/5 ring-1 ring-teal-500/30" : "border-border bg-surface"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <GlassWater className="h-4 w-4 text-teal-600" />
                    <span className="text-sm font-medium">Welcome drink</span>
                    {conc.welcomeDrink && <CheckCircle2 className="h-3.5 w-3.5 text-teal-600 ml-auto" />}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">{money(CONCESSION_COSTS.welcomeDrink)}/pax/night</p>
                </button>
                <button
                  type="button"
                  onClick={() => setConc({ ...conc, cake: !conc.cake })}
                  className={cn(
                    "p-3 rounded-lg border text-left transition-all",
                    conc.cake ? "border-teal-500/60 bg-teal-500/5 ring-1 ring-teal-500/30" : "border-border bg-surface"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Cake className="h-4 w-4 text-teal-600" />
                    <span className="text-sm font-medium">Anniversary cake</span>
                    {conc.cake && <CheckCircle2 className="h-3.5 w-3.5 text-teal-600 ml-auto" />}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">{money(CONCESSION_COSTS.cake)} one-time</p>
                </button>
                <button
                  type="button"
                  onClick={() => setConc({ ...conc, lateCheckout: !conc.lateCheckout })}
                  className={cn(
                    "p-3 rounded-lg border text-left transition-all",
                    conc.lateCheckout ? "border-teal-500/60 bg-teal-500/5 ring-1 ring-teal-500/30" : "border-border bg-surface"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-teal-600" />
                    <span className="text-sm font-medium">Late checkout</span>
                    {conc.lateCheckout && <CheckCircle2 className="h-3.5 w-3.5 text-teal-600 ml-auto" />}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">{money(CONCESSION_COSTS.lateCheckout)}/room</p>
                </button>
              </div>
            </div>
          </Card>

          {/* SPECIAL REQUESTS */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="h-8 w-8 rounded-md bg-slate-500/10 text-slate-600 inline-flex items-center justify-center">
                <FileText className="h-4 w-4" />
              </span>
              <h2 className="font-medium">Special requests</h2>
              <Badge tone="info" className="ml-auto">Step 7</Badge>
            </div>
            <textarea
              value={requests}
              onChange={e => setRequests(e.target.value)}
              rows={4}
              placeholder="Decor, dietary, ops notes, vendor coordination..."
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
            />
          </Card>
        </div>

        {/* ==================== RIGHT RECOMMENDATION (2 cols) ==================== */}
        <div className="lg:col-span-2 space-y-5">
          <div className="lg:sticky lg:top-4 space-y-5">

            {/* DECISION SCORE — HERO */}
            <Card className={cn(
              "p-5 border-2",
              decision.d === "GO" && "border-emerald-500/40 bg-linear-to-br from-emerald-500/5 to-transparent",
              decision.d === "MAYBE" && "border-amber-500/40 bg-linear-to-br from-amber-500/5 to-transparent",
              decision.d === "STOP" && "border-red-500/40 bg-linear-to-br from-red-500/5 to-transparent"
            )}>
              <div className="flex items-start justify-between mb-3">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Net decision score</span>
                <Badge tone={decision.tone}><Sparkles className="h-3 w-3" />AI</Badge>
              </div>
              <div className="flex items-center gap-3">
                <span className={cn(
                  "h-14 w-14 rounded-xl inline-flex items-center justify-center text-white shadow-lg",
                  decision.d === "GO" && "bg-linear-to-br from-emerald-500 to-emerald-600",
                  decision.d === "MAYBE" && "bg-linear-to-br from-amber-500 to-amber-600",
                  decision.d === "STOP" && "bg-linear-to-br from-red-500 to-red-600"
                )}>
                  <decision.icon className="h-7 w-7" />
                </span>
                <div>
                  <p className={cn(
                    "text-3xl font-display font-medium tracking-tight",
                    decision.d === "GO" && "text-emerald-600",
                    decision.d === "MAYBE" && "text-amber-600",
                    decision.d === "STOP" && "text-red-600"
                  )}>{decision.d}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{decision.label}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-border">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Margin</p>
                  <p className="text-lg font-display font-medium tabular">{margin.toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Lift vs BAR</p>
                  <p className={cn("text-lg font-display font-medium tabular", liftVsTransient >= 0 ? "text-emerald-600" : "text-red-600")}>
                    {liftVsTransient >= 0 ? "+" : ""}{liftVsTransient.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Confidence</p>
                  <p className="text-lg font-display font-medium tabular">{confidence}%</p>
                </div>
              </div>
            </Card>

            {/* REVENUE BREAKDOWN */}
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-medium text-sm">Revenue breakdown</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground inline-flex items-center gap-2">
                    <BedDouble className="h-3.5 w-3.5" />Gross room revenue
                  </span>
                  <span className="tabular font-medium">{money(grossRoomRev)}</span>
                </div>
                {conc.discountPct > 0 && (
                  <div className="flex items-center justify-between text-red-600">
                    <span className="inline-flex items-center gap-2 pl-5">
                      <Percent className="h-3.5 w-3.5" />Group discount ({conc.discountPct}%)
                    </span>
                    <span className="tabular">−{money(discountAmt)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground inline-flex items-center gap-2">
                    <UtensilsCrossed className="h-3.5 w-3.5" />F&amp;B ({fbMeta.code})
                  </span>
                  <span className="tabular font-medium">{money(fbRev)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground inline-flex items-center gap-2">
                    <PartyPopper className="h-3.5 w-3.5" />Banquet ({bqMeta.name} × {bqEvents})
                  </span>
                  <span className="tabular font-medium">{money(banquetRev)}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="font-medium">Gross quote</span>
                  <span className="tabular font-display text-base font-medium">{money(grossQuote)}</span>
                </div>
                <div className="flex items-center justify-between text-red-600 pt-1">
                  <span className="inline-flex items-center gap-2">
                    <Gift className="h-3.5 w-3.5" />Concession cost
                  </span>
                  <span className="tabular">−{money(totalConcessionCost)}</span>
                </div>
                <div className="flex items-center justify-between text-red-600/80">
                  <span className="inline-flex items-center gap-2 text-xs">
                    <Hotel className="h-3.5 w-3.5" />Variable cost (HK + COGS)
                  </span>
                  <span className="tabular text-xs">−{money(totalVarCost)}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="font-medium">Net contribution</span>
                  <span className={cn("tabular font-display text-lg font-medium", netContribution >= 0 ? "text-emerald-600" : "text-red-600")}>
                    {money(netContribution)}
                  </span>
                </div>
              </div>
            </Card>

            {/* DISPLACED BUSINESS */}
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Target className="h-4 w-4 text-amber-600" />
                <h3 className="font-medium text-sm">Displaced business analysis</h3>
                <Badge tone="warning" className="ml-auto">{displacementPct.toFixed(0)}% disp.</Badge>
              </div>
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 mb-3">
                <p className="text-xs text-muted-foreground">If you took transient demand at projected BAR for these dates you would earn</p>
                <p className="text-xl font-display font-medium tabular text-amber-700 dark:text-amber-400 mt-1">{money(totalDisplacedRev)}</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  <span className="tabular">{totalDisplacedNights}</span> of <span className="tabular">{totalRoomNights}</span> room-nights would displace transient demand
                </p>
              </div>
              <div className="space-y-1.5">
                {displacementByType.map(d => (
                  <div key={d.type} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {d.name} &middot; <span className="tabular">{d.displacedNights}</span>/<span className="tabular">{d.groupNights}</span> RN
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <Badge tone={d.diff >= 0 ? "success" : "warning"}>
                        {d.diff >= 0 ? "+" : ""}{money(d.diff)} vs BAR
                      </Badge>
                      <span className="tabular font-medium w-20 text-right">{money(d.displacedRev)}</span>
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Group room rev (net of disc.)</span>
                <span className="tabular text-sm font-medium">{money(groupRoomOnly)}</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-muted-foreground">Net lift over transient</span>
                <Badge tone={liftVsTransient >= 0 ? "success" : "danger"}>
                  {liftVsTransient >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {money(Math.abs(groupRoomOnly - totalDisplacedRev))}
                </Badge>
              </div>
            </Card>

            {/* RECOMMENDED FLOOR */}
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Wand2 className="h-4 w-4 text-violet-600" />
                <h3 className="font-medium text-sm">Recommended minimum rate</h3>
              </div>
              <div className="space-y-3">
                <div className="rounded-lg bg-linear-to-br from-violet-500/10 to-fuchsia-500/5 border border-violet-500/30 p-3">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Floor rate / room / night (avg)</p>
                  <p className="text-2xl font-display font-medium tabular text-violet-700 dark:text-violet-400 mt-1">
                    {money(recommendedFloor)}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Break-even on displaced business + 60% of concession cost recovered
                  </p>
                </div>
                <div className="space-y-1.5 text-xs">
                  {Object.values(ROOM_TYPES).filter(rt => blocks.some(b => b.type === rt.code)).map(rt => {
                    const block = blocks.find(b => b.type === rt.code)!;
                    const floor = Math.ceil((rt.projectedBAR * 0.92) / 100) * 100; // 8% below BAR floor
                    const ok = block.rate >= floor;
                    return (
                      <div key={rt.code} className="flex items-center justify-between p-2 rounded-md bg-surface-sunken/40">
                        <span className="text-muted-foreground">{rt.name} floor</span>
                        <span className="inline-flex items-center gap-2">
                          <span className="tabular">{money(floor)}</span>
                          {ok
                            ? <Badge tone="success"><CheckCircle2 className="h-3 w-3" />OK</Badge>
                            : <Badge tone="danger"><AlertTriangle className="h-3 w-3" />Below</Badge>}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>

            {/* AI INSIGHT */}
            <Card className="p-4 bg-linear-to-br from-violet-500/5 via-transparent to-fuchsia-500/5 border-violet-500/20">
              <div className="flex items-start gap-3">
                <span className="h-8 w-8 rounded-md bg-violet-500/15 text-violet-600 inline-flex items-center justify-center shrink-0">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div className="text-xs space-y-1.5">
                  <p className="font-medium text-foreground">AI revenue manager says</p>
                  {decision.d === "GO" && (
                    <p className="text-muted-foreground leading-relaxed">
                      Strong yield over BAR with healthy margin. Banquet revenue alone covers concession cost <span className="tabular">{((banquetRev / totalConcessionCost) || 0).toFixed(1)}x</span>. Recommend approving — counter only if margin slips below 25%.
                    </p>
                  )}
                  {decision.d === "MAYBE" && (
                    <p className="text-muted-foreground leading-relaxed">
                      Marginal lift. Try countering with: (a) reduce discount to <span className="tabular">{Math.max(0, conc.discountPct - 3)}%</span>, (b) shift {fbPlan === "BQ" ? "Silver" : "MAP"} package, (c) drop {Math.min(conc.compRooms, 2)} comp rooms. Each step adds ~₹{((grossRoomRev * 0.03 / 1000) | 0)}k to margin.
                    </p>
                  )}
                  {decision.d === "STOP" && (
                    <p className="text-muted-foreground leading-relaxed">
                      Group displaces higher-yielding transient demand. Block dates fall in peak window. Recommend: decline OR push to off-peak ({arrival > "2026-09-01" && arrival < "2026-12-15" ? "Jan-Feb 2027" : "current is OK"}) with 15% rate uplift.
                    </p>
                  )}
                </div>
              </div>
            </Card>

            {/* ACTIONS */}
            <Card className="p-4">
              <div className="space-y-2">
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => showToast(`Quote #GQ-2026-1147 approved · ${money(grossQuote)} sent to ${email}`)}
                >
                  <Send className="h-3.5 w-3.5" />Approve &amp; send quote
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => showToast(`Counter-offer drafted · floor ${money(recommendedFloor)}/rm · concessions trimmed`)}
                >
                  <RefreshCw className="h-3.5 w-3.5" />Counter-offer
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-red-600 hover:text-red-700"
                  onClick={() => showToast("Lead politely declined · reason: displaces higher-margin business")}
                >
                  <XCircle className="h-3.5 w-3.5" />Decline lead
                </Button>
              </div>
              <div className="mt-3 pt-3 border-t border-border flex items-center gap-2 text-[11px] text-muted-foreground">
                <Info className="h-3 w-3" />
                <span>All actions logged to audit trail &middot; auto-emails sales team</span>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* ====================  COMPARISON FOOTER ==================== */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-border flex items-center gap-2">
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-medium text-sm">Per room-type yield comparison</h3>
          <Badge tone="neutral" className="ml-auto">live</Badge>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-surface-sunken/40">
            <tr className="text-[10px] uppercase tracking-wide text-muted-foreground">
              <th className="text-left px-4 py-2 font-medium">Room type</th>
              <th className="text-right px-4 py-2 font-medium">Rack</th>
              <th className="text-right px-4 py-2 font-medium">Proj. BAR</th>
              <th className="text-right px-4 py-2 font-medium">Group rate</th>
              <th className="text-right px-4 py-2 font-medium">Δ vs BAR</th>
              <th className="text-right px-4 py-2 font-medium">Group RN</th>
              <th className="text-right px-4 py-2 font-medium">Displaced RN</th>
              <th className="text-right px-4 py-2 font-medium">Displ. rev</th>
              <th className="text-right px-4 py-2 font-medium">Group rev</th>
              <th className="text-right px-4 py-2 font-medium">Net</th>
            </tr>
          </thead>
          <tbody>
            {blocks.map(b => {
              const meta = ROOM_TYPES[b.type];
              const d = displacementByType.find(x => x.type === b.type)!;
              const groupRev = b.qty * b.rate * nights * (1 - conc.discountPct / 100);
              const net = groupRev - d.displacedRev;
              const diffPct = ((b.rate - meta.projectedBAR) / meta.projectedBAR) * 100;
              return (
                <tr key={b.id} className="border-t border-border hover:bg-surface-sunken/30">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="h-7 w-7 rounded-md bg-blue-500/10 text-blue-600 inline-flex items-center justify-center">
                        <BedDouble className="h-3.5 w-3.5" />
                      </span>
                      <span className="font-medium">{meta.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular text-muted-foreground">{money(meta.rackRate)}</td>
                  <td className="px-4 py-2.5 text-right tabular">{money(meta.projectedBAR)}</td>
                  <td className="px-4 py-2.5 text-right tabular font-medium">{money(b.rate)}</td>
                  <td className="px-4 py-2.5 text-right">
                    <Badge tone={diffPct >= 0 ? "success" : "warning"}>
                      {diffPct >= 0 ? "+" : ""}{diffPct.toFixed(1)}%
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular">{d.groupNights}</td>
                  <td className="px-4 py-2.5 text-right tabular">{d.displacedNights}</td>
                  <td className="px-4 py-2.5 text-right tabular text-muted-foreground">{money(d.displacedRev)}</td>
                  <td className="px-4 py-2.5 text-right tabular">{money(groupRev)}</td>
                  <td className={cn("px-4 py-2.5 text-right tabular font-medium", net >= 0 ? "text-emerald-600" : "text-red-600")}>
                    {net >= 0 ? "+" : ""}{money(net)}
                  </td>
                </tr>
              );
            })}
            <tr className="border-t border-border bg-surface-sunken/30 font-medium">
              <td className="px-4 py-2.5">Total</td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td className="px-4 py-2.5 text-right tabular">{totalRoomNights}</td>
              <td className="px-4 py-2.5 text-right tabular">{totalDisplacedNights}</td>
              <td className="px-4 py-2.5 text-right tabular">{money(totalDisplacedRev)}</td>
              <td className="px-4 py-2.5 text-right tabular">{money(groupRoomOnly)}</td>
              <td className={cn("px-4 py-2.5 text-right tabular", groupRoomOnly - totalDisplacedRev >= 0 ? "text-emerald-600" : "text-red-600")}>
                {groupRoomOnly - totalDisplacedRev >= 0 ? "+" : ""}{money(groupRoomOnly - totalDisplacedRev)}
              </td>
            </tr>
          </tbody>
        </table>
      </Card>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-foreground text-background rounded-lg px-4 py-3 text-sm shadow-2xl">
          {toast}
        </div>
      )}
    </div>
  );
}
