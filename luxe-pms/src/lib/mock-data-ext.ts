// Extended mock data for all remaining modules.
import { money } from "./utils";

// ---------- HALLS ----------
export const HALLS = [
  { id: "h1", name: "Grand Ballroom", capacity: 300, hourly: 1200, halfDay: 6000, fullDay: 10000 },
  { id: "h2", name: "Pearl Hall", capacity: 150, hourly: 800, halfDay: 3800, fullDay: 6500 },
  { id: "h3", name: "Marina Suite", capacity: 80, hourly: 500, halfDay: 2200, fullDay: 3800 },
  { id: "h4", name: "Boardroom A", capacity: 20, hourly: 250, halfDay: 1000, fullDay: 1800 },
];

export const HALL_BOOKINGS = [
  { id: "hb1", customer: "Al-Mansoori Wedding", phone: "+971 50 123 4567", hall: "Grand Ballroom", date: "2026-05-25", start: "18:00", end: "23:00", guests: 280, package: "Royal Veg", advance: 8000, total: 22000, status: "confirmed" as const },
  { id: "hb2", customer: "TechCorp Annual Meet", phone: "+971 55 987 1234", hall: "Pearl Hall", date: "2026-05-26", start: "09:00", end: "17:00", guests: 120, package: "Corporate Buffet", advance: 5000, total: 11500, status: "confirmed" as const },
  { id: "hb3", customer: "Patel Engagement", phone: "+971 52 444 7890", hall: "Marina Suite", date: "2026-05-28", start: "19:00", end: "22:00", guests: 60, package: "Premium Veg", advance: 2000, total: 5400, status: "pending" as const },
  { id: "hb4", customer: "Khan Birthday", phone: "+971 56 222 1100", hall: "Boardroom A", date: "2026-05-24", start: "16:00", end: "20:00", guests: 18, package: "Cocktail Spread", advance: 1500, total: 2800, status: "in-progress" as const },
];

// ---------- FOOD / POS ----------
export const MENU_CATEGORIES = ["Breakfast", "Starters", "Mains", "Pizza", "Desserts", "Beverages", "Minibar"];

export const MENU_ITEMS = [
  { id: "m1", cat: "Breakfast", name: "Continental Breakfast", price: 95 },
  { id: "m2", cat: "Breakfast", name: "Eggs Benedict", price: 85 },
  { id: "m3", cat: "Breakfast", name: "Avocado Toast", price: 75 },
  { id: "m4", cat: "Breakfast", name: "Pancakes Stack", price: 65 },
  { id: "m5", cat: "Starters", name: "Caesar Salad", price: 70 },
  { id: "m6", cat: "Starters", name: "Hummus & Pita", price: 55 },
  { id: "m7", cat: "Mains", name: "Wagyu Burger", price: 165 },
  { id: "m8", cat: "Mains", name: "Grilled Salmon", price: 185 },
  { id: "m9", cat: "Mains", name: "Lamb Biryani", price: 145 },
  { id: "m10", cat: "Pizza", name: "Margherita", price: 90 },
  { id: "m11", cat: "Pizza", name: "Pepperoni", price: 105 },
  { id: "m12", cat: "Pizza", name: "Truffle Mushroom", price: 135 },
  { id: "m13", cat: "Desserts", name: "Tiramisu", price: 55 },
  { id: "m14", cat: "Desserts", name: "Crème Brûlée", price: 60 },
  { id: "m15", cat: "Beverages", name: "Fresh Orange Juice", price: 35 },
  { id: "m16", cat: "Beverages", name: "Espresso", price: 25 },
  { id: "m17", cat: "Beverages", name: "Cappuccino", price: 32 },
  { id: "m18", cat: "Minibar", name: "Sparkling Water", price: 18 },
  { id: "m19", cat: "Minibar", name: "Premium Snack Box", price: 45 },
];

export const FOOD_ORDERS = [
  { id: "fo1", room: "305", guest: "Yuki Tanaka", time: "13:42", items: 3, total: 245, status: "preparing" as const, paidBy: "Add to room" },
  { id: "fo2", room: "412", guest: "Sarah Whitfield", time: "13:30", items: 2, total: 130, status: "delivered" as const, paidBy: "Add to room" },
  { id: "fo3", room: "208", guest: "Carlos Mendoza", time: "13:15", items: 5, total: 415, status: "in-kitchen" as const, paidBy: "Pay now" },
  { id: "fo4", room: "601", guest: "Priya Sharma", time: "12:58", items: 1, total: 95, status: "delivered" as const, paidBy: "Add to room" },
];

