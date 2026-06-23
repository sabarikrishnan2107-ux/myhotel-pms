// Pure pricing math for the New Group Booking flow. Framework-free (node-testable).

export interface GstSlab { from: number; to?: number | null; rate: number }
export interface GroupRoomRow { rate: number; qty: number }
export interface GroupSvcLine { price: number; perPax: boolean; gst: number }
export interface GroupTotals {
  roomSubtotal: number;
  servicesSubtotal: number;
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
): GroupTotals {
  let roomSubtotal = 0;
  let roomGst = 0;
  for (const r of rooms) {
    const amt = (Number(r.rate) || 0) * (Number(r.qty) || 0) * (Number(nights) || 0);
    roomSubtotal += amt;
    roomGst += (amt * gstRateForRate(Number(r.rate) || 0, slabs)) / 100;
  }

  let servicesSubtotal = 0;
  let svcGst = 0;
  for (const sv of services) {
    const amt = sv.perPax
      ? (Number(sv.price) || 0) * (Number(totalPax) || 0) * (Number(nights) || 0)
      : (Number(sv.price) || 0);
    servicesSubtotal += amt;
    svcGst += (amt * (Number(sv.gst) || 0)) / 100;
  }

  const gst = Math.round(roomGst + svcGst);
  const grandTotal = Math.round(roomSubtotal + servicesSubtotal + gst);
  return { roomSubtotal, servicesSubtotal, gst, grandTotal };
}
