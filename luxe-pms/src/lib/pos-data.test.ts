import { describe, it, expect } from "vitest";
import { normalizeTableCode, openOrderForTable, computePosKpis } from "@/lib/pos-data";
import { MENU_CATEGORIES } from "@/lib/menu-item";

describe("MENU_CATEGORIES", () => {
  it("has the 8 expected categories", () => {
    expect(MENU_CATEGORIES.length).toBe(8);
    expect(MENU_CATEGORIES).toContain("Indian");
  });
});

describe("normalizeTableCode", () => {
  it("upper-cases, strips separators, and drops leading zeros in the number", () => {
    expect(normalizeTableCode("T-07")).toBe("T7");
    expect(normalizeTableCode("t3")).toBe("T3");
    expect(normalizeTableCode("T10")).toBe("T10");
    expect(normalizeTableCode("Bar-5")).toBe("BAR5");
    expect(normalizeTableCode("T-12")).toBe("T12");
  });
});

describe("openOrderForTable", () => {
  const orders = [
    { tableNo: "T-07", status: "preparing", id: 1 },
    { tableNo: "T-02", status: "paid", id: 2 },
    { tableNo: "T-09", status: "ready", id: 3 },
  ];
  it("matches an open order by normalized code", () => {
    expect(openOrderForTable(orders, "T7")?.id).toBe(1);
    expect(openOrderForTable(orders, "T9")?.id).toBe(3);
  });
  it("ignores closed orders (paid/served/cancelled)", () => {
    expect(openOrderForTable(orders, "T2")).toBeNull();
  });
  it("returns null when no table matches", () => {
    expect(openOrderForTable(orders, "T99")).toBeNull();
  });
});

describe("computePosKpis", () => {
  const now = new Date("2026-06-20T13:00:00Z");
  const orders = [
    { status: "placed", total: 1000, created_at: "2026-06-20T12:58:00Z" },
    { status: "preparing", total: 1500, created_at: "2026-06-20T12:50:00Z" },
    { status: "ready", total: 800, created_at: "2026-06-20T12:46:00Z" },
    { status: "paid", total: 1300, created_at: "2026-06-19T20:00:00Z" }, // yesterday
  ];
  const tables = [
    { covers: 3, seatedAt: "12:30" },
    { covers: 4, seatedAt: "12:00" },
    { covers: 0, seatedAt: null },
  ];
  it("counts active KOTs and the queue/cooking split", () => {
    const k = computePosKpis(orders, tables, now);
    expect(k.activeKots).toBe(3);
    expect(k.inQueue).toBe(1);
    expect(k.cooking).toBe(1);
  });
  it("sums today's revenue only", () => {
    expect(computePosKpis(orders, tables, now).revenue).toBe(3300);
  });
  it("sums covers across tables", () => {
    expect(computePosKpis(orders, tables, now).covers).toBe(7);
  });
  it("averages dwell from seatedAt, null when none", () => {
    expect(computePosKpis(orders, tables, now).avgDwellMin).toBe(45); // (30 + 60) / 2
    expect(computePosKpis(orders, [{ covers: 1, seatedAt: null }], now).avgDwellMin).toBeNull();
  });
});
