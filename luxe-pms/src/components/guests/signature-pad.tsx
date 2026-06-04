"use client";
import * as React from "react";
import { Eraser, Pen, CheckCircle2 } from "lucide-react";

interface Props {
  onChange?: (dataUrl: string | null) => void;
  height?: number;
}

export function SignaturePad({ onChange, height = 160 }: Props) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const drawingRef = React.useRef(false);
  const [hasInk, setHasInk] = React.useState(false);

  React.useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ratio = window.devicePixelRatio || 1;
    c.width = c.offsetWidth * ratio;
    c.height = c.offsetHeight * ratio;
    const ctx = c.getContext("2d");
    if (ctx) {
      ctx.scale(ratio, ratio);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = 1.8;
      // Read foreground color from CSS var so it works in dark mode
      const cs = getComputedStyle(document.documentElement);
      const hslFg = cs.getPropertyValue("--foreground").trim();
      ctx.strokeStyle = hslFg ? `hsl(${hslFg})` : "#1a1a1a";
    }
  }, []);

  const getPoint = (e: React.MouseEvent | React.TouchEvent) => {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    if ("touches" in e) {
      const t = e.touches[0];
      return { x: t.clientX - rect.left, y: t.clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const p = getPoint(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    drawingRef.current = true;
  };

  const move = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const p = getPoint(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    if (!hasInk) setHasInk(true);
  };

  const end = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const c = canvasRef.current;
    if (c && onChange) {
      onChange(c.toDataURL("image/png"));
    }
  };

  const clear = () => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    setHasInk(false);
    onChange?.(null);
  };

  return (
    <div>
      <div className="relative rounded-md border-2 border-dashed border-border bg-surface overflow-hidden" style={{ height }}>
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair touch-none"
          onMouseDown={start}
          onMouseMove={move}
          onMouseUp={end}
          onMouseLeave={end}
          onTouchStart={start}
          onTouchMove={move}
          onTouchEnd={end}
        />
        {!hasInk && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-subtle-foreground">
            <Pen className="h-4 w-4 mr-2" />
            Sign here
          </div>
        )}
        {hasInk && (
          <span className="absolute top-1.5 right-1.5 bg-success text-white rounded-full h-6 w-6 flex items-center justify-center shadow-md">
            <CheckCircle2 className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
      <div className="mt-2 flex justify-between items-center text-xs">
        <span className="text-muted-foreground">{hasInk ? "Signature captured" : "Sign with mouse or finger"}</span>
        <button type="button" onClick={clear} className="text-brand hover:underline inline-flex items-center gap-1">
          <Eraser className="h-3 w-3" />Clear
        </button>
      </div>
    </div>
  );
}
