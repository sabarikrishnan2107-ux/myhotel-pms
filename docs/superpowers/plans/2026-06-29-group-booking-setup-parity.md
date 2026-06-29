# Group Booking Setup-Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Group Booking flow charge configured rate-plan meal prices, enforce (soft-warn) room-type occupancy capacity, and support an opt-in extra bed per room-type row — using the exact Setup values booking/walk-in already use.

**Architecture:** All pricing math lives in the pure, Node-testable `group-pricing.ts` (Task 1, TDD with vitest). The create form `groups/new/page.tsx` (Task 2) and the detail page `groups/[id]/page.tsx` (Task 3) read the existing `/room-types`, `/rate-plans`, `/gst-slabs` data and call the extended pricing function. No backend or DB changes — `block` is already a JSON column and the room-type/rate-plan columns already exist.

**Tech Stack:** Next.js 16 / React 19 (App Router), TypeScript, Tailwind v4, vitest. Frontend lives in `luxe-pms/`. Run all commands from `luxe-pms/`.

## Global Constraints

- Reuse `mealPerNightPerGuest()` from `luxe-pms/src/lib/booking-pricing.ts` for meal math — do NOT re-derive it, so group meal totals equal booking meal totals.
- `computeGroupTotals` MUST stay backward-compatible: the existing 5-arg calls `computeGroupTotals(rooms, nights, services, totalPax, slabs)` must keep returning identical `roomSubtotal`/`servicesSubtotal`/`gst`/`grandTotal`. Add `planMeals` as a 6th param defaulting to `0`.
- Occupancy cap is a **soft inline warning only** — it never disables Save.
- Extra beds are capped at `0..row.qty` (≤ 1 extra bed per room).
- `maxAdults` falls back to `2` when a room type has none configured; `extraAdultRate` falls back to `0`.
- Meal GST = the slab for the block's highest room rate (`gstRateForRate(maxRate, slabs)`); extra-bed GST = each row's own room-rate slab. No slabs configured → those GSTs are 0 (same as rooms).
- Keep `git` commits per task. Do not commit unrelated working-tree changes — `git add` only the files each task names.

---

### Task 1: Extend `computeGroupTotals` with meals + extra beds

**Files:**
- Modify: `luxe-pms/src/lib/group-pricing.ts`
- Test: `luxe-pms/src/lib/group-pricing.test.ts`

**Interfaces:**
- Consumes: existing `gstRateForRate(rate, slabs)`, `GstSlab`, `GroupSvcLine`.
- Produces:
  - `interface GroupRoomRow { rate: number; qty: number; extraBeds?: number; extraBedRate?: number }`
  - `interface GroupTotals { roomSubtotal: number; extraBedSubtotal: number; servicesSubtotal: number; mealsSubtotal: number; gst: number; grandTotal: number }`
  - `computeGroupTotals(rooms: GroupRoomRow[], nights: number, services: GroupSvcLine[], totalPax: number, slabs: GstSlab[], planMeals?: number): GroupTotals`

- [ ] **Step 1: Write the failing tests**

Append to `luxe-pms/src/lib/group-pricing.test.ts` (inside the existing `describe("computeGroupTotals", …)` block, before its closing `});`):

