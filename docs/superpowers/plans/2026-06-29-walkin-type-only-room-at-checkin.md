# Walk-in Type-Only (room assigned at check-in) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Express Walk-in commit to a room **type** (not a specific room); the specific room is assigned later in the existing check-in "Assign Room & Key Card" step.

**Architecture:** All changes are inside `WalkInModal` in `luxe-pms/src/app/(app)/checkin/page.tsx`. Step 3 drops the specific-room picker and keeps only the room-**type** cards. Pricing switches from a specific room's `rate` to the selected **type's `baseTariff`** — the same source/fallback the booking wizard uses. The reservation carries `roomNumber: "Unassigned"`, which routes the check-in into its existing `isUnassigned` path (no check-in changes). `persistCheckIn` already records the check-in-assigned room.

**Tech Stack:** Next.js 16.2.6 (Turbopack), React client components, TypeScript, Tailwind v4. Backend Laravel + Postgres (`/room-types` already returns `baseTariff`).

## Global Constraints

- Edit only `luxe-pms/src/app/(app)/checkin/page.tsx`. No backend, booking-wizard, check-in-modal, dashboard, or print changes.
- **Stop the dev server before editing**; after all edits do a clean restart (`rm -rf luxe-pms/.next/dev`) so changes compile (the file watcher misses direct disk writes on the D: drive).
- Files use **CRLF** line endings — preserve them.
- Match the booking wizard's rate source exactly: `roomTypes.find(t => t.name === roomType)?.baseTariff ?? (Suite 1200 / King 850 / Deluxe 650 / else 450)` (`bookings/new/page.tsx:254-255`).
- Verification gate per task: `npx tsc --noEmit` and `npx eslint` clean for the edited file (no new errors). There is no component unit-test framework in this app — verification is type-check + lint + manual/CDP walk-through.

---

### Task 1: Price the walk-in by the selected room type's base tariff

Switch the pricing inputs from a specific room (`room?.rate`, `room?.type`) to the selected **type** and its `baseTariff`. After this task the app still compiles with the specific-room picker present (removed in Task 2).

**Files:**
- Modify: `luxe-pms/src/app/(app)/checkin/page.tsx` (`roomTypeDefs` ~2088, `availableTypes` ~2126, `selectedType` ~2143, `breakdown` ~2175)

**Interfaces:**
- Produces: `typeRate: number` — the selected type's per-night base tariff (0 when no type selected). Consumed by Task 3 (`seed`). `availableTypes` entries gain a `rate: number` field (the type's base tariff) consumed by Task 2's card.

- [ ] **Step 1: Stop the dev server**

If the Next dev server is running, stop it now so the Edit tool does not race the formatter.

- [ ] **Step 2: Add `baseTariff` to the `/room-types` fetch type**

Find (~line 2088):

```tsx
  const [roomTypeDefs, setRoomTypeDefs] = React.useState<Array<{ name: string; maxAdults?: number; maxChildren?: number; extraAdultRate?: number }>>([]);
  React.useEffect(() => {
    apiGet<Array<{ name: string; maxAdults?: number; maxChildren?: number; extraAdultRate?: number }>>("/room-types")
      .then(r => Array.isArray(r) && setRoomTypeDefs(r))
      .catch(() => {});
  }, []);
```

Replace with (adds `baseTariff?: number` in both the state type and the `apiGet` generic):

```tsx
  const [roomTypeDefs, setRoomTypeDefs] = React.useState<Array<{ name: string; baseTariff?: number; maxAdults?: number; maxChildren?: number; extraAdultRate?: number }>>([]);
  React.useEffect(() => {
    apiGet<Array<{ name: string; baseTariff?: number; maxAdults?: number; maxChildren?: number; extraAdultRate?: number }>>("/room-types")
      .then(r => Array.isArray(r) && setRoomTypeDefs(r))
      .catch(() => {});
  }, []);
```

- [ ] **Step 3: Give each available type its base-tariff rate**

Find (~line 2126):

```tsx
  const availableTypes = React.useMemo(() => {
    const m = new Map<string, { name: string; count: number; minRate: number }>();
    availableRooms.forEach(r => {
      const e = m.get(r.type) ?? { name: r.type, count: 0, minRate: Infinity };
      e.count++; e.minRate = Math.min(e.minRate, r.rate);
      m.set(r.type, e);
    });
    return Array.from(m.values());
  }, [availableRooms]);
```

