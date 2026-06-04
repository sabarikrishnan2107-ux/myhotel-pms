"use client";
import * as React from "react";
import {
  Plus, Search, AlertCircle, Boxes, TrendingDown, ShoppingCart, Package, ArrowUp,
  ArrowDown, X, FileDown, RotateCw, ChevronRight, CheckCircle2,
  Utensils, Camera, Edit, Trash2, Calendar, MapPin, BedDouble,
  LayoutGrid, List, Truck, Wallet, FileText, Eye,
} from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { KPICard } from "@/components/ui/kpi-card";
import { INVENTORY_ITEMS } from "@/lib/mock-data-ext";
import { money, cn } from "@/lib/utils";

const TABS = [
  { id: "items", label: "Items", icon: Boxes },
  { id: "kitchen", label: "Kitchen Amenities", icon: Utensils },
  { id: "room", label: "Room Amenities", icon: BedDouble },
  { id: "purchases", label: "Purchases", icon: Truck },
  { id: "movements", label: "Stock Movements", icon: RotateCw },
  { id: "pos", label: "Purchase Orders", icon: ShoppingCart },
  { id: "wastage", label: "Wastage", icon: TrendingDown },
] as const;
type TabId = typeof TABS[number]["id"];

type Item = typeof INVENTORY_ITEMS[number];

interface Movement {
  id: string; time: string; itemName: string; type: "Issue" | "Receive" | "Adjust" | "Wastage";
  qty: number; reason: string; by: string;
}

interface PO {
  id: string; po: string; vendor: string; items: number; amount: number; date: string;
  status: "Draft" | "Sent" | "Received" | "Cancelled";
}

const INITIAL_MOVEMENTS: Movement[] = [
  { id: "m1", time: "13:48", itemName: "Bath Towels — Large", type: "Issue", qty: -20, reason: "Floor 3 cleaning cycle", by: "Sunil V." },
  { id: "m2", time: "11:12", itemName: "Mineral Water 500ml", type: "Issue", qty: -48, reason: "Restock minibars", by: "Maria L." },
  { id: "m3", time: "10:30", itemName: "Coffee Beans — Premium", type: "Receive", qty: 25, reason: "PO-2450 received", by: "Fatima A." },
  { id: "m4", time: "Yesterday", itemName: "Shampoo 30ml", type: "Wastage", qty: -12, reason: "Expired stock", by: "Sunil V." },
  { id: "m5", time: "Yesterday", itemName: "Bed Sheets — King", type: "Receive", qty: 80, reason: "PO-2451 received", by: "Fatima A." },
];

const INITIAL_POS: PO[] = [
  { id: "p1", po: "PO-2452", vendor: "Pearl Textiles", items: 2, amount: 7280, date: "Today", status: "Draft" },
  { id: "p2", po: "PO-2451", vendor: "Pearl Textiles", items: 4, amount: 8400, date: "22 May", status: "Received" },
  { id: "p3", po: "PO-2450", vendor: "Stumptown ME", items: 1, amount: 3190, date: "20 May", status: "Received" },
  { id: "p4", po: "PO-2449", vendor: "ChemServ", items: 6, amount: 1850, date: "18 May", status: "Sent" },
];

const WASTAGE_LOG = [
  { id: "w1", date: "Yesterday", item: "Shampoo 30ml", qty: 12, cost: 48, reason: "Expired" },
  { id: "w2", date: "22 May", item: "Mineral Water 500ml", qty: 24, cost: 36, reason: "Broken bottles" },
  { id: "w3", date: "20 May", item: "Bath Towels — Large", qty: 4, cost: 112, reason: "Damaged in laundry" },
  { id: "w4", date: "18 May", item: "Soap Bars 25g", qty: 60, cost: 120, reason: "Discolored stock" },
];

// ============= KITCHEN AMENITIES =============
type KitchenCategory = "Crockery" | "Cookware" | "Cutlery" | "Glassware" | "Appliances" | "Utensils" | "Storage" | "Other";
type KitchenCondition = "New" | "Good" | "Fair" | "Worn";
type KitchenLocation = "Main Kitchen" | "Banquet Kitchen" | "Restaurant" | "Room Service" | "Pantry" | "Bar";

interface KitchenAmenity {
  id: string;
  name: string;
  category: KitchenCategory;
  qty: number;
  unit: string;
  purchaseDate: string;       // ISO date
  purchasePrice: number;      // per unit
  vendor: string;
  condition: KitchenCondition;
  location: KitchenLocation;
  photo?: string;             // dataURL (uploaded) or unicode emoji fallback
  remark?: string;
}

const KITCHEN_EMOJI: Record<KitchenCategory, string> = {
  Crockery: "🍽️", Cookware: "🍳", Cutlery: "🍴", Glassware: "🥂",
  Appliances: "🔌", Utensils: "🥄", Storage: "📦", Other: "🍴",
};

const SEED_KITCHEN: KitchenAmenity[] = [
  { id: "k1",  name: "Dinner Plate 10\" (ceramic)",   category: "Crockery",   qty: 240, unit: "pcs",  purchaseDate: "2025-11-12", purchasePrice: 280,  vendor: "Royal Crockery",  condition: "Good",  location: "Main Kitchen",  photo: "🍽️", remark: "Restaurant + room service set" },
  { id: "k2",  name: "Quarter Plate 7\"",              category: "Crockery",   qty: 180, unit: "pcs",  purchaseDate: "2025-11-12", purchasePrice: 180,  vendor: "Royal Crockery",  condition: "Good",  location: "Main Kitchen",  photo: "🍽️", remark: "Salad / side" },
  { id: "k3",  name: "Soup Bowl 350ml",                category: "Crockery",   qty: 120, unit: "pcs",  purchaseDate: "2025-11-12", purchasePrice: 150,  vendor: "Royal Crockery",  condition: "Good",  location: "Main Kitchen",  photo: "🥣", remark: "Used for soups & dessert" },
  { id: "k4",  name: "Coffee Mug 200ml",               category: "Crockery",   qty: 96,  unit: "pcs",  purchaseDate: "2026-02-08", purchasePrice: 120,  vendor: "Royal Crockery",  condition: "New",   location: "Room Service",  photo: "☕", remark: "In-room tea/coffee tray" },
  { id: "k5",  name: "Tea Cup with Saucer",            category: "Crockery",   qty: 144, unit: "set",  purchaseDate: "2025-08-20", purchasePrice: 220,  vendor: "Royal Crockery",  condition: "Good",  location: "Restaurant",    photo: "🍵", remark: "Breakfast service" },
  { id: "k6",  name: "Stainless Vessel 5L (curry pot)", category: "Cookware",  qty: 8,   unit: "pcs",  purchaseDate: "2025-03-15", purchasePrice: 2800, vendor: "Vasanth Stainless", condition: "Good",  location: "Main Kitchen",  photo: "🍲", remark: "Daily curry prep" },
  { id: "k7",  name: "Iron Tava (heavy-duty)",          category: "Cookware",   qty: 6,   unit: "pcs",  purchaseDate: "2025-05-22", purchasePrice: 1200, vendor: "Vasanth Stainless", condition: "Good",  location: "Main Kitchen",  photo: "🥘", remark: "Roti / dosa" },
  { id: "k8",  name: "Pressure Cooker 10L",             category: "Cookware",   qty: 4,   unit: "pcs",  purchaseDate: "2025-06-10", purchasePrice: 4500, vendor: "Hawkins",         condition: "Good",  location: "Main Kitchen",  photo: "🍲", remark: "Dal + chana boiling" },
  { id: "k9",  name: "Frying Pan 12\" (non-stick)",     category: "Cookware",   qty: 8,   unit: "pcs",  purchaseDate: "2025-09-04", purchasePrice: 1600, vendor: "Prestige Pro",    condition: "Fair",  location: "Main Kitchen",  photo: "🍳", remark: "Egg station, replace 2 coating worn" },
  { id: "k10", name: "Kadhai Heavy-bottom 14\"",        category: "Cookware",   qty: 5,   unit: "pcs",  purchaseDate: "2024-12-20", purchasePrice: 2200, vendor: "Vasanth Stainless", condition: "Good",  location: "Main Kitchen",  photo: "🍳", remark: "Deep frying station" },
  { id: "k11", name: "Dinner Fork",                    category: "Cutlery",    qty: 360, unit: "pcs",  purchaseDate: "2025-04-08", purchasePrice: 60,   vendor: "Jay Kay Steel",    condition: "Good",  location: "Restaurant",    photo: "🍴", remark: "Standard service" },
  { id: "k12", name: "Dinner Knife (serrated)",        category: "Cutlery",    qty: 360, unit: "pcs",  purchaseDate: "2025-04-08", purchasePrice: 70,   vendor: "Jay Kay Steel",    condition: "Good",  location: "Restaurant",    photo: "🔪", remark: "Standard service" },
  { id: "k13", name: "Dinner Spoon",                   category: "Cutlery",    qty: 360, unit: "pcs",  purchaseDate: "2025-04-08", purchasePrice: 55,   vendor: "Jay Kay Steel",    condition: "Good",  location: "Restaurant",    photo: "🥄", remark: "Standard service" },
  { id: "k14", name: "Tea Spoon",                      category: "Cutlery",    qty: 240, unit: "pcs",  purchaseDate: "2025-04-08", purchasePrice: 35,   vendor: "Jay Kay Steel",    condition: "Good",  location: "Restaurant",    photo: "🥄", remark: "Tea / coffee / dessert" },
  { id: "k15", name: "Water Glass 250ml",              category: "Glassware",  qty: 200, unit: "pcs",  purchaseDate: "2025-10-02", purchasePrice: 90,   vendor: "Borosil",          condition: "Good",  location: "Restaurant",    photo: "🥛", remark: "Restaurant + banquet" },
  { id: "k16", name: "Wine Glass (red)",               category: "Glassware",  qty: 72,  unit: "pcs",  purchaseDate: "2025-12-15", purchasePrice: 320,  vendor: "Borosil",          condition: "New",   location: "Bar",           photo: "🍷", remark: "Bar stemware" },
  { id: "k17", name: "Whisky Tumbler",                 category: "Glassware",  qty: 60,  unit: "pcs",  purchaseDate: "2025-12-15", purchasePrice: 240,  vendor: "Borosil",          condition: "Good",  location: "Bar",           photo: "🥃", remark: "Bar service" },
  { id: "k18", name: "Electric Water Kettle 1.5L",     category: "Appliances", qty: 72,  unit: "pcs",  purchaseDate: "2026-01-22", purchasePrice: 1450, vendor: "Bajaj Electricals", condition: "New",   location: "Room Service",  photo: "🫖", remark: "In-room amenity · 1 per room" },
  { id: "k19", name: "Mixer Grinder 750W",             category: "Appliances", qty: 3,   unit: "pcs",  purchaseDate: "2025-07-30", purchasePrice: 6500, vendor: "Bajaj Electricals", condition: "Good",  location: "Main Kitchen",  photo: "🔌", remark: "Wet + dry grinding" },
  { id: "k20", name: "Induction Stove (commercial)",   category: "Appliances", qty: 6,   unit: "pcs",  purchaseDate: "2025-02-18", purchasePrice: 18500,vendor: "Prestige Pro",     condition: "Good",  location: "Main Kitchen",  photo: "🍳", remark: "Replacing LPG · 2 already deployed" },
  { id: "k21", name: "Microwave Oven 30L",             category: "Appliances", qty: 4,   unit: "pcs",  purchaseDate: "2025-05-05", purchasePrice: 14500,vendor: "LG Electronics",   condition: "Good",  location: "Banquet Kitchen", photo: "📡", remark: "Reheating station" },
  { id: "k22", name: "Tea Pot 1.2L (ceramic)",         category: "Crockery",   qty: 24,  unit: "pcs",  purchaseDate: "2025-08-20", purchasePrice: 480,  vendor: "Royal Crockery",   condition: "Good",  location: "Restaurant",    photo: "🫖", remark: "Breakfast & tea service" },
  { id: "k23", name: "Serving Ladle (steel)",          category: "Utensils",   qty: 48,  unit: "pcs",  purchaseDate: "2025-04-08", purchasePrice: 180,  vendor: "Jay Kay Steel",    condition: "Good",  location: "Main Kitchen",  photo: "🥄", remark: "Curry / rice serving" },
  { id: "k24", name: "Tongs (16\")",                   category: "Utensils",   qty: 24,  unit: "pcs",  purchaseDate: "2025-04-08", purchasePrice: 220,  vendor: "Jay Kay Steel",    condition: "Good",  location: "Main Kitchen",  photo: "🥢", remark: "Grill, BBQ, serving" },
  { id: "k25", name: "Chopping Board (color-coded)",   category: "Utensils",   qty: 18,  unit: "set",  purchaseDate: "2025-09-04", purchasePrice: 1800, vendor: "Hygiene Pro",      condition: "Good",  location: "Main Kitchen",  photo: "🪵", remark: "6 colors per HACCP" },
  { id: "k26", name: "Food Storage Container (5L)",    category: "Storage",    qty: 30,  unit: "pcs",  purchaseDate: "2025-10-12", purchasePrice: 320,  vendor: "Tupperware",       condition: "Good",  location: "Pantry",        photo: "📦", remark: "Dry storage" },
  { id: "k27", name: "Serving Tray (32×22cm)",         category: "Utensils",   qty: 36,  unit: "pcs",  purchaseDate: "2025-04-08", purchasePrice: 380,  vendor: "Jay Kay Steel",    condition: "Good",  location: "Room Service",  photo: "🍱", remark: "Room service & breakfast" },
];

const KITCHEN_CATEGORIES: KitchenCategory[] = ["Crockery", "Cookware", "Cutlery", "Glassware", "Appliances", "Utensils", "Storage", "Other"];
const KITCHEN_LOCATIONS: KitchenLocation[] = ["Main Kitchen", "Banquet Kitchen", "Restaurant", "Room Service", "Pantry", "Bar"];
const KITCHEN_CONDITIONS: KitchenCondition[] = ["New", "Good", "Fair", "Worn"];

// ============= ROOM AMENITIES =============
type RoomCategory = "Bedding" | "Bath" | "Furniture" | "Electronics" | "Toiletries" | "Decor" | "Minibar" | "Stationery" | "Other";
type RoomCondition = "New" | "Good" | "Fair" | "Worn";
type RoomLocation = "All Rooms" | "Deluxe Rooms" | "Suite" | "Family Room" | "Standard" | "Presidential" | "Linen Store" | "Maintenance Store";

interface RoomAmenity {
  id: string;
  name: string;
  category: RoomCategory;
  qty: number;
  unit: string;
  purchaseDate: string;
  purchasePrice: number;
  vendor: string;
  condition: RoomCondition;
  location: RoomLocation;
  photo?: string;
  remark?: string;
  perRoom?: number; // standard issue per room
}

const ROOM_EMOJI: Record<RoomCategory, string> = {
  Bedding: "🛏️", Bath: "🛁", Furniture: "🪑", Electronics: "📺",
  Toiletries: "🧴", Decor: "🖼️", Minibar: "🥤", Stationery: "📝", Other: "📦",
};

