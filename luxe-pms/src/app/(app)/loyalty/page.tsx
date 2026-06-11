"use client";
import * as React from "react";
import {
  Award, Crown, Star, Sparkles, Gift, Users, TrendingUp, TrendingDown,
  Search, Plus, Edit, Eye, X, CheckCircle2, AlertCircle, Calendar, Phone,
  Mail, MessageSquare, BedDouble, Wallet, IndianRupee, Percent, Clock,
  FileDown, Filter, Send, RefreshCw, ChevronRight, Settings, ShieldCheck,
  ScrollText, Cake, Heart, MapPin, Camera, Bell, Printer, Copy,
  ArrowUp, ArrowDown, Trash2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { KPICard } from "@/components/ui/kpi-card";
import { money, cn, formatDate } from "@/lib/utils";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";

// ============================================================
// TYPES & CONSTANTS
// ============================================================
type TierLevel = "Silver" | "Gold" | "Platinum" | "Diamond";
type TxnKind = "Earn" | "Redeem" | "Bonus" | "Adjust" | "Expire";
type RedemptionStatus = "Pending" | "Approved" | "Rejected" | "Applied";

interface Tier {
  id?: string;
  level: TierLevel;
  minSpend: number;
  minNights: number;
  pointsRate: number;           // points per ₹100 spent
  discountPct: number;
  roomUpgrade: "Subject to availability" | "Complimentary" | "None";
  lateCheckout: string;         // time
  earlyCheckin: string;
  freeBreakfast: boolean;
  welcomeDrink: boolean;
  priorityBooking: boolean;
  vipTag: boolean;
  color: string;                // hex / class accent
  perks: string[];
}

interface PointTxn {
  id: string;
  memberId: string;
  date: string;                 // ISO
  kind: TxnKind;
  source: string;               // "Room", "F&B", "Spa", "Bonus", "Redeem", etc.
  bookingNo?: string;
  amount: number;               // positive for earn, negative for redeem/expire
  balance: number;              // running balance after this txn
  staff?: string;
  notes?: string;
  expiresOn?: string;
}

interface LoyaltyMember {
  id: string;
  membershipId: string;
  name: string;
  phone: string;
  email: string;
  dob?: string;
  anniversary?: string;
  address?: string;
  nationality: string;
  idType: string;
  idNumber: string;
  joinedAt: string;
  tier: TierLevel;
  pointsBalance: number;
  lifetimePoints: number;
  lifetimeStays: number;
  lifetimeNights: number;
  lifetimeSpend: number;
  lastStayDate?: string;
  upcomingBooking?: { bookingNo: string; date: string };
  preferences: string[];
  staffNotes?: string;
  consentMarketing: boolean;
  blocked?: boolean;
}

interface Reward {
  id: string;
  name: string;
  category: "Stay" | "F&B" | "Spa" | "Service" | "Voucher" | "Upgrade";
  pointsCost: number;
  cashValue: number;
  description: string;
  minTier: TierLevel;
  active: boolean;
  icon: string;
}

interface Campaign {
  id: string;
  name: string;
  type: "Discount" | "Bonus Points" | "Free Night" | "Upgrade" | "BOGO";
  description: string;
  validFrom: string;
  validTo: string;
  applicableTiers: TierLevel[];
  applicableRoomTypes: string[];
  minBookingAmount: number;
  rewardValue: string;
  active: boolean;
  redemptions: number;
}

interface Redemption {
  id: string;
  date: string;
  memberId: string;
  memberName: string;
  rewardId: string;
  rewardName: string;
  pointsUsed: number;
  bookingNo?: string;
  status: RedemptionStatus;
  staff: string;
  approver?: string;
  notes?: string;
}

interface AuditEntry {
  id: string;
  at: string;
  actor: string;
  action: string;
  target: string;
  detail: string;
  ip?: string;
}

interface EarningRule {
  id: string;
  source: string;
  multiplier: number;           // factor on tier rate (1 = full, 0.5 = half, 1.5 = 1.5x)
  enabled: boolean;
  notes?: string;
}

interface ProgramSettings {
  name: string;
  pointsValueRupees: number;    // 1 point = X rupees redemption value
  pointsExpiryMonths: number;
  taxBeforeDiscount: boolean;
  approvalRequiredAbove: number;
  manualAdjustNeedsApproval: boolean;
  redemptionOtp: boolean;
}

// ============================================================
// TIER PRESETS
// ============================================================
const TIERS: Tier[] = [
  {
    level: "Silver", minSpend: 0, minNights: 0, pointsRate: 1, discountPct: 0,
    roomUpgrade: "None", lateCheckout: "Standard 11 AM", earlyCheckin: "Standard 12 PM",
    freeBreakfast: false, welcomeDrink: true, priorityBooking: false, vipTag: false,
    color: "#94a3b8",
    perks: ["Welcome drink on arrival", "1 point per ₹100 spent", "Member-only newsletter"],
  },
  {
    level: "Gold", minSpend: 50000, minNights: 5, pointsRate: 1.5, discountPct: 5,
    roomUpgrade: "Subject to availability", lateCheckout: "1 PM", earlyCheckin: "10 AM",
    freeBreakfast: false, welcomeDrink: true, priorityBooking: false, vipTag: false,
    color: "#d4af37",
    perks: ["Subject-to-availability room upgrade", "1 PM late checkout", "5% off F&B", "Welcome amenity"],
  },
  {
    level: "Platinum", minSpend: 200000, minNights: 15, pointsRate: 2, discountPct: 10,
    roomUpgrade: "Subject to availability", lateCheckout: "4 PM", earlyCheckin: "8 AM",
    freeBreakfast: true, welcomeDrink: true, priorityBooking: true, vipTag: true,
    color: "#9333ea",
    perks: ["Complimentary breakfast for 2", "4 PM late checkout", "Suite upgrade subject to availability", "10% off spa & F&B", "Priority reservation queue"],
  },
  {
    level: "Diamond", minSpend: 500000, minNights: 30, pointsRate: 3, discountPct: 15,
    roomUpgrade: "Complimentary", lateCheckout: "6 PM", earlyCheckin: "Guaranteed",
    freeBreakfast: true, welcomeDrink: true, priorityBooking: true, vipTag: true,
    color: "#06b6d4",
    perks: ["Complimentary room upgrade (1 cat.)", "Guaranteed early check-in", "6 PM late checkout", "Free breakfast & welcome dinner", "Dedicated concierge line", "Anniversary night every year", "15% off everything"],
  },
];

const TIER_TONE: Record<TierLevel, "neutral" | "accent" | "brand" | "info"> = {
  Silver: "neutral", Gold: "accent", Platinum: "brand", Diamond: "info",
};

const TIER_BG: Record<TierLevel, string> = {
  Silver:   "bg-linear-to-br from-slate-300 to-slate-500 text-white",
  Gold:     "bg-linear-to-br from-amber-300 to-amber-600 text-white",
  Platinum: "bg-linear-to-br from-purple-400 to-purple-700 text-white",
  Diamond:  "bg-linear-to-br from-cyan-300 via-sky-400 to-blue-700 text-white",
};

// ============================================================
// SEED DATA
// ============================================================
const SEED_MEMBERS: LoyaltyMember[] = [
  { id: "lm1", membershipId: "LM-2023-1001", name: "Sanjana Reddy", phone: "+91 98201 12345", email: "sanjana.reddy@example.com", dob: "1985-08-12", anniversary: "2010-12-04", address: "Banjara Hills, Hyderabad", nationality: "India", idType: "Aadhaar", idNumber: "5621 8923 4156", joinedAt: "2023-03-14", tier: "Diamond", pointsBalance: 18420, lifetimePoints: 142000, lifetimeStays: 24, lifetimeNights: 56, lifetimeSpend: 685000, lastStayDate: "2026-05-08", upcomingBooking: { bookingNo: "BK100258", date: "2026-06-12" }, preferences: ["High floor", "Sea view", "Welcome champagne", "Vegetarian breakfast"], staffNotes: "Brand ambassador potential · always brings family + extended group", consentMarketing: true },
  { id: "lm2", membershipId: "LM-2023-1042", name: "Anjali Iyer", phone: "+91 99876 54321", email: "anjali.iyer@example.com", dob: "1988-06-01", anniversary: "2015-02-14", address: "Bandra West, Mumbai", nationality: "India", idType: "Aadhaar", idNumber: "8841 3324 7821", joinedAt: "2023-08-20", tier: "Platinum", pointsBalance: 8200, lifetimePoints: 56800, lifetimeStays: 14, lifetimeNights: 31, lifetimeSpend: 312000, lastStayDate: "2026-05-18", preferences: ["Quiet room", "Welcome drink"], staffNotes: "Prefers late checkout · usually requests 1pm", consentMarketing: true },
  { id: "lm3", membershipId: "LM-2024-2118", name: "Sarah Whitfield", phone: "+91 97412 33212", email: "sarah.whitfield@example.com", dob: "1990-11-22", address: "London (UK) · visiting Mumbai monthly", nationality: "UK", idType: "Passport", idNumber: "GB7723041", joinedAt: "2024-01-12", tier: "Platinum", pointsBalance: 6480, lifetimePoints: 42000, lifetimeStays: 11, lifetimeNights: 22, lifetimeSpend: 234000, lastStayDate: "2026-05-12", upcomingBooking: { bookingNo: "BK100231", date: "2026-06-04" }, preferences: ["Twin bed", "Vegan menu"], consentMarketing: true },
  { id: "lm4", membershipId: "LM-2024-2350", name: "Karan Mehta", phone: "+91 98765 43210", email: "karan.mehta@example.com", dob: "1992-04-18", anniversary: "2019-11-09", address: "Andheri East, Mumbai", nationality: "India", idType: "Aadhaar", idNumber: "3389 2210 6645", joinedAt: "2024-03-22", tier: "Gold", pointsBalance: 4200, lifetimePoints: 18200, lifetimeStays: 8, lifetimeNights: 16, lifetimeSpend: 96400, lastStayDate: "2026-04-21", preferences: ["Anniversary cake", "Jacuzzi suite"], consentMarketing: true },
  { id: "lm5", membershipId: "LM-2024-2412", name: "Vikram Singh", phone: "+91 99877 12340", email: "vikram.singh@example.com", dob: "1980-09-30", address: "Delhi", nationality: "India", idType: "Aadhaar", idNumber: "1129 8862 3340", joinedAt: "2024-05-18", tier: "Gold", pointsBalance: 3800, lifetimePoints: 14500, lifetimeStays: 7, lifetimeNights: 14, lifetimeSpend: 78400, lastStayDate: "2026-04-02", preferences: ["Non-smoking", "Veg meal"], consentMarketing: false },
  { id: "lm6", membershipId: "LM-2024-2588", name: "Mr. Ahmed Al-Mansoori", phone: "+971 50 123 4567", email: "ahmed.almansoori@example.ae", dob: "1975-02-25", address: "Dubai (UAE)", nationality: "UAE", idType: "Emirates ID", idNumber: "784-1975-1234567-8", joinedAt: "2024-07-08", tier: "Gold", pointsBalance: 5240, lifetimePoints: 16800, lifetimeStays: 6, lifetimeNights: 18, lifetimeSpend: 84000, lastStayDate: "2026-05-22", preferences: ["Hypoallergenic pillow", "Halal meal"], consentMarketing: true },
  { id: "lm7", membershipId: "LM-2025-3010", name: "Priya Sharma", phone: "+91 99001 22334", email: "priya.sharma@example.com", dob: "1995-06-01", address: "Pune", nationality: "India", idType: "Aadhaar", idNumber: "6601 2241 9982", joinedAt: "2025-01-15", tier: "Silver", pointsBalance: 1840, lifetimePoints: 4200, lifetimeStays: 4, lifetimeNights: 7, lifetimeSpend: 28400, lastStayDate: "2026-05-04", preferences: ["Welcome drink"], consentMarketing: true },
  { id: "lm8", membershipId: "LM-2025-3142", name: "Rohan Joshi", phone: "+91 89765 11220", email: "rohan.joshi@example.com", dob: "1993-12-15", address: "Bengaluru", nationality: "India", idType: "PAN", idNumber: "ABKPJ8821H", joinedAt: "2025-04-08", tier: "Silver", pointsBalance: 1200, lifetimePoints: 2800, lifetimeStays: 3, lifetimeNights: 6, lifetimeSpend: 22400, lastStayDate: "2026-04-30", preferences: ["High floor"], consentMarketing: true },
  { id: "lm9", membershipId: "LM-2025-3290", name: "Liu Wei", phone: "+86 138 1234 5678", email: "liu.wei@example.cn", dob: "1987-03-10", address: "Shanghai (CN)", nationality: "China", idType: "Passport", idNumber: "E12345678", joinedAt: "2025-06-22", tier: "Silver", pointsBalance: 980, lifetimePoints: 2100, lifetimeStays: 3, lifetimeNights: 5, lifetimeSpend: 18900, lastStayDate: "2026-05-18", preferences: ["Twin bed"], consentMarketing: false },
  { id: "lm10", membershipId: "LM-2025-3414", name: "Kavya Nair", phone: "+91 99224 88110", email: "kavya.nair@example.com", dob: "1991-09-04", anniversary: "2018-01-19", address: "Kochi, Kerala", nationality: "India", idType: "Aadhaar", idNumber: "4421 5519 8870", joinedAt: "2025-09-04", tier: "Silver", pointsBalance: 620, lifetimePoints: 1100, lifetimeStays: 2, lifetimeNights: 3, lifetimeSpend: 12600, lastStayDate: "2026-04-12", preferences: [], consentMarketing: true },
];

const SEED_REWARDS: Reward[] = [
  { id: "rw1", name: "₹500 room discount",     category: "Stay",    pointsCost: 1000, cashValue: 500,   description: "Instant ₹500 off any room booking",                       minTier: "Silver",  active: true, icon: "🏨" },
  { id: "rw2", name: "Free breakfast for 2",   category: "F&B",     pointsCost: 800,  cashValue: 1200,  description: "Buffet breakfast for 2 guests · valid 1 night",            minTier: "Silver",  active: true, icon: "🥐" },
  { id: "rw3", name: "Spa discount 20%",       category: "Spa",     pointsCost: 600,  cashValue: 1000,  description: "20% off any spa treatment · single use",                   minTier: "Silver",  active: true, icon: "💆" },
  { id: "rw4", name: "Late checkout till 4 PM",category: "Service", pointsCost: 500,  cashValue: 750,   description: "Extend checkout to 4 PM · subject to availability",        minTier: "Silver",  active: true, icon: "🕓" },
  { id: "rw5", name: "Room upgrade (1 cat.)",  category: "Upgrade", pointsCost: 2000, cashValue: 4500,  description: "Upgrade one category · subject to availability",            minTier: "Gold",    active: true, icon: "⬆️" },
  { id: "rw6", name: "Airport pickup",         category: "Service", pointsCost: 1500, cashValue: 1800,  description: "Sedan airport pickup or drop · within 25 km",              minTier: "Gold",    active: true, icon: "🚗" },
  { id: "rw7", name: "Free night (base)",      category: "Stay",    pointsCost: 5000, cashValue: 8500,  description: "1 complimentary night · base category · BBD basis",        minTier: "Platinum",active: true, icon: "🎁" },
  { id: "rw8", name: "₹1000 gift voucher",     category: "Voucher", pointsCost: 2000, cashValue: 1000,  description: "Hotel gift voucher · transferable",                        minTier: "Gold",    active: true, icon: "🎟️" },
];

const SEED_CAMPAIGNS: Campaign[] = [
  { id: "cp1", name: "Diwali Stay & Save", type: "Discount", description: "20% off + 2× points for Diwali week", validFrom: "2026-10-25", validTo: "2026-11-05", applicableTiers: ["Silver", "Gold", "Platinum", "Diamond"], applicableRoomTypes: ["All"], minBookingAmount: 5000, rewardValue: "20% off + 2× points", active: true, redemptions: 0 },
  { id: "cp2", name: "Birthday Month Bonus", type: "Bonus Points", description: "Members get 500 bonus points + complimentary upgrade in their birthday month", validFrom: "2026-01-01", validTo: "2026-12-31", applicableTiers: ["Silver", "Gold", "Platinum", "Diamond"], applicableRoomTypes: ["All"], minBookingAmount: 0, rewardValue: "+500 points · free upgrade", active: true, redemptions: 12 },
  { id: "cp3", name: "Direct Booking Bonus", type: "Bonus Points", description: "30% extra points when booking via hotel website or front desk (no OTA)", validFrom: "2026-04-01", validTo: "2026-12-31", applicableTiers: ["Silver", "Gold", "Platinum", "Diamond"], applicableRoomTypes: ["All"], minBookingAmount: 3000, rewardValue: "+30% earning rate", active: true, redemptions: 47 },
  { id: "cp4", name: "Stay 3 Nights, Get 1 Free", type: "Free Night", description: "Pay for 3, stay 4 (cheapest night free) · Sun-Thu only", validFrom: "2026-06-01", validTo: "2026-09-30", applicableTiers: ["Gold", "Platinum", "Diamond"], applicableRoomTypes: ["Deluxe", "Suite"], minBookingAmount: 12000, rewardValue: "4th night free", active: true, redemptions: 8 },
  { id: "cp5", name: "Weekend Getaway · Platinum+", type: "Discount", description: "Platinum & Diamond exclusive · 25% off weekend Suite rates", validFrom: "2026-05-01", validTo: "2026-12-31", applicableTiers: ["Platinum", "Diamond"], applicableRoomTypes: ["Suite", "Presidential"], minBookingAmount: 0, rewardValue: "25% off Sat-Sun", active: true, redemptions: 14 },
  { id: "cp6", name: "Refer a Friend", type: "Bonus Points", description: "1000 points for both members when referred friend completes first paid stay", validFrom: "2026-01-01", validTo: "2026-12-31", applicableTiers: ["Silver", "Gold", "Platinum", "Diamond"], applicableRoomTypes: ["All"], minBookingAmount: 0, rewardValue: "+1000 / referrer & referee", active: true, redemptions: 22 },
];

const SEED_EARNING_RULES: EarningRule[] = [
  { id: "er1", source: "Room booking",       multiplier: 1,    enabled: true,  notes: "Full tier rate × room subtotal" },
  { id: "er2", source: "F&B (restaurant)",   multiplier: 0.5,  enabled: true,  notes: "Half rate · charged to folio" },
  { id: "er3", source: "Spa & wellness",     multiplier: 1,    enabled: true,  notes: "Full rate · folio-charged" },
  { id: "er4", source: "Laundry",            multiplier: 0.5,  enabled: true },
  { id: "er5", source: "Banquet booking",    multiplier: 1,    enabled: true,  notes: "Halls & events" },
  { id: "er6", source: "Direct booking bonus", multiplier: 1.3, enabled: true, notes: "+30% on direct bookings" },
  { id: "er7", source: "Website booking bonus", multiplier: 1.1, enabled: true, notes: "+10% via website widget" },
  { id: "er8", source: "Walk-in",            multiplier: 1,    enabled: true },
  { id: "er9", source: "OTA booking",        multiplier: 0.5,  enabled: true,  notes: "Reduced earning · OTA commission paid" },
  { id: "er10", source: "Corporate booking", multiplier: 0.75, enabled: true,  notes: "If corporate rate plan" },
  { id: "er11", source: "Travel agent",      multiplier: 0.5,  enabled: true },
  { id: "er12", source: "Referral bonus",    multiplier: 0,    enabled: true,  notes: "Fixed: +1000 points each side" },
  { id: "er13", source: "Birthday bonus",    multiplier: 0,    enabled: true,  notes: "Fixed: +500 in birthday month" },
  { id: "er14", source: "Anniversary bonus", multiplier: 0,    enabled: true,  notes: "Fixed: +500 in anniversary month" },
];

const SEED_TXNS: PointTxn[] = [
  { id: "t1", memberId: "lm1", date: "2026-05-08", kind: "Earn", source: "Room (BK100210)", bookingNo: "BK100210", amount: 1840, balance: 18420, staff: "Khalid R.", expiresOn: "2028-05-08" },
  { id: "t2", memberId: "lm2", date: "2026-05-18", kind: "Earn", source: "Room + F&B", bookingNo: "BK100225", amount: 1240, balance: 8200, staff: "Khalid R.", expiresOn: "2028-05-18" },
  { id: "t3", memberId: "lm3", date: "2026-05-12", kind: "Earn", source: "Room", bookingNo: "BK100221", amount: 980, balance: 6480, staff: "Khalid R.", expiresOn: "2028-05-12" },
  { id: "t4", memberId: "lm4", date: "2026-04-21", kind: "Earn", source: "Room + Spa", bookingNo: "BK100188", amount: 720, balance: 4200, staff: "Khalid R.", expiresOn: "2028-04-21" },
  { id: "t5", memberId: "lm1", date: "2026-05-08", kind: "Redeem", source: "Free breakfast × 2", amount: -800, balance: 16580, staff: "Tom W.", notes: "Applied at folio settlement" },
  { id: "t6", memberId: "lm2", date: "2026-04-12", kind: "Bonus", source: "Birthday month", amount: 500, balance: 6960, staff: "System" },
  { id: "t7", memberId: "lm7", date: "2026-05-04", kind: "Earn", source: "Room", bookingNo: "BK100195", amount: 280, balance: 1840, staff: "Khalid R.", expiresOn: "2028-05-04" },
  { id: "t8", memberId: "lm6", date: "2026-05-22", kind: "Earn", source: "Room (Suite)", bookingNo: "BK100242", amount: 1620, balance: 5240, staff: "Khalid R.", expiresOn: "2028-05-22" },
];

const SEED_REDEMPTIONS: Redemption[] = [
  { id: "rd1", date: "2026-05-08", memberId: "lm1", memberName: "Sanjana Reddy",  rewardId: "rw2", rewardName: "Free breakfast for 2",   pointsUsed: 800, bookingNo: "BK100210", status: "Applied",   staff: "Khalid R.", approver: "Tom W.", notes: "Auto-approved · Diamond tier" },
  { id: "rd2", date: "2026-05-12", memberId: "lm3", memberName: "Sarah Whitfield",rewardId: "rw4", rewardName: "Late checkout till 4 PM",pointsUsed: 500, bookingNo: "BK100221", status: "Applied",   staff: "Khalid R." },
  { id: "rd3", date: "2026-05-22", memberId: "lm6", memberName: "Mr. Ahmed Al-Mansoori", rewardId: "rw6", rewardName: "Airport pickup",  pointsUsed: 1500, bookingNo: "BK100242", status: "Pending",  staff: "Priya M.", notes: "Awaiting concierge confirmation" },
  { id: "rd4", date: "2026-05-23", memberId: "lm4", memberName: "Karan Mehta",   rewardId: "rw8", rewardName: "₹1000 gift voucher",     pointsUsed: 2000, status: "Pending",   staff: "Khalid R.", notes: "Manager approval needed" },
  { id: "rd5", date: "2026-04-30", memberId: "lm8", memberName: "Rohan Joshi",   rewardId: "rw3", rewardName: "Spa discount 20%",       pointsUsed: 600, bookingNo: "BK100199", status: "Applied",   staff: "Khalid R." },
];

const SEED_AUDIT: AuditEntry[] = [
  { id: "a1", at: "Today 13:42",   actor: "Khalid R.", action: "Approved redemption", target: "RD-rd5 · Rohan Joshi",       detail: "600 points for Spa discount 20%", ip: "10.0.0.12" },
  { id: "a2", at: "Today 11:18",   actor: "Tom W.",    action: "Adjusted points",     target: "LM-2024-2588 · Ahmed",        detail: "+250 manual adjustment · loyalty event", ip: "10.0.0.21" },
  { id: "a3", at: "Today 09:30",   actor: "System",    action: "Tier upgraded",       target: "LM-2024-2118 · Sarah",       detail: "Gold → Platinum · crossed ₹2L spend" },
  { id: "a4", at: "Yesterday",     actor: "Anjali S.", action: "Created campaign",    target: "CP-cp1 · Diwali Stay & Save", detail: "20% off + 2× points · 25 Oct – 5 Nov" },
  { id: "a5", at: "Yesterday",     actor: "System",    action: "Points expired",      target: "LM-2024-2412 · Vikram",       detail: "-340 points expired (2-year window)" },
  { id: "a6", at: "23 May",        actor: "Khalid R.", action: "New member added",    target: "LM-2025-3414 · Kavya Nair",   detail: "Walk-in registration via front desk", ip: "10.0.0.12" },
  { id: "a7", at: "23 May",        actor: "System",    action: "Birthday bonus",      target: "LM-2023-1042 · Anjali Iyer",  detail: "+500 birthday month bonus auto-credited" },
];

const SEED_SETTINGS: ProgramSettings = {
  name: "Pearl Privileges",
  pointsValueRupees: 0.5,        // 1 pt = ₹0.50 redemption value
  pointsExpiryMonths: 24,
  taxBeforeDiscount: false,
  approvalRequiredAbove: 2000,
  manualAdjustNeedsApproval: true,
  redemptionOtp: false,
};

// ============================================================
// TAB DEFS
// ============================================================
const TABS = [
  { id: "dashboard",   label: "Dashboard",      icon: TrendingUp },
  { id: "members",     label: "Members",        icon: Users },
  { id: "tiers",       label: "Tiers & Rules",  icon: Crown },
  { id: "rewards",     label: "Rewards",        icon: Gift },
  { id: "campaigns",   label: "Campaigns",      icon: Sparkles },
  { id: "redemptions", label: "Redemptions",    icon: Award },
  { id: "reports",     label: "Reports",        icon: FileDown },
  { id: "audit",       label: "Audit Log",      icon: ScrollText },
  { id: "settings",    label: "Settings",       icon: Settings },
] as const;
type TabId = typeof TABS[number]["id"];

// ============================================================
// MAIN PAGE
// ============================================================
export default function LoyaltyPage() {
  const [tab, setTab] = React.useState<TabId>("dashboard");

  // State
  const [members, setMembers] = React.useState<LoyaltyMember[]>([]);
  React.useEffect(() => {
    apiGet<LoyaltyMember[]>("/loyalty-members")
      .then(rows => setMembers(rows.map(r => ({ ...r, id: String(r.id), preferences: r.preferences ?? [] }))))
      .catch(() => {});
  }, []);
  const [tiers, setTiers] = React.useState<Tier[]>(TIERS);
  const [rewards, setRewards] = React.useState<Reward[]>(SEED_REWARDS);
  const [campaigns, setCampaigns] = React.useState<Campaign[]>(SEED_CAMPAIGNS);
  React.useEffect(() => {
    apiGet<Tier[]>("/loyalty-tiers").then(r => { if (r.length) setTiers(r.map(t => ({ ...t, id: String(t.id), perks: t.perks ?? [] }))); }).catch(() => {});
    apiGet<Reward[]>("/loyalty-rewards").then(r => { if (r.length) setRewards(r.map(x => ({ ...x, id: String(x.id) }))); }).catch(() => {});
    apiGet<Campaign[]>("/loyalty-campaigns").then(r => { if (r.length) setCampaigns(r.map(c => ({ ...c, id: String(c.id), applicableTiers: c.applicableTiers ?? [], applicableRoomTypes: c.applicableRoomTypes ?? [] }))); }).catch(() => {});
  }, []);
  const [redemptions, setRedemptions] = React.useState<Redemption[]>(SEED_REDEMPTIONS);
  const [txns, setTxns] = React.useState<PointTxn[]>(SEED_TXNS);
  const [audit] = React.useState<AuditEntry[]>(SEED_AUDIT);
  const [earningRules, setEarningRules] = React.useState<EarningRule[]>(SEED_EARNING_RULES);
  const [settings, setSettings] = React.useState<ProgramSettings>(SEED_SETTINGS);
  React.useEffect(() => {
    apiGet<Redemption[]>("/loyalty-redemptions").then(r => { if (r.length) setRedemptions(r.map(x => ({ ...x, id: String(x.id) }))); }).catch(() => {});
    apiGet<PointTxn[]>("/loyalty-transactions").then(r => { if (r.length) setTxns(r.map(x => ({ ...x, id: String(x.id), memberId: String(x.memberId) }))); }).catch(() => {});
    apiGet<EarningRule[]>("/loyalty-earning-rules").then(r => { if (r.length) setEarningRules(r.map(x => ({ ...x, id: String(x.id) }))); }).catch(() => {});
    apiGet<ProgramSettings[]>("/loyalty-settings").then(r => { if (r.length) setSettings(r[0]); }).catch(() => {});
  }, []);

  // Modals
  const [addMember, setAddMember] = React.useState(false);
  const [memberDetail, setMemberDetail] = React.useState<LoyaltyMember | null>(null);
  const [adjustPoints, setAdjustPoints] = React.useState<LoyaltyMember | null>(null);
  const [editTier, setEditTier] = React.useState<Tier | null>(null);
  const [editReward, setEditReward] = React.useState<Reward | "new" | null>(null);
  const [editCampaign, setEditCampaign] = React.useState<Campaign | "new" | null>(null);

  const [toast, setToast] = React.useState<string | null>(null);
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-medium tracking-tight inline-flex items-center gap-2">
            <Award className="h-6 w-6 text-brand" />{settings.name}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {members.length} active members · {members.reduce((t, m) => t + m.lifetimePoints, 0).toLocaleString("en-IN")} lifetime points · 4-tier program
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => showToast("Member registry exported as CSV")}>
            <FileDown className="h-4 w-4" />Export
          </Button>
          <Button onClick={() => setAddMember(true)}>
            <Plus className="h-4 w-4" />Add member
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border flex items-center gap-1 overflow-x-auto">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap inline-flex items-center gap-2",
              tab === t.id ? "border-brand text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            )}>
              <Icon className="h-3.5 w-3.5" />{t.label}
            </button>
          );
        })}
      </div>

      {tab === "dashboard"   && <DashboardTab members={members} redemptions={redemptions} txns={txns} onOpenMember={setMemberDetail} />}
      {tab === "members"     && <MembersTab members={members} onOpenMember={setMemberDetail} onAdjustPoints={setAdjustPoints} />}
      {tab === "tiers"       && <TiersTab tiers={tiers} earningRules={earningRules} settings={settings} onEditTier={setEditTier} onUpdateRule={(id, patch) => { setEarningRules(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r)); apiPut(`/loyalty-earning-rules/${id}`, patch).catch(() => {}); }} onUpdateSettings={setSettings} onToast={showToast} />}
      {tab === "rewards"     && <RewardsTab rewards={rewards} settings={settings} onEdit={setEditReward} onToggle={(id) => { const cur = rewards.find(r => r.id === id); const active = !cur?.active; setRewards(prev => prev.map(r => r.id === id ? { ...r, active } : r)); apiPut(`/loyalty-rewards/${id}`, { active }).catch(() => showToast("Could not save")); }} onDelete={(id) => { setRewards(prev => prev.filter(r => r.id !== id)); apiDelete(`/loyalty-rewards/${id}`).catch(() => showToast("Could not delete")); showToast("Reward removed"); }} />}
      {tab === "campaigns"   && <CampaignsTab campaigns={campaigns} onEdit={setEditCampaign} onToggle={(id) => { const cur = campaigns.find(c => c.id === id); const active = !cur?.active; setCampaigns(prev => prev.map(c => c.id === id ? { ...c, active } : c)); apiPut(`/loyalty-campaigns/${id}`, { active }).catch(() => showToast("Could not save")); }} onDelete={(id) => { setCampaigns(prev => prev.filter(c => c.id !== id)); apiDelete(`/loyalty-campaigns/${id}`).catch(() => showToast("Could not delete")); showToast("Campaign removed"); }} />}
      {tab === "redemptions" && <RedemptionsTab redemptions={redemptions} onApprove={(id) => { setRedemptions(prev => prev.map(r => r.id === id ? { ...r, status: "Approved" as const, approver: "Tom W." } : r)); apiPut(`/loyalty-redemptions/${id}`, { status: "Approved", approver: "Tom W." }).catch(() => showToast("Could not save")); showToast("Redemption approved"); }} onReject={(id) => { setRedemptions(prev => prev.map(r => r.id === id ? { ...r, status: "Rejected" as const } : r)); apiPut(`/loyalty-redemptions/${id}`, { status: "Rejected" }).catch(() => showToast("Could not save")); showToast("Redemption rejected"); }} />}
      {tab === "reports"     && <ReportsTab members={members} redemptions={redemptions} campaigns={campaigns} onToast={showToast} />}
      {tab === "audit"       && <AuditTab entries={audit} />}
      {tab === "settings"    && <SettingsTab settings={settings} onChange={setSettings} onSave={(s) => apiPut("/loyalty-settings/1", s).catch(() => {})} onToast={showToast} />}

      {/* Modals */}
      {addMember && <AddMemberModal onClose={() => setAddMember(false)} onSave={(m) => {
        const membershipId = `LM-${new Date().getFullYear()}-${(members.length + 1100).toString().slice(-4)}`;
        const draft = { ...m, membershipId, joinedAt: new Date().toISOString().slice(0, 10), tier: "Silver" as TierLevel, pointsBalance: 500, lifetimePoints: 500, lifetimeStays: 0, lifetimeNights: 0, lifetimeSpend: 0, preferences: [] };
        apiPost<LoyaltyMember>("/loyalty-members", draft)
          .then(row => setMembers(prev => [{ ...row, id: String(row.id), preferences: row.preferences ?? [] }, ...prev]))
          .catch(() => showToast("Could not save member"));
        setAddMember(false);
        showToast(`Welcome ${m.name} · ${membershipId} · +500 joining bonus`);
      }} />}
      {memberDetail && <MemberDetailDrawer member={memberDetail} txns={txns.filter(t => t.memberId === memberDetail.id)} tier={tiers.find(t => t.level === memberDetail.tier)!} onClose={() => setMemberDetail(null)} onAdjust={() => { setAdjustPoints(memberDetail); setMemberDetail(null); }} onToast={showToast} />}
      {adjustPoints && <AdjustPointsModal member={adjustPoints} settings={settings} onClose={() => setAdjustPoints(null)} onSave={(delta, reason) => {
        const next = { pointsBalance: Math.max(0, adjustPoints.pointsBalance + delta), lifetimePoints: delta > 0 ? adjustPoints.lifetimePoints + delta : adjustPoints.lifetimePoints };
        setMembers(prev => prev.map(m => m.id === adjustPoints.id ? { ...m, ...next } : m));
        apiPut(`/loyalty-members/${adjustPoints.id}`, next).catch(() => showToast("Could not save points"));
        setAdjustPoints(null);
        showToast(`${adjustPoints.name}: ${delta > 0 ? "+" : ""}${delta} points · ${reason}`);
      }} />}
      {editTier && <TierEditModal tier={editTier} onClose={() => setEditTier(null)} onSave={(t) => { setTiers(prev => prev.map(x => x.level === t.level ? { ...t, id: x.id } : x)); if (editTier.id) apiPut(`/loyalty-tiers/${editTier.id}`, t).catch(() => showToast("Could not save")); setEditTier(null); showToast(`${t.level} tier updated`); }} />}
      {editReward && <RewardEditModal reward={editReward === "new" ? null : editReward} onClose={() => setEditReward(null)} onSave={(r) => {
        if (editReward === "new") apiPost<Reward>("/loyalty-rewards", r).then(row => setRewards(prev => [{ ...row, id: String(row.id) }, ...prev])).catch(() => showToast("Could not save reward"));
        else { const id = (editReward as Reward).id; setRewards(prev => prev.map(x => x.id === id ? { ...r, id } : x)); apiPut(`/loyalty-rewards/${id}`, r).catch(() => showToast("Could not save")); }
        setEditReward(null);
        showToast(editReward === "new" ? `Reward "${r.name}" created` : `Reward "${r.name}" updated`);
      }} />}
      {editCampaign && <CampaignEditModal campaign={editCampaign === "new" ? null : editCampaign} onClose={() => setEditCampaign(null)} onSave={(c) => {
        if (editCampaign === "new") apiPost<Campaign>("/loyalty-campaigns", { ...c, redemptions: 0 }).then(row => setCampaigns(prev => [{ ...row, id: String(row.id), applicableTiers: row.applicableTiers ?? [], applicableRoomTypes: row.applicableRoomTypes ?? [] }, ...prev])).catch(() => showToast("Could not save campaign"));
        else { const ex = editCampaign as Campaign; setCampaigns(prev => prev.map(x => x.id === ex.id ? { ...c, id: ex.id, redemptions: ex.redemptions } : x)); apiPut(`/loyalty-campaigns/${ex.id}`, { ...c, redemptions: ex.redemptions }).catch(() => showToast("Could not save")); }
        setEditCampaign(null);
        showToast(editCampaign === "new" ? `Campaign "${c.name}" launched` : `Campaign "${c.name}" updated`);
      }} />}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-foreground text-background rounded-lg px-4 py-3 text-sm shadow-2xl animate-in slide-in-from-bottom-2 inline-flex items-center gap-2.5 ring-1 ring-foreground/20">
          <CheckCircle2 className="h-3.5 w-3.5" />{toast}
        </div>
      )}
    </div>
  );
}