// ---------- MAINTENANCE TICKETS ----------
export type Priority = "low" | "medium" | "high" | "urgent";
export type TicketStatus = "open" | "assigned" | "in-progress" | "resolved";

export const TECHNICIANS = ["Ravi K.", "Ahmed F.", "Joseph L.", "Mahmoud S."];
export const MAINTENANCE_TICKETS = [
  { id: "t1", code: "M-2401", room: "305", title: "AC not cooling — guest complaint", priority: "urgent" as Priority, status: "in-progress" as TicketStatus, assignee: "Ravi K.", reported: "13:22", category: "HVAC" },
  { id: "t2", code: "M-2400", room: "412", title: "Bathroom faucet leaking", priority: "high" as Priority, status: "assigned" as TicketStatus, assignee: "Ahmed F.", reported: "11:50", category: "Plumbing" },
  { id: "t3", code: "M-2399", room: "208", title: "TV remote not working", priority: "low" as Priority, status: "open" as TicketStatus, assignee: null as string | null, reported: "10:15", category: "Electronics" },
  { id: "t4", code: "M-2398", room: "Lobby", title: "Marble polish required", priority: "medium" as Priority, status: "open" as TicketStatus, assignee: null as string | null, reported: "09:00", category: "Cleaning" },
  { id: "t5", code: "M-2397", room: "501", title: "Door lock card reader issue", priority: "high" as Priority, status: "resolved" as TicketStatus, assignee: "Joseph L.", reported: "Yesterday", category: "Access" },
  { id: "t6", code: "M-2396", room: "Pool", title: "Pool filter pressure low", priority: "medium" as Priority, status: "assigned" as TicketStatus, assignee: "Mahmoud S.", reported: "Yesterday", category: "Pool" },
  { id: "t7", code: "M-2395", room: "311", title: "Wall paint chip near window", priority: "low" as Priority, status: "open" as TicketStatus, assignee: null as string | null, reported: "Yesterday", category: "Carpentry" },
  { id: "t8", code: "M-2394", room: "Kitchen", title: "Walk-in fridge temperature alarm", priority: "urgent" as Priority, status: "resolved" as TicketStatus, assignee: "Ravi K.", reported: "2d ago", category: "HVAC" },
];

// ---------- AGENTS & CORPORATES ----------
export const AGENTS = [
  { id: "a1", type: "Agent", name: "ABC Travels", contact: "Mr. Sharma", phone: "+971 50 111 2233", email: "abc@travels.ae", gst: "100123456700003", credit: 50000, outstanding: 18450, commission: 12, bookings: 24 },
  { id: "a2", type: "Agent", name: "Pearl Holidays", contact: "Ms. Khalifa", phone: "+971 52 333 8899", email: "pearl@holidays.ae", gst: "100234567800003", credit: 30000, outstanding: 4250, commission: 10, bookings: 12 },
  { id: "a3", type: "Agent", name: "Skyline Tours", contact: "Mr. Pereira", phone: "+971 55 666 4422", email: "info@skyline.ae", gst: "100345678900003", credit: 40000, outstanding: 6250, commission: 15, bookings: 18 },
  { id: "a4", type: "Corporate", name: "TechCorp FZ-LLC", contact: "HR Dept.", phone: "+971 50 999 1100", email: "travel@techcorp.com", gst: "100456789000003", credit: 100000, outstanding: 28700, commission: 0, bookings: 38 },
  { id: "a5", type: "Corporate", name: "Emirates Bank", contact: "Admin", phone: "+971 4 222 3344", email: "vendor@emirates.bank", gst: "100567890100003", credit: 80000, outstanding: 12500, commission: 0, bookings: 22 },
  { id: "a6", type: "Corporate", name: "Global Oil Co.", contact: "Procurement", phone: "+971 2 444 5566", email: "po@globaloil.ae", gst: "100678901200003", credit: 150000, outstanding: 0, commission: 0, bookings: 56 },
];