const SEED_ROOM: RoomAmenity[] = [
  // Bedding
  { id: "r1",  name: "King Bed Sheet (300TC cotton)",   category: "Bedding",     qty: 240, unit: "pcs",  purchaseDate: "2025-11-08", purchasePrice: 850,  vendor: "Pearl Textiles",       condition: "Good",  location: "All Rooms",         photo: "🛏️", remark: "3 sets per room rotation", perRoom: 3 },
  { id: "r2",  name: "Queen Bed Sheet (300TC cotton)",  category: "Bedding",     qty: 180, unit: "pcs",  purchaseDate: "2025-11-08", purchasePrice: 720,  vendor: "Pearl Textiles",       condition: "Good",  location: "All Rooms",         photo: "🛏️", remark: "Twin room sets", perRoom: 3 },
  { id: "r3",  name: "Pillow — Memory Foam",            category: "Bedding",     qty: 192, unit: "pcs",  purchaseDate: "2025-09-22", purchasePrice: 1450, vendor: "Sleepwell",            condition: "Good",  location: "All Rooms",         photo: "🛏️", remark: "2 per room + 1 spare", perRoom: 2 },
  { id: "r4",  name: "Pillow — Down Soft",              category: "Bedding",     qty: 96,  unit: "pcs",  purchaseDate: "2025-09-22", purchasePrice: 1850, vendor: "Sleepwell",            condition: "Good",  location: "Suite",             photo: "🛌", remark: "Suites + VIP rooms", perRoom: 2 },
  { id: "r5",  name: "Duvet — King (microfiber)",       category: "Bedding",     qty: 84,  unit: "pcs",  purchaseDate: "2025-08-14", purchasePrice: 3200, vendor: "Pearl Textiles",       condition: "Good",  location: "All Rooms",         photo: "🛏️", remark: "Winter weight", perRoom: 1 },
  { id: "r6",  name: "Duvet Cover — King",              category: "Bedding",     qty: 168, unit: "pcs",  purchaseDate: "2025-08-14", purchasePrice: 1100, vendor: "Pearl Textiles",       condition: "Good",  location: "All Rooms",         photo: "🛏️", remark: "2 per duvet for rotation", perRoom: 2 },
  { id: "r7",  name: "Pillow Cover — Standard",         category: "Bedding",     qty: 576, unit: "pcs",  purchaseDate: "2025-09-22", purchasePrice: 180,  vendor: "Pearl Textiles",       condition: "Good",  location: "All Rooms",         photo: "🛏️", remark: "3 per pillow rotation", perRoom: 6 },
  { id: "r8",  name: "Mattress Protector (waterproof)", category: "Bedding",     qty: 84,  unit: "pcs",  purchaseDate: "2025-07-30", purchasePrice: 1600, vendor: "Sleepwell",            condition: "New",   location: "All Rooms",         photo: "🛏️", remark: "Bed-bug + spill protection", perRoom: 1 },
  { id: "r9",  name: "Bed Runner (decorative)",         category: "Bedding",     qty: 84,  unit: "pcs",  purchaseDate: "2025-10-12", purchasePrice: 950,  vendor: "Royal Furnishings",    condition: "Good",  location: "All Rooms",         photo: "🛏️", remark: "Foot of bed accent", perRoom: 1 },

  // Bath
  { id: "r10", name: "Bath Towel — Large (600gsm)",     category: "Bath",        qty: 240, unit: "pcs",  purchaseDate: "2025-12-05", purchasePrice: 580,  vendor: "Pearl Textiles",       condition: "Good",  location: "All Rooms",         photo: "🧖", remark: "Hand of guests · 3 per room", perRoom: 3 },
  { id: "r11", name: "Hand Towel",                      category: "Bath",        qty: 240, unit: "pcs",  purchaseDate: "2025-12-05", purchasePrice: 220,  vendor: "Pearl Textiles",       condition: "Good",  location: "All Rooms",         photo: "🤲", remark: "Vanity tray", perRoom: 3 },
  { id: "r12", name: "Face Towel",                      category: "Bath",        qty: 240, unit: "pcs",  purchaseDate: "2025-12-05", purchasePrice: 120,  vendor: "Pearl Textiles",       condition: "Good",  location: "All Rooms",         photo: "🤲", remark: "", perRoom: 3 },
  { id: "r13", name: "Bath Mat (cotton)",               category: "Bath",        qty: 96,  unit: "pcs",  purchaseDate: "2025-12-05", purchasePrice: 380,  vendor: "Pearl Textiles",       condition: "Good",  location: "All Rooms",         photo: "🛁", remark: "1 per bathroom", perRoom: 1 },
  { id: "r14", name: "Bathrobe — Waffle",               category: "Bath",        qty: 60,  unit: "pcs",  purchaseDate: "2025-12-05", purchasePrice: 1850, vendor: "Pearl Textiles",       condition: "Good",  location: "Suite",             photo: "🥋", remark: "Suite & deluxe only", perRoom: 2 },
  { id: "r15", name: "Slippers — Disposable",           category: "Bath",        qty: 480, unit: "pair", purchaseDate: "2026-01-15", purchasePrice: 80,   vendor: "Luxor Amenities",      condition: "New",   location: "Linen Store",       photo: "🥿", remark: "Replenish after each checkout", perRoom: 2 },
  { id: "r16", name: "Shower Cap",                      category: "Bath",        qty: 480, unit: "pcs",  purchaseDate: "2026-01-15", purchasePrice: 12,   vendor: "Luxor Amenities",      condition: "New",   location: "Linen Store",       photo: "🛁", remark: "Bathroom counter", perRoom: 2 },

  // Furniture
  { id: "r17", name: "Bedside Lamp (LED, USB)",         category: "Furniture",   qty: 168, unit: "pcs",  purchaseDate: "2025-06-18", purchasePrice: 1850, vendor: "Bajaj Lighting",       condition: "Good",  location: "All Rooms",         photo: "💡", remark: "Touch dim, USB-C charging", perRoom: 2 },
  { id: "r18", name: "Desk Chair (ergonomic)",          category: "Furniture",   qty: 84,  unit: "pcs",  purchaseDate: "2025-04-20", purchasePrice: 7800, vendor: "Featherlite",          condition: "Good",  location: "All Rooms",         photo: "🪑", remark: "Replace 4 with caster issue", perRoom: 1 },
  { id: "r19", name: "Luggage Rack (folding)",          category: "Furniture",   qty: 84,  unit: "pcs",  purchaseDate: "2025-05-08", purchasePrice: 2400, vendor: "Royal Furnishings",    condition: "Good",  location: "All Rooms",         photo: "🧳", remark: "Beech wood", perRoom: 1 },
  { id: "r20", name: "In-room Safe (digital)",          category: "Furniture",   qty: 84,  unit: "pcs",  purchaseDate: "2024-11-10", purchasePrice: 8500, vendor: "Godrej Safe",          condition: "Good",  location: "All Rooms",         photo: "🔒", remark: "Master override key in mgr office", perRoom: 1 },

  // Electronics
  { id: "r21", name: "Television — 43\" Smart LED",     category: "Electronics", qty: 84,  unit: "pcs",  purchaseDate: "2025-02-14", purchasePrice: 32500,vendor: "LG Electronics",       condition: "Good",  location: "All Rooms",         photo: "📺", remark: "Built-in Chromecast", perRoom: 1 },
  { id: "r22", name: "Television — 55\" (Suite)",       category: "Electronics", qty: 12,  unit: "pcs",  purchaseDate: "2025-02-14", purchasePrice: 52500,vendor: "LG Electronics",       condition: "Good",  location: "Suite",             photo: "📺", remark: "4K · suites only", perRoom: 1 },
  { id: "r23", name: "Hair Dryer — Wall mount 1800W",   category: "Electronics", qty: 84,  unit: "pcs",  purchaseDate: "2025-05-22", purchasePrice: 2200, vendor: "Bajaj Electricals",    condition: "Good",  location: "All Rooms",         photo: "💨", remark: "Mounted in bathroom", perRoom: 1 },
  { id: "r24", name: "Electric Kettle — 1L",            category: "Electronics", qty: 84,  unit: "pcs",  purchaseDate: "2026-01-22", purchasePrice: 1450, vendor: "Bajaj Electricals",    condition: "New",   location: "All Rooms",         photo: "🫖", remark: "Tea/coffee station", perRoom: 1 },
  { id: "r25", name: "Iron + Board (folding)",          category: "Electronics", qty: 84,  unit: "set",  purchaseDate: "2025-08-30", purchasePrice: 2850, vendor: "Bajaj Electricals",    condition: "Good",  location: "All Rooms",         photo: "👔", remark: "Steam iron + folding board", perRoom: 1 },
  { id: "r26", name: "Phone — IP Desk Phone",           category: "Electronics", qty: 84,  unit: "pcs",  purchaseDate: "2024-09-12", purchasePrice: 4200, vendor: "Cisco",                condition: "Good",  location: "All Rooms",         photo: "📞", remark: "VoIP · ext + concierge dial-0", perRoom: 1 },
  { id: "r27", name: "Alarm Clock with USB charger",    category: "Electronics", qty: 84,  unit: "pcs",  purchaseDate: "2025-10-05", purchasePrice: 1100, vendor: "Bajaj Electricals",    condition: "Good",  location: "All Rooms",         photo: "⏰", remark: "Bedside · USB-A + USB-C", perRoom: 1 },

  // Toiletries kits (dispensers/holders)
  { id: "r28", name: "Soap Dispenser (wall)",           category: "Toiletries",  qty: 168, unit: "pcs",  purchaseDate: "2025-07-15", purchasePrice: 480,  vendor: "Luxor Amenities",      condition: "Good",  location: "All Rooms",         photo: "🧼", remark: "2 per bathroom (basin + shower)", perRoom: 2 },
  { id: "r29", name: "Tissue Box Cover (ceramic)",      category: "Toiletries",  qty: 96,  unit: "pcs",  purchaseDate: "2025-09-10", purchasePrice: 380,  vendor: "Royal Furnishings",    condition: "Good",  location: "All Rooms",         photo: "🧻", remark: "Replace damaged 6", perRoom: 1 },

  // Decor
  { id: "r30", name: "Blackout Curtain — Double layer", category: "Decor",       qty: 168, unit: "pcs",  purchaseDate: "2024-12-20", purchasePrice: 4200, vendor: "Royal Furnishings",    condition: "Good",  location: "All Rooms",         photo: "🪟", remark: "2 per window x 1 window/room", perRoom: 2 },
  { id: "r31", name: "Sheer Curtain (linen)",           category: "Decor",       qty: 168, unit: "pcs",  purchaseDate: "2024-12-20", purchasePrice: 1800, vendor: "Royal Furnishings",    condition: "Good",  location: "All Rooms",         photo: "🪟", remark: "Under blackout layer", perRoom: 2 },
  { id: "r32", name: "Bedside Rug (3×5 ft)",            category: "Decor",       qty: 168, unit: "pcs",  purchaseDate: "2025-01-25", purchasePrice: 2400, vendor: "Carpet Co. Mumbai",    condition: "Fair",  location: "All Rooms",         photo: "🟫", remark: "12 showing wear · plan replacement", perRoom: 2 },
  { id: "r33", name: "Wall Art (framed prints)",        category: "Decor",       qty: 168, unit: "pcs",  purchaseDate: "2024-08-30", purchasePrice: 1850, vendor: "Mumbai Frames",        condition: "Good",  location: "All Rooms",         photo: "🖼️", remark: "Curated set · 2 per room", perRoom: 2 },

  // Minibar
  { id: "r34", name: "Minibar Fridge (40L)",            category: "Minibar",     qty: 84,  unit: "pcs",  purchaseDate: "2024-10-12", purchasePrice: 9800, vendor: "Godrej",               condition: "Good",  location: "All Rooms",         photo: "🧊", remark: "Inside cabinetry", perRoom: 1 },
  { id: "r35", name: "Coffee/Tea Tray (welcome set)",   category: "Minibar",     qty: 84,  unit: "set",  purchaseDate: "2025-06-08", purchasePrice: 1450, vendor: "Royal Crockery",       condition: "Good",  location: "All Rooms",         photo: "☕", remark: "Tray + jars + spoons + napkin", perRoom: 1 },

  // Stationery
  { id: "r36", name: "Stationery Folder (welcome)",     category: "Stationery",  qty: 84,  unit: "pcs",  purchaseDate: "2025-03-18", purchasePrice: 850,  vendor: "Pearl Press",          condition: "Good",  location: "All Rooms",         photo: "📓", remark: "Letterhead, envelopes, pen, pad", perRoom: 1 },
  { id: "r37", name: "Hotel Pen (branded)",             category: "Stationery",  qty: 600, unit: "pcs",  purchaseDate: "2025-11-02", purchasePrice: 24,   vendor: "Pearl Press",          condition: "New",   location: "All Rooms",         photo: "🖊️", remark: "Replenish per checkout · take-home", perRoom: 2 },
  { id: "r38", name: "Notepad (50 sheets)",             category: "Stationery",  qty: 240, unit: "pcs",  purchaseDate: "2025-11-02", purchasePrice: 45,   vendor: "Pearl Press",          condition: "New",   location: "All Rooms",         photo: "📝", remark: "Replenish weekly", perRoom: 1 },
];

const ROOM_CATEGORIES: RoomCategory[] = ["Bedding", "Bath", "Furniture", "Electronics", "Toiletries", "Decor", "Minibar", "Stationery", "Other"];
const ROOM_LOCATIONS: RoomLocation[] = ["All Rooms", "Deluxe Rooms", "Suite", "Family Room", "Standard", "Presidential", "Linen Store", "Maintenance Store"];
const ROOM_CONDITIONS: RoomCondition[] = ["New", "Good", "Fair", "Worn"];

// ============= PURCHASES =============
type PurchaseCategory =
  | "Vegetables" | "Fruits" | "Non-veg (Meat / Fish)" | "Dairy & Eggs" | "Dry Groceries"
  | "Spices & Condiments" | "Beverages" | "Bakery" | "Frozen Items"
  | "Room Amenities" | "Kitchen Amenities" | "Office Equipment" | "IT Equipment"
  | "Cleaning Supplies" | "Toiletries" | "Linen" | "Stationery"
  | "Maintenance Supplies" | "Marketing Materials" | "Uniforms" | "Other";

type PurchasePaymentStatus = "Paid" | "Partial" | "Unpaid" | "On Credit";
type PurchaseQC = "Accepted" | "Partially Rejected" | "Rejected" | "Pending QC";
type PurchaseDept = "Kitchen" | "Restaurant" | "Bar" | "Banquet Kitchen" | "Housekeeping" | "Front Office" | "Maintenance" | "IT" | "Admin" | "F&B Store" | "General Store";
type PurchaseStorage = "Main Pantry" | "Cold Storage" | "Freezer" | "Dry Store" | "Kitchen Prep" | "Bar Storage" | "Housekeeping Store" | "Linen Store" | "Maintenance Store" | "Office" | "Room Ready";

interface PurchaseLine {
  id: string;
  item: string;
  unit: string;
  qty: number;
  rate: number;
  gstPct: number;
  taxable: number;
  tax: number;
  amount: number;
}

interface Purchase {
  id: string;
  date: string;                   // ISO date of receipt
  billNo: string;
  billDate: string;               // ISO
  vendor: string;
  vendorGstin?: string;
  vendorPan?: string;
  vendorPhone?: string;
  category: PurchaseCategory;
  department: PurchaseDept;
  lines: PurchaseLine[];
  discount: number;
  freight: number;
  roundOff: number;
  interState: boolean;            // toggles CGST+SGST vs IGST
  paymentStatus: PurchasePaymentStatus;
  paymentMode?: string;
  paymentDate?: string;
  paymentRef?: string;
  paidAmount: number;
  receivedBy: string;
  qcStatus: PurchaseQC;
  storage: PurchaseStorage;
  billPhoto?: string;             // dataURL
  goodsPhotos?: string[];         // dataURLs
  notes?: string;
}

const PURCHASE_CATEGORIES: PurchaseCategory[] = [
  "Vegetables", "Fruits", "Non-veg (Meat / Fish)", "Dairy & Eggs", "Dry Groceries",
  "Spices & Condiments", "Beverages", "Bakery", "Frozen Items",
  "Room Amenities", "Kitchen Amenities", "Office Equipment", "IT Equipment",
  "Cleaning Supplies", "Toiletries", "Linen", "Stationery",
  "Maintenance Supplies", "Marketing Materials", "Uniforms", "Other",
];

const PURCHASE_CATEGORY_EMOJI: Record<PurchaseCategory, string> = {
  "Vegetables": "🥦", "Fruits": "🍎", "Non-veg (Meat / Fish)": "🍗", "Dairy & Eggs": "🥛",
  "Dry Groceries": "🌾", "Spices & Condiments": "🌶️", "Beverages": "🥤", "Bakery": "🥐",
  "Frozen Items": "🧊", "Room Amenities": "🛏️", "Kitchen Amenities": "🍽️",
  "Office Equipment": "🖨️", "IT Equipment": "💻", "Cleaning Supplies": "🧽",
  "Toiletries": "🧴", "Linen": "🧺", "Stationery": "📎", "Maintenance Supplies": "🔧",
  "Marketing Materials": "📢", "Uniforms": "👔", "Other": "📦",
};

const PURCHASE_UNITS = ["kg", "g", "litre", "ml", "pcs", "doz", "box", "packet", "bag", "bottle", "tin", "set", "pair", "meter", "bunch", "tray"];
const PURCHASE_DEPTS: PurchaseDept[] = ["Kitchen", "Restaurant", "Bar", "Banquet Kitchen", "Housekeeping", "Front Office", "Maintenance", "IT", "Admin", "F&B Store", "General Store"];
const PURCHASE_STORAGES: PurchaseStorage[] = ["Main Pantry", "Cold Storage", "Freezer", "Dry Store", "Kitchen Prep", "Bar Storage", "Housekeeping Store", "Linen Store", "Maintenance Store", "Office", "Room Ready"];
const PURCHASE_PAYMENT_STATUSES: PurchasePaymentStatus[] = ["Paid", "Partial", "Unpaid", "On Credit"];
const PURCHASE_QC_STATUSES: PurchaseQC[] = ["Accepted", "Partially Rejected", "Rejected", "Pending QC"];

// Helper to make blank line + totals
const newPurchaseLine = (): PurchaseLine => ({
  id: `pl-${Math.random().toString(36).slice(2, 9)}`,
  item: "", unit: "kg", qty: 1, rate: 0, gstPct: 0, taxable: 0, tax: 0, amount: 0,
});

// Compute totals helper
function purchaseTotals(p: Pick<Purchase, "lines" | "discount" | "freight" | "roundOff" | "interState">) {
  const taxableTotal = p.lines.reduce((t, l) => t + l.taxable, 0);
  const taxTotal = p.lines.reduce((t, l) => t + l.tax, 0);
  const cgst = p.interState ? 0 : taxTotal / 2;
  const sgst = p.interState ? 0 : taxTotal / 2;
  const igst = p.interState ? taxTotal : 0;
  const subTotal = taxableTotal + taxTotal;
  const grandTotal = subTotal - p.discount + p.freight + p.roundOff;
  return { taxableTotal, taxTotal, cgst, sgst, igst, subTotal, grandTotal };
}

