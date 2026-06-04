"use client";
import * as React from "react";
import {
  Wine, TrendingUp, TrendingDown, Package, AlertTriangle, FileText,
  ClipboardList, Truck, GlassWater, Plus, Search, Calendar,
  Beer, Martini, Coffee, Sparkles, ArrowUpRight, ArrowDownRight,
  CheckCircle2, X, Save, RefreshCw, Download, Eye, Edit3,
  ShoppingCart, Boxes, Percent, Target,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn, money } from "@/lib/utils";

type Category = "Whisky" | "Vodka" | "Gin" | "Rum" | "Wine" | "Beer" | "Liqueur" | "Soft";
type TabKey = "inventory" | "pourcost" | "variance" | "po" | "menu";

type StockItem = {
  id: string;
  brand: string;
  category: Category;
  size: string;        // 750ml / 1L / 650ml etc.
  opened: number;      // partially opened bottles (decimal allowed)
  sealed: number;      // sealed bottles in stock
  par: number;         // par level
  reorderQty: number;
  unitCost: number;    // per bottle
};

const CATEGORY_TONE: Record<Category, "brand" | "info" | "accent" | "warning" | "danger" | "success" | "neutral"> = {
  Whisky: "warning",
  Vodka: "info",
  Gin: "accent",
  Rum: "brand",
  Wine: "danger",
  Beer: "warning",
  Liqueur: "accent",
  Soft: "neutral",
};

const CATEGORY_ICON: Record<Category, React.ComponentType<{ className?: string }>> = {
  Whisky: Wine,
  Vodka: GlassWater,
  Gin: Martini,
  Rum: Wine,
  Wine: Wine,
  Beer: Beer,
  Liqueur: Sparkles,
  Soft: Coffee,
};

// 32 realistic premium SKUs — Indian FL3 bar context
const INVENTORY: StockItem[] = [
  // Whisky
  { id: "s1",  brand: "Glenfiddich 12 YO",            category: "Whisky", size: "750ml", opened: 1, sealed: 4,  par: 6,  reorderQty: 6,  unitCost: 6800 },
  { id: "s2",  brand: "Johnnie Walker Black Label",   category: "Whisky", size: "750ml", opened: 1, sealed: 8,  par: 8,  reorderQty: 12, unitCost: 4200 },
  { id: "s3",  brand: "Chivas Regal 18",              category: "Whisky", size: "750ml", opened: 0, sealed: 3,  par: 4,  reorderQty: 4,  unitCost: 9500 },
  { id: "s4",  brand: "Macallan 12 Double Cask",      category: "Whisky", size: "750ml", opened: 1, sealed: 2,  par: 4,  reorderQty: 6,  unitCost: 12500 },
  { id: "s5",  brand: "Amrut Fusion Single Malt",     category: "Whisky", size: "750ml", opened: 1, sealed: 5,  par: 6,  reorderQty: 6,  unitCost: 3800 },
  { id: "s6",  brand: "Paul John Brilliance",         category: "Whisky", size: "750ml", opened: 0, sealed: 4,  par: 4,  reorderQty: 6,  unitCost: 3200 },
  { id: "s7",  brand: "Jameson Irish Whiskey",        category: "Whisky", size: "750ml", opened: 1, sealed: 6,  par: 6,  reorderQty: 6,  unitCost: 3400 },
  // Vodka
  { id: "s8",  brand: "Grey Goose Original",          category: "Vodka",  size: "750ml", opened: 1, sealed: 5,  par: 6,  reorderQty: 6,  unitCost: 5600 },
  { id: "s9",  brand: "Absolut Blue",                 category: "Vodka",  size: "750ml", opened: 1, sealed: 9,  par: 8,  reorderQty: 12, unitCost: 2200 },
  { id: "s10", brand: "Belvedere Pure",               category: "Vodka",  size: "750ml", opened: 0, sealed: 3,  par: 4,  reorderQty: 6,  unitCost: 6400 },
  { id: "s11", brand: "Smirnoff Red",                 category: "Vodka",  size: "750ml", opened: 2, sealed: 11, par: 10, reorderQty: 12, unitCost: 1450 },
  // Gin
  { id: "s12", brand: "Bombay Sapphire",              category: "Gin",    size: "750ml", opened: 1, sealed: 7,  par: 8,  reorderQty: 8,  unitCost: 2800 },
  { id: "s13", brand: "Tanqueray London Dry",         category: "Gin",    size: "750ml", opened: 0, sealed: 4,  par: 6,  reorderQty: 6,  unitCost: 3100 },
  { id: "s14", brand: "Hendrick's",                   category: "Gin",    size: "750ml", opened: 1, sealed: 3,  par: 4,  reorderQty: 6,  unitCost: 4900 },
  { id: "s15", brand: "Greater Than Indian Dry",      category: "Gin",    size: "750ml", opened: 1, sealed: 6,  par: 6,  reorderQty: 6,  unitCost: 1850 },
  { id: "s16", brand: "Stranger & Sons",              category: "Gin",    size: "750ml", opened: 1, sealed: 2,  par: 4,  reorderQty: 6,  unitCost: 2650 },
  // Rum
  { id: "s17", brand: "Bacardi White",                category: "Rum",    size: "750ml", opened: 1, sealed: 8,  par: 8,  reorderQty: 12, unitCost: 1280 },
  { id: "s18", brand: "Captain Morgan Spiced",        category: "Rum",    size: "750ml", opened: 0, sealed: 5,  par: 6,  reorderQty: 6,  unitCost: 2100 },
  { id: "s19", brand: "Old Monk 7 YO",                category: "Rum",    size: "750ml", opened: 2, sealed: 10, par: 8,  reorderQty: 12, unitCost: 380 },
  // Wine
  { id: "s20", brand: "Sula Rasa Shiraz",             category: "Wine",   size: "750ml", opened: 0, sealed: 14, par: 12, reorderQty: 12, unitCost: 1650 },
  { id: "s21", brand: "Grover La Reserve",            category: "Wine",   size: "750ml", opened: 1, sealed: 8,  par: 8,  reorderQty: 12, unitCost: 1950 },
  { id: "s22", brand: "Fratelli Sangiovese Bianco",   category: "Wine",   size: "750ml", opened: 0, sealed: 6,  par: 8,  reorderQty: 12, unitCost: 1480 },
  { id: "s23", brand: "Moët & Chandon Brut Imperial", category: "Wine",   size: "750ml", opened: 0, sealed: 2,  par: 4,  reorderQty: 6,  unitCost: 8200 },
  // Beer
  { id: "s24", brand: "Heineken",                     category: "Beer",   size: "650ml", opened: 0, sealed: 48, par: 60, reorderQty: 96, unitCost: 240 },
  { id: "s25", brand: "Corona Extra",                 category: "Beer",   size: "355ml", opened: 0, sealed: 36, par: 48, reorderQty: 72, unitCost: 285 },
  { id: "s26", brand: "Bira 91 White",                category: "Beer",   size: "330ml", opened: 0, sealed: 72, par: 60, reorderQty: 96, unitCost: 165 },
  { id: "s27", brand: "Kingfisher Premium",           category: "Beer",   size: "650ml", opened: 0, sealed: 84, par: 72, reorderQty: 120,unitCost: 175 },
  // Liqueur
  { id: "s28", brand: "Baileys Irish Cream",          category: "Liqueur",size: "750ml", opened: 1, sealed: 3,  par: 4,  reorderQty: 6,  unitCost: 3200 },
  { id: "s29", brand: "Cointreau",                    category: "Liqueur",size: "700ml", opened: 1, sealed: 2,  par: 4,  reorderQty: 4,  unitCost: 3850 },
  { id: "s30", brand: "Kahlua Coffee Liqueur",        category: "Liqueur",size: "700ml", opened: 1, sealed: 3,  par: 4,  reorderQty: 6,  unitCost: 2950 },
  // Soft / Mixers
  { id: "s31", brand: "Schweppes Tonic Water",        category: "Soft",   size: "200ml", opened: 0, sealed: 96, par: 120,reorderQty: 144,unitCost: 60 },
  { id: "s32", brand: "Red Bull Energy",              category: "Soft",   size: "250ml", opened: 0, sealed: 64, par: 72, reorderQty: 96, unitCost: 110 },
];