// ---------- ACCOUNTS ----------
export const INCOME_BREAKDOWN = [
  { label: "Room", value: 84520, color: "var(--color-brand)" },
  { label: "F&B", value: 21340, color: "var(--color-accent)" },
  { label: "Hall", value: 18200, color: "var(--color-info)" },
  { label: "Extra bed", value: 4200, color: "var(--color-status-checkout-pending)" },
  { label: "Late checkout", value: 1850, color: "var(--color-status-inspected)" },
];
export const EXPENSE_BREAKDOWN = [
  { label: "Payroll", value: 38500, color: "var(--color-brand)" },
  { label: "Utilities", value: 12400, color: "var(--color-info)" },
  { label: "F&B Cost", value: 9200, color: "var(--color-accent)" },
  { label: "Maintenance", value: 5800, color: "var(--color-warning)" },
  { label: "OTA Commissions", value: 7100, color: "var(--color-status-checkout-pending)" },
  { label: "Other", value: 3300, color: "var(--color-status-blocked)" },
];
export const RECENT_TXN = [
  { id: "tx1", date: "24 May", desc: "Folio settlement — Yuki Tanaka", type: "Income", amount: 2335 },
  { id: "tx2", date: "24 May", desc: "DEWA electricity bill", type: "Expense", amount: -4200 },
  { id: "tx3", date: "23 May", desc: "ABC Travels — advance receipt", type: "Income", amount: 8000 },
  { id: "tx4", date: "23 May", desc: "Linen supplier — invoice #L-4421", type: "Expense", amount: -1850 },
  { id: "tx5", date: "23 May", desc: "Refund — Booking #BK100221 (no-show waiver)", type: "Refund", amount: -650 },
  { id: "tx6", date: "22 May", desc: "Folio settlement — Aisha Hassan", type: "Income", amount: 1980 },
];

// ---------- CASHIER ----------
export const SHIFT = {
  number: 4218, cashier: "Khalid Rahman",
  startedAt: "06:00", endsAt: "14:00",
  opening: 2000,
  cash: 4250, card: 8420, upi: 1850, online: 2100,
  refunds: 350, expenses: 280,
};

// ---------- INVENTORY ----------
export const INVENTORY_ITEMS = [
  { id: "i1", name: "Bath Towels — Large", cat: "Linen", vendor: "Pearl Textiles", qty: 32, min: 80, unit: "pcs", lastPurchase: "12 May", price: 28 },
  { id: "i2", name: "Bed Sheets — King", cat: "Linen", vendor: "Pearl Textiles", qty: 180, min: 100, unit: "pcs", lastPurchase: "08 May", price: 65 },
  { id: "i3", name: "Shampoo 30ml", cat: "Toiletries", vendor: "Luxor Amenities", qty: 410, min: 500, unit: "pcs", lastPurchase: "05 May", price: 4 },
  { id: "i4", name: "Soap Bars 25g", cat: "Toiletries", vendor: "Luxor Amenities", qty: 850, min: 600, unit: "pcs", lastPurchase: "05 May", price: 2 },
  { id: "i5", name: "Mineral Water 500ml", cat: "F&B", vendor: "Masafi Direct", qty: 240, min: 300, unit: "btl", lastPurchase: "20 May", price: 1.5 },
  { id: "i6", name: "Toilet Paper Roll", cat: "Toiletries", vendor: "Luxor Amenities", qty: 95, min: 150, unit: "roll", lastPurchase: "15 May", price: 3.5 },
  { id: "i7", name: "Multipurpose Cleaner 1L", cat: "Cleaning", vendor: "ChemServ", qty: 28, min: 30, unit: "btl", lastPurchase: "10 May", price: 18 },
  { id: "i8", name: "Coffee Beans — Premium", cat: "F&B", vendor: "Stumptown ME", qty: 22, min: 15, unit: "kg", lastPurchase: "18 May", price: 145 },
  { id: "i9", name: "Glass Cleaner 750ml", cat: "Cleaning", vendor: "ChemServ", qty: 14, min: 20, unit: "btl", lastPurchase: "10 May", price: 12 },
  { id: "i10", name: "Coat Hangers", cat: "Misc", vendor: "Pearl Textiles", qty: 320, min: 200, unit: "pcs", lastPurchase: "01 May", price: 5 },
  { id: "i11", name: "Mini Toothbrush", cat: "Toiletries", vendor: "Luxor Amenities", qty: 680, min: 500, unit: "pcs", lastPurchase: "05 May", price: 1.2 },
  { id: "i12", name: "Pillow — Standard", cat: "Linen", vendor: "Pearl Textiles", qty: 56, min: 40, unit: "pcs", lastPurchase: "08 May", price: 85 },
];

