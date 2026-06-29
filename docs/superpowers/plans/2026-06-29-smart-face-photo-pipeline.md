# Smart Face Photo Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a compress → validate → face-crop → background-removal pipeline to `PhotoCapture` for guest face photos, producing a 512×512 passport-style JPEG on white background stored as a base64 data URL.

**Architecture:** Two new lib files (`face-crop.ts`, `background-removal.ts`) act as lazy-loading wrappers around their respective npm packages, each caching the loaded model in a module-level promise. `photo-capture.tsx` calls them in sequence and drives all UI states. The backend (`VerificationController.php`) already accepts base64 data URIs — no backend changes required.

**Tech Stack:** face-api.js (TinyFaceDetector), @imgly/background-removal (isnet_quint8 WASM), Next.js 16, Tailwind CSS 4, TypeScript 5, vitest 4

## Global Constraints

- Pipeline runs **only** when `focus="face"` — ID document slots (`focus="none"`) are untouched
- Never re-run the pipeline on mount when `value` prop is already set (loading a ~10 MB WASM model on every edit-view would freeze the UI)
- `NEXT_PUBLIC_FACE_VALIDATOR_URL`: if not set, skip validation silently; if network error occurs, continue with warning message in the panel
- All new lib files use dynamic `import()` — never top-level static imports of face-api.js or @imgly, to avoid Next.js SSR breakage
- vitest environment is `"node"` — tests must be pure (typed arrays, no canvas/DOM)
- New files: `luxe-pms/src/lib/face-crop.ts`, `luxe-pms/src/lib/background-removal.ts`
- Modified files: `luxe-pms/src/components/guests/photo-capture.tsx`, `luxe-pms/next.config.ts`, `luxe-pms/.env.local`
- Model files served from `/models/` (static, `luxe-pms/public/models/`)

---

### Task 1: Install packages, add env var, patch Next.js config

**Files:**
- Modify: `luxe-pms/package.json` (via npm install)
- Modify: `luxe-pms/next.config.ts`
- Modify: `luxe-pms/.env.local`

**Interfaces:**
- Produces: `face-api.js` and `@imgly/background-removal` available as imports; WASM builds without error

- [ ] **Step 1: Install the two npm packages**

Run in `luxe-pms/`:
```bash
cd luxe-pms
npm install face-api.js @imgly/background-removal
```
Expected: both appear in `package.json` dependencies; no peer-dep warnings that block.

- [ ] **Step 2: Add `NEXT_PUBLIC_FACE_VALIDATOR_URL` to `.env.local`**

Current `luxe-pms/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

New `luxe-pms/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_FACE_VALIDATOR_URL=
```
Leave the value blank for now. When the validator server is available, fill it in.

- [ ] **Step 3: Patch `next.config.ts` to suppress ONNX native-module warnings**

`@imgly/background-removal` bundles ONNX Runtime which tries to load a Node.js native addon at build time. Add a webpack alias to null it out:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "onnxruntime-node$": false,
      "sharp$": false,
    };
    return config;
  },
};

export default nextConfig;
```

- [ ] **Step 4: Verify dev server starts without error**

Run:
```bash
npm run dev
```
Expected: server starts on port 3000, no build errors about `onnxruntime-node` or `sharp`. Stop the server.

- [ ] **Step 5: Commit**

```bash
git add luxe-pms/package.json luxe-pms/package-lock.json luxe-pms/next.config.ts luxe-pms/.env.local
git commit -m "chore: install face-api.js + @imgly/background-removal, patch next.config for WASM"
```

---

### Task 2: Download face-api.js model files (manual)

**Files:**
- Create: `luxe-pms/public/models/tiny_face_detector_model-weights_manifest.json`
- Create: `luxe-pms/public/models/tiny_face_detector_model-shard1`

**Interfaces:**
- Produces: `/models/tiny_face_detector_model-weights_manifest.json` accessible at runtime via `fetch`

- [ ] **Step 1: Create the models directory**

