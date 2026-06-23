// Pure pricing math for the New Hall Booking flow. Framework-free (node-testable).

export interface HallPricingInput {
  hallCost: number;
  setupFee: number;
  foodCost: number;
  extrasCost: number;
  extraPax: number;
  extraPaxFee: number;
  gstPct: number;
}

export interface HallTotals {
  subtotal: number;
  tax: number;
  total: number;
}

const n = (v: number) => Number(v) || 0;

export function computeHallTotals(i: HallPricingInput): HallTotals {
  const extraPaxCost = Math.max(0, n(i.extraPax)) * n(i.extraPaxFee);
  const subtotal = n(i.hallCost) + n(i.setupFee) + n(i.foodCost) + n(i.extrasCost) + extraPaxCost;
  const tax = Math.round((subtotal * n(i.gstPct)) / 100);
  const total = subtotal + tax;
  return { subtotal, tax, total };
}
