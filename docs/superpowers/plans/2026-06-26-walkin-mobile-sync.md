# Walk-in "Sync to mobile app" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Sync to mobile app" option to the Express Walk-in Check-in modal that pushes the walk-in to the tablet for face/ID/signature capture, mirroring the new-booking guest form.

**Architecture:** A pure helper assembles the draft-booking payload (unit-tested). `WalkInModal` (in `checkin/page.tsx`) gains the same sync state machine + 3 s polling already proven in `new-guest-form.tsx`, and renders the shared `MobileSyncDialog`. The walk-in's existing "Start check-in" flow is untouched.

**Tech Stack:** Next.js 16 / React 19, TypeScript, Tailwind v4, vitest. Existing `libphonenumber`-free; uses `@/lib/api` (`apiGet`/`apiPost`) and `@/components/guests/mobile-sync-dialog`.

## Global Constraints

- Base branch: `feat/walkin-mobile-sync` (off `feat/resume-incomplete-draft`). NOT `main`.
- No backend changes. Reuse `POST /bookings`, `GET /bookings/{id}`.
- The synced booking is a **draft** (`status: "pending"`) so it appears on the tablet but not as a confirmed arrival.
- Reuse the modal's existing `bookingNo` (`WK…`) as the sync reference.
- Do NOT modify `CheckinProcessModal` or the `onStart`/`start()` path (scoped choice).
- Tests live beside source: `luxe-pms/src/lib/*.test.ts`, imported via `@/lib/...`.

---

### Task 1: Pure payload builder `buildWalkInSyncBooking` + tests

**Files:**
- Create: `luxe-pms/src/lib/walkin-sync.ts`
- Test: `luxe-pms/src/lib/walkin-sync.test.ts`

**Interfaces:**
- Consumes: `BookingSource` from `@/lib/types`.
- Produces: `buildWalkInSyncBooking(input: WalkInSyncInput): WalkInSyncBooking` and the two exported interfaces. Task 2 imports `buildWalkInSyncBooking`.

- [ ] **Step 1: Write the failing test**

```ts
// luxe-pms/src/lib/walkin-sync.test.ts
import { describe, it, expect } from "vitest";
import { buildWalkInSyncBooking } from "@/lib/walkin-sync";

const base = {
  bookingNo: "WK101234",
  guestName: "John Doe",
  roomNumber: "101",
  roomType: "Queen",
  checkIn: "2026-06-26T12:00:00.000Z",
  checkOut: "2026-06-27T11:00:00.000Z",
  nights: 1,
  adults: 1,
  children: 0,
  ratePlan: "EP",
  total: 6825,
  advance: 2678,
};

describe("buildWalkInSyncBooking", () => {
  it("creates a pending Walk-in draft keeping the reference", () => {
    const b = buildWalkInSyncBooking(base);
    expect(b.status).toBe("pending");
    expect(b.source).toBe("Walk-in");
    expect(b.bookingNo).toBe("WK101234");
  });

  it("derives balance and a partial payment status", () => {
    const b = buildWalkInSyncBooking(base);
    expect(b.balance).toBe(4147);          // 6825 - 2678
    expect(b.paymentStatus).toBe("partial");
  });

  it("is unpaid with no advance and paid when fully covered", () => {
    expect(buildWalkInSyncBooking({ ...base, advance: 0 }).paymentStatus).toBe("unpaid");
    const paid = buildWalkInSyncBooking({ ...base, advance: 6825 });
    expect(paid.paymentStatus).toBe("paid");
    expect(paid.balance).toBe(0);
  });

  it("falls back to Unassigned when no room is chosen", () => {
    expect(buildWalkInSyncBooking({ ...base, roomNumber: "" }).roomNumber).toBe("Unassigned");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd luxe-pms; npx vitest run src/lib/walkin-sync.test.ts`