// ---------- VENDORS ----------
export const VENDORS = [
  { id: "v1", name: "Pearl Textiles", contact: "Mr. Bansal", phone: "+971 4 222 1100", terms: "Net 30", outstanding: 8400, lastInvoice: "12 May" },
  { id: "v2", name: "Luxor Amenities", contact: "Ms. Lopez", phone: "+971 4 333 4455", terms: "Net 15", outstanding: 2200, lastInvoice: "05 May" },
  { id: "v3", name: "Masafi Direct", contact: "Mr. Al-Habsi", phone: "+971 4 555 7788", terms: "Net 7", outstanding: 380, lastInvoice: "20 May" },
  { id: "v4", name: "ChemServ", contact: "Mr. Khoury", phone: "+971 4 999 0011", terms: "Net 30", outstanding: 0, lastInvoice: "10 May" },
  { id: "v5", name: "Stumptown ME", contact: "Ms. Greene", phone: "+971 4 111 2244", terms: "Net 15", outstanding: 3190, lastInvoice: "18 May" },
];

// ---------- STAFF ----------
export const STAFF = [
  { id: "s1", name: "Khalid Rahman", role: "Reception", dept: "Front Office", phone: "+971 50 100 2200", email: "khalid@pearlmarina.com", joined: "2024-03-12", salary: 8500, active: true },
  { id: "s2", name: "Maria Lopez", role: "Housekeeper", dept: "Housekeeping", phone: "+971 52 200 3300", email: "maria@pearlmarina.com", joined: "2023-11-08", salary: 4200, active: true },
  { id: "s3", name: "Ravi Kumar", role: "Maintenance Tech", dept: "Engineering", phone: "+971 55 300 4400", email: "ravi@pearlmarina.com", joined: "2022-07-20", salary: 5800, active: true },
  { id: "s4", name: "Aisha Mohamed", role: "Housekeeper", dept: "Housekeeping", phone: "+971 56 400 5500", email: "aisha@pearlmarina.com", joined: "2024-01-15", salary: 4200, active: true },
  { id: "s5", name: "Joseph D'Souza", role: "Restaurant Steward", dept: "F&B", phone: "+971 50 500 6600", email: "joseph@pearlmarina.com", joined: "2023-08-04", salary: 4800, active: true },
  { id: "s6", name: "Sunil Verma", role: "Housekeeping Sup.", dept: "Housekeeping", phone: "+971 52 600 7700", email: "sunil@pearlmarina.com", joined: "2021-05-19", salary: 6500, active: true },
  { id: "s7", name: "Fatima Al-Hashimi", role: "Accounts Exec.", dept: "Finance", phone: "+971 55 700 8800", email: "fatima@pearlmarina.com", joined: "2020-09-01", salary: 9200, active: true },
  { id: "s8", name: "Tom Walker", role: "Night Manager", dept: "Front Office", phone: "+971 56 800 9900", email: "tom@pearlmarina.com", joined: "2019-04-22", salary: 12500, active: true },
];

// ---------- CHANNELS / OTA ----------
export const CHANNELS = [
  { id: "c1", name: "Booking.com", status: "connected" as const, lastSync: "2 min ago", bookings: 184, commission: 15, rev: 162400 },
  { id: "c2", name: "Agoda", status: "connected" as const, lastSync: "5 min ago", bookings: 112, commission: 18, rev: 98700 },
  { id: "c3", name: "Expedia", status: "connected" as const, lastSync: "8 min ago", bookings: 86, commission: 17, rev: 74200 },
  { id: "c4", name: "MakeMyTrip", status: "connected" as const, lastSync: "12 min ago", bookings: 41, commission: 16, rev: 32100 },
  { id: "c5", name: "Goibibo", status: "syncing" as const, lastSync: "syncing…", bookings: 28, commission: 15, rev: 21800 },
  { id: "c6", name: "Airbnb", status: "disconnected" as const, lastSync: "—", bookings: 0, commission: 14, rev: 0 },
];

