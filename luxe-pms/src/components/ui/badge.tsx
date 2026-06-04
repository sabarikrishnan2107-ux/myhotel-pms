import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { RoomStatus, PaymentStatus } from "@/lib/types";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      tone: {
        neutral: "bg-surface-sunken text-muted-foreground",
        brand: "bg-brand-soft text-brand-soft-foreground",
        success: "bg-success-soft text-success",
        warning: "bg-warning-soft text-warning",
        danger: "bg-danger-soft text-danger",
        info: "bg-info-soft text-info",
        accent: "bg-accent-soft text-accent",
      },
    },
    defaultVariants: { tone: "neutral" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

const STATUS_STYLE: Record<RoomStatus, { label: string; bg: string; text: string; dot: string }> = {
  available:        { label: "Available",       bg: "bg-status-available-soft",       text: "text-status-available",       dot: "bg-status-available" },
  reserved:         { label: "Reserved",        bg: "bg-status-reserved-soft",        text: "text-status-reserved",        dot: "bg-status-reserved" },
  occupied:         { label: "Occupied",        bg: "bg-status-occupied-soft",        text: "text-status-occupied",        dot: "bg-status-occupied" },
  dirty:            { label: "Dirty",           bg: "bg-status-dirty-soft",           text: "text-status-dirty",           dot: "bg-status-dirty" },
  cleaning:         { label: "Cleaning",        bg: "bg-status-cleaning-soft",        text: "text-status-cleaning",        dot: "bg-status-cleaning" },
  inspected:        { label: "Inspected",       bg: "bg-status-inspected-soft",       text: "text-status-inspected",       dot: "bg-status-inspected" },
  ready:            { label: "Ready",           bg: "bg-status-ready-soft",           text: "text-status-ready",           dot: "bg-status-ready" },
  maintenance:      { label: "Maintenance",     bg: "bg-status-maintenance-soft",     text: "text-status-maintenance",     dot: "bg-status-maintenance" },
  blocked:          { label: "Blocked",         bg: "bg-status-blocked-soft",         text: "text-status-blocked",         dot: "bg-status-blocked" },
  "checkout-pending": { label: "Checkout Pending", bg: "bg-status-checkout-pending-soft", text: "text-status-checkout-pending", dot: "bg-status-checkout-pending" },
};

export function StatusBadge({ status, withDot = true, className }: { status: RoomStatus; withDot?: boolean; className?: string }) {
  const s = STATUS_STYLE[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium", s.bg, s.text, className)}>
      {withDot && <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />}
      {s.label}
    </span>
  );
}

export function statusStripe(status: RoomStatus) {
  return STATUS_STYLE[status].dot;
}

const PAYMENT_TONE: Record<PaymentStatus, "success" | "warning" | "danger" | "neutral"> = {
  paid: "success",
  partial: "warning",
  unpaid: "danger",
  refunded: "neutral",
};

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  const labels: Record<PaymentStatus, string> = {
    paid: "Paid",
    partial: "Partial",
    unpaid: "Unpaid",
    refunded: "Refunded",
  };
  return <Badge tone={PAYMENT_TONE[status]}>{labels[status]}</Badge>;
}
