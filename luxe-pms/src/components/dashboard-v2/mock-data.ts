import {
  Wallet, LogOut, Sparkles, Wrench, DoorOpen, BedDouble, PlaneLanding, PlaneTakeoff,
  CalendarPlus, LogIn, LayoutGrid, CalendarRange, Banknote, FileBarChart, Bell,
  CheckCircle2, Percent, TrendingUp,
} from "lucide-react";
import type { DashboardV2Data } from "./types";

export const MOCK_DASHBOARD_V2_DATA: DashboardV2Data = {
  hotelName: "The Pearl Palace",
  hotelTagline: "Luxury Hotel & Resort",
  notificationCount: 3,
  currentUser: { name: "Khalid R.", role: "Reception", shift: "Shift #4218" },
  occupancy: { pct: 8, occupiedRooms: 1, totalRooms: 12, trendPct: 12 },
  kpis: [
    { id: "available", label: "Available Rooms", value: 9, badge: "75%", caption: "ready to sell", icon: DoorOpen, tone: "blue" },
    { id: "occupied", label: "Occupied Rooms", value: 1, badge: "8%", caption: "in-house now", icon: BedDouble, tone: "green" },
    { id: "arrivals", label: "Arrivals", value: 0, caption: "today expected", icon: PlaneLanding, tone: "gold" },
    { id: "departures", label: "Departures", value: 1, caption: "today checking out", icon: PlaneTakeoff, tone: "purple" },
    { id: "ooo", label: "Out of Order", value: 1, caption: "rooms under maintenance", icon: Wrench, tone: "pink" },
  ],
  quickActions: [
    { id: "new-booking", label: "New Booking", href: "/bookings/new", icon: CalendarPlus, tone: "purple" },
    { id: "checkin", label: "Check-in", href: "/checkin", icon: LogIn, tone: "blue" },
    { id: "checkout", label: "Checkout", href: "/checkout", icon: LogOut, tone: "green" },
    { id: "rack", label: "Room Rack", href: "/rack", icon: LayoutGrid, tone: "purple" },
    { id: "calendar", label: "Calendar", href: "/calendar", icon: CalendarRange, tone: "gold" },
    { id: "housekeeping", label: "Housekeeping", href: "/housekeeping", icon: Sparkles, tone: "green", badge: 2 },
    { id: "cashier", label: "Cashier", href: "/cashier", icon: Banknote, tone: "blue" },
    { id: "reports", label: "Reports", href: "/reports", icon: FileBarChart, tone: "pink" },
  ],
  priorities: [
    { id: "balance", icon: Wallet, tone: "pink", title: "Outstanding balance", hint: "₹8,96,025 to collect across folios" },
    { id: "checkouts", icon: LogOut, tone: "blue", title: "Checkouts due today", hint: "Settle the folio before checkout", count: 1 },
    { id: "clean", icon: Sparkles, tone: "gold", title: "Rooms to clean", hint: "Housekeeping sign-off pending", count: 1 },
    { id: "ooo", icon: Wrench, tone: "purple", title: "Rooms out of order", hint: "Maintenance in progress", count: 1 },
  ],
  floors: [
    { floor: "F6", rooms: [{ number: "601", status: "available" }] },
    { floor: "F5", rooms: [{ number: "501", status: "available" }] },
    { floor: "F4", rooms: [{ number: "401", status: "available" }, { number: "402", status: "blocked" }] },
    { floor: "F3", rooms: [{ number: "301", status: "available" }, { number: "302", status: "available" }] },
    { floor: "F2", rooms: [{ number: "201", status: "available" }, { number: "202", status: "available" }] },
    { floor: "F1", rooms: [{ number: "101", status: "occupied" }, { number: "102", status: "available" }, { number: "103", status: "available" }, { number: "104", status: "out-of-order" }] },
  ],
  roomLegend: [
    { status: "available", label: "Available" },
    { status: "occupied", label: "Occupied" },
    { status: "reserved", label: "Reserved" },
    { status: "out-of-order", label: "Out of Order" },
    { status: "blocked", label: "Blocked" },
  ],
  aiBriefing: [
    { icon: Percent, tone: "blue", text: "8% occupancy today — 1 of 12 rooms sold." },
    { icon: Wallet, tone: "gold", text: "₹8,96,025 outstanding across in-house folios." },
    { icon: Sparkles, tone: "blue", text: "1 room awaiting housekeeping." },
    { icon: TrendingUp, tone: "blue", text: "Top source Website — ₹6,08,500 from 32 bookings." },
  ],
  arrivals: {
    summary: "0 rooms · ₹0 to collect · 1 hall",
    rows: [
      { id: "hall-1", guestName: "Banquet A — Wedding", tag: "Hall", meta: "Francis · 18:00–23:00 · Non-Veg Premium", actionLabel: "Open" },
    ],
  },
  departures: {
    summary: "1 room checking out",
    rows: [
      { id: "dep-1", guestName: "Test E2E Guest", meta: "Room 201", status: "settled", actionLabel: "Checkout" },
    ],
  },
  activity: [
    { id: "a1", icon: Bell, tone: "blue", title: "Updated · #12", actor: "Hotel Admin", time: "4h ago" },
    { id: "a2", icon: CheckCircle2, tone: "green", title: "Created · OF-00102", actor: "Hotel Admin", time: "4h ago" },
    { id: "a3", icon: Bell, tone: "blue", title: "Updated · OF-00102", actor: "Hotel Admin", time: "4h ago" },
    { id: "a4", icon: Bell, tone: "blue", title: "Updated · #12", actor: "Hotel Admin", time: "4h ago" },
  ],
};