// ---------- WEBSITE BOOKING ENGINE PREVIEW ----------
export const WEB_ROOMS = [
  { id: "wr1", name: "Deluxe Sea View", price: 650, image: "🌊", desc: "King bed · 38 sqm · Marina view" },
  { id: "wr2", name: "Suite", price: 1200, image: "✨", desc: "King bed · 65 sqm · Living room · Marina view" },
  { id: "wr3", name: "Executive Floor", price: 1500, image: "🏆", desc: "King bed · 55 sqm · Lounge access" },
];

// ---------- NOTIFICATIONS ----------
export const NOTIF_TEMPLATES = [
  { id: "nt1", name: "Booking Confirmation", trigger: "On booking", channels: ["Email", "WhatsApp"], lastSent: "12 today" },
  { id: "nt2", name: "Advance Payment Receipt", trigger: "On advance", channels: ["Email"], lastSent: "8 today" },
  { id: "nt3", name: "Pre-arrival Welcome", trigger: "1 day before", channels: ["Email", "WhatsApp"], lastSent: "5 today" },
  { id: "nt4", name: "Check-in Successful", trigger: "On check-in", channels: ["WhatsApp"], lastSent: "3 today" },
  { id: "nt5", name: "Checkout Reminder", trigger: "Morning of checkout", channels: ["WhatsApp"], lastSent: "5 today" },
  { id: "nt6", name: "Invoice", trigger: "On checkout", channels: ["Email"], lastSent: "5 today" },
  { id: "nt7", name: "Feedback Request", trigger: "1 day after", channels: ["Email", "WhatsApp"], lastSent: "4 today" },
  { id: "nt8", name: "Cash Mismatch Alert (Manager)", trigger: "On variance", channels: ["WhatsApp", "Telegram"], lastSent: "Yesterday" },
];

export const NOTIF_LOG = [
  { id: "nl1", time: "13:45", to: "Yuki Tanaka", channel: "WhatsApp", template: "Check-in Successful", status: "delivered" as const },
  { id: "nl2", time: "13:30", to: "Sarah Whitfield", channel: "Email", template: "Pre-arrival Welcome", status: "delivered" as const },
  { id: "nl3", time: "13:12", to: "Carlos Mendoza", channel: "Email", template: "Invoice", status: "opened" as const },
  { id: "nl4", time: "12:50", to: "Priya Sharma", channel: "WhatsApp", template: "Booking Confirmation", status: "delivered" as const },
  { id: "nl5", time: "12:18", to: "Khalid (Manager)", channel: "Telegram", template: "Cash Mismatch Alert", status: "delivered" as const },
  { id: "nl6", time: "11:48", to: "Liu Wei", channel: "Email", template: "Feedback Request", status: "bounced" as const },
];

// ---------- NIGHT AUDIT HISTORY ----------
export const AUDIT_RUNS = [
  { id: "ar1", date: "24 May 2026", runAt: "00:00", duration: "47s", status: "success" as const, occupancy: 40, revenue: 84520, noShows: 0 },
  { id: "ar2", date: "23 May 2026", runAt: "00:00", duration: "52s", status: "success" as const, occupancy: 38, revenue: 78240, noShows: 1 },
  { id: "ar3", date: "22 May 2026", runAt: "00:01", duration: "44s", status: "success" as const, occupancy: 42, revenue: 88700, noShows: 0 },
  { id: "ar4", date: "21 May 2026", runAt: "00:00", duration: "1m 12s", status: "anomaly" as const, occupancy: 35, revenue: 71200, noShows: 2 },
];

