import type { Room, Guest, Reservation, RoomStatus, RoomType, BookingSource, FolioCharge, FolioPayment, PaymentStatus } from "./types";

const ROOM_TYPES: RoomType[] = ["Queen", "Deluxe", "Suite", "King", "Family", "Executive"];
const SOURCES: BookingSource[] = ["Walk-in", "Website", "Phone", "OTA: Booking.com", "OTA: Agoda", "OTA: Expedia", "Agent", "Corporate"];

const GUEST_NAMES = [
  "Rajesh Kapoor", "Priya Sharma", "Arjun Mehta", "Anjali Iyer",
  "Vikram Singh", "Sanjana Reddy", "Karan Malhotra", "Neha Patel",
  "Aditya Verma", "Kavya Nair", "Rahul Joshi", "Shruti Rao",
  "Sandeep Banerjee", "Pooja Bhatt", "James Carter", "Sarah Whitfield",
  "Hiroshi Tanaka", "Aisha Khan", "Marcus Webb", "Olivia Bennett",
];

const NATIONALITIES = ["India", "USA", "UK", "Japan", "UAE", "Singapore", "Australia", "Germany", "France", "Canada"];
// Indian luxury hotel pricing (per night, pre-GST)
const RATES: Record<RoomType, number> = { Queen: 6500, Deluxe: 8500, Suite: 18000, King: 11500, Family: 13500, Executive: 22000 };

const STATUS_DISTRIBUTION: RoomStatus[] = [
  "occupied","occupied","occupied","occupied","occupied","occupied","occupied",
  "reserved","reserved","reserved",
  "available","available","available",
  "dirty","dirty",
  "cleaning",
  "inspected",
  "ready",
  "maintenance",
  "blocked",
  "checkout-pending",
];

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const rand = seeded(7);

export const ROOMS: Room[] = (() => {
  const rooms: Room[] = [];
  let id = 1;
  for (let floor = 1; floor <= 6; floor++) {
    const perFloor = floor === 6 ? 8 : 12;
    for (let i = 1; i <= perFloor; i++) {
      const number = `${floor}${String(i).padStart(2, "0")}`;
      const type = floor === 6 ? ROOM_TYPES[Math.floor(rand() * 3) + 2] : ROOM_TYPES[Math.floor(rand() * 4)];
      const status = STATUS_DISTRIBUTION[Math.floor(rand() * STATUS_DISTRIBUTION.length)];
      const hasGuest = ["occupied", "checkout-pending", "reserved"].includes(status);
      rooms.push({
        id: `r${id++}`,
        number,
        floor,
        type,
        status,
        hkStatus: status === "dirty" ? "dirty" : status === "cleaning" ? "cleaning" : status === "inspected" ? "inspected" : "clean",
        guestName: hasGuest ? GUEST_NAMES[Math.floor(rand() * GUEST_NAMES.length)] : undefined,
        source: hasGuest ? SOURCES[Math.floor(rand() * SOURCES.length)] : undefined,
        checkIn: hasGuest ? "2026-05-23T14:00:00" : undefined,
        checkOut: hasGuest ? "2026-05-26T11:00:00" : undefined,
        paymentStatus: hasGuest ? (["paid", "partial", "unpaid"] as PaymentStatus[])[Math.floor(rand() * 3)] : undefined,
        vip: rand() > 0.85,
        rate: RATES[type],
      });
    }
  }
  return rooms;
})();

const INDIAN_ID_TYPES = ["Aadhaar", "PAN", "Passport", "Driving License", "Voter ID"];

