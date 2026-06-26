"use client";
import * as React from "react";
import {
  Building2, Layers, BedDouble, Tag, Calendar, Utensils, Briefcase,
  Receipt, MessageSquare, KeySquare, CheckCircle2, AlertCircle, Edit, Save, X,
  Plus, Trash2, Search, Eye, Cigarette, Accessibility, Wifi, Phone,
  Mountain, Sun, Trees, Waves, Ruler, Users, Bed, IndianRupee, Layers3,
  Copy, ChevronLeft, ChevronRight, Settings, Palette, Plug, Database,
  Upload, ImageIcon, Mail, Cloud, Lock, RefreshCw, FileText, ShieldCheck,
  User, Bell, Webhook, RotateCcw,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn, money } from "@/lib/utils";
import { apiGet, apiPut, apiPost, apiUpload, apiDownload, syncList } from "@/lib/api";
import { PreferencesPanel, SecurityPanel, NotificationChannelsPanel, WebhooksPanel, useSettingsPersistence } from "./personal-panels";
import { MenuItemsManager } from "./menu-items-manager";
import { GroupServicesManager } from "./group-services-manager";
import { PricingRulesManager } from "./pricing-rules-manager";
import { RateRestrictionsManager } from "./rate-restrictions-manager";
import { TablesManager } from "./tables-manager";
import { NAV, GROUP_LABEL } from "@/lib/nav";
import { applyBranding } from "@/lib/use-branding";
import { Switch } from "@/components/ui/switch";

// Monotonic counter for client-side temp ids on newly-added rows (replaced by
// the real DB id once the create round-trips). Pure & collision-free.
let __tempSeq = 0;
const tempSeq = () => ++__tempSeq;

// Maps the Property & Branch field-grid labels to the Laravel API columns.
// This is the section now backed by Postgres (via hotel-pms-api).
const PROPERTY_API_FIELDS: { key: string; label: string }[] = [
  { key: "property_name", label: "Property name" },
  { key: "owner_email", label: "Owner email" },
  { key: "overbooking", label: "Over-booking" },
  { key: "branch", label: "Branch" },
  { key: "currency", label: "Currency" },
  { key: "country", label: "Country" },
  { key: "gst_state", label: "State (GST)" },
  { key: "city", label: "City" },
  { key: "pin_code", label: "PIN code" },
  { key: "checkin_time", label: "Check-in time" },
  { key: "checkout_time", label: "Checkout time" },
  { key: "default_advance", label: "Default advance" },
  { key: "gstin", label: "GSTIN (15-char)" },
  { key: "pan", label: "PAN (10-char)" },
  { key: "fssai_license", label: "FSSAI License" },
  { key: "sac_code", label: "Hotel SAC code" },
  { key: "cin", label: "CIN (Corporate)" },
  { key: "logo", label: "Logo" },
];

type SectionGroup = "Personal" | "Property" | "Inventory" | "Rates & Packages" | "Partners & Compliance" | "Guest Experience" | "System";

const SECTIONS = [
  { id: "preferences",  group: "Personal" as SectionGroup,                label: "My Preferences",           icon: User,         hint: "Language · theme · density (per-user)", accent: "brand" as const },
  { id: "security",     group: "Personal" as SectionGroup,                label: "Security & Sign-in",       icon: Lock,         hint: "2FA · password · sessions",      accent: "warning" as const },
  { id: "property",     group: "Property" as SectionGroup,                label: "Property & Branch",        icon: Building2,    hint: "The Pearl Marina · Main Tower",  accent: "brand"   as const },
  { id: "branding",     group: "Property" as SectionGroup,                label: "Branding & Assets",        icon: Palette,      hint: "Logo · letterhead · email signature", accent: "brand" as const },
  { id: "floors",       group: "Inventory" as SectionGroup,               label: "Floors",                   icon: Layers,       hint: "Define each floor",              accent: "info"    as const },
  { id: "room-types",   group: "Inventory" as SectionGroup,               label: "Room Types",               icon: BedDouble,    hint: "Categories · rates · occupancy", accent: "info"    as const },
  { id: "rooms",        group: "Inventory" as SectionGroup,               label: "Rooms",                     icon: BedDouble,    hint: "Assign each room a type",        accent: "info"    as const },
  { id: "tables",       group: "Inventory" as SectionGroup,               label: "Restaurant Tables",        icon: Utensils,     hint: "POS floor map · seats · zones",  accent: "info"    as const },
  { id: "pricing",      group: "Rates & Packages" as SectionGroup,        label: "Pricing & Rate Plans",     icon: Tag,          hint: "5 rate plans · weekend +20%",    accent: "accent"  as const },
  { id: "seasons",      group: "Rates & Packages" as SectionGroup,        label: "Seasons & Holidays",       icon: Calendar,     hint: "Define peak / off-peak windows", accent: "accent"  as const },
  { id: "food",         group: "Rates & Packages" as SectionGroup,        label: "Food & Hall Packages",     icon: Utensils,     hint: "4 F&B · 6 hall packages",        accent: "accent"  as const },
  { id: "menu-items",  group: "Rates & Packages" as SectionGroup,        label: "Menu Items",               icon: Utensils,     hint: "Dish catalog · price · photo · POS", accent: "accent"  as const },
  { id: "group-services", group: "Rates & Packages" as SectionGroup,     label: "Group Services",           icon: Utensils,     hint: "Halls · meals · decor · transfers for groups", accent: "accent" as const },
  { id: "pricing-rules", group: "Rates & Packages" as SectionGroup,      label: "Pricing Rules",            icon: Tag,          hint: "Dynamic rate adjustments · triggers", accent: "accent" as const },
  { id: "rate-restrictions", group: "Rates & Packages" as SectionGroup,  label: "Rate Restrictions",        icon: Calendar,     hint: "Min-stay · CTA/CTD · stop-sell", accent: "accent" as const },
  { id: "agents",       group: "Partners & Compliance" as SectionGroup,   label: "Agents & Corporates",      icon: Briefcase,    hint: "6 accounts with credit",         accent: "warning" as const },
  { id: "tax",          group: "Partners & Compliance" as SectionGroup,   label: "Tax & Payment Methods",    icon: Receipt,      hint: "GST 18% · 6 payment methods",    accent: "warning" as const },
  { id: "integrations", group: "Partners & Compliance" as SectionGroup,   label: "Integrations",             icon: Plug,         hint: "OTAs · WhatsApp · POS · accounting", accent: "warning" as const },
  { id: "templates",    group: "Guest Experience" as SectionGroup,        label: "Notification Templates",   icon: MessageSquare, hint: "8 templates · 4 languages",     accent: "success" as const },
  { id: "channels",     group: "Guest Experience" as SectionGroup,        label: "Channels & Quiet Hours",   icon: Bell,         hint: "Email · WhatsApp · SMS · quiet hours", accent: "success" as const },
  { id: "roles",        group: "Guest Experience" as SectionGroup,        label: "Roles & Permissions",      icon: KeySquare,    hint: "10 roles · matrix configured",   accent: "success" as const },
  { id: "backup",       group: "System" as SectionGroup,                  label: "Backup & Audit Trail",     icon: Database,     hint: "Nightly backup · setup audit log", accent: "info" as const },
  { id: "webhooks",     group: "System" as SectionGroup,                  label: "Webhooks",                 icon: Webhook,      hint: "Outgoing event webhooks",        accent: "info" as const },
];

const GROUP_ORDER: SectionGroup[] = ["Personal", "Property", "Inventory", "Rates & Packages", "Partners & Compliance", "Guest Experience", "System"];
type SectionId = typeof SECTIONS[number]["id"];

const ACCENT_RING: Record<string, string> = {
  brand: "bg-brand-soft text-brand-soft-foreground ring-brand/20",
  info: "bg-info-soft text-info ring-info/20",
  accent: "bg-accent-soft text-accent ring-accent/20",
  warning: "bg-warning-soft text-warning ring-warning/20",
  success: "bg-success-soft text-success ring-success/20",
};

type StringField = { kind: "string"; label: string; value: string };
type NumberField = { kind: "number"; label: string; value: number; suffix?: string };
type SelectField = { kind: "select"; label: string; value: string; options: string[] };
type Field = StringField | NumberField | SelectField;

// ============ FLOORS & ROOMS TYPES ============
type FloorStatus = "active" | "renovation" | "blocked";
type Floor = {
  id: string;
  number: number;          // 0 = Ground, -1 = Basement, etc.
  name: string;            // "Ground", "1st", "Penthouse"
  amenities: string[];     // ["Ice machine", "Pantry", "Vending"]
  smokingAllowed: boolean;
  vipFloor: boolean;
  hasElevator: boolean;
  housekeepingZone: string; // e.g. "Zone A"
  status: FloorStatus;
};

const FLOOR_AMENITY_OPTIONS = ["Ice machine", "Vending", "Pantry", "Concierge desk", "Linen closet", "Service lift", "Fire exit", "CCTV"];

// A room's category is the name of a managed Room Type (free-form so custom
// types like "Villa" or "Studio" work, not just the built-in seven).
type RoomCategory = string;

type RoomType = {
  id: string;
  name: string;
  code?: string;
  baseTariff: number;
  maxAdults: number;
  maxChildren: number;
  extraAdultRate?: number;
  extraChildRate?: number;
  sizeSqft?: number;
  description?: string;
  amenities: string[];
  active: boolean;
};
type BedConfig = "1 King" | "1 Queen" | "2 Queens" | "2 Twins" | "1 King + 1 Sofa" | "2 Twins + 1 Sofa";
type ViewType = "Sea" | "City" | "Garden" | "Pool" | "Mountain" | "Courtyard" | "None";
type RoomStatus = "active" | "out-of-order" | "renovation" | "blocked";
type Room = {
  id: string;
  number: string;
  category: RoomCategory;
  floor: number;
  bedConfig: BedConfig;
  maxAdults: number;
  maxChildren: number;
  sizeSqft: number;
  view: ViewType;
  baseTariff: number;
  extraBedAllowed: boolean;
  extraBedRate: number;
  connectingRoom: string;     // "" if none, else room number
  extension: string;          // EPABX extension
  wifiSsid: string;           // Wi-Fi network for this room
  smoking: boolean;
  accessible: boolean;        // wheelchair accessible
  amenities: string[];
  status: RoomStatus;
};

const ROOM_CATEGORIES: RoomCategory[] = ["Queen", "Deluxe", "Suite", "King", "Family", "Executive", "Presidential"];

const ROOM_TYPES_SEED: RoomType[] = [
  { id: "rt1", name: "Queen", code: "QN", baseTariff: 4500, maxAdults: 2, maxChildren: 1, sizeSqft: 280, description: "Queen bed · city view", amenities: ["Smart TV", "Mini-bar", "In-room safe"], active: true },
  { id: "rt2", name: "Deluxe", code: "DLX", baseTariff: 6500, maxAdults: 2, maxChildren: 1, sizeSqft: 340, description: "King bed · marina view", amenities: ["Smart TV", "Mini-bar", "In-room safe", "Bathrobe"], active: true },
  { id: "rt3", name: "Suite", code: "STE", baseTariff: 12000, maxAdults: 4, maxChildren: 1, sizeSqft: 620, description: "Separate living room · marina view", amenities: ["Smart TV", "Mini-bar", "In-room safe", "Lounge access"], active: true },
  { id: "rt4", name: "King", code: "KNG", baseTariff: 8500, maxAdults: 2, maxChildren: 1, sizeSqft: 400, description: "King bed · high floor", amenities: ["Smart TV", "Mini-bar", "In-room safe"], active: true },
  { id: "rt5", name: "Family", code: "FAM", baseTariff: 9500, maxAdults: 4, maxChildren: 2, sizeSqft: 520, description: "Two queen beds · family friendly", amenities: ["Smart TV", "Mini-bar", "In-room safe", "Sofa bed"], active: true },
  { id: "rt6", name: "Executive", code: "EXE", baseTariff: 15000, maxAdults: 2, maxChildren: 1, sizeSqft: 700, description: "Executive lounge · premium amenities", amenities: ["Smart TV", "Mini-bar", "In-room safe", "Lounge access"], active: true },
  { id: "rt7", name: "Presidential", code: "PRES", baseTariff: 45000, maxAdults: 4, maxChildren: 2, sizeSqft: 1400, description: "Top-floor suite · panoramic view", amenities: ["Smart TV", "Mini-bar", "In-room safe", "Butler service"], active: true },
];
const BED_CONFIGS: BedConfig[] = ["1 King", "1 Queen", "2 Queens", "2 Twins", "1 King + 1 Sofa", "2 Twins + 1 Sofa"];
const VIEW_OPTIONS: ViewType[] = ["Sea", "City", "Garden", "Pool", "Mountain", "Courtyard", "None"];
const ROOM_AMENITY_OPTIONS = [
  "Smart TV", "Mini-bar", "In-room safe", "Tea/Coffee maker", "Iron & board",
  "Hair-dryer", "Bathrobe", "Slippers", "Bath-tub", "Rain shower",
  "Work desk", "Balcony", "Sit-out", "Sofa", "Walk-in closet",
];

const VIEW_ICON: Record<ViewType, typeof Sun> = {
  "Sea": Waves, "City": Building2, "Garden": Trees, "Pool": Waves,
  "Mountain": Mountain, "Courtyard": Sun, "None": Sun,
};

// ============ INITIAL SEEDS ============
const FLOORS_SEED: Floor[] = [
  { id: "fl0", number: 0, name: "Ground", amenities: ["Concierge desk", "Service lift", "CCTV"], smokingAllowed: false, vipFloor: false, hasElevator: true, housekeepingZone: "Zone A", status: "active" },
  { id: "fl1", number: 1, name: "1st", amenities: ["Ice machine", "Pantry", "Linen closet"], smokingAllowed: false, vipFloor: false, hasElevator: true, housekeepingZone: "Zone A", status: "active" },
  { id: "fl2", number: 2, name: "2nd", amenities: ["Vending", "Pantry"], smokingAllowed: false, vipFloor: false, hasElevator: true, housekeepingZone: "Zone B", status: "active" },
  { id: "fl3", number: 3, name: "3rd", amenities: ["Pantry"], smokingAllowed: true, vipFloor: false, hasElevator: true, housekeepingZone: "Zone B", status: "active" },
  { id: "fl4", number: 4, name: "4th", amenities: ["Ice machine", "Pantry"], smokingAllowed: false, vipFloor: true, hasElevator: true, housekeepingZone: "Zone C", status: "active" },
  { id: "fl5", number: 5, name: "5th", amenities: ["Pantry"], smokingAllowed: false, vipFloor: true, hasElevator: true, housekeepingZone: "Zone C", status: "active" },
  { id: "fl6", number: 6, name: "Penthouse", amenities: ["Concierge desk", "Pantry"], smokingAllowed: false, vipFloor: true, hasElevator: true, housekeepingZone: "Zone D", status: "active" },
];

function newRoom(num: string, floor: number, category: RoomCategory, base: number, view: ViewType, beds: BedConfig, sqft: number, amen: string[] = ["Smart TV", "Mini-bar", "In-room safe"]): Room {
  return {
    id: `r-${num}`, number: num, category, floor,
    bedConfig: beds, maxAdults: category === "Suite" || category === "Presidential" ? 4 : category === "Family" ? 4 : 2,
    maxChildren: category === "Family" ? 2 : 1, sizeSqft: sqft, view, baseTariff: base,
    extraBedAllowed: category !== "Queen", extraBedRate: 1500, connectingRoom: "",
    extension: `7${num}`, wifiSsid: "PearlGuest", smoking: false, accessible: false,
    amenities: amen, status: "active",
  };
}

const ROOMS_SEED: Room[] = [
  newRoom("101", 1, "Queen",      6500, "Garden",  "1 Queen",  280, ["Smart TV", "Mini-bar", "In-room safe", "Hair-dryer"]),
  newRoom("102", 1, "Queen",      6500, "Garden",  "1 Queen",  280, ["Smart TV", "Mini-bar", "Hair-dryer"]),
  newRoom("103", 1, "Deluxe",     8500, "City",    "1 King",   340, ["Smart TV", "Mini-bar", "In-room safe", "Bath-tub", "Bathrobe"]),
  newRoom("104", 1, "Deluxe",     8500, "City",    "2 Queens", 340, ["Smart TV", "Mini-bar", "In-room safe", "Work desk"]),
  newRoom("201", 2, "Deluxe",     8800, "City",    "1 King",   340, ["Smart TV", "Mini-bar", "Bath-tub", "Balcony"]),
  newRoom("202", 2, "Deluxe",     8800, "City",    "1 King",   340, ["Smart TV", "Mini-bar", "Bath-tub"]),
  newRoom("301", 3, "King",       12000, "Sea",    "1 King",   420, ["Smart TV", "Mini-bar", "In-room safe", "Rain shower", "Balcony"]),
  newRoom("302", 3, "King",       12000, "Sea",    "1 King",   420, ["Smart TV", "Mini-bar", "Rain shower", "Sit-out"]),
  newRoom("401", 4, "Suite",      18000, "Sea",    "1 King + 1 Sofa", 620, ["Smart TV", "Mini-bar", "In-room safe", "Rain shower", "Bath-tub", "Work desk", "Sofa", "Balcony"]),
  newRoom("402", 4, "Suite",      18000, "Sea",    "1 King + 1 Sofa", 620, ["Smart TV", "Mini-bar", "Rain shower", "Bath-tub", "Walk-in closet"]),
  newRoom("501", 5, "Executive",  22000, "Sea",    "1 King",   480, ["Smart TV", "Mini-bar", "In-room safe", "Work desk", "Rain shower", "Bathrobe"]),
  newRoom("PH1", 6, "Presidential", 65000, "Sea",  "1 King + 1 Sofa", 1450, ["Smart TV", "Mini-bar", "In-room safe", "Rain shower", "Bath-tub", "Walk-in closet", "Balcony", "Sofa", "Bathrobe", "Slippers"]),
];
// Mark a couple of states for realism
ROOMS_SEED[6].smoking = true;
ROOMS_SEED[3].accessible = true;
ROOMS_SEED[1].status = "out-of-order";
ROOMS_SEED[10].status = "renovation";
ROOMS_SEED[2].connectingRoom = "104";
ROOMS_SEED[3].connectingRoom = "103";

// ============ PRICING / RATE PLANS ============
type RatePlan = {
  id: string; code: string; name: string;
  inclBreakfast: boolean; inclLunch: boolean; inclDinner: boolean;
  discountPct: number; refundable: boolean; active: boolean;
  breakfastPrice?: number; lunchPrice?: number; dinnerPrice?: number;
};
const RATE_PLANS_SEED: RatePlan[] = [
  { id: "rp1", code: "EP", name: "European Plan — Room only", inclBreakfast: false, inclLunch: false, inclDinner: false, discountPct: 0, refundable: true, active: true },
  { id: "rp2", code: "CP", name: "Continental — Room + Breakfast", inclBreakfast: true, inclLunch: false, inclDinner: false, discountPct: 0, refundable: true, active: true },
  { id: "rp3", code: "MAP", name: "Modified American — + 1 meal", inclBreakfast: true, inclLunch: false, inclDinner: true, discountPct: 0, refundable: true, active: true },
  { id: "rp4", code: "AP", name: "American — All meals", inclBreakfast: true, inclLunch: true, inclDinner: true, discountPct: 0, refundable: true, active: true },
  { id: "rp5", code: "CORP", name: "Corporate", inclBreakfast: true, inclLunch: false, inclDinner: false, discountPct: 15, refundable: true, active: true },
  { id: "rp6", code: "NR", name: "Non-refundable", inclBreakfast: true, inclLunch: false, inclDinner: false, discountPct: 20, refundable: false, active: true },
];

// ============ SEASONS & HOLIDAYS ============
type Season = { id: string; name: string; from: string; to: string; multiplier: number; active: boolean };
type Holiday = { id: string; name: string; date: string; kind: "national" | "religious" | "local"; surchargePct: number };
const SEASONS_SEED: Season[] = [
  { id: "se1", name: "Year-end peak", from: "2026-12-20", to: "2027-01-05", multiplier: 1.5, active: true },
  { id: "se2", name: "Diwali week", from: "2026-10-28", to: "2026-11-05", multiplier: 1.3, active: true },
  { id: "se3", name: "Monsoon off-peak", from: "2026-06-01", to: "2026-09-15", multiplier: 0.8, active: true },
];
const HOLIDAYS_SEED: Holiday[] = [
  { id: "h1", name: "Republic Day", date: "2027-01-26", kind: "national", surchargePct: 10 },
  { id: "h2", name: "Holi", date: "2027-03-14", kind: "religious", surchargePct: 10 },
  { id: "h3", name: "Independence Day", date: "2027-08-15", kind: "national", surchargePct: 10 },
  { id: "h4", name: "Gandhi Jayanti", date: "2027-10-02", kind: "national", surchargePct: 5 },
  { id: "h5", name: "Diwali", date: "2026-11-01", kind: "religious", surchargePct: 25 },
  { id: "h6", name: "Christmas", date: "2026-12-25", kind: "religious", surchargePct: 15 },
];

// ============ F&B + HALL PACKAGES ============
type FBPackage = { id: string; name: string; type: "Breakfast" | "Lunch" | "Dinner" | "High Tea" | "Buffet"; pax: number; price: number; gst: number; active: boolean };
type HallPackage = { id: string; name: string; capacity: number; hourly: number; halfDay: number; fullDay: number; setupFee: number; gst: number; extraPaxFee: number; active: boolean };
type BanquetPkg = { id: string; name: string; desc: string; pricePerPax: number; veg: boolean; active: boolean };
type ExtraSvc = { id: string; label: string; price: number; active: boolean };
const FB_PACKAGES_SEED: FBPackage[] = [
  { id: "fb1", name: "Continental Breakfast", type: "Breakfast", pax: 1, price: 450, gst: 5, active: true },
  { id: "fb2", name: "Buffet Lunch — Veg",   type: "Lunch",     pax: 1, price: 850, gst: 5, active: true },
  { id: "fb3", name: "Buffet Dinner — Mixed", type: "Dinner",   pax: 1, price: 1200, gst: 5, active: true },
  { id: "fb4", name: "High Tea Platter",     type: "High Tea",  pax: 1, price: 650, gst: 5, active: true },
];
const HALL_PACKAGES_SEED: HallPackage[] = [
  { id: "hp1", name: "Banquet A · Wedding", capacity: 300, hourly: 8500, halfDay: 38000, fullDay: 72000, setupFee: 5000, gst: 18, extraPaxFee: 0, active: true },
  { id: "hp2", name: "Banquet B · Corporate", capacity: 150, hourly: 5500, halfDay: 25000, fullDay: 45000, setupFee: 3500, gst: 18, extraPaxFee: 0, active: true },
  { id: "hp3", name: "Garden Pavilion", capacity: 200, hourly: 7000, halfDay: 30000, fullDay: 55000, setupFee: 4000, gst: 18, extraPaxFee: 0, active: true },
  { id: "hp4", name: "Crystal Hall · Gala", capacity: 500, hourly: 12000, halfDay: 55000, fullDay: 110000, setupFee: 8000, gst: 18, extraPaxFee: 0, active: true },
  { id: "hp5", name: "Conference Room 1", capacity: 40, hourly: 1500, halfDay: 6000, fullDay: 11000, setupFee: 800, gst: 18, extraPaxFee: 0, active: true },
  { id: "hp6", name: "Conference Room 2", capacity: 25, hourly: 1000, halfDay: 4000, fullDay: 7500, setupFee: 500, gst: 18, extraPaxFee: 0, active: true },
];

