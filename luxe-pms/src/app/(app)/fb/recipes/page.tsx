"use client";
import * as React from "react";
import {
  ChefHat, Search, Plus, Trash2, Image, Image as ImageIcon, TrendingUp, TrendingDown,
  Calculator, Sparkles, Clock, Flame, Utensils, IndianRupee, Percent, Save,
  AlertCircle, Wheat, Milk, Egg, Nut, Fish, Shell, Soup, Download, Edit,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn, money } from "@/lib/utils";
import { useProperty, hotelName } from "@/lib/use-property";

// ----------------------- Types & Mock Pantry -----------------------
type Ingredient = {
  id: string;
  name: string;
  qty: number;
  unit: string;        // g, ml, pc, tbsp, tsp
  unitCost: number;    // ₹ per single unit (i.e. ₹ per g / ₹ per ml / ₹ per pc)
};

type Allergen = "nuts" | "dairy" | "gluten" | "egg" | "shellfish" | "fish" | "soy";

type Nutrition = {
  calories: number;
  protein: number;   // g
  carbs: number;     // g
  fat: number;       // g
};

type Recipe = {
  id: string;
  name: string;
  category: string;
  menuPrice: number;
  portions: number;
  prepMin: number;
  cookMin: number;
  labour: number;      // ₹ per plate
  overhead: number;    // ₹ per plate
  ingredients: Ingredient[];
  allergens: Allergen[];
  nutrition: Nutrition;
  description: string;
};

// Mock Pantry — used as suggestions when adding ingredients
const PANTRY: { name: string; unit: string; unitCost: number }[] = [
  { name: "Chicken thigh (boneless)", unit: "g", unitCost: 0.32 },
  { name: "Paneer (fresh)", unit: "g", unitCost: 0.42 },
  { name: "Tomato (ripe)", unit: "g", unitCost: 0.04 },
  { name: "Onion", unit: "g", unitCost: 0.03 },
  { name: "Ginger-garlic paste", unit: "g", unitCost: 0.18 },
  { name: "Cashew paste", unit: "g", unitCost: 0.85 },
  { name: "Fresh cream (Amul)", unit: "ml", unitCost: 0.28 },
  { name: "Butter (Amul Lite)", unit: "g", unitCost: 0.52 },
  { name: "Refined oil", unit: "ml", unitCost: 0.14 },
  { name: "Garam masala", unit: "g", unitCost: 1.2 },
  { name: "Kashmiri red chilli powder", unit: "g", unitCost: 0.95 },
  { name: "Kasuri methi", unit: "g", unitCost: 1.4 },
  { name: "Basmati rice (1121)", unit: "g", unitCost: 0.12 },
  { name: "Saffron strands", unit: "g", unitCost: 220 },
  { name: "Yoghurt (hung curd)", unit: "g", unitCost: 0.16 },
  { name: "Mint leaves", unit: "g", unitCost: 0.45 },
  { name: "Coriander leaves", unit: "g", unitCost: 0.32 },
  { name: "Lettuce (Romaine)", unit: "g", unitCost: 0.38 },
  { name: "Parmesan cheese", unit: "g", unitCost: 2.4 },
  { name: "Anchovy fillet", unit: "g", unitCost: 1.8 },
  { name: "Croutons (house-made)", unit: "g", unitCost: 0.22 },
  { name: "Egg yolk", unit: "pc", unitCost: 7 },
  { name: "Olive oil (extra virgin)", unit: "ml", unitCost: 1.6 },
  { name: "Mozzarella cheese", unit: "g", unitCost: 0.58 },
  { name: "Pizza dough (12-inch)", unit: "pc", unitCost: 28 },
  { name: "San Marzano tomato sauce", unit: "ml", unitCost: 0.34 },
  { name: "Fresh basil", unit: "g", unitCost: 1.1 },
  { name: "Dosa batter (fermented)", unit: "ml", unitCost: 0.18 },
  { name: "Potato (boiled)", unit: "g", unitCost: 0.025 },
  { name: "Mustard seeds", unit: "g", unitCost: 0.4 },
  { name: "Curry leaves", unit: "g", unitCost: 0.5 },
  { name: "Mascarpone cheese", unit: "g", unitCost: 1.9 },
  { name: "Ladyfinger biscuits", unit: "g", unitCost: 1.4 },
  { name: "Espresso shot", unit: "ml", unitCost: 0.6 },
  { name: "Cocoa powder", unit: "g", unitCost: 1.1 },
  { name: "Castor sugar", unit: "g", unitCost: 0.06 },
  { name: "Prawns (medium)", unit: "g", unitCost: 0.95 },
  { name: "Coconut milk", unit: "ml", unitCost: 0.22 },
  { name: "Mutton (curry cut)", unit: "g", unitCost: 0.78 },
  { name: "Chickpea flour (besan)", unit: "g", unitCost: 0.09 },
];

