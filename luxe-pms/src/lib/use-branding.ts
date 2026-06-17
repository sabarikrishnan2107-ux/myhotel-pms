"use client";
import * as React from "react";
import { apiGet, setEmailSignature } from "@/lib/api";

// Brand assets saved by Configuration → Property → Branding & Assets, persisted
// to /settings/branding. Consumed by invoices, emails and printed receipts, and
// applied to the document (favicon, brand colors, fonts) on app load.
export type Branding = {
  logoUrl?: string;
  faviconUrl?: string;
  brandColor?: string;
  accentColor?: string;
  letterhead?: string;     // multi-line: name / address / GSTIN·PAN — top of invoices
  emailSig?: string;       // appended to outbound transactional emails
  invoiceFooter?: string;  // jurisdiction / T&C printed at the foot of every invoice
  fontPair?: string;       // e.g. "PT Serif + Inter" → display + body font
};

// Sensible fallbacks so invoices/emails read well before the API responds or
// when branding hasn't been configured yet.
const DEFAULTS: Required<Pick<Branding, "letterhead" | "emailSig" | "invoiceFooter">> = {
  letterhead: "",
  emailSig: "",
  invoiceFooter: "Subject to Mumbai jurisdiction. Goods/Services once sold will not be taken back. This is a computer generated invoice.",
};

// ---- hex → "H S% L%" (the token format used as hsl(var(--brand))) ----
function hexToHslTokens(hex: string): string | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const int = parseInt(m[1], 16);
  const r = ((int >> 16) & 255) / 255, g = ((int >> 8) & 255) / 255, b = (int & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

// ---- font pairing → font-family stacks, loading the named family from Google
// Fonts so the choice actually renders (bundled Inter/Fraunces reuse their vars).
function loadGoogleFont(family: string) {
  if (typeof document === "undefined") return;
  const id = "gf-" + family.replace(/\s+/g, "-").toLowerCase();
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@400;500;600;700&display=swap`;
  document.head.appendChild(link);
}
function fontStack(name: string): string {
  const raw = name.trim();
  const n = raw.toLowerCase();
  if (n.includes("inter")) return "var(--font-inter), system-ui, sans-serif";
  if (n.includes("fraunces")) return "var(--font-fraunces), Georgia, serif";
  const isSerif = /serif|playfair|lora|merriweather|georgia|garamond/.test(n);
  loadGoogleFont(raw);
  return `"${raw}", ${isSerif ? "Georgia, serif" : "system-ui, sans-serif"}`;
}

// Apply branding to the live document: favicon, brand/accent colors, fonts, and
// the email signature funnel. Safe to call repeatedly (idempotent).
export function applyBranding(b: Branding) {
  if (typeof document === "undefined") return;
  const el = document.documentElement;

  if (b.brandColor) {
    const t = hexToHslTokens(b.brandColor);
    if (t) el.style.setProperty("--brand", t);
  }
  if (b.accentColor) {
    const t = hexToHslTokens(b.accentColor);
    if (t) el.style.setProperty("--accent", t);
  }

  if (b.fontPair && b.fontPair.includes("+")) {
    // Override the app's display + body font vars (used by body and the
    // .font-display utility), so the chosen pairing applies everywhere.
    const [display, body] = b.fontPair.split("+").map(s => s.trim());
    if (display) el.style.setProperty("--font-display", fontStack(display));
    if (body) el.style.setProperty("--font-sans", fontStack(body));
  }

  if (b.faviconUrl) {
    let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    if (!link) { link = document.createElement("link"); link.rel = "icon"; document.head.appendChild(link); }
    link.href = b.faviconUrl;
  }

  setEmailSignature(b.emailSig ?? "");
}

let cache: Branding | null = null;
let inflight: Promise<Branding> | null = null;

// Non-hook cached loader for the bootstrap (loads once, applies to the document).
export async function loadBranding(): Promise<Branding> {
  if (cache) return cache;
  inflight ??= apiGet<Branding>("/settings/branding").then(b => { cache = b ?? {}; return cache; }).catch(() => ({} as Branding));
  return inflight;
}

/** Reads the saved Branding & Assets settings. Cached app-wide. */
export function useBranding(): Branding & typeof DEFAULTS {
  const [info, setInfo] = React.useState<Branding>(cache ?? {});
  React.useEffect(() => {
    if (cache) { setInfo(cache); return; }
    let active = true;
    loadBranding().then(b => { if (active) setInfo(b); });
    return () => { active = false; };
  }, []);
  return {
    ...info,
    letterhead: info.letterhead || DEFAULTS.letterhead,
    emailSig: info.emailSig || DEFAULTS.emailSig,
    invoiceFooter: info.invoiceFooter || DEFAULTS.invoiceFooter,
  };
}
