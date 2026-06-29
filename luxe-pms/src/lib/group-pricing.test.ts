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

  it("is backward-compatible: existing return fields unchanged when no meals/extra beds", () => {
    const t = computeGroupTotals([{ rate: 650, qty: 10 }], 2, [], 0, slabs);
    expect(t.roomSubtotal).toBe(13000);
    expect(t.extraBedSubtotal).toBe(0);
    expect(t.mealsSubtotal).toBe(0);
    expect(t.gst).toBe(1560);
    expect(t.grandTotal).toBe(14560);
  });

  it("adds plan meals taxed at the block's highest room slab", () => {
    // rooms: 9000*1*2 = 18000 @18% = 3240 ; meals: planMeals 8400 @18% (max rate 9000) = 1512
    const t = computeGroupTotals([{ rate: 9000, qty: 1 }], 2, [], 4, slabs, 8400);
    expect(t.mealsSubtotal).toBe(8400);
    expect(t.gst).toBe(4752);                 // 3240 + 1512
    expect(t.grandTotal).toBe(31152);         // 18000 + 8400 + 4752
  });

  it("adds extra beds (extraBeds*extraBedRate*nights) taxed at the row's room slab", () => {
    // rooms: 650*10*2 = 13000 @12% = 1560 ; extra beds: 2*500*2 = 2000 @12% = 240
    const t = computeGroupTotals(
      [{ rate: 650, qty: 10, extraBeds: 2, extraBedRate: 500 }], 2, [], 0, slabs,
    );
    expect(t.extraBedSubtotal).toBe(2000);
    expect(t.gst).toBe(1800);                 // 1560 + 240
    expect(t.grandTotal).toBe(16800);         // 13000 + 2000 + 1800
  });

  it("charges no meal/extra-bed GST when there are no slabs", () => {
    const t = computeGroupTotals(
      [{ rate: 650, qty: 1, extraBeds: 1, extraBedRate: 500 }], 1, [], 2, [], 1000,
    );
    expect(t.roomSubtotal).toBe(650);
    expect(t.extraBedSubtotal).toBe(500);
    expect(t.mealsSubtotal).toBe(1000);
    expect(t.gst).toBe(0);
    expect(t.grandTotal).toBe(2150);
  });
});