// ----------------------- Seed Recipes -----------------------
const SEED_RECIPES: Recipe[] = [
  {
    id: "r1",
    name: "Butter Chicken",
    category: "North Indian",
    menuPrice: 525,
    portions: 1,
    prepMin: 20,
    cookMin: 25,
    labour: 32,
    overhead: 18,
    description: "Slow-simmered tandoori chicken in a velvety tomato-cashew gravy finished with cream and kasuri methi.",
    allergens: ["dairy", "nuts"],
    nutrition: { calories: 612, protein: 38, carbs: 14, fat: 44 },
    ingredients: [
      { id: "i1", name: "Chicken thigh (boneless)", qty: 220, unit: "g", unitCost: 0.32 },
      { id: "i2", name: "Tomato (ripe)", qty: 180, unit: "g", unitCost: 0.04 },
      { id: "i3", name: "Cashew paste", qty: 25, unit: "g", unitCost: 0.85 },
      { id: "i4", name: "Fresh cream (Amul)", qty: 40, unit: "ml", unitCost: 0.28 },
      { id: "i5", name: "Butter (Amul Lite)", qty: 18, unit: "g", unitCost: 0.52 },
      { id: "i6", name: "Kasuri methi", qty: 2, unit: "g", unitCost: 1.4 },
    ],
  },
  {
    id: "r2",
    name: "Paneer Tikka",
    category: "North Indian",
    menuPrice: 425,
    portions: 1,
    prepMin: 30,
    cookMin: 12,
    labour: 25,
    overhead: 14,
    description: "Hung-curd marinated paneer skewers chargrilled in the tandoor with bell peppers and onion.",
    allergens: ["dairy"],
    nutrition: { calories: 484, protein: 24, carbs: 18, fat: 32 },
    ingredients: [
      { id: "i1", name: "Paneer (fresh)", qty: 180, unit: "g", unitCost: 0.42 },
      { id: "i2", name: "Yoghurt (hung curd)", qty: 60, unit: "g", unitCost: 0.16 },
      { id: "i3", name: "Ginger-garlic paste", qty: 12, unit: "g", unitCost: 0.18 },
      { id: "i4", name: "Kashmiri red chilli powder", qty: 4, unit: "g", unitCost: 0.95 },
      { id: "i5", name: "Onion", qty: 50, unit: "g", unitCost: 0.03 },
    ],
  },
  {
    id: "r3",
    name: "Caesar Salad",
    category: "Continental",
    menuPrice: 395,
    portions: 1,
    prepMin: 15,
    cookMin: 0,
    labour: 22,
    overhead: 12,
    description: "Crisp romaine tossed in a classic anchovy-parmesan dressing with house-made garlic croutons.",
    allergens: ["dairy", "egg", "fish", "gluten"],
    nutrition: { calories: 388, protein: 14, carbs: 22, fat: 28 },
    ingredients: [
      { id: "i1", name: "Lettuce (Romaine)", qty: 150, unit: "g", unitCost: 0.38 },
      { id: "i2", name: "Parmesan cheese", qty: 25, unit: "g", unitCost: 2.4 },
      { id: "i3", name: "Anchovy fillet", qty: 8, unit: "g", unitCost: 1.8 },
      { id: "i4", name: "Croutons (house-made)", qty: 30, unit: "g", unitCost: 0.22 },
      { id: "i5", name: "Egg yolk", qty: 1, unit: "pc", unitCost: 7 },
      { id: "i6", name: "Olive oil (extra virgin)", qty: 20, unit: "ml", unitCost: 1.6 },
    ],
  },
  {
    id: "r4",
    name: "Margherita Pizza",
    category: "Continental",
    menuPrice: 475,
    portions: 1,
    prepMin: 10,
    cookMin: 8,
    labour: 28,
    overhead: 22,
    description: "Wood-fired 12-inch with San Marzano sauce, fior di latte mozzarella and fresh Italian basil.",
    allergens: ["dairy", "gluten"],
    nutrition: { calories: 712, protein: 28, carbs: 84, fat: 28 },
    ingredients: [
      { id: "i1", name: "Pizza dough (12-inch)", qty: 1, unit: "pc", unitCost: 28 },
      { id: "i2", name: "San Marzano tomato sauce", qty: 90, unit: "ml", unitCost: 0.34 },
      { id: "i3", name: "Mozzarella cheese", qty: 120, unit: "g", unitCost: 0.58 },
      { id: "i4", name: "Fresh basil", qty: 6, unit: "g", unitCost: 1.1 },
      { id: "i5", name: "Olive oil (extra virgin)", qty: 10, unit: "ml", unitCost: 1.6 },
    ],
  },
  {
    id: "r5",
    name: "Masala Dosa",
    category: "South Indian",
    menuPrice: 285,
    portions: 1,
    prepMin: 5,
    cookMin: 6,
    labour: 18,
    overhead: 10,
    description: "Crisp fermented rice-lentil crepe filled with spiced potato masala, served with sambar and chutney.",
    allergens: [],
    nutrition: { calories: 458, protein: 11, carbs: 72, fat: 14 },
    ingredients: [
      { id: "i1", name: "Dosa batter (fermented)", qty: 180, unit: "ml", unitCost: 0.18 },
      { id: "i2", name: "Potato (boiled)", qty: 120, unit: "g", unitCost: 0.025 },
      { id: "i3", name: "Onion", qty: 40, unit: "g", unitCost: 0.03 },
      { id: "i4", name: "Mustard seeds", qty: 2, unit: "g", unitCost: 0.4 },
      { id: "i5", name: "Curry leaves", qty: 3, unit: "g", unitCost: 0.5 },
      { id: "i6", name: "Refined oil", qty: 15, unit: "ml", unitCost: 0.14 },
    ],
  },
  {
    id: "r6",
    name: "Hyderabadi Biryani",
    category: "Biryani",
    menuPrice: 595,
    portions: 1,
    prepMin: 40,
    cookMin: 35,
    labour: 38,
    overhead: 24,
    description: "Dum-cooked basmati layered with marinated mutton, saffron milk, fried onions and mint.",
    allergens: ["dairy"],
    nutrition: { calories: 824, protein: 36, carbs: 92, fat: 36 },
    ingredients: [
      { id: "i1", name: "Basmati rice (1121)", qty: 200, unit: "g", unitCost: 0.12 },
      { id: "i2", name: "Mutton (curry cut)", qty: 180, unit: "g", unitCost: 0.78 },
      { id: "i3", name: "Yoghurt (hung curd)", qty: 50, unit: "g", unitCost: 0.16 },
      { id: "i4", name: "Saffron strands", qty: 0.1, unit: "g", unitCost: 220 },
      { id: "i5", name: "Mint leaves", qty: 10, unit: "g", unitCost: 0.45 },
      { id: "i6", name: "Onion", qty: 80, unit: "g", unitCost: 0.03 },
      { id: "i7", name: "Garam masala", qty: 3, unit: "g", unitCost: 1.2 },
    ],
  },
  {
    id: "r7",
    name: "Tiramisu",
    category: "Desserts",
    menuPrice: 345,
    portions: 1,
    prepMin: 25,
    cookMin: 0,
    labour: 20,
    overhead: 14,
    description: "Classic Italian dessert — mascarpone cream over espresso-soaked ladyfingers, dusted with cocoa.",
    allergens: ["dairy", "egg", "gluten"],
    nutrition: { calories: 482, protein: 7, carbs: 38, fat: 32 },
    ingredients: [
      { id: "i1", name: "Mascarpone cheese", qty: 80, unit: "g", unitCost: 1.9 },
      { id: "i2", name: "Ladyfinger biscuits", qty: 50, unit: "g", unitCost: 1.4 },
      { id: "i3", name: "Espresso shot", qty: 30, unit: "ml", unitCost: 0.6 },
      { id: "i4", name: "Cocoa powder", qty: 4, unit: "g", unitCost: 1.1 },
      { id: "i5", name: "Castor sugar", qty: 20, unit: "g", unitCost: 0.06 },
      { id: "i6", name: "Egg yolk", qty: 1, unit: "pc", unitCost: 7 },
    ],
  },
  {
    id: "r8",
    name: "Goan Prawn Curry",
    category: "Coastal",
    menuPrice: 645,
    portions: 1,
    prepMin: 18,
    cookMin: 20,
    labour: 30,
    overhead: 20,
    description: "Plump prawns simmered in a tangy coconut-kokum gravy with curry leaves and red chillies.",
    allergens: ["shellfish"],
    nutrition: { calories: 542, protein: 32, carbs: 16, fat: 38 },
    ingredients: [
      { id: "i1", name: "Prawns (medium)", qty: 180, unit: "g", unitCost: 0.95 },
      { id: "i2", name: "Coconut milk", qty: 120, unit: "ml", unitCost: 0.22 },
      { id: "i3", name: "Onion", qty: 60, unit: "g", unitCost: 0.03 },
      { id: "i4", name: "Tomato (ripe)", qty: 80, unit: "g", unitCost: 0.04 },
      { id: "i5", name: "Curry leaves", qty: 2, unit: "g", unitCost: 0.5 },
      { id: "i6", name: "Kashmiri red chilli powder", qty: 3, unit: "g", unitCost: 0.95 },
    ],
  },
  {
    id: "r9",
    name: "Dal Makhani",
    category: "North Indian",
    menuPrice: 365,
    portions: 1,
    prepMin: 15,
    cookMin: 90,
    labour: 26,
    overhead: 16,
    description: "Black urad and rajma slow-cooked overnight with butter, cream and aromatic spices.",
    allergens: ["dairy"],
    nutrition: { calories: 524, protein: 18, carbs: 42, fat: 30 },
    ingredients: [
      { id: "i1", name: "Tomato (ripe)", qty: 120, unit: "g", unitCost: 0.04 },
      { id: "i2", name: "Butter (Amul Lite)", qty: 20, unit: "g", unitCost: 0.52 },
      { id: "i3", name: "Fresh cream (Amul)", qty: 30, unit: "ml", unitCost: 0.28 },
      { id: "i4", name: "Ginger-garlic paste", qty: 10, unit: "g", unitCost: 0.18 },
      { id: "i5", name: "Garam masala", qty: 2, unit: "g", unitCost: 1.2 },
    ],
  },
  {
    id: "r10",
    name: "Pav Bhaji",
    category: "Street Food",
    menuPrice: 245,
    portions: 1,
    prepMin: 12,
    cookMin: 18,
    labour: 16,
    overhead: 10,
    description: "Mashed mixed-vegetable bhaji with butter-toasted pav, raw onion and lime.",
    allergens: ["dairy", "gluten"],
    nutrition: { calories: 612, protein: 14, carbs: 78, fat: 26 },
    ingredients: [
      { id: "i1", name: "Potato (boiled)", qty: 150, unit: "g", unitCost: 0.025 },
      { id: "i2", name: "Tomato (ripe)", qty: 100, unit: "g", unitCost: 0.04 },
      { id: "i3", name: "Onion", qty: 60, unit: "g", unitCost: 0.03 },
      { id: "i4", name: "Butter (Amul Lite)", qty: 22, unit: "g", unitCost: 0.52 },
      { id: "i5", name: "Garam masala", qty: 3, unit: "g", unitCost: 1.2 },
      { id: "i6", name: "Coriander leaves", qty: 8, unit: "g", unitCost: 0.32 },
    ],
  },
];

