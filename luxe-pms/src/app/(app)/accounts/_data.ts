export const PL_TREND = [
  { month: "Dec", income: 86000, expense: 62000 },
  { month: "Jan", income: 98300, expense: 68500 },
  { month: "Feb", income: 110400, expense: 72100 },
  { month: "Mar", income: 117100, expense: 74800 },
  { month: "Apr", income: 124000, expense: 78400 },
  { month: "May", income: 130110, expense: 76300 },
];

export const CASH_FLOW = Array.from({ length: 30 }, (_, i) => ({
  day: `${i + 1}`,
  balance: 45000 + Math.round(Math.sin(i / 3) * 8000 + i * 600 + Math.cos(i / 5) * 4000),
}));

// ============ NEW: BANK ACCOUNTS + RECONCILIATION ============
export type BankAccount = {
  id: string; name: string; bank: string; accountNo: string; ifsc: string;
  bookBalance: number; bankBalance: number; uncleared: number;
};
export const BANK_ACCOUNTS: BankAccount[] = [
  { id: "ba1", name: "HDFC Operating", bank: "HDFC Bank", accountNo: "50100012345678", ifsc: "HDFC0001234", bookBalance: 1842500, bankBalance: 1818250, uncleared: 24250 },
  { id: "ba2", name: "ICICI Salary",   bank: "ICICI Bank", accountNo: "624505123456",   ifsc: "ICIC0006245", bookBalance:  342150, bankBalance:  342150, uncleared:     0 },
  { id: "ba3", name: "SBI Deposit",    bank: "State Bank of India", accountNo: "37854612378", ifsc: "SBIN0001890", bookBalance:  956400, bankBalance:  950000, uncleared:  6400 },
];

export type ReconcileEntry = {
  id: string; date: string; description: string; debit: number; credit: number;
  matched: boolean; source: "book" | "bank"; ref?: string;
};
export const RECONCILE: ReconcileEntry[] = [
  { id: "rc1", date: "2026-05-22", description: "Folio settle · BK100240", debit: 0,     credit: 14500, matched: true,  source: "book", ref: "RCP-2026-100240" },
  { id: "rc2", date: "2026-05-22", description: "Card POS deposit",         debit: 0,     credit: 14500, matched: true,  source: "bank", ref: "DEP-04-5522" },
  { id: "rc3", date: "2026-05-23", description: "Vendor pay · ABC Linens",  debit: 12400, credit: 0,     matched: true,  source: "book", ref: "VCH-1042" },
  { id: "rc4", date: "2026-05-23", description: "NEFT debit · ABC LINEN",   debit: 12400, credit: 0,     matched: true,  source: "bank", ref: "UTR8821" },
  { id: "rc5", date: "2026-05-23", description: "Folio settle · BK100242",  debit: 0,     credit: 24250, matched: false, source: "book", ref: "RCP-2026-100242" },
  { id: "rc6", date: "2026-05-24", description: "Bank charges",             debit: 1500,  credit: 0,     matched: false, source: "bank", ref: "MISC-05" },
  { id: "rc7", date: "2026-05-24", description: "Interest credit",          debit: 0,     credit: 4250,  matched: false, source: "bank", ref: "INT-Q2" },
];

// ============ NEW: VENDOR BILLS / PAYABLES ============
export type VendorBill = {
  id: string; billNo: string; vendor: string; category: string;
  billDate: string; dueDate: string;
  taxableValue: number; gst: number; tdsRate: number; tdsAmount: number;
  netPayable: number; paid: number; status: "Draft" | "Approved" | "Paid" | "Partial" | "Overdue";
};
export const VENDOR_BILLS: VendorBill[] = [
  { id: "vb1", billNo: "ABC-2426", vendor: "ABC Linens Pvt",      category: "Linen",       billDate: "2026-05-01", dueDate: "2026-05-31", taxableValue: 85000,  gst: 15300, tdsRate: 2,  tdsAmount: 1700,  netPayable: 98600,  paid: 0,      status: "Approved" },
  { id: "vb2", billNo: "CB-9921",  vendor: "CoolBreeze HVAC",      category: "AMC",         billDate: "2026-04-20", dueDate: "2026-05-20", taxableValue: 60000,  gst: 10800, tdsRate: 2,  tdsAmount: 1200,  netPayable: 69600,  paid: 0,      status: "Overdue" },
  { id: "vb3", billNo: "ELP-1212", vendor: "ElevPro Engineering",  category: "AMC",         billDate: "2026-05-05", dueDate: "2026-06-05", taxableValue: 36000,  gst: 6480,  tdsRate: 2,  tdsAmount: 720,   netPayable: 41760,  paid: 41760,  status: "Paid" },
  { id: "vb4", billNo: "JK-2440",  vendor: "Jay Kay Hardware",     category: "Supplies",    billDate: "2026-05-10", dueDate: "2026-06-09", taxableValue: 24500,  gst: 4410,  tdsRate: 0,  tdsAmount: 0,     netPayable: 28910,  paid: 15000,  status: "Partial" },
  { id: "vb5", billNo: "TC-1101",  vendor: "TechCorp IT Services", category: "IT / Software", billDate: "2026-05-12", dueDate: "2026-06-11", taxableValue: 120000, gst: 21600, tdsRate: 10, tdsAmount: 12000, netPayable: 129600, paid: 0,      status: "Approved" },
  { id: "vb6", billNo: "SF-9091",  vendor: "SafeNet Fire Systems", category: "AMC",         billDate: "2026-05-15", dueDate: "2026-06-14", taxableValue: 45000,  gst: 8100,  tdsRate: 2,  tdsAmount: 900,   netPayable: 52200,  paid: 0,      status: "Draft" },
];

