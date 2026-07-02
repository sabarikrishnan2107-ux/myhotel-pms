# Hall Reservation Calendar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Gantt-style Hall Reservation Calendar at `/halls/calendar` (halls as rows, days as columns, booking blocks colored by status), reachable from the sidebar and from the Hall Booking list page.

**Architecture:** A new pure-logic module (`src/lib/hall-calendar.ts`) handles day-span positioning and lane-stacking math, unit-tested with vitest. The existing detail/modify/cancel/payment UI, currently private to `halls/page.tsx`, is extracted into a shared component file so both the list page and the new calendar page render identical dialogs. The calendar page itself is a new route that fetches the same two endpoints (`/hall-packages`, `/hall-bookings`) the list page already uses, with its own toolbar, KPI strip, and timeline grid modeled on the existing Room Reservation Calendar (`calendar/page.tsx`).

**Tech Stack:** Next.js App Router (`luxe-pms/src/app/(app)/...`), React 19, TypeScript, Tailwind, vitest (node environment — no component/DOM tests in this repo; UI correctness is verified manually).

## Global Constraints

- No backend/API changes — both endpoints already exist and already return the fields needed (`hall-bookings` resource now includes `eventName`/`endDate` per the in-flight migrations).
- No drag-to-move or drag-to-resize of calendar blocks — display + double-click only, matching the Room Reservation Calendar.
- No changes to Modify/Cancel/Receive-payment/Mark-completed business logic — only where those components live.
- No persistence of calendar filter state across sessions.
- Match existing code style: no comments except where they explain a non-obvious WHY; Tailwind utility classes consistent with the surrounding file; no new abstractions beyond what's specified.
- Run `npx tsc --noEmit` (from `luxe-pms/`) after every code task; it must be clean before moving on.

---

### Task 1: Pure hall-calendar positioning/lane/utilization helpers

**Files:**
- Create: `luxe-pms/src/lib/hall-calendar.ts`
- Test: `luxe-pms/src/lib/hall-calendar.test.ts`

**Interfaces:**
- Consumes: nothing (pure functions, no app imports).
- Produces (all exported from `@/lib/hall-calendar`, consumed by Task 3):
  - `computeHallBlock(booking: {date: string; endDate?: string}, windowStart: Date): {startCol: number; span: number}`
  - `isHallBlockInWindow(position: {startCol: number; span: number}, days: number): boolean`
  - `assignHallLanes(blocks: {id: string; startCol: number; span: number}[]): {laneOf: Map<string, number>; laneCount: number}`
  - `hallUtilizationPct(bookedHallDays: number, hallCount: number, days: number): number`

- [ ] **Step 1: Write the failing tests**

Create `luxe-pms/src/lib/hall-calendar.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { computeHallBlock, isHallBlockInWindow, assignHallLanes, hallUtilizationPct } from "@/lib/hall-calendar";

describe("computeHallBlock", () => {
  const windowStart = new Date("2026-07-01T00:00:00");

  it("positions a same-day booking as a 1-day-wide block at its offset", () => {
    expect(computeHallBlock({ date: "2026-07-03" }, windowStart)).toEqual({ startCol: 2, span: 1 });
  });

  it("spans multiple days inclusive of both date and endDate", () => {
    expect(computeHallBlock({ date: "2026-07-03", endDate: "2026-07-05" }, windowStart)).toEqual({ startCol: 2, span: 3 });
  });

  it("treats an endDate equal to date the same as no endDate", () => {
    expect(computeHallBlock({ date: "2026-07-03", endDate: "2026-07-03" }, windowStart)).toEqual({ startCol: 2, span: 1 });
  });

  it("ignores an endDate before date (defensive against bad data)", () => {
    expect(computeHallBlock({ date: "2026-07-03", endDate: "2026-07-01" }, windowStart)).toEqual({ startCol: 2, span: 1 });
  });

  it("allows a negative startCol for a booking that starts before the window", () => {
    expect(computeHallBlock({ date: "2026-06-28" }, windowStart).startCol).toBe(-3);
  });
});

describe("isHallBlockInWindow", () => {
  it("is true when the block overlaps the window", () => {
    expect(isHallBlockInWindow({ startCol: 2, span: 1 }, 7)).toBe(true);
  });
  it("is true for a block that starts before the window but still overlaps it", () => {
    expect(isHallBlockInWindow({ startCol: -2, span: 5 }, 7)).toBe(true);
  });
  it("is false for a block entirely before the window", () => {
    expect(isHallBlockInWindow({ startCol: -5, span: 2 }, 7)).toBe(false);
  });
  it("is false for a block entirely after the window", () => {
    expect(isHallBlockInWindow({ startCol: 10, span: 2 }, 7)).toBe(false);
  });
});

describe("assignHallLanes", () => {
  it("puts non-overlapping back-to-back bookings in the same lane", () => {
    const { laneOf, laneCount } = assignHallLanes([
      { id: "a", startCol: 0, span: 1 },
      { id: "b", startCol: 1, span: 1 },
    ]);
    expect(laneOf.get("a")).toBe(0);
    expect(laneOf.get("b")).toBe(0);
    expect(laneCount).toBe(1);
  });

  it("stacks overlapping bookings into separate lanes", () => {
    const { laneOf, laneCount } = assignHallLanes([
      { id: "a", startCol: 0, span: 3 },
      { id: "b", startCol: 1, span: 2 },
    ]);
    expect(laneOf.get("a")).toBe(0);
    expect(laneOf.get("b")).toBe(1);
    expect(laneCount).toBe(2);
  });

  it("reuses a freed lane once its booking ends", () => {
    // a: day 0 only. b: days 0-1 (overlaps a). c: day 1 only (overlaps b, but
    // not a, since a already ended by day 1) — c should reuse a's lane.
    const { laneOf, laneCount } = assignHallLanes([
      { id: "a", startCol: 0, span: 1 },
      { id: "b", startCol: 0, span: 2 },
      { id: "c", startCol: 1, span: 1 },
    ]);
    expect(laneOf.get("a")).toBe(0);
    expect(laneOf.get("b")).toBe(1);
    expect(laneOf.get("c")).toBe(0);
    expect(laneCount).toBe(2);
  });
});

describe("hallUtilizationPct", () => {
  it("computes booked hall-days over hall-day capacity", () => {
    expect(hallUtilizationPct(6, 3, 7)).toBe(29); // 6 / 21 = 28.57% -> rounds to 29
  });
  it("returns 0 when there is no capacity in view", () => {
    expect(hallUtilizationPct(0, 0, 7)).toBe(0);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run (from `luxe-pms/`): `npm test -- hall-calendar`
Expected: FAIL — `Cannot find module '@/lib/hall-calendar'` (the module doesn't exist yet).

- [ ] **Step 3: Write the implementation**

Create `luxe-pms/src/lib/hall-calendar.ts`:

```ts
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- hall-calendar`
Expected: PASS — all 11 tests green.

- [ ] **Step 5: Commit**

```bash
git add luxe-pms/src/lib/hall-calendar.ts luxe-pms/src/lib/hall-calendar.test.ts
git commit -m "feat(luxe-pms): add pure hall-calendar positioning/lane helpers"
```

---

### Task 2: Extract the hall detail drawer + dialogs into a shared component

**Files:**
- Create: `luxe-pms/src/app/(app)/halls/_components/hall-dialogs.tsx`
- Modify: `luxe-pms/src/app/(app)/halls/page.tsx` (top-of-file imports/types/consts, and remove the moved functions from the bottom of the file)

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces (exported from `./_components/hall-dialogs`, consumed by `halls/page.tsx` in this task and by Task 3):
  - Components: `HallDetailDrawer`, `ModifyHallDialog`, `ReceivePaymentDialog`, `CancelHallDialog` (same props as today, unchanged).
  - `STATUS_TONE: Record<HallBooking["status"], "success" | "warning" | "info" | "danger" | "neutral">`
  - `type Hall`, `type HallStatus`, `type HallBooking`, `type HallOverride`

This is a pure extraction — no behavior changes. There is no dedicated test for this task; correctness is verified by `tsc --noEmit` staying clean and, in Task 5, by manually confirming `/halls` behaves identically to before.

- [ ] **Step 1: Create the shared dialogs file**

Create `luxe-pms/src/app/(app)/halls/_components/hall-dialogs.tsx` with this exact content (moved verbatim from `halls/page.tsx`, with `eventName` added to `HallBooking` since the API now returns it):

```tsx
"use client";
import * as React from "react";
import {
  Building2, Users, Clock, Calendar, X, CheckCircle2, AlertTriangle,
  Edit, Printer, Ban, Wallet, Sparkles, Mail, MessageCircle, Phone,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { HALLS, HALL_BOOKINGS } from "@/lib/mock-data-ext";
import { money, cn, formatDate } from "@/lib/utils";
import { apiGet } from "@/lib/api";
import { computeHallTotals, hoursBetween, crossesMidnight, dayMultiplier } from "@/lib/hall-pricing";

// Hour-only slots — must match the new-booking form so re-pricing on modify
// keys off the same whole-hour slot tiers (≥5h half-day, ≥9h full-day).
export const TIME_SLOTS = ["01:00", "02:00", "03:00", "04:00", "05:00", "06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00"];
// Venue shape the modify dialog needs to re-price a booking.
type VenueRates = { name: string; capacity: number; hourly: number; halfDay: number; fullDay: number; setupFee: number; gst: number; extraPaxFee: number };

export type Hall = typeof HALLS[number];
export type HallStatus = "confirmed" | "pending" | "in-progress" | "completed" | "cancelled";
export type HallBooking = Omit<typeof HALL_BOOKINGS[number], "status"> & { status: HallStatus; notes?: string; email?: string; endDate?: string; eventName?: string };

export const STATUS_TONE: Record<HallBooking["status"] | "cancelled" | "completed", "success" | "warning" | "info" | "danger" | "neutral"> = {
  confirmed: "success",
  pending: "warning",
  "in-progress": "info",
  cancelled: "danger",
  completed: "neutral",
};

export type HallOverride = {
  date?: string; endDate?: string; start?: string; end?: string;
  guests?: number; package?: string; status?: HallBooking["status"];
  notes?: string; advance?: number; total?: number; eventName?: string;
};

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between"><span className="text-muted-foreground">{label}</span><span className="tabular font-medium">{value}</span></div>;
}