const CATEGORIES = ["All", "North Indian", "South Indian", "Continental", "Biryani", "Coastal", "Desserts", "Street Food"];

const TARGET_MARGIN = 70;   // target margin % for "Push price recommendation"

// ----------------------- Helpers -----------------------
function ingredientCost(ing: Ingredient[]) {
  return ing.reduce((s, i) => s + i.qty * i.unitCost, 0);
}
function plateCost(r: Recipe) {
  return ingredientCost(r.ingredients) + r.labour + r.overhead;
}
function marginRupee(r: Recipe) { return r.menuPrice - plateCost(r); }
function marginPct(r: Recipe) { return (marginRupee(r) / r.menuPrice) * 100; }
function marginTone(m: number): "success" | "warning" | "danger" {
  if (m >= 65) return "success";
  if (m >= 50) return "warning";
  return "danger";
}
function marginLabel(m: number) {
  if (m >= 65) return "Healthy";
  if (m >= 50) return "Watch";
  return "Below target";
}

const ALLERGEN_META: Record<Allergen, { label: string; Icon: React.ComponentType<{ className?: string }> }> = {
  nuts:       { label: "Nuts",       Icon: Nut },
  dairy:      { label: "Dairy",      Icon: Milk },
  gluten:     { label: "Gluten",     Icon: Wheat },
  egg:        { label: "Egg",        Icon: Egg },
  shellfish:  { label: "Shellfish",  Icon: Shell },
  fish:       { label: "Fish",       Icon: Fish },
  soy:        { label: "Soy",        Icon: Soup },
};