// Pour cost by category (sold value vs theoretical & actual)
type PourRow = {
  category: Category;
  soldValue: number;
  theoreticalCost: number;
  actualCost: number;
};

const POUR_BY_CATEGORY: PourRow[] = [
  { category: "Whisky",  soldValue: 485000, theoreticalCost: 92000, actualCost: 108500 }, // variance flag
  { category: "Vodka",   soldValue: 268000, theoreticalCost: 51000, actualCost: 53800 },
  { category: "Gin",     soldValue: 312000, theoreticalCost: 58000, actualCost: 60200 },
  { category: "Rum",     soldValue: 184000, theoreticalCost: 32000, actualCost: 33400 },
  { category: "Wine",    soldValue: 226000, theoreticalCost: 47000, actualCost: 47600 },
  { category: "Beer",    soldValue: 198000, theoreticalCost: 41200, actualCost: 41800 },
  { category: "Liqueur", soldValue: 86000,  theoreticalCost: 16400, actualCost: 17100 },
  { category: "Soft",    soldValue: 62000,  theoreticalCost: 9800,  actualCost: 9900 },
];

// SKU-level variance (top variances)
type VarRow = {
  sku: string;
  category: Category;
  theoreticalMl: number;
  actualMl: number;
  unitCost: number;     // per bottle (750ml)
  flag?: "over" | "watch" | "ok";
  note?: string;
};

const VARIANCE_ROWS: VarRow[] = [
  { sku: "Glenfiddich 12 YO",         category: "Whisky", theoreticalMl: 2250, actualMl: 3120, unitCost: 6800, flag: "over",  note: "Over-pour suspected — possible theft / 60ml pours instead of 30ml" },
  { sku: "Macallan 12 Double Cask",   category: "Whisky", theoreticalMl: 900,  actualMl: 1180, unitCost: 12500, flag: "watch", note: "Bottle weight short by 280ml — investigate" },
  { sku: "Grey Goose Original",       category: "Vodka",  theoreticalMl: 1800, actualMl: 1950, unitCost: 5600,  flag: "watch", note: "Slight over-pour on Cosmopolitans" },
  { sku: "Hendrick's",                category: "Gin",    theoreticalMl: 1500, actualMl: 1620, unitCost: 4900,  flag: "watch", note: "G&T mixology variance" },
  { sku: "Bombay Sapphire",           category: "Gin",    theoreticalMl: 2400, actualMl: 2510, unitCost: 2800,  flag: "ok",    note: "Within tolerance" },
  { sku: "Absolut Blue",              category: "Vodka",  theoreticalMl: 3300, actualMl: 3370, unitCost: 2200,  flag: "ok",    note: "Within tolerance" },
  { sku: "Bacardi White",             category: "Rum",    theoreticalMl: 2700, actualMl: 2790, unitCost: 1280,  flag: "ok",    note: "Within tolerance" },
  { sku: "Old Monk 7 YO",             category: "Rum",    theoreticalMl: 3600, actualMl: 3680, unitCost: 380,   flag: "ok",    note: "Within tolerance" },
];

// Purchase Orders
type POStatus = "Pending" | "Confirmed" | "In Transit" | "Delivered";

type PORow = {
  id: string;
  vendor: string;
  items: string;
  itemCount: number;
  value: number;
  raised: string;
  eta: string;
  status: POStatus;
};

const PURCHASE_ORDERS: PORow[] = [
  { id: "PO-BAR-2031", vendor: "United Spirits Distribution",  items: "Whisky · Vodka · Gin assortment",  itemCount: 14, value: 184500, raised: "28 May", eta: "04 Jun",  status: "In Transit" },
  { id: "PO-BAR-2032", vendor: "Pernod Ricard India",          items: "Chivas 18 · Absolut · Jameson",     itemCount: 8,  value: 96200,  raised: "30 May", eta: "06 Jun",  status: "Confirmed" },
  { id: "PO-BAR-2033", vendor: "Sula Vineyards (Direct)",      items: "Rasa Shiraz · La Reserve x12",      itemCount: 24, value: 43500,  raised: "01 Jun", eta: "07 Jun",  status: "Pending" },
  { id: "PO-BAR-2034", vendor: "Diageo Premium",               items: "Johnnie Walker Black x12 cases",    itemCount: 12, value: 50400,  raised: "29 May", eta: "03 Jun",  status: "Delivered" },
  { id: "PO-BAR-2035", vendor: "AB InBev India (Beer)",        items: "Corona · Bira · Heineken cases",    itemCount: 30, value: 68200,  raised: "31 May", eta: "05 Jun",  status: "In Transit" },
  { id: "PO-BAR-2036", vendor: "William Grant & Sons",         items: "Glenfiddich 12 · Hendrick's",       itemCount: 10, value: 112800, raised: "01 Jun", eta: "08 Jun",  status: "Confirmed" },
];