```typescript
  it("is backward-compatible: existing return fields unchanged when no meals/extra beds", () => {
    const t = computeGroupTotals([{ rate: 650, qty: 10 }], 2, [], 0, slabs);
    expect(t.roomSubtotal).toBe(13000);
    expect(t.extraBedSubtotal).toBe(0);
    expect(t.mealsSubtotal).toBe(0);
    expect(t.gst).toBe(1560);
    expect(t.grandTotal).toBe(14560);
  });

  it("adds plan meals taxed at the block's highest room slab", () => {
    // rooms: 9000*1*2 = 18000 @18% = 3240 ; meals: planMeals 8400 @18% (max rate 9000) = 1512
    const t = computeGroupTotals([{ rate: 9000, qty: 1 }], 2, [], 4, slabs, 8400);
    expect(t.mealsSubtotal).toBe(8400);
    expect(t.gst).toBe(4752);                 // 3240 + 1512
    expect(t.grandTotal).toBe(31152);         // 18000 + 8400 + 4752
  });

  it("adds extra beds (extraBeds*extraBedRate*nights) taxed at the row's room slab", () => {
    // rooms: 650*10*2 = 13000 @12% = 1560 ; extra beds: 2*500*2 = 2000 @12% = 240
    const t = computeGroupTotals(
      [{ rate: 650, qty: 10, extraBeds: 2, extraBedRate: 500 }], 2, [], 0, slabs,
    );
    expect(t.extraBedSubtotal).toBe(2000);
    expect(t.gst).toBe(1800);                 // 1560 + 240
    expect(t.grandTotal).toBe(16800);         // 13000 + 2000 + 1800
  });

  it("charges no meal/extra-bed GST when there are no slabs", () => {
    const t = computeGroupTotals(
      [{ rate: 650, qty: 1, extraBeds: 1, extraBedRate: 500 }], 1, [], 2, [], 1000,
    );
    expect(t.roomSubtotal).toBe(650);
    expect(t.extraBedSubtotal).toBe(500);
    expect(t.mealsSubtotal).toBe(1000);
    expect(t.gst).toBe(0);
    expect(t.grandTotal).toBe(2150);
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test -- group-pricing`
Expected: FAIL — the new assertions reference `t.extraBedSubtotal` / `t.mealsSubtotal` (currently `undefined`) and the `planMeals` arg is ignored.

- [ ] **Step 3: Implement the extended function**

Replace the body of `luxe-pms/src/lib/group-pricing.ts` from the `GroupRoomRow` interface through the end of `computeGroupTotals` with:

```typescript
export interface GroupRoomRow { rate: number; qty: number; extraBeds?: number; extraBedRate?: number }
export interface GroupSvcLine { price: number; perPax: boolean; gst: number }
export interface GroupTotals {
  roomSubtotal: number;
  extraBedSubtotal: number;
  servicesSubtotal: number;
  mealsSubtotal: number;
  gst: number;
  grandTotal: number;
}

export function computeGroupTotals(
  rooms: GroupRoomRow[],
  nights: number,
  services: GroupSvcLine[],
  totalPax: number,
  slabs: GstSlab[],
  planMeals = 0,
): GroupTotals {
  const N = Number(nights) || 0;
  let roomSubtotal = 0, roomGst = 0, extraBedSubtotal = 0, extraBedGst = 0, maxRate = 0;
  for (const r of rooms) {
    const rate = Number(r.rate) || 0;
    const qty = Number(r.qty) || 0;
    const slab = gstRateForRate(rate, slabs);
    const amt = rate * qty * N;
    roomSubtotal += amt;
    roomGst += (amt * slab) / 100;
    if (rate > maxRate) maxRate = rate;

    const ebAmt = (Number(r.extraBeds) || 0) * (Number(r.extraBedRate) || 0) * N;
    extraBedSubtotal += ebAmt;
    extraBedGst += (ebAmt * slab) / 100;   // extra bed billed at its room type's slab
  }

  let servicesSubtotal = 0, svcGst = 0;
  for (const sv of services) {
    const amt = sv.perPax
      ? (Number(sv.price) || 0) * (Number(totalPax) || 0) * N
      : (Number(sv.price) || 0);
    servicesSubtotal += amt;
    svcGst += (amt * (Number(sv.gst) || 0)) / 100;
  }

  const mealsSubtotal = Number(planMeals) || 0;
  const mealGst = (mealsSubtotal * gstRateForRate(maxRate, slabs)) / 100;

  const gst = Math.round(roomGst + extraBedGst + svcGst + mealGst);
  const grandTotal = Math.round(roomSubtotal + extraBedSubtotal + servicesSubtotal + mealsSubtotal + gst);
  return { roomSubtotal, extraBedSubtotal, servicesSubtotal, mealsSubtotal, gst, grandTotal };
}
```

