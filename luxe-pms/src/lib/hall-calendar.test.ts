import { describe, it, expect } from "vitest";
import { computeHallBlock, isHallBlockInWindow, assignHallLanes, hallUtilizationPct } from "@/lib/hall-calendar";

describe("computeHallBlock", () => {
  const windowStart = new Date("2026-07-01T00:00:00");

  it("positions a same-day booking as a 1-day-wide block at its offset", () => {
    expect(computeHallBlock({ date: "2026-07-03" }, windowStart)).toEqual({ startCol: 2, span: 1 });
  });

  it("spans multiple days inclusive of both date and endDate", () => {
    expect(computeHallBlock({ date: "2026-07-03", endDate: "2026-07-05" }, windowStart)).toEqual({ startCol: 2, span: 3 });
  });

  it("treats an endDate equal to date the same as no endDate", () => {
    expect(computeHallBlock({ date: "2026-07-03", endDate: "2026-07-03" }, windowStart)).toEqual({ startCol: 2, span: 1 });
  });

  it("ignores an endDate before date (defensive against bad data)", () => {
    expect(computeHallBlock({ date: "2026-07-03", endDate: "2026-07-01" }, windowStart)).toEqual({ startCol: 2, span: 1 });
  });

  it("allows a negative startCol for a booking that starts before the window", () => {
    expect(computeHallBlock({ date: "2026-06-28" }, windowStart).startCol).toBe(-3);
  });
});

describe("isHallBlockInWindow", () => {
  it("is true when the block overlaps the window", () => {
    expect(isHallBlockInWindow({ startCol: 2, span: 1 }, 7)).toBe(true);
  });
  it("is true for a block that starts before the window but still overlaps it", () => {
    expect(isHallBlockInWindow({ startCol: -2, span: 5 }, 7)).toBe(true);
  });
  it("is false for a block entirely before the window", () => {
    expect(isHallBlockInWindow({ startCol: -5, span: 2 }, 7)).toBe(false);
  });
  it("is false for a block entirely after the window", () => {
    expect(isHallBlockInWindow({ startCol: 10, span: 2 }, 7)).toBe(false);
  });
});

describe("assignHallLanes", () => {
  it("puts non-overlapping back-to-back bookings in the same lane", () => {
    const { laneOf, laneCount } = assignHallLanes([
      { id: "a", startCol: 0, span: 1 },
      { id: "b", startCol: 1, span: 1 },
    ]);
    expect(laneOf.get("a")).toBe(0);
    expect(laneOf.get("b")).toBe(0);
    expect(laneCount).toBe(1);
  });

  it("stacks overlapping bookings into separate lanes", () => {
    const { laneOf, laneCount } = assignHallLanes([
      { id: "a", startCol: 0, span: 3 },
      { id: "b", startCol: 1, span: 2 },
    ]);
    expect(laneOf.get("a")).toBe(0);
    expect(laneOf.get("b")).toBe(1);
    expect(laneCount).toBe(2);
  });

  it("reuses a freed lane once its booking ends", () => {
    // a: day 0 only. b: days 0-1 (overlaps a). c: day 1 only (overlaps b, but
    // not a, since a already ended by day 1) — c should reuse a's lane.
    const { laneOf, laneCount } = assignHallLanes([
      { id: "a", startCol: 0, span: 1 },
      { id: "b", startCol: 0, span: 2 },
      { id: "c", startCol: 1, span: 1 },
    ]);
    expect(laneOf.get("a")).toBe(0);
    expect(laneOf.get("b")).toBe(1);
    expect(laneOf.get("c")).toBe(0);
    expect(laneCount).toBe(2);
  });
});

describe("hallUtilizationPct", () => {
  it("computes booked hall-days over hall-day capacity", () => {
    expect(hallUtilizationPct(6, 3, 7)).toBe(29); // 6 / 21 = 28.57% -> rounds to 29
  });
  it("returns 0 when there is no capacity in view", () => {
    expect(hallUtilizationPct(0, 0, 7)).toBe(0);
  });
});
