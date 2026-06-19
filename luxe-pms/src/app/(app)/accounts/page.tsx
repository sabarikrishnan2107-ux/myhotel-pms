"use client";
import * as React from "react";
import {
  Plus, FileDown, TrendingUp, TrendingDown, Wallet, Receipt, ArrowUp, ArrowDown,
  X, Bot, Calendar, CheckCircle2, AlertCircle, Search, Sparkles, FileText, Printer,
  ChevronRight, Users, Eye, Lock, ShieldCheck, ClipboardList, Minus, Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { KPICard } from "@/components/ui/kpi-card";
import { AIInsight } from "@/components/ui/ai-insight";
import { INCOME_BREAKDOWN, EXPENSE_BREAKDOWN, RECENT_TXN } from "@/lib/mock-data-ext";
import { money, cn, formatDate } from "@/lib/utils";
import { apiGet, apiPost } from "@/lib/api";
import { useProperty, hotelName } from "@/lib/use-property";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend, LineChart, Line } from "recharts";

const PL_TREND = [
  { month: "Dec", income: 86000, expense: 62000 },
  { month: "Jan", income: 98300, expense: 68500 },
  { month: "Feb", income: 110400, expense: 72100 },
  { month: "Mar", income: 117100, expense: 74800 },
  { month: "Apr", income: 124000, expense: 78400 },
  { month: "May", income: 130110, expense: 76300 },
];

const CASH_FLOW = Array.from({ length: 30 }, (_, i) => ({
  day: `${i + 1}`,
  balance: 45000 + Math.round(Math.sin(i / 3) * 8000 + i * 600 + Math.cos(i / 5) * 4000),
}));

const TABS = [
  { id: "dashboard",   label: "Dashboard",         hint: "Your money at a glance — income, expenses, profit and cash position this month." },
  { id: "income",      label: "Income",            hint: "Every payment coming in, broken down by source." },
  { id: "expenses",    label: "Expenses",          hint: "Every payment going out, with bills, categories and the full day book." },
  { id: "profitloss",  label: "Profit & Loss",     hint: "What you earned minus what you spent — plus balance sheet and journal." },
  { id: "cashflow",    label: "Cash Flow",         hint: "Money moving through your bank and cash accounts, and reconciliation." },
  { id: "vendor",      label: "Vendor Payments",   hint: "Bills you owe suppliers, due dates and payment status." },
  { id: "receivables", label: "Guest Receivables", hint: "Money guests, agents and companies still owe you." },
  { id: "vat",         label: "VAT Report",        hint: "VAT you've collected and paid, and your filing status." },
  { id: "reports",     label: "Reports",           hint: "Download statements and summaries, and review cashier shifts." },
] as const;
type TabId = typeof TABS[number]["id"];

// ============ NEW: BANK ACCOUNTS + RECONCILIATION ============
type BankAccount = {
  id: string; name: string; bank: string; accountNo: string; ifsc: string;
  bookBalance: number; bankBalance: number; uncleared: number;
};
const BANK_ACCOUNTS: BankAccount[] = [
  { id: "ba1", name: "HDFC Operating", bank: "HDFC Bank", accountNo: "50100012345678", ifsc: "HDFC0001234", bookBalance: 1842500, bankBalance: 1818250, uncleared: 24250 },
  { id: "ba2", name: "ICICI Salary",   bank: "ICICI Bank", accountNo: "624505123456",   ifsc: "ICIC0006245", bookBalance:  342150, bankBalance:  342150, uncleared:     0 },
  { id: "ba3", name: "SBI Deposit",    bank: "State Bank of India", accountNo: "37854612378", ifsc: "SBIN0001890", bookBalance:  956400, bankBalance:  950000, uncleared:  6400 },
];

type ReconcileEntry = {
  id: string; date: string; description: string; debit: number; credit: number;
  matched: boolean; source: "book" | "bank"; ref?: string;
};
const RECONCILE: ReconcileEntry[] = [
  { id: "rc1", date: "2026-05-22", description: "Folio settle · BK100240", debit: 0,     credit: 14500, matched: true,  source: "book", ref: "RCP-2026-100240" },
  { id: "rc2", date: "2026-05-22", description: "Card POS deposit",         debit: 0,     credit: 14500, matched: true,  source: "bank", ref: "DEP-04-5522" },
  { id: "rc3", date: "2026-05-23", description: "Vendor pay · ABC Linens",  debit: 12400, credit: 0,     matched: true,  source: "book", ref: "VCH-1042" },
  { id: "rc4", date: "2026-05-23", description: "NEFT debit · ABC LINEN",   debit: 12400, credit: 0,     matched: true,  source: "bank", ref: "UTR8821" },
  { id: "rc5", date: "2026-05-23", description: "Folio settle · BK100242",  debit: 0,     credit: 24250, matched: false, source: "book", ref: "RCP-2026-100242" },
  { id: "rc6", date: "2026-05-24", description: "Bank charges",             debit: 1500,  credit: 0,     matched: false, source: "bank", ref: "MISC-05" },
  { id: "rc7", date: "2026-05-24", description: "Interest credit",          debit: 0,     credit: 4250,  matched: false, source: "bank", ref: "INT-Q2" },
];

// ============ NEW: VENDOR BILLS / PAYABLES ============
type VendorBill = {
  id: string; billNo: string; vendor: string; category: string;
  billDate: string; dueDate: string;
  taxableValue: number; gst: number; tdsRate: number; tdsAmount: number;
  netPayable: number; paid: number; status: "Draft" | "Approved" | "Paid" | "Partial" | "Overdue";
};
const VENDOR_BILLS: VendorBill[] = [
  { id: "vb1", billNo: "ABC-2426", vendor: "ABC Linens Pvt",      category: "Linen",       billDate: "2026-05-01", dueDate: "2026-05-31", taxableValue: 85000,  gst: 15300, tdsRate: 2,  tdsAmount: 1700,  netPayable: 98600,  paid: 0,      status: "Approved" },
  { id: "vb2", billNo: "CB-9921",  vendor: "CoolBreeze HVAC",      category: "AMC",         billDate: "2026-04-20", dueDate: "2026-05-20", taxableValue: 60000,  gst: 10800, tdsRate: 2,  tdsAmount: 1200,  netPayable: 69600,  paid: 0,      status: "Overdue" },
  { id: "vb3", billNo: "ELP-1212", vendor: "ElevPro Engineering",  category: "AMC",         billDate: "2026-05-05", dueDate: "2026-06-05", taxableValue: 36000,  gst: 6480,  tdsRate: 2,  tdsAmount: 720,   netPayable: 41760,  paid: 41760,  status: "Paid" },
  { id: "vb4", billNo: "JK-2440",  vendor: "Jay Kay Hardware",     category: "Supplies",    billDate: "2026-05-10", dueDate: "2026-06-09", taxableValue: 24500,  gst: 4410,  tdsRate: 0,  tdsAmount: 0,     netPayable: 28910,  paid: 15000,  status: "Partial" },
  { id: "vb5", billNo: "TC-1101",  vendor: "TechCorp IT Services", category: "IT / Software", billDate: "2026-05-12", dueDate: "2026-06-11", taxableValue: 120000, gst: 21600, tdsRate: 10, tdsAmount: 12000, netPayable: 129600, paid: 0,      status: "Approved" },
  { id: "vb6", billNo: "SF-9091",  vendor: "SafeNet Fire Systems", category: "AMC",         billDate: "2026-05-15", dueDate: "2026-06-14", taxableValue: 45000,  gst: 8100,  tdsRate: 2,  tdsAmount: 900,   netPayable: 52200,  paid: 0,      status: "Draft" },
];

// ============ NEW: RECEIVABLES (AGENT / CORPORATE) ============
type ReceivableEntry = {
  id: string; agent: string; type: "Agent" | "Corporate";
  invoices: number;
  current: number; b30: number; b60: number; b90: number; b90plus: number;
  total: number; creditLimit: number; lastPayment: string;
};
const RECEIVABLES: ReceivableEntry[] = [
  { id: "rec1", agent: "ABC Travels",        type: "Agent",     invoices: 4, current: 18000, b30: 12500, b60: 7000,  b90: 0,     b90plus: 0,     total: 37500,  creditLimit: 500000, lastPayment: "2026-05-15" },
  { id: "rec2", agent: "Pearl Holidays",     type: "Agent",     invoices: 2, current: 8500,  b30: 4500,  b60: 0,     b90: 0,     b90plus: 0,     total: 13000,  creditLimit: 300000, lastPayment: "2026-05-20" },
  { id: "rec3", agent: "Skyline Tours",      type: "Agent",     invoices: 3, current: 12500, b30: 0,     b60: 0,     b90: 0,     b90plus: 0,     total: 12500,  creditLimit: 400000, lastPayment: "2026-05-22" },
  { id: "rec4", agent: "TechCorp FZ-LLC",    type: "Corporate", invoices: 6, current: 45000, b30: 28000, b60: 15500, b90: 0,     b90plus: 0,     total: 88500,  creditLimit: 1000000, lastPayment: "2026-05-10" },
  { id: "rec5", agent: "Emirates Bank",      type: "Corporate", invoices: 3, current: 22000, b30: 18500, b60: 9500,  b90: 4500,  b90plus: 0,     total: 54500,  creditLimit: 800000, lastPayment: "2026-04-28" },
  { id: "rec6", agent: "Global Oil Co.",     type: "Corporate", invoices: 8, current: 65000, b30: 38000, b60: 22000, b90: 14000, b90plus: 8500,  total: 147500, creditLimit: 1500000, lastPayment: "2026-04-15" },
];

// ============ NEW: P&L DATA ============
type PnlRow = { category: string; rooms: number; fb: number; banquet: number; spa: number; other: number };
const PNL_REVENUE: PnlRow[] = [
  { category: "Room revenue",       rooms: 1820000, fb: 0,       banquet: 0,      spa: 0,      other: 0 },
  { category: "F&B revenue",        rooms: 0,       fb: 425000,  banquet: 0,      spa: 0,      other: 0 },
  { category: "Banquet revenue",    rooms: 0,       fb: 0,       banquet: 310000, spa: 0,      other: 0 },
  { category: "Spa / Wellness",     rooms: 0,       fb: 0,       banquet: 0,      spa: 85000,  other: 0 },
  { category: "Other operating",    rooms: 0,       fb: 0,       banquet: 0,      spa: 0,      other: 42000 },
];
const PNL_DIRECT_COSTS: PnlRow[] = [
  { category: "F&B cost of goods",  rooms: 0,       fb: 142000,  banquet: 95000,  spa: 0,      other: 0 },
  { category: "Linen & laundry",    rooms: 38000,   fb: 8000,    banquet: 12000,  spa: 4000,   other: 0 },
  { category: "Amenities",          rooms: 24000,   fb: 0,       banquet: 0,      spa: 6000,   other: 0 },
  { category: "Commissions (OTA)",  rooms: 96000,   fb: 0,       banquet: 0,      spa: 0,      other: 0 },
];
const PNL_INDIRECT_COSTS = [
  { category: "Staff salaries",   amount: 480000 },
  { category: "Utilities (electricity, water, gas)", amount: 145000 },
  { category: "AMC & maintenance", amount: 78000 },
  { category: "Marketing & PR",    amount: 62000 },
  { category: "Office & admin",    amount: 34000 },
  { category: "Rent / Property tax", amount: 220000 },
  { category: "Insurance",         amount: 18000 },
  { category: "Depreciation",      amount: 95000 },
  { category: "Interest on loan",  amount: 42000 },
];

// ============ NEW: BALANCE SHEET ============
const BS_ASSETS = [
  { group: "Current Assets", items: [
    { name: "Cash in hand",            value: 124000 },
    { name: "Cash at bank · HDFC",     value: 1842500 },
    { name: "Cash at bank · ICICI",    value: 342150 },
    { name: "Cash at bank · SBI",      value: 956400 },
    { name: "Receivables (agents)",    value: 353500 },
    { name: "Inventory (F&B + linen)", value: 285000 },
    { name: "Prepaid expenses",        value: 96000 },
  ]},
  { group: "Fixed Assets", items: [
    { name: "Land & Building",         value: 28500000 },
    { name: "Furniture & Fixtures",    value: 4200000 },
    { name: "Kitchen & Banquet equip.", value: 1850000 },
    { name: "Vehicles",                value: 920000 },
    { name: "IT / Telephony",          value: 380000 },
    { name: "Less: Accumulated Depreciation", value: -3850000 },
  ]},
];
const BS_LIABILITIES = [
  { group: "Current Liabilities", items: [
    { name: "Vendor payables",         value: 420670 },
    { name: "GST payable",             value: 247000 },
    { name: "TDS payable",             value: 38400 },
    { name: "Salaries payable",        value: 152000 },
    { name: "Advances from guests",    value: 198000 },
  ]},
  { group: "Long-term Liabilities", items: [
    { name: "Bank term loan",          value: 4200000 },
    { name: "Owner's loan",            value: 2500000 },
  ]},
  { group: "Equity", items: [
    { name: "Owner's capital",         value: 18000000 },
    { name: "Retained earnings",       value: 9645480 },
  ]},
];

// ============ NEW: JOURNAL + CHART OF ACCOUNTS ============
type ChartAccount = { code: string; name: string; type: "Asset" | "Liability" | "Equity" | "Revenue" | "Expense"; balance: number };
const CHART_OF_ACCOUNTS: ChartAccount[] = [
  { code: "1000", name: "Cash in hand",         type: "Asset",     balance: 124000 },
  { code: "1010", name: "Bank · HDFC",          type: "Asset",     balance: 1842500 },
  { code: "1020", name: "Bank · ICICI",         type: "Asset",     balance: 342150 },
  { code: "1100", name: "Receivables · Agents", type: "Asset",     balance: 353500 },
  { code: "1500", name: "Furniture & Fixtures", type: "Asset",     balance: 4200000 },
  { code: "2000", name: "Vendor Payables",      type: "Liability", balance: 420670 },
  { code: "2010", name: "GST Payable",          type: "Liability", balance: 247000 },
  { code: "2020", name: "TDS Payable",          type: "Liability", balance: 38400 },
  { code: "3000", name: "Owner's Capital",      type: "Equity",    balance: 18000000 },
  { code: "4000", name: "Room Revenue",         type: "Revenue",   balance: 1820000 },
  { code: "4010", name: "F&B Revenue",          type: "Revenue",   balance: 425000 },
  { code: "5000", name: "Staff Salaries",       type: "Expense",   balance: 480000 },
  { code: "5010", name: "Utilities",            type: "Expense",   balance: 145000 },
  { code: "5020", name: "AMC & Maintenance",    type: "Expense",   balance: 78000 },
];

type JournalEntry = {
  id: string; date: string; voucherNo: string; narration: string;
  lines: { account: string; debit: number; credit: number }[];
  status: "Draft" | "Posted";
  postedBy: string;
};
const JOURNAL_ENTRIES: JournalEntry[] = [
  {
    id: "je1", date: "2026-05-22", voucherNo: "JV-2026-001",
    narration: "Year-end depreciation provision",
    lines: [
      { account: "Depreciation Expense", debit: 95000, credit: 0 },
      { account: "Accumulated Depreciation", debit: 0, credit: 95000 },
    ],
    status: "Posted", postedBy: "CA Sharma",
  },
  {
    id: "je2", date: "2026-05-23", voucherNo: "JV-2026-002",
    narration: "Owner's capital infusion via bank transfer",
    lines: [
      { account: "Bank · HDFC", debit: 500000, credit: 0 },
      { account: "Owner's Capital", debit: 0, credit: 500000 },
    ],
    status: "Posted", postedBy: "CA Sharma",
  },
  {
    id: "je3", date: "2026-05-24", voucherNo: "JV-2026-003",
    narration: "Prepaid insurance amortisation · monthly",
    lines: [
      { account: "Insurance Expense", debit: 18000, credit: 0 },
      { account: "Prepaid Insurance", debit: 0, credit: 18000 },
    ],
    status: "Draft", postedBy: "Reception",
  },
];

// ============ NEW: CASHIER SHIFTS ============
type CashierShift = {
  id: string; shiftNo: string; cashier: string; date: string; startTime: string; endTime: string;
  opening: number; cashReceived: number; cardReceived: number; upiReceived: number;
  expensesPaid: number; closing: number; expectedClosing: number; variance: number;
  status: "Open" | "Closed" | "Verified";
  tips?: number;
  varianceReason?: string;
  varianceNotes?: string;
  handoverNotes?: string;
  verifiedBy?: string;
  verifiedAt?: string;
};
const CASHIER_SHIFTS: CashierShift[] = [
  { id: "cs1", shiftNo: "#4220", cashier: "Khalid R.",  date: "2026-05-24", startTime: "07:00", endTime: "15:00", opening: 50000, cashReceived: 84500,  cardReceived: 122500, upiReceived: 175000, expensesPaid: 18500, closing: 116000, expectedClosing: 116000, variance: 0,    status: "Closed" },
  { id: "cs2", shiftNo: "#4221", cashier: "Priya M.",   date: "2026-05-24", startTime: "15:00", endTime: "23:00", opening: 116000, cashReceived: 62000, cardReceived: 98000,  upiReceived: 145000, expensesPaid: 12000, closing: 165500, expectedClosing: 166000, variance: -500, status: "Closed" },
  { id: "cs3", shiftNo: "#4222", cashier: "Aman S.",    date: "2026-05-24", startTime: "23:00", endTime: "07:00", opening: 165500, cashReceived: 18000, cardReceived: 24500,  upiReceived: 32000,  expensesPaid: 4500,  closing: 178500, expectedClosing: 179000, variance: -500, status: "Verified" },
  { id: "cs4", shiftNo: "#4223", cashier: "Khalid R.",  date: "2026-05-25", startTime: "07:00", endTime: "15:00", opening: 178500, cashReceived: 92000, cardReceived: 145000, upiReceived: 198000, expensesPaid: 22000, closing: 0,      expectedClosing: 248500, variance: 0,    status: "Open" },
];

// ---------- Account statements data ----------
type LedgerAccount = {
  id: string;
  name: string;
  type: "cash" | "bank" | "vendor" | "customer" | "petty" | "expense" | "income";
  number?: string;
  openingBalance: number;
  closingBalance: number;
  reconciled?: boolean;
  hint?: string;
};

const ACCOUNTS: LedgerAccount[] = [
  { id: "ac1", name: "Cash in Hand", type: "cash", openingBalance: 85000, closingBalance: 142500, reconciled: true, hint: "Reception drawer · Khalid R." },
  { id: "ac2", name: "Bank — HDFC Current A/c", type: "bank", number: "5012•••0419", openingBalance: 2840000, closingBalance: 3215800, reconciled: true, hint: "Operating account" },
  { id: "ac3", name: "Bank — ICICI Savings A/c", type: "bank", number: "0042•••8821", openingBalance: 1250000, closingBalance: 1875000, reconciled: false, hint: "Reserve · 2 entries pending" },
  { id: "ac4", name: "Petty Cash", type: "petty", openingBalance: 25000, closingBalance: 18450, reconciled: true, hint: "F&B + Housekeeping" },
  { id: "ac5", name: "Sundry Debtors (Customers)", type: "customer", openingBalance: 412000, closingBalance: 528700, hint: "Outstanding receivables" },
  { id: "ac6", name: "Sundry Creditors (Vendors)", type: "vendor", openingBalance: 184500, closingBalance: 214200, hint: "Payable to vendors" },
];

type LedgerEntry = {
  id: string; date: string; voucher: string; particulars: string;
  type: "debit" | "credit"; amount: number; balance?: number;
};

// Sample HDFC bank statement entries
const HDFC_STATEMENT: LedgerEntry[] = [
  { id: "le1", date: "01 May 2026", voucher: "Opening", particulars: "Opening balance", type: "debit", amount: 2840000 },
  { id: "le2", date: "02 May 2026", voucher: "RCP-1142", particulars: "Folio settlement — Anjali Iyer · BK100221", type: "debit", amount: 38900 },
  { id: "le3", date: "03 May 2026", voucher: "PV-2026-0418", particulars: "DEWA / utility bill — Apr", type: "credit", amount: 24500 },
  { id: "le4", date: "05 May 2026", voucher: "RCP-1148", particulars: "ABC Travels — advance receipt", type: "debit", amount: 80000 },
  { id: "le5", date: "08 May 2026", voucher: "PV-2026-0421", particulars: "Pearl Textiles — invoice L-4421", type: "credit", amount: 18500 },
  { id: "le6", date: "12 May 2026", voucher: "RCP-1162", particulars: "Folio settlement — Karan Malhotra", type: "debit", amount: 47200 },
  { id: "le7", date: "15 May 2026", voucher: "PV-2026-0425", particulars: "Weekly payroll · Front Office W19", type: "credit", amount: 84000 },
  { id: "le8", date: "18 May 2026", voucher: "RCP-1178", particulars: "TechCorp — conference room booking", type: "debit", amount: 65000 },
  { id: "le9", date: "21 May 2026", voucher: "PV-2026-0428", particulars: "Booking.com — commission settlement", type: "credit", amount: 71000 },
  { id: "le10", date: "22 May 2026", voucher: "PV-2026-0429", particulars: "Weekly payroll · Front Office W20", type: "credit", amount: 84000 },
  { id: "le11", date: "24 May 2026", voucher: "RCP-1212", particulars: "Folio settlement — Sanjana Reddy", type: "debit", amount: 52400 },
  { id: "le12", date: "25 May 2026", voucher: "PV-2026-0431", particulars: "DEWA / utility bill — May", type: "credit", amount: 42000 },
  { id: "le13", date: "25 May 2026", voucher: "Bank Int.", particulars: "Interest credited (savings sweep)", type: "debit", amount: 12300 },
];

// Aging buckets — receivables
const AGING_RECEIVABLES = [
  { bucket: "0–30 days", amount: 285400, pct: 54 },
  { bucket: "31–60 days", amount: 142800, pct: 27 },
  { bucket: "61–90 days", amount: 68200, pct: 13 },
  { bucket: "90+ days", amount: 32300, pct: 6 },
];
const AGING_PAYABLES = [
  { bucket: "0–30 days", amount: 142000, pct: 66 },
  { bucket: "31–60 days", amount: 48200, pct: 23 },
  { bucket: "61–90 days", amount: 19000, pct: 9 },
  { bucket: "90+ days", amount: 5000, pct: 2 },
];

// GSTR Returns
const GSTR_RETURNS = [
  { id: "g1", period: "May 2026", form: "GSTR-1", due: "11 Jun 2026", status: "Draft" as const, total: 1530000, tax: 275400 },
  { id: "g2", period: "May 2026", form: "GSTR-3B", due: "20 Jun 2026", status: "Pending" as const, total: 1530000, tax: 247000 },
  { id: "g3", period: "Apr 2026", form: "GSTR-1", due: "11 May 2026", status: "Filed" as const, total: 1240000, tax: 223200 },
  { id: "g4", period: "Apr 2026", form: "GSTR-3B", due: "20 May 2026", status: "Filed" as const, total: 1240000, tax: 198400 },
  { id: "g5", period: "FY 2025-26", form: "GSTR-9 (Annual)", due: "31 Dec 2026", status: "Upcoming" as const, total: 18540000, tax: 3337200 },
];

