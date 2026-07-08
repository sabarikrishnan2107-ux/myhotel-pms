import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function money(n: number, currency = "₹") {
  // Indian numbering system (1,23,45,678) with rupee symbol
  return `${currency}${Math.round(n).toLocaleString("en-IN")}`;
}

export function pct(n: number, digits = 0) {
  return `${n.toFixed(digits)}%`;
}

// ---------- Indian GST helpers ----------
/** GST slab for room tariff per Indian Government rules.
 *  Up to ₹1,000/night → 0% · ₹1,001–₹7,500 → 12% · ₹7,501+ → 18% */
export function roomGstRate(tariffPerNight: number): number {
  if (tariffPerNight <= 1000) return 0;
  if (tariffPerNight <= 7500) return 0.12;
  return 0.18;
}

/** Split GST into CGST + SGST (intra-state) or IGST (inter-state) */
export function splitGst(gstAmount: number, interState = false) {
  if (interState) return { igst: gstAmount, cgst: 0, sgst: 0 };
  return { igst: 0, cgst: gstAmount / 2, sgst: gstAmount / 2 };
}

/** Validate Indian GSTIN format (15 chars: 2-digit state + 10-digit PAN + 1 entity + Z + 1 checksum) */
export function isValidGstin(g: string): boolean {
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(g.trim().toUpperCase());
}

/** Validate Indian PAN (10 chars: 5 letters + 4 digits + 1 letter) */
export function isValidPan(p: string): boolean {
  return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(p.trim().toUpperCase());
}

/** Validate Indian Aadhaar (12-digit number, basic check only) */
export function isValidAadhaar(a: string): boolean {
  const digits = a.replace(/\s+/g, "");
  return /^[0-9]{12}$/.test(digits);
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");
}

// ---- Per-user date/time preferences (My Preferences) ----
// Cached in localStorage so the format helpers below resolve synchronously on
// the first render (no async wait), and updated live by the settings panel.
type DTPrefs = { dateFormat?: string; timeFormat?: string; timezone?: string };
const DT_KEY = "pms_dt_prefs";
let dtCache: DTPrefs | null = null;
function dtPrefs(): DTPrefs {
  if (dtCache) return dtCache;
  if (typeof window === "undefined") return {};
  try { dtCache = JSON.parse(window.localStorage.getItem(DT_KEY) || "{}"); }
  catch { dtCache = {}; }
  return dtCache ?? {};
}
export function setDateTimePrefs(p: DTPrefs) {
  dtCache = { ...(dtCache ?? {}), ...p };
  if (typeof window !== "undefined") {
    try { window.localStorage.setItem(DT_KEY, JSON.stringify(dtCache)); } catch { /* ignore */ }
  }
}
// "Asia/Kolkata (IST)" → "Asia/Kolkata"; undefined when no timezone chosen.
function ianaTz(): string | undefined {
  const tz = dtPrefs().timezone;
  if (!tz) return undefined;
  const name = tz.replace(/\s*\(.*\)\s*$/, "").trim();
  return name || undefined;
}

export function formatTime(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  const tf = dtPrefs().timeFormat;
  const tz = ianaTz();
  // Honour the chosen 12/24-hour mode; fall back to locale default when unset.
  const hour12 = tf ? tf.startsWith("12") : undefined;
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", ...(hour12 !== undefined ? { hour12 } : {}), ...(tz ? { timeZone: tz } : {}) });
}

export function formatDate(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  // Guard missing/unparseable dates so callers render an em-dash instead of
  // "undefined/undefined/Invalid Date" (bad or empty arrival/departure values).
  if (!date || isNaN(date.getTime())) return "—";
  const fmt = dtPrefs().dateFormat;
  const tz = ianaTz();
  if (!fmt) {
    // Default: compact day + short month (existing behaviour).
    return date.toLocaleDateString(undefined, { day: "2-digit", month: "short", ...(tz ? { timeZone: tz } : {}) });
  }
  return formatByPref(date, fmt, tz);
}

export function formatDateLong(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  if (!date || isNaN(date.getTime())) return "—";
  const fmt = dtPrefs().dateFormat;
  const tz = ianaTz();
  if (!fmt) {
    return date.toLocaleDateString(undefined, { weekday: "short", day: "2-digit", month: "short", year: "numeric", ...(tz ? { timeZone: tz } : {}) });
  }
  // Prefix the weekday, then the chosen date format.
  const weekday = date.toLocaleDateString(undefined, { weekday: "short", ...(tz ? { timeZone: tz } : {}) });
  return `${weekday}, ${formatByPref(date, fmt, tz)}`;
}

// Render a date in the user's chosen format (DD/MM/YYYY, MM/DD/YYYY,
// YYYY-MM-DD, or DD MMM YYYY), respecting the selected timezone.
function formatByPref(date: Date, fmt: string, tz: string | undefined): string {
  const tzOpt = tz ? { timeZone: tz } : {};
  if (fmt.includes("MMM")) {
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", ...tzOpt });
  }
  // en-CA yields YYYY-MM-DD parts we can reorder.
  const [y, m, d] = date.toLocaleDateString("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", ...tzOpt }).split("-");
  if (fmt === "MM/DD/YYYY") return `${m}/${d}/${y}`;
  if (fmt === "YYYY-MM-DD") return `${y}-${m}-${d}`;
  return `${d}/${m}/${y}`; // DD/MM/YYYY (default mapping)
}

// Indian-style number-to-words (Lakh / Crore) — used on printed receipts so the
// amount is written out in words, e.g. "One Lakh Twenty Thousand".
export function numberToWordsIN(n: number): string {
  n = Math.round(n);
  if (n === 0) return "Zero";
  if (n < 0) return "Minus " + numberToWordsIN(-n);
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const two = (num: number): string => num < 20 ? ones[num] : tens[Math.floor(num / 10)] + (num % 10 ? " " + ones[num % 10] : "");
  const three = (num: number): string => num >= 100 ? ones[Math.floor(num / 100)] + " Hundred" + (num % 100 ? " " + two(num % 100) : "") : two(num);
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
