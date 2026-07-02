import { describe, it, expect } from "vitest";
import { groupChargesByDay } from "@/lib/folio-charges";
import type { FolioCharge } from "@/lib/types";

function charge(overrides: Partial<FolioCharge>): FolioCharge {
  return {
    id: "c1", date: "2026-05-23", description: "Test charge", type: "Extra",
    qty: 1, rate: 100, tax: 0, amount: 100, paidBy: "Guest",
    ...overrides,
  };
}

describe("groupChargesByDay", () => {
  it("buckets charges by their date field", () => {
    const result = groupChargesByDay([
      charge({ id: "a", date: "2026-05-24" }),
      charge({ id: "b", date: "2026-05-23" }),
      charge({ id: "c", date: "2026-05-24" }),
    ]);
    expect(result.map(g => g.date)).toEqual(["2026-05-23", "2026-05-24"]);
    expect(result.find(g => g.date === "2026-05-24")?.items.map(c => c.id)).toEqual(["a", "c"]);
  });

  it("sorts each day's charges by created_at ascending", () => {
    const result = groupChargesByDay([
      charge({ id: "late", created_at: "2026-05-23T20:00:00Z" }),
      charge({ id: "early", created_at: "2026-05-23T08:00:00Z" }),
      charge({ id: "mid", created_at: "2026-05-23T12:00:00Z" }),
    ]);
    expect(result[0].items.map(c => c.id)).toEqual(["early", "mid", "late"]);
  });

  it("sorts charges without created_at after charges that have it, preserving relative order", () => {
    const result = groupChargesByDay([
      charge({ id: "no-time-1" }),
      charge({ id: "has-time", created_at: "2026-05-23T08:00:00Z" }),
      charge({ id: "no-time-2" }),
    ]);
    expect(result[0].items.map(c => c.id)).toEqual(["has-time", "no-time-1", "no-time-2"]);
  });

  it("returns an empty array for no charges", () => {
    expect(groupChargesByDay([])).toEqual([]);
  });
});
