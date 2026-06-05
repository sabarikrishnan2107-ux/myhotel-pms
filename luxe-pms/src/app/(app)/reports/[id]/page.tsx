"use client";
import * as React from "react";
import Link from "next/link";
import { use } from "react";
import {
  ChevronLeft, FileDown, Printer, Calendar, Filter, Search, Star,
  FileBarChart, Sparkles, Mail, ArrowUp, ArrowDown,
} from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { KPICard } from "@/components/ui/kpi-card";
import { REPORT_CATEGORIES } from "@/lib/mock-data-ext";
import { RESERVATIONS, ROOMS, GUESTS } from "@/lib/mock-data";
import type { Reservation, Room, Guest } from "@/lib/types";
import { money, formatDate, cn } from "@/lib/utils";
import { apiGet } from "@/lib/api";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Legend } from "recharts";

interface Column { key: string; label: string; align?: "left" | "right"; render?: (v: unknown) => React.ReactNode; }
interface ReportShape {
  kpis: { label: string; value: string }[];
  columns: Column[];
  rows: Record<string, unknown>[];
  chart?: "occupancy" | "revenue" | "none";
}

// Find the report definition + category by ID
function findReport(id: string) {
  for (const cat of REPORT_CATEGORIES) {
    const r = cat.reports.find(r => r.id === id);
    if (r) return { ...r, category: cat.name };
  }
  return null;
}

