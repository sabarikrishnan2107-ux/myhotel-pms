import { describe, it, expect } from "vitest";
import { computeCropRegion } from "@/lib/face-crop";

describe("computeCropRegion", () => {
  it("face occupies 60% of crop height (uses max of width/height)", () => {
    // max(100, 80) = 100 → cropSize = 100 / 0.6 ≈ 166.67
    const r = computeCropRegion({ x: 50, y: 50, width: 100, height: 80 }, 500, 500);
    expect(r.cropSize).toBeCloseTo(166.67, 1);
  });

  it("face center lands at 58% from top of crop", () => {
    // box: x=150, y=150, w=100, h=100
    // faceCenter = (200, 200), cropSize = 100/0.6 ≈ 166.67
    // sy = 200 - 0.58 * 166.67 ≈ 103.33
    // (faceCenterY - sy) / cropSize ≈ 0.58
    const r = computeCropRegion({ x: 150, y: 150, width: 100, height: 100 }, 500, 500);
    expect((200 - r.sy) / r.cropSize).toBeCloseTo(0.58, 2);
  });

  it("crop is horizontally centred on face", () => {
    // box: x=100, y=100, w=100, h=100
    // faceCenterX = 150, sx = 150 - cropSize/2
    const r = computeCropRegion({ x: 100, y: 100, width: 100, height: 100 }, 400, 400);
    const faceCenterX = 100 + 100 / 2;
    expect(r.sx + r.cropSize / 2).toBeCloseTo(faceCenterX, 1);
  });

  it("uses the larger face dimension to set crop size", () => {
    // wide face: w=200, h=80 → max = 200 → cropSize = 200/0.6 ≈ 333.33
    const r = computeCropRegion({ x: 0, y: 0, width: 200, height: 80 }, 600, 600);
    expect(r.cropSize).toBeCloseTo(333.33, 1);
  });
});
