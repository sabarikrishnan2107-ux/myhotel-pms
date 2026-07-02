# Folio Charge Order-Time Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the time each folio charge was placed, in a new leftmost "Time" column on the Folio page's Charges tab, and sort each day's charges chronologically.

**Architecture:** No backend changes — `folio_charges` rows already get `created_at` for free from Eloquent's standard timestamps, and the model has no `$hidden`, so it's already on the wire. On the frontend: add an optional `created_at` field to the `FolioCharge` type, extract the existing inline "group charges by day" logic into a small pure, unit-tested function that also sorts each day's charges by `created_at`, then wire a Time column into the existing `ChargesTable` component using the app's existing `formatTime()` util.

**Tech Stack:** Next.js (React, TypeScript) frontend in `luxe-pms/`; Vitest for unit tests (`npx vitest run <file>` from `luxe-pms/`); Laravel backend in `hotel-pms-api/` (untouched by this plan).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-02-folio-charge-order-time-design.md`
- `created_at` on `FolioCharge` must be **optional** (`created_at?: string`) — `checkout/[id]/page.tsx:71-86` builds a synthetic fallback bill cast `as typeof SAMPLE_FOLIO_CHARGES` that has no `created_at`; making the field required breaks that cast. Do not modify `checkout/[id]/page.tsx` in this plan.
- No new backend migration, no changes to any `apiPost("/folio-charges", ...)` call site (`rack/page.tsx`, `folio/[id]/page.tsx`'s `AddChargeModal`/`DiscountModal` handlers) — the server already stamps `created_at` on insert regardless of what's posted.
- Time column shows for every charge type, including `Room` rows — no blanking/omitting by type.
- The "Flat list" toggle needs no code change — it renders through the same `ChargesTable` component that gets the new column.

---

### Task 1: Add `created_at` to the `FolioCharge` type and seed realistic timestamps in mock data

**Files:**
- Modify: `luxe-pms/src/lib/types.ts:101-111`
- Modify: `luxe-pms/src/lib/mock-data.ts:131-143`

**Interfaces:**
- Produces: `FolioCharge.created_at?: string` — an optional ISO-8601 timestamp string, consumed by Task 2's `groupChargesByDay` and Task 3's `ChargesTable`.

- [ ] **Step 1: Add the field to the type**

In `luxe-pms/src/lib/types.ts`, change:

```ts
export interface FolioCharge {
  id: string;
  date: string;
  description: string;
  type: "Room" | "F&B" | "Tax" | "Extra" | "Discount" | "Service";
  qty: number;
  rate: number;
  tax: number;
  amount: number;
  paidBy: "Guest" | "Agent" | "Company";
}
```

to:

```ts
export interface FolioCharge {
  id: string;
  date: string;
  description: string;
  type: "Room" | "F&B" | "Tax" | "Extra" | "Discount" | "Service";
  qty: number;
  rate: number;
  tax: number;
  amount: number;
  paidBy: "Guest" | "Agent" | "Company";
  created_at?: string;
}
```

- [ ] **Step 2: Add `created_at` values to the seeded sample charges**

In `luxe-pms/src/lib/mock-data.ts`, change:

```ts
export const SAMPLE_FOLIO_CHARGES: FolioCharge[] = [
  // Day 1
  { id: "fc1", date: "2026-05-23", description: "Room — Deluxe (Night 1) · SAC 9963", type: "Room", qty: 1, rate: 8500, tax: 1530, amount: 10030, paidBy: "Guest" },
  { id: "fc2", date: "2026-05-23", description: "Breakfast Buffet × 2 · SAC 9963", type: "F&B", qty: 2, rate: 850, tax: 85, amount: 1785, paidBy: "Guest" },
  { id: "fc3", date: "2026-05-23", description: "Mini Bar — Bisleri Water", type: "F&B", qty: 2, rate: 120, tax: 12, amount: 252, paidBy: "Guest" },
  // Day 2
  { id: "fc4", date: "2026-05-24", description: "Room — Deluxe (Night 2) · SAC 9963", type: "Room", qty: 1, rate: 8500, tax: 1530, amount: 10030, paidBy: "Guest" },
  { id: "fc5", date: "2026-05-24", description: "Spa — Couples Massage · SAC 9972", type: "Service", qty: 1, rate: 4500, tax: 810, amount: 5310, paidBy: "Guest" },
  { id: "fc6", date: "2026-05-24", description: "Laundry Service · SAC 9987", type: "Service", qty: 1, rate: 650, tax: 117, amount: 767, paidBy: "Guest" },
  // Day 3
  { id: "fc7", date: "2026-05-25", description: "Room — Deluxe (Night 3) · SAC 9963", type: "Room", qty: 1, rate: 8500, tax: 1530, amount: 10030, paidBy: "Guest" },
  { id: "fc8", date: "2026-05-25", description: "Airport Transfer · SAC 9964", type: "Service", qty: 1, rate: 1500, tax: 270, amount: 1770, paidBy: "Guest" },
];
```

to:

```ts
export const SAMPLE_FOLIO_CHARGES: FolioCharge[] = [
  // Day 1
  { id: "fc1", date: "2026-05-23", description: "Room — Deluxe (Night 1) · SAC 9963", type: "Room", qty: 1, rate: 8500, tax: 1530, amount: 10030, paidBy: "Guest", created_at: "2026-05-23T08:15:00Z" },
  { id: "fc2", date: "2026-05-23", description: "Breakfast Buffet × 2 · SAC 9963", type: "F&B", qty: 2, rate: 850, tax: 85, amount: 1785, paidBy: "Guest", created_at: "2026-05-23T09:40:00Z" },
  { id: "fc3", date: "2026-05-23", description: "Mini Bar — Bisleri Water", type: "F&B", qty: 2, rate: 120, tax: 12, amount: 252, paidBy: "Guest", created_at: "2026-05-23T20:05:00Z" },
  // Day 2
  { id: "fc4", date: "2026-05-24", description: "Room — Deluxe (Night 2) · SAC 9963", type: "Room", qty: 1, rate: 8500, tax: 1530, amount: 10030, paidBy: "Guest", created_at: "2026-05-24T08:00:00Z" },
  { id: "fc5", date: "2026-05-24", description: "Spa — Couples Massage · SAC 9972", type: "Service", qty: 1, rate: 4500, tax: 810, amount: 5310, paidBy: "Guest", created_at: "2026-05-24T14:30:00Z" },
  { id: "fc6", date: "2026-05-24", description: "Laundry Service · SAC 9987", type: "Service", qty: 1, rate: 650, tax: 117, amount: 767, paidBy: "Guest", created_at: "2026-05-24T11:10:00Z" },
  // Day 3
  { id: "fc7", date: "2026-05-25", description: "Room — Deluxe (Night 3) · SAC 9963", type: "Room", qty: 1, rate: 8500, tax: 1530, amount: 10030, paidBy: "Guest", created_at: "2026-05-25T08:00:00Z" },
  { id: "fc8", date: "2026-05-25", description: "Airport Transfer · SAC 9964", type: "Service", qty: 1, rate: 1500, tax: 270, amount: 1770, paidBy: "Guest", created_at: "2026-05-25T06:45:00Z" },
];
```

(Note `fc6` and `fc5` are intentionally out of chronological order relative to their array position — `fc6` at 11:10 comes before `fc5` at 14:30 — so Task 3's manual verification will visibly confirm the new chronological sort actually reorders them, instead of accidentally matching the pre-existing array order.)

- [ ] **Step 3: Verify it compiles**

Run (from `luxe-pms/`): `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add luxe-pms/src/lib/types.ts luxe-pms/src/lib/mock-data.ts
git commit -m "feat(luxe-pms): add optional created_at to FolioCharge"
```

---

### Task 2: Pure, unit-tested `groupChargesByDay` helper

**Files:**
- Create: `luxe-pms/src/lib/folio-charges.ts`
- Test: `luxe-pms/src/lib/folio-charges.test.ts`

**Interfaces:**
- Consumes: `FolioCharge` type from `@/lib/types` (Task 1's `created_at?: string` field).
- Produces: `groupChargesByDay(charges: FolioCharge[]): Array<{ date: string; items: FolioCharge[] }>` — entries sorted by `date` ascending; within each entry, `items` sorted by `created_at` ascending (charges with no `created_at` sort after ones that have it, keeping their relative order). Consumed by Task 3.

- [ ] **Step 1: Write the failing tests**

Create `luxe-pms/src/lib/folio-charges.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { groupChargesByDay } from "@/lib/folio-charges";
import type { FolioCharge } from "@/lib/types";

