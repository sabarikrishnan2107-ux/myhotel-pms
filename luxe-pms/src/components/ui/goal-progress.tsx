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
    ahead: { label: "▲ Ahead", cls: "text-success bg-success-soft" },
    ontrack: { label: "● On track", cls: "text-info bg-info-soft" },
    behind: { label: "▼ Behind", cls: "text-warning bg-warning-soft" },
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
        {pace && (
          <span className={cn("text-[10px] font-semibold rounded-full px-1.5 py-0.5", paceText[pace].cls)}>
            {paceText[pace].label}
          </span>
        )}
      </div>
      <div className="flex items-baseline justify-between">
        <p className="text-lg font-semibold tabular tracking-tight">{format(current)}</p>
        <p className="text-xs text-muted-foreground tabular">/ {format(target)}</p>
      </div>
      <div className="relative h-2 bg-surface-sunken rounded-full overflow-hidden">
        <div
          className={cn("h-full transition-all duration-700", fill)}
          style={{ width: `${pct}%` }}
        />
        {/* Target tick at 100% */}
        <span className="absolute top-0 bottom-0 right-0 w-px bg-foreground/30" />
      </div>
      <p className="text-[10px] text-muted-foreground tabular">
        <span className="font-medium text-foreground">{pct.toFixed(1)}%</span> of target
      </p>
    </div>
  );
}