export const GUESTS: Guest[] = GUEST_NAMES.map((name, i) => {
  const nationality = NATIONALITIES[i % NATIONALITIES.length];
  const isIndian = nationality === "India";
  const idType = isIndian ? INDIAN_ID_TYPES[i % 4] : "Passport";
  // Aadhaar: 12 digits, PAN: 5L + 4D + 1L, Passport: 1L + 7D
  const idNumber =
    idType === "Aadhaar" ? `${String(100000000000 + i * 137910).slice(0, 4)} ${String(100000000000 + i * 137910).slice(4, 8)} ${String(100000000000 + i * 137910).slice(8, 12)}`
    : idType === "PAN" ? `ABCDE${String(1000 + i * 17).slice(-4)}F`
    : idType === "Passport" ? `${String.fromCharCode(65 + (i % 26))}${String(1000000 + i * 13379).slice(-7)}`
    : `${String(100000000 + i * 13379).slice(-9)}`;
  return {
    id: `g${i + 1}`,
    name,
    phone: `+91 ${String(70000 + i * 1379).slice(-5)} ${String(10000 + i * 7919).slice(-5)}`,
    email: `${name.toLowerCase().replace(/[^a-z]/g, ".")}@example.com`,
    nationality,
    idType,
    idNumber,
    vip: i % 7 === 0,
    blacklist: false,
    lifetimeNights: 3 + (i * 7) % 80,
    lifetimeSpend: 45000 + (i * 13790) % 750000,
    lastStay: `2026-0${(i % 5) + 1}-${String((i * 3) % 28 + 1).padStart(2, "0")}`,
  };
});

export const RESERVATIONS: Reservation[] = ROOMS
  .filter(r => ["occupied", "reserved", "checkout-pending"].includes(r.status) && r.guestName)
  .map((r, i) => {
    const nights = 2 + (i % 5);
    const rate = r.rate;
    const total = rate * nights;
    const advance = r.paymentStatus === "paid" ? total : r.paymentStatus === "partial" ? Math.round(total * 0.3) : 0;
    return {
      id: `res${i + 1}`,
      bookingNo: `BK${String(100245 + i)}`,
      guestName: r.guestName!,
      roomNumber: r.number,
      roomType: r.type,
      source: r.source as BookingSource,
      checkIn: r.checkIn!,
      checkOut: r.checkOut!,
      nights,
      adults: 1 + (i % 3),
      children: i % 4 === 0 ? 1 : 0,
      paymentStatus: r.paymentStatus!,
      ratePlan: (["EP", "CP", "MAP", "AP", "Corporate"] as const)[i % 5],
      total,
      advance,
      balance: total - advance,
      vip: r.vip ?? false,
    };
  });

export const TODAY_ARRIVALS = RESERVATIONS.filter(r => r.paymentStatus !== "paid").slice(0, 7);
export const TODAY_DEPARTURES = RESERVATIONS.slice(-5);

// Indian GST: Room ₹7,501+ → 18% (CGST 9% + SGST 9%) · F&B → 5% · Services (Spa, Laundry) → 18%
export const SAMPLE_FOLIO_CHARGES: FolioCharge[] = [
  // Day 1
  { id: "fc1", date: "2026-05-23", description: "Room — Deluxe (Night 1) · SAC 9963", type: "Room", qty: 1, rate: 8500, tax: 1530, amount: 10030, paidBy: "Guest", created_at: "2026-05-23T08:15:00Z" },
  { id: "fc2", date: "2026-05-23", description: "Breakfast Buffet × 2 · SAC 9963", type: "F&B", qty: 2, rate: 850, tax: 85, amount: 1785, paidBy: "Guest", created_at: "2026-05-23T09:40:00Z" },
  { id: "fc3", date: "2026-05-23", description: "Mini Bar — Bisleri Water", type: "F&B", qty: 2, rate: 120, tax: 12, amount: 252, paidBy: "Guest", created_at: "2026-05-23T20:05:00Z" },
  // Day 2
  { id: "fc4", date: "2026-05-24", description: "Room — Deluxe (Night 2) · SAC 9963", type: "Room", qty: 1, rate: 8500, tax: 1530, amount: 10030, paidBy: "Guest", created_at: "2026-05-24T08:00:00Z" },
  { id: "fc5", date: "2026-05-24", description: "Spa — Couples Massage · SAC 9972", type: "Service", qty: 1, rate: 4500, tax: 810, amount: 5310, paidBy: "Guest", created_at: "2026-05-24T14:30:00Z" },
  { id: "fc6", date: "2026-05-24", description: "Laundry Service · SAC 9987", type: "Service", qty: 1, rate: 650, tax: 117, amount: 767, paidBy: "Guest", created_at: "2026-05-24T11:10:00Z" },
  // Day 3
  { id: "fc7", date: "2026-05-25", description: "Room — Deluxe (Night 3) · SAC 9963", type: "Room", qty: 1, rate: 8500, tax: 1530, amount: 10030, paidBy: "Guest", created_at: "2026-05-25T08:00:00Z" },
  { id: "fc8", date: "2026-05-25", description: "Airport Transfer · SAC 9964", type: "Service", qty: 1, rate: 1500, tax: 270, amount: 1770, paidBy: "Guest", created_at: "2026-05-25T06:45:00Z" },
];

