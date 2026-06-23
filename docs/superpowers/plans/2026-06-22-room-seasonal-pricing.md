# Room Seasonal Pricing — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Price each night of a room booking from configured Seasons (`/seasons`) and Holidays (`/holidays`) instead of hardcoded multipliers + date list; keep a fixed weekend uplift.

**Architecture:** A pure `room-nightly-pricing.ts` helper (same return shape as the existing `nightlyBreakdown`) computes per-night rates with season × weekend × holiday-surcharge stacking; `bookings/new` fetches seasons/holidays and calls it.

**Tech Stack:** Next.js 16 / React 19 / TS, vitest (node env). No backend change.

## Global Constraints

- Frontend `luxe-pms/` (run `npm` from there). Frontend tests are node-env pure-logic only; UI verified via `npx tsc --noEmit` + `npm run lint` + `npm run build`.
- Reuse `apiGet` from `@/lib/api`. Helper must be framework-free and date-deterministic (use UTC day/date methods so tests pass in any timezone).
- Preserve the existing breakdown return shape `{ counts:{weekday,weekend,holiday}, total, lines:[{date,kind,rate}], avgRate }` so the summary UI (`bookings/new` ~lines 484–489, 924) needs no change.

---

### Task 1: Pure helper `room-nightly-pricing.ts`

**Files:**
- Create: `luxe-pms/src/lib/room-nightly-pricing.ts`
- Test: `luxe-pms/src/lib/room-nightly-pricing.test.ts`

**Interfaces:**
- Produces: `interface Season { from: string; to: string; multiplier: number }`;
  `interface Holiday { date: string; surchargePct: number }`;
  `type NightKind = "weekday" | "weekend" | "holiday"`;
  `interface NightLine { date: Date; kind: NightKind; rate: number }`;
  `interface NightlyBreakdown { counts: { weekday: number; weekend: number; holiday: number }; total: number; lines: NightLine[]; avgRate: number }`;
  `buildNightlyBreakdown(checkInISO: string, nights: number, baseRate: number, seasons: Season[], holidays: Holiday[], weekendMultiplier?: number): NightlyBreakdown`.

- [ ] **Step 1: Write the failing test**

Create `luxe-pms/src/lib/room-nightly-pricing.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildNightlyBreakdown } from "@/lib/room-nightly-pricing";

// Fixed reference (UTC): 2026-01-01 = Thu, 01-02 = Fri, 01-03 = Sat, 01-05 = Mon.
const noSeasons: never[] = [];
const noHols: never[] = [];

describe("buildNightlyBreakdown", () => {
  it("plain weekday = base, kind weekday", () => {
    const b = buildNightlyBreakdown("2026-01-05", 1, 1000, noSeasons, noHols);
    expect(b.total).toBe(1000);
    expect(b.lines[0].kind).toBe("weekday");
  });
  it("weekend (Fri) = base × weekend multiplier", () => {
    const b = buildNightlyBreakdown("2026-01-02", 1, 1000, noSeasons, noHols);
    expect(b.total).toBe(1200);
    expect(b.lines[0].kind).toBe("weekend");
  });
  it("season multiplier applies on a weekday", () => {
    const seasons = [{ from: "2026-01-01", to: "2026-01-31", multiplier: 1.5 }];
    const b = buildNightlyBreakdown("2026-01-05", 1, 1000, seasons, noHols);
    expect(b.total).toBe(1500);
    expect(b.lines[0].kind).toBe("weekday");
  });
  it("holiday surcharge applies, kind holiday", () => {
    const hols = [{ date: "2026-01-05", surchargePct: 30 }];
    const b = buildNightlyBreakdown("2026-01-05", 1, 1000, noSeasons, hols);
    expect(b.total).toBe(1300);
    expect(b.lines[0].kind).toBe("holiday");
  });
  it("season and holiday STACK (season × (1+surcharge))", () => {
    const seasons = [{ from: "2026-01-01", to: "2026-01-31", multiplier: 1.5 }];
    const hols = [{ date: "2026-01-05", surchargePct: 30 }];
    const b = buildNightlyBreakdown("2026-01-05", 1, 1000, seasons, hols);
    expect(b.total).toBe(1950); // 1000 × 1.5 × 1.3
  });
  it("weekend uplift is suppressed on a holiday that falls on a weekend", () => {
    const hols = [{ date: "2026-01-02", surchargePct: 30 }]; // Friday
    const b = buildNightlyBreakdown("2026-01-02", 1, 1000, noSeasons, hols);
    expect(b.total).toBe(1300); // not 1000 × 1.2 × 1.3
    expect(b.lines[0].kind).toBe("holiday");
  });
  it("multi-night counts and totals (Thu + Fri)", () => {
    const b = buildNightlyBreakdown("2026-01-01", 2, 1000, noSeasons, noHols);
    expect(b.total).toBe(2200); // 1000 (Thu) + 1200 (Fri)
    expect(b.counts).toEqual({ weekday: 1, weekend: 1, holiday: 0 });
    expect(b.avgRate).toBe(1100);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- room-nightly-pricing`
