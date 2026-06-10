"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  current: number;
  target: number;
  format?: (v: number) => string;
  pace?: "ahead" | "ontrack" | "behind"; // optional MTD pace indicator
  className?: string;
}

/** Compact progress bar showing actual vs target with pace indicator. */
export function GoalProgress({ label, current, target, format = v => v.toString(), pace, className }: Props) {
  const pct = Math.max(0, Math.min(100, (current / target) * 100));

  // Color shifts as we approach target
  const fill =
    pct >= 100 ? "bg-success" :
    pct >= 75 ? "bg-brand" :
    pct >= 40 ? "bg-warning" :
    "bg-danger";

  const paceText: Record<NonNullable<Props["pace"]>, { label: string; cls: string }> = {
    ahead: { label: "↑ Ahead", cls: "text-success bg-success-soft" },
    ontrack: { label: "● On track", cls: "text-info bg-info-soft" },
    behind: { label: "↓ Behind", cls: "text-warning bg-warning-soft" },
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground font-semibold truncate">{label}</p>
        {pace && (
          <span className={cn("text-[9px] font-semibold rounded px-1 py-0.5 inline-flex items-center gap-0.5 shrink-0", paceText[pace].cls)}>
            {paceText[pace].label}
          </span>
        )}
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-base font-semibold tabular tracking-tight leading-none">{format(current)}</p>
        <p className="text-[10px] text-muted-foreground tabular shrink-0">
          <span className="font-semibold text-foreground">{Math.round(pct)}%</span> / {format(target)}
        </p>
      </div>
      <div className="relative h-1.5 bg-surface-sunken rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-700", fill)}
          style={{ width: `${pct}%` }}
        />
        <span className="absolute top-0 bottom-0 right-0 w-px bg-foreground/30" />
      </div>
    </div>
  );
}