```bash
mkdir luxe-pms/public/models
```

- [ ] **Step 2: Download the two TinyFaceDetector model files**

Go to: `https://github.com/justadudewhohacks/face-api.js/tree/master/weights`

Download these two files and place them in `luxe-pms/public/models/`:
- `tiny_face_detector_model-weights_manifest.json`
- `tiny_face_detector_model-shard1`

No other model files are needed (only TinyFaceDetector is used).

- [ ] **Step 3: Verify the files are accessible**

Start the dev server (`npm run dev`) and open in a browser:
```
http://localhost:3000/models/tiny_face_detector_model-weights_manifest.json
```
Expected: JSON file displays in the browser. Stop the server.

- [ ] **Step 4: Commit**

```bash
git add luxe-pms/public/models/
git commit -m "chore: add face-api.js TinyFaceDetector model files to public/models"
```

---

### Task 3: Create `face-crop.ts`

**Files:**
- Create: `luxe-pms/src/lib/face-crop.ts`
- Create: `luxe-pms/src/lib/face-crop.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  // Pure function — exported for tests
  export function computeCropRegion(
    box: { x: number; y: number; width: number; height: number },
    srcW: number,
    srcH: number,
  ): { sx: number; sy: number; cropSize: number }

  // Client-side (DOM required) — not unit-tested
  export function prewarmFaceDetector(): void
  export async function cropFaceWithPadding(
    source: HTMLImageElement | HTMLCanvasElement,
    targetSize?: number,   // default 512
  ): Promise<string>       // JPEG data URL; never throws
  ```

- [ ] **Step 1: Write failing tests for `computeCropRegion`**

