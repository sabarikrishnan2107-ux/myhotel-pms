import { describe, expect, it } from "vitest";
import { buildOrderCatalog, FALLBACK_ORDER_CATALOG } from "./order-catalog";

describe("buildOrderCatalog", () => {
  it("maps menu items into the food tab", () => {
    const catalog = buildOrderCatalog(
      [{ id: 3, name: "Butter Chicken", price: 540 }],
      [],
    );
    expect(catalog.food).toEqual([{ id: "menu-3", name: "Butter Chicken", price: 540 }]);
  });

  it("groups service items into snacks/laundry/other by kind", () => {
    const catalog = buildOrderCatalog([], [
      { id: 1, kind: "snacks", name: "Chips", price: 120, active: true },
      { id: 2, kind: "laundry", name: "Shirt", price: 150, hint: null, active: true },
      { id: 3, kind: "other", name: "Spa", price: 3500, active: true },
    ]);
    expect(catalog.snacks).toEqual([{ id: "svc-1", name: "Chips", price: 120, hint: undefined }]);
    expect(catalog.laundry).toEqual([{ id: "svc-2", name: "Shirt", price: 150, hint: undefined }]);
    expect(catalog.other).toEqual([{ id: "svc-3", name: "Spa", price: 3500, hint: undefined }]);
  });

  it("carries the hint through when present", () => {
    const catalog = buildOrderCatalog([], [
      { id: 8, kind: "laundry", name: "Express", price: 250, hint: "+ 50% on items", active: true },
    ]);
    expect(catalog.laundry[0].hint).toBe("+ 50% on items");
  });

  it("drops inactive service items", () => {
    const catalog = buildOrderCatalog([], [
      { id: 1, kind: "snacks", name: "Discontinued", price: 100, active: false },
    ]);
    expect(catalog.snacks).toEqual([]);
  });

  it("keeps menu-item ids and service-item ids from colliding", () => {
    const catalog = buildOrderCatalog(
      [{ id: 5, name: "Pizza", price: 650 }],
      [{ id: 5, kind: "snacks", name: "Chips", price: 120, active: true }],
    );
    expect(catalog.food[0].id).not.toBe(catalog.snacks[0].id);
  });

  it("the fallback catalog has all 4 tabs non-empty", () => {
    expect(FALLBACK_ORDER_CATALOG.food.length).toBeGreaterThan(0);
    expect(FALLBACK_ORDER_CATALOG.snacks.length).toBeGreaterThan(0);
    expect(FALLBACK_ORDER_CATALOG.laundry.length).toBeGreaterThan(0);
    expect(FALLBACK_ORDER_CATALOG.other.length).toBeGreaterThan(0);
  });
});
