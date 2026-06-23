import { describe, it, expect } from "vitest";
import { buildNightlyBreakdown } from "@/lib/room-nightly-pricing";

// Fixed reference (UTC): 2026-01-01 = Thu, 01-02 = Fri, 01-03 = Sat, 01-05 = Mon.
const noSeasons: never[] = [];
const noHols: never[] = [];

describe("buildNightlyBreakdown", () => {
  it("plain weekday = base, kind weekday", () => {
    const b = buildNightlyBreakdown("2026-01-05", 1, 1000, noSeasons, noHols);
    expect(b.total).toBe(1000);
    expect(b.lines[0].kind).toBe("weekday");
  });
  it("weekend (Fri) = base × weekend multiplier", () => {
    const b = buildNightlyBreakdown("2026-01-02", 1, 1000, noSeasons, noHols);
    expect(b.total).toBe(1200);
    expect(b.lines[0].kind).toBe("weekend");
  });
  it("season multiplier applies on a weekday", () => {
    const seasons = [{ from: "2026-01-01", to: "2026-01-31", multiplier: 1.5 }];
    const b = buildNightlyBreakdown("2026-01-05", 1, 1000, seasons, noHols);
    expect(b.total).toBe(1500);
    expect(b.lines[0].kind).toBe("weekday");
  });
  it("holiday surcharge applies, kind holiday", () => {
    const hols = [{ date: "2026-01-05", surchargePct: 30 }];
    const b = buildNightlyBreakdown("2026-01-05", 1, 1000, noSeasons, hols);
    expect(b.total).toBe(1300);
    expect(b.lines[0].kind).toBe("holiday");
  });
  it("season and holiday STACK (season × (1+surcharge))", () => {
    const seasons = [{ from: "2026-01-01", to: "2026-01-31", multiplier: 1.5 }];
    const hols = [{ date: "2026-01-05", surchargePct: 30 }];
    const b = buildNightlyBreakdown("2026-01-05", 1, 1000, seasons, hols);
    expect(b.total).toBe(1950); // 1000 × 1.5 × 1.3
  });
  it("weekend uplift is suppressed on a holiday that falls on a weekend", () => {
    const hols = [{ date: "2026-01-02", surchargePct: 30 }]; // Friday
    const b = buildNightlyBreakdown("2026-01-02", 1, 1000, noSeasons, hols);
    expect(b.total).toBe(1300); // not 1000 × 1.2 × 1.3
    expect(b.lines[0].kind).toBe("holiday");
  });
  it("multi-night counts and totals (Thu + Fri)", () => {
    const b = buildNightlyBreakdown("2026-01-01", 2, 1000, noSeasons, noHols);
    expect(b.total).toBe(2200); // 1000 (Thu) + 1200 (Fri)
    expect(b.counts).toEqual({ weekday: 1, weekend: 1, holiday: 0 });
    expect(b.avgRate).toBe(1100);
  });
});