// ---------- REPORTS ----------
export const REPORT_CATEGORIES = [
  {
    name: "Operations",
    reports: [
      { id: "r1", name: "Reservation Report", desc: "All bookings by source, channel, status" },
      { id: "r2", name: "Occupancy Report", desc: "Daily / monthly occupancy %" },
      { id: "r3", name: "Arrivals / Departures", desc: "Today and date-range" },
      { id: "r4", name: "In-house Guests", desc: "Currently staying" },
      { id: "r5", name: "Cancellations", desc: "By source and reason" },
      { id: "r6", name: "No-show Report", desc: "Tracking and recovery" },
    ],
  },
  {
    name: "Finance",
    reports: [
      { id: "r7", name: "Daily Collection", desc: "By payment mode" },
      { id: "r8", name: "Pending Payments", desc: "Outstanding by guest" },
      { id: "r9", name: "Tax (VAT) Summary", desc: "Statutory format" },
      { id: "r10", name: "Profit & Loss", desc: "Period-wise P&L" },
      { id: "r11", name: "Cashier Shift Report", desc: "Per shift, variance" },
      { id: "r12", name: "Refund Report", desc: "All refunds with reasons" },
    ],
  },
  {
    name: "Sales",
    reports: [
      { id: "r13", name: "Source-wise Revenue", desc: "Direct vs OTA vs Agent" },
      { id: "r14", name: "Agent Booking Report", desc: "Per agent KPI" },
      { id: "r15", name: "Corporate Booking Report", desc: "Per corporate KPI" },
      { id: "r16", name: "Guest History", desc: "Repeat & lifetime value" },
      { id: "r17", name: "OTA Performance", desc: "Channel-wise" },
    ],
  },
  {
    name: "Operations · ERP",
    reports: [
      { id: "r18", name: "Inventory Report", desc: "Stock-on-hand and movements" },
      { id: "r19", name: "Low Stock Report", desc: "Items below minimum" },
      { id: "r20", name: "Purchase Report", desc: "By vendor and period" },
      { id: "r21", name: "Housekeeping Productivity", desc: "Per HK staff" },
      { id: "r22", name: "Maintenance Cost", desc: "By category and room" },
    ],
  },
  {
    name: "Admin",
    reports: [
      { id: "r23", name: "Audit Log Report", desc: "User actions with old/new values" },
      { id: "r24", name: "Night Audit Report", desc: "Daily summary archive" },
    ],
  },
];

// ---------- USERS ----------
export const USERS = [
  { id: "u1", name: "Khalid Rahman", email: "khalid@pearlmarina.com", role: "Reception", status: "active" as const, last: "Just now", twoFA: true },
  { id: "u2", name: "Tom Walker", email: "tom@pearlmarina.com", role: "Manager", status: "active" as const, last: "12 min ago", twoFA: true },
  { id: "u3", name: "Fatima Al-Hashimi", email: "fatima@pearlmarina.com", role: "Accounts", status: "active" as const, last: "1 hr ago", twoFA: true },
  { id: "u4", name: "Sunil Verma", email: "sunil@pearlmarina.com", role: "Housekeeping", status: "active" as const, last: "2 hr ago", twoFA: false },
  { id: "u5", name: "Joseph D'Souza", email: "joseph@pearlmarina.com", role: "Restaurant", status: "active" as const, last: "Yesterday", twoFA: false },
  { id: "u6", name: "Aisha Mohamed", email: "aisha@pearlmarina.com", role: "Housekeeping", status: "active" as const, last: "2 days ago", twoFA: false },
  { id: "u7", name: "Owner", email: "owner@pearlmarina.com", role: "Owner", status: "active" as const, last: "Last week", twoFA: true },
  { id: "u8", name: "Demo Cashier", email: "demo@pearlmarina.com", role: "Reception", status: "disabled" as const, last: "3 weeks ago", twoFA: false },
];

