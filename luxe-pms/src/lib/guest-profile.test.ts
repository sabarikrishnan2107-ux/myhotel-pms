import { describe, it, expect } from "vitest";
import { buildGuestProfilePayload, buildGuestCaptures, hasAnyCapture } from "@/lib/guest-profile";
import type { NewGuestData } from "@/components/guests/new-guest-form";

const full: NewGuestData = {
  name: "Asha Menon",
  phone: "+91 98765 43210",
  email: "asha@example.com",
  address: "12 MG Road, Kochi",
  nationality: "India",
  dob: "1990-04-15",
  gender: "Female",
  idType: "Aadhaar",
  idNumber: "1234 5678 9012",
  idFront: "data:image/png;base64,AAA",
  idBack: "data:image/png;base64,BBB",
  photo: "data:image/png;base64,CCC",
  signature: "data:image/png;base64,DDD",
  company: "Acme Pvt Ltd",
  gst: "27AAACR5055K1Z5",
  vip: true,
  remarks: "Vegetarian breakfast",
};

describe("buildGuestProfilePayload", () => {
  it("maps the form's dob → birthday and remarks → internalNotes", () => {
    const p = buildGuestProfilePayload(full);
    expect(p.birthday).toBe("1990-04-15");
    expect(p.internalNotes).toBe("Vegetarian breakfast");
  });

  it("carries every core profile field through", () => {
    const p = buildGuestProfilePayload(full);
    expect(p).toMatchObject({
      name: "Asha Menon",
      phone: "+91 98765 43210",
      email: "asha@example.com",
      nationality: "India",
      idType: "Aadhaar",
      idNumber: "1234 5678 9012",
      address: "12 MG Road, Kochi",
      gender: "Female",
      company: "Acme Pvt Ltd",
      gst: "27AAACR5055K1Z5",
      vip: true,
    });
  });

  it("does not leak the base64 KYC images into the core payload", () => {
    const p = buildGuestProfilePayload(full) as unknown as Record<string, unknown>;
    expect(p.idFront).toBeUndefined();
    expect(p.photo).toBeUndefined();
    expect(p.signature).toBeUndefined();
  });
});

describe("buildGuestCaptures / hasAnyCapture", () => {
  it("collects the four KYC images", () => {
    expect(buildGuestCaptures(full)).toEqual({
      idFront: "data:image/png;base64,AAA",
      idBack: "data:image/png;base64,BBB",
      photo: "data:image/png;base64,CCC",
      signature: "data:image/png;base64,DDD",
    });
  });

  it("reports captures present / absent", () => {
    expect(hasAnyCapture(buildGuestCaptures(full))).toBe(true);
    const bare: NewGuestData = { ...full, idFront: null, idBack: null, photo: null, signature: null };
    expect(hasAnyCapture(buildGuestCaptures(bare))).toBe(false);
  });
});
