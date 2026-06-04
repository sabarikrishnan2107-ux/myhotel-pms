import * as React from "react";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "./card";

interface KPICardProps {
  label: string;
  value: string | number;
  hint?: string;
  delta?: number;
  icon?: LucideIcon;
  accent?: "brand" | "success" | "warning" | "danger" | "info" | "accent" | "neutral";
  className?: string;
}

const ACCENT_RING: Record<NonNullable<KPICardProps["accent"]>, string> = {
  brand: "bg-brand-soft text-brand-soft-foreground",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
  accent: "bg-accent-soft text-accent",
  neutral: "bg-surface-sunken text-muted-foreground",
};

export function KPICard({ label, value, hint, delta, icon: Icon, accent = "neutral", className }: KPICardProps) {
  const positive = (delta ?? 0) >= 0;
  return (
    <Card className={cn("p-4 sm:p-5 transition-shadow hover:shadow-md", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
          <p className="mt-2 text-2xl font-semibold tabular tracking-tight">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        {Icon && (
          <div className={cn("h-9 w-9 shrink-0 rounded-md flex items-center justify-center", ACCENT_RING[accent])}>
            <Icon className="h-4.5 w-4.5" />
          </div>
        )}
      </div>
      {typeof delta === "number" && (
        <div className="mt-3 flex items-center gap-1.5 text-xs">
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium",
              positive ? "bg-success-soft text-success" : "bg-danger-soft text-danger"
            )}
          >
            {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(delta).toFixed(1)}%
          </span>
          <span className="text-muted-foreground">vs last period</span>
        </div>
      )}
    </Card>
  );
}