(Leave the file header comment and `GstSlab` interface and `gstRateForRate` function above unchanged.)

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test -- group-pricing`
Expected: PASS — all `gstRateForRate` and `computeGroupTotals` tests green (the 2 original + 4 new).

- [ ] **Step 5: Commit**

```bash
git add luxe-pms/src/lib/group-pricing.ts luxe-pms/src/lib/group-pricing.test.ts
git commit -m "feat(groups): price plan meals + extra beds in computeGroupTotals"
```

---

### Task 2: Apply meals, capacity warning & extra-bed steppers in the create form

**Files:**
- Modify: `luxe-pms/src/app/(app)/groups/new/page.tsx`
- Modify: `luxe-pms/src/lib/mock-data-ext.ts` (widen `GroupRoomBlock` with `extraBeds?`)

**Interfaces:**
- Consumes: `computeGroupTotals` (Task 1, now with `planMeals` 6th arg and `extraBeds`/`extraBedRate` on rows), `mealPerNightPerGuest` from `@/lib/booking-pricing`.
- Produces: `block` JSON rows now include `extraBeds: number`; `GroupRoomBlock.extraBeds?: number` consumed by Task 3.

- [ ] **Step 1: Widen the `GroupRoomBlock` type**

In `luxe-pms/src/lib/mock-data-ext.ts`, find `export interface GroupRoomBlock { type: string; qty: number; rate: number; assigned: number; }` and change it to:

```typescript
export interface GroupRoomBlock { type: string; qty: number; rate: number; assigned: number; extraBeds?: number; }
```

- [ ] **Step 2: Import the meal helper and widen the form's config types**

In `luxe-pms/src/app/(app)/groups/new/page.tsx`:

Add the import beside the existing `computeGroupTotals` import (line ~19):

```typescript
import { computeGroupTotals, type GstSlab } from "@/lib/group-pricing";
import { mealPerNightPerGuest } from "@/lib/booking-pricing";
```

Change `interface BlockRow { id: string; type: string; qty: number; rate: number; }` (line ~21) to:

```typescript
interface BlockRow { id: string; type: string; qty: number; rate: number; extraBeds: number; }
```

Change the `RoomType` and `RatePlan` local types (lines ~122-123) to:

```typescript
  type RoomType = { name: string; baseTariff: number; maxAdults?: number; extraAdultRate?: number };
  type RatePlan = { code: string; name: string; discountPct?: number; inclBreakfast?: boolean; inclLunch?: boolean; inclDinner?: boolean; breakfastPrice?: number; lunchPrice?: number; dinnerPrice?: number };
```

(The existing `apiGet<RoomType[]>("/room-types")` and `apiGet<RatePlan[]>("/rate-plans")` already fetch full rows — only the types widen.)

- [ ] **Step 3: Seed `extraBeds` on the initial and added block rows**

Change the initial block state (line ~107):

```typescript
  const [block, setBlock] = React.useState<BlockRow[]>([
    { id: "b1", type: "Deluxe", qty: 0, rate: 0, extraBeds: 0 },
  ]);
```

Change `addBlock` (line ~271):

```typescript
  const addBlock = () => setBlock(b => [...b, { id: `b${Date.now()}`, type: "Deluxe", qty: 0, rate: 0, extraBeds: 0 }]);
