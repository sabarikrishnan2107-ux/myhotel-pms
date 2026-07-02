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

// Whole-hour duration between two "HH:MM" slot times, wrapping past midnight
// when end <= start (e.g. 20:00→02:00 = 6h, 08:00→08:00 = 24h — a full day
// ending the same clock time the next day).
export function hoursBetween(start: string, end: string): number {
  const startH = parseInt(start, 10);
  const endH = parseInt(end, 10);
  const diff = endH - startH;
  return diff <= 0 ? diff + 24 : diff;
}

export function crossesMidnight(start: string, end: string): boolean {
  return parseInt(end, 10) <= parseInt(start, 10);
}

// How many day-rate charges an event spans. A same-day event, or a single
// overnight event ending the calendar day after it starts, is 1 charge — the
// hour-based slot rate already covers the overnight case. Any additional
// calendar day beyond that (e.g. a 3-day conference) adds one more charge.
export function dayMultiplier(startDate: string, endDate: string, crosses: boolean): number {
  const diffDays = Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86_400_000);
  const baseline = crosses ? 1 : 0;
  return 1 + Math.max(0, diffDays - baseline);
}

export function computeHallTotals(i: HallPricingInput): HallTotals {
  const extraPaxCost = Math.max(0, n(i.extraPax)) * n(i.extraPaxFee);
  const subtotal = n(i.hallCost) + n(i.setupFee) + n(i.foodCost) + n(i.extrasCost) + extraPaxCost;
  const tax = Math.round((subtotal * n(i.gstPct)) / 100);
  const total = subtotal + tax;
  return { subtotal, tax, total };
}
