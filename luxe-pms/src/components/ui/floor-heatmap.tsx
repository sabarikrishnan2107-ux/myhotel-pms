"use client";
import * as React from "react";
import type { Room, RoomStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_BG: Record<RoomStatus, string> = {
  available: "bg-status-available",
  ready: "bg-status-ready",
  reserved: "bg-status-reserved",
  occupied: "bg-status-occupied",
  dirty: "bg-status-dirty",
  cleaning: "bg-status-cleaning",
  inspected: "bg-status-inspected",
  maintenance: "bg-status-maintenance",
  blocked: "bg-status-blocked",
  "checkout-pending": "bg-status-checkout-pending",
};

// Fixed left-to-right segment order so every floor's bar reads consistently.
const STATUS_ORDER: RoomStatus[] = [
  "occupied", "available", "dirty", "cleaning", "inspected",
  "maintenance", "reserved", "blocked", "checkout-pending", "ready",
];

const STATUS_LABEL: Record<RoomStatus, string> = {
  available: "Available",
  ready: "Ready",
  reserved: "Reserved",
  occupied: "Occupied",
  dirty: "Dirty",
  cleaning: "Cleaning",
  inspected: "Inspected",
  maintenance: "Maintenance",
  blocked: "Blocked",
  "checkout-pending": "Checkout pending",
};

interface Props {
  rooms: Room[];
  className?: string;
}

/** Floor-by-floor room status as a horizontal stacked bar per floor — each
 *  segment's width is proportional to the number of rooms in that status.
 *  Hover a segment for its status + count. */
export function FloorHeatmap({ rooms, className }: Props) {
  // Group by floor (descending — top floor first)
  const byFloor = React.useMemo(() => {
    const m = new Map<number, Room[]>();
    for (const r of rooms) {
      if (!m.has(r.floor)) m.set(r.floor, []);
      m.get(r.floor)!.push(r);
    }
    return Array.from(m.entries()).sort((a, b) => b[0] - a[0]);
  }, [rooms]);

  return (
    <div className={cn("space-y-1.5", className)}>
      {byFloor.map(([floor, list]) => {
        const counts = list.reduce<Partial<Record<RoomStatus, number>>>((acc, r) => {
          acc[r.status] = (acc[r.status] ?? 0) + 1;
          return acc;
        }, {});
        const segments = STATUS_ORDER
          .map(status => ({ status, count: counts[status] ?? 0 }))
          .filter(seg => seg.count > 0);
        return (
          <div key={floor} className="flex items-center gap-2">
            <span className="w-6 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold tabular shrink-0">
              F{floor}
            </span>
            <div className="flex-1 flex h-4 rounded-sm overflow-hidden bg-surface-sunken">
              {segments.map(seg => (
                <div
                  key={seg.status}
                  title={`${STATUS_LABEL[seg.status]} · ${seg.count}`}
                  style={{ flexGrow: seg.count, minWidth: 3 }}
                  className={cn("h-full transition-opacity hover:opacity-80 cursor-default", STATUS_BG[seg.status])}
                />
              ))}
            </div>
            <span className="w-5 text-[10px] text-muted-foreground tabular text-right shrink-0">
              {list.length}
            </span>
          </div>
        );
      })}
    </div>
  );
}
