// Pure booking pricing: plan discount (room only) + included-meal cost. Node-testable.

export interface PlanMeals {
  inclB: boolean; inclL: boolean; inclD: boolean;
  breakfastPrice: number; lunchPrice: number; dinnerPrice: number;
}

const n = (v: number) => Number(v) || 0;

/** Sum of the included meals' per-guest-per-night prices. */
export function mealPerNightPerGuest(p: PlanMeals): number {
  return (p.inclB ? n(p.breakfastPrice) : 0) + (p.inclL ? n(p.lunchPrice) : 0) + (p.inclD ? n(p.dinnerPrice) : 0);
}

export interface BookingTotalsInput {
  roomSubtotal: number; discountPct: number; plan: PlanMeals;
  adults: number; nights: number; extras: number; taxPct: number;
}
export interface BookingTotals {
  roomAfterDiscount: number; discountAmount: number; mealCost: number; tax: number; total: number;
}

export function computeBookingTotals(i: BookingTotalsInput): BookingTotals {
  const room = n(i.roomSubtotal);
  const discountAmount = Math.round((room * n(i.discountPct)) / 100);
  const roomAfterDiscount = room - discountAmount;
  const mealCost = mealPerNightPerGuest(i.plan) * n(i.adults) * n(i.nights);
  const taxBase = roomAfterDiscount + mealCost + n(i.extras);
  const tax = Math.round((taxBase * n(i.taxPct)) / 100);
  const total = taxBase + tax;
  return { roomAfterDiscount, discountAmount, mealCost, tax, total };
}

export interface ExtraOccupancyInput {
  adults: number; children: number;
  maxAdults: number; maxChildren: number;
  extraAdultRate: number; extraChildRate: number;
  nights: number;
}
export interface ExtraOccupancy {
  extraAdults: number; extraChildren: number;
  adultCharge: number; childCharge: number; total: number;
}

/**
 * Charge for guests beyond the room type's *included* occupancy. Each adult over
 * `maxAdults` and each child over `maxChildren` needs an extra bed, billed at the
 * type's extra-bed rate per night. Within the included max the charge is 0 — so a
 * 2-adult booking in a room that includes 2 adults is never surcharged.
 */
export function extraOccupancyCharge(i: ExtraOccupancyInput): ExtraOccupancy {
  const extraAdults = Math.max(0, n(i.adults) - n(i.maxAdults));
  const extraChildren = Math.max(0, n(i.children) - n(i.maxChildren));
  const adultCharge = extraAdults * n(i.extraAdultRate) * n(i.nights);
  const childCharge = extraChildren * n(i.extraChildRate) * n(i.nights);
  return { extraAdults, extraChildren, adultCharge, childCharge, total: adultCharge + childCharge };
}
