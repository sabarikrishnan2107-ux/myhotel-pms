"use client";
import * as React from "react";
import Image from "next/image";
import { Camera, RotateCcw, Upload, X, CheckCircle2, ScanFace, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { prewarmFaceDetector, cropFaceWithPadding } from "@/lib/face-crop";
import { prewarmBackgroundRemoval, replaceBackgroundWithWhite } from "@/lib/background-removal";

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

type Mode = "idle" | "live" | "processing" | "validating" | "removing-bg" | "captured" | "error";

export function PhotoCapture({ label = "Capture photo", onChange, value, aspect = "square", focus = "face" }: Props) {
  const faceFocus = focus === "face";
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const [mode, setMode] = React.useState<Mode>(value ? "captured" : "idle");
  const [error, setError] = React.useState("");
  const [captured, setCaptured] = React.useState<string | null>(value ?? null);
  const [validationScore, setValidationScore] = React.useState<number | null>(null);
  const [validationMessage, setValidationMessage] = React.useState<string | null>(null);

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

  // Pre-warm models 800 ms after mount so first upload is near-instant.
  React.useEffect(() => {
    if (!faceFocus) return;
    const id = setTimeout(() => {
      prewarmBackgroundRemoval().catch(() => {});
      prewarmFaceDetector();
    }, 800);
    return () => clearTimeout(id);
  }, [faceFocus]);

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

    // 1. Compress to max 1000×1000, JPEG 0.8
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
    setMode("processing");
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

    // 5. Store result
    setCaptured(finalUrl);
    onChange?.(finalUrl);
    setMode("captured");
  }

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
    stop();
    const rawUrl = canvas.toDataURL("image/jpeg", 0.92);
    await runPipeline(rawUrl);
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
    setValidationScore(null);
    setValidationMessage(null);
    stop();
  };

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

  const aspectClass = aspect === "square" ? "aspect-square" : aspect === "portrait" ? "aspect-[3/4]" : "aspect-video";

  return (
    <div className="space-y-2">
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
        {(mode === "live" || mode === "processing" || mode === "validating" || mode === "removing-bg") && (
          <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted />
        )}
        {/* Face-alignment guide while the camera is live (face mode only) */}
        {mode === "live" && faceFocus && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-black/25" style={{ WebkitMaskImage: "radial-gradient(ellipse 38% 46% at 50% 44%, transparent 98%, black 100%)", maskImage: "radial-gradient(ellipse 38% 46% at 50% 44%, transparent 98%, black 100%)" }} />
            <div className="absolute left-1/2 top-[44%] -translate-x-1/2 -translate-y-1/2 h-[80%] w-[64%] rounded-[50%] border-2 border-white/70 border-dashed" />
          </div>
        )}
        {(mode === "processing" || mode === "validating" || mode === "removing-bg") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/45 text-white">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-[11px] mt-2">
              {mode === "validating"
                ? "Validating…"
                : mode === "removing-bg"
                ? "Removing background…"
                : "Processing…"}
            </p>
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

      {mode === "live" && faceFocus && (
        <div className="flex justify-center">
          <span className="text-[10px] font-medium text-muted-foreground inline-flex items-center gap-1">
            <ScanFace className="h-3 w-3" /> Align your face in the oval
          </span>
        </div>
      )}
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
        {(mode === "live" || mode === "processing" || mode === "validating" || mode === "removing-bg") && (
          <>
            <Button type="button" size="sm" onClick={capture} disabled={mode !== "live"} className="flex-1">
              {mode !== "live" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
              {mode !== "live" ? "Processing…" : "Capture"}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={reset} disabled={mode !== "live"}>Cancel</Button>
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
  );
}