const INCOME_CATS = ["Room Revenue", "F&B", "Hall Rental", "Spa & Wellness", "Laundry", "Extra Bed", "Late Checkout", "Other"];
const EXPENSE_CATS = ["Payroll", "Utilities (DEWA)", "F&B Cost", "Maintenance", "OTA Commissions", "Linen & Amenities", "Marketing", "Insurance", "Bank Charges", "Other"];

type EntryType = "income" | "expense" | "refund";

/** Single line item on a vendor bill / invoice */
export type ExpenseLine = {
  id: string;
  description: string;
  hsnSac?: string;
  qty: number;
  rate: number;       // per-unit price (pre-GST)
  gstPct: number;     // 0 / 5 / 12 / 18 / 28
  taxable: number;    // qty * rate
  tax: number;        // taxable * gstPct/100
  amount: number;     // taxable + tax
};

type Entry = {
  id: string; date: string; type: EntryType; category: string;
  description: string; amount: number; mode: string; ref: string;
  // India compliance
  vendor?: string;
  gstin?: string;
  cgst?: number;
  sgst?: number;
  igst?: number;
  hsnSac?: string;
  // Multi-line invoice support
  lines?: ExpenseLine[];
  // Attachment: stored as data URL for prototype
  attachment?: { name: string; dataUrl: string; type: string } | null;
  // Voucher metadata
  voucherNo?: string;
};

/** Helper — build a fresh empty line */
const blankLine = (): ExpenseLine => ({
  id: `ln-${Math.random().toString(36).slice(2, 9)}`,
  description: "",
  hsnSac: "",
  qty: 1,
  rate: 0,
  gstPct: 18,
  taxable: 0,
  tax: 0,
  amount: 0,
});

const SEED_ENTRIES: Entry[] = [
  { id: "e1", date: "25 May", type: "income", category: "Room Revenue", description: "Folio settlement — Yuki Tanaka", amount: 2335, mode: "Card", ref: "INV-100245" },
  { id: "e2", date: "25 May", type: "expense", category: "Utilities (DEWA)", description: "DEWA electricity bill", amount: 4200, mode: "Bank", ref: "DEWA-04A219" },
  { id: "e3", date: "24 May", type: "income", category: "Room Revenue", description: "ABC Travels — advance receipt", amount: 8000, mode: "Bank", ref: "ADV-2401" },
  { id: "e4", date: "24 May", type: "expense", category: "Linen & Amenities", description: "Linen supplier — invoice", amount: 1850, mode: "Bank", ref: "L-4421" },
  { id: "e5", date: "23 May", type: "refund", category: "Room Revenue", description: "Refund — no-show waiver", amount: 650, mode: "Bank", ref: "REF-001" },
  { id: "e6", date: "23 May", type: "income", category: "F&B", description: "F&B daily collection summary", amount: 2845, mode: "Mixed", ref: "FB-25-MAY" },
  { id: "e7", date: "22 May", type: "expense", category: "Payroll", description: "Weekly payroll — front office", amount: 8400, mode: "Bank", ref: "PAY-W21" },
  { id: "e8", date: "22 May", type: "income", category: "Hall Rental", description: "Conference room — TechCorp", amount: 6500, mode: "Bank", ref: "HALL-2402" },
  { id: "e9", date: "21 May", type: "expense", category: "OTA Commissions", description: "Booking.com monthly commission", amount: 7100, mode: "Bank", ref: "BDC-MAY" },
];

function TabHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm text-muted-foreground -mt-1">{children}</p>
  );
}