```

- [ ] **Step 4: Compute plan meals, capacity, and pass extra beds into totals**

Replace the totals block (lines ~247-258, from `const selectedSvcLines =` through `const total = totals.grandTotal;`) with:

```typescript
  const selectedSvcLines = services
    .map(id => svcCatalog.find(s => String(s.id) === id))
    .filter((s): s is GroupSvc => !!s)
    .map(s => ({ price: s.price, perPax: s.perPax, gst: s.gst }));

  const extraBedRateFor = (typeName: string) => roomTypes.find(t => t.name === typeName)?.extraAdultRate ?? 0;
  const maxAdultsFor = (typeName: string) => roomTypes.find(t => t.name === typeName)?.maxAdults ?? 2;

  // Configured rate-plan meals: same per-guest-per-night math as booking/walk-in.
  const planMeals = mealPerNightPerGuest({
    inclB: !!selectedPlan?.inclBreakfast, inclL: !!selectedPlan?.inclLunch, inclD: !!selectedPlan?.inclDinner,
    breakfastPrice: selectedPlan?.breakfastPrice ?? 0, lunchPrice: selectedPlan?.lunchPrice ?? 0, dinnerPrice: selectedPlan?.dinnerPrice ?? 0,
  }) * pax * nights;

  const totals = computeGroupTotals(
    block.map(b => ({ rate: b.rate, qty: b.qty, extraBeds: b.extraBeds, extraBedRate: extraBedRateFor(b.type) })),
    nights, selectedSvcLines, pax, gstSlabs, planMeals,
  );
  const roomSubtotal = totals.roomSubtotal;
  const extraBedTotal = totals.extraBedSubtotal;
  const mealsTotal = totals.mealsSubtotal;
  const servicesTotal = totals.servicesSubtotal;
  const subtotal = roomSubtotal + extraBedTotal + mealsTotal + servicesTotal;
  const tax = totals.gst;
  const total = totals.grandTotal;

  // Soft occupancy check: rooms (× included adults) + extra beds vs expected pax.
  const blockCapacity = block.reduce((s, b) => s + b.qty * maxAdultsFor(b.type) + b.extraBeds, 0);
  const overCapacity = pax > 0 && pax > blockCapacity;
```

(Note: `selectedPlan` is already defined just above at line ~139.)

- [ ] **Step 5: Clamp extra beds when a row's quantity drops**

In `updateBlock` (lines ~262-269), extend the handler so reducing `qty` also clamps `extraBeds`, and so `extraBeds` is bounded:

```typescript
  const updateBlock = (id: string, key: keyof BlockRow, value: number | string) => {
    setBlock(b => b.map(r => {
      if (r.id !== id) return r;
      if (key === "rate") { editedRates.current.add(id); return { ...r, rate: Number(value) || 0 }; }
      if (key === "type") { const next = { ...r, type: String(value) }; if (!editedRates.current.has(id)) next.rate = suggestRate(String(value)) || r.rate; return next; }
      if (key === "qty") { const qty = Number(value) || 0; return { ...r, qty, extraBeds: Math.min(r.extraBeds, qty) }; }
      if (key === "extraBeds") { return { ...r, extraBeds: Math.max(0, Math.min(Number(value) || 0, r.qty)) }; }
      return { ...r, [key]: value };
    }));
  };
```

- [ ] **Step 6: Add the extra-bed stepper to each block row**

In the block-row JSX, after the remove-button `<div className="col-span-2 sm:col-span-2 …">…</div>` and before the closing `</div>` of the row (line ~445-446), add a full-width extra-bed control:

```tsx
                  {datesChosen && row.qty > 0 && (
                    <div className="col-span-12 flex items-center gap-3 pt-1 text-xs">
                      <span className="text-muted-foreground">Extra bed</span>
                      <div className="flex items-center border border-border rounded-md h-8 bg-surface">
                        <button type="button" onClick={() => updateBlock(row.id, "extraBeds", row.extraBeds - 1)} className="h-full w-8 hover:bg-surface-sunken inline-flex items-center justify-center border-r border-border disabled:opacity-40 disabled:cursor-not-allowed" disabled={row.extraBeds <= 0}><Minus className="h-3 w-3" /></button>
                        <span className="w-8 text-center font-medium tabular">{row.extraBeds}</span>
                        <button type="button" onClick={() => updateBlock(row.id, "extraBeds", row.extraBeds + 1)} className="h-full w-8 hover:bg-surface-sunken inline-flex items-center justify-center border-l border-border disabled:opacity-40 disabled:cursor-not-allowed" disabled={row.extraBeds >= row.qty} title={row.extraBeds >= row.qty ? "One extra bed per room max" : "Add an extra bed"}><Plus className="h-3 w-3" /></button>
                      </div>
                      <span className="text-muted-foreground">
                        {extraBedRateFor(row.type) > 0 ? `+${money(extraBedRateFor(row.type))}/night each` : "No extra-bed rate set for this type"}
                      </span>
                    </div>
                  )}