Expected: FAIL — cannot resolve `@/lib/room-nightly-pricing`.

- [ ] **Step 3: Implement the helper**

Create `luxe-pms/src/lib/room-nightly-pricing.ts`:

```ts
// Pure nightly room pricing from configured Seasons + Holidays, with a fixed
// weekend uplift. Framework-free and timezone-deterministic (UTC date math) so
// it unit-tests reliably. Returns the same shape the booking summary already uses.

export interface Season { from: string; to: string; multiplier: number }
export interface Holiday { date: string; surchargePct: number }
export type NightKind = "weekday" | "weekend" | "holiday";
export interface NightLine { date: Date; kind: NightKind; rate: number }
export interface NightlyBreakdown {
  counts: { weekday: number; weekend: number; holiday: number };
  total: number;
  lines: NightLine[];
  avgRate: number;
}

export function buildNightlyBreakdown(
  checkInISO: string,
  nights: number,
  baseRate: number,
  seasons: Season[],
  holidays: Holiday[],
  weekendMultiplier = 1.2,
): NightlyBreakdown {
  const lines: NightLine[] = [];
  const counts = { weekday: 0, weekend: 0, holiday: 0 };
  let total = 0;
  const base = Number(baseRate) || 0;

  for (let i = 0; i < nights; i++) {
    const d = new Date(`${checkInISO}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + i);
    const iso = d.toISOString().slice(0, 10);

    const holiday = holidays.find(h => h.date === iso);
    const season = seasons.find(s => iso >= s.from && iso <= s.to);
    const seasonMult = season ? (Number(season.multiplier) || 1) : 1;
    const isWeekend = d.getUTCDay() === 5 || d.getUTCDay() === 6; // Fri/Sat
    const surcharge = holiday ? (Number(holiday.surchargePct) || 0) : 0;
    const weekendFactor = isWeekend && !holiday ? weekendMultiplier : 1;

    const kind: NightKind = holiday ? "holiday" : isWeekend ? "weekend" : "weekday";
    const rate = Math.round(base * seasonMult * weekendFactor * (1 + surcharge / 100));

    counts[kind] += 1;
    total += rate;
    lines.push({ date: d, kind, rate });
  }

  return { counts, total, lines, avgRate: nights ? Math.round(total / nights) : 0 };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- room-nightly-pricing`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add luxe-pms/src/lib/room-nightly-pricing.ts luxe-pms/src/lib/room-nightly-pricing.test.ts
git commit -m "feat(bookings): pure nightly pricing helper (seasons + holidays + weekend)"
```

---

### Task 2: Rewire `bookings/new` to use Seasons & Holidays

**Files:**
- Modify: `luxe-pms/src/app/(app)/bookings/new/page.tsx`

**Interfaces:** Consumes `buildNightlyBreakdown` + `type Season`/`type Holiday` from `@/lib/room-nightly-pricing`; `/seasons`, `/holidays`.