// ===================== DETAIL DRAWER =====================
export function HallDetailDrawer({ booking, notes, onClose, onModify, onCancel, onPay, onComplete }: {
  booking: HallBooking; notes: string; onClose: () => void; onModify: () => void; onCancel: () => void;
  onPay: () => void; onComplete: () => void;
}) {
  const [halls, setHalls] = React.useState<Hall[]>([]);
  React.useEffect(() => { apiGet<Hall[]>("/hall-packages").then(r => setHalls(r.map(h => ({ ...h, id: String(h.id) })))).catch(() => {}); }, []);
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  const balance = booking.total - booking.advance;
  const hall = halls.find(h => h.name === booking.hall);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs" onClick={onClose} aria-hidden />
      <aside className="fixed top-0 right-0 z-50 h-svh w-full sm:w-[520px] lg:w-[600px] bg-surface border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right-2">
        <div className="px-5 py-4 border-b border-border bg-linear-to-br from-brand-soft/40 via-surface to-accent-soft/20 flex items-start gap-3">
          <span className="h-12 w-12 rounded-md bg-brand-soft text-brand-soft-foreground inline-flex items-center justify-center shrink-0">
            <Building2 className="h-6 w-6" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Hall booking · {booking.id.toUpperCase()}</p>
            <h2 className="text-xl font-semibold truncate">{booking.eventName || booking.customer}</h2>
            <p className="text-xs text-muted-foreground truncate">{booking.customer} · {booking.phone}{booking.email ? ` · ${booking.email}` : ""}</p>
          </div>
          <button type="button" onClick={onClose} className="h-8 w-8 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Booking summary */}
          <div className="rounded-md border border-border p-4 space-y-2">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <DetailRow icon={Building2} label="Hall" value={booking.hall} sub={hall ? `Up to ${hall.capacity}` : ""} />
              <DetailRow icon={Users} label="Guests" value={`${booking.guests}`} sub={`Package: ${booking.package}`} />
              <DetailRow icon={Calendar} label="Date" value={booking.endDate && booking.endDate !== booking.date ? `${formatDate(booking.date)} → ${formatDate(booking.endDate)}` : formatDate(booking.date)} />
              <DetailRow icon={Clock} label="Time" value={`${booking.start} → ${booking.end}${crossesMidnight(booking.start, booking.end) ? " (+1 day)" : ""}`} sub={`${getHours(booking.start, booking.end)} h`} />
            </div>
          </div>

          {/* Package details */}
          <Section title="Package">
            <div className="rounded-md border border-border p-3 space-y-1.5 text-sm">
              <Row label="Selected" value={booking.package} />
              <Row label="Per guest" value={money(Math.round(booking.total / booking.guests))} />
            </div>
          </Section>

          {/* Money */}
          <Section title="Payment summary">
            <div className="rounded-md border border-border p-3 space-y-1.5 text-sm">
              <Row label="Total" value={money(booking.total)} />
              <Row label="Advance received" value={money(booking.advance)} />
              <div className="border-t border-border pt-1.5 mt-1.5 flex items-center justify-between">
                <span className={cn("font-semibold", balance > 0 ? "text-warning" : "text-success")}>
                  {balance > 0 ? "Balance due" : "Settled"}
                </span>
                <span className={cn("text-base font-semibold tabular", balance > 0 ? "text-warning" : "text-success")}>
                  {balance > 0 ? money(balance) : money(0)}
                </span>
              </div>
            </div>
          </Section>

          {/* Special notes */}
          <Section title="Special instructions / setup notes">
            {notes ? (
              <div className="rounded-md bg-warning-soft/40 border border-warning/30 p-3 text-sm leading-relaxed">
                <p className="inline-flex items-center gap-1.5 text-warning text-[11px] font-semibold uppercase tracking-wider mb-1.5">
                  <AlertTriangle className="h-3 w-3" />Visible to F&amp;B + Banquet setup team
                </p>
                <p className="whitespace-pre-wrap">{notes}</p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">No special instructions on file. Click <span className="text-foreground font-medium">Modify</span> to add.</p>
            )}
          </Section>

          {/* Status */}
          <Section title="Status">
            <Badge tone={STATUS_TONE[booking.status]}>{booking.status}</Badge>
          </Section>
        </div>

        {/* Footer */}
        <div className="border-t border-border p-3 space-y-2">
          {booking.status !== "cancelled" && booking.status !== "completed" && (
            <div className="grid grid-cols-2 gap-2">
              <Button variant="success" size="sm" onClick={onPay} disabled={booking.total - booking.advance <= 0}>
                <Wallet className="h-3.5 w-3.5" />{booking.total - booking.advance > 0 ? "Receive payment" : "Fully paid"}
              </Button>
              <Button variant="outline" size="sm" onClick={onComplete} disabled={booking.status === "pending" || booking.total - booking.advance > 0} title={booking.total - booking.advance > 0 ? `Clear balance first (${money(booking.total - booking.advance)} due)` : undefined}>
                <CheckCircle2 className="h-3.5 w-3.5" />Mark completed
              </Button>
            </div>
          )}
          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" size="sm" onClick={onModify} disabled={booking.status === "cancelled"}>
              <Edit className="h-3.5 w-3.5" />Modify
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-3.5 w-3.5" />BEO sheet
            </Button>
            <Button variant="danger" size="sm" onClick={onCancel} disabled={booking.status === "cancelled" || booking.status === "completed"}>
              <Ban className="h-3.5 w-3.5" />Cancel
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-semibold mb-2">{title}</p>
      {children}
    </div>
  );
}

