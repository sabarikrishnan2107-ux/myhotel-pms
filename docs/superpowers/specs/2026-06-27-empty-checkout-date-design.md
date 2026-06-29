# Empty-by-default check-out date — Booking & Walk-in

**Date:** 2026-06-27
**Status:** Approved (design)

## Problem

Both the New Booking flow (`bookings/new`) and the Walk-in wizard (`checkin` →
`WalkInWizard`) pre-fill the **check-out** date (check-in + 3 nights for booking,
check-in + 1 night for walk-in). Staff want check-out to start **empty** so it is
deliberately entered for every stay, reducing wrong-length bookings.

## Decision

- **Only check-out** starts empty. Check-in keeps its default (today).
- While check-out is empty, **pricing/nights stay hidden** and the **proceed
  action is disabled**.

## Requirements

1. **Default value**
   - Booking: `checkOut` initial = `urlCheckout ?? ""` (was `urlCheckout ?? isoDay(3)`).
     Calendar drag-prefill (`urlCheckout`) and draft-resume (`b.checkOut`) still
     populate it when present — only the cold default changes.
   - Walk-in: `checkOutDate` initial = `""` for a fresh walk-in; a resumed draft
     carrying `nights` still prefills via `addDays(checkIn, nights)`.

2. **Derived `nights`**
   - Introduce `hasCheckout = !!checkOut && checkOut > checkIn` (ISO string compare).
   - `nights = hasCheckout ? Math.max(1, round((checkOut − checkIn)/day)) : 0`.
   - This prevents `NaN` (from `new Date("")`) flowing into the rate breakdown,
     F&B (`× nights`), and totals — they resolve to 0 cleanly.

3. **Empty-state UI (dates step)**
   - The nights summary line, per-day rate breakdown, and price/total rows render
     only when `hasCheckout`; otherwise show a muted hint:
     *"Pick a check-out date to see nights & pricing."*
   - Summary-sidebar Check-out / Nights rows show only when `hasCheckout`
     (avoid "Invalid Date").

4. **Proceed gating**
   - Booking: `canNext()` returns `hasCheckout` for `step === 2`.
   - Walk-in: the dates-step Continue/next is disabled until `hasCheckout`.

5. **Auto-adjust behavior**
   - Changing check-in auto-pushes check-out **only when one is already set**;
     if check-out is empty, it stays empty (no silent fill).
   - Helper text unchanged: "Must be after check-in · auto-adjusts if you change
     dates" (accurate once a date exists).

## Files affected

- `luxe-pms/src/app/(app)/bookings/new/page.tsx`
- `luxe-pms/src/app/(app)/checkin/page.tsx` (`WalkInWizard`)

`DatePicker` already renders an empty value as a `dd/mm/yyyy` placeholder and
supports clearing — no component change.

## Out of scope

- Check-in default (stays today).
- Any backend/validation change (submit only reachable once check-out is set).

## Verification

Run the app, drive both flows: confirm check-out starts blank, pricing/nights
hidden + proceed disabled until a date is picked, pricing appears once picked,
and check-in changes don't silently refill an empty check-out.