// ---------- AUDIT LOGS ----------
export const AUDIT_LOG_ENTRIES = [
  { id: "al1", time: "13:42", user: "Khalid R.", module: "Folio", action: "Charge added", entity: "BK100245 / Spa", before: "—", after: "AED 577.50" },
  { id: "al2", time: "13:30", user: "Khalid R.", module: "Check-in", action: "Guest checked in", entity: "BK100231 / Room 305", before: "Reserved", after: "Occupied" },
  { id: "al3", time: "13:12", user: "Khalid R.", module: "Payment", action: "Payment received", entity: "BK100221 / Cash", before: "—", after: "AED 800" },
  { id: "al4", time: "12:58", user: "Khalid R.", module: "Folio", action: "Discount applied", entity: "BK100199 / 10%", before: "0%", after: "10%" },
  { id: "al5", time: "12:30", user: "Tom W. (Mgr)", module: "Approval", action: "Discount approved", entity: "BK100199", before: "Pending", after: "Approved" },
  { id: "al6", time: "11:48", user: "Aisha M.", module: "Housekeeping", action: "Room marked Ready", entity: "Room 412", before: "Inspected", after: "Ready" },
  { id: "al7", time: "10:15", user: "System", module: "Maintenance", action: "Ticket auto-created", entity: "M-2399 / Room 208", before: "—", after: "Open" },
  { id: "al8", time: "09:00", user: "Sunil V.", module: "Inventory", action: "Stock issued", entity: "Bath Towels × 20", before: "52", after: "32" },
  { id: "al9", time: "00:00", user: "System", module: "Night Audit", action: "Audit completed", entity: "Run #4218", before: "—", after: "Success" },
  { id: "al10", time: "Yesterday", user: "Fatima A.", module: "Vendor", action: "Vendor invoice paid", entity: "Pearl Textiles / L-4421", before: "Pending", after: "Paid" },
];

// ---------- GROUP BOOKINGS ----------
export type GroupStatus = "draft" | "tentative" | "confirmed" | "in-house" | "completed" | "cancelled";
export type GroupType = "Wedding" | "Conference" | "Tour Group" | "Sports Team" | "Corporate Retreat" | "Other";

export interface GroupRoomBlock { type: string; qty: number; rate: number; assigned: number; }
export interface GroupGuestEntry { id: string; roomNo?: string; roomType: string; lead: string; pax: number; phone?: string; remarks?: string; }

export interface GroupBooking {
  id: string;
  code: string;
  name: string;
  type: GroupType;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  bookedBy?: string;
  arrival: string;
  departure: string;
  nights: number;
  block: GroupRoomBlock[];
  totalRooms: number;
  totalPax: number;
  ratePlan: string;
  services: string[];
  total: number;
  advance: number;
  balance: number;
  status: GroupStatus;
  notes?: string;
  createdAt: string;
}

export const GROUP_BOOKINGS: GroupBooking[] = [
  {
    id: "grp1", code: "GRP-2401", name: "Al-Mansoori Wedding",
    type: "Wedding", contactName: "Mr. Hassan Al-Mansoori",
    contactPhone: "+971 50 111 2233", contactEmail: "hassan@almansoori.ae",
    bookedBy: "Pearl Holidays (Agent)",
    arrival: "2026-05-25", departure: "2026-05-28", nights: 3,
    block: [
      { type: "Deluxe", qty: 30, rate: 580, assigned: 28 },
      { type: "Suite", qty: 6, rate: 1100, assigned: 6 },
      { type: "King", qty: 14, rate: 780, assigned: 14 },
    ],
    totalRooms: 50, totalPax: 110, ratePlan: "CP (Room + Breakfast)",
    services: ["Grand Ballroom — Reception evening", "Airport pickup × 22", "Vendor parking × 8"],
    total: 138400, advance: 60000, balance: 78400,
    status: "confirmed",
    notes: "Bridal suite must be Room 605. Henna evening 25th in Pearl Hall.",
    createdAt: "2026-04-12",
  },
  {
    id: "grp2", code: "GRP-2402", name: "TechCorp Annual Conference",
    type: "Corporate Retreat", contactName: "Ms. Anita Vora",
    contactPhone: "+971 55 987 1234", contactEmail: "anita@techcorp.com",
    bookedBy: "TechCorp FZ-LLC (Corporate)",
    arrival: "2026-05-26", departure: "2026-05-28", nights: 2,
    block: [
      { type: "Deluxe", qty: 28, rate: 520, assigned: 28 },
    ],
    totalRooms: 28, totalPax: 28, ratePlan: "CP — Corporate rate",
    services: ["Pearl Hall — 8h × 2 days", "Coffee breaks × 4", "Lunch × 2", "AV setup"],
    total: 41600, advance: 41600, balance: 0,
    status: "in-house",
    notes: "Invoice billed to TechCorp FZ-LLC. Credit booking.",
    createdAt: "2026-04-30",
  },
  {
    id: "grp3", code: "GRP-2403", name: "Pearl Tours — Chennai Batch 14",
    type: "Tour Group", contactName: "Mr. Suresh Iyer",
    contactPhone: "+971 52 333 8899", contactEmail: "ops@pearltours.in",
    bookedBy: "Pearl Holidays (Agent)",
    arrival: "2026-05-27", departure: "2026-05-31", nights: 4,
    block: [
      { type: "Queen", qty: 12, rate: 380, assigned: 8 },
      { type: "Family", qty: 6, rate: 820, assigned: 4 },
    ],
    totalRooms: 18, totalPax: 42, ratePlan: "MAP (Breakfast + Dinner)",
    services: ["Airport pickup × 18", "Half-day city tour", "Desert safari evening"],
    total: 56640, advance: 17000, balance: 39640,
    status: "confirmed",
    notes: "Rooming list shared via WhatsApp — partial.",
    createdAt: "2026-05-08",
  },
  {
    id: "grp4", code: "GRP-2404", name: "Bombay Cricket Academy U-19",
    type: "Sports Team", contactName: "Coach Kapoor",
    contactPhone: "+971 56 444 7890", contactEmail: "coach@bca.in",
    arrival: "2026-06-01", departure: "2026-06-06", nights: 5,
    block: [
      { type: "Queen", qty: 22, rate: 350, assigned: 0 },
    ],
    totalRooms: 22, totalPax: 44, ratePlan: "AP (Full Board) — Long stay",
    services: ["Bus transfers × 4", "Buffet dining", "Conference room — daily 2h"],
    total: 77000, advance: 0, balance: 77000,
    status: "tentative",
    notes: "Pending sponsor confirmation. Hold until 27 May.",
    createdAt: "2026-05-18",
  },
];

