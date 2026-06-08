"use client";
import * as React from "react";
import { apiGet } from "@/lib/api";

export type PropertyInfo = {
  property_name?: string;
  branch?: string;
  city?: string;
  country?: string;
  gst_state?: string;
  pin_code?: string;
  gstin?: string;
  pan?: string;
  fssai_license?: string;
  sac_code?: string;
  [key: string]: unknown;
};

// Module-level cache so the property is fetched once and shared across pages.
let cache: PropertyInfo | null = null;
let inflight: Promise<PropertyInfo> | null = null;

/** Reads the saved Property & Branch settings (Configuration). Cached app-wide. */
export function useProperty(): PropertyInfo {
  const [info, setInfo] = React.useState<PropertyInfo>(cache ?? {});
  React.useEffect(() => {
    if (cache) { setInfo(cache); return; }
    inflight ??= apiGet<PropertyInfo>("/property").then(p => { cache = p; return p; });
    let active = true;
    inflight.then(p => { if (active) setInfo(p); }).catch(() => {});
    return () => { active = false; };
  }, []);
  return info;
}

/** Hotel display name, with a safe fallback before the API responds. */
export function hotelName(info: PropertyInfo, fallback = "The Pearl Marina"): string {
  return (typeof info.property_name === "string" && info.property_name) || fallback;
}
