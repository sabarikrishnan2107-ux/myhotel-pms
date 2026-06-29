// Persisting a brand-new guest (from the shared NewGuestForm) into the guests
// registry. Used by every flow that can create a first-time guest — the booking
// wizard AND the express walk-in — so all of them store the profile identically.
import { apiPost, apiPut } from "@/lib/api";
import type { NewGuestData } from "@/components/guests/new-guest-form";

/** Core (non-image) guest columns posted to create a profile. Mirrors the
 *  backend's guests resource; the large base64 KYC captures are sent separately
 *  so a too-large/failed capture upload can't lose the core contact details. */
export interface GuestProfilePayload {
  name: string;
  phone: string;
  email: string;
  nationality: string;
  idType: string;
  idNumber: string;
  address: string;
  birthday: string;
  gender: string;
  company: string;
  gst: string;
  vip: boolean;
  internalNotes: string;
}

/** The four base64 KYC images attached to a guest in a follow-up request. */
export interface GuestCaptures {
  idFront: string;
  idBack: string;
  photo: string;
  signature: string;
}

/** Map the new-guest form data to the core profile payload. Note the column
 *  renames: form `dob` → `birthday`, form `remarks` → `internalNotes`. Pure. */
export function buildGuestProfilePayload(data: NewGuestData): GuestProfilePayload {
  return {
    name: data.name,
    phone: data.phone ?? "",
    email: data.email ?? "",
    nationality: data.nationality ?? "",
    idType: data.idType ?? "",
    idNumber: data.idNumber ?? "",
    address: data.address ?? "",
    birthday: data.dob ?? "",
    gender: data.gender ?? "",
    company: data.company ?? "",
    gst: data.gst ?? "",
    vip: data.vip ?? false,
    internalNotes: data.remarks ?? "",
  };
}

/** Pull the base64 KYC captures out of the form data. Pure. */
export function buildGuestCaptures(data: NewGuestData): GuestCaptures {
  return {
    idFront: data.idFront ?? "",
    idBack: data.idBack ?? "",
    photo: data.photo ?? "",
    signature: data.signature ?? "",
  };
}

/** True when at least one KYC image was captured (so the captures PUT is worth sending). */
export function hasAnyCapture(c: GuestCaptures): boolean {
  return !!(c.idFront || c.idBack || c.photo || c.signature);
}

/**
 * Persist a brand-new guest to the registry. Saves the core profile FIRST
 * (small payload, always succeeds) so name/phone/email/ID can never be lost,
 * then attaches the large base64 KYC captures in a second request — if those
 * are too big or fail, the core profile is already safely stored.
 *
 * Resilient: swallows network errors so the surrounding booking / check-in flow
 * still completes when the backend is offline. Returns the new guest id, or
 * null if the core create failed.
 */
export async function saveNewGuest(data: NewGuestData): Promise<number | null> {
  const created = await apiPost<{ id: number }>("/guests", buildGuestProfilePayload(data)).catch(() => null);
  if (!created?.id) return null;
  const captures = buildGuestCaptures(data);
  if (hasAnyCapture(captures)) {
    await apiPut(`/guests/${created.id}`, captures).catch(() => {});
  }
  return created.id;
}