```

- [ ] **Step 7: Show the capacity warning under "Total expected pax"**

In the Stay Dates card, the pax field is `<Field label="Total expected pax *">…</Field>` (line ~389) inside a 3-col grid. Immediately after that grid's closing `</div>` (line ~390), add:

```tsx
            {overCapacity && (
              <p className="text-xs text-warning inline-flex items-center gap-1.5">
                <UsersRound className="h-3.5 w-3.5" />Blocked rooms seat up to {blockCapacity}. Add rooms or extra beds to fit {pax - blockCapacity} more.
              </p>
            )}
```

- [ ] **Step 8: Show Extra beds + Plan meals lines in the Live Summary**

In the right summary card, replace the pricing rows block (lines ~645-652, from `<div className="border-t border-border pt-3 space-y-2 text-sm">` through its matching content) so it reads:

```tsx
          <div className="border-t border-border pt-3 space-y-2 text-sm">
            <Row k="Room subtotal" v={money(roomSubtotal)} muted />
            {extraBedTotal > 0 && <Row k="Extra beds" v={money(extraBedTotal)} muted />}
            {mealsTotal > 0 && <Row k="Plan meals" v={money(mealsTotal)} muted />}
            <Row k="Services" v={money(servicesTotal)} muted />
            <Row k="Tax (GST)" v={money(tax)} muted />
            <div className="border-t border-border pt-2 mt-2">
              <Row k={<span className="font-semibold">Total</span>} v={<span className="font-semibold tabular text-base">{money(total)}</span>} />
            </div>
          </div>
```

- [ ] **Step 9: Persist `extraBeds` in the saved block**

In `save()`, change the `block:` line in the `apiPost("/group-bookings", {…})` payload (line ~284):

```typescript
      block: block.map(b => ({ type: b.type, qty: b.qty, rate: b.rate, assigned: 0, extraBeds: b.extraBeds })),
```

- [ ] **Step 10: Typecheck, lint, and verify**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run lint`
Expected: no new errors in `groups/new/page.tsx` or `mock-data-ext.ts`.

Run: `npm run test -- group-pricing`
Expected: PASS (unchanged from Task 1).

- [ ] **Step 11: Commit**

```bash
git add "luxe-pms/src/app/(app)/groups/new/page.tsx" luxe-pms/src/lib/mock-data-ext.ts
git commit -m "feat(groups): create form charges plan meals, warns on capacity, adds extra-bed steppers"
```

---

### Task 3: Make the group detail page show meals/extra beds and match the quote

**Files:**
- Modify: `luxe-pms/src/app/(app)/groups/[id]/page.tsx`

**Interfaces:**
- Consumes: `computeGroupTotals` (Task 1), `mealPerNightPerGuest`, `GroupRoomBlock.extraBeds?` (Task 2), `GstSlab`.
- Produces: nothing downstream (leaf page).

- [ ] **Step 1: Add imports**

In `luxe-pms/src/app/(app)/groups/[id]/page.tsx`, after the existing `apiGet…` import (line ~19), add:

```typescript
import { computeGroupTotals, type GstSlab } from "@/lib/group-pricing";
import { mealPerNightPerGuest } from "@/lib/booking-pricing";
```

- [ ] **Step 2: Load room types, rate plans, and GST slabs**

After the `board` / `allBookings` state + effect (around line ~77-82), add config state and a load effect:

```typescript
  type RoomTypeCfg = { name: string; extraAdultRate?: number };
  type RatePlanCfg = { code: string; name: string; inclBreakfast?: boolean; inclLunch?: boolean; inclDinner?: boolean; breakfastPrice?: number; lunchPrice?: number; dinnerPrice?: number };
  const [roomTypes, setRoomTypes] = React.useState<RoomTypeCfg[]>([]);
  const [ratePlans, setRatePlans] = React.useState<RatePlanCfg[]>([]);
  const [gstSlabs, setGstSlabs] = React.useState<GstSlab[]>([]);
  React.useEffect(() => {
    apiGet<RoomTypeCfg[]>("/room-types").then(r => Array.isArray(r) && setRoomTypes(r)).catch(() => {});
    apiGet<RatePlanCfg[]>("/rate-plans").then(r => Array.isArray(r) && setRatePlans(r)).catch(() => {});
    apiGet<GstSlab[]>("/gst-slabs").then(r => Array.isArray(r) && setGstSlabs(r)).catch(() => {});
  }, []);
```

- [ ] **Step 3: Recompute the folio from stored data**

After `const allocated = …` / `const allocPct = …` (around line ~214-215), add:

```typescript
  // Recompute the folio from the stored block + rate plan so the displayed total
  // matches what was quoted at creation (replaces the old hardcoded 5%/10% math).
  const planCfg = ratePlans.find(p => p.code === group.ratePlan || p.name === group.ratePlan);
  const planMeals = mealPerNightPerGuest({
    inclB: !!planCfg?.inclBreakfast, inclL: !!planCfg?.inclLunch, inclD: !!planCfg?.inclDinner,
    breakfastPrice: planCfg?.breakfastPrice ?? 0, lunchPrice: planCfg?.lunchPrice ?? 0, dinnerPrice: planCfg?.dinnerPrice ?? 0,
  }) * (group.totalPax || 0) * (group.nights || 0);
  const extraBedRateFor = (typeName: string) => roomTypes.find(t => t.name === typeName)?.extraAdultRate ?? 0;
  const folio = computeGroupTotals(
    group.block.map(b => ({ rate: b.rate, qty: b.qty, extraBeds: b.extraBeds ?? 0, extraBedRate: extraBedRateFor(b.type) })),
    group.nights, [], group.totalPax || 0, gstSlabs, planMeals,
  );
```

- [ ] **Step 4: Show extra beds on the Rooms-tab cards**

In the Rooms tab, inside the room-type card, change the rate line (line ~370) to append an extra-bed note:

```tsx
                      <p className="text-xs text-muted-foreground mt-0.5 tabular">{money(b.rate)} per night · group rate{b.extraBeds ? ` · +${b.extraBeds} extra bed${b.extraBeds > 1 ? "s" : ""}` : ""}</p>
```

- [ ] **Step 5: Add Extra-bed + Plan-meals rows to the Master Folio and use the real totals**

In the Billing tab `<table>`, the `<tbody>` currently maps `group.block` then `group.services` with a fabricated `total * 0.1` amount. Replace the whole `<tbody>…</tbody>` (lines ~539-556) with:

```tsx
              <tbody className="divide-y divide-border">
                {group.block.map((b, i) => (
                  <tr key={i}>
                    <td className="px-5 py-3">{b.type} room · {group.nights} nights</td>
                    <td className="px-5 py-3 text-right tabular">{b.qty}</td>
                    <td className="px-5 py-3 text-right tabular">{money(b.rate * group.nights)}</td>
                    <td className="px-5 py-3 text-right tabular font-medium">{money(b.qty * b.rate * group.nights)}</td>
                  </tr>
                ))}
                {group.block.filter(b => b.extraBeds).map((b, i) => (
                  <tr key={`eb${i}`}>
                    <td className="px-5 py-3">{b.type} · extra bed · {group.nights} nights</td>
                    <td className="px-5 py-3 text-right tabular">{b.extraBeds}</td>
                    <td className="px-5 py-3 text-right tabular">{money(extraBedRateFor(b.type) * group.nights)}</td>
                    <td className="px-5 py-3 text-right tabular font-medium">{money((b.extraBeds ?? 0) * extraBedRateFor(b.type) * group.nights)}</td>
                  </tr>
                ))}
                {folio.mealsSubtotal > 0 && (
                  <tr>
                    <td className="px-5 py-3">Plan meals ({group.ratePlan}) · {group.totalPax} pax × {group.nights} nights</td>
                    <td className="px-5 py-3 text-right tabular">{group.totalPax}</td>
                    <td className="px-5 py-3 text-right tabular text-muted-foreground">—</td>
                    <td className="px-5 py-3 text-right tabular font-medium">{money(folio.mealsSubtotal)}</td>
                  </tr>
                )}
                {group.services.map((s, i) => (
                  <tr key={`s${i}`}>
                    <td className="px-5 py-3">{s}</td>
                    <td className="px-5 py-3 text-right tabular">1</td>
                    <td className="px-5 py-3 text-right tabular text-muted-foreground">—</td>
                    <td className="px-5 py-3 text-right tabular text-muted-foreground">—</td>
                  </tr>
                ))}
              </tbody>
```

