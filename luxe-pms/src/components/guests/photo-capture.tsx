"use client";
import * as React from "react";
import Image from "next/image";
import { Camera, RotateCcw, Upload, X, CheckCircle2, ScanFace, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  label?: string;
  onChange?: (dataUrl: string | null) => void;
  /** Pre-fill the slot with an existing photo (e.g. captured on the tablet). */
  value?: string | null;
  aspect?: "square" | "portrait" | "landscape";
  // "face" (default): show the alignment oval and crop to the detected face —
  // for guest selfies. "none": capture the full frame with no crop — for
  // documents (ID front/back) where cropping to a face would be wrong.
  focus?: "face" | "none";
}

type Mode = "idle" | "live" | "processing" | "captured" | "error";

// Native Shape-Detection FaceDetector (Chromium/Edge). Typed minimally; we
// feature-detect at runtime and gracefully fall back when it's unavailable.
type FaceBox = { x: number; y: number; width: number; height: number };
type DetectedFace = { boundingBox: FaceBox };
type FaceDetectorLike = { detect: (src: CanvasImageSource) => Promise<DetectedFace[]> };
type FaceDetectorCtor = new (opts?: { fastMode?: boolean; maxDetectedFaces?: number }) => FaceDetectorLike;

async function detectFaceBox(canvas: HTMLCanvasElement): Promise<FaceBox | null> {
  const Ctor = (window as unknown as { FaceDetector?: FaceDetectorCtor }).FaceDetector;
  if (!Ctor) return null;
  try {
    const fd = new Ctor({ fastMode: true, maxDetectedFaces: 1 });
    const faces = await fd.detect(canvas);
    return faces?.[0]?.boundingBox ?? null;
  } catch {
    return null;
  }
}

const OUT_SIZE = 640; // output square edge in px

// Crop the frame to a square focused on the face and return a JPEG data URL.
// Uses the detected face box (padded) when available; otherwise an optional
// guided center crop (the on-screen oval keeps the face centred).
async function faceFocusedDataUrl(
  source: HTMLCanvasElement,
  { centerFallback }: { centerFallback: boolean },
): Promise<string | null> {
  const cw = source.width, ch = source.height;
  if (!cw || !ch) return null;
  const box = await detectFaceBox(source);

  let sx: number, sy: number, size: number;
  if (box) {
    // Pad the face box so we keep hair + a little shoulder, then square it off.
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    size = Math.min(Math.max(box.width, box.height) * 1.8, cw, ch);
    sx = cx - size / 2;
    sy = cy - size / 2 - box.height * 0.1; // bias up slightly for headroom
  } else {
    if (!centerFallback) return null;
    // No detector: crop the central square (biased up a touch) — the oval
    // guide during preview keeps the face roughly here.
    size = Math.min(cw, ch) * 0.8;
    sx = (cw - size) / 2;
    sy = (ch - size) / 2 - ch * 0.05;
  }
  // Clamp inside the frame.
  sx = Math.max(0, Math.min(cw - size, sx));
  sy = Math.max(0, Math.min(ch - size, sy));

  const out = document.createElement("canvas");
  out.width = OUT_SIZE;
  out.height = OUT_SIZE;
  const octx = out.getContext("2d");
  if (!octx) return null;
  octx.drawImage(source, sx, sy, size, size, 0, 0, OUT_SIZE, OUT_SIZE);
  return out.toDataURL("image/jpeg", 0.92);
}

