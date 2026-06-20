import { describe, it, expect } from "vitest";
import { buildMenuItemPayload, isValidMenuItemForm } from "@/lib/menu-item";

const base = { name: "X", cat: "Mains", price: 10, veg: true, spice: "none" as const, tag: "", photo: "" };

describe("buildMenuItemPayload", () => {
  it("trims the name and rounds price to a non-negative integer", () => {
    const p = buildMenuItemPayload({ ...base, name: "  Paneer Tikka  ", cat: "Starters", price: 380.7 });
    expect(p).toEqual({ name: "Paneer Tikka", cat: "Starters", price: 381, veg: true });
  });
  it("includes spice only when it is not 'none'", () => {
    const p = buildMenuItemPayload({ ...base, spice: "hot" });
    expect(p.spice).toBe("hot");
  });
  it("omits spice when 'none'", () => {
    expect("spice" in buildMenuItemPayload(base)).toBe(false);
  });
  it("includes a trimmed tag only when non-empty", () => {
    expect(buildMenuItemPayload({ ...base, tag: "  Signature " }).tag).toBe("Signature");
    expect("tag" in buildMenuItemPayload({ ...base, tag: "   " })).toBe(false);
  });
  it("includes a trimmed photo only when non-empty", () => {
    expect(buildMenuItemPayload({ ...base, photo: " http://h/uploads/a.png " }).photo).toBe("http://h/uploads/a.png");
    expect("photo" in buildMenuItemPayload({ ...base, photo: "" })).toBe(false);
  });
  it("clamps negative prices to 0", () => {
    expect(buildMenuItemPayload({ ...base, price: -5 }).price).toBe(0);
  });
});

describe("isValidMenuItemForm", () => {
  it("requires a non-empty trimmed name", () => {
    expect(isValidMenuItemForm({ ...base, name: "  " })).toBe(false);
    expect(isValidMenuItemForm({ ...base, name: "Tea" })).toBe(true);
  });
});
