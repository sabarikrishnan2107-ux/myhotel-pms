"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

interface Props {
  value: number;        // 0-100
  size?: number;        // pixel diameter
  thickness?: number;
  label?: string;
  hint?: string;
  className?: string;
}

/** Premium semi-circle occupancy gauge with tick marks. */
export function OccupancyGauge({ value, size = 200, thickness = 14, label = "Occupancy", hint, className }: Props) {
  const radius = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  // Color shifts based on value
  const stroke =
    value >= 80 ? "var(--color-success)" :
    value >= 60 ? "var(--color-brand)" :
    value >= 40 ? "var(--color-warning)" :
    "var(--color-danger)";

  return (
    <div className={cn("flex flex-col items-center justify-center", className)} style={{ width: size }}>
      <svg width={size} height={size / 2 + thickness} viewBox={`0 0 ${size} ${size / 2 + thickness}`}>
        {/* track */}
        <path
          d={`M ${thickness / 2} ${cy} A ${radius} ${radius} 0 0 1 ${size - thickness / 2} ${cy}`}
          fill="none"
          stroke="var(--color-surface-sunken)"
          strokeWidth={thickness}
          strokeLinecap="round"
        />
        {/* value */}
        <path
          d={`M ${thickness / 2} ${cy} A ${radius} ${radius} 0 0 1 ${size - thickness / 2} ${cy}`}
          fill="none"
          stroke={stroke}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 600ms ease, stroke 400ms ease" }}
        />
        {/* tick marks */}
        {[0, 25, 50, 75, 100].map(t => {
          const angle = Math.PI - (t / 100) * Math.PI;
          const x1 = cx + Math.cos(angle) * (radius - thickness / 2 - 2);
          const y1 = cy - Math.sin(angle) * (radius - thickness / 2 - 2);
          const x2 = cx + Math.cos(angle) * (radius - thickness / 2 - 6);
          const y2 = cy - Math.sin(angle) * (radius - thickness / 2 - 6);
          return <line key={t} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--color-muted-foreground)" strokeWidth={1} opacity={0.4} />;
        })}
      </svg>

      <div className="-mt-10 flex flex-col items-center">
        <p className="text-3xl font-semibold tabular tracking-tight">{value}%</p>
        <p className="text-[10px] uppercase tracking-[0.16em] font-semibold text-muted-foreground mt-1">{label}</p>
        {hint && <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>}
      </div>
    </div>
  );
}
