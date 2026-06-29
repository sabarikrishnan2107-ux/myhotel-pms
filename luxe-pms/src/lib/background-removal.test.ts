import { describe, it, expect } from "vitest";
import { applyAlphaThreshold } from "@/lib/background-removal";

describe("applyAlphaThreshold", () => {
  it("fully opaque foreground pixel keeps exact original color", () => {
    const mask = new Uint8ClampedArray([0, 0, 0, 255]);
    const orig = new Uint8ClampedArray([200, 150, 50, 255]);
    const out  = new Uint8ClampedArray(4);
    applyAlphaThreshold(mask, orig, out);
    expect([...out]).toEqual([200, 150, 50, 255]);
  });

  it("alpha exactly 24 → pure white (boundary: ≤ 24 is background)", () => {
    const mask = new Uint8ClampedArray([0, 0, 0, 24]);
    const orig = new Uint8ClampedArray([100, 80, 60, 255]);
    const out  = new Uint8ClampedArray(4);
    applyAlphaThreshold(mask, orig, out);
    expect([...out]).toEqual([255, 255, 255, 255]);
  });

  it("alpha exactly 25 → foreground (boundary: > 24 is foreground)", () => {
    const mask = new Uint8ClampedArray([0, 0, 0, 25]);
    const orig = new Uint8ClampedArray([100, 80, 60, 255]);
    const out  = new Uint8ClampedArray(4);
    applyAlphaThreshold(mask, orig, out);
    // t = 25/255 ≈ 0.098 → mostly white
    expect(out[3]).toBe(255);
    // Channel should be closer to white than to original
    expect(out[0]).toBeGreaterThan(200);
  });

  it("alpha 0 → pure white", () => {
    const mask = new Uint8ClampedArray([0, 0, 0, 0]);
    const orig = new Uint8ClampedArray([50, 50, 50, 255]);
    const out  = new Uint8ClampedArray(4);
    applyAlphaThreshold(mask, orig, out);
    expect([...out]).toEqual([255, 255, 255, 255]);
  });

  it("alpha 128 blends original with white at ~50%", () => {
    const mask = new Uint8ClampedArray([0, 0, 0, 128]);
    const orig = new Uint8ClampedArray([200, 0, 0, 255]);
    const out  = new Uint8ClampedArray(4);
    applyAlphaThreshold(mask, orig, out);
    // t = 128/255 ≈ 0.502 → R ≈ 200*0.502 + 255*0.498 ≈ 227
    expect(out[0]).toBeGreaterThanOrEqual(225);
    expect(out[0]).toBeLessThanOrEqual(229);
    expect(out[3]).toBe(255);
  });

  it("processes multiple pixels", () => {
    // pixel 0: alpha=255 (fg), pixel 1: alpha=10 (bg)
    const mask = new Uint8ClampedArray([0,0,0, 255,  0,0,0, 10]);
    const orig = new Uint8ClampedArray([100,200,50,255,  80,80,80,255]);
    const out  = new Uint8ClampedArray(8);
    applyAlphaThreshold(mask, orig, out);
    // pixel 0: original
    expect(out[0]).toBe(100);
    expect(out[1]).toBe(200);
    expect(out[2]).toBe(50);
    // pixel 1: white
    expect(out[4]).toBe(255);
    expect(out[5]).toBe(255);
    expect(out[6]).toBe(255);
  });
});