export function PhotoCapture({ label = "Capture photo", onChange, value, aspect = "square", focus = "face" }: Props) {
  const faceFocus = focus === "face";
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const [mode, setMode] = React.useState<Mode>(value ? "captured" : "idle");
  const [error, setError] = React.useState("");
  const [captured, setCaptured] = React.useState<string | null>(value ?? null);

  // Reflect a value supplied/changed by the parent (e.g. tablet capture).
  React.useEffect(() => {
    if (value) {
      setCaptured(value);
      setMode("captured");
    }
  }, [value]);

  const stop = React.useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  React.useEffect(() => () => stop(), [stop]);

  const start = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setMode("live");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Camera not available";
      setError(msg);
      setMode("error");
    }
  };

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

  const retake = () => {
    setCaptured(null);
    onChange?.(null);
    start();
  };

  const reset = () => {
    setCaptured(null);
    onChange?.(null);
    setMode("idle");
    stop();
  };

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

  const aspectClass = aspect === "square" ? "aspect-square" : aspect === "portrait" ? "aspect-[3/4]" : "aspect-video";

  return (
    <div className="space-y-2">
      <div className={cn(
        "relative rounded-md border-2 border-dashed border-border bg-surface-sunken overflow-hidden",
        aspectClass
      )}>
        {(mode === "live" || mode === "processing") && (
          <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted />
        )}
        {/* Face-alignment guide while the camera is live (face mode only) */}
        {mode === "live" && faceFocus && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-black/25" style={{ WebkitMaskImage: "radial-gradient(ellipse 38% 46% at 50% 44%, transparent 98%, black 100%)", maskImage: "radial-gradient(ellipse 38% 46% at 50% 44%, transparent 98%, black 100%)" }} />
            <div className="absolute left-1/2 top-[44%] -translate-x-1/2 -translate-y-1/2 h-[80%] w-[64%] rounded-[50%] border-2 border-white/70 border-dashed" />
            <div className="absolute bottom-2 inset-x-0 flex justify-center">
              <span className="text-[10px] font-medium text-white bg-black/55 rounded-full px-2 py-0.5 inline-flex items-center gap-1">
                <ScanFace className="h-3 w-3" /> Align your face in the oval
              </span>
            </div>
          </div>
        )}
        {mode === "processing" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/45 text-white">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-[11px] mt-2">{faceFocus ? "Focusing on face…" : "Processing…"}</p>
          </div>
        )}
        {mode === "captured" && captured && (
          <Image src={captured} alt="Captured photo" fill unoptimized className="object-cover" />
        )}
        {mode === "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-subtle-foreground">
            <Camera className="h-8 w-8" />
            <p className="text-xs mt-2">{label}</p>
          </div>
        )}
        {mode === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-danger p-3 text-center">
            <X className="h-6 w-6" />
            <p className="text-[11px] mt-2 leading-tight">{error}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Use upload instead</p>
          </div>
        )}
        {mode === "captured" && (
          <div className="absolute top-1.5 right-1.5 bg-success text-white rounded-full h-6 w-6 flex items-center justify-center shadow-md">
            <CheckCircle2 className="h-3.5 w-3.5" />
          </div>
        )}
      </div>

      <div className="flex gap-1.5">
        {mode === "idle" && (
          <>
            <Button type="button" size="sm" variant="secondary" onClick={start} className="flex-1">
              <Camera className="h-3.5 w-3.5" />Start camera
            </Button>
            <label className="flex-1 h-8 px-3 rounded-md border border-border text-xs font-medium hover:bg-surface-sunken inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors">
              <Upload className="h-3.5 w-3.5" />Upload
              <input type="file" accept="image/*" onChange={upload} className="sr-only" />
            </label>
          </>
        )}
        {(mode === "live" || mode === "processing") && (
          <>
            <Button type="button" size="sm" onClick={capture} disabled={mode === "processing"} className="flex-1">
              {mode === "processing" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
              {mode === "processing" ? "Capturing…" : "Capture"}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={reset} disabled={mode === "processing"}>Cancel</Button>
          </>
        )}
        {mode === "captured" && (
          <>
            <Button type="button" size="sm" variant="outline" onClick={retake} className="flex-1">
              <RotateCcw className="h-3.5 w-3.5" />Retake
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={reset}>Remove</Button>
          </>
        )}
        {mode === "error" && (
          <label className="w-full h-8 px-3 rounded-md border border-border text-xs font-medium hover:bg-surface-sunken inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors">
            <Upload className="h-3.5 w-3.5" />Upload photo instead
            <input type="file" accept="image/*" onChange={upload} className="sr-only" />
          </label>
        )}
      </div>
    </div>
  );
}
