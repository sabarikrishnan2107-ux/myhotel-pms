"use client";
import * as React from "react";
import type { Room, RoomStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const DOT_BG: Record<RoomStatus, string> = {
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

interface Props {
  rooms: Room[];
  className?: string;
}

/** A compact floor-by-floor heatmap of room status — each room is a small clickable dot.
 *  Hover for room # + status, click to open the room rack pre-filtered. */
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
      {byFloor.map(([floor, list]) => (
        <div key={floor} className="flex items-center gap-2">
          <span className="w-6 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold tabular shrink-0">
            F{floor}
          </span>
          <div className="flex flex-wrap gap-1 flex-1">
            {list
              .sort((a, b) => Number(a.number) - Number(b.number))
              .map(r => (
                <span
                  key={r.id}
                  title={`Room ${r.number} · ${r.type} · ${r.status}`}
                  className={cn(
                    "h-3.5 w-3.5 rounded-sm transition-transform hover:scale-150 hover:z-10 relative cursor-pointer",
                    DOT_BG[r.status]
                  )}
                />
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