Expected: FAIL — cannot resolve `@/lib/walkin-sync` / `buildWalkInSyncBooking` is not a function.

- [ ] **Step 3: Write minimal implementation**

```ts
// luxe-pms/src/lib/walkin-sync.ts
import type { BookingSource } from "@/lib/types";

export interface WalkInSyncInput {
  bookingNo: string;
  guestName: string;
  roomNumber: string;
  roomType: string;
  checkIn: string;   // ISO
  checkOut: string;  // ISO
  nights: number;
  adults: number;
  children: number;
  ratePlan: string;  // EP / CP / MAP / AP
  total: number;
  advance: number;
}

export interface WalkInSyncBooking {
  bookingNo: string;
  guestName: string;
  roomNumber: string;
  roomType: string;
  source: BookingSource;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  children: number;
  ratePlan: string;
  total: number;
  advance: number;
  balance: number;
  paymentStatus: "unpaid" | "partial" | "paid";
  status: "pending";
}

/**
 * Assemble the draft-booking payload posted to `/bookings` so a walk-in shows on
 * the tablet for document capture. Held as `pending` (a draft) — not a confirmed
 * arrival; the desk check-in flow proceeds separately and reuses this reference.
 */
export function buildWalkInSyncBooking(input: WalkInSyncInput): WalkInSyncBooking {
  const total = Math.round(input.total);
  const advance = Math.round(input.advance);
  const balance = Math.max(0, total - advance);
  const paymentStatus =
    advance <= 0 ? "unpaid" : advance >= total ? "paid" : "partial";
  return {
    bookingNo: input.bookingNo,
    guestName: input.guestName,
    roomNumber: input.roomNumber || "Unassigned",
    roomType: input.roomType,
    source: "Walk-in" as BookingSource,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    nights: input.nights,
    adults: input.adults,
    children: input.children,
    ratePlan: input.ratePlan,
    total,
    advance,
    balance,
    paymentStatus,
    status: "pending",
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd luxe-pms; npx vitest run src/lib/walkin-sync.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add luxe-pms/src/lib/walkin-sync.ts luxe-pms/src/lib/walkin-sync.test.ts
git commit -m "feat(checkin): pure builder for walk-in sync draft booking"
```

---

### Task 2: Wire the sync card + dialog into `WalkInModal`

**Files:**
- Modify: `luxe-pms/src/app/(app)/checkin/page.tsx` (the `WalkInModal` component, ~1645–2190, plus the import block ~14–28)

**Interfaces:**
- Consumes: `buildWalkInSyncBooking` from `@/lib/walkin-sync`; `MobileSyncDialog` from `@/components/guests/mobile-sync-dialog`; existing `apiGet`/`apiPost`; existing in-scope state `name`, `phone`, `room`, `checkInDate`, `nights`, `adults`, `children`, `ratePlanCode`, `grandTotal`, `pay.amount`, `bookingNo`.
- Produces: no new exports — internal UI behavior only.

- [ ] **Step 1: Add the imports**

Add to the existing `lucide-react` import (already has `Smartphone`, `CheckCircle2`, `X`) — no change needed there. Add two module imports near the other `@/components` imports (after line 23):

```tsx
import { MobileSyncDialog } from "@/components/guests/mobile-sync-dialog";
import { buildWalkInSyncBooking } from "@/lib/walkin-sync";
```

- [ ] **Step 2: Add sync state + the booking-shape type inside `WalkInModal`**

Right after the `// ----- receipt preview -----` block (the `showReceipt` state, ~line 1716), add:

```tsx
  // ----- mobile capture sync -----
  type SyncedBooking = {
    verification_status?: string;
    documents?: {
      guest_photo?: string | null;
      id_front?: string | null;
      id_back?: string | null;
      signature?: string | null;
    };
  };
  const [syncState, setSyncState] = React.useState<"idle" | "creating" | "waiting" | "done" | "error">("idle");
  const [syncBooking, setSyncBooking] = React.useState<{ id: number; bookingNo: string } | null>(null);
  const [syncDocs, setSyncDocs] = React.useState<SyncedBooking["documents"]>(undefined);
  const [syncErr, setSyncErr] = React.useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
```