// Build report data from live reservations / rooms / guests.
function buildReportData(name: string, ctx: { reservations: Reservation[]; rooms: Room[]; guests: Guest[] }): ReportShape {
  const RESERVATIONS = ctx.reservations;
  const ROOMS = ctx.rooms;
  const GUESTS = ctx.guests;
  // Operations reports
  if (name.includes("Reservation")) {
    return {
      kpis: [
        { label: "Total Reservations", value: `${RESERVATIONS.length}` },
        { label: "Confirmed", value: `${RESERVATIONS.filter(r => r.paymentStatus !== "unpaid").length}` },
        { label: "Total Revenue", value: money(RESERVATIONS.reduce((s, r) => s + r.total, 0)) },
        { label: "Avg Nights", value: (RESERVATIONS.reduce((s, r) => s + r.nights, 0) / RESERVATIONS.length).toFixed(1) },
      ],
      columns: [
        { key: "bookingNo", label: "Booking #" },
        { key: "guestName", label: "Guest" },
        { key: "roomNumber", label: "Room" },
        { key: "source", label: "Source" },
        { key: "checkIn", label: "Check-in" },
        { key: "checkOut", label: "Check-out" },
        { key: "nights", label: "Nights", align: "right" },
        { key: "total", label: "Total", align: "right", render: (v) => money(v as number) },
      ],
      rows: RESERVATIONS.map(r => ({ ...r, checkIn: formatDate(r.checkIn), checkOut: formatDate(r.checkOut) })),
    };
  }
  if (name.includes("Occupancy")) {
    return {
      kpis: [
        { label: "Today Occupancy", value: "82%" },
        { label: "MTD Average", value: "76%" },
        { label: "YTD Average", value: "71%" },
        { label: "Peak Day", value: "94% (Mar 21)" },
      ],
      columns: [
        { key: "date", label: "Date" },
        { key: "available", label: "Available", align: "right" },
        { key: "occupied", label: "Occupied", align: "right" },
        { key: "outOfOrder", label: "Out of Order", align: "right" },
        { key: "occupancy", label: "Occupancy", align: "right" },
        { key: "adr", label: "ADR", align: "right", render: v => money(v as number) },
        { key: "revpar", label: "RevPAR", align: "right", render: v => money(v as number) },
      ],
      rows: Array.from({ length: 14 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - i);
        const occ = 55 + Math.round(Math.sin(i / 3) * 15) + (i % 7 < 2 ? 12 : 0);
        return { date: formatDate(d), available: 68, occupied: Math.round(68 * occ / 100), outOfOrder: 1, occupancy: `${occ}%`, adr: 742, revpar: Math.round(742 * occ / 100) };
      }),
      chart: "occupancy",
    };
  }
  if (name.includes("Arrival") || name.includes("Departure")) {
    return {
      kpis: [
        { label: "Arrivals Today", value: "7" },
        { label: "Departures Today", value: "5" },
        { label: "VIP Arrivals", value: "2" },
        { label: "Walk-ins", value: "3" },
      ],
      columns: [
        { key: "bookingNo", label: "Booking #" },
        { key: "guestName", label: "Guest" },
        { key: "roomNumber", label: "Room" },
        { key: "checkIn", label: "Arrival" },
        { key: "checkOut", label: "Departure" },
        { key: "source", label: "Source" },
        { key: "paymentStatus", label: "Payment" },
      ],
      rows: RESERVATIONS.slice(0, 12).map(r => ({ ...r, checkIn: formatDate(r.checkIn), checkOut: formatDate(r.checkOut) })),
    };
  }
  if (name.includes("In-house")) {
    return {
      kpis: [
        { label: "In-house Guests", value: `${ROOMS.filter(r => r.status === "occupied").length}` },
        { label: "VIP Guests", value: `${ROOMS.filter(r => r.status === "occupied" && r.vip).length}` },
        { label: "Avg Stay (days)", value: "3.4" },
        { label: "Total Pax", value: "47" },
      ],
      columns: [
        { key: "number", label: "Room" },
        { key: "type", label: "Type" },
        { key: "guestName", label: "Guest" },
        { key: "source", label: "Source" },
        { key: "checkIn", label: "Checked in" },
        { key: "checkOut", label: "Departure" },
      ],
      rows: ROOMS.filter(r => r.status === "occupied" && r.guestName).map(r => ({ ...r, checkIn: r.checkIn ? formatDate(r.checkIn) : "—", checkOut: r.checkOut ? formatDate(r.checkOut) : "—" })),
    };
  }
  if (name.includes("Cancellation")) {
    return {
      kpis: [
        { label: "Cancellations (MTD)", value: "14" },
        { label: "Cancellation Rate", value: "3.2%" },
        { label: "Lost Revenue", value: money(28400) },
        { label: "Refunded", value: money(18200) },
      ],
      columns: [
        { key: "bookingNo", label: "Booking #" },
        { key: "guest", label: "Guest" },
        { key: "source", label: "Source" },
        { key: "cancelDate", label: "Cancelled on" },
        { key: "reason", label: "Reason" },
        { key: "amount", label: "Refund", align: "right", render: v => money(v as number) },
      ],
      rows: [
        { bookingNo: "BK100123", guest: "Olivia Bennett", source: "Booking.com", cancelDate: "23 May", reason: "Plans changed", amount: 1820 },
        { bookingNo: "BK100098", guest: "Marcus Webb", source: "Direct", cancelDate: "22 May", reason: "Health emergency", amount: 0 },
        { bookingNo: "BK100087", guest: "Yuki Tanaka", source: "Agoda", cancelDate: "20 May", reason: "Found cheaper", amount: 2100 },
        { bookingNo: "BK100076", guest: "ABC Travels", source: "Agent", cancelDate: "18 May", reason: "Group reduced", amount: 4500 },
      ],
    };
  }
  if (name.includes("No-show")) {
    return {
      kpis: [
        { label: "No-shows (MTD)", value: "6" },
        { label: "No-show Rate", value: "1.4%" },
        { label: "Charged", value: money(8400) },
        { label: "Waived", value: money(1800) },
      ],
      columns: [
        { key: "bookingNo", label: "Booking #" },
        { key: "guest", label: "Guest" },
        { key: "date", label: "Expected" },
        { key: "source", label: "Source" },
        { key: "charge", label: "Charge", align: "right", render: v => money(v as number) },
        { key: "status", label: "Status" },
      ],
      rows: [
        { bookingNo: "BK100132", guest: "Liu Wei", date: "22 May", source: "OTA: Agoda", charge: 1800, status: "Charged" },
        { bookingNo: "BK100119", guest: "Sarah Whitfield", date: "20 May", source: "Direct", charge: 1500, status: "Charged" },
        { bookingNo: "BK100105", guest: "James Carter", date: "18 May", source: "Phone", charge: 0, status: "Waived (Mgr)" },
      ],
    };
  }
  // Finance reports
  if (name.includes("Daily Collection")) {
    return {
      kpis: [
        { label: "Today Total", value: money(16620) },
        { label: "Cash", value: money(4250) },
        { label: "Card", value: money(8420) },
        { label: "UPI / Online", value: money(3950) },
      ],
      columns: [
        { key: "time", label: "Time" },
        { key: "guest", label: "Guest" },
        { key: "type", label: "Type" },
        { key: "mode", label: "Mode" },
        { key: "amount", label: "Amount", align: "right", render: v => money(v as number) },
      ],
      rows: [
        { time: "14:30", guest: "Yuki Tanaka", type: "Folio", mode: "Card", amount: 2335 },
        { time: "13:42", guest: "Sarah Whitfield", type: "Advance", mode: "Bank", amount: 1500 },
        { time: "13:12", guest: "James Carter", type: "F&B", mode: "Cash", amount: 230 },
        { time: "12:18", guest: "Aisha Hassan", type: "Folio", mode: "UPI", amount: 1980 },
        { time: "11:45", guest: "ABC Travels", type: "Group Advance", mode: "Bank", amount: 8000 },
        { time: "10:30", guest: "Carlos Mendoza", type: "Spa", mode: "Card", amount: 577 },
      ],
    };
  }
  if (name.includes("Tax") || name.includes("VAT")) {
    return {
      kpis: [
        { label: "VAT Collected (MTD)", value: money(6726) },
        { label: "Tourism Dirham", value: money(2040) },
        { label: "Service Charge", value: money(2134) },
        { label: "Total Tax", value: money(10900) },
      ],
      columns: [
        { key: "category", label: "Category" },
        { key: "taxable", label: "Taxable", align: "right", render: v => money(v as number) },
        { key: "rate", label: "Rate" },
        { key: "tax", label: "Tax", align: "right", render: v => money(v as number) },
      ],
      rows: [
        { category: "Room Revenue", taxable: 84520, rate: "5%", tax: 4226 },
        { category: "F&B Revenue", taxable: 21340, rate: "5%", tax: 1067 },
        { category: "Hall Revenue", taxable: 18200, rate: "5%", tax: 910 },
        { category: "F&B Service Charge", taxable: 21340, rate: "10%", tax: 2134 },
        { category: "Tourism Dirham (per night)", taxable: 136, rate: "AED 15", tax: 2040 },
      ],
    };
  }
  if (name.includes("Profit") || name.includes("P&L")) {
    return {
      kpis: [
        { label: "Revenue (MTD)", value: money(130110) },
        { label: "Expenses (MTD)", value: money(76300) },
        { label: "Net Profit", value: money(53810) },
        { label: "Margin", value: "41.4%" },
      ],
      columns: [
        { key: "line", label: "Line item" },
        { key: "category", label: "Type" },
        { key: "amount", label: "Amount", align: "right", render: v => money(v as number) },
      ],
      rows: [
        { line: "Room Revenue", category: "Income", amount: 84520 },
        { line: "F&B Revenue", category: "Income", amount: 21340 },
        { line: "Hall Revenue", category: "Income", amount: 18200 },
        { line: "Other Income", category: "Income", amount: 6050 },
        { line: "Payroll", category: "Expense", amount: -38500 },
        { line: "Utilities", category: "Expense", amount: -12400 },
        { line: "F&B Cost", category: "Expense", amount: -9200 },
        { line: "Maintenance", category: "Expense", amount: -5800 },
        { line: "OTA Commissions", category: "Expense", amount: -7100 },
        { line: "Other", category: "Expense", amount: -3300 },
      ],
      chart: "revenue",
    };
  }
  if (name.includes("Pending")) {
    return {
      kpis: [
        { label: "Total Outstanding", value: money(82380) },
        { label: "Guest Direct", value: money(12480) },
        { label: "Agent", value: money(28950) },
        { label: "Corporate", value: money(40950) },
      ],
      columns: [
        { key: "name", label: "Account" },
        { key: "type", label: "Type" },
        { key: "amount", label: "Outstanding", align: "right", render: v => money(v as number) },
        { key: "age", label: "Aging" },
      ],
      rows: [
        { name: "TechCorp FZ-LLC", type: "Corporate", amount: 28700, age: "30+ days" },
        { name: "ABC Travels", type: "Agent", amount: 18450, age: "15-30 days" },
        { name: "Emirates Bank", type: "Corporate", amount: 12500, age: "30+ days" },
        { name: "Skyline Tours", type: "Agent", amount: 6250, age: "0-15 days" },
        { name: "Yuki Tanaka", type: "Guest", amount: 2335, age: "0-15 days" },
      ],
    };
  }
  if (name.includes("Cashier")) {
    return {
      kpis: [
        { label: "Shifts (MTD)", value: "62" },
        { label: "Avg Variance", value: money(28) },
        { label: "Variances > AED 100", value: "3" },
        { label: "Pending Approval", value: "1" },
      ],
      columns: [
        { key: "shift", label: "Shift #" },
        { key: "cashier", label: "Cashier" },
        { key: "date", label: "Date" },
        { key: "expected", label: "Expected", align: "right", render: v => money(v as number) },
        { key: "actual", label: "Counted", align: "right", render: v => money(v as number) },
        { key: "variance", label: "Variance", align: "right", render: v => money(v as number) },
        { key: "status", label: "Status" },
      ],
      rows: [
        { shift: 4218, cashier: "Khalid R.", date: "24 May", expected: 5620, actual: 5670, variance: 50, status: "Within tolerance" },
        { shift: 4217, cashier: "Tom W.", date: "23 May (night)", expected: 8240, actual: 8240, variance: 0, status: "Perfect" },
        { shift: 4216, cashier: "Khalid R.", date: "23 May", expected: 4920, actual: 4920, variance: 0, status: "Perfect" },
        { shift: 4215, cashier: "Fatima A.", date: "22 May (night)", expected: 7100, actual: 6975, variance: -125, status: "Pending Approval" },
      ],
    };
  }
  if (name.includes("Refund")) {
    return {
      kpis: [
        { label: "Refunds (MTD)", value: "18" },
        { label: "Total Refunded", value: money(24800) },
        { label: "Avg per Refund", value: money(1378) },
        { label: "Pending Mgr Approval", value: "2" },
      ],
      columns: [
        { key: "date", label: "Date" },
        { key: "bookingNo", label: "Booking #" },
        { key: "guest", label: "Guest" },
        { key: "reason", label: "Reason" },
        { key: "approvedBy", label: "Approved by" },
        { key: "amount", label: "Amount", align: "right", render: v => money(v as number) },
      ],
      rows: [
        { date: "24 May", bookingNo: "BK100221", guest: "Anna T.", reason: "No-show waiver", approvedBy: "Tom W.", amount: 650 },
        { date: "22 May", bookingNo: "BK100198", guest: "Liu Wei", reason: "Service issue", approvedBy: "Tom W.", amount: 1200 },
        { date: "20 May", bookingNo: "BK100176", guest: "James C.", reason: "Cancellation", approvedBy: "Auto", amount: 2100 },
      ],
    };
  }
  // Sales
  if (name.includes("Source-wise")) {
    // Group real reservations by booking source into channel buckets.
    const bucketOf = (s: string) => {
      const x = (s || "").toLowerCase();
      if (x.includes("booking.com")) return "Booking.com";
      if (x.includes("agoda")) return "Agoda";
      if (x.includes("expedia")) return "Expedia";
      if (x.includes("makemytrip") || x.includes("goibibo") || x.includes("ota")) return "Other OTA";
      if (x.includes("website")) return "Website";
      if (x.includes("corporate")) return "Corporate";
      if (x.includes("agent")) return "Travel Agent";
      if (x.includes("walk") || x.includes("phone") || x.includes("direct")) return "Direct / Walk-in";
      return s || "Other";
    };
    const categoryOf = (bucket: string) =>
      bucket === "Website" || bucket === "Direct / Walk-in" ? "direct"
        : bucket === "Corporate" || bucket === "Travel Agent" ? "agent" : "ota";

    const groups: Record<string, { bookings: number; revenue: number; nights: number }> = {};
    let totalRev = 0;
    for (const r of RESERVATIONS) {
      if ((r as { status?: string }).status === "cancelled") continue;
      const bucket = bucketOf(r.source);
      (groups[bucket] ??= { bookings: 0, revenue: 0, nights: 0 });
      groups[bucket].bookings += 1;
      groups[bucket].revenue += r.total ?? 0;
      groups[bucket].nights += r.nights ?? 1;
      totalRev += r.total ?? 0;
    }

    const rows = Object.entries(groups)
      .map(([source, g]) => ({
        source, bookings: g.bookings, revenue: g.revenue,
        adr: g.nights ? Math.round(g.revenue / g.nights) : 0,
        share: totalRev ? `${Math.round((g.revenue / totalRev) * 100)}%` : "0%",
      }))
      .sort((a, b) => b.revenue - a.revenue);

    const catRev = { direct: 0, ota: 0, agent: 0 };
    for (const [bucket, g] of Object.entries(groups)) catRev[categoryOf(bucket)] += g.revenue;
    const pctOf = (v: number) => (totalRev ? `${Math.round((v / totalRev) * 100)}%` : "0%");

    return {
      kpis: [
        { label: "Direct + Website", value: pctOf(catRev.direct) },
        { label: "OTA", value: pctOf(catRev.ota) },
        { label: "Agent / Corporate", value: pctOf(catRev.agent) },
        { label: "Best Channel", value: rows[0]?.source ?? "—" },
      ],
      columns: [
        { key: "source", label: "Source" },
        { key: "bookings", label: "Bookings", align: "right" },
        { key: "revenue", label: "Revenue", align: "right", render: v => money(v as number) },
        { key: "adr", label: "ADR", align: "right", render: v => money(v as number) },
        { key: "share", label: "Share", align: "right" },
      ],
      rows,
      chart: "revenue",
    };
  }
  if (name.includes("Agent")) {
    return {
      kpis: [
        { label: "Active Agents", value: "3" },
        { label: "Total Bookings", value: "54" },
        { label: "Commission Paid", value: money(14600) },
        { label: "Outstanding", value: money(28950) },
      ],
      columns: [
        { key: "name", label: "Agent" },
        { key: "bookings", label: "Bookings", align: "right" },
        { key: "revenue", label: "Revenue", align: "right", render: v => money(v as number) },
        { key: "commission", label: "Commission", align: "right" },
        { key: "outstanding", label: "Outstanding", align: "right", render: v => money(v as number) },
      ],
      rows: [
        { name: "ABC Travels", bookings: 24, revenue: 38400, commission: "12%", outstanding: 18450 },
        { name: "Pearl Holidays", bookings: 12, revenue: 15800, commission: "10%", outstanding: 4250 },
        { name: "Skyline Tours", bookings: 18, revenue: 22600, commission: "15%", outstanding: 6250 },
      ],
    };
  }
  if (name.includes("Corporate")) {
    return {
      kpis: [
        { label: "Active Accounts", value: "3" },
        { label: "Total Bookings", value: "116" },
        { label: "Revenue", value: money(168400) },
        { label: "Outstanding", value: money(40950) },
      ],
      columns: [
        { key: "name", label: "Company" },
        { key: "bookings", label: "Bookings", align: "right" },
        { key: "revenue", label: "Revenue", align: "right", render: v => money(v as number) },
        { key: "credit", label: "Credit limit", align: "right", render: v => money(v as number) },
        { key: "outstanding", label: "Outstanding", align: "right", render: v => money(v as number) },
      ],
      rows: [
        { name: "TechCorp FZ-LLC", bookings: 38, revenue: 64200, credit: 100000, outstanding: 28700 },
        { name: "Emirates Bank", bookings: 22, revenue: 38200, credit: 80000, outstanding: 12500 },
        { name: "Global Oil Co.", bookings: 56, revenue: 66000, credit: 150000, outstanding: 0 },
      ],
    };
  }
  if (name.includes("Guest History")) {
    return {
      kpis: [
        { label: "Unique Guests", value: `${GUESTS.length}` },
        { label: "Repeat Guests", value: "12" },
        { label: "Avg Lifetime Spend", value: money(GUESTS.reduce((s, g) => s + g.lifetimeSpend, 0) / GUESTS.length) },
        { label: "VIPs", value: `${GUESTS.filter(g => g.vip).length}` },
      ],
      columns: [
        { key: "name", label: "Guest" },
        { key: "nationality", label: "Nationality" },
        { key: "lifetimeNights", label: "Nights", align: "right" },
        { key: "lifetimeSpend", label: "Spend", align: "right", render: v => money(v as number) },
        { key: "lastStay", label: "Last stay" },
      ],
      rows: GUESTS.slice(0, 12).map(g => ({ ...g, lastStay: g.lastStay ?? "—" })),
    };
  }
  if (name.includes("OTA")) {
    return {
      kpis: [
        { label: "Active Channels", value: "4" },
        { label: "OTA Bookings", value: "451" },
        { label: "OTA Revenue", value: money(389200) },
        { label: "Avg Commission", value: "16.5%" },
      ],
      columns: [
        { key: "channel", label: "Channel" },
        { key: "bookings", label: "Bookings", align: "right" },
        { key: "revenue", label: "Revenue", align: "right", render: v => money(v as number) },
        { key: "commission", label: "Commission %", align: "right" },
        { key: "lastSync", label: "Last Sync" },
      ],
      rows: [
        { channel: "Booking.com", bookings: 184, revenue: 162400, commission: "15%", lastSync: "2 min ago" },
        { channel: "Agoda", bookings: 112, revenue: 98700, commission: "18%", lastSync: "5 min ago" },
        { channel: "Expedia", bookings: 86, revenue: 74200, commission: "17%", lastSync: "8 min ago" },
        { channel: "MakeMyTrip", bookings: 41, revenue: 32100, commission: "16%", lastSync: "12 min ago" },
        { channel: "Goibibo", bookings: 28, revenue: 21800, commission: "15%", lastSync: "syncing…" },
      ],
    };
  }
  // ERP
  if (name.includes("Low Stock")) {
    return {
      kpis: [
        { label: "Below Min", value: "5" },
        { label: "Out of Stock", value: "0" },
        { label: "Urgent Re-order", value: "3" },
        { label: "Open POs", value: "3" },
      ],
      columns: [
        { key: "name", label: "Item" },
        { key: "cat", label: "Category" },
        { key: "vendor", label: "Vendor" },
        { key: "qty", label: "On hand", align: "right" },
        { key: "min", label: "Min", align: "right" },
        { key: "action", label: "Action" },
      ],
      rows: [
        { name: "Bath Towels — Large", cat: "Linen", vendor: "Pearl Textiles", qty: 32, min: 80, action: "Re-order 100" },
        { name: "Shampoo 30ml", cat: "Toiletries", vendor: "Luxor Amenities", qty: 410, min: 500, action: "Re-order 200" },
        { name: "Mineral Water 500ml", cat: "F&B", vendor: "Masafi Direct", qty: 240, min: 300, action: "Re-order 100" },
        { name: "Toilet Paper Roll", cat: "Toiletries", vendor: "Luxor Amenities", qty: 95, min: 150, action: "Re-order 100" },
        { name: "Multipurpose Cleaner 1L", cat: "Cleaning", vendor: "ChemServ", qty: 28, min: 30, action: "Re-order 30" },
      ],
    };
  }
  if (name.includes("Inventory")) {
    return {
      kpis: [
        { label: "Items", value: "12" },
        { label: "Stock Value", value: money(48200) },
        { label: "Movements (MTD)", value: "184" },
        { label: "Wastage", value: money(640) },
      ],
      columns: [
        { key: "name", label: "Item" },
        { key: "cat", label: "Category" },
        { key: "qty", label: "On hand", align: "right" },
        { key: "min", label: "Min", align: "right" },
        { key: "unit", label: "Unit" },
        { key: "price", label: "Unit price", align: "right", render: v => money(v as number) },
        { key: "value", label: "Value", align: "right", render: v => money(v as number) },
      ],
      rows: [
        { name: "Bath Towels — Large", cat: "Linen", qty: 32, min: 80, unit: "pcs", price: 28, value: 896 },
        { name: "Bed Sheets — King", cat: "Linen", qty: 180, min: 100, unit: "pcs", price: 65, value: 11700 },
        { name: "Shampoo 30ml", cat: "Toiletries", qty: 410, min: 500, unit: "pcs", price: 4, value: 1640 },
        { name: "Soap Bars 25g", cat: "Toiletries", qty: 850, min: 600, unit: "pcs", price: 2, value: 1700 },
        { name: "Coffee Beans — Premium", cat: "F&B", qty: 22, min: 15, unit: "kg", price: 145, value: 3190 },
      ],
    };
  }
  if (name.includes("Purchase")) {
    return {
      kpis: [
        { label: "POs (MTD)", value: "28" },
        { label: "Total Spend", value: money(42100) },
        { label: "Open POs", value: "3" },
        { label: "Vendors", value: "5" },
      ],
      columns: [
        { key: "po", label: "PO #" },
        { key: "date", label: "Date" },
        { key: "vendor", label: "Vendor" },
        { key: "items", label: "Items", align: "right" },
        { key: "amount", label: "Amount", align: "right", render: v => money(v as number) },
        { key: "status", label: "Status" },
      ],
      rows: [
        { po: "PO-2451", date: "22 May", vendor: "Pearl Textiles", items: 4, amount: 8400, status: "Received" },
        { po: "PO-2450", date: "20 May", vendor: "Stumptown ME", items: 1, amount: 3190, status: "Received" },
        { po: "PO-2449", date: "18 May", vendor: "ChemServ", items: 6, amount: 1850, status: "Pending" },
      ],
    };
  }
  if (name.includes("Housekeeping")) {
    return {
      kpis: [
        { label: "Rooms Cleaned (MTD)", value: "1,248" },
        { label: "Avg Time / Room", value: "42 min" },
        { label: "Inspections Passed", value: "96%" },
        { label: "Top Performer", value: "Sunil V." },
      ],
      columns: [
        { key: "name", label: "Housekeeper" },
        { key: "rooms", label: "Rooms", align: "right" },
        { key: "avgTime", label: "Avg time" },
        { key: "passRate", label: "Inspection %" },
        { key: "complaints", label: "Complaints", align: "right" },
      ],
      rows: [
        { name: "Sunil Verma", rooms: 312, avgTime: "38 min", passRate: "98%", complaints: 0 },
        { name: "Maria Lopez", rooms: 286, avgTime: "41 min", passRate: "97%", complaints: 1 },
        { name: "Aisha Mohamed", rooms: 254, avgTime: "44 min", passRate: "95%", complaints: 0 },
      ],
    };
  }
  if (name.includes("Maintenance")) {
    return {
      kpis: [
        { label: "Tickets (MTD)", value: "62" },
        { label: "Avg Resolution", value: "4.2 hrs" },
        { label: "Maintenance Cost", value: money(5800) },
        { label: "Most Common", value: "HVAC (18)" },
      ],
      columns: [
        { key: "category", label: "Category" },
        { key: "tickets", label: "Tickets", align: "right" },
        { key: "avgResolve", label: "Avg resolve" },
        { key: "cost", label: "Cost", align: "right", render: v => money(v as number) },
      ],
      rows: [
        { category: "HVAC", tickets: 18, avgResolve: "5h", cost: 2400 },
        { category: "Plumbing", tickets: 14, avgResolve: "3h", cost: 1200 },
        { category: "Electronics", tickets: 12, avgResolve: "2h", cost: 800 },
        { category: "Carpentry", tickets: 8, avgResolve: "6h", cost: 650 },
        { category: "Pool", tickets: 6, avgResolve: "4h", cost: 450 },
        { category: "Cleaning", tickets: 4, avgResolve: "1h", cost: 300 },
      ],
    };
  }
  if (name.includes("Audit Log")) {
    return {
      kpis: [
        { label: "Entries Today", value: "184" },
        { label: "By User", value: "8 users" },
        { label: "Approvals", value: "3" },
        { label: "Voids", value: "1" },
      ],
      columns: [
        { key: "time", label: "Time" },
        { key: "user", label: "User" },
        { key: "module", label: "Module" },
        { key: "action", label: "Action" },
        { key: "entity", label: "Entity" },
      ],
      rows: [
        { time: "13:42", user: "Khalid R.", module: "Folio", action: "Charge added", entity: "BK100245" },
        { time: "13:30", user: "Khalid R.", module: "Check-in", action: "Guest checked in", entity: "BK100231" },
        { time: "13:12", user: "Khalid R.", module: "Payment", action: "Payment received", entity: "BK100221" },
        { time: "12:30", user: "Tom W.", module: "Approval", action: "Discount approved", entity: "BK100199" },
        { time: "11:48", user: "Aisha M.", module: "Housekeeping", action: "Room marked Ready", entity: "Room 412" },
      ],
    };
  }
  // Generic fallback
  return {
    kpis: [
      { label: "Records", value: "—" },
      { label: "Date range", value: "Last 30 days" },
      { label: "Filters", value: "Default" },
      { label: "Last updated", value: "Just now" },
    ],
    columns: [
      { key: "label", label: "Item" },
      { key: "value", label: "Value", align: "right" },
    ],
    rows: [{ label: "Sample row", value: "—" }],
  };
}

