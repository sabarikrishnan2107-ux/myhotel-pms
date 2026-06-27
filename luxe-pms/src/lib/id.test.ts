import { describe, it, expect } from "vitest";
import { validateId } from "@/lib/id";

describe("validateId", () => {
  it("treats an empty number as required", () => {
    expect(validateId("Aadhaar", "")).toEqual({ ok: false, reason: "required" });
    expect(validateId("Aadhaar", "   ")).toEqual({ ok: false, reason: "required" });
  });

  it("validates Aadhaar as 12 digits, ignoring spaces", () => {
    expect(validateId("Aadhaar", "1234 5678 9012").ok).toBe(true);
    expect(validateId("Aadhaar", "123456789012").ok).toBe(true);
    expect(validateId("Aadhaar", "12345").ok).toBe(false);
    expect(validateId("Aadhaar", "12345678901A").ok).toBe(false);
  });

  it("validates PAN format", () => {
    expect(validateId("PAN", "ABCDE1234F")).toEqual({ ok: true }); // success carries no reason
    expect(validateId("PAN", "abcde1234f").ok).toBe(true); // upper-cased
    expect(validateId("PAN", "ABCDE1234").ok).toBe(false);
    // non-empty failure must be reason "format", never "required"
    expect(validateId("PAN", "ABCDE1234")).toEqual({ ok: false, reason: "format" });
  });

  it("validates Voter ID format", () => {
    expect(validateId("Voter ID", "ABC1234567").ok).toBe(true);
    expect(validateId("Voter ID", "AB1234567").ok).toBe(false);
    expect(validateId("Voter ID", "AB1234567")).toEqual({ ok: false, reason: "format" });
  });

  it("tightens Passport to letter+7digits only for India", () => {
    expect(validateId("Passport", "A1234567", "India").ok).toBe(true);
    expect(validateId("Passport", "AB123", "India").ok).toBe(false);
    // Foreign / unknown nationality → lenient (>=6 alphanumeric)
    expect(validateId("Passport", "X12345").ok).toBe(true);
    expect(validateId("Passport", "X1234", "USA").ok).toBe(false);
  });

  it("validates Driving License as 10-16 alphanumeric", () => {
    expect(validateId("Driving License", "MH1220110012345").ok).toBe(true);
    expect(validateId("Driving License", "SHORT12").ok).toBe(false);
    expect(validateId("Driving License", "SHORT12")).toEqual({ ok: false, reason: "format" });
    // boundaries: exactly 10 chars valid; 17 chars over the limit invalid
    expect(validateId("Driving License", "ABCD123456").ok).toBe(true); // 10 chars
    expect(validateId("Driving License", "ABCDE123456789012").ok).toBe(false); // 17 chars
  });

  it("falls back to >=6 alphanumeric for OCI/PIO/unknown", () => {
    expect(validateId("OCI Card", "A1B2C3").ok).toBe(true);
    expect(validateId("PIO Card", "12345").ok).toBe(false);
    expect(validateId("Something Else", "ABC123").ok).toBe(true);
  });
});
