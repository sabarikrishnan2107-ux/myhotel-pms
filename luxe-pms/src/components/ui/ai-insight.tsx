"use client";
import * as React from "react";
import { Sparkles, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  title?: string;
  text: React.ReactNode;
  action?: { label: string; onClick?: () => void; href?: string };
  variant?: "soft" | "panel" | "inline";
  className?: string;
}

/** Compact AI hint chip used across the app. */
export function AIInsight({ title = "AI Insight", text, action, variant = "soft", className }: Props) {
  if (variant === "inline") {
    return (
      <p className={cn("text-xs text-muted-foreground inline-flex items-start gap-1.5", className)}>
        <Sparkles className="h-3 w-3 text-brand mt-0.5 shrink-0" />
        <span>{text}</span>
      </p>
    );
  }
  return (
    <div className={cn(
      variant === "panel"
        ? "rounded-md border border-brand/30 bg-linear-to-br from-brand-soft/60 via-surface to-accent-soft/30 p-4"
        : "rounded-md border border-border bg-brand-soft/40 p-3",
      className
    )}>
      <div className="flex items-start gap-3">
        <span className="h-7 w-7 shrink-0 rounded-md bg-brand text-brand-foreground flex items-center justify-center shadow-xs">
          <Sparkles className="h-3.5 w-3.5" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-[0.16em] font-semibold text-brand-soft-foreground">{title}</p>
          <div className="text-sm leading-relaxed mt-1">{text}</div>
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              className="mt-2 text-xs text-brand hover:underline inline-flex items-center gap-0.5 font-medium"
            >
              {action.label}<ChevronRight className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
