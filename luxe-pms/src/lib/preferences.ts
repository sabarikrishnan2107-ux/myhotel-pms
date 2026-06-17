"use client";
import { apiGet } from "@/lib/api";

// Per-user preferences saved by Configuration → Personal → My Preferences and
// persisted to /settings/preferences. This module applies the appearance /
// accessibility subset to the document and caches the loaded blob app-wide.
export type AppearancePrefs = {
  theme?: "light" | "dark" | "auto";
  density?: "compact" | "cozy" | "comfortable";
  textSize?: number;          // percent, 85–130
  highContrast?: boolean;
  reducedMotion?: boolean;
  // Locale formatting (applied via lib/utils date helpers, not the document).
  dateFormat?: string;
  timeFormat?: string;
  timezone?: string;
};

// Apply the appearance/accessibility settings to <html>. Theme is handled
// separately via next-themes (it owns the .dark class + persistence).
export function applyAppearance(p: AppearancePrefs) {
  if (typeof document === "undefined") return;
  const el = document.documentElement;
  if (p.density) el.dataset.density = p.density;
  if (typeof p.textSize === "number") {
    el.style.setProperty("--ui-text-scale", String(p.textSize / 100));
  }
  if (typeof p.highContrast === "boolean") el.classList.toggle("high-contrast", p.highContrast);
  if (typeof p.reducedMotion === "boolean") el.classList.toggle("reduce-motion", p.reducedMotion);
}

let prefsCache: AppearancePrefs | null = null;

// Load preferences once (cached). Returns {} if the backend is unreachable.
export async function loadPreferences(): Promise<AppearancePrefs> {
  if (prefsCache) return prefsCache;
  try {
    prefsCache = (await apiGet<AppearancePrefs>("/settings/preferences")) ?? {};
  } catch {
    prefsCache = {};
  }
  return prefsCache;
}

// Keep the module cache in sync when the settings panel changes values, so a
// later read (or remount) reflects the latest without a refetch.
export function setPrefsCache(p: AppearancePrefs) {
  prefsCache = { ...(prefsCache ?? {}), ...p };
}
