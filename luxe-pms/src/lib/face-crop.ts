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