export default function ReportViewerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const report = findReport(id);
  const [favorite, setFavorite] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [generatedAt, setGeneratedAt] = React.useState<string>("");
  React.useEffect(() => { setGeneratedAt(new Date().toLocaleString()); }, []);

  // Live data for the reports (falls back to seeds if the API is down).
  const [reservations, setReservations] = React.useState<Reservation[]>(RESERVATIONS);
  const [rooms, setRooms] = React.useState<Room[]>(ROOMS);
  const [guests, setGuests] = React.useState<Guest[]>(GUESTS);
  React.useEffect(() => {
    let cancelled = false;
    apiGet<Reservation[]>("/bookings").then(r => { if (!cancelled) setReservations(r); }).catch(() => {});
    apiGet<Room[]>("/room-board").then(r => { if (!cancelled) setRooms(r); }).catch(() => {});
    apiGet<Guest[]>("/guests").then(r => { if (!cancelled) setGuests(r); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (!report) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <p className="text-sm text-muted-foreground">Report not found.</p>
        <Link href="/reports" className="text-brand hover:underline text-sm mt-2 inline-block">← Back to Reports Center</Link>
      </div>
    );
  }

  const data = buildReportData(report.name, { reservations, rooms, guests });
  const filteredRows = search
    ? data.rows.filter(r => Object.values(r).some(v => String(v ?? "").toLowerCase().includes(search.toLowerCase())))
    : data.rows;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/reports" className="hover:text-foreground inline-flex items-center gap-1">
          <ChevronLeft className="h-3.5 w-3.5" />Reports Center
        </Link>
        <span>·</span>
        <span>{report.category}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="h-12 w-12 rounded-md bg-brand-soft text-brand-soft-foreground flex items-center justify-center shrink-0">
            <FileBarChart className="h-5 w-5" />
          </span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-display font-medium tracking-tight">{report.name}</h1>
              <Badge tone="neutral">{report.category}</Badge>
            </div>
            <p className="text-muted-foreground text-sm mt-1">{report.desc}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setFavorite(!favorite)}
            className={cn(
              "h-9 w-9 rounded-md border inline-flex items-center justify-center transition-colors",
              favorite ? "border-brand text-brand bg-brand-soft" : "border-border text-muted-foreground hover:bg-surface-sunken"
            )}
            title={favorite ? "Unfavorite" : "Favorite"}
          >
            <Star className="h-4 w-4" fill={favorite ? "currentColor" : "none"} />
          </button>
          <Button variant="outline"><Mail className="h-4 w-4" />Email</Button>
          <Button variant="outline"><Printer className="h-4 w-4" />Print</Button>
          <Button><FileDown className="h-4 w-4" />Export</Button>
        </div>
      </div>

      {/* Toolbar */}
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 text-xs text-muted-foreground mr-2">
            <Filter className="h-3.5 w-3.5" /><span>Filters</span>
          </div>
          <Select className="h-9 w-auto"><option>Last 30 days</option><option>Today</option><option>This week</option><option>This month</option><option>Custom range</option></Select>
          <Select className="h-9 w-auto"><option>All properties</option><option>The Pearl Marina</option></Select>
          <Select className="h-9 w-auto"><option>All branches</option><option>Main Tower</option></Select>
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search within results…" className="pl-9 h-9" />
          </div>
          <div className="inline-flex gap-1">
            <Button variant="outline" size="sm"><FileDown className="h-3.5 w-3.5" />PDF</Button>
            <Button variant="outline" size="sm"><FileDown className="h-3.5 w-3.5" />Excel</Button>
            <Button variant="outline" size="sm"><FileDown className="h-3.5 w-3.5" />CSV</Button>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-border flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="h-3 w-3 text-brand" />
          <span><span className="text-foreground font-medium">AI summary:</span> Highlights pulled from {filteredRows.length} records · trends and anomalies surfaced inline · click any row for drill-down.</span>
        </div>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {data.kpis.map(k => <KPICard key={k.label} label={k.label} value={k.value} accent="brand" />)}
      </div>

      {/* Chart for relevant reports */}
      {data.chart === "occupancy" && (
        <Card>
          <CardHeader><CardTitle>Occupancy Trend</CardTitle></CardHeader>
          <div className="pl-0 pr-4 pb-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.rows.map((r, i) => ({ day: `D${i + 1}`, occ: parseInt(String(r.occupancy)) }))} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-brand)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--color-brand)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="day" stroke="var(--color-muted-foreground)" fontSize={11} axisLine={false} tickLine={false} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} axisLine={false} tickLine={false} unit="%" />
                <Tooltip contentStyle={{ background: "var(--color-surface-elevated)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12, color: "var(--color-foreground)" }} />
                <Area type="monotone" dataKey="occ" stroke="var(--color-brand)" strokeWidth={2} fill="url(#g1)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
      {data.chart === "revenue" && (
        <Card>
          <CardHeader><CardTitle>Revenue by Line Item</CardTitle></CardHeader>
          <div className="pl-0 pr-4 pb-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.rows.slice(0, 6).map((r) => ({ name: String(r.source ?? r.line ?? r.label ?? ""), amount: Math.abs(Number(r.amount ?? r.revenue ?? 0)) }))} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={11} axisLine={false} tickLine={false} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "var(--color-surface-elevated)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12, color: "var(--color-foreground)" }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="amount" name="Revenue" fill="var(--color-brand)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Data table */}
      <Card className="p-0 overflow-hidden">
        <CardHeader className="bg-surface-elevated">
          <div className="flex items-center justify-between">
            <CardTitle>Detail Records</CardTitle>
            <Badge tone="neutral">{filteredRows.length} of {data.rows.length}</Badge>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-sunken/50 border-y border-border">
              <tr>
                {data.columns.map(c => (
                  <th key={c.key} className={cn("px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground", c.align === "right" ? "text-right" : "text-left")}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredRows.map((row, i) => (
                <tr key={i} className="hover:bg-surface-sunken/40">
                  {data.columns.map(c => {
                    const v = row[c.key];
                    const rendered = c.render ? c.render(v) : (v ?? "—");
                    const isNeg = c.key === "amount" && typeof v === "number" && v < 0;
                    return (
                      <td key={c.key} className={cn("px-4 py-2.5", c.align === "right" ? "text-right tabular" : "")}>
                        {c.key === "guest" || c.key === "guestName" ? (
                          <div className="inline-flex items-center gap-2">
                            <Avatar name={String(v)} size={24} />
                            <span>{String(rendered)}</span>
                          </div>
                        ) : isNeg ? (
                          <span className="text-danger inline-flex items-center gap-0.5"><ArrowDown className="h-3 w-3" />{String(rendered).replace("-", "")}</span>
                        ) : c.key === "amount" && typeof v === "number" && v > 0 ? (
                          <span className="text-success inline-flex items-center gap-0.5"><ArrowUp className="h-3 w-3" />{String(rendered)}</span>
                        ) : (
                          <>{rendered as React.ReactNode}</>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {filteredRows.length === 0 && (
                <tr><td colSpan={data.columns.length} className="px-4 py-8 text-center text-sm text-muted-foreground">No records match your search.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-4">
        <span>Generated <Calendar className="inline h-3 w-3 mx-1" />{generatedAt || "—"}</span>
        <span>The Pearl Marina · Main Tower</span>
      </div>
    </div>
  );
}
