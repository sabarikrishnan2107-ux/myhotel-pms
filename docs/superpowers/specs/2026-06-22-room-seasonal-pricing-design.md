# Room booking seasonal pricing → real Seasons & Holidays config

**Date:** 2026-06-22
**Scope:** Frontend only — a pure nightly-pricing helper + rewire `bookings/new` to read
`/seasons` and `/holidays`. Sub-project #3 of the Setup-flow audit. No backend change.

## Goal

Price each night of a room booking from the configured Seasons (date-range multipliers) and
Holidays (per-date surcharge %) instead of the hardcoded `PRICING_MULTIPLIERS` +
`HOLIDAY_DATES`. Keep a fixed weekend uplift (no Setup field exists for it).

## Current state (`luxe-pms/src/app/(app)/bookings/new/page.tsx`, lines 20–53)

`PRICING_MULTIPLIERS = { weekday 1.0, weekend 1.2, holiday 1.3 }` and a hardcoded
`HOLIDAY_DATES` set drive `classifyDay()` + `nightlyBreakdown()`. Configured Seasons/Holidays
in Setup are ignored. The breakdown returns `{ counts, total, lines:[{date,kind,rate}], avgRate }`
with `kind ∈ weekday|weekend|holiday`, consumed by the summary UI (counts strip + per-line
colors at ~lines 484–489, 924).

## Design

### A. Pure helper `src/lib/room-nightly-pricing.ts` (node-unit-tested)

```
interface Season  { from: string; to: string; multiplier: number }   // ISO dates, active only
interface Holiday { date: string; surchargePct: number }
interface NightLine { date: Date; kind: "weekday" | "weekend" | "holiday"; rate: number }
interface NightlyBreakdown { counts: {weekday:number;weekend:number;holiday:number}; total:number; lines: NightLine[]; avgRate:number }
buildNightlyBreakdown(checkInISO, nights, baseRate, seasons, holidays, weekendMultiplier=1.2): NightlyBreakdown
```

Per night (date `d`, ISO `d`):
- `seasonMult` = multiplier of the first season whose `[from,to]` contains the ISO date, else
  `1`.
- `holiday` = the holiday whose `date` equals the ISO date (if any) → `surchargePct`.
- `isWeekend` = `getDay()` is 5 or 6 (Fri/Sat).
- **kind** (label/colour, precedence holiday > weekend > weekday): `holiday` if a holiday,
  else `weekend` if Fri/Sat, else `weekday`. (Season affects the *rate* but not the kind
  label — keeps the existing 3-kind UI unchanged.)
- **rate** (stacking): `round( baseRate × seasonMult × (isWeekend && !holiday ? weekendMultiplier : 1) × (1 + surchargePct/100) )`.
  So season × weekend on a normal weekend night; season × holiday-surcharge on a holiday
  (weekend uplift suppressed on holidays, matching the kind precedence); season alone on a
  plain weekday in a peak season.

Returns the same shape as today's `nightlyBreakdown` so the summary UI is untouched.

### B. Rewire `bookings/new`

- **Remove** `PRICING_MULTIPLIERS`, `HOLIDAY_DATES`, `classifyDay`, and the local
  `nightlyBreakdown`; keep a `const WEEKEND_MULTIPLIER = 1.2` (the one non-configurable piece).
- **Fetch on mount:** `apiGet("/seasons")` (filter `active`) and `apiGet("/holidays")`
  (offline-safe, `Array.isArray` guards). Map to the helper's `Season`/`Holiday` shapes
  (`{from,to,multiplier}` / `{date,surchargePct}`).
- Replace the `nightlyBreakdown(checkIn, nights, baseRate)` call with
  `buildNightlyBreakdown(checkIn, nights, baseRate, seasons, holidays, WEEKEND_MULTIPLIER)`.
  Everything downstream (`breakdown.total`, `.counts`, `.lines`, `.avgRate`, `subtotal`) is
  unchanged since the return shape is preserved.

## Out of scope (YAGNI)

- A Setup field for weekend pricing (none exists; kept as a constant). If wanted later it
  belongs with Pricing Rules (sub-project #4 / Revenue).
- Applying pricing-rules / rate-restrictions in the booking wizard (separate concern).
- Group bookings (#1) and halls (#2), already done.
- Changing the booking persistence shape or the half-day logic.

## Testing

- Frontend unit (node): `room-nightly-pricing.ts` — plain weekday (×1), weekend (×weekend),
  season multiplier on a weekday, holiday surcharge, season×holiday stacking, weekend
  suppressed on a holiday, and empty seasons/holidays (falls back to base × weekend only).
- Browser (Playwright): configure a Season + a Holiday in Setup, then in `bookings/new`
  pick dates spanning them and confirm the nightly breakdown rates reflect the configured
  multiplier/surcharge (not the old fixed 1.2/1.3 with the hardcoded date list).
