import {
  LayoutDashboard, LayoutGrid, CalendarRange, BookOpen, LogIn, LogOut,
  Users, Receipt, Building2, UtensilsCrossed, Sparkles, Wrench,
  Briefcase, Wallet, ClipboardCheck, Boxes, Truck, UserCog,
  Globe, MonitorSmartphone, Bell, Moon, FileBarChart, Bot,
  ShieldCheck, ScrollText, KeySquare, UsersRound, MessageSquare,
  Award, Crown, Brain,
  QrCode, Smartphone, Zap, DatabaseBackup, TrendingUp, Activity,
  Lock, Calculator, Utensils, Tv, ChefHat, Armchair, Wine, Search,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";

import type { Role } from "./auth";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
  group: "operations" | "billing" | "people" | "erp" | "system" | "demo";
  // Roles allowed to see/visit this item. Omit for operational items that
  // both staff and manager get. See `rolesFor` in ./auth.
  roles?: Role[];
};

const MANAGER: Role[] = ["manager"];
const GUEST: Role[] = ["guest", "manager"]; // manager can preview guest pages

export const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, group: "operations" },
  { href: "/owner", label: "Owner's Flash", icon: Crown, group: "operations", roles: MANAGER },
  { href: "/rack", label: "Room Rack", icon: LayoutGrid, group: "operations" },
  { href: "/calendar", label: "Reservation Calendar", icon: CalendarRange, group: "operations" },
  { href: "/bookings", label: "Bookings", icon: BookOpen, group: "operations" },
  { href: "/groups", label: "Group Bookings", icon: UsersRound, group: "operations", badge: "4" },
  { href: "/checkin", label: "Check-in", icon: LogIn, group: "operations", badge: "7" },
  { href: "/checkout", label: "Checkout", icon: LogOut, group: "operations", badge: "5" },

  { href: "/enquiries", label: "Enquiries & Leads", icon: MessageSquare, group: "people", badge: "3" },
  { href: "/guests", label: "Guests", icon: Users, group: "people" },
  { href: "/loyalty", label: "Loyalty Program", icon: Award, group: "people" },
  { href: "/folio", label: "Guest Folio", icon: Receipt, group: "billing" },
  { href: "/halls", label: "Hall Booking", icon: Building2, group: "operations" },
  { href: "/food", label: "Food & Room Service", icon: UtensilsCrossed, group: "operations" },
  { href: "/housekeeping", label: "Housekeeping", icon: Sparkles, group: "operations" },
  { href: "/hk-report", label: "HK Productivity", icon: ClipboardCheck, group: "operations" },
  { href: "/maintenance", label: "Maintenance", icon: Wrench, group: "operations" },
  { href: "/lost-found", label: "Lost & Found", icon: Search, group: "operations" },

  { href: "/agents", label: "Agents & Corporate", icon: Briefcase, group: "people", roles: MANAGER },
  { href: "/accounts", label: "Accounts", icon: Wallet, group: "billing", roles: MANAGER },
  { href: "/pricing", label: "AI Pricing Engine", icon: Brain, group: "billing", roles: MANAGER },
  { href: "/cashier", label: "Cashier Shift", icon: ClipboardCheck, group: "billing" },

  { href: "/inventory", label: "Inventory", icon: Boxes, group: "erp" },
  { href: "/vendors", label: "Vendors", icon: Truck, group: "erp" },
  { href: "/staff", label: "Staff", icon: UserCog, group: "people", roles: MANAGER },

  { href: "/channels", label: "OTA / Channel Manager", icon: Globe, group: "erp", roles: MANAGER },
  { href: "/website", label: "Website Booking", icon: MonitorSmartphone, group: "erp", roles: MANAGER },
  { href: "/notifications", label: "Notifications", icon: Bell, group: "system" },
  { href: "/night-audit", label: "Night Audit", icon: Moon, group: "system", roles: MANAGER },
  { href: "/reports", label: "Reports", icon: FileBarChart, group: "system", roles: MANAGER },
  { href: "/ai", label: "AI Assistant", icon: Bot, group: "system", roles: MANAGER },

  { href: "/setup", label: "Setup & Settings", icon: SlidersHorizontal, group: "system", roles: MANAGER },
  { href: "/users", label: "User Management", icon: KeySquare, group: "system", roles: MANAGER },
  { href: "/audit-logs", label: "Audit Logs", icon: ScrollText, group: "system", roles: MANAGER },
  { href: "/compliance", label: "Compliance (India)", icon: ShieldCheck, group: "system", roles: MANAGER },
  { href: "/checkin/kiosk/BK100278", label: "Kiosk Check-in (demo)", icon: QrCode, group: "demo", roles: GUEST },
  { href: "/portal/g123", label: "Guest Portal (demo)", icon: Smartphone, group: "demo", roles: GUEST },
  { href: "/menu/412", label: "In-room Menu (demo)", icon: QrCode, group: "demo", roles: GUEST },
  { href: "/checkout/express", label: "Express Checkout", icon: Zap, group: "billing" },
  { href: "/notifications/templates", label: "WhatsApp Templates", icon: MessageSquare, group: "system", roles: MANAGER },
  { href: "/setup/backup-drill", label: "Backup Drill", icon: DatabaseBackup, group: "system", roles: MANAGER },
  { href: "/revenue/pace", label: "Pace Report", icon: TrendingUp, group: "billing", roles: MANAGER },
  { href: "/revenue/pickup", label: "Pickup Report", icon: Activity, group: "billing", roles: MANAGER },
  { href: "/revenue/restrictions", label: "Stay Restrictions", icon: Lock, group: "billing", roles: MANAGER },
  { href: "/revenue/group-quote", label: "Group Pricing", icon: Calculator, group: "billing", roles: MANAGER },
  { href: "/revenue/comp-shop", label: "Competitor Rate Shop", icon: Search, group: "billing", roles: MANAGER },
  { href: "/fb/pos", label: "Restaurant POS", icon: Utensils, group: "operations" },
  { href: "/fb/kds", label: "Kitchen Display", icon: Tv, group: "operations" },
  { href: "/fb/recipes", label: "Recipes & Cost", icon: ChefHat, group: "erp" },
  { href: "/fb/beo", label: "Banquet Orders", icon: CalendarRange, group: "operations" },
  { href: "/fb/tables", label: "Table Reservations", icon: Armchair, group: "operations" },
  { href: "/fb/bar", label: "Bar Inventory", icon: Wine, group: "erp" },
];

export const GROUP_LABEL: Record<NavItem["group"], string> = {
  operations: "Operations",
  billing: "Billing & Finance",
  people: "People & CRM",
  erp: "ERP & Channels",
  system: "System",
  demo: "Demos",
};
