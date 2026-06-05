import { describe, it, expect } from "vitest";
import {
  cn, money, pct, roomGstRate, splitGst,
  isValidGstin, isValidPan, isValidAadhaar, initials,
} from "@/lib/utils";

describe("money", () => {
  it("formats with the rupee symbol and Indian grouping", () => {
    expect(money(12345678)).toBe("₹1,23,45,678");
  });
  it("rounds to whole units", () => {
    expect(money(99.6)).toBe("₹100");
  });
  it("accepts a custom currency", () => {
    expect(money(1000, "AED ")).toBe("AED 1,000");
  });
});

describe("pct", () => {
  it("formats a percentage with default 0 digits", () => {
    expect(pct(3.8)).toBe("4%");
  });
  it("respects the digits argument", () => {
    expect(pct(3.84, 1)).toBe("3.8%");
  });
});

describe("roomGstRate", () => {
  it("is 0% up to ₹1,000", () => {
    expect(roomGstRate(1000)).toBe(0);
  });
  it("is 12% between ₹1,001 and ₹7,500", () => {
    expect(roomGstRate(1001)).toBe(0.12);
    expect(roomGstRate(7500)).toBe(0.12);
  });
  it("is 18% above ₹7,500", () => {
    expect(roomGstRate(7501)).toBe(0.18);
  });
});

describe("splitGst", () => {
  it("splits evenly into CGST + SGST intra-state", () => {
    expect(splitGst(100)).toEqual({ igst: 0, cgst: 50, sgst: 50 });
  });
  it("puts the whole amount in IGST inter-state", () => {
    expect(splitGst(100, true)).toEqual({ igst: 100, cgst: 0, sgst: 0 });
  });
});

describe("Indian ID validators", () => {
  it("validates a well-formed GSTIN", () => {
    expect(isValidGstin("27AAPFU0939F1ZV")).toBe(true);
    expect(isValidGstin("not-a-gstin")).toBe(false);
  });
  it("validates a PAN (case-insensitive, trimmed)", () => {
    expect(isValidPan(" aapfu0939f ")).toBe(true);
    expect(isValidPan("ABC123")).toBe(false);
  });
  it("validates a 12-digit Aadhaar, ignoring spaces", () => {
    expect(isValidAadhaar("5621 8923 4156")).toBe(true);
    expect(isValidAadhaar("12345")).toBe(false);
  });
});

describe("initials", () => {
  it("takes up to the first two words", () => {
    expect(initials("Hassan Al-Mansoori")).toBe("HA");
  });
  it("handles a single name", () => {
    expect(initials("Owner")).toBe("O");
  });
});

describe("cn", () => {
  it("merges and de-duplicates tailwind classes", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
    expect(cn("text-sm", false && "hidden", "font-bold")).toBe("text-sm font-bold");
  });
});
