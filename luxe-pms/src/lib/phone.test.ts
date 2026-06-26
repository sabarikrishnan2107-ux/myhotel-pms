import { describe, it, expect } from "vitest";
import { COUNTRIES, isValidPhone, formatPhone, parsePhone, composePhone, flagFor } from "@/lib/phone";

describe("COUNTRIES", () => {
  it("includes India with +91, a name and a flag", () => {
    const india = COUNTRIES.find(c => c.code === "IN");
    expect(india?.dialCode).toBe("+91");
    expect(india?.name).toMatch(/India/);
    expect(india?.flag).toBe("🇮🇳");
  });

  it("covers the world and is sorted by name", () => {
    expect(COUNTRIES.length).toBeGreaterThan(200);
    const names = COUNTRIES.map(c => c.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });
});

describe("flagFor", () => {
  it("maps ISO codes to flag emoji", () => {
    expect(flagFor("US")).toBe("🇺🇸");
    expect(flagFor("ae")).toBe("🇦🇪");
  });
});

describe("isValidPhone", () => {
  it("accepts correctly-sized IN / US / GB / AE numbers", () => {
    expect(isValidPhone("+91 98765 43210")).toBe(true);
    expect(isValidPhone("+1 213 373 4253")).toBe(true);
    expect(isValidPhone("+44 20 7946 0958")).toBe(true);
    expect(isValidPhone("+971 50 123 4567")).toBe(true);
  });

  it("rejects wrong-length and empty numbers", () => {
    expect(isValidPhone("+91 98765")).toBe(false); // too short for India
    expect(isValidPhone("+91 9")).toBe(false);
    expect(isValidPhone("")).toBe(false);
    expect(isValidPhone("   ")).toBe(false);
  });
});

describe("formatPhone / parsePhone / composePhone", () => {
  it("formats E.164 to international", () => {
    expect(formatPhone("+919876543210")).toBe("+91 98765 43210");
  });

  it("parses country + national and round-trips", () => {
    const p = parsePhone("+919876543210");
    expect(p.country).toBe("IN");
    expect(p.nationalNumber).toBe("9876543210");
    expect(composePhone("IN", p.nationalNumber)).toBe("+91 98765 43210");
  });

  it("leaves an unparseable value unchanged and keeps its digits", () => {
    expect(formatPhone("hello")).toBe("hello");
    expect(parsePhone("not a phone").nationalNumber).toBe("");
    expect(composePhone("IN", "")).toBe("");
  });
});
