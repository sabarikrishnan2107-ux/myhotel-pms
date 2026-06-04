"use client";
import * as React from "react";
import Image from "next/image";
import { Camera, RotateCcw, Upload, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  label?: string;
  onChange?: (dataUrl: string | null) => void;
  aspect?: "square" | "portrait" | "landscape";
}

type Mode = "idle" | "live" | "captured" | "error";

export function PhotoCapture({ label = "Capture photo", onChange, aspect = "square" }: Props) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const [mode, setMode] = React.useState<Mode>("idle");
  const [error, setError] = React.useState("");
  const [captured, setCaptured] = React.useState<string | null>(null);

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

  const capture = () => {
    const v = videoRef.current;
    if (!v) return;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(v, 0, 0);
    const url = canvas.toDataURL("image/jpeg", 0.92);
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
    reader.onload = ev => {
      const url = ev.target?.result as string;
      setCaptured(url);
      onChange?.(url);
      setMode("captured");
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
        {mode === "live" && (
          <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted />
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
        {mode === "live" && (
          <>
            <Button type="button" size="sm" onClick={capture} className="flex-1">
              <Camera className="h-3.5 w-3.5" />Capture
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={reset}>Cancel</Button>
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