- [ ] **Step 3: Add `requestWalkInSync` + `cancelSync` + polling effect**

Add immediately after the `start` function (after line ~1788, before `return (`):

```tsx
  // "Sync to mobile app" — create the walk-in as a draft booking now so it shows
  // on the tablet for document capture, then poll until the app uploads them.
  const requestWalkInSync = async () => {
    // Already running/finished — just re-open the status dialog.
    if (syncState === "creating" || syncState === "waiting" || syncState === "done") {
      setDialogOpen(true);
      return;
    }
    if (!name.trim() || phone.trim().length < 5) {
      setSyncErr("Enter the guest's name and phone first.");
      return;
    }
    if (!room) {
      setSyncErr("Pick an available room first.");
      return;
    }
    setSyncErr(null);
    setSyncDocs(undefined);
    setDialogOpen(true);
    setSyncState("creating");
    const ci = new Date(checkInDate + "T12:00:00");
    const co = new Date(ci);
    co.setDate(co.getDate() + nights);
    co.setHours(11, 0, 0, 0);
    const payload = buildWalkInSyncBooking({
      bookingNo,
      guestName: name.trim(),
      roomNumber: room.number,
      roomType: room.type,
      checkIn: ci.toISOString(),
      checkOut: co.toISOString(),
      nights,
      adults,
      children,
      ratePlan: ratePlanCode,
      total: grandTotal,
      advance: pay.amount,
    });
    try {
      const created = await apiPost<{ id: number }>("/bookings", payload);
      if (!created?.id) {
        setSyncErr("Couldn't create the booking. Check your connection and try again.");
        setSyncState("error");
        return;
      }
      setSyncBooking({ id: created.id, bookingNo });
      setSyncState("waiting");
    } catch {
      setSyncErr("Couldn't create the booking. Check your connection and try again.");
      setSyncState("error");
    }
  };

  const cancelSync = () => {
    setSyncState("idle");
    setSyncBooking(null);
    setSyncDocs(undefined);
    setSyncErr(null);
    setDialogOpen(false);
  };

  // While waiting, poll the booking until the tablet uploads the documents.
  React.useEffect(() => {
    if (syncState !== "waiting" || !syncBooking) return;
    let stopped = false;
    const poll = async () => {
      try {
        const b = await apiGet<SyncedBooking>(`/bookings/${syncBooking.id}`);
        if (stopped) return;
        setSyncDocs(b?.documents);
        if (b?.verification_status === "synced" && b.documents) {
          setSyncState("done");
          setDialogOpen(true);
        }
      } catch {
        /* keep polling — transient network error */
      }
    };
    poll();
    const timer = setInterval(poll, 3000);
    return () => { stopped = true; clearInterval(timer); };
  }, [syncState, syncBooking]);
```

- [ ] **Step 4: Render the sync card inside the "Guest basics" section**

In the `<WalkInSection icon={User} label="Guest basics">` block, immediately after the closing `</div>` of the fields `grid` (after line ~1832, before `</WalkInSection>`), insert:

