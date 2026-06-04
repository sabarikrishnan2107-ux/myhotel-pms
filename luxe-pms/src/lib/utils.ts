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

export function formatTime(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatDate(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
}

export function formatDateLong(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString(undefined, { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
}
