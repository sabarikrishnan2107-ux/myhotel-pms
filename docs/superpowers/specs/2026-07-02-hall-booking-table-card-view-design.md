# Table/card view toggle for Hall Booking list

**Date:** 2026-07-02

## Decision

Add a `view: "table" | "cards"` toggle to the Hall Booking list
(`luxe-pms/src/app/(app)/halls/page.tsx`), defaulting to `"table"` (today's
only view). Mirrors the existing `cards`/`list` toggle pattern already used on
the Vendors page (`vendors/page.tsx:25,100-123`) — segmented button with
`LayoutGrid`/`List` icons.

## UI changes

**Toggle placement:** inside the existing filter `Card` (search + hall/status
selects), right-aligned next to the "N of M" counter.

**Table view:** unchanged — existing `<table>` markup stays exactly as is.

**Card view:** responsive grid (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3
gap-4`), one `Card` per booking, containing:
- Customer name (struck-through if cancelled) + "edited" badge + notes icon
  (same conditions as the table row); phone below
- Status badge, top-right of the card header
- Hall name, date/time range, guest count — icon-labeled (Building2 /
  Calendar / Users)
- Package badge
- Total / Balance as a 2-column mini stat block (balance colored
  warning/success, "Paid" label when settled — same logic as the table cell)
- Action row: the same four controls as the table's Action column (View /
  Modify / Cancel / More-menu), reusing the exact same handlers
  (`setSelected`, `setModifyTarget`, `setCancelTarget`, the portalled
  more-menu via `setActionMenuFor`/`setMenuRect`) — no new state or business
  logic, just a different layout wrapping the same callbacks
- Cancelled bookings dimmed (`opacity-60`), same as table rows
- Double-click (or the View icon) opens the same `HallDetailDrawer`

**Empty state:** when `list.length === 0` in card view, show the same
"No hall bookings match your filters" message in a centered `Card` (the
table's empty state is a `<tr>`, so card view needs its own non-table
wrapper — text/icon content identical).

## Out of scope

No changes to filtering, KPI bar, status chips, sorting, dialogs (Modify /
Cancel / Receive payment), or the detail drawer. No persistence of the view
choice (session-only `useState`, matching Vendors).

## Verification

`tsc --noEmit` clean; manually toggle Table ↔ Cards and confirm: all action
buttons (View/Modify/Cancel/More-menu/payment/complete/email) work identically
in both views; cancelled/edited/notes visual states match; empty-filter state
renders in both views; default view on page load is Table.
