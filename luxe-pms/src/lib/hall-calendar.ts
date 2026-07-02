// Pure day-span positioning math for the Hall Reservation Calendar.
// Framework-free (node-testable) — generalizes the Room Reservation
// Calendar's inline lane-stacking (calendar/page.tsx) to whole-day spans,
// since hall bookings aren't nightly stays with a fixed noon boundary.

const DAY_MS = 86_400_000;

export interface HallBlockInput {
  date: string;
  endDate?: string;
}

export interface HallBlockPosition {
  startCol: number;
  span: number;
}

// startCol = day offset of `date` from windowStart (can be negative — the
// booking started before the visible window). span = inclusive day count
// from `date` through `endDate` (defaults to `date` when absent or not
// after the start date), minimum 1.
export function computeHallBlock(booking: HallBlockInput, windowStart: Date): HallBlockPosition {
  const base = new Date(windowStart);
  base.setHours(0, 0, 0, 0);
  const start = new Date(booking.date);
  start.setHours(0, 0, 0, 0);
  const startCol = Math.round((start.getTime() - base.getTime()) / DAY_MS);

  const endDate = booking.endDate && booking.endDate > booking.date ? booking.endDate : booking.date;
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  const span = Math.max(1, Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1);

  return { startCol, span };
}

// True when a block positioned at [startCol, startCol + span) overlaps the
// visible [0, days) window at all — blocks entirely before or after it can
// be skipped when rendering.
export function isHallBlockInWindow(position: HallBlockPosition, days: number): boolean {
  return position.startCol < days && position.startCol + position.span > 0;
}

export interface HallLaneInput {
  id: string;
  startCol: number;
  span: number;
}

export interface HallLanes {
  laneOf: Map<string, number>;
  laneCount: number;
}

// Greedy interval partitioning: stacks a hall's overlapping bookings into
// separate horizontal lanes so none render on top of each other. A booking
// ending on day N and the next starting on day N+1 do NOT overlap (half-open
// intervals), so back-to-back bookings share a lane.
export function assignHallLanes(blocks: HallLaneInput[]): HallLanes {
  const sorted = [...blocks].sort(
    (a, b) => a.startCol - b.startCol || (a.startCol + a.span) - (b.startCol + b.span),
  );
  const laneEnds: number[] = [];
  const laneOf = new Map<string, number>();
  for (const b of sorted) {
    let lane = laneEnds.findIndex(end => b.startCol >= end);
    if (lane === -1) { lane = laneEnds.length; laneEnds.push(0); }
    laneOf.set(b.id, lane);
    laneEnds[lane] = b.startCol + b.span;
  }
  return { laneOf, laneCount: Math.max(1, laneEnds.length) };
}

// Hall-utilization % — the calendar's analog of the room calendar's
// occupancy %: booked hall-days over the visible window's total hall-day
// capacity.
export function hallUtilizationPct(bookedHallDays: number, hallCount: number, days: number): number {
  const capacity = hallCount * days;
  return capacity > 0 ? Math.round((bookedHallDays / capacity) * 100) : 0;
}