const SEED_PURCHASES: Purchase[] = [
  {
    id: "pur1", date: "2026-05-24", billNo: "VEG-24-557", billDate: "2026-05-24",
    vendor: "Crawford Market Vendor — Suresh", vendorGstin: "", vendorPan: "", vendorPhone: "+91 98201 23456",
    category: "Vegetables", department: "Kitchen",
    lines: [
      { id: "l1", item: "Onion (red)",    unit: "kg",    qty: 25, rate: 32, gstPct: 0, taxable: 800,  tax: 0, amount: 800 },
      { id: "l2", item: "Tomato",         unit: "kg",    qty: 15, rate: 28, gstPct: 0, taxable: 420,  tax: 0, amount: 420 },
      { id: "l3", item: "Potato",         unit: "kg",    qty: 30, rate: 22, gstPct: 0, taxable: 660,  tax: 0, amount: 660 },
      { id: "l4", item: "Coriander",      unit: "bunch", qty: 20, rate: 12, gstPct: 0, taxable: 240,  tax: 0, amount: 240 },
      { id: "l5", item: "Green chilli",   unit: "kg",    qty: 3,  rate: 80, gstPct: 0, taxable: 240,  tax: 0, amount: 240 },
      { id: "l6", item: "Lemon",          unit: "kg",    qty: 5,  rate: 60, gstPct: 0, taxable: 300,  tax: 0, amount: 300 },
    ],
    discount: 0, freight: 0, roundOff: 0, interState: false,
    paymentStatus: "Paid", paymentMode: "Cash", paymentDate: "2026-05-24", paymentRef: "RCP-1142", paidAmount: 2660,
    receivedBy: "Chef Joseph D.", qcStatus: "Accepted", storage: "Cold Storage",
    notes: "Daily morning purchase · all fresh stock",
  },
  {
    id: "pur2", date: "2026-05-24", billNo: "NV-25-441", billDate: "2026-05-24",
    vendor: "Al-Mansoor Chicken Supply", vendorGstin: "27ABFCM1234A1Z3", vendorPan: "ABFCM1234A", vendorPhone: "+91 99876 12345",
    category: "Non-veg (Meat / Fish)", department: "Kitchen",
    lines: [
      { id: "l1", item: "Chicken Boneless (1.2kg/pc)", unit: "kg", qty: 24, rate: 320, gstPct: 0, taxable: 7680,  tax: 0,    amount: 7680 },
      { id: "l2", item: "Mutton (curry cut)",          unit: "kg", qty: 8,  rate: 720, gstPct: 0, taxable: 5760,  tax: 0,    amount: 5760 },
      { id: "l3", item: "Pomfret (medium)",            unit: "kg", qty: 5,  rate: 850, gstPct: 0, taxable: 4250,  tax: 0,    amount: 4250 },
    ],
    discount: 0, freight: 0, roundOff: 0, interState: false,
    paymentStatus: "Paid", paymentMode: "UPI", paymentDate: "2026-05-24", paymentRef: "240524AB7741", paidAmount: 17690,
    receivedBy: "Chef Joseph D.", qcStatus: "Accepted", storage: "Freezer",
    notes: "Temperature checked at receipt · 4°C ✓ · 30-day frozen stock",
  },
  {
    id: "pur3", date: "2026-05-23", billNo: "DAI-23-2188", billDate: "2026-05-23",
    vendor: "Amul Dairy Distributor", vendorGstin: "27AAACG1234B1Z9", vendorPan: "AAACG1234B", vendorPhone: "+91 22 6669 8800",
    category: "Dairy & Eggs", department: "Kitchen",
    lines: [
      { id: "l1", item: "Milk (toned, 1L)",      unit: "litre", qty: 80, rate: 64,  gstPct: 0, taxable: 5120, tax: 0, amount: 5120 },
      { id: "l2", item: "Curd (5kg tub)",         unit: "tin",   qty: 8,  rate: 380, gstPct: 0, taxable: 3040, tax: 0, amount: 3040 },
      { id: "l3", item: "Paneer (fresh)",         unit: "kg",    qty: 6,  rate: 380, gstPct: 5, taxable: 2280, tax: 114, amount: 2394 },
      { id: "l4", item: "Egg (tray of 30)",       unit: "tray",  qty: 10, rate: 240, gstPct: 0, taxable: 2400, tax: 0,   amount: 2400 },
      { id: "l5", item: "Amul butter (500g)",     unit: "pcs",   qty: 12, rate: 285, gstPct: 12,taxable: 3420, tax: 410, amount: 3830 },
    ],
    discount: 100, freight: 0, roundOff: -4, interState: false,
    paymentStatus: "On Credit", paymentMode: "Credit (30 days)", paidAmount: 0,
    receivedBy: "Chef Joseph D.", qcStatus: "Accepted", storage: "Cold Storage",
    notes: "Credit period 30 days · vendor approved",
  },
  {
    id: "pur4", date: "2026-05-22", billNo: "GRO-MAY-2241", billDate: "2026-05-22",
    vendor: "ABC Wholesale Grains", vendorGstin: "27AABCA1234C1Z5", vendorPan: "AABCA1234C", vendorPhone: "+91 22 6789 1100",
    category: "Dry Groceries", department: "Kitchen",
    lines: [
      { id: "l1", item: "Basmati Rice (10kg bag)",    unit: "bag", qty: 12, rate: 1850, gstPct: 5,  taxable: 22200, tax: 1110, amount: 23310 },
      { id: "l2", item: "Toor Dal",                    unit: "kg",  qty: 20, rate: 180,  gstPct: 0,  taxable: 3600,  tax: 0,    amount: 3600 },
      { id: "l3", item: "Wheat Atta (10kg bag)",       unit: "bag", qty: 8,  rate: 480,  gstPct: 0,  taxable: 3840,  tax: 0,    amount: 3840 },
      { id: "l4", item: "Sugar",                       unit: "kg",  qty: 50, rate: 48,   gstPct: 5,  taxable: 2400,  tax: 120,  amount: 2520 },
      { id: "l5", item: "Refined Oil (15L tin)",       unit: "tin", qty: 4,  rate: 1850, gstPct: 5,  taxable: 7400,  tax: 370,  amount: 7770 },
    ],
    discount: 250, freight: 200, roundOff: 0, interState: false,
    paymentStatus: "Paid", paymentMode: "NEFT", paymentDate: "2026-05-22", paymentRef: "HDFCN52522001", paidAmount: 40790,
    receivedBy: "Store · Sunil V.", qcStatus: "Accepted", storage: "Dry Store",
    notes: "Monthly bulk · GRN # GRN-2026-051 attached",
  },
  {
    id: "pur5", date: "2026-05-20", billNo: "ABC-2426", billDate: "2026-05-20",
    vendor: "ABC Linens Pvt", vendorGstin: "27ABCDE1234F1Z5", vendorPan: "ABCDE1234F", vendorPhone: "+91 22 4567 8900",
    category: "Linen", department: "Housekeeping",
    lines: [
      { id: "l1", item: "Bath Towel — Large (600gsm)", unit: "pcs", qty: 60, rate: 580, gstPct: 18, taxable: 34800, tax: 6264, amount: 41064 },
      { id: "l2", item: "Bed Sheet — King (300TC)",     unit: "pcs", qty: 24, rate: 850, gstPct: 18, taxable: 20400, tax: 3672, amount: 24072 },
      { id: "l3", item: "Pillow Cover Standard",        unit: "pcs", qty: 96, rate: 180, gstPct: 18, taxable: 17280, tax: 3110, amount: 20390 },
    ],
    discount: 1500, freight: 350, roundOff: -2, interState: false,
    paymentStatus: "Partial", paymentMode: "Cheque", paymentDate: "2026-05-20", paymentRef: "412580", paidAmount: 50000,
    receivedBy: "HK Manager · Maria L.", qcStatus: "Accepted", storage: "Linen Store",
    notes: "Cheque ₹50,000 advance · balance Net 30",
  },
  {
    id: "pur6", date: "2026-05-18", billNo: "TC-1101", billDate: "2026-05-18",
    vendor: "TechCorp IT Services", vendorGstin: "27TECHC1234E1Z1", vendorPan: "TECHC1234E", vendorPhone: "+91 80 2233 4455",
    category: "IT Equipment", department: "IT",
    lines: [
      { id: "l1", item: "Wireless Access Point (Cisco)", unit: "pcs", qty: 6, rate: 18500, gstPct: 18, taxable: 111000, tax: 19980, amount: 130980 },
      { id: "l2", item: "Network switch 24-port",        unit: "pcs", qty: 2, rate: 9500,  gstPct: 18, taxable: 19000,  tax: 3420,  amount: 22420 },
    ],
    discount: 0, freight: 0, roundOff: 0, interState: false,
    paymentStatus: "Unpaid", paymentMode: "Pending", paidAmount: 0,
    receivedBy: "IT · Aman S.", qcStatus: "Accepted", storage: "Maintenance Store",
    notes: "Net 30 · invoice goes to accounts",
  },
  {
    id: "pur7", date: "2026-05-15", billNo: "OFC-15-901", billDate: "2026-05-15",
    vendor: "Pearl Office Solutions", vendorGstin: "27PEARL1234O1Z2", vendorPan: "PEARL1234O", vendorPhone: "+91 22 4444 1212",
    category: "Office Equipment", department: "Front Office",
    lines: [
      { id: "l1", item: "Front-office computer monitor (24\")", unit: "pcs", qty: 3, rate: 12500, gstPct: 18, taxable: 37500, tax: 6750, amount: 44250 },
      { id: "l2", item: "Office chair (mesh ergo)",             unit: "pcs", qty: 4, rate: 7800,  gstPct: 18, taxable: 31200, tax: 5616, amount: 36816 },
      { id: "l3", item: "Stapler heavy-duty + clips",            unit: "set", qty: 6, rate: 480,   gstPct: 18, taxable: 2880,  tax: 518,  amount: 3398 },
    ],
    discount: 500, freight: 0, roundOff: 0, interState: false,
    paymentStatus: "Paid", paymentMode: "NEFT", paymentDate: "2026-05-16", paymentRef: "HDFCN51616044", paidAmount: 83964,
    receivedBy: "Admin · Reena T.", qcStatus: "Accepted", storage: "Office",
    notes: "Annual office refresh · approved by Owner",
  },
];