// ============ NEW: RECEIVABLES (AGENT / CORPORATE) ============
export type ReceivableEntry = {
  id: string; agent: string; type: "Agent" | "Corporate";
  invoices: number;
  current: number; b30: number; b60: number; b90: number; b90plus: number;
  total: number; creditLimit: number; lastPayment: string;
};
export const RECEIVABLES: ReceivableEntry[] = [
  { id: "rec1", agent: "ABC Travels",        type: "Agent",     invoices: 4, current: 18000, b30: 12500, b60: 7000,  b90: 0,     b90plus: 0,     total: 37500,  creditLimit: 500000, lastPayment: "2026-05-15" },
  { id: "rec2", agent: "Pearl Holidays",     type: "Agent",     invoices: 2, current: 8500,  b30: 4500,  b60: 0,     b90: 0,     b90plus: 0,     total: 13000,  creditLimit: 300000, lastPayment: "2026-05-20" },
  { id: "rec3", agent: "Skyline Tours",      type: "Agent",     invoices: 3, current: 12500, b30: 0,     b60: 0,     b90: 0,     b90plus: 0,     total: 12500,  creditLimit: 400000, lastPayment: "2026-05-22" },
  { id: "rec4", agent: "TechCorp FZ-LLC",    type: "Corporate", invoices: 6, current: 45000, b30: 28000, b60: 15500, b90: 0,     b90plus: 0,     total: 88500,  creditLimit: 1000000, lastPayment: "2026-05-10" },
  { id: "rec5", agent: "Emirates Bank",      type: "Corporate", invoices: 3, current: 22000, b30: 18500, b60: 9500,  b90: 4500,  b90plus: 0,     total: 54500,  creditLimit: 800000, lastPayment: "2026-04-28" },
  { id: "rec6", agent: "Global Oil Co.",     type: "Corporate", invoices: 8, current: 65000, b30: 38000, b60: 22000, b90: 14000, b90plus: 8500,  total: 147500, creditLimit: 1500000, lastPayment: "2026-04-15" },
];

