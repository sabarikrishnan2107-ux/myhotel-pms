// Pure pricing math for the New Group Booking flow. Framework-free (node-testable).

export interface GstSlab { from: number; to?: number | null; rate: number }
export interface GroupRoomRow { rate: number; qty: number; extraBeds?: number; extraBedRate?: number }
export interface GroupSvcLine { price: number; perPax: boolean; gst: number }
export interface GroupTotals {
  roomSubtotal: number;
  extraBedSubtotal: number;
  servicesSubtotal: number;
  mealsSubtotal: number;
  gst: number;
  grandTotal: number;
}

/** GST % for a per-night room rate: the slab whose [from,to] band contains it,
 *  else the highest slab, else 0. */
export function gstRateForRate(rate: number, slabs: GstSlab[]): number {
  if (!slabs.length) return 0;
  const hit = slabs.find(s => rate >= s.from && (s.to == null || rate <= s.to));
  if (hit) return hit.rate;
  return slabs.reduce((m, s) => (s.rate > m ? s.rate : m), 0);
}

export function computeGroupTotals(
  rooms: GroupRoomRow[],
  nights: number,
  services: GroupSvcLine[],
  totalPax: number,
  slabs: GstSlab[],
  planMeals = 0,
): GroupTotals {
  const N = Number(nights) || 0;
  let roomSubtotal = 0, roomGst = 0, extraBedSubtotal = 0, extraBedGst = 0, maxRate = 0;
  for (const r of rooms) {
    const rate = Number(r.rate) || 0;
    const qty = Number(r.qty) || 0;
    const slab = gstRateForRate(rate, slabs);
    const amt = rate * qty * N;
    roomSubtotal += amt;
    roomGst += (amt * slab) / 100;
    if (rate > maxRate) maxRate = rate;

    const ebAmt = (Number(r.extraBeds) || 0) * (Number(r.extraBedRate) || 0) * N;
    extraBedSubtotal += ebAmt;
    extraBedGst += (ebAmt * slab) / 100;   // extra bed billed at its room type's slab
  }

  let servicesSubtotal = 0, svcGst = 0;
  for (const sv of services) {
    const amt = sv.perPax
      ? (Number(sv.price) || 0) * (Number(totalPax) || 0) * N
      : (Number(sv.price) || 0);
    servicesSubtotal += amt;
    svcGst += (amt * (Number(sv.gst) || 0)) / 100;
  }

  const mealsSubtotal = Number(planMeals) || 0;
  const mealGst = (mealsSubtotal * gstRateForRate(maxRate, slabs)) / 100;

  const gst = Math.round(roomGst + extraBedGst + svcGst + mealGst);
  const grandTotal = Math.round(roomSubtotal + extraBedSubtotal + servicesSubtotal + mealsSubtotal + gst);
  return { roomSubtotal, extraBedSubtotal, servicesSubtotal, mealsSubtotal, gst, grandTotal };
}
