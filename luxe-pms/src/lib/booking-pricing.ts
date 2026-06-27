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