// ----------------------- Page -----------------------
export default function RecipesPage() {
  const name = hotelName(useProperty());
  const [recipes, setRecipes] = React.useState<Recipe[]>(SEED_RECIPES);
  const [selectedId, setSelectedId] = React.useState<string>(SEED_RECIPES[0].id);
  const [search, setSearch] = React.useState("");
  const [catFilter, setCatFilter] = React.useState<string>("All");
  const [toast, setToast] = React.useState<string | null>(null);
  const [showNewModal, setShowNewModal] = React.useState(false);
  const [showAddIng, setShowAddIng] = React.useState(false);

  // New ingredient form state
  const [newIngName, setNewIngName] = React.useState("");
  const [newIngQty, setNewIngQty] = React.useState("100");
  const [newIngUnit, setNewIngUnit] = React.useState("g");
  const [newIngCost, setNewIngCost] = React.useState("0.50");

  // New recipe form state
  const [draftName, setDraftName] = React.useState("");
  const [draftCat, setDraftCat] = React.useState("North Indian");
  const [draftPrice, setDraftPrice] = React.useState("450");

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };

  // ----- derived -----
  const filtered = recipes.filter(r => {
    const matchCat = catFilter === "All" || r.category === catFilter;
    const matchSearch = !search.trim() || r.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const selected = recipes.find(r => r.id === selectedId) ?? recipes[0];

  // KPIs across all recipes
  const totalRecipes = recipes.length;
  const avgMargin = recipes.reduce((s, r) => s + marginPct(r), 0) / Math.max(1, recipes.length);
  const sortedByMargin = [...recipes].sort((a, b) => marginPct(b) - marginPct(a));
  const highest = sortedByMargin[0];
  const lowest = sortedByMargin[sortedByMargin.length - 1];

  // ----- mutations on selected -----
  const updateSelected = (patch: Partial<Recipe>) => {
    setRecipes(rs => rs.map(r => r.id === selected.id ? { ...r, ...patch } : r));
  };

  const removeIngredient = (ingId: string) => {
    updateSelected({ ingredients: selected.ingredients.filter(i => i.id !== ingId) });
    showToast("Ingredient removed · totals updated");
  };

  const addIngredient = () => {
    const qty = parseFloat(newIngQty) || 0;
    const cost = parseFloat(newIngCost) || 0;
    if (!newIngName.trim() || qty <= 0) {
      showToast("Enter a name and quantity to add ingredient");
      return;
    }
    const ing: Ingredient = {
      id: `i${Date.now()}`,
      name: newIngName.trim(),
      qty, unit: newIngUnit, unitCost: cost,
    };
    updateSelected({ ingredients: [...selected.ingredients, ing] });
    setShowAddIng(false);
    setNewIngName(""); setNewIngQty("100"); setNewIngUnit("g"); setNewIngCost("0.50");
    showToast(`Added ${ing.name} · plate cost recalculated`);
  };

  const editIngredientQty = (ingId: string, qty: number) => {
    updateSelected({
      ingredients: selected.ingredients.map(i => i.id === ingId ? { ...i, qty } : i),
    });
  };

  const pushPriceRecommendation = () => {
    const cost = plateCost(selected);
    // price = cost / (1 - target/100)
    const recommended = Math.ceil(cost / (1 - TARGET_MARGIN / 100) / 5) * 5;
    showToast(`Suggested price for ${TARGET_MARGIN}% margin: ${money(recommended)} (current ${money(selected.menuPrice)})`);
  };

  const toggleAllergen = (a: Allergen) => {
    const has = selected.allergens.includes(a);
    updateSelected({
      allergens: has ? selected.allergens.filter(x => x !== a) : [...selected.allergens, a],
    });
    showToast(has ? `Removed ${ALLERGEN_META[a].label} allergen` : `Tagged ${ALLERGEN_META[a].label} allergen`);
  };

  const createRecipe = () => {
    if (!draftName.trim()) { showToast("Enter a dish name"); return; }
    const newR: Recipe = {
      id: `r${Date.now()}`,
      name: draftName.trim(),
      category: draftCat,
      menuPrice: parseFloat(draftPrice) || 450,
      portions: 1, prepMin: 15, cookMin: 20,
      labour: 25, overhead: 15,
      description: "New recipe — add description and ingredients.",
      allergens: [],
      nutrition: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      ingredients: [],
    };
    setRecipes(rs => [newR, ...rs]);
    setSelectedId(newR.id);
    setShowNewModal(false);
    setDraftName(""); setDraftPrice("450");
    showToast(`Recipe "${newR.name}" created · add ingredients`);
  };

  const ingCost = ingredientCost(selected.ingredients);
  const totalPlate = ingCost + selected.labour + selected.overhead;
  const margin = selected.menuPrice - totalPlate;
  const marginP = (margin / selected.menuPrice) * 100;
  const mTone = marginTone(marginP);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="h-12 w-12 rounded-xl bg-linear-to-br from-rose-500 to-orange-500 text-white inline-flex items-center justify-center shadow-md">
            <ChefHat className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold leading-tight">Recipes & Plate Cost</h1>
            <p className="text-sm text-muted-foreground">
              Engineer kitchen profitability · {name}, Mumbai · {recipes.length} active dishes
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => showToast("Recipe book exported to PDF")}>
            <Download className="h-4 w-4" /> Export book
          </Button>
          <Button size="sm" variant="outline" onClick={() => showToast("Costing sync from pantry — 0 price changes detected")}>
            <Sparkles className="h-4 w-4" /> Sync pantry
          </Button>
          <Button size="sm" onClick={() => setShowNewModal(true)}>
            <Plus className="h-4 w-4" /> New recipe
          </Button>
        </div>
      </div>

      {/* KPI STRIP */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<Utensils className="h-4 w-4" />}
          tone="bg-brand-soft text-brand-soft-foreground"
          label="Total recipes"
          value={String(totalRecipes)}
          sub={`${recipes.filter(r => r.ingredients.length > 0).length} fully costed`}
        />
        <KpiCard
          icon={<Percent className="h-4 w-4" />}
          tone="bg-info-soft text-info"
          label="Avg margin"
          value={`${avgMargin.toFixed(1)}%`}
          sub={`Target ${TARGET_MARGIN}% · ${avgMargin >= TARGET_MARGIN ? "on track" : `${(TARGET_MARGIN - avgMargin).toFixed(1)}% gap`}`}
        />
        <KpiCard
          icon={<TrendingUp className="h-4 w-4" />}
          tone="bg-success-soft text-success"
          label="Highest margin"
          value={highest?.name ?? "—"}
          sub={`${marginPct(highest).toFixed(1)}% · ${money(marginRupee(highest))}/plate`}
        />
        <KpiCard
          icon={<TrendingDown className="h-4 w-4" />}
          tone="bg-danger-soft text-danger"
          label="Lowest margin"
          value={lowest?.name ?? "—"}
          sub={`${marginPct(lowest).toFixed(1)}% · review pricing`}
        />
      </div>

      {/* MAIN — sidebar + detail */}
      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-5">
        {/* LEFT SIDEBAR */}
        <div className="space-y-3">
          <Card className="p-3 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle-foreground" />
              <Input
                placeholder="Search dishes…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-10"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map(c => (
                <button
                  key={c}
                  onClick={() => setCatFilter(c)}
                  className={cn(
                    "h-7 px-2.5 rounded-full text-[11px] font-medium border transition-colors",
                    catFilter === c
                      ? "bg-brand text-brand-foreground border-brand"
                      : "bg-surface text-muted-foreground border-border hover:bg-surface-sunken hover:text-foreground"
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
            <Button size="sm" className="w-full" onClick={() => setShowNewModal(true)}>
              <Plus className="h-4 w-4" /> New recipe
            </Button>
          </Card>

          <Card className="overflow-hidden">
            <div className="px-3 py-2 border-b border-border flex items-center justify-between bg-surface-sunken/40">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                {filtered.length} of {recipes.length} dishes
              </span>
            </div>
            <ul className="divide-y divide-border max-h-[640px] overflow-y-auto">
              {filtered.map(r => {
                const pc = plateCost(r);
                const mp = ((r.menuPrice - pc) / r.menuPrice) * 100;
                const active = r.id === selected.id;
                return (
                  <li key={r.id}>
                    <button
                      onClick={() => setSelectedId(r.id)}
                      className={cn(
                        "w-full text-left px-3 py-2.5 hover:bg-surface-sunken/60 transition-colors flex items-start gap-3",
                        active && "bg-brand-soft/40"
                      )}
                    >
                      <span className={cn(
                        "h-10 w-10 rounded-md inline-flex items-center justify-center shrink-0",
                        active ? "bg-brand text-brand-foreground" : "bg-surface-sunken text-muted-foreground"
                      )}>
                        <ChefHat className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-sm truncate">{r.name}</p>
                          <Badge tone={marginTone(mp)}>{mp.toFixed(0)}%</Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{r.category}</p>
                        <p className="text-[11px] tabular mt-0.5">
                          <span className="text-muted-foreground">Plate</span>{" "}
                          <span className="font-medium">{money(pc)}</span>
                          <span className="text-subtle-foreground"> / {money(r.menuPrice)}</span>
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
              {filtered.length === 0 && (
                <li className="px-3 py-10 text-center text-sm text-muted-foreground">
                  No recipes match your filters
                </li>
              )}
            </ul>
          </Card>
        </div>

        {/* RIGHT DETAIL */}
        <div className="space-y-5 min-w-0">
          {/* Dish header */}
          <Card className="p-5">
            <div className="flex flex-col md:flex-row gap-5">
              <div className="md:w-48 shrink-0 space-y-2">
                <div className="aspect-square rounded-lg bg-linear-to-br from-orange-100 to-rose-100 border border-border flex items-center justify-center text-orange-400 relative overflow-hidden">
                  <ImageIcon className="h-10 w-10" />
                  <span className="absolute bottom-2 right-2 text-[10px] uppercase tracking-wider bg-white/80 text-muted-foreground rounded px-1.5 py-0.5">
                    Photo
                  </span>
                </div>
                <Button size="sm" variant="outline" className="w-full" onClick={() => showToast(`Upload photo for ${selected.name}`)}>
                  <ImageIcon className="h-3.5 w-3.5" /> Upload photo
                </Button>
                <Button size="sm" variant="ghost" className="w-full" onClick={() => showToast(`Opening photo gallery for ${selected.name}`)}>
                  <Image className="h-3.5 w-3.5" /> View gallery
                </Button>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl font-semibold leading-tight">{selected.name}</h2>
                      <Badge tone="neutral">{selected.category}</Badge>
                      <Badge tone={mTone}>{marginLabel(marginP)} · {marginP.toFixed(1)}%</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">{selected.description}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => showToast("Recipe edit mode enabled")}>
                    <Edit className="h-4 w-4" /> Edit
                  </Button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                  <Field label="Menu price">
                    <div className="flex items-center gap-1">
                      <IndianRupee className="h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        type="number"
                        value={selected.menuPrice}
                        onChange={e => updateSelected({ menuPrice: parseFloat(e.target.value) || 0 })}
                        className="h-9 tabular"
                      />
                    </div>
                  </Field>
                  <Field label="Portions">
                    <Input
                      type="number"
                      value={selected.portions}
                      onChange={e => updateSelected({ portions: parseFloat(e.target.value) || 1 })}
                      className="h-9 tabular"
                    />
                  </Field>
                  <Field label="Prep time">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        type="number"
                        value={selected.prepMin}
                        onChange={e => updateSelected({ prepMin: parseFloat(e.target.value) || 0 })}
                        className="h-9 tabular"
                      />
                      <span className="text-xs text-muted-foreground">min</span>
                    </div>
                  </Field>
                  <Field label="Cook time">
                    <div className="flex items-center gap-1">
                      <Flame className="h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        type="number"
                        value={selected.cookMin}
                        onChange={e => updateSelected({ cookMin: parseFloat(e.target.value) || 0 })}
                        className="h-9 tabular"
                      />
                      <span className="text-xs text-muted-foreground">min</span>
                    </div>
                  </Field>
                </div>
              </div>
            </div>
          </Card>

          {/* Ingredients table */}
          <Card className="overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-surface-sunken/40">
              <div>
                <h3 className="text-sm font-semibold">Ingredients</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {selected.ingredients.length} items · totals recalculate automatically
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setShowAddIng(true)}>
                <Plus className="h-4 w-4" /> Add ingredient
              </Button>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-surface-sunken/40">
                <tr>
                  <th className="text-left px-4 py-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Item</th>
                  <th className="text-right px-4 py-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold w-24">Qty</th>
                  <th className="text-left px-2 py-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold w-20">Unit</th>
                  <th className="text-right px-4 py-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold w-32">Unit cost</th>
                  <th className="text-right px-4 py-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold w-32">Line cost</th>
                  <th className="w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {selected.ingredients.map(i => {
                  const line = i.qty * i.unitCost;
                  return (
                    <tr key={i.id} className="hover:bg-surface-sunken/30">
                      <td className="px-4 py-2 font-medium">{i.name}</td>
                      <td className="px-4 py-1.5 text-right">
                        <Input
                          type="number"
                          value={i.qty}
                          onChange={e => editIngredientQty(i.id, parseFloat(e.target.value) || 0)}
                          className="h-8 tabular text-right"
                        />
                      </td>
                      <td className="px-2 py-2 text-muted-foreground">{i.unit}</td>
                      <td className="px-4 py-2 text-right tabular text-muted-foreground">{money(i.unitCost)}/{i.unit}</td>
                      <td className="px-4 py-2 text-right tabular font-semibold">{money(line)}</td>
                      <td className="px-2 py-2 text-center">
                        <button
                          onClick={() => removeIngredient(i.id)}
                          className="h-7 w-7 rounded-md hover:bg-danger-soft text-muted-foreground hover:text-danger inline-flex items-center justify-center transition-colors"
                          title="Remove ingredient"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {selected.ingredients.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      No ingredients yet — click &quot;Add ingredient&quot; to start costing this dish
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-surface-sunken/40 border-t border-border">
                <tr>
                  <td colSpan={4} className="px-4 py-2.5 text-right text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                    Ingredient total
                  </td>
                  <td className="px-4 py-2.5 text-right tabular font-semibold">{money(ingCost)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </Card>

          {/* Cost + Margin cards row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Cost breakdown */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-muted-foreground" /> Plate cost breakdown
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Per single portion</p>
                </div>
              </div>
              <div className="space-y-2.5">
                <CostRow label="Ingredients" value={ingCost} />
                <CostRowEdit
                  label="Labour allocation"
                  value={selected.labour}
                  onChange={v => updateSelected({ labour: v })}
                />
                <CostRowEdit
                  label="Overhead allocation"
                  value={selected.overhead}
                  onChange={v => updateSelected({ overhead: v })}
                />
                <div className="h-px bg-border my-2" />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Plate cost</span>
                  <span className="text-2xl font-bold tabular">{money(totalPlate)}</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  = ingredients {money(ingCost)} + labour {money(selected.labour)} + overhead {money(selected.overhead)}
                </p>
              </div>
            </Card>

            {/* Margin */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Percent className="h-4 w-4 text-muted-foreground" /> Margin
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Menu price minus plate cost</p>
                </div>
                <Badge tone={mTone}>{marginLabel(marginP)}</Badge>
              </div>

              <div className="space-y-2.5">
                <CostRow label="Menu price" value={selected.menuPrice} />
                <CostRow label="Plate cost" value={-totalPlate} />
                <div className="h-px bg-border my-2" />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Margin</span>
                  <div className="text-right">
                    <p className="text-2xl font-bold tabular">{money(margin)}</p>
                    <p className={cn(
                      "text-sm font-semibold tabular",
                      mTone === "success" && "text-success",
                      mTone === "warning" && "text-warning",
                      mTone === "danger" && "text-danger",
                    )}>
                      {marginP.toFixed(1)}%
                    </p>
                  </div>
                </div>

                {/* Tri-band scale */}
                <div className="mt-3">
                  <div className="h-2 rounded-full overflow-hidden flex">
                    <div className="bg-danger flex-1" />
                    <div className="bg-warning flex-1" />
                    <div className="bg-success flex-1" />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-1 tabular">
                    <span>0%</span>
                    <span>50%</span>
                    <span>65%</span>
                    <span>100%</span>
                  </div>
                </div>

                <div className="mt-3 p-3 rounded-md border border-dashed border-border bg-surface-sunken/40 text-xs space-y-1.5">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-3.5 w-3.5 text-info shrink-0 mt-0.5" />
                    <p className="text-muted-foreground">
                      Target margin <span className="font-semibold text-foreground">{TARGET_MARGIN}%</span> means a plate cost
                      of <span className="font-semibold text-foreground">{money(selected.menuPrice * (1 - TARGET_MARGIN / 100))}</span> or less.
                    </p>
                  </div>
                </div>

                <Button size="sm" className="w-full mt-2" onClick={pushPriceRecommendation}>
                  <Sparkles className="h-4 w-4" /> Push price recommendation
                </Button>
              </div>
            </Card>
          </div>

          {/* Allergens + Nutrition row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Allergens */}
            <Card className="p-5">
              <h3 className="text-sm font-semibold">Allergens</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Click to toggle — shown to guests on menu cards
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {(Object.keys(ALLERGEN_META) as Allergen[]).map(a => {
                  const active = selected.allergens.includes(a);
                  const { label, Icon } = ALLERGEN_META[a];
                  return (
                    <button
                      key={a}
                      onClick={() => toggleAllergen(a)}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-medium border transition-colors",
                        active
                          ? "bg-warning-soft text-warning border-warning/30"
                          : "bg-surface text-muted-foreground border-border hover:bg-surface-sunken"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" /> {label}
                    </button>
                  );
                })}
              </div>
              {selected.allergens.length === 0 && (
                <p className="text-xs text-muted-foreground mt-3 italic">No allergens tagged</p>
              )}
            </Card>

            {/* Nutrition */}
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">Nutrition (per portion)</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Estimated · lab-verify before publishing
                  </p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => showToast("Nutrition refresh requested from lab")}>
                  <Sparkles className="h-4 w-4" /> Re-estimate
                </Button>
              </div>
              <div className="grid grid-cols-4 gap-3 mt-3">
                <NutrientTile label="Calories" value={`${selected.nutrition.calories}`} unit="kcal" />
                <NutrientTile label="Protein"  value={`${selected.nutrition.protein}`}  unit="g" />
                <NutrientTile label="Carbs"    value={`${selected.nutrition.carbs}`}    unit="g" />
                <NutrientTile label="Fat"      value={`${selected.nutrition.fat}`}      unit="g" />
              </div>
              <div className="mt-3 text-[11px] text-muted-foreground border-t border-border pt-3">
                Detailed micro-nutrients (sodium, fiber, sugar, vitamins) — coming soon.
              </div>
            </Card>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-muted-foreground">
              Plate cost is auto-calculated from ingredients, labour and overhead. Edit any value above to see margin update instantly.
            </p>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => showToast(`${selected.name} duplicated as draft`)}>
                Duplicate
              </Button>
              <Button size="sm" variant="outline" onClick={() => showToast("Recipe printed to BOH printer")}>
                Print BOH
              </Button>
              <Button size="sm" onClick={() => showToast(`${selected.name} saved · published to POS`)}>
                <Save className="h-4 w-4" /> Save & publish
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Add ingredient modal */}
      {showAddIng && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">Add ingredient</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Pick from pantry or enter custom — line cost is qty × unit cost
                </p>
              </div>
              <button
                onClick={() => setShowAddIng(false)}
                className="h-8 w-8 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"
              >×</button>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Pantry suggestions</Label>
                <div className="mt-2 flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                  {PANTRY.slice(0, 18).map(p => (
                    <button
                      key={p.name}
                      onClick={() => {
                        setNewIngName(p.name);
                        setNewIngUnit(p.unit);
                        setNewIngCost(String(p.unitCost));
                      }}
                      className="h-7 px-2.5 rounded-full text-[11px] border border-border bg-surface hover:bg-surface-sunken text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-12 sm:col-span-5">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Item name</Label>
                  <Input className="mt-1" value={newIngName} onChange={e => setNewIngName(e.target.value)} placeholder="e.g. Saffron strands" />
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Qty</Label>
                  <Input className="mt-1 tabular" type="number" value={newIngQty} onChange={e => setNewIngQty(e.target.value)} />
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Unit</Label>
                  <Select className="mt-1" value={newIngUnit} onChange={e => setNewIngUnit(e.target.value)}>
                    <option value="g">g</option>
                    <option value="ml">ml</option>
                    <option value="pc">pc</option>
                    <option value="tbsp">tbsp</option>
                    <option value="tsp">tsp</option>
                  </Select>
                </div>
                <div className="col-span-4 sm:col-span-3">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Unit cost (₹)</Label>
                  <Input className="mt-1 tabular" type="number" step="0.01" value={newIngCost} onChange={e => setNewIngCost(e.target.value)} />
                </div>
              </div>

              <div className="p-3 rounded-md bg-surface-sunken text-xs flex items-center justify-between">
                <span className="text-muted-foreground">Line cost preview</span>
                <span className="font-semibold tabular">
                  {money((parseFloat(newIngQty) || 0) * (parseFloat(newIngCost) || 0))}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => setShowAddIng(false)}>Cancel</Button>
                <Button size="sm" onClick={addIngredient}>
                  <Plus className="h-4 w-4" /> Add to recipe
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* New recipe modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">New recipe</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Create a draft — you can add ingredients, allergens and photos right after
                </p>
              </div>
              <button
                onClick={() => setShowNewModal(false)}
                className="h-8 w-8 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"
              >×</button>
            </div>
            <div className="space-y-4">
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Dish name</Label>
                <Input className="mt-1" value={draftName} onChange={e => setDraftName(e.target.value)} placeholder="e.g. Mutton Rogan Josh" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Category</Label>
                  <Select className="mt-1" value={draftCat} onChange={e => setDraftCat(e.target.value)}>
                    {CATEGORIES.filter(c => c !== "All").map(c => <option key={c} value={c}>{c}</option>)}
                  </Select>
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Menu price (₹)</Label>
                  <Input className="mt-1 tabular" type="number" value={draftPrice} onChange={e => setDraftPrice(e.target.value)} />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => setShowNewModal(false)}>Cancel</Button>
                <Button size="sm" onClick={createRecipe}>
                  <Plus className="h-4 w-4" /> Create draft
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-foreground text-background rounded-lg px-4 py-3 text-sm shadow-2xl">
          {toast}
        </div>
      )}
    </div>
  );
}

// ----------------------- Sub-components -----------------------
function KpiCard({ icon, tone, label, value, sub }: { icon: React.ReactNode; tone: string; label: string; value: string; sub: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <span className={cn("h-9 w-9 rounded-md inline-flex items-center justify-center shrink-0", tone)}>
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
          <p className="text-xl font-bold tabular leading-tight mt-1 truncate" title={value}>{value}</p>
          <p className="text-[11px] text-muted-foreground mt-1 truncate" title={sub}>{sub}</p>
        </div>
      </div>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function CostRow({ label, value }: { label: string; value: number }) {
  const negative = value < 0;
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("tabular font-medium", negative && "text-danger")}>
        {negative ? "−" : ""}{money(Math.abs(value))}
      </span>
    </div>
  );
}

function CostRowEdit({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1">
        <IndianRupee className="h-3.5 w-3.5 text-muted-foreground" />
        <Input
          type="number"
          value={value}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          className="h-8 w-24 tabular text-right"
        />
      </div>
    </div>
  );
}

function NutrientTile({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-md border border-border p-3 text-center bg-surface-sunken/40">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
      <p className="text-lg font-bold tabular mt-1">{value}</p>
      <p className="text-[10px] text-subtle-foreground">{unit}</p>
    </div>
  );
}