function charge(overrides: Partial<FolioCharge>): FolioCharge {
  return {
    id: "c1", date: "2026-05-23", description: "Test charge", type: "Extra",
    qty: 1, rate: 100, tax: 0, amount: 100, paidBy: "Guest",
    ...overrides,
  };
}

describe("groupChargesByDay", () => {
  it("buckets charges by their date field", () => {
    const result = groupChargesByDay([
      charge({ id: "a", date: "2026-05-24" }),
      charge({ id: "b", date: "2026-05-23" }),
      charge({ id: "c", date: "2026-05-24" }),
    ]);
    expect(result.map(g => g.date)).toEqual(["2026-05-23", "2026-05-24"]);
    expect(result.find(g => g.date === "2026-05-24")?.items.map(c => c.id)).toEqual(["a", "c"]);
  });

  it("sorts each day's charges by created_at ascending", () => {
    const result = groupChargesByDay([
      charge({ id: "late", created_at: "2026-05-23T20:00:00Z" }),
      charge({ id: "early", created_at: "2026-05-23T08:00:00Z" }),
      charge({ id: "mid", created_at: "2026-05-23T12:00:00Z" }),
    ]);
    expect(result[0].items.map(c => c.id)).toEqual(["early", "mid", "late"]);
  });

  it("sorts charges without created_at after charges that have it, preserving relative order", () => {
    const result = groupChargesByDay([
      charge({ id: "no-time-1" }),
      charge({ id: "has-time", created_at: "2026-05-23T08:00:00Z" }),
      charge({ id: "no-time-2" }),
    ]);
    expect(result[0].items.map(c => c.id)).toEqual(["has-time", "no-time-1", "no-time-2"]);
  });

  it("returns an empty array for no charges", () => {
    expect(groupChargesByDay([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run (from `luxe-pms/`): `npx vitest run src/lib/folio-charges.test.ts`
Expected: FAIL — `Cannot find module '@/lib/folio-charges'` (the module doesn't exist yet).

- [ ] **Step 3: Implement `groupChargesByDay`**

Create `luxe-pms/src/lib/folio-charges.ts`:

```ts
// Pure day-grouping/sorting logic for the Folio Charges tab — separated
// from folio/[id]/page.tsx so it's unit-testable without React/DOM.
import type { FolioCharge } from "@/lib/types";

export function groupChargesByDay(charges: FolioCharge[]): Array<{ date: string; items: FolioCharge[] }> {
  const byDate = new Map<string, FolioCharge[]>();
  for (const c of charges) {
    const bucket = byDate.get(c.date);
    if (bucket) bucket.push(c);
    else byDate.set(c.date, [c]);
  }
  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, items]) => ({ date, items: sortByCreatedAt(items) }));
}

function sortByCreatedAt(items: FolioCharge[]): FolioCharge[] {
  return [...items].sort((a, b) => {
    if (!a.created_at && !b.created_at) return 0;
    if (!a.created_at) return 1;
    if (!b.created_at) return -1;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run (from `luxe-pms/`): `npx vitest run src/lib/folio-charges.test.ts`
Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add luxe-pms/src/lib/folio-charges.ts luxe-pms/src/lib/folio-charges.test.ts
git commit -m "feat(luxe-pms): add groupChargesByDay pure helper for folio charges"
```

---

### Task 3: Wire the Time column and chronological grouping into the Folio Charges tab

**Files:**
- Modify: `luxe-pms/src/app/(app)/folio/[id]/page.tsx:19-22` (imports), `:201-205` (day grouping), `:608-625` (render loop), `:1001-1035` (`ChargesTable`)

**Interfaces:**
- Consumes: `groupChargesByDay` from `@/lib/folio-charges` (Task 2); `formatTime` from `@/lib/utils` (already imported at line 20); `FolioCharge.created_at?: string` (Task 1).

- [ ] **Step 1: Import `groupChargesByDay`**

In `luxe-pms/src/app/(app)/folio/[id]/page.tsx`, after the existing `import { apiGet, ... } from "@/lib/api";` line (line 21), add:

```ts
import { groupChargesByDay } from "@/lib/folio-charges";
```

- [ ] **Step 2: Replace the inline `byDay` computation**

Find (around line 201-205):

```ts
  // Charges grouped by day
  const byDay = liveCharges.reduce<Record<string, typeof liveCharges>>((acc, c) => {
    (acc[c.date] ??= []).push(c);
    return acc;
  }, {});
```

Replace with:

```ts
  // Charges grouped by day, sorted chronologically within each day
  const chargesByDay = groupChargesByDay(liveCharges);
```

- [ ] **Step 3: Update the render loop to use `chargesByDay`**

Find (around line 608-624):

```tsx
          {groupByDay ? (
            Object.entries(byDay).sort().map(([date, list]) => {
              const dayTotal = list.reduce((s, c) => s + c.amount, 0);
              return (
                <Card key={date} className="p-0 overflow-hidden">
                  <div className="px-5 py-3 bg-surface-elevated border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <p className="font-semibold text-sm">{formatDateLong(date)}</p>
                      <Badge tone="neutral">{list.length} items</Badge>
                    </div>
                    <p className="text-sm font-semibold tabular">{money(dayTotal)}</p>
                  </div>
                  <ChargesTable charges={list} voidedIds={voidedIds} onVoid={(c) => setVoidCharge(c)} />
                </Card>
              );
            })
          ) : (
```

Replace with:

```tsx
          {groupByDay ? (
            chargesByDay.map(({ date, items }) => {
              const dayTotal = items.reduce((s, c) => s + c.amount, 0);
              return (
                <Card key={date} className="p-0 overflow-hidden">
                  <div className="px-5 py-3 bg-surface-elevated border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <p className="font-semibold text-sm">{formatDateLong(date)}</p>
                      <Badge tone="neutral">{items.length} items</Badge>
                    </div>
                    <p className="text-sm font-semibold tabular">{money(dayTotal)}</p>
                  </div>
                  <ChargesTable charges={items} voidedIds={voidedIds} onVoid={(c) => setVoidCharge(c)} />
                </Card>
              );
            })
          ) : (
```

- [ ] **Step 4: Add the Time column header**

Find (around line 1009-1019, inside `ChargesTable`):

```tsx
      <thead className="bg-surface-sunken/50 border-b border-border">
        <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
          <th className="px-5 py-2.5 font-semibold">Description</th>
```

Replace with:

```tsx
      <thead className="bg-surface-sunken/50 border-b border-border">
        <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
          <th className="px-5 py-2.5 font-semibold">Time</th>
          <th className="px-5 py-2.5 font-semibold">Description</th>
```

- [ ] **Step 5: Add the Time cell to each row**

Find (around line 1024-1029):

```tsx
            <tr key={c.id} className={cn("hover:bg-surface-sunken/40", isVoid && "opacity-50 bg-danger-soft/10")}>
              <td className={cn("px-5 py-3", isVoid && "line-through")}>
                {c.description}
                {isVoid && <Badge tone="danger" className="ml-2">Voided</Badge>}
              </td>
```

Replace with:

```tsx
            <tr key={c.id} className={cn("hover:bg-surface-sunken/40", isVoid && "opacity-50 bg-danger-soft/10")}>
              <td className="px-5 py-3 text-muted-foreground tabular">{c.created_at ? formatTime(c.created_at) : "—"}</td>
              <td className={cn("px-5 py-3", isVoid && "line-through")}>
                {c.description}
                {isVoid && <Badge tone="danger" className="ml-2">Voided</Badge>}
              </td>
```

- [ ] **Step 6: Verify it compiles**

Run (from `luxe-pms/`): `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Run the full unit test suite to check for regressions**

Run (from `luxe-pms/`): `npx vitest run`
Expected: all tests pass (including the 4 new ones from Task 2).

- [ ] **Step 8: Commit**

```bash
git add "luxe-pms/src/app/(app)/folio/[id]/page.tsx"
git commit -m "feat(luxe-pms): show order time on the Folio Charges tab"
```

---

### Task 4: Live browser verification

**Files:** none (verification only)

- [ ] **Step 1: Start the dev servers**

From the repo root, run: `./start-dev.ps1` (starts both the `hotel-pms-api` backend on `C:\php84\php.exe` and the `luxe-pms` frontend).

- [ ] **Step 2: Open a booking's Folio page in the browser**

Log in (`admin@hotel.com` / `password123`), navigate to a booking's Folio page, and open the **Charges** tab.

Confirm:
- A **Time** column appears first (leftmost), before Description.
- Every row — including `Room` type rows — shows a time (from real DB `created_at`, or mock data's seeded values if running against mock data).
- Within a day group, rows are ordered chronologically (earliest first). Cross-check the "Day 2" group specifically — per Task 1's Step 2, `fc6` (Laundry, 11:10) must render above `fc5` (Spa, 14:30), which is a different order than the array's original `fc5, fc6` ordering.

- [ ] **Step 2: Post a new charge and confirm its time is correct**

Use the Room Rack "Order for Room" dialog (or the Folio page's "Add charge") to post a new charge against a live booking. Reopen its Folio → Charges tab and confirm the new charge shows the current time.

- [ ] **Step 3: Confirm the Flat list toggle also shows the Time column**

Click "Flat list" on the same Charges tab and confirm the Time column is present there too (same `ChargesTable` component, no separate work needed — this step just confirms it).

- [ ] **Step 4: Report results**

No commit for this task — it's verification only. If any check fails, stop and fix the relevant earlier task before proceeding.