function DetailRow({ icon: Icon, label, value, sub }: { icon: typeof Building2; label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="h-7 w-7 rounded-md bg-surface-sunken text-muted-foreground inline-flex items-center justify-center shrink-0"><Icon className="h-3.5 w-3.5" /></span>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
        <p className="text-sm font-semibold leading-tight mt-0.5 truncate">{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground truncate">{sub}</p>}
      </div>
    </div>
  );
}

function getHours(start: string, end: string) {
  return hoursBetween(start, end);
}

// ===================== MODIFY DIALOG =====================
export function ModifyHallDialog({ booking, notes, onClose, onSave }: {
  booking: HallBooking; notes: string; onClose: () => void; onSave: (patch: HallOverride) => void;
}) {
  const [draft, setDraft] = React.useState({
    eventName: booking.eventName ?? "",
    date: booking.date,
    endDate: booking.endDate ?? booking.date,
    start: booking.start,
    end: booking.end,
    guests: booking.guests,
    package: booking.package,
    status: booking.status as HallBooking["status"],
    notes: notes,
    total: booking.total,
  });

  // Master data for live re-pricing: the booking's venue rates + banquet prices.
  const [pkgs, setPkgs] = React.useState<{ name: string; pricePerPax: number }[]>([]);
  const [venues, setVenues] = React.useState<VenueRates[]>([]);
  React.useEffect(() => {
    apiGet<{ name: string; pricePerPax: number }[]>("/banquet-packages").then(setPkgs).catch(() => {});
    apiGet<VenueRates[]>("/hall-packages").then(setVenues).catch(() => {});
  }, []);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  const set = <K extends keyof typeof draft>(k: K, v: typeof draft[K]) => setDraft(d => ({ ...d, [k]: v }));
  const todayISO = new Date().toLocaleDateString("en-CA"); // blocks past dates on event date
  const valid = draft.eventName.trim() !== "" && draft.guests >= 1 && draft.total >= 0;

  // Live re-price from venue rates + package + guests + slot — same formula as the
  // new-booking form, so editing guests/package/time no longer leaves a stale total.
  // Stored bookings don't keep the à-la-carte extras, so this excludes them; the
  // total stays editable for staff to add those back or apply a special rate.
  // end <= start wraps into the next day (e.g. 20:00→02:00 = 6h).
  const venue = venues.find(v => v.name === booking.hall);
  const draftCrossesMidnight = crossesMidnight(draft.start, draft.end);
  const hours = hoursBetween(draft.start, draft.end);
  const slotType: "hourly" | "halfDay" | "fullDay" = hours >= 9 ? "fullDay" : hours >= 5 ? "halfDay" : "hourly";
  const draftDayMult = dayMultiplier(draft.date, draft.endDate, draftCrossesMidnight);
  const hallCost = (venue ? (slotType === "fullDay" ? venue.fullDay : slotType === "halfDay" ? venue.halfDay : venue.hourly * hours) : 0) * draftDayMult;
  const pkgPrice = pkgs.find(p => p.name === draft.package)?.pricePerPax ?? 0;
  const extraPax = (venue && draft.guests > venue.capacity ? draft.guests - venue.capacity : 0) * draftDayMult;
  const reprice = venue
    ? computeHallTotals({ hallCost, setupFee: venue.setupFee, foodCost: pkgPrice * draft.guests * draftDayMult, extrasCost: 0, extraPax, extraPaxFee: venue.extraPaxFee, gstPct: venue.gst }).total
    : null;
  const repriceDiffers = reprice != null && reprice !== draft.total;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <Card className="pointer-events-auto w-full max-w-xl p-0 animate-in shadow-xl overflow-hidden">
          <div className="px-5 py-4 bg-surface-elevated border-b border-border flex items-center gap-3">
            <span className="h-10 w-10 rounded-md bg-brand-soft text-brand-soft-foreground inline-flex items-center justify-center shrink-0">
              <Edit className="h-5 w-5" />
            </span>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">Modify hall booking</h3>
              <p className="text-xs text-muted-foreground truncate">{booking.eventName || booking.customer} · {booking.hall}</p>
            </div>
            <button type="button" onClick={onClose} className="h-8 w-8 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
          </div>

          <div className="px-5 py-4 space-y-4 max-h-[65vh] overflow-y-auto">
            <div className="space-y-1.5">
              <Label className="text-xs">Event name</Label>
              <Input value={draft.eventName} onChange={e => set("eventName", e.target.value)} placeholder="e.g. Sabari's Wedding" className="h-9" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Start date</Label>
                <Input
                  type="date" value={draft.date} min={todayISO}
                  onChange={e => setDraft(d => ({ ...d, date: e.target.value, endDate: d.endDate < e.target.value ? e.target.value : d.endDate }))}
                  className="h-9 tabular"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">End date</Label>
                <Input type="date" value={draft.endDate} min={draft.date} onChange={e => set("endDate", e.target.value < draft.date ? draft.date : e.target.value)} className="h-9 tabular" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Start time</Label>
                <Select value={draft.start} onChange={e => set("start", e.target.value)} className="h-9 tabular">
                  {!TIME_SLOTS.includes(draft.start) && <option value={draft.start}>{draft.start}</option>}
                  {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">End time</Label>
                <Select value={draft.end} onChange={e => set("end", e.target.value)} className="h-9 tabular">
                  {!TIME_SLOTS.includes(draft.end) && <option value={draft.end}>{draft.end}</option>}
                  {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                </Select>
              </div>
            </div>

            <div className="rounded-md bg-surface-sunken/40 border border-border p-3 text-xs flex items-center justify-between">
              <span className="text-muted-foreground">Duration</span>
              <span className="font-semibold tabular">
                {hours} hours{draftCrossesMidnight ? " · ends next day" : ""}
                {draftDayMult > 1 ? ` · spans ${draftDayMult} days (×${draftDayMult} charges)` : ""}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Guest count</Label>
                <Input type="number" min={1} value={draft.guests} onChange={e => set("guests", Number(e.target.value))} className="h-9 tabular" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Package</Label>
                <Select value={draft.package} onChange={e => set("package", e.target.value)} className="h-9">
                  {draft.package && !pkgs.some(p => p.name === draft.package) && <option value={draft.package}>{draft.package}</option>}
                  {pkgs.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                </Select>
              </div>
            </div>

            {/* Re-priced total — editing guests / package / time recomputes this so the
                balance and revenue never go stale. Editable for extras / special rates. */}
            <div className="rounded-md border border-border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Total (₹)</Label>
                {repriceDiffers && (
                  <button type="button" onClick={() => set("total", reprice!)} className="text-[11px] font-medium text-brand hover:underline inline-flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />Apply re-priced {money(reprice!)}
                  </button>
                )}
              </div>
              <Input type="number" min={0} value={draft.total} onChange={e => set("total", Math.max(0, Number(e.target.value)))} className="h-9 tabular" />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {venue
                  ? <>Re-priced: {slotType === "fullDay" ? "full-day" : slotType === "halfDay" ? "half-day" : `${hours}h`} · {draft.guests} pax{extraPax > 0 ? ` (+${extraPax} over capacity)` : ""} = <span className="font-medium tabular text-foreground">{money(reprice ?? 0)}</span>{repriceDiffers ? ` · current ${money(draft.total)}` : " · matches current"}. Excludes à-la-carte add-on services.</>
                  : <>Couldn&apos;t find venue &ldquo;{booking.hall}&rdquo; to re-price — total stays editable.</>}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Booking status</Label>
              <Select value={draft.status} onChange={e => set("status", e.target.value as HallBooking["status"])} className="h-9">
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </Select>
            </div>

            {/* SPECIAL NOTES */}
            <div className="space-y-1.5 pt-3 border-t border-border">
              <Label htmlFor="notes" className="text-xs">
                <Sparkles className="h-3 w-3 inline mr-1 text-brand" />Special instructions / guest requests
              </Label>
              <textarea
                id="notes"
                value={draft.notes}
                onChange={e => set("notes", e.target.value)}
                placeholder="e.g. White tablecloths · Stage backdrop with floral arch · Vegan menu only · Sound check at 17:00 · No nuts in any dish · Birthday cake at 21:30 with sparkler …"
                rows={4}
                maxLength={600}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm placeholder:text-subtle-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 outline-hidden resize-y min-h-[96px]"
              />
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Forwarded to F&amp;B, banquet setup, and AV teams.</span>
                <span className="tabular">{draft.notes.length} / 600</span>
              </div>
            </div>
          </div>

          <div className="px-5 py-3 border-t border-border bg-surface-elevated flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button onClick={() => onSave(draft)} disabled={!valid} variant="success"><CheckCircle2 className="h-4 w-4" />Save changes</Button>
          </div>
        </Card>
      </div>
    </>
  );
}

// ===================== RECEIVE PAYMENT DIALOG =====================
export function ReceivePaymentDialog({ booking, onClose, onConfirm }: {
  booking: HallBooking; onClose: () => void; onConfirm: (amount: number, mode: string) => void;
}) {
  const balance = Math.max(0, booking.total - booking.advance);
  const [amount, setAmount] = React.useState(balance);
  const [mode, setMode] = React.useState("Cash");
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);
  const valid = amount > 0 && amount <= balance;
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <Card className="pointer-events-auto w-full max-w-md p-0 animate-in shadow-xl overflow-hidden">
          <div className="px-5 py-4 bg-surface-elevated border-b border-border flex items-center gap-3">
            <span className="h-10 w-10 rounded-md bg-success-soft text-success inline-flex items-center justify-center shrink-0"><Wallet className="h-5 w-5" /></span>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">Receive payment</h3>
              <p className="text-xs text-muted-foreground truncate">{booking.eventName || booking.customer} · {booking.hall}</p>
            </div>
            <button type="button" onClick={onClose} className="h-8 w-8 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
          </div>
          <div className="px-5 py-4 space-y-4">
            <div className="rounded-md border border-border p-3 space-y-1.5 text-sm">
              <Row label="Total" value={money(booking.total)} />
              <Row label="Already received" value={money(booking.advance)} />
              <div className="border-t border-border pt-1.5 mt-1.5 flex items-center justify-between">
                <span className="font-semibold text-warning">Balance due</span>
                <span className="text-base font-semibold tabular text-warning">{money(balance)}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Amount (₹)</Label>
                <Input type="number" min={1} max={balance} value={amount} onChange={e => setAmount(Math.min(balance, Math.max(0, Number(e.target.value))))} className="h-9 tabular" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Mode</Label>
                <Select value={mode} onChange={e => setMode(e.target.value)} className="h-9">
                  <option>Cash</option><option>Card</option><option>UPI</option><option>Bank</option><option>Online</option>
                </Select>
              </div>
            </div>
            <div className="flex gap-1.5">
              {[25, 50, 100].map(p => (
                <button key={p} type="button" onClick={() => setAmount(Math.round(balance * p / 100))} className="flex-1 h-8 rounded-md border border-border text-xs font-medium hover:bg-surface-sunken transition-colors">{p === 100 ? "Full" : `${p}%`}</button>
              ))}
            </div>
          </div>
          <div className="px-5 py-3 border-t border-border bg-surface-elevated flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button variant="success" disabled={!valid} onClick={() => onConfirm(amount, mode)}><CheckCircle2 className="h-4 w-4" />Record payment</Button>
          </div>
        </Card>
      </div>
    </>
  );
}

// ===================== CANCEL DIALOG =====================
export function CancelHallDialog({ booking, onClose, onConfirm }: {
  booking: HallBooking; onClose: () => void; onConfirm: (reason: string, refund: number) => void;
}) {
  const [reason, setReason] = React.useState("Client cancellation");
  const [notify, setNotify] = React.useState({ email: true, whatsapp: true, sms: false });
  const [confirmText, setConfirmText] = React.useState("");

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  // Tiered refund based on days-until-event, relative to today's real date.
  // Parse "today" from a YYYY-MM-DD string so it matches how booking.date is
  // parsed (both land on UTC midnight) and the day diff stays exact.
  const today = new Date(new Date().toLocaleDateString("en-CA"));
  const ev = new Date(booking.date);
  const daysUntil = Math.floor((ev.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  let refundPct = 100;
  let policyNote = "Full refund — > 14 days before event";
  if (daysUntil < 0) { refundPct = 0; policyNote = "No refund — event date passed"; }
  else if (daysUntil < 3) { refundPct = 0; policyNote = "No refund — within 3 days of event"; }
  else if (daysUntil < 7) { refundPct = 25; policyNote = "25% refund — within 7 days of event"; }
  else if (daysUntil < 14) { refundPct = 50; policyNote = "50% refund — within 14 days of event"; }

  const refund = Math.round(booking.advance * (refundPct / 100));
  const valid = confirmText.trim().toUpperCase() === "CANCEL";

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <Card className="pointer-events-auto w-full max-w-md p-0 animate-in shadow-xl overflow-hidden">
          <div className="px-5 py-4 bg-danger-soft border-b border-danger/20 flex items-center gap-3">
            <span className="h-10 w-10 rounded-md bg-danger text-white inline-flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">Cancel hall booking</h3>
              <p className="text-xs text-muted-foreground truncate">{booking.eventName || booking.customer} · {booking.hall}</p>
            </div>
            <button type="button" onClick={onClose} className="h-8 w-8 rounded-md hover:bg-white/40 inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
          </div>

          <div className="px-5 py-4 space-y-4">
            <div className="rounded-md border border-border p-3 text-sm space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Event</span>
                <span className="font-medium">{formatDate(booking.date)} · {booking.start} → {booking.end}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Guests</span>
                <span className="font-medium tabular">{booking.guests}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Advance paid</span>
                <span className="font-medium tabular">{money(booking.advance)}</span>
              </div>
            </div>

            <div className={cn(
              "rounded-md border p-3 text-sm space-y-1.5",
              refundPct >= 50 ? "border-warning/40 bg-warning-soft/40" : "border-danger/40 bg-danger-soft/40"
            )}>
              <p className="text-xs font-semibold uppercase tracking-wider">Hall cancellation policy</p>
              <p className="text-[11px]">{policyNote} ({daysUntil >= 0 ? `${daysUntil} days until event` : `event passed`})</p>
              <div className="flex items-center justify-between pt-1.5 border-t border-current/15">
                <span className="text-xs">Refund to client</span>
                <span className="text-base font-semibold tabular">{money(refund)} <span className="text-[10px] opacity-70">({refundPct}%)</span></span>
              </div>
            </div>

            <div className="rounded-md bg-warning-soft/40 border border-warning/30 p-3 text-xs flex items-start gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-warning">{booking.hall} slot will be released</p>
                <p className="text-muted-foreground mt-0.5">F&amp;B / catering linked to this booking will also be voided.</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Cancellation reason</Label>
              <Select value={reason} onChange={e => setReason(e.target.value)} className="h-9">
                <option>Client cancellation</option>
                <option>Insufficient guests</option>
                <option>Payment failed</option>
                <option>Event postponed</option>
                <option>Force majeure</option>
                <option>Other</option>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px]">Notify customer via</Label>
              <div className="flex flex-wrap gap-1.5">
                {([
                  { id: "email", label: "Email", icon: Mail },
                  { id: "whatsapp", label: "WhatsApp", icon: MessageCircle },
                  { id: "sms", label: "SMS", icon: Phone },
                ] as const).map(c => {
                  const on = notify[c.id];
                  const Icon = c.icon;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setNotify(n => ({ ...n, [c.id]: !n[c.id] }))}
                      className={cn(
                        "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border text-xs font-medium transition-colors",
                        on ? "bg-brand-soft border-brand text-brand-soft-foreground" : "border-border text-muted-foreground hover:bg-surface-sunken"
                      )}
                    >
                      <Icon className="h-3 w-3" />{c.label}{on && <CheckCircle2 className="h-3 w-3" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Type <span className="font-mono font-semibold">CANCEL</span> to confirm</Label>
              <Input
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                placeholder="CANCEL"
                className={cn("h-9 font-mono tabular", valid && "border-success")}
              />
            </div>
          </div>

          <div className="px-5 py-3 border-t border-border bg-surface-elevated flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>Keep booking</Button>
            <Button onClick={() => onConfirm(reason, refund)} disabled={!valid} variant="danger">
              <Ban className="h-4 w-4" />Cancel booking
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Update `halls/page.tsx` imports and type/const definitions**

Replace the file's header block — everything from the top through the closing of `HallOverride` (i.e. from `"use client";` down to the line before `export default function HallsPage() {`) — with:

```tsx
"use client";
import * as React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Plus, Search, Calendar, Users, Building2,
  Eye, Edit, Ban, MoreHorizontal, CheckCircle2,
  Mail, MessageCircle, IndianRupee, Printer, FileText,
  Wallet, LayoutGrid, List,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { KPICard } from "@/components/ui/kpi-card";
import { money, cn, formatDate } from "@/lib/utils";
import { apiGet, apiPut, apiPost } from "@/lib/api";
import {
  HallDetailDrawer, ModifyHallDialog, ReceivePaymentDialog, CancelHallDialog,
  STATUS_TONE, type Hall, type HallBooking, type HallOverride,
} from "./_components/hall-dialogs";
```

This removes the now-relocated `TIME_SLOTS`/`VenueRates`/`Hall`/`HallStatus`/`HallBooking`/`STATUS_TONE`/`HallOverride` definitions and the `HALLS`/`HALL_BOOKINGS`/`computeHallTotals`/`hoursBetween`/`crossesMidnight`/`dayMultiplier`/`Label` imports that were only needed by the moved code, and drops the now-unused icons (`Clock`, `X`, `AlertTriangle`, `Phone`, `Sparkles`). `Users`, `LayoutGrid`, and `List` stay imported here because the card view (added by a separate, already-applied change to this file) uses them in code this task does not touch — the middle of `HallsPage`'s function body (table, card view, filters, KPI bar) is untouched by this step; only the top import/type block and the bottom extracted functions move.

- [ ] **Step 3: Remove the moved functions from the bottom of `halls/page.tsx`**

Delete everything from the `function Row({ label, value })` definition through the end of the file (the `CancelHallDialog` function and its closing brace) — i.e. everything after the closing `</div>\n  );\n}` of `HallsPage` itself. Nothing replaces it; the file now ends with `HallsPage`'s closing brace.

- [ ] **Step 4: Verify no other reference in `halls/page.tsx` was missed**

Run: `cd luxe-pms && npx tsc --noEmit`
Expected: no errors referencing `halls/page.tsx`. If there are unresolved-name errors, they name exactly which symbol still needs to come from the new import line — add it to the `hall-dialogs` import.

- [ ] **Step 5: Run the existing test suite to confirm nothing else broke**

Run: `cd luxe-pms && npm test`
Expected: PASS — all existing suites (including Task 1's new `hall-calendar.test.ts`) still green; this extraction touches no pure-logic module they cover.

- [ ] **Step 6: Commit**

```bash
git add luxe-pms/src/app/\(app\)/halls/_components/hall-dialogs.tsx luxe-pms/src/app/\(app\)/halls/page.tsx
git commit -m "refactor(luxe-pms): extract hall detail drawer + dialogs into a shared component"
```

---

### Task 3: Build the Hall Reservation Calendar page

**Files:**
- Create: `luxe-pms/src/app/(app)/halls/calendar/page.tsx`

**Interfaces:**
- Consumes:
  - From Task 1 (`@/lib/hall-calendar`): `computeHallBlock`, `isHallBlockInWindow`, `assignHallLanes`, `hallUtilizationPct`.
  - From Task 2 (`../_components/hall-dialogs`): `HallDetailDrawer`, `ModifyHallDialog`, `ReceivePaymentDialog`, `CancelHallDialog`, `STATUS_TONE`, `type Hall`, `type HallBooking`, `type HallOverride`.
- Produces: the `/halls/calendar` route (default-exported `HallCalendarPage`), consumed by Task 4's links.

No automated test for this task (no component-test harness in this repo — `vitest.config.ts` runs in `environment: "node"`); correctness is verified via `tsc --noEmit` here and manual browser verification in Task 5.

- [ ] **Step 1: Create the page**

Create `luxe-pms/src/app/(app)/halls/calendar/page.tsx`:

```tsx
"use client";
import * as React from "react";
import Link from "next/link";
import {
  ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, MousePointerClick,
  Building2, Users, IndianRupee, Wallet,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { KPICard } from "@/components/ui/kpi-card";
import { cn, money } from "@/lib/utils";
import { apiGet, apiPut, apiPost } from "@/lib/api";
import { computeHallBlock, isHallBlockInWindow, assignHallLanes, hallUtilizationPct } from "@/lib/hall-calendar";
import {
  HallDetailDrawer, ModifyHallDialog, ReceivePaymentDialog, CancelHallDialog,
  type Hall, type HallBooking, type HallOverride,
} from "../_components/hall-dialogs";

const CELL_W = 80;
const ROW_H = 56;
const LANE_H = 28;
const LABEL_W = 200;
const VIEW_SPANS = { Day: 1, Week: 7, "2 Weeks": 14, Month: 30 } as const;
type ViewSpan = keyof typeof VIEW_SPANS;

interface CalBlock {
  id: string;
  hallName: string;
  label: string;
  start: string;
  end: string;
  status: HallBooking["status"];
  startCol: number;
  span: number;
}

// Window anchor: a few days before today, matching the Room Reservation
// Calendar's default so recent/in-progress events show with lead-in.
function defaultWindowStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - 3);
  return d;
}

const STATUS_BG: Record<HallBooking["status"], string> = {
  pending: "bg-warning/15 border-warning/40",
  confirmed: "bg-success/15 border-success/40",
  "in-progress": "bg-info/15 border-info/40",
  completed: "bg-muted-foreground/10 border-border",
  cancelled: "bg-danger/10 border-danger/30",
};
const STATUS_BAR: Record<HallBooking["status"], string> = {
  pending: "bg-warning",
  confirmed: "bg-success",
  "in-progress": "bg-info",
  completed: "bg-muted-foreground",
  cancelled: "bg-danger",
};

export default function HallCalendarPage() {
  const [startDate, setStartDate] = React.useState(defaultWindowStart);
  const [selected, setSelected] = React.useState<HallBooking | null>(null);
  const [modifyTarget, setModifyTarget] = React.useState<HallBooking | null>(null);
  const [cancelTarget, setCancelTarget] = React.useState<HallBooking | null>(null);
  const [payTarget, setPayTarget] = React.useState<HallBooking | null>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2800); };

  // Live halls + bookings — sourced entirely from Postgres, same endpoints
  // the Hall Booking list page uses.
  const [halls, setHalls] = React.useState<Hall[]>([]);
  const [bookings, setBookings] = React.useState<HallBooking[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  React.useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiGet<Hall[]>("/hall-packages"),
      apiGet<HallBooking[]>("/hall-bookings"),
    ])
      .then(([hs, bk]) => {
        if (cancelled) return;
        setHalls(hs.map(h => ({ ...h, id: String(h.id) })));
        setBookings(bk.map(b => ({ ...b, id: String(b.id) })));
      })
      .catch(() => { if (!cancelled) setError("Couldn't reach the backend. Check that the API is running."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Local mutations mirror halls/page.tsx exactly, so Modify/Cancel/Pay/Complete
  // behave identically from either screen.
  const [cancelledIds, setCancelledIds] = React.useState<Set<string>>(new Set());
  const [overrides, setOverrides] = React.useState<Record<string, HallOverride>>({});

  const effective = React.useMemo(() => {
    return bookings.map(b => {
      const ov = overrides[b.id] ?? {};
      return {
        ...b,
        ...ov,
        status: cancelledIds.has(b.id) ? "cancelled" as const : (ov.status ?? b.status),
      };
    });
  }, [bookings, overrides, cancelledIds]);

  const handleModify = (b: HallBooking, patch: HallOverride) => {
    setOverrides(o => ({ ...o, [b.id]: { ...(o[b.id] ?? {}), ...patch } }));
    apiPut(`/hall-bookings/${b.id}`, patch).catch(() => showToast("Could not save changes"));
    setModifyTarget(null);
    showToast(`${b.customer} updated`);
  };
  const handleCancel = (b: HallBooking, reason: string, refund: number) => {
    setCancelledIds(c => new Set([...c, b.id]));
    apiPut(`/hall-bookings/${b.id}`, { status: "cancelled" }).catch(() => showToast("Could not cancel"));
    setCancelTarget(null);
    showToast(`${b.customer} cancelled · ${money(refund)} refund processed (${reason})`);
  };
  const handleComplete = (b: HallBooking) => {
    const balance = b.total - b.advance;
    if (balance > 0) { showToast(`⚠ Cannot complete — ${money(balance)} balance still outstanding`); return; }
    setOverrides(o => ({ ...o, [b.id]: { ...(o[b.id] ?? {}), status: "completed" } }));
    apiPut(`/hall-bookings/${b.id}`, { status: "completed" }).catch(() => showToast("Could not update status"));
    showToast(`${b.customer} marked completed`);
  };
  const handlePayment = (b: HallBooking, amount: number, mode: string) => {
    const amt = Math.max(0, Math.round(amount));
    const newAdvance = Math.min(b.total, b.advance + amt);
    setOverrides(o => ({ ...o, [b.id]: { ...(o[b.id] ?? {}), advance: newAdvance } }));
    apiPut(`/hall-bookings/${b.id}`, { advance: newAdvance }).catch(() => showToast("Could not save payment"));
    apiPost("/folio-payments", {
      bookingNo: `HALL-${b.id}`,
      date: new Date().toLocaleDateString("en-CA"),
      mode,
      reference: `Hall · ${b.hall}`,
      amount: amt,
    }).catch(() => { /* trail is best-effort; the advance update is the source of truth */ });
    setPayTarget(null);
    showToast(`${money(amt)} received from ${b.customer} · balance ${money(Math.max(0, b.total - newAdvance))}`);
  };

  // Toolbar state
  const [hallFilter, setHallFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<"all" | HallBooking["status"]>("all");
  const [showCancelled, setShowCancelled] = React.useState(false);
  const [viewSpan, setViewSpan] = React.useState<ViewSpan>("2 Weeks");
  const DAYS = VIEW_SPANS[viewSpan];

  const days = React.useMemo(() => {
    return Array.from({ length: DAYS }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [startDate, DAYS]);

  const blocks: CalBlock[] = React.useMemo(() => {
    return effective.flatMap(b => {
      if (b.status === "cancelled" && !showCancelled) return [];
      const { startCol, span } = computeHallBlock(b, startDate);
      return [{
        id: b.id,
        hallName: b.hall,
        label: b.eventName || b.customer,
        start: b.start,
        end: b.end,
        status: b.status,
        startCol,
        span,
      }];
    });
  }, [effective, startDate, showCancelled]);

  const visibleBlocks = React.useMemo(() => {
    return blocks.filter(b => {
      if (hallFilter !== "all" && b.hallName !== hallFilter) return false;
      if (statusFilter !== "all" && b.status !== statusFilter) return false;
      return true;
    });
  }, [blocks, hallFilter, statusFilter]);

  const sortedHalls = React.useMemo(() => [...halls].sort((a, b) => a.name.localeCompare(b.name)), [halls]);

  // KPI computation — across the visible window, excluding cancelled
  // bookings even when "Show cancelled" is on (matches the list page's
  // revenue/outstanding totals, which always exclude cancelled).
  const inViewBlocks = React.useMemo(
    () => visibleBlocks.filter(b => isHallBlockInWindow(b, DAYS) && b.status !== "cancelled"),
    [visibleBlocks, DAYS],
  );
  const bookedHallDays = inViewBlocks.reduce((t, b) => t + Math.min(b.startCol + b.span, DAYS) - Math.max(b.startCol, 0), 0);
  const utilizationPct = hallUtilizationPct(bookedHallDays, sortedHalls.length, DAYS);
  const inViewBookings = React.useMemo(() => {
    const ids = new Set(inViewBlocks.map(b => b.id));
    return effective.filter(b => ids.has(b.id));
  }, [inViewBlocks, effective]);
  const guestsInView = inViewBookings.reduce((t, b) => t + b.guests, 0);
  const revenueInView = inViewBookings.reduce((t, b) => t + b.total, 0);
  const outstandingInView = inViewBookings.reduce((t, b) => t + Math.max(0, b.total - b.advance), 0);

  const moveDays = (delta: number) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + delta);
    setStartDate(d);
  };

  const openBooking = (id: string) => {
    const b = effective.find(x => x.id === id);
    if (b) setSelected(b);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-medium tracking-tight">Hall Reservation Calendar</h1>
          <p className="text-muted-foreground text-sm mt-1">
            At-a-glance view of every hall booking across the window · <span className="font-medium text-foreground">double-click an event</span> for the full booking
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/halls"><Button variant="outline">Hall Booking List</Button></Link>
          <Link href="/halls/new"><Button><Plus className="h-4 w-4" />New Hall Booking</Button></Link>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2.5">
        <KPICard label="Events" value={inViewBookings.length} icon={CalendarIcon} accent="brand" hint={`in ${DAYS}-day window`} />
        <KPICard label="Guests" value={guestsInView} icon={Users} accent="info" hint="across visible events" />
        <KPICard label="Utilization" value={`${utilizationPct}%`} icon={Building2} accent={utilizationPct >= 60 ? "success" : utilizationPct >= 30 ? "accent" : "warning"} hint="of hall-days in window" />
        <KPICard label="Revenue" value={money(revenueInView)} icon={IndianRupee} accent="success" hint="in window" />
        <KPICard label="Outstanding" value={money(outstandingInView)} icon={Wallet} accent="warning" hint="in window" />
      </div>

      {/* Toolbar */}
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center rounded-md border border-border">
            <button onClick={() => moveDays(-DAYS)} className="h-9 px-2 hover:bg-surface-sunken inline-flex items-center justify-center border-r border-border" title={`Previous ${DAYS} days`}><ChevronLeft className="h-4 w-4" /></button>
            <span className="px-3 text-sm font-medium tabular whitespace-nowrap">
              {days[0].toLocaleDateString(undefined, { day: "2-digit", month: "short" })} → {days[DAYS - 1].toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })}
            </span>
            <button onClick={() => moveDays(DAYS)} className="h-9 px-2 hover:bg-surface-sunken inline-flex items-center justify-center border-l border-border" title={`Next ${DAYS} days`}><ChevronRight className="h-4 w-4" /></button>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setStartDate(defaultWindowStart())}>
            <CalendarIcon className="h-3.5 w-3.5" /> Today
          </Button>
          <div className="relative">
            <CalendarIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-subtle-foreground pointer-events-none" />
            <Input
              type="date"
              value={startDate.toISOString().slice(0, 10)}
              onChange={e => setStartDate(new Date(e.target.value))}
              className="h-9 pl-8 w-[160px] tabular text-xs"
              title="Jump to date"
            />
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Select value={hallFilter} onChange={e => setHallFilter(e.target.value)} className="h-9 w-auto" title="Hall">
              <option value="all">All halls</option>
              {sortedHalls.map(h => <option key={h.id} value={h.name}>{h.name}</option>)}
            </Select>
            <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value as typeof statusFilter)} className="h-9 w-auto" title="Status">
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
            </Select>
            <Select value={viewSpan} onChange={e => setViewSpan(e.target.value as ViewSpan)} className="h-9 w-auto" title="View span">
              {(Object.keys(VIEW_SPANS) as ViewSpan[]).map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
            <label className="inline-flex items-center gap-1.5 h-9 px-2 text-xs text-muted-foreground cursor-pointer">
              <input type="checkbox" checked={showCancelled} onChange={e => setShowCancelled(e.target.checked)} className="h-3.5 w-3.5 rounded border-border text-brand focus:ring-ring" />
              Show cancelled
            </label>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-3 text-xs">
          <LegendChip color="bg-warning" label="Pending" />
          <LegendChip color="bg-success" label="Confirmed" />
          <LegendChip color="bg-info" label="In progress" />
          <LegendChip color="bg-muted-foreground" label="Completed" />
          <span className="text-subtle-foreground ml-auto inline-flex items-center gap-1.5">
            <MousePointerClick className="h-3.5 w-3.5" />
            <span><span className="text-foreground font-medium">Double-click an event</span> for the full booking</span>
          </span>
        </div>
      </Card>

      {/* Backend status banners — the board is sourced live from Postgres */}
      {error && (
        <Card className="p-3 border-danger/40 bg-danger/10 text-sm text-danger">{error}</Card>
      )}
      {loading && !error && (
        <Card className="p-3 text-sm text-muted-foreground inline-flex items-center gap-2">
          <span className="h-3.5 w-3.5 rounded-full border-2 border-brand border-t-transparent animate-spin" />
          Loading hall bookings from the backend…
        </Card>
      )}
      {!loading && !error && sortedHalls.length === 0 && (
        <Card className="p-6 text-sm text-muted-foreground text-center">
          No halls found. Add venues in Configuration → Food &amp; Hall Packages to populate the calendar.
        </Card>
      )}

      {/* Timeline */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <div style={{ width: LABEL_W + DAYS * CELL_W, minWidth: "100%" }}>
            {/* Header row */}
            <div className="flex sticky top-0 bg-surface-elevated z-10 border-b border-border">
              <div style={{ width: LABEL_W }} className="px-4 py-2 border-r border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Hall
              </div>
              {days.map((d, i) => {
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                const isToday = d.toDateString() === new Date().toDateString();
                return (
                  <div
                    key={i}
                    style={{ width: CELL_W }}
                    className={cn(
                      "flex flex-col items-center justify-center py-1.5 border-r border-border",
                      isWeekend && "bg-surface-sunken/40",
                      isToday && "bg-brand-soft"
                    )}
                  >
                    <span className={cn("text-[10px] uppercase tracking-wider", isToday ? "text-brand-soft-foreground font-semibold" : "text-muted-foreground")}>
                      {d.toLocaleDateString(undefined, { weekday: "short" })}
                    </span>
                    <span className={cn("text-sm tabular font-medium", isToday ? "text-brand-soft-foreground" : "text-foreground")}>
                      {d.getDate()}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Rows */}
            <div>
              {sortedHalls.map(hall => {
                const hallBlocks = visibleBlocks.filter(
                  b => b.hallName === hall.name && isHallBlockInWindow(b, DAYS),
                );
                const { laneOf, laneCount } = assignHallLanes(hallBlocks);
                const rowHeight = Math.max(ROW_H, laneCount * LANE_H + 8);
                const stackTop = (rowHeight - laneCount * LANE_H) / 2;
                return (
                  <div
                    key={hall.id}
                    className="flex border-b border-border transition-colors hover:bg-surface-sunken/30"
                    style={{ height: rowHeight }}
                  >
                    <div
                      style={{ width: LABEL_W }}
                      className="px-4 flex items-center gap-2 border-r border-border bg-surface-elevated/50"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{hall.name}</p>
                        <p className="text-[10px] text-muted-foreground">Up to {hall.capacity}</p>
                      </div>
                    </div>
                    <div className="relative flex-1 overflow-hidden" style={{ height: rowHeight }}>
                      {/* Day grid — display only */}
                      <div className="absolute inset-0 flex">
                        {days.map((d, i) => {
                          const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                          const isToday = d.toDateString() === new Date().toDateString();
                          return (
                            <div
                              key={i}
                              style={{ width: CELL_W }}
                              className={cn("border-r border-border", isWeekend && "bg-surface-sunken/30", isToday && "bg-brand-soft/30")}
                            />
                          );
                        })}
                      </div>

                      {/* Blocks — whole-day spans. Double-click to open the full booking. Display only — no drag. */}
                      {hallBlocks.map(b => {
                        const left = b.startCol * CELL_W;
                        const w = b.span * CELL_W - 4;
                        const top = stackTop + (laneOf.get(b.id) ?? 0) * LANE_H;
                        return (
                          <div
                            key={b.id}
                            onDoubleClick={(e) => { e.stopPropagation(); openBooking(b.id); }}
                            className={cn(
                              "absolute rounded-md border text-left overflow-hidden hover:shadow-md hover:z-10 transition-shadow cursor-pointer select-none",
                              STATUS_BG[b.status],
                              b.status === "cancelled" && "opacity-60"
                            )}
                            style={{ left, width: w, top, height: LANE_H - 4 }}
                            title={`${b.label} · ${b.hallName} · ${b.status}\nDouble-click to view full booking`}
                          >
                            <div className={cn("absolute left-0 top-0 bottom-0 w-0.5", STATUS_BAR[b.status])} />
                            <div className="h-full flex items-center gap-1 pl-2.5 pr-1.5 pointer-events-none">
                              <p className={cn("text-[11px] font-medium leading-none truncate", b.status === "cancelled" && "line-through")}>{b.label}</p>
                              {w >= 140 && (
                                <span className="ml-auto text-[9px] text-muted-foreground tabular shrink-0 leading-none">
                                  {b.start} → {b.end}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      {/* Detail drawer + dialogs — shared with the Hall Booking list page */}
      {selected && (
        <HallDetailDrawer
          booking={selected}
          notes={overrides[selected.id]?.notes ?? ""}
          onClose={() => setSelected(null)}
          onModify={() => { setModifyTarget(selected); setSelected(null); }}
          onCancel={() => { setCancelTarget(selected); setSelected(null); }}
          onPay={() => { setPayTarget(selected); setSelected(null); }}
          onComplete={() => { handleComplete(selected); setSelected(null); }}
        />
      )}
      {payTarget && (
        <ReceivePaymentDialog
          booking={payTarget}
          onClose={() => setPayTarget(null)}
          onConfirm={(amount, mode) => handlePayment(payTarget, amount, mode)}
        />
      )}
      {modifyTarget && (
        <ModifyHallDialog
          booking={modifyTarget}
          notes={overrides[modifyTarget.id]?.notes ?? ""}
          onClose={() => setModifyTarget(null)}
          onSave={(patch) => handleModify(modifyTarget, patch)}
        />
      )}
      {cancelTarget && (
        <CancelHallDialog
          booking={cancelTarget}
          onClose={() => setCancelTarget(null)}
          onConfirm={(reason, refund) => handleCancel(cancelTarget, reason, refund)}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-foreground text-background rounded-lg px-4 py-3 text-sm shadow-2xl animate-in slide-in-from-bottom-2 inline-flex items-center gap-2.5 ring-1 ring-foreground/20">
          <span className="font-medium">{toast}</span>
        </div>
      )}
    </div>
  );
}

function LegendChip({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
      <span className={cn("h-2 w-2 rounded-full", color)} />
      {label}
    </span>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `cd luxe-pms && npx tsc --noEmit`
Expected: clean — no errors in `halls/calendar/page.tsx`.

- [ ] **Step 3: Commit**

```bash
git add luxe-pms/src/app/\(app\)/halls/calendar/page.tsx
git commit -m "feat(luxe-pms): add Hall Reservation Calendar page"
```

---

### Task 4: Wire up entry points — sidebar nav + list-page button

**Files:**
- Modify: `luxe-pms/src/lib/nav.ts:38` (insert new entry right after the existing `/halls` entry, which is currently at line 48 — see step 1 for the exact anchor)
- Modify: `luxe-pms/src/app/(app)/halls/page.tsx` (header button row)

**Interfaces:**
- Consumes: the `/halls/calendar` route produced by Task 3.
- Produces: nothing further consumed by later tasks (this is the final wiring task).

- [ ] **Step 1: Add the sidebar nav entry**

In `luxe-pms/src/lib/nav.ts`, find this line (currently line 48):

```ts
  { href: "/halls", label: "Hall Booking", icon: Building2, group: "operations", module: "banquets" },
```

Replace it with:

```ts
  { href: "/halls", label: "Hall Booking", icon: Building2, group: "operations", module: "banquets" },
  { href: "/halls/calendar", label: "Hall Calendar", icon: CalendarRange, group: "operations", module: "banquets" },
```

(`CalendarRange` is already imported at the top of `nav.ts` — it's the icon used by the `/calendar` and `/fb/beo` entries — so no import changes are needed.)

- [ ] **Step 2: Add the "Reservation Calendar" button on the Hall Booking list page**

In `luxe-pms/src/app/(app)/halls/page.tsx`, find:

```tsx
        <Link href="/halls/new"><Button><Plus className="h-4 w-4" />New Hall Booking</Button></Link>
      </div>
```

(this is the header button row, right under the `<h1>Hall Booking</h1>` block) and replace it with:

```tsx
        <div className="flex gap-2">
          <Link href="/halls/calendar"><Button variant="outline">Reservation Calendar</Button></Link>
          <Link href="/halls/new"><Button><Plus className="h-4 w-4" />New Hall Booking</Button></Link>
        </div>
      </div>
```

- [ ] **Step 3: Type-check**

Run: `cd luxe-pms && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add luxe-pms/src/lib/nav.ts luxe-pms/src/app/\(app\)/halls/page.tsx
git commit -m "feat(luxe-pms): link the Hall Reservation Calendar from the sidebar and hall list"
```

---

### Task 5: End-to-end manual verification

**Files:** none (verification only).

**Interfaces:**
- Consumes: the full feature from Tasks 1–4.
- Produces: nothing (terminal task).

- [ ] **Step 1: Run the full automated check**

Run: `cd luxe-pms && npm test && npx tsc --noEmit`
Expected: both clean.

- [ ] **Step 2: Start both servers**

Run (from the repo root, in PowerShell): `powershell -ExecutionPolicy Bypass -File start-dev.ps1`
Expected: two new windows open — backend on `http://localhost:8000`, frontend on `http://localhost:3000`. Wait until both report ready (the frontend window shows "Ready" from Next.js).

- [ ] **Step 3: Manually verify the calendar page**

In a browser, log in (`admin@hotel.com` / `password123`) and:
1. Click "Hall Calendar" in the sidebar → confirm it navigates to `/halls/calendar` and highlights in the sidebar.
2. Confirm the KPI strip and timeline render without the error banner (if there are no seeded hall bookings, seed one via "New Hall Booking" first).
3. Confirm each hall booking appears as a block on its correct hall row, spanning the correct day(s), colored by its status, matching the legend.
4. If two bookings share a hall on overlapping days, confirm they render in separate stacked lanes rather than on top of each other.
5. Change the Hall filter, Status filter, and View span — confirm the grid and KPI strip update accordingly.
6. Toggle "Show cancelled" — confirm cancelled bookings (if any) appear faded with a strikethrough label, and disappear when toggled off.
7. Double-click a block → confirm the same detail drawer used on `/halls` opens, and Modify / Cancel / Receive payment / Mark completed all work and persist (re-check the block/KPIs update after each action).
8. Navigate to `/halls` and click "Reservation Calendar" → confirm it opens `/halls/calendar`.

- [ ] **Step 4: Confirm the extraction didn't regress the list page**

On `/halls`: confirm the table renders, search/filters work, and View / Modify / Cancel / More-menu (Print BEO / Email / WhatsApp / Receive payment / Mark completed) all behave exactly as before Task 2's refactor.

- [ ] **Step 5: Stop the dev servers**

Close the two PowerShell windows opened in Step 2 (or hand control back to the user if they're supervising).

No commit for this task — it's verification only.