// ============ NEW: P&L DATA ============
export type PnlRow = { category: string; rooms: number; fb: number; banquet: number; spa: number; other: number };
export const PNL_REVENUE: PnlRow[] = [
  { category: "Room revenue",       rooms: 1820000, fb: 0,       banquet: 0,      spa: 0,      other: 0 },
  { category: "F&B revenue",        rooms: 0,       fb: 425000,  banquet: 0,      spa: 0,      other: 0 },
  { category: "Banquet revenue",    rooms: 0,       fb: 0,       banquet: 310000, spa: 0,      other: 0 },
  { category: "Spa / Wellness",     rooms: 0,       fb: 0,       banquet: 0,      spa: 85000,  other: 0 },
  { category: "Other operating",    rooms: 0,       fb: 0,       banquet: 0,      spa: 0,      other: 42000 },
];
export const PNL_DIRECT_COSTS: PnlRow[] = [
  { category: "F&B cost of goods",  rooms: 0,       fb: 142000,  banquet: 95000,  spa: 0,      other: 0 },
  { category: "Linen & laundry",    rooms: 38000,   fb: 8000,    banquet: 12000,  spa: 4000,   other: 0 },
  { category: "Amenities",          rooms: 24000,   fb: 0,       banquet: 0,      spa: 6000,   other: 0 },
  { category: "Commissions (OTA)",  rooms: 96000,   fb: 0,       banquet: 0,      spa: 0,      other: 0 },
];
export const PNL_INDIRECT_COSTS = [
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
export const BS_ASSETS = [
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
export const BS_LIABILITIES = [
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
export type ChartAccount = { code: string; name: string; type: "Asset" | "Liability" | "Equity" | "Revenue" | "Expense"; balance: number };
export const CHART_OF_ACCOUNTS: ChartAccount[] = [
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

export type JournalEntry = {
  id: string; date: string; voucherNo: string; narration: string;
  lines: { account: string; debit: number; credit: number }[];
  status: "Draft" | "Posted";
  postedBy: string;
};
export const JOURNAL_ENTRIES: JournalEntry[] = [
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
export type CashierShift = {
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
export const CASHIER_SHIFTS: CashierShift[] = [
  { id: "cs1", shiftNo: "#4220", cashier: "Khalid R.",  date: "2026-05-24", startTime: "07:00", endTime: "15:00", opening: 50000, cashReceived: 84500,  cardReceived: 122500, upiReceived: 175000, expensesPaid: 18500, closing: 116000, expectedClosing: 116000, variance: 0,    status: "Closed" },
  { id: "cs2", shiftNo: "#4221", cashier: "Priya M.",   date: "2026-05-24", startTime: "15:00", endTime: "23:00", opening: 116000, cashReceived: 62000, cardReceived: 98000,  upiReceived: 145000, expensesPaid: 12000, closing: 165500, expectedClosing: 166000, variance: -500, status: "Closed" },
  { id: "cs3", shiftNo: "#4222", cashier: "Aman S.",    date: "2026-05-24", startTime: "23:00", endTime: "07:00", opening: 165500, cashReceived: 18000, cardReceived: 24500,  upiReceived: 32000,  expensesPaid: 4500,  closing: 178500, expectedClosing: 179000, variance: -500, status: "Verified" },
  { id: "cs4", shiftNo: "#4223", cashier: "Khalid R.",  date: "2026-05-25", startTime: "07:00", endTime: "15:00", opening: 178500, cashReceived: 92000, cardReceived: 145000, upiReceived: 198000, expensesPaid: 22000, closing: 0,      expectedClosing: 248500, variance: 0,    status: "Open" },
];

// ---------- Account statements data ----------
export type LedgerAccount = {
  id: string;
  name: string;
  type: "cash" | "bank" | "vendor" | "customer" | "petty" | "expense" | "income";
  number?: string;
  openingBalance: number;
  closingBalance: number;
  reconciled?: boolean;
  hint?: string;
};

export const ACCOUNTS: LedgerAccount[] = [
  { id: "ac1", name: "Cash in Hand", type: "cash", openingBalance: 85000, closingBalance: 142500, reconciled: true, hint: "Reception drawer · Khalid R." },
  { id: "ac2", name: "Bank — HDFC Current A/c", type: "bank", number: "5012•••0419", openingBalance: 2840000, closingBalance: 3215800, reconciled: true, hint: "Operating account" },
  { id: "ac3", name: "Bank — ICICI Savings A/c", type: "bank", number: "0042•••8821", openingBalance: 1250000, closingBalance: 1875000, reconciled: false, hint: "Reserve · 2 entries pending" },
  { id: "ac4", name: "Petty Cash", type: "petty", openingBalance: 25000, closingBalance: 18450, reconciled: true, hint: "F&B + Housekeeping" },
  { id: "ac5", name: "Sundry Debtors (Customers)", type: "customer", openingBalance: 412000, closingBalance: 528700, hint: "Outstanding receivables" },
  { id: "ac6", name: "Sundry Creditors (Vendors)", type: "vendor", openingBalance: 184500, closingBalance: 214200, hint: "Payable to vendors" },
];

export type LedgerEntry = {
  id: string; date: string; voucher: string; particulars: string;
  type: "debit" | "credit"; amount: number; balance?: number;
};

// Sample HDFC bank statement entries
export const HDFC_STATEMENT: LedgerEntry[] = [
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
export const AGING_RECEIVABLES = [
  { bucket: "0–30 days", amount: 285400, pct: 54 },
  { bucket: "31–60 days", amount: 142800, pct: 27 },
  { bucket: "61–90 days", amount: 68200, pct: 13 },
  { bucket: "90+ days", amount: 32300, pct: 6 },
];
export const AGING_PAYABLES = [
  { bucket: "0–30 days", amount: 142000, pct: 66 },
  { bucket: "31–60 days", amount: 48200, pct: 23 },
  { bucket: "61–90 days", amount: 19000, pct: 9 },
  { bucket: "90+ days", amount: 5000, pct: 2 },
];

// GSTR Returns
export const GSTR_RETURNS = [
  { id: "g1", period: "May 2026", form: "GSTR-1", due: "11 Jun 2026", status: "Draft" as const, total: 1530000, tax: 275400 },
  { id: "g2", period: "May 2026", form: "GSTR-3B", due: "20 Jun 2026", status: "Pending" as const, total: 1530000, tax: 247000 },
  { id: "g3", period: "Apr 2026", form: "GSTR-1", due: "11 May 2026", status: "Filed" as const, total: 1240000, tax: 223200 },
  { id: "g4", period: "Apr 2026", form: "GSTR-3B", due: "20 May 2026", status: "Filed" as const, total: 1240000, tax: 198400 },
  { id: "g5", period: "FY 2025-26", form: "GSTR-9 (Annual)", due: "31 Dec 2026", status: "Upcoming" as const, total: 18540000, tax: 3337200 },
];

export const INCOME_CATS = ["Room Revenue", "F&B", "Hall Rental", "Spa & Wellness", "Laundry", "Extra Bed", "Late Checkout", "Other"];
export const EXPENSE_CATS = ["Payroll", "Utilities (DEWA)", "F&B Cost", "Maintenance", "OTA Commissions", "Linen & Amenities", "Marketing", "Insurance", "Bank Charges", "Other"];

export type EntryType = "income" | "expense" | "refund";

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

export type Entry = {
  id: string; date: string; type: EntryType; category: string;
  description: string; amount: number; mode: string; ref: string;
  department?: string;
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
export const blankLine = (): ExpenseLine => ({
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

export const SEED_ENTRIES: Entry[] = [
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