// ============ AGENTS & CORPORATES ============
type AgentRec = {
  id: string; type: "Agent" | "Corporate"; name: string; contact: string; phone: string; email: string;
  gstin: string; creditLimit: number; commissionPct: number; creditTerms: "Net 7" | "Net 15" | "Net 30" | "Net 45" | "Net 60"; active: boolean;
};
const AGENTS_SEED: AgentRec[] = [
  { id: "ag1", type: "Agent", name: "ABC Travels", contact: "Mr. Sharma", phone: "+91 98765 43210", email: "abc@travels.in", gstin: "27ABCDE1234F1Z5", creditLimit: 500000, commissionPct: 12, creditTerms: "Net 30", active: true },
  { id: "ag2", type: "Agent", name: "Pearl Holidays", contact: "Ms. Khalifa", phone: "+91 91234 56789", email: "pearl@holidays.in", gstin: "27FGHIJ5678K1Z6", creditLimit: 300000, commissionPct: 10, creditTerms: "Net 30", active: true },
  { id: "ag3", type: "Agent", name: "Skyline Tours", contact: "Mr. Pereira", phone: "+91 99887 76655", email: "info@skyline.in", gstin: "27KLMNO9012P1Z7", creditLimit: 400000, commissionPct: 15, creditTerms: "Net 15", active: true },
  { id: "ag4", type: "Corporate", name: "TechCorp FZ-LLC", contact: "HR Dept.", phone: "+91 96543 21098", email: "travel@techcorp.in", gstin: "27QRSTU3456V1Z8", creditLimit: 1000000, commissionPct: 0, creditTerms: "Net 30", active: true },
  { id: "ag5", type: "Corporate", name: "Emirates Bank", contact: "Admin", phone: "+91 95432 10987", email: "vendor@embank.in", gstin: "27WXYZA7890B1Z9", creditLimit: 800000, commissionPct: 0, creditTerms: "Net 45", active: true },
  { id: "ag6", type: "Corporate", name: "Global Oil Co.", contact: "Procurement", phone: "+91 94321 09876", email: "po@globaloil.in", gstin: "27CDEFG1234H1Z0", creditLimit: 1500000, commissionPct: 0, creditTerms: "Net 60", active: true },
];

// ============ TAX / GST SLABS + PAYMENT METHODS ============
type GSTSlab = { id: string; label: string; from: number; to: number | null; rate: number };
type PaymentMethod = { id: string; name: string; code: string; type: "Cash" | "Card" | "Online" | "Bank" | "Credit"; feePct: number; settlement: string; active: boolean };
const GST_SLABS_SEED: GSTSlab[] = [
  { id: "g1", label: "Economy (≤ ₹1,000)", from: 0, to: 1000, rate: 0 },
  { id: "g2", label: "Mid-range (₹1,001 – ₹7,500)", from: 1001, to: 7500, rate: 12 },
  { id: "g3", label: "Luxury (> ₹7,500)", from: 7501, to: null, rate: 18 },
];
const PAYMENT_METHODS_SEED: PaymentMethod[] = [
  { id: "pm1", name: "Cash", code: "CASH", type: "Cash", feePct: 0, settlement: "Cash drawer", active: true },
  { id: "pm2", name: "UPI", code: "UPI", type: "Online", feePct: 0, settlement: "HDFC Current A/c — 5012", active: true },
  { id: "pm3", name: "Visa / MasterCard", code: "CARD", type: "Card", feePct: 1.8, settlement: "HDFC Current A/c — 5012", active: true },
  { id: "pm4", name: "American Express", code: "AMEX", type: "Card", feePct: 2.5, settlement: "HDFC Current A/c — 5012", active: true },
  { id: "pm5", name: "Net Banking", code: "NB", type: "Online", feePct: 0.5, settlement: "HDFC Current A/c — 5012", active: true },
  { id: "pm6", name: "NEFT / RTGS / IMPS", code: "BANK", type: "Bank", feePct: 0, settlement: "HDFC Current A/c — 5012", active: true },
  { id: "pm7", name: "Paytm", code: "PAYTM", type: "Online", feePct: 1.2, settlement: "Paytm Business", active: true },
  { id: "pm8", name: "PhonePe", code: "PPE", type: "Online", feePct: 0, settlement: "Paytm Business", active: true },
  { id: "pm9", name: "Razorpay (web)", code: "RZP", type: "Online", feePct: 2.0, settlement: "Razorpay Auto-settle", active: true },
  { id: "pm10", name: "Agent / Corporate Credit", code: "CREDIT", type: "Credit", feePct: 0, settlement: "Per agreement", active: true },
];

// ============ NOTIFICATION TEMPLATES ============
type Template = { id: string; event: string; channel: "Email" | "WhatsApp" | "SMS"; language: "English" | "Hindi" | "Marathi" | "Arabic"; active: boolean };
const TEMPLATES_SEED: Template[] = [
  { id: "t1", event: "Booking Confirmation", channel: "Email", language: "English", active: true },
  { id: "t2", event: "Booking Confirmation", channel: "WhatsApp", language: "English", active: true },
  { id: "t3", event: "Booking Confirmation", channel: "WhatsApp", language: "Hindi", active: true },
  { id: "t4", event: "Pre-arrival Reminder (24h)", channel: "WhatsApp", language: "English", active: true },
  { id: "t5", event: "Check-in Welcome", channel: "WhatsApp", language: "English", active: true },
  { id: "t6", event: "Folio / Invoice", channel: "Email", language: "English", active: true },
  { id: "t7", event: "Checkout Thank-you", channel: "Email", language: "English", active: true },
  { id: "t8", event: "Birthday Greeting", channel: "WhatsApp", language: "English", active: true },
  { id: "t9", event: "Payment Receipt", channel: "WhatsApp", language: "English", active: true },
  { id: "t10", event: "Cancellation Notice", channel: "Email", language: "English", active: false },
];

// ============ ROLES & PERMISSIONS ============
const PERMISSION_GROUPS: { group: string; perms: string[] }[] = [
  { group: "Bookings", perms: ["Create", "Modify", "Cancel", "Reassign room", "Discount"] },
  { group: "Folio", perms: ["View", "Add charge", "Refund", "Void", "Apply credit"] },
  { group: "Cashier", perms: ["Open shift", "Close shift", "Cash drop", "Settle"] },
  { group: "Reports", perms: ["View all", "Export", "Audit logs"] },
  { group: "Setup", perms: ["Property", "Rates", "Users", "Tax"] },
];
type Role = { id: string; name: string; users: number; permissions: Set<string>; active: boolean };
const makeRolePerms = (...keep: string[]) => new Set(keep);
const ROLES_SEED: Role[] = [
  { id: "ro1", name: "Owner", users: 1, permissions: makeRolePerms(...PERMISSION_GROUPS.flatMap(g => g.perms.map(p => `${g.group}:${p}`))), active: true },
  { id: "ro2", name: "General Manager", users: 1, permissions: makeRolePerms(
    "Bookings:Create", "Bookings:Modify", "Bookings:Cancel", "Bookings:Reassign room", "Bookings:Discount",
    "Folio:View", "Folio:Add charge", "Folio:Refund", "Folio:Void", "Folio:Apply credit",
    "Cashier:Open shift", "Cashier:Close shift", "Cashier:Settle",
    "Reports:View all", "Reports:Export", "Reports:Audit logs",
    "Setup:Rates", "Setup:Users",
  ), active: true },
  { id: "ro3", name: "Front Desk Manager", users: 2, permissions: makeRolePerms(
    "Bookings:Create", "Bookings:Modify", "Bookings:Cancel", "Bookings:Reassign room",
    "Folio:View", "Folio:Add charge", "Folio:Apply credit",
    "Cashier:Open shift", "Cashier:Close shift", "Cashier:Settle",
    "Reports:View all",
  ), active: true },
  { id: "ro4", name: "Reception", users: 4, permissions: makeRolePerms(
    "Bookings:Create", "Bookings:Modify",
    "Folio:View", "Folio:Add charge",
    "Cashier:Open shift", "Cashier:Close shift", "Cashier:Settle",
  ), active: true },
  { id: "ro5", name: "Cashier", users: 2, permissions: makeRolePerms(
    "Folio:View",
    "Cashier:Open shift", "Cashier:Close shift", "Cashier:Cash drop", "Cashier:Settle",
  ), active: true },
  { id: "ro6", name: "Accounts", users: 2, permissions: makeRolePerms(
    "Folio:View", "Folio:Refund", "Folio:Void",
    "Reports:View all", "Reports:Export", "Reports:Audit logs",
  ), active: true },
  { id: "ro7", name: "Housekeeping Supervisor", users: 1, permissions: makeRolePerms("Reports:View all"), active: true },
  { id: "ro8", name: "Housekeeping", users: 8, permissions: makeRolePerms(), active: true },
  { id: "ro9", name: "F&B Manager", users: 1, permissions: makeRolePerms("Bookings:Discount", "Folio:View", "Folio:Add charge", "Reports:View all"), active: true },
  { id: "ro10", name: "Auditor (read-only)", users: 1, permissions: makeRolePerms("Reports:View all", "Reports:Audit logs"), active: true },
];

const INDIAN_STATES = [
  "Maharashtra (27)", "Delhi (07)", "Karnataka (29)", "Tamil Nadu (33)", "Telangana (36)",
  "Kerala (32)", "Goa (30)", "Gujarat (24)", "Rajasthan (08)", "Uttar Pradesh (09)",
  "Punjab (03)", "Haryana (06)", "West Bengal (19)", "Andhra Pradesh (37)", "Odisha (21)",
];

const INITIAL_DATA: Record<SectionId, Field[]> = {
  // Custom-rendered sections (own panels) — no generic field grid, but the
  // Record type requires every section id to be present.
  preferences: [],
  security: [],
  channels: [],
  webhooks: [],
  property: [
    { kind: "string", label: "Property name", value: "The Pearl Palace" },
    { kind: "string", label: "Owner email", value: "owner@pearlmarina.com" },
    { kind: "select", label: "Over-booking", value: "Blocked (manager override)", options: ["Blocked (manager override)", "Allowed"] },
    { kind: "string", label: "Branch", value: "Main Tower · Mumbai (default)" },
    { kind: "select", label: "Currency", value: "INR — Indian Rupee (₹)", options: ["INR — Indian Rupee (₹)", "USD", "EUR", "GBP", "AED"] },
    { kind: "select", label: "Country", value: "India", options: ["India", "UAE", "USA", "UK", "Singapore"] },
    { kind: "select", label: "State (GST)", value: "Maharashtra (27)", options: INDIAN_STATES },
    { kind: "string", label: "City", value: "Mumbai" },
    { kind: "string", label: "PIN code", value: "400050" },
    { kind: "string", label: "Check-in time", value: "12:00 PM" },
    { kind: "string", label: "Checkout time", value: "11:00 AM" },
    { kind: "number", label: "Default advance", value: 30, suffix: "%" },
    { kind: "string", label: "GSTIN (15-char)", value: "27AAACR5055K1Z5" },
    { kind: "string", label: "PAN (10-char)", value: "AAACR5055K" },
    { kind: "string", label: "FSSAI License", value: "11522999000123" },
    { kind: "string", label: "Hotel SAC code", value: "9963 (Accommodation)" },
    { kind: "string", label: "CIN (Corporate)", value: "U55101MH2018PTC123456" },
    { kind: "string", label: "Logo", value: "logo_240x120.png" },
  ],
  floors: [
    { kind: "number", label: "Number of floors", value: 6 },
    { kind: "number", label: "Total rooms", value: 68 },
  ],
  "room-types": [],
  rooms: [
    { kind: "number", label: "Total rooms", value: 68 },
    { kind: "string", label: "Floor 1-5 (12 rooms each)", value: "Queen / Deluxe / King" },
    { kind: "string", label: "Floor 6 (8 rooms)", value: "Suite / Executive" },
  ],
  pricing: [
    { kind: "string", label: "Rate plans", value: "EP · CP · MAP · AP · Corporate" },
    { kind: "number", label: "Weekend uplift", value: 20, suffix: "%" },
    { kind: "number", label: "Extra bed (incl. breakfast)", value: 1500, suffix: "₹" },
    { kind: "string", label: "Children policy", value: "Under 5 free · 5-12 50%" },
    { kind: "select", label: "Tariff display", value: "Exclusive of GST", options: ["Exclusive of GST", "Inclusive of GST"] },
  ],
  seasons: [
    { kind: "string", label: "Peak season", value: "Dec 20 – Jan 5 · Apr (Easter)" },
    { kind: "string", label: "Off-peak", value: "Jun – Sep (Monsoon)" },
    { kind: "string", label: "Holidays", value: "Republic Day, Holi, Independence Day, Gandhi Jayanti, Diwali, Christmas" },
  ],
  "menu-items": [],
  "group-services": [],
  "pricing-rules": [],
  "rate-restrictions": [],
  "tables": [],
  food: [
    { kind: "number", label: "F&B packages", value: 4 },
    { kind: "number", label: "Hall packages", value: 6 },
    { kind: "number", label: "Service charge", value: 10, suffix: "%" },
    { kind: "number", label: "F&B GST (no ITC)", value: 5, suffix: "%" },
    { kind: "number", label: "Banquet GST", value: 18, suffix: "%" },
  ],
  agents: [
    { kind: "number", label: "Active accounts", value: 6 },
    { kind: "number", label: "Default agent commission", value: 12, suffix: "%" },
    { kind: "select", label: "Default credit terms", value: "Net 30", options: ["Net 7", "Net 15", "Net 30", "Net 45", "Net 60"] },
    { kind: "number", label: "TDS on commission (194H)", value: 5, suffix: "%" },
  ],
  tax: [
    { kind: "select", label: "Room GST slab", value: "Auto (slab-based)", options: ["Auto (slab-based)", "0% (tariff ≤ ₹1,000)", "12% (tariff ₹1,001-7,500)", "18% (tariff > ₹7,500)"] },
    { kind: "string", label: "Slab structure", value: "₹0-1,000 → 0% · ₹1,001-7,500 → 12% · ₹7,501+ → 18%" },
    { kind: "select", label: "Tax split", value: "CGST + SGST (intra-state)", options: ["CGST + SGST (intra-state)", "IGST (inter-state)", "Auto by Place of Supply"] },
    { kind: "number", label: "Service charge (F&B)", value: 10, suffix: "%" },
    { kind: "number", label: "TCS on luxury (>₹50,000)", value: 1, suffix: "%" },
    { kind: "string", label: "Payment methods", value: "Cash, UPI, Card, Net Banking, NEFT, RTGS, IMPS, Cheque, Paytm, PhonePe, Razorpay, Agent Credit" },
    { kind: "select", label: "e-Invoice (mandatory above ₹5 Cr turnover)", value: "Enabled · NIC Portal", options: ["Enabled · NIC Portal", "Enabled · GSP", "Disabled"] },
    { kind: "string", label: "GST Returns Filed", value: "GSTR-1 (monthly) · GSTR-3B (monthly) · GSTR-9 (annual)" },
  ],
  templates: [
    { kind: "number", label: "Templates configured", value: 8 },
    { kind: "string", label: "Languages", value: "English, Arabic, Hindi, Russian" },
    { kind: "select", label: "Default channel", value: "Email + WhatsApp", options: ["Email only", "WhatsApp only", "Email + WhatsApp", "All channels"] },
  ],
  roles: [
    { kind: "number", label: "Roles configured", value: 10 },
    { kind: "select", label: "Default new-user role", value: "Reception", options: ["Reception", "Manager", "Owner", "Accounts", "Housekeeping", "Restaurant"] },
    { kind: "string", label: "Permission matrix", value: "Configured per role" },
  ],
};

