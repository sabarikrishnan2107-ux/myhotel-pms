import { describe, it, expect } from "vitest";
import { gstRateForRate, computeGroupTotals } from "@/lib/group-pricing";

const slabs = [
  { from: 0, to: 1000, rate: 12 },
  { from: 1001, to: 7500, rate: 12 },
  { from: 7501, to: null, rate: 18 },
];

describe("gstRateForRate", () => {
  it("picks the slab whose band contains the rate", () => {
    expect(gstRateForRate(650, slabs)).toBe(12);
    expect(gstRateForRate(9000, slabs)).toBe(18);
  });
  it("falls back to the highest slab when above all bands with a closed top", () => {
    expect(gstRateForRate(50, [{ from: 100, to: 200, rate: 5 }])).toBe(5);
  });
  it("returns 0 when there are no slabs", () => {
    expect(gstRateForRate(500, [])).toBe(0);
  });
});

describe("computeGroupTotals", () => {
  it("sums room subtotal (rate*qty*nights) and per-room GST by slab", () => {
    const t = computeGroupTotals([{ rate: 650, qty: 10 }], 2, [], 0, slabs);
    expect(t.roomSubtotal).toBe(13000);          // 650*10*2
    expect(t.servicesSubtotal).toBe(0);
    expect(t.gst).toBe(1560);                      // 13000 * 12%
    expect(t.grandTotal).toBe(14560);
  });
  it("handles per-pax services (price*pax*nights) and flat services (price), each with own GST", () => {
    const t = computeGroupTotals(
      [],
      2,
      [{ price: 75, perPax: true, gst: 18 }, { price: 4500, perPax: false, gst: 18 }],
      20,
      slabs,
    );
    // perPax: 75*20*2 = 3000 ; flat: 4500 ; subtotal 7500
    expect(t.servicesSubtotal).toBe(7500);
    expect(t.gst).toBe(1350);                      // 7500 * 18%
    expect(t.grandTotal).toBe(8850);
  });
});