export const SAMPLE_PAYMENTS: FolioPayment[] = [
  { id: "p1", date: "2026-05-23", mode: "UPI", reference: "GPay · txn 240523AB142", amount: 15000 },
  { id: "p2", date: "2026-05-24", mode: "Card", reference: "HDFC ****4421", amount: 8000 },
];

export const DASHBOARD_KPIS = {
  totalRooms: ROOMS.length,
  available: ROOMS.filter(r => r.status === "available" || r.status === "ready").length,
  occupied: ROOMS.filter(r => r.status === "occupied").length,
  reserved: ROOMS.filter(r => r.status === "reserved").length,
  dirty: ROOMS.filter(r => r.status === "dirty").length,
  cleaning: ROOMS.filter(r => r.status === "cleaning").length,
  maintenance: ROOMS.filter(r => r.status === "maintenance").length,
  blocked: ROOMS.filter(r => r.status === "blocked").length,
  checkoutPending: ROOMS.filter(r => r.status === "checkout-pending").length,
  occupancyPct: Math.round((ROOMS.filter(r => r.status === "occupied").length / ROOMS.length) * 100),
  adr: 9420,
  revpar: 6680,
  roomRevenue: 845200,
  hallRevenue: 182000,
  foodRevenue: 213400,
  pendingPayments: 124800,
  advanceReceived: 352000,
  agentOutstanding: 289500,
  corporateOutstanding: 412000,
  todayProfit: 198400,
};

export const REVENUE_TREND = [
  { month: "Dec", room: 620000, food: 142000, hall: 98000 },
  { month: "Jan", room: 710000, food: 161000, hall: 112000 },
  { month: "Feb", room: 780000, food: 178000, hall: 145000 },
  { month: "Mar", room: 820000, food: 193000, hall: 158000 },
  { month: "Apr", room: 865000, food: 204000, hall: 171000 },
  { month: "May", room: 845200, food: 213400, hall: 182000 },
];

export const OCCUPANCY_FORECAST = Array.from({ length: 30 }, (_, i) => ({
  day: `${i + 1}`,
  occupancy: Math.round(55 + Math.sin(i / 4) * 18 + (i % 7 < 2 ? 12 : 0)),
  forecast: Math.round(60 + Math.sin(i / 4) * 20 + (i % 7 < 2 ? 15 : 0)),
}));

export const SOURCE_MIX = [
  { name: "Direct / Walk-in", value: 28 },
  { name: "Website", value: 22 },
  { name: "Booking.com", value: 18 },
  { name: "Agoda", value: 12 },
  { name: "Corporate", value: 11 },
  { name: "Travel Agent", value: 9 },
];

export const ALERTS = [
  { id: "a1", level: "warning" as const, text: "Cash mismatch flagged in Shift #4218 — pending manager review", href: "/cashier" },
  { id: "a2", level: "info"    as const, text: "OTA: Booking.com pushed 3 new reservations",                     href: "/channels" },
  { id: "a3", level: "danger"  as const, text: "Low stock: Bath towels (32 below minimum)",                       href: "/inventory" },
  { id: "a4", level: "warning" as const, text: "Room 402 maintenance overdue (2 days)",                            href: "/maintenance" },
];