Create `luxe-pms/src/lib/face-crop.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd luxe-pms && npx vitest run src/lib/face-crop.test.ts
```
Expected: FAIL — `computeCropRegion is not a function` (module doesn't exist yet).

- [ ] **Step 3: Implement `face-crop.ts`**

Create `luxe-pms/src/lib/face-crop.ts`:

```typescript
// face-api.js TinyFaceDetector wrapper.
// Dynamic import keeps this out of the SSR bundle.
// Model files must be present at /models/ (see public/models/).

type FaceApi = typeof import("face-api.js");

let faceApiPromise: Promise<FaceApi> | null = null;

function getFaceApi(): Promise<FaceApi> {
  if (!faceApiPromise) {
    faceApiPromise = import("face-api.js").then(async (faceapi) => {
      await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
      return faceapi;
    });
  }
  return faceApiPromise;
}

export function prewarmFaceDetector(): void {
  getFaceApi().catch(() => {});
}

// Exported for unit tests — pure math, no DOM.
export function computeCropRegion(
  box: { x: number; y: number; width: number; height: number },
  _srcW: number,
  _srcH: number,
): { sx: number; sy: number; cropSize: number } {
  const faceSize = Math.max(box.width, box.height);
  const cropSize = faceSize / 0.6;
  const faceCenterX = box.x + box.width / 2;
  const faceCenterY = box.y + box.height / 2;
  const sx = faceCenterX - cropSize / 2;
  const sy = faceCenterY - cropSize * 0.58;
  return { sx, sy, cropSize };
}

export async function cropFaceWithPadding(
  source: HTMLImageElement | HTMLCanvasElement,
  targetSize = 512,
): Promise<string> {
  const srcW =
    source instanceof HTMLImageElement ? source.naturalWidth : source.width;
  const srcH =
    source instanceof HTMLImageElement ? source.naturalHeight : source.height;

  // Helper: draw source to a JPEG data URL (used as fallback).
  const toDataUrl = (): string => {
    const c = document.createElement("canvas");
    c.width = srcW;
    c.height = srcH;
    c.getContext("2d")!.drawImage(source, 0, 0);
    return c.toDataURL("image/jpeg", 0.92);
  };

  try {
    const faceapi = await getFaceApi();
    const detection = await faceapi.detectSingleFace(
      source,
      new faceapi.TinyFaceDetectorOptions(),
    );

    const out = document.createElement("canvas");
    out.width = targetSize;
    out.height = targetSize;
    const ctx = out.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, targetSize, targetSize);

    if (!detection) {
      console.warn("[face-crop] No face detected — returning full image");
      ctx.drawImage(source, 0, 0, srcW, srcH, 0, 0, targetSize, targetSize);
      return out.toDataURL("image/jpeg", 0.92);
    }

    const { sx, sy, cropSize } = computeCropRegion(
      detection.box,
      srcW,
      srcH,
    );

    // Clamp to source bounds; white fill covers the out-of-bounds remainder.
    const clamped = {
      x: Math.max(0, sx),
      y: Math.max(0, sy),
      r: Math.min(srcW, sx + cropSize),
      b: Math.min(srcH, sy + cropSize),
    };
    const cw = clamped.r - clamped.x;
    const ch = clamped.b - clamped.y;
    const scale = targetSize / cropSize;

    ctx.drawImage(
      source,
      clamped.x, clamped.y, cw, ch,
      (clamped.x - sx) * scale, (clamped.y - sy) * scale,
      cw * scale, ch * scale,
    );
    return out.toDataURL("image/jpeg", 0.92);
  } catch (err) {
    console.warn("[face-crop] Error:", err);
    return toDataUrl();
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run src/lib/face-crop.test.ts
```
Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add luxe-pms/src/lib/face-crop.ts luxe-pms/src/lib/face-crop.test.ts
git commit -m "feat: add face-crop.ts — TinyFaceDetector wrapper with passport padding"
```

---

### Task 4: Create `background-removal.ts`

**Files:**
- Create: `luxe-pms/src/lib/background-removal.ts`
- Create: `luxe-pms/src/lib/background-removal.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  // Pure function — exported for tests
  export function applyAlphaThreshold(
    maskPixels: Uint8ClampedArray,
    origPixels: Uint8ClampedArray,
    outPixels: Uint8ClampedArray,
  ): void

  // Client-side (DOM required) — not unit-tested
  export async function prewarmBackgroundRemoval(): Promise<void>
  export async function replaceBackgroundWithWhite(
    dataUrl: string
  ): Promise<string>   // JPEG data URL; never throws
  ```

- [ ] **Step 1: Write failing tests for `applyAlphaThreshold`**

Create `luxe-pms/src/lib/background-removal.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run src/lib/background-removal.test.ts
```
Expected: FAIL — module doesn't exist yet.

- [ ] **Step 3: Implement `background-removal.ts`**

Create `luxe-pms/src/lib/background-removal.ts`:

```typescript
// @imgly/background-removal wrapper.
// Dynamic import keeps the ~10 MB WASM model out of the initial bundle.
// Model is lazily loaded and cached on first call.

const BG_CONFIG = {
  model: "isnet_quint8" as const,
  output: { format: "image/png" as const },
};

let modelReady: Promise<void> | null = null;

async function ensureModelLoaded(): Promise<void> {
  if (!modelReady) {
    modelReady = import("@imgly/background-removal").then(({ preload }) =>
      preload(BG_CONFIG),
    );
  }
  return modelReady;
}

export async function prewarmBackgroundRemoval(): Promise<void> {
  return ensureModelLoaded();
}

// Exported for unit tests — pure typed-array manipulation, no DOM.
export function applyAlphaThreshold(
  maskPixels: Uint8ClampedArray,
  origPixels: Uint8ClampedArray,
  outPixels: Uint8ClampedArray,
): void {
  for (let i = 0; i < outPixels.length; i += 4) {
    const alpha = maskPixels[i + 3];
    if (alpha <= 24) {
      // Background — pure white.
      outPixels[i] = outPixels[i + 1] = outPixels[i + 2] = outPixels[i + 3] = 255;
    } else {
      // Foreground — composite original over white using mask alpha.
      // This preserves hair detail AND creates natural edge feathering.
      const t = alpha / 255;
      outPixels[i]     = Math.round(origPixels[i]     * t + 255 * (1 - t));
      outPixels[i + 1] = Math.round(origPixels[i + 1] * t + 255 * (1 - t));
      outPixels[i + 2] = Math.round(origPixels[i + 2] * t + 255 * (1 - t));
      outPixels[i + 3] = 255;
    }
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

export async function replaceBackgroundWithWhite(
  dataUrl: string,
): Promise<string> {
  try {
    await ensureModelLoaded();
    const { removeBackground } = await import("@imgly/background-removal");

    // Get the foreground-only PNG (alpha = 0 for background).
    const fgBlob = await removeBackground(dataUrl, BG_CONFIG);
    const fgUrl = URL.createObjectURL(fgBlob);

    const [fgImg, origImg] = await Promise.all([
      loadImage(fgUrl),
      loadImage(dataUrl),
    ]);
    URL.revokeObjectURL(fgUrl);

    const w = fgImg.naturalWidth;
    const h = fgImg.naturalHeight;

    // Extract @imgly's alpha mask.
    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = w;
    maskCanvas.height = h;
    const mCtx = maskCanvas.getContext("2d")!;
    mCtx.drawImage(fgImg, 0, 0);
    const maskData = mCtx.getImageData(0, 0, w, h);

    // Extract original pixel colors.
    const origCanvas = document.createElement("canvas");
    origCanvas.width = w;
    origCanvas.height = h;
    const oCtx = origCanvas.getContext("2d")!;
    oCtx.drawImage(origImg, 0, 0, w, h);
    const origData = oCtx.getImageData(0, 0, w, h);

    // Build output image.
    const outCanvas = document.createElement("canvas");
    outCanvas.width = w;
    outCanvas.height = h;
    const outCtx = outCanvas.getContext("2d")!;
    const outData = outCtx.createImageData(w, h);
    applyAlphaThreshold(maskData.data, origData.data, outData.data);
    outCtx.putImageData(outData, 0, 0);

    return outCanvas.toDataURL("image/jpeg", 0.95);
  } catch (err) {
    console.warn("[background-removal] Error:", err);
    return dataUrl;
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run src/lib/background-removal.test.ts
```
Expected: 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add luxe-pms/src/lib/background-removal.ts luxe-pms/src/lib/background-removal.test.ts
git commit -m "feat: add background-removal.ts — @imgly wrapper with alpha threshold + white fill"
```

---

### Task 5: Enhance `photo-capture.tsx` with pipeline + new UI

**Files:**
- Modify: `luxe-pms/src/components/guests/photo-capture.tsx`

**Interfaces:**
- Consumes:
  - `prewarmFaceDetector`, `cropFaceWithPadding` from `@/lib/face-crop`
  - `prewarmBackgroundRemoval`, `replaceBackgroundWithWhite` from `@/lib/background-removal`
- Produces: Component with new modes `"validating" | "removing-bg"`, circular preview in face mode, validation panel below

- [ ] **Step 1: Replace the file header — remove native FaceDetector code, add new imports**

The old `detectFaceBox`, `faceFocusedDataUrl`, and `OUT_SIZE` constant (lines 24–81) are superseded by the new libs. Delete them and add the new imports.

Replace the top of `luxe-pms/src/components/guests/photo-capture.tsx` from line 1 through the end of `faceFocusedDataUrl` (up to and including line 81) with:

```typescript
"use client";
import * as React from "react";
import Image from "next/image";
import { Camera, RotateCcw, Upload, X, CheckCircle2, ScanFace, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { prewarmFaceDetector, cropFaceWithPadding } from "@/lib/face-crop";
import { prewarmBackgroundRemoval, replaceBackgroundWithWhite } from "@/lib/background-removal";
```

- [ ] **Step 2: Extend the Mode type and add validation state**

Find and replace the `type Mode` line:

Old:
```typescript
type Mode = "idle" | "live" | "processing" | "captured" | "error";
```

New:
```typescript
type Mode = "idle" | "live" | "processing" | "validating" | "removing-bg" | "captured" | "error";
```

Inside the `PhotoCapture` function body, after the `const [captured, ...]` line, add two new state variables:

```typescript
const [validationScore, setValidationScore] = React.useState<number | null>(null);
const [validationMessage, setValidationMessage] = React.useState<string | null>(null);
```

- [ ] **Step 3: Add pre-warm effect (face mode only)**

Add after the `React.useEffect(() => () => stop(), [stop]);` line:

```typescript
// Pre-warm models 800 ms after mount so first upload is near-instant.
React.useEffect(() => {
  if (!faceFocus) return;
  const id = setTimeout(() => {
    prewarmBackgroundRemoval().catch(() => {});
    prewarmFaceDetector();
  }, 800);
  return () => clearTimeout(id);
}, [faceFocus]);
```

- [ ] **Step 4: Add helper functions — `compressImage`, `validatePhoto`, `loadImageEl`, `runPipeline`**

Add these private helpers immediately before the `start` function inside the component body:

```typescript
async function compressImage(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const scale = Math.min(1, 1000 / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.src = dataUrl;
  });
}

async function validatePhoto(
  base64: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const url = process.env.NEXT_PUBLIC_FACE_VALIDATOR_URL;
  if (!url) return { ok: true };
  const imageBase64 = base64.startsWith("data:") ? base64.split(",")[1] : base64;
  try {
    const res = await fetch(`${url}/validate-passport`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_base64: imageBase64 }),
    });
    const json = (await res.json()) as { status: boolean; message: string };
    return json.status ? { ok: true } : { ok: false, message: json.message };
  } catch {
    setValidationScore(null);
    setValidationMessage("Validation service offline — photo saved without check");
    return { ok: true }; // lenient: continue pipeline
  }
}

function loadImageEl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

async function runPipeline(rawDataUrl: string): Promise<void> {
  setValidationScore(null);
  setValidationMessage(null);

  // 1. Compress
  const compressed = await compressImage(rawDataUrl);

  // 2. Validate (face mode + URL configured)
  if (faceFocus) {
    setMode("validating");
    const result = await validatePhoto(compressed);
    if (!result.ok) {
      setValidationScore(0);
      setValidationMessage(result.message);
      setMode("idle");
      return;
    }
    if (process.env.NEXT_PUBLIC_FACE_VALIDATOR_URL) {
      setValidationScore(100);
    }
  }

  // 3. Face crop
  if (faceFocus) {
    setMode("processing");
  }
  let cropped = compressed;
  if (faceFocus) {
    const imgEl = await loadImageEl(compressed);
    cropped = await cropFaceWithPadding(imgEl);
  }

  // 4. Background removal
  let finalUrl = cropped;
  if (faceFocus) {
    setMode("removing-bg");
    finalUrl = await replaceBackgroundWithWhite(cropped);
  }

  // 5. Store
  setCaptured(finalUrl);
  onChange?.(finalUrl);
  setMode("captured");
}
```

- [ ] **Step 5: Replace `capture()` to use `runPipeline`**

Old `capture` function (lines 123–142):
```typescript
const capture = async () => {
  const v = videoRef.current;
  if (!v || !v.videoWidth) return;
  setMode("processing");
  const canvas = document.createElement("canvas");
  canvas.width = v.videoWidth;
  canvas.height = v.videoHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) { setMode("live"); return; }
  ctx.drawImage(v, 0, 0);
  // Face mode: detect + crop (guided center-crop fallback). Document mode:
  // keep the full frame so the whole ID stays in shot.
  const url = faceFocus
    ? ((await faceFocusedDataUrl(canvas, { centerFallback: true })) ?? canvas.toDataURL("image/jpeg", 0.92))
    : canvas.toDataURL("image/jpeg", 0.92);
  setCaptured(url);
  onChange?.(url);
  setMode("captured");
  stop();
};
```

New `capture` function:
```typescript
const capture = async () => {
  const v = videoRef.current;
  if (!v || !v.videoWidth) return;
  setMode("processing");
  const canvas = document.createElement("canvas");
  canvas.width = v.videoWidth;
  canvas.height = v.videoHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) { setMode("live"); return; }
  ctx.drawImage(v, 0, 0);
  stop();
  const rawUrl = canvas.toDataURL("image/jpeg", 0.92);
  await runPipeline(rawUrl);
};
```

- [ ] **Step 6: Replace `upload()` to use `runPipeline`**

Old `upload` function (lines 157–184):
```typescript
const upload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async ev => {
    const original = ev.target?.result as string;
    // Try to face-crop the upload too; if no face is detected, keep the
    // original (don't blindly center-crop an arbitrary photo).
    const img = new window.Image();
    img.onload = async () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      let url = original;
      if (ctx && faceFocus) {
        ctx.drawImage(img, 0, 0);
        url = (await faceFocusedDataUrl(canvas, { centerFallback: false })) ?? original;
      }
      setCaptured(url);
      onChange?.(url);
      setMode("captured");
    };
    img.onerror = () => { setCaptured(original); onChange?.(original); setMode("captured"); };
    img.src = original;
  };
  reader.readAsDataURL(file);
};
```

New `upload` function:
```typescript
const upload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  setMode("processing");
  const reader = new FileReader();
  reader.onload = async (ev) => {
    const rawUrl = ev.target?.result as string;
    await runPipeline(rawUrl);
  };
  reader.readAsDataURL(file);
};
```

- [ ] **Step 7: Update `reset()` to clear validation state**

Old `reset`:
```typescript
const reset = () => {
  setCaptured(null);
  onChange?.(null);
  setMode("idle");
  stop();
};
```

New `reset`:
```typescript
const reset = () => {
  setCaptured(null);
  onChange?.(null);
  setMode("idle");
  setValidationScore(null);
  setValidationMessage(null);
  stop();
};
```

- [ ] **Step 8: Replace the preview container with circle (face mode) or original square**

Old container opening div (lines 190–193):
```typescript
<div className={cn(
  "relative rounded-md border-2 border-dashed border-border bg-surface-sunken overflow-hidden",
  aspectClass
)}>
```

New:
```typescript
<div className={cn(
  "relative overflow-hidden",
  faceFocus
    ? cn(
        "rounded-full border-2",
        mode === "captured"
          ? "border-success"
          : "border-dashed border-border bg-surface-sunken",
        "w-40 h-40",
      )
    : cn(
        "rounded-md border-2 border-dashed border-border bg-surface-sunken",
        aspectClass,
      ),
)}>
```

- [ ] **Step 9: Update processing overlay labels to cover new modes**

Find the `mode === "processing"` overlay block (around line 209–214):
```typescript
{mode === "processing" && (
  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/45 text-white">
    <Loader2 className="h-6 w-6 animate-spin" />
    <p className="text-[11px] mt-2">{faceFocus ? "Focusing on face…" : "Processing…"}</p>
  </div>
)}
```

Replace with:
```typescript
{(mode === "processing" || mode === "validating" || mode === "removing-bg") && (
  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/45 text-white">
    <Loader2 className="h-6 w-6 animate-spin" />
    <p className="text-[11px] mt-2">
      {mode === "validating"
        ? "Validating…"
        : mode === "removing-bg"
        ? "Removing background…"
        : faceFocus
        ? "Processing…"
        : "Processing…"}
    </p>
  </div>
)}
```

- [ ] **Step 10: Add the face alignment oval guard for new modes**

The `mode === "live"` guard for the oval is unchanged. Verify `mode === "processing"` in the video render still covers `validating` and `removing-bg` (they shouldn't show video). The video element is rendered for `mode === "live" || mode === "processing"`:

```typescript
{(mode === "live" || mode === "processing") && (
  <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted />
)}
```

This is already correct — `validating` and `removing-bg` don't render the video element (webcam feed stopped before pipeline starts in `capture()`).

- [ ] **Step 11: Add validation panel below the preview container**

After the closing `</div>` of the preview container (and after the button row `</div>`), add the validation panel. The full `return` structure for the face mode is:

```
<div className="space-y-2">
  <div>  {/* preview container */}  </div>
  <div className="flex gap-1.5">  {/* buttons */}  </div>
  {/* NEW: validation panel */}
  {faceFocus && validationScore !== null && (
    <div className="space-y-1.5 pt-1">
      <div className="h-1.5 w-full bg-surface-sunken rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full transition-all duration-500",
            validationScore >= 70 ? "bg-success" : "bg-danger",
          )}
          style={{ width: `${validationScore}%` }}
        />
      </div>
      <div className="flex items-center gap-1.5">
        {validationScore >= 70 ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-success" />
        ) : (
          <AlertCircle className="h-3.5 w-3.5 text-danger" />
        )}
        <span
          className={cn(
            "text-[11px] font-medium",
            validationScore >= 70 ? "text-success" : "text-danger",
          )}
        >
          Score: {validationScore}%
        </span>
      </div>
      {validationMessage && (
        <p className="text-[11px] text-danger leading-snug">{validationMessage}</p>
      )}
    </div>
  )}
</div>
```

- [ ] **Step 12: Start dev server and manually verify the UI**

```bash
npm run dev
```

Open the app in browser. Navigate to any new-booking flow that shows the guest form.

Verify:
1. Guest face photo slot shows a **circle** preview, not a square box
2. Upload a photo → overlay shows "Validating…" (if URL set) then "Removing background…"
3. After processing, the circle shows the result with a green success ring
4. Validation panel appears below with score bar
5. ID document upload slots are **unchanged** (still square dashed boxes)
6. Retake clears the validation panel
7. No TypeScript errors in the terminal

- [ ] **Step 13: Run the full test suite**

```bash
npx vitest run
```
Expected: all existing tests + the 4 face-crop tests + 6 background-removal tests PASS. No failures.

- [ ] **Step 14: Commit**

```bash
git add luxe-pms/src/components/guests/photo-capture.tsx
git commit -m "feat: smart face photo pipeline — circle preview, compress/validate/crop/bg-remove"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| Compress max 1000×1000, JPEG 0.8 | Task 5 `compressImage` |
| POST /validate-passport, abort if status=false | Task 5 `validatePhoto` + `runPipeline` |
| Skip validation if URL not set | Task 5 `validatePhoto` — returns `{ok:true}` when URL blank |
| Network error → continue with warning | Task 5 `validatePhoto` catch block |
| face-api.js TinyFaceDetector, 512×512, passport padding | Task 3 `cropFaceWithPadding` + `computeCropRegion` |
| White fill for out-of-bounds canvas area | Task 3 `ctx.fillStyle = "#ffffff"` before crop |
| No face detected → fallback to full image | Task 3 — detected null path |
| @imgly isnet_quint8, alpha > 24 → original pixel | Task 4 `applyAlphaThreshold` |
| alpha ≤ 24 → white | Task 4 `applyAlphaThreshold` |
| Edge feather via mask alpha compositing | Task 4 — `t = alpha/255` blend |
| Output JPEG 0.95 | Task 4 `toDataURL("image/jpeg", 0.95)` |
| Circular 160×160 avatar | Task 5 `w-40 h-40 rounded-full` |
| Overlay labels: Validating / Removing background | Task 5 Step 9 |
| Validation panel: progress bar + score + error | Task 5 Step 11 |
| Pre-warm on mount, 800ms delay | Task 5 Step 3 |
| Edit mode: don't re-run pipeline | Existing `value` prop path unchanged (sets mode="captured" directly) |
| Model files from /public/models | Task 2 + Task 3 `loadFromUri("/models")` |
| NEXT_PUBLIC_FACE_VALIDATOR_URL env var | Task 1 Step 2 |
| No backend changes | N/A — verified VerificationController already handles base64 |
