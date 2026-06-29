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