// ============================================================
// DASHBOARD TAB
// ============================================================
function DashboardTab({ members, redemptions, txns, onOpenMember }: {
  members: LoyaltyMember[];
  redemptions: Redemption[];
  txns: PointTxn[];
  onOpenMember: (m: LoyaltyMember) => void;
}) {
  const tierBreakdown = (["Silver", "Gold", "Platinum", "Diamond"] as TierLevel[]).map(t => ({
    tier: t, count: members.filter(m => m.tier === t).length, color: TIERS.find(x => x.level === t)!.color,
  }));
  const totalPointsIssued = members.reduce((t, m) => t + m.lifetimePoints, 0);
  const totalPointsRedeemed = txns.filter(t => t.kind === "Redeem").reduce((t, x) => t + Math.abs(x.amount), 0);
  const expiringPoints = Math.round(totalPointsIssued * 0.04); // mock
  const totalLoyaltyRevenue = members.reduce((t, m) => t + m.lifetimeSpend, 0);
  const newThisMonth = members.filter(m => m.joinedAt >= "2026-05-01").length;
  const activeMembers = members.filter(m => m.lastStayDate && m.lastStayDate >= "2026-02-01").length;
  const repeatGuests = members.filter(m => m.lifetimeStays >= 2).length;
  const repeatPct = Math.round((repeatGuests / members.length) * 100);

  const topGuests = [...members].sort((a, b) => b.lifetimeSpend - a.lifetimeSpend).slice(0, 5);

  return (
    <div className="space-y-5">
      {/* Hero KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard label="Total members"      value={members.length}        icon={Users}      accent="brand"   />
        <KPICard label="New this month"     value={newThisMonth}          icon={Plus}       accent="success" />
        <KPICard label="Active (last 90d)"  value={activeMembers}         icon={TrendingUp} accent="info"    hint={`${Math.round(activeMembers / members.length * 100)}%`} />
        <KPICard label="Points issued"      value={totalPointsIssued.toLocaleString("en-IN")} icon={Star} accent="accent" hint="lifetime" />
        <KPICard label="Points redeemed"    value={totalPointsRedeemed.toLocaleString("en-IN")} icon={Gift} accent="success" hint={`${Math.round(totalPointsRedeemed / totalPointsIssued * 100)}%`} />
        <KPICard label="Expiring soon"      value={expiringPoints.toLocaleString("en-IN")} icon={Clock} accent={expiringPoints > 0 ? "warning" : "success"} hint="30 days" />
      </div>

      {/* At-risk insight */}
      <Card className="p-3 bg-warning-soft/15 border-warning/30 flex items-center gap-2.5 flex-wrap">
        <TrendingDown className="h-4 w-4 text-warning shrink-0" />
        <p className="text-xs flex-1">
          <strong>Churn watch:</strong> {members.filter(m => m.lastStayDate && m.lastStayDate < "2026-02-01").length} members have not stayed in 90+ days.
        </p>
        <Badge tone="warning"><Percent className="h-2.5 w-2.5" />{Math.round(members.filter(m => m.lastStayDate && m.lastStayDate < "2026-02-01").length / members.length * 100)}% at risk</Badge>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Tier breakdown */}
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Membership tier distribution</p>
              <p className="font-semibold mt-0.5 inline-flex items-center gap-1.5"><Crown className="h-4 w-4 text-brand" />4-tier program</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {tierBreakdown.map(t => {
              const tier = TIERS.find(x => x.level === t.tier)!;
              return (
                <div key={t.tier} className={cn("rounded-lg p-4 text-center text-white", TIER_BG[t.tier])}>
                  <p className="text-[10px] uppercase tracking-[0.18em] font-bold opacity-90">{t.tier}</p>
                  <p className="text-3xl font-display font-bold tabular mt-2">{t.count}</p>
                  <p className="text-[11px] opacity-90 mt-0.5">{tier.pointsRate}× pts/₹100</p>
                  <p className="text-[10px] opacity-75 mt-1.5">≥ {money(tier.minSpend)}</p>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Revenue from loyalty */}
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Loyalty revenue contribution</p>
          <p className="font-semibold mt-0.5 inline-flex items-center gap-1.5"><IndianRupee className="h-4 w-4 text-brand" />Lifetime</p>
          <p className="text-4xl font-display font-bold tabular mt-4">{money(totalLoyaltyRevenue)}</p>
          <p className="text-[11px] text-muted-foreground mt-1">across {members.length} members</p>
          <div className="mt-4 pt-3 border-t border-border space-y-1.5 text-xs">
            <div className="flex justify-between"><span className="text-muted-foreground">Avg lifetime spend</span><span className="tabular font-medium">{money(Math.round(totalLoyaltyRevenue / members.length))}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Repeat-guest rate</span><span className="tabular font-medium text-success">{repeatPct}%</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Avg redemption</span><span className="tabular font-medium">{money(800)}</span></div>
          </div>
        </Card>
      </div>

      {/* Monthly performance bar chart */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Monthly performance</p>
            <p className="font-semibold mt-0.5">Points issued vs redeemed · last 6 months</p>
          </div>
          <Badge tone="neutral">FY 26-27</Badge>
        </div>
        <SimpleBarChart />
      </Card>

      {/* Top guests + Recent redemptions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card className="p-0 overflow-hidden">
          <div className="px-5 py-3 bg-surface-elevated border-b border-border flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Top loyal guests</p>
              <p className="font-semibold mt-0.5">by lifetime spend</p>
            </div>
          </div>
          <ul className="divide-y divide-border">
            {topGuests.map((m, i) => (
              <li key={m.id} onClick={() => onOpenMember(m)} className="px-5 py-3 flex items-center gap-3 hover:bg-surface-sunken/40 cursor-pointer transition-colors">
                <span className="text-xs font-bold tabular text-muted-foreground w-5">#{i + 1}</span>
                <Avatar name={m.name} size={36} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{m.name}</p>
                  <p className="text-[11px] text-muted-foreground">{m.membershipId} · {m.lifetimeStays} stays · {m.lifetimeNights}N</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold tabular text-sm">{money(m.lifetimeSpend)}</p>
                  <TierBadge tier={m.tier} small />
                </div>
                <ChevronRight className="h-4 w-4 text-subtle-foreground shrink-0" />
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-0 overflow-hidden">
          <div className="px-5 py-3 bg-surface-elevated border-b border-border">
            <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Recent redemptions</p>
            <p className="font-semibold mt-0.5">last 30 days</p>
          </div>
          <ul className="divide-y divide-border">
            {redemptions.slice(0, 5).map(r => (
              <li key={r.id} className="px-5 py-3 flex items-center gap-3">
                <span className="h-9 w-9 rounded-md bg-brand-soft text-brand-soft-foreground inline-flex items-center justify-center"><Gift className="h-4 w-4" /></span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{r.rewardName}</p>
                  <p className="text-[11px] text-muted-foreground tabular">{r.date} · {r.memberName}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold tabular text-sm">−{r.pointsUsed.toLocaleString("en-IN")} pts</p>
                  <Badge tone={r.status === "Applied" ? "success" : r.status === "Pending" ? "warning" : r.status === "Approved" ? "info" : "danger"}>{r.status}</Badge>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

// Simple CSS bar chart (no recharts dependency)
function SimpleBarChart() {
  const data = [
    { month: "Dec", issued: 8200, redeemed: 3400 },
    { month: "Jan", issued: 9100, redeemed: 4100 },
    { month: "Feb", issued: 10500, redeemed: 4800 },
    { month: "Mar", issued: 11800, redeemed: 5200 },
    { month: "Apr", issued: 13200, redeemed: 6100 },
    { month: "May", issued: 14600, redeemed: 7400 },
  ];
  const max = Math.max(...data.flatMap(d => [d.issued, d.redeemed]));
  return (
    <div className="space-y-2">
      <div className="flex items-end gap-3 h-48">
        {data.map(d => (
          <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
            <div className="flex-1 w-full flex items-end justify-center gap-1">
              <div className="bg-brand rounded-t flex-1 max-w-[18px] hover:bg-brand/80 transition-colors" style={{ height: `${(d.issued / max) * 100}%` }} title={`Issued: ${d.issued.toLocaleString()}`} />
              <div className="bg-success rounded-t flex-1 max-w-[18px] hover:bg-success/80 transition-colors" style={{ height: `${(d.redeemed / max) * 100}%` }} title={`Redeemed: ${d.redeemed.toLocaleString()}`} />
            </div>
            <p className="text-[10px] text-muted-foreground tabular">{d.month}</p>
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-4 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 bg-brand rounded" />Issued</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 bg-success rounded" />Redeemed</span>
      </div>
    </div>
  );
}

// ============================================================
// MEMBERS TAB
// ============================================================
function MembersTab({ members, onOpenMember, onAdjustPoints }: {
  members: LoyaltyMember[];
  onOpenMember: (m: LoyaltyMember) => void;
  onAdjustPoints: (m: LoyaltyMember) => void;
}) {
  const [search, setSearch] = React.useState("");
  const [tierFilter, setTierFilter] = React.useState<"all" | TierLevel>("all");
  const [sort, setSort] = React.useState<"points-desc" | "spend-desc" | "joined-desc" | "name-asc">("points-desc");

  const filtered = members.filter(m => {
    if (search && !`${m.name} ${m.phone} ${m.email} ${m.membershipId}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (tierFilter !== "all" && m.tier !== tierFilter) return false;
    return true;
  }).sort((a, b) => {
    if (sort === "points-desc") return b.pointsBalance - a.pointsBalance;
    if (sort === "spend-desc")  return b.lifetimeSpend - a.lifetimeSpend;
    if (sort === "joined-desc") return b.joinedAt.localeCompare(a.joinedAt);
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="p-3 space-y-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {(["all", "Silver", "Gold", "Platinum", "Diamond"] as const).map(t => (
            <button key={t} onClick={() => setTierFilter(t)} className={cn(
              "h-8 px-3 rounded-full text-xs font-medium border transition-colors inline-flex items-center gap-2",
              tierFilter === t ? "bg-foreground text-background border-foreground" : "border-border hover:bg-surface-sunken text-muted-foreground"
            )}>
              {t === "all" ? "All tiers" : t}
              <span className={cn(
                "tabular text-[10px] rounded-full px-1.5 h-4 inline-flex items-center font-semibold",
                tierFilter === t ? "bg-background/15 text-background" : "bg-surface-sunken text-muted-foreground"
              )}>{t === "all" ? members.length : members.filter(m => m.tier === t).length}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, phone, email, membership ID…" className="pl-9 h-9" />
          </div>
          <Select value={sort} onChange={e => setSort(e.target.value as typeof sort)} className="h-9 w-auto">
            <option value="points-desc">Points balance · high to low</option>
            <option value="spend-desc">Lifetime spend</option>
            <option value="joined-desc">Recently joined</option>
            <option value="name-asc">Name A–Z</option>
          </Select>
          <div className="flex-1" />
          <p className="text-xs text-muted-foreground tabular"><span className="font-medium text-foreground">{filtered.length}</span> of {members.length}</p>
        </div>
      </Card>

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-elevated border-b border-border">
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-semibold">Member</th>
                <th className="px-4 py-3 font-semibold">Tier</th>
                <th className="px-4 py-3 font-semibold">Membership ID</th>
                <th className="px-4 py-3 font-semibold text-right">Points balance</th>
                <th className="px-4 py-3 font-semibold text-right">Lifetime spend</th>
                <th className="px-4 py-3 font-semibold text-right">Stays / Nights</th>
                <th className="px-4 py-3 font-semibold">Last stay</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(m => (
                <tr key={m.id} className="hover:bg-surface-sunken/40 transition-colors cursor-pointer" onClick={() => onOpenMember(m)}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={m.name} size={36} />
                      <div>
                        <p className="font-medium">{m.name}</p>
                        <p className="text-[11px] text-muted-foreground">{m.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><TierBadge tier={m.tier} /></td>
                  <td className="px-4 py-3 font-mono tabular text-xs">{m.membershipId}</td>
                  <td className="px-4 py-3 text-right tabular font-semibold">{m.pointsBalance.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 text-right tabular">{money(m.lifetimeSpend)}</td>
                  <td className="px-4 py-3 text-right tabular">{m.lifetimeStays} / {m.lifetimeNights}N</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground tabular">{m.lastStayDate || "—"}</td>
                  <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                    <div className="inline-flex gap-1">
                      <button type="button" onClick={() => onOpenMember(m)} className="h-7 w-7 rounded-md border border-border hover:bg-surface-sunken inline-flex items-center justify-center text-muted-foreground" title="View profile"><Eye className="h-3.5 w-3.5" /></button>
                      <button type="button" onClick={() => onAdjustPoints(m)} className="h-7 w-7 rounded-md border border-border hover:bg-info hover:text-white hover:border-info inline-flex items-center justify-center text-muted-foreground" title="Adjust points"><RefreshCw className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ============================================================
// TIER BADGE COMPONENT
// ============================================================
function TierBadge({ tier, small }: { tier: TierLevel; small?: boolean }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full font-bold tracking-wider",
      small ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]",
      TIER_BG[tier]
    )}>
      <Crown className={cn(small ? "h-2 w-2" : "h-2.5 w-2.5")} />{tier.toUpperCase()}
    </span>
  );
}

// ============================================================
// TIERS & RULES TAB
// ============================================================
function TiersTab({ tiers, earningRules, settings, onEditTier, onUpdateRule, onUpdateSettings, onToast }: {
  tiers: Tier[];
  earningRules: EarningRule[];
  settings: ProgramSettings;
  onEditTier: (t: Tier) => void;
  onUpdateRule: (id: string, patch: Partial<EarningRule>) => void;
  onUpdateSettings: (s: ProgramSettings) => void;
  onToast: (m: string) => void;
}) {
  return (
    <div className="space-y-5">
      {/* Tier cards */}
      <div>
        <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2">Tier presets</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {tiers.map(t => (
            <div key={t.level} className={cn("rounded-xl p-5 text-white relative overflow-hidden shadow-md", TIER_BG[t.level])}>
              <div className="flex items-center justify-between mb-3">
                <Crown className="h-5 w-5 opacity-90" />
                <button type="button" onClick={() => onEditTier(t)} className="h-7 w-7 rounded-md bg-white/15 hover:bg-white/25 inline-flex items-center justify-center" title="Edit tier">
                  <Edit className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-90">{t.level}</p>
              <p className="text-3xl font-display font-bold mt-1">{t.pointsRate}× <span className="text-sm opacity-80">pts/₹100</span></p>
              <p className="text-[11px] opacity-90 mt-3">Requires</p>
              <p className="text-xs">≥ {money(t.minSpend)} · {t.minNights} nights</p>
              <div className="mt-3 pt-3 border-t border-white/20 space-y-1 text-[11px]">
                {t.perks.slice(0, 3).map((p, i) => (
                  <p key={i} className="opacity-90 flex items-start gap-1"><CheckCircle2 className="h-2.5 w-2.5 mt-0.5 shrink-0" />{p}</p>
                ))}
                {t.perks.length > 3 && <p className="text-[10px] opacity-75">+ {t.perks.length - 3} more perks</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Earning rules */}
      <Card className="p-0 overflow-hidden">
        <div className="px-5 py-3 bg-surface-elevated border-b border-border">
          <p className="font-semibold inline-flex items-center gap-1.5"><Star className="h-4 w-4 text-brand" />Earning rules</p>
          <p className="text-xs text-muted-foreground mt-0.5">Multiplier on tier rate · 1 point = ₹{settings.pointsValueRupees} redemption value</p>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-surface-sunken/30 border-b border-border">
            <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-5 py-2 font-semibold">Source</th>
              <th className="px-5 py-2 font-semibold text-right">Multiplier</th>
              <th className="px-5 py-2 font-semibold">Notes</th>
              <th className="px-5 py-2 font-semibold text-right">Enabled</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {earningRules.map(r => (
              <tr key={r.id} className="hover:bg-surface-sunken/30">
                <td className="px-5 py-2 font-medium">{r.source}</td>
                <td className="px-5 py-2 text-right">
                  <Input type="number" value={r.multiplier} onChange={e => onUpdateRule(r.id, { multiplier: Math.max(0, Number(e.target.value) || 0) })} className="h-7 w-20 tabular text-right ml-auto" step="0.1" min={0} />
                </td>
                <td className="px-5 py-2 text-xs text-muted-foreground">{r.notes || "—"}</td>
                <td className="px-5 py-2 text-right">
                  <ToggleSwitch on={r.enabled} onChange={() => onUpdateRule(r.id, { enabled: !r.enabled })} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="flex justify-end">
        <Button variant="success" onClick={() => onToast("Tier & earning rules saved")}><CheckCircle2 className="h-3.5 w-3.5" />Save rules</Button>
      </div>
    </div>
  );
}

function ToggleSwitch({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button type="button" onClick={onChange} className={cn(
      "relative h-5 w-9 rounded-full transition-colors inline-flex items-center",
      on ? "bg-brand" : "bg-surface-sunken border border-border"
    )}>
      <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform", on ? "translate-x-[18px]" : "translate-x-0.5")} />
    </button>
  );
}

// ============================================================
// REWARDS TAB
// ============================================================
function RewardsTab({ rewards, settings, onEdit, onToggle, onDelete }: {
  rewards: Reward[];
  settings: ProgramSettings;
  onEdit: (r: Reward | "new") => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{rewards.length} rewards · {rewards.filter(r => r.active).length} active</p>
        <Button size="sm" onClick={() => onEdit("new")}><Plus className="h-3.5 w-3.5" />New reward</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {rewards.map(r => (
          <Card key={r.id} className={cn("p-4 transition-shadow hover:shadow-md", !r.active && "opacity-50")}>
            <div className="flex items-start justify-between gap-2">
              <span className="text-3xl">{r.icon}</span>
              <Badge tone="neutral">{r.category}</Badge>
            </div>
            <p className="font-semibold mt-2 leading-tight">{r.name}</p>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-snug">{r.description}</p>
            <div className="mt-3 pt-3 border-t border-border space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Points cost</span>
                <span className="font-bold tabular text-brand">{r.pointsCost.toLocaleString("en-IN")} pts</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Cash value</span>
                <span className="tabular font-medium">{money(r.cashValue)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Min tier</span>
                <TierBadge tier={r.minTier} small />
              </div>
            </div>
            <div className="flex gap-1 mt-3">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => onEdit(r)}><Edit className="h-3 w-3" />Edit</Button>
              <Button size="sm" variant="ghost" onClick={() => onToggle(r.id)}>{r.active ? "Pause" : "Activate"}</Button>
              <button type="button" onClick={() => { if (window.confirm(`Delete "${r.name}"?`)) onDelete(r.id); }} className="h-8 w-8 rounded-md border border-border hover:bg-danger-soft hover:text-danger inline-flex items-center justify-center text-muted-foreground"><Trash2 className="h-3 w-3" /></button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// CAMPAIGNS TAB
// ============================================================
function CampaignsTab({ campaigns, onEdit, onToggle, onDelete }: {
  campaigns: Campaign[];
  onEdit: (c: Campaign | "new") => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{campaigns.length} campaigns · {campaigns.filter(c => c.active).length} running · {campaigns.reduce((t, c) => t + c.redemptions, 0)} total redemptions</p>
        <Button size="sm" onClick={() => onEdit("new")}><Plus className="h-3.5 w-3.5" />New campaign</Button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {campaigns.map(c => (
          <Card key={c.id} className={cn("p-4 border-l-4", c.active ? "border-l-success" : "border-l-border", !c.active && "opacity-60")}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-semibold leading-tight">{c.name}</p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-snug">{c.description}</p>
              </div>
              <Badge tone={c.active ? "success" : "neutral"}>{c.active ? "Live" : "Paused"}</Badge>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Valid</p><p className="tabular font-medium">{c.validFrom} → {c.validTo}</p></div>
              <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Type</p><Badge tone="info">{c.type}</Badge></div>
              <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Reward</p><p className="font-medium">{c.rewardValue}</p></div>
              <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Min booking</p><p className="tabular font-medium">{money(c.minBookingAmount)}</p></div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1">
              {c.applicableTiers.map(t => <TierBadge key={t} tier={t} small />)}
            </div>
            <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
              <p className="text-xs text-muted-foreground"><span className="font-bold text-foreground tabular">{c.redemptions}</span> redemptions</p>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => onEdit(c)}><Edit className="h-3 w-3" />Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => onToggle(c.id)}>{c.active ? "Pause" : "Run"}</Button>
                <button type="button" onClick={() => { if (window.confirm(`Delete "${c.name}"?`)) onDelete(c.id); }} className="h-8 w-8 rounded-md border border-border hover:bg-danger-soft hover:text-danger inline-flex items-center justify-center text-muted-foreground"><Trash2 className="h-3 w-3" /></button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// REDEMPTIONS TAB
// ============================================================
function RedemptionsTab({ redemptions, onApprove, onReject }: {
  redemptions: Redemption[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const pending = redemptions.filter(r => r.status === "Pending");
  const recent = redemptions.filter(r => r.status !== "Pending");

  return (
    <div className="space-y-5">
      {pending.length > 0 && (
        <Card className="p-0 overflow-hidden">
          <div className="px-5 py-3 bg-warning-soft/30 border-b border-warning/30 flex items-center justify-between">
            <div className="flex items-center gap-2"><AlertCircle className="h-4 w-4 text-warning" /><p className="font-semibold">Pending approval</p></div>
            <Badge tone="warning">{pending.length}</Badge>
          </div>
          <ul className="divide-y divide-border">
            {pending.map(r => (
              <li key={r.id} className="px-5 py-3 flex items-center gap-3">
                <span className="h-10 w-10 rounded-md bg-warning-soft text-warning inline-flex items-center justify-center"><Gift className="h-4 w-4" /></span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{r.rewardName}</p>
                  <p className="text-[11px] text-muted-foreground tabular">{r.memberName} · {r.pointsUsed.toLocaleString("en-IN")} pts · {r.date}{r.bookingNo ? ` · ${r.bookingNo}` : ""}</p>
                  {r.notes && <p className="text-[11px] text-muted-foreground italic mt-0.5">&ldquo;{r.notes}&rdquo;</p>}
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => onReject(r.id)}>Reject</Button>
                  <Button size="sm" variant="success" onClick={() => onApprove(r.id)}><CheckCircle2 className="h-3.5 w-3.5" />Approve</Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="p-0 overflow-hidden">
        <div className="px-5 py-3 bg-surface-elevated border-b border-border">
          <p className="font-semibold">Redemption history</p>
          <p className="text-xs text-muted-foreground mt-0.5">{recent.length} processed</p>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-surface-sunken/30 border-b border-border">
            <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-5 py-2 font-semibold">Date</th>
              <th className="px-5 py-2 font-semibold">Member</th>
              <th className="px-5 py-2 font-semibold">Reward</th>
              <th className="px-5 py-2 font-semibold text-right">Points</th>
              <th className="px-5 py-2 font-semibold">Booking</th>
              <th className="px-5 py-2 font-semibold">Status</th>
              <th className="px-5 py-2 font-semibold">Staff / Approver</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {recent.map(r => (
              <tr key={r.id} className="hover:bg-surface-sunken/30">
                <td className="px-5 py-2 text-xs tabular text-muted-foreground">{r.date}</td>
                <td className="px-5 py-2 font-medium">{r.memberName}</td>
                <td className="px-5 py-2">{r.rewardName}</td>
                <td className="px-5 py-2 text-right tabular font-semibold text-brand">{r.pointsUsed.toLocaleString("en-IN")}</td>
                <td className="px-5 py-2 font-mono tabular text-xs">{r.bookingNo || "—"}</td>
                <td className="px-5 py-2"><Badge tone={r.status === "Applied" ? "success" : r.status === "Approved" ? "info" : "danger"}>{r.status}</Badge></td>
                <td className="px-5 py-2 text-xs text-muted-foreground">{r.staff}{r.approver ? ` · ${r.approver}` : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ============================================================
// REPORTS TAB
// ============================================================
function ReportsTab({ members, redemptions, campaigns, onToast }: {
  members: LoyaltyMember[];
  redemptions: Redemption[];
  campaigns: Campaign[];
  onToast: (m: string) => void;
}) {
  const reports = [
    { id: "r1",  name: "Member list",                     description: "All loyalty members with tier, points, contact", icon: Users,        rows: members.length },
    { id: "r2",  name: "Points issued",                   description: "Earning transactions over a date range",          icon: ArrowUp,      rows: 142 },
    { id: "r3",  name: "Points redeemed",                 description: "Redemption usage by member and reward",           icon: ArrowDown,    rows: redemptions.length },
    { id: "r4",  name: "Points expired",                  description: "Lapsed points by member (24-month rule)",         icon: Clock,        rows: 18 },
    { id: "r5",  name: "Tier-wise guest report",          description: "Member counts and revenue per tier",              icon: Crown,        rows: 4 },
    { id: "r6",  name: "Top spending guests",             description: "Lifetime spend ranking",                          icon: TrendingUp,   rows: 50 },
    { id: "r7",  name: "Repeat guest report",             description: "Members with ≥2 stays",                           icon: RefreshCw,    rows: members.filter(m => m.lifetimeStays >= 2).length },
    { id: "r8",  name: "Revenue from loyalty members",    description: "Booking + F&B revenue tagged to members",         icon: IndianRupee,  rows: 92 },
    { id: "r9",  name: "Reward usage",                    description: "Most-redeemed rewards & cash value impact",       icon: Gift,         rows: 8 },
    { id: "r10", name: "Campaign performance",            description: "Per-campaign uptake + ROI",                       icon: Sparkles,     rows: campaigns.length },
    { id: "r11", name: "Branch-wise loyalty",             description: "Member distribution and revenue per property",    icon: BedDouble,    rows: 2 },
    { id: "r12", name: "Monthly / yearly analytics",      description: "12-month trend with charts",                      icon: TrendingUp,   rows: 12 },
  ];

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <Card className="p-3 flex flex-wrap items-center gap-2">
        <Label className="text-xs inline-flex items-center gap-1"><Calendar className="h-3 w-3" />Period</Label>
        <Input type="date" defaultValue="2026-05-01" className="h-9 tabular w-36" />
        <span className="text-xs text-muted-foreground">→</span>
        <Input type="date" defaultValue="2026-05-31" className="h-9 tabular w-36" />
        <Select className="h-9 w-auto" defaultValue="all">
          <option value="all">All branches</option>
          <option>The Pearl Marina · Main Tower</option>
          <option>The Pearl Marina · Annexe</option>
        </Select>
        <Select className="h-9 w-auto" defaultValue="all">
          <option value="all">All tiers</option>
          <option>Silver</option><option>Gold</option><option>Platinum</option><option>Diamond</option>
        </Select>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {reports.map(r => {
          const Icon = r.icon;
          return (
            <Card key={r.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <span className="h-10 w-10 rounded-md bg-brand-soft text-brand-soft-foreground inline-flex items-center justify-center shrink-0"><Icon className="h-4 w-4" /></span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm leading-tight">{r.name}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-snug">{r.description}</p>
                </div>
                <Badge tone="neutral">{r.rows.toLocaleString("en-IN")} rows</Badge>
              </div>
              <div className="flex gap-1 mt-3 pt-3 border-t border-border">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => onToast(`${r.name} exported to Excel`)}><FileDown className="h-3 w-3" />Excel</Button>
                <Button size="sm" variant="outline" className="flex-1" onClick={() => onToast(`${r.name} exported to PDF`)}><FileDown className="h-3 w-3" />PDF</Button>
                <Button size="sm" variant="ghost" onClick={() => window.print()}><Printer className="h-3 w-3" /></Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// AUDIT LOG TAB
// ============================================================
function AuditTab({ entries }: { entries: AuditEntry[] }) {
  return (
    <Card className="p-0 overflow-hidden">
      <div className="px-5 py-3 bg-surface-elevated border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-brand" /><p className="font-semibold">Loyalty audit trail</p></div>
        <Badge tone="neutral">tamper-evident · 90-day retention</Badge>
      </div>
      <ol className="divide-y divide-border">
        {entries.map(e => (
          <li key={e.id} className="px-5 py-3 flex items-start gap-3">
            <span className="h-7 w-7 rounded-md bg-brand-soft text-brand-soft-foreground inline-flex items-center justify-center text-[10px] font-bold shrink-0">{e.actor.charAt(0)}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2 flex-wrap">
                <p className="text-sm">
                  <span className="font-medium">{e.actor}</span>{" "}
                  <span className="text-muted-foreground">{e.action.toLowerCase()}</span>{" "}
                  <span className="font-mono text-xs tabular">{e.target}</span>
                </p>
                <p className="text-[10px] text-muted-foreground tabular shrink-0">{e.at}{e.ip ? ` · ${e.ip}` : ""}</p>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{e.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}

// ============================================================
// SETTINGS TAB
// ============================================================
function SettingsTab({ settings, onChange, onSave, onToast }: {
  settings: ProgramSettings;
  onChange: (s: ProgramSettings) => void;
  onSave: (s: ProgramSettings) => void;
  onToast: (m: string) => void;
}) {
  return (
    <Card className="p-5 space-y-4 max-w-3xl">
      <div>
        <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Program identity</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
          <div className="space-y-1.5"><Label className="text-xs">Program name</Label><Input value={settings.name} onChange={e => onChange({ ...settings, name: e.target.value })} className="h-9" /></div>
          <div className="space-y-1.5"><Label className="text-xs">1 point = ₹</Label><Input type="number" step="0.01" value={settings.pointsValueRupees} onChange={e => onChange({ ...settings, pointsValueRupees: Number(e.target.value) || 0 })} className="h-9 tabular" /></div>
        </div>
      </div>

      <hr className="border-border" />
      <div>
        <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Points lifecycle</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
          <div className="space-y-1.5"><Label className="text-xs">Expiry (months from earn date)</Label><Input type="number" value={settings.pointsExpiryMonths} onChange={e => onChange({ ...settings, pointsExpiryMonths: Math.max(1, Number(e.target.value) || 12) })} className="h-9 tabular" /></div>
          <div className="space-y-1.5"><Label className="text-xs">Approval required above</Label><Input type="number" value={settings.approvalRequiredAbove} onChange={e => onChange({ ...settings, approvalRequiredAbove: Math.max(0, Number(e.target.value) || 0) })} className="h-9 tabular" /></div>
        </div>
      </div>

      <hr className="border-border" />
      <div>
        <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Tax & discount</p>
        <div className="mt-2 space-y-2">
          {[
            { label: "Apply tax before loyalty discount",   on: settings.taxBeforeDiscount,    set: (v: boolean) => onChange({ ...settings, taxBeforeDiscount: v }), hint: "GST calculated on pre-discount amount" },
            { label: "Manual point adjustment needs approval", on: settings.manualAdjustNeedsApproval, set: (v: boolean) => onChange({ ...settings, manualAdjustNeedsApproval: v }), hint: "Only Manager / Owner can finalise" },
            { label: "Require OTP for redemption",          on: settings.redemptionOtp,        set: (v: boolean) => onChange({ ...settings, redemptionOtp: v }), hint: "Send OTP to member's phone before redeeming" },
          ].map((opt, i) => (
            <div key={i} className="flex items-start justify-between gap-3 p-3 rounded-md border border-border">
              <div><p className="text-sm font-medium">{opt.label}</p><p className="text-[11px] text-muted-foreground">{opt.hint}</p></div>
              <ToggleSwitch on={opt.on} onChange={() => opt.set(!opt.on)} />
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end pt-3 border-t border-border">
        <Button variant="success" onClick={() => { onSave(settings); onToast("Loyalty settings saved"); }}><CheckCircle2 className="h-3.5 w-3.5" />Save settings</Button>
      </div>
    </Card>
  );
}

// ============================================================
// ADD MEMBER MODAL
// ============================================================
function AddMemberModal({ onClose, onSave }: {
  onClose: () => void;
  onSave: (m: Omit<LoyaltyMember, "id" | "membershipId" | "joinedAt" | "tier" | "pointsBalance" | "lifetimePoints" | "lifetimeStays" | "lifetimeNights" | "lifetimeSpend" | "preferences">) => void;
}) {
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("+91 ");
  const [email, setEmail] = React.useState("");
  const [dob, setDob] = React.useState("");
  const [anniversary, setAnniversary] = React.useState("");
  const [nationality, setNationality] = React.useState("India");
  const [idType, setIdType] = React.useState("Aadhaar");
  const [idNumber, setIdNumber] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [consent, setConsent] = React.useState(true);

  React.useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; document.removeEventListener("keydown", onKey); };
  }, [onClose]);

  const valid = name.trim().length > 1 && phone.trim().length > 4 && /\S+@\S+\.\S+/.test(email);

  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface rounded-xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="h-9 w-9 rounded-md bg-brand-soft text-brand-soft-foreground inline-flex items-center justify-center"><Award className="h-4 w-4" /></span>
            <div><h3 className="font-semibold">Enrol new loyalty member</h3><p className="text-xs text-muted-foreground">Starts at Silver tier · +500 welcome bonus</p></div>
          </div>
          <button type="button" onClick={onClose} className="h-7 w-7 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>

        <div className="px-5 py-4 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs">Full name *</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Mr / Ms · Full name" className="h-9" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Phone *</Label><Input value={phone} onChange={e => setPhone(e.target.value)} className="h-9 tabular" placeholder="+91 9XXXX XXXXX" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Email *</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="h-9" placeholder="guest@example.com" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Nationality</Label>
              <Select value={nationality} onChange={e => setNationality(e.target.value)} className="h-9">
                <option>India</option><option>UAE</option><option>USA</option><option>UK</option><option>Singapore</option><option>Other</option>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs"><Cake className="h-3 w-3 inline mr-1" />Date of birth</Label><Input type="date" value={dob} onChange={e => setDob(e.target.value)} className="h-9 tabular" /></div>
            <div className="space-y-1.5"><Label className="text-xs"><Heart className="h-3 w-3 inline mr-1" />Anniversary</Label><Input type="date" value={anniversary} onChange={e => setAnniversary(e.target.value)} className="h-9 tabular" /></div>
            <div className="space-y-1.5"><Label className="text-xs">ID type</Label>
              <Select value={idType} onChange={e => setIdType(e.target.value)} className="h-9">
                <option>Aadhaar</option><option>PAN</option><option>Passport</option><option>Emirates ID</option><option>Driving License</option>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">ID number</Label><Input value={idNumber} onChange={e => setIdNumber(e.target.value)} className="h-9 tabular" placeholder="As on document" /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label className="text-xs"><MapPin className="h-3 w-3 inline mr-1" />Address</Label><Input value={address} onChange={e => setAddress(e.target.value)} className="h-9" placeholder="City, State / Country" /></div>
          </div>

          <Button variant="outline" size="sm" type="button" onClick={() => alert("Camera capture · attach a profile photo from device")}>
            <Camera className="h-3.5 w-3.5" />Capture profile photo
          </Button>

          <button type="button" onClick={() => setConsent(!consent)} className={cn(
            "w-full flex items-start gap-2.5 p-3 rounded-md border transition-colors text-left",
            consent ? "border-brand bg-brand-soft/20" : "border-border"
          )}>
            <span className={cn("h-4 w-4 rounded border-2 inline-flex items-center justify-center shrink-0 mt-0.5", consent ? "border-brand bg-brand text-brand-foreground" : "border-border-strong")}>{consent && <CheckCircle2 className="h-2.5 w-2.5" />}</span>
            <div><p className="text-sm">Consent to marketing communication</p><p className="text-[11px] text-muted-foreground">Birthday offers, tier upgrade notifications, exclusive campaigns via Email + WhatsApp</p></div>
          </button>
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-border bg-surface-sunken/30">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave({ name, phone, email, dob, anniversary, nationality, idType, idNumber, address, consentMarketing: consent })} disabled={!valid}>
            <CheckCircle2 className="h-3.5 w-3.5" />Enrol member · +500 bonus
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MEMBER DETAIL DRAWER
// ============================================================
function MemberDetailDrawer({ member, txns, tier, onClose, onAdjust, onToast }: {
  member: LoyaltyMember;
  txns: PointTxn[];
  tier: Tier;
  onClose: () => void;
  onAdjust: () => void;
  onToast: (m: string) => void;
}) {
  const [tab, setTab] = React.useState<"profile" | "wallet" | "rewards">("profile");

  React.useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; document.removeEventListener("keydown", onKey); };
  }, [onClose]);

  // Compute progress to next tier
  const allTiers = TIERS;
  const idx = allTiers.findIndex(t => t.level === member.tier);
  const nextTier = idx < allTiers.length - 1 ? allTiers[idx + 1] : null;
  const progress = nextTier ? Math.min(100, Math.round((member.lifetimeSpend / nextTier.minSpend) * 100)) : 100;
  const spendToNext = nextTier ? Math.max(0, nextTier.minSpend - member.lifetimeSpend) : 0;

  return (
    <div className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm" onClick={onClose}>
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-xl bg-surface shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={cn("px-5 py-4 border-b border-border", TIER_BG[member.tier])}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar name={member.name} size={48} vip={member.tier === "Platinum" || member.tier === "Diamond"} />
              <div className="min-w-0">
                <h3 className="font-semibold text-lg truncate text-white">{member.name}</h3>
                <p className="text-xs opacity-90 truncate text-white inline-flex items-center gap-1.5">
                  {member.membershipId} · joined {member.joinedAt}
                  <button type="button" onClick={(e) => { e.stopPropagation(); navigator.clipboard?.writeText(member.membershipId); onToast(`Copied ${member.membershipId} to clipboard`); }} className="h-5 w-5 rounded bg-white/15 hover:bg-white/25 inline-flex items-center justify-center" title="Copy membership ID">
                    <Copy className="h-2.5 w-2.5" />
                  </button>
                </p>
                <p className="text-[10px] opacity-80 truncate text-white inline-flex items-center gap-1 mt-0.5">
                  <Bell className="h-2.5 w-2.5" />{member.upcomingBooking ? "1 reminder set · upcoming stay" : "No reminders set"}
                </p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="h-8 w-8 rounded-md bg-white/15 hover:bg-white/25 inline-flex items-center justify-center text-white"><X className="h-4 w-4" /></button>
          </div>

          {/* Points wallet card */}
          <div className="mt-4 rounded-lg bg-white/15 backdrop-blur-sm p-3 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] font-bold opacity-90">Points balance</p>
                <p className="text-3xl font-display font-bold tabular mt-1">{member.pointsBalance.toLocaleString("en-IN")}</p>
                <p className="text-[10px] opacity-75">≈ {money(member.pointsBalance * 0.5)} redemption value</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider opacity-90">{member.tier}</p>
                <p className="text-xs font-semibold tabular">{tier.pointsRate}× pts/₹100</p>
              </div>
            </div>
            {nextTier && (
              <div className="mt-3 pt-3 border-t border-white/20">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="opacity-90">→ {nextTier.level}</span>
                  <span className="tabular">{money(spendToNext)} to go</span>
                </div>
                <div className="mt-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-white transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div className="flex gap-1.5 mt-3">
            <a href={`tel:${member.phone}`} className="flex-1 h-9 rounded-md bg-white/15 hover:bg-white/25 inline-flex items-center justify-center gap-1.5 text-xs font-medium text-white"><Phone className="h-3.5 w-3.5" />Call</a>
            <a href={`mailto:${member.email}`} className="flex-1 h-9 rounded-md bg-white/15 hover:bg-white/25 inline-flex items-center justify-center gap-1.5 text-xs font-medium text-white"><Mail className="h-3.5 w-3.5" />Email</a>
            <button type="button" onClick={() => onToast(`WhatsApp opened for ${member.name}`)} className="flex-1 h-9 rounded-md bg-white/15 hover:bg-white/25 inline-flex items-center justify-center gap-1.5 text-xs font-medium text-white"><MessageSquare className="h-3.5 w-3.5" />WhatsApp</button>
            <button type="button" onClick={onAdjust} className="flex-1 h-9 rounded-md bg-white text-foreground hover:bg-white/90 inline-flex items-center justify-center gap-1.5 text-xs font-medium"><RefreshCw className="h-3.5 w-3.5" />Adjust</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border bg-surface-sunken/40 px-2">
          {(["profile", "wallet", "rewards"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={cn(
              "px-3 py-2.5 text-xs font-medium border-b-2 transition-colors capitalize",
              tab === t ? "border-brand text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            )}>{t === "wallet" ? "Wallet history" : t === "rewards" ? "Available rewards" : "Profile"}</button>
          ))}
        </div>

        <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1">
          {tab === "profile" && (
            <>
              {/* Lifetime stats */}
              <div className="grid grid-cols-3 gap-2">
                <Card className="p-3 text-center"><BedDouble className="h-4 w-4 mx-auto text-brand mb-1" /><p className="text-lg font-bold tabular">{member.lifetimeStays}</p><p className="text-[10px] uppercase text-muted-foreground tracking-wider">Stays</p></Card>
                <Card className="p-3 text-center"><Clock className="h-4 w-4 mx-auto text-info mb-1" /><p className="text-lg font-bold tabular">{member.lifetimeNights}</p><p className="text-[10px] uppercase text-muted-foreground tracking-wider">Nights</p></Card>
                <Card className="p-3 text-center"><IndianRupee className="h-4 w-4 mx-auto text-success mb-1" /><p className="text-lg font-bold tabular">{money(member.lifetimeSpend)}</p><p className="text-[10px] uppercase text-muted-foreground tracking-wider">Lifetime</p></Card>
              </div>

              <Card className="p-4 space-y-2 text-sm">
                <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />{member.phone}</div>
                <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />{member.email}</div>
                {member.address && <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />{member.address}</div>}
                {member.dob && <div className="flex items-center gap-2"><Cake className="h-3.5 w-3.5 text-brand shrink-0" />{member.dob}</div>}
                {member.anniversary && <div className="flex items-center gap-2"><Heart className="h-3.5 w-3.5 text-danger shrink-0" />{member.anniversary}</div>}
                <hr className="border-border" />
                <p className="text-[11px] text-muted-foreground"><strong>{member.idType}</strong>: <span className="font-mono tabular">{member.idNumber}</span> · {member.nationality}</p>
              </Card>

              {member.preferences.length > 0 && (
                <Card className="p-4">
                  <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2">Preferences</p>
                  <div className="flex flex-wrap gap-1.5">
                    {member.preferences.map(p => <Badge key={p} tone="info">{p}</Badge>)}
                  </div>
                </Card>
              )}

              {member.staffNotes && (
                <Card className="p-3 bg-info-soft/15 border-info/20 text-sm italic">&ldquo;{member.staffNotes}&rdquo;</Card>
              )}

              {member.upcomingBooking && (
                <Card className="p-3 bg-success-soft/15 border-success/20">
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-success">Upcoming booking</p>
                  <p className="text-sm font-medium mt-0.5">{member.upcomingBooking.bookingNo} · {member.upcomingBooking.date}</p>
                </Card>
              )}

              <Card className="p-4">
                <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2">Tier benefits</p>
                <ul className="space-y-1.5 text-xs">
                  {tier.perks.map((p, i) => (
                    <li key={i} className="flex items-start gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" />{p}</li>
                  ))}
                </ul>
              </Card>
            </>
          )}

          {tab === "wallet" && (
            <Card className="p-0 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-surface-elevated">
                  <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Source</th>
                    <th className="px-3 py-2 text-right">Δ</th>
                    <th className="px-3 py-2 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {txns.length === 0 ? (
                    <tr><td colSpan={4} className="px-3 py-8 text-center text-xs text-muted-foreground">No transactions yet</td></tr>
                  ) : txns.map(t => (
                    <tr key={t.id}>
                      <td className="px-3 py-1.5 tabular text-xs text-muted-foreground">{t.date}</td>
                      <td className="px-3 py-1.5">
                        <p className="text-xs">{t.source}</p>
                        {t.bookingNo && <p className="text-[10px] text-muted-foreground font-mono">{t.bookingNo}</p>}
                      </td>
                      <td className={cn("px-3 py-1.5 text-right tabular text-xs font-semibold", t.amount > 0 ? "text-success" : "text-warning")}>
                        {t.amount > 0 ? "+" : ""}{t.amount.toLocaleString("en-IN")}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular text-xs font-medium">{t.balance.toLocaleString("en-IN")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          {tab === "rewards" && (
            <div className="grid grid-cols-2 gap-2">
              {SEED_REWARDS.filter(r => r.active).map(r => {
                const idx = TIERS.findIndex(t => t.level === r.minTier);
                const memberIdx = TIERS.findIndex(t => t.level === member.tier);
                const eligible = memberIdx >= idx && member.pointsBalance >= r.pointsCost;
                return (
                  <Card key={r.id} className={cn("p-3", !eligible && "opacity-50")}>
                    <div className="flex items-start gap-2">
                      <span className="text-2xl">{r.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-xs leading-tight">{r.name}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{r.pointsCost.toLocaleString("en-IN")} pts</p>
                      </div>
                    </div>
                    <Button size="sm" variant={eligible ? "primary" : "ghost"} className="w-full mt-2" disabled={!eligible} onClick={() => onToast(`Redemption queued: ${r.name} for ${member.name}`)}>
                      {eligible ? "Redeem" : memberIdx < idx ? `Need ${r.minTier}` : "Insufficient pts"}
                    </Button>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ADJUST POINTS MODAL
// ============================================================
function AdjustPointsModal({ member, settings, onClose, onSave }: {
  member: LoyaltyMember;
  settings: ProgramSettings;
  onClose: () => void;
  onSave: (delta: number, reason: string) => void;
}) {
  const [type, setType] = React.useState<"credit" | "debit">("credit");
  const [amount, setAmount] = React.useState(100);
  const [reason, setReason] = React.useState("Compensation · service recovery");
  const needsApproval = settings.manualAdjustNeedsApproval && amount >= settings.approvalRequiredAbove;
  const [approver, setApprover] = React.useState("Manager · Tom W.");

  React.useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; document.removeEventListener("keydown", onKey); };
  }, [onClose]);

  const delta = type === "credit" ? amount : -amount;
  const newBalance = Math.max(0, member.pointsBalance + delta);

  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="h-9 w-9 rounded-md bg-warning-soft text-warning inline-flex items-center justify-center"><RefreshCw className="h-4 w-4" /></span>
            <div><h3 className="font-semibold">Adjust points</h3><p className="text-xs text-muted-foreground">{member.name} · {member.membershipId}</p></div>
          </div>
          <button type="button" onClick={onClose} className="h-7 w-7 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setType("credit")} className={cn(
              "h-12 rounded-md border-2 text-sm font-semibold transition-colors",
              type === "credit" ? "border-success bg-success-soft/40 text-success" : "border-border hover:bg-surface-sunken"
            )}><ArrowUp className="h-4 w-4 inline" /> Credit</button>
            <button type="button" onClick={() => setType("debit")} className={cn(
              "h-12 rounded-md border-2 text-sm font-semibold transition-colors",
              type === "debit" ? "border-danger bg-danger-soft/40 text-danger" : "border-border hover:bg-surface-sunken"
            )}><ArrowDown className="h-4 w-4 inline" /> Debit</button>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Points</Label>
            <Input type="number" min={1} value={amount} onChange={e => setAmount(Math.max(0, Number(e.target.value) || 0))} className="h-11 tabular text-lg font-semibold" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Reason *</Label>
            <Select value={reason} onChange={e => setReason(e.target.value)} className="h-9">
              <option>Compensation · service recovery</option>
              <option>Goodwill gesture</option>
              <option>Birthday / anniversary bonus</option>
              <option>Promotional adjustment</option>
              <option>Audit correction</option>
              <option>Referral credit</option>
              <option>Other</option>
            </Select>
          </div>

          {needsApproval && (
            <div className="space-y-1.5">
              <Label className="text-xs"><ShieldCheck className="h-3 w-3 inline mr-1" />Approver required</Label>
              <Select value={approver} onChange={e => setApprover(e.target.value)} className="h-9">
                <option>Manager · Tom W.</option><option>Manager · Anjali S.</option><option>Owner</option>
              </Select>
            </div>
          )}

          <Card className={cn(
            "p-3 text-sm",
            type === "credit" ? "bg-success-soft/15 border-success/20" : "bg-danger-soft/15 border-danger/20"
          )}>
            <div className="flex justify-between"><span className="text-muted-foreground">Current</span><span className="tabular font-medium">{member.pointsBalance.toLocaleString("en-IN")}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Change</span><span className={cn("tabular font-bold", delta > 0 ? "text-success" : "text-danger")}>{delta > 0 ? "+" : ""}{delta}</span></div>
            <div className="flex justify-between pt-1.5 mt-1.5 border-t border-current/20"><span className="font-semibold">New balance</span><span className="tabular font-bold text-base">{newBalance.toLocaleString("en-IN")}</span></div>
          </Card>
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-border bg-surface-sunken/30">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(delta, reason)} disabled={amount === 0}>
            <CheckCircle2 className="h-3.5 w-3.5" />{needsApproval ? "Submit for approval" : "Apply"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// TIER EDIT MODAL
// ============================================================
function TierEditModal({ tier, onClose, onSave }: {
  tier: Tier;
  onClose: () => void;
  onSave: (t: Tier) => void;
}) {
  const [t, setT] = React.useState<Tier>(tier);
  const update = <K extends keyof Tier>(k: K, v: Tier[K]) => setT(p => ({ ...p, [k]: v }));

  React.useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; document.removeEventListener("keydown", onKey); };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface rounded-xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className={cn("flex items-center justify-between px-5 py-3.5 border-b border-border", TIER_BG[t.level])}>
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-white" />
            <div><h3 className="font-semibold text-white">{t.level} tier</h3><p className="text-xs opacity-90 text-white">Edit thresholds &amp; benefits</p></div>
          </div>
          <button type="button" onClick={onClose} className="h-8 w-8 rounded-md bg-white/15 hover:bg-white/25 inline-flex items-center justify-center text-white"><X className="h-4 w-4" /></button>
        </div>

        <div className="px-5 py-4 space-y-3 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs">Min spend (₹)</Label><Input type="number" value={t.minSpend} onChange={e => update("minSpend", Math.max(0, Number(e.target.value)))} className="h-9 tabular" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Min nights</Label><Input type="number" value={t.minNights} onChange={e => update("minNights", Math.max(0, Number(e.target.value)))} className="h-9 tabular" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Points per ₹100</Label><Input type="number" value={t.pointsRate} onChange={e => update("pointsRate", Math.max(0, Number(e.target.value)))} step="0.1" className="h-9 tabular" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Discount %</Label><Input type="number" value={t.discountPct} onChange={e => update("discountPct", Math.max(0, Number(e.target.value)))} className="h-9 tabular" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Room upgrade</Label>
              <Select value={t.roomUpgrade} onChange={e => update("roomUpgrade", e.target.value as Tier["roomUpgrade"])} className="h-9">
                <option>None</option><option>Subject to availability</option><option>Complimentary</option>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Late checkout</Label><Input value={t.lateCheckout} onChange={e => update("lateCheckout", e.target.value)} className="h-9" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Early check-in</Label><Input value={t.earlyCheckin} onChange={e => update("earlyCheckin", e.target.value)} className="h-9" /></div>
          </div>

          <div className="space-y-2 pt-2 border-t border-border">
            <Label className="text-xs">Benefits</Label>
            {[
              { k: "freeBreakfast" as const,  label: "Free breakfast" },
              { k: "welcomeDrink" as const,   label: "Welcome drink" },
              { k: "priorityBooking" as const,label: "Priority reservation queue" },
              { k: "vipTag" as const,         label: "VIP tag on profile" },
            ].map(b => (
              <div key={b.k} className="flex items-center justify-between p-2 rounded-md border border-border">
                <span className="text-sm">{b.label}</span>
                <ToggleSwitch on={t[b.k]} onChange={() => update(b.k, !t[b.k])} />
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-border bg-surface-sunken/30">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(t)}><CheckCircle2 className="h-3.5 w-3.5" />Save tier</Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// REWARD EDIT MODAL
// ============================================================
function RewardEditModal({ reward, onClose, onSave }: {
  reward: Reward | null;
  onClose: () => void;
  onSave: (r: Reward) => void;
}) {
  const isNew = reward === null;
  const [r, setR] = React.useState<Reward>(reward ?? {
    id: "", name: "", category: "Stay", pointsCost: 1000, cashValue: 500,
    description: "", minTier: "Silver", active: true, icon: "🎁",
  });

  React.useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; document.removeEventListener("keydown", onKey); };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface rounded-xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{r.icon}</span>
            <div><h3 className="font-semibold">{isNew ? "Create reward" : "Edit reward"}</h3></div>
          </div>
          <button type="button" onClick={onClose} className="h-7 w-7 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="grid grid-cols-[80px_1fr] gap-3">
            <div className="space-y-1.5"><Label className="text-xs">Icon</Label><Input value={r.icon} onChange={e => setR({ ...r, icon: e.target.value })} maxLength={4} className="h-9 text-center text-xl" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Name *</Label><Input value={r.name} onChange={e => setR({ ...r, name: e.target.value })} placeholder="₹500 room discount" className="h-9" /></div>
          </div>
          <div className="space-y-1.5"><Label className="text-xs">Description</Label><Input value={r.description} onChange={e => setR({ ...r, description: e.target.value })} className="h-9" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs">Category</Label>
              <Select value={r.category} onChange={e => setR({ ...r, category: e.target.value as Reward["category"] })} className="h-9">
                <option>Stay</option><option>F&B</option><option>Spa</option><option>Service</option><option>Voucher</option><option>Upgrade</option>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Min tier</Label>
              <Select value={r.minTier} onChange={e => setR({ ...r, minTier: e.target.value as TierLevel })} className="h-9">
                <option>Silver</option><option>Gold</option><option>Platinum</option><option>Diamond</option>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Points cost</Label><Input type="number" value={r.pointsCost} onChange={e => setR({ ...r, pointsCost: Math.max(0, Number(e.target.value)) })} className="h-9 tabular" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Cash value (₹)</Label><Input type="number" value={r.cashValue} onChange={e => setR({ ...r, cashValue: Math.max(0, Number(e.target.value)) })} className="h-9 tabular" /></div>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-border bg-surface-sunken/30">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(r)} disabled={!r.name.trim()}><CheckCircle2 className="h-3.5 w-3.5" />{isNew ? "Create" : "Save"}</Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// CAMPAIGN EDIT MODAL
// ============================================================
function CampaignEditModal({ campaign, onClose, onSave }: {
  campaign: Campaign | null;
  onClose: () => void;
  onSave: (c: Campaign) => void;
}) {
  const isNew = campaign === null;
  const [c, setC] = React.useState<Campaign>(campaign ?? {
    id: "", name: "", type: "Discount", description: "",
    validFrom: new Date().toISOString().slice(0, 10),
    validTo: new Date(new Date().getFullYear(), 11, 31).toISOString().slice(0, 10),
    applicableTiers: ["Silver", "Gold", "Platinum", "Diamond"],
    applicableRoomTypes: ["All"], minBookingAmount: 0, rewardValue: "", active: true, redemptions: 0,
  });

  React.useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; document.removeEventListener("keydown", onKey); };
  }, [onClose]);

  const toggleTier = (t: TierLevel) => setC(p => ({
    ...p, applicableTiers: p.applicableTiers.includes(t) ? p.applicableTiers.filter(x => x !== t) : [...p.applicableTiers, t],
  }));

  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface rounded-xl shadow-2xl w-full max-w-xl max-h-[92vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="h-9 w-9 rounded-md bg-brand-soft text-brand-soft-foreground inline-flex items-center justify-center"><Sparkles className="h-4 w-4" /></span>
            <div><h3 className="font-semibold">{isNew ? "Launch campaign" : "Edit campaign"}</h3></div>
          </div>
          <button type="button" onClick={onClose} className="h-7 w-7 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-5 py-4 space-y-3 overflow-y-auto">
          <div className="space-y-1.5"><Label className="text-xs">Campaign name *</Label><Input value={c.name} onChange={e => setC({ ...c, name: e.target.value })} placeholder="e.g. Diwali Stay & Save" className="h-9" /></div>
          <div className="space-y-1.5"><Label className="text-xs">Description</Label><Input value={c.description} onChange={e => setC({ ...c, description: e.target.value })} className="h-9" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs">Type</Label>
              <Select value={c.type} onChange={e => setC({ ...c, type: e.target.value as Campaign["type"] })} className="h-9">
                <option>Discount</option><option>Bonus Points</option><option>Free Night</option><option>Upgrade</option><option>BOGO</option>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Reward value</Label><Input value={c.rewardValue} onChange={e => setC({ ...c, rewardValue: e.target.value })} placeholder="20% off + 2× pts" className="h-9" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Valid from</Label><Input type="date" value={c.validFrom} onChange={e => setC({ ...c, validFrom: e.target.value })} className="h-9 tabular" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Valid to</Label><Input type="date" value={c.validTo} onChange={e => setC({ ...c, validTo: e.target.value })} className="h-9 tabular" /></div>
            <div className="space-y-1.5 col-span-2"><Label className="text-xs">Min booking amount (₹)</Label><Input type="number" value={c.minBookingAmount} onChange={e => setC({ ...c, minBookingAmount: Math.max(0, Number(e.target.value)) })} className="h-9 tabular" /></div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Applicable tiers</Label>
            <div className="grid grid-cols-4 gap-1.5">
              {(["Silver", "Gold", "Platinum", "Diamond"] as TierLevel[]).map(t => (
                <button key={t} type="button" onClick={() => toggleTier(t)} className={cn(
                  "h-9 rounded-md border text-xs font-medium transition-colors",
                  c.applicableTiers.includes(t) ? "bg-brand text-brand-foreground border-brand" : "border-border hover:bg-surface-sunken"
                )}>{t}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-border bg-surface-sunken/30">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(c)} disabled={!c.name.trim()}><CheckCircle2 className="h-3.5 w-3.5" />{isNew ? "Launch" : "Save"}</Button>
        </div>
      </div>
    </div>
  );
}