const PO_TONE: Record<POStatus, "warning" | "info" | "accent" | "success"> = {
  Pending: "warning",
  Confirmed: "info",
  "In Transit": "accent",
  Delivered: "success",
};

// Bar menu — cocktails with recipes
type Ingredient = { item: string; qtyMl: number; costPerMl: number };

type Cocktail = {
  id: string;
  name: string;
  category: "Classic" | "Signature" | "Mocktail" | "Highball";
  menuPrice: number;
  glassCost: number;     // garnish + ice + glass — fixed overhead
  recipe: Ingredient[];
};

const COCKTAILS: Cocktail[] = [
  {
    id: "c1", name: "Old Fashioned",       category: "Classic",   menuPrice: 750, glassCost: 25,
    recipe: [
      { item: "Bourbon (Jameson sub)", qtyMl: 60, costPerMl: 3400 / 750 },
      { item: "Sugar syrup",            qtyMl: 10, costPerMl: 0.4 },
      { item: "Angostura bitters",      qtyMl: 2,  costPerMl: 8 },
    ],
  },
  {
    id: "c2", name: "Negroni",             category: "Classic",   menuPrice: 780, glassCost: 25,
    recipe: [
      { item: "Bombay Sapphire",        qtyMl: 30, costPerMl: 2800 / 750 },
      { item: "Campari",                qtyMl: 30, costPerMl: 4.2 },
      { item: "Sweet Vermouth",         qtyMl: 30, costPerMl: 1.8 },
    ],
  },
  {
    id: "c3", name: "Pearl Marina Martini",category: "Signature", menuPrice: 950, glassCost: 35,
    recipe: [
      { item: "Grey Goose",             qtyMl: 60, costPerMl: 5600 / 750 },
      { item: "Dry Vermouth",           qtyMl: 10, costPerMl: 1.6 },
      { item: "Olive brine",            qtyMl: 5,  costPerMl: 0.5 },
    ],
  },
  {
    id: "c4", name: "Bombay Sling",        category: "Signature", menuPrice: 825, glassCost: 30,
    recipe: [
      { item: "Stranger & Sons",        qtyMl: 45, costPerMl: 2650 / 750 },
      { item: "Cherry Heering",         qtyMl: 15, costPerMl: 3.8 },
      { item: "Pineapple juice",        qtyMl: 60, costPerMl: 0.18 },
      { item: "Lime juice",             qtyMl: 15, costPerMl: 0.12 },
    ],
  },
  {
    id: "c5", name: "Cosmopolitan",        category: "Classic",   menuPrice: 720, glassCost: 25,
    recipe: [
      { item: "Absolut Blue",           qtyMl: 45, costPerMl: 2200 / 750 },
      { item: "Cointreau",              qtyMl: 15, costPerMl: 3850 / 700 },
      { item: "Cranberry juice",        qtyMl: 30, costPerMl: 0.22 },
      { item: "Lime juice",             qtyMl: 10, costPerMl: 0.12 },
    ],
  },
  {
    id: "c6", name: "Whisky Sour",         category: "Classic",   menuPrice: 690, glassCost: 25,
    recipe: [
      { item: "Jameson",                qtyMl: 60, costPerMl: 3400 / 750 },
      { item: "Lemon juice",            qtyMl: 25, costPerMl: 0.14 },
      { item: "Sugar syrup",            qtyMl: 15, costPerMl: 0.4 },
      { item: "Egg white",              qtyMl: 15, costPerMl: 0.3 },
    ],
  },
  {
    id: "c7", name: "Glenfiddich Neat",    category: "Highball",  menuPrice: 1100, glassCost: 20,
    recipe: [
      { item: "Glenfiddich 12",         qtyMl: 60, costPerMl: 6800 / 750 },
    ],
  },
  {
    id: "c8", name: "Mango Lassi Mocktail",category: "Mocktail",  menuPrice: 320, glassCost: 20,
    recipe: [
      { item: "Mango pulp",             qtyMl: 80,  costPerMl: 0.25 },
      { item: "Yogurt",                 qtyMl: 120, costPerMl: 0.18 },
      { item: "Cardamom syrup",         qtyMl: 10,  costPerMl: 0.6 },
    ],
  },
  {
    id: "c9", name: "Virgin Marina Breeze",category: "Mocktail",  menuPrice: 280, glassCost: 18,
    recipe: [
      { item: "Cranberry juice",        qtyMl: 90, costPerMl: 0.22 },
      { item: "Pineapple juice",        qtyMl: 90, costPerMl: 0.18 },
      { item: "Lime juice",             qtyMl: 10, costPerMl: 0.12 },
    ],
  },
];

// ----- helpers -----
function bottleEquivalent(it: StockItem) {
  return it.opened + it.sealed;
}
function itemValue(it: StockItem) {
  return bottleEquivalent(it) * it.unitCost;
}
function isLowStock(it: StockItem) {
  return bottleEquivalent(it) < it.par;
}
function cocktailCost(c: Cocktail) {
  const liquid = c.recipe.reduce((s, r) => s + r.qtyMl * r.costPerMl, 0);
  return liquid + c.glassCost;
}