export default function AccountsPage() {
  const [tab, setTab] = React.useState<TabId>("dashboard");
  const [entries, setEntries] = React.useState<Entry[]>([]);
  const [summary, setSummary] = React.useState<{ income: { category: string; value: number }[]; expense: { category: string; value: number }[]; recent: { id: number; date: string; desc: string; type: string; amount: number }[] } | null>(null);
  React.useEffect(() => {
    apiGet<Entry[]>("/account-entries")
      .then(rows => setEntries(rows.map(r => ({ ...r, id: String(r.id) })).reverse()))
      .catch(() => {});
    apiGet<NonNullable<typeof summary>>("/accounts/summary")
      .then(s => setSummary(s))
      .catch(() => {});
  }, []);

  // Colour palette reused for the live category breakdowns (charts need a colour
  // per slice; the API returns only category + value).
  const PIE_COLORS = ["var(--color-brand)", "var(--color-accent)", "var(--color-info)", "var(--color-warning)", "var(--color-status-checkout-pending)", "var(--color-status-inspected)", "var(--color-status-blocked)"];
  const incomeBreakdown = summary?.income.length
    ? summary.income.map((r, i) => ({ label: r.category, value: r.value, color: PIE_COLORS[i % PIE_COLORS.length] }))
    : INCOME_BREAKDOWN;
  const expenseBreakdown = summary?.expense.length
    ? summary.expense.map((r, i) => ({ label: r.category, value: r.value, color: PIE_COLORS[i % PIE_COLORS.length] }))
    : EXPENSE_BREAKDOWN;
  const recentTxn = summary?.recent.length
    ? summary.recent.map(r => ({ id: String(r.id), date: r.date, desc: r.desc, type: r.type as "Income" | "Expense" | "Refund", amount: r.amount }))
    : RECENT_TXN;
  const [showEntry, setShowEntry] = React.useState<EntryType | null>(null);
  const [showExpenseFull, setShowExpenseFull] = React.useState(false);
  const [voucherEntry, setVoucherEntry] = React.useState<Entry | null>(null);
  const [statementAccountId, setStatementAccountId] = React.useState<string>(ACCOUNTS[1].id); // default HDFC
  const [statementPeriod, setStatementPeriod] = React.useState<string>("May 2026");
  const [statementSearch, setStatementSearch] = React.useState("");
  const [statementType, setStatementType] = React.useState<"all" | "bank" | "receivable" | "payable">("all");
  const [statementFromDate, setStatementFromDate] = React.useState<string>("2026-05-01");
  const [statementToDate, setStatementToDate] = React.useState<string>("2026-05-31");
  const [toast, setToast] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };

  // Headline KPIs derive from the real posted entries (fall back to the
  // illustrative breakdown only before any entry has loaded).
  const sumByType = (t: EntryType) => entries.filter(e => e.type === t).reduce((s, e) => s + e.amount, 0);
  const seedIncome = INCOME_BREAKDOWN.reduce((s, i) => s + i.value, 0);
  const seedExpense = EXPENSE_BREAKDOWN.reduce((s, i) => s + i.value, 0);
  const income = entries.length ? sumByType("income") : seedIncome;
  const expense = entries.length ? sumByType("expense") + sumByType("refund") : seedExpense;
  const profit = income - expense;
  const margin = income ? ((profit / income) * 100).toFixed(1) : "0.0";

  const handleAdd = (e: Omit<Entry, "id">) => {
    apiPost<Entry>("/account-entries", e)
      .then(row => setEntries(prev => [{ ...row, id: String(row.id) }, ...prev]))
      .catch(() => showToast("Could not save entry"));
    setShowEntry(null);
    showToast(`${e.type === "income" ? "Income" : e.type === "expense" ? "Expense" : "Refund"} of ${money(e.amount)} recorded`);
  };

  const filteredEntries = entries.filter(e =>
    !search || `${e.description} ${e.category} ${e.ref}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-medium tracking-tight">Accounts</h1>
          <p className="text-muted-foreground text-sm mt-1">P&amp;L, day book, expenses, income, tax · May 2026</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => showToast(`Accounts export ready · ${entries.length} entries · CSV downloaded`)}>
            <FileDown className="h-4 w-4" />Export
          </Button>
          <Button variant="outline" onClick={() => setShowEntry("income")}>+ Income</Button>
          <Button onClick={() => setShowExpenseFull(true)}><Plus className="h-4 w-4" />Expense</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard label="Total Income" value={money(income)} icon={TrendingUp} accent="success" delta={4.9} />
        <KPICard label="Total Expense" value={money(expense)} icon={TrendingDown} accent="warning" delta={-2.7} />
        <KPICard label="Net Profit" value={money(profit)} icon={Wallet} accent="brand" delta={8.4} hint={`Margin ${margin}%`} />
        <KPICard label="VAT Liability" value={money(income * 0.05)} icon={Receipt} accent="info" />
      </div>

      {/* AI Insight */}
      <AIInsight
        variant="panel"
        title="AI Financial Anomaly Watch"
        text={
          <>
            <span className="font-semibold">OTA Commissions</span> are tracking <span className="font-semibold text-warning">+18% vs last month</span> — driven by 11 more Booking.com reservations.
            Cash balance trend remains <span className="font-semibold text-success">healthy</span>; next 30 days projected positive cash position averaging <span className="font-semibold">{money(58400)}</span>.
            One uncategorised expense detected — auto-suggested category: <span className="font-semibold">Maintenance</span>.
          </>
        }
        action={{ label: "Review uncategorised entries", onClick: () => setTab("expenses") }}
      />

      {/* Tabs */}
      <div className="border-b border-border flex items-center gap-1 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
              tab === t.id ? "border-brand text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* One-line description of the active section */}
      <TabHint>{TABS.find(t => t.id === tab)?.hint}</TabHint>

      {/* === DASHBOARD === */}
      {tab === "dashboard" && (
        <>
          {/* P&L trend */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Income vs Expense — last 6 months</CardTitle>
                <Badge tone="success">+8.4% MoM profit</Badge>
              </div>
            </CardHeader>
            <CardContent className="pl-0">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={PL_TREND} margin={{ top: 8, right: 16, bottom: 0, left: 8 }} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={11} axisLine={false} tickLine={false} />
                    <YAxis stroke="var(--color-muted-foreground)" fontSize={11} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: "var(--color-surface-elevated)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12, color: "var(--color-foreground)" }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="income" name="Income" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" name="Expense" fill="var(--color-warning)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Cash flow forecast */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Cash Balance Trend — last 30 days</CardTitle>
                <Badge tone="brand"><Bot className="h-3 w-3" />AI projection enabled</Badge>
              </div>
            </CardHeader>
            <CardContent className="pl-0">
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={CASH_FLOW} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="day" stroke="var(--color-muted-foreground)" fontSize={11} axisLine={false} tickLine={false} />
                    <YAxis stroke="var(--color-muted-foreground)" fontSize={11} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: "var(--color-surface-elevated)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12, color: "var(--color-foreground)" }} />
                    <Line type="monotone" dataKey="balance" stroke="var(--color-brand)" strokeWidth={2} dot={false} name="Cash balance" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Income + Expense mix */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>Income Mix</CardTitle></CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={incomeBreakdown} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2}>
                        {incomeBreakdown.map((d, i) => <Cell key={i} fill={d.color} stroke="var(--color-surface)" strokeWidth={2} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: "var(--color-surface-elevated)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12, color: "var(--color-foreground)" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="mt-2 space-y-1.5">
                  {incomeBreakdown.map(i => (
                    <li key={i.label} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ background: i.color }} />
                        <span className="text-muted-foreground">{i.label}</span>
                      </span>
                      <span className="font-medium tabular">{money(i.value)}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Expense Breakdown</CardTitle></CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={expenseBreakdown} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2}>
                        {expenseBreakdown.map((d, i) => <Cell key={i} fill={d.color} stroke="var(--color-surface)" strokeWidth={2} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: "var(--color-surface-elevated)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12, color: "var(--color-foreground)" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="mt-2 space-y-1.5">
                  {expenseBreakdown.map(i => (
                    <li key={i.label} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ background: i.color }} />
                        <span className="text-muted-foreground">{i.label}</span>
                      </span>
                      <span className="font-medium tabular">{money(i.value)}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Recent Transactions */}
          <Card className="p-0 overflow-hidden">
            <CardHeader className="bg-surface-elevated">
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <table className="w-full text-sm">
              <thead className="bg-surface-sunken/50 border-y border-border">
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-2.5 font-semibold">Date</th>
                  <th className="px-5 py-2.5 font-semibold">Description</th>
                  <th className="px-5 py-2.5 font-semibold">Type</th>
                  <th className="px-5 py-2.5 font-semibold text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentTxn.map(t => (
                  <tr key={t.id} className="hover:bg-surface-sunken/40">
                    <td className="px-5 py-3 text-muted-foreground tabular">{t.date}</td>
                    <td className="px-5 py-3">{t.desc}</td>
                    <td className="px-5 py-3"><Badge tone={t.type === "Income" ? "success" : t.type === "Refund" ? "neutral" : "warning"}>{t.type}</Badge></td>
                    <td className={cn("px-5 py-3 text-right tabular font-medium", t.amount >= 0 ? "text-success" : "text-warning")}>
                      {t.amount >= 0 ? "+" : ""}{money(Math.abs(t.amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Cash Position + Aging Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Cash & Bank position */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-3">
                <CardTitle>Cash &amp; Bank Position</CardTitle>
                <Button size="sm" variant="ghost" onClick={() => setTab("cashflow")}>
                  <ChevronRight className="h-3.5 w-3.5" />Open
                </Button>
              </div>
              <ul className="space-y-2.5">
                {ACCOUNTS.filter(a => a.type === "cash" || a.type === "bank" || a.type === "petty").map(a => (
                  <li key={a.id} className="flex items-center gap-3 p-2.5 rounded-md border border-border hover:bg-surface-sunken/40 cursor-pointer" onClick={() => { setStatementAccountId(a.id); setTab("cashflow"); }}>
                    <span className={cn(
                      "h-8 w-8 rounded-md flex items-center justify-center shrink-0",
                      a.type === "bank" ? "bg-info-soft text-info" :
                      a.type === "cash" ? "bg-success-soft text-success" :
                      "bg-accent-soft text-accent"
                    )}>
                      <Wallet className="h-4 w-4" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{a.name}</p>
                      {a.number && <p className="text-[10px] text-muted-foreground font-mono tabular">{a.number}</p>}
                    </div>
                    <span className="tabular font-semibold text-sm">{money(a.closingBalance)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Total Liquid</span>
                <span className="text-lg font-bold tabular">{money(ACCOUNTS.filter(a => a.type === "cash" || a.type === "bank" || a.type === "petty").reduce((s, a) => s + a.closingBalance, 0))}</span>
              </div>
            </Card>

            {/* Receivables aging */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <CardTitle>Receivables Aging</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Customer outstanding</p>
                </div>
                <Badge tone="warning">{money(AGING_RECEIVABLES.reduce((s, b) => s + b.amount, 0))}</Badge>
              </div>
              <ul className="space-y-3">
                {AGING_RECEIVABLES.map((b, i) => (
                  <li key={b.bucket}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className={cn("font-medium", i === 0 ? "text-success" : i === 1 ? "text-info" : i === 2 ? "text-warning" : "text-danger")}>
                        {b.bucket}
                      </span>
                      <span className="tabular font-semibold">{money(b.amount)}</span>
                    </div>
                    <div className="h-2 bg-surface-sunken rounded-full overflow-hidden">
                      <div
                        className={cn("h-full",
                          i === 0 ? "bg-success" : i === 1 ? "bg-info" : i === 2 ? "bg-warning" : "bg-danger"
                        )}
                        style={{ width: `${b.pct}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
              <p className="text-[10px] text-muted-foreground italic mt-3 pt-3 border-t border-border">
                <span className="font-medium text-danger">₹32,300 over 90 days</span> — escalate to manager
              </p>
            </Card>

            {/* Payables aging */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <CardTitle>Payables Aging</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Vendor outstanding</p>
                </div>
                <Badge tone="info">{money(AGING_PAYABLES.reduce((s, b) => s + b.amount, 0))}</Badge>
              </div>
              <ul className="space-y-3">
                {AGING_PAYABLES.map((b, i) => (
                  <li key={b.bucket}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className={cn("font-medium", i === 0 ? "text-success" : i === 1 ? "text-info" : i === 2 ? "text-warning" : "text-danger")}>
                        {b.bucket}
                      </span>
                      <span className="tabular font-semibold">{money(b.amount)}</span>
                    </div>
                    <div className="h-2 bg-surface-sunken rounded-full overflow-hidden">
                      <div
                        className={cn("h-full",
                          i === 0 ? "bg-success" : i === 1 ? "bg-info" : i === 2 ? "bg-warning" : "bg-danger"
                        )}
                        style={{ width: `${b.pct}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
              <p className="text-[10px] text-muted-foreground italic mt-3 pt-3 border-t border-border">
                Average payment cycle: <span className="font-medium text-foreground">22 days</span> · Within terms
              </p>
            </Card>
          </div>
        </>
      )}

      {/* === DAY BOOK === (merged into Expenses in Task 2; kept until then) */}
      {(tab as string) === "daybook" && (
        <>
          <Card className="p-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle-foreground" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by description, category, reference…" className="pl-9 h-9" />
              </div>
              <Select className="h-9 w-auto"><option>All types</option><option>Income</option><option>Expense</option><option>Refund</option></Select>
              <Select className="h-9 w-auto"><option>All categories</option>{[...INCOME_CATS, ...EXPENSE_CATS].map(c => <option key={c}>{c}</option>)}</Select>
              <Select className="h-9 w-auto"><option>Today</option><option>This week</option><option>This month</option></Select>
            </div>
          </Card>
          <Card className="p-0 overflow-hidden">
            <CardHeader className="bg-surface-elevated">
              <div className="flex items-center justify-between">
                <CardTitle>Day Book</CardTitle>
                <p className="text-xs text-muted-foreground">{filteredEntries.length} entries</p>
              </div>
            </CardHeader>
            <table className="w-full text-sm">
              <thead className="bg-surface-sunken/50 border-y border-border">
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-2.5 font-semibold">Date</th>
                  <th className="px-5 py-2.5 font-semibold">Type</th>
                  <th className="px-5 py-2.5 font-semibold">Category</th>
                  <th className="px-5 py-2.5 font-semibold">Description</th>
                  <th className="px-5 py-2.5 font-semibold">Mode</th>
                  <th className="px-5 py-2.5 font-semibold">Ref</th>
                  <th className="px-5 py-2.5 font-semibold text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredEntries.map(e => (
                  <tr key={e.id} className="hover:bg-surface-sunken/40">
                    <td className="px-5 py-3 text-muted-foreground tabular">{e.date}</td>
                    <td className="px-5 py-3">
                      <span className={cn("inline-flex items-center gap-1 text-xs", e.type === "income" ? "text-success" : e.type === "expense" ? "text-warning" : "text-muted-foreground")}>
                        {e.type === "income" ? <ArrowUp className="h-3 w-3" /> : e.type === "expense" ? <ArrowDown className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                        {e.type}
                      </span>
                    </td>
                    <td className="px-5 py-3"><Badge tone="neutral">{e.category}</Badge></td>
                    <td className="px-5 py-3">{e.description}</td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">{e.mode}</td>
                    <td className="px-5 py-3 text-xs tabular text-muted-foreground">{e.ref}</td>
                    <td className={cn("px-5 py-3 text-right tabular font-medium", e.type === "income" ? "text-success" : "text-warning")}>
                      {e.type === "income" ? "+" : "-"}{money(e.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}

      {/* === EXPENSES === */}
      {tab === "expenses" && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KPICard label="Expense MTD" value={money(expense)} icon={TrendingDown} accent="warning" />
            <KPICard label="Biggest Category" value="Payroll" icon={Wallet} accent="brand" hint={money(385000)} />
            <KPICard label="Pending Bills" value={money(124800)} icon={Receipt} accent="info" />
            <KPICard label="ITC Available" value={money(28400)} icon={Sparkles} accent="success" hint="GST input credit" />
          </div>

          <Card className="p-0 overflow-hidden">
            <CardHeader className="bg-surface-elevated">
              <div className="flex items-center justify-between">
                <CardTitle>Recorded Expenses</CardTitle>
                <Button size="sm" onClick={() => setShowExpenseFull(true)}><Plus className="h-3.5 w-3.5" />Add Expense</Button>
              </div>
            </CardHeader>
            <table className="w-full text-sm">
              <thead className="bg-surface-sunken/50 border-b border-border">
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Vendor / Description</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold tabular">GSTIN / Inv #</th>
                  <th className="px-4 py-3 font-semibold text-right">Amount</th>
                  <th className="px-4 py-3 font-semibold">Bill</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {entries.filter(e => e.type === "expense").map(e => (
                  <tr key={e.id} className="hover:bg-surface-sunken/40">
                    <td className="px-4 py-3 text-muted-foreground tabular">{e.date}</td>
                    <td className="px-4 py-3">
                      {e.vendor && <p className="font-medium">{e.vendor}</p>}
                      <p className={cn("text-xs", e.vendor ? "text-muted-foreground" : "")}>{e.description}</p>
                      {e.lines && e.lines.length > 1 && (
                        <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-medium text-info bg-info-soft px-1.5 py-0.5 rounded-full">
                          <FileText className="h-2.5 w-2.5" />
                          {e.lines.length} line items
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3"><Badge tone="neutral">{e.category}</Badge></td>
                    <td className="px-4 py-3 text-xs tabular">
                      {e.gstin && <p className="font-mono">{e.gstin}</p>}
                      {e.ref && <p className="text-muted-foreground">{e.ref}</p>}
                      {e.hsnSac && <p className="text-[10px] text-muted-foreground">HSN/SAC {e.hsnSac}</p>}
                    </td>
                    <td className="px-4 py-3 text-right tabular font-medium text-warning">{money(e.amount)}</td>
                    <td className="px-4 py-3">
                      {e.attachment ? (
                        <a
                          href={e.attachment.dataUrl}
                          download={e.attachment.name}
                          className="inline-flex items-center gap-1 text-xs text-success hover:underline"
                          title={e.attachment.name}
                        >
                          <FileText className="h-3.5 w-3.5" />Attached
                        </a>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-warning">
                          <AlertCircle className="h-3.5 w-3.5" />Missing
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="ghost" onClick={() => setVoucherEntry(e)}>
                        <Printer className="h-3.5 w-3.5" />Voucher
                      </Button>
                    </td>
                  </tr>
                ))}
                {entries.filter(e => e.type === "expense").length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">No expenses recorded yet.</td></tr>
                )}
              </tbody>
            </table>
          </Card>

          <Card className="p-0 overflow-hidden">
            <CardHeader className="bg-surface-elevated">
              <CardTitle>Expense Categories — MTD</CardTitle>
            </CardHeader>
            <ul className="divide-y divide-border">
              {expenseBreakdown.map(c => {
                const pctOfTotal = (c.value / expense) * 100;
                return (
                  <li key={c.label} className="flex items-center gap-3 px-5 py-3">
                    <span className="h-3 w-3 rounded-full shrink-0" style={{ background: c.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">{c.label}</p>
                        <p className="text-sm font-semibold tabular">{money(c.value)}</p>
                      </div>
                      <div className="mt-1 h-1.5 bg-surface-sunken rounded-full overflow-hidden">
                        <div className="h-full" style={{ width: `${pctOfTotal}%`, background: c.color }} />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{pctOfTotal.toFixed(1)}% of total expenses</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        </>
      )}

      {/* === INCOME === */}
      {tab === "income" && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <KPICard label="Income MTD" value={money(income)} icon={TrendingUp} accent="success" />
            <KPICard label="Biggest Stream" value="Room" icon={Wallet} accent="brand" hint={money(84520)} />
            <KPICard label="Outstanding Receivables" value={money(82400)} icon={Receipt} accent="warning" />
          </div>
          <Card className="p-0 overflow-hidden">
            <CardHeader className="bg-surface-elevated">
              <CardTitle>Income Sources</CardTitle>
            </CardHeader>
            <ul className="divide-y divide-border">
              {incomeBreakdown.map(c => {
                const pctOfTotal = (c.value / income) * 100;
                return (
                  <li key={c.label} className="flex items-center gap-3 px-5 py-3">
                    <span className="h-3 w-3 rounded-full shrink-0" style={{ background: c.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">{c.label}</p>
                        <p className="text-sm font-semibold tabular">{money(c.value)}</p>
                      </div>
                      <div className="mt-1 h-1.5 bg-surface-sunken rounded-full overflow-hidden">
                        <div className="h-full" style={{ width: `${pctOfTotal}%`, background: c.color }} />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{pctOfTotal.toFixed(1)}% of total income</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        </>
      )}

      {/* === CASH FLOW === */}
      {tab === "cashflow" && (() => {
        const selectedAccount = ACCOUNTS.find(a => a.id === statementAccountId) ?? ACCOUNTS[0];
        // Compute running balance for HDFC sample
        let runningBalance = selectedAccount.openingBalance;
        const entriesWithBalance = HDFC_STATEMENT.map((e, i) => {
          if (i === 0) return { ...e, balance: runningBalance };
          runningBalance = e.type === "debit" ? runningBalance + e.amount : runningBalance - e.amount;
          return { ...e, balance: runningBalance };
        });
        const periodCredits = HDFC_STATEMENT.filter((_, i) => i > 0 && HDFC_STATEMENT[i].type === "credit").reduce((s, e) => s + e.amount, 0);
        const periodDebits = HDFC_STATEMENT.filter((_, i) => i > 0 && HDFC_STATEMENT[i].type === "debit").reduce((s, e) => s + e.amount, 0);
        const closingBalance = entriesWithBalance[entriesWithBalance.length - 1].balance ?? selectedAccount.openingBalance;
        const customPeriod = statementPeriod === "Custom range…";

        // Aggregate totals
        const totalAssets = ACCOUNTS.filter(a => a.type === "cash" || a.type === "bank" || a.type === "petty").reduce((t, a) => t + a.closingBalance, 0);
        const totalReceivable = ACCOUNTS.filter(a => a.type === "customer").reduce((t, a) => t + a.closingBalance, 0);
        const totalPayable = ACCOUNTS.filter(a => a.type === "vendor").reduce((t, a) => t + a.closingBalance, 0);

        // Filter list by search + type
        const filteredAccounts = ACCOUNTS.filter(a => {
          if (statementType === "bank" && a.type !== "cash" && a.type !== "bank" && a.type !== "petty") return false;
          if (statementType === "receivable" && a.type !== "customer") return false;
          if (statementType === "payable" && a.type !== "vendor") return false;
          if (statementSearch) {
            const q = statementSearch.toLowerCase();
            if (!`${a.name} ${a.number ?? ""} ${a.hint ?? ""}`.toLowerCase().includes(q)) return false;
          }
          return true;
        });

        const visibleClosing = filteredAccounts.reduce((t, a) => t + a.closingBalance, 0);
        const visibleOpening = filteredAccounts.reduce((t, a) => t + a.openingBalance, 0);
        const periodLabel = customPeriod
          ? `${statementFromDate} → ${statementToDate}`
          : statementPeriod;

        return (
          <>
            {/* Top totals strip — Total accounts · Receivable · Payable · Net */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KPICard label="Total cash & bank" value={money(totalAssets)} icon={Wallet} accent="info" hint={`${ACCOUNTS.filter(a => a.type === "cash" || a.type === "bank" || a.type === "petty").length} accounts`} />
              <KPICard label="Total receivable" value={money(totalReceivable)} icon={ArrowUp} accent="success" hint={`${ACCOUNTS.filter(a => a.type === "customer").length} customers`} />
              <KPICard label="Total payable" value={money(totalPayable)} icon={ArrowDown} accent={totalPayable > 0 ? "warning" : "neutral"} hint={`${ACCOUNTS.filter(a => a.type === "vendor").length} vendors`} />
              <KPICard label="Net working capital" value={money(totalAssets + totalReceivable - totalPayable)} icon={TrendingUp} accent="brand" hint="cash + AR − AP" />
            </div>

            {/* Filter + search bar */}
            <Card className="p-3 space-y-2.5">
              {/* Account-type chips */}
              <div className="flex flex-wrap items-center gap-1.5">
                {([
                  { id: "all",        label: "All accounts",    count: ACCOUNTS.length,                                                                  dot: null },
                  { id: "bank",       label: "Cash & bank",     count: ACCOUNTS.filter(a => a.type === "cash" || a.type === "bank" || a.type === "petty").length, dot: "bg-info" },
                  { id: "receivable", label: "Receivable",      count: ACCOUNTS.filter(a => a.type === "customer").length,                                dot: "bg-success" },
                  { id: "payable",    label: "Account payable", count: ACCOUNTS.filter(a => a.type === "vendor").length,                                  dot: "bg-warning" },
                ] as const).map(t => (
                  <button key={t.id} onClick={() => setStatementType(t.id as typeof statementType)} className={cn(
                    "h-8 px-3 rounded-full text-xs font-medium border transition-colors inline-flex items-center gap-2",
                    statementType === t.id ? "bg-foreground text-background border-foreground shadow-xs" : "border-border hover:bg-surface-sunken text-muted-foreground"
                  )}>
                    {t.dot && <span className={cn("h-1.5 w-1.5 rounded-full", t.dot)} />}
                    {t.label}
                    <span className={cn(
                      "tabular text-[10px] rounded-full px-1.5 h-4 inline-flex items-center font-semibold",
                      statementType === t.id ? "bg-background/15 text-background" : "bg-surface-sunken text-muted-foreground"
                    )}>{t.count}</span>
                  </button>
                ))}
              </div>

              {/* Search + period + actions */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
                <div className="relative flex-1 min-w-[240px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle-foreground" />
                  <Input
                    value={statementSearch}
                    onChange={e => setStatementSearch(e.target.value)}
                    placeholder="Search company / vendor / account · name, A/c no, notes…"
                    className="pl-9 h-9"
                  />
                </div>
                <Select value={statementPeriod} onChange={e => setStatementPeriod(e.target.value)} className="h-9 w-auto text-xs" title="Period">
                  <option>May 2026</option>
                  <option>Apr 2026</option>
                  <option>Q1 FY 26-27</option>
                  <option>FY 25-26</option>
                  <option>Custom range…</option>
                </Select>
                {(statementSearch || statementType !== "all") && (
                  <Button size="sm" variant="ghost" onClick={() => { setStatementSearch(""); setStatementType("all"); }}>
                    <X className="h-3 w-3" />Clear
                  </Button>
                )}
                <div className="flex-1" />
                <Button size="sm" variant="outline" onClick={() => window.print()}><FileDown className="h-3.5 w-3.5" />PDF</Button>
                <Button size="sm" variant="outline" onClick={() => showToast("Statement queued · Email + WhatsApp to account holder")}>Email</Button>
                <Button size="sm" onClick={() => window.print()}><Printer className="h-3.5 w-3.5" />Print</Button>
              </div>

              {/* Custom date range (only when chosen) */}
              {customPeriod && (
                <div className="flex flex-wrap items-end gap-2 pt-2 border-t border-border">
                  <div className="space-y-1">
                    <Label className="text-[11px]">From date</Label>
                    <Input type="date" value={statementFromDate} onChange={e => setStatementFromDate(e.target.value)} className="h-9 tabular w-40" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">To date</Label>
                    <Input type="date" value={statementToDate} onChange={e => setStatementToDate(e.target.value)} className="h-9 tabular w-40" />
                  </div>
                  <Badge tone="info" className="ml-2">{statementFromDate} → {statementToDate}</Badge>
                </div>
              )}
            </Card>

            {/* Account drill-down selector — visible only when an account is open */}
            <Card className="p-3 bg-surface-elevated/40">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground shrink-0">Drill into account</p>
                <Select value={statementAccountId} onChange={e => setStatementAccountId(e.target.value)} className="h-9 flex-1 max-w-md">
                  <optgroup label="Cash & Bank">
                    {ACCOUNTS.filter(a => a.type === "cash" || a.type === "bank" || a.type === "petty").map(a => (
                      <option key={a.id} value={a.id}>{a.name}{a.number ? ` · ${a.number}` : ""}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Customers (Receivable)">
                    {ACCOUNTS.filter(a => a.type === "customer").map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Vendors (Payable)">
                    {ACCOUNTS.filter(a => a.type === "vendor").map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </optgroup>
                </Select>
                <Button size="sm" variant="outline" onClick={() => showToast("Statement reconciliation started")}>
                  <CheckCircle2 className="h-3.5 w-3.5" />Reconcile
                </Button>
              </div>
            </Card>

            {/* Account header strip */}
            <Card className="p-5">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div className="flex items-start gap-3">
                  <span className={cn(
                    "h-10 w-10 rounded-md flex items-center justify-center shrink-0",
                    selectedAccount.type === "bank" && "bg-info-soft text-info",
                    selectedAccount.type === "cash" && "bg-success-soft text-success",
                    selectedAccount.type === "petty" && "bg-accent-soft text-accent",
                    selectedAccount.type === "customer" && "bg-brand-soft text-brand-soft-foreground",
                    selectedAccount.type === "vendor" && "bg-warning-soft text-warning",
                  )}>
                    <Wallet className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-semibold text-base">{selectedAccount.name}</p>
                    {selectedAccount.number && (
                      <p className="text-xs text-muted-foreground tabular font-mono">{selectedAccount.number}</p>
                    )}
                    <p className="text-[11px] text-muted-foreground mt-0.5">{selectedAccount.hint}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedAccount.reconciled
                    ? <Badge tone="success"><CheckCircle2 className="h-3 w-3" />Reconciled</Badge>
                    : <Badge tone="warning"><AlertCircle className="h-3 w-3" />Pending Reconciliation</Badge>
                  }
                  <Badge tone="neutral">{periodLabel}</Badge>
                </div>
              </div>

              {/* Balance summary */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-5 pt-5 border-t border-border">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Opening</p>
                  <p className="text-lg font-semibold tabular mt-1">{money(selectedAccount.openingBalance)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-success font-semibold">Credits / Receipts</p>
                  <p className="text-lg font-semibold tabular mt-1 text-success">+ {money(periodDebits)}</p>
                  <p className="text-[10px] text-muted-foreground">{HDFC_STATEMENT.filter((_, i) => i > 0 && HDFC_STATEMENT[i].type === "debit").length} entries</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-warning font-semibold">Debits / Payments</p>
                  <p className="text-lg font-semibold tabular mt-1 text-warning">− {money(periodCredits)}</p>
                  <p className="text-[10px] text-muted-foreground">{HDFC_STATEMENT.filter((_, i) => i > 0 && HDFC_STATEMENT[i].type === "credit").length} entries</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Net Movement</p>
                  <p className={cn("text-lg font-semibold tabular mt-1", periodDebits - periodCredits >= 0 ? "text-success" : "text-warning")}>
                    {periodDebits - periodCredits >= 0 ? "+" : ""}{money(periodDebits - periodCredits)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-brand-soft-foreground font-semibold">Closing</p>
                  <p className="text-xl font-bold tabular mt-1 text-foreground">{money(closingBalance)}</p>
                </div>
              </div>
            </Card>

            {/* Ledger table */}
            <Card className="p-0 overflow-hidden">
              <CardHeader className="bg-surface-elevated">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Account Ledger</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">All transactions in chronological order · {HDFC_STATEMENT.length - 1} movements</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-subtle-foreground" />
                      <Input placeholder="Search by voucher / particulars…" className="pl-8 h-8 w-64 text-xs" />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <table className="w-full text-sm">
                <thead className="bg-surface-sunken/50 border-b border-border">
                  <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-5 py-2.5 font-semibold">Date</th>
                    <th className="px-5 py-2.5 font-semibold">Voucher</th>
                    <th className="px-5 py-2.5 font-semibold">Particulars</th>
                    <th className="px-5 py-2.5 font-semibold text-right">Credit (₹)</th>
                    <th className="px-5 py-2.5 font-semibold text-right">Debit (₹)</th>
                    <th className="px-5 py-2.5 font-semibold text-right">Balance (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {entriesWithBalance.map((e, i) => (
                    <tr key={e.id} className={cn("hover:bg-surface-sunken/40", i === 0 && "bg-surface-elevated/50 font-medium")}>
                      <td className="px-5 py-3 text-muted-foreground tabular whitespace-nowrap">{e.date}</td>
                      <td className="px-5 py-3 text-xs tabular font-mono">{e.voucher}</td>
                      <td className="px-5 py-3">{e.particulars}</td>
                      <td className="px-5 py-3 text-right tabular text-success font-medium">
                        {i > 0 && e.type === "debit" ? money(e.amount) : "—"}
                      </td>
                      <td className="px-5 py-3 text-right tabular text-warning font-medium">
                        {i > 0 && e.type === "credit" ? money(e.amount) : "—"}
                      </td>
                      <td className="px-5 py-3 text-right tabular font-semibold">{money(e.balance ?? 0)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-surface-elevated border-t-2 border-border">
                  <tr>
                    <td colSpan={3} className="px-5 py-3 text-right text-xs uppercase tracking-wider font-semibold text-muted-foreground">Period Totals</td>
                    <td className="px-5 py-3 text-right tabular font-semibold text-success">{money(periodDebits)}</td>
                    <td className="px-5 py-3 text-right tabular font-semibold text-warning">{money(periodCredits)}</td>
                    <td className="px-5 py-3 text-right tabular font-bold text-base">{money(closingBalance)}</td>
                  </tr>
                </tfoot>
              </table>
            </Card>

            {/* All accounts position — filtered by search + type */}
            <Card className="p-0 overflow-hidden">
              <div className="px-5 py-3 bg-surface-elevated border-b border-border flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="text-sm font-semibold inline-flex items-center gap-1.5">
                    {statementType === "all" ? "All accounts" :
                     statementType === "bank" ? "Cash & bank accounts" :
                     statementType === "receivable" ? "Receivables · customers" : "Account payable · vendors"}
                    <Badge tone="neutral">{filteredAccounts.length}</Badge>
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Current position{statementSearch ? ` · filtered by "${statementSearch}"` : ""}
                  </p>
                </div>
                {filteredAccounts.length > 0 && (
                  <div className="text-right text-xs">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Filtered total</p>
                    <p className={cn("font-bold tabular text-base",
                      statementType === "payable" ? "text-warning" : "text-foreground"
                    )}>{money(visibleClosing)}</p>
                  </div>
                )}
              </div>
              {filteredAccounts.length === 0 ? (
                <div className="p-12 text-center">
                  <Search className="h-8 w-8 mx-auto text-subtle-foreground mb-2" />
                  <p className="font-medium">No accounts match this search / filter</p>
                  <p className="text-xs text-muted-foreground mt-1">Try widening the type filter or clearing search</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-surface-sunken/50 border-b border-border">
                    <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="px-5 py-2.5 font-semibold">Account / Company</th>
                      <th className="px-5 py-2.5 font-semibold">Type</th>
                      <th className="px-5 py-2.5 font-semibold text-right">Opening</th>
                      <th className="px-5 py-2.5 font-semibold text-right">Closing</th>
                      <th className="px-5 py-2.5 font-semibold text-right">Movement</th>
                      <th className="px-5 py-2.5 font-semibold">Status</th>
                      <th className="px-5 py-2.5"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredAccounts.map(a => {
                      const movement = a.closingBalance - a.openingBalance;
                      return (
                        <tr key={a.id} className={cn("hover:bg-surface-sunken/40 transition-colors", a.id === statementAccountId && "bg-brand-soft/30")}>
                          <td className="px-5 py-3">
                            <p className="font-medium">{a.name}</p>
                            {a.number && <p className="text-[10px] text-muted-foreground font-mono tabular">{a.number}</p>}
                            {a.hint && <p className="text-[10px] text-muted-foreground italic mt-0.5">{a.hint}</p>}
                          </td>
                          <td className="px-5 py-3">
                            <Badge tone={
                              a.type === "bank" ? "info" :
                              a.type === "cash" ? "success" :
                              a.type === "petty" ? "accent" :
                              a.type === "customer" ? "brand" :
                              "warning"
                            }>{a.type === "vendor" ? "payable" : a.type === "customer" ? "receivable" : a.type}</Badge>
                          </td>
                          <td className="px-5 py-3 text-right tabular text-muted-foreground">{money(a.openingBalance)}</td>
                          <td className="px-5 py-3 text-right tabular font-semibold">{money(a.closingBalance)}</td>
                          <td className={cn("px-5 py-3 text-right tabular font-medium", movement >= 0 ? "text-success" : "text-warning")}>
                            {movement >= 0 ? "+" : ""}{money(movement)}
                          </td>
                          <td className="px-5 py-3">
                            {a.reconciled === undefined
                              ? <span className="text-xs text-muted-foreground">—</span>
                              : a.reconciled
                                ? <Badge tone="success"><CheckCircle2 className="h-3 w-3" />Reconciled</Badge>
                                : <Badge tone="warning"><AlertCircle className="h-3 w-3" />Pending</Badge>
                            }
                          </td>
                          <td className="px-5 py-3 text-right">
                            <Button size="sm" variant="ghost" onClick={() => setStatementAccountId(a.id)}>Open</Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-surface-elevated border-t-2 border-border">
                    <tr>
                      <td colSpan={2} className="px-5 py-3 text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                        Total · {filteredAccounts.length} account{filteredAccounts.length === 1 ? "" : "s"}
                      </td>
                      <td className="px-5 py-3 text-right tabular text-muted-foreground font-medium">{money(visibleOpening)}</td>
                      <td className={cn("px-5 py-3 text-right tabular font-bold text-base",
                        statementType === "payable" ? "text-warning" : "text-foreground"
                      )}>{money(visibleClosing)}</td>
                      <td className={cn("px-5 py-3 text-right tabular font-bold",
                        (visibleClosing - visibleOpening) >= 0 ? "text-success" : "text-warning"
                      )}>
                        {(visibleClosing - visibleOpening) >= 0 ? "+" : ""}{money(visibleClosing - visibleOpening)}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </Card>
          </>
        );
      })()}

      {/* === VAT REPORT === */}
      {tab === "vat" && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KPICard label="Output GST (CGST+SGST 18%)" value={money(income * 0.18)} icon={Receipt} accent="warning" hint="Tax collected on sales" />
            <KPICard label="Input GST (ITC available)" value={money(28400)} icon={Receipt} accent="success" hint="Reclaimable from vendor bills" />
            <KPICard label="Net GST Payable" value={money(income * 0.18 - 28400)} icon={Wallet} accent="brand" hint="After ITC offset" />
            <KPICard label="TDS Deducted" value={money(12400)} icon={FileDown} accent="info" hint="Sec 194H + 194J" />
          </div>

          <AIInsight
            variant="panel"
            title="AI Tax Reminder"
            text={
              <>
                <span className="font-semibold">GSTR-3B</span> for May 2026 is due in <span className="font-semibold text-warning">26 days</span> (20 Jun).
                Net liability: <span className="font-semibold">{money(income * 0.18 - 28400)}</span> · ITC available: <span className="font-semibold text-success">{money(28400)}</span>.
                Annual return <span className="font-semibold">GSTR-9</span> window opens 1 Apr 2027. e-Invoice generation: <span className="font-semibold text-success">enabled</span> (NIC portal).
              </>
            }
            action={{ label: "File GSTR-3B", onClick: () => showToast("GSTR-3B draft saved to NIC portal") }}
          />

          {/* GSTR Returns */}
          <Card className="p-0 overflow-hidden">
            <CardHeader className="bg-surface-elevated">
              <div className="flex items-center justify-between">
                <CardTitle>GST Returns Tracker</CardTitle>
                <Button size="sm" variant="outline" onClick={() => showToast("GSTR-3B JSON downloaded · ready for NIC portal upload")}>
                  <FileDown className="h-3.5 w-3.5" />Download JSON
                </Button>
              </div>
            </CardHeader>
            <table className="w-full text-sm">
              <thead className="bg-surface-sunken/50 border-b border-border">
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-2.5 font-semibold">Period</th>
                  <th className="px-5 py-2.5 font-semibold">Form</th>
                  <th className="px-5 py-2.5 font-semibold">Due Date</th>
                  <th className="px-5 py-2.5 font-semibold text-right">Total Turnover</th>
                  <th className="px-5 py-2.5 font-semibold text-right">Tax Liability</th>
                  <th className="px-5 py-2.5 font-semibold">Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {GSTR_RETURNS.map(g => (
                  <tr key={g.id} className="hover:bg-surface-sunken/40">
                    <td className="px-5 py-3 font-medium">{g.period}</td>
                    <td className="px-5 py-3"><Badge tone="neutral">{g.form}</Badge></td>
                    <td className="px-5 py-3 text-muted-foreground tabular">{g.due}</td>
                    <td className="px-5 py-3 text-right tabular">{money(g.total)}</td>
                    <td className="px-5 py-3 text-right tabular font-medium text-warning">{money(g.tax)}</td>
                    <td className="px-5 py-3">
                      <Badge tone={
                        g.status === "Filed" ? "success" :
                        g.status === "Draft" ? "info" :
                        g.status === "Pending" ? "warning" :
                        "neutral"
                      }>
                        {g.status === "Filed" && <CheckCircle2 className="h-3 w-3" />}
                        {g.status === "Pending" && <AlertCircle className="h-3 w-3" />}
                        {g.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Button size="sm" variant="ghost" onClick={() => {
                        if (g.status === "Filed") showToast(`Opening filed return ${g.form}`);
                        else if (g.status === "Upcoming") showToast(`Reminder set for ${g.form} · ${g.due}`);
                        else showToast(`${g.form} filed · ARN generated · NIC acknowledgment received`);
                      }}>
                        {g.status === "Filed" ? "View" : g.status === "Upcoming" ? "Schedule" : "File now"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* ITC ledger */}
          <Card className="p-0 overflow-hidden">
            <CardHeader className="bg-surface-elevated">
              <div className="flex items-center justify-between">
                <CardTitle>Input Tax Credit (ITC) Ledger</CardTitle>
                <Badge tone="success">Reconciled with GSTR-2B</Badge>
              </div>
            </CardHeader>
            <table className="w-full text-sm">
              <thead className="bg-surface-sunken/50 border-b border-border">
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-2.5 font-semibold">Source</th>
                  <th className="px-5 py-2.5 font-semibold text-right">CGST</th>
                  <th className="px-5 py-2.5 font-semibold text-right">SGST</th>
                  <th className="px-5 py-2.5 font-semibold text-right">IGST</th>
                  <th className="px-5 py-2.5 font-semibold text-right">Total ITC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  { label: "Capital goods (Furniture, IT)", c: 4200, s: 4200, i: 0 },
                  { label: "Input services (Maintenance, IT)", c: 3800, s: 3800, i: 0 },
                  { label: "Input services (Marketing — inter-state)", c: 0, s: 0, i: 4800 },
                  { label: "Inputs (Linen, Amenities)", c: 1900, s: 1900, i: 0 },
                  { label: "Inputs (F&B raw materials)", c: 1900, s: 1900, i: 0 },
                ].map((r, i) => (
                  <tr key={i}>
                    <td className="px-5 py-3">{r.label}</td>
                    <td className="px-5 py-3 text-right tabular">{r.c > 0 ? money(r.c) : "—"}</td>
                    <td className="px-5 py-3 text-right tabular">{r.s > 0 ? money(r.s) : "—"}</td>
                    <td className="px-5 py-3 text-right tabular">{r.i > 0 ? money(r.i) : "—"}</td>
                    <td className="px-5 py-3 text-right tabular font-medium text-success">{money(r.c + r.s + r.i)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-surface-elevated border-t border-border">
                <tr>
                  <td className="px-5 py-3 text-right text-xs uppercase tracking-wider font-semibold text-muted-foreground">Total ITC</td>
                  <td className="px-5 py-3 text-right tabular font-semibold">{money(11800)}</td>
                  <td className="px-5 py-3 text-right tabular font-semibold">{money(11800)}</td>
                  <td className="px-5 py-3 text-right tabular font-semibold">{money(4800)}</td>
                  <td className="px-5 py-3 text-right tabular font-bold text-base text-success">{money(28400)}</td>
                </tr>
              </tfoot>
            </table>
          </Card>

          <Card className="p-0 overflow-hidden">
            <CardHeader className="bg-surface-elevated"><CardTitle>VAT Summary by Source</CardTitle></CardHeader>
            <table className="w-full text-sm">
              <thead className="bg-surface-sunken/50 border-y border-border">
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-2.5 font-semibold">Source</th>
                  <th className="px-5 py-2.5 font-semibold text-right">Net Sales</th>
                  <th className="px-5 py-2.5 font-semibold text-right">VAT (5%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {incomeBreakdown.map(i => (
                  <tr key={i.label}>
                    <td className="px-5 py-3 font-medium">{i.label}</td>
                    <td className="px-5 py-3 text-right tabular">{money(i.value)}</td>
                    <td className="px-5 py-3 text-right tabular text-warning">{money(i.value * 0.05)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-surface-elevated border-t border-border">
                <tr>
                  <td className="px-5 py-3 font-semibold">Total VAT collected</td>
                  <td className="px-5 py-3 text-right tabular font-semibold">{money(income)}</td>
                  <td className="px-5 py-3 text-right tabular font-bold text-warning">{money(income * 0.05)}</td>
                </tr>
              </tfoot>
            </table>
          </Card>
        </>
      )}

      {/* === ENTRY MODAL === */}
      {showEntry && (
        <EntryModal
          type={showEntry}
          onClose={() => setShowEntry(null)}
          onSubmit={handleAdd}
          incomeCats={INCOME_CATS}
          expenseCats={EXPENSE_CATS}
        />
      )}

      {voucherEntry && (
        <PaymentVoucherModal entry={voucherEntry} onClose={() => setVoucherEntry(null)} />
      )}

      {showExpenseFull && (
        <FullScreenExpenseForm
          expenseCats={EXPENSE_CATS}
          onClose={() => setShowExpenseFull(false)}
          onSubmit={(entry, andAddAnother) => {
            handleAdd(entry);
            showToast(andAddAnother ? "Expense saved · ready for next" : "Expense recorded");
            if (!andAddAnother) setShowExpenseFull(false);
          }}
        />
      )}

      {/* ============ BANK RECONCILIATION ============ */}
      {(tab as string) === "bank" && <BankReconcileTab onToast={showToast} />}
      {tab === "vendor" && <PayablesTab onToast={showToast} />}
      {tab === "receivables" && <ReceivablesTab onToast={showToast} />}
      {tab === "profitloss" && <PnlBsTab entries={entries} />}
      {(tab as string) === "journal" && <JournalTab onToast={showToast} />}
      {tab === "reports" && <CashierTab onToast={showToast} />}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-success text-white rounded-md px-4 py-2.5 text-sm shadow-lg inline-flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />{toast}
        </div>
      )}
    </div>
  );
}

function EntryModal({ type, onClose, onSubmit, incomeCats, expenseCats }: {
  type: EntryType; onClose: () => void; onSubmit: (e: Omit<Entry, "id">) => void;
  incomeCats: string[]; expenseCats: string[];
}) {
  const [description, setDescription] = React.useState("");
  const [amount, setAmount] = React.useState<number>(0);
  const [category, setCategory] = React.useState((type === "income" ? incomeCats : expenseCats)[0]);
  const [mode, setMode] = React.useState("UPI");
  const [ref, setRef] = React.useState("");
  const [date, setDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [aiSuggested, setAiSuggested] = React.useState<string | null>(null);

  // India-specific expense fields — header level
  const [vendor, setVendor] = React.useState("");
  const [gstin, setGstin] = React.useState("");
  const [interState, setInterState] = React.useState(false);
  const [attachment, setAttachment] = React.useState<{ name: string; dataUrl: string; type: string } | null>(null);

  // Multi-line items — each line is its own row
  const [lines, setLines] = React.useState<ExpenseLine[]>([blankLine()]);

  // Recompute one line's derived fields
  const computeLine = (l: ExpenseLine): ExpenseLine => {
    const taxable = Math.max(0, l.qty * l.rate);
    const tax = taxable * (l.gstPct / 100);
    return { ...l, taxable, tax, amount: taxable + tax };
  };

  const updateLine = (idx: number, patch: Partial<ExpenseLine>) => {
    setLines(prev => prev.map((l, i) => i === idx ? computeLine({ ...l, ...patch }) : l));
  };
  const addLine = () => setLines(prev => [...prev, blankLine()]);
  const removeLine = (idx: number) => setLines(prev => prev.length === 1 ? prev : prev.filter((_, i) => i !== idx));

  // Aggregate totals across all lines
  const taxableTotal = lines.reduce((s, l) => s + l.taxable, 0);
  const taxTotal = lines.reduce((s, l) => s + l.tax, 0);
  const grossTotal = taxableTotal + taxTotal;
  const cgst = interState ? 0 : taxTotal / 2;
  const sgst = interState ? 0 : taxTotal / 2;
  const igst = interState ? taxTotal : 0;
  const hsnSac = lines.map(l => l.hsnSac).filter(Boolean).join(", "); // for downstream voucher display

  // Keep `amount` (used at save time) in sync with the lines total
  React.useEffect(() => {
    if (type !== "expense") return;
    setAmount(Math.round(grossTotal));
    // Build a flat description from line items if user hasn't typed one
    if (!description && lines.length > 0 && lines.some(l => l.description)) {
      const first = lines.find(l => l.description)?.description ?? "";
      setDescription(first + (lines.filter(l => l.description).length > 1 ? ` +${lines.filter(l => l.description).length - 1} more` : ""));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grossTotal, type]);

  const uploadInvoice = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setAttachment({ name: file.name, dataUrl: ev.target?.result as string, type: file.type });
    reader.readAsDataURL(file);
  };

  // Mock AI categorisation when description is typed
  React.useEffect(() => {
    if (!description || description.length < 4) { setAiSuggested(null); return; }
    const lower = description.toLowerCase();
    const cats = type === "income" ? incomeCats : expenseCats;
    let suggested: string | null = null;
    if (type === "expense") {
      if (lower.includes("salary") || lower.includes("payroll") || lower.includes("wage")) suggested = "Payroll";
      else if (lower.includes("dewa") || lower.includes("electricity") || lower.includes("water") || lower.includes("utility")) suggested = "Utilities (DEWA)";
      else if (lower.includes("food") || lower.includes("kitchen") || lower.includes("grocer")) suggested = "F&B Cost";
      else if (lower.includes("repair") || lower.includes("ac") || lower.includes("plumb") || lower.includes("maintenance")) suggested = "Maintenance";
      else if (lower.includes("booking") || lower.includes("agoda") || lower.includes("expedia") || lower.includes("ota")) suggested = "OTA Commissions";
      else if (lower.includes("linen") || lower.includes("towel") || lower.includes("sheet")) suggested = "Linen & Amenities";
      else if (lower.includes("marketing") || lower.includes("ads") || lower.includes("campaign")) suggested = "Marketing";
      else if (lower.includes("insurance")) suggested = "Insurance";
      else if (lower.includes("bank") || lower.includes("charge")) suggested = "Bank Charges";
    } else {
      if (lower.includes("room") || lower.includes("folio") || lower.includes("checkout")) suggested = "Room Revenue";
      else if (lower.includes("food") || lower.includes("f&b") || lower.includes("dining") || lower.includes("minibar")) suggested = "F&B";
      else if (lower.includes("hall") || lower.includes("ballroom") || lower.includes("conference")) suggested = "Hall Rental";
      else if (lower.includes("spa") || lower.includes("massage")) suggested = "Spa & Wellness";
      else if (lower.includes("laundry")) suggested = "Laundry";
      else if (lower.includes("extra bed")) suggested = "Extra Bed";
    }
    if (suggested && cats.includes(suggested) && suggested !== category) {
      setAiSuggested(suggested);
    } else {
      setAiSuggested(null);
    }
  }, [description, type, category, incomeCats, expenseCats]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  const isAnomalous = type === "expense" && amount > 50000;
  // Need vendor + at least one line with description + qty + rate
  const validLines = lines.filter(l => l.description.trim() && l.qty > 0 && l.rate > 0);
  const canSubmit = (type === "expense"
    ? (vendor.trim() && validLines.length > 0 && category)
    : (description.trim() && amount > 0 && category));

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 sm:p-6 pointer-events-none">
        <Card className="pointer-events-auto w-full max-w-lg p-5 animate-in shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">
                {type === "income" ? "Record Income" : type === "expense" ? "Record Expense" : "Record Refund"}
              </h3>
              <p className="text-xs text-muted-foreground">
                Auto-categorised by AI · auto-posted to ledger &amp; VAT
              </p>
            </div>
            <button type="button" onClick={onClose} className="h-8 w-8 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
          </div>

          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Description *</Label>
            <Input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={type === "income" ? "e.g. ABC Travels — advance receipt" : "e.g. DEWA electricity bill May"}
              autoFocus
            />
          </div>

          {aiSuggested && (
            <div className="rounded-md bg-brand-soft border border-brand/30 p-3 flex items-start gap-3">
              <Sparkles className="h-4 w-4 text-brand mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">AI suggests category</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge tone="brand">{aiSuggested}</Badge>
                  <button type="button" onClick={() => { setCategory(aiSuggested); setAiSuggested(null); }} className="text-xs text-brand hover:underline font-medium">
                    Apply
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category *</Label>
              <Select value={category} onChange={e => setCategory(e.target.value)}>
                {(type === "income" ? incomeCats : expenseCats).map(c => <option key={c}>{c}</option>)}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Payment mode</Label>
              <Select value={mode} onChange={e => setMode(e.target.value)}>
                <option>UPI</option><option>Cash</option><option>Card</option><option>Net Banking</option><option>NEFT</option><option>RTGS</option><option>IMPS</option><option>Cheque</option>
              </Select>
            </div>
          </div>

          {/* Indian vendor + GST fields — only for expenses */}
          {type === "expense" && (
            <div className="space-y-3 p-3 rounded-md border border-dashed border-border bg-surface-sunken/30">
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-semibold inline-flex items-center gap-1.5">
                <Receipt className="h-3 w-3" />Vendor &amp; GST Details
              </p>
              {/* Header — bill-level info shared by all line items */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Vendor / Supplier *</Label>
                  <Input value={vendor} onChange={e => setVendor(e.target.value)} placeholder="e.g. Pearl Textiles Pvt. Ltd." />
                </div>
                <div className="space-y-1.5">
                  <Label>Vendor GSTIN</Label>
                  <Input
                    value={gstin}
                    onChange={e => setGstin(e.target.value.toUpperCase())}
                    placeholder="27AAACR5055K1Z5"
                    maxLength={15}
                    className="font-mono uppercase"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Vendor Invoice No.</Label>
                  <Input value={ref} onChange={e => setRef(e.target.value)} placeholder="INV-2026-…" />
                </div>
                <div className="space-y-1.5">
                  <Label>Place of Supply</Label>
                  <Select value={interState ? "inter" : "intra"} onChange={e => setInterState(e.target.value === "inter")}>
                    <option value="intra">Maharashtra (intra-state · CGST+SGST)</option>
                    <option value="inter">Other state (inter-state · IGST)</option>
                  </Select>
                </div>
              </div>

              {/* Line items table — multiple items per bill */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Line Items · {lines.length}
                  </Label>
                  <Button type="button" size="sm" variant="ghost" onClick={addLine}>
                    <Plus className="h-3 w-3" />Add line
                  </Button>
                </div>

                <div className="rounded-md border border-border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-surface-sunken/60 border-b border-border">
                      <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                        <th className="px-2 py-1.5 font-semibold w-[34%]">Description *</th>
                        <th className="px-2 py-1.5 font-semibold">HSN/SAC</th>
                        <th className="px-2 py-1.5 font-semibold text-right w-[8%]">Qty</th>
                        <th className="px-2 py-1.5 font-semibold text-right">Rate (₹)</th>
                        <th className="px-2 py-1.5 font-semibold">GST %</th>
                        <th className="px-2 py-1.5 font-semibold text-right">Tax</th>
                        <th className="px-2 py-1.5 font-semibold text-right">Amount</th>
                        <th className="w-[5%]"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-surface">
                      {lines.map((l, i) => (
                        <tr key={l.id}>
                          <td className="p-1">
                            <input
                              type="text"
                              value={l.description}
                              onChange={e => updateLine(i, { description: e.target.value })}
                              placeholder="Item / service description"
                              className="w-full h-8 px-2 rounded-md bg-transparent text-xs outline-hidden focus:bg-surface-sunken/40 focus:ring-1 focus:ring-ring/40"
                            />
                          </td>
                          <td className="p-1">
                            <input
                              type="text"
                              value={l.hsnSac ?? ""}
                              onChange={e => updateLine(i, { hsnSac: e.target.value })}
                              placeholder="9963"
                              className="w-full h-8 px-2 rounded-md bg-transparent text-xs tabular font-mono outline-hidden focus:bg-surface-sunken/40 focus:ring-1 focus:ring-ring/40"
                            />
                          </td>
                          <td className="p-1">
                            <input
                              type="number"
                              value={l.qty}
                              onChange={e => updateLine(i, { qty: Math.max(0, Number(e.target.value)) })}
                              className="w-full h-8 px-2 rounded-md bg-transparent text-xs tabular text-right outline-hidden focus:bg-surface-sunken/40 focus:ring-1 focus:ring-ring/40"
                              min={0}
                            />
                          </td>
                          <td className="p-1">
                            <input
                              type="number"
                              value={l.rate}
                              onChange={e => updateLine(i, { rate: Math.max(0, Number(e.target.value)) })}
                              className="w-full h-8 px-2 rounded-md bg-transparent text-xs tabular text-right outline-hidden focus:bg-surface-sunken/40 focus:ring-1 focus:ring-ring/40"
                              step="0.01"
                              min={0}
                            />
                          </td>
                          <td className="p-1">
                            <select
                              value={l.gstPct}
                              onChange={e => updateLine(i, { gstPct: Number(e.target.value) })}
                              className="w-full h-8 px-2 rounded-md bg-transparent text-xs tabular outline-hidden focus:bg-surface-sunken/40 focus:ring-1 focus:ring-ring/40"
                            >
                              <option value={0}>0%</option>
                              <option value={5}>5%</option>
                              <option value={12}>12%</option>
                              <option value={18}>18%</option>
                              <option value={28}>28%</option>
                            </select>
                          </td>
                          <td className="p-2 text-right tabular text-muted-foreground">{money(l.tax)}</td>
                          <td className="p-2 text-right tabular font-medium">{money(l.amount)}</td>
                          <td className="p-1 text-center">
                            <button
                              type="button"
                              onClick={() => removeLine(i)}
                              disabled={lines.length === 1}
                              className="h-7 w-7 rounded-md inline-flex items-center justify-center text-subtle-foreground hover:text-danger hover:bg-danger-soft disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Remove line"
                              aria-label="Remove line"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-surface-elevated border-t border-border">
                      <tr>
                        <td colSpan={5} className="px-2 py-1.5 text-right text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                          Taxable Subtotal
                        </td>
                        <td className="px-2 py-1.5 text-right tabular text-muted-foreground">{money(taxTotal)}</td>
                        <td className="px-2 py-1.5 text-right tabular font-semibold">{money(taxableTotal)}</td>
                        <td></td>
                      </tr>
                      {interState ? (
                        <tr>
                          <td colSpan={6} className="px-2 py-1.5 text-right text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                            IGST
                          </td>
                          <td className="px-2 py-1.5 text-right tabular">{money(igst)}</td>
                          <td></td>
                        </tr>
                      ) : (
                        <>
                          <tr>
                            <td colSpan={6} className="px-2 py-1.5 text-right text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                              CGST
                            </td>
                            <td className="px-2 py-1.5 text-right tabular">{money(cgst)}</td>
                            <td></td>
                          </tr>
                          <tr>
                            <td colSpan={6} className="px-2 py-1.5 text-right text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                              SGST
                            </td>
                            <td className="px-2 py-1.5 text-right tabular">{money(sgst)}</td>
                            <td></td>
                          </tr>
                        </>
                      )}
                      <tr className="border-t-2 border-border">
                        <td colSpan={6} className="px-2 py-2 text-right text-xs uppercase tracking-wider font-bold">
                          Grand Total
                        </td>
                        <td className="px-2 py-2 text-right tabular font-bold text-base">{money(grossTotal)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {taxTotal > 0 && (
                  <p className="text-[10px] text-muted-foreground italic">
                    <Sparkles className="h-2.5 w-2.5 inline mr-0.5" />
                    Eligible for Input Tax Credit (ITC) {money(taxTotal)} — auto-posted to GSTR-2B reconciliation
                  </p>
                )}
              </div>

              {/* Invoice upload */}
              <div className="space-y-1.5">
                <Label>Upload Purchase Invoice (vendor bill)</Label>
                {!attachment ? (
                  <label className="block">
                    <div className="rounded-md border-2 border-dashed border-border bg-surface p-4 text-center cursor-pointer hover:bg-surface-sunken transition-colors">
                      <FileText className="h-6 w-6 mx-auto text-subtle-foreground" />
                      <p className="text-xs mt-2">Click to upload PDF, JPG or PNG · max 10 MB</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Required for GST input credit · auto-scanned via OCR for HSN/SAC + tax extraction
                      </p>
                    </div>
                    <input type="file" accept="image/*,application/pdf" className="sr-only" onChange={uploadInvoice} />
                  </label>
                ) : (
                  <div className="rounded-md border border-success/30 bg-success-soft/30 p-3 flex items-center gap-3">
                    <span className="h-9 w-9 rounded-md bg-success text-white flex items-center justify-center shrink-0">
                      <CheckCircle2 className="h-4 w-4" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{attachment.name}</p>
                      <p className="text-[10px] text-muted-foreground">{attachment.type} · OCR ready</p>
                    </div>
                    <button type="button" onClick={() => setAttachment(null)} className="h-7 w-7 rounded-md hover:bg-danger-soft hover:text-danger inline-flex items-center justify-center" aria-label="Remove">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* For income/refund, simple amount + ref input */}
          {type !== "expense" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Amount (₹) *</Label>
                <Input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} step="0.01" />
              </div>
              <div className="space-y-1.5">
                <Label>Reference / Invoice #</Label>
                <Input value={ref} onChange={e => setRef(e.target.value)} placeholder="INV-…" />
              </div>
            </div>
          )}

          {isAnomalous && (
            <div className="rounded-md bg-warning-soft border border-warning/30 p-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
              <div className="text-xs">
                <p className="font-semibold text-warning">AI anomaly check</p>
                <p className="text-muted-foreground mt-0.5">This expense is unusually large for {category} — average is around AED 2,400. Confirm before saving.</p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button
              disabled={!canSubmit}
              variant={type === "income" ? "success" : "primary"}
              onClick={() => {
                // Build a sensible description from line items if not explicitly typed
                const computedDesc = type === "expense"
                  ? (validLines.length > 1
                      ? `${validLines[0].description} +${validLines.length - 1} more`
                      : validLines[0]?.description ?? description)
                  : description;
                onSubmit({
                  date: new Date(date).toLocaleDateString("en-US", { day: "2-digit", month: "short" }),
                  type, category,
                  description: computedDesc,
                  amount: type === "expense" ? Math.round(grossTotal) : amount,
                  mode, ref,
                  ...(type === "expense" ? {
                    vendor, gstin, hsnSac, cgst, sgst, igst,
                    lines: validLines,
                    voucherNo: `PV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`,
                    attachment,
                  } : {}),
                });
              }}
            >
              <CheckCircle2 className="h-4 w-4" />
              Save {type === "income" ? "Income" : type === "expense" ? "Expense" : "Refund"}
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}

// ---------- Payment Voucher Modal ----------
function PaymentVoucherModal({ entry, onClose }: { entry: Entry; onClose: () => void }) {
  const name = hotelName(useProperty());
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  const taxableValue = entry.amount - ((entry.cgst ?? 0) + (entry.sgst ?? 0) + (entry.igst ?? 0));
  const amountInWords = inrToWords(entry.amount);
  const voucherNo = entry.voucherNo ?? `PV-${new Date().getFullYear()}-${entry.id.slice(-4).toUpperCase()}`;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs no-print" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 pointer-events-none overflow-y-auto no-print">
        <Card className="pointer-events-auto w-full max-w-2xl p-5 shadow-xl my-auto animate-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Payment Voucher Preview</h3>
            <button type="button" onClick={onClose} className="h-8 w-8 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* The voucher document */}
          <div id="print-area" className="rounded-md border-2 border-double border-border p-5 bg-surface text-sm space-y-3">
            {/* Header */}
            <div className="text-center border-b-2 border-double border-border pb-3">
              <p className="font-display text-lg font-medium">{name}</p>
              <p className="text-[10px] text-muted-foreground">Main Tower · MG Road, Bandra West, Mumbai 400050</p>
              <p className="text-[10px] text-muted-foreground tabular">GSTIN 27AAACR5055K1Z5 · PAN AAACR5055K</p>
              <div className="mt-2 inline-block px-4 py-1 rounded-full bg-warning text-white text-[10px] uppercase tracking-[0.2em] font-bold">
                Payment Voucher
              </div>
            </div>

            {/* Voucher meta */}
            <div className="grid grid-cols-3 gap-3 text-xs border-b border-border pb-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Voucher No.</p>
                <p className="font-semibold tabular mt-0.5">{voucherNo}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Date</p>
                <p className="font-semibold tabular mt-0.5">{entry.date} 2026</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Mode</p>
                <p className="font-semibold mt-0.5">{entry.mode}</p>
              </div>
            </div>

            {/* Body — paid to */}
            <div className="space-y-2 border-b border-border pb-3">
              <div className="grid grid-cols-3 gap-2 text-xs">
                <span className="text-muted-foreground">Paid To</span>
                <span className="col-span-2 font-medium">{entry.vendor ?? "—"}</span>
              </div>
              {entry.gstin && (
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <span className="text-muted-foreground">Vendor GSTIN</span>
                  <span className="col-span-2 font-mono tabular">{entry.gstin}</span>
                </div>
              )}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <span className="text-muted-foreground">Account Head</span>
                <span className="col-span-2 font-medium">{entry.category}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <span className="text-muted-foreground">Description</span>
                <span className="col-span-2">{entry.description}</span>
              </div>
              {entry.ref && (
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <span className="text-muted-foreground">Invoice / Bill #</span>
                  <span className="col-span-2 tabular">{entry.ref}</span>
                </div>
              )}
              {entry.hsnSac && (
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <span className="text-muted-foreground">HSN / SAC</span>
                  <span className="col-span-2 tabular">{entry.hsnSac}</span>
                </div>
              )}
            </div>

            {/* Line items (if present) */}
            {entry.lines && entry.lines.length > 0 && (
              <div className="border-b border-border pb-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">Line Items</p>
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="text-left border-b border-border">
                      <th className="py-1 font-semibold">#</th>
                      <th className="py-1 font-semibold">Description</th>
                      <th className="py-1 font-semibold">HSN/SAC</th>
                      <th className="py-1 font-semibold text-right">Qty</th>
                      <th className="py-1 font-semibold text-right">Rate</th>
                      <th className="py-1 font-semibold text-right">Tax</th>
                      <th className="py-1 font-semibold text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entry.lines.map((l, i) => (
                      <tr key={l.id} className="border-b border-border/40">
                        <td className="py-1 text-muted-foreground tabular">{i + 1}</td>
                        <td className="py-1">{l.description}</td>
                        <td className="py-1 tabular font-mono">{l.hsnSac || "—"}</td>
                        <td className="py-1 text-right tabular">{l.qty}</td>
                        <td className="py-1 text-right tabular">{money(l.rate)}</td>
                        <td className="py-1 text-right tabular text-muted-foreground">{money(l.tax)} <span className="text-[9px]">({l.gstPct}%)</span></td>
                        <td className="py-1 text-right tabular font-medium">{money(l.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Amount breakdown */}
            <div className="border-b border-border pb-3 text-xs space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground">Taxable Value</span><span className="tabular">{money(taxableValue)}</span></div>
              {(entry.cgst ?? 0) > 0 && (
                <>
                  <div className="flex justify-between"><span className="text-muted-foreground">CGST</span><span className="tabular">{money(entry.cgst!)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">SGST</span><span className="tabular">{money(entry.sgst!)}</span></div>
                </>
              )}
              {(entry.igst ?? 0) > 0 && (
                <div className="flex justify-between"><span className="text-muted-foreground">IGST</span><span className="tabular">{money(entry.igst!)}</span></div>
              )}
              <div className="flex justify-between border-t border-border pt-1 mt-1">
                <span className="font-semibold">Gross Amount Paid</span>
                <span className="font-bold tabular text-base">{money(entry.amount)}</span>
              </div>
            </div>

            {/* Amount in words */}
            <div className="rounded-md bg-warning-soft/40 border border-warning/30 p-3 text-xs">
              <span className="text-muted-foreground uppercase tracking-wider font-semibold mr-2">Amount in words:</span>
              <span className="font-medium">{amountInWords} Rupees Only</span>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t-2 border-double border-border">
              <div className="text-center">
                <p className="border-t border-border pt-1 text-[10px] text-muted-foreground">Prepared by</p>
                <p className="text-[10px] tabular">Cashier</p>
              </div>
              <div className="text-center">
                <p className="border-t border-border pt-1 text-[10px] text-muted-foreground">Approved by</p>
                <p className="text-[10px] tabular">Accounts Manager</p>
              </div>
              <div className="text-center">
                <p className="border-t border-border pt-1 text-[10px] text-muted-foreground">Received by</p>
                <p className="text-[10px] tabular">Vendor / Recipient</p>
              </div>
            </div>

            <p className="text-[9px] text-muted-foreground italic text-center border-t border-border pt-2">
              Original for Recipient · Duplicate for Accounts · Triplicate for Vendor Records
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t border-border mt-4">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            {entry.attachment && (
              <a href={entry.attachment.dataUrl} download={entry.attachment.name}>
                <Button variant="outline"><FileText className="h-4 w-4" />View Invoice</Button>
              </a>
            )}
            <Button variant="outline"><FileText className="h-4 w-4" />Save PDF</Button>
            <Button onClick={() => window.print()}><Printer className="h-4 w-4" />Print Voucher</Button>
          </div>
        </Card>
      </div>
    </>
  );
}

// Indian-style number-to-words (Lakh / Crore)
function inrToWords(n: number): string {
  if (n === 0) return "Zero";
  if (n < 0) return "Minus " + inrToWords(-n);
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  function two(num: number): string {
    if (num < 20) return ones[num];
    return tens[Math.floor(num / 10)] + (num % 10 ? " " + ones[num % 10] : "");
  }
  function three(num: number): string {
    if (num >= 100) return ones[Math.floor(num / 100)] + " Hundred" + (num % 100 ? " " + two(num % 100) : "");
    return two(num);
  }
  let out = "";
  const crore = Math.floor(n / 10000000); n %= 10000000;
  const lakh = Math.floor(n / 100000); n %= 100000;
  const thousand = Math.floor(n / 1000); n %= 1000;
  if (crore) out += three(crore) + " Crore ";
  if (lakh) out += three(lakh) + " Lakh ";
  if (thousand) out += three(thousand) + " Thousand ";
  if (n) out += three(n);
  return out.trim();
}

// ===================== BANK RECONCILE TAB =====================
function BankReconcileTab({ onToast }: { onToast: (m: string) => void }) {
  const [activeAccount, setActiveAccount] = React.useState(BANK_ACCOUNTS[0].id);
  const [entries, setEntries] = React.useState<ReconcileEntry[]>(RECONCILE);
  const acc = BANK_ACCOUNTS.find(a => a.id === activeAccount)!;
  const accEntries = entries;
  const unmatched = accEntries.filter(e => !e.matched);
  const matchedCount = accEntries.length - unmatched.length;

  const handleMatch = (id: string, desc: string) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, matched: true } : e));
    onToast(`Matched: ${desc}`);
  };

  return (
    <div className="space-y-5">
      {/* Bank account chips */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {BANK_ACCOUNTS.map(a => {
          const diff = a.bookBalance - a.bankBalance;
          const isActive = activeAccount === a.id;
          return (
            <button key={a.id} type="button" onClick={() => setActiveAccount(a.id)} className={cn(
              "rounded-lg border p-4 text-left transition-all",
              isActive ? "bg-brand-soft border-brand shadow-xs" : "border-border hover:bg-surface-sunken hover:border-brand/40"
            )}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{a.name}</p>
                  <p className="text-sm font-medium">{a.bank}</p>
                </div>
                <Badge tone={diff === 0 ? "success" : "warning"}>{diff === 0 ? "Reconciled" : `${money(diff)} diff`}</Badge>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Book</p>
                  <p className="font-semibold tabular">{money(a.bookBalance)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Bank</p>
                  <p className="font-semibold tabular">{money(a.bankBalance)}</p>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 tabular">A/c {a.accountNo} · {a.ifsc}</p>
            </button>
          );
        })}
      </div>

      {/* Reconcile summary */}
      <Card className="p-4 bg-linear-to-br from-info-soft/40 via-surface to-surface border-info/30">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">{acc.name} reconciliation</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {matchedCount} matched · {unmatched.length} unmatched · {money(acc.uncleared)} uncleared
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onToast("Bank statement imported · 24 entries parsed")}>
              <FileDown className="h-3.5 w-3.5" />Import statement
            </Button>
            <Button variant="success" size="sm" disabled={unmatched.length > 0} onClick={() => onToast(`${acc.name} reconciled to ${formatDate(new Date().toISOString())}`)}>
              <CheckCircle2 className="h-3.5 w-3.5" />Mark reconciled
            </Button>
          </div>
        </div>
      </Card>

      {/* Reconcile table */}
      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-elevated border-b border-border">
            <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Ref</th>
              <th className="px-4 py-3 text-right">Debit</th>
              <th className="px-4 py-3 text-right">Credit</th>
              <th className="px-4 py-3 text-center">Match</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {accEntries.map(e => (
              <tr key={e.id} className={cn("hover:bg-surface-sunken/30", !e.matched && "bg-warning-soft/15")}>
                <td className="px-4 py-3 text-xs tabular">{formatDate(e.date)}</td>
                <td className="px-4 py-3">{e.description}</td>
                <td className="px-4 py-3"><Badge tone={e.source === "book" ? "brand" : "neutral"}>{e.source}</Badge></td>
                <td className="px-4 py-3 text-[11px] text-muted-foreground font-mono tabular">{e.ref}</td>
                <td className="px-4 py-3 text-right tabular">{e.debit > 0 ? money(e.debit) : "—"}</td>
                <td className="px-4 py-3 text-right tabular text-success">{e.credit > 0 ? money(e.credit) : "—"}</td>
                <td className="px-4 py-3 text-center">
                  {e.matched ? <CheckCircle2 className="h-4 w-4 text-success inline" /> : <AlertCircle className="h-4 w-4 text-warning inline" />}
                </td>
                <td className="px-4 py-3 text-right">
                  {!e.matched && (
                    <Button size="sm" variant="ghost" onClick={() => handleMatch(e.id, e.description)}>
                      Match
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ===================== VENDOR BILLS / PAYABLES TAB =====================
function PayablesTab({ onToast }: { onToast: (m: string) => void }) {
  const [statusFilter, setStatusFilter] = React.useState<"all" | VendorBill["status"]>("all");
  const list = VENDOR_BILLS.filter(b => statusFilter === "all" || b.status === statusFilter);

  const totalOutstanding = VENDOR_BILLS.reduce((t, b) => t + (b.netPayable - b.paid), 0);
  const totalTDS = VENDOR_BILLS.reduce((t, b) => t + b.tdsAmount, 0);
  const overdueAmount = VENDOR_BILLS.filter(b => b.status === "Overdue").reduce((t, b) => t + (b.netPayable - b.paid), 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPICard label="Total bills" value={VENDOR_BILLS.length} icon={FileText} accent="brand" />
        <KPICard label="Outstanding" value={money(totalOutstanding)} icon={Wallet} accent="warning" />
        <KPICard label="Overdue" value={money(overdueAmount)} icon={AlertCircle} accent={overdueAmount > 0 ? "danger" : "success"} />
        <KPICard label="TDS to deposit" value={money(totalTDS)} icon={Receipt} accent="info" hint="Quarterly 26Q" />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {(["all", "Draft", "Approved", "Partial", "Paid", "Overdue"] as ("all" | VendorBill["status"])[]).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} className={cn(
            "h-8 px-3 rounded-full text-xs font-medium border transition-colors",
            statusFilter === s ? "bg-foreground text-background border-foreground" : "border-border hover:bg-surface-sunken text-muted-foreground"
          )}>
            {s === "all" ? "All" : s} · {s === "all" ? VENDOR_BILLS.length : VENDOR_BILLS.filter(b => b.status === s).length}
          </button>
        ))}
        <div className="flex-1" />
        <Button size="sm" onClick={() => onToast("New vendor bill form opened")}>
          <Plus className="h-3.5 w-3.5" />New bill
        </Button>
      </div>

      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-elevated border-b border-border">
            <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3">Bill #</th>
              <th className="px-4 py-3">Vendor</th>
              <th className="px-4 py-3">Bill / Due</th>
              <th className="px-4 py-3 text-right">Taxable</th>
              <th className="px-4 py-3 text-right">GST</th>
              <th className="px-4 py-3 text-right">TDS</th>
              <th className="px-4 py-3 text-right">Net Payable</th>
              <th className="px-4 py-3 text-right">Paid</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {list.map(b => {
              const balance = b.netPayable - b.paid;
              return (
                <tr key={b.id} className={cn("hover:bg-surface-sunken/30", b.status === "Overdue" && "bg-danger-soft/20")}>
                  <td className="px-4 py-3 font-mono tabular text-xs">{b.billNo}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{b.vendor}</p>
                    <Badge tone="neutral">{b.category}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <p className="tabular text-muted-foreground">{formatDate(b.billDate)}</p>
                    <p className={cn("tabular font-medium", b.status === "Overdue" && "text-danger")}>Due {formatDate(b.dueDate)}</p>
                  </td>
                  <td className="px-4 py-3 text-right tabular">{money(b.taxableValue)}</td>
                  <td className="px-4 py-3 text-right tabular text-muted-foreground">{money(b.gst)}</td>
                  <td className="px-4 py-3 text-right tabular text-info">{b.tdsAmount > 0 ? `${money(b.tdsAmount)} (${b.tdsRate}%)` : "—"}</td>
                  <td className="px-4 py-3 text-right tabular font-semibold">{money(b.netPayable)}</td>
                  <td className="px-4 py-3 text-right tabular text-success">{money(b.paid)}</td>
                  <td className="px-4 py-3"><Badge tone={b.status === "Paid" ? "success" : b.status === "Overdue" ? "danger" : b.status === "Partial" ? "warning" : b.status === "Draft" ? "neutral" : "info"}>{b.status}</Badge></td>
                  <td className="px-4 py-3 text-right">
                    {balance > 0 && (
                      <Button size="sm" variant="success" onClick={() => onToast(`Payment voucher created · ${money(balance)} to ${b.vendor}`)}>
                        Pay {money(balance)}
                      </Button>
                    )}
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

// ===================== RECEIVABLES AGING TAB =====================
function ReceivablesTab({ onToast }: { onToast: (m: string) => void }) {
  const totalReceivables = RECEIVABLES.reduce((t, r) => t + r.total, 0);
  const totalCurrent = RECEIVABLES.reduce((t, r) => t + r.current, 0);
  const total90plus = RECEIVABLES.reduce((t, r) => t + r.b90 + r.b90plus, 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPICard label="Total receivables" value={money(totalReceivables)} icon={Wallet} accent="brand" />
        <KPICard label="Current" value={money(totalCurrent)} icon={CheckCircle2} accent="success" />
        <KPICard label=">90 days" value={money(total90plus)} icon={AlertCircle} accent={total90plus > 0 ? "danger" : "success"} />
        <KPICard label="Active accounts" value={RECEIVABLES.length} icon={Users} accent="info" />
      </div>

      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-elevated border-b border-border">
            <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3">Agent / Corporate</th>
              <th className="px-4 py-3 text-right">Current</th>
              <th className="px-4 py-3 text-right">31–60d</th>
              <th className="px-4 py-3 text-right">61–90d</th>
              <th className="px-4 py-3 text-right">90+</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3">Credit utilization</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {RECEIVABLES.map(r => {
              const util = Math.round((r.total / r.creditLimit) * 100);
              return (
                <tr key={r.id} className="hover:bg-surface-sunken/30">
                  <td className="px-4 py-3">
                    <p className="font-medium">{r.agent}</p>
                    <p className="text-[11px] text-muted-foreground">{r.type} · {r.invoices} invoices · last paid {formatDate(r.lastPayment)}</p>
                  </td>
                  <td className="px-4 py-3 text-right tabular">{r.current > 0 ? money(r.current) : "—"}</td>
                  <td className="px-4 py-3 text-right tabular">{r.b30 > 0 ? money(r.b30) : "—"}</td>
                  <td className="px-4 py-3 text-right tabular text-warning">{r.b60 > 0 ? money(r.b60) : "—"}</td>
                  <td className="px-4 py-3 text-right tabular text-danger">{(r.b90 + r.b90plus) > 0 ? money(r.b90 + r.b90plus) : "—"}</td>
                  <td className="px-4 py-3 text-right tabular font-semibold">{money(r.total)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 bg-surface-sunken rounded-full overflow-hidden">
                        <div className={cn("h-full", util >= 80 ? "bg-danger" : util >= 50 ? "bg-warning" : "bg-success")} style={{ width: `${Math.min(100, util)}%` }} />
                      </div>
                      <p className="text-[11px] tabular text-muted-foreground">{util}%</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => {
                        const soa = {
                          accountName: r.agent,
                          type: r.type,
                          asOf: new Date().toISOString().slice(0, 10),
                          invoices: r.invoices,
                          aging: {
                            current: r.current, "31-60": r.b30, "61-90": r.b60,
                            "90+": r.b90 + r.b90plus,
                          },
                          total: r.total,
                          creditLimit: r.creditLimit,
                          lastPayment: r.lastPayment,
                        };
                        const blob = new Blob([JSON.stringify(soa, null, 2)], { type: "application/json" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url; a.download = `SOA-${r.agent.replace(/\s/g, "_")}-${soa.asOf}.json`; a.click();
                        URL.revokeObjectURL(url);
                        onToast(`Statement downloaded for ${r.agent}`);
                      }}>
                        Statement
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => onToast(`Reminder sent to ${r.agent} · Email + WhatsApp · ${money(r.total)} outstanding`)}>
                        Remind
                      </Button>
                    </div>
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

// ===================== P&L + BALANCE SHEET TAB =====================
function PnlStat({ label, value, tone, big }: { label: string; value: string; tone?: "success" | "warning" | "brand" | "danger"; big?: boolean }) {
  return (
    <div className="rounded-md border border-border p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
      <p className={cn("mt-1 tabular font-semibold", big ? "text-xl" : "text-base",
        tone === "success" && "text-success", tone === "warning" && "text-warning",
        tone === "brand" && "text-brand", tone === "danger" && "text-danger")}>{value}</p>
    </div>
  );
}

function PnlBsTab({ entries }: { entries: Entry[] }) {
  const name = hotelName(useProperty());
  const [subtab, setSubtab] = React.useState<"pnl" | "bs">("pnl");

  // Actual P&L computed from the real day-book entries.
  const sumType = (t: EntryType) => entries.filter(e => e.type === t).reduce((s, e) => s + e.amount, 0);
  const byCategory = (t: EntryType) => {
    const m: Record<string, number> = {};
    for (const e of entries.filter(x => x.type === t)) m[e.category] = (m[e.category] ?? 0) + e.amount;
    return Object.entries(m).map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);
  };
  const actualIncome = sumType("income");
  const actualRefunds = sumType("refund");
  const actualExpense = sumType("expense");
  const actualNet = actualIncome - actualRefunds - actualExpense;
  const incomeRows = byCategory("income");
  const expenseRows = byCategory("expense");

  const totalRevenue = PNL_REVENUE.reduce((t, r) => t + r.rooms + r.fb + r.banquet + r.spa + r.other, 0);
  const totalDirect = PNL_DIRECT_COSTS.reduce((t, r) => t + r.rooms + r.fb + r.banquet + r.spa + r.other, 0);
  const grossProfit = totalRevenue - totalDirect;
  const totalIndirect = PNL_INDIRECT_COSTS.reduce((t, r) => t + r.amount, 0);
  const netProfit = grossProfit - totalIndirect;

  const totalAssets = BS_ASSETS.flatMap(g => g.items).reduce((t, i) => t + i.value, 0);
  const totalLiabEquity = BS_LIABILITIES.flatMap(g => g.items).reduce((t, i) => t + i.value, 0);

  return (
    <div className="space-y-5">
      <div className="flex gap-1">
        <button onClick={() => setSubtab("pnl")} className={cn("px-4 py-2 rounded-md text-sm font-medium", subtab === "pnl" ? "bg-brand text-brand-foreground" : "border border-border hover:bg-surface-sunken")}>
          Profit & Loss
        </button>
        <button onClick={() => setSubtab("bs")} className={cn("px-4 py-2 rounded-md text-sm font-medium", subtab === "bs" ? "bg-brand text-brand-foreground" : "border border-border hover:bg-surface-sunken")}>
          Balance Sheet
        </button>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="h-3.5 w-3.5" />Print
        </Button>
      </div>

      {subtab === "pnl" && (
        <Card className="p-5 border-brand/30">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display text-lg">Actual P&amp;L · from day-book</h3>
              <p className="text-xs text-muted-foreground">Computed live from posted entries · {entries.length} transactions</p>
            </div>
            <Badge tone={actualNet >= 0 ? "success" : "danger"}>{actualNet >= 0 ? "Profit" : "Loss"}</Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <PnlStat label="Revenue" value={money(actualIncome)} tone="success" />
            <PnlStat label="Refunds" value={`- ${money(actualRefunds)}`} tone="warning" />
            <PnlStat label="Expenses" value={`- ${money(actualExpense)}`} tone="warning" />
            <PnlStat label="Net Profit" value={money(actualNet)} tone={actualNet >= 0 ? "brand" : "danger"} big />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Income by category</p>
              <table className="w-full text-sm">
                <tbody>
                  {incomeRows.map(r => (
                    <tr key={r.category} className="border-b border-border/40">
                      <td className="py-1.5">{r.category}</td>
                      <td className="py-1.5 text-right tabular text-success">{money(r.amount)}</td>
                    </tr>
                  ))}
                  {incomeRows.length === 0 && <tr><td className="py-3 text-muted-foreground text-xs">No income entries yet.</td></tr>}
                </tbody>
              </table>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Expenses by category</p>
              <table className="w-full text-sm">
                <tbody>
                  {expenseRows.map(r => (
                    <tr key={r.category} className="border-b border-border/40">
                      <td className="py-1.5">{r.category}</td>
                      <td className="py-1.5 text-right tabular text-warning">{money(r.amount)}</td>
                    </tr>
                  ))}
                  {expenseRows.length === 0 && <tr><td className="py-3 text-muted-foreground text-xs">No expense entries yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}

      {subtab === "pnl" && (
        <Card className="p-5">
          <div className="text-center mb-4">
            <h3 className="font-display text-xl">Departmental P&amp;L Statement</h3>
            <p className="text-xs text-muted-foreground">Budgeted departmental view · May 2026 · MYHOTEL — {name}</p>
          </div>
          <table className="w-full text-sm">
            <thead className="border-y-2 border-foreground">
              <tr>
                <th className="text-left py-2 px-2">Particulars</th>
                <th className="text-right py-2 px-2">Rooms</th>
                <th className="text-right py-2 px-2">F&amp;B</th>
                <th className="text-right py-2 px-2">Banquet</th>
                <th className="text-right py-2 px-2">Spa</th>
                <th className="text-right py-2 px-2">Other</th>
                <th className="text-right py-2 px-2 font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr><td colSpan={7} className="pt-3 pb-1 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Revenue</td></tr>
              {PNL_REVENUE.map((r, i) => {
                const total = r.rooms + r.fb + r.banquet + r.spa + r.other;
                return (
                  <tr key={i} className="border-b border-border/40">
                    <td className="py-1.5 px-2">{r.category}</td>
                    <td className="py-1.5 px-2 text-right tabular text-muted-foreground">{r.rooms > 0 ? money(r.rooms) : "—"}</td>
                    <td className="py-1.5 px-2 text-right tabular text-muted-foreground">{r.fb > 0 ? money(r.fb) : "—"}</td>
                    <td className="py-1.5 px-2 text-right tabular text-muted-foreground">{r.banquet > 0 ? money(r.banquet) : "—"}</td>
                    <td className="py-1.5 px-2 text-right tabular text-muted-foreground">{r.spa > 0 ? money(r.spa) : "—"}</td>
                    <td className="py-1.5 px-2 text-right tabular text-muted-foreground">{r.other > 0 ? money(r.other) : "—"}</td>
                    <td className="py-1.5 px-2 text-right tabular font-medium">{money(total)}</td>
                  </tr>
                );
              })}
              <tr className="border-t border-border font-semibold">
                <td className="py-1.5 px-2">Total Revenue</td>
                <td colSpan={5} />
                <td className="py-1.5 px-2 text-right tabular text-success">{money(totalRevenue)}</td>
              </tr>

              <tr><td colSpan={7} className="pt-3 pb-1 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Direct Costs</td></tr>
              {PNL_DIRECT_COSTS.map((r, i) => {
                const total = r.rooms + r.fb + r.banquet + r.spa + r.other;
                return (
                  <tr key={i} className="border-b border-border/40">
                    <td className="py-1.5 px-2">{r.category}</td>
                    <td className="py-1.5 px-2 text-right tabular text-muted-foreground">{r.rooms > 0 ? money(r.rooms) : "—"}</td>
                    <td className="py-1.5 px-2 text-right tabular text-muted-foreground">{r.fb > 0 ? money(r.fb) : "—"}</td>
                    <td className="py-1.5 px-2 text-right tabular text-muted-foreground">{r.banquet > 0 ? money(r.banquet) : "—"}</td>
                    <td className="py-1.5 px-2 text-right tabular text-muted-foreground">{r.spa > 0 ? money(r.spa) : "—"}</td>
                    <td className="py-1.5 px-2 text-right tabular text-muted-foreground">{r.other > 0 ? money(r.other) : "—"}</td>
                    <td className="py-1.5 px-2 text-right tabular">{money(total)}</td>
                  </tr>
                );
              })}
              <tr className="border-t border-border font-semibold bg-surface-sunken/30">
                <td className="py-2 px-2">Gross Profit</td>
                <td colSpan={5} />
                <td className="py-2 px-2 text-right tabular text-success text-base">{money(grossProfit)}</td>
              </tr>

              <tr><td colSpan={7} className="pt-3 pb-1 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Indirect Costs (Overhead)</td></tr>
              {PNL_INDIRECT_COSTS.map((r, i) => (
                <tr key={i} className="border-b border-border/40">
                  <td className="py-1.5 px-2">{r.category}</td>
                  <td colSpan={5} />
                  <td className="py-1.5 px-2 text-right tabular">{money(r.amount)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-foreground font-bold bg-success-soft/30">
                <td className="py-2.5 px-2">Net Profit (before tax)</td>
                <td colSpan={5} />
                <td className="py-2.5 px-2 text-right tabular text-success text-lg">{money(netProfit)}</td>
              </tr>
              <tr className="text-xs">
                <td className="px-2 text-muted-foreground">Net margin</td>
                <td colSpan={5} />
                <td className="px-2 text-right tabular text-muted-foreground">{((netProfit / totalRevenue) * 100).toFixed(1)}%</td>
              </tr>
            </tbody>
          </table>
        </Card>
      )}

      {subtab === "bs" && (
        <Card className="p-5">
          <div className="text-center mb-4">
            <h3 className="font-display text-xl">Balance Sheet</h3>
            <p className="text-xs text-muted-foreground">As at 31 May 2026 · MYHOTEL — {name}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Liabilities + Equity */}
            <div>
              <p className="text-xs uppercase tracking-wider font-bold border-b-2 border-foreground pb-1">Liabilities &amp; Equity</p>
              {BS_LIABILITIES.map(g => (
                <div key={g.group} className="mt-3">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{g.group}</p>
                  <ul className="mt-1">
                    {g.items.map((i, idx) => (
                      <li key={idx} className="flex justify-between py-1 border-b border-border/40 text-sm">
                        <span>{i.name}</span>
                        <span className="tabular">{money(i.value)}</span>
                      </li>
                    ))}
                    <li className="flex justify-between py-1 font-semibold border-t border-border text-sm">
                      <span>Sub-total</span>
                      <span className="tabular">{money(g.items.reduce((t, i) => t + i.value, 0))}</span>
                    </li>
                  </ul>
                </div>
              ))}
              <div className="flex justify-between pt-3 mt-3 border-t-2 border-foreground font-bold text-base">
                <span>Total</span>
                <span className="tabular">{money(totalLiabEquity)}</span>
              </div>
            </div>
            {/* Assets */}
            <div>
              <p className="text-xs uppercase tracking-wider font-bold border-b-2 border-foreground pb-1">Assets</p>
              {BS_ASSETS.map(g => (
                <div key={g.group} className="mt-3">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{g.group}</p>
                  <ul className="mt-1">
                    {g.items.map((i, idx) => (
                      <li key={idx} className={cn("flex justify-between py-1 border-b border-border/40 text-sm", i.value < 0 && "text-muted-foreground italic")}>
                        <span>{i.name}</span>
                        <span className="tabular">{money(i.value)}</span>
                      </li>
                    ))}
                    <li className="flex justify-between py-1 font-semibold border-t border-border text-sm">
                      <span>Sub-total</span>
                      <span className="tabular">{money(g.items.reduce((t, i) => t + i.value, 0))}</span>
                    </li>
                  </ul>
                </div>
              ))}
              <div className="flex justify-between pt-3 mt-3 border-t-2 border-foreground font-bold text-base">
                <span>Total</span>
                <span className="tabular">{money(totalAssets)}</span>
              </div>
            </div>
          </div>
          <div className="mt-4 text-center text-xs text-muted-foreground italic">
            {totalAssets === totalLiabEquity ? "✓ Balance sheet tallies" : `⚠ Difference: ${money(Math.abs(totalAssets - totalLiabEquity))}`}
          </div>
        </Card>
      )}
    </div>
  );
}

// ===================== JOURNAL + CHART OF ACCOUNTS TAB =====================
function JournalTab({ onToast }: { onToast: (m: string) => void }) {
  const [subtab, setSubtab] = React.useState<"journal" | "coa">("journal");
  const [entries, setEntries] = React.useState<JournalEntry[]>(JOURNAL_ENTRIES);

  const handlePost = (id: string) => {
    setEntries(prev => prev.map(je => je.id === id ? { ...je, status: "Posted" as const, postedBy: "Khalid R." } : je));
    onToast(`Journal voucher posted to ledger`);
  };

  return (
    <div className="space-y-5">
      <div className="flex gap-1">
        <button onClick={() => setSubtab("journal")} className={cn("px-4 py-2 rounded-md text-sm font-medium", subtab === "journal" ? "bg-brand text-brand-foreground" : "border border-border hover:bg-surface-sunken")}>
          Journal Entries
        </button>
        <button onClick={() => setSubtab("coa")} className={cn("px-4 py-2 rounded-md text-sm font-medium", subtab === "coa" ? "bg-brand text-brand-foreground" : "border border-border hover:bg-surface-sunken")}>
          Chart of Accounts
        </button>
        <div className="flex-1" />
        <Button size="sm" onClick={() => onToast("New journal voucher form opened")}>
          <Plus className="h-3.5 w-3.5" />New JV
        </Button>
      </div>

      {subtab === "journal" && (
        <div className="space-y-3">
          {entries.map(je => (
            <Card key={je.id} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-semibold">{je.voucherNo}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(je.date)} · {je.narration}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={je.status === "Posted" ? "success" : "warning"}>{je.status}</Badge>
                  <p className="text-[11px] text-muted-foreground">by {je.postedBy}</p>
                </div>
              </div>
              <table className="w-full text-sm border-t border-border">
                <thead>
                  <tr className="text-xs text-muted-foreground uppercase tracking-wider">
                    <th className="text-left py-2">Account</th>
                    <th className="text-right py-2">Debit</th>
                    <th className="text-right py-2">Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {je.lines.map((l, idx) => (
                    <tr key={idx} className="border-b border-border/40">
                      <td className="py-1.5">{l.account}</td>
                      <td className="py-1.5 text-right tabular">{l.debit > 0 ? money(l.debit) : "—"}</td>
                      <td className="py-1.5 text-right tabular">{l.credit > 0 ? money(l.credit) : "—"}</td>
                    </tr>
                  ))}
                  <tr className="font-semibold">
                    <td className="py-1.5">Total</td>
                    <td className="py-1.5 text-right tabular">{money(je.lines.reduce((t, l) => t + l.debit, 0))}</td>
                    <td className="py-1.5 text-right tabular">{money(je.lines.reduce((t, l) => t + l.credit, 0))}</td>
                  </tr>
                </tbody>
              </table>
              {je.status === "Draft" && (
                <div className="mt-3 flex justify-end">
                  <Button size="sm" variant="success" onClick={() => handlePost(je.id)}>
                    <CheckCircle2 className="h-3.5 w-3.5" />Post to ledger
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {subtab === "coa" && (
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-elevated border-b border-border">
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Account</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3 text-right">Balance</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {CHART_OF_ACCOUNTS.map(a => (
                <tr key={a.code} className="hover:bg-surface-sunken/30">
                  <td className="px-4 py-3 font-mono tabular text-xs">{a.code}</td>
                  <td className="px-4 py-3 font-medium">{a.name}</td>
                  <td className="px-4 py-3">
                    <Badge tone={
                      a.type === "Asset" ? "info" :
                      a.type === "Liability" ? "warning" :
                      a.type === "Equity" ? "brand" :
                      a.type === "Revenue" ? "success" : "danger"
                    }>{a.type}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right tabular font-medium">{money(a.balance)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="ghost" onClick={() => {
                      // Generate a mock ledger CSV download for this account
                      const sampleRows = [
                        ["Date", "Voucher", "Particulars", "Debit", "Credit", "Balance"],
                        ["2026-05-01", "OB", `Opening balance for ${a.name}`, "0.00", "0.00", a.balance.toFixed(2)],
                        ["2026-05-12", "JV-001", "Periodic adjustment", (a.balance * 0.1).toFixed(2), "0.00", (a.balance * 1.1).toFixed(2)],
                        ["2026-05-22", "RCP-220", "Receipt entry", "0.00", (a.balance * 0.05).toFixed(2), (a.balance * 1.05).toFixed(2)],
                      ];
                      const csv = sampleRows.map(r => r.join(",")).join("\n");
                      const blob = new Blob([csv], { type: "text/csv" });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement("a");
                      link.href = url; link.download = `ledger-${a.code}-${a.name.replace(/\s/g, "_")}.csv`; link.click();
                      URL.revokeObjectURL(url);
                      onToast(`Ledger CSV downloaded · ${a.name} (${a.code})`);
                    }}>
                      View ledger
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

// ===================== CASHIER SUMMARY TAB =====================
const DENOMINATIONS = [
  { value: 2000, label: "₹2000" }, { value: 500, label: "₹500" },
  { value: 200,  label: "₹200" },  { value: 100, label: "₹100" },
  { value: 50,   label: "₹50" },   { value: 20,  label: "₹20" },
  { value: 10,   label: "₹10" },   { value: 5,   label: "₹5" },
  { value: 2,    label: "₹2" },    { value: 1,   label: "₹1" },
];
const VARIANCE_REASONS = [
  "Cashier error", "Refund mismatch", "Change error",
  "Counterfeit note", "Tip not recorded", "Other",
];
const CASHIER_ROSTER = ["Khalid R.", "Priya M.", "Aman S.", "Reena T.", "Vikram J."];
const VERIFIERS = ["Manager · Rohit K.", "Manager · Anjali S.", "Accounts · CA Sharma"];

type DateRange = "today" | "yesterday" | "week" | "all";

function CashierTab({ onToast }: { onToast: (m: string) => void }) {
  const [shifts, setShifts] = React.useState<CashierShift[]>(CASHIER_SHIFTS);
  const [dateRange, setDateRange] = React.useState<DateRange>("today");
  const [cashierFilter, setCashierFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<"all" | CashierShift["status"]>("all");
  const [search, setSearch] = React.useState("");

  const [openNewShift, setOpenNewShift] = React.useState(false);
  const [closeShiftFor, setCloseShiftFor] = React.useState<CashierShift | null>(null);
  const [verifyShiftFor, setVerifyShiftFor] = React.useState<CashierShift | null>(null);
  const [detailShift, setDetailShift] = React.useState<CashierShift | null>(null);

  // Demo "today" matches the seed-data dates
  const TODAY_ISO = "2026-05-24";
  const YDAY_ISO  = "2026-05-23";

  const filtered = React.useMemo(() => {
    return shifts.filter(s => {
      if (cashierFilter !== "all" && s.cashier !== cashierFilter) return false;
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (search && !`${s.shiftNo} ${s.cashier}`.toLowerCase().includes(search.toLowerCase())) return false;
      if (dateRange === "today")     return s.date === TODAY_ISO;
      if (dateRange === "yesterday") return s.date === YDAY_ISO;
      if (dateRange === "week")      return s.date >= "2026-05-18";
      return true;
    });
  }, [shifts, dateRange, cashierFilter, statusFilter, search]);

  const totalCash = filtered.reduce((t, s) => t + s.cashReceived, 0);
  const totalCard = filtered.reduce((t, s) => t + s.cardReceived, 0);
  const totalUpi  = filtered.reduce((t, s) => t + s.upiReceived, 0);
  const totalReceipts = totalCash + totalCard + totalUpi;
  const grossVariance = filtered.reduce((t, s) => t + Math.abs(s.variance), 0);
  const flaggedCount  = filtered.filter(s => s.variance !== 0 && s.status !== "Open").length;
  const activeShifts  = shifts.filter(s => s.status === "Open");

  const cashiers = Array.from(new Set(shifts.map(s => s.cashier)));
  const activeFilters = (cashierFilter !== "all" ? 1 : 0) + (statusFilter !== "all" ? 1 : 0) + (search ? 1 : 0);

  const handleOpen = (cashier: string, opening: number) => {
    const nowTime = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
    const next: CashierShift = {
      id: `cs-${shifts.length + 1}-${cashier.replace(/\s/g, "")}`,
      shiftNo: `#${4220 + shifts.length + 1}`,
      cashier, date: TODAY_ISO,
      startTime: nowTime, endTime: "—",
      opening, cashReceived: 0, cardReceived: 0, upiReceived: 0,
      expensesPaid: 0, closing: 0, expectedClosing: opening,
      variance: 0, status: "Open",
    };
    setShifts(prev => [next, ...prev]);
    setOpenNewShift(false);
    onToast(`Shift ${next.shiftNo} opened · ${cashier} · float ${money(opening)}`);
  };

  const handleClose = (shift: CashierShift, counted: number, varReason: string, varNotes: string, handover: string) => {
    const nowTime = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
    setShifts(prev => prev.map(s => s.id === shift.id ? {
      ...s, status: "Closed" as const,
      closing: counted, variance: counted - s.expectedClosing,
      endTime: nowTime, varianceReason: varReason, varianceNotes: varNotes, handoverNotes: handover,
    } : s));
    setCloseShiftFor(null);
    onToast(`Shift ${shift.shiftNo} closed · ${money(counted)} counted${counted - shift.expectedClosing !== 0 ? ` · variance ${money(counted - shift.expectedClosing)}` : ""}`);
  };

  const handleVerify = (shift: CashierShift, verifiedBy: string, notes: string) => {
    setShifts(prev => prev.map(s => s.id === shift.id ? {
      ...s, status: "Verified" as const, verifiedBy, verifiedAt: new Date().toISOString(),
      varianceNotes: notes ? `${s.varianceNotes || ""}${s.varianceNotes ? " · " : ""}Verified note: ${notes}` : s.varianceNotes,
    } : s));
    setVerifyShiftFor(null);
    onToast(`Shift ${shift.shiftNo} verified by ${verifiedBy}`);
  };

  return (
    <div className="space-y-5">
      {/* Active shift hero */}
      {activeShifts.length > 0 && (
        <Card className="p-4 border-success/40 bg-linear-to-r from-success-soft/40 via-surface to-surface ring-1 ring-success/15">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-60" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-success" />
              </span>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-success font-semibold">
                  {activeShifts.length} shift{activeShifts.length === 1 ? "" : "s"} currently live on the floor
                </p>
                <p className="text-sm font-medium mt-0.5">
                  {activeShifts.map(s => (
                    <span key={s.id} className="inline-flex items-center gap-1 mr-3">
                      <strong>{s.cashier}</strong>
                      <span className="text-muted-foreground tabular text-xs">({s.shiftNo} · since {s.startTime})</span>
                    </span>
                  ))}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {activeShifts.map(s => (
                <Button key={s.id} variant="outline" size="sm" onClick={() => setCloseShiftFor(s)}>
                  <Lock className="h-3.5 w-3.5" />Close {s.shiftNo}
                </Button>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KPICard label="Cash collected" value={money(totalCash)} icon={Wallet} accent="brand" hint={dateRange} />
        <KPICard label="Card collected" value={money(totalCard)} icon={Receipt} accent="info" />
        <KPICard label="UPI collected"  value={money(totalUpi)}  icon={Receipt} accent="success" />
        <KPICard label="Total receipts" value={money(totalReceipts)} icon={TrendingUp} accent="accent" hint={`${filtered.length} shift${filtered.length === 1 ? "" : "s"}`} />
        <KPICard
          label="Gross variance"
          value={money(grossVariance)}
          icon={AlertCircle}
          accent={grossVariance === 0 ? "success" : grossVariance < 1000 ? "warning" : "danger"}
          hint={`${flaggedCount} flagged`}
        />
      </div>

      {/* Filter bar */}
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          {(["today", "yesterday", "week", "all"] as DateRange[]).map(d => (
            <button key={d} onClick={() => setDateRange(d)} className={cn(
              "h-8 px-3 rounded-full text-xs font-medium border transition-colors capitalize",
              dateRange === d ? "bg-foreground text-background border-foreground shadow-xs" : "border-border hover:bg-surface-sunken text-muted-foreground"
            )}>{d}</button>
          ))}
          <div className="h-6 w-px bg-border mx-1" />
          <Select value={cashierFilter} onChange={e => setCashierFilter(e.target.value)} className="h-8 w-auto text-xs">
            <option value="all">All cashiers</option>
            {cashiers.map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value as typeof statusFilter)} className="h-8 w-auto text-xs">
            <option value="all">All statuses</option>
            <option value="Open">Open</option>
            <option value="Closed">Closed</option>
            <option value="Verified">Verified</option>
          </Select>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-subtle-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Shift # or cashier" className="h-8 pl-8 w-44 text-xs" />
          </div>
          {activeFilters > 0 && (
            <Button size="sm" variant="ghost" onClick={() => { setCashierFilter("all"); setStatusFilter("all"); setSearch(""); }}>
              <X className="h-3 w-3" />Clear ({activeFilters})
            </Button>
          )}
          <div className="flex-1" />
          <p className="text-xs text-muted-foreground tabular hidden sm:block">
            <span className="font-medium text-foreground">{filtered.length}</span> of {shifts.length}
          </p>
          <Button size="sm" variant="outline" onClick={() => { window.print(); onToast("Shift book report printed"); }}>
            <Printer className="h-3.5 w-3.5" />Print
          </Button>
          <Button size="sm" onClick={() => setOpenNewShift(true)}>
            <Plus className="h-3.5 w-3.5" />Open shift
          </Button>
        </div>
      </Card>

      {/* Shift table */}
      <Card className="p-0 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Wallet className="h-8 w-8 mx-auto text-subtle-foreground mb-2" />
            <p className="font-medium">No shifts match these filters</p>
            <p className="text-xs text-muted-foreground mt-1">Try a wider date range or clear filters above</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-elevated border-b border-border">
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">Shift / Cashier</th>
                  <th className="px-4 py-3">Window</th>
                  <th className="px-4 py-3 text-right">Opening</th>
                  <th className="px-4 py-3 text-right">Receipts</th>
                  <th className="px-4 py-3 text-right">Expenses</th>
                  <th className="px-4 py-3 text-right">Expected</th>
                  <th className="px-4 py-3 text-right">Counted</th>
                  <th className="px-4 py-3 text-right">Variance</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(s => {
                  const totalRecv = s.cashReceived + s.cardReceived + s.upiReceived;
                  return (
                    <tr key={s.id} className={cn(
                      "hover:bg-surface-sunken/30 transition-colors",
                      s.status === "Open" && "bg-success-soft/10",
                      s.variance !== 0 && s.status === "Closed" && "bg-warning-soft/15"
                    )}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "h-2 w-2 rounded-full shrink-0",
                            s.status === "Open" ? "bg-success animate-pulse" :
                            s.status === "Closed" ? "bg-warning" : "bg-brand"
                          )} />
                          <div>
                            <p className="font-medium text-sm">{s.cashier}</p>
                            <p className="text-[11px] text-muted-foreground font-mono tabular">{s.shiftNo}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <p className="text-muted-foreground tabular">{formatDate(s.date)}</p>
                        <p className="font-medium tabular">{s.startTime} → {s.endTime}</p>
                      </td>
                      <td className="px-4 py-3 text-right tabular">{money(s.opening)}</td>
                      <td className="px-4 py-3 text-right tabular">
                        <p className="font-medium">{money(totalRecv)}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {money(s.cashReceived)} · {money(s.cardReceived)} · {money(s.upiReceived)}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right tabular">{s.expensesPaid > 0 ? <span className="text-danger">−{money(s.expensesPaid)}</span> : <span className="text-muted-foreground">—</span>}</td>
                      <td className="px-4 py-3 text-right tabular text-muted-foreground">{money(s.expectedClosing)}</td>
                      <td className="px-4 py-3 text-right tabular font-semibold">
                        {s.status === "Open" ? <span className="text-muted-foreground text-xs italic">pending</span> : money(s.closing)}
                      </td>
                      <td className={cn(
                        "px-4 py-3 text-right tabular font-semibold",
                        s.status === "Open" ? "text-muted-foreground" :
                        s.variance < 0 ? "text-danger" :
                        s.variance > 0 ? "text-warning" : "text-success"
                      )}>
                        {s.status === "Open" ? "—" :
                         s.variance === 0 ? <CheckCircle2 className="h-4 w-4 inline text-success" /> :
                         (s.variance > 0 ? "+" : "") + money(s.variance)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={s.status === "Open" ? "success" : s.status === "Closed" ? "warning" : "brand"}>{s.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-1">
                          <button
                            type="button"
                            onClick={() => setDetailShift(s)}
                            className="h-8 w-8 rounded-md border border-border hover:bg-surface-sunken inline-flex items-center justify-center text-muted-foreground transition-colors"
                            title="View shift report"
                          ><Eye className="h-3.5 w-3.5" /></button>
                          {s.status === "Open" && (
                            <Button size="sm" variant="outline" onClick={() => setCloseShiftFor(s)}>
                              <Lock className="h-3.5 w-3.5" />Close
                            </Button>
                          )}
                          {s.status === "Closed" && (
                            <Button size="sm" variant="success" onClick={() => setVerifyShiftFor(s)}>
                              <ShieldCheck className="h-3.5 w-3.5" />Verify
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modals & drawer */}
      {openNewShift && <OpenShiftModal onClose={() => setOpenNewShift(false)} onSave={handleOpen} />}
      {closeShiftFor && <CloseShiftModal shift={closeShiftFor} onClose={() => setCloseShiftFor(null)} onSave={handleClose} />}
      {verifyShiftFor && <VerifyShiftModal shift={verifyShiftFor} onClose={() => setVerifyShiftFor(null)} onSave={handleVerify} />}
      {detailShift && (
        <ShiftDetailDrawer
          shift={detailShift}
          onClose={() => setDetailShift(null)}
          onPrint={() => onToast(`Shift ${detailShift.shiftNo} report printed`)}
        />
      )}
    </div>
  );
}

// ===================== OPEN SHIFT MODAL =====================
function OpenShiftModal({ onClose, onSave }: {
  onClose: () => void;
  onSave: (cashier: string, opening: number) => void;
}) {
  const [cashier, setCashier] = React.useState(CASHIER_ROSTER[0]);
  const [opening, setOpening] = React.useState(50000);
  const nowDisplay = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  React.useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; document.removeEventListener("keydown", onKey); };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="h-8 w-8 rounded-md bg-success-soft text-success inline-flex items-center justify-center"><Plus className="h-4 w-4" /></span>
            <div>
              <h3 className="font-semibold">Open new shift</h3>
              <p className="text-xs text-muted-foreground">Cashier signs for opening float</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="h-7 w-7 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">Cashier on duty</Label>
            <div className="flex flex-wrap gap-1.5">
              {CASHIER_ROSTER.map(c => (
                <button key={c} type="button" onClick={() => setCashier(c)} className={cn(
                  "h-9 px-3 rounded-md text-sm font-medium border transition-colors",
                  cashier === c ? "bg-brand text-brand-foreground border-brand" : "border-border hover:bg-surface-sunken"
                )}>{c}</button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Opening float (cash in drawer)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
              <Input type="number" value={opening} onChange={e => setOpening(Math.max(0, Number(e.target.value) || 0))} className="h-11 pl-7 tabular text-lg font-semibold" min={0} />
            </div>
            <div className="flex gap-1.5 pt-0.5">
              {[20000, 50000, 100000].map(amt => (
                <button key={amt} type="button" onClick={() => setOpening(amt)} className={cn(
                  "h-7 px-2.5 rounded-md border text-xs transition-colors tabular",
                  opening === amt ? "border-brand bg-brand-soft text-brand-soft-foreground" : "border-border hover:bg-surface-sunken"
                )}>
                  {money(amt)}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-md bg-info-soft/30 border border-info/20 p-3 text-xs flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-info shrink-0 mt-0.5" />
            <p>Start time will be <strong className="tabular">{nowDisplay}</strong>. Float is logged against {cashier}&apos;s name and must be returned at shift close.</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-border bg-surface-sunken/30">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(cashier, opening)} disabled={opening <= 0}>
            <Plus className="h-3.5 w-3.5" />Open shift
          </Button>
        </div>
      </div>
    </div>
  );
}

// ===================== CLOSE SHIFT MODAL =====================
function CloseShiftModal({ shift, onClose, onSave }: {
  shift: CashierShift;
  onClose: () => void;
  onSave: (shift: CashierShift, counted: number, varReason: string, varNotes: string, handover: string) => void;
}) {
  const [counts, setCounts] = React.useState<Record<number, number>>({});
  const [varReason, setVarReason] = React.useState("");
  const [varNotes, setVarNotes] = React.useState("");
  const [handover, setHandover] = React.useState("");

  React.useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; document.removeEventListener("keydown", onKey); };
  }, [onClose]);

  const counted = DENOMINATIONS.reduce((t, d) => t + (counts[d.value] || 0) * d.value, 0);
  const variance = counted - shift.expectedClosing;
  const totalNotes = DENOMINATIONS.reduce((t, d) => t + (counts[d.value] || 0), 0);

  const bump = (denom: number, delta: number) =>
    setCounts(c => ({ ...c, [denom]: Math.max(0, (c[denom] || 0) + delta) }));

  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface rounded-xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="h-8 w-8 rounded-md bg-warning-soft text-warning inline-flex items-center justify-center"><Lock className="h-4 w-4" /></span>
            <div>
              <h3 className="font-semibold">Close shift {shift.shiftNo}</h3>
              <p className="text-xs text-muted-foreground">{shift.cashier} · started {shift.startTime} · count cash drawer</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="h-7 w-7 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>

        <div className="px-5 py-4 space-y-4 overflow-y-auto">
          {/* Expected breakdown */}
          <Card className="p-3 bg-info-soft/15 border-info/20">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Expected closing waterfall</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div><p className="text-muted-foreground">Opening float</p><p className="font-semibold tabular">{money(shift.opening)}</p></div>
              <div><p className="text-muted-foreground">+ Cash receipts</p><p className="font-semibold tabular text-success">{money(shift.cashReceived)}</p></div>
              <div><p className="text-muted-foreground">− Expenses paid out</p><p className="font-semibold tabular text-danger">{money(shift.expensesPaid)}</p></div>
              <div><p className="text-muted-foreground">= Expected</p><p className="font-bold tabular text-info text-base">{money(shift.expectedClosing)}</p></div>
            </div>
          </Card>

          {/* Denomination grid */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Physical cash count</p>
              <p className="text-[11px] text-muted-foreground">{totalNotes} note{totalNotes === 1 ? "" : "s"}/coin{totalNotes === 1 ? "" : "s"} counted</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {DENOMINATIONS.map(d => {
                const qty = counts[d.value] || 0;
                const sub = qty * d.value;
                return (
                  <div key={d.value} className={cn("rounded-md border p-2.5 transition-colors", qty > 0 ? "border-brand/40 bg-brand-soft/15" : "border-border")}>
                    <p className="text-[11px] font-bold tracking-wider">{d.label}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <button type="button" onClick={() => bump(d.value, -1)} disabled={qty === 0}
                        className="h-7 w-7 rounded-md border border-border hover:bg-surface-sunken disabled:opacity-30 inline-flex items-center justify-center">
                        <Minus className="h-3 w-3" />
                      </button>
                      <Input type="number" min={0} value={qty || ""} placeholder="0"
                        onChange={e => setCounts(c => ({ ...c, [d.value]: Math.max(0, Number(e.target.value) || 0) }))}
                        className="h-7 tabular text-center text-sm px-1" />
                      <button type="button" onClick={() => bump(d.value, 1)}
                        className="h-7 w-7 rounded-md border border-border hover:bg-surface-sunken inline-flex items-center justify-center">
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <p className="text-[10px] tabular text-muted-foreground text-right mt-1 truncate">{sub > 0 ? money(sub) : "—"}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Counted total + variance */}
          <Card className={cn(
            "p-4 border-2 transition-colors",
            counted === 0 ? "border-border bg-surface-sunken/20" :
            variance === 0 ? "border-success/40 bg-success-soft/20" :
            Math.abs(variance) < 500 ? "border-warning/40 bg-warning-soft/20" :
            "border-danger/40 bg-danger-soft/20"
          )}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Counted total</p>
                <p className="text-2xl font-bold tabular">{money(counted)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Variance vs expected</p>
                <p className={cn(
                  "text-2xl font-bold tabular flex items-center justify-end gap-1",
                  counted === 0 ? "text-muted-foreground" :
                  variance < 0 ? "text-danger" : variance > 0 ? "text-warning" : "text-success"
                )}>
                  {counted === 0 ? "—" :
                   variance === 0 ? <><CheckCircle2 className="h-5 w-5" /> Tally</> :
                   <>{variance > 0 ? "+" : ""}{money(variance)}</>}
                </p>
              </div>
            </div>
          </Card>

          {/* Variance reason if mismatch */}
          {variance !== 0 && counted > 0 && (
            <div className="space-y-2 p-3 rounded-md bg-warning-soft/15 border border-warning/30">
              <p className="text-xs font-semibold flex items-center gap-2"><AlertCircle className="h-4 w-4 text-warning" />Variance reason required</p>
              <div className="flex flex-wrap gap-1.5">
                {VARIANCE_REASONS.map(r => (
                  <button key={r} type="button" onClick={() => setVarReason(r)} className={cn(
                    "h-7 px-2.5 rounded-full text-xs border transition-colors",
                    varReason === r ? "bg-warning text-white border-warning" : "border-border hover:bg-surface-sunken"
                  )}>{r}</button>
                ))}
              </div>
              <textarea value={varNotes} onChange={e => setVarNotes(e.target.value)} placeholder="Explanation / corrective action…"
                rows={2} className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm placeholder:text-subtle-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 outline-hidden resize-y" />
            </div>
          )}

          {/* Handover note */}
          <div className="space-y-1.5">
            <Label className="text-xs"><ClipboardList className="h-3 w-3 inline mr-1" />Handover note for next shift (optional)</Label>
            <textarea value={handover} onChange={e => setHandover(e.target.value)}
              placeholder="e.g. ₹2000 reserved for Room 412 deposit refund · Card terminal slow · …"
              rows={2} className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm placeholder:text-subtle-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 outline-hidden resize-y" />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between gap-2 px-5 py-3 border-t border-border bg-surface-sunken/30">
          <p className="text-xs text-muted-foreground">
            Counted <span className="tabular font-medium text-foreground">{money(counted)}</span> vs expected <span className="tabular font-medium text-foreground">{money(shift.expectedClosing)}</span>
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button
              variant="success"
              disabled={counted === 0 || (variance !== 0 && !varReason)}
              onClick={() => onSave(shift, counted, varReason, varNotes, handover)}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />Confirm close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===================== VERIFY SHIFT MODAL =====================
function VerifyShiftModal({ shift, onClose, onSave }: {
  shift: CashierShift;
  onClose: () => void;
  onSave: (shift: CashierShift, verifiedBy: string, notes: string) => void;
}) {
  const [verifier, setVerifier] = React.useState(VERIFIERS[0]);
  const [notes, setNotes] = React.useState("");

  React.useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; document.removeEventListener("keydown", onKey); };
  }, [onClose]);

  const totalRecv = shift.cashReceived + shift.cardReceived + shift.upiReceived;

  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="h-8 w-8 rounded-md bg-brand-soft text-brand-soft-foreground inline-flex items-center justify-center"><ShieldCheck className="h-4 w-4" /></span>
            <div>
              <h3 className="font-semibold">Verify shift {shift.shiftNo}</h3>
              <p className="text-xs text-muted-foreground">Manager / accounts sign-off</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="h-7 w-7 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <Card className="p-3 bg-surface-sunken/30">
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div><p className="text-muted-foreground">Cashier</p><p className="font-medium">{shift.cashier}</p></div>
              <div><p className="text-muted-foreground">Window</p><p className="font-medium tabular">{shift.startTime}–{shift.endTime}</p></div>
              <div><p className="text-muted-foreground">Receipts</p><p className="font-medium tabular">{money(totalRecv)}</p></div>
            </div>
            {shift.variance !== 0 && (
              <div className={cn(
                "mt-2 pt-2 border-t border-border flex items-center justify-between",
                shift.variance < 0 ? "text-danger" : "text-warning"
              )}>
                <span className="text-xs font-medium inline-flex items-center gap-1.5"><AlertCircle className="h-3.5 w-3.5" />Variance flagged · {shift.varianceReason || "no reason"}</span>
                <span className="text-xs tabular font-bold">{shift.variance > 0 ? "+" : ""}{money(shift.variance)}</span>
              </div>
            )}
            {shift.varianceNotes && (
              <p className="mt-1.5 text-[11px] text-muted-foreground italic">&ldquo;{shift.varianceNotes}&rdquo;</p>
            )}
          </Card>

          <div className="space-y-1.5">
            <Label className="text-xs">Verified by</Label>
            <Select value={verifier} onChange={e => setVerifier(e.target.value)} className="h-9">
              {VERIFIERS.map(v => <option key={v}>{v}</option>)}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Verification notes</Label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder={shift.variance !== 0 ? "Variance investigated — explain resolution / action taken" : "All tallies match — no action needed"}
              rows={2} className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm placeholder:text-subtle-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 outline-hidden resize-y" />
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-border bg-surface-sunken/30">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="success" onClick={() => onSave(shift, verifier, notes)}>
            <ShieldCheck className="h-3.5 w-3.5" />Verify shift
          </Button>
        </div>
      </div>
    </div>
  );
}

// ===================== SHIFT DETAIL DRAWER =====================
function ShiftDetailDrawer({ shift, onClose, onPrint }: {
  shift: CashierShift;
  onClose: () => void;
  onPrint: () => void;
}) {
  React.useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; document.removeEventListener("keydown", onKey); };
  }, [onClose]);

  const totalRecv = shift.cashReceived + shift.cardReceived + shift.upiReceived;
  // Mock transactions for the drawer
  const SAMPLE_TXNS = [
    { time: "08:15", ref: "RCP-2026-100240", type: "Folio settle · BK100240",   mode: "Card", amt:  14500 },
    { time: "10:42", ref: "RCP-2026-100241", type: "Walk-in advance · WI-1182", mode: "Cash", amt:   8000 },
    { time: "12:08", ref: "PV-2026-0419",    type: "Expense · Vegetable mkt",   mode: "Cash (out)", amt: -2500 },
    { time: "13:25", ref: "RCP-2026-100244", type: "F&B order · Room 408",      mode: "UPI",  amt:   1650 },
    { time: "14:11", ref: "RCP-2026-100246", type: "Folio settle · BK100225",   mode: "Card", amt:  22400 },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm" onClick={onClose}>
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-xl bg-surface shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Shift report</p>
            <h3 className="font-semibold truncate">{shift.shiftNo} · {shift.cashier}</h3>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="sm" onClick={onPrint}><Printer className="h-3.5 w-3.5" />Print</Button>
            <button type="button" onClick={onClose} className="h-8 w-8 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
          </div>
        </div>

        <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1">
          {/* Summary */}
          <Card className="p-4">
            <div className="flex justify-between items-start gap-4">
              <div>
                <Badge tone={shift.status === "Open" ? "success" : shift.status === "Closed" ? "warning" : "brand"}>{shift.status}</Badge>
                <p className="mt-2 text-sm font-medium">{formatDate(shift.date)}</p>
                <p className="text-xs text-muted-foreground tabular">{shift.startTime} → {shift.endTime}</p>
                {shift.verifiedBy && (
                  <p className="text-[11px] text-muted-foreground mt-1 inline-flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-brand" />by {shift.verifiedBy}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Net receipts</p>
                <p className="text-2xl font-bold tabular">{money(totalRecv)}</p>
              </div>
            </div>
          </Card>

          {/* Receipts breakdown */}
          <div>
            <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2">Receipts</p>
            <div className="grid grid-cols-3 gap-2">
              <Card className="p-3">
                <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Cash</p>
                <p className="font-bold tabular text-sm mt-0.5">{money(shift.cashReceived)}</p>
              </Card>
              <Card className="p-3">
                <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Card</p>
                <p className="font-bold tabular text-sm mt-0.5">{money(shift.cardReceived)}</p>
              </Card>
              <Card className="p-3">
                <p className="text-[10px] uppercase text-muted-foreground tracking-wider">UPI</p>
                <p className="font-bold tabular text-sm mt-0.5">{money(shift.upiReceived)}</p>
              </Card>
            </div>
          </div>

          {/* Cash waterfall */}
          <div>
            <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2">Cash drawer waterfall</p>
            <Card className="p-3 space-y-1.5 text-sm">
              <div className="flex justify-between"><span>Opening float</span><span className="tabular">{money(shift.opening)}</span></div>
              <div className="flex justify-between text-success"><span>+ Cash receipts</span><span className="tabular">{money(shift.cashReceived)}</span></div>
              <div className="flex justify-between text-danger"><span>− Expenses paid out</span><span className="tabular">−{money(shift.expensesPaid)}</span></div>
              <div className="border-t border-border pt-1.5 flex justify-between font-semibold"><span>Expected closing</span><span className="tabular text-info">{money(shift.expectedClosing)}</span></div>
              {shift.closing > 0 && (
                <div className="flex justify-between font-semibold"><span>Counted closing</span><span className="tabular">{money(shift.closing)}</span></div>
              )}
              {shift.status !== "Open" && (
                <div className={cn(
                  "flex justify-between font-bold text-base pt-1.5 border-t border-border",
                  shift.variance < 0 ? "text-danger" : shift.variance > 0 ? "text-warning" : "text-success"
                )}>
                  <span>Variance</span>
                  <span className="tabular inline-flex items-center gap-1.5">
                    {shift.variance === 0 ? <><CheckCircle2 className="h-4 w-4" />Tally</> :
                     <>{shift.variance > 0 ? "+" : ""}{money(shift.variance)}</>}
                  </span>
                </div>
              )}
            </Card>
            {shift.varianceReason && (
              <p className="text-[11px] text-warning mt-1.5 inline-flex items-center gap-1"><AlertCircle className="h-3 w-3" />{shift.varianceReason}{shift.varianceNotes ? ` — ${shift.varianceNotes}` : ""}</p>
            )}
          </div>

          {/* Transactions sample */}
          <div>
            <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2">Recent transactions <span className="text-[10px] text-muted-foreground normal-case font-normal">(sample)</span></p>
            <Card className="p-0 overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-surface-elevated">
                  <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2">Time</th>
                    <th className="px-3 py-2">Reference</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {SAMPLE_TXNS.map((t, i) => (
                    <tr key={i}>
                      <td className="px-3 py-1.5 tabular text-muted-foreground">{t.time}</td>
                      <td className="px-3 py-1.5 font-mono tabular text-[10px]">{t.ref}</td>
                      <td className="px-3 py-1.5"><span className="mr-1.5">{t.type}</span><Badge tone="neutral">{t.mode}</Badge></td>
                      <td className={cn("px-3 py-1.5 text-right tabular font-medium", t.amt < 0 && "text-danger")}>{t.amt < 0 ? "−" : ""}{money(Math.abs(t.amt))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>

          {/* Handover */}
          {shift.handoverNotes && (
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2"><ClipboardList className="h-3 w-3 inline mr-1" />Handover to next shift</p>
              <Card className="p-3 bg-info-soft/15 border-info/20 text-sm italic">&ldquo;{shift.handoverNotes}&rdquo;</Card>
            </div>
          )}

          {/* Timeline */}
          <div>
            <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2">Timeline</p>
            <ol className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-success shrink-0" />
                <span>Opened by <strong>{shift.cashier}</strong> at <span className="tabular">{shift.startTime}</span> · float {money(shift.opening)}</span>
              </li>
              {shift.status !== "Open" && (
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-warning shrink-0" />
                  <span>Closed at <span className="tabular">{shift.endTime}</span> · {money(shift.closing)} counted{shift.variance !== 0 ? ` · variance ${money(shift.variance)}` : ""}</span>
                </li>
              )}
              {shift.status === "Verified" && (
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-brand shrink-0" />
                  <span>Verified by <strong>{shift.verifiedBy || "Accounts"}</strong></span>
                </li>
              )}
            </ol>
          </div>
        </div>

        <div className="border-t border-border px-5 py-3 bg-surface-sunken/30 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Close</Button>
          <Button variant="outline" onClick={onPrint}><Printer className="h-3.5 w-3.5" />Print report</Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// FULL-SCREEN EXPENSE ENTRY FORM
// ============================================================
const TDS_SECTIONS = [
  { code: "—",     label: "No TDS",                         rate: 0 },
  { code: "194C",  label: "194C · Contractor / job-work",   rate: 2 },
  { code: "194H",  label: "194H · Commission / brokerage",  rate: 5 },
  { code: "194I",  label: "194I · Rent",                    rate: 10 },
  { code: "194J",  label: "194J · Professional / technical", rate: 10 },
  { code: "194Q",  label: "194Q · Purchase of goods",       rate: 0.1 },
  { code: "194O",  label: "194O · E-commerce",              rate: 1 },
];
const PAYMENT_MODES = ["Cash", "UPI", "Card", "NEFT", "RTGS", "IMPS", "Cheque", "Pending"];
const PAY_FROM_ACCOUNTS = ["HDFC Operating · 5012•••0419", "ICICI Savings · 0042•••8821", "Cash in Hand", "Petty Cash", "SBI Deposit · 37854•••2378"];
const DEPARTMENTS = ["Front office", "Housekeeping", "F&B Kitchen", "F&B Service", "Maintenance", "Accounts", "Sales & Marketing", "General admin", "IT"];
const COST_CENTERS = ["Rooms", "F&B", "Banquet", "Spa", "Maintenance", "Admin"];
const PROPERTIES = ["The Pearl Marina · Main Tower", "The Pearl Marina · Annexe"];
const APPROVERS = ["Auto-approved (≤₹10,000)", "Manager · Rohit K.", "Manager · Anjali S.", "Owner", "Accounts · CA Sharma"];

type Attachment = { id: string; name: string; size: number; type: string; dataUrl: string };

type SectionId = "basics" | "invoice" | "lines" | "totals" | "payment" | "approval" | "recurring" | "attachments" | "notes";
const SECTIONS: { id: SectionId; label: string; icon: typeof FileText }[] = [
  { id: "basics",      label: "Basics",        icon: FileText },
  { id: "invoice",     label: "Invoice & tax", icon: Receipt },
  { id: "lines",       label: "Line items",    icon: FileText },
  { id: "totals",      label: "Totals & TDS",  icon: TrendingUp },
  { id: "payment",     label: "Payment",       icon: Wallet },
  { id: "approval",    label: "Approval",      icon: CheckCircle2 },
  { id: "recurring",   label: "Recurring",     icon: Calendar },
  { id: "attachments", label: "Attachments",   icon: FileText },
  { id: "notes",       label: "Notes",         icon: FileText },
];

function FullScreenExpenseForm({ expenseCats, onClose, onSubmit }: {
  expenseCats: string[];
  onClose: () => void;
  onSubmit: (entry: Omit<Entry, "id">, addAnother: boolean) => void;
}) {
  // -------------- state --------------
  const [date, setDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [vendor, setVendor] = React.useState("");
  const [vendorAddress, setVendorAddress] = React.useState("");
  const [category, setCategory] = React.useState(expenseCats[0]);
  const [subCategory, setSubCategory] = React.useState("");
  const [voucherNo, setVoucherNo] = React.useState(`PV-2026-${Math.floor(1000 + Math.random() * 9000)}`);
  const [property, setProperty] = React.useState(PROPERTIES[0]);
  const [department, setDepartment] = React.useState(DEPARTMENTS[0]);
  const [costCenter, setCostCenter] = React.useState(COST_CENTERS[0]);

  const [invoiceNo, setInvoiceNo] = React.useState("");
  const [invoiceDate, setInvoiceDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [placeOfSupply, setPlaceOfSupply] = React.useState("Maharashtra (27)");
  const [gstin, setGstin] = React.useState("");
  const [pan, setPan] = React.useState("");
  const [reverseCharge, setReverseCharge] = React.useState(false);
  const [interState, setInterState] = React.useState(false);

  const [lines, setLines] = React.useState<ExpenseLine[]>([blankLine()]);

  const [discount, setDiscount] = React.useState(0);
  const [freight, setFreight] = React.useState(0);
  const [roundOff, setRoundOff] = React.useState(0);
  const [tdsCode, setTdsCode] = React.useState("—");
  const tds = TDS_SECTIONS.find(t => t.code === tdsCode)!;

  const [mode, setMode] = React.useState("UPI");
  const [payFrom, setPayFrom] = React.useState(PAY_FROM_ACCOUNTS[0]);
  const [reference, setReference] = React.useState("");
  const [chequeNo, setChequeNo] = React.useState("");
  const [paymentDate, setPaymentDate] = React.useState(new Date().toISOString().slice(0, 10));

  const [approver, setApprover] = React.useState(APPROVERS[0]);
  const [approvalNote, setApprovalNote] = React.useState("");

  const [recurring, setRecurring] = React.useState(false);
  const [frequency, setFrequency] = React.useState<"weekly" | "monthly" | "quarterly" | "yearly">("monthly");
  const [endsOn, setEndsOn] = React.useState("");

  const [attachments, setAttachments] = React.useState<Attachment[]>([]);
  const [internalNote, setInternalNote] = React.useState("");
  const [vendorNote, setVendorNote] = React.useState("");

  const [activeSection, setActiveSection] = React.useState<SectionId>("basics");

  // -------------- handlers --------------
  React.useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; document.removeEventListener("keydown", onKey); };
  }, [onClose]);

  const updLine = (id: string, patch: Partial<ExpenseLine>) => {
    setLines(prev => prev.map(l => {
      if (l.id !== id) return l;
      const next = { ...l, ...patch };
      next.taxable = +(next.qty * next.rate).toFixed(2);
      next.tax = +(next.taxable * next.gstPct / 100).toFixed(2);
      next.amount = +(next.taxable + next.tax).toFixed(2);
      return next;
    }));
  };
  const addLine = () => setLines(prev => [...prev, blankLine()]);
  const removeLine = (id: string) => setLines(prev => prev.length > 1 ? prev.filter(l => l.id !== id) : prev);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => {
        const dataUrl = (ev.target?.result as string) || "";
        setAttachments(prev => [...prev, { id: `att-${Date.now()}-${file.name}`, name: file.name, size: file.size, type: file.type, dataUrl }]);
      };
      reader.readAsDataURL(file);
    });
  };

  // -------------- derived totals --------------
  const taxableTotal = lines.reduce((t, l) => t + l.taxable, 0);
  const taxTotal     = lines.reduce((t, l) => t + l.tax, 0);
  const cgst = interState ? 0 : taxTotal / 2;
  const sgst = interState ? 0 : taxTotal / 2;
  const igst = interState ? taxTotal : 0;
  const subTotal  = taxableTotal + taxTotal;
  const afterDiscount = subTotal - discount;
  const beforeTds = afterDiscount + freight + roundOff;
  const tdsAmount = Math.round(taxableTotal * tds.rate / 100);
  const netPayable = beforeTds - tdsAmount;

  const valid = vendor.trim() !== "" && taxableTotal > 0 && lines.every(l => l.description.trim() !== "" || l.rate === 0);

  const handleSubmit = (addAnother: boolean) => {
    const firstAtt = attachments[0];
    const entry: Omit<Entry, "id"> = {
      date, type: "expense",
      category, vendor, gstin,
      description: subCategory ? `${subCategory} — ${lines.map(l => l.description).filter(Boolean).slice(0, 2).join(", ")}` : lines.map(l => l.description).filter(Boolean).slice(0, 2).join(", ") || category,
      amount: Math.round(netPayable),
      mode, ref: reference || chequeNo || invoiceNo,
      cgst, sgst, igst,
      hsnSac: lines.find(l => l.hsnSac)?.hsnSac,
      lines,
      attachment: firstAtt ? { name: firstAtt.name, dataUrl: firstAtt.dataUrl, type: firstAtt.type } : null,
      voucherNo,
    };
    onSubmit(entry, addAnother);
    if (addAnother) {
      // Reset for next entry but keep vendor/property/category
      setLines([blankLine()]);
      setInvoiceNo(""); setReference(""); setChequeNo("");
      setDiscount(0); setFreight(0); setRoundOff(0);
      setAttachments([]); setInternalNote(""); setVendorNote("");
      setVoucherNo(`PV-2026-${Math.floor(1000 + Math.random() * 9000)}`);
      setActiveSection("basics");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Sticky header */}
      <div className="h-14 border-b border-border bg-surface flex items-center px-5 gap-3 shrink-0">
        <span className="h-9 w-9 rounded-md bg-warning-soft text-warning inline-flex items-center justify-center"><Plus className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-base leading-tight">New expense</h2>
          <p className="text-[11px] text-muted-foreground tabular">Voucher {voucherNo} · {date}</p>
        </div>
        <Badge tone={valid ? "success" : "warning"}>
          {valid ? <><CheckCircle2 className="h-3 w-3" />Ready to save</> : <><AlertCircle className="h-3 w-3" />Vendor &amp; lines required</>}
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
            {SECTIONS.map(s => {
              const Icon = s.icon;
              return (
                <li key={s.id}>
                  <a
                    href={`#sec-${s.id}`}
                    onClick={() => setActiveSection(s.id)}
                    className={cn(
                      "flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm transition-colors",
                      activeSection === s.id ? "bg-brand-soft text-brand-soft-foreground font-medium" : "hover:bg-surface text-muted-foreground"
                    )}
                  >
                    <Icon className={cn("h-3.5 w-3.5", activeSection === s.id ? "text-brand" : "")} />
                    {s.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto px-5 lg:px-8 py-5 space-y-6">
          {/* Section 1 · Basics */}
          <Section id="basics" title="Basics" subtitle="When, who, where">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field label="Expense date *"><Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-9 tabular" /></Field>
              <Field label="Voucher #"><Input value={voucherNo} onChange={e => setVoucherNo(e.target.value)} className="h-9 font-mono tabular" /></Field>
              <Field label="Property"><Select value={property} onChange={e => setProperty(e.target.value)} className="h-9">{PROPERTIES.map(p => <option key={p}>{p}</option>)}</Select></Field>
              <Field label="Vendor / Payee *"><Input value={vendor} onChange={e => setVendor(e.target.value)} placeholder="e.g. ABC Linens Pvt Ltd" className="h-9" /></Field>
              <Field label="Vendor address"><Input value={vendorAddress} onChange={e => setVendorAddress(e.target.value)} placeholder="City, State" className="h-9" /></Field>
              <Field label="Category *"><Select value={category} onChange={e => setCategory(e.target.value)} className="h-9">{expenseCats.map(c => <option key={c}>{c}</option>)}</Select></Field>
              <Field label="Sub-category"><Input value={subCategory} onChange={e => setSubCategory(e.target.value)} placeholder="e.g. Linen replacement" className="h-9" /></Field>
              <Field label="Department"><Select value={department} onChange={e => setDepartment(e.target.value)} className="h-9">{DEPARTMENTS.map(d => <option key={d}>{d}</option>)}</Select></Field>
              <Field label="Cost center"><Select value={costCenter} onChange={e => setCostCenter(e.target.value)} className="h-9">{COST_CENTERS.map(c => <option key={c}>{c}</option>)}</Select></Field>
            </div>
          </Section>

          {/* Section 2 · Invoice + Tax */}
          <Section id="invoice" title="Invoice & tax" subtitle="GST and supplier identity">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field label="Invoice no"><Input value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} placeholder="ABC-2426" className="h-9 font-mono tabular" /></Field>
              <Field label="Invoice date"><Input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} className="h-9 tabular" /></Field>
              <Field label="Place of supply">
                <Select value={placeOfSupply} onChange={e => setPlaceOfSupply(e.target.value)} className="h-9">
                  <option>Maharashtra (27)</option><option>Karnataka (29)</option><option>Tamil Nadu (33)</option>
                  <option>Delhi (07)</option><option>Gujarat (24)</option><option>Outside India</option>
                </Select>
              </Field>
              <Field label="Vendor GSTIN"><Input value={gstin} onChange={e => setGstin(e.target.value.toUpperCase())} placeholder="27ABCDE1234F1Z5" className="h-9 font-mono tabular" /></Field>
              <Field label="Vendor PAN"><Input value={pan} onChange={e => setPan(e.target.value.toUpperCase())} placeholder="ABCDE1234F" className="h-9 font-mono tabular" /></Field>
              <div className="space-y-2">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Tax flags</label>
                <div className="flex flex-col gap-2">
                  <CheckRow on={reverseCharge} onChange={setReverseCharge} label="Reverse charge applicable (RCM)" />
                  <CheckRow on={interState} onChange={setInterState} label="Inter-state supply (IGST instead of CGST+SGST)" />
                </div>
              </div>
            </div>
          </Section>

          {/* Section 3 · Line items */}
          <Section id="lines" title="Line items" subtitle="Itemise the bill (multi-line)">
            <div className="rounded-md border border-border overflow-x-auto">
              <table className="w-full text-sm min-w-[760px]">
                <thead className="bg-surface-sunken/40 border-b border-border">
                  <tr className="text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="text-left px-3 py-2 font-semibold">Description</th>
                    <th className="text-left px-3 py-2 font-semibold">HSN/SAC</th>
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
                      <td className="px-3 py-1.5"><Input value={l.description} onChange={e => updLine(l.id, { description: e.target.value })} className="h-8 text-xs min-w-[180px]" placeholder={`Item ${i + 1}`} /></td>
                      <td className="px-3 py-1.5"><Input value={l.hsnSac} onChange={e => updLine(l.id, { hsnSac: e.target.value })} className="h-8 text-xs font-mono tabular w-20" placeholder="9963" /></td>
                      <td className="px-2 py-1.5"><Input type="number" value={l.qty} onChange={e => updLine(l.id, { qty: Math.max(0, Number(e.target.value)) })} className="h-8 text-xs tabular text-right w-14" min={0} /></td>
                      <td className="px-2 py-1.5"><Input type="number" value={l.rate} onChange={e => updLine(l.id, { rate: Math.max(0, Number(e.target.value)) })} className="h-8 text-xs tabular text-right w-20" min={0} step="0.01" /></td>
                      <td className="px-2 py-1.5">
                        <Select value={l.gstPct} onChange={e => updLine(l.id, { gstPct: Number(e.target.value) })} className="h-8 text-xs tabular w-16">
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
                    <td colSpan={5} className="px-3 py-2">
                      <Button size="sm" variant="ghost" onClick={addLine}><Plus className="h-3 w-3" />Add line</Button>
                    </td>
                    <td className="px-2 py-2 text-right tabular font-semibold">{money(taxableTotal)}</td>
                    <td className="px-2 py-2 text-right tabular font-semibold text-muted-foreground">{money(taxTotal)}</td>
                    <td className="px-2 py-2 text-right tabular font-bold">{money(subTotal)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Section>

          {/* Section 4 · Totals & TDS */}
          <Section id="totals" title="Totals, charges & TDS" subtitle="Discount · freight · round-off · TDS deduction">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field label="Discount (₹)"><Input type="number" value={discount} onChange={e => setDiscount(Math.max(0, Number(e.target.value)))} className="h-9 tabular" min={0} /></Field>
              <Field label="Freight / charges (₹)"><Input type="number" value={freight} onChange={e => setFreight(Math.max(0, Number(e.target.value)))} className="h-9 tabular" min={0} /></Field>
              <Field label="Round-off (₹)"><Input type="number" value={roundOff} onChange={e => setRoundOff(Number(e.target.value))} className="h-9 tabular" /></Field>
              <Field label="TDS section">
                <Select value={tdsCode} onChange={e => setTdsCode(e.target.value)} className="h-9">
                  {TDS_SECTIONS.map(t => <option key={t.code} value={t.code}>{t.label}</option>)}
                </Select>
              </Field>
              <Field label="TDS rate">
                <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-border bg-surface-sunken/30">
                  <span className="text-sm tabular font-semibold">{tds.rate}%</span>
                  <span className="text-[11px] text-muted-foreground">→ TDS {money(tdsAmount)}</span>
                </div>
              </Field>
            </div>
          </Section>

          {/* Section 5 · Payment */}
          <Section id="payment" title="Payment" subtitle="When and how this is being paid">
            <Field label="Payment mode">
              <div className="grid grid-cols-4 lg:grid-cols-8 gap-1.5">
                {PAYMENT_MODES.map(m => (
                  <button key={m} type="button" onClick={() => setMode(m)} className={cn(
                    "h-10 rounded-md border text-xs font-medium transition-colors",
                    mode === m ? "bg-brand text-brand-foreground border-brand" : "border-border hover:bg-surface-sunken"
                  )}>{m}</button>
                ))}
              </div>
            </Field>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
              <Field label="From account"><Select value={payFrom} onChange={e => setPayFrom(e.target.value)} className="h-9">{PAY_FROM_ACCOUNTS.map(a => <option key={a}>{a}</option>)}</Select></Field>
              <Field label="Payment date"><Input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="h-9 tabular" /></Field>
              {mode === "Cheque" ? (
                <Field label="Cheque number"><Input value={chequeNo} onChange={e => setChequeNo(e.target.value)} placeholder="e.g. 412580" className="h-9 font-mono tabular" /></Field>
              ) : (
                <Field label="Reference / UTR / Txn ID"><Input value={reference} onChange={e => setReference(e.target.value)} placeholder={mode === "UPI" ? "UPI ref" : mode === "NEFT" ? "UTR" : "Reference"} className="h-9 font-mono tabular" /></Field>
              )}
            </div>
          </Section>

          {/* Section 6 · Approval */}
          <Section id="approval" title="Approval" subtitle="Who signs this off">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Approver"><Select value={approver} onChange={e => setApprover(e.target.value)} className="h-9">{APPROVERS.map(a => <option key={a}>{a}</option>)}</Select></Field>
              <Field label="Approval note"><Input value={approvalNote} onChange={e => setApprovalNote(e.target.value)} placeholder="Brief reason / context" className="h-9" /></Field>
            </div>
          </Section>

          {/* Section 7 · Recurring */}
          <Section id="recurring" title="Recurring schedule" subtitle="Set up auto-posting for monthly bills (DEWA, rent, AMC etc.)">
            <CheckRow on={recurring} onChange={setRecurring} label="Mark this expense recurring" />
            {recurring && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 pl-5 border-l-2 border-brand/30">
                <Field label="Frequency">
                  <Select value={frequency} onChange={e => setFrequency(e.target.value as typeof frequency)} className="h-9">
                    <option value="weekly">Weekly</option><option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option><option value="yearly">Yearly</option>
                  </Select>
                </Field>
                <Field label="Ends on (optional)"><Input type="date" value={endsOn} onChange={e => setEndsOn(e.target.value)} className="h-9 tabular" /></Field>
                <div className="flex items-end">
                  <p className="text-[11px] text-muted-foreground">Next entry will auto-post 1 {frequency.replace("ly", "")} after this date.</p>
                </div>
              </div>
            )}
          </Section>

          {/* Section 8 · Attachments */}
          <Section id="attachments" title="Attachments" subtitle="Upload bill, invoice, PO, GRN, sign-off documents">
            <label className="flex items-center justify-center gap-2 h-20 rounded-md border-2 border-dashed border-border hover:border-brand hover:bg-brand-soft/15 cursor-pointer transition-colors">
              <FileDown className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm">Click or drop files here · PDF, JPG, PNG · up to 5 MB each</span>
              <input type="file" multiple className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={onFile} />
            </label>
            {attachments.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {attachments.map(a => (
                  <li key={a.id} className="flex items-center gap-3 p-2 rounded-md border border-border">
                    <FileText className="h-4 w-4 text-info shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{a.name}</p>
                      <p className="text-[10px] text-muted-foreground tabular">{(a.size / 1024).toFixed(1)} KB · {a.type || "file"}</p>
                    </div>
                    <button type="button" onClick={() => setAttachments(prev => prev.filter(x => x.id !== a.id))} className="h-7 w-7 rounded-md hover:bg-danger-soft hover:text-danger inline-flex items-center justify-center text-muted-foreground">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {/* Section 9 · Notes */}
          <Section id="notes" title="Notes" subtitle="Internal context (not visible to vendor)">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Internal note">
                <textarea value={internalNote} onChange={e => setInternalNote(e.target.value)} rows={3} placeholder="Audit trail context, special handling…"
                  className="w-full px-3 py-2 rounded-md border border-border bg-surface text-sm focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 outline-hidden resize-y" />
              </Field>
              <Field label="Note on cheque / wire to vendor">
                <textarea value={vendorNote} onChange={e => setVendorNote(e.target.value)} rows={3} placeholder="Goes on cheque memo or bank narration…"
                  className="w-full px-3 py-2 rounded-md border border-border bg-surface text-sm focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 outline-hidden resize-y" />
              </Field>
            </div>
          </Section>
        </main>

        {/* Right rail · live totals */}
        <aside className="w-80 border-l border-border bg-surface-sunken/30 overflow-y-auto p-4 hidden xl:block shrink-0 space-y-3">
          <Card className="p-4">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-2 inline-flex items-center gap-1.5"><TrendingUp className="h-3 w-3" />Live totals</p>
            <dl className="space-y-1.5 text-sm">
              <Row k="Taxable value"   v={money(taxableTotal)} />
              {!interState ? (<>
                <Row k="CGST"          v={money(cgst)} muted />
                <Row k="SGST"          v={money(sgst)} muted />
              </>) : (
                <Row k="IGST"          v={money(igst)} muted />
              )}
              <Row k="Subtotal"        v={money(subTotal)} divide />
              {discount > 0 && <Row k="− Discount"     v={money(discount)} muted />}
              {freight  > 0 && <Row k="+ Freight"      v={money(freight)}  muted />}
              {roundOff !== 0 && <Row k="+ Round-off"  v={money(roundOff)} muted />}
              {tdsAmount > 0 && <Row k={`− TDS (${tds.code})`} v={money(tdsAmount)} muted />}
              <Row k="Net payable"     v={money(netPayable)} bold divide />
            </dl>
            {reverseCharge && (
              <p className="text-[10px] text-warning mt-2 inline-flex items-start gap-1">
                <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />RCM applies: tax payable by recipient
              </p>
            )}
          </Card>

          <Card className="p-4">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-2">Allocation</p>
            <dl className="space-y-1 text-xs">
              <Row k="Property" v={property.split(" · ")[1] || property} />
              <Row k="Department" v={department} />
              <Row k="Cost center" v={costCenter} />
              <Row k="Approver" v={approver} />
            </dl>
          </Card>

          <Card className="p-4 bg-info-soft/15 border-info/20">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-info mb-2">Validations</p>
            <ul className="text-[11px] space-y-1">
              <li className={cn("inline-flex items-center gap-1.5", vendor.trim() ? "text-success" : "text-muted-foreground")}>
                {vendor.trim() ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}Vendor specified
              </li>
              <li className={cn("inline-flex items-center gap-1.5", taxableTotal > 0 ? "text-success" : "text-muted-foreground")}>
                {taxableTotal > 0 ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}At least one line with value
              </li>
              <li className={cn("inline-flex items-center gap-1.5", attachments.length > 0 ? "text-success" : "text-warning")}>
                {attachments.length > 0 ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}Bill / invoice attached
              </li>
              <li className={cn("inline-flex items-center gap-1.5", gstin.length === 15 ? "text-success" : gstin.length === 0 ? "text-muted-foreground" : "text-warning")}>
                {gstin.length === 15 ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}GSTIN {gstin.length === 15 ? "valid (15 chars)" : gstin.length === 0 ? "optional" : "invalid length"}
              </li>
            </ul>
          </Card>
        </aside>
      </div>

      {/* Sticky footer */}
      <div className="h-16 border-t border-border bg-surface flex items-center px-5 gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <p className="text-[11px] text-muted-foreground">Net payable</p>
          <p className="text-xl font-bold tabular">{money(netPayable)}</p>
          {tdsAmount > 0 && <Badge tone="info">TDS {money(tdsAmount)}</Badge>}
          {recurring && <Badge tone="brand"><Calendar className="h-2.5 w-2.5" />Recurring · {frequency}</Badge>}
        </div>
        <div className="flex-1" />
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="outline" disabled={!valid} onClick={() => handleSubmit(true)}>
          <Plus className="h-3.5 w-3.5" />Save &amp; add another
        </Button>
        <Button variant="success" disabled={!valid} onClick={() => handleSubmit(false)}>
          <CheckCircle2 className="h-3.5 w-3.5" />Save expense
        </Button>
      </div>
    </div>
  );
}

function Section({ id, title, subtitle, children }: { id: string; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section id={`sec-${id}`} className="scroll-mt-20">
      <div className="mb-3">
        <h3 className="font-semibold text-base">{title}</h3>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <div>{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function CheckRow({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" onClick={() => onChange(!on)} className={cn(
      "w-full flex items-center gap-2.5 p-2.5 rounded-md border text-left transition-colors",
      on ? "border-brand bg-brand-soft/20" : "border-border hover:bg-surface-sunken"
    )}>
      <span className={cn(
        "h-4 w-4 rounded border-2 inline-flex items-center justify-center shrink-0",
        on ? "border-brand bg-brand text-brand-foreground" : "border-border-strong"
      )}>{on && <CheckCircle2 className="h-2.5 w-2.5" />}</span>
      <span className="text-sm">{label}</span>
    </button>
  );
}

function Row({ k, v, muted, bold, divide }: { k: React.ReactNode; v: React.ReactNode; muted?: boolean; bold?: boolean; divide?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between gap-3", divide && "border-t border-border pt-1.5 mt-1")}>
      <span className={cn("text-xs", muted ? "text-muted-foreground" : "text-foreground")}>{k}</span>
      <span className={cn("tabular text-sm", muted ? "text-muted-foreground" : "text-foreground", bold && "font-bold text-base")}>{v}</span>
    </div>
  );
}
