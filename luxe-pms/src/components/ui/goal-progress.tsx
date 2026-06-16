"use client";
import * as React from "react";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  current: number;
  target: number;
  format?: (v: number) => string;
  pace?: "ahead" | "ontrack" | "behind"; // optional MTD pace indicator
  className?: string;
}

/** Goal tile showing actual vs target with a pace indicator and progress bar. */
export function GoalProgress({ label, current, target, format = v => v.toString(), pace, className }: Props) {
  const pct = Math.max(0, Math.min(100, (current / target) * 100));

  // Color shifts as we approach target
  const fill =
    pct >= 100 ? "bg-success" :
    pct >= 75 ? "bg-brand" :
    pct >= 40 ? "bg-warning" :
    "bg-danger";

  const paceMap = {
    ahead:   { label: "Ahead",    cls: "text-success bg-success-soft", Icon: ArrowUp },
    ontrack: { label: "On track", cls: "text-info bg-info-soft",       Icon: Minus },
    behind:  { label: "Behind",   cls: "text-warning bg-warning-soft", Icon: ArrowDown },
  } as const;
  const p = pace ? paceMap[pace] : null;

  return (
    <div className={cn(
      "h-full flex flex-col justify-center gap-2.5 rounded-xl border border-border/60 bg-surface-sunken/25 p-4 transition-colors hover:border-border",
      className
    )}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground font-semibold truncate">{label}</p>
        {p && (
          <span className={cn("text-[10px] font-semibold rounded-full pl-1 pr-1.5 py-0.5 inline-flex items-center gap-0.5 shrink-0", p.cls)}>
            <p.Icon className="h-3 w-3" />{p.label}
          </span>
        )}
      </div>

      <p className="text-xl font-bold tabular tracking-tight leading-none">{format(current)}</p>

      <div className="space-y-1.5">
        <div className="relative h-2 bg-surface-sunken rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-700", fill)}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] text-muted-foreground tabular">
          <span className="font-semibold text-foreground">{Math.round(pct)}%</span>
          <span>of {format(target)}</span>
        </div>
      </div>
    </div>
  );
}