```tsx
                {/* Capture on the mobile app */}
                {syncState !== "done" ? (
                  <div className="mt-3 rounded-md border border-border bg-surface-sunken/40 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <span className="h-7 w-7 rounded-md bg-brand-soft text-brand-soft-foreground flex items-center justify-center shrink-0">
                          <Smartphone className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="text-sm font-medium">Capture on the mobile app</p>
                          <p className="text-xs text-muted-foreground">Send this walk-in to the tablet — staff capture the face photo, ID &amp; signature there.</p>
                          {syncErr && <p className="text-[11px] text-danger mt-1">{syncErr}</p>}
                        </div>
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={requestWalkInSync}>
                        <Smartphone className="h-4 w-4" />
                        {syncState === "creating" || syncState === "waiting" ? "View sync status" : "Sync to mobile app"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 rounded-md border border-success/40 bg-success-soft/30 p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-5 w-5 text-success" />
                        <span className="font-medium">Captured from tablet</span>
                        {syncBooking && <span className="text-muted-foreground">· booking {syncBooking.bookingNo}</span>}
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setDialogOpen(true)}>View</Button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                      {([["Face photo", syncDocs?.guest_photo], ["ID Front", syncDocs?.id_front], ["ID Back", syncDocs?.id_back], ["Signature", syncDocs?.signature]] as [string, string | null | undefined][]).map(([label, src]) => (
                        <div key={label} className="rounded-md border border-border bg-surface overflow-hidden">
                          <div className="aspect-[4/3] bg-surface-sunken flex items-center justify-center">
                            {src
                              ? <img src={src} alt={label} className="h-full w-full object-contain" />
                              : <span className="text-[11px] text-muted-foreground">—</span>}
                          </div>
                          <p className="text-[11px] text-center py-1 text-muted-foreground">{label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
```

- [ ] **Step 5: Render `MobileSyncDialog`**

Just before the modal's closing `</Card>` (after the Footer `</div>`, ~line 2188), insert:

```tsx
          {dialogOpen && syncState !== "idle" && (
            <MobileSyncDialog
              state={syncState}
              reference={syncBooking?.bookingNo ?? null}
              docs={syncDocs}
              errorMessage={syncErr}
              onCancel={cancelSync}
              onHide={() => setDialogOpen(false)}
              onDone={() => setDialogOpen(false)}
            />
          )}
```

- [ ] **Step 6: Typecheck + lint + build**

Run: `cd luxe-pms; npx tsc --noEmit; npm run lint`
Expected: no new type errors in `checkin/page.tsx`; lint clean.

- [ ] **Step 7: Run the full test suite**

Run: `cd luxe-pms; npx vitest run`
Expected: all tests pass (including Task 1's `walkin-sync.test.ts`).

- [ ] **Step 8: Manual verification (servers already run locally)**

With backend `:8000` + frontend `:3000` running: go to **Check-in → Express Walk-in**, enter a name + phone, pick a room, click **Sync to mobile app**. Confirm the dialog shows **Sending… → Waiting for tablet capture** with the four live progress rows, and that a `pending` booking with the `WK…` ref was created (verify via `GET /api/bookings`). Close the dialog; the card shows "View sync status".

- [ ] **Step 9: Commit**

```bash
git add "luxe-pms/src/app/(app)/checkin/page.tsx"
git commit -m "feat(checkin): Sync to mobile app in Express Walk-in modal"
```

---

## Self-Review

- **Spec coverage:** sync card in Guest basics (Task 2 Step 4) ✓; draft booking via `POST /bookings` with reused `WK…` ref (Task 1 + Task 2 Step 3) ✓; 3 s polling of `/bookings/{id}` for `verification_status === "synced"` (Step 3) ✓; shared `MobileSyncDialog` reused unchanged (Step 5) ✓; "Captured ✓" summary (Step 4) ✓; guards: re-sync reuses draft / requires name+phone+room / clears timer on unmount (Step 3) ✓; check-in flow untouched ✓; pure helper unit-tested (Task 1) ✓.
- **Placeholder scan:** none — all steps carry real code/commands.
- **Type consistency:** `buildWalkInSyncBooking`, `WalkInSyncInput`, `SyncedBooking`, `syncBooking.{id,bookingNo}`, `syncDocs?.{guest_photo,id_front,id_back,signature}` are used identically across tasks. `MobileSyncDialog` props match its definition (`state`, `reference`, `docs`, `errorMessage`, `onCancel`, `onHide`, `onDone`).