export const SAMPLE_ROOMING_LIST: GroupGuestEntry[] = [
  { id: "rg1", roomNo: "601", roomType: "Suite", lead: "Mr. Hassan Al-Mansoori (Groom)", pax: 1, phone: "+971 50 111 2233", remarks: "VIP — late checkout 4pm" },
  { id: "rg2", roomNo: "602", roomType: "Suite", lead: "Mr. Faisal Al-Mansoori (Father)", pax: 2, remarks: "Adjoining preferred" },
  { id: "rg3", roomNo: "603", roomType: "Suite", lead: "Mrs. Layla Khouri (Mother of bride)", pax: 2 },
  { id: "rg4", roomNo: "501", roomType: "King", lead: "Mr. Karim Bishara", pax: 2 },
  { id: "rg5", roomNo: "502", roomType: "King", lead: "Dr. Salim Ghazi", pax: 2 },
  { id: "rg6", roomNo: "503", roomType: "King", lead: "Mrs. Reem Saleh", pax: 1 },
  { id: "rg7", roomType: "Deluxe", lead: "Pending — group member 7", pax: 2 },
  { id: "rg8", roomType: "Deluxe", lead: "Pending — group member 8", pax: 2 },
  { id: "rg9", roomType: "Deluxe", lead: "Pending — group member 9", pax: 2 },
];

export const GROUP_TIMELINE = [
  { id: "tl1", time: "12 Apr · 11:42", actor: "Khalid R.", action: "Group enquiry received via website" },
  { id: "tl2", time: "12 Apr · 14:30", actor: "Tom W. (Manager)", action: "Tentative block created — 50 rooms × 3 nights" },
  { id: "tl3", time: "15 Apr · 10:18", actor: "Pearl Holidays", action: "Agent confirmed — credit booking approved" },
  { id: "tl4", time: "20 Apr · 16:50", actor: "Fatima A.", action: "Advance received — AED 30,000 (bank transfer)" },
  { id: "tl5", time: "02 May · 09:00", actor: "Khalid R.", action: "Rooming list received (partial)" },
  { id: "tl6", time: "10 May · 14:15", actor: "Sunil V. (HK Sup.)", action: "Pre-arrival inspection completed for 50 rooms" },
  { id: "tl7", time: "20 May · 17:00", actor: "Fatima A.", action: "Second advance received — AED 30,000" },
  { id: "tl8", time: "23 May · 08:30", actor: "System", action: "Reminder email sent to group contact" },
];

// helpers
export { money };
