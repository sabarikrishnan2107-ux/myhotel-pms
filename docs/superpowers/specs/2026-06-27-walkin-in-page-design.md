# Walk-in Check-in as in-page content (sidebar visible)

**Date:** 2026-06-27
**Area:** `luxe-pms/src/app/(app)/checkin/page.tsx` — `WalkInModal` (Express Walk-in)

## Problem

The Express Walk-in form renders as a `fixed inset-0 z-50` overlay (with a dark
backdrop) that paints over the whole viewport, hiding the app sidebar + top bar.
Every other page renders inside the app shell with the sidebar visible. The
walk-in should be consistent.

## Decision

Render the walk-in **form** as in-page content inside the Check-in page's
content area (`<main>`), so the app shell's sidebar + top bar stay visible.
Chosen over a dedicated `/checkin/walk-in` route because it keeps the existing
`Start check-in → check-in process` handoff (all on the Check-in page) untouched
— lowest risk.

## Scope

Presentation only. Unchanged: the form fields, pricing math, validation, the
`onStart` handoff to `CheckinProcessModal`, and the sub-dialogs (mobile-sync,
advance receipt).

## Changes

1. **Drop the fixed overlay.** Remove the `fixed inset-0` backdrop + wrapper and
   the body-scroll lock (`document.body.style.overflow = "hidden"`) — the page
   must scroll normally now. Keep ESC-to-cancel.
2. **Render in the content area.** When `walkInOpen` is true, the Check-in page
   renders the walk-in form as its main content (in place of the arrivals list)
   via an early return, so the sidebar/top bar (which live outside `<main>`)
   stay. Cancel/close returns to the arrivals list.
3. **Page-friendly layout.** Keep the gold "Express Walk-in Check-in" header and
   the two-column body (form + Live Cost Preview). The page scrolls naturally
   like other pages; the Live Cost Preview is a **sticky** column so the total +
   Start button stay in view. Footer actions (Cancel / Print receipt / Start
   check-in) sit at the bottom of the form.
4. **Sub-dialogs stay modal.** Mobile-sync dialog, advance-receipt preview, and
   the multi-step check-in process that opens after "Start check-in" remain
   centered modal overlays.

## Flow (unchanged)

`Walk-in Check-in` button → `walkInOpen = true` → walk-in form fills content
area → user fills form → **Start check-in** → `onStart(reservation)` sets the
express-walk-in id + `checkingIn` and clears `walkInOpen` → normal Check-in
content returns with the `CheckinProcessModal` open.

## Verification

- `tsc --noEmit` clean; ESLint no new errors.
- Run app: open Check-in → Walk-in Check-in → confirm sidebar + top bar visible,
  form fills the content area, summary sticky, Start check-in still launches the
  check-in process.
