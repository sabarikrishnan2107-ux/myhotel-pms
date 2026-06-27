import { describe, it, expect } from "vitest";
import { mealPerNightPerGuest, computeBookingTotals, extraOccupancyCharge } from "@/lib/booking-pricing";

const AP = { inclB: true, inclL: true, inclD: true, breakfastPrice: 200, lunchPrice: 350, dinnerPrice: 450 };
const EP = { inclB: false, inclL: false, inclD: false, breakfastPrice: 200, lunchPrice: 350, dinnerPrice: 450 };
const CP = { inclB: true, inclL: false, inclD: false, breakfastPrice: 200, lunchPrice: 350, dinnerPrice: 450 };

describe("mealPerNightPerGuest", () => {
  it("sums only the included meals' prices", () => {
    expect(mealPerNightPerGuest(AP)).toBe(1000);
    expect(mealPerNightPerGuest(CP)).toBe(200);
    expect(mealPerNightPerGuest(EP)).toBe(0); // unchecked meals contribute nothing
  });
});

describe("computeBookingTotals", () => {
  it("applies discount to room only and adds meals × adults × nights", () => {
    const t = computeBookingTotals({ roomSubtotal: 10000, discountPct: 10, plan: CP, adults: 2, nights: 3, extras: 0, taxPct: 5 });
    expect(t.discountAmount).toBe(1000);          // 10% of room
    expect(t.roomAfterDiscount).toBe(9000);
    expect(t.mealCost).toBe(1200);                 // 200 × 2 × 3
    expect(t.tax).toBe(510);                        // 5% of (9000 + 1200)
    expect(t.total).toBe(10710);
  });
  it("zero discount + no meals = room + extras + tax", () => {
    const t = computeBookingTotals({ roomSubtotal: 5000, discountPct: 0, plan: EP, adults: 2, nights: 2, extras: 500, taxPct: 5 });
    expect(t.discountAmount).toBe(0);
    expect(t.mealCost).toBe(0);
    expect(t.tax).toBe(275);                        // 5% of 5500
    expect(t.total).toBe(5775);
  });
});

describe("extraOccupancyCharge", () => {
  const rates = { extraAdultRate: 1500, extraChildRate: 1500, nights: 3 };

  it("is zero when pax is within the included max", () => {
    const r = extraOccupancyCharge({ adults: 2, children: 1, maxAdults: 2, maxChildren: 1, ...rates });
    expect(r.extraAdults).toBe(0);
    expect(r.extraChildren).toBe(0);
    expect(r.total).toBe(0);
  });

  it("charges each extra adult at the rate × nights", () => {
    const r = extraOccupancyCharge({ adults: 3, children: 0, maxAdults: 2, maxChildren: 1, ...rates });
    expect(r.extraAdults).toBe(1);
    expect(r.adultCharge).toBe(4500);               // 1 × 1500 × 3
    expect(r.total).toBe(4500);
  });

  it("charges extra adults and extra children together", () => {
    const r = extraOccupancyCharge({ adults: 4, children: 2, maxAdults: 2, maxChildren: 1, ...rates });
    expect(r.extraAdults).toBe(2);
    expect(r.extraChildren).toBe(1);
    expect(r.total).toBe(2 * 1500 * 3 + 1 * 1500 * 3); // 13,500
  });

  it("never goes negative when pax is below the max", () => {
    const r = extraOccupancyCharge({ adults: 1, children: 0, maxAdults: 2, maxChildren: 1, ...rates });
    expect(r.total).toBe(0);
  });
});
