import type { BookingSource } from "@/lib/types";

export interface WalkInSyncInput {
  bookingNo: string;
  guestName: string;
  phone?: string;
  email?: string;
  nationality?: string;
  roomNumber: string;
  roomType: string;
  checkIn: string; // ISO
  checkOut: string; // ISO
  nights: number;
  adults: number;
  children: number;
  ratePlan: string; // EP / CP / MAP / AP
  total: number;
  advance: number;
}

export interface WalkInSyncBooking {
  bookingNo: string;
  guestName: string;
  roomNumber: string;
  roomType: string;
  source: BookingSource;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  children: number;
  ratePlan: string;
  total: number;
  advance: number;
  balance: number;
  paymentStatus: "unpaid" | "partial" | "paid";
  status: "pending";
  /** Typed guest fields (not booking columns) so an abandoned walk-in can be resumed. */
  draftData: { name: string; phone: string; email: string; nationality: string };
}

/**
 * Assemble the draft-booking payload posted to `/bookings` so a walk-in shows on
 * the tablet for document capture. Held as `pending` (a draft) — not a confirmed
 * arrival; the desk check-in flow proceeds separately and reuses this reference.
 */
export function buildWalkInSyncBooking(input: WalkInSyncInput): WalkInSyncBooking {
  const total = Math.round(input.total);
  const advance = Math.round(input.advance);
  const balance = Math.max(0, total - advance);
  const paymentStatus =
    advance <= 0 ? "unpaid" : advance >= total ? "paid" : "partial";
  return {
    bookingNo: input.bookingNo,
    guestName: input.guestName,
    roomNumber: input.roomNumber || "Unassigned",
    roomType: input.roomType,
    source: "Walk-in" as BookingSource,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    nights: input.nights,
    adults: input.adults,
    children: input.children,
    ratePlan: input.ratePlan,
    total,
    advance,
    balance,
    paymentStatus,
    status: "pending",
    draftData: {
      name: input.guestName,
      phone: input.phone ?? "",
      email: input.email ?? "",
      nationality: input.nationality ?? "",
    },
  };
}
