# Group booking supports custom rupee advance payment (like booking)

**Date:** 2026-07-03
**Status:** Approved (design)

## Problem

Group booking advance payment (`groups/new`) only offers preset percentages (30%, 50%, Full, Installments). Regular booking (`bookings/new`) allows both preset % buttons AND a custom rupee input. Users need the same flexibility for group bookings — ability to specify an exact advance amount instead of being locked to presets.

## Decision

Add a custom rupee input mode to the group booking Live Summary payment panel. Reuse the booking flow's pattern: preset % buttons + toggle Custom button + rupee input field.

## Implementation

### State

Add to the `NewGroupPage` component:
- `customAdvance: number | null` — when not null, custom rupee mode is active; null means preset % mode
- Mirror the booking logic: if `customAdvance !== null`, use that amount; otherwise use `paymentTerm` (%)

### UI Changes (Live Summary, right panel ~line 705-741)

**Current state:**
```
Advance payment [buttons: 30% 50% Full Installments]
```

**New state:**
```
Advance payment [buttons: 30% 50% Full Installments | Custom]
[when Custom is selected, show input field below]
₹ [input] of ₹X,XXX · Y% advance
```

**Logic:**
- Clicking a preset % button → sets `paymentTerm`, clears `customAdvance` (back to % mode)
- Clicking Custom → sets `customAdvance` to 0 (or current advance if switching from %), hides % buttons, shows input
- Input onChange → updates `customAdvance`, recalculates displayed %
- Cap: `Math.min(customAdvance, total)` — can't advance more than the total
- Display: show `Math.round((advance / total) * 100)%` next to the rupee amount

### Calculation

```ts
const advance = customAdvance !== null
  ? Math.min(Math.max(0, Math.round(customAdvance)), total)
  : Math.round((total * paymentTerm) / 100);
```

(Identical to booking's logic.)

### Advance breakdown display

Show only when an advance is selected (preset % OR custom rupee):
```
Advance (₹X,XXX or Y%) — {money(advance)}
Balance — {money(total - advance)}
```

## Out of scope

- Payment mode (UPI/Cash/etc.) — group booking doesn't capture payment mode yet (separate future work)
- Payment reference — group booking doesn't capture reference numbers yet (separate future work)
- Installment schedule — Installments button remains a toggle (no detailed schedule UI)

## Verification

- `tsc --noEmit` clean; ESLint no new errors
- Live: create group, set total to ₹50,000
  - Click 30% → advance = ₹15,000, displays "30%"
  - Click Custom → input appears
  - Enter 20000 → advance = ₹20,000, displays "40%"
  - Clear to 0 → advance = ₹0
  - Enter 60000 → capped to ₹50,000 (can't exceed total)
  - Click 50% → back to % mode, advance = ₹25,000
  - Advance + Balance rows update in real-time