Then replace the `<tfoot>…</tfoot>` (lines ~557-570) with computed subtotal/GST/total:

```tsx
              <tfoot className="bg-surface-elevated border-t border-border">
                <tr>
                  <td colSpan={3} className="px-5 py-2 text-right text-xs uppercase tracking-wider font-semibold text-muted-foreground">Subtotal</td>
                  <td className="px-5 py-2 text-right tabular">{money(folio.roomSubtotal + folio.extraBedSubtotal + folio.mealsSubtotal)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="px-5 py-2 text-right text-xs uppercase tracking-wider font-semibold text-muted-foreground">Tax (GST)</td>
                  <td className="px-5 py-2 text-right tabular text-muted-foreground">{money(folio.gst)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="px-5 py-3 text-right text-xs uppercase tracking-wider font-semibold">Total</td>
                  <td className="px-5 py-3 text-right tabular font-semibold text-base">{money(folio.grandTotal)}</td>
                </tr>
              </tfoot>
```

Note: services keep an em-dash amount because group service prices are stored only as names on the group record (no per-service price persisted) — pricing them is out of scope here; this removes the previously fabricated `total*0.1` figure rather than inventing a new one.

- [ ] **Step 6: Typecheck, lint, and verify**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run lint`
Expected: no new errors in `groups/[id]/page.tsx`.

- [ ] **Step 7: Commit**

```bash
git add "luxe-pms/src/app/(app)/groups/[id]/page.tsx"
git commit -m "feat(groups): detail folio shows plan meals + extra beds and matches the quote"
```

---

## Manual verification (after all tasks)

Start both servers (`start-dev.ps1`), log in `admin@hotel.com` / `password123`, then:

1. **Setup prep:** Setup → Pricing & Rate Plans → set AP with Breakfast=300, Lunch=500, Dinner=600 (all three included), Save. Setup → Room Types → ensure a type (e.g. Deluxe) has Incl. adults = 2 and an extra-bed/extra-adult rate (e.g. 500), Save.
2. **Create group:** `/groups/new` → pick dates (3 nights), Total expected pax = 10, block 4 Deluxe, rate plan AP.
   - Live Summary shows a **Plan meals** line = `mealPerNightPerGuest(AP) × 10 × 3` = `1400 × 10 × 3` = ₹42,000.
   - Add 1 extra bed on the Deluxe row → **Extra beds** line = `1 × 500 × 3` = ₹1,500; summary Total rises accordingly.
   - Set pax above capacity (e.g. 4 rooms × 2 = 8 adults, +1 extra bed = 9; pax 10) → the **capacity warning** appears under Total expected pax.
   - Create the group.
3. **Detail page:** open the new group → Billing tab shows the **Plan meals** and **extra-bed** rows, and Subtotal/Tax/Total equal what the create summary showed (no more flat 5%/10%). Rooms tab shows "+1 extra bed" on the Deluxe card.
4. **Regression:** create a group with no extra beds and a room-only plan (EP) → no Plan meals / Extra beds lines; totals match the old room-only behavior.
