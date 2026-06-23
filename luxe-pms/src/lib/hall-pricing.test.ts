import { describe, it, expect } from "vitest";
import { computeHallTotals } from "@/lib/hall-pricing";

describe("computeHallTotals", () => {
  it("includes the setup fee and applies the hall's GST rate", () => {
    const t = computeHallTotals({ hallCost: 38000, setupFee: 5000, foodCost: 90000, extrasCost: 0, extraPax: 0, extraPaxFee: 0, gstPct: 18 });
    expect(t.subtotal).toBe(133000);          // 38000 + 5000 + 90000
    expect(t.tax).toBe(23940);                 // 18%
    expect(t.total).toBe(156940);
  });
  it("adds the per-hall over-capacity surcharge", () => {
    const t = computeHallTotals({ hallCost: 10000, setupFee: 0, foodCost: 0, extrasCost: 0, extraPax: 20, extraPaxFee: 250, gstPct: 0 });
    expect(t.subtotal).toBe(15000);            // 10000 + 20*250
    expect(t.tax).toBe(0);
    expect(t.total).toBe(15000);
  });
  it("treats missing/zero fields as 0 (no NaN)", () => {
    const t = computeHallTotals({ hallCost: 5000, setupFee: 0, foodCost: 0, extrasCost: 0, extraPax: 0, extraPaxFee: 0, gstPct: 0 });
    expect(t).toEqual({ subtotal: 5000, tax: 0, total: 5000 });
  });
});