// ----- main page -----
export default function BarInventoryPage() {
  const [toast, setToast] = React.useState<string | null>(null);
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };

  const [tab, setTab] = React.useState<TabKey>("inventory");
  const [stockTakeOpen, setStockTakeOpen] = React.useState(false);
  const [poDrawerOpen, setPoDrawerOpen] = React.useState(false);
  const [activePO, setActivePO] = React.useState<PORow | null>(null);
  const [cocktailDrawer, setCocktailDrawer] = React.useState<Cocktail | null>(null);

  // KPI calcs
  const stockValue = INVENTORY.reduce((s, it) => s + itemValue(it), 0);
  const totalSold  = POUR_BY_CATEGORY.reduce((s, r) => s + r.soldValue, 0);
  const totalCost  = POUR_BY_CATEGORY.reduce((s, r) => s + r.actualCost, 0);
  const pourCostPct = (totalCost / totalSold) * 100;

  const topMover  = "Johnnie Walker Black";
  const slowMover = "Belvedere Pure";

  // inventory filters
  const [catFilter, setCatFilter] = React.useState<Category | "all">("all");
  const [search, setSearch] = React.useState("");
  const filteredInventory = INVENTORY.filter((it) => {
    const catOk = catFilter === "all" || it.category === catFilter;
    const sOk = !search || it.brand.toLowerCase().includes(search.toLowerCase());
    return catOk && sOk;
  });
  const lowStockCount = INVENTORY.filter(isLowStock).length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      {/* HEADER */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-500 to-rose-600 grid place-items-center text-white shadow-md">
            <Wine className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Bar Inventory & Pour Cost</h1>
            <p className="text-sm text-muted-foreground">
              The Pearl Marina · Sky Lounge Bar · FL3 license · live stock & cocktail margins
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => showToast("Exporting bar inventory PDF...")}>
            <Download className="h-4 w-4 mr-1.5" />Export
          </Button>
          <Button size="sm" variant="outline" onClick={() => showToast("Weekly bar report generated and emailed to F&B Manager.")}>
            <FileText className="h-4 w-4 mr-1.5" />Generate weekly bar report
          </Button>
          <Button size="sm" onClick={() => setStockTakeOpen(true)}>
            <ClipboardList className="h-4 w-4 mr-1.5" />Stock take
          </Button>
        </div>
      </div>

      {/* 4-KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI
          icon={<Boxes className="h-4 w-4" />}
          tint="from-amber-500/15 to-amber-500/5"
          label="Stock value"
          value={money(stockValue)}
          sub={`${INVENTORY.length} SKUs · ${lowStockCount} below par`}
          subTone={lowStockCount > 0 ? "warning" : "success"}
        />
        <KPI
          icon={<Percent className="h-4 w-4" />}
          tint="from-emerald-500/15 to-emerald-500/5"
          label="Pour cost %"
          value={`${pourCostPct.toFixed(1)}%`}
          sub={
            pourCostPct >= 18 && pourCostPct <= 22
              ? "Within target band 18-22%"
              : pourCostPct > 22 ? "Above target band" : "Below target band"
          }
          subTone={pourCostPct >= 18 && pourCostPct <= 22 ? "success" : "warning"}
        />
        <KPI
          icon={<TrendingUp className="h-4 w-4" />}
          tint="from-sky-500/15 to-sky-500/5"
          label="Top mover (7d)"
          value={topMover}
          sub="48 pours · ₹2,01,600 sales"
          subTone="success"
        />
        <KPI
          icon={<TrendingDown className="h-4 w-4" />}
          tint="from-rose-500/15 to-rose-500/5"
          label="Slowest mover (7d)"
          value={slowMover}
          sub="2 pours · review delisting"
          subTone="danger"
        />
      </div>

      {/* Over-variance alert */}
      <Card className="p-4 border-l-4 border-l-danger bg-danger-soft/40">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg bg-danger text-white grid place-items-center shrink-0">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold">Over-variance alert · Glenfiddich 12 YO</span>
              <Badge tone="danger">+38.7% over-pour</Badge>
              <Badge tone="neutral">Whisky</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Theoretical usage 2,250ml vs actual 3,120ml in last 7 days. Estimated revenue loss
              <span className="tabular font-semibold text-foreground"> {money(7888)}</span>. Possible 60ml pours instead of 30ml, or unaccounted complimentary serves. Recommend audit of bartender Karan M.'s shifts (28-31 May).
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" variant="ghost" onClick={() => { setTab("variance"); showToast("Opened variance breakdown."); }}>
              <Eye className="h-4 w-4 mr-1.5" />Investigate
            </Button>
            <Button size="sm" variant="outline" onClick={() => showToast("Alert acknowledged. Logged to audit trail.")}>
              <CheckCircle2 className="h-4 w-4 mr-1.5" />Acknowledge
            </Button>
          </div>
        </div>
      </Card>

      {/* sub-tabs */}
      <div className="border-b border-border">
        <div className="flex items-center gap-1 overflow-x-auto">
          {[
            { k: "inventory", label: "Inventory", icon: Package, badge: lowStockCount > 0 ? String(lowStockCount) : null, badgeTone: "warning" as const },
            { k: "pourcost",  label: "Pour cost", icon: Percent, badge: null, badgeTone: "neutral" as const },
            { k: "variance",  label: "Variance",  icon: AlertTriangle, badge: "3", badgeTone: "danger" as const },
            { k: "po",        label: "Purchase orders", icon: Truck, badge: String(PURCHASE_ORDERS.filter(p => p.status !== "Delivered").length), badgeTone: "info" as const },
            { k: "menu",      label: "Bar menu",  icon: Martini, badge: String(COCKTAILS.length), badgeTone: "accent" as const },
          ].map((t) => {
            const Ico = t.icon;
            const active = tab === t.k;
            return (
              <button
                key={t.k}
                onClick={() => setTab(t.k as TabKey)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                  active
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <Ico className="h-4 w-4" />
                {t.label}
                {t.badge && <Badge tone={t.badgeTone}>{t.badge}</Badge>}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB CONTENT */}
      {tab === "inventory" && (
        <InventoryTab
          rows={filteredInventory}
          catFilter={catFilter}
          setCatFilter={setCatFilter}
          search={search}
          setSearch={setSearch}
          showToast={showToast}
        />
      )}

      {tab === "pourcost" && <PourCostTab showToast={showToast} />}

      {tab === "variance" && <VarianceTab showToast={showToast} />}

      {tab === "po" && (
        <POTab
          showToast={showToast}
          openPO={(po) => { setActivePO(po); setPoDrawerOpen(true); }}
        />
      )}

      {tab === "menu" && (
        <BarMenuTab
          showToast={showToast}
          openRecipe={(c) => setCocktailDrawer(c)}
        />
      )}

      {/* Stock take MODAL */}
      {stockTakeOpen && (
        <StockTakeModal
          onClose={() => setStockTakeOpen(false)}
          onSubmit={() => { setStockTakeOpen(false); showToast("Stock take recorded · variance report queued."); }}
        />
      )}

      {/* PO DRAWER */}
      {poDrawerOpen && activePO && (
        <PODrawer
          po={activePO}
          onClose={() => { setPoDrawerOpen(false); setActivePO(null); }}
          showToast={showToast}
        />
      )}

      {/* Cocktail recipe DRAWER */}
      {cocktailDrawer && (
        <CocktailDrawer
          cocktail={cocktailDrawer}
          onClose={() => setCocktailDrawer(null)}
          showToast={showToast}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-foreground text-background rounded-lg px-4 py-3 text-sm shadow-2xl">
          {toast}
        </div>
      )}
    </div>
  );
}

// ===================== KPI =====================
function KPI({
  icon, label, value, sub, subTone, tint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  subTone: "success" | "warning" | "danger" | "neutral";
  tint: string;
}) {
  const subColor =
    subTone === "success" ? "text-success" :
    subTone === "warning" ? "text-warning" :
    subTone === "danger"  ? "text-danger"  : "text-muted-foreground";
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2">
        <div className={cn("h-7 w-7 rounded-md grid place-items-center bg-gradient-to-br", tint)}>
          {icon}
        </div>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</span>
      </div>
      <div className="mt-3 text-2xl font-bold tabular truncate" title={value}>{value}</div>
      <div className={cn("text-xs mt-1", subColor)}>{sub}</div>
    </Card>
  );
}

// ===================== INVENTORY TAB =====================
function InventoryTab({
  rows, catFilter, setCatFilter, search, setSearch, showToast,
}: {
  rows: StockItem[];
  catFilter: Category | "all";
  setCatFilter: (c: Category | "all") => void;
  search: string;
  setSearch: (s: string) => void;
  showToast: (m: string) => void;
}) {
  const cats: (Category | "all")[] = ["all", "Whisky", "Vodka", "Gin", "Rum", "Wine", "Beer", "Liqueur", "Soft"];
  return (
    <div className="space-y-4">
      {/* filter row */}
      <Card className="p-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search brand (e.g. Glenfiddich, Bira)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            {cats.map((c) => (
              <button
                key={c}
                onClick={() => setCatFilter(c)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium border transition-colors",
                  catFilter === c
                    ? "bg-foreground text-background border-foreground"
                    : "bg-surface text-muted-foreground border-border hover:text-foreground"
                )}
              >
                {c === "all" ? "All" : c}
              </button>
            ))}
          </div>
          <Button size="sm" variant="outline" onClick={() => showToast("Add SKU drawer (mock)")}>
            <Plus className="h-4 w-4 mr-1.5" />Add SKU
          </Button>
        </div>
      </Card>

      {/* table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-sunken/40">
              <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-medium">Brand</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Size</th>
                <th className="px-4 py-3 font-medium text-right">Opened</th>
                <th className="px-4 py-3 font-medium text-right">Sealed</th>
                <th className="px-4 py-3 font-medium text-right">Par</th>
                <th className="px-4 py-3 font-medium text-right">Reorder qty</th>
                <th className="px-4 py-3 font-medium text-right">Unit cost</th>
                <th className="px-4 py-3 font-medium text-right">Total value</th>
                <th className="px-4 py-3 font-medium text-right">Status</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((it) => {
                const low = isLowStock(it);
                const Ico = CATEGORY_ICON[it.category];
                return (
                  <tr key={it.id} className="border-t border-border hover:bg-surface-sunken/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-md bg-surface-sunken grid place-items-center text-muted-foreground">
                          <Ico className="h-3.5 w-3.5" />
                        </div>
                        <span className="font-medium">{it.brand}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={CATEGORY_TONE[it.category]}>{it.category}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground tabular">{it.size}</td>
                    <td className="px-4 py-3 text-right tabular">{it.opened.toFixed(1)}</td>
                    <td className="px-4 py-3 text-right tabular">{it.sealed}</td>
                    <td className="px-4 py-3 text-right tabular text-muted-foreground">{it.par}</td>
                    <td className="px-4 py-3 text-right tabular text-muted-foreground">{it.reorderQty}</td>
                    <td className="px-4 py-3 text-right tabular">{money(it.unitCost)}</td>
                    <td className="px-4 py-3 text-right tabular font-semibold">{money(Math.round(itemValue(it)))}</td>
                    <td className="px-4 py-3 text-right">
                      {low
                        ? <Badge tone="warning">Low stock</Badge>
                        : <Badge tone="success">Stocked</Badge>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => showToast(`Edit ${it.brand}`)}>
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>
                        {low && (
                          <Button size="sm" variant="outline" onClick={() => showToast(`PO raised for ${it.reorderQty} x ${it.brand}`)}>
                            <ShoppingCart className="h-3.5 w-3.5 mr-1" />PO
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-muted-foreground text-sm">
                    No SKUs match filters.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border bg-surface-sunken/30">
                <td className="px-4 py-3 font-semibold" colSpan={8}>
                  Total · {rows.length} SKU{rows.length === 1 ? "" : "s"}
                </td>
                <td className="px-4 py-3 text-right tabular font-bold">
                  {money(Math.round(rows.reduce((s, it) => s + itemValue(it), 0)))}
                </td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ===================== POUR COST TAB =====================
function PourCostTab({ showToast }: { showToast: (m: string) => void }) {
  const target = { low: 18, high: 22 };

  const totals = POUR_BY_CATEGORY.reduce(
    (acc, r) => ({
      sold: acc.sold + r.soldValue,
      theo: acc.theo + r.theoreticalCost,
      actual: acc.actual + r.actualCost,
    }),
    { sold: 0, theo: 0, actual: 0 }
  );

  return (
    <div className="space-y-4">
      {/* target banner */}
      <Card className="p-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-info-soft text-info grid place-items-center">
              <Target className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold">Pour cost target band</div>
              <div className="text-xs text-muted-foreground">Industry standard for premium hotel bars: 18% – 22%</div>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div>
              <div className="text-muted-foreground">Sold (7d)</div>
              <div className="font-semibold tabular">{money(totals.sold)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Theoretical cost</div>
              <div className="font-semibold tabular">{money(totals.theo)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Actual cost</div>
              <div className="font-semibold tabular text-warning">{money(totals.actual)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Overall pour %</div>
              <div className="font-semibold tabular">{((totals.actual / totals.sold) * 100).toFixed(1)}%</div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-sunken/40">
            <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium text-right">Sold value</th>
              <th className="px-4 py-3 font-medium text-right">Theoretical cost</th>
              <th className="px-4 py-3 font-medium text-right">Actual cost</th>
              <th className="px-4 py-3 font-medium text-right">Theoretical %</th>
              <th className="px-4 py-3 font-medium text-right">Actual %</th>
              <th className="px-4 py-3 font-medium text-right">Variance</th>
              <th className="px-4 py-3 font-medium">vs target</th>
            </tr>
          </thead>
          <tbody>
            {POUR_BY_CATEGORY.map((r) => {
              const theoPct = (r.theoreticalCost / r.soldValue) * 100;
              const actPct = (r.actualCost / r.soldValue) * 100;
              const variancePct = actPct - theoPct;
              const overTarget = actPct > target.high;
              const Ico = CATEGORY_ICON[r.category];
              return (
                <tr key={r.category} className="border-t border-border hover:bg-surface-sunken/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded-md bg-surface-sunken grid place-items-center text-muted-foreground">
                        <Ico className="h-3.5 w-3.5" />
                      </div>
                      <span className="font-medium">{r.category}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right tabular">{money(r.soldValue)}</td>
                  <td className="px-4 py-3 text-right tabular text-muted-foreground">{money(r.theoreticalCost)}</td>
                  <td className="px-4 py-3 text-right tabular">{money(r.actualCost)}</td>
                  <td className="px-4 py-3 text-right tabular text-muted-foreground">{theoPct.toFixed(1)}%</td>
                  <td className={cn("px-4 py-3 text-right tabular font-semibold", overTarget && "text-danger")}>
                    {actPct.toFixed(1)}%
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={cn(
                      "inline-flex items-center gap-1 tabular text-xs font-medium",
                      variancePct > 1.5 ? "text-danger" : variancePct > 0 ? "text-warning" : "text-success"
                    )}>
                      {variancePct > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {Math.abs(variancePct).toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {actPct <= target.high
                      ? <Badge tone="success">Within target</Badge>
                      : <Badge tone="danger">Above {target.high}%</Badge>}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border bg-surface-sunken/30">
              <td className="px-4 py-3 font-semibold">Total</td>
              <td className="px-4 py-3 text-right tabular font-bold">{money(totals.sold)}</td>
              <td className="px-4 py-3 text-right tabular font-semibold">{money(totals.theo)}</td>
              <td className="px-4 py-3 text-right tabular font-bold">{money(totals.actual)}</td>
              <td className="px-4 py-3 text-right tabular font-semibold">{((totals.theo / totals.sold) * 100).toFixed(1)}%</td>
              <td className="px-4 py-3 text-right tabular font-bold">{((totals.actual / totals.sold) * 100).toFixed(1)}%</td>
              <td colSpan={2}></td>
            </tr>
          </tfoot>
        </table>
      </Card>

      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={() => showToast("Drill-down by bartender exported.")}>
          <Download className="h-4 w-4 mr-1.5" />Export pour cost analysis
        </Button>
      </div>
    </div>
  );
}

// ===================== VARIANCE TAB =====================
function VarianceTab({ showToast }: { showToast: (m: string) => void }) {
  const flagTone = (f?: VarRow["flag"]) =>
    f === "over" ? "danger" : f === "watch" ? "warning" : "success";
  const flagLabel = (f?: VarRow["flag"]) =>
    f === "over" ? "Over-pour" : f === "watch" ? "Watch" : "OK";

  return (
    <div className="space-y-4">
      <Card className="p-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-warning-soft text-warning grid place-items-center">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold">SKU-level variance · last 7 days</div>
            <div className="text-xs text-muted-foreground">Theoretical (POS recipe pour) vs Actual (bottle weight delta)</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => showToast("Variance re-calculation triggered.")}>
            <RefreshCw className="h-4 w-4 mr-1.5" />Recalculate
          </Button>
          <Button size="sm" variant="outline" onClick={() => showToast("Flagged to F&B Manager + Loss Prevention.")}>
            <AlertTriangle className="h-4 w-4 mr-1.5" />Flag all over-pours
          </Button>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-sunken/40">
            <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3 font-medium">SKU</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium text-right">Theoretical (ml)</th>
              <th className="px-4 py-3 font-medium text-right">Actual (ml)</th>
              <th className="px-4 py-3 font-medium text-right">Diff (ml)</th>
              <th className="px-4 py-3 font-medium text-right">% var</th>
              <th className="px-4 py-3 font-medium text-right">Est. loss</th>
              <th className="px-4 py-3 font-medium">Flag</th>
              <th className="px-4 py-3 font-medium">Note</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {VARIANCE_ROWS.map((v, i) => {
              const diff = v.actualMl - v.theoreticalMl;
              const pct = (diff / v.theoreticalMl) * 100;
              const lossPerMl = v.unitCost / 750;
              const estLoss = Math.max(0, diff) * lossPerMl;
              return (
                <tr key={i} className="border-t border-border hover:bg-surface-sunken/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{v.sku}</td>
                  <td className="px-4 py-3">
                    <Badge tone={CATEGORY_TONE[v.category]}>{v.category}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right tabular text-muted-foreground">{v.theoreticalMl.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 text-right tabular">{v.actualMl.toLocaleString("en-IN")}</td>
                  <td className={cn(
                    "px-4 py-3 text-right tabular font-semibold",
                    diff > 100 ? "text-danger" : diff > 0 ? "text-warning" : "text-success"
                  )}>
                    {diff > 0 ? "+" : ""}{diff.toLocaleString("en-IN")}
                  </td>
                  <td className={cn(
                    "px-4 py-3 text-right tabular font-semibold",
                    pct > 10 ? "text-danger" : pct > 5 ? "text-warning" : "text-success"
                  )}>
                    {pct > 0 ? "+" : ""}{pct.toFixed(1)}%
                  </td>
                  <td className="px-4 py-3 text-right tabular">{money(Math.round(estLoss))}</td>
                  <td className="px-4 py-3">
                    <Badge tone={flagTone(v.flag) as any}>{flagLabel(v.flag)}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground max-w-[260px]">{v.note}</td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="ghost" onClick={() => showToast(`Investigation opened for ${v.sku}`)}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ===================== PO TAB =====================
function POTab({ showToast, openPO }: { showToast: (m: string) => void; openPO: (po: PORow) => void }) {
  const openTotal = PURCHASE_ORDERS.filter(p => p.status !== "Delivered").reduce((s, p) => s + p.value, 0);

  return (
    <div className="space-y-4">
      <Card className="p-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-info-soft text-info grid place-items-center">
            <Truck className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold">Open POs · {PURCHASE_ORDERS.filter(p => p.status !== "Delivered").length} pending delivery</div>
            <div className="text-xs text-muted-foreground">Total open commitment <span className="tabular font-semibold">{money(openTotal)}</span></div>
          </div>
        </div>
        <Button size="sm" onClick={() => showToast("New PO drawer opened.")}>
          <Plus className="h-4 w-4 mr-1.5" />New PO
        </Button>
      </Card>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-sunken/40">
            <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3 font-medium">PO #</th>
              <th className="px-4 py-3 font-medium">Vendor</th>
              <th className="px-4 py-3 font-medium">Items</th>
              <th className="px-4 py-3 font-medium text-right">Qty</th>
              <th className="px-4 py-3 font-medium text-right">Value</th>
              <th className="px-4 py-3 font-medium">Raised</th>
              <th className="px-4 py-3 font-medium">ETA</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {PURCHASE_ORDERS.map((p) => (
              <tr key={p.id} className="border-t border-border hover:bg-surface-sunken/30 transition-colors">
                <td className="px-4 py-3 font-medium tabular">{p.id}</td>
                <td className="px-4 py-3">{p.vendor}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground max-w-[240px]">{p.items}</td>
                <td className="px-4 py-3 text-right tabular">{p.itemCount}</td>
                <td className="px-4 py-3 text-right tabular font-semibold">{money(p.value)}</td>
                <td className="px-4 py-3 text-muted-foreground">{p.raised}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 text-xs">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    {p.eta}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Badge tone={PO_TONE[p.status]}>{p.status}</Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => openPO(p)}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    {p.status === "In Transit" && (
                      <Button size="sm" variant="outline" onClick={() => showToast(`${p.id} marked received.`)}>
                        Receive
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function PODrawer({ po, onClose, showToast }: { po: PORow; onClose: () => void; showToast: (m: string) => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-stretch justify-end" onClick={onClose}>
      <Card
        className="w-full max-w-xl overflow-y-auto rounded-none"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Purchase Order</div>
            <div className="text-lg font-semibold tabular">{po.id}</div>
          </div>
          <Button size="sm" variant="ghost" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <div className="p-5 space-y-5">
          <div>
            <Label className="text-xs uppercase text-muted-foreground">Vendor</Label>
            <div className="font-medium mt-1">{po.vendor}</div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs uppercase text-muted-foreground">Raised on</Label>
              <div className="font-medium tabular mt-1">{po.raised}</div>
            </div>
            <div>
              <Label className="text-xs uppercase text-muted-foreground">Delivery ETA</Label>
              <div className="font-medium tabular mt-1">{po.eta}</div>
            </div>
            <div>
              <Label className="text-xs uppercase text-muted-foreground">Total qty</Label>
              <div className="font-medium tabular mt-1">{po.itemCount} bottles/cases</div>
            </div>
            <div>
              <Label className="text-xs uppercase text-muted-foreground">PO value</Label>
              <div className="font-bold tabular mt-1">{money(po.value)}</div>
            </div>
          </div>
          <div>
            <Label className="text-xs uppercase text-muted-foreground">Items ordered</Label>
            <div className="mt-2 text-sm bg-surface-sunken/40 rounded-md p-3">{po.items}</div>
          </div>
          <div>
            <Label className="text-xs uppercase text-muted-foreground">Status</Label>
            <div className="mt-1"><Badge tone={PO_TONE[po.status]}>{po.status}</Badge></div>
          </div>
          <div>
            <Label className="text-xs uppercase text-muted-foreground">Timeline</Label>
            <ol className="mt-2 space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" />Raised by F&B Manager · {po.raised}
              </li>
              <li className="flex items-center gap-2">
                {po.status === "Pending" ? (
                  <span className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                )}
                Vendor confirmed
              </li>
              <li className="flex items-center gap-2">
                {["In Transit", "Delivered"].includes(po.status) ? (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                ) : (
                  <span className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
                )}
                Shipped from warehouse
              </li>
              <li className="flex items-center gap-2">
                {po.status === "Delivered" ? (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                ) : (
                  <span className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
                )}
                Received & added to stock
              </li>
            </ol>
          </div>
        </div>
        <div className="p-5 border-t border-border flex items-center justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => { showToast(`${po.id} cancelled.`); onClose(); }}>Cancel PO</Button>
          <Button size="sm" onClick={() => { showToast(`${po.id} marked received & stock updated.`); onClose(); }}>Mark received</Button>
        </div>
      </Card>
    </div>
  );
}

// ===================== BAR MENU TAB =====================
function BarMenuTab({ showToast, openRecipe }: { showToast: (m: string) => void; openRecipe: (c: Cocktail) => void }) {
  const catTone: Record<Cocktail["category"], "brand" | "accent" | "info" | "warning"> = {
    Classic: "brand",
    Signature: "accent",
    Mocktail: "info",
    Highball: "warning",
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-accent-soft text-accent grid place-items-center">
            <Martini className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold">Cocktail recipes · margin per drink</div>
            <div className="text-xs text-muted-foreground">Recipe cost includes spirit, mixers, glassware & garnish overhead</div>
          </div>
        </div>
        <Button size="sm" onClick={() => showToast("New cocktail recipe drawer opened.")}>
          <Plus className="h-4 w-4 mr-1.5" />Add cocktail
        </Button>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {COCKTAILS.map((c) => {
          const cost = cocktailCost(c);
          const margin = c.menuPrice - cost;
          const marginPct = (margin / c.menuPrice) * 100;
          const pourPct = (cost / c.menuPrice) * 100;
          return (
            <Card key={c.id} className="p-4 hover:shadow-md transition-shadow flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{c.name}</div>
                  <Badge tone={catTone[c.category]} className="mt-1.5">{c.category}</Badge>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase text-muted-foreground tracking-wider">Menu price</div>
                  <div className="font-bold tabular text-lg">{money(c.menuPrice)}</div>
                </div>
              </div>

              <div className="mt-3 space-y-1.5 text-xs">
                {c.recipe.slice(0, 3).map((r, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-muted-foreground truncate pr-2">{r.item}</span>
                    <span className="tabular shrink-0">{r.qtyMl}ml</span>
                  </div>
                ))}
                {c.recipe.length > 3 && (
                  <div className="text-muted-foreground italic">+{c.recipe.length - 3} more</div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-border grid grid-cols-3 gap-2 text-xs">
                <div>
                  <div className="text-muted-foreground">Cost</div>
                  <div className="tabular font-semibold">{money(Math.round(cost))}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Pour %</div>
                  <div className={cn(
                    "tabular font-semibold",
                    pourPct > 22 ? "text-danger" : pourPct >= 18 ? "text-success" : "text-info"
                  )}>{pourPct.toFixed(1)}%</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Margin</div>
                  <div className="tabular font-semibold text-success">{marginPct.toFixed(0)}%</div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-end gap-1">
                <Button size="sm" variant="ghost" onClick={() => openRecipe(c)}>
                  <Eye className="h-3.5 w-3.5 mr-1" />Recipe
                </Button>
                <Button size="sm" variant="outline" onClick={() => showToast(`${c.name} recipe edited.`)}>
                  <Edit3 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function CocktailDrawer({ cocktail, onClose, showToast }: { cocktail: Cocktail; onClose: () => void; showToast: (m: string) => void }) {
  const cost = cocktailCost(cocktail);
  const margin = cocktail.menuPrice - cost;
  const marginPct = (margin / cocktail.menuPrice) * 100;
  const pourPct = (cost / cocktail.menuPrice) * 100;
  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-stretch justify-end" onClick={onClose}>
      <Card
        className="w-full max-w-xl overflow-y-auto rounded-none"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{cocktail.category}</div>
            <div className="text-lg font-semibold">{cocktail.name}</div>
          </div>
          <Button size="sm" variant="ghost" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <div className="p-5 space-y-5">
          <div className="grid grid-cols-4 gap-3">
            <KPIInline label="Menu" value={money(cocktail.menuPrice)} />
            <KPIInline label="Cost" value={money(Math.round(cost))} />
            <KPIInline label="Pour %" value={`${pourPct.toFixed(1)}%`} tone={pourPct > 22 ? "danger" : "success"} />
            <KPIInline label="Margin" value={`${marginPct.toFixed(0)}%`} tone="success" />
          </div>

          <div>
            <Label className="text-xs uppercase text-muted-foreground">Recipe</Label>
            <div className="mt-2 overflow-hidden rounded-md border border-border">
              <table className="w-full text-sm">
                <thead className="bg-surface-sunken/40">
                  <tr className="text-left text-[10px] uppercase text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Ingredient</th>
                    <th className="px-3 py-2 font-medium text-right">Qty</th>
                    <th className="px-3 py-2 font-medium text-right">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {cocktail.recipe.map((r, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-3 py-2">{r.item}</td>
                      <td className="px-3 py-2 text-right tabular">{r.qtyMl}ml</td>
                      <td className="px-3 py-2 text-right tabular">{money(Math.round(r.qtyMl * r.costPerMl))}</td>
                    </tr>
                  ))}
                  <tr className="border-t border-border">
                    <td className="px-3 py-2 text-muted-foreground">Garnish, ice, glass</td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2 text-right tabular">{money(cocktail.glassCost)}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-surface-sunken/30">
                    <td className="px-3 py-2 font-semibold" colSpan={2}>Total recipe cost</td>
                    <td className="px-3 py-2 text-right tabular font-bold">{money(Math.round(cost))}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="text-xs text-muted-foreground bg-surface-sunken/40 rounded-md p-3">
            Recommended menu price for 20% pour target: <span className="tabular font-semibold text-foreground">{money(Math.round(cost / 0.2))}</span>
          </div>
        </div>
        <div className="p-5 border-t border-border flex items-center justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => { showToast(`${cocktail.name} delisted from menu.`); onClose(); }}>Delist</Button>
          <Button size="sm" onClick={() => { showToast(`${cocktail.name} recipe saved.`); onClose(); }}>
            <Save className="h-4 w-4 mr-1.5" />Save changes
          </Button>
        </div>
      </Card>
    </div>
  );
}

function KPIInline({ label, value, tone }: { label: string; value: string; tone?: "success" | "danger" }) {
  return (
    <div className="rounded-md border border-border p-2.5">
      <div className="text-[10px] uppercase text-muted-foreground tracking-wider">{label}</div>
      <div className={cn(
        "tabular font-semibold mt-0.5 text-sm",
        tone === "success" && "text-success",
        tone === "danger" && "text-danger"
      )}>{value}</div>
    </div>
  );
}

// ===================== STOCK TAKE MODAL =====================
function StockTakeModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: () => void }) {
  const sample = INVENTORY.slice(0, 12);
  const [counts, setCounts] = React.useState<Record<string, { opened: string; sealed: string }>>(
    Object.fromEntries(sample.map((s) => [s.id, { opened: String(s.opened), sealed: String(s.sealed) }]))
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <Card className="max-w-3xl w-full max-h-[88vh] overflow-hidden flex flex-col" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />Stock take · {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">Enter physical bottle counts per SKU. Variance will be auto-calculated.</div>
          </div>
          <Button size="sm" variant="ghost" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <div className="overflow-y-auto p-5">
          <div className="grid grid-cols-12 gap-2 text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border pb-2 mb-2">
            <div className="col-span-5">SKU</div>
            <div className="col-span-2 text-right">System</div>
            <div className="col-span-2">Opened</div>
            <div className="col-span-2">Sealed</div>
            <div className="col-span-1 text-right">Var</div>
          </div>
          <div className="space-y-2">
            {sample.map((s) => {
              const c = counts[s.id];
              const counted = (parseFloat(c.opened) || 0) + (parseFloat(c.sealed) || 0);
              const sys = bottleEquivalent(s);
              const variance = counted - sys;
              return (
                <div key={s.id} className="grid grid-cols-12 gap-2 items-center text-sm">
                  <div className="col-span-5">
                    <div className="font-medium truncate">{s.brand}</div>
                    <div className="text-xs text-muted-foreground">{s.category} · {s.size}</div>
                  </div>
                  <div className="col-span-2 text-right tabular text-muted-foreground">{sys.toFixed(1)}</div>
                  <div className="col-span-2">
                    <Input
                      className="h-8 text-sm"
                      value={c.opened}
                      onChange={(e) => setCounts({ ...counts, [s.id]: { ...c, opened: e.target.value } })}
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      className="h-8 text-sm"
                      value={c.sealed}
                      onChange={(e) => setCounts({ ...counts, [s.id]: { ...c, sealed: e.target.value } })}
                    />
                  </div>
                  <div className={cn(
                    "col-span-1 text-right tabular text-xs font-semibold",
                    Math.abs(variance) > 0.5 ? "text-danger" : Math.abs(variance) > 0 ? "text-warning" : "text-success"
                  )}>
                    {variance > 0 ? "+" : ""}{variance.toFixed(1)}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="text-xs text-muted-foreground mt-4 bg-surface-sunken/40 rounded-md p-3">
            Showing first 12 SKUs in demo. Full stock take covers all {INVENTORY.length} SKUs and saves a snapshot to audit log.
          </div>
        </div>
        <div className="p-5 border-t border-border flex items-center justify-end gap-2">
          <Button size="sm" variant="outline" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={onSubmit}>
            <Save className="h-4 w-4 mr-1.5" />Submit stock take
          </Button>
        </div>
      </Card>
    </div>
  );
}