- [ ] **Step 1: Replace the hardcoded pricing block with an import + constant**

In `luxe-pms/src/app/(app)/bookings/new/page.tsx`, delete the block at lines ~20–53 — the
`PRICING_MULTIPLIERS` const, the `HOLIDAY_DATES` set, the `classifyDay` function, and the
local `nightlyBreakdown` function — and replace it with:

```tsx
import { buildNightlyBreakdown, type Season, type Holiday } from "@/lib/room-nightly-pricing";

// Weekend uplift has no Setup field (Seasons/Holidays do) — kept as a fixed default.
const WEEKEND_MULTIPLIER = 1.2;
```

(Put the `import` with the other top-of-file imports; keep `WEEKEND_MULTIPLIER` near where the constants were.)

- [ ] **Step 2: Fetch seasons + holidays**

Next to the existing `/room-types` fetch effect (~line 109), add state + a fetch:

```tsx
  const [seasons, setSeasons] = React.useState<Season[]>([]);
  const [holidays, setHolidays] = React.useState<Holiday[]>([]);
  React.useEffect(() => {
    apiGet<Array<Season & { active?: boolean }>>("/seasons")
      .then(r => Array.isArray(r) && setSeasons(r.filter(s => s.active !== false).map(s => ({ from: s.from, to: s.to, multiplier: Number(s.multiplier) || 1 }))))
      .catch(() => {});
    apiGet<Array<{ date: string; surchargePct?: number }>>("/holidays")
      .then(r => Array.isArray(r) && setHolidays(r.map(h => ({ date: h.date, surchargePct: Number(h.surchargePct) || 0 }))))
      .catch(() => {});
  }, []);
```

- [ ] **Step 3: Call the helper in the breakdown memo**

Replace the `breakdown` memo (line ~229):
```tsx
  const breakdown = React.useMemo(() => nightlyBreakdown(checkIn, nights, rate), [checkIn, nights, rate]);
```
with:
```tsx
  const breakdown = React.useMemo(
    () => buildNightlyBreakdown(checkIn, nights, rate, seasons, holidays, WEEKEND_MULTIPLIER),
    [checkIn, nights, rate, seasons, holidays],
  );
```

- [ ] **Step 4: Typecheck + lint + build**

Run (from `luxe-pms/`): `npx tsc --noEmit` → exit 0; `npm run lint` → no new errors in the file; `npm run build` → succeeds (KEY GATE: confirms no dangling `PRICING_MULTIPLIERS`/`HOLIDAY_DATES`/`classifyDay`/`nightlyBreakdown` references remain).

- [ ] **Step 5: Commit**

```bash
git add "luxe-pms/src/app/(app)/bookings/new/page.tsx"
git commit -m "feat(bookings): nightly rates from configured Seasons & Holidays"
```

---

## Self-Review

**Spec coverage:**
- Pure helper with season × weekend × holiday stacking, weekend suppressed on holidays, preserved return shape → Task 1. ✓
- `bookings/new` fetches `/seasons` + `/holidays`, removes hardcoded constants, keeps `WEEKEND_MULTIPLIER` → Task 2. ✓
- UI untouched (same breakdown shape) → Task 1 return type matches; Task 2 only swaps the call. ✓
- Out-of-scope (weekend Setup field, pricing-rules/restrictions, persistence) → untouched. ✓

**Placeholder scan:** No vague steps; full code for Task 1, exact deletions/edits for Task 2. ✓

**Type consistency:** `Season`/`Holiday`/`buildNightlyBreakdown` (Task 1) consumed in Task 2 with matching shapes; the `/seasons` payload (`from`/`to`/`multiplier`/`active`) and `/holidays` (`date`/`surchargePct`) map to the helper types. `breakdown` keeps `{counts,total,lines,avgRate}` so `breakdown.total`/`.counts`/`.lines`/`.avgRate` downstream are unchanged. ✓
```