Replace with (count availability from free rooms, but take the **price** from the type's managed base tariff so the card price equals the billed price and matches booking):

```tsx
  const typeBaseTariff = React.useCallback((name: string) =>
    roomTypeDefs.find(t => t.name === name)?.baseTariff
      ?? (name === "Suite" ? 1200 : name === "King" ? 850 : name === "Deluxe" ? 650 : 450),
    [roomTypeDefs]);
  const availableTypes = React.useMemo(() => {
    const m = new Map<string, { name: string; count: number }>();
    availableRooms.forEach(r => {
      const e = m.get(r.type) ?? { name: r.type, count: 0 };
      e.count++;
      m.set(r.type, e);
    });
    return Array.from(m.values()).map(e => ({ ...e, rate: typeBaseTariff(e.name) }));
  }, [availableRooms, typeBaseTariff]);
```

- [ ] **Step 4: Point `selectedType` at the selected type name and derive `typeRate`**

Find (~line 2143):

```tsx
  // Auto extra-person charge for ADULTS beyond the room type's max (children never charged) — matches booking.
  const selectedType = roomTypeDefs.find(t => t.name === room?.type);
```

Replace with:

```tsx
  // Auto extra-person charge for ADULTS beyond the room type's max (children never charged) — matches booking.
  const selectedType = roomTypeDefs.find(t => t.name === selectedRoomType);
  // Per-night rate is the selected TYPE's base tariff (room is assigned later, at check-in) — exactly like the booking wizard.
  const typeRate = selectedRoomType ? typeBaseTariff(selectedRoomType) : 0;
```

- [ ] **Step 5: Drive the nightly breakdown off `typeRate`**

Find (~line 2175):

```tsx
  const breakdown = React.useMemo(
    () => buildNightlyBreakdown(checkInDate, nights, room?.rate ?? 0, seasons, holidays, WEEKEND_MULTIPLIER),
    [checkInDate, nights, room?.rate, seasons, holidays],
  );
```

Replace with:

```tsx
  const breakdown = React.useMemo(
    () => buildNightlyBreakdown(checkInDate, nights, typeRate, seasons, holidays, WEEKEND_MULTIPLIER),
    [checkInDate, nights, typeRate, seasons, holidays],
  );
```

- [ ] **Step 6: Type-check**

Run: `cd luxe-pms && npx tsc --noEmit`
Expected: PASS — no new errors. (`room`, `roomsOfType`, `roomNumber` are still referenced by the Step-3 picker and `start()`/sync; those are removed in Tasks 2–3.)

- [ ] **Step 7: Commit**

```bash
git add luxe-pms/src/app/\(app\)/checkin/page.tsx
git commit -m "feat(walkin): price walk-in by selected room type base tariff"
```

---

### Task 2: Step 3 UI → room type only (remove the specific-room picker)

Drop the "pick a specific room of this type" list and the `roomNumber` selection from Step 3. Keep the room-**type** cards, now showing the type's base tariff. Gate the Extra-bed toggle and "Next" on a selected **type**.

**Files:**
- Modify: `luxe-pms/src/app/(app)/checkin/page.tsx` (type-card `onClick` ~2706, type-card price ~2716, `roomsOfType` block ~2724-2753, Extra-bed gate ~2756, `canNext` ~2285)

**Interfaces:**
- Consumes: `availableTypes[].rate` and `selectedType` from Task 1.
- Produces: Step 3 advances on `!!selectedRoomType && adults >= 1`.

- [ ] **Step 1: Simplify the type-card click (no longer clears a room) and show the type's tariff**

Find (~line 2706):

```tsx
                              onClick={() => { setSelectedRoomType(t.name); if (room && room.type !== t.name) setRoomNumber(""); }}
```

Replace with:

```tsx
                              onClick={() => setSelectedRoomType(t.name)}
```

Then find (~line 2716):

```tsx
                              <p className="text-[11px] text-muted-foreground mt-0.5">{t.count} available · from {money(t.minRate)}/night</p>
```

Replace with:

```tsx
                              <p className="text-[11px] text-muted-foreground mt-0.5">{t.count} available · {money(t.rate)}/night</p>
```

- [ ] **Step 2: Remove the specific-room (`roomsOfType`) selection block**

Find and delete the entire block (~line 2724-2753):

```tsx
                  {selectedRoomType && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 inline-flex items-center gap-1.5">
                        <BedIcon className="h-3 w-3" />{selectedRoomType} · {roomsOfType.length} room{roomsOfType.length === 1 ? "" : "s"} available
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {roomsOfType.map(r => {
                          const isActive = roomNumber === r.number;
                          return (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() => setRoomNumber(r.number)}
                              className={cn(
                                "rounded-md border p-3 text-left transition-colors",
                                isActive ? "bg-brand-soft border-brand text-brand-soft-foreground" : "border-border hover:bg-surface-sunken"
                              )}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-semibold">Room {r.number}</span>
                                {isActive && <CheckCircle2 className="h-4 w-4 text-brand shrink-0" />}
                              </div>
                              <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">Floor {r.floor}</p>
                              <p className="text-[11px] font-medium tabular mt-0.5">{money(r.rate)}/night</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
```

(Leave the surrounding `<div className="space-y-3">…</div>` that wraps the type-card group intact — only the `{selectedRoomType && (…)}` sibling is removed.)

- [ ] **Step 3: Gate the Extra-bed toggle on a selected type (not a picked room)**

Find (~line 2756):

```tsx
                {!!room && (
                  <div className="mt-3">
                    <ToggleAddon
                      icon={BedDouble}
                      label="Extra bed"
```

Replace the guard only:

```tsx
                {!!selectedRoomType && (
                  <div className="mt-3">
                    <ToggleAddon
                      icon={BedDouble}
                      label="Extra bed"
```

- [ ] **Step 4: Advance Step 3 on a selected type**

Find (~line 2285):

```tsx
    if (step === 3) return !!room && adults >= 1;
```

Replace with:

```tsx
    if (step === 3) return !!selectedRoomType && adults >= 1;
```

- [ ] **Step 5: Type-check**

Run: `cd luxe-pms && npx tsc --noEmit`
Expected: PASS — no new errors. (`room`/`roomNumber` are still used by `start()` and `requestWalkInSync`; removed in Task 3. `roomsOfType` may now be unused — Task 3 removes it.)

- [ ] **Step 6: Commit**

```bash
git add luxe-pms/src/app/\(app\)/checkin/page.tsx
git commit -m "feat(walkin): Step 3 selects room type only, drops specific-room picker"
```

---

### Task 3: Hand off an unassigned reservation; remove dead room state

The reservation and the mobile-sync draft carry `roomNumber: "Unassigned"` + the selected type, routing the check-in into its existing `isUnassigned` room-assignment path. Remove the now-unused `roomNumber` state, `room`, `roomsOfType`, and the resume-by-room effect.

**Files:**
- Modify: `luxe-pms/src/app/(app)/checkin/page.tsx` (`roomNumber`/`room` ~2122-2123, `roomsOfType` ~2136, resume effect ~2137-2140, `seed` ~2291, `start()` ~2295-2338, `requestWalkInSync` ~2342-2378)

**Interfaces:**
- Consumes: `selectedRoomType`, `typeRate` (Task 1).
- Produces: reservation with `roomNumber: "Unassigned"`, `roomType: selectedRoomType`. `persistCheckIn` (unchanged) later writes the check-in-assigned room.

- [ ] **Step 1: `start()` — guard on type, emit an unassigned room**

Find (~line 2295-2296):

```tsx
  const start = async () => {
    if (!room) return;
```

Replace with:

```tsx
  const start = async () => {
    if (!selectedRoomType) return;
```

Then find (~line 2310-2311):

```tsx
      roomNumber: room.number,
      roomType: room.type,
```

Replace with:

```tsx
      roomNumber: "Unassigned",      // a specific room is assigned during check-in
      roomType: selectedRoomType,
```

- [ ] **Step 2: `requestWalkInSync()` — guard on type, draft with an unassigned room**

Find (~line 2352-2355):

```tsx
    if (!room) {
      setSyncErr("Pick an available room first.");
      return;
    }
```

Replace with:

```tsx
    if (!selectedRoomType) {
      setSyncErr("Pick a room type first.");
      return;
    }
```

Then find (~line 2368-2369):

```tsx
      roomNumber: room.number,
      roomType: room.type,
```

Replace with:

```tsx
      roomNumber: "Unassigned",      // assigned during check-in
      roomType: selectedRoomType,
```

- [ ] **Step 3: `seed` — base the booking-number seed on the type rate**

Find (~line 2291):

```tsx
  const seed = name.length + phone.length + nights + (room?.rate ?? 0);
```

Replace with:

```tsx
  const seed = name.length + phone.length + nights + typeRate;
```

- [ ] **Step 4: Remove the dead room state and resume-by-room effect**

Find (~line 2122-2123):

```tsx
  const [roomNumber, setRoomNumber] = React.useState(initialData?.roomNumber ?? "");
  const room = availableRooms.find(r => r.number === roomNumber);
  const [selectedRoomType, setSelectedRoomType] = React.useState("");
```

Replace with (keep `selectedRoomType`; resume a draft straight to its type):

```tsx
  const [selectedRoomType, setSelectedRoomType] = React.useState(initialData?.roomType ?? "");
```

Then find and delete `roomsOfType` (~line 2136):

```tsx
  const roomsOfType = React.useMemo(() => availableRooms.filter(r => r.type === selectedRoomType), [availableRooms, selectedRoomType]);
```

Then find and delete the resume-by-room effect (~line 2137-2140):

```tsx
  // Resume-safe: when a room resolves (e.g. a resumed draft), highlight its type.
  React.useEffect(() => {
    if (room && selectedRoomType !== room.type) setSelectedRoomType(room.type);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.type]);
```

- [ ] **Step 5: Type-check and lint**

Run: `cd luxe-pms && npx tsc --noEmit`
Expected: PASS — no errors. No remaining references to `room`, `roomNumber`, `setRoomNumber`, or `roomsOfType` in `WalkInModal`.

Run: `cd luxe-pms && npx eslint "src/app/(app)/checkin/page.tsx"`
Expected: no new errors (no unused-var warnings for removed symbols).

- [ ] **Step 6: Commit**

```bash
git add luxe-pms/src/app/\(app\)/checkin/page.tsx
git commit -m "feat(walkin): hand off unassigned reservation; remove dead room state"
```

---

### Task 4: Clean rebuild and end-to-end verification

Confirm the change compiles fresh and behaves correctly through the live flow.

**Files:** none (verification only)

- [ ] **Step 1: Clean restart the dev server**

```bash
rm -rf luxe-pms/.next/dev
```

Then start both servers (backend on `C:\php84\php.exe` + frontend) per the project's `start-dev.ps1`. Wait for frontend `200` on `http://localhost:3000` and backend `200` on `http://localhost:8000/api`.

- [ ] **Step 2: Walk-in Step 3 shows types only**

Open `/checkin` → "Walk-in Check-in". Advance to Step 3 (Pax & Type). Verify:
- Room-**type** cards render (name · N available · ₹rate/night).
- There is **no** "Room NNN" specific-room list below the type cards.
- "Next" enables once a type is selected and adults ≥ 1.

- [ ] **Step 3: Price matches the booking wizard for the same type/dates**

For the same room type and the same check-in date + nights, the walk-in's room subtotal equals the booking wizard's room subtotal (both use the type's `baseTariff` through `buildNightlyBreakdown`).

- [ ] **Step 4: Check-in assigns the specific room**

Complete the walk-in. In the check-in process, Step 2 ("Assign Room & Key Card") shows **"Assign an available {type} room"** with a dropdown of free rooms of that type (the existing `isUnassigned` path). Assign a room and complete check-in.

- [ ] **Step 5: Assigned room is recorded and blocked**

Confirm the created booking row carries the check-in-assigned room number (not "Unassigned") and `status: "checked-in"`. Start a second walk-in for an overlapping date and confirm that room no longer appears among the assignable rooms of its type.

- [ ] **Step 6: Final commit (if any verification fixes were needed)**

```bash
git add -A
git commit -m "test(walkin): verify type-only walk-in + check-in room assignment"
```

---

## Self-Review

**Spec coverage:**
- Spec §1 (Step 3 type-only) → Task 2.
- Spec §2 (price by type base tariff, booking parity) → Task 1.
- Spec §3 (reservation carries type, `roomNumber: "Unassigned"`) → Task 3 Steps 1–2.
- Spec §4 (room recorded/blocked at check-in, `persistCheckIn` unchanged) → Task 4 Steps 4–5 (verification only; no code change, as specified).
- Spec "Out of scope" (no check-in/booking/backend changes) → honored; all edits confined to `WalkInModal`.

**Placeholder scan:** No TBD/TODO/"handle edge cases"/"similar to Task N" — every code step shows exact before/after.

**Type consistency:** `typeBaseTariff(name) => number` and `typeRate: number` defined in Task 1 and consumed in Tasks 1–3; `availableTypes[].rate` defined in Task 1, consumed in Task 2; `selectedRoomType: string` reused throughout; reservation `roomNumber`/`roomType` are strings. The mobile-sync draft and `start()` reservation both emit `roomNumber: "Unassigned"`, consistent with the check-in's `isUnassigned` test (`!reservation.roomNumber || reservation.roomNumber === "Unassigned"`).