export function SetupView() {
  const [active, setActive] = React.useState<SectionId>(SECTIONS[0].id);
  const [data, setData] = React.useState<Record<SectionId, Field[]>>(INITIAL_DATA);
  const [editingId, setEditingId] = React.useState<SectionId | null>(null);
  const [draft, setDraft] = React.useState<Field[]>([]);
  const [completed, setCompleted] = React.useState<Set<SectionId>>(
    new Set(SECTIONS.filter(s => s.id !== "seasons").map(s => s.id))
  );
  const [toast, setToast] = React.useState<string | null>(null);

  // Master inventory/config state — loaded from Postgres on mount (no hardcoded seed data).
  const [floors, setFloors] = React.useState<Floor[]>([]);
  const [rooms, setRooms] = React.useState<Room[]>([]);
  const [roomTypes, setRoomTypes] = React.useState<RoomType[]>([]);

  // Additional manager states
  const [ratePlans, setRatePlans] = React.useState<RatePlan[]>([]);
  const [seasons, setSeasons] = React.useState<Season[]>([]);
  const [holidays, setHolidays] = React.useState<Holiday[]>([]);
  const [fbPkgs, setFbPkgs] = React.useState<FBPackage[]>([]);
  const [hallPkgs, setHallPkgs] = React.useState<HallPackage[]>([]);
  const [banquetPkgs, setBanquetPkgs] = React.useState<BanquetPkg[]>([]);
  const [extraServices, setExtraServices] = React.useState<ExtraSvc[]>([]);
  const [agents, setAgents] = React.useState<AgentRec[]>([]);
  const [gstSlabs, setGstSlabs] = React.useState<GSTSlab[]>([]);
  const [paymentMethods, setPaymentMethods] = React.useState<PaymentMethod[]>([]);
  const [templates, setTemplates] = React.useState<Template[]>([]);
  const [roles, setRoles] = React.useState<Role[]>([]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  // Load the Property & Branch section from the Postgres-backed API on mount.
  // Falls back silently to the bundled defaults if the backend is offline.
  React.useEffect(() => {
    let cancelled = false;
    apiGet<Record<string, unknown>>("/property")
      .then(row => {
        if (cancelled) return;
        setData(d => ({
          ...d,
          property: d.property.map(f => {
            const m = PROPERTY_API_FIELDS.find(x => x.label === f.label);
            if (!m || row[m.key] === undefined || row[m.key] === null) return f;
            const value = f.kind === "number" ? Number(row[m.key]) : String(row[m.key]);
            return { ...f, value } as Field;
          }),
        }));
      })
      .catch(() => { if (!cancelled) showToast("⚠ Backend offline"); });
    return () => { cancelled = true; };
  }, []);

  // Load every list section from Postgres on mount. Falls back to seeds if offline.
  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => {
    let cancelled = false;
    const loads = [
      apiGet<Floor[]>("/floors").then(r => { if (!cancelled) setFloors(r); }),
      apiGet<Room[]>("/rooms").then(r => { if (!cancelled) setRooms(r); }),
      apiGet<RoomType[]>("/room-types").then(r => { if (!cancelled) setRoomTypes(r); }),
      apiGet<RatePlan[]>("/rate-plans").then(r => { if (!cancelled) setRatePlans(r); }),
      apiGet<Season[]>("/seasons").then(r => { if (!cancelled) setSeasons(r); }),
      apiGet<Holiday[]>("/holidays").then(r => { if (!cancelled) setHolidays(r); }),
      apiGet<FBPackage[]>("/fb-packages").then(r => { if (!cancelled) setFbPkgs(r); }),
      apiGet<HallPackage[]>("/hall-packages").then(r => { if (!cancelled) setHallPkgs(r); }),
      apiGet<BanquetPkg[]>("/banquet-packages").then(r => { if (!cancelled) setBanquetPkgs(r); }),
      apiGet<ExtraSvc[]>("/extra-services").then(r => { if (!cancelled) setExtraServices(r); }),
      apiGet<AgentRec[]>("/agents").then(r => { if (!cancelled) setAgents(r); }),
      apiGet<GSTSlab[]>("/gst-slabs").then(r => { if (!cancelled) setGstSlabs(r); }),
      apiGet<PaymentMethod[]>("/payment-methods").then(r => { if (!cancelled) setPaymentMethods(r); }),
      apiGet<Template[]>("/notification-templates").then(r => { if (!cancelled) setTemplates(r); }),
      apiGet<Array<Omit<Role, "permissions"> & { permissions: string[] }>>("/roles")
        .then(r => { if (!cancelled) setRoles(r.map(x => ({ ...x, permissions: new Set<string>(x.permissions ?? []) }))); }),
    ];
    Promise.allSettled(loads).then(results => {
      if (cancelled) return;
      setLoading(false);
      if (results.some(x => x.status === "rejected")) showToast("⚠ Backend offline");
    });
    return () => { cancelled = true; };
  }, []);

  // Load persisted setup progress (which sections are marked complete).
  const progressLoaded = React.useRef(false);
  React.useEffect(() => {
    apiGet<{ completed?: string[] }>("/settings/setup-progress")
      .then(v => { if (v?.completed?.length) setCompleted(new Set(v.completed as SectionId[])); })
      .catch(() => {})
      .finally(() => { progressLoaded.current = true; });
  }, []);
  // Save progress whenever it changes (after the initial load).
  React.useEffect(() => {
    if (!progressLoaded.current) return;
    apiPut("/settings/setup-progress", { completed: Array.from(completed) }).catch(() => {});
  }, [completed]);

  // Optimistically update local state immediately, then debounce the DB sync so
  // typing into a field saves once (~600ms after you stop), not per keystroke.
  const debounceRef = React.useRef<Record<string, { timer: ReturnType<typeof setTimeout>; prev: unknown[] }>>({});
  function persistList<T extends { id: unknown }>(resource: string, prev: T[], next: T[], setter: (v: T[]) => void) {
    setter(next); // immediate, responsive UI
    const store = debounceRef.current;
    if (!store[resource]) store[resource] = { timer: setTimeout(() => {}, 0), prev }; // capture server-truth at burst start
    const entry = store[resource];
    clearTimeout(entry.timer);
    entry.timer = setTimeout(() => {
      const startPrev = entry.prev as T[];
      delete store[resource];
      syncList(resource, startPrev, next)
        .then(setter)
        .catch(() => showToast("⚠ Save failed — backend offline"));
    }, 600);
  }

  // Roles carry permissions as a Set client-side; convert to/from arrays for the API.
  const persistRoles = (next: Role[]) => {
    setRoles(next);
    const toApi = (r: Role) => ({ ...r, permissions: Array.from(r.permissions) });
    syncList("roles", roles.map(toApi), next.map(toApi))
      .then(rows => setRoles(rows.map(x => ({ ...x, permissions: new Set<string>(x.permissions ?? []) }))))
      .catch(() => showToast("⚠ Save failed — backend offline"));
  };

  const cur = SECTIONS.find(s => s.id === active)!;
  const isEditing = editingId === active;
  const done = completed.size;

  // Live counts to keep the section list hints accurate
  const dynamicHint = (id: SectionId): string => {
    const s = SECTIONS.find(x => x.id === id)!;
    if (id === "floors") return `${floors.length} floor${floors.length === 1 ? "" : "s"} defined`;
    if (id === "room-types") return `${roomTypes.length} room type${roomTypes.length === 1 ? "" : "s"}`;
    if (id === "rooms") return `${rooms.length} rooms configured`;
    if (id === "pricing") return `${ratePlans.filter(r => r.active).length} active rate plans`;
    if (id === "seasons") return `${seasons.filter(s => s.active).length} seasons · ${holidays.length} holidays`;
    if (id === "food") return `${fbPkgs.length} F&B · ${hallPkgs.length} hall packages`;
    if (id === "agents") return `${agents.filter(a => a.active).length} active · ₹${(agents.reduce((t, a) => t + a.creditLimit, 0) / 100000).toFixed(0)}L credit`;
    if (id === "tax") return `${gstSlabs.length} GST slabs · ${paymentMethods.filter(p => p.active).length} payment methods`;
    if (id === "templates") return `${templates.filter(t => t.active).length}/${templates.length} active templates`;
    if (id === "roles") return `${roles.length} roles · ${roles.reduce((t, r) => t + r.users, 0)} users`;
    return s.hint;
  };

  // List of sections that use a custom manager instead of the generic field grid
  const CUSTOM_SECTIONS = new Set<SectionId>(["preferences", "security", "channels", "webhooks", "floors", "room-types", "rooms", "pricing", "seasons", "food", "menu-items", "group-services", "pricing-rules", "rate-restrictions", "tables", "agents", "tax", "templates", "roles", "branding", "integrations", "backup"]);
  const isCustom = CUSTOM_SECTIONS.has(active);

  const startEdit = () => {
    setDraft(structuredClone(data[active]));
    setEditingId(active);
  };
  const cancelEdit = () => {
    setEditingId(null);
    setDraft([]);
  };
  const saveEdit = async () => {
    // Property & Branch persists to Postgres via the Laravel API; other
    // sections still save locally (they get their own endpoints next).
    if (active === "property") {
      const payload: Record<string, string | number> = {};
      for (const f of draft) {
        const m = PROPERTY_API_FIELDS.find(x => x.label === f.label);
        if (m) payload[m.key] = f.kind === "number" ? Number(f.value) : String(f.value);
      }
      try {
        await apiPut("/property", payload);
      } catch {
        setToast("⚠ Save failed — backend offline");
        setTimeout(() => setToast(null), 2500);
        return;
      }
    }
    setData(d => ({ ...d, [active]: draft }));
    setCompleted(c => new Set([...c, active]));
    setEditingId(null);
    setDraft([]);
    setToast(active === "property" ? "Property & Branch saved to database ✓" : `${cur.label} saved`);
    setTimeout(() => setToast(null), 2200);
  };

  const updateField = (idx: number, value: string | number) => {
    setDraft(d => d.map((f, i) => i === idx ? ({ ...f, value }) as Field : f));
  };

  const pct = Math.round((done / SECTIONS.length) * 100);
  const activeIdx = SECTIONS.findIndex(s => s.id === active);
  const prevSection = SECTIONS[activeIdx - 1];
  const nextSection = SECTIONS[activeIdx + 1];

  // Group sections by category for the sidebar
  const sectionsByGroup = React.useMemo(() => {
    const map: Record<SectionGroup, typeof SECTIONS> = { "Personal": [], "Property": [], "Inventory": [], "Rates & Packages": [], "Partners & Compliance": [], "Guest Experience": [], "System": [] };
    SECTIONS.forEach(s => { map[s.group].push(s); });
    return map;
  }, []);

  // Sidebar search filter
  const [navSearch, setNavSearch] = React.useState("");
  const matchesNav = (s: typeof SECTIONS[number]) => {
    const q = navSearch.trim().toLowerCase();
    if (!q) return true;
    return `${s.label} ${s.group} ${s.hint}`.toLowerCase().includes(q);
  };

  return (
    <div className="min-h-svh bg-gradient-to-b from-surface-sunken/30 via-background to-background">
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* ============ HERO HEADER ============ */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-brand text-brand-foreground inline-flex items-center justify-center shadow-md ring-4 ring-brand/10">
              <Settings className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">Configuration</p>
              <h1 className="text-3xl font-display font-medium tracking-tight">Configuration</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Setup &amp; settings in one place — everything the app reads from.</p>
              {loading && (
                <p className="text-xs text-muted-foreground mt-1 inline-flex items-center gap-1.5">
                  <RefreshCw className="h-3 w-3 animate-spin" /> Loading from database…
                </p>
              )}
            </div>
          </div>

          {/* Completion ring */}
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 shadow-sm">
            <CompletionRing pct={pct} size={48} />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Setup progress</p>
              <p className="text-base font-semibold tabular leading-tight"><span className="text-foreground">{done}</span><span className="text-muted-foreground"> / {SECTIONS.length}</span> sections</p>
              <p className="text-[11px] text-muted-foreground">{pct}% configured</p>
            </div>
          </div>
        </div>

        {/* ============ MAIN GRID ============ */}
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5">
          {/* ===== Sidebar ===== */}
          <Card className="p-3 h-fit lg:sticky lg:top-20 overflow-hidden">
            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-subtle-foreground" />
              <Input value={navSearch} onChange={e => setNavSearch(e.target.value)} placeholder="Search settings…" className="pl-9 h-9 bg-surface-sunken/40 border-transparent focus-visible:border-ring" />
              <kbd className="hidden md:inline-flex absolute right-2 top-1/2 -translate-y-1/2 h-5 items-center rounded border border-border bg-surface px-1.5 text-[10px] font-mono text-muted-foreground">⌘K</kbd>
            </div>

            {/* Grouped section list */}
            <nav className="space-y-4 max-h-[calc(100svh-12rem)] overflow-y-auto pr-1">
              {GROUP_ORDER.map(group => {
                const sectionsInGroup = sectionsByGroup[group].filter(matchesNav);
                if (sectionsInGroup.length === 0) return null;
                return (
                  <div key={group}>
                    <p className="px-2 mb-1.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground/80 font-semibold">{group}</p>
                    <ul className="space-y-0.5">
                      {sectionsInGroup.map(s => {
                        const Icon = s.icon;
                        const isActive = active === s.id;
                        const isComplete = completed.has(s.id);
                        return (
                          <li key={s.id}>
                            <button
                              type="button"
                              onClick={() => { setActive(s.id); cancelEdit(); }}
                              className={cn(
                                "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all relative group",
                                isActive
                                  ? "bg-brand-soft text-brand-soft-foreground shadow-xs"
                                  : "hover:bg-surface-sunken"
                              )}
                            >
                              {/* Left brand bar on active */}
                              {isActive && <span aria-hidden className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-brand" />}
                              <span className={cn(
                                "h-7 w-7 rounded-md ring-1 flex items-center justify-center shrink-0 transition-all",
                                isActive ? ACCENT_RING[s.accent] : "bg-surface-sunken text-muted-foreground ring-transparent group-hover:ring-border"
                              )}>
                                <Icon className="h-3.5 w-3.5" />
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className={cn("text-sm font-medium truncate", isActive ? "text-foreground" : "text-foreground/90")}>{s.label}</p>
                                <p className="text-[10.5px] text-muted-foreground truncate">{dynamicHint(s.id)}</p>
                              </div>
                              {isComplete
                                ? <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                                : <span className="h-1.5 w-1.5 rounded-full bg-warning shrink-0" />}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
              {SECTIONS.filter(matchesNav).length === 0 && (
                <div className="px-3 py-6 text-center text-xs text-muted-foreground">No matches for &ldquo;{navSearch}&rdquo;</div>
              )}
            </nav>
          </Card>

          {/* ===== Main panel ===== */}
          <Card className="p-0 overflow-hidden">
            {/* Section header bar */}
            <div className="px-6 pt-5 pb-4 border-b border-border bg-gradient-to-b from-surface to-surface-sunken/20">
              {/* Breadcrumb */}
              <p className="text-[11px] text-muted-foreground mb-3 inline-flex items-center gap-1.5">
                <Settings className="h-3 w-3" />
                <span>Configuration</span>
                <ChevronRight className="h-3 w-3 opacity-50" />
                <span>{cur.group}</span>
                <ChevronRight className="h-3 w-3 opacity-50" />
                <span className="text-foreground font-medium">{cur.label}</span>
              </p>

              <div className="flex items-start gap-4">
                <span className={cn("h-14 w-14 rounded-xl ring-4 flex items-center justify-center shrink-0", ACCENT_RING[cur.accent])}>
                  <cur.icon className="h-7 w-7" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-2xl font-display font-medium tracking-tight">{cur.label}</h2>
                    {completed.has(active)
                      ? <Badge tone="success"><CheckCircle2 className="h-3 w-3" />configured</Badge>
                      : <Badge tone="warning"><AlertCircle className="h-3 w-3" />needs setup</Badge>}
                    {isEditing && <Badge tone="info">editing</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{dynamicHint(active)}</p>
                </div>

                {/* Right side: prev/next + edit/save */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="hidden md:inline-flex gap-1 mr-2">
                    <button
                      type="button"
                      disabled={!prevSection}
                      onClick={() => prevSection && (setActive(prevSection.id), cancelEdit())}
                      className="h-9 w-9 rounded-md border border-border hover:bg-surface-sunken disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center transition-colors"
                      title={prevSection ? `Previous: ${prevSection.label}` : "First section"}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      disabled={!nextSection}
                      onClick={() => nextSection && (setActive(nextSection.id), cancelEdit())}
                      className="h-9 w-9 rounded-md border border-border hover:bg-surface-sunken disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center transition-colors"
                      title={nextSection ? `Next: ${nextSection.label}` : "Last section"}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                  {!isCustom && (
                    !isEditing ? (
                      <Button onClick={startEdit}><Edit className="h-4 w-4" />Edit</Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button variant="ghost" onClick={cancelEdit}><X className="h-4 w-4" />Cancel</Button>
                        <Button onClick={saveEdit} variant="success"><Save className="h-4 w-4" />Save</Button>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-5">
            {active === "preferences" && <PreferencesPanel />}
            {active === "security" && <SecurityPanel />}
            {active === "channels" && <NotificationChannelsPanel />}
            {active === "webhooks" && <WebhooksPanel />}
            {active === "floors" && (
              <FloorsManager floors={floors} rooms={rooms} onChange={next => persistList("floors", floors, next, setFloors)} onToast={showToast}
                onMarkComplete={() => setCompleted(c => new Set([...c, "floors"]))} />
            )}
            {active === "room-types" && (
              <RoomTypesManager roomTypes={roomTypes} rooms={rooms} onChange={next => persistList("room-types", roomTypes, next, setRoomTypes)} onToast={showToast}
                onMarkComplete={() => setCompleted(c => new Set([...c, "room-types"]))} />
            )}
            {active === "rooms" && (
              <RoomsManager rooms={rooms} floors={floors} roomTypes={roomTypes} onChange={next => persistList("rooms", rooms, next, setRooms)} onToast={showToast}
                onMarkComplete={() => setCompleted(c => new Set([...c, "rooms"]))} />
            )}
            {active === "pricing" && (
              <RatePlansManager plans={ratePlans} onChange={next => persistList("rate-plans", ratePlans, next, setRatePlans)} onToast={showToast}
                onMarkComplete={() => setCompleted(c => new Set([...c, "pricing"]))} />
            )}
            {active === "seasons" && (
              <SeasonsManager seasons={seasons} holidays={holidays} onSeasonsChange={next => persistList("seasons", seasons, next, setSeasons)} onHolidaysChange={next => persistList("holidays", holidays, next, setHolidays)} onToast={showToast}
                onMarkComplete={() => setCompleted(c => new Set([...c, "seasons"]))} />
            )}
            {active === "food" && (
              <FoodHallManager fb={fbPkgs} halls={hallPkgs} banquet={banquetPkgs} extras={extraServices}
                onFbChange={next => persistList("fb-packages", fbPkgs, next, setFbPkgs)} onHallsChange={next => persistList("hall-packages", hallPkgs, next, setHallPkgs)}
                onBanquetChange={next => persistList("banquet-packages", banquetPkgs, next, setBanquetPkgs)} onExtrasChange={next => persistList("extra-services", extraServices, next, setExtraServices)}
                onToast={showToast}
                onMarkComplete={() => setCompleted(c => new Set([...c, "food"]))} />
            )}
            {active === "menu-items" && <MenuItemsManager onToast={showToast} />}
            {active === "group-services" && <GroupServicesManager onToast={showToast} />}
            {active === "pricing-rules" && <PricingRulesManager onToast={showToast} />}
            {active === "rate-restrictions" && <RateRestrictionsManager onToast={showToast} />}
            {active === "tables" && <TablesManager onToast={showToast} />}
            {active === "agents" && (
              <AgentsManager agents={agents} onChange={next => persistList("agents", agents, next, setAgents)} onToast={showToast}
                onMarkComplete={() => setCompleted(c => new Set([...c, "agents"]))} />
            )}
            {active === "tax" && (
              <TaxManager slabs={gstSlabs} methods={paymentMethods} onSlabsChange={next => persistList("gst-slabs", gstSlabs, next, setGstSlabs)} onMethodsChange={next => persistList("payment-methods", paymentMethods, next, setPaymentMethods)} onToast={showToast}
                onMarkComplete={() => setCompleted(c => new Set([...c, "tax"]))} />
            )}
            {active === "templates" && (
              <TemplatesManager templates={templates} onChange={next => persistList("notification-templates", templates, next, setTemplates)} onToast={showToast}
                onMarkComplete={() => setCompleted(c => new Set([...c, "templates"]))} />
            )}
            {active === "roles" && (
              <RolesManager roles={roles} onChange={persistRoles} onToast={showToast}
                onMarkComplete={() => setCompleted(c => new Set([...c, "roles"]))} />
            )}
            {active === "branding" && (
              <BrandingManager onToast={showToast}
                onMarkComplete={() => setCompleted(c => new Set([...c, "branding"]))} />
            )}
            {active === "integrations" && (
              <IntegrationsManager onToast={showToast}
                onMarkComplete={() => setCompleted(c => new Set([...c, "integrations"]))} />
            )}
            {active === "backup" && (
              <BackupManager onToast={showToast}
                onMarkComplete={() => setCompleted(c => new Set([...c, "backup"]))} />
            )}

            {/* === GENERIC FIELD GRID === */}
            {!isCustom && (
              !isEditing ? (
                <div className="space-y-0">
                  {data[active].map((f, i) => (
                    <div key={i} className="flex items-center justify-between py-2 text-sm border-b border-border last:border-0">
                      <span className="text-muted-foreground">{f.label}</span>
                      <span className="font-medium">{f.value}{f.kind === "number" && f.suffix ? ` ${f.suffix}` : ""}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {draft.map((f, i) => (
                    <div key={i} className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                      <Label className="sm:col-span-1">{f.label}</Label>
                      <div className="sm:col-span-2">
                        {f.kind === "string" && (
                          <Input value={f.value} onChange={e => updateField(i, e.target.value)} />
                        )}
                        {f.kind === "number" && (
                          <div className="flex items-center gap-2">
                            <Input type="number" value={f.value} onChange={e => updateField(i, Number(e.target.value))} className="flex-1" />
                            {f.suffix && <span className="text-xs text-muted-foreground tabular w-12 text-right">{f.suffix}</span>}
                          </div>
                        )}
                        {f.kind === "select" && (
                          <Select value={f.value} onChange={e => updateField(i, e.target.value)}>
                            {f.options.map(o => <option key={o}>{o}</option>)}
                          </Select>
                        )}
                      </div>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground pt-2 border-t border-border mt-4">
                    Changes are saved when you click <span className="text-foreground font-medium">Save</span> · all other app modules read from these values.
                  </p>
                </div>
              )
            )}
            </div>

            {/* Footer prev/next nav */}
            <div className="px-6 py-3 border-t border-border bg-surface-sunken/30 flex items-center justify-between">
              {prevSection ? (
                <button
                  type="button"
                  onClick={() => { setActive(prevSection.id); cancelEdit(); }}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>Previous · <span className="text-foreground">{prevSection.label}</span></span>
                </button>
              ) : <span />}
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                {activeIdx + 1} <span className="opacity-50">of</span> {SECTIONS.length}
              </p>
              {nextSection ? (
                <button
                  type="button"
                  onClick={() => { setActive(nextSection.id); cancelEdit(); }}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span>Next · <span className="text-foreground">{nextSection.label}</span></span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              ) : <span />}
            </div>
          </Card>
        </div>

        {/* Save toast */}
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 bg-foreground text-background rounded-lg px-4 py-3 text-sm shadow-2xl animate-in slide-in-from-bottom-2 inline-flex items-center gap-2.5 ring-1 ring-foreground/20">
            <span className="h-6 w-6 rounded-full bg-success text-white inline-flex items-center justify-center"><CheckCircle2 className="h-3.5 w-3.5" /></span>
            <span className="font-medium">{toast}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Animated SVG completion ring
function CompletionRing({ pct, size = 48 }: { pct: number; size?: number }) {
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--surface-sunken))" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={pct >= 100 ? "hsl(var(--success))" : "hsl(var(--brand))"}
          strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[10px] font-semibold tabular text-foreground">{pct}%</span>
      </div>
    </div>
  );
}

// ===================== FLOORS MANAGER =====================
function FloorsManager({
  floors, rooms, onChange, onToast, onMarkComplete,
}: {
  floors: Floor[];
  rooms: Room[];
  onChange: (next: Floor[]) => void;
  onToast: (msg: string) => void;
  onMarkComplete: () => void;
}) {
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const roomsByFloor = React.useMemo(() => {
    const map: Record<number, Room[]> = {};
    rooms.forEach(r => { (map[r.floor] ??= []).push(r); });
    return map;
  }, [rooms]);

  const update = (id: string, patch: Partial<Floor>) => {
    onChange(floors.map(f => f.id === id ? { ...f, ...patch } : f));
  };
  const remove = (id: string) => {
    if (roomsByFloor[floors.find(f => f.id === id)?.number ?? -99]?.length) {
      onToast("Cannot delete a floor with rooms · move or delete the rooms first");
      return;
    }
    onChange(floors.filter(f => f.id !== id));
    onToast("Floor removed");
  };
  const addFloor = () => {
    const nextNum = (floors.reduce((m, f) => Math.max(m, f.number), 0)) + 1;
    const id = `fl${tempSeq()}`;
    onChange([...floors, {
      id, number: nextNum,
      name: nextNum === 0 ? "Ground" : `${nextNum}${nextNum % 10 === 1 ? "st" : nextNum % 10 === 2 ? "nd" : nextNum % 10 === 3 ? "rd" : "th"}`,
      amenities: ["Pantry"], smokingAllowed: false, vipFloor: false, hasElevator: true,
      housekeepingZone: "Zone A", status: "active",
    }]);
    setEditingId(id);
    onToast(`Floor ${nextNum} added`);
  };
  const toggleAmenity = (id: string, amenity: string) => {
    const f = floors.find(x => x.id === id);
    if (!f) return;
    const has = f.amenities.includes(amenity);
    update(id, { amenities: has ? f.amenities.filter(a => a !== amenity) : [...f.amenities, amenity] });
  };

  const totalRooms = rooms.length;

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <SummaryStat icon={Layers3} label="Floors" value={floors.length} />
        <SummaryStat icon={BedDouble} label="Total rooms" value={totalRooms} />
        <SummaryStat icon={Building2} label="VIP floors" value={floors.filter(f => f.vipFloor).length} />
        <SummaryStat icon={Cigarette} label="Smoking floors" value={floors.filter(f => f.smokingAllowed).length} />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Define each floor — room counts populate from the Rooms tab.</p>
        <Button size="sm" onClick={addFloor}><Plus className="h-3.5 w-3.5" />Add floor</Button>
      </div>

      <div className="rounded-md border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-elevated border-b border-border">
            <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-3 py-2 font-semibold">Floor</th>
              <th className="px-3 py-2 font-semibold">Name</th>
              <th className="px-3 py-2 font-semibold text-right">Rooms</th>
              <th className="px-3 py-2 font-semibold">Range</th>
              <th className="px-3 py-2 font-semibold">HK Zone</th>
              <th className="px-3 py-2 font-semibold">Amenities</th>
              <th className="px-3 py-2 font-semibold">Flags</th>
              <th className="px-3 py-2 font-semibold">Status</th>
              <th className="px-3 py-2 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {[...floors].sort((a, b) => b.number - a.number).map(f => {
              const fr = roomsByFloor[f.number] ?? [];
              const nums = fr.map(r => r.number).sort();
              const range = nums.length ? `${nums[0]}–${nums[nums.length - 1]}` : "—";
              const isEditing = editingId === f.id;
              return (
                <React.Fragment key={f.id}>
                  <tr className="hover:bg-surface-sunken/30">
                    <td className="px-3 py-2 font-semibold tabular">{f.number}</td>
                    <td className="px-3 py-2">
                      {isEditing
                        ? <Input value={f.name} onChange={e => update(f.id, { name: e.target.value })} className="h-8" />
                        : <span className="font-medium">{f.name}</span>}
                    </td>
                    <td className="px-3 py-2 text-right tabular">{fr.length}</td>
                    <td className="px-3 py-2 text-xs tabular text-muted-foreground">{range}</td>
                    <td className="px-3 py-2">
                      {isEditing ? (
                        <Select value={f.housekeepingZone} onChange={e => update(f.id, { housekeepingZone: e.target.value })} className="h-8">
                          <option>Zone A</option><option>Zone B</option><option>Zone C</option><option>Zone D</option>
                        </Select>
                      ) : <span className="text-xs">{f.housekeepingZone}</span>}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {f.amenities.slice(0, 3).map(a => <Badge key={a} tone="neutral">{a}</Badge>)}
                        {f.amenities.length > 3 && <Badge tone="neutral">+{f.amenities.length - 3}</Badge>}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        {f.vipFloor && <Badge tone="brand">VIP</Badge>}
                        {f.smokingAllowed && <Badge tone="warning"><Cigarette className="h-2.5 w-2.5" />Smoking</Badge>}
                        {f.hasElevator && <Badge tone="success">Lift</Badge>}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      {isEditing ? (
                        <Select value={f.status} onChange={e => update(f.id, { status: e.target.value as FloorStatus })} className="h-8">
                          <option value="active">Active</option>
                          <option value="renovation">Renovation</option>
                          <option value="blocked">Blocked</option>
                        </Select>
                      ) : (
                        <Badge tone={f.status === "active" ? "success" : f.status === "renovation" ? "warning" : "danger"}>{f.status}</Badge>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="inline-flex gap-1">
                        <button
                          type="button"
                          onClick={() => setEditingId(isEditing ? null : f.id)}
                          className="h-7 w-7 rounded-md border border-border hover:bg-brand hover:text-brand-foreground hover:border-brand inline-flex items-center justify-center text-muted-foreground transition-colors"
                          title={isEditing ? "Done" : "Edit"}
                        >
                          {isEditing ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Edit className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(f.id)}
                          className="h-7 w-7 rounded-md border border-border hover:bg-danger hover:text-white hover:border-danger inline-flex items-center justify-center text-muted-foreground transition-colors"
                          title="Delete floor"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {/* Expanded edit panel */}
                  {isEditing && (
                    <tr>
                      <td colSpan={9} className="px-3 py-3 bg-surface-sunken/30 border-t border-border">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                          <CheckboxRow label="VIP floor" checked={f.vipFloor} onChange={v => update(f.id, { vipFloor: v })} />
                          <CheckboxRow label="Smoking allowed" checked={f.smokingAllowed} onChange={v => update(f.id, { smokingAllowed: v })} />
                          <CheckboxRow label="Elevator access" checked={f.hasElevator} onChange={v => update(f.id, { hasElevator: v })} />
                        </div>
                        <div className="mt-3">
                          <Label className="text-[10px] uppercase tracking-wider">Floor amenities</Label>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {FLOOR_AMENITY_OPTIONS.map(a => {
                              const on = f.amenities.includes(a);
                              return (
                                <button
                                  key={a}
                                  type="button"
                                  onClick={() => toggleAmenity(f.id, a)}
                                  className={cn(
                                    "h-7 px-2.5 rounded-full text-[11px] font-medium border transition-colors",
                                    on ? "bg-brand-soft border-brand text-brand-soft-foreground" : "border-border hover:bg-surface-sunken text-muted-foreground"
                                  )}
                                >
                                  {on && <CheckCircle2 className="h-3 w-3 inline mr-1" />}{a}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-end pt-3 border-t border-border">
        <Button variant="success" onClick={() => { onMarkComplete(); onToast("Floors configuration saved"); }}>
          <Save className="h-4 w-4" />Save Floors
        </Button>
      </div>
    </div>
  );
}

// ===================== ROOMS MANAGER =====================
function RoomsManager({
  rooms, floors, roomTypes, onChange, onToast, onMarkComplete,
}: {
  rooms: Room[];
  floors: Floor[];
  roomTypes: RoomType[];
  onChange: (next: Room[]) => void;
  onToast: (msg: string) => void;
  onMarkComplete: () => void;
}) {
  // Categories selectable for a room = the active managed room types.
  const typeNames = roomTypes.filter(t => t.active).map(t => t.name);
  const categoryOptions = typeNames.length ? typeNames : ROOM_CATEGORIES;
  const [q, setQ] = React.useState("");
  const [floorFilter, setFloorFilter] = React.useState<"all" | string>("all");
  const [catFilter, setCatFilter] = React.useState<"all" | RoomCategory>("all");
  const [statusFilter, setStatusFilter] = React.useState<"all" | RoomStatus>("all");
  const [editing, setEditing] = React.useState<Room | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [bulkOpen, setBulkOpen] = React.useState(false);

  const filtered = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rooms.filter(r => {
      if (needle && !`${r.number} ${r.category} ${r.bedConfig} ${r.view}`.toLowerCase().includes(needle)) return false;
      if (floorFilter !== "all" && String(r.floor) !== floorFilter) return false;
      if (catFilter !== "all" && r.category !== catFilter) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      return true;
    }).sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));
  }, [rooms, q, floorFilter, catFilter, statusFilter]);

  const saveRoom = (r: Room) => {
    const existing = rooms.find(x => x.id === r.id);
    onChange(existing ? rooms.map(x => x.id === r.id ? r : x) : [...rooms, r]);
    onToast(existing ? `Room ${r.number} updated` : `Room ${r.number} added`);
    setEditing(null);
    setCreating(false);
  };
  const removeRoom = (id: string) => {
    const r = rooms.find(x => x.id === id);
    onChange(rooms.filter(x => x.id !== id));
    onToast(`Room ${r?.number ?? id} deleted`);
  };
  const duplicateRoom = (id: string) => {
    const r = rooms.find(x => x.id === id);
    if (!r) return;
    const newNum = `${r.number}-A`;
    onChange([...rooms, { ...r, id: `r-${newNum}-${tempSeq()}`, number: newNum }]);
    onToast(`Duplicated as Room ${newNum}`);
  };

  const counts = React.useMemo(() => {
    const byStatus: Record<RoomStatus, number> = { active: 0, "out-of-order": 0, renovation: 0, blocked: 0 };
    rooms.forEach(r => { byStatus[r.status] += 1; });
    return byStatus;
  }, [rooms]);

  const newRoomTemplate = (): Room => ({
    id: `r-new-${tempSeq()}`,
    number: "", category: "Deluxe", floor: floors[0]?.number ?? 1,
    bedConfig: "1 King", maxAdults: 2, maxChildren: 1, sizeSqft: 320,
    view: "City", baseTariff: 8500, extraBedAllowed: true, extraBedRate: 1500,
    connectingRoom: "", extension: "", wifiSsid: "PearlGuest",
    smoking: false, accessible: false, amenities: ["Smart TV", "Mini-bar", "In-room safe"],
    status: "active",
  });

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <SummaryStat icon={BedDouble} label="Total rooms" value={rooms.length} />
        <SummaryStat icon={CheckCircle2} label="Active" value={counts.active} accent="success" />
        <SummaryStat icon={AlertCircle} label="OOO" value={counts["out-of-order"]} accent="warning" />
        <SummaryStat icon={IndianRupee} label="Avg base tariff" value={`₹${Math.round(rooms.reduce((s, r) => s + r.baseTariff, 0) / Math.max(1, rooms.length)).toLocaleString("en-IN")}`} />
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search room # / category / bed / view…" className="pl-9 h-9" />
        </div>
        <Select value={floorFilter} onChange={e => setFloorFilter(e.target.value)} className="h-9 w-auto">
          <option value="all">All floors</option>
          {floors.map(f => <option key={f.id} value={String(f.number)}>Floor {f.number} · {f.name}</option>)}
        </Select>
        <Select value={catFilter} onChange={e => setCatFilter(e.target.value as "all" | RoomCategory)} className="h-9 w-auto">
          <option value="all">All categories</option>
          {categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
        </Select>
        <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value as "all" | RoomStatus)} className="h-9 w-auto">
          <option value="all">Any status</option>
          <option value="active">Active</option>
          <option value="out-of-order">Out-of-order</option>
          <option value="renovation">Renovation</option>
          <option value="blocked">Blocked</option>
        </Select>
        <div className="flex-1" />
        <Button size="sm" variant="outline" onClick={() => setBulkOpen(true)}>
          <Plus className="h-3.5 w-3.5" />Bulk add
        </Button>
        <Button size="sm" onClick={() => { setEditing(newRoomTemplate()); setCreating(true); }}>
          <Plus className="h-3.5 w-3.5" />Add room
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">Showing <span className="font-medium text-foreground">{filtered.length}</span> of {rooms.length} rooms</p>

      <div className="rounded-md border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-elevated border-b border-border">
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2 font-semibold">Room</th>
                <th className="px-3 py-2 font-semibold">Category</th>
                <th className="px-3 py-2 font-semibold">Floor</th>
                <th className="px-3 py-2 font-semibold">Bed</th>
                <th className="px-3 py-2 font-semibold text-right">Pax</th>
                <th className="px-3 py-2 font-semibold text-right">Size</th>
                <th className="px-3 py-2 font-semibold">View</th>
                <th className="px-3 py-2 font-semibold text-right">Base tariff</th>
                <th className="px-3 py-2 font-semibold">Ext</th>
                <th className="px-3 py-2 font-semibold">Flags</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(r => {
                const VIcon = VIEW_ICON[r.view];
                return (
                  <tr key={r.id} className="hover:bg-surface-sunken/30">
                    <td className="px-3 py-2 font-semibold tabular">{r.number}</td>
                    <td className="px-3 py-2"><Badge tone="brand">{r.category}</Badge></td>
                    <td className="px-3 py-2 text-xs text-muted-foreground tabular">F{r.floor}</td>
                    <td className="px-3 py-2 text-xs"><Bed className="h-3 w-3 inline mr-1 text-muted-foreground" />{r.bedConfig}</td>
                    <td className="px-3 py-2 text-right text-xs tabular">{r.maxAdults}A{r.maxChildren ? `+${r.maxChildren}C` : ""}</td>
                    <td className="px-3 py-2 text-right text-xs tabular">{r.sizeSqft} ft²</td>
                    <td className="px-3 py-2 text-xs inline-flex items-center gap-1"><VIcon className="h-3 w-3 text-muted-foreground" />{r.view}</td>
                    <td className="px-3 py-2 text-right tabular font-medium">{money(r.baseTariff)}</td>
                    <td className="px-3 py-2 text-xs tabular text-muted-foreground">{r.extension}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        {r.smoking && <span title="Smoking"><Cigarette className="h-3.5 w-3.5 text-warning" /></span>}
                        {r.accessible && <span title="Accessible"><Accessibility className="h-3.5 w-3.5 text-info" /></span>}
                        {r.connectingRoom && <span title={`Connects to ${r.connectingRoom}`}><Layers className="h-3.5 w-3.5 text-brand" /></span>}
                        {r.extraBedAllowed && <span title="Extra bed allowed"><Plus className="h-3.5 w-3.5 text-muted-foreground" /></span>}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <Badge tone={r.status === "active" ? "success" : r.status === "out-of-order" ? "warning" : r.status === "renovation" ? "info" : "danger"}>
                        {r.status === "out-of-order" ? "OOO" : r.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="inline-flex gap-1">
                        <button type="button" onClick={() => { setEditing(r); setCreating(false); }} className="h-7 w-7 rounded-md border border-border hover:bg-brand hover:text-brand-foreground hover:border-brand inline-flex items-center justify-center text-muted-foreground transition-colors" title="Edit">
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => duplicateRoom(r.id)} className="h-7 w-7 rounded-md border border-border hover:bg-surface-sunken inline-flex items-center justify-center text-muted-foreground transition-colors" title="Duplicate">
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => removeRoom(r.id)} className="h-7 w-7 rounded-md border border-border hover:bg-danger hover:text-white hover:border-danger inline-flex items-center justify-center text-muted-foreground transition-colors" title="Delete">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={12} className="text-center py-6 text-xs text-muted-foreground">No rooms match the filters</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-end pt-3 border-t border-border">
        <Button variant="success" onClick={() => { onMarkComplete(); onToast("Rooms configuration saved"); }}>
          <Save className="h-4 w-4" />Save Rooms
        </Button>
      </div>

      {editing && (
        <RoomEditModal
          room={editing}
          floors={floors}
          isNew={creating}
          categoryOptions={categoryOptions}
          existingNumbers={rooms.filter(r => r.id !== editing.id).map(r => r.number)}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSave={saveRoom}
        />
      )}
      {bulkOpen && (
        <BulkRoomModal
          floors={floors}
          categoryOptions={categoryOptions}
          existingNumbers={rooms.map(r => r.number)}
          template={newRoomTemplate()}
          onClose={() => setBulkOpen(false)}
          onCreate={(newRooms) => {
            onChange([...rooms, ...newRooms]);
            onToast(`${newRooms.length} room${newRooms.length === 1 ? "" : "s"} created`);
            setBulkOpen(false);
          }}
        />
      )}
    </div>
  );
}

// ===================== BULK ROOM MODAL =====================
function BulkRoomModal({ floors, categoryOptions, existingNumbers, template, onClose, onCreate }: {
  floors: Floor[];
  categoryOptions: string[];
  existingNumbers: string[];
  template: Room;
  onClose: () => void;
  onCreate: (rooms: Room[]) => void;
}) {
  const [floor, setFloor] = React.useState<number>(floors[0]?.number ?? 1);
  const [fromN, setFromN] = React.useState<number>(1);
  const [toN, setToN] = React.useState<number>(10);
  const [category, setCategory] = React.useState<RoomCategory>(template.category);
  const [bedConfig, setBedConfig] = React.useState<BedConfig>(template.bedConfig);
  const [baseTariff, setBaseTariff] = React.useState(template.baseTariff);

  React.useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; document.removeEventListener("keydown", onKey); };
  }, [onClose]);

  // Generated room numbers: e.g. floor 3 + range 1..10 = 301, 302, …, 310
  const generated = React.useMemo(() => {
    const out: string[] = [];
    for (let i = fromN; i <= toN; i++) {
      const num = `${floor}${i.toString().padStart(2, "0")}`;
      out.push(num);
    }
    return out;
  }, [floor, fromN, toN]);

  const conflicts = generated.filter(n => existingNumbers.includes(n));
  const valid = fromN > 0 && toN >= fromN && toN - fromN < 50 && conflicts.length === 0;

  const submit = () => {
    const newRooms: Room[] = generated.map((number, i) => ({
      ...template,
      id: `r-bulk-${tempSeq()}-${i}`,
      number, floor, category, bedConfig, baseTariff,
    }));
    onCreate(newRooms);
  };

  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface rounded-xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="h-9 w-9 rounded-md bg-brand-soft text-brand-soft-foreground inline-flex items-center justify-center"><BedDouble className="h-4 w-4" /></span>
            <div>
              <h3 className="font-semibold">Bulk create rooms</h3>
              <p className="text-xs text-muted-foreground">Generate sequential rooms on a single floor</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="h-7 w-7 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>

        <div className="px-5 py-4 space-y-4 overflow-y-auto">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Floor</label>
            <Select value={String(floor)} onChange={e => setFloor(Number(e.target.value))} className="h-9">
              {floors.map(f => <option key={f.id} value={String(f.number)}>Floor {f.number} · {f.name}</option>)}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">From room #</label>
              <Input type="number" value={fromN} onChange={e => setFromN(Math.max(1, Number(e.target.value) || 0))} className="h-9 tabular" min={1} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">To room #</label>
              <Input type="number" value={toN} onChange={e => setToN(Math.max(fromN, Number(e.target.value) || 0))} className="h-9 tabular" min={fromN} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Category</label>
              <Select value={category} onChange={e => setCategory(e.target.value as RoomCategory)} className="h-9">
                {categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Bed config</label>
              <Select value={bedConfig} onChange={e => setBedConfig(e.target.value as BedConfig)} className="h-9">
                {BED_CONFIGS.map(b => <option key={b} value={b}>{b}</option>)}
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Base tariff (₹)</label>
              <Input type="number" value={baseTariff} onChange={e => setBaseTariff(Math.max(0, Number(e.target.value) || 0))} className="h-9 tabular" />
            </div>
          </div>

          {/* Preview */}
          <div className={cn("rounded-md border p-3", conflicts.length > 0 ? "border-danger/30 bg-danger-soft/15" : "border-info/20 bg-info-soft/15")}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1.5 inline-flex items-center gap-1">
              {conflicts.length > 0 ? <AlertCircle className="h-3 w-3 text-danger" /> : <CheckCircle2 className="h-3 w-3 text-info" />}
              {conflicts.length > 0 ? `${conflicts.length} conflict${conflicts.length === 1 ? "" : "s"}` : `${generated.length} rooms to create`}
            </p>
            <p className="text-[11px] text-muted-foreground font-mono tabular">
              {generated.length > 14 ? `${generated.slice(0, 7).join(", ")} … ${generated.slice(-3).join(", ")}` : generated.join(", ")}
            </p>
            {conflicts.length > 0 && (
              <p className="text-[11px] text-danger mt-1.5">Already exist: {conflicts.join(", ")}</p>
            )}
            {toN - fromN >= 50 && (
              <p className="text-[11px] text-warning mt-1.5">⚠ Maximum 50 rooms per bulk operation</p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-border bg-surface-sunken/30">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={!valid}>
            <Plus className="h-3.5 w-3.5" />Create {generated.length} room{generated.length === 1 ? "" : "s"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ===================== ROOM EDIT MODAL =====================
function RoomEditModal({
  room, floors, isNew, categoryOptions, existingNumbers, onClose, onSave,
}: {
  room: Room;
  floors: Floor[];
  isNew: boolean;
  categoryOptions: string[];
  existingNumbers: string[];
  onClose: () => void;
  onSave: (r: Room) => void;
}) {
  const [draft, setDraft] = React.useState<Room>(room);
  const set = <K extends keyof Room>(k: K, v: Room[K]) => setDraft(d => ({ ...d, [k]: v }));

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  const duplicate = existingNumbers.includes(draft.number);
  const valid = draft.number.trim() !== "" && !duplicate && draft.baseTariff > 0 && draft.sizeSqft > 0 && draft.maxAdults >= 1;

  const toggleAmenity = (a: string) => {
    set("amenities", draft.amenities.includes(a) ? draft.amenities.filter(x => x !== a) : [...draft.amenities, a]);
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 pointer-events-none overflow-y-auto">
        <Card className="pointer-events-auto w-full max-w-3xl p-0 animate-in shadow-xl my-auto overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 bg-surface-elevated border-b border-border flex items-center justify-between">
            <div>
              <h3 className="font-semibold">{isNew ? "Add new room" : `Edit Room ${draft.number}`}</h3>
              <p className="text-xs text-muted-foreground">{isNew ? "All fields marked with * are required" : "Update room configuration"}</p>
            </div>
            <button type="button" onClick={onClose} className="h-8 w-8 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
          </div>

          <div className="px-5 py-4 max-h-[70vh] overflow-y-auto space-y-5">
            {/* Identity */}
            <FormSection title="Identity" icon={Tag}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Field2 label="Room # *">
                  <Input value={draft.number} onChange={e => set("number", e.target.value)} className={cn("font-mono tabular", duplicate && "border-danger")} placeholder="e.g. 305" />
                  {duplicate && <p className="text-[10px] text-danger mt-0.5">Room {draft.number} already exists</p>}
                </Field2>
                <Field2 label="Category *">
                  <Select value={draft.category} onChange={e => set("category", e.target.value as RoomCategory)}>
                    {categoryOptions.map(c => <option key={c}>{c}</option>)}
                  </Select>
                </Field2>
                <Field2 label="Floor *">
                  <Select value={String(draft.floor)} onChange={e => set("floor", Number(e.target.value))}>
                    {floors.map(f => <option key={f.id} value={String(f.number)}>{f.number} · {f.name}</option>)}
                  </Select>
                </Field2>
                <Field2 label="Status">
                  <Select value={draft.status} onChange={e => set("status", e.target.value as RoomStatus)}>
                    <option value="active">Active</option>
                    <option value="out-of-order">Out-of-order</option>
                    <option value="renovation">Renovation</option>
                    <option value="blocked">Blocked</option>
                  </Select>
                </Field2>
              </div>
            </FormSection>

            {/* Bed & Occupancy */}
            <FormSection title="Bed configuration & occupancy" icon={Bed}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Field2 label="Bed config *">
                  <Select value={draft.bedConfig} onChange={e => set("bedConfig", e.target.value as BedConfig)}>
                    {BED_CONFIGS.map(b => <option key={b}>{b}</option>)}
                  </Select>
                </Field2>
                <Field2 label="Max adults *">
                  <Input type="number" min={1} max={8} value={draft.maxAdults} onChange={e => set("maxAdults", Number(e.target.value))} />
                </Field2>
                <Field2 label="Max children">
                  <Input type="number" min={0} max={6} value={draft.maxChildren} onChange={e => set("maxChildren", Number(e.target.value))} />
                </Field2>
                <Field2 label="Extra bed">
                  <div className="h-9 flex items-center gap-2 px-2 rounded-md border border-border bg-surface">
                    <input type="checkbox" checked={draft.extraBedAllowed} onChange={e => set("extraBedAllowed", e.target.checked)} className="h-4 w-4" />
                    <span className="text-xs">Allowed</span>
                  </div>
                </Field2>
              </div>
              {draft.extraBedAllowed && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                  <Field2 label="Extra bed rate (₹)">
                    <Input type="number" value={draft.extraBedRate} onChange={e => set("extraBedRate", Number(e.target.value))} />
                  </Field2>
                </div>
              )}
            </FormSection>

            {/* Size & View */}
            <FormSection title="Size & view" icon={Ruler}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Field2 label="Size (sq ft) *">
                  <Input type="number" value={draft.sizeSqft} onChange={e => set("sizeSqft", Number(e.target.value))} />
                </Field2>
                <Field2 label="Size (sq m)">
                  <Input type="number" value={Math.round(draft.sizeSqft * 0.0929)} disabled />
                </Field2>
                <Field2 label="View">
                  <Select value={draft.view} onChange={e => set("view", e.target.value as ViewType)}>
                    {VIEW_OPTIONS.map(v => <option key={v}>{v}</option>)}
                  </Select>
                </Field2>
                <Field2 label="Smoking">
                  <div className="h-9 flex items-center gap-2 px-2 rounded-md border border-border bg-surface">
                    <input type="checkbox" checked={draft.smoking} onChange={e => set("smoking", e.target.checked)} className="h-4 w-4" />
                    <span className="text-xs">Allowed</span>
                  </div>
                </Field2>
              </div>
            </FormSection>

            {/* Rate */}
            <FormSection title="Rate & inventory" icon={IndianRupee}>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Field2 label="Base tariff (₹/night) *">
                  <Input type="number" value={draft.baseTariff} onChange={e => set("baseTariff", Number(e.target.value))} />
                </Field2>
                <Field2 label="Connecting room #">
                  <Input value={draft.connectingRoom} onChange={e => set("connectingRoom", e.target.value)} placeholder="e.g. 104" />
                </Field2>
                <Field2 label="Wheelchair accessible">
                  <div className="h-9 flex items-center gap-2 px-2 rounded-md border border-border bg-surface">
                    <input type="checkbox" checked={draft.accessible} onChange={e => set("accessible", e.target.checked)} className="h-4 w-4" />
                    <span className="text-xs">Accessible</span>
                  </div>
                </Field2>
              </div>
            </FormSection>

            {/* Tech */}
            <FormSection title="Connectivity & in-room tech" icon={Wifi}>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Field2 label="EPABX extension">
                  <div className="relative">
                    <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-subtle-foreground" />
                    <Input value={draft.extension} onChange={e => set("extension", e.target.value)} className="pl-8 font-mono tabular" placeholder="e.g. 7305" />
                  </div>
                </Field2>
                <Field2 label="Wi-Fi SSID">
                  <div className="relative">
                    <Wifi className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-subtle-foreground" />
                    <Input value={draft.wifiSsid} onChange={e => set("wifiSsid", e.target.value)} className="pl-8" placeholder="PearlGuest" />
                  </div>
                </Field2>
              </div>
            </FormSection>

            {/* Amenities */}
            <FormSection title="Amenities" icon={CheckCircle2}>
              <div className="flex flex-wrap gap-1.5">
                {ROOM_AMENITY_OPTIONS.map(a => {
                  const on = draft.amenities.includes(a);
                  return (
                    <button
                      key={a}
                      type="button"
                      onClick={() => toggleAmenity(a)}
                      className={cn(
                        "h-8 px-3 rounded-full text-xs font-medium border transition-colors",
                        on ? "bg-brand-soft border-brand text-brand-soft-foreground" : "border-border hover:bg-surface-sunken text-muted-foreground"
                      )}
                    >
                      {on && <CheckCircle2 className="h-3 w-3 inline mr-1" />}{a}
                    </button>
                  );
                })}
              </div>
            </FormSection>
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-border bg-surface-elevated flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button onClick={() => onSave(draft)} disabled={!valid} variant="success">
              <Save className="h-4 w-4" />{isNew ? "Add room" : "Save changes"}
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}

// ===================== RATE PLANS MANAGER =====================
// ===================== ROOM TYPES =====================
function RoomTypesManager({ roomTypes, rooms, onChange, onToast, onMarkComplete }: {
  roomTypes: RoomType[]; rooms: Room[]; onChange: (t: RoomType[]) => void; onToast: (m: string) => void; onMarkComplete: () => void;
}) {
  const upd = (id: string, patch: Partial<RoomType>) => onChange(roomTypes.map(t => t.id === id ? { ...t, ...patch } : t));
  const add = () => {
    onChange([...roomTypes, { id: `rt${tempSeq()}`, name: "New Type", code: "", baseTariff: 5000, maxAdults: 2, maxChildren: 1, extraAdultRate: 0, extraChildRate: 0, sizeSqft: 300, description: "", amenities: [], active: true }]);
    onToast("Room type added");
  };
  const del = (id: string) => {
    const t = roomTypes.find(x => x.id === id);
    const inUse = t ? rooms.filter(r => r.category === t.name).length : 0;
    if (inUse > 0) { onToast(`Can't delete — ${inUse} room${inUse === 1 ? "" : "s"} use "${t?.name}"`); return; }
    onChange(roomTypes.filter(t => t.id !== id));
    onToast("Room type removed");
  };
  const roomsOfType = (name: string) => rooms.filter(r => r.category === name).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <SummaryStat icon={BedDouble} label="Room types" value={roomTypes.length} />
        <SummaryStat icon={CheckCircle2} label="Active" value={roomTypes.filter(t => t.active).length} accent="success" />
        <SummaryStat icon={IndianRupee} label="Lowest rate" value={money(Math.min(...roomTypes.map(t => t.baseTariff), 0) || 0)} />
        <SummaryStat icon={IndianRupee} label="Highest rate" value={money(Math.max(...roomTypes.map(t => t.baseTariff), 0))} />
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Base rate covers the included adults/children; bookings charge the extra per-night rate for each guest beyond that. Each room&apos;s physical max is set when you add the room.</p>
        <Button size="sm" onClick={add}><Plus className="h-3.5 w-3.5" />Add type</Button>
      </div>
      <div className="rounded-md border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-elevated border-b border-border">
            <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-3 py-2 font-semibold">Type name</th>
              <th className="px-3 py-2 font-semibold">Code</th>
              <th className="px-3 py-2 font-semibold text-right">Base rate</th>
              <th className="px-3 py-2 font-semibold text-right">Incl. adults</th>
              <th className="px-3 py-2 font-semibold text-right">Incl. children</th>
              <th className="px-3 py-2 font-semibold text-right">Extra adult (₹/night)</th>
              <th className="px-3 py-2 font-semibold text-right">Extra child (₹/night)</th>
              <th className="px-3 py-2 font-semibold text-right">Rooms</th>
              <th className="px-3 py-2 font-semibold">Active</th>
              <th className="px-3 py-2 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {roomTypes.map(t => (
              <tr key={t.id} className="hover:bg-surface-sunken/30">
                <td className="px-3 py-2"><Input value={t.name} onChange={e => upd(t.id, { name: e.target.value })} className="h-8 w-40" /></td>
                <td className="px-3 py-2"><Input value={t.code ?? ""} onChange={e => upd(t.id, { code: e.target.value.toUpperCase() })} className="h-8 font-mono tabular w-20" /></td>
                <td className="px-3 py-2 text-right">
                  <div className="inline-flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">₹</span>
                    <Input type="number" value={t.baseTariff} onChange={e => upd(t.id, { baseTariff: Number(e.target.value) })} className="h-8 w-24 tabular text-right" />
                  </div>
                </td>
                <td className="px-3 py-2 text-right"><Input type="number" value={t.maxAdults} onChange={e => upd(t.id, { maxAdults: Math.max(1, Number(e.target.value) || 1) })} className="h-8 w-16 tabular text-right" /></td>
                <td className="px-3 py-2 text-right"><Input type="number" value={t.maxChildren} onChange={e => upd(t.id, { maxChildren: Math.max(0, Number(e.target.value) || 0) })} className="h-8 w-16 tabular text-right" /></td>
                <td className="px-3 py-2 text-right">
                  <div className="inline-flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">₹</span>
                    <Input type="number" value={t.extraAdultRate ?? 0} onChange={e => upd(t.id, { extraAdultRate: Math.max(0, Number(e.target.value)) })} className="h-8 w-24 tabular text-right" />
                  </div>
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="inline-flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">₹</span>
                    <Input type="number" value={t.extraChildRate ?? 0} onChange={e => upd(t.id, { extraChildRate: Math.max(0, Number(e.target.value)) })} className="h-8 w-24 tabular text-right" />
                  </div>
                </td>
                <td className="px-3 py-2 text-right tabular text-muted-foreground">{roomsOfType(t.name)}</td>
                <td className="px-3 py-2 text-center"><input type="checkbox" checked={t.active} onChange={e => upd(t.id, { active: e.target.checked })} className="h-4 w-4" /></td>
                <td className="px-3 py-2 text-right">
                  <button type="button" onClick={() => del(t.id)} className="h-7 w-7 rounded-md border border-border hover:bg-danger hover:text-white hover:border-danger inline-flex items-center justify-center text-muted-foreground" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-end pt-3 border-t border-border">
        <Button variant="success" onClick={() => { onMarkComplete(); onToast("Room types saved"); }}><Save className="h-4 w-4" />Save Room Types</Button>
      </div>
    </div>
  );
}

function RatePlansManager({ plans, onChange, onToast, onMarkComplete }: {
  plans: RatePlan[]; onChange: (p: RatePlan[]) => void; onToast: (m: string) => void; onMarkComplete: () => void;
}) {
  const upd = (id: string, patch: Partial<RatePlan>) => onChange(plans.map(p => p.id === id ? { ...p, ...patch } : p));
  const add = () => {
    const id = `rp${tempSeq()}`;
    onChange([...plans, { id, code: "NEW", name: "New rate plan", inclBreakfast: false, inclLunch: false, inclDinner: false, discountPct: 0, refundable: true, active: true }]);
    onToast("Rate plan added");
  };
  const del = (id: string) => { onChange(plans.filter(p => p.id !== id)); onToast("Rate plan removed"); };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <SummaryStat icon={Tag} label="Total plans" value={plans.length} />
        <SummaryStat icon={CheckCircle2} label="Active" value={plans.filter(p => p.active).length} accent="success" />
        <SummaryStat icon={Utensils} label="With breakfast" value={plans.filter(p => p.inclBreakfast).length} />
        <SummaryStat icon={IndianRupee} label="Discounted" value={plans.filter(p => p.discountPct > 0).length} />
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Each plan unlocks meal inclusions + discount on base tariff.</p>
        <Button size="sm" onClick={add}><Plus className="h-3.5 w-3.5" />Add plan</Button>
      </div>
      <div className="rounded-md border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-elevated border-b border-border">
            <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-3 py-2 font-semibold">Code</th>
              <th className="px-3 py-2 font-semibold">Plan name</th>
              <th className="px-3 py-2 font-semibold text-center">B</th>
              <th className="px-3 py-2 font-semibold text-center">L</th>
              <th className="px-3 py-2 font-semibold text-center">D</th>
              <th className="px-3 py-2 font-semibold text-right">Discount</th>
              <th className="px-3 py-2 font-semibold">Refund</th>
              <th className="px-3 py-2 font-semibold">Active</th>
              <th className="px-3 py-2 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {plans.map(p => (
              <tr key={p.id} className="hover:bg-surface-sunken/30">
                <td className="px-3 py-2">
                  <Input value={p.code} onChange={e => upd(p.id, { code: e.target.value.toUpperCase() })} className="h-8 font-mono tabular w-20" />
                </td>
                <td className="px-3 py-2">
                  <Input value={p.name} onChange={e => upd(p.id, { name: e.target.value })} className="h-8" />
                </td>
                <td className="px-3 py-2 text-center"><div className="flex flex-col items-center gap-1"><input type="checkbox" checked={p.inclBreakfast} onChange={e => upd(p.id, { inclBreakfast: e.target.checked })} className="h-4 w-4" /><Input type="number" min={0} value={p.breakfastPrice ?? 0} disabled={!p.inclBreakfast} onChange={e => upd(p.id, { breakfastPrice: Math.max(0, Number(e.target.value)) })} className="h-7 w-16 tabular text-right text-xs" placeholder="₹" /></div></td>
                <td className="px-3 py-2 text-center"><div className="flex flex-col items-center gap-1"><input type="checkbox" checked={p.inclLunch} onChange={e => upd(p.id, { inclLunch: e.target.checked })} className="h-4 w-4" /><Input type="number" min={0} value={p.lunchPrice ?? 0} disabled={!p.inclLunch} onChange={e => upd(p.id, { lunchPrice: Math.max(0, Number(e.target.value)) })} className="h-7 w-16 tabular text-right text-xs" placeholder="₹" /></div></td>
                <td className="px-3 py-2 text-center"><div className="flex flex-col items-center gap-1"><input type="checkbox" checked={p.inclDinner} onChange={e => upd(p.id, { inclDinner: e.target.checked })} className="h-4 w-4" /><Input type="number" min={0} value={p.dinnerPrice ?? 0} disabled={!p.inclDinner} onChange={e => upd(p.id, { dinnerPrice: Math.max(0, Number(e.target.value)) })} className="h-7 w-16 tabular text-right text-xs" placeholder="₹" /></div></td>
                <td className="px-3 py-2 text-right">
                  <div className="inline-flex items-center gap-1">
                    <Input type="number" value={p.discountPct} onChange={e => upd(p.id, { discountPct: Number(e.target.value) })} className="h-8 w-16 tabular text-right" />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-center"><input type="checkbox" checked={p.refundable} onChange={e => upd(p.id, { refundable: e.target.checked })} className="h-4 w-4" /></td>
                <td className="px-3 py-2 text-center"><input type="checkbox" checked={p.active} onChange={e => upd(p.id, { active: e.target.checked })} className="h-4 w-4" /></td>
                <td className="px-3 py-2 text-right">
                  <button type="button" onClick={() => del(p.id)} className="h-7 w-7 rounded-md border border-border hover:bg-danger hover:text-white hover:border-danger inline-flex items-center justify-center text-muted-foreground" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-end pt-3 border-t border-border">
        <Button variant="success" onClick={() => { onMarkComplete(); onToast("Rate plans saved"); }}><Save className="h-4 w-4" />Save Rate Plans</Button>
      </div>
    </div>
  );
}

// ===================== SEASONS & HOLIDAYS =====================
function SeasonsManager({ seasons, holidays, onSeasonsChange, onHolidaysChange, onToast, onMarkComplete }: {
  seasons: Season[]; holidays: Holiday[];
  onSeasonsChange: (s: Season[]) => void; onHolidaysChange: (h: Holiday[]) => void;
  onToast: (m: string) => void; onMarkComplete: () => void;
}) {
  const updSeason = (id: string, patch: Partial<Season>) => onSeasonsChange(seasons.map(s => s.id === id ? { ...s, ...patch } : s));
  const updHoliday = (id: string, patch: Partial<Holiday>) => onHolidaysChange(holidays.map(h => h.id === id ? { ...h, ...patch } : h));
  const addSeason = () => { onSeasonsChange([...seasons, { id: `se${tempSeq()}`, name: "New season", from: "2026-12-01", to: "2026-12-31", multiplier: 1.2, active: true }]); onToast("Season added"); };
  const addHoliday = () => { onHolidaysChange([...holidays, { id: `h${tempSeq()}`, name: "New holiday", date: "2026-12-25", kind: "national", surchargePct: 10 }]); onToast("Holiday added"); };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <SummaryStat icon={Calendar} label="Seasons" value={seasons.length} />
        <SummaryStat icon={CheckCircle2} label="Active seasons" value={seasons.filter(s => s.active).length} accent="success" />
        <SummaryStat icon={Calendar} label="Holidays" value={holidays.length} />
        <SummaryStat icon={IndianRupee} label="Peak surcharge avg" value={`${Math.round(seasons.filter(s => s.multiplier > 1).reduce((t, s) => t + (s.multiplier - 1) * 100, 0) / Math.max(1, seasons.filter(s => s.multiplier > 1).length))}%`} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Seasons</p>
          <Button size="sm" onClick={addSeason}><Plus className="h-3.5 w-3.5" />Add season</Button>
        </div>
        <div className="rounded-md border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-elevated border-b border-border">
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2 font-semibold">Name</th>
                <th className="px-3 py-2 font-semibold">From</th>
                <th className="px-3 py-2 font-semibold">To</th>
                <th className="px-3 py-2 font-semibold text-right">Multiplier</th>
                <th className="px-3 py-2 font-semibold">Active</th>
                <th className="px-3 py-2 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {seasons.map(s => (
                <tr key={s.id} className="hover:bg-surface-sunken/30">
                  <td className="px-3 py-2"><Input value={s.name} onChange={e => updSeason(s.id, { name: e.target.value })} className="h-8" /></td>
                  <td className="px-3 py-2"><Input type="date" value={s.from} onChange={e => updSeason(s.id, { from: e.target.value })} className="h-8" /></td>
                  <td className="px-3 py-2"><Input type="date" value={s.to} onChange={e => updSeason(s.id, { to: e.target.value })} className="h-8" /></td>
                  <td className="px-3 py-2 text-right">
                    <Input type="number" step="0.1" value={s.multiplier} onChange={e => updSeason(s.id, { multiplier: Number(e.target.value) })} className={cn("h-8 w-20 tabular text-right", s.multiplier > 1 ? "text-warning" : s.multiplier < 1 ? "text-success" : "")} />
                  </td>
                  <td className="px-3 py-2 text-center"><input type="checkbox" checked={s.active} onChange={e => updSeason(s.id, { active: e.target.checked })} className="h-4 w-4" /></td>
                  <td className="px-3 py-2 text-right">
                    <button type="button" onClick={() => { onSeasonsChange(seasons.filter(x => x.id !== s.id)); onToast("Season removed"); }} className="h-7 w-7 rounded-md border border-border hover:bg-danger hover:text-white hover:border-danger inline-flex items-center justify-center text-muted-foreground"><Trash2 className="h-3.5 w-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Holidays</p>
          <Button size="sm" onClick={addHoliday}><Plus className="h-3.5 w-3.5" />Add holiday</Button>
        </div>
        <div className="rounded-md border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-elevated border-b border-border">
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2 font-semibold">Name</th>
                <th className="px-3 py-2 font-semibold">Date</th>
                <th className="px-3 py-2 font-semibold">Kind</th>
                <th className="px-3 py-2 font-semibold text-right">Surcharge</th>
                <th className="px-3 py-2 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {holidays.map(h => (
                <tr key={h.id} className="hover:bg-surface-sunken/30">
                  <td className="px-3 py-2"><Input value={h.name} onChange={e => updHoliday(h.id, { name: e.target.value })} className="h-8" /></td>
                  <td className="px-3 py-2"><Input type="date" value={h.date} onChange={e => updHoliday(h.id, { date: e.target.value })} className="h-8" /></td>
                  <td className="px-3 py-2">
                    <Select value={h.kind} onChange={e => updHoliday(h.id, { kind: e.target.value as Holiday["kind"] })} className="h-8">
                      <option value="national">National</option><option value="religious">Religious</option><option value="local">Local</option>
                    </Select>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="inline-flex items-center gap-1">
                      <Input type="number" value={h.surchargePct} onChange={e => updHoliday(h.id, { surchargePct: Number(e.target.value) })} className="h-8 w-16 tabular text-right" />
                      <span className="text-xs text-muted-foreground">%</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button type="button" onClick={() => { onHolidaysChange(holidays.filter(x => x.id !== h.id)); onToast("Holiday removed"); }} className="h-7 w-7 rounded-md border border-border hover:bg-danger hover:text-white hover:border-danger inline-flex items-center justify-center text-muted-foreground"><Trash2 className="h-3.5 w-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-end pt-3 border-t border-border">
        <Button variant="success" onClick={() => { onMarkComplete(); onToast("Seasons & holidays saved"); }}><Save className="h-4 w-4" />Save</Button>
      </div>
    </div>
  );
}

// ===================== F&B + HALL PACKAGES =====================
function FoodHallManager({ fb, halls, banquet, extras, onFbChange, onHallsChange, onBanquetChange, onExtrasChange, onToast, onMarkComplete }: {
  fb: FBPackage[]; halls: HallPackage[]; banquet: BanquetPkg[]; extras: ExtraSvc[];
  onFbChange: (f: FBPackage[]) => void; onHallsChange: (h: HallPackage[]) => void;
  onBanquetChange: (b: BanquetPkg[]) => void; onExtrasChange: (e: ExtraSvc[]) => void;
  onToast: (m: string) => void; onMarkComplete: () => void;
}) {
  const updFb = (id: string, patch: Partial<FBPackage>) => onFbChange(fb.map(p => p.id === id ? { ...p, ...patch } : p));
  const updHall = (id: string, patch: Partial<HallPackage>) => onHallsChange(halls.map(h => h.id === id ? { ...h, ...patch } : h));
  const updBanquet = (id: string, patch: Partial<BanquetPkg>) => onBanquetChange(banquet.map(b => b.id === id ? { ...b, ...patch } : b));
  const updExtra = (id: string, patch: Partial<ExtraSvc>) => onExtrasChange(extras.map(e => e.id === id ? { ...e, ...patch } : e));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <SummaryStat icon={Utensils} label="F&B packages" value={fb.length} />
        <SummaryStat icon={Building2} label="Halls / venues" value={halls.length} />
        <SummaryStat icon={Users} label="Total capacity" value={halls.reduce((t, h) => t + h.capacity, 0).toLocaleString()} />
        <SummaryStat icon={IndianRupee} label="Highest day rate" value={`₹${Math.max(...halls.map(h => h.fullDay)).toLocaleString("en-IN")}`} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">F&B packages (per person)</p>
          <Button size="sm" onClick={() => { onFbChange([...fb, { id: `fb${tempSeq()}`, name: "New F&B package", type: "Buffet", pax: 1, price: 500, gst: 5, active: true }]); onToast("F&B package added"); }}><Plus className="h-3.5 w-3.5" />Add</Button>
        </div>
        <div className="rounded-md border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-elevated border-b border-border">
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2 font-semibold">Name</th>
                <th className="px-3 py-2 font-semibold">Type</th>
                <th className="px-3 py-2 font-semibold text-right">Price/pax</th>
                <th className="px-3 py-2 font-semibold text-right">GST</th>
                <th className="px-3 py-2 font-semibold">Active</th>
                <th className="px-3 py-2 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {fb.map(p => (
                <tr key={p.id} className="hover:bg-surface-sunken/30">
                  <td className="px-3 py-2"><Input value={p.name} onChange={e => updFb(p.id, { name: e.target.value })} className="h-8" /></td>
                  <td className="px-3 py-2">
                    <Select value={p.type} onChange={e => updFb(p.id, { type: e.target.value as FBPackage["type"] })} className="h-8">
                      <option>Breakfast</option><option>Lunch</option><option>Dinner</option><option>High Tea</option><option>Buffet</option>
                    </Select>
                  </td>
                  <td className="px-3 py-2 text-right"><Input type="number" value={p.price} onChange={e => updFb(p.id, { price: Number(e.target.value) })} className="h-8 w-24 tabular text-right" /></td>
                  <td className="px-3 py-2 text-right"><div className="inline-flex items-center gap-1"><Input type="number" value={p.gst} onChange={e => updFb(p.id, { gst: Number(e.target.value) })} className="h-8 w-14 tabular text-right" /><span className="text-xs text-muted-foreground">%</span></div></td>
                  <td className="px-3 py-2 text-center"><input type="checkbox" checked={p.active} onChange={e => updFb(p.id, { active: e.target.checked })} className="h-4 w-4" /></td>
                  <td className="px-3 py-2 text-right"><button type="button" onClick={() => { onFbChange(fb.filter(x => x.id !== p.id)); onToast("F&B removed"); }} className="h-7 w-7 rounded-md border border-border hover:bg-danger hover:text-white hover:border-danger inline-flex items-center justify-center text-muted-foreground"><Trash2 className="h-3.5 w-3.5" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Hall / venue packages</p>
          <Button size="sm" onClick={() => { onHallsChange([...halls, { id: `hp${tempSeq()}`, name: "New hall", capacity: 100, hourly: 2500, halfDay: 10000, fullDay: 18000, setupFee: 1500, gst: 18, extraPaxFee: 0, active: true }]); onToast("Hall package added"); }}><Plus className="h-3.5 w-3.5" />Add</Button>
        </div>
        <div className="rounded-md border border-border overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-elevated border-b border-border">
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2 font-semibold">Name</th>
                <th className="px-3 py-2 font-semibold text-right">Capacity</th>
                <th className="px-3 py-2 font-semibold text-right">Hourly</th>
                <th className="px-3 py-2 font-semibold text-right">Half day</th>
                <th className="px-3 py-2 font-semibold text-right">Full day</th>
                <th className="px-3 py-2 font-semibold text-right">Setup</th>
                <th className="px-3 py-2 font-semibold text-right">GST</th>
                <th className="px-3 py-2 font-semibold text-right">Extra/pax</th>
                <th className="px-3 py-2 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {halls.map(h => (
                <tr key={h.id} className="hover:bg-surface-sunken/30">
                  <td className="px-3 py-2"><Input value={h.name} onChange={e => updHall(h.id, { name: e.target.value })} className="h-8" /></td>
                  <td className="px-3 py-2 text-right"><Input type="number" value={h.capacity} onChange={e => updHall(h.id, { capacity: Number(e.target.value) })} className="h-8 w-20 tabular text-right" /></td>
                  <td className="px-3 py-2 text-right"><Input type="number" value={h.hourly} onChange={e => updHall(h.id, { hourly: Number(e.target.value) })} className="h-8 w-24 tabular text-right" /></td>
                  <td className="px-3 py-2 text-right"><Input type="number" value={h.halfDay} onChange={e => updHall(h.id, { halfDay: Number(e.target.value) })} className="h-8 w-24 tabular text-right" /></td>
                  <td className="px-3 py-2 text-right"><Input type="number" value={h.fullDay} onChange={e => updHall(h.id, { fullDay: Number(e.target.value) })} className="h-8 w-24 tabular text-right" /></td>
                  <td className="px-3 py-2 text-right"><Input type="number" value={h.setupFee} onChange={e => updHall(h.id, { setupFee: Number(e.target.value) })} className="h-8 w-20 tabular text-right" /></td>
                  <td className="px-3 py-2 text-right"><div className="inline-flex items-center gap-1"><Input type="number" value={h.gst} onChange={e => updHall(h.id, { gst: Number(e.target.value) })} className="h-8 w-14 tabular text-right" /><span className="text-xs text-muted-foreground">%</span></div></td>
                  <td className="px-3 py-2 text-right"><div className="inline-flex items-center gap-1"><span className="text-xs text-muted-foreground">₹</span><Input type="number" value={h.extraPaxFee} onChange={e => updHall(h.id, { extraPaxFee: Number(e.target.value) })} className="h-8 w-16 tabular text-right" /></div></td>
                  <td className="px-3 py-2 text-right"><button type="button" onClick={() => { onHallsChange(halls.filter(x => x.id !== h.id)); onToast("Hall removed"); }} className="h-7 w-7 rounded-md border border-border hover:bg-danger hover:text-white hover:border-danger inline-flex items-center justify-center text-muted-foreground"><Trash2 className="h-3.5 w-3.5" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Banquet catering packages (per pax) — used by New Hall Booking</p>
          <Button size="sm" onClick={() => { onBanquetChange([...banquet, { id: `bq${tempSeq()}`, name: "New package", desc: "", pricePerPax: 250, veg: true, active: true }]); onToast("Banquet package added"); }}><Plus className="h-3.5 w-3.5" />Add</Button>
        </div>
        <div className="rounded-md border border-border overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-elevated border-b border-border">
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2 font-semibold">Name</th>
                <th className="px-3 py-2 font-semibold">Description</th>
                <th className="px-3 py-2 font-semibold text-right">Price/pax</th>
                <th className="px-3 py-2 font-semibold">Veg</th>
                <th className="px-3 py-2 font-semibold">Active</th>
                <th className="px-3 py-2 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {banquet.map(b => (
                <tr key={b.id} className="hover:bg-surface-sunken/30">
                  <td className="px-3 py-2"><Input value={b.name} onChange={e => updBanquet(b.id, { name: e.target.value })} className="h-8" /></td>
                  <td className="px-3 py-2"><Input value={b.desc} onChange={e => updBanquet(b.id, { desc: e.target.value })} className="h-8" /></td>
                  <td className="px-3 py-2 text-right"><Input type="number" value={b.pricePerPax} onChange={e => updBanquet(b.id, { pricePerPax: Number(e.target.value) })} className="h-8 w-24 tabular text-right" /></td>
                  <td className="px-3 py-2 text-center"><input type="checkbox" checked={b.veg} onChange={e => updBanquet(b.id, { veg: e.target.checked })} className="h-4 w-4" /></td>
                  <td className="px-3 py-2 text-center"><input type="checkbox" checked={b.active} onChange={e => updBanquet(b.id, { active: e.target.checked })} className="h-4 w-4" /></td>
                  <td className="px-3 py-2 text-right"><button type="button" onClick={() => { onBanquetChange(banquet.filter(x => x.id !== b.id)); onToast("Package removed"); }} className="h-7 w-7 rounded-md border border-border hover:bg-danger hover:text-white hover:border-danger inline-flex items-center justify-center text-muted-foreground"><Trash2 className="h-3.5 w-3.5" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Add-on services — used by New Hall Booking</p>
          <Button size="sm" onClick={() => { onExtrasChange([...extras, { id: `xs${tempSeq()}`, label: "New service", price: 1000, active: true }]); onToast("Service added"); }}><Plus className="h-3.5 w-3.5" />Add</Button>
        </div>
        <div className="rounded-md border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-elevated border-b border-border">
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2 font-semibold">Service</th>
                <th className="px-3 py-2 font-semibold text-right">Price</th>
                <th className="px-3 py-2 font-semibold">Active</th>
                <th className="px-3 py-2 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {extras.map(s => (
                <tr key={s.id} className="hover:bg-surface-sunken/30">
                  <td className="px-3 py-2"><Input value={s.label} onChange={e => updExtra(s.id, { label: e.target.value })} className="h-8" /></td>
                  <td className="px-3 py-2 text-right"><Input type="number" value={s.price} onChange={e => updExtra(s.id, { price: Number(e.target.value) })} className="h-8 w-24 tabular text-right" /></td>
                  <td className="px-3 py-2 text-center"><input type="checkbox" checked={s.active} onChange={e => updExtra(s.id, { active: e.target.checked })} className="h-4 w-4" /></td>
                  <td className="px-3 py-2 text-right"><button type="button" onClick={() => { onExtrasChange(extras.filter(x => x.id !== s.id)); onToast("Service removed"); }} className="h-7 w-7 rounded-md border border-border hover:bg-danger hover:text-white hover:border-danger inline-flex items-center justify-center text-muted-foreground"><Trash2 className="h-3.5 w-3.5" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-end pt-3 border-t border-border">
        <Button variant="success" onClick={() => { onMarkComplete(); onToast("F&B & hall packages saved"); }}><Save className="h-4 w-4" />Save</Button>
      </div>
    </div>
  );
}

// ===================== AGENTS & CORPORATES =====================
function AgentsManager({ agents, onChange, onToast, onMarkComplete }: {
  agents: AgentRec[]; onChange: (a: AgentRec[]) => void; onToast: (m: string) => void; onMarkComplete: () => void;
}) {
  const upd = (id: string, patch: Partial<AgentRec>) => onChange(agents.map(a => a.id === id ? { ...a, ...patch } : a));
  const totalCredit = agents.reduce((t, a) => t + a.creditLimit, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <SummaryStat icon={Briefcase} label="Total accounts" value={agents.length} />
        <SummaryStat icon={CheckCircle2} label="Active" value={agents.filter(a => a.active).length} accent="success" />
        <SummaryStat icon={Briefcase} label="Corporate" value={agents.filter(a => a.type === "Corporate").length} />
        <SummaryStat icon={IndianRupee} label="Total credit limit" value={`₹${(totalCredit / 100000).toFixed(1)}L`} />
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">B2B accounts that route bookings to your property. Commission & credit limits enforced at booking.</p>
        <Button size="sm" onClick={() => { onChange([...agents, { id: `ag${tempSeq()}`, type: "Agent", name: "New account", contact: "", phone: "", email: "", gstin: "", creditLimit: 100000, commissionPct: 10, creditTerms: "Net 30", active: true }]); onToast("Account added"); }}><Plus className="h-3.5 w-3.5" />Add account</Button>
      </div>
      <div className="rounded-md border border-border overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface-elevated border-b border-border">
            <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-3 py-2 font-semibold">Type</th>
              <th className="px-3 py-2 font-semibold">Name</th>
              <th className="px-3 py-2 font-semibold">Contact</th>
              <th className="px-3 py-2 font-semibold">Phone</th>
              <th className="px-3 py-2 font-semibold">GSTIN</th>
              <th className="px-3 py-2 font-semibold text-right">Credit limit</th>
              <th className="px-3 py-2 font-semibold text-right">Comm.</th>
              <th className="px-3 py-2 font-semibold">Terms</th>
              <th className="px-3 py-2 font-semibold">Active</th>
              <th className="px-3 py-2 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {agents.map(a => (
              <tr key={a.id} className="hover:bg-surface-sunken/30">
                <td className="px-3 py-2">
                  <Select value={a.type} onChange={e => upd(a.id, { type: e.target.value as AgentRec["type"] })} className="h-8">
                    <option>Agent</option><option>Corporate</option>
                  </Select>
                </td>
                <td className="px-3 py-2"><Input value={a.name} onChange={e => upd(a.id, { name: e.target.value })} className="h-8 min-w-[150px]" /></td>
                <td className="px-3 py-2"><Input value={a.contact} onChange={e => upd(a.id, { contact: e.target.value })} className="h-8 min-w-[120px]" /></td>
                <td className="px-3 py-2"><Input value={a.phone} onChange={e => upd(a.id, { phone: e.target.value })} className="h-8 font-mono tabular min-w-[140px]" /></td>
                <td className="px-3 py-2"><Input value={a.gstin} onChange={e => upd(a.id, { gstin: e.target.value.toUpperCase() })} className="h-8 font-mono tabular min-w-[160px]" maxLength={15} /></td>
                <td className="px-3 py-2 text-right"><Input type="number" value={a.creditLimit} onChange={e => upd(a.id, { creditLimit: Number(e.target.value) })} className="h-8 w-28 tabular text-right" /></td>
                <td className="px-3 py-2 text-right"><div className="inline-flex items-center gap-1"><Input type="number" value={a.commissionPct} onChange={e => upd(a.id, { commissionPct: Number(e.target.value) })} className="h-8 w-14 tabular text-right" /><span className="text-xs text-muted-foreground">%</span></div></td>
                <td className="px-3 py-2">
                  <Select value={a.creditTerms} onChange={e => upd(a.id, { creditTerms: e.target.value as AgentRec["creditTerms"] })} className="h-8">
                    <option>Net 7</option><option>Net 15</option><option>Net 30</option><option>Net 45</option><option>Net 60</option>
                  </Select>
                </td>
                <td className="px-3 py-2 text-center"><input type="checkbox" checked={a.active} onChange={e => upd(a.id, { active: e.target.checked })} className="h-4 w-4" /></td>
                <td className="px-3 py-2 text-right"><button type="button" onClick={() => { onChange(agents.filter(x => x.id !== a.id)); onToast("Account removed"); }} className="h-7 w-7 rounded-md border border-border hover:bg-danger hover:text-white hover:border-danger inline-flex items-center justify-center text-muted-foreground"><Trash2 className="h-3.5 w-3.5" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-end pt-3 border-t border-border">
        <Button variant="success" onClick={() => { onMarkComplete(); onToast("Agents & corporates saved"); }}><Save className="h-4 w-4" />Save</Button>
      </div>
    </div>
  );
}

// ===================== TAX (GST SLABS + PAYMENT METHODS) =====================
function TaxManager({ slabs, methods, onSlabsChange, onMethodsChange, onToast, onMarkComplete }: {
  slabs: GSTSlab[]; methods: PaymentMethod[];
  onSlabsChange: (s: GSTSlab[]) => void; onMethodsChange: (m: PaymentMethod[]) => void;
  onToast: (m: string) => void; onMarkComplete: () => void;
}) {
  const updSlab = (id: string, patch: Partial<GSTSlab>) => onSlabsChange(slabs.map(s => s.id === id ? { ...s, ...patch } : s));
  const updMethod = (id: string, patch: Partial<PaymentMethod>) => onMethodsChange(methods.map(m => m.id === id ? { ...m, ...patch } : m));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <SummaryStat icon={Receipt} label="GST slabs" value={slabs.length} />
        <SummaryStat icon={IndianRupee} label="Payment methods" value={methods.filter(m => m.active).length} accent="success" />
        <SummaryStat icon={IndianRupee} label="Card fee" value={`${methods.find(m => m.code === "CARD")?.feePct ?? 0}%`} />
        <SummaryStat icon={IndianRupee} label="UPI fee" value={`${methods.find(m => m.code === "UPI")?.feePct ?? 0}%`} />
      </div>

      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Room GST slabs (per Govt of India)</p>
        <div className="rounded-md border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-elevated border-b border-border">
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2 font-semibold">Slab name</th>
                <th className="px-3 py-2 font-semibold text-right">From (₹)</th>
                <th className="px-3 py-2 font-semibold text-right">To (₹)</th>
                <th className="px-3 py-2 font-semibold text-right">GST rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {slabs.map(s => (
                <tr key={s.id} className="hover:bg-surface-sunken/30">
                  <td className="px-3 py-2"><Input value={s.label} onChange={e => updSlab(s.id, { label: e.target.value })} className="h-8 min-w-[200px]" /></td>
                  <td className="px-3 py-2 text-right"><Input type="number" value={s.from} onChange={e => updSlab(s.id, { from: Number(e.target.value) })} className="h-8 w-28 tabular text-right" /></td>
                  <td className="px-3 py-2 text-right"><Input type="number" value={s.to ?? ""} onChange={e => updSlab(s.id, { to: e.target.value === "" ? null : Number(e.target.value) })} placeholder="∞" className="h-8 w-28 tabular text-right" /></td>
                  <td className="px-3 py-2 text-right"><div className="inline-flex items-center gap-1"><Input type="number" value={s.rate} onChange={e => updSlab(s.id, { rate: Number(e.target.value) })} className="h-8 w-16 tabular text-right" /><span className="text-xs text-muted-foreground">%</span></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">Slabs apply per Govt of India — assessed on the room tariff before discount.</p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Payment methods</p>
          <Button size="sm" onClick={() => { onMethodsChange([...methods, { id: `pm${tempSeq()}`, name: "New method", code: "NEW", type: "Online", feePct: 0, settlement: "Cash drawer", active: true }]); onToast("Payment method added"); }}><Plus className="h-3.5 w-3.5" />Add method</Button>
        </div>
        <div className="rounded-md border border-border overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-elevated border-b border-border">
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2 font-semibold">Name</th>
                <th className="px-3 py-2 font-semibold">Code</th>
                <th className="px-3 py-2 font-semibold">Type</th>
                <th className="px-3 py-2 font-semibold text-right">Fee</th>
                <th className="px-3 py-2 font-semibold">Settlement A/c</th>
                <th className="px-3 py-2 font-semibold">Active</th>
                <th className="px-3 py-2 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {methods.map(m => (
                <tr key={m.id} className="hover:bg-surface-sunken/30">
                  <td className="px-3 py-2"><Input value={m.name} onChange={e => updMethod(m.id, { name: e.target.value })} className="h-8 min-w-[150px]" /></td>
                  <td className="px-3 py-2"><Input value={m.code} onChange={e => updMethod(m.id, { code: e.target.value.toUpperCase() })} className="h-8 w-20 font-mono tabular" /></td>
                  <td className="px-3 py-2">
                    <Select value={m.type} onChange={e => updMethod(m.id, { type: e.target.value as PaymentMethod["type"] })} className="h-8">
                      <option>Cash</option><option>Card</option><option>Online</option><option>Bank</option><option>Credit</option>
                    </Select>
                  </td>
                  <td className="px-3 py-2 text-right"><div className="inline-flex items-center gap-1"><Input type="number" step="0.1" value={m.feePct} onChange={e => updMethod(m.id, { feePct: Number(e.target.value) })} className="h-8 w-16 tabular text-right" /><span className="text-xs text-muted-foreground">%</span></div></td>
                  <td className="px-3 py-2"><Input value={m.settlement} onChange={e => updMethod(m.id, { settlement: e.target.value })} className="h-8 min-w-[180px]" /></td>
                  <td className="px-3 py-2 text-center"><input type="checkbox" checked={m.active} onChange={e => updMethod(m.id, { active: e.target.checked })} className="h-4 w-4" /></td>
                  <td className="px-3 py-2 text-right"><button type="button" onClick={() => { onMethodsChange(methods.filter(x => x.id !== m.id)); onToast("Method removed"); }} className="h-7 w-7 rounded-md border border-border hover:bg-danger hover:text-white hover:border-danger inline-flex items-center justify-center text-muted-foreground"><Trash2 className="h-3.5 w-3.5" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-end pt-3 border-t border-border">
        <Button variant="success" onClick={() => { onMarkComplete(); onToast("Tax & payment methods saved"); }}><Save className="h-4 w-4" />Save</Button>
      </div>
    </div>
  );
}

// ===================== NOTIFICATION TEMPLATES =====================
function TemplatesManager({ templates, onChange, onToast, onMarkComplete }: {
  templates: Template[]; onChange: (t: Template[]) => void; onToast: (m: string) => void; onMarkComplete: () => void;
}) {
  const upd = (id: string, patch: Partial<Template>) => onChange(templates.map(t => t.id === id ? { ...t, ...patch } : t));
  const [previewing, setPreviewing] = React.useState<Template | null>(null);

  const sampleBody = (t: Template) => {
    const en = `Dear {{guest_name}},\n\nThis is regarding your booking {{booking_no}} for ${t.event.toLowerCase()}.\nRoom: {{room_no}} · Check-in: {{check_in}}\n\nWarm regards,\nThe Pearl Marina`;
    const hi = `प्रिय {{guest_name}},\n\nयह सूचना आपकी बुकिंग {{booking_no}} (${t.event}) के सम्बन्ध में है।\nकमरा: {{room_no}} · प्रवेश: {{check_in}}\n\nसादर,\nद पर्ल मरीना`;
    const mr = `नमस्कार {{guest_name}},\n\n${t.event} संदर्भात आपली बुकिंग {{booking_no}}.\nखोली: {{room_no}} · आगमन: {{check_in}}\n\nधन्यवाद,\nद पर्ल मरीना`;
    const ar = `عزيزي {{guest_name}}،\n\nبخصوص حجزك {{booking_no}} لـ ${t.event}.\nالغرفة: {{room_no}} · تسجيل الوصول: {{check_in}}\n\nمع التحية،\nفندق ذا بيرل مارينا`;
    return t.language === "Hindi" ? hi : t.language === "Marathi" ? mr : t.language === "Arabic" ? ar : en;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <SummaryStat icon={MessageSquare} label="Total templates" value={templates.length} />
        <SummaryStat icon={CheckCircle2} label="Active" value={templates.filter(t => t.active).length} accent="success" />
        <SummaryStat icon={MessageSquare} label="WhatsApp" value={templates.filter(t => t.channel === "WhatsApp").length} />
        <SummaryStat icon={MessageSquare} label="Languages" value={new Set(templates.map(t => t.language)).size} />
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Pre-approved guest messages — body editing is per-channel (WhatsApp BSP approval may be required).</p>
        <Button size="sm" onClick={() => { onChange([...templates, { id: `t${tempSeq()}`, event: "New event", channel: "Email", language: "English", active: false }]); onToast("Template added"); }}><Plus className="h-3.5 w-3.5" />Add template</Button>
      </div>
      <div className="rounded-md border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-elevated border-b border-border">
            <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-3 py-2 font-semibold">Event</th>
              <th className="px-3 py-2 font-semibold">Channel</th>
              <th className="px-3 py-2 font-semibold">Language</th>
              <th className="px-3 py-2 font-semibold">Active</th>
              <th className="px-3 py-2 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {templates.map(t => (
              <tr key={t.id} className="hover:bg-surface-sunken/30">
                <td className="px-3 py-2"><Input value={t.event} onChange={e => upd(t.id, { event: e.target.value })} className="h-8 min-w-[200px]" /></td>
                <td className="px-3 py-2">
                  <Select value={t.channel} onChange={e => upd(t.id, { channel: e.target.value as Template["channel"] })} className="h-8">
                    <option>Email</option><option>WhatsApp</option><option>SMS</option>
                  </Select>
                </td>
                <td className="px-3 py-2">
                  <Select value={t.language} onChange={e => upd(t.id, { language: e.target.value as Template["language"] })} className="h-8">
                    <option>English</option><option>Hindi</option><option>Marathi</option><option>Arabic</option>
                  </Select>
                </td>
                <td className="px-3 py-2 text-center"><input type="checkbox" checked={t.active} onChange={e => upd(t.id, { active: e.target.checked })} className="h-4 w-4" /></td>
                <td className="px-3 py-2 text-right">
                  <div className="inline-flex gap-1">
                    <button type="button" className="h-7 w-7 rounded-md border border-border hover:bg-brand hover:text-brand-foreground hover:border-brand inline-flex items-center justify-center text-muted-foreground" title="Preview body" onClick={() => setPreviewing(t)}><Eye className="h-3.5 w-3.5" /></button>
                    <button type="button" onClick={() => { onChange(templates.filter(x => x.id !== t.id)); onToast("Template removed"); }} className="h-7 w-7 rounded-md border border-border hover:bg-danger hover:text-white hover:border-danger inline-flex items-center justify-center text-muted-foreground"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-end pt-3 border-t border-border">
        <Button variant="success" onClick={() => { onMarkComplete(); onToast("Templates saved"); }}><Save className="h-4 w-4" />Save</Button>
      </div>

      {/* Preview modal */}
      {previewing && <TemplatePreviewModal template={previewing} body={sampleBody(previewing)} onClose={() => setPreviewing(null)} onToast={onToast} />}
    </div>
  );
}

function TemplatePreviewModal({ template, body, onClose, onToast }: {
  template: Template;
  body: string;
  onClose: () => void;
  onToast: (m: string) => void;
}) {
  React.useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; document.removeEventListener("keydown", onKey); };
  }, [onClose]);

  const isWhatsApp = template.channel === "WhatsApp";
  const isSMS = template.channel === "SMS";

  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface rounded-xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="h-9 w-9 rounded-md bg-brand-soft text-brand-soft-foreground inline-flex items-center justify-center"><Eye className="h-4 w-4" /></span>
            <div>
              <h3 className="font-semibold">Template preview</h3>
              <p className="text-xs text-muted-foreground">{template.event} · {template.channel} · {template.language}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="h-7 w-7 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>

        <div className="px-5 py-4 space-y-3 overflow-y-auto">
          {/* Channel-styled mock preview */}
          {isWhatsApp ? (
            <div className="rounded-lg bg-[#e7f3e7] dark:bg-success-soft/20 p-3 border border-success/20">
              <p className="text-[10px] uppercase tracking-wider text-success font-semibold mb-1.5">WhatsApp Business · The Pearl Marina</p>
              <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground">{body}</p>
              <p className="text-[10px] text-muted-foreground mt-2 tabular text-right">14:23 · ✓✓</p>
            </div>
          ) : isSMS ? (
            <div className="rounded-lg bg-info-soft/20 p-3 border border-info/20 font-mono text-sm">
              <p className="text-[10px] uppercase tracking-wider text-info font-semibold mb-1.5">SMS · 160 chars max</p>
              <p className="whitespace-pre-wrap leading-relaxed">{body.slice(0, 160)}</p>
              {body.length > 160 && <p className="text-[10px] text-warning mt-1">⚠ Truncated · would split into {Math.ceil(body.length / 160)} parts</p>}
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-surface overflow-hidden">
              <div className="bg-surface-elevated px-3 py-2 border-b border-border text-xs">
                <p><strong>From:</strong> reservations@thepearl.in</p>
                <p><strong>To:</strong> guest@example.com</p>
                <p><strong>Subject:</strong> {template.event} — The Pearl Marina</p>
              </div>
              <div className="p-4 text-sm whitespace-pre-wrap leading-relaxed">{body}</div>
            </div>
          )}

          <div className="rounded-md bg-surface-sunken/40 border border-border p-2.5 text-[11px] text-muted-foreground space-y-1">
            <p className="font-semibold uppercase tracking-wider text-[10px] text-foreground">Available variables</p>
            <p className="font-mono">{"{{guest_name}} · {{booking_no}} · {{room_no}} · {{check_in}} · {{check_out}} · {{amount}}"}</p>
          </div>
        </div>

        <div className="flex justify-between gap-2 px-5 py-3 border-t border-border bg-surface-sunken/30">
          <Button variant="ghost" onClick={() => { navigator.clipboard?.writeText(body); onToast("Template body copied"); }}>
            <Save className="h-3.5 w-3.5" />Copy
          </Button>
          <Button onClick={() => { onToast(`Test ${template.channel} sent to Khalid R.`); onClose(); }}>
            Send test
          </Button>
        </div>
      </div>
    </div>
  );
}

// ===================== ROLES & PERMISSIONS =====================
// Page access catalog for the Roles editor — the real sidebar pages, grouped.
// A role's `permissions` set holds the hrefs it may open (drives the sidebar +
// route guard via /login pages). Admin/Owner always get everything.
const PAGE_GROUPS = (["operations", "billing", "people", "erp", "system"] as const)
  .map(group => ({ group, label: GROUP_LABEL[group], items: NAV.filter(n => n.group === group) }))
  .filter(g => g.items.length > 0);
const ADMIN_ROLES = ["owner", "admin"];

function RolesManager({ roles, onChange, onToast, onMarkComplete }: {
  roles: Role[]; onChange: (r: Role[]) => void; onToast: (m: string) => void; onMarkComplete: () => void;
}) {
  const [activeRoleId, setActiveRoleId] = React.useState<string>(roles[0]?.id ?? "");
  const activeRole = roles.find(r => r.id === activeRoleId) ?? roles[0];
  const togglePerm = (perm: string) => {
    if (!activeRole) return;
    const next = new Set(activeRole.permissions);
    if (next.has(perm)) next.delete(perm); else next.add(perm);
    onChange(roles.map(r => r.id === activeRole.id ? { ...r, permissions: next } : r));
  };
  const totalPages = PAGE_GROUPS.reduce((t, g) => t + g.items.length, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <SummaryStat icon={KeySquare} label="Roles" value={roles.length} />
        <SummaryStat icon={Users} label="Total users" value={roles.reduce((t, r) => t + r.users, 0)} />
        <SummaryStat icon={CheckCircle2} label="Pages" value={totalPages} />
        <SummaryStat icon={CheckCircle2} label="Active roles" value={roles.filter(r => r.active).length} accent="success" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Role list */}
        <div className="lg:col-span-1 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Roles</p>
            <Button size="sm" onClick={() => {
              const id = `ro${tempSeq()}`;
              onChange([...roles, { id, name: "New role", users: 0, permissions: new Set(), active: true }]);
              setActiveRoleId(id);
              onToast("Role added");
            }}><Plus className="h-3.5 w-3.5" />Add</Button>
          </div>
          <div className="rounded-md border border-border overflow-hidden divide-y divide-border max-h-[420px] overflow-y-auto">
            {roles.map(r => (
              <button key={r.id} type="button" onClick={() => setActiveRoleId(r.id)}
                className={cn(
                  "w-full px-3 py-2.5 text-left transition-colors flex items-center justify-between gap-2",
                  activeRoleId === r.id ? "bg-brand-soft text-brand-soft-foreground" : "hover:bg-surface-sunken"
                )}>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{r.name}</p>
                  <p className="text-[10px] text-muted-foreground">{ADMIN_ROLES.includes(r.name.toLowerCase()) ? "All pages" : `${r.permissions.size} page${r.permissions.size === 1 ? "" : "s"}`}</p>
                </div>
                {!r.active && <Badge tone="neutral">off</Badge>}
              </button>
            ))}
          </div>
        </div>

        {/* Permission matrix for the active role */}
        <div className="lg:col-span-2 space-y-3">
          {activeRole ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-md border border-border bg-surface-sunken/30">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase tracking-wider">Role name</Label>
                  <Input value={activeRole.name} onChange={e => onChange(roles.map(r => r.id === activeRole.id ? { ...r, name: e.target.value } : r))} className="h-8" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase tracking-wider"># users assigned</Label>
                  <Input type="number" value={activeRole.users} onChange={e => onChange(roles.map(r => r.id === activeRole.id ? { ...r, users: Number(e.target.value) } : r))} className="h-8 tabular" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase tracking-wider">Status</Label>
                  <div className="h-8 flex items-center gap-2 px-2 rounded-md border border-border bg-surface">
                    <input type="checkbox" checked={activeRole.active} onChange={e => onChange(roles.map(r => r.id === activeRole.id ? { ...r, active: e.target.checked } : r))} className="h-4 w-4" />
                    <span className="text-xs">Active</span>
                  </div>
                </div>
              </div>

              {ADMIN_ROLES.includes(activeRole.name.toLowerCase()) ? (
                <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  <KeySquare className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                  <span className="font-medium text-foreground">{activeRole.name}</span> has full access to every page.
                </div>
              ) : (
                <div className="rounded-md border border-border divide-y divide-border max-h-[420px] overflow-y-auto">
                  <div className="px-3 py-2 flex items-center justify-between bg-surface-sunken/30">
                    <p className="text-[11px] text-muted-foreground">Tick the pages this role can open. Unticked pages are hidden from their sidebar and blocked.</p>
                    <div className="flex gap-1.5">
                      <button type="button" onClick={() => onChange(roles.map(r => r.id === activeRole.id ? { ...r, permissions: new Set(PAGE_GROUPS.flatMap(g => g.items.map(i => i.href))) } : r))} className="text-[11px] text-brand hover:underline">All</button>
                      <button type="button" onClick={() => onChange(roles.map(r => r.id === activeRole.id ? { ...r, permissions: new Set<string>() } : r))} className="text-[11px] text-muted-foreground hover:underline">None</button>
                    </div>
                  </div>
                  {PAGE_GROUPS.map(g => (
                    <div key={g.group} className="p-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{g.label}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {g.items.map(item => {
                          const on = activeRole.permissions.has(item.href);
                          return (
                            <button key={item.href} type="button" onClick={() => togglePerm(item.href)}
                              className={cn(
                                "h-7 px-3 rounded-full text-[11px] font-medium border transition-colors",
                                on ? "bg-brand-soft border-brand text-brand-soft-foreground" : "border-border hover:bg-surface-sunken text-muted-foreground"
                              )}>
                              {on && <CheckCircle2 className="h-3 w-3 inline mr-1" />}{item.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-muted-foreground">{activeRole.permissions.size} page{activeRole.permissions.size === 1 ? "" : "s"} allowed for <span className="font-medium text-foreground">{activeRole.name}</span></p>
                <button type="button" onClick={() => { onChange(roles.filter(r => r.id !== activeRole.id)); setActiveRoleId(roles.find(r => r.id !== activeRole.id)?.id ?? ""); onToast("Role removed"); }} className="text-xs text-danger hover:underline inline-flex items-center gap-1">
                  <Trash2 className="h-3 w-3" />Delete role
                </button>
              </div>
            </>
          ) : (
            <div className="rounded-md border border-dashed border-border p-12 text-center text-sm text-muted-foreground">Select a role to manage permissions</div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end pt-3 border-t border-border">
        <Button variant="success" onClick={() => { onMarkComplete(); onToast("Roles & permissions saved"); }}><Save className="h-4 w-4" />Save</Button>
      </div>
    </div>
  );
}

// ===================== HELPERS =====================
function SummaryStat({ icon: Icon, label, value, accent }: { icon: typeof BedDouble; label: string; value: number | string; accent?: "success" | "warning" | "danger" }) {
  return (
    <div className="rounded-md border border-border bg-surface-sunken/40 px-3 py-2.5 flex items-center gap-2.5">
      <span className={cn(
        "h-8 w-8 rounded-md flex items-center justify-center shrink-0",
        accent === "success" ? "bg-success-soft text-success" :
        accent === "warning" ? "bg-warning-soft text-warning" :
        accent === "danger" ? "bg-danger-soft text-danger" :
        "bg-brand-soft text-brand-soft-foreground"
      )}>
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
        <p className="text-base font-semibold tabular">{value}</p>
      </div>
    </div>
  );
}

function CheckboxRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="h-4 w-4 rounded border-border text-brand focus:ring-ring" />
      <span className="font-medium">{label}</span>
    </label>
  );
}

function FormSection({ title, icon: Icon, children }: { title: string; icon: typeof BedDouble; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-3.5 w-3.5 text-brand" />
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{title}</p>
      </div>
      {children}
    </div>
  );
}

function Field2({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px]">{label}</Label>
      {children}
    </div>
  );
}

// ============================================================
// BRANDING & ASSETS MANAGER
// ============================================================
// Canonical brand colors — what the "Reset to default" button restores.
const DEFAULT_BRAND_COLOR = "#DBB014";
const DEFAULT_ACCENT_COLOR = "#D7B81D";

function BrandingManager({ onToast, onMarkComplete }: { onToast: (m: string) => void; onMarkComplete: () => void }) {
  const [logoUrl, setLogoUrl] = React.useState("");
  const [faviconUrl, setFaviconUrl] = React.useState("");
  const [brandColor, setBrandColor] = React.useState(DEFAULT_BRAND_COLOR);
  const [accentColor, setAccentColor] = React.useState(DEFAULT_ACCENT_COLOR);
  const [letterhead, setLetterhead] = React.useState("THE PEARL MARINA\nMG Road, Bandra West, Mumbai 400050\nGSTIN 27AAACR5055K1Z5 · PAN AAACR5055K");
  const [emailSig, setEmailSig] = React.useState("Reception · The Pearl Marina\nT: +91 22 6770 1234 · concierge@thepearl.in");
  const [invoiceFooter, setInvoiceFooter] = React.useState("Subject to Mumbai jurisdiction. Goods/Services once sold will not be taken back. This is a computer generated invoice.");
  const [fontPair, setFontPair] = React.useState("PT Serif + Inter");

  const save = useSettingsPersistence(
    "branding",
    { logoUrl, faviconUrl, brandColor, accentColor, letterhead, emailSig, invoiceFooter, fontPair },
    v => {
      if (v.logoUrl !== undefined) setLogoUrl(v.logoUrl);
      if (v.faviconUrl !== undefined) setFaviconUrl(v.faviconUrl);
      if (v.brandColor !== undefined) setBrandColor(v.brandColor);
      if (v.accentColor !== undefined) setAccentColor(v.accentColor);
      if (v.letterhead !== undefined) setLetterhead(v.letterhead);
      if (v.emailSig !== undefined) setEmailSig(v.emailSig);
      if (v.invoiceFooter !== undefined) setInvoiceFooter(v.invoiceFooter);
      if (v.fontPair !== undefined) setFontPair(v.fontPair);
    },
  );

  // Live-apply brand colors / fonts / favicon / email signature as they change,
  // so the operator sees the effect immediately (persisted on Save).
  React.useEffect(() => {
    applyBranding({ logoUrl, faviconUrl, brandColor, accentColor, emailSig, fontPair });
  }, [logoUrl, faviconUrl, brandColor, accentColor, emailSig, fontPair]);

  const onFile = (kind: "logo" | "favicon") => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onToast(`Uploading ${file.name}…`);
    try {
      const { url } = await apiUpload(file);
      if (kind === "logo") setLogoUrl(url); else setFaviconUrl(url);
      // Persist immediately so the uploaded image survives a page reload.
      await apiPut("/settings/branding", {
        logoUrl: kind === "logo" ? url : logoUrl,
        faviconUrl: kind === "favicon" ? url : faviconUrl,
        brandColor, accentColor, letterhead, emailSig, invoiceFooter, fontPair,
      });
      onToast(`${kind === "logo" ? "Logo" : "Favicon"} uploaded & saved ✓`);
    } catch {
      onToast("⚠ Upload failed — is the backend running?");
    } finally {
      e.target.value = ""; // allow re-uploading the same file
    }
  };

  return (
    <div className="space-y-5">
      <p className="text-xs text-muted-foreground">Configure brand assets used on invoices, emails, the booking widget, and printed receipts.</p>

      {/* Logo + Favicon */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-2 inline-flex items-center gap-1"><ImageIcon className="h-3 w-3" />Property logo</p>
          <div className="rounded-md bg-linear-to-br from-surface-sunken to-surface-elevated p-6 flex items-center justify-center border border-dashed border-border min-h-[120px]">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="Property logo" className="max-h-24 max-w-full object-contain" />
            ) : (
              <div className="text-center text-muted-foreground">
                <ImageIcon className="h-8 w-8 mx-auto mb-1" />
                <p className="text-xs">No logo uploaded</p>
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-3">
            <label className="flex-1 h-9 rounded-md border border-border hover:bg-surface-sunken inline-flex items-center justify-center gap-1.5 text-xs font-medium cursor-pointer transition-colors">
              <Upload className="h-3.5 w-3.5" />Upload logo
              <input type="file" accept="image/*" className="hidden" onChange={onFile("logo")} />
            </label>
            <Button variant="ghost" size="sm" onClick={() => { setLogoUrl(""); onToast("Logo removed"); }}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5">PNG/SVG · transparent bg · max 1MB · 240×120 recommended</p>
        </Card>

        <Card className="p-4">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-2 inline-flex items-center gap-1"><ImageIcon className="h-3 w-3" />Favicon</p>
          <div className="rounded-md bg-linear-to-br from-surface-sunken to-surface-elevated p-6 flex items-center justify-center border border-dashed border-border min-h-[120px]">
            {faviconUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={faviconUrl} alt="Favicon" className="h-12 w-12 object-contain rounded-md" />
            ) : (
              <div className="h-12 w-12 rounded-md bg-brand text-brand-foreground flex items-center justify-center font-bold text-xl">P</div>
            )}
          </div>
          <div className="flex gap-2 mt-3">
            <label className="flex-1 h-9 rounded-md border border-border hover:bg-surface-sunken inline-flex items-center justify-center gap-1.5 text-xs font-medium cursor-pointer transition-colors">
              <Upload className="h-3.5 w-3.5" />Upload favicon
              <input type="file" accept="image/*" className="hidden" onChange={onFile("favicon")} />
            </label>
            <Button variant="ghost" size="sm" onClick={() => { setFaviconUrl(""); onToast("Favicon removed"); }}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5">ICO/PNG · 32×32 or 48×48 · displayed on browser tabs</p>
        </Card>
      </div>

      {/* Brand colors */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground inline-flex items-center gap-1"><Palette className="h-3 w-3" />Brand colors</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setBrandColor(DEFAULT_BRAND_COLOR); setAccentColor(DEFAULT_ACCENT_COLOR); onToast("Brand colors reset to default — click Save to keep"); }}
          >
            <RotateCcw className="h-3.5 w-3.5" />Reset to default
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs">Primary</Label>
            <div className="flex items-center gap-2">
              <input type="color" value={brandColor} onChange={e => setBrandColor(e.target.value)} className="h-10 w-14 rounded-md cursor-pointer border border-border" />
              <Input value={brandColor} onChange={e => setBrandColor(e.target.value)} className="h-10 font-mono tabular uppercase" />
            </div>
            <p className="text-[10px] text-muted-foreground">Headers · buttons · primary actions</p>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Accent</Label>
            <div className="flex items-center gap-2">
              <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)} className="h-10 w-14 rounded-md cursor-pointer border border-border" />
              <Input value={accentColor} onChange={e => setAccentColor(e.target.value)} className="h-10 font-mono tabular uppercase" />
            </div>
            <p className="text-[10px] text-muted-foreground">Highlights · loyalty tier · gold accents</p>
          </div>
        </div>
      </Card>

      {/* Typography */}
      <Card className="p-4">
        <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-3">Typography</p>
        <Label className="text-xs">Font pairing</Label>
        <Select value={fontPair} onChange={e => setFontPair(e.target.value)} className="h-9 mt-1.5">
          <option>PT Serif + Inter</option>
          <option>Playfair Display + Lato</option>
          <option>Cormorant + Source Sans</option>
          <option>Lora + Open Sans</option>
        </Select>
        <p className="text-[10px] text-muted-foreground mt-1">Display font + body font · applied to invoices, emails, public landing</p>
      </Card>

      {/* Letterhead + Email signature */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-2 inline-flex items-center gap-1"><FileText className="h-3 w-3" />Letterhead text</p>
          <textarea value={letterhead} onChange={e => setLetterhead(e.target.value)} rows={4} className="w-full text-sm font-mono px-3 py-2 rounded-md border border-border bg-surface focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 outline-hidden resize-y" />
          <p className="text-[10px] text-muted-foreground mt-1">Appears at the top of printed invoices and receipts</p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-2 inline-flex items-center gap-1"><Mail className="h-3 w-3" />Default email signature</p>
          <textarea value={emailSig} onChange={e => setEmailSig(e.target.value)} rows={4} className="w-full text-sm font-mono px-3 py-2 rounded-md border border-border bg-surface focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 outline-hidden resize-y" />
          <p className="text-[10px] text-muted-foreground mt-1">Appended to all outbound transactional emails</p>
        </Card>
      </div>

      {/* Invoice footer */}
      <Card className="p-4">
        <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-2 inline-flex items-center gap-1"><Receipt className="h-3 w-3" />Invoice footer / T&C</p>
        <textarea value={invoiceFooter} onChange={e => setInvoiceFooter(e.target.value)} rows={2} className="w-full text-sm px-3 py-2 rounded-md border border-border bg-surface focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 outline-hidden resize-y" />
        <p className="text-[10px] text-muted-foreground mt-1">Jurisdiction · terms · disclaimer text printed at the bottom of every invoice</p>
      </Card>

      <div className="flex items-center justify-end pt-3 border-t border-border">
        <Button variant="success" onClick={() => { save(onToast); onMarkComplete(); }}><Save className="h-4 w-4" />Save branding</Button>
      </div>
    </div>
  );
}

// ============================================================
// INTEGRATIONS MANAGER
// ============================================================
type Integration = {
  id: string; name: string; category: "Channel Manager" | "OTA" | "Messaging" | "Payment" | "Accounting" | "POS" | "Email";
  description: string; connected: boolean; status: "live" | "test" | "error" | "off"; lastSync?: string;
};

// Catalog of integrations the app supports. Connection state (connected/status/
// lastSync) is NOT hardcoded — every one defaults to disconnected and the real
// state is loaded from /settings/integrations on mount.
const INTEGRATION_CATALOG: Integration[] = [
  { id: "i1", name: "Booking.com",       category: "OTA",             description: "Inventory + rate sync · 2-way booking push", connected: false, status: "off" },
  { id: "i2", name: "Agoda",             category: "OTA",             description: "Inventory + rate sync · auto-confirmation", connected: false, status: "off" },
  { id: "i3", name: "MakeMyTrip",        category: "OTA",             description: "Inventory + rate sync · India market",      connected: false, status: "off" },
  { id: "i4", name: "Expedia",           category: "OTA",             description: "Inventory + rate sync · international",     connected: false, status: "off" },
  { id: "i5", name: "STAAH",             category: "Channel Manager", description: "Multi-channel inventory + rate distribution", connected: false, status: "off" },
  { id: "i6", name: "WhatsApp Business", category: "Messaging",       description: "Pre-arrival messages · concierge chat · BSP", connected: false, status: "off" },
  { id: "i7", name: "Razorpay",          category: "Payment",         description: "Cards · UPI · Net banking · UPI Autopay",    connected: false, status: "off" },
  { id: "i8", name: "Tally Prime",       category: "Accounting",      description: "Daily journal export · GST reconciliation",  connected: false, status: "off" },
  { id: "i9", name: "Zomato POS",        category: "POS",             description: "F&B order push from in-room dining",         connected: false, status: "off" },
  { id: "i10", name: "SMTP (Amazon SES)",category: "Email",           description: "Transactional email delivery",                connected: false, status: "off" },
];

function IntegrationsManager({ onToast, onMarkComplete }: { onToast: (m: string) => void; onMarkComplete: () => void }) {
  const [integrations, setIntegrations] = React.useState(INTEGRATION_CATALOG);
  const [configFor, setConfigFor] = React.useState<Integration | null>(null);

  // Load saved connection state from Postgres and merge it onto the catalog
  // (so newly-added catalog entries still appear, with their real saved state).
  const save = useSettingsPersistence(
    "integrations",
    { integrations },
    v => {
      if (!v.integrations) return;
      const saved = new Map(v.integrations.map(i => [i.id, i]));
      setIntegrations(prev => prev.map(i => saved.get(i.id) ? { ...i, ...saved.get(i.id)! } : i));
    },
  );

  // Toggling persists immediately so connection state is always real/live.
  const toggle = (id: string) => setIntegrations(prev => {
    const next = prev.map(i => i.id === id
      ? { ...i, connected: !i.connected, status: (!i.connected ? "live" : "off") as Integration["status"] }
      : i);
    apiPut("/settings/integrations", { integrations: next }).catch(() => onToast("⚠ Save failed — backend offline"));
    return next;
  });

  const grouped = integrations.reduce<Record<string, Integration[]>>((acc, i) => {
    (acc[i.category] ??= []).push(i);
    return acc;
  }, {});

  const connectedCount = integrations.filter(i => i.connected).length;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <SummaryStat icon={Plug} label="Total" value={integrations.length} />
        <SummaryStat icon={CheckCircle2} label="Connected" value={connectedCount} accent="success" />
        <SummaryStat icon={RefreshCw} label="Live" value={integrations.filter(i => i.status === "live").length} accent="success" />
        <SummaryStat icon={AlertCircle} label="Errors" value={integrations.filter(i => i.status === "error").length} accent="danger" />
      </div>

      <p className="text-xs text-muted-foreground">External services connected to MYHOTEL. Click any tile to configure credentials or run a manual sync.</p>

      {(["Channel Manager", "OTA", "Messaging", "Payment", "Accounting", "POS", "Email"] as Integration["category"][]).filter(c => grouped[c]).map(cat => (
        <div key={cat}>
          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-2">{cat}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {grouped[cat].map(i => (
              <Card key={i.id} className={cn(
                "p-3 transition-colors",
                i.connected && i.status === "live" && "border-success/30",
                i.connected && i.status === "test" && "border-warning/30",
                i.connected && i.status === "error" && "border-danger/30",
              )}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    <span className={cn(
                      "h-9 w-9 rounded-md inline-flex items-center justify-center text-sm font-bold shrink-0",
                      i.connected ? "bg-brand text-brand-foreground" : "bg-surface-sunken text-muted-foreground"
                    )}>{i.name.charAt(0)}</span>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{i.name}</p>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 leading-snug">{i.description}</p>
                    </div>
                  </div>
                  <Toggle on={i.connected} onChange={() => toggle(i.id)} />
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                  <Badge tone={i.status === "live" ? "success" : i.status === "test" ? "warning" : i.status === "error" ? "danger" : "neutral"}>{i.status}</Badge>
                  <div className="flex items-center gap-1.5">
                    {i.lastSync && <p className="text-[10px] text-muted-foreground tabular">sync {i.lastSync}</p>}
                    <Button variant="ghost" size="sm" onClick={() => setConfigFor(i)}>
                      <Settings className="h-3 w-3" />Configure
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}

      <div className="flex items-center justify-end pt-3 border-t border-border">
        <Button variant="success" onClick={() => { save(onToast); onMarkComplete(); }}><Save className="h-4 w-4" />Save</Button>
      </div>

      {configFor && <IntegrationConfigModal integration={configFor} onClose={() => setConfigFor(null)} onSave={() => {
        const updated = integrations.map(i => i.id === configFor.id ? { ...i, connected: true, status: "live" as Integration["status"] } : i);
        setIntegrations(updated);
        apiPut("/settings/integrations", { integrations: updated })
          .then(() => onToast(`${configFor.name} connected & saved ✓`))
          .catch(() => onToast("⚠ Save failed — backend offline"));
        setConfigFor(null);
      }} onTest={() => onToast(`Test successful · ${configFor.name}`)} onToast={onToast} />}
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return <Switch checked={on} onChange={() => onChange()} />;
}

function IntegrationConfigModal({ integration, onClose, onSave, onTest, onToast }: {
  integration: Integration; onClose: () => void; onSave: () => void; onTest: () => void; onToast: (m: string) => void;
}) {
  const isSmtp = integration.category === "Email";

  const [endpoint, setEndpoint] = React.useState("https://api.example.com/v1");
  const [apiKey, setApiKey] = React.useState("");
  const [secret, setSecret] = React.useState("");
  const [showSecret, setShowSecret] = React.useState(false);
  const [syncFreq, setSyncFreq] = React.useState("Real-time");

  // SMTP-specific state (only used when isSmtp).
  const [smtp, setSmtp] = React.useState({ host: "", port: 587, encryption: "tls", username: "", fromName: "", fromEmail: "", password: "", hasPassword: false });
  const [showSmtpPw, setShowSmtpPw] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!isSmtp) return;
    apiGet<typeof smtp & { enabled?: boolean }>("/settings/smtp")
      .then(v => setSmtp(s => ({ ...s, host: v.host ?? "", port: v.port ?? 587, encryption: v.encryption ?? "tls", username: v.username ?? "", fromName: v.fromName ?? "", fromEmail: v.fromEmail ?? "", password: "", hasPassword: !!v.hasPassword })))
      .catch(() => {});
  }, [isSmtp]);

  // Build the request body; omit password when left blank (keep existing server-side).
  const smtpBody = () => {
    const b: Record<string, unknown> = { host: smtp.host.trim(), port: Number(smtp.port) || 587, encryption: smtp.encryption, username: smtp.username.trim(), fromName: smtp.fromName.trim(), fromEmail: smtp.fromEmail.trim(), enabled: true };
    if (smtp.password) b.password = smtp.password;
    return b;
  };

  const saveSmtp = async () => {
    setBusy(true);
    try {
      await apiPut("/settings/smtp", smtpBody());
      onSave();
    } catch {
      onToast("⚠ Save failed — backend offline");
    } finally {
      setBusy(false);
    }
  };

  const testSmtp = async () => {
    setBusy(true);
    try {
      const r = await apiPost<{ ok: boolean; to?: string; error?: string }>("/settings/smtp/test", smtpBody());
      onToast(r.ok ? `SMTP test ok — sent to ${r.to}` : `SMTP test failed — ${r.error ?? "check settings"}`);
    } catch {
      onToast("⚠ Test failed — backend offline");
    } finally {
      setBusy(false);
    }
  };

  React.useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; document.removeEventListener("keydown", onKey); };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface rounded-xl shadow-2xl w-full max-w-md max-h-[92vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="h-9 w-9 rounded-md bg-brand text-brand-foreground inline-flex items-center justify-center font-bold">{integration.name.charAt(0)}</span>
            <div>
              <h3 className="font-semibold">{integration.name}</h3>
              <p className="text-xs text-muted-foreground">{integration.category} · {integration.description}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="h-7 w-7 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>

        <div className="px-5 py-4 space-y-3 overflow-y-auto">
          {isSmtp ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs">SMTP host</Label>
                  <Input value={smtp.host} onChange={e => setSmtp(s => ({ ...s, host: e.target.value }))} placeholder="email-smtp.ap-south-1.amazonaws.com" className="h-9 font-mono tabular text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Port</Label>
                  <Input type="number" min={1} max={65535} value={smtp.port} onChange={e => setSmtp(s => ({ ...s, port: Number(e.target.value) || 0 }))} className="h-9 tabular" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Encryption</Label>
                  <Select value={smtp.encryption} onChange={e => setSmtp(s => ({ ...s, encryption: e.target.value }))} className="h-9">
                    <option value="tls">TLS</option>
                    <option value="ssl">SSL</option>
                    <option value="none">None</option>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">From name</Label>
                  <Input value={smtp.fromName} onChange={e => setSmtp(s => ({ ...s, fromName: e.target.value }))} placeholder="The Pearl Marina" className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">From email</Label>
                  <Input value={smtp.fromEmail} onChange={e => setSmtp(s => ({ ...s, fromEmail: e.target.value }))} placeholder="hello@thepearl.in" className="h-9 font-mono text-xs" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Username</Label>
                <Input value={smtp.username} onChange={e => setSmtp(s => ({ ...s, username: e.target.value }))} placeholder="SMTP username / SES access key" className="h-9 font-mono text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Password</Label>
                <div className="relative">
                  <Input type={showSmtpPw ? "text" : "password"} value={smtp.password} onChange={e => setSmtp(s => ({ ...s, password: e.target.value }))} placeholder={smtp.hasPassword ? "•••••••• (unchanged)" : "SMTP password / SES secret"} className="h-9 font-mono text-xs pr-9" />
                  <button type="button" onClick={() => setShowSmtpPw(s => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center text-muted-foreground">
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground">Leave blank to keep the saved password.</p>
              </div>
              <div className="rounded-md bg-info-soft/15 border border-info/20 p-2.5 text-[11px] inline-flex items-start gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-info shrink-0 mt-0.5" />
                <span>Stored encrypted at rest. The app sends all outgoing email through this mailbox once saved.</span>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs">API endpoint</Label>
                <Input value={endpoint} onChange={e => setEndpoint(e.target.value)} className="h-9 font-mono tabular text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">API key / Merchant ID</Label>
                <Input value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="pk_live_…" className="h-9 font-mono tabular text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Secret / Webhook signing key</Label>
                <div className="relative">
                  <Input type={showSecret ? "text" : "password"} value={secret} onChange={e => setSecret(e.target.value)} placeholder="••••••••••••••••" className="h-9 font-mono tabular text-xs pr-9" />
                  <button type="button" onClick={() => setShowSecret(s => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center text-muted-foreground">
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Sync frequency</Label>
                <Select value={syncFreq} onChange={e => setSyncFreq(e.target.value)} className="h-9">
                  <option>Real-time (webhook)</option>
                  <option>Every 5 minutes</option>
                  <option>Every 15 minutes</option>
                  <option>Hourly</option>
                  <option>Daily</option>
                </Select>
              </div>
              <div className="rounded-md bg-info-soft/15 border border-info/20 p-2.5 text-[11px] inline-flex items-start gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-info shrink-0 mt-0.5" />
                <span>Credentials are stored encrypted at rest. Webhook signatures are verified before any payload is processed.</span>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-between gap-2 px-5 py-3 border-t border-border bg-surface-sunken/30">
          <Button variant="outline" disabled={busy} onClick={isSmtp ? testSmtp : onTest}><RefreshCw className="h-3.5 w-3.5" />Test connection</Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button disabled={busy} onClick={isSmtp ? saveSmtp : onSave}><Save className="h-3.5 w-3.5" />Save</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// BACKUP & AUDIT TRAIL MANAGER
// ============================================================
type AuditLogEntry = { id: string; at: string; actor: string; section: string; action: string; detail: string };

const SEED_BACKUPS = [
  { id: "b1", at: "Today 00:14",   size: "248 MB", duration: "47s", destination: "S3 + Local",  status: "ok"   as const },
  { id: "b2", at: "Yesterday 00:12", size: "245 MB", duration: "44s", destination: "S3 + Local",  status: "ok"   as const },
  { id: "b3", at: "22 May 00:09",  size: "241 MB", duration: "1m 02s", destination: "S3 only",   status: "warn" as const },
  { id: "b4", at: "21 May 00:15",  size: "238 MB", duration: "52s", destination: "S3 + Local",  status: "ok"   as const },
];

const SEED_AUDIT_LOG: AuditLogEntry[] = [
  { id: "a1", at: "Today 14:18", actor: "Khalid R.", section: "Tax & Payment", action: "Added payment method", detail: "Razorpay UPI (Razorpay-2)" },
  { id: "a2", at: "Today 11:42", actor: "Tom W.",    section: "Rooms",         action: "Bulk created 10 rooms", detail: "Floor 4, rooms 401–410, Deluxe category" },
  { id: "a3", at: "Yesterday 16:30", actor: "Anjali S.", section: "Roles",      action: "Updated permissions",  detail: "F&B Captain · added Accounts.View" },
  { id: "a4", at: "Yesterday 09:14", actor: "Khalid R.", section: "Branding",   action: "Updated logo",         detail: "Replaced with version 2.4 SVG" },
  { id: "a5", at: "23 May 18:48", actor: "System",   section: "Backup",        action: "Daily backup ran",     detail: "248 MB to S3 + Local · success" },
  { id: "a6", at: "23 May 11:20", actor: "Tom W.",   section: "Rate Plans",    action: "Added rate plan",      detail: "Weekend Premium · +20% multiplier" },
];

function BackupManager({ onToast, onMarkComplete }: { onToast: (m: string) => void; onMarkComplete: () => void }) {
  const [autoBackup, setAutoBackup] = React.useState(true);
  const [backupTime, setBackupTime] = React.useState("00:10");
  const [retainDays, setRetainDays] = React.useState(30);
  const [s3Enabled, setS3Enabled] = React.useState(true);
  const [localEnabled, setLocalEnabled] = React.useState(true);
  const [encryption, setEncryption] = React.useState(true);

  const save = useSettingsPersistence(
    "backup",
    { autoBackup, backupTime, retainDays, s3Enabled, localEnabled, encryption },
    v => {
      if (v.autoBackup !== undefined) setAutoBackup(v.autoBackup);
      if (v.backupTime !== undefined) setBackupTime(v.backupTime);
      if (v.retainDays !== undefined) setRetainDays(v.retainDays);
      if (v.s3Enabled !== undefined) setS3Enabled(v.s3Enabled);
      if (v.localEnabled !== undefined) setLocalEnabled(v.localEnabled);
      if (v.encryption !== undefined) setEncryption(v.encryption);
    },
  );

  // Real backups from the API (pg_dump files).
  type BackupFile = { name: string; size: number; created_at: string };
  const [backups, setBackups] = React.useState<BackupFile[]>([]);
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => { apiGet<BackupFile[]>("/backups").then(setBackups).catch(() => {}); }, []);
  const fmtSize = (b: number) => (b >= 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`);
  const fmtWhen = (iso: string) => { const d = new Date(iso); return isNaN(d.getTime()) ? iso : d.toLocaleString(); };
  const lastBackup = backups[0];

  const runBackup = async () => {
    setBusy(true); onToast("Running backup…");
    try { const meta = await apiPost<BackupFile>("/backups", {}); setBackups(b => [meta, ...b]); onToast("Backup created ✓"); }
    catch { onToast("⚠ Backup failed — is the backend running?"); }
    finally { setBusy(false); }
  };
  const downloadBackup = async (name: string) => {
    try { await apiDownload(`/backups/${name}/download`, name); }
    catch { onToast("⚠ Download failed"); }
  };
  const restoreBackup = async (name: string) => {
    if (!window.confirm(`Restore the database from ${name}?\n\nThis OVERWRITES all current data.`)) return;
    setBusy(true); onToast("Restoring database…");
    try { await apiPost(`/backups/${name}/restore`, {}); onToast("Database restored ✓ — reload to see changes"); }
    catch { onToast("⚠ Restore failed"); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-5">
      {/* Last backup hero */}
      <Card className={cn("p-4 border-l-4", lastBackup ? "border-l-success bg-success-soft/10" : "border-l-warning bg-warning-soft/10")}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <span className={cn("h-10 w-10 rounded-md inline-flex items-center justify-center", lastBackup ? "bg-success-soft text-success" : "bg-warning-soft text-warning")}>
              {lastBackup ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
            </span>
            <div>
              <p className="font-semibold">{lastBackup ? `Last backup · ${fmtWhen(lastBackup.created_at)}` : "No backups yet"}</p>
              <p className="text-xs text-muted-foreground">{lastBackup ? `${fmtSize(lastBackup.size)} · pg_dump · local` : "Run a backup to create your first snapshot"}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {lastBackup && (
              <Button variant="outline" size="sm" disabled={busy} onClick={() => downloadBackup(lastBackup.name)}>
                <Cloud className="h-3.5 w-3.5" />Download
              </Button>
            )}
            <Button size="sm" disabled={busy} onClick={runBackup}>
              <RefreshCw className={cn("h-3.5 w-3.5", busy && "animate-spin")} />{busy ? "Running…" : "Run now"}
            </Button>
          </div>
        </div>
      </Card>

      {/* Backups list (real files) */}
      {backups.length > 0 && (
        <Card className="p-0 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border bg-surface-sunken/30 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Saved backups ({backups.length})
          </div>
          <div className="divide-y divide-border max-h-64 overflow-y-auto">
            {backups.map(bk => (
              <div key={bk.name} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-mono truncate">{bk.name}</p>
                  <p className="text-[11px] text-muted-foreground">{fmtSize(bk.size)} · {fmtWhen(bk.created_at)}</p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Button variant="ghost" size="sm" disabled={busy} onClick={() => downloadBackup(bk.name)}><Cloud className="h-3.5 w-3.5" />Download</Button>
                  <Button variant="outline" size="sm" disabled={busy} onClick={() => restoreBackup(bk.name)}><RefreshCw className="h-3.5 w-3.5" />Restore</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Backup config */}
      <Card className="p-4 space-y-4">
        <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Backup configuration</p>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Automatic nightly backup</p>
            <p className="text-[11px] text-muted-foreground">Runs after night audit completes</p>
          </div>
          <Toggle on={autoBackup} onChange={() => setAutoBackup(b => !b)} />
        </div>

        {autoBackup && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-4 border-l-2 border-brand/30">
            <div className="space-y-1.5">
              <Label className="text-xs">Run at (24h)</Label>
              <Input type="time" value={backupTime} onChange={e => setBackupTime(e.target.value)} className="h-9 tabular" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Retention (days)</Label>
              <Input type="number" min={7} max={365} value={retainDays} onChange={e => setRetainDays(Math.max(7, Number(e.target.value) || 0))} className="h-9 tabular" />
            </div>
          </div>
        )}

        <hr className="border-border" />

        <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Destinations</p>
        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div className="flex items-center gap-2">
              <Cloud className="h-4 w-4 text-info" />
              <div>
                <p className="text-sm font-medium">Cloud · Amazon S3</p>
                <p className="text-[11px] text-muted-foreground">s3://myhotel-backups/pearl-marina/ · ap-south-1</p>
              </div>
            </div>
            <Toggle on={s3Enabled} onChange={() => setS3Enabled(b => !b)} />
          </div>
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-brand" />
              <div>
                <p className="text-sm font-medium">Local NAS</p>
                <p className="text-[11px] text-muted-foreground">/Volumes/PearlNAS/backups/</p>
              </div>
            </div>
            <Toggle on={localEnabled} onChange={() => setLocalEnabled(b => !b)} />
          </div>
        </div>

        <hr className="border-border" />

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium inline-flex items-center gap-1.5"><Lock className="h-4 w-4 text-success" />AES-256 encryption</p>
            <p className="text-[11px] text-muted-foreground">Backups encrypted at rest using KMS-managed key</p>
          </div>
          <Toggle on={encryption} onChange={() => setEncryption(b => !b)} />
        </div>
      </Card>

      {/* Backup history */}
      <Card className="p-0 overflow-hidden">
        <div className="px-5 py-3 bg-surface-elevated border-b border-border flex items-center justify-between">
          <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Recent backups</p>
          <Badge tone="neutral">{SEED_BACKUPS.length} runs</Badge>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-surface-sunken/30 border-b border-border">
            <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-2.5 font-semibold">When</th>
              <th className="px-4 py-2.5 font-semibold">Size</th>
              <th className="px-4 py-2.5 font-semibold">Duration</th>
              <th className="px-4 py-2.5 font-semibold">Destinations</th>
              <th className="px-4 py-2.5 font-semibold">Status</th>
              <th className="px-4 py-2.5 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {SEED_BACKUPS.map(b => (
              <tr key={b.id} className="hover:bg-surface-sunken/30">
                <td className="px-4 py-2.5 font-medium tabular">{b.at}</td>
                <td className="px-4 py-2.5 tabular">{b.size}</td>
                <td className="px-4 py-2.5 tabular text-muted-foreground">{b.duration}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{b.destination}</td>
                <td className="px-4 py-2.5"><Badge tone={b.status === "ok" ? "success" : "warning"}>{b.status === "ok" ? "complete" : "partial"}</Badge></td>
                <td className="px-4 py-2.5 text-right">
                  <Button size="sm" variant="ghost" onClick={() => onToast(`Restoring ${b.at} backup · this will replace current state`)}>Restore</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Audit trail */}
      <Card className="p-0 overflow-hidden">
        <div className="px-5 py-3 bg-surface-elevated border-b border-border flex items-center justify-between">
          <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground inline-flex items-center gap-1.5"><ShieldCheck className="h-3 w-3" />Setup audit trail</p>
          <Badge tone="neutral">{SEED_AUDIT_LOG.length} entries</Badge>
        </div>
        <ol className="divide-y divide-border">
          {SEED_AUDIT_LOG.map(e => (
            <li key={e.id} className="px-5 py-3 flex items-start gap-3">
              <span className="h-7 w-7 rounded-md bg-brand-soft text-brand-soft-foreground inline-flex items-center justify-center text-[10px] font-bold shrink-0">{e.actor.charAt(0)}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm">
                    <span className="font-medium">{e.actor}</span>{" "}
                    <span className="text-muted-foreground">{e.action.toLowerCase()} in</span>{" "}
                    <Badge tone="neutral">{e.section}</Badge>
                  </p>
                  <p className="text-[10px] text-muted-foreground tabular shrink-0">{e.at}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{e.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </Card>

      <div className="flex items-center justify-end pt-3 border-t border-border">
        <Button variant="success" onClick={() => { save(onToast); onMarkComplete(); }}><Save className="h-4 w-4" />Save</Button>
      </div>
    </div>
  );
}