export default function InventoryPage() {
  const [tab, setTab] = React.useState<TabId>("items");
  const [items, setItems] = React.useState<Item[]>(INVENTORY_ITEMS);
  const [movements, setMovements] = React.useState<Movement[]>(INITIAL_MOVEMENTS);
  const [pos] = React.useState<PO[]>(INITIAL_POS);

  // Filters
  const [search, setSearch] = React.useState("");
  const [cat, setCat] = React.useState<string>("all");
  const [vendor, setVendor] = React.useState<string>("all");
  const [stockFilter, setStockFilter] = React.useState<"all" | "low" | "ok">("all");

  // Modals
  const [adjustItem, setAdjustItem] = React.useState<Item | null>(null);
  const [viewItem, setViewItem] = React.useState<Item | null>(null);
  const [editItem, setEditItem] = React.useState<Item | null>(null);
  const [showAdd, setShowAdd] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);

  // Kitchen amenities
  const [kitchen, setKitchen] = React.useState<KitchenAmenity[]>(SEED_KITCHEN);
  const [kSearch, setKSearch] = React.useState("");
  const [kCat, setKCat] = React.useState<"all" | KitchenCategory>("all");
  const [kLoc, setKLoc] = React.useState<"all" | KitchenLocation>("all");
  const [kCond, setKCond] = React.useState<"all" | KitchenCondition>("all");
  const [editKitchen, setEditKitchen] = React.useState<KitchenAmenity | "new" | null>(null);

  // Room amenities
  const [roomAm, setRoomAm] = React.useState<RoomAmenity[]>(SEED_ROOM);
  const [rSearch, setRSearch] = React.useState("");
  const [rCat, setRCat] = React.useState<"all" | RoomCategory>("all");
  const [rLoc, setRLoc] = React.useState<"all" | RoomLocation>("all");
  const [rCond, setRCond] = React.useState<"all" | RoomCondition>("all");
  const [editRoom, setEditRoom] = React.useState<RoomAmenity | "new" | null>(null);

  // Shared grid/list view mode for amenity tabs
  const [amenityView, setAmenityView] = React.useState<"grid" | "list">("grid");

  // Purchases
  const [purchases, setPurchases] = React.useState<Purchase[]>(SEED_PURCHASES);
  const [pSearch, setPSearch] = React.useState("");
  const [pCat, setPCat] = React.useState<"all" | PurchaseCategory>("all");
  const [pDept, setPDept] = React.useState<"all" | PurchaseDept>("all");
  const [pPayStatus, setPPayStatus] = React.useState<"all" | PurchasePaymentStatus>("all");
  const [pFromDate, setPFromDate] = React.useState("2026-05-01");
  const [pToDate, setPToDate] = React.useState("2026-05-31");
  const [editPurchase, setEditPurchase] = React.useState<Purchase | "new" | null>(null);
  const [viewPurchase, setViewPurchase] = React.useState<Purchase | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2200); };

  const categories = Array.from(new Set(items.map(i => i.cat)));
  const vendors = Array.from(new Set(items.map(i => i.vendor)));

  const filtered = items.filter(i => {
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (cat !== "all" && i.cat !== cat) return false;
    if (vendor !== "all" && i.vendor !== vendor) return false;
    if (stockFilter === "low" && i.qty >= i.min) return false;
    if (stockFilter === "ok" && i.qty < i.min) return false;
    return true;
  });

  const lowStock = items.filter(i => i.qty < i.min);
  const totalValue = items.reduce((s, i) => s + i.qty * i.price, 0);

  const handleAdjust = (delta: number, type: Movement["type"], reason: string) => {
    if (!adjustItem) return;
    setItems(prev => prev.map(it => it.id === adjustItem.id ? { ...it, qty: Math.max(0, it.qty + delta) } : it));
    setMovements(prev => [
      { id: `m${Date.now()}`, time: "Just now", itemName: adjustItem.name, type, qty: delta, reason, by: "Khalid R." },
      ...prev,
    ]);
    setAdjustItem(null);
    showToast(`${adjustItem.name}: ${delta > 0 ? "+" : ""}${delta} ${adjustItem.unit}`);
  };

  const handleAddItem = (data: Omit<Item, "id">) => {
    const newItem: Item = { ...data, id: `i${Date.now()}` };
    setItems(prev => [...prev, newItem]);
    setShowAdd(false);
    showToast(`Added "${newItem.name}" to inventory`);
  };

  const handleEditItem = (data: Omit<Item, "id">) => {
    if (!editItem) return;
    setItems(prev => prev.map(x => x.id === editItem.id ? { ...x, ...data } : x));
    setEditItem(null);
    showToast(`Updated "${data.name}"`);
  };

  const handleDeleteItem = (item: Item) => {
    if (!window.confirm(`Delete "${item.name}" from inventory? This cannot be undone.`)) return;
    setItems(prev => prev.filter(x => x.id !== item.id));
    showToast(`Deleted "${item.name}"`);
  };

  const generateReorder = () => {
    showToast(`Re-order suggestions sent to ${new Set(lowStock.map(i => i.vendor)).size} vendor${new Set(lowStock.map(i => i.vendor)).size === 1 ? "" : "s"}`);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-medium tracking-tight">Inventory</h1>
          <p className="text-muted-foreground text-sm mt-1">Stock items, low-stock alerts, purchases &amp; movements</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><FileDown className="h-4 w-4" />Export</Button>
          <Button onClick={() => setShowAdd(true)}><Plus className="h-4 w-4" />Add Item</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard label="Total Items" value={items.length} icon={Boxes} accent="brand" />
        <KPICard label="Low Stock" value={lowStock.length} icon={AlertCircle} accent="danger" hint="Below min" />
        <KPICard label="Stock Value" value={money(totalValue)} icon={Package} accent="success" />
        <KPICard label="Open POs" value={pos.filter(p => p.status === "Sent" || p.status === "Draft").length} icon={ShoppingCart} accent="info" />
      </div>

      {/* Low stock alert (only on Items tab) */}
      {tab === "items" && lowStock.length > 0 && (
        <Card className="p-4 border-l-4 border-l-danger">
          <div className="flex items-start gap-3">
            <span className="h-9 w-9 rounded-md bg-danger-soft text-danger flex items-center justify-center shrink-0">
              <TrendingDown className="h-4 w-4" />
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-medium">{lowStock.length} items below minimum stock</p>
                <Badge tone="danger">action needed</Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-2">AI re-order suggestion ready · {new Set(lowStock.map(i => i.vendor)).size} vendor{new Set(lowStock.map(i => i.vendor)).size === 1 ? "" : "s"} will be contacted.</p>
              <div className="flex flex-wrap gap-1.5">
                {lowStock.map(i => (
                  <Badge key={i.id} tone="warning">{i.name} ({i.qty}/{i.min})</Badge>
                ))}
              </div>
            </div>
            <Button size="sm" variant="success" onClick={generateReorder}>Generate Re-order</Button>
          </div>
        </Card>
      )}

      {/* Tabs */}
      <div className="border-b border-border flex items-center gap-1 overflow-x-auto">
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

      {/* ITEMS */}
      {tab === "items" && (
        <>
          <Card className="p-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle-foreground" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items…" className="pl-9 h-9" />
              </div>
              <Select value={cat} onChange={e => setCat(e.target.value)} className="h-9 w-auto">
                <option value="all">All categories</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </Select>
              <Select value={vendor} onChange={e => setVendor(e.target.value)} className="h-9 w-auto">
                <option value="all">All vendors</option>
                {vendors.map(v => <option key={v} value={v}>{v}</option>)}
              </Select>
              <Select value={stockFilter} onChange={e => setStockFilter(e.target.value as "all" | "low" | "ok")} className="h-9 w-auto">
                <option value="all">Stock: All</option>
                <option value="low">Low only</option>
                <option value="ok">In stock only</option>
              </Select>
              {(search || cat !== "all" || vendor !== "all" || stockFilter !== "all") && (
                <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setCat("all"); setVendor("all"); setStockFilter("all"); }}>Clear</Button>
              )}
            </div>
          </Card>

          <div className="text-xs text-muted-foreground">Showing {filtered.length} of {items.length} items</div>

          <Card className="p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface-elevated border-b border-border">
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 font-semibold">Item</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold">Vendor</th>
                  <th className="px-4 py-3 font-semibold text-right">Stock</th>
                  <th className="px-4 py-3 font-semibold text-right">Min</th>
                  <th className="px-4 py-3 font-semibold">Level</th>
                  <th className="px-4 py-3 font-semibold text-right">Unit Price</th>
                  <th className="px-4 py-3 font-semibold">Last Purchase</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(i => {
                  const pct = Math.min(100, (i.qty / (i.min * 2)) * 100);
                  const low = i.qty < i.min;
                  return (
                    <tr key={i.id} className={cn("hover:bg-surface-sunken/50 transition-colors", low && "bg-danger-soft/40")}>
                      <td className="px-4 py-3 font-medium">{i.name}</td>
                      <td className="px-4 py-3"><Badge tone="neutral">{i.cat}</Badge></td>
                      <td className="px-4 py-3 text-muted-foreground">{i.vendor}</td>
                      <td className={cn("px-4 py-3 text-right tabular font-semibold", low ? "text-danger" : "text-foreground")}>
                        {i.qty} <span className="text-xs text-muted-foreground font-normal">{i.unit}</span>
                      </td>
                      <td className="px-4 py-3 text-right tabular text-muted-foreground">{i.min}</td>
                      <td className="px-4 py-3">
                        <div className="h-1.5 w-24 bg-surface-sunken rounded-full overflow-hidden">
                          <div className={cn("h-full", low ? "bg-danger" : pct > 75 ? "bg-success" : "bg-warning")} style={{ width: `${pct}%` }} />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right tabular">{money(i.price)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{i.lastPurchase}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-1">
                          <button type="button" onClick={() => setViewItem(i)} className="h-7 w-7 rounded-md border border-border hover:bg-surface-sunken inline-flex items-center justify-center text-muted-foreground transition-colors" title="View detail">
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" onClick={() => setEditItem(i)} className="h-7 w-7 rounded-md border border-border hover:bg-surface-sunken inline-flex items-center justify-center text-muted-foreground transition-colors" title="Edit">
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" onClick={() => setAdjustItem(i)} className="h-7 px-2 rounded-md border border-border hover:bg-info hover:text-white hover:border-info text-xs font-medium text-muted-foreground transition-colors" title="Adjust stock">
                            <RotateCw className="h-3 w-3 inline" /> Adjust
                          </button>
                          <button type="button" onClick={() => handleDeleteItem(i)} className="h-7 w-7 rounded-md border border-border hover:bg-danger-soft hover:text-danger hover:border-danger inline-flex items-center justify-center text-muted-foreground transition-colors" title="Delete">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-muted-foreground">No items match your filters.</td></tr>
                )}
              </tbody>
            </table>
          </Card>
        </>
      )}

      {/* MOVEMENTS */}
      {tab === "movements" && (
        <Card className="p-0 overflow-hidden">
          <CardHeader className="bg-surface-elevated"><CardTitle>Recent Stock Movements</CardTitle></CardHeader>
          <table className="w-full text-sm">
            <thead className="bg-surface-sunken/50 border-y border-border">
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-2.5 font-semibold">Time</th>
                <th className="px-5 py-2.5 font-semibold">Item</th>
                <th className="px-5 py-2.5 font-semibold">Type</th>
                <th className="px-5 py-2.5 font-semibold text-right">Qty</th>
                <th className="px-5 py-2.5 font-semibold">Reason</th>
                <th className="px-5 py-2.5 font-semibold">By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {movements.map(m => (
                <tr key={m.id} className="hover:bg-surface-sunken/40">
                  <td className="px-5 py-3 text-muted-foreground tabular">{m.time}</td>
                  <td className="px-5 py-3 font-medium">{m.itemName}</td>
                  <td className="px-5 py-3">
                    <Badge tone={m.type === "Receive" ? "success" : m.type === "Issue" ? "info" : m.type === "Wastage" ? "danger" : "warning"}>
                      {m.type}
                    </Badge>
                  </td>
                  <td className={cn("px-5 py-3 text-right tabular font-semibold inline-flex items-center justify-end gap-0.5 w-full",
                    m.qty > 0 ? "text-success" : "text-warning"
                  )}>
                    {m.qty > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                    {Math.abs(m.qty)}
                  </td>
                  <td className="px-5 py-3 text-xs text-muted-foreground">{m.reason}</td>
                  <td className="px-5 py-3 text-xs">{m.by}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* PURCHASE ORDERS */}
      {tab === "pos" && (
        <Card className="p-0 overflow-hidden">
          <CardHeader className="bg-surface-elevated">
            <div className="flex items-center justify-between">
              <CardTitle>Purchase Orders</CardTitle>
              <Button size="sm"><Plus className="h-3.5 w-3.5" />New PO</Button>
            </div>
          </CardHeader>
          <table className="w-full text-sm">
            <thead className="bg-surface-sunken/50 border-y border-border">
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-2.5 font-semibold">PO #</th>
                <th className="px-5 py-2.5 font-semibold">Vendor</th>
                <th className="px-5 py-2.5 font-semibold text-right">Items</th>
                <th className="px-5 py-2.5 font-semibold text-right">Amount</th>
                <th className="px-5 py-2.5 font-semibold">Date</th>
                <th className="px-5 py-2.5 font-semibold">Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pos.map(p => (
                <tr key={p.id} className="hover:bg-surface-sunken/40">
                  <td className="px-5 py-3 font-medium tabular">{p.po}</td>
                  <td className="px-5 py-3">{p.vendor}</td>
                  <td className="px-5 py-3 text-right tabular">{p.items}</td>
                  <td className="px-5 py-3 text-right tabular font-medium">{money(p.amount)}</td>
                  <td className="px-5 py-3 text-muted-foreground">{p.date}</td>
                  <td className="px-5 py-3">
                    <Badge tone={p.status === "Received" ? "success" : p.status === "Sent" ? "info" : p.status === "Draft" ? "neutral" : "danger"}>{p.status}</Badge>
                  </td>
                  <td className="px-5 py-3 text-right"><Button variant="ghost" size="sm">Open<ChevronRight className="h-3 w-3" /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* WASTAGE */}
      {tab === "wastage" && (
        <Card className="p-0 overflow-hidden">
          <CardHeader className="bg-surface-elevated">
            <CardTitle>Wastage Log</CardTitle>
          </CardHeader>
          <table className="w-full text-sm">
            <thead className="bg-surface-sunken/50 border-y border-border">
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-2.5 font-semibold">Date</th>
                <th className="px-5 py-2.5 font-semibold">Item</th>
                <th className="px-5 py-2.5 font-semibold text-right">Qty</th>
                <th className="px-5 py-2.5 font-semibold text-right">Cost</th>
                <th className="px-5 py-2.5 font-semibold">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {WASTAGE_LOG.map(w => (
                <tr key={w.id}>
                  <td className="px-5 py-3 text-muted-foreground">{w.date}</td>
                  <td className="px-5 py-3 font-medium">{w.item}</td>
                  <td className="px-5 py-3 text-right tabular">{w.qty}</td>
                  <td className="px-5 py-3 text-right tabular text-danger font-medium">{money(w.cost)}</td>
                  <td className="px-5 py-3 text-xs text-muted-foreground">{w.reason}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-surface-elevated border-t border-border">
              <tr>
                <td colSpan={3} className="px-5 py-2.5 text-right text-xs uppercase tracking-wider font-semibold text-muted-foreground">Total wastage (MTD)</td>
                <td className="px-5 py-2.5 text-right tabular font-semibold text-danger">{money(WASTAGE_LOG.reduce((s, w) => s + w.cost, 0))}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </Card>
      )}

      {/* KITCHEN AMENITIES */}
      {tab === "kitchen" && (() => {
        const filteredK = kitchen.filter(k => {
          if (kSearch && !`${k.name} ${k.vendor} ${k.remark ?? ""}`.toLowerCase().includes(kSearch.toLowerCase())) return false;
          if (kCat !== "all" && k.category !== kCat) return false;
          if (kLoc !== "all" && k.location !== kLoc) return false;
          if (kCond !== "all" && k.condition !== kCond) return false;
          return true;
        });
        const totalPcs = kitchen.reduce((t, k) => t + k.qty, 0);
        const totalValue = kitchen.reduce((t, k) => t + k.qty * k.purchasePrice, 0);
        const wornCount = kitchen.filter(k => k.condition === "Worn").length;
        const fairCount = kitchen.filter(k => k.condition === "Fair").length;

        return (
          <>
            {/* Kitchen KPI strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KPICard label="Total amenities" value={kitchen.length} icon={Utensils} accent="brand" hint={`${totalPcs} pcs total`} />
              <KPICard label="Stock value" value={money(totalValue)} icon={Package} accent="success" hint="at purchase price" />
              <KPICard label="Fair condition" value={fairCount} icon={AlertCircle} accent={fairCount > 0 ? "warning" : "success"} hint="needs eye" />
              <KPICard label="Worn / replace" value={wornCount} icon={TrendingDown} accent={wornCount > 0 ? "danger" : "success"} hint="schedule replacement" />
            </div>

            {/* Filters */}
            <Card className="p-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[240px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle-foreground" />
                  <Input value={kSearch} onChange={e => setKSearch(e.target.value)} placeholder="Search amenity, vendor, remark…" className="pl-9 h-9" />
                </div>
                <Select value={kCat} onChange={e => setKCat(e.target.value as typeof kCat)} className="h-9 w-auto">
                  <option value="all">All categories</option>
                  {KITCHEN_CATEGORIES.map(c => <option key={c} value={c}>{KITCHEN_EMOJI[c]} {c}</option>)}
                </Select>
                <Select value={kLoc} onChange={e => setKLoc(e.target.value as typeof kLoc)} className="h-9 w-auto">
                  <option value="all">All locations</option>
                  {KITCHEN_LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                </Select>
                <Select value={kCond} onChange={e => setKCond(e.target.value as typeof kCond)} className="h-9 w-auto">
                  <option value="all">Any condition</option>
                  {KITCHEN_CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </Select>
                {(kSearch || kCat !== "all" || kLoc !== "all" || kCond !== "all") && (
                  <Button variant="ghost" size="sm" onClick={() => { setKSearch(""); setKCat("all"); setKLoc("all"); setKCond("all"); }}><X className="h-3 w-3" />Clear</Button>
                )}
                <div className="flex-1" />
                <p className="text-xs text-muted-foreground tabular hidden sm:block">
                  <span className="font-medium text-foreground">{filteredK.length}</span> of {kitchen.length}
                </p>
                <ViewToggle view={amenityView} onChange={setAmenityView} />
                <Button size="sm" onClick={() => setEditKitchen("new")}><Plus className="h-3.5 w-3.5" />Add amenity</Button>
              </div>
            </Card>

            {/* Card grid OR list view */}
            {filteredK.length === 0 ? (
              <Card className="p-12 text-center">
                <Utensils className="h-8 w-8 mx-auto text-subtle-foreground mb-2" />
                <p className="font-medium">No kitchen amenities match these filters</p>
                <p className="text-xs text-muted-foreground mt-1">Try clearing filters or add a new amenity</p>
              </Card>
            ) : amenityView === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredK.map(k => {
                  const isEmoji = !k.photo || k.photo.length <= 4;
                  return (
                    <Card key={k.id} className="p-0 overflow-hidden hover:shadow-md transition-shadow">
                      {/* Photo / emoji header */}
                      <div className={cn(
                        "h-32 flex items-center justify-center relative",
                        k.condition === "New" && "bg-success-soft/40",
                        k.condition === "Good" && "bg-info-soft/30",
                        k.condition === "Fair" && "bg-warning-soft/40",
                        k.condition === "Worn" && "bg-danger-soft/40",
                      )}>
                        {isEmoji ? (
                          <span className="text-6xl">{k.photo || KITCHEN_EMOJI[k.category]}</span>
                        ) : (
                          <img src={k.photo} alt={k.name} className="h-full w-full object-cover" />
                        )}
                        <Badge tone={k.condition === "New" ? "success" : k.condition === "Good" ? "info" : k.condition === "Fair" ? "warning" : "danger"} className="absolute top-2 right-2">
                          {k.condition}
                        </Badge>
                        <Badge tone="neutral" className="absolute top-2 left-2">{KITCHEN_EMOJI[k.category]} {k.category}</Badge>
                      </div>
                      {/* Body */}
                      <div className="p-3 space-y-1.5">
                        <p className="font-semibold text-sm leading-tight line-clamp-2 min-h-[2.5em]">{k.name}</p>
                        <div className="flex items-center justify-between text-xs">
                          <span className="inline-flex items-center gap-1 text-muted-foreground"><Package className="h-3 w-3" />{k.qty} {k.unit}</span>
                          <span className="font-mono tabular text-muted-foreground">{money(k.purchasePrice)}/u</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span className="inline-flex items-center gap-1"><Calendar className="h-2.5 w-2.5" />{k.purchaseDate}</span>
                          <span className="inline-flex items-center gap-1"><MapPin className="h-2.5 w-2.5" />{k.location}</span>
                        </div>
                        {k.remark && (
                          <p className="text-[11px] text-muted-foreground italic line-clamp-2 pt-1 border-t border-border">&ldquo;{k.remark}&rdquo;</p>
                        )}
                        <div className="flex gap-1 pt-1.5">
                          <Button size="sm" variant="outline" className="flex-1" onClick={() => setEditKitchen(k)}>
                            <Edit className="h-3 w-3" />Edit
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => {
                            if (window.confirm(`Remove ${k.name} from registry?`)) {
                              setKitchen(prev => prev.filter(x => x.id !== k.id));
                              showToast(`${k.name} removed`);
                            }
                          }}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              /* LIST VIEW — compact table */
              <Card className="p-0 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-surface-elevated border-b border-border">
                      <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                        <th className="px-3 py-2.5 w-12"></th>
                        <th className="px-3 py-2.5 font-semibold">Name</th>
                        <th className="px-3 py-2.5 font-semibold">Category</th>
                        <th className="px-3 py-2.5 font-semibold text-right">Qty</th>
                        <th className="px-3 py-2.5 font-semibold text-right">Price/u</th>
                        <th className="px-3 py-2.5 font-semibold text-right">Total value</th>
                        <th className="px-3 py-2.5 font-semibold">Purchase</th>
                        <th className="px-3 py-2.5 font-semibold">Vendor</th>
                        <th className="px-3 py-2.5 font-semibold">Condition</th>
                        <th className="px-3 py-2.5 font-semibold">Location</th>
                        <th className="px-3 py-2.5 font-semibold">Remark</th>
                        <th className="px-3 py-2.5"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredK.map(k => {
                        const isEmoji = !k.photo || k.photo.length <= 4;
                        return (
                          <tr key={k.id} className="hover:bg-surface-sunken/40 transition-colors">
                            <td className="px-3 py-2">
                              <div className={cn(
                                "h-10 w-10 rounded-md flex items-center justify-center overflow-hidden border border-border",
                                k.condition === "New" && "bg-success-soft/40",
                                k.condition === "Good" && "bg-info-soft/30",
                                k.condition === "Fair" && "bg-warning-soft/40",
                                k.condition === "Worn" && "bg-danger-soft/40",
                              )}>
                                {isEmoji ? <span className="text-xl">{k.photo || KITCHEN_EMOJI[k.category]}</span> : <img src={k.photo} alt={k.name} className="w-full h-full object-cover" />}
                              </div>
                            </td>
                            <td className="px-3 py-2 font-medium">{k.name}</td>
                            <td className="px-3 py-2"><Badge tone="neutral">{KITCHEN_EMOJI[k.category]} {k.category}</Badge></td>
                            <td className="px-3 py-2 text-right tabular font-medium">{k.qty} <span className="text-[10px] text-muted-foreground">{k.unit}</span></td>
                            <td className="px-3 py-2 text-right tabular font-mono text-muted-foreground">{money(k.purchasePrice)}</td>
                            <td className="px-3 py-2 text-right tabular font-semibold">{money(k.qty * k.purchasePrice)}</td>
                            <td className="px-3 py-2 text-xs text-muted-foreground tabular">{k.purchaseDate}</td>
                            <td className="px-3 py-2 text-xs text-muted-foreground">{k.vendor}</td>
                            <td className="px-3 py-2"><Badge tone={k.condition === "New" ? "success" : k.condition === "Good" ? "info" : k.condition === "Fair" ? "warning" : "danger"}>{k.condition}</Badge></td>
                            <td className="px-3 py-2 text-xs text-muted-foreground">{k.location}</td>
                            <td className="px-3 py-2 text-xs text-muted-foreground italic max-w-[200px] truncate" title={k.remark}>{k.remark || "—"}</td>
                            <td className="px-3 py-2 text-right">
                              <div className="inline-flex gap-1">
                                <button type="button" onClick={() => setEditKitchen(k)} className="h-7 w-7 rounded-md border border-border hover:bg-surface-sunken inline-flex items-center justify-center text-muted-foreground" title="Edit">
                                  <Edit className="h-3 w-3" />
                                </button>
                                <button type="button" onClick={() => {
                                  if (window.confirm(`Remove ${k.name} from registry?`)) {
                                    setKitchen(prev => prev.filter(x => x.id !== k.id));
                                    showToast(`${k.name} removed`);
                                  }
                                }} className="h-7 w-7 rounded-md border border-border hover:bg-danger-soft hover:text-danger inline-flex items-center justify-center text-muted-foreground" title="Delete">
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </>
        );
      })()}

      {/* ROOM AMENITIES */}
      {tab === "room" && (() => {
        const filteredR = roomAm.filter(r => {
          if (rSearch && !`${r.name} ${r.vendor} ${r.remark ?? ""}`.toLowerCase().includes(rSearch.toLowerCase())) return false;
          if (rCat !== "all" && r.category !== rCat) return false;
          if (rLoc !== "all" && r.location !== rLoc) return false;
          if (rCond !== "all" && r.condition !== rCond) return false;
          return true;
        });
        const totalPcs = roomAm.reduce((t, r) => t + r.qty, 0);
        const totalValue = roomAm.reduce((t, r) => t + r.qty * r.purchasePrice, 0);
        const wornCount = roomAm.filter(r => r.condition === "Worn").length;
        const fairCount = roomAm.filter(r => r.condition === "Fair").length;

        return (
          <>
            {/* Room amenities KPI strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KPICard label="Total amenities" value={roomAm.length} icon={BedDouble} accent="brand" hint={`${totalPcs} pcs total`} />
              <KPICard label="Stock value" value={money(totalValue)} icon={Package} accent="success" hint="at purchase price" />
              <KPICard label="Fair condition" value={fairCount} icon={AlertCircle} accent={fairCount > 0 ? "warning" : "success"} hint="needs eye" />
              <KPICard label="Worn / replace" value={wornCount} icon={TrendingDown} accent={wornCount > 0 ? "danger" : "success"} hint="schedule replacement" />
            </div>

            {/* Filters */}
            <Card className="p-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[240px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle-foreground" />
                  <Input value={rSearch} onChange={e => setRSearch(e.target.value)} placeholder="Search amenity, vendor, remark…" className="pl-9 h-9" />
                </div>
                <Select value={rCat} onChange={e => setRCat(e.target.value as typeof rCat)} className="h-9 w-auto">
                  <option value="all">All categories</option>
                  {ROOM_CATEGORIES.map(c => <option key={c} value={c}>{ROOM_EMOJI[c]} {c}</option>)}
                </Select>
                <Select value={rLoc} onChange={e => setRLoc(e.target.value as typeof rLoc)} className="h-9 w-auto">
                  <option value="all">All locations</option>
                  {ROOM_LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                </Select>
                <Select value={rCond} onChange={e => setRCond(e.target.value as typeof rCond)} className="h-9 w-auto">
                  <option value="all">Any condition</option>
                  {ROOM_CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </Select>
                {(rSearch || rCat !== "all" || rLoc !== "all" || rCond !== "all") && (
                  <Button variant="ghost" size="sm" onClick={() => { setRSearch(""); setRCat("all"); setRLoc("all"); setRCond("all"); }}><X className="h-3 w-3" />Clear</Button>
                )}
                <div className="flex-1" />
                <p className="text-xs text-muted-foreground tabular hidden sm:block">
                  <span className="font-medium text-foreground">{filteredR.length}</span> of {roomAm.length}
                </p>
                <ViewToggle view={amenityView} onChange={setAmenityView} />
                <Button size="sm" onClick={() => setEditRoom("new")}><Plus className="h-3.5 w-3.5" />Add amenity</Button>
              </div>
            </Card>

            {/* Card grid OR list view */}
            {filteredR.length === 0 ? (
              <Card className="p-12 text-center">
                <BedDouble className="h-8 w-8 mx-auto text-subtle-foreground mb-2" />
                <p className="font-medium">No room amenities match these filters</p>
                <p className="text-xs text-muted-foreground mt-1">Try clearing filters or add a new amenity</p>
              </Card>
            ) : amenityView === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredR.map(r => {
                  const isEmoji = !r.photo || r.photo.length <= 4;
                  return (
                    <Card key={r.id} className="p-0 overflow-hidden hover:shadow-md transition-shadow">
                      {/* Photo / emoji header */}
                      <div className={cn(
                        "h-32 flex items-center justify-center relative",
                        r.condition === "New" && "bg-success-soft/40",
                        r.condition === "Good" && "bg-info-soft/30",
                        r.condition === "Fair" && "bg-warning-soft/40",
                        r.condition === "Worn" && "bg-danger-soft/40",
                      )}>
                        {isEmoji ? (
                          <span className="text-6xl">{r.photo || ROOM_EMOJI[r.category]}</span>
                        ) : (
                          <img src={r.photo} alt={r.name} className="h-full w-full object-cover" />
                        )}
                        <Badge tone={r.condition === "New" ? "success" : r.condition === "Good" ? "info" : r.condition === "Fair" ? "warning" : "danger"} className="absolute top-2 right-2">
                          {r.condition}
                        </Badge>
                        <Badge tone="neutral" className="absolute top-2 left-2">{ROOM_EMOJI[r.category]} {r.category}</Badge>
                      </div>
                      {/* Body */}
                      <div className="p-3 space-y-1.5">
                        <p className="font-semibold text-sm leading-tight line-clamp-2 min-h-[2.5em]">{r.name}</p>
                        <div className="flex items-center justify-between text-xs">
                          <span className="inline-flex items-center gap-1 text-muted-foreground"><Package className="h-3 w-3" />{r.qty} {r.unit}</span>
                          <span className="font-mono tabular text-muted-foreground">{money(r.purchasePrice)}/u</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span className="inline-flex items-center gap-1"><Calendar className="h-2.5 w-2.5" />{r.purchaseDate}</span>
                          <span className="inline-flex items-center gap-1"><MapPin className="h-2.5 w-2.5" />{r.location}</span>
                        </div>
                        {r.perRoom !== undefined && r.perRoom > 0 && (
                          <p className="text-[10px] inline-flex items-center gap-1 text-info"><BedDouble className="h-2.5 w-2.5" />{r.perRoom} per room standard issue</p>
                        )}
                        {r.remark && (
                          <p className="text-[11px] text-muted-foreground italic line-clamp-2 pt-1 border-t border-border">&ldquo;{r.remark}&rdquo;</p>
                        )}
                        <div className="flex gap-1 pt-1.5">
                          <Button size="sm" variant="outline" className="flex-1" onClick={() => setEditRoom(r)}>
                            <Edit className="h-3 w-3" />Edit
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => {
                            if (window.confirm(`Remove ${r.name} from registry?`)) {
                              setRoomAm(prev => prev.filter(x => x.id !== r.id));
                              showToast(`${r.name} removed`);
                            }
                          }}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              /* LIST VIEW — compact table */
              <Card className="p-0 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-surface-elevated border-b border-border">
                      <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                        <th className="px-3 py-2.5 w-12"></th>
                        <th className="px-3 py-2.5 font-semibold">Name</th>
                        <th className="px-3 py-2.5 font-semibold">Category</th>
                        <th className="px-3 py-2.5 font-semibold text-right">Qty</th>
                        <th className="px-3 py-2.5 font-semibold text-right">Per room</th>
                        <th className="px-3 py-2.5 font-semibold text-right">Price/u</th>
                        <th className="px-3 py-2.5 font-semibold text-right">Total value</th>
                        <th className="px-3 py-2.5 font-semibold">Purchase</th>
                        <th className="px-3 py-2.5 font-semibold">Vendor</th>
                        <th className="px-3 py-2.5 font-semibold">Condition</th>
                        <th className="px-3 py-2.5 font-semibold">Location</th>
                        <th className="px-3 py-2.5 font-semibold">Remark</th>
                        <th className="px-3 py-2.5"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredR.map(r => {
                        const isEmoji = !r.photo || r.photo.length <= 4;
                        return (
                          <tr key={r.id} className="hover:bg-surface-sunken/40 transition-colors">
                            <td className="px-3 py-2">
                              <div className={cn(
                                "h-10 w-10 rounded-md flex items-center justify-center overflow-hidden border border-border",
                                r.condition === "New" && "bg-success-soft/40",
                                r.condition === "Good" && "bg-info-soft/30",
                                r.condition === "Fair" && "bg-warning-soft/40",
                                r.condition === "Worn" && "bg-danger-soft/40",
                              )}>
                                {isEmoji ? <span className="text-xl">{r.photo || ROOM_EMOJI[r.category]}</span> : <img src={r.photo} alt={r.name} className="w-full h-full object-cover" />}
                              </div>
                            </td>
                            <td className="px-3 py-2 font-medium">{r.name}</td>
                            <td className="px-3 py-2"><Badge tone="neutral">{ROOM_EMOJI[r.category]} {r.category}</Badge></td>
                            <td className="px-3 py-2 text-right tabular font-medium">{r.qty} <span className="text-[10px] text-muted-foreground">{r.unit}</span></td>
                            <td className="px-3 py-2 text-right tabular text-xs text-info">{r.perRoom ? `${r.perRoom}/room` : "—"}</td>
                            <td className="px-3 py-2 text-right tabular font-mono text-muted-foreground">{money(r.purchasePrice)}</td>
                            <td className="px-3 py-2 text-right tabular font-semibold">{money(r.qty * r.purchasePrice)}</td>
                            <td className="px-3 py-2 text-xs text-muted-foreground tabular">{r.purchaseDate}</td>
                            <td className="px-3 py-2 text-xs text-muted-foreground">{r.vendor}</td>
                            <td className="px-3 py-2"><Badge tone={r.condition === "New" ? "success" : r.condition === "Good" ? "info" : r.condition === "Fair" ? "warning" : "danger"}>{r.condition}</Badge></td>
                            <td className="px-3 py-2 text-xs text-muted-foreground">{r.location}</td>
                            <td className="px-3 py-2 text-xs text-muted-foreground italic max-w-[200px] truncate" title={r.remark}>{r.remark || "—"}</td>
                            <td className="px-3 py-2 text-right">
                              <div className="inline-flex gap-1">
                                <button type="button" onClick={() => setEditRoom(r)} className="h-7 w-7 rounded-md border border-border hover:bg-surface-sunken inline-flex items-center justify-center text-muted-foreground" title="Edit">
                                  <Edit className="h-3 w-3" />
                                </button>
                                <button type="button" onClick={() => {
                                  if (window.confirm(`Remove ${r.name} from registry?`)) {
                                    setRoomAm(prev => prev.filter(x => x.id !== r.id));
                                    showToast(`${r.name} removed`);
                                  }
                                }} className="h-7 w-7 rounded-md border border-border hover:bg-danger-soft hover:text-danger inline-flex items-center justify-center text-muted-foreground" title="Delete">
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </>
        );
      })()}

      {/* PURCHASES */}
      {tab === "purchases" && (() => {
        const filteredP = purchases.filter(p => {
          if (pSearch && !`${p.vendor} ${p.billNo} ${p.lines.map(l => l.item).join(" ")} ${p.notes ?? ""}`.toLowerCase().includes(pSearch.toLowerCase())) return false;
          if (pCat !== "all" && p.category !== pCat) return false;
          if (pDept !== "all" && p.department !== pDept) return false;
          if (pPayStatus !== "all" && p.paymentStatus !== pPayStatus) return false;
          if (p.date < pFromDate || p.date > pToDate) return false;
          return true;
        });
        const todayStr = new Date().toISOString().slice(0, 10);
        const todayTotal = purchases.filter(p => p.date === "2026-05-24" || p.date === todayStr).reduce((t, p) => t + purchaseTotals(p).grandTotal, 0);
        const mtdTotal = purchases.reduce((t, p) => t + purchaseTotals(p).grandTotal, 0);
        const unpaidTotal = purchases.filter(p => p.paymentStatus === "Unpaid" || p.paymentStatus === "Partial" || p.paymentStatus === "On Credit").reduce((t, p) => t + (purchaseTotals(p).grandTotal - p.paidAmount), 0);
        const topVendor = (() => {
          const m: Record<string, number> = {};
          purchases.forEach(p => { m[p.vendor] = (m[p.vendor] || 0) + purchaseTotals(p).grandTotal; });
          const sorted = Object.entries(m).sort((a, b) => b[1] - a[1]);
          return sorted[0];
        })();

        return (
          <>
            {/* KPI strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KPICard label="Today's purchases" value={money(todayTotal)} icon={ShoppingCart} accent="brand" hint={`${purchases.filter(p => p.date === "2026-05-24").length} bills`} />
              <KPICard label="MTD purchases" value={money(mtdTotal)} icon={Truck} accent="info" hint={`${purchases.length} bills`} />
              <KPICard label="Unpaid balance" value={money(unpaidTotal)} icon={Wallet} accent={unpaidTotal > 0 ? "warning" : "success"} hint="incl. partial + credit" />
              <KPICard label="Top vendor" value={topVendor?.[0].split(" ")[0] || "—"} icon={Truck} accent="accent" hint={topVendor ? money(topVendor[1]) : ""} />
            </div>

            {/* Filter bar */}
            <Card className="p-3 space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[240px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle-foreground" />
                  <Input value={pSearch} onChange={e => setPSearch(e.target.value)} placeholder="Search vendor, bill #, item, note…" className="pl-9 h-9" />
                </div>
                <Select value={pCat} onChange={e => setPCat(e.target.value as typeof pCat)} className="h-9 w-auto">
                  <option value="all">All categories</option>
                  {PURCHASE_CATEGORIES.map(c => <option key={c} value={c}>{PURCHASE_CATEGORY_EMOJI[c]} {c}</option>)}
                </Select>
                <Select value={pDept} onChange={e => setPDept(e.target.value as typeof pDept)} className="h-9 w-auto">
                  <option value="all">All departments</option>
                  {PURCHASE_DEPTS.map(d => <option key={d}>{d}</option>)}
                </Select>
                <Select value={pPayStatus} onChange={e => setPPayStatus(e.target.value as typeof pPayStatus)} className="h-9 w-auto">
                  <option value="all">Any payment</option>
                  {PURCHASE_PAYMENT_STATUSES.map(s => <option key={s}>{s}</option>)}
                </Select>
                {(pSearch || pCat !== "all" || pDept !== "all" || pPayStatus !== "all") && (
                  <Button variant="ghost" size="sm" onClick={() => { setPSearch(""); setPCat("all"); setPDept("all"); setPPayStatus("all"); }}><X className="h-3 w-3" />Clear</Button>
                )}
                <div className="flex-1" />
                <Button size="sm" onClick={() => setEditPurchase("new")}><Plus className="h-3.5 w-3.5" />New purchase</Button>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
                <Label className="text-[11px]">Date range</Label>
                <Input type="date" value={pFromDate} onChange={e => setPFromDate(e.target.value)} className="h-8 tabular w-36" />
                <span className="text-xs text-muted-foreground">→</span>
                <Input type="date" value={pToDate} onChange={e => setPToDate(e.target.value)} className="h-8 tabular w-36" />
                <div className="flex-1" />
                <p className="text-xs text-muted-foreground tabular">
                  <span className="font-medium text-foreground">{filteredP.length}</span> of {purchases.length}
                </p>
              </div>
            </Card>

            {/* Purchases table */}
            <Card className="p-0 overflow-hidden">
              {filteredP.length === 0 ? (
                <div className="p-12 text-center">
                  <Truck className="h-8 w-8 mx-auto text-subtle-foreground mb-2" />
                  <p className="font-medium">No purchases match these filters</p>
                  <p className="text-xs text-muted-foreground mt-1">Click &ldquo;New purchase&rdquo; to record one</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-surface-elevated border-b border-border">
                      <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                        <th className="px-3 py-2.5 font-semibold">Date</th>
                        <th className="px-3 py-2.5 font-semibold">Bill #</th>
                        <th className="px-3 py-2.5 font-semibold">Vendor</th>
                        <th className="px-3 py-2.5 font-semibold">Category</th>
                        <th className="px-3 py-2.5 font-semibold">Dept</th>
                        <th className="px-3 py-2.5 font-semibold text-center">Items</th>
                        <th className="px-3 py-2.5 font-semibold text-right">Net taxable</th>
                        <th className="px-3 py-2.5 font-semibold text-right">GST</th>
                        <th className="px-3 py-2.5 font-semibold text-right">Grand total</th>
                        <th className="px-3 py-2.5 font-semibold">Payment</th>
                        <th className="px-3 py-2.5 font-semibold">QC</th>
                        <th className="px-3 py-2.5 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredP.map(p => {
                        const totals = purchaseTotals(p);
                        const balance = totals.grandTotal - p.paidAmount;
                        return (
                          <tr key={p.id} className="hover:bg-surface-sunken/40 transition-colors cursor-pointer" onClick={() => setViewPurchase(p)}>
                            <td className="px-3 py-2 tabular text-xs">{p.date}</td>
                            <td className="px-3 py-2 font-mono tabular text-xs">{p.billNo}</td>
                            <td className="px-3 py-2">
                              <p className="font-medium leading-tight">{p.vendor}</p>
                              {p.vendorGstin && <p className="text-[10px] font-mono text-muted-foreground tabular">{p.vendorGstin}</p>}
                            </td>
                            <td className="px-3 py-2"><Badge tone="neutral">{PURCHASE_CATEGORY_EMOJI[p.category]} {p.category.split(" (")[0]}</Badge></td>
                            <td className="px-3 py-2 text-xs text-muted-foreground">{p.department}</td>
                            <td className="px-3 py-2 text-center tabular text-xs">{p.lines.length}</td>
                            <td className="px-3 py-2 text-right tabular text-muted-foreground">{money(totals.taxableTotal)}</td>
                            <td className="px-3 py-2 text-right tabular text-muted-foreground">{money(totals.taxTotal)}</td>
                            <td className="px-3 py-2 text-right tabular font-semibold">{money(totals.grandTotal)}</td>
                            <td className="px-3 py-2">
                              <Badge tone={p.paymentStatus === "Paid" ? "success" : p.paymentStatus === "Partial" ? "warning" : p.paymentStatus === "On Credit" ? "info" : "danger"}>{p.paymentStatus}</Badge>
                              {balance > 0 && p.paymentStatus !== "Unpaid" && <p className="text-[10px] text-warning tabular mt-0.5">bal {money(balance)}</p>}
                            </td>
                            <td className="px-3 py-2">
                              <Badge tone={p.qcStatus === "Accepted" ? "success" : p.qcStatus === "Pending QC" ? "neutral" : p.qcStatus === "Partially Rejected" ? "warning" : "danger"}>{p.qcStatus}</Badge>
                            </td>
                            <td className="px-3 py-2 text-right" onClick={e => e.stopPropagation()}>
                              <div className="inline-flex gap-1">
                                <button type="button" onClick={() => setViewPurchase(p)} className="h-7 w-7 rounded-md border border-border hover:bg-surface-sunken inline-flex items-center justify-center text-muted-foreground" title="View">
                                  <Eye className="h-3 w-3" />
                                </button>
                                <button type="button" onClick={() => setEditPurchase(p)} className="h-7 w-7 rounded-md border border-border hover:bg-surface-sunken inline-flex items-center justify-center text-muted-foreground" title="Edit">
                                  <Edit className="h-3 w-3" />
                                </button>
                                <button type="button" onClick={() => {
                                  if (window.confirm(`Delete purchase ${p.billNo} from ${p.vendor}?`)) {
                                    setPurchases(prev => prev.filter(x => x.id !== p.id));
                                    showToast(`Purchase ${p.billNo} removed`);
                                  }
                                }} className="h-7 w-7 rounded-md border border-border hover:bg-danger-soft hover:text-danger inline-flex items-center justify-center text-muted-foreground" title="Delete">
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-surface-elevated border-t-2 border-border">
                      <tr>
                        <td colSpan={6} className="px-3 py-2.5 text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                          {filteredP.length} purchase{filteredP.length === 1 ? "" : "s"}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular font-medium text-muted-foreground">{money(filteredP.reduce((t, p) => t + purchaseTotals(p).taxableTotal, 0))}</td>
                        <td className="px-3 py-2.5 text-right tabular font-medium text-muted-foreground">{money(filteredP.reduce((t, p) => t + purchaseTotals(p).taxTotal, 0))}</td>
                        <td className="px-3 py-2.5 text-right tabular font-bold text-base">{money(filteredP.reduce((t, p) => t + purchaseTotals(p).grandTotal, 0))}</td>
                        <td colSpan={3}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </Card>
          </>
        );
      })()}

      {/* MODALS */}
      {adjustItem && <AdjustModal item={adjustItem} onClose={() => setAdjustItem(null)} onSubmit={handleAdjust} />}
      {showAdd && <AddItemModal vendors={vendors} categories={categories} onClose={() => setShowAdd(false)} onSubmit={handleAddItem} />}
      {editItem && <AddItemModal item={editItem} vendors={vendors} categories={categories} onClose={() => setEditItem(null)} onSubmit={handleEditItem} />}
      {viewItem && <ItemDetailModal item={viewItem} onClose={() => setViewItem(null)} onEdit={() => { setEditItem(viewItem); setViewItem(null); }} onAdjust={() => { setAdjustItem(viewItem); setViewItem(null); }} onDelete={() => { handleDeleteItem(viewItem); setViewItem(null); }} />}
      {editKitchen && (
        <KitchenAmenityModal
          amenity={editKitchen === "new" ? null : editKitchen}
          onClose={() => setEditKitchen(null)}
          onSave={(data) => {
            if (editKitchen === "new") {
              setKitchen(prev => [{ ...data, id: `k-${Date.now().toString(36)}` }, ...prev]);
              showToast(`Added ${data.name}`);
            } else if (editKitchen && typeof editKitchen === "object") {
              setKitchen(prev => prev.map(x => x.id === editKitchen.id ? { ...x, ...data, id: x.id } : x));
              showToast(`Updated ${data.name}`);
            }
            setEditKitchen(null);
          }}
        />
      )}
      {editRoom && (
        <RoomAmenityModal
          amenity={editRoom === "new" ? null : editRoom}
          onClose={() => setEditRoom(null)}
          onSave={(data) => {
            if (editRoom === "new") {
              setRoomAm(prev => [{ ...data, id: `r-${Date.now().toString(36)}` }, ...prev]);
              showToast(`Added ${data.name}`);
            } else if (editRoom && typeof editRoom === "object") {
              setRoomAm(prev => prev.map(x => x.id === editRoom.id ? { ...x, ...data, id: x.id } : x));
              showToast(`Updated ${data.name}`);
            }
            setEditRoom(null);
          }}
        />
      )}
      {editPurchase && (
        <PurchaseEntryForm
          purchase={editPurchase === "new" ? null : editPurchase}
          onClose={() => setEditPurchase(null)}
          onSave={(data, addAnother) => {
            if (editPurchase === "new") {
              setPurchases(prev => [{ ...data, id: `pur-${Date.now().toString(36)}` }, ...prev]);
              showToast(`Purchase ${data.billNo} recorded`);
            } else if (editPurchase && typeof editPurchase === "object") {
              setPurchases(prev => prev.map(x => x.id === editPurchase.id ? { ...data, id: x.id } : x));
              showToast(`Purchase ${data.billNo} updated`);
            }
            if (!addAnother) setEditPurchase(null);
            else setEditPurchase("new");
          }}
        />
      )}
      {viewPurchase && (
        <PurchaseDetailModal
          purchase={viewPurchase}
          onClose={() => setViewPurchase(null)}
          onEdit={() => { setEditPurchase(viewPurchase); setViewPurchase(null); }}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-success text-white rounded-md px-4 py-2.5 text-sm shadow-lg animate-in inline-flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />{toast}
        </div>
      )}
    </div>
  );
}

// ---------- Adjust Stock Modal ----------
function AdjustModal({ item, onClose, onSubmit }: { item: Item; onClose: () => void; onSubmit: (delta: number, type: Movement["type"], reason: string) => void }) {
  const [type, setType] = React.useState<Movement["type"]>("Issue");
  const [qty, setQty] = React.useState(10);
  const [reason, setReason] = React.useState("");

  const delta = type === "Receive" ? qty : type === "Adjust" ? qty : -qty;
  const newStock = Math.max(0, item.qty + delta);

  return (
    <Modal onClose={onClose} title="Adjust Stock">
      <div className="space-y-4">
        <div className="rounded-md bg-surface-sunken p-3">
          <p className="font-medium">{item.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Current: <span className="tabular font-medium text-foreground">{item.qty} {item.unit}</span> · Min: {item.min}</p>
        </div>
        <div className="space-y-1.5">
          <Label>Movement type</Label>
          <div className="grid grid-cols-4 gap-1.5">
            {(["Issue", "Receive", "Adjust", "Wastage"] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={cn(
                  "h-10 rounded-md border text-xs font-medium transition-colors",
                  type === t ? "bg-brand text-brand-foreground border-brand" : "border-border hover:bg-surface-sunken"
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Quantity ({item.unit})</Label>
          <Input type="number" value={qty} onChange={e => setQty(Math.max(0, Number(e.target.value)))} />
        </div>
        <div className="space-y-1.5">
          <Label>Reason / Reference</Label>
          <Input value={reason} onChange={e => setReason(e.target.value)} placeholder={type === "Issue" ? "Floor 3 cleaning..." : type === "Receive" ? "PO #..." : "Reason..."} />
        </div>
        <div className="rounded-md border border-border p-3 text-sm">
          <div className="flex items-center justify-between"><span className="text-muted-foreground">Current stock</span><span className="tabular">{item.qty}</span></div>
          <div className="flex items-center justify-between"><span className="text-muted-foreground">Change</span><span className={cn("tabular font-medium", delta > 0 ? "text-success" : "text-warning")}>{delta > 0 ? "+" : ""}{delta}</span></div>
          <div className="flex items-center justify-between pt-2 mt-2 border-t border-border"><span className="font-semibold">New stock</span><span className={cn("tabular font-semibold", newStock < item.min ? "text-danger" : "text-foreground")}>{newStock} {item.unit}</span></div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSubmit(delta, type, reason || `${type} adjustment`)} disabled={qty === 0}>Apply</Button>
        </div>
      </div>
    </Modal>
  );
}

// ---------- Add Item Modal ----------
function AddItemModal({ item, vendors, categories, onClose, onSubmit }: { item?: Item; vendors: string[]; categories: string[]; onClose: () => void; onSubmit: (data: Omit<Item, "id">) => void }) {
  const isEdit = !!item;
  const [name, setName] = React.useState(item?.name ?? "");
  const [c, setC] = React.useState(item?.cat ?? categories[0] ?? "Misc");
  const [vendor, setVendor] = React.useState(item?.vendor ?? vendors[0] ?? "");
  const [qty, setQty] = React.useState(item?.qty ?? 0);
  const [min, setMin] = React.useState(item?.min ?? 10);
  const [unit, setUnit] = React.useState(item?.unit ?? "pcs");
  const [price, setPrice] = React.useState(item?.price ?? 0);

  const canSubmit = name.trim() && qty >= 0 && price >= 0;

  return (
    <Modal onClose={onClose} title={isEdit ? `Edit · ${item!.name}` : "Add Inventory Item"}>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Item name *</Label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Bath Towels — Medium" autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={c} onChange={e => setC(e.target.value)}>
              {categories.map(c => <option key={c}>{c}</option>)}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Vendor</Label>
            <Select value={vendor} onChange={e => setVendor(e.target.value)}>
              {vendors.map(v => <option key={v}>{v}</option>)}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{isEdit ? "Current stock" : "Opening stock"}</Label>
            <Input type="number" value={qty} onChange={e => setQty(Number(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label>Min stock</Label>
            <Input type="number" value={min} onChange={e => setMin(Number(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label>Unit</Label>
            <Select value={unit} onChange={e => setUnit(e.target.value)}>
              <option>pcs</option><option>kg</option><option>L</option><option>btl</option><option>roll</option><option>box</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Unit price (₹)</Label>
            <Input type="number" value={price} onChange={e => setPrice(Number(e.target.value))} step="0.01" />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={!canSubmit} onClick={() => onSubmit({ name, cat: c, vendor, qty, min, unit, price, lastPurchase: item?.lastPurchase ?? "Today" })}>
            {isEdit ? "Save changes" : "Save Item"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ---------- Item Detail (read-only) Modal ----------
function ItemDetailModal({ item, onClose, onEdit, onAdjust, onDelete }: {
  item: Item;
  onClose: () => void;
  onEdit: () => void;
  onAdjust: () => void;
  onDelete: () => void;
}) {
  const low = item.qty < item.min;
  const stockValue = item.qty * item.price;
  return (
    <Modal onClose={onClose} title={`Item · ${item.name}`}>
      <div className="space-y-4">
        {/* Status banner */}
        <Card className={cn(
          "p-3 border-l-4",
          low ? "border-l-danger bg-danger-soft/15" : "border-l-success bg-success-soft/10"
        )}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Current stock</p>
              <p className={cn("text-2xl font-bold tabular", low ? "text-danger" : "text-foreground")}>
                {item.qty} <span className="text-xs font-normal text-muted-foreground">{item.unit}</span>
              </p>
              <p className="text-[11px] text-muted-foreground">Min {item.min} · stock value {money(stockValue)}</p>
            </div>
            <Badge tone={low ? "danger" : "success"}>{low ? "Below min" : "In stock"}</Badge>
          </div>
        </Card>

        {/* Details */}
        <div className="rounded-md border border-border divide-y divide-border">
          <DetailRow k="Category" v={<Badge tone="neutral">{item.cat}</Badge>} />
          <DetailRow k="Vendor" v={item.vendor} />
          <DetailRow k="Unit price" v={<span className="tabular font-medium">{money(item.price)} / {item.unit}</span>} />
          <DetailRow k="Last purchase" v={<span className="tabular">{item.lastPurchase}</span>} />
          <DetailRow k="Item ID" v={<span className="font-mono tabular text-xs text-muted-foreground">{item.id}</span>} />
        </div>

        {/* Actions */}
        <div className="flex justify-between gap-2 pt-2 border-t border-border">
          <Button variant="danger" size="sm" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />Delete
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>Close</Button>
            <Button variant="outline" onClick={onAdjust}><RotateCw className="h-3.5 w-3.5" />Adjust stock</Button>
            <Button onClick={onEdit}><Edit className="h-3.5 w-3.5" />Edit</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function DetailRow({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2">
      <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{k}</span>
      <span className="text-sm">{v}</span>
    </div>
  );
}

// ---------- Generic Modal ----------
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs animate-in" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 sm:p-6 pointer-events-none">
        <Card className="pointer-events-auto w-full max-w-lg p-5 animate-in shadow-xl">
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

// ============================================================
// KITCHEN AMENITY MODAL
// ============================================================
function KitchenAmenityModal({ amenity, onClose, onSave }: {
  amenity: KitchenAmenity | null;
  onClose: () => void;
  onSave: (data: Omit<KitchenAmenity, "id">) => void;
}) {
  const isNew = amenity === null;
  const [name, setName] = React.useState(amenity?.name ?? "");
  const [category, setCategory] = React.useState<KitchenCategory>(amenity?.category ?? "Crockery");
  const [qty, setQty] = React.useState(amenity?.qty ?? 1);
  const [unit, setUnit] = React.useState(amenity?.unit ?? "pcs");
  const [purchaseDate, setPurchaseDate] = React.useState(amenity?.purchaseDate ?? new Date().toISOString().slice(0, 10));
  const [purchasePrice, setPurchasePrice] = React.useState(amenity?.purchasePrice ?? 0);
  const [vendor, setVendor] = React.useState(amenity?.vendor ?? "");
  const [condition, setCondition] = React.useState<KitchenCondition>(amenity?.condition ?? "New");
  const [location, setLocation] = React.useState<KitchenLocation>(amenity?.location ?? "Main Kitchen");
  const [photo, setPhoto] = React.useState(amenity?.photo ?? "");
  const [remark, setRemark] = React.useState(amenity?.remark ?? "");

  React.useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; document.removeEventListener("keydown", onKey); };
  }, [onClose]);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setPhoto((ev.target?.result as string) || "");
    reader.readAsDataURL(file);
  };

  const totalValue = qty * purchasePrice;
  const valid = name.trim().length > 1 && qty > 0;
  const isEmoji = !photo || photo.length <= 4;

  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface rounded-xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="h-9 w-9 rounded-md bg-brand-soft text-brand-soft-foreground inline-flex items-center justify-center"><Utensils className="h-4 w-4" /></span>
            <div>
              <h3 className="font-semibold">{isNew ? "Add kitchen amenity" : "Edit amenity"}</h3>
              <p className="text-xs text-muted-foreground">{isNew ? "Register new item · plates, vessels, appliances, etc." : amenity!.name}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="h-7 w-7 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4 overflow-y-auto">
          {/* Photo */}
          <div>
            <Label className="text-xs"><Camera className="h-3 w-3 inline mr-1" />Photo</Label>
            <div className="mt-1.5 flex items-center gap-3">
              <div className={cn(
                "h-24 w-24 rounded-md border border-border flex items-center justify-center shrink-0 overflow-hidden",
                condition === "New" && "bg-success-soft/40",
                condition === "Good" && "bg-info-soft/30",
                condition === "Fair" && "bg-warning-soft/40",
                condition === "Worn" && "bg-danger-soft/40",
              )}>
                {isEmoji ? (
                  <span className="text-5xl">{photo || KITCHEN_EMOJI[category]}</span>
                ) : (
                  <img src={photo} alt={name || "Photo"} className="w-full h-full object-cover" />
                )}
              </div>
              <div className="flex-1 space-y-1.5">
                <label className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border hover:bg-surface-sunken text-xs font-medium cursor-pointer">
                  <Camera className="h-3.5 w-3.5" />Upload photo
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
                </label>
                <div className="flex items-center gap-1.5">
                  <Input value={isEmoji ? photo : ""} onChange={e => setPhoto(e.target.value)} placeholder="Or pick emoji 🍽️ 🍳 🥄 🥂 🫖" className="h-8 text-xs flex-1" maxLength={4} />
                  {photo && (
                    <Button size="sm" variant="ghost" onClick={() => setPhoto("")} title="Clear photo">
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground">PNG/JPG · category emoji fallback shown if blank</p>
              </div>
            </div>
          </div>

          {/* Identity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Name *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Dinner Plate 10&quot;" className="h-9" autoFocus />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Category</Label>
              <Select value={category} onChange={e => setCategory(e.target.value as KitchenCategory)} className="h-9">
                {KITCHEN_CATEGORIES.map(c => <option key={c} value={c}>{KITCHEN_EMOJI[c]} {c}</option>)}
              </Select>
            </div>
          </div>

          {/* Qty + unit + price */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Quantity *</Label>
              <Input type="number" value={qty} onChange={e => setQty(Math.max(0, Number(e.target.value) || 0))} className="h-9 tabular text-center" min={0} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Unit</Label>
              <Select value={unit} onChange={e => setUnit(e.target.value)} className="h-9">
                <option>pcs</option><option>set</option><option>pair</option><option>box</option><option>doz</option>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Price per unit (₹)</Label>
              <Input type="number" value={purchasePrice} onChange={e => setPurchasePrice(Math.max(0, Number(e.target.value) || 0))} className="h-9 tabular" min={0} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Total value</Label>
              <div className="h-9 px-3 rounded-md border border-border bg-surface-sunken/30 inline-flex items-center font-semibold tabular text-sm">
                {money(totalValue)}
              </div>
            </div>
          </div>

          {/* Purchase + vendor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs"><Calendar className="h-3 w-3 inline mr-1" />Purchase date</Label>
              <Input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} className="h-9 tabular" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Vendor</Label>
              <Input value={vendor} onChange={e => setVendor(e.target.value)} placeholder="e.g. Royal Crockery" className="h-9" />
            </div>
          </div>

          {/* Condition + location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Condition</Label>
              <div className="grid grid-cols-4 gap-1.5">
                {KITCHEN_CONDITIONS.map(c => (
                  <button key={c} type="button" onClick={() => setCondition(c)} className={cn(
                    "h-9 rounded-md border text-xs font-medium transition-colors",
                    condition === c
                      ? c === "New" ? "bg-success text-white border-success"
                        : c === "Good" ? "bg-info text-white border-info"
                          : c === "Fair" ? "bg-warning text-white border-warning"
                            : "bg-danger text-white border-danger"
                      : "border-border hover:bg-surface-sunken"
                  )}>{c}</button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs"><MapPin className="h-3 w-3 inline mr-1" />Location</Label>
              <Select value={location} onChange={e => setLocation(e.target.value as KitchenLocation)} className="h-9">
                {KITCHEN_LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
              </Select>
            </div>
          </div>

          {/* Remark */}
          <div className="space-y-1">
            <Label className="text-xs">Remark</Label>
            <textarea value={remark} onChange={e => setRemark(e.target.value)} rows={2} placeholder="Brand, model, set details, condition notes, replacement plan…"
              className="w-full px-3 py-2 rounded-md border border-border bg-surface text-sm focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 outline-hidden resize-y" />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-border bg-surface-sunken/30">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave({ name, category, qty, unit, purchaseDate, purchasePrice, vendor, condition, location, photo, remark })} disabled={!valid}>
            <CheckCircle2 className="h-3.5 w-3.5" />{isNew ? "Add amenity" : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ROOM AMENITY MODAL
// ============================================================
function RoomAmenityModal({ amenity, onClose, onSave }: {
  amenity: RoomAmenity | null;
  onClose: () => void;
  onSave: (data: Omit<RoomAmenity, "id">) => void;
}) {
  const isNew = amenity === null;
  const [name, setName] = React.useState(amenity?.name ?? "");
  const [category, setCategory] = React.useState<RoomCategory>(amenity?.category ?? "Bedding");
  const [qty, setQty] = React.useState(amenity?.qty ?? 1);
  const [unit, setUnit] = React.useState(amenity?.unit ?? "pcs");
  const [purchaseDate, setPurchaseDate] = React.useState(amenity?.purchaseDate ?? new Date().toISOString().slice(0, 10));
  const [purchasePrice, setPurchasePrice] = React.useState(amenity?.purchasePrice ?? 0);
  const [vendor, setVendor] = React.useState(amenity?.vendor ?? "");
  const [condition, setCondition] = React.useState<RoomCondition>(amenity?.condition ?? "New");
  const [location, setLocation] = React.useState<RoomLocation>(amenity?.location ?? "All Rooms");
  const [photo, setPhoto] = React.useState(amenity?.photo ?? "");
  const [remark, setRemark] = React.useState(amenity?.remark ?? "");
  const [perRoom, setPerRoom] = React.useState<number>(amenity?.perRoom ?? 0);

  React.useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; document.removeEventListener("keydown", onKey); };
  }, [onClose]);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setPhoto((ev.target?.result as string) || "");
    reader.readAsDataURL(file);
  };

  const totalValue = qty * purchasePrice;
  const valid = name.trim().length > 1 && qty > 0;
  const isEmoji = !photo || photo.length <= 4;

  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface rounded-xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="h-9 w-9 rounded-md bg-brand-soft text-brand-soft-foreground inline-flex items-center justify-center"><BedDouble className="h-4 w-4" /></span>
            <div>
              <h3 className="font-semibold">{isNew ? "Add room amenity" : "Edit amenity"}</h3>
              <p className="text-xs text-muted-foreground">{isNew ? "Register new item · pillow, sheet, duvet, TV, kettle, etc." : amenity!.name}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="h-7 w-7 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4 overflow-y-auto">
          {/* Photo */}
          <div>
            <Label className="text-xs"><Camera className="h-3 w-3 inline mr-1" />Photo</Label>
            <div className="mt-1.5 flex items-center gap-3">
              <div className={cn(
                "h-24 w-24 rounded-md border border-border flex items-center justify-center shrink-0 overflow-hidden",
                condition === "New" && "bg-success-soft/40",
                condition === "Good" && "bg-info-soft/30",
                condition === "Fair" && "bg-warning-soft/40",
                condition === "Worn" && "bg-danger-soft/40",
              )}>
                {isEmoji ? (
                  <span className="text-5xl">{photo || ROOM_EMOJI[category]}</span>
                ) : (
                  <img src={photo} alt={name || "Photo"} className="w-full h-full object-cover" />
                )}
              </div>
              <div className="flex-1 space-y-1.5">
                <label className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border hover:bg-surface-sunken text-xs font-medium cursor-pointer">
                  <Camera className="h-3.5 w-3.5" />Upload photo
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
                </label>
                <div className="flex items-center gap-1.5">
                  <Input value={isEmoji ? photo : ""} onChange={e => setPhoto(e.target.value)} placeholder="Or pick emoji 🛏️ 🛁 📺 🪑 🧴" className="h-8 text-xs flex-1" maxLength={4} />
                  {photo && (
                    <Button size="sm" variant="ghost" onClick={() => setPhoto("")} title="Clear photo">
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground">PNG/JPG · category emoji fallback shown if blank</p>
              </div>
            </div>
          </div>

          {/* Identity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Name *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. King Bed Sheet (300TC)" className="h-9" autoFocus />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Category</Label>
              <Select value={category} onChange={e => setCategory(e.target.value as RoomCategory)} className="h-9">
                {ROOM_CATEGORIES.map(c => <option key={c} value={c}>{ROOM_EMOJI[c]} {c}</option>)}
              </Select>
            </div>
          </div>

          {/* Qty + unit + price */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Quantity *</Label>
              <Input type="number" value={qty} onChange={e => setQty(Math.max(0, Number(e.target.value) || 0))} className="h-9 tabular text-center" min={0} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Unit</Label>
              <Select value={unit} onChange={e => setUnit(e.target.value)} className="h-9">
                <option>pcs</option><option>set</option><option>pair</option><option>box</option>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Price per unit (₹)</Label>
              <Input type="number" value={purchasePrice} onChange={e => setPurchasePrice(Math.max(0, Number(e.target.value) || 0))} className="h-9 tabular" min={0} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Total value</Label>
              <div className="h-9 px-3 rounded-md border border-border bg-surface-sunken/30 inline-flex items-center font-semibold tabular text-sm">
                {money(totalValue)}
              </div>
            </div>
          </div>

          {/* Per-room standard + purchase */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs"><BedDouble className="h-3 w-3 inline mr-1" />Per-room standard</Label>
              <Input type="number" value={perRoom} onChange={e => setPerRoom(Math.max(0, Number(e.target.value) || 0))} className="h-9 tabular text-center" min={0} placeholder="e.g. 2 (pillows)" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs"><Calendar className="h-3 w-3 inline mr-1" />Purchase date</Label>
              <Input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} className="h-9 tabular" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Vendor</Label>
              <Input value={vendor} onChange={e => setVendor(e.target.value)} placeholder="e.g. Pearl Textiles" className="h-9" />
            </div>
          </div>

          {/* Condition + location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Condition</Label>
              <div className="grid grid-cols-4 gap-1.5">
                {ROOM_CONDITIONS.map(c => (
                  <button key={c} type="button" onClick={() => setCondition(c)} className={cn(
                    "h-9 rounded-md border text-xs font-medium transition-colors",
                    condition === c
                      ? c === "New" ? "bg-success text-white border-success"
                        : c === "Good" ? "bg-info text-white border-info"
                          : c === "Fair" ? "bg-warning text-white border-warning"
                            : "bg-danger text-white border-danger"
                      : "border-border hover:bg-surface-sunken"
                  )}>{c}</button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs"><MapPin className="h-3 w-3 inline mr-1" />Location</Label>
              <Select value={location} onChange={e => setLocation(e.target.value as RoomLocation)} className="h-9">
                {ROOM_LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
              </Select>
            </div>
          </div>

          {/* Remark */}
          <div className="space-y-1">
            <Label className="text-xs">Remark</Label>
            <textarea value={remark} onChange={e => setRemark(e.target.value)} rows={2} placeholder="Brand, model, set details, condition notes, replacement plan…"
              className="w-full px-3 py-2 rounded-md border border-border bg-surface text-sm focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 outline-hidden resize-y" />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-border bg-surface-sunken/30">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave({ name, category, qty, unit, purchaseDate, purchasePrice, vendor, condition, location, photo, remark, perRoom: perRoom > 0 ? perRoom : undefined })} disabled={!valid}>
            <CheckCircle2 className="h-3.5 w-3.5" />{isNew ? "Add amenity" : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// VIEW TOGGLE — Grid / List
// ============================================================
function ViewToggle({ view, onChange }: { view: "grid" | "list"; onChange: (v: "grid" | "list") => void }) {
  return (
    <div className="inline-flex border border-border rounded-md overflow-hidden" role="group" aria-label="View mode">
      <button
        type="button"
        onClick={() => onChange("grid")}
        className={cn(
          "h-9 w-9 inline-flex items-center justify-center transition-colors",
          view === "grid" ? "bg-brand text-brand-foreground" : "bg-surface text-muted-foreground hover:bg-surface-sunken"
        )}
        title="Grid view"
        aria-pressed={view === "grid"}
      >
        <LayoutGrid className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => onChange("list")}
        className={cn(
          "h-9 w-9 inline-flex items-center justify-center transition-colors border-l border-border",
          view === "list" ? "bg-brand text-brand-foreground" : "bg-surface text-muted-foreground hover:bg-surface-sunken"
        )}
        title="List view"
        aria-pressed={view === "list"}
      >
        <List className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ============================================================
// PURCHASE ENTRY — FULL-SCREEN FORM
// ============================================================
type PurchaseSection = "basics" | "vendor" | "lines" | "totals" | "payment" | "qc" | "photos" | "notes";
const PURCHASE_SECTIONS: { id: PurchaseSection; label: string; icon: typeof FileText }[] = [
  { id: "basics",  label: "Basics",         icon: FileText },
  { id: "vendor",  label: "Vendor & bill",  icon: Truck },
  { id: "lines",   label: "Line items",     icon: Package },
  { id: "totals",  label: "Totals & GST",   icon: Wallet },
  { id: "payment", label: "Payment",        icon: Wallet },
  { id: "qc",      label: "QC & storage",   icon: CheckCircle2 },
  { id: "photos",  label: "Photos",         icon: Camera },
  { id: "notes",   label: "Notes",          icon: FileText },
];

function PurchaseEntryForm({ purchase, onClose, onSave }: {
  purchase: Purchase | null;
  onClose: () => void;
  onSave: (data: Omit<Purchase, "id">, addAnother: boolean) => void;
}) {
  const isNew = purchase === null;

  // ----------- state -----------
  const [date, setDate] = React.useState(purchase?.date ?? new Date().toISOString().slice(0, 10));
  const [category, setCategory] = React.useState<PurchaseCategory>(purchase?.category ?? "Vegetables");
  const [department, setDepartment] = React.useState<PurchaseDept>(purchase?.department ?? "Kitchen");

  const [vendor, setVendor] = React.useState(purchase?.vendor ?? "");
  const [vendorGstin, setVendorGstin] = React.useState(purchase?.vendorGstin ?? "");
  const [vendorPan, setVendorPan] = React.useState(purchase?.vendorPan ?? "");
  const [vendorPhone, setVendorPhone] = React.useState(purchase?.vendorPhone ?? "+91 ");
  const [billNo, setBillNo] = React.useState(purchase?.billNo ?? "");
  const [billDate, setBillDate] = React.useState(purchase?.billDate ?? new Date().toISOString().slice(0, 10));

  const [lines, setLines] = React.useState<PurchaseLine[]>(purchase?.lines ?? [newPurchaseLine()]);

  const [discount, setDiscount] = React.useState(purchase?.discount ?? 0);
  const [freight, setFreight] = React.useState(purchase?.freight ?? 0);
  const [roundOff, setRoundOff] = React.useState(purchase?.roundOff ?? 0);
  const [interState, setInterState] = React.useState(purchase?.interState ?? false);

  const [paymentStatus, setPaymentStatus] = React.useState<PurchasePaymentStatus>(purchase?.paymentStatus ?? "Paid");
  const [paymentMode, setPaymentMode] = React.useState(purchase?.paymentMode ?? "Cash");
  const [paymentDate, setPaymentDate] = React.useState(purchase?.paymentDate ?? new Date().toISOString().slice(0, 10));
  const [paymentRef, setPaymentRef] = React.useState(purchase?.paymentRef ?? "");
  const [paidAmount, setPaidAmount] = React.useState(purchase?.paidAmount ?? 0);

  const [receivedBy, setReceivedBy] = React.useState(purchase?.receivedBy ?? "Khalid R.");
  const [qcStatus, setQcStatus] = React.useState<PurchaseQC>(purchase?.qcStatus ?? "Accepted");
  const [storage, setStorage] = React.useState<PurchaseStorage>(purchase?.storage ?? "Main Pantry");

  const [billPhoto, setBillPhoto] = React.useState<string | undefined>(purchase?.billPhoto);
  const [goodsPhotos, setGoodsPhotos] = React.useState<string[]>(purchase?.goodsPhotos ?? []);
  const [notes, setNotes] = React.useState(purchase?.notes ?? "");

  const [activeSection, setActiveSection] = React.useState<PurchaseSection>("basics");

  React.useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; document.removeEventListener("keydown", onKey); };
  }, [onClose]);

  // Auto-compute line totals on change
  const updLine = (id: string, patch: Partial<PurchaseLine>) => {
    setLines(prev => prev.map(l => {
      if (l.id !== id) return l;
      const next = { ...l, ...patch };
      next.taxable = +(next.qty * next.rate).toFixed(2);
      next.tax = +(next.taxable * next.gstPct / 100).toFixed(2);
      next.amount = +(next.taxable + next.tax).toFixed(2);
      return next;
    }));
  };
  const addLine = () => setLines(prev => [...prev, newPurchaseLine()]);
  const removeLine = (id: string) => setLines(prev => prev.length > 1 ? prev.filter(l => l.id !== id) : prev);

  // Photo handlers
  const onBillFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setBillPhoto((ev.target?.result as string) || "");
    reader.readAsDataURL(file);
  };
  const onGoodsFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => setGoodsPhotos(prev => [...prev, (ev.target?.result as string) || ""]);
      reader.readAsDataURL(file);
    });
  };

  const totals = purchaseTotals({ lines, discount, freight, roundOff, interState });
  const balance = totals.grandTotal - paidAmount;
  const valid = vendor.trim() !== "" && billNo.trim() !== "" && lines.some(l => l.item.trim() !== "" && l.amount > 0);

  // Auto-set paid amount when status changes
  React.useEffect(() => {
    if (paymentStatus === "Paid") setPaidAmount(totals.grandTotal);
    if (paymentStatus === "Unpaid" || paymentStatus === "On Credit") setPaidAmount(0);
  }, [paymentStatus, totals.grandTotal]);

  const handleSubmit = (addAnother: boolean) => {
    const data: Omit<Purchase, "id"> = {
      date, billNo, billDate, vendor, vendorGstin, vendorPan, vendorPhone,
      category, department, lines, discount, freight, roundOff, interState,
      paymentStatus, paymentMode, paymentDate, paymentRef, paidAmount,
      receivedBy, qcStatus, storage, billPhoto, goodsPhotos, notes,
    };
    onSave(data, addAnother);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Sticky header */}
      <div className="h-14 border-b border-border bg-surface flex items-center px-5 gap-3 shrink-0">
        <span className="h-9 w-9 rounded-md bg-info-soft text-info inline-flex items-center justify-center"><Truck className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-base leading-tight">{isNew ? "New purchase" : `Edit purchase · ${purchase!.billNo}`}</h2>
          <p className="text-[11px] text-muted-foreground tabular">{date} · {category} · {department}</p>
        </div>
        <Badge tone={valid ? "success" : "warning"}>
          {valid ? <><CheckCircle2 className="h-3 w-3" />Ready to save</> : <><AlertCircle className="h-3 w-3" />Vendor, bill no & lines required</>}
        </Badge>
        <button type="button" onClick={onClose} className="h-8 w-8 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center" title="Cancel (Esc)">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Section nav */}
        <aside className="w-56 border-r border-border bg-surface-sunken/30 overflow-y-auto p-2 hidden lg:block shrink-0">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground px-2 pt-2 pb-1">Sections</p>
          <ul className="space-y-0.5">
            {PURCHASE_SECTIONS.map(s => {
              const Icon = s.icon;
              return (
                <li key={s.id}>
                  <a href={`#psec-${s.id}`} onClick={() => setActiveSection(s.id)} className={cn(
                    "flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm transition-colors",
                    activeSection === s.id ? "bg-brand-soft text-brand-soft-foreground font-medium" : "hover:bg-surface text-muted-foreground"
                  )}>
                    <Icon className={cn("h-3.5 w-3.5", activeSection === s.id ? "text-brand" : "")} />
                    {s.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-y-auto px-5 lg:px-8 py-5 space-y-6">
          {/* Basics */}
          <section id="psec-basics" className="scroll-mt-20">
            <div className="mb-3">
              <h3 className="font-semibold text-base">Basics</h3>
              <p className="text-xs text-muted-foreground">When, what, which department</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1"><label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Receipt date *</label><Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-9 tabular" /></div>
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Category *</label>
                <Select value={category} onChange={e => setCategory(e.target.value as PurchaseCategory)} className="h-9">
                  {PURCHASE_CATEGORIES.map(c => <option key={c} value={c}>{PURCHASE_CATEGORY_EMOJI[c]} {c}</option>)}
                </Select>
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Department *</label>
                <Select value={department} onChange={e => setDepartment(e.target.value as PurchaseDept)} className="h-9">
                  {PURCHASE_DEPTS.map(d => <option key={d}>{d}</option>)}
                </Select>
              </div>
            </div>
          </section>

          {/* Vendor & bill */}
          <section id="psec-vendor" className="scroll-mt-20">
            <div className="mb-3">
              <h3 className="font-semibold text-base">Vendor &amp; bill</h3>
              <p className="text-xs text-muted-foreground">Supplier identity + bill reference</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1 md:col-span-2"><label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Vendor name *</label><Input value={vendor} onChange={e => setVendor(e.target.value)} placeholder="e.g. Crawford Market Vendor — Suresh" className="h-9" /></div>
              <div className="space-y-1"><label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Vendor phone</label><Input value={vendorPhone} onChange={e => setVendorPhone(e.target.value)} placeholder="+91 9XXXX XXXXX" className="h-9 tabular" /></div>
              <div className="space-y-1"><label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Vendor GSTIN</label><Input value={vendorGstin} onChange={e => setVendorGstin(e.target.value.toUpperCase())} placeholder="27ABCDE1234F1Z5" className="h-9 font-mono tabular" /></div>
              <div className="space-y-1"><label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Vendor PAN</label><Input value={vendorPan} onChange={e => setVendorPan(e.target.value.toUpperCase())} placeholder="ABCDE1234F" className="h-9 font-mono tabular" /></div>
              <div className="space-y-1"><label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Bill / Invoice no *</label><Input value={billNo} onChange={e => setBillNo(e.target.value)} placeholder="VEG-24-557" className="h-9 font-mono tabular" /></div>
              <div className="space-y-1"><label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Bill date</label><Input type="date" value={billDate} onChange={e => setBillDate(e.target.value)} className="h-9 tabular" /></div>
              <div className="space-y-1 md:col-span-2">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Tax flags</label>
                <button type="button" onClick={() => setInterState(!interState)} className={cn(
                  "w-full h-9 rounded-md border text-xs font-medium transition-colors inline-flex items-center justify-center gap-1.5",
                  interState ? "bg-info-soft border-info text-info" : "border-border hover:bg-surface-sunken"
                )}>
                  {interState ? <CheckCircle2 className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                  Inter-state supply (IGST instead of CGST + SGST)
                </button>
              </div>
            </div>
          </section>

          {/* Line items */}
          <section id="psec-lines" className="scroll-mt-20">
            <div className="mb-3">
              <h3 className="font-semibold text-base">Line items</h3>
              <p className="text-xs text-muted-foreground">Each item · multi-row</p>
            </div>
            <div className="rounded-md border border-border overflow-x-auto">
              <table className="w-full text-sm min-w-[860px]">
                <thead className="bg-surface-sunken/40 border-b border-border">
                  <tr className="text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="text-left px-3 py-2 font-semibold">Item</th>
                    <th className="px-2 py-2 font-semibold">Unit</th>
                    <th className="px-2 py-2 font-semibold text-right">Qty</th>
                    <th className="px-2 py-2 font-semibold text-right">Rate</th>
                    <th className="px-2 py-2 font-semibold text-right">GST%</th>
                    <th className="px-2 py-2 font-semibold text-right">Taxable</th>
                    <th className="px-2 py-2 font-semibold text-right">Tax</th>
                    <th className="px-2 py-2 font-semibold text-right">Amount</th>
                    <th className="px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {lines.map((l, i) => (
                    <tr key={l.id} className="hover:bg-surface-sunken/30">
                      <td className="px-3 py-1.5"><Input value={l.item} onChange={e => updLine(l.id, { item: e.target.value })} className="h-8 text-xs min-w-[180px]" placeholder={`Item ${i + 1}`} /></td>
                      <td className="px-2 py-1.5">
                        <Select value={l.unit} onChange={e => updLine(l.id, { unit: e.target.value })} className="h-8 text-xs w-20">
                          {PURCHASE_UNITS.map(u => <option key={u}>{u}</option>)}
                        </Select>
                      </td>
                      <td className="px-2 py-1.5"><Input type="number" value={l.qty} onChange={e => updLine(l.id, { qty: Math.max(0, Number(e.target.value)) })} className="h-8 text-xs tabular text-right w-16" min={0} step="0.01" /></td>
                      <td className="px-2 py-1.5"><Input type="number" value={l.rate} onChange={e => updLine(l.id, { rate: Math.max(0, Number(e.target.value)) })} className="h-8 text-xs tabular text-right w-20" min={0} step="0.01" /></td>
                      <td className="px-2 py-1.5">
                        <Select value={l.gstPct} onChange={e => updLine(l.id, { gstPct: Number(e.target.value) })} className="h-8 text-xs tabular w-14">
                          <option value={0}>0</option><option value={5}>5</option><option value={12}>12</option><option value={18}>18</option><option value={28}>28</option>
                        </Select>
                      </td>
                      <td className="px-2 py-1.5 text-right tabular text-xs">{money(l.taxable)}</td>
                      <td className="px-2 py-1.5 text-right tabular text-xs text-muted-foreground">{money(l.tax)}</td>
                      <td className="px-2 py-1.5 text-right tabular text-xs font-semibold">{money(l.amount)}</td>
                      <td className="px-2 py-1.5">
                        <button type="button" onClick={() => removeLine(l.id)} disabled={lines.length === 1} className="h-7 w-7 rounded-md hover:bg-danger-soft hover:text-danger inline-flex items-center justify-center text-muted-foreground disabled:opacity-30">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-surface-elevated">
                  <tr>
                    <td colSpan={5} className="px-3 py-2"><Button size="sm" variant="ghost" onClick={addLine}><Plus className="h-3 w-3" />Add line</Button></td>
                    <td className="px-2 py-2 text-right tabular font-semibold">{money(totals.taxableTotal)}</td>
                    <td className="px-2 py-2 text-right tabular font-semibold text-muted-foreground">{money(totals.taxTotal)}</td>
                    <td className="px-2 py-2 text-right tabular font-bold">{money(totals.subTotal)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          {/* Totals */}
          <section id="psec-totals" className="scroll-mt-20">
            <div className="mb-3">
              <h3 className="font-semibold text-base">Totals, charges & GST</h3>
              <p className="text-xs text-muted-foreground">Discount · freight · round-off · final amount</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1"><label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Discount (₹)</label><Input type="number" value={discount} onChange={e => setDiscount(Math.max(0, Number(e.target.value)))} className="h-9 tabular" min={0} /></div>
              <div className="space-y-1"><label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Freight / Cartage (₹)</label><Input type="number" value={freight} onChange={e => setFreight(Math.max(0, Number(e.target.value)))} className="h-9 tabular" min={0} /></div>
              <div className="space-y-1"><label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Round-off (₹)</label><Input type="number" value={roundOff} onChange={e => setRoundOff(Number(e.target.value))} className="h-9 tabular" /></div>
            </div>
          </section>

          {/* Payment */}
          <section id="psec-payment" className="scroll-mt-20">
            <div className="mb-3">
              <h3 className="font-semibold text-base">Payment</h3>
              <p className="text-xs text-muted-foreground">When and how this is being paid</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Payment status</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {PURCHASE_PAYMENT_STATUSES.map(s => (
                    <button key={s} type="button" onClick={() => setPaymentStatus(s)} className={cn(
                      "h-9 rounded-md border text-xs font-medium transition-colors",
                      paymentStatus === s ? "bg-brand text-brand-foreground border-brand" : "border-border hover:bg-surface-sunken"
                    )}>{s}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-1"><label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Payment mode</label>
                <Select value={paymentMode} onChange={e => setPaymentMode(e.target.value)} className="h-9">
                  <option>Cash</option><option>UPI</option><option>Card</option><option>NEFT</option><option>RTGS</option><option>IMPS</option><option>Cheque</option><option>Credit (Net 30)</option><option>Credit (Net 7)</option><option>Pending</option>
                </Select>
              </div>
              <div className="space-y-1"><label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Paid amount (₹)</label><Input type="number" value={paidAmount} onChange={e => setPaidAmount(Math.max(0, Number(e.target.value)))} className="h-9 tabular font-semibold" min={0} max={totals.grandTotal} /></div>
              <div className="space-y-1"><label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Payment date</label><Input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="h-9 tabular" /></div>
              <div className="space-y-1 md:col-span-2"><label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Reference / UTR / Txn ID</label><Input value={paymentRef} onChange={e => setPaymentRef(e.target.value)} placeholder="UTR / cheque # / UPI ref" className="h-9 font-mono tabular" /></div>
            </div>
          </section>

          {/* QC + storage */}
          <section id="psec-qc" className="scroll-mt-20">
            <div className="mb-3">
              <h3 className="font-semibold text-base">QC & storage</h3>
              <p className="text-xs text-muted-foreground">Who received · quality check · where stored</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1"><label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Received by</label><Input value={receivedBy} onChange={e => setReceivedBy(e.target.value)} placeholder="Person who took delivery" className="h-9" /></div>
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Quality check</label>
                <Select value={qcStatus} onChange={e => setQcStatus(e.target.value as PurchaseQC)} className="h-9">
                  {PURCHASE_QC_STATUSES.map(s => <option key={s}>{s}</option>)}
                </Select>
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Storage location</label>
                <Select value={storage} onChange={e => setStorage(e.target.value as PurchaseStorage)} className="h-9">
                  {PURCHASE_STORAGES.map(s => <option key={s}>{s}</option>)}
                </Select>
              </div>
            </div>
          </section>

          {/* Photos */}
          <section id="psec-photos" className="scroll-mt-20">
            <div className="mb-3">
              <h3 className="font-semibold text-base">Photos</h3>
              <p className="text-xs text-muted-foreground">Bill photo + goods photos for audit</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Bill photo */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Bill / Invoice photo</label>
                <label className="flex flex-col items-center justify-center gap-1 h-40 rounded-md border-2 border-dashed border-border hover:border-brand hover:bg-brand-soft/15 cursor-pointer transition-colors overflow-hidden">
                  {billPhoto ? (
                    <img src={billPhoto} alt="Bill" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <Camera className="h-5 w-5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Click or snap a photo of the bill</span>
                    </>
                  )}
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onBillFile} />
                </label>
                {billPhoto && (
                  <Button size="sm" variant="ghost" onClick={() => setBillPhoto(undefined)} className="mt-1"><X className="h-3 w-3" />Clear bill photo</Button>
                )}
              </div>
              {/* Goods photos */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Goods photos ({goodsPhotos.length})</label>
                <label className="flex flex-col items-center justify-center gap-1 h-40 rounded-md border-2 border-dashed border-border hover:border-brand hover:bg-brand-soft/15 cursor-pointer transition-colors">
                  <Camera className="h-5 w-5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Snap multiple photos · vegetables, packaging…</span>
                  <input type="file" accept="image/*" multiple capture="environment" className="hidden" onChange={onGoodsFiles} />
                </label>
                {goodsPhotos.length > 0 && (
                  <div className="grid grid-cols-4 gap-1.5 mt-2">
                    {goodsPhotos.map((p, i) => (
                      <div key={i} className="relative h-16 rounded-md overflow-hidden border border-border group">
                        <img src={p} alt={`Goods ${i + 1}`} className="w-full h-full object-cover" />
                        <button type="button" onClick={() => setGoodsPhotos(prev => prev.filter((_, j) => j !== i))}
                          className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-foreground/70 text-background hover:bg-danger inline-flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Notes */}
          <section id="psec-notes" className="scroll-mt-20">
            <div className="mb-3">
              <h3 className="font-semibold text-base">Notes</h3>
              <p className="text-xs text-muted-foreground">Audit-trail context</p>
            </div>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Special handling, supplier notes, GRN #, temperature check etc."
              className="w-full px-3 py-2 rounded-md border border-border bg-surface text-sm focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 outline-hidden resize-y" />
          </section>
        </main>

        {/* Right rail · live totals */}
        <aside className="w-80 border-l border-border bg-surface-sunken/30 overflow-y-auto p-4 hidden xl:block shrink-0 space-y-3">
          <Card className="p-4">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-2 inline-flex items-center gap-1.5"><ShoppingCart className="h-3 w-3" />Live totals</p>
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-xs text-muted-foreground">Taxable value</span><span className="tabular text-sm">{money(totals.taxableTotal)}</span></div>
              {!interState ? (<>
                <div className="flex justify-between"><span className="text-xs text-muted-foreground">CGST</span><span className="tabular text-sm text-muted-foreground">{money(totals.cgst)}</span></div>
                <div className="flex justify-between"><span className="text-xs text-muted-foreground">SGST</span><span className="tabular text-sm text-muted-foreground">{money(totals.sgst)}</span></div>
              </>) : (
                <div className="flex justify-between"><span className="text-xs text-muted-foreground">IGST</span><span className="tabular text-sm text-muted-foreground">{money(totals.igst)}</span></div>
              )}
              <div className="flex justify-between pt-1.5 mt-1 border-t border-border"><span className="text-xs">Subtotal</span><span className="tabular text-sm font-medium">{money(totals.subTotal)}</span></div>
              {discount > 0 && <div className="flex justify-between"><span className="text-xs text-muted-foreground">− Discount</span><span className="tabular text-sm text-muted-foreground">{money(discount)}</span></div>}
              {freight > 0 && <div className="flex justify-between"><span className="text-xs text-muted-foreground">+ Freight</span><span className="tabular text-sm text-muted-foreground">{money(freight)}</span></div>}
              {roundOff !== 0 && <div className="flex justify-between"><span className="text-xs text-muted-foreground">+ Round-off</span><span className="tabular text-sm text-muted-foreground">{money(roundOff)}</span></div>}
              <div className="flex justify-between pt-1.5 mt-1 border-t border-border"><span className="text-sm font-semibold">Grand total</span><span className="tabular text-base font-bold">{money(totals.grandTotal)}</span></div>
              <div className="flex justify-between text-success"><span className="text-xs">Paid</span><span className="tabular text-sm">{money(paidAmount)}</span></div>
              {balance > 0 && (
                <div className="flex justify-between"><span className="text-xs font-semibold text-warning">Balance due</span><span className="tabular text-sm font-bold text-warning">{money(balance)}</span></div>
              )}
            </dl>
          </Card>

          <Card className="p-4">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-2">Allocation</p>
            <dl className="space-y-1 text-xs">
              <div className="flex justify-between"><span>Category</span><span>{PURCHASE_CATEGORY_EMOJI[category]} {category}</span></div>
              <div className="flex justify-between"><span>Department</span><span>{department}</span></div>
              <div className="flex justify-between"><span>Storage</span><span>{storage}</span></div>
              <div className="flex justify-between"><span>Received by</span><span>{receivedBy}</span></div>
            </dl>
          </Card>

          <Card className="p-4 bg-info-soft/15 border-info/20">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-info mb-2">Validations</p>
            <ul className="text-[11px] space-y-1">
              <li className={cn("inline-flex items-center gap-1.5", vendor.trim() ? "text-success" : "text-muted-foreground")}>
                {vendor.trim() ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}Vendor specified
              </li>
              <li className={cn("inline-flex items-center gap-1.5", billNo.trim() ? "text-success" : "text-muted-foreground")}>
                {billNo.trim() ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}Bill no provided
              </li>
              <li className={cn("inline-flex items-center gap-1.5", lines.some(l => l.amount > 0) ? "text-success" : "text-muted-foreground")}>
                {lines.some(l => l.amount > 0) ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}At least one line with value
              </li>
              <li className={cn("inline-flex items-center gap-1.5", billPhoto ? "text-success" : "text-warning")}>
                {billPhoto ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}Bill photo attached
              </li>
              <li className={cn("inline-flex items-center gap-1.5", vendorGstin.length === 15 ? "text-success" : vendorGstin.length === 0 ? "text-muted-foreground" : "text-warning")}>
                {vendorGstin.length === 15 ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}GSTIN {vendorGstin.length === 15 ? "valid" : vendorGstin.length === 0 ? "optional" : "invalid length"}
              </li>
            </ul>
          </Card>
        </aside>
      </div>

      {/* Sticky footer */}
      <div className="h-16 border-t border-border bg-surface flex items-center px-5 gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <p className="text-[11px] text-muted-foreground">Grand total</p>
          <p className="text-xl font-bold tabular">{money(totals.grandTotal)}</p>
          <Badge tone={paymentStatus === "Paid" ? "success" : paymentStatus === "Partial" ? "warning" : paymentStatus === "On Credit" ? "info" : "danger"}>{paymentStatus}</Badge>
          {balance > 0 && <Badge tone="warning">balance {money(balance)}</Badge>}
        </div>
        <div className="flex-1" />
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="outline" disabled={!valid} onClick={() => handleSubmit(true)}>
          <Plus className="h-3.5 w-3.5" />Save &amp; add another
        </Button>
        <Button variant="success" disabled={!valid} onClick={() => handleSubmit(false)}>
          <CheckCircle2 className="h-3.5 w-3.5" />Save purchase
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// PURCHASE DETAIL VIEW MODAL
// ============================================================
function PurchaseDetailModal({ purchase, onClose, onEdit }: {
  purchase: Purchase;
  onClose: () => void;
  onEdit: () => void;
}) {
  React.useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; document.removeEventListener("keydown", onKey); };
  }, [onClose]);

  const totals = purchaseTotals(purchase);
  const balance = totals.grandTotal - purchase.paidAmount;

  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface rounded-xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="h-9 w-9 rounded-md bg-info-soft text-info inline-flex items-center justify-center"><Truck className="h-4 w-4" /></span>
            <div>
              <h3 className="font-semibold">Purchase · {purchase.billNo}</h3>
              <p className="text-xs text-muted-foreground">{purchase.vendor} · {purchase.date}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={onEdit}><Edit className="h-3.5 w-3.5" />Edit</Button>
            <button type="button" onClick={onClose} className="h-8 w-8 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
          </div>
        </div>

        <div className="px-5 py-4 space-y-4 overflow-y-auto">
          {/* Summary chips */}
          <div className="flex flex-wrap gap-1.5">
            <Badge tone="neutral">{PURCHASE_CATEGORY_EMOJI[purchase.category]} {purchase.category}</Badge>
            <Badge tone="neutral">{purchase.department}</Badge>
            <Badge tone={purchase.paymentStatus === "Paid" ? "success" : purchase.paymentStatus === "Partial" ? "warning" : purchase.paymentStatus === "On Credit" ? "info" : "danger"}>{purchase.paymentStatus}</Badge>
            <Badge tone={purchase.qcStatus === "Accepted" ? "success" : purchase.qcStatus === "Pending QC" ? "neutral" : purchase.qcStatus === "Partially Rejected" ? "warning" : "danger"}>QC: {purchase.qcStatus}</Badge>
            <Badge tone="neutral"><MapPin className="h-2.5 w-2.5" />{purchase.storage}</Badge>
          </div>

          {/* Vendor + bill */}
          <Card className="p-3 text-xs space-y-1">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Vendor &amp; bill</p>
            <p><strong>{purchase.vendor}</strong>{purchase.vendorPhone ? ` · ${purchase.vendorPhone}` : ""}</p>
            {purchase.vendorGstin && <p className="font-mono tabular text-muted-foreground">GSTIN {purchase.vendorGstin}{purchase.vendorPan ? ` · PAN ${purchase.vendorPan}` : ""}</p>}
            <p className="text-muted-foreground">Bill {purchase.billNo} dated {purchase.billDate}</p>
          </Card>

          {/* Line items */}
          <Card className="p-0 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-surface-elevated">
                <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2 text-right">Qty</th>
                  <th className="px-3 py-2 text-right">Rate</th>
                  <th className="px-3 py-2 text-right">GST</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {purchase.lines.map(l => (
                  <tr key={l.id}>
                    <td className="px-3 py-1.5">{l.item}</td>
                    <td className="px-3 py-1.5 text-right tabular">{l.qty} {l.unit}</td>
                    <td className="px-3 py-1.5 text-right tabular">{money(l.rate)}</td>
                    <td className="px-3 py-1.5 text-right tabular text-muted-foreground">{l.gstPct > 0 ? `${money(l.tax)} (${l.gstPct}%)` : "—"}</td>
                    <td className="px-3 py-1.5 text-right tabular font-medium">{money(l.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Totals */}
          <Card className="p-3">
            <dl className="space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Taxable</span><span className="tabular">{money(totals.taxableTotal)}</span></div>
              {purchase.interState ? (
                <div className="flex justify-between"><span className="text-muted-foreground">IGST</span><span className="tabular">{money(totals.igst)}</span></div>
              ) : (<>
                <div className="flex justify-between"><span className="text-muted-foreground">CGST</span><span className="tabular">{money(totals.cgst)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">SGST</span><span className="tabular">{money(totals.sgst)}</span></div>
              </>)}
              {purchase.discount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">− Discount</span><span className="tabular">{money(purchase.discount)}</span></div>}
              {purchase.freight > 0 && <div className="flex justify-between"><span className="text-muted-foreground">+ Freight</span><span className="tabular">{money(purchase.freight)}</span></div>}
              {purchase.roundOff !== 0 && <div className="flex justify-between"><span className="text-muted-foreground">+ Round-off</span><span className="tabular">{money(purchase.roundOff)}</span></div>}
              <div className="flex justify-between pt-1.5 mt-1 border-t border-border"><span className="font-semibold">Grand total</span><span className="tabular font-bold text-base">{money(totals.grandTotal)}</span></div>
              <div className="flex justify-between text-success"><span>Paid {purchase.paymentMode ? `· ${purchase.paymentMode}` : ""}</span><span className="tabular">{money(purchase.paidAmount)}</span></div>
              {balance > 0 && <div className="flex justify-between"><span className="font-semibold text-warning">Balance due</span><span className="tabular font-bold text-warning">{money(balance)}</span></div>}
              {purchase.paymentRef && <p className="text-[10px] text-muted-foreground tabular pt-1">Ref: {purchase.paymentRef}</p>}
            </dl>
          </Card>

          {/* Photos */}
          {(purchase.billPhoto || (purchase.goodsPhotos && purchase.goodsPhotos.length > 0)) && (
            <div>
              <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Photos</p>
              <div className="grid grid-cols-4 gap-2">
                {purchase.billPhoto && (
                  <div className="aspect-square rounded-md border border-border overflow-hidden">
                    <img src={purchase.billPhoto} alt="Bill" className="w-full h-full object-cover" />
                  </div>
                )}
                {purchase.goodsPhotos?.map((p, i) => (
                  <div key={i} className="aspect-square rounded-md border border-border overflow-hidden">
                    <img src={p} alt={`Goods ${i + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {purchase.notes && (
            <Card className="p-3 bg-info-soft/15 border-info/20 text-xs italic">&ldquo;{purchase.notes}&rdquo;</Card>
          )}

          {/* Footer line */}
          <p className="text-[11px] text-muted-foreground text-center">
            Received by <strong>{purchase.receivedBy}</strong> · Stored at <strong>{purchase.storage}</strong>
          </p>
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-border bg-surface-sunken/30">
          <Button variant="ghost" onClick={onClose}>Close</Button>
          <Button variant="outline" onClick={() => window.print()}><FileDown className="h-3.5 w-3.5" />Print GRN</Button>
        </div>
      </div>
    </div>
  );
}
